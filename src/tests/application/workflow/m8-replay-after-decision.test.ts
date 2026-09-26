/**
 * S01 ｜ `M8` REPLAY AFTER A HUMAN INSIGHT DECISION ｜ `PSA-A-CORRECTION-M8-RECOVERY-02`
 *        (M8-R2-04, M8-R2-08, M8-R2-09, M8-R2-10).
 *
 * 🔴 THE FIELD STATE THIS SUITE REPRODUCES. The interrupted PSA-A step ⑧ run left the operation anchor
 *    at `status: in_progress` with a COMPLETE `planned_batch`, every planned `Insight` already written,
 *    and `insights/batches/` still EMPTY. While the operation sat in that window the user LAWFULLY
 *    reviewed the produced records and decided on them (`candidate -> accepted` / `candidate ->
 *    rejected`), which moved `state`, rewrote `updated_at` and appended their own state events.
 * 🔴 WHY THE RETRY USED TO DIE. `createIfAbsent` compared the WHOLE document, so the user's verdict
 *    looked like corruption: `PLAN_MISMATCH` -> `PERSISTENCE_RECOVERY_BLOCKED`, for ever. This suite
 *    pins the corrected protocol: confirm the existing record against the planned IMMUTABLE GENESIS,
 *    skip the duplicate create, finish the missing batch write, and mark the operation complete.
 * 🔴 THE INVARIANT THAT MATTERS MOST. A recovery must NEVER write a human verdict back to `candidate`.
 *    The record on disk is the source of truth; the anchor describes the PLAN and is not rewritten with
 *    the verdict.
 * 🔴 HOW THE WINDOW IS OPENED. A `FaultInjectingStorage` fails exactly ONE batch write and then
 *    disarms, so the retry inside the SAME test proves the recovery really COMPLETES. Everything else is
 *    the REAL chain: the real `M8` service, the real repository, the real local workspace, and the real
 *    workflow commands the UI uses for the user's decision.
 * 🔴 NO MODEL AND NO NETWORK ANYWHERE: every reply is a hand-written fixture
 *    (`NOT_A_REAL_LLM_OUTPUT`). `Real Provider Calls = 0`, and M8-R2-09 asserts that a recovery adds
 *    none.
 *
 * Canonical ACs referenced: AC-130 (Local Workspace files). Everything else is labelled
 * `IMPLEMENTATION INVARIANT` and adds no `AC`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ID_SOURCE,
  at,
  expectGeneratedInsights,
  failOnNthMatchingWrite,
  insightBatchPredicate,
  insightIdOf,
  makeWorkflowHarness,
  seedHistory,
  twoInsightAnswer,
  valueOf,
} from './harness.js';
import type { WorkflowHarness } from './harness.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';
import type { InsightRecord } from '../../../application/insight/types.js';
import {
  INSIGHT_STATE_EVENTS_FILE,
  insightSidecarPath,
  parseInsight,
  stateEventLinesOf,
} from '../../../application/insight/persistence.js';

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

/** The user-level operation id the suite retries. */
const OPERATION_ID = 'op-r2-decision';

/** The child operation ids of the two human decisions (each user action is its own operation). */
const ACCEPT_OPERATION_ID = 'op-r2-decision-accept';
const REJECT_OPERATION_ID = 'op-r2-decision-reject';

/** The call the step ⑧ retry is issued with - byte-identical to the interrupted one. */
const RETRY = { operation_id: OPERATION_ID, attempt_id: at(ID_SOURCE) } as const;

interface AnchorDocument {
  readonly operation_key: string;
  readonly operation_id: string;
  readonly status: string;
  readonly batch_id: string;
  readonly planned_records: readonly {
    readonly insight_id: string;
    readonly state: string;
  }[];
  readonly planned_batch: {
    readonly batch_id: string;
    readonly operation_id: string;
    readonly insight_ids: readonly string[];
  };
}

interface BatchDocument {
  readonly batch_id: string;
  readonly operation_id: string;
  readonly insight_ids: readonly string[];
}

function anchorDocumentOf(harness: WorkflowHarness): AnchorDocument {
  const files = harness.anchorFiles();
  assert.equal(files.length, 1, 'exactly one durable anchor must exist');
  const raw = harness.peek(files[0] ?? '');
  assert.ok(typeof raw === 'string', 'the durable anchor must exist in the workspace');
  return JSON.parse(raw) as AnchorDocument;
}

function readBatches(harness: WorkflowHarness): readonly BatchDocument[] {
  return harness.batchFiles().map((path) => JSON.parse(harness.peek(path) ?? '{}') as BatchDocument);
}

