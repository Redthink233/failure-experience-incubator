/**
 * S01-06B ｜ `M15` the PROVIDER-INDEPENDENT read layer of the `D9` workspace.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────────────
 * 「这一个记录现在处于 `D9` 的哪一步、已经沉淀了什么」 is a question about the LOCAL WORKSPACE, not about a
 * model. It used to be reachable only through `createD9WorkflowService`, which the composition root
 * can only build once a provider has been composed - so a workspace could not be browsed at all
 * before a model was configured (the integration constraint registered in `S01-06` §16.6).
 *
 * 🔴 IT IS A MOVE, NOT A SECOND READ MODEL. `buildSnapshot` was EXTRACTED from `workflow-service.ts`
 *    and now lives here; the full `D9WorkflowService` delegates to it. That is what makes the two
 *    reading paths agree: same persisted workspace + same `attempt_id` ⇒ the same business data,
 *    because there is exactly ONE assembly of it.
 * 🔴 THE RULES STAY WHERE THEY OWNED THEM. This file READS `capture` state (`M4`), the CURRENT
 *    derivation (`M6`), the `Insight` views (`M8`) and the `Hypothesis` views (`M9`) through their
 *    published read ports. It re-implements none of the retrieval view rules, the Experience Asset
 *    rule, the batch-current rule, the `N_引用` derivation or the staleness rule.
 * 🔴 NOTHING HERE CAN REACH A MODEL: the ports are read-only by construction, and this module
 *    imports no adapter, no credential and no transport. It adds no `if (provider)` branch anywhere.
 *
 * The ONE thing it cannot derive by itself is the step ⑥ runtime failure, which is an OBSERVATION of
 * the service instance that ran ⑥ (it is never persisted - see `workflow-service.ts`). It is supplied
 * as an OPTIONAL callback, so the provider-less reader simply reports `not_available`.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O beyond the injected ports.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { InsightStateEvent } from '../../domain/types/insight.js';
import type { RetrievalRuntimeFailure } from '../../retrieval/compare/types.js';
import type { ExperienceRetrievalService } from '../../retrieval/compare/retrieval-service.js';
import type { AttemptRepository } from '../../workspace/repository/attempt-repository.js';
import type { AttemptCaptureService } from '../capture/capture-service.js';
import type { InsightService } from '../insight/types.js';
import type { HypothesisService } from '../hypothesis/types.js';
import type { HypothesisTraceView } from '../hypothesis/types.js';
import { buildWorkflowSnapshot } from './read-model.js';
import { noticeForThrownError, workflowNotice } from './errors.js';
import type {
  D9WorkflowSnapshot,
  WorkflowInternalDiagnostic,
  WorkflowNotice,
  WorkflowReadResult,
  WorkflowStepResult,
} from './types.js';

/**
 * The read-only view of the modules whose data the snapshot displays.
 *
 * 🔴 EVERY MEMBER IS A `Pick` OF A FROZEN INTERFACE, so this layer cannot drift from the modules it
 *    reads - and, being `Pick`s of read methods only, no command is reachable from here.
 */
export interface WorkflowReadPorts {
  readonly attempts: Pick<AttemptRepository, 'readAttempt'>;
  readonly capture: Pick<AttemptCaptureService, 'readCaptureState'>;
  readonly retrieval: Pick<ExperienceRetrievalService, 'readCurrentDerivation'>;
  readonly insights: Pick<
    InsightService,
    | 'listInsightsBySourceAttempt'
    | 'listExperienceAssets'
    | 'listGenerationBatches'
    | 'listStateEvents'
  >;
  readonly hypotheses: Pick<
    HypothesisService,
    'listHypothesesBySourceAttempt' | 'listGenerationBatches' | 'traceHypothesis'
  >;
}

export interface WorkflowReadService {
  /** The single read model, over the injected read-only ports. */
  readWorkflow(attempt_id: ObjectId<'ATT'>): Promise<WorkflowReadResult>;
  /**
   * Step ⑩ over EXISTING persisted data.
   *
   * 🔴 It is part of the READ layer because `M9` derives the trace and `N_引用` from the STORED
   *    reference set: no model is involved, and 「查看旧依据」 must therefore survive a workspace with no
   *    provider configured. The envelope (and its safe notice) is identical in both compositions,
   *    because both call THIS method.
   */
  traceHypothesis(
    hypothesis_id: ObjectId<'HYP'>,
  ): Promise<WorkflowStepResult<HypothesisTraceView | null>>;
}

