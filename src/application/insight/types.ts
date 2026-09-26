/**
 * S01 ｜ `M8` Candidate Insight Generation (`D9` step ⑧) - the public vocabulary.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md (**v0.3 FROZEN / IMPLEMENTATION BASIS**)
 *   - §2.2   the SINGLE `Insight` migration matrix (`candidate` / `accepted` / `rejected`);
 *   - §2.4   「生成批次」(explicit regeneration) - a batch relation, NEVER a version number;
 *   - §4.2   rule 2: an `accepted Insight` stays `Inference` forever;
 *   - §5.1   `EvidenceRef` minimum field set + the four roles;
 *   - §9     step ⑧ I/O: `Insight` (`candidate`) + `E1`-`E4` + the reference list;
 *   - §9.2   exits: step ⑧ uses `EXIT-A` / `EXIT-C`; `E2`/`E3` failing is NOT an exit (`D-038`);
 *   - §11.3  `InsightStateEvent` = state transition + time + trigger reason class;
 *   - `D-015` / `D-021` / `D-022` / `D-038` / `D-039` / `D-040` / `D-043` / `D-051`.
 *
 * 🔴 WHAT THIS MODULE IS: step ⑧ - the ONLY moment a `Candidate Insight` is produced, the
 *    `E1`-`E4` presentation, the `candidate` / `accepted` / `rejected` lifecycle, the
 *    product-layer state-event trace and the Local Workspace persistence of all of it.
 * 🔴 WHAT IT IS NOT: no `Hypothesis` (`M9`), no `D9` orchestration (`M15`), no UI (S01-06), no
 *    retrieval (`M6`) and no grounding construction (`M7`). It never re-derives `N_引用`, never
 *    builds an `EvidenceRef` itself and never invents a second reference or count system.
 * 🔴 SCOPE (task §4 / `D-022`): generation happens ONLY inside an explicit step ⑧ command. There
 *    is no background / scheduled / file-watch / page-open / batch-mining generation and no
 *    candidate todo pool anywhere in this module.
 * 🔴 NO numeric judgement quantity of any kind reaches an `Insight`: no score, no confidence, no
 *    probability, no percentage, no quality level, no evidence strength, no rank, no grade
 *    (`D-020` / `D-037` / AC-23 / AC-93). `E2` / `E3` are DISCRETE `pass` / `fail` with a reason.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ProviderAdapter } from '../../ai/provider/adapter.js';
import type { CredentialRef } from '../../ai/provider/credential.js';
import type { AiError } from '../../ai/provider/result.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import type { EvidenceRef, RefRole } from '../../domain/types/evidence-ref.js';
import type { GateCheckResult, GateId, GateMissingItem } from '../../domain/types/gates.js';
import type { Insight, InsightState, InsightStateEvent } from '../../domain/types/insight.js';
import type {
  CitationView,
  GroundingRejection,
  TraceableEvidenceView,
} from '../../retrieval/grounding/types.js';

/* ------------------------------------------------------------------ *
 * 1. Provider context (M10 only)
 * ------------------------------------------------------------------ */

/**
 * The AI context this layer is allowed to hold.
 *
 * 🔴 It carries the `M10` `ProviderAdapter` INTERFACE and an opaque `CredentialRef` - never a
 *    concrete adapter class, never a transport module, never a secret. The composition root
 *    (`M15`) builds this object; `M8` never reaches for a concrete provider implementation.
 */
export interface InsightProviderContext {
  readonly adapter: ProviderAdapter;
  /** `null` only for a provider that needs no credential; the adapter then fails explicitly. */
  readonly credential_ref: CredentialRef | null;
}

/* ------------------------------------------------------------------ *
 * 2. Runtime failure vocabulary (NOT a product semantic result)
 * ------------------------------------------------------------------ */

/**
 * Application-local failure codes.
 *
 * 🔴 A runtime failure is NEVER an invalid `Insight` and never a discarded record: everything
 *    already stored survives and a retry is always allowed (§10.1 layer 2 / §24 of the task).
 */
export type InsightLocalFailureCode =
  | 'REQUEST_INVALID'
  | 'NO_STRUCTURED_OUTPUT_AVAILABLE'
  | 'MALFORMED_STRUCTURED_RESULT'
  | 'SCHEMA_VIOLATION';

