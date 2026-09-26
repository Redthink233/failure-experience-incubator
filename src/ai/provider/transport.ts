/**
 * M10 ｜ Transport boundary (normalized request / response descriptors).
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : `Provider-dependent Hybrid`; Proxy 只做 forwarding / timeout·error mapping;
 *                        "限制请求体大小 / 超时；不转发任意自定义请求头；不返回原始错误细节"
 *   - AC-148 / AC-149 / AC-151
 *
 * 🔴 `follow_redirects` is the LITERAL type `false`. A redirect can therefore never be followed
 *    automatically - by either the browser adapter or the server proxy - which is the structural
 *    form of AC-151's "不得跟随重定向至 allowlist 之外".
 *
 * 🔴 `headers` is a closed `Readonly<Record<string, string>>` produced by the adapter from a fixed
 *    list; there is deliberately no "forward these client headers" helper anywhere in the tree.
 *
 * 🔴 `timeout_ms` and the body-size ceiling belong to the transport implementation, so the timeout
 *    requirement ("限制请求体大小 / 超时") is a property of the injected transport instead of an
 *    unenforceable comment.
 *
 * Framework-neutral: NO DOM, NO Node runtime API. `fetch` / `node:http` are used only by the
 * concrete transports in `src/browser/ai/**` (M11) and `api/proxy/**` (M12).
 */

export interface HttpRequestDescriptor {
  readonly url: string;
  readonly method: 'POST';
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly timeout_ms: number;
  readonly follow_redirects: false;
}

export interface HttpResponseDescriptor {
  readonly status: number;
  /** `Location` is surfaced so the CALLER can classify it; nothing follows it automatically. */
  readonly location: string | null;
  readonly body_text: string;
}

export type TransportFailureKind = 'network' | 'timeout' | 'cors';

export class TransportFailure extends Error {
  readonly cause_kind: TransportFailureKind;

  constructor(cause_kind: TransportFailureKind, message: string) {
    super(message);
    this.name = 'TransportFailure';
    this.cause_kind = cause_kind;
  }
}

/**
 * The single seam every runtime implements: M11 supplies a browser implementation, M12 supplies a
 * Node implementation, and tests supply a deterministic mock (all network tests in S01-04 are
 * `NOT_A_REAL_LLM_OUTPUT` fixtures - no real provider is ever called).
 */
export interface HttpTransport {
  /** Implementation tag, e.g. `browser-fetch` / `node-fetch` / `mock`. */
  readonly kind: string;
  send(request: HttpRequestDescriptor): Promise<HttpResponseDescriptor>;
}

/**
 * Injects the user's credential into an already-authorized descriptor.
 *
 * 🔴 This is the ONLY sanctioned way a secret reaches a header, and it returns a NEW descriptor:
 *    the descriptor that may be logged (`authorizeProxyCall().outbound`) never contains it.
 *    The header name/value pair is created here and nowhere else, so a grep for
 *    `authorization` in the adapter layer is a complete review of credential transmission.
 */
export function withBearerCredential(
  descriptor: HttpRequestDescriptor,
  secret: string,
): HttpRequestDescriptor {
  return {
    ...descriptor,
    headers: { ...descriptor.headers, authorization: `Bearer ${secret}` },
  };
}

/** Default request timeout for V1 (implementation parameter - not a product Decision). */
export const DEFAULT_TIMEOUT_MS = 60_000;

/** Default outbound body ceiling (implementation parameter - not a product Decision). */
export const DEFAULT_MAX_BODY_BYTES = 256 * 1024;

/** UTF-8 byte length without depending on `Buffer` / `TextEncoder` availability per scope. */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}
