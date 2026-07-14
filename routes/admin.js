const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const gatewayService = require('../services/gatewayService');
const { db } = require('../database');
const config = require('../config');
const { formatDateTime } = require('../utils/helpers');
const { auditLog } = require('../middleware/logger');

router.use(adminAuth);

// ===== 服务管理 =====
router.get('/services', async (req, res) => {
  try {
    const services = await db.services.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: services });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/services', async (req, res) => {
  try {
    const s = await gatewayService.createService(req.body);
    await auditLog('service_created', { slug: s.slug });
    res.json({ success: true, data: s });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.put('/services/:slug', async (req, res) => {
  try {
    const s = await gatewayService.updateService(req.params.slug, req.body);
    await auditLog('service_updated', { slug: req.params.slug });
    res.json({ success: true, data: s });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.delete('/services/:slug', async (req, res) => {
  try {
    await gatewayService.deleteService(req.params.slug);
    await auditLog('service_deleted', { slug: req.params.slug });
    res.json({ success: true, data: { message: '已删除' } });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ===== 用户管理 =====
router.get('/users', async (req, res) => {
  try {
    const { page, pageSize, search, disabled } = req.query;
    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 20, 100);
    const query = {};
    if (disabled !== undefined) query.disabled = disabled === 'true';
    if (search) query.$or = [{ username: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    const total = await db.users.count(query);
    const users = await db.users.find(query).sort({ createdAt: -1 }).skip((p - 1) * ps).limit(ps);
    const list = await Promise.all(users.map(async u => {
      const keyCount = await db.apiKeys.count({ userId: u._id });
      return { id: u._id, username: u.username, email: u.email, role: u.role, disabled: u.disabled, keyCount, createdAt: formatDateTime(u.createdAt) };
    }));
    res.json({ success: true, data: { users: list, pagination: { total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) } } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { disabled, role } = req.body;
    await db.users.update({ _id: req.params.id }, { $set: { ...(disabled !== undefined ? { disabled } : {}), ...(role ? { role } : {}), updatedAt: Date.now() } });
    await auditLog('user_updated', { userId: req.params.id });
    res.json({ success: true, data: { message: '已更新' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== 日志 =====
router.get('/logs', async (req, res) => {
  try {
    const { page, pageSize, username, method, statusCode, startTime, endTime, serviceSlug } = req.query;
    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 50, 200);
    const query = {};
    if (username) query.username = username;
    if (serviceSlug) query.serviceSlug = serviceSlug;
    if (method) query.method = method.toUpperCase();
    if (statusCode) {
      const parts = String(statusCode).split(',');
      if (parts.length > 1) {
        const orArr = [];
        parts.forEach(part => {
          if (part.includes('xx')) {
            const prefix = parseInt(part[0]) * 100;
            orArr.push({ statusCode: { $gte: prefix, $lt: prefix + 100 } });
          } else {
            orArr.push({ statusCode: parseInt(part) });
          }
        });
        query.$or = orArr;
      } else if (parts[0].includes('xx')) {
        const prefix = parseInt(parts[0][0]) * 100;
        query.statusCode = { $gte: prefix, $lt: prefix + 100 };
      } else {
        query.statusCode = parseInt(parts[0]);
      }
    }
    if (startTime || endTime) {
      query.timestamp = {};
      if (startTime) query.timestamp.$gte = new Date(startTime).getTime();
      if (endTime) query.timestamp.$lte = new Date(endTime).getTime();
    }
    const total = await db.callLogs.count(query);
    const logs = await db.callLogs.find(query).sort({ timestamp: -1 }).skip((p - 1) * ps).limit(ps);
    const list = logs.map(l => ({ ...l, id: l._id, timestamp: formatDateTime(l.timestamp) }));
    res.json({ success: true, data: { logs: list, pagination: { total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) } } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== 监控 =====
router.get('/monitor', async (req, res) => {
  try {
    const { serviceSlug } = req.query;
    const totalUsers = await db.users.count({});
    const totalServices = await db.services.count({});
    const enabledServices = await db.services.count({ enabled: true });
    const totalCalls = await db.callLogs.count({});
    const mem = process.memoryUsage();

    // 近7天每日调用趋势（可选按服务筛选）
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const trendQuery = { timestamp: { $gte: sevenDaysAgo } };
    if (serviceSlug) trendQuery.serviceSlug = serviceSlug;
    const recentLogs = await db.callLogs.find(trendQuery).sort({ timestamp: 1 });
    const dailyMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - (6 - i) * 86400000);
      dailyMap[`${d.getMonth() + 1}/${d.getDate()}`] = 0;
    }
    recentLogs.forEach(l => {
      const d = new Date(l.timestamp);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (dailyMap[key] !== undefined) dailyMap[key]++;
    });
    const dailyData = Object.entries(dailyMap).map(([date, calls]) => ({ date, calls }));

    // 状态码分布
    const [success, clientErr, serverErr] = await Promise.all([
      db.callLogs.count({ statusCode: { $gte: 200, $lt: 300 } }),
      db.callLogs.count({ statusCode: { $gte: 400, $lt: 500 } }),
      db.callLogs.count({ statusCode: { $gte: 500, $lt: 600 } }),
    ]);

    // 按服务分类统计
    const allLogs = await db.callLogs.find({});
    const serviceStats = {};
    allLogs.forEach(l => {
      const key = l.serviceName || l.serviceSlug || '未知';
      serviceStats[key] = (serviceStats[key] || 0) + 1;
    });
    const byService = Object.entries(serviceStats).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);

    res.json({ success: true, data: {
      overview: { totalUsers, totalServices, enabledServices, totalCalls },
      system: { uptime: Math.floor(process.uptime()), memory: { rss: Math.round(mem.rss / 1024 / 1024) + ' MB', heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + ' MB' }, nodeVersion: process.version },
      charts: { dailyData, statusBreakdown: { success, clientErr, serverErr }, byService },
    }});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== 审计日志 =====
router.get('/audit', async (req, res) => {
  try {
    const { page, pageSize } = req.query;
    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 50, 200);
    const total = await db.auditLogs.count({});
    const logs = await db.auditLogs.find({}).sort({ timestamp: -1 }).skip((p - 1) * ps).limit(ps);
    res.json({ success: true, data: { logs: logs.map(l => ({ ...l, timestamp: formatDateTime(l.timestamp) })), pagination: { total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) } } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== 计费管理 =====
const billingService = require('../services/billingService');
const redeemService = require('../services/redeemService');

router.get('/billing/stats', async (req, res) => {
  try {
    const { month } = req.query;
    const stats = await billingService.getSystemBillingStats(month);
    const users = await billingService.getAllUsersBilling(month, parseInt(req.query.page) || 1, parseInt(req.query.pageSize) || 20);
    res.json({ success: true, data: { summary: stats, users } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/billing/generate', async (req, res) => {
  try {
    const bills = await billingService.generateMonthlyBill(req.body.month);
    res.json({ success: true, data: { message: `生成了${bills.length}条账单`, bills } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/config', (req, res) => {
  res.json({ success: true, data: { billing: billingService.getBillingConfig(), rateLimit: config.rateLimit, proxy: config.proxy } });
});

router.put('/config/billing', async (req, res) => {
  try {
    if (req.body.tiers) config.billing.tiers = req.body.tiers.map(t => ({
      name: t.name, ratePerSecond: Number(t.ratePerSecond) || 10,
      maxCallsPerDay: t.maxCallsPerDay !== undefined ? Number(t.maxCallsPerDay) : -1,
      maxCalls: Number(t.maxCalls) || 0, monthlyFee: Number(t.monthlyFee) || 0
    }));
    if (req.body.defaultTierIndex !== undefined) config.billing.defaultTierIndex = req.body.defaultTierIndex;
    res.json({ success: true, data: config.billing });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/billing', async (req, res) => {
  try {
    const { month, page, pageSize } = req.query;
    const result = await billingService.getAllUsersBilling(month, parseInt(page) || 1, parseInt(pageSize) || 20);
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id/tier', async (req, res) => {
  try {
    const result = await billingService.changeUserTier(req.params.id, req.body.tierIndex);
    res.json({ success: true, data: result });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ===== 兑换码管理 =====
router.get('/redeem-codes', async (req, res) => {
  try {
    const result = await redeemService.getCodes({ search: req.query.search, status: req.query.status, page: parseInt(req.query.page) || 1, pageSize: parseInt(req.query.pageSize) || 50 });
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/redeem-codes', async (req, res) => {
  try {
    const result = await redeemService.generateCodes(req.body, req.user._id);
    res.json({ success: true, data: result });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.put('/redeem-codes/:id/disable', async (req, res) => {
  try {
    const result = await redeemService.setDisabled(req.params.id, req.body.disabled);
    res.json({ success: true, data: result });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.delete('/redeem-codes', async (req, res) => {
  try {
    const result = await redeemService.deleteCodes(req.body.ids);
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/redeem-usage', async (req, res) => {
  try {
    const result = await redeemService.getUsage({ search: req.query.search, page: parseInt(req.query.page) || 1, pageSize: parseInt(req.query.pageSize) || 50 });
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
