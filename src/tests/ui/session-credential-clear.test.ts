/**
 * PRE-PSA-BLOCKER-01 / CORRECTION-02 ｜ CREDENTIAL CLEAR SEMANTICS + REFRESH EXISTING-KEY UX.
 *
 * 🔴 THESE ARE `IMPLEMENTATION INVARIANT` CASES, NOT NEW PRODUCT `AC`. The task makes two already-named
 *    behaviours truthful - 「清除本次会话的 API Key」 must actually remove the credential, and a refresh
 *    must not ask for a key the session still holds - and it corrects comment wording. It creates no
 *    acceptance point and changes no frozen contract. The canonical `AC`s the behaviour answers to
 *    (`AC-155`–`AC-162`) are unchanged and every reference stays inside the existing `AC-01`–`AC-162`.
 *
 * ── WHAT IS DRIVEN THROUGH PRODUCTION CODE (nothing at the product boundary is stubbed) ──────────
 *   · the credential store + the browser session carrier: `createSessionCredentialStore(
 *     createBrowserSessionStorage(...))`, i.e. exactly `src/ui/bootstrap.ts`'s construction;
 *   · the two-method port the bootstrap hands the session, INCLUDING its provider-id → ref
 *     derivation, so 「only this provider」 is decided by the same code the product runs;
 *   · `createAppSession` with the SAME `createGateway` body as the bootstrap (put only when the form
 *     carries a key), and the real `createBrowserUiGateway` behind it;
 *   · the real `composeBrowserProvider` for the "can a request still be authorised?" question.
 *
 * 🔴 A RELOAD is modelled the way a browser behaves: `sessionStorage` comes back as a NEW Storage
 *    object over the SAME per-tab data, and the application is rebuilt from scratch. A NEW BROWSER
 *    SESSION is a fresh backing store - the tab was closed.
 * 🔴 NO REAL PROVIDER IS CONTACTED. Every transport is a mock; every secret is a fake `sk-fixture-…`.
 *
 * K = clear ｜ U = refresh with an existing key ｜ N = new session.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { describe, it } from 'node:test';

import { composeBrowserProvider } from '../../browser/application/provider-composition.js';
import {
  createSessionCredentialStore,
  credentialRefForProvider,
  sessionCredentialKey,
} from '../../browser/ai/session-credential-store.js';
import type { SessionCredentialStore } from '../../browser/ai/session-credential-store.js';
import { createBrowserSessionStorage } from '../../browser/ai/session-storage.js';
import type { SessionScopedStorage } from '../../browser/ai/session-storage.js';
import {
  SETTINGS_KEY_PRESENT_IN_SESSION,
  SETTINGS_KEY_REQUIRED,
  SETTINGS_STATUS_UNCONFIGURED,
} from '../../ui/copy.js';
import { createAppSession } from '../../ui/session/app-session.js';
import type { SessionCredentialPort } from '../../ui/session/app-session.js';
import { createBrowserUiGateway } from '../../ui/session/browser-gateway.js';
import type { SettingsDraft } from '../../ui/settings/provider-presets.js';
import {
  EMPTY_SETTINGS_DRAFT,
  findPreset,
  providerConfigOf,
  settingsWarnings,
  validateSettingsDraft,
} from '../../ui/settings/provider-presets.js';
import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import { REPO_ROOT, repoFiles, stripComments } from '../ai/source-scan.js';
import { createMockTransport, okResponse, providerShapedBody } from '../ai/fixtures.js';

/* ================================================================== *
 * Fixtures
 * ================================================================== */

/** Fake keys only. `-2` is the replacement the task nominates for the "replace the key" case. */
const FIXTURE_KEY = 'sk-fixture-NOT-A-REAL-KEY-PSA';
const FIXTURE_KEY_2 = 'sk-fixture-NOT-A-REAL-KEY-PSA-2';
/** A credential belonging to a DIFFERENT provider, to prove clearing cannot reach it. */
const OTHER_PROVIDER_KEY = 'sk-fixture-OTHER-PROVIDER-0001';

const DEEPSEEK = 'deepseek';
const OTHER_PROVIDER = 'moonshot';
const WORKSPACE_LABEL = 'fixture-ws';
const SEEDED_FILE = 'attempts/ATT-fixture-0001.json';
const SEEDED_BODY = '{"fixture":true}\n';

function deepseekDraft(api_key: string): SettingsDraft {
  const preset = findPreset(DEEPSEEK);
  assert.ok(preset !== null, 'the DeepSeek preset must exist');
  return { provider_id: DEEPSEEK, model: preset.default_model, api_key, custom_base_url: '' };
}

