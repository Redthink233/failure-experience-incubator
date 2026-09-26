/**
 * PRE-PSA-BLOCKER-01 / CORRECTION-01 ｜ SESSION CREDENTIAL REFRESH ALIGNMENT.
 *
 * 🔴 THESE ARE `IMPLEMENTATION INVARIANT` CASES, NOT NEW PRODUCT `AC`. The task aligns a UI sentence
 *    with an already-CONFIRMED `Decision` (`D-056`｜Session-only Credential); it creates no acceptance
 *    point and changes no frozen contract. The canonical ACs the behaviour already answers to are
 *    referenced below and stay inside the existing `AC-01`–`AC-162` range.
 *
 * ── THE ONE QUESTION THIS FILE ANSWERS ──────────────────────────────────────────────
 * `D-056`'s effective rule is: input → usable for the current session → **still usable after a page
 * refresh** → cleared when the tab / browser session ends → the next session must input again.
 * The shipped note under the API Key field said the opposite of the middle clause, so the suite exists
 * to make the REFRESH RETENTION a property of the code rather than of a sentence. Every case below is
 * driven through production modules; nothing at the product boundary is mocked:
 *
 *   · `bootstrapCredentialStore` performs EXACTLY the construction `src/ui/bootstrap.ts` performs
 *     (line 38): `createSessionCredentialStore(createBrowserSessionStorage())`. The runtime is passed
 *     in only because a Node test has no `window`; the storage object handed over is a plain
 *     `Storage`-shaped carrier, and the real `sessionStorage` is what it stands for.
 *   · A RELOAD is modelled the way a browser really behaves: `sessionStorage` comes back as a NEW
 *     Storage object bound to the SAME per-tab data, and the application is rebuilt from scratch on
 *     top of it. A NEW BROWSER SESSION is a fresh backing store - the tab was closed.
 *   · `createAppSession` + `createBrowserUiGateway` are the real ones, so "the provider composes
 *     again after a refresh" is decided by production code, not by a stub.
 *
 * 🔴 WHAT THIS FILE DOES NOT CLAIM. It makes NO real provider call: every transport is a mock and
 *    every simulated body is a fixture. It also does NOT claim that a provider CONFIGURATION survives
 *    a refresh - the architecture persists the credential only, and the honest statement of that
 *    boundary is asserted explicitly (R4), not glossed over.
 * 🔴 EVERY SECRET USED HERE IS A FAKE (`sk-fixture-…`). No real credential exists in this repository.
 *
 * R1 store / R2 reload / R3 read-back / R4 re-compose / R5 new session / R6 localStorage /
 * R7 IndexedDB / R8 workspace file / R9 new copy / R10 retired copy.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { describe, it } from 'node:test';

import { revealCredentialSecret } from '../../ai/provider/credential.js';
import { composeBrowserProvider } from '../../browser/application/provider-composition.js';
import {
  createSessionCredentialStore,
  credentialRefForProvider,
} from '../../browser/ai/session-credential-store.js';
import type { SessionCredentialStore } from '../../browser/ai/session-credential-store.js';
import { createBrowserSessionStorage } from '../../browser/ai/session-storage.js';
import type { SessionScopedStorage } from '../../browser/ai/session-storage.js';
import { SETTINGS_API_KEY_NOTE } from '../../ui/copy.js';
import { createAppSession } from '../../ui/session/app-session.js';
import { createBrowserUiGateway } from '../../ui/session/browser-gateway.js';
import type { SettingsDraft } from '../../ui/settings/provider-presets.js';
import { findPreset, providerConfigOf } from '../../ui/settings/provider-presets.js';
import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import {
  REPO_ROOT,
  repoFiles,
  stripComments,
  stripCommentsAndStrings,
} from '../ai/source-scan.js';
import { createMockTransport, okResponse, providerShapedBody } from '../ai/fixtures.js';

/* ================================================================== *
 * Fixtures
 * ================================================================== */

/** The fake key the task nominates. Shaped like a key, is not one, and is never sent anywhere. */
const REFRESH_FIXTURE_KEY = 'sk-fixture-NOT-A-REAL-KEY-PSA';

/** The preset whose draft the settings panel can validate with a key field left EMPTY. */
const DEEPSEEK = 'deepseek';

/** One file, so "no workspace write happened" is decided over a NON-EMPTY workspace (R8). */
const SEEDED_WORKSPACE_FILE = 'attempts/ATT-fixture-0001.json';
const SEEDED_WORKSPACE_BODY = '{"fixture":true}\n';

