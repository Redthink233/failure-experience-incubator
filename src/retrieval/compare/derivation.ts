/**
 * S01-03 ｜ Building the CURRENT Retrieval Derivation (step ⑥ output, step ⑦ material).
 *
 * Contract: §9 steps ⑥/⑦, §9.4, `D-046` (first screen vs full set), `D-061` (`related`).
 *
 * 🔴 THE FULL RELATED SET IS BUILT HERE AND IS NEVER TRUNCATED. The first screen only reduces what
 *    is DISPLAYED (`D-046` V-8 / AC-85); `n_retrieval` counts the whole set, so a record with 7
 *    related candidates keeps 7 candidate entries (A4 / A5).
 * 🔴 `hit_level_a_dimensions` is the union over the RELATED candidates, in canonical order.
 *    `uncompared_dimensions` is the SOURCE Attempt's own unknown dimensions - the single global
 *    computation point (§18). Neither is a quantity of quality.
 * 🔴 Level B context is attached as EXPLANATION ONLY. It is computed after the related set is
 *    final and cannot influence it, `n_retrieval` or the matched sets (AC-20 / AC-86).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { Attempt } from '../../domain/types/attempt.js';
import type { DerivedComparison } from '../../domain/types/comparison.js';
import { LEVEL_A_DIMENSIONS } from '../../domain/types/level-a.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import { comparisonPointsOf } from './comparison-points.js';
import type { DimensionValueLookup } from './comparison-points.js';
import { globalUncomparedDimensionsOf, projectedValueOf } from './comparator.js';
import { projectAttemptToLevelA } from '../../domain/projection/level-a.js';
import { displayOrderOf, occurredAtOf } from './ordering.js';
import {
  DEFAULT_FIRST_SCREEN_SIZE,
  RETRIEVAL_STATUSES,
} from './types.js';
import type {
  CandidateEntry,
  FoldHint,
  JudgedDimensionState,
  LevelBContext,
  RetrievalDerivationRecord,
  RetrievalStatus,
} from './types.js';

/** One candidate that went through the three-state comparison. */
export interface ComparedCandidate {
  readonly attempt: Attempt;
  readonly comparison: DerivedComparison;
  readonly states: readonly JudgedDimensionState[];
}

/* ------------------------------------------------------------------ *
 * Derived reads (one source of truth, no drift)
 * ------------------------------------------------------------------ */

function dimensionsInState(
  entry: CandidateEntry,
  tri_state: JudgedDimensionState['tri_state'],
): readonly LevelADimension[] {
  return entry.dimension_states
    .filter((state) => state.tri_state === tri_state)
    .map((state) => state.dimension);
}

/** 🔴 Only `matched` reaches the similar list and the relevance reasons (`D-050` / AC-125). */
export function matchedDimensionsOf(entry: CandidateEntry): readonly LevelADimension[] {
  return dimensionsInState(entry, 'matched');
}

/** Internal only: published nowhere, counted nowhere, never a relevance reason (§9.4 / AC-125). */
export function comparedNotMatchedDimensionsOf(entry: CandidateEntry): readonly LevelADimension[] {
  return dimensionsInState(entry, 'compared_not_matched');
}

export function uncomparedDimensionsOf(entry: CandidateEntry): readonly LevelADimension[] {
  return dimensionsInState(entry, 'uncompared');
}

/** `related` ⇔ the matched dimension set is non-empty (`D-061`). */
export function entryIsRelated(entry: CandidateEntry): boolean {
  return matchedDimensionsOf(entry).length > 0;
}

/* ------------------------------------------------------------------ *
 * Building one entry
 * ------------------------------------------------------------------ */

function levelBContextOf(source: Attempt, candidate: Attempt): LevelBContext {
  const sourceTags = new Set(source.failure_tags);
  const shared = candidate.failure_tags.filter((tag) => sourceTags.has(tag));
  return {
    same_project:
      source.project_id !== null && candidate.project_id === source.project_id,
    shared_failure_tags: [...new Set(shared)],
    environment:
      candidate.environment.presence_state === 'present' ? candidate.environment.item.value : null,
  };
}

