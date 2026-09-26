/**
 * S01 ｜ `M7` identity helpers: `EvidenceRef.evidence_ref_id` and the evidence owner id.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
 *   - §3.1 logical ID names (`evidence_ref_id` is one of them);
 *   - §3.2 hard rules 1–3: globally unique, stable, NEVER reused, and NEVER derived from a
 *     file name, a title, a text similarity or a list position;
 *   - §5.1 `owner_id` MUST be an `Insight` or a `Hypothesis` id.
 *
 * Gate C Plan §J.1 row 6 + the M7 task §17:
 *   - the prefix set and the id body format are IMPLEMENTATION PARAMETERS;
 *   - the `EREF` prefix is deliberately **M7-local**. The global `ID_PREFIXES` table in
 *     `src/domain/ids/object-id.ts` is frozen (`WS_ / PRJ_ / ATT_ / INS_ / HYP_`) and this module
 *     MUST NOT add to it, because widening the closed `ObjectId` prefix union would change the
 *     type of every existing object reference in the repository.
 *
 * 🔴 Identity is minted from the shared `newIdBody()` ULID factory, so an `EvidenceRef` id is
 *    unique, non-reusable and INDEPENDENT of any array index, display order or reference count.
 * 🔴 There is deliberately no `newEvidenceRefIdFor(index)` style overload: identity never reads a
 *    position.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 * 🔴 `M7` calls NO model (`M10`) - this module is a deterministic identity helper.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import { isObjectIdOfKind } from '../../domain/ids/object-id.js';
import { isIdBody, newIdBody } from '../../domain/ids/ulid.js';
import type { EvidenceOwnerId } from '../../domain/types/evidence-ref.js';

/** M7-LOCAL prefix for an `EvidenceRef` id. Never added to the global `ID_PREFIXES` table. */
export const EVIDENCE_REF_ID_PREFIX = 'EREF';

const EVIDENCE_REF_ID_SEPARATOR = '_';

/**
 * Mints one `evidence_ref_id`.
 *
 * 🔴 The ONLY identity source of a reference. Two references created from byte-identical input
 *    still receive different ids (task §33 `ID4`), and the id carries no position (task §33
 *    `ID2`/`ID3`).
 */
export function newEvidenceRefId(): string {
  return `${EVIDENCE_REF_ID_PREFIX}${EVIDENCE_REF_ID_SEPARATOR}${newIdBody()}`;
}

/** `true` only for the strict generated format `EREF_<26-char ULID body>`. */
export function isEvidenceRefId(value: string): boolean {
  const separatorIndex = value.indexOf(EVIDENCE_REF_ID_SEPARATOR);
  if (separatorIndex !== EVIDENCE_REF_ID_PREFIX.length) {
    return false;
  }
  if (value.slice(0, separatorIndex) !== EVIDENCE_REF_ID_PREFIX) {
    return false;
  }
  return isIdBody(value.slice(separatorIndex + 1));
}

/**
 * Narrowing guard for `EvidenceRef.owner_id` (§5.1): only an `INS_` or a `HYP_` id may own a
 * reference.
 *
 * 🔴 A caller can therefore never pass the source `Attempt` id (or any other `ATT_` id) as
 *    `owner_id` - the value is refused instead of being written into a reference (task §16).
 */
export function toEvidenceOwnerId(value: string): EvidenceOwnerId | null {
  if (isObjectIdOfKind(value, 'insight') || isObjectIdOfKind(value, 'hypothesis')) {
    return value as EvidenceOwnerId;
  }
  return null;
}

/** `true` when the value is exactly an `ATT_` object id - the only legal reference target (§7). */
export function isAttemptTargetId(value: string): value is ObjectId<'ATT'> {
  return isObjectIdOfKind(value, 'attempt');
}
