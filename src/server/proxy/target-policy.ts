/**
 * M12 security foundation ｜ Target policy + SSRF guard (PURE).
 *
 * Contract basis (FROZEN):
 *   - contract §0.4 D  : "🔴 SSRF / Open Proxy 防护（硬约束）必须拒绝 localhost / 127.0.0.0/8 /
 *                        ::1 / RFC1918（10/8、172.16/12、192.168/16）/ link-local（含
 *                        169.254.169.254 等 metadata endpoint 形态）/ 非 http(s) scheme；
 *                        🔴 不得跟随重定向至 allowlist 之外；🔴 不得「黑名单 + 默认放行」"
 *   - docs/07 §5.12.1 / §5.12.3
 *   - AC-146 / AC-147 / AC-148 / AC-151
 *
 * ── WHY THIS FILE LIVES IN `src/server/proxy/**` (S01-W1-INTEGRATE) ──────────────────
 * It is `M12` pure policy, not part of the `M10` provider contract: it decides which NETWORK
 * DESTINATION a registered provider may reach, which the browser side has no say in. It therefore
 * sits on the server side of the boundary, and the only legal direction is
 * `src/server/proxy/** → src/ai/**` (the M10 contract it consults).
 *
 * 🔴 HISTORICAL NOTE (kept, not rewritten): until `S01-W1-INTEGRATE` this module lived in
 *    `src/ai/boundary/**`. The reason was mechanical - `tsconfig.test.json` had `rootDir: "src"`, so
 *    a test could not import `api/proxy/**` and the policy was parked where the test build could
 *    reach it. `S01-W1-INTEGRATE` removed that constraint by adding the independent
 *    `tsconfig.proxy-test.json` scope (`dist-proxy-test/`), so the policy could move to its correct
 *    owner. `src/ai/**` no longer contains or exports ANY of it.
 *
 * ── WHAT THIS FILE IS / IS NOT ──────────────────────────────────────────────────────
 * Pure functions only: no network, no DNS, no I/O, no DOM, no Node API.
 * 🔴 It does NOT resolve DNS. A hostname that is allowlisted but resolves to a private address
 *    is therefore NOT caught here. That gap is closed by the ALLOWLIST BEING THE PRIMARY GATE
 *    (exact registered hostname, `https` only) rather than by blocking. 🚫 This module must not
 *    be described as "SSRF 实测通过" - it is a policy unit, not a network experiment.
 */

/** Why a target was refused. Each value maps to one clause of AC-151 / AC-146. */
export type TargetBlockReason =
  | 'invalid_url'
  | 'empty_host'
  | 'scheme_not_http_or_https'
  | 'userinfo_present'
  | 'loopback_name'
  | 'ipv4_loopback'
  | 'ipv6_loopback'
  | 'unspecified_address'
  | 'rfc1918_10'
  | 'rfc1918_172'
  | 'rfc1918_192'
  | 'link_local'
  | 'ipv6_link_local'
  | 'ipv6_unique_local'
  | 'ipv6_not_globally_routable'
  | 'reserved_or_special'
  | 'metadata_endpoint'
  | 'host_not_allowlisted'
  | 'https_required'
  | 'port_not_allowed';

/**
 * One registered, server-side controlled provider endpoint.
 *
 * 🔴 `scheme` is the literal `'https'`: an allowlist entry cannot express a plaintext target,
 *    so "https requirement" is enforced by the TYPE, not by a runtime convention.
 * 🔴 `host` is an EXACT hostname. No wildcard, no suffix matching, no regex.
 *
 * 🔴 This is STRUCTURALLY the M10 registry's `ProxyEndpoint` (which adds the `path_prefix`), so a
 *    `ProviderRegistry.target_allowlist()` result is accepted here without any conversion and
 *    without `M10` having to know about this module.
 */
export interface AllowedTarget {
  readonly scheme: 'https';
  readonly host: string;
  /** `null` = only the scheme default port (443) is acceptable. */
  readonly port: number | null;
}

export type TargetPolicyVerdict =
  | { readonly kind: 'allowed'; readonly url: string; readonly host: string; readonly target: AllowedTarget }
  | { readonly kind: 'blocked'; readonly reason: TargetBlockReason; readonly host: string | null };

/** Deliberately narrow: only these two schemes may even be parsed as a candidate target. */
const ALLOWED_SCHEMES: readonly string[] = ['http:', 'https:'];

/** Host-name tripwires (defence in depth on top of the allowlist; see file header). */
const BLOCKED_HOST_SUFFIXES: readonly string[] = ['.localhost', '.local', '.internal', '.home.arpa'];
const BLOCKED_HOST_EXACT: readonly string[] = ['localhost', 'localhost.localdomain'];

