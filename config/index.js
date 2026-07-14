require('dotenv').config();
module.exports = {
  port: process.env.PORT || 3002,
  jwt: { secret: process.env.JWT_SECRET || 'default-secret', expiresIn: '7d' },
  bcryptSaltRounds: 10,
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@pool.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
  },
  rateLimit: { defaultPerMinute: 60, defaultPerHour: 1000, defaultPerDay: 10000 },
  proxy: { timeout: 30000 },
  logRetentionDays: 90,
  dbPath: './data',
  billing: {
    defaultTierIndex: 0,
    tiers: [
      { name: '免费档', ratePerSecond: 5, maxCallsPerDay: 100, maxCalls: 1000, monthlyFee: 0 },
      { name: '基础档', ratePerSecond: 20, maxCallsPerDay: 5000, maxCalls: 50000, monthlyFee: 29 },
      { name: '专业档', ratePerSecond: 50, maxCallsPerDay: 20000, maxCalls: 200000, monthlyFee: 99 },
      { name: '企业档', ratePerSecond: 100, maxCallsPerDay: -1, maxCalls: -1, monthlyFee: 299 },
    ],
  },
};