export interface WorkflowReadServiceDeps {
  readonly ports: WorkflowReadPorts;
  /**
   * The step ⑥ runtime failure THIS orchestrator instance observed for one record, or `null`.
   *
   * 🔴 AN OBSERVATION, NOT BUSINESS STATE. `M6` deliberately writes nothing on a runtime failure, so
   *    there is nothing durable to read back and this layer must not invent a stored status field.
   *    A reader that never ran ⑥ returns `null`, which is a truthful description and is NOT
   *    `N_检索 = 0` and NOT `HISTORY_EMPTY`.
   */
  readonly retrieval_failure_of?: (attempt_id: ObjectId<'ATT'>) => RetrievalRuntimeFailure | null;
  /**
   * 🔴 The ONLY place a raw thrown value may go: an internal diagnostics sink.
   *    It is deliberately NOT a field of any view model.
   */
  readonly on_internal_error?: (diagnostic: WorkflowInternalDiagnostic) => void;
}

export function createWorkflowReadService(deps: WorkflowReadServiceDeps): WorkflowReadService {
  const { ports } = deps;
  const retrieval_failure_of =
    deps.retrieval_failure_of ?? ((): RetrievalRuntimeFailure | null => null);

  /**
   * Assembles the snapshot from REAL persisted objects.
   *
   * 🔴 `attempt === null` ⇒ `null` (the record does not exist); `capture === null` ⇒ `null` as well,
   *    because an `Attempt` always has an attached capture state - a missing one means the record is
   *    not (yet) readable as a `D9` record.
   */
  async function buildSnapshot(attempt_id: ObjectId<'ATT'>): Promise<D9WorkflowSnapshot | null> {
    const attempt = await ports.attempts.readAttempt(attempt_id);
    if (attempt === null) {
      return null;
    }
    const capture = await ports.capture.readCaptureState(attempt_id);
    if (capture === null) {
      return null;
    }
    const derivation = await ports.retrieval.readCurrentDerivation(attempt_id);
    const insight_views = await ports.insights.listInsightsBySourceAttempt(attempt_id);
    const insight_batches = await ports.insights.listGenerationBatches(attempt_id);
    const state_events: InsightStateEvent[] = [];
    for (const view of insight_views) {
      state_events.push(...(await ports.insights.listStateEvents(view.insight.insight_id)));
    }
    const experience_assets = await ports.insights.listExperienceAssets();
    const hypothesis_views = await ports.hypotheses.listHypothesesBySourceAttempt(attempt_id);
    const hypothesis_batches = await ports.hypotheses.listGenerationBatches(attempt_id);

    const runtime_failure = retrieval_failure_of(attempt_id);
    const notices: WorkflowNotice[] = [];
    if (runtime_failure !== null) {
      notices.push(
        workflowNotice('RETRIEVAL_RUNTIME_INCOMPLETE', { kind: 'rerun_retrieval', attempt_id }),
      );
    }

    return buildWorkflowSnapshot({
      attempt,
      capture,
      derivation,
      retrieval_runtime_failure: runtime_failure,
      insight_views,
      insight_batches,
      insight_state_events: state_events,
      experience_assets,
      hypothesis_views,
      hypothesis_batches,
      notices,
    });
  }

  async function readWorkflow(attempt_id: ObjectId<'ATT'>): Promise<WorkflowReadResult> {
    try {
      const snapshot = await buildSnapshot(attempt_id);
      return snapshot === null ? { kind: 'not_found' } : { kind: 'snapshot', snapshot };
    } catch (error) {
      /*
       * 🔴 The read is wrapped by the SAME boundary as a command. A `BrowserWorkspaceAccessError`
       *    thrown while listing `insights/` must not reach a caller as a raw exception: the caller gets
       *    a `RUNTIME` notice whose text is a fixed product sentence.
       */
      deps.on_internal_error?.({ stage: 'read-workflow', original_error: error });
      return { kind: 'unavailable', notice: noticeForThrownError(error) };
    }
  }

  async function traceHypothesis(
    hypothesis_id: ObjectId<'HYP'>,
  ): Promise<WorkflowStepResult<HypothesisTraceView | null>> {
    try {
      const trace = await ports.hypotheses.traceHypothesis(hypothesis_id);
      if (trace === null) {
        /*
         * 🔴 「这个方向不存在」 and 「这个方向没有引用任何历史」 are DIFFERENT statements, so `null` is
         *    reported as its own `GATE`-layer notice rather than as an empty trace.
         */
        return {
          kind: 'gate',
          layer: 'GATE',
          value: null,
          notice: workflowNotice('HYPOTHESIS_NOT_FOUND', null),
        };
      }
      return { kind: 'delegated', layer: 'OK', value: trace, notice: null };
    } catch (error) {
      deps.on_internal_error?.({ stage: 'trace-hypothesis', original_error: error });
      return {
        kind: 'runtime',
        layer: 'RUNTIME',
        value: null,
        notice: noticeForThrownError(error),
      };
    }
  }

  return { readWorkflow, traceHypothesis };
}

/*
 * 🔴 `noticeForThrownError` is the SAME safe-error mapping the command layer uses (imported above),
 *    so a failed READ and a failed COMMAND can never disagree about what the user is told.
 */

/** Re-exported so a caller can type a snapshot without importing the read-model module. */
export type { D9WorkflowSnapshot };
