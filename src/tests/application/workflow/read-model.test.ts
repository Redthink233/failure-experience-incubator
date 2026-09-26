/**
 * S01 ｜ `M15` - the read model, the three-layer separation and the workspace error boundary.
 *
 * Contract: contract §10.1 layer 1 (`GATE`) / layer 2 (`RUNTIME`), §9.2 (the two empty states),
 * `D-046` V-1 (they never share wording), `D-051` (a batch is not a version), `D-022` (no background
 * behaviour), HANDOFF §6 (the workspace boundary).
 *
 * 🔴 Every case here is an `IMPLEMENTATION INVARIANT`; the suite creates NO `AC`.
 * 🔴 The fixtures are the real modules over a real workspace; the only non-production object is the
 *    fault-injecting storage, which exists so a permission failure can be produced deterministically.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ObjectId } from '../../../domain/ids/object-id.js';
import { WorkspaceStorageError } from '../../../workspace/storage.js';
import type { WorkspaceEntry, WorkspaceStorage } from '../../../workspace/storage.js';
import { InMemoryWorkspaceStorage } from '../../../workspace/memory-storage.js';import {
  BROWSER_WORKSPACE_ACCESS_ERROR_CODES,
  WORKFLOW_ERROR_MESSAGES,
  isBrowserWorkspaceAccessError,
  noticeForThrownError,
  workflowErrorLayer,
  workflowNotice,
} from '../../../application/workflow/errors.js';
import { RETRIEVAL_STALE_NOTICE, retrievalFreshnessOf } from '../../../application/workflow/retrieval-freshness.js';
import { provided } from '../../../domain/types/presence.js';
import { factItem } from '../../../domain/types/source-type.js';
import {
  WORKFLOW_FAILURE_LAYERS,
  WORKFLOW_LAYERS,
} from '../../../application/workflow/types.js';
import type { WorkflowErrorCode, WorkflowStepResult } from '../../../application/workflow/types.js';
import {
  classifyAction,
  classifyFormalSave,
  classifyHypothesisGeneration,
  classifyInsightGeneration,
  classifyRetrieval,
  INSIGHT_REFUSAL_CODES,
  HYPOTHESIS_REFUSAL_CODES,
} from '../../../application/workflow/outcomes.js';
import {
  ID_SOURCE,
  ID_UNRELATED,
  at,
  expectGeneratedInsights,
  makeWorkflowHarness,
  primeRetrieval,
  readSnapshot,
  seedDraftOnly,
  seedHistoricalCorpus,
  seedSource,
  timeoutError,
  valueOf,
} from './harness.js';

/* ------------------------------------------------------------------ *
 * 1. The three layers are three different things
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜GATE / RUNTIME / ACCEPTANCE stay apart', () => {
  it('IMPLEMENTATION INVARIANT: the THREE layer names exist, and a command outcome may only carry GATE or RUNTIME', () => {
    assert.deepEqual([...WORKFLOW_LAYERS], ['GATE', 'RUNTIME', 'ACCEPTANCE']);
    assert.deepEqual([...WORKFLOW_FAILURE_LAYERS], ['GATE', 'RUNTIME']);
    assert.equal((WORKFLOW_FAILURE_LAYERS as readonly string[]).includes('ACCEPTANCE'), false);
  });

  it('IMPLEMENTATION INVARIANT: every error code maps to exactly one layer; a GATE is never retryable and never offers a recovery', () => {
    const gate_codes: readonly WorkflowErrorCode[] = [
      'ATTEMPT_NOT_FOUND',
      'INSIGHT_NOT_FOUND',
      'HYPOTHESIS_NOT_FOUND',
      'ATTEMPT_NOT_FORMAL',
      'GATE_NOT_SATISFIED',
      'WORKFLOW_COMMAND_INVALID',
    ];
    const runtime_codes: readonly WorkflowErrorCode[] = [
      'WORKSPACE_PERMISSION_REQUIRED',
      'WORKSPACE_PERMISSION_DENIED',
      'WORKSPACE_UNAVAILABLE',
      'WORKSPACE_CONTENT_UNREADABLE',
      'WORKSPACE_FAILURE_UNCLASSIFIED',
      'PROVIDER_FAILURE',
      'RETRIEVAL_RUNTIME_INCOMPLETE',
      'PERSISTENCE_RECOVERY_BLOCKED',
      'INTERNAL_FAILURE',
    ];

    for (const code of gate_codes) {
      assert.equal(workflowErrorLayer(code), 'GATE', `${code} is a statement about the RECORD`);
      const notice = workflowNotice(code, { kind: 'select_workspace' });
      assert.equal(notice.code, code);
      assert.equal(notice.message, WORKFLOW_ERROR_MESSAGES[code]);
      assert.ok(notice.message.trim().length > 0);
      assert.equal(notice.retryable, false, 'repeating a product-rule refusal changes nothing');
      assert.equal(notice.recovery, null, 'a gate must not offer a machine-level retry');
    }

    for (const code of runtime_codes) {
      assert.equal(workflowErrorLayer(code), 'RUNTIME', `${code} is a statement about the ENVIRONMENT`);
      const notice = workflowNotice(code, { kind: 'select_workspace' });
      assert.equal(notice.code, code);
      assert.equal(notice.message, WORKFLOW_ERROR_MESSAGES[code]);
      assert.ok(notice.message.trim().length > 0);
      assert.equal(notice.retryable, true, `${code} is environment-side`);
      assert.deepEqual(notice.recovery, { kind: 'select_workspace' });
    }

    /* 🔴 The ONE runtime code a retry cannot help with: still RUNTIME, but a retry would be a lie. */
    const unsupported = workflowNotice('WORKSPACE_OPERATION_UNSUPPORTED', { kind: 'none' });
    assert.equal(unsupported.layer, 'RUNTIME');
    assert.equal(unsupported.retryable, false);
  });

  it('IMPLEMENTATION INVARIANT: the classification of a module outcome follows ONE discriminator, and it is total', () => {
    const attempt_id = at(ID_SOURCE);

    /* OK: a completed retrieval, whatever its status. */
    for (const status of ['RELATED_HISTORY', 'NO_RELATED_HISTORY', 'HISTORY_EMPTY'] as const) {
      assert.equal(
        classifyRetrieval(
          {
            kind: 'completed',
            status,
            derivation: {} as never,
            snapshot: {} as never,
          },
          attempt_id,
        ).layer,
        'OK',
        `${status} is a SUCCESS, not a failure`,
      );
    }
    /* GATE: the record is not Formal / does not exist. */
    assert.equal(
      classifyRetrieval(
        { kind: 'source_not_formal', source_attempt_id: ID_SOURCE, state: 'Draft', detail: '' },
        attempt_id,
      ).layer,
      'GATE',
    );
    assert.equal(
      classifyRetrieval({ kind: 'source_not_found', source_attempt_id: ID_SOURCE }, attempt_id).layer,
      'GATE',
    );
    /* RUNTIME: the retrieval could not finish. */
    const runtime = classifyRetrieval(
      {
        kind: 'runtime_incomplete',
        failure: {
          kind: 'runtime_incomplete',
          ai_error: timeoutError(),
          local_code: null,
          detail: '',
          retryable: true,
          source_preserved: true,
        },
        previous_derivation_preserved: false,
      },
      attempt_id,
    );
    assert.equal(runtime.layer, 'RUNTIME');
    assert.equal(runtime.notice?.code, 'RETRIEVAL_RUNTIME_INCOMPLETE');

    /* ⑧ / ⑨: a product-state refusal is GATE, an environment refusal is RUNTIME. */
    for (const code of ['REGENERATION_REQUIRED', 'OPERATION_ID_CONFLICT', 'SOURCE_ATTEMPT_NOT_FOUND'] as const) {
      assert.equal(
        classifyInsightGeneration({ kind: 'refused', code }, attempt_id).layer,
        'GATE',
        `${code} is a statement about the RECORD`,
      );
    }
    for (const code of [
      'EVIDENCE_SELECTION_REFUSED',
      'AI_PROPOSAL_REJECTED',
      'PERSISTENCE_RECOVERY_BLOCKED',
    ] as const) {
      assert.equal(
        classifyInsightGeneration({ kind: 'refused', code }, attempt_id).layer,
        'RUNTIME',
        `${code} is a statement about the ENVIRONMENT`,
      );
    }
    assert.equal(
      classifyHypothesisGeneration({ kind: 'refused', code: 'GROUNDING_WITHOUT_TRACEABLE_REFERENCE' }, attempt_id).layer,
      'GATE',
      '「grounded Hypothesis 不成立」 is the task §15 GATE example',
    );

    /* A lifecycle refusal is a GATE; its runtime failure is a RUNTIME. */
    assert.equal(classifyAction({ kind: 'applied' }).layer, 'OK');
    assert.equal(classifyAction({ kind: 'rejected' }).layer, 'GATE');
    assert.equal(classifyAction({ kind: 'runtime_failure' }).layer, 'RUNTIME');

    /* A formalization that retains the Draft is a GATE, never a system error. */
    assert.equal(
      classifyFormalSave({
        formalization: { decision: { outcome: 'draft_retained' } },
        attempt: null,
      }).layer,
      'GATE',
    );
    assert.equal(
      classifyFormalSave({ formalization: { decision: { outcome: 'ready' } }, attempt: {} }).layer,
      'OK',
    );

    /* The two refusal tables are EXHAUSTIVE over their vocabularies. */
    assert.deepEqual(Object.keys(INSIGHT_REFUSAL_CODES).sort(), [
      'AI_PROPOSAL_REJECTED',
      'EVIDENCE_SELECTION_REFUSED',
      'OPERATION_ID_CONFLICT',
      'PERSISTENCE_RECOVERY_BLOCKED',
      'REGENERATION_REQUIRED',
      'SOURCE_ATTEMPT_NOT_FOUND',
    ]);
    assert.deepEqual(Object.keys(HYPOTHESIS_REFUSAL_CODES).sort(), [
      'AI_PROPOSAL_REJECTED',
      'EVIDENCE_SELECTION_REFUSED',
      'GROUNDING_WITHOUT_TRACEABLE_REFERENCE',
      'OPERATION_ID_CONFLICT',
      'PERSISTENCE_RECOVERY_BLOCKED',
      'REGENERATION_REQUIRED',
      'SOURCE_ATTEMPT_NOT_FOUND',
    ]);
  });
});

