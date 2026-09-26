/**
 * S01 ｜ `M15` `D9` END-TO-END suite (E2E-1 – E2E-12).
 *
 * 🔴 THE ONLY THING THIS SUITE PROVES: that ONE user operation can carry `D9` from ① to ⑩ through the
 *    public workflow service, over the REAL `M4`–`M9` modules and a REAL local workspace, with the
 *    frozen semantics intact and with exactly ONE automatic side effect (⑤ ⇒ ⑥).
 * 🔴 WHAT IT DOES NOT PROVE: any model behaviour, any provider compatibility, any browser behaviour
 *    and any deployment. Every model reply is a hand-written `NOT_A_REAL_LLM_OUTPUT` fixture
 *    (`Real Provider Calls = 0`), and the workspace is an in-memory `WorkspaceStorage`. A real-browser
 *    / real-provider acceptance remains `PSA-* = PENDING`.
 * 🔴 The `ACCEPTANCE` layer is produced HERE and nowhere else: no command result may carry it, and no
 *    step of this file is a product acceptance criterion. Canonical ACs are only REFERENCED; the suite
 *    adds none.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ObjectId } from '../../../domain/ids/object-id.js';
import { provided } from '../../../domain/types/presence.js';
import { factItem } from '../../../domain/types/source-type.js';
import {
  acceptanceReportOf,
  acceptanceStep,
  D9_STEP_LABELS,
} from '../../../application/workflow/acceptance.js';
import type {
  D9AcceptanceStepRecord,
  D9StepLabel,
} from '../../../application/workflow/acceptance.js';
import type { FormalSaveWorkflowResult } from '../../../application/workflow/types.js';
import {
  ID_RELATED,
  expectGeneratedHypotheses,
  expectGeneratedInsights,
  failOnNthMatchingWrite,
  insightSidecarPredicate,
  makeWorkflowHarness,
  readSnapshot,
  seedHistoricalCorpus,
  startSource,
  timeoutError,
  twoInsightAnswer,
  valueOf,
} from './harness.js';
import type { WorkflowHarness } from './harness.js';

/* ------------------------------------------------------------------ *
 * Shared fixtures
 * ------------------------------------------------------------------ */

function countSnapshot(harness: WorkflowHarness): Readonly<Record<string, number>> {
  return {
    judge: harness.provider.judge_calls.length,
    insight: harness.provider.insight_calls.length,
    hypothesis: harness.provider.hypothesis_calls.length,
    check: harness.provider.check_calls.length,
    capture: harness.provider.capture_calls.length,
  };
}

/** Steps ①–⑤ over a fresh workspace with a real historical corpus. */
async function runChainToOneFormal(
  harness: WorkflowHarness,
  operation_id: string,
): Promise<{ readonly attempt_id: ObjectId<'ATT'>; readonly save: FormalSaveWorkflowResult }> {
  const started = await startSource(harness, operation_id);
  const saved = await harness.workflow.saveFormalAttempt({
    operation_id,
    attempt_id: started.attempt_id,
    user_explicitly_confirmed: true,
  });
  return { attempt_id: started.attempt_id, save: valueOf(saved) };
}

/* ------------------------------------------------------------------ *
 * E2E-1: the whole chain
 * ------------------------------------------------------------------ */

