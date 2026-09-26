/**
 * FINAL-RAPID-INTEGRATION-01 §5 ｜ The seven end-to-end scenarios (SCN-A … SCN-G).
 *
 * 🔴 WHY THIS FILE EXISTS. The four workstreams were merged independently and each one closed its own
 *    local defect. What neither of them could check is whether the four fixes still hold TOGETHER -
 *    a stale read that lands on the wrong record, a rapid cause decision that the save overwrites, a
 *    retrieval that costs one call instead of thirty-two, a provider switch that carries a secret, a
 *    locked step that still offers its button, a difference row that shows similarities. Each scenario
 *    below is one such crossing, driven through the REAL `M15` chain over the REAL workspace.
 *
 * 🔴 THESE ARE `IMPLEMENTATION INVARIANT` CASES, NOT NEW PRODUCT `AC`. `FINAL-RAPID-INTEGRATION-01`
 *    integrates fixes; it introduces no product decision and no acceptance criterion.
 * 🔴 REAL PROVIDER CALLS = 0. Every model answer is a hand-written `NOT_A_REAL_LLM_OUTPUT` fixture
 *    returned by the shared fake `M10` adapter. Every key is a `sk-fixture-…` value.
 * 🔴 `src/ui/components/**` IS DOM SCOPE and cannot be imported under `tsconfig.test.json` (no DOM
 *    lib), so the two render-side scenarios pin the STRUCTURE of the source - with line endings
 *    normalised, per `FINAL-RAPID-D` - while everything that can be a pure function is exercised as
 *    one.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  credentialRefForProvider,
  createSessionCredentialStore,
  sessionCredentialKey,
} from '../../browser/ai/session-credential-store.js';
import type { SessionCredentialStore } from '../../browser/ai/session-credential-store.js';
import { createBrowserSessionStorage } from '../../browser/ai/session-storage.js';
import type { SessionScopedStorage } from '../../browser/ai/session-storage.js';
import { createWorkflowAttemptIndex } from '../../application/workflow/attempt-summaries.js';
import type { SaveFormalWorkflowCommand } from '../../application/workflow/types.js';
import {
  ID_SOURCE,
  at,
  causePayload,
  makeWorkflowHarness,
  parsePayload,
  primeRetrieval,
  readSnapshot,
  seedHistoricalCorpus,
  seedSource,
  startAndFormalize,
  timeoutError,
} from '../application/workflow/harness.js';
import { readBatchJudgePairs } from '../retrieval/compare/harness.js';
import {
  COMPARISON_DIFFERENT,
  COMPARISON_EVIDENCE_ROLE_BASIS,
  COMPARISON_EVIDENCE_ROLE_CONTEXT,
  RETRIEVAL_NOT_AVAILABLE,
  RETRIEVAL_RUNTIME_INCOMPLETE,
  SETTINGS_PRESET_NOT_ENABLED,
} from '../../ui/copy.js';
import { comparisonSelectionOf, retrievalPresentationOf, retrievalStartIsOffered } from '../../ui/presenters/retrieval.js';
import { stepViewsForSnapshot } from '../../ui/presenters/steps.js';
import type { RelatedAttemptCardView } from '../../ui/presenters/retrieval.js';
import { EMPTY_SETTINGS_DRAFT } from '../../ui/settings/provider-presets.js';
import { createAppSession } from '../../ui/session/app-session.js';
import type { AppSession, SessionCredentialPort } from '../../ui/session/app-session.js';
import { createUiWorkflowPort } from '../../ui/session/ui-port.js';
import type { UiWorkflowPort, UiReadPort } from '../../ui/session/ui-port.js';
import { readRepoFile, stripComments } from '../ai/source-scan.js';

/* ================================================================== *
 * Shared fixtures / helpers
 * ================================================================== */

const STEPS = 'src/ui/components/steps.ts';
const WORKSPACE_LABEL = 'fixture-workspace';
const FIXTURE_KEY = 'sk-fixture-NOT-A-REAL-KEY-SCN01';

