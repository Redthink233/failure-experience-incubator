/**
 * S01 ｜ `M15` `D9` End-to-End Orchestration - the public vocabulary.
 *
 * Contract / plan references:
 *   - contract §0.2 (six-layer discipline), §0.4 D (provider paths / credential), §2.x (the frozen
 *     product semantics `M4`-`M9` already implement);
 *   - `D-022` (no automatic generation), `D-045` (`Formal` save ⇒ step ⑥), `D-051` (batches, not
 *     versions), `D-055` / `D-060` (the two network shapes), `D-059` (Local Workspace files);
 *   - HANDOFF §4 (composition root), §6 (workspace error boundary);
 *   - `S00-03_技术决策包` §8.1 (`GATE` / `RUNTIME` / `ACCEPTANCE` are three DIFFERENT layers).
 *
 * 🔴 WHAT THIS MODULE IS: the ONE application-facing workflow over `D9` ①–⑩ - the orchestration that
 *    turns several individually-correct services into one reproducible chain, the cross-module
 *    transaction / recovery boundary, the single automatic trigger (⑤ ⇒ ⑥) and the read model the
 *    future S01-06 UI renders.
 * 🔴 WHAT IT IS NOT: no `Insight` / `Hypothesis` algorithm (those are `M8` / `M9`), no retrieval and
 *    no comparison (`M6`), no `EvidenceRef` construction (`M7`), no UI, no deployment and no
 *    `PSA-*` acceptance run.
 * 🔴 IT ADDS NO SECOND BUSINESS STATE: there is no step database, no progress percentage, no
 *    completion score, no workflow version and no workflow history. Everything the read model shows
 *    is DERIVED from the real persisted objects (`Attempt` / retrieval derivation / `Insight` /
 *    `Hypothesis` / state events).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O beyond the injected ports.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { ArchiveState } from '../../domain/types/archive.js';
import type { Attempt, AttemptState } from '../../domain/types/attempt.js';
import type { InsightStateEvent } from '../../domain/types/insight.js';
import type { RetrievalDerivationRecord, RetrievalRuntimeFailure, RetrievalStatus } from '../../retrieval/compare/types.js';
import type { ExperienceRetrievalService, RunRetrievalOutcome, RetrievalView } from '../../retrieval/compare/retrieval-service.js';
import type { AttemptRepository } from '../../workspace/repository/attempt-repository.js';
import type { AttemptCaptureService, CaptureStateSnapshot, FollowUpGapKey } from '../capture/index.js';
import type { InsightService } from '../insight/types.js';
import type {
  InsightActionOutcome,
  InsightGateRecheckOutcome,
  InsightGenerationBatch,
  InsightGenerationRefusedOutcome,
  InsightRuntimeFailure,
  InsightView,
} from '../insight/types.js';
import type { HypothesisService } from '../hypothesis/types.js';
import type {
  HypothesisActionOutcome,
  HypothesisGenerationBatch,
  HypothesisRuntimeFailure,
  HypothesisTraceView,
  HypothesisView,
} from '../hypothesis/types.js';

/* ------------------------------------------------------------------ *
 * 0. Layer discipline (task §15)
 * ------------------------------------------------------------------ */

/**
 * The THREE layers, kept apart by CONSTRUCTION rather than by convention.
 *
 * 🔴 `GATE`      : a product rule says "not yet / not allowed" - the record stays intact and the user
 *                  gets guidance (contract §10.1 layer 1).
 * 🔴 `RUNTIME`   : the environment failed - provider / workspace / persistence. The data is
 *                  preserved and a retry is always allowed (contract §10.1 layer 2).
 * 🔴 `ACCEPTANCE`: ONLY ever describes whether the main chain passes end-to-end in a test or a
 *                  pre-submission run. It is deliberately NOT a legal value of a command outcome, so
 *                  "a runtime failure is reported as acceptance skipped" is not expressible.
 */
export const WORKFLOW_LAYERS = ['GATE', 'RUNTIME', 'ACCEPTANCE'] as const;

export type WorkflowLayer = (typeof WORKFLOW_LAYERS)[number];

