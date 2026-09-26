/**
 * S01 ｜ `M9` Hypothesis Generation + Evidence Traceability (`D9` steps ⑨⑩) - the public
 *            vocabulary.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md (**v0.3 FROZEN / IMPLEMENTATION BASIS**)
 *   - §1.1     a `Hypothesis` is an independent output object of step ⑨; it NEVER becomes an
 *              `Experience Asset`, never enters the experience area, never becomes a new historical
 *              evidence target;
 *   - §2.3     two kinds share ONE id space; the decision slot is `undecided` / `accepted` /
 *              `rejected`; the word `candidate` MUST NOT be used for a `Hypothesis`;
 *   - §2.4     generation batches (`D-051`) - a batch relation, NEVER a version number;
 *   - §8.1     object boundary of the two step ⑨ outputs;
 *   - §8.2     grounding bases G1-G4 / non-grounding conditions N1-N6 / only two source partitions;
 *   - §8.3     count and exits (`1-2` adaptive, `EXIT-A` / `EXIT-B` / `EXIT-C`);
 *   - §8.4     `Model Suggestion` - SAVE ≠ ACCEPT (`D-042`); no `N`, no grounding, never traced;
 *   - §8.5     the ONE legal conversion path (execute → new `Formal Attempt` → new step ⑧);
 *   - §8.6     edit boundary: ①②③④⑤ read-only, ⑥⑦⑧ user `Fact` / AI `Inference` in two columns;
 *   - §9       step ⑨/⑩ I/O and "the trace list and `N_引用` must agree";
 *   - §9.2     the three zero-output exits;
 *   - §12      items 3 / 19 / 20 / 22: Worker-forbidden-to-change shared semantics.
 *
 * 🔴 WHAT THIS MODULE IS: step ⑨ (generate the next verifiable `Hypothesis`, or a `Model Suggestion`)
 *    and step ⑩ (trace its real historical basis), plus the Local Workspace persistence of both.
 * 🔴 WHAT IT IS NOT: no `D9` orchestration (`M15`), no UI (S01-06), no retrieval (`M6`), no grounding
 *    construction (`M7`), no `Insight` generation (`M8`). It never re-derives `N_引用`, never builds
 *    an `EvidenceRef` itself and never invents a second reference or count system.
 * 🔴 ⑨ DOES NOT WAIT FOR ⑧'s `E5` (`D-030` + `D-022`): an un-accepted `Candidate Insight` may be a
 *    REASONING INPUT (`reasoning_input_refs`), but it is never an `EvidenceRef`, never grounds,
 *    never counts toward `N_引用` and never enters ⑩.
 * 🔴 NO numeric judgement quantity of any kind: no score, no confidence, no probability, no
 *    percentage, no quality level, no evidence strength, no rank, no grade, and NO "partially
 *    anchored" middle grade. Grounding is BINARY (§8.2 rule 1 / `TQ34`).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ProviderAdapter } from '../../ai/provider/adapter.js';
import type { CredentialRef } from '../../ai/provider/credential.js';
import type { AiError } from '../../ai/provider/result.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import type { RefRole } from '../../domain/types/evidence-ref.js';
import type {
  GroundingBasis,
  Hypothesis,
  HypothesisEditableItems,
  HypothesisEditableSlot,
  HypothesisKind,
  KeptConditionFactRef,
  NonGroundingCondition,
  SourcePartition,
} from '../../domain/types/hypothesis.js';
import type { InferenceContentItem, SourceType } from '../../domain/types/source-type.js';
import type { CitationView, GroundingRejection, TraceableEvidenceView } from '../../retrieval/grounding/types.js';
import type { InsightView } from '../insight/types.js';

/* ------------------------------------------------------------------ *
 * 1. Provider context (M10 only)
 * ------------------------------------------------------------------ */

/**
 * The AI context this layer is allowed to hold.
 *
 * 🔴 It carries the `M10` `ProviderAdapter` INTERFACE and an opaque `CredentialRef` - never a
 *    concrete adapter class, never a transport module, never a secret. The composition root
 *    (`M15`) builds this object; `M9` never reaches for a concrete provider implementation.
 */
