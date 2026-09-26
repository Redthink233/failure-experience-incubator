/**
 * S01-06 ｜ The ports the App Shell talks to - split into the READ port and the COMMAND port.
 *
 * 🔴 WHY A NARROW PORT RATHER THAN `D9WorkflowService` DIRECTLY:
 *    (a) it is what makes the UI testable without a real browser - the wiring specs inject a double
 *        or a real `M15` over `InMemoryWorkspaceStorage` with a fake provider;
 *    (b) it documents, in one place, EXACTLY which commands the interface is allowed to reach. A
 *        member that is not listed here cannot be called from a component, so "the UI grew a new
 *        capability by accident" becomes a compile error instead of a code review.
 * 🔴 EVERY SIGNATURE IS `Pick`ED FROM THE FROZEN INTERFACE. Nothing is retyped, so a port can never
 *    drift from `D9WorkflowService` - and adding a member to a port cannot change the service.
 *
 * ── S01-06B: WHY THERE ARE NOW TWO PORTS ─────────────────────────────────────────────
 * 🔴 `UiReadPort` answers only 「工作区里有什么、这一条现在是什么状态、旧依据长什么样」. It is available as
 *    soon as a directory is authorized, because NOTHING it can do needs a model (`S01-06-D1`).
 * 🔴 `UiCommandPort` is the `D9` command surface. It is only reachable once a provider composition
 *    succeeded, because every command on it may need a model.
 * 🔴 THE SPLIT IS STRUCTURAL, NOT A FLAG: a component holding a `UiReadPort` has no command to call,
 *    so "browse mode accidentally ran a generation" is not expressible rather than merely forbidden.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO I/O of its own.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type {
  D9WorkflowService,
  WorkflowReadResult,
  WorkflowStepResult,
} from '../../application/workflow/types.js';
import type {
  WorkflowAttemptIndex,
  WorkflowAttemptSummary,
} from '../../application/workflow/attempt-summaries.js';
import type { WorkflowReadService } from '../../application/workflow/workspace-read.js';
import type { HypothesisTraceView } from '../../application/hypothesis/types.js';
import type {
  CauseDecisionRequest,
  CauseDecisionResult,
} from '../../application/capture/cause-analysis.js';

/**
 * The provider-independent read surface.
 *
 * 🔴 It is satisfied by BOTH the full `D9WorkflowService` and the provider-less workspace reader, so
 *    the App Shell reads the same way in both modes - and, because both derive from the same
 *    persisted objects, it sees the same data.
 */
export interface UiReadPort {
  readWorkflow(attempt_id: ObjectId<'ATT'>): Promise<WorkflowReadResult>;
  /** The rail's only read. `M15`'s attempt-list extension (S01-06 §16). */
  listWorkflowAttempts(): Promise<readonly WorkflowAttemptSummary[]>;
  /**
   * Step ⑩ over EXISTING persisted data.
   *
   * 🔴 It belongs to the READ port on purpose: 「查看旧依据」 must stay available with no model
   *    configured, and it never recomputes an existing reference (S01-06B).
   */
  traceHypothesis(
    hypothesis_id: ObjectId<'HYP'>,
  ): Promise<WorkflowStepResult<HypothesisTraceView | null>>;
}

/** The `D9` command surface. 🔴 Every member may need a model, so it needs a legal provider. */
export type UiCommandPort = Pick<
  D9WorkflowService,
  | 'beginCapture'
  | 'applyStructuredConfirmation'
  | 'askFollowUpQuestion'
  | 'abandonFollowUpGap'
  | 'analyseCandidateCauses'
  | 'persistCandidateCauses'
  | 'saveFormalAttempt'
  | 'rerunRetrieval'
  | 'generateInsights'
  | 'acceptInsight'
  | 'rejectInsight'
  | 'revokeInsightAcceptance'
  | 'editInsightContent'
  | 'generateHypotheses'
  | 'acceptHypothesis'
  | 'rejectHypothesis'
  | 'saveModelSuggestion'
  | 'editHypothesisCriteria'
  | 'decideHypothesisCriterion'
  | 'setAttemptArchived'
