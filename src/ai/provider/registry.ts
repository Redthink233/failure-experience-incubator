/**
 * M10 ｜ Provider registry CONTRACT: `provider_id` → registered endpoint.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : "允许受控配置中的固定 host / 严格 allowlist host / 明确 adapter endpoint";
 *                       "🔴 不得「黑名单 + 默认放行」"
 *   - HANDOFF §4 : `M15` (Integrator) owns the composition root; `M10` only defines the contract -
 *                  it must not import `M11` / `M12` implementations.
 *   - AC-132 / AC-146 / AC-147 / AC-151
 *
 * ── 🔴 CONTRACT vs FACTORY (S01-W1-INTEGRATE) ───────────────────────────────────────
 * This module states the SHAPE of a registration and of a registry. It deliberately contains NO
 * construction logic, because building a registry means REFUSING a private / loopback / metadata
 * endpoint - i.e. the M12 target policy. Keeping that policy here would make `src/ai/**` import
 * `src/server/**`, which the Wave-1 compile boundary forbids.
 *
 * ⇒ `createProviderRegistry()` (and its `PROXY_ENDPOINT_BLOCKED_HOST` check) lives in
 *   `src/server/proxy/registry.ts` (M12) and consumes the types below over the allowed
 *   `M12 → M10` direction. Consumers (`M15` composition root) obtain the factory from there.
 *
 * 🔴 REGISTRY vs ADAPTER: the registry knows ABOUT providers (identity, capability, endpoint)
 *    but never holds an adapter INSTANCE. `M15` reads the registry and instantiates `M11` / `M12`
 *    adapters itself, which is what keeps `M10` free of implementation-layer imports.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ProviderId } from './ids.js';
import type { ProviderCapability, ProviderConfig } from './capability.js';

/** A server-controlled endpoint. `scheme` is the literal `'https'` - plaintext is not expressible. */
export interface ProxyEndpoint {
  readonly scheme: 'https';
  /** EXACT hostname. No wildcard, no suffix, no regex. */
  readonly host: string;
  /** `null` = default https port only. */
  readonly port: number | null;
  /** Fixed path prefix the adapter appends its own route to. Never client-influenced. */
  readonly path_prefix: string;
}

export interface ProviderRegistration {
  readonly config: ProviderConfig;
  readonly capability: ProviderCapability;
  /** Required when the capability offers the thin-proxy path; forbidden otherwise. */
  readonly proxy_endpoint: ProxyEndpoint | null;
}

export type ProviderRegistryViolationCode =
  | 'DUPLICATE_PROVIDER_ID'
  | 'INVALID_CONFIGURATION'
  | 'PROXY_ENDPOINT_REQUIRED'
  | 'PROXY_ENDPOINT_UNEXPECTED'
  | 'PROXY_ENDPOINT_BLOCKED_HOST'
  | 'PROXY_ENDPOINT_INVALID_PATH_PREFIX';

export interface ProviderRegistryViolation {
  readonly provider_id: string;
  readonly code: ProviderRegistryViolationCode;
  readonly detail: string;
}

export class ProviderRegistryError extends Error {
  readonly violations: readonly ProviderRegistryViolation[];

  constructor(violations: readonly ProviderRegistryViolation[]) {
    super(`Provider registry rejected ${violations.length} registration(s).`);
    this.name = 'ProviderRegistryError';
    this.violations = violations;
  }
}

export interface ProviderRegistry {
  readonly provider_ids: readonly ProviderId[];
  get(provider_id: ProviderId): ProviderRegistration | null;
  has(provider_id: ProviderId): boolean;
  /**
   * The server-side allowlist, DERIVED from the registrations.
   *
   * 🔴 There is no parameter through which a request could add an entry, and the returned value is
   *    the registered `ProxyEndpoint` itself - so the proxy allowlist can never contain a host that
   *    was not registered (AC-146 / AC-147).
   */
  target_allowlist(): readonly ProxyEndpoint[];
}
