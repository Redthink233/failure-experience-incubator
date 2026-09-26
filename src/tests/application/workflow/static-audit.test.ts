/**
 * S01 ｜ `M15` STATIC AUDIT - the dependency direction and the forbidden-shape guards (task §30, §28).
 *
 * 🔴 This is an `IMPLEMENTATION INVARIANT` suite, not a product `AC`. It asserts that the STRUCTURE of
 *    the shipped sources makes the forbidden things unreachable, so a later edit cannot quietly
 *    reintroduce them. Comments are stripped FIRST, so a docstring may *explain* a prohibition without
 *    being counted as a violation.
 * 🔴 Canonical references used: AC-23 / AC-122 / AC-133 / AC-134 / AC-144 / AC-146 / AC-149 / AC-150 /
 *    AC-158. The suite creates NO `AC`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  REPO_ROOT,
  importSpecifiersOf,
  readRepoFile,
  repoFiles,
  scanDirectory,
  stripComments,
} from '../../ai/source-scan.js';

/* ------------------------------------------------------------------ *
 * Sources under audit
 * ------------------------------------------------------------------ */

const WORKFLOW = scanDirectory('src/application/workflow');
const BROWSER_APPLICATION = scanDirectory('src/browser/application');
const BROWSER_AI = scanDirectory('src/browser/ai');

interface Source {
  readonly name: string;
  readonly code: string;
}

const WORKFLOW_FILES: readonly Source[] = WORKFLOW.sources.map(({ file, source }) => ({
  name: relative(REPO_ROOT, file).replace(/\\/g, '/'),
  code: stripComments(source),
}));

function filesContaining(token: string): readonly string[] {
  return WORKFLOW_FILES.filter((file) => file.code.includes(token))
    .map((file) => file.name)
    .sort();
}

function assertAbsentInWorkflow(tokens: readonly string[]): void {
  for (const token of tokens) {
    const hits = filesContaining(token);
    assert.deepEqual(hits, [], `"${token}" must not appear in src/application/workflow (found in ${hits.join(', ')})`);
  }
}

