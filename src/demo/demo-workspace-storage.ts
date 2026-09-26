/**
 * `M16` ｜ **Node 侧可写 `WorkspaceStorage`** —— 只服务于 Demo 基线的 seed / reset 两个运维动作。
 *
 * 🔴 这是 **Node-only tooling**，不是产品运行时：它不进 `tsconfig.build.json`（`dist/`）、
 *    不进 `tsconfig.web.json`（浏览器产物），产品 UI 也**不 import** 它。
 *    它存在的唯一理由：把一个**真实可选的目录**写成合法的工作空间，供人用浏览器打开。
 *
 * 🔴 它**不是**浏览器 File System Access 适配器（那是 `src/browser/workspace/**`），
 *    也**不是**测试用的 `NodeTempFsWorkspaceStorage`（那个只能建在 OS 临时目录下）。
 *
 * 🔴 `WorkspaceStorage` 契约**刻意没有** delete 成员（`D-043` / `AC-76`：V1 无物理删除入口）。
 *    因此 `clearContents()` **不是** storage 契约的一部分 —— 它是本运维工具类上的一个
 *    独立方法，只被 `reset-demo-baseline.ts` 在完成「目标确实是 Demo 工作空间」证明之后调用。
 *
 * Framework-neutral 的反面：本文件**明确使用** Node 运行时 API（`node:fs` / `node:path`）。
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, parse, resolve, sep } from 'node:path';

import { WorkspaceStorageError } from '../workspace/storage.js';
import type { WorkspaceEntry, WorkspaceStorage } from '../workspace/storage.js';

/** Thrown by the structural guards that keep the destructive path away from unrelated directories. */
export class DemoWorkspacePathError extends Error {
  readonly code: 'NOT_ABSOLUTE_ROOT' | 'FILESYSTEM_ROOT' | 'NOT_A_DIRECTORY' | 'UNSAFE_PATH';

  constructor(code: DemoWorkspacePathError['code'], message: string) {
    super(message);
    this.name = 'DemoWorkspacePathError';
    this.code = code;
  }
}

/**
 * Resolves a demo workspace root to its canonical absolute path.
 *
 * 🔴 Structural refusals happen BEFORE anything touches the directory:
 *    ① the path must NOT be a filesystem / drive root (`C:\`, `/`) and must have a parent,
 *       so "wipe the root of the disk" is not expressible;
 *    ② unless `create` is requested, it must already be an existing directory.
 *    The *identity* proof (marker + `workspace.json`) is a separate, stronger check performed by
 *    the reset tool - these only stop the obvious accidents.
 *
 * 🔴 `create` is only ever used by the SEED action (creating a directory is harmless).
 *    The destructive RESET action always goes through the `create: false` path.
 */
export function resolveDemoWorkspaceRoot(
  root_path: string,
  options: { readonly create?: boolean } = {},
): string {
  if (typeof root_path !== 'string' || root_path.trim().length === 0) {
    throw new DemoWorkspacePathError('NOT_ABSOLUTE_ROOT', 'A demo workspace root path is required.');
  }
  const absolute = resolve(root_path);
  if (parse(absolute).root === absolute || dirname(absolute) === absolute) {
    throw new DemoWorkspacePathError(
      'FILESYSTEM_ROOT',
      `Refusing to treat the filesystem root "${absolute}" as a demo workspace.`,
    );
  }
  if (options.create === true && !existsSync(absolute)) {
    mkdirSync(absolute, { recursive: true });
  }
  if (!existsSync(absolute)) {
    throw new DemoWorkspacePathError(
      'NOT_A_DIRECTORY',
      `The demo workspace root "${absolute}" does not exist.`,
    );
  }
  if (!statSync(absolute).isDirectory()) {
    throw new DemoWorkspacePathError(
      'NOT_A_DIRECTORY',
      `The demo workspace root "${absolute}" is not a directory.`,
    );
  }
  const canonical = realpathSync(absolute);
  if (parse(canonical).root === canonical) {
    throw new DemoWorkspacePathError(
      'FILESYSTEM_ROOT',
      `Refusing to treat the filesystem root "${canonical}" as a demo workspace.`,
    );
  }
  if (dirname(canonical) === canonical) {
    throw new DemoWorkspacePathError(
      'FILESYSTEM_ROOT',
      `Refusing to treat "${canonical}" as a demo workspace: it has no parent directory.`,
    );
  }
  return canonical;
}

/**
 * The tool-only storage. Paths are POSIX-style relative paths inside the root ('' = root),
 * exactly like every other `WorkspaceStorage` implementation.
 */
export class NodeDemoWorkspaceStorage implements WorkspaceStorage {
  readonly kind = 'node-fs-demo-tool';
  private readonly root: string;

  constructor(root_path: string, options: { readonly create_root?: boolean } = {}) {
    this.root = resolveDemoWorkspaceRoot(root_path, {
      ...(options.create_root === undefined ? {} : { create: options.create_root }),
    });
  }

  /** Canonical absolute path of the workspace root (diagnostics / marker checks). */
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
   * 🔴 **DESTRUCTIVE — reset only.** Removes every child entry of the root, keeping the root
   *    directory itself, and touches nothing outside it.
   *
   * 🔴 The root is re-verified here (not merely trusted from construction time), so a symlink
   *    swap between construction and the call cannot widen the blast radius. The caller
   *    (the reset tool) must additionally have proven the marker + `workspace_id` identity;
   *    this method enforces only the structural guards, never the identity.
   */
  clearContents(): void {
    const canonical = resolveDemoWorkspaceRoot(this.root);
    if (canonical !== this.root) {
      throw new DemoWorkspacePathError(
        'UNSAFE_PATH',
        `The demo workspace root changed identity ("${this.root}" → "${canonical}"); refusing to clear it.`,
      );
    }
    for (const entry of readdirSync(this.root)) {
      const target = join(this.root, entry);
      // Defence in depth: never step outside the root, whatever the entry name happens to be.
      if (!target.startsWith(this.root + sep)) {
        throw new DemoWorkspacePathError(
          'UNSAFE_PATH',
          `Refusing to remove "${target}": it is outside the demo workspace root.`,
        );
      }
      rmSync(target, { recursive: true, force: true });
    }
  }

  private toAbsolute(path: string): string {
    if (path.length === 0) {
      return this.root;
    }
    if (path.includes('\\') || path.startsWith('/') || path.split('/').includes('..')) {
      throw new DemoWorkspacePathError('UNSAFE_PATH', `Illegal workspace path "${path}".`);
    }
    return join(this.root, ...path.split('/'));
  }
}
