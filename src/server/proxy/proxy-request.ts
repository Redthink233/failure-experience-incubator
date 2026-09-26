/**
 * M12 ｜ `ProxyRequest` + STRICT validation (pure server policy).
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : "🔴 Proxy 接口 target 约束：不得接受 client 提交的任意 target_url / base_url /
 *                        host / scheme 并据其代请求；必须通过 provider_id 选择服务器端已注册 Adapter"
 *   - docs/07 §5.12.1 : "🔴 不得用请求参数修改最终目标 host"
 *   - AC-146 / AC-148
 *
 * ── WHY THIS FILE LIVES IN `src/server/proxy/**` (S01-W1-INTEGRATE) ──────────────────
 * The accepted shape of a client request to the thin proxy is `M12` policy, not part of the `M10`
 * provider contract: it is the server's decision about what a remote caller may even SAY. It used
 * to sit in `src/ai/boundary/**` purely because the test build could not reach `api/proxy/**`; with
 * `tsconfig.proxy-test.json` that constraint is gone, so it moved to its owner. `src/ai/**` no
 * longer contains or exports it.
 *
 * 🔴 THE CENTRAL STRUCTURAL CLAIM OF THIS FILE:
 *    `ProxyRequest` has NO field that can name a network destination. Its only destination-bearing
 *    value is `provider_id`, which is an opaque identity resolved by the SERVER (`ProviderRegistry`)
 *    into a fixed / allowlisted host. A client therefore cannot express "call this URL".
 *    `FORBIDDEN_TARGET_FIELDS` is the machine-readable form of that list, and the test suite asserts
 *    at the TYPE level that `ProxyRequest` contains none of those keys.
 *
 * 🔴 Extra fields are REJECTED, not ignored-in-silence: a request that carries `target_url` is
 *    refused with `forbidden_target_field`, which is directly observable by the caller.
 *
 * 🔴 Rejection messages echo FIELD NAMES only - never the offending VALUE. A value could contain a
 *    credential, so echoing it would leak into logs (AC-158).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import { isWellFormedProviderId } from '../../ai/provider/ids.js';
import type { ProviderId } from '../../ai/provider/ids.js';
import type { AiMessage, AiRole } from '../../ai/provider/request.js';
import { AI_ROLES } from '../../ai/provider/request.js';
import type { StructuredOutputMode } from '../../ai/provider/capability.js';
import type { StructuredOutputRequest } from '../../ai/provider/structured-output.js';

/**
 * Every field name a client might use to smuggle a destination. Exact match, case-insensitive.
 * This is the machine-checkable form of AC-148's list plus its obvious aliases.
 */
export const FORBIDDEN_TARGET_FIELDS: readonly string[] = [
  'target_url',
  'target',
  'base_url',
  'baseurl',
  'host',
  'hostname',
  'scheme',
  'protocol',
  'port',
  'url',
  'uri',
  'endpoint',
  'origin',
  'authority',
  'netloc',
  'upstream',
  'destination',
  'proxy_url',
  'redirect_url',
];

/** The complete, closed key set of a legal proxy request. */
export const PROXY_REQUEST_KEYS: readonly string[] = [
  'provider_id',
  'request_id',
  'model',
  'messages',
  'structured_output',
];

/**
 * 🔴 The ONLY accepted client payload.
 * There is intentionally no `credential` field: the credential travels in the transport header for
 * the lifetime of the single request and is never part of the request document.
 */
export interface ProxyRequest {
  /** Opaque identity; the server resolves it. Never a URL and never a host (AC-146). */
  readonly provider_id: ProviderId;
  /** Client-generated id, purely for correlating one request with one response. */
  readonly request_id: string;
  readonly model: string;
  readonly messages: readonly AiMessage[];
  readonly structured_output: StructuredOutputRequest | null;
}

export type ProxyRequestRejectionReason =
  | 'not_an_object'
  | 'forbidden_target_field'
  | 'unknown_field'
  | 'missing_provider_id'
  | 'invalid_provider_id'
  | 'invalid_request_id'
  | 'invalid_model'
  | 'invalid_messages'
  | 'invalid_structured_output';

