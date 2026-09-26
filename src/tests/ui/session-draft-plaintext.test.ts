/**
 * FINAL-RAPID-B ｜ The provider save must not leave the plaintext behind (KEY-01).
 *
 * 🔴 THESE ARE `IMPLEMENTATION INVARIANT` CASES, NOT NEW PRODUCT `AC`.
 * 🔴 WHAT IS PINNED: after a SUCCESSFUL save the typed API Key has left `settings_draft.api_key` - the
 *    field the panel re-renders on every keystroke and on every other state change - while the SESSION
 *    STORE keeps it, the provider stays `ready`, and reopening the panel shows an empty input with the
 *    「会话已有 Key」 advice coming from the boolean flag instead of from the box.
 * 🔴 AND THE BOUNDARY IS PINNED TOO: with no credential store wired there is nothing that holds the
 *    key, so the field MUST keep it - clearing unconditionally would erase the only copy and the next
 *    save would be refused by the credential gate (`PSA-D2 = B`). Both halves are asserted, so a future
 *    edit cannot satisfy one by breaking the other.
 * 🔴 FAKE KEYS ONLY. Every value below is `sk-fixture-…`; nothing here is a real credential, and the
 *    live transport records zero calls.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createSessionCredentialStore,
  credentialRefForProvider,
  sessionCredentialKey,
} from '../../browser/ai/session-credential-store.js';
import type { SessionCredentialStore } from '../../browser/ai/session-credential-store.js';
import { createBrowserSessionStorage } from '../../browser/ai/session-storage.js';
import type { SessionScopedStorage } from '../../browser/ai/session-storage.js';
import { SETTINGS_KEY_PRESENT_IN_SESSION } from '../../ui/copy.js';
import { createAppSession } from '../../ui/session/app-session.js';
import type { AppSession, SessionCredentialPort } from '../../ui/session/app-session.js';
import { createBrowserUiGateway } from '../../ui/session/browser-gateway.js';
import type { ProviderConfig } from '../../ai/provider/capability.js';
import { EMPTY_SETTINGS_DRAFT } from '../../ui/settings/provider-presets.js';
import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import { createMockTransport, okResponse, providerShapedBody } from '../ai/fixtures.js';

/* ================================================================== *
 * Fixtures - fake keys only
 * ================================================================== */

const FIXTURE_KEY = 'sk-fixture-NOT-A-REAL-KEY-KEY01';
const DEEPSEEK = 'deepseek';
const WORKSPACE_LABEL = 'fixture-ws';

function refOf(provider_id: string): ReturnType<typeof credentialRefForProvider> {
  return credentialRefForProvider(provider_id);
}

/* ================================================================== *
 * One browser tab + the application over it
 * ================================================================== */

interface BrowserTab {
  readonly backing: Map<string, string>;
}

function openBrowserTab(): BrowserTab {
  return { backing: new Map() };
}

function sessionStorageViewOf(tab: BrowserTab): SessionScopedStorage {
  return {
    kind: 'browser-session-storage',
    getItem: (key) => tab.backing.get(key) ?? null,
    setItem: (key, value) => {
      tab.backing.set(key, value);
    },
    removeItem: (key) => {
      tab.backing.delete(key);
    },
  };
}

interface App {
  readonly session: AppSession;
  readonly credentials: SessionCredentialStore;
  readonly transport: ReturnType<typeof createMockTransport>;
  /** Every `ProviderConfig` handed to the gateway factory - the secret must never be in one. */
  readonly configs: readonly ProviderConfig[];
}

/**
 * The application over one tab - the bootstrap's wiring, with the real read/gateway paths.
 *
 * @param with_credentials `false` builds the SAME session with no credential port at all, which is the
 *        boundary case: nothing can hold the key, so nothing may take it out of the field.
 */
