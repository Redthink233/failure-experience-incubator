/**
 * S01-W1-INTEGRATE ｜ Wave-1 dependency direction (the DAG) - source-level invariants.
 *
 * Canonical AC references used by this file: AC-146 / AC-149 / AC-150 / AC-151.
 * 🔴 No new AC; every reference stays inside the existing `AC-01`–`AC-162` range. Every case is an
 *    IMPLEMENTATION INVARIANT.
 *
 * ── WHAT THIS GUARDS ────────────────────────────────────────────────────────────────
 * After the M12 policy relocation the module boundaries are:
 *
 *     api/proxy/**           M12 Node runtime transport shell
 *     src/server/proxy/**    M12 pure server policy / security
 *     src/ai/**              M10 framework-neutral provider contract
 *     src/browser/**         M2 / M11 / M13 browser runtime
 *
 * The ONLY permitted dependency directions are
 *
 *     api/proxy/**  →  src/server/proxy/**  →  src/ai/**
 *     src/browser/** →  src/ai/**  (and the framework-neutral `src/workspace` abstraction)
 *
 * and the DAG must stay ACYCLIC: there is no back-edge in either direction, and the two runtime
 * shapes (`src/browser/**` = M11/M13, `src/server/**` + `api/proxy/**` = M12) never import each
 * other. They meet over the network, never by import.
 *
 * 🔴 WHY A SOURCE SCAN: the compiler cannot express "scope A must not be imported by scope B" when
 *    both are plain ES modules inside one project. The scan is what keeps the rule true under
 *    later edits, and it is checked against the M10/M12/M11 suites that exercise the same modules.
 *
 * 🚩 HISTORY (kept, not rewritten): until S01-W1-INTEGRATE, M12 policy lived in `src/ai/boundary/**`
 *    and BOTH forbidden edges really existed (`src/ai/provider/registry.ts` imported the target
 *    policy, and `src/browser/ai/browser-direct-adapter.ts` imported the response classifier). The
 *    relocation removed them; this file is what stops them from coming back.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  REPO_ROOT,
  importSpecifiersOf,
  readRepoFile,
  scanDirectory,
  stripComments,
} from '../ai/source-scan.js';

const AI = scanDirectory('src/ai');
const SERVER = scanDirectory('src/server');
const BROWSER = scanDirectory('src/browser');
const API_PROXY = scanDirectory('api/proxy');

/** A test fixture may legitimately name a forbidden destination; the DAG is about shipped code. */
function isTestFile(file: string): boolean {
  return /(^|[\\/])tests?([\\/]|$)/.test(file);
}

const PRODUCTION = {
  ai: AI.sources,
  server: SERVER.sources,
  browser: BROWSER.sources,
  api: API_PROXY.sources.filter(({ file }) => !isTestFile(file)),
};

/** Node runtime / I/O modules that must never appear in framework-neutral or pure-policy code. */
const RUNTIME_MODULES =
  /^(node:)?(fs|fs\/promises|path|os|child_process|http|https|net|dns|tls|worker_threads|crypto|process|url|undici|axios|node-fetch|express|fastify)$/;

function offendingSpecifier(
  sources: readonly { readonly file: string; readonly source: string }[],
  isForbidden: (specifier: string, file: string) => boolean,
): readonly string[] {
  const hits: string[] = [];
  for (const { file, source } of sources) {
    for (const specifier of importSpecifiersOf(source)) {
      if (isForbidden(specifier, file)) {
        hits.push(`${file} → ${specifier}`);
      }
    }
  }
  return hits;
}

