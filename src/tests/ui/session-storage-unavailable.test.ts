/**
 * FINAL-RAPID-INTEGRATION-01 §3.2 ｜ No session storage must not mean a blank page.
 *
 * 🔴 THE DEFECT THIS FILE CLOSES. `src/ui/bootstrap.ts` built the credential store EAGERLY:
 *    `createSessionCredentialStore(createBrowserSessionStorage())`, and the inner call THROWS when the
 *    runtime has no `sessionStorage` (or has one that refuses to round-trip - private mode, storage
 *    disabled, a getter that throws). The throw happened while the shell was wiring itself up, so
 *    `mountAppShell` was never reached: no workspace entry, no message, nothing. A missing browser
 *    capability was being reported as a dead product.
 *
 * 🔴 WHAT IS PINNED HERE, AND WHY EACH HALF MATTERS:
 *      · the probe's failure is a VALUE, not an exception (`resolveCredentialCapability`);
 *      · the degraded port HOLDS NOTHING - so "no fallback carrier" is a shape, not a promise;
 *      · a model configuration in such a runtime is REFUSED with the frozen sentence, so it can never
 *        be presented as saved (`D-056`);
 *      · BROWSING KEEPS WORKING - the workspace connects and its rail loads, because a read needs no
 *        credential at all (`S01-06-D1`);
 *      · the bootstrap really wires it that way, and never reaches for another carrier.
 *
 * 🔴 THESE ARE `IMPLEMENTATION INVARIANT` CASES, NOT NEW PRODUCT `AC` (`FINAL-RAPID-INTEGRATION-01`
 *    adds no `AC`). 🔴 REAL PROVIDER CALLS = 0 - the gateway here composes nothing at all.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SessionStorageUnavailableError,
  createBrowserSessionStorage,
} from '../../browser/ai/session-storage.js';
import type { SessionScopedStorage } from '../../browser/ai/session-storage.js';
import { SETTINGS_SESSION_STORAGE_UNAVAILABLE } from '../../ui/copy.js';
import {
  NO_CREDENTIAL_PORT,
  credentialUnavailableMessage,
  resolveCredentialCapability,
  sessionStorageFor,
} from '../../ui/settings/credential-capability.js';
import { EMPTY_SETTINGS_DRAFT } from '../../ui/settings/provider-presets.js';
import { createAppSession } from '../../ui/session/app-session.js';
import type { AppSession } from '../../ui/session/app-session.js';
import type { UiReadPort } from '../../ui/session/ui-port.js';
import { readRepoFile, stripComments } from '../ai/source-scan.js';

/* ================================================================== *
 * Fixtures
 * ================================================================== */

const BOOTSTRAP = 'src/ui/bootstrap.ts';
const CAPABILITY = 'src/ui/settings/credential-capability.ts';
const WORKSPACE_LABEL = 'fixture-ws';
const FIXTURE_KEY = 'sk-fixture-NOT-A-REAL-KEY-STORE01';

/** 🔴 LINE ENDINGS ARE NORMALISED FIRST - this tree is checked out with CRLF (`FINAL-RAPID-D`). */
function repositoryFile(path: string): string {
  return stripComments(readRepoFile(path)).replace(/\r\n?/gu, '\n');
}

/** A real, working in-memory session store - the contrast case for every failure below. */
function workingStore(): SessionScopedStorage {
  const backing = new Map<string, string>();
  return {
    kind: 'browser-session-storage',
    getItem: (key) => backing.get(key) ?? null,
    setItem: (key, value) => {
      backing.set(key, value);
    },
    removeItem: (key) => {
      backing.delete(key);
    },
  };
}

/** The rail/browse surface with nothing in it - proof that a read needs no credential. */
const EMPTY_READ_PORT: UiReadPort = {
  listWorkflowAttempts: async () => [],
  readWorkflow: async () => ({ kind: 'not_found' }),
  traceHypothesis: async () => ({ kind: 'delegated', layer: 'OK', value: null, notice: null }),
};

