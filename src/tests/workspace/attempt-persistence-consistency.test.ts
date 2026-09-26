/**
 * IMPLEMENTATION INVARIANT ｜ FINAL-RAPID-D ③ - the Attempt file pair is written best-effort
 * atomically.
 *
 * An `Attempt` is persisted as a PAIR (§0.4 E.7/E.8): `<id>.json` is the machine source of truth,
 * `<id>.md` is its human-readable mirror. Two `writeFile` calls are two commits, so a failure
 * between them can leave the two documents disagreeing. This file pins down what the repository
 * does about it.
 *
 * Contract references used by this file (it creates NO new AC): §0.4 E.7/E.8 (the JSON + Markdown
 * pair), §3.2 / AC-137 (identity lives inside the content, never in the file name), AC-76 (V1
 * provides NO physical delete), §10.1 (a failure is never presented as a success).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import { WorkspaceStorageError } from '../../workspace/storage.js';
import type { WorkspaceEntry, WorkspaceStorage } from '../../workspace/storage.js';
import {
  AttemptRepositoryError,
  createAttemptRepository,
} from '../../workspace/repository/attempt-repository.js';
import type { AttemptRepository } from '../../workspace/repository/attempt-repository.js';
import {
  attemptMarkdownPath,
  attemptSidecarPath,
  MARKDOWN_EXTENSION,
  UNASSIGNED_PROJECT_BUCKET,
} from '../../workspace/schema/paths.js';
import { provided } from '../../domain/types/presence.js';
import { factItem } from '../../domain/types/source-type.js';
import type { ObjectId } from '../../domain/ids/object-id.js';

/* ------------------------------------------------------------------ *
 * Harness
 * ------------------------------------------------------------------ */

const BASE_TIME = Date.parse('2026-09-26T00:00:00.000Z');

function makeClock(): () => string {
  let tick = 0;
  return () => new Date(BASE_TIME + tick++ * 60_000).toISOString();
}

function makeIdFactory(): () => ObjectId<'ATT'> {
  let sequence = 0;
  return () => `ATT_${String(sequence++).padStart(26, '0')}` as ObjectId<'ATT'>;
}

/**
 * An in-memory workspace whose WRITES can be made to fail on demand.
 *
 * 🔴 The fault is keyed on the path, on how many times that path has been written, and on the
 *    content being written, because the interesting cases are precisely - "the mirror failed, now
 *    let the write that restores the previous bytes fail too" needs the rollback to be identifiable
 *    and nothing earlier to be caught by accident.
 * 🔴 A failing write throws BEFORE it delegates, so the failed document keeps its previous bytes -
 *    which is also what the real adapters do (the File System Access adapter opens a writable stream
 *    and aborts it; a failed `writeSync` leaves the old content in place).
 */
class ScriptedWriteFailureStorage implements WorkspaceStorage {
  readonly kind = 'scripted-write-failure-test-double';

  /** Every attempted write, in order. Used to prove the write ORDER of the pair. */
  readonly writeLog: string[] = [];

  /** Replaceable fault injector. The default never fails. */
  fault: (path: string, ordinalForPath: number, contents: string) => boolean = () => false;

  private readonly inner = new InMemoryWorkspaceStorage();
  private readonly writesPerPath = new Map<string, number>();

  async exists(path: string): Promise<boolean> {
    return this.inner.exists(path);
  }

  async readFile(path: string): Promise<string> {
    return this.inner.readFile(path);
  }

  async list(path: string): Promise<readonly WorkspaceEntry[]> {
    return this.inner.list(path);
  }

  async move(fromPath: string, toPath: string): Promise<void> {
    return this.inner.move(fromPath, toPath);
  }

  async writeFile(path: string, contents: string): Promise<void> {
    const ordinal = (this.writesPerPath.get(path) ?? 0) + 1;
    this.writesPerPath.set(path, ordinal);
    this.writeLog.push(path);
    if (this.fault(path, ordinal, contents)) {
      throw new WorkspaceStorageError(
        'INVALID_PATH',
        path,
        `INJECTED WRITE FAILURE for "${path}" (write #${ordinal}).`,
      );
    }
    return this.inner.writeFile(path, contents);
  }

  snapshot(): Readonly<Record<string, string>> {
    return this.inner.snapshot();
  }

  peek(path: string): string | undefined {
    return this.inner.peek(path);
  }
}

function makeRepo(storage: WorkspaceStorage): AttemptRepository {
  return createAttemptRepository({
    storage,
    now: makeClock(),
    newAttemptId: makeIdFactory(),
  });
}

