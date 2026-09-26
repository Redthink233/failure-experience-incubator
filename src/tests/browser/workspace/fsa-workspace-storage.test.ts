/**
 * S01-02 §9 T1–T12 ｜ Browser File System Access Workspace Adapter - UNIT behaviour.
 *
 * 🔴 UNIT PASS ONLY. These cases drive FAKE `FileSystemDirectoryHandle` / `FileSystemFileHandle`
 *    / writable doubles (`./fakes.ts`) because Node cannot obtain a real handle. 🔴 This file does
 *    NOT claim any real browser was verified: **REAL BROWSER ACCEPTANCE = PENDING PSA**
 *    (`PSA-03`–`PSA-06`; SP-06 `S6-01` / `S6-04`–`S6-06` remain PENDING MANUAL OBSERVATION).
 *    No "Chrome verified" / "Edge verified" / "Browser FSA Verified" claim may be derived here.
 *
 * Canonical AC references used by this file:
 *   AC-76 / AC-127 / AC-128 / AC-129 / AC-130 / AC-137 / AC-138.
 * 🔴 This file creates NO new AC. Cases without a product AC are declared as
 *    `IMPLEMENTATION INVARIANT` bound to the frozen contract.
 *
 * Frozen contract sections the invariants rest on:
 *   §0.4 A (only a user-authorized directory may be touched) / §0.4 E.3 (local workspace files,
 *   no required cloud DB) / §3.2 (stable ids, rename tolerance) / §7 (archive is a state change,
 *   no physical delete) / §10.1 layer 2 (`RUNTIME`: explicit error, data preserved, retryable).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertSafeWorkspaceRelativePath,
  BrowserWorkspaceAccessError,
  createFsaWorkspaceStorage,
  FsaWorkspaceStorage,
  FSA_WORKSPACE_STORAGE_KIND,
  isSafeWorkspaceRelativePath,
  WORKSPACE_ROOT_PATH,
} from '../../../browser/workspace/index.js';
import type {
  BrowserWorkspaceAccessErrorCode,
  FsaDirectoryHandleLike,
  FsaNativeMove,
} from '../../../browser/workspace/index.js';
import { WorkspaceStorageError } from '../../../workspace/storage.js';
import type {
  WorkspaceEntry,
  WorkspaceStorage,
  WorkspaceStorageErrorCode,
} from '../../../workspace/storage.js';
import type { AssertTrue, HasNoKey } from '../../domain/type-assertions.js';
import {
  contentsAt,
  createFakeWorkspace,
  directoryNode,
  fileNode,
  fileTree,
  lookupCount,
  notAllowedError,
} from './fakes.js';

/* ------------------------------------------------------------------ *
 * T12 - compile-time contract (checked by `npm run typecheck`, not at runtime)
 * ------------------------------------------------------------------ */

/** 🔴 The adapter must BE a `WorkspaceStorage`, not merely resemble one. */
export type FsaAdapterSatisfiesWorkspaceStorage = AssertTrue<
  FsaWorkspaceStorage extends WorkspaceStorage ? true : false
>;

/** 🔴 No delete-shaped member may exist anywhere on the adapter (AC-76 / AC-138). */
export type FsaAdapterExposesNoDeleteMember = AssertTrue<
  HasNoKey<FsaWorkspaceStorage, 'delete' | 'remove' | 'unlink' | 'rm' | 'purge' | 'erase' | 'trash'>
>;

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

type ErrorPredicate = (error: unknown) => boolean;

function isAccessError(code: BrowserWorkspaceAccessErrorCode): ErrorPredicate {
  return (error) => error instanceof BrowserWorkspaceAccessError && error.code === code;
}

function isStorageError(code: WorkspaceStorageErrorCode): ErrorPredicate {
  return (error) => error instanceof WorkspaceStorageError && error.code === code;
}

/** `list` order is deliberately unspecified, so comparisons sort first. */
function sortedEntries(entries: readonly WorkspaceEntry[]): readonly string[] {
  return entries.map((entry) => `${entry.kind}:${entry.name}`).sort();
}

const WORKSPACE_JSON = 'workspace.json';
const SIDECAR = 'projects/PRJ_ALPHA/attempts/ATT_0000000000000000000000000A.json';

