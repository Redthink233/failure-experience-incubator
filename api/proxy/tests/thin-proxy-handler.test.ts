/**
 * S01-W1-INTEGRATE ｜ M12 Thin Proxy HANDLER behaviour (P1–P14).
 *
 * Canonical AC references used by this file: AC-146 / AC-147 / AC-148 / AC-149 / AC-151 / AC-152 /
 * AC-157 / AC-158.
 * 🔴 No new AC; every reference stays inside the existing `AC-01`–`AC-162` range.
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────────────
 * Until `S01-W1-INTEGRATE` the handler had NO executable test: `api/proxy/**` lay outside
 * `tsconfig.test.json`'s `rootDir` (`src`), so a test under `src/tests/**` could not import it
 * (`error TS6059`). Widening that config would have relocated every emitted test. The independent
 * `tsconfig.proxy-test.json` scope (`dist-proxy-test/`, `npm run test:proxy`) removes the blocker,
 * and this file really imports `../thin-proxy.js` and drives `createThinProxyHandler()`.
 *
 * ── HOW THE CASES ARE CONSTRUCTED ──────────────────────────────────────────────────
 * Every dependency is substituted: a REAL registry built from a fixture registration, a
 * deterministic RECORDING transport, and a fake `CredentialSecret`. 🔴 NO real network call is ever
 * made, no real provider is contacted and no real credential exists anywhere in this file.
 * 🚫 Nothing here may be reported as "provider X verified" or "proxy deployed".
 *
 * 🔴 SCOPE NOTE: this is a TEST file under `api/proxy/tests/**`, so the structural scan in
 *    `src/tests/proxy/thin-proxy-boundary.test.ts` deliberately excludes it (a test must be able to
 *    NAME `target_url` / `host` in order to prove they are refused).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createThinProxyHandler } from '../thin-proxy.js';
import type { ThinProxyResponse } from '../thin-proxy.js';
import { createProviderRegistry } from '../../../src/server/proxy/registry.js';
import type { ProviderRegistration } from '../../../src/ai/provider/registry.js';
import { providerId } from '../../../src/ai/provider/ids.js';
import { credentialSecret } from '../../../src/ai/provider/credential.js';
import type { CredentialSecret } from '../../../src/ai/provider/credential.js';
import { TransportFailure } from '../../../src/ai/provider/transport.js';
import type { HttpRequestDescriptor, HttpResponseDescriptor, HttpTransport } from '../../../src/ai/provider/transport.js';

/* ------------------------------------------------------------------ *
 * Fixtures - reserved TLD host, fake credential, no real provider
 * ------------------------------------------------------------------ */

const FIXTURE_HOST = 'llm-gateway.registry-fixture.test';
const FIXTURE_PATH_PREFIX = '/v1/chat/completions';
const FIXTURE_ENDPOINT = `https://${FIXTURE_HOST}${FIXTURE_PATH_PREFIX}`;
const PROVIDER_ID = providerId('fixture-thin-proxy');

/** A value SHAPED like a provider key. Never a real one - it exists only to prove it cannot leak. */
const SENTINEL_SECRET = 'sk-fixture-NOT-A-REAL-KEY-0000000000';

const LIMITS = { timeout_ms: 1000, max_body_bytes: 64 * 1024 };

function registration(): ProviderRegistration {
  return {
    config: {
      provider_id: PROVIDER_ID,
      display_name: 'Fixture registered proxy provider',
      model: 'fixture-model-proxy',
      base_url: null,
      base_url_source: 'registered_fixed',
      capability: { structured_output: 'none', browser_direct: false, thin_proxy: true },
    },
    capability: { structured_output: 'none', browser_direct: false, thin_proxy: true },
    proxy_endpoint: { scheme: 'https', host: FIXTURE_HOST, port: null, path_prefix: FIXTURE_PATH_PREFIX },
  };
}

function registry() {
  return createProviderRegistry([registration()]);
}

