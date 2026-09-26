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
 * 🔴 `RECOVERY-POLISH-01` §10 起，**零命中脚本 `TE-DEMO-ZERO-01` 登记在本文件里**：
 *    它不是 `-03` 的替代编号，而是一个**另有输入**的新脚本；`-03` 的 `RETIRED` 状态不变。
 */

export interface LiveDemoScript {
  /** 既有演示用例编号（不新建编号）。 */
  readonly te_id: string;
  readonly title: string;
  /** 步骤 A：现场输入（**逐字照打，不粘贴**）。 */
  readonly step_a_input: string;
  /** 设计预期 —— 彩排观察目标（`PROPOSED`），**不是**测得结果。 */
  readonly design_expectations: readonly string[];
  /**
   * 该输入的**预期 `Level A` 解析**，**只用于静态规则检查**（`RECOVERY-POLISH-01` §12）。
   *
   * 🔴 它保存的是**输入侧**的四段文字，**不是结果**：这里没有 verdict、没有 `matched`、
   *    没有 `N_检索`、没有 `matched set`。静态检查用它去跑既有的**确定性规则**
   *    （`deterministicDimensionVerdict`），验证「不可能被记号等价判成命中」。
   * 🔴 可选项：主脚本 `TE-DEMO-LIVE-01` 不填（它的预期命中依赖维度裁判，本来就不做静态断言）。
   */
  readonly expected_level_a_parse?: LiveDemoLevelAProbe;
}

