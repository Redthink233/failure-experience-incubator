/**
 * S01-06 ｜ Operation ids: one real user action, one id - and the SAME id when the action is retried.
 *
 * 🔴 WHY THIS MATTERS: every write in `M4`-`M9` is idempotent on an `operation_id`. `M15` derives a
 *    stable child id from the caller's id, so:
 *      - reusing the id on a retry ⇒ the module recognises the retry and does NOT write twice;
 *      - minting a fresh id on a retry ⇒ the chain produces a SECOND batch / a SECOND derivation.
 *    The App Shell therefore owns exactly one rule: mint once per real user action, and keep the id
 *    until the action SUCCEEDS (or the user starts a genuinely different action).
 * 🔴 IT IS NOT DERIVED FROM POSITION (task §18). The id carries the action name, the RECORD it belongs
 *    to and an opaque token - never an array index, never the current step number, never a list length.
 * 🔴 IT IS SCOPED TO THE RECORD (`FINAL-RAPID-B` §7). A record operation's id names its record, so an
 *    id that succeeded for A can never be replayed as if it were B's operation. The ledger key carries
 *    the same scope, and the two are separate facts: the KEY is "which operation", the ID is what the
 *    service sees.
 * 🔴 INSIGHT / HYPOTHESIS OPERATIONS ARE SCOPED BY THEIR OWN STABLE ID (`insight-action:<insight_id>`),
 *    which is what makes "accept this insight twice" a replay and "accept two different insights" two
 *    operations.
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
  /**
   * Mints the id of one user action.
   *
   * @param action the user-visible action that owns the write.
   * @param record_id the RECORD the action operates on, when it operates on exactly one. `null` (or
   *        omitted) for an action that is not a record operation, e.g. a follow-up question on the
   *        record already on screen is scoped by the caller's ledger key instead.
   */
  next(action: UiActionKey, record_id?: string | null): string;
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
 * 🔴 THE ID CARRIES NO POSITION. It is `op-<action>-<opaque token>`, or `op-<action>-<record>-<opaque
 *    token>` for a record operation - no sequence number, no array index and no step number, so
 *    nothing about "which row / which step" can leak into the business identity (§18 / §46).
 *    Uniqueness comes from the token alone.
 * 🔴 THE RECORD IS PART OF THE ID (`FINAL-RAPID-B` §7): "所有 record operation 至少包含 attempt_id".
 *    `formal-save` for `ATT_A` and `formal-save` for `ATT_B` are visibly different operations, so a
 *    success ledger entry can never be reused across records.
 *
 * @param token injectable so a test can produce deterministic ids; production uses a random token.
 */
export function createOperationIdFactory(token: () => string = defaultToken): OperationIdFactory {
  return {
    next(action: UiActionKey, record_id: string | null = null): string {
      const scope = record_id === null ? '' : `-${record_id}`;
      return `op-${action}${scope}-${token()}`;
    },
  };
}

/**
 * The retry ledger.
 *
 * 🔴 `operationIdFor` is called BEFORE the request and `forget` ONLY after a success (or when the user
 *    explicitly starts a new operation for the same action). A retryable RUNTIME failure therefore
 *    replays the same id, which is what makes the retry a retry.
 * 🔴 ONE KEY, ONE LIVE ID - AND THE KEY MUST CARRY THE SCOPE. The caller spells the key so that it
 *    already names the record or the object the operation belongs to (`formal-save:<attempt_id>`,
 *    `cause-decision:<attempt_id>`, `insight-action:<insight_id>`, ...). A key that names only the
 *    action would let record B inherit record A's id, which is the defect `FINAL-RAPID-B` §7 fixes.
 * 🔴 `clear()` IS A WORKSPACE-SCOPE ACT: a replaced workspace starts with an empty ledger, so no id
 *    from the previous directory can be replayed into the new one.
 */
export interface OperationLedger {
  operationIdFor(key: string, action: UiActionKey, record_id?: string | null): string;
  forget(key: string): void;
  clear(): void;
  readonly size: number;
}

export function createOperationLedger(factory: OperationIdFactory): OperationLedger {
  const live = new Map<string, string>();
  return {
    operationIdFor(key: string, action: UiActionKey, record_id: string | null = null): string {
      const existing = live.get(key);
      if (existing !== undefined) {
        return existing;
      }
      const created = factory.next(action, record_id);
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
