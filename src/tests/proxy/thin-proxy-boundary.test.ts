/**
 * S01-04 ｜ M12 structural invariants for the server proxy (`api/proxy/**`).
 *
 * Canonical AC references used by this file: AC-146 / AC-147 / AC-149 / AC-151 / AC-152 / AC-157 / AC-158.
 * 🔴 No new AC; every reference stays inside the existing `AC-01`–`AC-162` range.
 *
 * ── 🔴 SCOPE OF THIS FILE (updated by S01-W1-INTEGRATE) ────────────────────────────
 * These cases are SUPPLEMENTARY structural evidence. They prove the ABSENCE of dangerous constructs
 * in the server shell; they are NOT behavioural proof of the handler.
 *
 * 🔴 The behavioural proof now EXISTS and lives in `api/proxy/tests/thin-proxy-handler.test.ts`,
 *    which really imports `api/proxy/thin-proxy.ts` and drives `createThinProxyHandler()` with a
 *    mock registry / mock transport / fake credential through the independent
 *    `tsconfig.proxy-test.json` scope (`dist-proxy-test/`, `npm run test:proxy`).
 *
 * 🚩 HISTORY (kept, not rewritten): during S01-04 this file had to stand in for behaviour because
 *    `tsconfig.test.json` fixed `rootDir: "src"`, so a test under `src/tests/**` could not import
 *    `api/proxy/**` (`error TS6059`). S01-W1-INTEGRATE removed that blocker by adding a dedicated
 *    proxy-test scope, so the "no executable handler test" gap is CLOSED. The policy that used to be
 *    parked in `src/ai/boundary/**` for the same mechanical reason now lives in its correct owner,
 *    `src/server/proxy/**`, and the `AUTHORIZE_SOURCE` scan below follows it there.
 *
 * Two renderings of each source are used on purpose:
 *   · `withStrings`   - comments stripped only (needed to see `redirect: 'manual'`);
 *   · `identifiers`   - comments AND string literals stripped, so that prose inside a message
 *                       ("the provider endpoint could not be reached") is not mistaken for
 *                       an identifier that names a destination.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FORBIDDEN_TARGET_FIELDS, PROXY_REQUEST_KEYS } from '../../server/proxy/proxy-request.js';
import { readRepoFile, scanDirectory, stripComments, stripCommentsAndStrings } from '../ai/source-scan.js';

const PROXY_DIR = scanDirectory('api/proxy');

/**
 * 🔴 Production sources only. A test file under `api/proxy/tests/**` has to NAME the forbidden
 * destination fields (`target_url`, `base_url`, ...) in order to prove they are refused, and it
 * legitimately counts transport calls. Scanning it would turn those fixtures into false positives,
 * so the structural scan is restricted to the shipped modules - and the filter is itself asserted
 * to be non-vacuous below, and cross-checked against the behavioural suite that now covers the same
 * clauses from the outside (`api/proxy/tests/thin-proxy-handler.test.ts`).
 */
function isTestFile(file: string): boolean {
  return /(^|[\\/])tests?([\\/]|$)/.test(file);
}

