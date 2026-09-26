/**
 * S01 ｜ Deterministic fixture harness for the `M15` `D9` end-to-end suite.
 *
 * 🔴 NOT_A_REAL_LLM_OUTPUT: EVERY answer routed through this file is a HAND-WRITTEN fixture. A suite
 *    that passes here proves the ORCHESTRATION's behaviour; it verifies no model, no provider and
 *    makes no network call (`Real Provider Calls = 0`).
 * 🔴 The fake adapter implements the `M10` `ProviderAdapter` INTERFACE only. It constructs no
 *    browser-direct adapter, no proxy client and no registry - those are the composition root's job
 *    and are exercised in the browser-scope suite.
 * 🔴 EVERY service is the REAL one over the REAL workspace: `M4`/`M5` capture, `M6` retrieval, `M7`
 *    grounding, `M8` insights and `M9` hypotheses. The orchestration is therefore tested against real
 *    persisted artefacts, never against a parallel in-memory model.
 * 🔴 `FaultInjectingStorage` is the ONLY non-production object in the write path, and it exists solely
 *    to open the partial-write window `M8-HARDENING-01` is about. It FAILS ONCE and then gets out of
 *    the way, so a retry can prove the recovery really completes.
 */

import type { AiInvocation, ProviderAdapter } from '../../../ai/provider/adapter.js';
import type { ProviderCapability, ProviderConfig, ProviderPath, StructuredOutputMode } from '../../../ai/provider/capability.js';
import { resolveProviderPath } from '../../../ai/provider/capability.js';
import { providerId } from '../../../ai/provider/ids.js';
import type { AiError, AiResult } from '../../../ai/provider/result.js';
import { aiFailed, aiOk } from '../../../ai/provider/result.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';
import type { Attempt } from '../../../domain/types/attempt.js';
import type { LevelADimension } from '../../../domain/types/level-a.js';
import { fieldPathForLevelADimension } from '../../../domain/types/level-a.js';
import { InMemoryWorkspaceStorage } from '../../../workspace/memory-storage.js';
import { createAttemptRepository } from '../../../workspace/repository/attempt-repository.js';
import type { AttemptRepository } from '../../../workspace/repository/attempt-repository.js';
import { WorkspaceStorageError } from '../../../workspace/storage.js';
import type { WorkspaceEntry, WorkspaceStorage } from '../../../workspace/storage.js';
import { DIMENSION_JUDGE_SCHEMA_ID } from '../../../retrieval/compare/dimension-judge.js';
import { BATCH_DIMENSION_JUDGE_SCHEMA_ID } from '../../../retrieval/compare/batch-judge.js';
import { readBatchJudgePairs } from '../../retrieval/compare/harness.js';
import { createRetrievalDerivationRepository } from '../../../retrieval/compare/retrieval-derivation-repository.js';
import type { RetrievalDerivationRepository } from '../../../retrieval/compare/retrieval-derivation-repository.js';
import { createExperienceRetrievalService } from '../../../retrieval/compare/retrieval-service.js';
import type { ExperienceRetrievalService } from '../../../retrieval/compare/retrieval-service.js';
import { ATTEMPT_PARSE_SCHEMA_ID, CANDIDATE_CAUSE_SCHEMA_ID } from '../../../application/capture/schemas.js';
import { createAttemptCaptureService } from '../../../application/capture/capture-service.js';
import type { AttemptCaptureService } from '../../../application/capture/capture-service.js';
import { createInsightRepository } from '../../../application/insight/insight-repository.js';
import type { InsightRepository } from '../../../application/insight/insight-repository.js';
import { INSIGHT_GATE_RECHECK_SCHEMA_ID, INSIGHT_GENERATION_SCHEMA_ID } from '../../../application/insight/schemas.js';
import { createInsightService } from '../../../application/insight/insight-service.js';
import type { InsightService } from '../../../application/insight/types.js';
import { createHypothesisRepository } from '../../../application/hypothesis/hypothesis-repository.js';
import type { HypothesisRepository } from '../../../application/hypothesis/hypothesis-repository.js';
import { HYPOTHESIS_GENERATION_SCHEMA_ID, HYPOTHESIS_GROUNDING_CHECK_SCHEMA_ID } from '../../../application/hypothesis/schemas.js';
import { createHypothesisService } from '../../../application/hypothesis/hypothesis-service.js';
import type { HypothesisService } from '../../../application/hypothesis/types.js';
import { createD9WorkflowService } from '../../../application/workflow/workflow-service.js';
import type { D9WorkflowService, D9WorkflowSnapshot } from '../../../application/workflow/types.js';
import type {
  GenerateCandidateInsightsOutcome,
  InsightsGeneratedOutcome,
} from '../../../application/insight/types.js';
import type {
  GenerateHypothesesOutcome,
  HypothesesGeneratedOutcome,
} from '../../../application/hypothesis/types.js';
import {
  ID_DRAFT,
  ID_RELATED,
  ID_RELATED_SECOND,
  ID_SOURCE,
  ID_UNRELATED,
  ID_UNRELATED_SECOND,
  NOT_A_REAL_LLM_OUTPUT,
  SeededIds,
  generationAnswer,
  insightAnswer,
  makeClock,
  seedAttempt,
} from '../insight/harness.js';
import type { AttemptSpec } from '../insight/harness.js';
import {
  checkReply,
  generationAnswerOf,
  groundedAnswer,
  modelSuggestionAnswer,
} from '../hypothesis/harness.js';

