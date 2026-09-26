/**
 * M12 boundary ｜ The pure proxy pipeline: authorize → describe outbound → classify response.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : `provider_id → 固定 Adapter → 固定 / 严格受控 Provider Host`;
 *                       "🔴 不得用请求参数修改最终目标 host"; "🔴 不得跟随重定向至 allowlist 之外"
 *   - docs/07 §5.12.1 / §5.12.3
 *   - AC-146 / AC-147 / AC-148 / AC-149 / AC-151 / AC-152 / AC-157
 *
 * ── WHY THIS IS A PURE MODULE (and not inlined into the Node handler) ────────────────
 * Every security-relevant decision of M12 is expressed as a total function of
 * `(untrusted document, SERVER registry)`. The Node handler in `api/proxy/**` is then a
 * transport shell with no policy of its own, and each policy is behaviourally testable.
 *
 * 🔴 `authorizeProxyCall` has NO parameter carrying a client-supplied destination, credential or
 *    allowlist. The destination is looked up from `registry`; the credential is attached later,
 *    by `withBearerCredential`, and never enters the returned descriptor.
 *
 * 🔴 The returned `outbound` descriptor is the LOGGABLE artifact: it contains the resolved URL and
 *    the fixed headers, and no credential.
 *
 * ── SPLIT WITH THE M10 CONTRACT (S01-W1-INTEGRATE) ──────────────────────────────────
 * The STATUS/BODY classification ("redirect / error status / unparseable / payload") is shared with
 * the browser adapter and therefore lives in the framework-neutral M10 contract
 * (`src/ai/provider/response-normalization.ts`). This module DELEGATES to it and adds only what is
 * genuinely M12: which redirect TARGET is inside the registered allowlist (`evaluateRedirect`).
 * That keeps the two network shapes from drifting on the shared branches while keeping the
 * dependency direction `src/server/proxy/** → src/ai/**` with no back-edge.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ProxyRequest, ProxyRequestRejectionReason } from './proxy-request.js';
import { parseProxyRequest } from './proxy-request.js';
import { evaluateRedirect, evaluateTarget } from './target-policy.js';
import type { RedirectVerdict, TargetBlockReason, AllowedTarget } from './target-policy.js';
import type { ProviderRegistry } from '../../ai/provider/registry.js';
import type { ProviderPath } from '../../ai/provider/capability.js';
import { buildProviderPayload, validateAiRequest } from '../../ai/provider/request.js';
import { selectStructuredOutputMode } from '../../ai/provider/structured-output.js';
import type { HttpRequestDescriptor } from '../../ai/provider/transport.js';
import { utf8ByteLength } from '../../ai/provider/transport.js';
import { aiError } from '../../ai/provider/result.js';
import type { AiError } from '../../ai/provider/result.js';
import { normalizeProviderResponse, providerResponseError } from '../../ai/provider/response-normalization.js';

/** Machine-readable reason a proxy call was refused. Never contains a client value. */
export type ProxyDenialDetail =
  | ProxyRequestRejectionReason
  | 'unregistered_provider'
  | 'provider_not_proxy_capable'
  | 'target_blocked'
  | 'body_too_large'
  | 'invalid_model';

export type ProxyDenialStatus = 400 | 403 | 404 | 413;

export interface ProxyAuthorizationGranted {
  readonly kind: 'granted';
  readonly request: ProxyRequest;
  /**
   * The resolved outbound call. 🔴 Contains NO credential header - attach it with
   * `withBearerCredential` immediately before sending.
   */
  readonly outbound: HttpRequestDescriptor;
  /** Registered endpoint actually used. Reported for diagnostics; not client-influenced. */
  readonly resolved_target_url: string;
  readonly resolved_host: string;
}

export interface ProxyAuthorizationDenied {
  readonly kind: 'denied';
  readonly status: ProxyDenialStatus;
  readonly detail: ProxyDenialDetail;
  readonly error: AiError;
}

export type ProxyAuthorization = ProxyAuthorizationGranted | ProxyAuthorizationDenied;

export interface ProxyLimits {
  readonly timeout_ms: number;
  readonly max_body_bytes: number;
}

function denied(
  status: ProxyDenialStatus,
  detail: ProxyDenialDetail,
  error: AiError,
): ProxyAuthorizationDenied {
  return { kind: 'denied', status, detail, error };
}

function endpointUrl(host: string, port: number | null, path_prefix: string): string {
  const authority = port === null ? host : `${host}:${port}`;
  return `https://${authority}${path_prefix}`;
}

/**
 * The single authorization gate of the thin proxy.
 *
 * Steps, in order:
 *   ① strict parse of the untrusted document (⇒ 400, never echoes a value);
 *   ② registry lookup by `provider_id` (⇒ 404 for an unregistered provider);
 *   ③ capability check: the provider must actually offer the proxy path (⇒ 400);
 *   ④ build the ONE legal target URL from the registration - the only destination source;
 *   ⑤ re-verify it through `evaluateTarget` against the registry-derived allowlist (defence in
 *      depth: the constant proof that step ④ cannot produce an off-policy target);
 *   ⑥ body-size ceiling (⇒ 413).
 *
 * 🔴 A second-best or fallback target does not exist in this function: refusal is terminal.
 */