/** Metadata-style service names (AC-151 "metadata endpoint 形态"). */
const METADATA_HOSTS: readonly string[] = [
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
  'instance-data.ec2.internal',
];

/** `URL.hostname` keeps the brackets of an IPv6 literal; classification works on the bare form. */
export function normaliseHostLiteral(hostname: string): string {
  const lowered = hostname.trim().toLowerCase();
  if (lowered.startsWith('[') && lowered.endsWith(']')) {
    return lowered.slice(1, -1);
  }
  return lowered;
}

function octetsOf(host: string): readonly [number, number, number, number] | null {
  const parts = host.split('.');
  const [a, b, c, d] = parts;
  if (a === undefined || b === undefined || c === undefined || d === undefined) {
    return null;
  }
  if (parts.length !== 4) {
    return null;
  }
  const values: number[] = [];
  for (const part of [a, b, c, d]) {
    if (!/^\d{1,3}$/.test(part)) {
      return null;
    }
    const value = Number.parseInt(part, 10);
    if (value > 255) {
      return null;
    }
    values.push(value);
  }
  const [o1, o2, o3, o4] = values;
  if (o1 === undefined || o2 === undefined || o3 === undefined || o4 === undefined) {
    return null;
  }
  return [o1, o2, o3, o4];
}

function classifyIpv4(host: string): TargetBlockReason | null {
  const octets = octetsOf(host);
  if (octets === null) {
    return null;
  }
  const [o1, o2] = octets;
  if (o1 === 0) {
    return 'unspecified_address';
  }
  if (o1 === 127) {
    return 'ipv4_loopback';
  }
  if (o1 === 10) {
    return 'rfc1918_10';
  }
  if (o1 === 172 && o2 >= 16 && o2 <= 31) {
    return 'rfc1918_172';
  }
  if (o1 === 192 && o2 === 168) {
    return 'rfc1918_192';
  }
  if (o1 === 169 && o2 === 254) {
    return 'link_local';
  }
  if (o1 === 100 && o2 >= 64 && o2 <= 127) {
    return 'reserved_or_special';
  }
  if (o1 >= 224) {
    return 'reserved_or_special';
  }
  const [o3, o4] = [octets[2], octets[3]];
  const isDocumentationOrBenchmark =
    (o1 === 192 && o2 === 0 && o3 === 0 && o4 === 0) ||
    (o1 === 192 && o2 === 0 && o3 === 2) ||
    (o1 === 198 && (o2 === 18 || o2 === 19)) ||
    (o1 === 198 && o2 === 51 && o3 === 100) ||
    (o1 === 203 && o2 === 0 && o3 === 113);
  if (isDocumentationOrBenchmark) {
    return 'reserved_or_special';
  }
  return null;
}

/** `::ffff:7f00:1` (the WHATWG-serialised form of `::ffff:127.0.0.1`) → `127.0.0.1`. */
function ipv4FromMappedHex(host: string): string | null {
  const match = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
  const high = match?.[1];
  const low = match?.[2];
  if (high === undefined || low === undefined) {
    return null;
  }
  const highValue = Number.parseInt(high, 16);
  const lowValue = Number.parseInt(low, 16);
  const octets = [highValue >> 8, highValue & 0xff, lowValue >> 8, lowValue & 0xff];
  return octets.join('.');
}

function classifyIpv6(host: string): TargetBlockReason | null {
  if (!host.includes(':')) {
    return null;
  }
  if (host === '::') {
    return 'unspecified_address';
  }
  if (host === '::1') {
    return 'ipv6_loopback';
  }
  if (host.startsWith('::ffff:')) {
    const mapped = host.includes('.') ? host.slice('::ffff:'.length) : ipv4FromMappedHex(host);
    if (mapped !== null) {
      return classifyIpv4(mapped) ?? 'ipv6_not_globally_routable';
    }
    return 'ipv6_not_globally_routable';
  }
  const firstGroup = host.split(':')[0] ?? '';
  if (/^f[cd]/.test(firstGroup)) {
    return 'ipv6_unique_local';
  }
  if (/^fe[89ab]/.test(firstGroup)) {
    return 'ipv6_link_local';
  }
  if (/^f[ef]/.test(firstGroup)) {
    return 'reserved_or_special';
  }
  // Only 2000::/3 is globally routable unicast; every other IPv6 form is refused.
  if (!/^[23]/.test(firstGroup)) {
    return 'ipv6_not_globally_routable';
  }
  return null;
}

/**
 * Classifies a host LITERAL. Returns `null` when the literal is not itself a private /
 * special / reserved destination.
 *
 * 🔴 A `null` result is NOT an authorisation - it only means "this is not a known-bad literal".
 *    Authorisation happens exclusively by exact allowlist match in `evaluateTarget`.
 */