export {
  ID_DRAFT,
  ID_RELATED,
  ID_RELATED_SECOND,
  ID_SOURCE,
  ID_UNRELATED,
  ID_UNRELATED_SECOND,
  NOT_A_REAL_LLM_OUTPUT,
  generationAnswer,
  insightAnswer,
  checkReply,
  generationAnswerOf,
  groundedAnswer,
  modelSuggestionAnswer,
};

export function at(value: string): ObjectId<'ATT'> {
  return value as ObjectId<'ATT'>;
}

export function insightIdOf(value: string): ObjectId<'INS'> {
  return value as ObjectId<'INS'>;
}

export function hypothesisIdOf(value: string): ObjectId<'HYP'> {
  return value as ObjectId<'HYP'>;
}

/**
 * A TWO-candidate step ⑧ answer.
 *
 * 🔴 The second candidate exists so the fault-injection suites can open the real crash window: with a
 *    single candidate there is only ONE sidecar write and the window between two records cannot be
 *    reproduced.
 */
export function twoInsightAnswer(): Readonly<Record<string, unknown>> {
  return generationAnswer([
    insightAnswer(),
    insightAnswer({
      proposition: '在当前条件下，先按 S2 方案测试再复核，颜色变化仍未达到目标范围。',
      evidence_selections: [
        insightSelection(ID_RELATED_SECOND, levelAPath(ID_RELATED_SECOND, 'goal'), 'support'),
      ],
    }),
  ]);
}

/** The `source_field_path` of one Level A dimension - read from the FROZEN mapping, never re-spelled. */
export function levelAPath(attempt_id: string, dimension: LevelADimension): string {
  return `${fieldPathForLevelADimension(dimension)}#${attempt_id}:${dimension}`;
}

export function insightSelection(
  target_id: string,
  source_field_path: string,
  role: 'grounding' | 'support' | 'contradict' | 'context',
): Readonly<Record<string, unknown>> {
  return { target_id, source_field_path, role };
}

export function hypothesisSelection(
  target_id: string,
  source_field_path: string,
  role: 'grounding' | 'support' | 'contradict' | 'context',
  grounding_basis: string | null = 'G1',
): Readonly<Record<string, unknown>> {
  return { target_id, source_field_path, role, grounding_basis };
}

/* ------------------------------------------------------------------ *
 * Hand-written step ② / ④ payloads
 * ------------------------------------------------------------------ */

/**
 * The step ② answer.
 *
 * 🔴 The four Level A carriers are filled with values a test can MATCH against a seeded historical
 *    record, so relatedness comes from byte-identical Level A values - never from the test double.
 */
export function parsePayload(
  overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return {
    parse_status: 'partially_extracted',
    goal: 'G',
    actual_attempt: 'S1',
    condition: 'C1',
    actual_result: 'R1',
    ...overrides,
  };
}

/** The step ④ answer. `causes: []` is legal and is NOT an error (`AC-91`). */
export function causePayload(
  statements: readonly string[] = [`${NOT_A_REAL_LLM_OUTPUT}: 条件没有控制住`],
  absence_note = '',
): Readonly<Record<string, unknown>> {
  return {
    causes: statements.map((statement) => ({
      statement,
      supporting_source_paths: ['condition'],
    })),
    cause_absence_note: absence_note,
  };
}