export interface HypothesisProviderContext {
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
 * 🔴 A runtime failure is NEVER an invalid `Hypothesis` and never a discarded record: everything
 *    already stored survives and a retry is always allowed (§10.1 layer 2).
 */
export type HypothesisLocalFailureCode =
  | 'REQUEST_INVALID'
  | 'NO_STRUCTURED_OUTPUT_AVAILABLE'
  | 'MALFORMED_STRUCTURED_RESULT'
  | 'SCHEMA_VIOLATION'
  /** The persisted recovery anchor could not be read back as the protocol requires. */
  | 'RECOVERY_ANCHOR_UNREADABLE';

export interface HypothesisRuntimeFailure {
  readonly kind: 'runtime_failure';
  /** Set when the failure came from the adapter; `null` for application-local detection. */
  readonly ai_error: AiError | null;
  /** Set for application-local detection; `null` when `ai_error` is present. */
  readonly local_code: HypothesisLocalFailureCode | null;
  readonly detail: string;
  /** `true` when retrying the same request is meaningful (never a product-level cap). */
  readonly retryable: boolean;
  /** 🔴 Always `true`: a runtime failure never discards a stored `Hypothesis`. */
  readonly hypotheses_preserved: true;
}

export function hypothesisRuntimeFailureFromAiError(error: AiError): HypothesisRuntimeFailure {
  return {
    kind: 'runtime_failure',
    ai_error: error,
    local_code: null,
    detail: error.message,
    retryable: error.retryable,
    hypotheses_preserved: true,
  };
}

export function hypothesisRuntimeFailure(
  code: HypothesisLocalFailureCode,
  detail: string,
  retryable = true,
): HypothesisRuntimeFailure {
  return {
    kind: 'runtime_failure',
    ai_error: null,
    local_code: code,
    detail,
    retryable,
    hypotheses_preserved: true,
  };
}

/* ------------------------------------------------------------------ *
 * 3. Grounding (BINARY - §8.2 rule 1)
 * ------------------------------------------------------------------ */

/**
 * The ONLY two grounding outcomes.
 *
 * 🔴 `partial` / `weak` / `medium` / `strong` / any score or confidence is deliberately absent:
 *    「不存在『部分锚定』中间等级」(§8.2 rule 1 / `TQ34`).
 */
export type GroundingVerdictValue = 'grounded' | 'not_grounded';

export const GROUNDING_VERDICT_VALUES: readonly GroundingVerdictValue[] = [
  'grounded',
  'not_grounded',
];

/**
 * One grounding judgement.
 *
 * 🔴 `bases_hit` / `conditions_hit` are AUDIT labels, never a quality, strength or ordering input:
 *    a reviewer must be able to see WHICH basis anchored the hypothesis and WHICH condition
 *    defeated it. They are never combined into a number.
 */
export interface GroundingVerdict {
  readonly verdict: GroundingVerdictValue;
  readonly bases_hit: readonly GroundingBasis[];
  readonly conditions_hit: readonly NonGroundingCondition[];
  /** Who decided the semantic half: the deterministic rules, or the discrete `M10` check. */
  readonly semantic_source: 'structural_rules' | 'none' | 'discrete_ai_check';
  readonly reason: string;
}

/** The human-readable meaning of each grounding basis - transcribed from §8.2, never re-invented. */
export const GROUNDING_BASIS_LABELS: Readonly<Record<GroundingBasis, string>> = {
  G1: '问题对象 / 变量来自历史',
  G2: '条件来自历史',
  G3: '目标指标来自历史',
  G4: '排除项来自历史（历史已尝试且未达预期）',
};

/** The human-readable meaning of each non-grounding condition - transcribed from §8.2. */
export const NON_GROUNDING_CONDITION_LABELS: Readonly<Record<NonGroundingCondition, string>> = {
  N1: '只写「参考了历史」而没有可以指出的具体字段',
  N2: '引用无关记录',
  N3: '只有措辞相似，没有实质 grounding',
  N4: '关键变量完全来自模型先验',
  N5: '引用 Draft',
  N6: '所依赖的历史字段为「未知 / 未提供」',
};

/* ------------------------------------------------------------------ *
 * 4. Zero-output exits (§8.3 / §9.2)
 * ------------------------------------------------------------------ */

/**
 * The three step ⑨ exits.
 *
 * 🔴 The three are NOT interchangeable: `EXIT-B` / `EXIT-C` MUST NOT be presented as
 *    「历史证据不足」 (§9.2 / AC-98).
 */
export type HypothesisExitRoute = 'EXIT-A' | 'EXIT-B' | 'EXIT-C';

export const HYPOTHESIS_EXIT_ROUTES: readonly HypothesisExitRoute[] = [
  'EXIT-A',
  'EXIT-B',
  'EXIT-C',
];

export const HYPOTHESIS_EXIT_ROUTE_LABELS: Readonly<Record<HypothesisExitRoute, string>> = {
  'EXIT-A': 'evidence-insufficient',
  'EXIT-B': 'not-verifiable',
  'EXIT-C': 'not-formable',
};

/* ------------------------------------------------------------------ *
 * 5. Reasoning inputs (§24) - NEVER evidence
 * ------------------------------------------------------------------ */

/**
 * What a reasoning input IS.
 *
 * 🔴 This is deliberately a CLOSED list of four labels, so 「推理输入」can never grow into a fifth
 *    `EvidenceRef` role (§12 item 10).
 */
export type ReasoningInputKind =
  /** An `Insight` the user has already accepted - still never a grounding source (§5.2 rule 2). */
  | 'accepted_insight'
  /** 前序候选经验（未接受）- ⑨ does NOT wait for ⑧'s `E5`. */
  | 'candidate_insight_not_accepted'
  /** A `Model Suggestion` the user previously retained as content (never as a decision). */
  | 'saved_model_suggestion'
  /** The Retrieval Derivation whose comparison output fed this generation. */
  | 'retrieval_derivation';

export const REASONING_INPUT_KINDS: readonly ReasoningInputKind[] = [
  'accepted_insight',
  'candidate_insight_not_accepted',
  'saved_model_suggestion',
  'retrieval_derivation',
];

export const REASONING_INPUT_LABELS: Readonly<Record<ReasoningInputKind, string>> = {
  accepted_insight: '前序已接受经验（推理输入，非历史证据）',
  candidate_insight_not_accepted: '前序候选经验（未接受）',
  saved_model_suggestion: '此前保留的模型通用建议（非历史证据）',
  retrieval_derivation: '本次检索派生结果',
};

/**
 * One reasoning-only input identifier.
 *
 * 🔴 It is NOT an `EvidenceRef`: it carries `reasoning_only: true`, it is never counted toward
 *    `N_引用`, it never appears in ⑩ and it never carries grounding (§24 / R1-R6).
 */
export interface ReasoningInputRef {
  readonly kind: ReasoningInputKind;
  readonly ref_id: string;
  readonly label: string;
  readonly source_attempt_id: ObjectId<'ATT'> | null;
  /** 🔴 Always `true` - the structural marker that separates it from history evidence. */
  readonly reasoning_only: true;
}

export function reasoningInputRef(input: {
  readonly kind: ReasoningInputKind;
  readonly ref_id: string;
  readonly source_attempt_id: ObjectId<'ATT'> | null;
}): ReasoningInputRef {
  return {
    kind: input.kind,
    ref_id: input.ref_id,
    label: REASONING_INPUT_LABELS[input.kind],
    source_attempt_id: input.source_attempt_id,
    reasoning_only: true,
  };
}

/* ------------------------------------------------------------------ *
 * 6. The AI proposal (step ⑨ structured output)
 * ------------------------------------------------------------------ */

/**
 * One requested reference inside a step ⑨ proposal.
 *
 * 🔴 `M9` writes NO `EvidenceRef`: it hands these selections to `M7`, which validates them and
 *    constructs the frozen references (§9). `target_id` / `source_field_path` are plain strings ON
 *    PURPOSE - they are the runtime boundary at which a fabricated id or path is refused instead of
 *    being written into a reference.
 * 🔴 `grounding_basis` is what the model CLAIMS this landing point anchors. It is a claim to be
 *    verified structurally (`M9` maps it onto the landing point's carrier field), never a fact.
 */
export interface HypothesisEvidenceSelection {
  readonly target_id: string;
  readonly source_field_path: string;
  readonly role: RefRole;
  readonly grounding_basis: GroundingBasis | null;
}

/** A requested ⑤ kept-condition that refers to a condition the history ALREADY recorded. */
export interface HypothesisKeepHistoricalRefProposal {
  readonly kind: 'historical_ref';
  readonly target_id: string;
  readonly source_field_path: string;
}

/**
 * A requested ⑤ kept-condition the model merely RECOMMENDS.
 *
 * 🔴 It is an `Inference` (§8.6 rule 7 / §15 source B) and MUST NOT be written into ⑤ as a user
 *    `Fact`: `M9` stores it OUTSIDE the frozen `Hypothesis` (`kept_condition_recommendations`),
 *    never inside `kept_conditions`.
 */
export interface HypothesisKeepRecommendationProposal {
  readonly kind: 'model_recommendation';
  readonly text: string;
}

export type HypothesisKeepProposal =
  | HypothesisKeepHistoricalRefProposal
  | HypothesisKeepRecommendationProposal;

/** One proposed `History-grounded Hypothesis`, before any check has run. */
export interface GroundedHypothesisProposal {
  /** ① 待验证假设 */
  readonly hypothesis_statement: string;
  /** ② 假设依据 */
  readonly rationale: string;
  /** ④ 下一轮改变什么 */
  readonly next_change: string;
  /** ⑤ 哪些条件保持不变 - `null` = 显式缺失 */
  readonly keep: HypothesisKeepProposal | null;
  /** ⑥ 观察什么指标 - `null` = 显式缺失 */
  readonly observation_metric: string | null;
  /** ⑦ 什么结果支持 - `null` = 显式缺失 */
  readonly support_criterion: string | null;
  /** ⑧ 什么结果反驳 - `null` = 显式缺失 */
  readonly refutation_criterion: string | null;
  readonly evidence_selections: readonly HypothesisEvidenceSelection[];
  /** The G bases the model claims. 🔴 Verified structurally - the claim alone proves nothing. */
  readonly grounding_bases: readonly GroundingBasis[];
}

/**
 * One proposed `Model Suggestion`.
 *
 * 🔴 Same 8-item skeleton, but ②③ MUST NOT fabricate a historical basis and no evidence may be
 *    selected: a `Model Suggestion` stays `model_prior` for its whole life.
 */
export interface ModelSuggestionProposal {
  readonly hypothesis_statement: string;
  readonly rationale: string;
  readonly next_change: string;
  readonly keep: HypothesisKeepProposal | null;
  readonly observation_metric: string | null;
  readonly support_criterion: string | null;
  readonly refutation_criterion: string | null;
}

/** The step ⑨ answer. */
export interface HypothesisGenerationProposal {
  /** 🔴 0..2. `3` or more is refused; so is padding a second entry with a near-synonym. */
  readonly grounded: readonly GroundedHypothesisProposal[];
  /** 🔴 Counted separately; NEVER used to fill a `History-grounded` position. */
  readonly model_suggestions: readonly ModelSuggestionProposal[];
  /** `NONE` whenever at least one grounded hypothesis was formed; otherwise the claimed exit. */
  readonly exit_route: 'NONE' | HypothesisExitRoute;
  /** Present (and never blank) when `grounded` is empty, so a zero result is never silent. */
  readonly absence_statement: string | null;
}

/** The discrete grounding / verifiability check answer (`§8` / §18). */
export interface GroundingCheckEntryProposal {
  /** The `Hypothesis` identity this verdict belongs to - never an array index. */
  readonly hypothesis_id: string;
  /** 🔴 Binary only: `grounded` / `not_grounded`. No grade, no score, no confidence. */
  readonly grounding_check: string;
  /** The enumerable condition the reviewer saw, when it defeated the grounding. */
  readonly condition: string | null;
  readonly grounding_reason: string;
  /** 🔴 Binary only: may the ⑦⑧ pair be observed and told apart? */
  readonly criteria_check: string;
  readonly criteria_reason: string;
}

export interface GroundingCheckProposal {
  readonly checks: readonly GroundingCheckEntryProposal[];
}

/* ------------------------------------------------------------------ *
 * 7. Local payload issues (never silently repaired)
 * ------------------------------------------------------------------ */

export type HypothesisPayloadIssueCode =
  | 'SCHEMA_VIOLATION'
  | 'FORBIDDEN_SCORING_FIELD'
  /** 「已证实 / 已验证为事实 / 证明了 / 方法 X 已被证明无效」-wording (`D-038`). */
  | 'FORBIDDEN_WORDING'
  /** 「候选经验 / Candidate Insight / 经验资产」-wording: ⑨ produces no such object (§8.1). */
  | 'FORBIDDEN_OBJECT_NAMING'
  /** `partial_grounding` / 「部分锚定」: grounding is binary (§8.2 rule 1 / `TQ34`). */
  | 'FORBIDDEN_PARTIAL_GROUNDING'
  /** A `source_partition` / 「混合来源」label attempted by the model (never a third label). */
  | 'FORBIDDEN_MIXED_SOURCE_PARTITION'
  /** The model tried to decide the object: only a user action may (`§22`). */
  | 'AI_CLAIMED_DECISION_STATE'
  /** The model tried to declare itself `grounded` with a boolean instead of being checked (§8). */
  | 'AI_CLAIMED_GROUNDING_FLAG'
  /** The model claimed history grounding while no legal grounding source exists (§6). */
  | 'GROUNDED_WITHOUT_GROUNDING_SOURCES'
  /** More than two `History-grounded` entries (§8.3 / Q3). */
  | 'TOO_MANY_GROUNDED_HYPOTHESES'
  /** Two grounded entries that are the same change over the same evidence (§8.3 / Q4). */
  | 'GROUNDED_COUNT_PADDING'
  | 'DUPLICATE_HYPOTHESIS_STATEMENT'
  /** A `Model Suggestion` selected evidence, or claimed a historical basis (§8.4). */
  | 'MODEL_SUGGESTION_SELECTED_EVIDENCE'
  | 'MODEL_SUGGESTION_CLAIMS_HISTORY'
  /** ⑤ asked to keep an unknown history field unchanged (§8.6 rule 7 / K5). */
  | 'KEEP_UNCHANGED_WITHOUT_HISTORICAL_FACT'
  /** A general rule asserted from a single-record evidence base (`D-007` / `D-021 E4`). */
  | 'GENERALIZED_CLAIM_FROM_SINGLE_SOURCE'
  /** ⑦⑧ are vague, identical, or cannot be told apart (§18 / C8). */
  | 'UNVERIFIABLE_CRITERIA'
  | 'ZERO_OUTPUT_WITHOUT_EXPLICIT_STATEMENT'
  /** `EXIT-B` / `EXIT-C` presented as 「历史证据不足」 (§9.2 / Q9). */
  | 'EXIT_B_OR_C_MISLABELLED_AS_EVIDENCE_INSUFFICIENT';

export interface HypothesisPayloadIssue {
  readonly code: HypothesisPayloadIssueCode;
  /** Dotted position inside the answer, e.g. `grounded[1].rationale`; `''` for the root. */
  readonly path: string;
  readonly detail: string;
}

/* ------------------------------------------------------------------ *
 * 8. Generation batch + the durable operation anchor (§2.4 / §34 / §36)
 * ------------------------------------------------------------------ */

/**
 * One explicit step ⑨ generation = ONE generation batch.
 *
 * 🔴 A BATCH RELATION, never a version number: the latest batch only means 「当前生成结果」 - it is
 *    NOT more correct, NOT stronger and NOT more trustworthy (§2.4 / `D-051` / AC-122).
 */
export interface HypothesisGenerationBatch {
  readonly batch_id: string;
  readonly source_attempt_id: ObjectId<'ATT'>;
  /** The idempotency handle of the generation operation that produced this batch. */
  readonly operation_id: string;
  /** The hypotheses this batch produced; may be empty (a legal zero-output result). */
  readonly hypothesis_ids: readonly ObjectId<'HYP'>[];
  /** The `Model Suggestion`s this batch produced; counted separately, never part of the 1-2. */
  readonly model_suggestion_ids: readonly ObjectId<'HYP'>[];
  /** `null` whenever the batch produced at least one grounded hypothesis. */
  readonly exit_route: HypothesisExitRoute | null;
  /** 🔴 Never blank for a zero-output batch: a silent zero result is refused (§9.2 / D-047). */
  readonly absence_statement: string | null;
  readonly created_at: string;
}

/**
 * The DURABLE OPERATION ANCHOR of one step ⑨ generation (§36).
 *
 * 🔴 WHY IT EXISTS: a step ⑨ generation writes SEVERAL files (one or two hypotheses, plus the batch
 *    record). If the write sequence is interrupted, a retry with the SAME `operation_id` must
 *    complete to a CONSISTENT state - no duplicate hypotheses, no second batch, and never a partial
 *    write presented as a successful generation.
 * 🔴 It is a RECOVERY PROTOCOL, not an atomic transaction: `WorkspaceStorage` offers no transaction
 *    primitive, so this module does NOT claim atomicity. What it guarantees is REPLAY RECOVERY -
 *    the anchor carries the COMPLETE materialised plan, so replaying the same `operation_id`
 *    re-writes exactly the same identities from the plan instead of minting new ones.
 */
export type OperationAnchorStatus = 'in_progress' | 'complete';

export interface HypothesisOperationAnchor {
  /** Path-safe, INJECTIVE encoding of `operation_id` (+ the source record it belongs to). */
  readonly operation_key: string;
  readonly operation_id: string;
  readonly source_attempt_id: ObjectId<'ATT'>;
  readonly batch_id: string;
  readonly status: OperationAnchorStatus;
  /**
   * The COMPLETE materialised plan: every stored record (with its minted id, its already-built
   * `EvidenceRef`s and its ⑥⑦⑧ columns) plus the batch record. Written in ONE storage write, so a
   * replay never re-asks a model and never mints a second identity.
   */
  readonly planned_records: readonly HypothesisRecord[];
  readonly planned_batch: HypothesisGenerationBatch;
  readonly created_at: string;
}

/* ------------------------------------------------------------------ *
 * 9. The stored record
 * ------------------------------------------------------------------ */

/**
 * The stored form of one `Hypothesis`.
 *
 * 🔴 `hypothesis` is the FROZEN domain object, verbatim. This wrapper adds ONLY `M9`-local,
 *    non-frozen material - exactly the discipline `M8` used for `comparison_ref` / `meta`. It
 *    changes no frozen semantics and introduces no second vocabulary for a frozen concept.
 * 🔴 `kept_condition_recommendations` exists because the FROZEN ⑤ holds REFERENCES to existing
 *    `Fact` / `Extraction` items only, while §15 requires the AI's 「下一轮保持 X」 recommendation
 *    (an `Inference`) to be kept in a SEPARATE column rather than merged into ⑤.
 */
export interface HypothesisRecord {
  readonly hypothesis: Hypothesis;
  /** ⑤ source B: AI keep recommendations - always `Inference`, never merged into `kept_conditions`. */
  readonly kept_condition_recommendations: readonly InferenceContentItem[];
  /** Reasoning-only inputs; structurally distinct from history evidence (§24). */
  readonly reasoning_input_refs: readonly ReasoningInputRef[];
  /** The whole-partition annotation of a `Model Suggestion`; `null` for a grounded hypothesis. */
  readonly model_prior_notice: string | null;
}

/** Fields the repository is allowed to change. Identity, provenance and ①②③④⑤ are immutable. */
export interface HypothesisPatch {
  readonly decision_state?: Hypothesis['decision_state'];
  /** The `Model Suggestion` SAVE slot. 🔴 Independent of the decision slot (`D-042`). */
  readonly saved?: boolean;
  readonly editable_items?: HypothesisEditableItems;
  readonly updated_at?: string;
}

/* ------------------------------------------------------------------ *
 * 10. Views
 * ------------------------------------------------------------------ */

/** Explicit presence of ONE of the 8 items - derived, so it can never drift (§13 / H3). */
export type HypothesisItemPresence = 'present' | 'missing';

/**
 * The derived `evidence_overview` (§26).
 *
 * 🔴 DERIVED ON EVERY READ - never persisted, so a second drifting copy of `N_引用` cannot exist.
 * 🔴 It may state the count, whether a single source carried it, whether conflicting evidence
 *    exists and whether a condition was missing. It MUST NOT state evidence strength, a
 *    high / medium / low grade, a score or a confidence.
 */
export interface EvidenceOverview {
  /** The actual `N_引用`, read from `M7`'s single derivation. */
  readonly n_citation: number;
  /** Distinct records taking part. Same number by definition, named for the reader's benefit. */
  readonly distinct_record_count: number;
  readonly single_source: boolean;
  /** `true` when BOTH a `support` and a `contradict` reference exist - they are then juxtaposed. */
  readonly has_conflict: boolean;
  /** `null` unless conflicting historical evidence is present (§27). */
  readonly conflict_note: string | null;
  /** `null` unless some historically relevant condition could not be compared (§26). */
  readonly missing_condition_note: string | null;
}

/**
 * One `Hypothesis` as the product reads it.
 *
 * 🔴 The citation view and the ⑩ traceability list are DERIVED on every read from the SAME stored
 *    `evidence_refs` set: there is deliberately no writable second copy of `N_引用` anywhere.
 */
export interface HypothesisView {
  readonly hypothesis: Hypothesis;
  /** Derived presence of each of the 8 items, in canonical order (§13 / H1-H3). */
  readonly item_presence: Readonly<Record<string, HypothesisItemPresence>>;
  /** ①-⑤ are system-managed and read-only; listed so the boundary is explicit (§8.6 / D-049). */
  readonly read_only_field_keys: readonly string[];
  /** ⑥⑦⑧ may only gain user `Fact` items; AI `Inference` items are never shown as user facts. */
  readonly editable_field_keys: readonly string[];
  /** ⑤ source B: the AI's keep recommendation, kept OUTSIDE ⑤. */
  readonly kept_condition_recommendations: readonly InferenceContentItem[];
  readonly reasoning_input_refs: readonly ReasoningInputRef[];
  /** The permanent whole-partition annotation of a `Model Suggestion`; `null` otherwise. */
  readonly model_prior_notice: string | null;
  /** Derived by `M7`'s single `N_引用` derivation - never recounted here. */
  readonly citation: CitationView;
  /** Derived by `M7`'s single ⑩ traceability derivation - the same set as the count. */
  readonly traceability: readonly TraceableEvidenceView[];
  /** Derived evidence overview; never stored (§26). */
  readonly evidence_overview: EvidenceOverview;
  /**
   * The meaning of the SAVE slot, as a canonical sentence.
   *
   * 🔴 `saved = true` + `undecided` may ONLY read as 「内容被保留，决策状态仍未完成」; it must never
   *    read as 已接受 / 已采纳 / 已确认 (`D-042` / `§8.4` / AC-68 / AC-70).
   */
  readonly save_meaning: string | null;
  /** `true` exactly when a `Model Suggestion` is saved but still undecided (frozen helper). */
  readonly is_saved_but_undecided: boolean;
  /**
   * Which source partitions are actually present (§8.2 rule 2).
   * 🔴 Two entries may legitimately be present; there is NO third 「混合」 label.
   */
  readonly source_partitions: readonly SourcePartition[];
  /** Structure-only: is either decision reachable right now? The action itself stays a user act. */
  readonly can_accept: boolean;
  readonly can_reject: boolean;
  /** 🔴 Always `false`: no `Hypothesis` ever converts into an `Experience Asset` (§8.5 / AC-41). */
  readonly is_experience_asset: false;
}

/* ------------------------------------------------------------------ *
 * 11. Commands
 * ------------------------------------------------------------------ */

export interface GenerateHypothesesCommand {
  /** Idempotency handle supplied by `M15`. Replaying it MUST NOT create a second batch (§35). */
  readonly operation_id: string;
  readonly source_attempt_id: ObjectId<'ATT'>;
  /**
   * 🔴 `true` ONLY when the user explicitly asked for another generation (§34).
   *    A second generation with a NEW `operation_id` but without this flag is refused
   *    (`REGENERATION_REQUIRED`) instead of quietly producing a second batch.
   * 🔴 It is NOT a semantic edit: older hypotheses keep their decision slot, and an older
   *    `accepted` hypothesis stays `accepted`.
   */
  readonly explicit_regeneration?: boolean;
}

export interface HypothesisIdCommand {
  readonly operation_id: string;
  readonly hypothesis_id: ObjectId<'HYP'>;
}

export interface AcceptHypothesisCommand extends HypothesisIdCommand {
  /** 🔴 The ONE and only way the decision slot may become `accepted` (§22). */
  readonly user_explicitly_accepted: boolean;
}

/**
 * Save a `Model Suggestion` as retained CONTENT.
 *
 * 🔴 This is the SAVE slot, never the DECISION slot (`D-042`). It MUST NOT touch
 *    `decision_state`, and `acceptHypothesis` MUST NOT touch `saved`.
 */
export interface SaveModelSuggestionCommand extends HypothesisIdCommand {
  readonly saved: boolean;
}

/** A user-provided ⑥⑦⑧ item. 🔴 Always stored as a `Fact`, never as an `Inference`. */
export interface HypothesisUserEditableItemInput {
  readonly slot: HypothesisEditableSlot;
  readonly content_item_id: string;
  readonly value: string;
}

/**
 * Add or replace USER `Fact` items for ⑥⑦⑧.
 *
 * 🔴 The AI's original `Inference` proposals are never physically removed (§37): the two columns
 *    stay separate and the read model presents the user's items first.
 */
export interface EditHypothesisCriteriaCommand extends HypothesisIdCommand {
  readonly user_items: readonly HypothesisUserEditableItemInput[];
}

/** Decide ONE AI-proposed ⑥⑦⑧ criterion. 🔴 Changes only its `decision_state` (§38 / C6). */
export interface DecideHypothesisCriterionCommand extends HypothesisIdCommand {
  readonly content_item_id: string;
  readonly decision_state: 'accepted' | 'rejected' | 'unresolved';
}

export interface ListHypothesesQuery {
  readonly source_attempt_id?: ObjectId<'ATT'>;
}

/* ------------------------------------------------------------------ *
 * 12. Outcomes
 * ------------------------------------------------------------------ */

/** One proposal that was NOT admitted, with its enumerable reason - never a silent drop. */
export interface RejectedProposal {
  readonly index: number;
  /** The `Hypothesis` id it would have had; `null` when it never reached identity minting. */
  readonly hypothesis_id: ObjectId<'HYP'> | null;
  readonly stage: 'payload' | 'structure' | 'grounding' | 'evidence' | 'verifiability';
  readonly conditions: readonly NonGroundingCondition[];
  readonly detail: string;
}

export interface HypothesesGeneratedOutcome {
  readonly kind: 'generated';
  readonly batch: HypothesisGenerationBatch;
  /** `1..2` grounded hypotheses. All start `undecided` (§22). */
  readonly hypotheses: readonly Hypothesis[];
  /** `0..n` `Model Suggestion`s, counted separately and stored with `saved = false`. */
  readonly model_suggestions: readonly Hypothesis[];
  /** Every proposal that was not admitted, with its reason. */
  readonly rejected_proposals: readonly RejectedProposal[];
  readonly idempotent_replay: boolean;
}

export interface HypothesisZeroOutputOutcome {
  readonly kind: 'zero_output';
  readonly batch: HypothesisGenerationBatch;
  readonly exit_route: HypothesisExitRoute;
  /** Never blank: a zero result must say why (§9.2 / `D-047`). */
  readonly absence_statement: string;
  /** Model Suggestion may still be offered when no grounded hypothesis could be formed. */
  readonly model_suggestions: readonly Hypothesis[];
  readonly rejected_proposals: readonly RejectedProposal[];
  readonly idempotent_replay: boolean;
}

export type HypothesisGenerationRefusalCode =
  | 'SOURCE_ATTEMPT_NOT_FOUND'
  | 'REGENERATION_REQUIRED'
  /** The same idempotency handle was reused for a different source record. */
  | 'OPERATION_ID_CONFLICT'
  | 'EVIDENCE_SELECTION_REFUSED'
  | 'AI_PROPOSAL_REJECTED'
  /** A `History-grounded` hypothesis whose own `N_引用` would be 0 (§8) - fail-closed. */
  | 'GROUNDING_WITHOUT_TRACEABLE_REFERENCE'
  /** The recovery anchor exists but cannot be replayed (§36). */
  | 'PERSISTENCE_RECOVERY_BLOCKED';

/**
 * A step ⑨ refusal.
 *
 * 🔴 Nothing is persisted: no `Hypothesis`, no batch, no reference. A refusal is always explicit
 *    and enumerable - `M9` never drops a refused reference and continues (§9).
 */
export interface HypothesisGenerationRefusedOutcome {
  readonly kind: 'refused';
  readonly code: HypothesisGenerationRefusalCode;
  readonly detail: string;
  /** Every `M7` rejection, in the order they were found. Empty when the refusal is not `M7`'s. */
  readonly rejections: readonly GroundingRejection[];
  /** Every local payload issue. Empty when the refusal is not a payload refusal. */
  readonly issues: readonly HypothesisPayloadIssue[];
  readonly retryable: boolean;
}

export type GenerateHypothesesOutcome =
  | HypothesesGeneratedOutcome
  | HypothesisZeroOutputOutcome
  | HypothesisGenerationRefusedOutcome
  | HypothesisRuntimeFailure;

export type HypothesisActionRejectionCode =
  | 'HYPOTHESIS_NOT_FOUND'
  | 'INVALID_COMMAND'
  | 'NOT_A_CANONICAL_DECISION'
  /** 🔴 A `History-grounded Hypothesis` has NO save slot; `saved` stays `null` (§2.3). */
  | 'NOT_A_MODEL_SUGGESTION'
  /** 🔴 `accept` never implies `saved`, and `save` never implies `accept` (`D-042` / AC-70). */
  | 'SAVE_AND_DECISION_ARE_INDEPENDENT'
  | 'READ_ONLY_ITEM'
  | 'INVALID_CRITERION_TARGET';

export interface HypothesisActionRejection {
  readonly kind: 'rejected';
  readonly code: HypothesisActionRejectionCode;
  readonly detail: string;
  /** The stored record, unchanged by the refused action; `null` only when it does not exist. */
  readonly hypothesis: Hypothesis | null;
  readonly retryable: boolean;
}

export interface HypothesisActionApplied {
  readonly kind: 'applied';
  readonly hypothesis: Hypothesis;
  readonly view: HypothesisView;
  readonly idempotent_replay: boolean;
}

export type HypothesisActionOutcome =
  | HypothesisActionApplied
  | HypothesisActionRejection
  | HypothesisRuntimeFailure;

/* ------------------------------------------------------------------ *
 * 13. Service
 * ------------------------------------------------------------------ */

/**
 * The narrow `M8` read port step ⑨ consumes.
 *
 * 🔴 `M9` needs the `Insight` READ model and nothing else: ⑨ does not run ⑧, does not accept an
 *    `Insight` and does NOT wait for `E5`. `M8`'s `InsightService` satisfies this shape
 *    structurally, so no implementation detail of `M8` is imported here.
 */
export interface ReasoningInputInsightSource {
  listInsightsBySourceAttempt(
    source_attempt_id: ObjectId<'ATT'>,
  ): Promise<readonly InsightView[]>;
}

/**
 * `M9` application service - `D9` steps ⑨ and ⑩.
 *
 * 🔴 The generation entry point is EXPLICIT and command-driven. Nothing here listens to a timer, a
 *    file change, a page open, a `Formal` save or a step ⑧ acceptance (`D-022`).
 */
export interface HypothesisService {
  /** 「D9 第 ⑨ 步」- the ONE and only generation moment. Called by `M15`. */
  generateHypotheses(command: GenerateHypothesesCommand): Promise<GenerateHypothesesOutcome>;
  /** An EXPLICIT regeneration: a new batch over the CURRENT derivation (§34). */
  regenerateHypotheses(command: GenerateHypothesesCommand): Promise<GenerateHypothesesOutcome>;