/** One record read straight off the workspace, through the REAL parser. */
function persistedRecord(harness: WorkflowHarness, insight_id: ObjectId<'INS'>): InsightRecord {
  const path = insightSidecarPath(insight_id);
  const raw = harness.peek(path);
  assert.ok(typeof raw === 'string', `the record "${insight_id}" must exist on disk`);
  return parseInsight(raw, path);
}

/** The append-only state-event trace, line by line. */
function eventLines(harness: WorkflowHarness): readonly string[] {
  return stateEventLinesOf(harness.peek(INSIGHT_STATE_EVENTS_FILE) ?? '');
}

function plannedIdAt(anchor: AnchorDocument, index: number): ObjectId<'INS'> {
  const record = anchor.planned_records[index];
  assert.ok(record !== undefined, `the plan must hold a record at position ${index}`);
  return insightIdOf(record.insight_id);
}

/**
 * Drives the workflow into the EXACT field state: anchor `in_progress`, every planned `Insight` written,
 * the batch record missing - and then performs the two human decisions the user really performed.
 */
async function interruptedWithDecisions(): Promise<{
  readonly harness: WorkflowHarness;
  readonly anchor: AnchorDocument;
  readonly accepted_id: ObjectId<'INS'>;
  readonly rejected_id: ObjectId<'INS'>;
}> {
  const harness = makeWorkflowHarness({
    insight: twoInsightAnswer(),
    fault: failOnNthMatchingWrite(insightBatchPredicate, 1),
  });
  await seedHistory(harness);

  const first = await harness.workflow.generateInsights(RETRY);
  assert.equal(first.kind, 'runtime');
  assert.equal(first.notice?.code, 'PERSISTENCE_RECOVERY_BLOCKED');
  assert.equal(first.notice?.retryable, true);

  const anchor = anchorDocumentOf(harness);
  assert.equal(anchor.status, 'in_progress');
  assert.equal(harness.batchFiles().length, 0, 'the batch record is the missing piece');
  assert.equal(harness.insightFiles().length, 2, 'the planned documents already landed');
  assert.equal(harness.anchorFiles().length, 1);

  const accepted_id = plannedIdAt(anchor, 0);
  const rejected_id = plannedIdAt(anchor, 1);

  /* The user's lawful decisions, through the REAL workflow commands the UI uses. */
  const accepted = await harness.workflow.acceptInsight({
    operation_id: ACCEPT_OPERATION_ID,
    insight_id: accepted_id,
    user_explicitly_accepted: true,
  });
  assert.equal(accepted.value?.kind, 'applied', 'the `E5` acceptance must really apply');
  const rejected = await harness.workflow.rejectInsight({
    operation_id: REJECT_OPERATION_ID,
    insight_id: rejected_id,
  });
  assert.equal(rejected.value?.kind, 'applied', '`candidate -> rejected` must really apply');

  return { harness, anchor, accepted_id, rejected_id };
}

/* ------------------------------------------------------------------ *
 * M8-R2-04: the verdict survives the recovery
 * ------------------------------------------------------------------ */