export function authorizeProxyCall(
  raw: unknown,
  registry: ProviderRegistry,
  limits: ProxyLimits,
): ProxyAuthorization {
  const parsed = parseProxyRequest(raw);
  if (parsed.kind === 'rejected') {
    return denied(
      400,
      parsed.reason,
      aiError('PROXY_REQUEST_REJECTED', 'request_rejected', { path: 'thin_proxy' }),
    );
  }

  const request = parsed.request;
  const registration = registry.get(request.provider_id);
  if (registration === null) {
    return denied(
      404,
      'unregistered_provider',
      aiError('PROXY_REQUEST_REJECTED', 'request_rejected', { path: 'thin_proxy' }),
    );
  }

  const endpoint = registration.proxy_endpoint;
  if (endpoint === null || !registration.capability.thin_proxy) {
    return denied(
      400,
      'provider_not_proxy_capable',
      aiError('PROXY_REQUEST_REJECTED', 'request_rejected', { path: 'thin_proxy' }),
    );
  }

  const target_url = endpointUrl(endpoint.host, endpoint.port, endpoint.path_prefix);
  const verdict = evaluateTarget(target_url, registry.target_allowlist());
  if (verdict.kind === 'blocked') {
    return denied(
      403,
      'target_blocked',
      aiError('PROXY_TARGET_BLOCKED', 'blocked_target', {
        path: 'thin_proxy',
        target_block_reason: verdict.reason satisfies TargetBlockReason,
      }),
    );
  }

  const request_violations = validateAiRequest({
    provider_id: request.provider_id,
    model: request.model,
    messages: request.messages,
    structured_output: request.structured_output,
  });
  if (request_violations.length > 0) {
    return denied(
      400,
      'invalid_model',
      aiError('PROXY_REQUEST_REJECTED', 'request_rejected', { path: 'thin_proxy' }),
    );
  }

  const mode = selectStructuredOutputMode(
    registration.capability.structured_output,
    request.structured_output?.preferred_mode ?? 'none',
  );
  const payload = buildProviderPayload(
    {
      provider_id: request.provider_id,
      model: request.model,
      messages: request.messages,
      structured_output: request.structured_output,
    },
    mode,
  );
  const body = JSON.stringify(payload);
  if (utf8ByteLength(body) > limits.max_body_bytes) {
    return denied(
      413,
      'body_too_large',
      aiError('PROXY_REQUEST_REJECTED', 'request_rejected', { path: 'thin_proxy' }),
    );
  }

  return {
    kind: 'granted',
    request,
    resolved_target_url: verdict.url,
    resolved_host: verdict.host,
    outbound: {
      url: verdict.url,
      method: 'POST',
      // 🔴 A FIXED header set. No client header is forwarded, so no arbitrary header can reach
      //    the provider and no credential can be pre-attached by the caller.
      headers: { 'content-type': 'application/json' },
      body,
      timeout_ms: limits.timeout_ms,
      follow_redirects: false,
    },
  };
}

export type ProxyResponseVerdict =
  | { readonly kind: 'ok'; readonly text: string; readonly http_status: number }
  | {
      readonly kind: 'redirect_not_followed';
      readonly http_status: number;
      readonly redirect: RedirectVerdict;
      readonly error: AiError;
    }
  | { readonly kind: 'http_error'; readonly http_status: number; readonly error: AiError }
  | { readonly kind: 'unparseable'; readonly http_status: number; readonly error: AiError };

/**
 * Classifies a provider response that has already been received, from the SERVER side.
 *
 * 🔴 Redirects are NEVER followed (`follow_redirects: false`, and the transports use
 *    `redirect: 'manual'` / `'manual'`). In a browser an opaque redirect surfaces as `status === 0`;
 *    the shared M10 classifier reports that as `redirect` rather than mistaking it for success.
 * 🔴 Provider error bodies are never returned: only the status and a fixed message.
 * 🔴 The shared branches come from `normalizeProviderResponse`; only the allowlist-aware redirect
 *    detail is added here, so `M11` and `M12` cannot disagree about the shared cases.
 */
export function classifyProviderResponse(
  path: ProviderPath,
  status: number,
  location: string | null,
  body_text: string,
  base_url: string,
  allowlist: readonly AllowedTarget[],
): ProxyResponseVerdict {
  const normalized = normalizeProviderResponse(status, body_text);

  if (normalized.kind === 'ok') {
    return { kind: 'ok', text: normalized.text, http_status: normalized.http_status };
  }

  if (normalized.kind === 'redirect') {
    const opaque = normalized.http_status === 0;
    const redirect: RedirectVerdict = opaque
      ? { kind: 'outside_allowlist', reason: 'invalid_url', host: null }
      : evaluateRedirect(location ?? '', allowlist, base_url);
    return {
      kind: 'redirect_not_followed',
      http_status: normalized.http_status,
      redirect,
      error: aiError('PROXY_REDIRECT_NOT_FOLLOWED', 'redirect_blocked', {
        path,
        http_status: opaque ? null : normalized.http_status,
        target_block_reason:
          !opaque && redirect.kind === 'outside_allowlist'
            ? (redirect.reason satisfies TargetBlockReason)
            : null,
      }),
    };
  }

  if (normalized.kind === 'unparseable') {
    return {
      kind: 'unparseable',
      http_status: normalized.http_status,
      error: providerResponseError(path, 'unparseable', normalized.http_status),
    };
  }

  return {
    kind: 'http_error',
    http_status: normalized.http_status,
    error: providerResponseError(path, 'http_error', normalized.http_status),
  };
}
