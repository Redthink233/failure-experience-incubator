/**
 * S01 ｜ `M15` browser composition root - provider path selection, the thin-proxy CLIENT and the
 *        credential boundary.
 *
 * Contract: contract §0.4 A / §0.4 D; `D-055` / `D-060`; HANDOFF §4 / §6.
 * Canonical references: AC-132 / AC-144 / AC-145 / AC-146 / AC-147 / AC-148 / AC-150 / AC-151 /
 * AC-156 / AC-158. The suite creates NO `AC`.
 *
 * 🔴 THE PROVIDER PATH IS NOT A PARAMETER. Every case below asserts that the path follows from the
 *    CAPABILITY alone and that an unusable configuration FAILS EXPLICITLY instead of quietly taking
 *    the other route.
 * 🔴 `Real Provider Calls = 0`: the transport is a deterministic double. Nothing here proves anything
 *    about a real provider, a real proxy deployment or a real browser (`PSA-*` stay `PENDING`).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ProviderCapability, ProviderConfig } from '../../../ai/provider/capability.js';
import { PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE } from '../../../ai/provider/capability.js';
import { providerId } from '../../../ai/provider/ids.js';
import type { HttpRequestDescriptor, HttpResponseDescriptor, HttpTransport } from '../../../ai/provider/transport.js';
import type { AiRequest } from '../../../ai/provider/request.js';
import { createMemorySessionStorage } from '../../../browser/ai/session-storage.js';
import {
  createSessionCredentialStore,
  credentialRefForProvider,
} from '../../../browser/ai/session-credential-store.js';
import {
  DEFAULT_THIN_PROXY_PATH,
  THIN_PROXY_WIRE_KEYS,
  ThinProxyUnavailableError,
  createThinProxyAdapter,
} from '../../../browser/ai/thin-proxy-adapter.js';
import { composeBrowserProvider } from '../../../browser/application/provider-composition.js';
import { composeBrowserWorkflow } from '../../../browser/application/workflow-composition.js';
import { InMemoryWorkspaceStorage } from '../../../workspace/memory-storage.js';

/* ------------------------------------------------------------------ *
 * Doubles
 * ------------------------------------------------------------------ */

class RecordingTransport implements HttpTransport {
  readonly kind = 'recording';
  readonly requests: HttpRequestDescriptor[] = [];

  private readonly responder: (request: HttpRequestDescriptor) => HttpResponseDescriptor;

  constructor(responder: (request: HttpRequestDescriptor) => HttpResponseDescriptor) {
    this.responder = responder;
  }

  async send(request: HttpRequestDescriptor): Promise<HttpResponseDescriptor> {
    this.requests.push(request);
    return this.responder(request);
  }
}

const SECRET = 'fixture-not-a-real-credential';

function credentialsWithKey(raw_provider_id: string) {
  const store = createSessionCredentialStore(createMemorySessionStorage());
  store.put(credentialRefForProvider(raw_provider_id), SECRET);
  return { store, ref: credentialRefForProvider(raw_provider_id) };
}

function makeConfig(
  raw_provider_id: string,
  capability: ProviderCapability,
  options: { readonly base_url?: string | null } = {},
): ProviderConfig {
  const base_url = options.base_url ?? null;
  return {
    provider_id: providerId(raw_provider_id),
    display_name: 'Fixture provider',
    model: 'fixture-model',
    base_url,
    base_url_source: base_url === null ? 'registered_fixed' : 'user_custom',
    capability,
  };
}

const BROWSER_DIRECT_ONLY: ProviderCapability = {
  structured_output: 'native_schema',
  browser_direct: true,
  thin_proxy: false,
};
const THIN_PROXY_ONLY: ProviderCapability = {
  structured_output: 'native_schema',
  browser_direct: false,
  thin_proxy: true,
};
const UNREACHABLE: ProviderCapability = {
  structured_output: 'native_schema',
  browser_direct: false,
  thin_proxy: false,
};

