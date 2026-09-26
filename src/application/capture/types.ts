/**
 * S01-05 ｜ Application layer for `D9` steps ①–⑤ (Attempt capture → structured parse →
 *            user confirmation → candidate failure causes → user decision / save).
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md (**v0.3 FROZEN / IMPLEMENTATION BASIS**)
 *   - §2.1   `Draft` / `Formal` two-level state + the Formal prerequisite set;
 *   - §4.1   Fact / Extraction / Inference｜display / Inference｜decision;
 *   - §4.2   source_type is invariant; follow-up answers are stored in two layers;
 *   - §4.3   the decision-type `Inference` reuse gate (AC-10 calibrated wording);
 *   - §6/§9  step ① gate, step ② parse, step ③ integral confirmation, step ④ candidate
 *            causes, step ⑤ explicit user confirmation → `Formal Attempt`;
 *   - §11.1  the four L4 product-layer automatic records.
 *
 * 🔴 SCOPE: this module owns steps ①–⑤ ONLY. It contains NO retriever, NO comparator, NO
 *    grounding, NO `Insight` and NO `Hypothesis` generation (those are S01-03 / `M7`–`M9`).
 *
 * 🔴 DEPENDENCY DIRECTION: `src/domain/**` + `src/workspace/**` + `src/ai/**` (the `M10`
 *    interface) and NOTHING else. There is deliberately no import of `src/browser/**`,
 *    `src/server/**`, `api/proxy/**`, `src/ui/**` or `app/**` anywhere in this directory, and
 *    the concrete provider adapter is INJECTED by the future `M15` composition root.
 *
 * 🔴 CREDENTIAL BOUNDARY: this layer may hold a `CredentialRef` (an opaque, non-secret handle)
 *    and can NEVER represent a secret - the secret type is not imported at all.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, NO ambient storage.
 */

import type { ProviderAdapter } from '../../ai/provider/adapter.js';
import type { CredentialRef } from '../../ai/provider/credential.js';
import type { AiError } from '../../ai/provider/result.js';
import type { FollowUpGapKey } from '../../domain/types/follow-up.js';

/* ------------------------------------------------------------------ *
 * 1. Fields the application handles
 * ------------------------------------------------------------------ */

/**
 * Level A / optional content fields AI may EXTRACT from the user's raw text.
 *
 * 🔴 `occurred_at` and `cost` are deliberately ABSENT: both are user-`Fact`-only fields
 *    (§4.2 rule 5 / AC-52 - a cost is never estimated, an occurrence time is never
 *    system-generated). `result_status` is also absent from this list because it is not a
 *    plain extraction: it is a decision-type `Inference` proposed by AI and only usable
 *    after an EXPLICIT user acceptance (§4.3 / AC-Q06-6).
 */
export type CaptureFieldKey =
  | 'goal'
  | 'actual_attempt'
  | 'condition'
  | 'actual_result'
  | 'expected_result'
  | 'judgment_basis'
  | 'environment'
  | 'user_note';

export const CAPTURE_FIELD_KEYS: readonly CaptureFieldKey[] = [
  'goal',
  'actual_attempt',
  'condition',
  'actual_result',
  'expected_result',
  'judgment_basis',
  'environment',
  'user_note',
];

/**
 * 关键追问缺口词汇（`P1` / `P2` / `P3`）。
 *
 * 🔴 **归属变更（S01-05-INTEGRATE，非语义变更）**：该词汇已下沉到
 *    `src/domain/types/follow-up.ts`，因为 docs/02 §C.5 的 `Attempt Draft State`
 *    （`abandoned_gap_set` / `gap_priority_hint`）必须用同一套类型表达。
 *    此处**原样再导出**，既有 import 路径全部继续有效。
 */
export * from '../../domain/types/follow-up.js';

/* ------------------------------------------------------------------ *
 * 2. Provider context (M10 only)
 * ------------------------------------------------------------------ */

/**
 * The AI context this layer is allowed to hold.
 *
 * 🔴 It carries the `M10` `ProviderAdapter` INTERFACE and an opaque `CredentialRef` - never a
 *    concrete adapter class, never a transport client module, never a secret. `M15` builds this
 *    object.
 */
