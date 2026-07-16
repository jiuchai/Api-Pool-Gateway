const express = require('express');
const router = express.Router();
const billingService = require('../services/billingService');
const tierService = require('../services/tierService');
const { jwtAuth } = require('../middleware/auth');
const { db } = require('../database');
const config = require('../config');

// 支付回调（无需认证，通过 token 验证）
const settingsService = require('../services/settingsService');
const { v4: uuidv4 } = require('uuid');

// 支付回调处理函数
async function handlePaymentWebhook(req, res) {
  try {
    const settings = await settingsService.getSettings();
    const { secret, token } = req.body;
    if (!settings.paymentWebhookSecret || secret !== settings.paymentWebhookSecret) {
      return res.status(403).json({ error: '验证失败' });
    }
    if (!token) return res.status(400).json({ error: '缺少 token' });
    
    const paymentToken = await db.paymentTokens.findOne({ token });
    if (!paymentToken) return res.status(404).json({ error: '无效的支付凭证' });
    if (paymentToken.used) return res.status(400).json({ error: '支付凭证已使用' });
    if (paymentToken.expiresAt < Date.now()) return res.status(400).json({ error: '支付凭证已过期' });
    
    await db.paymentTokens.update({ token }, { $set: { used: true } });
    
    const result = await billingService.subscribeTier(paymentToken.userId, paymentToken.tierIndex, paymentToken.durationDays);
    const tiers = await tierService._getRawTiers();
    const tier = tiers[paymentToken.tierIndex];
    if (tier && tier.ratePerSecond !== undefined) {
      await db.users.update({ _id: paymentToken.userId }, { $set: { 'rateLimit.perSecond': tier.ratePerSecond, updatedAt: Date.now() } });
    }
    res.json({ success: true, data: result });
  } catch (err) { res.status(err.status || 500).json({ error: err.message || '处理失败' }); }
}

router.post('/payment-webhook', handlePaymentWebhook);

// 生成支付凭证（需登录）
router.post('/create-payment', jwtAuth, async (req, res) => {
  try {
    const { tierIndex, durationDays } = req.body;
    if (tierIndex === undefined) return res.status(400).json({ error: '缺少 tierIndex' });
    const settings = await settingsService.getSettings();
    const tiers = await tierService._getRawTiers();
    const tier = tiers[tierIndex];
    const token = uuidv4();
    await db.paymentTokens.insert({
      token, userId: req.user._id, tierIndex, durationDays: durationDays || 30,
      used: false, expiresAt: Date.now() + 30 * 60 * 1000,
    });
    // 通知外部支付服务
    if (settings.paymentNotifyUrl) {
       try {
         const axios = require('axios');
         const webhookUrl = `http://${req.get('host').replace(/:\d+$/, '')}:${config.port}/pay`;
         await axios.post(settings.paymentNotifyUrl, {
           token, userId: req.user._id, tierIndex,
           tierName: tier?.name || '', amount: tier?.monthlyFee || 0,
           durationDays: durationDays || 30, webhookUrl,
         }, { timeout: 5000 });
      } catch { /* 通知失败不影响主流程 */ }
    }
    res.json({ success: true, data: { token } });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
});

router.use(jwtAuth);

router.get('/tiers', async (req, res) => {
  try {
    const tiers = await tierService.getTiers();
    res.json({ success: true, data: { tiers: tiers.map((t, i) => ({ index: i, name: t.name, ratePerSecond: t.ratePerSecond || 10, maxCallsPerDay: t.maxCallsPerDay, monthlyFee: t.monthlyFee, description: t.description || '', features: t.features || [], onSale: t.onSale !== undefined ? t.onSale : true })) } });
  } catch (err) { res.status(500).json({ error: '获取套餐失败' }); }
});

router.get('/subscriptions', async (req, res) => {
  try {
    const subs = await billingService.getActiveSubscriptions(req.user._id);
    res.json({ success: true, data: subs });
  } catch (err) { res.status(err.status || 500).json({ error: err.message || '获取订阅失败' }); }
});

router.post('/subscribe', async (req, res) => {
  try {
    const { tierIndex, durationDays } = req.body;
    const result = await billingService.subscribeTier(req.user._id, tierIndex, durationDays);
    const tiers = await tierService._getRawTiers();
    const tier = tiers[tierIndex];
    if (tier && tier.ratePerSecond !== undefined) {
      await db.users.update({ _id: req.user._id }, { $set: { 'rateLimit.perSecond': tier.ratePerSecond, updatedAt: Date.now() } });
    }
    res.json({ success: true, data: result });
  } catch (err) { res.status(err.status || 500).json({ error: err.message || '订阅失败' }); }
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

module.exports = router;
module.exports.paymentWebhook = handlePaymentWebhook;