/**
 * 🔴 The ONLY two layers a command outcome may carry.
 *
 * The `Exclude<…>` is the structural form of 「禁止把 Runtime error 包装成 Gate / 把 Gate 显示成系统
 * 错误」: a `WorkflowNotice` cannot even be constructed with `layer: 'ACCEPTANCE'`.
 */
export type WorkflowFailureLayer = Exclude<WorkflowLayer, 'ACCEPTANCE'>;

export const WORKFLOW_FAILURE_LAYERS: readonly WorkflowFailureLayer[] = ['GATE', 'RUNTIME'];

/* ------------------------------------------------------------------ *
 * 1. Safe errors and recovery actions
 * ------------------------------------------------------------------ */

/**
 * The stable, USER-SAFE failure vocabulary.
 *
 * 🔴 There is deliberately NO field for a raw exception, a stack, a DOM exception, a provider error
 *    body, a token, a latency or a model name. Those are diagnostics, and diagnostics never enter a
 *    product view model (HANDOFF §6 / task §16).
 */
export type WorkflowErrorCode =
  | 'ATTEMPT_NOT_FOUND'
  | 'INSIGHT_NOT_FOUND'
  | 'HYPOTHESIS_NOT_FOUND'
  | 'ATTEMPT_NOT_FORMAL'
  | 'GATE_NOT_SATISFIED'
  | 'WORKFLOW_COMMAND_INVALID'
  | 'WORKSPACE_PERMISSION_REQUIRED'
  | 'WORKSPACE_PERMISSION_DENIED'
  | 'WORKSPACE_UNAVAILABLE'
  | 'WORKSPACE_OPERATION_UNSUPPORTED'
  | 'WORKSPACE_CONTENT_UNREADABLE'
  | 'WORKSPACE_FAILURE_UNCLASSIFIED'
  | 'PROVIDER_FAILURE'
  | 'RETRIEVAL_RUNTIME_INCOMPLETE'
  | 'PERSISTENCE_RECOVERY_BLOCKED'
  | 'INTERNAL_FAILURE';

/**
 * One user-facing notice.
 *
 * 🔴 `code` is enumerable and stable; `message` is a FIXED product sentence. Neither is derived from
 *    a thrown value, so a message can never carry a path, a host, a header or a secret.
 */
export interface WorkflowNotice {
  readonly layer: WorkflowFailureLayer;
  readonly code: WorkflowErrorCode;
  readonly message: string;
  /** `true` only for `RUNTIME`: the same command may be retried without losing anything. */
  readonly retryable: boolean;
  /** The concrete next step the user can take, or `null` when there is none. */
  readonly recovery: WorkflowRecoveryAction | null;
}

/**
 * A concrete, user-initiated next step.
 *
 * 🔴 Every member is an EXPLICIT action the user asks for: nothing here runs by itself, and no member
 *    is a "retry automatically in the background" instruction (`D-022`).
 */
export type WorkflowRecoveryAction =
  | { readonly kind: 'select_workspace' }
  | { readonly kind: 'grant_workspace_access' }
  | { readonly kind: 'rerun_retrieval'; readonly attempt_id: ObjectId<'ATT'> }
  | { readonly kind: 'regenerate_insights'; readonly attempt_id: ObjectId<'ATT'> }
  | { readonly kind: 'regenerate_hypotheses'; readonly attempt_id: ObjectId<'ATT'> }
  | { readonly kind: 'none' };

/**
 * The result of one workflow command.
 *
 * 🔴 `kind` is how the WORKFLOW classified the call; `value` is the delegated module outcome, kept
 *    VERBATIM so no information is re-worded or lost on the way to the UI.
 * 🔴 `layer` can only be `OK` / `GATE` / `RUNTIME`. `ACCEPTANCE` is structurally unreachable.
 */
export interface WorkflowStepResult<T> {
  readonly kind: 'delegated' | 'gate' | 'runtime';
  readonly layer: 'OK' | WorkflowFailureLayer;
  /** The delegated outcome, verbatim. `null` only when the workflow never reached the module. */
  readonly value: T | null;
  readonly notice: WorkflowNotice | null;
}

