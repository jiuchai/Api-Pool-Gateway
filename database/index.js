const Datastore = require('nedb-promises');
const path = require('path');
const config = require('../config');
const dbPath = path.resolve(__dirname, '..', config.dbPath);

const db = {
  users: Datastore.create({ filename: path.join(dbPath, 'users.db'), autoload: true }),
  apiKeys: Datastore.create({ filename: path.join(dbPath, 'apikeys.db'), autoload: true }),
  services: Datastore.create({ filename: path.join(dbPath, 'services.db'), autoload: true }),
  tiers: Datastore.create({ filename: path.join(dbPath, 'tiers.db'), autoload: true }),
  callLogs: Datastore.create({ filename: path.join(dbPath, 'call_logs.db'), autoload: true }),
  rateLimit: Datastore.create({ filename: path.join(dbPath, 'rate_limit.db'), autoload: true }),
  auditLogs: Datastore.create({ filename: path.join(dbPath, 'audit_logs.db'), autoload: true }),
  billingRecords: Datastore.create({ filename: path.join(dbPath, 'billing_records.db'), autoload: true }),
  bills: Datastore.create({ filename: path.join(dbPath, 'bills.db'), autoload: true }),
  redeemCodes: Datastore.create({ filename: path.join(dbPath, 'redeem_codes.db'), autoload: true }),
  redeemUsage: Datastore.create({ filename: path.join(dbPath, 'redeem_usage.db'), autoload: true }),
  notices: Datastore.create({ filename: path.join(dbPath, 'notices.db'), autoload: true }),
  userSubscriptions: Datastore.create({ filename: path.join(dbPath, 'user_subscriptions.db'), autoload: true }),
};

async function ensureIndexes() {
  await db.users.ensureIndex({ fieldName: 'username', unique: true });
  await db.users.ensureIndex({ fieldName: 'email', unique: true });
  await db.apiKeys.ensureIndex({ fieldName: 'key', unique: true });
  await db.services.ensureIndex({ fieldName: 'slug', unique: true });
  await db.callLogs.ensureIndex({ fieldName: 'timestamp' });
  await db.callLogs.ensureIndex({ fieldName: 'userId' });
}

module.exports = { db, ensureIndexes };
