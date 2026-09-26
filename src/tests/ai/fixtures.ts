/**
 * Deterministic fixtures for the S01-04 (Provider / Proxy / Credential) test suite.
 *
 * 🔴 Every host used here is either an RFC 6761 reserved `.test` name or an address literal that
 *    must be REFUSED. No real provider hostname appears anywhere in this repository's fixtures, so
 *    no fixture can be mistaken for "provider X has been verified" (S01-04 executes no real call).
 *
 * 🔴 Every simulated model output is labelled `NOT_A_REAL_LLM_OUTPUT`.
 *
 * This is not a `.test.ts` file, so it declares no AC and is exempt from the per-`it` AC rule; the
 * suite files that import it carry the AC annotations.
 */

import { providerId } from '../../ai/provider/ids.js';
import type { ProviderId } from '../../ai/provider/ids.js';
import type { ProviderConfig } from '../../ai/provider/capability.js';
import { createProviderRegistry } from '../../server/proxy/registry.js';
import type { ProviderRegistration, ProviderRegistry } from '../../ai/provider/registry.js';
import { TransportFailure } from '../../ai/provider/transport.js';
import type {
  HttpRequestDescriptor,
  HttpResponseDescriptor,
  HttpTransport,
  TransportFailureKind,
} from '../../ai/provider/transport.js';
import { credentialRef, credentialSecret } from '../../ai/provider/credential.js';
import type { CredentialRef } from '../../ai/provider/credential.js';
import type { AiMessage } from '../../ai/provider/request.js';
import type { StructuredOutputRequest } from '../../ai/provider/structured-output.js';
import { createMemorySessionStorage } from '../../browser/ai/session-storage.js';
import type { SessionScopedStorage } from '../../browser/ai/session-storage.js';
import { createSessionCredentialStore } from '../../browser/ai/session-credential-store.js';
import type { SessionCredentialStore } from '../../browser/ai/session-credential-store.js';

/** A reserved-TLD host. It cannot resolve, and no real provider uses it. */
export const FIXTURE_PROXY_HOST = 'llm-gateway.registry-fixture.test';
export const FIXTURE_PROXY_PATH_PREFIX = '/v1/chat/completions';
export const FIXTURE_PROXY_ENDPOINT = `https://${FIXTURE_PROXY_HOST}${FIXTURE_PROXY_PATH_PREFIX}`;

export const BROWSER_DIRECT_PROVIDER_ID: ProviderId = providerId('fixture-browser-direct');
export const PROXY_PROVIDER_ID: ProviderId = providerId('fixture-thin-proxy');

export const FIXTURE_BASE_URL = 'https://browser-direct.registry-fixture.test/v1/chat/completions';

/** A value shaped like a provider key. Never a real one - used to prove it cannot leak. */
export const SENTINEL_SECRET = 'sk-fixture-NOT-A-REAL-KEY-0000000000';

export const NOT_A_REAL_LLM_OUTPUT = 'NOT_A_REAL_LLM_OUTPUT';

export const FIXTURE_MESSAGES: readonly AiMessage[] = [{ role: 'user', content: 'fixture request body' }];

export const FIXTURE_STRUCTURED_OUTPUT: StructuredOutputRequest = {
  schema_id: 'fixture-schema-v1',
  json_schema: {
    type: 'object',
    required: ['label'],
    properties: { label: { type: 'string' } },
  },
  preferred_mode: 'native_schema',
};

export function browserDirectConfig(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
  return {
    provider_id: BROWSER_DIRECT_PROVIDER_ID,
    display_name: 'Fixture browser-direct provider',
    model: 'fixture-model-browser',
    base_url: FIXTURE_BASE_URL,
    base_url_source: 'user_custom',
    capability: { structured_output: 'native_schema', browser_direct: true, thin_proxy: false },
    ...overrides,
  };
}

export function proxyConfig(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
  return {
    provider_id: PROXY_PROVIDER_ID,
    display_name: 'Fixture registered proxy provider',
    model: 'fixture-model-proxy',
    base_url: null,
    base_url_source: 'registered_fixed',
    capability: { structured_output: 'native_schema', browser_direct: false, thin_proxy: true },
    ...overrides,
  };
}

