/**
 * FINAL-RAPID-B ｜ Notice recovery: the TARGET, and the button that must not lie.
 *
 * 🔴 THESE ARE `IMPLEMENTATION INVARIANT` CASES, NOT NEW PRODUCT `AC`. Both defects are in the shipped
 *    App Shell - "the recovery ran against the wrong record" (§8) and "「重试」 only dismissed the card"
 *    (§9) - and neither creates an acceptance point nor touches the frozen contract.
 * 🔴 NOTICE-01 IS DRIVEN THROUGH THE REAL SESSION over real `M15` compositions: the notice, the command
 *    and the record it belongs to are all real, and what is asserted is WHICH RECORD the command
 *    reached. NOTICE-02 is decided on the view model, because that is the layer that must decide a
 *    button's wording and its action together.
 * Real provider calls = 0; every model answer is a fixture payload.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createWorkflowAttemptIndex } from '../../application/workflow/attempt-summaries.js';
import { WORKFLOW_ERROR_MESSAGES, workflowNotice } from '../../application/workflow/errors.js';
import type { WorkflowErrorCode } from '../../application/workflow/types.js';
import { credentialRefForProvider } from '../../browser/ai/session-credential-store.js';
import { composeBrowserWorkspaceReader } from '../../browser/application/workspace-reader-composition.js';
import { NOTICE_RETRY } from '../../ui/copy.js';
import { dismissLabel, noticeViewOf, recoveryKeyOf, shellRuntimeNoticeView } from '../../ui/presenters/notices.js';
import type { AppSession } from '../../ui/session/app-session.js';
import { createAppSession } from '../../ui/session/app-session.js';
import type { UiReadPort, UiWorkflowPort } from '../../ui/session/ui-port.js';
import { createUiReadPort, createUiWorkflowPort } from '../../ui/session/ui-port.js';
import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import {
  ID_RELATED,
  ID_SOURCE,
  at,
  makeWorkflowHarness,
  parsePayload,
  primeRetrieval,
  seedHistoricalCorpus,
  seedSource,
  timeoutError,
} from '../application/workflow/harness.js';

/* ================================================================== *
 * Two real workspaces: the one under repair, and an empty one to switch to
 * ================================================================== */

const MAIN = 'fixture-workspace';
const EMPTY = 'empty-workspace';

interface Node {
  readonly label: string;
  readonly storage: InMemoryWorkspaceStorage;
  readonly harness: ReturnType<typeof makeWorkflowHarness>;
  readonly read_port: UiReadPort;
  readonly port: UiWorkflowPort;
}