/** Every module specifier of a directory's production sources, with the owning file. */
function specifiersOf(directory: string): readonly { readonly file: string; readonly specifier: string }[] {
  const out: { file: string; specifier: string }[] = [];
  for (const path of repoFiles(directory)) {
    const file = relative(REPO_ROOT, path).replace(/\\/g, '/');
    for (const specifier of importSpecifiersOf(readRepoFile(file))) {
      out.push({ file, specifier });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 1. The DAG
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜dependency direction', () => {
  it('IMPLEMENTATION INVARIANT: the audit is not vacuous - the `M15` module and the browser composition root really exist', () => {
    assert.ok(WORKFLOW_FILES.length >= 8, `expected the M15 module, found ${WORKFLOW_FILES.length}`);
    const names = WORKFLOW_FILES.map((file) => file.name);
    for (const expected of [
      'src/application/workflow/types.ts',
      'src/application/workflow/errors.ts',
      'src/application/workflow/operation-ids.ts',
      'src/application/workflow/outcomes.ts',
      'src/application/workflow/retrieval-freshness.ts',
      'src/application/workflow/read-model.ts',
      'src/application/workflow/acceptance.ts',
      'src/application/workflow/workflow-service.ts',
      'src/application/workflow/index.ts',
    ]) {
      assert.ok(names.includes(expected), `${expected} is missing`);
    }
    assert.ok(BROWSER_APPLICATION.sources.length >= 2, 'the browser composition root must exist');
    assert.ok(BROWSER_AI.sources.some(({ file }) => file.endsWith('thin-proxy-adapter.ts')));
  });

  it('IMPLEMENTATION INVARIANT: `M4`–`M9` / `M6` / `M7` / `M2` / `M10` have NO `M15` back-edge', () => {
    const offenders: string[] = [];
    for (const directory of [
      'src/domain',
      'src/workspace',
      'src/ai',
      'src/retrieval',
      'src/application/capture',
      'src/application/insight',
      'src/application/hypothesis',
    ]) {
      for (const { file, specifier } of specifiersOf(directory)) {
        if (specifier.includes('workflow')) {
          offenders.push(`${file} → ${specifier}`);
        }
      }
    }
    assert.deepEqual(offenders, [], `the workflow may only CONSUME those modules:\n${offenders.join('\n')}`);
  });

  it('IMPLEMENTATION INVARIANT: `src/application/workflow` reaches only framework-neutral layers', () => {
    const offenders: string[] = [];
    for (const file of WORKFLOW_FILES) {
      for (const specifier of importSpecifiersOf(readRepoFile(file.name))) {
        const allowed =
          specifier.startsWith('./') ||
          /^\.\.\/\.\.\/(domain|workspace|ai|retrieval)\//.test(specifier) ||
          /^\.\.\/(capture|insight|hypothesis)\//.test(specifier);
        if (!allowed) {
          offenders.push(`${file.name} → ${specifier}`);
        }
      }
    }
    assert.deepEqual(offenders, [], offenders.join('\n'));

    for (const forbidden of ['browser', 'server', 'api/', 'ui/', 'app/']) {
      const hits = WORKFLOW_FILES.filter((file) =>
        importSpecifiersOf(readRepoFile(file.name)).some((specifier) => specifier.includes(forbidden)),
      ).map((file) => file.name);
      assert.deepEqual(hits, [], `src/application/workflow must not reach "${forbidden}"`);
    }
  });

  it('IMPLEMENTATION INVARIANT: `src/browser/application` never imports a server implementation or the proxy runtime', () => {
    const offenders: string[] = [];
    for (const { file, specifier } of specifiersOf('src/browser/application')) {
      if (specifier.includes('/server/') || specifier.includes('api/proxy') || specifier.includes('server/proxy')) {
        offenders.push(`${file} → ${specifier}`);
      }
    }
    assert.deepEqual(offenders, [], `the browser and the server meet over the network, not by import:\n${offenders.join('\n')}`);
  });

  it('IMPLEMENTATION INVARIANT: `src/server/**` and `api/proxy/**` never import the workflow', () => {
    const offenders: string[] = [];
    for (const directory of ['src/server', 'api/proxy']) {
      for (const { file, specifier } of specifiersOf(directory)) {
        if (specifier.includes('workflow') || specifier.includes('application/')) {
          offenders.push(`${file} → ${specifier}`);
        }
      }
    }
    assert.deepEqual(offenders, [], offenders.join('\n'));
  });

  it('IMPLEMENTATION INVARIANT: `src/ai` (M10) still imports no implementation layer, and no application layer', () => {
    const offenders: string[] = [];
    for (const { file, specifier } of specifiersOf('src/ai')) {
      if (
        specifier.includes('browser') ||
        specifier.includes('server') ||
        specifier.includes('api/proxy') ||
        specifier.includes('proxy') ||
        specifier.includes('application')
      ) {
        offenders.push(`${file} → ${specifier}`);
      }
    }
    assert.deepEqual(offenders, [], `M10 is the CONTRACT; M11/M12/M15 implement it:\n${offenders.join('\n')}`);
  });

  it('IMPLEMENTATION INVARIANT: the `M15` barrel re-exports only LOCAL modules', () => {
    const barrel = stripComments(readRepoFile('src/application/workflow/index.ts'));
    for (const specifier of importSpecifiersOf(barrel)) {
      assert.ok(specifier.startsWith('./'), `the barrel may only re-export local modules ("${specifier}")`);
    }
    assert.ok(barrel.includes("export * from './workflow-service.js';"));
    assert.ok(barrel.includes("export * from './acceptance.js';"));
  });
});

/* ------------------------------------------------------------------ *
 * 2. No ambient capability, no concrete adapter, no credential
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜the framework-neutral workflow stays framework-neutral', () => {
  it('AC-133 / AC-134 / IMPLEMENTATION INVARIANT: no DOM, no ambient network, no browser storage, no Node runtime, no console', () => {
    assertAbsentInWorkflow([
      'document.',
      'window.',
      'XMLHttpRequest',
      'fetch(',
      'sessionStorage',
      'localStorage',
      'indexedDB',
      'process.',
      'console.',
      'require(',
    ]);
  });

  it('no concrete adapter, no registry factory and no proxy client is constructed (AC-144 / AC-149 / AC-150)', () => {
    assertAbsentInWorkflow([
      'createBrowserDirectAdapter',
      'BrowserDirectAdapter',
      'createThinProxyAdapter',
      'ThinProxy',
      'ProxyClient',
      'createProviderRegistry',
      'createProviderRegistry(',
      'provider/registry',
      'browser-fetch-transport',
      'session-credential-store',
    ]);
  });

  it('the credential boundary is structural: `M15` cannot even NAME a secret (AC-133 / AC-158)', () => {
    assertAbsentInWorkflow([
      'CredentialSecret',
      'revealCredentialSecret',
      'credentialSecret(',
      'SECRET_VALUES',
      'api_key',
      'apiKey',
      'Authorization',
      'Bearer',
    ]);
  });

  it('no background, scheduled, watched or batched execution path exists (D-022 / AC-28)', () => {
    assertAbsentInWorkflow([
      'setInterval',
      'setTimeout',
      'setImmediate',
      'cron',
      'watchFile',
      'chokidar',
      'EventEmitter',
      'queueMicrotask',
      'requestIdleCallback',
      'MutationObserver',
    ]);
  });
});

/* ------------------------------------------------------------------ *
 * 3. No second mechanism, no second state
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜one mechanism each, one state each', () => {
  it('IMPLEMENTATION INVARIANT: there is no second retrieval, no second comparison and no second derivation identity', () => {
    assertAbsentInWorkflow([
      'createExperienceRetrievalService',
      'buildRetrievalDerivation',
      'newRetrievalDerivationId',
      'compareAttempts',
      'eligibleHistoricalAttempts',
      'comparisonOrderOf',
    ]);
  });

  it('IMPLEMENTATION INVARIANT: there is no second `EvidenceRef` constructor, no second ⑩ and no second `N_引用`', () => {
    assertAbsentInWorkflow([
      'buildGroundingContext',
      'newEvidenceRefId',
      'deriveCitationView',
      'deriveNCitation',
      'evidence_ref_id',
      'EvidenceRef',
      'TraceableEvidenceView =',
      'CitationView =',
    ]);
  });

  it('AC-122 / IMPLEMENTATION INVARIANT: there is no step database, no version, no progress and no completion score (task §5)', () => {
    assertAbsentInWorkflow([
      'D9StepDatabase',
      'WorkflowVersion',
      'WorkflowHistory',
      'progress_percent',
      'ProgressPercent',
      'completion_score',
      'CompletionScore',
      'StepRank',
      'step_index',
      'current_step',
      'workflow_state',
      'persistWorkflow',
      'saveSnapshot',
      'revision_history',
      'rollback',
    ]);
  });

  it('no numeric judgement quantity and no similarity machinery (AC-23 / D-054)', () => {
    assertAbsentInWorkflow([
      'confidence',
      'similarity',
      'embedding',
      'vectorStore',
      'pgvector',
      'cosine',
      'weighted',
      'score =',
    ]);
  });

  it('IMPLEMENTATION INVARIANT: `ACCEPTANCE` is declared in TWO files only, and no command outcome can carry it', () => {
    const hits = filesContaining('ACCEPTANCE');
    assert.deepEqual(hits, [
      'src/application/workflow/acceptance.ts',
      'src/application/workflow/types.ts',
    ]);
    /* 🔴 The command-layer type EXCLUDES it structurally. */
    const types = readRepoFile('src/application/workflow/types.ts');
    assert.match(types, /WorkflowFailureLayer = Exclude<WorkflowLayer, 'ACCEPTANCE'>/);
  });

  it('IMPLEMENTATION INVARIANT: the M15 module is inside the production build scope, and the browser root inside the browser scope', () => {
    const core = JSON.parse(readRepoFile('tsconfig.core.json')) as { readonly include: readonly string[] };
    const browser = JSON.parse(readRepoFile('tsconfig.browser.json')) as { readonly include: readonly string[] };
    const build = JSON.parse(readRepoFile('tsconfig.build.json')) as { readonly extends?: string };

    /* 🔴 `src/application/workflow/**` is framework-neutral, so it inherits the SAME NO-DOM scope. */
    assert.ok(core.include.includes('src/application/**/*.ts'));
    assert.equal(build.extends, './tsconfig.core.json');
    /* 🔴 The browser composition root is browser-scope ONLY: the core never gains DOM. */
    assert.ok(browser.include.includes('src/browser/**/*.ts'));
    assert.equal(
      core.include.some((pattern) => pattern.includes('browser')),
      false,
      'the core scope must never be widened to make the browser root compile',
    );

    /* The production build really emitted the module (`npm run build` must have run). */
    const dist = join(REPO_ROOT, 'dist', 'application', 'workflow');
    if (existsSync(join(REPO_ROOT, 'dist'))) {
      assert.ok(
        existsSync(join(dist, 'workflow-service.js')),
        'npm run build must emit dist/application/workflow/**',
      );
      assert.ok(existsSync(join(dist, 'read-model.js')));
      assert.ok(existsSync(join(dist, 'acceptance.js')));
      /* 🔴 The browser root is NOT part of the production build. */
      assert.equal(
        existsSync(join(REPO_ROOT, 'dist', 'browser')),
        false,
        'the browser runtime must stay out of the framework-neutral build output',
      );
    }
  });

  it('IMPLEMENTATION INVARIANT: the App Shell exists and is the ONLY UI, and no business logic lives in it', () => {
    /*
     * 🚩 IN-PLACE AMENDMENT (S01-06, 2026-09-25). This case USED to assert
     *
     *     「no UI exists yet, so no business logic can live in one」 - `src/ui` / `app` must not exist
     *     while S01-06 has not started.
     *
     * S01-06 has now started and the App Shell really exists, so the OLD ASSERTION IS FALSE BY
     * CONSTRUCTION (its text is kept here rather than deleted, because the project never rewrites
     * history). The invariant is not dropped: it is INVERTED and SHARPENED - the directories must
     * now exist, they must be the only UI location, and the App Shell's freedom from business logic
     * is asserted by `src/tests/ui/static-audit.test.ts` (U1 / §49) instead of by their absence.
     */
    for (const candidate of ['src/ui', 'app']) {
      assert.equal(
        existsSync(join(REPO_ROOT, candidate)),
        true,
        `"${candidate}" must exist: S01-06 shipped the App Shell`,
      );
    }
    /* No second, competing UI location may appear. */
    for (const candidate of ['src/app', 'src/components', 'src/pages']) {
      assert.equal(
        existsSync(join(REPO_ROOT, candidate)),
        false,
        `"${candidate}" must not exist: the App Shell lives in src/ui + app`,
      );
    }
  });

  it('IMPLEMENTATION INVARIANT: the workflow adds no M15-owned `AC` and no new id prefix', () => {
    /* 🔴 Comments are stripped first, so the AC references in the docstrings are not counted - this
       asserts that no AC is used as a CODE value. The canonical range guard
       (`src/tests/domain/ac-reference-guard.test.ts`) is what proves no AC beyond the frozen 162 + 6
       is ever referenced; this suite does not restate that number. */
    assert.deepEqual(filesContaining("'AC-"), []);
    assert.deepEqual(filesContaining('"AC-'), []);
    assertAbsentInWorkflow(['ID_PREFIXES', 'newObjectId(']);
    /* The step labels are display strings for a report, never a persisted counter. */
    assert.ok(
      (WORKFLOW_FILES.find((file) => file.name.endsWith('acceptance.ts'))?.code ?? '').includes("'①'"),
    );
  });
});