/** The `E2` / `E3` re-check answer used by a content edit. */
export function gateRecheckPayload(
  overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return {
    e2_check: 'pass',
    e2_reason: `${NOT_A_REAL_LLM_OUTPUT}: 命题明确`,
    e3_check: 'pass',
    e3_reason: `${NOT_A_REAL_LLM_OUTPUT}: 适用范围已说明`,
    missing_items: [],
    ...overrides,
  };
}

/* ------------------------------------------------------------------ *
 * The seven-schema fake provider
 * ------------------------------------------------------------------ */

export interface WorkflowProviderCall {
  readonly schema_id: string | null;
  readonly messages: readonly string[];
  readonly user_message: string;
}

export type WorkflowReplySource =
  | Readonly<Record<string, unknown>>
  | ((call: WorkflowProviderCall, index: number) => Readonly<Record<string, unknown>>);

function resolveReply(source: WorkflowReplySource, call: WorkflowProviderCall, index: number) {
  return typeof source === 'function' ? source(call, index) : source;
}

export interface WorkflowFakeProvider {
  readonly adapter: ProviderAdapter;
  readonly invocations: readonly AiInvocation[];
  readonly calls: readonly WorkflowProviderCall[];
  /** Only the step ⑥ dimension-judge calls. */
  readonly judge_calls: readonly WorkflowProviderCall[];
  /** Only the step ⑧ generation calls. */
  readonly insight_calls: readonly WorkflowProviderCall[];
  /** Only the step ⑨ generation calls. */
  readonly hypothesis_calls: readonly WorkflowProviderCall[];
  /** Only the step ⑨ independent grounding-check calls. */
  readonly check_calls: readonly WorkflowProviderCall[];
  /** Only the step ② / ④ capture calls. */
  readonly capture_calls: readonly WorkflowProviderCall[];
  /**
   * 🔴 A MUTABLE fault switch. A test that has to prove "the provider RECOVERED" clears the entry
   *    mid-test; nothing else about the fake changes, so the recovery is observable in the outcomes.
   */
  readonly faults: ProviderFaultSwitch;
}

/** Which step currently fails. `null` means "this step answers normally". */
export interface ProviderFaultSwitch {
  step_6: AiError | null;
  step_8: AiError | null;
  step_9: AiError | null;
}

export interface WorkflowFakeProviderOptions {
  readonly parse?: WorkflowReplySource;
  readonly cause?: WorkflowReplySource;
  readonly judge?: WorkflowReplySource;
  readonly insight?: WorkflowReplySource;
  readonly gate_recheck?: WorkflowReplySource;
  readonly hypothesis?: WorkflowReplySource;
  readonly check?: WorkflowReplySource;
  /** When set, every step ⑥ dimension-judge call fails with this `AiError`. */
  readonly fail_step_6_with?: AiError;
  /** When set, every step ⑧ generation call fails with this `AiError`. */
  readonly fail_step_8_with?: AiError;
  /** When set, every step ⑨ generation call fails with this `AiError`. */
  readonly fail_step_9_with?: AiError;
  readonly structured_output?: StructuredOutputMode;
  readonly model?: string;
}

