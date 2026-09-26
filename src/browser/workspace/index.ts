/**
 * Browser workspace layer barrel (S01-02 / Track A).
 *
 * Contains `M2`: the REAL File System Access implementation of the framework-neutral
 * `WorkspaceStorage` contract, its browser-local structural types, the directory-picker helper
 * and the browser-local technical error vocabulary.
 *
 * 🔴 Runtime location is `src/browser/workspace/**`. The historical `src/workspace/adapter/**`
 *    path is SUPERSEDED BY `S01-W1-PREP`: `src/workspace/**` stays framework-neutral / NO DOM and
 *    is a READ-ONLY input for this layer, never its modification target.
 * 🔴 Nothing here is a product Decision: the FSA API shape, path hardening and error codes are
 *    implementation parameters. No product mechanism, state or AC is added or changed.
 * 🔴 No delete: no exported member offers a physical delete entry point (AC-76 / AC-138).
 */

export * from './fsa-types.js';
export * from './fsa-runtime.js';
export * from './workspace-access-error.js';
export * from './path-safety.js';
export * from './directory-picker.js';
export * from './fsa-workspace-storage.js';
