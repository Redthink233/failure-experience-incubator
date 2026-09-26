/**
 * S01 ｜ `M8` identities: the generation-batch id and the `InsightStateEvent` id.
 *
 * Contract: §3.1 (`event_id` is a logical id), §3.2 rules 1–3 (globally unique, stable, NEVER
 * derived from a file name, a title, a text similarity or a list position), §2.4 / `D-051`
 * (a batch relation is NOT a version number), AC-122 (no version system).
 *
 * 🔴 Both identities are minted from the shared `newIdBody()` ULID factory, so they are unique,
 *    non-reusable and INDEPENDENT of any array index, display order or count.
 * 🔴 `INSB_` is deliberately **M8-LOCAL**. The global `ID_PREFIXES` table
 *    (`WS_ / PRJ_ / ATT_ / INS_ / HYP_`) is frozen and this module MUST NOT add to it - widening
 *    that closed union would change the type of every existing object reference in the
 *    repository. The same discipline as `M7`'s `EREF_` prefix.
 * 🔴 There is deliberately NO `newBatchIdFor(index)` style overload, and NO counter: a batch
 *    identity never reads a position (task §28 / §32).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import { isIdBody, newIdBody } from '../../domain/ids/ulid.js';

/* ------------------------------------------------------------------ *
 * 1. Generation batch
 * ------------------------------------------------------------------ */

/** M8-LOCAL middle segment of a batch identity. A literal, never a numeric counter. */
export const INSIGHT_BATCH_ID_SEGMENT = 'insight-batch' as const;

const BATCH_SEGMENT_COUNT = 3;

/**
 * Mints a fresh, non-positional batch identity for one source `Attempt`.
 *
 * 🔴 The identity contains the SOURCE `attempt_id` so that "this batch belongs to that record"
 *    is structurally checkable, and a 26-character ULID body so that two explicit generations of
 *    the same record can never collide.
 *    It contains NO ordinal, NO "generation number" and NO timestamp counter.
 */
export function newInsightBatchId(source_attempt_id: string): string {
  return `${source_attempt_id}:${INSIGHT_BATCH_ID_SEGMENT}:${newIdBody()}`;
}

/**
 * Structural check of a batch identity.
 *
 * When `source_attempt_id` is supplied the identity must belong to that source - so a persisted
 * document whose identity names a different `Attempt` is refused instead of silently accepted.
 */
export function isInsightBatchId(value: string, source_attempt_id?: string): boolean {
  const segments = value.split(':');
  if (segments.length !== BATCH_SEGMENT_COUNT) {
    return false;
  }
  const [owner, kind, body] = segments;
  if (owner === undefined || kind === undefined || body === undefined) {
    return false;
  }
  if (kind !== INSIGHT_BATCH_ID_SEGMENT) {
    return false;
  }
  if (owner.length === 0 || (source_attempt_id !== undefined && owner !== source_attempt_id)) {
    return false;
  }
  // The body must be a generated 26-character ULID body - never an index, an ordinal or a count.
  return isIdBody(body);
}

/* ------------------------------------------------------------------ *
 * 2. The durable operation anchor key (M8-HARDENING-01)
 * ------------------------------------------------------------------ */

const SAFE_TOKEN_CHARACTER = /^[A-Za-z0-9_-]$/;

/**
 * Percent-encodes one `operation_id` into a PATH-SAFE, **INJECTIVE** token.
 *
 * 🔴 INJECTIVITY IS THE POINT: a lossy sanitisation (dropping unsafe characters, or a hash) could
 *    map two DIFFERENT operation ids onto ONE anchor path, which would make 「同 operation 重放」
 *    indistinguishable from 「两个不同 operation」 - and then a legitimate second generation would
 *    silently be treated as a replay of the first. Every character outside `[A-Za-z0-9_-]` is
 *    therefore encoded as `~HH` (two hex digits), and `~` itself is encoded too, so the mapping is
 *    reversible.
 *
 * 🔴 WHY THIS IS DUPLICATED INSTEAD OF SHARED WITH `M9`: the encoder is a pure technical codec with
 *    no product rule, but the recovery protocol of `M8` must stay independent of `M9` - the dependency
 *    direction `M6 → M7 → M8 → M9` is one-way, and `M8` must not import `M9` (not even for a helper).
 *    A shared technical module would also have to be introduced into the frozen `M9` module that this
 *    task is not allowed to touch. `M8` therefore implements the SAME protocol on its own.
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

/**
 * Decodes a token produced by {@link encodeOperationIdToken}. Returns `null` when malformed.
 *
 * 🔴 ONE CODE POINT IS READ AT A TIME: the leading `~HH` byte decides how many continuation bytes
 *    follow. Reading greedily ("collect every consecutive `~HH` group, then decode") would MERGE two
 *    adjacent multi-byte characters into one invalid sequence and reject a perfectly valid token -
 *    which is a real defect, because an `operation_id` may legitimately contain Chinese text.
 */
