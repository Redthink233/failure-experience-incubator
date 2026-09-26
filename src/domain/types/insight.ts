/**
 * `Insight` - the carrier of AI judgement (experience layer) - and its SINGLE state
 * machine, plus the product-layer behaviour trace (`InsightStateEvent`).
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
 *   - §1.1 / §1.2  `Insight` is a product-core fact / experience object;
 *                  `Experience Asset` is NOT an entity - it is the product view of an
 *                  `accepted Insight` and MUST NOT become a third fact object
 *                  (D-015 / AC-13);
 *   - §2.2         `candidate` / `accepted` / `rejected` migration matrix (the ONLY one);
 *   - §4.2 rule 2  an `accepted Insight` stays `Inference` forever;
 *   - §11.3        `InsightStateEvent` = state transition + time + trigger reason class;
 *   - §12 item 2   the migration matrix is Worker-forbidden-to-change.
 *
 * 🔴 The `Insight` state machine NEVER shares values with the `Hypothesis` decision
 *    slot (D-027 / §2.3): `candidate` must never be used for a `Hypothesis`.
 * 🔴 No visible version list / version comparison / version rollback / edit-count
 *    field may exist (D-040 / AC-65 / AC-122).
 */

import type { ObjectId } from '../ids/object-id.js';
import type { EvidenceRef } from './evidence-ref.js';
import type { GateCheckResult } from './gates.js';

/** The Insight three-state machine. NOT the Hypothesis decision slot. */
export type InsightState = 'candidate' | 'accepted' | 'rejected';

export const INSIGHT_STATES: readonly InsightState[] = ['candidate', 'accepted', 'rejected'];

export const INSIGHT_CANDIDATE: 'candidate' = 'candidate';
export const INSIGHT_ACCEPTED: 'accepted' = 'accepted';
export const INSIGHT_REJECTED: 'rejected' = 'rejected';

/**
 * The enumerable "content" field set (§2.2). Changing ANY of them is a content
 * modification; a field whose role is uncertain is treated as a content field.
 */
export const INSIGHT_CONTENT_FIELDS = [
  'proposition',
  'applicable_scope',
  'evidence_list',
  'judgment_basis',
] as const;

export type InsightContentField = (typeof INSIGHT_CONTENT_FIELDS)[number];

/** Non-semantic / meta changes never move the state (§2.2 / AC-64). */
export const INSIGHT_META_FIELDS = ['title', 'display_order'] as const;

export type InsightMetaField = (typeof INSIGHT_META_FIELDS)[number];

/**
 * Product-layer behaviour trace trigger classes (§11.3 / AC-65).
 *
 * 🔴 EXACTLY the four canonical reasons listed by the contract §11.3:
 *    user accept ／ user revoke ／ content modification ／ re-accept.
 *
 * 🔴 Archiving referenced evidence is NOT a member of this union. D-043 states that
 *    archiving neither edits content nor moves the `Insight` state, so it is not a
 *    state-transition reason at all and MUST NOT be recorded as a transition event.
 *    "引用证据归档但状态不变" is expressed by the pure helper
 *    {@link stateAfterReferencedEvidenceArchived} instead of by a trigger value.
 */
export type InsightStateEventTrigger =
  | 'user_accept'
  | 'user_revoke'
  | 'content_edit'
  | 're_accept';

export const INSIGHT_STATE_EVENT_TRIGGERS: readonly InsightStateEventTrigger[] = [
  'user_accept',
  'user_revoke',
  'content_edit',
  're_accept',
];

/**
 * Product-layer state-transition trace (§11.3).
 * Minimum content = state transition + time + trigger reason class.
 * 🔴 It is NOT a technical observability log and MUST NOT be used as a value score,
 * quality ranking, experience grade or edit-count score (D-040 / AC-65).
 */
export interface InsightStateEvent {
  readonly event_id: string;
  readonly insight_id: ObjectId<'INS'>;
  readonly from_state: InsightState;
  readonly to_state: InsightState;
  /** ISO-8601 timestamp of the transition. */
  readonly occurred_at: string;
  readonly trigger: InsightStateEventTrigger;
}

/** User actions that may move the Insight state machine. */
export type InsightUserAction =
  | 'accept'
  | 'reject'
  | 'revoke_acceptance'
  | 'edit_content'
  | 'edit_meta';

export interface InsightTransitionRule {
  readonly from: InsightState;
  readonly action: InsightUserAction;
  /** `'unchanged'` means the state is not affected by this action. */
  readonly to: InsightState | 'unchanged';
  /** True when `E1`-`E4` must be re-checked immediately (same screen). */
  readonly recheck_gates: boolean;
  readonly note: string;
}

