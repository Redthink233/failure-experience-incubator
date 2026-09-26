/**
 * S01 ｜ `M15` `D9` End-to-End Orchestration barrel.
 *
 * Layer position: Domain → Workspace → Retrieval/Evidence → AI contract (`M10`) →
 *                 Application services (`M4`–`M9`) → **Workflow (`M15`)** → UI (S01-06).
 *
 * 🔴 DEPENDENCY DIRECTION: `M15` consumes `src/domain/**`, `src/workspace/**`, `src/retrieval/**` and
 *    the `M4`–`M9` application services. It imports NO browser module and NO server module: the
 *    concrete provider adapter, the workspace storage and the credential are resolved by the
 *    composition root in `src/browser/application/**` and injected through `D9WorkflowPorts`.
 * 🔴 NO BACK-EDGE: `M4`–`M9` never import `M15`. `M15` is a CONSUMER of them and adds no method to
 *    any of them.
 * 🔴 Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O beyond the injected ports.
 */

export * from './types.js';
export * from './errors.js';
export * from './operation-ids.js';
export * from './outcomes.js';
export * from './retrieval-freshness.js';
export * from './read-model.js';
export * from './acceptance.js';
export * from './attempt-summaries.js';
export * from './retrieval-expansion.js';
export * from './workspace-read.js';
export * from './workflow-service.js';
