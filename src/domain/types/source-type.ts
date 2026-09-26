/**
 * `source_type` (来源属性) and the content-item model.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md §1.5 / §4 / §12 item 1
 * FROZEN (v0.3 FROZEN / IMPLEMENTATION BASIS). Worker MUST NOT rename or merge these
 * enumerated values or change their semantics.
 *
 * 🔴 Hard rules reproduced here as types:
 *   - §4.2 rule 1: `source_type` is invariant; no user action changes it.
 *   - §4.2 rule 2: an `accepted Insight` stays labelled `Inference` forever.
 *   - §4.3: an un-accepted decision-type `Inference` MUST NOT be reused as an
 *     "already confirmed" basis.
 *   - Fact / Extraction / Inference MUST NOT be flattened into one string or a
 *     boolean "AI or user" flag.
 */

/** The three source layers. Never collapse these into one value. */
export type SourceType = 'Fact' | 'Extraction' | 'Inference';

export const SOURCE_TYPES: readonly SourceType[] = ['Fact', 'Extraction', 'Inference'];

/** §1.5: confirmation class; REQUIRED for `Inference` only. */
export type ConfirmationClass = 'display' | 'decision';

export const CONFIRMATION_CLASSES: readonly ConfirmationClass[] = ['display', 'decision'];

/**
 * §1.5: `decision_state` at content-item level; REQUIRED for `confirmation_class = 'decision'`.
 * 🔴 This is NOT the `Insight` state machine and NOT the `Hypothesis` decision slot.
 */
export type ContentItemDecisionState = 'unresolved' | 'accepted' | 'rejected';

export const CONTENT_ITEM_DECISION_STATES: readonly ContentItemDecisionState[] = [
  'unresolved',
  'accepted',
  'rejected',
];

/** Shared shape of every content item: an id, an invariant source type, a value. */
export interface ContentItemBase<K extends SourceType> {
  readonly content_item_id: string;
  readonly source_type: K;
  readonly value: string;
}

/** User-provided fact. Not derivable, not upgradable, never produced by AI. */
export interface FactContentItem extends ContentItemBase<'Fact'> {}

/** AI extraction / induction from the user's own text. User may correct it in one pass. */
export interface ExtractionContentItem extends ContentItemBase<'Extraction'> {}

/** AI judgement produced for understanding / comparison / navigation. */
export interface DisplayInferenceContentItem extends ContentItemBase<'Inference'> {
  readonly confirmation_class: 'display';
}

/** AI judgement that changes persisted business state or will be reused as a basis. */
export interface DecisionInferenceContentItem extends ContentItemBase<'Inference'> {
  readonly confirmation_class: 'decision';
  readonly decision_state: ContentItemDecisionState;
}

export type InferenceContentItem = DisplayInferenceContentItem | DecisionInferenceContentItem;

/**
 * `ContentItem<K>` - a discriminated union over the requested source type.
 * `ContentItem` with no argument accepts any of the three layers.
 */
export type ContentItem<K extends SourceType = SourceType> = K extends 'Fact'
  ? FactContentItem
  : K extends 'Extraction'
    ? ExtractionContentItem
    : InferenceContentItem;

export function factItem(content_item_id: string, value: string): FactContentItem {
  return { content_item_id, source_type: 'Fact', value };
}

export function extractionItem(
  content_item_id: string,
  value: string,
): ExtractionContentItem {
  return { content_item_id, source_type: 'Extraction', value };
}

export function displayInferenceItem(
  content_item_id: string,
  value: string,
): DisplayInferenceContentItem {
  return { content_item_id, source_type: 'Inference', confirmation_class: 'display', value };
}

export function decisionInferenceItem(
  content_item_id: string,
  value: string,
  decision_state: ContentItemDecisionState = 'unresolved',
): DecisionInferenceContentItem {
  return {
    content_item_id,
    source_type: 'Inference',
    confirmation_class: 'decision',
    decision_state,
    value,
  };
}

export function isFact(item: ContentItem): item is FactContentItem {
  return item.source_type === 'Fact';
}

export function isExtraction(item: ContentItem): item is ExtractionContentItem {
  return item.source_type === 'Extraction';
}

export function isInference(item: ContentItem): item is InferenceContentItem {
  return item.source_type === 'Inference';
}

export function isDecisionInference(
  item: ContentItem,
): item is DecisionInferenceContentItem {
  return isInference(item) && item.confirmation_class === 'decision';
}

export function isDisplayInference(
  item: ContentItem,
): item is DisplayInferenceContentItem {
  return isInference(item) && item.confirmation_class === 'display';
}

/**
 * §4.3 reuse gate: only a decision-type `Inference` that the user explicitly
 * ACCEPTED may be reused as an already-confirmed basis.
 *
 * `display` inferences and `unresolved` decision inferences never qualify.
 * (Contract §4.3 / §4.2 rule 6 / AC-95.)
 */
export function isReusableAsConfirmedDecision(item: ContentItem): boolean {
  return isDecisionInference(item) && item.decision_state === 'accepted';
}

/**
 * §4.2 rule 3: a follow-up answer is stored in two layers -
 * the user's own words (`Fact`) and the AI's induction (`Extraction`).
 * This helper refuses to silently relabel either side.
 */
export function followUpAnswerPair(
  fact_id: string,
  userWords: string,
  extraction_id: string,
  aiInduction: string,
): readonly [FactContentItem, ExtractionContentItem] {
  return [factItem(fact_id, userWords), extractionItem(extraction_id, aiInduction)];
}
