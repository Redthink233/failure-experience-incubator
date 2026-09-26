/**
 * Test doubles for the browser File System Access boundary (S01-02 §8).
 *
 * 🔴 Node CANNOT obtain a real `FileSystemDirectoryHandle`: the picker requires a real user
 *    gesture in a real browser. Everything proven with this file is therefore a UNIT result.
 *    REAL BROWSER ACCEPTANCE = PENDING PSA (`PSA-03`–`PSA-06`, plus the still-open SP-06 manual
 *    observations `S6-01` / `S6-04`–`S6-06`). 🔴 No result produced with these fakes may ever be
 *    written as "Browser FSA Verified" / "Chrome verified" / "FSA accepted".
 *
 * 🔴 The doubles are STRUCTURAL: they implement the interfaces of
 *    `src/browser/workspace/fsa-types.ts` only and never import a DOM type, so this file also
 *    compiles in the NO-DOM test scope.
 *
 * 🔴 They are deliberately hostile where it matters: the doubles can refuse every lookup
 *    (`failNextLookupWith`), refuse a permission query, fail a write or a commit, or report a
 *    permission state that contradicts the earlier grant - so the adapter is exercised on the
 *    failure paths, not only on the happy path.
 */

import type {
  FsaDirectoryEntryLike,
  FsaDirectoryHandleLike,
  FsaFileContentsLike,
  FsaFileHandleLike,
  FsaNativeMove,
  FsaPermissionDescriptor,
  FsaPermissionMode,
  FsaPermissionState,
  FsaWritableStreamLike,
} from '../../../browser/workspace/fsa-types.js';

/* ------------------------------------------------------------------ *
 * Virtual file system nodes
 * ------------------------------------------------------------------ */

export interface FakeFileNode {
  readonly kind: 'file';
  contents: string;
}

export interface FakeDirectoryNode {
  readonly kind: 'directory';
  readonly children: Map<string, FakeNode>;
}

export type FakeNode = FakeFileNode | FakeDirectoryNode;

export function fileNode(contents = ''): FakeFileNode {
  return { kind: 'file', contents };
}

export function directoryNode(children: Record<string, FakeNode> = {}): FakeDirectoryNode {
  return { kind: 'directory', children: new Map(Object.entries(children)) };
}

/**
 * Builds a nested child tree from a flat `workspace-relative path -> contents` map, so a test
 * fixture can say `'projects/PRJ/attempts/a.json'` instead of nesting four `directoryNode()`s.
 * Intermediate directories are created as needed.
 */
export function fileTree(files: Record<string, string>): Record<string, FakeNode> {
  const root = directoryNode();
  for (const [path, contents] of Object.entries(files)) {
    const segments = path.split('/');
    let current: FakeDirectoryNode = root;
    for (const [index, segment] of segments.entries()) {
      if (index === segments.length - 1) {
        current.children.set(segment, fileNode(contents));
        continue;
      }
      const existing = current.children.get(segment);
      if (existing !== undefined && existing.kind === 'directory') {
        current = existing;
        continue;
      }
      const created = directoryNode();
      current.children.set(segment, created);
      current = created;
    }
  }
  return Object.fromEntries(root.children);
}

/** Direct access to one node by workspace-relative path, for assertions. */
export function nodeAt(root: FakeDirectoryNode, path: string): FakeNode | null {
  let current: FakeNode = root;
  for (const segment of path.length === 0 ? [] : path.split('/')) {
    if (current.kind !== 'directory') {
      return null;
    }
    const next = current.children.get(segment);
    if (next === undefined) {
      return null;
    }
    current = next;
  }
  return current;
}

/** Raw contents of the file at `path`, or `null` when absent / not a file. */
export function contentsAt(root: FakeDirectoryNode, path: string): string | null {
  const node = nodeAt(root, path);
  return node !== null && node.kind === 'file' ? node.contents : null;
}

/* ------------------------------------------------------------------ *
 * Browser-shaped failures
 * ------------------------------------------------------------------ *
 * A plain object carrying a `name` is enough: the adapter recognises platform failures by the
 * spec-defined `name` string and never by `instanceof DOMException` (which is not typeable in
 * the NO-DOM test scope anyway).
 */

export function notFoundError(): unknown {
  return Object.assign(new Error('A requested file or directory could not be found.'), {
    name: 'NotFoundError',
  });
}

export function typeMismatchError(): unknown {
  return Object.assign(
    new Error('The path supplied exists, but was not an entry of the right kind.'),
    { name: 'TypeMismatchError' },
  );
}

export function notAllowedError(): unknown {
  return Object.assign(
    new Error('The request is not allowed by the user agent or the platform.'),
    { name: 'NotAllowedError' },
  );
}

export function securityError(): unknown {
  return Object.assign(new Error('This operation requires a user gesture.'), {
    name: 'SecurityError',
  });
}

export function abortError(): unknown {
  return Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' });
}

/* ------------------------------------------------------------------ *
 * Shared probe: call counts, recordings and injected faults
 * ------------------------------------------------------------------ */

