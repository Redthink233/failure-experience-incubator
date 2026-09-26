/**
 * `M16` ｜ **`reset_demo_baseline`** —— Demo 工作空间的**运维**重置动作。
 *
 * 🔴 **它是运维 / 演示准备动作，不是产品功能**：
 *    - 产品 UI **没有** Reset 按钮（由静态审计断言：`src/ui/**` 不 import 本模块）；
 *    - 演示**过程中不得**调用它；
 *    - 它不进浏览器产物、不进 `dist/`。
 *
 * 语义（任务书 §20）:
 *   ① 确认目标就是 Demo 工作空间 →
 *   ② 清空该工作空间的**全部**数据 →（不是只删 Demo 记录：现场 `Insight` / `Hypothesis`
 *      可能引用过 Demo 记录，只删半边会留下悬空引用）→
 *   ③ 重新 seed 固定 8 条基线。
 *
 * 🔴 **fail-closed**：证明不了目标就是 Demo 工作空间就 **REFUSE**，且**一个字节都不动**。
 *    「接受任意目录路径然后 `rm -rf`」在本实现里**不可表达**：
 *      - `resolveDemoWorkspaceRoot` 先拒绝文件系统根目录 / 无父目录的路径 / 不存在的路径；
 *      - `proveDemoWorkspaceIdentity` 再要求**两重独立证据**（marker + `workspace.json` 的
 *        `workspace_id` 都等于冻结的 Demo ID）；
 *      - 清空只删**根目录的子项**，根目录本身保留。
 */

import { DemoWorkspacePathError, NodeDemoWorkspaceStorage } from './demo-workspace-storage.js';
import {
  proveDemoWorkspaceIdentity,
  type DemoWorkspaceIdentityRefusalCode,
} from './demo-workspace-marker.js';
import { seedDemoBaseline, type SeedDemoBaselineResult } from './seed-demo-baseline.js';

export type ResetDemoBaselineRefusalCode =
  | DemoWorkspaceIdentityRefusalCode
  | DemoWorkspacePathError['code'];

export type ResetDemoBaselineOutcome =
  | { readonly kind: 'reset'; readonly result: SeedDemoBaselineResult }
  | {
      readonly kind: 'refused';
      readonly code: ResetDemoBaselineRefusalCode;
      readonly reason: string;
    };

export interface ResetDemoBaselineDeps {
  /** Absolute or relative path of the demo workspace root. Proved before anything is removed. */
  readonly root_path: string;
  /** Injectable clock, forwarded to the seed step. */
  readonly now?: () => string;
}

/**
 * Empties the demo workspace and rebuilds the frozen eight-record baseline.
 *
 * 🔴 Every failure path returns a `refused` outcome with a plain reason; nothing throws and
 *    nothing is removed until BOTH pieces of identity evidence have been checked.
 */
export async function resetDemoBaseline(
  deps: ResetDemoBaselineDeps,
): Promise<ResetDemoBaselineOutcome> {
  let storage: NodeDemoWorkspaceStorage;
  try {
    storage = new NodeDemoWorkspaceStorage(deps.root_path);
  } catch (error) {
    if (error instanceof DemoWorkspacePathError) {
      return { kind: 'refused', code: error.code, reason: error.message };
    }
    return {
      kind: 'refused',
      code: 'NOT_A_DIRECTORY',
      reason: error instanceof Error ? error.message : 'unknown error while resolving the root',
    };
  }

  const proof = await proveDemoWorkspaceIdentity(storage);
  if (!proof.ok) {
    return {
      kind: 'refused',
      code: proof.code,
      reason: `${proof.reason} Nothing was removed.`,
    };
  }

  /*
   * 🔴 Only past this line is anything destroyed, and only the ROOT'S CONTENTS - the directory
   *    itself is kept so the path a user selected stays a valid workspace directory.
   */
  storage.clearContents();

  const seeded = await seedDemoBaseline({
    storage,
    ...(deps.now === undefined ? {} : { now: deps.now }),
  });
  if (seeded.kind !== 'seeded') {
    return {
      kind: 'refused',
      code: 'WORKSPACE_METADATA_INVALID',
      reason: `The workspace was cleared, but rebuilding the demo baseline failed: ${seeded.reason}`,
    };
  }
  return { kind: 'reset', result: seeded.result };
}
