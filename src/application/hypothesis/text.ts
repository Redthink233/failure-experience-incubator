/**
 * S01 ｜ `M9` structural text guards: the enumerable checks that do NOT rely on a prompt.
 *
 * Contract / decision basis:
 *   - §8.1  object naming: ⑨ produces `History-grounded Hypothesis` / `Model Suggestion` - it never
 *           produces a 「候选经验」, an 「经验资产」 or a verified conclusion;
 *   - §8.2  `N3` / `N4` are semantic, but the deterministic half must still be structural
 *           (`TQ34`: 「不得依赖 prompt 措辞」 is the same discipline `M8` follows);
 *   - §18   ⑦⑧ must be observable and mutually exclusive: 「效果更好」「性能提升」「看起来改善」
 *           「结果不错」are NOT acceptable criteria;
 *   - §8.6 rule 7 / K5: a historically UNKNOWN condition may never be 「保持不变」;
 *   - `D-007` / `D-021 E4`: one record can never establish a general rule;
 *   - `D-038`: no 「已证实 / 已验证为事实 / 证明了 / 方法 X 已被证明无效」wording - a `Hypothesis` is
 *     an `Inference｜decision` for its whole life.
 *
 * 🔴 WHY THESE GUARDS ARE STRUCTURAL, NOT PROMPT-ONLY: a prompt is a request, not an enforcement
 *    point. Every guard here is a deterministic, enumerable allow / refuse over the produced text,
 *    so a reviewer can audit the lists and a refusal is explainable.
 * 🔴 THESE LISTS ARE DELIBERATELY DUPLICATED from the sibling application module rather than
 *    imported: the application modules do not import each other's internals (each is a `D9` step
 *    boundary owned by its own task), and a shared helper module would be a new layer that neither
 *    task authorises. The duplication is confined to two short, self-documenting word lists.
 * 🔴 A guard refusal NEVER silently rewrites the text: the proposal is refused as a whole and the
 *    reason is reported, so nothing is repaired behind the user's back.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, no LLM.
 */

/* ------------------------------------------------------------------ *
 * 1. Normalisation and token extraction
 * ------------------------------------------------------------------ */

/**
 * A comparison-only normalisation: case-folded, whitespace- and punctuation-free.
 *
 * 🔴 It is used ONLY to decide whether two produced strings are the SAME claim (§8.3 padding,
 *    identical criteria). It is never a similarity VALUE, never a distance and never a score.
 */
export function normalizeProposalText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[.,;:!?'"`()\[\]{}<>、。，；：！？“”‘’（）【】《》—\-_/\\|~*#]+/g, '');
}

/** The `ATT_`-shaped tokens a text mentions, de-duplicated in first-seen order. */
export function citedAttemptIdsIn(text: string): readonly string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/ATT_[A-Za-z0-9]+/g)) {
    const token = match[0];
    if (!found.includes(token)) {
      found.push(token);
    }
  }
  return found;
}

/** `true` when the text mentions a `HYP_` / `INS_` id - a `Hypothesis` may not cite one as history. */
export function mentionsNonAttemptObjectId(text: string): boolean {
  return /(HYP_|INS_|EREF_)[A-Za-z0-9]+/.test(text);
}

/* ------------------------------------------------------------------ *
 * 2. ⑦⑧ verifiability vocabulary (§18)
 * ------------------------------------------------------------------ */

/**
 * Phrasings that state a DIRECTION without naming an observable, distinguishable outcome.
 *
 * 🔴 Transcribed from §18: 「效果更好」「性能提升」「看起来改善」「结果不错」are explicitly NOT
 *    acceptable criteria. The list stays enumerable and short so a refusal can be audited.
 */
export const VAGUE_CRITERION_PHRASES: readonly string[] = [
  '效果更好',
  '效果更好一些',
  '性能提升',
  '性能更好',
  '看起来改善',
  '看起来更好',
  '看起来不错',
  '结果不错',
  '结果更好',
  '应该会好',
  '应该更好',
  '感觉更好',
  '明显改善',
  '有所改善',
  '更好一些',
  '效果显著提升',
  'feels better',
  'looks better',
  'better performance',
  'better result',
];

/** Every vague phrasing present in the text, in list order. Empty means 「clean」. */
export function findVagueCriterionPhrasing(text: string): readonly string[] {
  const haystack = text.toLowerCase();
  return VAGUE_CRITERION_PHRASES.filter((token) => haystack.includes(token.toLowerCase()));
}

/* ------------------------------------------------------------------ *
 * 3. ⑤ 「保持不变」 boundary (§8.6 rule 7 / K5)
 * ------------------------------------------------------------------ */

/**
 * Wordings that assert a condition is KEPT UNCHANGED.
 *
 * 🔴 「保持不变」 is only ever legal as a REFERENCE to a condition the history actually recorded
 *    (`kept_conditions`, §8.6 rule 7). When a condition is historically unknown the only legal forms
 *    are 「设为 Y」 or an explicit omission - never 「保持不变」.
 */
export const KEEP_UNCHANGED_PHRASINGS: readonly string[] = [
  '保持不变',
  '维持不变',
  '保持原样',
  '沿用不变',
  '不变',
  'keep unchanged',
  'stay the same',
  'remain unchanged',
];

