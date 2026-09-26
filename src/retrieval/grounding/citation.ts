/**
 * S01 ｜ `M7` the SINGLE derivation of `N_引用` and the ⑩ traceability view.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
 *   - §3.3   the step ⑩ trace list and `N_引用` MUST be derived from the SAME `EvidenceRef` set;
 *   - §5.2   rule 5: a pure `context` reference is displayable and MUST be labelled 「上下文」,
 *   - §5.2   rule 11 / §7.4: 「来源已归档」 is derived from the target's CURRENT `archive_state`;
 *   - §6.2   counting table; §6.3 rules 6 / 7 / 8;
 *   - §7.3   rule 4: archiving never reduces an existing `N_引用`.
 * `S03-B` §V-4 / §F.2 and `S03-D` §G.3: `N_引用` is derived by DISTINCT `target_id`.
 *
 * 🔴 ONE function pair over ONE set: `deriveCitationView` returns the counted refs, the counted
 *    TARGETS and the count together, so a second, drifting copy of the number cannot exist
 *    (task §18 / §19). `deriveNCitation` is a convenience read of the same derivation.
 * 🔴 The `EvidenceRef` itself carries NO archive information: `source_archived` is computed here
 *    from the target's CURRENT state, which is why archiving cannot retro-reduce any count
 *    (task §20).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, no LLM.
 */

import type { Attempt } from '../../domain/types/attempt.js';
import type { ArchiveState } from '../../domain/types/archive.js';
import type { EvidenceOwnerId, EvidenceRef } from '../../domain/types/evidence-ref.js';
import {
  countsTowardNCitation,
  sourceArchiveAnnotationApplies,
} from '../../domain/types/evidence-ref.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import type { PersistedContentItem } from '../../domain/types/content-item-record.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import { resolveSourceFieldPath } from './addressable.js';
import { GroundingContextError } from './types.js';
import type { CitationView, TraceableEvidenceView } from './types.js';

/* ------------------------------------------------------------------ *
 * 1. `N_引用` (view ②: counted BY distinct target)
 * ------------------------------------------------------------------ */

/**
 * Derives the citation view of ONE owner from its `EvidenceRef` set.
 *
 * 🔴 The only `N_引用` derivation of this layer. Counting depends ONLY on the role
 *    (§6.3 rule 7) and is deduplicated by `target_id` (契约 §6.1 「记录条数」; `AC-38` /
 *    `AC-84`): one record referenced twice still counts once.
 */
export function deriveCitationView(
  owner_id: EvidenceOwnerId,
  refs: readonly EvidenceRef[],
): CitationView {
  const counted_ref_ids: string[] = [];
  const context_only_ref_ids: string[] = [];
  const counted_target_ids: ObjectId<'ATT'>[] = [];
  const seen_targets = new Set<string>();

  for (const ref of refs) {
    /*
     * 🔴 A reference belonging to another owner would silently corrupt both owners' counts, so it
     *    is refused instead of being mixed in.
     */
    if (ref.owner_id !== owner_id) {
      throw new GroundingContextError(
        'REF_OWNER_MISMATCH',
        `Reference "${ref.evidence_ref_id}" belongs to "${ref.owner_id}", not to "${owner_id}".`,
      );
    }
    if (countsTowardNCitation(ref.role)) {
      counted_ref_ids.push(ref.evidence_ref_id);
      if (!seen_targets.has(ref.target_id)) {
        seen_targets.add(ref.target_id);
        counted_target_ids.push(ref.target_id);
      }
      continue;
    }
    context_only_ref_ids.push(ref.evidence_ref_id);
  }

  return {
    owner_id,
    n_citation: counted_target_ids.length,
    counted_target_ids,
    counted_ref_ids,
    context_only_ref_ids,
  };
}

/**
 * `N_引用` as a number.
 *
 * 🔴 Deliberately a READ of {@link deriveCitationView} rather than an independent computation, so
 *    the number and the ⑩ list can never disagree.
 */
export function deriveNCitation(owner_id: EvidenceOwnerId, refs: readonly EvidenceRef[]): number {
  return deriveCitationView(owner_id, refs).n_citation;
}

/* ------------------------------------------------------------------ *
 * 2. ⑩ traceability (view ①: one row per reference)
 * ------------------------------------------------------------------ */

/** Everything the traceability view needs from the CURRENT workspace state. */
export interface TraceabilityContext {
  /** Resolves a reference target BY ID (§3.2). `null` means the record cannot be found. */
  readonly resolveTarget: (target_id: ObjectId<'ATT'>) => Attempt | null;
  /** The target's attached content items (docs/02 §C.4), `[]` when none were provided. */
  readonly resolveAttachedContentItems?: (
    target_id: ObjectId<'ATT'>,
  ) => readonly PersistedContentItem[];
  /** `M6`'s matched Level A dimensions per related candidate - copied, never recomputed. */
  readonly matched_level_a_dimensions_by_target?: Readonly<
    Record<string, readonly LevelADimension[]>
  >;
}

/**
 * Builds the ⑩ traceability list from the SAME `EvidenceRef` set the count came from.
 *
 * 🔴 The owner is read from each reference, so this is a pure per-row projection of one owner's
 *    set: it can never mix in another owner's rows.
 * 🔴 A row whose target or landing point no longer resolves is STILL EMITTED, marked
 *    `resolvable: false`. Dropping it would be the "旧引用静默消失" the contract forbids.
 * 🔴 `source_archived` is read from the target's CURRENT state on every call, so the 「来源已归档」
 *    annotation appears and disappears with the state and never needs a write (§7.4 rules 2 / 4).
 */
export function deriveTraceabilityView(
  refs: readonly EvidenceRef[],
  context: TraceabilityContext,
): readonly TraceableEvidenceView[] {
  const matchedByTarget = context.matched_level_a_dimensions_by_target ?? {};

  return refs.map((ref): TraceableEvidenceView => {
    const base = {
      evidence_ref_id: ref.evidence_ref_id,
      owner_id: ref.owner_id,
      role: ref.role,
      target_id: ref.target_id,
      source_field_path: ref.source_field_path,
      counted_toward_n_citation: countsTowardNCitation(ref.role),
    };
    const target = context.resolveTarget(ref.target_id);
    if (target === null) {
      return { ...base, resolvable: false, reason: 'The referenced Attempt cannot be resolved.' };
    }
    const attached = context.resolveAttachedContentItems?.(ref.target_id) ?? [];
    const landing = resolveSourceFieldPath(target, attached, ref.source_field_path);
    if (landing === null) {
      return {
        ...base,
        resolvable: false,
        reason: 'The referenced content item no longer resolves inside the target Attempt.',
      };
    }
    return {
      ...base,
      resolvable: true,
      attempt_field_path: landing.attempt_field_path,
      content_item_id: landing.content_item_id,
      content_source_type: landing.source_type,
      content_value: landing.value,
      source_archived: sourceArchiveAnnotationApplies(target.archive_state as ArchiveState),
      matched_level_a_dimensions: matchedByTarget[ref.target_id] ?? [],
    };
  });
}
