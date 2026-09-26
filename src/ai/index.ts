/**
 * `src/ai` barrel - the AI / provider layer (layer 4 of the six-layer discipline).
 *
 * Layer position: Domain/Projection → Workspace → Retrieval/Evidence → **AI Adapter** → Application → UI.
 *
 * Contents:
 *   - `provider/**`  M10 Provider Abstraction: the FROZEN framework-neutral contract
 *                    (`ProviderConfig` / `ProviderCapability` / `AiRequest` / `AiResult` /
 *                     `AiError` / `ProviderAdapter` / registry contract / structured output /
 *                     normalized provider-response classification).
 *
 * ── 🔴 M10-ONLY BOUNDARY (S01-W1-INTEGRATE) ─────────────────────────────────────────
 * `src/ai/**` is the framework-neutral provider CONTRACT and nothing else. It exports NO M12
 * target policy, NO proxy authorization, NO SSRF predicate and NO `ProxyRequest` parser - those are
 * server policy and live in `src/server/proxy/**`. It exports NO registry FACTORY either: building a
 * registry means refusing a private endpoint, i.e. M12 policy.
 *
 * 🔴 `src/ai/**` imports NOTHING from `src/server/**`, `src/browser/**` or `api/proxy/**`. The
 *    concrete adapters IMPLEMENT this contract; this module never reaches for them. `M15` is the
 *    only place that instantiates them (HANDOFF §4 / §6). The direction and the absence of a
 *    back-edge are asserted by `src/tests/proxy/dependency-direction.test.ts`.
 *
 * 🔴 No DOM, no Node runtime API, no network, no I/O, no product prompt, no `D9` business logic.
 *    Compile-time proof: this directory is inside `tsconfig.core.json` (`lib = ES2022`,
 *    `types = ["node"]`, DOM absent), asserted by `src/tests/config/tsconfig-layout.test.ts`.
 */

export * from './provider/ids.js';
export * from './provider/credential.js';
export * from './provider/capability.js';
export * from './provider/request.js';
export * from './provider/transport.js';
export * from './provider/result.js';
export * from './provider/response-normalization.js';
export * from './provider/structured-output.js';
export * from './provider/registry.js';
export * from './provider/adapter.js';
