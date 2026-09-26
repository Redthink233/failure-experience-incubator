/**
 * M10 ｜ The `ProviderAdapter` interface (the frozen interface S01-03 / S01-05 consume).
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D / docs/07 §5.12.1
 *   - HANDOFF §4: `M11` / `M12` **implement** `M10`; `M10` **never imports** `M11` / `M12`;
 *     `M15` is the only place that instantiates concrete adapters.
 *   - AC-144 / AC-145 / AC-149
 *
 * 🔴 `AiInvocation` carries a `CredentialRef` (an opaque, non-secret handle) and NEVER a secret.
 *    The adapter resolves the handle through its injected `CredentialResolver`, so the business
 *    layer cannot even represent "hold the key".
 *
 * 🔴 This module imports NOTHING from `src/browser/**` or `api/proxy/**`. The dependency direction
 *    is enforced by a test (`IMPLEMENTATION INVARIANT`: M10 has no implementation-layer import),
 *    because that is the only durable way to keep it true.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ProviderId } from './ids.js';
import type { CredentialRef } from './credential.js';
import type { ProviderConfig, ProviderCapability, ProviderPath, PathResolution } from './capability.js';
import type { AiRequest } from './request.js';
import type { AiResult } from './result.js';

/** One normalized call: identity + payload + an opaque credential handle. */
export interface AiInvocation {
  readonly provider_id: ProviderId;
  readonly request: AiRequest;
  /** `null` only for providers that need no credential; the adapter then fails explicitly. */
  readonly credential_ref: CredentialRef | null;
}

/**
 * Runtime-specific executor. `M11` (browser) and `M12` (server proxy) both implement it; a caller
 * receives an adapter and can no longer tell - or choose - which network shape it uses.
 */
export interface ProviderAdapter {
  readonly provider_id: ProviderId;
  readonly config: ProviderConfig;
  readonly capability: ProviderCapability;
  /** The path this adapter instance actually uses. Reported, never chosen per request. */
  readonly path: ProviderPath;
  /** The adapter's own (deterministic) path decision, exposed for diagnostics and tests. */
  readonly path_resolution: PathResolution;
  execute(invocation: AiInvocation): Promise<AiResult>;
}
