# 03 AI PIPELINE（AI 管线与结构化输出）

```
文档 ID   : 03_AI_PIPELINE
阶段      : S00-03｜技术架构与实现方案收敛
任务      : S03-C｜AI Pipeline / Structured Output
状态      : PROPOSED / S03-C
效力      : PROPOSED —— 未定稿、未 CONFIRMED、不可作为实现依据
独占方    : S03-C（Worker）
依据来源  : docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md（v0.2.1 DRAFT / Worker CCR 对齐版）
          : docs/analysis/S00-03_技术架构阶段启动.md（§4 硬约束 TC-01–TC-84；§5 TQ01–TQ40；§6.5；§7.2 SP-02 / SP-04）
          : docs/04_USER_FLOW.md · docs/06_AI_CAPABILITIES.md（canonical）
          : docs/DECISIONS.md（D1–D10 / R1–R6 / D-011–D-048 / Q16 派生关闭）
          : docs/architecture/01_APP_ARCHITECTURE.md（PROPOSED 上游；§4.3 / §5 / §6.1 / §9.3）
          : docs/architecture/02_DATA_AND_STATE.md（PROPOSED 上游；§C.4 / §C.5 / §C.8 / §C.10 / §E / §H / §L）
```

> 🚩 **本文件性质**
> 1. **LLM 接入路径与模型选型策略的最终确认属人工决策项**（`TQ03` → **Gate B**）。本文件**只出候选对比、差异、成本、风险与 PROPOSED 推荐**，**不 `CONFIRM` 接入路径、不选最终模型**。
> 2. **`01_APP_ARCHITECTURE.md` 与 `02_DATA_AND_STATE.md` 均为 PROPOSED 上游产物**，**不视为 Gate B 已确认方案**；本文只做**对齐与接口衔接**（§B.7 / §M），不以其为前提。
> 3. 本文件**只写语义契约与判定逻辑**：**不写正式 Prompt 全文 / 不写 Prompt 模板**（→ `TQ32` / 实现阶段）、**不写业务代码 / 不写 SQL / 不定 API 形状**。
> 4. 本文件**未修改**任何 canonical（`DECISIONS.md` / `01`–`09` / `S00-02` 文档 / `CHANGELOG.md`）、**未修改** Shared Technical Contract、**未修改** `01_APP_ARCHITECTURE.md` / `02_DATA_AND_STATE.md`；**未编码 · 未部署 · 未启动 Spike · 未执行任何实测**。
> 5. 全文状态词：除显式引用 canonical 的 `CONFIRMED` 内容外，**一切方案、建议、结论默认 `PROPOSED`**。
> 6. 🔴 **命名红线（契约 §10.2）**：全文**禁止裸用 `A` / `B` / `C`** 指代三层语义或三类出口；三层语义强制 `GATE` / `RUNTIME` / `ACCEPTANCE`，出口强制 `EXIT-A` / `EXIT-B` / `EXIT-C`。

---

## §0 结论摘要（PROPOSED）

| # | 项 | PROPOSED 结论 | 归属 |
|---|---|---|---|
| 1 | **AI 参与边界** | AI 参与 **② 解析 / ④ 候选原因 / ⑦ 比较解释 / ⑧ Candidate Insight / ⑨ Hypothesis**；**⑥ 的 Level A 判定**为 AI 展示型 `Inference`，但**其技术路线属 `TQ04` / `S03-D`**，本文件只锁其输出语义要求 | 本文件 + `S03-D` |
| 2 | **AI 不得改变持久化业务状态** | 成立：AI 产物**只产生"候选 / 待裁决"内容**；一切状态迁移只由**用户动作**或**domain 规则**触发（§A.3） | 契约 §2 / §4 |
| 3 | **Structured Output** | **服务端 schema 校验为硬闸门**（结构 / 必填 / 枚举 / 引用完整性）；**校验失败 = `RUNTIME`（可恢复、可重试）**；**优先 provider 原生受约束解码**（§C） | 本文件 |
| 4 | **② 解析** | AI 只产出 `Extraction` 条目 + 缺口报告 + 非等级化 `parse_state`；**AI 永不产出 `Fact`**；**追问答案双层落库**；失败允许"仅保存原文" | 本文件 §B.2 / §D |
| 5 | **追问预算** | 硬闸门 = **关键追问问题总量 ≤ 3（问题数，不是轮次）**；**1 问题 ↔ 1 缺口（服务端校验 field_key 数量 == 1）**；用户主动补充不计入；跳过 / 不知道记入 `abandoned_gap_set` 且**不得再问同一缺口**；**M2 历史对照类追问由"输入隔离 + 结构校验"硬禁**（不靠 Prompt） | 本文件 §D |
| 6 | **④ 候选原因** | **允许 0 条**（且必须与"生成失败"区分）；`unresolved` 持久化；**不设数量上限 / 不要求逐条处理 / 不要求复用前未处理**；**禁止凑数** | 本文件 §E |
| 7 | **⑧ Candidate Insight** | **唯一生成时机 = 主链第 ⑧ 步**；`E1` / `E4` 为**服务端结构性检查**（AI 不产出），`E2` / `E3` 为 **AI `Inference` 判断 + 理由同屏**；`E2` / `E3` 不满足 → **保持 `candidate` + 三段式**（**不进入任何出口**）；**不存在候选池 / 后台 / 批量生成** | 本文件 §F |
| 8 | **⑨ Hypothesis** | 由**独立对象**承载（两类 `kind`）；严格 8 项 + **两分区**；**grounding 二值**（无部分锚定）；`role = grounding` **落点必须为 `Fact` 条目**，`Extraction` **永不承担 grounding**；`grounded` **1–2 条**由独立可验证方向数决定 | 本文件 §G / §H |
| 9 | **Grounding 执行顺序** | **先判 `N_检索` → 再判 G1–G4 → 再判 N1–N6 → 再判可验证判据**；命中 N1–N6 任一 ⇒ **该条不得为 `grounded`**；**不设"部分锚定"** | 本文件 §G |
| 10 | **两分区** | **只有**【历史证据】【模型先验】；**"混合"不得作为第三来源标签**；`Model Suggestion` **整体显著标注**「非你的历史经验依据」 | 本文件 §G / §H |
| 11 | **Runtime / fallback** | **可恢复、不伪造成功产物、AI 失败不回滚已保存数据、重试不覆盖用户已修改内容、不设产品层重试上限、不设冷却门槛**；**失败分类必须可区分**（`RUNTIME` ≠ `GATE` ≠ 合法为空） | 本文件 §I |
| 12 | **HTTP 传输粒度（回应 `S03-A` §9.3）** | **⑤⑥⑦ 必须在保存成功的同一调用链内定稿；⑧ / ⑨ 允许各自独立 HTTP 往返**（客户端顺序驱动、不排队、不后台、不新增用户动作、⑤→⑥ 自动触发语义不变）→ **PROPOSED 技术结论**；**不构成 `PRODUCT SEMANTIC CONFLICT`** | 本文件 §J |
| 13 | **Hypothesis 编辑边界** | 🔴 **`DECISION REQUIRED`（1 项）** —— canonical 未定义 `Hypothesis` 内容被修改时的裁决位回退机制；"允许编辑"与"只读"产生**不同用户可感知行为**且现有规则**无法唯一推出**（§K） | **人工裁决** |
| 14 | **`TQ03`** | 出 **4 条接入路径候选 + 2 条模型策略候选 + Structured Output 能力需求**，给 **PROPOSED 推荐（后端代理 + provider 抽象层 + 单模型先打通）**；**不 `CONFIRM`** | **Gate B** |
| 15 | **`BLOCKER`** | **无** | — |
| 16 | **`CCR`** | **无**（本文件一处未改契约语义） | — |
| 17 | **`PRODUCT SEMANTIC CONFLICT`** | **无**（`S03-A` §9.3 的语义边界**已在本文件关闭**：⑦→⑧ **不存在必须的用户动作**） | — |
| 18 | **`DECISION REQUIRED`** | 🔴 **有 —— 1 项**（§K：`Hypothesis` 编辑边界与修订后裁决位语义） | **人工裁决** |

---

## §A AI Pipeline 总览

### A.1 五步 AI 参与位置与产物类型

```
①  用户自然语言输入                     ── 无 AI（唯一门槛 = 非空、非纯空白）
        │
②  AI 结构化解析 + 缺口检测 + 追问决策    ── AI ✅  产物：Extraction 条目组 / 缺口报告 / 追问问题
        │
③  用户一次整体校正 / 确认                ── 无 AI（用户动作；用户改动值 → 用户 Fact）
        │
④  AI 候选失败原因                       ── AI ✅  产物：0..n 条 Inference｜decision（unresolved）
        │
⑤  用户确认后保存                        ── 无 AI（用户动作；保存成功 = ⑥ 唯一自动触发）
        │
⑥  系统检索相关历史 Attempt（Level A）    ── AI ⚠️（展示型 Inference；技术路线属 S03-D / TQ04）
        │
⑦  AI 比较解释（相似点 / 差异点 / 为什么相关）── AI ✅  产物：展示型 Inference（无数值）
        │
⑧  AI 提炼 Candidate Insight + E2/E3 检查 ── AI ✅  产物：0..n 条 Insight（candidate）+ 三段式
        │
⑨  AI 生成 Hypothesis（两类）             ── AI ✅  产物：grounded 0–2 条 / model 可选
        │
⑩  证据可点开核对（追溯清单与 N_引用 一致） ── 无 AI（服务端由 EvidenceRef 单一集合派生）
```

> **AI 只在这五步产出内容**；其余环节的推进权**不在 AI 手上**（见 §A.3）。

### A.2 每步的"AI 产物类型"与"确认要求"（对齐契约 §4.1 二分）

| 步 | AI 产物类型 | 确认要求 | 依据 |
|---|---|---|---|
| ② | `Extraction` 条目组 + 缺口报告 + `followup_question`（`Inference｜display`） | **一次整体校正 / 确认**（不逐字段点选）；未反馈 ≠ 已确认 | `D-011` / `D-014` / 契约 §4.1 |
| ④ | `Inference｜decision`（`decision_state = unresolved`） | **必须由用户显式接受或拒绝** | `D-014` / `D-048` |
| ⑥ | `Inference｜display`（相关性判定） | **不要求逐条确认**；可反馈"不相关"；未反馈 ≠ 已确认 | `D-019` / `D-014` |
| ⑦ | `Inference｜display`（相似点 / 差异点 / 理由） | 同上 | `D-014` / `D-019` / `D-020` |
| ⑧ | `Inference｜decision`（`Insight`，`candidate`） | **必须由用户显式接受或拒绝**（`E5`） | `D-014` / `D-021` / `D-039` |
| ⑨ | `Inference｜decision`（两类 `Hypothesis`） | **必须由用户显式接受或拒绝**（保留机制） | `D-027` / `D-042` |

### A.3 🔴 硬边界：AI 产物 ≠ 业务状态改变

> **总规则：AI 只能生成"内容条目 / 候选 / 待裁决项"。任何持久化业务状态的改变，只能由「用户动作」或「domain 规则（由用户动作触发）」完成。AI 自身不持有任何状态迁移权。**

| 持久化状态 | 谁可以改变 | AI 是否可改变 | 依据 |
|---|---|---|---|
| `Attempt.attempt_status`（`Draft` → `Formal`） | **仅用户显式确认动作**（P1 + 结果状态齐备） | ❌ **系统/AI 一律不得自动升级**（含"信息齐了就自动升""预算用完就升"） | `D-012` / `TC-04` / `D-023` 特别规则 ③ |
| `result_status`（四态） | **仅用户显式接受 / 修改**（AI 只提候选） | ❌ 不得由 AI 直接写入 | `D10` / `D-014` / `TC-05` |
| `candidate_cause.decision_state` | **仅用户逐条接受 / 拒绝** | ❌ **不得"默认已接受"**（不因保存 / 离开页面 / 时间经过而改变） | `D-048` C-1 |
| `Insight.status` | 用户动作（接受 / 拒绝 / 撤销接受 / 内容性修改）+ **domain 规则**（内容性修改 ⇒ 退回 `candidate` + 重检 `E1`–`E4`） | ❌ AI 不得自动接受 / 自动晋升 / 自动补字段 / 自动改写 | `D-039` / `D-040` / `TC-73` / `TC-74` |
| `Hypothesis.decision_state` | **仅用户** | ❌ | `D-027` / `TC-07` |
| `Hypothesis.saved_by_user` | **仅用户**（且**保存 ≠ 接受**） | ❌ | `D-042` / `TC-09` |
| `archive_state` | **仅用户**（可撤销） | ❌ **系统不得自动归档 / 自动删除** | `D-043` / `TC-56` / `TC-60` |
| `EvidenceRef` 集合 | 由 **⑧ / ⑨ 生成批次**进入，但**必须先经 `domain` 校验（`S03-B` §E.2 / 本文件 §C.3）**；`owner = Insight` 时增删**视为内容性修改** | ⚠️ AI 只能**提案**，**落库由 `domain` 校验 + `server` 执行**（`ai/` **不写库**） | `S03-A` §5 纪律 3；契约 §5.2；`TC-74` |
| `N_检索` / `N_引用` | **服务端派生**（`N_检索` 存于当前有效派生结果；`N_引用` 实时派生） | ❌ **AI 不得产出任何计数**；不得请求 AI 输出条数用于界面 | 契约 §6.3 / `S03-B` §F |
| 三种标注（「来源已归档」/「上下文」/「引用失效」） | 服务端按 `target` 当前 `archive_state` 与 `role` **动态派生** | ❌ AI 不得产出存档 / 失效类标注 | 契约 §5.2 第 11 条 / §7.4 |
| `source_type` | **恒不变**（任何用户动作都不得改变；AI 亦然） | ❌ AI **不得产出 `Fact`**、不得改写既有条目来源 | 契约 §4.1 / §4.2 第 1 条 / `TC-12` |

### A.4 五条 AI 层纪律（本文件对 `ai/` 层的实现约束，PROPOSED）

| # | 纪律 | 依据 |
|---|---|---|
| **AI-1** | **`ai/` 不写库**：AI 输出必须先经 `domain` 判定（门槛 / 校验 / 状态迁移决策）后才由 `server` 持久化 | `S03-A` §5 纪律 3；`D7` / `TC-12` |
| **AI-2** | **`ai/` 不做门槛判定**：不得由 AI 决定"是否 `Formal`""是否 `accepted`""是否产出 `grounded`" | `TC-77` / `TC-13` / `TC-50` |
| **AI-3** | **`ai/` 输入隔离**：② 的输入**不得包含任何历史 `Attempt` 数据**（这是 `TC-34` M2 禁问历史对照的**结构性硬禁手段**）；⑥ 之后的步骤才可注入历史候选 | `D-018` / `TC-34` |
| **AI-4** | **AI 永不产出 `Fact`**：`Fact` 条目的产生方式只有"用户提供"（原文 / 追问原话 / 用户校正值 / 用户本人指定） | `D7` / `D-013` / `D-024` / 契约 §4.1 |
| **AI-5** | **AI 永不产出禁用项**：数值化相似度 / 分数 / 星级 / 百分比 / 置信度 / 等级化措辞（高 · 低置信 · 完成度）/ 技术层字段（`model` / `prompt` / `token` / `temperature` / `trace id` / `latency` / `retries` / 内部检索分数）**一律不得出现在 AI 输出契约中** | `TC-41` / `TC-49` / `TC-64` / `TC-71` |

### A.5 步骤 ↔ `TC` / `AC` 覆盖（本文件完成判据之一）

| 步 | 关联硬约束 | 关联验收点 |
|---|---|---|
| ② | `TC-10`–`TC-18` / `TC-20` / `TC-29`–`TC-36` / `TC-63` / `TC-64` | `AC-04` / `AC-07` / `AC-09` / `AC-14`–`AC-19` / `AC-30` / `AC-87` / `AC-88` / `AC-Q06-1`–`AC-Q06-5` |
| ④ | `TC-11` / `TC-13` / `TC-18` | `AC-10`（校准口径）/ `AC-91`–`AC-96` |
| ⑦ | `TC-37`–`TC-41` | `AC-20`–`AC-24` / `AC-82`–`AC-86` |
| ⑧ | `TC-26` / `TC-50`–`TC-51` / `TC-73`–`TC-77` | `AC-25`–`AC-29` / `AC-13` / `AC-58` / `AC-97` / `AC-99` |
| ⑨ | `TC-07`–`TC-09` / `TC-50`–`TC-55` / `TC-65`–`TC-68` | `AC-31`–`AC-46` / `AC-98` |
| ⑩ | `TC-27` / `TC-44`–`TC-49` / `TC-58`–`TC-59` | `AC-38` / `AC-39` / `AC-74` / `AC-84` / `AC-100` |

---

## §B 各 AI Step I/O 表

### B.1 总表（速查）