function requestFor(provider_id_text: string): AiRequest {
  return {
    provider_id: providerId(provider_id_text),
    model: 'fixture-model',
    messages: [{ role: 'user', content: '请解析这次尝试。' }],
    structured_output: null,
  };
}

/* ------------------------------------------------------------------ *
 * 1. Path selection
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜the provider PATH follows from the capability alone', () => {
  it('AC-144 / AC-145 / IMPLEMENTATION INVARIANT: Browser Direct is preferred when the capability offers it', () => {
    const { store } = credentialsWithKey('path-direct');
    const result = composeBrowserProvider({
      config: makeConfig('path-direct', BROWSER_DIRECT_ONLY, {
        base_url: 'https://provider.example.invalid/v1/chat/completions',
      }),
      credentials: store,
      transport: new RecordingTransport(() => ({ status: 200, location: null, body_text: '{}' })),
    });
    assert.equal(result.kind, 'composed');
    if (result.kind === 'composed') {
      assert.equal(result.path, 'browser_direct');
      assert.equal(result.credential_ref.ref_id, 'provider:path-direct');
    }
  });

  it('AC-146 / AC-147 / IMPLEMENTATION INVARIANT: Thin Proxy is used only for a registered, proxy-capable provider with NO client-side endpoint', () => {
    const { store } = credentialsWithKey('path-proxy');
    const result = composeBrowserProvider({
      config: makeConfig('path-proxy', THIN_PROXY_ONLY),
      credentials: store,
      transport: new RecordingTransport(() => ({ status: 200, location: null, body_text: '{}' })),
    });
    assert.equal(result.kind, 'composed');
    if (result.kind === 'composed') {
      assert.equal(result.path, 'thin_proxy');
    }
  });

  it('a capability with no reachable path FAILS EXPLICITLY with the frozen message (AC-150)', () => {
    const { store } = credentialsWithKey('path-none');
    const result = composeBrowserProvider({
      config: makeConfig('path-none', UNREACHABLE),
      credentials: store,
    });
    assert.equal(result.kind, 'unsupported');
    if (result.kind === 'unsupported') {
      assert.equal(result.reason_code, 'PROVIDER_CONNECTION_UNSUPPORTED');
      assert.equal(result.message, PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE);
    }
  });

  it('a custom Base URL can never take the proxy path (AC-147)', () => {
    const { store } = credentialsWithKey('path-custom');
    const result = composeBrowserProvider({
      config: makeConfig('path-custom', THIN_PROXY_ONLY, { base_url: 'https://custom.example.invalid/v1' }),
      credentials: store,
      transport: new RecordingTransport(() => ({ status: 200, location: null, body_text: '{}' })),
    });
    assert.equal(result.kind, 'unsupported');
    if (result.kind === 'unsupported') {
      /* 🔴 The refusal text is the FROZEN one - never the constructor's, which may name a host. */
      assert.equal(result.message, PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE);
      assert.equal(result.message.includes('custom.example.invalid'), false);
    }
  });
});