/** 🔴 NORMALISED FIRST: this tree is CRLF, and a `\n`-anchored slice would silently over-run. */
function repositoryFile(path: string): string {
  return stripComments(readRepoFile(path)).replace(/\r\n?/gu, '\n');
}

function functionBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist in the source`);
  const rest = source.slice(start);
  const end = rest.indexOf('\n}\n');
  assert.ok(end >= 0, `${name} must be a top-level function with a closing brace at column 0`);
  return rest.slice(0, end);
}

const STEPS_SOURCE = repositoryFile(STEPS);

/** A session over the real workflow port, with the model already composed. */
function sessionOver(port: UiWorkflowPort): AppSession {
  return createAppSession({
    attachStorage: () => port as UiReadPort,
    createGateway: () => ({
      kind: 'ready',
      gateway: {
        port,
        credential_ref: credentialRefForProvider('browser-direct-custom'),
        connection_label: '连接方式：浏览器直连',
        provider_display_name: 'Fixture provider',
        model: 'fixture-model',
      },
    }),
  });
}

/* ================================================================== *
 * SCN-A - a slow read of A must not land on B
 * ================================================================== */

describe('FINAL-RAPID-INTEGRATION-01 §5 ｜ IMPLEMENTATION INVARIANT｜SCN-A the stale read (SCN-A-01)', () => {
  it('IMPLEMENTATION INVARIANT (SCN-A-01): selecting A then B ends on B, even when A answers last', async () => {
    const harness = makeWorkflowHarness();
    const id_a = 'ATT_0000000000000000000000000A';
    const id_b = 'ATT_0000000000000000000000000B';
    /* 🔴 A MARKER THAT CAN ONLY COME FROM A`s RECORD, so "nothing of A is on screen" is checkable. */
    const a_only = 'A_ONLY_MARKER_目标';
    await harness.seed({ attempt_id: id_a, project_id: 'PRJ_a', goal: a_only, approach: 'SA', condition: 'CA', result: 'RA' });
    await harness.seed({ attempt_id: id_b, project_id: 'PRJ_b', goal: 'GB', approach: 'SB', condition: 'CB', result: 'RB' });

    const port = createUiWorkflowPort({
      workflow: harness.workflow,
      index: createWorkflowAttemptIndex({ listAttempts: () => harness.attempts.listAttempts() }),
      capture: harness.capture,
    });
    /*
     * 🔴 THE RACE IS MADE REAL, NOT SIMULATED: A`s read is delayed so it genuinely answers AFTER B`s.
     *    Both records exist in the workspace, so both reads produce a real snapshot - the only
     *    question the session has to answer is which one may land.
     */
    const slow: UiWorkflowPort = {
      ...port,
      readWorkflow: async (attempt_id) => {
        if (String(attempt_id) === id_a) {
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
        return port.readWorkflow(attempt_id);
      },
    };

    const session = sessionOver(slow);
    await session.attachWorkspace(WORKSPACE_LABEL);

    const first = session.selectAttempt(id_a);
    const second = session.selectAttempt(id_b);
    await second;
    await first;

    const state = session.getState();
    assert.equal(state.selected_attempt_id, id_b, 'the LAST selection must win');
    assert.equal(String(state.snapshot?.attempt_id), id_b, 'and the snapshot must be B`s, not A`s');
    /*
     * 🔴 CHECKED ON THE SNAPSHOT, NOT ON THE WHOLE STATE: the rail legitimately lists BOTH records, so
     *    A`s marker appearing in `state.attempts` would prove nothing. What must not happen is A`s
     *    record being drawn in the CENTRE.
     */
    assert.equal(
      JSON.stringify(state.snapshot).includes(a_only),
      false,
      'A`s record must not be left on screen after moving to B',
    );
    assert.equal(JSON.stringify(state.snapshot).includes('GB'), true, 'and B`s record must be there');
  });
});

/* ================================================================== *
 * SCN-B - rapid cause decisions, then an immediate Formal save
 * ================================================================== */

