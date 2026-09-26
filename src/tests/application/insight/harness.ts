/**
 * S01 ｜ Deterministic fixture harness for the `M8` Candidate Insight suite.
 *
 * 🔴 NOT_A_REAL_LLM_OUTPUT: every step ⑧ answer, every `E2` / `E3` re-check answer and every `M6`
 *    dimension verdict produced through this file is a HAND-WRITTEN fixture. A suite that passes
 *    here proves the APPLICATION's behaviour - it verifies no model, no provider and makes no
 *    network call (Real Provider Calls = NOT EXECUTED).
 * 🔴 The fake adapter implements the `M10` `ProviderAdapter` INTERFACE only; it constructs no
 *    browser-direct adapter, no proxy client and no registry. It reads the REAL request, so a test
 *    can also assert what the application actually sent - including "only the minimal context was
 *    sent" (task §6).
 * 🔴 Relatedness in the fixtures comes from DETERMINISTICALLY matched Level A values (two
 *    byte-identical strings), so it never depends on the test double's verdict.
 * 🔴 Attempts are seeded through the REAL repository and the retrieval runs through the REAL `M6`
 *    service, so the derivation, the catalog and the references are real persisted artefacts and
 *    not a parallel in-memory model.
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
import { decisionInferenceItem, factItem } from '../../../domain/types/source-type.js';
import type { ContentItem } from '../../../domain/types/source-type.js';
import { provided } from '../../../domain/types/presence.js';
import type { MaybeProvided } from '../../../domain/types/presence.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';
import type { ArchiveState } from '../../../domain/types/archive.js';
import type { Attempt, AttemptState } from '../../../domain/types/attempt.js';
import { fieldPathForLevelADimension } from '../../../domain/types/level-a.js';
import type { LevelADimension } from '../../../domain/types/level-a.js';
import { InMemoryWorkspaceStorage } from '../../../workspace/memory-storage.js';
import { createAttemptRepository } from '../../../workspace/repository/attempt-repository.js';
import type {
  AttemptPatch,
  AttemptRepository,
} from '../../../workspace/repository/attempt-repository.js';
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
import { INSIGHT_GENERATION_SCHEMA_ID, INSIGHT_GATE_RECHECK_SCHEMA_ID } from '../../../application/insight/schemas.js';
import { createInsightRepository } from '../../../application/insight/insight-repository.js';
import type { InsightRepository } from '../../../application/insight/insight-repository.js';
import { createInsightService } from '../../../application/insight/insight-service.js';
import type {
  GenerateCandidateInsightsOutcome,
  InsightActionApplied,
  InsightActionOutcome,
  InsightActionRejection,
  InsightGenerationRefusedOutcome,
  InsightRuntimeFailure,
  InsightService,
  InsightsGeneratedOutcome,
  InsightZeroOutputOutcome,
} from '../../../application/insight/types.js';

export const NOT_A_REAL_LLM_OUTPUT = 'NOT_A_REAL_LLM_OUTPUT';

export const FAKE_PROVIDER_ID_TEXT = 'fake-provider';
export const FAKE_MODEL_ID = 'fake-model-1';

/* ------------------------------------------------------------------ *
 * Identities / fixtures
 * ------------------------------------------------------------------ */

export const ID_SOURCE = 'ATT_0000000000000000000000000S';
/** Related via `goal` + `condition`. Result status `Failed`. */
export const ID_RELATED = 'ATT_0000000000000000000000000C';
/** Related via `goal`. */
export const ID_RELATED_SECOND = 'ATT_0000000000000000000000000E';
/** A `Draft` - never referenceable. */
export const ID_DRAFT = 'ATT_0000000000000000000000000D';
/** Formal but unrelated. */
export const ID_UNRELATED = 'ATT_0000000000000000000000000N';
/** Formal, in another project, unrelated. */
export const ID_UNRELATED_SECOND = 'ATT_0000000000000000000000000P';

export function at(value: string): ObjectId<'ATT'> {
  return value as ObjectId<'ATT'>;
}

export function insightIdOf(value: string): ObjectId<'INS'> {
  return value as ObjectId<'INS'>;
}

/**
 * The `source_field_path` of one Level A dimension of a harness-seeded Attempt.
 * 🔴 The carrier field path is read from the FROZEN §9.4.1 mapping, never re-spelled here.
 */
