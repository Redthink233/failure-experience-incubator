/**
 * S01-03 ｜ Deterministic test doubles for the `M6` retriever / comparator suite.
 *
 * 🔴 NOT_A_REAL_LLM_OUTPUT: every judge answer produced through this file is a hand-written fixture.
 *    A suite that passes here proves the APPLICATION's behaviour - it does NOT verify any model's
 *    ability, it does NOT verify any provider, and no network call is ever made
 *    (Real Provider Calls = NOT EXECUTED).
 * 🔴 The fake adapter implements the `M10` `ProviderAdapter` INTERFACE only; it constructs no
 *    browser-direct adapter, no proxy client and no registry.
 * 🔴 The judge double READS THE REAL REQUEST (`readJudgeCall`), so a test can also assert what the
 *    application actually sent - including "only the minimal context was sent" (task §13).
 * 🔴 FINAL-RAPID-A: step ⑥ now asks for every undecided pair in ONE batch request
 *    (`BATCH_DIMENSION_JUDGE_SCHEMA_ID`). `FakeProvider.batch_calls.length` is therefore the
 *    PROVIDER-CALL COUNT of a retrieval, and `readBatchJudgePairs` reads the pair list back out of
 *    the uploaded request. `calls` keeps one entry per pair for both protocols, so a per-pair script
 *    keeps its old meaning; a `kind: 'batch'` reply scripts a deliberately malformed whole batch.
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
import type { AiRequest } from '../../../ai/provider/request.js';
import type { AiError, AiResult } from '../../../ai/provider/result.js';
import { aiFailed, aiOk } from '../../../ai/provider/result.js';
import { decisionInferenceItem, factItem } from '../../../domain/types/source-type.js';
import type { ContentItem } from '../../../domain/types/source-type.js';
import { provided } from '../../../domain/types/presence.js';
import type { MaybeProvided } from '../../../domain/types/presence.js';
import type { LevelADimension } from '../../../domain/types/level-a.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';
import { createAttemptRepository } from '../../../workspace/repository/attempt-repository.js';
import type {
  AttemptPatch,
  AttemptRepository,
} from '../../../workspace/repository/attempt-repository.js';
import type { Attempt, AttemptState } from '../../../domain/types/attempt.js';
import { createDraftAttempt } from '../../../domain/types/attempt.js';
import type { ArchiveState } from '../../../domain/types/archive.js';
import { InMemoryWorkspaceStorage } from '../../../workspace/memory-storage.js';
import { createExperienceRetrievalService } from '../../../retrieval/compare/retrieval-service.js';
import type {
  ExperienceRetrievalService,
  RetrievalProviderContext,
} from '../../../retrieval/compare/retrieval-service.js';
import { createRetrievalDerivationRepository } from '../../../retrieval/compare/retrieval-derivation-repository.js';
import type { RetrievalDerivationRepository } from '../../../retrieval/compare/retrieval-derivation-repository.js';
import {
  BATCH_DIMENSION_JUDGE_SCHEMA_ID,
  BATCH_JUDGE_PAIRS_CLOSE,
  BATCH_JUDGE_PAIRS_OPEN,
} from '../../../retrieval/compare/batch-judge.js';
import type { BatchJudgePair } from '../../../retrieval/compare/batch-judge.js';

export const NOT_A_REAL_LLM_OUTPUT = 'NOT_A_REAL_LLM_OUTPUT';

export const FAKE_PROVIDER_ID_TEXT = 'fake-provider';
export const FAKE_MODEL_ID = 'fake-model-1';

/* ------------------------------------------------------------------ *
 * Fake provider
 * ------------------------------------------------------------------ */

export type FakeReply =
  | {
      readonly kind: 'structured';
      readonly value: Readonly<Record<string, unknown>>;
      readonly text?: string;
    }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'error'; readonly error: AiError }
  /**
   * FINAL-RAPID-A: the WHOLE batch answer, used verbatim as the one provider response.
   *
   * 🔴 This is how a test scripts a *malformed* batch (a missing pair, an extra pair, a rewritten
   *    `candidate_id`, an off-vocabulary `verdict`). It is never expanded and never repaired, so the
   *    application's fail-closed reader is exercised for real.
   */
  | { readonly kind: 'batch'; readonly value: Readonly<Record<string, unknown>> };

export interface JudgeCall {
  /** Canonical dimension key (`goal` / `approach` / `condition` / `result`). */
  readonly dimension_key: string;
  readonly source_value: string;
  readonly candidate_value: string;
  /** Every message the application really sent - used to prove nothing else was uploaded. */
  readonly messages: readonly string[];
}

/** One batch request, read back exactly as it was uploaded. */
export interface BatchJudgeCall {
  /** The pairs the application asked about, in request order. */
  readonly pairs: readonly BatchJudgePair[];
  readonly messages: readonly string[];
  /** The exact user message text. */
  readonly text: string;
}

