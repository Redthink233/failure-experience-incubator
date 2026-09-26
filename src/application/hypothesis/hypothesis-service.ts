/**
 * S01 ｜ `M9` the Hypothesis service - `D9` steps ⑨ and ⑩.
 *
 * Contract: §2.3 (one id space, the decision slot), §2.4 / `D-051` (generation batches), §3.3 (the ⑩
 * list and `N_引用` share one set), §8.1 (object boundary), §8.2 (grounding bases / conditions /
 * binary outcome / two partitions), §8.3 (count + the three exits), §8.4 (`D-042` SAVE ≠ ACCEPT), §8.5
 * (the ONE conversion path), §8.6 (the edit boundary), §9 (⑨⑩ I/O), §9.2 (a silent zero output is
 * refused), §12 item 10 (no second reference system).
 * Decisions: `D-027` (the 8 items) / `D-028` (count + A/B/C) / `D-030` (⑨ does not wait for ⑧'s `E5`) /
 * `D-041` (never an `Experience Asset`) / `D-042` (the save slot) / `D-049` (`ADJ-01`) / `D-051`
 * (batches) / `TQ21` (an un-accepted candidate is marked as 「前序候选经验（未接受）」) / `TQ34`
 * (binary grounding).
 *
 * 🔴 WHAT THIS MODULE IS: the ONE explicit generation command of step ⑨, the ⑩ traceability of its
 *    output, the decision slot, the save slot and the Local Workspace persistence of all of it.
 * 🔴 WHAT IT IS NOT: no `D9` orchestration (`M15`), no UI (S01-06). It never re-runs retrieval (`M6`),
 *    never builds an `EvidenceRef` itself (`M7` owns that), never generates an `Insight` (`M8`) and
 *    never invents a second reference or count system.
 * 🔴 NO AUTOMATIC GENERATION ANYWHERE (`D-022`): nothing here listens to a timer, a file change, a page
 *    open, a `Formal` save or a step ⑧ acceptance. `generateHypotheses` is the ONLY generation entry
 *    point and it runs only when it is called.
 * 🔴 ⑨ DOES NOT WAIT FOR ⑧'s `E5` (`D-030`): an un-accepted `Insight` enters as a REASONING INPUT and
 *    never as evidence.
 * 🔴 EVERY decision change happens through `planDecisionTransition`, which CONSUMES the frozen decision
 *    vocabulary. `accepted` is reachable only by an explicit user accept.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O beyond the injected repositories.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import type { EvidenceRef } from '../../domain/types/evidence-ref.js';
import type { DecisionState, Hypothesis, HypothesisEditableItems, SourcePartition } from '../../domain/types/hypothesis.js';
import type { InferenceContentItem } from '../../domain/types/source-type.js';
import { decisionInferenceItem } from '../../domain/types/source-type.js';
import type { AttemptRepository } from '../../workspace/repository/attempt-repository.js';
import type { RetrievalDerivationRepository } from '../../retrieval/compare/retrieval-derivation-repository.js';
import type { RetrievalDerivationRecord } from '../../retrieval/compare/types.js';
import type { GroundingHistoricalAttempt } from '../../retrieval/grounding/catalog.js';
import { buildGroundingSourceCatalog } from '../../retrieval/grounding/catalog.js';
import type { GroundingSelection, GroundingSourceCatalog } from '../../retrieval/grounding/types.js';
import {
  buildHypothesisEvidence,
  deriveHypothesisEvidenceViews,
  evidenceLinesOf,
  evidenceOverviewOf,
  resolveHistoricalKeepRef,
} from './evidence.js';
import { buildEditableItems, decideAiCriterion, mergeUserEditableItems } from './editable-items.js';
import {
  absenceStatementForExitA,
  classifyExit,
  mislabelsExitAsEvidenceInsufficiency,
} from './exits.js';
import { evaluateGroundingStructurally, groundingVerdictOf } from './grounding.js';
import type { VerifiedSelection } from './grounding.js';
import type { HypothesisRepository } from './hypothesis-repository.js';
import { HypothesisRepositoryError } from './hypothesis-repository.js';
import { hypothesisOperationKey, newHypothesisBatchId, newHypothesisId } from './identity.js';
import {
  canAcceptHypothesis,
  canRejectHypothesis,
  initialDecisionState,
  planDecisionTransition,
  saveMeaningOf,
} from './lifecycle.js';
import { MODEL_SUGGESTION_ANNOTATION } from '../../domain/types/hypothesis.js';
import {
  hypothesisGenerationPromptMessages,
  hypothesisGroundingCheckPromptMessages,
  promptComparisonsOf,
  promptReasoningInputsOf,
  promptSourceAttemptOf,
  promptSourceCandidatesOf,
} from './prompts.js';
import type { HypothesisCheckEntryInput } from './prompts.js';
import {
  HYPOTHESIS_GENERATION_SCHEMA_ID,
  HYPOTHESIS_GROUNDING_CHECK_SCHEMA_ID,
  hypothesisGenerationJsonSchema,
  hypothesisGroundingCheckJsonSchema,
  readGroundingCheckPayload,
  readHypothesisGenerationPayload,
  structuredOutputRequest,
} from './schemas.js';
import {
  hypothesisItemPresence,
  HYPOTHESIS_EDITABLE_FIELD_KEYS,
  HYPOTHESIS_READ_ONLY_FIELD_KEYS,
} from './structure.js';
import { invokeHypothesisStructured } from './structured-invoke.js';
import type {
  AcceptHypothesisCommand,
  DecideHypothesisCriterionCommand,
  EditHypothesisCriteriaCommand,
  GenerateHypothesesCommand,
  GenerateHypothesesOutcome,
  GroundedHypothesisProposal,
  GroundingVerdict,
  HypothesisActionApplied,
  HypothesisActionOutcome,
  HypothesisActionRejection,
  HypothesisActionRejectionCode,
  HypothesisGenerationBatch,
  HypothesisGenerationRefusalCode,
  HypothesisIdCommand,
  HypothesisPayloadIssue,
  HypothesisProviderContext,
  HypothesisRecord,
  HypothesisService,
  HypothesisTraceView,
  HypothesisView,
  ModelSuggestionProposal,
  ReasoningInputRef,
  ReasoningInputInsightSource,
  RejectedProposal,
  SaveModelSuggestionCommand,
} from './types.js';
import { reasoningInputRef } from './types.js';
import { judgeCriteria } from './verifiability.js';

/* ------------------------------------------------------------------ *
 * 1. Dependencies
 * ------------------------------------------------------------------ */

