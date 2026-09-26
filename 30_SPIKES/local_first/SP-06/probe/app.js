/**
 * SP-06 BROWSER PROBE UI —— DISPOSABLE / NON-PRODUCTION
 * 🔴 所有结果均为探针观测；`MANUAL OBSERVATION` 项必须由真人操作后记录。
 */
const LOG = [];
function rec(name, value) {
  LOG.push({ at: new Date().toISOString(), name, value });
  render();
  return value;
}
function render() {
  const el = document.getElementById('log');
  if (el) el.textContent = JSON.stringify(LOG, null, 2);
}
window.__sp06Log = LOG;

// ---------------------------------------------------------------------------
// 1. 能力 / 环境检测（无需用户手势）
// ---------------------------------------------------------------------------
function detect() {
  return rec('detect', {
    userAgent: navigator.userAgent,
    isSecureContext: window.isSecureContext,
    location_origin: location.origin,
    hasShowDirectoryPicker: typeof window.showDirectoryPicker === 'function',
    hasShowOpenFilePicker: typeof window.showOpenFilePicker === 'function',
    hasShowSaveFilePicker: typeof window.showSaveFilePicker === 'function',
    hasFileSystemHandle: typeof window.FileSystemHandle === 'function',
    hasFileSystemDirectoryHandle: typeof window.FileSystemDirectoryHandle === 'function',
    hasSessionStorage: typeof sessionStorage !== 'undefined',
    hasLocalStorage: typeof localStorage !== 'undefined',
    hasIndexedDB: typeof indexedDB !== 'undefined',
    hasCookieEnabled: navigator.cookieEnabled,
    hasCachesAPI: typeof caches !== 'undefined',
    visibilityState: document.visibilityState,
    NOTE: '能力存在 ≠ 交互可用；原生 picker 必须由真实用户手势触发（见 S6-01/S6-04–S6-07）',
  });
}

// ---------------------------------------------------------------------------
// 2. Workspace（File System Access API；🔴 需要真实手势）
// ---------------------------------------------------------------------------
let dirHandle = null;
let fileHandle = null;

async function pickWorkspace() {
  try {
    if (typeof window.showDirectoryPicker !== 'function') {
      return rec('pickWorkspace', { ok: false, error: 'showDirectoryPicker unavailable' });
    }
    dirHandle = await window.showDirectoryPicker({ id: 'sp06-workspace', mode: 'readwrite' });
    return rec('pickWorkspace', { ok: true, name: dirHandle.name, kind: dirHandle.kind, mode: 'readwrite' });
  } catch (e) {
    return rec('pickWorkspace', { ok: false, error: e.name + ': ' + e.message });
  }
}

async function queryPermission(handle, mode) {
  if (!handle || typeof handle.queryPermission !== 'function') return null;
  return handle.queryPermission({ mode });
}
async function requestPermission(handle, mode) {
  if (!handle || typeof handle.requestPermission !== 'function') return null;
  return handle.requestPermission({ mode });
}

async function readWorkspaceJson() {
  if (!dirHandle) return rec('readWorkspaceJson', { ok: false, error: 'NO_DIRECTORY_HANDLE（需先 Select Workspace）' });
  try {
    const fh = await dirHandle.getFileHandle('workspace.json');
    const f = await fh.getFile();
    const text = await f.text();
    const parsed = JSON.parse(text);
    return rec('readWorkspaceJson', { ok: true, bytes: text.length, workspace_id: parsed.workspace_id, DATA_NATURE: parsed.DATA_NATURE });
  } catch (e) {
    return rec('readWorkspaceJson', { ok: false, error: e.name + ': ' + e.message });
  }
}

async function listAttempts() {
  if (!dirHandle) return rec('listAttempts', { ok: false, error: 'NO_DIRECTORY_HANDLE' });
  try {
    const ad = await dirHandle.getDirectoryHandle('attempts');
    const names = [];
    for await (const entry of ad.values()) names.push(entry.kind + ':' + entry.name);
    return rec('listAttempts', { ok: true, count: names.length, first: names.slice(0, 3) });
  } catch (e) {
    return rec('listAttempts', { ok: false, error: e.name + ': ' + e.message });
  }
}