describe('FINAL-RAPID-INTEGRATION-01 §5 ｜ IMPLEMENTATION INVARIANT｜SCN-B the cause race (SCN-B-01)', () => {
  it('IMPLEMENTATION INVARIANT (SCN-B-01): three rapid decisions reach the record, and ⑤ waits for them', async () => {
    const harness = makeWorkflowHarness({
      parse: parsePayload({ result_status_proposal: '未达到目标' }),
      cause: causePayload(['原因一：条件没有控制住', '原因二：方案不适用', '原因三：测量方法有偏差']),
    });
    const real = createUiWorkflowPort({
      workflow: harness.workflow,
      index: createWorkflowAttemptIndex({ listAttempts: () => harness.attempts.listAttempts() }),
      capture: harness.capture,
    });
    /* 🔴 The save commands are CAPTURED, not re-derived: what ⑤ really sent is the claim under test. */
    const saves: SaveFormalWorkflowCommand[] = [];
    const port: UiWorkflowPort = {
      ...real,
      saveFormalAttempt: (command) => {
        saves.push(command);
        return real.saveFormalAttempt(command);
      },
    };

    const session = sessionOver(port);
    session.openSettings();
    session.updateSettingsDraft({
      model: 'fixture-model',
      custom_base_url: 'https://fixture.registry-fixture.test/v1/chat',
      api_key: FIXTURE_KEY,
    });
    await session.saveSettings();
    await session.attachWorkspace(WORKSPACE_LABEL);

    session.openNewAttempt();
    session.setRawInput('一次没有达到目标的尝试：目标 G，做法 S1，条件 C1，结果 R1。');
    await session.beginCapture();
    session.setResultStatusDecision('accepted');
    await session.confirmStructured();
    await session.analyseCauses();

    const proposal = session.getState().cause_proposal;
    assert.ok(proposal !== null, 'precondition: step ④ proposed candidate causes');
    assert.equal(proposal.candidates.length, 3, 'precondition: three candidates to decide');
    const ids = proposal.candidates.map((candidate) => String(candidate.content_item_id));
    const c1 = ids[0]!;
    const c2 = ids[1]!;
    const c3 = ids[2]!;

    /*
     * 🔴 THE USER DECIDES FAST AND SAVES IMMEDIATELY - no `await` between the clicks and the save.
     *    `c2` is decided TWICE on purpose (`accepted` then `rejected`): the last intent is the one that
     *    must survive, both on screen and in the record.
     */
    session.decideCause(c1, 'accepted');
    session.decideCause(c2, 'accepted');
    session.decideCause(c2, 'rejected');
    session.decideCause(c3, 'accepted');
    await session.saveFormal();

    assert.equal(saves.length, 1, 'one ⑤ save, and it is the last word on the causes');
    const decided = saves[0]?.candidate_causes;
    assert.ok(decided !== undefined, '⑤ must carry the decided candidate causes');
    const byId = new Map(
      decided.outcome.candidates.map((candidate) => [candidate.content_item_id, candidate.decision_state]),
    );
    assert.equal(byId.get(c1), 'accepted');
    assert.equal(byId.get(c2), 'rejected', 'the LAST intent for c2 must win, not the first');
    assert.equal(byId.get(c3), 'accepted');
    assert.equal(
      decided.outcome.candidates.length,
      3,
      'every candidate is carried, so nothing was silently dropped by the coalescing',
    );

    /* 🔴 AND THE RECORD AGREES WITH THE SCREEN: the persisted state is what the user last chose. */
    const snapshot = await readSnapshot(harness.workflow, at(String(session.getState().selected_attempt_id)));
    assert.equal(snapshot.attempt_state, 'Formal');
    const persisted = new Map(
      snapshot.attempt.candidate_causes.map((cause) => [cause.content_item_id, cause.decision_state]),
    );
    assert.equal(persisted.get(c2), 'rejected');
    assert.deepEqual(
      session.getState().cause_decisions,
      Object.fromEntries([...byId].map(([id, decision]) => [id, decision])),
      'the screen and the record must agree',
    );
  });
});

