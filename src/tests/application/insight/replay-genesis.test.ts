/**
 * S01 ｜ `M8` REPLAY GENESIS ｜ `PSA-A-CORRECTION-M8-RECOVERY-02`
 *        (M8-R2-01, M8-R2-02, M8-R2-03, M8-R2-05, M8-R2-06, M8-R2-07).
 *
 * 🔴 THE DEFECT THIS SUITE CLOSES. `createIfAbsent` used to declare a replay compatible only when the
 *    stored document was BYTE-IDENTICAL to the planned one (`serializeInsight(existing) ===
 *    serializeInsight(planned)`). While a step ⑧ operation sat interrupted, a user may LAWFULLY decide
 *    on the `Insight`s that had already landed - `E5` acceptance, or `candidate -> rejected` - and
 *    either decision moves `state` and rewrites `updated_at`. Comparing the whole document therefore
 *    turned a legitimate human decision into `PLAN_MISMATCH`, and `applyPlan` could never finish the
 *    batch write: the operation became PERMANENTLY unrecoverable.
 * 🔴 THE CORRECT SEMANTICS. Replay compatibility compares IMMUTABLE GENESIS ONLY. `state` and
 *    `updated_at` are the two fields a user verdict moves; everything else - identity, source
 *    provenance, the generation / batch association, the generation-time content (①/②/④), the
 *    `E1`-`E4` presentation, the evidence references, the comparison provenance - must match.
 * 🔴 WHAT THIS SUITE REFUSES TO LET SLIP. It is deliberately NOT 「只要 `insight_id` 一样就算 compatible」:
 *    M8-R2-05 / M8-R2-06 / M8-R2-07 each corrupt exactly ONE immutable dimension on disk and require
 *    the replay to FAIL CLOSED with `PLAN_MISMATCH`, leaving the divergent document untouched.
 * 🔴 THE FIXTURES ARE REAL, NOT SYNTHETIC. The `planned` side is read back from the durable operation
 *    anchor the REAL step ⑧ generation wrote, and the `existing` side is the REAL record read back from
 *    the local workspace through the REAL parser. Only the user's verdict is applied in between - and it
 *    is applied through the REAL repository `update`.
 * 🔴 NO MODEL AND NO NETWORK ANYWHERE: every reply routed through the harness is a hand-written
 *    fixture (`NOT_A_REAL_LLM_OUTPUT`). `Real Provider Calls = 0`.
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
  insightIdOf,
  makeWorkflowHarness,
  seedHistory,
  twoInsightAnswer,
  valueOf,
} from '../workflow/harness.js';
import type { WorkflowHarness } from '../workflow/harness.js';
import { NOT_A_REAL_LLM_OUTPUT } from './harness.js';
import { childOperationId } from '../../../application/workflow/operation-ids.js';
import { insightOperationKey, newInsightBatchId } from '../../../application/insight/identity.js';
import { InsightRepositoryError } from '../../../application/insight/insight-repository.js';
import {
  INSIGHT_REPLAY_MUTABLE_FIELDS,
  insightSidecarPath,
  sameInsightGenesis,
  serializeInsight,
} from '../../../application/insight/persistence.js';
import type { InsightPatch, InsightRecord } from '../../../application/insight/types.js';

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

/** The user-level operation id the suite submits. */
const OPERATION_ID = 'op-r2-genesis';

/** The instant the (fixture) user decided. Deliberately NOT the generation instant. */
const DECIDED_AT = '2026-09-26T09:15:00.000Z';

/** The child operation id step ⑧ really runs under (`D9` derives it in `operation-ids.ts`). */
const INSIGHT_OPERATION_ID = childOperationId(OPERATION_ID, 'insight-generation');

function nth<T>(values: readonly T[], index: number, what: string): T {
  const value = values[index];
  assert.ok(value !== undefined, `${what} must hold an entry at position ${index}`);
  return value;
}

/**
 * Runs ONE real step ⑧ generation and returns the `planned` records exactly as the DURABLE ANCHOR
 * holds them - i.e. the precise input a replay re-applies.
 */
async function replayBasis(): Promise<{
  readonly harness: WorkflowHarness;
  readonly planned: readonly InsightRecord[];
}> {
  const harness = makeWorkflowHarness({ insight: twoInsightAnswer() });
  await seedHistory(harness);

  expectGeneratedInsights(
    valueOf(
      await harness.workflow.generateInsights({
        operation_id: OPERATION_ID,
        attempt_id: at(ID_SOURCE),
      }),
    ),
  );

  const anchor = await harness.insights.readOperationAnchor(
    insightOperationKey(ID_SOURCE, INSIGHT_OPERATION_ID),
  );
  assert.ok(anchor !== null, 'a completed generation must leave a durable operation anchor');
  assert.equal(anchor.status, 'complete');
  assert.equal(anchor.planned_records.length, 2, 'the plan of this fixture holds two records');
  return { harness, planned: anchor.planned_records };
}

