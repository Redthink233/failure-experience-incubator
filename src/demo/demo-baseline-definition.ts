/**
 * `M16` ｜ **Demo Workspace baseline** —— 8 条 `Formal Attempt` 的**冻结** seed 定义。
 *
 * Canonical references (🔴 本文件只实现既有口径，不新建任何 `Decision` / `AC` / 产品字段):
 *   - `docs/architecture/05_TEST_DEMO_DEPLOY.md` §J.1 / §J.2 / §J.3 / §J.4 —— seed 规模、
 *     硬约束、8 条清单与覆盖表（本文件的 8 条 fixture 与该表**逐字段一致**）;
 *   - 契约 §11.1 ③ —— 「数据来源性质」= L4 的**既有**字段 `data_source_nature`，
 *     其三值之一 `demo_sample` 就是本 seed 的唯一标注方式（`TC-81` / `AC-48`）;
 *   - 契约 §3.2 —— 对象身份由**内容里**的 `ATT_` / `PRJ_` / `WS_` 承载，文件名不是身份。
 *
 * 🔴 **本文件只描述数据，不描述行为**：它不含任何 I/O、不含任何派生结果、不含任何
 *    「命中 / 未命中」标记。落盘与幂等由 `seed-demo-baseline.ts` 负责。
 *
 * 🔴 **只到 `Attempt` 层**（doc §J.1「seed 层位」）：`Retrieval Derivation` / `Insight` /
 *    `Hypothesis` / `EvidenceRef` / `N_检索` / `N_引用` / `matched result` / `comparison result`
 *    **一律不预置** —— 预置即等于伪造「系统曾经推理过」，且会让 ⑥–⑩ 的现场生成失去意义。
 *
 * 🔴 **`DEMO-01`…`DEMO-08` 是 fixture 逻辑键，不是对象 ID**：它们只出现在本定义与测试里，
 *    绝不会写进任何持久化对象。每条记录真正携带的是下面冻死的 `ATT_` 对象 ID。
 *
 * Framework-neutral: NO DOM, NO Node runtime API, NO network, NO I/O.
 */

import type { ObjectId } from '../domain/ids/object-id.js';
import type { ArchiveState } from '../domain/types/archive.js';

/* ------------------------------------------------------------------ *
 * 1. Demo 工作空间身份（运维级 marker，仅用于防误删）
 * ------------------------------------------------------------------ */

/**
 * Demo 工作空间的固定 `workspace_id`（`WS_` + 26 位 Crockford Base32，由既有 ID 格式决定）。
 *
 * 🔴 冻结在这里的价值：`seed` 可重复执行而**不产生新的工作空间身份**，
 *    `reset` 也能凭它证明「目标确实就是 Demo 工作空间」。
 */
export const DEMO_WORKSPACE_ID: ObjectId<'WS'> = 'WS_DEM0WS00000000000000000000';

/** 人可读的 Demo 工作空间名（`workspace.json` 的 `name`，仅展示）。 */
export const DEMO_WORKSPACE_NAME = 'Demo Workspace（示例数据）';

/**
 * 运维级 marker 文件名与取值。
 *
 * 🔴 它**不是产品字段**，也**不是业务门控**：只有 `reset` 这一个运维动作读它，
 *    用途只有一个 —— 在清空目录**之前**证明目标就是 Demo 工作空间。
 * 🔴 它与 `Attempt.data_source_nature` **不重复**：后者是 L4 的既有产品字段，
 *    描述「这一条记录的数据来源性质」；本 marker 描述「这个目录是不是 Demo 基线目录」。
 *    两者层级不同、消费者不同，且本 marker 永远不会被产品代码读取。
 */
export const DEMO_WORKSPACE_MARKER_FILE = '.demo-workspace-marker.json';
export const DEMO_WORKSPACE_MARKER = 'failure-experience-incubator/demo-workspace-baseline';

/* ------------------------------------------------------------------ *
 * 2. 三个逻辑 Project
 * ------------------------------------------------------------------ */

export interface DemoProjectDefinition {
  readonly project_id: string;
  readonly name: string;
}

/**
 * `docs/architecture/05_TEST_DEMO_DEPLOY.md` §J.3「不同 `Project`」：三个逻辑 Project，
 * 且必须存在「**异 `Project` 但 Level A 命中**」的组合（`DEMO-05` / `DEMO-08` 在「论文写作」，
 * `DEMO-01` / `DEMO-02` 在「竹材干燥 A」）。
 */
