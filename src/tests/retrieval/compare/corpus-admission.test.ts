/**
 * S01-03 ｜ Candidate corpus, admission and `N_検索`.
 *
 * Canonical acceptance points: `AC-20` (`D-019` Level B alone is never enough), `AC-79`/`AC-85`
 * (only `Formal`, non-archived records take part; `N_検索` is not truncated by the first screen),
 * `AC-82`/`AC-83`/`AC-86` (`D-046`), plus the `IMPLEMENTATION INVARIANT`s that the filter is a
 * single point, that a count is never a strength and that only Level A feeds the comparison.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { makeHarness } from './harness.js';
import type { RetrievalHarness } from './harness.js';
import { eligibleHistoricalAttempts } from '../../../retrieval/compare/corpus.js';
import { matchedDimensionsOf } from '../../../retrieval/compare/derivation.js';
import { retrievalViewOf } from '../../../retrieval/compare/retrieval-service.js';
import type {
  RetrievalCompleted,
  RunRetrievalOutcome,
} from '../../../retrieval/compare/retrieval-service.js';
import type {
  CandidateEntry,
  RetrievalDerivationRecord,
} from '../../../retrieval/compare/types.js';

/**
 * The judge double answers `compared_not_matched` for everything, so ANY difference the
 * deterministic rule cannot decide also stays not-matched. Identical values still match
 * deterministically - which makes each fixture's matched set fully predictable.
 */
function harness(): RetrievalHarness {
  return makeHarness(() => ({
    kind: 'structured',
    value: { verdict: 'compared_not_matched', reason: 'NOT_A_REAL_LLM_OUTPUT' },
  }));
}

function completed(outcome: RunRetrievalOutcome): RetrievalCompleted {
  assert.equal(outcome.kind, 'completed');
  if (outcome.kind !== 'completed') {
    throw new Error('unreachable');
  }
  return outcome;
}

function derivationOf(outcome: RunRetrievalOutcome): RetrievalDerivationRecord {
  return completed(outcome).derivation;
}

function entryAt(record: RetrievalDerivationRecord, index: number): CandidateEntry {
  const found = record.candidate_entries[index];
  assert.ok(found !== undefined, `candidate entry ${index} missing`);
  return found as CandidateEntry;
}

const DIFFERENT = {
  goal: '完全不同的目标',
  approach: '完全不同的方案',
  condition: '完全不同的条件',
  result: '完全不同的结果',
} as const;

