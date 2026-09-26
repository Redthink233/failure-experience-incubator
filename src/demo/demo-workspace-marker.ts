/**
 * `M16` ｜ **Demo 工作空间身份 marker** —— 运维级防误删标记。
 *
 * 用途**只有一个**：在 `reset_demo_baseline` 清空任何目录**之前**，证明
 * 「这个目录确实就是 Demo 基线目录」。它**不是**产品字段、**不是**业务门控、
 * **不参与**任何检索 / 排序 / `N_检索` / `grounding` / `Insight` / `Hypothesis` 规则。
 *
 * 🔴 它与 `Attempt.data_source_nature` **不重复**，因为二者层级与消费者都不同：
 *      `data_source_nature`  = L4 既有产品字段，描述「**某一条记录**的数据来源性质」，被 UI 与产品规则读取；
 *      本 marker             = 目录级运维标记，描述「**这个工作空间目录**是不是 Demo 基线」，只被 reset 工具读取。
 *    产品代码**从不** import 本模块（由静态审计断言）。
 *
 * 🔴 身份证明是**两重独立证据**，缺一不可：
 *    ① 根目录存在 marker 文件，且 `marker` 取值精确匹配、`workspace_id` 等于冻结的 Demo ID；
 *    ② `workspace.json` 可被既有 schema 解析，且其 `workspace_id` 同样等于冻结的 Demo ID。
 *    任一不满足 ⇒ **REFUSE**，绝不清空。
 */

import type { ObjectId } from '../domain/ids/object-id.js';
import type { WorkspaceStorage } from '../workspace/storage.js';
import { readWorkspaceMetadata } from '../workspace/schema/workspace-metadata.js';
import {
  DEMO_WORKSPACE_ID,
  DEMO_WORKSPACE_MARKER,
  DEMO_WORKSPACE_MARKER_FILE,
} from './demo-baseline-definition.js';

export interface DemoWorkspaceMarker {
  readonly marker: string;
  readonly workspace_id: string;
}

/** Strict structural read: anything that is not exactly the expected shape is `null`. */
export function parseDemoWorkspaceMarker(json: string): DemoWorkspaceMarker | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const marker = record['marker'];
  const workspaceId = record['workspace_id'];
  if (typeof marker !== 'string' || typeof workspaceId !== 'string') {
    return null;
  }
  return { marker, workspace_id: workspaceId };
}

export async function readDemoWorkspaceMarker(
  storage: WorkspaceStorage,
): Promise<DemoWorkspaceMarker | null> {
  if (!(await storage.exists(DEMO_WORKSPACE_MARKER_FILE))) {
    return null;
  }
  return parseDemoWorkspaceMarker(await storage.readFile(DEMO_WORKSPACE_MARKER_FILE));
}

/** Writes the marker for this workspace. Only ever called by the seed / reset tools. */
export async function writeDemoWorkspaceMarker(storage: WorkspaceStorage): Promise<void> {
  const payload: DemoWorkspaceMarker = {
    marker: DEMO_WORKSPACE_MARKER,
    workspace_id: DEMO_WORKSPACE_ID,
  };
  await storage.writeFile(DEMO_WORKSPACE_MARKER_FILE, `${JSON.stringify(payload, null, 2)}\n`);
}

export type DemoWorkspaceIdentityRefusalCode =
  | 'MARKER_MISSING'
  | 'MARKER_MISMATCH'
  | 'WORKSPACE_METADATA_MISSING'
  | 'WORKSPACE_METADATA_INVALID'
  | 'WORKSPACE_ID_MISMATCH';

export type DemoWorkspaceIdentityProof =
  | { readonly ok: true; readonly workspace_id: ObjectId<'WS'> }
  | { readonly ok: false; readonly code: DemoWorkspaceIdentityRefusalCode; readonly reason: string };

/**
 * The fail-closed identity proof. **Two independent pieces of evidence, both required.**
 *
 * 🔴 Returns a refusal instead of throwing so the caller can report a plain, honest reason and
 *    leave the target directory completely untouched.
 */
export async function proveDemoWorkspaceIdentity(
  storage: WorkspaceStorage,
): Promise<DemoWorkspaceIdentityProof> {
  const marker = await readDemoWorkspaceMarker(storage);
  if (marker === null) {
    return {
      ok: false,
      code: 'MARKER_MISSING',
      reason: `No ${DEMO_WORKSPACE_MARKER_FILE} at the workspace root, so this directory cannot be proven to be the demo baseline.`,
    };
  }
  if (marker.marker !== DEMO_WORKSPACE_MARKER || marker.workspace_id !== DEMO_WORKSPACE_ID) {
    return {
      ok: false,
      code: 'MARKER_MISMATCH',
      reason: `The marker at the workspace root does not declare the demo baseline identity (found "${marker.marker}" / "${marker.workspace_id}").`,
    };
  }

  let metadata;
  try {
    metadata = await readWorkspaceMetadata(storage);
  } catch (error) {
    return {
      ok: false,
      code: 'WORKSPACE_METADATA_INVALID',
      reason: `The workspace metadata could not be read as a valid workspace.json: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    };
  }
  if (metadata === null) {
    return {
      ok: false,
      code: 'WORKSPACE_METADATA_MISSING',
      reason: 'No workspace.json at the workspace root.',
    };
  }
  if (metadata.workspace_id !== DEMO_WORKSPACE_ID) {
    return {
      ok: false,
      code: 'WORKSPACE_ID_MISMATCH',
      reason: `workspace.json declares workspace_id "${metadata.workspace_id}", which is not the demo baseline workspace.`,
    };
  }
  return { ok: true, workspace_id: DEMO_WORKSPACE_ID };
}

/** True when the workspace already carries the demo baseline identity (marker + workspace.json). */
export async function isDemoWorkspace(storage: WorkspaceStorage): Promise<boolean> {
  return (await proveDemoWorkspaceIdentity(storage)).ok;
}
