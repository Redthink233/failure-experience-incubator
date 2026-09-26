/**
 * S01 ｜ `M8` the Candidate Insight service - `D9` step ⑧ and the whole `Insight` lifecycle.
 *
 * Contract: §2.2 (the single migration matrix), §2.4 / `D-051` (generation batches), §4.2 rule 2
 * (`accepted` still stays `Inference`), §5 (references + the four roles), §6 (`N_引用`),
 * §9 step ⑧, §9.2 (the two step ⑧ exits), §11.3 (the state-event trace).
 * Decisions: `D-015` / `D-021` (`E1`-`E5`) / `D-022` (step ⑧ is the only generation moment) /
 * `D-038` (three-part presentation) / `D-039` (accept / revoke) / `D-040` (content edit demotion +
 * the event log) / `D-043` (archiving referenced evidence) / `D-051` (batches).
 *
 * 🔴 WHAT THIS MODULE IS: the ONE explicit generation command of step ⑧, the `E1`-`E4` presentation,
 *    the `candidate` / `accepted` / `rejected` lifecycle, the state-event trace and the Local
 *    Workspace persistence of all of it.
 * 🔴 WHAT IT IS NOT: no `Hypothesis` (`M9`), no `D9` orchestration (`M15`), no UI (S01-06). It never
 *    re-runs retrieval (`M6`), never builds an `EvidenceRef` itself (`M7` owns that) and never
 *    invents a second reference or count system.
 * 🔴 NO AUTOMATIC GENERATION ANYWHERE (task §4 / `D-022`): nothing in this module listens to a
 *    timer, a file change, a page open, a `Formal` save or a retrieval rerun. `generateCandidateInsights`
 *    is the ONLY generation entry point and it runs only when it is called.
 * 🔴 NO CANDIDATE TODO POOL: a `candidate` exists because an explicit step ⑧ command produced it,
 *    never because the system queued work for the user.
 * 🔴 EVERY state change happens through `planInsightTransition`, which CONSUMES the frozen migration
 *    matrix. `accepted` is reachable only by an explicit user accept after `E1`-`E4` were
 *    re-confirmed in the same call (`D-039` / §16).
 * 🔴 `M8-HARDENING-01`: generation is written as a DURABLE PLAN - operation anchor first, then the
 *    `Insight` documents, then the batch record, then the anchor marked `complete`. A crash between
 *    the two writes that used to leave orphaned `insights/<id>.json` files is therefore recoverable:
 *    a retry with the same `operation_id` finishes the interrupted write without re-calling `M10`,
 *    without minting a second identity and without producing a second batch.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O beyond the injected repositories.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import { newObjectId } from '../../domain/ids/object-id.js';
import type { EvidenceRef } from '../../domain/types/evidence-ref.js';
import type { GateCheckResult } from '../../domain/types/gates.js';
import { canAcceptInsight, gateUnsatisfied, unsatisfiedGateIds } from '../../domain/types/gates.js';
import type { Insight } from '../../domain/types/insight.js';
import { isExperienceAssetView } from '../../domain/types/insight.js';
import type { AttemptRepository } from '../../workspace/repository/attempt-repository.js';
import { WorkspaceStorageError } from '../../workspace/storage.js';
import { WorkspaceSchemaError } from '../../workspace/schema/schema-error.js';
import type { RetrievalDerivationRepository } from '../../retrieval/compare/retrieval-derivation-repository.js';
import type { RetrievalDerivationRecord } from '../../retrieval/compare/types.js';
import type { GroundingHistoricalAttempt } from '../../retrieval/grounding/catalog.js';
import { buildInsightEvidence, buildInsightSourceCatalog, deriveInsightEvidenceViews, evidenceLinesOf, resolveEvidenceTargets } from './evidence.js';
import type { InsightEvidenceLine } from './evidence.js';
import { findForbiddenProofWording, singleSourceGeneralizationGuard } from './generalization.js';
import {
  evaluateE1,
  evaluateE4,
  insightGateChecks,
  missingItemsByGate,
} from './gates.js';
import type { InsightStructuralGateInput } from './gates.js';
import { INSIGHT_GENERATION_SCHEMA_ID, INSIGHT_GATE_RECHECK_SCHEMA_ID, insightGateRecheckJsonSchema, insightGenerationJsonSchema, readInsightGateRecheckPayload, readInsightGenerationPayload, structuredOutputRequest } from './schemas.js';
import { newInsightBatchId, insightOperationKey } from './identity.js';
import type { InsightRepository } from './insight-repository.js';
import { InsightRepositoryError } from './insight-repository.js';
import { buildInsightStateEvent, everAccepted, planInsightTransition } from './lifecycle.js';
import {
  acceptedDecisionInferencesOf,
  insightGateRecheckPromptMessages,
  insightGenerationPromptMessages,
  promptComparisonsOf,
  promptSourceAttemptOf,
  promptSourceCandidatesOf,
  promptUncomparedDimensionsOf,
} from './prompts.js';
import type { InsightPromptSourceAttempt } from './prompts.js';
import { invokeInsightStructured } from './structured-invoke.js';
import type {
  AcceptInsightCommand,
  CandidateInsightProposal,
  EditInsightContentCommand,
  EditInsightMetaCommand,
  GenerateCandidateInsightsCommand,
  GenerateCandidateInsightsOutcome,
  GenerateCandidateInsightsOutcome as GenerationOutcome,
  InsightActionOutcome,
  InsightActionRejection,
  InsightActionRejectionCode,
  InsightGateRecheckOutcome,
  InsightGenerationBatch,
  InsightGenerationRefusalCode,
  InsightIdCommand,
  InsightPayloadIssue,
  InsightProviderContext,
  InsightOperationAnchor,
  InsightRecord,
  InsightRuntimeFailure,
  InsightService,
  InsightView,
} from './types.js';
import {
  EMPTY_INSIGHT_META,
  insightRuntimeFailure,
} from './types.js';

/* ------------------------------------------------------------------ *
 * 1. Dependencies
 * ------------------------------------------------------------------ */

export interface InsightServiceDeps {
  readonly insights: InsightRepository;
  readonly attempts: AttemptRepository;
  /** The `M6` read model: the CURRENT Retrieval Derivation is the only evidence admission source. */
  readonly derivations: RetrievalDerivationRepository;
  readonly provider: InsightProviderContext;
  /** Injectable clock returning an ISO-8601 timestamp. */
  readonly now?: () => string;
  /** Injectable id generator (deterministic tests). */
  readonly newInsightId?: () => ObjectId<'INS'>;
  readonly newBatchId?: (source_attempt_id: string) => string;
}