/* ------------------------------------------------------------------ *
 * 2. The workflow read model (task §23)
 * ------------------------------------------------------------------ */

/** `not_available` (nothing stored) / `runtime_incomplete` (the last run failed) / `ready`. */
export type WorkflowRetrievalState = 'not_available' | 'runtime_incomplete' | 'ready';

/**
 * The 0-like outcomes of a COMPLETED retrieval.
 *
 * 🔴 `null` means "no completed retrieval exists at all" - which is neither of the two empty states
 *    and must never be rendered with either of their sentences (`D-046` V-1 / AC-97 / AC-98).
 * 🔴 There is deliberately NO `'NO_RESULTS'` member: merging the three 0-like states into one word is
 *    exactly what AC-97 forbids.
 */
export type WorkflowZeroLikeState = Extract<RetrievalStatus, 'HISTORY_EMPTY' | 'NO_RELATED_HISTORY'>;

/**
 * Freshness of the stored comparison.
 *
 * 🔴 DERIVED from `Attempt.updated_at` vs the derivation's own `created_at` - the two existing
 *    sources of truth. There is deliberately no `has_been_retrieved`, no `retrieval_freshness_score`
 *    and no `retrieval_version`: a stored freshness field would be a second source of truth that can
 *    drift away from the record it describes.
 */
export interface WorkflowFreshnessView {
  readonly stale: boolean;
  /** The user-facing sentence explaining a stale comparison; `null` when it is not stale. */
  readonly notice: string | null;
  readonly attempt_updated_at: string;
  /** `null` when no comparison was ever stored. */
  readonly comparison_generated_at: string | null;
}

export interface WorkflowRetrievalView {
  readonly state: WorkflowRetrievalState;
  /** The stored current derivation, verbatim; `null` when none exists. */
  readonly derivation: RetrievalDerivationRecord | null;
  /** Step ⑦ material derived from the SAME derivation. `null` when none exists. */
  readonly view: RetrievalView | null;
  /** `N_检索` read from the `M6` read model. `null` - never `0` - when nothing is stored. */
  readonly n_retrieval: number | null;
  readonly zero_like_state: WorkflowZeroLikeState | null;
  readonly freshness: WorkflowFreshnessView;
  /**
   * 🔴 The runtime failure observed by THIS orchestrator instance when it ran ⑥, or `null`.
   *    It is an OBSERVATION, not persisted business state: `M6` writes nothing on a runtime failure,
   *    so there is nothing durable to read back, and `M15` must not invent a stored status field.
   */
  readonly runtime_failure: RetrievalRuntimeFailure | null;
}

/**
 * One explicit generation batch of `Insight`s or `Hypothesis`es.
 *
 * 🔴 `is_current` is DERIVED from the batch records' own `created_at` (the newest one). It is NOT a
 *    version comparison, NOT a strength and NOT a correctness claim (`D-051` / AC-122): an earlier
 *    batch is exactly as valid as the newest one.
 */
export interface WorkflowBatchView {
  readonly batch_id: string;
  readonly created_at: string;
  readonly is_current: boolean;
  readonly output_ids: readonly string[];
  readonly exit_route: string | null;
  readonly absence_statement: string | null;
}

export interface WorkflowInsightsView {
  readonly batches: readonly WorkflowBatchView[];
  readonly current_batch_id: string | null;
  /** Every `Insight` of this record, each carrying its own `N_引用` / ⑩ traceability view. */
  readonly views: readonly InsightView[];
  /** The product view「Experience Asset」 - the workspace-wide `accepted` `Insight`s. */
  readonly experience_assets: readonly InsightView[];
  /** The state-event trace, per `Insight` (`M8` owns the vocabulary; `M15` only reads it). */
  readonly state_events: Readonly<Record<string, readonly InsightStateEvent[]>>;
}

export interface WorkflowHypothesesView {
  readonly batches: readonly WorkflowBatchView[];
  readonly current_batch_id: string | null;
  /** Every `Hypothesis` of this record; the ⑩ traceability travels inside each view. */
  readonly views: readonly HypothesisView[];
  /** The `Model Suggestion`s of this record - 🔴 never evidence, never counted, never ⑩. */
  readonly model_suggestions: readonly HypothesisView[];
}