/* ------------------------------------------------------------------ *
 * T1 - permission denied must not read anything
 * ------------------------------------------------------------------ */

describe('S01-02 T1-T2 ｜ permission boundary before any access', () => {
  it('[AC-128] T1 permission denied: every operation fails and NOTHING is looked up', async () => {
    const workspace = createFakeWorkspace(
      { [WORKSPACE_JSON]: fileNode('{"schema_version":"1"}'), projects: directoryNode() },
      { state: 'denied' },
    );
    const storage = new FsaWorkspaceStorage(workspace.root);

    await assert.rejects(storage.exists(WORKSPACE_JSON), isAccessError('PERMISSION_DENIED'));
    await assert.rejects(storage.readFile(WORKSPACE_JSON), isAccessError('PERMISSION_DENIED'));
    await assert.rejects(storage.list(''), isAccessError('PERMISSION_DENIED'));
    await assert.rejects(storage.writeFile(WORKSPACE_JSON, 'x'), isAccessError('PERMISSION_DENIED'));
    await assert.rejects(storage.move(WORKSPACE_JSON, 'other.json'), isAccessError('PERMISSION_DENIED'));

    // 🔴 The proof: a denied operation never even enumerated the directory.
    assert.equal(lookupCount(workspace.probe), 0);
    assert.equal(workspace.probe.createWritable, 0);
    assert.equal(workspace.probe.write, 0);
    // ... and the stored content is untouched.
    assert.equal(contentsAt(workspace.rootNode, WORKSPACE_JSON), '{"schema_version":"1"}');

    // The permission failure describes the ROOT, not a path, and is still a clear failure.
    const error = await storage.readFile(WORKSPACE_JSON).then(
      () => null,
      (thrown: unknown) => thrown as BrowserWorkspaceAccessError,
    );
    assert.ok(error !== null);
    assert.equal(error.path, WORKSPACE_ROOT_PATH);
    assert.equal(error.permission_mode, 'read');
  });

  it('[AC-128] T1b not asked yet is PERMISSION_REQUIRED, never reported as a denial', async () => {
    const workspace = createFakeWorkspace({ 'a.txt': fileNode('a') }, { state: 'prompt' });
    const storage = new FsaWorkspaceStorage(workspace.root);

    await assert.rejects(storage.readFile('a.txt'), isAccessError('PERMISSION_REQUIRED'));
    assert.equal(lookupCount(workspace.probe), 0);

    // A state the platform never documented must FAIL CLOSED, not be read as a grant.
    workspace.gate.state = 'something-new' as unknown as 'granted';
    assert.equal(await storage.queryPermission('read'), 'prompt');
    await assert.rejects(storage.readFile('a.txt'), isAccessError('PERMISSION_REQUIRED'));
  });

  it('[AC-129] T2 permission granted: the read succeeds and the permission is re-queried per operation', async () => {
    const workspace = createFakeWorkspace(fileTree({ [SIDECAR]: '{"object_type":"Attempt"}' }));
    const storage = createFsaWorkspaceStorage(workspace.root);

    assert.equal(await storage.exists(SIDECAR), true);
    assert.equal(await storage.readFile(SIDECAR), '{"object_type":"Attempt"}');

    // 🔴 A grant is NOT cached from construction: each operation re-checks the live state.
    assert.deepEqual(workspace.gate.queryModes, ['read', 'read']);
    assert.equal(await storage.hasPermission('readwrite'), true);
    assert.deepEqual(workspace.gate.queryModes, ['read', 'read', 'readwrite']);
  });
});

/* ------------------------------------------------------------------ *
 * T3 / T4 - write and update
 * ------------------------------------------------------------------ */

