const jwt = require('jsonwebtoken');
const config = require('../config');
const { db } = require('../database');

async function jwtAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: '未提供令牌' });
    const d = jwt.verify(header.split(' ')[1], config.jwt.secret);
    const user = await db.users.findOne({ _id: d.userId });
    if (!user) return res.status(401).json({ error: '用户不存在' });
    if (user.disabled) return res.status(403).json({ error: '账号已禁用' });
    req.user = user;
    next();
  } catch { return res.status(401).json({ error: '认证失败' }); }
}

async function apiKeyAuth(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (!apiKey) return res.status(401).json({ error: '缺少API Key' });
    const rec = await db.apiKeys.findOne({ key: apiKey });
    if (!rec || rec.disabled) return res.status(401).json({ error: '无效的API Key' });
    const user = await db.users.findOne({ _id: rec.userId });
    if (!user || user.disabled) return res.status(403).json({ error: '用户已禁用' });
    req.user = user;
    req.apiKey = rec;
    next();
  } catch { return res.status(500).json({ error: '认证异常' }); }
}

async function adminAuth(req, res, next) {
  await jwtAuth(req, res, () => {
    if (req.user?.role === 'admin') return next();
    return res.status(403).json({ error: '需要管理员权限' });
  });
}

function generateToken(user) {
  return jwt.sign({ userId: user._id, username: user.username, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

module.exports = { jwtAuth, apiKeyAuth, adminAuth, generateToken };
