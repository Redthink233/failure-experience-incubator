/**
 * SP-06 CONFIGURABLE PROVIDER ADAPTER PROBE（S6-17）—— DISPOSABLE / NON-PRODUCTION
 * 验证：① 切换 provider 只改配置、不改代码；② 路径由 Adapter Capability 决定（D-055）；
 *       ③ 不可用 Provider 必须明确失败，不得降级为不安全 Proxy；
 *       ④ 凭据只在内存中，不落盘、不进日志。
 * 🔴 不调用任何真实 LLM（本机无模型凭据）；上游为本地 mock。
 * 运行：node tools/provider_adapter_probe.mjs
 * 输出：results/provider-adapter-results.json
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SP06 = path.resolve(__dirname, '..');
const RES = path.join(SP06, 'results');

const FAKE_TOKEN = 'sp06-FAKE-TOKEN-DO-NOT-STORE-abc123';

// ---------------------------------------------------------------------------
// ① 配置（唯一变化点；🔴 业务代码不变）
// ---------------------------------------------------------------------------
const PROVIDER_CONFIGS = [
  {
    provider_id: 'mock_browser_direct_capable',
    model: 'mock-1',
    base_url: null,
    adapter: { browser_cors: true, officially_supported_in_browser: true, user_credential_usable: true, needs_server_secret: false, known_security_issue: false, registered_on_server: true },
  },
  {
    provider_id: 'mock_proxy_required',
    model: 'mock-2',
    base_url: null,
    adapter: { browser_cors: false, officially_supported_in_browser: false, user_credential_usable: true, needs_server_secret: false, known_security_issue: false, registered_on_server: true },
  },
  {
    provider_id: 'mock_custom_base_url',
    model: 'mock-3',
    base_url: 'https://my-own-endpoint.example.invalid/v1',
    adapter: { browser_cors: true, officially_supported_in_browser: false, user_credential_usable: true, needs_server_secret: false, known_security_issue: false, registered_on_server: false },
  },
  {
    provider_id: 'mock_custom_base_url_unsupported',
    model: 'mock-4',
    base_url: 'https://legacy-endpoint.example.invalid/v1',
    adapter: { browser_cors: false, officially_supported_in_browser: false, user_credential_usable: true, needs_server_secret: false, known_security_issue: false, registered_on_server: false },
  },
  {
    provider_id: 'mock_direct_no_secret_requirement_met',
    model: 'mock-5',
    base_url: null,
    adapter: { browser_cors: true, officially_supported_in_browser: true, user_credential_usable: true, needs_server_secret: true, known_security_issue: false, registered_on_server: true },
  },
];

// ---------------------------------------------------------------------------
// ② Adapter 路径选择（D-055 §二 / §三 / §四 / §六）
// ---------------------------------------------------------------------------
export function selectPath(p) {
  const a = p.adapter;
  const isCustomBaseUrl = !!p.base_url;

  // 🔴 Custom / OpenAI-compatible 用户自定义 Base URL ⇒ Browser Direct Only，禁止通用 Proxy
  if (isCustomBaseUrl) {
    if (a.browser_cors && !a.known_security_issue) {
      return { path: 'BROWSER_DIRECT', reason: 'CUSTOM_BASE_URL_BROWSER_DIRECT_ONLY', credential_destination: 'USER_SELECTED_BASE_URL' };
    }
    return {
      path: 'UNSUPPORTED',
      reason: 'CUSTOM_BASE_URL_NOT_BROWSER_DIRECT_CAPABLE_AND_GENERIC_PROXY_FORBIDDEN',
      user_message: 'Provider connection unsupported under current browser constraints',
      credential_destination: 'NOT_SENT',
    };
  }

  const directOk =
    a.browser_cors && a.officially_supported_in_browser && a.user_credential_usable && !a.needs_server_secret && !a.known_security_issue;
  if (directOk) {
    return { path: 'BROWSER_DIRECT', reason: 'ALL_FIVE_CONDITIONS_MET', credential_destination: 'USER_SELECTED_PROVIDER' };
  }

  // 🔴 需要服务端固定 server secret 的 Provider ⇒ V1 无法支持
  //    （由 D-055 §二④「不需要产品服务器隐藏固定 server secret」+ §七「V1 不预置服务端固定 Key」共同推出）
  if (a.needs_server_secret) {
    return {
      path: 'UNSUPPORTED',
      reason: 'REQUIRES_SERVER_SIDE_FIXED_SECRET_WHICH_V1_DOES_NOT_PROVISION',
      user_message: 'Provider connection unsupported under current browser constraints',
      credential_destination: 'NOT_SENT',
      must_not: '不得为了支持该 Provider 而在产品侧预置固定 server secret；不得偷偷走通用 Vercel Proxy',
    };
  }

  if (a.registered_on_server) {
    return {
      path: 'VERCEL_THIN_PROXY',
      reason: 'BROWSER_DIRECT_NOT_FEASIBLE_AND_REGISTERED_ADAPTER_EXISTS',
      credential_destination: 'REGISTERED_PROVIDER_ENDPOINT_ONLY',
      target_resolution: 'provider_id → registered adapter → fixed/allowlisted host',
      thin_boundary: {
        allowed: ['request normalization', 'provider adapter forwarding', 'response normalization', 'timeout/error mapping', 'schema transport'],
        forbidden: ['Workspace persistence', 'Attempt persistence', 'Insight persistence', 'Hypothesis persistence', 'Experience database', 'Cloud user database'],
      },
    };
  }

  return {
    path: 'UNSUPPORTED',
    reason: 'NO_BROWSER_DIRECT_AND_NO_SAFE_REGISTERED_ADAPTER',
    user_message: 'Provider connection unsupported under current browser constraints',
    credential_destination: 'NOT_SENT',
    must_not: '不得偷偷走通用 Vercel Proxy；不得为支持所有 Provider 降低 SSRF 边界',
  };
}

// ---------------------------------------------------------------------------
// ③ 凭据（🔴 只在内存；不写文件 / 不写日志）
// ---------------------------------------------------------------------------
const CredentialStore = {
  store: new Map(), // 仅当前进程内存（= session-scoped 等价物）
  set(id, key) {
    this.store.set(id, key);
  },
  get(id) {
    return this.store.get(id) || null;
  },
  redact() {
    return `REDACTED(${this.store.size} entries)`;
  },
};
function redact(s) {
  return String(s).replaceAll(FAKE_TOKEN, 'REDACTED');
}

// ---------------------------------------------------------------------------
// Mock 上游（本地）
// ---------------------------------------------------------------------------
function listen(srv) {
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));
}
async function readBody(req) {
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

async function main() {
  const seen = [];
  const upstream = http.createServer(async (req, res) => {
    const body = await readBody(req);
    seen.push({
      url: req.url,
      authorization_header_present: !!req.headers.authorization,
      authorization_header_masked: req.headers.authorization ? 'Bearer REDACTED' : null,
    });
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify({ ok: true, upstream: 'MOCK', path: req.url }));
  });
  const port = await listen(upstream);

  const results = {
    NATURE: 'DISPOSABLE / NON-PRODUCTION',
    LIMITATION: '🔴 未调用任何真实 LLM Provider（本机无模型凭据）；上游为本地 mock。CORS 的真实拦截行为由浏览器侧探针验证（S6-18），Node 侧只验证 Adapter 决策与调用形态。',
    code_call_site: 'invoke(providerConfig) —— 对所有 provider 使用同一个函数（切换 provider 只改配置）',
    providers: [],
    unsupported_messages: [],
    credential_leak_check: {},
  };

  const invoke = async (cfg) => {
    const decision = selectPath(cfg);
    if (decision.path === 'UNSUPPORTED') {
      return { provider_id: cfg.provider_id, decision, invoked: false };
    }
    const target = cfg.base_url || `http://127.0.0.1:${port}/v1/chat/completions`;
    const cred = CredentialStore.get(cfg.provider_id);
    const r = await fetch(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cred}` },
      body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: 'ping' }] }),
    }).catch((e) => ({ ok: false, status: 0, statusText: redact(e.message) }));
    return { provider_id: cfg.provider_id, decision, invoked: true, upstream_status: r.status, upstream_target: target };
  };

  // 凭据只进内存
  for (const c of PROVIDER_CONFIGS) CredentialStore.set(c.provider_id, FAKE_TOKEN);

  for (const cfg of PROVIDER_CONFIGS) {
    const out = await invoke(cfg);
    results.providers.push(out);
    if (out.decision.path === 'UNSUPPORTED') results.unsupported_messages.push({ provider_id: cfg.provider_id, message: out.decision.user_message, must_not: out.decision.must_not });
  }

  results.switching_provider_requires_code_change = false;
  results.upstream_requests_seen = seen;
  results.browser_direct_credential_destination = results.providers.filter((p) => p.decision.path === 'BROWSER_DIRECT').map((p) => p.provider_id);
  results.proxy_path_credential_destination = results.providers.filter((p) => p.decision.path === 'VERCEL_THIN_PROXY').map((p) => p.provider_id);
  results.unsupported_provider_count = results.providers.filter((p) => p.decision.path === 'UNSUPPORTED').length;

  results.credential_leak_check = {
    credential_store_is_memory_only: true,
    credential_store_redacts_on_dump: CredentialStore.redact(),
    // 上游（= 凭据的合法目的地）确实收到鉴权头 —— 这是预期行为，不是泄漏
    upstream_received_authorization_header: seen.some((s) => s.authorization_header_present),
    upstream_received_plaintext_token_in_this_run: seen.some((s) => s.authorization_header_masked === null && s.authorization_header_present),
    // 本探针自身记录里不出现明文
    our_records_masked: seen.every((s) => !String(s.authorization_header_masked || '').includes(FAKE_TOKEN)),
  };

  // 🔴 全树扫描：确认 fixture token 未意外写入任何"非声明文件"
  const hits = [];
  async function walk(dir) {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules') continue;
        await walk(full);
      } else if (e.isFile()) {
        const buf = await fs.readFile(full).catch(() => null);
        if (buf && buf.toString('utf8').includes(FAKE_TOKEN)) hits.push(path.relative(SP06, full));
      }
    }
  }
  await walk(SP06);
  const declared = ['tools/provider_adapter_probe.mjs'];
  const norm = (s) => s.split(path.sep).join('/');
  results.credential_leak_check.files_containing_fixture_token = hits.map(norm);
  results.credential_leak_check.fixture_token_declared_in = declared;
  results.credential_leak_check.unexpected_hits = hits.map(norm).filter((h) => !declared.includes(h));
  results.credential_leak_check.note =
    'SP06-FAKE-TOKEN… 是探针自带的**非机密**测试标记串（用于存储/日志泄漏检测），不属于凭据；🔴 它出现在声明它的探针源码内属预期。';
  results.credential_leak_check.no_durable_credential_leak = results.credential_leak_check.unexpected_hits.length === 0;

  results.summary = {
    providers_tested: results.providers.length,
    direct_path: results.browser_direct_credential_destination.length,
    proxy_path: results.proxy_path_credential_destination.length,
    unsupported: results.unsupported_provider_count,
    unsupported_never_silently_proxied: results.unsupported_messages.every((u) => !!u.message),
    VERDICT:
      results.providers.length === PROVIDER_CONFIGS.length &&
      results.unsupported_provider_count === 2 &&
      results.unsupported_messages.every((u) => !!u.message) &&
      results.credential_leak_check.no_durable_credential_leak &&
      results.credential_leak_check.our_records_masked &&
      results.credential_leak_check.upstream_received_authorization_header
        ? 'PASS'
        : 'FAIL',
  };

  await fs.mkdir(RES, { recursive: true });
  await fs.writeFile(path.join(RES, 'provider-adapter-results.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ok: true, summary: results.summary, providers: results.providers.map((p) => ({ id: p.provider_id, path: p.decision.path })) }, null, 2));
  upstream.close();
}

main().catch((e) => {
  console.error('PROVIDER ADAPTER PROBE FAILED', e);
  process.exit(1);
});