export function proxyRegistration(overrides: Partial<ProviderRegistration> = {}): ProviderRegistration {
  return {
    config: proxyConfig(),
    capability: { structured_output: 'native_schema', browser_direct: false, thin_proxy: true },
    proxy_endpoint: {
      scheme: 'https',
      host: FIXTURE_PROXY_HOST,
      port: null,
      path_prefix: FIXTURE_PROXY_PATH_PREFIX,
    },
    ...overrides,
  };
}

export function registryFixture(): ProviderRegistry {
  return createProviderRegistry([proxyRegistration()]);
}

/** The minimal valid proxy request document. */
export function proxyRequestDocument(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    provider_id: PROXY_PROVIDER_ID as unknown as string,
    request_id: 'req-fixture-0001',
    model: 'fixture-model-proxy',
    messages: FIXTURE_MESSAGES,
    structured_output: null,
    ...overrides,
  };
}

export interface MockTransportCall {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface MockTransport extends HttpTransport {
  readonly calls: readonly MockTransportCall[];
}

function recorder(): { calls: MockTransportCall[]; record: (request: HttpRequestDescriptor) => void } {
  const calls: MockTransportCall[] = [];
  return {
    calls,
    record: (request) => {
      calls.push({ url: request.url, headers: request.headers, body: request.body });
    },
  };
}

/** A transport that answers with a fixed response. Every call is recorded for inspection. */
export function createMockTransport(
  respond: (call: MockTransportCall) => HttpResponseDescriptor,
): MockTransport {
  const { calls, record } = recorder();
  return {
    kind: 'mock',
    calls,
    async send(request: HttpRequestDescriptor): Promise<HttpResponseDescriptor> {
      const call: MockTransportCall = { url: request.url, headers: request.headers, body: request.body };
      record(request);
      return respond(call);
    },
  };
}

/** A transport that always fails. 🔴 Calls are still recorded, so "no second attempt" is testable. */
export function createFailingTransport(kind: TransportFailureKind): MockTransport {
  const { calls, record } = recorder();
  return {
    kind: 'mock-failing',
    calls,
    async send(request: HttpRequestDescriptor): Promise<HttpResponseDescriptor> {
      record(request);
      throw new TransportFailure(
        kind,
        kind === 'timeout'
          ? 'The provider request timed out.'
          : kind === 'cors'
            ? 'The browser refused the cross-origin provider request.'
            : 'The provider endpoint could not be reached.',
      );
    },
  };
}

export function okResponse(body_text: string): HttpResponseDescriptor {
  return { status: 200, location: null, body_text };
}

/** A response envelope shaped like a common provider reply, containing only a fixture marker. */
export function providerShapedBody(): string {
  return JSON.stringify({ choices: [{ message: { content: NOT_A_REAL_LLM_OUTPUT } }] });
}

/* ------------------------------------------------------------------ *
 * Credential fixtures (M13)
 * ------------------------------------------------------------------ */

export const FIXTURE_CREDENTIAL_REF: CredentialRef = credentialRef('provider:fixture-thin-proxy');

export interface SessionFixture {
  readonly storage: SessionScopedStorage;
  readonly store: SessionCredentialStore;
}

export function sessionFixture(): SessionFixture {
  const storage = createMemorySessionStorage();
  return { storage, store: createSessionCredentialStore(storage) };
}

/** A `sessionStorage`-shaped carrier exposing its full contents, so leaks are detectable. */
export interface InspectableSessionStorage extends SessionScopedStorage {
  entries(): Readonly<Record<string, string>>;
}

export function inspectableSessionStorage(): InspectableSessionStorage {
  const entries = new Map<string, string>();
  return {
    kind: 'inspectable-session-storage',
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
    entries: () => Object.fromEntries(entries),
  };
}

/** A stand-in for a forbidden carrier that records any attempt to use it. */
export interface CarrierSpy {
  readonly kind: string;
  readonly touched: readonly string[];
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function carrierSpy(kind: string): CarrierSpy {
  const touched: string[] = [];
  return {
    kind,
    touched,
    getItem: (key) => {
      touched.push(`getItem:${key}`);
      return null;
    },
    setItem: (key) => {
      touched.push(`setItem:${key}`);
    },
    removeItem: (key) => {
      touched.push(`removeItem:${key}`);
    },
  };
}

export { credentialRef, credentialSecret };
