/**
 * M11 ｜ Browser Direct Provider Adapter - `implements` the M10 `ProviderAdapter` contract.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : `Browser Direct` 适用条件 ① CORS 可用 ② 官方支持 ③ 用户 Credential 可直接用
 *                       ④ 不需要产品服务器隐藏固定 server secret ⑤ 无不可接受安全问题;
 *                       "路径 = Browser → LLM Provider"; "🔴 不得额外经过 Vercel Proxy";
 *                       "Custom Base URL 🔴 默认 = Browser Direct Only"
 *   - HANDOFF §0.1 / §0.2 : `M11` 的浏览器实现只能在 `src/browser/ai/**`
 *   - AC-144 / AC-145 / AC-147 / AC-150 / AC-156
 *
 * 🔴 PATH IS NOT A PARAMETER. The adapter asks `resolveProviderPath(capability)` once, at
 *    construction. If the capability does not offer `browser_direct` the constructor THROWS - there
 *    is no "fall back to the proxy" branch anywhere in this file (AC-150).
 *
 * 🔴 NOTHING BUT THE REQUEST PAYLOAD LEAVES THE BROWSER. The outbound body is
 *    `buildProviderPayload(...)` - a closed four-key serialization. `AiRequest` has no workspace /
 *    file / attachment field, so "上传整个 Workspace" is not expressible from here (contract §0.4 A).
 *
 * 🔴 THE CREDENTIAL IS READ AT ONE CALL SITE, immediately before the send, and is never stored,
 *    cached, attached to a log record or echoed into an error (AC-158 / AC-156).
 *
 * 🔴 RESPONSE CLASSIFICATION IS THE SHARED M10 ONE (S01-W1-INTEGRATE). The status/body rules
 *    ("a redirect is never followed", "a provider error body is never relayed", "an empty body is
 *    not a payload") must be identical in both network shapes, so they come from
 *    `src/ai/provider/response-normalization.ts`. The allowlist-aware redirect detail is M12 server
 *    policy and is deliberately NOT reachable from the browser: a browser-direct call has a
 *    user-configured endpoint and no server allowlist at all, so this adapter never imports
 *    `src/server/proxy/**`.
 */

import { resolveProviderPath, PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE } from '../../ai/provider/capability.js';
import type { ProviderConfig, ProviderCapability, ProviderPath, PathResolution } from '../../ai/provider/capability.js';
import { buildProviderPayload, validateAiRequest } from '../../ai/provider/request.js';
import type { AiRequest } from '../../ai/provider/request.js';
import { selectStructuredOutputMode, evaluateStructuredResponse } from '../../ai/provider/structured-output.js';
import { aiError, aiFailed, aiOk } from '../../ai/provider/result.js';
import type { AiResult } from '../../ai/provider/result.js';
import { DEFAULT_TIMEOUT_MS, TransportFailure, withBearerCredential } from '../../ai/provider/transport.js';
import type { HttpRequestDescriptor, HttpResponseDescriptor, HttpTransport } from '../../ai/provider/transport.js';
import { revealCredentialSecret } from '../../ai/provider/credential.js';
import type { CredentialResolver } from '../../ai/provider/credential.js';
import { normalizeProviderResponse, providerResponseError } from '../../ai/provider/response-normalization.js';
import type { AiInvocation, ProviderAdapter } from '../../ai/provider/adapter.js';
import { createBrowserFetchTransport } from './browser-fetch-transport.js';

/** Thrown when an adapter cannot exist for this configuration. Explicit by design (AC-150). */
export class BrowserDirectUnavailableError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = 'BrowserDirectUnavailableError';
    this.reason = reason;
  }
}

export interface BrowserDirectAdapterDeps {
  readonly config: ProviderConfig;
  /** M13. The adapter only ever holds the RESOLVER, never a secret. */
  readonly credentials: CredentialResolver;
  /** Injectable for tests. Defaults to the browser `fetch` transport. */
  readonly transport?: HttpTransport;
  readonly timeout_ms?: number;
}

