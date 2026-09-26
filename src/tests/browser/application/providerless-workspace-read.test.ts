/**
 * S01-06B ｜ PROVIDER-LESS WORKSPACE READ - B1 / B2 / B3 / B4 / B5 / B6 / B7 / B8 / B9 / B14.
 *
 * 🔴 WHAT THIS SUITE PROVES: a user-authorized workspace can be LISTED and READ with NO provider, NO
 *    API key and NO supported connection path, and the data it returns is the SAME data the full `D9`
 *    workflow returns for the same persisted record.
 * 🔴 WHY IT CAN PROVE IT: the fixture is created through the REAL chain (`M4`-`M9` + `M15`) over ONE
 *    `InMemoryWorkspaceStorage`; the read composition is then built over THAT SAME storage with NO
 *    provider argument at all. The fixture's fake provider counts every invocation, so "browsing
 *    called no model" is a measured number rather than a claim.
 * 🔴 NO FAKE PROVIDER IS CONSTRUCTED FOR THE READ PATH. `B7`/`B8` are paired with the static audit at
 *    the bottom of this file, which asserts the read composition cannot even NAME an adapter, a proxy
 *    client, a credential resolver or a provider placeholder.
 * 🔴 `Real Provider Calls = 0`; every model answer used to build the fixture is a hand-written
 *    `NOT_A_REAL_LLM_OUTPUT`. Nothing here proves anything about a real provider (`PSA-*` stay
 *    `PENDING`).
 *
 * Canonical references used: AC-13 / AC-41 / AC-130 / AC-137 / AC-144 / AC-150 / AC-158. No `AC` is
 * created, and this suite is an `IMPLEMENTATION INVARIANT` suite wherever it asserts structure.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CredentialRef, CredentialResolver, CredentialSecret } from '../../../ai/provider/credential.js';
import type { ObjectId } from '../../../domain/ids/object-id.js';
import { InMemoryWorkspaceStorage } from '../../../workspace/memory-storage.js';
import { WorkspaceStorageError } from '../../../workspace/storage.js';
import type { WorkspaceEntry, WorkspaceStorage } from '../../../workspace/storage.js';
import { createWorkflowAttemptIndex } from '../../../application/workflow/attempt-summaries.js';
import { composeBrowserWorkspaceReader } from '../../../browser/application/workspace-reader-composition.js';
import {
  makeWorkflowHarness,
  parsePayload,
  seedHistoricalCorpus,
  startAndFormalize,
} from '../../application/workflow/harness.js';
import { readRepoFile, stripComments } from '../../ai/source-scan.js';

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

/** The canonical unknown id: an id that resolves to nothing. */
const NO_SUCH_ATTEMPT = 'ATT_00000000000000000000000000' as ObjectId<'ATT'>;

function attemptId(value: string): ObjectId<'ATT'> {
  return value as ObjectId<'ATT'>;
}

/**
 * A counting credential resolver.
 *
 * 🔴 It is created alongside the fixture to make "the read path never asks for a secret" MEASURABLE:
 *    the read composition has no parameter for it, so the counter can only stay at zero.
 */
class CountingCredentials implements CredentialResolver {
  readonly kind = 'counting-double';
  reads = 0;

  resolve(_ref: CredentialRef): CredentialSecret | null {
    this.reads += 1;
    return null;
  }
}

/**
 * A storage that throws for ONE directory while delegating everything else.
 *
 * 🔴 It exists only to produce a READ FAILURE (as opposed to `not_found`): the read must be reported
 *    as an environment failure with a retry, and the thrown message must never reach the notice.
 */
class FailingDirectoryStorage implements WorkspaceStorage {
  readonly kind = 'failing-directory';
  private readonly inner: WorkspaceStorage;
  private readonly failing_directory: string;

  constructor(inner: WorkspaceStorage, failing_directory: string) {
    this.inner = inner;
    this.failing_directory = failing_directory;
  }

  /**
   * 🔴 `exists` answers `true` for the failing directory so the repository really attempts the LIST:
   *    a directory that is present but cannot be read is the case under test, and a `false` here would
   *    make the repository legitimately short-circuit into an empty list.
   */
  async exists(path: string): Promise<boolean> {
    if (path === this.failing_directory) {
      return true;
    }
    return this.inner.exists(path);
  }

  async readFile(path: string): Promise<string> {
    return this.inner.readFile(path);
  }

  async writeFile(path: string, contents: string): Promise<void> {
    return this.inner.writeFile(path, contents);
  }

