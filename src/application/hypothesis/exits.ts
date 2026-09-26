/**
 * S01 ｜ `M9` the three zero-output exits (§8.3 / §9.2 / `D-028`).
 *
 * Contract: §8.3 (count `1-2` and routes `A` / `B` / `C`), §9.2 (the three exits and the ban on
 * collapsing them into one sentence), `D-028`, `D-046` V-1 (the two empty states are NOT the same
 * statement), `D-047` (a silent zero result is refused).
 *
 * 🔴 THE THREE ROUTES ARE NOT INTERCHANGEABLE:
 *   - `EXIT-A` `evidence-insufficient` - `N_检索 = 0`, or related history exists but no grounding
 *     criterion is met;
 *   - `EXIT-B` `not-verifiable` - grounding IS established, but no observable, distinguishable
 *     verification criterion can be formed;
 *   - `EXIT-C` `not-formable` - even a clear hypothesis proposition cannot be formed.
 *   🔴 Writing `B` or `C` as 「历史证据不足」 is explicitly forbidden (§9.2 / Q9): it would blame the
 *      evidence for a failure that has nothing to do with the evidence.
 * 🔴 A ZERO OUTPUT IS NEVER SILENT: every route carries a non-blank `absence_statement`, and the two
 *    empty states (`HISTORY_EMPTY` / `NO_RELATED_HISTORY`) are told apart instead of sharing wording.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { RetrievalStatus } from '../../retrieval/compare/types.js';
import type { HypothesisExitRoute } from './types.js';

/**
 * Wordings that claim the EVIDENCE was insufficient.
 *
 * 🔴 An `EXIT-B` / `EXIT-C` statement carrying one of these is refused: the evidence was fine, and
 *    saying otherwise would misreport why nothing was produced (§9.2 / Q9).
 */
export const EVIDENCE_INSUFFICIENCY_PHRASINGS: readonly string[] = [
  '证据不足',
  '历史证据不足',
  '证据不够',
  '证据缺乏',
  '没有足够证据',
  '缺少证据',
  'insufficient evidence',
  'not enough evidence',
];

export function findEvidenceInsufficiencyWording(text: string): readonly string[] {
  const haystack = text.toLowerCase();
  return EVIDENCE_INSUFFICIENCY_PHRASINGS.filter((token) =>
    haystack.includes(token.toLowerCase()),
  );
}

/** The structural facts the route is derived from. Every one of them is machine-computed. */
export interface ExitClassificationInput {
  /** `N_检索`, read from the `M6` derivation - the FIRST gate (§6). */
  readonly n_retrieval: number;
  /** The current derivation's own status, or `null` when none exists. */
  readonly derivation_status: RetrievalStatus | null;
  /** `true` when at least one related, referenceable content candidate exists. */
  readonly grounding_possible: boolean;
  /** How many grounded proposals the model offered. */
  readonly grounded_proposal_count: number;
  /** How many of them passed BOTH the structural grounding pass and the independent check. */
  readonly grounding_passed: number;
  /** How many of the grounding-passed ones also had verifiable ⑦⑧. */
  readonly verifiable_passed: number;
  /** The route the model claimed when it formed no grounded hypothesis; `null` otherwise. */
  readonly claimed_route: HypothesisExitRoute | null;
}

export interface ExitClassification {
  /** `null` when the generation DID produce at least one grounded hypothesis. */
  readonly route: HypothesisExitRoute | null;
  readonly absence_statement: string | null;
}

/* ------------------------------------------------------------------ *
 * 1. The `EXIT-A` statement (three distinguishable situations)
 * ------------------------------------------------------------------ */

/**
 * The `EXIT-A` reason.
 *
 * 🔴 `HISTORY_EMPTY` and `NO_RELATED_HISTORY` are both legitimate successes but NOT the same
 *    statement, so they must never share one wording (`D-046` V-1 / AC-97 / AC-98).
 */
