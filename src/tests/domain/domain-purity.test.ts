/**
 * IMPLEMENTATION INVARIANT ｜ Layer-1 / layer-2 purity and layering guard.
 *
 * Not a product AC. It asserts structural properties of the S01-01 source tree that the
 * contract requires but that no single assertion can express:
 *   - Domain (`src/domain/**`) is pure TypeScript: no file I/O, no DOM / browser API,
 *     no network, no LLM, no UI (contract §0.2, §12; the task's "No Network / No LLM / No UI");
 *   - Workspace (`src/workspace/**`) depends only on the DOM-free storage abstraction and
 *     never on a browser picker (contract §0.4 A; AC-127 / AC-128);
 *   - the dependency direction is Domain -> Workspace and never the reverse (Gate C Plan §I.1);
 *   - no database / ORM / vector-DB / embedding / LLM / UI dependency is imported anywhere
 *     in layers 1-2 (D-059 / D-061; AC-130 / AC-136 / ITC-02).
 *
 * The scan is textual over the source tree. Comments are stripped first so that the
 * documentation *explaining* these prohibitions does not count as a violation
 * (e.g. `storage.ts` explains why it must not touch `FileSystemDirectoryHandle`).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const DOMAIN_DIR = join(REPO_ROOT, 'src', 'domain');
const WORKSPACE_DIR = join(REPO_ROOT, 'src', 'workspace');

/** Modules that must never be imported by layers 1-2. */
const FORBIDDEN_IMPORT_PATTERN =
  /^(node:)?(fs|fs\/promises|path|os|child_process|http|https|net|dns|worker_threads|pg|postgres|mysql2?|mongodb|sqlite3|better-sqlite3|@prisma\/client|prisma|drizzle-orm|typeorm|knex|redis|ioredis|@pinecone-database\/pinecone|chromadb|weaviate-client|@qdrant\/js-client|milvus|langchain|@langchain\/core|llamaindex|openai|@anthropic-ai\/sdk|axios|node-fetch|undici|react|react-dom|vue|svelte|next|express|fastify)$/;

/** DOM / browser-only globals that layers 1-2 must never reference. */
const FORBIDDEN_GLOBAL_PATTERN =
  /\b(window|document|localStorage|sessionStorage|indexedDB|FileSystemDirectoryHandle|FileSystemFileHandle|showDirectoryPicker|showOpenFilePicker|XMLHttpRequest|WebSocket|navigator|process|require)\b/;

/** Layers that lower layers must never depend on. */
const UPWARD_LAYER_PATTERN = /^\.\.\/(retrieval|ai|application|ui)(\/|$)/;

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((line) => {
      const index = line.indexOf('//');
      return index < 0 ? line : line.slice(0, index);
    })
    .join('\n');
}

function listSourceFiles(directory: string): readonly string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(path));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
}

function importSpecifiersOf(source: string): readonly string[] {
  const strip = stripComments(source);
  const specifiers: string[] = [];
  const pattern = /(?:from\s+|import\s*\(\s*)'([^']+)'/g;
  let match = pattern.exec(strip);
  while (match !== null) {
    if (match[1] !== undefined) {
      specifiers.push(match[1]);
    }
    match = pattern.exec(strip);
  }
  return specifiers;
}

/**
 * Resolves the EFFECTIVE `lib` / `types` of a root tsconfig by following `extends`.
 * S01-01A moved the shared options into `tsconfig.base.json`, so a check that only
 * reads one file locally would silently become vacuous.
 */
function effectiveTsconfigOf(name: string): {
  readonly lib: readonly string[];
  readonly types: readonly string[];
} {
  let lib: readonly string[] = [];
  let types: readonly string[] = [];
  let current: string | undefined = name;
  const chain: Array<{
    extends?: string;
    compilerOptions?: { lib?: readonly string[]; types?: readonly string[] };
  }> = [];
  while (current !== undefined) {
    const raw = JSON.parse(readFileSync(join(REPO_ROOT, current), 'utf8')) as {
      extends?: string;
      compilerOptions?: { lib?: readonly string[]; types?: readonly string[] };
    };
    chain.unshift(raw);
    current = raw.extends;
  }
  for (const layer of chain) {
    if (layer.compilerOptions?.lib !== undefined) {
      lib = layer.compilerOptions.lib;
    }
    if (layer.compilerOptions?.types !== undefined) {
      types = layer.compilerOptions.types;
    }
  }
  return { lib, types };
}

