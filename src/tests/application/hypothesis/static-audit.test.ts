/**
 * S01 ｜ Static audit of the production sources of `M9` (task §3, §23, §29, §50, §51).
 *
 * Contract: `D-020` / `D-037` (no numeric judgement quantity anywhere), `D-054` (`RAG ≠ 向量检索`),
 * `D-041` (a `Hypothesis` never becomes an `Experience Asset`), `D-042` (SAVE ≠ ACCEPT), `D-051` /
 * AC-122 (no version system), §5.1 / §5.2 (one reference system), §12 item 10 (no second count),
 * AC-133 / AC-134 (no credential), §0.4 A (no DOM in the core).
 *
 * 🔴 This is an `IMPLEMENTATION INVARIANT` suite, not a product AC: it asserts that the STRUCTURE of the
 *    production sources makes the forbidden things unreachable. Comments are stripped first, so a
 *    docstring may *explain* a prohibition without being counted as a violation.
 * 🔴 The `M6 → M7 → M8 → M9` direction is asserted here too: the evidence pipeline has no back-edge.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../../..');
const HYPOTHESIS_DIR = join(REPO_ROOT, 'src', 'application', 'hypothesis');
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

const FILES: readonly SourceFile[] = listProductionFiles(HYPOTHESIS_DIR).map((path) => ({
  name: relative(REPO_ROOT, path).replace(/\\/g, '/'),
  code: stripComments(readFileSync(path, 'utf8')),
}));

/** Files that legitimately NAME a forbidden concept in order to REFUSE it. */
const REFUSAL_GUARD_FILES: readonly string[] = [
  'src/application/hypothesis/schemas.ts',
  'src/application/hypothesis/structure.ts',
  'src/application/hypothesis/text.ts',
];

function filesContaining(token: string): readonly string[] {
  return FILES.filter((file) => file.code.includes(token))
    .map((file) => file.name)
    .sort();
}

function assertTokenAbsent(tokens: readonly string[], scope: readonly SourceFile[] = FILES): void {
  for (const file of scope) {
    for (const token of tokens) {
      assert.equal(file.code.includes(token), false, `${file.name} must not contain "${token}"`);
    }
  }
}

function importSpecifiersOf(code: string): readonly string[] {
  return [...code.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1] ?? '');
}