/**
 * Remembers the result of one command by `operation_id`.
 *
 * 🔴 Deliberately NOT a version system and NOT a source of truth: it stores no history, keeps no
 *    versions and lives and dies with the service instance (AC-122). The persistent idempotency
 *    anchor of a GENERATION is the batch record; this ledger additionally covers the lifecycle
 *    actions, whose effects are visible in the stored record itself.
 */
class OperationLedger {
  private readonly entries = new Map<string, unknown>();

  read<T>(operation_id: string): T | null {
    return this.entries.has(operation_id) ? (this.entries.get(operation_id) as T) : null;
  }

  write(operation_id: string, value: unknown): void {
    this.entries.set(operation_id, value);
  }
}

/* ------------------------------------------------------------------ *
 * 2. Small helpers
 * ------------------------------------------------------------------ */

/** The single frozen judgement-basis field, composed from the model's two halves (§8). */
function judgmentBasisOf(proposal: CandidateInsightProposal): string {
  return proposal.verifiability === null
    ? proposal.basis
    : `${proposal.basis}\n可验证判据：${proposal.verifiability}`;
}

function emptySourceAttempt(attempt_id: string): InsightPromptSourceAttempt {
  return {
    attempt_id,
    goal: null,
    actual_attempt: null,
    condition: null,
    actual_result: null,
    result_status: null,
    expected_result: null,
    judgment_basis: null,
  };
}

/**
 * The stored `E2` / `E3` verdict, read verbatim.
 *
 * 🔴 Never recomputed at read or accept time: it is the verdict the user is looking at, and `D-039`
 *    makes a content edit the ONLY remedy for a failing one.
 * 🔴 A record that carries no stored content-quality judgement is treated as UNSATISFIED: an absent
 *    judgement may never act as a silent pass.
 */
function storedContentJudgement(insight: Insight, gate_id: 'E2' | 'E3'): GateCheckResult {
  const stored = insight.gate_checks.find((check) => check.gate_id === gate_id);
  if (stored !== undefined) {
    return stored;
  }
  return gateUnsatisfied(gate_id, [
    {
      description: `这条经验还没有 ${gate_id} 的判断结果`,
      why_important: `${gate_id} 属内容质量判断；缺少判断结果时不得视为通过（D-039）。`,
      how_to_supplement: null,
    },
  ]);
}

/**
 * Distinguishes the empty states instead of merging them into one sentence.
 *
 * 🔴 `HISTORY_EMPTY` and `NO_RELATED_HISTORY` are both legitimate but they are NOT the same
 *    statement, and the contract forbids presenting them with one shared wording (`D-046` V-1 /
 *    AC-97 / AC-98).
 */
function absenceStatementForExitA(derivation: RetrievalDerivationRecord | null): string {
  if (derivation === null) {
    return '这条记录还没有可用的历史检索结果，无法形成有历史依据的候选经验，因此本次不产出候选经验。';
  }
  if (derivation.status === 'HISTORY_EMPTY') {
    return '除本次记录以外，工作区里还没有可用的历史正式记录，因此没有可以对照的经验来源。';
  }
  if (derivation.status === 'NO_RELATED_HISTORY') {
    return '工作区里已有历史正式记录，但没有任何一条与本次记录相关，因此没有可以对照的材料。';
  }
  return '本次检索结果里没有任何可以引用的具体内容条目，因此本次不产出候选经验。';
}

/* ------------------------------------------------------------------ *
 * 2b. The provider-independent READ service (S01-06B)
 * ------------------------------------------------------------------ */

/**
 * The half of `M8` that never touches a model.
 *
 * 🔴 WHY IT IS SEPARATE: 「这一个记录已经沉淀出什么」 must be answerable from a local workspace with
 *    NO model configured (S01-06-D1). The view derivation below is pure - it reads the stored
 *    `Insight`, the workspace's records and the CURRENT `M6` derivation, and it calls no provider -
 *    so it is extracted here and consumed by BOTH `createInsightService` and the provider-less
 *    workspace reader.
 * 🔴 IT IS THE SAME CODE, NOT A COPY: `createInsightService` delegates to the object this factory
 *    returns, so a `N_引用`, a ⑩ trace or an `E1`-`E4` verdict can never differ between the two
 *    reading paths.
 * 🔴 NOTHING HERE IS A SECOND `N_引用` DERIVATION: the count and the trace still come from `M7`
 *    alone (`deriveInsightEvidenceViews`), and the gate verdicts are read VERBATIM from the record.
 */
export interface InsightReadServiceDeps {
  readonly insights: InsightRepository;
  readonly attempts: AttemptRepository;
  /** The `M6` read model: the CURRENT Retrieval Derivation is the only evidence admission source. */
  readonly derivations: RetrievalDerivationRepository;
}

export interface InsightReadService {
  /** Every record of the workspace with its attached content items, read FRESH. */
  historicalAttempts(): Promise<readonly GroundingHistoricalAttempt[]>;
  /** The read view of ONE already-read record. Exported so the lifecycle actions reuse it. */
  viewOf(record: InsightRecord): Promise<InsightView>;
  readInsight(insight_id: ObjectId<'INS'>): Promise<InsightView | null>;
  listInsightsBySourceAttempt(source_attempt_id: ObjectId<'ATT'>): Promise<readonly InsightView[]>;
  listExperienceAssets(): Promise<readonly InsightView[]>;
}

