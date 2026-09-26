/**
 * S01 ｜ `M7` Grounding Context Builder barrel.
 *
 * Layer position: Domain/Projection → Workspace → **Retrieval/Evidence** → AI Adapter → Application
 *                 → UI. `M7` sits INSIDE the retrieval layer, strictly ABOVE `M6`.
 *
 * 🔴 DEPENDENCY DIRECTION (Gate C Plan §I.1 / `RC-01`): `M7` consumes `M6` one way
 *    (`Domain → M6 → M7`). There is deliberately no import of `../compare/**` from `M6` into this
 *    directory's consumers, and no import here of `src/application/**`, `src/browser/**`,
 *    `src/server/**`, `api/proxy/**` or any UI module.
 * 🔴 WHAT THIS MODULE IS: deterministic construction / validation of `EvidenceRef`s, the
 *    `GroundingContextPack`, the ⑩ traceability view and `N_引用`.
 * 🔴 WHAT IT IS NOT: no `Insight` (`M8`), no `Hypothesis` (`M9`), no `D9` orchestration (`M15`),
 *    no UI (S01-06), no model call of any kind, and no persistence of its own - the reference set
 *    is written by `M8` / `M9` inline with the owner object.
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

export * from './types.js';
export * from './identity.js';
export * from './addressable.js';
export * from './reference-rules.js';
export * from './catalog.js';
export * from './citation.js';
export * from './grounding-context.js';