export function findKeepUnchangedClaim(text: string): readonly string[] {
  const haystack = text.toLowerCase();
  return KEEP_UNCHANGED_PHRASINGS.filter((token) => haystack.includes(token.toLowerCase()));
}

/* ------------------------------------------------------------------ *
 * 4. Object naming red line (§8.1)
 * ------------------------------------------------------------------ */

/**
 * Names that would turn a step ⑨ output into a different product object.
 *
 * 🔴 ⑨ produces a `Hypothesis` or a `Model Suggestion`. It MUST NOT be called a 「候选经验」
 *    (`Candidate Insight`), an 「经验」, an 「经验资产」(`Experience Asset`) or a 「已验证结论」.
 * 🔴 The check is over the PRODUCED TEXT, because that is where a mis-naming reaches the user.
 */
export const FORBIDDEN_OBJECT_NAMINGS: readonly string[] = [
  '候选经验',
  '经验资产',
  'CandidateInsight',
  'Candidate Insight',
  'ExperienceAsset',
  'Experience Asset',
  '已验证结论',
  '已验证的经验',
];

export function findForbiddenObjectNaming(text: string): readonly string[] {
  const haystack = text.toLowerCase();
  return FORBIDDEN_OBJECT_NAMINGS.filter((token) => haystack.includes(token.toLowerCase()));
}

/* ------------------------------------------------------------------ *
 * 5. 措辞红线 (`D-038`)
 * ------------------------------------------------------------------ */

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

export function findForbiddenProofWording(text: string): readonly string[] {
  const haystack = text.toLowerCase();
  return FORBIDDEN_PROOF_WORDINGS.filter((token) => haystack.includes(token.toLowerCase()));
}

/* ------------------------------------------------------------------ *
 * 6. 单条记录不得形成一般性规律 (`D-007` / `D-021 E4`)
 * ------------------------------------------------------------------ */

/** Tokens that turn a statement into a GENERAL RULE rather than an observation of one record. */
export const GENERALIZING_MARKERS: readonly string[] = [
  '普遍',
  '一般来说',
  '通常情况下',
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
  '无效',
  '不成立',
  '行不通',
  '不可行',
  'universally',
  'in general',
  'invariably',
  'all cases',
  'every case',
  'always',
  'never',
];

/**
 * Tokens that bind a statement to the RECORDED conditions - the legitimate form of a single-record
 * (`N = 1`) local hypothesis.
 *
 * 🔴 Used only as an escape hatch: a text carrying a generalizing marker AND a local bound is
 *    treated as locally scoped, so 「在当前条件下……」stays legal.
 */
export const LOCAL_BOUND_QUALIFIERS: readonly string[] = [
  '在当前条件下',
  '在本次条件下',
  '在当前已知条件',
  '在当前范围',
  '在此条件下',
  '在这一条件下',
  '该条件下',
  '本次记录',
  '本次尝试',
  '本次观察',
  '本记录',
  '所记录的条件',
  'in this record',
  'under these conditions',
  'in this case',
  'this attempt',
];

export function findGeneralizingMarker(text: string): string | null {
  const haystack = text.toLowerCase();
  return GENERALIZING_MARKERS.find((token) => haystack.includes(token.toLowerCase())) ?? null;
}

export function hasLocalBoundQualifier(text: string): boolean {
  const haystack = text.toLowerCase();
  return LOCAL_BOUND_QUALIFIERS.some((token) => haystack.includes(token.toLowerCase()));
}

export type SingleRecordGuardResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly marker: string; readonly detail: string };

/**
 * The single-record generalization guard.
 *
 * 🔴 Applies ONLY when the evidence base is a SINGLE record (or none): one observation can never
 *    establish a general rule (`D-021 E4` / `D-007`). A multi-record base is judged by its own
 *    grounding, not by this guard.
 * 🔴 A claim with a generalizing marker must bind itself to the recorded conditions to be admitted.
 */
export function singleRecordGeneralizationGuard(input: {
  /** Distinct `EvidenceRef.target_id` values backing the statement (a set size, never a score). */
  readonly distinct_evidence_targets: number;
  readonly statement: string;
}): SingleRecordGuardResult {
  if (input.distinct_evidence_targets > 1) {
    return { allowed: true };
  }
  const marker = findGeneralizingMarker(input.statement);
  if (marker === null) {
    return { allowed: true };
  }
  if (hasLocalBoundQualifier(input.statement)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    marker,
    detail:
      `The evidence base is a single record (distinct evidence targets = ${String(input.distinct_evidence_targets)}), ` +
      `so a general rule cannot be formed: the statement carries "${marker}" without binding itself to the recorded conditions. ` +
      'A single-record hypothesis may only state a local direction under the recorded conditions (D-007 / D-021 E4).',
  };
}

/* ------------------------------------------------------------------ *
 * 7. Every text a proposal produced (for the shared word guards)
 * ------------------------------------------------------------------ */

/** Concatenates the texts a caller wants the shared word guards applied to. */
export function joinProposalTexts(texts: readonly (string | null | undefined)[]): string {
  return texts.filter((text): text is string => typeof text === 'string').join('\n');
}
