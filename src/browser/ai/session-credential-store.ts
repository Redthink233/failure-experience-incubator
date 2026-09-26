/**
 * M13 ｜ Session-only credential store.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : "凭据目标行为：输入 API Key → 当前会话可用 → 页面刷新后仍可继续当前会话 →
 *                        tab / browser session 结束 ⇒ 清除 → 重新进入产品须重新输入";
 *                       "🔴 UI 红线：不得提供「记住我」/「Remember Key」/「永久保存 Credential」开关"
 *   - docs/06 §《D-055 / D-056 同步》§3
 *   - AC-133 / AC-153 / AC-154 / AC-155 / AC-156 / AC-157 / AC-158 / AC-159 / AC-160 / AC-161 / AC-162
 *
 * ── THE FOUR GUARANTEES AND HOW EACH IS PRODUCED ────────────────────────────────────
 *   ① same session, after refresh  ⇒ still usable   : the value lives in the injected
 *      `SessionScopedStorage` (a `sessionStorage`-shaped carrier), NOT in a module variable. A new
 *      store instance built over the same carrier finds it (AC-160).
 *   ② tab / browser session ends   ⇒ cleared        : the carrier is session-scoped, so the RUNTIME
 *      clears it. `endSession()` additionally performs an explicit, complete removal for sign-out
 *      and for the test that proves nothing is recoverable afterwards (AC-159).
 *   ③ no forbidden carrier          : the store only ever calls `getItem`/`setItem`/`removeItem` on
 *      the injected carrier. There is no code path that could name `localStorage`, `IndexedDB`, a
 *      cookie or a file (AC-153 / AC-154 / AC-157 / AC-162).
 *   ④ no "remember" capability      : the exported surface is `put` / `resolve` / `has` / `remove` /
 *      `endSession` / `list_refs`. There is no persistence option, no TTL, no auto-restore, and
 *      nothing reads a credential at construction time (AC-161).
 *
 * 🔴 Business layers receive a `CredentialRef` (opaque, non-secret). The raw value is only ever
 *    returned as a `CredentialSecret`, whose payload is held in a module-private WeakMap in
 *    `src/ai/provider/credential.ts` - so `JSON.stringify` of anything business-visible is `{}`.
 *
 * 🔴 `console.log` of a credential is impossible here: this module performs NO logging at all.
 */

import { credentialRef, credentialSecret } from '../../ai/provider/credential.js';
import type { CredentialRef, CredentialResolver, CredentialSecret } from '../../ai/provider/credential.js';
import type { SessionScopedStorage } from './session-storage.js';

/** Namespace prefix for every key this store owns. Keeps unrelated session keys out of reach. */
export const SESSION_CREDENTIAL_NAMESPACE = 'fei.ai.session-credential';

/** Key holding the JSON list of ref ids this store has written, so `endSession()` is exhaustive. */
const INDEX_KEY = `${SESSION_CREDENTIAL_NAMESPACE}/index`;

/** The storage key for one credential. Derived from the opaque ref, never from a secret. */
export function sessionCredentialKey(ref: CredentialRef): string {
  return `${SESSION_CREDENTIAL_NAMESPACE}/${encodeURIComponent(ref.ref_id)}`;
}

export interface SessionCredentialStore extends CredentialResolver {
  /** Stores the value for this session. Overwrites a previous value for the same ref. */
  put(ref: CredentialRef, raw_value: string): void;
  has(ref: CredentialRef): boolean;
  /** Forgets one credential. */
  remove(ref: CredentialRef): void;
  /**
   * Explicitly clears every credential this store owns. NOT required for the normal lifecycle
   * (the session-scoped carrier clears itself), but it is the exhaustive path the tests use.
   */
  endSession(): void;
  /** Ref IDS only - never values. Safe to show in diagnostics. */
  list_refs(): readonly string[];
}

function readIndex(storage: SessionScopedStorage): readonly string[] {
  const raw = storage.getItem(INDEX_KEY);
  if (raw === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}

function writeIndex(storage: SessionScopedStorage, ref_ids: readonly string[]): void {
  storage.setItem(INDEX_KEY, JSON.stringify(ref_ids));
}

/**
 * Builds the store over an injected session-scoped carrier.
 *
 * 🔴 There is NO option for persistence, encryption-of-record, TTL or restore. Adding one would
 *    change a product-level constraint (`D-056` / AC-161), so it must not appear as a convenience
 *    parameter here.
 */
export function createSessionCredentialStore(storage: SessionScopedStorage): SessionCredentialStore {
  return {
    kind: `session-credential-store(${storage.kind})`,

    put(ref: CredentialRef, raw_value: string): void {
      storage.setItem(sessionCredentialKey(ref), raw_value);
      const known = readIndex(storage);
      if (!known.includes(ref.ref_id)) {
        writeIndex(storage, [...known, ref.ref_id]);
      }
    },

    resolve(ref: CredentialRef): CredentialSecret | null {
      const raw = storage.getItem(sessionCredentialKey(ref));
      if (raw === null || raw.length === 0) {
        return null;
      }
      return credentialSecret(raw);
    },

    has(ref: CredentialRef): boolean {
      const raw = storage.getItem(sessionCredentialKey(ref));
      return raw !== null && raw.length > 0;
    },

    remove(ref: CredentialRef): void {
      storage.removeItem(sessionCredentialKey(ref));
      writeIndex(
        storage,
        readIndex(storage).filter((entry) => entry !== ref.ref_id),
      );
    },

    endSession(): void {
      for (const ref_id of readIndex(storage)) {
        storage.removeItem(sessionCredentialKey(credentialRef(ref_id)));
      }
      writeIndex(storage, []);
    },

    list_refs(): readonly string[] {
      return readIndex(storage);
    },
  };
}

/**
 * The ref the UI uses for the single configured provider. Derived from the provider id so the
 * credential is not shared accidentally between two configurations.
 */
export function credentialRefForProvider(raw_provider_id: string): CredentialRef {
  return credentialRef(`provider:${raw_provider_id}`);
}
