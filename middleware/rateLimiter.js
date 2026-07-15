const { db } = require('../database');
const config = require('../config');
const tierService = require('../services/tierService');

function createRateLimiter(windowMs = 60000) {
  return async (req, res, next) => {
    try {
      const userId = req.user?._id || 'anonymous';
      const now = Date.now();
      const tierIndex = req.user?.tierIndex || 0;
      const tiers = await tierService._getRawTiers();
      const tier = tiers[tierIndex] || tiers[0] || { ratePerSecond: 10 };

      // 每秒限流
      const perSecondLimit = req.user?.rateLimit?.perSecond || tier.ratePerSecond || 10;
      const oneSecAgo = now - 1000;
      const secCount = await db.rateLimit.count({ userId, windowMs: 1000, timestamp: { $gte: oneSecAgo } });
      if (secCount >= perSecondLimit) {
        return res.status(429).json({ error: `请求过于频繁（每秒${perSecondLimit}次）`, retryAfter: 1 });
      }

      // 每日限流
      if (tier.maxCallsPerDay && tier.maxCallsPerDay > 0) {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const dayCount = await db.rateLimit.count({ userId, windowMs: 86400000, timestamp: { $gte: todayStart.getTime() } });
        if (dayCount >= tier.maxCallsPerDay) {
          return res.status(429).json({ error: `已达到每日调用上限（${tier.maxCallsPerDay}次），请明日再试`, retryAfter: 86400 });
        }
      }

      await db.rateLimit.insert({ userId, windowMs: 1000, timestamp: now });
      await db.rateLimit.insert({ userId, windowMs: 86400000, timestamp: now });

      // 清理旧数据
      await db.rateLimit.remove({ timestamp: { $lt: now - 86400000 } }, { multi: true });

      next();
    } catch { next(); }
  };
}

async function createDailyLimiter() {
  return async (req, res, next) => {
    // 合并到上面的 createRateLimiter 中处理
    next();
  };
}

module.exports = { createRateLimiter, createDailyLimiter };