export interface InsightRuntimeFailure {
  readonly kind: 'runtime_failure';
  /** Set when the failure came from the adapter; `null` for application-local detection. */
  readonly ai_error: AiError | null;
  /** Set for application-local detection; `null` when `ai_error` is present. */
  readonly local_code: InsightLocalFailureCode | null;
  readonly detail: string;
  /** `true` when retrying the same request is meaningful (never a product-level cap). */
  readonly retryable: boolean;
  /** 🔴 Always `true`: a runtime failure never discards a stored `Insight` (§24). */
  readonly insights_preserved: true;
}

export function insightRuntimeFailureFromAiError(error: AiError): InsightRuntimeFailure {
  return {
    kind: 'runtime_failure',
    ai_error: error,
    local_code: null,
    detail: error.message,
    retryable: error.retryable,
    insights_preserved: true,
  };
}

export function insightRuntimeFailure(
  code: InsightLocalFailureCode,
  detail: string,
  retryable = true,
): InsightRuntimeFailure {
  return {
    kind: 'runtime_failure',
    ai_error: null,
    local_code: code,
    detail,
    retryable,
    insights_preserved: true,
  };
}

/* ------------------------------------------------------------------ *
 * 3. Zero-output exits (contract §9.2)
 * ------------------------------------------------------------------ */

/**
 * The two step ⑧ exits (contract §9.2).
 *
 * 🔴 `EXIT-B` (`not-verifiable`) belongs to step ⑨ and is deliberately NOT a member here.
 * 🔴 An `E2` / `E3` failure is NOT an exit route: the `Insight` stays `candidate` and is presented
 *    in three parts (`D-038` / `AC-99`). A zero-output exit is only reachable when NO candidate
 *    proposition could be formed at all.
 */
export type InsightExitRoute = 'EXIT-A' | 'EXIT-C';

export const INSIGHT_EXIT_ROUTES: readonly InsightExitRoute[] = ['EXIT-A', 'EXIT-C'];

export const INSIGHT_EXIT_ROUTE_LABELS: Readonly<Record<InsightExitRoute, string>> = {
  'EXIT-A': 'evidence-insufficient',
  'EXIT-C': 'not-formable',
};

/* ------------------------------------------------------------------ *
 * 4. Generation batch (§2.4 / D-051)
 * ------------------------------------------------------------------ */

/**
 * One explicit step ⑧ generation = ONE generation batch.
 *
 * 🔴 A BATCH RELATION, never a version number: no `version_number`, no 第 N 次生成 counter, no
 *    revision, no rollback, no diff, no "more correct / stronger / more reliable" claim
 *    (§2.4 / `D-051` / AC-122).
 * 🔴 The record exists for two reasons only: (①) 「同一次 operation 重放不得再生成一套结果」
 *    (§32), and (②) the 'current / earlier generation result' relation is auditable. It is NOT a
 *    candidate todo pool and NOT a version list.
 */
export interface InsightGenerationBatch {
  readonly batch_id: string;
  readonly source_attempt_id: ObjectId<'ATT'>;
  /** The idempotency handle of the generation operation that produced this batch. */
  readonly operation_id: string;
  /** The `Insight`s this batch produced; may be empty (a legal zero-output result). */
  readonly insight_ids: readonly ObjectId<'INS'>[];
  /** `null` whenever the batch produced at least one `Candidate Insight`. */
  readonly exit_route: InsightExitRoute | null;
  /**
   * Why the batch produced nothing. 🔴 Never blank for a zero-output batch: a silent zero result is
   *    refused (contract §9.2 / `D-047`). `null` whenever insights were produced.
   */
  readonly absence_statement: string | null;
  readonly created_at: string;
}

/* ------------------------------------------------------------------ *
 * 4b. The durable operation anchor (M8-HARDENING-01)
 * ------------------------------------------------------------------ */

/**
 * `in_progress` is written BEFORE any record exists; `complete` is written only after the batch
 * record landed. Nothing else distinguishes the two - there is no counter and no timestamp order
 * that a reader has to interpret.
 */
export type InsightOperationAnchorStatus = 'in_progress' | 'complete';

