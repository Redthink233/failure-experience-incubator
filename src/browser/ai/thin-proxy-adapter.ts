/**
 * M12 client ｜ Thin Proxy Provider Adapter - the browser-side CLIENT of the registered thin proxy.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : `Thin Proxy` 适用条件 = ① 浏览器 CORS 不可用 / 不可靠 ② Provider 官方不支持浏览器直连
 *                       ③ **必须**由产品服务器保护固定 endpoint ④ 用户 Credential 仍需可用;
 *                       "路径 = Browser → Vercel Proxy → LLM Provider";
 *                       "Proxy 接口 target 约束 🔴 不得接受 client 提交的任意 `target_url` / `base_url` /
 *                        `host` / `scheme` 并据其代请求；必须通过 `provider_id` 选择服务器端已注册 Adapter";
 *                       "Custom Base URL 🔴 默认 = Browser Direct Only"
 *   - docs/07 §5.12.1 / §5.12.3
 *   - AC-144 / AC-146 / AC-147 / AC-148 / AC-149 / AC-150 / AC-151 / AC-158
 *
 * ── WHY THIS FILE EXISTS (an IMPLEMENTATION GAP, not a product decision) ─────────────
 * The Wave-1 provider composition audit found the browser-direct adapter, the session credential
 * store and the server thin-proxy handler all complete, but NO client-side `ProviderAdapter` for the
 * proxy path. Without it `resolveProviderPath()` could return `thin_proxy` while nothing could execute
 * it. This file closes that gap INSIDE the frozen `D-055` / `D-060` vocabulary: it brings no new
 * product mechanism, no new decision and no new network shape.
 *
 * ── THE FOUR STRUCTURAL GUARANTEES ──────────────────────────────────────────────────
 * ① THE DESTINATION IS NOT EXPRESSIBLE. The only endpoint this adapter can reach is the FIXED
 *    application path it was constructed with (default `/api/proxy`). There is no field, parameter or
 *    branch through which a request could name a URL, a host, a scheme or a port - which is why
 *    "generic open proxy" cannot be built on top of it.
 * ② THE CREDENTIAL IS READ ONCE, NEXT TO THE SEND, and never stored, cached, logged or echoed. The
 *    secret only ever exists as the `authorization` header of the single in-flight request.
 * ③ THE BODY IS A CLOSED FOUR-KEY DOCUMENT (`provider_id` / `request_id` / `model` / `messages` /
 *    `structured_output`). No workspace content is uploaded - an `AiRequest` has no attachment field
 *    at all (contract §0.4 A).
 * ④ RESPONSE CLASSIFICATION IS THE SHARED M10 ONE, so the two network shapes cannot disagree about
 *    "a redirect is never followed" or "an error body is never relayed". The allowlist-aware
 *    redirect detail stays on the SERVER; this client never imports M12 policy.
 *
 * 🔴 PATH IS NOT A PARAMETER. The constructor asks `resolveProviderPath(capability)` and THROWS when
 *    the capability does not offer `thin_proxy`. There is deliberately NO fallback branch to
 *    `browser_direct` (AC-150).
 *
 * 🔴 Compiles in the DOM-less Node test scope as well: the transport is INJECTED, and `fetch` is
 *    reached only through `createBrowserFetchTransport()`, which detects its runtime.
 */

import { resolveProviderPath, PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE } from '../../ai/provider/capability.js';
import type { ProviderCapability, ProviderConfig, ProviderPath, PathResolution } from '../../ai/provider/capability.js';
import { validateAiRequest } from '../../ai/provider/request.js';
import type { AiMessage, AiRequest } from '../../ai/provider/request.js';
import { selectStructuredOutputMode, evaluateStructuredResponse } from '../../ai/provider/structured-output.js';
import type { StructuredOutputRequest } from '../../ai/provider/structured-output.js';
import { aiError, aiFailed, aiOk } from '../../ai/provider/result.js';
import type { AiResult } from '../../ai/provider/result.js';
import { DEFAULT_TIMEOUT_MS, TransportFailure, withBearerCredential } from '../../ai/provider/transport.js';
import type { HttpRequestDescriptor, HttpResponseDescriptor, HttpTransport } from '../../ai/provider/transport.js';
import { revealCredentialSecret } from '../../ai/provider/credential.js';
import type { CredentialResolver } from '../../ai/provider/credential.js';
import { normalizeProviderResponse, providerResponseError } from '../../ai/provider/response-normalization.js';
import type { AiInvocation, ProviderAdapter } from '../../ai/provider/adapter.js';
import { createBrowserFetchTransport } from './browser-fetch-transport.js';
import { extractResponseText } from './browser-direct-adapter.js';

/**
 * The FIXED application endpoint of the thin proxy.
 *
 * 🔴 IMPLEMENTATION PARAMETER (deployment routing), not a product decision: the server owns what is
 *    behind it, and the client cannot influence where that is.
 */
