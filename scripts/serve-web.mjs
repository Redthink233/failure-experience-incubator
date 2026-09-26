/**
 * S01-06 ｜ Local static server for the App Shell (`npm run dev:web` / `npm run preview:web`).
 *
 * 🔴 WHY NOT VITE: Vite would add a dependency tree and a dev-only transform layer for a project
 *    whose browser output is already standard ESM. `node:http` plus `node:fs` serves exactly the
 *    same bytes the build produced, with no dependency to audit (task §47).
 * 🔴 IT SERVES `dist-web/` ONLY and it resolves every request inside that directory - a request for
 *    `/../../package.json` is refused instead of escaping the web root.
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

function resolveWithinWebRoot(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const relativePath = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/u, '');
  const candidate = normalize(join(WEB_ROOT, relativePath));
  if (candidate !== WEB_ROOT && !candidate.startsWith(WEB_ROOT + sep)) {
    return null;
  }
  return candidate;
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

const PORT = portFrom(process.argv.slice(2));

const server = createServer(async (request, response) => {
  const target = resolveWithinWebRoot(request.url ?? '/');
  if (target === null) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Refused: the requested path is outside the web root.');
    return;
  }

  const body = await readIfFile(target);
  if (body === null) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found in dist-web. Did you run `npm run build:web`?');
    return;
  }

  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(target)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  response.end(body);
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(
    `App Shell served from dist-web on http://127.0.0.1:${PORT}/ (local preview only)\n`,
  );
});