/* ------------------------------------------------------------------ *
 * 2. The workspace error boundary
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Local fixtures
 * ------------------------------------------------------------------ */

/** A thrown value shaped exactly like `M2`'s `BrowserWorkspaceAccessError` (which cannot be imported). */
class FakeBrowserAccessError extends Error {
  readonly code: string;
  readonly original_error: unknown;

  constructor(code: string, message = 'The browser refused access to "/Users/someone/private".') {
    super(message);
    this.name = 'BrowserWorkspaceAccessError';
    this.code = code;
    this.original_error = { secretish: true };
  }
}

describe('M15 ｜ IMPLEMENTATION INVARIANT｜the workspace error boundary', () => {
  it('IMPLEMENTATION INVARIANT: every BrowserWorkspaceAccessErrorCode is recognised and mapped to a safe notice', () => {
    for (const code of BROWSER_WORKSPACE_ACCESS_ERROR_CODES) {
      const error = new FakeBrowserAccessError(code);
      assert.equal(isBrowserWorkspaceAccessError(error), true);
      const notice = noticeForThrownError(error);
      assert.ok(notice.message.trim().length > 0);
      /* 🔴 The thrown message must NOT be echoed: it may name a path. */
      assert.equal(notice.message.includes('/Users/someone/private'), false);
      assert.equal(notice.message.includes('secretish'), false);
      /* 🔴 These are statements about the WORKSPACE, so they are RUNTIME - never a product gate. */
      assert.equal(notice.layer, 'RUNTIME');
      assert.ok(notice.recovery !== null);
      /* A browser that cannot move a file will never be able to, so that one is not retryable. */
      assert.equal(notice.retryable, code !== 'MOVE_UNSUPPORTED_BY_BROWSER');
    }
    /* A coincidental `code` without the class name is not misread as a browser failure. */
    const impostor = Object.assign(new Error('boom'), { code: 'PERMISSION_DENIED' });
    assert.equal(isBrowserWorkspaceAccessError(impostor), false);
    const unknown_code = new FakeBrowserAccessError('SOME_FUTURE_CODE');
    assert.equal(isBrowserWorkspaceAccessError(unknown_code), false);
  });

  it('IMPLEMENTATION INVARIANT: WorkspaceStorageError is classified, and an unknown thrown value still becomes a SAFE notice', () => {
    const missing = noticeForThrownError(new WorkspaceStorageError('NOT_FOUND', 'insights/x.json'));
    assert.equal(missing.code, 'WORKSPACE_CONTENT_UNREADABLE');
    assert.equal(missing.layer, 'RUNTIME');

    const other = noticeForThrownError(new WorkspaceStorageError('ALREADY_EXISTS', 'insights/x.json'));
    assert.equal(other.code, 'WORKSPACE_FAILURE_UNCLASSIFIED');

    /* 🔴 A DOM exception, a string, `null` - none may escape as an exception. */
    for (const value of [new Error('raw DOMException-ish'), 'a string', null, 42, { code: 'X' }]) {
      const notice = noticeForThrownError(value);
      assert.equal(notice.code, 'INTERNAL_FAILURE');
      assert.equal(notice.layer, 'RUNTIME');
      assert.equal(notice.message, WORKFLOW_ERROR_MESSAGES.INTERNAL_FAILURE);
    }
  });

  it('AC-127 / AC-128 / IMPLEMENTATION INVARIANT: a read that hits a revoked permission returns `unavailable` - never `not_found`, never a throw', async () => {
    const storage = new PermissionRevokingStorage();
    const harness = makeWorkflowHarness({ storage });
    await seedHistoricalCorpus(harness);
    await seedSource(harness);

    storage.revoke();

    const result = await harness.workflow.readWorkflow(at(ID_SOURCE));
    assert.equal(result.kind, 'unavailable');
    if (result.kind === 'unavailable') {
      assert.equal(result.notice.layer, 'RUNTIME');
      assert.equal(result.notice.code, 'WORKSPACE_PERMISSION_DENIED');
      assert.equal(result.notice.retryable, true);
      assert.equal(result.notice.message.includes('/'), false, 'no path may be echoed');
      assert.equal(/Permission|refused|/i.test(result.notice.message), true);
    }

    /* 🔴 The same call for a record that does NOT exist is STILL `unavailable`: while the directory is
       unreadable, "the record is gone" is not knowable and must not be asserted. */
    const missing = await harness.workflow.readWorkflow('ATT_0000000000000000000000000Z' as ObjectId<'ATT'>);
    assert.equal(missing.kind, 'unavailable');
  });

  it('IMPLEMENTATION INVARIANT: with a healthy workspace the same record is a snapshot, and a missing one is `not_found`', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);
    await seedSource(harness);

    const found = await harness.workflow.readWorkflow(at(ID_SOURCE));
    assert.equal(found.kind, 'snapshot');

    const missing = await harness.workflow.readWorkflow('ATT_0000000000000000000000000Z' as ObjectId<'ATT'>);
    assert.equal(missing.kind, 'not_found');
  });

  it('AC-127 / AC-128 / IMPLEMENTATION INVARIANT: a command that hits the revoked permission returns a safe RUNTIME notice, and the raw value goes ONLY to the sink', async () => {
    const diagnostics: unknown[] = [];
    const storage = new PermissionRevokingStorage();
    const harness = makeWorkflowHarness({
      storage,
      on_internal_error: (diagnostic) => diagnostics.push(diagnostic.original_error),
    });
    await seedHistoricalCorpus(harness);
    await seedSource(harness);
    storage.revoke();

    const result: WorkflowStepResult<unknown> = await harness.workflow.generateInsights({
      operation_id: 'rm-revoked',
      attempt_id: at(ID_SOURCE),
    });
    assert.equal(result.kind, 'runtime');
    assert.equal(result.layer, 'RUNTIME');
    assert.equal(result.value, null, 'the workflow never reached a module');
    assert.equal(result.notice?.code, 'WORKSPACE_PERMISSION_DENIED');
    assert.equal(result.notice?.message.includes('/'), false);
    assert.equal(result.notice?.message.includes('private'), false);

    /* 🔴 The diagnostics sink DID receive the raw value - and that is the only place it went. */
    assert.equal(diagnostics.length, 1);
    assert.ok(diagnostics[0] instanceof FakeBrowserAccessError);
    assert.equal(JSON.stringify(result).includes('private'), false);
    assert.equal(JSON.stringify(result).includes('secretish'), false);
  });
});