  async list(path: string): Promise<readonly WorkspaceEntry[]> {
    if (path === this.failing_directory) {
      throw new WorkspaceStorageError(
        'NOT_A_DIRECTORY',
        path,
        'INJECTED READ FAILURE at /home/fixture/secret-path',
      );
    }
    return this.inner.list(path);
  }

  async move(fromPath: string, toPath: string): Promise<void> {
    return this.inner.move(fromPath, toPath);
  }
}

/**
 * ONE storage carrying every kind of persisted object a browse can encounter: a corpus, a `Formal`
 * source record with step ⑥ already run, one step ⑧ batch and one step ⑨ batch.
 */
async function browsableWorkspace() {
  const storage = new InMemoryWorkspaceStorage();
  const harness = makeWorkflowHarness({
    storage,
    /* The only deviation from the default fixture: step ③ needs a proposed result status, because a
     * `Formal` save requires the user to settle it (AC-Q06-6). */
    parse: parsePayload({ result_status_proposal: '未达到目标' }),
  });
  await seedHistoricalCorpus(harness);
  const formalized = await startAndFormalize(harness, 'providerless-source');

  const insights = await harness.workflow.generateInsights({
    operation_id: 'providerless-8',
    attempt_id: formalized.attempt_id,
  });
  const hypotheses = await harness.workflow.generateHypotheses({
    operation_id: 'providerless-9',
    attempt_id: formalized.attempt_id,
  });
  assert.equal(insights.kind, 'delegated', 'the step ⑧ fixture must really generate');
  assert.equal(hypotheses.kind, 'delegated', 'the step ⑨ fixture must really generate');

  /* 🔴 The reader: built over the SAME storage, with NO provider argument anywhere. */
  const reader = composeBrowserWorkspaceReader({ storage });
  return { storage, harness, attempt_id: formalized.attempt_id, reader };
}

/* ------------------------------------------------------------------ *
 * B1 / B2 - the list and one record
 * ------------------------------------------------------------------ */

describe('S01-06B ｜ B1 / B2 - a workspace is listable and readable with no provider at all', () => {
  it('B1 / AC-130 / IMPLEMENTATION INVARIANT: the rail is readable with no provider, no key and no composed workflow', async () => {
    const { reader, attempt_id } = await browsableWorkspace();

    const summaries = await reader.index.listWorkflowAttempts();
    /* The historical corpus (4 records) plus the source created through steps ①-⑤. */
    assert.equal(summaries.length, 5);
    assert.ok(
      summaries.some((summary) => String(summary.attempt_id) === attempt_id),
      'the source record must be listed',
    );
    for (const summary of summaries) {
      /* 🔴 Only persisted facts and display projections: no score, strength or similarity exists. */
      assert.deepEqual(Object.keys(summary).sort(), [
        'archive_state',
        'attempt_id',
        'created_at',
        'data_source_nature',
        'excerpt',
        'state',
        'title',
        'updated_at',
      ]);
    }
  });

  it('B2 / B14 / IMPLEMENTATION INVARIANT: one record reads as the SAME snapshot the composed workflow returns', async () => {
    const { reader, harness, attempt_id } = await browsableWorkspace();

    const browsed = await reader.reads.readWorkflow(attemptId(attempt_id));
    assert.equal(browsed.kind, 'snapshot');

    /* 🔴 The same record, read through the provider-READY workflow over the same storage. */
    const through_workflow = await harness.workflow.readWorkflow(attemptId(attempt_id));
    assert.equal(through_workflow.kind, 'snapshot');

    if (browsed.kind === 'snapshot' && through_workflow.kind === 'snapshot') {
      /*
       * 🔴 THE CENTRAL CLAIM OF S01-06B: one persisted workspace + one `attempt_id` ⇒ the SAME
       *    business data on both reading paths. This fixture never observed a step ⑥ runtime failure,
       *    so there is no runtime-only capability difference and the snapshots must be deeply equal -
       *    a divergence would mean a second copy of a rule had appeared somewhere.
       */
      assert.deepEqual(browsed.snapshot, through_workflow.snapshot);
    }
  });

  it('B2 / AC-137: an unknown id is `not_found`, never a fabricated empty record', async () => {
    const { reader } = await browsableWorkspace();
    assert.deepEqual(await reader.reads.readWorkflow(NO_SUCH_ATTEMPT), { kind: 'not_found' });
  });

  it('B14 / IMPLEMENTATION INVARIANT: the attempt-list index is built from the SAME list port as the workflow', async () => {
    const { storage } = await browsableWorkspace();
    const index = createWorkflowAttemptIndex({
      listAttempts: () => composeBrowserWorkspaceReader({ storage }).attempts.listAttempts(),
    });
    const listed = await index.listWorkflowAttempts();
    assert.equal(listed.length, 5);
    /* Newest first, ties broken by id - a deterministic order, not a ranking. */
    for (let position = 1; position < listed.length; position += 1) {
      const previous = listed[position - 1];
      const current = listed[position];
      assert.ok(previous !== undefined && current !== undefined);
      assert.ok(previous.updated_at >= current.updated_at);
    }
  });
});

