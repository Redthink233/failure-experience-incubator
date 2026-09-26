/**
 * S01 ｜ `M8` step ⑧ INTERRUPTED RECOVERY under a WINDOWS file-name contract
 *        ｜ `PSA-A-CORRECTION-M8-PATH-01` (RECOVERY-01 … RECOVERY-06).
 *
 * 🔴 THE FIELD STATE THIS SUITE REPRODUCES. The interrupted PSA-A run left the operation anchor at
 *    `status: in_progress` with a COMPLETE `planned_batch`, while `insights/batches/` stayed EMPTY -
 *    because the physical batch name embedded the logical `batch_id` verbatim and a `:` is illegal in
 *    a Windows file name. `discoverBatches()` therefore returned `[]`, the read model reported
 *    `batches = []`, the presenter derived `insights_generated = false`, and step ⑧ could never
 *    become `done` while ⑨ / ⑩ stayed locked.
 * 🔴 WHY THIS SUITE IS DISCRIMINATING. A plain in-memory storage accepts `:` happily, so a suite built
 *    on it would pass BOTH before and after the fix. The workspace here is
 *    {@link WindowsFileNameStorage}, which refuses any write whose base name Windows cannot represent
 *    - i.e. exactly the constraint the real browser File System Access adapter meets on Windows. The
 *    FIRST attempt additionally fails through a one-shot injected fault (the interruption), and only
 *    then disarms.
 *    ⇒ Before the fix the retry is refused by the SAME illegal name and the recovery can never
 *    complete. After the fix the retry lands and the operation reaches `complete`.
 * 🔴 NOTHING HERE CALLS A MODEL. Every reply is a hand-written fixture (`NOT_A_REAL_LLM_OUTPUT`), and
 *    `RECOVERY-02` / `RECOVERY-06` assert that the provider call count does not grow across a recovery
 *    - finishing an interrupted write is NOT a second generation (`Real Provider Calls = 0`).
 *
 * Canonical ACs referenced: AC-130 (Local Workspace files), AC-137 (resolution by content).
 * Everything else is labelled `IMPLEMENTATION INVARIANT` and adds no `AC`.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ID_SOURCE,
  at,
  expectGeneratedInsights,
  failOnNthMatchingWrite,
  insightBatchPredicate,
  makeWorkflowHarness,
  readSnapshot,
  seedHistory,
  twoInsightAnswer,
  valueOf,
} from './harness.js';
import type { WorkflowHarness } from './harness.js';
import { stepViewsForSnapshot } from '../../../ui/presenters/steps.js';
import { insightOperationKey } from '../../../application/insight/identity.js';
import { childOperationId } from '../../../application/workflow/operation-ids.js';
import { INSIGHT_BATCHES_DIRECTORY, INSIGHT_OPERATIONS_DIRECTORY } from '../../../application/insight/persistence.js';
import { InMemoryWorkspaceStorage } from '../../../workspace/memory-storage.js';
import { WorkspaceStorageError } from '../../../workspace/storage.js';
import type { WorkspaceEntry, WorkspaceStorage } from '../../../workspace/storage.js';

/* ------------------------------------------------------------------ *
 * The Windows file-name contract, enforced on the storage itself
 * ------------------------------------------------------------------ */

