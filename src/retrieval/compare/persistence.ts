/**
 * S01-03 ｜ The persisted form of the CURRENT Retrieval Derivation.
 *
 * Contract: §0.4 E.7/E.8 (`Markdown + JSON / sidecar metadata` = TECHNICAL DEFAULT; the physical
 * schema is an IMPLEMENTATION PARAMETER), `D-059` (Local Workspace Files, no required database),
 * §12 item 20 / AC-122 (no version system).
 *
 * 🔴 WHERE IT LIVES AND WHY: the derivation is an M6 product record, so its document schema lives
 *    with M6 and NOT in `src/workspace/**`. That keeps the dependency direction at
 *    `M6 → WorkspaceStorage` - an upward `workspace → retrieval` edge (and the cycle it would allow)
 *    is impossible by construction.
 * 🔴 PHYSICAL LAYOUT (IMPLEMENTATION PARAMETER, an addition to the documented workspace tree):
 *
 * ```
 * Workspace Root/
 *   retrievals/
 *     <source_attempt_id>.json      <- the CURRENT derivation for that source Formal Attempt
 * ```
 *
 *    One FIXED path per source Attempt is what makes "at most one current derivation" a property of
 *    the layout: a rerun overwrites the same file, so no delete primitive is needed (V1 has none -
 *    AC-76) and no earlier version can survive as a selectable record (AC-122).
 * 🔴 The identity travels INSIDE the content (`derivation_id` + `source_attempt_id`); the file name
 *    is a convenience only, exactly like the Attempt sidecar (§3.2 / AC-137).
 * 🔴 NOTHING NUMERIC ABOUT SIMILARITY may be written: the file is passed through the shared
 *    forbidden-key guard before it is written, and the reader refuses a document that carries one.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import { toObjectId } from '../../domain/ids/object-id.js';
import { LEVEL_A_DIMENSIONS } from '../../domain/types/level-a.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import { TRI_STATES } from '../../domain/types/comparison.js';
import type { TriState } from '../../domain/types/comparison.js';
import { findForbiddenPersistedKeys } from '../../workspace/schema/forbidden-keys.js';
import { WorkspaceSchemaError } from '../../workspace/schema/schema-error.js';
import { isRetrievalDerivationId } from './derivation-id.js';
import { isRetrievalStatus } from './derivation.js';
import { COMPARISON_BASES } from './types.js';
import type {
  CandidateEntry,
  ComparisonBasis,
  ComparisonPoint,
  FoldHint,
  JudgedDimensionState,
  LevelBContext,
  RelevanceReason,
  RetrievalDerivationRecord,
} from './types.js';

export const RETRIEVAL_DERIVATION_OBJECT_TYPE = 'RetrievalDerivation';

/** Workspace-relative directory holding the current derivations. */
export const RETRIEVALS_DIRECTORY = 'retrievals';

/** The one conventional path of a source Attempt's current derivation; convenience, never identity. */
export function retrievalDerivationPath(source_attempt_id: string): string {
  return `${RETRIEVALS_DIRECTORY}/${source_attempt_id}.json`;
}

/* ------------------------------------------------------------------ *
 * Serialization
 * ------------------------------------------------------------------ */

export function serializeRetrievalDerivation(record: RetrievalDerivationRecord): string {
  const payload = {
    object_type: RETRIEVAL_DERIVATION_OBJECT_TYPE,
    ...record,
  };
  const forbidden = findForbiddenPersistedKeys(payload);
  if (forbidden.length > 0) {
    throw new WorkspaceSchemaError(
      'FORBIDDEN_KEY',
      record.source_attempt_id,
      `Retrieval derivation would persist forbidden keys: ${forbidden.join(', ')}.`,
    );
  }
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/* ------------------------------------------------------------------ *
 * Reading helpers - strict, never repairing
 * ------------------------------------------------------------------ */

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path);
  }
  return value as Record<string, unknown>;
}

function requireString(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new WorkspaceSchemaError('MISSING_REQUIRED_FIELD', path, key);
  }
  return value;
}

function requireInteger(record: Record<string, unknown>, key: string, path: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, `${key} must be a non-negative integer.`);
  }
  return value;
}

function requireBoolean(record: Record<string, unknown>, key: string, path: string): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, `${key} must be a boolean.`);
  }
  return value;
}

function requireArray(record: Record<string, unknown>, key: string, path: string): readonly unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, `${key} must be an array.`);
  }
  return value;
}

function requireStringArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
): readonly string[] {
  return requireArray(record, key, path).map((entry, index) => {
    if (typeof entry !== 'string') {
      throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', `${path}.${key}[${index}]`);
    }
    return entry;
  });
}