| 步 | 输入语义（服务端注入） | 输出语义 | 必填 | 可空 | 出口 | 技术失败 |
|---|---|---|---|---|---|---|
| ② | `Draft.raw_text` + 既有条目（续写）+ 已放弃缺口集合 + 已问问题数 | `Extraction` 条目组 + 缺口报告 + `parse_state` + 至多 1 个 `followup_question` | `parse_state` / `extraction_items` / `gap_report` | `followup_question` | 无（失败 → 仅保存原文） | `RUNTIME` |
| ④ | ③ 确认后的字段值集合（**不得含历史数据**） | 0..n 条候选原因 + `basis_state` | `basis_state` / `candidate_causes` | 数组可为空 | 无（0 条 = 合法产物） | `RUNTIME` |
| ⑦ | ⑥ 派生结果候选集合 + 当前 Attempt 的 Level A 条目值 | 相似点 / 差异点 / 相关理由 / 未比对维度 | `comparison_points` / `relevance_reasons` | `uncompared_dimensions` | `EXIT-C`（无可解释维度） | `RUNTIME` |
| ⑧ | ⑦ 输出 + 已确认依据 + 该 Attempt 的 `Formal` 条目 | 0..n 条 `Insight`（`candidate`）+ `E2`/`E3` 判断 + 三段式 | 每条 `Insight` 的 ①②③④ + `E2`/`E3` 判断与理由 | `insight_verifiability` / 0 条时的 `exit_route` | `EXIT-A` / `EXIT-C` | `RUNTIME` |
| ⑨ | ⑦ 输出 + 推理输入清单 + `N_检索`（服务端注入） | 两类 `Hypothesis`（8 项 + 分区）+ grounding 命中项 | `grounded` 8 项 ①–④ + `source_partition` + grounding 依据 | ⑤–⑧ 可显式缺失；`grounded` 整体可为 0 条 | `EXIT-A` / `EXIT-B` / `EXIT-C` | `RUNTIME` |

### B.2 ② 结构化解析

#### B.2.1 输入语义

| 输入项 | 来源 | 硬规则 |
|---|---|---|
| `raw_text` | 第 ① 步 `Draft`（`Fact` 条目） | **第 ① 步唯一门槛 = 非空、非纯空白**；**不得**在 ② 因"语义不可解析"回退阻断 ①（"是否可解析"**只作 ② 的解析质量输入**） |
| 既有条目（续写场景） | 该 `Draft` 当前全部内容条目 | ② **重试 / 续写**时**必须**以当前值为准（不得用旧快照） |
| 已放弃缺口集合 | `Attempt Draft State.abandoned_gap_set` | **不得**再对同一缺口提问 |
| 已问问题数 | `Attempt Draft State.asked_key_question_count` | 达 3 ⇒ **服务端拒绝生成第 4 个问题**（不是靠 Prompt） |
| 🔴 **历史 `Attempt` 数据** | **禁止注入** | `AI-3`：② 的输入**不得包含任何历史记录**（M2 禁问历史对照的结构性硬禁手段，`TC-34`） |

#### B.2.2 输出语义

| 输出项 | 语义 | 必填 | 备注 |
|---|---|---|---|
| `extraction_items[]` | 对 5 组字段框架的抽取结果（**逐条携带来源属性**） | ✅（数组可空） | 每条：`field_key` + `value_text` + `presence_state` + `source_type = Extraction` + `origin_hint`（可选） |
| `gap_report[]` | 缺口列表 | ✅（数组可空） | 每条：`gap_id` + `field_key` + `gap_priority ∈ {P1, P2, P3}` |
| `parse_state` | **非等级化状态描述** | ✅ | `not_parsed` / `extracted` / `not_extracted` / `extract_failed` / `pending_user_confirm`（枚举序列化归 `TQ16`） |
| `followup_question` | **至多 1 个**待问问题 | ❌（无缺口时为空） | `question_ref` 指向 `followup_question` 内容条目；**必带 `target_gap_id`** |

#### B.2.3 硬禁项（② 的产物中不得出现）

- ❌ **置信度 / 完成度 / 质量评分 / 等级化措辞**（"高·低置信""完成度""解析质量良好"）（`TC-64` / `AC-88`）；
- ❌ **任何历史对照内容或历史对照类问题**（`TC-34` / `D-018`）；
- ❌ **`Fact` 条目**（`AI-4`）；
- ❌ **把 `result_status` 当作 P1 事实追问**（结果状态属决策型 `Inference`，走"AI 候选 + 用户显式接受 / 修改"独立通路）（`D-018` / `TC-36`）；
- ❌ **一个问题打包多个字段**（服务端校验 `target_gap_id` 对应 `field_key` 数量必须 == 1）（`TC-30` / `AC-Q06-3`）；
- ❌ **数值化相似度 / 技术层字段**（`TC-41` / `TC-71`）。

#### B.2.4 schema 校验（服务端硬闸门 → 失败归 `RUNTIME`）

| # | 校验点 |
|---|---|
| V-2-1 | `parse_state` ∈ 冻结枚举；**不得**出现等级化取值 |
| V-2-2 | 每条 `extraction_items[].source_type` **必须**为 `Extraction`（出现 `Fact` ⇒ 拒绝） |
| V-2-3 | `field_key` ∈ 冻结清单（`TQ18`）；`presence_state ∈ {present, unknown}`；**`unknown ⇒ value_text 为空`**（双向断言，`TC-06` / `W-3-a`） |
| V-2-4 | `gap_priority = P1` 的 `field_key` **只能** ∈ {`goal`, `actual_attempt`, `actual_result`}（**不含 `result_status`**） |
| V-2-5 | 若 `followup_question` 存在 ⇒ `asked_key_question_count + 1 ≤ 3` 且 `target_gap_id ∈ gap_report` 且 `target_gap_id ∉ abandoned_gap_set` |
| V-2-6 | **不得**对已被 `abandoned_gap_set` 覆盖的缺口生成问题（`TC-33` / `AC-17`） |
| V-2-7 | 全文禁止字段断言（`similarity` / `score` / `confidence` / `weight` / `percent` / `star` 等）不存在（`S03-B` §F.5） |

#### B.2.5 Runtime failure 与 fallback

| 情形 | 处置 |
|---|---|
| Provider 调用失败 / 超时 | `RUNTIME`（可恢复）；**允许"仅保存原文"**：`parse_state = not_parsed` / `extract_failed`，`Draft` 保留并标「尚未解析」；**显式提供「重新解析」**；**不设次数门槛 / 不设冷却** |
| schema 校验失败 | 同上（`RUNTIME`）；**不得伪造解析结果**（不得用部分输出冒充完整解析） |
| 重试 | **不覆盖用户已修改内容**：已被用户校正 / 确认的条目**原样保留**；AI 只能填充 `presence_state = unknown` 的条目，或对**未确认**条目提出**替换建议（须用户确认）** |
| 输入超长 | **不阻断**：提供降级表达方式（分段 / 补充备注），仍创建 `Draft`；**产品层不锁字符上限**（`D-047` R4） |

依据：`D-047` / `TC-63` / `TC-64` / `AC-87` / `AC-88`。

### B.3 ④ 候选失败原因

#### B.3.1 输入语义

| 输入项 | 来源 | 硬规则 |
|---|---|---|
| ③ 确认后的字段值集合 | 用户确认 / 校正后的条目 | **只允许**：`Fact` 条目 + 已被用户确认的 `Extraction` 条目 |
| 未确认的 `Extraction` | 该 `Draft` | ⚠️ 可作为**理解输入**，但**不得**作为"已确认依据"（`TC-13` 精神）；输出中不得称其为已确认 |
| 缺口与未知维度清单 | ② 的 `gap_report` + `presence_state = unknown` 的条目 | 未知维度**不参与**任何推断依据陈述（`TC-40` 精神） |
| 🔴 历史 `Attempt` 数据 | **禁止注入** | ④ 发生在 ⑥ 之前，**结构上无历史可用**；输出中**不得**出现任何历史对照内容 |

#### B.3.2 输出语义

| 输出项 | 语义 | 必填 |
|---|---|---|
| `basis_state` | `sufficient` / `insufficient` | ✅ |
| `candidate_causes[]` | 0..n 条候选原因 | ✅（数组可空） |
| 每条 `candidate_cause` | `cause_text`（命题表述）+ `source_type = Inference` + `confirmation_class = decision` + `decision_state = unresolved` | ✅ |

**不变量**

- `basis_state = insufficient` ⇒ **`candidate_causes` 必须为空**（双向）；
- `basis_state = insufficient` 时**必须**显式表达「当前依据不足，暂不推断原因」或等价语义（**不能只用空数组表达**）；
- **不设数量上限**（由 AI 按实际依据给出）（`D-048` C-8）；
- **禁止**输出数量目标 / 最少条数 / 排序强度 / 等级；
- **禁止**出现"低 / 中 / 高置信"类分级措辞（`D-048`）。

#### B.3.3 两类"0 条"的区分（与"生成失败"三方区分）

| 情形 | 数据层表达 | 用户可见语义 | 是否技术失败 |
|---|---|---|---|
| **0 条（依据不足）** | `basis_state = insufficient` 且 `candidate_causes` 为空 | "当前依据不足，暂不推断原因" | ❌ **合法产物**，**不得呈现为错误** |
| **全部未处理** | 存在条目且全部 `decision_state = unresolved` | "有候选但尚未处理" | ❌ 合法 |
| **生成失败** | **无产物**（`RUNTIME`） | "生成失败，可重试" | ✅ `RUNTIME` |

> 🔴 三者**不得共用同一文案 / 同一状态**（`D-048` C-4 / `AC-95`）。

#### B.3.4 schema 校验 / Runtime / fallback

| 项 | 内容 |
|---|---|
| 校验 | 每条必带 `source_type = Inference` + `confirmation_class = decision` + `decision_state = unresolved`（**出现 `accepted` / `rejected` ⇒ 拒绝**，`C-1`）；`insufficient ⇔ 数组为空`；禁数量目标字段；禁数值 / 等级字段 |
| `RUNTIME` | 调用失败 / 超时 / schema 失败 ⇒ `RUNTIME`（可重试）；**已有数据不回滚**（⑤ 尚未发生，`Draft` 原样保留） |
| fallback | **④ 的产物不是 ⑤ 的门槛**：候选原因无论 0 条 / n 条 / 生成失败，**均不阻断保存 `Formal`**（`D-048` / `TC-04`）；用户可**跳过 ④**继续 ⑤；**不得**用"AI 失败"伪造成"依据不足的 0 条" |

依据：`D-048` / `TC-13` / `AC-10`（校准口径）/ `AC-91`–`AC-96`。

### B.4 ⑦ 比较解释

#### B.4.1 输入语义

| 输入项 | 来源 | 硬规则 |
|---|---|---|
| 派生结果候选集合 | ⑥（`Retrieval Derivation.candidate_entries`） | **AI 只能引用输入中给出的候选**；**不得**自造 / 推测记录（引用不可解析 ⇒ 校验失败） |
| 命中 Level A 维度集合 / 未比对维度集合 | ⑥ | ⑦ **不得**改变"是否相关"的判定（`TC-37` / `TC-39`） |
| 当前 Attempt 的 Level A 条目值 | 该 `Formal Attempt` | `presence_state = unknown` 的维度**不参与比对** |
| `Project` / 标签 / 版本·环境 / 语义 | Level B 维度 | **只能作解释**，**不得单独决定"这是一条相关经验"**（`TC-38` / `D-019`） |

#### B.4.2 输出语义

| 输出项 | 语义 | 必填 |
|---|---|---|
| `comparison_points[]` | 相似点 / 差异点 | ✅（数组可空） |
| 每条 `comparison_point` | `attempt_ref` + `point_kind ∈ {similar, different}` + `dimension_key` + `text` | ✅ |
| `relevance_reasons[]` | 「为什么相关」的可解释理由 | ✅（数组可空） |
| 每条 `relevance_reason` | `attempt_ref` + `reason_text` | ✅ |
| `uncompared_dimensions[]` | 未比对维度清单（值来源：`presence_state = unknown`） | ❌（可空数组） |

**全部条目来源类型 = `Inference｜display`**（不要求逐条确认；可反馈"不相关"；未反馈 ≠ 已确认）（`D-014` / `D-019`）。

#### B.4.3 硬禁项

- ❌ **任何数值化相似度 / 接近度 / 匹配度 / 顺序分 / 星级 / 百分比**（`TC-41` / `D-020` / `AC-23`）；
- ❌ `dimension_key` **越出 Level A 四维度**（目标 / 方案·技术对象 / 条件 / 结果·现象）；
- ❌ 把 **`presence_state = unknown` 的维度判为 `similar`**（未比对维度只能进 `uncompared_dimensions`）（`TC-40` / `AC-22`）；
- ❌ **以 Level B 维度作为"为什么相关"的独立成立依据**（Level B 只能增强 / 解释）；
- ❌ **补满 / 凑数**（不足 3 条即如实展示实际数量）；**不得**用"最近一次"补位（`D-046` / `Q16`）；
- ❌ **输出排序结果或排序分数**（Level C 时间只作辅助排序，排序键构造属 `S03-D`；本文的 ⑦ 输出**不含排序**）；
- ❌ **改写 `N_检索` / 命中维度集合**（⑦ 不得反向改变 ⑥ 的判定）。

#### B.4.4 schema 校验 / Runtime / fallback

| 项 | 内容 |
|---|---|
| 校验 | `attempt_ref` **必须** ∈ 输入候选集合（否则**引用不可追溯**，见 §I 分类 2）；`dimension_key` ∈ Level A 四维度；`similar` 集合与 `uncompared_dimensions` **无交集**；禁止字段断言（数值 / 技术层）为真 |
| `RUNTIME` | 调用失败 / 超时 / schema 失败 ⇒ `RUNTIME`（可重试）；**⑥ 的检索结果与 `N_检索` 已定稿并保留** —— **比较解释缺失 ≠ 检索失败**，**不得**回退 ⑥ 的结果 |
| fallback | 若**无法形成任何有解释力的比较点**（例如全部维度均为 `unknown`）⇒ `EXIT-C not-formable` 语义 + **显式说明**（"当前无法形成可解释的相似 / 差异说明"）；**不阻断**后续步骤；**不得**编造比较点 |

依据：`D-019` / `D-020` / `D-025` / `D-046` / `TC-37`–`TC-41` / `AC-20`–`AC-24`。

### B.5 ⑧ Candidate Insight

#### B.5.1 输入语义

| 输入项 | 来源 | 硬规则 |
|---|---|---|
| ⑦ 输出 | 派生结果（比较点 / 理由 / 未比对维度） | 可作**推理输入**，**不是证据**（`R-3`：派生结果不得成为 `EvidenceRef.target`） |
| 已确认依据 | 用户已显式接受的决策型 `Inference`（含结果状态、已接受候选原因） | ⚠️ `decision_state = unresolved` 的项**不得**进入"已确认经验"（`TC-13`） |
| 该 Attempt 的 `Formal` 条目 | 内容条目集合 | 引用落点只允许 `Fact` / `Extraction`；**`role = grounding` 落点必须为 `Fact`** |
| 候选 `Formal Attempt` 集合 | ⑥ 派生结果候选条目 | ⑧ 的 `EvidenceRef` **只能指向输入候选集合内**的记录 |

#### B.5.2 输出语义

| 输出项 | 语义 | 必填 |
|---|---|---|
| `insights[]` | 0..n 条 `Insight`（`status = candidate`） | ✅（数组可空） |
| 每条 `Insight` 的**内容性字段 ①** | `insight_proposition`（经验命题内容） | ✅ |
| 内容性字段 **②** | `insight_scope`（适用范围 / 条件集合） | ✅（可含 `unknown` 维度） |
| 内容性字段 **③** | 引用清单 = `EvidenceRef` 集合提案（**不另存副本**） | ✅（≥ 1 条，且 target 均为 `Formal`） |
| 内容性字段 **④** | `insight_basis` / `insight_verifiability` | 条件必填 |
| `e2_check` / `e3_check` + 理由 | 内容质量判断（**必须标 `Inference`**，与理由同屏） | ✅ |
| `missing_items` / `how_to_supplement` | `E2` / `E3` 不满足时的三段式（**缺什么** / **如何补充**） | 条件必填 |
| `exit_route` | `EXIT-A evidence-insufficient` / `EXIT-C not-formable` | 0 条时必填 |

#### B.5.3 `E1`–`E4` 的判定归属（关键分工）

| 条件 | 判定方 | 说明 |
|---|---|---|
| **`E1` 有效来源** | **服务端结构性检查（可机器核验）** | `Insight` 至少关联 ≥ 1 条 `Formal Attempt`；**`Draft` 不得作为来源** |
| **`E2` 结论明确** | **AI（`Inference`）+ 理由同屏** | 用户可反馈"不同意"（留痕）但**不改变状态**；**不提供"推翻判定"按钮**；**不引入分数 / 等级 / 置信度** |
| **`E3` 适用范围明确** | **AI（`Inference`）+ 理由同屏** | 同上；**关键条件完全缺失时 `Insight` 保持 `candidate`** |
| **`E4` 证据可追溯** | **服务端结构性检查（可机器核验）** | 引用可解析 + 落点可追溯 + 引用清单**不得出现 `Draft`**；跨记录比较为**条件项**（非硬门槛） |
| `E5` 用户显式接受 | **仅用户动作** | 用户操作可决定 `E5`，**不能替代 `E1`–`E4`** |

