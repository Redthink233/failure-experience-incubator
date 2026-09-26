/**
 * S01-06B ｜ The App Shell in PROVIDER-LESS mode - B1 / B10 / B11 / B12 / B13.
 *
 * 🔴 WHAT THIS SUITE PROVES: choosing a workspace is enough to browse it (left rail, centre, right
 *    rail), that clicking an AI action in that state produces GUIDANCE rather than a system error,
 *    that configuring a model afterwards upgrades the SAME storage to the full `D9` workflow without
 *    re-picking a directory or losing the selection, and that a workspace failure and a provider
 *    failure are reported as two DIFFERENT things.
 * 🔴 THE PORTS ARE REAL. The browse port is `composeBrowserWorkspaceReader` over
 *    `InMemoryWorkspaceStorage`; the command port is the real `M15` over the SAME storage with the
 *    deterministic fake provider. Nothing is mocked at the product boundary.
 * 🔴 `Real Provider Calls = 0`; every model answer is a hand-written `NOT_A_REAL_LLM_OUTPUT` fixture.
 *
 * Canonical references used: AC-130 / AC-150 / AC-156 / AC-158. No `AC` is created.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { credentialRefForProvider } from '../../browser/ai/session-credential-store.js';
import { composeBrowserWorkspaceReader } from '../../browser/application/workspace-reader-composition.js';
import { createWorkflowAttemptIndex } from '../../application/workflow/attempt-summaries.js';
import { workflowNotice } from '../../application/workflow/errors.js';
import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import type { UiReadPort, UiWorkflowPort } from '../../ui/session/ui-port.js';
import { createUiReadPort, createUiWorkflowPort } from '../../ui/session/ui-port.js';
import { createAppSession } from '../../ui/session/app-session.js';
import type { AppSession } from '../../ui/session/app-session.js';
import {
  ID_SOURCE,
  makeWorkflowHarness,
  parsePayload,
  seedHistory,
} from '../application/workflow/harness.js';

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

interface Browserless {
  readonly session: AppSession;
  readonly read_port: UiReadPort;
  readonly harness: ReturnType<typeof makeWorkflowHarness>;
  readonly attach_calls: () => number;
  setProviderUsable(value: boolean): void;
}

/**
 * Wires an App Session exactly the way the browser bootstrap does: ONE reader built from the
 * authorized storage, plus a command gateway that may or may not be usable.
 *
 * 🔴 `start_with_provider = false` is the state S01-06-D1 is about: a workspace exists, a model does
 *    not, and the workspace is still fully browsable.
 */
async function wire(start_with_provider: boolean): Promise<Browserless> {
  const storage = new InMemoryWorkspaceStorage();
  const harness = makeWorkflowHarness({
    storage,
    parse: parsePayload({ result_status_proposal: '未达到目标' }),
  });
  /* 🔴 The corpus, a `Formal` source record AND step ⑥ already run - so every kind of persisted
   * object a browse can meet really exists. */
  await seedHistory(harness);

  const reader = composeBrowserWorkspaceReader({ storage });
  /* 🔴 The SAME storage the reader was built over - the composition root never re-opens one. */
  const read_port: UiReadPort = createUiReadPort({ reads: reader.reads, index: reader.index });

  let attach_calls = 0;
  let provider_usable = start_with_provider;

  const session = createAppSession({
    attachStorage: () => {
      attach_calls += 1;
      return read_port;
    },
    createGateway: () =>
      provider_usable
        ? {
            kind: 'ready',
            gateway: {
              port: createUiWorkflowPort({
                workflow: harness.workflow,
                index: createWorkflowAttemptIndex({
                  listAttempts: () => harness.attempts.listAttempts(),
                }),
                capture: harness.capture,
              }) satisfies UiWorkflowPort,
              credential_ref: credentialRefForProvider('browser-direct-custom'),
              connection_label: '连接方式：浏览器直连',
              provider_display_name: 'Fixture provider',
              model: 'fixture-model',
            },
          }
        : { kind: 'unsupported', message: '当前配置无法建立受支持的模型连接。' },
  });

  return {
    session,
    read_port,
    harness,
    attach_calls: () => attach_calls,
    setProviderUsable: (value: boolean) => {
      provider_usable = value;
    },
  };
}

/** The user gesture that authorizes a directory. No model has been configured at this point. */
async function chooseWorkspace(session: AppSession): Promise<void> {
  await session.attachWorkspace('fixture-workspace');
}

