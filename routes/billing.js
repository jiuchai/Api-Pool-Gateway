const express = require('express');
const router = express.Router();
const billingService = require('../services/billingService');
const tierService = require('../services/tierService');
const { jwtAuth } = require('../middleware/auth');
const { db } = require('../database');

router.use(jwtAuth);

router.get('/tiers', async (req, res) => {
  try {
    const tiers = await tierService.getTiers();
    res.json({ success: true, data: { tiers: tiers.map((t, i) => ({ index: i, name: t.name, ratePerSecond: t.ratePerSecond || 10, maxCallsPerDay: t.maxCallsPerDay, monthlyFee: t.monthlyFee })) } });
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
