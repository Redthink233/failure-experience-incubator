/**
 * Archive: an orthogonal, revocable state bit - never a physical delete.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md §7 (§7.1 - §7.4)
 *   - archiving is a state bit + retrieval filter + display annotation;
 *   - it MUST NOT be implemented as physical deletion (D-043 / AC-76);
 *   - it is ORTHOGONAL to `Draft` / `Formal` and MUST NOT be merged into one enum;
 *   - archiving neither triggers the step ⑥ retrieval nor invalidates existing IDs;
 *   - the "来源已归档" annotation is ALWAYS derived from the target's CURRENT
 *     `archive_state`; there is no second copy of the archive state and no
 *     `archived_at_ref` snapshot (CCR-S03B-02 / §5.2 rule 11 / §7.4).
 */

/** Attempt-level archive state. Orthogonal to `AttemptState`. */
export type ArchiveState = 'active' | 'archived';

export const ARCHIVE_STATES: readonly ArchiveState[] = ['active', 'archived'];

export function isArchived(state: ArchiveState): boolean {
  return state === 'archived';
}

/** Archive is revocable; un-archiving fully restores normal participation. */
export function unarchived(): ArchiveState {
  return 'active';
}

export function archived(): ArchiveState {
  return 'archived';
}

/**
 * Derived display annotation for a reference whose target is currently archived.
 * 🔴 Produced by reading the target's CURRENT state - never a snapshot taken when
 * the reference was created, and never a second stored field.
 *
 * The annotation string is a presentation concern; this helper only decides
 * whether the annotation applies.
 */
export function isSourceArchived(targetCurrentArchiveState: ArchiveState): boolean {
  return targetCurrentArchiveState === 'archived';
}

/**
 * 🔴 V1 has no physical deletion. There is intentionally no `deleted` state and no
 * delete operation anywhere in the domain or the workspace layer (AC-76).
 */
export const V1_HAS_PHYSICAL_DELETE = false;
