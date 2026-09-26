/**
 * S01-04 ｜ Target policy / SSRF guard and redirect handling (T10–T20).
 *
 * Canonical AC references used by this file: AC-146 / AC-147 / AC-151.
 * 🔴 No new AC; every reference stays inside the existing `AC-01`–`AC-162` range.
 *
 * ── HOW THESE CASES ARE CONSTRUCTED ────────────────────────────────────────────────
 * For every refused destination the host is ALSO placed in the allowlist. If the literal/range rule
 * did not fire, `evaluateTarget` would return `allowed` - so each case proves the guard rejects the
 * target on its own, and not merely because it was missing from the allowlist. That is the
 * "🔴 不得「黑名单 + 默认放行」" clause made mechanically checkable in both directions:
 *   · an allowlisted private / loopback / link-local host  ⇒ still refused;
 *   · a public host that is NOT allowlisted                ⇒ refused (default deny).
 *
 * 🔴 WHAT THIS IS NOT: a network experiment. No DNS is resolved and no request is issued, so this
 *    suite must never be reported as "SSRF 实测通过" (`SP-06` is `HISTORICAL`; deployment-time
 *    verification belongs to the `PSA-*` pre-submission checklist).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyHostLiteral,
  evaluateRedirect,
  evaluateTarget,
} from '../../server/proxy/target-policy.js';
import type { AllowedTarget, TargetBlockReason } from '../../server/proxy/target-policy.js';
import { authorizeProxyCall, classifyProviderResponse } from '../../server/proxy/authorize.js';
import {
  FIXTURE_PROXY_ENDPOINT,
  FIXTURE_PROXY_HOST,
  proxyRequestDocument,
  registryFixture,
} from '../ai/fixtures.js';

const LIMITS = { timeout_ms: 1000, max_body_bytes: 64 * 1024 };

function allowlistOf(hosts: readonly string[], port: number | null = null): readonly AllowedTarget[] {
  return hosts.map((host) => ({ scheme: 'https', host, port }));
}

/** Asserts the target is refused for the expected reason even though the host is allowlisted. */
function assertBlocked(url: string, reason: TargetBlockReason, extra_hosts: readonly string[] = []): void {
  const host = new URL(url).hostname;
  const allowlist = allowlistOf([host, ...extra_hosts].map((entry) => entry.replace(/^\[|\]$/g, '')));
  const verdict = evaluateTarget(url, allowlist);
  assert.equal(verdict.kind, 'blocked', `${url} must be refused`);
  if (verdict.kind === 'blocked') {
    assert.equal(verdict.reason, reason, `${url} must be refused as "${reason}"`);
  }
}

