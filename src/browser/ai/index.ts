/**
 * `src/browser/ai` barrel - M11 (Browser Direct) + M12 client (Thin Proxy) + M13 (Session-only
 * Credential).
 *
 * Runtime scope: `src/browser/**` → `tsconfig.browser.json` (DOM + DOM.Iterable, `types: []`).
 * 🔴 These modules IMPLEMENT the framework-neutral `M10` contract from `src/ai/**`; they are never
 *    imported BY it. The browser scope resolves the core contract over the import graph and never
 *    re-globs it (asserted by `src/tests/config/tsconfig-layout.test.ts`).
 *
 * 🔴 M11 and M12 NEVER share a runtime scope: this directory cannot reach `api/proxy/**`, and the
 *    server proxy cannot reach this directory. The browser talks to the proxy over the network. The
 *    thin-proxy CLIENT added here is the missing half of that conversation - it speaks the server's
 *    frozen `ProxyRequest` shape over the wire and imports no server policy.
 *
 * 🔴 No credential persistence beyond the session-scoped carrier, no "remember" surface, no
 *    workspace upload path, no DOM types assumed at compile time (the browser files are written to
 *    compile in the DOM-less Node test scope as well, and detect their runtime capabilities).
 */

export * from './session-storage.js';
export * from './session-credential-store.js';
export * from './browser-fetch-transport.js';
export * from './browser-direct-adapter.js';
export * from './thin-proxy-adapter.js';