export function createWorkflowFakeProvider(
  options: WorkflowFakeProviderOptions = {},
): WorkflowFakeProvider {
  const capability: ProviderCapability = {
    structured_output: options.structured_output ?? 'native_schema',
    browser_direct: true,
    thin_proxy: false,
  };
  const path_resolution = resolveProviderPath(capability);
  const path: ProviderPath =
    path_resolution.kind === 'resolved' ? path_resolution.path : 'browser_direct';
  const config: ProviderConfig = {
    provider_id: providerId('fake-workflow-provider'),
    display_name: 'Fake provider (test double)',
    model: options.model ?? 'fake-model-1',
    base_url: null,
    base_url_source: 'registered_fixed',
    capability,
  };

  const invocations: AiInvocation[] = [];
  const calls: WorkflowProviderCall[] = [];
  const judge_calls: WorkflowProviderCall[] = [];
  const insight_calls: WorkflowProviderCall[] = [];
  const hypothesis_calls: WorkflowProviderCall[] = [];
  const check_calls: WorkflowProviderCall[] = [];
  const capture_calls: WorkflowProviderCall[] = [];
  const faults: ProviderFaultSwitch = {
    step_6: options.fail_step_6_with ?? null,
    step_8: options.fail_step_8_with ?? null,
    step_9: options.fail_step_9_with ?? null,
  };

  const sources = {
    parse: options.parse ?? parsePayload(),
    cause: options.cause ?? causePayload(),
    judge: options.judge ?? { verdict: 'compared_not_matched', reason: NOT_A_REAL_LLM_OUTPUT },
    insight: options.insight ?? generationAnswer([insightAnswer()]),
    gate_recheck: options.gate_recheck ?? gateRecheckPayload(),
    hypothesis: options.hypothesis ?? generationAnswerOf([groundedAnswer()]),
    check: options.check ?? checkReply(),
  } as const;

  const adapter: ProviderAdapter = {
    provider_id: config.provider_id,
    config,
    capability,
    path,
    path_resolution,
    async execute(invocation: AiInvocation) {
      const index = invocations.length;
      invocations.push(invocation);
      const schema_id = invocation.request.structured_output?.schema_id ?? null;
      const call: WorkflowProviderCall = {
        schema_id,
        messages: invocation.request.messages.map((message) => message.content),
        user_message:
          invocation.request.messages.find((message) => message.role === 'user')?.content ?? '',
      };
      calls.push(call);

      const answer = (source: WorkflowReplySource): AiResult => {
        const value = resolveReply(source, call, index);
        return aiOk(JSON.stringify(value), 200, value);
      };

      switch (schema_id) {
        case ATTEMPT_PARSE_SCHEMA_ID:
        case CANDIDATE_CAUSE_SCHEMA_ID: {
          capture_calls.push(call);
          return answer(
            schema_id === ATTEMPT_PARSE_SCHEMA_ID ? sources.parse : sources.cause,
          );
        }
        case DIMENSION_JUDGE_SCHEMA_ID: {
          judge_calls.push(call);
          if (faults.step_6 !== null) {
            return aiFailed(faults.step_6);
          }
          return answer(sources.judge);
        }
        /*
         * 🔴 FINAL-RAPID-A: step ⑥ now asks for every undecided pair in ONE request
         *    (`level-a-dimension-judge-batch-v1`). This double keeps its single-pair script and
         *    expands that same verdict across the requested pairs, so every existing workflow
         *    fixture answers a retrieval exactly as it did before the batching change - it simply
         *    does so in one provider call instead of one call per pair.
         */
        case BATCH_DIMENSION_JUDGE_SCHEMA_ID: {
          judge_calls.push(call);
          if (faults.step_6 !== null) {
            return aiFailed(faults.step_6);
          }
          const scripted = resolveReply(sources.judge, call, index);
          const judgments = readBatchJudgePairs(invocation.request).map((pair) => ({
            candidate_id: pair.candidate_id,
            dimension: pair.dimension,
            verdict: scripted['verdict'],
            reason: scripted['reason'],
          }));
          return aiOk(JSON.stringify({ judgments }), 200, { judgments });
        }
        case INSIGHT_GENERATION_SCHEMA_ID: {
          insight_calls.push(call);
          if (faults.step_8 !== null) {
            return aiFailed(faults.step_8);
          }
          return answer(sources.insight);
        }
        case INSIGHT_GATE_RECHECK_SCHEMA_ID: {
          return answer(sources.gate_recheck);
        }
        case HYPOTHESIS_GENERATION_SCHEMA_ID: {
          hypothesis_calls.push(call);
          if (faults.step_9 !== null) {
            return aiFailed(faults.step_9);
          }
          return answer(sources.hypothesis);
        }
        case HYPOTHESIS_GROUNDING_CHECK_SCHEMA_ID: {
          check_calls.push(call);
          return answer(sources.check);
        }
        default:
          return aiFailed({
            code: 'INTERNAL_UNEXPECTED',
            failure_kind: 'internal',
            message: 'An unexpected internal failure occurred.',
            retryable: false,
            path: null,
            http_status: null,
            target_block_reason: null,
          });
      }
    },
  };

  return {
    adapter,
    invocations,
    calls,
    judge_calls,
    insight_calls,
    hypothesis_calls,
    check_calls,
    capture_calls,
    faults,
  };
}

/** The canonical unreachable-provider failure (an `M10` table entry, never a fabricated string). */
export function timeoutError(): AiError {
  return {
    code: 'PROVIDER_TIMEOUT',
    failure_kind: 'timeout',
    message: 'The provider request timed out.',
    retryable: true,
    path: 'browser_direct',
    http_status: null,
    target_block_reason: null,
  };
}