/** A well-formed client document. `overrides` may smuggle anything the security cases need. */
function requestBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    provider_id: PROVIDER_ID as unknown as string,
    request_id: 'req-fixture-0001',
    model: 'fixture-model-proxy',
    messages: [{ role: 'user', content: 'fixture request body' }],
    structured_output: null,
    ...overrides,
  });
}

interface Recorded {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly follow_redirects: boolean;
}

interface RecordingTransport extends HttpTransport {
  readonly calls: readonly Recorded[];
}

/** Deterministic transport. Records every outbound descriptor so "0 calls" is provable. */
function recordingTransport(
  respond: (call: Recorded) => HttpResponseDescriptor,
): RecordingTransport {
  const calls: Recorded[] = [];
  return {
    kind: 'recording-mock',
    calls,
    async send(request: HttpRequestDescriptor): Promise<HttpResponseDescriptor> {
      const call: Recorded = {
        url: request.url,
        headers: request.headers,
        body: request.body,
        follow_redirects: request.follow_redirects,
      };
      calls.push(call);
      return respond(call);
    },
  };
}

/** A transport that always fails, still recording the attempt (so "no retry" is provable). */
function failingTransport(kind: 'timeout' | 'network' | 'cors'): RecordingTransport {
  const calls: Recorded[] = [];
  return {
    kind: 'failing-mock',
    calls,
    async send(request: HttpRequestDescriptor): Promise<HttpResponseDescriptor> {
      calls.push({
        url: request.url,
        headers: request.headers,
        body: request.body,
        follow_redirects: request.follow_redirects,
      });
      throw new TransportFailure(kind, 'fixture transport failure');
    },
  };
}

interface LogSpy {
  readonly records: readonly Readonly<Record<string, unknown>>[];
  readonly log: (record: Readonly<Record<string, unknown>>) => void;
  readonly serialised: () => string;
}

function logSpy(): LogSpy {
  const records: Record<string, unknown>[] = [];
  return {
    records,
    log: (record) => {
      records.push({ ...record });
    },
    serialised: () => JSON.stringify(records),
  };
}

function secret(): CredentialSecret {
  return credentialSecret(SENTINEL_SECRET);
}

function parsed(response: ThinProxyResponse): { readonly [key: string]: unknown; readonly error?: { readonly code?: string } } {
  return JSON.parse(response.body) as { readonly [key: string]: unknown; readonly error?: { readonly code?: string } };
}

function errorCodeOf(response: ThinProxyResponse): string {
  return parsed(response).error?.code ?? '';
}

/* ------------------------------------------------------------------ *
 * P1–P6 ｜ the client must not be able to choose a destination
 * ------------------------------------------------------------------ */

