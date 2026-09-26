/**
 * S01 ｜ `M15` `M8-HARDENING-01` - the partial-write recovery suite (MH1–MH12).
 *
 * 🔴 THE DEFECT THIS SUITE CLOSES. Before this task a step ⑧ generation wrote the `Insight` documents
 *    FIRST and the generation batch LAST, with NO durable anchor. A crash in between left
 *    `insights/<id>.json` files on disk that no batch named, so the persisted result was invisible to
 *    the `findBatchByOperationId` idempotency lookup and a retry either minted a SECOND set of
 *    identities or produced an orphan generation.
 * 🔴 The window is opened here by a `FaultInjectingStorage` that fails exactly ONE write and then
 *    disarms - so the retry inside the SAME test proves the recovery really completes, rather than
 *    proving that a permanently broken workspace stays broken.
 * 🔴 Everything else is the REAL chain: the real `M8` service, the real repository, the real local
 *    workspace. `Real Provider Calls = 0`; every model reply is a hand-written fixture.
 *
 * Canonical ACs referenced: AC-76 (no delete), AC-122 (no version system), AC-130 (local workspace),
 * AC-137 (resolution by content). Everything else is labelled `IMPLEMENTATION INVARIANT` and adds no
 * `AC`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ID_RELATED,
  ID_SOURCE,
  NOT_A_REAL_LLM_OUTPUT,
  at,
  makeWorkflowHarness,
  readSnapshot,
  seedHistory,
  timeoutError,
  twoInsightAnswer,
  failOnNthMatchingWrite,
  insightBatchPredicate,
  insightSidecarPredicate,
  valueOf,
  expectGeneratedInsights,
} from './harness.js';
import type { WorkflowHarness } from './harness.js';
import { zeroOutputAnswer } from '../insight/harness.js';
import { childOperationId } from '../../../application/workflow/operation-ids.js';
import { decodeOperationIdToken, encodeOperationIdToken } from '../../../application/insight/identity.js';

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

interface AnchorDocument {
  readonly operation_key: string;
  readonly operation_id: string;
  readonly status: string;
  readonly batch_id: string;
  readonly planned_records: readonly { readonly insight_id: string }[];
  readonly planned_batch: { readonly insight_ids: readonly string[] };
}

/** The persisted anchor document, read back from the local workspace. */
function anchorDocumentOf(harness: WorkflowHarness): AnchorDocument {
  const files = harness.anchorFiles();
  assert.equal(files.length, 1, 'exactly one durable anchor must exist after the write');
  const raw = harness.peek(files[0] ?? '');
  assert.ok(typeof raw === 'string', 'the durable anchor must exist in the workspace');
  return JSON.parse(raw) as AnchorDocument;
}

/** The ids the anchor planned. */
function plannedIdsOf(harness: WorkflowHarness): readonly string[] {
  return anchorDocumentOf(harness).planned_records.map((record) => record.insight_id);
}

async function prepareFaulted(
  fault: (path: string) => boolean,
  answer: Readonly<Record<string, unknown>> = twoInsightAnswer(),
): Promise<WorkflowHarness> {
  const harness = makeWorkflowHarness({ insight: answer, fault });
  await seedHistory(harness);
  return harness;
}

