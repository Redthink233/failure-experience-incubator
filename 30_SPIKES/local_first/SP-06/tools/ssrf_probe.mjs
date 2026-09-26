/**
 * SP-06 SSRF / OPEN PROXY PROBE —— DISPOSABLE / NON-PRODUCTION
 * 🔴 不发送任何真实恶意攻击；只在本地回环内用 mock 上游 + "哨兵监听端口" 证明
 *    Proxy 的目标由 provider_id → 注册 Adapter 决定，而不是由 client 提交的 target 字段决定。
 * 运行：node tools/ssrf_probe.mjs
 * 输出：results/ssrf-results.json
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RES = path.resolve(__dirname, '..', 'results');

// ---------------------------------------------------------------------------
// 防护逻辑（探针实现；正式实现须同等或更强）
// ---------------------------------------------------------------------------
const HOST_ALLOWLIST = new Set(); // 由注册 Adapter 动态填充（严格 allowlist）

function isPrivateOrSpecialHost(host) {
  const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
  if (h === '::1' || h === '0:0:0:0:0:0:0:1') return true;
  if (h === '169.254.169.254' || h.startsWith('169.254.')) return true; // link-local / metadata
  if (h.startsWith('fe80:') || h.startsWith('fd') || h.startsWith('fc')) return true; // IPv6 link-local / ULA
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 127) return true; // loopback
    if (a === 10) return true; // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 0) return true;
  }
  return false;
}

/**
 * 🔴 只接受"服务器端注册的固定 URL"；拒绝一切私有 / 特殊 / 非 http(s) 目标。
 *
 * `probeAllowLoopback` 说明（🔴 探针专用、不得进入正式实现）：
 *   本探针的 mock 上游只能跑在 127.0.0.1 上，因此在校验"注册表中枢可达性"时需要
 *   放行回环地址。默认（正式语义）= false：**回环 / RFC1918 / link-local / metadata
 *   一律 BLOCKED**（见 guard_unit_tests，全部在默认参数下运行）。
 */
function assertUpstreamAllowed(urlStr, opts = {}) {
  const { probeAllowLoopback = false } = opts;
  let u;
  try {
    u = new URL(urlStr);
  } catch {
    return { allowed: false, reason: 'INVALID_URL' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { allowed: false, reason: 'SCHEME_NOT_HTTP_S' };
  if (!HOST_ALLOWLIST.has(`${u.hostname}:${u.port || ''}`)) return { allowed: false, reason: 'HOST_NOT_IN_ALLOWLIST' };
  if (isPrivateOrSpecialHost(u.hostname)) {
    if (!(probeAllowLoopback && (u.hostname === '127.0.0.1' || u.hostname === '::1'))) {
      return { allowed: false, reason: 'PRIVATE_OR_SPECIAL_HOST' };
    }
  }
  return { allowed: true, reason: 'OK' };
}

function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(d || '{}'));
      } catch {
        resolve({ __unparsable: d });
      }
    });
  });
}

function send(res, code, obj, extraHeaders = {}) {
  const b = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', ...extraHeaders });
  res.end(b);
}

// ---------------------------------------------------------------------------
// Mock 上游（= "已知 Provider"）；记录收到的请求，作为证据
// ---------------------------------------------------------------------------
const upstreamLog = [];
const upstream = http.createServer(async (req, res) => {
  const body = await readBody(req);
  upstreamLog.push({ at: new Date().toISOString(), method: req.method, url: req.url, host_header: req.headers.host, body_keys: Object.keys(body || {}) });
  send(res, 200, { upstream: 'KNOWN_PROVIDER_MOCK', received_path: req.url, received_host_header: req.headers.host, ok: true });
});

// ---------------------------------------------------------------------------
// 哨兵（trap）：任何被"跟随 target_url"的流量都会打到这里 —— 期望始终为 0
// ---------------------------------------------------------------------------
const trapLog = [];
const trap = http.createServer((req, res) => {
  trapLog.push({ at: new Date().toISOString(), url: req.url, host: req.headers.host });
  send(res, 200, { trap: 'SSRF_TRAP_HIT', note: 'if you see this, target_url was followed' });
});

// ---------------------------------------------------------------------------
// Thin Proxy：目标 100% 由 provider_id → 注册 Adapter 决定
// ---------------------------------------------------------------------------
const REGISTRY = new Map(); // provider_id → { upstreamUrl, path }
const proxyLog = [];
const PROBE_ALLOW_LOOPBACK_UPSTREAM = true; // 🔴 探针专用（mock 上游只能在回环）；正式实现不得放行

