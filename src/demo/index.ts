/**
 * `M16` ｜ Demo 工作空间基线 —— 模块出口。
 *
 * 🔴 本目录是 **Node-only 运维工具**（seed / reset / 现场脚本登记），**不是产品运行时**：
 *    - 不进 `tsconfig.core.json`（framework-neutral 核心）；
 *    - 不进 `tsconfig.build.json`（`dist/` 生产构建）；
 *    - 不进 `tsconfig.web.json` / `tsconfig.browser.json`（浏览器产物）；
 *    - 产品 UI **不 import** 这里的任何模块 —— `reset` 因此不可能出现在界面上。
 *
 * 🔴 它只被三处使用：`npm run demo:*` 命令行、`src/tests/demo/**` 的测试、以及人工运维。
 */

export * from './demo-baseline-definition.js';
export * from './demo-workspace-marker.js';
export * from './live-demo-script.js';
export * from './seed-demo-baseline.js';
export * from './reset-demo-baseline.js';

/*
 * 🔴 `demo-workspace-storage.ts`（Node `fs` 实现）与 `cli.ts`（命令行入口）**刻意不从
 *    本 barrel 再导出**：它们直接触碰磁盘，只应由 CLI 与 reset 工具按名 import，
 *    以免任何间接引用意外把 Node I/O 拉进别的图。
 */
