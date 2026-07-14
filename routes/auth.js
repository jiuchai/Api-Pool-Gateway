const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { jwtAuth } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try { const r = await userService.register(req.body); res.json({ success: true, data: r }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});
router.post('/login', async (req, res) => {
  try { const r = await userService.login(req.body); res.json({ success: true, data: r }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});
router.get('/profile', jwtAuth, async (req, res) => {
  try { const p = await userService.getProfile(req.user._id); res.json({ success: true, data: p }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});
router.put('/password', jwtAuth, async (req, res) => {
  try { const r = await userService.changePassword(req.user._id, req.body.oldPassword, req.body.newPassword); res.json({ success: true, data: r }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

module.exports = router;
