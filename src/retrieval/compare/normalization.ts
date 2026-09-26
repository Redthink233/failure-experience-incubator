/**
 * S01-03 ｜ Safe deterministic text normalization for the dimension rule pass (`R-A` stage 1–2).
 *
 * Contract basis: `D-061` (`R-A` = Structured Field Rules + a discrete dimension judgement only
 * when the rules cannot decide) and `D-050` (a `matched` verdict needs STRICT semantic overlap).
 *
 * 🔴 THE WHOLE POINT OF THIS FILE IS WHAT IT REFUSES TO DO. Normalization may unify a *notation*,
 *    never a *meaning*:
 *      ✅ Unicode compatibility folding, case folding, whitespace collapsing, edge punctuation;
 *      ✅ an explicitly enumerated, dimension-safe unit synonym table;
 *      ❌ no stemming, no synonym expansion, no topic detection, no keyword clustering;
 *      ❌ nothing that could make two DIFFERENT substances normalize to the same string.
 *    A pair this file cannot unify is left different on purpose: the caller then asks the
 *    dimension judge instead of guessing (`D-050` "明确不充分" list).
 *
 * 🔴 Only `normalizeForComparison` output may be compared. The result is a COMPARISON-TIME
 *    temporary value: it is never written back to the `Attempt`, never replaces the user's `Fact`
 *    and never replaces an AI `Extraction` (§31 source-content integrity).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

/** Unicode compatibility folding (full-width → ASCII, `℃` → `°C`, …). */
const UNICODE_FOLD: 'NFKC' = 'NFKC';

const WHITESPACE_RUN = /\s+/g;

/** Edge punctuation only - internal punctuation is deliberately left untouched. */
const EDGE_PUNCTUATION = /^[.,;:!?。，、；：！？·…"'“”‘’()（）]+|[.,;:!?。，、；：！？·…"'“”‘’()（）]+$/g;

/**
 * Minimal, explicitly enumerated unit synonym table.
 *
 * 🔴 Deliberately TINY. Every entry must be a true notational equivalent of the same unit, so
 *    unifying it can never merge two different substances. Anything not listed here (for example a
 *    bare 「度」, which may be an angle or a temperature) stays untouched and is handed to the
 *    dimension judge - inventing an equivalence there would silently widen `matched`.
 *
 * Longest alternative first (`摄氏度` before `摄氏`), because alternation is ordered.
 */
const UNIT_SYNONYMS: readonly (readonly [RegExp, string])[] = [
  [/摄氏度|摄氏|℃|°c/g, '°c'],
  [/百分比/g, '%'],
];

const DIGIT_UNIT_GAP = /(\d)\s+(°c|%)/g;

function foldUnits(text: string): string {
  let result = text;
  for (const [pattern, canonical] of UNIT_SYNONYMS) {
    result = result.replace(pattern, canonical);
  }
  return result.replace(DIGIT_UNIT_GAP, '$1$2');
}

/**
 * Notation-level normalization. Deterministic and idempotent.
 *
 * Steps, in order: NFKC → case fold → unit synonyms → close the digit↔unit gap → collapse
 * whitespace → strip edge punctuation. Nothing here inspects the meaning of the text.
 */
export function normalizeForComparison(text: string): string {
  const folded = foldUnits(text.normalize(UNICODE_FOLD).toLowerCase());
  return folded.replace(WHITESPACE_RUN, ' ').trim().replace(EDGE_PUNCTUATION, '').trim();
}

/**
 * `true` when the two sides are the SAME substance expressed with the same notation.
 *
 * This is the only DETERMINISTIC route to `matched`: identical text after notation folding
 * (which covers `D-050` equivalence forms ①②③④ only where the difference really is notational,
 * e.g. `50°C` vs `50 摄氏度`). An empty side never matches - an empty string is not a substance.
 */
export function notationallyEqual(left: string, right: string): boolean {
  const normalizedLeft = normalizeForComparison(left);
  if (normalizedLeft.length === 0) {
    return false;
  }
  return normalizedLeft === normalizeForComparison(right);
}

/* ------------------------------------------------------------------ *
 * Quantity reading (used ONLY to prove a difference, never a sameness)
 * ------------------------------------------------------------------ */

const QUANTITY_EXPRESSION = /^([0-9]+(?:\.[0-9]+)?)\s*(°c|%|minutes?|mins?|hours?|hrs?|seconds?|secs?|kg|g|mm|min|h|s)$/;

export interface QuantityReading {
  readonly magnitude: number;
  readonly unit: string;
}

const UNIT_ALIASES: Readonly<Record<string, string>> = {
  minute: 'min',
  minutes: 'min',
  mins: 'min',
  min: 'min',
  hour: 'h',
  hours: 'h',
  hr: 'h',
  hrs: 'h',
  h: 'h',
  second: 's',
  seconds: 's',
  sec: 's',
  secs: 's',
  s: 's',
  kg: 'kg',
  g: 'g',
  mm: 'mm',
  '%': '%',
  '°c': '°c',
};

/**
 * Reads a value that is EXACTLY one magnitude with one unit (`50°c`, `30 min`), or `null`.
 *
 * 🔴 Requires the WHOLE normalized string to be the quantity. A value that merely CONTAINS a
 *    number (`把温度从 50 调到 70`) is not a quantity expression here, so the rule below cannot
 *    misread it - such a value goes to the dimension judge.
 */
export function readQuantityExpression(text: string): QuantityReading | null {
  const match = QUANTITY_EXPRESSION.exec(normalizeForComparison(text));
  if (match === null) {
    return null;
  }
  const magnitudeText = match[1];
  const unitText = match[2];
  if (magnitudeText === undefined || unitText === undefined) {
    return null;
  }
  const magnitude = Number(magnitudeText);
  if (!Number.isFinite(magnitude)) {
    return null;
  }
  return { magnitude, unit: UNIT_ALIASES[unitText] ?? unitText };
}

/**
 * `true` only when both sides are ONE quantity in the SAME unit with a DIFFERENT magnitude.
 *
 * 🔴 This rule can only ever prove a DIFFERENCE (`compared_not_matched`), never a sameness, so it
 *    cannot widen `matched`. `50°C` vs `70°C` is the frozen `D-050` negative case (AC-109).
 */
export function sameUnitDifferentMagnitude(left: string, right: string): boolean {
  const a = readQuantityExpression(left);
  const b = readQuantityExpression(right);
  if (a === null || b === null) {
    return false;
  }
  return a.unit === b.unit && a.magnitude !== b.magnitude;
}
