/**
 * S01-03 ｜ The single ordering definition point (S1–S5).
 *
 * Canonical acceptance points: `AC-21` (`D-019`: time never makes an unrelated record related, and a
 * "most recent one" is never auto-selected), `AC-78` (`D-044`: 「发生时间」 is a user `Fact`;
 * `created_at` must never impersonate it), `AC-85`/`AC-86` (`D-046`: order is display only), plus the
 * `IMPLEMENTATION INVARIANT` that ordering is a pure function of the candidate set.
 *
 * IMPLEMENTATION PARAMETER chosen by this task and fixed project-wide (see the S01-03 report):
 *   - group A = candidates WITH 「发生时间」 precedes group B = candidates without;
 *   - inside group A the fixed direction is DESCENDING (later occurrence first);
 *   - the occurrence value is compared as TEXT (it is free-form user content);
 *   - `attempt_id` ascending is the final stable tie-breaker.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { displayOrderOf, comparisonOrderOf } from '../../../retrieval/compare/ordering.js';
import { makeHarness } from './harness.js';
import type { RetrievalHarness } from './harness.js';
import type { RunRetrievalOutcome } from '../../../retrieval/compare/retrieval-service.js';
import type { RetrievalDerivationRecord } from '../../../retrieval/compare/types.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';

const ID_1 = 'ATT_00000000000000000000000001';
const ID_2 = 'ATT_00000000000000000000000002';
const ID_3 = 'ATT_00000000000000000000000003';
const ID_SOURCE = 'ATT_0000000000000000000000000S';

/** Fixture ids are hand-written but go through the same branded shape as production ids. */
function att(value: string): ObjectId<'ATT'> {
  return value as ObjectId<'ATT'>;
}

function harness(): RetrievalHarness {
  return makeHarness(() => ({
    kind: 'structured',
    value: { verdict: 'compared_not_matched', reason: 'NOT_A_REAL_LLM_OUTPUT' },
  }));
}

function orderOf(record: RetrievalDerivationRecord): readonly string[] {
  return record.candidate_entries.map((entry) => entry.candidate_attempt_id);
}

async function run(h: RetrievalHarness, source_id: string): Promise<RetrievalDerivationRecord> {
  const outcome: RunRetrievalOutcome = await h.service.runRetrievalForFormalAttempt({
    source_attempt_id: att(source_id),
  });
  assert.equal(outcome.kind, 'completed');
  if (outcome.kind !== 'completed') {
    throw new Error('unreachable');
  }
  return outcome.derivation;
}

