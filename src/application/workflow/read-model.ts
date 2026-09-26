/**
 * S01 ｜ `M15` - the workflow READ MODEL builder (task §23, §24, §27).
 *
 * ── THE ONE STRUCTURAL CLAIM ────────────────────────────────────────────────────────
 * 🔴 EVERYTHING here is DERIVED, on every read, from objects that are really persisted: the
 *    `Attempt`, the `M4`/`M5` capture snapshot, the current `M6` derivation, the `M8` / `M9` records
 *    and their batch records. NOTHING is remembered between calls, so recreating the service (a
 *    browser refresh, a new tab) rebuilds an identical snapshot, and "which step are we on" can never
 *    disagree with the workspace - because it is not stored at all.
 * 🔴 The frozen domain objects are carried VERBATIM. `M15` invents no parallel vocabulary for
 *    `Attempt` / `Insight` / `Hypothesis` / `EvidenceRef`, and it recomputes no `N_引用`: those views
 *    are read from `M7` / `M8` / `M9`, which are their single derivation points.
 * 🔴 NO provider model name, prompt, token, latency or raw exception is ever put into the snapshot.
 *    The domain objects and the module views do not carry any, and this file adds none.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O beyond the injected ports.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { Attempt } from '../../domain/types/attempt.js';
import type { InsightStateEvent } from '../../domain/types/insight.js';
import type { RetrievalDerivationRecord, RetrievalRuntimeFailure } from '../../retrieval/compare/types.js';
import { retrievalViewOf } from '../../retrieval/compare/retrieval-service.js';
import type { CaptureStateSnapshot } from '../capture/capture-service.js';
import type { InsightGenerationBatch, InsightView } from '../insight/types.js';
import type { HypothesisGenerationBatch, HypothesisView } from '../hypothesis/types.js';
import { retrievalFreshnessOf } from './retrieval-freshness.js';
import type {
  D9WorkflowSnapshot,
  WorkflowBatchView,
  WorkflowCapability,
  WorkflowHypothesesView,
  WorkflowInsightsView,
  WorkflowNotice,
  WorkflowRetrievalView,
} from './types.js';

/** Every input the builder needs; all of them are real port reads. */
export interface WorkflowReadInputs {
  readonly attempt: Attempt;
  readonly capture: CaptureStateSnapshot;
  readonly derivation: RetrievalDerivationRecord | null;
  /** The runtime failure THIS orchestrator instance observed for this record, or `null`. */
  readonly retrieval_runtime_failure: RetrievalRuntimeFailure | null;
  readonly insight_views: readonly InsightView[];
  readonly insight_batches: readonly InsightGenerationBatch[];
  readonly insight_state_events: readonly InsightStateEvent[];
  readonly experience_assets: readonly InsightView[];
  readonly hypothesis_views: readonly HypothesisView[];
  readonly hypothesis_batches: readonly HypothesisGenerationBatch[];
  readonly notices: readonly WorkflowNotice[];
}

/**
 * Turns the batch records into displayable views.
 *
 * 🔴 `is_current` is DERIVED from the batch records' own `created_at`; there is no stored
 *    "which generation is the current one" flag. The newest batch is simply the one with the greatest
 *    `created_at`, and the ties are broken by the id so the result is deterministic.
 * 🔴 The order is chronological and carries NO strength, correctness or reliability claim (`D-051`).
 */
function batchViewsOf<T extends { readonly batch_id: string; readonly created_at: string }>(
  batches: readonly T[],
  outputIdsOf: (batch: T) => readonly string[],
  exitOf: (batch: T) => { readonly exit_route: string | null; readonly absence_statement: string | null },
): { readonly views: readonly WorkflowBatchView[]; readonly current_batch_id: string | null } {
  const sorted = [...batches].sort((left, right) => {
    if (left.created_at !== right.created_at) {
      return left.created_at < right.created_at ? -1 : 1;
    }
    return left.batch_id < right.batch_id ? -1 : 1;
  });
  const current = sorted.length === 0 ? null : (sorted[sorted.length - 1]?.batch_id ?? null);
  return {
    views: sorted.map((batch) => {
      const exit = exitOf(batch);
      return {
        batch_id: batch.batch_id,
        created_at: batch.created_at,
        is_current: batch.batch_id === current,
        output_ids: outputIdsOf(batch),
        exit_route: exit.exit_route,
        absence_statement: exit.absence_statement,
      };
    }),
    current_batch_id: current,
  };
}

/** Step ⑥⑦ state, with the three 0-like states kept strictly apart (`§27`). */
function buildRetrievalView(inputs: WorkflowReadInputs): WorkflowRetrievalView {
  const derivation = inputs.derivation;
  const freshness = retrievalFreshnessOf(inputs.attempt.updated_at, derivation);
  /*
   * 🔴 THE THREE STATES, DERIVED AND NEVER MERGED.
   *   `ready`               : a derivation is stored.
   *   `not_available`       : no derivation is stored AND no runtime failure was observed - i.e. step
   *                           ⑥ has simply not produced anything yet. This is NOT `N_检索 = 0`.
   *   `runtime_incomplete`  : no derivation is stored AND this instance observed a runtime failure.
   */
  const state: WorkflowRetrievalView['state'] =
    derivation !== null
      ? 'ready'
      : inputs.retrieval_runtime_failure !== null
        ? 'runtime_incomplete'
        : 'not_available';
  const zero_like =
    derivation === null || derivation.status === 'RELATED_HISTORY' ? null : derivation.status;
  return {
    state,
    derivation,
    view: derivation === null ? null : retrievalViewOf(derivation),
    /* 🔴 `null` - never `0` - while nothing is stored: a runtime failure must not read as 「没有相关历史」. */
    n_retrieval: derivation === null ? null : derivation.n_retrieval,
    zero_like_state: zero_like,
    freshness,
    runtime_failure: inputs.retrieval_runtime_failure,
  };
}