> 🔴 **AI 不产出 `E1` / `E4` 判定**（它们不是"内容质量判断"，而是结构性检查）；`AI-2`：AI **不得**决定"是否可晋升"。

#### B.5.4 不变量（⑧ 的硬边界）

| # | 不变量 | 依据 |
|---|---|---|
| 8-1 | **⑧ 是 `Insight` 的唯一生成时机**；**不存在**后台 / 保存后自动 / 异步批量 / 定期挖掘 / `candidate` 待办池 | `D-022` / `TC-26` / `AC-28` |
| 8-2 | **`E2` / `E3` 不满足 ⇒ 保持 `candidate` + 三段式**；**不进入任何 0 条出口** | `D-038` / `TC-65` / `AC-97` / `AC-99` |
| 8-3 | **不自动 `accepted`**；**不存在绕过 `E1`–`E4` 的路径**；**术语「手动晋升 / 强制晋升」废止** | `D-039` / `TC-77` / `AC-61` |
| 8-4 | **禁止凑数**：条数 = 实际可形成的经验命题数（**无数量目标、无最少条数、无"默认 N 条"**） | `D-028` 精神 / `TC-49` |
| 8-5 | **措辞红线**：不得出现"已证实 / 已验证 / 方法 X 无效"；来源恒为 `Inference` | `D-015` / `TC-12` / `AC-11` / `AC-27` |
| 8-6 | 0 条时出口**只用 `EXIT-A` / `EXIT-C`**（**不得**为 ⑧ 强行制造 `EXIT-B`）；**不得**把两者统一写成"历史证据不足" | `TC-65` / `AC-97` |
| 8-7 | 「如何补充」属**展示型 `Inference`**（AI 建议），**不改变持久化业务状态**、**不得绕过 `E5`**、**不得伪装为用户结论** | `D-038` |
| 8-8 | 引用**不得**指向 `Draft` / 已归档记录 / `Insight` / `Hypothesis` / 派生结果 | 契约 §5.1 / `TC-51` |

#### B.5.5 schema 校验 / Runtime / fallback

| 项 | 内容 |
|---|---|
| 校验 | 内容性字段 ①②③④ 齐全性；`evidence_refs[].role` 逐条必填；`role = grounding` 落点 `source_type = Fact`；`target` 必须为输入候选集合内的 `Formal`（`active`、≠ 源 `Attempt`）；`e2_check` / `e3_check` 必须带 `Inference` 标记与理由；`E2` / `E3` 不满足 ⇒ `missing_items` / `how_to_supplement` 必填；0 条 ⇒ `exit_route ∈ {EXIT-A, EXIT-C}` |
| `RUNTIME` | 调用失败 / 超时 / schema 失败 / 引用不可追溯 ⇒ `RUNTIME`（可重试）；**⑤ 已保存的 `Formal Attempt` 与派生结果不回滚**；**不得伪造 0 条**（必须与"依据不足的 0 条"区分） |
| fallback | 重试**不得覆盖用户已做出的裁决动作**（已 `accepted` / `rejected` 的既有 `Insight` 不受重试影响）；**不得**自动重生成、**不得**自动退回既有 `Insight` 状态 |

依据：`D-021` / `D-022` / `D-038` / `D-039` / `TC-26` / `TC-76` / `AC-25`–`AC-29` / `AC-58`。

### B.6 ⑨ Hypothesis

#### B.6.1 输入语义

| 输入项 | 来源 | 硬规则 |
|---|---|---|
| ⑦ 输出 | 派生结果 | 作推理输入 |
| `N_检索` | **服务端注入**（不得由 AI 推算 / 声明条数） | 用于 grounding 与出口路由的**第一个判定输入** |
| 已确认依据 | 用户已显式接受的决策型 `Inference` | `unresolved` 项不得作为已确认依据 |
| 推理输入清单 | `reasoning_input_refs` 提案来源 | 可含：工作空间中已 `accepted` 的 `Insight`；未接受的 `Candidate Insight`（含本次 ⑧ 产物）；已保存的 `Model Suggestion` |
| 候选 `Formal Attempt` 集合 | ⑥ 派生结果候选条目 | `EvidenceRef` 只能指向该集合内记录 |
| 用户已有阈值 / 判据 | 用户历史 `Fact` 记录 / 用户当前提供 | **优先引用**（`D-032` 顺序 ①） |

**⑨ 与 `E5` 的解耦（澄清项，非新增机制）**：**⑨ 的自动生成不等待 ⑧ 的用户裁决**（`E5`）。

- 依据 ①：`D9` **未在 ⑧→⑨ 之间定义任何用户动作**；② `D-022` 的"同屏 / 不额外增加操作步骤"**禁止把 `E5` 变成 ⑨ 的前置门槛**；③ 契约 §9 表中 ⑨ 的输入写作"已接受 `Insight`（**仅作推理输入**）"——该表述约束的是**已接受 `Insight` 可被用于什么**（推理输入，`TC-55` / `D-030`），**不是"必须先发生 `E5`"**；④ `TC-55`：**未接受的 `Candidate Insight` 同样只能作推理输入**，即 `candidate` 亦可作为输入。
- 处置：⑨ 的推理输入**可为**当前 `candidate`（标注「前序候选经验（未接受）」语义）**或**工作空间中已 `accepted` 的 `Insight`；**两者都不承担 grounding、不计入 `N_引用`、不进 ⑩**。
- ⚠️ 若 Integrator / 人工判定 ⑨ **必须**等待 `E5`，则该判定会**新增一个主链必经用户动作** → 应升级为**第二项 `DECISION REQUIRED`**（本文不自行选择）。

#### B.6.2 输出语义

| 输出项 | 语义 | 必填 |
|---|---|---|
| `grounded[]` | `History-grounded Hypothesis`（**0–2 条**） | ✅（可为 0 条，此时 `exit_route` 必填） |
| 每条 `grounded` 的 **8 项** | 严格 1:1 对齐 `D5` 8 项 | ①–④ 必填；⑤–⑧ 允许**显式缺失** |
| 每条 `grounded` 的 grounding 声明 | 命中的 `G1`–`G4` 项 + 引用清单（`role = grounding`，落点 `Fact`） | ✅ |
| `source_partition` | `history_evidence` / `model_prior` | ✅ |
| `model[]`（可选） | `Model Suggestion` | ❌（可选、数量另计） |
| `exit_route` | `EXIT-A` / `EXIT-B` / `EXIT-C`（`grounded` = 0 条时**必须分类**） | 条件必填 |

#### B.6.3 硬禁项（⑨ 的产物中不得出现）

- ❌ 把两类输出称为 **`Candidate Insight`**（该名称只属 ⑧）（`D-027` / `AC-33`）；
- ❌ **"混合"作为第三来源标签**；**"部分锚定"中间等级**（`TC-53` / `TC-50`）；
- ❌ **`grounded` ≥ 3 条 / 默认 2 条 / 近义改写凑数 / 按 `N_检索` 决定条数**（`D-028` / `TC-28` 邻接）；
- ❌ **用 `Model Suggestion` 填充 `grounded` 的位置**（`AC-46`）；
- ❌ 把 **`not-verifiable` / `not-formable` 写成"历史证据不足"**（`AC-35` / `AC-98`）；
- ❌ **AI 推荐的"保持不变"写入 `Fact` 层**（`TC-16` / `AC-32`）；
- ❌ **不合格判据**（"效果更好 / 性能提升 / 好像有改善"）当作有效支持 / 反驳判据；**无有效判据必须显式标注缺失**（`D-032`）；
- ❌ 任何数值 / 置信度 / 等级 / 技术层字段；
- ❌ `Model Suggestion` 取得 `grounded` 地位或进入经验区（`TC-54` / `AC-70`）。

#### B.6.4 schema 校验 / Runtime / fallback

| 项 | 内容 |
|---|---|
| 校验 | 每条 `grounded`：`G` 命中项 ≥ 1 + 引用可追溯 + `role = grounding` 落点 `Fact` + `target` ∈ 输入候选集合；8 项 `field_key` 齐全性（①–④ 必填 / ⑤–⑧ 显式缺失可接受）；`source_partition` ∈ 两值；`kind = model` ⇒ **`EvidenceRef` 集合必须为空** + 整体标注恒存；条数断言（`grounded` ≤ 2）；`grounded = 0` ⇒ `exit_route` 分类存在；禁字段断言为真 |
| `RUNTIME` | 调用失败 / 超时 / schema 失败 / 引用不可追溯 ⇒ `RUNTIME`（可重试）；**⑧ 产物与全部既有数据不回滚**；**不得**把 `RUNTIME` 写成某类出口 |
| fallback | 重试**不得覆盖用户已做出的裁决**（已接受 / 拒绝的 `Hypothesis` 不变）；**不得**自动改写既有结论；**不得**以重试为由重新生成 ⑧ 产物 |

依据：`D-027`–`D-036` / `TC-50`–`TC-55` / `AC-31`–`AC-46`。

### B.7 ⑥ Level A 相关性判定的输出语义要求（技术路线归 `S03-D`）

> ⚠️ `TQ04`（检索技术路线）**未裁决**。本节**只锁"AI 侧若参与判定，其输出必须满足的语义"，不预设路线**。

| 要求 | 内容 |
|---|---|
| 输出集合 | **两份集合**：命中的 Level A 维度集合 + 未比对维度集合（`TC-37`） |
| 判定唯一依据 | **Level A 四维度**；Level B **不得**作为准入；Level C（时间）**只作辅助排序**（`TC-38` / `TC-39`） |
| 未知维度 | `presence_state = unknown` 的维度**不参与比对**；**不得**因双方都未知而判为相似（`TC-40`） |
| 呈现 | 只输出**可解释的匹配理由**；**禁止**任何数值（`D-020` / `TC-41`） |
| 排除项 | `Draft`（全部链路）/ 已归档（新检索）/ **源 `Attempt` 自身**（`D-9` 第 ⑥ 步"相关**历史** `Attempt`"直接推出） |
| 与 ⑦ 的关系 | ⑥ 决定**集合**与**命中维度**；⑦ 只**解释**，**不得**反向改变判定 |

---

## §C Structured Output 契约

> 🔴 **本文件不写 Prompt 全文 / 不写 Prompt 模板**（→ `TQ32` / 实现阶段）。本节只定义**输出结构语义、校验规则、失败分类**。
> 🔴 **路由命名 / 请求响应体形状不在本文件定稿**（契约 §0.2：最终 API 归 `S03-A` / `S03-B` 后续 + Integrator）。

### C.1 通用输出信封（逻辑语义，非物理形状）

```
StepOutput（逻辑）
├── step             : S02 | S04 | S06 | S07 | S08 | S09     （步骤级可寻址，TC-19）
├── run_ref          : 技术层执行标识（不入产品响应体、不出界面，TC-71）
├── exit_route       : none | EXIT-A | EXIT-B | EXIT-C      （语义级出口；非技术失败）
└── items            : 该步产物条目集合（逐条携带来源属性）
```

**硬规则**

| # | 规则 | 依据 |
|---|---|---|
| C-1 | **`exit_route` 与技术失败正交**：`RUNTIME` **不是** `exit_route` 的取值；**不得**把技术失败写成某类出口，**不得**把合法出口写成错误 | `TC-28` / `TC-61` / `TC-65` |
| C-2 | **禁用裸 `A` / `B` / `C`**；出口强制使用 `EXIT-A` / `EXIT-B` / `EXIT-C` 全名 | 契约 §10.2 |
| C-3 | `run_ref` 属技术层，**不得**进入产品响应体 / 界面 / ⑩ 追溯 | `TC-71` / `AC-78` |
| C-4 | 每条产物条目**必带 `source_type`**；`Inference` **另带 `confirmation_class`**；`decision` **再带 `decision_state`** | `TC-10` / `TC-11` |
| C-5 | **`source_type` 的合法值受步骤限制**：② 只允许 `Extraction`；④/⑧/⑨ 只允许 `Inference`；**任何步骤都不得产出 `Fact`** | `AI-4` / `TC-12` |
| C-6 | **`decision_state` 的初始值只能是 `unresolved`**；AI **不得**产出 `accepted` / `rejected` | `D-048` C-1 / `TC-13` |
| C-7 | **引用必须按 ID 指向**；**不得**用文本相似度 / 标题匹配 / 列表位置作引用依据；**引用的 ID 必须取自输入中给出的集合** | `D-021 E4` / 契约 §3.2 第 2 条 |

### C.2 服务端校验 = 硬闸门（三层）

```
第 1 层｜结构校验      必填项 / 类型 / 长度 / 数组形状          → 失败 = RUNTIME
第 2 层｜枚举与词表校验  枚举取值 / field_key / role / 禁字段词表  → 失败 = RUNTIME
第 3 层｜引用完整性校验  引用 ID 可解析 / 指向类型合法 / 落点层级  → 失败 = 分类处置（§C.3）
```

- **第 1–2 层失败 ⇒ `RUNTIME`（可恢复、可重试）**，且**不得**用部分输出冒充成功产物；
- **第 3 层失败 ⇒ 见 §C.3**（**引用不可追溯 ≠ 结构失败**，不得一律归 `RUNTIME`）。

### C.3 引用完整性校验失败的分类处置

| 情形 | 分类 | 处置 | 依据 |
|---|---|---|---|
| **引用 ID 不存在 / 不可解析 / 越出输入候选集合** | **grounding 不成立**（等价于 N1"无字段可指"） | 该条**不得标 `grounded`**；**该条不产出**；**不得**改名保留为 `Model Suggestion`；**显式记录未产出原因**；若该步全部候选均因此失效 ⇒ 按 0 条出口路由 + `RUNTIME` 提示（可重试） | `TC-52` N1 / `D-030` |
| **`role = grounding` 落点为 `Extraction` 条目** | **grounding 不成立** | 同上（`Extraction` **永不承担 grounding**） | 契约 §5.2 第 9 条 / `TC-51` |
| **`target` 指向 `Draft`** | **命中 N5** → grounding 不成立 | 该条不得为 `grounded`；**该条不产出** | `TC-52` N5 |
| **`target` 指向 `Insight` / `Hypothesis` / `Retrieval Derivation` / `Model Suggestion`** | **引用类型非法** | 该引用**拒绝落库**；该条不得为 `grounded` | 契约 §5.1 / §5.2 第 4 条 / `S03-B` §E.1 |
| **`target` 指向已归档记录（新引用）** | **新 grounding 来源不成立** | 该引用**拒绝**（新引用不得指向已归档）；该条不得为 `grounded` | `TC-57` / `AC-71` |
| **`role` 缺失 / 非法** | **结构失败** | `RUNTIME`（可重试） | `TC-45` |

### C.4 跨步骤通用禁入项（响应体 / 产物双重断言）

| 类别 | 禁入项 | 依据 |
|---|---|---|
| 数值化相关性 | `similarity` / `score` / `match_score` / `rank_score` / `percent` / `star` / `weight` | `TC-41` / `AC-23` |
| 等级化 / 置信 | `confidence` / 任何"高·低置信""完成度""证据强度""经验等级"措辞 | `TC-64` / `AC-88` / `AC-54` |
| 技术层 | `model` / `model version` / `prompt version` / `prompt text` / `token` / `cost` / `temperature` / 采样参数 / `trace id` / `session id` / 调用耗时 / `retry count` / 内部检索分数 | `TC-71` / `AC-78` |
| 生命周期 | 任何"版本号 / 版本列表 / 版本对比 / 回滚"字段；任何"已检索过 / 检索新鲜度"字段 | `D-040` / `D-045` TR-11 |
| 第五种引用角色 | `EvidenceRef.role` **只有** `grounding` / `support` / `contradict` / `context`；**不得**新增第五值；`reasoning_input_refs` **不得**被实现为第五个 `role` | 契约 §5.2 第 12 条 / `S03-B` §E.5 |
| 第二套引用体系 | 禁止新增引用对象 / 引用表 / 引用集合；⑩ 追溯与 `N_引用` **只由 `EvidenceRef` 单一集合派生** | 契约 §3.3 / §12 第 11 项 |

### C.5 步骤 ↔ 输出结构对照（速查）

