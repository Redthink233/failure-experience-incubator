/**
 * S01-06 ｜ Operation ids: one real user action, one id - and the SAME id when the action is retried.
 *
 * 🔴 WHY THIS MATTERS: every write in `M4`-`M9` is idempotent on an `operation_id`. `M15` derives a
 *    stable child id from the caller's id, so:
 *      - reusing the id on a retry ⇒ the module recognises the retry and does NOT write twice;
 *      - minting a fresh id on a retry ⇒ the chain produces a SECOND batch / a SECOND derivation.
 *    The App Shell therefore owns exactly one rule: mint once per real user action, and keep the id
 *    until the action SUCCEEDS (or the user starts a genuinely different action).
 * 🔴 IT IS NOT DERIVED FROM POSITION (task §18). The id carries the action name and an opaque token -
 *    never an array index, never the current step number, never a list length.
 * 🔴 IT IS NOT PERSISTED. The id lives in the session object only: a reload starts a new user
 *    session, and a replayed-looking request can never be resurrected from storage.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO I/O, NO storage.
 */

/** One member per user-visible action that owns a write. */
export type UiActionKey =
  | 'capture'
  | 'confirmation'
  | 'follow-up-question'
  | 'follow-up-abandon'
  | 'cause-analysis'
  /*
   * 🔴 CORRECTION-01: persisting the candidate causes is a command of its own
   *    (`persistCandidateCauses`), so it gets an action key of its own. It is deliberately NOT
   *    `formal-save`: the user's decision is written the moment it is made, long before ⑤.
   */
  | 'cause-persistence'
  | 'formal-save'
  | 'retrieval-rerun'
  | 'insight-generation'
  | 'insight-action'
  | 'hypothesis-generation'
  | 'hypothesis-action'
  | 'archive';

export interface OperationIdFactory {
  next(action: UiActionKey): string;
}

const DEFAULT_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function defaultToken(): string {
  let token = '';
  for (let index = 0; index < 10; index += 1) {
    token += DEFAULT_ALPHABET[Math.floor(Math.random() * DEFAULT_ALPHABET.length)];
  }
  return token;
}

/**
 * The minting factory.
 *
 * 🔴 THE ID CARRIES NO POSITION. It is `op-<action>-<opaque token>` - no sequence number, no array
 *    index and no step number, so nothing about "which record / which row / which step" can leak into
 *    the business identity (§18 / §46). Uniqueness comes from the token alone.
 *
 * @param token injectable so a test can produce deterministic ids; production uses a random token.
 */
export function createOperationIdFactory(token: () => string = defaultToken): OperationIdFactory {
  return {
    next(action: UiActionKey): string {
      return `op-${action}-${token()}`;
    },
  };
}

/**
 * The retry ledger.
 *
 * 🔴 `remember` is called BEFORE the request and `forget` ONLY after a success (or when the user
 *    explicitly starts a new operation for the same action). A retryable RUNTIME failure therefore
 *    replays the same id, which is what makes the retry a retry.
 */
export interface OperationLedger {
  operationIdFor(key: string, action: UiActionKey): string;
  forget(key: string): void;
  clear(): void;
  readonly size: number;
}

export function createOperationLedger(factory: OperationIdFactory): OperationLedger {
  const live = new Map<string, string>();
  return {
    operationIdFor(key: string, action: UiActionKey): string {
      const existing = live.get(key);
      if (existing !== undefined) {
        return existing;
      }
      const created = factory.next(action);
      live.set(key, created);
      return created;
    },
    forget(key: string): void {
      live.delete(key);
    },
    clear(): void {
      live.clear();
    },
    get size(): number {
      return live.size;
    },
  };
}