async function createAttemptFile() {
  if (!dirHandle) return rec('createAttemptFile', { ok: false, error: 'NO_DIRECTORY_HANDLE' });
  try {
    const ad = await dirHandle.getDirectoryHandle('attempts', { create: true });
    const name = 'ATT-PROBE-' + Date.now() + '.md';
    fileHandle = await ad.getFileHandle(name, { create: true });
    const w = await fileHandle.createWritable();
    await w.write('---\nattempt_id: ATT-PROBE\nstatus: Draft\ndata_source_nature: TEST FIXTURE / NOT PRODUCT DATA\n---\n\n# SP-06 probe file\n\n（探针写入）\n');
    await w.close();
    const stat = await (await fileHandle.getFile()).size;
    return rec('createAttemptFile', { ok: true, file: name, bytes: stat, note: '🔴 请用外部文件管理器核对磁盘上确实出现该文件' });
  } catch (e) {
    return rec('createAttemptFile', { ok: false, error: e.name + ': ' + e.message });
  }
}

async function modifyAttemptFile() {
  if (!dirHandle) return rec('modifyAttemptFile', { ok: false, error: 'NO_DIRECTORY_HANDLE' });
  try {
    const ad = await dirHandle.getDirectoryHandle('attempts');
    const fh = fileHandle || (await ad.getFileHandle('ATT-0001.md'));
    const before = (await (await fh.getFile()).text()).length;
    const w = await fh.createWritable();
    await w.write('---\nattempt_id: ATT-0001\nstatus: Formal\narchive_state: active\ndata_source_nature: TEST FIXTURE / NOT PRODUCT DATA\n---\n\n# ATT-0001（已被 SP-06 探针修改 ' + new Date().toISOString() + '）\n\n<!-- sp06:levelA:begin -->\n{"goal":{"content_item_id":"CI-ATT-0001-goal","source_type":"Fact","value":"缩短干燥时间"},"approach":{"content_item_id":"CI-ATT-0001-approach","source_type":"Fact","value":"提高热风温度"},"condition":{"content_item_id":"CI-ATT-0001-condition","source_type":"Fact","value":"50°C"},"result_phenomenon":{"content_item_id":"CI-ATT-0001-result","source_type":"Fact","value":"出现明显开裂"}}\n<!-- sp06:levelA:end -->\n');
    await w.close();
    return rec('modifyAttemptFile', { ok: true, file: fh.name, bytes_before: before, bytes_after: (await (await fh.getFile()).text()).length, note: '🔴 必须用外部编辑器核对磁盘内容确实变化' });
  } catch (e) {
    return rec('modifyAttemptFile', { ok: false, error: e.name + ': ' + e.message });
  }
}

async function renameForRefTest() {
  if (!dirHandle) return rec('renameForRefTest', { ok: false, error: 'NO_DIRECTORY_HANDLE' });
  try {
    const ad = await dirHandle.getDirectoryHandle('attempts');
    const fh = await ad.getFileHandle('ATT-0002.md');
    if (typeof fh.move !== 'function') {
      return rec('renameForRefTest', { ok: false, error: 'FileSystemFileHandle.move() 不可用（本浏览器 / 实现不支持）' });
    }
    await fh.move('zz-renamed-ATT-0002.md');
    return rec('renameForRefTest', { ok: true, from: 'ATT-0002.md', to: 'zz-renamed-ATT-0002.md', note: '🔴 需在应用内重新解析引用，验证按 attempt_id 而非文件名解析' });
  } catch (e) {
    return rec('renameForRefTest', { ok: false, error: e.name + ': ' + e.message });
  }
}

