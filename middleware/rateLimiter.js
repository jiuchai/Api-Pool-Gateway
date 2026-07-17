const { db } = require('../database');
const config = require('../config');
const tierService = require('../services/tierService');

async function logLimitedCall(req, reason) {
  try {
    const body = req.body ? JSON.stringify(req.body) : '';
    const slug = req.params?.slug || null;
    let serviceName = null;
    if (slug) {
      try { const svc = await db.services.findOne({ slug }); serviceName = svc?.name || null; } catch {}
    }
    db.callLogs.insert({
      userId: req.user?._id || null,
      username: req.user?.username || 'anonymous',
      email: req.user?.email || null,
      apiKeyName: req.apiKey?.name || null,
      serviceSlug: slug,
      serviceName,
      method: req.method,
      path: req.originalUrl,
      targetUrl: null,
      statusCode: 429,
      responseTime: 0,
      ip: (req.headers['x-forwarded-for'] || req.ip || '').replace(/^::1$/, '127.0.0.1'),
      requestBody: body.length > 5000 ? body.slice(0, 5000) + '...[截断]' : body,
      responseBody: JSON.stringify({ error: reason }),
      timestamp: Date.now(),
    });
  } catch {}
}

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

      // 每秒限流（当 limit < 1 时扩大窗口，如 0.1/秒 = 10秒内1次）
      const perSecondLimit = tier.ratePerSecond || req.user?.rateLimit?.perSecond || 10;
      let limitWindowMs = 1000;
      let limitCount = Math.floor(perSecondLimit);
      if (perSecondLimit < 1 && perSecondLimit > 0) {
        limitWindowMs = Math.ceil(1000 / perSecondLimit);
        limitCount = 1;
      }
      const windowAgo = now - limitWindowMs;
      const secCount = await db.rateLimit.count({ userId, windowMs: limitWindowMs, timestamp: { $gte: windowAgo } });
      if (secCount >= limitCount) {
        const msg = `请求过于频繁（每${(limitWindowMs / 1000).toFixed(1)}秒${limitCount}次）`;
        await logLimitedCall(req, msg);
        return res.status(429).json({ error: msg, retryAfter: Math.ceil(limitWindowMs / 1000) });
      }

      // 每日限流（按套餐分别统计，切换套餐后额度独立）
      if (tier.maxCallsPerDay && tier.maxCallsPerDay > 0) {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const dayCount = await db.rateLimit.count({ userId, tierIndex, windowMs: 86400000, timestamp: { $gte: todayStart.getTime() } });
        if (dayCount >= tier.maxCallsPerDay) {
          const msg = `已达到每日调用上限（${tier.maxCallsPerDay}次），可切换套餐或明日再试`;
          await logLimitedCall(req, msg);
          return res.status(429).json({ error: msg, retryAfter: 86400 });
        }
      }

      await db.rateLimit.insert({ userId, tierIndex, windowMs: limitWindowMs, timestamp: now });
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
