/**
 * S01-05 barrel ｜ `src/application/capture/**` - the `D9` steps ①–⑤ application layer.
 *
 * Layer position: Domain/Projection → Workspace → Retrieval/Evidence → AI Adapter → **Application**
 *                 → UI. This module imports from `src/domain`, `src/workspace` and `src/ai` only.
 *
 * 🔴 WHAT THIS MODULE IS NOT: it contains no retriever, no comparator, no grounding engine, no
 *    `Insight` generation, no `Hypothesis` generation, no orchestration and no UI. Those belong to
 *    S01-03 / `M7`–`M9` / `M15` / S01-06.
 * 🔴 The concrete provider adapter is never constructed here; `M15` injects the `M10` interface.
 */

export * from './types.js';
export * from './input-validation.js';
export * from './follow-up-budget.js';
export * from './prompts.js';
export * from './schemas.js';
export * from './structured-parse.js';
export * from './confirmation.js';
export * from './cause-analysis.js';
export * from './gates.js';
export * from './formalization.js';
export * from './capture-service.js';
