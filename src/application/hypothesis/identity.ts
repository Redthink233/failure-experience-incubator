/**
 * S01 ｜ `M9` identity helpers and the PATH-SAFE encoding of an `operation_id`.
 *
 * Contract: §3.1 (logical ID names), §3.2 rules 1–3 (globally unique, stable, NEVER reused, NEVER
 * derived from a file name, a title, a text similarity or a list position), §2.4 / `D-051` (a batch
 * relation is NOT a version number), AC-122 (no version system).
 *
 * 🔴 `hypothesis_id` uses the SHARED, FROZEN `HYP_` prefix of `src/domain/ids/object-id.ts`: a
 *    `Hypothesis` is a first-class object with its own id space, so no new prefix is invented here.
 * 🔴 The batch id and the operation key are deliberately **M9-LOCAL**: the global `ID_PREFIXES` table
 *    is frozen (`WS_ / PRJ_ / ATT_ / INS_ / HYP_`) and MUST NOT be widened - the same discipline as
 *    `M7`'s `EREF_` and `M8`'s `INSB_`.
 * 🔴 NO counter, NO ordinal and NO "generation number" exists anywhere in this module: identity
 *    never reads a position (§35 / AC-122).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ObjectId } from '../../domain/ids/object-id.js';
import { isObjectIdOfKind, newObjectId } from '../../domain/ids/object-id.js';
import { isIdBody, newIdBody } from '../../domain/ids/ulid.js';

/* ------------------------------------------------------------------ *
 * 1. `hypothesis_id`
 * ------------------------------------------------------------------ */

/** Mints one `Hypothesis` identity. 🔴 The `HYP_` prefix is the frozen shared one. */
export function newHypothesisId(): ObjectId<'HYP'> {
  return newObjectId('hypothesis');
}

/** `true` only for a well-formed `HYP_` object id. */
export function isHypothesisId(value: string): value is ObjectId<'HYP'> {
  return isObjectIdOfKind(value, 'hypothesis');
}

/** Narrows a runtime string to a `Hypothesis` id, or `null` (never a substitute). */
export function toHypothesisId(value: string): ObjectId<'HYP'> | null {
  return isHypothesisId(value) ? value : null;
}

/* ------------------------------------------------------------------ *
 * 2. Generation batch identity
 * ------------------------------------------------------------------ */

/** M9-LOCAL middle segment of a batch identity. A literal, never a numeric counter. */
export const HYPOTHESIS_BATCH_ID_SEGMENT = 'hypothesis-batch' as const;

const BATCH_SEGMENT_COUNT = 3;

/**
 * Mints a fresh, non-positional batch identity for one source `Attempt`.
 *
 * 🔴 The identity contains the SOURCE `attempt_id` so "this batch belongs to that record" is
 *    structurally checkable, and a 26-character ULID body so two explicit generations of the same
 *    record can never collide. It contains NO ordinal and NO timestamp counter.
 */
export function newHypothesisBatchId(source_attempt_id: string): string {
  return `${source_attempt_id}:${HYPOTHESIS_BATCH_ID_SEGMENT}:${newIdBody()}`;
}

/** Structural check of a batch identity, optionally bound to its source record. */
export function isHypothesisBatchId(value: string, source_attempt_id?: string): boolean {
  const segments = value.split(':');
  if (segments.length !== BATCH_SEGMENT_COUNT) {
    return false;
  }
  const [owner, kind, body] = segments;
  if (owner === undefined || kind === undefined || body === undefined) {
    return false;
  }
  if (kind !== HYPOTHESIS_BATCH_ID_SEGMENT) {
    return false;
  }
  if (owner.length === 0 || (source_attempt_id !== undefined && owner !== source_attempt_id)) {
    return false;
  }
  return isIdBody(body);
}

/* ------------------------------------------------------------------ *
 * 3. The durable operation anchor key (§36)
 * ------------------------------------------------------------------ */

const SAFE_TOKEN_CHARACTER = /^[A-Za-z0-9_-]$/;

/**
 * Percent-encodes one `operation_id` into a PATH-SAFE, **INJECTIVE** token.
 *
 * 🔴 INJECTIVITY IS THE POINT: a lossy sanitisation (dropping unsafe characters, or a hash) could
 *    map two DIFFERENT operation ids onto ONE anchor path, which would make 「同 operation 重放」
 *    indistinguishable from 「两个不同 operation」 - and then a legitimate second operation would
 *    silently be treated as a replay. Every character outside `[A-Za-z0-9_-]` is therefore encoded
 *    as `~HH` (two hex digits), and `~` itself is encoded too, so the mapping is reversible.
 */
export function encodeOperationIdToken(operation_id: string): string {
  let out = '';
  for (const character of operation_id) {
    if (SAFE_TOKEN_CHARACTER.test(character)) {
      out += character;
      continue;
    }
    const code = character.codePointAt(0) ?? 0;
    /* A non-ASCII character is encoded per UTF-8 byte, so the token stays ASCII and path-safe. */
    const bytes =
      code <= 0x7f
        ? [code]
        : code <= 0x7ff
          ? [0xc0 | (code >> 6), 0x80 | (code & 0x3f)]
          : code <= 0xffff
            ? [0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f)]
            : [
                0xf0 | (code >> 18),
                0x80 | ((code >> 12) & 0x3f),
                0x80 | ((code >> 6) & 0x3f),
                0x80 | (code & 0x3f),
              ];
    for (const byte of bytes) {
      out += `~${byte.toString(16).padStart(2, '0').toUpperCase()}`;
    }
  }
  return out;
}

