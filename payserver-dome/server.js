/**
 * 支付回调服务（独立运行）
 *
 * 职责：
 *   - 接收主项目推送的订单并存储
 *   - 接收支付平台回调，验证后通知主项目开通套餐
 *   - 不创建订单，只管理主项目推送过来的订单
 *
 * 用法：  node payserver-dome/server.js
 * 端口：  4000
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');

const PORT = 4000;
const MAIN_URL = process.env.MAIN_URL || 'http://localhost:3000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://root:root@www.musland.top:3012/pool-gateway?authSource=admin';
const SECRET = process.env.SECRET || 'my-pay-secret';
const EXPIRE_MINUTES = 15;

// ==================== MongoDB（自管集合） ====================

const orderSchema = new mongoose.Schema({
  orderId:    { type: String, required: true, unique: true },
  secretKey:  { type: String, required: true },
  userId:     { type: String, required: true },
  tierIndex:  { type: Number, required: true },
  durationDays: { type: Number, default: 30 },
  amount:     { type: Number, default: 0 },
  tierName:   { type: String, default: '' },
  status:     { type: String, default: 'pending' },
  expiresAt:  { type: Number, required: true },
  receivedAt: { type: Number, default: Date.now },
});
const Order = mongoose.model('PayOrder', orderSchema);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== 查询订单状态 ====================

app.get('/order/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: '订单不存在' });

    const expired = order.expiresAt < Date.now() && order.status === 'pending';
    res.json({
      success: true,
      orderId: order.orderId,
      status: expired ? 'expired' : order.status,
      amount: order.amount,
      tierName: order.tierName,
      days: order.durationDays,
      expiresAt: order.expiresAt,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== 支付回调（兼通知接收） ====================

app.post('/pay', async (req, res) => {
  try {
    const { orderId, secretKey } = req.body;
    if (!orderId) return res.status(400).json({ error: '缺少 orderId' });

    let order = await Order.findOne({ orderId });

    // --- 场景1：主项目通知（body 含 tierName / webhookUrl），只登记不标 paid ---
    if (req.body.tierName || req.body.webhookUrl) {
      if (!order) {
        order = await Order.create({
          orderId, secretKey,
          userId: req.body.userId || '',
          tierIndex: req.body.tierIndex || 0,
          durationDays: req.body.durationDays || 30,
          amount: req.body.amount || 0,
          tierName: req.body.tierName || '',
          status: 'pending',
          expiresAt: Date.now() + EXPIRE_MINUTES * 60 * 1000,
          receivedAt: Date.now(),
        });
      }
      console.log('[通知] %s', orderId);
      return res.json({ success: true, message: '订单已登记' });
    }

    if (!order) return res.status(404).json({ error: '订单不存在' });

    // --- 场景2：支付平台确认收款 ---
    if (order.status === 'paid') {
      return res.json({ success: true, message: '该订单已支付完成' });
    }

    if (order.expiresAt < Date.now()) {
      console.log('[回调] 订单已过期但仍确认支付 orderId=%s', orderId);
    }

    if (secretKey && order.secretKey !== secretKey) {
      return res.status(403).json({ error: '订单密钥不匹配' });
    }

    await Order.updateOne({ orderId }, { $set: { status: 'paid' } });

    try {
      const result = await axios.post(`${MAIN_URL}/pay`, { secret: SECRET, orderId, secretKey: order.secretKey }, { timeout: 10000 });
      console.log('[回调] 成功 orderId=%s -> %s', orderId, result.status);
    } catch (err) {
      console.error('[回调] 通知主项目失败:', err.response?.status, err.message);
    }

    res.json({ success: true, message: '支付成功', orderId });
  } catch (err) {
    console.error('[pay] 失败:', err.message);
    res.status(500).json({ error: '处理失败' });
  }
});

// ==================== 演示页面（静态） ====================

app.use('/demo', express.static(__dirname));

// ==================== 启动 ====================

mongoose.connect(MONGO_URI).then(() => {
  console.log('[MongoDB] 已连接');
  app.listen(PORT, () => {
    console.log('═════════════════════════════════════');
    console.log(`  支付服务 → http://localhost:${PORT}`);
    console.log(`  演示页面  http://localhost:${PORT}/demo`);
    console.log(`  注册订单  POST /pay`);
    console.log(`  查询订单  GET  /order/:orderId`);
    console.log(`  主项目    ${MAIN_URL}/pay`);
    console.log(`  订单过期  ${EXPIRE_MINUTES} 分钟`);
    console.log('═════════════════════════════════════');
  });
}).catch(err => {
  console.error('[MongoDB] 连接失败:', err.message);
  process.exit(1);
});
