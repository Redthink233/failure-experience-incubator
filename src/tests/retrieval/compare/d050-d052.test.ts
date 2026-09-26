/**
 * S01-03 ｜ Frozen `D-050` / `D-052` semantic cases.
 *
 * Every case below is a canonical acceptance point of `docs/09_TEST_PLAN.md` (`AC-109`–`AC-115`,
 * `AC-124`–`AC-126`) derived from `D-050` / `D-052`. No new AC is introduced.
 *
 * 🔴 The judge doubles in this file are hand-written fixtures labelled `NOT_A_REAL_LLM_OUTPUT`.
 *    They prove the APPLICATION's routing (which dimension reaches the rule, which reaches the
 *    judge, what the output keeps), never any model's ability. Real provider calls: NOT EXECUTED.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { comparisonPointsOf } from '../../../retrieval/compare/comparison-points.js';
import { compareAttempts, projectedValueOf } from '../../../retrieval/compare/comparator.js';
import type { DimensionJudge } from '../../../retrieval/compare/dimension-judge.js';
import type { ComparisonOutcome } from '../../../retrieval/compare/comparator.js';
import type { JudgedDimensionState } from '../../../retrieval/compare/types.js';
import { projectAttemptToLevelA } from '../../../domain/projection/level-a.js';
import type { LevelADimension } from '../../../domain/types/level-a.js';
import type { SemanticVerdict } from '../../../domain/types/comparison.js';
import {
  FIXTURE_ATTEMPT_ID,
  FIXTURE_CANDIDATE_ID,
  NOT_A_REAL_LLM_OUTPUT,
  attemptFixture,
} from './harness.js';
import type { LevelAValues } from './harness.js';

interface RecordingJudge {
  readonly judge: DimensionJudge;
  readonly calls: readonly { readonly dimension: LevelADimension }[];
}

/** A hand-written judge double. Its answer is NEVER a real model output. */
function recordingJudge(verdict: SemanticVerdict): RecordingJudge {
  const calls: { readonly dimension: LevelADimension }[] = [];
  return {
    calls,
    judge: async (input) => {
      calls.push({ dimension: input.dimension });
      return { kind: 'judged', verdict, reason: NOT_A_REAL_LLM_OUTPUT };
    },
  };
}

function requireCompared(outcome: ComparisonOutcome): {
  readonly states: readonly JudgedDimensionState[];
  readonly related: boolean;
} {
  assert.equal(outcome.kind, 'compared');
  if (outcome.kind !== 'compared') {
    throw new Error('unreachable');
  }
  return { states: outcome.states, related: outcome.comparison.related };
}

function requireState(
  states: readonly JudgedDimensionState[],
  dimension: LevelADimension,
): JudgedDimensionState {
  const found = states.find((state) => state.dimension === dimension);
  assert.ok(found !== undefined, `dimension ${dimension} missing`);
  return found as JudgedDimensionState;
}

async function dimensionState(
  dimension: LevelADimension,
  source: LevelAValues,
  candidate: LevelAValues,
  verdict: SemanticVerdict,
): Promise<{ readonly state: JudgedDimensionState; readonly calls: number }> {
  const recorder = recordingJudge(verdict);
  const outcome = await compareAttempts(
    recorder.judge,
    attemptFixture(source, FIXTURE_ATTEMPT_ID),
    attemptFixture(candidate, FIXTURE_CANDIDATE_ID),
  );
  return { state: requireState(requireCompared(outcome).states, dimension), calls: recorder.calls.length };
}