> & {
  /**
   * The PURE cause-decision helper, delegated to `M4`/`M5`.
   *
   * 🔴 It decides nothing itself - it is the module's own rule applied to the user's answers, and the
   *    returned decision is what a later `saveFormalAttempt` persists. Wiring it here keeps the
   *    "which cause is accepted" rule inside the module that owns it (S01-06 §22 / S5-7).
   */
  decideCandidateCauses(request: CauseDecisionRequest): CauseDecisionResult;
};

/** Both halves. The UI session holds the READ port always and the COMMAND port only when composed. */
export type UiWorkflowPort = UiReadPort & UiCommandPort;

/**
 * Binds the provider-independent read surface.
 *
 * 🔴 It accepts EITHER a full workflow or a provider-less reader: both expose the same read members,
 *    which is what makes the session's read route mode-independent.
 * 🔴 Every member is an explicit arrow function, so no method is ever handed out unbound.
 */
export function createUiReadPort(input: {
  readonly reads: WorkflowReadService;
  readonly index: WorkflowAttemptIndex;
}): UiReadPort {
  const { reads, index } = input;
  return {
    listWorkflowAttempts: () => index.listWorkflowAttempts(),
    readWorkflow: (attempt_id) => reads.readWorkflow(attempt_id),
    traceHypothesis: (hypothesis_id) => reads.traceHypothesis(hypothesis_id),
  };
}

/**
 * Binds a composed workflow and its attempt index to the FULL port.
 *
 * 🔴 Every member is an explicit arrow function, so no method is ever handed out unbound and no
 *    `this` can be lost between the service object and a component.
 */
export function createUiWorkflowPort(input: {
  readonly workflow: D9WorkflowService;
  readonly index: WorkflowAttemptIndex;
  readonly capture: { decideCandidateCauses(request: CauseDecisionRequest): CauseDecisionResult };
}): UiWorkflowPort {
  const { workflow, index, capture } = input;
  return {
    listWorkflowAttempts: () => index.listWorkflowAttempts(),
    readWorkflow: (attempt_id) => workflow.readWorkflow(attempt_id),
    traceHypothesis: (hypothesis_id) => workflow.traceHypothesis(hypothesis_id),
    beginCapture: (command) => workflow.beginCapture(command),
    applyStructuredConfirmation: (command) => workflow.applyStructuredConfirmation(command),
    askFollowUpQuestion: (command) => workflow.askFollowUpQuestion(command),
    abandonFollowUpGap: (command) => workflow.abandonFollowUpGap(command),
    analyseCandidateCauses: (attempt_id) => workflow.analyseCandidateCauses(attempt_id),
    persistCandidateCauses: (command) => workflow.persistCandidateCauses(command),
    saveFormalAttempt: (command) => workflow.saveFormalAttempt(command),
    rerunRetrieval: (command) => workflow.rerunRetrieval(command),
    generateInsights: (command) => workflow.generateInsights(command),
    acceptInsight: (command) => workflow.acceptInsight(command),
    rejectInsight: (command) => workflow.rejectInsight(command),
    revokeInsightAcceptance: (command) => workflow.revokeInsightAcceptance(command),
    editInsightContent: (command) => workflow.editInsightContent(command),
    generateHypotheses: (command) => workflow.generateHypotheses(command),
    acceptHypothesis: (command) => workflow.acceptHypothesis(command),
    rejectHypothesis: (command) => workflow.rejectHypothesis(command),
    saveModelSuggestion: (command) => workflow.saveModelSuggestion(command),
    editHypothesisCriteria: (command) => workflow.editHypothesisCriteria(command),
    decideHypothesisCriterion: (command) => workflow.decideHypothesisCriterion(command),
    setAttemptArchived: (command) => workflow.setAttemptArchived(command),
    decideCandidateCauses: (request) => capture.decideCandidateCauses(request),
  };
}