/* ------------------------------------------------------------------ *
 * 3. The three 0-like states, never merged
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜the three 0-like states stay apart', () => {
  it('AC-97 / AC-98 / IMPLEMENTATION INVARIANT: HISTORY_EMPTY, NO_RELATED_HISTORY and RETRIEVAL_RUNTIME_INCOMPLETE are three different states with three different sentences', async () => {
    /* (a) HISTORY_EMPTY: there is no usable history at all (a Draft is not history). */
    const empty = makeWorkflowHarness();
    await seedDraftOnly(empty);
    await seedSource(empty);
    await primeRetrieval(empty, ID_SOURCE);
    const empty_snapshot = await readSnapshot(empty.workflow, at(ID_SOURCE));
    assert.equal(empty_snapshot.retrieval.state, 'ready');
    assert.equal(empty_snapshot.retrieval.zero_like_state, 'HISTORY_EMPTY');
    assert.equal(empty_snapshot.retrieval.n_retrieval, 0);
    assert.deepEqual(empty_snapshot.notices, [], 'an empty history is NOT an error');

    const empty_statement = valueOf(
      await empty.workflow.generateInsights({ operation_id: 'rm-empty', attempt_id: at(ID_SOURCE) }),
    );
    assert.equal(empty_statement.kind, 'zero_output');

    /* (b) NO_RELATED_HISTORY: usable history exists, nothing is related. */
    const none = makeWorkflowHarness();
    await none.seed({ attempt_id: ID_UNRELATED, goal: 'X1', approach: 'S5', condition: 'C5', result: 'R5' });
    await seedSource(none);
    await primeRetrieval(none, ID_SOURCE);
    const none_snapshot = await readSnapshot(none.workflow, at(ID_SOURCE));
    assert.equal(none_snapshot.retrieval.state, 'ready');
    assert.equal(none_snapshot.retrieval.zero_like_state, 'NO_RELATED_HISTORY');
    assert.equal(none_snapshot.retrieval.n_retrieval, 0);
    assert.deepEqual(none_snapshot.notices, []);

    const none_statement = valueOf(
      await none.workflow.generateInsights({ operation_id: 'rm-none', attempt_id: at(ID_SOURCE) }),
    );
    assert.equal(none_statement.kind, 'zero_output');

    /* 🔴 The two empty states are the SAME count (0) and DIFFERENT sentences (`D-046` V-1 / AC-97). */
    assert.notEqual(
      empty_statement.kind === 'zero_output' ? empty_statement.absence_statement : '',
      none_statement.kind === 'zero_output' ? none_statement.absence_statement : '',
    );

    /* (c) RETRIEVAL_RUNTIME_INCOMPLETE: a THIRD state, with `null` - never `0`. */
    const broken = makeWorkflowHarness({ fail_step_6_with: timeoutError() });
    await seedHistoricalCorpus(broken);
    await seedSource(broken);
    const failed = await broken.workflow.rerunRetrieval({
      operation_id: 'rm-broken',
      attempt_id: at(ID_SOURCE),
    });
    assert.equal(failed.value?.kind, 'runtime_incomplete');

    const broken_snapshot = await readSnapshot(broken.workflow, at(ID_SOURCE));
    assert.equal(broken_snapshot.retrieval.state, 'runtime_incomplete');
    assert.equal(broken_snapshot.retrieval.n_retrieval, null, 'a runtime failure never writes 0');
    assert.equal(broken_snapshot.retrieval.zero_like_state, null);
    assert.equal(broken_snapshot.retrieval.derivation, null);
    assert.equal(broken_snapshot.notices.length, 1);
    assert.equal(broken_snapshot.notices[0]?.code, 'RETRIEVAL_RUNTIME_INCOMPLETE');

    /* 🔴 The THREE states are pairwise distinguishable. */
    const signatures = [
      `${empty_snapshot.retrieval.state}/${String(empty_snapshot.retrieval.zero_like_state)}`,
      `${none_snapshot.retrieval.state}/${String(none_snapshot.retrieval.zero_like_state)}`,
      `${broken_snapshot.retrieval.state}/${String(broken_snapshot.retrieval.zero_like_state)}`,
    ];
    assert.equal(new Set(signatures).size, 3);
  });

  it('IMPLEMENTATION INVARIANT: `not_available` is a fourth, distinct statement - not an empty history', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);
    await seedSource(harness);

    const snapshot = await readSnapshot(harness.workflow, at(ID_SOURCE));
    assert.equal(snapshot.retrieval.state, 'not_available');
    assert.equal(snapshot.retrieval.n_retrieval, null);
    assert.equal(snapshot.retrieval.zero_like_state, null);
    assert.equal(snapshot.retrieval.derivation, null);
    /* The recovery is offered, and it is explicit - nothing runs on its own. */
    assert.equal(snapshot.available_actions.includes('rerun_retrieval'), true);
  });
});