| 步 | 产物对象 | `source_type` | `confirmation_class` | `decision_state` 初值 | 出口 |
|---|---|---|---|---|---|
| ② | `Extraction` 条目 + 缺口报告 + 追问问题 | `Extraction`（问题条目为 `Inference｜display`） | `display`（仅问题条目） | — | 无 |
| ④ | 候选失败原因条目 | `Inference` | `decision` | `unresolved` | 无 |
| ⑥ | 派生结果（候选集合 + 命中 / 未比对维度） | `Inference` | `display` | — | 无 |
| ⑦ | 比较点 / 理由 / 未比对维度 | `Inference` | `display` | — | `EXIT-C`（无可解释维度） |
| ⑧ | `Insight`（`candidate`） | `Inference` | `decision` | `unresolved` → 用户裁决 | `EXIT-A` / `EXIT-C` |
| ⑨ | `Hypothesis`（`grounded` / `model`） | `Inference` | `decision` | `undecided` → 用户裁决 | `EXIT-A` / `EXIT-B` / `EXIT-C` |

---

## §D 缺口检测与追问状态机（②）

### D.1 缺口分级（P1 / P2 / P3，规则本身不变）

| 级 | 缺口范围 | 是否追问 | 缺失后果 |
|---|---|---|---|
| **P1** | `goal` / `actual_attempt` / `actual_result`（**不含 `result_status`**） | **优先追问** | **P1 未建立 ⇒ 保持 `Draft`**（即使预算用尽） |
| **P2** | `condition` / `judgment_basis` | **应尽量补齐**，用户可「不知道 / 跳过」 | **不阻断 `Formal` 保存**（记「未知 / 未提供」） |
| **P3** | `key_parameter` / 用户主动提到但表达不清的关键变化 | **仅当真正影响当前 Attempt 理解时** | 不影响保存 |

> 🔴 **`result_status` 不属于 P1 事实追问**：它由"AI 提出候选（决策型 `Inference`）+ 用户显式接受 / 修改"确定；**不得**把结果状态算成"通过追问补齐 P1"（`D-018` / `TC-36` / `AC-Q06-6`）。

### D.2 状态机

> **不新增持久化字段**：状态全部由既有结构派生 —— `Attempt Draft State.asked_key_question_count` / `abandoned_gap_set` / `gap_priority_hint` + `followup_question` 与配对 `followup_user_answer` 内容条目（`S03-B` §C.4.3 / §C.5）。

```
                 ┌────────────────────────────┐
①  非空输入 → Draft │  S0  no_key_gap（无键缺口） │ → 进入 ③ 结构化确认
                 └────────────────────────────┘
        │ ② 解析 + 缺口检测
        ▼
   gaps = {P1} ∪ {P2}（P3 仅必要时）
        │
        ├─ gaps 去 abandoned_gap_set 后为空 ──────────────► S0
        │
        └─ 非空
              │
              ├─ asked_count ≥ 3 ────────────────────────► S3 stopped_by_budget → 进入 ③
              │
              └─ asked_count < 3
                    │ 取优先级最高缺口（P1 > P2 > P3），且该缺口 ∉ abandoned_gap_set
                    ▼
                 S2 awaiting_answer：提出 1 个问题（1 问题 ↔ 1 缺口）〔asked_count += 1〕
                    │
                    ├─ 用户回答 ──► 双层落库（原话 = Fact；AI 归纳 = Extraction）→ 该缺口移除 → 重新评估 → S0 / S2
                    ├─ 用户「跳过 / 不知道 / 就这样继续」──► 该缺口加入 abandoned_gap_set → 不得再问同一缺口 → 重新评估
                    └─ 用户主动补充（非回答本问题）──► 不计入 asked_count → 重新解析补充内容 → 重新评估

进入 ③ 之后：
   若 P1 = goal ∧ actual_attempt ∧ actual_result 未建立 ──► S5 p1_unmet_keep_draft（保持 Draft，不得伪装 Formal）
   若 P1 已建立 + 用户显式确认 + 结果状态已由用户接受 / 修改 ──► Formal（保存成功 = ⑥ 唯一自动触发）
```

### D.3 状态与判定条件（可枚举，可测试）

| 状态 | 判定条件（全部可由既有字段派生） |
|---|---|
| `S0 no_key_gap` | 去 `abandoned_gap_set` 后的 P1 / P2 关键缺口集合为空 |
| `S2 awaiting_answer` | 存在 `followup_question` 条目而无配对 `followup_user_answer` 条目 |
| `S3 stopped_by_budget` | `asked_key_question_count ≥ 3` |
| `S4 stopped_by_user` | 用户已选择「跳过 / 不知道 / 就这样继续」（**停止条件 `C`**） |
| `S5 p1_unmet_keep_draft` | `goal` / `actual_attempt` / `actual_result` 任一未建立（`presence_state ≠ present`） |

> `S1 gap_detected` 不单列为持久状态：它是"gaps 非空且尚未提出下一个问题"的瞬时判定，由 `gap_priority_hint` + `asked_key_question_count` + `abandoned_gap_set` 即时派生。

### D.4 追问预算的硬闸门（服务端，非 Prompt）

| # | 闸门 | 依据 |
|---|---|---|
| G-1 | **`asked_key_question_count` 为持久化计数器**；计数单位 = **AI 实际提出的关键追问问题数（TOTAL）**，**不是对话轮次**；**不得**用对话回合数替代 | `TC-29` / `AC-Q06-1` |
| G-2 | `asked_key_question_count` **达到 3** ⇒ **服务端拒绝生成第 4 个关键追问问题**（无论 Prompt 如何要求） | `D-017` / `AC-Q06-2` |
| G-3 | **1 问题 ↔ 1 主要高价值缺口**：`followup_question.target_gap_id` **必须**对应**恰好 1 个 `field_key`**（服务端校验 == 1）⇒ 结构性阻断"打包多字段规避预算" | `TC-30` / `AC-Q06-3` |
| G-4 | **用户主动补充不计入预算**：只有产生 `followup_question` 条目才计入 ⇒ 主动补充天然不计数 | `TC-31` / `AC-Q06-4` |
| G-5 | **已放弃缺口不得再问**：`followup_question.target_gap_id ∈ abandoned_gap_set` ⇒ **拒绝** | `TC-33` / `AC-17` |
| G-6 | **P1 未建立 ⇒ 保持 `Draft`**：即使 `asked_key_question_count = 3` 且停止条件 `B` 已触发 | `TC-35` / `AC-Q06-5` |
| G-7 | **计数时点 = 问题成功送达用户**（响应成功返回后登记，写入幂等）；**重复呈现同一问题不重复计数** | 本文件 PROPOSED（保证"用户成本"口径与幂等一致） |
| G-8 | **计数器在 `Draft` 生命周期内累计、不清零**；**重新解析 / 重试不得重置**（否则"总量 ≤ 3"可被规避）；`Formal` 化后不再承载门槛作用 | 本文件 PROPOSED（由 `D-017` 目的推出：预算单位存在的意义即"不可被绕过"） |
| G-9 | **不得为规避预算或重置计数引入任何新用户动作**（如"清空本次解析""重新开始"）；canonical 未定义此类动作 | `TC-67` 精神 / `D-047` |

### D.5 M2 阶段禁止历史对照类追问 —— **结构性硬禁**

> `TC-34` 要求"**须在规则 / 校验层硬禁，不得只写在 Prompt 里**"。本文件给出的实现是**输入隔离 + 结构校验**双重手段：

| 层 | 手段 |
|---|---|
| **输入隔离（主手段）** | ② 的输入**不含任何历史 `Attempt` 数据**（`AI-3`）⇒ **结构上不可能产生历史对照内容**（第 ⑥ 步尚未发生，任何"与上次的差异"类问题都无据可依） |
| **结构校验（兜底）** | `followup_question.target_gap_id` **必须** ∈ `gap_report`（缺口清单），而缺口清单的 `field_key` 只取自本 `Draft` 的字段框架 ⇒ **不存在"历史对照"这一缺口类型**，越界即校验失败（`RUNTIME`） |
| **不做的事** | ❌ **不引入**针对追问文案的**语义分类器 / 敏感词判定**（会产生不可验收的隐性判据，`D-037`） |

### D.6 停止条件（满足任一即停止追问并进入 ③）

| 条件 | 内容 | 依据 |
|---|---|---|
| `A` | 当前不存在仍值得继续追问的 `P1` / `P2` 关键缺口 | `D-023` |
| `B` | **已达到 3 个关键追问问题总量** | `D-023` / `D-017` |
| `C` | **用户选择「跳过 / 不知道 / 就这样继续」** | `D-023` |

**停止后**：进入 ③ 结构化确认；**`P2` / `P3` 未解决 ⇒ 记「未知 / 未提供」，不阻断 `Formal`**；**`P1` 未建立 ⇒ 保持 `Draft`**；**始终不阻断用户继续操作**（`TC-62` / `TC-67`）。

### D.7 ② 的追问产物落库（双层，禁止反向标注）

| 内容 | `source_type` | 备注 |
|---|---|---|
| AI 提出的问题 | `Inference｜display` | 系统生成的第 ② 步产物 |
| **用户原始回答** | **`Fact`** | **不得**标为 `Inference` |
| **AI 对回答的结构化归纳** | **`Extraction`**（用户可修改） | **不得**标为 `Fact` |

依据：`D-024` / `TC-15` / `AC-30`。

---

## §E Candidate Cause 规则（④）

### E.1 允许与禁止

| 允许 | 禁止 |
|---|---|
| 输出 **0 条**（依据不足） | **为凑数量生成原因**（为凑满 1 条生成低质量 / 低置信原因） |
| 输出 **n 条**（**无产品层数量上限**） | 引入任何**数量目标 / 最少条数 / 排序强度 / 等级 / 分数** |
| 用户**部分处理 / 全部未处理**即保存 | 把"未处理"渲染为"已确认" |
| `unresolved` **持久化且状态可见** | **"默认已接受"**（因保存 / 离开页面 / 时间经过而变 `accepted`） |
| 用户逐条接受 / 拒绝 | 由 AI 决定 `decision_state` |

依据：`D-048` / `TC-13` / `AC-91`–`AC-96`。

### E.2 `unresolved` 的复用门禁（AI 侧必须遵守）

`decision_state = unresolved` 的候选原因：

- ❌ **不得**进入第 ⑧ 步的"已确认经验"；
- ❌ **不得**作为 grounding；
- ❌ **不计入 `N_引用`**；
- ❌ **不得**作为后续决策依据 / 比较输入 / 版本来源 / 门槛。

✅ 只有 **`accepted` 的决策型 `Inference`** 才可作为已确认判断复用（**`accepted` 后来源仍为 `Inference`**）。

依据：`AC-10`（校准口径）/ `TC-13` / `AC-95` / `AC-96`。

### E.3 ④ 与 ⑤ / ⑧ 的关系

| 关系 | 内容 | 依据 |
|---|---|---|
| ④ → ⑤ | 候选原因**不是** `Formal` 保存门槛；0 条 / 未处理 / 生成失败**均不阻断保存** | `D-048` / `TC-04` / `AC-03` |
| ④ → ⑧ | 已 `accepted` 的候选原因可作**已确认依据**；`unresolved` 者**不可** | `TC-13` / `D-048` C-2 |
| ④ → 结果状态 | **结果状态不由 ④ 产出**，也**不因 ④ 而改变**（两者是独立通路） | `TC-05` / `TC-36` |

---

## §F Candidate Insight Pipeline（⑧）

### F.1 生成时机（唯一）

```
⑤ 保存成功（唯一自动触发）
   → ⑥ 检索 + ⑦ 比较解释（同一调用链内定稿，见 §J）
        → ⑧ 生成 Candidate Insight（0..n） + E2/E3 检查 + 三段式
             → 用户：接受（E5）/ 修改 / 拒绝 / 撤销接受
```

| 硬规则 | 依据 |
|---|---|
| **⑧ 是 `Insight` 的唯一生成时机** | `D-022` / `TC-26` |
| **不得**后台自动生成 / 保存后自动生成 / 异步批量 / 定期挖掘 / `candidate` 待办池 | `D-022` / `AC-28` |
| **不得**为同一 `Attempt` 提供"反复点击生成"的入口（否则事实上形成候选池） | `D-022` 精神 |
| 同一 `Attempt` **是否允许多条 `Insight`**：**允许 0..n 条**（数据层不设唯一约束），**但生成路径只有一条**（主链 ⑧ 的一次生成） | 回应 `S03-B` §L-1 |
| **修改 `Formal` 后 + 用户显式「重新检索」⇒ 不自动重生成 ⑧**；⑧ 位置呈现既有 `Insight`（**不得**自动退回 / 自动改写既有 `Insight` 状态） | `D-045` TR-7 / `TQ11` #7 |

> ⚠️ **`S03-B` §L-1 的答复**：**不设唯一约束、不设覆盖语义**（覆盖语义会引入"版本"痕迹风险）。生成路径唯一 ⇒ 实际上不会出现"同一 `Attempt` 的多个候选池"；但**允许 0..n** 以备将来同一 ⑧ 生成批次内出现多个独立命题。

### F.2 `Insight` 的生成内容（三条最低要求）

| # | 要求 | 校验方 |
|---|---|---|
| F-1 | **能形成明确、可理解的经验命题**（`E2`）—— 不得是"感觉有问题 / 可能不太好 / 好像失败了" | **AI `Inference`** + 理由同屏 |
| F-2 | **适用范围明确**（`E3`）—— 至少说明"在当前已知哪些条件下观察到了该经验" | **AI `Inference`** + 理由同屏 |
| F-3 | **引用可追溯**（`E4`）+ **来源有效**（`E1`） | **服务端结构性检查** |

### F.3 `E2` / `E3` 不满足 ⇒ 三段式（**不进入任何出口**）

| 段 | 内容 | 来源类型 |
|---|---|---|
| **缺什么** | 显式指出未满足的是 `E2`（结论含混）/ `E3`（适用范围不明确）/ 二者 | AI（`Inference`） |
| **为什么重要** | `E2` → 无法说明"这条经验说的是什么"；`E3` → 无法判断何时可用，存在**误用风险** | AI（`Inference`） |
| **如何补充** | `E2` → 收敛为明确命题 / 补充更多尝试；`E3` → 补充条件字段（补全后**重新检查 `E3`**） | **AI 建议 / 展示型 `Inference`** |

**硬规则**

- `Insight` **保持 `candidate`**（不晋升、不隐藏、**不静默丢弃**）；
- 「如何补充」**不改变持久化业务状态**、**不得绕过 `E5`**、**不得伪装为用户结论**；
- **`E2` / `E3` 不满足不进入任何 0 条出口**（与 0 条出口是两个不同分支）；
- **不提供"推翻 `E2` / `E3` 判定"的按钮**；用户唯一解法 = 修改内容 → 重新检查。

依据：`D-038` / `D-039` / `TC-65` / `AC-97` / `AC-99`。

### F.4 `Insight` 状态迁移与 AI 的关系（AI 只读，不写）

| 迁移 | 触发方 | AI 的角色 |
|---|---|---|
| `candidate → accepted` | 用户接受（`E5`，仅当 `E1`–`E4` 已满足） | **无**（AI 不得自动接受） |
| `candidate → rejected` | 用户拒绝（不要求 `E1`–`E4` 满足） | **无** |
| `accepted → candidate` | 用户撤销接受 | **无** |
| `accepted → candidate`（内容性修改） | 用户修改 + **domain 规则**（退回 + 重检 `E1`–`E4`） | AI **只提供修改后的重新检查输入**；**不得**自动接受 / 自动补字段 / 自动改写 |
| 任一 → 不变（非语义 / 元信息修改） | 用户修改 | **无** |
| 引用证据被归档 ⇒ 状态不变 | 用户归档 | **无**（`N_引用` 不追溯减少；⑩ 继续显示并标「来源已归档」） |

依据：`D-039` / `D-040` / `D-043` / `TC-73`–`TC-77` / `AC-61`–`AC-65`。

### F.5 修改后重检的执行归属

```
用户修改内容性字段（① 命题 ② 适用范围 / 条件集合 ③ 引用清单 ④ 判断依据 / 可验证判据）
      ↓ domain 规则：status → candidate（不分是否"实质性"，角色不确定一律从严）
      ↓ 重新运行检查
   E1 / E4 → 服务端结构性检查（即时）
   E2 / E3 → 重新调用 AI（Inference）→ 新判断 + 新理由同屏
      ↓
   全部满足 → 保持 candidate + 显式提示"内容已修改，需要重新接受"
   任一不满足 → D-038 三段式
```

> ⚠️ ③ 引用清单是**集合**：`owner = Insight` 的 `EvidenceRef` **增删一律视为内容性修改**（`S03-B` §D.2 实现要点）。
> **何时重新接受由用户决定**；**系统不得自动接受**（`D-040` / `AC-62`）。

---

## §G Grounding Pipeline（⑨ 前置）

### G.1 判定顺序（唯一，禁止跳步）

