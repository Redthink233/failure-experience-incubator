/**
 * S01 ｜ Deterministic fixture harness for the `M9` Hypothesis suite.
 *
 * 🔴 NOT_A_REAL_LLM_OUTPUT: every step ⑨ answer, every independent grounding check answer, every
 *    `M6` dimension verdict and every step ⑧ answer produced through this file is a HAND-WRITTEN
 *    fixture. A suite that passes here proves the APPLICATION's behaviour - it verifies no model, no
 *    provider and makes no network call (Real Provider Calls = NOT EXECUTED).
 * 🔴 The fake adapter implements the `M10` `ProviderAdapter` INTERFACE only; it constructs no
 *    browser-direct adapter, no proxy client and no registry. It reads the REAL request, so a test can
 *    also assert what the application actually sent - including "only the minimal context was sent".
 * 🔴 Relatedness in the fixtures comes from DETERMINISTICALLY matched Level A values (two byte-identical
 *    strings), so it never depends on the test double's verdict.
 * 🔴 Attempts are seeded through the REAL repository and the retrieval runs through the REAL `M6`
 *    service, so the derivation, the catalog and the references are real persisted artefacts and not a
 *    parallel in-memory model.
 */

import type { AiInvocation, ProviderAdapter } from '../../../ai/provider/adapter.js';
import type {
  ProviderCapability,
  ProviderConfig,
  ProviderPath,
  StructuredOutputMode,
} from '../../../ai/provider/capability.js';
import { resolveProviderPath } from '../../../ai/provider/capability.js';
import { providerId } from '../../../ai/provider/ids.js';
import type { AiError } from '../../../ai/provider/result.js';
import { aiFailed, aiOk } from '../../../ai/provider/result.js';
import { factItem } from '../../../domain/types/source-type.js';
import { provided } from '../../../domain/types/presence.js';
import { fieldPathForLevelADimension } from '../../../domain/types/level-a.js';
import type { LevelADimension } from '../../../domain/types/level-a.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';
import type { Attempt } from '../../../domain/types/attempt.js';
import { InMemoryWorkspaceStorage } from '../../../workspace/memory-storage.js';
import { createAttemptRepository } from '../../../workspace/repository/attempt-repository.js';
import type { AttemptPatch, AttemptRepository } from '../../../workspace/repository/attempt-repository.js';
import type { WorkspaceStorage } from '../../../workspace/storage.js';
import { WorkspaceStorageError } from '../../../workspace/storage.js';
import type { WorkspaceEntry } from '../../../workspace/storage.js';
import { createExperienceRetrievalService } from '../../../retrieval/compare/retrieval-service.js';
import type {
  ExperienceRetrievalService,
  RetrievalProviderContext,
} from '../../../retrieval/compare/retrieval-service.js';
import { createRetrievalDerivationRepository } from '../../../retrieval/compare/retrieval-derivation-repository.js';
import type { RetrievalDerivationRepository } from '../../../retrieval/compare/retrieval-derivation-repository.js';
import type { RetrievalDerivationRecord } from '../../../retrieval/compare/types.js';
import { DIMENSION_JUDGE_SCHEMA_ID } from '../../../retrieval/compare/dimension-judge.js';
import { BATCH_DIMENSION_JUDGE_SCHEMA_ID } from '../../../retrieval/compare/batch-judge.js';
import { readBatchJudgePairs } from '../../retrieval/compare/harness.js';
import { createInsightRepository } from '../../../application/insight/insight-repository.js';
import type { InsightRepository } from '../../../application/insight/insight-repository.js';
import { INSIGHT_GENERATION_SCHEMA_ID } from '../../../application/insight/schemas.js';
import { createInsightService } from '../../../application/insight/insight-service.js';
import {
  generationAnswer,
  insightAnswer,
  seedAttempt,
  SeededIds,
  makeClock,
  NOT_A_REAL_LLM_OUTPUT,
  ID_SOURCE,
  ID_RELATED,
  ID_RELATED_SECOND,
  ID_DRAFT,
  ID_UNRELATED,
  ID_UNRELATED_SECOND,
  type AttemptSpec,
} from '../insight/harness.js';
import { createHypothesisRepository } from '../../../application/hypothesis/hypothesis-repository.js';
import type { HypothesisRepository } from '../../../application/hypothesis/hypothesis-repository.js';
import { HYPOTHESIS_GENERATION_SCHEMA_ID, HYPOTHESIS_GROUNDING_CHECK_SCHEMA_ID } from '../../../application/hypothesis/schemas.js';
import { createHypothesisService } from '../../../application/hypothesis/hypothesis-service.js';
import type { HypothesisService } from '../../../application/hypothesis/types.js';

