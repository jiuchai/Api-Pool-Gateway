// Copyright (c) 2026 jiucai.
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/pool-gateway';

let connected = false;

async function connect() {
  if (connected) return;
  await mongoose.connect(MONGO_URI);
  connected = true;
  console.log('[MongoDB] 已连接:', MONGO_URI);
}

// ============ Schema Definitions ============

const userSchema = new mongoose.Schema({
  username:       { type: String, required: true },
  email:          { type: String, required: true },
  password:       { type: String, required: true },
  role:           { type: String, default: 'user' },
  tierIndex:      { type: Number, default: -1 },
  disabled:       { type: Boolean, default: false },
  rateLimit:      {
    perSecond:    { type: Number, default: 10 },
  },
  lastLogin:      { type: Number },
  createdAt:      { type: Number, default: Date.now },
  updatedAt:      { type: Number, default: Date.now },
});

const apiKeySchema = new mongoose.Schema({
  userId:         { type: String, required: true },
  key:            { type: String, required: true },
  name:           { type: String, default: '密钥' },
  disabled:       { type: Boolean, default: false },
  services:       { type: [String], default: [] },
  createdAt:      { type: Number, default: Date.now },
});

const serviceSchema = new mongoose.Schema({
  slug:           { type: String, required: true },
  name:           { type: String, required: true },
  description:    { type: String, default: '' },
  category:       { type: String, default: '' },
  targetUrl:      { type: String, default: '' },
  method:         { type: String, default: 'POST' },
  forwardType:    { type: String, default: 'json' },
  forwardMode:    { type: String, default: 'template' },
  customScript:   { type: String, default: '' },
  bodyTemplate:   { type: String, default: '' },
  forwardHeaders: { type: mongoose.Schema.Types.Mixed, default: {} },
  params:         { type: [mongoose.Schema.Types.Mixed], default: [] },
  inputExample:   { type: String, default: '' },
  outputExample:  { type: String, default: '' },
  enabled:        { type: Boolean, default: true },
  rateLimit:      {
    perMinute:    { type: Number, default: 30 },
  },
  welcomeUrl:     { type: String, default: '' },
  docs:           { type: String, default: '' },
  createdAt:      { type: Number, default: Date.now },
  updatedAt:      { type: Number, default: Date.now },
});

const tierSchema = new mongoose.Schema({
  name:           { type: String, default: '新套餐' },
  ratePerSecond:  { type: Number, default: 10 },
  maxCallsPerDay: { type: Number, default: -1 },
  monthlyFee:     { type: Number, default: 0 },
  order:          { type: Number, default: 0 },
  description:    { type: String, default: '' },
  features:       { type: [String], default: [] },
  onSale:         { type: Boolean, default: true },
  createdAt:      { type: Number, default: Date.now },
  updatedAt:      { type: Number },
});

const callLogSchema = new mongoose.Schema({
  userId:         { type: String },
  username:       { type: String },
  email:          { type: String },
  apiKeyName:     { type: String },
  serviceSlug:    { type: String },
  serviceName:    { type: String },
  method:         { type: String },
  path:           { type: String },
  targetUrl:      { type: String },
  statusCode:     { type: Number },
  responseTime:   { type: Number },
  ip:             { type: String },
  requestBody:    { type: String },
  responseBody:   { type: String },
  userRequest:    { type: mongoose.Schema.Types.Mixed },
  userResponse:   { type: String },
  upstreamRequest:  { type: mongoose.Schema.Types.Mixed },
  upstreamResponse: { type: mongoose.Schema.Types.Mixed },
  timestamp:      { type: Number, default: Date.now },
});

const rateLimitSchema = new mongoose.Schema({
  userId:         { type: String },
  tierIndex:      { type: Number },
  windowMs:       { type: Number },
  timestamp:      { type: Number, default: Date.now },
});

const auditLogSchema = new mongoose.Schema({
  type:           { type: String },
  details:        { type: mongoose.Schema.Types.Mixed },
  timestamp:      { type: Number, default: Date.now },
});

const billingRecordSchema = new mongoose.Schema({
  userId:         { type: String, required: true },
  month:          { type: String, required: true },
  callCount:      { type: Number, default: 0 },
  tierIndex:      { type: Number, default: 0 },
  createdAt:      { type: Number, default: Date.now },
});

const billSchema = new mongoose.Schema({
  userId:         { type: String, required: true },
  month:          { type: String, required: true },
  callCount:      { type: Number, default: 0 },
  monthlyFee:     { type: Number, default: 0 },
  totalCost:      { type: Number, default: 0 },
  status:         { type: String, default: 'unpaid' },
  createdAt:      { type: Number, default: Date.now },
  updatedAt:      { type: Number, default: Date.now },
});