/* ================================================================== *
 * SCN-C - a Formal record with no stored comparison
 * ================================================================== */

describe('FINAL-RAPID-INTEGRATION-01 §5 ｜ IMPLEMENTATION INVARIANT｜SCN-C the no-result recovery (SCN-C-01)', () => {
  it('IMPLEMENTATION INVARIANT (SCN-C-01): no stored derivation ⇒ the card offers a START, never a re-save', async () => {
    const harness = makeWorkflowHarness();
    await seedSource(harness);
    const snapshot = await readSnapshot(harness.workflow, at(ID_SOURCE));

    /* 🔴 THE STATE A RELOAD REALLY PRODUCES: a Formal record with nothing retrievable on file. */
    assert.equal(snapshot.attempt_state, 'Formal');
    assert.equal(snapshot.retrieval.state, 'not_available');
    assert.equal(snapshot.retrieval.n_retrieval, null, 'nothing may be reported as `0`');

    const presentation = retrievalPresentationOf(snapshot, false);
    assert.equal(presentation.phase, 'not_available');
    assert.equal(presentation.headline, RETRIEVAL_NOT_AVAILABLE);
    assert.equal(presentation.start_offered, true, 'the state must be startable');
    assert.equal(retrievalStartIsOffered(presentation), true);

    /* 🔴 AND THE CONTROL THAT OFFERS IT RUNS ⑥ - it does not save the record again. */
    const card = functionBody(STEPS_SOURCE, 'retrievalCard');
    assert.ok(
      card.includes('RETRIEVAL_START, () => void session.rerunRetrieval()'),
      'the start control must call the existing retrieval command',
    );
    assert.equal(card.includes('saveFormal'), false, 'a retrieval must never re-save a Formal record');
    assert.equal(card.includes('generateInsights'), false);
    assert.equal(card.includes('generateHypotheses'), false);
  });

  it('IMPLEMENTATION INVARIANT (SCN-C-02): a failed automatic ⑥ is a RUNTIME notice whose rerun names its own record', async () => {
    const harness = makeWorkflowHarness({ fail_step_6_with: timeoutError() });
    await seedHistoricalCorpus(harness);
    const { attempt_id, save } = await startAndFormalize(harness, 'scn-c-2');

    /* 🔴 THE SAVE STAYS A SAVE: ⑤ completed; only ⑥ did not. The notice says exactly that. */
    assert.equal(save.value?.save.attempt?.state, 'Formal');
    const notice = save.notice;
    assert.equal(notice?.code, 'RETRIEVAL_RUNTIME_INCOMPLETE');
    assert.equal(notice?.layer, 'RUNTIME');
    const recovery = notice?.recovery ?? null;
    if (recovery === null || recovery.kind !== 'rerun_retrieval') {
      throw new Error('the notice must offer the existing rerun command, against its own record');
    }
    assert.equal(
      String(recovery.attempt_id),
      String(attempt_id),
      'the rerun must name the record the notice is about, not whatever is selected later',
    );

    const snapshot = await readSnapshot(harness.workflow, attempt_id);
    const presentation = retrievalPresentationOf(snapshot, false);
    assert.equal(presentation.phase, 'runtime_incomplete');
    assert.equal(presentation.headline, RETRIEVAL_RUNTIME_INCOMPLETE);
    assert.equal(presentation.runtime_notice?.code, 'RETRIEVAL_RUNTIME_INCOMPLETE');
  });
});

/* ================================================================== *
 * SCN-D - the worst case retrieval is ONE provider call
 * ================================================================== */