const WINDOWS_ILLEGAL_FILENAME_CHARACTERS = /[<>:"/\\|?*]/;
const WINDOWS_RESERVED_BASENAMES = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/iu;

/**
 * Refuses a workspace path whose BASE NAME Windows cannot represent.
 *
 * 🔴 Only the base name is judged, because that is the unit the operating system validates: the `/`
 *    characters in the path are workspace-relative separators, not part of any name.
 */
function assertWindowsRepresentable(path: string): void {
  const index = path.lastIndexOf('/');
  const name = index < 0 ? path : path.slice(index + 1);
  if (
    name.length === 0 ||
    WINDOWS_ILLEGAL_FILENAME_CHARACTERS.test(name) ||
    /[. ]$/.test(name) ||
    WINDOWS_RESERVED_BASENAMES.test(name)
  ) {
    throw new WorkspaceStorageError(
      'INVALID_PATH',
      path,
      `A Windows file system cannot represent the name "${name}".`,
    );
  }
}

/**
 * An in-memory workspace that ALSO enforces the Windows file-name contract, plus an optional one-shot
 * write fault.
 *
 * 🔴 The NAME CHECK RUNS FIRST AND IS NEVER DISARMED - it is the permanent property of the platform,
 *    not an injected failure. The fault models the interrupted write and disarms after it fires, so
 *    the very next attempt can prove that the recovery really completes.
 */
class WindowsFileNameStorage implements WorkspaceStorage {
  readonly kind = 'windows-name-enforcing';

  private readonly inner: InMemoryWorkspaceStorage;
  private readonly should_fail: (path: string) => boolean;
  private armed = true;

  write_attempts = 0;
  name_refusals = 0;

  constructor(inner: InMemoryWorkspaceStorage, should_fail: (path: string) => boolean) {
    this.inner = inner;
    this.should_fail = should_fail;
  }

  async exists(path: string): Promise<boolean> {
    return this.inner.exists(path);
  }

  async readFile(path: string): Promise<string> {
    return this.inner.readFile(path);
  }

  async writeFile(path: string, contents: string): Promise<void> {
    this.write_attempts += 1;
    try {
      assertWindowsRepresentable(path);
    } catch (error) {
      this.name_refusals += 1;
      throw error;
    }
    if (this.armed && this.should_fail(path)) {
      this.armed = false;
      throw new WorkspaceStorageError('INVALID_PATH', path, 'INJECTED WRITE FAILURE (interruption)');
    }
    return this.inner.writeFile(path, contents);
  }

  async list(path: string): Promise<readonly WorkspaceEntry[]> {
    return this.inner.list(path);
  }

  async move(fromPath: string, toPath: string): Promise<void> {
    assertWindowsRepresentable(toPath);
    return this.inner.move(fromPath, toPath);
  }
}

/* ------------------------------------------------------------------ *
 * Inspection helpers
 * ------------------------------------------------------------------ */

function pathsUnder(storage: InMemoryWorkspaceStorage, directory: string): readonly string[] {
  return Object.keys(storage.snapshot()).filter((path) => path.startsWith(`${directory}/`));
}

/**
 * The `Insight` SIDECAR documents only - never the batch records and never the operation anchors,
 * which live under the same `insights/` prefix.
 */
function insightSidecarPaths(storage: InMemoryWorkspaceStorage): readonly string[] {
  return pathsUnder(storage, 'insights').filter(
    (path) =>
      path.endsWith('.json') &&
      !path.startsWith(`${INSIGHT_BATCHES_DIRECTORY}/`) &&
      !path.startsWith(`${INSIGHT_OPERATIONS_DIRECTORY}/`),
  );
}

interface AnchorDocument {
  readonly operation_key: string;
  readonly operation_id: string;
  readonly status: string;
  readonly batch_id: string;
  readonly planned_batch: {
    readonly batch_id: string;
    readonly operation_id: string;
    readonly source_attempt_id: string;
    readonly insight_ids: readonly string[];
  };
}

function readAnchor(storage: InMemoryWorkspaceStorage): AnchorDocument {
  const paths = pathsUnder(storage, INSIGHT_OPERATIONS_DIRECTORY);
  assert.equal(paths.length, 1, 'exactly one durable anchor must exist');
  return JSON.parse(storage.peek(paths[0] ?? '') ?? '{}') as AnchorDocument;
}

interface BatchDocument {
  readonly batch_id: string;
  readonly operation_id: string;
  readonly insight_ids: readonly string[];
}

function readBatches(storage: InMemoryWorkspaceStorage): readonly BatchDocument[] {
  return pathsUnder(storage, INSIGHT_BATCHES_DIRECTORY).map(
    (path) => JSON.parse(storage.peek(path) ?? '{}') as BatchDocument,
  );
}

/** The user-level operation id the UI submits. */
const OPERATION_ID = 'op-path-recovery-01';

/**
 * 🔴 THE ID THE `M8` ANCHOR IS REALLY KEYED BY. The `D9` workflow derives a CHILD operation id per
 *    writing step (`operation-ids.ts`), so step ⑧ runs under `<operation_id>#insight-generation`.
 *    It contains `#`, which the anchor key encodes as `~23` - the anchor path has always been
 *    path-safe, which is exactly why the batch path had to become path-safe too.
 */
const INSIGHT_OPERATION_ID = childOperationId(OPERATION_ID, 'insight-generation');

/**
 * Drives the workflow into the FROZEN FIELD STATE: the anchor holds the whole plan, the `Insight`s
 * landed, and the batch record could not be written.
 */
async function interruptedGeneration(): Promise<{
  readonly inner: InMemoryWorkspaceStorage;
  readonly storage: WindowsFileNameStorage;
  readonly harness: WorkflowHarness;
}> {
  const inner = new InMemoryWorkspaceStorage();
  const storage = new WindowsFileNameStorage(
    inner,
    failOnNthMatchingWrite(insightBatchPredicate, 1),
  );
  const harness = makeWorkflowHarness({ insight: twoInsightAnswer(), storage });
  await seedHistory(harness);
  return { inner, storage, harness };
}

/* ------------------------------------------------------------------ *
 * RECOVERY-01 … RECOVERY-06
 * ------------------------------------------------------------------ */

describe('PSA-A-CORRECTION-M8-PATH-01 ｜ step ⑧ interrupted recovery', () => {
  it('RECOVERY-01 / AC-130: an in_progress anchor whose batch is missing is COMPLETED by a retry of the same operation', async () => {
    const { inner, harness } = await interruptedGeneration();

    const first = await harness.workflow.generateInsights({
      operation_id: OPERATION_ID,
      attempt_id: at(ID_SOURCE),
    });
    /*
     * 🔴 THE FIRST ATTEMPT MUST NOT REPORT SUCCESS. A blocked write is an explicit, RETRYABLE
     *    refusal - never a generated result and never an empty one.
     */
    assert.equal(first.kind, 'runtime');
    assert.equal(first.notice?.code, 'PERSISTENCE_RECOVERY_BLOCKED');
    assert.equal(first.notice?.retryable, true);

    /* ---- the frozen field state ---- */
    const interrupted = readAnchor(inner);
    assert.equal(interrupted.status, 'in_progress');
    assert.equal(interrupted.operation_id, INSIGHT_OPERATION_ID);
    assert.equal(interrupted.planned_batch.batch_id, interrupted.batch_id);
    assert.ok(interrupted.planned_batch.insight_ids.length > 0);
    assert.equal(pathsUnder(inner, INSIGHT_BATCHES_DIRECTORY).length, 0, 'the batch is still missing');
    assert.equal(
      insightSidecarPaths(inner).length,
      interrupted.planned_batch.insight_ids.length,
      'the Insight documents of the plan already landed',
    );

    /* ---- the retry: SAME operation id, BRAND-NEW object graph ---- */
    const recovered = expectGeneratedInsights(
      valueOf(
        await harness.reopen().generateInsights({
          operation_id: OPERATION_ID,
          attempt_id: at(ID_SOURCE),
        }),
      ),
    );
    assert.equal(recovered.idempotent_replay, true);

    /* 1. the anchor is now COMPLETE, and it still names the SAME planned batch */
    const completed = readAnchor(inner);
    assert.equal(completed.status, 'complete');
    assert.equal(completed.batch_id, interrupted.batch_id);
    assert.equal(completed.planned_batch.batch_id, interrupted.planned_batch.batch_id);

    /* 2. the batch record landed, under a name Windows can represent */
    const batch_paths = pathsUnder(inner, INSIGHT_BATCHES_DIRECTORY);
    assert.equal(batch_paths.length, 1, 'exactly one batch record');
    const batch_name = (batch_paths[0] ?? '').slice((batch_paths[0] ?? '').lastIndexOf('/') + 1);
    assert.equal(
      WINDOWS_ILLEGAL_FILENAME_CHARACTERS.test(batch_name),
      false,
      `the physical batch name must be a legal Windows name, received "${batch_name}"`,
    );

    /* 3. the batch's OWN logical id is the original value - unchanged by the encoding */
    const batches = readBatches(inner);
    assert.equal(batches[0]?.batch_id, interrupted.planned_batch.batch_id);
    assert.equal(batches[0]?.operation_id, INSIGHT_OPERATION_ID);
    assert.deepEqual(batches[0]?.insight_ids, interrupted.planned_batch.insight_ids);
  });

  it('RECOVERY-02 / IMPLEMENTATION INVARIANT: a recovery never asks the model again', async () => {
    const { harness } = await interruptedGeneration();

    await harness.workflow.generateInsights({
      operation_id: OPERATION_ID,
      attempt_id: at(ID_SOURCE),
    });
    const calls_after_interruption = harness.provider.insight_calls.length;
    assert.equal(calls_after_interruption, 1, 'the interrupted attempt called the model exactly once');

    /* A recovery completes the WRITE; it re-asks nothing. */
    await harness.reopen().generateInsights({
      operation_id: OPERATION_ID,
      attempt_id: at(ID_SOURCE),
    });
    assert.equal(
      harness.provider.insight_calls.length,
      calls_after_interruption,
      'TOTAL GENERATION CALLS must not grow because of a recovery',
    );
    assert.equal(harness.provider.insight_calls.length, 1);
  });

  it('RECOVERY-03 / IMPLEMENTATION INVARIANT: the retry addresses the SAME operation and mints no second identity', async () => {
    const { inner, harness } = await interruptedGeneration();

    await harness.workflow.generateInsights({
      operation_id: OPERATION_ID,
      attempt_id: at(ID_SOURCE),
    });
    const interrupted = readAnchor(inner);
    const anchor_path_before = pathsUnder(inner, INSIGHT_OPERATIONS_DIRECTORY)[0] ?? '';

    const recovered = expectGeneratedInsights(
      valueOf(
        await harness.reopen().generateInsights({
          operation_id: OPERATION_ID,
          attempt_id: at(ID_SOURCE),
        }),
      ),
    );

    /* 🔴 The anchor addressed by the retry is the very same document - the key is a pure function of
       (`source_attempt_id`, `operation_id`). */
    assert.equal(
      anchor_path_before,
      `${INSIGHT_OPERATIONS_DIRECTORY}/${insightOperationKey(ID_SOURCE, INSIGHT_OPERATION_ID)}.json`,
    );
    assert.deepEqual(pathsUnder(inner, INSIGHT_OPERATIONS_DIRECTORY), [anchor_path_before]);
    /* 🔴 No second batch identity was minted: the recovered batch is the PLANNED one. */
    assert.equal(recovered.batch.batch_id, interrupted.planned_batch.batch_id);
    assert.equal(readBatches(inner).length, 1);
  });

  it('RECOVERY-04 / AC-137: after the recovery the read model really sees the batch', async () => {
    const { inner, harness } = await interruptedGeneration();

    await harness.workflow.generateInsights({
      operation_id: OPERATION_ID,
      attempt_id: at(ID_SOURCE),
    });
    const before = await readSnapshot(harness.reopen(), at(ID_SOURCE));
    assert.equal(
      before.insights.batches.length,
      0,
      'this is the field observation: the read model reported no batch',
    );

    await harness.reopen().generateInsights({
      operation_id: OPERATION_ID,
      attempt_id: at(ID_SOURCE),
    });
    const after = await readSnapshot(harness.reopen(), at(ID_SOURCE));
    assert.ok(
      after.insights.batches.length > 0,
      'the recovered batch must be discoverable through content-based discovery',
    );
    assert.equal(after.insights.batches[0]?.batch_id, readAnchor(inner).batch_id);
  });

  it('RECOVERY-05 / IMPLEMENTATION INVARIANT: step ⑧ becomes done and step ⑨ is unlocked', async () => {
    const { inner, harness } = await interruptedGeneration();

    await harness.workflow.generateInsights({
      operation_id: OPERATION_ID,
      attempt_id: at(ID_SOURCE),
    });
    const locked_before = stepViewsForSnapshot(await readSnapshot(harness.reopen(), at(ID_SOURCE)));
    assert.equal(locked_before[7]?.number, '⑧');
    assert.equal(locked_before[7]?.status, 'current', '⑧ stays the focus while its batch is missing');
    assert.equal(locked_before[8]?.number, '⑨');
    assert.equal(locked_before[8]?.locked, true, '⑨ is locked before the recovery');

    await harness.reopen().generateInsights({
      operation_id: OPERATION_ID,
      attempt_id: at(ID_SOURCE),
    });

    const views = stepViewsForSnapshot(await readSnapshot(harness.reopen(), at(ID_SOURCE)));
    const step8 = views[7];
    const step9 = views[8];
    const step10 = views[9];
    assert.equal(step8?.number, '⑧');
    assert.equal(step8?.status, 'done');
    assert.equal(step8?.locked, false);
    assert.equal(step9?.number, '⑨');
    assert.equal(step9?.locked, false, '⑨ must become reachable once ⑧ is done');
    assert.equal(step9?.status, 'current', '⑨ becomes the focus - and is NOT executed by this suite');
    assert.equal(step10?.locked, true, '⑩ stays locked: ⑨ has not run');

    /* 🔴 This suite stops at the ⑧ boundary on purpose: it verifies the M8 closure only. */
    assert.equal(pathsUnder(inner, 'hypotheses').length, 0, '⑨ must not have been executed');
  });

  it('RECOVERY-06 / IMPLEMENTATION INVARIANT: a second retry is idempotent - no duplicate batch, record or model call', async () => {
    const { inner, harness } = await interruptedGeneration();

    await harness.workflow.generateInsights({
      operation_id: OPERATION_ID,
      attempt_id: at(ID_SOURCE),
    });
    const first_recovery = expectGeneratedInsights(
      valueOf(
        await harness.reopen().generateInsights({
          operation_id: OPERATION_ID,
          attempt_id: at(ID_SOURCE),
        }),
      ),
    );
    const calls_after_first_recovery = harness.provider.insight_calls.length;
    const batches_after_first_recovery = readBatches(inner);
    const insights_after_first_recovery = pathsUnder(inner, 'insights').filter((path) =>
      path.endsWith('.json'),
    );

    const second_recovery = expectGeneratedInsights(
      valueOf(
        await harness.reopen().generateInsights({
          operation_id: OPERATION_ID,
          attempt_id: at(ID_SOURCE),
        }),
      ),
    );

    assert.equal(second_recovery.idempotent_replay, true);
    assert.equal(second_recovery.batch.batch_id, first_recovery.batch.batch_id);
    assert.equal(
      harness.provider.insight_calls.length,
      calls_after_first_recovery,
      'the second retry must not call the model either',
    );
    assert.deepEqual(readBatches(inner), batches_after_first_recovery);
    assert.deepEqual(
      pathsUnder(inner, 'insights').filter((path) => path.endsWith('.json')),
      insights_after_first_recovery,
    );
    assert.equal(readAnchor(inner).status, 'complete');
  });
});
