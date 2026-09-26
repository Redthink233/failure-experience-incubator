/**
 * S01-03 ｜ The Level A three-state comparator (`M6`).
 *
 * Contract: §9 step ⑥ ("逐候选 × 逐 Level A 维度做三态判定"), §9.4, §9.4.1, `D-050`, `D-052`.
 *
 * 🔴 The pipeline per dimension is fixed and ordered:
 *     ① `unknown` gate      - either side unknown ⇒ `uncompared`; the judge is NOT called;
 *     ② deterministic rule  - only a provable sameness or a provable difference;
 *     ③ dimension judge      - only when the rule returned `undecided`.
 *    The judge can therefore never see an unknown dimension, and it can never express
 *    `uncompared` (AC-114).
 * 🔴 `related` is derived EXACTLY as "the matched dimension set is non-empty" (`D-061`). No
 *    threshold, no 「≥2 个维度命中」, no mandatory `goal` hit, no 加权, no ordered category.
 * 🔴 A judge failure aborts the WHOLE comparison: the caller receives a runtime failure and NOT a
 *    partially decided candidate. "Return what we managed to compare" would fabricate `N_检索`.
 * 🔴 The source `Attempt` is read only. Normalization is a comparison-time temporary; nothing is
 *    written back to the record, to a `Fact` or to an `Extraction` (§31).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { Attempt } from '../../domain/types/attempt.js';
import type {
  DerivedComparison,
  DerivedDimensionComparison,
} from '../../domain/types/comparison.js';
import { LEVEL_A_DIMENSIONS } from '../../domain/types/level-a.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import { projectAttemptToLevelA, projectedFieldPathOf } from '../../domain/projection/level-a.js';
import type { LevelAProjection } from '../../domain/projection/level-a.js';
import type { DimensionJudge } from './dimension-judge.js';
import { deterministicDimensionVerdict } from './field-rules.js';
import type { JudgedDimensionState, RetrievalRuntimeFailure } from './types.js';

/* ------------------------------------------------------------------ *
 * Availability of a dimension value
 * ------------------------------------------------------------------ */

/**
 * The value of one Level A dimension, or `null` when the dimension is explicitly unknown.
 *
 * 🔴 `null` is the ONLY representation of "not provided" here: an `unknown` dimension is never
 *    replaced by an empty string, a sentinel such as "N/A" / 「无」 or a default (§4.2 rule 7 /
 *    AC-04). It is the input of the structural gate below.
 */
export function projectedValueOf(
  projection: LevelAProjection,
  dimension: LevelADimension,
): string | null {
  const projected = projection[dimension];
  if (projected.presence_state !== 'present') {
    return null;
  }
  // A `present` carrier always carries an item; the `??` is an unreachable defence, and an absent
  // item is treated as unknown rather than silently compared as an empty value.
  return projected.item?.value ?? null;
}

export interface DimensionStateLookup {
  readonly source: LevelAProjection;
  readonly candidate: LevelAProjection;
}

export type ComparisonOutcome =
  | {
      readonly kind: 'compared';
      readonly comparison: DerivedComparison;
      readonly states: readonly JudgedDimensionState[];
    }
  | RetrievalRuntimeFailure;

/** Reads one comparison out of the record by canonical dimension; throws only if a build is broken. */
function requireDimension(
  built: ReadonlyMap<LevelADimension, DerivedDimensionComparison>,
  dimension: LevelADimension,
): DerivedDimensionComparison {
  const found = built.get(dimension);
  if (found === undefined) {
    throw new Error(`Level A dimension "${dimension}" was not compared.`);
  }
  return found;
}

/**
 * Compares one source `Attempt` against one candidate `Attempt` over the four Level A dimensions.
 *
 * Pure with respect to storage: the only side effect possible is the injected judge call.
 */
export async function compareAttempts(
  judge: DimensionJudge,
  source: Attempt,
  candidate: Attempt,
): Promise<ComparisonOutcome> {
  const sourceProjection = projectAttemptToLevelA(source);
  const candidateProjection = projectAttemptToLevelA(candidate);
  const states: JudgedDimensionState[] = [];
  const built = new Map<LevelADimension, DerivedDimensionComparison>();

  for (const dimension of LEVEL_A_DIMENSIONS) {
    const field_path = projectedFieldPathOf(sourceProjection, dimension);
    const sourceValue = projectedValueOf(sourceProjection, dimension);
    const candidateValue = projectedValueOf(candidateProjection, dimension);

    /* ① `unknown` gate - structural, BEFORE any judge call (AC-114 / AC-22 / D-025). */
    if (sourceValue === null || candidateValue === null) {
      states.push({
        dimension,
        tri_state: 'uncompared',
        basis: 'structural_unknown',
        reason: null,
      });
      built.set(dimension, {
        dimension,
        field_path,
        tri_state: 'uncompared',
        unknown_intercepted: true,
      });
      continue;
    }

    /* ② Deterministic rule. */
    const rule = deterministicDimensionVerdict(sourceValue, candidateValue);
    if (rule.verdict !== 'undecided') {
      states.push({
        dimension,
        tri_state: rule.verdict,
        basis: 'deterministic_rule',
        reason: rule.reason,
      });
      built.set(dimension, {
        dimension,
        field_path,
        tri_state: rule.verdict,
        unknown_intercepted: false,
      });
      continue;
    }

    /* ③ Discrete dimension judgement - the ONLY AI entry point of step ⑥. */
    const judged = await judge({ dimension, source_value: sourceValue, candidate_value: candidateValue });
    if (judged.kind === 'runtime_incomplete') {
      return judged;
    }
    states.push({
      dimension,
      tri_state: judged.verdict,
      basis: 'dimension_judge',
      reason: judged.reason,
    });
    built.set(dimension, {
      dimension,
      field_path,
      tri_state: judged.verdict,
      unknown_intercepted: false,
    });
  }

  /*
   * The record is assembled from the canonical dimension set explicitly, so "exactly four
   * dimensions, no more, no fewer" is a property of the construction and not of a convention.
   */
  const dimensions = {
    goal: requireDimension(built, 'goal'),
    approach: requireDimension(built, 'approach'),
    condition: requireDimension(built, 'condition'),
    result: requireDimension(built, 'result'),
  };

  const matched = LEVEL_A_DIMENSIONS.filter(
    (dimension) => dimensions[dimension].tri_state === 'matched',
  );
  const comparedNotMatched = LEVEL_A_DIMENSIONS.filter(
    (dimension) => dimensions[dimension].tri_state === 'compared_not_matched',
  );
  const uncompared = LEVEL_A_DIMENSIONS.filter(
    (dimension) => dimensions[dimension].tri_state === 'uncompared',
  );

  const comparison: DerivedComparison = {
    candidate_attempt_id: candidate.attempt_id,
    dimensions,
    matched_level_a_dimensions: matched,
    compared_not_matched_dimensions: comparedNotMatched,
    uncompared_dimensions: uncompared,
    // 🔴 `D-061`: related ⇔ the matched set is non-empty. Nothing else may enter this expression.
    related: matched.length > 0,
  };

  return { kind: 'compared', comparison, states };
}

/** The source Attempt's own unknown Level A dimensions - the single global computation point. */
export function globalUncomparedDimensionsOf(source: Attempt): readonly LevelADimension[] {
  const projection = projectAttemptToLevelA(source);
  return LEVEL_A_DIMENSIONS.filter((dimension) => projectedValueOf(projection, dimension) === null);
}