export const DEFAULT_THIN_PROXY_PATH = '/api/proxy';

/** Thrown when an adapter cannot exist for this configuration. Explicit by design (AC-150). */
export class ThinProxyUnavailableError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = 'ThinProxyUnavailableError';
    this.reason = reason;
  }
}

/**
 * The closed client document.
 *
 * 🔴 Mirrors the SERVER's frozen `ProxyRequest` shape over the wire. It is re-declared here rather
 *    than imported because the browser scope must never import `src/server/proxy/**` - the two sides
 *    are separate runtimes that meet over the network, and the server is the one that VALIDATES.
 *    The field list is therefore intentionally identical and intentionally closed.
 */
export interface ThinProxyWireRequest {
  readonly provider_id: string;
  readonly request_id: string;
  readonly model: string;
  readonly messages: readonly AiMessage[];
  readonly structured_output: StructuredOutputRequest | null;
}

export interface ThinProxyAdapterDeps {
  readonly config: ProviderConfig;
  /** M13. The adapter only ever holds the RESOLVER, never a secret. */
  readonly credentials: CredentialResolver;
  /** The fixed application proxy path. Must be a same-origin RELATIVE path. */
  readonly endpoint_path?: string;
  /** Injectable for tests. Defaults to the browser `fetch` transport. */
  readonly transport?: HttpTransport;
  readonly timeout_ms?: number;
  /** Injectable correlator so a test can assert the exact document that was sent. */
  readonly new_request_id?: () => string;
}

/**
 * 🔴 Validates the endpoint.
 *
 * An absolute URL, a protocol-relative path or a path carrying a scheme is REFUSED, because swallowing
 * one would let a configuration turn this client into a general-purpose outbound request: exactly the
 * 「generic arbitrary URL proxy」 the frozen contract forbids.
 */
function requireLocalProxyPath(endpoint_path: string): string {
  if (!endpoint_path.startsWith('/') || endpoint_path.startsWith('//')) {
    throw new ThinProxyUnavailableError(
      'The thin proxy endpoint must be a same-origin application path starting with "/".',
    );
  }
  if (endpoint_path.includes('://') || endpoint_path.includes('\\')) {
    throw new ThinProxyUnavailableError(
      'The thin proxy endpoint must not carry a scheme or a backslash.',
    );
  }
  return endpoint_path;
}

/** 🔴 A proxy-path provider must never carry a client-side endpoint (that would be a custom Base URL). */
function assertNoClientSideEndpoint(config: ProviderConfig): void {
  if (config.base_url !== null) {
    throw new ThinProxyUnavailableError(
      'A thin-proxy provider must not carry a client-side endpoint: a user-supplied Base URL is Browser Direct only.',
    );
  }
}

let correlator_sequence = 0;

/** The default correlator. 🔴 It is a per-request label, never an identity and never persisted. */
function defaultRequestId(provider_id: string): string {
  correlator_sequence += 1;
  return `${provider_id}:${String(correlator_sequence)}:${String(Date.now())}`;
}

/**
 * Creates the thin-proxy CLIENT adapter.
 *
 * 🔴 Construction failures are thrown, not converted into a degraded adapter: a caller that asked for
 *    a proxy-path provider and cannot have one must be told, not quietly served by another route.
 */
