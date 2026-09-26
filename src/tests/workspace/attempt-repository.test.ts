/**
 * T6 – T8, T10 – T12 ｜ Attempt repository minimum vertical slice.
 *
 * ITC-02 (repository layer works with NO database), ITC-03 (update/read), ITC-07 (list),
 * ITC-08 (archive persistence), ITC-09 (storage abstraction, not a browser picker).
 * Canonical AC references used by this file:
 *   AC-01 / AC-02 / AC-72 / AC-73 / AC-76 / AC-77 / AC-87 / AC-126 / AC-129 / AC-130 /
 *   AC-136 / AC-137 / AC-138 / AC-Q06-5.
 * 🔴 This file creates NO new AC.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import { extensionOfWorkspacePath } from '../../workspace/storage.js';
import type { WorkspaceStorage } from '../../workspace/storage.js';
import {
  AttemptRepositoryError,
  createAttemptRepository,
} from '../../workspace/repository/attempt-repository.js';
import type { AttemptRepository } from '../../workspace/repository/attempt-repository.js';
import {
  attemptMarkdownPath,
  attemptSidecarPath,
  attemptsDirectory,
  UNASSIGNED_PROJECT_BUCKET,
} from '../../workspace/schema/paths.js';
import { parseAttemptSidecar } from '../../workspace/schema/attempt-record.js';
import { WorkspaceSchemaError } from '../../workspace/schema/schema-error.js';
import { readWorkspaceMetadata } from '../../workspace/schema/workspace-metadata.js';
import { provided } from '../../domain/types/presence.js';
import { L4_PRODUCT_LAYER_FIELDS } from '../../domain/types/attempt.js';
import { decisionInferenceItem, factItem } from '../../domain/types/source-type.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import { NodeTempFsWorkspaceStorage } from './node-temp-fs-storage.js';

/* ------------------------------------------------------------------ *
 * Harness
 * ------------------------------------------------------------------ */

const BASE_TIME = Date.parse('2026-09-24T00:00:00.000Z');

function makeClock(): () => string {
  let tick = 0;
  return () => new Date(BASE_TIME + tick++ * 60_000).toISOString();
}

function makeIdFactory(): () => ObjectId<'ATT'> {
  let sequence = 0;
  return () => `ATT_${String(sequence++).padStart(26, '0')}` as ObjectId<'ATT'>;
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
    assert.ok(error instanceof AttemptRepositoryError, `expected AttemptRepositoryError, got ${String(error)}`);
    assert.equal(error.code, code);
    return error;
  }
  throw new Error(`expected the repository to reject with ${code}`);
}

async function expectSchemaError(
  promise: Promise<unknown>,
  code: string,
): Promise<WorkspaceSchemaError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(
      error instanceof WorkspaceSchemaError,
      `expected WorkspaceSchemaError, got ${String(error)}`,
    );
    assert.equal(error.code, code);
    return error;
  }
  throw new Error(`expected a WorkspaceSchemaError with ${code}`);
}

/* ------------------------------------------------------------------ *
 * Tests
 * ------------------------------------------------------------------ */

