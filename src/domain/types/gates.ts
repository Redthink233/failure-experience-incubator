/**
 * Insight promotion gates `E1` - `E5`.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md §2.2 / §9 step ⑧
 *   - `E1`-`E4` eligibility conditions; `E5` = the user explicitly accepting;
 *   - when `E2` / `E3` are unsatisfied the `Insight` stays `candidate` and the
 *     three-part presentation is required: 缺什么 / 为什么重要 / 如何补充
 *     (D-038 / AC-99);
 *   - "如何补充" is an AI suggestion and MUST be labelled as a display-type
 *     `Inference`; it MUST NOT bypass `E5`.
 *
 * 🔴 A missing gate never silently discards the `Insight` and never auto-promotes it.
 * 🔴 No confidence / score / grade wording is allowed here (AC-93).
 */

import type { DisplayInferenceContentItem } from './source-type.js';

/** The five eligibility gates. `E5` is the user's explicit acceptance. */
export type GateId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5';

export const ALL_GATE_IDS: readonly GateId[] = ['E1', 'E2', 'E3', 'E4', 'E5'];

/** `E1`-`E4` - the eligibility conditions checked before an accept action. */
export const INSIGHT_ELIGIBILITY_GATES: readonly GateId[] = ['E1', 'E2', 'E3', 'E4'];

/** `E5` - equivalence class of the user explicitly accepting the Insight. */
export const INSIGHT_ACCEPTANCE_GATE: 'E5' = 'E5';

/**
 * The three-part presentation of an unmet gate (D-038).
 *
 * 🔴 `how_to_supplement` is an AI suggestion and is therefore ALWAYS a
 *    DISPLAY-type `Inference` - D-038 classifies "如何补充" as 展示型 `Inference`
 *    (it changes no persisted business state and is never reused as a decision
 *    basis). Its type is narrowed to `DisplayInferenceContentItem` so that a
 *    DECISION-type `Inference` - the kind that would require an explicit user
 *    accept/reject (§4.3) - is rejected by the COMPILER, not merely by review.
 */
export interface GateMissingItem {
  /** 缺什么 */
  readonly description: string;
  /** 为什么重要 */
  readonly why_important: string;
  /**
   * 如何补充 - AI suggestion (display-type `Inference` only), or `null` when not offered.
   * 🔴 A `DecisionInferenceContentItem` is NOT assignable here (D-038 / §4.3).
   */
  readonly how_to_supplement: DisplayInferenceContentItem | null;
}

export interface GateCheckResult {
  readonly gate_id: GateId;
  readonly satisfied: boolean;
  readonly missing_items: readonly GateMissingItem[];
}

export function gateSatisfied(gate_id: GateId): GateCheckResult {
  return { gate_id, satisfied: true, missing_items: [] };
}

export function gateUnsatisfied(
  gate_id: GateId,
  missing_items: readonly GateMissingItem[],
): GateCheckResult {
  return { gate_id, satisfied: false, missing_items };
}

/** All checks satisfied (an empty result set counts as satisfied). */
export function allGatesSatisfied(results: readonly GateCheckResult[]): boolean {
  return results.every((result) => result.satisfied);
}

/** Gate ids that are not satisfied, in canonical order. */
export function unsatisfiedGateIds(results: readonly GateCheckResult[]): readonly GateId[] {
  return ALL_GATE_IDS.filter((gate_id) => {
    const found = results.find((result) => result.gate_id === gate_id);
    return found !== undefined && !found.satisfied;
  });
}

/**
 * §2.2: `candidate -> accepted` is only reachable when `E1`-`E4` are satisfied.
 * The returned value only states eligibility - the accept action itself is `E5`
 * and MUST be performed explicitly by the user (never auto-accepted).
 */
export function canAcceptInsight(results: readonly GateCheckResult[]): boolean {
  return INSIGHT_ELIGIBILITY_GATES.every((gate_id) => {
    const found = results.find((result) => result.gate_id === gate_id);
    return found !== undefined && found.satisfied;
  });
}

/**
 * Rejects are NOT gated: a user may reject a `candidate` Insight even when
 * `E1`-`E4` are unsatisfied (§2.2 / D-015).
 */
export function canRejectInsight(): boolean {
  return true;
}
