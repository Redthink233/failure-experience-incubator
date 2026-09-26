/**
 * SP-06 CDP BROWSER PROBE —— DISPOSABLE / NON-PRODUCTION
 * 用 Chrome / Edge 的 DevTools Protocol 在本机真实浏览器中执行可自动化的观测：
 *   · 浏览器版本与 secure context
 *   · File System Access API 能力存在性
 *   · sessionStorage 凭据：写入 → 刷新后仍可读（会话级）＋ 持久化载体泄漏扫描
 *   · CORS：直连带 CORS 的 mock provider / 直连无 CORS 的 mock provider（真实拦截观测）
 *   · Thin Proxy：provider_id 路径 / 任意 target 拒绝 / 最小上下文
 *   · 截图（Page.captureScreenshot）
 * 🔴 需要原生 folder picker 与用户手势的项（S6-01 / S6-04–S6-07 / S6-10）无法自动化 ⇒ MANUAL OBSERVATION。
 * 运行：node tools/cdp_probe.mjs chrome|edge [port]
 * 输出：results/cdp-<browser>.json、screenshots/<browser>-probe.png
 */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SP06 = path.resolve(__dirname, '..');
const RES = path.join(SP06, 'results');
const SHOTS = path.join(SP06, 'screenshots');

const BROWSERS = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
};

const which = (process.argv[2] || 'chrome').toLowerCase();
const exe = BROWSERS[which];
const SERVER_PORT = Number(process.argv[3] || 8791);
const CDP_PORT = Number(process.argv[4] || (which === 'chrome' ? 9331 : 9332));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('CDP timeout: ' + method));
        }
      }, 30000);
    });
  }
}

async function connectWs(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', (e) => reject(new Error('ws error: ' + (e.message || 'unknown'))), { once: true });
  });
  return ws;
}

