/**
 * `src/server/proxy` barrel - M12 PURE server policy / security.
 *
 * Layer position: … → Workspace → Retrieval/Evidence → **AI Adapter (M10 contract)** → **M12 policy** →
 * Application → UI. The Node transport shell that consumes this policy is `api/proxy/**`.
 *
 * Contents (all pure - no DOM, no Node runtime API, no network, no I/O):
 *   - `target-policy.ts`  target / SSRF policy, allowlist authorisation, redirect classification;
 *   - `proxy-request.ts`  the strict `ProxyRequest` contract and its parser;
 *   - `authorize.ts`      the authorize → describe-outbound → classify-response pipeline;
 *   - `registry.ts`       the registered-provider registry factory (validates endpoints via the
 *                         target policy before any registry is handed out).
 *
 * 🔴 Dependency direction (asserted by `src/tests/proxy/dependency-direction.test.ts`):
 *      `api/proxy/**  →  src/server/proxy/**  →  src/ai/**`
 *    There is no back-edge: this directory never imports `src/browser/**`, and `src/ai/**` never
 *    imports this directory.
 *
 * 🔴 No deployment is performed and nothing here is a claim that the proxy is deployed, reachable,
 *    or validated against a real provider (`DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION`, `PSA-*`).
 */

export {
  FORBIDDEN_TARGET_FIELDS,
  PROXY_REQUEST_KEYS,
  parseProxyRequest,
} from './proxy-request.js';
export type {
  ProxyRequest,
  ProxyRequestParseResult,
  ProxyRequestRejectionReason,
} from './proxy-request.js';

export { allowlistEntryViolation, classifyHostLiteral, evaluateRedirect, evaluateTarget, normaliseHostLiteral } from './target-policy.js';
export type { AllowedTarget, RedirectVerdict, TargetBlockReason, TargetPolicyVerdict } from './target-policy.js';

export { authorizeProxyCall, classifyProviderResponse } from './authorize.js';
export type {
  ProxyAuthorization,
  ProxyAuthorizationDenied,
  ProxyAuthorizationGranted,
  ProxyDenialDetail,
  ProxyDenialStatus,
  ProxyLimits,
  ProxyResponseVerdict,
} from './authorize.js';

export { createProviderRegistry } from './registry.js';