describe('FINAL-RAPID-INTEGRATION-01 §5 ｜ IMPLEMENTATION INVARIANT｜SCN-D the batch retrieval (SCN-D-01)', () => {
  it('IMPLEMENTATION INVARIANT (SCN-D-01): 8 candidates × 4 undecided dimensions ⇒ exactly ONE provider call', async () => {
    const harness = makeWorkflowHarness();
    const source_values = { goal: '批次目标', approach: '批次方案', condition: '批次条件', result: '批次结果' };
    await harness.seed({ attempt_id: ID_SOURCE, state: 'Formal', project_id: 'PRJ_src', ...source_values });
    const candidates: string[] = [];
    for (const index of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const attempt_id = `ATT_0000000000000000000000000${index}`;
      candidates.push(attempt_id);
      await harness.seed({
        attempt_id,
        state: 'Formal',
        project_id: `PRJ_c${index}`,
        goal: `批次目标${index}`,
        approach: `批次方案${index}`,
        condition: `批次条件${index}`,
        result: `批次结果${index}`,
      });
    }

    assert.equal(harness.provider.invocations.length, 0, 'precondition: no call yet');
    await primeRetrieval(harness, ID_SOURCE);

    /*
     * 🔴 THE WHOLE POINT OF `FINAL-RAPID-A`: the number of model calls no longer grows with
     *    `candidates × dimensions`. The same retrieval used to issue up to 32 sequential requests -
     *    which is the measured reason the PSA run never finished ⑥.
     */
    assert.equal(harness.provider.invocations.length, 1, 'one retrieval costs exactly one provider call');
    assert.equal(harness.provider.judge_calls.length, 1);
    const pair_count = readBatchJudgePairs(harness.provider.invocations[0]!.request).length;
    assert.equal(pair_count, 32, 'and that ONE call really carried all 8 × 4 = 32 judgements');
    assert.equal(candidates.length, 8);

    /* 🔴 The derivation was persisted - the call count is not "one call because nothing ran". */
    const snapshot = await readSnapshot(harness.workflow, at(ID_SOURCE));
    assert.notEqual(snapshot.retrieval.state, 'not_available');
    assert.notEqual(snapshot.retrieval.state, 'runtime_incomplete');
  });
});

/* ================================================================== *
 * SCN-E - DeepSeek → OpenAI must not carry a secret or a model
 * ================================================================== */