/* ------------------------------------------------------------------ *
 * 2. The thin-proxy CLIENT
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜the thin-proxy client speaks ONE closed document', () => {
  it('AC-146 / AC-148 / IMPLEMENTATION INVARIANT: the outbound document carries exactly the five allowed keys and NO destination key', async () => {
    const { store, ref } = credentialsWithKey('wire-1');
    const transport = new RecordingTransport(() => ({
      status: 200,
      location: null,
      body_text: JSON.stringify({ request_id: 'r1', provider_body: '{"choices":[{"message":{"content":"ok"}}]}' }),
    }));
    const adapter = createThinProxyAdapter({
      config: makeConfig('wire-1', THIN_PROXY_ONLY),
      credentials: store,
      transport,
    });

    const result = await adapter.execute({
      provider_id: providerId('wire-1'),
      request: requestFor('wire-1'),
      credential_ref: ref,
    });
    assert.equal(result.kind, 'ok');

    assert.equal(transport.requests.length, 1);
    const sent = transport.requests[0];
    assert.ok(sent !== undefined);
    /* 🔴 The destination is the FIXED application path - never a client-supplied URL. */
    assert.equal(sent.url, DEFAULT_THIN_PROXY_PATH);
    assert.equal(sent.follow_redirects, false);
    assert.equal(sent.method, 'POST');

    const body = JSON.parse(sent.body) as Record<string, unknown>;
    assert.deepEqual(Object.keys(body).sort(), [...THIN_PROXY_WIRE_KEYS].sort());
    for (const forbidden of [
      'target_url',
      'target',
      'base_url',
      'baseurl',
      'host',
      'hostname',
      'scheme',
      'protocol',
      'port',
      'url',
      'uri',
      'endpoint',
      'credential',
      'api_key',
      'apiKey',
    ]) {
      assert.equal(forbidden in body, false, `the wire document must not carry "${forbidden}"`);
    }
    /* 🔴 No client header beyond the fixed one plus the ONE credential header. */
    assert.deepEqual(Object.keys(sent.headers).sort(), ['authorization', 'content-type']);
    assert.equal(sent.headers['authorization'], `Bearer ${SECRET}`);
    assert.equal(sent.body.includes(SECRET), false, 'the secret never travels in the body');
  });

  it('AC-147 / AC-150 / IMPLEMENTATION INVARIANT: the adapter refuses to exist for a browser-direct capability, an absolute endpoint or a custom Base URL', () => {
    const { store } = credentialsWithKey('guard-1');
    const transport = new RecordingTransport(() => ({ status: 200, location: null, body_text: '{}' }));

    assert.throws(
      () =>
        createThinProxyAdapter({
          config: makeConfig('guard-1', BROWSER_DIRECT_ONLY, { base_url: 'https://p.example.invalid/v1' }),
          credentials: store,
          transport,
        }),
      ThinProxyUnavailableError,
      'a browser-direct capability must not be served by the proxy client',
    );

    assert.throws(
      () =>
        createThinProxyAdapter({
          config: makeConfig('guard-1', THIN_PROXY_ONLY),
          credentials: store,
          transport,
          endpoint_path: 'https://evil.example.invalid/collect',
        }),
      ThinProxyUnavailableError,
      'an absolute endpoint would make this a general-purpose outbound client',
    );

    assert.throws(
      () =>
        createThinProxyAdapter({
          config: makeConfig('guard-1', THIN_PROXY_ONLY, { base_url: 'https://custom.example.invalid/v1' }),
          credentials: store,
          transport,
        }),
      ThinProxyUnavailableError,
      'a thin-proxy provider must not carry a client-side endpoint',
    );
  });

  it('AC-156 / IMPLEMENTATION INVARIANT: a missing credential is an explicit failure and nothing is sent', async () => {
    const store = createSessionCredentialStore(createMemorySessionStorage());
    const transport = new RecordingTransport(() => ({ status: 200, location: null, body_text: '{}' }));
    const adapter = createThinProxyAdapter({
      config: makeConfig('nokey-1', THIN_PROXY_ONLY),
      credentials: store,
      transport,
    });

    const result = await adapter.execute({
      provider_id: providerId('nokey-1'),
      request: requestFor('nokey-1'),
      credential_ref: credentialRefForProvider('nokey-1'),
    });
    assert.equal(result.kind, 'error');
    if (result.kind === 'error') {
      assert.equal(result.error.code, 'PROVIDER_CREDENTIAL_MISSING');
    }
    assert.deepEqual(transport.requests, []);
  });

  it('IMPLEMENTATION INVARIANT: a response that is not the proxy envelope is refused instead of read as an empty answer', async () => {
    const { store, ref } = credentialsWithKey('shape-1');
    const adapter = createThinProxyAdapter({
      config: makeConfig('shape-1', THIN_PROXY_ONLY),
      credentials: store,
      transport: new RecordingTransport(() => ({ status: 200, location: null, body_text: '{"ok":true}' })),
    });
    const result = await adapter.execute({
      provider_id: providerId('shape-1'),
      request: requestFor('shape-1'),
      credential_ref: ref,
    });
    assert.equal(result.kind, 'error');
    if (result.kind === 'error') {
      assert.equal(result.error.code, 'PROVIDER_SCHEMA_INVALID');
    }
  });

  it('AC-151 / IMPLEMENTATION INVARIANT: a denial, an empty body and a redirect are failures - a provider error body is never relayed', async () => {
    const { store, ref } = credentialsWithKey('fail-1');
    const cases: readonly { readonly label: string; readonly response: HttpResponseDescriptor; readonly code: string }[] = [
      {
        label: 'server denial',
        response: {
          status: 403,
          location: null,
          body_text: JSON.stringify({ error: { code: 'PROXY_TARGET_BLOCKED', message: 'blocked by policy' } }),
        },
        code: 'PROVIDER_HTTP_ERROR',
      },
      { label: 'redirect', response: { status: 302, location: 'https://elsewhere.invalid/', body_text: '' }, code: 'PROXY_REDIRECT_NOT_FOLLOWED' },
      { label: 'empty 2xx body', response: { status: 200, location: null, body_text: '' }, code: 'PROVIDER_RESPONSE_NOT_JSON' },
    ];

    for (const entry of cases) {
      const adapter = createThinProxyAdapter({
        config: makeConfig('fail-1', THIN_PROXY_ONLY),
        credentials: store,
        transport: new RecordingTransport(() => entry.response),
      });
      const result = await adapter.execute({
        provider_id: providerId('fail-1'),
        request: requestFor('fail-1'),
        credential_ref: ref,
      });
      assert.equal(result.kind, 'error', entry.label);
      if (result.kind === 'error') {
        assert.equal(result.error.code, entry.code, entry.label);
        /* 🔴 No provider text is echoed into the failure. */
        assert.equal(result.error.message.includes('blocked by policy'), false);
        assert.equal(result.error.message.includes('elsewhere.invalid'), false);
      }
    }
  });

  it('AC-149 / IMPLEMENTATION INVARIANT: a 2xx envelope is evaluated against the requested structured output', async () => {
    const { store, ref } = credentialsWithKey('struct-1');
    const payload = { parse_status: 'extracted', goal: 'G' };
    const adapter = createThinProxyAdapter({
      config: makeConfig('struct-1', THIN_PROXY_ONLY),
      credentials: store,
      transport: new RecordingTransport(() => ({
        status: 200,
        location: null,
        body_text: JSON.stringify({
          request_id: 'r2',
          provider_body: JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
        }),
      })),
    });

    const request: AiRequest = {
      ...requestFor('struct-1'),
      structured_output: {
        schema_id: 'fixture-schema',
        json_schema: { type: 'object' },
        preferred_mode: 'json_object',
      },
    };
    const result = await adapter.execute({
      provider_id: providerId('struct-1'),
      request,
      credential_ref: ref,
    });
    assert.equal(result.kind, 'ok');
    if (result.kind === 'ok') {
      assert.deepEqual(result.structured, payload);
      assert.equal(result.text.includes('parse_status'), true);
    }
  });
});

