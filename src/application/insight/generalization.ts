/**
 * S01 ｜ `M8` structural content guards: the wording red line and the single-record
 *            generalization guard.
 *
 * Contract / decision basis:
 *   - `D-038` 措辞红线: 「不得出现『已证实 / 已验证 / 方法 X 无效』；来源类型恒为 `Inference`」;
 *   - `D-021 E4` 特别确认: 「`N = 1` 仍允许形成『当前具体条件下的局部经验』，但必须继续遵守 D7：
 *     **不得产生一般性规律**」;
 *   - contract §4.2 rule 2: an `accepted Insight` stays `Inference` forever - nothing here
 *     relabels a judgement as a proven fact;
 *   - contract §9 step ⑧ / §19 of the M8 task: 「单条历史不得形成『X 方法无效』『X 普遍导致失败』
 *     『一定会……』」and 「不能通过 prompt wording 绕过该限制」.
 *
 * 🔴 WHY THESE GUARDS ARE STRUCTURAL, NOT PROMPT-ONLY: a prompt is a request, not an enforcement
 *    point. The task explicitly forbids relying on the prompt for the `N = 1` boundary, so the
 *    same constraint is ALSO a deterministic, enumerable check over the produced text.
 * 🔴 WHAT THEY ARE NOT: they are not a semantic model, not a quality score and not a graded
 *    judgement. Every result is a DISCRETE allow / refuse with the matching token, so a refusal
 *    is explainable and a reviewer can audit the enumerable lists below. They deliberately do not
 *    "measure" a claim - they refuse a named form.
 * 🔴 A guard refusal never silently rewrites the text: the proposal is refused as a whole and the
 *    user may retry (task §32 / §44 of the M8 task).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, no LLM.
 */

/* ------------------------------------------------------------------ *
 * 1. 措辞红线 (`D-038` / contract §9)
 * ------------------------------------------------------------------ */

/**
 * Wording that asserts PROOF / FACT status. An `Insight` is an `Inference` for its whole life
 * (`D-038` / contract §4.2 rule 2), so none of these may appear in a persisted content field.
 */
export const FORBIDDEN_PROOF_WORDINGS: readonly string[] = [
  '已证实',
  '已被证实',
  '已经证实',
  '已验证为事实',
  '已被验证为事实',
  '验证为事实',
  '证明了',
  '已被证明',
  '已经证明',
  '已被证明无效',
  '确认为事实',
  '已被确认成立',
  'proven',
  'has been proven',
  'verified as fact',
  'proves that',
];

/** Every forbidden wording present in the text, in list order. Empty means 「clean」. */
export function findForbiddenProofWording(text: string): readonly string[] {
  const haystack = text.toLowerCase();
  return FORBIDDEN_PROOF_WORDINGS.filter((token) => haystack.includes(token.toLowerCase()));
}

/* ------------------------------------------------------------------ *
 * 2. 单条记录不得形成一般性规律 (`D-021 E4` / `D-007`)
 * ------------------------------------------------------------------ */

/**
 * Tokens that turn a statement into a GENERAL RULE (a claim about every case) rather than an
 * observation about the recorded conditions.
 */
export const GENERALIZING_MARKERS: readonly string[] = [
  /* universal quantifiers / always-never */
  '普遍',
  '一般来说',
  '通常',
  '总是',
  '一直',
  '从不',
  '绝不',
  '永远',
  '所有',
  '任何情况',
  '无一例外',
  '毫无疑问',
  '必然',
  '一定会',
  '一定导致',
  '一定造成',
  '都会导致',
  '都会失败',
  /* bare invalidity assertions about a method / approach as such */
  '无效',
  '不成立',
  '行不通',
  '不可行',
  /* English equivalents */
  'universally',
  'in general',
  'invariably',
  'all cases',
  'every case',
  'always',
  'never',
];

/**
 * Tokens that bind a statement to the RECORDED conditions - the legitimate form of a
 * single-record（`N = 1`）local experience.
 *
 * 🔴 Only used as an escape hatch: a text that carries a generalizing marker AND a local bound is
 *    treated as locally scoped, so 「在当前条件下，本次观察到的做法未达到目标」 stays legal.
 */
export const LOCAL_BOUND_QUALIFIERS: readonly string[] = [
  '在当前条件下',
  '在本次条件下',
  '在当前已知条件',
  '在当前范围',
  '在此条件下',
  '在这一条件下',
  '该条件下',
  '本记录',
  '本次记录',
  '本次尝试',
  '本次观察',
  '所记录的条件',
  'in this record',
  'under these conditions',
  'in this case',
  'this attempt',
];

/** The generalizing marker present in the text, or `null`. */
export function findGeneralizingMarker(text: string): string | null {
  const haystack = text.toLowerCase();
  return GENERALIZING_MARKERS.find((token) => haystack.includes(token.toLowerCase())) ?? null;
}

/** `true` when the text explicitly binds itself to the recorded conditions. */
export function hasLocalBoundQualifier(text: string): boolean {
  const haystack = text.toLowerCase();
  return LOCAL_BOUND_QUALIFIERS.some((token) => haystack.includes(token.toLowerCase()));
}

export type SingleSourceGuardResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly marker: string; readonly detail: string };

/**
 * The `N = 1` generalization guard.
 *
 * 🔴 Applies ONLY when the evidence base is a SINGLE record (or none): with one record there is
 *    exactly one observation, and one observation can never establish a general rule. A
 *    multi-record evidence base is judged by `E2` / `E3`, not by this guard.
 * 🔴 A claim that carries no generalizing marker is allowed - 「局部经验」is a legitimate outcome
 *    (`D-021 E4` / task §10 `N1`).
 * 🔴 A claim that carries a generalizing marker must be explicitly bound to the recorded
 *    conditions to be admitted.
 */
export function singleSourceGeneralizationGuard(input: {
  /** Distinct `EvidenceRef.target_id` values backing the statement (set size, task §10). */
  readonly distinct_evidence_targets: number;
  readonly proposition: string;
}): SingleSourceGuardResult {
  if (input.distinct_evidence_targets > 1) {
    return { allowed: true };
  }
  const marker = findGeneralizingMarker(input.proposition);
  if (marker === null) {
    return { allowed: true };
  }
  if (hasLocalBoundQualifier(input.proposition)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    marker,
    detail:
      `The evidence base is a single record (distinct evidence targets = ${String(input.distinct_evidence_targets)}), ` +
      `so a general rule cannot be formed: the proposition carries "${marker}" without binding itself to the recorded conditions. ` +
      'A single-record `Insight` may only state a local experience under the recorded conditions (D-021 E4 / D-007).',
  };
}