/**
 * The durable RECOVERY ANCHOR of ONE step ⑧ generation (`M8-HARDENING-01`).
 *
 * 🔴 WHY IT EXISTS: without it, a crash between 「Insight 写入」 and 「generation batch 写入」 left
 *    `insights/<id>.json` on disk with no batch naming it, so the persisted result could not be
 *    resolved by the idempotency lookup (`findBatchByOperationId`) and a retry of the SAME operation
 *    would either mint a SECOND set of identities or fail. The anchor carries the COMPLETE
 *    materialised plan in ONE document, so the replay re-applies exactly the planned identities.
 * 🔴 It is NOT a version system and NOT a source of truth (`AC-122`): it stores no history, no
 *    revision and no "which attempt was better", and it becomes irrelevant the moment the batch and
 *    the records are all present. It is a REPLAY RECOVERY anchor, exactly like `M9`'s.
 * 🔴 A replay is NOT claimed to be an atomic transaction: it is a bounded, ordered, idempotent
 *    routine whose steps may be re-run until the workspace is consistent.
 */
export interface InsightOperationAnchor {
  readonly operation_key: string;
  readonly operation_id: string;
  readonly source_attempt_id: ObjectId<'ATT'>;
  readonly batch_id: string;
  readonly status: InsightOperationAnchorStatus;
  /** The INSIGHT plan, in the SAME shape the `insights/<id>.json` documents use. */
  readonly planned_records: readonly InsightRecord[];
  readonly planned_batch: InsightGenerationBatch;
  readonly created_at: string;
}

/* ------------------------------------------------------------------ *
 * 5. The persisted record (`Insight` + display-only meta)
 * ------------------------------------------------------------------ */

/**
 * Non-semantic / display-only metadata (domain `INSIGHT_META_FIELDS`).
 *
 * 🔴 Changing either of these NEVER moves the `Insight` state, never re-runs `E1`-`E4` and never
 *    writes an `InsightStateEvent` (§2.2 / `D-040` / AC-64).
 * 🔴 They are NOT a rubric, a grade or an ordering quality signal; they carry no similarity,
 *    confidence or rank meaning whatsoever.
 */
export interface InsightMeta {
  readonly title: string | null;
  readonly display_order: number | null;
}

export const EMPTY_INSIGHT_META: InsightMeta = { title: null, display_order: null };

/**
 * The stored form of one `Insight`.
 *
 * 🔴 `insight` is the FROZEN domain object, verbatim - the persistence layer adds only the
 *    display-only meta block and E4's `comparison_ref`, and changes no frozen semantics.
 */
export interface InsightRecord {
  readonly insight: Insight;
  /**
   * D-021 `E4` ③: which Retrieval Derivation / comparison reference the cross-record comparison
   * used. `null` when the `Insight` used no cross-record comparison at all (a legal state).
   */
  readonly comparison_ref: string | null;
  readonly meta: InsightMeta;
}

/** Fields the repository is allowed to change. Identity and provenance are immutable. */
export interface InsightPatch {
  readonly state?: InsightState;
  readonly proposition?: string;
  readonly applicable_scope?: string;
  readonly evidence_refs?: readonly EvidenceRef[];
  readonly judgment_basis?: string;
  readonly gate_checks?: readonly GateCheckResult[];
  readonly comparison_ref?: string | null;
  readonly meta?: InsightMeta;
  readonly updated_at?: string;
}

/* ------------------------------------------------------------------ *
 * 6. The AI proposal (step ⑧ structured output)
 * ------------------------------------------------------------------ */

/**
 * One requested reference inside a proposal.
 *
 * 🔴 `M8` writes NO `EvidenceRef`: it hands these selections to `M7`, which validates them and
 *    constructs the frozen references (`task §7`). `target_id` / `source_field_path` are plain
 *    strings ON PURPOSE - they are the runtime boundary at which a fabricated id or path is
 *    refused instead of being written into a reference.
 */
export interface InsightEvidenceSelection {
  readonly target_id: string;
  readonly source_field_path: string;
  readonly role: RefRole;
}

/** The three-part presentation of an unmet gate, as proposed by the model (`D-038`). */
export interface InsightMissingItemProposal {
  /** 缺什么 */
  readonly description: string;
  /** 为什么重要 */
  readonly why_important: string;
  /** 如何补充 - an AI suggestion (display-type `Inference`), or `null` when not offered. */
  readonly how_to_supplement: string | null;
}

/** One proposed `Candidate Insight`, before any structural check has run. */
export interface CandidateInsightProposal {
  /** ① 经验命题内容 */
  readonly proposition: string;
  /** ② 适用范围 / 条件集合 */
  readonly scope: string;
  /** ④ 判断依据（`judgment_basis` 的第一部分） */
  readonly basis: string;
  /** ④ 可验证判据，可缺省；`null` means the model offered none. */
  readonly verifiability: string | null;
  readonly evidence_selections: readonly InsightEvidenceSelection[];
  /** `E2` is a DISCRETE `pass` / `fail` decided by the model, with a mandatory reason. */
  readonly e2_check: 'pass' | 'fail';
  readonly e2_reason: string;
  /** `E3` likewise: discrete, with a reason. */
  readonly e3_check: 'pass' | 'fail';
  readonly e3_reason: string;
  readonly missing_items: readonly InsightMissingItemProposal[];
}