export interface HypothesisServiceDeps {
  readonly hypotheses: HypothesisRepository;
  readonly attempts: AttemptRepository;
  /** The `M6` read model: the CURRENT Retrieval Derivation is the only evidence admission source. */
  readonly derivations: RetrievalDerivationRepository;
  /**
   * The `M8` `Insight` READ port.
   *
   * 🔴 Only the read model is consumed, so ⑨ can use an un-accepted candidate as a reasoning input and
   *    still never waits for `E5` (`D-030` / `TQ21`).
   */
  readonly insights: ReasoningInputInsightSource;
  readonly provider: HypothesisProviderContext;
  /** Injectable clock returning an ISO-8601 timestamp. */
  readonly now?: () => string;
  /** Injectable id generator (deterministic tests). */
  readonly newHypothesisId?: () => ObjectId<'HYP'>;
  readonly newBatchId?: (source_attempt_id: string) => string;
}

/** Records which `operation_id` a lifecycle action has already been applied for (replay safety). */
class OperationLedger {
  private readonly entries = new Map<string, unknown>();

  read<T>(operation_id: string): T | null {
    return this.entries.has(operation_id) ? (this.entries.get(operation_id) as T) : null;
  }

  write(operation_id: string, value: unknown): void {
    this.entries.set(operation_id, value);
  }
}

interface ReasoningInputs {
  readonly refs: readonly ReasoningInputRef[];
  readonly text_by_ref_id: Readonly<Record<string, string>>;
}

/* ------------------------------------------------------------------ *
 * 1b. The provider-independent READ service (S01-06B)
 * ------------------------------------------------------------------ */

/**
 * The half of `M9` that never touches a model.
 *
 * 🔴 WHY IT IS SEPARATE: 「这一个记录已经生成过什么待验证方向」 must be answerable from a local
 *    workspace with NO model configured (S01-06-D1). The view derivation below is pure - it reads the
 *    stored `Hypothesis`, the workspace's records and the CURRENT `M6` derivation - so it is
 *    extracted here and consumed by BOTH `createHypothesisService` and the provider-less workspace
 *    reader.
 * 🔴 IT IS THE SAME CODE, NOT A COPY: the service delegates to the object this factory returns, so
 *    `N_引用`, the ⑩ trace and the evidence overview cannot differ between the two reading paths.
 * 🔴 NOTHING HERE IS A SECOND `N_引用` DERIVATION: the count and the trace still come from `M7`
 *    alone (`deriveHypothesisEvidenceViews`).
 * 🔴 READING A `Model Suggestion` STILL NEEDS NO MODEL: it is a persisted record, and listing it
 *    never calls a provider.
 */
export interface HypothesisReadServiceDeps {
  readonly hypotheses: HypothesisRepository;
  readonly attempts: AttemptRepository;
  /** The `M6` read model: the CURRENT Retrieval Derivation is the only evidence admission source. */
  readonly derivations: RetrievalDerivationRepository;
}

export interface HypothesisReadService {
  /** Every record of the workspace with its attached content items, read FRESH. */
  historicalAttempts(): Promise<readonly GroundingHistoricalAttempt[]>;
  /** The read view of ONE already-read record. Exported so the lifecycle actions reuse it. */
  viewOf(record: HypothesisRecord): Promise<HypothesisView>;
  readHypothesis(hypothesis_id: ObjectId<'HYP'>): Promise<HypothesisView | null>;
  listHypothesesBySourceAttempt(
    source_attempt_id: ObjectId<'ATT'>,
  ): Promise<readonly HypothesisView[]>;
  /**
   * Step ⑩ on its own.
   *
   * 🔴 Provider-free by construction: the trace list and `N_引用` are derived from the STORED
   *    reference set, so 「查看旧依据」 never needs a model and never recomputes an existing reference.
   */
  traceHypothesis(hypothesis_id: ObjectId<'HYP'>): Promise<HypothesisTraceView | null>;
}

export function createHypothesisReadService(
  deps: HypothesisReadServiceDeps,
): HypothesisReadService {
  const { hypotheses, attempts, derivations } = deps;

  async function historicalAttempts(): Promise<readonly GroundingHistoricalAttempt[]> {
    const all = await attempts.listAttempts();
    const out: GroundingHistoricalAttempt[] = [];
    for (const attempt of all) {
      out.push({
        attempt,
        content_items: await attempts.readAttemptContentItems(attempt.attempt_id),
      });
    }
    return out;
  }

  /**
   * Builds the read view.
   *
   * 🔴 `N_引用`, the ⑩ list and the evidence overview are DERIVED on every read from the stored
   *    reference set, so a second drifting copy of the count cannot exist (§26).
   */
  async function viewOf(record: HypothesisRecord): Promise<HypothesisView> {
    const hypothesis = record.hypothesis;
    const historical = await historicalAttempts();
    const derivation = (await derivations.readCurrent(hypothesis.attempt_id)) ?? undefined;
    const views = deriveHypothesisEvidenceViews(
      hypothesis.hypothesis_id,
      hypothesis.evidence_refs,
      historical,
      derivation,
    );
    /*
     * 🔴 DERIVED ON READ, not trusted from the document: which partitions are present is a function of
     *    the content, so a stored copy could never disagree with what the reader sees (§8.2 rule 2).
     */
    const source_partitions = sourcePartitionsFor(
      hypothesis.kind,
      hypothesis.editable_items,
      record.kept_condition_recommendations,
    );
    return {
      hypothesis,
      item_presence: hypothesisItemPresence(hypothesis),
      read_only_field_keys: HYPOTHESIS_READ_ONLY_FIELD_KEYS,
      editable_field_keys: HYPOTHESIS_EDITABLE_FIELD_KEYS,
      kept_condition_recommendations: record.kept_condition_recommendations,
      reasoning_input_refs: record.reasoning_input_refs,
      model_prior_notice: record.model_prior_notice,
      citation: views.citation,
      traceability: views.traceability,
      evidence_overview: evidenceOverviewOf({
        citation: views.citation,
        refs: hypothesis.evidence_refs,
        ...(derivation === undefined ? {} : { uncompared_dimensions: derivation.uncompared_dimensions }),
      }),
      save_meaning: saveMeaningOf({
        kind: hypothesis.kind,
        saved: hypothesis.saved,
        decision_state: hypothesis.decision_state,
      }),
      is_saved_but_undecided:
        hypothesis.saved === true && hypothesis.decision_state === 'undecided',
      source_partitions,
      can_accept: canAcceptHypothesis(hypothesis.decision_state),
      can_reject: canRejectHypothesis(hypothesis.decision_state),
      /* 🔴 A Hypothesis NEVER becomes an Experience Asset, in any state (§8.5 / AC-41). */
      is_experience_asset: false,
    };
  }

  return {
    historicalAttempts,
    viewOf,

    async readHypothesis(hypothesis_id: ObjectId<'HYP'>): Promise<HypothesisView | null> {
      const record = await hypotheses.readById(hypothesis_id);
      return record === null ? null : viewOf(record);
    },

    async listHypothesesBySourceAttempt(
      source_attempt_id: ObjectId<'ATT'>,
    ): Promise<readonly HypothesisView[]> {
      const records = await hypotheses.listBySourceAttempt(source_attempt_id);
      const views: HypothesisView[] = [];
      for (const record of records) {
        views.push(await viewOf(record));
      }
      return views;
    },

    async traceHypothesis(hypothesis_id: ObjectId<'HYP'>): Promise<HypothesisTraceView | null> {
      const record = await hypotheses.readById(hypothesis_id);
      if (record === null) {
        return null;
      }
      /* 🔴 ONE set → both views, so the count and the trace list can never disagree (§3.3). */
      const historical = await historicalAttempts();
      const views = deriveHypothesisEvidenceViews(
        hypothesis_id,
        record.hypothesis.evidence_refs,
        historical,
        (await derivations.readCurrent(record.hypothesis.attempt_id)) ?? undefined,
      );
      return {
        owner_id: hypothesis_id,
        kind: record.hypothesis.kind,
        citation: views.citation,
        traceability: views.traceability,
        model_suggestion_has_no_trace:
          record.hypothesis.kind === 'model' &&
          record.hypothesis.evidence_refs.length === 0 &&
          views.citation.n_citation === 0,
      };
    },
  };
}

