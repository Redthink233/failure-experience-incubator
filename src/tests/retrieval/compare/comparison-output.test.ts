/**
 * S01-03 ｜ Step ⑦ output (E1–E5).
 *
 * Canonical acceptance points: `AC-114` (an uncompared dimension is labelled neutrally),
 * `AC-125` (`D-052`: a `compared_not_matched` dimension never becomes a similar point),
 * `AC-126` (`D-052`: it never flips `related` and never hides the record), `AC-20`/`AC-86`
 * (`D-019`/`D-046`: Level B is explanation only), `AC-23` (`D-020`: no numeric similarity anywhere).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { makeHarness } from './harness.js';
import type { RetrievalHarness } from './harness.js';
import {
  UNCOMPARED_DIMENSION_LABEL,
  uncomparedDimensionNote,
} from '../../../retrieval/compare/comparison-points.js';
import { matchedDimensionsOf } from '../../../retrieval/compare/derivation.js';
import { retrievalViewOf } from '../../../retrieval/compare/retrieval-service.js';
import type { RetrievalView } from '../../../retrieval/compare/retrieval-service.js';
import type { RetrievalDerivationRecord } from '../../../retrieval/compare/types.js';
import type { LevelADimension } from '../../../domain/types/level-a.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';

const ID_SOURCE = 'ATT_0000000000000000000000000S';

function att(value: string): ObjectId<'ATT'> {
  return value as ObjectId<'ATT'>;
}

function harness(): RetrievalHarness {
  return makeHarness(() => ({
    kind: 'structured',
    value: { verdict: 'compared_not_matched', reason: 'NOT_A_REAL_LLM_OUTPUT' },
  }));
}

/**
 * Source: goal + approach + result present, condition `unknown`.
 * Candidate: goal identical, approach / result / condition all different.
 * ⇒ matched = [goal] ／ compared_not_matched = [approach, result] ／ uncompared = [condition]
 */
async function fixture(): Promise<{ readonly h: RetrievalHarness; readonly record: RetrievalDerivationRecord }> {
  const h = harness();
  await h.seed({
    goal: 'G',
    approach: 'S1',
    result: 'R1',
    condition: null,
    attempt_id: ID_SOURCE,
    project_id: 'PRJ_one',
    failure_tags: ['开裂'],
    environment: 'v1',
  });
  await h.seed({
    goal: 'G',
    approach: 'S2',
    result: 'R2',
    condition: 'C2',
    project_id: 'PRJ_two',
    failure_tags: ['开裂', '其他'],
    environment: 'v2',
  });
  const outcome = await h.service.runRetrievalForFormalAttempt({
    source_attempt_id: att(ID_SOURCE),
  });
  assert.equal(outcome.kind, 'completed');
  if (outcome.kind !== 'completed') {
    throw new Error('unreachable');
  }
  return { h, record: outcome.derivation };
}

function view(record: RetrievalDerivationRecord): RetrievalView {
  return retrievalViewOf(record, { expanded: true });
}