const proxy = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://local');
  if (u.pathname !== '/api/proxy') {
    return send(res, 404, { error: 'NOT_FOUND', note: '🔴 不存在通用任意 URL 代理端点' });
  }
  const body = await readBody(req);
  const clientTargetFields = ['target_url', 'base_url', 'host', 'scheme', 'url', 'endpoint'].filter((k) => k in (body || {}));
  proxyLog.push({ at: new Date().toISOString(), provider_id: body.provider_id ?? null, clientTargetFields });

  if (!body || !body.provider_id) {
    return send(res, 400, {
      error: 'PROVIDER_ID_REQUIRED',
      note: '目标只能由 provider_id → 服务器端注册 Adapter 决定',
      ignored_client_target_fields: clientTargetFields,
    });
  }
  const reg = REGISTRY.get(body.provider_id);
  if (!reg) {
    return send(res, 400, {
      error: 'UNKNOWN_PROVIDER',
      note: 'provider_id 未在服务器端注册 ⇒ 拒绝；不得据 client 提交的任意 target 代请求',
      ignored_client_target_fields: clientTargetFields,
    });
  }
  const guard = assertUpstreamAllowed(reg.upstreamUrl, { probeAllowLoopback: PROBE_ALLOW_LOOPBACK_UPSTREAM });
  if (!guard.allowed) {
    return send(res, 403, { error: 'UPSTREAM_BLOCKED_BY_GUARD', reason: guard.reason, ignored_client_target_fields: clientTargetFields });
  }
  // 🔴 关键：请求目标 = reg.upstreamUrl + reg.path（与 client 提交的 target 字段无关）
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
      upstream_response: j,
    });
  } catch (e) {
    return send(res, 502, { error: 'UPSTREAM_FAILURE', message: String(e.message), ignored_client_target_fields: clientTargetFields });
  }
});

// ---------------------------------------------------------------------------
// 运行用例
// ---------------------------------------------------------------------------
async function listen(srv) {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return srv.address().port;
}