function refOf(provider_id: string): ReturnType<typeof credentialRefForProvider> {
  return credentialRefForProvider(provider_id);
}

/* ================================================================== *
 * The browser-session model + the application harness
 * ================================================================== */

/**
 * One browser tab: the per-tab storage DATA, not a Storage object.
 *
 * 🔴 That distinction is what makes the reload honest - a reload keeps the data and hands the page a
 *    NEW `sessionStorage` object, while closing the tab discards it.
 */
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
  readonly credentials: SessionCredentialStore;
  readonly session: ReturnType<typeof createAppSession>;
  readonly storage: InMemoryWorkspaceStorage;
  readonly transport: ReturnType<typeof createMockTransport>;
  /** How many times the session asked for a reader - i.e. how many times a directory was authorized. */
  readonly attach_calls: () => number;
}

/**
 * Rebuilds the whole application over ONE tab, mirroring `src/ui/bootstrap.ts`.
 *
 * 🔴 THE PORT IS THE PRODUCTION ONE. `has` and `clear` derive their ref with
 *    `credentialRefForProvider`, exactly like the bootstrap, so "clear names one provider" is a
 *    property of the shipped code and not of the test.
 */
function buildApplication(tab: BrowserTab): App {
  const credentials = createSessionCredentialStore(
    createBrowserSessionStorage({ sessionStorage: sessionStorageViewOf(tab) }),
  );
  const port: SessionCredentialPort = {
    has: (provider_id) => credentials.has(refOf(provider_id)),
    clear: (provider_id) => {
      credentials.remove(refOf(provider_id));
    },
  };
  const storage = new InMemoryWorkspaceStorage({ [SEEDED_FILE]: SEEDED_BODY });
  const transport = createMockTransport(() => okResponse(providerShapedBody()));
  let attach_calls = 0;

  const session = createAppSession({
    credentials: port,
    attachStorage: () => {
      attach_calls += 1;
      return null;
    },
    initial_draft: EMPTY_SETTINGS_DRAFT,
    createGateway: ({ config, api_key }) => {
      if (api_key.trim().length > 0) {
        credentials.put(refOf(String(config.provider_id)), api_key);
      }
      return createBrowserUiGateway({ storage, config, credentials, transport });
    },
  });

  return { credentials, session, storage, transport, attach_calls: () => attach_calls };
}

/** One reload: the tab keeps its data, the page is rebuilt from scratch. */
function reload(tab: BrowserTab): App {
  return buildApplication(tab);
}

/**
 * The state after 「the app is open, a workspace is authorized, the user picked DeepSeek」.
 *
 * 🔴 The model default arrives through `chooseSettingsPreset`, not through the initial draft, so the
 *    ONLY way a credential can exist is the explicit save these helpers perform.
 */
async function configure(app: App, api_key: string): Promise<void> {
  await app.session.attachWorkspace(WORKSPACE_LABEL);
  app.session.chooseSettingsPreset(DEEPSEEK);
  app.session.openSettings();
  app.session.updateSettingsDraft({ api_key });
  await app.session.saveSettings();
}

/**
 * The advice the panel would render, derived from state + the pure rule - no DOM needed.
 *
 * 🔴 ONLY THE POSITIVE CREDENTIAL CASE IS ADVICE (`CORRECTION-03` §11): "the session already holds a
 *    key, so you may save as it stands". The negative case is a BLOCKING reason - see `blockingOf`.
 */
function adviceOf(app: App): readonly string[] {
  const state = app.session.getState();
  return settingsWarnings(state.settings_draft, {
    session_credential_present: state.settings_key_in_session,
  });
}

/** The BLOCKING reasons the panel would render. The credential gate lives here (`PSA-D2 = B`). */
function blockingOf(app: App): readonly string[] {
  const state = app.session.getState();
  return validateSettingsDraft(state.settings_draft, {
    session_credential_present: state.settings_key_in_session,
  });
}

/**
 * The value(s) the carrier holds under this provider's credential key.
 *
 * 🔴 EXACT EQUALITY, NOT `includes`. `sk-fixture-…-PSA` is a PREFIX of `sk-fixture-…-PSA-2`, so a
 *    substring test would report the replacement key as if the old one were still there - or the
 *    reverse. A credential check must compare whole values.
 */