  readHypothesis(hypothesis_id: ObjectId<'HYP'>): Promise<HypothesisView | null>;
  listHypothesesBySourceAttempt(
    source_attempt_id: ObjectId<'ATT'>,
  ): Promise<readonly HypothesisView[]>;
  listGenerationBatches(
    source_attempt_id: ObjectId<'ATT'>,
  ): Promise<readonly HypothesisGenerationBatch[]>;

  /** 🔴 "I accept this as a direction worth verifying next" - NOT "this is supported". */
  acceptHypothesis(command: AcceptHypothesisCommand): Promise<HypothesisActionOutcome>;
  /** 🔴 Rejecting a direction is always a user action; nothing auto-rejects. */
  rejectHypothesis(command: HypothesisIdCommand): Promise<HypothesisActionOutcome>;
  /** Retain the CONTENT of a `Model Suggestion`. 🔴 Never a decision (`D-042`). */
  saveModelSuggestion(command: SaveModelSuggestionCommand): Promise<HypothesisActionOutcome>;
  /** Add / replace USER `Fact` items for ⑥⑦⑧. 🔴 ①②③④⑤ stay read-only (§8.6). */
  editHypothesisCriteria(command: EditHypothesisCriteriaCommand): Promise<HypothesisActionOutcome>;
  /** Decide ONE AI-proposed criterion. 🔴 Keeps its `Inference` source type (§38). */
  decideHypothesisCriterion(
    command: DecideHypothesisCriterionCommand,
  ): Promise<HypothesisActionOutcome>;

  /**
   * Step ⑩ on its own: the traceability list and `N_引用` of ONE stored hypothesis, derived from
   * the SAME stored reference set on every call.
   */
  traceHypothesis(hypothesis_id: ObjectId<'HYP'>): Promise<HypothesisTraceView | null>;
}

/** The ⑩ view of one hypothesis (§9 / §25). */
export interface HypothesisTraceView {
  readonly owner_id: ObjectId<'HYP'>;
  readonly kind: HypothesisKind;
  readonly citation: CitationView;
  readonly traceability: readonly TraceableEvidenceView[];
  /** `[]` and `0` for a `Model Suggestion` - it is never traced as historical evidence (§8.4). */
  readonly model_suggestion_has_no_trace: boolean;
}

/** The source layer of ONE referenced landing point, as ⑩ reports it. */
export interface TraceLandingLayer {
  readonly content_item_id: string;
  readonly source_type: SourceType;
}

/** A ⑤ reference resolved against the CURRENT workspace, for display. */
export interface ResolvedKeptCondition {
  readonly ref: KeptConditionFactRef;
  readonly source_type: SourceType | null;
  readonly value: string | null;
  readonly resolves: boolean;
}
