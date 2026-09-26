/**
 * S01 ｜ `M15` browser composition root - the WORKFLOW composition.
 *
 * Layer position: `src/browser/application/**` sits ABOVE everything else and is the only module that
 * may instantiate a concrete adapter, a concrete storage or a credential store.
 *
 * Contract basis:
 *   - HANDOFF §4 (`M15` owns the composition root; the framework-neutral modules never build a
 *     concrete adapter themselves);
 *   - contract §0.4 A (a browser may only touch a user-authorized directory - so the storage is
 *     INJECTED, never opened here);
 *   - `D-059` (Local Workspace files; no database);
 *   - `D-055` / `D-060` (the two network shapes; the path is decided by capability, not by a user).
 *
 * ── THE ONE RULE THIS FILE ENFORCES ─────────────────────────────────────────────────
 * 🔴 It composes; it decides NOTHING about the product. Every service is built over the SAME injected
 *    `WorkspaceStorage`, so the whole graph shares one workspace and one set of identity spaces -
 *    there is no second retrieval, no second `EvidenceRef` constructor and no second state machine
 *    anywhere in the object graph.
 * 🔴 The storage is a PARAMETER. This file never calls a directory picker, never reads
 *    `window.showDirectoryPicker` and never reaches a filesystem: authorization happens in `M2`
 *    before this function is ever called.
 * 🔴 Recreating the composition over the same storage rebuilds an identical workflow, because the
 *    read model derives everything from persisted objects. That is how a browser reload recovers
 *    without any persisted "workflow state".
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { CredentialRef } from '../../ai/provider/credential.js';
import { createAttemptRepository } from '../../workspace/repository/attempt-repository.js';
import type { AttemptRepository } from '../../workspace/repository/attempt-repository.js';
import type { WorkspaceStorage } from '../../workspace/storage.js';
import { createRetrievalDerivationRepository } from '../../retrieval/compare/retrieval-derivation-repository.js';
import type { RetrievalDerivationRepository } from '../../retrieval/compare/retrieval-derivation-repository.js';
import { createExperienceRetrievalService } from '../../retrieval/compare/retrieval-service.js';
import type { ExperienceRetrievalService } from '../../retrieval/compare/retrieval-service.js';
import { createInsightRepository } from '../../application/insight/insight-repository.js';
import type { InsightRepository } from '../../application/insight/insight-repository.js';
import { createInsightService } from '../../application/insight/insight-service.js';
import type { InsightService } from '../../application/insight/types.js';
import { createHypothesisRepository } from '../../application/hypothesis/hypothesis-repository.js';
import type { HypothesisRepository } from '../../application/hypothesis/hypothesis-repository.js';
import { createHypothesisService } from '../../application/hypothesis/hypothesis-service.js';
import type { HypothesisService } from '../../application/hypothesis/types.js';
import { createAttemptCaptureService } from '../../application/capture/capture-service.js';
import type { AttemptCaptureService } from '../../application/capture/capture-service.js';
import { createD9WorkflowService } from '../../application/workflow/workflow-service.js';
import type { D9WorkflowService, WorkflowReadResult } from '../../application/workflow/types.js';
import { PROVIDER_CONNECTION_UNSUPPORTED } from './provider-composition.js';
import type { BrowserProviderComposition } from './provider-composition.js';

/** Everything the composition needs. 🔴 All of it is injected; nothing is discovered globally. */
export interface BrowserWorkflowCompositionInput {
  /** The user-authorized workspace. 🔴 Already opened by `M2`; this layer never opens one. */
  readonly storage: WorkspaceStorage;
  /** The composed provider (adapter + credential ref), or the explicit `unsupported` result. */
  readonly provider: BrowserProviderComposition;
  /** Injectable clock (ISO-8601) so fixtures stay deterministic. */
  readonly now?: () => string;
  readonly new_attempt_id?: () => ObjectId<'ATT'>;
  readonly new_insight_id?: () => ObjectId<'INS'>;
  readonly new_hypothesis_id?: () => ObjectId<'HYP'>;
  /** Inject a retrieval failure observation sink for diagnostics. Never part of a view model. */
  readonly on_internal_error?: (diagnostic: Readonly<{ stage: string; original_error: unknown }>) => void;
}