export const DEMO_PROJECTS: readonly DemoProjectDefinition[] = [
  { project_id: 'PRJ_DEM0PRA0000000000000000000', name: '竹材干燥 A' },
  { project_id: 'PRJ_DEM0PRB0000000000000000000', name: '竹材干燥 B' },
  { project_id: 'PRJ_DEM0PRC0000000000000000000', name: '论文写作' },
];

export const DEMO_PROJECT_ID_A = 'PRJ_DEM0PRA0000000000000000000';
export const DEMO_PROJECT_ID_B = 'PRJ_DEM0PRB0000000000000000000';
export const DEMO_PROJECT_ID_C = 'PRJ_DEM0PRC0000000000000000000';

/* ------------------------------------------------------------------ *
 * 3. 八条 fixture
 * ------------------------------------------------------------------ */

/**
 * `result_status` 的取值文字。
 *
 * 🔴 用 `D-012` / `docs/DECISIONS.md` 已确认的四个结果状态，且**只用英文枚举字面量**：
 *    既有的 grounding 规则把 `unknown`（大小写折叠后）识别为「尚未确定」的结果状态
 *    （`src/retrieval/grounding/reference-rules.ts` 的 `UNKNOWN_RESULT_STATUS_VALUES`），
 *    所以 `DEMO-04` 必须写 `'Unknown'` 才能被既有规则**原样**识别，而不是靠新增规则。
 */
export type DemoResultStatus = 'Failed' | 'Partial' | 'Success' | 'Unknown';

