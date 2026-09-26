/**
 * S01-02 ｜ browser workspace adapter - structural invariants over the source tree.
 *
 * Not a product AC. These cases assert properties of the `src/browser/workspace/**` layer that no
 * single behavioural test can express:
 *   ① the layer is real (a wrong path cannot pass the guard silently);
 *   ② it contains NO physical delete vocabulary - `removeEntry()` is not even declared in
 *      `fsa-types.ts`, so a delete cannot be type-checked, let alone called (AC-76 / AC-138);
 *   ③ it references NO DOM-lib-only identifier, which is WHY the very same source compiles in the
 *      NO-DOM `tsconfig.test.json` scope (the structural proof behind the `S01-W1-PREP` boundary);
 *   ④ it has exactly ONE host entry point (`globalThis`) and it lives in the picker helper only;
 *   ⑤ layers 1-2 (`src/domain`, `src/workspace`) never depend on the browser layer, and the browser
 *      layer reaches the frozen abstraction over the import graph only (never by re-declaring it);
 *   ⑥ the layer makes no browser-verification claim - acceptance is PENDING PSA, not asserted here.
 *
 * The scan is textual and comments are stripped first, so the documentation that *explains* these
 * prohibitions (e.g. "we do not use `DOMException`") does not count as a violation.
 *
 * 🔴 This file creates NO new AC. Every case is an `IMPLEMENTATION INVARIANT` (or cites an existing
 * canonical AC). References: contract §12 (no physical delete, no version system), §0.4 A / E.3,
 * AC-76 / AC-127 / AC-128 / AC-138, CODING_START_HANDOFF §0.1 / §0.2.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../../..');

const BROWSER_WORKSPACE_DIR = join(REPO_ROOT, 'src', 'browser', 'workspace');
const DOMAIN_DIR = join(REPO_ROOT, 'src', 'domain');
const WORKSPACE_DIR = join(REPO_ROOT, 'src', 'workspace');

/** Member names / call shapes that would mean "physical delete exists after all". */
const FORBIDDEN_DELETE_PATTERNS: readonly RegExp[] = [
  /\bremoveEntry\b/,
  /\bdelete\s*\(/,
  /\bdeleteFile\s*\(/,
  /\bunlink\s*\(/,
  /\brm\s*\(/,
  /\brmdir\s*\(/,
  /\bpurge\s*\(/,
  /\berase\s*\(/,
  /\btrash\s*\(/,
];

/**
 * Identifiers that exist ONLY in `lib.dom.d.ts`. `showDirectoryPicker` is deliberately absent from
 * this list: the picker helper reads it as a STRUCTURAL property of a locally declared host
 * interface, which is precisely the technique that avoids the DOM lib - not a DOM dependency.
 */
const FORBIDDEN_DOM_IDENTIFIERS: readonly string[] = [
  'FileSystemDirectoryHandle',
  'FileSystemFileHandle',
  'FileSystemWritableFileStream',
  'FileSystemHandle',
  'DOMException',
  'WritableStream',
  'Blob',
  'window',
  'self',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'indexedDB',
];

/** Claims that may only ever be produced by the deferred pre-submission acceptance (PSA). */
const FORBIDDEN_ACCEPTANCE_CLAIMS: readonly RegExp[] = [
  /Chrome\s+verified/i,
  /Edge\s+verified/i,
  /Browser\s+FSA\s+Verified/i,
  /FSA\s+accepted/i,
  /browser\s+verified/i,
];

/** Layers the browser adapter must never import from (it is the lowest browser-scoped layer). */
const UPWARD_LAYER_PATTERN = /^\.\.\/\.\.\/(retrieval|ai|application|ui)(\/|$)/;

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
  return files.sort();
}

function importSpecifiersOf(source: string): readonly string[] {
  const stripped = stripComments(source);
  const specifiers: string[] = [];
  const pattern = /(?:from\s+|import\s*\(\s*)'([^']+)'/g;
  let match = pattern.exec(stripped);
  while (match !== null) {
    if (match[1] !== undefined) {
      specifiers.push(match[1]);
    }
    match = pattern.exec(stripped);
  }
  return specifiers;
}

const BROWSER_WORKSPACE_FILES = listSourceFiles(BROWSER_WORKSPACE_DIR);

describe('S01-02 ｜ browser workspace adapter structural invariants', () => {
  it('IMPLEMENTATION INVARIANT: the guard scans a real, non-empty browser workspace layer', () => {
    assert.ok(BROWSER_WORKSPACE_FILES.length >= 5, `expected the S01-02 layer, found ${BROWSER_WORKSPACE_FILES.length}`);
    for (const file of BROWSER_WORKSPACE_FILES) {
      assert.ok(file.startsWith(BROWSER_WORKSPACE_DIR), `${file} is outside the S01-02 layer`);
    }
    // 🔴 Historically the adapter was planned at `src/workspace/adapter/**`; that path is
    // SUPERSEDED BY S01-W1-PREP and must stay empty of browser code.
    assert.ok(!readdirSync(WORKSPACE_DIR).includes('adapter'), 'src/workspace/adapter must not exist');
  });

  it('[AC-76][AC-138] IMPLEMENTATION INVARIANT: the browser layer can neither declare nor call a physical delete', () => {
    for (const file of BROWSER_WORKSPACE_FILES) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const pattern of FORBIDDEN_DELETE_PATTERNS) {
        assert.ok(
          !pattern.test(code),
          `${file} matches the forbidden delete pattern ${pattern.source}`,
        );
      }
    }
  });

  it('IMPLEMENTATION INVARIANT: the browser layer references no DOM-lib-only identifier', () => {
    for (const file of BROWSER_WORKSPACE_FILES) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const identifier of FORBIDDEN_DOM_IDENTIFIERS) {
        assert.ok(
          !new RegExp(`\\b${identifier}\\b`).test(code),
          `${file} references the DOM-only identifier "${identifier}"`,
        );
      }
    }
  });

  it('IMPLEMENTATION INVARIANT: the single host entry point is `globalThis`, confined to the picker helper', () => {
    const filesTouchingTheHost = BROWSER_WORKSPACE_FILES.filter((file) =>
      /\bglobalThis\b/.test(stripComments(readFileSync(file, 'utf8'))),
    ).map((file) => file.slice(BROWSER_WORKSPACE_DIR.length + 1).replace(/\\/g, '/'));

    assert.deepEqual(filesTouchingTheHost, ['directory-picker.ts']);
  });

  it('[AC-127][AC-128] IMPLEMENTATION INVARIANT: layers 1-2 never depend on the browser layer', () => {
    for (const directory of [DOMAIN_DIR, WORKSPACE_DIR]) {
      for (const file of listSourceFiles(directory)) {
        for (const specifier of importSpecifiersOf(readFileSync(file, 'utf8'))) {
          assert.ok(
            !specifier.toLowerCase().includes('browser'),
            `${file} must not depend on the browser layer ("${specifier}")`,
          );
        }
      }
    }
  });

  it('IMPLEMENTATION INVARIANT: the adapter implements the frozen abstraction instead of re-declaring it', () => {
    let consumesTheFrozenStorageAbstraction = false;
    let outwardImports = 0;

    for (const file of BROWSER_WORKSPACE_FILES) {
      for (const specifier of importSpecifiersOf(readFileSync(file, 'utf8'))) {
        if (!specifier.startsWith('.')) {
          continue;
        }
        outwardImports += 1;
        assert.ok(
          !UPWARD_LAYER_PATTERN.test(specifier),
          `${file} must not import an upper layer ("${specifier}")`,
        );
        if (specifier.startsWith('../')) {
          assert.equal(
            specifier,
            '../../workspace/storage.js',
            `${file} may only leave the layer through the frozen storage abstraction`,
          );
          consumesTheFrozenStorageAbstraction = true;
        }
      }
    }

    // The scan must be non-vacuous in both directions.
    assert.ok(outwardImports >= 4, `expected the browser layer to import the frozen contracts, found ${outwardImports}`);
    assert.ok(
      consumesTheFrozenStorageAbstraction,
      'the adapter must consume the frozen WorkspaceStorage abstraction over the import graph',
    );
  });

  it('IMPLEMENTATION INVARIANT: the layer asserts no browser acceptance - that is deferred to PSA', () => {
    for (const file of BROWSER_WORKSPACE_FILES) {
      const raw = readFileSync(file, 'utf8');
      for (const claim of FORBIDDEN_ACCEPTANCE_CLAIMS) {
        assert.ok(!claim.test(raw), `${file} makes the forbidden acceptance claim ${claim.source}`);
      }
    }
  });
});