describe('S01-03｜D-050 / D-052 frozen semantic cases', () => {
  it('AC-113: 单位等价表达「50°C」vs「50 摄氏度」判 matched（且不经 AI）', async () => {
    const { state, calls } = await dimensionState(
      'condition',
      { condition: '50°C' },
      { condition: '50 摄氏度' },
      'compared_not_matched',
    );
    assert.equal(state.tri_state, 'matched');
    assert.equal(state.basis, 'deterministic_rule');
    // 🔴 单位等价是安全确定性规则，因此这一次判定不应消耗任何 AI 调用。
    assert.equal(calls, 0);
  });

  it('AC-109: 取值不同「50°C」vs「70°C」判 compared_not_matched（不得因同属温度而 matched）', async () => {
    const { state, calls } = await dimensionState(
      'condition',
      { condition: '50°C' },
      { condition: '70°C' },
      'matched',
    );
    assert.equal(state.tri_state, 'compared_not_matched');
    assert.equal(state.basis, 'deterministic_rule');
    assert.equal(calls, 0);
  });

  it('AC-110: 结论方向相反「出现明显开裂」vs「无明显开裂」判 compared_not_matched', async () => {
    const { state } = await dimensionState(
      'result',
      { result: '出现明显开裂' },
      { result: '无明显开裂' },
      'matched',
    );
    assert.equal(state.tri_state, 'compared_not_matched');
    assert.equal(state.basis, 'deterministic_rule');
  });

  it('AC-110: 同口径追加「含水率仍偏高」vs「含水率达到要求」判 compared_not_matched', async () => {
    const { state, calls } = await dimensionState(
      'result',
      { result: '含水率仍偏高' },
      { result: '含水率达到要求' },
      'compared_not_matched',
    );
    assert.equal(state.tri_state, 'compared_not_matched');
    // 规则无法可靠判定 ⇒ 交给维度判定（R-A stage 3）。
    assert.equal(state.basis, 'dimension_judge');
    assert.equal(calls, 1);
  });

  it('AC-112: 同义改写「避免虚假引用」vs「不引用不存在的记录」判 matched', async () => {
    const { state } = await dimensionState(
      'result',
      { result: '避免虚假引用' },
      { result: '不引用不存在的记录' },
      'matched',
    );
    assert.equal(state.tri_state, 'matched');
  });

  it('AC-111: 不同具体目标「降低颜色变化」vs「缩短干燥时间」判 compared_not_matched', async () => {
    const { state } = await dimensionState(
      'goal',
      { goal: '降低颜色变化' },
      { goal: '缩短干燥时间' },
      'compared_not_matched',
    );
    assert.equal(state.tri_state, 'compared_not_matched');
  });

  it('AC-124: actual_attempt 负例「调整热风参数」vs「调整送风参数」判 compared_not_matched', async () => {
    // 🔴 该维度必须由维度判定给出负例：确定性规则不得自行把它判成 matched。
    const { state, calls } = await dimensionState(
      'approach',
      { approach: '调整热风参数' },
      { approach: '调整送风参数' },
      'compared_not_matched',
    );
    assert.equal(state.tri_state, 'compared_not_matched');
    assert.notEqual(state.tri_state, 'matched');
    assert.equal(state.basis, 'dimension_judge');
    assert.equal(calls, 1);
  });

  it('AC-125 / AC-126: 该 actual_attempt 维度不进入相似点，但 CASE-05 的 related 仍为 true', async () => {
    const recorder = recordingJudge('compared_not_matched');
    const source = attemptFixture(
      { goal: '让引用可靠', approach: '调整热风参数', condition: '50°C', result: '无引用错误' },
      FIXTURE_ATTEMPT_ID,
    );
    const candidate = attemptFixture(
      { goal: '让引用可靠', approach: '调整送风参数', condition: '50°C', result: '无引用错误' },
      FIXTURE_CANDIDATE_ID,
    );
    const outcome = await compareAttempts(recorder.judge, source, candidate);
    const compared = requireCompared(outcome);

    // 🔴 AC-126：actual_result 已有独立 matched ⇒ related 必须仍为 true。
    assert.equal(compared.related, true);
    assert.deepEqual(
      [...(outcome.kind === 'compared' ? outcome.comparison.matched_level_a_dimensions : [])],
      ['goal', 'condition', 'result'],
    );

    // 🔴 AC-125：⑦ 的相似点中不得出现把该 actual_attempt 呈现为「方案相同」的条目。
    const points = comparisonPointsOf(compared.states, (dimension) => ({
      source_value: projectedValueOf(projectAttemptToLevelA(source), dimension) ?? '',
      candidate_value: projectedValueOf(projectAttemptToLevelA(candidate), dimension) ?? '',
    }));
    assert.deepEqual(
      points.similar_points.filter((point) => point.dimension === 'approach'),
      [],
    );
    assert.deepEqual(
      points.relevance_reasons.filter((reason) => reason.dimension === 'approach'),
      [],
    );
    assert.deepEqual(
      points.difference_points.map((point) => point.dimension),
      ['approach'],
    );
    // 🔴 compared_not_matched 不进入相似点，也不作为相关理由。
    assert.ok(!JSON.stringify(points.relevance_reasons).includes('送风'));
    assert.ok(!JSON.stringify(points.relevance_reasons).includes('热风'));
  });
});
