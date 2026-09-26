/**
 * S01-03 ｜ Step ⑦ material: similar points, difference points, uncompared notes and relevance
 *            reasons.
 *
 * Contract: §9 step ⑦ and §9.4.
 *   - a SIMILAR point may only come from a `matched` Level A dimension;
 *   - a DIFFERENCE point may only come from `compared_not_matched`;
 *   - `uncompared` only ever says "该维度未比对" (a neutral statement, never a verdict);
 *   - "为什么相关" may only cite a `matched` Level A dimension. Level B, a difference and an
 *     unknown dimension must NEVER become a relevance reason (AC-125 / AC-126).
 *
 * 🔴 Every string produced here is a DISCRETE explanation. No numeric judgement quantity, no
 *    numeric quantity, no category label and no negative label may be templated in (AC-23 / AC-115).
 * 🔴 The same inputs always produce the same strings, so a Derivation can be persisted and read
 *    back without re-running anything (task §30).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import { LEVEL_A_DIMENSION_LABELS } from '../../domain/types/level-a.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import type { ComparisonPoint, JudgedDimensionState, RelevanceReason } from './types.js';

/** The ONLY wording an uncompared dimension may carry - neutral, never a verdict. */
export const UNCOMPARED_DIMENSION_LABEL = '该维度未比对';

/** Neutral note for one uncompared dimension: `<维度>：该维度未比对`. */
export function uncomparedDimensionNote(dimension: LevelADimension): string {
  return `${LEVEL_A_DIMENSION_LABELS[dimension]}：${UNCOMPARED_DIMENSION_LABEL}`;
}

function similarPointText(
  dimension: LevelADimension,
  source_value: string,
  candidate_value: string,
): string {
  return `${LEVEL_A_DIMENSION_LABELS[dimension]}相同或语义等价：本记录「${source_value}」，该历史记录「${candidate_value}」。`;
}

function differencePointText(
  dimension: LevelADimension,
  source_value: string,
  candidate_value: string,
): string {
  return `${LEVEL_A_DIMENSION_LABELS[dimension]}不同（该维度已比对，但不构成严格语义重叠）：本记录「${source_value}」，该历史记录「${candidate_value}」。`;
}

function relevanceReasonText(dimension: LevelADimension): string {
  return `${LEVEL_A_DIMENSION_LABELS[dimension]}与本记录相同或语义等价，因此本条历史记录与本次尝试相关。`;
}

export interface ComparisonPoints {
  readonly similar_points: readonly ComparisonPoint[];
  readonly difference_points: readonly ComparisonPoint[];
  readonly relevance_reasons: readonly RelevanceReason[];
}

/** Both values of one dimension, by primary field path (§9.4.1). Never a default or an empty value. */
export type DimensionValueLookup = (dimension: LevelADimension) => {
  readonly source_value: string;
  readonly candidate_value: string;
};

/**
 * Derives the step ⑦ lists from the three-state result.
 *
 * 🔴 The three outcomes are kept apart by construction: only `matched` reaches the similar list and
 *    the reasons, only `compared_not_matched` reaches the difference list, and `uncompared` reaches
 *    neither. A `compared_not_matched` dimension has no route into `relevance_reasons`.
 */
export function comparisonPointsOf(
  states: readonly JudgedDimensionState[],
  valueOf: DimensionValueLookup,
): ComparisonPoints {
  const similar: ComparisonPoint[] = [];
  const different: ComparisonPoint[] = [];
  const reasons: RelevanceReason[] = [];

  for (const state of states) {
    const dimension = state.dimension;
    if (state.tri_state === 'uncompared') {
      continue;
    }
    const values = valueOf(dimension);
    if (state.tri_state === 'matched') {
      similar.push({
        dimension,
        source_value: values.source_value,
        candidate_value: values.candidate_value,
        text: similarPointText(dimension, values.source_value, values.candidate_value),
      });
      reasons.push({ dimension, text: relevanceReasonText(dimension) });
      continue;
    }
    different.push({
      dimension,
      source_value: values.source_value,
      candidate_value: values.candidate_value,
      text: differencePointText(dimension, values.source_value, values.candidate_value),
    });
  }

  // The lists follow the canonical dimension order of the three-state list, never a derived order.
  return { similar_points: similar, difference_points: different, relevance_reasons: reasons };
}