export interface DemoAttemptDefinition {
  /** fixture 逻辑键，**只用于本定义与测试**；绝不写进持久化对象。 */
  readonly fixture_key: string;
  /** 冻结的 `ATT_` 对象 ID。跨重复 seed 保持稳定。 */
  readonly attempt_id: ObjectId<'ATT'>;
  /** 归属的逻辑 `Project` ID（真实 `PRJ_` 对象 ID，不是名字）。 */
  readonly project_id: string;
  /** 归档位 —— 与 `state` 正交，是另一个维度（契约 §2.1）。 */
  readonly archive_state: ArchiveState;
  /** 第 ① 步的用户原话（永远是 `Fact`）。 */
  readonly raw_text: string;
  /** Level A 维度 `goal`。 */
  readonly goal: string;
  /** Level A 维度 `approach` → 物理字段 `actual_attempt`。 */
  readonly actual_attempt: string;
  /** Level A 维度 `condition`；`null` = **显式「未知 / 未提供」**，绝不写成空串。 */
  readonly condition: string | null;
  /** Level A 维度 `result` → 物理字段 `actual_result`。 */
  readonly actual_result: string;
  /** 用户已确认的结果状态（决策型 `Inference` 且 `decision_state = accepted`）。 */
  readonly result_status: DemoResultStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * 所有 fixture 共用的时间基准。
 *
 * 🔴 时间戳是**展示参数**，不是产品事实：左栏按 `updated_at` **从新到旧**排序
 *    （`attempt-summaries.ts` 的既有排序），因此这里让 `DEMO-01` 最新 —— 目的是让
 *    「主命中目标」出现在列表顶部，便于现场演示。这一点在报告里如实登记。
 * 🔴 `created_at` 与 `updated_at` 取同一值：seed 不虚构「创建与定稿之间存在一段时间」
 *    这种没有依据的事实。
 */
const DEMO_TIMESTAMP_PREFIX = '2026-08-0';
const DEMO_TIMESTAMP_SUFFIX = 'T10:00:00.000Z';

/** `DEMO-01` → `2026-08-08T10:00:00.000Z`；`DEMO-08` → `2026-08-01T10:00:00.000Z`。 */
function demoTimestamp(fixture_index: number): string {
  const day = 9 - fixture_index;
  return `${DEMO_TIMESTAMP_PREFIX}${day}${DEMO_TIMESTAMP_SUFFIX}`;
}

/**
 * 🔴 八条 fixture，逐字段对齐 `docs/architecture/05_TEST_DEMO_DEPLOY.md` §J.2 的表格。
 *
 * 设计意图（逐条，来自 §J.2 / §J.3 / 任务书 §5–§12）：
 *   `DEMO-01` 主命中目标（`condition` = `50°C`）
 *   `DEMO-02` 单位等价命中（`condition` = `50 摄氏度`），与 `DEMO-01` 彼此相关
 *   `DEMO-03` `condition` 缺失夹具 → 该维度「未比对」
 *   `DEMO-04` `result_status = Unknown` 夹具
 *   `DEMO-05` 同义改写命中，且「异 `Project` 但 Level A 命中」
 *   `DEMO-06` 🔴 Level B 陷阱：同 `Project`，Level A 全不重叠 ⇒ `related = false`
 *   `DEMO-07` 取值不同夹具（`50°C` vs `70°C`）**且** 已归档 ⇒ 不参与新检索
 *   `DEMO-08` `Success` 对照证据，与 `DEMO-05` 彼此相关
 *
 * 🔴 **没有 fixture 值的字段一律显式「未知 / 未提供」**（契约 §4.2 rule 7）：
 *    `expected_result` / `judgment_basis` / `key_parameters` / `environment` / `cost` /
 *    `occurred_at` / `user_note` / `failure_tags` 在**全部八条**上都为空 ——
 *    本 seed **不编造**实验批次、设备编号、成本、数值阈值或失败原因（任务书 §13）。
 *
 * 🔴 因此 §J.3 所说「`DEMO-06` 与 `DEMO-01` 同 `Project` / 同标签 / 同环境」在这里的准确含义是：
 *    **`Project` 真正相同**（同一个 `PRJ_` 对象），而标签与环境在八条上**同为「未提供」**。
 *    Level B 陷阱因此由 **`Project` 唯一承担** —— 这正是 `D-019`「`Project` 不是准入条件」
 *    要防的那件事，也足以证明「同一个 `Project` 不等于 `related`」。
 *
 * 🔴 `PRE-PSA-HARDENING-01` §7 —— **`DEMO-05` / `DEMO-06` 的 `raw_text` 用词更正**：
 *    这两条的原文里有一句「干燥温度不适用、没有记录」，在**跨域**语境下（`DEMO-05` = 论文写作 /
 *    `DEMO-06` = 实验日志登记）语义突兀，已改为「当时没有（额外）记录其它条件」这一自然表达。
 *    **只改了人类可读的 `raw_text`**：`condition` **结构化取值仍为 `null`（显式「未知 / 未提供」）**，
 *    Level A 语义 / `Project` / `result_status` / `Attempt`·`Project` 对象 ID / fixture 条数 /
 *    任何 Retrieval 预期**一律未改动**；也没有凭空新增设备、版本、环境、成本、参数或阈值。
 */
export const DEMO_ATTEMPTS: readonly DemoAttemptDefinition[] = [
  {
    fixture_key: 'DEMO-01',
    attempt_id: 'ATT_DEM0A010000000000000000000',
    project_id: DEMO_PROJECT_ID_A,
    archive_state: 'active',
    raw_text:
      '这次干燥没成功。我想降低竹片干燥后的颜色变化，用的是热风干燥、调整送风参数这条路线，烘干温度设的是 50°C，干燥结束以后含水率仍偏高，板面出现明显开裂。',
    goal: '降低竹片干燥后的颜色变化',
    actual_attempt: '热风干燥 + 调整送风参数',
    condition: '50°C',
    actual_result: '含水率仍偏高；出现明显开裂',
    result_status: 'Failed',
    created_at: demoTimestamp(1),
    updated_at: demoTimestamp(1),
  },
  {
    fixture_key: 'DEMO-02',
    attempt_id: 'ATT_DEM0A020000000000000000000',
    project_id: DEMO_PROJECT_ID_A,
    archive_state: 'active',
    raw_text:
      '这次干燥算部分成功。我想降低竹片干燥后的颜色变化，用的还是热风干燥、调整送风参数这条路线，烘干温度设的是 50 摄氏度，干燥结束以后没有明显开裂，但含水率仍未达标。',
    goal: '降低竹片干燥后的颜色变化',
    actual_attempt: '热风干燥 + 调整送风参数',
    condition: '50 摄氏度',
    actual_result: '无明显开裂，含水率仍未达标',
    result_status: 'Partial',
    created_at: demoTimestamp(2),
    updated_at: demoTimestamp(2),
  },
  {
    fixture_key: 'DEMO-03',
    attempt_id: 'ATT_DEM0A030000000000000000000',
    project_id: DEMO_PROJECT_ID_A,
    archive_state: 'active',
    raw_text:
      '这次想缩短干燥周期，用的是热风干燥、提高风量这条路线，干燥温度当时没有记录，干燥结束以后含水率仍偏高。',
    goal: '缩短干燥周期',
    actual_attempt: '热风干燥 + 提高风量',
    condition: null,
    actual_result: '含水率仍偏高',
    result_status: 'Failed',
    created_at: demoTimestamp(3),
    updated_at: demoTimestamp(3),
  },
  {
    fixture_key: 'DEMO-04',
    attempt_id: 'ATT_DEM0A040000000000000000000',
    project_id: DEMO_PROJECT_ID_B,
    archive_state: 'active',
    raw_text:
      '这次的目标是降低颜色变化，用的是热风干燥、调整送风参数这条路线，烘干温度设的是 50°C，结果待复测，尚未判定。',
    goal: '降低颜色变化',
    actual_attempt: '热风干燥 + 调整送风参数',
    condition: '50°C',
    actual_result: '待复测，尚未判定',
    result_status: 'Unknown',
    created_at: demoTimestamp(4),
    updated_at: demoTimestamp(4),
  },
  {
    fixture_key: 'DEMO-05',
    attempt_id: 'ATT_DEM0A050000000000000000000',
    project_id: DEMO_PROJECT_ID_C,
    archive_state: 'active',
    raw_text:
      '这次的目标是避免虚假引用，用的是引用校验后处理、逐条核验来源存在性这条路线，当时没有额外记录其它条件，处理之后幻觉引用减少。',
    goal: '避免虚假引用',
    actual_attempt: '引用校验后处理（逐条核验来源存在性）',
    condition: null,
    actual_result: '幻觉引用减少',
    result_status: 'Failed',
    created_at: demoTimestamp(5),
    updated_at: demoTimestamp(5),
  },
  {
    fixture_key: 'DEMO-06',
    attempt_id: 'ATT_DEM0A060000000000000000000',
    project_id: DEMO_PROJECT_ID_A,
    archive_state: 'active',
    raw_text:
      '这次的目标是记录实验日志的完整性，做法是改用电子表格登记数据，当时没有记录其它条件，结果日志缺失率下降。',
    goal: '记录实验日志的完整性',
    actual_attempt: '改用电子表格登记数据',
    condition: null,
    actual_result: '日志缺失率下降',
    result_status: 'Failed',
    created_at: demoTimestamp(6),
    updated_at: demoTimestamp(6),
  },
  {
    fixture_key: 'DEMO-07',
    attempt_id: 'ATT_DEM0A070000000000000000000',
    project_id: DEMO_PROJECT_ID_B,
    archive_state: 'archived',
    raw_text:
      '这次的目标是降低颜色变化，用的是热风干燥、调整热风参数这条路线，烘干温度设的是 70°C，干燥结束以后颜色变化明显。',
    goal: '降低颜色变化',
    actual_attempt: '热风干燥 + 调整热风参数',
    condition: '70°C',
    actual_result: '颜色变化明显',
    result_status: 'Failed',
    created_at: demoTimestamp(7),
    updated_at: demoTimestamp(7),
  },
  {
    fixture_key: 'DEMO-08',
    attempt_id: 'ATT_DEM0A080000000000000000000',
    project_id: DEMO_PROJECT_ID_C,
    archive_state: 'active',
    raw_text:
      '这次的目标是避免虚假引用，用的是引用校验后处理加人工复核这条路线，干燥温度不适用、没有记录，处理之后幻觉引用明显下降。',
    goal: '避免虚假引用',
    actual_attempt: '引用校验后处理 + 人工复核',
    condition: null,
    actual_result: '幻觉引用明显下降',
    result_status: 'Success',
    created_at: demoTimestamp(8),
    updated_at: demoTimestamp(8),
  },
];

/** 🔴 固定 8 条：既不得少于 8，也不得为了「界面更丰富」临时多塞第 9 条。 */
export const DEMO_ATTEMPT_COUNT = 8;

/** 按 fixture 逻辑键取一条定义；未知键返回 `null`（不抛错，方便测试与运维探针）。 */
export function demoAttemptByKey(fixture_key: string): DemoAttemptDefinition | null {
  return DEMO_ATTEMPTS.find((entry) => entry.fixture_key === fixture_key) ?? null;
}
