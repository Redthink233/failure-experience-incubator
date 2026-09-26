/**
 * FINAL-RAPID-B ｜ Frontend session / async integrity - the race, isolation and operation-identity suite.
 *
 * 🔴 THESE ARE `IMPLEMENTATION INVARIANT` CASES, NOT NEW PRODUCT `AC` (see `ac-reference-guard`). Each
 *    one pins behaviour the brief fixes and a later edit could silently undo; none creates an
 *    acceptance point and none changes the frozen contract.
 * 🔴 THE PORT IS THE REAL ONE. Every workspace below is an `InMemoryWorkspaceStorage` driven through
 *    the real `M15` composition with the deterministic fixture provider, so what is asserted is the
 *    session's behaviour over REALLY PERSISTED records rather than over a mock of the product. What
 *    the wrappers add is a DELAY on one call, or a note that the call happened - nothing else.
 * 🔴 THE DELAY IS THE WHOLE POINT: an out-of-order network response cannot be produced by running the
 *    real code at real speed, so `readWorkflow` and `persistCandidateCauses` can be HELD OPEN here and
 *    released on command. Without that, STATE-01 and CAUSE-01/02 are untestable by construction.
 * Real provider calls = 0; every model answer is a fixture payload.
 *
 * STATE-01..04 ｜ the stale-response race, the workspace switch and the record-scoped reset.
 * CAUSE-01..04 ｜ the serialised, coalescing cause queue and ⑤'s drain.
 * OP-01..02    ｜ the record-scoped operation identity.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createWorkflowAttemptIndex } from '../../application/workflow/attempt-summaries.js';
import { credentialRefForProvider } from '../../browser/ai/session-credential-store.js';
import { composeBrowserWorkspaceReader } from '../../browser/application/workspace-reader-composition.js';
import type { AppSession, AppSessionState } from '../../ui/session/app-session.js';
import { createAppSession } from '../../ui/session/app-session.js';
import type { UiReadPort, UiWorkflowPort } from '../../ui/session/ui-port.js';
import { createUiReadPort, createUiWorkflowPort } from '../../ui/session/ui-port.js';
import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import {
  ID_RELATED,
  ID_SOURCE,
  at,
  causePayload,
  makeWorkflowHarness,
  parsePayload,
  primeRetrieval,
  seedHistoricalCorpus,
  seedSource,
  timeoutError,
} from '../application/workflow/harness.js';

/* ================================================================== *
 * A one-shot gate: a held call cannot finish until the test opens it
 * ================================================================== */

interface Hold {
  readonly promise: Promise<void>;
  open(): void;
}