/** Validates the configured endpoint and returns it as a non-null `string`. */
function requireUsableEndpoint(config: ProviderConfig): string {
  const base_url = config.base_url;
  if (base_url === null) {
    throw new BrowserDirectUnavailableError('The provider has no configured endpoint.');
  }
  let parsed: URL;
  try {
    parsed = new URL(base_url);
  } catch {
    throw new BrowserDirectUnavailableError('The configured endpoint is not a valid URL.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new BrowserDirectUnavailableError('Only http(s) endpoints are supported.');
  }
  if (parsed.username.length > 0 || parsed.password.length > 0) {
    throw new BrowserDirectUnavailableError('A credential must never travel inside the endpoint URL.');
  }
  return base_url;
}

/**
 * Creates the browser-direct adapter.
 *
 * 🔴 Construction failures are thrown, not converted into a degraded adapter: a caller that asked
 *    for a browser-direct provider and cannot have one must be told, not quietly served by a proxy.
 */
export function createBrowserDirectAdapter(deps: BrowserDirectAdapterDeps): ProviderAdapter {
  const path_resolution: PathResolution = resolveProviderPath(deps.config.capability);
  if (path_resolution.kind !== 'resolved' || path_resolution.path !== 'browser_direct') {
    throw new BrowserDirectUnavailableError(PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE);
  }
  const endpoint = requireUsableEndpoint(deps.config);

  const transport: HttpTransport = deps.transport ?? createBrowserFetchTransport();
  const timeout_ms = deps.timeout_ms ?? DEFAULT_TIMEOUT_MS;
  const config = deps.config;
  const capability: ProviderCapability = config.capability;
  const path: ProviderPath = 'browser_direct';

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
      const body = JSON.stringify(buildProviderPayload(invocation.request, mode));

      // 🔴 The endpoint is the user's configured URL, used verbatim. The adapter never rewrites it,
      //    never routes it through the thin proxy origin, and never appends a guessed path.
      const descriptor: HttpRequestDescriptor = {
        url: endpoint,
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        timeout_ms,
        follow_redirects: false,
      };

      // 🔴🔴 THE single credential read of M11 - immediately adjacent to the send.
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
          const failure_kind = error.cause_kind === 'timeout' ? 'timeout' : error.cause_kind === 'cors' ? 'cors' : 'network';
          return aiFailed(aiError(code, failure_kind, { path }));
        }
        return aiFailed(aiError('PROVIDER_NETWORK_UNREACHABLE', 'network', { path }));
      }

      // 🔴 The shared M10 classification: `status === 0` and every 3xx become `redirect` (never
      //    success), a non-2xx becomes `http_error`, an empty 2xx body becomes `unparseable`.
      const normalized = normalizeProviderResponse(response.status, response.body_text);
      if (normalized.kind !== 'ok') {
        return aiFailed(providerResponseError(path, normalized.kind, normalized.http_status));
      }

      const text = extractResponseText(normalized.text);
      if (invocation.request.structured_output !== null && mode !== 'none') {
        const outcome = evaluateStructuredResponse(mode, text, invocation.request.structured_output);
        if (outcome.kind === 'valid') {
          return aiOk(text, normalized.http_status, outcome.value);
        }
        if (outcome.kind === 'repairable_error' || outcome.kind === 'non_repairable_error') {
          return aiFailed(
            aiError('PROVIDER_SCHEMA_INVALID', 'response_shape', { path, http_status: normalized.http_status }),
          );
        }
        // `no_structured_output_available` ⇒ free text is returned and `structured` stays null.
        // The caller sees the difference; this adapter never fabricates a structured value.
      }
      return aiOk(text, normalized.http_status, null);
    },
  };
}

/**
 * Best-effort extraction of the assistant text from a provider payload.
 *
 * 🔴 IMPLEMENTATION PARAMETER, not a product decision. It understands the two common response
 *    envelopes and otherwise returns the raw body unchanged, so an unfamiliar provider degrades to
 *    "here is what it said" instead of an invented value.
 */
export function extractResponseText(body_text: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body_text) as unknown;
  } catch {
    return body_text;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return body_text;
  }
  const root = parsed as Record<string, unknown>;

  const choices = root['choices'];
  if (Array.isArray(choices)) {
    const first = choices[0];
    if (typeof first === 'object' && first !== null) {
      const message = (first as Record<string, unknown>)['message'];
      if (typeof message === 'object' && message !== null) {
        const content = (message as Record<string, unknown>)['content'];
        if (typeof content === 'string' && content.length > 0) {
          return content;
        }
      }
    }
  }

  const content = root['content'];
  if (Array.isArray(content)) {
    const first = content[0];
    if (typeof first === 'object' && first !== null) {
      const text = (first as Record<string, unknown>)['text'];
      if (typeof text === 'string' && text.length > 0) {
        return text;
      }
    }
  }

  return body_text;
}

/** Re-exported so consumers do not need to import from `src/ai` directly for the request shape. */
export type { AiRequest };