/* ------------------------------------------------------------------ *
 * Fault-injecting storage (M8-HARDENING-01)
 * ------------------------------------------------------------------ */

/**
 * Wraps a storage and fails ONE matching write.
 *
 * 🔴 It exists to open the EXACT window `M8-HARDENING-01` is about - a crash between two writes of one
 *    generation - and nothing else. It fails once, then disarms, so the retry in the same test can
 *    prove that the recovery really COMPLETES instead of failing forever.
 */
export class FaultInjectingStorage implements WorkspaceStorage {
  readonly kind = 'fault-injecting';

  private readonly inner: WorkspaceStorage;
  private readonly should_fail: (path: string) => boolean;
  private armed = true;

  /** How many writes were attempted, and how many of them were injected failures. */
  write_attempts = 0;
  write_failures = 0;

  constructor(inner: WorkspaceStorage, should_fail: (path: string) => boolean) {
    this.inner = inner;
    this.should_fail = should_fail;
  }

  /** Re-arms the injector for a second failure. */
  arm(): void {
    this.armed = true;
  }

  async exists(path: string): Promise<boolean> {
    return this.inner.exists(path);
  }

  async readFile(path: string): Promise<string> {
    return this.inner.readFile(path);
  }

  async writeFile(path: string, contents: string): Promise<void> {
    this.write_attempts += 1;
    if (this.armed && this.should_fail(path)) {
      this.armed = false;
      this.write_failures += 1;
      throw new WorkspaceStorageError('INVALID_PATH', path, 'INJECTED WRITE FAILURE');
    }
    return this.inner.writeFile(path, contents);
  }

  async list(path: string): Promise<readonly WorkspaceEntry[]> {
    return this.inner.list(path);
  }

  async move(fromPath: string, toPath: string): Promise<void> {
    return this.inner.move(fromPath, toPath);
  }
}

/** Fails the Nth write whose path matches `predicate`. */
export function failOnNthMatchingWrite(
  predicate: (path: string) => boolean,
  n: number,
): (path: string) => boolean {
  let seen = 0;
  return (path) => {
    if (!predicate(path)) {
      return false;
    }
    seen += 1;
    return seen === n;
  };
}

/** The `Insight` sidecar writes of one generation (never the batch record, never the anchor). */
export function insightSidecarPredicate(path: string): boolean {
  return (
    path.startsWith('insights/') &&
    path.endsWith('.json') &&
    !path.startsWith('insights/batches/') &&
    !path.startsWith('insights/operations/')
  );
}

/** The batch-record write of one generation. */
export function insightBatchPredicate(path: string): boolean {
  return path.startsWith('insights/batches/');
}

/* ------------------------------------------------------------------ *
 * The harness
 * ------------------------------------------------------------------ */

export interface WorkflowHarness {
  /** The inspectable workspace (the inner storage when a fault injector wraps it). */
  readonly storage: InMemoryWorkspaceStorage;
  /** The storage the repositories really write to (the injector, when one is installed). */
  readonly write_storage: WorkspaceStorage;
  readonly provider: WorkflowFakeProvider;
  readonly ids: SeededIds;

  readonly workflow: D9WorkflowService;
  readonly attempts: AttemptRepository;
  readonly derivations: RetrievalDerivationRepository;
  readonly retrieval: ExperienceRetrievalService;
  readonly insights: InsightRepository;
  readonly hypotheses: HypothesisRepository;
  readonly capture: AttemptCaptureService;
  readonly insight_service: InsightService;
  readonly hypothesis_service: HypothesisService;

  /** A brand-new object graph over the SAME persisted workspace. */
  reopen(): D9WorkflowService;
  seed(spec: AttemptSpec): Promise<Attempt>;
  insightFiles(): readonly string[];
  batchFiles(): readonly string[];
  anchorFiles(): readonly string[];
  hypothesisFiles(): readonly string[];
  hypothesisBatchFiles(): readonly string[];
  hypothesisAnchorFiles(): readonly string[];
  retrievalFiles(): readonly string[];
  /** Every file path in the workspace, sorted. */
  paths(): readonly string[];
  peek(path: string): string | undefined;
}