export function createInsightReadService(deps: InsightReadServiceDeps): InsightReadService {
  const { insights, attempts, derivations } = deps;

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

  /** Builds the read view. `N_引用` and the ⑩ list come from `M7`'s single derivations. */
  async function viewOf(record: InsightRecord): Promise<InsightView> {
    const historical = await historicalAttempts();
    const derivation = (await derivations.readCurrent(record.insight.attempt_id)) ?? undefined;
    const views = deriveInsightEvidenceViews(
      record.insight.insight_id,
      record.insight.evidence_refs,
      historical,
      derivation,
    );
    return {
      insight: record.insight,
      meta: record.meta,
      comparison_ref: record.comparison_ref,
      citation: views.citation,
      traceability: views.traceability,
      is_experience_asset: isExperienceAssetView(record.insight),
      unsatisfied_gate_ids: unsatisfiedGateIds(record.insight.gate_checks),
      can_accept: canAcceptInsight(record.insight.gate_checks),
      missing_items_by_gate: missingItemsByGate(record.insight.gate_checks),
    };
  }

  return {
    historicalAttempts,
    viewOf,

    async readInsight(insight_id: ObjectId<'INS'>): Promise<InsightView | null> {
      const record = await insights.readById(insight_id);
      return record === null ? null : viewOf(record);
    },

    async listInsightsBySourceAttempt(
      source_attempt_id: ObjectId<'ATT'>,
    ): Promise<readonly InsightView[]> {
      const records = await insights.listBySourceAttempt(source_attempt_id);
      const views: InsightView[] = [];
      for (const record of records) {
        views.push(await viewOf(record));
      }
      return views;
    },

    /**
     * The product view「Experience Asset」.
     * 🔴 NOT a second object, NOT a second collection, NOT a second id space: it is exactly the
     *    `accepted` `Insight`s (`D-015` / AC-13).
     */
    async listExperienceAssets(): Promise<readonly InsightView[]> {
      const records = await insights.listAll();
      const views: InsightView[] = [];
      for (const record of records) {
        if (isExperienceAssetView(record.insight)) {
          views.push(await viewOf(record));
        }
      }
      return views;
    },
  };
}

/* ------------------------------------------------------------------ *
 * 3. Service
 * ------------------------------------------------------------------ */