describe('S01-02 T3-T4 ｜ write semantics', () => {
  it('[AC-129] T3 writeFile creates the file and its missing parents, then commits on close', async () => {
    const workspace = createFakeWorkspace();
    const storage = new FsaWorkspaceStorage(workspace.root);

    await storage.writeFile(SIDECAR, '{"a":1}');

    assert.equal(contentsAt(workspace.rootNode, SIDECAR), '{"a":1}');
    assert.equal(await storage.exists('projects/PRJ_ALPHA/attempts'), true);
    assert.equal(workspace.probe.createWritable, 1);
    assert.equal(workspace.probe.write, 1);
    assert.equal(workspace.probe.close, 1);
    assert.equal(workspace.probe.abort, 0);
    assert.equal(workspace.probe.lastWritable?.closed, true);
  });

  it('[AC-129] T4 writeFile REPLACES an existing file (explicit truncating create-write-close)', async () => {
    const workspace = createFakeWorkspace({ 'a.txt': fileNode('OLD-CONTENT-THAT-MUST-VANISH') });
    const storage = new FsaWorkspaceStorage(workspace.root);

    await storage.writeFile('a.txt', 'NEW');

    const stored = contentsAt(workspace.rootNode, 'a.txt');
    assert.equal(stored, 'NEW');
    assert.ok(stored !== null && !stored.includes('OLD'));
    // 🔴 The truncating replace is requested explicitly rather than left to a default.
    assert.deepEqual(workspace.probe.lastCreateWritableOptions, { keepExistingData: false });
  });

  it('IMPLEMENTATION INVARIANT (contract §frozen storage contract): writeFile refuses the root and a directory', async () => {
    const workspace = createFakeWorkspace({ projects: directoryNode() });
    const storage = new FsaWorkspaceStorage(workspace.root);

    await assert.rejects(storage.writeFile('', 'x'), isStorageError('INVALID_PATH'));
    await assert.rejects(storage.writeFile('projects', 'x'), isStorageError('INVALID_PATH'));
    assert.equal(workspace.probe.createWritable, 0);
  });
});

/* ------------------------------------------------------------------ *
 * T5 / T6 - listing and nested paths
 * ------------------------------------------------------------------ */

describe('S01-02 T5-T6 ｜ listing and nested resolution', () => {
  it('[AC-129] T5 list reports the immediate children and their kinds', async () => {
    const workspace = createFakeWorkspace({
      [WORKSPACE_JSON]: fileNode('{}'),
      projects: directoryNode({
        PRJ_ALPHA: directoryNode({ attempts: directoryNode({ 'a.json': fileNode('{}') }) }),
      }),
    });
    const storage = new FsaWorkspaceStorage(workspace.root);

    assert.deepEqual(sortedEntries(await storage.list('')), [
      'directory:projects',
      `file:${WORKSPACE_JSON}`,
    ]);
    // Immediate children only - never a recursive walk.
    assert.deepEqual(sortedEntries(await storage.list('projects')), ['directory:PRJ_ALPHA']);
    assert.deepEqual(sortedEntries(await storage.list('projects/PRJ_ALPHA/attempts')), ['file:a.json']);
    assert.equal(workspace.probe.values, 3);
  });

  it('[AC-137] T6 nested paths resolve segment by segment, and identity stays in the CONTENT', async () => {
    const workspace = createFakeWorkspace();
    const storage = new FsaWorkspaceStorage(workspace.root);

    await storage.writeFile(SIDECAR, '{"attempt_id":"ATT_0000000000000000000000000A"}');
    await storage.writeFile('projects/PRJ_ALPHA/attempts/ATT_0000000000000000000000000B.json', '{"attempt_id":"ATT_B"}');

    assert.equal(await storage.exists(SIDECAR), true);
    assert.equal(
      await storage.readFile('projects/PRJ_ALPHA/attempts/ATT_0000000000000000000000000B.json'),
      '{"attempt_id":"ATT_B"}',
    );
    // The two siblings are distinct objects even though only the file NAME differs.
    assert.notEqual(contentsAt(workspace.rootNode, SIDECAR), contentsAt(workspace.rootNode, 'projects/PRJ_ALPHA/attempts/ATT_0000000000000000000000000B.json'));
    assert.equal(await storage.exists('projects/PRJ_ALPHA/attempts/ATT_MISSING.json'), false);
  });
});

/* ------------------------------------------------------------------ *
 * T7 - path security
 * ------------------------------------------------------------------ */