function deepseekDraft(api_key: string): SettingsDraft {
  const preset = findPreset(DEEPSEEK);
  assert.ok(preset !== null, 'the DeepSeek preset must exist');
  return {
    provider_id: DEEPSEEK,
    model: preset.default_model,
    api_key,
    custom_base_url: '',
  };
}

/* ================================================================== *
 * The browser-session model
 * ================================================================== */

/**
 * One browser tab.
 *
 * 🔴 `backing` is the per-tab storage DATA, not a Storage object: that distinction is what makes the
 *    reload case honest. A reload keeps the data and hands the page a NEW `sessionStorage` object;
 *    closing the tab discards the data, so the next session starts empty.
 */
interface BrowserTab {
  readonly backing: Map<string, string>;
}

function openBrowserTab(): BrowserTab {
  return { backing: new Map() };
}

/** `window.sessionStorage` at one point in time: a `Storage`-shaped view over the tab's own data. */
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

/**
 * EXACTLY what `src/ui/bootstrap.ts` line 38 does: build the session credential store over the
 * runtime's own session storage.
 *
 * 🔴 The injection point exists only because a Node test has no `window`. The function still reads
 *    exactly one member (`.sessionStorage`), so there is no code path that could pick another carrier.
 */
function bootstrapCredentialStore(tab: BrowserTab): SessionCredentialStore {
  return createSessionCredentialStore(
    createBrowserSessionStorage({ sessionStorage: sessionStorageViewOf(tab) }),
  );
}

/* ================================================================== *
 * The application harness (mirrors `bootstrap.ts`, without the directory picker)
 * ================================================================== */

interface Harness {
  readonly credentials: SessionCredentialStore;
  readonly session: ReturnType<typeof createAppSession>;
  readonly storage: InMemoryWorkspaceStorage;
  readonly transport: ReturnType<typeof createMockTransport>;
}

/**
 * Rebuilds the whole application over ONE tab.
 *
 * 🔴 THE `createGateway` BODY IS THE PRODUCTION ONE FROM `bootstrap.ts`: the key is written into the
 *    session store ONLY when the form carries one, and the gateway is then composed over the store -
 *    so an empty field after a refresh does NOT erase the credential and does NOT prevent composition.
 *    That is the mechanism `D-056` describes, and it is the reason this file can prove refresh
 *    retention instead of only asserting a string.
 */
function buildApplication(tab: BrowserTab): Harness {
  const credentials = bootstrapCredentialStore(tab);
  const storage = new InMemoryWorkspaceStorage({
    [SEEDED_WORKSPACE_FILE]: SEEDED_WORKSPACE_BODY,
  });
  const transport = createMockTransport(() => okResponse(providerShapedBody()));

  const session = createAppSession({
    attachStorage: () => null,
    initial_draft: deepseekDraft(''),
    createGateway: ({ config, api_key }) => {
      if (api_key.trim().length > 0) {
        credentials.put(credentialRefForProvider(String(config.provider_id)), api_key);
      }
      return createBrowserUiGateway({ storage, config, credentials, transport });
    },
  });

  return { credentials, session, storage, transport };
}

/** One reload: the tab keeps its data, the page is rebuilt from scratch. */
function reload(tab: BrowserTab): Harness {
  return buildApplication(tab);
}

function credentialRefOfDeepseek(): ReturnType<typeof credentialRefForProvider> {
  return credentialRefForProvider(DEEPSEEK);
}

/* ================================================================== *
 * R1 / R2 / R3 / R4 / R5 - the credential lifecycle
 * ================================================================== */

