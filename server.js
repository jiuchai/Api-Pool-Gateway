require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const bcrypt = require('bcryptjs');

const config = require('./config');
const { db, ensureIndexes } = require('./database');
const { auditLog } = require('./middleware/logger');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'] }));
app.use(compression());
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/keys', require('./routes/apikeys'));
app.use('/api/gateway', require('./routes/gateway'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/redeem', require('./routes/redeem'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api', (req, res) => {
  res.json({ name: 'API Pool Gateway', version: '1.0.0', description: '动态API聚合网关 - 支持热加载多种API服务', docs: '/#/docs', timestamp: new Date().toISOString() });
});

// 公开服务列表（供前端筛选使用）
app.get('/api/services', async (req, res) => {
  try {
    const services = await db.services.find({ enabled: true }).sort({ category: 1, name: 1 });
    res.json({ success: true, data: services });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 404 & error
app.use((req, res) => { res.status(404).json({ error: '接口不存在' }); });
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || '服务器错误' });
});

// 初始化
async function init() {
  await ensureIndexes();
  const admin = await db.users.findOne({ role: 'admin' });
  if (!admin) {
    const hash = await bcrypt.hash(config.admin.password, config.bcryptSaltRounds);
    await db.users.insert({ username: config.admin.username, email: config.admin.email, password: hash, role: 'admin', disabled: false, createdAt: Date.now(), updatedAt: Date.now() });
    console.log('[系统] 管理员账号已创建');
  }
  // 清理限流
  setInterval(async () => {
    try { await db.rateLimit.remove({ timestamp: { $lt: Date.now() - 86400000 } }, { multi: true }); } catch {}
  }, 3600000);
}

init().then(() => {
  app.listen(config.port, () => {
    console.log('========================================');
    console.log(`  API Pool Gateway 已启动 → http://localhost:${config.port}`);
    console.log(`  管理员: ${config.admin.username}`);
    console.log('========================================');
  });
});

module.exports = app;