export {
  NOT_A_REAL_LLM_OUTPUT,
  ID_SOURCE,
  ID_RELATED,
  ID_RELATED_SECOND,
  ID_DRAFT,
  ID_UNRELATED,
  ID_UNRELATED_SECOND,
  insightAnswer,
};

export function at(value: string): ObjectId<'ATT'> {
  return value as ObjectId<'ATT'>;
}

export function hypothesisIdOf(value: string): ObjectId<'HYP'> {
  return value as ObjectId<'HYP'>;
}

/** The `source_field_path` of one Level A dimension - read from the FROZEN §9.4.1 mapping. */
export function levelAPath(attempt_id: string, dimension: LevelADimension): string {
  return `${fieldPathForLevelADimension(dimension)}#${attempt_id}:${dimension}`;
}

/**
 * The `source_field_path` of one seeded content item.
 *
 * 🔴 The item-id SUFFIX is the one the seeding helper produced (`goal` / `approach` / `condition` /
 *    `result`), so the path resolves through the REAL `M7` resolver rather than through a parallel
 *    fixture vocabulary.
 */
export const ITEM_SUFFIX = {
  goal: 'goal',
  actual_attempt: 'approach',
  condition: 'condition',
  actual_result: 'result',
  expected_result: 'expected_result',
  judgment_basis: 'judgment_basis',
} as const;

export function fieldPath(
  attempt_id: string,
  field: keyof typeof ITEM_SUFFIX,
): string {
  return `${field}#${attempt_id}:${ITEM_SUFFIX[field]}`;
}

export function selection(
  target_id: string,
  source_field_path: string,
  role: 'grounding' | 'support' | 'contradict' | 'context',
  grounding_basis: string | null = 'G1',
): Readonly<Record<string, unknown>> {
  return { target_id, source_field_path, role, grounding_basis };
}

/* ------------------------------------------------------------------ *
 * Fake provider (four schemas on ONE adapter)
 * ------------------------------------------------------------------ */

export interface FakeCall {
  readonly schema_id: string | null;
  readonly messages: readonly string[];
  readonly user_message: string;
}

export type ReplySource =
  | Readonly<Record<string, unknown>>
  | ((call: FakeCall, index: number) => Readonly<Record<string, unknown>>);

function resolveReply(source: ReplySource, call: FakeCall, index: number) {
  return typeof source === 'function' ? source(call, index) : source;
}

export interface FakeProvider {
  readonly adapter: ProviderAdapter;
  readonly invocations: readonly AiInvocation[];
  readonly calls: readonly FakeCall[];
  readonly hypothesis_calls: readonly FakeCall[];
  readonly check_calls: readonly FakeCall[];
  readonly insight_calls: readonly FakeCall[];
}

export interface FakeProviderOptions {
  /** The step ⑨ generation answer. */
  readonly generation: ReplySource;
  /** The independent grounding / criteria check answer; defaults to a fully confirmatory reply. */
  readonly check?: ReplySource;
  /** The step ⑧ answer used when a test needs a prior candidate `Insight`. */
  readonly insight?: ReplySource;
  /** When set, every step ⑨ call fails with this `AiError`. */
  readonly fail_step_9_with?: AiError;
  readonly structured_output?: StructuredOutputMode;
  readonly model?: string;
}