/** The step ⑧ answer. 🔴 `0..n` insights: a default, a minimum or a maximum count is forbidden. */
export interface InsightGenerationProposal {
  readonly insights: readonly CandidateInsightProposal[];
  /** `NONE` whenever at least one insight was formed; otherwise the claimed exit. */
  readonly exit_route: 'NONE' | InsightExitRoute;
  /** Present (and never blank) when `insights` is empty, so a zero result is never silent. */
  readonly absence_statement: string | null;
}

/** The `E2` / `E3` re-check answer (`§24`). */
export interface InsightGateRecheckProposal {
  readonly e2_check: 'pass' | 'fail';
  readonly e2_reason: string;
  readonly e3_check: 'pass' | 'fail';
  readonly e3_reason: string;
  readonly missing_items: readonly InsightMissingItemProposal[];
}

/* ------------------------------------------------------------------ *
 * 7. Local payload issues (never silently repaired)
 * ------------------------------------------------------------------ */

export type InsightPayloadIssueCode =
  | 'SCHEMA_VIOLATION'
  | 'FORBIDDEN_SCORING_FIELD'
  /** 「已证实 / 已验证为事实 / 证明了 / 方法 X 已被证明无效」-wording (`D-038` / §9). */
  | 'FORBIDDEN_WORDING'
  /** A general rule asserted from a single-record evidence base (`D-021 E4` / `D-007`). */
  | 'GENERALIZED_CLAIM_FROM_SINGLE_SOURCE'
  /** The model tried to decide the state (`accepted`) - only `E5` (a user action) may (`§16`). */
  | 'AI_CLAIMED_INSIGHT_STATE'
  | 'ZERO_OUTPUT_WITHOUT_EXPLICIT_STATEMENT';

export interface InsightPayloadIssue {
  readonly code: InsightPayloadIssueCode;
  /** Dotted position inside the answer, e.g. `insights[1].proposition`; `''` for the root. */
  readonly path: string;
  readonly detail: string;
}

/* ------------------------------------------------------------------ *
 * 8. Views
 * ------------------------------------------------------------------ */

/**
 * One `Insight` as the product reads it.
 *
 * 🔴 The citation view and the traceability list are DERIVED on every read from the SAME stored
 *    `evidence_refs` set (contract §3.3): there is deliberately no writable second copy of
 *    `N_引用` anywhere in this module.
 */
export interface InsightView {
  readonly insight: Insight;
  readonly meta: InsightMeta;
  readonly comparison_ref: string | null;
  /** Derived by `M7`'s single `N_引用` derivation - never recounted here. */
  readonly citation: CitationView;
  /** Derived by `M7`'s single ⑩ traceability derivation - the same set as the count. */
  readonly traceability: readonly TraceableEvidenceView[];
  /** `true` exactly when the state is `accepted` - the product view「Experience Asset」. */
  readonly is_experience_asset: boolean;
  /** Gate ids that are not satisfied, in canonical order. */
  readonly unsatisfied_gate_ids: readonly GateId[];
  /** Structural eligibility only. The accept action itself is `E5` and stays a user action. */
  readonly can_accept: boolean;
  /** Read-only view of the three-part presentation for every unsatisfied gate. */
  readonly missing_items_by_gate: Readonly<Partial<Record<GateId, readonly GateMissingItem[]>>>;
}

/* ------------------------------------------------------------------ *
 * 9. Commands
 * ------------------------------------------------------------------ */

export interface GenerateCandidateInsightsCommand {
  /** Idempotency handle supplied by `M15`. Replaying it MUST NOT create a second batch (§32). */
  readonly operation_id: string;
  readonly source_attempt_id: ObjectId<'ATT'>;
  /**
   * 🔴 `true` ONLY when the user explicitly asked for another generation (§28 / §29).
   *    A second generation with a NEW `operation_id` but without this flag is refused
   *    (`REGENERATION_REQUIRED`) instead of quietly producing a second batch.
   * 🔴 It is NOT a semantic edit and MUST NOT trigger `D-040`'s demotion: older `Insight`s keep
   *    their state, and an older `accepted Insight` keeps being an `Experience Asset`.
   */
  readonly explicit_regeneration?: boolean;
}