/** Reads the judge input out of the SINGLE-PAIR request the application really built. */
export function readJudgeCall(request: AiRequest): JudgeCall {
  const messages = request.messages.map((message) => message.content);
  const user = request.messages.find((message) => message.role === 'user')?.content ?? '';
  const lines = user.split('\n');
  const dimensionLine = lines.find((line) => line.startsWith('维度：')) ?? '';
  const keyMatch = /（([a-z_]+)）/.exec(dimensionLine);
  return {
    dimension_key: keyMatch?.[1] ?? '',
    source_value: (lines.find((line) => line.startsWith('本次记录的取值：')) ?? '')
      .replace('本次记录的取值：', '')
      .trim(),
    candidate_value: (lines.find((line) => line.startsWith('历史记录的取值：')) ?? '')
      .replace('历史记录的取值：', '')
      .trim(),
    messages,
  };
}

/**
 * Reads the pair list out of the BATCH request the application really built.
 *
 * 🔴 It reads the request, it does not rebuild it: the delimiters come from the production module,
 *    so this reader cannot silently disagree with what was sent.
 */
export function readBatchJudgePairs(request: AiRequest): readonly BatchJudgePair[] {
  const user = request.messages.find((message) => message.role === 'user')?.content ?? '';
  const start = user.indexOf(BATCH_JUDGE_PAIRS_OPEN);
  const end = user.indexOf(BATCH_JUDGE_PAIRS_CLOSE);
  if (start < 0 || end <= start) {
    return [];
  }
  const body = user.slice(start + BATCH_JUDGE_PAIRS_OPEN.length, end);
  const parsed = JSON.parse(body) as readonly Readonly<Record<string, unknown>>[];
  return parsed.map((entry) => ({
    candidate_id: String(entry['candidate_id'] ?? ''),
    dimension: entry['dimension'] as LevelADimension,
    source_value: String(entry['current_value'] ?? ''),
    candidate_value: String(entry['historical_value'] ?? ''),
  }));
}

export interface FakeProvider {
  readonly adapter: ProviderAdapter;
  /** Every invocation the application really made - the "M10-only" proof is structural. */
  readonly invocations: readonly AiInvocation[];
  /** One entry per `candidate × dimension` pair the application asked about, in request order. */
  readonly calls: readonly JudgeCall[];
  /** One entry per BATCH request - the provider-call count of step ⑥ is `batch_calls.length`. */
  readonly batch_calls: readonly BatchJudgeCall[];
}

export interface FakeProviderOptions {
  readonly structured_output?: StructuredOutputMode;
  readonly model?: string;
}

/** The per-pair view the resolver sees for a batch request. */
function pairViewsOf(messages: readonly string[], pairs: readonly BatchJudgePair[]): readonly JudgeCall[] {
  return pairs.map((pair) => ({
    dimension_key: pair.dimension,
    source_value: pair.source_value,
    candidate_value: pair.candidate_value,
    messages,
  }));
}

function singleReply(reply: FakeReply): AiResult {
  if (reply.kind === 'error') {
    return aiFailed(reply.error);
  }
  if (reply.kind === 'text') {
    return aiOk(reply.text, 200, null);
  }
  if (reply.kind === 'batch') {
    return aiOk(JSON.stringify(reply.value), 200, reply.value);
  }
  return aiOk(reply.text ?? JSON.stringify(reply.value), 200, reply.value);
}

/**
 * Assembles the ANSWER to one batch request from the per-pair replies the resolver produced.
 *
 * Order of precedence, and nothing else:
 *   ① a `batch` reply is the whole answer, used verbatim (how a test scripts a malformed batch);
 *   ② otherwise, if every pair was answered with a single-pair verdict, the verdicts are expanded
 *      into the exact `{judgments: [...]}` the application asked for: one judgement per pair built
 *      from the scripted payload, with ONLY the pair identity taken from the request (so the double
 *      cannot accidentally "rewrite" it while a scripted extra field still reaches the reader);
 *   ③ otherwise the first free-text reply is the whole answer (how a test scripts a non-JSON body).
 */
function batchReplyOf(replies: readonly FakeReply[], pairs: readonly BatchJudgePair[]): AiResult {
  const explicit = replies.find((reply) => reply.kind === 'batch');
  if (explicit !== undefined && explicit.kind === 'batch') {
    return aiOk(JSON.stringify(explicit.value), 200, explicit.value);
  }
  if (replies.every((reply) => reply.kind === 'structured')) {
    const value = {
      judgments: pairs.map((pair, index) => {
        const reply = replies[index];
        const payload =
          reply !== undefined && reply.kind === 'structured' ? reply.value : {};
        return {
          ...payload,
          candidate_id: pair.candidate_id,
          dimension: pair.dimension,
        };
      }),
    };
    return aiOk(JSON.stringify(value), 200, value);
  }
  const text = replies.find((reply) => reply.kind === 'text');
  if (text !== undefined && text.kind === 'text') {
    return aiOk(text.text, 200, null);
  }
  return aiOk(JSON.stringify(replies[0] ?? {}), 200, null);
}

