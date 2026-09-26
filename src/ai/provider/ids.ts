/**
 * M10 ｜ Provider identity.
 *
 * Contract basis (FROZEN):
 *   - docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md §0.4 D (LLM 接入边界, D-055 / D-056)
 *   - docs/07_TECH_ARCHITECTURE.md §5.12.1  ("Proxy 目标由 provider_id → 服务器端已注册
 *     Adapter → 固定 / allowlist Host 决定")
 *
 * 🔴 `ProviderId` is a BRANDED string. It is the ONLY value a client may use to select a
 *    server-side target. A request therefore cannot carry a "target" - it can only carry
 *    an identity that the SERVER resolves through its own registry (AC-146 / AC-148).
 *
 * 🔴 A `ProviderId` is NOT a URL, host, scheme or path. It never contains `:` / `/` so it can
 *    never be mistaken for - or silently upgraded into - a network target.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

declare const providerIdBrand: unique symbol;

/** Opaque provider identity. Compare by exact string value only. */
export type ProviderId = string & { readonly [providerIdBrand]: true };

/** Characters that would make an id ambiguous with a URL / host / path / port. */
const FORBIDDEN_ID_CHARACTERS = /[:/\\?#\s@]/;

const MAX_PROVIDER_ID_LENGTH = 64;

export class InvalidProviderIdError extends Error {
  readonly raw_id: string;

  constructor(raw_id: string) {
    super(`Invalid provider id: must be 1-${MAX_PROVIDER_ID_LENGTH} chars of [a-z0-9._-] with no URL-like separators.`);
    this.name = 'InvalidProviderIdError';
    this.raw_id = raw_id;
  }
}

/**
 * Builds a `ProviderId` from a raw string, rejecting anything that could be read as a target.
 * 🔴 Throws instead of normalising: a silently coerced id would make the allowlist lookup
 *    depend on string mangling rather than on an exact match.
 */
export function providerId(raw_id: string): ProviderId {
  if (raw_id.length === 0 || raw_id.length > MAX_PROVIDER_ID_LENGTH) {
    throw new InvalidProviderIdError(raw_id);
  }
  if (FORBIDDEN_ID_CHARACTERS.test(raw_id)) {
    throw new InvalidProviderIdError(raw_id);
  }
  if (!/^[A-Za-z0-9._-]+$/.test(raw_id)) {
    throw new InvalidProviderIdError(raw_id);
  }
  return raw_id.toLowerCase() as ProviderId;
}

/** Non-throwing variant used by the strict request parser (never used to build a target). */
export function isWellFormedProviderId(raw_id: unknown): raw_id is string {
  if (typeof raw_id !== 'string') {
    return false;
  }
  if (raw_id.length === 0 || raw_id.length > MAX_PROVIDER_ID_LENGTH) {
    return false;
  }
  return !FORBIDDEN_ID_CHARACTERS.test(raw_id) && /^[A-Za-z0-9._-]+$/.test(raw_id);
}