/** The user gesture that saves a model configuration (Provider + Model + API Key). */
async function configureModel(session: AppSession): Promise<void> {
  session.openSettings();
  session.updateSettingsDraft({
    model: 'fixture-model',
    custom_base_url: 'https://fixture.registry-fixture.test/v1/chat',
    api_key: 'sk-fixture-NOT-A-REAL-KEY-0000000000',
  });
  await session.saveSettings();
}

/* ------------------------------------------------------------------ *
 * B1 - browse with no model
 * ------------------------------------------------------------------ */

describe('S01-06B ｜ B1: choosing a workspace browses it with NO model configured', () => {
  it('B1 / AC-130: the rail lists existing records immediately after authorization', async () => {
    const wired = await wire(false);
    await chooseWorkspace(wired.session);

    const state = wired.session.getState();
    assert.equal(state.workspace.status, 'connected');
    /* 🔴 Both statements coexist in the top bar: a connected workspace AND an unconfigured model. */
    assert.equal(state.provider.status, 'unconfigured');
    assert.equal(state.attempts_loaded, true);
    assert.equal(state.attempts.length, 5, 'the corpus plus the seeded source');
    assert.equal(state.attempts.some((summary) => String(summary.attempt_id) === ID_SOURCE), true);
  });

  it('B1 / AC-130: an existing record opens, and its persisted results are readable', async () => {
    const wired = await wire(false);
    await chooseWorkspace(wired.session);
    await wired.session.selectAttempt(ID_SOURCE);

    const state = wired.session.getState();
    assert.ok(state.snapshot !== null, 'the centre must be able to open a persisted record');
    assert.equal(state.attempt_missing, false);
    /* 🔴 The stored derivation is readable in this mode - it is persisted data, not a computation. */
    assert.equal(state.snapshot.retrieval.state, 'ready');
    assert.equal(state.snapshot.retrieval.n_retrieval, 2);
    /* 🔴 Reading is not an AI action, so no guidance prompt appears. */
    assert.equal(state.ai_requires_model, false);
  });
});

/* ------------------------------------------------------------------ *
 * B10 / B11 - the upgrade
 * ------------------------------------------------------------------ */

describe('S01-06B ｜ B10 / B11: configuring a model upgrades the SAME workspace', () => {
  it('B10 / B11 / AC-156: no second directory pick and the selection survives the upgrade', async () => {
    const wired = await wire(false);
    await chooseWorkspace(wired.session);
    await wired.session.selectAttempt(ID_SOURCE);
    const selection_before = wired.session.getState().selected_attempt_id;
    const attaches_before = wired.attach_calls();

    wired.setProviderUsable(true);
    await configureModel(wired.session);

    const state = wired.session.getState();
    assert.equal(state.provider.status, 'ready');
    assert.equal(state.workspace.status, 'connected', 'a model change never unloads the workspace');
    assert.equal(wired.attach_calls(), attaches_before, 'no second picker call may happen');
    assert.equal(state.selected_attempt_id, selection_before, 'the selection is kept');

    /* 🔴 The action that needs a model now really runs, over the same storage. */
    const before = wired.harness.provider.insight_calls.length;
    await wired.session.generateInsights();
    assert.ok(
      wired.harness.provider.insight_calls.length > before,
      'the full D9 command path must be live after the upgrade',
    );
    assert.equal(wired.session.getState().ai_requires_model, false);
  });

  it('B10 / B14 / AC-130: a provider configured BEFORE the workspace is composed over the workspace then chosen', async () => {
    const wired = await wire(true);
    await configureModel(wired.session);
    /* 🔴 A model configured with no workspace: the state is honest and nothing is read. */
    assert.equal(wired.session.getState().workspace.status, 'unselected');
    assert.equal(wired.session.getState().attempts_loaded, false);

    await chooseWorkspace(wired.session);

    const state = wired.session.getState();
    assert.equal(state.workspace.status, 'connected');
    assert.equal(state.provider.status, 'ready');
    assert.equal(state.attempts_loaded, true);
  });
});

/* ------------------------------------------------------------------ *
 * B12 - guidance, not an error
 * ------------------------------------------------------------------ */

