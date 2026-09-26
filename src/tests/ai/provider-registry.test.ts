/**
 * S01-04 ｜ Registered-provider boundary: the registry is the only source of a proxy target.
 *
 * Canonical AC references used by this file: AC-146 / AC-147 / AC-150 / AC-132.
 * 🔴 No new AC; every reference stays inside the existing `AC-01`–`AC-162` range.
 *
 * IMPLEMENTATION INVARIANT: the registry holds NO adapter instance (identity + endpoint only),
 * which is what keeps `M10` free of `M11` / `M12` imports and keeps composition in `M15`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ProviderRegistryError } from '../../ai/provider/registry.js';
import type { ProviderRegistration } from '../../ai/provider/registry.js';
import { createProviderRegistry } from '../../server/proxy/registry.js';
import { providerId } from '../../ai/provider/ids.js';
import {
  FIXTURE_PROXY_HOST,
  PROXY_PROVIDER_ID,
  browserDirectConfig,
  proxyConfig,
  proxyRegistration,
  registryFixture,
} from './fixtures.js';

function violationCodesOf(registrations: readonly ProviderRegistration[]): readonly string[] {
  try {
    createProviderRegistry(registrations);
  } catch (error) {
    assert.ok(error instanceof ProviderRegistryError, 'the registry must reject invalid registrations');
    return error.violations.map((violation) => violation.code);
  }
  return [];
}

describe('S01-04 M10｜Registered provider boundary', () => {
  it('AC-146: the proxy target is resolved from provider_id through the server registry, never from a request', () => {
    const registry = registryFixture();
    assert.deepEqual([...registry.provider_ids], [PROXY_PROVIDER_ID]);
    const registration = registry.get(PROXY_PROVIDER_ID);
    assert.ok(registration !== null);
    assert.equal(registration?.proxy_endpoint?.host, FIXTURE_PROXY_HOST);
    // 🔴 The allowlist is DERIVED from the registry. There is no parameter, and no request field,
    //    through which an entry could be added.
    assert.deepEqual(
      registry.target_allowlist().map((target) => target.host),
      [FIXTURE_PROXY_HOST],
    );
  });

  it('AC-146: an unregistered provider has no entry, so it cannot reach any host', () => {
    const registry = registryFixture();
    assert.equal(registry.get(providerId('never-registered')), null);
    assert.equal(registry.has(providerId('never-registered')), false);
  });

  it('AC-147: a user-supplied base_url is refused the thin-proxy capability by configuration', () => {
    const codes = violationCodesOf([
      proxyRegistration({
        config: proxyConfig({ base_url_source: 'user_custom', base_url: 'https://user-endpoint.registry-fixture.test/v1' }),
      }),
    ]);
    assert.deepEqual(codes, ['INVALID_CONFIGURATION']);
    const detail = (() => {
      try {
        createProviderRegistry([
          proxyRegistration({
            config: proxyConfig({
              base_url_source: 'user_custom',
              base_url: 'https://user-endpoint.registry-fixture.test/v1',
            }),
          }),
        ]);
        return '';
      } catch (error) {
        return error instanceof ProviderRegistryError
          ? (error.violations[0]?.detail ?? '')
          : '';
      }
    })();
    assert.match(detail, /USER_CUSTOM_BASE_URL_MUST_BE_BROWSER_DIRECT_ONLY/);
  });

  it('AC-147: a custom base_url without a browser-direct capability has no reachable path at all', () => {
    const codes = violationCodesOf([
      proxyRegistration({
        config: proxyConfig({
          base_url_source: 'user_custom',
          base_url: 'https://user-endpoint.registry-fixture.test/v1',
          capability: { structured_output: 'none', browser_direct: false, thin_proxy: false },
        }),
        capability: { structured_output: 'none', browser_direct: false, thin_proxy: false },
        proxy_endpoint: null,
      }),
    ]);
    assert.ok(codes.includes('INVALID_CONFIGURATION'), `expected INVALID_CONFIGURATION, got ${codes.join(', ')}`);
  });

  it('AC-150: a browser-direct-only provider must not declare a proxy endpoint', () => {
    const codes = violationCodesOf([
      {
        config: browserDirectConfig(),
        capability: { structured_output: 'none', browser_direct: true, thin_proxy: false },
        proxy_endpoint: { scheme: 'https', host: FIXTURE_PROXY_HOST, port: null, path_prefix: '/v1' },
      },
    ]);
    assert.deepEqual(codes, ['PROXY_ENDPOINT_UNEXPECTED']);
  });

  it('IMPLEMENTATION INVARIANT: a proxy-capable provider must declare its fixed endpoint', () => {
    const codes = violationCodesOf([
      proxyRegistration({ proxy_endpoint: null, capability: { structured_output: 'none', browser_direct: false, thin_proxy: true } }),
    ]);
    assert.deepEqual(codes, ['PROXY_ENDPOINT_REQUIRED']);
  });

  it('IMPLEMENTATION INVARIANT (AC-151): a private or loopback endpoint is refused at registration time', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]', '10.1.2.3', '192.168.1.10', '169.254.169.254']) {
      const codes = violationCodesOf([
        proxyRegistration({
          proxy_endpoint: { scheme: 'https', host, port: null, path_prefix: '/v1' },
        }),
      ]);
      assert.deepEqual(codes, ['PROXY_ENDPOINT_BLOCKED_HOST'], `host "${host}" must be refused`);
    }
  });

  it('IMPLEMENTATION INVARIANT: duplicate provider ids and non-absolute path prefixes are refused', () => {
    assert.deepEqual(violationCodesOf([proxyRegistration(), proxyRegistration()]), ['DUPLICATE_PROVIDER_ID']);
    assert.deepEqual(
      violationCodesOf([
        proxyRegistration({ proxy_endpoint: { scheme: 'https', host: FIXTURE_PROXY_HOST, port: null, path_prefix: 'v1' } }),
      ]),
      ['PROXY_ENDPOINT_INVALID_PATH_PREFIX'],
    );
  });

  it('IMPLEMENTATION INVARIANT: the registry stores identity and endpoint only - never an adapter instance', () => {
    const registration = proxyRegistration();
    for (const value of Object.values(registration)) {
      assert.notEqual(typeof value, 'function', 'the registry must not carry executable adapters');
    }
    assert.ok(!('execute' in registration), 'the registry must not expose an adapter');
    assert.equal(registration.config.provider_id, PROXY_PROVIDER_ID);
  });
});
