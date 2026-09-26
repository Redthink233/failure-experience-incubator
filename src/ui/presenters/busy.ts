/**
 * S01-06 ｜ 「is this item already being worked on?」 - the read-only view of `AppSessionState.pending`.
 *
 * ── WHY THIS MODULE EXISTS (`FINAL-RAPID-C` §5) ─────────────────────────────────────
 * 🔴 THE SESSION SERIALISES PER ITEM, AND IT IS RIGHT TO. Every ⑧ action on one insight runs under
 *    the key `insight-action:<insight_id>`, and every ⑨ action on one hypothesis under
 *    `hypothesis-action:<hypothesis_id>` (`app-session.ts`). `run()` returns immediately when that
 *    key is already pending, so a double click can never write twice.
 * 🔴 BUT A SILENTLY IGNORED CLICK IS INDISTINGUISHABLE FROM A BROKEN BUTTON. The user who clicks
 *    「接受」 twice, or clicks 「拒绝」 while 「接受」 is still in flight, gets no feedback at all while
 *    the first call is running. The App Shell's answer is to stop OFFERING the second click: every
 *    control that would land on the same key is disabled (and the card says 「正在处理…」). Nothing
 *    about the session's concurrency is changed - the UI simply stops presenting a control whose only
 *    possible outcome is a no-op.
 * 🔴 THE KEY FORMAT IS `AppSession`'s, NOT THIS MODULE'S INVENTION. It cannot be imported from there
 *    (the session layer exports no key builder, and this patch must not edit it), so it is mirrored
 *    here - and the mirror is CHECKED against the real source by a regression case, so it cannot
 *    drift silently. If `app-session.ts` ever changes its key shape, that test fails.
 * 🔴 IT TAKES `pending` AND NOT THE WHOLE SESSION STATE, so it carries no dependency on the session
 *    layer at all: any record of in-flight keys can be asked.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO I/O.
 */

/** A record of in-flight action keys - `AppSessionState.pending`, nothing more. */
export type PendingMap = Readonly<Record<string, boolean>>;

/**
 * The pending key `AppSession.acceptInsight` / `rejectInsight` / `revokeInsightAcceptance` /
 * `saveInsightEdit` all share for one insight.
 *
 * 🔴 ONE KEY FOR FOUR ACTIONS IS THE POINT: the insight has a single decision column, so two
 *    conflicting writes to it must never overlap.
 */
export function insightActionKey(insight_id: string): string {
  return `insight-action:${insight_id}`;
}

/**
 * The pending key every ⑨ action on one hypothesis shares: accept / reject / save-model-suggestion /
 * criterion decision / criterion addition / ⑥⑦⑧ edit save.
 */
export function hypothesisActionKey(hypothesis_id: string): string {
  return `hypothesis-action:${hypothesis_id}`;
}

/** Whether the action behind this key is currently in flight. A missing entry is simply `false`. */
export function isPendingKey(pending: PendingMap, key: string): boolean {
  return pending[key] === true;
}

/** Whether ANY action on this insight is in flight. */
export function insightIsBusy(pending: PendingMap, insight_id: string): boolean {
  return isPendingKey(pending, insightActionKey(insight_id));
}

/** Whether ANY action on this hypothesis is in flight. */
export function hypothesisIsBusy(pending: PendingMap, hypothesis_id: string): boolean {
  return isPendingKey(pending, hypothesisActionKey(hypothesis_id));
}