/** 一条现场输入的四个 `Level A` 维度文字（对齐契约 §9.4.1 的主字段路径）。 */
export interface LiveDemoLevelAProbe {
  /** `goal`。 */
  readonly goal: string;
  /** `approach` → 物理字段 `actual_attempt`。 */
  readonly actual_attempt: string;
  /**
   * `condition`；`null` = 输入本身说「没有记录其它条件」，**本登记不预设**解析结果。
   *
   * 🔴 若解析把「截止前 24 小时」抽成 `condition`，静态检查按该字面量**再跑一次**规则，
   *    仍然不是命中（与 seed 的 `50°C` / `50 摄氏度` / `70°C` 都不同）；
   *    若没抽成，则该维度结构性地 `uncompared`。**两种情形都不改变零命中结论**，也不允许
   *    为了让测试通过而把它强行映射到某个错误字段。
   */
  readonly condition: string | null;
  /** `result` → 物理字段 `actual_result`。 */
  readonly actual_result: string;
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

/* ------------------------------------------------------------------ *
 * 零命中脚本（`RECOVERY-POLISH-01` §10–§13）
 * ------------------------------------------------------------------ */

/**
 * `TE-DEMO-ZERO-01` —— **真 · Level A 零命中**输入登记。
 *
 * 🔴 **它补的是 `TE-DEMO-LIVE-03` 作废后留下的空缺**：`-03` 的 `goal`（缩短干燥周期）与
 *    `actual_attempt`（热风干燥、提高风量）与 `DEMO-03` 的 fixture **逐字相同**，按 `D-050` 的
 *    确定性记号规则**必然** `matched`，因此**不可能**承担「本次未找到相关历史记录」的演示；
 *    它已被 `PRE-PSA-HARDENING-01` §9 标注 `RETIRED`（**原文与状态一律保留，本脚本不是它的复活**）。
 *
 * 🔴 **它是文本登记，不是数据**：没有 `step_a_input` 会被写进 workspace 的代码路径。
 *    `demo-workspace/**` 的第 8 条之外的记录只能由**现场真实输入**产生（doc §K.1 `K-R1` / `K-R2`）。
 *
 * 🔴 **本登记不预存任何派生结果**：没有 `matched` 标记、没有 `N_检索`、没有 `Retrieval Derivation`、
 *    没有「Gold 命中集合」。静态可证的只有一件事 —— 四个 `Level A` 维度在**确定性规则**
 *    （`src/retrieval/compare/field-rules.ts`）下都没有与 `DEMO-01`…`DEMO-08` 判成 `matched`
 *    （由 `src/tests/demo/zero-hit-fixture.test.ts` 断言）。`undecided` 维度的最终判决属于
 *    维度裁判，因此**真实 0 命中只能在 `PSA` / 彩排中观测** —— 本文件**不声称**已验证。
 *
 * 🔴 预期空态语义（`AC-55`）：**历史存在**，但本次 **`NO_RELATED`** ⇒ `N_检索 = 0`。
 *    它与 `HISTORY_EMPTY`（工作区本来就没有历史）/ `RUNTIME_INCOMPLETE`（检索没跑完）/
 *    `NOT_RUN`（还没检索过）是**三种不同的东西**，彩排时必须逐一分清。
 */
export const TE_DEMO_ZERO_01: LiveDemoScript = {
  te_id: 'TE-DEMO-ZERO-01',
  title: '零命中脚本：问卷回收率（历史存在但本次没有相关记录）',
  step_a_input:
    '这次问卷回收效果没有达到预期。我的目标是提高问卷回收率，这次做法是在填写截止前 24 小时发送一次短信提醒。' +
    '当时没有额外记录其它条件。截止以后问卷回收率仍没有明显提升。',
  design_expectations: [
    '静态（确定性规则，无需模型）：四个 Level A 维度与 DEMO-01…DEMO-08 均**没有**确定性 matched ⇒ 满足「零命中」的前提。',
    'goal（提高问卷回收率）：与八条 fixture 的 goal 均不构成同义 / 同一实质改写。',
    'approach（在填写截止前 24 小时发送一次短信提醒）：与八条 fixture 的 actual_attempt 均不构成同义 / 同一实质改写。',
    'condition：本登记**不预设**它是否被解析为 condition —— 若被抽成「截止前 24 小时」，它与 seed 的 condition（50°C / 50 摄氏度 / 70°C）同样不同；若未被抽成，则该维度结构性地 uncompared（AC-22）。两种情形都不改变零命中结论。',
    'result（问卷回收率仍没有明显提升）：与八条 fixture 的 actual_result 均不构成同义 / 同一实质改写。',
    '预期空态：历史存在但 NO_RELATED ⇒ N_检索 = 0；必须与 HISTORY_EMPTY / RUNTIME_INCOMPLETE / NOT_RUN 严格区分（AC-55）。',
    '预期路由：⑥ 显示「已有历史记录，但这次暂未找到相关记录」，⑦ 无相同点，⑧⑨ 走 EXIT-A（历史依据不足）—— 且**不得**呈现为系统错误（AC-43 / AC-47）。',
    '🔴 真实命中集合 / N_检索 只能由彩排 / PSA 观测，本登记不预存、不声称已测得。',
  ],
  /* 输入侧四个维度的文字；每一段都是上面 `step_a_input` 里的连续片段（由测试断言）。 */
  expected_level_a_parse: {
    goal: '提高问卷回收率',
    actual_attempt: '截止前 24 小时发送一次短信提醒',
    /* 输入明说「当时没有额外记录其它条件」⇒ 本登记不预设 condition 的解析结果。 */
    condition: null,
    actual_result: '问卷回收率仍没有明显提升',
  },
};

/**
 * 全部已登记的现场脚本。🔴 它们是**文本**，不是 seed 记录。
 *
 * 当前两项：主脚本 `TE-DEMO-LIVE-01`（预期命中）+ 零命中脚本 `TE-DEMO-ZERO-01`（预期空态）。
 * 备用脚本 `TE-DEMO-LIVE-02`（预期命中）与已 `RETIRED` 的 `-03` 的权威文本仍在
 * `docs/architecture/05_TEST_DEMO_DEPLOY.md` §K.5，**不在此处重述**。
 */
export const LIVE_DEMO_SCRIPTS: readonly LiveDemoScript[] = [TE_DEMO_LIVE_01, TE_DEMO_ZERO_01];

/**
 * 🔴 显式声明，供审计与测试引用：现场脚本**不得**被预置成第 9 条记录。
 */
export const LIVE_DEMO_SCRIPTS_ARE_NOT_SEEDED = true;
