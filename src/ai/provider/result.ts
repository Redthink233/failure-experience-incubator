/**
 * M10 ｜ Normalized AI result, error vocabulary and LOG REDACTION.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : "🔴 凭据日志红线：`Authorization` / API Key / 完整 request body 中的 secret
 *                       不得进入 Vercel logs / application logs / error logs / analytics /
 *                       浏览器 console；必须脱敏（REDACTED / 掩码 / hash）";
 *                       "不返回原始错误细节"
 *   - contract §10.1 layer 2 `RUNTIME`: "保留已有数据 + 明确提示 + 允许重试 + 提供恢复路径"
 *   - AC-149 / AC-150 / AC-151 / AC-158
 *
 * 🔴 Errors are built from a FIXED message table. No error path interpolates a URL, a header, a
 *    request body or a provider response body. That is why "credential never appears in a
 *    serialized error" is a property of the construction, not of a filter that might be skipped.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import { REDACTED } from './credential.js';
import type { ProviderPath } from './capability.js';

/** Technical classification of a failure. Layer 2 `RUNTIME` - recoverable by design. */
export type AiFailureKind =
  | 'unsupported'
  | 'credential_missing'
  | 'blocked_target'
  | 'redirect_blocked'
  | 'request_rejected'
  | 'network'
  | 'cors'
  | 'timeout'
  | 'http_status'
  | 'response_shape'
  | 'internal';

export type AiErrorCode =
  | 'PROVIDER_CONNECTION_UNSUPPORTED'
  | 'PROVIDER_CREDENTIAL_MISSING'
  | 'PROVIDER_REQUEST_INVALID'
  | 'PROVIDER_NETWORK_UNREACHABLE'
  | 'PROVIDER_CORS_BLOCKED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_HTTP_ERROR'
  | 'PROVIDER_RESPONSE_NOT_JSON'
  | 'PROVIDER_SCHEMA_INVALID'
  | 'PROXY_REQUEST_REJECTED'
  | 'PROXY_TARGET_BLOCKED'
  | 'PROXY_REDIRECT_NOT_FOLLOWED'
  | 'INTERNAL_UNEXPECTED';

/** Static, non-interpolated messages. Any new code MUST add its wording here. */
const MESSAGES: Readonly<Record<AiErrorCode, string>> = {
  PROVIDER_CONNECTION_UNSUPPORTED: 'Provider connection unsupported under current browser constraints.',
  PROVIDER_CREDENTIAL_MISSING: 'No credential is available for the configured provider in this session.',
  PROVIDER_REQUEST_INVALID: 'The AI request was rejected by normalization before any network call.',
  PROVIDER_NETWORK_UNREACHABLE: 'The provider endpoint could not be reached.',
  PROVIDER_CORS_BLOCKED: 'The browser refused the cross-origin provider request.',
  PROVIDER_TIMEOUT: 'The provider request timed out.',
  PROVIDER_HTTP_ERROR: 'The provider returned an error status.',
  PROVIDER_RESPONSE_NOT_JSON: 'The provider response could not be parsed as JSON.',
  PROVIDER_SCHEMA_INVALID: 'The provider response did not match the requested structure.',
  PROXY_REQUEST_REJECTED: 'The proxy request was rejected by strict validation.',
  PROXY_TARGET_BLOCKED: 'The proxy target was refused by the registered-provider target policy.',
  PROXY_REDIRECT_NOT_FOLLOWED: 'The provider endpoint issued a redirect, which is never followed.',
  INTERNAL_UNEXPECTED: 'An unexpected internal failure occurred.',
};

/** Which failures are worth offering a retry for (contract §10.1 layer 2: 允许重试). */
const RETRYABLE: Readonly<Record<AiErrorCode, boolean>> = {
  PROVIDER_CONNECTION_UNSUPPORTED: false,
  PROVIDER_CREDENTIAL_MISSING: false,
  PROVIDER_REQUEST_INVALID: false,
  PROVIDER_NETWORK_UNREACHABLE: true,
  PROVIDER_CORS_BLOCKED: false,
  PROVIDER_TIMEOUT: true,
  PROVIDER_HTTP_ERROR: true,
  PROVIDER_RESPONSE_NOT_JSON: true,
  PROVIDER_SCHEMA_INVALID: true,
  PROXY_REQUEST_REJECTED: false,
  PROXY_TARGET_BLOCKED: false,
  PROXY_REDIRECT_NOT_FOLLOWED: false,
  INTERNAL_UNEXPECTED: true,
};

