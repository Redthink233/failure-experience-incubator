/**
 * `src/retrieval` barrel - layer 3 of the six-layer discipline (Retrieval / Evidence).
 *
 * Contents:
 *   - `compare/**`  `M6` Experience Retriever / Comparator: step ⑥ retrieval with the Level A
 *                   three-state comparison (`D-050` / `D-052` / `D-061`), step ⑦ material, and the
 *                   minimal persistence of the current Retrieval Derivation.
 *   - `grounding/**` `M7` Grounding Context Builder: traceable content candidates, `EvidenceRef`
 *                   construction / validation, the ⑩ traceability view and `N_引用`.
 *
 * 🔴 M7 就地补注（不改写上文）：本节原写「`M7` … is NOT here and is not implemented by this
 *    task」—— 该表述已随 `M7` 的落地而失效：`M7` 现位于 `./grounding/**`。`M6` 仍然**不依赖**
 *    `M7`（HANDOFF §4：`M6 → M7` 是单向边），本 barrel 只是把两者并列导出，未建立反向依赖。
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

export * from './compare/index.js';
export * from './grounding/index.js';