async function main() {
  if (!exe) throw new Error('unknown browser key: ' + which);
  await fs.mkdir(RES, { recursive: true });
  await fs.mkdir(SHOTS, { recursive: true });

  const out = {
    browser_key: which,
    exe,
    NATURE: 'DISPOSABLE / NON-PRODUCTION',
    LIMITATION:
      '🔴 无法自动化的项：原生 folder picker 与用户手势（Select Workspace / 读 / 建 / 改 / 改名 / 撤销权限）⇒ MANUAL OBSERVATION。本探针只覆盖不需手势的观测。',
    steps: [],
  };

  // 0. 版本
  try {
    out.browser_version_cli = execFileSync(exe, ['--version'], { encoding: 'utf8' }).trim();
  } catch (e) {
    out.browser_version_cli = 'FAILED: ' + e.message;
  }

  // 1. 启动探针 HTTP 服务
  const server = spawn(process.execPath, [path.join(SP06, 'probe', 'server.mjs'), String(SERVER_PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
  out.server_spawn_pid = server.pid;
  await sleep(700);
  try {
    const h = await fetch(`http://127.0.0.1:${SERVER_PORT}/healthz`);
    out.probe_server = await h.json();
  } catch (e) {
    out.probe_server = { error: String(e.message) };
  }

  // 2. 启动浏览器（headless + 独立 profile）
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'sp06-' + which + '-'));
  out.browser_profile_dir = profile;
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-features=Translate',
    '--remote-debugging-port=' + CDP_PORT,
    '--user-data-dir=' + profile,
    '--window-size=1280,1400',
    'about:blank',
  ];
  const browser = spawn(exe, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  out.browser_spawn_pid = browser.pid;

  let version = null;
  for (let i = 0; i < 40; i++) {
    await sleep(300);
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      version = await r.json();
      break;
    } catch { /* retry */ }
  }
  out.cdp_version = version;
  if (!version) {
    out.status = 'INCONCLUSIVE';
    out.reason = 'CDP endpoint 未就绪（浏览器未能以 headless 模式启动）';
    await fs.writeFile(path.join(RES, `cdp-${which}.json`), JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify({ ok: false, status: out.status, reason: out.reason }, null, 2));
    try { server.kill(); } catch {}
    try { browser.kill(); } catch {}
    return;
  }

  // 3. 创建页面并连接
  let target;
  try {
    const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
    target = await r.json();
  } catch {
    const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
  }
  out.target = { id: target.id, type: target.type, url: target.url };

  const ws = await connectWs(target.webSocketDebuggerUrl);
  const cdp = new CDP(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const evaluate = async (expr, awaitPromise = false) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true, userGesture: false });
    if (r.exceptionDetails) return { __exception: r.exceptionDetails.text || JSON.stringify(r.exceptionDetails) };
    return r.result ? r.result.value : undefined;
  };

  // 4. 打开探针页面
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${SERVER_PORT}/` });
  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const ready = await evaluate('document.readyState === "complete" && !!window.__sp06');
    if (ready === true) break;
  }
  out.steps.push({ step: 'navigate probe page', ready: await evaluate('document.readyState') });

  // 5. 能力检测
  out.feature_detect = await evaluate('(function(){ window.__sp06.detect(); var l = window.__sp06.getLog(); return l[l.length-1].value; })()');
  out.steps.push({ step: 'feature detect', result: out.feature_detect });

  // 6. 自动化批量（凭据 / 泄漏 / CORS / Proxy）
  const auto = await evaluate('window.__sp06.runAutomated()', true);
  out.automated = auto;

  // 7. 刷新后凭据是否仍在（同会话）
  await cdp.send('Page.reload', { ignoreCache: false });
  for (let i = 0; i < 30; i++) {
    await sleep(250);
    const ready = await evaluate('document.readyState === "complete" && !!window.__sp06');
    if (ready === true) break;
  }
  out.after_reload = await evaluate('window.__sp06.credAfterReload()');

  // 8. 清除凭据（模拟"会话结束后不再可用"；真实"关闭标签页/浏览器"由人工观测）
  out.after_clear = await evaluate('window.__sp06.credClear()');

  // 9. 截图
  try {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    const f = path.join(SHOTS, `${which}-probe.png`);
    await fs.writeFile(f, Buffer.from(shot.data, 'base64'));
    out.screenshot = f;
  } catch (e) {
    out.screenshot = 'FAILED: ' + e.message;
  }

  // 10. 收尾判断
  const leak = out.automated?.items?.leak;
  const dCors = out.automated?.items?.direct_cors;
  const dNoCors = out.automated?.items?.direct_no_cors;
  const proxy = out.automated?.items?.via_proxy;
  const arb = out.automated?.items?.arbitrary_target;
  const lg = out.automated?.items?.server_log;
  out.verdicts = {
    secure_context: out.feature_detect?.isSecureContext === true,
    fs_access_api_present: out.feature_detect?.hasShowDirectoryPicker === true,
    credential_session_scoped_after_reload: out.after_reload?.present_after_reload === true,
    credential_durable_leak_found: leak?.durable_leak_found === true,
    direct_cors_passed: dCors?.cors_passed === true,
    direct_no_cors_blocked_by_browser: dNoCors?.cors_passed === false,
    proxy_path_ok: proxy?.ok === true,
    proxy_arbitrary_target_rejected_or_ignored: !!arb && Object.values(arb).every((v) => v.target_url_followed === false || v.status === 400 || v.error),
    server_log_credential_plaintext: lg?.credential_plaintext_in_log === true,
    credential_cleared_after_clear: out.after_clear?.present_after === false,
  };
  out.status = 'COMPLETED';

  await fs.writeFile(path.join(RES, `cdp-${which}.json`), JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ok: true, browser: out.browser_version_cli, verdicts: out.verdicts }, null, 2));

  try { ws.close(); } catch {}
  try { browser.kill(); } catch {}
  try { server.kill(); } catch {}
}

main().catch(async (e) => {
  console.error('CDP PROBE FAILED', e);
  process.exit(1);
});