/**
 * One probe instance is shared by every handle in a fake tree, so a test can prove that a refused
 * operation performed **zero** lookups ("permission denied ⇒ nothing was read").
 */
export interface FakeProbe {
  /* -- call counts ------------------------------------------------- */
  getDirectoryHandle: number;
  getFileHandle: number;
  values: number;
  getFile: number;
  createWritable: number;
  write: number;
  close: number;
  abort: number;
  nativeMove: number;
  /* -- recordings (not counts) ------------------------------------- */
  /** Options of the LAST `createWritable()` call, or `null` when it was never called. */
  lastCreateWritableOptions: { readonly keepExistingData?: boolean } | null;
  lastWritable: FakeWritable | null;
  /* -- injected faults -------------------------------------------- */
  /** When set, the NEXT created writable throws it from `write()` (then resets). */
  failNextWriteWith: unknown;
  /** When set, the NEXT created writable throws it from `close()` (then resets). */
  failNextCloseWith: unknown;
}

export function newFakeProbe(): FakeProbe {
  return {
    getDirectoryHandle: 0,
    getFileHandle: 0,
    values: 0,
    getFile: 0,
    createWritable: 0,
    write: 0,
    close: 0,
    abort: 0,
    nativeMove: 0,
    lastCreateWritableOptions: null,
    lastWritable: null,
    failNextWriteWith: null,
    failNextCloseWith: null,
  };
}

/** Total number of lookups into the directory tree (the "did anything get touched?" number). */
export function lookupCount(probe: FakeProbe): number {
  return probe.getDirectoryHandle + probe.getFileHandle + probe.values;
}

/* ------------------------------------------------------------------ *
 * Permission gate
 * ------------------------------------------------------------------ */

export class FakePermissionGate {
  /** Reported by `query()`. Mutating it mid-test models a revocation / re-grant. */
  state: FsaPermissionState = 'granted';
  /** What `request()` resolves to; `null` echoes (and keeps) the current state. */
  requestResult: FsaPermissionState | null = null;

  readonly queryModes: FsaPermissionMode[] = [];
  readonly requestModes: FsaPermissionMode[] = [];

  async query(descriptor?: FsaPermissionDescriptor): Promise<FsaPermissionState> {
    this.queryModes.push(descriptor?.mode ?? 'read');
    return this.state;
  }

  async request(descriptor?: FsaPermissionDescriptor): Promise<FsaPermissionState> {
    this.requestModes.push(descriptor?.mode ?? 'read');
    const next = this.requestResult ?? this.state;
    this.state = next;
    return next;
  }
}

/* ------------------------------------------------------------------ *
 * Writable stream
 * ------------------------------------------------------------------ */

export class FakeWritable implements FsaWritableStreamLike {
  readonly chunks: string[] = [];
  closed = false;
  aborted = false;
  /** When set, `write()` throws it (an "exception writable", task §9 T11). */
  failWriteWith: unknown = null;
  /** When set, `close()` throws it - and the commit must NOT happen. */
  failCloseWith: unknown = null;

  private readonly node: FakeFileNode;
  private readonly probe: FakeProbe;

  constructor(node: FakeFileNode, probe: FakeProbe) {
    this.node = node;
    this.probe = probe;
  }

  async write(data: string): Promise<void> {
    this.probe.write += 1;
    if (this.failWriteWith !== null) {
      throw this.failWriteWith;
    }
    this.chunks.push(data);
  }

  async close(): Promise<void> {
    this.probe.close += 1;
    if (this.failCloseWith !== null) {
      throw this.failCloseWith;
    }
    this.closed = true;
    // The content only becomes visible when the commit succeeds.
    this.node.contents = this.chunks.join('');
  }

  async abort(): Promise<void> {
    this.probe.abort += 1;
    this.aborted = true;
  }
}

/* ------------------------------------------------------------------ *
 * File handle
 * ------------------------------------------------------------------ */

export interface FakeHandleOptions {
  readonly nativeMove?: FsaNativeMove | undefined;
}

export class FakeFileHandle implements FsaFileHandleLike {
  readonly kind: 'file' = 'file';
  readonly name: string;

  /** Only present when a native move was injected - mirrors a browser WITHOUT `move()`. */
  move?: FsaNativeMove;

  lastWritable: FakeWritable | null = null;

  private readonly node: FakeFileNode;
  private readonly probe: FakeProbe;

  constructor(
    name: string,
    node: FakeFileNode,
    probe: FakeProbe,
    options: FakeHandleOptions = {},
  ) {
    this.name = name;
    this.node = node;
    this.probe = probe;
    const nativeMove = options.nativeMove;
    if (nativeMove !== undefined) {
      this.move = (destination, newName) => {
        this.probe.nativeMove += 1;
        return nativeMove(destination, newName);
      };
    }
  }

  async getFile(): Promise<FsaFileContentsLike> {
    this.probe.getFile += 1;
    return { text: async (): Promise<string> => this.node.contents };
  }