const redeemCodeSchema = new mongoose.Schema({
  code:           { type: String, required: true },
  type:           { type: String },
  tierIndex:      { type: Number },
  batchName:      { type: String, default: '' },
  maxUses:        { type: Number, default: 1 },
  usedCount:      { type: Number, default: 0 },
  expiresAt:      { type: Number, default: null },
  disabled:       { type: Boolean, default: false },
  createdBy:      { type: String },
  createdAt:      { type: Number, default: Date.now },
});

const redeemUsageSchema = new mongoose.Schema({
  codeId:         { type: String },
  code:           { type: String },
  userId:         { type: String },
  username:       { type: String },
  success:        { type: Boolean },
  failReason:     { type: String, default: null },
  redeemedAt:     { type: Number, default: Date.now },
});

const noticeSchema = new mongoose.Schema({
  title:          { type: String, required: true },
  content:        { type: String, required: true },
  published:      { type: Boolean, default: false },
  pinned:         { type: Boolean, default: false },
  createdAt:      { type: Number, default: Date.now },
  updatedAt:      { type: Number, default: Date.now },
});

const userSubscriptionSchema = new mongoose.Schema({
  userId:         { type: String, required: true },
  tierIndex:      { type: Number, required: true },
  startedAt:      { type: Number, default: Date.now },
  expiresAt:      { type: Number },
  durationDays:   { type: Number, default: 30 },
  createdAt:      { type: Number, default: Date.now },
  updatedAt:      { type: Number },
});

const settingsSchema = new mongoose.Schema({
  _id:            { type: String, default: 'main' },
  siteName:       { type: String, default: 'API Pool' },
  siteDescription:{ type: String, default: '一站式API服务聚合平台' },
  siteTitle:      { type: String, default: 'API Pool 聚合网关' },
  paymentUrl:     { type: String, default: '' },
  paymentNotifyUrl: { type: String, default: '' },
  paymentWebhookSecret: { type: String, default: '' },
  redeemPurchaseUrl: { type: String, default: '' },
  updatedAt:      { type: Number, default: Date.now },
});

const paymentTokenSchema = new mongoose.Schema({
  orderId:       { type: String, required: true, unique: true },
  secretKey:     { type: String, default: '' },
  userId:        { type: String, required: true },
  tierIndex:     { type: Number, required: true },
  durationDays:  { type: Number, default: 30 },
  amount:        { type: Number, default: 0 },
  tierName:      { type: String, default: '' },
  status:        { type: String, default: 'pending' },
  source:        { type: String, default: 'payment' },
  expiresAt:     { type: Number, required: true },
  createdAt:     { type: Number, default: Date.now },
});

// ============ Model Definitions ============

