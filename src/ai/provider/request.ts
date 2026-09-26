/**
 * M10 ｜ Normalized AI request and its single wire-payload builder.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 A : "🔴 只发送完成当前 AI 操作所需的最小必要上下文；🔴 不得默认上传整个 Workspace"
 *   - contract §0.4 D : "Proxy 的 THIN 允许项：仅 request normalization / forwarding /
 *                        response normalization / timeout·error mapping / 必要的 schema transport"
 *   - docs/07 §5.12.3
 *   - AC-145 / AC-149
 *
 * 🔴 `AiRequest` structurally contains NO credential and NO workspace handle:
 *      - no `api_key` / `authorization` / `credential` field exists on the type;
 *      - no `workspace` / `files` / `attachments` / `directory` field exists on the type.
 *    "Credential is not a persistable request field" and "the whole workspace is never uploaded"
 *    are therefore type-level properties, not review conventions.
 *
 * 🔴 The normalized payload built by `buildProviderPayload` has EXACTLY four allowed keys
 *    (see `PROVIDER_PAYLOAD_KEYS`) - anything else is dropped, so a caller cannot smuggle extra
 *    context (e.g. a full workspace dump) through this layer.
 *
 * 🔴 Technical-layer fields (`temperature` / sampling / seed / `token` accounting) are deliberately
 *    ABSENT from V1: contract §11.2 keeps them out of the product layer, and their reproducibility
 *    is `DEFERRED UNTIL IMPLEMENTATION`. They must not be invented here.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ProviderId } from './ids.js';
import type { StructuredOutputMode } from './capability.js';
import type { StructuredOutputRequest } from './structured-output.js';

export type AiRole = 'system' | 'user' | 'assistant';

export const AI_ROLES: readonly AiRole[] = ['system', 'user', 'assistant'];

export interface AiMessage {
  readonly role: AiRole;
  readonly content: string;
}

export interface AiRequest {
  readonly provider_id: ProviderId;
  /** Configured model for this call. Sourced from configuration, never guessed by business logic. */
  readonly model: string;
  /** The MINIMAL context needed for the current AI operation. */
  readonly messages: readonly AiMessage[];
  /** `null` when the operation does not require constrained JSON. */
  readonly structured_output: StructuredOutputRequest | null;
}

/** The only keys that may ever appear on the outbound provider payload. */
export const PROVIDER_PAYLOAD_KEYS: readonly string[] = ['model', 'messages', 'response_format'];

export interface ProviderPayloadMessage {
  readonly role: AiRole;
  readonly content: string;
}

export interface ProviderPayload {
  readonly model: string;
  readonly messages: readonly ProviderPayloadMessage[];
  readonly response_format?: Readonly<Record<string, unknown>>;
}

/**
 * Maps the provider's structured-output capability onto a wire `response_format`.
 * Returns `undefined` (key omitted) when the provider offers nothing native - the caller decides
 * what to do; this function never invents a constraint the provider cannot express.
 */
export function responseFormatFor(
  mode: StructuredOutputMode,
  structured_output: StructuredOutputRequest | null,
): Readonly<Record<string, unknown>> | undefined {
  if (structured_output === null || mode === 'none') {
    return undefined;
  }
  if (mode === 'native_schema') {
    return { type: 'json_schema', json_schema: structured_output.json_schema };
  }
  return { type: 'json_object' };
}

/** Normalizes an `AiRequest` into the exact wire body. Extra keys are impossible by construction. */
export function buildProviderPayload(request: AiRequest, mode: StructuredOutputMode): ProviderPayload {
  const messages: readonly ProviderPayloadMessage[] = request.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
  const response_format = responseFormatFor(mode, request.structured_output);
  if (response_format === undefined) {
    return { model: request.model, messages };
  }
  return { model: request.model, messages, response_format };
}

/**
 * Drops messages the contract forbids and reports what happened instead of failing silently.
 * An empty / whitespace-only message list is a caller bug, so it is reported as a violation
 * rather than replaced with filler content.
 */
export type AiRequestViolationCode = 'empty_messages' | 'empty_message_content' | 'empty_model';

export interface AiRequestViolation {
  readonly code: AiRequestViolationCode;
  readonly detail: string;
}

export function validateAiRequest(request: AiRequest): readonly AiRequestViolation[] {
  const violations: AiRequestViolation[] = [];
  if (request.model.trim().length === 0) {
    violations.push({ code: 'empty_model', detail: 'A model must be configured (AC-132).' });
  }
  if (request.messages.length === 0) {
    violations.push({ code: 'empty_messages', detail: 'At least one message is required.' });
  }
  for (const message of request.messages) {
    if (message.content.trim().length === 0) {
      violations.push({
        code: 'empty_message_content',
        detail: 'A message must not be empty; refusing to invent content.',
      });
      break;
    }
  }
  return violations;
}