describe('S01-02 T7 ｜ path security', () => {
  it('[AC-128] T7 traversal, absolute paths, backslashes and segment aliasing are refused untouched', async () => {
    const workspace = createFakeWorkspace({ 'a.txt': fileNode('hi') });
    const storage = new FsaWorkspaceStorage(workspace.root);

    const refused = [
      '../secrets.json',
      'projects/../../escape.json',
      '/etc/passwd',
      'C:\\Users\\other\\file.json',
      'a\\b.json',
      'a/./b.json',
      'a//b.json',
      './a.json',
    ];

    for (const path of refused) {
      assert.equal(isSafeWorkspaceRelativePath(path), false, `${path} must be unsafe`);
      await assert.rejects(storage.exists(path), isStorageError('INVALID_PATH'), path);
      await assert.rejects(storage.readFile(path), isStorageError('INVALID_PATH'), path);
      await assert.rejects(storage.writeFile(path, 'x'), isStorageError('INVALID_PATH'), path);
      await assert.rejects(storage.list(path), isStorageError('INVALID_PATH'), path);
      await assert.rejects(storage.move(path, 'ok.json'), isStorageError('INVALID_PATH'), path);
      await assert.rejects(storage.move('a.txt', path), isStorageError('INVALID_PATH'), path);
    }

    // 🔴 Nothing was looked up and nothing was written for ANY refused path.
    assert.equal(lookupCount(workspace.probe), 0);
    assert.equal(workspace.probe.createWritable, 0);
    assert.equal(contentsAt(workspace.rootNode, 'a.txt'), 'hi');

    // The legal surface still works, including the root for readers.
    assert.equal(isSafeWorkspaceRelativePath('projects/PRJ/attempts/a.json'), true);
    assert.equal(isSafeWorkspaceRelativePath(''), true);
    assert.doesNotThrow(() => assertSafeWorkspaceRelativePath(SIDECAR));
    assert.equal(await storage.exists(''), true);
  });
});

/* ------------------------------------------------------------------ *
 * T8 - revocation
 * ------------------------------------------------------------------ */

describe('S01-02 T8 ｜ permission revocation', () => {
  it('[AC-128] T8a revocation between operations stops the next operation without crashing', async () => {
    const workspace = createFakeWorkspace({ 'a.txt': fileNode('hi') });
    const storage = new FsaWorkspaceStorage(workspace.root);
    assert.equal(await storage.readFile('a.txt'), 'hi');

    workspace.gate.state = 'denied';

    await assert.rejects(storage.readFile('a.txt'), isAccessError('PERMISSION_DENIED'));
    await assert.rejects(storage.writeFile('a.txt', 'clobbered'), isAccessError('PERMISSION_DENIED'));
    await assert.rejects(storage.list(''), isAccessError('PERMISSION_DENIED'));
    // 🔴 A previously granted handle is NEVER trusted again, and no data changed.
    assert.equal(contentsAt(workspace.rootNode, 'a.txt'), 'hi');
    assert.equal(workspace.probe.write, 0);
  });

  it('[AC-127] T8b revocation mid-operation becomes a clear PERMISSION_DENIED, not a crash', async () => {
    const workspace = createFakeWorkspace({ 'a.txt': fileNode('hi') });
    const storage = new FsaWorkspaceStorage(workspace.root);

    // `queryPermission` still answers "granted", then the platform refuses the lookup itself -
    // exactly the race a revoked permission produces.
    workspace.root.failNextLookupWith = notAllowedError();
    const before = lookupCount(workspace.probe);

    const error = await storage.readFile('a.txt').then(
      () => null,
      (thrown: unknown) => thrown,
    );

    assert.ok(error instanceof BrowserWorkspaceAccessError, 'a structured error must be raised');
    assert.equal(error.code, 'PERMISSION_DENIED');
    assert.equal(error.path, 'a.txt');
    assert.equal(lookupCount(workspace.probe), before + 1);
    assert.equal(contentsAt(workspace.rootNode, 'a.txt'), 'hi');
  });

  it('[AC-127] T9 an explicit re-authorization makes the SAME adapter usable again', async () => {
    const workspace = createFakeWorkspace({ 'a.txt': fileNode('hi') }, { state: 'prompt' });
    const storage = new FsaWorkspaceStorage(workspace.root);

    await assert.rejects(storage.readFile('a.txt'), isAccessError('PERMISSION_REQUIRED'));
    assert.equal(lookupCount(workspace.probe), 0);

    workspace.gate.requestResult = 'granted';
    assert.equal(await storage.requestPermission('readwrite'), 'granted');
    assert.deepEqual(workspace.gate.requestModes, ['readwrite']);

    assert.equal(await storage.readFile('a.txt'), 'hi');
    await storage.writeFile('a.txt', 'bye');
    assert.equal(contentsAt(workspace.rootNode, 'a.txt'), 'bye');
  });

  it('[AC-127] T9b a refused re-authorization is reported, and the adapter stays unusable', async () => {
    const workspace = createFakeWorkspace({ 'a.txt': fileNode('hi') }, { state: 'prompt' });
    const storage = new FsaWorkspaceStorage(workspace.root);

    workspace.gate.requestResult = 'denied';
    assert.equal(await storage.requestPermission('read'), 'denied');
    assert.equal(await storage.hasPermission('read'), false);
    await assert.rejects(storage.readFile('a.txt'), isAccessError('PERMISSION_DENIED'));
    assert.equal(lookupCount(workspace.probe), 0);
  });
});

