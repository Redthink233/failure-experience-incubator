/**
 * T9 ｜ Rename / move → ID-based resolution must still work.
 *
 * ITC-10 (stable object identity foundation - NOT the full M7 EvidenceRef builder).
 * Canonical AC references used by this file:
 *   AC-76 / AC-100 / AC-137 / AC-138.
 * 🔴 This file creates NO new AC.
 *
 * This is the single most important behavioural assertion of S01-01: object identity is
 * carried INSIDE the file content, so renaming `ATT_x.md` / `ATT_x.json` to arbitrary
 * names (contract §3.2 / Gate C Plan §J.1 row 6) must not break resolution, and a
 * subsequent update must write back to the RENAMED files instead of creating duplicates.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { InMemoryWorkspaceStorage } from '../../workspace/memory-storage.js';
import type { WorkspaceStorage } from '../../workspace/storage.js';
import { createAttemptRepository } from '../../workspace/repository/attempt-repository.js';
import type { AttemptRepository } from '../../workspace/repository/attempt-repository.js';
import {
  attemptMarkdownPath,
  attemptSidecarPath,
  attemptsDirectory,
  UNASSIGNED_PROJECT_BUCKET,
} from '../../workspace/schema/paths.js';
import { provided } from '../../domain/types/presence.js';
import { factItem } from '../../domain/types/source-type.js';
import type { ObjectId } from '../../domain/ids/object-id.js';
import { NodeTempFsWorkspaceStorage } from './node-temp-fs-storage.js';

const BASE_TIME = Date.parse('2026-09-24T00:00:00.000Z');

function makeRepo(storage: WorkspaceStorage): AttemptRepository {
  let tick = 0;
  let sequence = 0;
  return createAttemptRepository({
    storage,
    now: () => new Date(BASE_TIME + tick++ * 60_000).toISOString(),
    newAttemptId: () => `ATT_${String(sequence++).padStart(26, '0')}` as ObjectId<'ATT'>,
  });
}

async function scenarioRenameThenResolve(
  storage: WorkspaceStorage,
  label: string,
): Promise<void> {
  const repo = makeRepo(storage);
  const created = await repo.createAttempt({ raw_text: `${label}：现场失败记录` });

  const originalSidecar = attemptSidecarPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id);
  const originalMarkdown = attemptMarkdownPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id);

  // 1. The generated file contents really do carry the internal ID.
  const sidecarBefore = await storage.readFile(originalSidecar);
  const markdownBefore = await storage.readFile(originalMarkdown);
  assert.ok(
    sidecarBefore.includes(created.attempt_id),
    `${label}: sidecar content must contain the internal ID`,
  );
  assert.ok(
    markdownBefore.includes(created.attempt_id),
    `${label}: markdown content must contain the internal ID`,
  );

  // 2. Rename BOTH members of the pair to arbitrary, unrelated names.
  const renamedSidecar = `${attemptsDirectory(UNASSIGNED_PROJECT_BUCKET)}/moved-record.bak.json`;
  const renamedMarkdown = `${attemptsDirectory(UNASSIGNED_PROJECT_BUCKET)}/notes-2026.md`;
  await storage.move(originalSidecar, renamedSidecar);
  await storage.move(originalMarkdown, renamedMarkdown);

  assert.equal(await storage.exists(originalSidecar), false);
  assert.equal(await storage.exists(originalMarkdown), false);
  assert.equal(await storage.exists(renamedSidecar), true);
  assert.equal(await storage.exists(renamedMarkdown), true);

  // 3. Re-scan with a FRESH repository: resolution is by content, not by file name.
  const rescanned = makeRepo(storage);
  const resolved = await rescanned.findAttemptById(created.attempt_id);
  assert.ok(resolved !== null, `${label}: the Attempt must still resolve after renaming`);
  assert.equal(resolved?.attempt_id, created.attempt_id);
  assert.equal(resolved?.raw_text.value, `${label}：现场失败记录`);

  const paths = await rescanned.resolveAttemptPaths(created.attempt_id);
  assert.equal(paths?.sidecar_path, renamedSidecar);
  assert.equal(paths?.markdown_path, renamedMarkdown);
  // 🔴 Resolution must not fall back to the conventional name.
  assert.notEqual(paths?.sidecar_path, originalSidecar);

  // 4. An update writes back to the RENAMED files - no duplicate record is created.
  const fileCountBefore = Object.keys(await snapshotOf(storage)).length;
  const updated = await rescanned.updateAttempt(created.attempt_id, {
    condition: provided(factItem('CI-condition', '室温 25 度')),
    archive_state: 'archived',
  });
  const fileCountAfter = Object.keys(await snapshotOf(storage)).length;

  assert.equal(updated.archive_state, 'archived');
  assert.equal(fileCountAfter, fileCountBefore, `${label}: no duplicate files may appear`);
  assert.equal(await storage.exists(originalSidecar), false);
  assert.equal(await storage.exists(originalMarkdown), false);
  assert.ok((await storage.readFile(renamedSidecar)).includes('"archive_state": "archived"'));
  assert.ok((await storage.readFile(renamedMarkdown)).includes(created.attempt_id));

  // 5. The record still lists, and the archived state is still a resolvable fact.
  const listed = await rescanned.listAttempts();
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.attempt_id, created.attempt_id);
  assert.equal(await rescanned.readAttempt(created.attempt_id).then((a) => a?.archive_state), 'archived');

  // 6. Archiving never removed anything: the renamed pair is still on disk.
  assert.equal(await storage.exists(renamedSidecar), true);
  assert.equal(await storage.exists(renamedMarkdown), true);
}

async function snapshotOf(storage: WorkspaceStorage): Promise<Record<string, string>> {
  if (storage instanceof InMemoryWorkspaceStorage) {
    return { ...storage.snapshot() };
  }
  // Generic fallback: walk the workspace tree through the abstraction only.
  const result: Record<string, string> = {};
  const walk = async (path: string): Promise<void> => {
    for (const entry of await storage.list(path)) {
      const child = path === '' ? entry.name : `${path}/${entry.name}`;
      if (entry.kind === 'directory') {
        await walk(child);
      } else {
        result[child] = await storage.readFile(child);
      }
    }
  };
  if (await storage.exists('projects')) {
    await walk('projects');
  }
  if (await storage.exists('workspace.json')) {
    result['workspace.json'] = await storage.readFile('workspace.json');
  }
  return result;
}

describe('T9 rename → ID resolution｜identity lives in the content', () => {
  it('[T9][AC-137] renaming both files does not break resolution (in-memory workspace)', async () => {
    await scenarioRenameThenResolve(new InMemoryWorkspaceStorage(), '内存工作区');
  });

  it('[T9][AC-137] renaming both files does not break resolution (real temporary filesystem)', async () => {
    const storage = new NodeTempFsWorkspaceStorage();
    try {
      await scenarioRenameThenResolve(storage, '真实文件系统');
    } finally {
      storage.dispose();
    }
  });

  it('[T9][AC-137] moving the whole project directory does not break resolution', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: '整体移动目录测试' });

    // An Attempt created without a logical Project has no `project.json` at all (§1.3),
    // so only the attempt bucket itself is moved.
    await storage.move(
      `projects/${UNASSIGNED_PROJECT_BUCKET}/attempts`,
      'projects/PRJ_RENAMED/attempts',
    );

    const rescanned = makeRepo(storage);
    const resolved = await rescanned.findAttemptById(created.attempt_id);
    assert.equal(resolved?.attempt_id, created.attempt_id);
    const paths = await rescanned.resolveAttemptPaths(created.attempt_id);
    assert.equal(paths?.storage_project_id, 'PRJ_RENAMED');
    assert.ok(paths?.sidecar_path?.includes('PRJ_RENAMED'));

    // The record's own `project_id` metadata is untouched by the physical move.
    assert.equal(resolved?.project_id, null);
  });

  it('[T9][AC-100] an archived record stays resolvable after a rename', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: '归档后改名' });
    await repo.updateAttempt(created.attempt_id, { archive_state: 'archived' });

    await storage.move(
      attemptSidecarPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id),
      'projects/PRJ_DEFAULT/attempts/archive-copy.json',
    );
    await storage.move(
      attemptMarkdownPath(UNASSIGNED_PROJECT_BUCKET, created.attempt_id),
      'projects/PRJ_DEFAULT/attempts/archive-copy.md',
    );

    const rescanned = makeRepo(storage);
    const resolved = await rescanned.readAttempt(created.attempt_id);
    // Archiving does not invalidate the ID (§3.2 rule 3 / AC-138).
    assert.equal(resolved?.archive_state, 'archived');
    assert.equal(resolved?.attempt_id, created.attempt_id);
  });

  it('IMPLEMENTATION INVARIANT: an unrelated file dropped into the workspace is ignored', async () => {
    const storage = new InMemoryWorkspaceStorage();
    const repo = makeRepo(storage);
    const created = await repo.createAttempt({ raw_text: '正常记录' });

    await storage.writeFile(`${attemptsDirectory(UNASSIGNED_PROJECT_BUCKET)}/readme.md`, '# notes');
    await storage.writeFile(`${attemptsDirectory(UNASSIGNED_PROJECT_BUCKET)}/other.json`, '{"x":1}');
    await storage.writeFile(`${attemptsDirectory(UNASSIGNED_PROJECT_BUCKET)}/broken.json`, '{not json');

    const listed = await repo.listAttempts();
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.attempt_id, created.attempt_id);
  });
});