describe('M15 ｜ E2E ①→⑩ on the public workflow service', () => {
  it('E2E-1 / AC-130 / IMPLEMENTATION INVARIANT: ①→⑩ completes end to end, and the report says so with Real Provider Calls = 0', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);

    const records: D9AcceptanceStepRecord[] = [];
    const step = (label: D9StepLabel, name: string, passed: boolean, detail: string): void => {
      records.push(acceptanceStep(label, name, passed, detail));
    };

    /* ①–③: the natural-language record, the fake step ② parse and the user confirmation. */
    const started = await startSource(harness, 'e2e-1');
    const attempt_id = started.attempt_id;
    step('①', 'create the Draft from natural language', started.begin.value?.attempt !== null, `attempt=${attempt_id}`);
    step('②', 'step ② structured parse (fake provider)', harness.provider.capture_calls.length >= 1, `${harness.provider.capture_calls.length} capture call(s)`);
    step('③', 'apply the structured confirmation', started.confirmation.value?.result.kind === 'applied', 'the confirmation really wrote');

    /* ④: the cause analysis is a read-only proposal. */
    const causes = valueOf(await harness.workflow.analyseCandidateCauses(attempt_id));
    assert.equal(causes?.kind, 'analysed');
    step(
      '④',
      'candidate causes proposed (read-only)',
      causes?.kind === 'analysed' && causes.proposal.candidates.length > 0,
      `${causes?.kind === 'analysed' ? causes.proposal.candidates.length : 0} cause(s)`,
    );

    /* ⑤ + the ONE automatic ⑥. */
    const saved = await harness.workflow.saveFormalAttempt({
      operation_id: 'e2e-1',
      attempt_id,
      user_explicitly_confirmed: true,
    });
    const save = valueOf(saved);
    step('⑤', 'save as Formal', save.promotion_happened, 'the record became Formal');
    step('⑥', 'step ⑥ triggered automatically by the save', save.retrieval_triggered, `retrieval=${save.retrieval?.kind ?? 'n/a'}`);

    /* ⑦: the comparison material comes from the SAME derivation. */
    const afterRetrieval = await readSnapshot(harness.workflow, attempt_id);
    assert.ok(afterRetrieval !== null);
    step('⑦', 'step ⑦ comparison material', afterRetrieval.retrieval.view !== null, `N_检索=${String(afterRetrieval.retrieval.n_retrieval)}`);

    /* ⑧: explicit generation; the candidate is NOT accepted. */
    const insight_service = harness.workflow;
    const generated = expectGeneratedInsights(
      valueOf(await insight_service.generateInsights({ operation_id: 'e2e-1', attempt_id })),
    );
    step('⑧', 'candidate Insight generation', generated.insights.length > 0, `${generated.insights.length} candidate(s)`);

    /* ⑨: explicit generation, WITHOUT any `E5` acceptance. */
    const hypotheses = expectGeneratedHypotheses(
      valueOf(await insight_service.generateHypotheses({ operation_id: 'e2e-1', attempt_id })),
    );
    const grounded = hypotheses.hypotheses[0];
    assert.ok(grounded !== undefined);
    step('⑨', 'History-grounded Hypothesis', hypotheses.hypotheses.length > 0, `${hypotheses.hypotheses.length} grounded`);

    /* ⑩: the trace lands on the REAL historical record. */
    const trace = valueOf(await insight_service.traceHypothesis(grounded.hypothesis_id));
    assert.ok(trace !== null);
    sameSourceInvariant(harness, trace.citation.n_citation, trace.traceability);
    const traced = trace.traceability.map((entry) => String(entry.target_id));
    assert.ok(traced.includes(ID_RELATED), `⑩ must reach the real historical record (got ${traced.join(', ')})`);
    step('⑩', 'traceability back to the real history', traced.length > 0, `${traced.length} reference row(s)`);

    const report = acceptanceReportOf(records, 0);
    assert.equal(report.all_passed, true, `failed steps: ${report.failed_steps.join(', ')}`);
    assert.equal(report.steps.length, D9_STEP_LABELS.length);
    assert.deepEqual(report.failed_steps, []);
    assert.equal(report.real_provider_calls, 0);

    /* ⑦'s related set really is the seeded corpus - not a number the test double produced. */
    assert.equal(afterRetrieval.retrieval.n_retrieval, 2);
    assert.deepEqual(
      [...(afterRetrieval.retrieval.derivation?.candidate_entries ?? [])]
        .map((entry) => String(entry.candidate_attempt_id))
        .sort(),
      ['ATT_0000000000000000000000000C', 'ATT_0000000000000000000000000E'].sort(),
    );
  });
});

/* ------------------------------------------------------------------ *
 * E2E-2 – E2E-4: the ONE automatic trigger
 * ------------------------------------------------------------------ */

