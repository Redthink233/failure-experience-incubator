/**
 * `EvidenceRef` - the reference record.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
 *   - §5.1  minimum field set (5 fields);
 *   - §5.2  hard rules 1-12, including the v0.2.1 canonical alignment:
 *           `source_field_path` may land on a `Fact` OR an `Extraction` content item
 *           (CCR-S03B-01), while `role = grounding` MUST land on a `Fact` item;
 *           `archived_at_ref` was REMOVED - "来源已归档" is derived from the
 *           target's CURRENT `archive_state` (CCR-S03B-02 / §7.4);
 *   - §3.3  the step ⑩ trace list and `N_引用` MUST be derived from the SAME
 *           `EvidenceRef` set;
 *   - §12 item 10: Worker-forbidden-to-change shared semantics.
 *
 * 🔴 No numeric similarity / score may ever be carried by a reference (D-020 / §5.2 rule 7).
 * 🔴 No `archived_at_ref` / snapshot field may be added back.
 */

import type { ObjectId } from '../ids/object-id.js';
import type { ArchiveState } from './archive.js';
import { isSourceArchived } from './archive.js';
import type { ContentItem } from './source-type.js';
import { isFact } from './source-type.js';

/** Evidence role. MUST be labelled per reference; never omitted (§5.2 rule 1). */
export type RefRole = 'grounding' | 'support' | 'contradict' | 'context';

export const REF_ROLES: readonly RefRole[] = [
  'grounding',
  'support',
  'contradict',
  'context',
];

export const GROUNDING_ROLE: 'grounding' = 'grounding';
export const CONTEXT_ROLE: 'context' = 'context';

/**
 * Pointer to a traceable content item inside a referenced `Formal Attempt`.
 *
 * Serialization form is an implementation parameter (TQ17 / §13.2). S01-01 uses
 * `<attempt_field_path>#<content_item_id>`; the Fact / Extraction layer of the
 * landing point is determined by the referenced content item's own `source_type`
 * and NOT by this path (§5.2 rule 10).
 */
export type SourceFieldPath = string;

export const SOURCE_FIELD_PATH_SEPARATOR = '#';

export interface ParsedSourceFieldPath {
  readonly attempt_field_path: string;
  readonly content_item_id: string;
}

export function formatSourceFieldPath(
  attemptFieldPath: string,
  contentItemId: string,
): SourceFieldPath {
  return `${attemptFieldPath}${SOURCE_FIELD_PATH_SEPARATOR}${contentItemId}`;
}

export function parseSourceFieldPath(path: SourceFieldPath): ParsedSourceFieldPath | null {
  const index = path.indexOf(SOURCE_FIELD_PATH_SEPARATOR);
  if (index <= 0 || index === path.length - 1) {
    return null;
  }
  return {
    attempt_field_path: path.slice(0, index),
    content_item_id: path.slice(index + 1),
  };
}

/** Owner of a reference: an `Insight` or a `Hypothesis` (§5.1 `owner_id`). */
export type EvidenceOwnerId = ObjectId<'INS'> | ObjectId<'HYP'>;

export interface EvidenceRef {
  readonly evidence_ref_id: string;
  /**
   * MUST reference a `Formal Attempt`; referencing a `Draft` is forbidden (§5.2).
   * 🔴 Typed as `ObjectId<'ATT'>`: this is the STRUCTURAL enforcement of §5.2 rule 4 -
   *    because the target is always an Attempt ID, a `Model Suggestion` (and any other
   *    `HypothesisKind`) can never occupy an evidence target position.
   */
  readonly target_id: ObjectId<'ATT'>;
  readonly source_field_path: SourceFieldPath;
  readonly role: RefRole;
  readonly owner_id: EvidenceOwnerId;
}

/**
 * §6.2 counting table: only `grounding` / `support` / `contradict` count toward
 * `N_引用`; a pure `context` reference is displayable but never counted.
 *
 * §6.3 rule 7: counting depends ONLY on `role` - never on the Fact / Extraction
 * landing layer, and there is no third "partially counted" state.
 */
export function countsTowardNCitation(role: RefRole): boolean {
  return role !== CONTEXT_ROLE;
}

/** §5.2 rule 5: pure context references must be displayable and labelled 「上下文」. */
export function isContextOnlyReference(ref: EvidenceRef): boolean {
  return ref.role === CONTEXT_ROLE;
}

/**
 * §5.2 rule 9: `role = grounding` may only land on a `Fact` content item.
 * `Extraction` may carry `support` / `contradict` / `context` but NEVER `grounding`.
 */
export function isGroundingAllowedForContentItem(item: ContentItem): boolean {
  return isFact(item);
}

/**
 * §5.2 rule 11 / §7.4: whether the 「来源已归档」 annotation applies right now.
 * Derived from the CURRENT state of the referenced target - never snapshot.
 */
export function sourceArchiveAnnotationApplies(targetCurrent: ArchiveState): boolean {
  return isSourceArchived(targetCurrent);
}