export interface CaptureProviderContext {
  readonly adapter: ProviderAdapter;
  /** `null` only for a provider that needs no credential; the adapter then fails explicitly. */
  readonly credential_ref: CredentialRef | null;
}

/* ------------------------------------------------------------------ *
 * 3. Runtime failure vocabulary (NOT a product semantic result)
 * ------------------------------------------------------------------ */

/**
 * Application-local failure codes. The `M10` `AiErrorCode` family stays authoritative for
 * everything the adapter itself reports; these codes cover detection that happens BEFORE the
 * adapter is called or AFTER a structurally unusable answer arrives.
 *
 * 🔴 A runtime failure is NEVER an invalid Attempt: the Draft, the user's text and every
 *    already-saved value are preserved and a retry is always allowed (§10.1 layer 2 / AC-89).
 */
export type CaptureLocalFailureCode =
  | 'REQUEST_INVALID'
  | 'NO_STRUCTURED_OUTPUT_AVAILABLE'
  | 'MALFORMED_STRUCTURED_RESULT'
  | 'SCHEMA_VIOLATION'
  | 'FORBIDDEN_NUMERIC_FIELD'
  | 'ZERO_CAUSE_WITHOUT_EXPLICIT_STATEMENT';

export interface CaptureRuntimeFailure {
  readonly kind: 'runtime_failure';
  /** Set when the failure came from the adapter; `null` for application-local detection. */
  readonly ai_error: AiError | null;
  /** Set for application-local detection; `null` when `ai_error` is present. */
  readonly local_code: CaptureLocalFailureCode | null;
  readonly detail: string;
  /** `true` when retrying the same request is meaningful (never a product-level cap). */
  readonly retryable: boolean;
  /** 🔴 Always `true`: a runtime failure never discards the Draft (AC-89). */
  readonly draft_preserved: true;
}

export function runtimeFailureFromAiError(error: AiError): CaptureRuntimeFailure {
  return {
    kind: 'runtime_failure',
    ai_error: error,
    local_code: null,
    detail: error.message,
    retryable: error.retryable,
    draft_preserved: true,
  };
}

export function runtimeFailure(
  code: CaptureLocalFailureCode,
  detail: string,
  retryable = true,
): CaptureRuntimeFailure {
  return {
    kind: 'runtime_failure',
    ai_error: null,
    local_code: code,
    detail,
    retryable,
    draft_preserved: true,
  };
}

/* ------------------------------------------------------------------ *
 * 4. Step ① validation
 * ------------------------------------------------------------------ */

export type CaptureInputRejectionCode = 'EMPTY_OR_WHITESPACE_ONLY';

/**
 * Step ① outcome.
 *
 * 🔴 Rejection is an ENTRY HINT, not a system error: the single gate is "non-empty and not
 *    pure whitespace" (§9 ① / `D-047` / AC-87), and no character-count threshold, sentence
 *    count or AI pre-judgement may be reintroduced (AC-88).
 */
export type CaptureInputValidation =
  | { readonly kind: 'accepted'; readonly raw_text: string }
  | {
      readonly kind: 'rejected';
      readonly code: CaptureInputRejectionCode;
      readonly entry_hint: string;
    };

/* ------------------------------------------------------------------ *
 * 5. Step ② structured parse
 * ------------------------------------------------------------------ */

/**
 * 🔴 Application-local, NON-GRADED parse status **reported by the provider for one call**
 *    (§9 ②: 已抽取 / 未抽取 / 抽取失败 / 待用户确认).
 *    It describes what THIS AI answer achieved and lives only for the duration of the call.
 *
 * 🔴 It is NOT the persisted `Attempt Draft State.parse_state` (docs/02 §C.5, see
 *    `AttemptParseState` in `src/domain/types/follow-up.ts`). The persisted state is
 *    derived from the parse OUTCOME plus the record's position in the ②/③ sub-flow and is
 *    what survives a browser reload. Mixing the two would put a per-call provider report into
 *    the product record, so they are deliberately kept apart.
 *
 * 🔴 Never a confidence, a completeness percentage or a quality level (AC-88 / AC-93).
 */