export interface InsightIdCommand {
  readonly operation_id: string;
  readonly insight_id: ObjectId<'INS'>;
}

export interface AcceptInsightCommand extends InsightIdCommand {
  /** 🔴 `E5` — the ONE and only way a `candidate` may become `accepted` (§16 / `D-039`). */
  readonly user_explicitly_accepted: boolean;
}

export interface EditInsightContentCommand extends InsightIdCommand {
  readonly proposition?: string;
  readonly applicable_scope?: string;
  readonly evidence_selections?: readonly InsightEvidenceSelection[];
  readonly judgment_basis?: string;
}

export interface EditInsightMetaCommand extends InsightIdCommand {
  readonly title?: string | null;
  readonly display_order?: number | null;
}

/** Which records `M8` may be asked for. */
export interface ListInsightsQuery {
  readonly source_attempt_id?: ObjectId<'ATT'>;
}

/* ------------------------------------------------------------------ *
 * 10. Outcomes
 * ------------------------------------------------------------------ */

export interface InsightsGeneratedOutcome {
  readonly kind: 'generated';
  readonly batch: InsightGenerationBatch;
  /** `1..n` - the model produced at least one candidate proposition. All are `candidate`. */
  readonly insights: readonly Insight[];
  readonly idempotent_replay: boolean;
}

export interface InsightZeroOutputOutcome {
  readonly kind: 'zero_output';
  readonly batch: InsightGenerationBatch;
  readonly exit_route: InsightExitRoute;
  /** Never blank: a zero result must say why (§9.2 / `D-047`). */
  readonly absence_statement: string;
  readonly idempotent_replay: boolean;
}

export type InsightGenerationRefusalCode =
  | 'SOURCE_ATTEMPT_NOT_FOUND'
  | 'REGENERATION_REQUIRED'
  /** The same idempotency handle was reused for a different source record. */
  | 'OPERATION_ID_CONFLICT'
  | 'EVIDENCE_SELECTION_REFUSED'
  | 'AI_PROPOSAL_REJECTED'
  /**
   * `M8-HARDENING-01`: the durable operation anchor exists but the workspace refused to complete
   * the replay (a `PLAN_MISMATCH`, a storage failure, a write denial). 🔴 A RETRYABLE runtime
   * refusal - the previously written records are left exactly as they are and nothing is reported
   * as a success.
   */
  | 'PERSISTENCE_RECOVERY_BLOCKED';

/**
 * A step ⑧ refusal.
 *
 * 🔴 Nothing is persisted: no `Insight`, no batch, no reference. A refusal is always explicit and
 *    enumerable - `M8` never drops a refused reference and continues (`task §38 V3`).
 */
export interface InsightGenerationRefusedOutcome {
  readonly kind: 'refused';
  readonly code: InsightGenerationRefusalCode;
  readonly detail: string;
  /** Every `M7` rejection, in the order they were found. Empty when the refusal is not M7's. */
  readonly rejections: readonly GroundingRejection[];
  /** Every local payload issue. Empty when the refusal is not a payload refusal. */
  readonly issues: readonly InsightPayloadIssue[];
  readonly retryable: boolean;
}

export type GenerateCandidateInsightsOutcome =
  | InsightsGeneratedOutcome
  | InsightZeroOutputOutcome
  | InsightGenerationRefusedOutcome
  | InsightRuntimeFailure;

export type InsightActionRejectionCode =
  | 'INSIGHT_NOT_FOUND'
  | 'INVALID_COMMAND'
  | 'NOT_A_CANONICAL_TRANSITION'
  | 'GATES_NOT_SATISFIED'
  | 'EVIDENCE_SELECTION_REFUSED';

export interface InsightActionRejection {
  readonly kind: 'rejected';
  readonly code: InsightActionRejectionCode;
  readonly detail: string;
  /** The stored record, unchanged by the refused action; `null` only when it does not exist. */
  readonly insight: Insight | null;
  /** The `E1`-`E4` results the decision was based on (empty when no check was needed). */
  readonly gate_checks: readonly GateCheckResult[];
  /** Every `M7` rejection behind an `EVIDENCE_SELECTION_REFUSED`; empty otherwise. */
  readonly rejections: readonly GroundingRejection[];
  readonly retryable: boolean;
}