  async createWritable(options?: {
    readonly keepExistingData?: boolean;
  }): Promise<FsaWritableStreamLike> {
    this.probe.createWritable += 1;
    this.probe.lastCreateWritableOptions = options ?? null;

    const writable = new FakeWritable(this.node, this.probe);
    writable.failWriteWith = this.probe.failNextWriteWith;
    writable.failCloseWith = this.probe.failNextCloseWith;
    this.probe.failNextWriteWith = null;
    this.probe.failNextCloseWith = null;

    this.probe.lastWritable = writable;
    this.lastWritable = writable;
    return writable;
  }
}

/* ------------------------------------------------------------------ *
 * Directory handle
 * ------------------------------------------------------------------ */

export class FakeDirectoryHandle implements FsaDirectoryHandleLike {
  readonly kind: 'directory' = 'directory';
  readonly name: string;

  /** Only present when a native move was injected - mirrors a browser WITHOUT `move()`. */
  move?: FsaNativeMove;

  /**
   * When set, the NEXT child lookup throws it and the field resets. Models "the permission was
   * revoked right after `queryPermission()` had already reported granted".
   */
  failNextLookupWith: unknown = null;

  private readonly node: FakeDirectoryNode;
  private readonly gate: FakePermissionGate;
  private readonly probe: FakeProbe;
  private readonly options: FakeHandleOptions;

  constructor(
    name: string,
    node: FakeDirectoryNode,
    gate: FakePermissionGate,
    probe: FakeProbe,
    options: FakeHandleOptions = {},
  ) {
    this.name = name;
    this.node = node;
    this.gate = gate;
    this.probe = probe;
    this.options = options;
    const nativeMove = options.nativeMove;
    if (nativeMove !== undefined) {
      this.move = (destination, newName) => {
        this.probe.nativeMove += 1;
        return nativeMove(destination, newName);
      };
    }
  }

  async getDirectoryHandle(
    name: string,
    options?: { readonly create?: boolean },
  ): Promise<FsaDirectoryHandleLike> {
    this.probe.getDirectoryHandle += 1;
    this.throwIfRevokedMidFlight();

    const child = this.node.children.get(name);
    if (child !== undefined) {
      if (child.kind === 'file') {
        throw typeMismatchError();
      }
      return this.handleForDirectory(name, child);
    }
    if (options?.create !== true) {
      throw notFoundError();
    }
    const created = directoryNode();
    this.node.children.set(name, created);
    return this.handleForDirectory(name, created);
  }

  async getFileHandle(
    name: string,
    options?: { readonly create?: boolean },
  ): Promise<FsaFileHandleLike> {
    this.probe.getFileHandle += 1;
    this.throwIfRevokedMidFlight();

    const child = this.node.children.get(name);
    if (child !== undefined) {
      if (child.kind === 'directory') {
        throw typeMismatchError();
      }
      return new FakeFileHandle(name, child, this.probe, this.options);
    }
    if (options?.create !== true) {
      throw notFoundError();
    }
    const created = fileNode('');
    this.node.children.set(name, created);
    return new FakeFileHandle(name, created, this.probe, this.options);
  }

  async *values(): AsyncIterableIterator<FsaDirectoryEntryLike> {
    this.probe.values += 1;
    this.throwIfRevokedMidFlight();
    for (const [name, child] of this.node.children) {
      yield { name, kind: child.kind };
    }
  }

  async queryPermission(descriptor?: FsaPermissionDescriptor): Promise<FsaPermissionState> {
    return this.gate.query(descriptor);
  }

  async requestPermission(descriptor?: FsaPermissionDescriptor): Promise<FsaPermissionState> {
    return this.gate.request(descriptor);
  }

  private handleForDirectory(name: string, node: FakeDirectoryNode): FakeDirectoryHandle {
    return new FakeDirectoryHandle(name, node, this.gate, this.probe, this.options);
  }

  private throwIfRevokedMidFlight(): void {
    if (this.failNextLookupWith !== null) {
      const error = this.failNextLookupWith;
      this.failNextLookupWith = null;
      throw error;
    }
  }
}

/* ------------------------------------------------------------------ *
 * Whole-workspace fixture
 * ------------------------------------------------------------------ */

export interface FakeWorkspace {
  readonly root: FakeDirectoryHandle;
  /** The virtual root DIRECTORY node, for direct assertions on stored contents. */
  readonly rootNode: FakeDirectoryNode;
  readonly gate: FakePermissionGate;
  readonly probe: FakeProbe;
}

export interface FakeWorkspaceOptions {
  readonly state?: FsaPermissionState;
  readonly nativeMove?: FsaNativeMove;
}

export function createFakeWorkspace(
  children: Record<string, FakeNode> = {},
  options: FakeWorkspaceOptions = {},
): FakeWorkspace {
  const gate = new FakePermissionGate();
  gate.state = options.state ?? 'granted';

  const probe = newFakeProbe();
  const rootNode = directoryNode(children);
  const root = new FakeDirectoryHandle('fake-workspace', rootNode, gate, probe, {
    nativeMove: options.nativeMove,
  });
  return { root, rootNode, gate, probe };
}