/* ------------------------------------------------------------------ *
 * 2. Service
 * ------------------------------------------------------------------ */

export function createHypothesisService(deps: HypothesisServiceDeps): HypothesisService {
  const { hypotheses, attempts, derivations, insights, provider } = deps;
  const now = deps.now ?? ((): string => new Date().toISOString());
  const mintHypothesisId = deps.newHypothesisId ?? newHypothesisId;
  const newBatchId = deps.newBatchId ?? newHypothesisBatchId;
  const ledger = new OperationLedger();

  /* 🔴 ONE read implementation, shared with the provider-less reader (S01-06B). */
  const reads = createHypothesisReadService({ hypotheses, attempts, derivations });
  const readHistorical = () => reads.historicalAttempts();
  const viewOf = (record: HypothesisRecord) => reads.viewOf(record);

  /**
   * The reasoning-only inputs of a step ⑨ generation (§24 / `TQ21`).
   *
   * 🔴 `TQ21`: an un-accepted prior candidate is marked as 「前序候选经验（未接受）」 in its own label,
   *    so it can never be read as an accepted experience.
   * 🔴 A `rejected` prior `Insight` is NOT offered: the user already refused that direction.
   */
  async function buildReasoningInputs(
    source_attempt_id: ObjectId<'ATT'>,
    derivation: RetrievalDerivationRecord | null,
  ): Promise<ReasoningInputs> {
    const refs: ReasoningInputRef[] = [];
    const text_by_ref_id: Record<string, string> = {};

    for (const view of await insights.listInsightsBySourceAttempt(source_attempt_id)) {
      const state = view.insight.state;
      if (state === 'rejected') {
        continue;
      }
      const kind = state === 'accepted' ? 'accepted_insight' : 'candidate_insight_not_accepted';
      refs.push(
        reasoningInputRef({
          kind,
          ref_id: view.insight.insight_id,
          source_attempt_id,
        }),
      );
      text_by_ref_id[view.insight.insight_id] =
        `${view.insight.proposition}｜适用范围：${view.insight.applicable_scope}`;
    }

    for (const record of await hypotheses.listBySourceAttempt(source_attempt_id)) {
      if (record.hypothesis.kind !== 'model' || record.hypothesis.saved !== true) {
        continue;
      }
      refs.push(
        reasoningInputRef({
          kind: 'saved_model_suggestion',
          ref_id: record.hypothesis.hypothesis_id,
          source_attempt_id,
        }),
      );
      text_by_ref_id[record.hypothesis.hypothesis_id] =
        record.hypothesis.core.hypothesis_statement;
    }

    if (derivation !== null) {
      refs.push(
        reasoningInputRef({
          kind: 'retrieval_derivation',
          ref_id: derivation.derivation_id,
          source_attempt_id,
        }),
      );
    }
    return { refs, text_by_ref_id };
  }

  /*
   * The view builder lives in `createHypothesisReadService` (S01-06B) and is reached through the
   * `viewOf` local binding above - there is exactly ONE derivation of `N_引用`, of the ⑩ trace and
   * of the evidence overview in this module.
   */

  function actionRejection(
    code: HypothesisActionRejectionCode,
    detail: string,
    record: HypothesisRecord | null,
    retryable = false,
  ): HypothesisActionRejection {
    return {
      kind: 'rejected',
      code,
      detail,
      hypothesis: record?.hypothesis ?? null,
      retryable,
    };
  }

  function generationRefusal(
    code: HypothesisGenerationRefusalCode,
    detail: string,
    options: {
      readonly issues?: readonly HypothesisPayloadIssue[];
      readonly retryable?: boolean;
    } = {},
  ): GenerateHypothesesOutcome {
    return {
      kind: 'refused',
      code,
      detail,
      rejections: [],
      issues: options.issues ?? [],
      retryable: options.retryable ?? false,
    };
  }

  /* ---------------------------------------------------------------- *
   * Generation
   * ---------------------------------------------------------------- */

  /** Writes a materialised plan. Idempotent, so it doubles as the RECOVERY routine (§36). */
  async function applyPlan(plan: {
    readonly anchor_key: string;
    readonly operation_id: string;
    readonly source_attempt_id: ObjectId<'ATT'>;
    readonly batch_id: string;
    readonly records: readonly HypothesisRecord[];
    readonly batch: HypothesisGenerationBatch;
    readonly created_at: string;
  }): Promise<void> {
    /*
     * ① THE ANCHOR FIRST. It carries the COMPLETE plan in one document, so an interruption at any
     *    later step is recoverable by replaying the same `operation_id`.
     */
    await hypotheses.writeOperationAnchor({
      operation_key: plan.anchor_key,
      operation_id: plan.operation_id,
      source_attempt_id: plan.source_attempt_id,
      batch_id: plan.batch_id,
      status: 'in_progress',
      planned_records: plan.records,
      planned_batch: plan.batch,
      created_at: plan.created_at,
    });
    /* ② every hypothesis file, by id - a replay re-applies the identical document. */
    for (const record of plan.records) {
      await hypotheses.createIfAbsent(record);
    }
    /* ③ the batch record - the idempotency anchor of a generation. */
    await hypotheses.recordBatchIfAbsent(plan.batch);
    /* ④ ONLY NOW is the operation complete. */
    await hypotheses.writeOperationAnchor({
      operation_key: plan.anchor_key,
      operation_id: plan.operation_id,
      source_attempt_id: plan.source_attempt_id,
      batch_id: plan.batch_id,
      status: 'complete',
      planned_records: plan.records,
      planned_batch: plan.batch,
      created_at: plan.created_at,
    });
  }

  /** Materialises an outcome from a stored/planned batch without re-asking a model. */
  async function outcomeFromBatch(
    batch: HypothesisGenerationBatch,
    idempotent_replay: boolean,
  ): Promise<GenerateHypothesesOutcome> {
    const grounded: Hypothesis[] = [];
    for (const id of batch.hypothesis_ids) {
      const record = await hypotheses.readById(id);
      if (record !== null) {
        grounded.push(record.hypothesis);
      }
    }
    const model_suggestions: Hypothesis[] = [];
    for (const id of batch.model_suggestion_ids) {
      const record = await hypotheses.readById(id);
      if (record !== null) {
        model_suggestions.push(record.hypothesis);
      }
    }
    if (grounded.length > 0) {
      return {
        kind: 'generated',
        batch,
        hypotheses: grounded,
        model_suggestions,
        rejected_proposals: [],
        idempotent_replay,
      };
    }
    return {
      kind: 'zero_output',
      batch,
      exit_route: batch.exit_route ?? 'EXIT-A',
      absence_statement: batch.absence_statement ?? '',
      model_suggestions,
      rejected_proposals: [],
      idempotent_replay,
    };
  }

  async function runGeneration(
    command: GenerateHypothesesCommand,
    explicit_regeneration: boolean,
  ): Promise<GenerateHypothesesOutcome> {
    const source_attempt = await attempts.readAttempt(command.source_attempt_id);
    if (source_attempt === null) {
      return generationRefusal(
        'SOURCE_ATTEMPT_NOT_FOUND',
        `No Attempt exists for "${command.source_attempt_id}".`,
      );
    }

    const anchor_key = hypothesisOperationKey(command.source_attempt_id, command.operation_id);

    /* (1) CRASH RECOVERY (§36): an interrupted operation is COMPLETED, never restarted. */
    const anchor = await hypotheses.readOperationAnchor(anchor_key);
    if (anchor !== null) {
      if (anchor.source_attempt_id !== command.source_attempt_id) {
        return generationRefusal(
          'OPERATION_ID_CONFLICT',
          `The operation id "${command.operation_id}" was already used for "${anchor.source_attempt_id}".`,
        );
      }
      try {
        await applyPlan({
          anchor_key,
          operation_id: anchor.operation_id,
          source_attempt_id: anchor.source_attempt_id,
          batch_id: anchor.batch_id,
          records: anchor.planned_records,
          batch: anchor.planned_batch,
          created_at: anchor.created_at,
        });
      } catch (error) {
        return generationRefusal(
          'PERSISTENCE_RECOVERY_BLOCKED',
          `The durable operation anchor of "${command.operation_id}" could not be replayed: ${
            error instanceof Error ? error.message : String(error)
          }`,
          { retryable: true },
        );
      }
      return outcomeFromBatch(anchor.planned_batch, true);
    }

    /* (2) Idempotency by batch lookup - the same operation never produces a second batch (§35). */
    const replay_batch = await hypotheses.findBatchByOperationId(command.operation_id);
    if (replay_batch !== null) {
      if (replay_batch.source_attempt_id !== command.source_attempt_id) {
        return generationRefusal(
          'OPERATION_ID_CONFLICT',
          `The operation id "${command.operation_id}" was already used for "${replay_batch.source_attempt_id}".`,
        );
      }
      return outcomeFromBatch(replay_batch, true);
    }

    /* (3) A second generation must be EXPLICIT (§34). */
    if (!explicit_regeneration) {
      const existing = await hypotheses.listBatchesBySourceAttempt(command.source_attempt_id);
      if (existing.length > 0) {
        return generationRefusal(
          'REGENERATION_REQUIRED',
          'This record already has a step ⑨ generation result; another generation只有用户显式发起重新生成时才会执行（D-051）。',
        );
      }
    }

    /* (4) The current M6 derivation is the only evidence admission source; N_检索 is its first gate. */
    const derivation = await derivations.readCurrent(command.source_attempt_id);
    const historical = await readHistorical();
    const catalog: GroundingSourceCatalog | null =
      derivation === null
        ? null
        : buildGroundingSourceCatalog({
            source_attempt_id: command.source_attempt_id,
            derivation,
            historical_attempts: historical,
          });
    const n_retrieval = derivation?.n_retrieval ?? 0;
    const grounding_possible = catalog !== null && catalog.candidates.length > 0;
    const uncompared = derivation?.uncompared_dimensions ?? [];
    const reasoning = await buildReasoningInputs(command.source_attempt_id, derivation);

    /* (5) The first constrained AI call of step ⑨. */
    const request = {
      provider_id: provider.adapter.provider_id,
      model: provider.adapter.config.model,
      messages: hypothesisGenerationPromptMessages({
        source_attempt: promptSourceAttemptOf(source_attempt),
        n_retrieval,
        grounding_possible,
        uncompared_dimensions: uncompared,
        comparisons: derivation === null ? [] : promptComparisonsOf(derivation),
        source_catalog: catalog === null ? [] : promptSourceCandidatesOf(catalog),
        reasoning_inputs: promptReasoningInputsOf(reasoning.refs, reasoning.text_by_ref_id),
      }),
      structured_output: structuredOutputRequest(
        HYPOTHESIS_GENERATION_SCHEMA_ID,
        hypothesisGenerationJsonSchema,
      ),
    };
    const invoked = await invokeHypothesisStructured({
      adapter: provider.adapter,
      credential_ref: provider.credential_ref,
      request,
      structured_output: request.structured_output,
    });
    if (invoked.kind === 'runtime_failure') {
      return invoked;
    }
    const read = readHypothesisGenerationPayload(invoked.value, { grounding_possible });
    if (read.kind === 'issue') {
      return generationRefusal(
        'AI_PROPOSAL_REJECTED',
        'The step ⑨ answer was refused as a whole; nothing was persisted. ' +
          read.issues.map((issue) => `${issue.code}@${issue.path === '' ? 'root' : issue.path}`).join(', '),
        { issues: read.issues, retryable: true },
      );
    }
    const proposal = read.payload;

    /* (6) Structural grounding pass + `M7` evidence construction. */
    const rejected: RejectedProposal[] = [];
    const candidates: {
      readonly index: number;
      readonly proposal: GroundedHypothesisProposal;
      readonly hypothesis_id: ObjectId<'HYP'>;
      readonly evidence_refs: readonly EvidenceRef[];
      readonly expected_n_citation: number;
      readonly cited_target_ids: readonly ObjectId<'ATT'>[];
      readonly structural: ReturnType<typeof evaluateGroundingStructurally>;
      readonly kept: readonly { readonly attempt_id: ObjectId<'ATT'>; readonly source_field_path: string }[];
      readonly recommendations: readonly InferenceContentItem[];
    }[] = [];

    for (const [index, entry] of proposal.grounded.entries()) {
      const structural = evaluateGroundingStructurally(
        entry,
        { catalog: catalog as GroundingSourceCatalog, historical_attempts: historical, n_retrieval },
      );
      if (!structural.requires_semantic_check) {
        rejected.push({
          index,
          hypothesis_id: null,
          stage: 'grounding',
          conditions: structural.conditions_hit,
          detail: structural.detail,
        });
        continue;
      }

      /*
       * ⑤: a `historical_ref` keep must resolve to a condition the history really recorded
       * (§8.6 rule 7 / §15 / K1-K5). A reference that does not resolve is refused instead of being
       * silently dropped, because 「保持不变」 without a recorded value is exactly what K5 forbids.
       */
      const kept: { readonly attempt_id: ObjectId<'ATT'>; readonly source_field_path: string }[] = [];
      const recommendations: InferenceContentItem[] = [];
      let keep_failed = false;
      if (entry.keep !== null) {
        if (entry.keep.kind === 'historical_ref') {
          const resolution = resolveHistoricalKeepRef({
            target_id: entry.keep.target_id,
            source_field_path: entry.keep.source_field_path,
            catalog,
            historical_attempts: historical,
          });
          if (!resolution.ok) {
            rejected.push({
              index,
              hypothesis_id: null,
              stage: 'structure',
              conditions: [resolution.condition],
              detail: resolution.detail,
            });
            keep_failed = true;
          } else {
            kept.push(resolution.ref);
          }
        } else {
          recommendations.push(
            decisionInferenceItem(
              `${String(index)}:keep:recommendation`,
              entry.keep.text,
              'unresolved',
            ),
          );
        }
      }
      if (keep_failed) {
        continue;
      }

      const hypothesis_id = mintHypothesisId();
      const built = buildHypothesisEvidence({
        hypothesis_id,
        selections: structural.verified.map(
          (verified: VerifiedSelection): GroundingSelection => verified.selection,
        ),
        derivation: derivation as RetrievalDerivationRecord,
        historical_attempts: historical,
        created_at: now(),
      });
      if (built.kind === 'refused') {
        /*
         * 🔴 FAIL-CLOSED: a selection `M7` refused means the model proposed something illegal, so the
         *    WHOLE generation is refused and NOTHING is written.
         */
        return {
          kind: 'refused',
          code: 'EVIDENCE_SELECTION_REFUSED',
          detail: `M7 refused a proposed reference for one History-grounded Hypothesis: ${built.detail}`,
          rejections: built.rejections,
          issues: [],
          retryable: true,
        };
      }
      const views = deriveHypothesisEvidenceViews(hypothesis_id, built.evidence_refs, historical);
      if (views.citation.n_citation < 1) {
        rejected.push({
          index,
          hypothesis_id,
          stage: 'grounding',
          conditions: ['N1'],
          detail:
            'The references of this hypothesis take part in no counted role, so its own N_引用 would be 0; a History-grounded Hypothesis must be individually traceable (§8.2 / §10).',
        });
        continue;
      }

      candidates.push({
        index,
        proposal: entry,
        hypothesis_id,
        evidence_refs: built.evidence_refs,
        expected_n_citation: views.citation.n_citation,
        cited_target_ids: views.citation.counted_target_ids,
        structural,
        kept,
        recommendations,
      });
    }

    /* (7) The SECOND, INDEPENDENT discrete AI call: `N3` / `N4` and the ⑦⑧ observability. */
    const verdicts = new Map<string, GroundingVerdict>();
    const criteria_by_id = new Map<
      string,
      { readonly checked: 'observable_and_exclusive' | 'not_observable_or_not_exclusive' | null; readonly reason: string | null }
    >();

    if (candidates.length > 0) {
      const entries: HypothesisCheckEntryInput[] = candidates.map((candidate) => ({
        hypothesis_id: candidate.hypothesis_id,
        hypothesis_statement: candidate.proposal.hypothesis_statement,
        rationale: candidate.proposal.rationale,
        next_change: candidate.proposal.next_change,
        support_criterion: candidate.proposal.support_criterion,
        refutation_criterion: candidate.proposal.refutation_criterion,
        evidence: evidenceLinesOf(candidate.evidence_refs, historical),
      }));
      const check_request = {
        provider_id: provider.adapter.provider_id,
        model: provider.adapter.config.model,
        messages: hypothesisGroundingCheckPromptMessages(entries),
        structured_output: structuredOutputRequest(
          HYPOTHESIS_GROUNDING_CHECK_SCHEMA_ID,
          hypothesisGroundingCheckJsonSchema,
        ),
      };
      const check_invoked = await invokeHypothesisStructured({
        adapter: provider.adapter,
        credential_ref: provider.credential_ref,
        request: check_request,
        structured_output: check_request.structured_output,
      });
      if (check_invoked.kind === 'runtime_failure') {
        return check_invoked;
      }
      const check_read = readGroundingCheckPayload(
        check_invoked.value,
        candidates.map((candidate) => candidate.hypothesis_id),
      );
      if (check_read.kind === 'issue') {
        return generationRefusal(
          'AI_PROPOSAL_REJECTED',
          'The independent grounding check was refused; nothing was persisted. ' +
            check_read.issues
              .map((issue) => `${issue.code}@${issue.path === '' ? 'root' : issue.path}`)
              .join(', '),
          { issues: check_read.issues, retryable: true },
        );
      }
      for (const candidate of candidates) {
        const answer = check_read.payload.checks.find(
          (check) => check.hypothesis_id === candidate.hypothesis_id,
        );
        if (answer === undefined) {
          /*
           * 🔴 AN ABSENT VERDICT IS NOT A PASS: the check never confirmed this hypothesis, so the
           *    semantic half stays unproven and the hypothesis may not be grounded (§8.2).
           */
          verdicts.set(
            candidate.hypothesis_id,
            groundingVerdictOf({
              bases_hit: candidate.structural.bases_hit,
              conditions_hit: ['N3'],
              has_traceable_reference: true,
              semantic_source: 'none',
              reason:
                'The independent check returned no verdict for this hypothesis, so its semantic half was never confirmed.',
            }),
          );
          criteria_by_id.set(candidate.hypothesis_id, { checked: null, reason: null });
          continue;
        }
        criteria_by_id.set(candidate.hypothesis_id, {
          checked:
            answer.criteria_check === 'observable_and_exclusive'
              ? 'observable_and_exclusive'
              : 'not_observable_or_not_exclusive',
          reason: answer.criteria_reason,
        });
        if (answer.grounding_check === 'grounded') {
          verdicts.set(
            candidate.hypothesis_id,
            groundingVerdictOf({
              bases_hit: candidate.structural.bases_hit,
              conditions_hit: [],
              has_traceable_reference: true,
              semantic_source: 'discrete_ai_check',
              reason: answer.grounding_reason,
            }),
          );
          continue;
        }
        const condition = answer.condition === 'N4' ? 'N4' : 'N3';
        verdicts.set(
          candidate.hypothesis_id,
          groundingVerdictOf({
            bases_hit: candidate.structural.bases_hit,
            conditions_hit: [condition],
            has_traceable_reference: true,
            semantic_source: 'discrete_ai_check',
            reason: answer.grounding_reason,
          }),
        );
      }
    }

    /* (8) Admit only what is BOTH grounded and verifiable. */
    const admitted: typeof candidates = [];
    let grounding_passed = 0;
    for (const candidate of candidates) {
      const verdict = verdicts.get(candidate.hypothesis_id);
      if (verdict === undefined || verdict.verdict !== 'grounded') {
        rejected.push({
          index: candidate.index,
          hypothesis_id: candidate.hypothesis_id,
          stage: 'grounding',
          conditions: verdict?.conditions_hit ?? ['N3'],
          detail: verdict?.reason ?? 'The semantic half of the grounding judgement never ran.',
        });
        continue;
      }
      grounding_passed += 1;
      const criteria = judgeCriteria({
        support_criterion: candidate.proposal.support_criterion,
        refutation_criterion: candidate.proposal.refutation_criterion,
        checked: criteria_by_id.get(candidate.hypothesis_id)?.checked ?? null,
        checked_reason: criteria_by_id.get(candidate.hypothesis_id)?.reason ?? null,
      });
      if (criteria.verdict !== 'verifiable') {
        rejected.push({
          index: candidate.index,
          hypothesis_id: candidate.hypothesis_id,
          stage: 'verifiability',
          conditions: [],
          detail: criteria.detail,
        });
        continue;
      }
      admitted.push(candidate);
    }

    const exit = classifyExit({
      n_retrieval,
      derivation_status: derivation?.status ?? null,
      grounding_possible,
      grounded_proposal_count: proposal.grounded.length,
      grounding_passed,
      verifiable_passed: admitted.length,
      claimed_route: proposal.exit_route === 'NONE' ? null : proposal.exit_route,
    });

    /* (9) Materialise the records. */
    const created_at = now();
    const batch_id = newBatchId(command.source_attempt_id);
    const records: HypothesisRecord[] = [];
    const grounded_ids: ObjectId<'HYP'>[] = [];

    for (const candidate of admitted) {
      const editable_items = buildEditableItems({
        hypothesis_id: candidate.hypothesis_id,
        observation_metric: candidate.proposal.observation_metric,
        support_criterion: candidate.proposal.support_criterion,
        refutation_criterion: candidate.proposal.refutation_criterion,
      });
      records.push({
        hypothesis: {
          hypothesis_id: candidate.hypothesis_id,
          attempt_id: command.source_attempt_id,
          kind: 'grounded',
          /* 🔴 ALWAYS `undecided` on generation; nothing auto-accepts (§22 / D-051). */
          decision_state: initialDecisionState(),
          /* 🔴 No save slot exists for a grounded hypothesis (§2.3). */
          saved: null,
          core: {
            hypothesis_statement: candidate.proposal.hypothesis_statement,
            rationale: candidate.proposal.rationale,
            referenced_attempt_ids: candidate.cited_target_ids,
            next_change: candidate.proposal.next_change,
            kept_conditions: candidate.kept,
          },
          editable_items,
          evidence_refs: candidate.evidence_refs,
          source_partitions: sourcePartitionsFor('grounded', editable_items, candidate.recommendations),
          generation_batch: batch_id,
          created_at,
          updated_at: created_at,
        },
        kept_condition_recommendations: candidate.recommendations,
        reasoning_input_refs: reasoning.refs,
        model_prior_notice: null,
      });
      grounded_ids.push(candidate.hypothesis_id);
    }

    const model_suggestion_ids: ObjectId<'HYP'>[] = [];
    for (const [index, entry] of proposal.model_suggestions.entries()) {
      const model_id = mintHypothesisId();
      const editable_items = buildEditableItems({
        hypothesis_id: model_id,
        observation_metric: entry.observation_metric,
        support_criterion: entry.support_criterion,
        refutation_criterion: entry.refutation_criterion,
      });
      const recommendations: InferenceContentItem[] =
        entry.keep !== null && entry.keep.kind === 'model_recommendation'
          ? [decisionInferenceItem(`${model_id}:keep:recommendation`, entry.keep.text, 'unresolved')]
          : [];
      records.push(buildModelSuggestionRecord({
        model_id,
        entry,
        editable_items,
        recommendations,
        reasoning: reasoning.refs,
        source_attempt_id: command.source_attempt_id,
        batch_id,
        created_at,
        index,
      }));
      model_suggestion_ids.push(model_id);
    }

    const batch: HypothesisGenerationBatch = {
      batch_id,
      source_attempt_id: command.source_attempt_id,
      operation_id: command.operation_id,
      hypothesis_ids: grounded_ids,
      model_suggestion_ids,
      exit_route: grounded_ids.length > 0 ? null : exit.route,
      absence_statement: grounded_ids.length > 0 ? null : exit.absence_statement,
      created_at,
    };

    if (batch.exit_route !== null && batch.absence_statement !== null) {
      if (mislabelsExitAsEvidenceInsufficiency(batch.exit_route, batch.absence_statement)) {
        /* A structural defect in OUR OWN wording would misreport the reason; refuse rather than ship it. */
        return generationRefusal(
          'AI_PROPOSAL_REJECTED',
          `The EXIT-${batch.exit_route.slice(-1)} explanation must not be presented as 「历史证据不足」 (§9.2).`,
          { retryable: false },
        );
      }
    }

    await applyPlan({
      anchor_key,
      operation_id: command.operation_id,
      source_attempt_id: command.source_attempt_id,
      batch_id,
      records,
      batch,
      created_at,
    });

    const grounded: Hypothesis[] = [];
    for (const id of grounded_ids) {
      const record = await hypotheses.readById(id);
      if (record !== null) {
        grounded.push(record.hypothesis);
      }
    }
    const model_suggestions: Hypothesis[] = [];
    for (const id of model_suggestion_ids) {
      const record = await hypotheses.readById(id);
      if (record !== null) {
        model_suggestions.push(record.hypothesis);
      }
    }

    if (grounded_ids.length > 0) {
      return {
        kind: 'generated',
        batch,
        hypotheses: grounded,
        model_suggestions,
        rejected_proposals: rejected,
        idempotent_replay: false,
      };
    }
    return {
      kind: 'zero_output',
      batch,
      exit_route: batch.exit_route ?? exit.route ?? 'EXIT-A',
      absence_statement: batch.absence_statement ?? absenceStatementForExitA({
        n_retrieval,
        derivation_status: derivation?.status ?? null,
        grounding_possible,
      }),
      model_suggestions,
      rejected_proposals: rejected,
      idempotent_replay: false,
    };
  }

  function buildModelSuggestionRecord(input: {
    readonly model_id: ObjectId<'HYP'>;
    readonly entry: ModelSuggestionProposal;
    readonly editable_items: HypothesisEditableItems;
    readonly recommendations: readonly InferenceContentItem[];
    readonly reasoning: readonly ReasoningInputRef[];
    readonly source_attempt_id: ObjectId<'ATT'>;
    readonly batch_id: string;
    readonly created_at: string;
    readonly index: number;
  }): HypothesisRecord {
    return {
      hypothesis: {
        hypothesis_id: input.model_id,
        attempt_id: input.source_attempt_id,
        kind: 'model',
        decision_state: initialDecisionState(),
        /*
         * 🔴 `false` - and that is NOT 「用户已保存」. `false` means the workspace retained a generation
         *    result the user has not saved, and the read model says exactly that (§33 / D-042).
         */
        saved: false,
        core: {
          hypothesis_statement: input.entry.hypothesis_statement,
          rationale: input.entry.rationale,
          /* 🔴 ③ is EMPTY: a Model Suggestion never fabricates a historical basis (§20). */
          referenced_attempt_ids: [],
          next_change: input.entry.next_change,
          kept_conditions: [],
        },
        editable_items: input.editable_items,
        /* 🔴 No EvidenceRef, ever: `N_引用 = 0` and ⑩ never lists it (§8.4 / D-042). */
        evidence_refs: [],
        source_partitions: ['model_prior'],
        generation_batch: input.batch_id,
        created_at: input.created_at,
        updated_at: input.created_at,
      },
      kept_condition_recommendations: input.recommendations,
      reasoning_input_refs: input.reasoning,
      model_prior_notice: MODEL_SUGGESTION_ANNOTATION,
    };
  }

  /* ---------------------------------------------------------------- *
   * Lifecycle
   * ---------------------------------------------------------------- */

  async function readRecord(hypothesis_id: ObjectId<'HYP'>): Promise<HypothesisRecord | null> {
    return hypotheses.readById(hypothesis_id);
  }

  async function applyPatch(
    command: HypothesisIdCommand,
    patch: { readonly decision_state?: DecisionState; readonly saved?: boolean; readonly editable_items?: HypothesisEditableItems },
  ): Promise<HypothesisActionOutcome> {
    try {
      const updated = await hypotheses.update(command.hypothesis_id, {
        ...patch,
        updated_at: now(),
      });
      const outcome: HypothesisActionApplied = {
        kind: 'applied',
        hypothesis: updated.hypothesis,
        view: await viewOf(updated),
        idempotent_replay: false,
      };
      ledger.write(command.operation_id, outcome);
      return outcome;
    } catch (error) {
      if (error instanceof HypothesisRepositoryError && error.code === 'HYPOTHESIS_NOT_FOUND') {
        return actionRejection(
          'HYPOTHESIS_NOT_FOUND',
          `No Hypothesis exists for "${command.hypothesis_id}".`,
          null,
        );
      }
      throw error;
    }
  }

  return {
    generateHypotheses: (command) => runGeneration(command, false),
    regenerateHypotheses: (command) => runGeneration(command, true),

    /* 🔴 Both delegate to the SAME read service the provider-less reader uses (S01-06B). */
    readHypothesis: (hypothesis_id) => reads.readHypothesis(hypothesis_id),

    listHypothesesBySourceAttempt: (source_attempt_id) =>
      reads.listHypothesesBySourceAttempt(source_attempt_id),

    listGenerationBatches: (source_attempt_id) =>
      hypotheses.listBatchesBySourceAttempt(source_attempt_id),

    /**
     * 🔴 `accepted` means 「我认可这是一个值得下一步验证的方向」. It NEVER means the hypothesis is
     *    supported, verified, an experience or a `Fact`, and it never touches the save slot.
     */
    async acceptHypothesis(command: AcceptHypothesisCommand) {
      const replay = ledger.read<HypothesisActionOutcome>(command.operation_id);
      if (replay !== null) {
        return { ...replay, idempotent_replay: true } as HypothesisActionOutcome;
      }
      const record = await readRecord(command.hypothesis_id);
      if (record === null) {
        return actionRejection(
          'HYPOTHESIS_NOT_FOUND',
          `No Hypothesis exists for "${command.hypothesis_id}".`,
          null,
        );
      }
      if (!command.user_explicitly_accepted) {
        return actionRejection(
          'INVALID_COMMAND',
          'Accepting requires the user to explicitly confirm the direction; no automatic acceptance exists (§22).',
          record,
        );
      }
      const plan = planDecisionTransition(record.hypothesis.decision_state, 'accept', true);
      if (!plan.ok) {
        return actionRejection('NOT_A_CANONICAL_DECISION', plan.detail, record);
      }
      /*
       * 🔴 The patch deliberately carries NO `saved` field: accepting can never change the SAVE slot
       *    (§8.4 / AC-70).
       */
      return applyPatch(command, { decision_state: plan.next_state });
    },

    async rejectHypothesis(command) {
      const replay = ledger.read<HypothesisActionOutcome>(command.operation_id);
      if (replay !== null) {
        return { ...replay, idempotent_replay: true } as HypothesisActionOutcome;
      }
      const record = await readRecord(command.hypothesis_id);
      if (record === null) {
        return actionRejection(
          'HYPOTHESIS_NOT_FOUND',
          `No Hypothesis exists for "${command.hypothesis_id}".`,
          null,
        );
      }
      const plan = planDecisionTransition(record.hypothesis.decision_state, 'reject', false);
      if (!plan.ok) {
        return actionRejection('NOT_A_CANONICAL_DECISION', plan.detail, record);
      }
      return applyPatch(command, { decision_state: plan.next_state });
    },

    /**
     * Retains the CONTENT of a `Model Suggestion`.
     *
     * 🔴 This is the SAVE slot, never the DECISION slot: the patch carries no `decision_state`, so
     *    saving can never accept (§8.4 / AC-68).
     * 🔴 A grounded hypothesis has no save slot at all (`saved` stays `null`).
     */
    async saveModelSuggestion(command: SaveModelSuggestionCommand) {
      const replay = ledger.read<HypothesisActionOutcome>(command.operation_id);
      if (replay !== null) {
        return { ...replay, idempotent_replay: true } as HypothesisActionOutcome;
      }
      const record = await readRecord(command.hypothesis_id);
      if (record === null) {
        return actionRejection(
          'HYPOTHESIS_NOT_FOUND',
          `No Hypothesis exists for "${command.hypothesis_id}".`,
          null,
        );
      }
      if (record.hypothesis.kind !== 'model') {
        return actionRejection(
          'NOT_A_MODEL_SUGGESTION',
          'Only a Model Suggestion has a save slot; a History-grounded Hypothesis has none (§2.3 / D-042).',
          record,
        );
      }
      return applyPatch(command, { saved: command.saved });
    },

    /**
     * Adds / replaces USER `Fact` items for ⑥⑦⑧.
     *
     * 🔴 The command carries a SLOT list, so ①②③④⑤ can never be named here - their read-only
     *    boundary is structural, not a runtime check (§8.6 rule 1 / D-049).
     * 🔴 The AI's original proposals survive: the columns are merged, never replaced (§37).
     */
    async editHypothesisCriteria(command: EditHypothesisCriteriaCommand) {
      const replay = ledger.read<HypothesisActionOutcome>(command.operation_id);
      if (replay !== null) {
        return { ...replay, idempotent_replay: true } as HypothesisActionOutcome;
      }
      const record = await readRecord(command.hypothesis_id);
      if (record === null) {
        return actionRejection(
          'HYPOTHESIS_NOT_FOUND',
          `No Hypothesis exists for "${command.hypothesis_id}".`,
          null,
        );
      }
      const invalid = command.user_items.find(
        (item) =>
          !HYPOTHESIS_EDITABLE_FIELD_KEYS.includes(item.slot) ||
          item.content_item_id.trim().length === 0 ||
          item.value.trim().length === 0,
      );
      if (invalid !== undefined) {
        return actionRejection(
          'READ_ONLY_ITEM',
          `"${invalid.slot}" is not an editable slot: ⑥⑦⑧ are the only items a user may extend, and a blank value is never 「显式缺失」 (§8.6 rule 2 / H4).`,
          record,
        );
      }
      const merged = mergeUserEditableItems(record.hypothesis.editable_items, command.user_items);
      return applyPatch(command, { editable_items: merged });
    },

    /**
     * Decides ONE AI-proposed criterion.
     *
     * 🔴 Only `decision_state` changes: the item keeps `source_type = 'Inference'` forever (§38 / C6).
     */
    async decideHypothesisCriterion(command: DecideHypothesisCriterionCommand) {
      const replay = ledger.read<HypothesisActionOutcome>(command.operation_id);
      if (replay !== null) {
        return { ...replay, idempotent_replay: true } as HypothesisActionOutcome;
      }
      const record = await readRecord(command.hypothesis_id);
      if (record === null) {
        return actionRejection(
          'HYPOTHESIS_NOT_FOUND',
          `No Hypothesis exists for "${command.hypothesis_id}".`,
          null,
        );
      }
      const decided = decideAiCriterion(
        record.hypothesis.editable_items,
        command.content_item_id,
        command.decision_state,
      );
      if (!decided.ok) {
        return actionRejection('INVALID_CRITERION_TARGET', decided.detail, record);
      }
      return applyPatch(command, { editable_items: decided.items });
    },

    /**
     * Step ⑩ on its own.
     *
     * 🔴 `M15` computes NOTHING here: the trace list and `N_引用` come from the shared read service,
     *    which derives both from the SAME stored reference set on every call (S01-06B).
     */
    traceHypothesis: (hypothesis_id) => reads.traceHypothesis(hypothesis_id),
  };
}

/* ------------------------------------------------------------------ *
 * 3. Derived source partitions (§8.2 rule 2)
 * ------------------------------------------------------------------ */

/**
 * Which partitions are really present.
 *
 * 🔴 Two entries may legitimately be present (a historical basis plus an AI-proposed criterion), and
 *    there is deliberately NO third 「混合」 label (§8.2 rule 2). The list is DERIVED from the content
 *    on every read, so it cannot drift.
 */
export function sourcePartitionsFor(
  kind: 'grounded' | 'model',
  editable_items: HypothesisEditableItems,
  recommendations: readonly InferenceContentItem[],
): readonly SourcePartition[] {
  if (kind === 'model') {
    return ['model_prior'];
  }
  const has_model_prior = editable_items.ai_inferences.length > 0 || recommendations.length > 0;
  return has_model_prior ? ['historical_evidence', 'model_prior'] : ['historical_evidence'];
}