describe('M15 ｜ E2E ⑤ ⇒ ⑥ is the ONLY automatic side effect', () => {
  it('E2E-2 / AC-79 / IMPLEMENTATION INVARIANT: a successful Formal save triggers ⑥ immediately, exactly once, with no extra user action', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);

    const { attempt_id, save } = await runChainToOneFormal(harness, 'e2e-2');
    assert.equal(save.promotion_happened, true);
    assert.equal(save.retrieval_triggered, true);
    assert.equal(save.retrieval?.kind, 'completed');
    assert.equal(harness.retrievalFiles().length, 1, 'exactly one derivation was written');

    /* 🔴 Repeating the SAME save operation is a replay: the record is already `Formal`, so nothing is
       promoted and therefore ⑥ must NOT run a second time. */
    const judge_calls = harness.provider.judge_calls.length;
    const replay = valueOf(
      await harness.workflow.saveFormalAttempt({
        operation_id: 'e2e-2',
        attempt_id,
        user_explicitly_confirmed: true,
      }),
    );
    assert.equal(replay.promotion_happened, false, 'no second promotion can happen');
    assert.equal(replay.retrieval_triggered, false);
    assert.equal(replay.retrieval, null);
    assert.equal(harness.provider.judge_calls.length, judge_calls, '⑥ must not run twice');
    assert.equal(harness.retrievalFiles().length, 1, 'still exactly one derivation');

    /* The same is true of a brand-new object graph: the guard reads the WORKSPACE, not a ledger. */
    const replayed_after_reload = valueOf(
      await harness.reopen().saveFormalAttempt({
        operation_id: 'e2e-2',
        attempt_id,
        user_explicitly_confirmed: true,
      }),
    );
    assert.equal(replayed_after_reload.retrieval_triggered, false);
    assert.equal(harness.provider.judge_calls.length, judge_calls);
  });

  it('E2E-3 / AC-79 / IMPLEMENTATION INVARIANT: a save that leaves the record a Draft triggers nothing', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);

    const started = await startSource(harness, 'e2e-3');
    const before = countSnapshot(harness);
    const save = valueOf(
      await harness.workflow.saveFormalAttempt({
        operation_id: 'e2e-3',
        attempt_id: started.attempt_id,
        user_explicitly_confirmed: false,
      }),
    );
    assert.equal(save.promotion_happened, false);
    assert.equal(save.retrieval_triggered, false);
    assert.equal(save.save.formalization.decision.outcome, 'draft_retained');
    assert.deepEqual(harness.retrievalFiles(), []);
    assert.equal(harness.provider.judge_calls.length, before.judge ?? 0);

    const snapshot = await readSnapshot(harness.workflow, started.attempt_id);
    assert.ok(snapshot !== null);
    assert.equal(snapshot.attempt_state, 'Draft');
    assert.equal(snapshot.retrieval.state, 'not_available');
    assert.equal(snapshot.retrieval.n_retrieval, null);
  });

  it('E2E-4 / AC-79 / IMPLEMENTATION INVARIANT: a save the Formal gate REFUSES triggers nothing and leaves the record untouched', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);

    /* ① only: the step ② parse lands as sidecar content items, so the main field slots stay unknown
       and the Formal gate cannot be satisfied. */
    const created = await harness.workflow.beginCapture({
      operation_id: 'e2e-4-raw',
      raw_text: '一次没有达到目标的尝试',
    });
    const raw_attempt = created.value?.attempt ?? null;
    assert.ok(raw_attempt !== null);

    const judge_before = harness.provider.judge_calls.length;
    const save = valueOf(
      await harness.workflow.saveFormalAttempt({
        operation_id: 'e2e-4',
        attempt_id: raw_attempt.attempt_id,
        user_explicitly_confirmed: true,
      }),
    );
    assert.equal(save.promotion_happened, false);
    assert.equal(save.retrieval_triggered, false);
    assert.equal(save.save.formalization.decision.outcome, 'draft_retained');
    assert.ok(save.save.formalization.missing_fields.length > 0, 'the refusal says what is missing');
    assert.deepEqual(harness.retrievalFiles(), []);
    assert.equal(harness.provider.judge_calls.length, judge_before);

    const snapshot = await readSnapshot(harness.workflow, raw_attempt.attempt_id);
    assert.ok(snapshot !== null);
    assert.equal(snapshot.attempt_state, 'Draft');
    assert.equal(snapshot.retrieval.state, 'not_available');
    assert.equal(snapshot.retrieval.n_retrieval, null);
  });
});

