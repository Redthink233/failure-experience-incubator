/**
 * Runtime introspection for the browser File System Access boundary (S01-02 / `M2`).
 *
 * Deliberately framework-neutral in its *implementation*: no DOM global is referenced,
 * not even `DOMException` (unavailable under the NO-DOM test scope). Errors raised by the
 * File System Access API are recognised by their `name` string, which is the only part of
 * a `DOMException` this adapter actually needs - and reading it structurally keeps this file
 * compilable in both the browser and the Node test scope.
 *
 * 🔴 Technical / implementation-layer helpers only: NOT a product state, NOT a new product
 *    Decision, and no behaviour of the frozen `WorkspaceStorage` abstraction is changed.
 * References: Gate C Plan §I.2 (`M2` structured error classification), AC-127 / AC-128.
 */

import type {
  FsaDirectoryHandleLike,
  FsaPermissionMode,
  FsaPermissionState,
} from './fsa-types.js';

/**
 * The `name` of an error thrown by a browser API. Returns `''` for anything that is not an
 * object carrying a string `name`, so a non-DOMException failure can never be mistaken for
 * a recognised one.
 *
 * 🔴 No `instanceof DOMException` / `error.name === 'NotAllowedError' && error instanceof ...`
 *    check is used: `DOMException` is not typeable in the NO-DOM test scope, and the `name`
 *    string is the stable, spec-defined discriminator anyway.
 */
export function errorNameOf(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return '';
  }
  const name: unknown = (error as { readonly name?: unknown }).name;
  return typeof name === 'string' ? name : '';
}

/** The permission state values the platform may report. */
const PERMISSION_STATES: readonly FsaPermissionState[] = ['granted', 'denied', 'prompt'];

/**
 * Fails CLOSED: an unrecognised `queryPermission` / `requestPermission` result is reported
 * as `prompt` (⇒ never treated as an active grant). An unknown value must never be read as
 * `granted`, and must never be silently promoted into a successful access.
 */
export function normalizePermissionState(value: unknown): FsaPermissionState {
  return PERMISSION_STATES.includes(value as FsaPermissionState)
    ? (value as FsaPermissionState)
    : 'prompt';
}

export function isPermissionMode(value: unknown): value is FsaPermissionMode {
  return value === 'read' || value === 'readwrite';
}

function isFunctionMember(source: object, key: string): boolean {
  return typeof (source as Readonly<Record<string, unknown>>)[key] === 'function';
}

/**
 * Structural runtime guard for a directory handle obtained from `showDirectoryPicker()`.
 *
 * Purpose: a value that does not implement the File System Access directory contract must be
 * rejected EXPLICITLY (`WORKSPACE_UNAVAILABLE`) at the boundary, instead of producing a
 * `TypeError: ... is not a function` halfway through a read/write (task `S01-02` §2.I / §4:
 * "不崩溃错误分类").
 */
export function isDirectoryHandleLike(value: unknown): value is FsaDirectoryHandleLike {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    (value as { readonly kind?: unknown }).kind === 'directory' &&
    typeof (value as { readonly name?: unknown }).name === 'string' &&
    isFunctionMember(value, 'getDirectoryHandle') &&
    isFunctionMember(value, 'getFileHandle') &&
    isFunctionMember(value, 'values') &&
    isFunctionMember(value, 'queryPermission') &&
    isFunctionMember(value, 'requestPermission')
  );
}
