/**
 * M10 ｜ Credential references (opaque handles) - NEVER a persistable domain field.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D ("凭据持久化 = Session-only Credential"; 禁止载体逐项清单)
 *   - contract §0.4 A ("凭据不得落入任何 Workspace 文件 / 仓库 / 日志 / 报告 / 前端 Bundle")
 *   - docs/07 §5.12.2 (`D-056`), AC-133 / AC-134 / AC-155 / AC-156 / AC-157 / AC-158 / AC-162
 *
 * 🔴 Three separate concerns are deliberately NOT the same value:
 *      ① `CredentialRef`     - an OPAQUE HANDLE. Safe to pass through business layers,
 *                              safe to render, safe to persist (it carries no secret).
 *      ② `CredentialSecret`  - the secret itself. Held in a module-private WeakMap, so it has
 *                              NO own enumerable property: `JSON.stringify(secret)` === `{}`.
 *                              A secret therefore cannot leak through serialisation by accident.
 *      ③ `CredentialResolver`- the only place that turns ① into ②. Owned by M13 (browser) or
 *                              by the M12 server request lifecycle (never persisted).
 *
 * 🔴 `AiRequest` / `ProxyRequest` carry a `CredentialRef` (or nothing at all) - they NEVER
 *    carry a secret, so "credential as a persistable request field" is structurally impossible.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO storage, NO I/O.
 */

declare const credentialRefBrand: unique symbol;
declare const credentialSecretBrand: unique symbol;

/** Opaque, non-secret handle used to look a credential up. Opaque to business layers. */
export type CredentialRef = { readonly ref_id: string; readonly [credentialRefBrand]: true };

/** The secret itself. Never serialisable, never logged, never persisted as a plain field. */
export type CredentialSecret = { readonly [credentialSecretBrand]: true };

/** Secret payloads live outside the object graph so they cannot be enumerated or stringified. */
const SECRET_VALUES = new WeakMap<object, string>();

const MAX_REF_ID_LENGTH = 96;

export function credentialRef(ref_id: string): CredentialRef {
  if (ref_id.length === 0 || ref_id.length > MAX_REF_ID_LENGTH) {
    throw new Error(`Invalid credential ref id: must be 1-${MAX_REF_ID_LENGTH} characters.`);
  }
  return { ref_id } as CredentialRef;
}

export function credentialSecret(raw: string): CredentialSecret {
  if (raw.length === 0) {
    throw new Error('Refusing to build an empty credential secret.');
  }
  const secret = {} as CredentialSecret;
  SECRET_VALUES.set(secret, raw);
  return secret;
}

/** True when the value really is a secret produced by `credentialSecret`. */
export function isCredentialSecret(value: unknown): value is CredentialSecret {
  return typeof value === 'object' && value !== null && SECRET_VALUES.has(value);
}

/**
 * 🔴 The ONLY accessor of a raw secret value. The deliberately alarming name is the point:
 *    every call site is expected to be a request-building line inside an adapter, and every
 *    such call site is reviewable / greppable.
 *
 * Returns `null` for an unknown handle instead of throwing so that a transport path never has
 * to put the secret into an error message.
 */
export function revealCredentialSecret(secret: CredentialSecret): string | null {
  return SECRET_VALUES.get(secret) ?? null;
}

/** Constant used everywhere a secret must be replaced before it can leave the process. */
export const REDACTED = 'REDACTED';

/** The redaction label for a credential (never echoes any part of the secret). */
export function redactedCredential(): string {
  return REDACTED;
}

/**
 * Turns `ref` into a resolver. M13 (browser session store) and the M12 request lifecycle both
 * implement `CredentialResolver`; nothing else may hold a secret.
 */
export interface CredentialResolver {
  /** Implementation tag, e.g. `session-storage` / `request-lifecycle`. */
  readonly kind: string;
  /** Returns the secret for this handle, or `null` when the user never supplied one. */
  resolve(ref: CredentialRef): CredentialSecret | null;
}