describe('FINAL-RAPID-INTEGRATION-01 §5 ｜ IMPLEMENTATION INVARIANT｜SCN-E the provider switch (SCN-E-01)', () => {
  it('IMPLEMENTATION INVARIANT (SCN-E-01): switching providers resets the model, drops the key and refuses an unreachable preset', async () => {
    const backing = new Map<string, string>();
    const view: SessionScopedStorage = {
      kind: 'browser-session-storage',
      getItem: (key) => backing.get(key) ?? null,
      setItem: (key, value) => {
        backing.set(key, value);
      },
      removeItem: (key) => {
        backing.delete(key);
      },
    };
    const credentials: SessionCredentialStore = createSessionCredentialStore(
      createBrowserSessionStorage({ sessionStorage: view }),
    );
    const credential_port: SessionCredentialPort = {
      has: (provider_id) => credentials.has(credentialRefForProvider(provider_id)),
      clear: (provider_id) => {
        credentials.remove(credentialRefForProvider(provider_id));
      },
    };

    /*
     * 🔴 THE WIRING MIRRORS THE BOOTSTRAP: the key is written at the ONE `put` site inside the
     *    gateway factory, and a composition that succeeds becomes `ready`. `OpenAI` never reaches this
     *    factory at all - `validateSettingsDraft` refuses it first, because this deployment has no
     *    proxy route (`deployment_enabled: false`).
     */
    const harness = makeWorkflowHarness();
    const workflow_port = createUiWorkflowPort({
      workflow: harness.workflow,
      index: createWorkflowAttemptIndex({ listAttempts: () => harness.attempts.listAttempts() }),
      capture: harness.capture,
    });
    const session = createAppSession({
      credentials: credential_port,
      initial_draft: EMPTY_SETTINGS_DRAFT,
      attachStorage: () => workflow_port as UiReadPort,
      createGateway: ({ config, api_key }) => {
        if (api_key.trim().length > 0) {
          credentials.put(credentialRefForProvider(String(config.provider_id)), api_key);
        }
        return {
          kind: 'ready',
          gateway: {
            port: workflow_port,
            credential_ref: credentialRefForProvider(String(config.provider_id)),
            connection_label: '连接方式：浏览器直连',
            provider_display_name: 'Fixture provider',
            model: config.model,
          },
        };
      },
    });
    await session.attachWorkspace(WORKSPACE_LABEL);

    /* (1) DeepSeek with a typed key: the key reaches the session store, the field is emptied. */
    session.openSettings();
    session.chooseSettingsPreset('deepseek');
    session.updateSettingsDraft({ api_key: FIXTURE_KEY });
    await session.saveSettings();
    assert.equal(session.getState().provider.status, 'ready', 'precondition: DeepSeek composed');
    assert.equal(credentials.has(credentialRefForProvider('deepseek')), true);
    assert.equal(session.getState().settings_draft.api_key, '', 'the typed plaintext left the form');
    assert.equal(
      backing.get(sessionCredentialKey(credentialRefForProvider('deepseek'))),
      FIXTURE_KEY,
      'and it lives in the session carrier, under DeepSeek`s ref',
    );

    /* (2) Switch to OpenAI: the TARGET`s default model, an EMPTY key, no borrowed credential. */
    session.openSettings();
    session.chooseSettingsPreset('openai');
    const switched = session.getState();
    assert.equal(switched.settings_draft.provider_id, 'openai');
    assert.equal(switched.settings_draft.model, 'gpt-4o-mini', 'the target`s own default, not DeepSeek`s');
    assert.equal(switched.settings_draft.api_key, '', 'the secret must never cross the provider boundary');
    assert.equal(
      JSON.stringify(switched.settings_draft).includes(FIXTURE_KEY),
      false,
      'and no part of the form may carry it',
    );
    assert.equal(switched.settings_key_in_session, false, 'OpenAI has no credential in this session');

    /* (3) This deployment serves no proxy route, so the save is REFUSED before any composition. */
    await session.saveSettings();
    const refused = session.getState();
    assert.ok(
      refused.settings_errors.includes(SETTINGS_PRESET_NOT_ENABLED),
      'the panel must say why this preset cannot be configured here',
    );
    assert.equal(refused.settings_open, true, 'and it must stay open');
    assert.notEqual(refused.provider.provider_id, 'openai', 'OpenAI must never become the ready provider');
    assert.equal(refused.provider.status, 'ready', 'the refused save leaves the previous composition alone');
    assert.equal(refused.provider.provider_id, 'deepseek');

    /* (4) Switching back: the field is EMPTY but the session credential is still usable. */
    session.chooseSettingsPreset('deepseek');
    const returned = session.getState();
    assert.equal(returned.settings_draft.api_key, '', 'the form never rehydrates a stored secret');
    assert.equal(returned.settings_key_in_session, true, 'yet the session still holds one');

    /* (5) And it saves again WITHOUT retyping - the session store, not the box, is the credential. */
    await session.saveSettings();
    assert.equal(session.getState().provider.status, 'ready');
    assert.equal(session.getState().settings_draft.api_key, '');

    /* 🔴 THE SECRET IS WHERE IT SHOULD BE - and nowhere else. */
    assert.deepEqual([...credentials.list_refs()], ['provider:deepseek']);
    assert.equal(
      credentials.has(credentialRefForProvider('openai')),
      false,
      'nothing about OpenAI was ever given a credential',
    );
    assert.equal(
      backing.has(sessionCredentialKey(credentialRefForProvider('openai'))),
      false,
      'and the carrier holds no slot for it',
    );
  });
});

/* ================================================================== *
 * SCN-F - a locked step renders no generation control
 * ================================================================== */

