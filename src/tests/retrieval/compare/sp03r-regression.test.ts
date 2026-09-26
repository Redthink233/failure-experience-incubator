/**
 * S01-03 ｜ SP-03R semantic regression, expressed as a permanent implementation suite.
 *
 * The task requires the CURRENT frozen semantics to be turned into formal regression cases
 * (R1–R8 / H1–H10). Where a case already has a canonical acceptance point it is named here; the
 * rest are `IMPLEMENTATION INVARIANT`s that cite the frozen contract section they protect.
 *
 * 🔴 Determinism claims (R5 / R6) are only meaningful because the comparison pipeline is a pure
 *    function of the records plus the injected judge: replaying the same fixture must produce the
 *    same three-state matrix, and no run may flip `related`.
 * 🔴 Every judge answer used here is a hand-written `NOT_A_REAL_LLM_OUTPUT` fixture. Real provider
 *    calls: NOT EXECUTED. Consequently nothing in this file may be read as "the model behaves X".
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareAttempts } from '../../../retrieval/compare/comparator.js';
import type { ComparisonOutcome } from '../../../retrieval/compare/comparator.js';
import type { DimensionJudge } from '../../../retrieval/compare/dimension-judge.js';
import { dimensionJudgeJsonSchema } from '../../../retrieval/compare/dimension-judge.js';
import { deterministicDimensionVerdict } from '../../../retrieval/compare/field-rules.js';
import { normalizeForComparison } from '../../../retrieval/compare/normalization.js';
import { makeHarness } from './harness.js';
import {
  FIXTURE_ATTEMPT_ID,
  FIXTURE_CANDIDATE_ID,
  NOT_A_REAL_LLM_OUTPUT,
  attemptFixture,
} from './harness.js';
import type { LevelAValues } from './harness.js';
import type { LevelADimension } from '../../../domain/types/level-a.js';
import type { SemanticVerdict } from '../../../domain/types/comparison.js';
import type { RetrievalDerivationRecord } from '../../../retrieval/compare/types.js';
import { retrievalViewOf } from '../../../retrieval/compare/retrieval-service.js';
import type { ExperienceRetrievalService } from '../../../retrieval/compare/retrieval-service.js';
import { decisionInferenceItem } from '../../../domain/types/source-type.js';
import { provided } from '../../../domain/types/presence.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';

function att(value: string): ObjectId<'ATT'> {
  return value as ObjectId<'ATT'>;
}

function judgeAlways(verdict: SemanticVerdict): DimensionJudge {
  return async () => ({ kind: 'judged', verdict, reason: NOT_A_REAL_LLM_OUTPUT });
}

async function compare(
  source: LevelAValues,
  candidate: LevelAValues,
  verdict: SemanticVerdict = 'compared_not_matched',
): Promise<Extract<ComparisonOutcome, { kind: 'compared' }>> {
  const outcome = await compareAttempts(
    judgeAlways(verdict),
    attemptFixture(source, FIXTURE_ATTEMPT_ID),
    attemptFixture(candidate, FIXTURE_CANDIDATE_ID),
  );
  assert.equal(outcome.kind, 'compared');
  if (outcome.kind !== 'compared') {
    throw new Error('unreachable');
  }
  return outcome;
}

function triOf(
  outcome: Extract<ComparisonOutcome, { kind: 'compared' }>,
  dimension: LevelADimension,
): string {
  const found = outcome.states.find((state) => state.dimension === dimension);
  assert.ok(found !== undefined);
  return (found as { readonly tri_state: string }).tri_state;
}

const SOURCE: LevelAValues = { goal: 'G', approach: 'S1', condition: 'C1', result: 'R1' };

function harness(verdict: SemanticVerdict = 'compared_not_matched'): ReturnType<typeof makeHarness> {
  return makeHarness(() => ({
    kind: 'structured',
    value: { verdict, reason: NOT_A_REAL_LLM_OUTPUT },
  }));
}

async function deriveService(
  service: ExperienceRetrievalService,
  source_id: string | ObjectId<'ATT'>,
): Promise<RetrievalDerivationRecord> {
  const outcome = await service.runRetrievalForFormalAttempt({
    source_attempt_id: att(String(source_id)),
  });
  assert.equal(outcome.kind, 'completed');
  if (outcome.kind !== 'completed') {
    throw new Error('unreachable');
  }
  return outcome.derivation;
}

async function derive(
  h: ReturnType<typeof makeHarness>,
  source_id: string | ObjectId<'ATT'>,
): Promise<RetrievalDerivationRecord> {
  return deriveService(h.service, source_id);
}

describe('S01-03｜SP-03R semantic regression', () => {
  it('AC-110 (R1): actual_result 相反结论不得 matched', async () => {
    const outcome = await compare({ result: '出现明显开裂' }, { result: '无明显开裂' }, 'matched');
    assert.equal(triOf(outcome, 'result'), 'compared_not_matched');
  });

  it('AC-111 (R2): 不同具体目标不得 matched', async () => {
    // 🔴 这一对确定性规则无法可靠判定 ⇒ 由维度判定给出负例；规则本身绝不猜成 matched。
    const outcome = await compare(
      { goal: '降低颜色变化' },
      { goal: '缩短干燥时间' },
      'compared_not_matched',
    );
    assert.equal(triOf(outcome, 'goal'), 'compared_not_matched');
  });

  it('AC-109 (R3): 具体值不同不得 matched', async () => {
    const outcome = await compare({ condition: '50°C' }, { condition: '70°C' }, 'matched');
    assert.equal(triOf(outcome, 'condition'), 'compared_not_matched');
  });

  it('AC-112 (R4): 语义等价改写可 matched', async () => {
    const outcome = await compare(
      { result: '避免虚假引用' },
      { result: '不引用不存在的记录' },
      'matched',
    );
    assert.equal(triOf(outcome, 'result'), 'matched');
  });

  it('IMPLEMENTATION INVARIANT（§31 确定性重放）: 同一 fixture 重放的 matched set 完全一致', async () => {
    const h = harness();
    const first = await h.seed({ ...SOURCE, attempt_id: 'ATT_0000000000000000000000000S' });
    await h.seed({ goal: 'G', approach: 'S2', condition: 'C2', result: 'R2' });

    const a = await derive(h, first.attempt_id);
    const b = await derive(h, first.attempt_id);
    const c = await deriveService(h.reopen(), first.attempt_id);
    const signature = (record: RetrievalDerivationRecord): string =>
      JSON.stringify(record.candidate_entries.map((entry) => entry.dimension_states));
    assert.equal(signature(a), signature(b));
    assert.equal(signature(a), signature(c));
    assert.deepEqual([...a.hit_level_a_dimensions], [...c.hit_level_a_dimensions]);
  });

  it('IMPLEMENTATION INVARIANT（§16 稳定性）: related 不发生随机翻转', async () => {
    const h = harness();
    const source = await h.seed({ goal: 'G', approach: 'S1', result: 'R1' });
    await h.seed({ goal: 'G', approach: 'S2', result: 'R2' });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const record = await deriveService(h.reopen(), source.attempt_id);
      assert.equal(record.status, 'RELATED_HISTORY');
      assert.equal(record.n_retrieval, 1);
      assert.deepEqual([...record.hit_level_a_dimensions], ['goal']);
    }
  });

  it('AC-20 (R7 / H3 / H7): Level B 全相同而 Level A 全不重叠 ⇒ 不相关', async () => {
    const h = harness();
    await h.seed({
      goal: 'G1',
      approach: 'S1',
      condition: 'C1',
      result: 'R1',
      project_id: 'PRJ_same',
      failure_tags: ['tag-a'],
      environment: 'env-1',
      attempt_id: 'ATT_0000000000000000000000000S',
    });
    await h.seed({
      goal: 'G2',
      approach: 'S2',
      condition: 'C2',
      result: 'R2',
      project_id: 'PRJ_same',
      failure_tags: ['tag-a'],
      environment: 'env-1',
    });

    const record = await derive(h, 'ATT_0000000000000000000000000S');
    assert.equal(record.status, 'NO_RELATED_HISTORY');
    assert.equal(record.n_retrieval, 0);
    assert.deepEqual([...record.candidate_entries], []);
  });

  it('AC-23 (R8): 任何输出都不得产生数值相似度', async () => {
    const h = harness();
    await h.seed({ goal: 'G', approach: 'S1', result: 'R1' });
    await h.seed({ goal: 'G', approach: 'S2', result: 'R2' });

    const record = await derive(h, 'ATT_00000000000000000000000001');
    const serialized = `${JSON.stringify(record)}${JSON.stringify(retrievalViewOf(record))}`;
    for (const forbidden of ['"score"', '"confidence"', '"percentage"', '"percent"', '"grade"']) {
      assert.equal(serialized.includes(forbidden), false, forbidden);
    }
    assert.equal(/"[a-z_]*similarity[a-z_]*"/.test(serialized), false);
  });

  it('AC-114 (H1): 任一侧 unknown ⇒ uncompared', async () => {
    assert.equal(triOf(await compare({ result: null }, { result: 'X' }), 'result'), 'uncompared');
    assert.equal(triOf(await compare({ result: 'X' }, { result: null }), 'result'), 'uncompared');
    assert.equal(triOf(await compare({ result: null }, { result: null }), 'result'), 'uncompared');
  });

  it('AC-23 (H2): 判定 schema 与输出均无数值 / 等级字段', () => {
    const schema = JSON.stringify(dimensionJudgeJsonSchema);
    assert.equal(schema.includes('"number"'), false);
    assert.equal(schema.includes('score'), false);
    assert.equal(schema.includes('confidence'), false);
    assert.equal(schema.includes('percent'), false);
  });

  it('IMPLEMENTATION INVARIANT（§4.1 / §31 H4）: Inference 内容不得进入 Level A 比较输入', async () => {
    const h = harness();
    await h.seed({
      goal: 'G',
      approach: 'S1',
      result: 'R1',
      candidate_causes: ['这台设备的原因是 A'],
      result_status_value: 'Failed',
      attempt_id: 'ATT_0000000000000000000000000S',
    });
    await h.seed({
      goal: 'G',
      approach: 'S1',
      result: 'R1',
      candidate_causes: ['完全无关的另一个原因 B'],
      result_status_value: '成功',
    });

    const record = await derive(h, 'ATT_0000000000000000000000000S');
    assert.equal(record.n_retrieval, 1);
    const serialized = JSON.stringify(record);
    assert.equal(serialized.includes('这台设备的原因是 A'), false);
    assert.equal(serialized.includes('完全无关的另一个原因 B'), false);
    assert.equal(serialized.includes('成功'), false);
  });

  it('IMPLEMENTATION INVARIANT（§16 H5）: related 只由 matched 非空派生', async () => {
    const related = await compare({ goal: 'G' }, { goal: 'G' });
    assert.equal(related.comparison.related, true);
    assert.ok(related.comparison.matched_level_a_dimensions.length > 0);

    const unrelated = await compare({ goal: 'G' }, { goal: 'H' });
    assert.equal(unrelated.comparison.related, false);
    assert.deepEqual([...unrelated.comparison.matched_level_a_dimensions], []);
    // 有 compared_not_matched 但没有 matched ⇒ 仍不相关。
    assert.ok(unrelated.comparison.compared_not_matched_dimensions.length > 0);
  });

  it('AC-20 (H6): Level B 陷阱组合一律 related = false', async () => {
    const h = harness();
    await h.seed({
      goal: '目标甲',
      approach: 'S1',
      condition: null,
      result: 'R1',
      project_id: 'PRJ_x',
      failure_tags: ['t'],
      environment: 'e',
      attempt_id: 'ATT_0000000000000000000000000S',
    });
    await h.seed({
      goal: '目标乙',
      approach: 'S2',
      condition: 'C2',
      result: 'R2',
      project_id: 'PRJ_x',
      failure_tags: ['t'],
      environment: 'e',
    });

    const record = await derive(h, 'ATT_0000000000000000000000000S');
    assert.equal(record.n_retrieval, 0);
    assert.equal(record.status, 'NO_RELATED_HISTORY');
  });

  it('AC-22 / AC-114 (H8): 双方 unknown ⇒ 0 matched、0 compared_not_matched', async () => {
    const outcome = await compare({ result: null, condition: null }, { result: null, condition: null });
    assert.deepEqual([...outcome.comparison.matched_level_a_dimensions], []);
    assert.deepEqual([...outcome.comparison.compared_not_matched_dimensions], []);
    assert.deepEqual(
      [...outcome.comparison.uncompared_dimensions],
      ['goal', 'approach', 'condition', 'result'],
    );
  });

  it('IMPLEMENTATION INVARIANT（§31 H9）: result_status 改变不影响 Level A 输入', async () => {
    const candidate = attemptFixture({ goal: 'G', result: 'R' }, FIXTURE_CANDIDATE_ID);
    const withStatus = (status: string) => ({
      ...attemptFixture({ goal: 'G', result: 'R' }, FIXTURE_ATTEMPT_ID),
      result_status: provided(decisionInferenceItem('CI-status', status, 'accepted')),
    });

    const failed = await compareAttempts(judgeAlways('compared_not_matched'), withStatus('Failed'), candidate);
    const succeeded = await compareAttempts(
      judgeAlways('compared_not_matched'),
      withStatus('Succeeded'),
      candidate,
    );
    assert.equal(failed.kind, 'compared');
    assert.equal(succeeded.kind, 'compared');
    if (failed.kind !== 'compared' || succeeded.kind !== 'compared') {
      throw new Error('unreachable');
    }
    assert.equal(
      JSON.stringify(failed.comparison),
      JSON.stringify(succeeded.comparison),
    );
  });

  it('IMPLEMENTATION INVARIANT（D-054 H10）: 判定链路不依赖任何向量表示', () => {
    const schema = JSON.stringify(dimensionJudgeJsonSchema);
    assert.equal(schema.includes('array'), false);
    assert.equal(schema.includes('number'), false);
    // 归一化是纯文本的，且可幂等重放。
    const sample = '  50°C，出现明显开裂。 ';
    assert.equal(normalizeForComparison(sample), normalizeForComparison(normalizeForComparison(sample)));
    // 确定性规则对无法可靠判定的取值只返回 undecided，绝不猜成 matched。
    assert.equal(deterministicDimensionVerdict('低温慢速', '高温快速').verdict, 'undecided');
    assert.equal(deterministicDimensionVerdict('50°C', '50 摄氏度').verdict, 'matched');
  });
});