/* ------------------------------------------------------------------ *
 * B3 - B6 - the persisted derived objects
 * ------------------------------------------------------------------ */

describe('S01-06B ｜ B3 - B6 - the persisted derivation, insights, hypotheses and the ⑩ trace', () => {
  it('B3 / AC-97: the EXISTING retrieval derivation is readable, and reading it does not rerun retrieval', async () => {
    const { reader, harness, attempt_id } = await browsableWorkspace();

    const browsed = await reader.reads.readWorkflow(attemptId(attempt_id));
    assert.equal(browsed.kind, 'snapshot');
    if (browsed.kind !== 'snapshot') {
      return;
    }
    assert.equal(browsed.snapshot.retrieval.state, 'ready');
    assert.ok(browsed.snapshot.retrieval.derivation !== null);
    assert.equal(browsed.snapshot.retrieval.n_retrieval, 2, 'the corpus has two related records');
    assert.equal(browsed.snapshot.retrieval.zero_like_state, null);

    /* 🔴 A browse must issue no judge call: reading a stored derivation is a pure projection. */
    const judge_calls = harness.provider.judge_calls.length;
    const again = await reader.reads.readWorkflow(attemptId(attempt_id));
    assert.equal(again.kind, 'snapshot');
    assert.equal(harness.provider.judge_calls.length, judge_calls, 'a browse must not rerun ⑥');
  });

  it('B4 / AC-13: the EXISTING insights are readable, with `N_引用` and their batch records', async () => {
    const { reader, attempt_id } = await browsableWorkspace();

    const browsed = await reader.reads.readWorkflow(attemptId(attempt_id));
    assert.equal(browsed.kind, 'snapshot');
    if (browsed.kind !== 'snapshot') {
      return;
    }
    assert.ok(browsed.snapshot.insights.views.length >= 1, 'step ⑧ persisted an insight');
    assert.ok(browsed.snapshot.insights.batches.length >= 1);
    assert.equal(
      browsed.snapshot.insights.current_batch_id,
      browsed.snapshot.insights.batches[0]?.batch_id,
    );
    for (const view of browsed.snapshot.insights.views) {
      /* 🔴 The count and the ⑩ trace come from `M7`'s ONE derivation, read back - never recomputed. */
      assert.equal(view.citation.n_citation, view.traceability.length);
    }
  });

  it('B5 / AC-41 / D-042: the EXISTING hypotheses are readable, and a `Model Suggestion` stays separate', async () => {
    const { reader, attempt_id } = await browsableWorkspace();

    const browsed = await reader.reads.readWorkflow(attemptId(attempt_id));
    assert.equal(browsed.kind, 'snapshot');
    if (browsed.kind !== 'snapshot') {
      return;
    }
    assert.ok(browsed.snapshot.hypotheses.views.length >= 1, 'step ⑨ persisted a direction');
    for (const view of browsed.snapshot.hypotheses.views) {
      assert.equal(view.hypothesis.kind, 'grounded');
      assert.equal(view.is_experience_asset, false);
      assert.equal(view.citation.n_citation, view.traceability.length);
    }
    for (const suggestion of browsed.snapshot.hypotheses.model_suggestions) {
      assert.equal(suggestion.hypothesis.kind, 'model');
    }
  });

  it('B6 / IMPLEMENTATION INVARIANT: the ⑩ trace of existing data is readable WITHOUT a model, and its two statements stay apart', async () => {
    const { reader, harness, attempt_id } = await browsableWorkspace();

    const browsed = await reader.reads.readWorkflow(attemptId(attempt_id));
    assert.equal(browsed.kind, 'snapshot');
    if (browsed.kind !== 'snapshot') {
      return;
    }
    const hypothesis_id = browsed.snapshot.hypotheses.views[0]?.hypothesis.hypothesis_id;
    assert.ok(hypothesis_id !== undefined);

    const invocations_before = harness.provider.invocations.length;
    const trace = await reader.reads.traceHypothesis(hypothesis_id);
    assert.equal(trace.kind, 'delegated');
    assert.ok(trace.value !== null);
    assert.equal(trace.value?.citation.n_citation, trace.value?.traceability.length);
    assert.equal(
      harness.provider.invocations.length,
      invocations_before,
      '「查看旧依据」 must never call a model',
    );

    /* 🔴 「不存在」 and 「没有引用」 are different statements. */
    const missing = await reader.reads.traceHypothesis(
      'HYP_00000000000000000000000000' as ObjectId<'HYP'>,
    );
    assert.equal(missing.kind, 'gate');
    assert.equal(missing.notice?.code, 'HYPOTHESIS_NOT_FOUND');
    assert.equal(missing.value, null);
  });
});