export interface WorkflowHarnessOptions extends WorkflowFakeProviderOptions {
  /** Install a fault injector over the workspace, failing one matching write. */
  readonly fault?: (path: string) => boolean;
  /**
   * Supply the workspace outright, so a PERMISSION failure can be produced deterministically.
   * 🔴 The installed storage is what the repositories write through; `storage` stays the inspectable
   *    in-memory handle when the supplied storage IS one.
   */
  readonly storage?: WorkspaceStorage;
  /** The workflow's internal diagnostics sink. 🔴 The only place a raw thrown value may go. */
  readonly on_internal_error?: (diagnostic: {
    readonly stage: string;
    readonly original_error: unknown;
  }) => void;
}

export function makeWorkflowHarness(
  options: WorkflowHarnessOptions = {},
): WorkflowHarness {
  const supplied = options.storage;
  const inspect =
    supplied instanceof InMemoryWorkspaceStorage ? supplied : new InMemoryWorkspaceStorage();
  const write: WorkspaceStorage =
    supplied ?? (options.fault === undefined ? inspect : new FaultInjectingStorage(inspect, options.fault));
  const ids = new SeededIds();
  const clock = makeClock();
  const provider = createWorkflowFakeProvider(options);

  let insight_sequence = 0;
  const newInsightId = (): ObjectId<'INS'> => {
    insight_sequence += 1;
    return `INS_${String(insight_sequence).padStart(26, '0')}` as ObjectId<'INS'>;
  };
  let hypothesis_sequence = 0;
  const newHypothesisId = (): ObjectId<'HYP'> => {
    hypothesis_sequence += 1;
    return `HYP_${String(hypothesis_sequence).padStart(26, '0')}` as ObjectId<'HYP'>;
  };

  const open = (): {
    readonly workflow: D9WorkflowService;
    readonly attempts: AttemptRepository;
    readonly capture: AttemptCaptureService;
    readonly insights: InsightRepository;
    readonly hypotheses: HypothesisRepository;
    readonly insight_service: InsightService;
    readonly hypothesis_service: HypothesisService;
  } => {
    const attempts = createAttemptRepository({
      storage: write,
      now: clock,
      newAttemptId: ids.next,
    });
    const derivations = createRetrievalDerivationRepository({ storage: write });
    const insights = createInsightRepository({ storage: write });
    const hypotheses = createHypothesisRepository({ storage: write });
    const provider_context = { adapter: provider.adapter, credential_ref: null };

    const retrieval = createExperienceRetrievalService({
      repository: attempts,
      derivations,
      provider: provider_context,
      now: clock,
    });
    const capture = createAttemptCaptureService({ repository: attempts, provider: provider_context });
    const insight_service = createInsightService({
      insights,
      attempts,
      derivations,
      provider: provider_context,
      now: clock,
      newInsightId,
    });
    const hypothesis_service = createHypothesisService({
      hypotheses,
      attempts,
      derivations,
      insights: insight_service,
      provider: provider_context,
      now: clock,
      newHypothesisId,
    });

    const workflow = createD9WorkflowService({
      ports: { capture, retrieval, attempts, insights: insight_service, hypotheses: hypothesis_service },
      ...(options.on_internal_error === undefined
        ? {}
        : { on_internal_error: options.on_internal_error }),
    });
    return { workflow, attempts, capture, insights, hypotheses, insight_service, hypothesis_service };
  };

  const first = open();

  return {
    storage: inspect,
    write_storage: write,
    provider,
    ids,
    workflow: first.workflow,
    attempts: first.attempts,
    derivations: createRetrievalDerivationRepository({ storage: write }),
    retrieval: createExperienceRetrievalService({
      repository: createAttemptRepository({ storage: write, now: clock, newAttemptId: ids.next }),
      derivations: createRetrievalDerivationRepository({ storage: write }),
      provider: { adapter: provider.adapter, credential_ref: null },
      now: clock,
    }),
    insights: first.insights,
    hypotheses: first.hypotheses,
    capture: first.capture,
    insight_service: first.insight_service,
    hypothesis_service: first.hypothesis_service,
    reopen: () => open().workflow,
    seed: (spec) =>
      seedAttempt(
        createAttemptRepository({ storage: write, now: clock, newAttemptId: ids.next }),
        ids,
        spec,
      ),
    insightFiles: () =>
      Object.keys(inspect.snapshot()).filter(
        (path) =>
          path.startsWith('insights/') &&
          path.endsWith('.json') &&
          !path.startsWith('insights/batches/') &&
          !path.startsWith('insights/operations/'),
      ),
    batchFiles: () =>
      Object.keys(inspect.snapshot()).filter((path) => path.startsWith('insights/batches/')),
    anchorFiles: () =>
      Object.keys(inspect.snapshot()).filter((path) => path.startsWith('insights/operations/')),
    hypothesisFiles: () =>
      Object.keys(inspect.snapshot()).filter(
        (path) =>
          path.startsWith('hypotheses/') &&
          path.endsWith('.json') &&
          !path.startsWith('hypotheses/batches/') &&
          !path.startsWith('hypotheses/operations/'),
      ),
    hypothesisBatchFiles: () =>
      Object.keys(inspect.snapshot()).filter((path) => path.startsWith('hypotheses/batches/')),
    hypothesisAnchorFiles: () =>
      Object.keys(inspect.snapshot()).filter((path) => path.startsWith('hypotheses/operations/')),
    retrievalFiles: () =>
      Object.keys(inspect.snapshot()).filter((path) => path.startsWith('retrievals/')),
    paths: () => Object.keys(inspect.snapshot()),
    peek: (path) => inspect.peek(path),
  };
}

