/**
 * 动态网关路由 - 核心
 * 所有用户API调用通过 /api/gateway/:slug 动态路由到对应服务
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const gatewayService = require('../services/gatewayService');
const { apiKeyAuth } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { callLogger } = require('../middleware/logger');

const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });

/**
 * GET /api/gateway - 获取可用服务列表
 */
router.get('/', async (req, res) => {
  try {
    const services = await gatewayService.getServices(req.query);
    res.json({ success: true, data: services });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/gateway/:slug - 调用指定服务（支持文件上传）
 */
router.post('/:slug', apiKeyAuth, createRateLimiter(), upload.any(), callLogger, async (req, res) => {
  try {
    // 检查该 Key 是否有权限调用此服务
    if (req.apiKey.services && req.apiKey.services.length > 0 && !req.apiKey.services.includes(req.params.slug)) {
      return res.status(403).json({ error: '该 API Key 未授权调用此服务' });
    }
    const params = { ...req.body };
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (params[file.fieldname]) {
          if (!Array.isArray(params[file.fieldname])) {
            params[file.fieldname] = [params[file.fieldname]];
          }
          params[file.fieldname].push(file);
        } else {
          params[file.fieldname] = file;
        }
      });
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await gatewayService.executeService(req.params.slug, params, null, baseUrl);
    res.status(result.statusCode || 200).json(result);
  } catch (e) {
    res.status(e.status || 500).json({ success: false, error: e.message, details: e.details || null });
  }
});

/**
 * GET /api/gateway/:slug/info - 获取服务详情
 */
router.get('/:slug/info', async (req, res) => {
  try {
    const service = await gatewayService.getServiceDetail(req.params.slug);
    res.json({ success: true, data: { name: service.name, slug: service.slug, description: service.description, method: 'POST', params: service.params, docs: service.docs, category: service.category } });
  } catch (e) { res.status(404).json({ error: e.message }); }
});

router.get('/tools', async (req, res) => {
  try {
    let allowedSlugs = null;
    // 如果携带了 API Key，则只返回该 key 被授权访问的服务
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (apiKey) {
      const keyRec = await require('../database').db.apiKeys.findOne({ key: apiKey });
      if (keyRec && !keyRec.disabled) {
        if (keyRec.services && keyRec.services.length > 0) {
          allowedSlugs = keyRec.services;
        }
        // services 为空或不存在 → 全部允许
      }
    }
    const tools = await gatewayService.getTools(allowedSlugs);
    res.json({ success: true, data: tools });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/tools/:slug', async (req, res) => {
  try {
    const service = await gatewayService.getServiceDetail(req.params.slug);
    res.json({
      success: true,
      data: {
        name: service.name,
        slug: service.slug,
        description: service.description,
        category: service.category || '',
        method: service.method || 'POST',
        forwardType: service.forwardType || 'json',
        endpoint: `/api/gateway/${service.slug}`,
        parameters: (service.params || []).map(p => ({
          name: p.name,
          type: p.type || 'string',
          required: p.required || false,
          description: p.description || '',
        })),
        input_example: service.inputExample || '',
        output_example: service.outputExample || '',
        docs: service.docs || '',
        forward_headers: service.forwardHeaders || {},
      },
    });
  } catch (e) { res.status(404).json({ error: e.message }); }
});

module.exports = router;
