/**
 * S01 ｜ `M8` Candidate Insight Generation barrel (`D9` step ⑧).
 *
 * Layer position: Domain/Projection → Workspace → Retrieval/Evidence (`M6` → `M7`) → AI Adapter
 *                 (`M10`) → **Application** → UI.
 *
 * 🔴 DEPENDENCY DIRECTION: `M8` consumes `src/domain/**`, the `M2`/`M3` workspace abstractions, the
 *    `M6` read model, `M7` (the only evidence validator / `EvidenceRef` constructor) and the `M10`
 *    `ProviderAdapter` INTERFACE. There is deliberately no import of `src/browser/**`,
 *    `src/server/**`, `api/proxy/**`, `src/ui/**` or `app/**` anywhere in this directory - the
 *    concrete provider adapter and the retrieval service are INJECTED by the future `M15`
 *    composition root.
 * 🔴 `M6` / `M7` never import `M8`: the evidence pipeline stays one-way
 *    (`M6 → M7 → M8`) and is asserted by this module's static audit.
 * 🔴 WHAT THIS MODULE IS: step ⑧ - the only moment a `Candidate Insight` is produced, the `E1`-`E4`
 *    presentation, the `candidate` / `accepted` / `rejected` lifecycle, the product-layer state
 *    event trace and the Local Workspace persistence of all of it.
 * 🔴 WHAT IT IS NOT: no `Hypothesis` (`M9`), no `D9` orchestration (`M15`), no UI (S01-06), no
 *    retrieval and no grounding construction.
 * 🔴 NO AUTOMATIC / BACKGROUND / SCHEDULED generation and NO candidate todo pool exist here
 *    (`D-022`): the only generation entry point is the explicit step ⑧ command.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O beyond `WorkspaceStorage`.
 */

export * from './types.js';
export * from './identity.js';
export * from './generalization.js';
export * from './schemas.js';
export * from './prompts.js';
export * from './evidence.js';
export * from './gates.js';
export * from './lifecycle.js';
export * from './persistence.js';
export * from './insight-repository.js';
export * from './structured-invoke.js';
export * from './insight-service.js';
