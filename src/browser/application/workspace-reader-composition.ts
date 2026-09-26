/**
 * S01-06B ｜ `M15` browser composition root - the PROVIDER-INDEPENDENT WORKSPACE READ composition.
 *
 * ── THE PROBLEM THIS FILE SOLVES ─────────────────────────────────────────────────────
 * `composeBrowserWorkflow` requires an ALREADY COMPOSED provider, because the `D9` COMMAND chain
 * genuinely needs a model (`D-055` / `D-060`). But 「读取本地工作区」 does not: listing the records of a
 * chosen directory and opening one of them is a local file operation. Requiring a provider to browse
 * therefore made 「选择工作区」 and 「配置模型」 the same step, which the human decision `S01-06-D1`
 * rejected.
 *
 * 🔴 WHAT THIS FILE IS: the SECOND, read-only composition over one user-authorized workspace. It
 *    builds the repositories, the read services and the `M15` read layer, and NOTHING else.
 * 🔴 WHAT IT REFUSES TO BE: it constructs no provider, holds no `CredentialRef`, imports no adapter,
 *    no transport and no credential store, and has no way to run retrieval, generate an `Insight` or
 *    generate a `Hypothesis`. There is NO `FakeProvider` / `NullProvider` / placeholder adapter here -
 *    the point is DEPENDENCY DECOUPLING, not a fabricated provider. A reader that needed one would be
 *    the bug this file exists to remove.
 * 🔴 IT DOES NOT WEAKEN `composeBrowserWorkflow`: the command path still demands a legal provider,
 *    still holds ONE provider context and still resolves the path through `M12`/capability. The two
 *    compositions share the SAME injected `WorkspaceStorage`, so switching from browse to command
 *    never re-picks a directory and never re-imports data.
 * 🔴 THE BUSINESS RULES ARE NOT RE-DECLARED HERE: the capture state comes from `M4`'s
 *    provider-independent reader, the derivation from `M6`, the views from `M8`/`M9` read services
 *    and the snapshot from `M15`'s shared read layer. This file only WIRES them.
 *
 * Framework-neutral in its logic; it lives in `src/browser/**` because that is where the ONLY layer
 * allowed to know a runtime lives - it receives a concrete `WorkspaceStorage` from `M2`.
 */

import { createAttemptRepository } from '../../workspace/repository/attempt-repository.js';
import type { AttemptRepository } from '../../workspace/repository/attempt-repository.js';
import type { WorkspaceStorage } from '../../workspace/storage.js';
import { createRetrievalDerivationRepository } from '../../retrieval/compare/retrieval-derivation-repository.js';
import type { RetrievalDerivationRepository } from '../../retrieval/compare/retrieval-derivation-repository.js';
import { createCaptureStateReader } from '../../application/capture/capture-state-reader.js';
import type { CaptureStateReader } from '../../application/capture/capture-state-reader.js';
import { createInsightRepository } from '../../application/insight/insight-repository.js';
import type { InsightRepository } from '../../application/insight/insight-repository.js';
import { createInsightReadService } from '../../application/insight/insight-service.js';
import { createHypothesisRepository } from '../../application/hypothesis/hypothesis-repository.js';
import type { HypothesisRepository } from '../../application/hypothesis/hypothesis-repository.js';
import { createHypothesisReadService } from '../../application/hypothesis/hypothesis-service.js';
import { createWorkflowAttemptIndex } from '../../application/workflow/attempt-summaries.js';
import type { WorkflowAttemptIndex } from '../../application/workflow/attempt-summaries.js';
import { createWorkflowReadService } from '../../application/workflow/workspace-read.js';
import type { WorkflowReadService } from '../../application/workflow/workspace-read.js';
import type { WorkflowInternalDiagnostic } from '../../application/workflow/types.js';

/** Everything the read composition needs. 🔴 The storage is INJECTED - never opened here. */
export interface BrowserWorkspaceReaderInput {
  /** The user-authorized workspace. 🔴 Already opened by `M2`; this layer never opens one. */
  readonly storage: WorkspaceStorage;
  /** Injectable clock (ISO-8601) so fixtures stay deterministic. */
  readonly now?: () => string;
  /** Inject a diagnostics sink. 🔴 Never part of a view model. */
  readonly on_internal_error?: (diagnostic: WorkflowInternalDiagnostic) => void;
}