/* ------------------------------------------------------------------ *
 * MH1 – MH3: the anchor, and the two crash windows it opens
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜M8-HARDENING-01 · anchor and partial writes', () => {
  it('MH1 / AC-130 / IMPLEMENTATION INVARIANT: a successful generation leaves a COMPLETE durable anchor naming exactly what it wrote', async () => {
    const harness = makeWorkflowHarness({ insight: twoInsightAnswer() });
    await seedHistory(harness);

    const outcome = expectGeneratedInsights(
      valueOf(await harness.workflow.generateInsights({ operation_id: 'op-mh1', attempt_id: at(ID_SOURCE) })),
    );
    assert.equal(outcome.kind, 'generated');

    assert.equal(harness.anchorFiles().length, 1, 'exactly one operation anchor');
    const anchor = anchorDocumentOf(harness);
    assert.equal(anchor.status, 'complete');
    assert.equal(anchor.planned_records.length, 2);
    assert.deepEqual(
      anchor.planned_records.map((record) => record.insight_id),
      anchor.planned_batch.insight_ids,
      'the plan and the planned batch must name the same set',
    );
    /*
     * 🔴 The anchor path is derived from the (source attempt, operation) pair and the operation id is
     *    encoded INJECTIVELY into a path-safe token, so a `#` in a child operation id cannot collide
     *    with a different operation.
     */
    assert.match(
      harness.anchorFiles()[0] ?? '',
      /^insights\/operations\/ATT_[0-9A-Za-z]+__[A-Za-z0-9_~-]+\.json$/,
    );
    assert.equal(harness.insightFiles().length, 2);
    assert.equal(harness.batchFiles().length, 1);
  });

  it('MH2 / AC-130 / IMPLEMENTATION INVARIANT: the FIRST Insight write succeeds and the SECOND fails - the anchor names what is missing', async () => {
    const harness = await prepareFaulted(failOnNthMatchingWrite(insightSidecarPredicate, 2));

    const first = await harness.workflow.generateInsights({
      operation_id: 'op-mh2',
      attempt_id: at(ID_SOURCE),
    });
    assert.equal(first.kind, 'runtime');
    assert.equal(first.layer, 'RUNTIME');
    assert.equal(first.notice?.code, 'PERSISTENCE_RECOVERY_BLOCKED');
    assert.equal(first.notice?.retryable, true);
    /*
     * 🔴 The value carried here is the module's OWN refusal - never a `generated` / `zero_output`
     *    outcome, so a blocked write can never be mistaken for a completed one.
     */
    assert.equal(first.value?.kind, 'refused');
    assert.equal(
      (first.value as { readonly code?: string } | null)?.code,
      'PERSISTENCE_RECOVERY_BLOCKED',
    );

    assert.equal(harness.insightFiles().length, 1, 'only the first document landed');
    assert.equal(harness.batchFiles().length, 0, 'the batch record is still missing');
    assert.equal(harness.anchorFiles().length, 1, 'the anchor landed FIRST');
    assert.equal(plannedIdsOf(harness).length, 2);
  });

  it('MH3 / AC-130 / IMPLEMENTATION INVARIANT: every Insight is written but the BATCH write fails - still recoverable', async () => {
    const harness = await prepareFaulted(failOnNthMatchingWrite(insightBatchPredicate, 1));

    const first = await harness.workflow.generateInsights({
      operation_id: 'op-mh3',
      attempt_id: at(ID_SOURCE),
    });
    assert.equal(first.kind, 'runtime');
    assert.equal(first.notice?.code, 'PERSISTENCE_RECOVERY_BLOCKED');

    assert.equal(harness.insightFiles().length, 2, 'both documents landed');
    assert.equal(harness.batchFiles().length, 0, 'the batch record is the missing piece');
    assert.equal(harness.anchorFiles().length, 1);
  });
});