describe('S01-04 M12｜Target policy and SSRF guard', () => {
  it('AC-151 (T10): localhost and loopback-style host names are refused', () => {
    assertBlocked('https://localhost/v1', 'loopback_name');
    assertBlocked('https://api.localhost/v1', 'loopback_name');
    assertBlocked('https://service.internal/v1', 'loopback_name');
    assertBlocked('https://printer.local/v1', 'loopback_name');
    assertBlocked('https://box.home.arpa/v1', 'loopback_name');
  });

  it('AC-151 (T11): every 127.0.0.0/8 form is refused, including decimal / hex / octal spellings', () => {
    for (const url of [
      'https://127.0.0.1/v1',
      'https://127.9.9.9/v1',
      'https://127.255.255.254/v1',
      'https://2130706433/v1',
      'https://0x7f.1/v1',
      'https://0177.0.0.1/v1',
    ]) {
      assertBlocked(url, 'ipv4_loopback');
    }
  });

  it('AC-151 (T12): ::1 is refused, in short, long and IPv4-mapped form', () => {
    assertBlocked('https://[::1]/v1', 'ipv6_loopback');
    assertBlocked('https://[0:0:0:0:0:0:0:1]/v1', 'ipv6_loopback');
    assertBlocked('https://[::ffff:127.0.0.1]/v1', 'ipv4_loopback');
    assertBlocked('https://[::]/v1', 'unspecified_address');
  });

  it('AC-151 (T13): RFC1918 10.0.0.0/8 is refused', () => {
    assertBlocked('https://10.0.0.5/v1', 'rfc1918_10');
    assertBlocked('https://10.255.255.255/v1', 'rfc1918_10');
  });

  it('AC-151 (T14): RFC1918 172.16.0.0/12 is refused, and its bounds are exact', () => {
    assertBlocked('https://172.16.0.1/v1', 'rfc1918_172');
    assertBlocked('https://172.31.255.254/v1', 'rfc1918_172');
    // Just outside the /12: these are ordinary public addresses, not a private range.
    for (const url of ['https://172.15.0.1/v1', 'https://172.32.0.1/v1']) {
      const verdict = evaluateTarget(url, allowlistOf(['172.15.0.1', '172.32.0.1']));
      assert.equal(verdict.kind, 'allowed', `${url} is outside 172.16/12`);
    }
  });

  it('AC-151 (T15): RFC1918 192.168.0.0/16 is refused', () => {
    assertBlocked('https://192.168.0.1/v1', 'rfc1918_192');
    assertBlocked('https://192.168.255.255/v1', 'rfc1918_192');
  });

  it('AC-151 (T16): link-local 169.254.0.0/16 and metadata endpoints are refused', () => {
    assertBlocked('https://169.254.0.1/v1', 'link_local');
    assertBlocked('https://169.254.169.254/latest/meta-data/', 'link_local');
    assertBlocked('https://metadata.google.internal/computeMetadata/v1/', 'metadata_endpoint');
    assertBlocked('https://instance-data/latest/', 'metadata_endpoint');
    assertBlocked('https://[fe80::1]/v1', 'ipv6_link_local');
    assertBlocked('https://[fc00::1]/v1', 'ipv6_unique_local');
  });

  it('AC-151 (T17): a non-http(s) scheme or a userinfo URL is refused', () => {
    for (const url of [
      'file:///etc/passwd',
      'ftp://fixture.registry-fixture.test/x',
      'ws://fixture.registry-fixture.test/x',
      'gopher://fixture.registry-fixture.test/x',
      'data:text/plain,hello',
    ]) {
      const verdict = evaluateTarget(url, allowlistOf([FIXTURE_PROXY_HOST]));
      assert.equal(verdict.kind, 'blocked', `${url} must be refused`);
      if (verdict.kind === 'blocked') {
        assert.equal(verdict.reason, 'scheme_not_http_or_https');
      }
    }
    const withUserinfo = evaluateTarget(
      `https://user:pass@${FIXTURE_PROXY_HOST}/v1`,
      allowlistOf([FIXTURE_PROXY_HOST]),
    );
    assert.equal(withUserinfo.kind, 'blocked');
    if (withUserinfo.kind === 'blocked') {
      assert.equal(withUserinfo.reason, 'userinfo_present');
    }
  });

  it('AC-151: reserved and special-purpose IPv4 ranges are refused too', () => {
    assertBlocked('https://0.0.0.0/v1', 'unspecified_address');
    assertBlocked('https://100.64.0.1/v1', 'reserved_or_special');
    assertBlocked('https://224.0.0.1/v1', 'reserved_or_special');
    assertBlocked('https://255.255.255.255/v1', 'reserved_or_special');
    assertBlocked('https://203.0.113.7/v1', 'reserved_or_special');
  });

  it('AC-151 / AC-147: an unlisted public host is refused - the default is deny, not allow', () => {
    const verdict = evaluateTarget('https://totally-unlisted.registry-fixture.test/v1', allowlistOf([]));
    assert.equal(verdict.kind, 'blocked');
    if (verdict.kind === 'blocked') {
      assert.equal(verdict.reason, 'host_not_allowlisted');
    }
    // Plaintext is refused even for an allowlisted host, so `https` is a requirement and not a default.
    const plaintext = evaluateTarget(`http://${FIXTURE_PROXY_HOST}/v1`, allowlistOf([FIXTURE_PROXY_HOST]));
    assert.equal(plaintext.kind, 'blocked');
    if (plaintext.kind === 'blocked') {
      assert.equal(plaintext.reason, 'https_required');
    }
    // A non-default port must be registered explicitly.
    const wrongPort = evaluateTarget(`${FIXTURE_PROXY_ENDPOINT.replace('/v1/chat/completions', '')}:9443/v1`, allowlistOf([FIXTURE_PROXY_HOST]));
    assert.equal(wrongPort.kind, 'blocked');
    if (wrongPort.kind === 'blocked') {
      assert.equal(wrongPort.reason, 'port_not_allowed');
    }
    const registeredPort = evaluateTarget(
      `https://${FIXTURE_PROXY_HOST}:8443/v1`,
      allowlistOf([FIXTURE_PROXY_HOST], 8443),
    );
    assert.equal(registeredPort.kind, 'allowed');
  });

  it('AC-146 (T19): a registered provider resolves to its fixed, server-controlled endpoint', () => {
    const authorization = authorizeProxyCall(proxyRequestDocument(), registryFixture(), LIMITS);
    assert.equal(authorization.kind, 'granted');
    if (authorization.kind === 'granted') {
      assert.equal(authorization.resolved_host, FIXTURE_PROXY_HOST);
      assert.equal(authorization.outbound.url, FIXTURE_PROXY_ENDPOINT);
      assert.ok(!('authorization' in authorization.outbound.headers));
    }
    assert.equal(classifyHostLiteral(FIXTURE_PROXY_HOST), null);
  });

  it('AC-151 (T20): a redirect is never followed, and one leaving the allowlist is named as such', () => {
    const allowlist = allowlistOf([FIXTURE_PROXY_HOST]);

    const escape = evaluateRedirect('https://evil.example/takeover', allowlist, FIXTURE_PROXY_ENDPOINT);
    assert.equal(escape.kind, 'outside_allowlist');
    if (escape.kind === 'outside_allowlist') {
      assert.equal(escape.reason, 'host_not_allowlisted');
    }

    const inside = evaluateRedirect('/v1/other', allowlist, FIXTURE_PROXY_ENDPOINT);
    assert.equal(inside.kind, 'inside_allowlist');

    const escapeToLoopback = evaluateRedirect('https://127.0.0.1/x', allowlist, FIXTURE_PROXY_ENDPOINT);
    assert.equal(escapeToLoopback.kind, 'outside_allowlist');
    if (escapeToLoopback.kind === 'outside_allowlist') {
      assert.equal(escapeToLoopback.reason, 'ipv4_loopback');
    }

    for (const location of ['https://evil.example/x', '/v1/other', null]) {
      const verdict = classifyProviderResponse('thin_proxy', 302, location, '', FIXTURE_PROXY_ENDPOINT, allowlist);
      assert.equal(verdict.kind, 'redirect_not_followed', 'a redirect must never be followed');
      if (verdict.kind === 'redirect_not_followed') {
        assert.equal(verdict.error.code, 'PROXY_REDIRECT_NOT_FOLLOWED');
        assert.equal(verdict.error.retryable, false);
      }
    }

    // A browser answers an opaque redirect with status 0; it must not be mistaken for success.
    const opaque = classifyProviderResponse('browser_direct', 0, null, '', FIXTURE_PROXY_ENDPOINT, allowlist);
    assert.equal(opaque.kind, 'redirect_not_followed');
  });

  it('IMPLEMENTATION INVARIANT: target refusals expose a reason code and never a client value', () => {
    const authorization = authorizeProxyCall(
      proxyRequestDocument({ target_url: 'https://evil.example/steal' }),
      registryFixture(),
      LIMITS,
    );
    assert.equal(authorization.kind, 'denied');
    assert.ok(!JSON.stringify(authorization).includes('evil.example'));
    if (authorization.kind === 'denied') {
      assert.equal(authorization.error.code, 'PROXY_REQUEST_REJECTED');
      assert.ok(authorization.error.retryable === false);
    }
    // A blocked TARGET (rather than a blocked request) is reported as its own error code.
    const blocked = classifyProviderResponse('thin_proxy', 302, 'https://10.0.0.1/x', '', FIXTURE_PROXY_ENDPOINT, allowlistOf([FIXTURE_PROXY_HOST]));
    assert.equal(blocked.kind, 'redirect_not_followed');
    if (blocked.kind === 'redirect_not_followed') {
      assert.equal(blocked.error.target_block_reason, 'rfc1918_10');
    }
  });

  it('IMPLEMENTATION INVARIANT: the guard classifies host literals without any network access', () => {
    assert.equal(classifyHostLiteral('registry-fixture.test'), null);
    assert.equal(classifyHostLiteral('[::1]'), 'ipv6_loopback');
    assert.equal(classifyHostLiteral('LOCALHOST'), 'loopback_name');
    assert.equal(classifyHostLiteral(''), 'empty_host');
  });
});
