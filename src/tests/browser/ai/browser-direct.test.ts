/**
 * S01-04 ｜ M11 Browser Direct adapter - target fidelity, explicit failure and no proxy fallback.
 *
 * Canonical AC references used by this file: AC-132 / AC-144 / AC-145 / AC-147 / AC-150 /
 * AC-156 / AC-158.
 * 🔴 No new AC; every reference stays inside the existing `AC-01`–`AC-162` range.
 *
 * 🔴 Every case runs against a MOCK transport. No real provider is contacted, and every simulated
 *    model body is labelled `NOT_A_REAL_LLM_OUTPUT` (S01-04 executes no real call).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BrowserDirectUnavailableError,
  createBrowserDirectAdapter,
  extractResponseText,
} from '../../../browser/ai/browser-direct-adapter.js';
import { PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE, resolveProviderPath } from '../../../ai/provider/capability.js';
import { providerId } from '../../../ai/provider/ids.js';
import { PROVIDER_PAYLOAD_KEYS } from '../../../ai/provider/request.js';
import type { AiRequest } from '../../../ai/provider/request.js';
import type { AiInvocation } from '../../../ai/provider/adapter.js';
import { aiResultToLogRecord } from '../../../ai/provider/result.js';
import { revealCredentialSecret } from '../../../ai/provider/credential.js';
import { createSessionCredentialStore, credentialRefForProvider } from '../../../browser/ai/session-credential-store.js';
import { createMemorySessionStorage } from '../../../browser/ai/session-storage.js';
import {
  FIXTURE_BASE_URL,
  FIXTURE_PROXY_ENDPOINT,
  NOT_A_REAL_LLM_OUTPUT,
  SENTINEL_SECRET,
  browserDirectConfig,
  createFailingTransport,
  createMockTransport,
  okResponse,
  providerShapedBody,
  proxyConfig,
} from '../../ai/fixtures.js';

const CONFIG = browserDirectConfig();
const CREDENTIAL_REF = credentialRefForProvider(CONFIG.provider_id);

function credentialResolver(): ReturnType<typeof createSessionCredentialStore> {
  const store = createSessionCredentialStore(createMemorySessionStorage());
  store.put(CREDENTIAL_REF, SENTINEL_SECRET);
  return store;
}

function invocation(overrides: Partial<AiRequest> = {}): AiInvocation {
  return {
    provider_id: CONFIG.provider_id,
    credential_ref: CREDENTIAL_REF,
    request: {
      provider_id: CONFIG.provider_id,
      model: CONFIG.model,
      messages: [{ role: 'user', content: 'fixture request body' }],
      structured_output: null,
      ...overrides,
    },
  };
}

describe('S01-04 M11｜Browser Direct adapter', () => {
  it('AC-145 (T2): the request goes to the configured provider endpoint and nowhere else', async () => {
    const transport = createMockTransport(() => okResponse(providerShapedBody()));
    const adapter = createBrowserDirectAdapter({ config: CONFIG, credentials: credentialResolver(), transport });

    const result = await adapter.execute(invocation());

    assert.equal(transport.calls.length, 1, 'exactly one request may leave the browser');
    assert.equal(transport.calls[0]?.url, FIXTURE_BASE_URL);
    assert.equal(transport.calls[0]?.headers['content-type'], 'application/json');
    assert.equal(transport.calls[0]?.headers['authorization'], `Bearer ${SENTINEL_SECRET}`);
    assert.equal(result.kind, 'ok');
    if (result.kind === 'ok') {
      assert.equal(result.text, NOT_A_REAL_LLM_OUTPUT);
      assert.equal(result.http_status, 200);
    }
  });

  it('AC-145: only the request payload is transmitted - no workspace, no extra context', async () => {
    const transport = createMockTransport(() => okResponse(providerShapedBody()));
    const adapter = createBrowserDirectAdapter({ config: CONFIG, credentials: credentialResolver(), transport });
    await adapter.execute(invocation());

    const body = JSON.parse(transport.calls[0]?.body ?? '{}') as Record<string, unknown>;
    for (const key of Object.keys(body)) {
      assert.ok(PROVIDER_PAYLOAD_KEYS.includes(key), `unexpected outbound key "${key}"`);
    }
    assert.deepEqual(Object.keys(body).sort(), ['messages', 'model']);
    assert.equal(body['model'], CONFIG.model, 'the configured model must be used (AC-132)');
    const serialised = transport.calls[0]?.body ?? '';
    for (const forbidden of ['workspace', 'attempts', 'insight', 'hypothesis', SENTINEL_SECRET]) {
      assert.ok(!serialised.includes(forbidden), `the outbound body must not contain "${forbidden}"`);
    }
  });

  it('AC-147 (T3): a custom base_url is browser-direct only and never routed through the thin proxy', async () => {
    const transport = createMockTransport(() => okResponse(providerShapedBody()));
    const adapter = createBrowserDirectAdapter({ config: CONFIG, credentials: credentialResolver(), transport });
    await adapter.execute(invocation());

    assert.equal(adapter.path, 'browser_direct');
    assert.deepEqual(adapter.path_resolution, { kind: 'resolved', path: 'browser_direct' });
    assert.deepEqual(resolveProviderPath(CONFIG.capability), { kind: 'resolved', path: 'browser_direct' });
    const urls = transport.calls.map((call) => call.url);
    assert.deepEqual(urls, [FIXTURE_BASE_URL]);
    assert.ok(!urls.includes(FIXTURE_PROXY_ENDPOINT), 'the thin proxy endpoint must never be contacted');
    assert.ok(
      urls.every((url) => new URL(url).hostname !== new URL(FIXTURE_PROXY_ENDPOINT).hostname),
      'no request may go to the proxy origin',
    );
  });

  it('AC-150 (T4): a network failure is reported explicitly and never silently re-routed', async () => {
    const transport = createFailingTransport('network');
    const adapter = createBrowserDirectAdapter({ config: CONFIG, credentials: credentialResolver(), transport });

    const result = await adapter.execute(invocation());

    assert.equal(result.kind, 'error');
    if (result.kind === 'error') {
      assert.equal(result.error.code, 'PROVIDER_NETWORK_UNREACHABLE');
      assert.equal(result.error.failure_kind, 'network');
      assert.equal(result.error.retryable, true);
      assert.equal(result.error.path, 'browser_direct');
      assert.equal(result.error.http_status, null);
    }
    assert.equal(transport.calls.length, 1, 'a failure must not trigger a second attempt anywhere');
    assert.equal(transport.calls[0]?.url, FIXTURE_BASE_URL);
  });

  it('AC-150 (T4): a CORS-refused request is a distinct explicit failure, not a fallback', async () => {
    const transport = createFailingTransport('cors');
    const adapter = createBrowserDirectAdapter({ config: CONFIG, credentials: credentialResolver(), transport });

    const result = await adapter.execute(invocation());

    assert.equal(result.kind, 'error');
    if (result.kind === 'error') {
      assert.equal(result.error.code, 'PROVIDER_CORS_BLOCKED');
      assert.equal(result.error.retryable, false);
      assert.equal(result.error.message, 'The browser refused the cross-origin provider request.');
    }
    assert.deepEqual(
      transport.calls.map((call) => call.url),
      [FIXTURE_BASE_URL],
      'a refused request must not be retried against another URL',
    );
  });

  it('AC-150: a provider that cannot be reached browser-direct cannot produce an adapter at all', () => {
    assert.throws(
      () => createBrowserDirectAdapter({ config: proxyConfig(), credentials: credentialResolver() }),
      (error: unknown) =>
        error instanceof BrowserDirectUnavailableError && error.message === PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE,
    );
    assert.throws(
      () =>
        createBrowserDirectAdapter({
          config: browserDirectConfig({ base_url: null }),
          credentials: credentialResolver(),
        }),
      BrowserDirectUnavailableError,
    );
    assert.throws(
      () =>
        createBrowserDirectAdapter({
          config: browserDirectConfig({ base_url: 'https://user:pass@host.registry-fixture.test/v1' }),
          credentials: credentialResolver(),
        }),
      BrowserDirectUnavailableError,
    );
  });

  it('AC-158 / AC-156: the credential reaches the provider header and appears in no log record', async () => {
    const transport = createMockTransport(() => okResponse(providerShapedBody()));
    const store = credentialResolver();
    const adapter = createBrowserDirectAdapter({ config: CONFIG, credentials: store, transport });
    const result = await adapter.execute(invocation());

    const header = transport.calls[0]?.headers['authorization'] ?? '';
    assert.equal(header, `Bearer ${SENTINEL_SECRET}`);
    assert.equal(Object.keys(transport.calls[0]?.headers ?? {}).sort().join(','), 'authorization,content-type');
    assert.ok(!JSON.stringify(aiResultToLogRecord(result)).includes(SENTINEL_SECRET));
    assert.ok(!JSON.stringify(result).includes(SENTINEL_SECRET), 'a result must never carry the secret');
    const stored = store.resolve(CREDENTIAL_REF);
    assert.ok(stored !== null, 'the session store must still resolve the credential');
    assert.equal(revealCredentialSecret(stored), SENTINEL_SECRET);
  });

  it('IMPLEMENTATION INVARIANT: a missing credential fails explicitly instead of sending an anonymous request', async () => {
    const transport = createMockTransport(() => okResponse(providerShapedBody()));
    const adapter = createBrowserDirectAdapter({ config: CONFIG, credentials: credentialResolver(), transport });

    const without_ref = await adapter.execute({ ...invocation(), credential_ref: null });
    assert.equal(without_ref.kind, 'error');
    if (without_ref.kind === 'error') {
      assert.equal(without_ref.error.code, 'PROVIDER_CREDENTIAL_MISSING');
    }
    const unknown_ref = await adapter.execute({
      ...invocation(),
      credential_ref: credentialRefForProvider('never-stored'),
    });
    assert.equal(unknown_ref.kind, 'error');
    assert.equal(transport.calls.length, 0, 'no request may be sent without a usable credential');
  });

  it('IMPLEMENTATION INVARIANT: an invalid request is rejected before any network call', async () => {
    const transport = createMockTransport(() => okResponse(providerShapedBody()));
    const adapter = createBrowserDirectAdapter({ config: CONFIG, credentials: credentialResolver(), transport });

    const empty = await adapter.execute(invocation({ messages: [] }));
    assert.equal(empty.kind, 'error');
    if (empty.kind === 'error') {
      assert.equal(empty.error.code, 'PROVIDER_REQUEST_INVALID');
      assert.equal(empty.error.message, 'The AI request was rejected by normalization before any network call.');
    }
    const foreign = await adapter.execute({ ...invocation(), provider_id: providerId('someone-else') });
    assert.equal(foreign.kind, 'error');
    assert.equal(transport.calls.length, 0);
  });

  it('IMPLEMENTATION INVARIANT: a redirect response is never followed and is reported as such', async () => {
    const transport = createMockTransport(() => ({ status: 302, location: 'https://evil.example/x', body_text: '' }));
    const adapter = createBrowserDirectAdapter({ config: CONFIG, credentials: credentialResolver(), transport });

    const result = await adapter.execute(invocation());

    assert.equal(result.kind, 'error');
    if (result.kind === 'error') {
      assert.equal(result.error.code, 'PROXY_REDIRECT_NOT_FOLLOWED');
      assert.equal(result.error.failure_kind, 'redirect_blocked');
      assert.equal(result.error.path, 'browser_direct');
    }
    assert.equal(transport.calls.length, 1, 'the redirect target must never be requested');
  });

  it('IMPLEMENTATION INVARIANT: structured output is either validated or reported, never invented', async () => {
    const structured_request = {
      schema_id: 'fixture-schema-v1',
      json_schema: { type: 'object', required: ['label'], properties: { label: { type: 'string' } } },
      preferred_mode: 'native_schema' as const,
    };
    const valid_body = JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ label: 'fixture' }) } }],
    });
    const valid_transport = createMockTransport(() => okResponse(valid_body));
    const valid_adapter = createBrowserDirectAdapter({
      config: CONFIG,
      credentials: credentialResolver(),
      transport: valid_transport,
    });
    const ok = await valid_adapter.execute(invocation({ structured_output: structured_request }));
    assert.equal(ok.kind, 'ok');
    if (ok.kind === 'ok') {
      assert.deepEqual(ok.structured, { label: 'fixture' });
    }
    const sent = JSON.parse(valid_transport.calls[0]?.body ?? '{}') as Record<string, unknown>;
    assert.equal((sent['response_format'] as Record<string, unknown>)['type'], 'json_schema');

    const invalid_body = JSON.stringify({ choices: [{ message: { content: 'not json at all' } }] });
    const invalid_adapter = createBrowserDirectAdapter({
      config: CONFIG,
      credentials: credentialResolver(),
      transport: createMockTransport(() => okResponse(invalid_body)),
    });
    const failed = await invalid_adapter.execute(invocation({ structured_output: structured_request }));
    assert.equal(failed.kind, 'error');
    if (failed.kind === 'error') {
      assert.equal(failed.error.code, 'PROVIDER_SCHEMA_INVALID');
      assert.equal(failed.error.retryable, true);
    }
  });

  it('IMPLEMENTATION INVARIANT: response extraction understands the common envelope and otherwise passes the body through', () => {
    assert.equal(extractResponseText(providerShapedBody()), NOT_A_REAL_LLM_OUTPUT);
    assert.equal(extractResponseText(JSON.stringify({ content: [{ text: 'plain' }] })), 'plain');
    assert.equal(extractResponseText('not json'), 'not json');
    assert.equal(extractResponseText(JSON.stringify({ unexpected: true })), JSON.stringify({ unexpected: true }));
  });
});