/** A confirmatory check reply for EVERY hypothesis the request mentions (ids parsed from the prompt). */
export function checkReply(
  overrides: Readonly<Record<string, unknown>> = {},
): ReplySource {
  return (call) => {
    const ids = [...new Set([...call.user_message.matchAll(/HYP_[0-9A-HJKMNP-TV-Z]+/g)].map((m) => m[0]))];
    return {
      checks: ids.map((id) => ({
        hypothesis_id: id,
        grounding_check: 'grounded',
        condition: null,
        grounding_reason: `${NOT_A_REAL_LLM_OUTPUT}: 引用确实指向给出的历史内容`,
        criteria_check: 'observable_and_exclusive',
        criteria_reason: `${NOT_A_REAL_LLM_OUTPUT}: 支持与反驳可以区分`,
        ...overrides,
      })),
    };
  };
}

export function createFakeProvider(options: FakeProviderOptions): FakeProvider {
  const capability: ProviderCapability = {
    structured_output: options.structured_output ?? 'native_schema',
    browser_direct: true,
    thin_proxy: false,
  };
  const path_resolution = resolveProviderPath(capability);
  const path: ProviderPath =
    path_resolution.kind === 'resolved' ? path_resolution.path : 'browser_direct';
  const config: ProviderConfig = {
    provider_id: providerId('fake-hypothesis-provider'),
    display_name: 'Fake provider (test double)',
    model: options.model ?? 'fake-model-1',
    base_url: null,
    base_url_source: 'registered_fixed',
    capability,
  };
  const invocations: AiInvocation[] = [];
  const calls: FakeCall[] = [];
  const hypothesis_calls: FakeCall[] = [];
  const check_calls: FakeCall[] = [];
  const insight_calls: FakeCall[] = [];
  const check_source = options.check ?? checkReply();
  const insight_source = options.insight ?? generationAnswer([insightAnswer()]);

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
      const call: FakeCall = {
        schema_id,
        messages: invocation.request.messages.map((message) => message.content),
        user_message:
          invocation.request.messages.find((message) => message.role === 'user')?.content ?? '',
      };
      calls.push(call);

      if (schema_id === HYPOTHESIS_GENERATION_SCHEMA_ID) {
        hypothesis_calls.push(call);
        if (options.fail_step_9_with !== undefined) {
          return aiFailed(options.fail_step_9_with);
        }
        const value = resolveReply(options.generation, call, index);
        return aiOk(JSON.stringify(value), 200, value);
      }
      if (schema_id === HYPOTHESIS_GROUNDING_CHECK_SCHEMA_ID) {
        check_calls.push(call);
        const value = resolveReply(check_source, call, index);
        return aiOk(JSON.stringify(value), 200, value);
      }
      if (schema_id === INSIGHT_GENERATION_SCHEMA_ID) {
        insight_calls.push(call);
        const value = resolveReply(insight_source, call, index);
        return aiOk(JSON.stringify(value), 200, value);
      }
      if (schema_id === DIMENSION_JUDGE_SCHEMA_ID) {
        return aiOk(
          JSON.stringify({ verdict: 'compared_not_matched', reason: NOT_A_REAL_LLM_OUTPUT }),
          200,
          { verdict: 'compared_not_matched', reason: NOT_A_REAL_LLM_OUTPUT },
        );
      }
      /*
       * 🔴 FINAL-RAPID-A: step ⑥ asks for every undecided pair in ONE request. The same scripted
       *    verdict is expanded across the requested pairs, so a fixture keeps its old meaning while
       *    the retrieval now costs a single provider call.
       */
      if (schema_id === BATCH_DIMENSION_JUDGE_SCHEMA_ID) {
        const judgments = readBatchJudgePairs(invocation.request).map((pair) => ({
          candidate_id: pair.candidate_id,
          dimension: pair.dimension,
          verdict: 'compared_not_matched',
          reason: NOT_A_REAL_LLM_OUTPUT,
        }));
        return aiOk(JSON.stringify({ judgments }), 200, { judgments });
      }
      return aiFailed({
        code: 'INTERNAL_UNEXPECTED',
        failure_kind: 'internal',
        message: 'An unexpected internal failure occurred.',
        retryable: false,
        path: null,
        http_status: null,
        target_block_reason: null,
      });
    },
  };

  return { adapter, invocations, calls, hypothesis_calls, check_calls, insight_calls };
}

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
 * Step ⑨ answer builders (hand-written fixtures)
 * ------------------------------------------------------------------ */

