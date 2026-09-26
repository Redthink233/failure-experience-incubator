/**
 * Level A projection: pure helper that locates each Level A dimension on the
 * `Attempt` carrier object.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md §9.4 / §9.4.1 / §12 item 6
 * and Gate C Plan §J.2:
 *   - the four Level A dimensions are exactly `goal` / `approach` / `condition` / `result`;
 *   - each dimension has EXACTLY ONE primary field path (frozen mapping §9.4.1);
 *   - the projection helper is consumed by M6 ONLY - M7 does not consume it;
 *   - 🔴 `result_status` / `expected_result` / `judgment_basis` / `failure_tag(s)` are
 *     NOT Level A primary fields and MUST NOT be exposed here.
 *
 * Properties required of this module:
 *   pure ／ deterministic ／ no file I/O ／ no network ／ no LLM ／ no numeric similarity.
 */

import type { Attempt } from '../types/attempt.js';
import {
  LEVEL_A_DIMENSIONS,
  LEVEL_A_FIELD_PATH_MAP,
  levelADimensionForFieldPath,
} from '../types/level-a.js';
import type { LevelAAttemptFieldPath, LevelADimension } from '../types/level-a.js';
import type { FieldPresenceState, MaybeProvided } from '../types/presence.js';
import type { ContentItem } from '../types/source-type.js';

/**
 * Deterministic pure projection signature (`ProjectionFn`).
 * Implementations must never mutate the source and must not perform side effects.
 */
export type ProjectionFn<TSource, TTarget> = (source: TSource) => TTarget;

/** One projected dimension: where it lives, whether it is present, and its item. */
export interface LevelAProjectedDimension {
  readonly dimension: LevelADimension;
  readonly field_path: LevelAAttemptFieldPath;
  readonly presence_state: FieldPresenceState;
  /** `null` exactly when `presence_state === 'unknown'`; never a default value. */
  readonly item: ContentItem | null;
}

/**
 * The full Level A projection.
 * The `Record` keyed by `LevelADimension` structurally guarantees that exactly the
 * four canonical dimensions exist - no more, no fewer, no duplicate mapping.
 */
export type LevelAProjection = Readonly<Record<LevelADimension, LevelAProjectedDimension>>;

/**
 * `Attempt` fields that MUST NOT be used as a Level A primary field.
 * Kept as data so the invariant can be asserted by tests and by future reviewers.
 */
export const LEVEL_A_FORBIDDEN_SOURCE_FIELDS = [
  'result_status',
  'expected_result',
  'judgment_basis',
  'failure_tag',
  'failure_tags',
] as const;

function carrierOf(
  attempt: Attempt,
  field_path: LevelAAttemptFieldPath,
): MaybeProvided<ContentItem> {
  switch (field_path) {
    case 'goal':
      return attempt.goal;
    case 'actual_attempt':
      return attempt.actual_attempt;
    case 'condition':
      return attempt.condition;
    case 'actual_result':
      return attempt.actual_result;
  }
}

function projectDimension(
  attempt: Attempt,
  dimension: LevelADimension,
): LevelAProjectedDimension {
  const field_path = LEVEL_A_FIELD_PATH_MAP[dimension];
  const carrier = carrierOf(attempt, field_path);
  return {
    dimension,
    field_path,
    presence_state: carrier.presence_state,
    item: carrier.presence_state === 'present' ? carrier.item : null,
  };
}

/**
 * Projects an `Attempt` onto its four Level A dimensions (§9.4.1).
 *
 * Pure and deterministic: the same `Attempt` always yields deep-equal output.
 * `unknown` is carried through explicitly - it is never converted into an empty value
 * (§4.2 rule 7 / AC-04) and never into a comparison outcome (§9.4 / AC-114).
 */
export const projectAttemptToLevelA: ProjectionFn<Attempt, LevelAProjection> = (
  attempt,
): LevelAProjection => ({
  goal: projectDimension(attempt, 'goal'),
  approach: projectDimension(attempt, 'approach'),
  condition: projectDimension(attempt, 'condition'),
  result: projectDimension(attempt, 'result'),
});

/** The primary field path of a dimension, read from the projection itself. */
export function projectedFieldPathOf(
  projection: LevelAProjection,
  dimension: LevelADimension,
): LevelAAttemptFieldPath {
  return projection[dimension].field_path;
}

/** Reverse lookup using the projection: which dimension a field path belongs to. */
export function dimensionOfProjectedFieldPath(
  field_path: LevelAAttemptFieldPath,
): LevelADimension {
  return levelADimensionForFieldPath(field_path);
}

export function projectedItemOf(
  projection: LevelAProjection,
  dimension: LevelADimension,
): ContentItem | null {
  return projection[dimension].item;
}

export function projectedPresenceOf(
  projection: LevelAProjection,
  dimension: LevelADimension,
): FieldPresenceState {
  return projection[dimension].presence_state;
}

/** Dimensions whose presence is explicitly `unknown` - i.e. "该维度未比对" candidates. */
export function unknownLevelADimensions(
  projection: LevelAProjection,
): readonly LevelADimension[] {
  return LEVEL_A_DIMENSIONS.filter(
    (dimension) => projection[dimension].presence_state === 'unknown',
  );
}

/**
 * Presence state of both sides of one dimension - the input of the structural
 * `unknown` interception consumed by M6 (§9.4 / AC-114).
 */
export interface LevelADimensionPresencePair {
  readonly dimension: LevelADimension;
  readonly left: FieldPresenceState;
  readonly right: FieldPresenceState;
}

export function presencePairOf(
  current: LevelAProjection,
  historical: LevelAProjection,
  dimension: LevelADimension,
): LevelADimensionPresencePair {
  return {
    dimension,
    left: current[dimension].presence_state,
    right: historical[dimension].presence_state,
  };
}
