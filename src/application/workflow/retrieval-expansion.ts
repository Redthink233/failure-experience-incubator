/**
 * S01-06 ｜ UI-facing read extension: the OPENED step ⑦ view.
 *
 * Why this file exists
 * --------------------
 * `M6` persists the FULL candidate set and reports a FOLD HINT (`D-046`): the read model
 * deliberately hands the interface only the first screen (`first_screen_size` rows) plus the true
 * `N_检索`. S01-06 step ⑦ must be able to open that fold - and `RetrievalView` is produced by
 * `retrievalViewOf(record, { expanded })`.
 *
 * 🔴 WHAT THIS IS: a pure projection of the ALREADY STORED derivation. It runs no retrieval, calls
 *    no provider, writes nothing and creates no state - `expanded` only decides how many of the
 *    persisted candidate entries are handed back (S01-06 task §28).
 * 🔴 WHY IT LIVES IN `M15` AND NOT IN THE UI: `src/ui/**` must not import `src/retrieval/compare`
 *    (task §49 / §68). `M15` may - it already consumes `M6` - so the one line that knows about
 *    `retrievalViewOf` stays here and the UI only ever touches `D9WorkflowSnapshot` shapes.
 * 🔴 WHAT IT IS NOT: not a new `Decision`, not a new `AC`, not a change to `D9WorkflowService`, and
 *    not a second retrieval. Expanding the fold can never change `N_检索`.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ExperienceRetrievalService, RetrievalView } from '../../retrieval/compare/retrieval-service.js';
import { retrievalViewOf } from '../../retrieval/compare/retrieval-service.js';
import type { D9WorkflowSnapshot } from './types.js';

/** The `M15` port member this projection needs - reading the current derivation, nothing else. */
export type RetrievalViewReadPort = Pick<ExperienceRetrievalService, 'readCurrentDerivation'>;

/**
 * The same stored derivation, with the reading fold opened.
 *
 * @returns the opened view, or `null` when this record has no stored comparison at all (which is
 *          NOT one of the two empty states - `null` means "no completed retrieval exists").
 */
export function openedRetrievalView(snapshot: D9WorkflowSnapshot): RetrievalView | null {
  const derivation = snapshot.retrieval.derivation;
  if (derivation === null) {
    return null;
  }
  return retrievalViewOf(derivation, { expanded: true });
}

/**
 * The same projection, taken from the repository instead of a snapshot.
 *
 * Used by the App Shell when the user opens the fold on an already-rendered record: the derivation is
 * re-read from the workspace and re-projected, so nothing is invented and no comparison is re-run.
 */
export async function readOpenedRetrievalView(
  port: RetrievalViewReadPort,
  attempt_id: D9WorkflowSnapshot['attempt_id'],
): Promise<RetrievalView | null> {
  const derivation = await port.readCurrentDerivation(attempt_id);
  return derivation === null ? null : retrievalViewOf(derivation, { expanded: true });
}