export type ParseRuntimeStatus =
  | 'extracted'
  | 'partially_extracted'
  | 'failed_to_extract'
  | 'pending_user_confirmation';

export const PARSE_RUNTIME_STATUSES: readonly ParseRuntimeStatus[] = [
  'extracted',
  'partially_extracted',
  'failed_to_extract',
  'pending_user_confirmation',
];

/**
 * One field the parse could support from the user's own words.
 * 🔴 `source_type` is fixed to `Extraction`: AI-extracted content is never a `Fact` (§4.1).
 */
export interface ParsedFieldExtraction {
  readonly field: CaptureFieldKey | 'key_parameters';
  readonly value: string;
}

/**
 * One key parameter the parse could support, **together with its stable item identity**.
 *
 * 🔴 The identity is minted ONCE, at creation time (`newContentItemId`), and then carried with
 *    the item. It is **never** recomputed from the array index, the array length, the display
 *    order or the sort position, and it is **not** derived from the value text - two parameters
 *    may legitimately carry the same text and still be two distinct objects (contract §3.2).
 * 🔴 Because the identity travels with the item, it is the SAME identity in the persisted
 *    content-item collection and in `Attempt.key_parameters`, and reordering that list can never
 *    swap two items' identities.
 */
export interface ParsedKeyParameter {
  readonly content_item_id: string;
  readonly value: string;
}

/**
 * The application-local parse proposal.
 *
 * 🔴 A field that is absent from `extractions` (and from `key_parameters`) is `unknown` - never
 *    an empty string and never a sentinel such as "N/A" / "未知" / "无" (§4.2 rule 7 / AC-04).
 * 🔴 `result_status_proposal` is an UNRESOLVED decision-type `Inference`: it becomes usable
 *    only after the user explicitly accepts it (§4.3 / AC-10 / AC-Q06-6).
 */
export interface StructuredParseProposal {
  readonly attempt_id: string;
  readonly parse_status: ParseRuntimeStatus;
  readonly extractions: readonly ParsedFieldExtraction[];
  readonly key_parameters: readonly ParsedKeyParameter[];
  readonly missing_fields: readonly CaptureFieldKey[];
  readonly result_status_proposal: string | null;
}

export type StructuredParseOutcome =
  | { readonly kind: 'parsed'; readonly proposal: StructuredParseProposal }
  | CaptureRuntimeFailure;

/* ------------------------------------------------------------------ *
 * 6. Step ③ user confirmation
 * ------------------------------------------------------------------ */

/**
 * A content slot the user may correct / fill in.
 * `key_parameters` is included because a parameter the user states themselves is a user value.
 */
export type CaptureContentKey = CaptureFieldKey | 'key_parameters';

/** A single-value user correction / addition. The recorded value is user-sourced content. */
export interface CaptureFieldCorrection {
  readonly field: CaptureContentKey;
  readonly value: string;
  /**
   * 🔴 追问溯源信号（request parameter, NOT a product field）：
   *    当这个取值是用户对**关键追问问题**的回答时，填入该问题瞄准的 canonical 缺口。
   *
   * 它触发的行为**全部来自既有 Frozen 语义**（contract §4.2 rule 3 / `D-024` / AC-30）：
   *   ① 用户原话落为一条 `Fact` 内容条目（`field_key = followup_user_answer`）；
   *   ② 同一主字段上被覆盖的 AI 归纳落为一条**独立** `Extraction` 内容条目
   *      （`field_key = followup_ai_extraction`）；
   *   ③ 主字段本身仍按既有确认规则更新为「用户提供的取值 = 用户 `Fact`」，因此追问答案
   *      绝不会变成「孤岛内容条目」（§9 ③）。
   * 省略该参数时，行为与 S01-05 完全一致（普通修正，不产生追问溯源条目）。
   */
  readonly answer_to_gap?: FollowUpGapKey;
}

/**
 * The user's explicit decision about the proposed result status.
 * 🔴 `unresolved` is the default: an un-decided decision-type `Inference` is never reusable
 *    (§4.3) and never becomes the Formal prerequisite (§2.1 / AC-10).
 */
