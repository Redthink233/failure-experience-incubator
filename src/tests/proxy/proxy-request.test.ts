/**
 * S01-04 ｜ `ProxyRequest` shape and strict validation (T9).
 *
 * Canonical AC references used by this file: AC-146 / AC-148 / AC-150.
 * 🔴 No new AC; every reference stays inside the existing `AC-01`–`AC-162` range.
 *
 * IMPLEMENTATION INVARIANT (T9): `ProxyRequest` structurally contains NO destination field. The
 * compile-time assertions below are the durable form of that claim; the runtime cases prove that a
 * document which nevertheless carries one is REJECTED rather than ignored in silence.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FORBIDDEN_TARGET_FIELDS,
  PROXY_REQUEST_KEYS,
  parseProxyRequest,
} from '../../server/proxy/proxy-request.js';
import type { ProxyRequest } from '../../server/proxy/proxy-request.js';
import { authorizeProxyCall } from '../../server/proxy/authorize.js';
import { providerId } from '../../ai/provider/ids.js';
import { createProviderRegistry } from '../../server/proxy/registry.js';
import type { AssertTrue, HasNoKey } from '../domain/type-assertions.js';
import {
  FIXTURE_PROXY_ENDPOINT,
  FIXTURE_PROXY_HOST,
  PROXY_PROVIDER_ID,
  browserDirectConfig,
  proxyRegistration,
  proxyRequestDocument,
  registryFixture,
} from '../ai/fixtures.js';

/* ------------------------------------------------------------------ *
 * Compile-time assertions
 * ------------------------------------------------------------------ */

export type ProxyRequestTypeAssertions = [
  /** 🔴 The dangerous names from `D-055` / AC-148, asserted at the TYPE level. */
  AssertTrue<HasNoKey<ProxyRequest, 'target_url'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'base_url'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'host'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'hostname'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'scheme'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'protocol'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'port'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'url'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'uri'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'endpoint'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'origin'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'authority'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'upstream'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'destination'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'redirect_url'>>,
  /** 🔴 A credential is never part of the request document (contract §0.4 D / AC-157). */
  AssertTrue<HasNoKey<ProxyRequest, 'credential'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'api_key'>>,
  AssertTrue<HasNoKey<ProxyRequest, 'authorization'>>,
];

const LIMITS = { timeout_ms: 1000, max_body_bytes: 64 * 1024 };

const EVIL_TARGET = 'https://evil.example/steal';