/** A command the read model suggests is currently possible. 🔴 A HINT, never a permission. */
export type WorkflowCapability =
  | 'begin_capture'
  | 'apply_structured_confirmation'
  | 'ask_follow_up_question'
  | 'abandon_follow_up_gap'
  | 'persist_candidate_causes'
  | 'save_formal_attempt'
  | 'rerun_retrieval'
  | 'generate_insights'
  | 'regenerate_insights'
  | 'accept_insight'
  | 'reject_insight'
  | 'revoke_insight_acceptance'
  | 'edit_insight_content'
  | 'edit_insight_meta'
  | 'generate_hypotheses'
  | 'regenerate_hypotheses'
  | 'accept_hypothesis'
  | 'reject_hypothesis'
  | 'save_model_suggestion'
  | 'edit_hypothesis_criteria'
  | 'decide_hypothesis_criterion'
  | 'trace_hypothesis'
  | 'set_attempt_archived';

/**
 * The single application-facing read model of one record's `D9` progress.
 *
 * 🔴 Every field is DERIVED on every read. Nothing here is a stored step, a stored percentage or a
 *    stored status - so a reload cannot disagree with the workspace.
 * 🔴 The frozen domain objects (`Attempt`, `Insight`, `Hypothesis`, the reference views …) are
 *    carried VERBATIM: this layer invents no parallel vocabulary for a frozen type.
 */
export interface D9WorkflowSnapshot {
  readonly attempt_id: ObjectId<'ATT'>;
  readonly attempt: Attempt;
  readonly attempt_state: AttemptState;
  readonly archive_state: ArchiveState;
  /** The `M4`/`M5` capture read model: the persisted draft state, the content items, the budget. */
  readonly capture: CaptureStateSnapshot;
  readonly retrieval: WorkflowRetrievalView;
  readonly insights: WorkflowInsightsView;
  readonly hypotheses: WorkflowHypothesesView;
  /** Every failure this read observed. Empty when nothing is wrong. */
  readonly notices: readonly WorkflowNotice[];
  readonly available_actions: readonly WorkflowCapability[];
}

/* ------------------------------------------------------------------ *
 * 3. Commands
 * ------------------------------------------------------------------ */

/**
 * The workflow-level operation handle.
 *
 * 🔴 `operation_id` is supplied by the caller (the UI session) and every child command receives a
 *    STABLE id derived from it (`childOperationId`). A retry therefore re-uses the same business
 *    operation ids instead of minting new ones, which is what makes the whole chain idempotent
 *    (task §6 / contract §9.1).
 */
export interface WorkflowOperation {
  readonly operation_id: string;
}

export interface BeginCaptureWorkflowCommand extends WorkflowOperation {
  readonly raw_text: string;
  readonly project_id?: string;
}

export type StructuredConfirmationInput = Parameters<
  AttemptCaptureService['applyStructuredConfirmation']
>[0];

export type CauseDecisionInput = Parameters<AttemptCaptureService['persistCandidateCauses']>[0]['decision'];

export type InsightEvidenceSelectionInput = Parameters<
  InsightService['editInsightContent']
>[0]['evidence_selections'];

export type HypothesisUserItemInput = Parameters<
  HypothesisService['editHypothesisCriteria']
>[0]['user_items'][number];

export interface ApplyConfirmationWorkflowCommand extends WorkflowOperation {
  readonly confirmation: StructuredConfirmationInput;
}

export interface AskFollowUpWorkflowCommand extends WorkflowOperation {
  readonly attempt_id: ObjectId<'ATT'>;
  readonly question_text: string;
  readonly target_gap: FollowUpGapKey;
}

export interface AbandonFollowUpWorkflowCommand extends WorkflowOperation {
  readonly attempt_id: ObjectId<'ATT'>;
  readonly gap: FollowUpGapKey;
}

export interface PersistCausesWorkflowCommand extends WorkflowOperation {
  readonly decision: CauseDecisionInput;
}

