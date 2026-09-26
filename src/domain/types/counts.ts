/**
 * `N_检索` / `N_引用` snapshots and the frozen counting rules.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md §3.3 / §6 / §7.2 / §12 items 4, 11
 *   - `N_检索` = number of related (Level A hit) AND referenceable `Formal Attempt`s.
 *     Its ONLY use is the capability tier `0` / `1` / `>=2`;
 *   - `N_引用` = number of records that actually take part in the current Hypothesis
 *     with role `grounding` / `support` / `contradict`. It drives the displayed
 *     evidence count AND the step ⑩ trace list;
 *   - 🔴 `N_引用` is `distinct target_id` over those references - it is the number of
 *     RECORDS, NOT the number of reference rows (`S03-B` §V-4 / §F.2, `S03-C` §G.3;
 *     `AC-38` / `AC-84`). One record referenced twice still counts once;
 *   - the two MUST NOT be mixed; the whole-library size MUST NOT replace `N_检索`;
 *   - the step ⑩ list and `N_引用` MUST be derived from the SAME `EvidenceRef` set.
 *
 * This module holds the SHARED VOCABULARY plus the frozen counting / tiering /
 * eligibility rules, so every consumer derives identical numbers from identical input.
 * The orchestration that produces the candidate set (M6) and the reference set (M7)
 * stays with those modules.
 *
 * 🔴 No numeric similarity / confidence / percentage may ever appear here (D-020 / D-037).
 */

import type { ObjectId } from '../ids/object-id.js';
import type { ArchiveState } from './archive.js';
import type { EvidenceOwnerId, EvidenceRef } from './evidence-ref.js';
import { countsTowardNCitation } from './evidence-ref.js';
import type { LevelADimension } from './level-a.js';
import type { AttemptState } from './attempt.js';

/**
 * Capability tier derived ONLY from `N_检索` (§6.1).
 * It answers "is this structurally possible", never "how good is the evidence".
 */
export type RetrievalTier = '0' | '1' | '2+';

export const RETRIEVAL_TIERS: readonly RetrievalTier[] = ['0', '1', '2+'];

/** Maps a raw count to the tier `0` / `1` / `>=2`. */
export function retrievalTierOf(n_retrieval: number): RetrievalTier {
  if (n_retrieval <= 0) {
    return '0';
  }
  return n_retrieval === 1 ? '1' : '2+';
}

/**
 * §6.2 / §7.2 eligibility filter: a `Draft` never participates, and an archived
 * record never counts toward a NEW `N_检索` nor acts as a new grounding source.
 *
 * 🔴 §12 item 9: this injection point must exist in EVERY query, otherwise a record
 * participates beyond its permission.
 */
export function isEligibleForNewRetrieval(
  state: AttemptState,
  archive_state: ArchiveState,
): boolean {
  return state === 'Formal' && archive_state === 'active';
}

/** §6.2: `Model Suggestion` has no `N` at all (no `N_检索`, no `N_引用`). */
export const MODEL_SUGGESTION_HAS_NO_N = true;

export interface NRetrievalSnapshot {
  readonly attempt_id: ObjectId<'ATT'>;
  readonly n_retrieval: number;
  readonly retrieval_tier: RetrievalTier;
  /** Related AND referenceable `Formal Attempt`s (never a `Draft`, never archived). */
  readonly eligible_attempt_ids: readonly ObjectId<'ATT'>[];
  /** Per-candidate set of matched Level A dimensions. */
  readonly matched_level_a_dimensions_by_attempt: Readonly<
    Record<string, readonly LevelADimension[]>
  >;
}

export interface NCitationSnapshot {
  readonly owner_id: EvidenceOwnerId;
  /**
   * The frozen `N_引用` (contract §6.1): `distinct target_id` among the counted references.
   * 🔴 NOT `counted_ref_ids.length` - one record may legitimately own two counted rows.
   */
  readonly n_citation: number;
  /** Ref ids counted toward `N_引用` (roles grounding / support / contradict). */
  readonly counted_ref_ids: readonly string[];
  /** Pure `context` references: displayable and labelled 「上下文」, never counted. */
  readonly context_only_ref_ids: readonly string[];
}

/**
 * The derivation point of `N_引用` for the shared vocabulary (§3.3 / §6.1 / §6.2 /
 * §6.3 rules 7–8 / §12 item 11).
 *
 * 🔴 Counting depends ONLY on `role` (§6.3 rule 7): the `Fact` / `Extraction` landing layer,
 * the target's current archive state and first-screen folding never change the derivation,
 * and there is no "partially counted" third state.
 * 🔴 `n_citation` is `distinct target_id` over the counted references (§6.1 「记录条数」;
 * `S03-B` §V-4 / §F.2; `S03-C` §G.3): a record referenced twice - e.g. `grounding` on one
 * content item and `support` on another - still counts ONCE.
 * 🔴 `counted_ref_ids` deliberately stays the list of ALL counted reference ROWS, so it may
 * hold two ids pointing at the same target. `counted_ref_ids.length` is NOT `N_引用`.
 * Its shape is frozen (§5): no `counted_target_ids` field, no second snapshot type.
 */
export function deriveNCitationSnapshot(
  owner_id: EvidenceOwnerId,
  refs: readonly EvidenceRef[],
): NCitationSnapshot {
  const counted: string[] = [];
  const contextOnly: string[] = [];
  const counted_targets = new Set<string>();
  for (const ref of refs) {
    if (countsTowardNCitation(ref.role)) {
      counted.push(ref.evidence_ref_id);
      counted_targets.add(ref.target_id);
      continue;
    }
    contextOnly.push(ref.evidence_ref_id);
  }
  return {
    owner_id,
    n_citation: counted_targets.size,
    counted_ref_ids: counted,
    context_only_ref_ids: contextOnly,
  };
}

export function retrievalSnapshotOf(
  attempt_id: ObjectId<'ATT'>,
  eligible_attempt_ids: readonly ObjectId<'ATT'>[],
  matched_by_attempt: Readonly<Record<string, readonly LevelADimension[]>> = {},
): NRetrievalSnapshot {
  return {
    attempt_id,
    n_retrieval: eligible_attempt_ids.length,
    retrieval_tier: retrievalTierOf(eligible_attempt_ids.length),
    eligible_attempt_ids,
    matched_level_a_dimensions_by_attempt: matched_by_attempt,
  };
}