describe('S01-03｜step ⑦ comparison output', () => {
  it('AC-125 / AC-126: matched 维度产生相似点与相关理由；未命中维度不产生相似点', async () => {
    const { record } = await fixture();
    const candidate = view(record).candidates[0];
    assert.ok(candidate !== undefined);
    assert.deepEqual([...candidate.matched_level_a_dimensions], ['goal']);
    assert.deepEqual(
      [...candidate.similar_points.map((point) => point.dimension)],
      ['goal'],
    );
    assert.deepEqual(
      [...candidate.relevance_reasons.map((reason) => reason.dimension)],
      ['goal'],
    );
    // 相关理由只能引用 matched Level A。
    const matched: readonly LevelADimension[] = matchedDimensionsOf(
      record.candidate_entries[0] as never,
    );
    for (const reason of candidate.relevance_reasons) {
      assert.equal(matched.includes(reason.dimension), true);
    }
  });

  it('AC-125: compared_not_matched 产生差异点，但不得成为相关理由', async () => {
    const { record } = await fixture();
    const candidate = view(record).candidates[0];
    assert.ok(candidate !== undefined);
    assert.deepEqual(
      [...candidate.difference_points.map((point) => point.dimension)],
      ['approach', 'result'],
    );
    const reasonDimensions: readonly LevelADimension[] = candidate.relevance_reasons.map(
      (reason) => reason.dimension,
    );
    for (const dimension of ['approach', 'result'] as const) {
      assert.equal(reasonDimensions.includes(dimension), false);
    }
    // 差异点文本不得被当作「为什么相关」的材料。
    for (const reason of candidate.relevance_reasons) {
      assert.equal(reason.text.includes('不同'), false);
    }
  });

  it('AC-114: uncompared 只表达中性「该维度未比对」', async () => {
    const { record } = await fixture();
    const candidate = view(record).candidates[0];
    assert.ok(candidate !== undefined);
    assert.deepEqual([...candidate.uncompared_dimensions], ['condition']);
    assert.deepEqual([...candidate.uncompared_notes], [
      uncomparedDimensionNote('condition'),
    ]);
    assert.equal(candidate.uncompared_notes[0]?.includes(UNCOMPARED_DIMENSION_LABEL), true);
    assert.deepEqual([...view(record).uncompared_dimensions], ['condition']);
    assert.deepEqual([...view(record).uncompared_notes], [
      uncomparedDimensionNote('condition'),
    ]);
    // 未比对维度既不是相似点，也不是差异点，也不是相关理由。
    assert.equal(
      candidate.similar_points.some((point) => point.dimension === 'condition'),
      false,
    );
    assert.equal(
      candidate.difference_points.some((point) => point.dimension === 'condition'),
      false,
    );
    assert.equal(
      candidate.relevance_reasons.some((reason) => reason.dimension === 'condition'),
      false,
    );
  });

  it('AC-86: Level B 只作为 explanation/context，且进入不了相关理由', async () => {
    const { record } = await fixture();
    const candidate = view(record).candidates[0];
    assert.ok(candidate !== undefined);
    assert.equal(candidate.auxiliary_context.same_project, false);
    assert.deepEqual([...candidate.auxiliary_context.shared_failure_tags], ['开裂']);
    assert.equal(candidate.auxiliary_context.environment, 'v2');
    // 相关理由只由 Level A 的 matched 维度派生，Level B 内容不得出现在其中。
    const reasons = JSON.stringify(candidate.relevance_reasons);
    assert.equal(reasons.includes('开裂'), false);
    assert.equal(reasons.includes('v2'), false);
    assert.equal(reasons.includes('Project'), false);
  });

  it('AC-23: ⑦ 输出中不存在任何数值相似度 / 等级字段', async () => {
    const { record } = await fixture();
    const serialized = JSON.stringify(view(record));
    for (const forbidden of [
      '"similarity_score"',
      '"match_score"',
      '"confidence"',
      '"confidence_score"',
      '"rank_score"',
      '"match_percentage"',
      '"relevance_level"',
      '"evidence_strength"',
      '"score"',
      '"percentage"',
      '"percent"',
      '"weight"',
      '"grade"',
      '"stars"',
    ]) {
      assert.equal(serialized.includes(forbidden), false, `${forbidden} must not appear`);
    }
    // 记录本身也不含这些字段。
    const raw = JSON.stringify(record);
    assert.equal(raw.includes('"score"'), false);
    assert.equal(raw.includes('"confidence"'), false);
  });

  it('IMPLEMENTATION INVARIANT（§17 / §19）: 三态输出彼此不混用', async () => {
    const { record } = await fixture();
    const candidate = view(record).candidates[0];
    assert.ok(candidate !== undefined);
    const buckets = [
      candidate.similar_points.map((point) => point.dimension).join(','),
      candidate.difference_points.map((point) => point.dimension).join(','),
      candidate.uncompared_dimensions.join(','),
    ];
    assert.deepEqual([...buckets], ['goal', 'approach,result', 'condition']);
  });
});