export interface SaveFormalWorkflowCommand extends WorkflowOperation {
  readonly attempt_id: ObjectId<'ATT'>;
  readonly user_explicitly_confirmed: boolean;
  readonly candidate_causes?: Parameters<AttemptCaptureService['saveFormalAttempt']>[0]['candidate_causes'];
}

/** The step ⑤ result, including whether the ONE automatic step ⑥ really ran (task §7 / §8). */
export interface FormalSaveWorkflowResult {
  readonly save: Awaited<ReturnType<AttemptCaptureService['saveFormalAttempt']>>;
  /**
   * `true` only when THIS call performed the `Draft → Formal` promotion.
   * 🔴 Derived by comparing the state BEFORE the call with the state AFTER it, so a replay after a
   *    service recreation cannot trigger step ⑥ a second time either.
   */
  readonly promotion_happened: boolean;
  /** `true` when the promotion happened and step ⑥ was therefore triggered automatically. */
  readonly retrieval_triggered: boolean;
  /** The outcome of the automatic step ⑥, or `null` when it did not run. */
  readonly retrieval: RunRetrievalOutcome | null;
}

export interface RerunRetrievalCommand extends WorkflowOperation {
  readonly attempt_id: ObjectId<'ATT'>;
}

export interface GenerateInsightsCommand extends WorkflowOperation {
  readonly attempt_id: ObjectId<'ATT'>;
}

export interface InsightDecisionCommand extends WorkflowOperation {
  readonly insight_id: ObjectId<'INS'>;
}

export interface AcceptInsightWorkflowCommand extends InsightDecisionCommand {
  readonly user_explicitly_accepted: boolean;
}

export interface EditInsightContentWorkflowCommand extends InsightDecisionCommand {
  readonly proposition?: string;
  readonly applicable_scope?: string;
  readonly judgment_basis?: string;
  readonly evidence_selections?: InsightEvidenceSelectionInput;
}

export interface EditInsightMetaWorkflowCommand extends InsightDecisionCommand {
  readonly title?: string | null;
  readonly display_order?: number | null;
}

export interface GenerateHypothesesCommand extends WorkflowOperation {
  readonly attempt_id: ObjectId<'ATT'>;
}

export interface HypothesisDecisionCommand extends WorkflowOperation {
  readonly hypothesis_id: ObjectId<'HYP'>;
}

export interface AcceptHypothesisWorkflowCommand extends HypothesisDecisionCommand {
  readonly user_explicitly_accepted: boolean;
}

export interface SaveModelSuggestionWorkflowCommand extends HypothesisDecisionCommand {
  readonly saved: boolean;
}

export interface EditHypothesisCriteriaWorkflowCommand extends HypothesisDecisionCommand {
  readonly user_items: readonly HypothesisUserItemInput[];
}

export interface DecideHypothesisCriterionWorkflowCommand extends HypothesisDecisionCommand {
  readonly content_item_id: string;
  readonly decision_state: Parameters<HypothesisService['decideHypothesisCriterion']>[0]['decision_state'];
}

export interface SetAttemptArchivedCommand extends WorkflowOperation {
  readonly attempt_id: ObjectId<'ATT'>;
  readonly archive_state: ArchiveState;
}

/* ------------------------------------------------------------------ *
 * 4. Injected ports
 * ------------------------------------------------------------------ */

/**
 * The ports `M15` orchestrates.
 *
 * 🔴 Every port is an already-frozen module INTERFACE (or a structurally identical narrowing of one).
 *    `M15` composes them; it never re-implements one, so there is exactly ONE retrieval, ONE
 *    `EvidenceRef` constructor and ONE state machine in the repository.
 * 🔴 The concrete provider adapter, the workspace storage and the credential are NOT here: they are
 *    resolved by the composition root (`src/browser/application/**`), which is the only place that
 *    may know a runtime.
 */
