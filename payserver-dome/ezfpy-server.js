/**
 * 易支付 (ezfpy.cn) 回调服务 — 完整版
 *
 * 配置（只需填两个地址）：
 *   PAYMENT_URL  = 本服务地址/pay-page （配置到站点设置的"支付页面地址"）
 *   NOTIFY_URL   = 本服务地址/notify    （配置到站点设置的"支付通知地址"）
 *
 * 流程：
 *   1. 主项目创建订单 → POST /pay 推送过来登记
 *   2. 用户被重定向到 GET /pay-page?orderId=xxx → 自动 POST 跳转易支付收银台
 *   3. 用户支付完成 → 易支付回调 POST /notify → 验证签名 → 通知主项目开通套餐
 *
 * 用法：  node payserver-dome/ezfpy-server.js
 * 端口：  4001
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const ezfpy = require('./ezfpy');

const PORT = process.env.EZFPAY_PORT || 4001;
const MAIN_URL = process.env.MAIN_URL || 'http://localhost:3000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://root:root@www.musland.top:3012/pool-gateway?authSource=admin';
const SECRET = process.env.SECRET || 'my-pay-secret';
const EXPIRE_MINUTES = 15;

// ==================== MongoDB ====================

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
const Order = mongoose.model('EzPayOrder', orderSchema);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== 订单登记（主项目推送） ====================

app.post('/pay', async (req, res) => {
  try {
    const { orderId, secretKey, userId, tierIndex, durationDays, amount, tierName, expiresAt, webhookUrl } = req.body;

    if (!orderId) return res.status(400).json({ error: '缺少 orderId' });

    let order = await Order.findOne({ orderId });

    // 登记新订单
    if (!order) {
      // 金额单位转换：主项目传的是元，易支付也收元
      order = await Order.create({
        orderId, secretKey,
        userId: userId || '',
        tierIndex: tierIndex || 0,
        durationDays: durationDays || 30,
        amount: amount || 0,
        tierName: tierName || '',
        status: 'pending',
        expiresAt: expiresAt || Date.now() + EXPIRE_MINUTES * 60 * 1000,
        receivedAt: Date.now(),
      });
    }

    console.log('[登记] %s tier=%s ¥%s', orderId, tierName, amount);
    res.json({ success: true, message: '订单已登记' });
  } catch (err) {
    if (err.code === 11000) return res.json({ success: true, message: '订单已存在' });
    console.error('[登记] 失败:', err.message);
    res.status(500).json({ error: '登记失败' });
  }
});

// ==================== 支付页面（自动跳转易支付） ====================

app.get('/pay-page', async (req, res) => {
  try {
    const { orderId } = req.query;
    if (!orderId) return res.status(400).send('缺少订单号');

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).send('订单不存在');
    if (order.status === 'paid') return res.send('该订单已支付完成');
    if (order.expiresAt < Date.now()) return res.send('订单已过期');

    const base = `${req.protocol}://${req.get('host')}`;
    const pay = ezfpy.createPayParams({
      out_trade_no: orderId,
      name: order.tierName || '套餐订阅',
      money: Number(order.amount).toFixed(2),
      notify_url: `${base}/notify`,
      return_url: `${base}/pay-page?orderId=${orderId}`,
    });

    // 自动 POST 跳转易支付收银台
    res.send(`
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"><title>跳转支付...</title></head>
      <body style="text-align:center;padding-top:80px;font-family:sans-serif">
        <p>正在跳转到支付页面...</p>
        <form id="f" action="${pay.url}" method="post">
          ${Object.entries(pay.params).map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`).join('\n')}
        </form>
        <script>document.getElementById('f').submit();</script>
      </body></html>`);
  } catch (err) {
    console.error('[支付页] 错误:', err.message);
    res.status(500).send('服务器错误');
  }
});

// ==================== 易支付异步回调 ====================

app.post('/notify', async (req, res) => {
  try {
    console.log('[回调] 收到通知:', JSON.stringify(req.body));

    // 验证签名
    if (!ezfpy.verifySign(req.body)) {
      console.error('[回调] 签名验证失败');
      return res.send('fail');
    }

    const { out_trade_no, trade_status } = req.body;
    if (!out_trade_no || trade_status !== 'TRADE_SUCCESS') {
      return res.send('fail');
    }

    const order = await Order.findOne({ orderId: out_trade_no });
    if (!order) {
      console.error('[回调] 订单不存在:', out_trade_no);
      return res.send('fail');
    }
    if (order.status === 'paid') return res.send('success');

    // 标记已支付
    await Order.updateOne({ orderId: out_trade_no }, { $set: { status: 'paid' } });
    console.log('[回调] 支付成功 orderId=%s', out_trade_no);

    // 通知主项目开通套餐
    try {
      const result = await axios.post(`${MAIN_URL}/pay`, {
        secret: SECRET,
        orderId: order.orderId,
        secretKey: order.secretKey,
      }, { timeout: 10000 });
      console.log('[回调] 通知主项目成功 → %s', result.status);
    } catch (err) {
      console.error('[回调] 通知主项目失败:', err.response?.status, err.message);
    }

    res.send('success');
  } catch (err) {
    console.error('[回调] 处理失败:', err.message);
    res.send('fail');
  }
});

// ==================== 查询订单 ====================

app.get('/order/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({
      success: true,
      orderId: order.orderId,
      status: order.status,
      amount: order.amount,
      tierName: order.tierName,
      days: order.durationDays,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== 启动 ====================

mongoose.connect(MONGO_URI).then(() => {
  console.log('[MongoDB] 已连接');
  app.listen(PORT, () => {
    const base = `http://localhost:${PORT}`;
    console.log('═════════════════════════════════════');
    console.log(`  易支付服务 → ${base}`);
    console.log(`  支付页面    ${base}/pay-page`);
    console.log(`  异步通知    ${base}/notify`);
    console.log(`  订单登记    POST ${base}/pay`);
    console.log(`  主项目      ${MAIN_URL}/pay`);
    console.log(`  订单过期    ${EXPIRE_MINUTES} 分钟`);
    console.log('═════════════════════════════════════');
    console.log('');
    console.log('  📋 管理后台配置：');
    console.log(`     支付页面地址  ${base}/pay-page`);
    console.log(`     支付通知地址  ${base}/pay`);
    console.log(`     支付回调密钥  ${SECRET}`);
  });
}).catch(err => {
  console.error('[MongoDB] 连接失败:', err.message);
  process.exit(1);
});
