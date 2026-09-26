/**
 * FINAL-RAPID-INTEGRATION-01 §3.1 ｜ The ⑥⑦⑧ draft text must outlive a re-render.
 *
 * 🔴 THE DEFECT THIS FILE CLOSES (`FINAL-RAPID-C` §10, `INTEGRATION REQUIRED`). The additive criterion
 *    field in `components/steps.ts` was UNCONTROLLED: it read its value out of the DOM at click time
 *    and held nothing of its own. `app-root.ts` replaces the WHOLE workbench on every state change, so
 *    any unrelated update - deciding another criterion, a notice arriving, a pending flag flipping -
 *    destroyed the node and the user's UN-SAVED text with it, silently. The field is now controlled by
 *    `AppSessionState.hypothesis_criterion_edits`, which is what these cases pin.
 *
 * 🔴 THESE ARE `IMPLEMENTATION INVARIANT` CASES, NOT NEW PRODUCT `AC`. `FINAL-RAPID-INTEGRATION-01`
 *    fixes implementations and adds none:
 *      · a draft survives an unrelated state change (it is state, not DOM);
 *      · a draft is CLEARED as one act whenever the record on screen changes - select another record,
 *        open ①, switch workspace, lose the workspace;
 *      · a SUCCESSFUL save drops the entry; a FAILED one keeps it, so nothing is silently discarded;
 *      · the field really is controlled (the value comes from the state, the keystroke goes to the
 *        state) and the buffer never reaches a browser storage carrier.
 *
 * 🔴 REAL PROVIDER CALLS = 0. The only model answers are the `NOT_A_REAL_LLM_OUTPUT` fixtures the
 *    shared workflow harness returns from a fake `M10` adapter; every key is a `sk-fixture-…` value.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { credentialRefForProvider } from '../../browser/ai/session-credential-store.js';
import { createWorkflowAttemptIndex } from '../../application/workflow/attempt-summaries.js';
import { workflowNotice } from '../../application/workflow/errors.js';
import {
  makeWorkflowHarness,
  parsePayload,
  seedHistoricalCorpus,
} from '../application/workflow/harness.js';
import { readRepoFile, stripComments } from '../ai/source-scan.js';
import { createAppSession, hypothesisCriterionEditKey } from '../../ui/session/app-session.js';
import type { AppSession } from '../../ui/session/app-session.js';
import { createUiWorkflowPort } from '../../ui/session/ui-port.js';
import type { UiWorkflowPort } from '../../ui/session/ui-port.js';

/* ================================================================== *
 * Constants
 * ================================================================== */

const STEPS = 'src/ui/components/steps.ts';
const SESSION = 'src/ui/session/app-session.ts';
const SLOT = 'support_criterion';
const DRAFT_TEXT = '颜色变化值高于目标范围（未保存草稿）';
const WORKSPACE_LABEL = 'fixture-workspace';

/* ================================================================== *
 * Source helpers - the DOM scope can only be audited by reading it
 * ================================================================== */

/**
 * 🔴 LINE ENDINGS ARE NORMALISED FIRST, AND THAT IS NOT COSMETIC (`FINAL-RAPID-D`).
 *
 * This tree is checked out with CRLF (Git for Windows defaults `core.autocrlf` to `true` and the
 * repository carries no `.gitattributes`). `stripComments` splits on `\n` and keeps the `\r`, so a
 * slice written as `indexOf('\n}\n')` NEVER fires and the slice silently runs to the end of the file -
 * turning a "must not contain" assertion into a vacuous one. Normalising, plus the hard `assert.ok`
 * on the slice boundary in {@link functionBody}, is what keeps these cases meaningful.
 */
function normalise(source: string): string {
  return source.replace(/\r\n?/gu, '\n');
}

function repositoryFile(path: string): string {
  return normalise(stripComments(readRepoFile(path)));
}

