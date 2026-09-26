/**
 * REAL browser File System Access implementation of the frozen `WorkspaceStorage` contract
 * (`M2` / S01-02).
 *
 * It implements the abstraction from `src/workspace/storage.ts` verbatim; that file and the
 * whole `src/workspace/**` layer are READ-ONLY for this task (CODING_START_HANDOFF §0.2).
 *
 * 🔴 Position: this is the browser runtime location `src/browser/workspace/**`. The historical
 *    `src/workspace/adapter/**` path is SUPERSEDED BY `S01-W1-PREP` and is deliberately not used.
 *
 * 🔴 NO DELETE. Neither this class nor the whole `src/browser/workspace/**` tree exposes or can
 *    even type-check a physical delete: `removeEntry()` is not declared in `fsa-types.ts`, the
 *    frozen contract has no `delete` / `remove` / `unlink` member (AC-76), archiving is a state
 *    change only (contract §7.3 / AC-138), and an archived object stays in the workspace.
 *
 * 🔴 PERMISSION IS A PRECONDITION OF EVERY OPERATION, not a one-time door prize. A handle that
 *    was authorized earlier is re-checked on EVERY call, so a revoked permission stops the very
 *    next read/write instead of being trusted forever (AC-127 / AC-128). Before authorization
 *    nothing is enumerated: `exists` / `readFile` / `list` all consult the permission API first.
 *
 * 🔴 Absolute paths, `..` segments and backslash escaping are refused by REUSING the frozen
 *    `assertValidWorkspacePath` (see `path-safety.ts`), so no arbitrary host path can be reached.
 *
 * Error mapping (task §4): permission failures become `BrowserWorkspaceAccessError`
 * (`PERMISSION_DENIED` / `PERMISSION_REQUIRED` / `WORKSPACE_UNAVAILABLE`); everything the frozen
 * abstraction already models (`INVALID_PATH` / `NOT_FOUND` / `NOT_A_DIRECTORY` / `NOT_A_FILE` /
 * `ALREADY_EXISTS`) keeps throwing `WorkspaceStorageError`, so the repository's behaviour is
 * unchanged. No failure path ever reports success, and no failure path crashes.
 *
 * 🔴 Move / rename: the stable File System Access API has NO move operation, and simulating one
 *    would require a physical delete - which V1 does not have. `move()` therefore
 *    feature-detects a NON-STANDARD native move and otherwise fails EXPLICITLY with
 *    `MOVE_UNSUPPORTED_BY_BROWSER`. It never copies (a copy would leave two files declaring the
 *    same internal object id, which §3.2 rule 1 treats as workspace corruption).
 *
 * References: contract §0.4 A / §0.4 E.3 (local workspace files, no cloud DB) / §3.2 / §7 /
 * §10.1 layer 2, AC-76 / AC-127 / AC-128 / AC-129 / AC-130 / AC-137 / AC-138, Gate C Plan §I.2.
 */

import {
  baseNameOfWorkspacePath,
  parentWorkspacePath,
  WorkspaceStorageError,
} from '../../workspace/storage.js';
import type { WorkspaceEntry, WorkspaceStorage } from '../../workspace/storage.js';
import { errorNameOf, isDirectoryHandleLike, normalizePermissionState } from './fsa-runtime.js';
import type {
  FsaDirectoryHandleLike,
  FsaFileHandleLike,
  FsaNativeMove,
  FsaPermissionMode,
  FsaPermissionState,
  FsaWritableStreamLike,
} from './fsa-types.js';
import { assertSafeWorkspaceRelativePath } from './path-safety.js';
import { BrowserWorkspaceAccessError, WORKSPACE_ROOT_PATH } from './workspace-access-error.js';

const PATH_SEPARATOR = '/';

/** Implementation tag required by the `WorkspaceStorage` contract. */
export const FSA_WORKSPACE_STORAGE_KIND = 'fsa-directory';

export interface FsaWorkspaceStorageOptions {
  /** The permission mode requested by default: `readwrite` (default) or `read`. */
  readonly mode?: FsaPermissionMode;
}

/** What a workspace-relative path resolves to inside the authorized directory tree. */
type PathResolution =
  | { readonly kind: 'directory'; readonly handle: FsaDirectoryHandleLike }
  | { readonly kind: 'file'; readonly handle: FsaFileHandleLike }
  | { readonly kind: 'missing' };

function segmentsOf(path: string): readonly string[] {
  return path.length === 0 ? [] : path.split(PATH_SEPARATOR);
}

/** `NotFoundError` is how the File System Access API reports "no such child". */
function isNotFoundError(error: unknown): boolean {
  return errorNameOf(error) === 'NotFoundError';
}