describe('CORRECTION-01 ｜ IMPLEMENTATION INVARIANT｜session credential vs a page refresh (D-056)', () => {
  it('IMPLEMENTATION INVARIANT (R1): saving through the real settings path stores the key in the session', async () => {
    const tab = openBrowserTab();
    const app = buildApplication(tab);

    app.session.updateSettingsDraft({ api_key: REFRESH_FIXTURE_KEY });
    await app.session.saveSettings();

    const provider = app.session.getState().provider;
    assert.equal(provider.status, 'ready', 'a valid draft must compose the DeepSeek candidate');
    assert.equal(provider.provider_id, DEEPSEEK);
    assert.equal(provider.model, 'deepseek-flash');
    assert.equal(provider.key_present, true, 'the form carried a key, so the badge reports one');

    const ref = credentialRefOfDeepseek();
    assert.equal(app.credentials.has(ref), true, 'the key must now live in the session store');
    const secret = app.credentials.resolve(ref);
    assert.ok(secret !== null, 'the session store must resolve the ref it was handed');
    assert.equal(revealCredentialSecret(secret), REFRESH_FIXTURE_KEY);
  });

  it('IMPLEMENTATION INVARIANT (R2): a reload rebuilds the application without losing the session store', async () => {
    const tab = openBrowserTab();
    const before = buildApplication(tab);
    before.session.updateSettingsDraft({ api_key: REFRESH_FIXTURE_KEY });
    await before.session.saveSettings();

    /* A reload: SAME tab data, NEW Storage object, NEW store, NEW session - the real shape of it. */
    const after = reload(tab);

    assert.notEqual(
      after.credentials,
      before.credentials,
      'the reload must build a NEW store, not reuse the previous object',
    );
    assert.equal(
      after.session.getState().provider.status,
      'unconfigured',
      'honest boundary: only the credential is session-scoped, the provider CONFIG is not persisted',
    );
    assert.deepEqual(
      [...after.credentials.list_refs()],
      [...before.credentials.list_refs()],
      'the same refs must be visible after the reload',
    );
  });

  it('IMPLEMENTATION INVARIANT (R3): after a refresh the credential is still readable, value unchanged', async () => {
    const tab = openBrowserTab();
    const before = buildApplication(tab);
    before.session.updateSettingsDraft({ api_key: REFRESH_FIXTURE_KEY });
    await before.session.saveSettings();

    const after = reload(tab);
    const ref = credentialRefOfDeepseek();

    assert.equal(after.credentials.has(ref), true, 'the credential must survive the refresh');
    const secret = after.credentials.resolve(ref);
    assert.ok(secret !== null, 'a refreshed store must resolve the credential');
    assert.equal(revealCredentialSecret(secret), REFRESH_FIXTURE_KEY);
  });

  it('IMPLEMENTATION INVARIANT (R4): after a refresh the provider re-composes with the field left EMPTY', async () => {
    const tab = openBrowserTab();
    const before = buildApplication(tab);
    before.session.updateSettingsDraft({ api_key: REFRESH_FIXTURE_KEY });
    await before.session.saveSettings();

    const after = reload(tab);

    /* 🔴 THE KEY FIELD IS DELIBERATELY EMPTY: this is the user who refreshed and re-opened Settings. */
    assert.equal(after.session.getState().settings_draft.api_key, '', 'the form starts empty after a refresh');
    await after.session.saveSettings();

    const provider = after.session.getState().provider;
    assert.equal(provider.status, 'ready', 'the configuration must compose again after a refresh');
    assert.equal(
      provider.key_present,
      false,
      'no key was typed - the composed provider does not need one from the FORM',
    );

    /* The composed adapter must build its Authorization header from the SESSION store, not the form. */
    const config = providerConfigOf(deepseekDraft(''));
    assert.ok(config !== null, 'the DeepSeek preset must produce a config');
    const composed = composeBrowserProvider({
      config,
      credentials: after.credentials,
      transport: after.transport,
    });
    assert.equal(composed.kind, 'composed', 'the provider must compose over the survived credential');
    if (composed.kind !== 'composed') {
      return;
    }
    assert.equal(composed.path, 'browser_direct');

    const ref = credentialRefOfDeepseek();
    const result = await composed.adapter.execute({
      provider_id: config.provider_id,
      credential_ref: ref,
      request: {
        provider_id: config.provider_id,
        model: config.model,
        messages: [{ role: 'user', content: 'fixture request body' }],
        structured_output: null,
      },
    });

    /* 🔴 The transport is a MOCK: the header is inspected in-process and no request leaves the test. */
    assert.equal(after.transport.calls.length, 1, 'exactly one SIMULATED request');
    assert.equal(
      after.transport.calls[0]?.headers['authorization'],
      `Bearer ${REFRESH_FIXTURE_KEY}`,
      'the request must be authorised by the credential that survived the refresh',
    );
    assert.equal(result.kind, 'ok', 'the fixture response must be accepted');
  });

  it('IMPLEMENTATION INVARIANT (R5): a new browser session cannot read the previous credential', async () => {
    const tab = openBrowserTab();
    const before = buildApplication(tab);
    before.session.updateSettingsDraft({ api_key: REFRESH_FIXTURE_KEY });
    await before.session.saveSettings();
    assert.equal(before.credentials.has(credentialRefOfDeepseek()), true);

    /* The tab was closed: a new session means a new backing store, not a new view over the old one. */
    const reopened = reload(openBrowserTab());
    const ref = credentialRefOfDeepseek();

    assert.equal(reopened.credentials.has(ref), false, 'the new session must not find the credential');
    assert.equal(reopened.credentials.resolve(ref), null);
    assert.deepEqual([...reopened.credentials.list_refs()], [], 'the new session has no refs at all');
    assert.ok(
      !JSON.stringify([...tab.backing.keys()]).includes(REFRESH_FIXTURE_KEY),
      'the old tab must not have stored the secret under a key derived from itself',
    );
  });
});

