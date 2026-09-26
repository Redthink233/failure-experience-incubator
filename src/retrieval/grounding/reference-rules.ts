/**
 * S01 ｜ `M7` reference rules: which roles a landing point may carry, and the `Unknown`-result
 *            boundary.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
 *   - §5.2 rules 1–12: `role` is mandatory per reference; the four roles are closed; `grounding`
 *     MUST land on a `Fact`; `Extraction` may carry `support` / `contradict` / `context`;
 *   - §5.2 rule 6 + §6.2: a `Formal Attempt` whose result status is `Unknown` may carry
 *     `grounding` / `context` but MUST NOT carry `support` / `contradict` ALONE
 *     (`D-035` / `AC-40`);
 *   - §6.2 / §6.3 rule 7: counting depends ONLY on the role.
 *
 * 🔴 The role list, the "grounding requires a Fact" rule and the counting rule are all CONSUMED
 *    from the frozen domain helpers — this module does not restate them, so a single change point
 *    remains for every one of them.
 * 🔴 The `Unknown` rule is a SET-LEVEL rule, not a per-row flag: one `Unknown` target may support a
 *    role as long as the role set is not composed of `Unknown` targets only. A per-row flag would
 *    silently forbid the second, known-result source.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, no LLM.
 */

import type { Attempt } from '../../domain/types/attempt.js';
import type { RefRole } from '../../domain/types/evidence-ref.js';
import { GROUNDING_ROLE, REF_ROLES, isGroundingAllowedForContentItem } from '../../domain/types/evidence-ref.js';
import type { ContentItem, SourceType } from '../../domain/types/source-type.js';

/* ------------------------------------------------------------------ *
 * 1. Role eligibility
 * ------------------------------------------------------------------ */

/** The two roles that assert a RESULT DIRECTION - the ones the `Unknown` rule constrains. */
export type DirectionRole = Extract<RefRole, 'support' | 'contradict'>;

export const DIRECTION_ROLES: readonly DirectionRole[] = ['support', 'contradict'];

/**
 * The roles a landing point of the given source layer may legally carry.
 *
 * 🔴 Built by FILTERING the frozen `REF_ROLES` list, so the four-role set stays single-sourced and
 *    a fifth role cannot be introduced here.
 * 🔴 An `Inference` yields the EMPTY list: it is never referenceable at all
 *    (`candidate_cause` of any decision state, an accepted `Inference` and a display `Inference`
 *    alike - task §14).
 */
export function allowedRefRolesFor(source_type: SourceType): readonly RefRole[] {
  if (source_type === 'Inference') {
    return [];
  }
  return REF_ROLES.filter((role) => role !== GROUNDING_ROLE || source_type === 'Fact');
}

/**
 * `true` when the landing point may carry `role`.
 *
 * 🔴 For `grounding` this delegates to the FROZEN §5.2 rule 9 predicate, so
 *    "`grounding` requires a `Fact`" has exactly one definition in the repository.
 */
export function roleAllowedForContentItem(item: ContentItem, role: RefRole): boolean {
  if (role === GROUNDING_ROLE) {
    return isGroundingAllowedForContentItem(item);
  }
  return allowedRefRolesFor(item.source_type).includes(role);
}

/* ------------------------------------------------------------------ *
 * 2. The `Unknown` result-status boundary
 * ------------------------------------------------------------------ */

/**
 * Canonical `Unknown` spellings.
 *
 * 🔴 `D10` fixes the four result states as `Failed` / `Partial` / `Success` / `Unknown`
 *    (docs/05 §「结果状态枚举」). The stored value is free text the user may rewrite, so this is the
 *    IMPLEMENTATION PARAMETER by which `M7` recognises the `Unknown` state; it is deliberately
 *    narrow and never a similarity check.
 */
export const UNKNOWN_RESULT_STATUS_VALUES: readonly string[] = ['unknown', '未知'];

/** The accepted result-status text of a record, or `null` when there is none. */
export function resultStatusValueOf(attempt: Attempt): string | null {
  const carrier = attempt.result_status;
  return carrier.presence_state === 'present' ? carrier.item.value : null;
}

/**
 * `true` when the record's result status is `Unknown`.
 *
 * 🔴 The record stays a fully usable historical source: this only removes its ability to carry a
 *    result DIRECTION on its own (AC-40).
 */
export function resultStatusIsUnknown(attempt: Attempt): boolean {
  const value = resultStatusValueOf(attempt);
  if (value === null) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return UNKNOWN_RESULT_STATUS_VALUES.some((token) => normalized === token);
}

/** One `(role, target)` assignment, together with the target's `Unknown` state. */
export interface RoleAssignment {
  readonly role: RefRole;
  readonly target_id: string;
  readonly target_result_unknown: boolean;
}

/**
 * The direction roles whose ENTIRE membership is composed of `Unknown`-result targets.
 *
 * 🔴 Machine-checkable form of the `D-035` / `AC-40` rule («其全部成员均为 `result_status =
 *    Unknown` 时不成立»): a single `Unknown` record alone may never be the direction, while a
 *    second source with a known result makes the role legal again.
 * 🔴 An empty role set is not "unsatisfied" - it simply carries no direction.
 */
export function unsatisfiedDirectionRoles(
  assignments: readonly RoleAssignment[],
): readonly DirectionRole[] {
  const unsatisfied: DirectionRole[] = [];
  for (const role of DIRECTION_ROLES) {
    const members = assignments.filter((assignment) => assignment.role === role);
    if (members.length > 0 && members.every((member) => member.target_result_unknown)) {
      unsatisfied.push(role);
    }
  }
  return unsatisfied;
}
