/**
 * Directory-picker helper for the browser workspace adapter (`M2` / S01-02 §5).
 *
 * 🔴 This is a BROWSER HELPER, not UI: no button, no component, no page, no route. It only
 *    wraps `showDirectoryPicker()` so that the App Shell (S01-06) has a single place to obtain
 *    a directory handle from a user gesture.
 * 🔴 It performs NO read: opening a picker never enumerates, probes or scans a disk
 *    (AC-127 / AC-128). The returned handle is a granted capability, nothing more.
 * 🔴 The user gesture requirement is NOT bypassed. A picker that was not user-activated is
 *    refused by the browser and that refusal is surfaced explicitly, never worked around.
 *
 * The DOM global is read structurally off `globalThis` (see `fsa-types.ts`) so this module has
 * no `lib.dom.d.ts` dependency and also compiles in the NO-DOM test scope.
 *
 * References: contract §0.4 A ("只有在用户主动授权后才能访问指定 Workspace"),
 * AC-127 (a user-initiated open is required), AC-128 (nothing is read before authorization),
 * Gate C Plan §I.2 (`M1` holds the picker, `M2` wraps the File System Access API).
 */

import type { FsaDirectoryHandleLike, FsaDirectoryPickerOptions, FsaPermissionMode } from './fsa-types.js';
import { errorNameOf, isDirectoryHandleLike } from './fsa-runtime.js';
import { BrowserWorkspaceAccessError, WORKSPACE_ROOT_PATH } from './workspace-access-error.js';

/** Only the runtime member this helper needs; declared locally, never globally. */
interface DirectoryPickerHost {
  readonly showDirectoryPicker?: (options?: FsaDirectoryPickerOptions) => Promise<unknown>;
}

export interface WorkspaceDirectorySelectionOptions {
  /** Stable picker id so a browser may reopen at the previously used location. */
  readonly id?: string;
  /** `readwrite` (default) or `read` for a deliberately read-only workspace. */
  readonly mode?: FsaPermissionMode;
}

export const DEFAULT_WORKSPACE_PICKER_ID = 'failure-experience-workspace';

function pickerHost(): DirectoryPickerHost {
  return globalThis as unknown as DirectoryPickerHost;
}

type DirectoryPicker = (options: FsaDirectoryPickerOptions) => Promise<unknown>;

/**
 * Returns the runtime picker, or `null` when the platform does not expose one.
 *
 * The returned closure keeps the HOST as its receiver: a `Window` operation invoked with the
 * wrong `this` throws "Illegal invocation" in a real browser, so the raw function reference is
 * never handed out.
 */
function directoryPicker(): DirectoryPicker | null {
  const host = pickerHost();
  const picker = host.showDirectoryPicker;
  if (typeof picker !== 'function') {
    return null;
  }
  return (options: FsaDirectoryPickerOptions): Promise<unknown> => picker.call(host, options);
}

/** Capability probe for the App Shell. Never touches a directory. */
export function isWorkspaceDirectoryPickerSupported(): boolean {
  return directoryPicker() !== null;
}

/**
 * Opens the native directory picker and returns the authorized handle.
 *
 * @returns the granted `FsaDirectoryHandleLike`, or `null` when the USER dismissed the picker.
 *          A dismissal is a user choice, not a failure (AC-127), so it is not an error.
 * @throws {BrowserWorkspaceAccessError} `WORKSPACE_UNAVAILABLE` when the runtime has no picker
 *         or returned something that is not a directory handle; `PERMISSION_DENIED` when the
 *         browser refused the picker (it must be invoked from a user gesture).
 */
export async function selectWorkspaceDirectory(
  options: WorkspaceDirectorySelectionOptions = {},
): Promise<FsaDirectoryHandleLike | null> {
  const picker = directoryPicker();
  const mode: FsaPermissionMode = options.mode ?? 'readwrite';

  if (picker === null) {
    throw new BrowserWorkspaceAccessError('WORKSPACE_UNAVAILABLE', WORKSPACE_ROOT_PATH, {
      permission_mode: mode,
      message:
        'This runtime does not expose showDirectoryPicker(), so the File System Access API is ' +
        'unavailable (V1 targets Chromium-based browsers). No directory was opened and no file ' +
        'was read.',
    });
  }

  let picked: unknown;
  try {
    picked = await picker({ id: options.id ?? DEFAULT_WORKSPACE_PICKER_ID, mode });
  } catch (error) {
    if (errorNameOf(error) === 'AbortError') {
      // The user closed the picker without choosing a directory.
      return null;
    }
    if (errorNameOf(error) === 'SecurityError') {
      throw new BrowserWorkspaceAccessError('PERMISSION_DENIED', WORKSPACE_ROOT_PATH, {
        permission_mode: mode,
        original_error: error,
        message:
          'The browser refused the directory picker because it was not triggered by a user ' +
          'gesture. No directory was opened and no file was read.',
      });
    }
    throw new BrowserWorkspaceAccessError('WORKSPACE_UNAVAILABLE', WORKSPACE_ROOT_PATH, {
      permission_mode: mode,
      original_error: error,
    });
  }

  if (!isDirectoryHandleLike(picked)) {
    throw new BrowserWorkspaceAccessError('WORKSPACE_UNAVAILABLE', WORKSPACE_ROOT_PATH, {
      permission_mode: mode,
      message:
        'The directory picker returned a value that does not implement the File System Access ' +
        'directory contract, so it cannot be used as a workspace. Nothing was read or written.',
    });
  }

  return picked;
}
