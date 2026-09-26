/**
 * FINAL-RAPID-A ｜ One-call batch closure of step ⑥ — BATCH-01 … BATCH-10 (plus BATCH-11+).
 *
 * WHY (measured, not hypothesised): step ⑥ could need up to `candidates × 4 Level A dimensions`
 * judgements. With one provider request per `candidate × dimension` pair the largest retrieval cost
 * 8 × 4 = 32 sequential round trips, and the observed PSA run was stopped at the 25th - the
 * retrieval never completed, so no derivation was ever stored. The fix is CALL GRANULARITY, not
 * persistence: `FakeProvider.batch_calls.length` is now the provider-call count of one retrieval.
 *
 * WHAT THESE CASES PROTECT:
 *   - the deterministic half still runs FIRST and still decides everything it can (no pair that a
 *     rule could decide is uploaded);
 *   - every genuinely undecided pair of one retrieval travels in EXACTLY ONE request;
 *   - the answer is read against the EXACT expected set and any deviation fails the WHOLE batch;
 *   - a failed batch stores nothing - no partial derivation, no default verdict;
 *   - the batch protocol does not change `D-050` / `D-052` / `D-061` semantics: the one-call path and
 *     the preserved pairwise path produce IDENTICAL derivations for the same scripted decisions.
 *
 * 🔴 No provider is called for real. Every judge answer here is a hand-written
 *    `NOT_A_REAL_LLM_OUTPUT` fixture returned by a fake `M10` adapter.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { makeHarness } from './harness.js';
import type { FakeReply, JudgeCall, RetrievalHarness } from './harness.js';
import { compareAttempts, compareAttemptsInOneBatch } from '../../../retrieval/compare/comparator.js';
import { buildRetrievalDerivation } from '../../../retrieval/compare/derivation.js';
import type { ComparedCandidate } from '../../../retrieval/compare/derivation.js';
import { eligibleHistoricalAttempts } from '../../../retrieval/compare/corpus.js';
import { comparisonOrderOf } from '../../../retrieval/compare/ordering.js';
import {
  BATCH_DIMENSION_JUDGE_SCHEMA_ID,
  BATCH_JUDGE_ALLOWED_KEYS,
  BATCH_JUDGMENT_ALLOWED_KEYS,
  batchDimensionJudgeJsonSchema,
  readBatchJudgeAnswer,
} from '../../../retrieval/compare/batch-judge.js';
import type { BatchJudgePair } from '../../../retrieval/compare/batch-judge.js';
import { DIMENSION_JUDGE_ALLOWED_KEYS, DIMENSION_JUDGE_SCHEMA_ID } from '../../../retrieval/compare/dimension-judge.js';
import { LEVEL_A_DIMENSIONS } from '../../../domain/types/level-a.js';
import type { LevelADimension } from '../../../domain/types/level-a.js';
import { SEMANTIC_VERDICTS } from '../../../domain/types/comparison.js';
import type { SemanticVerdict } from '../../../domain/types/comparison.js';
import type { RetrievalDerivationRecord } from '../../../retrieval/compare/types.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';

/* ------------------------------------------------------------------ *
 * Fixture: the worst case - 8 candidates × 4 undecided dimensions
 * ------------------------------------------------------------------ */

const NOT_A_REAL_LLM_OUTPUT = 'NOT_A_REAL_LLM_OUTPUT';

const ID_SOURCE = 'ATT_0000000000000000000000000S';

/** Eight candidate ids, all of the same shape as a real `Attempt` id. */
function candidateId(index: number): string {
  return `ATT_0000000000000000000000000${index}`;
}

interface CandidateFixture {
  readonly attempt_id: string;
  readonly values: Readonly<Record<LevelADimension, string>>;
}

/**
 * 🔴 Chosen so that NO dimension is decidable: the two sides are neither notationally equal, nor one
 *    quantity in the same unit with a different magnitude, nor the same statement with opposite
 *    polarity. All four dimensions therefore really reach the judge.
 */
const SOURCE_VALUES: Readonly<Record<LevelADimension, string>> = {
  goal: '批次目标',
  approach: '批次方案',
  condition: '批次条件',
  result: '批次结果',
};