export interface InsightActionApplied {
  readonly kind: 'applied';
  readonly insight: Insight;
  readonly view: InsightView;
  /**
   * The state event this call wrote, or `null`.
   *
   * 🔴 `null` for: creating a `candidate` (not a transition), a pure metadata edit, and
   *    `candidate -> rejected` - whose trigger class does not exist in the frozen
   *    `InsightStateEventTrigger` union, so the state pair is the record and no second event
   *    vocabulary is opened (§25).
   */
  readonly event: InsightStateEvent | null;
  readonly idempotent_replay: boolean;
}

export type InsightActionOutcome = InsightActionApplied | InsightActionRejection | InsightRuntimeFailure;

export interface InsightGateRecheckOutcome {
  readonly kind: 'rechecked';
  readonly insight: Insight;
  readonly gate_checks: readonly GateCheckResult[];
  readonly idempotent_replay: boolean;
}

/* ------------------------------------------------------------------ *
 * 11. Service
 * ------------------------------------------------------------------ */

/**
 * `M8` application service — `D9` step ⑧ and the `Insight` lifecycle.
 *
 * 🔴 The generation entry point is EXPLICIT and command-driven. Nothing here listens to a timer,
 *    a file change, a page open or a `Formal` save (§4 / `D-022`).
 */
export interface InsightService {
  /** 「D9 第 ⑧ 步」- the ONE and only generation moment. Called by `M15`. */
  generateCandidateInsights(
    command: GenerateCandidateInsightsCommand,
  ): Promise<GenerateCandidateInsightsOutcome>;
  /**
   * 🔴 An EXPLICIT regeneration: a new generation batch over the CURRENT derivation.
   *    It preserves every older `Insight` and never moves an older `accepted` one (§2.4 / `D-051`).
   */
  regenerateCandidateInsights(
    command: GenerateCandidateInsightsCommand,
  ): Promise<GenerateCandidateInsightsOutcome>;
  readInsight(insight_id: ObjectId<'INS'>): Promise<InsightView | null>;
  listInsightsBySourceAttempt(source_attempt_id: ObjectId<'ATT'>): Promise<readonly InsightView[]>;
  /** The product view「Experience Asset」= `accepted` `Insight`s only. Never a second entity. */
  listExperienceAssets(): Promise<readonly InsightView[]>;
  listGenerationBatches(
    source_attempt_id: ObjectId<'ATT'>,
  ): Promise<readonly InsightGenerationBatch[]>;
  listStateEvents(insight_id: ObjectId<'INS'>): Promise<readonly InsightStateEvent[]>;

  /**
   * `E5` — the user explicitly accepting.
   *
   * 🔴 `E1`-`E4` are re-confirmed in this very call (`§16` / `§21` / `L10`): `E1` / `E4` are
   *    re-derived from fresh reads, while `E2` / `E3` are the STORED content-quality verdicts the
   *    user is acting on. A single unsatisfied gate refuses the migration and changes nothing.
   * 🔴 The user's action decides `E5`; it can never substitute `E1`-`E4` (`D-039`).
   */
  acceptInsight(command: AcceptInsightCommand): Promise<InsightActionOutcome>;
  /** `candidate -> rejected`. NOT gated on `E1`-`E4` (`§15` / `D-015`). */
  rejectInsight(command: InsightIdCommand): Promise<InsightActionOutcome>;
  /** `accepted -> candidate` (never `rejected`) and never a delete (`§21` / `D-039`). */
  revokeAcceptance(command: InsightIdCommand): Promise<InsightActionOutcome>;
  /** A semantic edit: falls back to `candidate` from ANY state and re-runs `E1`-`E4` (`§22`). */
  editInsightContent(command: EditInsightContentCommand): Promise<InsightActionOutcome>;
  /** A non-semantic / display-only edit: the state never moves and no event is written (`§23`). */
  editInsightMeta(command: EditInsightMetaCommand): Promise<InsightActionOutcome>;
  /**
   * Refreshes the `E1`-`E4` presentation.
   * 🔴 `E1` / `E4` are re-derived structurally; `E2` / `E3` are the stored content-quality verdicts
   *    (a machine-triggered refresh never re-asks `M10` — `D-039` keeps a content edit as the only
   *    remedy for a failing `E2` / `E3`). A content edit performs the full re-check instead (`§24`).
   */
  recheckInsightGates(command: InsightIdCommand): Promise<InsightGateRecheckOutcome | InsightRuntimeFailure | InsightActionRejection>;
}