async function expectRepositoryError(
  promise: Promise<unknown>,
  code: string,
): Promise<AttemptRepositoryError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(
      error instanceof AttemptRepositoryError,
      `expected AttemptRepositoryError, got ${String(error)}`,
    );
    assert.equal(error.code, code);
    return error;
  }
  throw new Error(`expected the repository to reject with ${code}`);
}

/** The condition marker an update writes - distinctive enough to prove what really landed. */
const NEW_MARKER = 'MARKER-NEW-CONDITION';

/* ------------------------------------------------------------------ *
 * STORE-01 - a failed mirror is never a success
 * ------------------------------------------------------------------ */

describe('FINAL-RAPID-D ③ ｜ the Attempt pair survives a half-failed write', () => {
  it('IMPLEMENTATION INVARIANT (STORE-01): a failed Markdown mirror is never reported as a success', async () => {
    const storage = new ScriptedWriteFailureStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: 'STORE-01 现场记录' });

    storage.fault = (path) => path.endsWith(MARKDOWN_EXTENSION);

    const error = await expectRepositoryError(
      repo.updateAttempt(created.attempt_id, {
        condition: provided(factItem('CI-condition', NEW_MARKER)),
      }),
      'PERSISTENCE_ROLLED_BACK',
    );
    assert.equal(error.layer, 'RUNTIME');
    assert.ok(error.message.includes('.md'));
  });

  /* ------------------------------------------------------------------ *
   * STORE-02 - the first write is restored
   * ------------------------------------------------------------------ */

  it('IMPLEMENTATION INVARIANT (STORE-02): when the rollback works the sidecar keeps its previous content', async () => {
    const storage = new ScriptedWriteFailureStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: 'STORE-02 现场记录' });

    const sidecarPath = attemptSidecarPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id);
    const markdownPath = attemptMarkdownPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id);
    const sidecarBefore = storage.peek(sidecarPath);
    const markdownBefore = storage.peek(markdownPath);
    assert.ok(sidecarBefore !== undefined && markdownBefore !== undefined);
    const recordBefore = await repo.readAttempt(created.attempt_id);

    storage.fault = (path) => path.endsWith(MARKDOWN_EXTENSION);
    await expectRepositoryError(
      repo.updateAttempt(created.attempt_id, {
        condition: provided(factItem('CI-condition', NEW_MARKER)),
      }),
      'PERSISTENCE_ROLLED_BACK',
    );

    /* 🔴 The pair is EXACTLY what it was: no new content anywhere, no missing document. */
    assert.equal(storage.peek(sidecarPath), sidecarBefore);
    assert.equal(storage.peek(markdownPath), markdownBefore);
    assert.ok(!(storage.peek(sidecarPath) ?? '').includes(NEW_MARKER));

    /* And the repository agrees - byte-equal read-back, so the update did not take effect at all. */
    assert.deepEqual(await repo.readAttempt(created.attempt_id), recordBefore);

    /* The rollback was a write to the SIDECAR path, after the failed mirror write. */
    assert.deepEqual(storage.writeLog.slice(-3), [sidecarPath, markdownPath, sidecarPath]);
  });

  /* ------------------------------------------------------------------ *
   * STORE-03 - the rollback fails too
   * ------------------------------------------------------------------ */

  it('IMPLEMENTATION INVARIANT (STORE-03): a failed rollback raises an explicit consistency error', async () => {
    const storage = new ScriptedWriteFailureStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: 'STORE-03 现场记录' });

    const sidecarPath = attemptSidecarPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id);
    const markdownPath = attemptMarkdownPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id);
    const sidecarBefore = storage.peek(sidecarPath);
    const markdownBefore = storage.peek(markdownPath);

    /*
     * The mirror fails, and so does the write that carries the PREVIOUS sidecar bytes - which is
     * exactly the rollback. Keying on the content keeps the update's own sidecar write out of it.
     */
    storage.fault = (path, _ordinal, contents) =>
      path.endsWith(MARKDOWN_EXTENSION) || contents === sidecarBefore;

    const error = await expectRepositoryError(
      repo.updateAttempt(created.attempt_id, {
        condition: provided(factItem('CI-condition', NEW_MARKER)),
      }),
      'PERSISTENCE_CONSISTENCY_ERROR',
    );
    assert.equal(error.layer, 'RUNTIME');
    assert.ok(error.message.includes(sidecarPath));
    assert.ok(error.message.includes(markdownPath));

    /* 🔴 The cause is the ROLLBACK failure, not the mirror failure: the pair could not be repaired. */
    const cause = error.cause;
    assert.ok(cause instanceof WorkspaceStorageError);
    assert.ok(
      cause.message.includes(sidecarPath),
      'the reported cause must be the failed rollback write',
    );
    assert.ok(!cause.message.includes(markdownPath));

    /* The rollback really was attempted, immediately after the mirror write that failed. */
    assert.deepEqual(storage.writeLog.slice(-2), [markdownPath, sidecarPath]);

    /*
     * 🔴 And the residual is asserted rather than hidden: with no rollback the sidecar holds the new
     *    content while the mirror still holds the old one. The caller was told, and the call failed.
     */
    assert.notEqual(storage.peek(sidecarPath), sidecarBefore);
    assert.ok((storage.peek(sidecarPath) ?? '').includes(NEW_MARKER));
    assert.equal(storage.peek(markdownPath), markdownBefore);
  });

  /* ------------------------------------------------------------------ *
   * The brand-new-record residual
   * ------------------------------------------------------------------ */

  it('IMPLEMENTATION INVARIANT (STORE-01): a failed CREATE is reported and the missing mirror is visible', async () => {
    const storage = new ScriptedWriteFailureStorage();
    storage.fault = (path) => path.endsWith(MARKDOWN_EXTENSION);
    const repo = makeRepo(storage);

    const error = await expectRepositoryError(
      repo.createAttempt({ raw_text: '新建记录时镜像写入失败' }),
      'PERSISTENCE_CONSISTENCY_ERROR',
    );
    assert.equal(error.layer, 'RUNTIME');

    /*
     * 🔴 There was no previous content to restore, and V1 has no physical delete (AC-76), so the
     *    sidecar cannot be un-written. It IS readable and it IS honestly reported as mirror-less.
     */
    const listed = await repo.listAttempts();
    assert.equal(listed.length, 1);
    const attemptId = listed[0]?.attempt_id;
    assert.ok(attemptId !== undefined);

    const paths = await repo.resolveAttemptPaths(attemptId);
    assert.equal(paths?.sidecar_path, attemptSidecarPath(UNASSIGNED_PROJECT_BUCKET, attemptId));
    assert.equal(paths?.markdown_path, null);
    assert.equal(
      await storage.exists(attemptMarkdownPath(UNASSIGNED_PROJECT_BUCKET, attemptId)),
      false,
    );

    /* 🔴 The pair heals on the next write: the mirror is written for the existing pair. */
    storage.fault = () => false;
    await repo.updateAttempt(attemptId, {
      condition: provided(factItem('CI-condition', '后续写入补回镜像')),
    });
    const repaired = await repo.resolveAttemptPaths(attemptId);
    assert.equal(
      repaired?.markdown_path,
      attemptMarkdownPath(UNASSIGNED_PROJECT_BUCKET, attemptId),
    );
  });

  /* ------------------------------------------------------------------ *
   * The happy path, and the shape of the write sequence
   * ------------------------------------------------------------------ */

  it('IMPLEMENTATION INVARIANT: the pair is written sidecar-first and leaves no staging debris', async () => {
    const storage = new ScriptedWriteFailureStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: '写序与残留检查' });

    const sidecarPath = attemptSidecarPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id);
    const markdownPath = attemptMarkdownPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id);

    /*
     * 🔴 ORDER IS LOAD-BEARING: the sidecar is the document the rest of the system reads, and it is
     *    written FIRST so that a failed mirror still leaves the previous bytes available to restore.
     */
    assert.deepEqual(
      storage.writeLog.filter((path) => path.endsWith(MARKDOWN_EXTENSION)),
      [markdownPath],
    );
    assert.ok(
      storage.writeLog.indexOf(sidecarPath) < storage.writeLog.indexOf(markdownPath),
      'the sidecar must be written before its mirror',
    );

    /*
     * 🔴 No staging file exists - not a temporary name, not a backup name. The rollback design needs
     *    none, and in a workspace with no physical delete (AC-76) any leftover would be permanent.
     */
    assert.deepEqual(Object.keys(storage.snapshot()).sort(), [
      'projects/_unassigned/attempts/ATT_00000000000000000000000000.json',
      'projects/_unassigned/attempts/ATT_00000000000000000000000000.md',
      'workspace.json',
    ]);

    /* The happy path updates both documents together and creates no extra file. */
    await repo.updateAttempt(created.attempt_id, {
      condition: provided(factItem('CI-condition', NEW_MARKER)),
    });
    assert.equal(storage.peek(markdownPath)?.includes(NEW_MARKER), true);
    assert.equal(storage.peek(sidecarPath)?.includes(NEW_MARKER), true);
    assert.equal(Object.keys(storage.snapshot()).length, 3);
  });
});