/**
 * Builds a fake `M10` adapter.
 *
 * `resolve` receives the judge call the application built plus the 0-based PROVIDER-CALL index, so
 * one double can answer a whole multi-candidate retrieval deterministically. For a batch request it
 * is called once per requested pair (the transport carries them together, the double answers them
 * one by one), which keeps every existing per-pair script meaningful.
 */
export function createFakeProvider(
  resolve: (call: JudgeCall, index: number) => FakeReply,
  options: FakeProviderOptions = {},
): FakeProvider {
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
  const calls: JudgeCall[] = [];
  const batch_calls: BatchJudgeCall[] = [];

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
      const messages = invocation.request.messages.map((message) => message.content);

      if (schema_id === BATCH_DIMENSION_JUDGE_SCHEMA_ID) {
        const pairs = readBatchJudgePairs(invocation.request);
        batch_calls.push({ pairs, messages, text: messages[1] ?? '' });
        const replies: FakeReply[] = [];
        for (const view of pairViewsOf(messages, pairs)) {
          calls.push(view);
          const reply = resolve(view, index);
          if (reply.kind === 'error') {
            return aiFailed(reply.error);
          }
          replies.push(reply);
        }
        return batchReplyOf(replies, pairs);
      }

      const call = readJudgeCall(invocation.request);
      calls.push(call);
      return singleReply(resolve(call, index));
    },
  };

  return { adapter, invocations, calls, batch_calls };
}

