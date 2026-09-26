/**
 * S01-03 ｜ Static audit of the production sources of layer 3 (`M6`).
 *
 * Contract: `D-061` (`R-A`, no ordered-category / numeric admission), `D-054` (`RAG ≠ 向量检索`;
 * `ResearchContextProvider` = RESERVED ONLY), `D-020`/`D-037`/AC-23 (no numeric judgement quantity),
 * §3.2 (identity is never a position), §24–§32 of the S01-03 task.
 *
 * 🔴 This is an `IMPLEMENTATION INVARIANT` suite, not a product AC: it does not test behaviour, it
 *    asserts that the STRUCTURE of the production sources makes the forbidden things impossible to
 *    reach - a single-point filter, a single ordering definition, a single Level A mapping, and no
 *    numeric-judgement vocabulary anywhere. Several cases deliberately contain the forbidden strings
 *    as NEGATIVE ASSERTIONS, which is why they may appear in this test file and nowhere else.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
/**
 * Both layouts resolve to the repository root: `src/tests/retrieval/compare/` for the sources and
 * `dist-test/tests/retrieval/compare/` for the emitted suite are the same distance from the root.
 */
const REPO_ROOT = resolve(HERE, '../../../..');
/**
 * 🔴 M7 就地补注（不改写上文）：本文件的射程 = **`M6` 自己的模块目录**。
 *
 * 原文把扫描根写成整个 `src/retrieval`（当时该目录下只有 `compare/**`，两者等价）。`M7` 落地后
 * `src/retrieval/grounding/**`（Grounding Context Builder）与 `M6` 合法地处在同一层，而 `M7`
 * 的职责**恰好**要求它引用 `EvidenceRef` / `evidence_ref_id` / 读取 target 的当前归档状态 ——
 * 于是「整个 `src/retrieval` 不得出现这些 token」这条**原本只针对 `M6` 的边界断言**会把 `M7`
 * 的正常实现判为违规（实测：3 条子测试失败，全部指向 `src/retrieval/grounding/**`）。
 *
 * 因此这里只把扫描根收紧到本模块自己的目录：**`M6` 的每一条断言一条未删、强度一字未减**，
 * 只是不再越界断言 `M7` 的模块。`M7` 自己的等价边界审计见
 * `src/tests/retrieval/grounding/m7-static-audit.test.ts`。
 * 🔴 本次修改不新增 / 不删除任何 `AC`，不改变任何产品语义，只修正一条测试的射程。
 */
const M6_DIR = join(REPO_ROOT, 'src', 'retrieval', 'compare');

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

interface SourceFile {
  readonly path: string;
  readonly name: string;
  readonly text: string;
}

const FILES: readonly SourceFile[] = listProductionFiles(M6_DIR).map((path) => ({
  path,
  name: relative(REPO_ROOT, path).replace(/\\/g, '/'),
  text: readFileSync(path, 'utf8'),
}));

