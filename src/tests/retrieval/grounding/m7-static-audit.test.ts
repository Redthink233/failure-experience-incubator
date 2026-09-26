/**
 * S01 ｜ Static audit of the production sources of `M7` (task §34).
 *
 * Contract: `D-020` / `D-037` / `AC-23` (no numeric judgement quantity anywhere), `D-054`
 * (`RAG ≠ 向量检索`), 契约 §3.2 (identity is never a position), §5.2 rule 12 / §12 item 10 (no second
 * reference system), §7.4 (no archive snapshot), §12 items 10–11 (⑩ and `N_引用` share one set).
 *
 * 🔴 This is an `IMPLEMENTATION INVARIANT` suite, not a product AC: it asserts that the STRUCTURE of
 *    the production sources makes the forbidden things unreachable. Comments are stripped first, so
 *    a docstring may *explain* a prohibition without being counted as a violation.
 * 🔴 The counterpart audit for `M6` lives in `src/tests/retrieval/compare/static-audit.test.ts` and
 *    now scopes itself to its own module directory - see the note in that file.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../../..');
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

const FILES: readonly SourceFile[] = listProductionFiles(GROUNDING_DIR).map((path) => ({
  name: relative(REPO_ROOT, path).replace(/\\/g, '/'),
  code: stripComments(readFileSync(path, 'utf8')),
}));

function assertTokenAbsent(tokens: readonly string[]): void {
  for (const file of FILES) {
    for (const token of tokens) {
      assert.equal(
        file.code.includes(token),
        false,
        `${file.name} must not contain "${token}"`,
      );
    }
  }
}

describe('IMPLEMENTATION INVARIANT｜M7 production-source static audit', () => {
  it('IMPLEMENTATION INVARIANT: the audit is not vacuous - `M7` really has production sources', () => {
    assert.ok(FILES.length >= 6, `expected production sources, found ${FILES.length}`);
    const names = FILES.map((file) => file.name);
    for (const expected of [
      'src/retrieval/grounding/addressable.ts',
      'src/retrieval/grounding/catalog.ts',
      'src/retrieval/grounding/citation.ts',
      'src/retrieval/grounding/grounding-context.ts',
      'src/retrieval/grounding/identity.ts',
      'src/retrieval/grounding/reference-rules.ts',
      'src/retrieval/grounding/types.ts',
    ]) {
      assert.ok(names.includes(expected), `${expected} is missing`);
    }
  });

  it('AC-23 / D-020: no numeric-similarity vocabulary in the `M7` production sources', () => {
    assertTokenAbsent([
      'embedding',
      'cosine',
      'bm25',
      'similarity',
      'confidence',
      'percentage',
      'weight',
      'graded',
      'rank_score',
      'match_percentage',
      'relevance_level',
      'evidence_strength',
    ]);
  });

  it('AC-23 / D-054: no vector / distance / graph-database retrieval route is referenced', () => {
    assertTokenAbsent([
      '向量数据库',
      'pgvector',
      'pinecone',
      'milvus',
      'weaviate',
      'elasticsearch',
      '知识图谱',
      'vectorStore',
      'embed',
    ]);
  });

  it('IMPLEMENTATION INVARIANT（契约 §12 item 10 / §5.2 rule 12）: no second reference system exists', () => {
    assertTokenAbsent([
      'CitationRef',
      'GroundingRef',
      'HistoryRef',
      'EvidenceLink',
      'citation_index',
      'evidence_index',
      'refs_storage',
      'fifth_role',
    ]);
    /* The four-role vocabulary and the reference shape are CONSUMED, never re-declared. */
    assertTokenAbsent([
      "role?:",
      'RefRole = ',
      "'grounding' | 'support'",
    ]);
  });

  it('IMPLEMENTATION INVARIANT（契约 §7.4 / CCR-S03B-02）: no archive snapshot may exist', () => {
    assertTokenAbsent(['archived_at_ref', 'was_archived', 'archive_snapshot', 'archivedAtRef']);
    /* `archive_state` may only be READ, and only at the two dynamic-annotation points. */
    const readers = FILES.filter((file) => file.code.includes('archive_state')).map(
      (file) => file.name,
    );
    assert.deepEqual([...readers].sort(), [
      'src/retrieval/grounding/catalog.ts',
      'src/retrieval/grounding/citation.ts',
    ]);
  });

  it('IMPLEMENTATION INVARIANT（task §25）: `M7` never calls a model', () => {
    assertTokenAbsent([
      'ProviderAdapter',
      'AiRequest',
      'AiInvocation',
      'structured_output',
      'fetch(',
      'XMLHttpRequest',
      'WebSocket',
      'api/proxy',
    ]);
  });

  it('IMPLEMENTATION INVARIANT（契约 §3.3 / task §19）: one owner of the count, one owner of the role rule', () => {
    const countsReaders = FILES.filter((file) => file.code.includes('countsTowardNCitation')).map(
      (file) => file.name,
    );
    assert.deepEqual([...countsReaders], ['src/retrieval/grounding/citation.ts']);
    const citationHolders = FILES.filter((file) => file.code.includes('n_citation')).map(
      (file) => file.name,
    );
    assert.deepEqual([...citationHolders].sort(), [
      'src/retrieval/grounding/citation.ts',
      'src/retrieval/grounding/types.ts',
    ]);
    const definers = FILES.flatMap((file) =>
      [...file.code.matchAll(/export function deriveCitationView/g)].map(() => file.name),
    );
    assert.deepEqual([...definers], ['src/retrieval/grounding/citation.ts']);
  });

  it('IMPLEMENTATION INVARIANT（契约 §3.2 / task §17）: reference identity is never positional', () => {
    const helpers: { readonly file: string; readonly name: string; readonly params: string }[] = [];
    for (const file of FILES) {
      for (const match of file.code.matchAll(/export function\s+(\w*[Ii]d)\s*\(([^)]*)\)/g)) {
        helpers.push({ file: file.name, name: match[1] ?? '', params: match[2] ?? '' });
      }
    }
    assert.ok(helpers.length > 0, 'expected at least one identity helper');
    for (const helper of helpers) {
      for (const forbidden of ['index', 'position', 'offset', 'ordinal', 'length', 'count', 'order']) {
        assert.equal(
          helper.params.toLowerCase().includes(forbidden),
          false,
          `${helper.file}::${helper.name} must not derive identity from a position`,
        );
      }
    }
    assert.deepEqual(
      [...helpers.map((helper) => helper.name)],
      ['newEvidenceRefId', 'isEvidenceRefId', 'toEvidenceOwnerId', 'isAttemptTargetId'],
    );
    /* The `EREF_` prefix stays M7-local: the frozen global prefix table is not touched. */
    assertTokenAbsent(['ID_PREFIXES']);
  });

  it('IMPLEMENTATION INVARIANT（Gate C Plan §I.1 / RC-01）: the `M6` → `M7` edge stays one-way and no upper layer is imported', () => {
    for (const file of FILES) {
      const specifiers = [...file.code.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1] ?? '');
      for (const specifier of specifiers) {
        for (const forbidden of ['/application/', '/browser/', '/server/', 'api/proxy', '/ui/']) {
          assert.equal(
            specifier.includes(forbidden),
            false,
            `${file.name} must not import "${specifier}"`,
          );
        }
      }
      /* `M7` consumes `M6` one way, at three documented points and nowhere else. */
      if (file.code.includes('../compare/')) {
        assert.ok(
          [
            'src/retrieval/grounding/types.ts',
            'src/retrieval/grounding/catalog.ts',
            'src/retrieval/grounding/grounding-context.ts',
          ].includes(file.name),
          `${file.name} may consume M6 only at the documented points`,
        );
      }
    }

    const compareFiles = listProductionFiles(COMPARE_DIR);
    assert.ok(compareFiles.length >= 10, 'the M6 sources must exist');
    for (const path of compareFiles) {
      const code = stripComments(readFileSync(path, 'utf8'));
      for (const specifier of [...code.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1] ?? '')) {
        assert.equal(
          specifier.includes('grounding'),
          false,
          `${relative(REPO_ROOT, path)} must not depend on M7 ("${specifier}")`,
        );
      }
    }
  });

  it('IMPLEMENTATION INVARIANT（task §8 / §10 / §14）: the addressable surface excludes raw text and every Inference carrier', () => {
    const addressable = FILES.find((file) => file.name.endsWith('addressable.ts'));
    assert.ok(addressable !== undefined);
    /* The field list itself is the boundary: `raw_text`, `result_status` and `candidate_causes`
       must not be members of it. */
    const list = /GROUNDING_ATTEMPT_FIELD_PATHS = \[([\s\S]*?)\] as const/.exec(addressable.code);
    assert.ok(list !== null, 'the addressable field list must be declared');
    const body = list[1] ?? '';
    for (const forbidden of ['raw_text', 'result_status', 'candidate_causes']) {
      assert.equal(body.includes(forbidden), false, `"${forbidden}" must not be addressable`);
    }
    assert.equal(body.includes('key_parameters'), true, 'the parameter list stays addressable');
  });

  it('IMPLEMENTATION INVARIANT: the retrieval barrel exports `M6` and `M7` side by side', () => {
    const barrel = readFileSync(join(REPO_ROOT, 'src', 'retrieval', 'index.ts'), 'utf8');
    assert.ok(barrel.includes("export * from './compare/index.js';"));
    assert.ok(barrel.includes("export * from './grounding/index.js';"));
  });
});
