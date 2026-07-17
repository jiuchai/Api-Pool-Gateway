// Copyright (c) 2026 jiucai.
/**
 * 计费服务模块（按月订阅制，支持多套餐同时订阅）
 */
const { db } = require('../database');
const tierService = require('./tierService');
const { getCurrentMonth, calculateCost, formatDateTime, formatDate, addDays } = require('../utils/helpers');

function getNow() { return Date.now(); }

const billingService = {
  async getUserTier(user) {
    const tiers = await tierService._getRawTiers();
    const idx = user.tierIndex;
    if (idx >= 0 && idx < tiers.length) return tiers[idx];
    // 无套餐时尝试找免费套餐兜底
    const freeTier = tiers.find(t => t.monthlyFee === 0);
    if (freeTier) return freeTier;
    return tiers[0] || null;
  },

  /** 获取用户当前生效的订阅套餐（取到期时间最晚的有效订阅，可免费叠加） */
  async getActiveSubscriptions(userId) {
    const now = getNow();
    const subs = await db.userSubscriptions.find({ userId, expiresAt: { $gte: now } }).sort({ expiresAt: -1 });
    const tiers = await tierService._getRawTiers();
    return subs.map(s => {
      const tier = tiers[s.tierIndex] || tiers[0];
      return {
        id: s._id,
        tierIndex: s.tierIndex,
        name: tier.name,
        ratePerSecond: tier.ratePerSecond,
        maxCallsPerDay: tier.maxCallsPerDay,
        monthlyFee: tier.monthlyFee,
        startedAt: formatDateTime(s.startedAt),
        expiresAt: formatDateTime(s.expiresAt),
        expiresDate: formatDate(s.expiresAt),
      };
    });
  },

  /** 计算合并后的当前限制：取所有有效订阅中最大的速率和日上限 */
  async getMergedTier(userId) {
    const tiers = await tierService._getRawTiers();
    const subs = await this.getActiveSubscriptions(userId);
    if (!subs.length) {
      const freeTier = tiers.find(t => t.monthlyFee === 0);
      if (freeTier) {
        return { name: freeTier.name, ratePerSecond: freeTier.ratePerSecond, maxCallsPerDay: freeTier.maxCallsPerDay, monthlyFee: freeTier.monthlyFee, subscriptions: [] };
      }
      return { name: '无套餐', ratePerSecond: 0, maxCallsPerDay: 0, monthlyFee: 0, subscriptions: [] };
    }
    const merged = {
      name: subs.length === 1 ? subs[0].name : '组合套餐',
      ratePerSecond: Math.max(...subs.map(s => s.ratePerSecond)),
      maxCallsPerDay: subs.some(s => s.maxCallsPerDay === -1) ? -1 : Math.max(...subs.map(s => s.maxCallsPerDay)),
      monthlyFee: subs.reduce((sum, s) => sum + s.monthlyFee, 0),
      subscriptions: subs,
    };
    return merged;
  },

  async getCurrentUsage(userId) {
    const month = getCurrentMonth();
    let record = await db.billingRecords.findOne({ userId, month });
    if (!record) {
      record = { userId, month, callCount: 0, tierIndex: 0, createdAt: Date.now() };
    }
    const mergedTier = await this.getMergedTier(userId);
    const user = await db.users.findOne({ _id: userId });
    let tierIndex = user?.tierIndex ?? -1;
    const tiers = await tierService._getRawTiers();
    // 如果没有免费套餐且用户无订阅，tierIndex 可能为 -1，兜底用免费套餐
    if (tierIndex < 0 || tierIndex >= tiers.length) {
      const freeTier = tiers.find(t => t.monthlyFee === 0);
      tierIndex = freeTier ? tiers.indexOf(freeTier) : 0;
    }
    const currentTier = tiers[tierIndex] || tiers[0] || { name: '免费版', ratePerSecond: 5, maxCallsPerDay: 100, monthlyFee: 0 };
    const freeIdx = tiers.findIndex(t => t.monthlyFee === 0);
    // 统计今日调用（按当前套餐 tierIndex 统计，与限流器一致）
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const todayCalls = await db.rateLimit.count({ userId, tierIndex, windowMs: 86400000, timestamp: { $gte: startOfDay.getTime() } });
    return {
      month: record.month, callCount: record.callCount, todayCalls,
      cost: calculateCost(record.callCount, mergedTier),
      tier: mergedTier,
      currentTier: { name: currentTier.name, ratePerSecond: currentTier.ratePerSecond, maxCallsPerDay: currentTier.maxCallsPerDay, monthlyFee: currentTier.monthlyFee },
      totalCost: mergedTier.monthlyFee,
      activeTierIndex: tierIndex,
      freeTierIndex: freeIdx >= 0 ? freeIdx : null,
      freeTier: freeIdx >= 0 ? { name: tiers[freeIdx].name, ratePerSecond: tiers[freeIdx].ratePerSecond, maxCallsPerDay: tiers[freeIdx].maxCallsPerDay } : null,
    };
  },

  /** 设置用户当前主用订阅（用于 billingRecords 与后台统计） */
  async setActiveSubscription(userId, subscriptionId) {
    const sub = await db.userSubscriptions.findOne({ _id: subscriptionId, userId });
    if (!sub) throw { status: 404, message: '订阅不存在' };
    if (sub.expiresAt < getNow()) throw { status: 400, message: '订阅已过期' };
    const tiers = await tierService._getRawTiers();
    const tier = tiers[sub.tierIndex] || tiers[0];
    await db.users.update({ _id: userId }, { $set: { tierIndex: sub.tierIndex, 'rateLimit.perSecond': tier.ratePerSecond, updatedAt: Date.now() } });
    await db.billingRecords.update({ userId, month: getCurrentMonth() }, { $set: { tierIndex: sub.tierIndex } }, { upsert: true });
    return { message: '已切换当前套餐', tierIndex: sub.tierIndex };
  },

  /** 直接切换到指定套餐索引（用于切回免费版等） */
  async setActiveTier(userId, tierIndex) {
    const tiers = await tierService._getRawTiers();
    if (tierIndex < 0 || tierIndex >= tiers.length) throw { status: 400, message: '无效的套餐档次' };
    const tier = tiers[tierIndex] || tiers[0];
    await db.users.update({ _id: userId }, { $set: { tierIndex, 'rateLimit.perSecond': tier.ratePerSecond, updatedAt: Date.now() } });
    await db.billingRecords.update({ userId, month: getCurrentMonth() }, { $set: { tierIndex } }, { upsert: true });
    return { message: '已切换当前套餐', tierIndex };
  },

  /** 购买/续订套餐（durationDays 默认 30 天） */
  async subscribeTier(userId, tierIndex, durationDays = 30) {
    const tiers = await tierService._getRawTiers();
    if (tierIndex === undefined || tierIndex < 0 || tierIndex >= tiers.length) throw { status: 400, message: '无效的套餐' };
    const user = await db.users.findOne({ _id: userId });
    if (!user) throw { status: 404, message: '用户不存在' };
    const now = new Date();
    // 如果同一套餐已有有效订阅，则续期（从原到期时间往后加）
    const existing = await db.userSubscriptions.findOne({ userId, tierIndex, expiresAt: { $gte: now.getTime() } });
    const baseTime = existing ? new Date(existing.expiresAt) : now;
    const expiresAt = addDays(baseTime, durationDays);
    const sub = {
      userId, tierIndex,
      startedAt: now.getTime(),
      expiresAt: expiresAt.getTime(),
      durationDays,
      createdAt: now.getTime(),
    };
    if (existing) {
      await db.userSubscriptions.update({ _id: existing._id }, { $set: { expiresAt: sub.expiresAt, durationDays: existing.durationDays + durationDays, updatedAt: now.getTime() } });
    } else {
      await db.userSubscriptions.insert(sub);
    }
    // 同步 billingRecords 当前月份记录
    await db.billingRecords.update({ userId, month: getCurrentMonth() }, { $set: { tierIndex } }, { upsert: true });
    return { message: '订阅成功', tierIndex, expiresAt: formatDateTime(expiresAt) };
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

  async changeUserTier(userId, tierIndex, durationDays = 30) {
    const tiers = await tierService._getRawTiers();
    if (tierIndex < 0 || tierIndex >= tiers.length) throw { status: 400, message: '无效的计费档次' };
    const user = await db.users.findOne({ _id: userId });
    if (!user) throw { status: 404, message: '用户不存在' };

    const tier = tiers[tierIndex];
    const now = new Date();

    // 如果同一套餐已有有效订阅，则续期；否则新建
    const existing = await db.userSubscriptions.findOne({ userId, tierIndex, expiresAt: { $gte: now.getTime() } });
    const baseTime = existing ? new Date(existing.expiresAt) : now;
    const expiresAt = addDays(baseTime, durationDays);

    if (existing) {
      await db.userSubscriptions.update({ _id: existing._id }, { $set: { expiresAt: expiresAt.getTime(), durationDays: existing.durationDays + durationDays, updatedAt: now.getTime() } });
    } else {
      await db.userSubscriptions.insert({
        userId, tierIndex,
        startedAt: now.getTime(),
        expiresAt: expiresAt.getTime(),
        durationDays,
        createdAt: now.getTime(),
      });
    }

    // 更新用户当前套餐及速率限制
    await db.users.update({ _id: userId }, { $set: { tierIndex, 'rateLimit.perSecond': tier.ratePerSecond, updatedAt: Date.now() } });
    await db.billingRecords.update({ userId, month: getCurrentMonth() }, { $set: { tierIndex } }, { upsert: true });

    return { message: '套餐已更新', tierIndex, tierName: tier.name, expiresAt: formatDateTime(expiresAt) };
  },

  /** 管理员主动为用户配置任意套餐及到期时间 */
  async adminSetSubscription(userId, tierIndex, opts = {}) {
    const tiers = await tierService._getRawTiers();
    if (tierIndex < 0 || tierIndex >= tiers.length) throw { status: 400, message: '无效的套餐' };
    const user = await db.users.findOne({ _id: userId });
    if (!user) throw { status: 404, message: '用户不存在' };

    const now = new Date();
    const { durationDays, expiresAt } = opts;

    let expireTime;
    if (expiresAt) {
      // 直接指定到期时间戳
      expireTime = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
      if (expireTime <= now.getTime()) throw { status: 400, message: '到期时间必须在当前时间之后' };
    } else {
      const days = durationDays || 30;
      expireTime = addDays(now, days).getTime();
    }

    const sub = {
      userId, tierIndex,
      startedAt: now.getTime(),
      expiresAt: expireTime,
      durationDays: Math.ceil((expireTime - now.getTime()) / 86400000),
      createdAt: now.getTime(),
      source: 'admin',
    };
    await db.userSubscriptions.insert(sub);

    // 更新用户当前套餐
    const tier = tiers[tierIndex];
    await db.users.update({ _id: userId }, { $set: { tierIndex, 'rateLimit.perSecond': tier.ratePerSecond, updatedAt: Date.now() } });
    await db.billingRecords.update({ userId, month: getCurrentMonth() }, { $set: { tierIndex } }, { upsert: true });

    return { message: '套餐已配置', tierIndex, tierName: tier.name, expiresAt: formatDateTime(expireTime) };
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
    const now = getNow();
    const result = [];
    for (const record of records) {
      const user = await db.users.findOne({ _id: record.userId });
      const tier = tiers[record.tierIndex] || tiers[0];
      // 获取用户订阅到期时间
      const subs = await db.userSubscriptions.find({ userId: record.userId, expiresAt: { $gte: now } }).sort({ expiresAt: -1 });
      const expiryDates = subs.map(s => ({
        tierIndex: s.tierIndex,
        tierName: tiers[s.tierIndex]?.name || '',
        expiresAt: s.expiresAt,
        expiresDate: formatDate(s.expiresAt),
      }));
      result.push({
        userId: record.userId, username: user ? user.username : '未知', disabled: user ? user.disabled : false,
        month: record.month, callCount: record.callCount, tierIndex: record.tierIndex,
        cost: tier.monthlyFee, tierName: tier.name,
        subscriptions: expiryDates,
      });
    }
    return { records: result, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },
};

module.exports = billingService;