export function levelAPath(attempt_id: string, dimension: LevelADimension): string {
  return `${fieldPathForLevelADimension(dimension)}#${attempt_id}:${dimension}`;
}

export function selection(
  target_id: string,
  source_field_path: string,
  role: 'grounding' | 'support' | 'contradict' | 'context',
): Readonly<Record<string, unknown>> {
  return { target_id, source_field_path, role };
}

/* ------------------------------------------------------------------ *
 * Fake provider
 * ------------------------------------------------------------------ */

export interface InsightProviderCall {
  readonly schema_id: string | null;
  readonly messages: readonly string[];
  readonly user_message: string;
}

export type InsightFakeReply =
  | { readonly kind: 'structured'; readonly value: Readonly<Record<string, unknown>> }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'error'; readonly error: AiError };

export type InsightReplySource =
  | Readonly<Record<string, unknown>>
  | ((call: InsightProviderCall, index: number) => Readonly<Record<string, unknown>>);

function resolveReply(source: InsightReplySource, call: InsightProviderCall, index: number) {
  return typeof source === 'function' ? source(call, index) : source;
}

export interface FakeInsightProvider {
  readonly adapter: ProviderAdapter;
  readonly invocations: readonly AiInvocation[];
  /** Every call, in order - the "M10-only / minimal context" proofs read this. */
  readonly calls: readonly InsightProviderCall[];
  /** Only the step ⑧ generation calls. */
  readonly generation_calls: readonly InsightProviderCall[];
  /** Only the `E2` / `E3` re-check calls. */
  readonly recheck_calls: readonly InsightProviderCall[];
}

export interface FakeInsightProviderOptions {
  readonly generation: InsightReplySource;
  readonly recheck?: InsightReplySource;
  /** When set, every step ⑧ call fails with this `AiError` instead of answering. */
  readonly fail_step_8_with?: AiError;
  readonly structured_output?: StructuredOutputMode;
  readonly model?: string;
}

export function createFakeInsightProvider(
  options: FakeInsightProviderOptions,
): FakeInsightProvider {
  const capability: ProviderCapability = {
    structured_output: options.structured_output ?? 'native_schema',
    browser_direct: true,
    thin_proxy: false,
  };
  const path_resolution = resolveProviderPath(capability);
  const path: ProviderPath =
    path_resolution.kind === 'resolved' ? path_resolution.path : 'browser_direct';
  const config: ProviderConfig = {
    provider_id: providerId(FAKE_PROVIDER_ID_TEXT),
    display_name: 'Fake provider (test double)',
    model: options.model ?? FAKE_MODEL_ID,
    base_url: null,
    base_url_source: 'registered_fixed',
    capability,
  };
  const invocations: AiInvocation[] = [];
  const calls: InsightProviderCall[] = [];
  const generation_calls: InsightProviderCall[] = [];
  const recheck_calls: InsightProviderCall[] = [];
  const recheck_source: InsightReplySource = options.recheck ?? {
    e2_check: 'pass',
    e2_reason: `${NOT_A_REAL_LLM_OUTPUT}: 复检认定命题明确`,
    e3_check: 'pass',
    e3_reason: `${NOT_A_REAL_LLM_OUTPUT}: 复检认定适用范围已说明`,
    missing_items: [],
  };

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
      const call: InsightProviderCall = {
        schema_id,
        messages: invocation.request.messages.map((message) => message.content),
        user_message: invocation.request.messages.find((message) => message.role === 'user')?.content ?? '',
      };
      calls.push(call);

      if (schema_id === INSIGHT_GENERATION_SCHEMA_ID || schema_id === INSIGHT_GATE_RECHECK_SCHEMA_ID) {
        if (options.fail_step_8_with !== undefined) {
          return aiFailed(options.fail_step_8_with);
        }
        if (schema_id === INSIGHT_GENERATION_SCHEMA_ID) {
          generation_calls.push(call);
          return aiOk(JSON.stringify(resolveReply(options.generation, call, index)), 200, resolveReply(options.generation, call, index));
        }
        recheck_calls.push(call);
        return aiOk(JSON.stringify(resolveReply(recheck_source, call, index)), 200, resolveReply(recheck_source, call, index));
      }

      /* Anything else in these fixtures is the `M6` dimension judge. */
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

  return { adapter, invocations, calls, generation_calls, recheck_calls };
}

