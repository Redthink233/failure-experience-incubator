/**
 * S01-03 ｜ `derivation_id` - the identity of ONE current Retrieval Derivation.
 *
 * Contract: §3.2 (identifiers are stable and unique; a reference/identity is never a list position)
 * and §25 of the S01-03 task.
 *
 * 🔴 NON-POSITIONAL: the identity is `<source_attempt_id>:retrieval:<26-char ULID body>`. It can
 *    never be a candidate index, a retrieval count, an array length, a timestamp position or a
 *    display rank - and `isRetrievalDerivationId` proves that structurally, so a caller cannot
 *    smuggle one in.
 * 🔴 It reuses the existing `newIdBody()` (the same 26-character Crockford body every core object
 *    id uses). No second random mechanism, no counter and no user-visible number is introduced
 *    (AC-122).
 * 🔴 An explicit rerun mints a NEW identity and replaces the current record as a whole. The old
 *    identity is not kept as a selectable earlier version.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import { isIdBody, newIdBody } from '../../domain/ids/ulid.js';

/** Middle segment of the identity. A literal, never a numeric counter. */
export const RETRIEVAL_DERIVATION_ID_SEGMENT = 'retrieval' as const;

const SEGMENT_COUNT = 3;

/** Mints a fresh, non-positional derivation identity for one source Attempt. */
export function newRetrievalDerivationId(source_attempt_id: string): string {
  return `${source_attempt_id}:${RETRIEVAL_DERIVATION_ID_SEGMENT}:${newIdBody()}`;
}

/**
 * Structural check of a derivation identity.
 *
 * When `source_attempt_id` is supplied the identity must belong to that source - so a persisted
 * document whose identity names a different Attempt is refused instead of silently accepted.
 */
export function isRetrievalDerivationId(value: string, source_attempt_id?: string): boolean {
  const segments = value.split(':');
  if (segments.length !== SEGMENT_COUNT) {
    return false;
  }
  const [owner, kind, body] = segments;
  if (owner === undefined || kind === undefined || body === undefined) {
    return false;
  }
  if (kind !== RETRIEVAL_DERIVATION_ID_SEGMENT) {
    return false;
  }
  if (owner.length === 0 || (source_attempt_id !== undefined && owner !== source_attempt_id)) {
    return false;
  }
  // The body must be a generated 26-character ULID body - never an index, an ordinal or a count.
  return isIdBody(body);
}
