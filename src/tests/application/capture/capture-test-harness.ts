/**
 * S01-05 ｜ Deterministic test doubles for the capture application layer.
 *
 * 🔴 NOT_A_REAL_LLM_OUTPUT: every payload produced through this file is a hand-written fixture.
 *    A test that passes here proves the APPLICATION's behaviour - it does NOT verify any model's
 *    ability, and it does NOT verify any provider. No network call is ever made.
 * 🔴 The fake adapter implements the `M10` `ProviderAdapter` INTERFACE only; it constructs no
 *    browser-direct adapter, no proxy client and no registry.
 */

import type { AiInvocation, ProviderAdapter } from '../../../ai/provider/adapter.js';
import type { ProviderCapability, ProviderConfig, ProviderPath } from '../../../ai/provider/capability.js';
import {
  resolveProviderPath,
} from '../../../ai/provider/capability.js';
import type { StructuredOutputMode } from '../../../ai/provider/capability.js';
import { providerId } from '../../../ai/provider/ids.js';
import type { AiError } from '../../../ai/provider/result.js';
import { aiFailed, aiOk } from '../../../ai/provider/result.js';
import { createAttemptRepository } from '../../../workspace/repository/attempt-repository.js';
import type { AttemptRepository } from '../../../workspace/repository/attempt-repository.js';
import { InMemoryWorkspaceStorage } from '../../../workspace/memory-storage.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';
import type { MaybeProvided } from '../../../domain/types/presence.js';
import type { ContentItem } from '../../../domain/types/source-type.js';
import { createAttemptCaptureService } from '../../../application/capture/capture-service.js';
import type { AttemptCaptureService } from '../../../application/capture/capture-service.js';

/** Marker required by S01-05 for every AI fixture. */
export const NOT_A_REAL_LLM_OUTPUT = 'NOT_A_REAL_LLM_OUTPUT';

export const FAKE_PROVIDER_ID_TEXT = 'fake-provider';
export const FAKE_MODEL_ID = 'fake-model-1';

export type FakeReply =
  | { readonly kind: 'structured'; readonly value: Readonly<Record<string, unknown>>; readonly text?: string }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'error'; readonly error: AiError };

export interface FakeProvider {
  readonly adapter: ProviderAdapter;
  /** Every invocation the application really made - the "M10-only" proof is structural. */
  readonly invocations: readonly AiInvocation[];
}

export interface FakeProviderOptions {
  readonly structured_output?: StructuredOutputMode;
  readonly model?: string;
  readonly browser_direct?: boolean;
}

export function createFakeProvider(
  reply: FakeReply | readonly FakeReply[],
  options: FakeProviderOptions = {},
): FakeProvider {
  const replies: readonly FakeReply[] = Array.isArray(reply) ? reply : [reply as FakeReply];
  const capability: ProviderCapability = {
    structured_output: options.structured_output ?? 'native_schema',
    browser_direct: options.browser_direct ?? true,
    thin_proxy: false,
  };
  const path_resolution = resolveProviderPath(capability);
  const path: ProviderPath = path_resolution.kind === 'resolved' ? path_resolution.path : 'browser_direct';
  const config: ProviderConfig = {
    provider_id: providerId(FAKE_PROVIDER_ID_TEXT),
    display_name: 'Fake provider (test double)',
    model: options.model ?? FAKE_MODEL_ID,
    base_url: null,
    base_url_source: 'registered_fixed',
    capability,
  };
  const invocations: AiInvocation[] = [];

  const adapter: ProviderAdapter = {
    provider_id: config.provider_id,
    config,
    capability,
    path,
    path_resolution,
    async execute(invocation: AiInvocation) {
      const index = invocations.length;
      invocations.push(invocation);
      const current = replies[Math.min(index, replies.length - 1)] as FakeReply;
      if (current.kind === 'error') {
        return aiFailed(current.error);
      }
      if (current.kind === 'text') {
        return aiOk(current.text, 200, null);
      }
      return aiOk(current.text ?? JSON.stringify(current.value), 200, current.value);
    },
  };

  return { adapter, invocations };
}

/* ------------------------------------------------------------------ *
 * Repository harness
 * ------------------------------------------------------------------ */

const BASE_TIME = Date.parse('2026-09-25T00:00:00.000Z');