/* ------------------------------------------------------------------ *
 * 4. Freshness (stale) is derived, never stored
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜retrieval freshness', () => {
  it('IMPLEMENTATION INVARIANT: stale is derived from the two existing sources of truth and says 「可能不再适用」', () => {
    const derivation = { created_at: '2026-09-25T00:10:00.000Z' } as never;

    const fresh = retrievalFreshnessOf('2026-09-25T00:10:00.000Z', derivation);
    assert.equal(fresh.stale, false, 'an untouched record is not stale');
    assert.equal(fresh.notice, null);
    assert.equal(fresh.comparison_generated_at, '2026-09-25T00:10:00.000Z');

    const edited = retrievalFreshnessOf('2026-09-25T00:20:00.000Z', derivation);
    assert.equal(edited.stale, true);
    assert.equal(edited.notice, RETRIEVAL_STALE_NOTICE);
    assert.ok(RETRIEVAL_STALE_NOTICE.includes('可能不再适用'));
    assert.ok(RETRIEVAL_STALE_NOTICE.includes('该记录'));
    /* 🔴 It never says the comparison is WRONG and never orders a rerun. */
    assert.equal(/错误|失效|必须/.test(RETRIEVAL_STALE_NOTICE), false);

    /* No comparison at all means NOT stale: there is nothing to be out of date. */
    const absent = retrievalFreshnessOf('2026-09-25T00:20:00.000Z', null);
    assert.equal(absent.stale, false);
    assert.equal(absent.notice, null);
    assert.equal(absent.comparison_generated_at, null);
  });

  it('IMPLEMENTATION INVARIANT: a Formal edit raises the warning WITHOUT rerunning anything (E2E-6 at the model level)', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);
    await seedSource(harness);
    await primeRetrieval(harness, ID_SOURCE);

    const before = await readSnapshot(harness.workflow, at(ID_SOURCE));
    assert.equal(before.retrieval.freshness.stale, false);

    const judge_calls = harness.provider.judge_calls.length;
    await harness.attempts.updateAttempt(
      at(ID_SOURCE),
      { user_note: provided(factItem(`${ID_SOURCE}:note`, '事后补充：温度记录可能不准。')) },
    );

    const after = await readSnapshot(harness.workflow, at(ID_SOURCE));
    assert.equal(after.retrieval.freshness.stale, true);
    assert.equal(after.retrieval.freshness.notice, RETRIEVAL_STALE_NOTICE);
    assert.equal(harness.provider.judge_calls.length, judge_calls);
    assert.deepEqual(after.notices, [], 'a warning is not a failure');
  });
});