function storedCredentialValues(tab: BrowserTab, provider_id: string): readonly string[] {
  const key = sessionCredentialKey(refOf(provider_id));
  return [...tab.backing.entries()].filter(([stored_key]) => stored_key === key).map(([, value]) => value);
}

/* ================================================================== *
 * K - the clear action
 * ================================================================== */

describe('CORRECTION-02 ｜ IMPLEMENTATION INVARIANT｜the clear action really clears (K1-K10)', () => {
  it('IMPLEMENTATION INVARIANT (K1/K2): a saved key reaches the session store and LEAVES the form', async () => {
    const app = buildApplication(openBrowserTab());
    await configure(app, FIXTURE_KEY);

    assert.equal(app.session.getState().provider.status, 'ready');
    /*
     * 🔴 SUPERSEDED IN PLACE - `FINAL-RAPID-B` §10 (2026-09-26). This case used to assert
     *    `settings_draft.api_key === FIXTURE_KEY`, i.e. "the form keeps it". The save path now EMPTIES
     *    that field once the key really is in the session store, so the plaintext stops being carried
     *    by a field the panel re-renders, and reopening the panel shows an empty input (advice comes
     *    from `settings_key_in_session`, the boolean, exactly as `CORRECTION-02` §4 intended).
     *    The property K1/K2 exists for is UNCHANGED - a saved key reaches the store - so it is asserted
     *    there, and the previous expectation is recorded here instead of being deleted. The boundary
     *    (with NO credential port wired, the field keeps the key because nothing else holds it) is
     *    pinned in `session-draft-plaintext.test.ts`.
     */
    assert.equal(app.session.getState().settings_draft.api_key, '', 'the plaintext leaves the form');
    assert.equal(app.credentials.has(refOf(DEEPSEEK)), true, 'K2: the store must hold the credential');
  });

  it('IMPLEMENTATION INVARIANT (K3/K4): clearing removes the stored credential and the resolver returns null', async () => {
    const app = buildApplication(openBrowserTab());
    await configure(app, FIXTURE_KEY);
    const ref = refOf(DEEPSEEK);
    assert.ok(app.credentials.resolve(ref) !== null, 'precondition: it resolves before the clear');

    app.session.clearCredential();

    assert.equal(app.credentials.has(ref), false, 'K3: the store must no longer have the credential');
    assert.equal(app.credentials.resolve(ref), null, 'K4: the resolver must return null');
    assert.deepEqual([...app.credentials.list_refs()], [], 'no ref may be left behind');
  });

  it('IMPLEMENTATION INVARIANT (K5): clearing empties the API Key input value in the draft', async () => {
    const app = buildApplication(openBrowserTab());
    await configure(app, FIXTURE_KEY);

    app.session.clearCredential();

    assert.equal(app.session.getState().settings_draft.api_key, '', 'K5: the field must be empty');
    assert.equal(
      app.session.getState().settings_draft.model,
      'deepseek-flash',
      'the provider/model are kept, so only a new key has to be supplied',
    );
  });

  it('IMPLEMENTATION INVARIANT (K6): after a clear the provider stops reporting ready', async () => {
    const app = buildApplication(openBrowserTab());
    await configure(app, FIXTURE_KEY);

    app.session.clearCredential();

    const provider = app.session.getState().provider;
    assert.notEqual(provider.status, 'ready', 'K6: a composition that cannot authenticate is not ready');
    assert.equal(provider.status, 'unconfigured', 'the CANONICAL unconfigured state is reused');
    assert.equal(provider.key_present, false);
    assert.equal(
      SETTINGS_STATUS_UNCONFIGURED,
      '模型服务未配置',
      'the top bar derives this sentence for `unconfigured`, so the badge cannot still imply a live connection',
    );

    /* 🔴 The command path is really gone, not merely relabelled: a model action now asks for settings. */
    app.session.openNewAttempt();
    app.session.setRawInput('fixture raw input');
    await app.session.beginCapture();
    assert.equal(
      app.session.getState().ai_requires_model,
      true,
      'a command with no usable provider must raise the existing "model required" guidance',
    );
  });

  it('IMPLEMENTATION INVARIANT (K7): clearing leaves the workspace authorized and never re-picks a directory', async () => {
    const app = buildApplication(openBrowserTab());
    await configure(app, FIXTURE_KEY);
    assert.equal(app.attach_calls(), 1, 'precondition: one authorization');

    app.session.clearCredential();

    const workspace = app.session.getState().workspace;
    assert.equal(workspace.status, 'connected', 'K7: the workspace must stay connected');
    assert.equal(workspace.label, WORKSPACE_LABEL);
    assert.equal(workspace.notice, null);
    assert.equal(app.attach_calls(), 1, 'no second directory authorization may be triggered by a clear');
  });

  it('IMPLEMENTATION INVARIANT (K8): clearing one provider never touches another provider credential', async () => {
    const app = buildApplication(openBrowserTab());
    await configure(app, FIXTURE_KEY);
    /* A second provider's credential, written the way the store is always written. */
    app.credentials.put(refOf(OTHER_PROVIDER), OTHER_PROVIDER_KEY);

    app.session.clearCredential();

    assert.equal(app.credentials.has(refOf(DEEPSEEK)), false, 'the named provider is cleared');
    assert.equal(app.credentials.has(refOf(OTHER_PROVIDER)), true, 'K8: the other provider is untouched');
    const other = app.credentials.resolve(refOf(OTHER_PROVIDER));
    assert.ok(other !== null);
    assert.equal(
      JSON.stringify([...app.credentials.list_refs()]),
      JSON.stringify([`provider:${OTHER_PROVIDER}`]),
      'exactly the other provider ref remains',
    );
  });

  it('IMPLEMENTATION INVARIANT (K9): after a clear no request can carry the old Authorization header', async () => {
    const app = buildApplication(openBrowserTab());
    await configure(app, FIXTURE_KEY);
    /*
     * 🔴 Built BEFORE the clear, i.e. while the session still holds the credential - which is exactly
     *    what `session_credential_present: true` states. The config itself never contains a key; this
     *    case is about the ADAPTER's runtime defence, which must keep working after the clear.
     */
    const config = providerConfigOf(deepseekDraft(''), { session_credential_present: true });
    assert.ok(config !== null, 'the DeepSeek preset must produce a config');
    const ref = refOf(DEEPSEEK);
    const invocation = {
      provider_id: config.provider_id,
      credential_ref: ref,
      request: {
        provider_id: config.provider_id,
        model: config.model,
        messages: [{ role: 'user' as const, content: 'fixture request body' }],
        structured_output: null,
      },
    };

    /* Non-vacuity: BEFORE the clear the very same call DOES authorise and DOES send. */
    const before = composeBrowserProvider({ config, credentials: app.credentials, transport: app.transport });
    assert.equal(before.kind, 'composed');
    if (before.kind !== 'composed') {
      return;
    }
    const sent = await before.adapter.execute(invocation);
    assert.equal(sent.kind, 'ok', 'precondition: the fixture response is accepted');
    assert.equal(app.transport.calls.length, 1);
    assert.equal(app.transport.calls[0]?.headers['authorization'], `Bearer ${FIXTURE_KEY}`);

    app.session.clearCredential();

    /* AFTER the clear the adapter must REFUSE rather than send a stale header. */
    const after = composeBrowserProvider({ config, credentials: app.credentials, transport: app.transport });
    assert.equal(after.kind, 'composed', 'the provider still composes - only the credential is gone');
    if (after.kind !== 'composed') {
      return;
    }
    const refused = await after.adapter.execute(invocation);
    assert.equal(refused.kind, 'error', 'K9: a request with no credential must fail explicitly');
    if (refused.kind === 'error') {
      assert.equal(refused.error.code, 'PROVIDER_CREDENTIAL_MISSING');
    }
    /*
     * 🔴 The transport list ACCUMULATES across the whole case, so the post-clear question is asked of
     *    the requests made AFTER the clear - which must be none at all.
     */
    assert.equal(app.transport.calls.length, 1, 'NO further request may leave the browser');
    assert.deepEqual(
      app.transport.calls.slice(1),
      [],
      'the cleared key must never appear in a request again',
    );
  });

  it('IMPLEMENTATION INVARIANT (K10): after a clear a NEW key restores ready without touching the workspace', async () => {
    const app = buildApplication(openBrowserTab());
    await configure(app, FIXTURE_KEY);
    app.session.clearCredential();
    assert.equal(app.session.getState().provider.status, 'unconfigured');

    app.session.updateSettingsDraft({ api_key: FIXTURE_KEY_2 });
    await app.session.saveSettings();

    assert.equal(app.session.getState().provider.status, 'ready', 'K10: the provider recovers');
    const restored = app.credentials.resolve(refOf(DEEPSEEK));
    assert.ok(restored !== null);
    assert.equal(
      JSON.stringify(app.transport.calls),
      '[]',
      'composing a provider must still make no provider call',
    );
    assert.equal(app.session.getState().workspace.status, 'connected', 'the workspace never moved');
    assert.equal(app.attach_calls(), 1, 'and no directory was re-picked');
    assert.deepEqual(
      [...app.credentials.list_refs()],
      [`provider:${DEEPSEEK}`],
      'the replacement overwrote the single slot - it did not add a second credential',
    );
  });
});

