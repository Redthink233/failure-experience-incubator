/**
 * S01 ｜ `M9` Hypothesis Generation + Evidence Traceability barrel (`D9` steps ⑨⑩).
 *
 * Layer position: Domain/Projection → Workspace → Retrieval/Evidence (`M6` → `M7`) → AI Adapter
 *                 (`M10`) → **Application** → UI.
 *
 * 🔴 DEPENDENCY DIRECTION: `M9` consumes `src/domain/**`, the `M2`/`M3` workspace abstractions, the
 *    `M6` read model, `M7` (the only evidence validator / `EvidenceRef` constructor), the `M8`
 *    `Insight` READ model and the `M10` `ProviderAdapter` INTERFACE. There is deliberately no import
 *    of `src/browser/**`, `src/server/**`, `api/proxy/**`, `src/ui/**` or `app/**` anywhere in this
 *    directory - the concrete provider adapter, the retrieval repository and the insight read model
 *    are INJECTED by the future `M15` composition root.
 * 🔴 `M6` / `M7` / `M8` never import `M9`: the evidence pipeline stays one-way
 *    (`M6 → M7 → M8 → M9`) and that direction is asserted by this module's static audit.
 * 🔴 WHAT THIS MODULE IS: step ⑨ - the only moment a `Hypothesis` or a `Model Suggestion` is produced,
 *    the ⑩ traceability of its real historical basis, the decision slot, the save slot and the Local
 *    Workspace persistence of all of it, including the replay recovery of an interrupted write.
 * 🔴 WHAT IT IS NOT: no `D9` orchestration (`M15`), no UI (S01-06), no retrieval, no grounding
 *    construction and no `Insight` generation.
 * 🔴 NO AUTOMATIC / BACKGROUND / SCHEDULED generation exists here (`D-022`): the only generation entry
 *    point is the explicit step ⑨ command.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O beyond `WorkspaceStorage`.
 */

export * from './types.js';
export * from './identity.js';
export * from './structure.js';
export * from './text.js';
export * from './verifiability.js';
export * from './grounding.js';
export * from './exits.js';
export * from './schemas.js';
export * from './prompts.js';
export * from './evidence.js';
export * from './editable-items.js';
export * from './lifecycle.js';
export * from './persistence.js';
export * from './hypothesis-repository.js';
export * from './structured-invoke.js';
export * from './hypothesis-service.js';