/** Everything the composed workflow exposes to the UI layer (S01-06). */
export interface BrowserWorkflowComposition {
  readonly workflow: D9WorkflowService;
  readonly storage: WorkspaceStorage;
  readonly credential_ref: CredentialRef;
  readonly attempts: AttemptRepository;
  readonly derivations: RetrievalDerivationRepository;
  readonly retrieval: ExperienceRetrievalService;
  readonly insights: InsightRepository;
  readonly hypotheses: HypothesisRepository;
  readonly capture: AttemptCaptureService;
  readonly insight_service: InsightService;
  readonly hypothesis_service: HypothesisService;
  /**
   * 🔴 A BRAND-NEW workflow over the SAME persisted storage.
   *
   * This is what a browser reload does: the object graph is rebuilt from scratch, and because the read
   * model derives everything from persisted objects the snapshot returns consistent - no stored
   * "current step" is needed, and none exists.
   */
  reopen(): BrowserWorkflowComposition;
  /** Convenience: the read model straight off the composed workflow. */
  readWorkflow(attempt_id: ObjectId<'ATT'>): Promise<WorkflowReadResult>;
}

/**
 * The result of composing the browser workflow.
 *
 * 🔴 `unsupported` is RETURNED, not thrown: "no reachable provider path" is a legitimate product state
 *    that must be shown explicitly (AC-150), not an infrastructure crash to be caught somewhere.
 */
export type BrowserWorkflowCompositionResult =
  | { readonly kind: 'composed'; readonly composition: BrowserWorkflowComposition }
  | {
      readonly kind: 'unsupported';
      readonly reason_code: typeof PROVIDER_CONNECTION_UNSUPPORTED;
      readonly message: string;
    };

/**
 * Assembles the whole `D9` chain over one workspace.
 *
 * 🔴 EVERY service shares the SAME provider adapter instance and the SAME `CredentialRef`, so "which
 *    provider is this workspace using" has exactly one answer in the object graph.
 */
export function composeBrowserWorkflow(
  input: BrowserWorkflowCompositionInput,
): BrowserWorkflowCompositionResult {
  if (input.provider.kind !== 'composed') {
    return {
      kind: 'unsupported',
      reason_code: input.provider.reason_code,
      message: input.provider.message,
    };
  }
  const adapter = input.provider.adapter;
  const credential_ref = input.provider.credential_ref;
  const storage = input.storage;
  const now = input.now;

  const open = (): BrowserWorkflowComposition => {
    const attempts = createAttemptRepository({
      storage,
      ...(now === undefined ? {} : { now }),
      ...(input.new_attempt_id === undefined ? {} : { newAttemptId: input.new_attempt_id }),
    });
    const derivations = createRetrievalDerivationRepository({ storage });
    const insights = createInsightRepository({ storage });
    const hypotheses = createHypothesisRepository({ storage });

    /** 🔴 ONE provider context, shared by every module that may call a model. */
    const provider = { adapter, credential_ref };

    const retrieval = createExperienceRetrievalService({
      repository: attempts,
      derivations,
      provider,
      ...(now === undefined ? {} : { now }),
    });
    const capture = createAttemptCaptureService({ repository: attempts, provider });
    const insight_service = createInsightService({
      insights,
      attempts,
      derivations,
      provider,
      ...(now === undefined ? {} : { now }),
      ...(input.new_insight_id === undefined ? {} : { newInsightId: input.new_insight_id }),
    });
    const hypothesis_service = createHypothesisService({
      hypotheses,
      attempts,
      derivations,
      insights: insight_service,
      provider,
      ...(now === undefined ? {} : { now }),
      ...(input.new_hypothesis_id === undefined ? {} : { newHypothesisId: input.new_hypothesis_id }),
    });

    const workflow = createD9WorkflowService({
      ports: {
        capture,
        retrieval,
        attempts,
        insights: insight_service,
        hypotheses: hypothesis_service,
      },
      ...(input.on_internal_error === undefined
        ? {}
        : { on_internal_error: input.on_internal_error }),
    });

    return {
      workflow,
      storage,
      credential_ref,
      attempts,
      derivations,
      retrieval,
      insights,
      hypotheses,
      capture,
      insight_service,
      hypothesis_service,
      reopen: open,
      readWorkflow: (attempt_id) => workflow.readWorkflow(attempt_id),
    };
  };

  return { kind: 'composed', composition: open() };
}