/* ================================================================== *
 * U - a refresh that finds a credential already in the session
 * ================================================================== */

describe('CORRECTION-02 ｜ IMPLEMENTATION INVARIANT｜refresh with an existing key (U1-U10)', () => {
  it('IMPLEMENTATION INVARIANT (U1-U3): the credential is saved, then survives a reload', async () => {
    const tab = openBrowserTab();
    const before = buildApplication(tab);
    await configure(before, FIXTURE_KEY);

    const after = reload(tab);

    assert.notEqual(after.credentials, before.credentials, 'the reload must build a NEW store');
    assert.equal(after.credentials.has(refOf(DEEPSEEK)), true, 'U3: the credential survives the refresh');
    const secret = after.credentials.resolve(refOf(DEEPSEEK));
    assert.ok(secret !== null);
    assert.equal(
      typeof secret,
      'object',
      'the value is still held as an opaque secret handle, not as a plain string in view state',
    );
  });

  it('IMPLEMENTATION INVARIANT (U4/U5): the refreshed form is empty while the store still holds the key', async () => {
    const tab = openBrowserTab();
    const before = buildApplication(tab);
    await configure(before, FIXTURE_KEY);

    const after = reload(tab);
    await after.session.attachWorkspace(WORKSPACE_LABEL);
    after.session.openSettings();
    after.session.chooseSettingsPreset(DEEPSEEK);

    assert.equal(after.session.getState().settings_draft.api_key, '', 'U4: the input stays EMPTY');
    assert.equal(after.session.getState().settings_key_in_session, true, 'U5: the session holds a key');
  });

  it('IMPLEMENTATION INVARIANT (U6/U7): the advice states the existing key instead of asking for one', async () => {
    const tab = openBrowserTab();
    const before = buildApplication(tab);
    await configure(before, FIXTURE_KEY);

    const after = reload(tab);
    await after.session.attachWorkspace(WORKSPACE_LABEL);
    after.session.openSettings();
    after.session.chooseSettingsPreset(DEEPSEEK);

    const advice = adviceOf(after);
    assert.ok(!advice.includes(SETTINGS_KEY_REQUIRED), 'U6: it must NOT ask for a key the session holds');
    assert.ok(advice.includes(SETTINGS_KEY_PRESENT_IN_SESSION), 'U7: it must SAY the key already exists');
    assert.ok(
      SETTINGS_KEY_PRESENT_IN_SESSION.includes('当前浏览器会话已有 API Key'),
      'the canonical sentence states the fact',
    );
    /*
     * 🔴 AND THE GATE IS OPEN IN THIS STATE (`PSA-D2 = B`): an empty field is legitimate precisely
     *    because the session holds the credential, so NOTHING may block the save (`CORRECTION-03` §5).
     */
    assert.deepEqual(blockingOf(after), [], 'an existing session credential must leave the save unblocked');
    assert.ok(
      !blockingOf(after).includes(SETTINGS_KEY_REQUIRED),
      'the key-required sentence must not appear as a blocking reason here',
    );
  });

  it('IMPLEMENTATION INVARIANT (U8): no code path can rehydrate the stored key into the form', async () => {
    const tab = openBrowserTab();
    const before = buildApplication(tab);
    await configure(before, FIXTURE_KEY);

    const after = reload(tab);
    await after.session.attachWorkspace(WORKSPACE_LABEL);
    after.session.openSettings();
    after.session.chooseSettingsPreset(DEEPSEEK);

    /* (a) the runtime value is empty while the store holds the key */
    assert.equal(after.session.getState().settings_draft.api_key, '');
    assert.equal(after.credentials.has(refOf(DEEPSEEK)), true);

    /* (b) the whole view state is free of the secret, not just the one field */
    const serialised = JSON.stringify(after.session.getState());
    assert.ok(!serialised.includes(FIXTURE_KEY), 'U8: the key must not appear anywhere in view state');

    /* (c) the App Shell source has no way to READ a secret: no resolve, no reveal, no secret factory */
    const offenders: string[] = [];
    for (const file of repoFiles('src/ui')) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const forbidden of ['.resolve(', 'revealCredentialSecret', 'credentialSecret']) {
        if (code.includes(forbidden)) {
          offenders.push(`${relative(REPO_ROOT, file).replace(/\\/gu, '/')} contains "${forbidden}"`);
        }
      }
    }
    assert.deepEqual(offenders, [], `the App Shell must not be able to read a stored secret:\n${offenders.join('\n')}`);
  });

  it('IMPLEMENTATION INVARIANT (U9): saving with the field left empty succeeds and uses the stored key', async () => {
    const tab = openBrowserTab();
    const before = buildApplication(tab);
    await configure(before, FIXTURE_KEY);

    const after = reload(tab);
    await after.session.attachWorkspace(WORKSPACE_LABEL);
    after.session.openSettings();
    after.session.chooseSettingsPreset(DEEPSEEK);

    await after.session.saveSettings();

    const provider = after.session.getState().provider;
    assert.equal(provider.status, 'ready', 'U9: the configuration composes again');
    assert.equal(provider.key_present, false, 'no key was typed - the form is not the source of the key');
    assert.equal(after.session.getState().settings_open, false, 'a successful save closes the panel');
  });

  it('IMPLEMENTATION INVARIANT (U10): typing a new key overwrites the stored one', async () => {
    const tab = openBrowserTab();
    const before = buildApplication(tab);
    await configure(before, FIXTURE_KEY);

    const after = reload(tab);
    await after.session.attachWorkspace(WORKSPACE_LABEL);
    after.session.openSettings();
    after.session.chooseSettingsPreset(DEEPSEEK);
    after.session.updateSettingsDraft({ api_key: FIXTURE_KEY_2 });
    await after.session.saveSettings();

    const stored = after.credentials.resolve(refOf(DEEPSEEK));
    assert.ok(stored !== null);
    /* The raw value is held in a module-private WeakMap, so the ONLY checkable surface is the carrier. */
    assert.deepEqual(
      storedCredentialValues(tab, DEEPSEEK),
      [FIXTURE_KEY_2],
      'U10: exactly one slot, holding exactly the new key',
    );
    assert.ok(
      [...tab.backing.values()].every((value) => value !== FIXTURE_KEY),
      'and the old key is gone, not kept alongside it',
    );
    assert.deepEqual(
      [...after.credentials.list_refs()],
      [`provider:${DEEPSEEK}`],
      'one credential slot per provider - a replacement never creates a second entry',
    );
  });
});

