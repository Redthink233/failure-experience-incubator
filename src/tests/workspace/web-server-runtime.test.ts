/**
 * IMPLEMENTATION INVARIANT ｜ FINAL-RAPID-D ② - a malformed request target never takes the server down.
 *
 * The bug this file pins down: `decodeURIComponent` throws a `URIError` on invalid percent-encoding
 * (a lone `%`, a truncated `%E0%A4%A`, ...). The request target arrives verbatim from the socket, so
 * it is fully user-controlled input - and an escaping exception would end the local dev server
 * instead of answering the one request that was wrong.
 *
 * 🔴 THE REAL HANDLER IS DRIVEN, NOT A COPY. `scripts/serve-web.mjs` is imported and its server is
 *    started on an ephemeral port with a throwaway web root, so the very code that serves the App
 *    Shell is what answers these requests - including the path resolution and the escape refusal.
 *
 * Contract references used by this file (it creates NO new AC): task §47 (`node:http` + `node:fs`
 * only, no dependency), §52 / the S01-06 note that this is a LOCAL PREVIEW server and nothing more.
 */

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { request as httpRequest } from 'node:http';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SERVE_SCRIPT_URL = new URL('../../../scripts/serve-web.mjs', import.meta.url).href;

/** The minimal surface this test needs from `scripts/serve-web.mjs`. */
interface AppShellServer {
  listen(port: number, host: string, callback: () => void): void;
  close(callback: () => void): void;
  address(): { readonly port: number } | null;
  readonly listening: boolean;
  /** Stops a socket that is still open from holding the process open past the teardown. */
  unref(): void;
  /** Available since Node 18.2; called defensively so the teardown can never wait forever. */
  closeAllConnections?(): void;
}

interface AppShellModule {
  createAppShellServer(options?: { readonly webRoot?: string }): AppShellServer;
}

const INDEX_MARKER = '<!doctype html><p>fixture index</p>';
const STYLESHEET_MARKER = 'body { color: #abcdef; }\n';
const OUTSIDE_SECRET = 'SECRET-OUTSIDE-THE-WEB-ROOT';

/** The request targets that make `decodeURIComponent` throw. */
const MALFORMED_TARGETS = ['/%', '/%E0%A4%A', '/%zz', '/a%', '/%E0%A4%A%', '/%2'];

interface RawResponse {
  readonly status: number;
  readonly contentType: string;
  readonly body: string;
}

/** Sends a request with a RAW target: the path is never re-encoded by the client. */
function getRawPath(port: number, rawPath: string): Promise<RawResponse> {
  return new Promise((resolvePromise, rejectPromise) => {
    const request = httpRequest(
      /* `agent: false`: a fresh connection per request, so the teardown cannot wait on keep-alive. */
      { host: '127.0.0.1', port, path: rawPath, method: 'GET', agent: false },
      (response) => {
        const chunks: string[] = [];
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => {
          chunks.push(chunk);
        });
        response.on('end', () => {
          resolvePromise({
            status: response.statusCode ?? 0,
            contentType: String(response.headers['content-type'] ?? ''),
            body: chunks.join(''),
          });
        });
      },
    );
    request.on('error', rejectPromise);
    request.end();
  });
}

describe('FINAL-RAPID-D ② ｜ a malformed request target is a 400, not a crash', () => {
  let fixtureRoot = '';
  let webRoot = '';
  let server: AppShellServer | null = null;
  let port = 0;

  before(async () => {
    fixtureRoot = mkdtempSync(join(tmpdir(), 'frd-web-serve-'));
    webRoot = join(fixtureRoot, 'web-root');
    mkdirSync(join(webRoot, 'src', 'ui', 'styles'), { recursive: true });
    writeFileSync(join(webRoot, 'index.html'), INDEX_MARKER, 'utf8');
    writeFileSync(join(webRoot, 'src', 'ui', 'styles', 'app.css'), STYLESHEET_MARKER, 'utf8');
    /* One level ABOVE the web root: the escape attempts must never reach it. */
    writeFileSync(join(fixtureRoot, 'secret.txt'), OUTSIDE_SECRET, 'utf8');

    /*
     * 🔴 Importing the module must NOT start a server: it is a script, and only running it as the
     *    entry point binds a port. That is what makes it drivable from a test at all.
     */
    const module = (await import(SERVE_SCRIPT_URL)) as AppShellModule;
    assert.equal(typeof module.createAppShellServer, 'function');

    server = module.createAppShellServer({ webRoot });
    await new Promise<void>((resolvePromise) => {
      server?.listen(0, '127.0.0.1', resolvePromise);
    });
    const address = server.address();
    assert.ok(address !== null, 'the fixture server must be bound');
    port = address.port;
  });

  after(async () => {
    if (server !== null) {
      const running = server;
      /*
       * 🔴 The teardown must not be able to hang the suite. `close()` waits for open connections, so a
       *    lingering one would keep this test file alive indefinitely; the connections are dropped
       *    first, and the listener is unreferenced so it cannot hold the process open either way.
       */
      running.closeAllConnections?.();
      await new Promise<void>((resolvePromise) => {
        running.close(() => resolvePromise());
      });
      running.unref();
    }
    if (fixtureRoot.length > 0) {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('IMPLEMENTATION INVARIANT (SERVER-01): malformed percent-encoding is answered with 400', async () => {
    for (const target of MALFORMED_TARGETS) {
      const response = await getRawPath(port, target);
      assert.equal(response.status, 400, `expected 400 for "${target}", got ${response.status}`);
      /* The refusal must be a plain client error - not a file, and never a success. */
      assert.ok(response.body.length > 0);
      assert.ok(!response.body.includes(OUTSIDE_SECRET));
    }
  });

  it('IMPLEMENTATION INVARIANT (SERVER-02): the server keeps serving normal requests afterwards', async () => {
    /* Interleave: the failure of one request must not affect the next one, in either direction. */
    assert.equal((await getRawPath(port, '/%')).status, 400);

    const index = await getRawPath(port, '/');
    assert.equal(index.status, 200);
    assert.equal(index.contentType, 'text/html; charset=utf-8');
    assert.equal(index.body, INDEX_MARKER);

    assert.equal((await getRawPath(port, '/%E0%A4%A')).status, 400);

    const stylesheet = await getRawPath(port, '/src/ui/styles/app.css');
    assert.equal(stylesheet.status, 200);
    assert.equal(stylesheet.contentType, 'text/css; charset=utf-8');
    assert.equal(stylesheet.body, STYLESHEET_MARKER);

    /* A malformed target still behaves the same after a batch of successful requests. */
    assert.equal((await getRawPath(port, '/%zz')).status, 400);
    assert.equal((await getRawPath(port, '/')).status, 200);

    /* 🔴 And the listener itself never left: the process is still serving. */
    assert.equal(server?.listening, true);
  });

  it('IMPLEMENTATION INVARIANT: an escaping target is refused, and a missing file is a 404', async () => {
    const escaped = await getRawPath(port, '/%2e%2e/secret.txt');
    assert.equal(escaped.status, 403);
    assert.ok(!escaped.body.includes(OUTSIDE_SECRET), 'the web root must not leak outwards');

    const deepEscape = await getRawPath(port, '/%2e%2e/%2e%2e/%2e%2e/secret.txt');
    assert.notEqual(deepEscape.status, 200);
    assert.ok(!deepEscape.body.includes(OUTSIDE_SECRET));

    const missing = await getRawPath(port, '/missing-module.js');
    assert.equal(missing.status, 404);
  });
});
