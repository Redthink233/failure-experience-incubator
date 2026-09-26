/**
 * S01-06 ｜ The left rail: 「过去有什么？」 (task §15 / §16 / §42).
 *
 * 🔴 A LINE IS A SUMMARY, NOT A JUDGEMENT. Title, excerpt, `Draft`/`Formal`, the Demo/Live badge, the
 *    archived marker and the update time - and nothing else. No percentage, no score, no grade, no
 *    「价值」: those values do not exist in the view model, so they cannot leak into the DOM.
 * 🔴 ARCHIVE, NEVER DELETE (task §42). The only state action is 归档 / 取消归档, and an archived line
 *    STAYS in the list with a 「已归档」 marker.
 *
 * DOM scope only.
 */

import { badge, button, el, note } from '../dom.js';
import {
  ATTEMPT_ARCHIVE_ACTION,
  ATTEMPT_ARCHIVED_READONLY,
  ATTEMPT_UNARCHIVE_ACTION,
  RAIL_ARCHIVED_BADGE,
  RAIL_EMPTY,
  RAIL_HEADING,
  RAIL_NEW_ATTEMPT,
} from '../copy.js';
import { railItemsOf } from '../presenters/rail.js';
import type { ViewContext } from './shell.js';

export function leftRail(context: ViewContext): HTMLElement {
  const { state, session } = context;
  const items = railItemsOf(state.attempts, state.selected_attempt_id);

  return el(
    'aside',
    { class: 'rail rail-left', attrs: { 'aria-label': RAIL_HEADING } },
    el(
      'div',
      { class: 'rail-header' },
      button(RAIL_NEW_ATTEMPT, () => session.openNewAttempt(), {
        class: 'btn btn-primary btn-block',
        attrs: { 'data-action': 'new-attempt' },
      }),
    ),
    el('h2', { class: 'rail-title', text: RAIL_HEADING }),
    items.length === 0
      ? note(RAIL_EMPTY)
      : el(
          'ul',
          { class: 'attempt-list' },
          ...items.map((item) => attemptLine(context, item)),
        ),
  );
}

function attemptLine(
  context: ViewContext,
  item: ReturnType<typeof railItemsOf>[number],
): HTMLElement {
  const { session } = context;
  const classes = ['attempt-item'];
  if (item.selected) {
    classes.push('is-selected');
  }
  if (item.archived) {
    /* 🔴 Visual de-emphasis for an archived record - it is still readable, just quieter. */
    classes.push('is-archived');
  }
  return el(
    'li',
    { class: classes.join(' ') },
    el(
      'button',
      {
        class: 'attempt-main',
        props: { type: 'button' },
        attrs: { 'data-attempt': item.attempt_id },
        on: { click: () => void session.selectAttempt(item.attempt_id) },
      },
      el('div', { class: 'attempt-title', text: item.title }),
      el('div', { class: 'attempt-excerpt', text: item.excerpt }),
      el(
        'div',
        { class: 'attempt-meta' },
        badge(item.state_label, item.state === 'Formal' ? 'formal' : 'draft'),
        /* 🔴 A Demo badge is deliberately loud: example data must never look like the user's own. */
        badge(item.badge.label, item.badge.is_demo ? 'demo' : 'live'),
        item.archived_label === null ? null : badge(item.archived_label, 'archived'),
        el('span', { class: 'attempt-time', text: item.updated_label }),
      ),
    ),
    el(
      'div',
      { class: 'attempt-actions' },
      button(
        item.archived ? ATTEMPT_UNARCHIVE_ACTION : ATTEMPT_ARCHIVE_ACTION,
        () => void session.setArchived(item.attempt_id, !item.archived),
        { class: 'btn btn-tiny' },
      ),
      item.archived ? el('span', { class: 'hint', text: ATTEMPT_ARCHIVED_READONLY }) : null,
    ),
  );
}

/** The rail marker reused by other components when they show an archived source. */
export function archivedBadge(): HTMLElement {
  return badge(RAIL_ARCHIVED_BADGE, 'archived');
}
