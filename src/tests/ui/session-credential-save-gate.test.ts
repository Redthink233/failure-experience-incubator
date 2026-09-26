/**
 * PRE-PSA-BLOCKER-01 / CORRECTION-03 ｜ THE CREDENTIAL-REQUIRED SAVE GATE.
 *
 * 🔴 THESE ARE `IMPLEMENTATION INVARIANT` CASES, NOT NEW PRODUCT `AC`. The task closes an already
 *    decided product rule (`PSA-D2 = B`, human decision) at the save boundary; it creates no
 *    acceptance point and changes no frozen contract. The canonical `AC`s the behaviour answers to
 *    (`AC-131`–`AC-162`) are unchanged, and every reference stays inside the existing `AC-01`–`AC-162`.
 *
 * ── THE RULE BEING PINNED ───────────────────────────────────────────────────────────
 *
 *     a model configuration may be SAVED only when
 *         credential_available = typed_api_key_present OR session_credential_present
 *
 *   Neither ⇒ the save is refused: nothing is composed, the panel stays open, the provider stays
 *   `unconfigured` and the top bar keeps saying 「模型服务未配置」.
 *
 * 🔴 WHAT THIS SUITE ALSO PINS, BECAUSE IT MUST NOT REGRESS: a missing key does NOT block BROWSING.
 *    Reading the workspace never went through the save gate (`S01-06-D1`), and G11/G12 drive that
 *    through the REAL read composition over a REAL seeded corpus - not through a stub.
 * 🔴 THE PORTS ARE REAL. The browse port is `composeBrowserWorkspaceReader` over
 *    `InMemoryWorkspaceStorage`; the command port is the real `createBrowserUiGateway` over the real
 *    `composeBrowserProvider`; the credential store is the real M13 store over a `sessionStorage`-shaped
 *    carrier that the reload model below treats exactly as a browser does. Nothing at the product
 *    boundary is mocked, and `Real Provider Calls = 0` (every transport is a mock).
 * 🔴 EVERY SECRET IS A FAKE `sk-fixture-…` VALUE.
 *
 * G1-G7 the gate ｜ G8-G10 the allowed saves ｜ G11-G12 browsing ｜ G13-G14 the boundaries.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { describe, it } from 'node:test';

import { composeBrowserProvider } from '../../browser/application/provider-composition.js';
import { composeBrowserWorkspaceReader } from '../../browser/application/workspace-reader-composition.js';
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
import type { AppSession, SessionCredentialPort } from '../../ui/session/app-session.js';
import { createBrowserUiGateway } from '../../ui/session/browser-gateway.js';
import { createUiReadPort } from '../../ui/session/ui-port.js';
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
import { makeWorkflowHarness, parsePayload, seedHistory } from '../application/workflow/harness.js';

/* ================================================================== *
 * Fixtures
 * ================================================================== */

const FIXTURE_KEY = 'sk-fixture-NOT-A-REAL-KEY-PSA';
const FIXTURE_KEY_2 = 'sk-fixture-NOT-A-REAL-KEY-PSA-2';
const DEEPSEEK = 'deepseek';
const WORKSPACE_LABEL = 'fixture-ws';

function deepseekDraft(api_key: string): SettingsDraft {
  const preset = findPreset(DEEPSEEK);
  assert.ok(preset !== null, 'the DeepSeek preset must exist');
  return { provider_id: DEEPSEEK, model: preset.default_model, api_key, custom_base_url: '' };
}

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
  readonly credentials: SessionCredentialStore;
  readonly session: AppSession;
  readonly transport: ReturnType<typeof createMockTransport>;
  readonly storage: InMemoryWorkspaceStorage;
  /** How many times the session asked the gateway factory to compose - the gate's observable effect. */
  readonly gateway_calls: () => number;
  /** How many times a directory was authorized. */
  readonly attach_calls: () => number;
}

/**
 * The whole application over one tab - the bootstrap's wiring, plus a REAL browse path.
 *
 * 🔴 `attachStorage` returns a real `UiReadPort`, so "a workspace can be browsed with no model at all"
 *    is decided by production code. `createGateway` is the same body the bootstrap uses.
 */
