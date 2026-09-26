/**
 * IMPLEMENTATION INVARIANT ｜ FINAL-RAPID-D ① - `dist-web/` is REBUILT, never patched in place.
 *
 * The bug this file pins down: `tsc` does not remove the output of a source file that has been
 * deleted or renamed, so a build that only ADDS files keeps shipping GHOST OUTPUT - modules and
 * stylesheets whose sources no longer exist stay in the deliverable directory, and that directory
 * silently disagrees with the source tree.
 *
 * 🔴 THE REAL SCRIPT IS RUN, TWICE, AGAINST A THROWAWAY FIXTURE REPOSITORY. `scripts/build-web.mjs`
 *    is copied VERBATIM from the repository (so the test can never drift from it) into a temporary
 *    fixture with the same shape as the real one: `app/`, `src/ui/styles/`, `tsconfig.web.json`,
 *    `node_modules/typescript/bin/tsc` and a repository-root sentinel. Building the REAL repository
 *    twice from inside the test suite would wipe and rebuild `dist-web/` while other test files (the
 *    S01-06 bundle audit) are reading it, and the fixture keeps this file independent instead.
 *
 * 🔴 THE COMPILER IN THE FIXTURE IS A DELIBERATE STUB, and this is the one thing the test does not
 *    take from the repository. `build-web.mjs` needs exactly two things from `tsc`: a zero exit code,
 *    and the emitted entry module on disk afterwards - so the stub implements precisely that contract
 *    (`-p <project>` -> one `.js` + `.js.map` per source, exit 0) and nothing else. The reason is
 *    cost and stability, not convenience: copying the real 22 MB compiler into the fixture and
 *    spawning two nested compilers inside `npm test` made the suite take minutes under the
 *    parallel-worktree load, while proving nothing about THIS script that the stub does not.
 *    The real emit is exercised end-to-end against the real repository by `npm run build:web`
 *    (144 emitted modules, exit 0), which is what the FINAL-RAPID-D report records - and the second
 *    case below asserts statically that the script really drives the repository's OWN compiler and
 *    its OWN `tsconfig.web.json`, so the stub can never hide a drift in that wiring.
 *
 * Contract references used by this file (it creates NO new AC): task §47 / §48 (no bundler, no extra
 * dependency), §52 (`dist-web/` is a separate deliverable directory the other builds never touch).
 */

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(HERE, '../../..');

const BUILD_SCRIPT = 'scripts/build-web.mjs';
const TSCONFIG = 'tsconfig.web.json';
const SENTINEL = '.repository-root-sentinel.txt';
const OUTPUT = 'dist-web';

/** What the stub compiler writes into every emitted module, so a rebuild is provable. */
const STUB_EMIT_MARKER = '// emitted by the fixture stub compiler';

/** The outputs the fixture sources MUST produce - nothing more, nothing less. */
const EXPECTED_OUTPUTS = ['app/main.js', 'app/main.js.map', 'index.html', 'src/ui/styles/app.css'];

/**
 * The stub `tsc` (CommonJS: an extensionless file outside any `"type": "module"` package).
 * It implements the only contract `build-web.mjs` relies on.
 */
const STUB_COMPILER_SOURCE = `'use strict';
const { mkdirSync, readdirSync, readFileSync, writeFileSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');

const args = process.argv.slice(2);
const projectIndex = args.indexOf('-p');
if (projectIndex === -1 || args[projectIndex + 1] === undefined) {
  process.stderr.write('fixture stub compiler: expected "-p <project>"\\n');
  process.exit(2);
}

const projectPath = resolve(args[projectIndex + 1]);
const projectRoot = dirname(projectPath);
const config = JSON.parse(readFileSync(projectPath, 'utf8'));
const outDirName = String(config.compilerOptions.outDir);
const outDir = join(projectRoot, outDirName);

const sources = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === outDirName) {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(path);
    } else if (entry.name.endsWith('.ts')) {
      sources.push(path);
    }
  }
};
walk(projectRoot);

for (const source of sources) {
  const target = join(outDir, source.slice(projectRoot.length + 1).replace(/\\.ts$/, '.js'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, '${STUB_EMIT_MARKER}\\n');
  writeFileSync(target + '.map', '{}\\n');
}

process.exit(0);
`;

