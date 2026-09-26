/**
 * S01-03 ｜ Level A three-state behaviour: the structural `unknown` gate and the two compared states.
 *
 * Canonical acceptance points: `AC-22` (`D-025`), `AC-114` (`D-050` unknown rule unchanged),
 * `AC-04` (§4.2 rule 7: unknown is explicit), and the `IMPLEMENTATION INVARIANT` that the
 * dimension judge is never asked about an unknown dimension.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareAttempts, globalUncomparedDimensionsOf } from '../../../retrieval/compare/comparator.js';
import type { ComparisonOutcome } from '../../../retrieval/compare/comparator.js';
import type { DimensionJudge } from '../../../retrieval/compare/dimension-judge.js';
import { LEVEL_A_DIMENSIONS, LEVEL_A_FIELD_PATH_MAP } from '../../../domain/types/level-a.js';
import type { LevelADimension } from '../../../domain/types/level-a.js';
import type { SemanticVerdict } from '../../../domain/types/comparison.js';
import {
  FIXTURE_ATTEMPT_ID,
  FIXTURE_CANDIDATE_ID,
  NOT_A_REAL_LLM_OUTPUT,
  attemptFixture,
} from './harness.js';
import type { LevelAValues } from './harness.js';

function countingJudge(verdict: SemanticVerdict): {
  readonly judge: DimensionJudge;
  readonly dimensions: readonly LevelADimension[];
} {
  const dimensions: LevelADimension[] = [];
  return {
    dimensions,
    judge: async (input) => {
      dimensions.push(input.dimension);
      return { kind: 'judged', verdict, reason: NOT_A_REAL_LLM_OUTPUT };
    },
  };
}

async function compare(
  source: LevelAValues,
  candidate: LevelAValues,
  verdict: SemanticVerdict = 'compared_not_matched',
): Promise<{
  readonly outcome: ComparisonOutcome;
  readonly asked: readonly LevelADimension[];
}> {
  const recorder = countingJudge(verdict);
  const outcome = await compareAttempts(
    recorder.judge,
    attemptFixture(source, FIXTURE_ATTEMPT_ID),
    attemptFixture(candidate, FIXTURE_CANDIDATE_ID),
  );
  return { outcome, asked: recorder.dimensions };
}

function compared(
  result: { readonly outcome: ComparisonOutcome },
): Extract<ComparisonOutcome, { kind: 'compared' }> {
  assert.equal(result.outcome.kind, 'compared');
  if (result.outcome.kind !== 'compared') {
    throw new Error('unreachable');
  }
  return result.outcome;
}

function stateOf(
  result: { readonly outcome: ComparisonOutcome },
  dimension: LevelADimension,
): string {
  const found = compared(result).states.find((state) => state.dimension === dimension);
  assert.ok(found !== undefined);
  return (found as { readonly tri_state: string }).tri_state;
}

describe('S01-03｜Level A tri-state', () => {
  it('AC-114: 源侧 unknown ⇒ 该维度 uncompared（不得进入语义判定）', async () => {
    const result = await compare({ condition: null }, { condition: '50°C' });
    assert.equal(stateOf(result, 'condition'), 'uncompared');
  });

  it('AC-114: 候选侧 unknown ⇒ 该维度 uncompared', async () => {
    const result = await compare({ condition: '50°C' }, { condition: null });
    assert.equal(stateOf(result, 'condition'), 'uncompared');
  });

  it('AC-22 / AC-114: 双方 unknown 仍为 uncompared，绝不判相似', async () => {
    const result = await compare({ condition: null }, { condition: null });
    assert.equal(stateOf(result, 'condition'), 'uncompared');
    const comparison = compared(result).comparison;
    assert.ok(!comparison.matched_level_a_dimensions.includes('condition'));
    assert.equal(comparison.related, false);
  });

  it('IMPLEMENTATION INVARIANT（§9.4 unknown 拦截）: uncompared 绝不调用维度判定', async () => {
    const result = await compare({}, { condition: '50°C', result: '开裂' });
    assert.deepEqual([...result.asked], []);
    assert.equal(compared(result).comparison.related, false);
  });

  it('AC-04: unknown 由结构规则表达，不产生 matched / compared_not_matched', async () => {
    const result = await compare({ condition: null, goal: null }, { condition: null, goal: null });
    const comparison = compared(result).comparison;
    assert.deepEqual([...comparison.matched_level_a_dimensions], []);
    assert.deepEqual([...comparison.compared_not_matched_dimensions], []);
    assert.deepEqual([...comparison.uncompared_dimensions], [...LEVEL_A_DIMENSIONS]);
    for (const dimension of LEVEL_A_DIMENSIONS) {
      assert.equal(comparison.dimensions[dimension].unknown_intercepted, true);
    }
  });

  it('AC-114: 双方均 present 且实质相同 ⇒ matched', async () => {
    const result = await compare({ result: '表面出现明显开裂' }, { result: '表面出现明显开裂' });
    assert.equal(stateOf(result, 'result'), 'matched');
    assert.deepEqual([...result.asked], []);
  });

  it('AC-109: 双方均 present 且实质不同 ⇒ compared_not_matched', async () => {
    const result = await compare({ condition: '低温慢速' }, { condition: '高温快速' });
    assert.equal(stateOf(result, 'condition'), 'compared_not_matched');
    assert.deepEqual([...result.asked], ['condition']);
  });

  it('IMPLEMENTATION INVARIANT（§9.4.1）: 每次比对恰好覆盖四个 Level A 维度且主字段路径冻结', async () => {
    const result = await compare({ goal: 'a' }, { goal: 'b' });
    const comparison = compared(result).comparison;
    assert.deepEqual(Object.keys(comparison.dimensions), [...LEVEL_A_DIMENSIONS]);
    for (const dimension of LEVEL_A_DIMENSIONS) {
      assert.equal(comparison.dimensions[dimension].field_path, LEVEL_A_FIELD_PATH_MAP[dimension]);
      assert.equal(comparison.dimensions[dimension].dimension, dimension);
    }
  });

  it('IMPLEMENTATION INVARIANT（§18 全局单点）: 全局 uncompared = 源记录自身 unknown 维度', async () => {
    const source = attemptFixture({ goal: 'g', condition: null, result: null }, FIXTURE_ATTEMPT_ID);
    assert.deepEqual(
      [...globalUncomparedDimensionsOf(source)],
      ['approach', 'condition', 'result'],
    );
  });
});
