const { db } = require('../database');

const DEFAULTS = {
  siteName: 'API Pool',
  siteDescription: '一站式API服务聚合平台。动态接入压缩、转换、识别等多种API，随时增删服务无需重启',
  siteTitle: 'API Pool 聚合网关',
  paymentUrl: '',
  paymentNotifyUrl: '',
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'my-pay-secret',
};

async function getSettings() {
  let doc = await db.settings.findOne({ _id: 'main' });
  if (!doc) {
    doc = { _id: 'main', ...DEFAULTS, updatedAt: Date.now() };
    await db.settings.insert(doc);
  }
  return { ...DEFAULTS, ...doc };
}

async function saveSettings(data) {
  const allowed = ['siteName', 'siteDescription', 'siteTitle', 'paymentUrl', 'paymentNotifyUrl', 'paymentWebhookSecret'];
  const update = {};
  for (const key of allowed) {
    if (data[key] !== undefined) update[key] = data[key];
  }
  update.updatedAt = Date.now();

  const existing = await db.settings.findOne({ _id: 'main' });
  if (existing) {
    await db.settings.update({ _id: 'main' }, { $set: update });
  } else {
    await db.settings.insert({ _id: 'main', ...DEFAULTS, ...update });
  }
  return getSettings();
}

module.exports = { getSettings, saveSettings };
