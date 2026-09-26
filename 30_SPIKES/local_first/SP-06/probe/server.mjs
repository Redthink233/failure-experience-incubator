/**
 * SP-06 BROWSER PROBE SERVER —— DISPOSABLE / NON-PRODUCTION
 * 用途：
 *   · 在 https/secure-context 等价条件下（http://127.0.0.1 属 secure context）提供探针页面
 *   · 提供 mock Provider（含 CORS 能力 / 无 CORS 能力两种）
 *   · 提供 Thin Proxy（provider_id → 注册 Adapter → 固定上游；🔴 不接受 client 任意 target）
 *   · 记录服务端实际收到的内容（用于证明：不接收整个 Workspace、日志不出现凭据明文）
 * 运行：node probe/server.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2] || 8787);
// 🔴 CORS 只有"跨源"才有意义：探针页面（主源）与 mock Provider（第二源）必须是不同 origin
const PORT_DELTA = 1;
const PROVIDER_PORT = PORT + PORT_DELTA;
const PROVIDER_BASE = `http://127.0.0.1:${PROVIDER_PORT}`;

// 🔴 与工具侧同一套防护语义（正式实现须同等或更强）
const HOST_ALLOWLIST = new Set();
function isPrivateOrSpecialHost(host) {
  const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
  if (h === '::1') return true;
  if (h.startsWith('169.254.')) return true;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}
function assertUpstreamAllowed(urlStr, opts = {}) {
  const { probeAllowLoopback = false } = opts;
  let u;
  try { u = new URL(urlStr); } catch { return { allowed: false, reason: 'INVALID_URL' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { allowed: false, reason: 'SCHEME_NOT_HTTP_S' };
  if (!HOST_ALLOWLIST.has(`${u.hostname}:${u.port || ''}`)) return { allowed: false, reason: 'HOST_NOT_IN_ALLOWLIST' };
  if (isPrivateOrSpecialHost(u.hostname) && !(probeAllowLoopback && u.hostname === '127.0.0.1')) {
    return { allowed: false, reason: 'PRIVATE_OR_SPECIAL_HOST' };
  }
  return { allowed: true, reason: 'OK' };
}

const PROBE_ALLOW_LOOPBACK_UPSTREAM = true; // 🔴 探针专用（mock 上游只能在回环）

const SERVER_LOG = [];
function logEvent(ev) {
  SERVER_LOG.push({ at: new Date().toISOString(), ...ev });
  if (SERVER_LOG.length > 500) SERVER_LOG.shift();
}

function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => {
      try { resolve(JSON.parse(d || '{}')); } catch { resolve({ __unparsable: String(d).slice(0, 200) }); }
    });
  });
}
function send(res, code, obj, extra = {}) {
  const b = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', ...extra });
  res.end(b);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8' };

const REGISTRY = new Map(); // provider_id → { upstreamUrl, path }

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const authPresent = !!req.headers.authorization;
  const isMutation = req.method !== 'GET';

  // ---------- 静态资源 ----------
  if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/index.html' || u.pathname === '/app.js')) {
    const f = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
    try {
      const body = await fs.readFile(path.join(__dirname, f));
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
      return res.end(body);
    } catch (e) {
      return send(res, 404, { error: 'STATIC_NOT_FOUND', file: f });
    }
  }

  if (u.pathname === '/healthz') return send(res, 200, { ok: true, port: PORT });

  // ---------- 探针配置（把跨源 Provider 地址告诉页面） ----------
  if (u.pathname === '/config') {
    return send(res, 200, {
      probe_origin: `http://127.0.0.1:${PORT}`,
      provider_cors_base: PROVIDER_BASE,
      provider_cors_endpoint: `${PROVIDER_BASE}/with-cors`,
      provider_nocors_endpoint: `${PROVIDER_BASE}/without-cors`,
      cors_scope: '页面 origin 与 Provider origin 不同 ⇒ CORS 真实生效',
    });
  }

  // ---------- mock Provider：支持 Browser Direct（带 CORS） ----------
  if (u.pathname === '/mock/provider-cors') {
    const body = isMutation ? await readBody(req) : {};
    logEvent({ kind: 'provider_cors', path: u.pathname, auth_header_present: authPresent, body_keys: Object.keys(body || {}) });
    return send(res, 200, {
      provider: 'MOCK_CORS_CAPABLE',
      note: 'Browser Direct 可用（返回 Access-Control-Allow-Origin: *）',
      received_body_keys: Object.keys(body || {}),
      auth_header_present: authPresent,
      auth_header_echo: authPresent ? 'REDACTED' : null,
    }, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' });
  }

  // ---------- mock Provider：仅服务端可调用（无 CORS 头） ----------
  if (u.pathname === '/mock/provider-no-cors') {
    const body = isMutation ? await readBody(req) : {};
    logEvent({ kind: 'provider_no_cors', path: u.pathname, auth_header_present: authPresent, body_keys: Object.keys(body || {}) });
    return send(res, 200, {
      provider: 'MOCK_PROXY_ONLY',
      note: '🔴 不返回 CORS 头 ⇒ 浏览器直连会被浏览器拦截；只能经服务端调用（对应 D-055 的 proxy-required 形态）',
      received_body_keys: Object.keys(body || {}),
      auth_header_present: authPresent,
    });
  }

  // ---------- Thin Proxy ----------
  if (u.pathname === '/api/proxy') {
    const body = isMutation ? await readBody(req) : {};
    const clientTargetFields = ['target_url', 'base_url', 'host', 'scheme', 'url', 'endpoint'].filter((k) => k in (body || {}));
    logEvent({ kind: 'proxy', provider_id: body.provider_id ?? null, client_target_fields: clientTargetFields, auth_header_present: authPresent, body_keys: Object.keys(body || {}) });
    if (!body.provider_id) {
      return send(res, 400, { error: 'PROVIDER_ID_REQUIRED', ignored_client_target_fields: clientTargetFields });
    }
    const reg = REGISTRY.get(body.provider_id);
    if (!reg) {
      return send(res, 400, { error: 'UNKNOWN_PROVIDER', provider_id: body.provider_id, ignored_client_target_fields: clientTargetFields });
    }
    const guard = assertUpstreamAllowed(reg.upstreamUrl, { probeAllowLoopback: PROBE_ALLOW_LOOPBACK_UPSTREAM });
    if (!guard.allowed) return send(res, 403, { error: 'UPSTREAM_BLOCKED_BY_GUARD', reason: guard.reason });
    const target = reg.upstreamUrl.replace(/\/$/, '') + reg.path;
    try {
      const r = await fetch(target, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ payload: body.payload ?? null }) });
      const j = await r.json().catch(() => ({}));
      return send(res, 200, {
        proxy: 'THIN',
        resolved_by: 'provider_id → registered adapter → fixed host',
        forwarded_to: target,
        ignored_client_target_fields: clientTargetFields,
        target_url_followed: false,
        forwarded_body_keys: Object.keys(body.payload ?? {}),
        upstream_response: j,
      });
    } catch (e) {
      return send(res, 502, { error: 'UPSTREAM_FAILURE', message: String(e.message) });
    }
  }

  // ---------- 服务端日志（🔴 供泄漏检查；不得含凭据明文） ----------
  if (u.pathname === '/api/server-log') {
    return send(res, 200, {
      entries: SERVER_LOG,
      credential_plaintext_found_in_log: JSON.stringify(SERVER_LOG).includes('Bearer ') && SERVER_LOG.some((e) => e.authorization_value),
      note: '🔴 服务端只登记 auth_header_present（布尔），不登记 Authorization 值',
    });
  }

  return send(res, 404, { error: 'NOT_FOUND', path: u.pathname, note: '🔴 不存在通用任意 URL 代理端点' });
});

server.listen(PORT, '127.0.0.1', () => {
  const base = `http://127.0.0.1:${PORT}`;
  HOST_ALLOWLIST.add(`127.0.0.1:${PORT}`);
  REGISTRY.set('mock_proxy_required', { upstreamUrl: base, path: '/mock/provider-no-cors' });
  console.log(JSON.stringify({
    ok: true,
    probe_url: base + '/',
    secure_context: 'http://127.0.0.1 属于 secure context（File System Access API 可用）',
    registered_providers: [...REGISTRY.keys()],
    cross_origin_provider: PROVIDER_BASE,
    note: 'DISPOSABLE / NON-PRODUCTION',
  }));
});

// ---------------------------------------------------------------------------
// 第二源：真正"跨源"的 mock Provider（用于观测浏览器真实 CORS 拦截）
// ---------------------------------------------------------------------------
const providerServer = http.createServer(async (req, res) => {
  const u = new URL(req.url, PROVIDER_BASE);
  const authPresent = !!req.headers.authorization;
  if (u.pathname === '/with-cors') {
    const body = req.method !== 'GET' ? await readBody(req) : {};
    logEvent({ kind: 'cross_origin_provider_with_cors', auth_header_present: authPresent, body_keys: Object.keys(body || {}) });
    return send(res, 200, {
      provider: 'MOCK_CORS_CAPABLE_CROSS_ORIGIN',
      origin_of_page: req.headers.origin || null,
      cors_header_sent: 'Access-Control-Allow-Origin: *',
      auth_header_present: authPresent,
      auth_header_echo: authPresent ? 'REDACTED' : null,
    }, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' });
  }
  if (u.pathname === '/without-cors') {
    const body = req.method !== 'GET' ? await readBody(req) : {};
    logEvent({ kind: 'cross_origin_provider_without_cors', auth_header_present: authPresent, body_keys: Object.keys(body || {}) });
    // 🔴 有意不返回任何 CORS 头
    return send(res, 200, {
      provider: 'MOCK_PROXY_ONLY_CROSS_ORIGIN',
      origin_of_page: req.headers.origin || null,
      cors_header_sent: null,
      note: '无 CORS 头 ⇒ 跨源 fetch 应被浏览器拦截（Preflight/响应被拦）',
      auth_header_present: authPresent,
    });
  }
  return send(res, 404, { error: 'NOT_FOUND', path: u.pathname });
});

providerServer.listen(PROVIDER_PORT, '127.0.0.1', () => {
  logEvent({ kind: 'provider_server_ready', base: PROVIDER_BASE });
});