export function classifyHostLiteral(hostname: string): TargetBlockReason | null {
  const host = normaliseHostLiteral(hostname);
  if (host.length === 0) {
    return 'empty_host';
  }
  // 🔴 Metadata names are checked FIRST: `metadata.google.internal` also ends in `.internal`, and the
  //    more specific (and more dangerous) classification must win so operators see the real cause.
  if (METADATA_HOSTS.includes(host)) {
    return 'metadata_endpoint';
  }
  if (BLOCKED_HOST_EXACT.includes(host)) {
    return 'loopback_name';
  }
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (host.endsWith(suffix)) {
      return 'loopback_name';
    }
  }
  const ipv6 = classifyIpv6(host);
  if (ipv6 !== null) {
    return ipv6;
  }
  return classifyIpv4(host);
}

function findEntryByHost(host: string, allowlist: readonly AllowedTarget[]): AllowedTarget | null {
  for (const target of allowlist) {
    if (normaliseHostLiteral(target.host) === host) {
      return target;
    }
  }
  return null;
}

/**
 * The single authorisation point for an outbound proxy target.
 *
 * Order of decisions (each one is independently observable, which is what makes AC-151 testable):
 *   ① parse     - must be a well-formed absolute URL;
 *   ② scheme    - `http` / `https` only (non-http(s) refused with its own reason);
 *   ③ userinfo  - `https://user:pass@host` refused (no credential smuggling via the URL);
 *   ④ literal   - loopback / RFC1918 / link-local / metadata / non-routable literals refused,
 *                 EVEN IF an allowlist entry names that host (defence in depth);
 *   ⑤ allowlist - EXACT host match against the server registry, else refused (default deny);
 *   ⑥ https     - a plaintext (`http`) target is refused even for an allowlisted host;
 *   ⑦ port      - must equal the registered port, or 443 when the entry declares none.
 *
 * 🔴 `allowlist` is supplied by the caller from the SERVER registry. This function has no parameter
 *    a client request can influence (see `authorizeProxyCall`).
 */
export function evaluateTarget(url_text: string, allowlist: readonly AllowedTarget[]): TargetPolicyVerdict {
  let parsed: URL;
  try {
    parsed = new URL(url_text);
  } catch {
    return { kind: 'blocked', reason: 'invalid_url', host: null };
  }

  const host = normaliseHostLiteral(parsed.hostname);

  if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
    return { kind: 'blocked', reason: 'scheme_not_http_or_https', host };
  }
  if (parsed.username.length > 0 || parsed.password.length > 0) {
    return { kind: 'blocked', reason: 'userinfo_present', host };
  }

  const literalReason = classifyHostLiteral(host);
  if (literalReason !== null) {
    return { kind: 'blocked', reason: literalReason, host };
  }

  const target = findEntryByHost(host, allowlist);
  if (target === null) {
    return { kind: 'blocked', reason: 'host_not_allowlisted', host };
  }
  if (parsed.protocol !== 'https:') {
    return { kind: 'blocked', reason: 'https_required', host };
  }
  const expectedPort = target.port ?? 443;
  const actualPort = parsed.port.length > 0 ? Number.parseInt(parsed.port, 10) : 443;
  if (expectedPort !== actualPort) {
    return { kind: 'blocked', reason: 'port_not_allowed', host };
  }
  return { kind: 'allowed', url: parsed.toString(), host, target };
}

/**
 * An allowlist entry that ALSO rejects a `localhost` / private / metadata host: a registry that
 * accidentally contains one must fail loudly at construction time instead of at request time.
 */
export function allowlistEntryViolation(target: AllowedTarget): TargetBlockReason | null {
  return classifyHostLiteral(target.host);
}

/**
 * Redirect handling (AC-151 "不得跟随重定向至 allowlist 之外").
 *
 * 🔴 V1 does not follow redirects AT ALL (`follow_redirects: false` in the transport contract),
 *    so "following a redirect anywhere" is structurally impossible. This function only classifies
 *    the `Location` value so the failure can be reported precisely.
 */
export type RedirectVerdict =
  | { readonly kind: 'inside_allowlist'; readonly host: string }
  | { readonly kind: 'outside_allowlist'; readonly reason: TargetBlockReason; readonly host: string | null };

export function evaluateRedirect(location: string, allowlist: readonly AllowedTarget[], base_url: string): RedirectVerdict {
  let resolved: string;
  try {
    resolved = new URL(location, base_url).toString();
  } catch {
    return { kind: 'outside_allowlist', reason: 'invalid_url', host: null };
  }
  const verdict = evaluateTarget(resolved, allowlist);
  if (verdict.kind === 'allowed') {
    return { kind: 'inside_allowlist', host: verdict.host };
  }
  return { kind: 'outside_allowlist', reason: verdict.reason, host: verdict.host };
}