describe('S01-W1-INTEGRATE｜Wave-1 dependency direction (DAG)', () => {
  it('IMPLEMENTATION INVARIANT (DAG 0): the scan is not vacuous - every scope really has sources', () => {
    assert.ok(PRODUCTION.ai.length >= 10, `expected the src/ai tree, found ${PRODUCTION.ai.length}`);
    assert.ok(PRODUCTION.server.length >= 4, `expected src/server/proxy modules, found ${PRODUCTION.server.length}`);
    assert.ok(PRODUCTION.browser.length >= 8, `expected the src/browser tree, found ${PRODUCTION.browser.length}`);
    assert.ok(PRODUCTION.api.length >= 2, `expected the api/proxy shell, found ${PRODUCTION.api.length}`);
  });

  it('IMPLEMENTATION INVARIANT (DAG 1): `src/ai` (M10) imports neither server policy nor browser runtime', () => {
    const hits = offendingSpecifier(PRODUCTION.ai, (specifier) => {
      return (
        specifier.includes('server') ||
        specifier.includes('browser') ||
        specifier.includes('api/proxy') ||
        specifier.includes('proxy/') ||
        /^\.\.\/\.\.\//.test(specifier)
      );
    });
    assert.deepEqual(hits, [], `M10 must not depend on an implementation layer:\n${hits.join('\n')}`);
  });

  it('IMPLEMENTATION INVARIANT (DAG 2): `src/server/proxy` (M12 policy) depends only on `./` and `src/ai`', () => {
    const hits = offendingSpecifier(PRODUCTION.server, (specifier) => {
      const local = specifier.startsWith('./');
      const m10_contract = specifier.startsWith('../../ai/');
      return !local && !m10_contract;
    });
    assert.deepEqual(hits, [], `M12 policy may only reach the M10 contract:\n${hits.join('\n')}`);
    // …and it is genuinely PURE: no Node runtime module, no I/O.
    const runtime = offendingSpecifier(PRODUCTION.server, (specifier) => RUNTIME_MODULES.test(specifier));
    assert.deepEqual(runtime, [], `M12 policy must stay runtime-free:\n${runtime.join('\n')}`);
  });

  it('IMPLEMENTATION INVARIANT (DAG 3): `api/proxy` (M12 shell) reaches `src/server/proxy` and `src/ai`, never the browser', () => {
    const hits = offendingSpecifier(PRODUCTION.api, (specifier) => specifier.includes('browser'));
    assert.deepEqual(hits, [], `the Node shell must not import a browser module:\n${hits.join('\n')}`);
    // The shell consumes the M12 policy and the M10 contract through repo-root paths; it never
    // reaches sideways into a sibling `api/**` module, so the runtime layer cannot grow a private
    // copy of the policy out of sight.
    const siblings = offendingSpecifier(
      PRODUCTION.api,
      (specifier) => specifier.startsWith('../') && !specifier.startsWith('../../'),
    );
    assert.deepEqual(siblings, [], `the shell must reach policy by path, not by sibling guess:\n${siblings.join('\n')}`);
  });

  it('IMPLEMENTATION INVARIANT (DAG 4): `src/browser` (M11/M13) never imports the server scopes', () => {
    const hits = offendingSpecifier(PRODUCTION.browser, (specifier) => {
      return specifier.includes('server') || specifier.includes('api/proxy') || specifier.includes('/proxy/');
    });
    assert.deepEqual(hits, [], `browser runtime must not import server code:\n${hits.join('\n')}`);
  });

  it('IMPLEMENTATION INVARIANT (DAG 5): the M12 policy modules live in `src/server/proxy/**` and nowhere else', () => {
    const expected = ['target-policy.ts', 'proxy-request.ts', 'authorize.ts', 'registry.ts'];
    for (const module_name of expected) {
      assert.ok(
        existsSync(join(REPO_ROOT, 'src', 'server', 'proxy', module_name)),
        `src/server/proxy/${module_name} must exist`,
      );
      assert.ok(
        !existsSync(join(REPO_ROOT, 'src', 'ai', 'boundary', module_name)),
        `src/ai/boundary/${module_name} must be gone (M12 policy is not the M10 contract)`,
      );
    }
    assert.ok(
      !existsSync(join(REPO_ROOT, 'src', 'ai', 'boundary')),
      'the `src/ai/boundary` directory must no longer exist',
    );
  });

  it('IMPLEMENTATION INVARIANT (DAG 6): the `src/ai` barrel exports no M12 policy and no registry factory', () => {
    const barrel = stripComments(readRepoFile('src/ai/index.ts'));

    for (const forbidden of ['boundary', 'target-policy', 'proxy-request', 'authorize']) {
      assert.ok(!barrel.includes(forbidden), `src/ai/index.ts must not export "${forbidden}"`);
    }
    for (const forbidden of [
      'evaluateTarget',
      'evaluateRedirect',
      'classifyHostLiteral',
      'allowlistEntryViolation',
      'authorizeProxyCall',
      'parseProxyRequest',
      'FORBIDDEN_TARGET_FIELDS',
      'createProviderRegistry',
    ]) {
      assert.ok(!barrel.includes(forbidden), `src/ai/index.ts must not export "${forbidden}" (M12 policy)`);
    }
    // Every export line must resolve inside the M10 provider contract.
    for (const line of barrel.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('export')) {
        continue;
      }
      assert.match(
        trimmed,
        /from '\.\/provider\/[a-z-]+\.js';$/,
        `unexpected barrel export: ${trimmed}`,
      );
    }
  });

  it('IMPLEMENTATION INVARIANT (DAG 7): the response classification is SHARED, not duplicated per shape', () => {
    // Both network shapes must delegate their status/body rules to the one M10 classifier, so the
    // two can never disagree about "a redirect is never followed" / "an error body is never relayed".
    const browser_adapter = stripComments(readRepoFile('src/browser/ai/browser-direct-adapter.ts'));
    assert.match(browser_adapter, /from '\.\.\/\.\.\/ai\/provider\/response-normalization\.js'/);
    assert.match(browser_adapter, /normalizeProviderResponse\(/);
    assert.ok(
      !browser_adapter.includes('classifyProviderResponse'),
      'the browser adapter must not use the allowlist-aware M12 classifier',
    );

    const proxy_authorize = stripComments(readRepoFile('src/server/proxy/authorize.ts'));
    assert.match(proxy_authorize, /from '\.\.\/\.\.\/ai\/provider\/response-normalization\.js'/);
    assert.match(proxy_authorize, /normalizeProviderResponse\(/);
  });
});
