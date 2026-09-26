/**
 * S01-06 ｜ WIRING SPEC - the App Shell driven through the REAL `M15` chain (task §61).
 *
 * 🔴 THE PORT IS REAL, NOT A MOCK OF THE PRODUCT. Each case composes `M15` over
 *    `InMemoryWorkspaceStorage` with the deterministic FAKE provider and then drives the App Shell's
 *    own intents. What is asserted is therefore "the interface calls the existing command, and only
 *    that command, at that moment" - the exact property the task fixes.
 * 🔴 NO DOMAIN FILE IS WRITTEN TO FAKE A SCREEN, and no page state is fabricated: the session is fed
 *    the same port the browser build would build (task §61 / §63).
 * 🔴 REAL PROVIDER CALLS = 0. The only model answers are the fixture payloads labelled
 *    `NOT_A_REAL_LLM_OUTPUT`.
 *
 * W1 新建 ⇒ `beginCapture` ｜ W2 确认 ⇒ 既有确认命令 ｜ W3 Formal 保存 ⇒ 保存并直接展示检索结果
 * W4 ⑧ 只由显式按钮触发 ｜ W5 ⑨ 只由显式按钮触发 ｜ W6 ⑨ 不以 ⑧ 的 `E5` 为前件
 * W7 ⑩ 追溯 ⇒ `traceHypothesis`
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { credentialRefForProvider } from '../../browser/ai/session-credential-store.js';
import { createWorkflowAttemptIndex } from '../../application/workflow/attempt-summaries.js';
import {
  ID_SOURCE,
  makeWorkflowHarness,
  parsePayload,
  seedHistoricalCorpus,
} from '../application/workflow/harness.js';
import type { UiWorkflowPort } from '../../ui/session/ui-port.js';
import { createUiWorkflowPort } from '../../ui/session/ui-port.js';
import { createAppSession } from '../../ui/session/app-session.js';
import type { AppSession } from '../../ui/session/app-session.js';
import { createOperationIdFactory, createOperationLedger } from '../../ui/session/operation-ids.js';

/* ------------------------------------------------------------------ *
 * Wiring
 * ------------------------------------------------------------------ */

interface Calls {
  read: number;
  list: number;
  insights: number;
  hypotheses: number;
  retrieval: number;
  trace: number;
  archive: number;
  /** CORRECTION-01 (D2): how many times the decision was written to the record. */
  persistCauses: number;
}

interface Wired {
  readonly session: AppSession;
  readonly calls: Calls;
  readonly harness: ReturnType<typeof makeWorkflowHarness>;
}

function wire(): Wired {
  const harness = makeWorkflowHarness({
    /* The only deviation from the default fixture: step ③ needs a proposed result status, because a
     * `Formal` save requires the user to settle it (AC-Q06-6). */
    parse: parsePayload({ result_status_proposal: '未达到目标' }),
  });

  const port = createUiWorkflowPort({
    workflow: harness.workflow,
    index: createWorkflowAttemptIndex({ listAttempts: () => harness.attempts.listAttempts() }),
    capture: harness.capture,
  });

  const calls: Calls = { read: 0, list: 0, insights: 0, hypotheses: 0, retrieval: 0, trace: 0, archive: 0, persistCauses: 0 };

  const spied: UiWorkflowPort = {
    ...port,
    readWorkflow: (attempt_id) => {
      calls.read += 1;
      return port.readWorkflow(attempt_id);
    },
    listWorkflowAttempts: () => {
      calls.list += 1;
      return port.listWorkflowAttempts();
    },
    generateInsights: (command) => {
      calls.insights += 1;
      return port.generateInsights(command);
    },
    generateHypotheses: (command) => {
      calls.hypotheses += 1;
      return port.generateHypotheses(command);
    },
    rerunRetrieval: (command) => {
      calls.retrieval += 1;
      return port.rerunRetrieval(command);
    },
    traceHypothesis: (hypothesis_id) => {
      calls.trace += 1;
      return port.traceHypothesis(hypothesis_id);
    },
    /* CORRECTION-01 (D2): the step ④ door into the record. */
    persistCandidateCauses: (command) => {
      calls.persistCauses += 1;
      return port.persistCandidateCauses(command);
    },
    setAttemptArchived: (command) => {
      calls.archive += 1;
      return port.setAttemptArchived(command);
    },
  };

  const session = createAppSession({
    createGateway: () => ({
      kind: 'ready',
      gateway: {
        port: spied,
        credential_ref: credentialRefForProvider('browser-direct-custom'),
        connection_label: '连接方式：浏览器直连',
        provider_display_name: 'Fixture provider',
        model: 'fixture-model',
      },
    }),
  });

  return { session, calls, harness };
}