/* ------------------------------------------------------------------ *
 * Fixture helpers
 * ------------------------------------------------------------------ */

function writeFixtureFile(root: string, relative: string, contents: string): void {
  const target = join(root, ...relative.split('/'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, 'utf8');
}

/** POSIX-relative paths of every file under `root`, sorted. */
function listFiles(root: string): readonly string[] {
  const files: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile()) {
        files.push(path.slice(root.length + 1).split('\\').join('/'));
      }
    }
  };
  walk(root);
  return files.sort();
}

interface BuildRun {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function runBuild(fixtureRoot: string): BuildRun {
  const result = spawnSync(process.execPath, [BUILD_SCRIPT], {
    cwd: fixtureRoot,
    encoding: 'utf8',
    /* A build of FIVE files: any result beyond a minute is a fault, not slowness. */
    timeout: 60_000,
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/**
 * A repository-shaped fixture: the same `app/` + `src/ui/**` scopes the real `tsconfig.web.json`
 * covers, the repository's OWN build script, and the stub compiler described above.
 */
function createFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'frd-web-build-'));

  writeFixtureFile(root, BUILD_SCRIPT, readFileSync(join(REPOSITORY_ROOT, BUILD_SCRIPT), 'utf8'));
  writeFixtureFile(root, 'node_modules/typescript/bin/tsc', STUB_COMPILER_SOURCE);
  writeFixtureFile(
    root,
    TSCONFIG,
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          types: [],
          module: 'ES2022',
          moduleResolution: 'bundler',
          strict: true,
          noEmit: false,
          outDir: OUTPUT,
          rootDir: '.',
          declaration: false,
          declarationMap: false,
          sourceMap: true,
          skipLibCheck: true,
        },
        include: ['src/ui/**/*.ts', 'src/browser/**/*.ts', 'app/**/*.ts'],
      },
      null,
      2,
    )}\n`,
  );
  writeFixtureFile(root, 'app/main.ts', "export const entry_module = 'fixture entry module';\n");
  writeFixtureFile(
    root,
    'app/index.html',
    '<!doctype html>\n<script type="module" src="./app/main.js"></script>\n',
  );
  writeFixtureFile(root, 'src/ui/styles/app.css', 'body { color: #123456; }\n');
  writeFixtureFile(
    root,
    SENTINEL,
    'This file lives at the fixture repository root and must survive every build.\n',
  );

  return root;
}

/* ------------------------------------------------------------------ *
 * BUILD-01
 * ------------------------------------------------------------------ */

describe('FINAL-RAPID-D ① ｜ the web build output is rebuilt, never patched in place', () => {
  let fixture = '';

  before(() => {
    fixture = createFixture();
  });

  after(() => {
    if (fixture.length > 0) {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('IMPLEMENTATION INVARIANT (BUILD-01): an artifact left by a previous build disappears from the next one', () => {
    const first = runBuild(fixture);
    assert.equal(first.status, 0, `build A failed: ${first.stderr}${first.stdout}`);

    const outputRoot = join(fixture, OUTPUT);
    assert.deepEqual(
      listFiles(outputRoot),
      EXPECTED_OUTPUTS,
      'build A must produce exactly the outputs of the fixture sources',
    );
    /* The emit step really ran: the module carries the compiler's own output. */
    assert.equal(
      readFileSync(join(outputRoot, 'app', 'main.js'), 'utf8').trim(),
      STUB_EMIT_MARKER,
    );

    /*
     * The ghosts. Every shape a stale output really takes: an emitted module whose source is gone,
     * a source map of that module, a stylesheet that is neither emitted nor copied any more, and a
     * whole directory that used to belong to the output.
     */
    writeFixtureFile(fixture, `${OUTPUT}/app/ghost-module.js`, 'export const ghost = true;\n');
    writeFixtureFile(fixture, `${OUTPUT}/app/ghost-module.js.map`, '{}\n');
    writeFixtureFile(fixture, `${OUTPUT}/src/ui/styles/ghost.css`, 'body { color: red; }\n');
    writeFixtureFile(fixture, `${OUTPUT}/legacy/old-module.js`, 'export const old = true;\n');
    assert.ok(existsSync(join(outputRoot, 'app', 'ghost-module.js')));

    const second = runBuild(fixture);
    assert.equal(second.status, 0, `build B failed: ${second.stderr}${second.stdout}`);

    /* 🔴 BUILD-01: the stale artifacts are GONE, and the real output is exactly as before. */
    assert.deepEqual(listFiles(outputRoot), EXPECTED_OUTPUTS);
    assert.equal(existsSync(join(outputRoot, 'legacy')), false, 'the stale directory must go too');
    assert.equal(existsSync(join(outputRoot, 'app', 'ghost-module.js')), false);
    assert.equal(existsSync(join(outputRoot, 'src', 'ui', 'styles', 'ghost.css')), false);

    /* The re-emitted module is fresh, and the stylesheet is still the copied source, byte for byte. */
    assert.equal(
      readFileSync(join(outputRoot, 'app', 'main.js'), 'utf8').trim(),
      STUB_EMIT_MARKER,
    );
    assert.equal(
      readFileSync(join(outputRoot, 'src', 'ui', 'styles', 'app.css'), 'utf8'),
      'body { color: #123456; }\n',
    );

    /* 🔴 The clean never escapes `dist-web/`: the repository root and its siblings are untouched. */
    assert.ok(existsSync(join(fixture, SENTINEL)), 'the repository root was damaged by the clean');
    assert.ok(existsSync(join(fixture, 'node_modules', 'typescript', 'bin', 'tsc')));
    assert.ok(existsSync(join(fixture, 'app', 'main.ts')));
    assert.ok(statSync(join(fixture, BUILD_SCRIPT)).isFile());
  });

  it('IMPLEMENTATION INVARIANT: the removal is guarded, and the guard runs BEFORE the removal', () => {
    const source = readFileSync(join(REPOSITORY_ROOT, BUILD_SCRIPT), 'utf8');

    /* A recursive delete whose target is computed at runtime must be verified first. */
    const guardCall = source.indexOf('assertSafeToClean();');
    const removal = source.indexOf('rm(OUTPUT_DIR');
    assert.ok(guardCall >= 0, 'the build must verify its target before removing anything');
    assert.ok(removal >= 0, 'the build must remove the previous output');
    assert.ok(guardCall < removal, 'the guard must run before the removal');

    /* The guards that make the target provably the immediate `dist-web` child. */
    for (const check of [
      'dirname(REPOSITORY_ROOT) === REPOSITORY_ROOT',
      'OUTPUT_DIR === REPOSITORY_ROOT',
      'OUTPUT_DIR.startsWith(REPOSITORY_ROOT + sep)',
    ]) {
      assert.ok(source.includes(check), `the guard must keep checking "${check}"`);
    }

    /*
     * 🔴 The rebuild drives the repository's OWN compiler and its OWN web project, under the SAME
     *    interpreter that runs the build - never a `tsc` picked up from `PATH`, of which this machine
     *    has more than one. This is the wiring the stub compiler in the fixture deliberately does not
     *    exercise, so it is asserted here instead.
     */
    assert.ok(source.includes("join(REPOSITORY_ROOT, 'node_modules', 'typescript', 'bin', 'tsc')"));
    assert.ok(source.includes("const WEB_TSCONFIG = 'tsconfig.web.json';"));
    assert.ok(source.includes('spawnChild(process.execPath, [TYPESCRIPT_ENTRY, \'-p\', WEB_TSCONFIG]'));
  });
});