describe('IMPLEMENTATION INVARIANT｜Domain / Workspace purity and layering', () => {
  it('IMPLEMENTATION INVARIANT: the guard actually scans both layers (a wrong path must not pass silently)', () => {
    const domainFiles = listSourceFiles(DOMAIN_DIR);
    const workspaceFiles = listSourceFiles(WORKSPACE_DIR);
    assert.ok(domainFiles.length >= 10, `expected domain files, found ${domainFiles.length}`);
    assert.ok(workspaceFiles.length >= 8, `expected workspace files, found ${workspaceFiles.length}`);
  });

  it('IMPLEMENTATION INVARIANT: domain layer is pure - no file I/O, no DOM/browser API, no network, no LLM, no UI', () => {
    for (const file of listSourceFiles(DOMAIN_DIR)) {
      const source = readFileSync(file, 'utf8');
      const code = stripComments(source);

      for (const specifier of importSpecifiersOf(source)) {
        assert.ok(
          !FORBIDDEN_IMPORT_PATTERN.test(specifier),
          `${file} imports forbidden module "${specifier}"`,
        );
      }

      const globalMatch = FORBIDDEN_GLOBAL_PATTERN.exec(code);
      assert.equal(
        globalMatch,
        null,
        `${file} references forbidden global "${globalMatch?.[1] ?? ''}"`,
      );

      // The single permitted platform primitive: the standard Web Crypto RNG, and nothing
      // else from `globalThis`.
      const globalThisUses = [...code.matchAll(/globalThis\.([A-Za-z_$][\w$]*)/g)].map(
        (match) => match[1],
      );
      for (const name of globalThisUses) {
        assert.equal(name, 'crypto', `${file} uses globalThis.${name ?? ''}`);
      }
    }
  });

  it('IMPLEMENTATION INVARIANT: workspace layer stays on the storage abstraction - no browser picker, no direct fs', () => {
    for (const file of listSourceFiles(WORKSPACE_DIR)) {
      const source = readFileSync(file, 'utf8');
      const code = stripComments(source);

      for (const specifier of importSpecifiersOf(source)) {
        assert.ok(
          !FORBIDDEN_IMPORT_PATTERN.test(specifier),
          `${file} imports forbidden module "${specifier}"`,
        );
      }

      const globalMatch = FORBIDDEN_GLOBAL_PATTERN.exec(code);
      assert.equal(
        globalMatch,
        null,
        `${file} references forbidden global "${globalMatch?.[1] ?? ''}"`,
      );
    }
  });

  it('IMPLEMENTATION INVARIANT: dependency direction is Domain -> Workspace only (never reversed)', () => {
    for (const file of listSourceFiles(DOMAIN_DIR)) {
      for (const specifier of importSpecifiersOf(readFileSync(file, 'utf8'))) {
        assert.ok(
          !specifier.includes('workspace'),
          `${file} must not depend on the workspace layer ("${specifier}")`,
        );
        assert.ok(
          !UPWARD_LAYER_PATTERN.test(specifier),
          `${file} must not depend on an upper layer ("${specifier}")`,
        );
      }
    }
    for (const file of listSourceFiles(WORKSPACE_DIR)) {
      for (const specifier of importSpecifiersOf(readFileSync(file, 'utf8'))) {
        assert.ok(
          !UPWARD_LAYER_PATTERN.test(specifier),
          `${file} must not depend on an upper layer ("${specifier}")`,
        );
      }
    }
  });

  it('IMPLEMENTATION INVARIANT: the compiler already forbids DOM by configuration', () => {
    // S01-01A split the root config: `tsconfig.json` now only declares `extends` +
    // `include`, so the EFFECTIVE `lib` / `types` must be resolved through the chain.
    const core = effectiveTsconfigOf('tsconfig.json');
    assert.deepEqual([...core.lib], ['ES2022']);
    // `lib` deliberately has no "DOM": window / document / FileSystemDirectoryHandle are
    // not even TYPEABLE in layers 1-2. This is the structural proof of "No UI / No browser API".
    assert.ok(!core.lib.includes('DOM'));
    assert.deepEqual([...core.types], ['node']);

    // The framework-neutral core scope (Domain + Workspace, no tests) matches exactly.
    const coreOnly = effectiveTsconfigOf('tsconfig.core.json');
    assert.deepEqual([...coreOnly.lib], ['ES2022']);
    assert.deepEqual([...coreOnly.types], ['node']);

    // 🔴 DOM is available ONLY in the separate browser scope - never here.
    const browser = effectiveTsconfigOf('tsconfig.browser.json');
    assert.ok(browser.lib.includes('DOM'));
    assert.notDeepEqual([...browser.lib], [...core.lib]);
  });
});