/* ================================================================== *
 * N - a new browser session
 * ================================================================== */

describe('CORRECTION-02 ｜ IMPLEMENTATION INVARIANT｜a new session starts with no key (N1-N3)', () => {
  it('IMPLEMENTATION INVARIANT (N1): a new tab has no credential and no view-state claim of one', async () => {
    const first = openBrowserTab();
    const before = buildApplication(first);
    await configure(before, FIXTURE_KEY);

    const fresh = reload(openBrowserTab());
    await fresh.session.attachWorkspace(WORKSPACE_LABEL);
    fresh.session.openSettings();
    fresh.session.chooseSettingsPreset(DEEPSEEK);

    assert.equal(fresh.credentials.has(refOf(DEEPSEEK)), false, 'N1: nothing survives into a new session');
    assert.equal(fresh.credentials.resolve(refOf(DEEPSEEK)), null);
    assert.deepEqual([...fresh.credentials.list_refs()], []);
    assert.equal(fresh.session.getState().settings_key_in_session, false);
  });

  it('IMPLEMENTATION INVARIANT (N2/N3): a new session is asked for a key, and told nothing about an existing one', async () => {
    const fresh = reload(openBrowserTab());
    await fresh.session.attachWorkspace(WORKSPACE_LABEL);
    fresh.session.openSettings();
    fresh.session.chooseSettingsPreset(DEEPSEEK);

    /*
     * 🔴 ASKING FOR THE KEY IS A BLOCKING REASON SINCE `PSA-D2 = B` (`CORRECTION-03` §11): on a fresh
     *    session with no typed key there is no credential at all, so the save is refused and the
     *    sentence appears as a reason to fix - not as advice beside a save that would go through.
     */
    assert.ok(blockingOf(fresh).includes(SETTINGS_KEY_REQUIRED), 'N2: it must ask for a key');
    assert.ok(
      !adviceOf(fresh).includes(SETTINGS_KEY_PRESENT_IN_SESSION),
      'N3: it must NOT claim a key this session does not have',
    );
  });
});