/** The canonical unreachable-provider failure. */
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
 * Step ⑧ answer builders (hand-written fixtures)
 * ------------------------------------------------------------------ */

export interface InsightAnswerOverrides {
  readonly proposition?: string;
  readonly scope?: string;
  readonly basis?: string;
  readonly verifiability?: string | null;
  readonly evidence_selections?: readonly Readonly<Record<string, unknown>>[];
  readonly e2_check?: string;
  readonly e2_reason?: string;
  readonly e3_check?: string;
  readonly e3_reason?: string;
  readonly missing_items?: readonly Readonly<Record<string, unknown>>[];
}

/**
 * One canonical `Candidate Insight` answer.
 *
 * 🔴 Every proposition here is `NOT_A_REAL_LLM_OUTPUT` fixture text and is deliberately bound to the
 *    recorded conditions, so it never asserts a general rule.
 */
export function insightAnswer(overrides: InsightAnswerOverrides = {}): Readonly<Record<string, unknown>> {
  return {
    proposition:
      '在当前条件下，先把热风温度降到 50 摄氏度再延长干燥时间，颜色变化没有降到目标范围。',
    scope: '条件为 C1、方案为 S1 的这一次尝试；温度为 50 摄氏度。',
    basis: `${NOT_A_REAL_LLM_OUTPUT}: 本次实际结果与历史记录的结果差异`,
    verifiability: '在同样条件下重复该做法，观察颜色变化是否仍高于目标范围。',
    evidence_selections: [selection(ID_RELATED, levelAPath(ID_RELATED, 'goal'), 'support')],
    e2_check: 'pass',
    e2_reason: '命题是一个明确的经验陈述，不是「感觉可能有问题」这类含混表达。',
    e3_check: 'pass',
    e3_reason: '已说明观察发生在条件 C1 与方案 S1 下。',
    missing_items: [],
    ...overrides,
  };
}

export function generationAnswer(
  insights: readonly Readonly<Record<string, unknown>>[],
): Readonly<Record<string, unknown>> {
  return { insights, exit_route: 'NONE' };
}

export function zeroOutputAnswer(
  exit_route: 'EXIT-A' | 'EXIT-C',
  absence_statement: string,
): Readonly<Record<string, unknown>> {
  return { insights: [], exit_route, absence_statement };
}

export function missingItem(
  description: string,
  why_important: string,
  how_to_supplement: string,
): Readonly<Record<string, unknown>> {
  return { description, why_important, how_to_supplement };
}

/* ------------------------------------------------------------------ *
 * Attempt seeding
 * ------------------------------------------------------------------ */

const BASE_TIME = Date.parse('2026-09-25T00:00:00.000Z');

export function makeClock(): () => string {
  let tick = 0;
  return () => new Date(BASE_TIME + tick++ * 60_000).toISOString();
}

export class SeededIds {
  private readonly reserved: string[] = [];
  private sequence = 0;

  reserve(id: string): void {
    this.reserved.push(id);
  }

  next = (): ObjectId<'ATT'> => {
    const explicit = this.reserved.shift();
    if (explicit !== undefined) {
      return explicit as ObjectId<'ATT'>;
    }
    this.sequence += 1;
    return `ATT_${String(this.sequence).padStart(26, '0')}` as ObjectId<'ATT'>;
  };
}

export interface AttemptSpec {
  readonly attempt_id?: string;
  readonly project_id?: string;
  readonly goal?: string | null;
  readonly approach?: string | null;
  readonly condition?: string | null;
  readonly result?: string | null;
  readonly result_status_value?: string;
  readonly candidate_causes?: readonly { readonly statement: string; readonly decision_state: 'unresolved' | 'accepted' | 'rejected' }[];
  readonly state?: AttemptState;
  readonly archive_state?: ArchiveState;
}

/** Formal-prerequisite defaults; an explicit `null` still means 「显式未知」. */
export const DEFAULT_GOAL = '默认目标';
export const DEFAULT_APPROACH = '默认方案';
export const DEFAULT_RESULT = '默认结果';

