/**
 * S01-03 ｜ `R-A` stage 1–2: the DETERMINISTIC dimension rule (`D-061`).
 *
 * Contract basis: `D-050` (strict semantic overlap) + `D-052` (`actual_attempt` negative case).
 *
 * 🔴 `R-A` = Structured Field Rules + a discrete dimension judgement ONLY when the rules cannot
 *    decide. This module therefore has exactly three exits and no fourth option:
 *      `matched`               - the two sides are the same substance in different notation;
 *      `compared_not_matched`  - a DIFFERENCE is provable without interpreting the meaning;
 *      `undecided`             - everything else, handed to the dimension judge.
 *    `undecided` is the DEFAULT. There is deliberately no "close enough ⇒ `matched`" branch: that
 *    is precisely what `D-050` forbids and what `SP-03R` regression R3/R4 exist to protect.
 * 🔴 Every rule below can only CONFIRM an equality or PROVE a difference. No rule may widen
 *    `matched` by topic, category, parameter family or keyword overlap - neither may it produce a
 *    numeric or levelled judgement quantity (AC-23 / AC-115 / `D-052`).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import { normalizeForComparison, notationallyEqual, sameUnitDifferentMagnitude } from './normalization.js';

export type DeterministicVerdict = 'matched' | 'compared_not_matched' | 'undecided';

/** The rule that produced a verdict; carried into the audit trail of one dimension. */
export type DeterministicRuleId =
  | 'notation_equivalence'
  | 'same_unit_different_magnitude'
  | 'opposite_polarity_same_statement';

/* ------------------------------------------------------------------ *
 * Polarity (an explicit negation marker, nothing else)
 * ------------------------------------------------------------------ */

/**
 * Explicit negation markers. 🔴 This is NOT a sentiment / direction vocabulary: words such as
 * 「降低」「减少」「缩短」 describe a DIRECTION and are deliberately absent, because treating them as
 * negation would make two different goals look like opposite statements (`D-050` / AC-111).
 */
const CJK_NEGATION_MARKERS: readonly string[] = ['没有', '无', '未', '不', '非'];

const ASCII_NEGATION_MARKERS = /\b(never|without|none|not|no)\b/g;

/**
 * Neutral copulas / existential verbs. Removing them is only ever used together with a polarity
 * difference (see `oppositePolaritySameStatement`), so they cannot create a difference on their
 * own.
 */
const COPULA_MARKERS: readonly string[] = [
  '观察到',
  '发现',
  '出现',
  '呈现',
  '存在',
  '发生',
  '产生',
  '有',
  '是',
];

export type Polarity = 'affirmative' | 'negative';

export function polarityOf(text: string): Polarity {
  const normalized = normalizeForComparison(text);
  const hasCjk = CJK_NEGATION_MARKERS.some((marker) => normalized.includes(marker));
  if (hasCjk) {
    return 'negative';
  }
  return ASCII_NEGATION_MARKERS.test(normalized) ? 'negative' : 'affirmative';
}

function stripMarkers(text: string, markers: readonly string[]): string {
  let result = text;
  for (const marker of markers) {
    result = result.split(marker).join('');
  }
  return result;
}

function stripNegation(text: string): string {
  return stripMarkers(text, CJK_NEGATION_MARKERS).replace(ASCII_NEGATION_MARKERS, '');
}

function stripCopulas(text: string): string {
  return stripMarkers(text, COPULA_MARKERS);
}

/** `出现明显开裂` and `无明显开裂` both reduce to `明显开裂` - the STATEMENT is the same. */
function statementCore(text: string): string {
  return stripCopulas(stripNegation(normalizeForComparison(text)))
    .replace(/\s+/g, '')
    .trim();
}

/**
 * The SAME statement asserted with OPPOSITE polarity (`出现明显开裂` vs `无明显开裂`, `no crack` vs
 * `crack`).
 *
 * 🔴 Gated by BOTH a polarity difference AND an exactly identical statement core, so it can only
 *    ever PROVE a difference. A common subject such as 「开裂」 alone can never reach this branch:
 *    「出现明显开裂」 vs 「出现轻微开裂」 keeps `明显` / `轻微` and stays `undecided` for the judge.
 */
export function oppositePolaritySameStatement(left: string, right: string): boolean {
  if (polarityOf(left) === polarityOf(right)) {
    return false;
  }
  const coreLeft = statementCore(left);
  const coreRight = statementCore(right);
  return coreLeft.length > 0 && coreLeft === coreRight;
}

/* ------------------------------------------------------------------ *
 * The rule pass
 * ------------------------------------------------------------------ */

export interface DeterministicRuleOutcome {
  readonly verdict: DeterministicVerdict;
  /** `null` for `undecided`. */
  readonly rule: DeterministicRuleId | null;
  /** Discrete explanation attached to the dimension; `null` for `undecided`. */
  readonly reason: string | null;
}

const REASONS: Readonly<Record<DeterministicRuleId, string>> = {
  notation_equivalence: '两侧为同一实质内容的不同书写形式（含单位等价表达）。',
  same_unit_different_magnitude: '两侧为同一单位下的不同取值，取值不同即不同实质内容。',
  opposite_polarity_same_statement: '两侧为同一陈述的相反结论方向，结论方向相反即不同实质内容。',
};

const UNDECIDED: DeterministicRuleOutcome = { verdict: 'undecided', rule: null, reason: null };

function decided(rule: DeterministicRuleId, verdict: DeterministicVerdict): DeterministicRuleOutcome {
  return { verdict, rule, reason: REASONS[rule] };
}

/**
 * Runs the deterministic pass on one Level A dimension.
 *
 * Order matters and is fixed: notation equality first (the only deterministic route to `matched`),
 * then the two "a difference is provable" rules, then `undecided`.
 */
export function deterministicDimensionVerdict(
  left: string,
  right: string,
): DeterministicRuleOutcome {
  if (notationallyEqual(left, right)) {
    return decided('notation_equivalence', 'matched');
  }
  if (sameUnitDifferentMagnitude(left, right)) {
    return decided('same_unit_different_magnitude', 'compared_not_matched');
  }
  if (oppositePolaritySameStatement(left, right)) {
    return decided('opposite_polarity_same_statement', 'compared_not_matched');
  }
  return UNDECIDED;
}
