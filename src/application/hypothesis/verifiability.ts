/**
 * S01 ｜ `M9` verifiability of ⑦⑧: is the direction observable AND distinguishable?
 *
 * Contract: §8.3 (the `EXIT-B` route), §9.2, §18 of the task, `D-028` (the count and the A/B/C
 * exits), `D-037` (no numeric judgement quantity reaches the product).
 *
 * 🔴 NO NUMERIC THRESHOLD IS REQUIRED. A user's own historical threshold may be referenced (`Fact`);
 *    otherwise an OBSERVABLE, DISTINGUISHABLE qualitative criterion is fully legal. `M9` never
 *    invents a number, and a missing threshold never blocks a hypothesis.
 * 🔴 ⑦ AND ⑧ MUST BE OBSERVABLE AND MUTUALLY EXCLUSIVE. A pair that cannot be told apart produces no
 *    information, so 「效果更好」「性能提升」「看起来改善」「结果不错」are refused by name (§18).
 * 🔴 THE ANSWER IS BINARY: `verifiable` / `not_verifiable`. There is no grade, no confidence and no
 *    score - the discrete `M10` answer is consumed as a discrete value, never as a weight.
 * 🔴 BOTH HALVES ARE REQUIRED: the deterministic word / structure checks AND the independent discrete
 *    `M10` check. Neither one alone can admit a criterion pair, because a prompt is a request and a
 *    word list is not a semantic model.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, no LLM.
 */

import {
  findVagueCriterionPhrasing,
  normalizeProposalText,
} from './text.js';
import type { HypothesisPayloadIssue } from './types.js';

/* ------------------------------------------------------------------ *
 * 1. The two discrete answers the independent check may give
 * ------------------------------------------------------------------ */

export type CriteriaCheckValue = 'observable_and_exclusive' | 'not_observable_or_not_exclusive';

export const CRITERIA_CHECK_VALUES: readonly CriteriaCheckValue[] = [
  'observable_and_exclusive',
  'not_observable_or_not_exclusive',
];

/** The binary grounding answer the independent check may give (§8.2 rule 1 / `TQ34`). */
export type GroundingCheckValue = 'grounded' | 'not_grounded';

export const GROUNDING_CHECK_VALUES: readonly GroundingCheckValue[] = [
  'grounded',
  'not_grounded',
];

/* ------------------------------------------------------------------ *
 * 2. The structural half
 * ------------------------------------------------------------------ */

export type CriteriaVerdict = 'verifiable' | 'not_verifiable';

export interface CriteriaEvaluation {
  readonly verdict: CriteriaVerdict;
  readonly detail: string;
}

/**
 * The structural half of the verifiability judgement.
 *
 * 🔴 Runs WITHOUT any model call, so a clearly unacceptable pair can never reach a prompt and a
 *    refusal is explainable from the text alone.
 * 🔴 「完全无法形成」 is decided here or by the independent check; either way a `not_verifiable`
 *    outcome for EVERY grounded proposal turns the generation into `EXIT-B` (§8.3 / Q7).
 */
export function evaluateCriteriaStructurally(input: {
  readonly support_criterion: string | null;
  readonly refutation_criterion: string | null;
}): CriteriaEvaluation {
  const support = input.support_criterion;
  const refutation = input.refutation_criterion;
  if (support === null || support.trim().length === 0 || refutation === null || refutation.trim().length === 0) {
    return {
      verdict: 'not_verifiable',
      detail:
        'A verifiable direction needs BOTH ⑦ (what would support it) and ⑧ (what would refute it); with one of them explicitly missing the pair cannot be observed and told apart (§18).',
    };
  }
  if (normalizeProposalText(support) === normalizeProposalText(refutation)) {
    return {
      verdict: 'not_verifiable',
      detail:
        '⑦ and ⑧ are the same statement, so nothing could ever be told apart; they must be mutually exclusive (§18).',
    };
  }
  const vague_support = findVagueCriterionPhrasing(support);
  if (vague_support.length > 0) {
    return {
      verdict: 'not_verifiable',
      detail: `⑦ uses "${vague_support.join('", "')}", which names no observable outcome; §18 refuses this form.`,
    };
  }
  const vague_refutation = findVagueCriterionPhrasing(refutation);
  if (vague_refutation.length > 0) {
    return {
      verdict: 'not_verifiable',
      detail: `⑧ uses "${vague_refutation.join('", "')}", which names no observable outcome; §18 refuses this form.`,
    };
  }
  return {
    verdict: 'verifiable',
    detail: 'The pair is non-blank, distinct and free of the refused vague phrasings.',
  };
}

/* ------------------------------------------------------------------ *
 * 3. The combined judgement (structural AND the independent check)
 * ------------------------------------------------------------------ */

export interface CriteriaJudgement extends CriteriaEvaluation {
  readonly source: 'structural_rules' | 'discrete_ai_check';
  /** Populated when the independent check refused the pair; `[]` otherwise. */
  readonly issues: readonly HypothesisPayloadIssue[];
}

/**
 * Combines the structural verdict with the independent discrete answer.
 *
 * 🔴 The AI answer can only ever REFUSE. It can never make an unacceptable pair acceptable, because
 *    the structural verdict is applied first and a refusal there wins.
 */
export function judgeCriteria(input: {
  readonly support_criterion: string | null;
  readonly refutation_criterion: string | null;
  readonly checked: CriteriaCheckValue | null;
  readonly checked_reason: string | null;
}): CriteriaJudgement {
  const structural = evaluateCriteriaStructurally(input);
  if (structural.verdict === 'not_verifiable') {
    return { ...structural, source: 'structural_rules', issues: [] };
  }
  if (input.checked === null) {
    return {
      verdict: 'not_verifiable',
      detail:
        'The independent observability check never ran, so「可观察、可区分」was never confirmed; an unconfirmed verifiability may not pass as verified (§18).',
      source: 'structural_rules',
      issues: [],
    };
  }
  if (input.checked === 'not_observable_or_not_exclusive') {
    return {
      verdict: 'not_verifiable',
      detail:
        input.checked_reason === null || input.checked_reason.trim().length === 0
          ? 'The independent check refused the ⑦⑧ pair.'
          : input.checked_reason,
      source: 'discrete_ai_check',
      issues: [],
    };
  }
  return {
    verdict: 'verifiable',
    detail:
      input.checked_reason === null || input.checked_reason.trim().length === 0
        ? 'The independent check confirmed the pair is observable and mutually exclusive.'
        : input.checked_reason,
    source: 'discrete_ai_check',
    issues: [],
  };
}

/**
 * The ⑥ metric note.
 *
 * 🔴 `M9` never REQUIRES a numeric threshold (§18): a metric that cites a user's own historical
 *    threshold is legal, a qualitative observable is equally legal, and their absence is never the
 *    reason a hypothesis is refused. This helper exists only so the read model can say which case it
 *    is, without inventing a number.
 */
export function metricThresholdNote(observation_metric: string | null): string | null {
  if (observation_metric === null || observation_metric.trim().length === 0) {
    return '⑥ 当前未提供（允许显式缺失，不阻断假设形成）。';
  }
  return null;
}
