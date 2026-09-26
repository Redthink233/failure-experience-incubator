/**
 * S01-05 ｜ Follow-up question budget for step ②.
 *
 * Contract: `D-016` / `D-017` / `D-018` / `D-023` and the 2026-09-19 wording correction.
 *   - the counting unit is the number of KEY FOLLOW-UP QUESTIONS (TOTAL), not dialogue rounds
 *     (`max-3-key-questions-total`);
 *   - the cap is a ceiling, **never** a quota: 0 questions is a legal, expected outcome
 *     (AC-14 / AC-15);
 *   - one question targets exactly ONE main high-value gap - bundling several gaps into one
 *     question to dodge the budget is forbidden (AC-Q06-3);
 *   - after the 3rd question a 4th must not exist (AC-16);
 *   - a gap the user answered with 「不知道 / 跳过」 is never asked again (AC-17);
 *   - a value the user volunteers on their own does NOT consume the budget and must not reduce
 *     the questions that are still owed (AC-Q06-4).
 *
 * 🔴 This module is intentionally pure: every function returns a NEW budget value, so "how many
 *    questions are left" is always a deterministic function of the recorded questions.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { AttemptDraftState } from '../../domain/types/follow-up.js';
import { MAX_KEY_FOLLOW_UP_QUESTIONS } from '../../domain/types/follow-up.js';
import type { PersistedContentItem } from '../../domain/types/content-item-record.js';
import { FOLLOW_UP_QUESTION_FIELD_KEY } from '../../domain/types/content-item-record.js';
import type { FollowUpGapKey } from './types.js';
import { FOLLOW_UP_GAP_KEYS, GAP_PRIORITY, isFollowUpGapKey } from './types.js';

/** The canonical cap. A ceiling - not a target. */
export const MAX_FOLLOW_UP_QUESTIONS = MAX_KEY_FOLLOW_UP_QUESTIONS;

/** Canonical rule name for the counting semantics (docs/05 §2 / `D-017`). */
export const FOLLOW_UP_BUDGET_RULE = 'max-3-key-questions-total';

export interface AskedFollowUpQuestion {
  readonly target_gap: FollowUpGapKey;
  readonly question_text: string;
}

export interface FollowUpQuestionBudget {
  readonly rule: typeof FOLLOW_UP_BUDGET_RULE;
  readonly max_total: typeof MAX_FOLLOW_UP_QUESTIONS;
  /** Questions actually ASKED by the system, in order. Never longer than `max_total`. */
  readonly asked: readonly AskedFollowUpQuestion[];
  /** Gaps the user dismissed with 「不知道 / 跳过」 - never asked again (AC-17). */
  readonly skipped_gaps: readonly FollowUpGapKey[];
}

export function createFollowUpQuestionBudget(): FollowUpQuestionBudget {
  return {
    rule: FOLLOW_UP_BUDGET_RULE,
    max_total: MAX_FOLLOW_UP_QUESTIONS,
    asked: [],
    skipped_gaps: [],
  };
}

/** Deterministic remaining budget: `max_total - asked.length`, floored at 0. */
export function remainingFollowUpQuestions(budget: FollowUpQuestionBudget): number {
  return Math.max(0, budget.max_total - budget.asked.length);
}

export function isFollowUpBudgetExhausted(budget: FollowUpQuestionBudget): boolean {
  return remainingFollowUpQuestions(budget) === 0;
}

export function askedFollowUpGaps(budget: FollowUpQuestionBudget): readonly FollowUpGapKey[] {
  return budget.asked.map((entry) => entry.target_gap);
}

/** A record of one question the system WANTED to ask - a proposal, not yet a question. */
export interface FollowUpQuestionProposal {
  readonly question_text: string;
  /**
   * 🔴 The gaps the question is about. Exactly ONE entry is legal; two or more is the forbidden
   *    "bundled question" (AC-Q06-3).
   */
  readonly target_gaps: readonly FollowUpGapKey[];
}

export type FollowUpRequestRejectionCode =
  | 'BUDGET_EXHAUSTED'
  | 'NO_TARGET_GAP'
  | 'MULTIPLE_GAPS_BUNDLED'
  | 'GAP_NOT_A_KEY_GAP'
  | 'GAP_ALREADY_ASKED'
  | 'GAP_ALREADY_DISMISSED'
  | 'EMPTY_QUESTION_TEXT';

export type FollowUpRequestResult =
  | { readonly allowed: true; readonly budget: FollowUpQuestionBudget }
  | {
      readonly allowed: false;
      readonly code: FollowUpRequestRejectionCode;
      readonly detail: string;
      /** Unchanged on every rejection - a refused question must not cost budget. */
      readonly budget: FollowUpQuestionBudget;
    };

function reject(
  budget: FollowUpQuestionBudget,
  code: FollowUpRequestRejectionCode,
  detail: string,
): FollowUpRequestResult {
  return { allowed: false, code, detail, budget };
}

/**
 * Asks one follow-up question, if it is legal.
 *
 * Rejection order is deliberate: the budget is checked FIRST, so a 4th question can never be
 * produced for any reason and no other branch can accidentally bypass the cap (AC-16).
 */