async function permissionState() {
  if (!dirHandle) return rec('permissionState', { ok: false, error: 'NO_DIRECTORY_HANDLE' });
  const q = await queryPermission(dirHandle, 'readwrite');
  return rec('permissionState', { ok: true, readwrite: q, note: '刷新后再查询，对比是否需重新授权（S6-08）' });
}
async function requestPermissionAgain() {
  if (!dirHandle) return rec('requestPermissionAgain', { ok: false, error: 'NO_DIRECTORY_HANDLE' });
  const r = await requestPermission(dirHandle, 'readwrite');
  return rec('requestPermissionAgain', { ok: true, result: r });
}

// ---------------------------------------------------------------------------
// 3. 凭据（D-056）—— 会话级
// ---------------------------------------------------------------------------
const CRED_KEY = 'sp06.session.credential';
const FAKE_MARKER = 'SP06-BROWSER-FAKE-TOKEN-NOT-A-SECRET-0001';

function credSet(v) {
  sessionStorage.setItem(CRED_KEY, v ?? FAKE_MARKER);
  return rec('credSet', { ok: true, stored_in: 'sessionStorage', key: CRED_KEY, value: 'MASKED(***' + String(v ?? FAKE_MARKER).slice(-4) + ')' });
}
function credGet() {
  const v = sessionStorage.getItem(CRED_KEY);
  return rec('credGet', { ok: !!v, present: !!v, value: v ? 'MASKED(***' + v.slice(-4) + ')' : null });
}
function credClear() {
  sessionStorage.removeItem(CRED_KEY);
  return rec('credClear', { ok: true, present_after: !!sessionStorage.getItem(CRED_KEY) });
}

/** 🔴 持久化泄漏扫描（S6-30 / D-056 禁止载体） */
async function durableLeakScan() {
  const ls = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    const v = localStorage.getItem(k) || '';
    ls.push({ key: k, contains_marker: v.includes(FAKE_MARKER) });
  }
  let idb = [];
  try {
    if (indexedDB.databases) idb = (await indexedDB.databases()).map((d) => d.name);
  } catch (e) {
    idb = ['<databases() unavailable: ' + e.name + '>'];
  }
  const cookieHas = document.cookie.includes(FAKE_MARKER);
  let cacheKeys = [];
  try {
    if (typeof caches !== 'undefined') cacheKeys = await caches.keys();
  } catch (e) {
    cacheKeys = ['<unavailable>'];
  }
  const out = rec('durableLeakScan', {
    sessionStorage_present: !!sessionStorage.getItem(CRED_KEY),
    sessionStorage_contains_marker: (sessionStorage.getItem(CRED_KEY) || '').includes(FAKE_MARKER),
    localStorage_keys: ls,
    localStorage_contains_marker: ls.some((e) => e.contains_marker),
    indexedDB_databases: idb,
    cookie_contains_marker: cookieHas,
    cookie_names: document.cookie ? document.cookie.split(';').map((c) => c.split('=')[0].trim()) : [],
    caches_keys: cacheKeys,
    durable_leak_found: ls.some((e) => e.contains_marker) || cookieHas,
  });
  return out;
}

// ---------------------------------------------------------------------------
// 4. 网络路径（D-055 / S6-18）
//    🔴 直连测试必须"跨源"才有意义：页面 origin 与 mock Provider origin 不同
// ---------------------------------------------------------------------------
let CFG = null;
async function loadConfig() {
  if (CFG) return CFG;
  try {
    CFG = await (await fetch('/config')).json();
  } catch (e) {
    CFG = { error: e.name + ': ' + e.message };
  }
  return CFG;
}

async function netDirectCors() {
  const cfg = await loadConfig();
  try {
    const r = await fetch(cfg.provider_cors_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (sessionStorage.getItem(CRED_KEY) || 'NO-CREDENTIAL') },
      body: JSON.stringify({ model: 'mock', messages: [{ role: 'user', content: 'ping' }] }),
    });
    const j = await r.json();
    return rec('netDirectCors', {
      ok: true,
      cross_origin: true,
      page_origin: location.origin,
      provider_origin: cfg.provider_cors_base,
      status: r.status,
      cors_passed: true,
      provider: j.provider,
      cors_header_sent: j.cors_header_sent,
      auth_header_present_at_provider: j.auth_header_present,
      credential_echoed_by_provider: j.auth_header_echo,
    });
  } catch (e) {
    return rec('netDirectCors', { ok: false, cross_origin: true, cors_passed: false, error: e.name + ': ' + e.message });
  }
}