async function wire(tab: BrowserTab): Promise<App> {
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
  const harness = makeWorkflowHarness({
    storage,
    parse: parsePayload({ result_status_proposal: '未达到目标' }),
  });
  await seedHistory(harness);
  const reader = composeBrowserWorkspaceReader({ storage });
  const read_port = createUiReadPort({ reads: reader.reads, index: reader.index });
  const transport = createMockTransport(() => okResponse(providerShapedBody()));

  let gateway_calls = 0;
  let attach_calls = 0;
  const session = createAppSession({
    credentials: port,
    attachStorage: () => {
      attach_calls += 1;
      return read_port;
    },
    initial_draft: EMPTY_SETTINGS_DRAFT,
    createGateway: ({ config, api_key }) => {
      gateway_calls += 1;
      if (api_key.trim().length > 0) {
        credentials.put(refOf(String(config.provider_id)), api_key);
      }
      return createBrowserUiGateway({ storage, config, credentials, transport });
    },
  });

  return { credentials, session, transport, storage, gateway_calls: () => gateway_calls, attach_calls: () => attach_calls };
}

/** Authorize a workspace, open the panel and select the DeepSeek candidate - no key typed yet. */
async function openPanelOnDeepseek(app: App): Promise<void> {
  await app.session.attachWorkspace(WORKSPACE_LABEL);
  app.session.openSettings();
  app.session.chooseSettingsPreset(DEEPSEEK);
}

/** The BLOCKING reasons the panel would render for the current state. */
function blockingOf(app: App): readonly string[] {
  const state = app.session.getState();
  return validateSettingsDraft(state.settings_draft, {
    session_credential_present: state.settings_key_in_session,
  });
}

/* ================================================================== *
 * G1-G7 - the gate
 * ================================================================== */