/* ------------------------------------------------------------------ *
 * T10 / T11 - explicit errors, no false success
 * ------------------------------------------------------------------ */

describe('S01-02 T10-T11 ｜ explicit failures', () => {
  it('IMPLEMENTATION INVARIANT (frozen WorkspaceStorage error vocabulary): missing and wrong-kind entries fail explicitly', async () => {
    const workspace = createFakeWorkspace({
      'a.txt': fileNode('hi'),
      projects: directoryNode(),
    });
    const storage = new FsaWorkspaceStorage(workspace.root);

    // T10 - not found.
    await assert.rejects(storage.readFile('missing.json'), isStorageError('NOT_FOUND'));
    await assert.rejects(storage.list('missing'), isStorageError('NOT_FOUND'));
    await assert.rejects(storage.move('missing.json', 'other.json'), isStorageError('NOT_FOUND'));

    // Wrong kind - the in-memory double's semantics are mirrored exactly.
    await assert.rejects(storage.readFile('projects'), isStorageError('NOT_A_FILE'));
    await assert.rejects(storage.list('a.txt'), isStorageError('NOT_A_DIRECTORY'));

    // A file may only ever be the FINAL segment: `a.txt/b` does not exist.
    assert.equal(await storage.exists('a.txt/anything.json'), false);

    // `move` refuses to overwrite an existing target (ids are never reused, §3.2 rule 1).
    await assert.rejects(storage.move('a.txt', 'projects'), isStorageError('ALREADY_EXISTS'));
    assert.equal(contentsAt(workspace.rootNode, 'a.txt'), 'hi');
  });

  it('IMPLEMENTATION INVARIANT (contract §10.1 layer 2): a failing write is never reported as success', async () => {
    const workspace = createFakeWorkspace({ 'a.txt': fileNode('ORIGINAL') });
    const storage = new FsaWorkspaceStorage(workspace.root);

    // T11 (a) - the stream refuses the write.
    workspace.probe.failNextWriteWith = new Error('disk full');
    await assert.rejects(storage.writeFile('a.txt', 'PARTIAL'), isAccessError('WORKSPACE_UNAVAILABLE'));
    assert.equal(workspace.probe.write, 1);
    assert.equal(workspace.probe.close, 0);
    assert.equal(workspace.probe.abort, 1);
    assert.equal(workspace.probe.lastWritable?.aborted, true);
    assert.equal(contentsAt(workspace.rootNode, 'a.txt'), 'ORIGINAL');

    // T11 (b) - the commit itself fails, so nothing must become visible.
    workspace.probe.failNextCloseWith = new Error('commit failed');
    await assert.rejects(storage.writeFile('a.txt', 'STILL-NOT-COMMITTED'), isAccessError('WORKSPACE_UNAVAILABLE'));
    assert.equal(contentsAt(workspace.rootNode, 'a.txt'), 'ORIGINAL');
  });
});

/* ------------------------------------------------------------------ *
 * T12 - contract conformance at runtime, and the missing `move`
 * ------------------------------------------------------------------ */

