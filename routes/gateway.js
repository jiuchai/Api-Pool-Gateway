/**
 * 动态网关路由 - 核心
 * 所有用户API调用通过 /api/gateway/:slug 动态路由到对应服务
 */
const express = require('express');
const router = express.Router();
const gatewayService = require('../services/gatewayService');
const { apiKeyAuth } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { callLogger } = require('../middleware/logger');

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
 * POST /api/gateway/:slug - 调用指定服务
 */
router.post('/:slug', apiKeyAuth, createRateLimiter(), callLogger, async (req, res) => {
  try {
    const result = await gatewayService.executeService(req.params.slug, req.body);
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
    res.json({ success: true, data: { name: service.name, slug: service.slug, description: service.description, method: service.method, params: service.params, docs: service.docs, category: service.category } });
  } catch (e) { res.status(404).json({ error: e.message }); }
});

module.exports = router;
