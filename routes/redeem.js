const express = require('express');
const router = express.Router();
const redeemService = require('../services/redeemService');
const { jwtAuth } = require('../middleware/auth');

router.use(jwtAuth);

router.post('/', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: '请输入兑换码' });
    const result = await redeemService.redeem(req.user._id, code);
    res.json({ success: true, data: result });
  } catch (err) { res.status(err.status || 500).json({ error: err.message || '兑换失败' }); }
});

module.exports = router;
