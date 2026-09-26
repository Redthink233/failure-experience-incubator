/**
 * S01-06 ｜ Web build - the second step of `npm run build:web`.
 *
 * 🔴 WHY A SCRIPT IS NEEDED AT ALL: `tsc` emits the JavaScript but copies nothing else. The App
 *    Shell is made of three kinds of file - TypeScript (emitted by `tsc`), HTML (authored in
 *    `app/`) and CSS (authored in `src/ui/styles/`) - and the last two must land in `dist-web/`
 *    next to the emitted JavaScript or the browser has nothing to load.
 *
 * 🔴 FINAL-RAPID-D ① - `dist-web/` IS WIPED AND REBUILT, NOT PATCHED IN PLACE.
 *    `tsc` never removes the output of a source file that has been deleted or renamed, so a build
 *    that only ADDS files leaves GHOST OUTPUT behind: `dist-web/` keeps shipping modules and
 *    stylesheets whose sources no longer exist, and the deliverable directory silently disagrees
 *    with the source tree. This script therefore starts by REMOVING `dist-web/` entirely and then
 *    rebuilds all three kinds of file from scratch (emit -> verify -> copy), so the output of a
 *    build is a pure function of the current sources.
 *    ⇒ The emit step is now performed HERE, because the wipe has to happen BEFORE `tsc` runs and
 *      the only place this worker owns is this script (`package.json` and `tsconfig.web.json` are
 *      frozen for this task). The leading `tsc` of `npm run build:web` is consequently a redundant
 *      second compile of the same project - a deliberate, disclosed cost, and removing it is an
 *      Integrator-level follow-up (it needs a `package.json` edit).
 *
 * 🔴 THE REMOVAL IS GUARDED. A recursive delete whose target is computed at runtime is exactly the
 *    kind of code that can erase a repository, so the target is verified to be the IMMEDIATE
 *    `dist-web` child of this repository root before anything is touched (`assertSafeToClean`) -
 *    never the repository root, never a filesystem root, never reached through `..`.
 *
 * 🔴 IT WRITES ONLY INSIDE `dist-web/`. The core build output (`dist/`), the test builds
 *    (`dist-test/`, `dist-proxy-test/`) and every `src/**` file are left untouched (task §52).
 *
 * Usage: node scripts/build-web.mjs                    (from the repository root)
 */

import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { spawn as spawnChild } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The output directory name. The wipe target is verified against this literal before use. */
const OUTPUT_DIRECTORY_NAME = 'dist-web';
const OUTPUT_DIR = join(REPOSITORY_ROOT, OUTPUT_DIRECTORY_NAME);