/**
 * Applies the user's verdict the way the product does: through the repository, which rewrites the
 * sidecar and bumps `updated_at`. Nothing about it touches the plan.
 */
async function decide(
  harness: WorkflowHarness,
  insight_id: string,
  patch: InsightPatch,
): Promise<InsightRecord> {
  return harness.insights.update(insightIdOf(insight_id), patch);
}

/** Writes one record straight to the workspace - the surgical corruption vector of R2-05/06/07. */
async function writeRecord(harness: WorkflowHarness, record: InsightRecord): Promise<void> {
  await harness.write_storage.writeFile(
    insightSidecarPath(record.insight.insight_id),
    serializeInsight(record),
  );
}

/** Reads one record back from the workspace through the REAL parser. */
async function persistedRecord(
  harness: WorkflowHarness,
  insight_id: string,
): Promise<InsightRecord> {
  const record = await harness.insights.readById(insightIdOf(insight_id));
  assert.ok(record !== null, `the record "${insight_id}" must exist in the workspace`);
  return record;
}

/** Requires the replay write to FAIL CLOSED with `PLAN_MISMATCH`. */
async function expectPlanMismatch(
  harness: WorkflowHarness,
  planned: InsightRecord,
): Promise<void> {
  let thrown: unknown;
  try {
    await harness.insights.createIfAbsent(planned);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown !== undefined, 'a divergent replay must FAIL CLOSED, but it was accepted');
  assert.ok(
    thrown instanceof InsightRepositoryError,
    `expected an InsightRepositoryError, received ${String(thrown)}`,
  );
  assert.equal(thrown.code, 'PLAN_MISMATCH');
}

/* ------------------------------------------------------------------ *
 * M8-R2-01 … M8-R2-03: a user verdict is COMPATIBLE
 * ------------------------------------------------------------------ */

