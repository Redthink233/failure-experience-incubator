/**
 * S01-03 ｜ `M6` Experience Retriever / Comparator - the public vocabulary of step ⑥ and ⑦.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md (**v0.3 FROZEN / IMPLEMENTATION BASIS**)
 *   - §9 step ⑥ : range = ALL history, `Draft` and archived records excluded, per dimension
 *                 three-state judgement (§9.4), output = related set + `N_检索` + hit Level A set;
 *   - §9 step ⑦ : similar points / difference points / "why related" / uncompared dimension list;
 *   - §9.4      Level A `matched` = STRICT semantic overlap (`D-050`) + the `D-052` negative case;
 *   - §9.4.1    exactly one primary field path per Level A dimension;
 *   - §12 item 6: the four-dimension set and its mapping are Worker-forbidden-to-change.
 *
 * 🔴 `compared_not_matched` is a PURE INTERNAL quantity (§9.4): it is published nowhere, it is
 *    counted nowhere, it never becomes a reason and never a relevance basis, and it never enters
 *    the matched set (AC-125 / AC-126).
 * 🔴 `uncompared` is produced ONLY by the STRUCTURAL interception of `presence_state = unknown`
 *    (`D-050` unknown rule / AC-22 / AC-114). The dimension judge can never return it - its answer
 *    schema does not even offer that value.
 * 🔴 `related` ⇔ the matched Level A dimension set is non-empty (`D-061`). No threshold, no
 *    mandatory `goal` hit, no 加权, no ordered category, no numeric judgement quantity.
 * 🔴 This layer sits BELOW `src/application/**` in the six-layer discipline, so it never imports
 *    the capture layer, the browser layer, the server layer or the UI layer.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, no numeric judgement value.
 */

import type { AiError } from '../../ai/provider/result.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import type { TriState } from '../../domain/types/comparison.js';
import type { LevelADimension } from '../../domain/types/level-a.js';

/* ------------------------------------------------------------------ *
 * 1. How one dimension reached its state
 * ------------------------------------------------------------------ */

/**
 * Which mechanism produced a dimension's three-state value.
 *
 * 🔴 This is an AUDIT label, never a quality, strength or ordering input. It exists so a reviewer
 *    can tell a structural interception from a rule hit from a judged answer.
 */
export type ComparisonBasis =
  /** `presence_state = unknown` on at least one side - structural, computed before any AI call. */
  | 'structural_unknown'
  /** The safe deterministic rule reached a definite answer without any AI call. */
  | 'deterministic_rule'
  /** The dimension judge (`M10` provider) produced the discrete verdict. */
  | 'dimension_judge';

export const COMPARISON_BASES: readonly ComparisonBasis[] = [
  'structural_unknown',
  'deterministic_rule',
  'dimension_judge',
];

/** One dimension of one source × candidate comparison, with its discrete reason. */
export interface JudgedDimensionState {
  readonly dimension: LevelADimension;
  readonly tri_state: TriState;
  readonly basis: ComparisonBasis;
  /**
   * Discrete, human-readable reason for `matched` / `compared_not_matched`; `null` for
   * `uncompared` (nothing was compared, so there is nothing to explain).
   */
  readonly reason: string | null;
}

/* ------------------------------------------------------------------ *
 * 2. Step ⑦ material
 * ------------------------------------------------------------------ */

/** A similar point: ONLY ever derived from a `matched` Level A dimension (§9 step ⑦). */
export interface ComparisonPoint {
  readonly dimension: LevelADimension;
  readonly source_value: string;
  readonly candidate_value: string;
  readonly text: string;
}

/**
 * Why this historical record is related.
 *
 * 🔴 ONLY a `matched` Level A dimension may appear here (§9 step ⑦). A difference, a Level B
 *    attribute or an unknown dimension must never be turned into a relevance reason.
 */
export interface RelevanceReason {
  readonly dimension: LevelADimension;
  readonly text: string;
}

/**
 * Level B context - explanation only.
 *
 * 🔴 It NEVER makes an Attempt related, never pre-filters, never fills a first screen, never
 *    changes `N_检索` and never changes the matched set (AC-20 / AC-86 / `D-019`).
 * `D-020` allows "same Project" to be shown as an AUXILIARY explanation, which is exactly the
 * only role this structure has.
 */
export interface LevelBContext {
  readonly same_project: boolean;
  readonly shared_failure_tags: readonly string[];
  /** The candidate's `environment` value, or `null` when explicitly unknown. */
  readonly environment: string | null;
}

/** One related historical record with everything step ⑦ needs, in the fixed display order. */
export interface CandidateEntry {
  readonly candidate_attempt_id: ObjectId<'ATT'>;
  /** Canonical dimension order; the single source from which the three lists below are read. */
  readonly dimension_states: readonly JudgedDimensionState[];
  readonly similar_points: readonly ComparisonPoint[];
  readonly difference_points: readonly ComparisonPoint[];
  readonly relevance_reasons: readonly RelevanceReason[];
  readonly level_b_context: LevelBContext;
}

/* ------------------------------------------------------------------ *
 * 3. The three 0-like statuses (strictly separated)
 * ------------------------------------------------------------------ */

