// Copyright (c) 2026 jiucai.
/**
 * 兑换码服务模块
 */
const crypto = require('crypto');
const { db } = require('../database');
const tierService = require('./tierService');
const billingService = require('./billingService');
const { formatDateTime } = require('../utils/helpers');

const redeemService = {
  generateCode() {
    return 'POOL-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  },

  async generateCodes(options, adminId) {
    const { count = 1, type, tierIndex, maxUses = 1, expiresAt, batchName } = options;
    if (!type || !['tier', 'amount'].includes(type)) throw { status: 400, message: '请指定类型（tier 或 amount）' };
    if (type === 'tier' && tierIndex === undefined) throw { status: 400, message: '套餐类型必须指定 tierIndex' };
    const codes = [];
    for (let i = 0; i < count; i++) {
      let code;
      do { code = this.generateCode(); } while (await db.redeemCodes.findOne({ code }));
      const entry = { code, type, tierIndex: tierIndex !== undefined ? tierIndex : -1, batchName: batchName || '', maxUses: maxUses === -1 ? -1 : maxUses, usedCount: 0, expiresAt: expiresAt || null, disabled: false, createdBy: adminId, createdAt: Date.now() };
      await db.redeemCodes.insert(entry);
      codes.push(entry);
    }
    return { count: codes.length, codes: codes.map(c => ({ code: c.code, type: c.type })) };
  },

  async redeem(userId, codeStr) {
    const code = codeStr.toUpperCase().trim();
    const now = Date.now();
    const entry = await db.redeemCodes.findOne({ code });
    if (!entry) { await this.logRedeem(userId, null, code, false, '兑换码无效'); throw { status: 404, message: '兑换码无效' }; }
    if (entry.disabled) { await this.logRedeem(userId, entry._id, code, false, '兑换码已禁用'); throw { status: 400, message: '兑换码已禁用' }; }
    if (entry.expiresAt && now > entry.expiresAt) { await this.logRedeem(userId, entry._id, code, false, '兑换码已过期'); throw { status: 400, message: '兑换码已过期' }; }
    if (entry.maxUses !== -1 && entry.usedCount >= entry.maxUses) { await this.logRedeem(userId, entry._id, code, false, '已达使用上限'); throw { status: 400, message: '兑换码已达到使用次数上限' }; }
    const existingUsage = await db.redeemUsage.findOne({ codeId: entry._id, userId });
    if (existingUsage) { await this.logRedeem(userId, entry._id, code, false, '已使用过'); throw { status: 400, message: '您已使用过此兑换码' }; }

    if (entry.type === 'tier') {
      await billingService.changeUserTier(userId, entry.tierIndex);
    }

    const tiers = await tierService._getRawTiers();
    const tier = tiers[entry.tierIndex];

    // 生成消费记录（兑换码兑换也计入支付记录）—— 先写记录，失败了不影响已用状态
    await db.paymentTokens.insert({
      orderId: 'REDEEM-' + crypto.randomBytes(8).toString('hex'),
      secretKey: '',
      userId,
      tierIndex: entry.tierIndex,
      durationDays: 0,
      amount: tier?.monthlyFee || 0,
      tierName: tier?.name || '',
      status: 'paid',
      source: 'redeem',
      createdAt: Date.now(),
      expiresAt: Date.now(),
    });

    await db.redeemCodes.update({ _id: entry._id }, { $inc: { usedCount: 1 } });
    await this.logRedeem(userId, entry._id, entry.code, true, null);

    return { success: true, message: `兑换成功！已激活「${tier?.name || entry.tierIndex}」套餐`, type: 'tier', tierName: tier?.name };
  },

  async logRedeem(userId, codeId, code, success, failReason) {
    const user = await db.users.findOne({ _id: userId });
    await db.redeemUsage.insert({ codeId, code, userId, username: user ? user.username : 'unknown', success, failReason: failReason || null, redeemedAt: Date.now() });
  },

  async getCodes({ search, status, page = 1, pageSize = 50 }) {
    const query = {};
    if (search) query.$or = [{ code: new RegExp(search, 'i') }, { batchName: new RegExp(search, 'i') }];
    if (status === 'active') query.disabled = false;
    else if (status === 'disabled') query.disabled = true;
    const total = await db.redeemCodes.count(query);
    const codes = await db.redeemCodes.find(query).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize);
    const tiers = await tierService._getRawTiers();
    return {
      codes: codes.map(c => ({ id: c._id, code: c.code, type: c.type, tierIndex: c.tierIndex, tierName: c.type === 'tier' ? (tiers[c.tierIndex]?.name || '') : '', batchName: c.batchName || '', maxUses: c.maxUses, usedCount: c.usedCount, expiresAt: c.expiresAt ? formatDateTime(c.expiresAt) : null, disabled: c.disabled, createdAt: formatDateTime(c.createdAt) })),
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async getUsage({ search, page = 1, pageSize = 50 }) {
    const query = {};
    if (search) query.code = new RegExp(search, 'i');
    const total = await db.redeemUsage.count(query);
    const records = await db.redeemUsage.find(query).sort({ redeemedAt: -1 }).skip((page - 1) * pageSize).limit(pageSize);
    return {
      records: records.map(r => ({ id: r._id, code: r.code, username: r.username, success: r.success, failReason: r.failReason, redeemedAt: formatDateTime(r.redeemedAt) })),
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async deleteCodes(ids) { return { deleted: await db.redeemCodes.remove({ _id: { $in: ids } }, { multi: true }) }; },

  async setDisabled(id, disabled) {
    const code = await db.redeemCodes.findOne({ _id: id });
    if (!code) throw { status: 404, message: '兑换码不存在' };
    await db.redeemCodes.update({ _id: id }, { $set: { disabled } });
    return { message: disabled ? '已禁用' : '已启用' };
  },
};

module.exports = redeemService;
