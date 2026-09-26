/**
 * S01-06 ｜ Web build - the static-asset step of `npm run build:web`.
 *
 * 🔴 WHY A SCRIPT IS NEEDED AT ALL: `tsc` emits the JavaScript but copies nothing else. The App
 *    Shell is made of three kinds of file - TypeScript (emitted by `tsc`), HTML (authored in
 *    `app/`) and CSS (authored in `src/ui/styles/`) - and the last two must land in `dist-web/`
 *    next to the emitted JavaScript or the browser has nothing to load.
 *
 * 🔴 IT ONLY COPIES. It compiles nothing, transforms nothing, bundles nothing and rewrites nothing:
 *    every asset it writes is byte-identical to its source. That is why the build needs no
 *    bundler, no plugin and no third-party dependency (task §47 / §48).
 *
 * 🔴 IT WRITES ONLY INSIDE `dist-web/`. The core build output (`dist/`), the test builds
 *    (`dist-test/`, `dist-proxy-test/`) and every `src/**` file are left untouched (task §52).
 *
 * Usage: node scripts/build-web.mjs                    (from the repository root)
 */

import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = join(REPOSITORY_ROOT, 'dist-web');

/** The static assets the App Shell needs, as `[source relative path, destination relative path]`. */
const STATIC_ASSETS = [
  ['app/index.html', 'index.html'],
  ['src/ui/styles/app.css', 'src/ui/styles/app.css'],
];

async function ensureEmittedJavaScriptExists() {
  const entry = join(OUTPUT_DIR, 'app', 'main.js');
  try {
    await stat(entry);
  } catch {
    throw new Error(
      'dist-web/app/main.js is missing. Run `tsc -p tsconfig.web.json` before this script ' +
        '(npm run build:web does exactly that).',
    );
  }
}

async function copyStaticAssets() {
  for (const [from, to] of STATIC_ASSETS) {
    const source = join(REPOSITORY_ROOT, from);
    const target = join(OUTPUT_DIR, to);
    await mkdir(dirname(target), { recursive: true });
    await cp(source, target);
    process.stdout.write(`  copied  ${from} -> dist-web/${to}\n`);
  }
}

/** Extra safety net: a stray asset accidentally left in `dist-web/` is removed, not shipped. */
async function listDirectorySafely(path) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await ensureEmittedJavaScriptExists();

  for (const entry of await listDirectorySafely(OUTPUT_DIR)) {
    if (entry.name === 'node_modules' || entry.name.endsWith('.js') || entry.name.endsWith('.map')) {
      continue;
    }
    if (entry.name === 'app' || entry.name === 'src' || entry.name === 'index.html') {
      continue;
    }
    await rm(join(OUTPUT_DIR, entry.name), { recursive: true, force: true });
  }

  await copyStaticAssets();

  const modules = await countFiles(OUTPUT_DIR, (name) => name.endsWith('.js'));
  const styles = await countFiles(OUTPUT_DIR, (name) => name.endsWith('.css'));
  process.stdout.write(
    `dist-web ready: ${modules} emitted module(s), ${styles} stylesheet(s), entry dist-web/index.html\n`,
  );
}

async function countFiles(root, predicate) {
  let total = 0;
  const walk = async (path) => {
    for (const entry of await listDirectorySafely(path)) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) {
        await walk(child);
      } else if (predicate(entry.name)) {
        total += 1;
      }
    }
  };
  await walk(root);
  return total;
}

await main();