function optionalFact(
  attempt_id: string,
  suffix: string,
  value: string | null | undefined,
): MaybeProvided<ContentItem> {
  if (value === undefined || value === null) {
    return { presence_state: 'unknown' };
  }
  return provided(factItem(`${attempt_id}:${suffix}`, value));
}

export async function seedAttempt(
  repository: AttemptRepository,
  ids: SeededIds,
  spec: AttemptSpec,
): Promise<Attempt> {
  if (spec.attempt_id !== undefined) {
    ids.reserve(spec.attempt_id);
  }
  const created = await repository.createAttempt({
    raw_text: `fixture:${spec.attempt_id ?? 'auto'}`,
    ...(spec.project_id === undefined ? {} : { project_id: spec.project_id }),
  });
  const id = created.attempt_id;

  const base: AttemptPatch = {
    goal: optionalFact(id, 'goal', spec.goal === undefined ? DEFAULT_GOAL : spec.goal),
    actual_attempt: optionalFact(
      id,
      'approach',
      spec.approach === undefined ? DEFAULT_APPROACH : spec.approach,
    ),
    condition: optionalFact(id, 'condition', spec.condition),
    actual_result: optionalFact(id, 'result', spec.result === undefined ? DEFAULT_RESULT : spec.result),
    ...(spec.candidate_causes === undefined
      ? {}
      : {
          candidate_causes: spec.candidate_causes.map((cause, index) =>
            decisionInferenceItem(`${id}:cause:${index}`, cause.statement, cause.decision_state),
          ),
        }),
    ...(spec.archive_state === undefined ? {} : { archive_state: spec.archive_state }),
  };

  const wantsFormal = (spec.state ?? 'Formal') === 'Formal';
  const patch: AttemptPatch = wantsFormal
    ? {
        ...base,
        result_status: provided(
          decisionInferenceItem(`${id}:status`, spec.result_status_value ?? 'Failed', 'accepted'),
        ),
        state: 'Formal',
      }
    : base;
  return repository.updateAttempt(id, patch);
}

/* ------------------------------------------------------------------ *
 * Harness
 * ------------------------------------------------------------------ */

export interface InsightHarness {
  readonly storage: InMemoryWorkspaceStorage;
  readonly attempts: AttemptRepository;
  readonly derivations: RetrievalDerivationRepository;
  readonly retrieval: ExperienceRetrievalService;
  readonly insights: InsightRepository;
  readonly provider: FakeInsightProvider;
  readonly service: InsightService;
  readonly ids: SeededIds;
  seed(spec: AttemptSpec): Promise<Attempt>;
  /** Runs step ⑥⑦ over the source record through the REAL `M6` service. */
  runRetrieval(source_attempt_id?: string): Promise<RetrievalDerivationRecord>;
  /** A brand-new service over the SAME persisted workspace. */
  reopen(): InsightService;
  /** A brand-new insight repository over the same storage - proves file-level durability. */
  reopenInsightRepository(): InsightRepository;
  rawInsightFile(insight_id: string): string | undefined;
  insightFiles(): readonly string[];
  batchFiles(): readonly string[];
  /** `M8-HARDENING-01`: the durable recovery anchors of step ⑧ generations. */
  anchorFiles(): readonly string[];
  eventLog(): string;
}