function valueLookupFor(
  source: Attempt,
  candidate: Attempt,
): DimensionValueLookup {
  const sourceProjection = projectAttemptToLevelA(source);
  const candidateProjection = projectAttemptToLevelA(candidate);
  return (dimension: LevelADimension) => ({
    source_value: projectedValueOf(sourceProjection, dimension) ?? '',
    candidate_value: projectedValueOf(candidateProjection, dimension) ?? '',
  });
}

/**
 * Builds one candidate entry.
 *
 * 🔴 The three-state list is the single source of truth; the similar / difference / reason lists are
 *    derived from it, so they can never disagree with the states that produced them.
 */
export function candidateEntryOf(source: Attempt, compared: ComparedCandidate): CandidateEntry {
  const points = comparisonPointsOf(compared.states, valueLookupFor(source, compared.attempt));
  return {
    candidate_attempt_id: compared.attempt.attempt_id,
    dimension_states: compared.states,
    similar_points: points.similar_points,
    difference_points: points.difference_points,
    relevance_reasons: points.relevance_reasons,
    level_b_context: levelBContextOf(source, compared.attempt),
  };
}

/* ------------------------------------------------------------------ *
 * Fold hint (`D-046`)
 * ------------------------------------------------------------------ */

export function foldHintOf(total_candidate_count: number): FoldHint {
  const first_screen_size = Math.min(DEFAULT_FIRST_SCREEN_SIZE, total_candidate_count);
  return {
    first_screen_size,
    total_candidate_count,
    remaining_beyond_first_screen: total_candidate_count - first_screen_size,
    expandable: total_candidate_count > first_screen_size,
  };
}

/* ------------------------------------------------------------------ *
 * The derivation
 * ------------------------------------------------------------------ */

export interface BuildDerivationInput {
  readonly derivation_id: string;
  readonly source: Attempt;
  readonly eligible_history_count: number;
  readonly compared_candidates: readonly ComparedCandidate[];
  readonly created_at: string;
}

/** The three normal statuses, in the fixed precedence: empty history, then no relation, then related. */
export function retrievalStatusOf(
  eligible_history_count: number,
  related_count: number,
): RetrievalStatus {
  if (eligible_history_count === 0) {
    return 'HISTORY_EMPTY';
  }
  return related_count === 0 ? 'NO_RELATED_HISTORY' : 'RELATED_HISTORY';
}

export function buildRetrievalDerivation(
  input: BuildDerivationInput,
): RetrievalDerivationRecord {
  const related = input.compared_candidates.filter((candidate) => candidate.comparison.related);
  const ordered = displayOrderOf(
    related.map((candidate) => ({
      attempt_id: candidate.attempt.attempt_id,
      occurred_at: occurredAtOf(candidate.attempt),
      candidate,
    })),
  );
  const candidate_entries = ordered.map((row) => candidateEntryOf(input.source, row.candidate));

  const hit = new Set<LevelADimension>();
  for (const entry of candidate_entries) {
    for (const dimension of matchedDimensionsOf(entry)) {
      hit.add(dimension);
    }
  }

  return {
    derivation_id: input.derivation_id,
    source_attempt_id: input.source.attempt_id,
    status: retrievalStatusOf(input.eligible_history_count, candidate_entries.length),
    n_retrieval: candidate_entries.length,
    hit_level_a_dimensions: LEVEL_A_DIMENSIONS.filter((dimension) => hit.has(dimension)),
    uncompared_dimensions: globalUncomparedDimensionsOf(input.source),
    eligible_history_count: input.eligible_history_count,
    candidate_entries,
    fold_hint: foldHintOf(candidate_entries.length),
    created_at: input.created_at,
  };
}

/** Guard used by the persistence reader so an unknown status is refused instead of accepted. */
export function isRetrievalStatus(value: string): value is RetrievalStatus {
  return RETRIEVAL_STATUSES.includes(value as RetrievalStatus);
}

/** One related candidate id, in the stored display order (`D-046`: the full set, never truncated). */
export function relatedAttemptIdsOf(
  record: RetrievalDerivationRecord,
): readonly ObjectId<'ATT'>[] {
  return record.candidate_entries.map((entry) => entry.candidate_attempt_id);
}