describe('S01-03｜candidate ordering', () => {
  it('AC-21: 有 occurred_at 的记录整组优先，组内按固定方向排序', async () => {
    const h = harness();
    await h.seed({ goal: 'G', attempt_id: ID_SOURCE });
    await h.seed({ goal: 'G', attempt_id: ID_1, occurred_at: '2026-01-01' });
    await h.seed({ goal: 'G', attempt_id: ID_2 });
    await h.seed({ goal: 'G', attempt_id: ID_3, occurred_at: '2026-03-01' });

    const record = await run(h, ID_SOURCE);
    assert.equal(record.n_retrieval, 3);
    // 组 A（有时间）降序 → 2026-03-01 先于 2026-01-01；组 B（无时间）在后。
    assert.deepEqual([...orderOf(record)], [ID_3, ID_1, ID_2]);
  });

  it('AC-21: 缺少 occurred_at 时只用 attempt_id 稳定兜底', async () => {
    const h = harness();
    await h.seed({ goal: 'G', attempt_id: ID_SOURCE });
    await h.seed({ goal: 'G', attempt_id: ID_2 });
    await h.seed({ goal: 'G', attempt_id: ID_1 });
    await h.seed({ goal: 'G', attempt_id: ID_3 });

    const record = await run(h, ID_SOURCE);
    assert.deepEqual([...orderOf(record)], [ID_1, ID_2, ID_3]);
  });

  it('AC-78: created_at 不得冒充 occurred_at 作为排序依据', async () => {
    const h = harness();
    await h.seed({ goal: 'G', attempt_id: ID_SOURCE });
    // 先创建但 attempt_id 较大、后创建但 attempt_id 较小，且都没有 occurred_at。
    await h.seed({ goal: 'G', attempt_id: ID_3 });
    await h.seed({ goal: 'G', attempt_id: ID_1 });

    const record = await run(h, ID_SOURCE);
    // 若实现用了 created_at 升序，顺序会是 [ID_3, ID_1]；正确顺序是按 attempt_id。
    assert.deepEqual([...orderOf(record)], [ID_1, ID_3]);
    const created = await h.repository.listAttempts();
    const createdOrder = [...created]
      .filter((attempt) => attempt.attempt_id !== ID_SOURCE)
      .sort((left, right) => (left.created_at < right.created_at ? -1 : 1))
      .map((attempt) => attempt.attempt_id);
    assert.notDeepEqual(createdOrder, [...orderOf(record)]);
  });

  it('IMPLEMENTATION INVARIANT（§22）: 命中维度数不影响排序', async () => {
    const h = harness();
    await h.seed({
      goal: 'G',
      approach: 'A',
      condition: 'C',
      result: 'R',
      attempt_id: ID_SOURCE,
    });
    await h.seed({ goal: 'G', approach: 'A', condition: 'C', result: 'R', attempt_id: ID_2 });
    await h.seed({ goal: 'G', approach: 'S2', result: 'R2', attempt_id: ID_1 });

    const record = await run(h, ID_SOURCE);
    // 3 命中（ID_2）与 1 命中（ID_1）在无 occurred_at 时仍只按 attempt_id 排序。
    assert.deepEqual([...orderOf(record)], [ID_1, ID_2]);
  });

  it('AC-86: 同一 Derivation 重复读取的候选顺序完全一致', async () => {
    const h = harness();
    await h.seed({ goal: 'G', attempt_id: ID_SOURCE });
    await h.seed({ goal: 'G', attempt_id: ID_2, occurred_at: '2026-02-02' });
    await h.seed({ goal: 'G', attempt_id: ID_1, occurred_at: '2026-02-02' });
    await h.seed({ goal: 'G', attempt_id: ID_3 });

    const first = await run(h, ID_SOURCE);
    const readBack = await h.reopen().readCurrentDerivation(att(ID_SOURCE));
    assert.ok(readBack !== null);
    const second = await run(h, ID_SOURCE);
    assert.deepEqual([...orderOf(first)], [...orderOf(readBack as RetrievalDerivationRecord)]);
    assert.deepEqual([...orderOf(first)], [...orderOf(second)]);
  });

  it('IMPLEMENTATION INVARIANT（§22 唯一定义点）: 排序是候选集合的纯函数', () => {
    const rows = [
      { attempt_id: att('ATT_00000000000000000000000002'), occurred_at: '2026-01-01' },
      { attempt_id: att('ATT_00000000000000000000000001'), occurred_at: null },
      { attempt_id: att('ATT_00000000000000000000000003'), occurred_at: '2026-05-05' },
    ];
    const forward = displayOrderOf(rows).map((row) => row.attempt_id);
    const backward = displayOrderOf([...rows].reverse()).map((row) => row.attempt_id);
    assert.deepEqual([...forward], [...backward]);
    assert.deepEqual([...forward], [
      'ATT_00000000000000000000000003',
      'ATT_00000000000000000000000002',
      'ATT_00000000000000000000000001',
    ]);
    // 比较顺序是另一套确定顺序（attempt_id 升序），与展示顺序无关。
    assert.deepEqual([...comparisonOrderOf(rows).map((row) => row.attempt_id)], [
      'ATT_00000000000000000000000001',
      'ATT_00000000000000000000000002',
      'ATT_00000000000000000000000003',
    ]);
  });
});