function hold(): Hold {
  let open: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

/** Drains the session's fire-and-forget chains (`decideCause` starts its queue without awaiting). */
async function settleTicks(ticks = 16): Promise<void> {
  for (let index = 0; index < ticks; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/* ================================================================== *
 * One workspace = one real storage + one real composition
 * ================================================================== */

interface Workspace {
  readonly label: string;
  readonly storage: InMemoryWorkspaceStorage;
  readonly harness: ReturnType<typeof makeWorkflowHarness>;
  readonly read_port: UiReadPort;
  readonly port: UiWorkflowPort;
}

interface WorkspaceOptions {
  /** Seed the historical corpus, the source record and its ⑥ derivation. */
  readonly history?: boolean;
  /** How many candidate causes step ④ proposes. Default 1. */
  readonly causes?: number;
  /** Make every step ⑥ dimension-judge call fail, so the AUTOMATIC ⑥ after ⑤ fails. */
  readonly fail_step_6?: boolean;
}

async function createWorkspace(label: string, options: WorkspaceOptions = {}): Promise<Workspace> {
  const storage = new InMemoryWorkspaceStorage();
  const statements = Array.from({ length: options.causes ?? 1 }, (_unused, index) => `候选原因 ${index + 1}`);
  const harness = makeWorkflowHarness({
    storage,
    parse: parsePayload({ result_status_proposal: '未达到目标' }),
    ...(options.causes === undefined ? {} : { cause: causePayload(statements) }),
    ...(options.fail_step_6 === true ? { fail_step_6_with: timeoutError() } : {}),
  });
  if (options.history === true) {
    /*
     * 🔴 `seedHistory` PRIMES ⑥, and with `fail_step_6` that priming would fail the fixture itself
     *    (`primeRetrieval` throws on `runtime_incomplete`). A broken ⑥ is the subject of OP-02, so the
     *    corpus is seeded WITHOUT priming there: the session then runs ⑥ for real, on a record it
     *    created, and that is the run the fault is meant to hit.
     */
    await seedHistoricalCorpus(harness);
    await seedSource(harness);
    if (options.fail_step_6 !== true) {
      await primeRetrieval(harness, ID_SOURCE);
    }
  }
  const reader = composeBrowserWorkspaceReader({ storage });
  return {
    label,
    storage,
    harness,
    read_port: createUiReadPort({ reads: reader.reads, index: reader.index }),
    port: createUiWorkflowPort({
      workflow: harness.workflow,
      index: createWorkflowAttemptIndex({ listAttempts: () => harness.attempts.listAttempts() }),
      capture: harness.capture,
    }),
  };
}

/* ================================================================== *
 * The bench: a session over the workspaces, with held/recorded calls
 * ================================================================== */

type EventStep = 'read' | 'list' | 'cause-write' | 'formal-save' | 'rerun';

interface RecordedEvent {
  readonly step: EventStep;
  readonly attempt_id: string;
}

interface Bench {
  readonly session: AppSession;
  readonly events: RecordedEvent[];
  /** `true` when the workspace is currently the one the session has authorized. */
  readonly probe: { readonly snapshots: readonly (string | null)[] };
  holdRead(attempt_id: string): void;
  releaseRead(attempt_id: string): void;
  holdNextCauseWrite(): void;
  releaseNextCauseWrite(): void;
  /** The `candidate_causes` payload of every `saveFormalAttempt` this bench saw, in order. */
  readonly formal_payloads: readonly unknown[];
  readonly formal_operation_ids: string[];
  readonly rerun_targets: readonly { readonly operation_id: string; readonly attempt_id: string }[];
}

const FIXTURE_DRAFT = {
  provider_id: 'browser-direct-custom',
  model: 'fixture-model',
  api_key: 'sk-fixture-NOT-A-REAL-KEY-RACE',
  custom_base_url: 'https://fixture.registry-fixture.test/v1/chat',
} as const;

function benchOf(workspaces: readonly Workspace[]): Bench {
  const by_label = new Map(workspaces.map((workspace) => [workspace.label, workspace]));
  const events: RecordedEvent[] = [];
  const read_holds = new Map<string, Hold>();
  const formal_payloads: unknown[] = [];
  const formal_operation_ids: string[] = [];
  const rerun_targets: { operation_id: string; attempt_id: string }[] = [];
  const snapshots: (string | null)[] = [];

  /*
   * 🔴 ONE GATE SLOT, AND IT IS CONSUMED BY THE WRITE THAT IS WAITING ON IT. The earlier shape queued
   *    gates in an array and shifted one when a write STARTED, which meant the release call had
   *    nothing left to open - the write stayed suspended, and the test hung instead of failing. The
   *    gate is therefore captured when it is taken and released by identity.
   */
  let armed_gate: Hold | null = null;
  let waiting_gate: Hold | null = null;

  let attached: Workspace | null = null;

  function instrumented(workspace: Workspace): UiWorkflowPort {
    const inner = workspace.port;
    return {
      ...inner,
      readWorkflow: async (attempt_id) => {
        const key = String(attempt_id);
        events.push({ step: 'read', attempt_id: key });
        const held = read_holds.get(key);
        if (held !== undefined) {
          await held.promise;
        }
        return inner.readWorkflow(attempt_id);
      },
      listWorkflowAttempts: () => {
        events.push({ step: 'list', attempt_id: workspace.label });
        return inner.listWorkflowAttempts();
      },
      persistCandidateCauses: async (command) => {
        const decision = command.decision as unknown as {
          readonly outcome: { readonly attempt_id: string };
        };
        events.push({ step: 'cause-write', attempt_id: decision.outcome.attempt_id });
        const gate = armed_gate;
        armed_gate = null;
        if (gate !== null) {
          waiting_gate = gate;
          await gate.promise;
        }
        return inner.persistCandidateCauses(command);
      },
      saveFormalAttempt: async (command) => {
        events.push({ step: 'formal-save', attempt_id: String(command.attempt_id) });
        formal_operation_ids.push(command.operation_id);
        formal_payloads.push(command.candidate_causes ?? null);
        return inner.saveFormalAttempt(command);
      },
      rerunRetrieval: async (command) => {
        events.push({ step: 'rerun', attempt_id: String(command.attempt_id) });
        rerun_targets.push({
          operation_id: command.operation_id,
          attempt_id: String(command.attempt_id),
        });
        return inner.rerunRetrieval(command);
      },
    };
  }

  const session = createAppSession({
    initial_draft: { ...FIXTURE_DRAFT },
    attachStorage: (label) => {
      const workspace = by_label.get(label);
      if (workspace === undefined) {
        return null;
      }
      attached = workspace;
      return workspace.read_port;
    },
    createGateway: () => {
      if (attached === null) {
        return { kind: 'unsupported', message: '没有可用的工作区。' };
      }
      return {
        kind: 'ready',
        gateway: {
          port: instrumented(attached),
          credential_ref: credentialRefForProvider('browser-direct-custom'),
          connection_label: '连接方式：浏览器直连',
          provider_display_name: 'Fixture provider',
          model: 'fixture-model',
        },
      };
    },
  });

  session.subscribe((state) => {
    snapshots.push(state.snapshot === null ? null : String(state.snapshot.attempt_id));
  });

  return {
    session,
    events,
    probe: { snapshots },
    holdRead: (attempt_id) => {
      read_holds.set(attempt_id, hold());
    },
    releaseRead: (attempt_id) => {
      read_holds.get(attempt_id)?.open();
      read_holds.delete(attempt_id);
    },
    holdNextCauseWrite: () => {
      armed_gate = hold();
    },
    releaseNextCauseWrite: () => {
      const gate = waiting_gate ?? armed_gate;
      waiting_gate = null;
      armed_gate = null;
      gate?.open();
    },
    formal_payloads,
    formal_operation_ids,
    rerun_targets,
  };
}

/* ================================================================== *
 * Fixtures: steps ① - ④ through the real session
 * ================================================================== */

async function startDraft(session: AppSession, raw_text = '一次没有达到目标的尝试：目标 G，做法 S1。'): Promise<string> {
  session.openNewAttempt();
  session.setRawInput(raw_text);
  await session.beginCapture();
  const attempt_id = session.getState().selected_attempt_id;
  assert.ok(attempt_id !== null, 'step ① must select the record it created');
  return attempt_id;
}

async function confirm(session: AppSession): Promise<void> {
  session.setResultStatusDecision('accepted');
  await session.confirmStructured();
}

async function analyse(session: AppSession): Promise<readonly string[]> {
  await session.analyseCauses();
  const proposal = session.getState().cause_proposal;
  assert.ok(proposal !== null, 'step ④ must produce a proposal');
  return proposal.candidates.map((candidate) => String(candidate.content_item_id));
}

/** The decisions the RECORD really holds - read from the persisted set, never from UI state. */
function persistedDecisions(state: AppSessionState): Readonly<Record<string, string>> {
  const items = state.snapshot?.attempt.candidate_causes ?? [];
  return Object.fromEntries(items.map((item) => [String(item.content_item_id), String(item.decision_state)]));
}

/** The decisions inside a `saveFormalAttempt` payload - what ⑤ really wrote. */
function payloadDecisions(payload: unknown): Readonly<Record<string, string>> {
  const outcome = (payload as { readonly outcome?: { readonly candidates?: readonly unknown[] } } | null)?.outcome;
  const candidates = (outcome?.candidates ?? []) as readonly {
    readonly content_item_id: string;
    readonly decision_state: string;
  }[];
  return Object.fromEntries(candidates.map((candidate) => [candidate.content_item_id, candidate.decision_state]));
}

/* ================================================================== *
 * STATE-01 - a slow read of A must never overwrite a fast read of B
 * ================================================================== */

describe('FINAL-RAPID-B ｜ IMPLEMENTATION INVARIANT｜the stale-response race (STATE-01)', () => {
  it('IMPLEMENTATION INVARIANT (STATE-01): a delayed A read is DISCARDED and the UI keeps B', async () => {
    const workspace = await createWorkspace('w1', { history: true });
    const bench = benchOf([workspace]);
    await bench.session.attachWorkspace('w1');

    /* 🔴 A's read is held open BEFORE it is issued, so B's read really overtakes it. */
    bench.holdRead(ID_SOURCE);
    const selecting_a = bench.session.selectAttempt(ID_SOURCE);
    const selecting_b = bench.session.selectAttempt(ID_RELATED);
    await selecting_b;

    assert.equal(
      String(bench.session.getState().snapshot?.attempt_id),
      ID_RELATED,
      'precondition: the fast read reached the screen',
    );

    bench.releaseRead(ID_SOURCE);
    await selecting_a;
    await settleTicks();

    const state = bench.session.getState();
    assert.equal(String(state.selected_attempt_id), ID_RELATED, 'the selection must still be B');
    assert.equal(
      String(state.snapshot?.attempt_id),
      ID_RELATED,
      'the late A snapshot must be DROPPED, not applied over B',
    );

    /* 🔴 AND IT MUST NEVER HAVE BEEN SHOWN, not merely "be gone by the end". */
    const after_b = bench.probe.snapshots.lastIndexOf(ID_RELATED);
    assert.ok(after_b >= 0, 'precondition: B really was rendered');
    assert.equal(
      bench.probe.snapshots.slice(after_b).includes(ID_SOURCE),
      false,
      'no render may ever have shown the superseded A snapshot after B',
    );
  });
});

/* ================================================================== *
 * STATE-02 - the workspace switch clears every record-scoped field
 * ================================================================== */

describe('FINAL-RAPID-B ｜ IMPLEMENTATION INVARIANT｜the workspace switch (STATE-02)', () => {
  it('IMPLEMENTATION INVARIANT (STATE-02): switching workspace clears the snapshot, causes, edits and evidence', async () => {
    const first = await createWorkspace('w1', { history: true, causes: 2 });
    const second = await createWorkspace('w2');
    const bench = benchOf([first, second]);

    await bench.session.attachWorkspace('w1');
    await bench.session.selectAttempt(ID_SOURCE);
    const causes = await analyse(bench.session);
    bench.session.decideCause(causes[0] as string, 'accepted');
    await settleTicks();

    bench.session.setConfirmationEdit('user_note', '旧记录的编辑');
    bench.session.setResultStatusText('旧记录的状态');
    bench.session.setInsightEdit('INS_fixture', '旧记录的洞察编辑');
    bench.session.toggleRetrievalExpanded();
    bench.session.selectComparisonPoint({
      attempt_id: ID_SOURCE,
      dimension_label: '目标',
      text: '旧记录的对比',
      role: 'context',
    });

    const before = bench.session.getState();
    assert.ok(before.snapshot !== null, 'precondition: A really was open');
    assert.ok(before.cause_proposal !== null, 'precondition: ④ really ran');
    assert.ok(before.evidence !== null, 'precondition: the evidence rail really had a panel');

    await bench.session.attachWorkspace('w2');

    const after = bench.session.getState();
    assert.equal(after.workspace.status, 'connected');
    assert.equal(after.workspace.label, 'w2', 'the rail must be about the NEW workspace');
    assert.equal(after.selected_attempt_id, null, 'the centre must not still be on A');
    assert.equal(after.snapshot, null, 'no snapshot of the old workspace may survive');
    assert.equal(after.cause_proposal, null, 'no old cause proposal may survive');
    assert.deepEqual(after.cause_decisions, {}, 'no old cause decision may survive');
    assert.deepEqual(after.confirmation_edits, {}, 'no old ③ edit may survive');
    assert.equal(after.result_status_text, null, 'no old ③ text may survive');
    assert.deepEqual(after.insight_edits, {}, 'no old ⑧ edit may survive');
    assert.equal(after.evidence, null, 'the evidence rail must be empty');
    assert.equal(after.retrieval_expanded, false, 'the ⑦ expansion must be closed');
    assert.equal(after.attempt_missing, false);
    assert.deepEqual(after.notices, [], 'a notice about the old workspace is not about this one');
    assert.equal(after.attempts_loaded, true, 'the new workspace really was listed');
    assert.deepEqual(after.attempts, [], 'the empty workspace has no records');

    /* 🔴 SESSION-SCOPE FACTS MUST SURVIVE - this is the half that must NOT be reset. */
    assert.equal(after.provider.status, 'ready', 'the model configuration is session scope');
    assert.equal(after.settings_draft.model, FIXTURE_DRAFT.model, 'the draft is session scope');
    assert.equal(before.provider.provider_id, after.provider.provider_id);
  });
});

/* ================================================================== *
 * STATE-03 - an operation of the old workspace may not touch the new one
 * ================================================================== */

describe('FINAL-RAPID-B ｜ IMPLEMENTATION INVARIANT｜a late operation of the old workspace (STATE-03)', () => {
  it('IMPLEMENTATION INVARIANT (STATE-03): a read that lands after the switch changes NOTHING', async () => {
    const first = await createWorkspace('w1', { history: true });
    const second = await createWorkspace('w2');
    const bench = benchOf([first, second]);

    await bench.session.attachWorkspace('w1');
    bench.holdRead(ID_SOURCE);
    const late = bench.session.selectAttempt(ID_SOURCE);

    await bench.session.attachWorkspace('w2');
    const after_switch = bench.session.getState();
    assert.equal(after_switch.selected_attempt_id, null, 'precondition: the switch released the record');

    /* The old read now answers - with a REAL snapshot of A, produced by w1's own storage. */
    bench.releaseRead(ID_SOURCE);
    await late;
    await settleTicks();

    const after = bench.session.getState();
    assert.equal(after.selected_attempt_id, null, 'the dead operation must not re-select A');
    assert.equal(after.snapshot, null, 'and must not draw A into the new workspace');
    assert.equal(after.attempts.length, 0, 'nor repopulate the rail of the new workspace');
    assert.deepEqual(after.notices, [], 'nor raise a notice about a workspace the user has left');
    assert.equal(
      bench.probe.snapshots.includes(ID_SOURCE),
      false,
      'A may never be rendered once the switch has happened',
    );
  });

  it('IMPLEMENTATION INVARIANT (STATE-03): a cause write of the old workspace lands on the OLD record only', async () => {
    const first = await createWorkspace('w1', { history: true, causes: 1 });
    const second = await createWorkspace('w2');
    const bench = benchOf([first, second]);

    await bench.session.attachWorkspace('w1');
    await bench.session.selectAttempt(ID_SOURCE);
    const causes = await analyse(bench.session);

    /* 🔴 The write is ALREADY IN FLIGHT when the workspace changes. */
    bench.holdNextCauseWrite();
    bench.session.decideCause(causes[0] as string, 'accepted');
    await settleTicks(2);
    assert.equal(
      bench.events.filter((event) => event.step === 'cause-write').length,
      1,
      'precondition: the write really started before the switch',
    );

    await bench.session.attachWorkspace('w2');
    bench.releaseNextCauseWrite();
    await settleTicks();

    const after = bench.session.getState();
    assert.equal(after.selected_attempt_id, null);
    assert.equal(after.snapshot, null, 'the finished write must not repaint the old record');
    assert.deepEqual(after.notices, []);
    assert.equal(after.flash, null);

    /* 🔴 AND THE DECISION REALLY LANDED - on A, in the workspace it belonged to. */
    const read_back = await first.harness.workflow.readWorkflow(at(ID_SOURCE));
    assert.equal(read_back.kind, 'snapshot');
    const persisted =
      read_back.kind === 'snapshot'
        ? read_back.snapshot.attempt.candidate_causes.map((item) => String(item.decision_state))
        : [];
    assert.deepEqual(persisted, ['accepted'], 'the interrupted write must not be lost either');
  });
});

/* ================================================================== *
 * STATE-04 - a new record starts clean
 * ================================================================== */

describe('FINAL-RAPID-B ｜ IMPLEMENTATION INVARIANT｜the new-record reset (STATE-04)', () => {
  it('IMPLEMENTATION INVARIANT (STATE-04): ① opens with none of the previous record`s causes or edits', async () => {
    const workspace = await createWorkspace('w1', { causes: 2 });
    const bench = benchOf([workspace]);
    await bench.session.attachWorkspace('w1');

    await startDraft(bench.session, '第一条：目标 G，做法 S1。');
    const previous = String(bench.session.getState().selected_attempt_id);
    await confirm(bench.session);
    const causes = await analyse(bench.session);
    bench.session.decideCause(causes[0] as string, 'accepted');
    bench.session.setConfirmationEdit('user_note', '旧记录的备注');
    bench.session.setInsightEdit('INS_fixture', '旧记录的洞察');
    bench.session.setResultStatusText('旧记录的状态');
    bench.session.toggleRetrievalExpanded();
    bench.session.selectComparisonPoint({
      attempt_id: previous,
      dimension_label: '条件',
      text: '旧记录的对比',
      role: 'context',
    });
    await settleTicks();

    bench.session.openNewAttempt();
    const opened = bench.session.getState();
    assert.equal(opened.new_attempt_open, true);
    assert.equal(opened.raw_input, '', '① must start empty');
    assert.equal(opened.snapshot, null, 'the previous record must leave the screen');
    assert.equal(opened.cause_proposal, null, 'no old proposal may sit above the new form');
    assert.deepEqual(opened.cause_decisions, {});
    assert.deepEqual(opened.confirmation_edits, {});
    assert.deepEqual(opened.insight_edits, {});
    assert.equal(opened.result_status_text, null);
    assert.equal(opened.evidence, null);
    assert.equal(opened.retrieval_expanded, false);
    assert.deepEqual(opened.notices, []);

    /* And the record ① creates is clean too - the reset happens on the success path as well. */
    bench.session.setRawInput('第二条：目标 G，做法 S2。');
    await bench.session.beginCapture();
    const created = bench.session.getState();
    assert.notEqual(String(created.selected_attempt_id), previous, 'a NEW record must be selected');
    assert.ok(created.snapshot !== null, 'and it must be read');
    assert.equal(created.cause_proposal, null, 'the new record has no candidate causes');
    assert.deepEqual(created.cause_decisions, {});
    assert.deepEqual(created.confirmation_edits, {});
    assert.deepEqual(created.insight_edits, {});
    assert.equal(created.evidence, null);
    assert.equal(created.raw_input, '', 'the submitted text must be cleared');
  });
});

/* ================================================================== *
 * CAUSE-01 - two causes decided, resolved out of order
 * ================================================================== */

describe('FINAL-RAPID-B ｜ IMPLEMENTATION INVARIANT｜two causes decided out of order (CAUSE-01)', () => {
  it('IMPLEMENTATION INVARIANT (CAUSE-01): the FINAL write carries both decisions, whatever the timing', async () => {
    const workspace = await createWorkspace('w1', { causes: 2 });
    const bench = benchOf([workspace]);
    await bench.session.attachWorkspace('w1');

    await startDraft(bench.session);
    await confirm(bench.session);
    const causes = await analyse(bench.session);
    const [first_cause, second_cause] = causes as [string, string];

    /* 🔴 Both writes are serialised, so "out of order" can only mean "the first is still open when the
     *    second decision is made". That is exactly the reported race: the older write must not be the
     *    one that ends up in the record. */
    bench.holdNextCauseWrite();
    bench.session.decideCause(first_cause, 'accepted');
    await settleTicks(2);
    bench.session.decideCause(second_cause, 'rejected');
    bench.releaseNextCauseWrite();
    await settleTicks();

    const state = bench.session.getState();
    assert.deepEqual(
      { ...state.cause_decisions },
      { [first_cause]: 'accepted', [second_cause]: 'rejected' },
      'the screen must hold both decisions',
    );
    assert.deepEqual(
      { ...persistedDecisions(state) },
      { [first_cause]: 'accepted', [second_cause]: 'rejected' },
      'and the RECORD must end on both of them',
    );

    /* 🔴 At most ONE write may be in flight at a time - that is what makes the order deterministic. */
    const writes = bench.events.filter((event) => event.step === 'cause-write').length;
    assert.ok(writes >= 1, 'the decisions must really have been written');
  });
});

/* ================================================================== *
 * CAUSE-02 - the same cause, decided twice in a row
 * ================================================================== */

describe('FINAL-RAPID-B ｜ IMPLEMENTATION INVARIANT｜the same cause decided twice (CAUSE-02)', () => {
  it('IMPLEMENTATION INVARIANT (CAUSE-02): accepted then rejected really ends `rejected`', async () => {
    const workspace = await createWorkspace('w1', { causes: 1 });
    const bench = benchOf([workspace]);
    await bench.session.attachWorkspace('w1');

    await startDraft(bench.session);
    await confirm(bench.session);
    const [cause] = (await analyse(bench.session)) as [string];

    /* 🔴 The second click happens while the first write is still pending. Before `FINAL-RAPID-B` this
     *    was swallowed by the pending flag, so the record kept `accepted` while the screen said
     *    `rejected` - two different truths about the same decision. */
    bench.holdNextCauseWrite();
    bench.session.decideCause(cause, 'accepted');
    await settleTicks(2);
    bench.session.decideCause(cause, 'rejected');
    assert.equal(bench.session.getState().cause_decisions[cause], 'rejected', 'the screen updates at once');

    bench.releaseNextCauseWrite();
    await settleTicks();

    const state = bench.session.getState();
    assert.equal(state.cause_decisions[cause], 'rejected');
    assert.equal(
      persistedDecisions(state)[cause],
      'rejected',
      'the SECOND decision is the one that must be persisted',
    );
  });
});

/* ================================================================== *
 * CAUSE-03 / CAUSE-04 - ⑤ waits for ④, and nothing overwrites it after
 * ================================================================== */

describe('FINAL-RAPID-B ｜ IMPLEMENTATION INVARIANT｜⑤ waits for the cause queue (CAUSE-03 / CAUSE-04)', () => {
  async function threeCausesThenSave(): Promise<{
    readonly bench: Bench;
    readonly decisions: Readonly<Record<string, string>>;
    readonly cause_writes_before_release: number;
  }> {
    const workspace = await createWorkspace('w1', { history: true, causes: 3 });
    const bench = benchOf([workspace]);
    await bench.session.attachWorkspace('w1');

    await startDraft(bench.session);
    await confirm(bench.session);
    const causes = (await analyse(bench.session)) as readonly [string, string, string];

    /* 🔴 The queue is held open, so ⑤ genuinely has something to wait for. */
    bench.holdNextCauseWrite();
    bench.session.decideCause(causes[0], 'accepted');
    bench.session.decideCause(causes[1], 'rejected');
    bench.session.decideCause(causes[2], 'accepted');
    await settleTicks(2);

    return {
      bench,
      decisions: { [causes[0]]: 'accepted', [causes[1]]: 'rejected', [causes[2]]: 'accepted' },
      cause_writes_before_release: bench.events.filter((event) => event.step === 'cause-write').length,
    };
  }

  it('IMPLEMENTATION INVARIANT (CAUSE-03): ⑤ does not run until the queue has drained, and persists the FINAL decisions', async () => {
    const { bench, decisions, cause_writes_before_release } = await threeCausesThenSave();

    const saving = bench.session.saveFormal();
    await settleTicks(3);
    assert.equal(
      bench.events.some((event) => event.step === 'formal-save'),
      false,
      '⑤ must WAIT for ④ - it may not overtake a cause write that is still open',
    );

    bench.releaseNextCauseWrite();
    await saving;
    await settleTicks();

    assert.equal(bench.formal_operation_ids.length, 1, 'exactly one formal save ran');
    assert.deepEqual(
      { ...payloadDecisions(bench.formal_payloads[0]) },
      { ...decisions },
      '⑤ must persist the decisions the user had reached, not the ones it could have read earlier',
    );
    assert.deepEqual({ ...persistedDecisions(bench.session.getState()) }, { ...decisions });
    assert.ok(cause_writes_before_release >= 1, 'the queue really had started before ⑤ was asked to save');
  });

  it('IMPLEMENTATION INVARIANT (CAUSE-04): no older cause write lands after the formal save', async () => {
    const { bench, decisions } = await threeCausesThenSave();

    const saving = bench.session.saveFormal();
    bench.releaseNextCauseWrite();
    await saving;
    await settleTicks();

    const save_index = bench.events.findIndex((event) => event.step === 'formal-save');
    assert.ok(save_index >= 0, 'precondition: ⑤ ran');
    const writes_after = bench.events
      .map((event, index) => ({ event, index }))
      .filter((entry) => entry.event.step === 'cause-write' && entry.index > save_index);
    assert.deepEqual(
      writes_after.map((entry) => entry.event.attempt_id),
      [],
      'the drained queue must leave nothing behind to put the old causes back',
    );

    /* 🔴 And the record the save produced is STILL the final decisions - the end state, not the order. */
    assert.deepEqual({ ...persistedDecisions(bench.session.getState()) }, { ...decisions });
  });
});

/* ================================================================== *
 * OP-01 / OP-02 - the record-scoped operation identity
 * ================================================================== */

describe('FINAL-RAPID-B ｜ IMPLEMENTATION INVARIANT｜operation identity per record (OP-01 / OP-02)', () => {
  async function twoFormalRecords(): Promise<{ readonly bench: Bench; readonly ids: readonly [string, string] }> {
    const workspace = await createWorkspace('w1', { history: true });
    const bench = benchOf([workspace]);
    await bench.session.attachWorkspace('w1');

    const a = await startDraft(bench.session, '第一条：目标 G，做法 S1。');
    await confirm(bench.session);
    await bench.session.saveFormal();

    const b = await startDraft(bench.session, '第二条：目标 G，做法 S2。');
    await confirm(bench.session);
    await bench.session.saveFormal();

    return { bench, ids: [a, b] };
  }

  it('IMPLEMENTATION INVARIANT (OP-01): A and B formal saves carry DIFFERENT operation ids, each naming its record', async () => {
    const { bench, ids } = await twoFormalRecords();
    const [a, b] = ids;

    assert.equal(bench.formal_operation_ids.length, 2);
    const [first, second] = bench.formal_operation_ids as [string, string];
    assert.notEqual(first, second, 'record B must not inherit record A`s operation id');
    assert.ok(first.includes(a), `the formal-save id of A must name A: ${first}`);
    assert.ok(second.includes(b), `the formal-save id of B must name B: ${second}`);
    assert.equal(first.includes(b), false);
    assert.equal(second.includes(a), false);
  });

  it('IMPLEMENTATION INVARIANT (OP-02 §7): a successful ⑤ ENDS even when the automatic ⑥ failed, and ⑥ is retried by name', async () => {
    const workspace = await createWorkspace('w1', { history: true, fail_step_6: true });
    const bench = benchOf([workspace]);
    await bench.session.attachWorkspace('w1');

    const a = await startDraft(bench.session);
    await confirm(bench.session);
    await bench.session.saveFormal();

    /* 🔴 ⑤ really happened: the record is Formal and exactly one save was issued. */
    assert.equal(bench.formal_operation_ids.length, 1);
    assert.equal(bench.session.getState().snapshot?.attempt_state, 'Formal');

    /* 🔴 And ⑥ failed, in the ONLY way it may: a RUNTIME notice naming the retry. */
    const notice = bench.session.getState().notices.find((entry) => entry.code === 'RETRIEVAL_RUNTIME_INCOMPLETE');
    assert.ok(notice !== undefined, 'the failed automatic ⑥ must be reported, not swallowed');
    assert.equal(notice?.recovery?.kind, 'rerun_retrieval');
    assert.equal(String(notice?.recovery?.attempt_id), a, 'and the recovery must name the record');

    /* 🔴 ⑤ IS RETIRED: a second save is a NEW operation, not a replay of the one that finished. */
    const first_id = bench.formal_operation_ids[0] as string;
    await bench.session.saveFormal();
    assert.equal(bench.formal_operation_ids.length, 2);
    assert.notEqual(bench.formal_operation_ids[1], first_id, 'the finished ⑤ must not be replayed');

    /* 🔴 ⑥ IS RETRIED BY ITS OWN NAME, and ⑤ is NOT re-run to retry it. */
    workspace.harness.provider.faults.step_6 = null;
    const saves_before = bench.formal_operation_ids.length;
    await bench.session.recoverNotice({ key: 'rerun_retrieval', attempt_id: a });

    assert.equal(bench.rerun_targets.length, 1, 'exactly one rerun ran');
    assert.equal(bench.rerun_targets[0]?.attempt_id, a, 'and it ran against the record the notice named');
    assert.ok(
      String(bench.rerun_targets[0]?.operation_id).includes(a),
      'the rerun operation must name its record too',
    );
    assert.equal(
      bench.formal_operation_ids.length,
      saves_before,
      'retrying ⑥ must NEVER re-issue the formal save',
    );

    /* 🔴 And B is unaffected: a save of another record never picks up A`s ledger result. */
    const b = await startDraft(bench.session, '另一条：目标 X，做法 S9。');
    await confirm(bench.session);
    await bench.session.saveFormal();
    assert.equal(
      String(bench.session.getState().selected_attempt_id),
      b,
      'the new record must be the one on screen',
    );
    const b_id = bench.formal_operation_ids[bench.formal_operation_ids.length - 1] as string;
    assert.ok(b_id.includes(b));
    assert.equal(b_id.includes(a), false, 'B may not carry A`s operation');
  });
});