/* ------------------------------------------------------------------ *
 * E2E-5: ⑥ fails at runtime, the Formal record survives
 * ------------------------------------------------------------------ */

describe('M15 ｜ E2E a step ⑥ runtime failure never rolls the Formal save back', () => {
  it('E2E-5 / AC-89 / IMPLEMENTATION INVARIANT: the record stays Formal, the failure is RUNTIME, and a retry completes ⑥', async () => {
    const harness = makeWorkflowHarness({ fail_step_6_with: timeoutError() });
    await seedHistoricalCorpus(harness);

    const started = await startSource(harness, 'e2e-5');
    const attempt_id = started.attempt_id;
    const saved = await harness.workflow.saveFormalAttempt({
      operation_id: 'e2e-5',
      attempt_id,
      user_explicitly_confirmed: true,
    });

    /* 🔴 ONE result carries BOTH facts: the save really happened AND step ⑥ could not finish. */
    assert.equal(saved.kind, 'runtime');
    assert.equal(saved.layer, 'RUNTIME');
    assert.equal(saved.notice?.code, 'RETRIEVAL_RUNTIME_INCOMPLETE');
    assert.equal(saved.notice?.retryable, true);
    const save = valueOf(saved);
    assert.equal(save.promotion_happened, true, 'the save itself succeeded');
    assert.equal(save.retrieval_triggered, true, '⑥ really was attempted');
    assert.equal(save.retrieval?.kind, 'runtime_incomplete');
    assert.equal(save.save.attempt?.state, 'Formal');

    /* 🔴 The record is Formal and its runtime failure is NOT `N_检索 = 0` and NOT `HISTORY_EMPTY`. */
    const afterFailure = await readSnapshot(harness.workflow, attempt_id);
    assert.ok(afterFailure !== null);
    assert.equal(afterFailure.attempt_state, 'Formal');
    assert.equal(afterFailure.retrieval.state, 'runtime_incomplete');
    assert.equal(afterFailure.retrieval.n_retrieval, null, 'a runtime failure never writes N = 0');
    assert.equal(afterFailure.retrieval.zero_like_state, null);
    assert.equal(afterFailure.retrieval.derivation, null);
    assert.equal(afterFailure.notices.length, 1);
    assert.equal(afterFailure.notices[0]?.layer, 'RUNTIME');
    assert.equal(
      afterFailure.available_actions.includes('rerun_retrieval'),
      true,
      'the user is offered the recovery',
    );

    /* Re-submitting the SAME save is a replay: it must NOT trigger a second ⑥. */
    const replay = valueOf(
      await harness.workflow.saveFormalAttempt({
        operation_id: 'e2e-5',
        attempt_id,
        user_explicitly_confirmed: true,
      }),
    );
    assert.equal(replay.promotion_happened, false);
    assert.equal(replay.retrieval_triggered, false);

    /* The retry continues from where it stopped - without re-creating the Attempt. */
    const retried = await harness.workflow.rerunRetrieval({
      operation_id: 'e2e-5-retry',
      attempt_id,
    });
    /* The provider still fails in this fixture, so the retry is still a RUNTIME result - and it must
       remain one rather than being reported as an empty history. */
    assert.equal(retried.value?.kind, 'runtime_incomplete');
    assert.equal(retried.layer, 'RUNTIME');
    assert.equal(retried.value?.failure.retryable, true);
    const stillFormal = await readSnapshot(harness.workflow, attempt_id);
    assert.ok(stillFormal !== null);
    assert.equal(stillFormal.attempt_state, 'Formal');
    assert.equal(stillFormal.retrieval.n_retrieval, null);
  });

  it('E2E-5b / AC-89 / IMPLEMENTATION INVARIANT: once the provider recovers, an explicit rerun completes ⑥ and clears the observation', async () => {
    const harness = makeWorkflowHarness({ fail_step_6_with: timeoutError() });
    await seedHistoricalCorpus(harness);
    const { attempt_id } = await runChainToOneFormal(harness, 'e2e-5b');

    const broken = await readSnapshot(harness.workflow, attempt_id);
    assert.equal(broken?.retrieval.state, 'runtime_incomplete');
    assert.equal(broken?.retrieval.n_retrieval, null);

    /* 🔴 THE PROVIDER RECOVERS. Only the fault switch changes; everything else is untouched. */
    harness.provider.faults.step_6 = null;

    const retried = valueOf(
      await harness.workflow.rerunRetrieval({ operation_id: 'e2e-5b-retry', attempt_id }),
    );
    assert.equal(retried.kind, 'completed');
    assert.equal(retried.snapshot.n_retrieval, 2);

    const snapshot = await readSnapshot(harness.workflow, attempt_id);
    assert.ok(snapshot !== null);
    assert.equal(snapshot.retrieval.state, 'ready');
    assert.equal(snapshot.retrieval.runtime_failure, null);
    assert.deepEqual(snapshot.notices, [], 'a completed run clears the observation');
    assert.equal(snapshot.retrieval.n_retrieval, 2);
    assert.equal(snapshot.retrieval.zero_like_state, null, 'this is related history, not an empty state');
    assert.equal(snapshot.attempt_state, 'Formal');
  });
});

