const express = require('express');
const router = express.Router();
const billingService = require('../services/billingService');
const tierService = require('../services/tierService');
const { jwtAuth } = require('../middleware/auth');
const { db } = require('../database');
const config = require('../config');
const crypto = require('crypto');

const settingsService = require('../services/settingsService');

const ORDER_EXPIRE_MINUTES = 15; // 订单 15 分钟过期

function genId() { return crypto.randomBytes(16).toString('hex'); }

// ==================== 支付回调处理（无需认证） ====================

async function handlePaymentWebhook(req, res) {
  try {
    const settings = await settingsService.getSettings();
    const { orderId, secretKey } = req.body;

    // 1) 校验 webhook 全局密钥
    if (!settings.paymentWebhookSecret || req.body.secret !== settings.paymentWebhookSecret) {
      return res.status(403).json({ error: '验证失败' });
    }

    // 2) 必须有 orderId 和 secretKey
    if (!orderId || !secretKey) return res.status(400).json({ error: '缺少 orderId 或 secretKey' });

    // 3) 查订单
    const order = await db.paymentTokens.findOne({ orderId });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.status === 'paid') return res.status(400).json({ error: '订单已处理' });
    if (order.expiresAt < Date.now()) {
      return res.status(400).json({ error: '订单已过期' });
    }

    // 4) 校验订单专属 secretKey
    if (order.secretKey !== secretKey) return res.status(403).json({ error: '订单密钥不匹配' });

    // 5) 标记已支付
    await db.paymentTokens.update({ orderId }, { $set: { status: 'paid' } });

    // 6) 激活订阅
    const result = await billingService.subscribeTier(order.userId, order.tierIndex, order.durationDays);
    const tiers = await tierService._getRawTiers();
    const tier = tiers[order.tierIndex];
    if (tier && tier.ratePerSecond !== undefined) {
      await db.users.update({ _id: order.userId }, { $set: { tierIndex: order.tierIndex, 'rateLimit.perSecond': tier.ratePerSecond, updatedAt: Date.now() } });
    }

    console.log(`[支付] 回调成功 orderId=${orderId} userId=${order.userId} 套餐=${tier?.name}`);
    res.json({ success: true, data: result });
  } catch (err) { res.status(err.status || 500).json({ error: err.message || '处理失败' }); }
}

// ==================== 生成支付订单（需登录） ====================

router.post('/create-payment', jwtAuth, async (req, res) => {
  try {
    const { tierIndex, durationDays } = req.body;
    if (tierIndex === undefined) return res.status(400).json({ error: '缺少 tierIndex' });

    const settings = await settingsService.getSettings();
    const tiers = await tierService._getRawTiers();
    const tier = tiers[tierIndex];
    if (!tier) return res.status(400).json({ error: '无效的套餐' });

    const userId = req.user._id;
    const orderId = genId();
    const secretKey = genId();
    const days = durationDays || 30;
    const amount = tier?.monthlyFee || 0;
    const tierName = tier?.name || '';
    const expiresAt = Date.now() + ORDER_EXPIRE_MINUTES * 60 * 1000;

    // 先写入本地
    await db.paymentTokens.insert({
      orderId, secretKey, userId, tierIndex,
      durationDays: days, amount, tierName,
      status: 'pending', expiresAt, createdAt: Date.now(),
    });

    // 推送到支付服务（从站点设置读取地址）
    const axios = require('axios');
    if (settings.paymentNotifyUrl) {
      try {
        const webhookUrl = `http://${req.get('host').replace(/:\d+$/, '')}:${config.port}/pay`;
        await axios.post(settings.paymentNotifyUrl, {
          orderId, secretKey, userId, tierIndex,
          durationDays: days, amount, tierName, expiresAt, webhookUrl,
        }, { timeout: 5000 });
      } catch (e) {
        await db.paymentTokens.update({ orderId }, { $set: { status: 'failed' } });
        console.error('[支付] 推送到支付服务失败:', e.message);
        return res.status(502).json({ error: '支付服务不可用，请稍后重试' });
      }
    }

    res.json({ success: true, data: { orderId, amount, tierName, expiresAt } });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// ==================== 查询订单状态（需登录） ====================

router.get('/order-status', jwtAuth, async (req, res) => {
  try {
    const { orderId } = req.query;
    if (!orderId) return res.status(400).json({ error: '缺少 orderId' });
    const order = await db.paymentTokens.findOne({ orderId, userId: req.user._id });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    // 不返回 secretKey
    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        status: order.status,
        expired: order.expiresAt < Date.now(),
        tierIndex: order.tierIndex,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
      },
    });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

router.use(jwtAuth);

router.get('/tiers', async (req, res) => {
  try {
    const tiers = await tierService.getTiers();
    res.json({ success: true, data: { tiers: tiers.map((t, i) => ({ index: i, name: t.name, monthlyFee: t.monthlyFee, description: t.description || '', features: t.features || [], onSale: t.onSale !== undefined ? t.onSale : true })) } });
  } catch (err) { res.status(500).json({ error: '获取套餐失败' }); }
});

router.get('/subscriptions', async (req, res) => {
  try {
    const subs = await billingService.getActiveSubscriptions(req.user._id);
    res.json({ success: true, data: subs });
  } catch (err) { res.status(err.status || 500).json({ error: err.message || '获取订阅失败' }); }
});

router.put('/active-subscription', async (req, res) => {
  try {
    const { subscriptionId, tierIndex } = req.body;
    let result;
    if (tierIndex !== undefined) {
      result = await billingService.setActiveTier(req.user._id, tierIndex);
    } else {
      result = await billingService.setActiveSubscription(req.user._id, subscriptionId);
    }
    res.json({ success: true, data: result });
  } catch (err) { res.status(err.status || 500).json({ error: err.message || '切换失败' }); }
});

router.get('/usage', async (req, res) => {
  try { const usage = await billingService.getCurrentUsage(req.user._id); res.json({ success: true, data: usage }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

router.get('/bills', async (req, res) => {
  try { const bills = await billingService.getBills(req.user._id, parseInt(req.query.page) || 1, parseInt(req.query.pageSize) || 12); res.json({ success: true, data: bills }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

// 支付记录（用户自己的订单历史）
router.get('/payment-history', async (req, res) => {
  try {
    const orders = await db.paymentTokens.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({
      success: true,
      data: orders.map(o => ({
        orderId: o.orderId,
        tierName: o.tierName || '',
        amount: o.amount || 0,
        status: o.status,
        source: o.source || 'payment',
        createdAt: o.createdAt,
        expiresAt: o.expiresAt,
      })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.paymentWebhook = handlePaymentWebhook;
