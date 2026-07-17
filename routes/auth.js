const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const captcha = require('../utils/captcha');
const { jwtAuth } = require('../middleware/auth');

// 获取验证码
router.get('/captcha', (req, res) => {
  try {
    const { id, svg } = captcha.generate();
    res.json({ success: true, data: { captchaId: id, svg } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 注册
router.post('/register', async (req, res) => {
  try {
    if (!captcha.verify(req.body.captchaId, req.body.captcha)) {
      return res.status(400).json({ error: '验证码错误或已过期' });
    }
    const r = await userService.register(req.body);
    res.json({ success: true, data: r });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    if (!captcha.verify(req.body.captchaId, req.body.captcha)) {
      return res.status(400).json({ error: '验证码错误或已过期' });
    }
    const r = await userService.login(req.body);
    res.json({ success: true, data: r });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.get('/profile', jwtAuth, async (req, res) => {
  try { const p = await userService.getProfile(req.user._id); res.json({ success: true, data: p }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});
router.put('/profile', jwtAuth, async (req, res) => {
  try { const r = await userService.updateProfile(req.user._id, req.body); res.json({ success: true, data: r }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});
router.put('/password', jwtAuth, async (req, res) => {
  try { const r = await userService.changePassword(req.user._id, req.body.oldPassword, req.body.newPassword); res.json({ success: true, data: r }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

module.exports = router;
