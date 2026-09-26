/**
 * S01 ｜ `M9` the `Hypothesis` decision slot and the `Model Suggestion` SAVE slot.
 *
 * Contract: §2.3 (one id space, decision slot `undecided` / `accepted` / `rejected`, `candidate`
 * forbidden), §2.4 / `D-051` (a new generation never inherits the old slot), §8.4 (`D-042`: SAVE ≠
 * ACCEPT ≠ 采纳 ≠ 确认), §8.5 (the ONE legal conversion path), §8.6 rules 4 / 9, `D-041`.
 *
 * 🔴 WHAT `accepted` MEANS: 「我认可这是一个值得下一步验证的方向」. It does NOT mean the hypothesis is
 *    supported, verified, confirmed, an experience or a `Fact`. Its source stays `Inference` forever.
 * 🔴 SAVE AND DECISION ARE INDEPENDENT SLOTS: `saved = true` + `undecided` is a legal state whose ONLY
 *    meaning is 「内容被保留，决策状态仍未完成」. `save` never implies `accept`, and `accept` never
 *    implies `saved` (`D-042` / AC-68 / AC-70).
 * 🔴 THE DECISION SLOT NEVER MOVES BECAUSE OF CONTENT: editing ⑥⑦⑧ leaves it exactly as it was
 *    (frozen `decisionStateAfterEditableItemChange`), and a new generation starts `undecided`
 *    (frozen `decisionStateOfNewGeneration`).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { DecisionState, HypothesisKind } from '../../domain/types/hypothesis.js';
import {
  HYPOTHESIS_KINDS,
  MODEL_SUGGESTION_ANNOTATION,
  decisionStateAfterEditableItemChange,
  decisionStateOfNewGeneration,
  isModelSuggestion,
  isSavedButUndecided,
} from '../../domain/types/hypothesis.js';

export type HypothesisDecisionAction = 'accept' | 'reject';

/**
 * The v1 decision matrix.
 *
 * 🔴 Deliberately MINIMAL and explicit: the contract describes exactly two user decisions (accept a
 *    direction, reject a direction) and no revocation. Everything else - including promoting a
 *    `rejected` direction back to `accepted` - is refused, and the sanctioned way to revisit a
 *    rejected direction is an explicit regeneration (§34), which produces a NEW hypothesis while the
 *    old one keeps its slot.
 * 🔴 No `candidate` value exists anywhere in this matrix (`§2.3`).
 */
export interface DecisionTransitionRule {
  readonly from: DecisionState;
  readonly action: HypothesisDecisionAction;
  readonly to: DecisionState;
  /** `true` when the action is only legal with the user's explicit confirmation. */
  readonly requires_explicit_user_action: boolean;
}

export const HYPOTHESIS_DECISION_TRANSITIONS: readonly DecisionTransitionRule[] = [
  {
    from: 'undecided',
    action: 'accept',
    to: 'accepted',
    requires_explicit_user_action: true,
  },
  { from: 'undecided', action: 'reject', to: 'rejected', requires_explicit_user_action: false },
];

export type DecisionPlan =
  | { readonly ok: true; readonly next_state: DecisionState }
  | { readonly ok: false; readonly detail: string };

/**
 * Plans one decision change.
 *
 * 🔴 `accept` ALWAYS requires `user_explicitly_accepted`: no code path may accept a direction on the
 *    user's behalf (§22).
 */
export function planDecisionTransition(
  current: DecisionState,
  action: HypothesisDecisionAction,
  user_explicitly_accepted: boolean,
): DecisionPlan {
  const rule = HYPOTHESIS_DECISION_TRANSITIONS.find(
    (candidate) => candidate.from === current && candidate.action === action,
  );
  if (rule === undefined) {
    return {
      ok: false,
      detail:
        current === 'rejected'
          ? 'A rejected direction is not revived by a decision: a new explicit generation is the way to revisit it (D-051 / §34).'
          : `"${action}" is not a legal decision for a hypothesis in state "${current}".`,
    };
  }
  if (rule.requires_explicit_user_action && !user_explicitly_accepted) {
    return {
      ok: false,
      detail:
        'Accepting requires the user to explicitly confirm the direction; nothing accepts a hypothesis automatically (§22).',
    };
  }
  return { ok: true, next_state: rule.to };
}

/** `true` when either decision is still reachable, purely from the state. */
export function canAcceptHypothesis(current: DecisionState): boolean {
  return planDecisionTransition(current, 'accept', true).ok;
}

export function canRejectHypothesis(current: DecisionState): boolean {
  return planDecisionTransition(current, 'reject', false).ok;
}

/* ------------------------------------------------------------------ *
 * The SAVE slot (`D-042`)
 * ------------------------------------------------------------------ */

/**
 * The canonical meaning of a stored SAVE value, as a sentence.
 *
 * 🔴 `saved = true` + `undecided` may ONLY read as 「内容被保留，决策状态仍未完成」. Any wording that
 *    implies 已接受 / 已采纳 / 已确认 is forbidden (`D-042` / AC-68).
 * 🔴 `saved = false` MUST NOT be described as 「用户已保存」 either: a `Model Suggestion` produced by a
 *    generation is retained by the WORKSPACE, not by the user, so its label says so plainly.
 * 🔴 A `History-grounded Hypothesis` has NO save slot at all: the value is `null`, never `false`.
 */
export const SAVE_MEANING_NOT_APPLICABLE = '（历史依据假设没有「保存位」）';
export const SAVE_MEANING_RETAINED_UNDECIDED = '内容被保留，决策状态仍未完成';
export const SAVE_MEANING_RETAINED_DECIDED = '内容被保留（方向已由你裁决）';
export const SAVE_MEANING_NOT_SAVED = '本次生成结果，用户尚未保留';

export function saveMeaningOf(input: {
  readonly kind: HypothesisKind;
  readonly saved: boolean | null;
  readonly decision_state: DecisionState;
}): string | null {
  if (!isModelSuggestion(input.kind)) {
    return null;
  }
  if (input.saved !== true) {
    return SAVE_MEANING_NOT_SAVED;
  }
  return isSavedButUndecided(true, input.decision_state)
    ? SAVE_MEANING_RETAINED_UNDECIDED
    : SAVE_MEANING_RETAINED_DECIDED;
}

/** The permanent, whole-partition annotation of a `Model Suggestion` (§8.2 rule 3 / AC-69). */
export function modelPriorNoticeOf(kind: HypothesisKind): string | null {
  return isModelSuggestion(kind) ? MODEL_SUGGESTION_ANNOTATION : null;
}

/** Re-exported so a caller can assert the two-value kind set without importing the domain module. */
export const HYPOTHESIS_KIND_VALUES: readonly string[] = HYPOTHESIS_KINDS;

/**
 * The decision slot of a brand-new `Hypothesis`.
 *
 * 🔴 Always `undecided`; the frozen helper is consumed so there is one definition (`D-051`).
 */
export function initialDecisionState(): DecisionState {
  return decisionStateOfNewGeneration();
}

/**
 * The decision slot after a ⑥⑦⑧ edit.
 *
 * 🔴 Unchanged, by definition (§8.6 rule 4 / AC-104): there is no content-modification state machine
 *    for a `Hypothesis`, which is why changing ①②④⑤ requires editing the `Formal Attempt` and
 *    regenerating instead.
 */
export function decisionStateAfterCriteriaEdit(current: DecisionState): DecisionState {
  return decisionStateAfterEditableItemChange(current);
}