export interface D9WorkflowPorts {
  readonly capture: AttemptCaptureService;
  readonly retrieval: Pick<
    ExperienceRetrievalService,
    'runRetrievalForFormalAttempt' | 'readCurrentDerivation'
  >;
  /** The `M3` `AttemptRepository`, narrowed to the two members `M15` really uses. */
  readonly attempts: Pick<AttemptRepository, 'readAttempt' | 'updateAttempt'>;
  readonly insights: Pick<
    InsightService,
    | 'generateCandidateInsights'
    | 'regenerateCandidateInsights'
    | 'listInsightsBySourceAttempt'
    | 'listExperienceAssets'
    | 'listGenerationBatches'
    | 'listStateEvents'
    | 'acceptInsight'
    | 'rejectInsight'
    | 'revokeAcceptance'
    | 'editInsightContent'
    | 'editInsightMeta'
    | 'recheckInsightGates'
  >;
  readonly hypotheses: Pick<
    HypothesisService,
    | 'generateHypotheses'
    | 'regenerateHypotheses'
    | 'listHypothesesBySourceAttempt'
    | 'listGenerationBatches'
    | 'acceptHypothesis'
    | 'rejectHypothesis'
    | 'saveModelSuggestion'
    | 'editHypothesisCriteria'
    | 'decideHypothesisCriterion'
    | 'traceHypothesis'
  >;
}

/** The module-level runtime-failure vocabulary a port may report. */
export type WorkflowModuleRuntimeFailure = InsightRuntimeFailure | HypothesisRuntimeFailure;

/** A refusal reported by `M8` / `M9` generation, kept verbatim. */
export type WorkflowModuleGenerationRefusal = InsightGenerationRefusedOutcome;

export type { InsightGenerationBatch, HypothesisGenerationBatch };

export interface D9WorkflowServiceDeps {
  readonly ports: D9WorkflowPorts;
  /**
   * 🔴 The ONLY place a raw thrown value may go: an internal diagnostics sink.
   *
   * It is deliberately NOT a field of any view model, and the shipped composition root passes
   * nothing here. Whatever a sink does with the value, `original_error` never becomes product text
   * (HANDOFF §6 / task §16).
   */
  readonly on_internal_error?: (diagnostic: WorkflowInternalDiagnostic) => void;
}

/** Diagnostics only. 🔴 Never rendered, never persisted, never part of a `D9WorkflowSnapshot`. */
export interface WorkflowInternalDiagnostic {
  readonly stage: string;
  readonly original_error: unknown;
}

/**
 * The result of reading the read model.
 *
 * 🔴 THREE outcomes, kept apart on purpose. In particular `not_found` and `unavailable` are NOT the
 *    same statement: "this record does not exist" is a fact about the workspace, while "the workspace
 *    could not be read" is an environment failure with a retry. Collapsing them would tell the user a
 *    record had been deleted when the directory was merely not authorized.
 * 🔴 A read may throw - a permission can be revoked at any moment - so the read is wrapped by the SAME
 *    boundary as a command, and a raw exception can never leave the workflow (task §16).
 */
export type WorkflowReadResult =
  | { readonly kind: 'snapshot'; readonly snapshot: D9WorkflowSnapshot }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'unavailable'; readonly notice: WorkflowNotice };

/* ------------------------------------------------------------------ *
 * 5. Service
 * ------------------------------------------------------------------ */

/**
 * The `D9` workflow service.
 *
 * 🔴 FINE-GRAINED BY DESIGN. Different semantic actions are NOT merged into one omnibus `execute()`:
 *    a command that saves a `Formal` record and a command that accepts an `Insight` have different
 *    layers, different idempotency handles and different failures, and the read model must be able to
 *    tell them apart.
 */
export interface D9WorkflowService {
  /** The single read model. */
  readWorkflow(attempt_id: ObjectId<'ATT'>): Promise<WorkflowReadResult>;

  /* ①② - capture */
  beginCapture(command: BeginCaptureWorkflowCommand): Promise<WorkflowStepResult<Awaited<ReturnType<AttemptCaptureService['beginCapture']>>>>;
  applyStructuredConfirmation(command: ApplyConfirmationWorkflowCommand): Promise<WorkflowStepResult<Awaited<ReturnType<AttemptCaptureService['applyStructuredConfirmation']>>>>;
  askFollowUpQuestion(command: AskFollowUpWorkflowCommand): Promise<WorkflowStepResult<Awaited<ReturnType<AttemptCaptureService['askFollowUpQuestion']>>>>;
  abandonFollowUpGap(command: AbandonFollowUpWorkflowCommand): Promise<WorkflowStepResult<Awaited<ReturnType<AttemptCaptureService['abandonFollowUpGap']>>>>;

