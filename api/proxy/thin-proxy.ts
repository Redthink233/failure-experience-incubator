/**
 * M12 ｜ Thin Proxy - server runtime (Node).
 *
 * Runtime scope: `api/proxy/**` → `tsconfig.server.json` (`lib = ES2022`, `types = ["node"]`,
 * NO DOM). This is the ONLY place allowed to use the Node runtime, and it must never gain DOM.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : Proxy 的 `THIN` 允许项 = request normalization / provider adapter forwarding /
 *     response normalization / timeout·error mapping / 必要的 schema transport;
 *     ❌ Workspace / `Attempt` / `Insight` / `Hypothesis` persistence, ❌ Experience database,
 *     ❌ Cloud user database; "🔴 V1 不为任何 Provider 预置固定 server secret";
 *     "Proxy 只是传输通道、不是 Key 持有方"
 *   - AC-146 / AC-147 / AC-148 / AC-149 / AC-151 / AC-152 / AC-157 / AC-158
 *
 * ── WHAT THIS FILE IS ───────────────────────────────────────────────────────────────
 * A THIN transport shell. It owns NO policy of its own:
 *   · the destination comes from `authorizeProxyCall` (registry lookup, never a request field);
 *   · the credential is a parameter of ONE call and is read at ONE call site, immediately before
 *     the send, and is never stored, cached, written or logged;
 *   · the response is normalized and any provider error body is discarded rather than relayed.
 *
 * 🔴 The policy it delegates to is `M12` pure code in `src/server/proxy/**` - NOT `src/ai/**`
 *    (S01-W1-INTEGRATE moved it there; `src/ai/**` is the M10 contract only). This file remains the
 *    only Node-runtime transport shell.
 *
 * ── WHAT THIS FILE IS NOT ───────────────────────────────────────────────────────────
 * 🔴 NOT a generic URL proxy: no code path lets a client value reach the outbound URL, because the
 *    descriptor that is sent was built from the server registry.
 * 🔴 NOT a data store: the module has no module-level mutable state, no filesystem / KV / DB access
 *    and no cache, which is why "no durable credential storage" needs no filtering to hold.
 *
 * 🔴 Network calls are executed by an INJECTED `HttpTransport`. The default is a thin Node `fetch`
 *    wrapper; every test substitutes a deterministic mock. No real provider is contacted by this
 *    task, and nothing here may be reported as a real provider verification.
 */

import {
  authorizeProxyCall,
  classifyProviderResponse,
} from '../../src/server/proxy/authorize.js';
import type { ProxyLimits } from '../../src/server/proxy/authorize.js';
import {
  DEFAULT_MAX_BODY_BYTES,
  DEFAULT_TIMEOUT_MS,
  TransportFailure,
  withBearerCredential,
} from '../../src/ai/provider/transport.js';
import type {
  HttpRequestDescriptor,
  HttpResponseDescriptor,
  HttpTransport,
} from '../../src/ai/provider/transport.js';
import type { ProviderRegistry } from '../../src/ai/provider/registry.js';
import { revealCredentialSecret } from '../../src/ai/provider/credential.js';
import type { CredentialSecret } from '../../src/ai/provider/credential.js';
import { aiError, aiErrorToLogRecord } from '../../src/ai/provider/result.js';
import type { AiError } from '../../src/ai/provider/result.js';

/** A normalized HTTP-shaped response. A framework adapter maps this onto whatever it needs. */
export interface ThinProxyResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

