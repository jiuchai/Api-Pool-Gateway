/**
 * 图片验证码模块
 * 使用 svg-captcha 生成 SVG 格式验证码，存储在内存中，5分钟过期
 */
const svgCaptcha = require('svg-captcha');

// 内存存储：{ captchaId: { text, expires } }
const captchaStore = new Map();
const CAPTCHA_TTL = 5 * 60 * 1000; // 5 分钟

// 定期清理过期验证码
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of captchaStore) {
    if (data.expires < now) captchaStore.delete(id);
  }
}, 60 * 1000);

module.exports = {
  /** 生成验证码，返回 { id, svg } */
  generate() {
    const captcha = svgCaptcha.create({
      size: 4,           // 4 位字符
      ignoreChars: '0o1ilI', // 排除易混淆字符
      noise: 3,           // 干扰线数量
      color: true,        // 彩色
      background: '#f8fafc',
      width: 120,
      height: 44,
      fontSize: 42,
    });

    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    captchaStore.set(id, {
      text: captcha.text.toLowerCase(),
      expires: Date.now() + CAPTCHA_TTL,
    });

    return { id, svg: captcha.data };
  },

  /** 校验验证码，成功返回 true 并删除记录 */
  verify(id, text) {
    if (!id || !text) return false;
    const data = captchaStore.get(id);
    if (!data) return false;
    captchaStore.delete(id); // 一次性使用
    if (data.expires < Date.now()) return false;
    return data.text === text.toLowerCase().trim();
  },
};
