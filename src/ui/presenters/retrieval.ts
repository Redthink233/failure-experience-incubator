/**
 * S01-06 ｜ Step ⑥ / ⑦ presentation: the retrieval result, its THREE 0-like states and the fold.
 *
 * 🔴 THE THREE 0-LIKE STATES ARE KEPT APART (task §25 / AC-97 / AC-98). `HISTORY_EMPTY`,
 *    `NO_RELATED_HISTORY` and `RETRIEVAL_RUNTIME_INCOMPLETE` each get their OWN sentence, and
 *    "nothing has been retrieved at all" is a FOURTH, separate statement. Collapsing them into one
 *    「暂无数据」 is exactly the failure mode this file exists to prevent.
 * 🔴 `N_检索` IS READ, NEVER RECOUNTED: the number rendered is `retrieval.n_retrieval` from `M6`'s own
 *    read model. This module does not count candidates, and a folded first screen can therefore never
 *    be mistaken for the size of the related set (AC-85).
 * 🔴 NO NUMBER IS EVER A JUDGEMENT. There is no similarity, no relevance score, no strength and no
 *    grade anywhere in the view model - the product has none (AC-82–AC-86 / task §27 / §57).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO I/O.
 */

import {
  COMPARISON_DIFFERENT,
  COMPARISON_EXPAND,
  COMPARISON_COLLAPSE,
  COMPARISON_REASON,
  COMPARISON_SAME,
  COMPARISON_UNCOMPARED,
  COMPARISON_UNCOMPARED_ITEM,
  RETRIEVAL_HISTORY_EMPTY,
  RETRIEVAL_NO_RELATED_HISTORY,
  RETRIEVAL_NOT_AVAILABLE,
  RETRIEVAL_RUNTIME_INCOMPLETE,
  RETRIEVAL_STALE,
  comparisonMore,
  retrievalFound,
} from '../copy.js';
import { LEVEL_A_DIMENSION_LABELS } from '../../domain/types/level-a.js';
import type { LevelADimension } from '../../domain/types/level-a.js';
import type {
  D9WorkflowSnapshot,
  WorkflowErrorCode,
  WorkflowNotice,
} from '../../application/workflow/types.js';

/** The state the step ⑥ card is in. `no_comparison_yet` is NOT one of the two empty states. */
export type RetrievalPhase =
  | 'not_available'
  | 'runtime_incomplete'
  | 'history_empty'
  | 'no_related_history'
  | 'related';

export interface ComparisonPointView {
  readonly dimension_label: string;
  readonly text: string;
}

export interface RelatedAttemptCardView {
  readonly attempt_id: string;
  readonly same_points: readonly ComparisonPointView[];
  readonly different_points: readonly ComparisonPointView[];
  readonly uncompared: readonly string[];
  readonly reasons: readonly string[];
}

export interface RetrievalPresentation {
  readonly phase: RetrievalPhase;
  /** The whole card headline, e.g. 「找到 5 条相关历史记录」. */
  readonly headline: string;
  /** The full `N_检索` this record reports, or `null` when nothing is stored. */
  readonly n_retrieval: number | null;
  readonly candidates: readonly RelatedAttemptCardView[];
  /** True total minus what is currently visible - the `D-046` fold, never an evidence count. */
  readonly remaining: number;
  readonly expandable: boolean;
  readonly expanded: boolean;
  readonly expand_label: string;
  readonly more_label: string;
  readonly fold_note: string | null;
  /** Source-record-level uncompared dimensions, so ⑦ can state them neutrally. */
  readonly source_uncompared: readonly string[];
  readonly stale: boolean;
  readonly stale_notice: string | null;
  readonly runtime_notice: WorkflowNotice | null;
  readonly section_titles: {
    readonly same: string;
    readonly different: string;
    readonly uncompared: string;
    readonly reason: string;
    readonly uncompared_item: string;
  };
}

const SECTION_TITLES = {
  same: COMPARISON_SAME,
  different: COMPARISON_DIFFERENT,
  uncompared: COMPARISON_UNCOMPARED,
  reason: COMPARISON_REASON,
  uncompared_item: COMPARISON_UNCOMPARED_ITEM,
} as const;

export function dimensionLabelOf(dimension: LevelADimension | string): string {
  const label = LEVEL_A_DIMENSION_LABELS[dimension as LevelADimension];
  return label ?? dimension;
}

/** The workflow-level notice with this code, when the read model reported one. */
function noticeOf(snapshot: D9WorkflowSnapshot | null, code: WorkflowErrorCode): WorkflowNotice | null {
  return snapshot?.notices.find((notice) => notice.code === code) ?? null;
}

