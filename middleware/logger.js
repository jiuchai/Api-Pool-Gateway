const { db } = require('../database');

/**
 * 将 body 对象转为可存储的字符串，文件字段显示为 [文件: 文件名]
 */
function serializeBody(body, maxLen = 5000) {
  if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) return null;
  try {
    const safe = {};
    for (const [key, val] of Object.entries(body)) {
      if (val && typeof val === 'object' && val.originalname) {
        safe[key] = `[文件: ${val.originalname}]`;
      } else if (Array.isArray(val)) {
        safe[key] = val.map(v =>
          v && typeof v === 'object' && v.originalname ? `[文件: ${v.originalname}]` : v
        );
      } else {
        safe[key] = val;
      }
    }
    const str = JSON.stringify(safe);
    return str.length > maxLen ? str.slice(0, maxLen) + '...[截断]' : str;
  } catch {
    return '[不可序列化]';
  }
}

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
    // 合并 req.body 和 req.files，让日志能显示文件信息
    const bodyForLog = { ...(req.body && typeof req.body === 'object' ? req.body : {}) };
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (bodyForLog[file.fieldname]) {
          if (!Array.isArray(bodyForLog[file.fieldname])) {
            bodyForLog[file.fieldname] = [bodyForLog[file.fieldname]];
          }
          bodyForLog[file.fieldname].push(file);
        } else {
          bodyForLog[file.fieldname] = file;
        }
      });
    }
    // 用户请求体（文件 → [文件: 文件名]）
    const userReq = {
      method: req.method,
      path: req.originalUrl,
      query: req.query && Object.keys(req.query).length ? req.query : undefined,
      body: serializeBody(bodyForLog),
    };

    // 用户响应体
    let respStr = null;
    if (responseBody) {
      try {
        const r = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
        respStr = r.length > 5000 ? r.slice(0, 5000) + '...[截断]' : r;
      } catch { respStr = '[不可序列化]'; }
    }

    // 上游请求
    const upstreamReq = req._upstreamReq || null;
    if (upstreamReq && upstreamReq.body) {
      upstreamReq.body = serializeBody(upstreamReq.body, 3000);
    }

    // 上游响应
    const upstreamResp = req._upstreamResp || null;

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
      userRequest: userReq,
      userResponse: respStr,
      upstreamRequest: upstreamReq,
      upstreamResponse: upstreamResp,
      timestamp: Date.now(),
    });
  } catch { /* silent */ }
}

async function auditLog(type, details) {
  try { await db.auditLogs.insert({ type, details, timestamp: Date.now() }); } catch {}
}

module.exports = { callLogger, auditLog };
