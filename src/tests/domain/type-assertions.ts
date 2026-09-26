/**
 * Compile-time assertion helpers used by the S01-01 test suite.
 *
 * IMPLEMENTATION INVARIANT (not a product AC):
 * the shared domain vocabulary is enforced at the TYPE level as well as at runtime,
 * so a future edit cannot silently flatten `Draft` / `Formal` into a boolean, merge the
 * `Insight` state machine with the `Hypothesis` decision slot, or widen
 * `Fact` / `Extraction` / `Inference` into a two-value flag.
 *
 * References: contract §12 items 1 / 2 / 3 / 19 (Worker-forbidden-to-change semantics).
 * The assertions below are only meaningful while `npm run typecheck` passes.
 */

/** Fails compilation unless `T` is exactly `true`. */
export type AssertTrue<T extends true> = T;

export type KeysOf<T> = Extract<keyof T, string>;

/** `true` when `T` has none of the keys in `F` (exact key match). */
export type HasNoKey<T, F extends string> = Extract<KeysOf<T>, F> extends never ? true : false;

/** `true` when `A` and `B` are mutually assignable. */
export type IsExactly<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** `true` when `A` is NOT assignable to `B`. */
export type IsNotAssignable<A, B> = [A] extends [B] ? false : true;

/** `true` when the two unions share no member. */
export type Disjoint<A, B> = Extract<A, B> extends never ? true : false;

/** Keys that must never appear on any persisted or shared product structure. */
export type ForbiddenProductKeys =
  | 'version'
  | 'version_number'
  | 'revision'
  | 'revision_history'
  | 'rollback'
  | 'diff'
  | 'edit_count'
  | 'similarity'
  | 'similarity_score'
  | 'score'
  | 'confidence'
  | 'percentage'
  | 'grade'
  | 'archived_at_ref'
  | 'deleted'
  | 'deleted_at';