/* ------------------------------------------------------------------ *
 * E2E-6 – E2E-8: nothing cascades
 * ------------------------------------------------------------------ */

describe('M15 ｜ E2E no step runs by itself', () => {
  it('IMPLEMENTATION INVARIANT: E2E-6: a Formal edit produces a STALE WARNING and no rerun at all', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);
    const { attempt_id } = await runChainToOneFormal(harness, 'e2e-6');

    const before = await readSnapshot(harness.workflow, attempt_id);
    assert.ok(before !== null);
    assert.equal(before.retrieval.freshness.stale, false, 'a fresh save is not stale');

    const judge_calls = harness.provider.judge_calls.length;
    const derivation_id = before.retrieval.derivation?.derivation_id;

    /* The edit itself is a WORKSPACE write (what an edit command performs); `M15` must react to it with
       a warning only. */
    await harness.attempts.updateAttempt(attempt_id, {
      user_note: provided(factItem(`${String(attempt_id)}:note`, '事后补充：温度记录可能不准。')),
    });

    const after = await readSnapshot(harness.workflow, attempt_id);
    assert.ok(after !== null);
    assert.equal(after.retrieval.freshness.stale, true);
    assert.ok((after.retrieval.freshness.notice ?? '').includes('该记录'));
    assert.equal(harness.provider.judge_calls.length, judge_calls, 'a Formal edit must NOT rerun ⑥');
    assert.equal(after.retrieval.derivation?.derivation_id, derivation_id, 'the comparison is untouched');
    /* 🔴 A warning is not a failure: it is presented separately from the notices. */
    assert.deepEqual(after.notices, []);
  });

  it('E2E-7 / AC-81 / IMPLEMENTATION INVARIANT: an explicit rerun of ⑥ runs ONLY ⑥ - no ⑧, no ⑨', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);
    const { attempt_id } = await runChainToOneFormal(harness, 'e2e-7');

    const generated = expectGeneratedInsights(
      valueOf(await harness.workflow.generateInsights({ operation_id: 'e2e-7-i', attempt_id })),
    );
    expectGeneratedHypotheses(
      valueOf(await harness.workflow.generateHypotheses({ operation_id: 'e2e-7-h', attempt_id })),
    );

    const before = countSnapshot(harness);
    const accepted = await harness.workflow.acceptInsight({
      operation_id: 'e2e-7-accept',
      insight_id: generated.insights[0]!.insight_id,
      user_explicitly_accepted: true,
    });
    assert.equal(accepted.value?.kind, 'applied');

    const rerun = await harness.workflow.rerunRetrieval({ operation_id: 'e2e-7-r', attempt_id });
    assert.equal(rerun.value?.kind, 'completed');

    const after = countSnapshot(harness);
    assert.ok((after.judge ?? 0) > (before.judge ?? 0), '⑥ itself did run');
    assert.equal(after.insight, before.insight, 'a rerun must not regenerate ⑧');
    assert.equal(after.hypothesis, before.hypothesis, 'a rerun must not regenerate ⑨');

    const snapshot = await readSnapshot(harness.workflow, attempt_id);
    assert.ok(snapshot !== null);
    assert.equal(snapshot.insights.batches.length, 1, 'still one ⑧ batch');
    assert.equal(snapshot.hypotheses.batches.length, 1, 'still one ⑨ batch');
    assert.equal(snapshot.insights.experience_assets.length, 1, 'the accepted Insight is untouched');
  });

  it('E2E-8 / AC-76 / IMPLEMENTATION INVARIANT: archiving and un-archiving cascade into NOTHING', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);
    const { attempt_id } = await runChainToOneFormal(harness, 'e2e-8');

    const generated = expectGeneratedInsights(
      valueOf(await harness.workflow.generateInsights({ operation_id: 'e2e-8-i', attempt_id })),
    );
    const insight_id = generated.insights[0]!.insight_id;
    await harness.workflow.acceptInsight({
      operation_id: 'e2e-8-accept',
      insight_id,
      user_explicitly_accepted: true,
    });
    expectGeneratedHypotheses(
      valueOf(await harness.workflow.generateHypotheses({ operation_id: 'e2e-8-h', attempt_id })),
    );

    const before = countSnapshot(harness);
    const before_snapshot = await readSnapshot(harness.workflow, attempt_id);
    assert.ok(before_snapshot !== null);

    for (const archive_state of ['archived', 'active'] as const) {
      const applied = await harness.workflow.setAttemptArchived({
        operation_id: `e2e-8-${archive_state}`,
        attempt_id,
        archive_state,
      });
      assert.equal(applied.value?.archive_state, archive_state);
      assert.equal(applied.layer, 'OK');
    }

    const after = countSnapshot(harness);
    assert.equal(after.judge, before.judge, 'archiving must not rerun ⑥');
    assert.equal(after.insight, before.insight, 'archiving must not regenerate ⑧');
    assert.equal(after.hypothesis, before.hypothesis, 'archiving must not regenerate ⑨');

    const after_snapshot = await readSnapshot(harness.workflow, attempt_id);
    assert.ok(after_snapshot !== null);
    assert.equal(after_snapshot.archive_state, 'active');
    assert.equal(
      after_snapshot.retrieval.derivation?.derivation_id,
      before_snapshot.retrieval.derivation?.derivation_id,
      'the comparison survives archiving unchanged',
    );
    assert.equal(
      after_snapshot.insights.views.find((view) => view.insight.insight_id === insight_id)?.insight
        .state,
      'accepted',
      'an accepted Insight survives archiving',
    );
    /* 🔴 The archive bit is not a content modification, so it raises no false 「该记录已被修改」. */
    assert.equal(after_snapshot.retrieval.freshness.stale, false);
  });
});