/** The single migration matrix of §2.2, transcribed verbatim as data. */
export const INSIGHT_STATE_TRANSITIONS: readonly InsightTransitionRule[] = [
  {
    from: 'candidate',
    action: 'accept',
    to: 'accepted',
    recheck_gates: false,
    note: 'Only when E1-E4 are satisfied; equivalent to E5 (D-039).',
  },
  {
    from: 'candidate',
    action: 'reject',
    to: 'rejected',
    recheck_gates: false,
    note: 'E1-E4 are NOT required for a reject (D-015).',
  },
  {
    from: 'accepted',
    action: 'revoke_acceptance',
    to: 'candidate',
    recheck_gates: false,
    note: 'Revoking returns to candidate - never to rejected (D-039).',
  },
  {
    from: 'accepted',
    action: 'edit_content',
    to: 'candidate',
    recheck_gates: true,
    note: 'Content edit falls back to candidate and re-checks E1-E4 immediately (D-040).',
  },
  {
    from: 'candidate',
    action: 'edit_content',
    to: 'candidate',
    recheck_gates: true,
    note: 'Stays candidate and refreshes the E1-E4 presentation (D-040).',
  },
  {
    from: 'rejected',
    action: 'edit_content',
    to: 'candidate',
    recheck_gates: true,
    note: 'The old rejection is not reused and accepted is not reachable directly (D-040).',
  },
  {
    from: 'candidate',
    action: 'edit_meta',
    to: 'unchanged',
    recheck_gates: false,
    note: 'Non-semantic / meta changes never move the state (D-040).',
  },
  {
    from: 'accepted',
    action: 'edit_meta',
    to: 'unchanged',
    recheck_gates: false,
    note: 'Non-semantic / meta changes never move the state (D-040).',
  },
  {
    from: 'rejected',
    action: 'edit_meta',
    to: 'unchanged',
    recheck_gates: false,
    note: 'Non-semantic / meta changes never move the state (D-040).',
  },
];

export function insightTransitionFor(
  from: InsightState,
  action: InsightUserAction,
): InsightTransitionRule | null {
  return (
    INSIGHT_STATE_TRANSITIONS.find(
      (rule) => rule.from === from && rule.action === action,
    ) ?? null
  );
}

export interface Insight {
  readonly insight_id: ObjectId<'INS'>;
  /** The Attempt that generated this Insight (step ⑧ is the only generation moment). */
  readonly attempt_id: ObjectId<'ATT'>;
  readonly state: InsightState;
  /** ① experience proposition content */
  readonly proposition: string;
  /** ② applicable scope / condition set */
  readonly applicable_scope: string;
  /** ③ reference list - the single source shared with step ⑩ and `N_引用` (§3.3). */
  readonly evidence_refs: readonly EvidenceRef[];
  /** ④ judgement basis / verifiable criterion */
  readonly judgment_basis: string;
  /** `E1`-`E4` check results presented together with the Insight. */
  readonly gate_checks: readonly GateCheckResult[];
  /**
   * Generation batch id (D-051). 🔴 A batch relation, NEVER a version number.
   * The latest explicit generation = 「当前生成结果」; earlier ones = 「较早生成结果」.
   */
  readonly generation_batch: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * An `accepted Insight` IS the product view called `Experience Asset`.
 * 🔴 This is not a separate entity, not a separate collection, not a third object.
 */
export function isExperienceAssetView(insight: Insight): boolean {
  return insight.state === INSIGHT_ACCEPTED;
}

/**
 * §5.2 rule 2 / D-030 / AC-36: an `accepted Insight` (= the product view called
 * `Experience Asset`) can NEVER SERVE AS a grounding SOURCE - not even after acceptance.
 *
 * 🔴 This constrains the SOURCE side of a reference only. It does NOT forbid an
 *    `Insight` from OWNING evidence references: every `Insight` - `candidate` or
 *    `accepted` - still carries its own `evidence_refs` pointing at `Formal Attempt`s
 *    (§5.1 `owner_id` / §3.3). "Cannot be a grounding source" ≠ "cannot hold a reference".
 */
export function canInsightServeAsGroundingSource(): false {
  return false;
}

/**
 * §2.2 / D-043: archiving a referenced evidence record never moves the `Insight` state.
 *
 * 🔴 This is an explicit "NO transition" expression, deliberately shaped as a pure
 *    identity function - so the fact can be stated without inventing an
 *    `InsightStateEventTrigger` value (contract §11.3 defines only four trigger classes).
 *    A caller observing an archive MUST NOT emit an `InsightStateEvent`.
 */
export function stateAfterReferencedEvidenceArchived(state: InsightState): InsightState {
  return state;
}
