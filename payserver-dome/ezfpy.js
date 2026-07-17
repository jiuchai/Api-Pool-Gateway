/**
 * 易支付 (ezfpy.cn) 接入模块
 *
 * 支付流程：
 *   1. 调用 createPayParams() 生成签名参数
 *   2. POST 到 https://www.ezfpy.cn/submit.php（页面跳转）或 /mapi.php（API接口）
 *   3. 用户支付完成后，易支付回调 notify_url，用 verifySign() 验证签名
 *
 * 文档：https://www.ezfpy.cn/doc
 */

const crypto = require('crypto');

// ==================== 配置 ====================

const CONFIG = {
  pid: '1993',
  key: '4PPpdi4AEkMHQNWvpimBx77gSxLOuVaf',
  submitUrl: 'https://www.ezfpy.cn/submit.php',  // 页面跳转
  apiUrl: 'https://www.ezfpy.cn/mapi.php',       // API 接口
};

// ==================== 签名工具 ====================

/**
 * 生成 MD5 签名
 * 规则：参数按 key 字母排序 → 拼接 key=value → 追加密钥 → MD5
 * 与 PHP 的 http_build_query + urldecode 行为一致
 */
function generateSign(params, key) {
  const sorted = Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== undefined)
    .sort();
  // 手动拼接，避免 URLSearchParams 的编码差异
  const pairs = sorted.map(k => `${k}=${params[k]}`);
  const signStr = pairs.join('&') + key;
  return crypto.createHash('md5').update(signStr).digest('hex');
}

/**
 * 验证回调签名
 * @param {object} params - 回调 POST 参数（含 sign 和 sign_type）
 * @param {string} key    - 通信密钥
 * @returns {boolean}
 */
function verifySign(params, key) {
  if (!params.sign) return false;
  const { sign, sign_type, ...rest } = params;
  const expected = generateSign(rest, key || CONFIG.key);
  return expected === sign;
}

// ==================== 支付参数 ====================

/**
 * 创建页面跳转支付参数
 * @param {object} order
 * @param {string} order.out_trade_no - 商户订单号
 * @param {string} order.name         - 商品名称
 * @param {string} order.money        - 金额（元）
 * @param {string} order.notify_url   - 异步通知地址
 * @param {string} order.return_url   - 同步跳转地址
 * @param {string} [order.type]       - 支付方式：alipay / wxpay / qqpay（默认 alipay）
 * @returns {object} { url, params }  - POST 到 url 即可跳转支付
 */
function createPayParams(order) {
  const params = {
    pid: CONFIG.pid,
    type: order.type || 'alipay',
    out_trade_no: order.out_trade_no,
    notify_url: order.notify_url,
    return_url: order.return_url,
    name: order.name,
    money: String(order.money),
  };
  params.sign = generateSign(params, CONFIG.key);
  params.sign_type = 'MD5';
  return { url: CONFIG.submitUrl, params };
}

/**
 * 通过 API 接口获取支付链接
 * POST /mapi.php 返回 JSON，含 qrcode（二维码链接）或 payurl（跳转链接）
 */
async function createApiPay(order) {
  const params = {
    pid: CONFIG.pid,
    type: order.type || 'alipay',
    out_trade_no: order.out_trade_no,
    notify_url: order.notify_url,
    return_url: order.return_url,
    name: order.name,
    money: String(order.money),
  };
  params.sign = generateSign(params, CONFIG.key);
  params.sign_type = 'MD5';

  const axios = require('axios');
  const { data } = await axios.post(CONFIG.apiUrl, new URLSearchParams(params).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

// ==================== 导出 ====================

module.exports = {
  CONFIG,
  generateSign,
  verifySign,
  createPayParams,
  createApiPay,
};
