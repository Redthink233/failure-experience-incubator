/**
 * S01 ｜ `M15` browser composition root barrel.
 *
 * 🔴 THE ONLY PLACE A RUNTIME IS KNOWN. This directory may import the concrete browser adapters
 *    (`src/browser/ai/**`), the framework-neutral application services and the workspace
 *    abstraction - and it is the ONLY importer of `src/browser/ai/**` that also touches the
 *    application layer.
 * 🔴 WHAT IT MUST NEVER IMPORT: `src/server/proxy/**` and `api/proxy/**`. The browser talks to the
 *    thin proxy over the NETWORK, never by import; the two runtimes never share a module graph.
 * 🔴 WHAT IT MUST NEVER DO: implement a product rule. Every function here only wires already-frozen
 *    objects together.
 */

export * from './provider-composition.js';
export * from './workflow-composition.js';