export function absenceStatementForExitA(input: {
  readonly n_retrieval: number;
  readonly derivation_status: RetrievalStatus | null;
  readonly grounding_possible: boolean;
}): string {
  if (input.derivation_status === null) {
    return '这条记录还没有可用的历史检索结果，所以还没有可以对照的历史材料，本次不形成任何有历史依据的假设。';
  }
  if (input.derivation_status === 'HISTORY_EMPTY') {
    return '除本次记录以外，工作区里还没有可用的历史正式记录，因此没有可以对照的历史材料，本次不形成有历史依据的假设。';
  }
  if (input.derivation_status === 'NO_RELATED_HISTORY' || input.n_retrieval <= 0) {
    return '工作区里已有历史正式记录，但没有任何一条与本次记录相关，因此没有可以对照的历史材料，本次不形成有历史依据的假设。';
  }
  if (!input.grounding_possible) {
    return '本次检索结果里没有任何可以引用的具体内容条目，因此没有可指出的历史字段，本次不形成有历史依据的假设。';
  }
  return '本次检索到的相关历史里，没有任何一项能够支撑这条方向（问题对象 / 条件 / 目标指标 / 排除项都不来自历史），因此本次不形成有历史依据的假设。';
}

/* ------------------------------------------------------------------ *
 * 2. The `EXIT-B` / `EXIT-C` statements
 * ------------------------------------------------------------------ */

/** `EXIT-B` `not-verifiable`: grounding held, but nothing observable / distinguishable could form. */
export const ABSENCE_STATEMENT_EXIT_B =
  '本次已经找到了可以追溯的历史依据，但无法据此形成可观察、可区分的验证判据：⑦（什么结果支持）与⑧（什么结果反驳）无法同时给出，或两者无法区分。因此本次不形成假设。补充一个可观察的支持 / 反驳判据后，可以重新生成。';

/** `EXIT-C` `not-formable`: not even a clear hypothesis proposition could be formed. */
export const ABSENCE_STATEMENT_EXIT_C =
  '本次无法把它整理成一条明确的待验证假设（连“改什么、观察什么”都无法说清），因此本次不形成假设。把这一轮最想验证的一点说得更具体一些，可以重新生成。';

/* ------------------------------------------------------------------ *
 * 3. Classification
 * ------------------------------------------------------------------ */

/**
 * Derives the route and the statement.
 *
 * 🔴 THE ROUTE IS DERIVED STRUCTURALLY, never taken from the model's own claim: the claim is only
 *    consulted for the one case the structure cannot settle (nothing was formable at all).
 * 🔴 `grounding_possible === false` SHORT-CIRCUITS to `EXIT-A`: with no source material the route is
 *    determined without asking anybody (§6).
 */
export function classifyExit(input: ExitClassificationInput): ExitClassification {
  if (input.verifiable_passed > 0) {
    return { route: null, absence_statement: null };
  }
  if (!input.grounding_possible) {
    return {
      route: 'EXIT-A',
      absence_statement: absenceStatementForExitA(input),
    };
  }
  if (input.grounding_passed > 0) {
    /* Grounding was established; what failed is verifiability. NEVER 「证据不足」 (§9.2 / Q9). */
    return { route: 'EXIT-B', absence_statement: ABSENCE_STATEMENT_EXIT_B };
  }
  if (input.grounded_proposal_count === 0 && input.claimed_route === 'EXIT-C') {
    return { route: 'EXIT-C', absence_statement: ABSENCE_STATEMENT_EXIT_C };
  }
  return { route: 'EXIT-A', absence_statement: absenceStatementForExitA(input) };
}

/**
 * `true` when a statement mislabels `EXIT-B` / `EXIT-C` as an evidence problem.
 *
 * 🔴 Used as a structural guard: producing such a sentence is a defect, not a style choice.
 */
export function mislabelsExitAsEvidenceInsufficiency(
  route: HypothesisExitRoute,
  statement: string,
): boolean {
  if (route === 'EXIT-A') {
    return false;
  }
  return findEvidenceInsufficiencyWording(statement).length > 0;
}

/** The canonical route label, for display. Never a substitute for the statement. */
export function exitRouteMeaning(route: HypothesisExitRoute): string {
  if (route === 'EXIT-A') {
    return '证据不足（没有可以对照的历史材料，或相关历史无法支撑这条方向）';
  }
  if (route === 'EXIT-B') {
    return '已有历史依据，但无法形成可观察、可区分的验证判据';
  }
  return '连明确的待验证假设都无法形成';
}
