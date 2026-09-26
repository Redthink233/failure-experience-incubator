/**
 * S01 ｜ `M15` browser composition root - the PROVIDER / CREDENTIAL / PATH composition.
 *
 * Layer position: this is the ONLY place in the repository that may know a RUNTIME. It lives in
 * `src/browser/**` precisely so the framework-neutral `src/application/**` can stay free of DOM,
 * `fetch` and concrete adapters.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : 路径决定权由 Provider Adapter Capability 决定; 「Browser Direct（默认优先）」;
 *                       registered Thin Proxy 只对已注册安全 adapter; Custom Base URL = Browser Direct
 *                       Only; 不可用 Provider 必须明确失败; 不得每次请求让用户选择 direct / proxy;
 *                       不得随机 / 无依据切换
 *   - HANDOFF §4 (`M15` owns the composition root) / §6 (workspace + credential boundaries)
 *   - AC-144 / AC-145 / AC-146 / AC-147 / AC-149 / AC-150 / AC-156 / AC-158
 *
 * ── WHAT THIS FILE DECIDES, AND WHAT IT REFUSES TO DECIDE ───────────────────────────
 * 🔴 It asks `resolveProviderPath(capability)` - the ONE frozen decision point - and then builds
 *    exactly the adapter that path names. It has no parameter for a user choice, no `try/catch` that
 *    swaps in the other path and no preference of its own. A per-request direct/proxy prompt is
 *    therefore not buildable on top of this function.
 * 🔴 It holds a `CredentialRef` and a `CredentialResolver`. It NEVER holds a `CredentialSecret`: the
 *    only code that turns one into the other is inside the adapters, at the single send site.
 * 🔴 It writes NO credential anywhere. There is no storage call in this file at all.
 *
 * 🔴 The browser adapter and the proxy client are chosen from a REGISTERED configuration: this file
 *    never invents a provider, never guesses a model and never relaxes an endpoint.
 */

import type { ProviderConfig, ProviderPath, PathResolution } from '../../ai/provider/capability.js';
import { PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE, resolveProviderPath } from '../../ai/provider/capability.js';
import type { CredentialRef, CredentialResolver } from '../../ai/provider/credential.js';
import type { HttpTransport } from '../../ai/provider/transport.js';
import type { ProviderAdapter } from '../../ai/provider/adapter.js';
import { createBrowserDirectAdapter } from '../ai/browser-direct-adapter.js';
import { createThinProxyAdapter } from '../ai/thin-proxy-adapter.js';
import { credentialRefForProvider } from '../ai/session-credential-store.js';

/** The frozen reason code for "this configuration has no reachable path" (AC-150). */
export const PROVIDER_CONNECTION_UNSUPPORTED = 'PROVIDER_CONNECTION_UNSUPPORTED' as const;

export interface BrowserProviderCompositionInput {
  readonly config: ProviderConfig;
  /** M13's store (or any `CredentialResolver`). 🔴 The resolver only - never a secret. */
  readonly credentials: CredentialResolver;
  /** Injectable transport for tests. Defaults are the real browser `fetch` transports. */
  readonly transport?: HttpTransport;
  /** The fixed application proxy path. Only used on the `thin_proxy` path. */
  readonly proxy_endpoint_path?: string;
  readonly timeout_ms?: number;
}

/**
 * The outcome of the provider composition.
 *
 * 🔴 `unsupported` is a FIRST-CLASS result, not an exception to be swallowed: the frozen contract
 *    requires an explicit failure for a provider with no reachable path, and a thrown-and-caught error
 *    is exactly how "silently fall back to something else" starts.
 */
export type BrowserProviderComposition =
  | {
      readonly kind: 'composed';
      readonly adapter: ProviderAdapter;
      readonly credential_ref: CredentialRef;
      readonly path: ProviderPath;
      readonly path_resolution: PathResolution;
    }
  | {
      readonly kind: 'unsupported';
      readonly reason_code: typeof PROVIDER_CONNECTION_UNSUPPORTED;
      readonly message: string;
    };

/**
 * Builds the ONE adapter this configuration may use.
 *
 * 🔴 The credential ref is derived from the provider id, so two configurations of the same provider
 *    share a credential and two providers never do.
 * 🔴 A construction failure inside an adapter (e.g. a missing endpoint) is converted into
 *    `unsupported` rather than into a working-but-different route: there is nowhere for a fallback to
 *    come from, which is the point.
 */
export function composeBrowserProvider(
  input: BrowserProviderCompositionInput,
): BrowserProviderComposition {
  const resolution = resolveProviderPath(input.config.capability);
  if (resolution.kind !== 'resolved') {
    return {
      kind: 'unsupported',
      reason_code: PROVIDER_CONNECTION_UNSUPPORTED,
      message: resolution.message,
    };
  }

  const credential_ref = credentialRefForProvider(String(input.config.provider_id));
  const transport = input.transport;

  try {
    if (resolution.path === 'browser_direct') {
      const adapter = createBrowserDirectAdapter({
        config: input.config,
        credentials: input.credentials,
        ...(transport === undefined ? {} : { transport }),
        ...(input.timeout_ms === undefined ? {} : { timeout_ms: input.timeout_ms }),
      });
      return { kind: 'composed', adapter, credential_ref, path: 'browser_direct', path_resolution: resolution };
    }

    const adapter = createThinProxyAdapter({
      config: input.config,
      credentials: input.credentials,
      ...(input.proxy_endpoint_path === undefined
        ? {}
        : { endpoint_path: input.proxy_endpoint_path }),
      ...(transport === undefined ? {} : { transport }),
      ...(input.timeout_ms === undefined ? {} : { timeout_ms: input.timeout_ms }),
    });
    return { kind: 'composed', adapter, credential_ref, path: 'thin_proxy', path_resolution: resolution };
  } catch {
    /*
     * 🔴 The reason text is the FROZEN unsupported message, never the thrown message: a construction
     *    failure may name a host or a path, and that must not travel into a product-facing string.
     */
    return {
      kind: 'unsupported',
      reason_code: PROVIDER_CONNECTION_UNSUPPORTED,
      message: PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE,
    };
  }
}