export interface GroundedOverrides {
  readonly hypothesis_statement?: string;
  readonly rationale?: string;
  readonly next_change?: string;
  readonly keep?: Readonly<Record<string, unknown>> | null;
  readonly observation_metric?: string | null;
  readonly support_criterion?: string | null;
  readonly refutation_criterion?: string | null;
  readonly evidence_selections?: readonly Readonly<Record<string, unknown>>[];
  readonly grounding_bases?: readonly string[];
  /**
   * 🔴 Deliberate escape hatch for NEGATIVE fixtures: a test that proves the reader REFUSES a
   *    forbidden field (`confidence`, `partial_grounding`, `decision_state`, `source_partition`,
   *    `grounded`, …) has to be able to inject it. Every extra key is a claim the production reader
   *    rejects, never a field the product understands.
   */
  readonly [forbidden_fixture_field: string]: unknown;
}

/**
 * One canonical grounded answer.
 *
 * 🔴 `G1` is anchored on the related record's `goal`, so the structural carrier check really passes;
 *    the statement is bound to the recorded conditions, so it never asserts a general rule.
 */
export function groundedAnswer(overrides: GroundedOverrides = {}): Readonly<Record<string, unknown>> {
  return {
    hypothesis_statement:
      '在当前条件下，把干燥温度继续降低一档，观察颜色变化是否仍然高于目标范围。',
    rationale: `${NOT_A_REAL_LLM_OUTPUT}: 上次记录的目标与本次相同，而结果没有达到期望。`,
    next_change: '把干燥温度从 60 摄氏度改为 50 摄氏度。',
    keep: null,
    observation_metric: '颜色变化值。',
    support_criterion: '重复该做法后，颜色变化值仍然高于目标范围。',
    refutation_criterion: '重复该做法后，颜色变化值落入目标范围。',
    evidence_selections: [selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'grounding', 'G1')],
    grounding_bases: ['G1'],
    ...overrides,
  };
}

export function generationAnswerOf(
  grounded: readonly Readonly<Record<string, unknown>>[],
  model_suggestions: readonly Readonly<Record<string, unknown>>[] = [],
  exit_route = 'NONE',
  absence_statement: string | null = null,
): Readonly<Record<string, unknown>> {
  return {
    grounded,
    model_suggestions,
    exit_route,
    ...(absence_statement === null ? {} : { absence_statement }),
  };
}

/** One canonical `Model Suggestion` answer. */
export function modelSuggestionAnswer(
  overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return {
    hypothesis_statement: '可以尝试记录每次尝试的环境温度，以便以后比较。',
    rationale: `${NOT_A_REAL_LLM_OUTPUT}: 通用做法建议，不基于任何历史记录。`,
    next_change: '增加一项环境温度记录。',
    keep: null,
    observation_metric: '环境温度。',
    support_criterion: '记录里出现了环境温度。',
    refutation_criterion: '记录里没有环境温度。',
    ...overrides,
  };
}

/* ------------------------------------------------------------------ *
 * Harness
 * ------------------------------------------------------------------ */

export interface SeedSpec extends AttemptSpec {
  readonly expected_result?: string | null;
}

