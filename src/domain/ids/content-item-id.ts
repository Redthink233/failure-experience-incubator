/**
 * Stable identity for ONE content item (`ContentItem.content_item_id`, docs/02 §C.4.1).
 *
 * Contract: docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md §3.1 / §3.2, `TQ15`
 *   - an id is globally unique, stable and never reused;
 *   - a reference is ALWAYS resolved **by id** - never by text matching, never by title
 *     matching and never by list position / array offset / sort order (§3.2 rule 2 / AC-137).
 *
 * 🔴 Format = `<attempt_id>:<ULID body>`. The concrete string format and the prefix set are
 *    IMPLEMENTATION PARAMETERS (Gate C Plan §J.1 row 6): this module creates NO product
 *    Decision, NO new logical object kind and NO contract change.
 * 🔴 It reuses the ONE existing generator (`newIdBody` of `./ulid.js`, the same 26-char
 *    Crockford-Base32 body `newObjectId` uses). There is deliberately NO second random
 *    algorithm, NO module-level counter and NO hash of the value.
 * 🔴 The discriminator is a freshly minted ULID body - **never** an array index, an array
 *    length, a display order or a sort position.
 * 🔴 The value text is NOT identity either: two different content items may legitimately carry
 *    the same text, so a text match can never stand in for object identity.
 *
 * Framework-neutral: no DOM, no Node runtime API, no network, no I/O. The only platform
 * primitive is the injectable Web Crypto `getRandomValues` used by `./ulid.js`.
 */

import { isIdBody, newIdBody } from './ulid.js';

/** Separator between the owning Attempt id and the item discriminator (implementation parameter). */
export const CONTENT_ITEM_ID_SEPARATOR = ':';

/** Injectable generator body - keeps the helper deterministic in tests. */
export interface ContentItemIdDeps {
  /** Default: the shared ULID body generator. */
  readonly newBody?: () => string;
}

/**
 * Builds a factory that mints a new content-item id for a given owning `Attempt`.
 * Each call produces a NEW identity; nothing is derived from the caller's data.
 */
export function createContentItemIdFactory(
  deps: ContentItemIdDeps = {},
): (attempt_id: string) => string {
  const newBody = deps.newBody ?? newIdBody;
  return (attempt_id: string): string =>
    `${attempt_id}${CONTENT_ITEM_ID_SEPARATOR}${newBody()}`;
}

/** Mints one stable content-item id owned by `attempt_id`. */
export function newContentItemId(attempt_id: string, deps: ContentItemIdDeps = {}): string {
  return createContentItemIdFactory(deps)(attempt_id);
}

/**
 * True when the value has the generated shape `<something>:<ULID body>`.
 *
 * 🔴 Used to assert the POSITIVE property of an identity: it was minted by the shared
 *    generator, not composed from a list position.
 */
export function isGeneratedContentItemId(value: string): boolean {
  const separator = value.lastIndexOf(CONTENT_ITEM_ID_SEPARATOR);
  if (separator <= 0 || separator === value.length - 1) {
    return false;
  }
  return isIdBody(value.slice(separator + 1));
}

/** The owning `Attempt` id part of a generated content-item id, or `null`. */
export function attemptIdOfContentItemId(value: string): string | null {
  if (!isGeneratedContentItemId(value)) {
    return null;
  }
  return value.slice(0, value.lastIndexOf(CONTENT_ITEM_ID_SEPARATOR));
}
