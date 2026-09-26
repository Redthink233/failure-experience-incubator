/**
 * Level A dimensions and their FROZEN primary field-path mapping.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
 *   - §9.4      Level A dimension-level `matched` judgement (D-050 / D-052);
 *   - §9.4.1    "Level A 四维度 → 主字段路径映射表" - CONTRACT CLARIFICATION,
 *               frozen at Gate C 2026-09-24, fulfilling §12 item 6 and TQ19;
 *   - §12 item 6: the four-dimension set AND its field-path mapping are
 *                 Worker-forbidden-to-change shared semantics.
 *
 * 🔴 Exactly one primary field path per dimension. No extra parallel primary
 *    fields, no weights, no thresholds, no priority.
 * 🔴 `result_status` / `expected_result` / `judgment_basis` / `failure_tag(s)` are
 *    NOT Level A primary fields.
 */

/** The four and only four Level A dimensions (§9.4 / §9.4.1). */
export type LevelADimension = 'goal' | 'approach' | 'condition' | 'result';

export const LEVEL_A_DIMENSIONS: readonly LevelADimension[] = [
  'goal',
  'approach',
  'condition',
  'result',
];

export const LEVEL_A_DIMENSION_LABELS: Readonly<Record<LevelADimension, string>> = {
  goal: '目标',
  approach: '方案 / 技术对象',
  condition: '条件',
  result: '结果 / 现象 / 结论方向',
};

/** The `Attempt` field that carries a Level A dimension (frozen, §9.4.1). */
export type LevelAAttemptFieldPath =
  | 'goal'
  | 'actual_attempt'
  | 'condition'
  | 'actual_result';

export const LEVEL_A_FIELD_PATHS: readonly LevelAAttemptFieldPath[] = [
  'goal',
  'actual_attempt',
  'condition',
  'actual_result',
];

/**
 * §9.4.1 frozen mapping - exactly one primary field path per dimension:
 *
 * ```
 * goal      -> goal
 * approach  -> actual_attempt
 * condition -> condition
 * result    -> actual_result
 * ```
 */
export const LEVEL_A_FIELD_PATH_MAP: Readonly<
  Record<LevelADimension, LevelAAttemptFieldPath>
> = Object.freeze({
  goal: 'goal',
  approach: 'actual_attempt',
  condition: 'condition',
  result: 'actual_result',
});

/** The single primary field path of a Level A dimension. */
export function fieldPathForLevelADimension(
  dimension: LevelADimension,
): LevelAAttemptFieldPath {
  return LEVEL_A_FIELD_PATH_MAP[dimension];
}

/**
 * Reverse lookup: the Level A dimension carried by a field path.
 * Because the mapping is bijective this is always defined.
 */
export function levelADimensionForFieldPath(
  fieldPath: LevelAAttemptFieldPath,
): LevelADimension {
  const found = LEVEL_A_DIMENSIONS.find(
    (dimension) => LEVEL_A_FIELD_PATH_MAP[dimension] === fieldPath,
  );
  if (found === undefined) {
    throw new Error(`No Level A dimension maps to field path "${fieldPath}".`);
  }
  return found;
}
