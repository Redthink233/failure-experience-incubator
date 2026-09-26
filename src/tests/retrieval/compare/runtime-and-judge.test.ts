/**
 * S01-03 ｜ Runtime completeness, the discrete judge contract and the AI / credential boundary.
 *
 * Canonical acceptance points: `AC-89` (§10.1 layer 2: a runtime failure preserves data and allows a
 * retry), `AC-114` (`D-050`: an unknown dimension never reaches the judge), `AC-23`/`AC-115`
 * (`D-020`/`D-050`: no numeric judgement quantity may be accepted), `AC-133`/`AC-134` (`D-056`: a
 * credential is never persisted or logged), `AC-145`/`AC-149` (`D-055`/§0.4 A/D: only the minimal
 * context is sent and only through the injected `M10` interface).
 *
 * 🔴 No provider is called for real. Every judge answer in this file is a hand-written
 *    `NOT_A_REAL_LLM_OUTPUT` fixture returned by a fake `M10` adapter.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { makeHarness } from './harness.js';
import type { FakeReply } from './harness.js';
import {
  D050_STRICT_RULE_TEXT,
  DIMENSION_JUDGE_ALLOWED_KEYS,
  dimensionJudgeJsonSchema,
} from '../../../retrieval/compare/dimension-judge.js';
import { retrievalViewOf } from '../../../retrieval/compare/retrieval-service.js';
import type { RunRetrievalOutcome } from '../../../retrieval/compare/retrieval-service.js';
import { RETRIEVAL_STATUSES } from '../../../retrieval/compare/types.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';

const ID_SOURCE = 'ATT_0000000000000000000000000S';

function att(value: string): ObjectId<'ATT'> {
  return value as ObjectId<'ATT'>;
}

/** Source and candidate differ on two judged dimensions, so a judge call is unavoidable. */
async function seedJudgePair(
  resolve: Parameters<typeof makeHarness>[0],
  options: Parameters<typeof makeHarness>[1] = {},
): Promise<ReturnType<typeof makeHarness>> {
  const h = makeHarness(resolve, options);
  await h.seed({ goal: 'G', approach: 'S1', result: 'R1', attempt_id: ID_SOURCE });
  await h.seed({ goal: 'G', approach: 'S2', result: 'R2' });
  return h;
}

async function run(
  h: ReturnType<typeof makeHarness>,
): Promise<RunRetrievalOutcome> {
  return h.service.runRetrievalForFormalAttempt({ source_attempt_id: att(ID_SOURCE) });
}

