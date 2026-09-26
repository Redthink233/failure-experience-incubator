/**
 * Stable object identifiers: `<PREFIX>_<ULID body>`.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md §3
 *   - §3.1 logical ID names: `attempt_id` / `insight_id` / `hypothesis_id` /
 *     `evidence_ref_id` / `event_id`;
 *   - §3.2 hard rules: globally unique; references MUST be by ID (never by text
 *     similarity, title matching or list position); archiving never invalidates an ID.
 *
 * Required prefixes for S01-01: WS_ / PRJ_ / ATT_ / INS_ / HYP_.
 * The prefix set and the ID body format are IMPLEMENTATION PARAMETERS
 * (Gate C Plan §J.1 row 6) - they do NOT create or change any product Decision.
 *
 * 🔴 There is NO user-visible version number anywhere in this module (AC-122).
 */

import { ID_BODY_LENGTH, isIdBody, newIdBody, timestampOfIdBody } from './ulid.js';

/** Logical object kinds that own an ID space. */
export const ID_PREFIXES = {
  workspace: 'WS',
  project: 'PRJ',
  attempt: 'ATT',
  insight: 'INS',
  hypothesis: 'HYP',
} as const;

export type IdKind = keyof typeof ID_PREFIXES;
export type IdPrefix = (typeof ID_PREFIXES)[IdKind];

export const ID_KINDS = Object.keys(ID_PREFIXES) as readonly IdKind[];

export const ID_PREFIX_VALUES: readonly IdPrefix[] = ID_KINDS.map(
  (kind) => ID_PREFIXES[kind],
);

/** Branded-looking string form of an object ID. */
export type ObjectId<P extends IdPrefix = IdPrefix> = `${P}_${string}`;

export interface ParsedObjectId<P extends IdPrefix = IdPrefix> {
  readonly id: ObjectId<P>;
  readonly kind: IdKind;
  readonly prefix: P;
  readonly body: string;
}

const SEPARATOR = '_';

function prefixToKind(prefix: string): IdKind | null {
  const found = ID_KINDS.find((kind) => ID_PREFIXES[kind] === prefix);
  return found ?? null;
}

/** Creates a new globally unique ID for the given logical object kind. */
export function newObjectId<K extends IdKind>(kind: K): ObjectId<(typeof ID_PREFIXES)[K]> {
  const prefix = ID_PREFIXES[kind];
  return `${prefix}${SEPARATOR}${newIdBody()}`;
}

/**
 * Lenient parse used for reading objects from disk:
 * a known prefix plus a non-empty body is enough to accept a hand-authored ID.
 * Use {@link isWellFormedObjectId} when a strict format assertion is required.
 */
export function parseObjectId<P extends IdPrefix>(value: string): ParsedObjectId<P> | null {
  const separatorIndex = value.indexOf(SEPARATOR);
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    return null;
  }
  const prefix = value.slice(0, separatorIndex);
  const kind = prefixToKind(prefix);
  if (kind === null) {
    return null;
  }
  return {
    id: value as ObjectId<P>,
    kind,
    prefix: prefix as P,
    body: value.slice(separatorIndex + 1),
  };
}

/** True when the value parses to a known prefix with a non-empty body. */
export function isObjectId(value: string): boolean {
  return parseObjectId(value) !== null;
}

/** True when the value parses AND its body matches the strict generated format. */
export function isWellFormedObjectId(value: string): boolean {
  const parsed = parseObjectId(value);
  return parsed !== null && isIdBody(parsed.body);
}

/** True when the value is an ID of the given logical kind. */
export function isObjectIdOfKind<K extends IdKind>(value: string, kind: K): boolean {
  const parsed = parseObjectId(value);
  return parsed !== null && parsed.kind === kind;
}

/** The logical kind encoded in an ID, or `null`. */
export function idKindOf(value: string): IdKind | null {
  return parseObjectId(value)?.kind ?? null;
}

/**
 * Narrows an arbitrary string to an ID of the given kind.
 * Returns `null` instead of throwing so callers can produce schema errors with context.
 */
export function toObjectId<K extends IdKind>(
  value: string,
  kind: K,
): ObjectId<(typeof ID_PREFIXES)[K]> | null {
  return isObjectIdOfKind(value, kind)
    ? (value as ObjectId<(typeof ID_PREFIXES)[K]>)
    : null;
}

/** Ordering aid derived from the ID body timestamp; `null` when unavailable. */
export function idTimestampOf(value: string): number | null {
  const parsed = parseObjectId(value);
  return parsed === null ? null : timestampOfIdBody(parsed.body);
}

/** Assertion helper for internal invariants (never used for control flow on user input). */
export function assertObjectIdOfKind<K extends IdKind>(
  value: string,
  kind: K,
): ObjectId<(typeof ID_PREFIXES)[K]> {
  if (!isObjectIdOfKind(value, kind)) {
    throw new Error(
      `Expected an ${String(ID_PREFIXES[kind])}_ prefixed object id, received "${value}".`,
    );
  }
  return value as ObjectId<(typeof ID_PREFIXES)[K]>;
}

export { ID_BODY_LENGTH };
