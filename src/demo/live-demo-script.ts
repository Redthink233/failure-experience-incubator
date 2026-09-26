/**
 * `M16` ｜ **现场主输入登记**（`TE-DEMO-LIVE-01`）—— **登记的是文本，不是数据**。
 *
 * 🔴 本文件的**唯一作用**是把「现场要真实重新输入什么」登记下来，交给彩排使用。
 *    它**不参与** seed：没有任何代码路径会把 `step_a_input` 写成第 9 条 `Attempt`
 *    （8 条冻结清单在 `demo-baseline-definition.ts`，由测试断言其为唯一 seed 来源）。
 *
 * 🔴 铁律（doc §K.1）：现场**必须实际重新输入** → 新建新 `Attempt` → 重新走 AI / `Formal` /
 *    Retrieval。**不得**复制数据库记录、不得点击隐藏按钮生成结果、不得手工补写
 *    `Retrieval Derivation`、不得手工插入 `Insight` / `Hypothesis`、
 *    不得用预先计算结果伪装现场生成、不得通过修改 Demo 数据临时"凑命中"。
 *
 * 🔴 下面的 `design_expectations` 是**演示设计预期**（`PROPOSED` 级别的彩排观察目标），
 *    **不是已测得结果**，更不是 seed 里保存的「Gold 命中集合」。真实命中只能由彩排 / `PSA` 观测，
 *    本 seed **不保存** `matched set` / `N_检索` / 命中标记。
 *
 * Canonical references: `docs/architecture/05_TEST_DEMO_DEPLOY.md` §K.2 / §K.3。
 * 备用脚本 `TE-DEMO-LIVE-02` / `-03` **不在本文件里重述**，其权威文本见该文档 §K.5。
 */

export interface LiveDemoScript {
  /** 既有演示用例编号（不新建编号）。 */
  readonly te_id: string;
  readonly title: string;
  /** 步骤 A：现场输入（**逐字照打，不粘贴**）。 */
  readonly step_a_input: string;
  /** 设计预期 —— 彩排观察目标（`PROPOSED`），**不是**测得结果。 */
  readonly design_expectations: readonly string[];
}

/** 主脚本。现场真实新建的那条 `Attempt` 就用这段输入（不改写、不缩写）。 */
export const TE_DEMO_LIVE_01: LiveDemoScript = {
  te_id: 'TE-DEMO-LIVE-01',
  title: '主脚本：竹材干燥 50 摄氏度（单位等价 + 同义改写命中）',
  step_a_input:
    '这次干燥还是没成功。我想降低竹片干燥后的颜色变化，用的还是热风干燥、调整送风参数那条路线，' +
    '烘干温度设的是 50 摄氏度，一开始含水率就偏高，干燥结束以后含水率还是偏高，板面出现明显开裂。' +
    '设备还是同一台热风循环干燥箱。',
  design_expectations: [
    '至少命中 1 条 Demo Formal Attempt 的 Level A 严格语义重叠维度（MUST）。',
    '预期同时命中 DEMO-01（condition = 50°C）与 DEMO-02（condition = 50 摄氏度）：单位等价表达，确定性记号规则可判 matched，不依赖模型。',
    'DEMO-04（result_status = Unknown）：可承担 grounding / context，不得单独承担 support / contradict。',
    'DEMO-06：同 Project（竹材干燥 A）但 Level A 全不重叠 ⇒ related = false，不得进入主要比较集合。',
    'DEMO-07：已归档 ⇒ 不参与新检索、不计入新 N_检索。',
    'DEMO-08：异 Project（论文写作）⇒ 预期不命中。',
    '预期 N_检索 ≥ 2（SHOULD）。真实数值由彩排 / PSA 观测，本 seed 不预存。',
  ],
};

/** 全部已登记的现场脚本（当前只有主脚本）。🔴 它们是**文本**，不是 seed 记录。 */
export const LIVE_DEMO_SCRIPTS: readonly LiveDemoScript[] = [TE_DEMO_LIVE_01];

/**
 * 🔴 显式声明，供审计与测试引用：现场脚本**不得**被预置成第 9 条记录。
 */
export const LIVE_DEMO_SCRIPTS_ARE_NOT_SEEDED = true;