/** A top-level `function <name>(…) { … }` body, up to its closing brace at column 0. */
function functionBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist in the source`);
  const rest = source.slice(start);
  const end = rest.indexOf('\n}\n');
  assert.ok(end >= 0, `${name} must be a top-level function with a closing brace at column 0`);
  return rest.slice(0, end);
}

/* ================================================================== *
 * The application over the real `M15` chain
 * ================================================================== */

interface Wired {
  readonly session: AppSession;
  readonly harness: ReturnType<typeof makeWorkflowHarness>;
  readonly port: UiWorkflowPort;
}

function wire(options: { readonly failing_criteria_edit?: boolean } = {}): Wired {
  const harness = makeWorkflowHarness({
    /* Step ③ needs a proposed result status: a `Formal` save requires the user to settle it. */
    parse: parsePayload({ result_status_proposal: '未达到目标' }),
  });
  const port = createUiWorkflowPort({
    workflow: harness.workflow,
    index: createWorkflowAttemptIndex({ listAttempts: () => harness.attempts.listAttempts() }),
    capture: harness.capture,
  });
  /*
   * 🔴 THE FAILING VARIANT IS INJECTED AT THE PORT, NOT BY AIMING AT A NON-EXISTENT RECORD. A
   *    controlled `runtime` result proves the "a failed save keeps the draft" property directly,
   *    instead of depending on how the hypothesis service happens to answer an unknown id.
   */
  const effective: UiWorkflowPort = options.failing_criteria_edit
    ? {
        ...port,
        editHypothesisCriteria: async () => ({
          kind: 'runtime',
          layer: 'RUNTIME',
          value: null,
          notice: null,
        }),
      }
    : port;

  const session = createAppSession({
    createGateway: () => ({
      kind: 'ready',
      gateway: {
        port: effective,
        credential_ref: credentialRefForProvider('browser-direct-custom'),
        connection_label: '连接方式：浏览器直连',
        provider_display_name: 'Fixture provider',
        model: 'fixture-model',
      },
    }),
  });

  return { session, harness, port: effective };
}

/** A configured model plus an authorized workspace - the two preconditions of every command. */
async function openWorkspaceAndProvider(session: AppSession): Promise<void> {
  session.openSettings();
  session.updateSettingsDraft({
    model: 'fixture-model',
    custom_base_url: 'https://fixture.registry-fixture.test/v1/chat',
    api_key: 'sk-fixture-NOT-A-REAL-KEY-DRAFT01',
  });
  await session.saveSettings();
  await session.attachWorkspace(WORKSPACE_LABEL);
}

/** ①–⑤ for real, leaving a `Formal` record whose automatic ⑥ has already run. */
async function formalSource(harness: Wired['harness'], session: AppSession): Promise<string> {
  await seedHistoricalCorpus(harness);
  await openWorkspaceAndProvider(session);
  session.openNewAttempt();
  session.setRawInput('一次没有达到目标的尝试：目标 G，做法 S1，条件 C1，结果 R1。');
  await session.beginCapture();
  session.setResultStatusDecision('accepted');
  await session.confirmStructured();
  await session.saveFormal();
  const attempt_id = session.getState().selected_attempt_id;
  assert.ok(attempt_id !== null, 'precondition: the saved record is on screen');
  return attempt_id;
}

/** ⑧ then ⑨, so a real hypothesis exists to attach ⑥⑦⑧ criterion text to. */
async function firstHypothesisId(session: AppSession): Promise<string> {
  await session.generateInsights();
  await session.generateHypotheses();
  const view = session.getState().snapshot?.hypotheses.views[0];
  assert.ok(view !== undefined, 'precondition: step ⑨ produced a history-grounded hypothesis');
  return String(view.hypothesis.hypothesis_id);
}

function draftOf(session: AppSession, hypothesis_id: string): string | undefined {
  return session.getState().hypothesis_criterion_edits[
    hypothesisCriterionEditKey(hypothesis_id, SLOT)
  ];
}

/* ================================================================== *
 * DRAFT-01 … DRAFT-04 - the buffer is state, and it is record-scoped
 * ================================================================== */

describe('FINAL-RAPID-INTEGRATION-01 ｜ IMPLEMENTATION INVARIANT｜the ⑥⑦⑧ draft buffer (DRAFT-01…)', () => {
  it('IMPLEMENTATION INVARIANT (DRAFT-01): typed criterion text survives an unrelated state change', async () => {
    const wired = wire();
    const session = wired.session;
    await formalSource(wired.harness, session);
    const hypothesis_id = await firstHypothesisId(session);

    /* The user starts typing into a ⑥⑦⑧ slot. Nothing is saved yet. */
    session.setHypothesisCriterionEdit(hypothesis_id, SLOT, DRAFT_TEXT);
    assert.equal(draftOf(session, hypothesis_id), DRAFT_TEXT);

    /*
     * 🔴 NOW THE PART THAT USED TO DESTROY IT. `app-root.ts` rebuilds the entire tree on every state
     *    change, so ANY of these would have replaced the field with an empty one. Each one is a real
     *    unrelated update the user can trigger while the box is half-filled.
     */
    session.setRawInput('  无关的输入变化  ');
    session.toggleRetrievalExpanded();
    session.flashMessage('无关的瞬时提示');
    session.openSettings();
    session.closeSettings();

    assert.equal(
      draftOf(session, hypothesis_id),
      DRAFT_TEXT,
      'the un-saved draft must still be there after unrelated state changes',
    );

    /* 🔴 AND IT IS NOT A SIDE EFFECT OF NEVER RE-RENDERING: the snapshot still re-reads. */
    await session.refreshAttempts();
    assert.equal(draftOf(session, hypothesis_id), DRAFT_TEXT);
  });

  it('IMPLEMENTATION INVARIANT (DRAFT-02): the draft is cleared as ONE act when the record changes', async () => {
    const wired = wire();
    const session = wired.session;
    const first = await formalSource(wired.harness, session);
    const hypothesis_id = await firstHypothesisId(session);
    session.setHypothesisCriterionEdit(hypothesis_id, SLOT, DRAFT_TEXT);

    /* (a) Selecting ANOTHER record: the buffer belongs to the record that was on screen. */
    await session.selectAttempt('ATT_0000000000000000000000000Z');
    assert.deepEqual(
      session.getState().hypothesis_criterion_edits,
      {},
      'selecting another record must clear the criterion draft buffer',
    );

    /* (b) Opening ① is a record change too. */
    await session.selectAttempt(first);
    session.setHypothesisCriterionEdit(hypothesis_id, SLOT, DRAFT_TEXT);
    session.openNewAttempt();
    assert.deepEqual(session.getState().hypothesis_criterion_edits, {});

    /* (c) A NEW CAPTURE re-points the record as well. */
    session.setRawInput('第二次没有达到目标的尝试。');
    await session.beginCapture();
    assert.deepEqual(
      session.getState().hypothesis_criterion_edits,
      {},
      'a capture that produced a new record must clear the previous record`s draft',
    );
  });

  it('IMPLEMENTATION INVARIANT (DRAFT-03): a workspace switch and a workspace loss both clear the draft', async () => {
    const wired = wire();
    const session = wired.session;
    await formalSource(wired.harness, session);
    const hypothesis_id = await firstHypothesisId(session);

    session.setHypothesisCriterionEdit(hypothesis_id, SLOT, DRAFT_TEXT);
    await session.attachWorkspace('another-fixture-workspace');
    assert.deepEqual(
      session.getState().hypothesis_criterion_edits,
      {},
      'a workspace switch must clear the draft buffer',
    );

    session.setHypothesisCriterionEdit(hypothesis_id, SLOT, DRAFT_TEXT);
    session.reportWorkspaceFailure(workflowNotice('WORKSPACE_UNAVAILABLE'));
    assert.deepEqual(
      session.getState().hypothesis_criterion_edits,
      {},
      'losing the workspace is a workspace change and must clear the draft too',
    );
  });

  it('IMPLEMENTATION INVARIANT (DRAFT-04): a successful save drops the entry, a failed save keeps it', async () => {
    const wired = wire();
    const session = wired.session;
    await formalSource(wired.harness, session);
    const hypothesis_id = await firstHypothesisId(session);

    /* The successful path: the write lands, so the buffer entry is gone and the value is stored. */
    session.setHypothesisCriterionEdit(hypothesis_id, SLOT, DRAFT_TEXT);
    await session.addHypothesisCriterion(hypothesis_id, SLOT, DRAFT_TEXT);
    assert.equal(
      draftOf(session, hypothesis_id),
      undefined,
      'a successful save must drop the buffer entry',
    );
    const stored = session
      .getState()
      .snapshot?.hypotheses.views.find((view) => String(view.hypothesis.hypothesis_id) === hypothesis_id);
    assert.ok(stored !== undefined, 'the hypothesis is still on screen');
    assert.ok(
      JSON.stringify(stored).includes(DRAFT_TEXT),
      'and the text really reached the record, so the drop was not a discard',
    );

    /* The failing path: the write did NOT land, so the user`s text must survive it. */
    const failing = wire({ failing_criteria_edit: true });
    const failing_session = failing.session;
    await formalSource(failing.harness, failing_session);
    const failing_id = await firstHypothesisId(failing_session);
    failing_session.setHypothesisCriterionEdit(failing_id, SLOT, DRAFT_TEXT);
    await failing_session.addHypothesisCriterion(failing_id, SLOT, DRAFT_TEXT);
    assert.equal(
      draftOf(failing_session, failing_id),
      DRAFT_TEXT,
      'a failed save must keep the draft for a retry instead of silently discarding it',
    );
  });
});