function jsonResponse(status: number, payload: Readonly<Record<string, unknown>>): ThinProxyResponse {
  return {
    status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

/** 🔴 The ONLY error shape that may leave the proxy: a fixed code plus a fixed message. */
function errorResponse(status: number, error: AiError): ThinProxyResponse {
  return jsonResponse(status, {
    error: { code: error.code, message: error.message, retryable: error.retryable },
  });
}

/**
 * Node `fetch` transport.
 *
 * 🔴 `redirect: 'manual'` mirrors the `follow_redirects: false` literal in the descriptor contract.
 *    Together they mean a redirect can neither be requested nor accidentally honoured.
 */
export function createNodeFetchTransport(): HttpTransport {
  return {
    kind: 'node-fetch',
    async send(request: HttpRequestDescriptor): Promise<HttpResponseDescriptor> {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
      }, request.timeout_ms);
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: 'manual',
          signal: controller.signal,
        });
        const body_text = await response.text();
        return {
          status: response.status,
          location: response.headers.get('location'),
          body_text,
        };
      } catch (error) {
        const aborted = error instanceof Error && error.name === 'AbortError';
        throw new TransportFailure(
          aborted ? 'timeout' : 'network',
          aborted ? 'The provider request timed out.' : 'The provider endpoint could not be reached.',
        );
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export interface ThinProxyInput {
  /** The raw, untrusted request document (read from the wire, still a string). */
  readonly raw_body: string;
  /**
   * The credential for THIS request only.
   * 🔴 `CredentialSecret` keeps its value outside the object graph (module-private WeakMap), so even
   *    an accidental `JSON.stringify` of a log object yields `{}`.
   */
  readonly credential: CredentialSecret | null;
}

export interface ThinProxyDeps {
  readonly registry: ProviderRegistry;
  /** Injectable transport. Defaults to the Node `fetch` wrapper. */
  readonly transport?: HttpTransport;
  readonly limits?: ProxyLimits;
  /** Optional technical-layer sink. Receives ALREADY-REDACTED records only. */
  readonly log?: (record: Readonly<Record<string, unknown>>) => void;
}

export type ThinProxyHandler = (input: ThinProxyInput) => Promise<ThinProxyResponse>;

function parseJsonBody(raw_body: string): unknown {
  try {
    return JSON.parse(raw_body) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Builds the stateless request handler. Every dependency lives in the closure, so two handlers in
 * one process cannot observe each other's credentials.
 */
export function createThinProxyHandler(deps: ThinProxyDeps): ThinProxyHandler {
  const transport = deps.transport ?? createNodeFetchTransport();
  const limits: ProxyLimits = deps.limits ?? {
    timeout_ms: DEFAULT_TIMEOUT_MS,
    max_body_bytes: DEFAULT_MAX_BODY_BYTES,
  };

  return async function handle(input: ThinProxyInput): Promise<ThinProxyResponse> {
    const authorization = authorizeProxyCall(parseJsonBody(input.raw_body), deps.registry, limits);

    if (authorization.kind === 'denied') {
      // 🔴 `detail` is a code, never a client value; the error record is redacted by construction
      //    (`aiErrorToLogRecord` emits fixed strings only).
      deps.log?.({ stage: 'authorize', detail: authorization.detail, status: authorization.status });
      return errorResponse(authorization.status, authorization.error);
    }

    if (input.credential === null) {
      const missing = aiError('PROVIDER_CREDENTIAL_MISSING', 'credential_missing', { path: 'thin_proxy' });
      deps.log?.({ stage: 'credential', error: aiErrorToLogRecord(missing) });
      return errorResponse(401, missing);
    }

    // 🔴🔴 THE single credential read of M12. It sits immediately next to the send, and nothing
    //     between here and `transport.send` can log, cache or persist the value.
    const secret = revealCredentialSecret(input.credential);
    if (secret === null) {
      const unavailable = aiError('PROVIDER_CREDENTIAL_MISSING', 'credential_missing', { path: 'thin_proxy' });
      deps.log?.({ stage: 'credential', error: aiErrorToLogRecord(unavailable) });
      return errorResponse(401, unavailable);
    }
    const outbound = withBearerCredential(authorization.outbound, secret);

    deps.log?.({
      stage: 'forward',
      resolved_host: authorization.resolved_host,
      body_bytes: authorization.outbound.body.length,
    });

    let response: HttpResponseDescriptor;
    try {
      response = await transport.send(outbound);
    } catch (error) {
      const failure = error instanceof TransportFailure ? error : new TransportFailure('network', 'unreachable');
      const mapped = aiError(
        failure.cause_kind === 'timeout' ? 'PROVIDER_TIMEOUT' : 'PROVIDER_NETWORK_UNREACHABLE',
        failure.cause_kind === 'timeout' ? 'timeout' : 'network',
        { path: 'thin_proxy' },
      );
      deps.log?.({ stage: 'transport', error: aiErrorToLogRecord(mapped) });
      return errorResponse(502, mapped);
    }

    const verdict = classifyProviderResponse(
      'thin_proxy',
      response.status,
      response.location,
      response.body_text,
      authorization.resolved_target_url,
      deps.registry.target_allowlist(),
    );

    if (verdict.kind !== 'ok') {
      // 🔴 Provider error bodies are deliberately NOT relayed - only the normalized failure.
      deps.log?.({ stage: 'response', error: aiErrorToLogRecord(verdict.error) });
      return errorResponse(502, verdict.error);
    }

    // 🔴 Normalized passthrough of the provider body only. Nothing is added, persisted or cached,
    //    and no provider header is echoed back.
    return jsonResponse(200, {
      request_id: authorization.request.request_id,
      provider_body: verdict.text,
    });
  };
}
