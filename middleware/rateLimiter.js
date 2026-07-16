const { db } = require('../database');
const config = require('../config');
const tierService = require('../services/tierService');

function createRateLimiter(windowMs = 60000) {
  return async (req, res, next) => {
    try {
      const userId = req.user?._id || 'anonymous';
      const now = Date.now();
      const tiers = await tierService._getRawTiers();
      const userTierIndex = req.user?.tierIndex;
      // 取用户当前套餐，无套餐（tierIndex < 0 或不存在）则尝试找免费套餐兜底
      let tier = null;
      let tierIndex = userTierIndex;
      if (tierIndex >= 0 && tierIndex < tiers.length) {
        tier = tiers[tierIndex];
      } else {
        const freeTier = tiers.find(t => t.monthlyFee === 0);
        if (freeTier) {
          tier = freeTier;
          tierIndex = tiers.indexOf(freeTier);
        } else {
          // 没有任何套餐，放行
          return next();
        }
      }

      // 每秒限流（全局共用，不按套餐区分）
      const perSecondLimit = req.user?.rateLimit?.perSecond || tier.ratePerSecond || 10;
      const oneSecAgo = now - 1000;
      const secCount = await db.rateLimit.count({ userId, windowMs: 1000, timestamp: { $gte: oneSecAgo } });
      if (secCount >= perSecondLimit) {
        return res.status(429).json({ error: `请求过于频繁（每秒${perSecondLimit}次）`, retryAfter: 1 });
      }

      // 每日限流（按套餐分别统计，切换套餐后额度独立）
      if (tier.maxCallsPerDay && tier.maxCallsPerDay > 0) {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const dayCount = await db.rateLimit.count({ userId, tierIndex, windowMs: 86400000, timestamp: { $gte: todayStart.getTime() } });
        if (dayCount >= tier.maxCallsPerDay) {
          return res.status(429).json({ error: `已达到每日调用上限（${tier.maxCallsPerDay}次），可切换套餐或明日再试`, retryAfter: 86400 });
        }
      }

      await db.rateLimit.insert({ userId, tierIndex, windowMs: 1000, timestamp: now });
      await db.rateLimit.insert({ userId, tierIndex, windowMs: 86400000, timestamp: now });

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