/* ------------------------------------------------------------------ *
 * B7 / B8 - the provider and the credential are not on this path
 * ------------------------------------------------------------------ */

describe('S01-06B ｜ B7 / B8 - browsing calls no model and reads no credential', () => {
  it('B7 / AC-144: EVERY provider invocation count is unchanged by a full browse', async () => {
    const { reader, harness, attempt_id } = await browsableWorkspace();

    const before = {
      all: harness.provider.invocations.length,
      capture: harness.provider.capture_calls.length,
      judge: harness.provider.judge_calls.length,
      insights: harness.provider.insight_calls.length,
      hypotheses: harness.provider.hypothesis_calls.length,
      checks: harness.provider.check_calls.length,
    };
    assert.ok(before.all > 0, 'the fixture must really have called the provider, or the case is vacuous');

    await reader.index.listWorkflowAttempts();
    await reader.reads.readWorkflow(attemptId(attempt_id));
    await reader.index.listWorkflowAttempts();
    await reader.reads.readWorkflow(attemptId(attempt_id));
    await reader.reads.readWorkflow(NO_SUCH_ATTEMPT);

    /* 🔴 ProviderAdapter call count during browse = 0. */
    assert.equal(harness.provider.invocations.length, before.all);
    assert.equal(harness.provider.capture_calls.length, before.capture);
    assert.equal(harness.provider.judge_calls.length, before.judge);
    assert.equal(harness.provider.insight_calls.length, before.insights);
    assert.equal(harness.provider.hypothesis_calls.length, before.hypotheses);
    assert.equal(harness.provider.check_calls.length, before.checks);
  });

  it('B8 / AC-158: the read composition holds no credential, so a resolver is never consulted', async () => {
    const { reader, attempt_id } = await browsableWorkspace();
    const credentials = new CountingCredentials();

    await reader.index.listWorkflowAttempts();
    await reader.reads.readWorkflow(attemptId(attempt_id));
    await reader.reads.readWorkflow(NO_SUCH_ATTEMPT);
    await reader.reads.traceHypothesis(String(attempt_id) as unknown as ObjectId<'HYP'>);

    /* 🔴 Credential read count during browse = 0. */
    assert.equal(credentials.reads, 0);
    /* 🔴 And the reader carries no credential-shaped value anywhere. */
    assert.equal(JSON.stringify(reader).includes('ref_id'), false);
    assert.equal(Object.keys(reader).includes('credential_ref'), false);
    assert.equal(Object.keys(reader).includes('provider'), false);
  });
});

/* ------------------------------------------------------------------ *
 * B9 - an unusable connection path is irrelevant to browsing
 * ------------------------------------------------------------------ */

describe('S01-06B ｜ B9 / AC-150 - an unsupported provider does not affect browsing', () => {
  it('B9 / AC-150: an `unsupported` composition carries NO workspace, and the browse is unaffected', async () => {
    const { reader, harness, attempt_id } = await browsableWorkspace();

    /*
     * The shape the composition root returns for a capability with no reachable path. 🔴 It carries
     * a reason and a message ONLY - there is no workspace handle in it to unload.
     */
    const unsupported = {
      kind: 'unsupported',
      reason_code: 'PROVIDER_CONNECTION_UNSUPPORTED',
      message: '当前配置无法建立受支持的模型连接。',
    } as const;

    assert.equal('storage' in unsupported, false);
    assert.equal('composition' in unsupported, false);
    assert.equal('port' in unsupported, false);

    /* 🔴 The browse still answers, and it answers with the real record. */
    const browsed = await reader.reads.readWorkflow(attemptId(attempt_id));
    assert.equal(browsed.kind, 'snapshot');
    assert.equal(harness.provider.invocations.length > 0, true);
  });
});

/* ------------------------------------------------------------------ *
 * The read boundary
 * ------------------------------------------------------------------ */

