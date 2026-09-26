/**
 * S01 ｜ `M9` the 8-item structure of a `Hypothesis` and its presence semantics.
 *
 * Contract: §8.1 (object boundary), §9 step ⑨ I/O (the fixed 8-item structure), §8.6 rules 1–2
 * (①②③④⑤ read-only; ⑥⑦⑧ user `Fact` / AI `Inference`), `D-027` (the 8 items), `D-049` (`ADJ-01`
 * `CLOSED / DERIVED`: ③ owns the reference list, ⑤ cites ①②③ instead of restating them).
 *
 * 🔴 THE KEY SET IS DERIVED, NEVER RE-DECLARED. The canonical names come from the FROZEN domain
 *    module (`HYPOTHESIS_READ_ONLY_ITEMS` + `HYPOTHESIS_EDITABLE_SLOTS`), so this module cannot
 *    introduce a ninth item and cannot drift away from the frozen vocabulary. A second, locally
 *    spelled list would be exactly the "second vocabulary for a frozen concept" §12 item 10
 *    forbids.
 * 🔴 There is NO ninth top-level field. In particular there is NO 「已尝试失败列表」 and NO
 *    `hypothesis_cost`: cost is NOT one of the 8 items (§39) and a missing cost never blocks a
 *    hypothesis.
 * 🔴 PRESENCE IS DERIVED, NEVER STORED: `hypothesisItemPresence()` reads the frozen object, so a
 *    stored copy of "which items are missing" can never drift from the content it describes.
 *
 * 🔴 CANONICAL-NAMING NOTE (recorded, not silently resolved): a planning document
 *    (`20_INTEGRATION/S00-03_技术决策包.md`) spells the same 8 items as `hypothesis_basis` /
 *    `hypothesis_history_refs` / `hypothesis_change` / `hypothesis_keep` / `hypothesis_metric` /
 *    `hypothesis_support_criterion` / `hypothesis_contradict_criterion`. The FROZEN domain type
 *    (`src/domain/types/hypothesis.ts`, Worker-forbidden-to-change) spells them `rationale` /
 *    `referenced_attempts` / `next_change` / `kept_conditions` / `observation_metric` /
 *    `support_criterion` / `refutation_criterion`. The two sets name the SAME 8 items in the SAME
 *    order and carry the SAME semantics, so the frozen spelling is authoritative here and NO
 *    INTEGRATION REQUEST is raised: the frozen type expresses every one of the 8 items, and this
 *    module deliberately does not open a rival spelling.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { Hypothesis, HypothesisEditableSlot } from '../../domain/types/hypothesis.js';
import {
  HYPOTHESIS_EDITABLE_SLOTS,
  HYPOTHESIS_READ_ONLY_ITEMS,
} from '../../domain/types/hypothesis.js';
import type { HypothesisItemPresence } from './types.js';

/* ------------------------------------------------------------------ *
 * 1. The canonical 8 field keys (①②③④⑤⑥⑦⑧)
 * ------------------------------------------------------------------ */

/**
 * ①②③④⑤ - system-managed, read-only in V1 (§8.6 rule 1 / `D-049`).
 * 🔴 Read from the frozen domain list; never re-spelled.
 */
export const HYPOTHESIS_READ_ONLY_FIELD_KEYS: readonly string[] = HYPOTHESIS_READ_ONLY_ITEMS;

/** ⑥⑦⑧ - a user may add / replace / supplement `Fact` items here (§8.6 rule 2). */
export const HYPOTHESIS_EDITABLE_FIELD_KEYS: readonly string[] = HYPOTHESIS_EDITABLE_SLOTS;

/**
 * The canonical 8 field keys, in ①→⑧ order.
 *
 * 🔴 Length 8 is asserted by the `M9` invariant suite: a ninth item would be a structural
 *    regression, not a feature.
 */
export const HYPOTHESIS_FIELD_KEYS: readonly string[] = [
  ...HYPOTHESIS_READ_ONLY_FIELD_KEYS,
  ...HYPOTHESIS_EDITABLE_FIELD_KEYS,
];

/** ①②③④ - REQUIRED for a `History-grounded Hypothesis` (§13 / H2). */
export const HYPOTHESIS_REQUIRED_FIELD_KEYS: readonly string[] = [
  'hypothesis_statement',
  'rationale',
  'referenced_attempts',
  'next_change',
];

/** ⑤⑥⑦⑧ - MAY be explicitly missing; 🔴 never expressed by a blank string (§13 / H3 / H4). */
export const HYPOTHESIS_OPTIONAL_FIELD_KEYS: readonly string[] = [
  'kept_conditions',
  'observation_metric',
  'support_criterion',
  'refutation_criterion',
];

export function isHypothesisFieldKey(value: string): boolean {
  return HYPOTHESIS_FIELD_KEYS.includes(value);
}