/** Dimensions must be canonical and must appear EXACTLY once - no more, no fewer, no duplicate. */
function requireDimensionList(value: readonly string[], path: string): readonly LevelADimension[] {
  const seen = new Set<string>();
  const result: LevelADimension[] = [];
  for (const entry of value) {
    if (!LEVEL_A_DIMENSIONS.includes(entry as LevelADimension)) {
      throw new WorkspaceSchemaError(
        'INVALID_FIELD_VALUE',
        path,
        `"${entry}" is not a Level A dimension.`,
      );
    }
    if (seen.has(entry)) {
      throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, `Duplicate dimension "${entry}".`);
    }
    seen.add(entry);
    result.push(entry as LevelADimension);
  }
  return LEVEL_A_DIMENSIONS.filter((dimension) => seen.has(dimension));
}

function requireDimensionArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
): readonly LevelADimension[] {
  return requireDimensionList(requireStringArray(record, key, path), `${path}.${key}`);
}

function parseDimensionState(value: unknown, path: string): JudgedDimensionState {
  const record = asRecord(value, path);
  const dimension = requireString(record, 'dimension', path);
  if (!LEVEL_A_DIMENSIONS.includes(dimension as LevelADimension)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, `Unknown dimension "${dimension}".`);
  }
  const triState = requireString(record, 'tri_state', path);
  if (!TRI_STATES.includes(triState as TriState)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, `Unknown tri_state "${triState}".`);
  }
  const basis = requireString(record, 'basis', path);
  if (!COMPARISON_BASES.includes(basis as ComparisonBasis)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, `Unknown basis "${basis}".`);
  }
  const rawReason = record['reason'];
  if (rawReason !== null && typeof rawReason !== 'string') {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, 'reason must be a string or null.');
  }
  const parsedTriState = triState as TriState;
  const reason = typeof rawReason === 'string' ? rawReason : null;
  /*
   * 🔴 An `uncompared` dimension has nothing to explain and a compared one must explain itself:
   *    the two halves of that rule are both structural, so a document that breaks either is refused
   *    rather than silently normalised.
   */
  if (parsedTriState === 'uncompared' && reason !== null) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, 'uncompared must not carry a reason.');
  }
  if (parsedTriState === 'uncompared' && basis !== 'structural_unknown') {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      'uncompared may only be produced by the structural unknown rule.',
    );
  }
  if (parsedTriState !== 'uncompared' && basis === 'structural_unknown') {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, 'structural_unknown implies uncompared.');
  }
  return {
    dimension: dimension as LevelADimension,
    tri_state: parsedTriState,
    basis: basis as ComparisonBasis,
    reason,
  };
}

function parseComparisonPoint(value: unknown, path: string): ComparisonPoint {
  const record = asRecord(value, path);
  const dimension = requireString(record, 'dimension', path);
  if (!LEVEL_A_DIMENSIONS.includes(dimension as LevelADimension)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, `Unknown dimension "${dimension}".`);
  }
  return {
    dimension: dimension as LevelADimension,
    source_value: requireString(record, 'source_value', path),
    candidate_value: requireString(record, 'candidate_value', path),
    text: requireString(record, 'text', path),
  };
}

function parseRelevanceReason(value: unknown, path: string): RelevanceReason {
  const record = asRecord(value, path);
  const dimension = requireString(record, 'dimension', path);
  if (!LEVEL_A_DIMENSIONS.includes(dimension as LevelADimension)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, `Unknown dimension "${dimension}".`);
  }
  return { dimension: dimension as LevelADimension, text: requireString(record, 'text', path) };
}

function parseLevelBContext(value: unknown, path: string): LevelBContext {
  const record = asRecord(value, path);
  const environment = record['environment'];
  if (environment !== null && typeof environment !== 'string') {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, 'environment must be a string or null.');
  }
  return {
    same_project: requireBoolean(record, 'same_project', path),
    shared_failure_tags: requireStringArray(record, 'shared_failure_tags', path),
    environment,
  };
}

function parseCandidateEntry(value: unknown, path: string): CandidateEntry {
  const record = asRecord(value, path);
  const candidateAttemptId = toObjectId(
    requireString(record, 'candidate_attempt_id', path),
    'attempt',
  );
  if (candidateAttemptId === null) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      'candidate_attempt_id must be an ATT_ prefixed object id.',
    );
  }
  const states = requireArray(record, 'dimension_states', path).map((entry, index) =>
    parseDimensionState(entry, `${path}.dimension_states[${index}]`),
  );
  if (states.length !== LEVEL_A_DIMENSIONS.length) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      `dimension_states must cover exactly the ${LEVEL_A_DIMENSIONS.length} Level A dimensions.`,
    );
  }
  const covered = new Set(states.map((state) => state.dimension));
  if (covered.size !== LEVEL_A_DIMENSIONS.length) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, 'dimension_states repeats a dimension.');
  }
  return {
    candidate_attempt_id: candidateAttemptId,
    dimension_states: LEVEL_A_DIMENSIONS.map(
      (dimension) => states.find((state) => state.dimension === dimension) as JudgedDimensionState,
    ),
    similar_points: requireArray(record, 'similar_points', path).map((entry, index) =>
      parseComparisonPoint(entry, `${path}.similar_points[${index}]`),
    ),
    difference_points: requireArray(record, 'difference_points', path).map((entry, index) =>
      parseComparisonPoint(entry, `${path}.difference_points[${index}]`),
    ),
    relevance_reasons: requireArray(record, 'relevance_reasons', path).map((entry, index) =>
      parseRelevanceReason(entry, `${path}.relevance_reasons[${index}]`),
    ),
    level_b_context: parseLevelBContext(record['level_b_context'], `${path}.level_b_context`),
  };
}

