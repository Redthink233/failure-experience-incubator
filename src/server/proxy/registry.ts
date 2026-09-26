/**
 * M12 ｜ Registered-provider registry FACTORY (pure server policy).
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : "允许受控配置中的固定 host / 严格 allowlist host / 明确 adapter endpoint";
 *                       "🔴 不得「黑名单 + 默认放行」"
 *   - AC-146 / AC-147 / AC-151
 *
 * ── WHY THE FACTORY IS `M12` AND THE CONTRACT IS `M10` (S01-W1-INTEGRATE) ────────────
 * Constructing a registry means REFUSING an endpoint whose host is loopback / RFC1918 / link-local /
 * a metadata-service name. That is the M12 target policy, so the code that calls it must live on the
 * server side of the boundary: `src/server/proxy/** → src/ai/**` is the only legal direction.
 *
 * The SHAPE (`ProviderRegistry` / `ProviderRegistration` / `ProxyEndpoint` / violation codes) stays
 * framework-neutral in `src/ai/provider/registry.ts` and is imported over that direction.
 *
 * 🔴 A partially-valid registry is never handed out: every registration is validated first and the
 *    full violation list is thrown. 🔴 This file ships NO real product provider list - the concrete
 *    composition is an IMPLEMENTATION PARAMETER owned by `M15` / the Integrator. Nothing here may be
 *    read as "provider X has been verified".
 *
 * Pure: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import { validateProviderConfiguration } from '../../ai/provider/capability.js';
import type { ProviderId } from '../../ai/provider/ids.js';
import { ProviderRegistryError } from '../../ai/provider/registry.js';
import type {
  ProviderRegistration,
  ProviderRegistry,
  ProviderRegistryViolation,
  ProxyEndpoint,
} from '../../ai/provider/registry.js';
import { allowlistEntryViolation } from './target-policy.js';

function registrationViolations(registration: ProviderRegistration): readonly ProviderRegistryViolation[] {
  const violations: ProviderRegistryViolation[] = [];
  const id = registration.config.provider_id;

  for (const violation of validateProviderConfiguration(registration.config)) {
    violations.push({ provider_id: id, code: 'INVALID_CONFIGURATION', detail: `${violation.code}: ${violation.detail}` });
  }

  const endpoint = registration.proxy_endpoint;
  if (registration.capability.thin_proxy && endpoint === null) {
    violations.push({
      provider_id: id,
      code: 'PROXY_ENDPOINT_REQUIRED',
      detail: 'A proxy-capable provider must declare its fixed / allowlisted endpoint.',
    });
  }
  if (!registration.capability.thin_proxy && endpoint !== null) {
    violations.push({
      provider_id: id,
      code: 'PROXY_ENDPOINT_UNEXPECTED',
      detail: 'A provider without the proxy capability must not declare a proxy endpoint.',
    });
  }
  if (endpoint !== null) {
    const blocked = allowlistEntryViolation({ scheme: endpoint.scheme, host: endpoint.host, port: endpoint.port });
    if (blocked !== null) {
      violations.push({
        provider_id: id,
        code: 'PROXY_ENDPOINT_BLOCKED_HOST',
        detail: `The registered endpoint host is refused by the target policy (${blocked}).`,
      });
    }
    if (endpoint.path_prefix.length > 0 && !endpoint.path_prefix.startsWith('/')) {
      violations.push({
        provider_id: id,
        code: 'PROXY_ENDPOINT_INVALID_PATH_PREFIX',
        detail: 'A fixed path prefix must be absolute.',
      });
    }
  }

  return violations;
}

/** Validates every registration and throws `ProviderRegistryError` with the full violation list. */
export function createProviderRegistry(registrations: readonly ProviderRegistration[]): ProviderRegistry {
  const violations: ProviderRegistryViolation[] = [];
  const by_id = new Map<string, ProviderRegistration>();
  const seen = new Set<string>();

  for (const registration of registrations) {
    const id = registration.config.provider_id;
    if (seen.has(id)) {
      violations.push({
        provider_id: id,
        code: 'DUPLICATE_PROVIDER_ID',
        detail: 'A provider id must be registered exactly once.',
      });
      continue;
    }
    seen.add(id);
    violations.push(...registrationViolations(registration));
    by_id.set(id, registration);
  }

  if (violations.length > 0) {
    throw new ProviderRegistryError(violations);
  }

  const provider_ids: readonly ProviderId[] = registrations.map((registration) => registration.config.provider_id);

  return {
    provider_ids,
    get(provider_id: ProviderId): ProviderRegistration | null {
      return by_id.get(provider_id) ?? null;
    },
    has(provider_id: ProviderId): boolean {
      return by_id.has(provider_id);
    },
    target_allowlist(): readonly ProxyEndpoint[] {
      const targets: ProxyEndpoint[] = [];
      for (const registration of registrations) {
        const endpoint = registration.proxy_endpoint;
        if (endpoint === null) {
          continue;
        }
        targets.push(endpoint);
      }
      return targets;
    },
  };
}
