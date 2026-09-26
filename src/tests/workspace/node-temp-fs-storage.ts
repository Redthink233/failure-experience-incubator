/**
 * TEST-ONLY Node temporary-filesystem `WorkspaceStorage` harness.
 *
 * 🔴 This file lives under `src/tests/**` on purpose: the Node `fs` module is allowed
 *    ONLY as a test/dev harness. It is NOT product runtime, it is NOT the browser
 *    File System Access adapter (that is S01-02), and it must never be imported from
 *    `src/domain/**` or `src/workspace/**` (enforced by `domain-purity.test.ts`).
 *
 * Its purpose for S01-01: prove that ID-based resolution survives a REAL file rename on
 * a REAL filesystem, not just a Map key rename (T9 / AC-137).
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

import { WorkspaceStorageError } from '../../workspace/storage.js';
import type { WorkspaceEntry, WorkspaceStorage } from '../../workspace/storage.js';

const ROOT_PREFIX = 's01-01-workspace-';

export class NodeTempFsWorkspaceStorage implements WorkspaceStorage {
  readonly kind = 'node-fs-test-harness';
  private readonly root: string;

  constructor() {
    this.root = mkdtempSync(join(tmpdir(), ROOT_PREFIX));
  }

  /** Absolute path of the temporary workspace root (diagnostics only). */
  get rootPath(): string {
    return this.root;
  }

  async exists(path: string): Promise<boolean> {
    return existsSync(this.toAbsolute(path));
  }

  async readFile(path: string): Promise<string> {
    const absolute = this.toAbsolute(path);
    if (!existsSync(absolute)) {
      throw new WorkspaceStorageError('NOT_FOUND', path);
    }
    if (!statSync(absolute).isFile()) {
      throw new WorkspaceStorageError('NOT_A_FILE', path);
    }
    return readFileSync(absolute, 'utf8');
  }

  async writeFile(path: string, contents: string): Promise<void> {
    if (path.length === 0) {
      throw new WorkspaceStorageError('INVALID_PATH', path);
    }
    const absolute = this.toAbsolute(path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents, 'utf8');
  }

  async list(path: string): Promise<readonly WorkspaceEntry[]> {
    const absolute = this.toAbsolute(path);
    if (!existsSync(absolute)) {
      throw new WorkspaceStorageError('NOT_FOUND', path);
    }
    if (!statSync(absolute).isDirectory()) {
      throw new WorkspaceStorageError('NOT_A_DIRECTORY', path);
    }
    return readdirSync(absolute, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      kind: entry.isDirectory() ? 'directory' : 'file',
    }));
  }

  async move(fromPath: string, toPath: string): Promise<void> {
    const from = this.toAbsolute(fromPath);
    const to = this.toAbsolute(toPath);
    if (!existsSync(from)) {
      throw new WorkspaceStorageError('NOT_FOUND', fromPath);
    }
    if (existsSync(to)) {
      throw new WorkspaceStorageError('ALREADY_EXISTS', toPath);
    }
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
  }

  /**
   * Removes the temporary workspace created by THIS instance.
   * Guarded: it refuses to touch anything outside the OS temp directory or without the
   * harness prefix, so it can never delete unrelated files.
   */
  dispose(): void {
    const tempRoot = resolve(tmpdir());
    const insideTemp = this.root.startsWith(tempRoot + sep);
    const hasPrefix = this.root.includes(ROOT_PREFIX);
    if (!insideTemp || !hasPrefix) {
      throw new Error(`Refusing to remove unexpected path "${this.root}".`);
    }
    rmSync(this.root, { recursive: true, force: true });
  }

  private toAbsolute(path: string): string {
    if (path.length === 0) {
      return this.root;
    }
    return join(this.root, ...path.split('/'));
  }
}