describe('T6–T8｜Attempt repository create / read / update / list', () => {
  it('[AC-01][T6] create → read round-trips the record', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);

    const created = await repo.createAttempt({ raw_text: '把温度提到 70 度，还是开裂。' });
    assert.equal(created.state, 'Draft');
    assert.equal(created.archive_state, 'active');
    assert.equal(created.raw_text.source_type, 'Fact');

    const read = await repo.readAttempt(created.attempt_id);
    assert.deepEqual(read, created);

    const found = await repo.findAttemptById(created.attempt_id);
    assert.deepEqual(found, created);

    // Unknown ids resolve to null, never to a fabricated record.
    assert.equal(await repo.readAttempt('ATT_99999999999999999999999999'), null);
    // 🔴 A non-`ATT_` string is not even a legal `Attempt` id any more: it is rejected by
    //    the COMPILER (`ObjectId<'ATT'>`), not silently accepted and looked up (F06).
    assert.equal(await repo.resolveAttemptPaths('ATT_99999999999999999999999998'), null);
  });

  it('[AC-137] the ID lives INSIDE both file contents, not in the file name', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: '一条现场记录' });

    const sidecar = attemptSidecarPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id);
    const markdown = attemptMarkdownPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id);

    const sidecarText = await storage.readFile(sidecar);
    const markdownText = await storage.readFile(markdown);

    assert.ok(sidecarText.includes(created.attempt_id));
    assert.ok(markdownText.includes(created.attempt_id));
    assert.equal(parseAttemptSidecar(sidecarText).attempt_id, created.attempt_id);

    // The sidecar carries the load-bearing semantics, not a flattened flag.
    assert.ok(sidecarText.includes('"state": "Draft"'));
    assert.ok(sidecarText.includes('"archive_state": "active"'));
    assert.ok(sidecarText.includes('"source_type": "Fact"'));
    assert.ok(sidecarText.includes('"presence_state": "unknown"'));
    // Markdown keeps per-item provenance visible to a human reader.
    assert.ok(markdownText.includes('用户 Fact'));
    assert.ok(markdownText.includes('未知 / 未提供'));
  });

  it('[AC-87][AC-Q06-5] step ① input gate denies blank input without creating anything', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);

    const error = await expectRepositoryError(
      repo.createAttempt({ raw_text: '   \n\t ' }),
      'STEP_ONE_GATE_DENIED',
    );
    assert.equal(error.layer, 'GATE');
    assert.equal(storage.fileCount(), 0);
    assert.deepEqual(await repo.listAttempts(), []);
  });

  it('[T7][AC-02] update → read, and the Formal gate is enforced by the repository', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: '提升热风温度后开裂更严重' });

    // Prerequisites missing ⇒ the promotion is denied as a GATE outcome.
    const denied = await expectRepositoryError(
      repo.updateAttempt(created.attempt_id, { state: 'Formal' }),
      'FORMAL_GATE_DENIED',
    );
    assert.equal(denied.layer, 'GATE');
    assert.deepEqual([...denied.missing_fields], [
      'goal',
      'actual_attempt',
      'actual_result',
      'result_status',
    ]);
    assert.equal((await repo.readAttempt(created.attempt_id))?.state, 'Draft');

    // Supply everything ⇒ promotion succeeds.
    const promoted = await repo.updateAttempt(created.attempt_id, {
      goal: provided(factItem('CI-goal', '缩短干燥时长')),
      actual_attempt: provided(factItem('CI-approach', '提升热风温度')),
      actual_result: provided(factItem('CI-result', '出现明显开裂')),
      result_status: provided(decisionInferenceItem('CI-status', 'Failed', 'accepted')),
      condition: provided(factItem('CI-condition', '50 摄氏度')),
      state: 'Formal',
    });

    assert.equal(promoted.state, 'Formal');
    assert.equal(promoted.updated_at, '2026-09-24T00:01:00.000Z');
    const reread = await repo.readAttempt(created.attempt_id);
    assert.equal(reread?.state, 'Formal');
    assert.equal(reread?.goal.presence_state, 'present');
    assert.equal(
      reread?.result_status.presence_state === 'present'
        ? reread.result_status.item.source_type
        : null,
      'Inference',
    );

    // Formal -> Draft is not a canonical transition (§2.1).
    await expectRepositoryError(
      repo.updateAttempt(created.attempt_id, { state: 'Draft' }),
      'NOT_A_CANONICAL_TRANSITION',
    );
  });

  it('[AC-77][AC-78] update changes updated_at but preserves created_at', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: '现场记录' });

    const updated = await repo.updateAttempt(created.attempt_id, {
      condition: provided(factItem('CI-condition', '室温 25 度')),
    });

    assert.equal(updated.created_at, created.created_at);
    assert.notEqual(updated.updated_at, created.updated_at);
    // L4 ①② are both present, so "was this Formal Attempt modified?" stays answerable.
    assert.deepEqual(
      Object.keys(updated).filter((key) => /^(created|updated)_at$/.test(key)).sort(),
      ['created_at', 'updated_at'],
    );
    // 「发生时间」 is a user Fact field and is explicitly NOT part of L4.
    assert.ok('occurred_at' in updated);
    assert.ok(!L4_PRODUCT_LAYER_FIELDS.includes('occurred_at' as never));
  });

  it('[AC-72] an archived Attempt is not editable, and un-archiving restores editability', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: '现场记录' });

    const archived = await repo.updateAttempt(created.attempt_id, { archive_state: 'archived' });
    assert.equal(archived.archive_state, 'archived');

    const denied = await expectRepositoryError(
      repo.updateAttempt(created.attempt_id, {
        condition: provided(factItem('CI-condition', '室温 25 度')),
      }),
      'ARCHIVED_NOT_EDITABLE',
    );
    assert.equal(denied.layer, 'GATE');

    const restored = await repo.updateAttempt(created.attempt_id, { archive_state: 'active' });
    assert.equal(restored.archive_state, 'active');
    const edited = await repo.updateAttempt(created.attempt_id, {
      condition: provided(factItem('CI-condition', '室温 25 度')),
    });
    assert.equal(edited.condition.presence_state, 'present');
  });

  it('[AC-73][AC-76] archiving is only a state bit: the record survives with its identity', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: '现场记录' });

    const before = storage.fileCount();
    await repo.updateAttempt(created.attempt_id, { archive_state: 'archived' });
    // No file is created or removed by archiving.
    assert.equal(storage.fileCount(), before);
    assert.ok(storage.peek(attemptSidecarPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id)) !== undefined);

    // No physical delete entry point exists anywhere in the layers under test.
    assert.ok(!('delete' in storage));
    assert.ok(!('remove' in storage));
    assert.ok(!('unlink' in storage));
    assert.ok(
      !Object.keys(repo).some((member) => /delete|remove|purge|erase/i.test(member)),
      'the repository must expose no delete semantics (AC-76)',
    );
  });

  it('[T8][AC-137] list returns every Attempt, deterministically ordered', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);

    const first = await repo.createAttempt({ raw_text: '第一条' });
    const second = await repo.createAttempt({ raw_text: '第二条' });
    const third = await repo.createAttempt({
      raw_text: '第三条',
      project_id: 'PRJ_OTHER',
    });

    const listed = await repo.listAttempts();
    assert.equal(listed.length, 3);
    assert.deepEqual(
      listed.map((attempt) => attempt.attempt_id),
      [first.attempt_id, second.attempt_id, third.attempt_id],
    );
    // 🔴 Logical projects only: the two Attempts stored without a project do NOT create
    //    a phantom project in the index (§1.3).
    assert.deepEqual(await repo.listProjects(), ['PRJ_OTHER']);

    // Empty workspace lists nothing instead of throwing.
    const emptyRepo = makeRepo(new InMemoryWorkspaceStorage());
    assert.deepEqual(await emptyRepo.listAttempts(), []);
  });

  it('[T10][AC-138] archive_state is a persisted fact that survives a fresh repository', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: '现场记录' });
    await repo.updateAttempt(created.attempt_id, { archive_state: 'archived' });

    // A brand-new repository over the same storage reads the same persisted fact.
    const freshRepo = makeRepo(storage);
    const reread = await freshRepo.readAttempt(created.attempt_id);
    assert.equal(reread?.archive_state, 'archived');

    // And the raw sidecar really stores the state bit.
    const raw = parseAttemptSidecar(
      await storage.readFile(attemptSidecarPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id)),
    );
    assert.equal(raw.archive_state, 'archived');
  });
});

