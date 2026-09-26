/**
 * Shared domain types (layer 1). Pure TypeScript: no file I/O, no DOM/browser API,
 * no network, no LLM, no UI.
 *
 * The type set and its semantics come from the FROZEN shared technical contract
 * `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md` (v0.3 FROZEN / IMPLEMENTATION BASIS).
 * Report the contract section / Decision id in code comments, never invent new semantics.
 */

export * from './archive.js';
export * from './attempt.js';
export * from './comparison.js';
export * from './content-item-record.js';
export * from './counts.js';
export * from './evidence-ref.js';
export * from './follow-up.js';
export * from './gates.js';
export * from './hypothesis.js';
export * from './insight.js';
export * from './level-a.js';
export * from './presence.js';
export * from './source-type.js';