describe('S01-06B ｜ B12: an AI action with no model asks for the settings panel', () => {
  it('B12 / AC-150: the click raises the guidance flag and NO runtime notice, and the workspace survives', async () => {
    const wired = await wire(false);
    await chooseWorkspace(wired.session);
    await wired.session.selectAttempt(ID_SOURCE);

    const before = wired.harness.provider.invocations.length;
    const notices_before = wired.session.getState().notices.length;

    /* Every action the task lists as needing the full D9 composition. */
    await wired.session.beginCapture();
    await wired.session.rerunRetrieval();
    await wired.session.generateInsights();
    await wired.session.generateHypotheses();
    await wired.session.analyseCauses();
    await wired.session.saveFormal();
    await wired.session.setArchived(ID_SOURCE, true);

    const state = wired.session.getState();
    /* 🔴 Guidance, not a failure: the dedicated flag is set and NO notice was fabricated. */
    assert.equal(state.ai_requires_model, true);
    assert.equal(state.notices.length, notices_before, 'no GATE/RUNTIME notice may be invented');

    /* 🔴 The workspace is untouched, the record is still selected and still readable. */
    assert.equal(state.workspace.status, 'connected');
    assert.equal(state.attempts_loaded, true);
    assert.ok(state.snapshot !== null);
    assert.equal(state.snapshot.archive_state, 'active', 'a browse cannot mutate the record');

    /* 🔴 ProviderAdapter call count during the blocked actions = 0. */
    assert.equal(wired.harness.provider.invocations.length, before);
  });

  it('B12 / AC-150: opening the settings panel is the offered remedy and clears the prompt', async () => {
    const wired = await wire(false);
    await chooseWorkspace(wired.session);
    await wired.session.selectAttempt(ID_SOURCE);
    await wired.session.generateInsights();
    assert.equal(wired.session.getState().ai_requires_model, true);

    wired.session.openSettings();
    assert.equal(wired.session.getState().settings_open, true);
    assert.equal(wired.session.getState().ai_requires_model, false);
  });

  it('B12 / AC-156 / IMPLEMENTATION INVARIANT: the ⑩ trace stays available with no model and is not blocked by the command gate', async () => {
    const wired = await wire(false);
    await chooseWorkspace(wired.session);
    await wired.session.selectAttempt(ID_SOURCE);

    const before = wired.harness.provider.invocations.length;
    /* An unknown id: the READ route answers with its own GATE notice rather than being blocked. */
    await wired.session.traceHypothesis('HYP_00000000000000000000000000');

    const state = wired.session.getState();
    assert.equal(state.ai_requires_model, false, '「查看旧依据」 is a READ and must never be blocked');
    assert.equal(
      state.notices.some((notice) => notice.code === 'HYPOTHESIS_NOT_FOUND'),
      true,
    );
    assert.equal(wired.harness.provider.invocations.length, before);
  });
});

/* ------------------------------------------------------------------ *
 * B13 - two different statements
 * ------------------------------------------------------------------ */

describe('S01-06B ｜ B13: a workspace failure is NOT a provider failure', () => {
  it('B13 / AC-150: an unusable model leaves the workspace connected and the rail populated', async () => {
    const wired = await wire(false);
    await chooseWorkspace(wired.session);
    await wired.session.selectAttempt(ID_SOURCE);

    wired.setProviderUsable(false);
    await configureModel(wired.session);

    const state = wired.session.getState();
    assert.equal(state.provider.status, 'unsupported');
    assert.equal(state.provider.message, '当前配置无法建立受支持的模型连接。');
    /* 🔴 Provider unavailable: the workspace and its records stay exactly where they were. */
    assert.equal(state.workspace.status, 'connected');
    assert.equal(state.workspace.notice, null);
    assert.equal(state.attempts_loaded, true);
    assert.equal(state.attempts.length, 5);
    assert.ok(state.snapshot !== null, 'an existing record stays open');
  });

  it('B13 / AC-156: a workspace permission failure clears the reads, with its OWN notice', async () => {
    const wired = await wire(true);
    await configureModel(wired.session);
    await chooseWorkspace(wired.session);
    await wired.session.selectAttempt(ID_SOURCE);
    assert.equal(wired.session.getState().provider.status, 'ready');

    wired.session.reportWorkspaceFailure(workflowNotice('WORKSPACE_PERMISSION_DENIED'));

    const state = wired.session.getState();
    assert.equal(state.workspace.status, 'needs_authorization');
    assert.equal(state.workspace.notice?.code, 'WORKSPACE_PERMISSION_DENIED');
    assert.equal(state.attempts.length, 0, 'a lost directory really does remove every read');
    assert.equal(state.attempts_loaded, false);
    /* 🔴 The provider statement is a DIFFERENT one and is not overwritten by a workspace failure. */
    assert.notEqual(state.workspace.notice?.code, 'PROVIDER_CONNECTION_UNSUPPORTED');
  });
});