/**
 * The three NORMAL product statuses of one completed retrieval.
 *
 * 🔴 `HISTORY_EMPTY` and `NO_RELATED_HISTORY` are BOTH legitimate successes, but they are NOT the
 *    same statement and must never share wording (§9.2 two empty states / `D-046` V-1).
 * 🔴 A RUNTIME failure is none of these - see `RetrievalRuntimeFailure`.
 */
export type RetrievalStatus =
  /** At least one related historical `Formal Attempt` exists. */
  | 'RELATED_HISTORY'
  /** Usable history exists, but nothing is related: `N_检索 = 0`. */
  | 'NO_RELATED_HISTORY'
  /** After excluding the source itself there is NO usable historical `Formal Attempt` at all. */
  | 'HISTORY_EMPTY';

export const RETRIEVAL_STATUSES: readonly RetrievalStatus[] = [
  'RELATED_HISTORY',
  'NO_RELATED_HISTORY',
  'HISTORY_EMPTY',
];

/* ------------------------------------------------------------------ *
 * 4. First screen / expansion (`D-046`)
 * ------------------------------------------------------------------ */

/**
 * Reading-load information.
 *
 * 🔴 `D-046`: the FULL candidate set stays persisted; the first screen merely shows fewer rows.
 *    `remaining_beyond_first_screen` counts rows the INTERFACE can still reveal - it is never an
 *    evidence count, an evidence strength, a certainty or a relatedness statement (AC-82–AC-86).
 */
export interface FoldHint {
  readonly first_screen_size: number;
  readonly total_candidate_count: number;
  readonly remaining_beyond_first_screen: number;
  readonly expandable: boolean;
}

/** `D-046` V-1: first screen default = 3, and never more rows than exist. */
export const DEFAULT_FIRST_SCREEN_SIZE = 3;

/* ------------------------------------------------------------------ *
 * 5. The current Retrieval Derivation
 * ------------------------------------------------------------------ */

/**
 * The CURRENT derivation for one source `Formal Attempt`.
 *
 * 🔴 NOT an `Attempt` field and NOT an `EvidenceRef` (§24 / §32): it is an attached retrieval
 *    product record. `projectAttemptToLevelA()` never reads it, it grounds nothing and it is never
 *    the target of a reference.
 * 🔴 V1 keeps at most ONE current derivation per source Attempt. There is deliberately no revision
 *    list, no earlier-generation list and no restore path (AC-122 / `D-051` display-only batches
 *    are a step ⑧⑨ concern and are NOT introduced here).
 */
export interface RetrievalDerivationRecord {
  /** Unique, stable, non-positional (`derivation_id`); see `derivation-id.ts`. */
  readonly derivation_id: string;
  readonly source_attempt_id: ObjectId<'ATT'>;
  readonly status: RetrievalStatus;
  /** Count of related `Formal Attempt`s - the ONLY set-size number of step ⑥. */
  readonly n_retrieval: number;
  /** Union of the matched Level A dimensions over all related candidates, canonical order. */
  readonly hit_level_a_dimensions: readonly LevelADimension[];
  /** The SOURCE Attempt's own unknown Level A dimensions - the single global computation point. */
  readonly uncompared_dimensions: readonly LevelADimension[];
  /** Size of the usable historical corpus AFTER the single-point filter (diagnostic only). */
  readonly eligible_history_count: number;
  /** The FULL related set, already in the fixed display order; never truncated by the view. */
  readonly candidate_entries: readonly CandidateEntry[];
  readonly fold_hint: FoldHint;
  /** When this current derivation was produced (ISO-8601). */
  readonly created_at: string;
}

/* ------------------------------------------------------------------ *
 * 6. Runtime failure (NEVER an empty result)
 * ------------------------------------------------------------------ */

/**
 * Application-local failure vocabulary of `M6`.
 *
 * 🔴 A failure here means `RETRIEVAL_RUNTIME_INCOMPLETE`: it is NOT `N_检索 = 0`. It must never be
 *    presented as an empty history and must never replace an existing successful derivation
 *    (§10.1 layer 2 / §15 of the task). A retry is always allowed.
 */
export type RetrievalLocalFailureCode =
  | 'REQUEST_INVALID'
  | 'NO_STRUCTURED_OUTPUT_AVAILABLE'
  | 'MALFORMED_STRUCTURED_RESULT'
  | 'NON_CANONICAL_JUDGE_FIELD'
  | 'NON_CANONICAL_JUDGE_VERDICT'
  /**
   * FINAL-RAPID-A: the one-call batch answer did not cover EXACTLY the requested pair set - a pair
   * was missing, duplicated, never requested, or a `candidate_id` / `dimension` was rewritten. The
   * whole batch fails; a missing pair is never defaulted to `compared_not_matched`.
   */
  | 'BATCH_JUDGMENT_SET_MISMATCH';

export interface RetrievalRuntimeFailure {
  readonly kind: 'runtime_incomplete';
  /** `null` when the failure was detected locally, before or after the provider call. */
  readonly ai_error: AiError | null;
  /** `null` when the provider itself reported the failure. */
  readonly local_code: RetrievalLocalFailureCode | null;
  readonly detail: string;
  readonly retryable: boolean;
  /** Always `true`: nothing stored is discarded by a runtime failure. */
  readonly source_preserved: true;
}