describe('CORRECTION-03 ｜ IMPLEMENTATION INVARIANT｜the credential-required save gate (G1-G7)', () => {
  it('IMPLEMENTATION INVARIANT (G1-G7): with no typed key and no session key the save is refused', async () => {
    const app = await wire(openBrowserTab());
    await openPanelOnDeepseek(app);
    const gateway_calls_before = app.gateway_calls();

    await app.session.saveSettings();

    const state = app.session.getState();
    /* G1 - the panel stays open. */
    assert.equal(state.settings_open, true, 'G1: the panel must stay open');
    /* G2 - the provider never becomes ready, and no new state is invented. */
    assert.equal(state.provider.status, 'unconfigured', 'G2: the provider stays unconfigured');
    assert.notEqual(state.provider.status, 'ready');
    /* G3 - the reason is an INPUT reason, rendered in the panel. */
    assert.ok(state.settings_errors.includes(SETTINGS_KEY_REQUIRED), 'G3: the panel must ask for the key');
    assert.equal(state.settings_save_error, null, 'a missing key is not a composition failure');
    /* G4 - nothing was composed. */
    assert.equal(app.gateway_calls(), gateway_calls_before, 'G4: the gateway must not be composed');
    /* G5 - and therefore no provider call could happen. */
    assert.equal(app.transport.calls.length, 0, 'G5: no request may leave the browser');
    /* G7 - the top bar's two inputs are unchanged. */
    assert.equal(state.provider.key_present, false);
    assert.equal(SETTINGS_STATUS_UNCONFIGURED, '模型服务未配置', 'the top bar says this for `unconfigured`');
  });

  it('IMPLEMENTATION INVARIANT (G4/G5): the refusal is repeatable and never composes behind the user', async () => {
    const app = await wire(openBrowserTab());
    await openPanelOnDeepseek(app);

    await app.session.saveSettings();
    await app.session.saveSettings();
    await app.session.closeSettings();
    app.session.openSettings();
    await app.session.saveSettings();

    assert.equal(app.gateway_calls(), 0, 'three refused saves must compose zero providers');
    assert.equal(app.transport.calls.length, 0);
    assert.equal(app.session.getState().provider.status, 'unconfigured');
  });

  it('IMPLEMENTATION INVARIANT (G3): the blocking reason is derived in the PANEL, not only in a page notice', () => {
    /* 🔴 The gate lives in the pure validator; the panel renders that validator's blocking list under
     *    `SETTINGS_ERRORS_HEADING` INSIDE the overlay, which is what makes it visible while the form is
     *    open (task §11: 「不得只在页面外部 notice 显示」). */
    const panel = stripComments(readFileSync(`${REPO_ROOT}/src/ui/components/shell.ts`, 'utf8'));
    const start = panel.indexOf('export function settingsCenter(');
    assert.ok(start >= 0, 'the Settings Center must exist');
    const body = panel.slice(start);
    assert.ok(body.includes('feedbackBlock(SETTINGS_ERRORS_HEADING, blocking'), 'the reasons render inline');
    assert.ok(/validateSettingsDraft\(\s*draft,/u.test(body), 'the panel asks the gate for those reasons');
    assert.ok(body.includes('SETTINGS_KEY_REQUIRED') === false, 'the sentence itself lives in the copy deck');
  });
});

/* ================================================================== *
 * G8-G10 - the saves that MUST go through
 * ================================================================== */

describe('CORRECTION-03 ｜ IMPLEMENTATION INVARIANT｜the saves that are allowed (G8-G10)', () => {
  it('IMPLEMENTATION INVARIANT (G8): after a reload the field is EMPTY and the save still goes through', async () => {
    const tab = openBrowserTab();
    const first = await wire(tab);
    await openPanelOnDeepseek(first);
    first.session.updateSettingsDraft({ api_key: FIXTURE_KEY });
    await first.session.saveSettings();
    assert.equal(first.session.getState().provider.status, 'ready', 'precondition: it was configured');

    /* A reload: SAME tab data, NEW store, NEW application - the real shape of it. */
    const second = await wire(tab);
    await openPanelOnDeepseek(second);

    assert.equal(second.session.getState().settings_draft.api_key, '', 'the field is empty after a reload');
    assert.equal(second.credentials.has(refOf(DEEPSEEK)), true, 'while the session still holds the key');
    assert.deepEqual(blockingOf(second), [], 'G8: the gate must be OPEN - the session holds the key');

    const calls_before = second.gateway_calls();
    await second.session.saveSettings();

    assert.equal(second.session.getState().provider.status, 'ready', 'G8: the save must succeed');
    assert.equal(second.session.getState().settings_open, false, 'a successful save closes the panel');
    assert.equal(second.gateway_calls(), calls_before + 1, 'exactly one composition');
    assert.equal(second.transport.calls.length, 0, 'and still no provider call');
  });

  it('IMPLEMENTATION INVARIANT (G9): a typed key on a session with NO credential may be saved', async () => {
    const app = await wire(openBrowserTab());
    await openPanelOnDeepseek(app);
    assert.equal(app.credentials.has(refOf(DEEPSEEK)), false, 'precondition: nothing stored yet');

    app.session.updateSettingsDraft({ api_key: FIXTURE_KEY });
    assert.deepEqual(blockingOf(app), [], 'a typed key satisfies the gate on its own');
    await app.session.saveSettings();

    assert.equal(app.session.getState().provider.status, 'ready', 'G9: the save must succeed');
    assert.equal(app.credentials.has(refOf(DEEPSEEK)), true, 'and the key reached the session store');
    assert.equal(app.transport.calls.length, 0);
  });

  it('IMPLEMENTATION INVARIANT (G10): a typed key REPLACES the stored one and leaves one slot', async () => {
    const tab = openBrowserTab();
    const app = await wire(tab);
    await openPanelOnDeepseek(app);
    app.session.updateSettingsDraft({ api_key: FIXTURE_KEY });
    await app.session.saveSettings();

    app.session.openSettings();
    app.session.chooseSettingsPreset(DEEPSEEK);
    app.session.updateSettingsDraft({ api_key: FIXTURE_KEY_2 });
    await app.session.saveSettings();

    assert.equal(app.session.getState().provider.status, 'ready', 'G10: the replacement composes');
    const key = sessionCredentialKey(refOf(DEEPSEEK));
    const stored = [...tab.backing.entries()].filter(([stored_key]) => stored_key === key).map(([, value]) => value);
    /* 🔴 EXACT equality: `…-PSA` is a PREFIX of `…-PSA-2`, so a substring test cannot separate them. */
    assert.deepEqual(stored, [FIXTURE_KEY_2], 'exactly one slot, holding exactly the new key');
    assert.ok(
      [...tab.backing.values()].every((value) => value !== FIXTURE_KEY),
      'the old key is gone, not kept alongside it',
    );
    assert.deepEqual([...app.credentials.list_refs()], [`provider:${DEEPSEEK}`]);
  });
});

/* ================================================================== *
 * G11-G12 - browsing is untouched
 * ================================================================== */

describe('CORRECTION-03 ｜ IMPLEMENTATION INVARIANT｜providerless browsing is untouched (G11-G12)', () => {
  it('IMPLEMENTATION INVARIANT (G11): with no provider and no key the workspace still lists its records', async () => {
    const app = await wire(openBrowserTab());
    assert.equal(app.session.getState().provider.status, 'unconfigured', 'no model is configured');

    await app.session.attachWorkspace(WORKSPACE_LABEL);

    const state = app.session.getState();
    assert.equal(state.workspace.status, 'connected', 'the workspace is readable without a model');
    assert.equal(state.attempts_loaded, true, 'the rail was listed');
    assert.ok(state.attempts.length > 0, 'G11: and it really has records - the check is not vacuous');
    /* 🔴 And the gate has not been involved at all: nothing was composed, nothing was called. */
    assert.equal(app.gateway_calls(), 0);
    assert.equal(app.transport.calls.length, 0);
  });

  it('IMPLEMENTATION INVARIANT (G11b): a blocked save does not take the browsing away', async () => {
    const app = await wire(openBrowserTab());
    await openPanelOnDeepseek(app);
    assert.equal(app.session.getState().attempts_loaded, true, 'precondition: records are listed');
    const listed = app.session.getState().attempts.length;

    await app.session.saveSettings();

    const state = app.session.getState();
    assert.equal(state.provider.status, 'unconfigured', 'the save was refused');
    assert.equal(state.workspace.status, 'connected', 'and the workspace is still there');
    assert.equal(state.attempts.length, listed, 'with the same records');
    /* 🔴 A refused save also does not spawn a model-required prompt: nothing was attempted. */
    assert.equal(state.ai_requires_model, false, 'the user has not asked for a model action');
  });

  it('IMPLEMENTATION INVARIANT (G12): neither a refused nor a successful save ever re-picks a directory', async () => {
    const app = await wire(openBrowserTab());
    await openPanelOnDeepseek(app);
    assert.equal(app.attach_calls(), 1, 'precondition: one authorization');

    await app.session.saveSettings(); /* refused */
    assert.equal(app.attach_calls(), 1, 'a refused save must not touch the workspace');

    app.session.updateSettingsDraft({ api_key: FIXTURE_KEY });
    await app.session.saveSettings(); /* accepted */
    assert.equal(app.attach_calls(), 1, 'nor does an accepted one');
    assert.equal(app.session.getState().workspace.label, WORKSPACE_LABEL, 'the same directory is still open');
  });

  it('IMPLEMENTATION INVARIANT (G6/G7): after CLEARING the key, saving directly is refused again', async () => {
    const app = await wire(openBrowserTab());
    await openPanelOnDeepseek(app);
    app.session.updateSettingsDraft({ api_key: FIXTURE_KEY });
    await app.session.saveSettings();
    assert.equal(app.session.getState().provider.status, 'ready', 'precondition: configured');

    app.session.openSettings();
    app.session.chooseSettingsPreset(DEEPSEEK);
    app.session.clearCredential();
    assert.equal(app.session.getState().provider.status, 'unconfigured', 'the clear downgrades it');

    const calls_before = app.gateway_calls();
    await app.session.saveSettings();

    const state = app.session.getState();
    /* 🔴 THE CORE REGRESSION OF THIS CORRECTION: this save used to compose a provider and put the
     *    false `ready` badge back (HANDOFF §23.9 `ADJACENT-04`). It must be refused now. */
    assert.equal(state.settings_open, true, 'G6: the panel stays open');
    assert.equal(state.provider.status, 'unconfigured', 'G7: the top bar keeps saying 模型服务未配置');
    assert.equal(state.provider.model, null, 'no provider identity is claimed');
    assert.equal(app.gateway_calls(), calls_before, 'G6: nothing is composed');
    assert.ok(state.settings_errors.includes(SETTINGS_KEY_REQUIRED), 'and the key is asked for again');
    assert.ok(Object.keys(app.storage.snapshot()).length > 0, 'the workspace files are untouched');
    assert.equal(state.workspace.status, 'connected', 'and it is still authorized');
  });
});

/* ================================================================== *
 * G13-G14 - the boundaries
 * ================================================================== */

describe('CORRECTION-03 ｜ IMPLEMENTATION INVARIANT｜the boundaries hold (G13-G14)', () => {
  it('IMPLEMENTATION INVARIANT (G13): the adapter keeps its runtime missing-credential defence', async () => {
    const app = await wire(openBrowserTab());
    await openPanelOnDeepseek(app);
    const config = deepseekConfig();
    const transport = app.transport;

    /* (a) with a credential the adapter sends; (b) with none it REFUSES rather than sending bare. */
    app.credentials.put(refOf(DEEPSEEK), FIXTURE_KEY);
    const with_key = composeBrowserProvider({ config, credentials: app.credentials, transport });
    assert.equal(with_key.kind, 'composed');
    if (with_key.kind !== 'composed') {
      return;
    }
    const sent = await with_key.adapter.execute(invocationFor(config));
    assert.equal(sent.kind, 'ok');
    assert.equal(transport.calls.length, 1);

    app.credentials.remove(refOf(DEEPSEEK));
    const without_key = composeBrowserProvider({ config, credentials: app.credentials, transport });
    assert.equal(without_key.kind, 'composed', 'the adapter still builds - the GATE is what refuses the save');
    if (without_key.kind !== 'composed') {
      return;
    }
    const refused = await without_key.adapter.execute(invocationFor(config));
    assert.equal(refused.kind, 'error', 'G13: the runtime defence must survive the save gate');
    if (refused.kind === 'error') {
      assert.equal(refused.error.code, 'PROVIDER_CREDENTIAL_MISSING');
    }
    assert.equal(transport.calls.length, 1, 'and it sends nothing at all');
  });

  it('IMPLEMENTATION INVARIANT (G14): no new provider state was introduced', () => {
    /* (a) the state union is still exactly the three canonical values. */
    const session_source = stripComments(readFileSync(`${REPO_ROOT}/src/ui/session/app-session.ts`, 'utf8'));
    assert.ok(
      /status:\s*'unconfigured'\s*\|\s*'ready'\s*\|\s*'unsupported'/u.test(session_source),
      'the ProviderState status union must stay exactly unconfigured | ready | unsupported',
    );

    /* (b) and none of the names this correction was told not to invent exists anywhere. */
    const forbidden = ['configured_missing_key', 'credential_required', 'partial_ready', 'auth_pending'];
    const offenders: string[] = [];
    for (const file of [...repoFiles('src/ui'), ...repoFiles('src/browser'), ...repoFiles('src/application')]) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const name of forbidden) {
        if (code.includes(name)) {
          offenders.push(`${relative(REPO_ROOT, file).replace(/\\/gu, '/')} contains "${name}"`);
        }
      }
    }
    assert.deepEqual(offenders, [], `no new provider state may be introduced:\n${offenders.join('\n')}`);

    /* (c) the only credential message still in the ADVICE class is the POSITIVE one. */
    assert.deepEqual(
      settingsWarnings(deepseekDraft(''), {}),
      [],
      'nothing is advised when no credential is available - that case is a blocking reason now',
    );
    assert.deepEqual(
      settingsWarnings(deepseekDraft(''), { session_credential_present: true }),
      [SETTINGS_KEY_PRESENT_IN_SESSION],
      'the positive message is the only credential advice',
    );
  });
});

/* ------------------------------------------------------------------ *
 * G13 helpers
 * ------------------------------------------------------------------ */

/** The DeepSeek candidate config, built the way the session builds it for a session-held key. */
function deepseekConfig(): NonNullable<ReturnType<typeof providerConfigOf>> {
  const config = providerConfigOf(deepseekDraft(''), { session_credential_present: true });
  assert.ok(config !== null, 'the DeepSeek candidate must produce a config');
  return config;
}

/** A minimal `AiInvocation` for the DeepSeek provider. */
function invocationFor(config: NonNullable<ReturnType<typeof providerConfigOf>>) {
  return {
    provider_id: config.provider_id,
    credential_ref: refOf(DEEPSEEK),
    request: {
      provider_id: config.provider_id,
      model: config.model,
      messages: [{ role: 'user' as const, content: 'fixture request body' }],
      structured_output: null,
    },
  };
}
