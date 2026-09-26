/**
 * M11 ｜ Browser `fetch` transport.
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D : `Browser Direct` = `Browser → 用户配置的 Provider`; "🔴 不得额外经过 Vercel Proxy"
 *   - contract §0.4 D : "限制请求体大小 / 超时"
 *   - docs/07 §5.12.1
 *   - AC-145 / AC-151
 *
 * 🔴 `redirect: 'manual'`. A browser then answers a redirect with an opaque response
 *    (`status === 0`, unreadable body) instead of transparently re-issuing the request to a new
 *    origin. Nothing in this project ever follows a redirect, in either network shape.
 *
 * 🔴 HONEST LIMITATION (must not be papered over): a browser explicitly does NOT tell JavaScript
 *    whether a failed `fetch` was blocked by CORS or failed at the network layer. `cause_kind`
 *    therefore reports `'cors'` only when the runtime message actually says so, and `'network'`
 *    otherwise. Both produce an explicit failure with a fixed message - neither is ever retried
 *    against a different URL, which is what AC-150 actually requires.
 */

import { TransportFailure } from '../../ai/provider/transport.js';
import type { HttpRequestDescriptor, HttpResponseDescriptor, HttpTransport, TransportFailureKind } from '../../ai/provider/transport.js';

export class BrowserFetchUnavailableError extends Error {
  constructor() {
    super('No fetch implementation is available in this runtime.');
    this.name = 'BrowserFetchUnavailableError';
  }
}

function hasFetch(): boolean {
  return typeof (globalThis as unknown as { fetch?: unknown }).fetch === 'function';
}

function classifyFetchFailure(error: unknown): TransportFailureKind {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'timeout';
  }
  const text = error instanceof Error ? error.message : '';
  if (/cors|blocked by/i.test(text)) {
    return 'cors';
  }
  return 'network';
}

function failureMessage(kind: TransportFailureKind): string {
  if (kind === 'timeout') {
    return 'The provider request timed out.';
  }
  if (kind === 'cors') {
    return 'The browser refused the cross-origin provider request.';
  }
  return 'The provider endpoint could not be reached.';
}

/** Creates the browser-direct transport. Throws when the runtime has no `fetch` at all. */
export function createBrowserFetchTransport(): HttpTransport {
  if (!hasFetch()) {
    throw new BrowserFetchUnavailableError();
  }
  return {
    kind: 'browser-fetch',
    async send(request: HttpRequestDescriptor): Promise<HttpResponseDescriptor> {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
      }, request.timeout_ms);
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: 'manual',
          signal: controller.signal,
        });
        const body_text = await response.text();
        return {
          status: response.status,
          location: response.headers.get('location'),
          body_text,
        };
      } catch (error) {
        const kind = classifyFetchFailure(error);
        throw new TransportFailure(kind, failureMessage(kind));
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
