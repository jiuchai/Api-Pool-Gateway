/**
 * 动态网关服务 - 核心模块
 * 根据服务配置动态转发API请求
 */
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { validateParams } = require('../utils/helpers');

const DOWNLOADS_DIR = path.join(__dirname, '..', 'downloads');

// 确保下载目录存在
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

const gatewayService = {
  /**
   * 获取所有启用的服务列表（供用户浏览）
   */
  async getServices(query = {}) {
    const q = { enabled: true };
    if (query.category) q.category = query.category;
    const services = await require('../database').db.services.find(q).sort({ createdAt: -1 });
    return services.map(s => ({
      slug: s.slug,
      name: s.name,
      description: s.description,
      category: s.category,
      method: 'POST',
      forwardType: s.forwardType || 'json',
      params: s.params || [],
      endpoint: `/api/gateway/${s.slug}`,
      rateLimit: s.rateLimit,
      docs: s.docs || '',
      inputExample: s.inputExample || '',
      outputExample: s.outputExample || '',
    }));
  },

  /**
   * 根据slug查找并执行转发
   */
  async executeService(slug, params, reqHeaders, baseUrl) {
    const service = await require('../database').db.services.findOne({ slug, enabled: true });
    if (!service) throw { status: 404, message: `服务 "${slug}" 不存在或已禁用` };

    const hasFileParams = service.params && service.params.some(p => p.type === 'file' || p.type === 'files');
    const forceFormData = service.forwardType === 'form-data' || hasFileParams;

    const hasFiles = params && Object.values(params).some(v => {
      if (Array.isArray(v)) return v.some(item => item && (item.path || item.filename || item.buffer) && item.originalname);
      return v && (v.path || v.filename || v.buffer) && v.originalname;
    });

    if (!hasFiles && service.params && service.params.length) {
      const { errors } = validateParams(params, service.params);
      if (errors) throw { status: 400, message: '参数验证失败', details: errors };
    }

    // 缺少必填文件时，不论转发方式都需要拦截
    if (!hasFiles) {
      const requiredFileParams = (service.params || []).filter(p =>
        (p.type === 'file' || p.type === 'files') && p.required
      );
      if (requiredFileParams.length > 0) {
        const receivedKeys = params ? Object.keys(params).join(', ') : '无';
        throw {
          status: 400,
          message: `该服务需要上传文件：${requiredFileParams.map(p => p.name).join(', ')}。请选择文件后重试（收到：${receivedKeys}）`,
        };
      }
    }

    let targetUrl = service.targetUrl;
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val && typeof val === 'object' && val.path) continue;
        targetUrl = targetUrl.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), encodeURIComponent(String(val)));
      }
    }

    let requestBody = params || {};
    let useFormData = false;

    if (hasFiles || forceFormData) {
      useFormData = true;
      const form = new FormData();
      for (const [key, val] of Object.entries(params)) {
        if (Array.isArray(val)) {
          val.forEach(item => {
            if (item && typeof item === 'object' && (item.path || item.filename || item.buffer) && item.originalname) {
              const src = item.path ? require('fs').createReadStream(item.path) : Buffer.from(item.buffer);
              form.append(key, src, { filename: item.originalname });
            } else {
              form.append(key, String(item));
            }
          });
        } else if (val && typeof val === 'object' && (val.path || val.filename || val.buffer) && val.originalname) {
          const src = val.path ? require('fs').createReadStream(val.path) : Buffer.from(val.buffer);
          form.append(key, src, { filename: val.originalname });
        } else if (service.bodyTemplate && !forceFormData) {
          let valStr = String(val);
          if (service.bodyTemplate.includes(`{{${key}}}`)) {
            const escaped = valStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            valStr = escaped;
          }
          form.append(key, valStr);
        } else {
          form.append(key, String(val));
        }
      }
      requestBody = form;
    } else if (service.bodyTemplate && typeof service.bodyTemplate === 'string') {
      let bodyStr = service.bodyTemplate;
      if (params) {
        for (const [key, val] of Object.entries(params)) {
          const escaped = String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          bodyStr = bodyStr.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), escaped);
        }
      }
      try {
        requestBody = JSON.parse(bodyStr);
      } catch {
        requestBody = bodyStr;
      }
    }

    // 自定义脚本转发
    if (service.forwardMode === 'script' && service.customScript) {
      try {
        const vm = require('vm');
        const sandbox = {
          params: JSON.parse(JSON.stringify(params)),
          service: { name: service.name, slug: service.slug, targetUrl: service.targetUrl, method: service.method },
          axios, require,
          console: { log: (...a) => {} },
          setTimeout, clearTimeout, Buffer, URL, URLSearchParams,
        };
        if (hasFiles) {
          for (const [key, val] of Object.entries(params)) {
            if (val && typeof val === 'object' && val.path) {
              sandbox.params[key] = val;
            } else if (Array.isArray(val)) {
              sandbox.params[key] = val.map(item => item && item.path ? item : item);
            }
          }
        }
        vm.createContext(sandbox);
        const wrappedCode = `(async () => { ${service.customScript} })()`;
        const scriptResult = await vm.runInContext(wrappedCode, sandbox, { timeout: 30000 });
        if (scriptResult && typeof scriptResult.statusCode === 'number') {
          return {
            success: scriptResult.statusCode >= 200 && scriptResult.statusCode < 300,
            statusCode: scriptResult.statusCode,
            data: scriptResult.data || {},
            meta: { service: service.name, scriptResult: true },
          };
        }
        if (scriptResult && scriptResult.url) {
          targetUrl = scriptResult.url;
          if (scriptResult.method) service.method = scriptResult.method;
          if (scriptResult.body !== undefined) requestBody = scriptResult.body;
          if (scriptResult.headers) {
            service.forwardHeaders = { ...service.forwardHeaders, ...scriptResult.headers };
          }
        }
      } catch (e) {
        throw { status: 500, message: `自定义脚本执行失败: ${e.message}` };
      }
    }

    const headers = { ...service.forwardHeaders, 'User-Agent': 'Pool-Gateway/1.0' };
    if (useFormData) {
      Object.assign(headers, requestBody.getHeaders());
    } else if (typeof requestBody === 'object') {
      headers['Content-Type'] = 'application/json';
    }
    delete headers['x-api-key'];
    delete headers['host'];

    try {
      const response = await axios({
        method: (service.method || 'POST').toLowerCase(),
        url: targetUrl,
        headers,
        data: (service.method === 'GET' || service.method === 'DELETE') ? undefined : requestBody,
        params: service.method === 'GET' || service.method === 'DELETE' ? params : undefined,
        timeout: service.timeout || config.proxy.timeout,
        validateStatus: () => true,
        responseType: 'arraybuffer',
        maxRedirects: 5,
      });

      const contentType = (response.headers['content-type'] || '').toLowerCase();
      const isJson = contentType.includes('application/json') || contentType.includes('text/');
      const isBinary = !isJson && response.data && Buffer.isBuffer(response.data) && response.data.length > 0;

      if (isBinary) {
        // 提取文件扩展名
        let ext = '.bin';
        const extMatch = contentType.match(/[\w-]+\/([\w+-]+)/);
        if (extMatch) {
          const mimeExt = extMatch[1];
          if (mimeExt === 'pdf') ext = '.pdf';
          else if (mimeExt === 'msword') ext = '.doc';
          else if (mimeExt.includes('officedocument') || mimeExt.includes('opendocument')) {
            if (mimeExt.includes('word') || mimeExt.includes('text')) ext = '.docx';
            else if (mimeExt.includes('spreadsheet')) ext = '.xlsx';
            else if (mimeExt.includes('presentation')) ext = '.pptx';
            else ext = '.docx';
          } else if (mimeExt === 'jpeg' || mimeExt === 'jpg') ext = '.jpg';
          else if (mimeExt === 'png') ext = '.png';
          else if (mimeExt === 'gif') ext = '.gif';
          else if (mimeExt === 'webp') ext = '.webp';
          else if (mimeExt === 'svg+xml') ext = '.svg';
          else if (mimeExt === 'zip') ext = '.zip';
          else if (mimeExt === 'octet-stream') ext = '.bin';
          else ext = '.' + mimeExt.split('+')[0];
        }
        // 从 content-disposition 提取文件名
        const cd = response.headers['content-disposition'] || '';
        const filenameMatch = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch) {
          const fname = filenameMatch[1].replace(/['"]/g, '');
          const parsed = path.parse(fname);
          if (parsed.ext) ext = parsed.ext;
        }

        const uuid = crypto.randomUUID();
        const filename = uuid + ext;
        const filePath = path.join(DOWNLOADS_DIR, filename);
        fs.writeFileSync(filePath, response.data);

        const fileUrl = baseUrl ? `${baseUrl}/api/downloads/${filename}` : `/api/downloads/${filename}`;

        return {
          success: response.status >= 200 && response.status < 300,
          statusCode: response.status,
          data: {
            type: 'file',
            url: fileUrl,
            contentType: response.headers['content-type'] || 'application/octet-stream',
            size: response.data.length,
          },
          meta: {
            service: service.name,
            upstreamStatus: response.status,
          },
        };
      }

      let body = response.data.toString('utf-8');
      if (body.trim()) {
        try { body = JSON.parse(body); } catch { /* keep as string */ }
      }

      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        data: body || {},
        meta: {
          service: service.name,
          upstreamStatus: response.status,
        },
      };
    } catch (err) {
      if (err.code === 'ECONNABORTED') throw { status: 504, message: '上游服务超时' };
      if (err.code === 'ECONNREFUSED') throw { status: 502, message: '上游服务拒绝连接' };
      if (err.code === 'ENOTFOUND') throw { status: 502, message: '上游服务域名解析失败' };
      throw { status: 502, message: `上游请求失败: ${err.message}` };
    }
  },

  /**
   * 管理员CRUD操作
   */
  async createService(data) {
    const db = require('../database').db;
    const existing = await db.services.findOne({ slug: data.slug });
    if (existing) throw { status: 409, message: '服务slug已存在' };
    const service = await db.services.insert({
      ...data,
      enabled: true,
      rateLimit: data.rateLimit || { perMinute: 30 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return service;
  },

  async updateService(slug, data) {
    const db = require('../database').db;
    const updated = await db.services.update({ slug }, { $set: { ...data, updatedAt: Date.now() } }, {});
    if (!updated) throw { status: 404, message: '服务不存在' };
    return await db.services.findOne({ slug });
  },

  async deleteService(slug) {
    const db = require('../database').db;
    const removed = await db.services.remove({ slug }, {});
    if (!removed) throw { status: 404, message: '服务不存在' };
  },

  async getServiceDetail(slug) {
    const service = await require('../database').db.services.findOne({ slug });
    if (!service) throw { status: 404, message: '服务不存在' };
    return service;
  },

  async getTools(allowedSlugs = null) {
    const query = { enabled: true };
    if (allowedSlugs) query.slug = { $in: allowedSlugs };
    const services = await require('../database').db.services.find(query).sort({ createdAt: -1 });
    return services.map(s => ({
      name: s.name,
      slug: s.slug,
      description: s.description,
      category: s.category || '未分类',
      endpoint: `/api/gateway/${s.slug}`,
      method: 'POST',
      detail_url: `/api/gateway/tools/${s.slug}`,
      welcomeUrl: s.welcomeUrl || '',
      input_example: s.inputExample || '',
    }));
  },
};

module.exports = gatewayService;
