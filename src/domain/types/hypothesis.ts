/**
 * `Hypothesis` - the independent step ⑨ output object (two kinds), its decision slot,
 * and its frozen edit boundary.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
 *   - §1.1     `Hypothesis` is an independent output object of step ⑨;
 *              it NEVER becomes an `Experience Asset`, never enters the experience area,
 *              never counts toward `N`, never carries grounding (§8);
 *   - §2.3     two kinds share ONE id space; decision slot = `undecided` / `accepted` /
 *              `rejected`; the word `candidate` MUST NOT be used for a Hypothesis;
 *              `Model Suggestion` separates the SAVE slot from the DECISION slot (D-042);
 *   - §2.4     generation batches (D-051) - NOT a version system;
 *   - §8.2     grounding bases G1-G4 / non-grounding conditions N1-N6;
 *              only two source partitions; "mixed" is NOT a third label;
 *   - §8.6     edit boundary: ①②③④⑤ read-only; ⑥⑦⑧ user `Fact` items and AI
 *              `Inference` items stored in separate columns (D-049 / ADJ-01);
 *   - §12 item 3 / item 19 / item 20: Worker-forbidden-to-change.
 *
 * 🔴 The `Hypothesis` decision slot MUST NOT be merged with the `Insight` state machine.
 * 🔴 No `candidate` value, no version number, no revision history, no edit counter.
 */

import type { ObjectId } from '../ids/object-id.js';
import type { EvidenceRef, SourceFieldPath } from './evidence-ref.js';
import type { FactContentItem, InferenceContentItem } from './source-type.js';

/** Two kinds of step ⑨ output, sharing one ID space (§2.3). */
export type HypothesisKind = 'grounded' | 'model';

export const HYPOTHESIS_KINDS: readonly HypothesisKind[] = ['grounded', 'model'];

/**
 * The Hypothesis decision slot.
 * 🔴 Values are `undecided` / `accepted` / `rejected` - NEVER `candidate`,
 *    and NEVER the `InsightState` union.
 */
export type DecisionState = 'undecided' | 'accepted' | 'rejected';

export const DECISION_STATES: readonly DecisionState[] = ['undecided', 'accepted', 'rejected'];

export const DECISION_UNDECIDED: 'undecided' = 'undecided';

/** Step ⑨ content items ①②③④⑤ - all read-only (D-049 / §8.6). */
export const HYPOTHESIS_READ_ONLY_ITEMS = [
  'hypothesis_statement',
  'rationale',
  'referenced_attempts',
  'next_change',
  'kept_conditions',
] as const;

/** Step ⑨ content items ⑥⑦⑧ - user `Fact` items and AI `Inference` items, separated. */
export type HypothesisEditableSlot =
  | 'observation_metric'
  | 'support_criterion'
  | 'refutation_criterion';

export const HYPOTHESIS_EDITABLE_SLOTS: readonly HypothesisEditableSlot[] = [
  'observation_metric',
  'support_criterion',
  'refutation_criterion',
];

/** Grounding bases (§8.2 G1-G4). */
export type GroundingBasis = 'G1' | 'G2' | 'G3' | 'G4';

export const GROUNDING_BASES: readonly GroundingBasis[] = ['G1', 'G2', 'G3', 'G4'];

/** Conditions that defeat grounding (§8.2 N1-N6). Any hit => `Model Suggestion` only. */
export type NonGroundingCondition = 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'N6';

export const NON_GROUNDING_CONDITIONS: readonly NonGroundingCondition[] = [
  'N1',
  'N2',
  'N3',
  'N4',
  'N5',
  'N6',
];

/**
 * The two source partitions (§8.2 rule 2). `mixed` is deliberately absent:
 * "混合" may at most describe that both partitions are present - it is never a label.
 */
export type SourcePartition = 'historical_evidence' | 'model_prior';

export const SOURCE_PARTITIONS: readonly SourcePartition[] = [
  'historical_evidence',
  'model_prior',
];

/** §8.2 rule 3: the model-prior partition must be annotated as a whole. */
export const MODEL_PRIOR_ANNOTATION = '非你的历史经验依据';

/** §8.4 / AC-69: the overall Model Suggestion annotation is permanent and whole. */
export const MODEL_SUGGESTION_ANNOTATION = '模型通用建议 / 非你的历史经验依据';

/**
 * §8.2 rule 1 / AC-36: grounding is binary - there is NO "partially anchored" middle grade.
 *
 * `History-grounded` requires ALL THREE of:
 *   ① at least one of `G1`-`G4` is satisfied (the problem object / condition / target
 *      metric / exclusion really comes from history);
 *   ② at least one TRACEABLE historical reference exists - §8.2 states grounding as
 *      "满足 G1–G4 之一**且引用可追溯**", and a statement that only says "参考了历史"
 *      without a referable field IS condition `N1`;
 *   ③ NO condition of `N1`-`N6` is hit.
 *
 * 🔴 `hasTraceableHistoricalReference` is a structural fact supplied by the caller
 *    (a reference that lands on a traceable content item of a `Formal Attempt`),
 *    not a confidence value and not a numeric similarity.
 */
export function isGroundingBinaryOutcome(
  basesHit: readonly GroundingBasis[],
  conditionsHit: readonly NonGroundingCondition[],
  hasTraceableHistoricalReference: boolean,
): boolean {
  if (conditionsHit.length > 0) {
    return false;
  }
  if (!hasTraceableHistoricalReference) {
    return false;
  }
  return basesHit.length > 0;
}

