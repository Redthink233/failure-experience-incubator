/**
 * Browser-local TECHNICAL error for the File System Access boundary (`M2`).
 *
 * 🔴 NOT a product state and NOT a product Decision. It is the browser-runtime counterpart of
 *    `WorkspaceStorageError` (which stays frozen and framework-neutral) and exists only because
 *    the frozen abstraction has no vocabulary for permission lifecycle failures.
 *
 * Code provenance:
 *   - `WORKSPACE_UNAVAILABLE` / `PERMISSION_DENIED` are the structured `M2` error codes already
 *     fixed by the Gate C plan (§I.2 `M2`, row "输出") and `docs/07_TECH_ARCHITECTURE.md`
 *     ("目录不可访问 ⇒ `WORKSPACE_UNAVAILABLE` + 可恢复" / `PERMISSION_DENIED`). They are reused
 *     verbatim, not invented.
 *   - `PERMISSION_REQUIRED` is added because "not asked yet" (`prompt`) and "refused"
 *     (`denied`) are DIFFERENT situations for the user: the first is recoverable by an explicit
 *     authorization action, the second is a refusal. Collapsing the two into `PERMISSION_DENIED`
 *     would make the UI unable to tell the user which one happened (task `S01-02` §4).
 *   - `MOVE_UNSUPPORTED_BY_BROWSER` is added because the stable File System Access API exposes
 *     no move/rename, and the adapter must report that honestly instead of faking a rename
 *     (task `S01-02` §7: "不得伪造 rename 已支持"). See `FsaWorkspaceStorage.move`.
 *
 * `FILE_CORRUPT` is deliberately NOT included: content corruption is detected and reported by
 * the schema layer (`WorkspaceSchemaError` / contract §1 / AC-130), never by this boundary -
 * reading a corrupt file succeeds, and M2 must not do schema interpretation (Gate C Plan §I.2).
 *
 * References: contract §0.4 A (a browser may only touch a user-authorized directory) / §10.1
 * (layer 2 `RUNTIME`: an explicit message, data preserved, retryable - no unrecoverable stop),
 * AC-127 / AC-128, AC-76 / AC-138 (no physical delete).
 */

import type { FsaPermissionMode } from './fsa-types.js';

export type BrowserWorkspaceAccessErrorCode =
  /** The user (or the browser) refused access to the workspace directory. */
  | 'PERMISSION_DENIED'
  /** Access was never granted for this mode yet - an explicit authorization action is needed. */
  | 'PERMISSION_REQUIRED'
  /** The directory cannot be reached / the runtime cannot address it at all. */
  | 'WORKSPACE_UNAVAILABLE'
  /** The stable File System Access API cannot move or rename. */
  | 'MOVE_UNSUPPORTED_BY_BROWSER';

export interface BrowserWorkspaceAccessErrorOptions {
  /** The permission mode that was needed when the failure happened. */
  readonly permission_mode?: FsaPermissionMode | null;
  readonly message?: string;
  /** The underlying browser failure, kept for diagnostics. Never rendered as product text. */
  readonly original_error?: unknown;
}

/** The workspace ROOT is the subject of permission failures: `path = ''` means "the root". */
export const WORKSPACE_ROOT_PATH = '';

function defaultMessage(code: BrowserWorkspaceAccessErrorCode, path: string): string {
  switch (code) {
    case 'PERMISSION_DENIED':
      return (
        `The browser refused access to the workspace directory${path === '' ? '' : ` at "${path}"`}. ` +
        'Authorization was revoked or refused, so nothing was read or written. ' +
        'No existing data was modified; the access can be granted again explicitly.'
      );
    case 'PERMISSION_REQUIRED':
      return (
        `The workspace directory${path === '' ? '' : ` at "${path}"`} has not been authorized for this ` +
        'session yet. Nothing was read or written - an explicit authorization action is required first.'
      );
    case 'WORKSPACE_UNAVAILABLE':
      return (
        `The workspace directory${path === '' ? '' : ` at "${path}"`} is not reachable in this runtime. ` +
        'No directory was opened and no file was read.'
      );
    case 'MOVE_UNSUPPORTED_BY_BROWSER':
      return (
        `The browser File System Access API cannot move or rename "${path}". ` +
        'Nothing was copied, nothing was deleted and nothing was left behind as a duplicate.'
      );
  }
}

export class BrowserWorkspaceAccessError extends Error {
  readonly code: BrowserWorkspaceAccessErrorCode;
  /** The workspace-relative path involved, or `''` when the workspace root itself is the subject. */
  readonly path: string;
  readonly permission_mode: FsaPermissionMode | null;
  readonly original_error: unknown;

  constructor(
    code: BrowserWorkspaceAccessErrorCode,
    path: string,
    options: BrowserWorkspaceAccessErrorOptions = {},
  ) {
    super(options.message ?? defaultMessage(code, path));
    this.name = 'BrowserWorkspaceAccessError';
    this.code = code;
    this.path = path;
    this.permission_mode = options.permission_mode ?? null;
    this.original_error = options.original_error;
  }
}
