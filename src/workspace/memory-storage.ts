/**
 * In-memory `WorkspaceStorage` implementation.
 *
 * Purpose: the deterministic test / dev double for S01-01's repository verification.
 *
 * 🔴 It is NOT, and MUST NOT become, the production browser File System Access
 *    implementation. The real browser adapter is S01-02, and it lives in
 *    `src/browser/workspace/**` (the older `src/workspace/adapter/**` path is SUPERSEDED).
 * 🔴 It uses no Node API either, so it also runs unchanged in a browser context.
 * 🔴 Consistently with V1, it exposes NO physical delete operation (AC-76).
 */

import {
  assertValidWorkspacePath,
  extensionOfWorkspacePath,
  WorkspaceStorageError,
} from './storage.js';
import type { WorkspaceEntry, WorkspaceStorage } from './storage.js';

const PATH_SEPARATOR = '/';

export class InMemoryWorkspaceStorage implements WorkspaceStorage {
  readonly kind = 'memory';

  private readonly files = new Map<string, string>();

  constructor(initialFiles: Readonly<Record<string, string>> = {}) {
    for (const [path, contents] of Object.entries(initialFiles)) {
      assertValidWorkspacePath(path);
      this.files.set(path, contents);
    }
  }

  async exists(path: string): Promise<boolean> {
    assertValidWorkspacePath(path);
    return this.isFile(path) || this.isDirectory(path);
  }

  async readFile(path: string): Promise<string> {
    assertValidWorkspacePath(path);
    const contents = this.files.get(path);
    if (contents === undefined) {
      throw new WorkspaceStorageError(
        this.isDirectory(path) ? 'NOT_A_FILE' : 'NOT_FOUND',
        path,
      );
    }
    return contents;
  }

  async writeFile(path: string, contents: string): Promise<void> {
    if (path.length === 0) {
      throw new WorkspaceStorageError('INVALID_PATH', path);
    }
    assertValidWorkspacePath(path);
    if (this.isDirectory(path)) {
      throw new WorkspaceStorageError('INVALID_PATH', path, `"${path}" is a directory.`);
    }
    this.files.set(path, contents);
  }

  async list(path: string): Promise<readonly WorkspaceEntry[]> {
    assertValidWorkspacePath(path);
    if (this.isFile(path)) {
      throw new WorkspaceStorageError('NOT_A_DIRECTORY', path);
    }
    if (!this.isDirectory(path)) {
      throw new WorkspaceStorageError('NOT_FOUND', path);
    }
    const prefix = path.length === 0 ? '' : `${path}${PATH_SEPARATOR}`;
    const entries = new Map<string, WorkspaceEntry>();
    for (const key of this.files.keys()) {
      if (!key.startsWith(prefix)) {
        continue;
      }
      const remainder = key.slice(prefix.length);
      const separatorIndex = remainder.indexOf(PATH_SEPARATOR);
      if (separatorIndex < 0) {
        entries.set(remainder, { name: remainder, kind: 'file' });
      } else {
        const name = remainder.slice(0, separatorIndex);
        entries.set(name, { name, kind: 'directory' });
      }
    }
    return [...entries.values()];
  }

  async move(fromPath: string, toPath: string): Promise<void> {
    assertValidWorkspacePath(fromPath);
    assertValidWorkspacePath(toPath);
    if (fromPath.length === 0 || toPath.length === 0) {
      throw new WorkspaceStorageError('INVALID_PATH', fromPath);
    }

    if (this.isFile(fromPath)) {
      if (this.isFile(toPath) || this.isDirectory(toPath)) {
        throw new WorkspaceStorageError('ALREADY_EXISTS', toPath);
      }
      const contents = this.files.get(fromPath) ?? '';
      this.files.set(toPath, contents);
      this.files.delete(fromPath);
      return;
    }

    if (!this.isDirectory(fromPath)) {
      throw new WorkspaceStorageError('NOT_FOUND', fromPath);
    }

    const prefix = `${fromPath}${PATH_SEPARATOR}`;
    const moving = [...this.files.entries()].filter(([key]) => key.startsWith(prefix));
    const targetPrefix = `${toPath}${PATH_SEPARATOR}`;
    for (const [key] of moving) {
      const target = `${targetPrefix}${key.slice(prefix.length)}`;
      if (this.isFile(target) || this.isDirectory(target)) {
        throw new WorkspaceStorageError('ALREADY_EXISTS', target);
      }
    }
    for (const [key, contents] of moving) {
      const target = `${targetPrefix}${key.slice(prefix.length)}`;
      this.files.set(target, contents);
      this.files.delete(key);
    }
  }

  /* ------------------------------------------------------------------ *
   * Test / dev inspection helpers (not part of the WorkspaceStorage contract)
   * ------------------------------------------------------------------ */

  /** Sorted copy of every stored file - used by tests to inspect the physical schema. */
  snapshot(): Readonly<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const key of [...this.files.keys()].sort()) {
      result[key] = this.files.get(key) ?? '';
    }
    return result;
  }

  fileCount(): number {
    return this.files.size;
  }

  filePathsWithExtension(extension: string): readonly string[] {
    return [...this.files.keys()]
      .filter((key) => extensionOfWorkspacePath(key) === extension)
      .sort();
  }

  /** Raw text of one file, or `undefined` when absent. Never throws. */
  peek(path: string): string | undefined {
    return this.files.get(path);
  }

  /* ------------------------------------------------------------------ */

  private isFile(path: string): boolean {
    return this.files.has(path);
  }

  private isDirectory(path: string): boolean {
    if (path.length === 0) {
      return this.files.size > 0;
    }
    const prefix = `${path}${PATH_SEPARATOR}`;
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) {
        return true;
      }
    }
    return false;
  }
}
