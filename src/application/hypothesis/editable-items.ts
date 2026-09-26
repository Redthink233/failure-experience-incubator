/**
 * S01 ｜ `M9` the ⑥⑦⑧ two-column storage: user `Fact` items beside AI `Inference` items.
 *
 * Contract: §4.2 rules 1–2 (a `source_type` is invariant; an `accepted` judgement stays `Inference`),
 * §8.6 rules 2–3 (⑥⑦⑧ gain user `Fact` entries / AI `Inference` entries in TWO columns), §8.6 rule 4
 * (editing them never moves the decision slot), §8.6 rule 6 / `D-049` (`ADJ-01`).
 *
 * 🔴 USERS NEVER EDIT, REPLACE OR DELETE AN AI PROPOSAL'S PROVENANCE. A user-supplied ⑥⑦⑧ item is
 *    ADDED as its own `Fact` entry; the AI's original `Inference` entry is kept beside it, so the
 *    read model can present the user's item first WITHOUT pretending the AI never said anything
 *    (§37). There is no version system and no deletion.
 * 🔴 ACCEPTING AN AI CRITERION CHANGES NOTHING BUT ITS `decision_state` (§38): `source_type` stays
 *    `Inference` forever, and an un-accepted decision-type `Inference` may never be reused as an
 *    already-confirmed basis.
 * 🔴 ①②③④⑤ ARE NOT TOUCHED HERE AT ALL. This module has no notion of them, which is the structural
 *    form of their read-only boundary (§8.6 rule 1 / `D-049`).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { HypothesisEditableItems, HypothesisEditableSlot } from '../../domain/types/hypothesis.js';
import {
  HYPOTHESIS_EDITABLE_SLOTS,
  checkEditableItemSeparation,
} from '../../domain/types/hypothesis.js';
import type { ContentItemDecisionState, InferenceContentItem } from '../../domain/types/source-type.js';
import { decisionInferenceItem, factItem } from '../../domain/types/source-type.js';
import type { HypothesisAiEntry, HypothesisUserEntry } from '../../domain/types/hypothesis.js';
import type { HypothesisUserEditableItemInput } from './types.js';

/** The canonical slot list, consumed from the frozen domain module. */
export const EDITABLE_SLOTS: readonly HypothesisEditableSlot[] = HYPOTHESIS_EDITABLE_SLOTS;