export function decodeOperationIdToken(token: string): string | null {
  const codePoints: number[] = [];
  let index = 0;

  /** Reads one `~HH` group at `at`, or `null` when the group is malformed. */
  const readByte = (at: number): number | null => {
    if (token[at] !== '~') {
      return null;
    }
    const pair = token.slice(at + 1, at + 3);
    if (pair.length !== 2 || !/^[0-9A-F]{2}$/.test(pair)) {
      return null;
    }
    return Number.parseInt(pair, 16);
  };

  while (index < token.length) {
    const character = token[index];
    if (character === undefined) {
      return null;
    }
    if (character !== '~') {
      if (!SAFE_TOKEN_CHARACTER.test(character)) {
        return null;
      }
      codePoints.push(character.codePointAt(0) ?? 0);
      index += 1;
      continue;
    }

    const first = readByte(index);
    if (first === null) {
      return null;
    }
    index += 3;

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
      (continuationCount === 0 ? 0x7f : continuationCount === 1 ? 0x1f : continuationCount === 2 ? 0x0f : 0x07);
    for (let step = 0; step < continuationCount; step += 1) {
      const byte = readByte(index);
      if (byte === null || (byte & 0xc0) !== 0x80) {
        return null;
      }
      code = (code << 6) | (byte & 0x3f);
      index += 3;
    }
    if (code > 0x10ffff) {
      return null;
    }
    codePoints.push(code);
  }

  return String.fromCodePoint(...codePoints);
}

/**
 * The stable, non-positional identity of ONE step ⑧ generation operation.
 *
 * 🔴 Bound to the source record as well, so the same `operation_id` used for a DIFFERENT record
 *    receives a different anchor path and can be reported as `OPERATION_ID_CONFLICT` instead of
 *    silently replaying the first record's batch.
 * 🔴 NO counter, NO ordinal: the key is a pure function of (`source_attempt_id`, `operation_id`).
 */
export function insightOperationKey(source_attempt_id: string, operation_id: string): string {
  return `${source_attempt_id}__${encodeOperationIdToken(operation_id)}`;
}

/* ------------------------------------------------------------------ *
 * 3. `InsightStateEvent` id
 * ------------------------------------------------------------------ */

/** M8-LOCAL prefix for an `InsightStateEvent` id. Never added to the global `ID_PREFIXES` table. */
export const INSIGHT_STATE_EVENT_ID_PREFIX = 'IEV';

const EVENT_ID_SEPARATOR = '_';

/** Mints one `InsightStateEvent` identity. 🔴 No position, no count, no order is involved. */
export function newInsightStateEventId(): string {
  return `${INSIGHT_STATE_EVENT_ID_PREFIX}${EVENT_ID_SEPARATOR}${newIdBody()}`;
}

/** `true` only for the strict generated format `IEV_<26-char ULID body>`. */
export function isInsightStateEventId(value: string): boolean {
  const separatorIndex = value.indexOf(EVENT_ID_SEPARATOR);
  if (separatorIndex !== INSIGHT_STATE_EVENT_ID_PREFIX.length) {
    return false;
  }
  if (value.slice(0, separatorIndex) !== INSIGHT_STATE_EVENT_ID_PREFIX) {
    return false;
  }
  return isIdBody(value.slice(separatorIndex + 1));
}