describe('S01-02 T12 ｜ storage contract conformance', () => {
  it('IMPLEMENTATION INVARIANT (frozen WorkspaceStorage contract): the adapter IS the contract and exposes no delete (AC-76)', () => {
    const workspace = createFakeWorkspace();
    const storage: WorkspaceStorage = new FsaWorkspaceStorage(workspace.root);

    assert.equal(storage.kind, FSA_WORKSPACE_STORAGE_KIND);
    assert.equal(storage.kind, 'fsa-directory');
    for (const member of ['exists', 'readFile', 'writeFile', 'list', 'move']) {
      assert.equal(typeof (storage as unknown as Record<string, unknown>)[member], 'function', member);
    }
    // 🔴 No delete entry point exists anywhere on the adapter (AC-76 / AC-138).
    for (const forbidden of ['delete', 'deleteFile', 'remove', 'unlink', 'rm', 'purge', 'erase', 'trash', 'removeEntry']) {
      assert.ok(!(forbidden in storage), `the adapter must not expose "${forbidden}"`);
    }
    assert.equal(new FsaWorkspaceStorage(workspace.root).directoryName, 'fake-workspace');
  });

  it('IMPLEMENTATION INVARIANT (frozen WorkspaceStorage contract): a non-directory handle is refused explicitly', () => {
    for (const notAHandle of [null, undefined, 42, 'workspace', {}, { kind: 'directory' }]) {
      assert.throws(
        () => new FsaWorkspaceStorage(notAHandle as unknown as FsaDirectoryHandleLike),
        isAccessError('WORKSPACE_UNAVAILABLE'),
      );
    }
  });

  it('[AC-76][AC-138] MOVE/RENAME LIMITATION: without a native browser move the adapter fails explicitly and changes NOTHING', async () => {
    const workspace = createFakeWorkspace({ 'a.txt': fileNode('hi') });
    const storage = new FsaWorkspaceStorage(workspace.root);

    const error = await storage.move('a.txt', 'b.txt').then(
      () => null,
      (thrown: unknown) => thrown,
    );
    assert.ok(error instanceof BrowserWorkspaceAccessError);
    assert.equal(error.code, 'MOVE_UNSUPPORTED_BY_BROWSER');
    assert.equal(error.path, 'a.txt');

    // 🔴 No copy, no delete, no duplicate: the old file is intact and the new one absent.
    assert.equal(contentsAt(workspace.rootNode, 'a.txt'), 'hi');
    assert.equal(await storage.exists('b.txt'), false);
    assert.equal(workspace.probe.createWritable, 0);
    assert.equal(workspace.probe.write, 0);
    // 🔴 The adapter never even reaches for a delete API.
    assert.equal(workspace.probe.nativeMove, 0);
  });

  it('[AC-76][AC-138] MOVE/RENAME LIMITATION: when the platform DOES expose a native move it is used, still without any delete', async () => {
    const calls: Array<{ readonly destinationName: string; readonly newName: string | undefined }> = [];
    const nativeMove: FsaNativeMove = async (destination, newName) => {
      calls.push({ destinationName: destination.name, newName });
    };
    const workspace = createFakeWorkspace(
      { projects: directoryNode({ PRJ_ALPHA: directoryNode({ attempts: directoryNode({ 'a.json': fileNode('{}') }) }) }) },
      { nativeMove },
    );
    const storage = new FsaWorkspaceStorage(workspace.root);

    await storage.move('projects/PRJ_ALPHA/attempts/a.json', 'projects/PRJ_ALPHA/attempts/renamed.json');

    assert.deepEqual(calls, [{ destinationName: 'attempts', newName: 'renamed.json' }]);
    assert.equal(workspace.probe.nativeMove, 1);
    // Still no copy / no write / no delete on the adapter's side.
    assert.equal(workspace.probe.createWritable, 0);
    assert.equal(workspace.probe.write, 0);

    // The `ALREADY_EXISTS` / `NOT_FOUND` preflights hold on this path as well.
    await assert.rejects(
      storage.move('projects/PRJ_ALPHA/attempts/a.json', 'projects/PRJ_ALPHA/attempts/a.json'),
      isStorageError('ALREADY_EXISTS'),
    );
    await assert.rejects(
      storage.move('projects/PRJ_ALPHA/attempts/missing.json', 'projects/PRJ_ALPHA/attempts/x.json'),
      isStorageError('NOT_FOUND'),
    );
  });
});
