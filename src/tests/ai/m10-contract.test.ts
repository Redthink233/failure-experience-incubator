/**
 * S01-04 ｜ M10 Provider Abstraction - contract, dependency direction and capability-driven path.
 *
 * Canonical AC references used by this file: AC-132 / AC-144 / AC-149 / AC-150.
 * Every assertion group names the canonical AC it verifies, or declares an IMPLEMENTATION INVARIANT.
 * 🔴 No new AC is created; every reference stays inside the existing `AC-01`–`AC-162` range.
 * 🔴 The "core scope compiles with NO DOM" proof is the compiler itself (`tsconfig.core.json`,
 *    asserted by `src/tests/config/tsconfig-layout.test.ts`); this file adds the SOURCE-level
 *    counterpart so that a DOM reference would fail even before the scope check runs.
 *
 * IMPLEMENTATION INVARIANT (T22): `M10` never imports an implementation layer. It is asserted by
 * scanning the source tree, because that is the only way it stays true under later edits.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE,
  isProviderConfigurationValid,
  resolveProviderPath,
  validateProviderConfiguration,
} from '../../ai/provider/capability.js';
import type { ProviderCapability, ProviderConfig, ProviderPath } from '../../ai/provider/capability.js';
import type { AiRequest } from '../../ai/provider/request.js';
import { buildProviderPayload, PROVIDER_PAYLOAD_KEYS } from '../../ai/provider/request.js';
import { createProviderRegistry } from '../../server/proxy/registry.js';
import { InvalidProviderIdError, providerId } from '../../ai/provider/ids.js';
import { credentialRef, credentialSecret } from '../../ai/provider/credential.js';
import type { AssertTrue, HasNoKey, IsExactly } from '../domain/type-assertions.js';
import { importSpecifiersOf, scanDirectory, stripComments, stripCommentsAndStrings } from './source-scan.js';

/* ------------------------------------------------------------------ *
 * Compile-time assertions (fail `npm run typecheck` when violated)
 * ------------------------------------------------------------------ */

export type M10ContractTypeAssertions = [
  /** Exactly two network shapes may ever exist (`D-055`). */
  AssertTrue<IsExactly<ProviderPath, 'browser_direct' | 'thin_proxy'>>,
  /** 🔴 No credential field may exist on the normalized request (AC-133 / AC-156). */
  AssertTrue<HasNoKey<AiRequest, 'credential'>>,
  AssertTrue<HasNoKey<AiRequest, 'credentials'>>,
  AssertTrue<HasNoKey<AiRequest, 'api_key'>>,
  AssertTrue<HasNoKey<AiRequest, 'apikey'>>,
  AssertTrue<HasNoKey<AiRequest, 'authorization'>>,
  AssertTrue<HasNoKey<AiRequest, 'secret'>>,
  AssertTrue<HasNoKey<AiRequest, 'session_key'>>,
  /** 🔴 No workspace handle may exist on the normalized request (contract §0.4 A / AC-145). */
  AssertTrue<HasNoKey<AiRequest, 'workspace'>>,
  AssertTrue<HasNoKey<AiRequest, 'workspace_root'>>,
  AssertTrue<HasNoKey<AiRequest, 'files'>>,
  AssertTrue<HasNoKey<AiRequest, 'attachments'>>,
  AssertTrue<HasNoKey<AiRequest, 'directory'>>,
  /** 🔴 A credential is never part of a persistable provider configuration. */
  AssertTrue<HasNoKey<ProviderConfig, 'credential'>>,
  AssertTrue<HasNoKey<ProviderConfig, 'api_key'>>,
  AssertTrue<HasNoKey<ProviderConfig, 'secret'>>,
];

/* ------------------------------------------------------------------ *
 * Scan configuration
 * ------------------------------------------------------------------ */

const AI_DIR = scanDirectory('src/ai');

const FORBIDDEN_CORE_IMPORTS =
  /^(node:)?(fs|fs\/promises|path|os|child_process|http|https|net|dns|tls|worker_threads|crypto|process|url|pg|postgres|mysql2?|mongodb|sqlite3|better-sqlite3|redis|ioredis|undici|axios|node-fetch|openai|@anthropic-ai\/sdk|react|vue|svelte|next|express|fastify)$/;