async function main() {
  const upPort = await listen(upstream);
  const trapPort = await listen(trap);
  const proxyPort = await listen(proxy);

  HOST_ALLOWLIST.add(`127.0.0.1:${upPort}`); // 🔴 严格 allowlist（由服务器端注册表填充，客户端无法写入）
  REGISTRY.set('provider_x_registered', { upstreamUrl: `http://127.0.0.1:${upPort}`, path: '/v1/chat/completions' });

  const base = `http://127.0.0.1:${proxyPort}`;
  const results = {
    NATURE: 'DISPOSABLE / NON-PRODUCTION',
    LIMITATION:
      '探针不发送任何真实外网攻击；注册上游与 SSRF 哨兵均在本机回环。metadata endpoint（169.254.169.254）无法在本机绑定 ⇒ 只做 guard 单元验证（默认语义下 BLOCKED），不做真实网络请求。为让 mock 上游可被访问，探针在"注册表中枢可达性"校验上使用了 probe-only 的 allowLoopback 开关；🔴 默认语义（= 正式实现口径）对回环 / RFC1918 / link-local / metadata 一律 BLOCKED，见 guard_unit_tests。',
    topology: {
      thin_proxy: base,
      known_upstream: `http://127.0.0.1:${upPort}`,
      ssrf_trap: `http://127.0.0.1:${trapPort}`,
    },
    cases: [],
  };

  const call = async (name, body, expect) => {
    const r = await fetch(base + '/api/proxy', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    const before = trapLog.length;
    const rec = { name, request_body: body, status: r.status, response: j, expectation: expect, trap_hits_after_call_total: trapLog.length, trap_delta: trapLog.length - before };
    rec.pass = expect(rec);
    results.cases.push(rec);
    return rec;
  };

  await call(
    '1. registered provider, no client target field',
    { provider_id: 'provider_x_registered', payload: { prompt: 'hi' } },
    (r) => r.status === 200 && r.response.resolved_by.includes('registered adapter'),
  );
  await call(
    '2. registered provider + target_url = SSRF trap (loopback)',
    { provider_id: 'provider_x_registered', target_url: `http://127.0.0.1:${trapPort}/steal`, payload: { prompt: 'hi' } },
    (r) => r.status === 200 && r.response.target_url_followed === false && r.trap_delta === 0 && r.response.ignored_client_target_fields.includes('target_url'),
  );
  await call(
    '3. registered provider + target_url = cloud metadata endpoint',
    { provider_id: 'provider_x_registered', target_url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/', payload: {} },
    (r) => r.status === 200 && r.response.target_url_followed === false && r.trap_delta === 0,
  );
  await call(
    '4. unknown provider_id + arbitrary target_url',
    { provider_id: 'not_registered', target_url: `http://127.0.0.1:${trapPort}/steal`, payload: {} },
    (r) => r.status === 400 && r.response.error === 'UNKNOWN_PROVIDER' && r.trap_delta === 0,
  );
  await call('5. no provider_id at all', { target_url: `http://127.0.0.1:${trapPort}/steal` }, (r) => r.status === 400 && r.response.error === 'PROVIDER_ID_REQUIRED' && r.trap_delta === 0);
  await call(
    '6. registered provider + base_url = file:// scheme',
    { provider_id: 'provider_x_registered', base_url: 'file:///C:/Windows/win.ini', payload: {} },
    (r) => r.status === 200 && r.response.ignored_client_target_fields.includes('base_url'),
  );
  await call(
    '7. registered provider + host/scheme override attempt',
    { provider_id: 'provider_x_registered', host: 'evil.example.com', scheme: 'http', url: 'http://evil.example.com/x', endpoint: 'http://evil.example.com/y', payload: {} },
    (r) => r.status === 200 && r.response.ignored_client_target_fields.length === 4,
  );

  // 8. 不存在通用代理端点
  {
    const r = await fetch(base + '/api/proxy-any?target_url=' + encodeURIComponent(`http://127.0.0.1:${trapPort}/x`), { method: 'POST' });
    results.cases.push({
      name: '8. generic arbitrary-URL proxy endpoint',
      request: 'POST /api/proxy-any?target_url=<loopback trap>',
      status: r.status,
      expectation: '端点不存在（404）',
      pass: r.status === 404,
      trap_hits_after_call_total: trapLog.length,
      trap_delta: 0,
    });
  }

  // 9. guard 单元验证
  const guardCases = [
    ['http://localhost:8080/x', 'BLOCKED'],
    ['http://127.0.0.1:8080/x', 'BLOCKED'],
    ['http://[::1]:8080/x', 'BLOCKED'],
    ['http://10.0.0.5/x', 'BLOCKED'],
    ['http://172.16.5.5/x', 'BLOCKED'],
    ['http://192.168.1.10/x', 'BLOCKED'],
    ['http://169.254.169.254/latest/meta-data/', 'BLOCKED'],
    ['file:///C:/Windows/win.ini', 'BLOCKED'],
    ['gopher://127.0.0.1:70/', 'BLOCKED'],
    ['http://example.com/x', 'BLOCKED (not in allowlist)'],
  ];
  results.guard_unit_tests = guardCases.map(([url, expected]) => {
    const g = assertUpstreamAllowed(url); // 🔴 默认参数 = 正式语义（回环 / RFC1918 / metadata 全部 BLOCKED）
    return { url, expected, verdict: g.allowed ? 'ALLOWED' : `BLOCKED(${g.reason})`, pass: !g.allowed };
  });
  results.guard_positive_control = {
    note: '注册上游本身是回环 mock：默认语义下也应 BLOCKED（PRIVATE_OR_SPECIAL_HOST）；仅探针 flag 下放行',
    default_semantics: (() => {
      const g = assertUpstreamAllowed(`http://127.0.0.1:${upPort}/v1/chat/completions`);
      return g.allowed ? 'ALLOWED' : `BLOCKED(${g.reason})`;
    })(),
    probe_flag: (() => {
      const g = assertUpstreamAllowed(`http://127.0.0.1:${upPort}/v1/chat/completions`, { probeAllowLoopback: true });
      return g.allowed ? 'ALLOWED' : `BLOCKED(${g.reason})`;
    })(),
    registry_pointing_to_non_allowlisted_host: (() => {
      const g = assertUpstreamAllowed('https://attacker.example.com/v1'); // 未注册 ⇒ 不在 allowlist
      return g.allowed ? 'ALLOWED' : `BLOCKED(${g.reason})`;
    })(),
  };

  results.upstream_log = upstreamLog;
  results.trap_log = trapLog;
  results.proxy_log = proxyLog;
  results.summary = {
    total_cases: results.cases.length,
    passed: results.cases.filter((c) => c.pass).length,
    trap_hits_total: trapLog.length,
    arbitrary_target_followed_anywhere: trapLog.length > 0,
    guard_default_semantics: results.guard_positive_control.default_semantics,
    non_allowlisted_registry_target: results.guard_positive_control.registry_pointing_to_non_allowlisted_host,
    VERDICT:
      results.cases.every((c) => c.pass) &&
      trapLog.length === 0 &&
      results.guard_unit_tests.every((g) => g.pass) &&
      results.guard_positive_control.default_semantics.startsWith('BLOCKED') &&
      results.guard_positive_control.registry_pointing_to_non_allowlisted_host.startsWith('BLOCKED')
        ? 'PASS'
        : 'ISSUE',
  };

  await fs.mkdir(RES, { recursive: true });
  await fs.writeFile(path.join(RES, 'ssrf-results.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ok: true, summary: results.summary }, null, 2));

  upstream.close();
  trap.close();
  proxy.close();
}

main().catch((e) => {
  console.error('SSRF PROBE FAILED', e);
  process.exit(1);
});
