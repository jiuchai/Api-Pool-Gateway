const bcrypt = require('bcryptjs');
const { db } = require('../database');
const config = require('../config');
const { generateApiKey, getCurrentMonth, isValidEmail, isStrongPassword, formatDateTime } = require('../utils/helpers');
const { generateToken, auditLog } = require('../middleware/auth');
const { auditLog: writeAudit } = require('../middleware/logger');
const tierService = require('./tierService');

const userService = {
  async register({ username, email, password }) {
    if (!username || !email || !password) throw { status: 400, message: '必填字段缺失' };
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) throw { status: 400, message: '用户名3-30位字母数字下划线' };
    if (!isValidEmail(email)) throw { status: 400, message: '邮箱格式不正确' };
    if (!isStrongPassword(password)) throw { status: 400, message: '密码至少8位含大小写字母和数字' };
    if (await db.users.findOne({ username: username.toLowerCase() })) throw { status: 409, message: '用户名已存在' };
    if (await db.users.findOne({ email: email.toLowerCase() })) throw { status: 409, message: '邮箱已注册' };

    const hash = await bcrypt.hash(password, config.bcryptSaltRounds);
    // 如果有免费套餐，新用户自动分配；否则 tierIndex 为 -1（无套餐）
    const freeIdx = await tierService.getFreeTierIndex();
    const user = await db.users.insert({
      username: username.toLowerCase(), email: email.toLowerCase(), password: hash, role: 'user',
      tierIndex: freeIdx >= 0 ? freeIdx : -1,
      disabled: false, createdAt: Date.now(), updatedAt: Date.now(),
    });

    // 生成默认API Key
    await db.apiKeys.insert({ userId: user._id, key: generateApiKey(), name: '默认密钥', disabled: false, createdAt: Date.now() });

    await writeAudit('user_register', { userId: user._id, username: user.username });
    const token = generateToken(user);
    return { token, user: { id: user._id, username: user.username, email: user.email, role: user.role } };
  },

  async login({ username, password }) {
    const user = await db.users.findOne({ $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }] });
    if (!user || !await bcrypt.compare(password, user.password)) throw { status: 401, message: '用户名或密码错误' };
    if (user.disabled) throw { status: 403, message: '账号已禁用' };
    await db.users.update({ _id: user._id }, { $set: { lastLogin: Date.now() } });
    await writeAudit('user_login', { userId: user._id });
    const token = generateToken(user);
    return { token, user: { id: user._id, username: user.username, email: user.email, role: user.role, tierIndex: user.tierIndex || 0 } };
  },

  async getProfile(userId) {
    const user = await db.users.findOne({ _id: userId });
    if (!user) throw { status: 404, message: '用户不存在' };
    const keys = await db.apiKeys.find({ userId });
    return {
      id: user._id, username: user.username, email: user.email, role: user.role, tierIndex: user.tierIndex || 0, disabled: user.disabled,
      apiKeys: keys.map(k => ({ id: k._id, name: k.name, key: k.key, disabled: k.disabled, createdAt: formatDateTime(k.createdAt) })),
      createdAt: formatDateTime(user.createdAt),
    };
  },

  async getApiKeys(userId) {
    const keys = await db.apiKeys.find({ userId });
    return keys.map(k => ({ id: k._id, name: k.name, key: k.key, disabled: k.disabled, services: k.services || [], createdAt: formatDateTime(k.createdAt) }));
  },

  async createApiKey(userId, name = '') {
    const key = generateApiKey();
    const rec = await db.apiKeys.insert({ userId, key, name: name || '密钥', disabled: false, createdAt: Date.now() });
    return { id: rec._id, key, name: rec.name };
  },

  async disableApiKey(userId, keyId) {
    const rec = await db.apiKeys.findOne({ _id: keyId, userId });
    if (!rec) throw { status: 404, message: 'API Key不存在' };
    await db.apiKeys.update({ _id: keyId }, { $set: { disabled: true } });
    return { message: '已禁用' };
  },

  async enableApiKey(userId, keyId) {
    const rec = await db.apiKeys.findOne({ _id: keyId, userId });
    if (!rec) throw { status: 404, message: 'API Key不存在' };
    await db.apiKeys.update({ _id: keyId }, { $set: { disabled: false } });
    return { message: '已启用' };
  },

  async regenerateApiKey(userId, keyId) {
    const rec = await db.apiKeys.findOne({ _id: keyId, userId });
    if (!rec) throw { status: 404, message: 'API Key不存在' };
    const newKey = generateApiKey();
    await db.apiKeys.update({ _id: keyId }, { $set: { key: newKey, createdAt: Date.now() } });
    return { id: keyId, key: newKey, name: rec.name };
  },

  async deleteApiKey(userId, keyId) {
    const rec = await db.apiKeys.findOne({ _id: keyId, userId });
    if (!rec) throw { status: 404, message: 'API Key不存在' };
    await db.apiKeys.remove({ _id: keyId });
    return { message: '已删除' };
  },

  async setKeyServices(userId, keyId, services) {
    const rec = await db.apiKeys.findOne({ _id: keyId, userId });
    if (!rec) throw { status: 404, message: 'API Key不存在' };
    await db.apiKeys.update({ _id: keyId }, { $set: { services: services || [] } });
    return { message: '已更新', services: services || [] };
  },

  async changePassword(userId, oldPw, newPw) {
    const user = await db.users.findOne({ _id: userId });
    if (!await bcrypt.compare(oldPw, user.password)) throw { status: 400, message: '原密码错误' };
    if (!isStrongPassword(newPw)) throw { status: 400, message: '新密码不符合要求' };
    await db.users.update({ _id: userId }, { $set: { password: await bcrypt.hash(newPw, config.bcryptSaltRounds) } });
    return { message: '密码已修改' };
  },
};

module.exports = userService;
