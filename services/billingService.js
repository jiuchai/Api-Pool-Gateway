/**
 * 计费服务模块（按月订阅制，无按次计费）
 */
const { db } = require('../database');
const tierService = require('./tierService');
const { getCurrentMonth, calculateCost, formatDateTime } = require('../utils/helpers');

const billingService = {
  async getUserTier(user) {
    const tiers = await tierService._getRawTiers();
    return tiers[user.tierIndex] || tiers[0];
  },

  async getCurrentUsage(userId) {
    const month = getCurrentMonth();
    let record = await db.billingRecords.findOne({ userId, month });
    const tiers = await tierService._getRawTiers();
    const defaultTierIndex = 0;
    if (!record) {
      record = {
        userId, month, callCount: 0, tierIndex: defaultTierIndex, createdAt: Date.now(),
      };
    }
    const user = await db.users.findOne({ _id: userId });
    const tier = tiers[record.tierIndex] || tiers[0];
    return {
      month: record.month, callCount: record.callCount,
      cost: calculateCost(record.callCount, tier),
      tier: { name: tier.name, monthlyFee: tier.monthlyFee, maxCalls: tier.maxCalls },
      totalCost: tier.monthlyFee,
    };
  },

  async getBills(userId, page = 1, pageSize = 12) {
    const skip = (page - 1) * pageSize;
    const records = await db.bills.find({ userId }).sort({ month: -1 }).skip(skip).limit(pageSize);
    const total = await db.bills.count({ userId });
    const bills = records.map(r => ({
      id: r._id, month: r.month, callCount: r.callCount,
      monthlyFee: r.monthlyFee, totalCost: r.totalCost,
      status: r.status || 'unpaid', createdAt: formatDateTime(r.createdAt),
    }));
    return { bills, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  async generateMonthlyBill(month) {
    const monthStr = month || getCurrentMonth();
    const records = await db.billingRecords.find({ month: monthStr });
    const tiers = await tierService._getRawTiers();
    const bills = [];
    for (const record of records) {
      const user = await db.users.findOne({ _id: record.userId });
      if (!user) continue;
      const tier = tiers[record.tierIndex] || tiers[0];
      const totalCost = tier.monthlyFee;
      const existing = await db.bills.findOne({ userId: record.userId, month: monthStr });
      if (existing) {
        await db.bills.update({ _id: existing._id }, { $set: { callCount: record.callCount, monthlyFee: tier.monthlyFee, totalCost, updatedAt: Date.now() } });
        bills.push({ ...existing, callCount: record.callCount, totalCost });
      } else {
        const bill = await db.bills.insert({ userId: record.userId, month: monthStr, callCount: record.callCount, monthlyFee: tier.monthlyFee, totalCost, status: 'unpaid', createdAt: Date.now(), updatedAt: Date.now() });
        bills.push(bill);
      }
    }
    return bills;
  },

  async changeUserTier(userId, tierIndex) {
    const tiers = await tierService._getRawTiers();
    if (tierIndex < 0 || tierIndex >= tiers.length) throw { status: 400, message: '无效的计费档次' };
    const user = await db.users.findOne({ _id: userId });
    if (!user) throw { status: 404, message: '用户不存在' };
    await db.users.update({ _id: userId }, { $set: { tierIndex, updatedAt: Date.now() } });
    await db.billingRecords.update({ userId, month: getCurrentMonth() }, { $set: { tierIndex } }, { upsert: true });
    return { message: '套餐已更新', tierIndex };
  },

  async getBillingConfig() {
    return await tierService.getTiers();
  },

  async getSystemBillingStats(month) {
    const m = month || getCurrentMonth();
    const records = await db.billingRecords.find({ month: m });
    const tiers = await tierService._getRawTiers();
    let totalCalls = 0;
    let totalRevenue = 0;
    let activeUsers = 0;
    for (const record of records) {
      const user = await db.users.findOne({ _id: record.userId });
      if (user && !user.disabled) {
        activeUsers++;
        totalCalls += record.callCount;
        const tier = tiers[record.tierIndex] || tiers[0];
        totalRevenue += tier.monthlyFee;
      }
    }
    return { month: m, totalCalls, totalRevenue, activeUsers };
  },

  async getAllUsersBilling(month, page = 1, pageSize = 20) {
    const monthStr = month || getCurrentMonth();
    const skip = (page - 1) * pageSize;
    const records = await db.billingRecords.find({ month: monthStr }).sort({ callCount: -1 }).skip(skip).limit(pageSize);
    const total = await db.billingRecords.count({ month: monthStr });
    const tiers = await tierService._getRawTiers();
    const result = [];
    for (const record of records) {
      const user = await db.users.findOne({ _id: record.userId });
      const tier = tiers[record.tierIndex] || tiers[0];
      result.push({ userId: record.userId, username: user ? user.username : '未知', disabled: user ? user.disabled : false, month: record.month, callCount: record.callCount, cost: tier.monthlyFee, tierName: tier.name });
    }
    return { records: result, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },
};

module.exports = billingService;