describe('T11–T12｜no database, storage abstraction instead of a browser picker', () => {
  it('[T11][ITC-02][AC-130][AC-136] create / read / update / list all work with NO database', async () => {
    // No server, no connection string, no schema migration: just an object in memory.
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);

    const created = await repo.createAttempt({ raw_text: '无数据库验证记录' });
    const read = await repo.readAttempt(created.attempt_id);
    const updated = await repo.updateAttempt(created.attempt_id, { archive_state: 'archived' });
    const listed = await repo.listAttempts();

    assert.ok(read !== null);
    assert.equal(updated.archive_state, 'archived');
    assert.equal(listed.length, 1);
    assert.equal(storage.kind, 'memory');
    assert.equal(created.attempt_id.startsWith('ATT_'), true);
  });

  it('[T12][AC-129] the repository only ever touches the storage it was handed', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);
    // Nothing exists until the caller supplies an (authorized) storage and writes.
    assert.equal(storage.fileCount(), 0);
    const created = await repo.createAttempt({ raw_text: '授权后才产生文件' });

    // Every path written is inside the workspace tree.
    const paths = Object.keys(storage.snapshot());
    assert.ok(paths.length >= 3);
    for (const path of paths) {
      assert.ok(!path.startsWith('/'));
      assert.ok(!path.includes('..'));
      assert.equal(path.startsWith('projects/') || path === 'workspace.json', true, path);
    }
    assert.equal(extensionOfWorkspacePath(paths[0] ?? '').length > 0, true);
    assert.ok(
      paths.some((path) => path === attemptSidecarPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id)),
    );
    assert.ok(
      paths.some((path) => path === attemptMarkdownPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id)),
    );
    assert.ok(paths.some((path) => path.startsWith(`${attemptsDirectory(UNASSIGNED_PROJECT_BUCKET)}/`)));
  });

  it('[T12][AC-129] the same repository code works unchanged against a different storage implementation', async () => {
    const nodeStorage = new NodeTempFsWorkspaceStorage();
    try {
      const repo = makeRepo(nodeStorage);
      const created = await repo.createAttempt({ raw_text: '在真实临时文件系统上写入' });
      const read = await repo.readAttempt(created.attempt_id);
      assert.equal(read?.attempt_id, created.attempt_id);
      assert.equal(read?.raw_text.value, '在真实临时文件系统上写入');
      // The abstraction - not a concrete browser API - is what the repository depends on.
      assert.equal(nodeStorage.kind, 'node-fs-test-harness');
    } finally {
      nodeStorage.dispose();
    }
  });

  it('[ITC-02][AC-130][AC-136] package.json declares no runtime dependency at all', () => {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
    const manifest = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    // 🔴 No PostgreSQL client, no ORM, no SQLite, no MongoDB, no vector DB, no embedding SDK,
    //    no LangChain / LlamaIndex, no network SDK, no LLM provider SDK, no UI framework.
    assert.deepEqual(Object.keys(manifest.dependencies ?? {}), []);
    assert.deepEqual(
      Object.keys(manifest.devDependencies ?? {}).sort(),
      ['@types/node', 'typescript'],
    );
  });
});