describe('IMPLEMENTATION INVARIANT｜M9 production-source static audit', () => {
  it('IMPLEMENTATION INVARIANT: the audit is not vacuous - `M9` really has production sources', () => {
    assert.ok(FILES.length >= 15, `expected production sources, found ${FILES.length}`);
    const names = FILES.map((file) => file.name);
    for (const expected of [
      'src/application/hypothesis/types.ts',
      'src/application/hypothesis/identity.ts',
      'src/application/hypothesis/structure.ts',
      'src/application/hypothesis/text.ts',
      'src/application/hypothesis/verifiability.ts',
      'src/application/hypothesis/grounding.ts',
      'src/application/hypothesis/exits.ts',
      'src/application/hypothesis/schemas.ts',
      'src/application/hypothesis/prompts.ts',
      'src/application/hypothesis/evidence.ts',
      'src/application/hypothesis/editable-items.ts',
      'src/application/hypothesis/lifecycle.ts',
      'src/application/hypothesis/persistence.ts',
      'src/application/hypothesis/hypothesis-repository.ts',
      'src/application/hypothesis/structured-invoke.ts',
      'src/application/hypothesis/hypothesis-service.ts',
      'src/application/hypothesis/index.ts',
    ]) {
      assert.ok(names.includes(expected), `${expected} is missing`);
    }
  });

  it('AC-23 / D-037: the DECISION sources carry no numeric judgement quantity', () => {
    const decision_files = FILES.filter((file) => !REFUSAL_GUARD_FILES.includes(file.name));
    assert.ok(decision_files.length >= 10, 'the scope must not be accidentally emptied');
    assertTokenAbsent(
      [
        'confidence',
        'evidence_strength',
        'quality_level',
        'similarity',
        'rank_score',
        'grade',
        'partial_grounding',
        'mixed_source_partition',
        'anchor_level',
      ],
      decision_files,
    );
    /* The scoring vocabulary may appear ONLY in the guards that refuse it. */
    assert.deepEqual(filesContaining('confidence'), [
      'src/application/hypothesis/schemas.ts',
      'src/application/hypothesis/structure.ts',
    ]);
    assert.deepEqual(filesContaining('quality_level'), ['src/application/hypothesis/schemas.ts']);
    assert.deepEqual(filesContaining('evidence_strength'), ['src/application/hypothesis/schemas.ts']);
  });

  it('[IMPLEMENTATION INVARIANT] D-054: no embedding, no vector database, no second retrieval system', () => {
    assertTokenAbsent([
      'embedding',
      'vectorStore',
      'pgvector',
      'cosine',
      'vector_db',
      'VectorIndex',
      'ANN_INDEX',
    ]);
  });

  it('D-041 / AC-41: a Hypothesis never becomes an Experience Asset, and no promotion API exists', () => {
    assertTokenAbsent([
      'ExperienceAssetRepository',
      'ExperienceAssetTable',
      'experience_assets',
      'PromoteHypothesisToInsight',
      'ConvertToExperienceAsset',
      'promoteHypothesis',
      'graduatedHypothesis',
    ]);
    /* 🔴 `is_experience_asset` is a read-model FIELD that is always `false`, never a promotion path. */
    const service = FILES.find((file) => file.name.endsWith('hypothesis-service.ts'));
    assert.ok(service !== undefined);
    assert.equal(/is_experience_asset:\s*true/.test(service.code), false);
  });

  it('[IMPLEMENTATION INVARIANT] §5.1 / §12 item 10: no second reference system and no second count', () => {
    assertTokenAbsent([
      'EvidenceLink',
      'CitationRef',
      'GroundingRef',
      'HistoryRef',
      'evidence_index',
      'citation_index',
      'five_roles',
      'fifth_role',
    ]);
    /* The ONE `N_引用` derivation stays `M7`'s. */
    assert.deepEqual(
      FILES.flatMap((file) =>
        [...file.code.matchAll(/export function (deriveCitationView|deriveNCitation)/g)].map(
          () => file.name,
        ),
      ),
      [],
    );
    /* The frozen role set is consumed, never re-declared. */
    assertTokenAbsent(["role?:", 'RefRole = ', "'grounding' | 'support'"]);
  });

  it('[IMPLEMENTATION INVARIANT] §7 / §9: `M9` constructs no `EvidenceRef` of its own', () => {
    assert.deepEqual(filesContaining('buildGroundingContext'), [
      'src/application/hypothesis/evidence.ts',
    ]);
    assert.deepEqual(filesContaining('newEvidenceRefId'), []);
    assert.deepEqual(filesContaining('evidence_ref_id'), [
      'src/application/hypothesis/persistence.ts',
    ]);
    /* The `M7` rules are consumed, never restated. */
    assert.deepEqual(filesContaining('allowedRefRolesFor'), []);
    assert.deepEqual(filesContaining('isGroundingAllowedForContentItem'), []);
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
      'batch_ordinal',
      'generation_index',
    ]);
  });

  it('[IMPLEMENTATION INVARIANT] §22: no automatic decision path exists', () => {
    assertTokenAbsent([
      'autoAccept',
      'auto_accept',
      'acceptAll',
      'autoDecision',
      'autoPromote',
      'markedAccepted',
    ]);
  });

  it('[IMPLEMENTATION INVARIANT] §0.4 A: the core carries no DOM, no Node runtime API and no network', () => {
    assertTokenAbsent([
      'window.',
      'document.',
      'FileSystemDirectoryHandle',
      'showDirectoryPicker',
      'localStorage',
      'fetch(',
      'XMLHttpRequest',
      'process.env',
      'require(',
      'import(',
    ]);
  });

  it('AC-133 / AC-134: no credential, no concrete provider implementation and no background work', () => {
    assertTokenAbsent([
      'CredentialSecret',
      'api_key',
      'apiKey',
      'access_token',
      'refresh_token',
      'Authorization',
      'browser-direct-adapter',
      'thin-proxy',
    ]);
    assertTokenAbsent([
      'setInterval',
      'setTimeout',
      'setImmediate',
      'cron',
      'watchFile',
      'chokidar',
      'EventEmitter',
      'queueMicrotask',
      'MutationObserver',
    ]);
    for (const file of FILES) {
      for (const specifier of importSpecifiersOf(file.code)) {
        for (const forbidden of [
          '/browser/',
          '/server/',
          'api/proxy',
          '/ui/',
          '/app/',
          '/capture/',
          '/m15/',
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

  it('[IMPLEMENTATION INVARIANT] §3: `M9` consumes the `M8` READ model only, and `M6`/`M7`/`M8` have no `M9` back-edge', () => {
    const insight_importers = FILES.filter((file) =>
      importSpecifiersOf(file.code).some((specifier) => /\/insight\//.test(specifier)),
    ).map((file) => file.name);
    assert.deepEqual(insight_importers, ['src/application/hypothesis/types.ts']);
    /* 🔴 And even that one import is a TYPE-ONLY read of the `M8` read model. */
    const types_file = FILES.find((file) => file.name === 'src/application/hypothesis/types.ts');
    assert.ok(types_file !== undefined);
    assert.match(types_file.code, /import type \{[^}]*InsightView[^}]*\} from '\.\.\/insight\/types\.js';/s);
    assert.equal(/InsightService|generateCandidateInsights/.test(types_file.code), false);

    for (const directory of [GROUNDING_DIR, COMPARE_DIR, INSIGHT_DIR]) {
      const sources = listProductionFiles(directory);
      assert.ok(sources.length > 0);
      for (const path of sources) {
        const code = stripComments(readFileSync(path, 'utf8'));
        for (const specifier of importSpecifiersOf(code)) {
          assert.equal(
            specifier.includes('application/hypothesis') || specifier.includes('/hypothesis/'),
            false,
            `${relative(REPO_ROOT, path).replace(/\\/g, '/')} must not depend on M9 ("${specifier}")`,
          );
        }
      }
    }
  });

  it('[AC-33] §8.1: the word `CandidateInsight` appears ONLY inside the guard that refuses it', () => {
    assert.deepEqual(filesContaining('CandidateInsight'), [
      'src/application/hypothesis/text.ts',
    ]);
    /* And nothing ever NAMES a Hypothesis with it. */
    assertTokenAbsent(['hypothesisKind = \'candidate\'', "kind: 'candidate'", 'HypothesisCandidate']);
  });

  it('IMPLEMENTATION INVARIANT: the barrel exports `M9` without reaching outside the module', () => {
    const barrel = readFileSync(join(HYPOTHESIS_DIR, 'index.ts'), 'utf8');
    for (const specifier of importSpecifiersOf(barrel)) {
      assert.ok(specifier.startsWith('./'), `the barrel may only re-export local modules ("${specifier}")`);
    }
    assert.ok(barrel.includes("export * from './hypothesis-service.js';"));
    assert.ok(barrel.includes("export * from './persistence.js';"));
  });

  it('[IMPLEMENTATION INVARIANT] the module boundary is readable: every production file states what it is NOT', () => {
    for (const file of FILES) {
      const raw = readFileSync(join(REPO_ROOT, file.name), 'utf8');
      assert.match(raw, /Framework-neutral: NO DOM/, `${file.name} must state its framework neutrality`);
    }
  });
});