function buildApplication(tab: BrowserTab, with_credentials = true): App {
  const credentials = createSessionCredentialStore(
    createBrowserSessionStorage({ sessionStorage: sessionStorageViewOf(tab) }),
  );
  const port: SessionCredentialPort = {
    has: (provider_id) => credentials.has(refOf(provider_id)),
    clear: (provider_id) => {
      credentials.remove(refOf(provider_id));
    },
  };

  const storage = new InMemoryWorkspaceStorage();
  const transport = createMockTransport(() => okResponse(providerShapedBody()));
  const configs: ProviderConfig[] = [];

  const session = createAppSession({
    ...(with_credentials ? { credentials: port } : {}),
    attachStorage: () => null,
    initial_draft: EMPTY_SETTINGS_DRAFT,
    createGateway: ({ config, api_key }) => {
      configs.push(config);
      /* 🔴 THE ONE `put`: the session store is where the key goes, and it is the only place it goes. */
      if (with_credentials && api_key.trim().length > 0) {
        credentials.put(refOf(String(config.provider_id)), api_key);
      }
      return createBrowserUiGateway({ storage, config, credentials, transport });
    },
  });

  return { session, credentials, transport, configs };
}

/** The user gesture path: a workspace, the DeepSeek preset and a typed key, then the save. */
async function saveWithTypedKey(app: App, api_key: string): Promise<void> {
  await app.session.attachWorkspace(WORKSPACE_LABEL);
  app.session.openSettings();
  app.session.chooseSettingsPreset(DEEPSEEK);
  app.session.updateSettingsDraft({ api_key });
  await app.session.saveSettings();
}

/* ================================================================== *
 * KEY-01 - the plaintext leaves the form, the credential stays
 * ================================================================== */