const CANDIDATE_FIXTURES: readonly CandidateFixture[] = [1, 2, 3, 4, 5, 6, 7, 8].map((index) => ({
  attempt_id: candidateId(index),
  values: {
    goal: `批次目标${index}`,
    approach: `批次方案${index}`,
    condition: `批次条件${index}`,
    result: `批次结果${index}`,
  },
}));

async function seedWorstCase(h: RetrievalHarness): Promise<void> {
  await h.seed({ ...SOURCE_VALUES, attempt_id: ID_SOURCE });
  for (const fixture of CANDIDATE_FIXTURES) {
    await h.seed({ ...fixture.values, attempt_id: fixture.attempt_id });
  }
}

/** The exact pair set the single batch request must carry. Its LENGTH is the old call count. */
function expectedPairs(): readonly BatchJudgePair[] {
  return CANDIDATE_FIXTURES.flatMap((fixture) =>
    LEVEL_A_DIMENSIONS.map((dimension) => ({
      candidate_id: fixture.attempt_id,
      dimension,
      source_value: SOURCE_VALUES[dimension],
      candidate_value: fixture.values[dimension],
    })),
  );
}

/** The Gold decision script shared by BOTH protocols: `goal` overlaps, everything else does not. */
function goldVerdictOf(dimension: string): SemanticVerdict {
  return dimension === 'goal' ? 'matched' : 'compared_not_matched';
}

function goldReasonOf(dimension: string): string {
  return `${NOT_A_REAL_LLM_OUTPUT}:${dimension}`;
}

/** Builds one batch answer over the given pairs, with the Gold decision script. */
function goldAnswerFor(pairs: readonly BatchJudgePair[]): Readonly<Record<string, unknown>> {
  return {
    judgments: pairs.map((pair) => ({
      candidate_id: pair.candidate_id,
      dimension: pair.dimension,
      verdict: goldVerdictOf(pair.dimension),
      reason: goldReasonOf(pair.dimension),
    })),
  };
}

/** A per-pair resolver implementing the same Gold script (used by the batch protocol tests). */
function goldResolver(): (call: JudgeCall) => FakeReply {
  return (call: JudgeCall): FakeReply => ({
    kind: 'structured',
    value: { verdict: goldVerdictOf(call.dimension_key), reason: goldReasonOf(call.dimension_key) },
  });
}

function att(value: string): ObjectId<'ATT'> {
  return value as ObjectId<'ATT'>;
}

async function runOnce(h: RetrievalHarness): Promise<RetrievalDerivationRecord> {
  const outcome = await h.service.runRetrievalForFormalAttempt({ source_attempt_id: att(ID_SOURCE) });
  assert.equal(outcome.kind, 'completed');
  if (outcome.kind !== 'completed') {
    throw new Error('unreachable');
  }
  return outcome.derivation;
}

/**
 * The PRESERVED pairwise path: one judge call per undecided pair, assembled by the unchanged
 * `buildRetrievalDerivation`. It is the Gold the one-call path has to match.
 */
async function pairwiseGold(h: RetrievalHarness): Promise<RetrievalDerivationRecord> {
  const source = await h.repository.readAttempt(att(ID_SOURCE));
  assert.ok(source !== null);
  const eligible = eligibleHistoricalAttempts(source.attempt_id, await h.repository.listAttempts());
  const judge = async (input: {
    readonly dimension: LevelADimension;
    readonly source_value: string;
    readonly candidate_value: string;
  }) => ({
    kind: 'judged' as const,
    verdict: goldVerdictOf(input.dimension),
    reason: goldReasonOf(input.dimension),
  });

  const compared: ComparedCandidate[] = [];
  for (const candidate of comparisonOrderOf(eligible)) {
    const outcome = await compareAttempts(judge, source, candidate);
    assert.equal(outcome.kind, 'compared');
    if (outcome.kind !== 'compared') {
      throw new Error('unreachable');
    }
    compared.push({ attempt: candidate, comparison: outcome.comparison, states: outcome.states });
  }

  return buildRetrievalDerivation({
    derivation_id: 'DERIVATION_ID_IGNORED_BY_THE_COMPARISON',
    source,
    eligible_history_count: eligible.length,
    compared_candidates: compared,
    created_at: 'CREATED_AT_IGNORED_BY_THE_COMPARISON',
  });
}