/* ------------------------------------------------------------------ *
 * S01-01A hardening｜F07 duplicate internal object id + F08 optional Project
 * ------------------------------------------------------------------ */

describe('S01-01A hardening｜duplicate object id and optional Project', () => {
  it('[AC-137] IMPLEMENTATION INVARIANT (contract §3.2 rule 1 / F07): two sidecars declaring the same internal id fail explicitly', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: '重复对象 ID 场景' });

    const original = attemptSidecarPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id);
    const duplicate = `${attemptsDirectory(UNASSIGNED_PROJECT_BUCKET)}/copied-sidecar.json`;
    await storage.writeFile(duplicate, await storage.readFile(original));

    // 🔴 The scan must not silently pick one of the two physical objects.
    const error = await expectSchemaError(repo.listAttempts(), 'DUPLICATE_OBJECT_ID');
    assert.ok(error.message.includes(created.attempt_id));
    await expectSchemaError(repo.readAttempt(created.attempt_id), 'DUPLICATE_OBJECT_ID');
    await expectSchemaError(repo.resolveAttemptPaths(created.attempt_id), 'DUPLICATE_OBJECT_ID');

    // Both objects are still on disk: nothing was removed, overwritten or merged.
    assert.equal(await storage.exists(original), true);
    assert.equal(await storage.exists(duplicate), true);
  });

  it('[AC-137] IMPLEMENTATION INVARIANT (contract §3.2 rule 1 / F07): two markdown bodies declaring the same internal id fail explicitly', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: '重复 markdown ID 场景' });

    const original = attemptMarkdownPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id);
    const duplicate = `${attemptsDirectory(UNASSIGNED_PROJECT_BUCKET)}/copied-body.md`;
    await storage.writeFile(duplicate, await storage.readFile(original));

    const error = await expectSchemaError(repo.listAttempts(), 'DUPLICATE_OBJECT_ID');
    assert.ok(error.message.includes(created.attempt_id));
    assert.equal(await storage.exists(original), true);
    assert.equal(await storage.exists(duplicate), true);
  });

  it('[AC-137] IMPLEMENTATION INVARIANT (contract §3.2 rule 1 / F07): a colliding generated id never overwrites a stored record', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const colliding = (): ObjectId<'ATT'> => 'ATT_00000000000000000000000000';
    const repo = createAttemptRepository({
      storage,
      now: makeClock(),
      newAttemptId: colliding,
    });

    const first = await repo.createAttempt({ raw_text: '第一次记录' });
    assert.equal(first.attempt_id, colliding());

    const error = await expectRepositoryError(
      repo.createAttempt({ raw_text: '第二次记录' }),
      'DUPLICATE_OBJECT_ID',
    );
    assert.equal(error.layer, 'RUNTIME');

    // The historical record is intact - content, not just identity.
    const reread = await repo.readAttempt(colliding());
    assert.equal(reread?.raw_text.value, '第一次记录');
    assert.equal((await repo.listAttempts()).length, 1);
    const sidecarText = await storage.readFile(
      attemptSidecarPath(UNASSIGNED_PROJECT_BUCKET, colliding()),
    );
    assert.ok(sidecarText.includes('第一次记录'));
    assert.ok(!sidecarText.includes('第二次记录'));
  });

  it('[AC-137] IMPLEMENTATION INVARIANT (contract §1.3 / F08): an omitted Project never produces a phantom logical Project', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);

    const created = await repo.createAttempt({ raw_text: '未指定项目' });

    // 1. The record itself carries no logical project.
    assert.equal(created.project_id, null);

    // 2. No project metadata is invented and the logical index stays empty.
    const paths = Object.keys(storage.snapshot());
    assert.ok(!paths.some((path) => path.endsWith('project.json')), paths.join(', '));
    assert.deepEqual((await readWorkspaceMetadata(storage))?.projects, []);

    // 3. The internal physical bucket never surfaces as a logical project.
    assert.deepEqual(await repo.listProjects(), []);
    assert.ok(paths.some((path) => path.startsWith(`projects/${UNASSIGNED_PROJECT_BUCKET}/`)));
    assert.ok(!(await repo.listProjects()).includes(UNASSIGNED_PROJECT_BUCKET));

    // 4. The record stays fully usable: read / find / list all work.
    assert.equal((await repo.readAttempt(created.attempt_id))?.attempt_id, created.attempt_id);
    assert.equal((await repo.findAttemptById(created.attempt_id))?.project_id, null);
    assert.equal((await repo.listAttempts()).length, 1);

    // 5. A REAL project is created / registered only when the caller names one.
    const inProject = await repo.createAttempt({
      raw_text: '指定项目',
      project_id: 'PRJ_ALPHA',
    });
    assert.equal(inProject.project_id, 'PRJ_ALPHA');
    assert.deepEqual(await repo.listProjects(), ['PRJ_ALPHA']);
    assert.ok(await storage.exists('projects/PRJ_ALPHA/project.json'));
    assert.deepEqual(
      (await readWorkspaceMetadata(storage))?.projects.map((entry) => entry.project_id),
      ['PRJ_ALPHA'],
    );
  });
});