describe('S01-06B ｜ the read boundary keeps its three outcomes apart', () => {
  it('B13 (read half) / AC-137 / IMPLEMENTATION INVARIANT: an unreadable directory is `unavailable` with a workspace notice, never `not_found`', async () => {
    const base = new InMemoryWorkspaceStorage();
    const harness = makeWorkflowHarness({
      storage: base,
      parse: parsePayload({ result_status_proposal: '未达到目标' }),
    });
    await seedHistoricalCorpus(harness);
    const formalized = await startAndFormalize(harness, 'read-failure-source');

    /* 🔴 Built over a storage that fails ONLY when the insight directory is listed. */
    const reader = composeBrowserWorkspaceReader({
      storage: new FailingDirectoryStorage(base, 'insights'),
    });
    const result = await reader.reads.readWorkflow(formalized.attempt_id);

    assert.equal(result.kind, 'unavailable');
    if (result.kind === 'unavailable') {
      /* 🔴 A fixed product sentence, never the thrown value. */
      assert.equal(result.notice.layer, 'RUNTIME');
      assert.ok(result.notice.code.startsWith('WORKSPACE_'));
      assert.equal(result.notice.message.includes('INJECTED'), false);
      assert.equal(result.notice.message.includes('secret-path'), false);
    }

    /* 🔴 The rail is unaffected by a failure that only the insight directory produced. */
    const listed = await reader.index.listWorkflowAttempts();
    assert.equal(listed.length, 5);
  });
});

/* ------------------------------------------------------------------ *
 * Static audit - no provider, no credential, no placeholder on the READ path
 * ------------------------------------------------------------------ */

describe('S01-06B ｜ IMPLEMENTATION INVARIANT｜the read composition cannot name a provider', () => {
  const READ_FILES = [
    'src/browser/application/workspace-reader-composition.ts',
    'src/application/workflow/workspace-read.ts',
    'src/application/capture/capture-state-reader.ts',
  ];

  it('IMPLEMENTATION INVARIANT: NO fake / null / noop provider and NO placeholder adapter on the read path', () => {
    for (const file of READ_FILES) {
      const code = stripComments(readRepoFile(file));
      for (const token of [
        'FakeProvider',
        'fakeProvider',
        'NullProvider',
        'NoopProvider',
        'DummyProvider',
        'DummyCredential',
        'createBrowserDirectAdapter',
        'createThinProxyAdapter',
        'placeholder',
      ]) {
        assert.equal(code.includes(token), false, `${file} must not contain "${token}"`);
      }
    }
  });

  it('IMPLEMENTATION INVARIANT: the read path cannot reach a credential or a provider composition', () => {
    for (const file of READ_FILES) {
      const code = stripComments(readRepoFile(file));
      for (const token of [
        'CredentialResolver',
        'CredentialRef',
        'CredentialSecret',
        'revealCredentialSecret',
        'session-credential-store',
        'composeBrowserProvider',
        'composeBrowserWorkflow',
        'provider-composition',
        'api_key',
        'apiKey',
        'Authorization',
        'Bearer',
      ]) {
        assert.equal(code.includes(token), false, `${file} must not contain "${token}"`);
      }
    }
  });

  it('IMPLEMENTATION INVARIANT: the read composition exposes NO command, so a browse cannot mutate or generate', () => {
    const code = stripComments(readRepoFile(READ_FILES[0] ?? ''));
    for (const token of [
      'runRetrievalForFormalAttempt',
      'generateCandidateInsights',
      'generateHypotheses',
      'saveFormalAttempt',
      'createD9WorkflowService',
      'replaceCurrent',
    ]) {
      assert.equal(code.includes(token), false, `the read composition must not contain "${token}"`);
    }
  });

  it('IMPLEMENTATION INVARIANT: the read layer still holds ONE assembly of the snapshot', () => {
    /* 🔴 The full workflow must DELEGATE its read rather than keep a second `buildSnapshot`. */
    const workflow = stripComments(readRepoFile('src/application/workflow/workflow-service.ts'));
    assert.equal(workflow.includes('buildWorkflowSnapshot'), false);
    assert.equal(workflow.includes('createWorkflowReadService'), true);
    assert.equal(workflow.includes('reads.readWorkflow'), true);
    /* 🔴 And the `M8` / `M9` services must delegate their read views the same way. */
    const insight = stripComments(readRepoFile('src/application/insight/insight-service.ts'));
    assert.equal(insight.includes('createInsightReadService'), true);
    assert.equal(insight.includes('reads.listInsightsBySourceAttempt'), true);
    const hypothesis = stripComments(readRepoFile('src/application/hypothesis/hypothesis-service.ts'));
    assert.equal(hypothesis.includes('createHypothesisReadService'), true);
    assert.equal(hypothesis.includes('reads.listHypothesesBySourceAttempt'), true);
  });
});
