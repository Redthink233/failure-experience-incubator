/**
 * M10 ｜ Provider capability, configuration and PATH DECISION.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : "路径决定权 🔴 由 Provider Adapter Capability 决定；🔴 不得每次请求让用户手工选择
 *                        direct / proxy；🔴 不得随机 / 无依据切换"; "Custom Base URL 🔴 默认 = Browser
 *                        Direct Only"; "不可用 Provider ✅ 必须明确失败"
 *   - docs/07 §5.12.1
 *   - AC-132 / AC-144 / AC-145 / AC-147 / AC-150
 *
 * 🔴 THE KEY STRUCTURAL PROPERTY OF THIS FILE:
 *    `resolveProviderPath` takes a `ProviderCapability` and NOTHING ELSE. It has no parameter for
 *    a user choice, no clock, no random source, no request. "Path is decided by adapter capability
 *    and is stable while the configuration is unchanged" (AC-144) is therefore a property of the
 *    SIGNATURE, not of developer discipline. A per-request direct/proxy prompt cannot be built on
 *    top of it without changing this file.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, NO non-determinism.
 */

import type { ProviderId } from './ids.js';

/** Best structured-output mechanism the provider natively offers. */
export type StructuredOutputMode = 'native_schema' | 'json_object' | 'none';

/** The two - and only two - network shapes allowed by `D-055`. */
export type ProviderPath = 'browser_direct' | 'thin_proxy';

export const PROVIDER_PATHS: readonly ProviderPath[] = ['browser_direct', 'thin_proxy'];

/** Where a provider's endpoint value comes from. `user_custom` is the OpenAI-compatible case. */
export type BaseUrlSource = 'registered_fixed' | 'user_custom';

export interface ProviderCapability {
  readonly structured_output: StructuredOutputMode;
  readonly browser_direct: boolean;
  readonly thin_proxy: boolean;
}

export interface ProviderConfig {
  readonly provider_id: ProviderId;
  /** Product-visible name. NOT a technical field: it is the user's own label for a provider. */
  readonly display_name: string;
  /** Configured model. User-configurable (AC-132) - never hard-coded into business logic. */
  readonly model: string;
  /** Endpoint. `null` when the server resolves it from the registry (no client-side URL at all). */
  readonly base_url: string | null;
  readonly base_url_source: BaseUrlSource;
  readonly capability: ProviderCapability;
}

/** The contract's exact wording for AC-150's mandatory explicit failure. */
export const PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE =
  'Provider connection unsupported under current browser constraints.';

export type PathResolution =
  | { readonly kind: 'resolved'; readonly path: ProviderPath }
  | {
      readonly kind: 'unsupported';
      readonly reason_code: 'PROVIDER_CONNECTION_UNSUPPORTED';
      readonly message: string;
    };

/**
 * The ONLY path decision point. Deterministic, capability-driven, configuration-stable.
 *
 * Priority is fixed: `browser_direct` first (contract: "Browser Direct（默认优先）"), then
 * `thin_proxy`. When neither is available the result is an explicit `unsupported` - there is
 * deliberately NO third "try something else" branch (AC-150: 🔴 不得偷偷走通用 Vercel Proxy).
 */
export function resolveProviderPath(capability: ProviderCapability): PathResolution {
  if (capability.browser_direct) {
    return { kind: 'resolved', path: 'browser_direct' };
  }
  if (capability.thin_proxy) {
    return { kind: 'resolved', path: 'thin_proxy' };
  }
  return {
    kind: 'unsupported',
    reason_code: 'PROVIDER_CONNECTION_UNSUPPORTED',
    message: PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE,
  };
}

/* ------------------------------------------------------------------ *
 * Configuration invariants
 * ------------------------------------------------------------------ */

export type ProviderConfigurationViolationCode =
  | 'USER_CUSTOM_BASE_URL_MUST_BE_BROWSER_DIRECT_ONLY'
  | 'USER_CUSTOM_BASE_URL_REQUIRED'
  | 'BASE_URL_SCHEME_UNSUPPORTED'
  | 'BASE_URL_USERINFO_FORBIDDEN'
  | 'NO_REACHABLE_PATH'
  | 'REGISTERED_FIXED_BASE_URL_MUST_BE_HTTPS';

export interface ProviderConfigurationViolation {
  readonly code: ProviderConfigurationViolationCode;
  readonly detail: string;
}

/**
 * Pure configuration invariants. A registry refuses to register a violating provider, so the
 * forbidden combinations cannot exist at runtime.
 */
export function validateProviderConfiguration(
  config: ProviderConfig,
): readonly ProviderConfigurationViolation[] {
  const violations: ProviderConfigurationViolation[] = [];

  if (config.base_url_source === 'user_custom') {
    // AC-147: custom / OpenAI-compatible Base URL is Browser Direct ONLY.
    if (config.capability.thin_proxy) {
      violations.push({
        code: 'USER_CUSTOM_BASE_URL_MUST_BE_BROWSER_DIRECT_ONLY',
        detail: 'A user-supplied base_url must never be reachable through the thin proxy (no generic URL proxy).',
      });
    }
    if (config.base_url === null) {
      violations.push({
        code: 'USER_CUSTOM_BASE_URL_REQUIRED',
        detail: 'A user_custom provider must carry the endpoint the user configured.',
      });
    }
  }

  if (config.base_url !== null) {
    let parsed: URL | null = null;
    try {
      parsed = new URL(config.base_url);
    } catch {
      parsed = null;
    }
    if (parsed === null || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
      violations.push({
        code: 'BASE_URL_SCHEME_UNSUPPORTED',
        detail: 'Only http(s) endpoints are supported.',
      });
    } else {
      if (parsed.username.length > 0 || parsed.password.length > 0) {
        violations.push({
          code: 'BASE_URL_USERINFO_FORBIDDEN',
          detail: 'A credential must never travel inside the endpoint URL.',
        });
      }
      if (config.base_url_source === 'registered_fixed' && parsed.protocol !== 'https:') {
        violations.push({
          code: 'REGISTERED_FIXED_BASE_URL_MUST_BE_HTTPS',
          detail: 'A server-registered endpoint must be https.',
        });
      }
    }
  }

  if (!config.capability.browser_direct && !config.capability.thin_proxy) {
    violations.push({
      code: 'NO_REACHABLE_PATH',
      detail: 'A provider with no reachable path must be rejected at registration, not at request time.',
    });
  }

  return violations;
}

export function isProviderConfigurationValid(config: ProviderConfig): boolean {
  return validateProviderConfiguration(config).length === 0;
}