describe('IMPLEMENTATION INVARIANT｜M6 production-source static audit', () => {
  it('IMPLEMENTATION INVARIANT: the audit is not vacuous - layer 3 really has production sources', () => {
    assert.ok(FILES.length >= 10, `expected production sources, found ${FILES.length}`);
    const names = FILES.map((file) => file.name);
    for (const expected of [
      'src/retrieval/compare/comparator.ts',
      'src/retrieval/compare/corpus.ts',
      'src/retrieval/compare/ordering.ts',
      'src/retrieval/compare/persistence.ts',
      'src/retrieval/compare/retrieval-derivation-repository.ts',
      'src/retrieval/compare/retrieval-service.ts',
    ]) {
      assert.ok(names.includes(expected), `${expected} is missing`);
    }
  });

  it('AC-23 / D-020: no numeric-similarity vocabulary in the production sources', () => {
    const forbidden = [
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
    ];
    for (const file of FILES) {
      for (const token of forbidden) {
        assert.equal(
          file.text.includes(token),
          false,
          `${file.name} must not contain "${token}"`,
        );
      }
    }
  });

  it('AC-23 / D-054: no 向量 / 距离 / 图数据库 style retrieval route may be imported', () => {
    for (const file of FILES) {
      for (const token of [
        '向量数据库',
        'pgvector',
        'pinecone',
        'milvus',
        'weaviate',
        'elasticsearch',
        '知识图谱',
      ]) {
        assert.equal(
          file.text.toLowerCase().includes(token.toLowerCase()),
          false,
          `${file.name} must not reference "${token}"`,
        );
      }
    }
    // The negative assertions above only mean something if the strings exist somewhere: this very
    // file carries them, so the guard proves absence in PRODUCTION rather than absence everywhere.
    const self = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    assert.ok(self.includes('similarity') && self.includes('cosine'));
  });

  it('IMPLEMENTATION INVARIANT（§3 dependency direction）: layer 3 imports no upper layer', () => {
    for (const file of FILES) {
      const specifiers = [...file.text.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1] ?? '');
      for (const specifier of specifiers) {
        for (const forbidden of [
          '/application/',
          '/browser/',
          '/server/',
          'api/proxy',
          '/ui/',
        ]) {
          assert.equal(
            specifier.includes(forbidden),
            false,
            `${file.name} must not import "${specifier}"`,
          );
        }
      }
      assert.equal(file.text.includes("from '../../../app/"), false, file.name);
    }
  });

  it('IMPLEMENTATION INVARIANT（§32 Evidence 边界）: layer 3 never touches EvidenceRef / N_引用', () => {
    for (const file of FILES) {
      // Module paths and identifier-shaped tokens are forbidden outright: importing or building one
      // is what would actually cross the boundary.
      for (const token of [
        'evidence-ref',
        'evidence_ref_id',
        'n_citation',
        'NCitationSnapshot',
      ]) {
        assert.equal(
          file.text.includes(token),
          false,
          `${file.name} must not reference "${token}"`,
        );
      }
    }
    /*
     * 🔴 DOCUMENTED EXCEPTION (task §46): the type NAME may appear only inside a sentence that
     *    NEGATES it - i.e. only as the boundary statement "this layer does not build one". Any other
     *    mention would be a real dependency and fails here.
     */
    let mentions = 0;
    for (const file of FILES) {
      for (const line of file.text.split('\n')) {
        if (!line.includes('EvidenceRef')) {
          continue;
        }
        mentions += 1;
        assert.ok(
          /\bno\b|NOT|不得|不创建/.test(line),
          `${file.name}: a mention of EvidenceRef must be an explicit negation`,
        );
      }
    }
    assert.ok(mentions > 0, 'the boundary itself must still be stated');
  });

  it('IMPLEMENTATION INVARIANT（§6 单点过滤）: the corpus filter exists exactly once', () => {
    const eligibilityFiles = [
      ...new Set(
        FILES.flatMap((file) =>
          [...file.text.matchAll(/isEligibleForNewRetrieval/g)].map(() => file.name),
        ),
      ),
    ];
    assert.deepEqual([...eligibilityFiles], ['src/retrieval/compare/corpus.ts']);
    // `archive_state` may only be READ through the one filter, and the archive literal never
    // reappears here: the eligibility rule itself lives in `src/domain` and is not restated.
    const archiveReaders = FILES.filter((file) => file.text.includes('archive_state')).map(
      (file) => file.name,
    );
    assert.deepEqual([...archiveReaders], ['src/retrieval/compare/corpus.ts']);
    for (const file of FILES) {
      assert.equal(file.text.includes("'active'"), false, file.name);
      assert.equal(file.text.includes('"active"'), false, file.name);
    }
  });

  it('IMPLEMENTATION INVARIANT（§16 / D-061）: `related` is derived in exactly one expression', () => {
    const derivations = FILES.flatMap((file) =>
      [...file.text.matchAll(/related:\s*matched\.length\s*>\s*0/g)].map(() => file.name),
    );
    assert.deepEqual([...derivations], ['src/retrieval/compare/comparator.ts']);
    for (const file of FILES) {
      assert.equal(file.text.includes('>= 2'), false, file.name);
      assert.equal(file.text.includes('matched.length >= '), false, file.name);
    }
  });

  it('IMPLEMENTATION INVARIANT（§4 唯一 Level A 映射）: the frozen field-path table is consumed, not copied', () => {
    for (const file of FILES) {
      assert.equal(
        file.text.includes("approach: 'actual_attempt'"),
        false,
        `${file.name} must not re-declare the §9.4.1 mapping`,
      );
      assert.equal(
        file.text.includes('LEVEL_A_FIELD_PATHS'),
        false,
        file.name,
      );
    }
    const projectionConsumers = FILES.filter((file) => file.text.includes('projectAttemptToLevelA'));
    assert.ok(projectionConsumers.length > 0, 'the single projection helper must be consumed');
  });

  it('IMPLEMENTATION INVARIANT（§18 全局单点）: `uncompared` has one global computation point', () => {
    const definitions = FILES.flatMap((file) =>
      [...file.text.matchAll(/export function globalUncomparedDimensionsOf/g)].map(() => file.name),
    );
    assert.deepEqual([...definitions], ['src/retrieval/compare/comparator.ts']);
  });

  it('IMPLEMENTATION INVARIANT（§25 非位置型身份）: no identity helper may take a position', () => {
    const helpers: { readonly file: string; readonly name: string; readonly params: string }[] = [];
    for (const file of FILES) {
      for (const match of file.text.matchAll(/export function\s+(\w*[Ii]d)\s*\(([^)]*)\)/g)) {
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
    // The derivation identity really is the one that decides identity, and it reads no position.
    assert.deepEqual(
      [...helpers.map((helper) => helper.name)],
      ['newRetrievalDerivationId', 'isRetrievalDerivationId'],
    );
  });
});
