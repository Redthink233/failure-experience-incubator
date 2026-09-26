/**
 * S01 ｜ Static audit of the production sources of `M8` (task §44, §42, §3).
 *
 * Contract: `D-020` / `D-037` / AC-23 (no numeric judgement quantity anywhere), `D-054`
 * (`RAG ≠ 向量检索`), `D-022` (step ⑧ is the only generation moment), `D-051` / AC-122 (no version
 * system), §5.2 rule 1 (the four roles), §12 item 10 (no second reference system), `D-015` / AC-13
 * (`Experience Asset` is a view, never an entity), AC-133 / AC-134 (no credential).
 *
 * 🔴 This is an `IMPLEMENTATION INVARIANT` suite, not a product AC: it asserts that the STRUCTURE of
 *    the production sources makes the forbidden things unreachable. Comments are stripped first, so
 *    a docstring may *explain* a prohibition without being counted as a violation.
 * 🔴 The M6 → M7 → M8 direction is asserted here too: the evidence pipeline has no back-edge.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../../..');
const INSIGHT_DIR = join(REPO_ROOT, 'src', 'application', 'insight');
const GROUNDING_DIR = join(REPO_ROOT, 'src', 'retrieval', 'grounding');
const COMPARE_DIR = join(REPO_ROOT, 'src', 'retrieval', 'compare');

function listProductionFiles(directory: string): readonly string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listProductionFiles(path));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
}

/** Removes comments so prose *about* a prohibition is not counted as a violation. */
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

interface SourceFile {
  readonly name: string;
  readonly code: string;
}

const FILES: readonly SourceFile[] = listProductionFiles(INSIGHT_DIR).map((path) => ({
  name: relative(REPO_ROOT, path).replace(/\\/g, '/'),
  code: stripComments(readFileSync(path, 'utf8')),
}));

function filesContaining(token: string): readonly string[] {
  return FILES.filter((file) => file.code.includes(token)).map((file) => file.name);
}

function assertTokenAbsent(tokens: readonly string[]): void {
  for (const file of FILES) {
    for (const token of tokens) {
      assert.equal(file.code.includes(token), false, `${file.name} must not contain "${token}"`);
    }
  }
}