/** The application as the bootstrap would build it in a runtime with NO usable session storage. */
function bootWithoutSessionStorage(): AppSession {
  const capability = resolveCredentialCapability(() => {
    throw new SessionStorageUnavailableError('no session storage in this runtime');
  });
  assert.equal(capability.kind, 'unavailable', 'precondition: the capability is unavailable');
  return createAppSession({
    /* 🔴 The honest port of such a runtime: it holds nothing, so nothing can be leaked. */
    credentials: NO_CREDENTIAL_PORT,
    attachStorage: () => EMPTY_READ_PORT,
    initial_draft: EMPTY_SETTINGS_DRAFT,
    /*
     * 🔴 THE ONE BEHAVIOUR THAT MATTERS: composing a model configuration is REFUSED with the frozen
     *    sentence, exactly as `bootstrap.ts` does it. It is an `unsupported` outcome, which the
     *    session already confines to the command path - it never becomes `ready`.
     */
    createGateway: () => ({
      kind: 'unsupported',
      message: credentialUnavailableMessage(capability),
    }),
  });
}

/* ================================================================== *
 * CAP-01 … CAP-03 - the probe's outcome is a value
 * ================================================================== */

describe('FINAL-RAPID-INTEGRATION-01 ｜ IMPLEMENTATION INVARIANT｜the credential capability probe (CAP-01…)', () => {
  it('IMPLEMENTATION INVARIANT (CAP-01): a throwing probe becomes an explained refusal, never an exception', () => {
    /* (a) The probe itself throws - a `sessionStorage` getter that denies access. */
    const denied = resolveCredentialCapability(() => {
      throw new SessionStorageUnavailableError('denied by the runtime');
    });
    assert.equal(denied.kind, 'unavailable');
    assert.equal(credentialUnavailableMessage(denied), SETTINGS_SESSION_STORAGE_UNAVAILABLE);
    assert.equal(sessionStorageFor(denied), null, 'an unavailable capability hands out no store');

    /* (b) A runtime with no `sessionStorage` at all - the REAL probe, not a stub. */
    const missing = resolveCredentialCapability(() => createBrowserSessionStorage({}));
    assert.equal(missing.kind, 'unavailable');
    assert.equal(credentialUnavailableMessage(missing), SETTINGS_SESSION_STORAGE_UNAVAILABLE);

    /*
     * (c) A `sessionStorage` that EXISTS but refuses to store - private mode / disabled storage. The
     *     probe's own round-trip check is what catches this, and the outcome must be the same refusal
     *     rather than a store that silently loses the key.
     */
    const refusing = resolveCredentialCapability(() =>
      createBrowserSessionStorage({
        sessionStorage: {
          getItem: () => null,
          setItem: () => {
            throw new Error('storage disabled');
          },
          removeItem: () => undefined,
        },
      }),
    );
    assert.equal(refusing.kind, 'unavailable');
    assert.equal(credentialUnavailableMessage(refusing), SETTINGS_SESSION_STORAGE_UNAVAILABLE);

    /* 🔴 AND THE CONTRAST IS REAL: a working store is accepted, so the probe is not vacuous. */
    const available = resolveCredentialCapability(() => workingStore());
    assert.equal(available.kind, 'available');
    assert.notEqual(sessionStorageFor(available), null);
    assert.equal(credentialUnavailableMessage(available), '');
  });

  it('IMPLEMENTATION INVARIANT (CAP-02): the degraded port HOLDS NOTHING - there is no fallback carrier', () => {
    /* 🔴 NOT an in-memory substitute: a second read cannot remember a value the first one stored. */
    assert.equal(NO_CREDENTIAL_PORT.has('deepseek'), false);
    assert.equal(NO_CREDENTIAL_PORT.has('openai'), false);
    NO_CREDENTIAL_PORT.clear('deepseek');
    assert.equal(
      NO_CREDENTIAL_PORT.has('deepseek'),
      false,
      'clearing changes nothing because the degraded port never held anything',
    );

    /*
     * 🔴 AND THE MODULE HAS NO OTHER CARRIER TO REACH FOR. The forbidden names are asserted absent
     *    from the CODE (comments are stripped), so the only carrier this module can name is the one it
     *    was handed.
     */
    const source = repositoryFile(CAPABILITY);
    for (const carrier of ['localStorage', 'indexedDB', 'document.cookie', 'workspace file']) {
      assert.equal(source.includes(carrier), false, `${CAPABILITY} must not name ${carrier}`);
    }
    assert.ok(source.includes('catch {'), 'the probe failure must be caught into a value');
  });

  it('IMPLEMENTATION INVARIANT (CAP-03): the bootstrap refuses the SAVE instead of failing to boot', async () => {
    const session = bootWithoutSessionStorage();

    /* 🔴 FIRST: THE SHELL BOOTED AND BROWSING WORKS. A workspace authorizes and its rail loads. */
    await session.attachWorkspace(WORKSPACE_LABEL);
    const browsing = session.getState();
    assert.equal(browsing.workspace.status, 'connected', 'the workspace must still connect');
    assert.equal(browsing.attempts_loaded, true, 'and its rail must still be readable');

    /* 🔴 THEN: THE MODEL CONFIGURATION IS REFUSED, IN THE PANEL, WITH THE FROZEN SENTENCE. */
    session.openSettings();
    /*
     * 🔴 A DRAFT THAT IS OTHERWISE VALID, so the refusal under test is the STORAGE one and not a
     *    field-level reason (`browser-direct-custom` would demand a custom Base URL first, and the
     *    save would then never reach the gateway at all).
     */
    session.chooseSettingsPreset('deepseek');
    session.updateSettingsDraft({ api_key: FIXTURE_KEY });
    await session.saveSettings();

    const saved = session.getState();
    assert.notEqual(saved.provider.status, 'ready', 'it must never be presented as configured');
    assert.equal(saved.provider.status, 'unsupported');
    assert.equal(saved.settings_save_error, SETTINGS_SESSION_STORAGE_UNAVAILABLE);
    assert.equal(saved.provider.message, SETTINGS_SESSION_STORAGE_UNAVAILABLE);
    assert.equal(saved.settings_open, true, 'the panel stays open and says why');
    /* 🔴 The workspace is untouched by the refusal - the two capabilities are separate. */
    assert.equal(saved.workspace.status, 'connected');

    /* 🔴 NO SECRET WAS RETAINED ANYWHERE: the port holds nothing and the runtime has no carrier. */
    assert.equal(NO_CREDENTIAL_PORT.has('deepseek'), false);
    assert.equal(
      JSON.stringify({ ...saved, settings_draft: { ...saved.settings_draft, api_key: '' } }).includes(
        FIXTURE_KEY,
      ),
      false,
      'nothing but the form field itself may know the typed key',
    );
  });
});