describe('S01-04 M12｜ProxyRequest strict validation', () => {
  it('AC-148: a document that carries any known destination field is rejected, and its value is never echoed', () => {
    assert.ok(FORBIDDEN_TARGET_FIELDS.length >= 19, 'the forbidden list must stay comprehensive');
    for (const field of FORBIDDEN_TARGET_FIELDS) {
      const result = parseProxyRequest(proxyRequestDocument({ [field]: EVIL_TARGET }));
      assert.equal(result.kind, 'rejected', `"${field}" must be rejected`);
      if (result.kind === 'rejected') {
        assert.equal(result.reason, 'forbidden_target_field', `"${field}" needs the security reason`);
        assert.deepEqual([...result.offending_fields], [field]);
      }
      assert.ok(
        !JSON.stringify(result).includes('evil.example'),
        'a rejection must echo the field NAME only - never the value (AC-158)',
      );
    }
  });

  it('AC-146: an unrecognised field is rejected rather than silently ignored', () => {
    const result = parseProxyRequest(proxyRequestDocument({ extra_context: 'x' }));
    assert.equal(result.kind, 'rejected');
    if (result.kind === 'rejected') {
      assert.equal(result.reason, 'unknown_field');
      assert.deepEqual([...result.offending_fields], ['extra_context']);
    }
  });

  it('AC-146: a provider id can never be a URL, a host or a path', () => {
    // 🔴 URL *syntax* is refused outright, so an id can never be parsed as a destination.
    for (const hostile of [
      'https://evil.example',
      'evil.example/path',
      'a:b',
      'a b',
      'user@host',
      'x?y=1',
      'x#frag',
      'x\\y',
      'x'.repeat(65),
    ]) {
      const result = parseProxyRequest(proxyRequestDocument({ provider_id: hostile }));
      assert.equal(result.kind, 'rejected', `"${hostile}" must not be usable as a provider id`);
      if (result.kind === 'rejected') {
        assert.equal(result.reason, 'invalid_provider_id');
      }
    }
    assert.equal(parseProxyRequest(proxyRequestDocument({ provider_id: undefined })).kind, 'rejected');
    assert.deepEqual(parseProxyRequest({}).kind, 'rejected');
    assert.deepEqual(parseProxyRequest('not an object').kind, 'rejected');
    assert.deepEqual(parseProxyRequest(null).kind, 'rejected');
  });

  it('AC-146: a hostname-shaped id is only an identity - it still resolves to no target unless registered', () => {
    // A dotted id is legal (a user may name a provider `vendor.region`), and that is safe by
    // construction: the id is looked up in the SERVER registry, never parsed as a destination.
    const parsed = parseProxyRequest(proxyRequestDocument({ provider_id: 'evil.example' }));
    assert.equal(parsed.kind, 'accepted');

    const authorization = authorizeProxyCall(
      proxyRequestDocument({ provider_id: 'evil.example' }),
      registryFixture(),
      LIMITS,
    );
    assert.equal(authorization.kind, 'denied');
    if (authorization.kind === 'denied') {
      assert.equal(authorization.status, 404);
      assert.equal(authorization.detail, 'unregistered_provider');
    }
  });

  it('AC-146: a well-formed document is accepted and normalised to exactly the closed key set', () => {
    const result = parseProxyRequest(proxyRequestDocument());
    assert.equal(result.kind, 'accepted');
    if (result.kind === 'accepted') {
      assert.equal(result.request.provider_id, PROXY_PROVIDER_ID);
      assert.equal(result.request.request_id, 'req-fixture-0001');
      assert.equal(result.request.structured_output, null);
      assert.deepEqual(Object.keys(result.request).sort(), [...PROXY_REQUEST_KEYS].sort());
    }
  });

  it('AC-148: the accepted key list itself contains no destination-bearing name', () => {
    for (const key of PROXY_REQUEST_KEYS) {
      assert.ok(
        !FORBIDDEN_TARGET_FIELDS.includes(key.toLowerCase()),
        `"${key}" must never appear as an accepted proxy request key`,
      );
    }
  });

  it('AC-146: the outbound host depends only on provider_id, never on the rest of the document', () => {
    const registry = registryFixture();
    const base = proxyRequestDocument();
    const variants: readonly Record<string, unknown>[] = [
      base,
      { ...base, request_id: 'req-fixture-0002' },
      { ...base, model: 'a-different-model' },
      { ...base, messages: [{ role: 'system', content: 'another instruction' }] },
    ];
    for (const variant of variants) {
      const authorization = authorizeProxyCall(variant, registry, LIMITS);
      assert.equal(authorization.kind, 'granted');
      if (authorization.kind === 'granted') {
        assert.equal(authorization.resolved_host, FIXTURE_PROXY_HOST);
        assert.equal(authorization.outbound.url, FIXTURE_PROXY_ENDPOINT);
      }
    }
    // The only value that CAN change the target is the id - and an unknown id has no target at all.
    const unknown = authorizeProxyCall({ ...base, provider_id: providerId('not-registered') }, registry, LIMITS);
    assert.equal(unknown.kind, 'denied');
    if (unknown.kind === 'denied') {
      assert.equal(unknown.status, 404);
      assert.equal(unknown.detail, 'unregistered_provider');
    }
  });

  it('AC-148: a smuggled target is refused by the authorization gate itself, before any lookup', () => {
    const registry = registryFixture();
    for (const field of ['target_url', 'base_url', 'host', 'scheme', 'url', 'endpoint']) {
      const authorization = authorizeProxyCall(proxyRequestDocument({ [field]: EVIL_TARGET }), registry, LIMITS);
      assert.equal(authorization.kind, 'denied', `"${field}" must not be forwarded`);
      if (authorization.kind === 'denied') {
        assert.equal(authorization.status, 400);
        assert.equal(authorization.detail, 'forbidden_target_field');
        assert.ok(!JSON.stringify(authorization).includes('evil.example'));
      }
    }
  });

  it('IMPLEMENTATION INVARIANT: the outbound descriptor carries a fixed header set and no credential', () => {
    const authorization = authorizeProxyCall(proxyRequestDocument(), registryFixture(), LIMITS);
    assert.equal(authorization.kind, 'granted');
    if (authorization.kind === 'granted') {
      assert.deepEqual(Object.keys(authorization.outbound.headers), ['content-type']);
      assert.equal(authorization.outbound.follow_redirects, false);
      assert.ok(!JSON.stringify(authorization.outbound).toLowerCase().includes('authorization'));
    }
  });

  it('AC-150: a registered provider without the proxy capability is refused, not routed elsewhere', () => {
    const registry = createProviderRegistry([
      proxyRegistration(),
      {
        config: browserDirectConfig(),
        capability: { structured_output: 'native_schema', browser_direct: true, thin_proxy: false },
        proxy_endpoint: null,
      },
    ]);
    const denied = authorizeProxyCall(
      proxyRequestDocument({ provider_id: providerId('fixture-browser-direct') }),
      registry,
      LIMITS,
    );
    assert.equal(denied.kind, 'denied');
    if (denied.kind === 'denied') {
      assert.equal(denied.status, 400);
      assert.equal(denied.detail, 'provider_not_proxy_capable');
    }
    // An id that is registered nowhere is simply unknown.
    const unknown = authorizeProxyCall(
      proxyRequestDocument({ provider_id: providerId('fixture-never-registered') }),
      registry,
      LIMITS,
    );
    assert.equal(unknown.kind, 'denied');
    if (unknown.kind === 'denied') {
      assert.equal(unknown.detail, 'unregistered_provider');
    }
  });
});
