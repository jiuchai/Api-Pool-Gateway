/**
 * 动态网关服务 - 核心模块
 * 根据服务配置动态转发API请求
 */
const axios = require('axios');
const FormData = require('form-data');
const config = require('../config');
const { validateParams } = require('../utils/helpers');

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
      params: s.params || [],
      endpoint: `/api/gateway/${s.slug}`,
      rateLimit: s.rateLimit,
      docs: s.docs || '',
    }));
  },

  /**
   * 根据slug查找并执行转发
   */
  async executeService(slug, params, reqHeaders) {
    const service = await require('../database').db.services.findOne({ slug, enabled: true });
    if (!service) throw { status: 404, message: `服务 "${slug}" 不存在或已禁用` };

    const hasFiles = params && Object.values(params).some(v => {
      if (Array.isArray(v)) return v.some(item => item && item.path && item.originalname);
      return v && v.path && v.originalname;
    });

    if (!hasFiles && service.params && service.params.length) {
      const { errors } = validateParams(params, service.params);
      if (errors) throw { status: 400, message: '参数验证失败', details: errors };
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

    if (hasFiles) {
      useFormData = true;
      const form = new FormData();
      for (const [key, val] of Object.entries(params)) {
        if (Array.isArray(val)) {
          val.forEach(item => {
            if (item && typeof item === 'object' && item.path) {
              form.append(key, require('fs').createReadStream(item.path), { filename: item.originalname });
            } else {
              form.append(key, String(item));
            }
          });
        } else if (val && typeof val === 'object' && val.path) {
          form.append(key, require('fs').createReadStream(val.path), { filename: val.originalname });
        } else if (service.bodyTemplate) {
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
        responseType: 'text',
        transformResponse: [(d) => d],
        maxRedirects: 5,
      });

      let body = response.data;
      if (typeof body === 'string' && body.trim()) {
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

  async getTools() {
    const services = await require('../database').db.services.find({ enabled: true }).sort({ createdAt: -1 });
    return services.map(s => ({
      name: s.name,
      slug: s.slug,
      description: s.description,
      category: s.category || '未分类',
      endpoint: `/api/gateway/${s.slug}`,
      method: 'POST',
      detail_url: `/api/gateway/tools/${s.slug}`,
    }));
  },
};

module.exports = gatewayService;
