/**
 * Browser-local MINIMAL structural declarations of the File System Access API subset
 * used by the S01-02 workspace adapter (`M2`).
 *
 * Why this file exists at all: `lib.dom.d.ts` declares `FileSystemDirectoryHandle` /
 * `FileSystemFileHandle`, but NOT
 *   - `showDirectoryPicker()` (`Window`),
 *   - `FileSystemHandle.queryPermission()` / `requestPermission()`,
 *   - async iteration (`values()`) over a directory handle.
 * Task `S01-02` §5 explicitly allows a minimal browser-local type declaration in
 * `src/browser/workspace/**` for exactly this gap.
 *
 * 🔴 DELIBERATE PROPERTY — this module is written against STRUCTURAL interfaces declared
 *    here instead of the ambient DOM globals, so the adapter has ZERO dependency on
 *    `lib.dom.d.ts`. That is what lets the very same source compile under
 *      - `tsconfig.browser.json` (DOM available) AND
 *      - `tsconfig.test.json` / `tsconfig.json` (NO DOM, nodes only),
 *    because the Node test build pulls `src/browser/workspace/**` in over the import graph
 *    from `src/tests/**`. Reaching for the ambient `FileSystemDirectoryHandle` type here
 *    would force DOM into the core/test scope - the exact thing `S01-W1-PREP` forbids.
 *
 * 🔴 TYPE-ONLY + LOCAL: nothing here is exported into `src/domain/**` or
 *    `src/workspace/**`, and the frozen `WorkspaceStorage` abstraction is untouched.
 * 🔴 NOT a product Decision: the concrete API shape is an implementation parameter.
 *
 * References: Gate C Plan §I.2 (`M2`), CODING_START_HANDOFF §0.1 (runtime boundaries),
 * contract §0.4 A (the browser may only touch a user-authorized directory), AC-127 / AC-128.
 */

/** `FileSystemHandle.queryPermission` / `requestPermission` descriptor result. */
export type FsaPermissionState = 'granted' | 'denied' | 'prompt';

/** `read` is sufficient for reads; anything that mutates the directory needs `readwrite`. */
export type FsaPermissionMode = 'read' | 'readwrite';

export interface FsaPermissionDescriptor {
  readonly mode?: FsaPermissionMode;
}

/** The part of `File` this adapter uses. */
export interface FsaFileContentsLike {
  text(): Promise<string>;
}

/**
 * The write side of `FileSystemFileHandle.createWritable()`.
 *
 * Only `write` / `close` / `abort` are declared: the adapter performs an explicit
 * create-truncate-write-close cycle and never seeks or partially truncates, so declaring
 * `seek()` / `truncate()` would advertise capabilities this adapter deliberately does not use.
 */
export interface FsaWritableStreamLike {
  write(data: string): Promise<void>;
  close(): Promise<void>;
  abort?(reason?: unknown): Promise<void>;
}

/**
 * NON-STANDARD rename/move hook.
 *
 * 🔴 The stable File System Access API exposes NO move/rename operation, so this member is
 *    absent on every shipping implementation and is only FEATURE-DETECTED by the adapter
 *    (see `FsaWorkspaceStorage.move`). It is declared here so the feature-detection path is
 *    type-safe rather than a stringly-typed poke at the object.
 */
export type FsaNativeMove = (
  destination: FsaDirectoryHandleLike,
  newName?: string,
) => Promise<void>;

export interface FsaFileHandleLike {
  readonly kind: 'file';
  readonly name: string;
  getFile(): Promise<FsaFileContentsLike>;
  createWritable(options?: {
    readonly keepExistingData?: boolean;
  }): Promise<FsaWritableStreamLike>;
  /** See {@link FsaNativeMove}. Absent on every shipping browser. */
  readonly move?: FsaNativeMove;
}

/** The `name` + `kind` pair yielded by a directory handle's async iteration. */
export interface FsaDirectoryEntryLike {
  readonly kind: 'file' | 'directory';
  readonly name: string;
}

/**
 * The directory-handle surface the adapter depends on.
 *
 * 🔴 `removeEntry()` is deliberately NOT declared, so no code in `src/browser/workspace/**`
 *    can even type-check a physical delete. V1 has no delete entry point or API semantics
 *    (contract §7 / §12 item 9 / AC-76 / AC-138), and the frozen `WorkspaceStorage`
 *    abstraction has no `delete` / `remove` / `unlink` member either.
 */
export interface FsaDirectoryHandleLike {
  readonly kind: 'directory';
  readonly name: string;
  getDirectoryHandle(
    name: string,
    options?: { readonly create?: boolean },
  ): Promise<FsaDirectoryHandleLike>;
  getFileHandle(
    name: string,
    options?: { readonly create?: boolean },
  ): Promise<FsaFileHandleLike>;
  values(): AsyncIterableIterator<FsaDirectoryEntryLike>;
  queryPermission(descriptor?: FsaPermissionDescriptor): Promise<FsaPermissionState>;
  requestPermission(descriptor?: FsaPermissionDescriptor): Promise<FsaPermissionState>;
  /** See {@link FsaNativeMove}. Absent on every shipping browser. */
  readonly move?: FsaNativeMove;
}

/** Options passed through to `globalThis.showDirectoryPicker()`. */
export interface FsaDirectoryPickerOptions {
  readonly id?: string;
  readonly mode?: FsaPermissionMode;
}