export function createThinProxyAdapter(deps: ThinProxyAdapterDeps): ProviderAdapter {
  const path_resolution: PathResolution = resolveProviderPath(deps.config.capability);
  /*
   * 🔴 STRICT: the resolved path must be `thin_proxy` itself. A capability that offers `browser_direct`
   *    resolves to `browser_direct` (the frozen priority), and this adapter then refuses to exist -
   *    there is no "use the proxy instead" branch anywhere in this file (AC-150).
   */
  if (path_resolution.kind !== 'resolved' || path_resolution.path !== 'thin_proxy') {
    throw new ThinProxyUnavailableError(PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE);
  }
  assertNoClientSideEndpoint(deps.config);
  const endpoint_path = requireLocalProxyPath(deps.endpoint_path ?? DEFAULT_THIN_PROXY_PATH);

  const transport: HttpTransport = deps.transport ?? createBrowserFetchTransport();
  const timeout_ms = deps.timeout_ms ?? DEFAULT_TIMEOUT_MS;
  const config = deps.config;
  const capability: ProviderCapability = config.capability;
  const path: ProviderPath = 'thin_proxy';
  const new_request_id = deps.new_request_id ?? ((): string => defaultRequestId(String(config.provider_id)));

  return {
    provider_id: config.provider_id,
    config,
    capability,
    path,
    path_resolution,

    async execute(invocation: AiInvocation): Promise<AiResult> {
      if (invocation.provider_id !== config.provider_id) {
        return aiFailed(aiError('INTERNAL_UNEXPECTED', 'internal', { path }));
      }

      const request_violations = validateAiRequest(invocation.request);
      if (request_violations.length > 0) {
        return aiFailed(aiError('PROVIDER_REQUEST_INVALID', 'request_rejected', { path }));
      }

      if (invocation.credential_ref === null) {
        return aiFailed(aiError('PROVIDER_CREDENTIAL_MISSING', 'credential_missing', { path }));
      }
      const secret_handle = deps.credentials.resolve(invocation.credential_ref);
      if (secret_handle === null) {
        return aiFailed(aiError('PROVIDER_CREDENTIAL_MISSING', 'credential_missing', { path }));
      }

      const mode = selectStructuredOutputMode(
        capability.structured_output,
        invocation.request.structured_output?.preferred_mode ?? 'none',
      );

      /*
       * 🔴 THE CLOSED DOCUMENT. Five keys, no destination key, no credential key. The provider body
       *    is built by the SHARED M10 payload builder, so the proxy forwards exactly what a direct
       *    call would have sent.
       */
      const wire: ThinProxyWireRequest = {
        provider_id: String(config.provider_id),
        request_id: new_request_id(),
        model: invocation.request.model,
        messages: invocation.request.messages,
        structured_output: invocation.request.structured_output,
      };
      const body = JSON.stringify(wire);

      const descriptor: HttpRequestDescriptor = {
        url: endpoint_path,
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        timeout_ms,
        follow_redirects: false,
      };

      // 🔴🔴 THE single credential read of this adapter - immediately adjacent to the send.
      const secret = revealCredentialSecret(secret_handle);
      if (secret === null) {
        return aiFailed(aiError('PROVIDER_CREDENTIAL_MISSING', 'credential_missing', { path }));
      }

      let response: HttpResponseDescriptor;
      try {
        response = await transport.send(withBearerCredential(descriptor, secret));
      } catch (error) {
        if (error instanceof TransportFailure) {
          const code =
            error.cause_kind === 'timeout'
              ? 'PROVIDER_TIMEOUT'
              : error.cause_kind === 'cors'
                ? 'PROVIDER_CORS_BLOCKED'
                : 'PROVIDER_NETWORK_UNREACHABLE';
          const failure_kind =
            error.cause_kind === 'timeout' ? 'timeout' : error.cause_kind === 'cors' ? 'cors' : 'network';
          return aiFailed(aiError(code, failure_kind, { path }));
        }
        return aiFailed(aiError('PROVIDER_NETWORK_UNREACHABLE', 'network', { path }));
      }

      // 🔴 The shared M10 classification. The proxy returns a normalized envelope, so a redirect
      //    surfaces as `redirect` rather than being mistaken for success.
      const normalized = normalizeProviderResponse(response.status, response.body_text);
      if (normalized.kind !== 'ok') {
        return aiFailed(providerResponseError(path, normalized.kind, normalized.http_status));
      }

      /*
       * 🔴 The proxy answers with `{ request_id, provider_body }`. Anything else is refused: a missing
       *    envelope must not be read as an empty model answer, because that would turn a transport
       *    problem into 「模型没有给出答案」.
       */
      const envelope = readProxyEnvelope(normalized.text);
      if (envelope === null) {
        return aiFailed(
          aiError('PROVIDER_SCHEMA_INVALID', 'response_shape', {
            path,
            http_status: normalized.http_status,
          }),
        );
      }

      const text = extractResponseText(envelope);
      if (invocation.request.structured_output !== null && mode !== 'none') {
        const outcome = evaluateStructuredResponse(mode, text, invocation.request.structured_output);
        if (outcome.kind === 'valid') {
          return aiOk(text, normalized.http_status, outcome.value);
        }
        if (outcome.kind === 'repairable_error' || outcome.kind === 'non_repairable_error') {
          return aiFailed(
            aiError('PROVIDER_SCHEMA_INVALID', 'response_shape', {
              path,
              http_status: normalized.http_status,
            }),
          );
        }
        // `no_structured_output_available` ⇒ free text is returned and `structured` stays null.
      }
      return aiOk(text, normalized.http_status, null);
    },
  };
}

/**
 * Reads the thin-proxy envelope.
 *
 * Returns the inner provider body text, or `null` when the document is not the expected envelope.
 * 🔴 It never echoes the raw document: the caller only ever sees the provider payload or a fixed code.
 */
export function readProxyEnvelope(body_text: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body_text) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const provider_body = (parsed as Record<string, unknown>)['provider_body'];
  return typeof provider_body === 'string' ? provider_body : null;
}

/** The exact document shape this client sends, exposed for the boundary test. */
export const THIN_PROXY_WIRE_KEYS: readonly string[] = [
  'provider_id',
  'request_id',
  'model',
  'messages',
  'structured_output',
];

/** Re-exported so the composition root does not need the `src/ai` path directly. */
export type { AiRequest };
