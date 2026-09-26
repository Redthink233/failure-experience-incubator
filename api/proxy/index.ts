/**
 * `api/proxy` barrel - M12 Thin Proxy (server runtime).
 *
 * Contract basis: contract §0.4 D; docs/07 §5.12.1.
 *
 * 🔴 Layering (S01-W1-INTEGRATE): this directory is the Node RUNTIME SHELL. It IMPLEMENTS the `M10`
 *    contract and CONSUMES the M12 pure policy from `src/server/proxy/**`:
 *
 *        api/proxy/**  →  src/server/proxy/**  →  src/ai/**
 *
 *    There is no back-edge (`src/ai/**` never imports this directory, and `src/browser/**` never
 *    imports either of the server scopes) - asserted by
 *    `src/tests/proxy/dependency-direction.test.ts`.
 *
 * 🔴 This is a SERVER scope (`tsconfig.server.json`): Node runtime, NO DOM. The browser adapter
 *    (`src/browser/ai/**`) reaches this code over the network - never by import - so the browser
 *    bundle can never contain the proxy's Node implementation.
 *
 * 🔴 Behavioural coverage: `api/proxy/tests/thin-proxy-handler.test.ts` really imports
 *    `thin-proxy.ts` and drives `createThinProxyHandler()` with mocks, via the independent
 *    `tsconfig.proxy-test.json` scope. The structural scan in
 *    `src/tests/proxy/thin-proxy-boundary.test.ts` is now supplementary evidence, not a substitute.
 *
 * 🔴 No deployment is performed. Nothing here is a claim that the proxy is deployed, reachable, or
 *    validated against a real provider (`DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION`, `PSA-*`).
 */

export { createThinProxyHandler, createNodeFetchTransport } from './thin-proxy.js';
export type {
  ThinProxyDeps,
  ThinProxyHandler,
  ThinProxyInput,
  ThinProxyResponse,
} from './thin-proxy.js';

/**
 * The M12 policy this server enforces, re-exported so the server surface is self-documenting: a
 * reviewer looking for "where is the SSRF guard / where is the target rejection / who builds the
 * registry" finds it from the server boundary itself.
 *
 * 🔴 The implementations live in `src/server/proxy/**` - `M12` pure policy, reachable from both the
 *    Node runtime and the unit tests without any `rootDir` workaround.
 */
export {
  FORBIDDEN_TARGET_FIELDS,
  PROXY_REQUEST_KEYS,
  allowlistEntryViolation,
  authorizeProxyCall,
  classifyHostLiteral,
  classifyProviderResponse,
  createProviderRegistry,
  evaluateRedirect,
  evaluateTarget,
  parseProxyRequest,
} from '../../src/server/proxy/index.js';
export type {
  AllowedTarget,
  ProxyRequest,
  TargetBlockReason,
} from '../../src/server/proxy/index.js';
