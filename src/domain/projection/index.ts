/**
 * Barrel for the Level A projection helpers (layer 1, pure TypeScript).
 */
export {
  dimensionOfProjectedFieldPath,
  LEVEL_A_FORBIDDEN_SOURCE_FIELDS,
  presencePairOf,
  projectAttemptToLevelA,
  projectedFieldPathOf,
  projectedItemOf,
  projectedPresenceOf,
  unknownLevelADimensions,
} from './level-a.js';
export type {
  LevelADimensionPresencePair,
  LevelAProjectedDimension,
  LevelAProjection,
  ProjectionFn,
} from './level-a.js';