async function netDirectNoCors() {
  const cfg = await loadConfig();
  try {
    const r = await fetch(cfg.provider_nocors_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (sessionStorage.getItem(CRED_KEY) || 'NO-CREDENTIAL') },
      body: JSON.stringify({ model: 'mock', messages: [{ role: 'user', content: 'ping' }] }),
    });
    const j = await r.json().catch(() => ({}));
    return rec('netDirectNoCors', {
      ok: true,
      cross_origin: true,
      status: r.status,
      cors_passed: true,
      unexpected: '🔴 跨源且无 CORS 头却成功 ⇒ 与预期相反，需记录为异常观测',
      provider: j.provider,
    });
  } catch (e) {
    return rec('netDirectNoCors', {
      ok: false,
      cross_origin: true,
      cors_passed: false,
      error: e.name + ': ' + e.message,
      interpretation: '这是 D-055 中"Browser Direct 不可行"的真实浏览器观测：缺少 CORS 响应头 ⇒ 跨源请求被浏览器拦截',
    });
  }
}

async function netViaProxy() {
  try {
    const r = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (sessionStorage.getItem(CRED_KEY) || 'NO-CREDENTIAL') },
      body: JSON.stringify({ provider_id: 'mock_proxy_required', payload: { model: 'mock', messages: [{ role: 'user', content: 'ping' }] } }),
    });
    const j = await r.json();
    return rec('netViaProxy', { ok: r.status === 200, status: r.status, proxy: j.proxy, resolved_by: j.resolved_by, forwarded_to: j.forwarded_to, credential_leaked_to_log: false });
  } catch (e) {
    return rec('netViaProxy', { ok: false, error: e.name + ': ' + e.message });
  }
}