/** A double that always answers the same verdict. Every answer is `NOT_A_REAL_LLM_OUTPUT`. */
export function constantJudgeProvider(
  verdict: string,
  reason = `${NOT_A_REAL_LLM_OUTPUT}: 固定判定`,
): FakeProvider {
  return createFakeProvider(() => ({ kind: 'structured', value: { verdict, reason } }));
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

export function malformedSchemaError(): AiError {
  return {
    code: 'PROVIDER_SCHEMA_INVALID',
    failure_kind: 'response_shape',
    message: 'The provider response did not match the requested structure.',
    retryable: true,
    path: 'browser_direct',
    http_status: null,
    target_block_reason: null,
  };
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
  /** Reserve an explicit `attempt_id` for this record (must be globally unique). */
  readonly attempt_id?: string;
  readonly raw_text?: string;
  readonly project_id?: string;
  /** `null` or omitted = explicitly unknown (`presence_state = 'unknown'`). */
  readonly goal?: string | null;
  readonly approach?: string | null;
  readonly condition?: string | null;
  readonly result?: string | null;
  readonly occurred_at?: string | null;
  readonly environment?: string | null;
  readonly failure_tags?: readonly string[];
  /** Step ④ candidate causes (`Inference|decision`). Never a Level A input (H4). */
  readonly candidate_causes?: readonly string[];
  /** Only the STATUS TEXT is varied: a `Formal` record always needs an accepted decision. */
  readonly result_status_value?: string;
  readonly state?: AttemptState;
  readonly archive_state?: ArchiveState;
}

/**
 * Formal-prerequisite defaults.
 *
 * 🔴 A `Formal Attempt` needs goal + actual attempt + actual result + an accepted result status
 *    (§2.1). These defaults only exist so a fixture can omit a dimension WITHOUT failing the gate;
 *    an explicit `null` still means "explicitly unknown", and a test that cares about the matched
 *    set always states the values it compares.
 */
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

/**
 * Seeds one `Attempt` through the REAL repository, so the fixtures are real persisted records and
 * not a parallel in-memory model.
 */
export async function seedAttempt(
  repository: AttemptRepository,
  ids: SeededIds,
  spec: AttemptSpec,
): Promise<Attempt> {
  if (spec.attempt_id !== undefined) {
    ids.reserve(spec.attempt_id);
  }
  const created = await repository.createAttempt({
    raw_text: spec.raw_text ?? `fixture:${spec.attempt_id ?? 'auto'}`,
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
    actual_result: optionalFact(
      id,
      'result',
      spec.result === undefined ? DEFAULT_RESULT : spec.result,
    ),
    /*
     * 「发生时间」 is a USER `Fact` (§4.2 rule 5), so it is seeded as a `Fact` item and never as a
     * systemic timestamp - `created_at` must never impersonate it (AC-78).
     */
    occurred_at:
      spec.occurred_at === undefined || spec.occurred_at === null
        ? { presence_state: 'unknown' }
        : provided(factItem(`${id}:occurred`, spec.occurred_at)),
    environment: optionalFact(id, 'environment', spec.environment),
    ...(spec.failure_tags === undefined ? {} : { failure_tags: spec.failure_tags }),
    ...(spec.candidate_causes === undefined
      ? {}
      : {
          candidate_causes: spec.candidate_causes.map((statement, index) =>
            decisionInferenceItem(`${id}:cause:${index}`, statement, 'unresolved'),
          ),
        }),
    ...(spec.archive_state === undefined ? {} : { archive_state: spec.archive_state }),
  };

  const wantsFormal = (spec.state ?? 'Formal') === 'Formal';
  const patch: AttemptPatch = wantsFormal
    ? {
        ...base,
        result_status: provided(
          decisionInferenceItem(
            `${id}:status`,
            spec.result_status_value ?? 'Failed',
            'accepted',
          ),
        ),
        state: 'Formal',
      }
    : base;
  return repository.updateAttempt(id, patch);
}

/* ------------------------------------------------------------------ *
 * Direct Attempt fixtures (dimension-level suites)
 * ------------------------------------------------------------------ */

export const FIXTURE_TIME = '2026-09-25T00:00:00.000Z';
export const FIXTURE_ATTEMPT_ID = 'ATT_0000000000000000000000000S' as ObjectId<'ATT'>;
export const FIXTURE_CANDIDATE_ID = 'ATT_0000000000000000000000000C' as ObjectId<'ATT'>;

export interface LevelAValues {
  readonly goal?: string | null;
  readonly approach?: string | null;
  readonly condition?: string | null;
  readonly result?: string | null;
}

/** A `Formal Attempt` carrying exactly the given Level A values; `null`/omitted = unknown. */
export function attemptFixture(
  values: LevelAValues,
  attempt_id: ObjectId<'ATT'> = FIXTURE_ATTEMPT_ID,
): Attempt {
  const draft = createDraftAttempt({
    attempt_id,
    raw_text: 'fixture',
    created_at: FIXTURE_TIME,
  });
  return {
    ...draft,
    state: 'Formal',
    goal: optionalFact(attempt_id, 'goal', values.goal),
    actual_attempt: optionalFact(attempt_id, 'approach', values.approach),
    condition: optionalFact(attempt_id, 'condition', values.condition),
    actual_result: optionalFact(attempt_id, 'result', values.result),
    result_status: provided(decisionInferenceItem(`${attempt_id}:status`, 'Failed', 'accepted')),
  };
}

/* ------------------------------------------------------------------ *
 * Harness
 * ------------------------------------------------------------------ */

export interface RetrievalHarness {
  readonly storage: InMemoryWorkspaceStorage;
  readonly repository: AttemptRepository;
  readonly derivations: RetrievalDerivationRepository;
  readonly provider: FakeProvider;
  readonly service: ExperienceRetrievalService;
  readonly ids: SeededIds;
  seed(spec: AttemptSpec): Promise<Attempt>;
  /** A brand-new service + derivation repository over the SAME persisted workspace. */
  reopen(): ExperienceRetrievalService;
  /** A brand-new attempt repository over the same storage - proves file-level durability. */
  reopenRepository(): AttemptRepository;
  /** Reads the raw persisted derivation file text, or `undefined` when absent. */
  rawDerivationFile(source_attempt_id: string): string | undefined;
  /** Every workspace path of the form `retrievals/*.json`. */
  retrievalFiles(): readonly string[];
}

export function makeHarness(
  resolve: (call: JudgeCall, index: number) => FakeReply,
  options: FakeProviderOptions = {},
): RetrievalHarness {
  const storage = new InMemoryWorkspaceStorage();
  const ids = new SeededIds();
  const open = (): AttemptRepository =>
    createAttemptRepository({ storage, now: makeClock(), newAttemptId: ids.next });
  const repository = open();
  const derivations = createRetrievalDerivationRepository({ storage });
  const provider = createFakeProvider(resolve, options);
  const context: RetrievalProviderContext = {
    adapter: provider.adapter,
    credential_ref: null,
  };
  const openService = (): ExperienceRetrievalService =>
    createExperienceRetrievalService({
      repository: open(),
      derivations: createRetrievalDerivationRepository({ storage }),
      provider: context,
      now: makeClock(),
    });

  return {
    storage,
    repository,
    derivations,
    provider,
    ids,
    service: openService(),
    seed: (spec) => seedAttempt(repository, ids, spec),
    reopen: openService,
    reopenRepository: open,
    rawDerivationFile: (source_attempt_id) =>
      storage.peek(`retrievals/${source_attempt_id}.json`),
    retrievalFiles: () =>
      Object.keys(storage.snapshot()).filter((path) => path.startsWith('retrievals/')),
  };
}
