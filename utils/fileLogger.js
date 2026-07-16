/**
 * 文件日志工具 — 日志写入 logs/ 目录，按天滚动
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getLogFile(type) {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return path.join(LOG_DIR, `${type}-${y}${m}${d}.log`);
}

function formatLog(level, args) {
  const now = new Date().toISOString();
  const msgs = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a)));
  return `[${now}] [${level}] ${msgs.join(' ')}\n`;
}

function writeFile(filePath, line) {
  try {
    fs.appendFileSync(filePath, line, 'utf8');
  } catch {
    // 忽略写入错误，避免日志崩溃
  }
}

// 保存原始 console 方法（模块级，供 log() 使用，避免递归）
const _origLog = console.log.bind(console);
const _origErr = console.error.bind(console);
const _origWarn = console.warn.bind(console);
const accessLogStream = fs.createWriteStream(getLogFile('access'), { flags: 'a' });

// 每天凌晨检查是否需要切换日志文件
let currentDate = new Date().toDateString();
function checkRotation() {
  const now = new Date();
  if (now.toDateString() !== currentDate) {
    currentDate = now.toDateString();
    // 更新 morgan 写入流
    const newStream = fs.createWriteStream(getLogFile('access'), { flags: 'a' });
    accessLogStream._old = accessLogStream;
    // 将后续写入指向新文件（morgan 通过引用使用同一个 stream 对象会有问题，
    // 所以这里简单处理：关闭旧流，替换为新流）
    try { accessLogStream._old.end(); } catch {}
    Object.assign(accessLogStream, newStream);
  }
}

function log(level, ...args) {
  const line = formatLog(level, args);
  // 写入对应级别的日志文件
  writeFile(getLogFile(level === 'ERROR' || level === 'WARN' ? 'error' : 'app'), line);
  // 同时输出到控制台（使用原始 console，避免递归）
  if (level === 'ERROR') _origErr(...args);
  else if (level === 'WARN') _origWarn(...args);
  else _origLog(...args);
}

function setup() {
  // 重写 console.log / error / warn
  console.log = (...args) => log('INFO', ...args);
  console.error = (...args) => log('ERROR', ...args);
  console.warn = (...args) => log('WARN', ...args);

  // 每小时检查日志轮转
  setInterval(checkRotation, 60 * 60 * 1000);

  // 捕获未处理的异常
  process.on('uncaughtException', (err) => {
    const line = formatLog('FATAL', [err.stack || err.message]);
    writeFile(getLogFile('error'), line);
    _origErr('[FATAL]', err);
  });

  process.on('unhandledRejection', (reason) => {
    const msg = reason?.stack || reason?.message || String(reason);
    const line = formatLog('FATAL', [msg]);
    writeFile(getLogFile('error'), line);
    _origErr('[FATAL] Unhandled Rejection:', reason);
  });
}

module.exports = { setup, accessLogStream, getLogFile, checkRotation };
