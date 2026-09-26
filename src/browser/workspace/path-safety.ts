/**
 * Path safety for the browser workspace adapter (`M2` / S01-02 §6).
 *
 * Two layers, in this order:
 *  ① the FROZEN, framework-neutral `assertValidWorkspacePath` from `src/workspace/storage.ts`
 *     is REUSED verbatim (this file is a read-only consumer of layer 2). It already rejects
 *     absolute paths, any `..` segment and backslash escaping;
 *  ② a browser-local STRICTER check that rejects empty and `.` segments.
 *
 * Why ② is a browser-local addition and not a change to the frozen abstraction: a
 * `FileSystemDirectoryHandle` resolves each segment as a real child name, so an empty segment
 * (`a//b`) or a `.` segment (`a/./b`) would silently address a folder literally named `.` or
 * collapse the path - i.e. two DIFFERENT strings could resolve to the SAME physical object.
 * Object identity in this workspace is carried inside file content (§3.2 / AC-137), so path
 * aliasing is a correctness hazard, not merely cosmetics.
 *
 * 🔴 ② can only REJECT more than ① - it never accepts a path ① refuses, so it cannot widen the
 *    frozen contract. It is an implementation-parameter hardening, NOT a new product Decision.
 *
 * References: contract §3.2 (stable ids, rename tolerance), AC-137, AC-128 (nothing outside the
 * authorized directory may ever be addressed).
 */

import {
  assertValidWorkspacePath,
  isValidWorkspacePath,
  WorkspaceStorageError,
} from '../../workspace/storage.js';

/**
 * `true` when `path` is a workspace-relative path that is safe to resolve on a
 * `FileSystemDirectoryHandle`. `''` denotes the workspace root and is legal for reads
 * (the root is the authorization subject); writers reject it separately.
 */
export function isSafeWorkspaceRelativePath(path: string): boolean {
  // ① the frozen abstraction's own rule (absolute / `..` / backslash).
  if (!isValidWorkspacePath(path)) {
    return false;
  }
  // ② the browser-local strictness described above.
  if (path.length === 0) {
    return true;
  }
  return path.split('/').every((segment) => segment.length > 0 && segment !== '.');
}

/** Throws `WorkspaceStorageError('INVALID_PATH')` for anything {@link isSafeWorkspaceRelativePath} refuses. */
export function assertSafeWorkspaceRelativePath(path: string): void {
  assertValidWorkspacePath(path);
  if (!isSafeWorkspaceRelativePath(path)) {
    throw new WorkspaceStorageError(
      'INVALID_PATH',
      path,
      `Unsafe workspace-relative path "${path}": empty and "." segments are refused because ` +
        'they would resolve to the same directory through a different string.',
    );
  }
}