describe('PSA-A-CORRECTION-M8-RECOVERY-02 ｜ a recovery never overwrites a human verdict', () => {
  it('M8-R2-04 / AC-130: after the recovery `accepted` is still accepted and `rejected` is still rejected', async () => {
    const { harness, anchor, accepted_id, rejected_id } = await interruptedWithDecisions();

    const accepted_before = persistedRecord(harness, accepted_id);
    const rejected_before = persistedRecord(harness, rejected_id);
    assert.equal(accepted_before.insight.state, 'accepted', 'the decision really landed BEFORE the retry');
    assert.equal(rejected_before.insight.state, 'rejected');

    const recovered = expectGeneratedInsights(valueOf(await harness.reopen().generateInsights(RETRY)));
    assert.equal(recovered.idempotent_replay, true);

    const accepted_after = persistedRecord(harness, accepted_id);
    const rejected_after = persistedRecord(harness, rejected_id);
    /* 🔴 THE PROTECTION THIS SUITE EXISTS FOR. */
    assert.equal(accepted_after.insight.state, 'accepted', 'a recovery must NEVER revert `accepted`');
    assert.equal(rejected_after.insight.state, 'rejected', 'a recovery must NEVER revert `rejected`');
    assert.equal(
      accepted_after.insight.updated_at,
      accepted_before.insight.updated_at,
      'the decided record was not even rewritten',
    );
    assert.equal(rejected_after.insight.updated_at, rejected_before.insight.updated_at);
    assert.deepEqual(accepted_after.insight.evidence_refs, accepted_before.insight.evidence_refs);
    assert.deepEqual(accepted_after.insight.gate_checks, accepted_before.insight.gate_checks);

    /* The outcome the caller receives carries the VERDICTS, not the plan. */
    const states = new Map(recovered.insights.map((insight) => [String(insight.insight_id), insight.state]));
    assert.equal(states.get(String(accepted_id)), 'accepted');
    assert.equal(states.get(String(rejected_id)), 'rejected');

    /*
     * 🔴 AND THE ANCHOR IS NOT THE TRUTH. It still describes the PLAN (a `candidate` generation), which
     *    is precisely why replaying it cannot overwrite a verdict: the records on disk win.
     */
    const completed = anchorDocumentOf(harness);
    assert.deepEqual(
      completed.planned_records.map((record) => record.state),
      anchor.planned_records.map((record) => record.state),
      'the anchor keeps describing the plan, unchanged by the user vetoes',
    );
    assert.deepEqual(
      completed.planned_records.map((record) => record.state),
      ['candidate', 'candidate'],
    );
  });

  /* ------------------------------------------------------------------ *
   * M8-R2-08: the partial window really CLOSES
   * ------------------------------------------------------------------ */

  it('M8-R2-08 / AC-130: a retry of the same operation persists the missing batch and completes the anchor', async () => {
    const { harness, anchor } = await interruptedWithDecisions();

    const recovered = expectGeneratedInsights(valueOf(await harness.reopen().generateInsights(RETRY)));
    assert.equal(recovered.idempotent_replay, true);

    /* ① the anchor is complete and still names the SAME planned batch */
    const completed = anchorDocumentOf(harness);
    assert.equal(completed.status, 'complete');
    assert.equal(completed.operation_id, anchor.operation_id);
    assert.equal(completed.batch_id, anchor.planned_batch.batch_id);
    assert.equal(completed.planned_batch.batch_id, anchor.planned_batch.batch_id);
    assert.equal(harness.anchorFiles().length, 1, 'a recovery mints no second anchor');

    /* ② the batch record landed, and its LOGICAL id is the planned one */
    const batches = readBatches(harness);
    assert.equal(batches.length, 1, 'exactly one batch record');
    assert.equal(batches[0]?.batch_id, anchor.planned_batch.batch_id);
    assert.equal(batches[0]?.operation_id, anchor.planned_batch.operation_id);
    assert.deepEqual(
      [...(batches[0]?.insight_ids ?? [])].map((id) => String(id)).sort(),
      [...anchor.planned_batch.insight_ids].map((id) => String(id)).sort(),
    );
    assert.equal(recovered.batch.batch_id, anchor.planned_batch.batch_id);

    /* ③ no duplicate record was created by the recovery */
    assert.equal(harness.insightFiles().length, 2, 'the two planned documents, and no third');
  });

  /* ------------------------------------------------------------------ *
   * M8-R2-09: finishing a write is NOT a generation
   * ------------------------------------------------------------------ */

  it('M8-R2-09 / IMPLEMENTATION INVARIANT: the retry performs ZERO additional provider calls', async () => {
    const { harness } = await interruptedWithDecisions();

    /* The interrupted attempt asked the model exactly once; the decisions ask nothing. */
    assert.equal(harness.provider.insight_calls.length, 1);
    const calls_after_decisions = harness.provider.calls.length;
    assert.equal(harness.provider.insight_calls.length, 1);

    await harness.reopen().generateInsights(RETRY);

    assert.equal(
      harness.provider.insight_calls.length,
      1,
      'a replay must not re-ask step ⑧',
    );
    assert.equal(
      harness.provider.calls.length,
      calls_after_decisions,
      'a recovery must not ask the provider for ANY schema',
    );
  });

  /* ------------------------------------------------------------------ *
   * M8-R2-10: a second retry changes nothing
   * ------------------------------------------------------------------ */

  it('M8-R2-10 / IMPLEMENTATION INVARIANT: a second retry adds no record, no batch, no event and no provider call', async () => {
    const { harness } = await interruptedWithDecisions();

    const first = expectGeneratedInsights(valueOf(await harness.reopen().generateInsights(RETRY)));
    const records_after_first = harness.insightFiles();
    const batches_after_first = readBatches(harness);
    const events_after_first = eventLines(harness);
    const calls_after_first = harness.provider.calls.length;
    assert.ok(events_after_first.length > 0, 'the two decisions really did append events');

    const second = expectGeneratedInsights(valueOf(await harness.reopen().generateInsights(RETRY)));

    assert.equal(second.idempotent_replay, true);
    assert.equal(second.batch.batch_id, first.batch.batch_id);
    assert.deepEqual(harness.insightFiles(), records_after_first, 'no duplicate record');
    assert.deepEqual(readBatches(harness), batches_after_first, 'no duplicate batch');
    assert.deepEqual(eventLines(harness), events_after_first, 'a recovery appends no state event');
    assert.equal(harness.provider.calls.length, calls_after_first, 'no provider call');
    assert.equal(anchorDocumentOf(harness).status, 'complete');
  });
});