export type ProxyRequestParseResult =
  | { readonly kind: 'accepted'; readonly request: ProxyRequest }
  | { readonly kind: 'rejected'; readonly reason: ProxyRequestRejectionReason; readonly offending_fields: readonly string[] };

const MAX_REQUEST_ID_LENGTH = 96;
const MAX_MESSAGES = 64;
const MAX_MESSAGE_CHARS = 100_000;

function rejected(reason: ProxyRequestRejectionReason, offending_fields: readonly string[] = []): ProxyRequestParseResult {
  return { kind: 'rejected', reason, offending_fields };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMessages(value: unknown): readonly AiMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
    return null;
  }
  const messages: AiMessage[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      return null;
    }
    const role = entry['role'];
    const content = entry['content'];
    if (typeof role !== 'string' || !AI_ROLES.includes(role as AiRole)) {
      return null;
    }
    if (typeof content !== 'string' || content.length === 0 || content.length > MAX_MESSAGE_CHARS) {
      return null;
    }
    if (Object.keys(entry).some((key) => key !== 'role' && key !== 'content')) {
      return null;
    }
    messages.push({ role: role as AiRole, content });
  }
  return messages;
}

function parseStructuredOutput(value: unknown): StructuredOutputRequest | null | 'invalid' {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isRecord(value)) {
    return 'invalid';
  }
  const allowed = ['schema_id', 'json_schema', 'preferred_mode'];
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    return 'invalid';
  }
  const schema_id = value['schema_id'];
  const json_schema = value['json_schema'];
  const preferred_mode = value['preferred_mode'];
  if (typeof schema_id !== 'string' || schema_id.length === 0 || schema_id.length > MAX_REQUEST_ID_LENGTH) {
    return 'invalid';
  }
  if (!isRecord(json_schema)) {
    return 'invalid';
  }
  const modes: readonly StructuredOutputMode[] = ['native_schema', 'json_object', 'none'];
  if (typeof preferred_mode !== 'string' || !modes.includes(preferred_mode as StructuredOutputMode)) {
    return 'invalid';
  }
  return {
    schema_id,
    json_schema,
    preferred_mode: preferred_mode as StructuredOutputMode,
  };
}

/**
 * Strict, closed-shape parse of an untrusted client document.
 *
 * Order matters for observability: a smuggled destination is reported as
 * `forbidden_target_field` BEFORE the generic `unknown_field` rule, so the security-relevant
 * rejection is the one operators see.
 */
export function parseProxyRequest(raw: unknown): ProxyRequestParseResult {
  if (!isRecord(raw)) {
    return rejected('not_an_object');
  }

  const keys = Object.keys(raw);

  const forbidden = keys.filter((key) => FORBIDDEN_TARGET_FIELDS.includes(key.toLowerCase()));
  if (forbidden.length > 0) {
    return rejected('forbidden_target_field', forbidden);
  }

  const unknown = keys.filter((key) => !PROXY_REQUEST_KEYS.includes(key));
  if (unknown.length > 0) {
    return rejected('unknown_field', unknown);
  }

  const provider_id = raw['provider_id'];
  if (provider_id === undefined) {
    return rejected('missing_provider_id');
  }
  if (!isWellFormedProviderId(provider_id)) {
    return rejected('invalid_provider_id', ['provider_id']);
  }

  const request_id = raw['request_id'];
  if (typeof request_id !== 'string' || request_id.length === 0 || request_id.length > MAX_REQUEST_ID_LENGTH) {
    return rejected('invalid_request_id', ['request_id']);
  }

  const model = raw['model'];
  if (typeof model !== 'string' || model.length === 0 || model.length > MAX_REQUEST_ID_LENGTH) {
    return rejected('invalid_model', ['model']);
  }

  const messages = parseMessages(raw['messages']);
  if (messages === null) {
    return rejected('invalid_messages', ['messages']);
  }

  const structured = parseStructuredOutput(raw['structured_output']);
  if (structured === 'invalid') {
    return rejected('invalid_structured_output', ['structured_output']);
  }

  return {
    kind: 'accepted',
    request: {
      provider_id: provider_id.toLowerCase() as ProviderId,
      request_id,
      model,
      messages,
      structured_output: structured,
    },
  };
}