describe('IMPLEMENTATION INVARIANT｜M8 production-source static audit', () => {
  it('IMPLEMENTATION INVARIANT: the audit is not vacuous - `M8` really has production sources', () => {
    assert.ok(FILES.length >= 10, `expected production sources, found ${FILES.length}`);
    const names = FILES.map((file) => file.name);
    for (const expected of [
      'src/application/insight/types.ts',
      'src/application/insight/schemas.ts',
      'src/application/insight/prompts.ts',
      'src/application/insight/evidence.ts',
      'src/application/insight/gates.ts',
      'src/application/insight/lifecycle.ts',
      'src/application/insight/persistence.ts',
      'src/application/insight/insight-repository.ts',
      'src/application/insight/insight-service.ts',
      'src/application/insight/generalization.ts',
      'src/application/insight/identity.ts',
      'src/application/insight/index.ts',
    ]) {
      assert.ok(names.includes(expected), `${expected} is missing`);
    }
  });

  it('AC-23 / IMPLEMENTATION INVARIANT（task §11）: the E2 / E3 DECISION points carry no numeric judgement quantity', () => {
    /* 🔴 `schemas.ts` names these concepts only to REFUSE them; the files that decide E2 / E3 -
       and everything else - must not contain them at all. */
    const DECISION_FILES = [
      'src/application/insight/gates.ts',
      'src/application/insight/insight-service.ts',
      'src/application/insight/lifecycle.ts',
      'src/application/insight/generalization.ts',
      'src/application/insight/persistence.ts',
      'src/application/insight/prompts.ts',
      'src/application/insight/evidence.ts',
      'src/application/insight/types.ts',
    ];
    for (const name of DECISION_FILES) {
      const file = FILES.find((candidate) => candidate.name === name);
      assert.ok(file !== undefined, `${name} must exist`);
      for (const token of [
        'confidence',
        'score',
        'percentage',
        'grade',
        'similarity',
        'weight',
        'rank',
        'cosine',
        'embedding',
        'vectorStore',
        'pgvector',
      ]) {
        assert.equal(
          file.code.includes(token),
          false,
          `${name} must not contain "${token}" - E2 / E3 are discrete judgements (task §11 / AC-23)`,
        );
      }
    }
    assertTokenAbsent(['e2_score', 'e3_score', 'e2_confidence', 'e3_confidence']);
  });

  it('AC-23: the ONLY place a scoring name appears is the refusal guard itself', () => {
    for (const token of ['confidence', 'quality_level', 'evidence_strength']) {
      assert.deepEqual(
        filesContaining(token),
        ['src/application/insight/schemas.ts'],
        `"${token}" may only appear in the guard that refuses it`,
      );
    }
  });

  it('IMPLEMENTATION INVARIANT（§12 item 10）: no second evidence system, no second reference vocabulary, no second count', () => {
    assertTokenAbsent([
      'EvidenceLink',
      'CitationRef',
      'GroundingRef',
      'HistoryRef',
      'evidence_index',
      'evidence_db',
      'evidenceStore',
      'citation_index',
      'fifth_role',
      'counted_target_ids:',
    ]);
    /* The frozen role set and the new reference shape are CONSUMED, never re-declared. */
    assertTokenAbsent(["role?:", 'RefRole = ', "'grounding' | 'support'"]);
    /* The ONE `N_引用` derivation is M7's - never re-implemented here. */
    assert.deepEqual(
      FILES.flatMap((file) =>
        [...file.code.matchAll(/export function deriveCitationView/g)].map(() => file.name),
      ),
      [],
    );
    assert.deepEqual(
      FILES.flatMap((file) =>
        [...file.code.matchAll(/export function deriveNCitation/g)].map(() => file.name),
      ),
      [],
    );
  });

  it('AC-122 / D-051: no version system, no counter and no rollback exists', () => {
    assertTokenAbsent([
      'version_number',
      'generation_version',
      'revision_history',
      'rollback',
      'restoreOldVersion',
      'edit_count',
      'modification_count',
    ]);
    /* `generation_batch` is the ONLY batch-shaped name, and it is not a version. */
    const batchNames = FILES.flatMap((file) =>
      [...file.code.matchAll(/(generation_number|generation_index|batch_ordinal)/g)].map(
        () => file.name,
      ),
    );
    assert.deepEqual(batchNames, []);
  });

  it('AC-13 / D-015: `Experience Asset` is a VIEW, never a second entity or repository', () => {
    assertTokenAbsent([
      'ExperienceAssetRepository',
      'ExperienceAssetTable',
      'experience_assets',
      'newExperienceAssetId',
      'createExperienceAsset',
    ]);
  });

  it('AC-28 / IMPLEMENTATION INVARIANT（D-022 / task §4）: no background, scheduled, watched or batch generation path exists', () => {
    assertTokenAbsent([
      'setInterval',
      'setTimeout',
      'setImmediate',
      'cron',
      'watchFile',
      'fs.watch',
      'chokidar',
      'EventEmitter',
      'queueMicrotask',
      'requestIdleCallback',
      'MutationObserver',
    ]);
  });

  it('AC-133 / AC-134: no credential and no concrete provider implementation is reachable', () => {
    assertTokenAbsent(['CredentialSecret', 'process.env', 'Authorization', 'api_key', 'apiKey']);
    for (const file of FILES) {
      const specifiers = [...file.code.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1] ?? '');
      for (const specifier of specifiers) {
        for (const forbidden of [
          '/browser/',
          '/server/',
          'api/proxy',
          '/ui/',
          '/capture/',
          'browser-direct-adapter',
          'thin-proxy',
        ]) {
          assert.equal(
            specifier.includes(forbidden),
            false,
            `${file.name} must not import "${specifier}"`,
          );
        }
      }
    }
  });

  it('IMPLEMENTATION INVARIANT（task §3）: `M8` never depends on `M6` internals beyond the read model, nor on `M9`/`M15`', () => {
    for (const file of FILES) {
      const specifiers = [...file.code.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1] ?? '');
      for (const specifier of specifiers) {
        assert.equal(
          /hypothesis/i.test(specifier),
          false,
          `${file.name} must not import "${specifier}" - M9 is a later stage`,
        );
      }
      /* `M6` may only be consumed through its public read model. */
      if (file.code.includes('../retrieval/compare/')) {
        assert.ok(
          [
            'src/application/insight/insight-service.ts',
            'src/application/insight/evidence.ts',
            'src/application/insight/prompts.ts',
          ].includes(file.name),
          `${file.name} may consume M6 only at the documented points`,
        );
      }
    }
  });

  it('IMPLEMENTATION INVARIANT（Gate C Plan §I.1 / RC-01）: `M6` and `M7` stay free of any `M8` back-edge', () => {
    for (const directory of [GROUNDING_DIR, COMPARE_DIR]) {
      const sources = listProductionFiles(directory);
      assert.ok(sources.length > 0);
      for (const path of sources) {
        const code = stripComments(readFileSync(path, 'utf8'));
        for (const specifier of [...code.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1] ?? '')) {
          assert.equal(
            specifier.includes('application/insight') || specifier.includes('/insight/'),
            false,
            `${relative(REPO_ROOT, path).replace(/\\/g, '/')} must not depend on M8 ("${specifier}")`,
          );
        }
      }
    }
  });

  it('IMPLEMENTATION INVARIANT（task §7 / §38 V1）: `M8` constructs no `EvidenceRef` of its own', () => {
    /* The only reference-producing call site is M7's validator. */
    assert.deepEqual(filesContaining('buildGroundingContext'), [
      'src/application/insight/evidence.ts',
    ]);
    /* `M8` never mints a reference identity. */
    assert.deepEqual(filesContaining('newEvidenceRefId'), []);
    /* `evidence_ref_id` is only ever read back from / written into the persisted document. */
    assert.deepEqual(filesContaining('evidence_ref_id'), [
      'src/application/insight/persistence.ts',
    ]);
    /* The `M7` role rules are consumed, never restated. */
    assert.deepEqual(filesContaining('allowedRefRolesFor'), []);
    assert.deepEqual(filesContaining('isGroundingAllowedForContentItem'), []);
  });

  it('IMPLEMENTATION INVARIANT: the barrel exports `M8` without reaching outside the module', () => {
    const barrel = readFileSync(join(INSIGHT_DIR, 'index.ts'), 'utf8');
    for (const specifier of [...barrel.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1] ?? '')) {
      assert.ok(specifier.startsWith('./'), `the barrel may only re-export local modules ("${specifier}")`);
    }
    assert.ok(barrel.includes("export * from './insight-service.js';"));
  });
});