/**
 * Names that MUST NOT exist as a ninth field key.
 *
 * 🔴 Enumerable ON PURPOSE: a persisted document carrying one of these is refused instead of being
 *    read as if the 9-item structure were acceptable (§12 / §43 H7).
 */
export const FORBIDDEN_NINTH_FIELD_KEYS: readonly string[] = [
  'hypothesis_cost',
  'cost',
  'hypothesis_failure_list',
  'tried_and_failed',
  'attempted_failures',
  'hypothesis_confidence',
  'hypothesis_score',
  'hypothesis_priority',
  'hypothesis_rank',
  'hypothesis_strength',
];

export function findForbiddenNinthFieldKeys(value: unknown, path = ''): readonly string[] {
  if (value === null || typeof value !== 'object') {
    return [];
  }
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      found.push(...findForbiddenNinthFieldKeys(entry, `${path}[${index}]`));
    });
    return found;
  }
  for (const [key, child] of Object.entries(value as Readonly<Record<string, unknown>>)) {
    const childPath = path.length === 0 ? key : `${path}.${key}`;
    if (FORBIDDEN_NINTH_FIELD_KEYS.includes(key)) {
      found.push(childPath);
    }
    found.push(...findForbiddenNinthFieldKeys(child, childPath));
  }
  return found;
}

/* ------------------------------------------------------------------ *
 * 2. What ③ / ⑤ actually mean (ADJ-01)
 * ------------------------------------------------------------------ */

/**
 * ③ is the reference list - the ONE source shared with step ⑩ and `N_引用` (§3.3 / `ADJ-01`).
 *
 * 🔴 For a `History-grounded Hypothesis` it is never empty: a statement that only says 「参考了历史」
 *    without a referable field IS condition `N1` and can never be grounded (§8.2).
 */
export const REFERENCED_ATTEMPTS_FIELD_KEY: 'referenced_attempts' = 'referenced_attempts';

/** ⑤ cites EXISTING user `Fact` / `Extraction` items of a `Formal Attempt`; it restates nothing. */
export const KEPT_CONDITIONS_FIELD_KEY: 'kept_conditions' = 'kept_conditions';

/* ------------------------------------------------------------------ *
 * 3. Derived presence
 * ------------------------------------------------------------------ */

/** `true` when a text item carries real content (a blank string is NOT a value - §13 / H4). */
function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** `true` when the ⑥⑦⑧ columns carry an entry for one slot, on either side. */
function slotHasEntry(hypothesis: Hypothesis, slot: HypothesisEditableSlot): boolean {
  const items = hypothesis.editable_items;
  return (
    items.user_facts.some((entry) => entry.slot === slot && hasText(entry.item.value)) ||
    items.ai_inferences.some((entry) => entry.slot === slot && hasText(entry.item.value))
  );
}

/**
 * The DERIVED presence of every one of the 8 items.
 *
 * 🔴 ①②④ are `present` whenever the stored text is non-blank; a persisted document with a blank
 *    required item is refused at the persistence boundary, so `missing` here is only ever reachable
 *    for ⑤⑥⑦⑧ (§13).
 * 🔴 ③ is `present` when at least one attempt is referenced - which a grounded hypothesis always has.
 * 🔴 ⑤ is `present` when at least one kept-condition reference exists; an EMPTY list is the explicit
 *    「当前未提供」 form for ⑤, never a blank string.
 */
export function hypothesisItemPresence(
  hypothesis: Hypothesis,
): Readonly<Record<string, HypothesisItemPresence>> {
  const core = hypothesis.core;
  const present: Record<string, boolean> = {
    hypothesis_statement: hasText(core.hypothesis_statement),
    rationale: hasText(core.rationale),
    referenced_attempts: core.referenced_attempt_ids.length > 0,
    next_change: hasText(core.next_change),
    kept_conditions: core.kept_conditions.length > 0,
    observation_metric: slotHasEntry(hypothesis, 'observation_metric'),
    support_criterion: slotHasEntry(hypothesis, 'support_criterion'),
    refutation_criterion: slotHasEntry(hypothesis, 'refutation_criterion'),
  };
  const out: Record<string, HypothesisItemPresence> = {};
  for (const key of HYPOTHESIS_FIELD_KEYS) {
    out[key] = present[key] === true ? 'present' : 'missing';
  }
  return out;
}

/** Every REQUIRED item that is explicitly missing - an empty list means the record is complete. */
export function missingRequiredFieldKeys(hypothesis: Hypothesis): readonly string[] {
  const presence = hypothesisItemPresence(hypothesis);
  return HYPOTHESIS_REQUIRED_FIELD_KEYS.filter((key) => presence[key] === 'missing');
}

/** `true` when a required field key is blank rather than the required non-blank content (§13 / H4). */
export function hasBlankRequiredTextField(hypothesis: Hypothesis): boolean {
  return missingRequiredFieldKeys(hypothesis).length > 0;
}