/** The user-gesture path: a workspace is attached and a model configuration saved. */
async function openWorkspaceAndProvider(session: AppSession): Promise<void> {
  session.openSettings();
  session.updateSettingsDraft({
    model: 'fixture-model',
    custom_base_url: 'https://fixture.registry-fixture.test/v1/chat',
    api_key: 'sk-fixture-NOT-A-REAL-KEY-0000000000',
  });
  await session.saveSettings();
  await session.attachWorkspace('fixture-workspace');
}

async function startAttempt(session: AppSession): Promise<void> {
  session.openNewAttempt();
  session.setRawInput('一次没有达到目标的尝试：目标 G，做法 S1，条件 C1，结果 R1。');
  await session.beginCapture();
}

async function confirmAttempt(session: AppSession): Promise<void> {
  session.setResultStatusDecision('accepted');
  session.setConfirmationEdit('user_note', '我自己补充的备注');
  await session.confirmStructured();
}

/* ------------------------------------------------------------------ *
 * U2 / U3 - nothing is read before authorization
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜authorization gating (U2)', () => {
  it('IMPLEMENTATION INVARIANT (U2): with no workspace and no provider, no read is performed at all', async () => {
    const { session, calls } = wire();

    await session.refreshAttempts();
    await session.selectAttempt(ID_SOURCE);
    await session.setArchived(ID_SOURCE, true);

    assert.equal(calls.read, 0, 'no record may be read before authorization');
    assert.equal(calls.list, 0, 'the rail may not be listed before authorization');
    assert.equal(calls.archive, 0, 'no write may happen before authorization');
    assert.equal(session.getState().snapshot, null);
    assert.equal(session.getState().workspace.status, 'unselected');
  });

  it('IMPLEMENTATION INVARIANT (U2): after the workspace and provider exist, the rail is listed', async () => {
    const { session, calls } = wire();
    await openWorkspaceAndProvider(session);

    assert.equal(session.getState().workspace.status, 'connected');
    assert.equal(session.getState().provider.status, 'ready');
    assert.ok(calls.list >= 1, 'the rail must be read once an authorized workspace exists');
    assert.equal(session.getState().attempts_loaded, true);
  });

  it('IMPLEMENTATION INVARIANT (§14): an unsupported provider is a first-class state, not a crash', async () => {
    const session = createAppSession({
      createGateway: () => ({ kind: 'unsupported', message: '当前配置无法建立受支持的模型连接。' }),
    });
    session.openSettings();
    session.updateSettingsDraft({
      model: 'fixture-model',
      custom_base_url: 'https://fixture.registry-fixture.test/v1/chat',
    });
    await session.saveSettings();
    /*
     * 🔴 TWO DIFFERENT REFUSALS, IN ORDER (`PSA-D2 = B`, `CORRECTION-03`). With no credential the save
     *    is stopped at the INPUT gate before anything is composed, so the capability rule is not even
     *    consulted - the provider stays `unconfigured`, it never becomes `unsupported`.
     */
    assert.equal(session.getState().provider.status, 'unconfigured', 'the credential gate refuses first');
    assert.equal(session.getState().settings_errors.length > 0, true);
    assert.equal(session.getState().settings_save_error, null, 'and this is not a composition failure');

    /* Given a credential the draft gets PAST the gate - and THEN the capability rule reports. */
    session.updateSettingsDraft({ api_key: 'sk-fixture-NOT-A-REAL-KEY-0000000000' });
    await session.saveSettings();
    await session.attachWorkspace('fixture-workspace');

    const state = session.getState();
    assert.equal(state.provider.status, 'unsupported');
    assert.equal(state.provider.message, '当前配置无法建立受支持的模型连接。');
    assert.equal(state.attempts_loaded, false, 'no read happens without a usable provider path');
  });
});

