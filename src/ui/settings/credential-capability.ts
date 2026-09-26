/**
 * FINAL-RAPID-INTEGRATION-01 ｜ The session-credential capability: available, or an EXPLAINED refusal.
 *
 * 🔴 THE DEFECT THIS MODULE EXISTS TO CLOSE. `src/ui/bootstrap.ts` used to build the credential store
 *    eagerly, at the top of `startAppShell`:
 *
 *        const credentials = createSessionCredentialStore(createBrowserSessionStorage());
 *
 *    and `createBrowserSessionStorage` THROWS when the runtime has no session storage - or has one
 *    that refuses to round-trip a value (private mode, storage disabled, a hardened profile, a getter
 *    that throws). The throw happened while the App Shell was still wiring itself up, so
 *    `mountAppShell` was never reached: the page stayed BLANK, the workspace entry never appeared, and
 *    nothing on screen said why. A missing browser capability was being reported as a dead product.
 *
 * 🔴 WHAT CHANGES: THE FAILURE BECOMES A STATE. The probe is wrapped once, here, and its outcome is a
 *    value the rest of the bootstrap - and the Settings Center - can read and describe. Booting is no
 *    longer conditional on a credential carrier existing.
 *
 * 🔴 WHAT DOES *NOT* CHANGE, AND THIS IS THE POINT (`D-056` / contract §0.4 D):
 *    · a missing session store is NEVER repaired by falling back to `localStorage`, `IndexedDB`, a
 *      cookie, a file or an in-process map used as a durable secret. The set of carriers this module
 *      may reach for is EMPTY - the only carrier it can name is the one it was handed;
 *    · the outcome is 「this cannot be configured」, not 「configured, but unsafely stored」. A key with
 *      nowhere legal to go must never be presented as though it had been saved;
 *    · BROWSING IS UNAFFECTED. Reading a workspace needs no credential at all (`S01-06-D1`), so a
 *      provider-less workspace read stays available - the refusal is confined to the model
 *      configuration, which is the only thing that ever claimed to hold a secret.
 *
 * 🔴 IT LIVES IN A FRAMEWORK-NEUTRAL MODULE ON PURPOSE. `bootstrap.ts` is DOM scope: the Node test
 *    suite cannot import it, so a `try`/`catch` written there could only be grepped, never exercised.
 *    Putting the decision here makes "a throwing `sessionStorage` produces an explained refusal"
 *    a property the suite can actually run.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO I/O, NO storage of its own.
 */

import type { SessionScopedStorage } from '../../browser/ai/session-storage.js';
import { SETTINGS_SESSION_STORAGE_UNAVAILABLE } from '../copy.js';

/**
 * The two legal outcomes of looking for a session credential carrier.
 *
 * 🔴 THERE IS NO THIRD, "DEGRADED CARRIER" CASE. The union is deliberately total: either the
 *    sanctioned carrier exists and works, or the product has nowhere to keep a credential and says so.
 */
export type CredentialCapability =
  | { readonly kind: 'available'; readonly store: SessionScopedStorage }
  | { readonly kind: 'unavailable'; readonly message: string };

/**
 * The credential operations the App Shell may perform, and nothing else.
 *
 * 🔴 STRUCTURALLY IDENTICAL TO `SessionCredentialPort` AND DELIBERATELY NOT IMPORTED FROM IT.
 *    `ui/session/app-session.ts` already imports `ui/settings/provider-presets.ts`, so importing the
 *    session's type back into this settings module would close a cycle between the two directories.
 *    The bootstrap satisfies this shape structurally, so the two declarations cannot drift into
 *    disagreement without a compile error at the wiring site.
 * 🔴 NEITHER METHOD CAN RETURN A SECRET. `has` answers a boolean, `clear` removes - there is
 *    deliberately no `resolve`, so no code path can put a stored key back into a form field.
 */
export interface CredentialPort {
  has(provider_id: string): boolean;
  clear(provider_id: string): void;
}

/**
 * The credential port of a runtime with NO usable session storage.
 *
 * 🔴 IT HOLDS NOTHING AND REMEMBERS NOTHING. `has` is always `false` so the panel asks for a key when
 *    one is needed, and `clear` is a no-op because there is nothing to clear. It is NOT an in-memory
 *    substitute for the store: nothing is ever written through it, so no secret is retained anywhere.
 */
export const NO_CREDENTIAL_PORT: CredentialPort = {
  has: () => false,
  clear: () => undefined,
};

/**
 * Probes the runtime's session storage and reports the outcome AS A VALUE.
 *
 * @param probe the real probe - in the shipped app, `() => createBrowserSessionStorage()`. It is a
 *   parameter rather than an import so the suite can hand in a throwing probe, an empty runtime and a
 *   working one without a browser, and so this module keeps no dependency on the browser scope.
 *
 * 🔴 THE CATCH IS DELIBERATELY BLIND. Every reason the probe can fail - no `sessionStorage`, a getter
 *    that throws, a store that will not round-trip - leads to the same product statement, because the
 *    user's remedy is the same in all three cases. Re-throwing a narrowed subset would leave a hole
 *    exactly as blank as the page this fix removes.
 * 🔴 IT DOES NOT LOG, RE-WRAP OR RE-EXPOSE THE CAUGHT VALUE. A storage failure must not be able to
 *    reach the DOM, a notice or a log line through this module - the only thing it produces is the
 *    product sentence.
 */
export function resolveCredentialCapability(probe: () => SessionScopedStorage): CredentialCapability {
  try {
    return { kind: 'available', store: probe() };
  } catch {
    return { kind: 'unavailable', message: SETTINGS_SESSION_STORAGE_UNAVAILABLE };
  }
}

/**
 * The sanctioned carrier for a capability, or `null` when there is none.
 *
 * 🔴 IT EXISTS SO "NO FALLBACK" IS A SHAPE RATHER THAN A PROMISE. A caller that wants a store must ask
 *    this function; the only thing it can ever be handed back is the store the capability carries, so
 *    there is no branch in which some other carrier could be substituted.
 */
export function sessionStorageFor(capability: CredentialCapability): SessionScopedStorage | null {
  return capability.kind === 'available' ? capability.store : null;
}

/** The sentence that explains an unavailable capability. Never `null` - the refusal always speaks. */
export function credentialUnavailableMessage(capability: CredentialCapability): string {
  return capability.kind === 'unavailable' ? capability.message : '';
}