/* ================================================================== *
 * DRAFT-05 / DRAFT-06 - the field is controlled and the buffer is not persisted
 * ================================================================== */

describe('FINAL-RAPID-INTEGRATION-01 ｜ IMPLEMENTATION INVARIANT｜the criterion field is controlled (DRAFT-05…)', () => {
  it('IMPLEMENTATION INVARIANT (DRAFT-05): the value comes from the state and the keystroke goes to the state', () => {
    const steps = repositoryFile(STEPS);
    const field = functionBody(steps, 'userCriterionInput');

    /* 🔴 CONTROLLED IN: the field renders the buffer, not the previous DOM node. */
    assert.ok(
      field.includes('props: { value: state.hypothesis_criterion_edits[key] ?? \'\' }'),
      'the input must take its value from the session buffer',
    );
    /* 🔴 CONTROLLED OUT: every keystroke is written back through the session setter. */
    assert.ok(
      field.includes('session.setHypothesisCriterionEdit(hypothesis_id, slot, target.value)'),
      'the input event must hand the typed text to the session',
    );
    assert.ok(field.includes("on: {"), 'the field must subscribe to its own `input` event');
    /* 🔴 ONE KEY DEFINITION: the renderer must not re-type the template string. */
    assert.ok(
      field.includes('hypothesisCriterionEditKey(hypothesis_id, slot)'),
      'the key must come from the shared function',
    );
    /* 🔴 THE DEFECT ITSELF: reading the value off the node, and clearing the node after the save. */
    assert.equal(
      field.includes('const value = input.value;'),
      false,
      'the save must not read the value out of the DOM',
    );
    assert.equal(
      field.includes("input.value = ''"),
      false,
      'the field must not clear itself: the session drops the entry only when the write really landed',
    );
  });

  it('IMPLEMENTATION INVARIANT (DRAFT-06): the draft buffer never reaches a browser storage carrier', () => {
    for (const path of [STEPS, SESSION]) {
      const source = repositoryFile(path);
      for (const carrier of ['sessionStorage', 'localStorage', 'indexedDB']) {
        assert.equal(
          source.includes(carrier),
          false,
          `${path} must not name ${carrier}: the criterion draft is session state only`,
        );
      }
    }
    /* 🔴 AND THE SESSION DECLARES IT AS TRANSIENT STATE, so a reload legitimately starts empty. */
    const session = repositoryFile(SESSION);
    assert.ok(session.includes('hypothesis_criterion_edits: {},'), 'it is initialised empty');
    assert.ok(
      session.includes('hypothesis_criterion_edits: {},') &&
        session.includes('insight_edits: {},'),
      'and it is cleared beside the ⑧ edit buffer, in the one record-scoped reset',
    );
  });
});