/**
 * The historical corpus: two records related to `G` / `C1`, plus two unrelated records in other
 * projects.
 *
 * 🔴 It deliberately does NOT seed the source record: the end-to-end suite CREATES its source through
 *    step ①, and `M6`'s corpus filter is what decides what counts as history. A suite that needs the
 *    source to pre-exist uses {@link seedSource} explicitly.
 */
export async function seedHistoricalCorpus(harness: WorkflowHarness): Promise<void> {
  await harness.seed({
    attempt_id: ID_RELATED,
    project_id: 'PRJ_other',
    goal: 'G',
    approach: 'S2',
    condition: 'C1',
    result: 'R2',
  });
  await harness.seed({
    attempt_id: ID_RELATED_SECOND,
    project_id: 'PRJ_shared',
    goal: 'G',
    approach: 'S3',
    condition: 'C3',
    result: 'R3',
  });
  await harness.seed({
    attempt_id: ID_UNRELATED,
    project_id: 'PRJ_shared',
    goal: 'X1',
    approach: 'S5',
    condition: 'C5',
    result: 'R5',
  });
  await harness.seed({
    attempt_id: ID_UNRELATED_SECOND,
    project_id: 'PRJ_third',
    goal: 'X2',
    approach: 'S6',
    condition: 'C6',
    result: 'R6',
  });
}

/**
 * The source record, seeded directly as a `Formal` attempt.
 *
 * 🔴 Used by the suites that test one step in isolation. The end-to-end suite never calls this - it
 *    walks ①–⑤ for real.
 */
export async function seedSource(harness: WorkflowHarness): Promise<void> {
  await harness.seed({
    attempt_id: ID_SOURCE,
    project_id: 'PRJ_shared',
    goal: 'G',
    approach: 'S1',
    condition: 'C1',
    result: 'R1',
  });
}

/**
 * The corpus, the source AND step ⑥ already run through the real `M6` service - the fixture every
 * step-level suite starts from.
 *
 * 🔴 Retrieval is run through the WORKFLOW command, so the derivation, the catalog and the later
 *    references are real persisted artefacts rather than a parallel in-memory model.
 */
export async function seedHistory(harness: WorkflowHarness): Promise<void> {
  await seedHistoricalCorpus(harness);
  await seedSource(harness);
  await primeRetrieval(harness, ID_SOURCE);
}

/** Runs step ⑥ for one record through the workflow command. */
export async function primeRetrieval(
  harness: WorkflowHarness,
  attempt_id: string,
  operation_id = `fixture-retrieval:${attempt_id}`,
): Promise<void> {
  const outcome = await harness.workflow.rerunRetrieval({
    operation_id,
    attempt_id: at(attempt_id),
  });
  if (outcome.value?.kind !== 'completed') {
    throw new Error(
      `the fixture step ⑥ did not complete for "${attempt_id}": ${outcome.value?.kind ?? outcome.kind}`,
    );
  }
}

/** A `Draft`-only workspace, so a `HISTORY_EMPTY` retrieval is reproducible. */
export async function seedDraftOnly(harness: WorkflowHarness): Promise<void> {
  await harness.seed({
    attempt_id: ID_DRAFT,
    state: 'Draft',
    goal: 'G',
    approach: 'S4',
    condition: 'C4',
    result: 'R4',
  });
}

/** Re-exported so a test can type the provider adapter without the `src/ai` path. */
export type { ProviderAdapter };