const PRODUCTION_SOURCES = PROXY_DIR.sources.filter(({ file }) => !isTestFile(file));
const WITH_STRINGS = PRODUCTION_SOURCES.map(({ file, source }) => ({ file, code: stripComments(source) }));
const IDENTIFIERS = PRODUCTION_SOURCES.map(({ file, source }) => ({
  file,
  code: stripCommentsAndStrings(source),
}));
const AUTHORIZE_SOURCE = readRepoFile('src/server/proxy/authorize.ts');

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('S01-04 M12｜Thin proxy structural boundaries', () => {
  it('IMPLEMENTATION INVARIANT: the scan is not vacuous - api/proxy really has sources', () => {
    assert.ok(PROXY_DIR.files.length >= 2, `expected api/proxy sources, found ${PROXY_DIR.files.length}`);
    assert.ok(PROXY_DIR.files.some((file) => file.endsWith('thin-proxy.ts')));
    assert.ok(PROXY_DIR.files.some((file) => file.endsWith('index.ts')));
    // The structural invariants below scan the SHIPPED modules; that set must not be empty either.
    assert.ok(WITH_STRINGS.length >= 2, `expected api/proxy production sources, found ${WITH_STRINGS.length}`);
    assert.ok(
      PROXY_DIR.files.some((file) => isTestFile(file) && file.endsWith('thin-proxy-handler.test.ts')),
      'the behavioural handler suite must live under api/proxy/tests/**',
    );
  });

  it('AC-147: the proxy never reads a destination name from a request', () => {
    for (const { file, code } of IDENTIFIERS) {
      for (const field of ['target_url', 'base_url', 'host', 'scheme', 'endpoint', 'origin', 'upstream']) {
        assert.ok(
          !new RegExp(`\\b${field}\\b`).test(code),
          `${file} references "${field}"; a client-supplied destination must not be addressable there`,
        );
      }
    }
    for (const field of FORBIDDEN_TARGET_FIELDS) {
      assert.ok(!PROXY_REQUEST_KEYS.includes(field), `"${field}" must not be an accepted request key`);
    }
  });

  it('AC-146: the only outbound URL is the one the authorization gate produced from the registry', () => {
    assert.match(AUTHORIZE_SOURCE, /url:\s*verdict\.url/, 'the descriptor URL must come from the verdict');
    assert.match(AUTHORIZE_SOURCE, /registry\.get\(request\.provider_id\)/, 'the target must come from the registry');
    assert.match(AUTHORIZE_SOURCE, /registry\.target_allowlist\(\)/, 'the allowlist must be registry-derived');
    const fetchCalls = WITH_STRINGS.reduce((total, { code }) => total + countOccurrences(code, 'fetch('), 0);
    assert.equal(fetchCalls, 1, 'expected exactly one fetch call site in api/proxy');
    assert.ok(
      WITH_STRINGS.some(({ code }) => /fetch\(\s*request\.url/.test(code)),
      'the fetch call must use the descriptor URL and nothing else',
    );
  });

  it('AC-151: redirects are never followed, at either the descriptor or the transport level', () => {
    assert.ok(
      WITH_STRINGS.some(({ code }) => /redirect:\s*'manual'/.test(code)),
      "the Node transport must use redirect: 'manual'",
    );
    for (const { file, code } of WITH_STRINGS) {
      assert.ok(!/redirect:\s*['"](follow|error)['"]/.test(code), `${file} must not follow redirects`);
    }
    assert.match(AUTHORIZE_SOURCE, /follow_redirects:\s*false/);
  });

  it('AC-149: the proxy imports no persistence, database or cache module', () => {
    const forbidden = [
      'node:fs',
      'fs/promises',
      "'fs'",
      'node:sqlite',
      'better-sqlite3',
      'pg',
      'postgres',
      'mysql',
      'mongodb',
      'redis',
      'ioredis',
      '@vercel/kv',
      '@vercel/postgres',
      'node:child_process',
    ];
    for (const { file, code } of WITH_STRINGS) {
      for (const module_name of forbidden) {
        assert.ok(!code.includes(module_name), `${file} imports the persistence module "${module_name}"`);
      }
    }
  });

  it('AC-152: the proxy holds no preset server-side key and reads no environment secret', () => {
    for (const { file, code } of WITH_STRINGS) {
      assert.ok(!code.includes('process.env'), `${file} must not read an environment secret`);
      assert.ok(!/sk-[A-Za-z0-9]{10,}/.test(code), `${file} must not contain a key-shaped literal`);
    }
  });

  it('AC-158: the proxy writes nothing to the console or stdout', () => {
    for (const { file, code } of WITH_STRINGS) {
      assert.ok(!code.includes('console.'), `${file} must not log directly; use the injected sink`);
      assert.ok(!code.includes('process.stdout'), `${file} must not write to stdout`);
    }
  });

  it('AC-157: the credential is read at exactly one call site and is never stashed', () => {
    const reads = WITH_STRINGS.reduce((total, { code }) => total + countOccurrences(code, 'revealCredentialSecret('), 0);
    assert.equal(reads, 1, 'expected a single credential read in the whole proxy');
    for (const { file, code } of WITH_STRINGS) {
      assert.ok(!code.includes('globalThis'), `${file} must not stash anything on a global`);
      assert.ok(!code.includes('cache'), `${file} must not introduce a cache for request data`);
    }
    assert.ok(
      WITH_STRINGS.some(({ code }) => code.includes('withBearerCredential(')),
      'the credential must be attached through the single documented helper',
    );
  });

  it('IMPLEMENTATION INVARIANT: the handler module keeps no module-level mutable state', () => {
    for (const { file, code } of WITH_STRINGS) {
      const topLevelMutables = code.split('\n').filter((line) => /^(let|var)\s/.test(line));
      assert.deepEqual(topLevelMutables, [], `${file} must be stateless`);
    }
  });

  it('IMPLEMENTATION INVARIANT: the handler delegates every policy decision to the pure gate', () => {
    assert.ok(
      WITH_STRINGS.some(({ code }) => code.includes('authorizeProxyCall(')),
      'the handler must delegate all policy to the pure authorization gate',
    );
    assert.ok(
      WITH_STRINGS.some(({ code }) => code.includes('errorResponse(')),
      'failures must be normalized rather than relayed',
    );
    assert.ok(
      WITH_STRINGS.some(({ code }) => code.includes('classifyProviderResponse(')),
      'responses must be classified by the shared pure classifier',
    );
  });
});
