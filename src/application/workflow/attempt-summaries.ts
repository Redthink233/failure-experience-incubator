/**
 * S01-06 ｜ The UI-facing ATTEMPT LIST read extension.
 *
 * Why this file exists
 * --------------------
 * `M15` ships exactly ONE read model - `readWorkflow(attempt_id)` - which answers "where is THIS
 * record in `D9`". S01-06 additionally needs the question the left rail asks: "what records exist
 * at all?". That question cannot be answered by `readWorkflow`, and the UI must NOT answer it by
 * walking the workspace files itself.
 *
 * 🔴 WHAT THIS IS: an `INTEGRATION EXTENSION` (S01-06 task §16). It is a READ-ONLY projection
 *    `Repository -> view model`. It adds no business state, no threshold, no ordering rule that the
 *    product already owns, and no second `Attempt` vocabulary.
 * 🔴 WHAT IT IS NOT: it is NOT a new `Decision`, NOT a new `AC`, NOT a change to the frozen
 *    `D9WorkflowService` interface, and NOT a second source of truth. Every field is copied from the
 *    persisted `Attempt` verbatim or derived from it on every read.
 *
 * 🔴 It deliberately exposes NO similarity, score, strength, grade or "value" of any kind: the task
 *    forbids rendering any such number in the rail, and a field that does not exist cannot be
 *    rendered by accident (AC-97 family / task §15).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O beyond the injected port.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { ArchiveState } from '../../domain/types/archive.js';
import type { Attempt, AttemptState, DataSourceNature } from '../../domain/types/attempt.js';
import type { MaybeProvided } from '../../domain/types/presence.js';
import type { ContentItem } from '../../domain/types/source-type.js';

/** How much of a long text the rail may show. A display budget, not a domain rule. */
export const ATTEMPT_SUMMARY_TITLE_MAX = 48;
export const ATTEMPT_SUMMARY_EXCERPT_MAX = 96;

/** The placeholder for a record whose goal was never provided. */
export const UNTITLED_ATTEMPT_LABEL = '未命名尝试';

/**
 * One line of the left rail.
 *
 * 🔴 Every field is either a persisted fact about the `Attempt` or a pure display projection of one.
 */
export interface WorkflowAttemptSummary {
  readonly attempt_id: ObjectId<'ATT'>;
  readonly state: AttemptState;
  readonly archive_state: ArchiveState;
  /** L4 ③ data-source nature. The ONLY source of the Demo / Live badge (task §41). */
  readonly data_source_nature: DataSourceNature;
  /** `goal` when provided, otherwise the opening of the raw text. */
  readonly title: string;
  /** A short, single-line projection of what the user originally wrote. */
  readonly excerpt: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/** The one capability this projection needs - `M3`'s `AttemptRepository.listAttempts()`. */
export interface WorkflowAttemptListPort {
  listAttempts(): Promise<readonly Attempt[]>;
}

export interface WorkflowAttemptIndex {
  /** Newest first by `updated_at`; ties broken by `attempt_id` so the order is deterministic. */
  listWorkflowAttempts(): Promise<readonly WorkflowAttemptSummary[]>;
}

function providedValue(item: MaybeProvided<ContentItem>): string | null {
  return item.presence_state === 'present' ? item.item.value : null;
}

/** Collapses all whitespace (including the newlines a textarea always contains) to single spaces. */
function collapse(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

/**
 * The rail title.
 *
 * 🔴 It falls back to the user's OWN words before it falls back to a generic label, because the
 *    raw text is always a user `Fact` and is never empty on a persisted `Attempt`.
 */
export function attemptTitleOf(attempt: Attempt): string {
  const goal = providedValue(attempt.goal);
  if (goal !== null && collapse(goal).length > 0) {
    return truncate(collapse(goal), ATTEMPT_SUMMARY_TITLE_MAX);
  }
  const raw = collapse(attempt.raw_text.value);
  if (raw.length > 0) {
    return truncate(raw, ATTEMPT_SUMMARY_TITLE_MAX);
  }
  return UNTITLED_ATTEMPT_LABEL;
}

/** The one-line excerpt under the title. Always derived from the raw text the user wrote. */
export function attemptExcerptOf(attempt: Attempt): string {
  return truncate(collapse(attempt.raw_text.value), ATTEMPT_SUMMARY_EXCERPT_MAX);
}

/** The pure `Attempt -> rail line` projection. Exported so the UI tests can drive it directly. */
export function summarizeAttempt(attempt: Attempt): WorkflowAttemptSummary {
  return {
    attempt_id: attempt.attempt_id,
    state: attempt.state,
    archive_state: attempt.archive_state,
    data_source_nature: attempt.data_source_nature,
    title: attemptTitleOf(attempt),
    excerpt: attemptExcerptOf(attempt),
    created_at: attempt.created_at,
    updated_at: attempt.updated_at,
  };
}

/**
 * Builds the rail index over an injected list port.
 *
 * 🔴 Read-only: there is no write method on this object at all, so "the UI list mutated a record"
 *    is not expressible.
 */
export function createWorkflowAttemptIndex(port: WorkflowAttemptListPort): WorkflowAttemptIndex {
  return {
    async listWorkflowAttempts(): Promise<readonly WorkflowAttemptSummary[]> {
      const attempts = await port.listAttempts();
      const summaries = attempts.map(summarizeAttempt);
      return [...summaries].sort((left, right) => {
        if (left.updated_at !== right.updated_at) {
          return left.updated_at < right.updated_at ? 1 : -1;
        }
        return left.attempt_id < right.attempt_id ? -1 : 1;
      });
    },
  };
}
