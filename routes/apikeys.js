const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { jwtAuth } = require('../middleware/auth');

router.use(jwtAuth);

router.get('/', async (req, res) => {
  try { const keys = await userService.getApiKeys(req.user._id); res.json({ success: true, data: keys }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', async (req, res) => {
  try { const key = await userService.createApiKey(req.user._id, req.body.name); res.json({ success: true, data: key }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.put('/:id/disable', async (req, res) => {
  try { const r = await userService.disableApiKey(req.user._id, req.params.id); res.json({ success: true, data: r }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.put('/:id/enable', async (req, res) => {
  try { const r = await userService.enableApiKey(req.user._id, req.params.id); res.json({ success: true, data: r }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/:id/regenerate', async (req, res) => {
  try { const key = await userService.regenerateApiKey(req.user._id, req.params.id); res.json({ success: true, data: key }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
