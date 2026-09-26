/**
 * S01-02 §5 ｜ directory-picker helper - UNIT behaviour.
 *
 * 🔴 UNIT PASS ONLY. The runtime picker is STUBBED on `globalThis`; no real browser and no real
 *    directory is involved. 🔴 REAL BROWSER ACCEPTANCE = PENDING PSA (`PSA-03`–`PSA-06`; SP-06
 *    `S6-01` / `S6-04`–`S6-06` remain PENDING MANUAL OBSERVATION). Nothing here may be reported
 *    as a browser verification.
 *
 * Canonical AC references used by this file: AC-127 / AC-128.
 * 🔴 This file creates NO new AC.
 *
 * Contract references: §0.4 A ("只有在用户主动授权后才能访问指定 Workspace"; "未授权不得读取本地目录"),
 * `docs/DECISIONS.md` (target browsers = Chrome / Edge, Safari / Firefox support is NOT assumed).
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  BrowserWorkspaceAccessError,
  DEFAULT_WORKSPACE_PICKER_ID,
  FsaWorkspaceStorage,
  isWorkspaceDirectoryPickerSupported,
  selectWorkspaceDirectory,
} from '../../../browser/workspace/index.js';
import type { BrowserWorkspaceAccessErrorCode, FsaDirectoryHandleLike } from '../../../browser/workspace/index.js';
import { abortError, createFakeWorkspace, fileTree, securityError } from './fakes.js';

/* ------------------------------------------------------------------ *
 * Runtime stub plumbing
 * ------------------------------------------------------------------ */

interface PickerStubHost {
  showDirectoryPicker?: (options?: unknown) => Promise<unknown>;
}

function pickerHost(): PickerStubHost {
  return globalThis as unknown as PickerStubHost;
}

const REAL_PICKER = pickerHost().showDirectoryPicker;

function installPicker(picker: (options?: unknown) => Promise<unknown>): void {
  pickerHost().showDirectoryPicker = picker;
}

function uninstallPicker(): void {
  delete pickerHost().showDirectoryPicker;
}

beforeEach(() => {
  uninstallPicker();
});

afterEach(() => {
  uninstallPicker();
  if (REAL_PICKER !== undefined) {
    installPicker(REAL_PICKER);
  }
});

type ErrorPredicate = (error: unknown) => boolean;

function isAccessError(code: BrowserWorkspaceAccessErrorCode): ErrorPredicate {
  return (error) => error instanceof BrowserWorkspaceAccessError && error.code === code;
}

/* ------------------------------------------------------------------ *
 * Cases
 * ------------------------------------------------------------------ */

describe('S01-02 §5 ｜ selectWorkspaceDirectory', () => {
  it('[AC-128] the capability probe opens nothing, and an unsupported runtime fails explicitly', async () => {
    assert.equal(isWorkspaceDirectoryPickerSupported(), false);

    const error = await selectWorkspaceDirectory().then(
      () => null,
      (thrown: unknown) => thrown,
    );
    assert.ok(error instanceof BrowserWorkspaceAccessError);
    assert.equal(error.code, 'WORKSPACE_UNAVAILABLE');
    // 🔴 The refusal never degrades into "opened something else" and never reads a directory.
    assert.ok(!isWorkspaceDirectoryPickerSupported());
  });

  it('[AC-127] the picker is asked for the requested mode, and the granted handle mounts a workspace', async () => {
    const workspace = createFakeWorkspace(fileTree({ 'workspace.json': '{"schema_version":"1"}' }));
    const requested: unknown[] = [];
    installPicker((options?: unknown) => {
      requested.push(options);
      return Promise.resolve(workspace.root);
    });

    assert.equal(isWorkspaceDirectoryPickerSupported(), true);

    const picked = await selectWorkspaceDirectory();
    assert.equal(picked, workspace.root);
    assert.deepEqual(requested, [{ id: DEFAULT_WORKSPACE_PICKER_ID, mode: 'readwrite' }]);

    // The granted handle really is usable, and defaulted to a read-WRITE workspace.
    const storage = new FsaWorkspaceStorage(picked as FsaDirectoryHandleLike);
    assert.equal(storage.permissionMode, 'readwrite');
    assert.equal(await storage.readFile('workspace.json'), '{"schema_version":"1"}');
  });

  it('[AC-127] the picker id and mode are overridable, and a read-only workspace can be opened', async () => {
    const workspace = createFakeWorkspace();
    const requested: unknown[] = [];
    installPicker((options?: unknown) => {
      requested.push(options);
      return Promise.resolve(workspace.root);
    });

    await selectWorkspaceDirectory({ id: 'custom-id', mode: 'read' });
    assert.deepEqual(requested, [{ id: 'custom-id', mode: 'read' }]);
    assert.deepEqual(workspace.gate.queryModes, []);
  });

  it('[AC-127] dismissing the picker is a user CHOICE, not an error', async () => {
    installPicker(() => Promise.reject(abortError()));

    // 🔴 Nothing is mounted and nothing is reported as a failure: the user simply did not choose.
    assert.equal(await selectWorkspaceDirectory(), null);
  });

  it('[AC-127] a picker refused for lack of a user gesture is surfaced explicitly', async () => {
    installPicker(() => Promise.reject(securityError()));

    const error = await selectWorkspaceDirectory().then(
      () => null,
      (thrown: unknown) => thrown,
    );
    assert.ok(error instanceof BrowserWorkspaceAccessError);
    assert.equal(error.code, 'PERMISSION_DENIED');
    assert.equal(error.permission_mode, 'readwrite');
  });

  it('IMPLEMENTATION INVARIANT (contract §0.4 A): an unusable picker result is refused, never half-mounted', async () => {
    // An unexpected platform failure must become a clear code, not an anonymous rejection.
    installPicker(() => Promise.reject(new Error('picker exploded')));
    await assert.rejects(selectWorkspaceDirectory(), isAccessError('WORKSPACE_UNAVAILABLE'));

    // A value that is not a directory handle must be refused for the same reason.
    for (const notAHandle of [undefined, null, 42, {}, { kind: 'directory' }]) {
      installPicker(() => Promise.resolve(notAHandle));
      await assert.rejects(
        selectWorkspaceDirectory(),
        isAccessError('WORKSPACE_UNAVAILABLE'),
        `picker result ${JSON.stringify(notAHandle)} must be refused`,
      );
    }
  });
});