/* ------------------------------------------------------------------ *
 * W1 / W2 / W3
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜the D9 chain (W1 - W3)', () => {
  it('IMPLEMENTATION INVARIANT (W1): 新建一次尝试 calls `beginCapture` and selects the new record', async () => {
    const { session, harness } = wire();
    await openWorkspaceAndProvider(session);
    await startAttempt(session);

    const state = session.getState();
    assert.ok(state.selected_attempt_id !== null, 'the new record must become the selection');
    assert.ok(state.snapshot !== null, 'the read model must be refreshed from the persisted record');
    assert.ok(harness.provider.capture_calls.length >= 1, 'step ② really ran through the provider');
    assert.equal(state.new_attempt_open, false);
  });

  it('IMPLEMENTATION INVARIANT (W2): ③ sends ONE existing confirmation command and the user edit lands as a Fact', async () => {
    const { session, harness } = wire();
    await openWorkspaceAndProvider(session);
    await startAttempt(session);
    const before = harness.provider.capture_calls.length;
    await confirmAttempt(session);

    const snapshot = session.getState().snapshot;
    assert.ok(snapshot !== null);
    const note = snapshot.attempt.user_note;
    assert.equal(note.presence_state, 'present');
    if (note.presence_state === 'present') {
      assert.equal(note.item.value, '我自己补充的备注');
      /* 🔴 The user's own words are a `Fact`; the source type is decided by the SERVICE, not the UI. */
      assert.equal(note.item.source_type, 'Fact');
    }
    assert.equal(harness.provider.capture_calls.length, before, 'confirmation must not re-run the parse');
  });

  it('IMPLEMENTATION INVARIANT (W3/U15): the Formal save runs step ⑥ automatically - the UI inserts no second confirmation', async () => {
    const { session, calls, harness } = wire();
    /* The history lives in the SAME workspace the session is wired to. */
    await seedHistoricalCorpus(harness);
    await openWorkspaceAndProvider(session);
    await startAttempt(session);
    await confirmAttempt(session);
    await session.saveFormal();

    const snapshot = session.getState().snapshot;
    assert.ok(snapshot !== null);
    assert.equal(snapshot.attempt_state, 'Formal');
    assert.equal(calls.retrieval, 0, 'the UI must not ask for a second retrieval');
    assert.equal(snapshot.retrieval.state, 'ready', '⑤ ⇒ ⑥ happened inside the service');
    assert.equal(session.getState().flash, 'saved');
  });
});

/* ------------------------------------------------------------------ *
 * W4 - W7 - explicit generation, and the trace
 * ------------------------------------------------------------------ */

async function formalized(): Promise<Wired> {
  const wired = wire();
  await seedHistoricalCorpus(wired.harness);
  await openWorkspaceAndProvider(wired.session);
  await startAttempt(wired.session);
  await confirmAttempt(wired.session);
  await wired.session.saveFormal();
  return wired;
}

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜explicit generation and the trace (W4 - W7)', () => {
  it('IMPLEMENTATION INVARIANT (W4): ⑧ runs only when the user asks for it', async () => {
    const wired = await formalized();
    const snapshot_before = wired.session.getState().snapshot;
    assert.equal(wired.calls.insights, 0, 'reaching step ⑦ must not generate anything');
    assert.equal(snapshot_before?.insights.batches.length, 0);

    await wired.session.generateInsights();

    assert.equal(wired.calls.insights, 1, 'exactly one explicit generation');
    assert.ok((wired.session.getState().snapshot?.insights.batches.length ?? 0) >= 1);
    assert.ok(wired.harness.provider.insight_calls.length >= 1, 'step ⑧ really called the provider');
  });

  it('IMPLEMENTATION INVARIANT (W5): ⑨ runs only when the user asks for it', async () => {
    const wired = await formalized();
    assert.equal(wired.calls.hypotheses, 0);
    assert.equal(wired.session.getState().snapshot?.hypotheses.batches.length, 0);

    await wired.session.generateHypotheses();

    assert.equal(wired.calls.hypotheses, 1);
    assert.ok((wired.session.getState().snapshot?.hypotheses.batches.length ?? 0) >= 1);
    assert.ok(wired.harness.provider.hypothesis_calls.length >= 1, 'step ⑨ really called the provider');
  });

  it('IMPLEMENTATION INVARIANT (W6): ⑨ does not wait for ⑧`s E5 - insights stay `candidate`', async () => {
    const wired = await formalized();
    await wired.session.generateInsights();
    const after_insights = wired.session.getState().snapshot;
    assert.ok((after_insights?.insights.views.length ?? 0) >= 1, 'there must be an insight to NOT accept');
    for (const view of after_insights?.insights.views ?? []) {
      assert.equal(view.insight.state, 'candidate', 'nothing may be accepted automatically');
    }

    await wired.session.generateHypotheses();

    const after = wired.session.getState().snapshot;
    assert.ok((after?.hypotheses.views.length ?? 0) >= 1, '⑨ produced a direction with no accepted insight');
    for (const view of after?.insights.views ?? []) {
      assert.equal(view.insight.state, 'candidate', '⑨ must not have accepted anything on the way');
    }
  });

  it('IMPLEMENTATION INVARIANT (W7): ⑩ calls `traceHypothesis` and the rail receives the trace', async () => {
    const wired = await formalized();
    await wired.session.generateHypotheses();
    const hypothesis_id = wired.session.getState().snapshot?.hypotheses.views[0]?.hypothesis.hypothesis_id;
    assert.ok(hypothesis_id !== undefined, 'there must be a grounded direction to trace');

    await wired.session.traceHypothesis(String(hypothesis_id));

    assert.equal(wired.calls.trace, 1);
    const evidence = wired.session.getState().evidence;
    assert.ok(evidence !== null, 'the evidence rail must receive a panel');
    assert.ok((evidence?.citation_label ?? '').length > 0, '`N_引用` is shown from the citation view');
  });

  it('IMPLEMENTATION INVARIANT (U12): an explicit rerun does not cascade into ⑧ or ⑨', async () => {
    const wired = await formalized();
    await wired.session.generateInsights();
    await wired.session.generateHypotheses();
    const insights_before = wired.calls.insights;
    const hypotheses_before = wired.calls.hypotheses;

    await wired.session.rerunRetrieval();

    assert.equal(wired.calls.retrieval, 1, 'the rerun itself ran once');
    assert.equal(wired.calls.insights, insights_before, '⑧ must not be re-triggered by a rerun');
    assert.equal(wired.calls.hypotheses, hypotheses_before, '⑨ must not be re-triggered by a rerun');
  });
});

