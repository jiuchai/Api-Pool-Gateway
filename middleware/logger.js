const { db } = require('../database');

async function callLogger(req, res, next) {
  const start = Date.now();
  let respBody = null;
  const origJson = res.json.bind(res);
  const origSend = res.send.bind(res);
  const origEnd = res.end.bind(res);

  res.json = function (b) { respBody = b; return origJson(b); };
  res.send = function (b) { respBody = b; return origSend(b); };
  res.end = function (...args) {
    if (args[0] && !respBody) {
      try { respBody = typeof args[0] === 'string' ? JSON.parse(args[0]) : args[0]; } catch { respBody = args[0]; }
    }
    const rt = Date.now() - start;
    logCall(req, res, respBody, rt).catch(() => {});
    return origEnd(...args);
  };
  next();
}

async function logCall(req, res, responseBody, responseTime) {
  try {
    let reqStr = null, respStr = null;
    if (req.body && Object.keys(req.body).length) {
      try { const r = JSON.stringify(req.body); reqStr = r.length > 5000 ? r.slice(0, 5000) + '...[截断]' : r; } catch { reqStr = '[不可序列化]'; }
    }
    if (responseBody) {
      try { const r = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody); respStr = r.length > 5000 ? r.slice(0, 5000) + '...[截断]' : r; } catch { respStr = '[不可序列化]'; }
    }
    // 获取服务名称
    let serviceName = null;
    if (req.params?.slug) {
      try { const svc = await db.services.findOne({ slug: req.params.slug }); if (svc) serviceName = svc.name; } catch {}
    }
    await db.callLogs.insert({
      userId: req.user?._id || null,
      username: req.user?.username || 'anonymous',
      email: req.user?.email || null,
      apiKeyName: req.apiKey?.name || null,
      serviceSlug: req.params?.slug || null,
      serviceName,
      method: req.method,
      path: req.originalUrl,
      targetUrl: req.serviceTargetUrl || null,
      statusCode: res.statusCode,
      responseTime,
      ip: (req.headers['x-forwarded-for'] || req.ip || '').replace(/^::1$/, '127.0.0.1'),
      requestBody: reqStr,
      responseBody: respStr,
      timestamp: Date.now(),
    });
  } catch { /* silent */ }
}

async function auditLog(type, details) {
  try { await db.auditLogs.insert({ type, details, timestamp: Date.now() }); } catch {}
}

module.exports = { callLogger, auditLog };