function parseFoldHint(value: unknown, candidateCount: number, path: string): FoldHint {
  const record = asRecord(value, path);
  const hint: FoldHint = {
    first_screen_size: requireInteger(record, 'first_screen_size', path),
    total_candidate_count: requireInteger(record, 'total_candidate_count', path),
    remaining_beyond_first_screen: requireInteger(record, 'remaining_beyond_first_screen', path),
    expandable: requireBoolean(record, 'expandable', path),
  };
  /*
   * 🔴 `D-046` V-8 / AC-85: the reading-load numbers must stay consistent with the FULL related set.
   *    A document claiming `N_検索 = 7` while describing a 3-row fold hint is refused, because that
   *    is exactly how a truncated view would end up looking like a complete one.
   */
  if (hint.total_candidate_count !== candidateCount) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      path,
      'total_candidate_count must equal the number of candidate entries.',
    );
  }
  if (
    hint.first_screen_size + hint.remaining_beyond_first_screen !== hint.total_candidate_count ||
    hint.first_screen_size > hint.total_candidate_count ||
    hint.expandable !== hint.remaining_beyond_first_screen > 0
  ) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', path, 'fold hint is inconsistent.');
  }
  return hint;
}

/**
 * Reads one derivation document.
 *
 * 🔴 Never repairs and never guesses: a missing field, a non-canonical dimension, an inconsistent
 *    first-screen block or an identity that names a different Attempt is an explicit schema error.
 */
export function parseRetrievalDerivation(
  json: string,
  sourcePath = '',
): RetrievalDerivationRecord {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new WorkspaceSchemaError('INVALID_JSON', sourcePath);
  }
  const record = asRecord(raw, sourcePath);

  const forbidden = findForbiddenPersistedKeys(record);
  if (forbidden.length > 0) {
    throw new WorkspaceSchemaError(
      'FORBIDDEN_KEY',
      sourcePath,
      `Forbidden keys present: ${forbidden.join(', ')}.`,
    );
  }

  const objectType = record['object_type'];
  if (objectType !== RETRIEVAL_DERIVATION_OBJECT_TYPE) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      `object_type must be "${RETRIEVAL_DERIVATION_OBJECT_TYPE}".`,
    );
  }

  const sourceAttemptId = toObjectId(requireString(record, 'source_attempt_id', sourcePath), 'attempt');
  if (sourceAttemptId === null) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'source_attempt_id must be an ATT_ prefixed object id.',
    );
  }
  const derivationId = requireString(record, 'derivation_id', sourcePath);
  if (!isRetrievalDerivationId(derivationId, sourceAttemptId)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'derivation_id must be a non-positional identity belonging to this source Attempt.',
    );
  }

  const status = requireString(record, 'status', sourcePath);
  if (!isRetrievalStatus(status)) {
    throw new WorkspaceSchemaError('INVALID_FIELD_VALUE', sourcePath, `Unknown status "${status}".`);
  }

  const candidateEntries = requireArray(record, 'candidate_entries', sourcePath).map(
    (entry, index) => parseCandidateEntry(entry, `${sourcePath}.candidate_entries[${index}]`),
  );
  const nRetrieval = requireInteger(record, 'n_retrieval', sourcePath);
  if (nRetrieval !== candidateEntries.length) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'n_retrieval must equal the number of persisted candidate entries (the full set is kept).',
    );
  }
  if (candidateEntries.some((entry) => entry.relevance_reasons.length === 0)) {
    throw new WorkspaceSchemaError(
      'INVALID_FIELD_VALUE',
      sourcePath,
      'Every candidate entry is related and therefore carries at least one relevance reason.',
    );
  }

  return {
    derivation_id: derivationId,
    source_attempt_id: sourceAttemptId as ObjectId<'ATT'>,
    status,
    n_retrieval: nRetrieval,
    hit_level_a_dimensions: requireDimensionArray(record, 'hit_level_a_dimensions', sourcePath),
    uncompared_dimensions: requireDimensionArray(record, 'uncompared_dimensions', sourcePath),
    eligible_history_count: requireInteger(record, 'eligible_history_count', sourcePath),
    candidate_entries: candidateEntries,
    fold_hint: parseFoldHint(record['fold_hint'], candidateEntries.length, `${sourcePath}.fold_hint`),
    created_at: requireString(record, 'created_at', sourcePath),
  };
}