/* ------------------------------------------------------------------ *
 * Operation ids and archive
 * ------------------------------------------------------------------ */

describe('S01-06 ｜ IMPLEMENTATION INVARIANT｜operation ids and archive (§46 / §42)', () => {
  it('IMPLEMENTATION INVARIANT (§46): one action keeps ONE operation id until it succeeds', () => {
    let minted = 0;
    const ledger = createOperationLedger(
      createOperationIdFactory(() => {
        minted += 1;
        return `t${minted}`;
      }),
    );
    const first = ledger.operationIdFor('capture', 'capture');
    /* 🔴 No position is encoded: the id is `op-<action>-<opaque token>`. */
    assert.match(first, /^op-capture-t\d+$/u);
    assert.equal(ledger.operationIdFor('capture', 'capture'), first, 'a retry replays the same id');
    assert.notEqual(ledger.operationIdFor('confirmation', 'confirmation'), first);
    assert.equal(ledger.size, 2);

    ledger.forget('capture');
    const after = ledger.operationIdFor('capture', 'capture');
    assert.notEqual(after, first, 'a settled action mints a new id next time');
  });

  it('IMPLEMENTATION INVARIANT (§42): archive is a state change - the record is never deleted', async () => {
    const wired = await formalized();
    const attempt_id = wired.session.getState().selected_attempt_id;
    assert.ok(attempt_id !== null);

    await wired.session.setArchived(String(attempt_id), true);

    assert.equal(wired.calls.archive, 1);
    const state = wired.session.getState();
    assert.equal(state.snapshot?.archive_state, 'archived');
    const listed = state.attempts.find((summary) => String(summary.attempt_id) === attempt_id);
    assert.ok(listed !== undefined, 'an archived record must still be listed');
    assert.equal(listed?.archive_state, 'archived');

    await wired.session.setArchived(String(attempt_id), false);
    assert.equal(wired.session.getState().snapshot?.archive_state, 'active');
  });
});

/* ------------------------------------------------------------------ *
 * CORRECTION-01 - the cause decision must reach the record
 * ------------------------------------------------------------------ */

/** Drains the session's fire-and-forget chain (`decideCause` starts a `void run(...)`). */
async function settleTicks(ticks = 12): Promise<void> {
  for (let index = 0; index < ticks; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('CORRECTION-01 ｜ IMPLEMENTATION INVARIANT｜a cause decision is persisted (D2)', () => {
  it('IMPLEMENTATION INVARIANT (D2): deciding one candidate cause calls `persistCandidateCauses` exactly once', async () => {
    const wired = wire();
    await openWorkspaceAndProvider(wired.session);
    await startAttempt(wired.session);
    await confirmAttempt(wired.session);
    await wired.session.analyseCauses();

    const proposal = wired.session.getState().cause_proposal;
    assert.ok(proposal !== null, 'the analysis must produce a proposal');
    const first = proposal?.candidates[0];
    assert.ok(first !== undefined, 'the fixture proposes at least one candidate cause');
    const first_id = String(first?.content_item_id ?? '');

    assert.equal(wired.calls.persistCauses, 0, 'nothing may be written before the user decides');

    wired.session.decideCause(first_id, 'accepted');
    await settleTicks();

    /*
     * 🔴 THE REGRESSION GUARD. Before CORRECTION-01 `decideCause` only mirrored the decision into UI
     *    state, so the record's `candidate_causes` stayed `[]`, `causes_recorded`
     *    (`ui/presenters/steps.ts`) could never become true, ④ stayed `current` forever and ⑤ stayed
     *    locked - a dead end with no reachable way out, which is exactly how the PSA-A rehearsal
     *    reported it ("点击没有反应"). The application layer already exposed the command; only the
     *    call site was missing, so asserting the CALL is what pins the fix.
     */
    assert.equal(wired.calls.persistCauses, 1, 'the decision must reach `persistCandidateCauses`');
    assert.equal(wired.session.getState().cause_decisions[first_id], 'accepted');
  });
});
