/**
 * ULID-style stable identifier body.
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md §3.1 / §3.2
 *   - all IDs are globally unique, stable, never reused;
 *   - IDs are embedded in the object content, NEVER derived from file names
 *     (contract §3.2 / D-053 Persistence Mapping rule 1 / AC-137).
 *
 * Format: 26 chars Crockford Base32 = 48-bit millisecond timestamp (10 chars)
 *         + 80 bits randomness (16 chars).
 *
 * This module is a pure TypeScript helper: no file I/O, no DOM, no network, no LLM.
 * The only platform primitive used is the standard Web Crypto
 * `globalThis.crypto.getRandomValues` (available in Node >= 19 and in browsers);
 * it is NOT a DOM/browser-only API, and it is injectable for deterministic tests.
 *
 * NOTE: the ULID timestamp is an ordering aid for ID generation only. It is NOT a
 * user-visible version number and MUST NOT be presented as one
 * (contract §12 item 20 / AC-122).
 */

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TIME_CHARS = 10;
const RANDOM_CHARS = 16;

/** Total length of the generated ID body. */
export const ID_BODY_LENGTH = TIME_CHARS + RANDOM_CHARS;

/** Strict pattern: 26 Crockford Base32 characters (no I, L, O, U). */
export const ID_BODY_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/** Injectable dependencies - keeps the helper deterministic in tests. */
export interface IdFactoryDeps {
  /** Monotonic-enough clock in milliseconds. Default: `Date.now`. */
  readonly now?: () => number;
  /** Cryptographically strong random bytes. Default: Web Crypto `getRandomValues`. */
  readonly randomBytes?: (length: number) => Uint8Array;
}

function defaultRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function encodeTime(milliseconds: number): string {
  let remaining = Math.max(0, Math.floor(milliseconds));
  let out = '';
  for (let i = 0; i < TIME_CHARS; i += 1) {
    const mod = remaining % 32;
    out = CROCKFORD.charAt(mod) + out;
    remaining = (remaining - mod) / 32;
  }
  return out;
}

function encodeRandom(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < RANDOM_CHARS; i += 1) {
    out += CROCKFORD.charAt((bytes[i] ?? 0) % 32);
  }
  return out;
}

function incrementBase32(value: string): string {
  const chars = value.split('');
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    const index = CROCKFORD.indexOf(chars[i] ?? '0');
    if (index < 0) {
      return value;
    }
    if (index < CROCKFORD.length - 1) {
      chars[i] = CROCKFORD.charAt(index + 1);
      return chars.join('');
    }
    chars[i] = CROCKFORD.charAt(0);
  }
  // Overflow of the whole random part: extremely unlikely; fall back to a fresh value.
  return value;
}

/**
 * Creates a monotonic ULID body factory.
 * Two IDs generated within the same millisecond stay ordered and unique.
 */
export function createIdBodyFactory(deps: IdFactoryDeps = {}): () => string {
  const now = deps.now ?? ((): number => Date.now());
  const randomBytes = deps.randomBytes ?? defaultRandomBytes;
  let lastTime = -1;
  let lastRandom = '';

  return (): string => {
    const time = Math.floor(now());
    let random: string;
    if (time === lastTime && lastRandom.length === RANDOM_CHARS) {
      random = incrementBase32(lastRandom);
    } else {
      random = encodeRandom(randomBytes(RANDOM_CHARS));
    }
    lastTime = time;
    lastRandom = random;
    return encodeTime(time) + random;
  };
}

/** Default (module-level) ID body factory used by `newObjectId`. */
const defaultIdBodyFactory = createIdBodyFactory();

/** Generates one 26-character ULID body. */
export function newIdBody(): string {
  return defaultIdBodyFactory();
}

/** Strict structural check for a 26-character Crockford Base32 body. */
export function isIdBody(value: string): boolean {
  return ID_BODY_PATTERN.test(value);
}

/** Extracts the 48-bit timestamp (Unix ms) encoded in an ID body, or `null`. */
export function timestampOfIdBody(value: string): number | null {
  if (!isIdBody(value)) {
    return null;
  }
  const head = value.slice(0, TIME_CHARS);
  let result = 0;
  for (const char of head) {
    const index = CROCKFORD.indexOf(char);
    if (index < 0) {
      return null;
    }
    result = result * 32 + index;
  }
  return result;
}