function emptyPresentation(phase: RetrievalPhase, headline: string): RetrievalPresentation {
  return {
    phase,
    headline,
    n_retrieval: null,
    candidates: [],
    remaining: 0,
    expandable: false,
    expanded: false,
    expand_label: COMPARISON_EXPAND,
    more_label: '',
    fold_note: null,
    source_uncompared: [],
    stale: false,
    stale_notice: null,
    runtime_notice: null,
    section_titles: SECTION_TITLES,
  };
}

/**
 * The step ⑥⑦ presentation of one record.
 *
 * @param expanded whether the user has opened the reading fold on this screen.
 */
export function retrievalPresentationOf(
  snapshot: D9WorkflowSnapshot | null,
  expanded: boolean,
): RetrievalPresentation {
  if (snapshot === null) {
    return emptyPresentation('not_available', RETRIEVAL_NOT_AVAILABLE);
  }

  const retrieval = snapshot.retrieval;

  if (retrieval.state === 'not_available') {
    return emptyPresentation('not_available', RETRIEVAL_NOT_AVAILABLE);
  }
  if (retrieval.state === 'runtime_incomplete') {
    return {
      ...emptyPresentation('runtime_incomplete', RETRIEVAL_RUNTIME_INCOMPLETE),
      runtime_notice: noticeOf(snapshot, 'RETRIEVAL_RUNTIME_INCOMPLETE'),
    };
  }

  /* A completed retrieval: `state === 'ready'`, yet `n_retrieval` may still be 0. */
  if (retrieval.zero_like_state === 'HISTORY_EMPTY') {
    return emptyPresentation('history_empty', RETRIEVAL_HISTORY_EMPTY);
  }
  if (retrieval.zero_like_state === 'NO_RELATED_HISTORY') {
    return emptyPresentation('no_related_history', RETRIEVAL_NO_RELATED_HISTORY);
  }

  const n_retrieval = retrieval.n_retrieval;
  if (n_retrieval === null) {
    return emptyPresentation('not_available', RETRIEVAL_NOT_AVAILABLE);
  }

  const view = retrieval.view;
  const candidates = (view?.candidates ?? []).map((candidate) => ({
    attempt_id: String(candidate.candidate_attempt_id),
    same_points: candidate.similar_points.map((point) => ({
      dimension_label: dimensionLabelOf(point.dimension),
      text: point.text,
    })),
    different_points: candidate.difference_points.map((point) => ({
      dimension_label: dimensionLabelOf(point.dimension),
      text: point.text,
    })),
    uncompared: candidate.uncompared_dimensions.map((dimension) => dimensionLabelOf(dimension)),
    reasons: candidate.relevance_reasons.map((reason) => reason.text),
  }));

  const total = view?.total_candidate_count ?? candidates.length;
  const remaining = Math.max(0, total - candidates.length);
  const expandable = view?.expandable === true && remaining > 0;

  return {
    phase: 'related',
    headline: retrievalFound(n_retrieval),
    n_retrieval,
    candidates,
    remaining,
    expandable,
    expanded: expanded && expandable,
    expand_label: expanded ? COMPARISON_COLLAPSE : COMPARISON_EXPAND,
    more_label: comparisonMore(remaining),
    fold_note: expandable ? comparisonMore(remaining) : null,
    source_uncompared: (view?.uncompared_dimensions ?? []).map((dimension) =>
      dimensionLabelOf(dimension),
    ),
    stale: retrieval.freshness.stale,
    stale_notice: retrieval.freshness.notice ?? (retrieval.freshness.stale ? RETRIEVAL_STALE : null),
    runtime_notice: null,
    section_titles: SECTION_TITLES,
  };
}

/**
 * Whether the stale banner may offer 「重新检索」.
 *
 * 🔴 The App Shell never reruns retrieval on its own: this only says the button is meaningful.
 *    Nothing in this module triggers anything (§26).
 */
export function staleRerunIsOffered(presentation: RetrievalPresentation): boolean {
  return presentation.stale === true;
}

/**
 * Whether "the record was saved, but retrieval did not finish" must be shown as ONE combined state
 * (§24): the save STAYS a save, and the retrieval failure is a separate, retryable statement.
 *
 * 🔴 IT IS TRUE ONLY FOR `runtime_incomplete` (`PRE-PSA-HARDENING-01` §5 / §6).
 *    `not_available` means step ⑥ has not produced anything yet - 「这条记录还没有做过历史检索」 - and
 *    that is neither a failure nor `N_检索 = 0`. Rendering 「历史检索这次没有完成」 for it would (a)
 *    state a runtime failure that never happened, and (b) contradict ⑥'s own sentence on the same
 *    screen. A REAL runtime failure keeps this exact combined statement, with its rerun button.
 */
export function saveAndRetrievalAreSplit(snapshot: D9WorkflowSnapshot | null): boolean {
  return (
    snapshot !== null &&
    snapshot.attempt_state === 'Formal' &&
    snapshot.retrieval.state === 'runtime_incomplete'
  );
}
