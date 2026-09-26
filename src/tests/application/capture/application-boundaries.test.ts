/**
 * S01-05 ｜ IMPLEMENTATION INVARIANT ｜ Application-layer boundary guards.
 *
 * Not a product AC. These are structural guarantees that a review cannot erode:
 *   ① dependency direction - `src/application/capture/**` imports ONLY `src/domain/**`,
 *      `src/workspace/**`, `src/ai/**` (task §35 / contract §0.2 six-layer discipline);
 *   ② no ambient capability - no `fetch`, no browser storage, no directory picker, no
 *      `process.env`, no console sink;
 *   ③ credential boundary - the module can name a `CredentialRef` and cannot name a secret
 *      (AC-133 / AC-134 / AC-155 / AC-156 / AC-157 / AC-158 / AC-162);
 *   ④ no concrete adapter / proxy / registry construction - the `M10` interface is injected by
 *      the future `M15` composition root (AC-144 / AC-145 / AC-149 / AC-150).
 *
 * 🔴 This file creates NO new AC.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function findRepoRoot(start: string): string {
  let current = start;
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(current, 'package.json'))) {
      return current;
    }
    current = dirname(current);
  }
  throw new Error(`Repository root not found above ${start}`);
}

const REPO_ROOT = findRepoRoot(HERE);
const MODULE_ROOT = join(REPO_ROOT, 'src', 'application', 'capture');

function listTsFiles(directory: string): readonly string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTsFiles(path));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
}

const SOURCES = listTsFiles(MODULE_ROOT).map((file) => ({
  file,
  short: file.slice(REPO_ROOT.length + 1).replace(/\\/g, '/'),
  source: readFileSync(file, 'utf8'),
}));

function importSpecifiersOf(source: string): readonly string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(/from\s+'([^']+)'/g)) {
    if (match[1] !== undefined) {
      specifiers.push(match[1]);
    }
  }
  for (const match of source.matchAll(/import\s*\(\s*'([^']+)'\s*\)/g)) {
    if (match[1] !== undefined) {
      specifiers.push(match[1]);
    }
  }
  for (const match of source.matchAll(/import\s+'([^']+)'/g)) {
    if (match[1] !== undefined) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

describe('IMPLEMENTATION INVARIANT｜application/capture boundary', () => {
  it('IMPLEMENTATION INVARIANT: the scan is not vacuous - the real module was read', () => {
    assert.ok(SOURCES.length >= 10, `expected the capture module files, found ${SOURCES.length}`);
    const all = SOURCES.map((entry) => entry.source).join('\n');
    assert.ok(all.includes('createAttemptCaptureService'));
    assert.ok(all.includes('validateAttemptCaptureInput'));
    assert.ok(
      SOURCES.some((entry) => entry.short.endsWith('index.ts')),
      'the barrel must exist',
    );
  });

  it('IMPLEMENTATION INVARIANT: every import stays inside domain / workspace / ai (task §35)', () => {
    const offenders: string[] = [];
    for (const { short, source } of SOURCES) {
      for (const specifier of importSpecifiersOf(source)) {
        const allowed =
          /^\.\//.test(specifier) || /^\.\.\/\.\.\/(domain|workspace|ai)\//.test(specifier);
        if (!allowed) {
          offenders.push(`${short} -> ${specifier}`);
        }
      }
    }
    assert.deepEqual(offenders, [], `out-of-layer imports: ${offenders.join(', ')}`);
  });

  it('IMPLEMENTATION INVARIANT: no browser / server / proxy / ui module is even named (AC-150)', () => {
    const forbidden_segments = [
      'browser/',
      'server/',
      'api/',
      'retrieval/',
      'ui/',
      'app/',
      'provider/registry.js',
    ];
    const offenders: string[] = [];
    for (const { short, source } of SOURCES) {
      for (const specifier of importSpecifiersOf(source)) {
        if (forbidden_segments.some((segment) => specifier.includes(segment))) {
          offenders.push(`${short} -> ${specifier}`);
        }
      }
    }
    assert.deepEqual(offenders, [], `forbidden import targets: ${offenders.join(', ')}`);
  });

  it('IMPLEMENTATION INVARIANT: no ambient capability and no concrete adapter construction (AC-149)', () => {
    const forbidden_patterns: readonly { readonly label: string; readonly pattern: RegExp }[] = [
      { label: 'fetch', pattern: /\bfetch\s*\(/ },
      { label: 'XMLHttpRequest', pattern: /XMLHttpRequest/ },
      { label: 'browser storage', pattern: /sessionStorage|localStorage/ },
      { label: 'directory picker', pattern: /showDirectoryPicker/ },
      { label: 'process.env', pattern: /process\s*\./ },
      { label: 'console sink', pattern: /console\s*\./ },
      { label: 'BrowserDirectAdapter', pattern: /BrowserDirectAdapter/ },
      { label: 'ThinProxy', pattern: /ThinProxy|ProxyClient/ },
      { label: 'provider registry factory', pattern: /createProviderRegistry/ },
      { label: 'session credential store', pattern: /session-storage/ },
    ];
    const offenders: string[] = [];
    for (const { short, source } of SOURCES) {
      for (const { label, pattern } of forbidden_patterns) {
        if (pattern.test(source)) {
          offenders.push(`${short} contains ${label}`);
        }
      }
    }
    assert.deepEqual(offenders, [], offenders.join('; '));
  });

  it('IMPLEMENTATION INVARIANT: the credential boundary is structural, not a review habit (AC-133 / AC-155)', () => {
    const secret_patterns: readonly RegExp[] = [
      /CredentialSecret/,
      /revealCredentialSecret/,
      /credentialSecret\s*\(/,
      /api[-_]?key/i,
      /authorization/i,
      /\bBearer\b/i,
      /SECRET_VALUES/,
    ];
    const offenders: string[] = [];
    for (const { short, source } of SOURCES) {
      for (const pattern of secret_patterns) {
        if (pattern.test(source)) {
          offenders.push(`${short} matches ${String(pattern)}`);
        }
      }
    }
    assert.deepEqual(offenders, [], offenders.join('; '));

    /* The only credential type the layer names is the opaque, non-secret handle. */
    const uses_ref = SOURCES.some((entry) => entry.source.includes('CredentialRef'));
    assert.equal(uses_ref, true);
  });

  it('IMPLEMENTATION INVARIANT: the AI call is made through the injected M10 adapter only (AC-144 / AC-145)', () => {
    const invoker = SOURCES.find((entry) => entry.short.endsWith('structured-parse.ts'));
    assert.ok(invoker !== undefined);
    if (invoker === undefined) {
      return;
    }
    assert.ok(invoker.source.includes('ProviderAdapter'));
    assert.ok(invoker.source.includes('adapter.execute('));
    assert.ok(invoker.source.includes('validateAiRequest'));
    assert.ok(invoker.source.includes('selectStructuredOutputMode'));
    /* The model is read from configuration, never hard-coded into business logic (AC-132). */
    assert.ok(invoker.source.includes('adapter.config.model'));
  });

  it('IMPLEMENTATION INVARIANT: the application layer enters the PRODUCTION build, not only the test import graph (task §3)', () => {
    /*
     * Before S01-05-INTEGRATE `src/application/**` was reachable ONLY through the test import
     * graph, so `tsconfig.core.json` / `tsconfig.build.json` emitted no application module at all -
     * a build could "succeed" while the shipped `dist/` was missing the whole ①-⑤ layer.
     */
    const core = JSON.parse(
      readFileSync(join(REPO_ROOT, 'tsconfig.core.json'), 'utf8'),
    ) as { include: readonly string[] };
    assert.ok(
      core.include.includes('src/application/**/*.ts'),
      `the core scope must cover the application layer (got: ${core.include.join(', ')})`,
    );

    const build = JSON.parse(
      readFileSync(join(REPO_ROOT, 'tsconfig.build.json'), 'utf8'),
    ) as { extends?: string; include?: readonly string[] };
    assert.equal(
      build.extends,
      './tsconfig.core.json',
      'the production build must inherit the framework-neutral core scope (NO DOM)',
    );

    const dist = join(REPO_ROOT, 'dist');
    if (existsSync(dist)) {
      assert.ok(
        existsSync(join(dist, 'application', 'capture', 'capture-service.js')),
        'npm run build must emit dist/application/capture/** - re-run `npm run build`',
      );
    }
  });
});