/**
 * "The name exists, but as the OTHER kind" - a directory name passed to `getFileHandle()` or
 * vice versa. Reported as `TypeMismatchError` by the current spec and as a `TypeError` by older
 * Chromium builds, so both are accepted.
 */
function isWrongKindError(error: unknown): boolean {
  return error instanceof TypeError || errorNameOf(error) === 'TypeMismatchError';
}

/**
 * Maps a browser runtime failure onto the structured error vocabulary.
 *
 * `NotAllowedError` / `SecurityError` raised by an operation after `queryPermission()` said
 * `granted` is exactly the "permission was revoked while working" case: it must become a clear
 * `PERMISSION_DENIED` and must never be swallowed or turned into an empty result (task §2.I).
 */
function throwMappedRuntimeError(error: unknown, path: string, operation: string): never {
  const name = errorNameOf(error);

  if (name === 'NotAllowedError' || name === 'SecurityError') {
    throw new BrowserWorkspaceAccessError('PERMISSION_DENIED', path, {
      original_error: error,
      message:
        `The browser refused "${operation}" for "${path === '' ? 'the workspace root' : path}": ` +
        'authorization was revoked or is no longer sufficient. Nothing was read or written and ' +
        'no existing data was modified.',
    });
  }

  if (name === 'NotFoundError') {
    throw new WorkspaceStorageError(
      'NOT_FOUND',
      path,
      `${operation} failed: "${path}" was not found in the workspace.`,
    );
  }

  throw new BrowserWorkspaceAccessError('WORKSPACE_UNAVAILABLE', path, {
    original_error: error,
    message:
      `"${operation}" failed for "${path === '' ? 'the workspace root' : path}" because the ` +
      'workspace is not reachable in this runtime. Nothing was read or written.',
  });
}

/** Best-effort `abort()`. A failing abort must never mask the real failure. */
async function abortQuietly(writable: FsaWritableStreamLike): Promise<void> {
  const abort = writable.abort;
  if (typeof abort !== 'function') {
    return;
  }
  try {
    await abort.call(writable);
  } catch {
    // Intentionally ignored: the write failure stays the reported failure, and a failed write is
    // never reported as a success.
  }
}

export class FsaWorkspaceStorage implements WorkspaceStorage {
  readonly kind: string = FSA_WORKSPACE_STORAGE_KIND;

  private readonly root: FsaDirectoryHandleLike;
  private readonly mode: FsaPermissionMode;

  /**
   * @param root a directory handle that a user gesture already authorized. The handle IS the
   *        authorization boundary: this adapter can never reach anything outside it.
   */
  constructor(root: FsaDirectoryHandleLike, options: FsaWorkspaceStorageOptions = {}) {
    if (!isDirectoryHandleLike(root)) {
      throw new BrowserWorkspaceAccessError('WORKSPACE_UNAVAILABLE', WORKSPACE_ROOT_PATH, {
        message:
          'The supplied value does not implement the File System Access directory contract, so ' +
          'it cannot be mounted as a workspace. Nothing was read or written.',
      });
    }
    this.root = root;
    this.mode = options.mode ?? 'readwrite';
  }

  /** Name of the authorized directory. Convenience for the App Shell; carries no identity. */
  get directoryName(): string {
    return this.root.name;
  }

  /** The permission mode this adapter requests by default. */
  get permissionMode(): FsaPermissionMode {
    return this.mode;
  }

  /* ------------------------------------------------------------------ *
   * Permission lifecycle
   * ------------------------------------------------------------------ */

  /** NEVER throws for a denial: it reports the state so the UI can explain it (§10.1 layer 2). */
  async queryPermission(mode: FsaPermissionMode = this.mode): Promise<FsaPermissionState> {
    try {
      return normalizePermissionState(await this.root.queryPermission({ mode }));
    } catch (error) {
      throwMappedRuntimeError(error, WORKSPACE_ROOT_PATH, 'queryPermission');
    }
  }

  /**
   * Asks the browser to (re-)grant access. Must be invoked from a user gesture.
   * A granted result makes the adapter usable again without re-creating it (task §2.J).
   */
  async requestPermission(mode: FsaPermissionMode = this.mode): Promise<FsaPermissionState> {
    try {
      return normalizePermissionState(await this.root.requestPermission({ mode }));
    } catch (error) {
      throwMappedRuntimeError(error, WORKSPACE_ROOT_PATH, 'requestPermission');
    }
  }

  async hasPermission(mode: FsaPermissionMode = this.mode): Promise<boolean> {
    return (await this.queryPermission(mode)) === 'granted';
  }

  /** Re-checks the live state on EVERY operation - a stale grant is never trusted. */
  private async requirePermission(mode: FsaPermissionMode): Promise<void> {
    const state = await this.queryPermission(mode);
    if (state === 'granted') {
      return;
    }
    if (state === 'denied') {
      throw new BrowserWorkspaceAccessError('PERMISSION_DENIED', WORKSPACE_ROOT_PATH, {
        permission_mode: mode,
      });
    }
    throw new BrowserWorkspaceAccessError('PERMISSION_REQUIRED', WORKSPACE_ROOT_PATH, {
      permission_mode: mode,
    });
  }

