/**
 * 套餐服务 - 从数据库读写套餐配置
 */
const { db } = require('../database');
const config = require('../config');

const tierService = {
  /** 获取所有套餐（按顺序） */
  async getTiers() {
    const tiers = await db.tiers.find({}).sort({ order: 1 });
    return tiers.map(t => ({
      id: t._id,
      name: t.name,
      ratePerSecond: t.ratePerSecond,
      maxCallsPerDay: t.maxCallsPerDay,
      monthlyFee: t.monthlyFee,
      order: t.order,
      description: t.description || '',
      features: t.features || [],
      onSale: t.onSale !== undefined ? t.onSale : true,
    }));
  },

  /** 获取原始数据（含 _id）供后端使用 */
  async _getRawTiers() {
    return await db.tiers.find({}).sort({ order: 1 });
  },

  /** 按索引获取单个套餐 */
  async getTierByIndex(index) {
    const tiers = await this._getRawTiers();
    return tiers[index] || tiers[0] || null;
  },

  /** 获取免费套餐（monthlyFee === 0 的第一个），没有则返回 null */
  async getFreeTier() {
    const tiers = await this._getRawTiers();
    return tiers.find(t => t.monthlyFee === 0) || null;
  },

  /** 获取免费套餐的索引，没有则返回 -1 */
  async getFreeTierIndex() {
    const tiers = await this._getRawTiers();
    const idx = tiers.findIndex(t => t.monthlyFee === 0);
    return idx;
  },

  /** 获取套餐数量 */
  async getTierCount() {
    return await db.tiers.count({});
  },

  /** 添加套餐 */
  async addTier(data) {
    const count = await db.tiers.count({});
    const tier = await db.tiers.insert({
      name: data.name || '新套餐',
      ratePerSecond: Number(data.ratePerSecond) || 10,
      maxCallsPerDay: data.maxCallsPerDay !== undefined ? Number(data.maxCallsPerDay) : -1,
      monthlyFee: Number(data.monthlyFee) || 0,
      description: data.description || '',
      features: data.features || [],
      onSale: data.onSale !== undefined ? data.onSale : true,
      order: count,
      createdAt: Date.now(),
    });
    return tier;
  },

  /** 更新套餐 */
  async updateTier(id, data) {
    const tier = await db.tiers.findOne({ _id: id });
    if (!tier) throw { status: 404, message: '套餐不存在' };
    await db.tiers.update({ _id: id }, { $set: {
      name: data.name !== undefined ? data.name : tier.name,
      ratePerSecond: data.ratePerSecond !== undefined ? Number(data.ratePerSecond) : tier.ratePerSecond,
      maxCallsPerDay: data.maxCallsPerDay !== undefined ? Number(data.maxCallsPerDay) : tier.maxCallsPerDay,
      monthlyFee: data.monthlyFee !== undefined ? Number(data.monthlyFee) : tier.monthlyFee,
      description: data.description !== undefined ? data.description : tier.description,
      features: data.features !== undefined ? data.features : tier.features,
      onSale: data.onSale !== undefined ? data.onSale : tier.onSale,
      updatedAt: Date.now(),
    } });
    return await db.tiers.findOne({ _id: id });
  },

  /** 删除套餐 */
  async deleteTier(id) {
    const tier = await db.tiers.findOne({ _id: id });
    if (!tier) throw { status: 404, message: '套餐不存在' };
    const count = await db.tiers.count({});
    if (count <= 1) throw { status: 400, message: '至少保留一个套餐' };
    await db.tiers.remove({ _id: id });
    // 重新排序
    const remaining = await db.tiers.find({}).sort({ order: 1 });
    for (let i = 0; i < remaining.length; i++) {
      await db.tiers.update({ _id: remaining[i]._id }, { $set: { order: i } });
    }
    return { message: '已删除' };
  },

  /** 批量保存（替换全部套餐） */
  async saveAll(tiersData) {
    if (!tiersData || tiersData.length === 0) throw { status: 400, message: '至少需要一个套餐' };
    await db.tiers.remove({}, { multi: true });
    for (let i = 0; i < tiersData.length; i++) {
      const t = tiersData[i];
      await db.tiers.insert({
        name: t.name || '套餐',
        ratePerSecond: Number(t.ratePerSecond) || 10,
        maxCallsPerDay: t.maxCallsPerDay !== undefined ? Number(t.maxCallsPerDay) : -1,
        monthlyFee: Number(t.monthlyFee) || 0,
        description: t.description || '',
        features: t.features || [],
        onSale: t.onSale !== undefined ? t.onSale : true,
        order: i,
        createdAt: Date.now(),
      });
    }
    return await this.getTiers();
  },

  /** 种子数据：首次运行时导入默认套餐 */
  async seedIfEmpty() {
    const count = await db.tiers.count({});
    if (count === 0) {
      const defaults = config.billing.tiers;
      for (let i = 0; i < defaults.length; i++) {
        await db.tiers.insert({
          name: defaults[i].name,
          ratePerSecond: defaults[i].ratePerSecond,
          maxCallsPerDay: defaults[i].maxCallsPerDay,
          monthlyFee: defaults[i].monthlyFee,
          description: defaults[i].description || '',
          features: defaults[i].features || [],
          onSale: defaults[i].onSale !== undefined ? defaults[i].onSale : true,
          order: i,
          createdAt: Date.now(),
        });
      }
      console.log('[系统] 默认套餐已导入');
    }
  },
};

module.exports = tierService;
