/**
 * S01-03 ｜ `M6` Experience Retriever / Comparator barrel.
 *
 * Layer position: Domain/Projection → Workspace → **Retrieval/Evidence** → AI Adapter → Application
 *                 → UI.
 *
 * 🔴 WHAT THIS MODULE IS: step ⑥ (related-history retrieval, Level A three-state comparison,
 *    `N_检索`) and step ⑦ material (similar points, difference points, uncompared dimensions,
 *    relevance reasons), plus the minimal persistence of the CURRENT Retrieval Derivation.
 * 🔴 WHAT IT IS NOT: no grounding context (`M7`), no `Insight` (`M8`), no `Hypothesis` (`M9`), no
 *    `D9` orchestration (`M15`), no UI (S01-06). It creates no `EvidenceRef` and grounds nothing.
 * 🔴 DEPENDENCY DIRECTION: `src/domain/**` + `src/workspace/**` (the `M2` storage abstraction, used
 *    by the derivation repository) + the `M10` `ProviderAdapter` INTERFACE. There is deliberately no
 *    import of `src/application/**`, `src/browser/**`, `src/server/**`, `api/proxy/**`, `src/ui/**`
 *    or `app/**` anywhere in this directory. Being BELOW the application layer is why the whole
 *    three-state pipeline is exposed as functions and the concrete adapter is INJECTED.
 * 🔴 NO numeric judgement quantity of any kind: no ordered category, no threshold, no 加权, no
 *    向量表示 and no distance function. The only numbers a derivation carries are set sizes and a
 *    reading-load count (`D-020` / `D-037` / AC-23).
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

export * from './types.js';
export * from './normalization.js';
export * from './field-rules.js';
export * from './corpus.js';
export * from './ordering.js';
export * from './comparison-points.js';
export * from './derivation-id.js';
export * from './dimension-judge.js';
export * from './comparator.js';
export * from './derivation.js';
export * from './persistence.js';
export * from './retrieval-derivation-repository.js';
export * from './retrieval-service.js';