  /* ④⑤ - candidate causes and the `Formal` save (+ the ONE automatic step ⑥) */
  analyseCandidateCauses(attempt_id: ObjectId<'ATT'>): Promise<WorkflowStepResult<Awaited<ReturnType<AttemptCaptureService['analyseCandidateCauses']>>>>;
  persistCandidateCauses(command: PersistCausesWorkflowCommand): Promise<WorkflowStepResult<Awaited<ReturnType<AttemptCaptureService['persistCandidateCauses']>>>>;
  saveFormalAttempt(command: SaveFormalWorkflowCommand): Promise<WorkflowStepResult<FormalSaveWorkflowResult>>;

  /* ⑥ - the explicit rerun (task §9) */
  rerunRetrieval(command: RerunRetrievalCommand): Promise<WorkflowStepResult<RunRetrievalOutcome>>;

  /* ⑧ - explicit generation, and its lifecycle routing */
  generateInsights(command: GenerateInsightsCommand): Promise<WorkflowStepResult<Awaited<ReturnType<InsightService['generateCandidateInsights']>>>>;
  regenerateInsights(command: GenerateInsightsCommand): Promise<WorkflowStepResult<Awaited<ReturnType<InsightService['regenerateCandidateInsights']>>>>;
  acceptInsight(command: AcceptInsightWorkflowCommand): Promise<WorkflowStepResult<InsightActionOutcome>>;
  rejectInsight(command: InsightDecisionCommand): Promise<WorkflowStepResult<InsightActionOutcome>>;
  revokeInsightAcceptance(command: InsightDecisionCommand): Promise<WorkflowStepResult<InsightActionOutcome>>;
  editInsightContent(command: EditInsightContentWorkflowCommand): Promise<WorkflowStepResult<InsightActionOutcome>>;
  editInsightMeta(command: EditInsightMetaWorkflowCommand): Promise<WorkflowStepResult<InsightActionOutcome>>;

  /* ⑨⑩ - explicit generation and the frozen traceability */
  generateHypotheses(command: GenerateHypothesesCommand): Promise<WorkflowStepResult<Awaited<ReturnType<HypothesisService['generateHypotheses']>>>>;
  regenerateHypotheses(command: GenerateHypothesesCommand): Promise<WorkflowStepResult<Awaited<ReturnType<HypothesisService['regenerateHypotheses']>>>>;
  acceptHypothesis(command: AcceptHypothesisWorkflowCommand): Promise<WorkflowStepResult<HypothesisActionOutcome>>;
  rejectHypothesis(command: HypothesisDecisionCommand): Promise<WorkflowStepResult<HypothesisActionOutcome>>;
  saveModelSuggestion(command: SaveModelSuggestionWorkflowCommand): Promise<WorkflowStepResult<HypothesisActionOutcome>>;
  editHypothesisCriteria(command: EditHypothesisCriteriaWorkflowCommand): Promise<WorkflowStepResult<HypothesisActionOutcome>>;
  decideHypothesisCriterion(command: DecideHypothesisCriterionWorkflowCommand): Promise<WorkflowStepResult<HypothesisActionOutcome>>;
  traceHypothesis(hypothesis_id: ObjectId<'HYP'>): Promise<WorkflowStepResult<HypothesisTraceView | null>>;

  /* Archive / unarchive - 🔴 a state change only, never a cascade (task §10) */
  setAttemptArchived(command: SetAttemptArchivedCommand): Promise<WorkflowStepResult<Attempt>>;
}

/** The insight-recheck outcome union, re-exported so a caller does not need the `M8` module path. */
export type InsightRecheckOutcome = InsightGateRecheckOutcome | InsightRuntimeFailure | InsightActionOutcome;