export function isEditableSlot(value: string): value is HypothesisEditableSlot {
  return (EDITABLE_SLOTS as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ *
 * 1. Building the two columns
 * ------------------------------------------------------------------ */

/** One AI-proposed criterion → an `Inference｜decision` item, initially `unresolved` (§38 / C1-C3). */
export function aiCriterionEntry(
  slot: HypothesisEditableSlot,
  content_item_id: string,
  value: string,
): HypothesisAiEntry {
  return { slot, item: decisionInferenceItem(content_item_id, value, 'unresolved') };
}

/** One user-provided criterion → a `Fact` item. 🔴 It never becomes a decision-type `Inference`. */
export function userCriterionEntry(
  slot: HypothesisEditableSlot,
  content_item_id: string,
  value: string,
): HypothesisUserEntry {
  return { slot, item: factItem(content_item_id, value) };
}

export const EMPTY_EDITABLE_ITEMS: HypothesisEditableItems = { user_facts: [], ai_inferences: [] };

/**
 * Builds the ⑥⑦⑧ columns of one freshly generated hypothesis.
 *
 * 🔴 Only the items the model actually produced become entries: an item that is explicitly missing
 *    contributes NO entry, which is how 「显式缺失」 is stored without a blank string (§13 / H4).
 * 🔴 `content_item_id` is derived from the hypothesis id and the slot, so re-reading a record maps
 *    every entry back to its slot without a positional lookup.
 */
export function buildEditableItems(input: {
  readonly hypothesis_id: string;
  readonly observation_metric: string | null;
  readonly support_criterion: string | null;
  readonly refutation_criterion: string | null;
}): HypothesisEditableItems {
  const ai_inferences: HypothesisAiEntry[] = [];
  const slots: readonly (readonly [HypothesisEditableSlot, string | null])[] = [
    ['observation_metric', input.observation_metric],
    ['support_criterion', input.support_criterion],
    ['refutation_criterion', input.refutation_criterion],
  ];
  for (const [slot, value] of slots) {
    if (value === null || value.trim().length === 0) {
      continue;
    }
    ai_inferences.push(aiCriterionEntry(slot, `${input.hypothesis_id}:${slot}:ai`, value));
  }
  return { user_facts: [], ai_inferences };
}

/* ------------------------------------------------------------------ *
 * 2. User overlay (§37)
 * ------------------------------------------------------------------ */

/**
 * Adds or replaces USER `Fact` items.
 *
 * 🔴 The AI column is passed through UNCHANGED: this function cannot remove an AI proposal, so the
 *    read model can never present a user item as if the machine had never suggested anything.
 * 🔴 An incoming item always becomes a `Fact`, whatever it replaced: a source_type is invariant and a
 *    user's own words are never relabelled.
 */
export function mergeUserEditableItems(
  current: HypothesisEditableItems,
  incoming: readonly HypothesisUserEditableItemInput[],
): HypothesisEditableItems {
  const merged = [...current.user_facts];
  const index_by_id = new Map<string, number>();
  merged.forEach((entry, index) => index_by_id.set(entry.item.content_item_id, index));
  for (const item of incoming) {
    if (!isEditableSlot(item.slot)) {
      continue;
    }
    const entry = userCriterionEntry(item.slot, item.content_item_id, item.value);
    const at = index_by_id.get(item.content_item_id);
    if (at === undefined) {
      index_by_id.set(item.content_item_id, merged.length);
      merged.push(entry);
      continue;
    }
    merged[at] = entry;
  }
  return { user_facts: merged, ai_inferences: [...current.ai_inferences] };
}

/* ------------------------------------------------------------------ *
 * 3. Deciding one AI criterion (§38)
 * ------------------------------------------------------------------ */

export type AiCriterionDecisionOutcome =
  | { readonly ok: true; readonly items: HypothesisEditableItems }
  | { readonly ok: false; readonly detail: string };

/**
 * Changes the `decision_state` of ONE AI-proposed criterion.
 *
 * 🔴 `source_type` and `confirmation_class` are rewritten VERBATIM from the stored item, so accepting
 *    an AI criterion can never turn it into a `Fact` (§4.2 rule 1 / C6).
 * 🔴 Only a `decision`-type `Inference` is addressable: a display-type item carries no decision slot.
 */
export function decideAiCriterion(
  current: HypothesisEditableItems,
  content_item_id: string,
  decision_state: ContentItemDecisionState,
): AiCriterionDecisionOutcome {
  const index = current.ai_inferences.findIndex(
    (entry) => entry.item.content_item_id === content_item_id,
  );
  if (index < 0) {
    return {
      ok: false,
      detail: `No AI-proposed criterion "${content_item_id}" exists in the ⑥⑦⑧ columns of this hypothesis.`,
    };
  }
  const existing = current.ai_inferences[index];
  if (existing === undefined) {
    return { ok: false, detail: `The criterion "${content_item_id}" could not be read back.` };
  }
  if (existing.item.confirmation_class !== 'decision') {
    return {
      ok: false,
      detail:
        'Only a decision-type Inference carries a decision state; a display-type item has none (§1.5).',
    };
  }
  const updated: InferenceContentItem = {
    content_item_id: existing.item.content_item_id,
    source_type: 'Inference',
    confirmation_class: 'decision',
    decision_state,
    value: existing.item.value,
  };
  const ai_inferences = current.ai_inferences.map((entry, at) =>
    at === index ? { slot: entry.slot, item: updated } : entry,
  );
  return { ok: true, items: { user_facts: [...current.user_facts], ai_inferences } };
}

/* ------------------------------------------------------------------ *
 * 4. Reading the two columns (§37)
 * ------------------------------------------------------------------ */

/**
 * The entries a reader should show for one slot, user items FIRST.
 *
 * 🔴 Ordering is a PRESENTATION choice, never a replacement: the AI proposal is still returned.
 */
export function preferredEntriesForSlot(
  items: HypothesisEditableItems,
  slot: HypothesisEditableSlot,
): readonly { readonly side: 'user' | 'ai'; readonly value: string; readonly content_item_id: string }[] {
  const user = items.user_facts
    .filter((entry) => entry.slot === slot)
    .map((entry) => ({
      side: 'user' as const,
      value: entry.item.value,
      content_item_id: entry.item.content_item_id,
    }));
  const ai = items.ai_inferences
    .filter((entry) => entry.slot === slot)
    .map((entry) => ({
      side: 'ai' as const,
      value: entry.item.value,
      content_item_id: entry.item.content_item_id,
    }));
  return [...user, ...ai];
}

/**
 * `true` when the two columns really are separated: the user side is all `Fact`, the AI side all
 * `Inference`. Consumes the frozen checker so the rule has one definition (§8.6 rule 3).
 */
export function editableItemsAreSeparated(items: HypothesisEditableItems): boolean {
  return checkEditableItemSeparation(items);
}

/** Every AI criterion the user has ACCEPTED - the only decision inferences reusable as a basis. */
export function acceptedAiCriteria(items: HypothesisEditableItems): readonly InferenceContentItem[] {
  return items.ai_inferences
    .filter(
      (entry) =>
        entry.item.confirmation_class === 'decision' && entry.item.decision_state === 'accepted',
    )
    .map((entry) => entry.item);
}