  /* ------------------------------------------------------------------ *
   * WorkspaceStorage
   * ------------------------------------------------------------------ */

  async exists(path: string): Promise<boolean> {
    assertSafeWorkspaceRelativePath(path);
    await this.requirePermission('read');
    return (await this.resolve(path)).kind !== 'missing';
  }

  async readFile(path: string): Promise<string> {
    assertSafeWorkspaceRelativePath(path);
    await this.requirePermission('read');

    const resolution = await this.resolve(path);
    if (resolution.kind === 'missing') {
      throw new WorkspaceStorageError('NOT_FOUND', path);
    }
    if (resolution.kind === 'directory') {
      throw new WorkspaceStorageError('NOT_A_FILE', path, `"${path}" is a directory.`);
    }

    try {
      const file = await resolution.handle.getFile();
      return await file.text();
    } catch (error) {
      throwMappedRuntimeError(error, path, 'readFile');
    }
  }

  async writeFile(path: string, contents: string): Promise<void> {
    if (path.length === 0) {
      throw new WorkspaceStorageError('INVALID_PATH', path);
    }
    assertSafeWorkspaceRelativePath(path);
    await this.requirePermission('readwrite');

    const resolution = await this.resolve(path);
    if (resolution.kind === 'directory') {
      throw new WorkspaceStorageError('INVALID_PATH', path, `"${path}" is a directory.`);
    }

    const fileHandle =
      resolution.kind === 'file' ? resolution.handle : await this.createFileHandle(path);

    /*
     * Explicit create -> truncate -> write -> close (task §7). `keepExistingData: false` is
     * stated rather than left to the default so that the truncating replace is visible here:
     * the stream opens against an emptied file, then the complete new contents are written and
     * committed by `close()`.
     */
    const writable = await this.openWritable(fileHandle, path);
    try {
      await writable.write(contents);
      await writable.close();
    } catch (error) {
      await abortQuietly(writable);
      throwMappedRuntimeError(error, path, 'writeFile');
    }
  }

  async list(path: string): Promise<readonly WorkspaceEntry[]> {
    assertSafeWorkspaceRelativePath(path);
    await this.requirePermission('read');

    const resolution = await this.resolve(path);
    if (resolution.kind === 'file') {
      throw new WorkspaceStorageError('NOT_A_DIRECTORY', path);
    }
    if (resolution.kind === 'missing') {
      throw new WorkspaceStorageError('NOT_FOUND', path);
    }

    const entries: WorkspaceEntry[] = [];
    try {
      for await (const child of resolution.handle.values()) {
        entries.push({ name: child.name, kind: child.kind });
      }
    } catch (error) {
      throwMappedRuntimeError(error, path, 'list');
    }
    // Order is whatever the underlying directory reports: the contract fixes no ordering, so
    // consumers must sort rather than rely on it.
    return entries;
  }

  /**
   * Renames / moves a file or a whole directory subtree.
   *
   * 🔴 TECHNICAL LIMITATION - the stable File System Access API exposes no move/rename on
   *    `FileSystemFileHandle` / `FileSystemDirectoryHandle`. This implementation:
   *      ① feature-detects a NON-STANDARD native `move` and uses it, so the operation works
   *         natively IF a future / experimental implementation provides one (no delete needed);
   *      ② otherwise fails EXPLICITLY with `MOVE_UNSUPPORTED_BY_BROWSER`.
   *    It deliberately does NOT read-old/write-new: simulating the move would leave the old file
   *    in place, i.e. two physical objects declaring the same internal id, which §3.2 rule 1
   *    treats as workspace corruption (`DUPLICATE_OBJECT_ID`). It also never deletes, because V1
   *    has no physical delete at all (AC-76 / AC-138).
   */
  async move(fromPath: string, toPath: string): Promise<void> {
    if (fromPath.length === 0 || toPath.length === 0) {
      throw new WorkspaceStorageError('INVALID_PATH', fromPath);
    }
    assertSafeWorkspaceRelativePath(fromPath);
    assertSafeWorkspaceRelativePath(toPath);
    await this.requirePermission('readwrite');

    const source = await this.resolve(fromPath);
    if (source.kind === 'missing') {
      throw new WorkspaceStorageError('NOT_FOUND', fromPath);
    }
    if ((await this.resolve(toPath)).kind !== 'missing') {
      throw new WorkspaceStorageError('ALREADY_EXISTS', toPath);
    }

    const sourceHandle: FsaFileHandleLike | FsaDirectoryHandleLike = source.handle;
    const nativeMove: FsaNativeMove | undefined = sourceHandle.move;

    if (nativeMove === undefined) {
      throw new BrowserWorkspaceAccessError('MOVE_UNSUPPORTED_BY_BROWSER', fromPath, {
        message:
          `The browser File System Access API cannot move or rename "${fromPath}" to "${toPath}". ` +
          'The stable API exposes no native move on a file or directory handle, and V1 has no ' +
          'physical delete, so the old file was NOT removed and the new one was NOT written: ' +
          'nothing was copied, nothing was deleted and no duplicate object id was left behind. ' +
          'The upper layer keeps the existing dual-file path strategy instead.',
      });
    }

    const destinationParent = await this.ensureDirectory(parentWorkspacePath(toPath));
    try {
      await nativeMove.call(sourceHandle, destinationParent, baseNameOfWorkspacePath(toPath));
    } catch (error) {
      throwMappedRuntimeError(error, fromPath, 'move');
    }
  }

