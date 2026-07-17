// Copyright (c) 2026 jiucai.
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

// 导出服务
router.get('/services/export', async (req, res) => {
  try {
    const services = await db.services.find({}).sort({ createdAt: -1 });
    const data = services.map(s => ({
      slug: s.slug, name: s.name, description: s.description, category: s.category,
      targetUrl: s.targetUrl, method: s.method, forwardType: s.forwardType || 'json',
      forwardMode: s.forwardMode || 'template', customScript: s.customScript || '',
      bodyTemplate: s.bodyTemplate || '',
      forwardHeaders: s.forwardHeaders || {}, params: s.params || [],
      inputExample: s.inputExample || '', outputExample: s.outputExample || '',
    }));
    res.setHeader('Content-Disposition', 'attachment; filename="api-pool-services.json"');
    res.json({ version: '1.0', exportedAt: new Date().toISOString(), count: data.length, services: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 导入服务
router.post('/services/import', async (req, res) => {
  try {
    const { services, conflictStrategy } = req.body; // conflictStrategy: 'overwrite' | 'skip'
    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ error: '无有效服务数据' });
    }

    const results = { created: 0, overwritten: 0, skipped: 0, errors: [] };
    const existingSlugs = new Set((await db.services.find({})).map(s => s.slug));

    for (const svc of services) {
      if (!svc.slug || !svc.name || !svc.targetUrl) {
        results.errors.push({ slug: svc.slug || 'unknown', message: '缺少必填字段' });
        continue;
      }
      try {
        const exists = await db.services.findOne({ slug: svc.slug });
        if (exists) {
          if (conflictStrategy === 'skip') {
            results.skipped++;
          } else {
            await db.services.update({ slug: svc.slug }, { $set: {
              name: svc.name, description: svc.description || '', category: svc.category || '',
              targetUrl: svc.targetUrl, method: svc.method || 'POST',
              forwardType: svc.forwardType || 'json', forwardMode: svc.forwardMode || 'template',
              customScript: svc.customScript || '',
              bodyTemplate: svc.bodyTemplate || '', forwardHeaders: svc.forwardHeaders || {},
              params: svc.params || [], inputExample: svc.inputExample || '',
              outputExample: svc.outputExample || '', updatedAt: Date.now(),
            } });
            results.overwritten++;
          }
        } else {
          await db.services.insert({
            slug: svc.slug, name: svc.name, description: svc.description || '',
            category: svc.category || '', targetUrl: svc.targetUrl,
            method: svc.method || 'POST', forwardType: svc.forwardType || 'json',
            forwardMode: svc.forwardMode || 'template', customScript: svc.customScript || '',
            bodyTemplate: svc.bodyTemplate || '',
            forwardHeaders: svc.forwardHeaders || {}, params: svc.params || [],
            inputExample: svc.inputExample || '', outputExample: svc.outputExample || '',
            enabled: true, rateLimit: { perMinute: 30 }, createdAt: Date.now(), updatedAt: Date.now(),
          });
          results.created++;
        }
      } catch (e) {
        results.errors.push({ slug: svc.slug, message: e.message });
      }
    }

    await auditLog('services_imported', { ...results });
    res.json({ success: true, data: results });
  } catch (e) { res.status(500).json({ error: e.message }); }
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

// 管理员重置用户密码
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: '请输入新密码' });
    const { isStrongPassword } = require('../utils/helpers');
    if (!isStrongPassword(newPassword)) return res.status(400).json({ error: '密码至少8位含大小写字母和数字' });
    const bcrypt = require('bcryptjs');
    const config = require('../config');
    const hash = await bcrypt.hash(newPassword, config.bcryptSaltRounds);
    await db.users.update({ _id: req.params.id }, { $set: { password: hash, updatedAt: Date.now() } });
    await auditLog('user_password_reset', { userId: req.params.id, by: req.user._id });
    res.json({ success: true, data: { message: '密码已重置' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== 日志 =====
router.get('/logs', async (req, res) => {
  try {
    const { page, pageSize, username, email, apiKeyName, method, statusCode, startTime, endTime, serviceSlug } = req.query;
    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 50, 200);
    const query = {};
    if (username) query.username = new RegExp(username, 'i');
    if (email) query.email = new RegExp(email, 'i');
    if (apiKeyName) query.apiKeyName = new RegExp(apiKeyName, 'i');
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
const tierService = require('../services/tierService');

router.get('/billing/stats', async (req, res) => {
  try {
    const { month, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const stats = await billingService.getSystemBillingStats(month);

    // 搜索用户
    let userIds = null;
    if (search) {
      const matched = await db.users.find({ username: { $regex: search, $options: 'i' } });
      userIds = matched.map(u => u._id);
      if (!userIds.length) return res.json({ success: true, data: { summary: stats, users: { records: [], total: 0, page, pageSize, totalPages: 0 } } });
    }

    const users = await billingService.getAllUsersBilling(month, page, pageSize);
    // 如果搜索，过滤用户
    if (userIds) {
      const allUserIds = new Set(userIds);
      const filtered = users.records.filter(r => allUserIds.has(r.userId));
      users.records = filtered;
      users.total = filtered.length;
      users.totalPages = Math.ceil(users.total / pageSize);
    }

    // 计算总消费（从 paymentTokens 累加）
    const consumptionMap = {};
    for (const r of users.records) {
      const paidOrders = await db.paymentTokens.find({ userId: r.userId, status: 'paid' });
      let totalPaid = 0;
      let monthPaid = 0;
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      for (const o of paidOrders) {
        totalPaid += o.amount || 0;
        if (o.createdAt >= monthStart.getTime()) monthPaid += o.amount || 0;
      }
      // 获取当前激活套餐
      const activeSubs = await billingService.getActiveSubscriptions(r.userId);
      const activeNames = activeSubs.map(s => s.name).join(', ') || '-';
      r.totalConsumption = totalPaid;
      r.monthConsumption = monthPaid;
      r.activeTier = activeNames;
    }

    res.json({ success: true, data: { summary: stats, users } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/billing/generate', async (req, res) => {
  try {
    const bills = await billingService.generateMonthlyBill(req.body.month);
    res.json({ success: true, data: { message: `生成了${bills.length}条账单`, bills } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/config', async (req, res) => {
  try {
    const tiers = await billingService.getBillingConfig();
    res.json({ success: true, data: { billing: tiers, rateLimit: config.rateLimit, proxy: config.proxy, serviceStoreUrl: config.serviceStoreUrl } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 套餐 CRUD
router.get('/tiers', async (req, res) => {
  try {
    const tiers = await tierService.getTiers();
    res.json({ success: true, data: tiers });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/tiers', async (req, res) => {
  try {
    const tier = await tierService.addTier(req.body);
    await auditLog('tier_created', { name: tier.name });
    res.json({ success: true, data: tier });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/tiers/:id', async (req, res) => {
  try {
    const tier = await tierService.updateTier(req.params.id, req.body);
    await auditLog('tier_updated', { tierId: req.params.id });
    res.json({ success: true, data: tier });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.delete('/tiers/:id', async (req, res) => {
  try {
    const result = await tierService.deleteTier(req.params.id);
    await auditLog('tier_deleted', { tierId: req.params.id });
    res.json({ success: true, data: result });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.put('/tiers/batch/save', async (req, res) => {
  try {
    const tiers = await tierService.saveAll(req.body.tiers);
    await auditLog('tiers_batch_saved');
    res.json({ success: true, data: tiers });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
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

// 管理员为用户配置任意套餐并设置到期时间
router.post('/users/:id/subscription', async (req, res) => {
  try {
    const { tierIndex, durationDays, expiresAt } = req.body;
    if (tierIndex === undefined) return res.status(400).json({ error: '缺少 tierIndex' });
    const result = await billingService.adminSetSubscription(req.params.id, tierIndex, { durationDays, expiresAt });
    await auditLog('subscription_admin_set', { userId: req.params.id, tierIndex, durationDays, expiresAt });
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

// ===== 公告管理 =====
const noticeService = require('../services/noticeService');
const settingsService = require('../services/settingsService');

router.get('/notices', async (req, res) => {
  try {
    const result = await noticeService.getNotices({ page: parseInt(req.query.page) || 1, pageSize: parseInt(req.query.pageSize) || 20 });
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/notices', async (req, res) => {
  try {
    const n = await noticeService.createNotice(req.body);
    await auditLog('notice_created', { id: n._id });
    res.json({ success: true, data: n });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.put('/notices/:id', async (req, res) => {
  try {
    const n = await noticeService.updateNotice(req.params.id, req.body);
    await auditLog('notice_updated', { id: req.params.id });
    res.json({ success: true, data: n });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.delete('/notices/:id', async (req, res) => {
  try {
    await noticeService.deleteNotice(req.params.id);
    await auditLog('notice_deleted', { id: req.params.id });
    res.json({ success: true, data: { message: '已删除' } });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ===== 站点设置 =====
router.get('/settings', async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    res.json({ success: true, data: settings });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/settings', async (req, res) => {
  try {
    const settings = await settingsService.saveSettings(req.body);
    await auditLog('settings_updated', { ...req.body });
    res.json({ success: true, data: settings });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 支付订单记录（支持搜索：用户名、套餐、时间范围、状态、来源）
router.get('/payment-orders', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);
    const skip = (page - 1) * pageSize;
    const { search, tierName, startDate, endDate, status, source } = req.query;

    // 构建查询条件
    const query = {};
    if (tierName) query.tierName = { $regex: tierName, $options: 'i' };
    if (status) query.status = status;
    if (source) query.source = source;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate).getTime();
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59').getTime();
    }

    // 如果搜索用户名，先查匹配的用户ID
    let userIdFilter = null;
    if (search) {
      const matched = await db.users.find({ username: { $regex: search, $options: 'i' } });
      userIdFilter = matched.map(u => u._id);
      if (!userIdFilter.length) {
        return res.json({ success: true, data: { orders: [], total: 0, page, pageSize, totalPages: 0 } });
      }
    }

    // 合并查询
    let allOrders;
    if (userIdFilter) {
      allOrders = [];
      // 分批次查询
      for (const uid of userIdFilter) {
        const q = { ...query, userId: uid };
        const batch = await db.paymentTokens.find(q).sort({ createdAt: -1 });
        allOrders.push(...batch);
      }
      allOrders.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      allOrders = await db.paymentTokens.find(query).sort({ createdAt: -1 });
    }

    const total = allOrders.length;
    const pagedOrders = allOrders.slice(skip, skip + pageSize);

    // 批量查用户
    const userIds = [...new Set(pagedOrders.map(o => o.userId).filter(Boolean))];
    const userMap = {};
    if (userIds.length) {
      const users = await db.users.find({ _id: { $in: userIds } });
      users.forEach(u => { userMap[u._id] = u; });
    }

    res.json({
      success: true,
      data: {
        orders: pagedOrders.map(o => {
          const u = userMap[o.userId] || {};
          return {
            orderId: o.orderId,
            userId: o.userId,
            username: u.username || '-',
            email: u.email || '-',
            tierName: o.tierName || '',
            amount: o.amount || 0,
            status: o.status,
            source: o.source || 'payment',
            createdAt: o.createdAt,
            expiresAt: o.expiresAt,
          };
        }),
        total, page, pageSize, totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== 更新检测 =====
const { execSync } = require('child_process');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');

router.get('/check-update', async (req, res) => {
  try {
    // git fetch 获取远程最新信息
    execSync('git fetch origin', { cwd: projectRoot, timeout: 15000, stdio: 'pipe' });
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectRoot, encoding: 'utf8' }).trim();
    const localHash = execSync('git rev-parse HEAD', { cwd: projectRoot, encoding: 'utf8' }).trim();
    const remoteHash = execSync(`git rev-parse origin/${branch}`, { cwd: projectRoot, encoding: 'utf8' }).trim();
    const behind = parseInt(execSync(`git rev-list --count HEAD..origin/${branch}`, { cwd: projectRoot, encoding: 'utf8' }).trim()) || 0;
    // 获取日期
    const localDate = execSync('git log -1 --format=%ci', { cwd: projectRoot, encoding: 'utf8' }).trim();
    const remoteDate = behind > 0 ? execSync(`git log -1 --format=%ci origin/${branch}`, { cwd: projectRoot, encoding: 'utf8' }).trim() : localDate;
    // 获取更新日志
    let changelog = '';
    if (behind > 0) {
      changelog = execSync(`git log --oneline -5 HEAD..origin/${branch}`, { cwd: projectRoot, encoding: 'utf8' }).trim();
    }
    res.json({ success: true, data: { hasUpdate: behind > 0, behind, branch, local: localHash.substring(0, 7), remote: remoteHash.substring(0, 7), localDate, remoteDate, changelog } });
  } catch (e) {
    res.status(500).json({ error: '检测失败: ' + (e.stderr || e.message || '') });
  }
});

router.post('/update', async (req, res) => {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectRoot, encoding: 'utf8' }).trim();
    // 清理 public/ 中的构建产物，避免 pull 冲突
    try { execSync('git checkout -- public/', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' }); } catch {}
    try { execSync('git clean -fd public/', { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' }); } catch {}
    const result = execSync(`git pull origin ${branch}`, { cwd: projectRoot, encoding: 'utf8', timeout: 30000 });
    // 安装后端新依赖
    let npmOut = '';
    try { npmOut = execSync('npm install --production', { cwd: projectRoot, encoding: 'utf8', timeout: 60000, stdio: 'pipe' }); } catch {}
    // 安装前端依赖并重新构建
    let frontOut = '';
    try {
      execSync('npm install', { cwd: path.join(projectRoot, 'frontend'), encoding: 'utf8', timeout: 120000, stdio: 'pipe' });
      frontOut = execSync('npm run build', { cwd: path.join(projectRoot, 'frontend'), encoding: 'utf8', timeout: 120000, stdio: 'pipe' });
      // 把 dist 输出覆盖到 public/
      execSync('cp -rf frontend/dist/* public/', { cwd: projectRoot, stdio: 'pipe' });
    } catch {}
    await auditLog('system_update', { branch, output: result, npm: npmOut, frontend: frontOut });
    res.json({ success: true, data: { message: '更新完成，服务即将重启...', output: result } });
    // 等响应完全发出后再退出
    setTimeout(() => {
      console.log('[更新] 正在重启服务...');
      process.exit(0);
    }, 3000);
  } catch (e) {
    res.status(500).json({ error: '更新失败: ' + (e.stderr || e.message || '') });
  }
});

module.exports = router;