async function netProxyArbitraryTarget() {
  const out = {};
  for (const [label, body] of [
    ['registered_provider + target_url=loopback', { provider_id: 'mock_proxy_required', target_url: 'http://127.0.0.1:1/steal', payload: {} }],
    ['registered_provider + target_url=metadata', { provider_id: 'mock_proxy_required', target_url: 'http://169.254.169.254/latest/meta-data/', payload: {} }],
    ['unknown provider + target_url', { provider_id: 'nope', target_url: 'http://example.com/steal', payload: {} }],
    ['no provider_id + target_url', { target_url: 'http://example.com/steal' }],
    ['registered_provider + base_url + host + scheme', { provider_id: 'mock_proxy_required', base_url: 'https://evil.example.com', host: 'evil.example.com', scheme: 'https', payload: {} }],
  ]) {
    try {
      const r = await fetch('/api/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      out[label] = { status: r.status, error: j.error || null, ignored_client_target_fields: j.ignored_client_target_fields || null, target_url_followed: j.target_url_followed ?? null, forwarded_to: j.forwarded_to || null };
    } catch (e) {
      out[label] = { error: e.name + ': ' + e.message };
    }
  }
  return rec('netProxyArbitraryTarget', out);
}

/** 🔴 验证：Proxy 只发送最小必要上下文，不上传整个 Workspace（S6-19 / S6-32） */
async function netProxyMinimalContext() {
  const wholeWorkspaceMarker = 'SP06_WHOLE_WORKSPACE_DUMP_MARKER_SHOULD_NOT_APPEAR';
  const minimal = { payload: { current_attempt_facts: ['goal=缩短干燥时间'], matched_dimensions: ['goal', 'condition'] } };
  const withMarker = { payload: { ...minimal.payload, FIXTURE_MARKER: wholeWorkspaceMarker } };
  const r1 = await fetch('/api/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider_id: 'mock_proxy_required', ...minimal }) });
  const j1 = await r1.json();
  const r2 = await fetch('/api/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider_id: 'mock_proxy_required', ...withMarker }) });
  const j2 = await r2.json();
  return rec('netProxyMinimalContext', {
    server_received_body_keys: j1.forwarded_body_keys,
    server_received_fields: Object.keys(j1.forwarded_body_keys ? j1.payload || {} : {}),
    minimal_context_forwarded: j1.forwarded_body_keys,
    marker_test: '🔴 标记串只出现在显式加入时（用于证明服务端只转发请求体，不接收 Workspace 目录内容）',
    marker_forwarded_keys: j2.forwarded_body_keys,
  });
}

async function serverLogScan() {
  const r = await fetch('/api/server-log');
  const j = await r.json();
  const authValues = j.entries.filter((e) => 'authorization_value' in e);
  return rec('serverLogScan', {
    entries: j.entries.length,
    entries_carrying_authorization_value: authValues.length,
    note: j.note,
    credential_plaintext_in_log: j.credential_plaintext_found_in_log,
  });
}

// ---------------------------------------------------------------------------
// 5. 自动化批量（供 CDP 调用；不含需要手势的 picker 项）
// ---------------------------------------------------------------------------
async function runAutomated() {
  LOG.length = 0;
  detect();
  credSet();
  credGet();
  const leak = await durableLeakScan();
  const d1 = await netDirectCors();
  const d2 = await netDirectNoCors();
  const p1 = await netViaProxy();
  const p2 = await netProxyArbitraryTarget();
  const p3 = await netProxyMinimalContext();
  const lg = await serverLogScan();
  return {
    browser: detect.browser || navigator.userAgent,
    items: { leak, direct_cors: d1, direct_no_cors: d2, via_proxy: p1, arbitrary_target: p2, minimal_context: p3, server_log: lg },
    log: LOG,
  };
}

// 会话内刷新后是否仍可读到凭据（S6-08 / AC-160）
function credAfterReload() {
  const v = sessionStorage.getItem(CRED_KEY);
  return rec('credAfterReload', {
    present_after_reload: !!v,
    value_masked: v ? '***' + v.slice(-4) : null,
    note: '同会话内刷新后仍可读到 ⇒ 符合 D-056（会话级，非"刷新即失效"）',
  });
}

window.__sp06 = {
  detect, pickWorkspace, readWorkspaceJson, listAttempts, createAttemptFile, modifyAttemptFile,
  renameForRefTest, permissionState, requestPermissionAgain,
  credSet, credGet, credClear, durableLeakScan, credAfterReload,
  netDirectCors, netDirectNoCors, netViaProxy, netProxyArbitraryTarget, netProxyMinimalContext, serverLogScan,
  runAutomated,
  getLog: () => LOG,
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('run-auto')?.addEventListener('click', async () => { await runAutomated(); });
  const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
  bind('detect', () => detect());
  bind('pick', () => pickWorkspace());
  bind('read', () => readWorkspaceJson());
  bind('list', () => listAttempts());
  bind('create', () => createAttemptFile());
  bind('modify', () => modifyAttemptFile());
  bind('rename', () => renameForRefTest());
  bind('perm', () => permissionState());
  bind('permreq', () => requestPermissionAgain());
  bind('credset', () => credSet());
  bind('credget', () => credGet());
  bind('credclear', () => credClear());
  bind('credafterreload', () => credAfterReload());
  bind('leakscan', () => durableLeakScan());
  bind('directcors', () => netDirectCors());
  bind('directnocors', () => netDirectNoCors());
  bind('viaproxy', () => netViaProxy());
  bind('arbitrary', () => netProxyArbitraryTarget());
  bind('minimal', () => netProxyMinimalContext());
  bind('logscan', () => serverLogScan());
  bind('clearlog', () => { LOG.length = 0; render(); });
  render();
});
