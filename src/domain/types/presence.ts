/**
 * Explicit presence of a value: 「未知 / 未提供」 MUST be explicitly expressed.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md §4.2 rule 7
 *   Hard requirements (only two):
 *     ① it MUST be expressed explicitly - never lost implicitly as "left blank /
 *        default value";
 *     ② it MUST NOT be mis-judged as similar - such a dimension does not participate
 *        in comparison, the comparison result must be marked "该维度未比对", and two
 *        unknowns MUST NOT be judged similar.
 *   🔴 The physical representation is deliberately NOT locked by the contract
 *      (Integrator item TQ08). This module is the S01-01 implementation choice.
 *
 * Related: §9.4 (`unknown` interception ⇒ `uncompared`) / AC-04 / AC-22 / AC-114.
 */

/** Presence state of a single field of an object. Always contains `unknown`. */
export type FieldPresenceState = 'present' | 'unknown';

export const FIELD_PRESENCE_STATES: readonly FieldPresenceState[] = ['present', 'unknown'];

export const PRESENT: 'present' = 'present';
export const UNKNOWN: 'unknown' = 'unknown';

/** A value the user / AI actually provided. */
export interface Provided<T> {
  readonly presence_state: 'present';
  readonly item: T;
}

/**
 * Explicit "unknown / not provided".
 * 🔴 Carries no value at all - it can never be read as an empty string,
 * an empty array or a default value.
 */
export interface Unprovided {
  readonly presence_state: 'unknown';
}

export type MaybeProvided<T> = Provided<T> | Unprovided;

/** Frozen shared singleton for the "unknown / not provided" state. */
export const UNPROVIDED: Unprovided = Object.freeze({ presence_state: 'unknown' as const });

export function provided<T>(item: T): Provided<T> {
  return { presence_state: 'present', item };
}

/** Explicitly marks a value as 「未知 / 未提供」. Use this instead of omitting a key. */
export function unprovided(): Unprovided {
  return UNPROVIDED;
}

export function presenceStateOf<T>(value: MaybeProvided<T>): FieldPresenceState {
  return value.presence_state;
}

export function isProvided<T>(value: MaybeProvided<T>): value is Provided<T> {
  return value.presence_state === 'present';
}

export function isUnprovided<T>(value: MaybeProvided<T>): value is Unprovided {
  return value.presence_state === 'unknown';
}

/** The wrapped value, or `null` when explicitly unknown. Never a default value. */
export function valueOrNull<T>(value: MaybeProvided<T>): T | null {
  return value.presence_state === 'present' ? value.item : null;
}

/**
 * §9.4 `unknown` interception (STRUCTURAL rule, not an AI output):
 * if either side is `unknown`, the dimension MUST be `uncompared` and MUST NOT
 * enter the `matched` / `compared_not_matched` semantic judgement.
 * Two unknowns still must NOT be `matched` (AC-22 / AC-114 / D-025).
 */
export function isUnknownIntercepted(
  left: FieldPresenceState,
  right: FieldPresenceState,
): boolean {
  return left === 'unknown' || right === 'unknown';
}