describe('S01-03｜candidate corpus and admission', () => {
  it('AC-79: 单点过滤排除 Draft / archived / 源自身', async () => {
    const h = harness();
    const source = await h.seed({ goal: 'G' });
    await h.seed({ goal: 'G', state: 'Draft' });
    await h.seed({ goal: 'G', archive_state: 'archived' });
    const kept = await h.seed({ goal: 'G' });
    const alsoKept = await h.seed({ ...DIFFERENT, state: 'Formal' });

    const eligible = eligibleHistoricalAttempts(
      source.attempt_id,
      await h.repository.listAttempts(),
    );
    // 只有两条仍为 Formal 且未归档、且不是源自身的记录存活。
    assert.deepEqual(
      [...eligible.map((attempt) => attempt.attempt_id)].sort(),
      [kept.attempt_id, alsoKept.attempt_id].sort(),
    );
  });

  it('AC-79: Draft 记录不进入候选 corpus', async () => {
    const h = harness();
    const source = await h.seed({ goal: 'G', state: 'Formal' });
    await h.seed({ goal: 'G', state: 'Draft' });
    await h.seed({ ...DIFFERENT, state: 'Formal' });

    const record = derivationOf(
      await h.service.runRetrievalForFormalAttempt({ source_attempt_id: source.attempt_id }),
    );
    // 只有那一条 Formal 进入 corpus；Draft 即便 Level A 完全相同也不参与。
    assert.equal(record.eligible_history_count, 1);
    assert.equal(record.status, 'NO_RELATED_HISTORY');
    assert.equal(record.n_retrieval, 0);
  });

  it('AC-85: archived 记录不进入候选 corpus', async () => {
    const h = harness();
    const source = await h.seed({ goal: 'G', state: 'Formal' });
    await h.seed({ goal: 'G', state: 'Formal', archive_state: 'archived' });
    await h.seed({ ...DIFFERENT, state: 'Formal' });

    const record = derivationOf(
      await h.service.runRetrievalForFormalAttempt({ source_attempt_id: source.attempt_id }),
    );
    assert.equal(record.eligible_history_count, 1);
    assert.equal(record.n_retrieval, 0);
  });

  it('AC-86: 源记录自身不被当作自己的历史', async () => {
    const h = harness();
    const source = await h.seed({ goal: 'G' });
    const candidate = await h.seed({ goal: 'G' });

    const record = derivationOf(
      await h.service.runRetrievalForFormalAttempt({ source_attempt_id: source.attempt_id }),
    );
    assert.equal(record.eligible_history_count, 1);
    assert.equal(record.n_retrieval, 1);
    assert.equal(entryAt(record, 0).candidate_attempt_id, candidate.attempt_id);
  });

  it('AC-20: 不同 Project 的记录仍可 related（Project 不是准入过滤）', async () => {
    const h = harness();
    const source = await h.seed({ goal: 'G', project_id: 'PRJ_other-one' });
    await h.seed({ goal: 'G', project_id: 'PRJ_other-two' });

    const record = derivationOf(
      await h.service.runRetrievalForFormalAttempt({ source_attempt_id: source.attempt_id }),
    );
    assert.equal(record.n_retrieval, 1);
    assert.equal(record.status, 'RELATED_HISTORY');
    // Level B 只是解释上下文：它记录「同 Project」与否，绝不参与准入。
    assert.equal(entryAt(record, 0).level_b_context.same_project, false);
  });

  it('AC-20: 同一 Project 不会自动 related（Level B 齐备但 Level A 无重叠）', async () => {
    const h = harness();
    const source = await h.seed({
      goal: 'G',
      project_id: 'PRJ_shared',
      failure_tags: ['开裂'],
      environment: 'v1',
    });
    await h.seed({
      ...DIFFERENT,
      project_id: 'PRJ_shared',
      failure_tags: ['开裂'],
      environment: 'v1',
    });

    const record = derivationOf(
      await h.service.runRetrievalForFormalAttempt({ source_attempt_id: source.attempt_id }),
    );
    assert.equal(record.n_retrieval, 0);
    assert.equal(record.status, 'NO_RELATED_HISTORY');
    assert.deepEqual([...record.candidate_entries], []);
  });

  it('AC-83: 排除源自身后无可用历史 ⇒ HISTORY_EMPTY（正常成功状态）', async () => {
    const h = harness();
    const source = await h.seed({ goal: 'G' });

    const record = derivationOf(
      await h.service.runRetrievalForFormalAttempt({ source_attempt_id: source.attempt_id }),
    );
    assert.equal(record.status, 'HISTORY_EMPTY');
    assert.equal(record.n_retrieval, 0);
    assert.equal(record.eligible_history_count, 0);
    // 空历史也是成功落库状态，刷新后仍可读回同一结论。
    const reopened = await h.reopen().readCurrentDerivation(source.attempt_id);
    assert.equal(reopened?.status, 'HISTORY_EMPTY');
  });

  it('AC-83: 历史存在但无 related ⇒ NO_RELATED_HISTORY 且 N_检索 = 0', async () => {
    const h = harness();
    const source = await h.seed({ goal: 'G' });
    await h.seed({ ...DIFFERENT });

    const record = derivationOf(
      await h.service.runRetrievalForFormalAttempt({ source_attempt_id: source.attempt_id }),
    );
    assert.equal(record.status, 'NO_RELATED_HISTORY');
    assert.equal(record.n_retrieval, 0);
    assert.equal(record.eligible_history_count, 1);
    // 两种 0-like 状态语义不同，不得共用同一表述。
    assert.notEqual(record.status, 'HISTORY_EMPTY');
  });

  it('AC-85: Source Formal Gate — Draft 源记录不得执行检索', async () => {
    const h = harness();
    const draft = await h.seed({ goal: 'G', state: 'Draft' });
    await h.seed({ goal: 'G' });

    const outcome = await h.service.runRetrievalForFormalAttempt({
      source_attempt_id: draft.attempt_id,
    });
    assert.equal(outcome.kind, 'source_not_formal');
    if (outcome.kind !== 'source_not_formal') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.state, 'Draft');
    // Draft 不得被临时当作 Formal，也不得留下任何 Derivation 文件。
    assert.equal(await h.service.readCurrentDerivation(draft.attempt_id), null);
    assert.deepEqual([...h.retrievalFiles()], []);
  });

  it('IMPLEMENTATION INVARIANT（§16 / D-061）: 命中 1 个维度即 related，命中 0 个即不 related', async () => {
    const h = harness();
    const source = await h.seed({ goal: 'G', approach: 'S1', result: 'R1' });
    const oneMatch = await h.seed({ goal: 'G', approach: 'S2', result: 'R2' });
    await h.seed({ ...DIFFERENT });

    const record = derivationOf(
      await h.service.runRetrievalForFormalAttempt({ source_attempt_id: source.attempt_id }),
    );
    assert.equal(record.n_retrieval, 1);
    assert.equal(entryAt(record, 0).candidate_attempt_id, oneMatch.attempt_id);
    assert.deepEqual([...matchedDimensionsOf(entryAt(record, 0))], ['goal']);
  });

  it('AC-85: N_检索 = 完整 related 候选数，不被首屏 3 条截断', async () => {
    const h = harness();
    const source = await h.seed({ goal: 'G' });
    for (let index = 0; index < 5; index += 1) {
      await h.seed({ goal: 'G' });
    }

    const outcome = await h.service.runRetrievalForFormalAttempt({
      source_attempt_id: source.attempt_id,
    });
    const record = derivationOf(outcome);
    assert.equal(record.n_retrieval, 5);
    assert.equal(record.candidate_entries.length, 5);
    assert.equal(record.fold_hint.first_screen_size, 3);
    assert.equal(record.fold_hint.remaining_beyond_first_screen, 2);
    assert.equal(record.fold_hint.expandable, true);

    // 🔴 AC-82 / AC-85：首屏只影响展示，不得改变 N，也不得丢候选。
    const firstScreen = retrievalViewOf(record);
    assert.equal(firstScreen.candidates.length, 3);
    assert.equal(firstScreen.n_retrieval, 5);
    assert.equal(firstScreen.remaining_beyond_first_screen, 2);
    const expanded = retrievalViewOf(record, { expanded: true });
    assert.equal(expanded.candidates.length, 5);
    assert.equal(expanded.n_retrieval, 5);
    assert.equal(completed(outcome).snapshot.n_retrieval, 5);
  });

  it('AC-85: N_检索 由现有 NRetrievalSnapshot 口径给出（§21 不新增第二套定义）', async () => {
    const h = harness();
    const source = await h.seed({ goal: 'G' });
    await h.seed({ goal: 'G' });
    await h.seed({ goal: 'G' });

    const outcome = completed(
      await h.service.runRetrievalForFormalAttempt({ source_attempt_id: source.attempt_id }),
    );
    assert.equal(outcome.snapshot.attempt_id, source.attempt_id);
    assert.equal(outcome.snapshot.n_retrieval, outcome.derivation.n_retrieval);
    assert.equal(outcome.snapshot.retrieval_tier, '2+');
    assert.equal(outcome.snapshot.eligible_attempt_ids.length, 2);
    assert.equal(Object.keys(outcome.snapshot.matched_level_a_dimensions_by_attempt).length, 2);
  });

  it('IMPLEMENTATION INVARIANT（§22 / D-037）: 命中维度数不产生排序或强度差异', async () => {
    const h = harness();
    const source = await h.seed({
      goal: 'G',
      approach: 'A',
      condition: 'C',
      result: 'R',
      attempt_id: 'ATT_0000000000000000000000000S',
    });
    const many = await h.seed({
      goal: 'G',
      approach: 'A',
      condition: 'C',
      result: 'R',
      attempt_id: 'ATT_0000000000000000000000002',
    });
    const few = await h.seed({ goal: 'G', approach: 'S2', result: 'R2', attempt_id: 'ATT_0000000000000000000000001' });

    const record = derivationOf(
      await h.service.runRetrievalForFormalAttempt({ source_attempt_id: source.attempt_id }),
    );
    assert.equal(record.n_retrieval, 2);
    // 3 命中 vs 1 命中：顺序仍只由固定排序规则决定（此处按 attempt_id），不体现「更强」。
    assert.deepEqual(
      [...record.candidate_entries.map((entry) => entry.candidate_attempt_id)],
      [few.attempt_id, many.attempt_id],
    );
    for (const entry of record.candidate_entries) {
      assert.deepEqual(Object.keys(entry).sort(), [
        'candidate_attempt_id',
        'difference_points',
        'dimension_states',
        'level_b_context',
        'relevance_reasons',
        'similar_points',
      ]);
    }
    // 条目中不存在任何表示强度 / 顺序 / 数值等级的字段。
    const serialized = JSON.stringify(record.candidate_entries);
    for (const forbidden of ['strength', 'rank', 'weight', 'order_key']) {
      assert.equal(serialized.includes(forbidden), false, `${forbidden} must not appear`);
    }
  });

  it('IMPLEMENTATION INVARIANT（§31 / Level A 唯一输入）: result_status 文本变化不影响 Level A 比较', async () => {
    const h = harness();
    const source = await h.seed({ goal: 'G', result_status_value: 'Failed' });
    await h.seed({
      goal: 'G',
      result_status_value: 'Failed',
      attempt_id: 'ATT_0000000000000000000000001',
    });
    await h.seed({
      goal: 'G',
      result_status_value: '成功',
      attempt_id: 'ATT_0000000000000000000000002',
    });

    const record = derivationOf(
      await h.service.runRetrievalForFormalAttempt({ source_attempt_id: source.attempt_id }),
    );
    assert.equal(record.n_retrieval, 2);
    assert.equal(
      JSON.stringify(entryAt(record, 0).dimension_states),
      JSON.stringify(entryAt(record, 1).dimension_states),
    );
  });

  it('IMPLEMENTATION INVARIANT（§32 / Evidence 边界）: Retrieval Derivation 不创建 EvidenceRef', async () => {
    const h = harness();
    const source = await h.seed({ goal: 'G' });
    await h.seed({ goal: 'G' });

    const record = derivationOf(
      await h.service.runRetrievalForFormalAttempt({ source_attempt_id: source.attempt_id }),
    );
    const serialized = JSON.stringify(record);
    assert.equal(serialized.includes('evidence_ref'), false);
    assert.equal(serialized.includes('n_citation'), false);
    assert.equal(serialized.includes('grounding'), false);
  });
});
