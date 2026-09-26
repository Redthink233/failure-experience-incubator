/**
 * Comparison vocabulary: `TriState` and `DerivedComparison`.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md §9.4 / §9.4.1 / §12 item 6
 *   - `matched`             : both sides express the SAME substance, or a semantically
 *                             equivalent rephrasing (D-050, strict semantic overlap);
 *   - `compared_not_matched`: both sides present, strict semantic condition not met
 *                             (a PURE INTERNAL quantity: published nowhere, counted
 *                             nowhere, never used as a reason or a relevance basis);
 *   - `uncompared`          : produced by the STRUCTURAL `unknown` interception rule
 *                             (either side `presence_state = unknown`), never by AI.
 *
 * 🔴 No numeric similarity / score / weight / threshold / percentage / grade may ever
 *    appear here (D-020 / D-037 / AC-23).
 *
 * SCOPE OF THIS FILE: it freezes the SHARED VOCABULARY only. Computing the tri-state
 * per candidate (and the single `related` / `uncompared` computation point) is owned
 * by M6 - Track C / S01-03 - which consumes `src/domain` + `src/domain/projection`.
 */

import type { ObjectId } from '../ids/object-id.js';
import type { LevelAAttemptFieldPath, LevelADimension } from './level-a.js';

/** The three allowed values of a Level A dimension comparison. */
export type TriState = 'matched' | 'compared_not_matched' | 'uncompared';

export const TRI_STATES: readonly TriState[] = [
  'matched',
  'compared_not_matched',
  'uncompared',
];

/**
 * The outcome of the D-050 strict semantic-overlap judgement.
 * Only the semantic judgement may produce these two values - never the structural rule.
 */
export type SemanticVerdict = Extract<TriState, 'matched' | 'compared_not_matched'>;

export const SEMANTIC_VERDICTS: readonly SemanticVerdict[] = [
  'matched',
  'compared_not_matched',
];

/** Per-dimension result. Exactly one primary field path is attached (§9.4.1). */
export interface DerivedDimensionComparison {
  readonly dimension: LevelADimension;
  readonly field_path: LevelAAttemptFieldPath;
  readonly tri_state: TriState;
  /** True when the outcome was produced by the structural `unknown` interception. */
  readonly unknown_intercepted: boolean;
}

/**
 * Comparison of the current `Attempt` against one historical `Formal Attempt`.
 *
 * `related` derives from "matched Level A dimension set is non-empty".
 * 🔴 `compared_not_matched` never flips `related` to false and never hides a
 *    relevant historical record (AC-126).
 */
export interface DerivedComparison {
  readonly candidate_attempt_id: ObjectId<'ATT'>;
  readonly dimensions: Readonly<Record<LevelADimension, DerivedDimensionComparison>>;
  readonly matched_level_a_dimensions: readonly LevelADimension[];
  readonly compared_not_matched_dimensions: readonly LevelADimension[];
  /** Uncompared dimensions MUST be surfaced as "该维度未比对" (AC-114). */
  readonly uncompared_dimensions: readonly LevelADimension[];
  readonly related: boolean;
}