/** Everything except the two run-scoped fields, so two runs can be compared on semantics alone. */
function semanticPartOf(record: RetrievalDerivationRecord): unknown {
  const clone = JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
  delete clone['derivation_id'];
  delete clone['created_at'];
  return clone;
}

/* ------------------------------------------------------------------ *
 * BATCH-01 … BATCH-10
 * ------------------------------------------------------------------ */

describe('FINAL-RAPID-A｜one-call batch closure of step ⑥', () => {
  it('AC-79 / BATCH-01: 8 候选 × 4 维度全部 undecided ⇒ provider 调用恰好 1 次', async () => {
    const h = makeHarness(goldResolver());
    await seedWorstCase(h);

    const record = await runOnce(h);

    // 🔴 本次检索真正需要模型判断的 pair 数 = 旧协议的调用次数 = 32。
    assert.equal(expectedPairs().length, 32);
    assert.equal(h.provider.invocations.length, 1);
    assert.equal(h.provider.batch_calls.length, 1);
    const batch = h.provider.batch_calls[0];
    assert.ok(batch !== undefined);
    // 上传的恰好是这 32 组，一组不多、一组不少，顺序也一致（候选按固定比较顺序、维度按 canonical 顺序）。
    assert.deepEqual(
      batch.pairs.map((pair) => `${pair.candidate_id}/${pair.dimension}`),
      expectedPairs().map((pair) => `${pair.candidate_id}/${pair.dimension}`),
    );
    // 只有 system 与 user 两条消息，且系统消息带严格判据。
    assert.equal(batch.messages.length, 2);
    // 8 条候选全部 related（goal 命中），N_检索 = 8。
    assert.equal(record.n_retrieval, 8);
    assert.equal(record.status, 'RELATED_HISTORY');
    assert.deepEqual([...record.hit_level_a_dimensions], ['goal']);
  });

  it('AC-125 / BATCH-02: 单次批量结果与旧 pairwise Gold 语义完全一致', async () => {
    const batched = makeHarness(goldResolver());
    await seedWorstCase(batched);
    const oneCall = await runOnce(batched);

    const goldHarness = makeHarness(goldResolver());
    await seedWorstCase(goldHarness);
    const gold = await pairwiseGold(goldHarness);

    // 🔴 语义等价：除运行期身份（derivation_id / created_at）外逐字节相同。
    assert.equal(
      JSON.stringify(semanticPartOf(oneCall)),
      JSON.stringify(semanticPartOf(gold)),
    );
    // 旧路径确实是「逐对」的：32 个 undecided pair 在 old protocol 下就是 32 次判定。
    assert.equal(expectedPairs().length, 32);
  });

  it('AC-126 / BATCH-02: 批量全部判 compared_not_matched ⇒ 不产生任何 related 候选', async () => {
    const h = makeHarness(() => ({
      kind: 'structured',
      value: { verdict: 'compared_not_matched', reason: `${NOT_A_REAL_LLM_OUTPUT}: 未重叠` },
    }));
    await seedWorstCase(h);

    const record = await runOnce(h);

    assert.equal(h.provider.batch_calls.length, 1);
    assert.equal(record.n_retrieval, 0);
    assert.equal(record.status, 'NO_RELATED_HISTORY');
    assert.deepEqual([...record.hit_level_a_dimensions], []);
    assert.deepEqual([...record.candidate_entries], []);
  });

  it('AC-89 / BATCH-03: 少一组 pair ⇒ 整批失败且不留任何 Derivation', async () => {
    const answer = goldAnswerFor(expectedPairs().slice(0, -1));
    const h = makeHarness(() => ({ kind: 'batch', value: answer }));
    await seedWorstCase(h);

    const outcome = await h.service.runRetrievalForFormalAttempt({
      source_attempt_id: att(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.failure.local_code, 'BATCH_JUDGMENT_SET_MISMATCH');
    // 🔴 缺失的 pair 绝不被默认成 matched / compared_not_matched / uncompared。
    assert.equal(outcome.previous_derivation_preserved, false);
    assert.deepEqual([...h.retrievalFiles()], []);
    assert.equal(await h.reopen().readCurrentDerivation(att(ID_SOURCE)), null);
  });

  it('AC-89 / BATCH-04: 重复的一组 pair ⇒ 整批失败', async () => {
    const pairs = expectedPairs();
    const answer = goldAnswerFor([...pairs.slice(0, -1), pairs[0] as BatchJudgePair]);
    const h = makeHarness(() => ({ kind: 'batch', value: answer }));
    await seedWorstCase(h);

    const outcome = await h.service.runRetrievalForFormalAttempt({
      source_attempt_id: att(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.failure.local_code, 'BATCH_JUDGMENT_SET_MISMATCH');
    assert.deepEqual([...h.retrievalFiles()], []);
  });

  it('AC-89 / BATCH-05: 多出一组（未被请求的候选）⇒ 整批失败', async () => {
    const answer = goldAnswerFor([
      ...expectedPairs(),
      {
        candidate_id: candidateId(9),
        dimension: 'goal',
        source_value: SOURCE_VALUES.goal,
        candidate_value: '批次目标9',
      },
    ]);
    const h = makeHarness(() => ({ kind: 'batch', value: answer }));
    await seedWorstCase(h);

    const outcome = await h.service.runRetrievalForFormalAttempt({
      source_attempt_id: att(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.failure.local_code, 'BATCH_JUDGMENT_SET_MISMATCH');
    assert.deepEqual([...h.retrievalFiles()], []);
  });

  it('AC-89 / BATCH-06: 非法 dimension（模型改写维度）⇒ 整批失败', async () => {
    const pairs = expectedPairs();
    // 第 1 组被模型悄悄改成一个根本不属于 Level A 的维度名。
    const rewritten = pairs.map((pair, index) =>
      index === 0 ? { ...pair, dimension: 'conclusion' as LevelADimension } : pair,
    );
    const answer = goldAnswerFor(rewritten);
    const h = makeHarness(() => ({ kind: 'batch', value: answer }));
    await seedWorstCase(h);

    const outcome = await h.service.runRetrievalForFormalAttempt({
      source_attempt_id: att(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.failure.local_code, 'BATCH_JUDGMENT_SET_MISMATCH');
    assert.deepEqual([...h.retrievalFiles()], []);
  });

  it('AC-114 / BATCH-07: 非法 verdict（含 uncompared）⇒ 整批失败', async () => {
    const answer = goldAnswerFor(expectedPairs());
    const judgments = (answer['judgments'] as readonly Readonly<Record<string, unknown>>[]).map(
      (item, index) => (index === 3 ? { ...item, verdict: 'uncompared' } : item),
    );
    const h = makeHarness(() => ({ kind: 'batch', value: { judgments } }));
    await seedWorstCase(h);

    const outcome = await h.service.runRetrievalForFormalAttempt({
      source_attempt_id: att(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.failure.local_code, 'NON_CANONICAL_JUDGE_VERDICT');
    assert.deepEqual([...h.retrievalFiles()], []);
  });

  it('AC-145 / BATCH-08: 0 个 undecided pair ⇒ 0 次 provider 调用', async () => {
    let calls = 0;
    const h = makeHarness((): FakeReply => {
      calls += 1;
      return { kind: 'structured', value: { verdict: 'matched', reason: NOT_A_REAL_LLM_OUTPUT } };
    });
    // 四个维度全部由确定性规则判 matched ⇒ 没有任何 pair 需要模型。
    await h.seed({ ...SOURCE_VALUES, attempt_id: ID_SOURCE });
    await h.seed({ ...SOURCE_VALUES });

    const record = await runOnce(h);

    assert.equal(calls, 0);
    assert.equal(h.provider.invocations.length, 0);
    assert.deepEqual([...h.provider.batch_calls], []);
    assert.equal(record.n_retrieval, 1);
    assert.deepEqual([...record.hit_level_a_dimensions], [...LEVEL_A_DIMENSIONS]);
  });

  it('AC-79 / AC-85 / BATCH-09: 归档 / Draft 记录仍被单点过滤排除，不进入任何判定', async () => {
    const ARCHIVED_ID = candidateId(9);
    const DRAFT_ID = candidateId(8);
    const h = makeHarness(goldResolver());
    // 与「活跃候选」逐字相同的取值：如果准入过滤被批量化绕过，它们立刻会被判 related。
    const sharedValues = {
      goal: '批次目标X',
      approach: '批次方案X',
      condition: '批次条件X',
      result: '批次结果X',
    };
    await h.seed({ ...SOURCE_VALUES, attempt_id: ID_SOURCE });
    await h.seed({ ...sharedValues, attempt_id: DRAFT_ID, state: 'Draft' });
    await h.seed({ ...sharedValues, attempt_id: ARCHIVED_ID, archive_state: 'archived' });
    await h.seed({ ...sharedValues, attempt_id: candidateId(1) });

    const record = await runOnce(h);

    const batch = h.provider.batch_calls[0];
    assert.ok(batch !== undefined);
    // 只上传活跃候选的 4 组。
    assert.equal(batch.pairs.length, 4);
    assert.deepEqual([...new Set(batch.pairs.map((pair) => pair.candidate_id))], [candidateId(1)]);
    // 归档 / Draft 记录既不在请求里，也不在结果里，也不进 eligible 计数。
    assert.equal(record.eligible_history_count, 1);
    assert.equal(record.n_retrieval, 1);
    assert.deepEqual(
      [...record.candidate_entries.map((entry) => entry.candidate_attempt_id)],
      [candidateId(1)],
    );
    // 原始判定链路里也不存在这两条记录的任何痕迹。
    const serialized = JSON.stringify(record);
    assert.equal(serialized.includes(ARCHIVED_ID), false);
    assert.equal(serialized.includes(DRAFT_ID), false);
    // 🔴 归档被排除与「是不是 Demo 数据」无关：判据是归档状态本身（§6.2 / AC-85）。
  });

  it('AC-89 / BATCH-10: provider 失败 ⇒ 不写 partial derivation，且保留旧 Derivation', async () => {
    const state = { failing: false };
    const h = makeHarness((): FakeReply => {
      if (state.failing) {
        return {
          kind: 'error',
          error: {
            code: 'PROVIDER_TIMEOUT',
            failure_kind: 'timeout',
            message: 'The provider request timed out.',
            retryable: true,
            path: 'browser_direct',
            http_status: null,
            target_block_reason: null,
          },
        };
      }
      return { kind: 'structured', value: { verdict: 'matched', reason: NOT_A_REAL_LLM_OUTPUT } };
    });
    await seedWorstCase(h);
    const before = await runOnce(h);
    const filesBefore = [...h.retrievalFiles()];

    state.failing = true;
    const outcome = await h.service.runRetrievalForFormalAttempt({
      source_attempt_id: att(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.failure.ai_error?.code, 'PROVIDER_TIMEOUT');
    assert.equal(outcome.failure.local_code, null);
    assert.equal(outcome.failure.source_preserved, true);
    assert.equal(outcome.previous_derivation_preserved, true);

    // 一次批量调用失败 = 整个 ⑥ 失败：没有部分候选、没有默认判定、旧 Derivation 逐字节未变。
    assert.deepEqual([...h.retrievalFiles()], filesBefore);
    const after = await h.reopen().readCurrentDerivation(att(ID_SOURCE));
    assert.equal(JSON.stringify(after), JSON.stringify(before));
  });

  it('AC-89 / BATCH-11: 结构化输出残缺 ⇒ 整批失败且不落盘', async () => {
    const h = makeHarness(() => ({ kind: 'text', text: '这不是 JSON' }));
    await seedWorstCase(h);

    const outcome = await h.service.runRetrievalForFormalAttempt({
      source_attempt_id: att(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.failure.local_code, 'MALFORMED_STRUCTURED_RESULT');
    assert.deepEqual([...h.retrievalFiles()], []);
  });

  it('AC-23 / BATCH-12: 判定项携带数值 / 等级类字段一律拒绝，且不得由批量绕过', async () => {
    const pairs = expectedPairs();
    const answer = goldAnswerFor(pairs);
    const tampered = {
      judgments: (answer['judgments'] as readonly Record<string, unknown>[]).map((item) => ({
        ...item,
        confidence: 0.91,
      })),
    };
    const h = makeHarness(() => ({ kind: 'batch', value: tampered }));
    await seedWorstCase(h);

    const outcome = await h.service.runRetrievalForFormalAttempt({
      source_attempt_id: att(ID_SOURCE),
    });
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.failure.local_code, 'NON_CANONICAL_JUDGE_FIELD');
    assert.deepEqual([...h.retrievalFiles()], []);
  });

  it('IMPLEMENTATION INVARIANT (BATCH-13): 空批次在本地被拒绝，永不触网', async () => {
    const h = makeHarness(goldResolver());
    await seedWorstCase(h);

    // 直接调用比较器：0 个 pair 时 judge 根本不会被调用。
    let invoked = 0;
    const source = await h.repository.readAttempt(att(ID_SOURCE));
    assert.ok(source !== null);
    const outcome = await compareAttemptsInOneBatch(async () => {
      invoked += 1;
      return { kind: 'judged', judgments: [] };
    }, source, []);
    assert.equal(outcome.kind, 'compared');
    assert.equal(invoked, 0);
    assert.equal(h.provider.invocations.length, 0);
  });
});

/* ------------------------------------------------------------------ *
 * The strict reader, exercised directly
 * ------------------------------------------------------------------ */

describe('FINAL-RAPID-A｜the exact-set batch reader and its schema', () => {
  const PAIRS: readonly BatchJudgePair[] = [
    { candidate_id: 'ATT_A', dimension: 'goal', source_value: 'g1', candidate_value: 'g2' },
    { candidate_id: 'ATT_A', dimension: 'approach', source_value: 'a1', candidate_value: 'a2' },
    { candidate_id: 'ATT_B', dimension: 'goal', source_value: 'g1', candidate_value: 'g3' },
  ];

  function judgement(
    pair: BatchJudgePair,
    overrides: Readonly<Record<string, unknown>> = {},
  ): Readonly<Record<string, unknown>> {
    return {
      candidate_id: pair.candidate_id,
      dimension: pair.dimension,
      verdict: 'matched',
      reason: NOT_A_REAL_LLM_OUTPUT,
      ...overrides,
    };
  }

  it('AC-23 / BATCH-14: schema 只提供 candidate_id / dimension / verdict / reason 四个字段', () => {
    const properties = batchDimensionJudgeJsonSchema['properties'] as Readonly<Record<string, unknown>>;
    assert.deepEqual(Object.keys(properties), [...BATCH_JUDGE_ALLOWED_KEYS]);
    const judgmentsSchema = properties['judgments'] as Readonly<Record<string, unknown>>;
    const items = judgmentsSchema['items'] as Readonly<Record<string, unknown>>;
    const itemProperties = items['properties'] as Readonly<Record<string, unknown>>;
    assert.deepEqual(Object.keys(itemProperties).sort(), [...BATCH_JUDGMENT_ALLOWED_KEYS].sort());
    assert.deepEqual([...(items['required'] as readonly string[])], [...BATCH_JUDGMENT_ALLOWED_KEYS]);
    const serialized = JSON.stringify(batchDimensionJudgeJsonSchema);
    for (const forbidden of ['number', 'score', 'confidence', 'percent', 'grade']) {
      assert.equal(serialized.includes(forbidden), false, forbidden);
    }
    // 🔴 单对协议一字未改：它与批量协议是两个不同的 schema id，各自的允许字段都还在。
    assert.notEqual(BATCH_DIMENSION_JUDGE_SCHEMA_ID, DIMENSION_JUDGE_SCHEMA_ID);
    assert.deepEqual([...DIMENSION_JUDGE_ALLOWED_KEYS], ['verdict', 'reason']);
    assert.deepEqual([...SEMANTIC_VERDICTS], ['matched', 'compared_not_matched']);
  });

  it('AC-89 / BATCH-15: 恰好覆盖期望集合的答案才被接受', () => {
    const read = readBatchJudgeAnswer({ judgments: PAIRS.map((pair) => judgement(pair)) }, PAIRS);
    assert.equal(read.kind, 'ok');
    if (read.kind !== 'ok') {
      throw new Error('unreachable');
    }
    assert.equal(read.judgments.length, 3);
    assert.deepEqual(
      read.judgments.map((item) => `${item.candidate_id}/${item.dimension}=${item.verdict}`),
      ['ATT_A/goal=matched', 'ATT_A/approach=matched', 'ATT_B/goal=matched'],
    );
    // 顺序无关：交换两项仍是同一集合。
    const shuffled = readBatchJudgeAnswer(
      { judgments: [judgement(PAIRS[2] as BatchJudgePair), judgement(PAIRS[1] as BatchJudgePair), judgement(PAIRS[0] as BatchJudgePair)] },
      PAIRS,
    );
    assert.equal(shuffled.kind, 'ok');
  });

  it('AC-89 / BATCH-16: 缺项 / 多项 / 重复 / 改写身份 / 非法维度 / 非法 verdict / 空 reason / 额外字段全部整批拒绝', () => {
    const cases: readonly {
      readonly name: string;
      readonly value: unknown;
      readonly code: string;
    }[] = [
      {
        name: '缺一项',
        value: { judgments: [judgement(PAIRS[0] as BatchJudgePair), judgement(PAIRS[1] as BatchJudgePair)] },
        code: 'BATCH_JUDGMENT_SET_MISMATCH',
      },
      {
        name: '多一项',
        value: {
          judgments: [
            ...PAIRS.map((pair) => judgement(pair)),
            judgement({ candidate_id: 'ATT_C', dimension: 'goal', source_value: 'x', candidate_value: 'y' }),
          ],
        },
        code: 'BATCH_JUDGMENT_SET_MISMATCH',
      },
      {
        name: '重复一组',
        value: { judgments: [...PAIRS.map((pair) => judgement(pair)), judgement(PAIRS[0] as BatchJudgePair)] },
        code: 'BATCH_JUDGMENT_SET_MISMATCH',
      },
      {
        name: 'candidate_id 被改写',
        value: {
          judgments: [
            judgement(PAIRS[0] as BatchJudgePair, { candidate_id: 'ATT_Z' }),
            judgement(PAIRS[1] as BatchJudgePair),
            judgement(PAIRS[2] as BatchJudgePair),
          ],
        },
        code: 'BATCH_JUDGMENT_SET_MISMATCH',
      },
      {
        name: 'dimension 被改写',
        value: {
          judgments: [
            judgement(PAIRS[0] as BatchJudgePair, { dimension: 'condition' }),
            judgement(PAIRS[1] as BatchJudgePair),
            judgement(PAIRS[2] as BatchJudgePair),
          ],
        },
        code: 'BATCH_JUDGMENT_SET_MISMATCH',
      },
      {
        name: 'verdict 越界',
        value: {
          judgments: [
            judgement(PAIRS[0] as BatchJudgePair, { verdict: 'uncompared' }),
            judgement(PAIRS[1] as BatchJudgePair),
            judgement(PAIRS[2] as BatchJudgePair),
          ],
        },
        code: 'NON_CANONICAL_JUDGE_VERDICT',
      },
      {
        name: 'reason 为空',
        value: {
          judgments: [
            judgement(PAIRS[0] as BatchJudgePair, { reason: '   ' }),
            judgement(PAIRS[1] as BatchJudgePair),
            judgement(PAIRS[2] as BatchJudgePair),
          ],
        },
        code: 'NON_CANONICAL_JUDGE_FIELD',
      },
      {
        name: '判定项多一个字段',
        value: {
          judgments: [
            judgement(PAIRS[0] as BatchJudgePair, { similarity_of_two_sides: 0.8 }),
            judgement(PAIRS[1] as BatchJudgePair),
            judgement(PAIRS[2] as BatchJudgePair),
          ],
        },
        code: 'NON_CANONICAL_JUDGE_FIELD',
      },
      {
        name: '根对象多一个字段',
        value: { judgments: PAIRS.map((pair) => judgement(pair)), ok: true },
        code: 'NON_CANONICAL_JUDGE_FIELD',
      },
      {
        name: '根对象不是对象',
        value: 'not an object',
        code: 'MALFORMED_STRUCTURED_RESULT',
      },
    ];

    for (const scenario of cases) {
      const read = readBatchJudgeAnswer(scenario.value, PAIRS);
      assert.equal(read.kind, 'refused', scenario.name);
      if (read.kind !== 'refused') {
        throw new Error('unreachable');
      }
      assert.equal(read.code, scenario.code, scenario.name);
    }
  });
});
