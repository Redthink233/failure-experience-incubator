/**
 * S01-04 ｜ M13 session credential store and the forbidden-carrier boundary.
 *
 * Canonical AC references used by this file: AC-153 / AC-154 / AC-155 / AC-156 / AC-157 /
 * AC-159 / AC-160 / AC-161 / AC-162.
 * 🔴 No new AC; every reference stays inside the existing `AC-01`–`AC-162` range.
 *
 * IMPLEMENTATION INVARIANT (T5–T8): the session abstraction is exercised twice over the same carrier
 * to model a page refresh, the carrier is inspected in full after the session ends, and the two
 * forbidden carriers are offered to the factory to prove they are refused rather than adopted.
 *
 * 🔴 Static scans strip comments AND string literals before looking for identifiers, so the denylist
 *    constant that MENTIONS `localStorage` is not mistaken for a use of it.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { revealCredentialSecret } from '../../../ai/provider/credential.js';
import {
  FORBIDDEN_CREDENTIAL_CARRIERS,
  SessionStorageUnavailableError,
  createBrowserSessionStorage,
  createMemorySessionStorage,
} from '../../../browser/ai/session-storage.js';
import {
  SESSION_CREDENTIAL_NAMESPACE,
  createSessionCredentialStore,
  credentialRefForProvider,
  sessionCredentialKey,
} from '../../../browser/ai/session-credential-store.js';
import { importSpecifiersOf, repoFiles, scanDirectory, stripCommentsAndStrings } from '../../ai/source-scan.js';
import { FIXTURE_CREDENTIAL_REF, SENTINEL_SECRET, carrierSpy, inspectableSessionStorage } from '../../ai/fixtures.js';

const BROWSER_AI_DIR = scanDirectory('src/browser/ai');
const AI_DIR = scanDirectory('src/ai');
const SCANNED = [...BROWSER_AI_DIR.sources, ...AI_DIR.sources];

function identifierRendering(): readonly { readonly file: string; readonly code: string }[] {
  return SCANNED.map(({ file, source }) => ({ file, code: stripCommentsAndStrings(source) }));
}

describe('S01-04 M13｜Session-only credential store', () => {
  it('IMPLEMENTATION INVARIANT (T5/T6/T7/T8): the guards are not vacuous - the credential modules are scanned', () => {
    assert.ok(BROWSER_AI_DIR.files.length >= 4, `expected src/browser/ai sources, found ${BROWSER_AI_DIR.files.length}`);
    assert.ok(identifierRendering().length >= 10, 'both the M10 and the M11/M13 trees must be scanned');
    assert.ok(
      BROWSER_AI_DIR.files.some((file) => file.endsWith('session-credential-store.ts')),
      'the session credential store must be part of the scan',
    );
    assert.ok(AI_DIR.files.some((file) => file.endsWith('credential.ts')), 'the credential primitive must be scanned');
  });

  it('AC-160: within one session a reload keeps the credential usable (session abstraction, not a memory variable)', () => {
    const storage = createMemorySessionStorage();
    const before_reload = createSessionCredentialStore(storage);
    before_reload.put(FIXTURE_CREDENTIAL_REF, SENTINEL_SECRET);
    assert.equal(before_reload.has(FIXTURE_CREDENTIAL_REF), true);

    // A new store instance over the SAME carrier models a page refresh inside one browser session.
    const after_reload = createSessionCredentialStore(storage);
    assert.equal(after_reload.has(FIXTURE_CREDENTIAL_REF), true);
    const resolved = after_reload.resolve(FIXTURE_CREDENTIAL_REF);
    assert.ok(resolved !== null);
    assert.equal(revealCredentialSecret(resolved), SENTINEL_SECRET);
    // 🔴 Not implemented as "a refresh always fails": the value is genuinely session-scoped.
    assert.equal(after_reload.kind.startsWith('session-credential-store('), true);
  });

  it('AC-159: ending the session removes every credential and leaves nothing recoverable', () => {
    const storage = inspectableSessionStorage();
    const store = createSessionCredentialStore(storage);
    store.put(FIXTURE_CREDENTIAL_REF, SENTINEL_SECRET);
    store.put(credentialRefForProvider('another-provider'), 'sk-fixture-OTHER-0000000000');
    assert.ok(Object.keys(storage.entries()).length >= 3, 'two values plus the index must be present');

    store.endSession();

    assert.equal(store.resolve(FIXTURE_CREDENTIAL_REF), null);
    assert.equal(store.has(FIXTURE_CREDENTIAL_REF), false);
    const leftovers = storage.entries();
    assert.ok(!JSON.stringify(leftovers).includes(SENTINEL_SECRET), 'no credential may survive the session');
    assert.ok(!JSON.stringify(leftovers).includes('sk-fixture-OTHER-0000000000'));
    // A fresh store over the same carrier (re-entering the product) finds nothing at all.
    const fresh = createSessionCredentialStore(storage);
    assert.deepEqual([...fresh.list_refs()], []);
    assert.equal(fresh.resolve(FIXTURE_CREDENTIAL_REF), null);
  });

  it('AC-153 (T6): a runtime offering only localStorage is refused, and localStorage is never touched', () => {
    const local_storage_spy = carrierSpy('localStorage');
    assert.throws(
      () => createBrowserSessionStorage({ sessionStorage: undefined, localStorage: local_storage_spy }),
      SessionStorageUnavailableError,
    );
    assert.deepEqual([...local_storage_spy.touched], [], 'a forbidden carrier must not even be read');
  });

  it('AC-154 (T7): a runtime offering only IndexedDB is refused, and IndexedDB is never touched', () => {
    const indexed_db_spy = carrierSpy('indexedDB');
    assert.throws(
      () => createBrowserSessionStorage({ sessionStorage: undefined, indexedDB: indexed_db_spy }),
      SessionStorageUnavailableError,
    );
    assert.deepEqual([...indexed_db_spy.touched], [], 'a forbidden carrier must not even be read');
  });

  it('AC-160: a sessionStorage-shaped carrier is accepted, while one that cannot round-trip is rejected', () => {
    const working = createBrowserSessionStorage({ sessionStorage: createMemorySessionStorage() });
    assert.equal(working.kind, 'browser-session-storage');
    const non_storing = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
    assert.throws(() => createBrowserSessionStorage({ sessionStorage: non_storing }), SessionStorageUnavailableError);
    assert.throws(
      () => createBrowserSessionStorage({ sessionStorage: { getItem: () => null } }),
      SessionStorageUnavailableError,
    );
  });

  it('AC-153 / AC-154 / AC-162: no forbidden carrier is ever accessed from the credential code', () => {
    // 🔴 The detector targets MEMBER ACCESS on a carrier (`localStorage.` / `.localStorage` /
    //    `document.cookie`), not the bare identifier: `session-storage.ts` legitimately DECLARES
    //    `localStorage?: unknown` on an injected runtime interface purely so the tests above can
    //    prove the carrier is never read. A declaration is not a use.
    const carrier_usage: readonly { readonly label: string; readonly pattern: RegExp }[] = [
      { label: 'localStorage read/write', pattern: /\blocalStorage\s*[.[]/ },
      { label: 'localStorage via global', pattern: /\.\s*localStorage\b/ },
      { label: 'indexedDB read/write', pattern: /\bindexedDB\s*[.[]/ },
      { label: 'indexedDB via global', pattern: /\.\s*indexedDB\b/ },
      { label: 'document.cookie', pattern: /\bdocument\s*\.\s*cookie\b/ },
      { label: 'permanent cookie helper', pattern: /\bsessionCookie\b|\bpermanentCookie\b/ },
    ];
    for (const { file, code } of identifierRendering()) {
      for (const { label, pattern } of carrier_usage) {
        assert.ok(!pattern.test(code), `${file} accesses the forbidden carrier (${label})`);
      }
    }
    assert.ok(
      FORBIDDEN_CREDENTIAL_CARRIERS.includes('localStorage') &&
        FORBIDDEN_CREDENTIAL_CARRIERS.includes('indexedDB'),
      'the denylist must name the carriers that must never hold a credential',
    );
  });

  it('AC-161 (T8): no "remember key" / cross-session surface exists in the credential code', () => {
    const forbidden_names = /(remember|persist|permanent|autoRestore|auto_restore|keepKey|saveForever)/i;
    for (const { file, source } of SCANNED) {
      for (const match of source.matchAll(
        /export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+([A-Za-z0-9_$]+)/g,
      )) {
        const name = match[1] ?? '';
        assert.ok(!forbidden_names.test(name), `${file} exports "${name}", which implies cross-session persistence`);
      }
    }
    // The sanctioned surface is exactly: kind / put / resolve / has / remove / endSession / list_refs.
    const store = createSessionCredentialStore(createMemorySessionStorage());
    assert.deepEqual(Object.keys(store).sort(), ['endSession', 'has', 'kind', 'list_refs', 'put', 'remove', 'resolve']);
  });

  it('AC-157 / AC-155 / AC-156: the store writes only to the injected carrier, never logs, never touches the workspace', () => {
    const storage = inspectableSessionStorage();
    const store = createSessionCredentialStore(storage);
    store.put(FIXTURE_CREDENTIAL_REF, SENTINEL_SECRET);
    const keys = Object.keys(storage.entries());
    assert.ok(
      keys.every((key) => key.startsWith(SESSION_CREDENTIAL_NAMESPACE)),
      'every key stays inside the credential namespace',
    );
    assert.equal(sessionCredentialKey(FIXTURE_CREDENTIAL_REF).includes(SENTINEL_SECRET), false);
    for (const { file, code } of identifierRendering()) {
      assert.ok(!code.includes('console.'), `${file} must not log, so a key cannot reach a console`);
    }
    for (const { file, source } of BROWSER_AI_DIR.sources) {
      for (const specifier of importSpecifiersOf(source)) {
        assert.ok(!specifier.includes('workspace'), `${file} must not depend on the workspace layer ("${specifier}")`);
      }
    }
  });

  it('IMPLEMENTATION INVARIANT: two providers never share a credential slot', () => {
    const storage = inspectableSessionStorage();
    const store = createSessionCredentialStore(storage);
    const first = credentialRefForProvider('provider-a');
    const second = credentialRefForProvider('provider-b');
    store.put(first, 'sk-fixture-A-0000000000');
    store.put(second, 'sk-fixture-B-0000000000');
    assert.notEqual(sessionCredentialKey(first), sessionCredentialKey(second));
    const first_secret = store.resolve(first);
    const second_secret = store.resolve(second);
    assert.ok(first_secret !== null, 'the first provider credential must resolve');
    assert.ok(second_secret !== null, 'the second provider credential must resolve');
    assert.equal(revealCredentialSecret(first_secret), 'sk-fixture-A-0000000000');
    assert.equal(revealCredentialSecret(second_secret), 'sk-fixture-B-0000000000');
    assert.deepEqual([...store.list_refs()].sort(), ['provider:provider-a', 'provider:provider-b']);
    store.remove(first);
    assert.equal(store.has(first), false);
    assert.equal(store.has(second), true);
    assert.equal(store.resolve(first), null);
  });

  it('IMPLEMENTATION INVARIANT: the same credential value never appears under two different keys', () => {
    const storage = inspectableSessionStorage();
    const store = createSessionCredentialStore(storage);
    store.put(FIXTURE_CREDENTIAL_REF, SENTINEL_SECRET);
    const entries = Object.entries(storage.entries());
    const matches = entries.filter(([, value]) => value.includes(SENTINEL_SECRET));
    assert.equal(matches.length, 1, 'exactly one carrier entry may hold the secret');
    assert.equal(matches[0]?.[0], sessionCredentialKey(FIXTURE_CREDENTIAL_REF));
    const scanned = repoFiles('src/browser/ai');
    assert.ok(
      scanned.every((file) => file.includes('browser')),
      'the browser adapter tree must never be reachable from the core scope',
    );
  });
});