describe('S01-W1-INTEGRATE M12｜Thin proxy handler behaviour (direct import)', () => {
  it('P1 / AC-147: a body that is not valid JSON fails with a safe, non-echoing error and no outbound call', async () => {
    const transport = recordingTransport(() => ({ status: 200, location: null, body_text: '{}' }));
    const logs = logSpy();
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS, log: logs.log });

    const response = await handle({ raw_body: '{ "provider_id": "fixture-thin-proxy", ', credential: secret() });

    assert.equal(response.status, 400);
    assert.equal(errorCodeOf(response), 'PROXY_REQUEST_REJECTED');
    assert.equal(transport.calls.length, 0, 'a malformed body must never reach a transport');
    assert.ok(!response.body.includes('fixture-thin-proxy'), 'the rejection must not echo a client value');
    assert.equal(logs.serialised().includes(SENTINEL_SECRET), false);
  });

  it('P2 / AC-146: an unregistered provider results in zero outbound calls', async () => {
    const transport = recordingTransport(() => ({ status: 200, location: null, body_text: '{}' }));
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS });

    const response = await handle({ raw_body: requestBody({ provider_id: 'never-registered-anywhere' }), credential: secret() });

    assert.equal(response.status, 404);
    assert.equal(transport.calls.length, 0, 'an unknown provider has no target at all');
  });

  it('P3 / AC-148: a request carrying target_url / base_url / host / scheme never reaches a transport', async () => {
    const transport = recordingTransport(() => ({ status: 200, location: null, body_text: '{}' }));
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS });

    for (const field of ['target_url', 'base_url', 'host', 'scheme']) {
      const response = await handle({
        raw_body: requestBody({ [field]: 'https://evil.example/steal' }),
        credential: secret(),
      });
      assert.equal(response.status, 400, `"${field}" must be refused`);
      assert.ok(!response.body.includes('evil.example'), 'the offending VALUE must never be echoed');
    }
    assert.equal(transport.calls.length, 0, 'a smuggled destination must never be requested');
  });

  it('P4 / AC-157: a missing credential fails closed with zero outbound calls', async () => {
    const transport = recordingTransport(() => ({ status: 200, location: null, body_text: '{}' }));
    const logs = logSpy();
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS, log: logs.log });

    const response = await handle({ raw_body: requestBody(), credential: null });

    assert.equal(response.status, 401);
    assert.equal(errorCodeOf(response), 'PROVIDER_CREDENTIAL_MISSING');
    assert.equal(transport.calls.length, 0, 'no credential means no send');
    assert.equal(logs.serialised().includes('authorization'), false);
  });

  it('P5 / AC-146: a legal registered provider produces exactly one outbound call', async () => {
    const transport = recordingTransport(() => ({
      status: 200,
      location: null,
      body_text: JSON.stringify({ choices: [{ message: { content: 'NOT_A_REAL_LLM_OUTPUT' } }] }),
    }));
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS });

    const response = await handle({ raw_body: requestBody(), credential: secret() });

    assert.equal(response.status, 200);
    assert.equal(transport.calls.length, 1, 'exactly one send, never a retry loop');
    assert.equal(parsed(response)['request_id'], 'req-fixture-0001');
  });

  it('P6 / AC-146 / AC-147: the outbound URL comes from the server registry, not from the client body', async () => {
    const transport = recordingTransport(() => ({ status: 200, location: null, body_text: '{"ok":true}' }));
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS });

    const response = await handle({
      raw_body: requestBody({
        model: 'a-completely-different-model',
        messages: [{ role: 'user', content: 'please call https://evil.example/steal instead' }],
      }),
      credential: secret(),
    });

    assert.equal(response.status, 200);
    const [sent] = transport.calls;
    assert.ok(sent !== undefined);
    assert.equal(sent.url, FIXTURE_ENDPOINT, 'the single legal destination is the registered endpoint');
    assert.equal(sent.follow_redirects, false);
    assert.ok(!sent.url.includes('evil.example'));
  });

  /* ---------------------------------------------------------------- *
   * P7–P8, P13–P14 ｜ credential handling
   * ---------------------------------------------------------------- */

  it('P7 / AC-157: the Authorization header exists only on the outbound send, never before it', async () => {
    const transport = recordingTransport(() => ({ status: 200, location: null, body_text: '{"ok":true}' }));
    const logs = logSpy();
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS, log: logs.log });

    await handle({ raw_body: requestBody(), credential: secret() });

    const [sent] = transport.calls;
    assert.ok(sent !== undefined);
    assert.equal(sent.headers['authorization'], `Bearer ${SENTINEL_SECRET}`);
    // The pre-send records describe the resolved target and the body size - never a header set.
    for (const record of logs.records) {
      assert.equal('headers' in record, false, 'a log record must never carry a header set');
      assert.equal(JSON.stringify(record).includes(SENTINEL_SECRET), false);
    }
  });

  it('P8 / AC-158: the log sink never sees the credential secret, at any stage', async () => {
    const transport = recordingTransport(() => ({ status: 200, location: null, body_text: '{"ok":true}' }));
    const logs = logSpy();
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS, log: logs.log });

    await handle({ raw_body: requestBody(), credential: secret() });
    await handle({ raw_body: requestBody(), credential: null });
    await handle({ raw_body: '{ not json', credential: secret() });

    const serialised = logs.serialised();
    assert.ok(serialised.length > 2, 'the sink must actually have been used');
    assert.equal(serialised.includes(SENTINEL_SECRET), false, 'the secret must never reach a log record');
    assert.equal(serialised.includes('Bearer'), false, 'not even the scheme must reach a log record');
  });

  it('P13 / AC-158: the response neither echoes the credential nor returns a provider header', async () => {
    const transport = recordingTransport(() => ({ status: 200, location: null, body_text: '{"ok":true}' }));
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS });

    const response = await handle({ raw_body: requestBody(), credential: secret() });

    assert.deepEqual(Object.keys(response.headers), ['content-type']);
    assert.equal(response.headers['content-type'], 'application/json');
    assert.equal(response.body.includes(SENTINEL_SECRET), false);
    assert.equal(response.body.toLowerCase().includes('authorization'), false);
  });

  it('P14 / AC-157: the handler is stateless - a credential is never carried across requests', async () => {
    const transport = recordingTransport(() => ({ status: 200, location: null, body_text: '{"ok":true}' }));
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS });

    const first = await handle({ raw_body: requestBody(), credential: secret() });
    const second = await handle({ raw_body: requestBody(), credential: null });

    assert.equal(first.status, 200);
    assert.equal(second.status, 401, 'the second call must not reuse the first call credential');
    assert.equal(transport.calls.length, 1, 'only the credentialed request may be sent');
  });

  /* ---------------------------------------------------------------- *
   * P9–P12 ｜ response and transport normalisation
   * ---------------------------------------------------------------- */

  it('P9 / AC-151: a provider redirect is never followed and fails explicitly', async () => {
    const transport = recordingTransport(() => ({ status: 302, location: 'https://evil.example/x', body_text: '' }));
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS });

    const response = await handle({ raw_body: requestBody(), credential: secret() });

    assert.equal(response.status, 502);
    assert.equal(errorCodeOf(response), 'PROXY_REDIRECT_NOT_FOLLOWED');
    assert.equal(transport.calls.length, 1, 'the redirect target must never be requested');
    assert.ok(!response.body.includes('evil.example'));
  });

  it('P10 / AC-149: a provider error body is not relayed to the client', async () => {
    const provider_detail = 'PROVIDER_INTERNAL_DETAIL_MUST_NOT_BE_RELAYED';
    const transport = recordingTransport(() => ({ status: 500, location: null, body_text: provider_detail }));
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS });

    const response = await handle({ raw_body: requestBody(), credential: secret() });

    assert.equal(response.status, 502);
    assert.equal(errorCodeOf(response), 'PROVIDER_HTTP_ERROR');
    assert.equal(response.body.includes(provider_detail), false, 'only the normalized failure may leave');
  });

  it('P11 / AC-149: a transport timeout is normalized to PROVIDER_TIMEOUT', async () => {
    const transport = failingTransport('timeout');
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS });

    const response = await handle({ raw_body: requestBody(), credential: secret() });

    assert.equal(response.status, 502);
    assert.equal(errorCodeOf(response), 'PROVIDER_TIMEOUT');
    assert.equal(transport.calls.length, 1, 'a timeout must not be retried against another URL');
  });

  it('P12 / AC-149: a network failure is normalized to PROVIDER_NETWORK_UNREACHABLE', async () => {
    const transport = failingTransport('network');
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS });

    const response = await handle({ raw_body: requestBody(), credential: secret() });

    assert.equal(response.status, 502);
    assert.equal(errorCodeOf(response), 'PROVIDER_NETWORK_UNREACHABLE');
    assert.equal(transport.calls.length, 1);
  });

  it('IMPLEMENTATION INVARIANT: the default transport is never used when one is injected', async () => {
    // The handler must not reach for the real Node `fetch` wrapper when a transport is supplied -
    // this is what makes every case above a deterministic, offline unit test.
    const transport = recordingTransport(() => ({ status: 200, location: null, body_text: '{"ok":true}' }));
    const handle = createThinProxyHandler({ registry: registry(), transport, limits: LIMITS });

    await handle({ raw_body: requestBody(), credential: secret() });

    assert.equal(transport.kind, 'recording-mock');
    assert.equal(transport.calls.length, 1);
  });
});