```
第 0 步｜N_检索（服务端注入，AI 不参与）
   ├─ = 0 ──► 不得产出 History-grounded Hypothesis
   │            → EXIT-A evidence-insufficient（并区分两种空态：历史库为空 / 有历史但本次无相关）
   │            → 可选 Model Suggestion（独立区域、整体标注）
   │            → 提供"仅保存本次尝试"；不阻断
   └─ ≥ 1 ──► 第 1 步

第 1 步｜Grounding 判据 G1–G4（至少一项命中，且引用可追溯）
   G1 问题对象 / 变量来自历史
   G2 条件来自历史
   G3 目标指标来自历史
   G4 排除项来自历史（已试过且未达预期；G4 属 grounding，计入 N_引用）

第 2 步｜反例 N1–N6（命中任一 ⇒ 该条不得为 grounded）
   N1 仅写"参考了历史"而无字段可指
   N2 引用无关记录
   N3 仅措辞相似
   N4 关键变量完全来自模型先验
   N5 引用 Draft
   N6 相关字段全为「未知」

第 3 步｜可验证判据（⑥ 观察什么 / ⑦ 什么支持 / ⑧ 什么反驳）
   ├─ 无可区分、可观察的判据 ──► EXIT-B not-verifiable（该条不计入 ⑨ 的"可验证假设"）
   └─ 有 ──► 组装 8 项 + 两分区 + 证据概况
```

依据：契约 §9 / §9.2；`D-028` / `D-029` / `D-030` / `D-032` / `D-033` / `TC-50`–`TC-53` / `TC-65`。

### G.2 Grounding 硬条件（二值，无中间等级）

| 硬规则 | 内容 | 依据 |
|---|---|---|
| **二值** | grounding **成立 / 不成立**；**不设"部分锚定"** | `TC-50` / `AC-36` |
| **引用可追溯** | 必须能按 ID 解析到 `target`，且落点可定位到具体内容条目 | `TC-50` / `D-021 E4` |
| **落点层级** | `role = grounding` ⇒ `source_field_path` **必须落在 `Fact` 内容条目**；**`Extraction` 永远不得承担 grounding** | 契约 §5.2 第 9 条（`v0.2.1`） |
| **引用对象** | 只允许 `Formal Attempt`（`active`、≠ 源 `Attempt`、∈ 输入候选集合）；**`accepted Insight` 即使已接受也不得承担 grounding** | `TC-51` / `AC-36` |
| **可机器校验的反例** | `N5`（引用 `Draft`）/ `N6`（相关字段全为 `presence_state = unknown`）**可由服务端判定**；`N2` / `N3` / `N4` 属语义判断，由 AI 输出 + 服务端"引用必须 ∈ 候选集合"约束兜底 | `TC-52` |
| **未知维度不得充当依据** | 被引用字段 `presence_state = unknown` ⇒ 该命中项**不成立** | `TC-40` / `TC-06` / `D-025` |

### G.3 引用体系（唯一，禁止第二套）

```
                    ┌───────────────────────────────────────────────┐
                    │   EvidenceRef 集合（owner = Insight / Hypothesis）│ ← 唯一证据来源
                    └───────────────────────────────────────────────┘
                        │                              │
         视图 ① 逐条引用视图（⑩ 追溯）      视图 ② 按 target 去重计数视图（= N_引用）
         · 每条标 role                      · 计入角色 = grounding / support / contradict
         · context 标「上下文」             · context 不计入
         · 标「来源已归档」← 由 target       · 只由 role 决定，与落点层级（Fact / Extraction）无关
           当前 archive_state 动态派生
```

| 硬规则 | 内容 |
|---|---|
| **单一集合** | ⑩ 追溯清单与 `N_引用` **必须由同一份 `EvidenceRef` 集合派生**（两种视图，同源）；**不得**缓存为两份数字 |
| **不建第二套** | `Extraction` 落点**不新增**引用对象 / 引用表 / 引用集合 / 第五个 `role` |
| **去重口径** | `N_引用` **按 `target_id` 去重**（同一条记录被多条引用指向只计 1；定义是**记录条数**，不是引用记录条数） |
| **`role = context`** | 可展示、**必须标「上下文」**、**不计入 `N_引用`** |
| **`Unknown` 结果状态** | 可承担 `grounding` / `context`；**不得单独承担** `support` / `contradict`（§G.5） |
| **「来源已归档」** | 一律读取 `target` 的**当前** `archive_state` 动态派生；**不得**依赖历史快照；归档**不使**既有引用失效、**不减**既有 `N_引用`、**不撤销**既有结论 |
| **`Model Suggestion`** | **不得**出现在任何 `EvidenceRef.target` 位置；`kind = model` ⇒ `EvidenceRef` 集合**必须为空** |

依据：契约 §3.3 / §5 / §6.3 / §7.4 / §12 第 10–11 项；`TC-44`–`TC-48` / `TC-54` / `AC-39` / `AC-40` / `AC-70` / `AC-74` / `AC-100`。
🔴 `CCR-S03B-01` / `CCR-S03B-02` 已并入契约 `v0.2.1`，**本文件按现契约口径（`Fact` 或 `Extraction` 落点 + 当前归档状态派生）执行，不得再改**。

### G.4 `reasoning_input_refs`（推理输入）—— 不是证据，不是第二套引用体系

| 允许的推理输入 | 标注要求 | 是否计入 `N_引用` | 是否进 ⑩ | 是否承担 grounding |
|---|---|---|---|---|
| 工作空间中**已 `accepted`** 的 `Insight` | 单独标注（仅作推理输入） | ❌ | ❌ | ❌ **永不允许** |
| **未接受的 `Candidate Insight`**（含本次 ⑧ 产物） | **须单独标注**「前序候选经验（未接受）」语义（措辞归 `08_UI_SPEC`） | ❌ | ❌ | ❌ |
| 已保存的 **`Model Suggestion`** | 只能作【模型先验】分区推理输入，单独标注 | ❌ | ❌ | ❌ |
| `Retrieval Derivation`（比较结果） | 属 `Insight.comparison_ref`（`E4` 条件项，非硬门槛） | ❌ | ❌ | ❌ |

**形状边界（PROPOSED）**：`reasoning_input_refs` = **内容条目上的 ID 清单 + 分区标签**，**不是**一类新的引用实体；**不得**被实现为 `EvidenceRef` 的第五个 `role`。

依据：契约 §5.2 第 3–4 条；`TC-55` / `AC-42`；`S03-B` §E.5 / §L-5（回应 `S03-B` §L-5）。

### G.5 `Unknown` 结果记录的角色降级（回应 `S03-B` §L-2 / `§E.4`）

**判据（可机器核验）**：对某 `Hypothesis` 的 `support`（或 `contradict`）角色集合，**其全部成员均为 `result_status = Unknown` 时不成立**；单来源（`N_引用 = 1`）且唯一来源为 `Unknown` ⇒ **不得标 `support` / `contradict`**。

**降级处置（PROPOSED，不静默）**

| 步骤 | 内容 |
|---|---|
| ① 角色降级 | 该记录的角色由 `support` / `contradict` **降为 `context`**（**保留在引用清单中**，**不得从证据清单删除**） |
| ② 显式标注 | 该条输出**必须**显式说明「该记录结果状态为 Unknown，不足以单独支持 / 反驳」，并按「上下文」标签展示 |
| ③ 计数后果 | `context` **不计入 `N_引用`** —— 属既有规则自然结果，**不是**"因降级而隐藏证据" |
| ④ 禁止 | ❌ 不得静默丢弃；❌ 不得把 `Unknown` 记录从 ⑩ 追溯中删除；❌ 不得因此改变 `N_检索` |

依据：`TC-48` / `AC-40`；契约 §6.2。

### G.6 两分区（唯一两种，禁止"混合"）

| 分区 | 名称 | 内容 | 硬规则 |
|---|---|---|---|
| ① | **【历史证据】** | `EvidenceRef` 集合（`role` 逐条标出） | `grounded` 输出**必须**至少有 1 条 `role = grounding` → `N_引用 ≥ 1` |
| ② | **【模型先验】** | 模型通用知识 / 推理补全 | **必须整体显著标注**「非你的历史经验依据」；**不得承载命题成立的唯一依据** |

**硬规则**

- **不得**使用"混合"作为**第三来源标签**（至多描述"两分区同时存在"）；
- 两分区**不得**合写为一段无法区分来源的文本；
- `Model Suggestion` 的**整体标注与是否保存 / 是否被接受无关，恒存且是整体标注**（不是小标签）；
- 措辞使用**存在性表述**（"有你的历史记录作为依据"），**禁止排他性 / 全称表述**（"完全基于你的历史记录"）。

依据：`TC-53` / `AC-37` / `D-030` / `D-036` / `D-042` / `AC-69`。

### G.7 数量与出口

| 项 | 规则 | 依据 |
|---|---|---|
| `grounded` 数量 | **1–2 条**；由**独立可验证方向数**决定，**不由 `N_检索` 决定**；**禁止**凑数 / 近义改写 / 默认 2 条 / ≥ 3 条 | `D-028` / `AC-34` |
| 每条独立性 | 可独立验证 + 有独立 grounding（**各自 `N_引用 ≥ 1`**）+ 可独立接受 / 拒绝 | `AC-34` |
| `N_检索 = 1` | 允许单来源，**必须**表达「单来源（`N_引用 = 1`），证据有限」+ **限定当前具体条件** + **禁止一般化**（禁止"方法 X 无效"） | `D-029` / `AC-41` |
| `N_检索 ≥ 2` | 允许跨记录比较与冲突识别；**不得**因数量增加自动提高可信度 / 自动升级为 `Fact` | `D-029` / `D-035` |
| 冲突证据 | **不得择一**（不选多数 / 最近 / 条件更全者）→ **并列 + 定位差异条件** + 可转化为条件区分型方向；无法定位 ⇒ **允许为空但必须显式说明** | `D-029` / `AC-43` |
| 条件缺失 | 允许生成但**强制收窄表述** + 标注"该维度未比对" + **不得编造条件**；**证据条数与条件完整度不得相互替代** | `D-029` / `AC-42` |
| `Model Suggestion` | **可选、数量另计、不计入 ⑨⑩ 验收**、**不得占据历史依据型输出的位置** | `AC-46` |

### G.8 出口路由（⑨，三类必须分路由）

| 出口 | 触发条件 | 处置 |
|---|---|---|
| `EXIT-A evidence-insufficient` | `N_检索 = 0`（或虽有相关记录但不满足 grounding 判据） | 不产出 `grounded`；**显式说明并区分两种空态**；可选 `Model Suggestion`；提供"仅保存本次尝试"；**不阻断** |
| `EXIT-B not-verifiable` | **存在 grounding**，但**当前无可区分、可观察的验证判据** | 显式说明"当前无法形成可验证的观察方式"；**不得编造**；该条**不计入 ⑨ 的"可验证假设"** |
| `EXIT-C not-formable` | 连**明确的候选命题**都无法形成 | 显式说明"当前不足以形成明确的可复用命题"；**允许为空并通过** |

**硬规则**

- **禁止**把三者统一写成"历史证据不足"（`TC-65` / `AC-98`）；
- 三者均**不得呈现为系统错误**（`D-029` / `D-034`）；
- **⑧ 常用出口 = `EXIT-A` / `EXIT-C`**；**`EXIT-B` 主要属 ⑨**（不得为 ⑧ 强行制造 `EXIT-B`）；
- **`E2` / `E3` 不满足不进入任何出口**（走 §F.3）。

### G.9 可验证性判定（唯一逻辑）

- **判定依据 = 是否存在可观察、可区分的支持 / 反驳判据**（**与是否有数字无关**）；
- 优先顺序：① 引用用户已有阈值（`Fact` 引用）→ ② 使用**可区分的定性判据** → ③ AI 可提**候选**阈值 / 判据（**必须标 `Inference`**）→ ④ **用户显式接受后才作为下一轮判断依据**（**接受后仍为 `Inference`**）；
- **不合格判据**（"效果更好 / 性能提升 / 好像有改善"）**等同缺判据** ⇒ **必须显式标注缺失**（"本次未给出可区分的支持 / 反驳判据"）；
- **可达性护栏**：候选指标须落在用户已有数据 / 能力可及范围内；需用户不具备的测量条件时，必须给出替代观察方式或标注"需确认是否可测量"；
- **不做的事**：❌ **不引入**对判据文案的自动语义判定（会形成不可验收的隐性判据，`D-037`）；**只做结构校验**（"是否显式标注缺失"）。

依据：`D-032` / `D-033` / `AC-50` / `AC-51` / `AC-60`。

---

## §H Hypothesis 8 项 Pipeline（⑨）

### H.1 8 项结构 × 来源类型 × 缺失处理 × 校验

| # | 项（`D5`） | `field_key` 提案 | 来源类型 | 缺失处理 | 服务端校验 |
|---|---|---|---|---|---|
| ① | 待验证假设 | `hypothesis_statement` | **`Inference`**（命题） | **必填** | 非空；**不得**含"已证实 / 已验证"措辞 |
| ② | 假设依据 | `hypothesis_basis` | **`Inference`**（其中引用的事实 = `Fact` 引用） | **必填** | 依据中提及的每条历史事实**必须**在 ③ 可找到 |
| ③ | 引用的历史 `Attempt` | `hypothesis_history_refs` | **`Fact` 引用**（= `EvidenceRef` 集合） | **必填**（`grounded` 时 ≥ 1） | **不得**出现 `Draft`；**不得**指向已归档（新引用）；`role` 逐条必填 |
| ④ | 下一轮建议改变什么 | `hypothesis_change` | **`Inference`** | **必填** | 不得为空泛表述（"再多试试"类）；**不得**引入 `D5` 未确认的"成本 / 作废条件" |
| ⑤ | 哪些条件保持不变 | `hypothesis_keep` | **三分**（见 §H.2） | 允许显式缺失 | 值为「未知 / 未提供」的条件**不得**写成"保持不变"（须单列并标"该维度未比对"） |
| ⑥ | 观察什么指标 | `hypothesis_metric` | 用户提供 = `Fact`；AI 提出 = `Inference`（**须接受**） | 允许显式缺失 | 缺失**必须显式标注**；**不得**留空、**不得**编造 |
| ⑦ | 什么结果支持假设 | `hypothesis_support_criterion` | 同上 | 允许显式缺失 | 同上；与 ⑧ 必须**互斥且可观察** |
| ⑧ | 什么结果反驳假设 | `hypothesis_contradict_criterion` | 同上 | 允许显式缺失 | 同上 |

**系统附加语义三项**（`D-027`）：**证据概况**（`N_引用` 实际数量 / 单来源提示 / 是否存在冲突 / 条件缺失说明）、**可验证性**、**证据限制提示**。

- 三项**不得**设计成三个独立 UI 组件；
- **证据概况为派生值**（不落重复数字）；
- **正式废止"证据强度"作为等级型术语**。

### H.2 第 ⑤ 项的三分（`TC-16` / `AC-32`，最易出错项）

| 来源 | 归属 | 硬规则 |
|---|---|---|
| 历史条件值 | `Fact` / `Extraction` **引用** | 允许落点层级为 `Fact` 或 `Extraction`（`v0.2.1` 口径） |
| **AI 建议"下一轮保持某条件"** | **`Inference`** | **`Fact` 层不得出现 AI 推荐值** |
| **用户本人明确指定"保持某条件"** | **用户 `Fact`** | 用户动作产生 |

**附加规则**：无历史时 ⑤ 须写"无历史条件可固定"，**不得编造条件**。

### H.3 一致性校验（`D-027` 明列，全在服务端可判定）

| # | 校验 | 依据 |
|---|---|---|
| H-3-1 | 依据（②）中提及的**每条历史事实**必须在 ③ 引用清单中可找到 | `D-027` |
| H-3-2 | 引用清单（③）**不得**出现 `Attempt Draft` | `D-027` / `TC-52` N5 |
| H-3-3 | 值为「未知 / 未提供」的条件**不得**写成"保持不变"（须单列并标"该维度未比对"）；历史值为未知时只能表述"设定为 Y" | `D-027` / `TC-40` |
| H-3-4 | ⑥⑦⑧ 缺失时**显式标注**；**不得**留空、**不得**编造 | `D-027` / `D-032` |
| H-3-5 | ⑦ 与 ⑧ **必须互斥且可观察**（"效果更好"类不合格） | `D-032` |
| H-3-6 | **不出现数字相似度**；"历史中已尝试且未达预期"的清单只能作为 ③ 的内部引用细节，**不得成为第 9 个信息项** | `D-027` / `D-020` |
| H-3-7 | **系统附加三点不得各自成为独立 UI 组件** | `D-027` |

### H.4 `Model Suggestion` 复用同一 8 项骨架

| 项 | 差异 |
|---|---|
| ②③ | **整体替换**为「非你的历史经验依据」标识（**整体显著标注，不是小标签**） |
| ⑤ | 无历史时须写"无历史条件可固定"，**不得编造条件** |
| `EvidenceRef` | **必须为空**；**不得**承担 grounding、**不得**被 ⑩ 追溯、**不得**计入 `N_*`、**不得**升级为 `grounded` |
| 两个动作 | **A. 保存 / 持久化** = 内容被保留（**≠ 接受 · ≠ 采纳 · ≠ 确认**）；**B. 接受 / 拒绝** = 对该决策型 `Inference` 的裁决（**机制必须保留**） |
| 已保存未裁决 | **只能**表达为"内容被保留，决策状态仍未完成"，**不得作为已接受方向复用** |