/* ------------------------------------------------------------------ *
 * MH4 – MH9: the replay
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜M8-HARDENING-01 · replay recovery', () => {
  it('IMPLEMENTATION INVARIANT: MH4 / MH5 / MH6 / MH7 / MH8 / MH9: the same operation id FINISHES the write without a second AI call, a second id or a second batch', async () => {
    const harness = await prepareFaulted(failOnNthMatchingWrite(insightSidecarPredicate, 2));

    const calls_before_retry_marker = harness.provider.insight_calls.length;
    const first = await harness.workflow.generateInsights({
      operation_id: 'op-mh4',
      attempt_id: at(ID_SOURCE),
    });
    assert.equal(first.kind, 'runtime');
    assert.equal(harness.provider.insight_calls.length, 1, 'the first attempt did call the model once');

    const planned = plannedIdsOf(harness);
    const batch_id_before = anchorDocumentOf(harness).batch_id;

    /* MH4: the SAME operation id is retried, through a BRAND-NEW object graph. */
    const replayed = expectGeneratedInsights(
      valueOf(await harness.reopen().generateInsights({ operation_id: 'op-mh4', attempt_id: at(ID_SOURCE) })),
    );
    assert.equal(replayed.idempotent_replay, true);

    /* MH5: the retry never asked the model again. */
    assert.equal(
      harness.provider.insight_calls.length,
      calls_before_retry_marker + 1,
      'the retry must not re-call the provider',
    );

    /* MH6: the retry did not mint new Insight identities. */
    assert.deepEqual(
      replayed.insights.map((insight) => String(insight.insight_id)).sort(),
      [...planned].sort(),
    );
    assert.equal(harness.insightFiles().length, 2, 'exactly the planned documents exist');

    /* MH7: the retry did not mint a new batch identity. */
    assert.equal(replayed.batch.batch_id, batch_id_before);
    assert.equal(harness.batchFiles().length, 1);

    /* MH8: the final state is consistent - every planned document is named by the batch. */
    assert.deepEqual(
      [...replayed.batch.insight_ids].map((id) => String(id)).sort(),
      [...planned].sort(),
    );

    /* MH9: no orphan second generation anywhere. */
    assert.equal(harness.anchorFiles().length, 1);
    assert.equal(harness.batchFiles().length, 1);
    assert.equal(anchorDocumentOf(harness).status, 'complete');
  });

  it('IMPLEMENTATION INVARIANT: MH9b: the completed operation really is idempotent on a THIRD submission', async () => {
    const harness = makeWorkflowHarness({ insight: twoInsightAnswer() });
    await seedHistory(harness);

    const ops = { operation_id: 'op-mh9b', attempt_id: at(ID_SOURCE) };
    const first = expectGeneratedInsights(valueOf(await harness.workflow.generateInsights(ops)));
    const again = expectGeneratedInsights(valueOf(await harness.workflow.generateInsights(ops)));

    assert.equal(again.batch.batch_id, first.batch.batch_id);
    assert.equal(again.idempotent_replay, true);
    assert.equal(harness.insightFiles().length, 2);
    assert.equal(harness.batchFiles().length, 1);
    assert.equal(harness.provider.insight_calls.length, 1);
  });
});

/* ------------------------------------------------------------------ *
 * MH10: a recovery that fails again
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜M8-HARDENING-01 · a blocked recovery is never a success', () => {
  it('IMPLEMENTATION INVARIANT: MH10: a plan mismatch during recovery is reported as a RETRYABLE refusal, never as an outcome', async () => {
    const harness = await prepareFaulted(failOnNthMatchingWrite(insightSidecarPredicate, 2));

    await harness.workflow.generateInsights({ operation_id: 'op-mh10', attempt_id: at(ID_SOURCE) });
    const planned = plannedIdsOf(harness);
    const second = planned[1];
    assert.ok(second !== undefined);

    /*
     * Corrupt the workspace the way a real one can be corrupted: a DIFFERENT document now exists under
     * an identity the plan owns. `createIfAbsent` must refuse it (`PLAN_MISMATCH`) instead of
     * overwriting, and the recovery must surface that as a refusal.
     */
    const existing = harness.peek(`insights/${second}.json`);
    assert.equal(existing, undefined, 'the second document really is missing before the tamper');
    const first = planned[0];
    assert.ok(first !== undefined);
    const donor = harness.peek(`insights/${first}.json`);
    assert.ok(typeof donor === 'string');
    const tampered = JSON.parse(donor) as Record<string, unknown>;
    tampered['insight_id'] = second;
    tampered['proposition'] = `${NOT_A_REAL_LLM_OUTPUT}: 一个与计划不同的文档`;
    await harness.write_storage.writeFile(`insights/${second}.json`, JSON.stringify(tampered, null, 2));

    const blocked = await harness.reopen().generateInsights({
      operation_id: 'op-mh10',
      attempt_id: at(ID_SOURCE),
    });
    assert.equal(blocked.kind, 'runtime');
    assert.equal(blocked.layer, 'RUNTIME');
    assert.equal(blocked.notice?.code, 'PERSISTENCE_RECOVERY_BLOCKED');
    assert.equal(blocked.notice?.retryable, true);
    /* 🔴 The carried value is the module's REFUSAL - never an outcome that looks like a success. */
    assert.equal(blocked.value?.kind, 'refused');
    assert.equal(harness.batchFiles().length, 0, 'nothing was completed');
  });
});

