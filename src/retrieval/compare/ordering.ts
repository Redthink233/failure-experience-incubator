/**
 * S01-03 ｜ THE single ordering definition point of step ⑥ / ⑦.
 *
 * Contract: `D-046` (`N_検索` is a set size and is never truncated by the first screen),
 * §4.2 rule 5 (「发生时间」 is a user `Fact`; `created_at` MUST NOT impersonate it - AC-78),
 * AC-21 (time proximity never makes an unrelated record related).
 *
 * 🔴 Ordering is applied ONLY to candidates that are ALREADY related, and it expresses DISPLAY
 *    ORDER ONLY. It is never a relatedness strength, never an importance, and it must never be
 *    presented as "most relevant / strongest / best" (§22).
 * 🔴 Sorting never looks at how many dimensions matched: 3 matched and 1 matched order exactly the
 *    same way (S4), because a count is not a quality.
 * 🔴 `created_at` is NEVER used as a fallback for a missing occurrence time (S3). A record without
 *    「发生时间」 belongs to the no-time group and is ordered by `attempt_id` alone.
 *
 * IMPLEMENTATION PARAMETER (chosen here, fixed project-wide, see the S01-03 report):
 *   - group A = candidates WITH 「发生时间」, group B = without; A precedes B;
 *   - inside group A the fixed direction is DESCENDING (later occurrence first);
 *   - the occurrence value is compared as text (it is a free-form user `Fact`, so there is no
 *     calendar type to read - a date-shaped string still orders correctly as text);
 *   - `attempt_id` ascending is the final stable tie-breaker of both groups.
 */

import type { Attempt } from '../../domain/types/attempt.js';
import type { ObjectId } from '../../domain/ids/object-id.js';

export interface OrderableCandidate {
  readonly attempt_id: ObjectId<'ATT'>;
  /** The user-provided 「发生时间」 value, or `null` when it is explicitly unknown. */
  readonly occurred_at: string | null;
}

/** Deterministic, locale-independent string comparison. */
function compareText(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

/**
 * The fixed COMPARISON order (not a display order).
 *
 * 🔴 Comparison runs in a completely deterministic order so that a dimension-judge failure is
 *    reported identically on every run; the visible order is decided separately by
 *    `displayOrderOf`.
 */
export function comparisonOrderOf<T extends { readonly attempt_id: ObjectId<'ATT'> }>(
  candidates: readonly T[],
): readonly T[] {
  return [...candidates].sort((left, right) => compareText(left.attempt_id, right.attempt_id));
}

/** The user `Fact` value of 「发生时间」, or `null` when the dimension is explicitly unknown. */
export function occurredAtOf(attempt: Attempt): string | null {
  return attempt.occurred_at.presence_state === 'present' ? attempt.occurred_at.item.value : null;
}

/**
 * The fixed DISPLAY order (S1–S5).
 *
 * The comparator stays a pure function of its inputs: the same candidate set always yields the
 * same order, and reading one Derivation twice always yields the same order (S5).
 */
export function displayOrderOf<T extends OrderableCandidate>(candidates: readonly T[]): readonly T[] {
  return [...candidates].sort((left, right) => {
    const leftValue = left.occurred_at;
    const rightValue = right.occurred_at;
    if ((leftValue === null) !== (rightValue === null)) {
      // Group A (has an occurrence time) always precedes group B (no time key).
      return leftValue === null ? 1 : -1;
    }
    if (leftValue !== null && rightValue !== null) {
      // Fixed direction: later occurrence first. Never a "closest to now" preference.
      const byOccurrence = compareText(rightValue, leftValue);
      if (byOccurrence !== 0) {
        return byOccurrence;
      }
    }
    return compareText(left.attempt_id, right.attempt_id);
  });
}