/* ================================================================== *
 * CAP-04 - the shipped bootstrap really is wired that way
 * ================================================================== */

describe('FINAL-RAPID-INTEGRATION-01 ｜ IMPLEMENTATION INVARIANT｜the shipped bootstrap wiring (CAP-04)', () => {
  it('IMPLEMENTATION INVARIANT (CAP-04): the boot path probes, refuses, and never touches another carrier', () => {
    const source = repositoryFile(BOOTSTRAP);

    /* 🔴 THE OLD, FATAL SHAPE IS GONE: no eager `createSessionCredentialStore(createBrowserSessionStorage())`. */
    assert.equal(
      source.includes('createSessionCredentialStore(createBrowserSessionStorage())'),
      false,
      'the store must not be built directly from the throwing probe',
    );
    /* 🔴 It is probed into a capability instead. */
    assert.ok(
      source.includes('resolveCredentialCapability(() => createBrowserSessionStorage())'),
      'the probe must be wrapped into a capability value',
    );

    /* 🔴 THE REFUSAL GUARD EXISTS, AND IT PRECEDES THE ONE `put` SITE. */
    const guard = source.indexOf('credentials_wiring === null');
    const put = source.indexOf('.store.put(');
    assert.ok(guard >= 0, 'the unavailable branch must exist in `createGateway`');
    assert.ok(put >= 0, 'the credential is still written in exactly one place');
    assert.ok(
      guard < put,
      'the refusal must precede the write, so a key can never enter a store that does not exist',
    );
    assert.ok(
      source.includes('credentialUnavailableMessage(capability)'),
      'the refusal must carry the frozen product sentence',
    );

    /* 🔴 AND NO OTHER CARRIER IS NAMED IN CODE (comments are stripped). */
    for (const carrier of ['localStorage', 'indexedDB', 'document.cookie']) {
      assert.equal(source.includes(carrier), false, `${BOOTSTRAP} must not name ${carrier}`);
    }
    /* 🔴 The degraded port is the one the app shell receives, not a substitute store. */
    assert.ok(source.includes('credentials_wiring?.port ?? NO_CREDENTIAL_PORT'));
  });
});