/* ================================================================== *
 * R6 / R7 - the forbidden carriers
 * ================================================================== */

/**
 * The carrier sources: every place a credential could physically be written from the browser side.
 *
 * 🔴 Comments and string literals are stripped first, so the module that DECLARES the denylist (and
 *    therefore names `localStorage` in a string) is not mistaken for a module that uses it.
 */
function carrierSources(): readonly { readonly name: string; readonly code: string }[] {
  return [...repoFiles('src/ui'), ...repoFiles('src/browser')].map((file) => ({
    name: relative(REPO_ROOT, file).replace(/\\/gu, '/'),
    code: stripCommentsAndStrings(readFileSync(file, 'utf8')),
  }));
}

const FORBIDDEN_ACCESS: readonly { readonly label: string; readonly pattern: RegExp }[] = [
  { label: 'localStorage read/write', pattern: /\blocalStorage\s*[.[]/u },
  { label: 'localStorage via a global', pattern: /\.\s*localStorage\b/u },
  { label: 'indexedDB read/write', pattern: /\bindexedDB\s*[.[]/u },
  { label: 'indexedDB via a global', pattern: /\.\s*indexedDB\b/u },
];

function accessesOf(label: string): readonly string[] {
  const pattern = FORBIDDEN_ACCESS.find((entry) => entry.label === label)?.pattern;
  assert.ok(pattern !== undefined, `unknown carrier label ${label}`);
  return carrierSources()
    .filter((file) => pattern.test(file.code))
    .map((file) => file.name);
}

/** A carrier stand-in that records every touch, so "never used" is observable rather than assumed. */
function untouchedSpy(): { readonly kind: string; readonly touched: string[] } & SessionScopedStorage {
  const touched: string[] = [];
  return {
    kind: 'carrier-spy',
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

describe('CORRECTION-01 ｜ IMPLEMENTATION INVARIANT｜the credential never reaches a forbidden carrier', () => {
  it('IMPLEMENTATION INVARIANT (R6): the key is not in localStorage - and the app cannot reach it', async () => {
    const tab = openBrowserTab();
    const app = buildApplication(tab);
    app.session.updateSettingsDraft({ api_key: REFRESH_FIXTURE_KEY });
    await app.session.saveSettings();

    /* Behavioural: the factory `bootstrap.ts` calls is offered localStorage and refuses to touch it. */
    const local_storage = untouchedSpy();
    const store = createSessionCredentialStore(
      createBrowserSessionStorage({ sessionStorage: sessionStorageViewOf(tab), localStorage: local_storage }),
    );
    assert.equal(store.has(credentialRefOfDeepseek()), true, 'the store must still work over sessionStorage');
    assert.deepEqual(local_storage.touched, [], 'localStorage must not even be read');

    /* Structural: no App Shell or browser source accesses the carrier at all. */
    assert.deepEqual(accessesOf('localStorage read/write'), [], 'localStorage must not be read or written');
    assert.deepEqual(accessesOf('localStorage via a global'), [], 'localStorage must not be reached as a global');
  });

  it('IMPLEMENTATION INVARIANT (R7): the key is not in IndexedDB - and the app cannot reach it', async () => {
    const tab = openBrowserTab();
    const app = buildApplication(tab);
    app.session.updateSettingsDraft({ api_key: REFRESH_FIXTURE_KEY });
    await app.session.saveSettings();

    const indexed_db = untouchedSpy();
    const store = createSessionCredentialStore(
      createBrowserSessionStorage({ sessionStorage: sessionStorageViewOf(tab), indexedDB: indexed_db }),
    );
    assert.equal(store.has(credentialRefOfDeepseek()), true, 'the store must still work over sessionStorage');
    assert.deepEqual(indexed_db.touched, [], 'IndexedDB must not even be opened');

    assert.deepEqual(accessesOf('indexedDB read/write'), [], 'IndexedDB must not be read or written');
    assert.deepEqual(accessesOf('indexedDB via a global'), [], 'IndexedDB must not be reached as a global');
  });
});

/* ================================================================== *
 * R8 - the workspace
 * ================================================================== */

describe('CORRECTION-01 ｜ IMPLEMENTATION INVARIANT｜the credential never reaches the workspace', () => {
  it('IMPLEMENTATION INVARIANT (R8): a save writes no workspace file and no file carries the key', async () => {
    const tab = openBrowserTab();
    const app = buildApplication(tab);
    const before = app.storage.snapshot();
    assert.equal(Object.keys(before).length, 1, 'the workspace must be non-empty for this check to mean anything');

    app.session.updateSettingsDraft({ api_key: REFRESH_FIXTURE_KEY });
    await app.session.saveSettings();

    const after = app.storage.snapshot();
    assert.deepEqual(after, before, 'configuring a model must not write to the workspace');
    for (const [path, contents] of Object.entries(after)) {
      assert.ok(!contents.includes(REFRESH_FIXTURE_KEY), `${path} must not contain the credential`);
    }

    /* And the credential really is somewhere else, so the check above is not vacuous. */
    assert.equal(app.credentials.has(credentialRefOfDeepseek()), true);
  });
});

/* ================================================================== *
 * R9 / R10 - the copy
 * ================================================================== */

describe('CORRECTION-01 ｜ IMPLEMENTATION INVARIANT｜the refresh sentence matches D-056', () => {
  it('IMPLEMENTATION INVARIANT (R9): the note under the API Key field says a refresh keeps the key', () => {
    assert.ok(
      SETTINGS_API_KEY_NOTE.includes('刷新后仍可用'),
      `the note must state refresh retention, got: ${SETTINGS_API_KEY_NOTE}`,
    );
    assert.ok(
      SETTINGS_API_KEY_NOTE.includes('会话'),
      'the note must still name the session as the boundary',
    );
    for (const banned of ['永久保存', '记住', '长期保存']) {
      assert.ok(!SETTINGS_API_KEY_NOTE.includes(banned), `the note must not offer "${banned}"`);
    }

    /*
     * 🔴 A CORRECT CONSTANT THAT NOTHING RENDERS WOULD PROVE NOTHING. The note must still be the one
     *    the panel draws, immediately after the API Key input, and drawn unconditionally.
     */
    const shell = stripComments(readFileSync(`${REPO_ROOT}/src/ui/components/shell.ts`, 'utf8'));
    assert.ok(
      shell.includes('note(SETTINGS_API_KEY_NOTE)'),
      'the Settings Center must render the note',
    );
    const api_key_at = shell.indexOf("id: SETTINGS_CONTROL_IDS.api_key");
    const note_at = shell.indexOf('note(SETTINGS_API_KEY_NOTE)');
    assert.ok(api_key_at >= 0, 'the API Key field must exist');
    assert.ok(note_at > api_key_at, 'the note must follow the field it describes');
    assert.ok(
      !/\?\s*null\s*:\s*note\(SETTINGS_API_KEY_NOTE\)/u.test(shell),
      'the note must not be rendered conditionally',
    );
  });

  it('IMPLEMENTATION INVARIANT (R10): the retired sentence is gone from every renderable App Shell string', () => {
    const retired = '刷新页面后需要重新填写';
    assert.ok(!SETTINGS_API_KEY_NOTE.includes(retired), 'the note must not carry the retired sentence');

    /*
     * 🔴 COMMENTS ARE STRIPPED, STRING LITERALS ARE NOT: what must be gone is the sentence the product
     *    could DISPLAY. Scanning with literals kept is what makes a re-introduction fail here.
     */
    const offenders = [...repoFiles('src/ui'), ...repoFiles('src/browser')]
      .filter((file) => stripComments(readFileSync(file, 'utf8')).includes(retired))
      .map((file) => relative(REPO_ROOT, file).replace(/\\/gu, '/'));
    assert.deepEqual(offenders, [], `the retired sentence must appear nowhere: ${offenders.join(', ')}`);

    /* The replacement is not merely different - the two halves must both be true statements. */
    assert.ok(
      SETTINGS_API_KEY_NOTE.includes('关闭标签页') && SETTINGS_API_KEY_NOTE.includes('需要重新填写'),
      'the note must name the real expiry (the end of the session)',
    );
  });
});