export function makeClock(): () => string {
  let tick = 0;
  return () => new Date(BASE_TIME + tick++ * 60_000).toISOString();
}

export function makeIdFactory(): () => ObjectId<'ATT'> {
  let sequence = 0;
  return () => `ATT_${String(sequence++).padStart(26, '0')}` as ObjectId<'ATT'>;
}

export interface CaptureHarness {
  readonly repository: AttemptRepository;
  readonly service: AttemptCaptureService;
  readonly provider: FakeProvider;
}

export function makeHarness(
  reply: FakeReply | readonly FakeReply[],
  options: FakeProviderOptions = {},
): CaptureHarness {
  const repository = createAttemptRepository({
    storage: new InMemoryWorkspaceStorage(),
    now: makeClock(),
    newAttemptId: makeIdFactory(),
  });
  const provider = createFakeProvider(reply, options);
  const service = createAttemptCaptureService({
    repository,
    provider: { adapter: provider.adapter, credential_ref: null },
  });
  return { repository, service, provider };
}

/* ------------------------------------------------------------------ *
 * Reload harness (S01-05-INTEGRATE)
 * ------------------------------------------------------------------ */

export interface ReloadableCaptureHarness {
  /** The persisted workspace - survives every "reload" below. */
  readonly storage: InMemoryWorkspaceStorage;
  readonly repository: AttemptRepository;
  readonly provider: FakeProvider;
  readonly service: AttemptCaptureService;
  /**
   * Simulates a browser reload / a recreated composition root: a brand-new service (and, on
   * request, a brand-new repository) over the SAME persisted workspace.
   *
   * 🔴 It is the ONLY way a test may claim that state "survives a reload": nothing is carried
   *    over except what was really written to storage.
   */
  reopen(): AttemptCaptureService;
  /** A completely fresh repository over the same storage - proves file-level durability. */
  reopenRepository(): AttemptRepository;
}

export function makeReloadableHarness(
  reply: FakeReply | readonly FakeReply[],
  options: FakeProviderOptions = {},
): ReloadableCaptureHarness {
  const storage = new InMemoryWorkspaceStorage();
  const repository = makeRepositoryOver(storage);
  const provider = createFakeProvider(reply, options);
  const open = (): AttemptCaptureService =>
    createAttemptCaptureService({
      repository,
      provider: { adapter: provider.adapter, credential_ref: null },
    });
  return {
    storage,
    repository,
    provider,
    service: open(),
    reopen: open,
    reopenRepository: () => makeRepositoryOver(storage),
  };
}

function makeRepositoryOver(storage: InMemoryWorkspaceStorage): AttemptRepository {
  return createAttemptRepository({
    storage,
    now: makeClock(),
    newAttemptId: makeIdFactory(),
  });
}

/* ------------------------------------------------------------------ *
 * Hand-written payload fixtures
 * ------------------------------------------------------------------ */

/** A NOT_A_REAL_LLM_OUTPUT step ② answer. Omitted keys mean "not extracted" (AC-04). */
export function parsePayload(
  overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return {
    parse_status: 'partially_extracted',
    goal: '把干燥时间降到 30 分钟以内',
    actual_attempt: '把热风温度从 50 度调到 70 度',
    actual_result: '表面出现明显开裂',
    ...overrides,
  };
}

/** A NOT_A_REAL_LLM_OUTPUT step ④ answer. `causes: []` is legal (AC-91). */
export function causePayload(
  causes: readonly { readonly statement: string; readonly supporting_source_paths?: readonly string[] }[],
  absence_note = '',
): Readonly<Record<string, unknown>> {
  return {
    causes: causes.map((cause) => ({
      statement: cause.statement,
      supporting_source_paths: cause.supporting_source_paths ?? ['condition'],
    })),
    cause_absence_note: absence_note,
  };
}

/** The canonical 0-cause sentence required by AC-92. */
export const ZERO_CAUSE_STATEMENT = '当前依据不足，暂不推断原因';

/** An `AiError` built from the frozen M10 table - never a fabricated message string. */
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

/** The content item of a `MaybeProvided` slot, or `null` when the slot is explicitly unknown. */
export function contentOf(slot: MaybeProvided<ContentItem> | undefined): ContentItem | null {
  if (slot === undefined || slot.presence_state !== 'present') {
    return null;
  }
  return slot.item;
}