describe('FINAL-RAPID-INTEGRATION-01 §5 ｜ IMPLEMENTATION INVARIANT｜SCN-F the locked steps (SCN-F-01)', () => {
  it('IMPLEMENTATION INVARIANT (SCN-F-01): ⑨ is locked after ⑤, and neither ⑧ nor ⑨ draws a control while locked', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);
    const { attempt_id } = await startAndFormalize(harness, 'scn-f-1');
    const snapshot = await readSnapshot(harness.workflow, attempt_id);

    const views = stepViewsForSnapshot(snapshot);
    /* 🔴 Indices are the product`s own order: 0-based, so ⑦ = 6, ⑧ = 7, ⑨ = 8, ⑩ = 9. */
    assert.equal(views[7]?.number !== undefined, true, 'precondition: the ten steps are derived');
    assert.equal(views[8]?.locked, true, '⑨ must not be reachable before ⑧ has produced anything');

    /* 🔴 AND THE RENDER REALLY HONOURS THE LOCK: the generation control lives INSIDE the guard. */
    for (const [name, action, label] of [
      ['insightCard', 'session.generateInsights()', '⑧'],
      ['hypothesisCard', 'session.generateHypotheses()', '⑨'],
    ] as const) {
      const body = functionBody(STEPS_SOURCE, name);
      const guard = body.indexOf('if (!step.locked) {');
      const control = body.indexOf(action);
      assert.ok(guard >= 0, `${name} must consult its own step lock`);
      assert.ok(control >= 0, `${name} must still contain the ${label} generation control`);
      assert.ok(
        guard < control,
        `the ${label} generation control must be inside the lock guard`,
      );
    }
  });
});

/* ================================================================== *
 * SCN-G - a difference row delivers the difference
 * ================================================================== */

describe('FINAL-RAPID-INTEGRATION-01 §5 ｜ IMPLEMENTATION INVARIANT｜SCN-G the evidence mapping (SCN-G-01)', () => {
  it('IMPLEMENTATION INVARIANT (SCN-G-01): a 「差异点」 click never delivers the similarities', () => {
    const candidate: RelatedAttemptCardView = {
      attempt_id: 'ATT_0000000000000000000000000R',
      same_points: [{ dimension_label: '目标', text: '相同点：目标一致' }],
      different_points: [{ dimension_label: '条件', text: '差异点：条件不同' }],
      uncompared: ['结果'],
      reasons: [],
    };

    const same = comparisonSelectionOf(candidate, 'same');
    const different = comparisonSelectionOf(candidate, 'different');
    const uncompared = comparisonSelectionOf(candidate, 'uncompared');

    assert.equal(same?.text, '相同点：目标一致');
    assert.equal(different?.text, '差异点：条件不同', 'the clicked section decides the payload');
    assert.notEqual(different?.text, same?.text, 'a difference must never show the similarities');
    assert.equal(different?.role_label, COMPARISON_EVIDENCE_ROLE_BASIS);
    /*
     * 🔴 TWO DIFFERENT CLICKS, TWO DIFFERENT LABELS. Clicking the SECTION heading reports the section;
     *    clicking the ROW reports that row`s own dimension. The previous single card-level handler
     *    reported 「相同点」 for all three, which is how a difference came to be labelled a similarity.
     */
    assert.equal(different?.dimension_label, COMPARISON_DIFFERENT, 'a heading click names the section');
    const row = comparisonSelectionOf(candidate, 'different', '条件');
    assert.equal(row?.dimension_label, '条件', 'a row click names the row`s own dimension');
    assert.equal(row?.text, '差异点：条件不同', 'and delivers that row`s text');

    assert.equal(uncompared?.role_label, COMPARISON_EVIDENCE_ROLE_CONTEXT);
    assert.equal(uncompared?.text, '该维度未比对');

    /* A dimension that carries nothing produces NO payload rather than a misleading one. */
    const empty: RelatedAttemptCardView = { ...candidate, different_points: [], uncompared: [] };
    assert.equal(comparisonSelectionOf(empty, 'different'), null);
    assert.equal(comparisonSelectionOf(empty, 'uncompared'), null);
  });
});