describe('PSA-A-CORRECTION-M8-RECOVERY-02 ｜ replay compatibility is decided by IMMUTABLE GENESIS', () => {
  it('M8-R2-01 / AC-130 / IMPLEMENTATION INVARIANT: a planned `candidate` replayed against a persisted `accepted` record is compatible', async () => {
    const { harness, planned } = await replayBasis();
    const target = nth(planned, 0, 'the plan');
    assert.equal(target.insight.state, 'candidate', 'what the plan promised is a candidate');

    const decided = await decide(harness, target.insight.insight_id, {
      state: 'accepted',
      updated_at: DECIDED_AT,
    });
    assert.equal(decided.insight.state, 'accepted');
    assert.notEqual(decided.insight.updated_at, target.insight.updated_at, 'the verdict moved the clock');

    assert.equal(
      sameInsightGenesis(decided, target),
      true,
      'an `E5` acceptance is a USER decision, not a divergence of the generation',
    );

    const replayed = await harness.insights.createIfAbsent(target);
    assert.equal(replayed.replayed, true, 'the same generation must be recognised as already stored');
    assert.equal(
      replayed.record.insight.state,
      'accepted',
      'the replay returns what is STORED - never the plan',
    );
  });

  it('M8-R2-02 / AC-130 / IMPLEMENTATION INVARIANT: a planned `candidate` replayed against a persisted `rejected` record is compatible', async () => {
    const { harness, planned } = await replayBasis();
    const target = nth(planned, 1, 'the plan');
    assert.equal(target.insight.state, 'candidate');

    const decided = await decide(harness, target.insight.insight_id, {
      state: 'rejected',
      updated_at: DECIDED_AT,
    });
    assert.equal(decided.insight.state, 'rejected');
    assert.equal(sameInsightGenesis(decided, target), true);

    const replayed = await harness.insights.createIfAbsent(target);
    assert.equal(replayed.replayed, true);
    assert.equal(replayed.record.insight.state, 'rejected');
  });

  it('M8-R2-03 / AC-130 / IMPLEMENTATION INVARIANT: a changed `updated_at` alone is compatible, and ONLY `state` / `updated_at` are excluded', async () => {
    const { harness, planned } = await replayBasis();
    const target = nth(planned, 0, 'the plan');

    /* The state is NOT touched - only the clock moves. */
    const touched = await decide(harness, target.insight.insight_id, { updated_at: DECIDED_AT });
    assert.equal(touched.insight.state, target.insight.state);
    assert.notEqual(touched.insight.updated_at, target.insight.updated_at);
    assert.equal(sameInsightGenesis(touched, target), true);

    const replayed = await harness.insights.createIfAbsent(target);
    assert.equal(replayed.replayed, true);

    /*
     * 🔴 THE EXCLUSION LIST IS A CLOSED DECLARATION. If a future change widened it (`meta`,
     *    `gate_checks`, a content field …) a divergent document would be silently accepted, so the
     *    exact membership is asserted here rather than left implicit.
     */
    assert.deepEqual(
      [...INSIGHT_REPLAY_MUTABLE_FIELDS],
      ['state', 'updated_at'],
      'a replay may tolerate exactly the two fields a legitimate user verdict moves',
    );
  });

  /* ------------------------------------------------------------------ *
   * M8-R2-05 … M8-R2-07: a GENESIS divergence still FAILS CLOSED
   * ------------------------------------------------------------------ */

  it('M8-R2-05 / AC-130 / IMPLEMENTATION INVARIANT: a changed core content (① 命题) is a REAL mismatch and is refused', async () => {
    const { harness, planned } = await replayBasis();
    const target = nth(planned, 0, 'the plan');

    const divergent: InsightRecord = {
      ...target,
      insight: {
        ...target.insight,
        proposition: `${NOT_A_REAL_LLM_OUTPUT}: 一个与计划完全不同的核心命题。`,
      },
    };
    await writeRecord(harness, divergent);

    /* The comparison is symmetric, so either side triggers it. */
    assert.equal(sameInsightGenesis(divergent, target), false);
    assert.equal(sameInsightGenesis(target, divergent), false);

    await expectPlanMismatch(harness, target);

    /* 🔴 NOTHING WAS OVERWRITTEN: the divergent document is still exactly what the workspace holds. */
    const on_disk = await persistedRecord(harness, target.insight.insight_id);
    assert.equal(on_disk.insight.proposition, divergent.insight.proposition);
  });

  it('M8-R2-06 / AC-130 / IMPLEMENTATION INVARIANT: changed evidence references are a REAL mismatch and are refused', async () => {
    const { harness, planned } = await replayBasis();
    const target = nth(planned, 0, 'the plan');
    const original_refs = target.insight.evidence_refs;
    assert.ok(original_refs.length > 0, 'the generation really attached a reference set (③ / ⑩)');
    const donor = nth(original_refs, 0, 'the reference set');

    const divergent: InsightRecord = {
      ...target,
      insight: {
        ...target.insight,
        evidence_refs: [
          ...original_refs,
          { ...donor, evidence_ref_id: 'EREF_R2_06_EXTRA' },
        ],
      },
    };
    assert.notEqual(divergent.insight.evidence_refs.length, original_refs.length);
    await writeRecord(harness, divergent);

    assert.equal(sameInsightGenesis(divergent, target), false);
    await expectPlanMismatch(harness, target);

    const on_disk = await persistedRecord(harness, target.insight.insight_id);
    assert.equal(on_disk.insight.evidence_refs.length, divergent.insight.evidence_refs.length);
  });

  it('M8-R2-07 / AC-130 / IMPLEMENTATION INVARIANT: a different generation / batch association is a REAL mismatch and is refused', async () => {
    const { harness, planned } = await replayBasis();
    const target = nth(planned, 0, 'the plan');

    /* A REAL batch identity of the REAL shape - i.e. what a SECOND, different generation would carry. */
    const other_generation = newInsightBatchId(target.insight.attempt_id);
    assert.notEqual(other_generation, target.insight.generation_batch);

    const divergent: InsightRecord = {
      ...target,
      insight: { ...target.insight, generation_batch: other_generation },
    };
    await writeRecord(harness, divergent);

    assert.equal(sameInsightGenesis(divergent, target), false);
    await expectPlanMismatch(harness, target);

    const on_disk = await persistedRecord(harness, target.insight.insight_id);
    assert.equal(on_disk.insight.generation_batch, other_generation);
  });

  it('M8-R2-07b / AC-130 / IMPLEMENTATION INVARIANT: a different SOURCE record and a colliding id are refused too', async () => {
    const { planned } = await replayBasis();
    const target = nth(planned, 0, 'the plan');

    /* Source provenance: the same generation can never belong to another record. */
    const foreign_source: InsightRecord = {
      ...target,
      insight: { ...target.insight, attempt_id: at('ATT_0000000000000000000000000Z') },
    };
    assert.equal(sameInsightGenesis(foreign_source, target), false);

    /*
     * 🔴 ID COLLISION. `createIfAbsent` looks the record up BY `insight_id`, so a mismatch on the id
     *    cannot arise from the lookup itself - which is exactly why the projection carries the id:
     *    the helper stays a complete statement even when it is used outside that call site.
     */
    const foreign_identity: InsightRecord = {
      ...target,
      insight: { ...target.insight, insight_id: insightIdOf('INS_0000000000000000000000000Z') },
    };
    assert.equal(sameInsightGenesis(foreign_identity, target), false);
  });
});