/* ------------------------------------------------------------------ *
 * Steps ①–⑤ helpers (the real chain, never a fabricated record)
 * ------------------------------------------------------------------ */

export interface StartedSource {
  readonly attempt_id: ObjectId<'ATT'>;
  readonly begin: Awaited<ReturnType<D9WorkflowService['beginCapture']>>;
  readonly confirmation: Awaited<ReturnType<D9WorkflowService['applyStructuredConfirmation']>>;
}

/**
 * Runs steps ①–③ for real: begin the capture (which calls the fake step ② parser), then apply the
 * structured confirmation.
 *
 * 🔴 No repository short-cut: the `Attempt` really goes through the capture service, so the record the
 *    end-to-end suite uses downstream is exactly what a user action would have produced.
 */
export async function startSource(
  harness: WorkflowHarness,
  operation_id: string,
  raw_text = '一次没有达到目标的尝试',
): Promise<StartedSource> {
  const begin = await harness.workflow.beginCapture({ operation_id, raw_text });
  const attempt = begin.value?.attempt ?? null;
  if (attempt === null) {
    throw new Error(`the fixture step ① did not produce a Draft: ${begin.kind}`);
  }
  const confirmation = await harness.workflow.applyStructuredConfirmation({
    operation_id,
    confirmation: {
      operation_id,
      attempt_id: attempt.attempt_id,
      user_confirmed: true,
      /*
       * 🔴 The Formal gate requires a CONFIRMED outcome status, not a pending AI proposal. Confirming
       *    it is a USER action, so the fixture performs it explicitly instead of leaving the status
       *    `unresolved` (which would keep the record a Draft and never trigger step ⑥).
       */
      result_status: { decision: 'accepted', value: 'Failed' },
    },
  });
  return { attempt_id: attempt.attempt_id, begin, confirmation };
}

/** Steps ①–⑤, leaving a `Formal` record with step ⑥ already triggered by the save. */
export async function startAndFormalize(
  harness: WorkflowHarness,
  operation_id: string,
  raw_text = '一次没有达到目标的尝试',
): Promise<{ readonly attempt_id: ObjectId<'ATT'>; readonly save: Awaited<ReturnType<D9WorkflowService['saveFormalAttempt']>> }> {
  const started = await startSource(harness, operation_id, raw_text);
  const save = await harness.workflow.saveFormalAttempt({
    operation_id,
    attempt_id: started.attempt_id,
    user_explicitly_confirmed: true,
  });
  return { attempt_id: started.attempt_id, save };
}

/** Unwraps a delegated outcome, failing loudly when the workflow refused instead. */
export function valueOf<T>(result: { readonly kind: string; readonly value: T | null; readonly notice: { readonly code: string; readonly message: string } | null }): T {
  if (result.value === null) {
    throw new Error(
      `the workflow returned "${result.kind}" instead of an outcome` +
        (result.notice === null ? '' : ` (${result.notice.code}: ${result.notice.message})`),
    );
  }
  return result.value;
}

/** Narrows a step ⑧ outcome to the `generated` member, failing loudly otherwise. */
export function expectGeneratedInsights(
  value: GenerateCandidateInsightsOutcome,
): InsightsGeneratedOutcome {
  if (value.kind !== 'generated') {
    throw new Error(`expected a generated step ⑧ outcome, received "${value.kind}"`);
  }
  return value;
}

/** Narrows a step ⑨ outcome to the `generated` member, failing loudly otherwise. */
export function expectGeneratedHypotheses(
  value: GenerateHypothesesOutcome,
): HypothesesGeneratedOutcome {
  if (value.kind !== 'generated') {
    throw new Error(`expected a generated step ⑨ outcome, received "${value.kind}"`);
  }
  return value;
}

/**
 * Reads the workflow snapshot, failing loudly when the read did not produce one.
 *
 * 🔴 The read result is a THREE-way union (`snapshot` / `not_found` / `unavailable`), so a test that
 *    expects a snapshot has to say so; a bare `null` check could not tell "no such record" from "the
 *    workspace could not be read".
 */
export async function readSnapshot(
  workflow: D9WorkflowService,
  attempt_id: ObjectId<'ATT'>,
): Promise<D9WorkflowSnapshot> {
  const result = await workflow.readWorkflow(attempt_id);
  if (result.kind !== 'snapshot') {
    throw new Error(`the workflow read returned "${result.kind}" instead of a snapshot`);
  }
  return result.snapshot;
}