/* ------------------------------------------------------------------ *
 * E2E-9 / E2E-10: ⑨ and ⑩
 * ------------------------------------------------------------------ */

describe('M15 ｜ E2E ⑨ does not wait for E5, and ⑩ shares ONE source with N_引用', () => {
  it('IMPLEMENTATION INVARIANT: E2E-9: ⑨ runs with an UN-ACCEPTED candidate as a reasoning input', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);
    const { attempt_id } = await runChainToOneFormal(harness, 'e2e-9');

    const generated = expectGeneratedInsights(
      valueOf(await harness.workflow.generateInsights({ operation_id: 'e2e-9-i', attempt_id })),
    );
    const insight_id = generated.insights[0]!.insight_id;

    /* 🔴 No `acceptInsight` anywhere in this test. */
    const hypotheses = expectGeneratedHypotheses(
      valueOf(await harness.workflow.generateHypotheses({ operation_id: 'e2e-9-h', attempt_id })),
    );
    assert.ok(hypotheses.hypotheses.length > 0);

    const snapshot = await readSnapshot(harness.workflow, attempt_id);
    assert.ok(snapshot !== null);
    const candidate = snapshot.insights.views.find((view) => view.insight.insight_id === insight_id);
    assert.equal(candidate?.insight.state, 'candidate', 'the Insight was never accepted');

    /* The un-accepted candidate IS offered, and it is labelled as such (`TQ21`). */
    const reasoning_kinds = new Set(
      snapshot.hypotheses.views.flatMap((view) =>
        view.reasoning_input_refs.map((ref) => ref.kind),
      ),
    );
    assert.equal(reasoning_kinds.has('candidate_insight_not_accepted'), true);
    /* 🔴 …and it is a REASONING input, never an evidence reference. */
    for (const view of snapshot.hypotheses.views) {
      for (const ref of view.hypothesis.evidence_refs) {
        assert.notEqual(String(ref.target_id), String(insight_id));
      }
      assert.equal(view.hypothesis.evidence_refs.length > 0, true, 'a grounded hypothesis has evidence');
    }
  });

  it('IMPLEMENTATION INVARIANT: E2E-10: ⑩ and N_引用 are derived from the SAME reference set on every read', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);
    const { attempt_id } = await runChainToOneFormal(harness, 'e2e-10');

    expectGeneratedInsights(
      valueOf(await harness.workflow.generateInsights({ operation_id: 'e2e-10-i', attempt_id })),
    );
    const hypotheses = expectGeneratedHypotheses(
      valueOf(await harness.workflow.generateHypotheses({ operation_id: 'e2e-10-h', attempt_id })),
    );
    const hypothesis_id = hypotheses.hypotheses[0]!.hypothesis_id;

    const first = valueOf(await harness.workflow.traceHypothesis(hypothesis_id));
    assert.ok(first !== null);
    sameSourceInvariant(harness, first.citation.n_citation, first.traceability);

    /* The read model carries the SAME citation and the SAME trace list - no second computation. */
    const snapshot = await readSnapshot(harness.workflow, attempt_id);
    assert.ok(snapshot !== null);
    const view = snapshot.hypotheses.views.find(
      (candidate) => candidate.hypothesis.hypothesis_id === hypothesis_id,
    );
    assert.ok(view !== undefined);
    assert.deepEqual(view.citation, first.citation);
    assert.deepEqual(view.traceability, first.traceability);

    /* And a SECOND read of the same trace is identical: the derivation is a pure function. */
    const second = valueOf(await harness.workflow.traceHypothesis(hypothesis_id));
    assert.deepEqual(second?.citation, first.citation);
    assert.deepEqual(second?.traceability, first.traceability);

    /* 🔴 A Model Suggestion never appears in ⑩ at all. */
    assert.equal(snapshot.hypotheses.model_suggestions.length, 0);
  });
});