export function createInsightService(deps: InsightServiceDeps): InsightService {
  const { insights, attempts, derivations, provider } = deps;
  const now = deps.now ?? ((): string => new Date().toISOString());
  const newInsightId = deps.newInsightId ?? ((): ObjectId<'INS'> => newObjectId('insight'));
  const newBatchId = deps.newBatchId ?? newInsightBatchId;
  const ledger = new OperationLedger();

  /* 🔴 ONE read implementation, shared with the provider-less reader (S01-06B). */
  const reads = createInsightReadService({ insights, attempts, derivations });
  const readHistorical = () => reads.historicalAttempts();
  const viewOf = (record: InsightRecord) => reads.viewOf(record);

  async function structuralInputOf(
    insight: Insight,
    historical: readonly GroundingHistoricalAttempt[],
    comparison_ref: string | null,
  ): Promise<InsightStructuralGateInput> {
    const source = await attempts.readAttempt(insight.attempt_id);
    return {
      source_attempt: source,
      evidence_targets: resolveEvidenceTargets(insight.evidence_refs, historical),
      comparison_ref,
    };
  }

  /**
   * Runs the `E1`-`E4` check for one stored record.
   *
   * 🔴 `E1` / `E4` are MACHINE checks and are always re-derived from FRESH reads: they can change
   *    without any content edit (a record or a landing point may disappear).
   * 🔴 `E2` / `E3` are CONTENT-QUALITY judgements that belong to the stored content. They are
   *    re-asked from `M10` ONLY when the content changed (`rejudge_content`, §24) - at accept time
   *    the STORED verdict is the one enforced, because that is the verdict the user is looking at.
   *    Re-asking at accept would let a user flip a failing `E3` without touching the content, which
   *    `D-039` forbids ("用户唯一解法 = 修改内容 → 重新检查").
   * 🔴 An AI runtime failure NEVER defaults to `pass`, never reuses a previous `pass` as if it were
   *    a new check and never auto-accepts: the caller keeps the record as it is and may retry (§24).
   */
  async function recheckGates(
    record: { readonly insight: Insight; readonly comparison_ref: string | null },
    options: { readonly rejudge_content: boolean },
  ): Promise<{ readonly kind: 'ok'; readonly checks: readonly GateCheckResult[] } | InsightRuntimeFailure> {
    const insight = record.insight;
    const historical = await readHistorical();
    const structural = await structuralInputOf(insight, historical, record.comparison_ref);

    if (!options.rejudge_content) {
      return {
        kind: 'ok',
        checks: [
          evaluateE1(structural),
          storedContentJudgement(insight, 'E2'),
          storedContentJudgement(insight, 'E3'),
          evaluateE4(structural),
        ],
      };
    }

    const request = {
      provider_id: provider.adapter.provider_id,
      model: provider.adapter.config.model,
      messages: insightGateRecheckPromptMessages({
        insight_id: insight.insight_id,
        source_attempt:
          structural.source_attempt === null
            ? emptySourceAttempt(insight.attempt_id)
            : promptSourceAttemptOf(structural.source_attempt),
        proposition: insight.proposition,
        scope: insight.applicable_scope,
        judgment_basis: insight.judgment_basis,
        evidence: evidenceLinesOf(insight.evidence_refs, historical),
      }),
      structured_output: structuredOutputRequest(
        INSIGHT_GATE_RECHECK_SCHEMA_ID,
        insightGateRecheckJsonSchema,
      ),
    };

    const invoked = await invokeInsightStructured({
      adapter: provider.adapter,
      credential_ref: provider.credential_ref,
      request,
      structured_output: request.structured_output,
    });
    if (invoked.kind === 'runtime_failure') {
      return invoked;
    }

    const read = readInsightGateRecheckPayload(invoked.value);
    if (read.kind === 'issue') {
      return insightRuntimeFailure(
        'SCHEMA_VIOLATION',
        `The gate re-check answer was refused: ${read.issues
          .map((issue) => `${issue.code}@${issue.path === '' ? 'root' : issue.path}`)
          .join(', ')}. The Insight is unchanged and the previous result was NOT reused.`,
        true,
      );
    }

    return {
      kind: 'ok',
      checks: insightGateChecks({
        structural,
        ai: { ...read.payload, insight_id: insight.insight_id },
      }),
    };
  }

  /*
   * The view builder lives in `createInsightReadService` (S01-06B) and is reached through the
   * `viewOf` local binding above - there is exactly ONE derivation of `N_引用`, of the ⑩ trace and
   * of the `E1`-`E4` verdicts in this module.
   */

  function generationRefusal(
    code: InsightGenerationRefusalCode,
    detail: string,
    options: {
      readonly rejections?: readonly import('../../retrieval/grounding/types.js').GroundingRejection[];
      readonly issues?: readonly InsightPayloadIssue[];
      readonly retryable?: boolean;
    } = {},
  ): GenerationOutcome {
    return {
      kind: 'refused',
      code,
      detail,
      rejections: options.rejections ?? [],
      issues: options.issues ?? [],
      retryable: options.retryable ?? false,
    };
  }

  function actionRejection(
    code: InsightActionRejectionCode,
    detail: string,
    options: {
      readonly insight?: Insight | null;
      readonly gate_checks?: readonly GateCheckResult[];
      readonly rejections?: readonly import('../../retrieval/grounding/types.js').GroundingRejection[];
      readonly retryable?: boolean;
    } = {},
  ): InsightActionRejection {
    const rejection: InsightActionRejection = {
      kind: 'rejected',
      code,
      detail,
      insight: options.insight ?? null,
      gate_checks: options.gate_checks ?? [],
      rejections: options.rejections ?? [],
      retryable: options.retryable ?? false,
    };
    return rejection;
  }

  /**
   * Classifies a persistence failure into a STABLE, enumerable token.
   *
   * 🔴 WHY NOT THE MESSAGE: `M15` returns a module refusal VERBATIM, so anything embedded here reaches
   *    the UI. A raw error message may carry a workspace path, a header or a provider body, none of
   *    which may leave the process (task §16). Only an ENUM CODE travels, and a value that does not
   *    look like one is replaced by `UNCLASSIFIED_FAILURE` - so free text is structurally unable to
   *    pass through.
   */
  function persistenceFailureReason(error: unknown): string {
    const candidate =
      error instanceof InsightRepositoryError ||
      error instanceof WorkspaceStorageError ||
      error instanceof WorkspaceSchemaError
        ? error.code
        : 'UNCLASSIFIED_FAILURE';
    return /^[A-Z][A-Z0-9_]*$/.test(candidate) ? candidate : 'UNCLASSIFIED_FAILURE';
  }

  /**
   * Writes a materialised plan. Idempotent, so it doubles as the RECOVERY routine (`M8-HARDENING-01`).
   *
   * 🔴 THE RECOVERY BOUNDARY. The order is fixed and is the whole point:
   *    ① the durable anchor FIRST, carrying the COMPLETE plan in ONE storage write;
   *    ② every planned `Insight`, by id (`createIfAbsent` re-applies the identical document);
   *    ③ the generation batch record (`recordBatchIfAbsent`, the idempotency anchor of `§32`);
   *    ④ `status: 'complete'`, only once ② and ③ are really present.
   *
   *    A crash anywhere inside ②/③ therefore leaves an anchor that NAMES what is still missing, so a
   *    retry of the same `operation_id` FINISHES the write instead of minting a second set of
   *    identities. Before this change the order was 「Insight 写入 → batch 写入」 with no anchor at
   *    all, so a crash in between produced `insights/<id>.json` files that no batch explained and
   *    that the `findBatchByOperationId` idempotency lookup could not see.
   * 🔴 This is NOT claimed to be an atomic transaction: it is a bounded, ordered, idempotent routine
   *    whose steps may be re-run until the workspace is consistent.
   * 🔴 `M8` deliberately does NOT import `M9` for this. The two modules implement the same TECHNICAL
   *    protocol independently, which keeps the `M6 → M7 → M8 → M9` direction free of a back-edge and
   *    avoids a cross-module business superclass.
   */
  async function applyPlan(plan: {
    readonly anchor_key: string;
    readonly operation_id: string;
    readonly source_attempt_id: ObjectId<'ATT'>;
    readonly batch_id: string;
    readonly records: readonly InsightRecord[];
    readonly batch: InsightGenerationBatch;
    readonly created_at: string;
  }): Promise<void> {
    /* ① THE ANCHOR FIRST. It carries the COMPLETE plan in one document. */
    await insights.writeOperationAnchor({
      operation_key: plan.anchor_key,
      operation_id: plan.operation_id,
      source_attempt_id: plan.source_attempt_id,
      batch_id: plan.batch_id,
      status: 'in_progress',
      planned_records: plan.records,
      planned_batch: plan.batch,
      created_at: plan.created_at,
    });
    /* ② every insight file, by id - a replay re-applies the identical document. */
    for (const record of plan.records) {
      await insights.createIfAbsent(record);
    }
    /* ③ the batch record - the idempotency anchor of a generation. */
    await insights.recordBatchIfAbsent(plan.batch);
    /* ④ ONLY NOW is the operation complete. */
    await insights.writeOperationAnchor({
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

  /**
   * Materialises an outcome from a stored / planned batch WITHOUT re-asking a model.
   *
   * 🔴 This is why a replay never re-calls `M10` and never re-mints an identity: the batch record
   *    names the `Insight`s, and those documents are read back from the workspace.
   */
  async function outcomeFromBatch(
    batch: InsightGenerationBatch,
    idempotent_replay: boolean,
  ): Promise<GenerateCandidateInsightsOutcome> {
    const produced: Insight[] = [];
    for (const insight_id of batch.insight_ids) {
      const record = await insights.readById(insight_id);
      if (record !== null) {
        produced.push(record.insight);
      }
    }
    if (produced.length > 0) {
      return { kind: 'generated', batch, insights: produced, idempotent_replay };
    }
    /*
     * 🔴 A zero-output batch is a SUCCESS with an explicit route and reason, not a failure: it is
     *    reported as `zero_output` here exactly as it was when it was first produced (`§9.2`).
     */
    return {
      kind: 'zero_output',
      batch,
      exit_route: batch.exit_route ?? 'EXIT-A',
      absence_statement: batch.absence_statement ?? '',
      idempotent_replay,
    };
  }

  /**
   * Completes an interrupted operation from its anchor.
   * 🔴 A BLOCKED recovery is reported as a retryable refusal - never as a success and never as an
   *    empty result (MH10).
   */
  async function recoverFromAnchor(
    anchor: InsightOperationAnchor,
  ): Promise<GenerateCandidateInsightsOutcome> {
    try {
      await applyPlan({
        anchor_key: anchor.operation_key,
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
        `The durable operation anchor of "${anchor.operation_id}" could not be replayed (${persistenceFailureReason(
          error,
        )}). Nothing is reported as a success; retry the same operation to finish the write.`,
        { retryable: true },
      );
    }
    return outcomeFromBatch(anchor.planned_batch, true);
  }

  /**
   * Applies a freshly materialised plan and converts a BLOCKED write into an explicit, RETRYABLE
   * refusal.
   *
   * 🔴 `null` means "the plan was written successfully"; anything else is the outcome the caller must
   *    return. A blocked write is NEVER reported as a success and NEVER as an empty result: the
   *    anchor stays on disk, so the very next retry of the same `operation_id` completes the write
   *    (`M8-HARDENING-01` / MH10).
   */
  async function persistPlan(plan: {
    readonly anchor_key: string;
    readonly operation_id: string;
    readonly source_attempt_id: ObjectId<'ATT'>;
    readonly batch_id: string;
    readonly records: readonly InsightRecord[];
    readonly batch: InsightGenerationBatch;
    readonly created_at: string;
  }): Promise<GenerateCandidateInsightsOutcome | null> {
    try {
      await applyPlan(plan);
      return null;
    } catch (error) {
      return generationRefusal(
        'PERSISTENCE_RECOVERY_BLOCKED',
        `The step ⑧ generation of "${plan.operation_id}" could not be persisted (${persistenceFailureReason(
          error,
        )}); nothing is reported as a success, and a retry of the same operation will complete the write.`,
        { retryable: true },
      );
    }
  }

  /* ---------------------------------------------------------------- *
   * Generation
   * ---------------------------------------------------------------- */

  async function runGeneration(
    command: GenerateCandidateInsightsCommand,
    explicit_regeneration: boolean,
  ): Promise<GenerateCandidateInsightsOutcome> {
    const source_attempt = await attempts.readAttempt(command.source_attempt_id);
    if (source_attempt === null) {
      return generationRefusal(
        'SOURCE_ATTEMPT_NOT_FOUND',
        `No Attempt exists for "${command.source_attempt_id}".`,
      );
    }

    const anchor_key = insightOperationKey(command.source_attempt_id, command.operation_id);

    /*
     * (1) CRASH RECOVERY (`M8-HARDENING-01`): an interrupted operation is COMPLETED, never restarted.
     *     🔴 Only the ANCHOR can complete a partial write, because the batch the operation was going
     *     to record may not exist yet - which is exactly the window this closes.
     */
    let anchor: InsightOperationAnchor | null;
    try {
      anchor = await insights.readOperationAnchor(anchor_key);
    } catch (error) {
      return generationRefusal(
        'PERSISTENCE_RECOVERY_BLOCKED',
        `The durable operation anchor of "${command.operation_id}" could not be read: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { retryable: true },
      );
    }
    if (anchor !== null) {
      if (anchor.source_attempt_id !== command.source_attempt_id) {
        return generationRefusal(
          'OPERATION_ID_CONFLICT',
          `The operation id "${command.operation_id}" was already used for "${anchor.source_attempt_id}".`,
        );
      }
      return recoverFromAnchor(anchor);
    }

    /* (2) Idempotency by batch lookup - the same operation never produces a second batch (§32). */
    const replay_batch = await insights.findBatchByOperationId(command.operation_id);
    if (replay_batch !== null) {
      if (replay_batch.source_attempt_id !== command.source_attempt_id) {
        return generationRefusal(
          'OPERATION_ID_CONFLICT',
          `The operation id "${command.operation_id}" was already used for "${replay_batch.source_attempt_id}".`,
        );
      }
      return outcomeFromBatch(replay_batch, true);
    }

    /* (3) A second generation must be EXPLICIT (§28 / §29 / D-051). */
    if (!explicit_regeneration) {
      const existing = await insights.listBatchesBySourceAttempt(command.source_attempt_id);
      if (existing.length > 0) {
        return generationRefusal(
          'REGENERATION_REQUIRED',
          'This record already has a generation result; another generation只有用户显式发起重新生成时才会执行（D-051）。',
        );
      }
    }

    /* (4) The current M6 derivation is the only evidence admission source. */
    const derivation = await derivations.readCurrent(command.source_attempt_id);
    const historical = await readHistorical();
    const catalog =
      derivation === null
        ? null
        : buildInsightSourceCatalog({ derivation, historical_attempts: historical });
    const sources_available = catalog !== null && catalog.candidates.length > 0;

    /*
     * 🔴 `EXIT-A` is a STRUCTURAL outcome here, not a matter of opinion: contract §9.2 defines it as
     *    "`N_检索 = 0` (or related records exist but no grounding criterion is met)". When there is
     *    no usable source material at all the route is therefore determined without asking a model,
     *    and the two empty states are still told apart in the statement (AC-97 / AC-98).
     */
    if (!sources_available) {
      const created_at = now();
      const statement = absenceStatementForExitA(derivation);
      const batch_id = newBatchId(command.source_attempt_id);
      const batch: InsightGenerationBatch = {
        batch_id,
        source_attempt_id: command.source_attempt_id,
        operation_id: command.operation_id,
        insight_ids: [],
        exit_route: 'EXIT-A',
        absence_statement: statement,
        created_at,
      };
      const applied = await persistPlan({
        anchor_key,
        operation_id: command.operation_id,
        source_attempt_id: command.source_attempt_id,
        batch_id,
        records: [],
        batch,
        created_at,
      });
      if (applied !== null) {
        return applied;
      }
      return {
        kind: 'zero_output',
        batch,
        exit_route: 'EXIT-A',
        absence_statement: statement,
        idempotent_replay: false,
      };
    }

    /* (5) The single constrained AI call of step ⑧. */
    const request = {
      provider_id: provider.adapter.provider_id,
      model: provider.adapter.config.model,
      messages: insightGenerationPromptMessages({
        source_attempt: promptSourceAttemptOf(source_attempt),
        uncompared_dimensions: promptUncomparedDimensionsOf(derivation as RetrievalDerivationRecord),
        comparisons: promptComparisonsOf(derivation as RetrievalDerivationRecord),
        source_catalog: promptSourceCandidatesOf(catalog as NonNullable<typeof catalog>),
        accepted_inferences: acceptedDecisionInferencesOf(source_attempt),
      }),
      structured_output: structuredOutputRequest(
        INSIGHT_GENERATION_SCHEMA_ID,
        insightGenerationJsonSchema,
      ),
    };
    const invoked = await invokeInsightStructured({
      adapter: provider.adapter,
      credential_ref: provider.credential_ref,
      request,
      structured_output: request.structured_output,
    });
    if (invoked.kind === 'runtime_failure') {
      return invoked;
    }

    const read = readInsightGenerationPayload(invoked.value);
    if (read.kind === 'issue') {
      return generationRefusal(
        'AI_PROPOSAL_REJECTED',
        'The step ⑧ answer was refused as a whole; nothing was persisted. ' +
          read.issues.map((issue) => `${issue.code}@${issue.path === '' ? 'root' : issue.path}`).join(', '),
        { issues: read.issues, retryable: true },
      );
    }
    const proposal = read.payload;

    /* (6) Zero output: 0 insights is legal; the route and its reason are persisted. */
    if (proposal.insights.length === 0) {
      const created_at = now();
      const statement = proposal.absence_statement ?? '';
      const batch_id = newBatchId(command.source_attempt_id);
      const batch: InsightGenerationBatch = {
        batch_id,
        source_attempt_id: command.source_attempt_id,
        operation_id: command.operation_id,
        insight_ids: [],
        exit_route: proposal.exit_route === 'NONE' ? 'EXIT-C' : proposal.exit_route,
        absence_statement: statement,
        created_at,
      };
      const applied = await persistPlan({
        anchor_key,
        operation_id: command.operation_id,
        source_attempt_id: command.source_attempt_id,
        batch_id,
        records: [],
        batch,
        created_at,
      });
      if (applied !== null) {
        return applied;
      }
      return {
        kind: 'zero_output',
        batch,
        exit_route: batch.exit_route ?? 'EXIT-C',
        absence_statement: statement,
        idempotent_replay: false,
      };
    }

    /*
     * (7) Evidence. 🔴 `M7` is the only validator and the only reference constructor. If ANY
     *     proposal's selection is refused, the WHOLE generation is refused and NOTHING is written:
     *     `M8` never drops a refused reference and continues (task §38 V3).
     */
    const draft_derivation = derivation as RetrievalDerivationRecord;
    const batch_id = newBatchId(command.source_attempt_id);
    const created_at = now();
    const built: InsightRecord[] = [];

    for (const candidate of proposal.insights) {
      const insight_id = newInsightId();
      const evidence = buildInsightEvidence({
        insight_id,
        selections: candidate.evidence_selections,
        derivation: draft_derivation,
        historical_attempts: historical,
        created_at,
      });
      if (evidence.kind === 'refused') {
        return generationRefusal(
          'EVIDENCE_SELECTION_REFUSED',
          `M7 refused a proposed reference for one Candidate Insight: ${evidence.detail}`,
          { rejections: evidence.rejections, retryable: true },
        );
      }

      const structural: InsightStructuralGateInput = {
        source_attempt,
        evidence_targets: resolveEvidenceTargets(evidence.evidence_refs, historical),
        comparison_ref: evidence.comparison_ref,
      };
      const gate_checks = insightGateChecks({
        structural,
        ai: { ...candidate, insight_id },
      });

      built.push({
        insight: {
          insight_id,
          attempt_id: source_attempt.attempt_id,
          /* 🔴 A new Insight is ALWAYS `candidate`: never `accepted`, whatever `E1`-`E4` say (§16). */
          state: 'candidate',
          proposition: candidate.proposition,
          applicable_scope: candidate.scope,
          evidence_refs: evidence.evidence_refs,
          judgment_basis: judgmentBasisOf(candidate),
          gate_checks,
          generation_batch: batch_id,
          created_at,
          updated_at: created_at,
        },
        comparison_ref: evidence.comparison_ref,
        meta: EMPTY_INSIGHT_META,
      });
    }

    /*
     * (8) Persist the whole plan: anchor → records → batch → complete (`M8-HARDENING-01`).
     *     🔴 The batch is the idempotency anchor of `§32`; the ANCHOR is what makes an interrupted
     *     write recoverable rather than orphaned.
     */
    const batch: InsightGenerationBatch = {
      batch_id,
      source_attempt_id: command.source_attempt_id,
      operation_id: command.operation_id,
      insight_ids: built.map((entry) => entry.insight.insight_id),
      exit_route: null,
      absence_statement: null,
      created_at,
    };
    const applied = await persistPlan({
      anchor_key,
      operation_id: command.operation_id,
      source_attempt_id: command.source_attempt_id,
      batch_id,
      records: built,
      batch,
      created_at,
    });
    if (applied !== null) {
      return applied;
    }

    const produced: Insight[] = [];
    for (const entry of built) {
      const record = await insights.readById(entry.insight.insight_id);
      if (record !== null) {
        produced.push(record.insight);
      }
    }

    return {
      kind: 'generated',
      batch,
      insights: produced,
      idempotent_replay: false,
    };
  }

  /* ---------------------------------------------------------------- *
   * Lifecycle
   * ---------------------------------------------------------------- */

  async function readRecord(insight_id: ObjectId<'INS'>) {
    return insights.readById(insight_id);
  }

  return {
    generateCandidateInsights: (command) => runGeneration(command, false),
    regenerateCandidateInsights: (command) => runGeneration(command, true),

    /* 🔴 All three delegate to the SAME read service the provider-less reader uses (S01-06B). */
    readInsight: (insight_id) => reads.readInsight(insight_id),

    listInsightsBySourceAttempt: (source_attempt_id) =>
      reads.listInsightsBySourceAttempt(source_attempt_id),

    /**
     * The product view「Experience Asset」.
     * 🔴 NOT a second object, NOT a second collection, NOT a second id space: it is exactly the
     *    `accepted` `Insight`s (`D-015` / AC-13).
     */
    listExperienceAssets: () => reads.listExperienceAssets(),

    listGenerationBatches: (source_attempt_id) =>
      insights.listBatchesBySourceAttempt(source_attempt_id),

    listStateEvents: (insight_id) => insights.listStateEventsByInsight(insight_id),

    /**
     * `E5` — the user explicitly accepting.
     *
     * 🔴 `E1`-`E4` are RE-CONFIRMED in this very call (`§16` / `§21` / `L10`); a single unsatisfied
     *    gate refuses the migration and leaves the record untouched.
     * 🔴 The user's action decides `E5`; it can never substitute `E1`-`E4` (`D-039`).
     */
    async acceptInsight(command: AcceptInsightCommand): Promise<InsightActionOutcome> {
      const replay = ledger.read<InsightActionOutcome>(command.operation_id);
      if (replay !== null) {
        return { ...replay, idempotent_replay: true } as InsightActionOutcome;
      }
      const record = await readRecord(command.insight_id);
      if (record === null) {
        return actionRejection('INSIGHT_NOT_FOUND', `No Insight exists for "${command.insight_id}".`);
      }
      if (!command.user_explicitly_accepted) {
        return actionRejection(
          'INVALID_COMMAND',
          'E5 requires the user to explicitly accept the Insight; no automatic acceptance exists (D-039).',
          { insight: record.insight },
        );
      }
      const events = await insights.listStateEventsByInsight(command.insight_id);
      const plan = planInsightTransition(record.insight.state, 'accept', everAccepted(events));
      if (!plan.ok || plan.event_trigger === null) {
        return actionRejection(
          'NOT_A_CANONICAL_TRANSITION',
          plan.ok
            ? `"accept" from "${record.insight.state}" has no event semantics in the frozen trigger set.`
            : plan.detail,
          { insight: record.insight },
        );
      }

      const rechecked = await recheckGates(record, { rejudge_content: false });
      if (rechecked.kind === 'runtime_failure') {
        return rechecked;
      }
      if (!canAcceptInsight(rechecked.checks)) {
        return actionRejection(
          'GATES_NOT_SATISFIED',
          'E1-E4 are not all satisfied, so the accept action cannot migrate the Insight; the record stays a candidate (D-039 / AC-63).',
          { insight: record.insight, gate_checks: rechecked.checks },
        );
      }

      const updated = await insights.update(command.insight_id, {
        state: plan.next_state,
        gate_checks: rechecked.checks,
        updated_at: now(),
      });
      const event = buildInsightStateEvent({
        insight_id: command.insight_id,
        from_state: record.insight.state,
        to_state: plan.next_state,
        trigger: plan.event_trigger,
        occurred_at: now(),
      });
      await insights.appendStateEvent(event);
      const outcome: InsightActionOutcome = {
        kind: 'applied',
        insight: updated.insight,
        view: await viewOf(updated),
        event,
        idempotent_replay: false,
      };
      ledger.write(command.operation_id, outcome);
      return outcome;
    },

    /**
     * `candidate -> rejected`.
     * 🔴 NOT gated on `E1`-`E4` (`D-015`); 🔴 writes NO state event, because no canonical trigger
     *    class expresses a rejection - the state pair IS the record (§25).
     */
    async rejectInsight(command: InsightIdCommand): Promise<InsightActionOutcome> {
      const replay = ledger.read<InsightActionOutcome>(command.operation_id);
      if (replay !== null) {
        return { ...replay, idempotent_replay: true } as InsightActionOutcome;
      }
      const record = await readRecord(command.insight_id);
      if (record === null) {
        return actionRejection('INSIGHT_NOT_FOUND', `No Insight exists for "${command.insight_id}".`);
      }
      const plan = planInsightTransition(record.insight.state, 'reject', false);
      if (!plan.ok) {
        return actionRejection('NOT_A_CANONICAL_TRANSITION', plan.detail, {
          insight: record.insight,
        });
      }
      const updated = await insights.update(command.insight_id, {
        state: plan.next_state,
        updated_at: now(),
      });
      const outcome: InsightActionOutcome = {
        kind: 'applied',
        insight: updated.insight,
        view: await viewOf(updated),
        event: null,
        idempotent_replay: false,
      };
      ledger.write(command.operation_id, outcome);
      return outcome;
    },

    /**
     * `accepted -> candidate`. 🔴 Never a delete, never a content change, never a `source_type`
     *    change and never `rejected` (`D-039` / `§21`).
     */
    async revokeAcceptance(command: InsightIdCommand): Promise<InsightActionOutcome> {
      const replay = ledger.read<InsightActionOutcome>(command.operation_id);
      if (replay !== null) {
        return { ...replay, idempotent_replay: true } as InsightActionOutcome;
      }
      const record = await readRecord(command.insight_id);
      if (record === null) {
        return actionRejection('INSIGHT_NOT_FOUND', `No Insight exists for "${command.insight_id}".`);
      }
      const plan = planInsightTransition(record.insight.state, 'revoke_acceptance', false);
      if (!plan.ok || plan.event_trigger === null) {
        return actionRejection(
          'NOT_A_CANONICAL_TRANSITION',
          plan.ok ? 'Revoking requires an accepted Insight.' : plan.detail,
          { insight: record.insight },
        );
      }
      const updated = await insights.update(command.insight_id, {
        state: plan.next_state,
        updated_at: now(),
      });
      const event = buildInsightStateEvent({
        insight_id: command.insight_id,
        from_state: record.insight.state,
        to_state: plan.next_state,
        trigger: plan.event_trigger,
        occurred_at: now(),
      });
      await insights.appendStateEvent(event);
      const outcome: InsightActionOutcome = {
        kind: 'applied',
        insight: updated.insight,
        view: await viewOf(updated),
        event,
        idempotent_replay: false,
      };
      ledger.write(command.operation_id, outcome);
      return outcome;
    },

    /**
     * A CONTENT modification (§22 / `D-040`).
     *
     * 🔴 Any of ① proposition ② applicable scope ③ the reference set ④ judgement basis demotes the
     *    `Insight` to `candidate` from ANY state and re-runs `E1`-`E4` immediately.
     * 🔴 Adding / removing a reference or replacing its `role` / `source_field_path` is a CONTENT
     *    edit, never a metadata edit.
     */
    async editInsightContent(command: EditInsightContentCommand): Promise<InsightActionOutcome> {
      const replay = ledger.read<InsightActionOutcome>(command.operation_id);
      if (replay !== null) {
        return { ...replay, idempotent_replay: true } as InsightActionOutcome;
      }
      const record = await readRecord(command.insight_id);
      if (record === null) {
        return actionRejection('INSIGHT_NOT_FOUND', `No Insight exists for "${command.insight_id}".`);
      }
      const touches_content =
        command.proposition !== undefined ||
        command.applicable_scope !== undefined ||
        command.judgment_basis !== undefined ||
        command.evidence_selections !== undefined;
      if (!touches_content) {
        return actionRejection(
          'INVALID_COMMAND',
          'A content edit must change at least one content field; a metadata-only change belongs to editInsightMeta.',
          { insight: record.insight },
        );
      }

      const proposition = command.proposition ?? record.insight.proposition;
      const applicable_scope = command.applicable_scope ?? record.insight.applicable_scope;
      const judgment_basis = command.judgment_basis ?? record.insight.judgment_basis;

      for (const text of [proposition, applicable_scope, judgment_basis]) {
        if (text.trim().length === 0) {
          return actionRejection(
            'INVALID_COMMAND',
            'A content field must not be blank; 「未知 / 未提供」 is expressed by omitting the change, not by an empty string (AC-04).',
            { insight: record.insight },
          );
        }
        const wording = findForbiddenProofWording(text);
        if (wording.length > 0) {
          return actionRejection(
            'INVALID_COMMAND',
            `The content asserts a proven fact (${wording.join(', ')}); an Insight stays an Inference for its whole life (D-038).`,
            { insight: record.insight },
          );
        }
      }

      let evidence_refs: readonly EvidenceRef[] = record.insight.evidence_refs;
      let comparison_ref = record.comparison_ref;
      if (command.evidence_selections !== undefined) {
        const derivation = await derivations.readCurrent(record.insight.attempt_id);
        if (derivation === null) {
          return actionRejection(
            'INVALID_COMMAND',
            'The reference set can only be changed against the CURRENT retrieval derivation, and this record has none.',
            { insight: record.insight },
          );
        }
        const evidence = buildInsightEvidence({
          insight_id: command.insight_id,
          selections: command.evidence_selections,
          derivation,
          historical_attempts: await readHistorical(),
          created_at: now(),
        });
        if (evidence.kind === 'refused') {
          return actionRejection(
            'EVIDENCE_SELECTION_REFUSED',
            evidence.detail,
            { insight: record.insight, rejections: evidence.rejections, retryable: true },
          );
        }
        evidence_refs = evidence.evidence_refs;
        comparison_ref = evidence.comparison_ref;
      }

      /* 🔴 The single-record generalization limit is re-checked against the NEW evidence base. */
      const guard = singleSourceGeneralizationGuard({
        distinct_evidence_targets: new Set(evidence_refs.map((ref) => ref.target_id)).size,
        proposition,
      });
      if (!guard.allowed) {
        return actionRejection('INVALID_COMMAND', guard.detail, { insight: record.insight });
      }

      const plan = planInsightTransition(record.insight.state, 'edit_content', false);
      if (!plan.ok || plan.event_trigger === null) {
        return actionRejection('NOT_A_CANONICAL_TRANSITION', plan.ok ? 'No content edit path exists.' : plan.detail, {
          insight: record.insight,
        });
      }

      const rechecked = await recheckGates(
        {
          insight: { ...record.insight, proposition, applicable_scope, judgment_basis, evidence_refs },
          comparison_ref,
        },
        /* 🔴 `§24`: a content modification re-runs E1-E4 with a FRESH `E2` / `E3` AI judgement. */
        { rejudge_content: true },
      );
      if (rechecked.kind === 'runtime_failure') {
        /*
         * 🔴 Atomic refusal: the edit is NOT stored. Storing content whose mandatory re-check never
         *    completed would leave a presentation describing content that is no longer there, and
         *    an accepted Insight would keep an `accepted` state that no check supports.
         */
        return rechecked;
      }

      const updated = await insights.update(command.insight_id, {
        state: plan.next_state,
        proposition,
        applicable_scope,
        judgment_basis,
        evidence_refs,
        comparison_ref,
        gate_checks: rechecked.checks,
        updated_at: now(),
      });
      const event = buildInsightStateEvent({
        insight_id: command.insight_id,
        from_state: record.insight.state,
        to_state: plan.next_state,
        trigger: plan.event_trigger,
        occurred_at: now(),
      });
      await insights.appendStateEvent(event);
      const outcome: InsightActionOutcome = {
        kind: 'applied',
        insight: updated.insight,
        view: await viewOf(updated),
        event,
        idempotent_replay: false,
      };
      ledger.write(command.operation_id, outcome);
      return outcome;
    },

    /**
     * A non-semantic / display-only edit (§23 / AC-64).
     * 🔴 The state never moves, `E1`-`E4` are not re-run and no event is written. A title or a
     *    display order can never cost an `accepted Insight` its `Experience Asset` status.
     */
    async editInsightMeta(command: EditInsightMetaCommand): Promise<InsightActionOutcome> {
      const replay = ledger.read<InsightActionOutcome>(command.operation_id);
      if (replay !== null) {
        return { ...replay, idempotent_replay: true } as InsightActionOutcome;
      }
      const record = await readRecord(command.insight_id);
      if (record === null) {
        return actionRejection('INSIGHT_NOT_FOUND', `No Insight exists for "${command.insight_id}".`);
      }
      if (command.title === undefined && command.display_order === undefined) {
        return actionRejection(
          'INVALID_COMMAND',
          'A metadata edit must change at least one display-only field.',
          { insight: record.insight },
        );
      }
      if (
        command.display_order !== undefined &&
        command.display_order !== null &&
        !Number.isInteger(command.display_order)
      ) {
        return actionRejection('INVALID_COMMAND', 'display_order must be an integer or null.', {
          insight: record.insight,
        });
      }

      const plan = planInsightTransition(record.insight.state, 'edit_meta', false);
      if (!plan.ok) {
        return actionRejection('NOT_A_CANONICAL_TRANSITION', plan.detail, { insight: record.insight });
      }

      const updated = await insights.update(command.insight_id, {
        meta: {
          title: command.title === undefined ? record.meta.title : command.title,
          display_order:
            command.display_order === undefined ? record.meta.display_order : command.display_order,
        },
        updated_at: now(),
      });
      const outcome: InsightActionOutcome = {
        kind: 'applied',
        insight: updated.insight,
        view: await viewOf(updated),
        event: null,
        idempotent_replay: false,
      };
      ledger.write(command.operation_id, outcome);
      return outcome;
    },

    /** Re-runs `E1`-`E4` on demand and stores the refreshed presentation (§24). */
    async recheckInsightGates(
      command: InsightIdCommand,
    ): Promise<InsightGateRecheckOutcome | InsightRuntimeFailure | InsightActionRejection> {
      const record = await readRecord(command.insight_id);
      if (record === null) {
        return actionRejection('INSIGHT_NOT_FOUND', `No Insight exists for "${command.insight_id}".`);
      }
      const rechecked = await recheckGates(record, { rejudge_content: false });
      if (rechecked.kind === 'runtime_failure') {
        return rechecked;
      }
      const updated = await insights.update(command.insight_id, {
        gate_checks: rechecked.checks,
        updated_at: now(),
      });
      return {
        kind: 'rechecked',
        insight: updated.insight,
        gate_checks: rechecked.checks,
        idempotent_replay: false,
      };
    },
  };
}

/** Exposed for diagnostics: the structural `E1` / `E4` verifiers of this module. */
export const insightStructuralVerifiers = { evaluateE1, evaluateE4 };

/** Re-exported for callers that need the evidence-line shape without importing `evidence.ts`. */
export type { InsightEvidenceLine };