const FORBIDDEN_CORE_GLOBALS =
  /\b(window|document|localStorage|sessionStorage|indexedDB|FileSystemDirectoryHandle|showDirectoryPicker|XMLHttpRequest|WebSocket|navigator|process|require|Buffer)\b/;

function capability(overrides: Partial<ProviderCapability> = {}): ProviderCapability {
  return { structured_output: 'json_object', browser_direct: true, thin_proxy: false, ...overrides };
}

/* ------------------------------------------------------------------ *
 * Tests
 * ------------------------------------------------------------------ */

describe('S01-04 M10｜Provider Abstraction contract and boundary', () => {
  it('IMPLEMENTATION INVARIANT (T1/T22): the guard is not vacuous - the M10 tree really is scanned', () => {
    assert.ok(AI_DIR.files.length >= 11, `expected the src/ai tree, found ${AI_DIR.files.length} file(s)`);
    assert.ok(AI_DIR.files.some((file) => file.endsWith('registry.ts')), 'the registry CONTRACT must exist');
    assert.ok(AI_DIR.files.some((file) => file.endsWith('adapter.ts')), 'the adapter contract must exist');
    assert.ok(
      AI_DIR.files.some((file) => file.endsWith('response-normalization.ts')),
      'the shared provider-response classification must exist',
    );
    // 🔴 S01-W1-INTEGRATE: M12 policy must no longer live under `src/ai/**`.
    for (const migrated of ['target-policy.ts', 'proxy-request.ts', 'authorize.ts']) {
      assert.ok(
        !AI_DIR.files.some((file) => file.endsWith(migrated)),
        `${migrated} is M12 server policy and must live in src/server/proxy/**`,
      );
    }
  });

  it('IMPLEMENTATION INVARIANT (T22): src/ai imports no implementation layer (no M11 browser, no M12 proxy)', () => {
    for (const { file, source } of AI_DIR.sources) {
      for (const specifier of importSpecifiersOf(source)) {
        assert.ok(!specifier.includes('browser'), `${file} must not import a browser implementation ("${specifier}")`);
        assert.ok(
          !specifier.includes('api/proxy') && !specifier.includes('proxy/'),
          `${file} must not import the server proxy ("${specifier}")`,
        );
        assert.ok(
          !specifier.includes('server'),
          `${file} must not import the M12 server policy scope ("${specifier}")`,
        );
        assert.ok(!/^\.\.\/\.\.\//.test(specifier), `${file} must not reach outside src/ai ("${specifier}")`);
      }
    }
  });

  it('IMPLEMENTATION INVARIANT (T1): src/ai stays framework-neutral - no DOM global, no Node runtime global, no I/O module', () => {
    for (const { file, source } of AI_DIR.sources) {
      const hit = FORBIDDEN_CORE_GLOBALS.exec(stripComments(source));
      assert.equal(hit, null, `${file} references the forbidden global "${hit?.[1] ?? ''}"`);
      for (const specifier of importSpecifiersOf(source)) {
        assert.ok(!FORBIDDEN_CORE_IMPORTS.test(specifier), `${file} imports the runtime module "${specifier}"`);
      }
    }
  });

  it('AC-144: the request path is decided by adapter capability alone and is stable while configuration is unchanged', () => {
    const both = capability({ browser_direct: true, thin_proxy: true });
    const first = resolveProviderPath(both);
    assert.deepEqual(first, { kind: 'resolved', path: 'browser_direct' });
    for (let attempt = 0; attempt < 200; attempt += 1) {
      assert.deepEqual(resolveProviderPath(both), first, 'the path must not vary between calls');
    }
    assert.deepEqual(resolveProviderPath(capability({ browser_direct: true, thin_proxy: false })), {
      kind: 'resolved',
      path: 'browser_direct',
    });
    assert.deepEqual(resolveProviderPath(capability({ browser_direct: false, thin_proxy: true })), {
      kind: 'resolved',
      path: 'thin_proxy',
    });
  });

  it('AC-144: there is no parameter through which a user or a request could select the path', () => {
    // The ARITY is the guarantee: a per-request direct/proxy prompt cannot be expressed against a
    // one-argument, capability-only decision function.
    assert.equal(resolveProviderPath.length, 1);
    // The same capability always yields the same resolution - there is no hidden state or clock.
    const fixed = capability({ browser_direct: false, thin_proxy: true });
    assert.deepEqual(resolveProviderPath(fixed), resolveProviderPath(fixed));
  });

  it('AC-132: provider / base_url / model are user configuration, and no provider is built into the contract', () => {
    const config: ProviderConfig = {
      provider_id: providerId('user-configured-one'),
      display_name: 'any label the user chooses',
      model: 'any-model-name',
      base_url: 'https://user-endpoint.registry-fixture.test/v1',
      base_url_source: 'user_custom',
      capability: capability(),
    };
    assert.equal(isProviderConfigurationValid(config), true);
    assert.deepEqual([...validateProviderConfiguration(config)], []);

    // Switching provider is a configuration change only: the registry ships with no built-in entry.
    const empty = createProviderRegistry([]);
    assert.deepEqual([...empty.provider_ids], []);
    assert.equal(empty.get(providerId('user-configured-one')), null);
  });

  it('AC-150: a provider reachable by neither path fails explicitly and never degrades to a proxy', () => {
    const resolution = resolveProviderPath(capability({ browser_direct: false, thin_proxy: false }));
    assert.equal(resolution.kind, 'unsupported');
    if (resolution.kind === 'unsupported') {
      assert.equal(resolution.reason_code, 'PROVIDER_CONNECTION_UNSUPPORTED');
      assert.equal(resolution.message, PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE);
      assert.match(resolution.message, /unsupported under current browser constraints/);
    }
    const violations = validateProviderConfiguration({
      provider_id: providerId('unreachable'),
      display_name: 'unreachable',
      model: 'm',
      base_url: null,
      base_url_source: 'registered_fixed',
      capability: capability({ browser_direct: false, thin_proxy: false }),
    });
    assert.deepEqual(
      violations.map((violation) => violation.code),
      ['NO_REACHABLE_PATH'],
    );
  });

  it('IMPLEMENTATION INVARIANT (AC-145): an outbound payload has exactly the closed key set - nothing extra can leave', () => {
    const request: AiRequest = {
      provider_id: providerId('payload-check'),
      model: 'fixture-model',
      messages: [{ role: 'user', content: 'x' }],
      structured_output: null,
    };
    const payload = buildProviderPayload(request, 'json_object');
    assert.deepEqual(Object.keys(payload).sort(), ['messages', 'model']);
    for (const key of Object.keys(payload)) {
      assert.ok(PROVIDER_PAYLOAD_KEYS.includes(key), `unexpected outbound key "${key}"`);
    }
    const withSchema = buildProviderPayload(
      {
        ...request,
        structured_output: {
          schema_id: 'schema',
          json_schema: { type: 'object' },
          preferred_mode: 'native_schema',
        },
      },
      'native_schema',
    );
    assert.deepEqual(Object.keys(withSchema).sort(), ['messages', 'model', 'response_format']);
  });

  it('IMPLEMENTATION INVARIANT (AC-133 / AC-156): a credential is opaque and cannot be serialised', () => {
    const raw = 'sk-fixture-NOT-A-REAL-KEY-0000000000';
    const secret = credentialSecret(raw);
    assert.equal(JSON.stringify(secret), '{}');
    assert.ok(!JSON.stringify({ secret }).includes(raw));
    assert.ok(!JSON.stringify({ ref: credentialRef('provider:fixture') }).includes(raw));
  });

  it('IMPLEMENTATION INVARIANT (AC-146 basis): a provider id can never be mistaken for a network target', () => {
    for (const hostile of ['https://evil.example', 'evil.example/path', 'a:b', 'a b', '', 'x'.repeat(65)]) {
      assert.throws(() => providerId(hostile), InvalidProviderIdError, `"${hostile}" must be rejected`);
    }
    assert.equal(providerId('MixedCase.Provider'), 'mixedcase.provider');
  });

  it('AC-149: the M10 contract carries no persistence, no database and no storage vocabulary', () => {
    for (const { file, source } of AI_DIR.sources) {
      const code = stripCommentsAndStrings(source);
      for (const forbidden of ['localStorage', 'indexedDB', 'writeFile', 'KvStore', 'createClient', 'Pool(']) {
        assert.ok(!code.includes(forbidden), `${file} contains storage vocabulary "${forbidden}"`);
      }
    }
  });
});
