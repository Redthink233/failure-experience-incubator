/**
 * Workspace layer barrel (layer 2).
 *
 * Contains: the storage abstraction (M2 contract), the workspace physical schema, and
 * the `Attempt` repository (M3 vertical slice).
 *
 * 🔴 The concrete browser File System Access adapter is NOT here - it is S01-02, and it lives in
 *    `src/browser/workspace/**` (`S01-W1-PREP` moved it there so that this framework-neutral scope
 *    stays free of browser API types; the older `src/workspace/adapter/**` path is SUPERSEDED).
 *    S01-01 ships the abstraction plus an in-memory
 *    implementation so the repository is fully verifiable with no database and no
 *    network (D-059 / AC-130 / ITC-02).
 */

export * from './storage.js';
export * from './memory-storage.js';
export * from './schema/attempt-record.js';
export * from './schema/forbidden-keys.js';
export * from './schema/paths.js';
export * from './schema/project-metadata.js';
export * from './schema/schema-error.js';
export * from './schema/workspace-metadata.js';
export * from './repository/attempt-repository.js';
