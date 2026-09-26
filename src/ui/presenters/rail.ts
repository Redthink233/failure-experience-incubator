/**
 * S01-06 ｜ The left rail: what history exists (task §15 / §16 / §42).
 *
 * 🔴 A RAIL LINE CARRIES NO JUDGEMENT. There is no similarity, no score, no strength and no
 *    「价值」 of any kind - only the record's own title/excerpt, its `Draft`/`Formal` state, its
 *    data-source nature (the Demo / Live badge) and whether it is archived.
 * 🔴 DEMO / LIVE IS READ FROM L4 ③ (`data_source_nature`), the field the product already owns. The
 *    badge is therefore ready for the M16 demo seed without S01-06 seeding anything itself.
 * 🔴 ARCHIVING IS A STATE, NOT A DELETION (task §42): an archived line stays in the list, visually
 *    de-emphasised and marked 「已归档」. There is no delete affordance anywhere in this view model.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO I/O.
 */

import {
  BADGE_DEMO,
  BADGE_LIVE,
  RAIL_ARCHIVED_BADGE,
  RAIL_STATE_DRAFT,
  RAIL_STATE_FORMAL,
  WORKSPACE_CONNECTED,
  WORKSPACE_NEEDS_AUTHORIZATION,
  WORKSPACE_UNSELECTED,
  formatTimestamp,
} from '../copy.js';
import type { AttemptState, DataSourceNature } from '../../domain/types/attempt.js';
import type { WorkflowAttemptSummary } from '../../application/workflow/attempt-summaries.js';

export interface NatureBadgeView {
  readonly label: string;
  readonly is_demo: boolean;
}

/**
 * The Demo / Live badge.
 *
 * 🔴 `demo_sample` is the ONLY nature that may be labelled Demo. `field_record` and
 *    `retrospective_entry` are BOTH real user data and are therefore both labelled Live.
 */
export function natureBadgeOf(nature: DataSourceNature): NatureBadgeView {
  return nature === 'demo_sample'
    ? { label: BADGE_DEMO, is_demo: true }
    : { label: BADGE_LIVE, is_demo: false };
}

export function attemptStateLabel(state: AttemptState): string {
  return state === 'Formal' ? RAIL_STATE_FORMAL : RAIL_STATE_DRAFT;
}

export interface AttemptRailItemView {
  readonly attempt_id: string;
  readonly title: string;
  readonly excerpt: string;
  readonly state: AttemptState;
  readonly state_label: string;
  readonly badge: NatureBadgeView;
  readonly archived: boolean;
  readonly archived_label: string | null;
  readonly updated_label: string;
  readonly selected: boolean;
}

export function railItemOf(
  summary: WorkflowAttemptSummary,
  selected_attempt_id: string | null,
): AttemptRailItemView {
  const archived = summary.archive_state === 'archived';
  return {
    attempt_id: String(summary.attempt_id),
    title: summary.title,
    excerpt: summary.excerpt,
    state: summary.state,
    state_label: attemptStateLabel(summary.state),
    badge: natureBadgeOf(summary.data_source_nature),
    archived,
    archived_label: archived ? RAIL_ARCHIVED_BADGE : null,
    updated_label: formatTimestamp(summary.updated_at),
    selected: selected_attempt_id !== null && String(summary.attempt_id) === selected_attempt_id,
  };
}

/**
 * The rail lines, in display order.
 *
 * 🔴 Ordering is a READING convenience only: active records first (as `M15`'s index already returns
 *    them, newest first), archived ones after. Archiving never removes a record and never reorders
 *    the underlying data.
 */
export function railItemsOf(
  summaries: readonly WorkflowAttemptSummary[],
  selected_attempt_id: string | null,
): readonly AttemptRailItemView[] {
  const active = summaries.filter((summary) => summary.archive_state !== 'archived');
  const archived = summaries.filter((summary) => summary.archive_state === 'archived');
  return [...active, ...archived].map((summary) => railItemOf(summary, selected_attempt_id));
}

/* ------------------------------------------------------------------ *
 * Workspace status and entry
 * ------------------------------------------------------------------ */

export type WorkspaceStatus = 'unselected' | 'connected' | 'needs_authorization';

export function workspaceStatusLabel(status: WorkspaceStatus, label: string | null): string {
  if (status === 'connected') {
    return label === null ? WORKSPACE_CONNECTED : `${WORKSPACE_CONNECTED}｜${label}`;
  }
  return status === 'needs_authorization' ? WORKSPACE_NEEDS_AUTHORIZATION : WORKSPACE_UNSELECTED;
}

/** Is the rail / workbench allowed to read anything at all? (task §9 - nothing before authorization) */
export function workspaceAllowsRead(status: WorkspaceStatus): boolean {
  return status === 'connected';
}