function insightsViewOf(inputs: WorkflowReadInputs): WorkflowInsightsView {
  const batches = batchViewsOf(
    inputs.insight_batches,
    (batch) => batch.insight_ids.map((id) => String(id)),
    (batch) => ({ exit_route: batch.exit_route, absence_statement: batch.absence_statement }),
  );
  const state_events: Record<string, readonly InsightStateEvent[]> = {};
  for (const view of inputs.insight_views) {
    const id = String(view.insight.insight_id);
    state_events[id] = inputs.insight_state_events.filter(
      (event) => String(event.insight_id) === id,
    );
  }
  return {
    batches: batches.views,
    current_batch_id: batches.current_batch_id,
    views: inputs.insight_views,
    experience_assets: inputs.experience_assets,
    state_events,
  };
}

function hypothesesViewOf(inputs: WorkflowReadInputs): WorkflowHypothesesView {
  const batches = batchViewsOf(
    inputs.hypothesis_batches,
    (batch) => [
      ...batch.hypothesis_ids.map((id) => String(id)),
      ...batch.model_suggestion_ids.map((id) => String(id)),
    ],
    (batch) => ({ exit_route: batch.exit_route, absence_statement: batch.absence_statement }),
  );
  return {
    batches: batches.views,
    current_batch_id: batches.current_batch_id,
    views: inputs.hypothesis_views.filter((view) => view.hypothesis.kind === 'grounded'),
    /*
     * 🔴 A `Model Suggestion` is listed SEPARATELY and on purpose: it has no `EvidenceRef`, no
     *    `N_引用` and no place in ⑩ (`D-042`). Mixing it into the grounded list would be the exact
     *    confusion §8.4 forbids.
     */
    model_suggestions: inputs.hypothesis_views.filter((view) => view.hypothesis.kind === 'model'),
  };
}

/**
 * Which commands the record's CURRENT state suggests.
 *
 * 🔴 A HINT, never a permission: the modules still refuse an action they do not allow, and this list
 *    only exists so the UI does not have to duplicate the state logic. It is derived on every read.
 */
function capabilitiesOf(inputs: WorkflowReadInputs): readonly WorkflowCapability[] {
  const actions: WorkflowCapability[] = ['begin_capture'];
  const is_draft = inputs.attempt.state === 'Draft';
  if (is_draft) {
    actions.push(
      'apply_structured_confirmation',
      'ask_follow_up_question',
      'abandon_follow_up_gap',
      'persist_candidate_causes',
      'save_formal_attempt',
    );
  } else {
    /* Only a `Formal` record may be retrieved FOR (`M6`'s frozen source gate). */
    actions.push('rerun_retrieval');
  }

  if (inputs.insight_views.length === 0) {
    if (!is_draft) {
      actions.push('generate_insights');
    }
  } else {
    actions.push(
      'regenerate_insights',
      'accept_insight',
      'reject_insight',
      'revoke_insight_acceptance',
      'edit_insight_content',
      'edit_insight_meta',
    );
  }

  if (inputs.hypothesis_views.length === 0) {
    if (!is_draft) {
      actions.push('generate_hypotheses');
    }
  } else {
    actions.push(
      'regenerate_hypotheses',
      'accept_hypothesis',
      'reject_hypothesis',
      'save_model_suggestion',
      'edit_hypothesis_criteria',
      'decide_hypothesis_criterion',
      'trace_hypothesis',
    );
  }

  actions.push('set_attempt_archived');
  return actions;
}

/** Builds the single application-facing read model. */
export function buildWorkflowSnapshot(inputs: WorkflowReadInputs): D9WorkflowSnapshot {
  return {
    attempt_id: inputs.attempt.attempt_id,
    attempt: inputs.attempt,
    attempt_state: inputs.attempt.state,
    archive_state: inputs.attempt.archive_state,
    capture: inputs.capture,
    retrieval: buildRetrievalView(inputs),
    insights: insightsViewOf(inputs),
    hypotheses: hypothesesViewOf(inputs),
    notices: inputs.notices,
    available_actions: capabilitiesOf(inputs),
  };
}

/** Re-exported so a caller does not need `M6`'s module path to read `N_检索`'s shape. */
export type { RetrievalDerivationRecord };

/** Convenience: the `Insight` ids of one source record, in the read model's order. */
export function insightIdsOf(snapshot: D9WorkflowSnapshot): readonly ObjectId<'INS'>[] {
  return snapshot.insights.views.map((view) => view.insight.insight_id);
}