依据：契约 §8.4；`D-042` / `AC-67`–`AC-70`。

### H.5 ⑨ 的裁决位与状态（AI 永不写入）

| 项 | 允许值 | AI 可否改变 |
|---|---|---|
| `decision_state` | `undecided` / `accepted` / `rejected`（**`candidate` 一词不得用于任何 `Hypothesis`**） | ❌ 仅用户 |
| `saved_by_user` | 仅 `kind = model` 有意义；**与裁决位两个独立字段** | ❌ 仅用户 |
| 与经验层关系 | **无任何直接对象引用**；不进经验区；唯一合法路径 = **实际执行 → 新 `Formal Attempt` → ⑥⑦⑧ → `E1`–`E5`** | ❌ |

依据：`TC-07`–`TC-09` / `TC-08` / `AC-33` / `AC-66`–`AC-68` / `H-1` / `H-2` / `H-5`。

---

## §I Runtime / Fallback 矩阵

### I.1 分类总原则

> **三层语义必须分开实现，不得合并**（`TC-28` / `TC-61`）：
> `GATE`（对象门槛未满足）/ `RUNTIME`（技术失败）/ `ACCEPTANCE`（验收）。
> **`RUNTIME` 可恢复 / 可降级 / 可重试 ≠ 验收可以跳过步骤**（`TC-62` / `TC-68` / `AC-90`）。
> **正式表述**：「**V1 不设计不可恢复的业务终止；未来若新增会阻止用户继续完成主链的业务条件，必须重新经过产品决策**」（`TC-67`）。

### I.2 情形 × 处置矩阵

| # | 情形 | 分类 | 已保存数据 | 用户可见表达 | 恢复路径 | 禁止 |
|---|---|---|---|---|---|---|
| 1 | **Provider 调用失败** | `RUNTIME` | **不回滚**：⑤ 已保存的 `Formal Attempt`、⑥⑦ 派生结果、既有 `Insight` / `Hypothesis` **全部保留** | 「生成遇到技术问题，可重试」+ 重试入口 | 允许重试（**无次数上限**） | 把技术失败写成 `GATE` / 出口 / "历史证据不足"；伪造成 0 条 |
| 2 | **Timeout** | `RUNTIME` | 同上 | 同上（**必须显式提示可重试**） | 同上；**重试不覆盖用户已修改内容** | 设冷却门槛 / "已达重试上限" |
| 3 | **schema 校验失败** | `RUNTIME` | 同上 | 「输出格式校验未通过，可重试」 | 重试 | 用部分输出冒充成功产物（**不得伪造解析结果**） |
| 4 | **缺字段**（结构层必填缺失） | `RUNTIME` | 同上 | 同 3 | 重试 | 由服务端"补一个默认值"充数（**不得自动补字段**，`AC-99` 精神） |
| 5 | **缺字段**（内容层 ⑤–⑧ 未给） | **不是失败**（合法） | — | ⑥⑦⑧ **显式标注缺失**（"本次未给出可区分的支持 / 反驳判据"） | — | 留空 / 编造；把缺失渲染为错误 |
| 6 | **非法引用**（不可解析 / 越出候选集合 / 落点非 `Fact` 的 `grounding` / 指向 `Draft` / 指向已归档） | **grounding 不成立**（见 §C.3） | 不回滚 | 该条不产出 + **显式记录未产出原因** | 可重试；若全部候选失效 ⇒ 0 条出口 | 静默剔除非法引用后当作成功产物；改名保留为 `Model Suggestion` |
| 7 | **grounding 不成立**（命中 `N1`–`N6`） | **对象资格问题**（非技术失败） | 不回滚 | **不得产出 `grounded`**；按出口路由 | — | 伪造历史 / 暗示有历史依据 / 用弱版填充 `grounded` 位置 |
| 8 | **输出无法形成**（连命题都无法形成） | **`EXIT-C not-formable`** | 不回滚 | 显式说明"当前不足以形成明确的可复用命题"；**允许为空并通过** | — | 呈现为系统错误；编造命题 |
| 9 | **重试** | — | **不覆盖用户已修改内容**；**不改动任何已裁决状态** | 重试后如实呈现 | — | 设产品层次数上限 / 冷却门槛；覆盖用户修改；改写既有结论 |
| 10 | **`N_检索 = 0`** | **合法冷启动降级**（非错误） | 不回滚 | 显式说明 + **两种空态可区分** | 第 ①②③④⑤ 步**完整可用** | 呈现为错误 / 生成失败 / 功能缺失 |
| 11 | **`E2` / `E3` 不满足** | **对象门槛（`GATE`）** | 不回滚 | `Insight` 保持 `candidate` + 三段式 | 修改内容 → 重新检查 | 静默丢弃 / 隐藏 / 自动晋升 / 进入 0 条出口 |
| 12 | **`P1` 未建立** | **对象门槛（`GATE`）** | `Draft` 保留 | 提示尚需目标 / 实际尝试 / 实际结果 | 用户补充后重试 | 自动升级 `Formal` / 伪装 `Formal` |
| 13 | **第 ① 步空输入** | **入口提示**（非错误） | — | 入口提示 | — | 报错（`TC-20`） |

### I.3 四条硬性要求（对矩阵的横切约束）

| # | 要求 | 说明 | 依据 |
|---|---|---|---|
| I-3-1 | **可恢复** | 每个 `RUNTIME` 情形都必须给出可执行的恢复路径（重试 / 仅保存原文 / 跳过该步继续主链） | `TC-62` |
| I-3-2 | **不伪造成功产物** | 失败 ⇒ **无产物**（或"仅保存原文 + 未解析状态"）；**不得**用 0 条 / `EXIT-*` / `Model Suggestion` 掩盖技术失败 | `TC-63` / `D-047` |
| I-3-3 | **AI 失败不回滚已经保存的数据** | AI 调用与写路径**解耦**；一次 AI 失败**不得**回滚 ⑤ 的 `Formal Attempt`、⑥⑦ 的派生结果、既有 `Insight` / `Hypothesis` | `TC-62` / `S03-A` §1 |
| I-3-4 | **重试不得覆盖用户已修改内容** | 含：用户校正的 `Extraction`、用户提供的 `Fact`、用户已做出的裁决动作（接受 / 拒绝 / 撤销 / 保存位）、用户已编辑的既有 `Insight` | `TC-63` / `D-040` |

### I.4 重试的具体实现边界（`TQ31` 邻接，Worker 实现参数）

| 项 | 边界 |
|---|---|
| 产品层 | **不设**重试次数上限、**不设**冷却期、**不出现**"已达重试上限"类文案（`TC-62`） |
| 技术层 | 超时值 / 退避策略 / 单次请求内的幂等键属**实现参数**（`TQ31`），可存在于技术层，**不进界面 / 不参与产品判定**（`TC-71`） |
| 幂等 | 同一次保存流程重复提交只产生**一次** ⑥ 检索（请求级幂等键）（`TC-23` / `AC-79`） |
| 重试输入 | 必须以**当前持久化最新值**为输入（`AI-3` / I-3-4）；**不得**用发起时的旧快照 |

---

## §J HTTP 传输粒度结论（回应 `S03-A` §9.3）

### J.1 问题

`Formal Attempt` 保存成功后，**⑥ 检索 / ⑦ 比较 / ⑧ `Insight`** 是否可以在技术层拆为**多个 HTTP 往返**？必须同时满足 7 项约束：

不新增用户动作 / 不引入排队 / 不引入后台 Worker / 不引入定时任务 / 不引入异步批处理 / 用户仍看到连续自动流程 / ⑤→⑥ 自动触发语义不变。

### J.2 依据梳理（canonical 与上游分别约束了什么）

| 依据 | 约束内容 | 是否规定"步骤 ↔ HTTP 往返"映射 |
|---|---|---|
| `TC-21`（canonical） | ⑤ 保存成功 = **⑥ 的唯一自动触发条件**；**同步、幂等**；**不得后台 / 异步 / 批量 / 定时** | ❌ **未规定映射**；只要求 ⑥ 在**触发事件的调用链内同步完成** |
| `TC-22`（canonical） | ⑤ 与 ⑥ 之间**不得插入任何 `D9` 未列出的用户动作** | ❌ 未规定映射 |
| `TC-23`（canonical） | 重复保存幂等（同一次保存流程只产生一次检索） | ❌ |
| `D9`（canonical） | 十步为**唯一验收口径**；未定义步骤与 HTTP 往返的对应关系 | ❌ |
| `S03-B` §C.10 R-5（PROPOSED 上游） | **派生结果的生成必须在触发事件的同一次调用链内同步完成** | 间接：把 **⑦ 的产物（比较点 / 理由）** 纳入派生结果 ⇒ ⑦ 与 ⑥ **同链** |
| `S03-A` §9.3（PROPOSED 上游） | 判定"**不构成冲突**"；登记待 `S03-C` 确认 | ✅ **正是本节的待确认项** |

### J.3 🔴 结论（PROPOSED 技术结论）

```
⑤ 保存（用户唯一动作）
   │
   ├─ 往返 R1 ────────────────────────────────────────────────────
   │   ⑤ 持久化 Formal Attempt（成功）
   │   ＋ ⑥ 检索（唯一自动触发；同步、幂等）
   │   ＋ ⑦ 比较解释 + 派生结果定稿（含比较点 / 理由 / 未比对维度 / N_检索）
   │   · 必须与 ⑤ 同一次调用链完成（TC-21 + S03-B R-5）
   │   · 客户端等待该响应；其间不插入任何用户动作（TC-22）
   │
   ├─ 往返 R2 ────────────────────────────────────────────────────
   │   ⑧ 生成 Candidate Insight（0..n）+ E2/E3 检查 + 三段式
   │   · 客户端在同一用户动作后自动顺序发起；不排队、不后台、无定时
   │
   └─ 往返 R3 ────────────────────────────────────────────────────
       ⑨ 生成 Hypothesis（两类）+ grounding 判定 + 装配 ⑩ 追溯数据
       · 同上：由客户端顺序驱动，用户仍看到连续自动流程
```

**七项约束逐条核对**

| 约束 | 是否满足 | 说明 |
|---|---|---|
| 不新增用户动作 | ✅ | ⑦→⑧→⑨ 由客户端在**同一次保存动作之后**自动顺序发起；用户只做了一次"保存" |
| 不引入排队 | ✅ | 无队列、无 job 表、无 pending 状态；请求**串行同步等待** |
| 不引入后台 Worker | ✅ | 无任何独立执行单元；`BLK-01` 口径下的 "Cloud Worker" 是**开发期**概念，不属运行时 |
| 不引入定时任务 | ✅ | 无 cron / 无调度器 |
| 不引入异步批处理 | ✅ | 无批处理；每次往返处理单一 `Attempt` 的单一步骤 |
| 用户仍看到连续自动流程 | ✅ | 呈现层为"一次保存后的连续推进"（进度即 ⑥→⑦→⑧→⑨ 的实际状态）；**不得**出现"需要点击继续"的门 |
| ⑤→⑥ 自动触发语义不变 | ✅ | **⑥ 仍在保存成功的那一次调用链内完成**（`TC-21` 原义保持）；触发条件、幂等语义、不触发集合（`TC-25`）**一字未变** |

### J.4 对 `S03-A` §9.3 待确认问题的答复

> **问题**：⑧ 的 `Insight` 与"用户接受动作"**同屏**（`D-022`）是否意味着 ⑦→⑧ 之间存在**用户可感知的推进动作**？

**答复：不存在必须的用户动作；不构成 `PRODUCT SEMANTIC CONFLICT`。**

| 论据 | 内容 |
|---|---|
| ① | `D-022` 原文是"**在同一步**让用户接受 / 修改 / 拒绝"，即 **⑧ 步包含"生成"与"用户裁决"两部分**；**它不是"⑦ 与 ⑧ 之间的门"** |
| ② | **"同屏"是呈现约束**（生成结果与裁决控件在同一视图内呈现，**不额外增加操作步骤**），**不是交互前置条件** |
| ③ | `D9` 是唯一验收口径，**未在 ⑦→⑧ 之间定义任何用户动作**；若在此处要求用户动作，等价于把 ⑧ 的**存在**变成用户动作的后果（与 `D-045` 否决"用户手动点击查找相关历史"的同一逻辑） |
| ④ | ⑧ 的产物为 `candidate`，**用户在 ⑧ 内的裁决只决定 `E5`**；**不裁决也不阻断 ⑨ 的生成** ⇒ ⑨ **不需要** ⑧ 的 `E5` 作为前置（已接受 `Insight` 仅为**可选推理输入**，`TC-55`） |

### J.5 关于「拆分不是强制」

| 项 | 内容 |
|---|---|
| 性质 | 拆分是**允许**（不是**必须**）：其唯一合法目的是**规避运行时单次执行时长**（`S03-A` §3.1 `R1` / §9.1） |
| 若 Gate B 选择 C-D（长驻进程、无执行时长约束） | **允许**退回"单次往返完成 ⑤⑥⑦⑧⑨" —— 属**实现参数**，**不改变任何产品语义** |
| **唯一不可拆的边界** | **不得把 ⑥ 移出"保存成功"的调用链**（否则 `TC-21` 的"唯一自动触发"与"同步"语义被破坏） |
| 与 `TQ11`（重新检索）的关系 | 用户显式「重新检索」同理：**R1 形态**（⑥⑦ 同链、单行覆盖替换）；**不级联重建 ⑧ / ⑨**（`S03-B` §H.3 #7） |
| 与 `N_检索` 的关系 | `N_检索` 在 **R1** 内定稿并落于派生结果；`N_引用` 在 R2 / R3 读取时实时派生 ⇒ **两者不受拆分影响** |
| 幂等 | 一次保存动作对应**一条自动链条**（幂等键贯穿 R1 → R2 → R3）；**重复提交只产生一次 ⑥** |

---

## §K Hypothesis 编辑边界分析

### K.1 现有 canonical 的覆盖范围（先确定"能推出什么"）

| 项 | canonical 是否有规定 | 结论 |
|---|---|---|
| `Hypothesis` 的裁决位取值 | ✅ 有 | `undecided` / `accepted` / `rejected`；**`candidate` 一词不得使用**（`TC-07`） |
| `Model Suggestion` 的保存位 | ✅ 有 | 与裁决位**两个独立字段**；保存 ≠ 接受（`D-042` / `TC-09`） |
| 两类输出的确认要求 | ✅ 有 | 决策型 `Inference`，**必须由用户显式接受 / 拒绝**（`D-027` / `D-014`） |
| 用户可否**自行提供 / 修改** ⑥⑦⑧（观察什么指标 / 什么支持 / 什么反驳） | ✅ **部分有** | `D-033`：「**用户始终可以自己定义 / 修改 / 拒绝 / 跳过**」（候选指标 / 判据）；`D-027`：⑥⑦⑧ **用户提供为 `Fact`、AI 提出为 `Inference`（须接受）** |
| **用户可否直接编辑 ①②③④⑤**（命题 / 依据 / 引用 / 改变什么 / 保持不变） | ❌ **无规定** | — |
| **裁决后内容被修改时 `decision_state` 是否回退** | ❌ **无规定** | — |
| `source_type` 在用户编辑后是否改变 | ✅ 有（间接） | **恒不变**：任何用户动作都不得改变 `source_type`；AI 生成的内容条目被用户编辑后**仍为 `Inference`**（`TC-12` / 契约 §4.1） |
| `E5` / `E1`–`E4` 类"不可编辑"的保护 | ⚠️ 仅针对 `Insight` | `D-039` / `TC-77` 的"用户不能编辑判定结果"**只覆盖 `Insight` 的 `E1`–`E4`**，**未覆盖 `Hypothesis`** |
| 为 `Hypothesis` 新增状态机 | ❌ **明文禁止** | 契约 §12 第 3 项（`Hypothesis` 的 `kind` 与裁决位模型为 Worker 禁改项）；`S03-B` §D.3「**不设** `Hypothesis` 自身的状态回退链 —— canonical 未定义，**不得自行创造**」 |

### K.2 为什么这是一个 `DECISION REQUIRED`（而非 Worker 实现参数）

| 判据 | 结论 |
|---|---|
| 是否影响**用户可感知行为** | ✅ **是**。"允许编辑"⇒ 用户能改 AI 给的假设命题并据以执行；"只读"⇒ 用户只能接受 / 拒绝，不能修正表述 |
| 现有 canonical 能否**唯一推出** | ❌ **不能**。`D-040` 的状态回退机制**明文只覆盖 `Insight`**；`D-033` 只覆盖 ⑥⑦⑧ 的**候选指标 / 判据**，**不含 ①②③④⑤**；且回退语义会**扩展裁决位模型**（属契约 §12 第 3 项禁改范围）⇒ **只能在 Gate 层由人工决定** |
| 是否可以"就地按最保守口径实现" | ⚠️ 现契约禁止 Worker 自行创造回退规则；**本文不自行选择**（依 `S03-A` §14.3 / `S03-B` §M.3 同一处置逻辑） |

