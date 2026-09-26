/**
 * S01 ｜ `M15` - stable child `operation_id` derivation (task §6).
 *
 * 🔴 WHY THIS FILE EXISTS: every write in `M4`-`M9` is idempotent on an `operation_id`. If the
 *    orchestrator minted a NEW random id on every retry, 「同一次用户操作重试」 would look like 「两次
 *    不同的用户操作」 and the chain would produce a second `Insight` set, a second batch and a second
 *    retrieval. Deriving the child id DETERMINISTICALLY from the user's own operation id is what makes
 *    a retry a retry.
 *
 * 🔴 `M15` never INVENTS an operation id of its own either: the caller supplies one, and every child
 *    is a pure function of it. So "the UI submitted this once" is expressible, and the modules'
 *    existing ledgers do the rest.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O, NO randomness.
 */

/**
 * The `D9` steps that own a persisted write and therefore need a stable child operation id.
 *
 * 🔴 One member per WRITE, not per displayed step: ① and ② share `capture` because they are one
 *    service call, and ④⑤ share `cause-persistence` for the same reason.
 */
export type D9OperationStep =
  /** ①② - `beginCapture`. */
  | 'capture'
  /** ③ - the structured confirmation. */
  | 'confirmation'
  /** ② - one follow-up question. */
  | 'follow-up-question'
  /** ② - one follow-up dismissal. */
  | 'follow-up-abandon'
  /** ④⑤ - the persisted candidate causes. */
  | 'cause-persistence'
  /** ⑤ - the `Formal` save. */
  | 'formal-save'
  /** ⑧ - one `Insight` generation. */
  | 'insight-generation'
  /** ⑧ - one `Insight` lifecycle action, keyed by the target. */
  | 'insight-action'
  /** ⑨ - one `Hypothesis` generation. */
  | 'hypothesis-generation'
  /** ⑨ - one `Hypothesis` lifecycle action, keyed by the target. */
  | 'hypothesis-action'
  /** Any archive / unarchive write. */
  | 'archive';

export const D9_OPERATION_STEPS: readonly D9OperationStep[] = [
  'capture',
  'confirmation',
  'follow-up-question',
  'follow-up-abandon',
  'cause-persistence',
  'formal-save',
  'insight-generation',
  'insight-action',
  'hypothesis-generation',
  'hypothesis-action',
  'archive',
];

const SEPARATOR = '#';

/**
 * The stable child operation id of one step.
 *
 * 🔴 Pure and total: the same (`operation_id`, `step`) pair always yields the same child id, so a
 *    retry is recognised as a retry by the module's own idempotency ledger.
 * 🔴 `discriminator` distinguishes TWO actions of the SAME step inside one user operation (e.g.
 *    accepting two different `Insight`s). It defaults to the empty string, and an empty discriminator
 *    is dropped so the common case stays readable.
 */
export function childOperationId(
  operation_id: string,
  step: D9OperationStep,
  discriminator = '',
): string {
  return discriminator.length === 0
    ? `${operation_id}${SEPARATOR}${step}`
    : `${operation_id}${SEPARATOR}${step}${SEPARATOR}${discriminator}`;
}

/**
 * The step ⑥ handle.
 *
 * 🔴 Step ⑥ has no `operation_id` of its own: `M6` REPLACES the current derivation as a whole and
 *    keeps no ledger. The automatic trigger is therefore made idempotent one level up - by the
 *    `promotion_happened` test in `saveFormalAttempt` - rather than by minting an id nothing consumes.
 *    This function exists so the naming stays explicit and greppable.
 */
export function retrievalStepLabel(operation_id: string): string {
  return childOperationId(operation_id, 'formal-save', 'auto-retrieval');
}
