/**
 * S01-03 ｜ THE single-point candidate filter of step ⑥.
 *
 * Contract: `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`
 *   - §9 step ⑥: range = ALL history, `Draft` and archived records excluded;
 *   - §6.2 / §12 item 9: the eligibility filter must be injected in the correct place, in EVERY
 *     query - otherwise a record participates beyond its permission;
 *   - `D-019`: `Project` is NOT an admission criterion;
 *   - AC-20 / AC-86: Level B alone must never make a record related.
 *
 * 🔴 This function is the ONLY place in the repository that decides "which historical records may
 *    take part". The comparator, the step ⑦ output and the UI must all consume the corpus produced
 *    here instead of re-writing the rule - a second copy is exactly how the three exclusions start
 *    to drift apart.
 * 🔴 It is a SINGLE-SHOT filter, deliberately not a pipeline: no `project_id` narrowing, no
 *    `failure_tag` narrowing, no environment / version narrowing and NO "most recent N" pre-cut.
 *    A pre-cut before retrieval would silently change `N_检索` (`D-046` / AC-85).
 * 🔴 `Draft` exclusion, archive exclusion and self exclusion happen HERE, together, in one pass.
 */

import type { Attempt } from '../../domain/types/attempt.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import { isEligibleForNewRetrieval } from '../../domain/types/counts.js';

/**
 * The usable historical corpus for one source `Formal Attempt`.
 *
 * All three exclusions in one pass:
 *   ① `state = Formal` (`Draft` never takes part - AC-79 / §2.1);
 *   ② `archive_state = active` (an archived record never joins a NEW retrieval - §6.2 / AC-85);
 *   ③ `attempt_id != source_attempt_id` (a record is never its own history).
 *
 * The result keeps the caller's relative order; the fixed COMPARISON order is applied by
 * `comparisonOrderOf` and the fixed DISPLAY order by `displayOrderOf`.
 */
export function eligibleHistoricalAttempts(
  source_attempt_id: ObjectId<'ATT'>,
  all_attempts: readonly Attempt[],
): readonly Attempt[] {
  return all_attempts.filter(
    (attempt) =>
      attempt.attempt_id !== source_attempt_id &&
      isEligibleForNewRetrieval(attempt.state, attempt.archive_state),
  );
}

/**
 * `true` when the corpus is empty after excluding the source itself.
 *
 * 🔴 This is the `HISTORY_EMPTY` condition - a NORMAL product status, NOT a failure and NOT the
 *    same statement as `NO_RELATED_HISTORY` (§9.2 two empty states).
 */
export function historyIsEmpty(eligible: readonly Attempt[]): boolean {
  return eligible.length === 0;
}
