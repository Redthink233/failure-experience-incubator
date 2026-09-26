/**
 * S01-06 ｜ Local static server for the App Shell (`npm run dev:web` / `npm run preview:web`).
 *
 * 🔴 WHY NOT VITE: Vite would add a dependency tree and a dev-only transform layer for a project
 *    whose browser output is already standard ESM. `node:http` plus `node:fs` serves exactly the
 *    same bytes the build produced, with no dependency to audit (task §47).
 * 🔴 IT SERVES `dist-web/` ONLY and it resolves every request inside that directory - a request for
 *    `/../../package.json` is refused instead of escaping the web root.
 *
 * 🔴 FINAL-RAPID-D ② - A MALFORMED REQUEST TARGET MUST NEVER TAKE THE DEV SERVER DOWN.
 *    `decodeURIComponent` throws a `URIError` on invalid percent-encoding (a lone `%`, a truncated
 *    `%E0%A4%A`, ...). The request target arrives verbatim from the socket, so it is fully
 *    user-controlled input: a bad one is answered with `400 Bad Request` and the server keeps
 *    serving the next request. The whole handler is inside one `try` for the same reason - an
 *    unforeseen failure becomes a `500` for THAT request, never an `unhandledRejection` that ends
 *    the process.
 *
 * 🔴 TESTABLE WITHOUT A PORT: `createAppShellServer()` is a pure factory. Importing this module
 *    starts nothing and binds nothing; only running it as the entry point does. That is what lets
 *    the hardening tests drive the real handler (web root included) with an ephemeral port.
 *
 * ⚠️ THIS IS A LOCAL PREVIEW SERVER, NOT A DEPLOYMENT. Serving on `localhost` proves the build
 *    loads; it proves nothing about HTTPS, CORS, hosting or a real provider call, and the S01-06
 *    report must not claim otherwise.
 *
 * Usage: node scripts/serve-web.mjs [--port 5173]
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_ROOT = join(REPOSITORY_ROOT, 'dist-web');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function portFrom(argv) {
  const index = argv.indexOf('--port');
  if (index === -1) {
    return 5173;
  }
  const parsed = Number.parseInt(argv[index + 1] ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : 5173;
}

/**
 * Maps a request target onto a file inside the web root.
 *
 * 🔴 Three DISTINGUISHABLE outcomes - a malformed target is a client error (`400`), an escaping
 *    target is a refusal (`403`), and a well-formed in-root target is a file lookup. Collapsing
 *    the first two into one answer would either report a client mistake as a refusal or, worse,
 *    let a `URIError` escape the handler.
 */
function resolveWithinWebRoot(urlPath, webRoot) {
  const raw = urlPath.split('?')[0].split('#')[0];

  let decoded;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* `URIError`: the target is not valid percent-encoding. Nothing was read and nothing was served. */
    return { kind: 'malformed' };
  }

  const relativePath = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/u, '');
  const candidate = normalize(join(webRoot, relativePath));
  if (candidate !== webRoot && !candidate.startsWith(webRoot + sep)) {
    return { kind: 'outside' };
  }
  return { kind: 'inside', path: candidate };
}

async function readIfFile(path) {
  try {
    const info = await stat(path);
    if (!info.isFile()) {
      return null;
    }
    return await readFile(path);
  } catch {
    return null;
  }
}

/**
 * Writes a plain-text answer. Guarded against a second write: once a status line has been sent the
 * response is left alone, so an error surfaced late can never scramble a response already served.
 */
function sendText(response, status, body, contentType = 'text/plain; charset=utf-8') {
  if (response.headersSent || response.writableEnded) {
    return;
  }
  response.writeHead(status, { 'content-type': contentType, 'cache-control': 'no-store' });
  response.end(body);
}

async function respond(request, response, webRoot, contentTypes) {
  try {
    const target = resolveWithinWebRoot(request.url ?? '/', webRoot);

    if (target.kind === 'malformed') {
      sendText(
        response,
        400,
        'Bad request: the URL is not valid percent-encoding. The file was not read.',
      );
      return;
    }

    if (target.kind === 'outside') {
      sendText(response, 403, 'Refused: the requested path is outside the web root.');
      return;
    }

    const body = await readIfFile(target.path);
    if (body === null) {
      sendText(response, 404, 'Not found in dist-web. Did you run `npm run build:web`?');
      return;
    }

    if (response.headersSent || response.writableEnded) {
      return;
    }
    response.writeHead(200, {
      'content-type': contentTypes[extname(target.path)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(body);
  } catch {
    /*
     * Last line of defence. It deliberately does not re-throw: a single unservable request must not
     * end the process, and it must not be reported as a success either.
     */
    sendText(
      response,
      500,
      'The local preview server could not serve this request. The server is still running.',
    );
  }
}

/**
 * Creates the preview server. Pure factory: nothing is bound until the caller calls `listen`.
 *
 * @param {{ webRoot?: string, contentTypes?: Readonly<Record<string, string>> }} [options]
 *        `webRoot` defaults to `dist-web/` next to this script. It exists so the hardening tests
 *        can point the REAL handler at a throwaway directory instead of the deliverable output.
 */
export function createAppShellServer(options = {}) {
  const webRoot = resolve(options.webRoot ?? WEB_ROOT);
  const contentTypes = options.contentTypes ?? CONTENT_TYPES;

  return createServer((request, response) => {
    respond(request, response, webRoot, contentTypes).catch(() => {
      sendText(response, 500, 'The local preview server could not serve this request.');
    });
  });
}

/** True when this module IS the process entry point (`node scripts/serve-web.mjs`). */
function invokedDirectly() {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  const self = resolve(fileURLToPath(import.meta.url));
  const invoked = resolve(entry);
  return process.platform === 'win32'
    ? invoked.toLowerCase() === self.toLowerCase()
    : invoked === self;
}

if (invokedDirectly()) {
  const PORT = portFrom(process.argv.slice(2));
  const server = createAppShellServer();

  /*
   * A bind failure (`EADDRINUSE`, no permission) is reported as a clear message and a non-zero exit
   * instead of an unhandled `'error'` event that ends the process with a stack trace.
   */
  server.on('error', (error) => {
    process.stderr.write(
      `The local preview server could not start: ${error?.message ?? String(error)}\n`,
    );
    process.exitCode = 1;
  });

  server.listen(PORT, '127.0.0.1', () => {
    const address = server.address();
    const boundPort =
      address !== null && typeof address === 'object' ? address.port : PORT;
    process.stdout.write(
      `App Shell served from dist-web on http://127.0.0.1:${boundPort}/ (local preview only)\n`,
    );
  });
}
