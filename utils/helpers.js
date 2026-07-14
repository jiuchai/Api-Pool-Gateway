const crypto = require('crypto');

function generateApiKey() { return 'pool_' + crypto.randomBytes(24).toString('hex'); }
function getCurrentMonth() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; }
function getMonthStart(month) { const [y,m] = month.split('-').map(Number); return new Date(y, m-1, 1).getTime(); }
function getMonthEnd(month) { const [y,m] = month.split('-').map(Number); return new Date(y, m, 1).getTime() - 1; }
function calculateCost(callCount, tier) { return Math.round(tier.monthlyFee * 100) / 100; }
function formatDateTime(date) { const d = new Date(date); const p = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function isStrongPassword(pw) { return pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw); }

/**
 * 根据参数Schema验证输入
 */
function validateParams(params, schema) {
  if (!schema || !Array.isArray(schema)) return null;
  const errors = [];
  const sanitized = {};
  for (const field of schema) {
    const val = params[field.name];
    if (field.required && (val === undefined || val === '' || val === null)) {
      errors.push(`${field.name} 为必填`);
      continue;
    }
    if (val === undefined || val === '') continue;
    // 类型检查
    switch (field.type) {
      case 'number':
        if (isNaN(Number(val))) errors.push(`${field.name} 必须是数字`);
        else sanitized[field.name] = Number(val);
        break;
      case 'boolean':
        sanitized[field.name] = val === 'true' || val === true || val === 1;
        break;
      case 'json':
        try { sanitized[field.name] = typeof val === 'string' ? JSON.parse(val) : val; }
        catch { errors.push(`${field.name} 必须是有效JSON`); }
        break;
      default:
        sanitized[field.name] = String(val);
    }
  }
  return { sanitized, errors: errors.length ? errors : null };
}

module.exports = { generateApiKey, getCurrentMonth, getMonthStart, getMonthEnd, calculateCost, formatDateTime, isValidEmail, isStrongPassword, validateParams };