async function node(label: string, options: { readonly history?: boolean; readonly fail_step_6?: boolean } = {}): Promise<Node> {
  const storage = new InMemoryWorkspaceStorage();
  const harness = makeWorkflowHarness({
    storage,
    parse: parsePayload({ result_status_proposal: '未达到目标' }),
    ...(options.fail_step_6 === true ? { fail_step_6_with: timeoutError() } : {}),
  });
  if (options.history === true) {
    /*
     * 🔴 `seedHistory` PRIMES ⑥, and with the fault switch on that priming throws (it refuses a
     *    `runtime_incomplete` step ⑥). A broken ⑥ is the SUBJECT here, so the corpus is seeded without
     *    priming: the session then runs ⑥ for real, over a record it created, and that run is the one
     *    the fault is meant to hit.
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

interface Bench {
  readonly session: AppSession;
  readonly rerun_targets: readonly { readonly operation_id: string; readonly attempt_id: string }[];
  readonly saves: readonly string[];
}

/**
 * The session over the given workspaces.
 *
 * 🔴 BOTH HALVES FOLLOW THE LABEL THAT WAS AUTHORIZED. `attachStorage` hands back that directory's
 *    reader AND `createGateway` composes over that directory's command port - so "the user chose
 *    another directory" really means "the old records are no longer reachable", which is the only way
 *    a refused recovery can be tested honestly.
 */
function benchOf(nodes: readonly Node[]): Bench {
  const by_label = new Map(nodes.map((entry) => [entry.label, entry]));
  const rerun_targets: { operation_id: string; attempt_id: string }[] = [];
  const saves: string[] = [];
  let attached: Node | null = null;

  function wrapped(target: Node): UiWorkflowPort {
    return {
      ...target.port,
      saveFormalAttempt: (command) => {
        saves.push(command.operation_id);
        return target.port.saveFormalAttempt(command);
      },
      rerunRetrieval: (command) => {
        rerun_targets.push({
          operation_id: command.operation_id,
          attempt_id: String(command.attempt_id),
        });
        return target.port.rerunRetrieval(command);
      },
    };
  }

  const session = createAppSession({
    initial_draft: {
      provider_id: 'browser-direct-custom',
      model: 'fixture-model',
      api_key: 'sk-fixture-NOT-A-REAL-KEY-NOTICE',
      custom_base_url: 'https://fixture.registry-fixture.test/v1/chat',
    },
    attachStorage: (label) => {
      const target = by_label.get(label);
      if (target === undefined) {
        return null;
      }
      attached = target;
      return target.read_port;
    },
    createGateway: () => {
      if (attached === null) {
        return { kind: 'unsupported', message: '没有可用的工作区。' };
      }
      return {
        kind: 'ready',
        gateway: {
          port: wrapped(attached),
          credential_ref: credentialRefForProvider('browser-direct-custom'),
          connection_label: '连接方式：浏览器直连',
          provider_display_name: 'Fixture provider',
          model: 'fixture-model',
        },
      };
    },
  });

  return { session, rerun_targets, saves };
}

/** Steps ① - ⑤ of a fresh record, leaving an automatic ⑥ that failed (when the fixture says so). */
async function startAndSave(session: AppSession, raw_text = '一次没有达到目标的尝试：目标 G，做法 S1。'): Promise<string> {
  session.openNewAttempt();
  session.setRawInput(raw_text);
  await session.beginCapture();
  session.setResultStatusDecision('accepted');
  await session.confirmStructured();
  await session.saveFormal();
  const attempt_id = session.getState().selected_attempt_id;
  assert.ok(attempt_id !== null, 'step ① must select the record it created');
  return attempt_id;
}

/* ================================================================== *
 * NOTICE-01 - the recovery runs against the record the NOTICE names
 * ================================================================== */

describe('FINAL-RAPID-B ｜ IMPLEMENTATION INVARIANT｜the recovery target (NOTICE-01)', () => {
  it('IMPLEMENTATION INVARIANT (NOTICE-01): with B on screen, A`s recovery still repairs A', async () => {
    const wired = benchOf([await node(MAIN, { history: true, fail_step_6: true })]);
    await wired.session.attachWorkspace(MAIN);

    const a = await startAndSave(wired.session);
    const notice = wired.session.getState().notices.find((entry) => entry.code === 'RETRIEVAL_RUNTIME_INCOMPLETE');
    assert.ok(notice !== undefined, 'precondition: ⑥ failed on A and the notice offers the retry');
    const recovery = notice.recovery;
    assert.ok(recovery !== null, 'precondition: the notice offers a recovery');
    assert.equal(
      'attempt_id' in recovery ? String(recovery.attempt_id) : null,
      a,
      'precondition: the notice targets A',
    );

    /* 🔴 THE USER MOVES ON: B is now the record on screen. */
    await wired.session.selectAttempt(ID_RELATED);
    assert.equal(String(wired.session.getState().selected_attempt_id), ID_RELATED, 'precondition: B is open');

    const outcome = await wired.session.recoverNotice({ key: 'rerun_retrieval', attempt_id: a });

    assert.equal(outcome, 'ran');
    assert.equal(wired.rerun_targets.length, 1, 'exactly one rerun ran');
    assert.equal(
      wired.rerun_targets[0]?.attempt_id,
      a,
      'the command must reach the record the NOTICE named - not the one that happened to be selected',
    );
    assert.notEqual(wired.rerun_targets[0]?.attempt_id, ID_RELATED, 'B must not be repaired on A`s behalf');
    assert.equal(String(wired.session.getState().selected_attempt_id), a, 'and A is what the user ends up on');
    assert.equal(wired.saves.length, 1, 'a recovery may never re-issue the formal save');
  });

  it('IMPLEMENTATION INVARIANT (NOTICE-01 §8): a target that cannot be opened is REFUSED, never substituted', async () => {
    const wired = benchOf([
      await node(MAIN, { history: true, fail_step_6: true }),
      await node(EMPTY),
    ]);
    await wired.session.attachWorkspace(MAIN);
    const a = await startAndSave(wired.session);
    assert.equal(wired.saves.length, 1);

    /* 🔴 The directory is replaced by one that does not contain the record at all. */
    await wired.session.attachWorkspace(EMPTY);
    assert.equal(wired.session.getState().selected_attempt_id, null, 'precondition: nothing is open');

    const outcome = await wired.session.recoverNotice({ key: 'rerun_retrieval', attempt_id: a });

    /* 🔴 A refused recovery is an OUTCOME, not a silent success: nothing ran, and in particular the
     *    record that IS on screen was not commandeered for a notice about another one. */
    assert.equal(outcome, 'refused');
    assert.equal(wired.rerun_targets.length, 0, 'the command must not run at all');
    assert.equal(wired.saves.length, 1, 'and still no formal save is issued');
    assert.equal(wired.session.getState().attempt_missing, true, 'the reason is the missing record');
  });

  it('IMPLEMENTATION INVARIANT (NOTICE-01 §8): the workspace recoveries are reported to the DOM layer', async () => {
    const wired = benchOf([await node(MAIN, { history: true })]);
    await wired.session.attachWorkspace(MAIN);

    /* 🔴 The picker needs a real user gesture, so the session asks for it instead of acting (§9 / U3). */
    assert.equal(
      await wired.session.recoverNotice({ key: 'select_workspace', attempt_id: null }),
      'workspace_picker',
    );
    assert.equal(
      await wired.session.recoverNotice({ key: 'grant_workspace_access', attempt_id: null }),
      'workspace_picker',
    );
    assert.equal(wired.rerun_targets.length, 0, 'and no command ran');
    /* An unrecognised key is "nothing to run", not some other command. */
    assert.equal(recoveryKeyOf('made_up_key'), 'none');
    assert.equal(await wired.session.recoverNotice({ key: 'none', attempt_id: null }), 'ran');
  });
});

/* ================================================================== *
 * NOTICE-02 - a retry must really retry, a close must really close
 * ================================================================== */

describe('FINAL-RAPID-B ｜ IMPLEMENTATION INVARIANT｜no control may promise what it does not do (NOTICE-02)', () => {
  it('IMPLEMENTATION INVARIANT (NOTICE-02 §9): a retry is only ever backed by a real command', () => {
    const codes = Object.keys(WORKFLOW_ERROR_MESSAGES) as readonly WorkflowErrorCode[];
    assert.ok(codes.length >= 10, `expected the whole error table, found ${codes.length} codes`);

    const real_command = new Set([
      'rerun_retrieval',
      'regenerate_insights',
      'regenerate_hypotheses',
      'select_workspace',
      'grant_workspace_access',
    ]);
    const target = { kind: 'rerun_retrieval', attempt_id: at(ID_SOURCE) } as const;

    for (const code of codes) {
      /* 🔴 BOTH SHAPES a notice can arrive in: with the service naming a recovery, and with it naming
       *    none. The defect lived in the second one, so the sweep must cover it for every code. */
      for (const view of [noticeViewOf(workflowNotice(code)), noticeViewOf(workflowNotice(code, target))]) {
        if (view.retryable) {
          assert.ok(view.recovery !== null, `${code}: a retry must come with something to run`);
          assert.ok(
            real_command.has(view.recovery.key),
            `${code}: "retryable" must mean a REAL command, received "${view.recovery.key}"`,
          );
        }
        if (view.recovery?.key === 'dismiss') {
          /* 🔴 THE DEFECT ITSELF: a dismissal must never be presented as a retry. */
          assert.equal(view.retryable, false, `${code}: a dismissal is not a retry`);
          assert.notEqual(view.recovery.label, NOTICE_RETRY, `${code}: a close must not be labelled 重试`);
          assert.equal(view.recovery.label, dismissLabel());
        }
      }
    }
  });

  it('IMPLEMENTATION INVARIANT (NOTICE-02 §9): a retryable notice with no command offers a real close', () => {
    /* 🔴 The reported defect, exactly: the service says a retry may help but names no command. Before the
     *    fix this rendered a 「重试」 control wired to `dismissNotices()` - the wording and the behaviour
     *    disagreed, which §9 forbids outright. */
    const view = noticeViewOf(workflowNotice('PROVIDER_FAILURE'));
    assert.equal(view.retryable, false, 'there is nothing to retry, so nothing may say 重试');
    assert.equal(view.recovery?.key, 'dismiss', 'and the notice is still closeable');
    assert.equal(view.recovery?.label, dismissLabel());
    assert.equal(view.recovery?.label === NOTICE_RETRY, false);

    /* The App Shell`s own runtime notice is the same case: an unsupported composition cannot be
     * "retried", so it must not offer to. */
    const shell_view = shellRuntimeNoticeView('当前配置无法建立受支持的模型连接。', 'PROVIDER_CONNECTION_UNSUPPORTED');
    assert.equal(shell_view.retryable, false);
    assert.equal(shell_view.recovery?.key, 'dismiss');
    assert.equal(shell_view.recovery?.label === NOTICE_RETRY, false);
  });

  it('IMPLEMENTATION INVARIANT (NOTICE-02 §9): 「关闭」 really closes - the dismissal route removes the notice', async () => {
    const wired = benchOf([await node(MAIN, { history: true, fail_step_6: true })]);
    await wired.session.attachWorkspace(MAIN);
    await startAndSave(wired.session);
    const before = wired.session.getState().notices;
    assert.ok(before.length > 0, 'precondition: there is a notice on screen');

    const outcome = await wired.session.recoverNotice({ key: 'dismiss', attempt_id: null });

    assert.equal(outcome, 'ran');
    assert.deepEqual(wired.session.getState().notices, [], 'the label said 关闭 and it really closed');
    assert.equal(wired.rerun_targets.length, 0, 'and it ran no command on the way');
    assert.equal(wired.saves.length, 1, 'nor re-issued a save');
  });
});
