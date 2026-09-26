/**
 * S01-06 ｜ The Evidence Rail: 「AI 为什么这么判断？」 (task §29 / §40).
 *
 * 🔴 THIS IS NOT A DEBUGGER. It answers one question for a reviewer: where did this judgement come
 *    from? A row therefore shows the source record, the LANDING POINT IN HUMAN WORDS (「来自 实际尝试」),
 *    the content, the ROLE (依据 / 支持 / 反驳 / 上下文) and whether the source is archived.
 * 🔴 `target_id` AND `source_field_path` ARE NOT THE HEADLINE (task §29). The human label is primary;
 *    the technical path stays available as a muted detail so a developer can reconcile the screen.
 * 🔴 `N_引用` IS THE SERVICE'S NUMBER. It is printed from the trace view - never counted here (§40).
 * 🔴 AN ARCHIVED SOURCE STILL OPENS (task §42): it is marked 「来源已归档」 and never 「引用失效」.
 *
 * DOM scope only.
 */

import { button, el, note, row } from '../dom.js';
import {
  EVIDENCE_ARCHIVED,
  EVIDENCE_CLOSE,
  EVIDENCE_CONTENT,
  EVIDENCE_RAIL_EMPTY,
  EVIDENCE_RAIL_TITLE,
  EVIDENCE_ROLE,
  EVIDENCE_SOURCE_ATTEMPT,
  EVIDENCE_SOURCE_FIELD,
} from '../copy.js';
import type { ViewContext } from './shell.js';

export function evidenceRail(context: ViewContext): HTMLElement {
  const { state, session } = context;
  const rail = el('aside', { class: 'rail rail-right', attrs: { 'aria-label': EVIDENCE_RAIL_TITLE } });
  rail.appendChild(el('h2', { class: 'rail-title', text: EVIDENCE_RAIL_TITLE }));

  const evidence = state.evidence;
  if (evidence === null) {
    rail.appendChild(note(EVIDENCE_RAIL_EMPTY));
    return rail;
  }

  rail.appendChild(
    el(
      'div',
      { class: 'evidence-head' },
      el('div', { class: 'evidence-title', text: evidence.title }),
      evidence.citation_label === null ? null : el('div', { class: 'hint', text: evidence.citation_label }),
      button(EVIDENCE_CLOSE, () => session.clearEvidence(), { class: 'btn btn-tiny btn-ghost' }),
    ),
  );

  if (evidence.source_attempt_id !== null) {
    rail.appendChild(row(EVIDENCE_SOURCE_ATTEMPT, evidence.source_attempt_id));
  }
  if (evidence.field_label !== null) {
    rail.appendChild(row(EVIDENCE_SOURCE_FIELD, evidence.field_label));
  }
  if (evidence.role_label !== null) {
    rail.appendChild(row(EVIDENCE_ROLE, evidence.role_label));
  }
  if (evidence.content !== null) {
    rail.appendChild(row(EVIDENCE_CONTENT, evidence.content));
  }
  if (evidence.unresolved_reason !== null) {
    rail.appendChild(note(evidence.unresolved_reason));
  }

  for (const entry of evidence.rows) {
    rail.appendChild(
      el(
        'div',
        { class: `evidence-row ${entry.resolvable ? 'resolved' : 'unresolved'}` },
        el(
          'div',
          { class: 'evidence-row-head' },
          /* 🔴 The human label is the headline ... */
          el('span', { class: 'evidence-field', text: entry.field_label }),
          el('span', { class: `role role-${entry.role_label}`, text: entry.role_label }),
          entry.archived ? el('span', { class: 'badge badge-archived', text: EVIDENCE_ARCHIVED }) : null,
        ),
        row(EVIDENCE_SOURCE_ATTEMPT, entry.target_label),
        /* ... and the technical path stays a muted secondary detail. */
        el('div', { class: 'evidence-path', text: entry.field_path }),
        entry.content === null ? null : row(EVIDENCE_CONTENT, entry.content),
        entry.unresolved_reason === null ? null : note(entry.unresolved_reason),
      ),
    );
  }

  return rail;
}
