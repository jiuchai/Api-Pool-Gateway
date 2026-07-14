/**
 * 动态网关服务 - 核心模块
 * 根据服务配置动态转发API请求
 */
const axios = require('axios');
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
      method: s.method,
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

    // 参数验证
    if (service.params && service.params.length) {
      const { errors } = validateParams(params, service.params);
      if (errors) throw { status: 400, message: '参数验证失败', details: errors };
    }

    // 构建目标URL：支持模板替换 {{param}}
    let targetUrl = service.targetUrl;
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        targetUrl = targetUrl.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), encodeURIComponent(val));
      }
    }

    // 构建请求体：支持 bodyTemplate 模板
    let requestBody = params || {};
    if (service.bodyTemplate && typeof service.bodyTemplate === 'string') {
      let bodyStr = service.bodyTemplate;
      if (params) {
        for (const [key, val] of Object.entries(params)) {
          // 在模板中替换 {{param}}，字符串值加引号
          const escaped = String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          bodyStr = bodyStr.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), escaped);
        }
      }
      // 尝试解析为JSON对象
      try {
        requestBody = JSON.parse(bodyStr);
      } catch {
        // 保持为字符串（可能是纯文本模板）
        requestBody = bodyStr;
      }
    }

    // 合并请求头
    const headers = { ...service.forwardHeaders, 'User-Agent': 'Pool-Gateway/1.0' };
    if (typeof requestBody === 'object') {
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

      // 解析响应
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
};

module.exports = gatewayService;