### K.3 🔴 `DECISION REQUIRED` 报告（只报告，不选择）

#### A. 需要决定什么

**`Hypothesis`（两类）的内容在 V1 中是否可被用户直接编辑；若可编辑，编辑后 `decision_state` 如何处理。**

具体拆为两个子问题（可合并为一个决策）：

- **子问题 1**：`Hypothesis` 的 8 项内容（尤其 ① 待验证假设 / ② 假设依据 / ④ 下一轮建议改变什么 / ⑥⑦⑧ 判据）是否提供用户直接编辑入口？
- **子问题 2**：若允许编辑，**内容被修改后 `decision_state` 是否回退为 `undecided`**（即"修改后需重新裁决"），还是**保持不变**（即"裁决针对该输出对象，不针对其当前文本"）？

> 补充事实（供决策参考，非方案）：**用户自行提供 / 修改 ⑥⑦⑧ 在 `D-033` 下已被允许**；**`source_type` 恒不变（编辑后仍为 `Inference`）** 由 `TC-12` 已确定。因此本决策的**真正未定部分**是 ①②③④⑤ 的可编辑性 **与** 子问题 2 的回退语义。

#### B. 方案 A：**允许编辑 + 修改后退回 `undecided`**

| 项 | 内容 |
|---|---|
| 行为 | 用户可编辑 `Hypothesis` 的内容性字段；一旦修改，`decision_state` 回退 `undecided`（若原为 `accepted` / `rejected`），需重新裁决 |
| 与既有规则的一致性 | 与 `D-040` 对 `Insight` 的处理**同构**（内容性修改 ⇒ 退回 + 重检）；**但属于把 `D-040` 的机制**扩展**到 `Hypothesis`**（需新建 `Decision ID`） |
| 代价 | 需要定义 `Hypothesis` 的内容性字段集合（哪些算内容性）；需要"重检"的对象（⑨ 无 `E1`–`E4`，回退后重检什么需另行定义）；**"执行前改了假设"是最常见动作**，会频繁触发回退，产生"改了就要重新点一次接受"的摩擦 |

#### C. 方案 B：**只读 + 内容变更走"重新生成 / 重新检索"**

| 项 | 内容 |
|---|---|
| 行为 | ①②③④⑤ 只读；用户对 `Hypothesis` 的合法动作**仅**接受 / 拒绝（+ `Model Suggestion` 保存）。用户若要不同表述，只能修改 `Formal Attempt` 内容后**显式发起「重新检索」**（`TQ11` 单行覆盖替换）并要求重新生成 |
| 与既有规则的一致性 | 与 `S03-B` §D.3「**不设** `Hypothesis` 自身的状态回退链」**完全一致**；**不新增任何状态机**；与 `D-041`（接受只表示"值得我下一步验证的方向"）一致 |
| 代价 | ① 与 `D-033`（用户"始终可以自己定义 / 修改"候选指标 / 判据）存在**张力**：若 ⑥⑦⑧ 只读，`D-033` 的"修改"落点需重新解释；② 用户遇到表述不佳的假设时，唯一路径是**改自己的记录再重跑**，体验成本高；③ ①–⑤ 只读会让"AI 写的字不能改"成为显性体验问题 |

#### D. 两方案影响

| 维度 | 方案 A（可编辑 + 回退） | 方案 B（只读 + 重跑） |
|---|---|---|
| **用户可感知行为** | 可修正表述；但每次修改后需**重新裁决** | 不可修正；表述不佳时只能改记录重跑 |
| **新增机制** | **需新增** `Hypothesis` 内容性字段集合 + 回退语义（≈ 把 `D-040` 扩展） | **无需新增**任何一种状态机 |
| **契约 §12 第 3 项** | 需 Integrator 修订"裁决位模型"条目 | **不动** |
| **`Decision ID`** | **必须新建独立 `Decision ID`** | 无需新建（若采用 B，实际是"保持现状"） |
| **`D-033` 张力** | 无（用户可编辑 ⑥⑦⑧ 属自然延伸） | **需澄清** ⑥⑦⑧ 的"修改"落点（是编辑 `Hypothesis`，还是改为新一次生成的输入） |
| **`D-041` 一致性** | 需注意"已接受假设被改后仍显示为 accepted"的措辞风险 | 无 |
| **验收点** | 需新增验收点（回退后可测） | 可用既有 `AC-33` / `AC-67`–`AC-70` 覆盖 |
| **成本** | 中（多一套内容性字段判定 + 回退 + 事件留痕口径） | **低**（0 新增机制） |
| **风险** | 内容性字段集合若界定不严，会出现"改了却没退回"或"改标点也要重裁" | 若 ⑥⑦⑧ 只读，用户可能绕过产品在外部记录，削弱 ⑨ 的可执行性 |

#### E. Worker 推荐与理由（**PROPOSED，不构成既定方案**）

**推荐：方案 B 的"窄口径"变体** ——

```
① ② ④ ⑤：只读（用户只能接受 / 拒绝 / 保存）
⑥ ⑦ ⑧：可"用户自行提供 / 替换"，但实现为「用户输入条目」而非"编辑 AI 条目"
         · 依据：D-033 已允许用户自己定义 / 修改 / 拒绝 / 跳过候选指标 / 判据
         · 用户输入的条目 source_type = Fact（用户提供）；AI 提出的 = Inference（须接受）
         · 因此不产生"AI 条目被编辑"的语义问题
为两类 Hypothesis 新增状态机：不新增
```

**理由**（三条）

1. **不新增机制**：与 `S03-B` §D.3、契约 §12 第 3 项**完全一致**；10 天窗口内**不需要**为一个未定义机制补验收点。
2. **与 `D-033` 不冲突**：⑥⑦⑧ 的"用户修改"通过**并列的用户输入条目**实现（`Fact` vs `Inference` 分列），这**恰好是 `D-027` 已明文要求的分列结构**；同时**不触碰 `source_type` 恒不变**规则。
3. **风险最低**：主链可行性不依赖编辑能力（`D9` 十步均可在只读前提下完成）；用户在表述不满意时的正式出口是**修改记录 + 重新检索**（既有机制，`D-045` TR-7），不引入新的状态回退链。

**同时必须说明**（不隐瞒）：

- 若人工裁决为**方案 A**，则**必须**同时确定：① `Hypothesis` 内容性字段集合；② 回退后重检对象（⑨ 无 `E1`–`E4`）；③ 是否留事件日志（`Hypothesis` 目前**不在** `Insight State Event` 的覆盖范围，扩展即新增产品层留痕，须一并决策）；④ **新建独立 `Decision ID`** 并同步契约 §12 第 3 项。
- 🔴 **本文件不把任一方案写成既定方案**；在人工裁决前，实现**按"不新增回退链"的现状执行**（即：不存在"编辑后自动回退"的行为）。

### K.4 附：本文发现的**第二处**潜在待裁决项（登记，不构成 `DECISION REQUIRED`，但需 Integrator 复核）

| 项 | 内容 |
|---|---|
| 问题 | **⑨ 的自动生成是否必须等待 ⑧ 的 `E5`（用户接受）** |
| 本文口径 | **不等待**（`§B.6.1`，依据 `D9` 未定义该用户动作 + `D-022`"不额外增加操作步骤" + `TC-55` 允许 `candidate` 作推理输入） |
| 为何不列为 `DECISION REQUIRED` | canonical 对该问题的**唯一合理读法**是"解耦"（若需等待，则 ⑧→⑨ 之间会**新增一个主链必经用户动作**，与 `D9` 的唯一验收口径和 `D-047` 的"不设计不可恢复业务终止 / 不锁死继续操作"相冲突） |
| 升级条件 | **若人工判定"必须等待 `E5`"，则本文口径作废，并自动升级为第二项 `DECISION REQUIRED`**（本文不自行处理） |
| 归属 | Integrator 复核（可并入 Gate C 关闭审查） |

---

## §L `TQ03`｜Gate B 候选与 PROPOSED 推荐

> 🔴 **`TQ03` 属 Gate B 重要人工决策。本节只出候选、差异、成本、风险与 PROPOSED 推荐 —— 不 `CONFIRM` 接入路径、不选最终模型、不把推荐写成已确定架构。**

### L.1 候选集合（接入路径）

| 候选 | 形态 | 优点 | 缺点 | 风险 |
|---|---|---|---|---|
| **LP-1 服务端代理 + provider 抽象层**（推荐） | 全部 LLM 调用经服务端单一入口；`ai/client` 抽象 provider；模型 / 供应商可后置替换 | ① API Key **服务端独占**；② 服务端可作为业务规则与 schema 校验的**唯一强制点**；③ 每步可独立 Route / 端点 ⇒ 天然匹配 `D9` 逐步可寻址（`TC-19`）；④ 模型策略可后置决定而不动业务代码 | 需自建抽象层（一次性成本）；服务端承担全部调用延迟 | 🟡 抽象层若不做，模型策略变更会波及各步实现（`S03-A` §8.2） |
| **LP-2 服务端签发短时凭据给前端直连** | 服务端签发临时凭据，浏览器直连 provider | 服务端不承载推理流量 | **凭据最终仍落在浏览器**；规则可绕过；无法保证输出先经服务端 schema 校验 | 🔴 **变相暴露 + 规则绕过** ⇒ **建议排除** |
| **LP-3 浏览器直连** | 前端持有 Key 直连 | 无需服务端 | Key 必然暴露；schema 校验点缺失；`TC-77` / `TC-13` 无法强制 | 🔴 **直接排除**（`S03-A` §2.1 判定） |
| **LP-4 平台 Edge Function 代理** | 经平台侧函数代理 LLM | 部署省事 | 多一跳；排障链路变长；平台超时 / 额度成为演示不可控变量；逻辑分散 | 🟡 仅在运行形态被迫选 BaaS 一体化时使用 |

### L.2 候选集合（模型策略）

| 候选 | 形态 | 优点 | 缺点 | 风险 |
|---|---|---|---|---|
| **MP-1 单模型先打通全链**（推荐） | ②④⑦⑧⑨ 共用同一模型 | ① 装配成本最低；② 行为一致、排障简单；③ 与 `R6`（不以模型数量堆叠替代产品价值）一致 | 无法按步优化成本 / 延迟 | 🟡 若单模型的**结构化输出能力不足**，会阻塞全部五步 |
| **MP-2 按步骤多模型分级** | 轻量步骤（②④）用低成本模型；重推理步骤（⑧⑨）用强模型 | 成本 / 延迟可优化 | 需维护多套输出契约兼容；引入供应商差异；排障复杂 | 🟡 与 `R6` 精神需谨慎对齐；**必须在该步契约冻结之后**才可引入 |

### L.3 Structured Output 能力需求（对 provider / 模型的硬性能力清单）

| # | 能力需求 | 为什么必需 |
|---|---|---|
| SO-1 | **结构化输出 / 受约束解码**（原生 JSON Schema 或等价约束机制，或工具调用参数） | 每步产物是**可枚举结构 + 逐条来源属性**，纯自由文本无法可靠解析（`TC-10` / `TC-11`） |
| SO-2 | **枚举约束可表达**（能在 schema 内限定取值域） | 枚举字面量是契约唯一来源（契约 §12 第 1 项）；枚举漂移会破坏跨 Worker 一致性 |
| SO-3 | **引用 ID 只能取自输入提供的集合**（可表达为 enum / 工具参数约束，或由服务端强校验） | 防止幻觉引用（`D-030` N1 / `TC-52`）；`EvidenceRef` 与 `attempt_ref` 必须可解析 |
| SO-4 | **支持"必填 + 可空 + 显式缺失"三态表达** | ⑤–⑧ 允许显式缺失但**不得留空 / 不得编造**（`D-027` / `D-032`） |
| SO-5 | **支持数组长度上界约束**（如 `grounded` ≤ 2、`followup_question` ≤ 1） | 数量类硬规则（`D-028` / `TC-30`）需要结构性保障，不能只靠 Prompt |
| SO-6 | **服务端可对输出做二次校验**（结构 / 枚举 / 引用完整性三层） | **服务端 schema 校验为硬闸门**（§C.2）；不依赖 provider 单方保证 |
| SO-7 | **足够的上下文长度**（输入含该 `Attempt` 的条目集合 + 候选记录摘要） | ⑥ 之后的步骤需注入历史候选（但**禁止注入全量历史**） |
| SO-8 | **调用超时可配置 + 可判定失败原因** | `RUNTIME` 分类与"可重试"提示需要区分超时 / 限流 / 服务错误 |
| SO-9 | **不要求流式输出** | 需求未提出；流式会增加 Runtime 语义复杂度（与 `S03-A` §8.2 一致） |
| SO-10 | **技术层信息可获取但不入库 / 不出口** | `model` / `token` / `latency` / `retries` 属技术层（`TC-71`） |

**不满足 SO-1 / SO-2 / SO-3 的后果**：五步契约无法可靠落地 ⇒ **属 provider 选型的硬性门槛**（不满足即不可选，而非"可接受风险"）。

### L.4 PROPOSED 推荐（**不构成已确定架构**）

```
接入路径 ： LP-1 服务端代理 + provider 抽象层
           · Key 只存在于服务端环境变量；前端代码 / 响应体 / 前端可读日志一律不含 Key
           · ai/client 单一接口；模型 / 供应商策略可后置决定而不动业务代码
           · ❌ 排除 LP-3 浏览器直连；❌ 建议排除 LP-2 短时凭据直连
           · ⚠️ LP-4 仅在运行形态被迫选 BaaS 一体化时使用

模型策略 ： MP-1 单模型先打通全链
           · 先保证五步契约与结构化输出稳定
           · MP-2 按步分级在契约冻结后作为**可选项**评估（不预先堆叠多模型架构）

结构化输出： 优先 provider 原生受约束解码（JSON Schema / 工具调用）
           ＋ 服务端三层校验为**硬闸门**（§C.2）
           ＋ 校验失败 = RUNTIME（可恢复、可重试、不伪造产物）

Runtime  ： 三层语义严格分离（GATE / RUNTIME / ACCEPTANCE）
           ＋ AI 失败不回滚已保存数据
           ＋ 不设产品层重试上限 / 冷却门槛
           ＋ 请求超时必须显式提示可重试，重试不覆盖用户已修改内容

后续依赖 ： 本推荐成立的前提是 **抽象层（SO-1 / SO-2 / SO-3 / SO-6）先落地**；
           若不做抽象层，模型策略变更会波及各步实现
```

### L.5 `TQ03` 的 Gate B 决策问法（建议）

1. 「LLM 是否统一经 **服务端代理 + provider 抽象层** 接入？」（建议排除浏览器直连与短时凭据直连）
2. 「模型选型策略是 **单模型先打通** 还是 **按步骤分级**？」（建议先单模型）
3. 「是否接受 **'provider 原生受约束解码 + 服务端 schema 硬校验'** 作为结构化输出的唯一口径？」（建议接受）
4. 「是否接受 **不要求流式输出**？」（建议接受）
5. 「是否确认 **SO-1 / SO-2 / SO-3 / SO-6 为 provider 硬性门槛**（不满足即不可选）？」

---

## §M 需 `S03-D` / `S03-E` / Integrator 验证的问题

### M.1 需 `S03-D`（检索与比较）确认

| # | 问题 | 为何需要 |
|---|---|---|
| M-D-1 | **Level A 四维度 → `field_key` 映射表（`TQ19`）冻结** | ⑥ 的命中 / 未比对集合 与 ⑦ 的 `dimension_key` 校验**都依赖该映射**；未冻结则 ⑦ 的输出校验无法实现 |
| M-D-2 | **`presence_state = unknown` 的维度必须在 ⑥ 输出 `uncompared_dimensions`**，且 ⑦ **不得**将其判为 `similar` | `TC-40` / `AC-22`；本文只在 ⑦ 侧做校验，⑥ 侧由 `S03-D` 保证 |
| M-D-3 | **Level B 不得单独使记录进入主要比较集合**（`TC-38`） | ⑦ 的 `relevance_reasons` 若以 Level B 单独成立即违规；⑥ 的集合判定需先保证 |
| M-D-4 | **排序完全归 `S03-D`**：⑦ 的输出**不含排序**；Level C 只作辅助排序 | 避免两处排序口径分叉（`TC-39`） |
| M-D-5 | **`TQ13` / `TQ14` 默认不引入**；本文的 ⑥⑦⑧⑨ 输出契约**不依赖**二者 | `S03-B` §L-11 同口径；若 `S03-D` 证明必须引入 ⇒ **须先补独立 `Decision ID`** 并升级 Gate B |
| M-D-6 | **源 `Attempt` 自身排除**（本文按 `D9` 语义推出） | 需 `S03-D` 显式确认（`S03-B` §L-13） |
| M-D-7 | **`N_检索` 注入给 ⑧ / ⑨ 的时机与渠道** | ⑨ 的 grounding 判定与出口路由以 `N_检索` 为第一输入；须保证注入值 = 派生结果中的当前有效值 |
| M-D-8 | **`TQ04` 若选 embedding 路线**：⑥ 的输出仍必须满足 §B.7（两份集合、无数值、不得以向量相似度替代 Level A 判定） | `R-02` / `R3` / `TC-41` |