const User = mongoose.model('User', userSchema);
const ApiKey = mongoose.model('ApiKey', apiKeySchema);
const Service = mongoose.model('Service', serviceSchema);
const Tier = mongoose.model('Tier', tierSchema);
const CallLog = mongoose.model('CallLog', callLogSchema);
const RateLimit = mongoose.model('RateLimit', rateLimitSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const BillingRecord = mongoose.model('BillingRecord', billingRecordSchema);
const Bill = mongoose.model('Bill', billSchema);
const RedeemCode = mongoose.model('RedeemCode', redeemCodeSchema);
const RedeemUsage = mongoose.model('RedeemUsage', redeemUsageSchema);
const Notice = mongoose.model('Notice', noticeSchema);
const UserSubscription = mongoose.model('UserSubscription', userSubscriptionSchema);
const Setting = mongoose.model('Setting', settingsSchema);
const PaymentToken = mongoose.model('PaymentToken', paymentTokenSchema);

// ============ Nedb-compatible Wrapper ============

/**
 * Wraps a Mongoose model to expose a nedb-promises compatible API.
 * All find/findOne queries automatically use .lean() to return plain objects.
 */
function wrapModel(Model) {
  return {
    /**
     * Find documents - compatible with nedb find()
     * Returns a chainable query-like object with .sort(), .skip(), .limit()
     */
    find(query = {}) {
      const cursor = Model.find(query).lean();
      const chain = {
        _cursor: cursor,
        sort(sortObj) {
          this._cursor = this._cursor.sort(sortObj);
          return this;
        },
        skip(n) {
          this._cursor = this._cursor.skip(n);
          return this;
        },
        limit(n) {
          this._cursor = this._cursor.limit(n);
          return this;
        },
        then(resolve, reject) {
          return this._cursor.then(resolve, reject);
        },
        catch(reject) {
          return this._cursor.catch(reject);
        },
        exec() {
          return this._cursor.exec();
        },
      };

      // Make chain thenable
      return chain;
    },

    /**
     * Find one document - compatible with nedb findOne()
     */
    findOne(query = {}) {
      return Model.findOne(query).lean();
    },

    /**
     * Count documents - compatible with nedb count()
     */
    count(query = {}) {
      return Model.countDocuments(query);
    },

    /**
     * Insert document(s) - compatible with nedb insert()
     * Returns the document as a plain object (like nedb)
     */
    insert(doc) {
      return Model.create(doc).then(d => {
        if (Array.isArray(d)) return d.map(item => item.toObject());
        return d.toObject();
      });
    },

    /**
     * Update document(s) - compatible with nedb update()
     * Supports $set, $inc, and {multi: true} for deleteMany-style behavior
     * with {upsert: true}
     */
    update(query, update, options = {}) {
      const hasMulti = options.multi === true;

      // nedb update() with {multi: true} + no upsert → updateMany
      // nedb update() without multi + no upsert → updateOne
      // nedb update() with {upsert: true} → updateOne with upsert

      if (hasMulti) {
        return Model.updateMany(query, update, { upsert: !!options.upsert }).then(r => r.modifiedCount || r.upsertedCount || r.matchedCount);
      } else {
        return Model.updateOne(query, update, { upsert: !!options.upsert }).then(r => {
          // nedb returns the number of docs updated (0 or 1)
          return r.modifiedCount || r.upsertedCount || r.matchedCount;
        });
      }
    },

    /**
     * Remove document(s) - compatible with nedb remove()
     * {multi: true} → deleteMany, otherwise deleteOne
     */
    remove(query, options = {}) {
      if (options.multi === true) {
        return Model.deleteMany(query).then(r => r.deletedCount);
      }
      return Model.deleteOne(query).then(r => r.deletedCount);
    },

    /**
     * No-op: indexes are defined in the schema
     */
    ensureIndex() {
      return Promise.resolve();
    },

    /** Direct access to the Mongoose model */
    model: Model,
  };
}

// ============ Build the db object ============

const db = {
  users: wrapModel(User),
  apiKeys: wrapModel(ApiKey),
  services: wrapModel(Service),
  tiers: wrapModel(Tier),
  callLogs: wrapModel(CallLog),
  rateLimit: wrapModel(RateLimit),
  auditLogs: wrapModel(AuditLog),
  billingRecords: wrapModel(BillingRecord),
  bills: wrapModel(Bill),
  redeemCodes: wrapModel(RedeemCode),
  redeemUsage: wrapModel(RedeemUsage),
  notices: wrapModel(Notice),
  userSubscriptions: wrapModel(UserSubscription),
  settings: wrapModel(Setting),
  paymentTokens: wrapModel(PaymentToken),
};

// ============ Indexes (ensured via schema unique indexes) ============
// MongoDB auto-creates indexes on _id. Additional unique indexes are
// defined below so ensureIndexes() can call them explicitly.

async function ensureIndexes() {
  await connect();
  // Unique indexes are created automatically by Mongoose on first operation.
  // We force index creation for critical unique fields:
  await User.collection.createIndex({ username: 1 }, { unique: true }).catch(() => {});
  await User.collection.createIndex({ email: 1 }, { unique: true }).catch(() => {});
  await ApiKey.collection.createIndex({ key: 1 }, { unique: true }).catch(() => {});
  await Service.collection.createIndex({ slug: 1 }, { unique: true }).catch(() => {});
  await CallLog.collection.createIndex({ timestamp: 1 }).catch(() => {});
  await CallLog.collection.createIndex({ userId: 1 }).catch(() => {});
  // Redeem codes should be unique
  await RedeemCode.collection.createIndex({ code: 1 }, { unique: true }).catch(() => {});
  // Billing records: userId + month compound
  await BillingRecord.collection.createIndex({ userId: 1, month: 1 }, { unique: true }).catch(() => {});
  // Bills: userId + month compound
  await Bill.collection.createIndex({ userId: 1, month: 1 }, { unique: true }).catch(() => {});
  // 清理旧版残留的 token_1 唯一索引（会导致无 token 字段的文档插入失败）
  await PaymentToken.collection.dropIndex('token_1').catch(() => {});
}

module.exports = { db, ensureIndexes, connect, mongoose };