/** The project this script drives for the emit step. */
const WEB_TSCONFIG = 'tsconfig.web.json';
const TYPESCRIPT_ENTRY = join(REPOSITORY_ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

/** The static assets the App Shell needs, as `[source relative path, destination relative path]`. */
const STATIC_ASSETS = [
  ['app/index.html', 'index.html'],
  ['src/ui/styles/app.css', 'src/ui/styles/app.css'],
];

/* ------------------------------------------------------------------ *
 * 0. Guards
 * ------------------------------------------------------------------ */

/**
 * Refuses to clean anything that is not the immediate `dist-web` child of this repository root.
 *
 * The checks are deliberately redundant: each one alone would already be sufficient, and a hard
 * failure is always preferable to a recursive delete aimed at the wrong directory.
 */
function assertSafeToClean() {
  const problems = [];

  if (REPOSITORY_ROOT.length === 0) {
    problems.push('the repository root resolved to an empty path');
  }
  if (dirname(REPOSITORY_ROOT) === REPOSITORY_ROOT) {
    problems.push(`the repository root "${REPOSITORY_ROOT}" is a filesystem root`);
  }
  if (/^[a-z]:[\\/]?$/iu.test(REPOSITORY_ROOT)) {
    problems.push(`the repository root "${REPOSITORY_ROOT}" is a drive root`);
  }
  if (outputDirectoryName() !== OUTPUT_DIRECTORY_NAME) {
    problems.push(`the output directory is named "${outputDirectoryName()}"`);
  }
  if (dirname(OUTPUT_DIR) !== REPOSITORY_ROOT) {
    problems.push('the output directory is not an immediate child of the repository root');
  }
  if (OUTPUT_DIR !== join(REPOSITORY_ROOT, OUTPUT_DIRECTORY_NAME)) {
    problems.push('the output directory is not the derived repository-root child');
  }
  if (OUTPUT_DIR === REPOSITORY_ROOT) {
    problems.push('the output directory IS the repository root');
  }
  if (!OUTPUT_DIR.startsWith(REPOSITORY_ROOT + sep)) {
    problems.push(`"${OUTPUT_DIR}" is not strictly inside "${REPOSITORY_ROOT}"`);
  }

  if (problems.length > 0) {
    throw new Error(
      `Refusing to clean "${OUTPUT_DIR}": ${problems.join('; ')}. Nothing was removed.`,
    );
  }
}

/** Case-insensitive on Windows, exact elsewhere - Windows directory names are not case sensitive. */
function outputDirectoryName() {
  return process.platform === 'win32'
    ? basename(OUTPUT_DIR).toLowerCase()
    : basename(OUTPUT_DIR);
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * 1. Clean
 * ------------------------------------------------------------------ */

/** Removes the whole previous output. Verified inside, and verified to be really gone. */
async function cleanOutputDirectory() {
  assertSafeToClean();
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  if (await pathExists(OUTPUT_DIR)) {
    throw new Error(
      `"${OUTPUT_DIR}" still exists after the clean. A partially removed output must not be built ` +
        'on, so the build was aborted.',
    );
  }
  process.stdout.write(`  cleaned ${OUTPUT_DIRECTORY_NAME}/ (removed in full before the rebuild)\n`);
}

/* ------------------------------------------------------------------ *
 * 2. Rebuild
 * ------------------------------------------------------------------ */

/**
 * Emits the browser modules from scratch.
 *
 * 🔴 It runs the repository's OWN TypeScript with the repository's OWN `tsconfig.web.json`: no
 *    bundler, no extra dependency and no transformed bytes (task §47 / §48).
 *
 * 🔴 `process.execPath` is used on purpose. The machine has more than one Node on `PATH`, and the
 *    compiler must run under the SAME interpreter as `npm run build:web` so its output matches the
 *    verified baseline.
 */
async function emitBrowserModules() {
  if (!(await pathExists(TYPESCRIPT_ENTRY))) {
    throw new Error(
      `The TypeScript compiler entry "${TYPESCRIPT_ENTRY}" is missing, so ` +
        `${OUTPUT_DIRECTORY_NAME}/ could not be rebuilt after the clean. No output was produced.`,
    );
  }

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawnChild(process.execPath, [TYPESCRIPT_ENTRY, '-p', WEB_TSCONFIG], {
      cwd: REPOSITORY_ROOT,
      stdio: 'inherit',
    });
    child.once('error', rejectPromise);
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new Error(
          `tsc -p ${WEB_TSCONFIG} failed (exit ${code ?? `signal ${String(signal)}`}). The web ` +
            `build was aborted and ${OUTPUT_DIRECTORY_NAME}/ holds no usable output.`,
        ),
      );
    });
  });
}

/** Post-condition of the emit step: without the entry module there is nothing for the browser. */
async function ensureEmittedJavaScriptExists() {
  const entry = join(OUTPUT_DIR, 'app', 'main.js');
  if (!(await pathExists(entry))) {
    throw new Error(
      `dist-web/app/main.js is missing after the rebuild. Run \`tsc -p ${WEB_TSCONFIG}\` ` +
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

/* ------------------------------------------------------------------ *
 * 3. Report
 * ------------------------------------------------------------------ */

async function listDirectorySafely(path) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch {
    return [];
  }
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

async function main() {
  await cleanOutputDirectory();
  await emitBrowserModules();
  await ensureEmittedJavaScriptExists();
  await copyStaticAssets();

  const modules = await countFiles(OUTPUT_DIR, (name) => name.endsWith('.js'));
  const styles = await countFiles(OUTPUT_DIR, (name) => name.endsWith('.css'));
  process.stdout.write(
    `dist-web ready: ${modules} emitted module(s), ${styles} stylesheet(s), entry dist-web/index.html\n`,
  );
}

await main();