/* ------------------------------------------------------------------ *
 * 5. The read model invents no second business state
 * ------------------------------------------------------------------ */

describe('M15 ｜ IMPLEMENTATION INVARIANT｜the read model is DERIVED', () => {
  it('IMPLEMENTATION INVARIANT: a freshly reopened workflow reports the same batch order, and `is_current` is only "the newest"', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);
    await seedSource(harness);
    await primeRetrieval(harness, ID_SOURCE);

    const first = expectGeneratedInsights(
      valueOf(await harness.workflow.generateInsights({ operation_id: 'rm-b1', attempt_id: at(ID_SOURCE) })),
    );
    const second = expectGeneratedInsights(
      valueOf(await harness.workflow.regenerateInsights({ operation_id: 'rm-b2', attempt_id: at(ID_SOURCE) })),
    );

    const snapshot = await readSnapshot(harness.reopen(), at(ID_SOURCE));
    assert.equal(snapshot.insights.batches.length, 2);
    assert.equal(snapshot.insights.current_batch_id, second.batch.batch_id);
    const older = snapshot.insights.batches.find((batch) => batch.batch_id === first.batch.batch_id);
    assert.equal(older?.is_current, false);
    /* 🔴 Chronological, and carrying NO strength / correctness claim. */
    const created = snapshot.insights.batches.map((batch) => batch.created_at);
    assert.deepEqual([...created].sort(), created);
    for (const batch of snapshot.insights.batches) {
      assert.equal('version' in batch, false);
      assert.equal('score' in batch, false);
      assert.equal('rank' in batch, false);
    }
  });

  it('IMPLEMENTATION INVARIANT: the model carries no provider, prompt, token, latency or raw exception field', async () => {
    const harness = makeWorkflowHarness();
    await seedHistoricalCorpus(harness);
    await seedSource(harness);
    await primeRetrieval(harness, ID_SOURCE);

    const snapshot = await readSnapshot(harness.workflow, at(ID_SOURCE));
    const serialized = JSON.stringify(snapshot);
    for (const forbidden of ['api_key', 'authorization', 'Bearer ', 'prompt', 'latency', 'token_usage', 'stack']) {
      assert.equal(
        serialized.toLowerCase().includes(forbidden.toLowerCase()),
        false,
        `the snapshot must not carry "${forbidden}"`,
      );
    }
  });
});

/* ------------------------------------------------------------------ *
 * Local fixtures
 * ------------------------------------------------------------------ */

/** A storage whose reads start failing on demand. Never fails while `revoke()` has not been called. */
class PermissionRevokingStorage implements WorkspaceStorage {
  readonly kind = 'permission-revoking';

  private readonly inner = new InMemoryWorkspaceStorage();
  private revoked = false;

  revoke(): void {
    this.revoked = true;
  }

  private assertUsable(): void {
    if (this.revoked) {
      throw new FakeBrowserAccessError('PERMISSION_DENIED');
    }
  }

  async exists(path: string): Promise<boolean> {
    this.assertUsable();
    return this.inner.exists(path);
  }
  async readFile(path: string): Promise<string> {
    this.assertUsable();
    return this.inner.readFile(path);
  }
  async writeFile(path: string, contents: string): Promise<void> {
    this.assertUsable();
    return this.inner.writeFile(path, contents);
  }
  async list(path: string): Promise<readonly WorkspaceEntry[]> {
    this.assertUsable();
    return this.inner.list(path);
  }
  async move(fromPath: string, toPath: string): Promise<void> {
    this.assertUsable();
    return this.inner.move(fromPath, toPath);
  }
}
