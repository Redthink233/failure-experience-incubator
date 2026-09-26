/**
 * M10 ｜ Provider response normalization - the ONE classification both network shapes agree on.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : Proxy 的 `THIN` 允许项 = request normalization / provider adapter forwarding /
 *                       **response normalization** / timeout·error mapping / 必要的 schema transport
 *   - docs/07 §5.12.1 / §5.12.3
 *   - AC-144 / AC-149 / AC-150 / AC-151
 *
 * ── WHY THIS MODULE EXISTS (S01-W1-INTEGRATE) ───────────────────────────────────────
 * The status/body classification ("is this a redirect? an error status? an unparseable body? a
 * usable payload?") is a property of the normalized RESULT contract, not of the proxy: the browser
 * adapter (`M11`) and the thin proxy (`M12`) must not be able to disagree about it, because
 * `follow_redirects: false` and "provider error bodies are never relayed" are shared guarantees.
 *
 * 🔴 WHAT IS **NOT** HERE: the target policy / SSRF guard / allowlist decision does NOT belong to
 *    `M10`. A redirect therefore leaves this module as the bare fact `kind === 'redirect'`; deciding
 *    WHICH redirect target is or is not acceptable is `M12` policy
 *    (`src/server/proxy/target-policy.ts`) and is enriched there. That is what keeps the dependency
 *    direction strictly `src/server/proxy/** → src/ai/**` (asserted by
 *    `src/tests/proxy/dependency-direction.test.ts`).
 *
 * 🔴 No credential, no host, no URL and no provider body fragment is ever interpolated into a
 *    message: the error text comes from the fixed table in `result.ts`.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import { aiError } from './result.js';
import type { AiError } from './result.js';
import type { ProviderPath } from './capability.js';

/** The four mutually exclusive outcomes of looking at a provider HTTP response. */
export type ProviderResponseClass = 'ok' | 'redirect' | 'http_error' | 'unparseable';

export interface NormalizedProviderResponse {
  /** `redirect` covers BOTH a literal 3xx and the browser's opaque `status === 0`. */
  readonly kind: ProviderResponseClass;
  /** The observed status; `0` is preserved (never coerced), so the caller can report it honestly. */
  readonly http_status: number;
  /** The usable payload. Non-empty only when `kind === 'ok'`. */
  readonly text: string;
}

/**
 * Classifies an already-received HTTP response.
 *
 * Order is deliberate and shared:
 *   ① `0`        - a browser answers an opaque redirect this way; it must never read as success;
 *   ② `3xx`      - a literal redirect;
 *   ③ outside 2xx - a provider error status;
 *   ④ empty body - a 2xx that carries nothing parseable;
 *   ⑤ otherwise  - the payload.
 *
 * 🔴 It performs NO network access and resolves NO DNS: it is a pure function of two values.
 */
export function normalizeProviderResponse(status: number, body_text: string): NormalizedProviderResponse {
  if (status === 0) {
    return { kind: 'redirect', http_status: 0, text: '' };
  }
  if (status >= 300 && status < 400) {
    return { kind: 'redirect', http_status: status, text: '' };
  }
  if (status < 200 || status >= 300) {
    return { kind: 'http_error', http_status: status, text: '' };
  }
  if (body_text.trim().length === 0) {
    return { kind: 'unparseable', http_status: status, text: '' };
  }
  return { kind: 'ok', http_status: status, text: body_text };
}

/**
 * The normalized `AiError` for a NON-ok classification.
 *
 * 🔴 A provider error BODY is never passed in and therefore can never be relayed: only the class and
 *    the status survive. The `redirect` case maps to the existing `PROXY_REDIRECT_NOT_FOLLOWED`
 *    code, which both network shapes already report (a redirect is never followed anywhere in V1).
 */
export function providerResponseError(
  path: ProviderPath,
  kind: Exclude<ProviderResponseClass, 'ok'>,
  http_status: number,
): AiError {
  if (kind === 'redirect') {
    return aiError('PROXY_REDIRECT_NOT_FOLLOWED', 'redirect_blocked', {
      path,
      http_status: http_status === 0 ? null : http_status,
    });
  }
  if (kind === 'unparseable') {
    return aiError('PROVIDER_RESPONSE_NOT_JSON', 'response_shape', { path, http_status });
  }
  return aiError('PROVIDER_HTTP_ERROR', 'http_status', { path, http_status });
}
