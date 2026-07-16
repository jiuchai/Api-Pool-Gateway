require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const bcrypt = require('bcryptjs');
const fileLogger = require('./utils/fileLogger');

// 初始化文件日志（console.log/error/warn 会自动同步写入文件）
fileLogger.setup();

const config = require('./config');
const { db, ensureIndexes } = require('./database');
const tierService = require('./services/tierService');
const { auditLog } = require('./middleware/logger');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'] }));
app.use(compression());
// 访问日志 → 控制台 + 文件
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
app.use(morgan('[:date[iso]] :method :url :status :response-time ms', { stream: fileLogger.accessLogStream }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/downloads', express.static(path.join(__dirname, 'downloads')));

// 定时清理下载文件（30分钟过期）
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
if (!require('fs').existsSync(DOWNLOADS_DIR)) require('fs').mkdirSync(DOWNLOADS_DIR, { recursive: true });
setInterval(() => {
  const fs = require('fs');
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30分钟
  fs.readdir(DOWNLOADS_DIR, (err, files) => {
    if (err) return;
    files.forEach(file => {
      const filePath = path.join(DOWNLOADS_DIR, file);
      fs.stat(filePath, (err, stat) => {
        if (err) return;
        if (now - stat.mtimeMs > maxAge) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}, 60 * 1000); // 每分钟检查一次

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/keys', require('./routes/apikeys'));
app.use('/api/gateway', require('./routes/gateway'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/redeem', require('./routes/redeem'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/skills', require('./routes/skills'));

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

// 公开公告列表
const noticeService = require('./services/noticeService');
app.get('/api/notices', async (req, res) => {
  try {
    const notices = await noticeService.getPublishedNotices();
    res.json({ success: true, data: notices });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 公开站点信息（首页标题/描述）
const settingsService = require('./services/settingsService');
app.get('/api/site-info', async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    res.json({ success: true, data: { name: settings.siteName, title: settings.siteTitle, description: settings.siteDescription, paymentUrl: settings.paymentUrl } });
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
  // 种子数据：管理员
  const admin = await db.users.findOne({ role: 'admin' });
  if (!admin) {
    const hash = await bcrypt.hash(config.admin.password, config.bcryptSaltRounds);
    await db.users.insert({ username: config.admin.username, email: config.admin.email, password: hash, role: 'admin', disabled: false, createdAt: Date.now(), updatedAt: Date.now() });
    console.log('[系统] 管理员账号已创建');
  }
  // 种子数据：默认套餐
  await tierService.seedIfEmpty();
  // 种子数据：默认服务
  const serviceCount = await db.services.count({});
  if (serviceCount === 0 && config.defaultServices) {
    for (const svc of config.defaultServices) {
      const exists = await db.services.findOne({ slug: svc.slug });
      if (!exists) {
        await db.services.insert({ ...svc, enabled: true, rateLimit: { perMinute: 30 }, createdAt: Date.now(), updatedAt: Date.now() });
      }
    }
    console.log(`[系统] 已导入 ${config.defaultServices.length} 个默认服务`);
  }
  // 清理限流
  setInterval(async () => {
    try { await db.rateLimit.remove({ timestamp: { $lt: Date.now() - 86400000 } }, { multi: true }); } catch {}
  }, 3600000);
}

// 支付回调（挂载在 /pay，nginx 不代理此路径，仅内网可访问）
const { paymentWebhook } = require('./routes/billing');
app.post('/pay', paymentWebhook);

init().then(() => {
  app.listen(config.port, () => {
    console.log('========================================');
    console.log(`  API Pool Gateway 已启动 → http://localhost:${config.port}`);
    console.log(`  管理员: ${config.admin.username}`);
    console.log('========================================');
  });
});

module.exports = app;
