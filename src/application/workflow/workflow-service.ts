/**
 * S01 ｜ `M15` the `D9` end-to-end orchestration service - the ONE workflow a UI calls.
 *
 * Contract: §9 ①–⑩ and §9.1 (idempotency); `D-022` (no automatic generation, ever); `D-045`
 * (`Formal` save ⇒ step ⑥, once); `D-051` (batches, not versions); contract §10.1 layers 1 / 2;
 * HANDOFF §4 / §6.
 *
 * ── WHAT THIS SERVICE IS ────────────────────────────────────────────────────────────
 * 🔴 A COMPOSER. Every `D9` step delegates to the module that OWNS it. There is exactly one
 *    retrieval (`M6`), one comparison, one `EvidenceRef` constructor (`M7`), one `Insight` state
 *    machine (`M8`) and one `Hypothesis` state machine (`M9`) in this repository, and `M15` adds
 *    none of them.
 * 🔴 THE FOUR THINGS IT REALLY ADDS:
 *    ① the ONE automatic trigger - a SUCCESSFUL `Draft → Formal` promotion runs step ⑥ immediately,
 *       with no extra user action and never a second time for the same save;
 *    ② the cross-module recovery boundary - step ⑥ may fail at runtime while the `Formal` record
 *       stays saved, and a retry continues from there instead of re-creating anything;
 *    ③ the workspace / runtime error boundary - a thrown storage or browser-access failure becomes a
 *       fixed, user-safe notice, and `original_error` never reaches a view model;
 *    ④ the single read model that the UI renders.
 * 🔴 NO CASCADE, EVER: an explicit rerun of ⑥ does not regenerate ⑧ or ⑨; an archive does not rerun
 *    anything; a `Formal` edit produces a stale WARNING and nothing else.
 * 🔴 NO BACKGROUND WORK: no timer, no watcher, no queue, no "resume later". Every step runs inside the
 *    command that asked for it, and a blocked step is reported to the user instead of retried
 *    silently (`D-022`).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O beyond the injected ports.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { Attempt } from '../../domain/types/attempt.js';
import type { RetrievalRuntimeFailure } from '../../retrieval/compare/types.js';
import type { AttemptCaptureService } from '../capture/capture-service.js';
import { noticeForThrownError, workflowNotice } from './errors.js';
import { childOperationId } from './operation-ids.js';
import {
  OK_OUTCOME,
  classifyAbandon,
  classifyAction,
  classifyBeginCapture,
  classifyCausePersistence,
  classifyConfirmation,
  classifyFollowUp,
  classifyFormalSave,
  classifyHypothesisGeneration,
  classifyInsightGeneration,
  classifyRetrieval,
} from './outcomes.js';
import type { OutcomeClassification } from './outcomes.js';
import { createWorkflowReadService } from './workspace-read.js';
import type {
  AcceptHypothesisWorkflowCommand,
  AcceptInsightWorkflowCommand,
  AbandonFollowUpWorkflowCommand,
  ApplyConfirmationWorkflowCommand,
  AskFollowUpWorkflowCommand,
  BeginCaptureWorkflowCommand,
  D9WorkflowService,
  D9WorkflowServiceDeps,
  D9WorkflowSnapshot,
  DecideHypothesisCriterionWorkflowCommand,
  EditHypothesisCriteriaWorkflowCommand,
  EditInsightContentWorkflowCommand,
  EditInsightMetaWorkflowCommand,
  FormalSaveWorkflowResult,
  GenerateHypothesesCommand,
  GenerateInsightsCommand,
  HypothesisDecisionCommand,
  InsightDecisionCommand,
  PersistCausesWorkflowCommand,
  RerunRetrievalCommand,
  SaveFormalWorkflowCommand,
  SaveModelSuggestionWorkflowCommand,
  SetAttemptArchivedCommand,
  WorkflowNotice,
  WorkflowStepResult,
} from './types.js';

export function createD9WorkflowService(deps: D9WorkflowServiceDeps): D9WorkflowService {
  const { ports } = deps;

  /**
   * The step ⑥ runtime failure each record's LAST run produced, as observed by THIS instance.
   *
   * 🔴 AN OBSERVATION, NOT BUSINESS STATE. `M6` deliberately writes nothing on a runtime failure, so
   *    there is nothing durable to read back and `M15` must not invent a stored status field (task §5,
   *    §8). After a reload with nothing stored the state is `not_available` - which is a truthful
   *    description and is NOT `N_检索 = 0` and NOT `HISTORY_EMPTY`.
   */
  const retrieval_failures = new Map<string, RetrievalRuntimeFailure>();

  /* ---------------------------------------------------------------- *
   * 1. The guarded delegation seam
   * ---------------------------------------------------------------- */

  /**
   * Runs a command body and converts a THROWN value into a safe `RUNTIME` notice.
   *
   * 🔴 This is the workspace error boundary (HANDOFF §6). `WorkspaceStorageError` and
   *    `BrowserWorkspaceAccessError` are both handled here - the second one structurally, because the
   *    framework-neutral layer may not import the browser scope.
   * 🔴 The thrown value goes ONLY to the injected diagnostics sink.
   */
  async function guarded<T>(
    stage: string,
    body: () => Promise<WorkflowStepResult<T>>,
  ): Promise<WorkflowStepResult<T>> {
    try {
      return await body();
    } catch (error) {
      deps.on_internal_error?.({ stage, original_error: error });
      return {
        kind: 'runtime',
        layer: 'RUNTIME',
        value: null,
        notice: noticeForThrownError(error),
      };
    }
  }

  /** Wraps a delegated module outcome with its classification. The outcome itself is kept verbatim. */
  function delegated<T>(classification: OutcomeClassification, value: T): WorkflowStepResult<T> {
    return {
      kind: classification.kind,
      layer: classification.layer,
      value,
      notice: classification.notice,
    };
  }

  /** A workflow-level refusal that never reached a module. */
  function refused<T>(notice: WorkflowNotice): WorkflowStepResult<T> {
    return {
      kind: notice.layer === 'GATE' ? 'gate' : 'runtime',
      layer: notice.layer,
      value: null,
      notice,
    };
  }

  /* ---------------------------------------------------------------- *
   * 2. Step ⑥ - the one place retrieval is run
   * ---------------------------------------------------------------- */

  /**
   * Runs step ⑥ and records the observation.
   *
   * 🔴 Called from EXACTLY two places: the automatic trigger after a successful `Formal` promotion,
   *    and the explicit rerun. Nothing else in this file reaches `runRetrievalForFormalAttempt`, so
   *    "retrieval runs only when the user's action requires it" is a property of the call graph.
   */
  async function runRetrieval(attempt_id: ObjectId<'ATT'>) {
    const outcome = await ports.retrieval.runRetrievalForFormalAttempt({
      source_attempt_id: attempt_id,
    });
    if (outcome.kind === 'runtime_incomplete') {
      retrieval_failures.set(attempt_id, outcome.failure);
    } else {
      /*
       * 🔴 A completed run - INCLUDING both empty states - clears the observation: the record is no
       *    longer 「runtime incomplete」, and `HISTORY_EMPTY` / `NO_RELATED_HISTORY` are reported
       *    through `derivation.status`, never through a notice (§27).
       */
      retrieval_failures.delete(attempt_id);
    }
    return outcome;
  }

  /* ---------------------------------------------------------------- *
   * 3. The read model
   * ---------------------------------------------------------------- */

  /*
   * 🔴 S01-06B: the read assembly lives in `workspace-read.ts`, shared with the provider-less
   *    workspace reader. This service supplies ONLY its own step ⑥ runtime observation, so the
   *    snapshot it returns and the one a browse returns are the SAME code over the SAME record.
   */
  const reads = createWorkflowReadService({
    ports,
    retrieval_failure_of: (attempt_id) => retrieval_failures.get(attempt_id) ?? null,
    ...(deps.on_internal_error === undefined ? {} : { on_internal_error: deps.on_internal_error }),
  });

  /* ---------------------------------------------------------------- *
   * 4. Steps ①–⑤
   * ---------------------------------------------------------------- */

  return {
    readWorkflow: (attempt_id) => reads.readWorkflow(attempt_id),

    beginCapture: (command: BeginCaptureWorkflowCommand) =>
      guarded('begin-capture', async () => {
        const outcome = await ports.capture.beginCapture({
          operation_id: childOperationId(command.operation_id, 'capture'),
          raw_text: command.raw_text,
          ...(command.project_id === undefined ? {} : { project_id: command.project_id }),
        });
        return delegated(classifyBeginCapture(outcome), outcome);
      }),

    applyStructuredConfirmation: (command: ApplyConfirmationWorkflowCommand) =>
      guarded('apply-structured-confirmation', async () => {
        /*
         * 🔴 The workflow OWNS the child id: the caller's `operation_id` is re-keyed to the stable
         *    per-step id, so a retry of the same user action is recognised as a replay by `M4`.
         */
        const outcome = await ports.capture.applyStructuredConfirmation({
          ...command.confirmation,
          operation_id: childOperationId(command.operation_id, 'confirmation'),
        });
        return delegated(classifyConfirmation(outcome.result), outcome);
      }),

    askFollowUpQuestion: (command: AskFollowUpWorkflowCommand) =>
      guarded('ask-follow-up-question', async () => {
        const outcome = await ports.capture.askFollowUpQuestion({
          operation_id: childOperationId(command.operation_id, 'follow-up-question'),
          attempt_id: command.attempt_id,
          question_text: command.question_text,
          target_gap: command.target_gap,
        });
        return delegated(classifyFollowUp(outcome), outcome);
      }),

    abandonFollowUpGap: (command: AbandonFollowUpWorkflowCommand) =>
      guarded('abandon-follow-up-gap', async () => {
        const outcome = await ports.capture.abandonFollowUpGap({
          operation_id: childOperationId(command.operation_id, 'follow-up-abandon'),
          attempt_id: command.attempt_id,
          gap: command.gap,
        });
        return delegated(classifyAbandon(outcome), outcome);
      }),

    /**
     * Step ④ - read-only. 🔴 It returns a PROPOSAL and writes nothing (`§9 ④`); a candidate cause
     *    becomes part of the record only through the explicit `persistCandidateCauses` below.
     */
    analyseCandidateCauses: (attempt_id: ObjectId<'ATT'>) =>
      guarded('analyse-candidate-causes', async () => {
        const outcome = await ports.capture.analyseCandidateCauses(attempt_id);
        if (outcome === null) {
          return refused<Awaited<ReturnType<AttemptCaptureService['analyseCandidateCauses']>>>(
            workflowNotice('ATTEMPT_NOT_FOUND', null),
          );
        }
        /*
         * 🔴 A step ④ RUNTIME failure is reported as a runtime layer, not as "no causes exist":
         *    「没有推断出原因」 and 「推断没有跑完」 are different statements (`AC-91` / `AC-92`).
         */
        if (outcome.kind === 'runtime_failure') {
          return {
            kind: 'runtime',
            layer: 'RUNTIME',
            value: outcome,
            notice: workflowNotice('PROVIDER_FAILURE', { kind: 'none' }),
          };
        }
        return delegated(OK_OUTCOME, outcome);
      }),

    persistCandidateCauses: (command: PersistCausesWorkflowCommand) =>
      guarded('persist-candidate-causes', async () => {
        const outcome = await ports.capture.persistCandidateCauses({
          operation_id: childOperationId(command.operation_id, 'cause-persistence'),
          decision: command.decision,
        });
        return delegated(classifyCausePersistence(outcome), outcome);
      }),

    /**
     * Step ⑤ - and the ONE automatic step ⑥ (task §7).
     *
     * 🔴 THE TRIGGER CONDITION IS STRUCTURAL, NOT A FLAG: step ⑥ runs only when the state BEFORE this
     *    call was `Draft`, the state AFTER it is `Formal` and the save really reported `ready`.
     *    Therefore:
     *      · a `Draft` save (no promotion) never triggers ⑥;
     *      · a refused / gate-blocked save never triggers ⑥ and leaves the record untouched;
     *      · REPEATING the same save operation never triggers a second ⑥, even after the service was
     *        recreated (the `before` read is taken from the workspace, not from a ledger);
     *      · no user action is inserted between the save and the retrieval (`D-045`).
     * 🔴 Step ⑥ is NOT rolled back by a later failure: the `Formal` record stays saved, and the
     *    runtime failure is reported as a retryable `RUNTIME` result (§8).
     */
    saveFormalAttempt: (command: SaveFormalWorkflowCommand) =>
      guarded('save-formal-attempt', async () => {
        const before = await ports.attempts.readAttempt(command.attempt_id);
        const save = await ports.capture.saveFormalAttempt({
          operation_id: childOperationId(command.operation_id, 'formal-save'),
          attempt_id: command.attempt_id,
          user_explicitly_confirmed: command.user_explicitly_confirmed,
          ...(command.candidate_causes === undefined
            ? {}
            : { candidate_causes: command.candidate_causes }),
        });

        const promotion_happened =
          before !== null &&
          before.state === 'Draft' &&
          save.formalization.decision.outcome === 'ready' &&
          save.attempt !== null &&
          save.attempt.state === 'Formal';

        const retrieval = promotion_happened ? await runRetrieval(command.attempt_id) : null;
        const value: FormalSaveWorkflowResult = {
          save,
          promotion_happened,
          retrieval_triggered: promotion_happened,
          retrieval,
        };

        const classification = classifyFormalSave(save);
        if (classification.layer !== 'OK') {
          return delegated(classification, value);
        }
        /*
         * 🔴 §8: the record IS `Formal`, but ⑥ could not finish. The save succeeded, so we must not
         *    report a plain failure - and the retrieval must not be reported as an empty history
         *    either. The result carries BOTH facts.
         */
        if (retrieval !== null && retrieval.kind === 'runtime_incomplete') {
          return {
            kind: 'runtime',
            layer: 'RUNTIME',
            value,
            notice: workflowNotice('RETRIEVAL_RUNTIME_INCOMPLETE', {
              kind: 'rerun_retrieval',
              attempt_id: command.attempt_id,
            }),
          };
        }
        return delegated(classification, value);
      }),

    /* -------------------------------------------------------------- *
     * 5. Step ⑥ - the explicit rerun
     * -------------------------------------------------------------- */

    /**
     * The user's explicit 「重新检索」.
     *
     * 🔴 REPLACES the current derivation and does NOTHING ELSE: no `Insight` regeneration, no
     *    `Hypothesis` regeneration, no state change on any older accepted object (§11).
     */
    rerunRetrieval: (command: RerunRetrievalCommand) =>
      guarded('rerun-retrieval', async () => {
        const outcome = await runRetrieval(command.attempt_id);
        return delegated(classifyRetrieval(outcome, command.attempt_id), outcome);
      }),

    /* -------------------------------------------------------------- *
     * 6. Step ⑧ - explicit generation and the lifecycle routing
     * -------------------------------------------------------------- */

    generateInsights: (command: GenerateInsightsCommand) =>
      guarded('generate-insights', async () => {
        const outcome = await ports.insights.generateCandidateInsights({
          operation_id: childOperationId(command.operation_id, 'insight-generation'),
          source_attempt_id: command.attempt_id,
        });
        return delegated(classifyInsightGeneration(outcome, command.attempt_id), outcome);
      }),

    /**
     * An EXPLICIT regeneration - a NEW user operation, so it carries a NEW `operation_id`.
     *
     * 🔴 Reusing the ORIGINAL operation id would be a REPLAY by definition (`M8`'s durable anchor
     *    returns the original batch unchanged), which is exactly why the caller must send the id of
     *    the new user action.
     * 🔴 The previous batch and every older `Insight` - including an older `accepted` one - are
     *    preserved untouched (`D-051`). Nothing is ordered by strength and nothing is superseded.
     */
    regenerateInsights: (command: GenerateInsightsCommand) =>
      guarded('regenerate-insights', async () => {
        const outcome = await ports.insights.regenerateCandidateInsights({
          operation_id: childOperationId(command.operation_id, 'insight-generation'),
          source_attempt_id: command.attempt_id,
        });
        return delegated(classifyInsightGeneration(outcome, command.attempt_id), outcome);
      }),

    acceptInsight: (command: AcceptInsightWorkflowCommand) =>
      guarded('accept-insight', async () => {
        const outcome = await ports.insights.acceptInsight({
          operation_id: childOperationId(
            command.operation_id,
            'insight-action',
            String(command.insight_id),
          ),
          insight_id: command.insight_id,
          user_explicitly_accepted: command.user_explicitly_accepted,
        });
        return delegated(classifyAction(outcome), outcome);
      }),

    rejectInsight: (command: InsightDecisionCommand) =>
      guarded('reject-insight', async () => {
        const outcome = await ports.insights.rejectInsight({
          operation_id: childOperationId(
            command.operation_id,
            'insight-action',
            String(command.insight_id),
          ),
          insight_id: command.insight_id,
        });
        return delegated(classifyAction(outcome), outcome);
      }),

    revokeInsightAcceptance: (command: InsightDecisionCommand) =>
      guarded('revoke-insight-acceptance', async () => {
        const outcome = await ports.insights.revokeAcceptance({
          operation_id: childOperationId(
            command.operation_id,
            'insight-action',
            String(command.insight_id),
          ),
          insight_id: command.insight_id,
        });
        return delegated(classifyAction(outcome), outcome);
      }),

    editInsightContent: (command: EditInsightContentWorkflowCommand) =>
      guarded('edit-insight-content', async () => {
        const outcome = await ports.insights.editInsightContent({
          operation_id: childOperationId(
            command.operation_id,
            'insight-action',
            String(command.insight_id),
          ),
          insight_id: command.insight_id,
          ...(command.proposition === undefined ? {} : { proposition: command.proposition }),
          ...(command.applicable_scope === undefined
            ? {}
            : { applicable_scope: command.applicable_scope }),
          ...(command.judgment_basis === undefined
            ? {}
            : { judgment_basis: command.judgment_basis }),
          ...(command.evidence_selections === undefined
            ? {}
            : { evidence_selections: command.evidence_selections }),
        });
        return delegated(classifyAction(outcome), outcome);
      }),

    editInsightMeta: (command: EditInsightMetaWorkflowCommand) =>
      guarded('edit-insight-meta', async () => {
        const outcome = await ports.insights.editInsightMeta({
          operation_id: childOperationId(
            command.operation_id,
            'insight-action',
            String(command.insight_id),
          ),
          insight_id: command.insight_id,
          ...(command.title === undefined ? {} : { title: command.title }),
          ...(command.display_order === undefined
            ? {}
            : { display_order: command.display_order }),
        });
        return delegated(classifyAction(outcome), outcome);
      }),

    /* -------------------------------------------------------------- *
     * 7. Steps ⑨⑩ - explicit generation, decisions and the trace
     * -------------------------------------------------------------- */

    /**
     * Step ⑨.
     *
     * 🔴 It does NOT wait for step ⑧'s `E5`: an un-accepted candidate enters as a REASONING INPUT,
     *    never as evidence (`D-030` / `TQ21`). `M15` therefore does not check `Insight` states before
     *    delegating - doing so would be exactly the waiting the decision forbids.
     */
    generateHypotheses: (command: GenerateHypothesesCommand) =>
      guarded('generate-hypotheses', async () => {
        const outcome = await ports.hypotheses.generateHypotheses({
          operation_id: childOperationId(command.operation_id, 'hypothesis-generation'),
          source_attempt_id: command.attempt_id,
        });
        return delegated(classifyHypothesisGeneration(outcome, command.attempt_id), outcome);
      }),

    regenerateHypotheses: (command: GenerateHypothesesCommand) =>
      guarded('regenerate-hypotheses', async () => {
        const outcome = await ports.hypotheses.regenerateHypotheses({
          operation_id: childOperationId(command.operation_id, 'hypothesis-generation'),
          source_attempt_id: command.attempt_id,
        });
        return delegated(classifyHypothesisGeneration(outcome, command.attempt_id), outcome);
      }),

    acceptHypothesis: (command: AcceptHypothesisWorkflowCommand) =>
      guarded('accept-hypothesis', async () => {
        const outcome = await ports.hypotheses.acceptHypothesis({
          operation_id: childOperationId(
            command.operation_id,
            'hypothesis-action',
            String(command.hypothesis_id),
          ),
          hypothesis_id: command.hypothesis_id,
          user_explicitly_accepted: command.user_explicitly_accepted,
        });
        return delegated(classifyAction(outcome), outcome);
      }),

    rejectHypothesis: (command: HypothesisDecisionCommand) =>
      guarded('reject-hypothesis', async () => {
        const outcome = await ports.hypotheses.rejectHypothesis({
          operation_id: childOperationId(
            command.operation_id,
            'hypothesis-action',
            String(command.hypothesis_id),
          ),
          hypothesis_id: command.hypothesis_id,
        });
        return delegated(classifyAction(outcome), outcome);
      }),

    /**
     * Retains the CONTENT of a `Model Suggestion`.
     * 🔴 The SAVE slot only: `M9`'s patch carries no `decision_state`, so saving can never accept
     *    (`D-042` / AC-68). `M15` adds no check of its own.
     */
    saveModelSuggestion: (command: SaveModelSuggestionWorkflowCommand) =>
      guarded('save-model-suggestion', async () => {
        const outcome = await ports.hypotheses.saveModelSuggestion({
          operation_id: childOperationId(
            command.operation_id,
            'hypothesis-action',
            String(command.hypothesis_id),
          ),
          hypothesis_id: command.hypothesis_id,
          saved: command.saved,
        });
        return delegated(classifyAction(outcome), outcome);
      }),

    /** ⑥⑦⑧ user `Fact` overlay. 🔴 ①②③④⑤ stay read-only: `M9`'s command cannot even name them. */
    editHypothesisCriteria: (command: EditHypothesisCriteriaWorkflowCommand) =>
      guarded('edit-hypothesis-criteria', async () => {
        const outcome = await ports.hypotheses.editHypothesisCriteria({
          operation_id: childOperationId(
            command.operation_id,
            'hypothesis-action',
            String(command.hypothesis_id),
          ),
          hypothesis_id: command.hypothesis_id,
          user_items: command.user_items,
        });
        return delegated(classifyAction(outcome), outcome);
      }),

    /**
     * Decides ONE AI-proposed criterion.
     * 🔴 The item keeps `source_type = 'Inference'` forever; the workflow never promotes an inference
     *    into a `Fact` and never auto-accepts anything (`§14`).
     */
    decideHypothesisCriterion: (command: DecideHypothesisCriterionWorkflowCommand) =>
      guarded('decide-hypothesis-criterion', async () => {
        const outcome = await ports.hypotheses.decideHypothesisCriterion({
          operation_id: childOperationId(
            command.operation_id,
            'hypothesis-action',
            `${String(command.hypothesis_id)}#${command.content_item_id}`,
          ),
          hypothesis_id: command.hypothesis_id,
          content_item_id: command.content_item_id,
          decision_state: command.decision_state,
        });
        return delegated(classifyAction(outcome), outcome);
      }),

    /**
     * Step ⑩ on its own.
     *
     * 🔴 `M15` computes NOTHING here: the trace list and `N_引用` come from `M9`, which derives both
     *    from the SAME stored reference set on every call, so the count and the list can never
     *    disagree. The delegation goes to the SHARED read layer (S01-06B), so the provider-less
     *    workspace reader returns exactly the same trace and the same notice.
     */
    traceHypothesis: (hypothesis_id: ObjectId<'HYP'>) => reads.traceHypothesis(hypothesis_id),

    /* -------------------------------------------------------------- *
     * 8. Archive / unarchive
     * -------------------------------------------------------------- */

    /**
     * The archive bit (contract §7.2: revocable, never a delete).
     *
     * 🔴 NO CASCADE: archiving does not rerun ⑥, does not regenerate ⑧ or ⑨ and never deletes an
     *    existing reference. Existing `EvidenceRef`s keep resolving, and 「来源已归档」 continues to be
     *    derived DYNAMICALLY from the target's current `archive_state` by `M7` (task §10).
     * 🔴 `updated_at` is deliberately CARRIED OVER unchanged: the archive bit is not a content
     *    modification, so letting it move `updated_at` would make every archived record look like a
     *    modified one and raise a false 「该记录已被修改」 warning about its comparison.
     */
    setAttemptArchived: (command: SetAttemptArchivedCommand) =>
      guarded('set-attempt-archived', async () => {
        const before = await ports.attempts.readAttempt(command.attempt_id);
        if (before === null) {
          return refused(workflowNotice('ATTEMPT_NOT_FOUND', null));
        }
        const updated = await ports.attempts.updateAttempt(command.attempt_id, {
          archive_state: command.archive_state,
          updated_at: before.updated_at,
        });
        return delegated(OK_OUTCOME, updated);
      }),
  };
}

/** Exposed for diagnostics / tests: the observation map is per-service and never persisted. */
export type RetrievalFailureObservation = ReadonlyMap<string, RetrievalRuntimeFailure>;

/** Re-exported so a caller can type a snapshot without importing the read-model module. */
export type { D9WorkflowSnapshot, Attempt };
