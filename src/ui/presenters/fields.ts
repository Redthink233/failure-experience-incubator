/**
 * S01-06 ｜ Field-path humanisation.
 *
 * 🔴 WHY: a landing point is identified internally as `<attempt field path>` / `<content item id>`.
 *    Task §29 forbids showing `source_field_path` (or `target_id`) as the PRIMARY human text in the
 *    Evidence Rail - a reviewer must read 「来自 实际尝试」, not `actual_attempt#CI_01H...`.
 * 🔴 The raw value is NOT thrown away: it stays available as a secondary, muted technical detail, so
 *    a developer can still reconcile the screen with the record. It is never the headline.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO I/O.
 */

import { FIELD_LABELS, fieldLabel } from '../copy.js';

const SEPARATORS = /[.#/:]/u;

/**
 * The human label of a field path.
 *
 * 🔴 A landing point is written as `<attempt field path>#<attempt id>:<dimension>`, so the FIRST
 *    segment is the field the content was taken from and the LAST one is the dimension. The first
 *    segment is therefore preferred; an unknown first segment falls back to the last one, and an
 *    opaque id is returned as-is rather than replaced by a generic word - silence would be worse.
 */
export function humanizeFieldPath(path: string): string {
  const segments = path
    .split(SEPARATORS)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return path;
  }
  const first = segments[0] ?? path;
  if (FIELD_LABELS[first] !== undefined) {
    return fieldLabel(first);
  }
  const last = segments[segments.length - 1] ?? path;
  return fieldLabel(last);
}

/** A short, readable form of an object id: the prefix plus the tail, never the whole ULID. */
export function shortIdLabel(id: string, tail = 4): string {
  const separator = id.indexOf('_');
  if (separator <= 0) {
    return id;
  }
  const prefix = id.slice(0, separator);
  const body = id.slice(separator + 1);
  return body.length <= tail ? id : `${prefix}_…${body.slice(-tail)}`;
}

/** `true` when a value is missing / blank, so the interface can say 「未提供」 instead of nothing. */
export function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim().length === 0;
}