/** §8.5: a Hypothesis can NEVER convert directly into an Experience Asset. */
export function canBecomeExperienceAssetDirectly(): false {
  return false;
}

/** A `Model Suggestion` (§8.4 / D-042). */
export function isModelSuggestion(kind: HypothesisKind): boolean {
  return kind === 'model';
}

/**
 * §8.4: SAVE never implies ACCEPT. A saved-but-undecided suggestion may only be
 * expressed as "内容被保留，决策状态仍未完成" and MUST NOT be reused as an accepted
 * direction (AC-68).
 */
export function isSavedButUndecided(
  saved: boolean | null,
  decision_state: DecisionState,
): boolean {
  return saved === true && decision_state === 'undecided';
}

/** §8.6 rule 4 / AC-104: editing ⑥⑦⑧ never moves the decision slot. */
export function decisionStateAfterEditableItemChange(
  decision_state: DecisionState,
): DecisionState {
  return decision_state;
}

/** §8.6 rule 9 / D-051: a newly generated Hypothesis never inherits the old decision slot. */
export function decisionStateOfNewGeneration(): DecisionState {
  return DECISION_UNDECIDED;
}

/** Reference to an existing user `Fact` that already lives in a `Formal Attempt`. */
export interface KeptConditionFactRef {
  readonly attempt_id: ObjectId<'ATT'>;
  readonly source_field_path: SourceFieldPath;
}

/** ①②③④⑤ - system-managed, read-only core content. */
export interface HypothesisCoreContent {
  /** ① hypothesis statement (read-only) */
  readonly hypothesis_statement: string;
  /** ② rationale (read-only) */
  readonly rationale: string;
  /** ③ referenced historical attempts; managed by the system / `EvidenceRef` */
  readonly referenced_attempt_ids: readonly ObjectId<'ATT'>[];
  /** ④ what the next round should change (read-only) */
  readonly next_change: string;
  /**
   * ⑤ which conditions to keep - ONLY references / displays existing user `Fact`
   * entries of a `Formal Attempt` (§2.3 / §8.6 rule 7 / §9.3 / ADJ-01).
   * 🔴 No new user `Fact` can be created inside a Hypothesis.
   */
  readonly kept_conditions: readonly KeptConditionFactRef[];
}

/** A user-provided ⑥⑦⑧ entry. Always a `Fact` item. */
export interface HypothesisUserEntry {
  readonly slot: HypothesisEditableSlot;
  readonly item: FactContentItem;
}

/** An AI-proposed ⑥⑦⑧ entry. Always an `Inference` item. */
export interface HypothesisAiEntry {
  readonly slot: HypothesisEditableSlot;
  readonly item: InferenceContentItem;
}

/** ⑥⑦⑧ storage: user `Fact` entries and AI `Inference` entries in separate columns. */
export interface HypothesisEditableItems {
  readonly user_facts: readonly HypothesisUserEntry[];
  readonly ai_inferences: readonly HypothesisAiEntry[];
}

export interface Hypothesis {
  readonly hypothesis_id: ObjectId<'HYP'>;
  readonly attempt_id: ObjectId<'ATT'>;
  readonly kind: HypothesisKind;
  /** The decision slot - independent from the save slot. */
  readonly decision_state: DecisionState;
  /**
   * `Model Suggestion` save slot (D-042).
   * `null` = not applicable (a History-grounded Hypothesis has no save slot).
   */
  readonly saved: boolean | null;
  readonly core: HypothesisCoreContent;
  readonly editable_items: HypothesisEditableItems;
  readonly evidence_refs: readonly EvidenceRef[];
  /** Which partitions are present. Never a "mixed" third label. */
  readonly source_partitions: readonly SourcePartition[];
  /** Generation batch (D-051) - a batch relation, NEVER a version number. */
  readonly generation_batch: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * §4.2 rule 1 / §8.6 rules 2-3: user entries stay `Fact`, AI entries stay `Inference`,
 * and the two columns are never merged into a single mixed-source text.
 */
export function checkEditableItemSeparation(items: HypothesisEditableItems): boolean {
  const userSideIsFact = items.user_facts.every(
    (entry) => entry.item.source_type === 'Fact',
  );
  const aiSideIsInference = items.ai_inferences.every(
    (entry) => entry.item.source_type === 'Inference',
  );
  return userSideIsFact && aiSideIsInference;
}

/**
 * §8.4 / D-042 / AC-70: a `Model Suggestion` - saved OR accepted - NEVER grounds,
 * never counts toward `N_检索` / `N_引用`, is never traced by step ⑩ as historical
 * evidence, and never upgrades to `History-grounded`.
 *
 * 🔴 This is a HYPOTHESIS-side behaviour constraint owned by the step ⑨ / ⑩ logic -
 *    it is NOT a statement about what an `EvidenceRef` may point at. `EvidenceRef.target_id`
 *    is ALWAYS the ID of the referenced `Formal Attempt` (`ObjectId<'ATT'>`, §5.1), so a
 *    `HypothesisKind` can never appear in an evidence target position in the first place,
 *    and neither can a `grounded` Hypothesis (§5.2 rule 4 is enforced structurally by
 *    the target type, not by a runtime predicate).
 */
export function canModelSuggestionGround(): false {
  return false;
}