export function requestFollowUpQuestion(
  budget: FollowUpQuestionBudget,
  proposal: FollowUpQuestionProposal,
): FollowUpRequestResult {
  if (isFollowUpBudgetExhausted(budget)) {
    return reject(
      budget,
      'BUDGET_EXHAUSTED',
      `The key follow-up question budget is a total of ${MAX_FOLLOW_UP_QUESTIONS}; the 4th question must not exist (D-017 / AC-16).`,
    );
  }
  if (proposal.question_text.trim().length === 0) {
    return reject(budget, 'EMPTY_QUESTION_TEXT', 'A follow-up question needs wording of its own.');
  }
  if (proposal.target_gaps.length === 0) {
    return reject(
      budget,
      'NO_TARGET_GAP',
      'A follow-up question must name the single gap it is about.',
    );
  }
  if (proposal.target_gaps.length > 1) {
    return reject(
      budget,
      'MULTIPLE_GAPS_BUNDLED',
      'One question targets ONE main high-value gap; bundling several gaps into one question to dodge the total budget is forbidden (D-017 / AC-Q06-3).',
    );
  }
  const target = proposal.target_gaps[0] as FollowUpGapKey;
  if (!isFollowUpGapKey(target)) {
    return reject(
      budget,
      'GAP_NOT_A_KEY_GAP',
      `Only the canonical P1/P2/P3 gaps may be asked about; "${String(target)}" is not one of them (D-018 / AC-19).`,
    );
  }
  if (askedFollowUpGaps(budget).includes(target)) {
    return reject(
      budget,
      'GAP_ALREADY_ASKED',
      'This gap was already asked; re-presenting the same question does not make it a new one (AC-Q06-1).',
    );
  }
  if (budget.skipped_gaps.includes(target)) {
    return reject(
      budget,
      'GAP_ALREADY_DISMISSED',
      'The user already answered 「不知道 / 跳过」 for this gap; it must not be asked again (D-023 / AC-17).',
    );
  }
  return {
    allowed: true,
    budget: {
      ...budget,
      asked: [...budget.asked, { target_gap: target, question_text: proposal.question_text }],
    },
  };
}

/**
 * Records that the user dismissed a gap with 「不知道 / 跳过」.
 * 🔴 No budget is consumed: the user's answer ends the追问 for that gap, it is not a question.
 */
export function recordFollowUpGapDismissed(
  budget: FollowUpQuestionBudget,
  gap: FollowUpGapKey,
): FollowUpQuestionBudget {
  if (budget.skipped_gaps.includes(gap)) {
    return budget;
  }
  return { ...budget, skipped_gaps: [...budget.skipped_gaps, gap] };
}

/**
 * Records a value the user supplied ON THEIR OWN initiative.
 * 🔴 AC-Q06-4: it neither consumes budget nor reduces the questions the system still owes.
 */
export function recordUserSuppliedGap(
  budget: FollowUpQuestionBudget,
  _gap: FollowUpGapKey,
): FollowUpQuestionBudget {
  return budget;
}

/**
 * The next gap worth asking about, honouring the canonical `P1` → `P2` → `P3` priority.
 *
 * Returns `null` when there is nothing left to ask (no gap, everything already asked /
 * dismissed, or the budget is exhausted) - and `null` always means "go to the structured
 * confirmation step", never "ask something to fill the quota" (AC-14 / AC-15).
 */
export function nextFollowUpGap(
  budget: FollowUpQuestionBudget,
  missing_gaps: readonly FollowUpGapKey[],
): FollowUpGapKey | null {
  if (isFollowUpBudgetExhausted(budget)) {
    return null;
  }
  const asked = askedFollowUpGaps(budget);
  const candidates = FOLLOW_UP_GAP_KEYS.filter(
    (gap) => missing_gaps.includes(gap) && !asked.includes(gap) && !budget.skipped_gaps.includes(gap),
  );
  if (candidates.length === 0) {
    return null;
  }
  const priority: readonly string[] = ['P1', 'P2', 'P3'];
  return [...candidates].sort(
    (left, right) => priority.indexOf(GAP_PRIORITY[left]) - priority.indexOf(GAP_PRIORITY[right]),
  )[0] as FollowUpGapKey;
}

/* ------------------------------------------------------------------ *
 * Persisted budget (S01-05-INTEGRATE)
 * ------------------------------------------------------------------ */

/**
 * The persisted `followup_question` texts, in REGISTRATION order.
 *
 * 🔴 The sidecar keeps `content_items` in write order and every question is only ever appended,
 *    so `index i` here matches `AttemptDraftState.asked_gap_set[i]`. The sidecar parser rejects a
 *    document where the two lists disagree in length, so this correspondence is enforced, not
 *    assumed.
 */
export function followUpQuestionTexts(
  items: readonly PersistedContentItem[],
): readonly string[] {
  return items
    .filter((item) => item.field_key === FOLLOW_UP_QUESTION_FIELD_KEY)
    .map((item) => item.value);
}

/**
 * Rebuilds the question budget from the PERSISTED draft state + persisted question items.
 *
 * 🔴 This is what makes the budget survive a browser reload / service recreation: the in-memory
 *    `FollowUpQuestionBudget` is only a cache, the draft state is the record (task §7 / §12).
 * 🔴 `skipped_gaps` is the CANONICAL `abandoned_gap_set`; `asked` comes from the persisted
 *    `asked_gap_set` + the persisted question texts, so the 4th question stays impossible after a
 *    reload (AC-16).
 */
export function budgetFromPersistedState(
  state: AttemptDraftState,
  question_texts: readonly string[],
): FollowUpQuestionBudget {
  return {
    rule: FOLLOW_UP_BUDGET_RULE,
    max_total: MAX_FOLLOW_UP_QUESTIONS,
    asked: state.asked_gap_set.map((gap, index) => ({
      target_gap: gap,
      question_text: question_texts[index] ?? '',
    })),
    skipped_gaps: [...state.abandoned_gap_set],
  };
}
