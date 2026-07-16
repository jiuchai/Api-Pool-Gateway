const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { jwtAuth } = require('../middleware/auth');
const { formatDateTime } = require('../utils/helpers');

router.use(jwtAuth);

router.get('/', async (req, res) => {
  try {
    const { page, pageSize, method, statusCode, startTime, endTime, serviceSlug, apiKeyName } = req.query;
    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 50, 100);
    const query = { userId: req.user._id };
    if (serviceSlug) query.serviceSlug = serviceSlug;
    if (apiKeyName) query.apiKeyName = new RegExp(apiKeyName, 'i');
    if (method) query.method = method.toUpperCase();
    if (statusCode) {
      // 支持 "4xx,5xx" 逗号分隔格式
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
    res.json({
      success: true, data: {
        logs: logs.map(l => ({ ...l, id: l._id, timestamp: formatDateTime(l.timestamp) })),
        pagination: { total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) },
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const sevenDaysAgo = Date.now() - 7 * 86400000;

    const query = { userId: req.user._id };

    const [totalCalls, successCalls, clientErr, serverErr] = await Promise.all([
      db.callLogs.count(query),
      db.callLogs.count({ ...query, statusCode: { $gte: 200, $lt: 300 } }),
      db.callLogs.count({ ...query, statusCode: { $gte: 400, $lt: 500 } }),
      db.callLogs.count({ ...query, statusCode: { $gte: 500, $lt: 600 } }),
    ]);

    const todayCalls = (await db.callLogs.count({ ...query, timestamp: { $gte: todayStart } }));
    const monthCalls = (await db.callLogs.count({ ...query, timestamp: { $gte: monthStart } }));
    const activeServices = await db.services.count({ enabled: true });
    const keyCount = await db.apiKeys.count({ userId: req.user._id });

    // 近7天每日趋势
    const recentLogs = await db.callLogs.find({ ...query, timestamp: { $gte: sevenDaysAgo } }).sort({ timestamp: 1 });
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

    res.json({
      success: true,
      data: {
        stats: { todayCalls, monthCalls, totalCalls, successCalls, clientErrorCalls: clientErr, serverErrorCalls: serverErr, activeServices, keyCount },
        dailyData,
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