describe('FINAL-RAPID-B ｜ IMPLEMENTATION INVARIANT｜the provider save and the typed plaintext (KEY-01)', () => {
  it('IMPLEMENTATION INVARIANT (KEY-01): a successful save empties the field, the session keeps the key', async () => {
    const tab = openBrowserTab();
    const app = buildApplication(tab);
    await saveWithTypedKey(app, FIXTURE_KEY);

    const state = app.session.getState();
    /* ① The save really happened, in the shipped sense: composed, ready, panel closed. */
    assert.equal(state.provider.status, 'ready', 'precondition: the composition succeeded');
    assert.equal(state.settings_open, false, 'a successful save closes the panel');

    /* ② The TYPED PLAINTEXT IS GONE from the draft. This is the whole point of KEY-01: the field is
     *    re-rendered on every state change, so a key living there is a key that keeps being carried. */
    assert.equal(state.settings_draft.api_key, '', 'the typed key must not stay in `settings_draft`');
    assert.equal(
      JSON.stringify(state.settings_draft).includes(FIXTURE_KEY),
      false,
      'and no part of the draft may carry it',
    );
    assert.equal(
      JSON.stringify(state).includes(FIXTURE_KEY),
      false,
      'nor may any other slice of the session state hold the secret',
    );

    /* ③ The SESSION STORE still has it, value unchanged, in exactly one slot. */
    assert.equal(app.credentials.has(refOf(DEEPSEEK)), true, 'the key must still be usable');
    assert.notEqual(app.credentials.resolve(refOf(DEEPSEEK)), null, 'and still resolvable');
    /*
     * 🔴 THE RAW VALUE IS CHECKED ON THE CARRIER, because `resolve` hands back an opaque handle - the
     *    secret itself is held in a module-private `WeakMap` and is deliberately not readable here.
     */
    assert.equal(
      tab.backing.get(sessionCredentialKey(refOf(DEEPSEEK))),
      FIXTURE_KEY,
      'and unchanged in the session carrier',
    );
    assert.deepEqual([...app.credentials.list_refs()], [`provider:${DEEPSEEK}`]);

    /* ④ The provider badge keeps saying a key is present, because one is - in the store. */
    assert.equal(state.provider.key_present, true);
    assert.equal(state.settings_key_in_session, true);

    /* ⑤ Reopening the panel shows an EMPTY input, and the advice comes from the flag. */
    app.session.openSettings();
    const reopened = app.session.getState();
    assert.equal(reopened.settings_draft.api_key, '', 'the input is empty when the panel is reopened');
    assert.equal(reopened.settings_key_in_session, true, 'yet the session already holds a key');
    assert.equal(reopened.settings_errors.length, 0, 'so nothing blocks the form');

    /* ⑥ A save with the field empty still goes through - the store, not the box, is the credential. */
    await app.session.saveSettings();
    assert.equal(app.session.getState().provider.status, 'ready');
    assert.equal(app.session.getState().settings_open, false);
    assert.equal(app.transport.calls.length, 0, 'and composing a provider still calls no model');
  });

  it('IMPLEMENTATION INVARIANT (KEY-01): the secret travels into the store and never into a `ProviderConfig`', async () => {
    const tab = openBrowserTab();
    const app = buildApplication(tab);
    await saveWithTypedKey(app, FIXTURE_KEY);

    assert.ok(app.configs.length >= 1, 'precondition: a configuration was composed');
    for (const config of app.configs) {
      assert.equal(
        JSON.stringify(config).includes(FIXTURE_KEY),
        false,
        'the key may never enter a `ProviderConfig`',
      );
    }
    /* 🔴 And the key really is in the session carrier - the check above is not vacuous. */
    assert.equal(
      tab.backing.get(sessionCredentialKey(refOf(DEEPSEEK))),
      FIXTURE_KEY,
      'the session carrier holds the key, under the provider ref',
    );
  });

  it('IMPLEMENTATION INVARIANT (KEY-01): with NO credential store the field KEEPS the key it cannot hand over', async () => {
    /* 🔴 THE BOUNDARY. Nothing holds the key, so emptying the field would destroy the only copy - and the
     *    very next save would be refused by the credential gate, silently downgrading a configuration
     *    the user had just made work. The store's answer is the only licence to clear. */
    const tab = openBrowserTab();
    const app = buildApplication(tab, false);
    await saveWithTypedKey(app, FIXTURE_KEY);

    const state = app.session.getState();
    assert.equal(state.provider.status, 'ready', 'precondition: the composition still succeeded');
    assert.equal(state.settings_draft.api_key, FIXTURE_KEY, 'with no carrier, the field keeps what it has');
    assert.equal(
      state.settings_key_in_session,
      true,
      'the panel still knows a usable key exists - it is simply still in the box',
    );

    /* A second save therefore goes through without retyping anything. */
    await app.session.saveSettings();
    assert.equal(app.session.getState().provider.status, 'ready');

    /* 🔴 AND THE CONTRAST IS REAL: with the store wired, the same flow empties the field. */
    const with_store = buildApplication(openBrowserTab());
    await saveWithTypedKey(with_store, FIXTURE_KEY);
    assert.equal(with_store.session.getState().settings_draft.api_key, '');
  });

  it('IMPLEMENTATION INVARIANT (KEY-01): the panel`s advice sentence is unchanged and the field stays a password input', async () => {
    const tab = openBrowserTab();
    const app = buildApplication(tab);
    await saveWithTypedKey(app, FIXTURE_KEY);

    /* 🔴 Existing copy semantics are NOT touched by this fix: the same advice the session already had. */
    assert.ok(SETTINGS_KEY_PRESENT_IN_SESSION.includes('当前浏览器会话已有 API Key'));
    assert.equal(app.session.getState().settings_key_in_session, true);
    assert.equal(
      tab.backing.has('localStorage'),
      false,
      'nothing about the credential moved to a persistent carrier',
    );
    assert.equal(
      tab.backing.has(sessionCredentialKey(refOf(DEEPSEEK))),
      true,
      'the credential lives in the SESSION-scoped carrier, under its provider ref',
    );
  });
});
