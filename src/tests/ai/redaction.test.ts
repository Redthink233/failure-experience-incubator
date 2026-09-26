/**
 * S01-04 ｜ Log redaction and the credential-log red line.
 *
 * Canonical AC references used by this file: AC-133 / AC-134 / AC-158.
 * 🔴 No new AC; every reference stays inside the existing `AC-01`–`AC-162` range.
 *
 * IMPLEMENTATION INVARIANT: every error message is drawn from a fixed table with no interpolation,
 * so an error can never carry a URL, a header, a request body or a credential fragment. The
 * redaction helpers below are the SECOND layer of that guarantee, not the only one.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { REDACTED, credentialSecret } from '../../ai/provider/credential.js';
import {
  aiError,
  aiErrorToLogRecord,
  aiFailed,
  aiOk,
  aiResultToLogRecord,
  redactForLog,
} from '../../ai/provider/result.js';
import type { AiErrorCode } from '../../ai/provider/result.js';
import { SENTINEL_SECRET } from './fixtures.js';

const ALL_CODES: readonly AiErrorCode[] = [
  'PROVIDER_CONNECTION_UNSUPPORTED',
  'PROVIDER_CREDENTIAL_MISSING',
  'PROVIDER_REQUEST_INVALID',
  'PROVIDER_NETWORK_UNREACHABLE',
  'PROVIDER_CORS_BLOCKED',
  'PROVIDER_TIMEOUT',
  'PROVIDER_HTTP_ERROR',
  'PROVIDER_RESPONSE_NOT_JSON',
  'PROVIDER_SCHEMA_INVALID',
  'PROXY_REQUEST_REJECTED',
  'PROXY_TARGET_BLOCKED',
  'PROXY_REDIRECT_NOT_FOLLOWED',
  'INTERNAL_UNEXPECTED',
];

describe('S01-04 M10｜Credential log red line', () => {
  it('AC-158: an authorization header, an api key and a token are redacted at any depth', () => {
    const record = redactForLog({
      request_id: 'req-1',
      headers: { authorization: `Bearer ${SENTINEL_SECRET}`, 'content-type': 'application/json' },
      'api_key': SENTINEL_SECRET,
      apiKey: SENTINEL_SECRET,
      nested: { deeper: { access_token: SENTINEL_SECRET, password: 'hunter2' } },
    });
    const serialised = JSON.stringify(record);
    assert.ok(!serialised.includes(SENTINEL_SECRET), 'the sentinel key must not survive redaction');
    assert.ok(!serialised.includes('hunter2'));
    assert.ok(serialised.includes(REDACTED));
    assert.ok(serialised.includes('application/json'), 'non-sensitive values must survive');
    assert.ok(serialised.includes('req-1'));
  });

  it('AC-158: a secret-shaped value is redacted even under an innocent key name', () => {
    const record = redactForLog({
      note: `the header was Bearer ${SENTINEL_SECRET}`,
      innocent_field: 'sk-fixture-000000000000000000',
      plain: 'nothing sensitive here',
    });
    const serialised = JSON.stringify(record);
    assert.ok(!serialised.includes(SENTINEL_SECRET));
    assert.ok(!serialised.includes('sk-fixture-000000000000000000'));
    assert.ok(serialised.includes('nothing sensitive here'));
  });

  it('AC-158: every error message comes from a fixed table and carries no interpolated value', () => {
    for (const code of ALL_CODES) {
      const error = aiError(code, 'internal', { http_status: 500, target_block_reason: 'link_local' });
      assert.ok(error.message.length > 0, `${code} must have wording`);
      assert.ok(!error.message.includes('http'), `${code} must not embed a URL`);
      assert.ok(!error.message.includes(SENTINEL_SECRET));
      const record = aiErrorToLogRecord(error);
      assert.deepEqual(Object.keys(record).sort(), [
        'code',
        'failure_kind',
        'http_status',
        'message',
        'path',
        'retryable',
        'target_block_reason',
      ]);
      assert.ok(!JSON.stringify(record).includes(SENTINEL_SECRET));
    }
  });

  it('AC-158: a serialised error or result can never contain a credential', () => {
    const secret = credentialSecret(SENTINEL_SECRET);
    const failure = aiFailed(aiError('PROVIDER_NETWORK_UNREACHABLE', 'network', { path: 'browser_direct' }));
    for (const serialised of [
      JSON.stringify(failure),
      JSON.stringify(aiResultToLogRecord(failure)),
      JSON.stringify(redactForLog({ failure, secret })),
    ]) {
      assert.ok(!serialised.includes(SENTINEL_SECRET), 'a credential must never reach any serialised form');
    }
    const ok = aiOk('NOT_A_REAL_LLM_OUTPUT', 200, { label: 'fixture' });
    const okRecord = aiResultToLogRecord(ok);
    assert.equal(okRecord['kind'], 'ok');
    assert.equal(
      Object.keys(okRecord).includes('text'),
      false,
      'an ok record must summarise the payload rather than echo it',
    );
  });

  it('AC-133 / AC-134: the credential primitive itself cannot be serialised into a bundle or a file', () => {
    const secret = credentialSecret(SENTINEL_SECRET);
    assert.equal(JSON.stringify(secret), '{}');
    assert.equal(Object.keys(secret).length, 0);
    assert.equal(`${secret}`, '[object Object]');
    const asRecord: Readonly<Record<string, unknown>> = { payload: secret };
    assert.equal(JSON.stringify(asRecord), '{"payload":{}}');
  });

  it('IMPLEMENTATION INVARIANT: a cyclic or oversized log value degrades safely instead of throwing', () => {
    const cyclic: Record<string, unknown> = { name: 'root' };
    cyclic['self'] = cyclic;
    const record = redactForLog(cyclic) as Readonly<Record<string, unknown>>;
    assert.equal(record['name'], 'root');
    assert.notEqual(record['self'], undefined);
    const long = redactForLog({ note: 'x'.repeat(4000) }) as Readonly<Record<string, unknown>>;
    assert.equal(typeof long['note'], 'string');
    assert.ok((long['note'] as string).length < 4000);
  });
});