export interface AiError {
  readonly code: AiErrorCode;
  readonly failure_kind: AiFailureKind;
  /** Always from `MESSAGES`. Carries no endpoint, header, body or credential fragment. */
  readonly message: string;
  readonly retryable: boolean;
  /** Which network shape produced the failure; `null` when no request was attempted. */
  readonly path: ProviderPath | null;
  readonly http_status: number | null;
  /** Machine-readable consequence for the proxy layer; `null` for client-side failures. */
  readonly target_block_reason: string | null;
}

export function aiError(
  code: AiErrorCode,
  failure_kind: AiFailureKind,
  options: {
    readonly path?: ProviderPath | null;
    readonly http_status?: number | null;
    readonly target_block_reason?: string | null;
  } = {},
): AiError {
  return {
    code,
    failure_kind,
    message: MESSAGES[code],
    retryable: RETRYABLE[code],
    path: options.path ?? null,
    http_status: options.http_status ?? null,
    target_block_reason: options.target_block_reason ?? null,
  };
}

export type AiResult =
  | {
      readonly kind: 'ok';
      readonly text: string;
      readonly http_status: number;
      /** Present only when the request asked for structured output AND it validated. */
      readonly structured: Readonly<Record<string, unknown>> | null;
    }
  | { readonly kind: 'error'; readonly error: AiError };

export function aiOk(
  text: string,
  http_status: number,
  structured: Readonly<Record<string, unknown>> | null = null,
): AiResult {
  return { kind: 'ok', text, http_status, structured };
}

export function aiFailed(error: AiError): AiResult {
  return { kind: 'error', error };
}

/* ------------------------------------------------------------------ *
 * Redaction - the AC-158 mechanism
 * ------------------------------------------------------------------ */

/** Key names that must never have their value written out, at any nesting depth. */
const SENSITIVE_KEY_PATTERN =
  /(authorization|api[-_]?key|apikey|secret|token|password|passwd|credential|bearer|session[-_]?key)/i;

/** Values that look like a bearer credential even under an innocent key name. */
const BEARER_VALUE_PATTERN = /\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}/i;
const PROVIDER_KEY_VALUE_PATTERN = /\b(sk|pk|api)[-_][A-Za-z0-9._-]{12,}\b/i;

const MAX_REDACTION_DEPTH = 6;
const MAX_STRING_ECHO = 512;

function redactString(value: string): string {
  if (BEARER_VALUE_PATTERN.test(value) || PROVIDER_KEY_VALUE_PATTERN.test(value)) {
    return REDACTED;
  }
  return value.length > MAX_STRING_ECHO ? `${value.slice(0, MAX_STRING_ECHO)}…` : value;
}

/**
 * Deep-copies a value with every credential-shaped leaf replaced by `REDACTED`.
 *
 * 🔴 Use this before anything reaches a console, a log sink, an analytics call or an error
 *    boundary. `CredentialSecret` already serialises to `{}`, so this is the second layer of the
 *    same guarantee - not the only one.
 */
export function redactForLog(value: unknown): unknown {
  return redactAtDepth(value, 0);
}

function redactAtDepth(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    return redactString(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (depth >= MAX_REDACTION_DEPTH) {
    return '[TRUNCATED]';
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactAtDepth(entry, depth + 1));
  }
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactAtDepth(child, depth + 1);
    }
    return output;
  }
  return '[UNSERIALIZABLE]';
}

/**
 * The ONLY sanctioned shape for logging an `AiError`. Technical-layer fields only; the message is
 * a fixed string; the record is passed through `redactForLog` as a belt-and-braces measure.
 */
export function aiErrorToLogRecord(error: AiError): Readonly<Record<string, unknown>> {
  return redactForLog({
    code: error.code,
    failure_kind: error.failure_kind,
    message: error.message,
    retryable: error.retryable,
    path: error.path,
    http_status: error.http_status,
    target_block_reason: error.target_block_reason,
  }) as Readonly<Record<string, unknown>>;
}

/** Convenience wrapper for the whole result. */
export function aiResultToLogRecord(result: AiResult): Readonly<Record<string, unknown>> {
  if (result.kind === 'ok') {
    return { kind: 'ok', http_status: result.http_status, text_length: result.text.length };
  }
  return { kind: 'error', error: aiErrorToLogRecord(result.error) };
}