export interface HypothesisHarness {
  /** The concrete in-memory handle tests inspect (same object as `write_storage` by default). */
  readonly storage: InMemoryWorkspaceStorage;
  /** The storage the repositories write to; a fault-injecting wrapper in the §36 tests. */
  readonly write_storage: WorkspaceStorage;
  readonly attempts: AttemptRepository;
  readonly derivations: RetrievalDerivationRepository;
  readonly retrieval: ExperienceRetrievalService;
  readonly insights: InsightRepository;
  readonly insight_service: ReturnType<typeof createInsightService>;
  readonly hypotheses: HypothesisRepository;
  readonly provider: FakeProvider;
  readonly service: HypothesisService;
  readonly ids: SeededIds;
  seed(spec: SeedSpec): Promise<Attempt>;
  /** Runs step ⑥⑦ through the REAL `M6` service. */
  runRetrieval(source_attempt_id?: string): Promise<RetrievalDerivationRecord>;
  /** Runs step ⑧ through the REAL `M8` service, so the reasoning input is a real `Insight`. */
  generateInsights(operation_id?: string): Promise<void>;
  reopen(): HypothesisService;
  reopenRepository(): HypothesisRepository;
  hypothesisFiles(): readonly string[];
  batchFiles(): readonly string[];
  anchorFiles(): readonly string[];
  rawHypothesisFile(hypothesis_id: string): string | undefined;
}

export function makeHarness(
  options: FakeProviderOptions,
  /** The storage the repositories WRITE to (a fault-injecting wrapper in the §36 tests). */
  write_storage?: WorkspaceStorage,
  /** The concrete handle tests inspect; defaults to the write storage when it is the in-memory one. */
  inspect_storage?: InMemoryWorkspaceStorage,
): HypothesisHarness {
  const inspect =
    inspect_storage ??
    (write_storage instanceof InMemoryWorkspaceStorage ? write_storage : undefined) ??
    new InMemoryWorkspaceStorage();
  const storage: WorkspaceStorage = write_storage ?? inspect;
  const view = inspect;
  const ids = new SeededIds();
  const clock = makeClock();
  const provider = createFakeProvider(options);
  const context: RetrievalProviderContext = { adapter: provider.adapter, credential_ref: null };

  const openAttempts = (): AttemptRepository =>
    createAttemptRepository({ storage, now: clock, newAttemptId: ids.next });
  const attempts = openAttempts();
  const openDerivations = (): RetrievalDerivationRepository =>
    createRetrievalDerivationRepository({ storage });
  const openInsights = (): InsightRepository => createInsightRepository({ storage });
  const openRetrieval = (): ExperienceRetrievalService =>
    createExperienceRetrievalService({
      repository: openAttempts(),
      derivations: openDerivations(),
      provider: context,
      now: clock,
    });

  let insight_sequence = 0;
  const newInsightId = (): ObjectId<'INS'> => {
    insight_sequence += 1;
    return `INS_${String(insight_sequence).padStart(26, '0')}` as ObjectId<'INS'>;
  };
  const openInsightService = () =>
    createInsightService({
      insights: openInsights(),
      attempts: openAttempts(),
      derivations: openDerivations(),
      provider: context,
      now: clock,
      newInsightId,
    });

  let hypothesis_sequence = 0;
  const newHypothesisId = (): ObjectId<'HYP'> => {
    hypothesis_sequence += 1;
    return `HYP_${String(hypothesis_sequence).padStart(26, '0')}` as ObjectId<'HYP'>;
  };
  const openService = (): HypothesisService =>
    createHypothesisService({
      hypotheses: createHypothesisRepository({ storage }),
      attempts: openAttempts(),
      derivations: openDerivations(),
      insights: openInsightService(),
      provider: context,
      now: clock,
      newHypothesisId,
    });

  return {
    storage: view,
    write_storage: storage,
    attempts,
    derivations: openDerivations(),
    retrieval: openRetrieval(),
    insights: openInsights(),
    insight_service: openInsightService(),
    hypotheses: createHypothesisRepository({ storage }),
    provider,
    service: openService(),
    ids,
    async seed(spec) {
      const attempt = await seedAttempt(attempts, ids, spec);
      if (spec.expected_result !== undefined && spec.expected_result !== null) {
        const patch: AttemptPatch = {
          expected_result: provided(
            factItem(`${attempt.attempt_id}:expected_result`, spec.expected_result),
          ),
        };
        return attempts.updateAttempt(attempt.attempt_id, patch);
      }
      return attempt;
    },
    async runRetrieval(source_attempt_id = ID_SOURCE) {
      const outcome = await openRetrieval().runRetrievalForFormalAttempt({
        source_attempt_id: at(source_attempt_id),
      });
      if (outcome.kind !== 'completed') {
        throw new Error(`the fixture retrieval did not complete: ${outcome.kind}`);
      }
      return outcome.derivation;
    },
    async generateInsights(operation_id = 'op-insight-1') {
      const outcome = await openInsightService().generateCandidateInsights({
        operation_id,
        source_attempt_id: at(ID_SOURCE),
      });
      if (outcome.kind !== 'generated' && outcome.kind !== 'zero_output') {
        throw new Error(`the fixture step ⑧ generation did not complete: ${outcome.kind}`);
      }
    },
    reopen: openService,
    reopenRepository: () => createHypothesisRepository({ storage: view }),
    hypothesisFiles: () =>
      Object.keys(view.snapshot()).filter(
        (path) =>
          path.startsWith('hypotheses/') &&
          path.endsWith('.json') &&
          !path.startsWith('hypotheses/batches/') &&
          !path.startsWith('hypotheses/operations/'),
      ),
    batchFiles: () =>
      Object.keys(view.snapshot()).filter((path) => path.startsWith('hypotheses/batches/')),
    anchorFiles: () =>
      Object.keys(view.snapshot()).filter((path) => path.startsWith('hypotheses/operations/')),
    rawHypothesisFile: (hypothesis_id) => view.peek(`hypotheses/${hypothesis_id}.json`),
  };
}

