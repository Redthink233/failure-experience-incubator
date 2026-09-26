/**
 * M13 ｜ Session-scoped storage capability probe.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : "凭据允许载体 ✅ session-scoped browser storage（`sessionStorage` 或等价
 *                        session-scoped abstraction）"; "🔴 凭据禁止载体（逐项）❌ `localStorage`
 *                        ❌ `IndexedDB` ❌ Workspace file ❌ Git ❌ Vercel KV ❌ Vercel DB ❌ Cloud DB
 *                        ❌ server filesystem ❌ permanent cookie"
 *   - docs/07 §5.12.2
 *   - AC-153 / AC-154 / AC-157 / AC-159 / AC-160 / AC-162
 *
 * ── WHY THIS FILE AVOIDS DOM *TYPE* REFERENCES ──────────────────────────────────────
 * `src/browser/**` is compiled twice: by `tsconfig.browser.json` (DOM granted, `types: []`) as the
 * real browser scope, and - through the import graph - by `tsconfig.test.json` (NO DOM) so the unit
 * suite can exercise it under `npm test`. Writing the storage lookup against a structural interface
 * plus a `globalThis` cast keeps the file valid in BOTH scopes. The capability is PROBED at
 * runtime, never assumed from the type environment.
 *
 * 🔴 NO SILENT FALLBACK. When `globalThis.sessionStorage` is missing or does not behave like a
 *    session store, this module THROWS. It never reaches for `localStorage` / `IndexedDB` / a
 *    cookie / a file - so the forbidden carriers are not merely unused, they are unreachable from
 *    this code path.
 */

/** The three members this project needs. A DOM `Storage` satisfies it structurally. */
export interface SessionScopedStorage {
  /** Implementation tag for diagnostics: `browser-session-storage` / `memory-session-storage`. */
  readonly kind: string;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class SessionStorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionStorageUnavailableError';
  }
}

/** Written and removed again by the capability probe. Never a credential. */
const PROBE_KEY = 'fei.ai.storage-probe';
const PROBE_VALUE = 'probe';

function looksLikeStorage(value: unknown): value is SessionScopedStorage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['getItem'] === 'function' &&
    typeof candidate['setItem'] === 'function' &&
    typeof candidate['removeItem'] === 'function'
  );
}

/**
 * The minimal runtime surface this module reads.
 *
 * 🔴 Only `sessionStorage` is ever consulted. The other names are declared so tests can PROVE that
 *    a runtime which offers them but not `sessionStorage` is rejected instead of accommodated.
 */
export interface WebStorageRuntime {
  readonly sessionStorage?: unknown;
  readonly localStorage?: unknown;
  readonly indexedDB?: unknown;
}

/** Reads the runtime's session storage, PROVING it round-trips before it is trusted.
 *
 * The probe is a real write/read/delete cycle: a `sessionStorage` object that exists but refuses to
 * store (private mode, storage disabled) is a failure, not a store - and the caller must learn that
 * at input time rather than at request time.
 *
 * 🔴 `runtime` defaults to the real `globalThis`; it is injectable only so the "no fallback to a
 *    forbidden carrier" property can be tested deterministically. The function still reads exactly
 *    one member - `.sessionStorage` - so there is no code path that could pick another carrier.
 */
export function createBrowserSessionStorage(
  runtime: WebStorageRuntime = globalThis as unknown as WebStorageRuntime,
): SessionScopedStorage {
  const candidate = runtime.sessionStorage;
  if (!looksLikeStorage(candidate)) {
    throw new SessionStorageUnavailableError(
      'No session-scoped storage is available in this runtime; refusing to fall back to any other carrier.',
    );
  }
  const storage: SessionScopedStorage = {
    kind: 'browser-session-storage',
    getItem: (key) => candidate.getItem(key),
    setItem: (key, value) => {
      candidate.setItem(key, value);
    },
    removeItem: (key) => {
      candidate.removeItem(key);
    },
  };

  storage.setItem(PROBE_KEY, PROBE_VALUE);
  const echoed = storage.getItem(PROBE_KEY);
  storage.removeItem(PROBE_KEY);
  if (echoed !== PROBE_VALUE) {
    throw new SessionStorageUnavailableError('Session storage exists but does not round-trip values.');
  }
  return storage;
}

/**
 * In-memory session storage.
 *
 * 🔴 Legitimate uses: (a) the unit suite, (b) a runtime that has a session but no web storage, where
 *    the credential is then NOT persisted at all. It is the opposite of a "remember me" feature -
 *    nothing outlives the object.
 */
export function createMemorySessionStorage(
  initial?: Readonly<Record<string, string>>,
): SessionScopedStorage {
  const entries = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    kind: 'memory-session-storage',
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
  };
}

/**
 * The set of carrier names this project must never use for a credential.
 * Exposed as DATA so the test suite can assert they are absent from the source tree and so a
 * future contributor sees the list next to the only sanctioned carrier.
 */
export const FORBIDDEN_CREDENTIAL_CARRIERS: readonly string[] = [
  'localStorage',
  'indexedDB',
  'document.cookie',
  'session durable restore',
  'workspace file',
  'git',
  'vercel-kv',
  'vercel-db',
  'cloud-db',
  'server-filesystem',
];