### M.2 需 `S03-E`（测试 / Demo / 部署）确认

| # | 用例（本文要求必测） | 对应 `AC` / `TC` |
|---|---|---|
| M-E-1 | ② 解析失败 → 仅保存原文（标「尚未解析」）+ 可重试 + 重试**不覆盖用户已修改内容** | `TC-63` / `AC-88` |
| M-E-2 | 追问预算 = 问题数上限 3（**不是轮次**）；**一个问题只对应一个缺口**；打包多字段被拒 | `AC-14`–`AC-19` / `AC-Q06-1`–`3` |
| M-E-3 | **P1 未建立且预算用尽 ⇒ 仍为 `Draft`** | `AC-Q06-5` |
| M-E-4 | **M2 阶段不出现历史对照类追问** （含"结构上不可能产生"的输入隔离验证） | `AC-19` / `TC-34` |
| M-E-5 | ④ **0 条（依据不足）** ≠ **全部未处理** ≠ **生成失败**（三方区分，文案不共用） | `AC-91`–`AC-95` |
| M-E-6 | ④ `unresolved` 不作为已确认依据复用（不进 ⑧ 已确认经验 / 不作 grounding / 不计入 `N_引用`） | `AC-95` / `TC-13` |
| M-E-7 | ⑦ **未比对维度**必须出现且不被判为相似；**不出现任何数值相似度** | `AC-22`–`AC-24` |
| M-E-8 | ⑦ / ⑧ **不补满、不凑数**；首屏 3 条属阅读负荷控制，`N_检索` 不被截断 | `AC-82`–`AC-86` |
| M-E-9 | ⑧ `E2` / `E3` 不满足 ⇒ `candidate` + 三段式；**不进入 0 条出口** | `AC-58` / `AC-99` |
| M-E-10 | ⑧ 0 条 ⇒ 出口**只用 `EXIT-A` / `EXIT-C`**（**不得**强行要求 `EXIT-B`） | `AC-97` |
| M-E-11 | ⑨ 0 条 ⇒ **`EXIT-A` / `EXIT-B` / `EXIT-C` 三分路由**，**禁止统一写成"历史证据不足"** | `AC-98` / `AC-35` |
| M-E-12 | grounding **二值**（无部分锚定）；命中 `N1`–`N6` ⇒ 整体不得为 `grounded` | `AC-36` / `TC-50` / `TC-52` |
| M-E-13 | **两分区**且**不存在"混合"第三标签**；`Model Suggestion` 整体标注恒存 | `AC-37` / `AC-69` |
| M-E-14 | 第 ⑤ 项**三分**；`Fact` 层不出现 AI 推荐值；未知条件不得写"保持不变" | `AC-32` |
| M-E-15 | `grounded` **1–2 条**、无"默认 2 条"、无 ≥ 3 条、无近义改写 | `AC-34` |
| M-E-16 | `Unknown` 结果记录**不得单独承担** `support` / `contradict`，且**不得从证据清单删除** | `AC-40` / `TC-48` |
| M-E-17 | 归档后：既有 ⑩ 引用继续显示 + 标「来源已归档」+ `N_引用` 不追溯减少 | `AC-74` / `AC-100` |
| M-E-18 | 响应体 / 产物**不含**禁字段（数值相关性、等级化措辞、技术层字段）—— **建议双向断言** | `AC-23` / `AC-78` / `TC-41` / `TC-71` |
| M-E-19 | **RUNTIME 可恢复 ≠ 验收可跳步**：Acceptance fixture 下 ①→⑩ 完整成功执行 | `AC-90` |
| M-E-20 | `SP-02`（解析 + 缺口 + 追问计数）与 `SP-04`（grounding + ⑧⑨ 输出契约）**是否执行**需人工批准 | `SP-02` / `SP-04` |

### M.3 需 Integrator 收敛（本文提出的接口落点问题）

| # | 项 | 说明 |
|---|---|---|
| M-I-1 | **0 条出口类别的落点** | `S03-B` §C.8 H-8 要求"输出 0 条时**必须记录**原因类别"，但字段落点未定。**本文不新增实体 / 不新增表**；建议由 Integrator 在 `TQ07` / `TQ17` 邻接范围内收敛（候选落点：生成批次记录 / 该 `Attempt` 的附属状态记录扩展） |
| M-I-2 | **`Insight` 生成批次与 `EvidenceRef` 的写入顺序** | ⑧ 的引用清单为**提案**，须先经 `domain` 校验后才落库；须保证"`owner = Insight` 的 `EvidenceRef` 增删视为内容性修改"**不误判自动退回**（首次落库不应触发退回逻辑） |
| M-I-3 | **`reasoning_input_refs` 的具体形状**（响应 `S03-B` §L-5） | 本文口径：**内容条目 ID 清单 + 分区标签**，**不是**新引用实体（§G.4）；需 Integrator 确认物理表达 |
| M-I-4 | **追问计数器续写语义**（响应 `S03-B` §L-6） | 本文口径：**`Draft` 生命周期内累计、不清零；重新解析不重置；重复呈现不重复计数**（§D.4 G-7 / G-8） |
| M-I-5 | **`display` 条目用户反馈是否落库**（响应 `S03-B` §L-7） | 属 `TQ09` 邻接；本文要求：**若落库则不得改变任何业务状态；若不落库则界面不得提供空动作**（二者必选其一） |
| M-I-6 | **`trigger_kind` 是否扩展**（响应 `S03-B` §C.7.1 / §L-26） | 本文**不涉及**（⑧ 生成不写迁移事件）；若 Integrator 扩展，属**对 canonical 枚举的扩展**，须走 `DECISIONS.md` 变更流程 |
| M-I-7 | **三层语义与 `EXIT-A/B/C` 的编码取值**（`TQ24`） | 本文只锁"必须可区分 + 禁止裸 `A`/`B`/`C`"，**不指定取值** |
| M-I-8 | **内部检索分数不落库的收紧建议**（响应 `S03-B` §L-29） | 本文支持收紧（`E-1 最小化`），但**不改变契约语义** |
| M-I-9 | **⑨ 与 `E5` 的解耦口径复核**（§B.6.1 / §K.4） | 若人工判定"必须等待 `E5`" ⇒ 升级为第二项 `DECISION REQUIRED` |

---

## §N 异常报告

### N.1 四项标志

```
BLOCKER                   = 无
CCR                       = 无
PRODUCT SEMANTIC CONFLICT = 无
DECISION REQUIRED         = 有（1 项：§K `Hypothesis` 编辑边界与修订后裁决位语义）
```

| 标志 | 结论依据 |
|---|---|
| **`BLOCKER` = 无** | `TQ03` 未裁决**不属阻塞项** —— 契约 §0.1 明确「Gate A 不要求先裁决技术栈」；`S03-C` 完成判据 = **各步骤 I/O 契约 / 判定逻辑 / 降级路由均已给出**，本文件已完成。**无任何"无法继续"的技术或产品阻塞** |
| **`CCR` = 无** | 本文件**一处未改契约语义**：全部输出为 AI 层的**语义契约与判定逻辑**，落在契约 §0.2 允许 `S03-C` 处理的范围内（各步 I/O 语义、判定逻辑、降级与出口路由）。刻意**未**提出 CCR 的近邻项：① `reasoning_input_refs` 物理表达 → `TQ07` / `TQ17`（Integrator）；② 0 条出口类别落点 → §M.3 `M-I-1`（Integrator）；③ 三层语义与出口编码 → `TQ24`（Integrator）；④ `Hypothesis` 编辑边界 → **本文不提 CCR，而是升级为 `DECISION REQUIRED`**（依契约 §14 第 2 条 ③：影响关键技术选择或产生用户可感知行为 → 升级 Gate B）。**`CCR-S03B-01` / `CCR-S03B-02` 已并入契约 `v0.2.1`，本文件按现口径执行，不再变更** |
| **`PRODUCT SEMANTIC CONFLICT` = 无** | 检查对象 = 本 AI Pipeline 方案 × `S00-01`（`D1`–`D10` / `R1`–`R6`）与 `S00-02`（`D-011`–`D-048` / `Q16` 派生关闭）全部 `CONFIRMED` 产品机制。结果：**无任何"技术上必须回改产品机制"的情形**。`S03-A` §9.3 登记的语义边界（⑥⑦⑧ 是否可拆多个 HTTP 往返 / ⑦→⑧ 是否存在用户动作）**已在本文件 §J.3 / §J.4 关闭**：拆分为**允许**且**不改变任何产品语义**；⑦→⑧ **不存在必须的用户动作** |
| **`DECISION REQUIRED` = 有（1 项）** | §K：`Hypothesis` 的内容（尤其 ①②③④⑤）是否可被用户直接编辑，以及**编辑后 `decision_state` 是否回退**。**canonical 未定义**（`D-040` 明文只覆盖 `Insight`；`D-033` 只覆盖 ⑥⑦⑧ 候选指标 / 判据），且"允许编辑"与"只读"产生**不同用户可感知行为**；**新增回退语义属契约 §12 第 3 项禁改范围** ⇒ **不得由 Worker 自行选择**，已按 A–E 格式报告（§K.3） |

### N.2 登记的语义边界（非冲突、非阻塞）

| # | 边界 | 本文口径 | 依据 |
|---|---|---|---|
| SD-1 | **源 `Attempt` 自身从候选集合排除** | 由 `D9` 第 ⑥ 步"检索相关**历史** `Attempt`"直接推出，属实现必然 | `S03-B` §M.3 同口径 |
| SD-2 | **⑨ 的自动生成不等待 `E5`** | PROPOSED；若人工判定相反 ⇒ 升级为第二项 `DECISION REQUIRED` | §B.6.1 / §K.4 |
| SD-3 | **"同屏"是呈现约束，不是交互门** | `D-022` 的"同屏"指生成结果与裁决控件在同一视图 | §J.4 |
| SD-4 | **grounding 不成立后不自动降级为 `Model Suggestion`** | 引用 / 判据不成立 ⇒ **该条不产出** + 显式说明；**不得**改名保留（`Model Suggestion` 是否出现取决于该次生成**是否显式请求 model 通道**，属"可选能力"，**不是失败回填**） | `D-029`（不得暗示有历史依据）/ `D-034`（拒绝弱版填充位置） |
| SD-5 | **不合格判据的自动识别不引入** | 只做"是否显式标注缺失"的**结构校验**；语义质量由验收用例覆盖 | `D-032` / `D-037`（禁隐性判据） |
| SD-6 | **追问预算计数器不清零** | 由"总量 ≤ 3"目的推出（可被绕过则预算无意义）；**不得引入清空计数的新用户动作** | §D.4 G-8 / G-9 |
| SD-7 | **0 条出口类别的落点未定** | 本文不新增实体；登记 `M-I-1` 由 Integrator 收敛 | `S03-B` §C.8 H-8 |
| SD-8 | **⑧ 重新生成** | 修改 `Formal` + 显式「重新检索」⇒ **不自动重生成 ⑧**，⑧ 位置呈现既有 `Insight`（**不得**自动退回既有状态） | `D-045` TR-7 / `TQ11` #7 |

### N.3 本文件**未**做的事

| ❌ 未做 | 状态 |
|---|---|
| 修改 Shared Technical Contract | ❌ **未做**（**未提任何 CCR**） |
| 修改 `DECISIONS.md` / `docs/01`–`09` / `S00-02` 文档 / `CHANGELOG.md` | ❌ **未做** |
| 修改 `01_APP_ARCHITECTURE.md` / `02_DATA_AND_STATE.md` / 其它 Worker 文件 | ❌ **未做**（只读取 + 对齐 + 回复其 `§L` 待确认项） |
| 写正式 Prompt 全文 / Prompt 模板 | ❌ **未做** |
| 写业务代码 / SQL / DDL / 迁移 | ❌ **未做** |
| `CONFIRM` 技术方案 / 选最终模型 / 定 API 形状 | ❌ **未做**（`TQ03` 属 **Gate B**） |
| 新增产品机制 | ❌ **未做**（全部结论或标 `PROPOSED`，或声明"由既有 Decision 推出"，或升级为 `DECISION REQUIRED`） |
| 新增数值置信度 / 证据等级 / 相似度 | ❌ **未做**（§C.4 全表禁入） |
| 自行处理 `DECISION REQUIRED` | ❌ **未做**（只报告 A–E，**不选择**） |
| 建立候选池 / 后台生成 / 异步批量通道 | ❌ **未做** |
| 启动 Spike / 执行 `SP-02` / `SP-04` | ❌ **未做**（须人工批准） |
| 执行 `S03-D` 的工作 | ❌ **未做**（本文止于 `S03-C`） |

### N.4 本文对上游 `§L` 待确认项的答复（汇总）

| 上游问题 | 本文答复 |
|---|---|
| `S03-B` §L-1：同一 `Attempt` 是否允许多条 `Insight` | **允许 0..n**（不设唯一约束）；**生成路径唯一**（主链 ⑧ 的一次生成）；**不设覆盖语义**（避免版本痕迹风险）（§F.1） |
| `S03-B` §L-2：`Unknown` 记录的 `support` / `contradict` 降级措辞 | 角色降为 `context` + 显式标注「该记录结果状态为 Unknown，不足以单独支持 / 反驳」+ 保留在引用清单（§G.5） |
| `S03-B` §L-3：④「0 条」与「全部未处理」的文案 | 三方区分（0 条 / 全部未处理 / 生成失败），**文案不得共用**（§B.3.3） |
| `S03-B` §L-4：`Hypothesis` 内容被修改后如何处理 | 🔴 **`DECISION REQUIRED`**（§K）—— **本文不自行创造规则** |
| `S03-B` §L-5：`reasoning_input_refs` 的具体形状 | 内容条目 ID 清单 + 分区标签；**不是**新引用实体（§G.4；物理表达 → `M-I-3`） |
| `S03-B` §L-6：追问计数器的续写语义 | `Draft` 内累计、不清零；重解析不重置；重复呈现不重复计数（§D.4） |
| `S03-B` §L-7：`display` 条目反馈是否落库 | 二者必选其一；本文只锁"不得改变任何业务状态 / 不得提供空动作"（`M-I-5`） |
| `S03-A` §9.3：⑥⑦⑧ 是否可拆多个 HTTP 往返 / ⑦→⑧ 是否存在用户动作 | **可拆**（⑤⑥⑦ 同链、⑧ / ⑨ 可独立往返）；**不存在必须的用户动作**；**不构成 `PRODUCT SEMANTIC CONFLICT`**（§J） |

---

## §O 本文件产出与状态

```
产出文件      : docs/architecture/03_AI_PIPELINE.md（唯一）
状态          : PROPOSED / S03-C
未修改        : 00_SHARED_TECHNICAL_CONTRACT.md · DECISIONS.md · docs/01–09 · S00-02 文档 ·
                S00-03 启动文档 · CHANGELOG.md · 01_APP_ARCHITECTURE.md · 02_DATA_AND_STATE.md
未执行        : 未编码 · 未部署 · 未启动 Spike（SP-02 / SP-04 未执行）· 未执行任何实测
未产生        : 未产生任何 CONFIRMED 声明 · 未选最终模型 · 未 CONFIRM 接入路径
BLOCKER                   : 无
CCR                       : 无
PRODUCT SEMANTIC CONFLICT : 无
DECISION REQUIRED         : 有（1 项 —— §K `Hypothesis` 编辑边界，需人工裁决）
```

**下一步（需人工授权）**

1. 与 `S03-A` / `S03-B` / `S03-D` / `S03-E` 并行产出一并提交 **Integrator**（契约收敛 + 跨 Worker 一致性 + `§M.3` 的 9 项落点收敛）。
2. **人工裁决 `§K` 的 `DECISION REQUIRED`**（`Hypothesis` 编辑边界）—— **未裁决前按"不新增回退链"的现状执行**。
3. **Integrator 复核 `§K.4`**（⑨ 与 `E5` 的解耦口径）。
4. **Gate B**：裁决 `TQ03`（含 `§L.5` 的 5 个决策问法）与 `TQ01` / `TQ02` / `TQ04` / `TQ05`。
5. **Local Landing**：落盘（**不编码**）。
6. `SP-02` / `SP-04` 执行批准（可选，建议随 `SP-01` / `SP-03` 一并评估）。

**🛑 本任务到此结束，不继续 `S03-D`。**