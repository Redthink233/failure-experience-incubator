/**
 * `WorkspaceStorage` - the minimal storage abstraction the repository depends on.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
 *   - §0.4 A  : the workspace is canonical in a user-chosen LOCAL directory;
 *   - §7       the archive bit is a state change - V1 has NO physical deletion;
 *   - §12 item 9 / AC-76: no delete entry point or API semantics may exist.
 *
 * 🔴 This layer MUST NOT be bound to `window.showDirectoryPicker`,
 *    `FileSystemDirectoryHandle`, or any other concrete browser API. The real
 *    browser File System Access adapter is S01-02, and it lives in
 *    `src/browser/workspace/**` (the older `src/workspace/adapter/**` path is SUPERSEDED).
 *    S01-01 ships this interface plus an in-memory implementation used by tests.
 *
 * Paths are POSIX-style relative paths inside the workspace root ('' = root).
 * Implementations map them onto their own hierarchy (Map / FileSystemDirectoryHandle / fs).
 */

export type WorkspaceEntryKind = 'file' | 'directory';

export interface WorkspaceEntry {
  readonly name: string;
  readonly kind: WorkspaceEntryKind;
}

export type WorkspaceStorageErrorCode =
  | 'INVALID_PATH'
  | 'NOT_FOUND'
  | 'NOT_A_DIRECTORY'
  | 'NOT_A_FILE'
  | 'ALREADY_EXISTS';

export class WorkspaceStorageError extends Error {
  readonly code: WorkspaceStorageErrorCode;
  readonly path: string;

  constructor(code: WorkspaceStorageErrorCode, path: string, message?: string) {
    super(message ?? `Workspace storage error [${code}] at "${path}".`);
    this.name = 'WorkspaceStorageError';
    this.code = code;
    this.path = path;
  }
}

/**
 * Storage contract. 🔴 Deliberately has NO `delete` / `remove` / `unlink` member:
 * V1 provides no physical delete entry point (D-043 / AC-76).
 */
export interface WorkspaceStorage {
  /** Implementation tag, e.g. `memory` / `fsa-directory` / `node-fs`. */
  readonly kind: string;
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  /** Creates missing parent directories as needed. */
  writeFile(path: string, contents: string): Promise<void>;
  /** Lists the immediate children of a directory. Throws when it does not exist. */
  list(path: string): Promise<readonly WorkspaceEntry[]>;
  /** Renames / moves a file or a whole directory subtree. */
  move(fromPath: string, toPath: string): Promise<void>;
}

/** Rejects absolute paths and any `..` segment: everything stays inside the workspace. */
export function isValidWorkspacePath(path: string): boolean {
  if (path.includes('\\')) {
    return false;
  }
  if (path.startsWith('/')) {
    return false;
  }
  return !path.split('/').includes('..');
}

export function assertValidWorkspacePath(path: string): void {
  if (!isValidWorkspacePath(path)) {
    throw new WorkspaceStorageError('INVALID_PATH', path);
  }
}

export function joinWorkspacePath(...segments: readonly string[]): string {
  return segments
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
    .filter((segment) => segment.length > 0)
    .join('/');
}

export function parentWorkspacePath(path: string): string {
  const index = path.lastIndexOf('/');
  return index < 0 ? '' : path.slice(0, index);
}

export function baseNameOfWorkspacePath(path: string): string {
  const index = path.lastIndexOf('/');
  return index < 0 ? path : path.slice(index + 1);
}

export function extensionOfWorkspacePath(path: string): string {
  const name = baseNameOfWorkspacePath(path);
  const index = name.lastIndexOf('.');
  return index <= 0 ? '' : name.slice(index);
}