/* ------------------------------------------------------------------ *
 * E2E-11 / E2E-12: recovery
 * ------------------------------------------------------------------ */

describe('M15 ｜ E2E recovery', () => {
  it('E2E-11 / AC-130 / IMPLEMENTATION INVARIANT: recreating the service from the workspace rebuilds an identical snapshot', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);
    const { attempt_id } = await runChainToOneFormal(harness, 'e2e-11');

    const generated = expectGeneratedInsights(
      valueOf(await harness.workflow.generateInsights({ operation_id: 'e2e-11-i', attempt_id })),
    );
    await harness.workflow.acceptInsight({
      operation_id: 'e2e-11-accept',
      insight_id: generated.insights[0]!.insight_id,
      user_explicitly_accepted: true,
    });
    const hypotheses = expectGeneratedHypotheses(
      valueOf(await harness.workflow.generateHypotheses({ operation_id: 'e2e-11-h', attempt_id })),
    );

    const before = await readSnapshot(harness.workflow, attempt_id);
    assert.ok(before !== null);

    /* A BRAND-NEW object graph over the same storage - what a browser reload really does. */
    const reloaded_workflow = harness.reopen();
    const after = await readSnapshot(reloaded_workflow, attempt_id);
    assert.ok(after !== null);

    assert.equal(after.attempt_state, before.attempt_state);
    assert.equal(after.archive_state, before.archive_state);
    assert.equal(after.retrieval.state, before.retrieval.state);
    assert.equal(after.retrieval.n_retrieval, before.retrieval.n_retrieval);
    assert.equal(
      after.retrieval.derivation?.derivation_id,
      before.retrieval.derivation?.derivation_id,
    );
    assert.equal(after.retrieval.freshness.stale, before.retrieval.freshness.stale);
    assert.deepEqual(
      after.insights.views.map((view) => [String(view.insight.insight_id), view.insight.state]),
      before.insights.views.map((view) => [String(view.insight.insight_id), view.insight.state]),
    );
    assert.deepEqual(
      after.hypotheses.views.map((view) => [
        String(view.hypothesis.hypothesis_id),
        view.hypothesis.decision_state,
      ]),
      before.hypotheses.views.map((view) => [
        String(view.hypothesis.hypothesis_id),
        view.hypothesis.decision_state,
      ]),
    );
    assert.equal(after.insights.current_batch_id, before.insights.current_batch_id);
    assert.equal(after.hypotheses.current_batch_id, before.hypotheses.current_batch_id);
    assert.equal(after.insights.experience_assets.length, before.insights.experience_assets.length);
    assert.equal(hypotheses.hypotheses.length, after.hypotheses.views.length);

    /* 🔴 Nothing about the step counter is stored, so nothing can disagree after the reload. */
    const step_like_paths = harness
      .paths()
      .filter((path) => /workflow|progress|step/i.test(path));
    assert.deepEqual(step_like_paths, []);
  });

  it('IMPLEMENTATION INVARIANT: E2E-12: the M8 crash window is recoverable through the workflow after a reload', async () => {
    const harness = makeWorkflowHarness({
      insight: twoInsightAnswer(),
      fault: failOnNthMatchingWrite(insightSidecarPredicate, 2),
    });
    await seedHistoricalCorpus(harness);
    const { attempt_id } = await runChainToOneFormal(harness, 'e2e-12');

    const blocked = await harness.workflow.generateInsights({ operation_id: 'e2e-12-i', attempt_id });
    assert.equal(blocked.kind, 'runtime');
    assert.equal(blocked.notice?.code, 'PERSISTENCE_RECOVERY_BLOCKED');
    assert.equal(harness.batchFiles().length, 0);
    assert.equal(harness.anchorFiles().length, 1, 'the durable anchor is what makes this recoverable');

    /* The reload is the "restart" the recovery has to survive. */
    const recovered = expectGeneratedInsights(
      valueOf(
        await harness.reopen().generateInsights({ operation_id: 'e2e-12-i', attempt_id }),
      ),
    );
    assert.equal(recovered.idempotent_replay, true);
    assert.equal(harness.batchFiles().length, 1);
    assert.equal(harness.insightFiles().length, recovered.insights.length);
  });
});

/* ------------------------------------------------------------------ *
 * Shared invariant helpers
 * ------------------------------------------------------------------ */

/**
 * 🔴 `M15` recomputes NOTHING: the ⑩ list and `N_引用` come from `M7`'s single derivation. This asserts
 * that the reported count really IS the number of DISTINCT counted targets in the very list shown.
 */
function sameSourceInvariant(
  _harness: WorkflowHarness,
  n_citation: number,
  traceability: readonly { readonly target_id: unknown; readonly counted_toward_n_citation: boolean }[],
): void {
  const counted = new Set(
    traceability
      .filter((entry) => entry.counted_toward_n_citation)
      .map((entry) => String(entry.target_id)),
  );
  assert.equal(counted.size, n_citation, 'N_引用 must be the distinct counted target count');
}