/* ------------------------------------------------------------------ *
 * 3. The composed workflow
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜the composed browser workflow', () => {
  it('AC-150 / IMPLEMENTATION INVARIANT: an unsupported provider stops the composition, with the frozen message', () => {
    const { store } = credentialsWithKey('compose-none');
    const provider = composeBrowserProvider({
      config: makeConfig('compose-none', UNREACHABLE),
      credentials: store,
    });
    const composed = composeBrowserWorkflow({ storage: new InMemoryWorkspaceStorage(), provider });
    assert.equal(composed.kind, 'unsupported');
    if (composed.kind === 'unsupported') {
      assert.equal(composed.message, PROVIDER_CONNECTION_UNSUPPORTED_MESSAGE);
    }
  });

  it('AC-130 / IMPLEMENTATION INVARIANT: the composed graph shares ONE workspace: a run through it is visible after `reopen()`', async () => {
    const { store } = credentialsWithKey('compose-1');
    const transport = new RecordingTransport(() => ({
      status: 200,
      location: null,
      body_text: JSON.stringify({ request_id: 'r3', provider_body: JSON.stringify({ choices: [{ message: { content: '{}' } }] }) }),
    }));
    const provider = composeBrowserProvider({
      config: makeConfig('compose-1', BROWSER_DIRECT_ONLY, {
        base_url: 'https://provider.example.invalid/v1/chat/completions',
      }),
      credentials: store,
      transport,
    });
    assert.equal(provider.kind, 'composed');

    const storage = new InMemoryWorkspaceStorage();
    const composed = composeBrowserWorkflow({ storage, provider });
    assert.equal(composed.kind, 'composed');
    if (composed.kind !== 'composed') {
      return;
    }
    const { composition } = composed;

    /* ① through the REAL composed graph. The step ② parse may fail at the transport layer - what
       matters here is that the outbound call really left with the closed shape. */
    const begun = await composition.workflow.beginCapture({
      operation_id: 'compose-op',
      raw_text: '一次没有达到目标的尝试',
    });
    const attempt = begun.value?.attempt ?? null;
    assert.ok(attempt !== null, `the capture must produce a Draft (received ${begun.kind})`);
    assert.equal(transport.requests.length, 1);
    const sent = transport.requests[0];
    assert.ok(sent !== undefined);
    assert.equal(sent.url, 'https://provider.example.invalid/v1/chat/completions');
    assert.equal(sent.headers['authorization'], `Bearer ${SECRET}`);
    assert.equal(sent.body.includes(SECRET), false);

    /* The read model over the SAME storage, from a BRAND-NEW object graph. */
    const reopened = composition.reopen();
    const first = await composition.readWorkflow(attempt.attempt_id);
    const second = await reopened.readWorkflow(attempt.attempt_id);
    assert.equal(first.kind, 'snapshot');
    assert.equal(second.kind, 'snapshot');
    if (first.kind === 'snapshot' && second.kind === 'snapshot') {
      assert.equal(second.snapshot.attempt_state, first.snapshot.attempt_state);
      assert.equal(second.snapshot.retrieval.state, first.snapshot.retrieval.state);
      assert.deepEqual(second.snapshot.available_actions, first.snapshot.available_actions);
    }
  });

  it('AC-133 / AC-158 / IMPLEMENTATION INVARIANT: every service in the composed graph shares the SAME credential ref, and no secret is held', () => {
    const { store, ref } = credentialsWithKey('compose-2');
    const provider = composeBrowserProvider({
      config: makeConfig('compose-2', THIN_PROXY_ONLY),
      credentials: store,
      transport: new RecordingTransport(() => ({ status: 200, location: null, body_text: '{}' })),
    });
    assert.equal(provider.kind, 'composed');
    if (provider.kind !== 'composed') {
      return;
    }
    const composed = composeBrowserWorkflow({ storage: new InMemoryWorkspaceStorage(), provider });
    assert.equal(composed.kind, 'composed');
    if (composed.kind !== 'composed') {
      return;
    }
    assert.equal(composed.composition.credential_ref.ref_id, ref.ref_id);
    /* 🔴 The composition graph is serialisable: no secret is reachable through it. */
    assert.equal(JSON.stringify(composed.composition.workflow).includes(SECRET), false);
    assert.equal(JSON.stringify(composed.composition.credential_ref).includes(SECRET), false);
  });
});