/** The lead character of one `~HH` group, and the width of the group in characters. */
const ESCAPE_LEAD = '~';
const ESCAPE_GROUP_WIDTH = 3;

/** Reads one `~HH` group at `at`, or `null` when the group is malformed or missing. */
function readEscapedByte(token: string, at: number): number | null {
  if (token[at] !== ESCAPE_LEAD) {
    return null;
  }
  const pair = token.slice(at + 1, at + ESCAPE_GROUP_WIDTH);
  if (pair.length !== 2 || !/^[0-9A-F]{2}$/.test(pair)) {
    return null;
  }
  return Number.parseInt(pair, 16);
}

/**
 * Decodes a token produced by {@link encodeOperationIdToken}. Returns `null` when malformed.
 *
 * 🔴 ONE CODE POINT IS READ AT A TIME: the leading `~HH` byte of a group decides how many continuation
 *    bytes follow, and the decoder then requires EXACTLY that many - each of them a real continuation
 *    byte (`10xxxxxx`). Anything else is refused instead of guessed.
 * 🔴 WHY NOT "collect EVERY consecutive `~HH` group, then decode the run": that greedy shape MERGES two
 *    ADJACENT multi-byte characters into one impossible byte run, so it answered `null` for a perfectly
 *    valid token. An `operation_id` is free text, so 「操作」 and 「操作一」 are legal inputs; the greedy
 *    decoder rejected both (`M9-HYGIENE-01`, repaired here).
 * 🔴 WHAT THIS BUYS: the exact roundtrip `decode(encode(x)) === x` for every input, which is what keeps
 *    the anchor key of {@link hypothesisOperationKey} injective - the mapping itself was never lossy,
 *    only its inverse was unreadable.
 * 🔴 `encodeOperationIdToken` IS DELIBERATELY UNCHANGED by this repair: every already-persisted
 *    `hypotheses/operations/<operation_key>.json` anchor keeps its exact path.
 * 🔴 WHY THIS IS IMPLEMENTED LOCALLY INSTEAD OF REUSING `M8`'s PROVEN DECODER: the dependency direction
 *    `M6` → `M7` → `M8` → `M9` is one-way, and the static audit of this module asserts that the ONLY
 *    `M8` import inside all of `M9` is the TYPE-ONLY read model in `types.ts`. Importing a runtime
 *    helper from `M8` here would create a second, business-level edge - so `M9` implements the SAME
 *    technical protocol on its own, which is a codec and carries no product rule.
 */
export function decodeOperationIdToken(token: string): string | null {
  const codePoints: number[] = [];
  let index = 0;

  while (index < token.length) {
    const character = token[index];
    if (character === undefined) {
      return null;
    }
    if (character !== ESCAPE_LEAD) {
      if (!SAFE_TOKEN_CHARACTER.test(character)) {
        return null;
      }
      codePoints.push(character.codePointAt(0) ?? 0);
      index += 1;
      continue;
    }

    const first = readEscapedByte(token, index);
    if (first === null) {
      return null;
    }
    index += ESCAPE_GROUP_WIDTH;

    /* `0xxxxxxx` = a 1-byte code point; `110xxxxx` / `1110xxxx` / `11110xxx` = 1 / 2 / 3 continuations. */
    const continuationCount =
      first < 0x80
        ? 0
        : (first & 0xe0) === 0xc0
          ? 1
          : (first & 0xf0) === 0xe0
            ? 2
            : (first & 0xf8) === 0xf0
              ? 3
              : -1;
    if (continuationCount < 0) {
      return null;
    }

    let code =
      first &
      (continuationCount === 0
        ? 0x7f
        : continuationCount === 1
          ? 0x1f
          : continuationCount === 2
            ? 0x0f
            : 0x07);
    for (let step = 0; step < continuationCount; step += 1) {
      const byte = readEscapedByte(token, index);
      if (byte === null || (byte & 0xc0) !== 0x80) {
        return null;
      }
      code = (code << 6) | (byte & 0x3f);
      index += ESCAPE_GROUP_WIDTH;
    }
    if (code > 0x10ffff) {
      return null;
    }
    codePoints.push(code);
  }

  return String.fromCodePoint(...codePoints);
}

/**
 * The stable, non-positional identity of ONE generation operation.
 *
 * 🔴 Bound to the source record as well, so the same `operation_id` used for a DIFFERENT record
 *    receives a different anchor path and can be reported as `OPERATION_ID_CONFLICT` instead of
 *    silently replaying the first record's batch.
 */
export function hypothesisOperationKey(
  source_attempt_id: string,
  operation_id: string,
): string {
  return `${source_attempt_id}__${encodeOperationIdToken(operation_id)}`;
}