/**
 * Everything the provider-less browse exposes to the App Shell.
 *
 * 🔴 READ-ONLY BY SHAPE: there is no command on this object, so "browsing mutated a record" is not
 *    expressible and "a browse accidentally called a model" is not expressible either.
 */
export interface BrowserWorkspaceReader {
  readonly storage: WorkspaceStorage;
  readonly attempts: AttemptRepository;
  readonly derivations: RetrievalDerivationRepository;
  readonly insights: InsightRepository;
  readonly hypotheses: HypothesisRepository;
  readonly capture: CaptureStateReader;
  /** The single read model, over exactly the ports `D9WorkflowService` reads. */
  readonly reads: WorkflowReadService;
  /** The left rail's only read. */
  readonly index: WorkflowAttemptIndex;
  /**
   * 🔴 A BRAND-NEW reader over the SAME persisted storage - the browser-reload path. Because every
   *    read derives from persisted objects, the rebuilt reader returns consistent data with no
   *    persisted "browse state" anywhere.
   */
  reopen(): BrowserWorkspaceReader;
}

/**
 * Assembles the read-only half of `M15` over one workspace.
 *
 * 🔴 IT CANNOT FAIL WITH `unsupported`: there is no provider path to resolve and no capability to
 *    check. Either the storage is readable or a read throws a workspace error, which the read layer
 *    already converts into a safe notice.
 */
export function composeBrowserWorkspaceReader(
  input: BrowserWorkspaceReaderInput,
): BrowserWorkspaceReader {
  const storage = input.storage;
  const now = input.now;

  const open = (): BrowserWorkspaceReader => {
    const attempts = createAttemptRepository({
      storage,
      ...(now === undefined ? {} : { now }),
    });
    const derivations = createRetrievalDerivationRepository({ storage });
    const insights = createInsightRepository({ storage });
    const hypotheses = createHypothesisRepository({ storage });

    /*
     * 🔴 The SAME provider-independent read services the full workflow uses. Composing them without a
     *    provider is possible because they read only persisted objects and the `M6` derivation.
     */
    const insight_reads = createInsightReadService({ insights, attempts, derivations });
    const hypothesis_reads = createHypothesisReadService({ hypotheses, attempts, derivations });
    const capture = createCaptureStateReader({ repository: attempts });

    const reads = createWorkflowReadService({
      ports: {
        attempts,
        capture,
        retrieval: { readCurrentDerivation: (attempt_id) => derivations.readCurrent(attempt_id) },
        insights: {
          listInsightsBySourceAttempt: (attempt_id) =>
            insight_reads.listInsightsBySourceAttempt(attempt_id),
          listExperienceAssets: () => insight_reads.listExperienceAssets(),
          listGenerationBatches: (attempt_id) => insights.listBatchesBySourceAttempt(attempt_id),
          listStateEvents: (insight_id) => insights.listStateEventsByInsight(insight_id),
        },
        hypotheses: {
          listHypothesesBySourceAttempt: (attempt_id) =>
            hypothesis_reads.listHypothesesBySourceAttempt(attempt_id),
          listGenerationBatches: (attempt_id) =>
            hypotheses.listBatchesBySourceAttempt(attempt_id),
          traceHypothesis: (hypothesis_id) => hypothesis_reads.traceHypothesis(hypothesis_id),
        },
      },
      /*
       * 🔴 No step ⑥ observation exists on this path: a browse never ran retrieval, so the truthful
       *    state is `not_available` - which is NOT `N_检索 = 0` and NOT `HISTORY_EMPTY`.
       */
      ...(input.on_internal_error === undefined
        ? {}
        : { on_internal_error: input.on_internal_error }),
    });

    const index = createWorkflowAttemptIndex({
      listAttempts: () => attempts.listAttempts(),
    });

    return {
      storage,
      attempts,
      derivations,
      insights,
      hypotheses,
      capture,
      reads,
      index,
      reopen: open,
    };
  };

  return open();
}