  /* ------------------------------------------------------------------ *
   * Internals
   * ------------------------------------------------------------------ */

  /** Filesystem-like lookup mirroring the in-memory double's semantics exactly. */
  private async resolve(path: string): Promise<PathResolution> {
    const segments = segmentsOf(path);
    let current: FsaDirectoryHandleLike = this.root;

    for (const [index, segment] of segments.entries()) {
      const isLast = index === segments.length - 1;

      const directory = await this.childDirectory(current, segment, false, path);
      if (directory !== null) {
        current = directory;
        continue;
      }

      const file = await this.childFile(current, segment, false, path);
      if (file !== null) {
        // A file may only be the FINAL segment; `a/b` with `a` being a file does not exist.
        return isLast ? { kind: 'file', handle: file } : { kind: 'missing' };
      }

      return { kind: 'missing' };
    }

    return { kind: 'directory', handle: current };
  }

  /** Walks `path` creating missing directories (`''` = root). Used by writers only. */
  private async ensureDirectory(path: string): Promise<FsaDirectoryHandleLike> {
    let current: FsaDirectoryHandleLike = this.root;
    for (const segment of segmentsOf(path)) {
      const next = await this.childDirectory(current, segment, true, path);
      if (next === null) {
        throw new BrowserWorkspaceAccessError('WORKSPACE_UNAVAILABLE', path, {
          message:
            `The directory "${path}" could not be created inside the workspace, so the operation ` +
            'was not performed. Nothing was written.',
        });
      }
      current = next;
    }
    return current;
  }

  private async createFileHandle(path: string): Promise<FsaFileHandleLike> {
    const parent = await this.ensureDirectory(parentWorkspacePath(path));
    const name = baseNameOfWorkspacePath(path);
    const fileHandle = await this.childFile(parent, name, true, path);
    if (fileHandle === null) {
      throw new BrowserWorkspaceAccessError('WORKSPACE_UNAVAILABLE', path, {
        message:
          `The file "${path}" could not be created inside the workspace. Nothing was written and ` +
          'no partial content was left behind.',
      });
    }
    return fileHandle;
  }

  private async childDirectory(
    parent: FsaDirectoryHandleLike,
    name: string,
    create: boolean,
    path: string,
  ): Promise<FsaDirectoryHandleLike | null> {
    try {
      return await parent.getDirectoryHandle(name, { create });
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      if (isWrongKindError(error)) {
        if (create) {
          throw new WorkspaceStorageError(
            'NOT_A_DIRECTORY',
            path,
            `"${path}" cannot be created because an existing entry on the path is not a directory.`,
          );
        }
        return null;
      }
      throwMappedRuntimeError(error, path, 'getDirectoryHandle');
    }
  }

  private async childFile(
    parent: FsaDirectoryHandleLike,
    name: string,
    create: boolean,
    path: string,
  ): Promise<FsaFileHandleLike | null> {
    try {
      return await parent.getFileHandle(name, { create });
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      if (isWrongKindError(error)) {
        if (create) {
          throw new WorkspaceStorageError(
            'NOT_A_FILE',
            path,
            `"${path}" cannot be created because the name is an existing directory.`,
          );
        }
        return null;
      }
      throwMappedRuntimeError(error, path, 'getFileHandle');
    }
  }

  private async openWritable(
    fileHandle: FsaFileHandleLike,
    path: string,
  ): Promise<FsaWritableStreamLike> {
    try {
      return await fileHandle.createWritable({ keepExistingData: false });
    } catch (error) {
      throwMappedRuntimeError(error, path, 'createWritable');
    }
  }
}

export function createFsaWorkspaceStorage(
  root: FsaDirectoryHandleLike,
  options: FsaWorkspaceStorageOptions = {},
): FsaWorkspaceStorage {
  return new FsaWorkspaceStorage(root, options);
}