/**
 * The standard fixture: one source record related to two historical records, with step ⑥⑦ already run.
 * `N_检索 = 2`.
 */
export async function seedStandardFixture(
  options: FakeProviderOptions,
): Promise<{ readonly harness: HypothesisHarness; readonly derivation: RetrievalDerivationRecord }> {
  const harness = makeHarness(options);
  await harness.seed({
    attempt_id: ID_SOURCE,
    project_id: 'PRJ_shared',
    goal: 'G',
    approach: 'S1',
    condition: 'C1',
    result: 'R1',
  });
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
    attempt_id: ID_DRAFT,
    state: 'Draft',
    goal: 'G',
    approach: 'S4',
    condition: 'C4',
    result: 'R4',
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
  const derivation = await harness.runRetrieval();
  return { harness, derivation };
}

/**
 * A fixture with NO usable history: the source record is the ONLY record, so `N_检索 = 0`.
 * Used for the `EXIT-A` route.
 */
export async function seedEmptyHistoryFixture(
  options: FakeProviderOptions,
): Promise<HypothesisHarness> {
  const harness = makeHarness(options);
  await harness.seed({
    attempt_id: ID_SOURCE,
    project_id: 'PRJ_shared',
    goal: 'G',
    approach: 'S1',
    condition: 'C1',
    result: 'R1',
  });
  await harness.runRetrieval();
  return harness;
}

/* ------------------------------------------------------------------ *
 * Fault-injecting storage (§36)
 * ------------------------------------------------------------------ */

/**
 * Wraps a storage and fails a chosen WRITE.
 *
 * 🔴 Used ONLY to simulate the partial-write interruption §36 requires: "写入第一个 Hypothesis 成功，
 *    后续 batch / sibling write 失败". It changes no production behaviour and lives in the test tree.
 */
export class FaultInjectingStorage implements WorkspaceStorage {
  readonly kind = 'fault-injecting';

  private readonly inner: InMemoryWorkspaceStorage;
  /** Fail when a write targets this path prefix (e.g. `hypotheses/batches/`). */
  private readonly fail_write_matching: string | null;
  private failing = false;

  constructor(inner: InMemoryWorkspaceStorage, fail_write_matching: string | null) {
    this.inner = inner;
    this.fail_write_matching = fail_write_matching;
  }

  async exists(path: string): Promise<boolean> {
    return this.inner.exists(path);
  }

  async readFile(path: string): Promise<string> {
    return this.inner.readFile(path);
  }

  async writeFile(path: string, contents: string): Promise<void> {
    if (
      !this.failing &&
      this.fail_write_matching !== null &&
      path.startsWith(this.fail_write_matching)
    ) {
      this.failing = true;
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