/* ------------------------------------------------------------------ *
 * MH11: the zero-output replay
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜M8-HARDENING-01 · a zero-output generation is replayable too', () => {
  it('IMPLEMENTATION INVARIANT: MH11: a zero-output batch is idempotent, keeps its reason and never mints a second batch', async () => {
    const harness = makeWorkflowHarness({
      insight: zeroOutputAnswer('EXIT-C', '当前只能形成含混的说法，不足以形成明确的可复用命题。'),
    });
    await seedHistory(harness);

    const ops = { operation_id: 'op-mh11', attempt_id: at(ID_SOURCE) };
    const first = valueOf(await harness.workflow.generateInsights(ops));
    assert.equal(first.kind, 'zero_output');
    assert.equal(first.exit_route, 'EXIT-C');
    assert.ok(first.absence_statement.trim().length > 0);

    const replayed = valueOf(await harness.reopen().generateInsights(ops));
    assert.equal(replayed.kind, 'zero_output');
    assert.equal(replayed.idempotent_replay, true);
    assert.equal(replayed.batch.batch_id, first.batch.batch_id);
    assert.equal(replayed.absence_statement, first.absence_statement, 'the reason is preserved verbatim');
    assert.equal(harness.batchFiles().length, 1);
    assert.equal(harness.insightFiles().length, 0);
    assert.equal(harness.provider.insight_calls.length, 1);
  });
});

/* ------------------------------------------------------------------ *
 * MH12 + regression: explicit regeneration and the runtime failure
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜M8-HARDENING-01 · regeneration and runtime failures', () => {
  it('MH12 / AC-122 / IMPLEMENTATION INVARIANT: an EXPLICIT regeneration produces a NEW batch and leaves the accepted older Insight untouched', async () => {
    const harness = makeWorkflowHarness({
      insight: twoInsightAnswer(),
    });
    await seedHistory(harness);

    const generated = valueOf(
      await harness.workflow.generateInsights({ operation_id: 'op-mh12-a', attempt_id: at(ID_SOURCE) }),
    );
    assert.equal(generated.kind, 'generated');
    const first = generated.insights[0];
    assert.ok(first !== undefined);

    const accepted = await harness.workflow.acceptInsight({
      operation_id: 'op-mh12-accept',
      insight_id: first.insight_id,
      user_explicitly_accepted: true,
    });
    assert.equal(accepted.value?.kind, 'applied');

    const batches_before = harness.batchFiles().length;
    assert.equal(batches_before, 1);

    /* A regeneration is a NEW user operation and therefore carries a NEW operation id. */
    const regenerated = valueOf(
      await harness.workflow.regenerateInsights({
        operation_id: 'op-mh12-b',
        attempt_id: at(ID_SOURCE),
      }),
    );
    assert.equal(regenerated.kind, 'generated');
    assert.notEqual(regenerated.batch.batch_id, generated.batch.batch_id);
    assert.equal(harness.batchFiles().length, 2, 'a second batch, not a replacement');

    /* 🔴 The older accepted Insight keeps its state and keeps being an Experience Asset. */
    const snapshot = await readSnapshot(harness.reopen(), at(ID_SOURCE));
    assert.ok(snapshot !== null);
    const older = snapshot.insights.views.find(
      (view) => view.insight.insight_id === first.insight_id,
    );
    assert.ok(older !== undefined);
    assert.equal(older.insight.state, 'accepted');
    assert.equal(older.is_experience_asset, true);
    assert.equal(snapshot.insights.batches.length, 2);
    assert.equal(snapshot.insights.current_batch_id, regenerated.batch.batch_id);
    assert.equal(
      snapshot.insights.batches.find((batch) => batch.batch_id === generated.batch.batch_id)
        ?.is_current,
      false,
      'an older batch is simply older - never weaker, never "wrong"',
    );
  });

  it('IMPLEMENTATION INVARIANT: a step ⑧ runtime failure writes NOTHING and is retryable', async () => {
    const harness = makeWorkflowHarness({ insight: twoInsightAnswer(), fail_step_8_with: timeoutError() });
    await seedHistory(harness);

    const failed = await harness.workflow.generateInsights({
      operation_id: 'op-mh-reg',
      attempt_id: at(ID_SOURCE),
    });
    assert.equal(failed.kind, 'runtime');
    assert.equal(failed.notice?.code, 'PROVIDER_FAILURE');
    assert.equal(failed.notice?.retryable, true);

    /* 🔴 A runtime failure produces no anchor, no record and no batch: there is nothing to recover. */
    assert.deepEqual(harness.anchorFiles(), []);
    assert.deepEqual(harness.insightFiles(), []);
    assert.deepEqual(harness.batchFiles(), []);
  });

  it('IMPLEMENTATION INVARIANT: a reused operation id for a DIFFERENT record is refused', async () => {
    const harness = makeWorkflowHarness({ insight: twoInsightAnswer() });
    await seedHistory(harness);

    const ops = { operation_id: 'op-conflict' };
    valueOf(await harness.workflow.generateInsights({ ...ops, attempt_id: at(ID_SOURCE) }));

    const conflicted = await harness.workflow.generateInsights({
      ...ops,
      attempt_id: at(ID_RELATED),
    });
    assert.equal(conflicted.kind, 'gate');
    assert.equal(conflicted.notice?.code, 'WORKFLOW_COMMAND_INVALID');
    assert.equal(harness.batchFiles().length, 1);
  });

  it('AC-76 / AC-122: the recovery protocol adds no delete, no version and no history to the repository', async () => {
    const harness = makeWorkflowHarness({ insight: twoInsightAnswer() });
    await seedHistory(harness);
    valueOf(await harness.workflow.generateInsights({ operation_id: 'op-mh-scan', attempt_id: at(ID_SOURCE) }));

    for (const member of ['delete', 'remove', 'clear']) {
      assert.equal(
        member in harness.insights,
        false,
        `the Insight repository must not expose "${member}"`,
      );
    }
    /* The anchor is a REPLAY anchor, not a version record: exactly one document per operation. */
    assert.equal(harness.anchorFiles().length, 1);
    assert.equal(
      harness.paths().some((path) => /version|history|revision/i.test(path)),
      false,
    );
    /* The anchor and the single batch record name the same batch. */
    const anchor = anchorDocumentOf(harness);
    assert.equal(anchor.status, 'complete');
    assert.equal(
      harness.peek(`insights/batches/${anchor.batch_id}.json`) !== undefined,
      true,
      'the anchor names a batch record that really exists',
    );
  });

  it('IMPLEMENTATION INVARIANT: the anchor identity is INJECTIVE - two operation ids never collide', () => {
    /*
     * 🔴 The anchor key is a PATH, so a LOSSY encoding would map two different operation ids onto one
     *    anchor and turn 「两个不同 operation」 into 「同一次 operation 重放」 - a legitimate second
     *    generation would then silently return the first one's batch.
     */
    const pairs: readonly (readonly [string, string])[] = [
      ['op a#b', 'op a'],
      ['操作一', '操作二'],
      ['x~79', 'xy'],
      ['a/b', 'a~2Fb'],
    ];
    for (const [left, right] of pairs) {
      assert.notEqual(encodeOperationIdToken(left), encodeOperationIdToken(right));
    }
    /* It is REVERSIBLE, so the mapping cannot be lossy. */
    assert.equal(decodeOperationIdToken(encodeOperationIdToken('操作一#a~b/c')), '操作一#a~b/c');
    /* And the token is strictly path-safe ASCII. */
    assert.equal(/^[A-Za-z0-9_~-]+$/.test(encodeOperationIdToken('操作一/a b')), true);

    /* The child operation id keeps two DIFFERENT steps of one user operation apart. */
    assert.notEqual(
      childOperationId('op-a', 'insight-generation'),
      childOperationId('op-a', 'hypothesis-generation'),
    );
    assert.notEqual(
      childOperationId('op-a', 'insight-action', 'INS_x'),
      childOperationId('op-a', 'insight-action', 'INS_y'),
    );
  });
});