export function makeHarness(options: FakeInsightProviderOptions): InsightHarness {
  const storage = new InMemoryWorkspaceStorage();
  const ids = new SeededIds();
  /** ONE monotonic clock per harness, so timestamps never collide between repeated operations. */
  const clock = makeClock();
  const openAttempts = (): AttemptRepository =>
    createAttemptRepository({ storage, now: clock, newAttemptId: ids.next });
  const attempts = openAttempts();
  const provider = createFakeInsightProvider(options);
  const context: RetrievalProviderContext = {
    adapter: provider.adapter,
    credential_ref: null,
  };

  let insight_sequence = 0;
  const newInsightId = (): ObjectId<'INS'> => {
    insight_sequence += 1;
    return `INS_${String(insight_sequence).padStart(26, '0')}` as ObjectId<'INS'>;
  };

  const openInsights = (): InsightRepository => createInsightRepository({ storage });
  const openRetrieval = (): ExperienceRetrievalService =>
    createExperienceRetrievalService({
      repository: openAttempts(),
      derivations: createRetrievalDerivationRepository({ storage }),
      provider: context,
      now: clock,
    });
  const openService = (): InsightService =>
    createInsightService({
      insights: openInsights(),
      attempts: openAttempts(),
      derivations: createRetrievalDerivationRepository({ storage }),
      provider: context,
      now: clock,
      newInsightId,
    });

  return {
    storage,
    attempts,
    derivations: createRetrievalDerivationRepository({ storage }),
    retrieval: openRetrieval(),
    insights: openInsights(),
    provider,
    service: openService(),
    ids,
    seed: (spec) => seedAttempt(attempts, ids, spec),
    async runRetrieval(source_attempt_id = ID_SOURCE) {
      const outcome = await openRetrieval().runRetrievalForFormalAttempt({
        source_attempt_id: at(source_attempt_id),
      });
      if (outcome.kind !== 'completed') {
        throw new Error(`the fixture retrieval did not complete: ${outcome.kind}`);
      }
      return outcome.derivation;
    },
    reopen: openService,
    reopenInsightRepository: openInsights,
    rawInsightFile: (insight_id) => storage.peek(`insights/${insight_id}.json`),
    insightFiles: () =>
      Object.keys(storage.snapshot()).filter(
        (path) =>
          path.startsWith('insights/') &&
          path.endsWith('.json') &&
          !path.startsWith('insights/batches/') &&
          /* 🔴 `M8-HARDENING-01`: `insights/operations/**` holds the recovery ANCHOR of a
             generation, not an `Insight` document. A test that asks "how many Insights exist" must
             not count it - the same discipline as `hypotheses/operations/**` in the `M9` harness. */
          !path.startsWith('insights/operations/'),
      ),
    batchFiles: () =>
      Object.keys(storage.snapshot()).filter((path) => path.startsWith('insights/batches/')),
    anchorFiles: () =>
      Object.keys(storage.snapshot()).filter((path) => path.startsWith('insights/operations/')),
    eventLog: () => storage.peek('events/insight-state-events.jsonl') ?? '',
  };
}

/**
 * The standard fixture: one source record related to two historical records, plus a `Draft` and two
 * unrelated records, with step ⑥⑦ already run. `N_检索 = 2`.
 */
export async function seedStandardFixture(
  options: FakeInsightProviderOptions,
): Promise<{ readonly harness: InsightHarness; readonly derivation: RetrievalDerivationRecord }> {
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

/* ------------------------------------------------------------------ *
 * Outcome narrowing helpers
 * ------------------------------------------------------------------ */

function assertKind(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`expected the outcome kind "${expected}" but received "${actual}"`);
  }
}

export function expectGenerated(outcome: GenerateCandidateInsightsOutcome): InsightsGeneratedOutcome {
  assertKind(outcome.kind, 'generated');
  if (outcome.kind !== 'generated') {
    throw new Error('unreachable');
  }
  return outcome;
}

export function expectZeroOutput(outcome: GenerateCandidateInsightsOutcome): InsightZeroOutputOutcome {
  assertKind(outcome.kind, 'zero_output');
  if (outcome.kind !== 'zero_output') {
    throw new Error('unreachable');
  }
  return outcome;
}

export function expectRefused(
  outcome: GenerateCandidateInsightsOutcome,
): InsightGenerationRefusedOutcome {
  assertKind(outcome.kind, 'refused');
  if (outcome.kind !== 'refused') {
    throw new Error('unreachable');
  }
  return outcome;
}

export function expectRuntimeFailure(outcome: GenerateCandidateInsightsOutcome): InsightRuntimeFailure {
  assertKind(outcome.kind, 'runtime_failure');
  if (outcome.kind !== 'runtime_failure') {
    throw new Error('unreachable');
  }
  return outcome;
}

export function expectApplied(outcome: InsightActionOutcome): InsightActionApplied {
  assertKind(outcome.kind, 'applied');
  if (outcome.kind !== 'applied') {
    throw new Error('unreachable');
  }
  return outcome;
}

export function expectRejected(outcome: InsightActionOutcome): InsightActionRejection {
  assertKind(outcome.kind, 'rejected');
  if (outcome.kind !== 'rejected') {
    throw new Error('unreachable');
  }
  return outcome;
}