describe('S01-03｜runtime completeness and the discrete judge', () => {
  it('AC-89: provider 超时 ⇒ RETRIEVAL_RUNTIME_INCOMPLETE，不得伪造成空结果', async () => {
    const h = await seedJudgePair(() => ({
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
    }));

    const outcome = await run(h);
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    // 🔴 Runtime failure 在结构上就没有 status / derivation：它不可能是三种正常状态之一，
    //    也不可能是 N_检索 = 0 的表述。
    assert.equal('status' in outcome, false);
    assert.equal('derivation' in outcome, false);
    assert.equal(outcome.failure.retryable, true);
    assert.equal(outcome.failure.source_preserved, true);
    assert.equal(outcome.previous_derivation_preserved, false);
    // 没有部分候选被写入。
    assert.deepEqual([...h.retrievalFiles()], []);
    // 🔴 三种正常状态仍然只有三种，未被 runtime 失败扩增。
    assert.deepEqual([...RETRIEVAL_STATUSES], [
      'RELATED_HISTORY',
      'NO_RELATED_HISTORY',
      'HISTORY_EMPTY',
    ]);
  });

  it('AC-89: 结构化输出残缺 ⇒ MALFORMED_STRUCTURED_RESULT', async () => {
    const h = await seedJudgePair(() => ({ kind: 'text', text: '这不是 JSON' }));
    const outcome = await run(h);
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.failure.local_code, 'MALFORMED_STRUCTURED_RESULT');
  });

  it('AC-89: provider 无法提供受约束输出 ⇒ 显式失败，不退回自由文本', async () => {
    const h = await seedJudgePair(
      () => ({ kind: 'structured', value: { verdict: 'matched', reason: 'NOT_A_REAL_LLM_OUTPUT' } }),
      { structured_output: 'none' },
    );
    const outcome = await run(h);
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.failure.local_code, 'NO_STRUCTURED_OUTPUT_AVAILABLE');
    assert.equal(outcome.failure.retryable, false);
  });

  it('AC-23: 判定答案携带额外字段（数值 / 等级类）一律拒绝', async () => {
    const h = await seedJudgePair(() => ({
      kind: 'structured',
      value: {
        verdict: 'matched',
        reason: 'NOT_A_REAL_LLM_OUTPUT',
        confidence: 0.91,
      },
    }));
    const outcome = await run(h);
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.failure.local_code, 'NON_CANONICAL_JUDGE_FIELD');
  });

  it('AC-23: reason 为纯数值时同样拒绝', async () => {
    const h = await seedJudgePair(() => ({
      kind: 'structured',
      value: { verdict: 'matched', reason: '0.82' },
    }));
    const outcome = await run(h);
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.failure.local_code, 'NON_CANONICAL_JUDGE_FIELD');
  });

  it('AC-114: 判定答案不得返回 uncompared（结构规则之外的 uncompared 一律拒绝）', async () => {
    const h = await seedJudgePair(() => ({
      kind: 'structured',
      value: { verdict: 'uncompared', reason: 'NOT_A_REAL_LLM_OUTPUT' },
    }));
    const outcome = await run(h);
    assert.equal(outcome.kind, 'runtime_incomplete');
    if (outcome.kind !== 'runtime_incomplete') {
      throw new Error('unreachable');
    }
    assert.equal(outcome.failure.local_code, 'NON_CANONICAL_JUDGE_VERDICT');
  });

  it('AC-145: 判定请求只包含最小上下文，不上传整个 Workspace', async () => {
    const h = await seedJudgePair(() => ({
      kind: 'structured',
      value: { verdict: 'compared_not_matched', reason: 'NOT_A_REAL_LLM_OUTPUT' },
    }));
    await run(h);

    /*
     * 🔴 FINAL-RAPID-A: 一次检索的全部 undecided pair 合并为 **1 次** provider 调用。
     *    这里断言的是「上传了什么」，而不是「分几次上传」——最小上下文的要求一字未变。
     */
    assert.equal(h.provider.invocations.length, 1);
    assert.equal(h.provider.batch_calls.length, 1);
    const batch = h.provider.batch_calls[0];
    assert.ok(batch !== undefined);

    // 只有 system（严格判据 + 指令）与 user（本次判定清单）。
    assert.equal(batch.messages.length, 2);
    const joined = batch.messages.join('\n');
    assert.equal(joined.includes(D050_STRICT_RULE_TEXT), true);

    // 恰好上传本次真正 undecided 的两组：goal 由确定性规则判 matched、condition 两侧
    // unknown 被结构拦截，二者都不得出现在请求里；不得上传其它维度或其它候选。
    assert.deepEqual(
      [...batch.pairs.map((pair) => pair.dimension)],
      ['approach', 'result'],
    );
    assert.equal(batch.pairs.length, 2);
    assert.equal(joined.includes('path'), false);
    assert.equal(joined.includes('projects/'), false);

    // 请求对象本身只有四个契约字段，其中没有任何凭据 / 工作区字段。
    for (const invocation of h.provider.invocations) {
      assert.deepEqual(Object.keys(invocation.request).sort(), [
        'messages',
        'model',
        'provider_id',
        'structured_output',
      ]);
      assert.equal(invocation.credential_ref, null);
      assert.equal(JSON.stringify(invocation).includes('api_key'), false);
    }
  });

  it('AC-23: 判定 schema 只允许 verdict / reason 两个字段', () => {
    assert.deepEqual([...DIMENSION_JUDGE_ALLOWED_KEYS], ['verdict', 'reason']);
    const properties = dimensionJudgeJsonSchema['properties'] as Readonly<Record<string, unknown>>;
    assert.deepEqual(Object.keys(properties).sort(), ['reason', 'verdict']);
    assert.deepEqual([...(dimensionJudgeJsonSchema['required'] as readonly string[])], [
      'verdict',
      'reason',
    ]);
  });

  it('AC-114: 全部维度 unknown 的候选不触发任何 AI 调用', async () => {
    let calls = 0;
    const h = makeHarness((): FakeReply => {
      calls += 1;
      return {
        kind: 'structured',
        value: { verdict: 'matched', reason: 'NOT_A_REAL_LLM_OUTPUT' },
      };
    });
    await h.seed({ goal: 'G', approach: 'S1', condition: null, result: 'R1', attempt_id: ID_SOURCE });
    await h.seed({ goal: 'G', approach: 'S1', condition: 'C1', result: 'R1' });

    const outcome = await run(h);
    assert.equal(outcome.kind, 'completed');
    if (outcome.kind !== 'completed') {
      throw new Error('unreachable');
    }
    assert.equal(calls, 0);
    assert.equal(outcome.derivation.n_retrieval, 1);
    assert.deepEqual([...outcome.derivation.uncompared_dimensions], ['condition']);
  });

  it('AC-133: 凭据不进入 Retrieval Derivation，也不出现在 ⑦ 视图中', async () => {
    const h = await seedJudgePair(() => ({
      kind: 'structured',
      value: { verdict: 'compared_not_matched', reason: 'NOT_A_REAL_LLM_OUTPUT' },
    }));
    const outcome = await run(h);
    assert.equal(outcome.kind, 'completed');
    if (outcome.kind !== 'completed') {
      throw new Error('unreachable');
    }
    const serialized = `${JSON.stringify(outcome.derivation)}${JSON.stringify(
      retrievalViewOf(outcome.derivation),
    )}`;
    for (const forbidden of ['credential', 'api_key', 'apikey', 'secret', 'token', 'bearer', 'sk-']) {
      assert.equal(serialized.includes(forbidden), false, `${forbidden} must not appear`);
    }
  });
});