export type ResultStatusDecision = 'unresolved' | 'accepted' | 'rejected';

export interface StructuredConfirmationRequest {
  /** Idempotency handle supplied by `M15` (see `OperationLedger`). */
  readonly operation_id: string;
  readonly attempt_id: string;
  /** Fields the user rewrote / added - recorded as user `Fact` content (§9 ③). */
  readonly corrections?: readonly CaptureFieldCorrection[];
  /** Free-form user tags. Never required, never graded, never a save condition (AC-12). */
  readonly failure_tags?: readonly string[];
  readonly result_status?: {
    readonly decision: ResultStatusDecision;
    /** The user's own wording; when omitted the AI proposal text is kept verbatim. */
    readonly value?: string;
  };
  /**
   * 🔴 `true` only when the user performed the explicit confirmation action.
   *    Nothing is promoted to `Formal` without it (§2.1 / AC-Q06-5).
   */
  readonly user_confirmed: boolean;
}

/* ------------------------------------------------------------------ *
 * 7. Step ④ / ⑤ candidate failure causes
 * ------------------------------------------------------------------ */

/**
 * One AI-proposed candidate failure cause.
 *
 * 🔴 `source_type` is fixed to `Inference` + `confirmation_class = 'decision'`: a cause is an
 *    AI judgement that will be reused as a basis, therefore it requires an explicit user
 *    accept / reject (§4.1 / §4.3 / D-048).
 * 🔴 There is NO confidence, probability, contribution or importance field (AC-93 / D-020).
 */
export interface CandidateCauseProposal {
  readonly content_item_id: string;
  readonly source_type: 'Inference';
  readonly confirmation_class: 'decision';
  readonly statement: string;
  /**
   * Application-local, non-scoring supporting references: the Attempt field paths / content
   * item ids the statement is derived from. 🔴 Empty is legal.
   */
  readonly supporting_source_paths: readonly string[];
  /** Always `unresolved` on generation: an untouched cause is never "accepted" (AC-94). */
  readonly decision_state: 'unresolved';
}

export interface CauseAnalysisProposal {
  readonly attempt_id: string;
  /** 🔴 May be empty - a legal, non-blocking outcome (§9 ④ / AC-91). */
  readonly candidates: readonly CandidateCauseProposal[];
  /**
   * Present ONLY when `candidates` is empty, and then never blank: a 0-cause result must say
   * 「当前依据不足，暂不推断原因」or an equivalent explicit sentence (AC-92).
   */
  readonly absence_statement: string | null;
}

export type CauseAnalysisOutcome =
  | { readonly kind: 'analysed'; readonly proposal: CauseAnalysisProposal }
  | CaptureRuntimeFailure;

/** The user's decision about one candidate cause. `unresolved` = leave it untouched. */
export type CauseDecision = 'accepted' | 'rejected' | 'unresolved';

export interface CauseDecisionOutcome {
  readonly attempt_id: string;
  /** Every candidate is preserved - a reject is a decision, never a physical delete. */
  readonly candidates: readonly {
    readonly content_item_id: string;
    readonly source_type: 'Inference';
    readonly confirmation_class: 'decision';
    readonly statement: string;
    readonly supporting_source_paths: readonly string[];
    readonly decision_state: CauseDecision;
  }[];
  /** Which ids changed in this call. */
  readonly changed_content_item_ids: readonly string[];
}

/* ------------------------------------------------------------------ *
 * 8. Step ⑤ save (Draft / Formal boundary)
 * ------------------------------------------------------------------ */

export type FormalizationBlockReason =
  | 'NOT_USER_CONFIRMED'
  | 'FORMAL_GATE_UNSATISFIED'
  | 'NOT_A_CANONICAL_TRANSITION'
  | 'ATTEMPT_NOT_FOUND';

export interface FormalizationDecision {
  readonly outcome: 'ready' | 'draft_retained';
  readonly attempt_id: string;
  readonly missing_fields: readonly string[];
  readonly block_reasons: readonly FormalizationBlockReason[];
}
