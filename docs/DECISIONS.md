# 决策记录（DECISIONS）

> 记录项目中所有重要决策：背景、备选方案、结论、理由。每个决策一条，按时间倒序排列。

## 记录格式

```
### D-编号：决策标题
- 日期：
- 背景 / 问题：
- 备选方案：
- 结论：
- 理由：
- 影响范围：
```

> **本文件当前包含以下编号空间**（**2026-09-19 编辑性修正**：不再使用"本文件承载 N 组编号空间"这类会随批次增加而**再次过时**的硬计数表述，改为列举式；原"四组 → 五组"的编辑性修正记录保留在 `CHANGELOG.md` 历史条目中。**本修正属编辑性文档修正，不是产品 Decision，未改动任何决策内容**）：
> - `D-001`、`D-002`：文档结构与协作机制类决策。
> - `D1`–`D10`：S00-01 产品关键决策（见《S00-01 人工关键决策》）。
> - `D-011`–`D-015`：S00-02 产品机制决策（**第一批**，见《S00-02 第一批人工决策》）。
> - `D-016`–`D-026`：S00-02 产品机制决策（**第二批**，见《S00-02 第二批人工决策》）。
> - `D-027`–`D-038`：S00-02 产品机制决策（**第三批**，见《S00-02 第三批人工决策》）。
> - `D-039`–`D-048`：S00-02 产品机制决策（**第四批**，见《S00-02 第四批人工决策》）。
> - `D-049`：**S00-03 产品机制决策**（见《S00-03 人工决策》；🚩 **本编号与 `Q16` 无关**）。
> - `D-050`：**S00-03 产品机制决策**（见《S00-03 人工决策》；🚩 **本编号与 `ADJ-01` 无关**；**来源 = `SP-03`**）。
> - `D-051`、`D-052`：**S00-03 产品机制决策（POST-INTEGRATOR 人工裁决）**（见《S00-03 人工决策》；🚩 **两个编号均与 `ADJ-01` / `Q16` 无关**；**来源 = `20_INTEGRATION/S00-03_技术决策包.md` 的 `DR-01` / `DR-02`**；**`D-051` = 显式重新生成后的产物语义；`D-052` = `actual_attempt` 的严格语义边界负例**）。
> - 🔴 **`D-053`、`D-054`：S00-03 架构级人工决策（2026-09-24，LOCAL-FIRST PIVOT）**（见《S00-03 人工决策》；🚩 **两个编号均与 `ADJ-01` / `Q16` 无关**；**来源 = 项目负责人本轮人工原话（非 AI 提议、非 Worker 产出、非 `DR-*` 缺陷报告）**；**`D-053` = V1 主架构改为 Local-first Harness-style Web App；`D-054` = V1 只实现 Structured Experience RAG（`ResearchContextProvider` 仅预留）**；🔴 **二者是"技术承载方式 + RAG 范围"的架构决策，不重新设计产品** —— **不得据此重开 `D1`–`D-052` 的任何产品语义**）。
> - 🔴 **`D-055`、`D-056`：S00-03 架构级人工决策（2026-09-24，LLM 路径与凭据落地）**（见《S00-03 人工决策》；🚩 **两个编号均与 `ADJ-01` / `Q16` 无关**；**来源 = 项目负责人本轮人工裁决，关闭 `20_INTEGRATION/S00-03_技术决策包.md` / 契约 §13.7 的 `DR-03` / `DR-04`**；**`D-055` = LLM 请求网络路径采用 `Provider-dependent Hybrid`（按 Provider Adapter 能力决定）；`D-056` = LLM 凭据持久化采用 `Session-only Credential`**；🔴 **二者是"LLM 接入的网络边界与凭据边界"决策，不重新设计产品、不 `CONFIRM` `TQ03` / `TQ04`、不改变 `D1`–`D-054` 的任何产品语义**）。
> - 🔴 **`D-057`：S00-03 架构执行级人工流程决策（2026-09-24，DEPLOYMENT VALIDATION DEFERRAL）**（见《S00-03 人工决策》；🚩 **本编号与 `ADJ-01` / `Q16` 均无关**；**来源 = 项目负责人本轮人工流程决策的原话口径（"部署问题后面再说，当前优先尽快完成 Gate B，进入开发阶段"），非 AI 提议、非 Worker 产出、非 `DR-*` 缺陷报告**；**`D-057` = `SP-06` 部署验证与真实浏览器人工验收延期至提交前（`PRE-SUBMISSION ACCEPTANCE`）**；🔴 **本 Decision 只调整验收时序，不 `CONFIRM` 任何 `TQ`、不改写 `SP-06` 历史状态（仍 `CONDITIONAL PASS`、7 项仍 `PENDING MANUAL OBSERVATION`）、不改变 `D-053`–`D-056` 一字**）。
> - 🚩 **`D-058`–`D-062`：S00-03 **Gate B 最终技术决策**（2026-09-24，GATE B LANDING PHASE）**（见《S00-03 人工决策》；🚩 **五个编号均与 `ADJ-01` / `Q16` 无关**；**Source 全部 = `Gate B Final Human Confirmation`（项目负责人原话：「A｜确认以上全部 Gate B 决策」）**；**`D-058` = `TQ01` 应用架构 / 技术运行形态；`D-059` = `TQ02` V1 Primary Persistence；`D-060` = `TQ03` LLM 接入策略；`D-061` = `TQ04` 检索实现路线 = `R-A`；`D-062` = `TQ05` 部署形态 / 环境（含 `DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION`）**；🔴 **五个 Decision 独立追踪、不得合并**；🔴 **`TypeScript end-to-end` 与 `Markdown + JSON / sidecar metadata` 属 `TECHNICAL DEFAULT` / 实现参数，🔴 不写入任何 `CONFIRMED` 核心结论、🔴 不生成 `Decision ID`**；🔴 **本组 Decision 不新增 `AC`**（`AC` 口径不变 = 连续 canonical 162 ＋ 独立 `AC-Q06` 6 ＝ 全部有效验收点 168））。
> - 🚩 **第二批口径校正特别说明（2026-09-19，BLOCKER）**：**`D-017`（Q06）/ `D-023`（新-1）的「追问预算单位」已由 `max-3-rounds`（轮次）校正为 `max-3-key-questions-total`（关键追问问题总数）**，并连带同步 `D-016` / `D-018` / `D-034` 的同口径表述。**Decision ID 不变、不新增编号** —— 这是**同一已确认 Decision 的错误口径校正**，详见《S00-02 第二批人工决策》下的 **《🚩 第二批定向校正（2026-09-19，BLOCKER）》**。
> - 上述各编号空间均**编号续接现有最大编号继续递增**，以避免与 `D1`–`D10` 冲突。
> 各编号空间互不冲突，各自按顺序递增。
> **第三批特别说明**：S00-02 的 **修正 F**（`History-grounded Hypothesis` 与 `Model Suggestion` 的对象分离）**不单独创建 Decision ID**，其正式规则由 **D-029 / D-030** 承载；**修正 G**（取消"≥5 条才算完整孵化"及一切固定阈值）**不单独创建 Decision ID**，其正式规则由 **D-034 / D-035 / D-037** 承载；**新-8 – 新-22 中已吸收进主 Q 的子规则不创建独立 Decision ID**（映射见 `docs/analysis/S00-02_V1核心产品机制收敛.md` §17.8.1），以避免**同一规则出现两个正式 Decision Source**。
> **第四批特别说明（2026-09-19）**：S00-02 第四批确认 **11 项**（Q04 / Q12 / Q14 / Q16 / Q27 / Q28 / Q29 / Q31 / 新-2 / 新-7 / 新-10），其中 **10 项形成主 Decision `D-039`–`D-048`**；**`Q16` 为 `D-019` 的派生关闭项，不创建独立 `Decision ID`**（正式规则源 = **`D-019` Level C**，验收依据 = `09` 的 `AC-21`）。**不得**为以下内容单独创建 Decision：**INT 项**、**step-gate 表**、**§23 修正项**、**`AC-10` 精度修正**、**修正 F / G**、**子规则**、**T4-A / T4-B / T4-C 的新问题编号** —— 以避免**同一规则出现两个正式 Decision Source**。**第四批落盘后 `S00-02 = CLOSED / CONFIRMED`。**
> 🟢 **当前阶段状态（2026-09-19，最新）**：**`S00-01 = CLOSED / CONFIRMED`**；**`S00-02 = CLOSED / CONFIRMED`**（第一批 `D-011`–`D-015`、第二批 `D-016`–`D-026`、第三批 `D-027`–`D-038`、第四批 `D-039`–`D-048` 全部 `CONFIRMED`；**第四批 11 项议题已全部确认**）。**下方各批次章节中出现的"仍未确认 / 尚未开始 / 第四批未完成 / `S00-02` 仍未关闭"等表述，均为该批次确认当时的历史状态记录，已由本行取代** —— 依「不改写历史」保留原文，**不再作为当前状态**。**`S00-02` 无未裁决 Q 项、无阻塞项**。**`S00-03｜技术架构与实现方案收敛` = 已启动 / 未关闭**（`Gate A` 定向修正已完成；`S03-A` / `S03-B` / `S03-C` 已产出且均为 `PROPOSED`；`S03-D` / `S03-E` 未启动）。**技术栈未选择、DB 未确定、API 未确定、编码未开始、未做 UI 视觉设计**。**`S00-03` 内不开始正式业务编码、不进入双人并行开发、不实现正式产品模块。**
> 🟢 **就地补注（2026-09-19，按「不改写历史」保留上述原文）**：上述状态行中的「**`S03-D` 未启动**」为该行撰写当时的状态。**当前实际 = `S03-D` 已产出**（`docs/architecture/04_RETRIEVAL_AND_COMPARISON.md`，`PROPOSED`）、**`SP-03` 已执行**（`30_SPIKES/retrieval/`，**`RESULT = INCONCLUSIVE`**）、**`D-050` 已落盘**（见下文《S00-03 人工决策》）；**`S03-E` 仍未启动**；**技术栈未选择 / DB 未确定 / API 未确定 / 编码未开始 / 未做 UI 视觉设计**不变。**本补注不改动该行任何决策内容**；**`TQ04` 仍未裁决（`Gate B`）**。

---

# S00-03 人工决策

- 记录日期：2026-09-19
- 决策来源：项目负责人人工确认（非 AI 提议）
- 状态：全部 `CONFIRMED`
- 来源阶段：**`S00-03｜技术架构与实现方案收敛`**（触发于 `S03-C`）
- **触发问题**：`docs/architecture/03_AI_PIPELINE.md` **§K `DECISION REQUIRED`** —— `Hypothesis` 内容在 V1 中是否可被用户直接编辑；若可编辑，内容被修改后 `decision_state` 如何处理。
- **唯一依据**：`03_AI_PIPELINE.md` §K.3 的 `DECISION REQUIRED` 报告（A 需决定什么 / B 方案 A / C 方案 B / D 两方案影响 / E `PROPOSED` 推荐）+ **项目负责人 2026-09-19 人工裁决（选择 §K.3 `E` 的「方案 B 窄口径变体」）**。
- **约束**：**只裁决 §K 报告中的未定义语义**；**不修改** `D1`–`D10` / `R1`–`R6` / `D-001`–`D-048` 中的任何一条；**不重开** `S00-01` / `S00-02`；**不修改** `docs/architecture/03_AI_PIPELINE.md`（`S03-C` Worker 原产物保留不动，其 §K 作为历史报告留痕）。
- **编号说明（避免与 `Q16` 混淆）**：**本 `D-049` 与 `Q16` 无关**。`Q16` 为 `D-019` 的派生关闭项，**永久不占用任何 `Decision ID`**（见本文件《`Q16`｜派生关闭登记》）；《S00-02 第四批特别说明》中「**不得创建 `D-049 = Q16`**」的禁止性表述**继续有效**。
- **影响范围**：`docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（`v0.2.1` → **`v0.2.2 DRAFT / D-049 对齐版`**）、`docs/04_USER_FLOW.md`、`docs/05_DATA_MODEL.md`、`docs/06_AI_CAPABILITIES.md`、`docs/08_UI_SPEC.md`、`docs/09_TEST_PLAN.md`（新增 `AC-101`–`AC-106`）
- ⚠️ **本 Decision 存在 1 处邻接语义需人工确认（不在本 Decision 内自行解决）**：`D-027` 第 ⑤ 项三分中「**用户本人明确指定"保持某条件" = 用户 `Fact`**」的 **V1 落点**，与本项"⑤ 只读、只有 ⑥⑦⑧ 可由用户提供"的分工需要人工确认 —— 详见条目内《邻接语义（需人工确认）》段。
  - ✅ **2026-09-19 就地补注（状态更新，不改写上述原文）**：该邻接语义**已由项目负责人人工裁决（选择读法 ③）并正式关闭**，状态由「需人工确认」更新为 **`CLOSED / DERIVED`**（`ADJ-01`）。**本项不创建 `D-050`**、**不改 `D-027` 一字**、**不改 `D-049` 一字**、**不新增产品机制** —— 属**已有 `CONFIRMED` Decision 的组合解释闭合**。关闭依据与结论见条目内《邻接语义（✅ 已关闭 / 派生）》。**影响范围追加**：`docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md` 由 **`v0.2.2`** 推进至 **`v0.2.3 DRAFT / ADJ-01 派生关闭版`**（**仍为 DRAFT，未 `FROZEN` / 未 `CONFIRMED`**）。

- 🟢 **追加（2026-09-19，`D-050`）**：本章节在 `D-049` 之后**续接新增 `D-050`｜Level A 维度 `matched` 的严格语义重叠判据**（**来源阶段 = `S00-03` / `SP-03`；触发 = `SP-03 RESULT = INCONCLUSIVE` 与 `matched_level_a_dimensions` 判定漂移**）。**`D-050` 与 `D-049` / `ADJ-01` 均无关**；**不改变 `D-049` 一字**、**不改变 `ADJ-01` 的 `CLOSED / DERIVED` 状态**；**不重开 `S00-01` / `S00-02`**。

- 🟢 **追加（2026-09-24，`D-053` / `D-054`）**：本章节续接新增 `D-053`｜V1 主架构改为 Local-first Harness-style Web App、`D-054`｜V1 RAG 范围 = 仅 Structured Experience RAG（**均为项目负责人人工架构级决策**）。**二者与 `D-049` / `D-050` / `ADJ-01` / `Q16` 均无关**；**不改变 `D-049`–`D-052` 一字**；**不重开 `S00-01` / `S00-02`**。
- 🟢 **追加（2026-09-24，`D-055` / `D-056`）**：本章节续接新增 `D-055`｜LLM 请求网络路径 = `Provider-dependent Hybrid`（按 Provider Adapter 能力决定）、`D-056`｜LLM 凭据持久化 = `Session-only Credential`（**均为项目负责人人工裁决**，**关闭契约 §13.7 的 `DR-03` / `DR-04`**）。🔴 **二者只定 LLM 接入的网络边界与凭据边界**：**不 `CONFIRM` `TQ03` / `TQ04`**、**不重新设计产品**、**不改变 `D-053` / `D-054` 一字**、**不改变任何既有产品语义**。

- 🟢 **追加（2026-09-24，`D-057`）**：本章节续接新增 `D-057`｜`SP-06` 部署验证与真实浏览器人工验收延期至提交前（Deployment Validation Deferral）（**项目负责人人工流程决策**）。🔴 **本 Decision 只调整验收时序**：**不 `CONFIRM` `TQ01`–`TQ05`**、**不改变 `SP-06` 历史执行状态**（仍 `CONDITIONAL PASS`；7 项仍 `PENDING MANUAL OBSERVATION`）、**不改变任何既有产品语义**、**不改变 `D-049`–`D-056` 一字**、**不重开 `S00-01` / `S00-02`**。

- 🟢 **追加（2026-09-24，`D-058`–`D-062`：GATE B LANDING）**：本章节续接新增 **Gate B 最终技术决策 5 项**（`TQ01`–`TQ05` 各自独立成 Decision，**从 `D-057` 连续顺延**）：`D-058`｜`TQ01` 应用架构 = Browser-heavy Local-first Web App + Optional Thin Server Layer；`D-059`｜`TQ02` = Local Workspace Files + No required cloud database；`D-060`｜`TQ03` = Configurable LLM + Provider Abstraction + Provider-dependent Hybrid + Session-only Credential + Registered-provider Thin Proxy only；`D-061`｜`TQ04` = `R-A`；`D-062`｜`TQ05` = Local Development + Vercel Demo/Review Deployment Target（**附 `DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION`**）。🔴 **Source 全部 = `Gate B Final Human Confirmation`**；🔴 **五个 Decision 独立追踪、不得合并**；🔴 **只冻结技术架构 / 部署目标，不改变任何产品语义**、**不改变 `D-049`–`D-057` 一字**、**不重开 `S00-01` / `S00-02`**、**不新增 `AC`**。

---

## D-049｜`Hypothesis` V1 编辑边界与用户验证判据

- **Decision ID**：D-049（来源：**`S00-03`**；触发 = `03_AI_PIPELINE.md` §K `DECISION REQUIRED`）
- **决策主题**：V1 中 AI 生成的 `Hypothesis`（两类 `kind`）**哪些内容可被用户直接编辑**；用户提供的验证判据如何与 AI 内容共存；编辑是否触发裁决位回退
- **最终结论**：**采用 §K.3 `E` 的「方案 B 窄口径变体」** —— **AI 生成的 `Hypothesis` 核心内容 ①②③④⑤ 在 V1 中一律只读**；**⑥⑦⑧ 允许用户自行提供 / 替换 / 补充，且一律以「用户 `Fact` 条目」与「AI `Inference` 条目」分列实现**；**不建立任何 `Hypothesis` 内容修改状态机、不引入裁决位回退、不引入版本历史、不引入内容修改事件日志、不引入新状态枚举**。
- **核心约束**：

  **一｜V1 不提供对 AI 生成 `Hypothesis` 以下核心内容的直接编辑**
  **① 待验证假设　② 假设依据　③ 引用的历史 Attempt / `EvidenceRef`　④ 下一轮建议改变什么　⑤ 建议保持哪些条件** —— **一律只读**（用户不得就地编辑、不得删除）。

  **二｜③ 的引用关系由系统 / `EvidenceRef` 管理**
  **用户不得直接修改引用关系**（依据 `D-021 E4` + 契约 §3.2 / §3.3 —— **本项为既有规则的重申，不是新增规则**）。

  **三｜以下三项允许用户自行提供 / 替换 / 补充**
  **⑥ 观察 / 指标　⑦ 什么结果支持该假设　⑧ 什么结果反驳该假设** —— **允许用户自行提供、替换或补充**（依据 `D-027`：⑥⑦⑧ **用户提供为 `Fact`、AI 提出为 `Inference`**；`D-033`：**用户始终可以自己定义 / 修改 / 拒绝 / 跳过**候选指标 / 判据 —— **本项为既有规则的落地，不是新增产品机制**）。
  - **"替换"的合法实现 = 用户新增 / 更新自己的 `Fact` 条目**；**不得实现为就地改写 AI 条目**；**AI 原条目保留且仍标 `Inference`**。
  - **是否呈现"用户已提供替代判据"的具体措辞 / 视觉，属 `08_UI_SPEC.md` 呈现层事项 —— 本 Decision 不锁。**

  **四｜用户对 ⑥⑦⑧ 内容的落库与分列**
  - **保存为用户 `Fact`**；
  - **与 AI 提出的 `Inference` 分列**（沿用 `D-027` / `D-030` 的两分区结构）；
  - **不直接修改 AI `Inference` 条目**；
  - **不改变 AI 条目的 `source_type`**（契约 §4.2 第 1 条「来源类型恒不变」）；
  - **不建立 `Fact` / `Inference` 混写**（**不得出现"混合"来源标签**，`D-030`）。

  **五｜裁决位不变**
  `Hypothesis` 裁决位继续**只有 `undecided` / `accepted` / `rejected`**；**`candidate` 一词不得用于任何 `Hypothesis`**（`D-027`）。

  **六｜V1 不新增（明确记账）**
  - ❌ `Hypothesis` 内容修改状态机
  - ❌ 内容修改后自动回退 `undecided`
  - ❌ `Hypothesis` 版本历史
  - ❌ `Hypothesis` 内容修改事件日志
  - ❌ 新的状态枚举

  **七｜用户若希望改变 ①②④⑤ 时的唯一路径**
  **修改相关 `Formal Attempt` → 然后显式发起重新检索 / 重新生成**（`D-045` `TR-7`）；**不得直接编辑 AI 生成的原 `Hypothesis` 核心内容**。
  - **属后续重跑动作，不是 `D9` 十步之间新增的主链步骤**；**不得自动重生成 ⑧ / ⑨ 步产物**。

  **八｜修改 / 补充 ⑥⑦⑧ 不触发回退**
  **不触发任何新的 `Hypothesis` `decision_state` 回退机制**；**不得被推断为"该假设已改变"**。

  **九｜本 Decision 不改变**
  - `History-grounded` / `Model Suggestion` **两类 `kind`**；
  - `Model Suggestion` **保存 ≠ 接受**（`D-042`）；
  - `Hypothesis` **永不直接成为 `Experience Asset`**（`D-041`）；
  - **`Fact` / `Extraction` / `Inference` 来源边界**；
  - **`EvidenceRef` / grounding 规则**；
  - **`D9` 十步结构**。

- **邻接语义（✅ 已关闭 / 派生 —— 原状态「需人工确认」已更新为 `CLOSED / DERIVED`，2026-09-19）**：
  - **事实**：`D-027` 第 ⑤ 项的来源三分规定「**用户本人明确指定"保持某条件" = 用户 `Fact`**」。
  - **本 Decision 的边界**：**⑤ 被列入只读组**；允许用户"自行提供 / 替换 / 补充"的项目**只列举 ⑥⑦⑧**。
  - **因此产生的合法问题**：⑤ 中"用户本人明确指定"这一 `Fact` 通道在 V1 中**从哪里进入** —— ① 该通道随 ⑤ 只读而在 V1 **不发生**；② 通过 ⑤ 的**并列用户条目**（与 ⑥⑦⑧ 同构）实现；③ **仅**在 `Formal Attempt` 层表达并由 ⑤ 作为 `Fact` **引用**。
  - 🔴 **人工裁决（2026-09-19，项目负责人）**：**选择读法 ③**。**`ADJ-01 = CLOSED / DERIVED`**。
  - **关闭依据**：**`D-027` + `D-049`** ——
    - `D-027` 第 ⑤ 项要求保留三类来源语义（**历史条件值 = `Fact` / `Extraction` 引用；AI 建议保持某条件 = `Inference`；用户本人明确指定保持某条件 = 用户 `Fact`**），故该 `Fact` 通道**必须存在**，**读法 ① 被排除**；
    - `D-049` 要求 **⑤ 本身只读**、**不得提供 ⑤ 的直接编辑入口 / 用户输入框 / 并列用户条目 / `Hypothesis` 内的"保持条件"编辑入口**，故**读法 ② 被排除**（读法 ② 需为 ⑤ 增设用户输入位，与只读集冲突）；
    - 因此唯一自洽读法 = **读法 ③** —— 该 `Fact` **只在 `Formal Attempt` 层表达**，`Hypothesis` 第 ⑤ 项**只引用 / 展示**它。
  - **关闭结论**：**用户本人指定的第 ⑤ 项"保持条件"只从 `Formal Attempt` 中已有的用户 `Fact` 获得；`Hypothesis` 第 ⑤ 项本身保持只读并引用该 `Fact`。**
  - **唯一输入落点**：`Formal Attempt` 层 —— 用户在 `Formal Attempt` 中明确写入 / 补充「下一轮保持 X 不变」或等价内容，该内容**保存为用户 `Fact`**。
  - **`Hypothesis` 第 ⑤ 项允许**：**引用**该既有 `Formal Attempt` 中的用户 `Fact`、**展示**该 `Fact`、在符合既有规则时把它作为"保持条件"的**事实来源**。
  - **`Hypothesis` 第 ⑤ 项不得**：**在 `Hypothesis` 内创建新的用户 `Fact`**；**就地修改原 `Fact`**；**把 AI `Inference` 改成 `Fact`**；**把 `Fact` 与 AI `Inference` 合并成混合来源**。
  - **用户在看到 `Hypothesis` 之后才决定"要保持某条件"时的合法流程**：**回到相关 `Formal Attempt` → 增加 / 修改对应用户 `Fact` → 显式发起重新检索 / 重新生成**（**属既有重跑路径，不是 `D9` 新增步骤**）。
  - **本次关闭不新增**：❌ `Decision ID`；❌ `D-050`；❌ `Hypothesis` 新状态；❌ `Hypothesis` 第 ⑤ 项编辑通道；❌ 新引用体系；❌ 新来源类型；❌ 新状态回退机制；❌ 新版本历史。
  - **本项性质**：**属已有 `CONFIRMED` Decision（`D-027` + `D-049`）的组合解释闭合** —— **不创建 `D-050`**、**不改变 `D-027`**、**不改变 `D-049`**、**不新增产品机制**。
  - **边界**：**本项不改变 `D-027` 一字**；**不构成本 Decision 的阻塞项**；**若人工判定读法 ②，则必须补独立 `Decision ID` 并同步契约 §2.3 / §8.6**（**本次裁决为读法 ③，故不适用，无需新增 `Decision ID`**）。
  - **验收归属**：`09_TEST_PLAN.md` **`AC-101`–`AC-106`** + **本节关闭顺延新增的 `AC-107` / `AC-108`**（详见 `09_TEST_PLAN.md`）。

- **主要放弃方案**：**「允许用户直接编辑 `Hypothesis` 核心内容，并在内容修改后将 `decision_state` 自动退回 `undecided`」**（= §K.3 方案 A）。
- **放弃原因**：
  1. **新增状态回退机制**；
  2. **新增内容性字段判定**；
  3. **新增验收与事件留痕复杂度**；
  4. **V1 主链不依赖该能力**；
  5. **10 天开发窗口下收益不足以覆盖复杂度**。
  - 附（§K.3 已识别、本项一并记入）：方案 A **实质是把 `D-040` 对 `Insight` 的状态机扩展到 `Hypothesis`** → **须新建独立 `Decision ID` + 由 Integrator 修订契约 §12 第 3 项（Worker 禁改项）**；且"执行前改了假设"是**最常见动作**，会**频繁触发"改了就要重新点一次接受"的摩擦**；`Hypothesis` **不在 `Insight State Event` 覆盖范围**，留痕即新增产品层记录。
- **影响范围**：`docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（§2.3 / §8 新增 §8.6 / §9 / §12 新增第 19 项 / §13 新增 §13.5·§13.6 / §14 第 4 条 / §15）、`04_USER_FLOW.md`（用户对 `Hypothesis` 的可执行动作）、`05_DATA_MODEL.md`（`Inference` 与用户 `Fact` 分列；不新增版本 / 回退状态机）、`06_AI_CAPABILITIES.md`（A5：AI 不得自动改写用户 `Fact`）、`08_UI_SPEC.md`（①②③④⑤ 无直接编辑控件；⑥⑦⑧ 允许输入 / 替换；界面区分 AI 建议与用户内容）、`09_TEST_PLAN.md`（`AC-101`–`AC-106`）
- **日期**：2026-09-19
- **状态**：`CONFIRMED`

---

## D-050｜Level A 维度 `matched` 的严格语义重叠判据

- **Decision ID**：D-050（来源：**`S00-03`**；触发 = **`SP-03`**）
- **来源阶段**：**`S00-03｜技术架构与实现方案收敛`**（触发于 **`docs/architecture/04_RETRIEVAL_AND_COMPARISON.md` §D.2 的 `matched` 判据空档**，由 **`SP-03`** 实测暴露）
- **触发问题**：**`SP-03 RESULT = INCONCLUSIVE`**，并出现 **`matched_level_a_dimensions` 判定漂移** —— 同一套结构性 fixture 上，`related` 与 `uncompared` **完全稳定**，但 **`matched` 集合在 5/8 `CASE` 上随运行变化**（漂移方向 100% 过判、漏判 0）。**根因 = canonical 未定义「构成可比对重叠」的判据**：观测到**读法 α「同一件事」（严格）** 与 **读法 β「同一类事」（宽松）** 两种读法，6 个独立会话中 **4 个**至少在一处采用 β。
- **决策主题**：**Level A 单个维度在什么条件下才允许判定为 `matched`** —— 即"严格语义重叠"判据的正式定义。
- **备选方案**：
  - **方案 A｜严格语义重叠**（**最终采用**）：只有两侧表达「**相同的实质内容**」或「**语义等价的改写**」时才允许 `matched`。
  - **方案 B｜宽松类别重叠**（**放弃**）：只要属于**相同目标类型 / 方法类型 / 条件类型 / 现象类型**即可 `matched`。
- **最终结论**：**采用方案 A｜严格语义重叠。**
  - **允许判为 `matched` 的等价形式（穷尽列举）**：**① 同义改写**；**② 表述顺序不同但实质相同**；**③ 单位等价表达**；**④ 不改变实质含义的语言改写**。
  - **不足以构成 `matched` 的宽松命中（本身不充分）**：属于**同一类别** / 属于**同一主题** / 使用**同一参数类型** / 使用**同一指标名称** / **都在讨论同一种现象** / **都属于同一种技术大类**。
- **核心约束**：

  **一｜四维度的严格语义重叠判据（逐维度）**

  | 维度 | `matched` 的**必要语义条件** | 明确**不充分**（不得判 `matched`） | 例 |
  |---|---|---|---|
  | **`goal`**（目标） | 必须表达**相同或语义等价的**具体目标 / 待解决问题 | 仅"**都是优化目标**"不构成 `matched` | 「**降低颜色变化**」vs「**缩短干燥时间**」= **`compared_not_matched`** |
  | **`actual_attempt`**（方案 / 行动 / 技术对象） | 必须表达**相同或语义等价的**核心方案 / 行动 / 技术对象 | 仅"**都是干燥方法**"或"**都是模型训练方法**"不构成 `matched` | 「都是干燥方法」而具体做法不同 = **`compared_not_matched`** |
  | **`condition`**（条件） | 必须表达**相同或语义等价的**具体条件内容 | 仅因为二者**都属于"温度"**不得 `matched` | 「**50°C**」vs「**50 摄氏度**」= **`matched`**；「**50°C**」vs「**70°C**」= **`compared_not_matched`** |
  | **`actual_result`**（实际观察结果 / 现象 / 结论方向） | 必须表达**相同或语义等价的**实际观察结果 / 现象 / 结论方向 | 不得仅因为双方都谈论「**开裂**」或「**含水率**」就判 `matched` | 「**幻觉引用减少**」vs「**无效引用明显下降**」= **`matched`**；「**出现明显开裂**」vs「**无明显开裂**」= **`compared_not_matched`**；「**含水率仍偏高**」vs「**含水率达到要求**」= **`compared_not_matched`** |

  **二｜`unknown` 规则完全保持不变**
  - 任一侧 `presence_state = unknown` → **`uncompared`**；**不得**进入 `matched` / `compared_not_matched` 的语义判定；
  - **双方都 `unknown`：仍然不能 `matched`**（沿用 `TC-40` / `AC-22` / `D-025` —— **本项为既有规则的重申，不是新增规则**）。

  **三｜本 Decision 不改变的规则**
  不得借 `D-050` 改变：**Level A 仍只有四维度**；**Level B / Level C 定义**；**`D-019`**；**`D-020`**；**`D-025`**；**`D-037`**；**`TQ13` / `TQ14` 当前"不引入"结论**；**数值相似度禁令**；**`Project` 不得作为准入过滤**；**`unknown` 不参与比较**；**`Fact` / `Extraction` / `Inference` 边界**；**`TQ04` 仍属 Gate B**；**`R-A` 仍只是 `PROPOSED`**。

  **四｜本 Decision 尤其不得新增（明确记账）**
  ❌ **≥2 个维度命中门槛**；❌ **"必须命中 `goal`"**；❌ **权重**；❌ **`similarity score`**；❌ **`confidence`**；❌ **`rank score`**；❌ **百分比**；❌ **等级**。

  **五｜本 Decision 的射程边界**
  - `D-050` **只定义**："**单个 Level A 维度何时叫 `matched`**"。
  - **`S03-D` 的** `matched_level_a_dimensions` **非空 → `related`**（即"准入 = 命中维度集合非空"）**仍属 `S03-D` / Integrator 的架构收敛项**，**本 Decision 不改变、不升级、不 `CONFIRM`**。
  - **不得把未由本次人工决策确认的其它 `PROPOSED` 内容升级为 `CONFIRMED`。**

- **主要放弃方案**：**「宽松类别重叠 —— 只要属于相同目标类型 / 方法类型 / 条件类型 / 现象类型即可 `matched`」**（= 读法 β）。
- **放弃理由**：会使 ① **不同具体条件误判相似**（如 `50°C` vs `70°C`）；② **相反结果误判相似**（如"开裂" vs "无开裂"）；③ **Level A 相关集合膨胀**；④ **⑦ 出现不真实相似点**；⑤ **可解释性下降**。
- **影响范围**：`docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（`v0.2.3` → **`v0.2.4 DRAFT / D-050 对齐版`**；新增 §9.4 + §12 第 6 项同步 + §13.5 关闭登记 + §15）、`docs/06_AI_CAPABILITIES.md`（**仅同步 A3 的 Level A 维度判定输出口径与红线**）、`docs/09_TEST_PLAN.md`（**顺延新增 `AC-109`–`AC-115`，未重排任何旧编号**）。
- **编号说明（避免与 `ADJ-01` 混淆）**：**本 `D-050` 与 `ADJ-01` 无关**。`ADJ-01` 为 `D-027` 第 ⑤ 项落点的**派生关闭项**，**永久不占用任何 `Decision ID`**（见本文件《`D-049`》内《邻接语义（✅ 已关闭 / 派生）》）。各文档中「**`ADJ-01` 的关闭不创建 `D-050`**」的表述**继续有效**，属 **`ADJ-01` 关闭当时的历史表述**（**`ADJ-01` 本身未创建任何 `Decision`**）；**`D-050` 这一编号其后由本 Decision（Level A `matched` 判据）占用**。
- **日期**：2026-09-19
- **状态**：`CONFIRMED`

- 🟢 **追加（2026-09-24，`GATE B LANDING`；🔴 **`D-050` 本体一字未改**）**：上文「**三｜本 Decision 不改变的规则**」中「**`TQ04` 仍属 Gate B**；**`R-A` 仍只是 `PROPOSED`**」= **`D-050` 落盘时点（2026-09-19）的表述**。**当前有效口径**：`TQ04` 已由 **`D-061`** 最终裁决 = **`R-A`**（`CONFIRMED`，`Source = Gate B Final Human Confirmation`）。
  - 🔴 **`D-050` 的射程与判据完全不变** —— 仍**只定义"单个 Level A 维度何时才允许判 `matched`"**（+ `unknown` 拦截规则）；
  - 🔴 **上句「不得借 `D-050` 改变 `TQ04`」的规范含义继续有效** = **不得把 `TQ04` 记为 `D-050` 的裁决结果**；`TQ04` 的裁决**只能由 `D-061` 承接**；
  - 🔴 **不得**据此把 `D-050` 写成"已裁决 `TQ04`"。

- 🟢 **追加（2026-09-20，`D-051` / `D-052`｜POST-INTEGRATOR 人工裁决）**：本章节在 `D-050` 之后**续接新增** **`D-051`｜显式重新生成时保留旧产物并按生成批次区分"当前 / 较早"结果** 与 **`D-052`｜「调整热风参数」与「调整送风参数」不构成 Level A `actual_attempt` `matched`**（**来源 = `20_INTEGRATION/S00-03_技术决策包.md` §R 的 `DR-01` / `DR-02`；由项目负责人人工裁决**）。
  - **人工选择**：`DR-01` → **方案 C（收窄版）**；`DR-02` → **方案 B**。
  - **`D-051` / `D-052` 与 `D-049` / `D-050` 无关**；**不改变 `D-049` / `D-050` 一字**；**不改变 `ADJ-01` 的 `CLOSED / DERIVED` 状态**；**不重开 `S00-01` / `S00-02`**。
  - **不 `CONFIRM` `TQ01`–`TQ05`**；**不执行 `SP-01`**；**不进入 Gate B**；**不做技术选型**；**不编码**。

---

## D-051｜显式重新生成时保留旧产物，并按生成批次区分「当前生成结果」与「较早生成结果」

- **Decision ID**：D-051（来源：**`S00-03`**；触发 = **`20_INTEGRATION/S00-03_技术决策包.md` §R `DR-01`**）
- **来源阶段**：**`S00-03｜技术架构与实现方案收敛`**（POST-INTEGRATOR 人工裁决；**不属 `S03-A`–`S03-E` 任一 Worker 产出**）
- **触发问题**：**`DR-01`** —— 用户在 `Gate B` 之后**显式发起「重新检索 / 重新生成」**时，**旧 `Insight`（`candidate` 或 `accepted`）与旧 `Hypothesis` 应当如何处理**？
- **决策主题**：**⑧ / ⑨ 步「显式重新生成」的产物语义** —— 新旧结果的关系、旧结果的保留与展示、以及这是否构成版本系统。
- **备选方案（`DR-01` A / B / C，原文口径）**：
  - **方案 A｜替换**：旧产物被新的替代，界面上只保留最新一份；**旧 `accepted Insight` 随之退出经验区**。
  - **方案 B｜并存**：同一 `Attempt` 可存在**多条 `Insight`** / 多组 `Hypothesis`，**全部保留并列出**，各自独立裁决。
  - **方案 C｜并存但分层**：最新一份为"当前有效"，其余**折叠为"更早的候选经验"**，可展开查看。
- **人工选择**：**选择 C，但采用「收窄版 C」**。
- **最终结论（收窄版 C）**：**显式重新生成时保留旧产物，并按「生成批次」区分「当前生成结果」与「较早生成结果」**。

  **一｜触发前提与产物归属**
  1. 仅当**用户显式发起重新生成**（`Insight` / `Hypothesis`）时，本次新生成的一批结果成为 **「当前生成结果」**。
  2. 此前生成的 `Insight` / `Hypothesis`：**不得被删除**；**不得被新结果覆盖**；**不得因重新生成自动发生状态迁移**。

  **二｜较早生成结果的展示口径**
  3. 较早生成结果**默认折叠**，**用户仍可展开查看**。
  4. 统一称 **「较早生成结果」**。
  5. 🔴 **禁止称谓**：**「旧版本」/「历史版本」/「第 N 版」/「更早的候选经验」**。
     - **理由**：较早 `Insight` **可能已经是 `accepted`** —— **不得把 `accepted` 重新叫成 `candidate` / 候选**。

  **三｜旧 `Insight` 原状态必须保持**
  6. `candidate` → **仍 `candidate`**；`accepted` → **仍 `accepted`**；`rejected` → **仍 `rejected`**。
  7. 重新生成**不得自动**产生：`accepted → candidate`；`accepted → rejected`；`accepted → hidden`；`accepted → revoked`。

  **四｜已 `accepted` 的较早 `Insight` 仍遵循既有 `Experience Asset` 规则**
  8. **已 `accepted` 的较早 `Insight` 仍然是 `accepted Insight`**，因此**继续遵循既有规则**：**`Experience Asset` = `accepted Insight` 的视图**（`D-015` / `D-009` 口径不变）。
  9. **只有用户依据既有 `revoke` 机制显式撤销后**，才退出 `accepted` / `Experience Asset`（`D-039` 不变）。
  10. **「较早生成」不得成为自动撤销 `accepted` 的理由。**

  **五｜旧 `Hypothesis` 的 `decision_state` 保持**
  11. `undecided` / `accepted` / `rejected` **不得因新一轮生成自动改变**。
  12. 新生成的 `Hypothesis` **使用自身新的 `decision_state`**；**不得继承旧 `Hypothesis` 的 `accepted` / `rejected`**。

  **六｜「当前生成结果」的语义边界（不得产生等级语义）**
  13. **「当前生成结果」仅表示：本次最新显式生成得到的结果组。**
  14. 🔴 **它不表示**：**真值更高** / **证据更强** / **`accepted`** / **`Experience Asset`** / **已确认** / **更可靠**。**不得产生任何等级语义**。

  **七｜较早结果不得自动成为新 `Hypothesis` 的推理输入**
  15. **较早 `Hypothesis`**：**不得仅因为仍然存在，就自动作为新一轮 `Hypothesis` 的推理输入。**
  16. **较早 `accepted Insight`**：是否在其它流程中作为 `Experience Asset` 被正常使用，**继续遵循既有 `accepted Insight` 规则** —— **`D-051` 不作特殊禁止**。

  **八｜重新检索 ≠ 自动重新生成（沿用 `D-045`）**
  17. **重新检索 ≠ 自动重新生成 `Insight` ≠ 自动重新生成 `Hypothesis`**（`D-045` 口径不变）。
  18. **不得建立**"重新检索后自动级联重建 ⑧ / ⑨"的机制。

  **九｜`D-051` 不建立版本系统（明确记账）**
  19. 🔴 **明确禁止**：**`version number`**；**`generation version number`**；**版本列表**；**版本比较**；**版本回滚**；**「第 N 次生成」产品计数**；**修改次数**；**`diff`**；**`restore old version`**。
  20. **「当前 / 较早」只是展示与生成批次关系**，**不是版本管理功能**。

- **核心约束**：
  **一｜不改变既有规则（逐项记账）**：**`D-039` revoke**；**`D-040` `Insight` semantic edit → `candidate`**；**`D-041` `Hypothesis` 不直接成为 `Experience Asset`**；**`D-042` `Model Suggestion` 保存 ≠ 接受**；**`D-043` archive**；**`D-045` `retrieval rerun`**；**`D-049` `Hypothesis` 编辑边界**；**`ADJ-01`**；**`D-050`**；**`Fact` / `Extraction` / `Inference` 边界**。
  **二｜与 `D-040` 的边界（🔴 不得混同）**：`D-040` 的「**用户直接修改同一 `Insight` 内容**」与 `D-051` 的「**显式重新生成产生新的结果**」**是两个不同事件**；**不得混为「重新生成 = semantic edit」**；**不得用 `D-051` 触发 `D-040` 的退回 `candidate` 机制**。
  **三｜与 `D-045` 的边界**：`D-051` **不新增触发条件**；重新检索仍须**由用户显式发起**；**不产生后台 / 异步 / 批量 / 定时检索**。
  **四｜与 `D-049` 的边界**：`D-051` **不改变** `Hypothesis` 的编辑边界（①②③④⑤ 只读 / ⑥⑦⑧ 用户 `Fact` 与 AI `Inference` 分列）；**不建立** `Hypothesis` 内容修改状态机 / 版本历史 / 内容修改事件日志 / 新状态枚举。

- **主要放弃方案**：
  - **`DR-01` 方案 A｜替换**（旧产物被替代，旧 `accepted Insight` 随之退出经验区）—— 与 `D-043` `F-3`（**不得自动改写既有结论**）的精神存在张力。
  - **`DR-01` 方案 B｜不加收窄的并存** —— 逼近 `D-022`（**第 ⑧ 步是唯一生成时机**）与"**不得产生候选待办池**"的边界，可能演化为"建议流 / 待办池"、削弱"经验资产"语义、并使 `N_引用` 归属不清。
  - **`DR-01` 方案 C 的未收窄形态**（"当前有效 / 更早的候选经验"这一**候选式**称谓）—— 会把可能已是 `accepted` 的 `Insight` 重新叫成"候选"，**与 `Experience Asset` 语义冲突** ⇒ **本 Decision 采用收窄版 C，统一称「较早生成结果」**。
- **影响范围**：`docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（`v0.2.4` → **`v0.2.5 DRAFT / D-051+D-052 对齐版`**；新增 **§2.4** / **§9.5**、**§8.6 第 9 条**、**§9 第 ⑧ / ⑨ 步行**、**§12 新增第 20 项**、**§13.5** 关闭登记、**§14 / §14.1 / §15**）、`docs/03_V1_SCOPE.md`、`docs/04_USER_FLOW.md`、`docs/05_DATA_MODEL.md`、`docs/06_AI_CAPABILITIES.md`、`docs/08_UI_SPEC.md`、`docs/09_TEST_PLAN.md`（**顺延新增 `AC-116`–`AC-123`**）、`docs/CHANGELOG.md`
- **编号说明**：**`D-051` 与 `ADJ-01` / `Q16` 均无关**；**不改变 `D-049` / `D-050` 一字**；**不重开 `S00-01` / `S00-02`**。
- **日期**：2026-09-20
- **状态**：`CONFIRMED`

---

## D-052｜「调整热风参数」与「调整送风参数」不构成 Level A `actual_attempt` `matched`

- **Decision ID**：D-052（来源：**`S00-03`**；触发 = **`20_INTEGRATION/S00-03_技术决策包.md` §R `DR-02`**）
- **来源阶段**：**`S00-03｜技术架构与实现方案收敛`**（POST-INTEGRATOR 人工裁决；**不属 `S03-A`–`S03-E` 任一 Worker 产出**）
- **触发问题**：**`DR-02`** —— `CASE-05.actual_attempt` 的一对取值「**调整热风参数**」vs「**调整送风参数**」，在 `D-050` 下应判 **`matched`** 还是 **`compared_not_matched`**？
- **决策主题**：**`D-050` 的严格语义重叠规则在 `actual_attempt` 维度上的具体边界** —— **同一参数族 / 技术类别 ≠ 语义等价**。
- **备选方案（`DR-02` A / B / C，原文口径）**：
  - **方案 A｜`matched`**：视为"语义等价的改写"（同一核心行动「调整干燥设备的送风参数」的不同表述）。
  - **方案 B｜`compared_not_matched`**：视为"同一参数类型但取值 / 对象不同"（依 `D-050`「同一参数类型不充分」）。
  - **方案 C｜不裁决该 fixture**，并从 `CASE-05` 的断言中移除该维度（仅保留硬预期命中的 `actual_result`）。
- **人工选择**：**选择 B**。
- **最终结论**：**在 `D-050` 的严格语义重叠规则下，「调整热风参数」vs「调整送风参数」判定 = `compared_not_matched`；不得判 `matched`。**
- **理由**：**「热风参数」与「送风参数」属于可区分的具体技术对象 / 参数对象**。**仅因为**：① 都属于**干燥参数**；② 都涉及**送风 / 热风系统**；③ 都属于**参数调整行为**；④ 属于**同一技术类别** —— **不足以构成「相同实质内容」或「语义等价改写」**。
- **对 `D-050` 的意义**：本项用于**进一步明确 `D-050`** —— **同一参数族 / 技术类别 ≠ 语义等价**。**不改变 `D-050` 的判据本体**，只**追加一条 `actual_attempt` 维度的明确负例**（落点 = 契约 §9.4）。
- **核心约束**：
  **一｜对 `CASE-05` 的精确影响**
  - `CASE-05.actual_attempt`：「调整热风参数」vs「调整送风参数」→ **`compared_not_matched`**。
  - **但 `CASE-05.actual_result` 已有独立 `matched`** ⇒ **`CASE-05` 的 `related = true` 保持不变**（`DR-02` **不会翻转 `CASE-05` 的 `related`**）。
  - `D-052` **只意味着**：**⑦ 的相似点中，不得把这两个 `actual_attempt` 呈现为**「**方案相同**」/「**行动相同**」/「**技术方案相似**」。
  **二｜`compared_not_matched` 继续按既有技术口径**
  **纯内部判定量**；**不显示数值**；**不形成负面等级**；**不计数**；**不参与相关性评分**；**不产生 `similarity score`**（`S03-D` 既有口径不变）。
  **三｜不新增任何机制**
  ❌ 不新增维度；❌ 不新增门槛；❌ 不引入权重 / 分数 / `confidence` / 百分比 / 等级；❌ 不 `CONFIRM` `TQ04`；❌ 不 `CONFIRM` `R-A`。
- **用户可感知影响**：**⑦ 中不显示该 `actual_attempt` 相似点**（该维度落入 `compared_not_matched`，为纯内部量、不发布）。
- **主要放弃方案**：
  - **`DR-02` 方案 A｜判 `matched`** —— 与 `D-050` 的**严格语义重叠**取向存在张力；会为 `D-050` 打开一条"**同类但对象不同仍可判 `matched`**"的口子，**可能被其它 fixture 引用为宽松先例**。
  - **`DR-02` 方案 C｜不裁决该 fixture、从 `CASE-05` 断言中移除该维度** —— 可立即解除 `TE-130` 挂起，但**放弃一条边界覆盖**，`D-050` 在该处的空档**仍然存在**。
- **影响范围**：`docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（**§9.4 追加 `actual_attempt` 负例**；`v0.2.4` → **`v0.2.5 DRAFT / D-051+D-052 对齐版`**）、`docs/06_AI_CAPABILITIES.md`（A3 判定行为追加负例）、`docs/08_UI_SPEC.md`（⑦ 不显示该相似点）、`docs/09_TEST_PLAN.md`（**顺延新增 `AC-124`–`AC-126`**）、`docs/CHANGELOG.md`
- **明确不改（记账）**：**不修改 `docs/architecture/04_RETRIEVAL_AND_COMPARISON.md`**（`S03-D` Worker 历史产出，**一字未动**；**`D-050` / `D-052` 的回写仍留 Local Landing**）；**不修改 `05_TEST_DEMO_DEPLOY.md` 中 `TE-130` 的历史 Worker 文本**（**新的 canonical 验收由新 `AC` 覆盖**）；**不修改 `AC-111`**（`actual_attempt` 的同类追加由新编号承接）。
- **编号说明**：**`D-052` 与 `ADJ-01` / `Q16` 均无关**；**不改变 `D-050` 一字**；**不重开 `S00-01` / `S00-02`**。
- **日期**：2026-09-20
- **状态**：`CONFIRMED`

---

## D-053｜V1 主架构改为 Local-first Harness-style Web App

- **Decision ID**：D-053（来源：**`S00-03`**；触发 = **项目负责人本轮人工架构决策**，非 AI 提议、非 Worker 产出、非 `DR-*` 报告）
- **来源阶段**：**`S00-03｜技术架构与实现方案收敛`**（**架构级人工决策**；不属 `S03-A`–`S03-E` 任一 Worker 产出）
- **决策主题**：**V1 主架构的承载形态** —— 由 **Cloud-centric Web App** 转为 **Local-first Harness-style Web App**。
- **备选方案（背景）**：
  - **原形态**：Cloud-centric Web App（云端承载 + 托管数据层；此前 `TQ01` 曾收敛为"必须有服务端 + 单体"，`TQ02` 曾收敛为托管 PostgreSQL）
  - **新形态**：**Local-first Harness-style Web App**
- **人工选择**：**选择新形态（Local-first）**。
- **最终结论**：**V1 采用 Web UI + Local Workspace Folder + Configurable LLM +（必要时）Thin LLM Access Layer + Vercel Demo / Review Deployment**：

```
┌─────────────────────────────┐
│        Vercel Web App       │
│  UI / Interaction / Demo    │
└──────────────┬──────────────┘
               │
        Browser Runtime
               │
      ┌────────┴─────────┐
      ▼                  ▼
Local Workspace     LLM Access Layer
Folder                   │
      │                  ▼
      ▼             LLM Provider
Attempt · Insight · Hypothesis · EvidenceRef
Workspace Metadata · Markdown / JSON
```

- **核心原则（全部属本 Decision 的正式结论）**：
  1. **用户科研主数据：Local-first**；
  2. **Workspace canonical：存在用户选择的本地目录**；
  3. **Vercel 是 Review / Demo Web Deployment Target**；
  4. **Vercel 不是科研主数据库**；
  5. **V1 不要求云 PostgreSQL**；
  6. **LLM：用户可配置**；
  7. **浏览器只有在用户主动授权后才能访问指定 Workspace**。
- **Web 的主要目的（明确记账）**：**让比赛评委可以方便打开、查看和体验产品**。**本项目当前不以长期运营 SaaS / 多人在线系统 / 云端科研数据平台作为 V1 目标。**
- **核心约束**：
  **一｜不改变既有产品机制（🔴 逐项记账）**：`D1`–`D10` / `R1`–`R6` / `D-011`–`D-052` / `ADJ-01` / `Q16` / `D9` 十步闭环 / `Attempt` / `Insight` / `Hypothesis` / `EvidenceRef` / `Fact`·`Extraction`·`Inference` / `Draft`·`Formal` / `Candidate Insight`·`accepted Insight` / `Experience Asset` / `Hypothesis` 8 字段 / archive 语义 / `D-049` / `D-050` / `D-051` / `D-052` / `Level A`·`Level B`·`Level C` / `N_检索`·`N_引用` / `History-grounded Hypothesis` —— **全部保持不变**。
  **二｜D-053 是技术承载方式改变，不是重新设计产品**：🔴 **不得以"改 Local-first"为理由重新打开任何已确认产品语义**。
  **三｜Vercel 的定位边界**：🔴 **不得写成 `Production SaaS Infrastructure`**；🔴 **不得写成"产品主数据存储平台"**；🔴 **不得因为 Vercel 可部署 Serverless Function 就自动引入云数据库 / 用户账号数据库 / 云端 Workspace / 服务端永久科研数据存储**。
  **四｜Local Workspace = V1 Primary Persistence**：🔴 **主数据存于本地 Workspace 文件，而不是 PostgreSQL**；**逻辑对象不变**（`Workspace` / `Project` / `Attempt` / `Insight` / `Hypothesis` / `EvidenceRef`），🔴 **不得因采用文件就把对象模型扁平化**；允许使用 **Markdown + JSON / sidecar metadata** 或其它合理本地文件表示；优先目标 = 人可读 / Git 友好 / Obsidian 友好 / 可迁移 / 可备份 / 可 diff。
  **五｜浏览器访问 Workspace**：主方向 = **用户点击「选择工作区」主动授权一个本地目录**；技术候选 = **File System Access API 或浏览器等价能力**；**目标浏览器优先 `Chrome` / `Edge`**；🔴 **不得假设 Safari / Firefox 所有浏览器均完整支持**。
  **六｜原 `SP-01a` 不再是当前 V1 的 Gate B 前置证据**：🔴 **立即停止其后续创建链**（见《影响范围》与 `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md` §O）。
  **七｜File System fallback 暂不自动决定**：可分析 Folder Import / ZIP Import·Export / File Upload / Local Companion Runtime，但 🔴 **不得自动 `CONFIRM`**；**只有 `SP-06` 证明主方案存在影响比赛演示的兼容性问题**，才提交 `DECISION REQUIRED`。
- **主要放弃方案**：
  - **维持 Cloud-centric Web App**（云端承载 + 托管 PostgreSQL）—— 需在线数据层作为 Gate B 前置证据，演示环境与成本纪律（免费额度优先）之间存在持续压力；且 **V1 的 corpus（用户本人结构化历史 `Formal Attempt`）规模小、字段结构化**，在线数据库并非必要。
  - **纯静态本地应用（无 Web 部署）** —— 不满足"让评委方便打开体验"的目标 ⇒ **Vercel 仍被保留为 Review / Demo 部署目标**。
- **影响范围**：
  - `docs/DECISIONS.md`（本条目 + 编号空间列举）；
  - `docs/07_TECH_ARCHITECTURE.md`（**架构基线重写**）；
  - `docs/03_V1_SCOPE.md` / `docs/04_USER_FLOW.md` / `docs/05_DATA_MODEL.md`（**新增 Persistence Mapping**）/ `docs/06_AI_CAPABILITIES.md` / `docs/08_UI_SPEC.md`（**新增 Workspace Entry**）/ `docs/09_TEST_PLAN.md`（**顺延新增 `AC-127`–`AC-138`**）；
  - `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（**`v0.2.5` → `v0.2.6 DRAFT`**）；
  - `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md`（**新增**）；`20_INTEGRATION/S00-03_技术决策包.md`（**追加 Pivot 章节**）；
  - `30_SPIKES/local_first/SP-06_LOCAL_FIRST_FEASIBILITY_PLAN.md`（**新增，Plan only**）；
  - `docs/CHANGELOG.md`。
- **对 `TQ01`–`TQ05` 的影响**：**重新基线**（`TQ01` / `TQ02` 的主要候选空间被取代、余项转 Integrator 收敛；`TQ05` 的 Vercel 定位确认、可行性待 `SP-06`）。🔴 **五项均未 `CONFIRM`**。
- **明确不改（记账）**：🔴 **不修改** Worker 历史产出 `docs/architecture/01`–`05`（**标注为 `PRE-D-053 HISTORICAL ANALYSIS`，一字未改**）；🔴 **不修改** `SP-03` / `SP-03R`；🔴 **不删除** `SP-01a_*` 文档与 `30_SPIKES/sp01a_probe/`（**仅登记其被 supersede**）；🔴 **不删除任何云资源**。
- **编号说明**：**`D-053` 与 `ADJ-01` / `Q16` 均无关**；**不改变 `D-050` / `D-051` / `D-052` 一字**；**不重开 `S00-01` / `S00-02`**。
- **日期**：2026-09-24
- **状态**：`CONFIRMED`

---

## D-054｜V1 RAG 范围 = 仅 Structured Experience RAG（`ResearchContextProvider` 仅预留）

- **Decision ID**：D-054（来源：**`S00-03`**；触发 = **项目负责人本轮人工架构决策**）
- **来源阶段**：**`S00-03｜技术架构与实现方案收敛`**
- **决策主题**：**V1 的 RAG 边界** —— 是否引入「文献 / 论文 / PDF 知识库 RAG」。
- **备选方案（背景）**：
  - 方案 A／B：引入 Research Document RAG（PDF 文献、论文知识库、文献向量索引、文献检索 UI 等，程度递增）
  - **方案 C：只实现 Structured Experience RAG**（**人工选择本方案**）
- **人工选择**：**选择方案 C**。
- **最终结论**：**V1 只实现 `Structured Experience RAG`** —— 即：

```
Structured Experience RAG
  = 基于用户自身历史 Attempt 的结构化经验检索
  + 证据上下文组装
  + Grounded Generation
```

  **同时**：**在技术架构中预留 `ResearchContextProvider` 扩展接口**。
- **正式定义（本 Decision 的架构表述）**：`Structured Experience RAG` **不是新增产品流程**，而是**现有 `D9` 的 ⑥ Retrieval / ⑦ Comparison / ⑧ Candidate Insight / ⑨ Hypothesis / ⑩ Evidence Traceability 在技术架构中的正式描述**：

```
Current Formal Attempt
        ↓
Experience Retriever
        ↓
Relevant Historical Formal Attempts
        ↓
Evidence / Comparison Context Builder
        ↓
Grounding Context Pack
        ↓
LLM
        ↓
Candidate Insight
        ↓
Hypothesis
        ↓
EvidenceRef
```

- **V1 明确不实现（🔴 OUT OF V1，逐项）**：
  - PDF 文献 RAG；
  - 论文知识库；
  - 文献上传；
  - PDF parser；
  - document chunking；
  - document embedding；
  - 文献向量索引；
  - 文献检索 UI；
  - 外部科研资料 citation UI；
  - **Research Document RAG**。
- **门槛条款（🔴 硬约束）**：**未来如需要实现上述任一能力，必须重新进入 `Scope` / `Decision`**；🔴 **不得因为项目"偏科研"就偷偷把论文 RAG 加入当前 V1**。
- **核心约束**：
  **一｜corpus 不扩大**：V1 Experience Retrieval **必须严格沿用既有规则**；主要检索 corpus = **符合既有规则的历史 `Formal Attempt`**；🔴 **不得因为命名为 RAG 就扩大 corpus**。`Draft` **不进入 `N_检索`**；archived 按已有规则**排除新默认 retrieval / grounding / `N_检索`**；🔴 **不得把 Research Documents / Web Search / 模型一般知识计入 `N_检索`**；🔴 **不得因为 `accepted Insight` 存在就自动改变当前 Retrieval admission**。
  **二｜`ResearchContextProvider` 只预留，不实现**：架构层**允许定义**概念接口 `ResearchContextProvider.getContext(query)`；🔴 **V1 不实现任何 provider**；🔴 **不建立** `references/` / PDF import / PDF parser / chunk store / embedding store / research search / literature citation / paper viewer；🔴 **UI 不得增加**「上传论文」「知识库」「文献库」「论文问答」；🔴 **不得增加对应 P0 `AC`**；🔴 **不得增加正式数据实体** `ResearchDocument` / `Chunk` / `Citation`（除非仅作 architecture future-extension note 并明确标注 `NOT V1` / `NOT IMPLEMENTED` / `NO USER-VISIBLE BEHAVIOR`）。
  **三｜🔴 RAG ≠ Vector RAG**：V1 **不因使用 RAG 自动引入** Pinecone / Milvus / Weaviate / Chroma / pgvector / Elasticsearch / Redis Vector / embedding database；🔴 **不得通过 `cosine similarity score` 替代 `D-050` 的严格 `matched` 语义**；若未来 `TQ04` 选择 embedding，**也只能作为符合现有产品规则的技术辅助**，🔴 **不得改变** `Level A admission` / `D-050` / `N_检索` / ⑦ 呈现语义。
  **四｜D-054 不改变 History-grounded 定义**：`History-grounded Hypothesis` **继续要求至少一个真实 historical `Formal Attempt` 作为 grounding anchor**；🔴 **未来 Research Document 即使存在，也不能单独让一个 Hypothesis 成为 `History-grounded Hypothesis`**；🔴 **不改变** `D-030` / `D-035` 及对应现有规则。
  **五｜科研上下文的未来分层（仅架构说明，不实现）**：
  ```
  Layer 1 : User Fact
  Layer 2 : Experience Evidence  = Historical Attempt
  Layer 3 : Research Evidence    = future ResearchContextProvider   ← RESERVED ONLY
  Layer 4 : Model General Knowledge

  当前 V1 实际启用：Layer 1 / Layer 2 / Layer 4
  ```
  🔴 **即使未来实现 Layer 3，Research Evidence 也不得自动计入** `N_检索` / `History-grounded Hypothesis` / `Experience Asset`，**除非未来另行 Decision**。
- **`TQ04` 不受本 Decision 影响**：🔴 **本 Decision 不 `CONFIRM` `TQ04`**、🔴 **不 `CONFIRM` `R-A` / `R-B` / `R-C`**；🔴 **不得因为产品叫 RAG 就认为 embedding 路线必须胜出**；**`R-A` 仍为 `PROPOSED` 推荐**（见 Pivot 文档 §H.3）。
- **主要放弃方案**：
  - **引入 Research Document RAG（方案 A / B）** —— 会引入 PDF parser / chunking / embedding / 向量索引 / 文献 UI 等大量能力，直接冲击 V1 范围控制与开发周期；且**与"优先保证核心流程完整、稳定、可运行、可在线演示"的赛题要求无关**。
- **影响范围**：`docs/DECISIONS.md`（本条目）、`docs/06_AI_CAPABILITIES.md`（`A3` 补架构术语 **Structured Experience Retrieval**；`A4`/`A5` 补 **Grounded Generation**；🔴 **产品层仍称「相似历史经验检索 / 经验提炼 / 假设孵化」**）、`docs/03_V1_SCOPE.md`、`docs/04_USER_FLOW.md`、`docs/05_DATA_MODEL.md`、`docs/08_UI_SPEC.md`、`docs/09_TEST_PLAN.md`（**顺延新增 `AC-139`–`AC-143`**）、`docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（`v0.2.6 DRAFT`）、`20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md`、`docs/CHANGELOG.md`。
- **编号说明**：**`D-054` 与 `ADJ-01` / `Q16` 均无关**；**不改变 `D-050` / `D-051` / `D-052` / `D-053` 一字**；**不重开 `S00-01` / `S00-02`**。
- **日期**：2026-09-24
- **状态**：`CONFIRMED`

- 🟢 **追加（2026-09-24，`GATE B LANDING`；🔴 **`D-054` 本体一字未改**）**：上文「**`TQ04` 不受本 Decision 影响**……**`R-A` 仍为 `PROPOSED` 推荐**」= **`D-054` 落盘时点的表述**。**当前有效口径**：`TQ04` 已由 **`D-061`** 最终裁决 = **`R-A`**（`CONFIRMED`，`Source = Gate B Final Human Confirmation`）。
  - 🔴 **上句「本 Decision 不 `CONFIRM` `TQ04`」在逻辑上仍然成立** —— `D-054` 与 `D-061` 是**两个不同 Decision**；
  - 🔴 **`R-A` 的合法依据只能是 `D-061`**，🔴 **不是 `D-054`**；
  - 🔴 **`D-054` 的全部实体结论一字不变、继续有效**（Out of V1 清单 / corpus 不扩大 / `ResearchContextProvider` 仅预留 / `RAG ≠ Vector RAG` / `History-grounded` 定义 / Layer 3 `RESERVED ONLY`）。

---

## D-055｜LLM 请求网络路径 = Provider-dependent Hybrid（按 Provider Adapter 能力决定）

- **Decision ID**：D-055（来源：**`S00-03`**；触发 = **项目负责人本轮人工裁决**，关闭 `20_INTEGRATION/S00-03_技术决策包.md` / 契约 §13.7 的 **`DR-03`（LLM Request Path）**）
- **来源阶段**：**`S00-03｜技术架构与实现方案收敛`**（**架构级人工决策**）
- **决策主题**：**V1 中 LLM 请求的网络路径** —— 浏览器直连、服务端 Thin Proxy、还是按 Provider 能力混合。
- **备选方案（背景）**：
  - **A**｜`Browser Direct` —— 浏览器直接调用 LLM Provider
  - **B**｜`Vercel Thin Proxy` —— 请求经 Vercel Serverless Function 转发
  - **C**｜`Provider-dependent Hybrid` —— 按 Provider 能力混合（部分可直连、部分需代理）
- **人工选择**：**选择 C（Provider-dependent Hybrid）**。
- **最终结论**：**不同 Provider 可根据其技术能力采用不同网络路径**；**允许** `A` `Browser Direct` 与 `B` `Vercel Thin Proxy` 两种形态**并存**。
- **核心约束（全部属本 Decision 的正式结论）**：

  **一｜路径由 Adapter 能力决定，不由用户每次手工选择**
  - 🔴 **不是**"用户每次手工选择 direct / proxy"；**路径必须由 `Provider Adapter Capability` 决定**；
  - 🔴 **不得设计成随机切换 / 逐请求提示用户选择路径**。

  **二｜`Browser Direct` 的适用条件与路径**
  - **适用条件（须同时满足）**：① Browser CORS 可用；② Browser API 调用被官方支持 / 技术上稳定；③ 用户自己的 Credential 可以直接用于该 Provider；④ **不需要产品服务器隐藏固定 server secret**；⑤ 不引入不可接受的安全问题；
  - **路径** = `Browser → LLM Provider`；
  - **用户 Credential 仅发送到用户明确配置的 Provider**；
  - 🔴 **不得经过 Vercel Proxy**（除非该 adapter 被明确配置为 Proxy path）。

  **三｜`Vercel Thin Proxy` 的适用条件与 `THIN` 边界**
  - **适用条件**：该内置 Provider 的 Browser Direct **不可行**，或 CORS / API 形态**要求服务端调用**；
  - **路径** = `Browser → Vercel Thin Proxy → Known LLM Provider`；
  - ✅ **Proxy 只允许承担**：request normalization / provider adapter forwarding / response normalization / timeout · error mapping / 必要的 schema transport；
  - 🔴 **Proxy 不得承担**：Workspace persistence / Attempt persistence / Insight persistence / Hypothesis persistence / Experience database / Cloud user database。

  **四｜Custom `Base URL` 的安全边界（🔴 硬约束）**
  - 对 **Custom / OpenAI-compatible / 用户自定义 `Base URL`**：**默认 = `Browser Direct Only`**；
  - **路径** = `Browser → 用户指定 Base URL`；
  - 🔴 **不得设计成** `Browser → Vercel → 用户任意 URL`；🔴 **禁止 `Generic Arbitrary URL Proxy`**；
  - 🔴 **Vercel Proxy 不得接受 client 提交的任意** `target_url` / `base_url` / `host` / `scheme` **并据其无条件代请求**；
  - **原因**：避免 **SSRF / Open Proxy / 云 metadata endpoint 访问 / 内网探测 / `localhost`·RFC1918 转发 / 协议滥用**。

  **五｜安全 Proxy 允许的形态（🔴 唯一形态）**
  - 若某内置 Provider 需要 Proxy ⇒ **必须通过 `provider_id` 选择服务器端已注册的 Adapter**；
  - **机制** = `provider_id → 固定 Adapter → 固定 / 严格受控 Provider Host`；
  - 🔴 **不得** `provider_id` + 任意 `target URL`；**允许**受控配置中的固定 host / 严格 allowlist host / 明确 Provider adapter endpoint；🔴 **不允许**用户通过请求参数修改 Proxy 最终目标 host。

  **六｜不可用 Provider 的处理**
  - 若 Custom `Base URL` **无法 Browser Direct** 且**没有安全的预定义 Proxy Adapter** ⇒ **正确行为 = 明确提示** `Provider connection unsupported under current browser constraints`；
  - 🔴 **不得偷偷走通用 Vercel Proxy**；🔴 **不得为了"支持所有 Provider"降低 SSRF / Proxy 安全边界**。

  **七｜与凭据的边界（解释闭合，不新增机制）**
  - 本 Decision **只定网络路径**；凭据的存储与传输边界由 **`D-056`** 承载；
  - 由本项第二 / 三条的适用条件（"不需要产品服务器隐藏固定 server secret"）+ `D-056`（凭据始终来自用户、session 级、Proxy 不得持久化）**共同推出**：🔴 **V1 不为任何 Provider 预置服务端固定 Key**；Proxy 只是传输通道，**不是 Key 持有方**。
- **主要放弃方案**：
  - **纯 `A`（全部 Browser Direct）** —— 不满足"部分 Provider 在浏览器侧不可行 / CORS 受限 / API 形态要求服务端调用"的现实约束 ⇒ 会直接削弱 V1 的可配置 Provider 覆盖度；
  - **纯 `B`（全部经 Vercel Thin Proxy）** —— 默认让每次 AI 调用都经过服务端中转，**增加一个数据可见方**、与 Local-first 的"数据在用户本地 / 最小必要传输"取向张力较大，且对可直连的 Provider 无收益；
  - **`B` + 用户任意 `base_url`（Generic Arbitrary URL Proxy）** —— 🔴 **触发 SSRF / Open Proxy**，**明确禁止**。
- **影响范围**：
  - `docs/DECISIONS.md`（本条目 + 编号空间列举）；
  - `docs/06_AI_CAPABILITIES.md`（`A1`–`A5` 的调用路径边界）；
  - `docs/07_TECH_ARCHITECTURE.md`（**§5.5 LLM 接入** 路径侧口径 + **§5.12（新增）**）；
  - `docs/08_UI_SPEC.md`（**Provider 连接失败的明确提示**；🔴 **不得出现"逐请求手工选择 direct / proxy"**）；
  - `docs/09_TEST_PLAN.md`（**顺延新增 `AC-144`–`AC-152`**）；
  - `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（**`v0.2.6` → `v0.2.7 DRAFT`**）；
  - `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md`（**§W 新增 + §U 就地补注**）；`20_INTEGRATION/S00-03_技术决策包.md`（**§U 新增**）；
  - `docs/CHANGELOG.md`。
- **对 `TQ01`–`TQ05` 的影响**：**`TQ03` 的"LLM Request Path"子项已裁决**；🔴 **但 `TQ03` 整体仍不 `CONFIRM`**（须结合 `SP-06` 实测证据与 Gate B）；🔴 **`TQ01` / `TQ02` / `TQ04` / `TQ05` 不受本 Decision 影响**。
- **编号说明**：**`D-055` 与 `ADJ-01` / `Q16` 均无关**；**不改变 `D-050` / `D-051` / `D-052` / `D-053` / `D-054` 一字**；**不重开 `S00-01` / `S00-02`**。
- **日期**：2026-09-24
- **状态**：`CONFIRMED`

---

## D-056｜LLM 凭据持久化 = Session-only Credential

- **Decision ID**：D-056（来源：**`S00-03`**；触发 = **项目负责人本轮人工裁决**，关闭 `20_INTEGRATION/S00-03_技术决策包.md` / 契约 §13.7 的 **`DR-04`（Credential Persistence）**）
- **来源阶段**：**`S00-03｜技术架构与实现方案收敛`**（**架构级人工决策**）
- **决策主题**：**用户配置的 LLM 凭据（API Key）应以何种方式持久化**。
- **备选方案（背景）**：
  - **A**｜`Session-only Credential` —— 仅当前浏览器会话级可用（**人工选择本方案**）
  - **B**｜browser-local persistence —— 浏览器本地持久化（如 IndexedDB / `localStorage`）
  - **C**｜其它 Web 可行安全方案
- **人工选择**：**选择 A（`Session-only Credential`）**。
- **最终结论**：**V1 不长期保存 API Key**。
- **核心约束（全部属本 Decision 的正式结论）**：

  **一｜允许与目标行为**
  - ✅ **允许** session-scoped browser storage，或**等价的当前浏览器会话级 `Credential Store`**；
  - **目标行为** = 用户输入 API Key → **当前会话可用** → **页面刷新后可继续当前会话** → **标签页 / 浏览器会话结束后清除**；
  - **技术实现**可使用 `sessionStorage` 或**等价的 session-scoped abstraction**。
  - 🟢 **口径说明（🔴 防误读）**：本项**不是**"纯内存、刷新即失效" —— **刷新后仍应在当前会话内可用**；**边界在"会话结束"**，不在"页面刷新"。

  **二｜🔴 禁止的存储位置（逐项）**
  - ❌ `localStorage`；❌ `IndexedDB`；❌ Workspace file；❌ Git；❌ Vercel KV；❌ Vercel DB；❌ Cloud DB；❌ server filesystem；❌ **permanent cookie**。

  **三｜Credential 传输**
  - **`Browser Direct` 时**：`Credential` 只从 `Browser → User-selected Provider`；🔴 **不得额外发送给 Vercel**；
  - **Proxy Provider 时**：`Credential` 走 `Browser → Thin Proxy → Known Provider`，**仅允许在当前请求生命周期中使用**；
  - 🔴 **Proxy 不得持久化 Credential**：不得写数据库 / 写文件 / 写 KV / 写 cache / 写 durable log；
  - 🔴 **不得把** `Authorization` / API Key / 完整 request body 中的 secret **写入** Vercel logs / application logs / error logs / analytics。

  **四｜Session 结束行为**
  - **tab / browser session 结束 ⇒ Credential 清除**；**重新进入产品 ⇒ 用户重新输入 Key**；
  - 这是**有意的 V1 Security Trade-off**；
  - 🔴 **不得自行增加**「记住我」/「Remember Key」/「永久保存 Credential」开关；**未来如需要，必须另行 Decision**。

  **五｜与既有凭据红线的边界（解释闭合，不新增机制）**
  - 本 Decision 的"禁止落盘"**同时覆盖**：我们产出的文件 / 仓库 / 报告 / 前端产物（既有用户级硬规则）**与** 用户浏览器自身的 `localStorage` / `IndexedDB` / 永久 cookie（本 Decision 新增禁止）；
  - 🔴 **唯一允许的会话级载体 = session-scoped storage（如 `sessionStorage`）或等价抽象**。
- **主要放弃方案**：
  - **`B` browser-local persistence** —— 会让**明文 / 半明文凭据长期落盘**，本机其它进程可读；与"凭据最小暴露"取向冲突；
  - **`C` 其它方案**（用户自管凭据文件 / 浏览器凭据管理器集成 / 短时令牌等）—— 实现成本更高，且**在 V1 开发周期内不必要**；🔴 **不得因未选 `C` 就放松本 Decision 的禁止清单**。
- **影响范围**：
  - `docs/DECISIONS.md`（本条目）；
  - `docs/06_AI_CAPABILITIES.md`（凭据生命周期边界）；
  - `docs/07_TECH_ARCHITECTURE.md`（**§5.5 凭据侧口径 + §5.12（新增）**）；
  - `docs/08_UI_SPEC.md`（**`Model Settings` 的凭据输入 / 会话级提示 / 无"记住我"开关**）；
  - `docs/09_TEST_PLAN.md`（**顺延新增 `AC-153`–`AC-162`**）；
  - `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（**`v0.2.7 DRAFT`**）；
  - `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md`（**§W 新增 + §U 就地补注**）；`20_INTEGRATION/S00-03_技术决策包.md`（**§U 新增**）；
  - `docs/CHANGELOG.md`。
- **对 `TQ01`–`TQ05` 的影响**：**`TQ03` 的"Credential persistence"子项已裁决**；🔴 **但 `TQ03` 整体仍不 `CONFIRM`**；🔴 **其余 `TQ` 不受影响**。
- **编号说明**：**`D-056` 与 `ADJ-01` / `Q16` 均无关**；**不改变 `D-050`–`D-055` 一字**；**不重开 `S00-01` / `S00-02`**。
- **日期**：2026-09-24
- **状态**：`CONFIRMED`

---

## D-057｜`SP-06` 部署验证与真实浏览器人工验收延期至提交前（Deployment Validation Deferral）

- **Decision ID**：D-057（来源：**`S00-03`**；**Source = 项目负责人本轮人工流程决策** —— 🔴 **非 AI 提议、非 Worker 产出、非 `DR-*` 缺陷报告**）
- **来源阶段**：**`S00-03｜技术架构与实现方案收敛`**（**Process / Architecture Execution Decision**）
- **决策主题**：`SP-06` 中尚未完成的「**Vercel 部署验证**」与「**真实浏览器目录权限生命周期人工观测**」，是否继续作为 `Gate B` / `Gate C` / 正式开发启动的**硬阻塞项**。
- **人工决策（项目负责人口径）**：「**部署问题后面再说，当前优先尽快完成 Gate B，进入开发阶段。**」
- **最终结论（三项，全部为本 Decision 的正式结论）**：
  1. 上述两类未完成项 **不再作为** `Gate B` / `Gate C` / 「正式开发启动」的**硬阻塞项**；
  2. 但它们 **仍然是 `PRE-SUBMISSION ACCEPTANCE` 的必做项**（提交前必须完成，🔴 **不是"可以不做"**）；
  3. 由此确立**允许的执行序列**：
     **`Gate B` → `Gate C` → `Coding` →（开发后 / 提交前）`Vercel Preview Deployment` + `Chrome / Edge` 真实 `Workspace` 验收**。
- **Deferred Acceptance 清单**：**`PSA-01`–`PSA-13`** —— 见 `20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md`（**状态 = `PLANNED` / `NOT EXECUTED`**）。
- **🔴 本 Decision 不得改写 `SP-06` 历史事实（逐条禁止）**：
  - `SP-06` 历史执行状态 **保持 `CONDITIONAL PASS`**（**历史描述性汇总**）；🔴 **不得改成 `PASS`**；
  - **7 项 `PENDING MANUAL OBSERVATION`**（`S6-01` / `S6-04` / `S6-05` / `S6-06` / `S6-08` / `S6-09` / `S6-10`）**一条都不得写成 `PASS`**；🔴 **不得伪造观测**；
  - 🔴 **不得删除**上述 7 个测试项（也不得删除 `S6-18` / `S6-19` 的 Vercel 侧未验证登记）；
  - 允许且**只允许**追加一段 **`CURRENT PROCESS DISPOSITION`**：
    `CORE ARCHITECTURE EVIDENCE = SUFFICIENT TO PROCEED TO GATE B` ／
    `DEPLOYMENT / BROWSER MANUAL ACCEPTANCE = DEFERRED TO PRE-SUBMISSION`；
  - 🔴 **`SP-06` 的 PASS / 实测结论仍不得写成对任何 `TQ` 的 `CONFIRM`**。
- **File System fallback：本轮不触发（`NO DECISION REQUIRED`）**：
  - **依据** = `SP-06` 已实测 Chrome **`154.0.8037.57`** / Edge **`153.0.4234.48`** 均 `isSecureContext = true`、`showDirectoryPicker` 存在；且 **Node / 文件系统层 read / write / update / reopen 已有正向证据**；
  - **只有**出现下列 **F1–F4** 之一，才升级 **`DECISION REQUIRED｜File System Fallback`**：
    **F1** `Vercel HTTPS` + 目标 Chrome/Edge 无法打开 picker；**F2** 真实浏览器不能完成 read + create + update；**F3** 正常刷新后无法通过恢复 / 重新授权继续工作；**F4** 比赛现场无法保证至少一个已验证浏览器；
  - 当前 🔴 **不触发** `Folder Import` / `ZIP Import·Export` / `File Upload` / `Local Companion Runtime` 的**任何新 Decision**。
- **Decision vs Acceptance 分离原则（本 Decision 的方法论结论）**：
  - `Gate B` 的问题是「**是否已有足够证据冻结 V1 技术架构、让开发开始**」，**不是**「是否已完成全部最终部署验收」；
  - 因此 🔴 **不得因为"Vercel 尚未部署"就阻止已有充分证据的 `TQ02` / `TQ03` / `TQ04` 进入最终 Gate B**；`TQ05` 允许「**目标平台与部署形态确认，最终部署验收后置**」。
- **🔴 `PSA-*` 不是产品 `AC`**：**不得写入 / 不得污染 `AC-01`–`AC-162`**；**`AC` 统一口径（2026-09-24 GATE-B PRE-CONFIRM CORRECTION 校正后）= 连续 canonical `AC` **162** 项（`AC-01`–`AC-162`）＋ 独立 `AC-Q06` **6** 项（`AC-Q06-1`–`AC-Q06-6`）＝ **全部有效验收点总数 168****；🔴 **本节不新增任何 `AC`**；🔴 **不再使用旧写法「`AC` 有效总数 = 162（`AC-01`–`AC-162` + `AC-Q06-1`–`6`）」**（该写法含算术矛盾）；🔴 **历史正确事实「`S03-E` 当时 115 + 6 = 121」保留不改**；`PSA-*` 属于 **Release / Submission Acceptance Checklist**。
- **不改变任何既有决策**：🔴 **不改变** `D-053` / `D-054` / `D-055` / `D-056` 一字；🔴 **不改变** `D1`–`D-052` / `ADJ-01` / `Q16`；🔴 **不重开** `S00-01` / `S00-02`。
- **对 `TQ01`–`TQ05` 的影响**：**无自动影响** —— `TQ01`–`TQ05` **仍全部未 `CONFIRM`**；其最终裁决仍须项目负责人在 **Gate B 的一次总确认**中给出。**本 Decision 不是对任何 `TQ` 的 `CONFIRM`**。
- **影响范围**：`docs/DECISIONS.md`（本条目 + 编号空间登记）；`20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md`（**新增**，`PLANNED` / `NOT EXECUTED`）；`30_SPIKES/local_first/SP-06/SP-06_EXECUTION_REPORT.md`（**仅追加 `CURRENT PROCESS DISPOSITION`**，**A–Q 原文一字未改**）；`20_INTEGRATION/S00-03_技术决策包.md` §V（Gate B Final Decision Package）；`20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md` §Y；`docs/09_TEST_PLAN.md`（**新增 D-057 护栏节；🔴 新增 `AC` = 0**）；`docs/CHANGELOG.md`。
- **编号说明**：**`D-057` 与 `ADJ-01` / `Q16` 均无关**；🔴 **不回写** Worker `01`–`05` 产出、`SP-03` / `SP-03R`、`SP-06` raw evidence、`SP-01a_*` 历史文档。
- **日期**：2026-09-24
- **状态**：`CONFIRMED`

---

## `D-058`｜`TQ01` Gate B 最终裁决：应用架构 / 技术运行形态

- **Decision ID**：`D-058`（来源：**`S00-03`**；**Source = Gate B Final Human Confirmation**）
- **来源阶段**：**`S00-03｜技术架构与实现方案收敛`**（**Gate B 最终裁决**）
- **人工确认**：项目负责人 **2026-09-24** 明确选择 **「A｜确认以上全部 Gate B 决策」**（承接 `B｜有修改后再确认` 的 PRE-CONFIRM CORRECTION 之后的最终确认）。
- **决策主题**：V1 应用架构 / 技术运行形态。
- **最终结论（人工 Decision 核心，🔴 不含任何实现参数）**：
  **`TQ01-FINAL` = Browser-heavy Local-first Web App + Optional Thin Server Layer**
  - **Browser 承担**：UI / Workspace access / local persistence / local retrieval / Structured Experience RAG orchestration / most application state；
  - **Thin Server Layer**：**可选**，**只在某 `registered provider adapter` 无法 `Browser Direct` 时存在**；
  - **Thin Server 不承担**：Workspace persistence / user database / `Attempt` storage / `Insight` storage / `Hypothesis` storage / Experience DB；
  - ⇒ **不是传统 Backend-centric 架构**（依据 = `D-053` + `D-055`）。
- **技术默认（🔴 非人工 Decision、不生成 `Decision ID`）**：**`TypeScript end-to-end`**；**框架（React / Next.js / Vue）/ state library / router / component library = 实现参数**，由 Integrator 结合 Vercel + TypeScript + Browser APIs + Thin Server Function 收敛。
  - 🔴 **若使用 Next.js** ⇒ 必须明确理由是「**Vercel 部署 / Web UI / 可选 API route 方便**」，🔴 **不是为了构建 SaaS Backend**。
- **主要放弃方案**：① 传统 Backend-centric Web App（服务端持有 Workspace / 数据）；② 纯浏览器、完全无任何服务端层的绝对形态（与 `D-055` 允许的 Thin Proxy 形态冲突）。
- **与既有决策的关系**：**落实并冻结** `D-053` 的主架构方向；**不改变** `D-053` 一字；**不重开** 任何产品语义。
- **影响范围**：`docs/DECISIONS.md`（本条目）；`docs/07_TECH_ARCHITECTURE.md`；`docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（**`v0.3 DRAFT`**）；`docs/09_TEST_PLAN.md`（**Gate B 同步节；🔴 新增 `AC` = 0**）；`20_INTEGRATION/S00-03_技术决策包.md` §V；`20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md` §Y；`docs/CHANGELOG.md`。
- **编号说明**：`D-058` 与 `ADJ-01` / `Q16` 无关；**不改变** `D-049`–`D-057` 一字；**不重开** `S00-01` / `S00-02`。
- **日期**：2026-09-24
- **状态**：`CONFIRMED`

---

## `D-059`｜`TQ02` Gate B 最终裁决：V1 Primary Persistence

- **Decision ID**：`D-059`（来源：**`S00-03`**；**Source = Gate B Final Human Confirmation**）
- **来源阶段**：**`S00-03｜技术架构与实现方案收敛`**（**Gate B 最终裁决**）
- **人工确认**：项目负责人 **2026-09-24** 明确选择 **「A｜确认以上全部 Gate B 决策」**。
- **决策主题**：V1 主持久化形态。
- **最终结论（人工 Decision 核心，🔴 不含任何物理 schema）**：
  **`TQ02-FINAL` = Local Workspace Files + No required cloud database**
  - 主持久化 = **用户选定的本地 Workspace 文件**（`D-053` 已确认）；
  - 🔴 **不得使用 PostgreSQL 作为 V1 required dependency**；
  - 🔴 **不得引入云 DB / SQLite server / remote persistence service 作为主存储**；
  - Managed PostgreSQL 口径 = **`SUPERSEDED BY D-053 FOR V1 PRIMARY PERSISTENCE`**，🔴 **不是技术失败**；未来若做 cloud sync / multi-device / multi-user 可重新打开（**须另行 Decision**）。
- **技术默认（🔴 非人工 Decision）**：物理层 = **`Markdown`（人可读正文）+ `JSON` / sidecar metadata**。
  - 🔴 **物理文件 schema（Markdown front-matter / sidecar JSON / 目录名 / 文件名 / schema 细节）= 实现层 / Integrator 收敛项**；🔴 **不得在本 Decision（或 Gate B Landing）中锁成不可变产品 Decision**；
  - ✅ **但必须继续满足以下已确认约束**：`human-readable` ／ `stable ID` ／ `EvidenceRef` ／ `archive_state` ／ `generation batch` ／ `source_type` ／ `decision_state` ／ `Git-friendly` · `portable`。
- **主要放弃方案**：① 云 PostgreSQL 作为 V1 主存储（已被 `D-053` supersede）；② 单一 JSON 全量大文件（可读性 / diffability / 局部写风险）；③ 嵌入本地数据库引擎（增加 V1 复杂度且非必要）。
- **与既有决策的关系**：**落实并冻结** `D-053` 的 Primary Persistence 结论；**不改变** `D-053` 一字。
- **影响范围**：同 `D-058`。
- **编号说明**：`D-059` 与 `ADJ-01` / `Q16` 无关；**不改变** `D-049`–`D-058` 一字。
- **日期**：2026-09-24
- **状态**：`CONFIRMED`

---

## `D-060`｜`TQ03` Gate B 最终裁决：LLM 接入策略

- **Decision ID**：`D-060`（来源：**`S00-03`**；**Source = Gate B Final Human Confirmation**）
- **来源阶段**：**`S00-03｜技术架构与实现方案收敛`**（**Gate B 最终裁决**）
- **人工确认**：项目负责人 **2026-09-24** 明确选择 **「A｜确认以上全部 Gate B 决策」**。
- **决策主题**：V1 LLM 接入策略（整体形态，非两个子项）。
- **最终结论（人工 Decision 核心）**：
  **`TQ03-FINAL` = Configurable LLM + Provider Abstraction + Provider-dependent Hybrid Request Path + Session-only Credential + Registered-provider Thin Proxy only**
  - **路径由 `Provider Adapter` 能力决定**，🔴 **不得逐请求让用户手工选择 `direct` / `proxy`**、🔴 **不得无依据随机切换**（`D-055`）；
  - `Browser Direct`：满足能力条件时使用；🔴 **不得额外经过 Vercel**；
  - `Vercel Thin Proxy`：**仅** `provider_id → 已注册 adapter → 固定 / allowlist host`；🔴 **只做转发、禁持久化**；
  - **Custom `Base URL` = `Browser Direct Only`**；🔴 **不提供 `Generic Arbitrary URL Proxy`**；🔴 **Proxy 不接受任意 `target_url` / `base_url` / `host` / `scheme`**；
  - **不可用 Provider 必须明确失败**，🔴 **不得静默回退到通用 Proxy**；
  - 🔴 **不提供「记住我 / Remember Key」**；🔴 **不持久化 Credential**（`D-056`）；
  - 🔴 **V1 不预置服务端固定 Key**。
- **Structured Output（保留 PRE-PIVOT 中仍有效的技术建议，🔴 属实现层，不改变产品语义）**：优先 **Provider-native Structured Output / constrained JSON + server / application schema validation**；若某 Provider 不支持 ⇒ 通过 **adapter + schema validation + repair / retry** 处理；🔴 **不得把普通技术 retry 升级为人工 Decision**。
- **主要放弃方案**：① 服务端固定 Key 统一代理（`D-055` 已明确禁止）；② 逐 Provider 硬编码直连、无 Adapter 抽象；③ 通用 URL Proxy。
- **与既有决策的关系**：**落实并冻结** `D-055` + `D-056`；🔴 **子项已裁决 ⇒ 本 Decision 完成 `TQ03` 整体裁决**；**不改变** `D-055` / `D-056` 一字。
- **影响范围**：同 `D-058`。
- **编号说明**：`D-060` 与 `ADJ-01` / `Q16` 无关；**不改变** `D-049`–`D-059` 一字。
- **日期**：2026-09-24
- **状态**：`CONFIRMED`

---

## `D-061`｜`TQ04` Gate B 最终裁决：检索实现路线 = `R-A`

- **Decision ID**：`D-061`（来源：**`S00-03`**；**Source = Gate B Final Human Confirmation**）
- **来源阶段**：**`S00-03｜技术架构与实现方案收敛`**（**Gate B 最终裁决**）
- **人工确认**：项目负责人 **2026-09-24** 明确选择 **「A｜确认以上全部 Gate B 决策」**。
- **决策主题**：V1 检索实现路线。
- **最终结论（人工 Decision 核心）**：
  **`TQ04-FINAL` = `R-A`**（Structured Field Rules + 必要时 LLM 维度级判定）
  - **Level A** = `goal` / `actual_attempt` / `condition` / `actual_result`；
  - **`related`** ⇔ `matched_level_a_dimensions` 非空；**`matched`** ⇔ **`D-050` 严格语义重叠**；
  - **LLM 只用于**「结构规则无法可靠判定」或「自然语言等价判断」时的 **离散三态判定**：`matched` / `compared_not_matched` / `uncompared`；
  - 🔴 **不得引入 Vector DB / embedding-based admission / numeric similarity score 作为 V1 Primary Retrieval**；
  - 🔴 **不得输出 `0.82` / `86%` / `similarity score` / `confidence score` 作为产品准入依据**。
- **Research RAG 边界（🔴 `D-054` 不变）**：V1 = **Structured Experience RAG**；`ResearchContextProvider` = **RESERVED ONLY**；🔴 **不实现** PDF RAG / Literature RAG / Vector DB / Paper Knowledge Base / Chunking / Embedding Index；🔴 **不得因本 Decision 自动实现未来 Research RAG**。
- **主要放弃方案**：① `R-B`（embedding 相似度）；② `R-C`（混合数值 + 结构）；③ 以 `cosine similarity score` 替代 `D-050` 严格语义判据。
- **证据基础**：`D-050`（`CONFIRMED`）｜`SP-03` = `INCONCLUSIVE`（判据未显式化）｜`SP-03R` = **`PASS`**（射程仅「**本次可执行环境条件下、判据显式化后未再观测到漂移**」）｜`SP-06`：`R-A` 三态可区分、`D-050` / `D-052` 用例符合预期、**全程无数值相似度**、100 条规模无实质性能问题。
- **实现期复核（🔴 不属本 Decision 的验收项）**：`TE-POST-AI-REPRO` = `DEFERRED UNTIL IMPLEMENTATION`（引擎级 Structured Output / 可固定采样参数下的复核）。
- **影响范围**：同 `D-058`。
- **编号说明**：`D-061` 与 `ADJ-01` / `Q16` 无关；**不改变** `D-049`–`D-060` 一字；**不修改** `docs/architecture/04_RETRIEVAL_AND_COMPARISON.md`（`S03-D` 历史产出）。
- **日期**：2026-09-24
- **状态**：`CONFIRMED`

---

## `D-062`｜`TQ05` Gate B 最终裁决：部署形态 / 环境（🔴 含 Deployment Acceptance 后置）

- **Decision ID**：`D-062`（来源：**`S00-03`**；**Source = Gate B Final Human Confirmation**）
- **来源阶段**：**`S00-03｜技术架构与实现方案收敛`**（**Gate B 最终裁决**）
- **人工确认**：项目负责人 **2026-09-24** 明确选择 **「A｜确认以上全部 Gate B 决策」**。
- **决策主题**：V1 开发形态 / 部署目标 / 数据位置 / 服务端层。
- **最终结论（人工 Decision 核心 —— 只冻结「部署架构 / 目标」）**：
  **`TQ05-FINAL`**
  - **Development** = Local Development；
  - **Review / Submission Demo** = **Vercel**（Demo / Review Deployment Target）；
  - **Data** = **Local Workspace**；
  - **Server Layer** = **仅 Optional Thin Provider Proxy**；
  - 🔴 **不得引入云数据库**；🔴 **不得依赖腾讯云旧 `SP-01a`**（`SP-01a = SUPERSEDED BY D-053`）。
- **🔴 必须随本 Decision 同读的验收状态（不得省略、不得写反）**：
  ```
  DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION
  ```
  - 🔴 **不得写**「Vercel 已验证 / Vercel 已部署 / HTTPS picker 已验证 / Production Ready」；
  - 🔴 **不得写**「Local-first 已可行」或「Local-first 已完成浏览器验收」；
  - `SP-06` 的 7 项 `PENDING MANUAL OBSERVATION`（`S6-01` / `04` / `05` / `06` / `08` / `09` / `10`）**仍然 `PENDING`**；
  - 提交前必做项 = `20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md`（`PSA-01`–`PSA-13` + `PSA-X1`–`X11`，**全部 `PENDING`**）。
- **与 `D-057` 的关系**：**本 Decision 冻结「部署架构 / 目标」，`D-057` 决定「部署验收时序」** ⇒ **`Decision` vs `Acceptance` 两者分离、不得混淆**。
- **主要放弃方案**：① 云数据库承载科研主数据（`D-053` 已 supersede）；② 依赖腾讯云旧 `SP-01a` 资源链；③ 把 Vercel 当作 Production SaaS 基础设施。
- **影响范围**：同 `D-058`。
- **编号说明**：`D-062` 与 `ADJ-01` / `Q16` 无关；**不改变** `D-049`–`D-061` 一字。
- **日期**：2026-09-24
- **状态**：`CONFIRMED`
- **🔴 附注**：`TQ05` 的 `CONFIRMED` **只代表 Deployment Architecture / Target 冻结**；`DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION` **不因本 Decision 而改变**。

---

# S00-02 第四批人工决策

- 记录日期：2026-09-19
- 决策来源：项目负责人人工确认（非 AI 提议）
- 状态：全部 `CONFIRMED`
- 来源阶段：S00-02｜V1 核心产品机制收敛（第四批，共 **11 项**：Q04 / Q12 / Q14 / Q16 / Q27 / Q28 / Q29 / Q31 / 新-2 / 新-7 / 新-10）
- **唯一依据**：`docs/analysis/S00-02_V1核心产品机制收敛.md` 的 **§21（第四批并行分析集成 + 第四批唯一口径基座）+ §22 v2（第四批待人工确认决策包）+ §23（第四批人工确认前最终一致性修正，7 项）**。**如历史候选与三者不一致，以 §21（经 §23 修正后的口径）/ §22 v2 / §23 为准。**
- **不得恢复**：`T4-A` / `T4-B` / `T4-C` 三份并行产出中**已被 Integrator / §23 修正的旧表述**（完整记账见主分析文档 **§21.5**，共 23 条；其中 **第 16–23 条为 §23 修正轮新增**）。
- 约束：S00-02 **本批确认后关闭**（`CLOSED / CONFIRMED`）；**不得重开** S00-01（`D1–D10` / `R1–R6`）与 S00-02 **第一 / 第二 / 第三批**（`D-011`–`D-038`）。
- 影响范围：`01_PRODUCT_DEFINITION.md`（**仅必要同步**）、`03_V1_SCOPE.md`、`04_USER_FLOW.md`、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`、`07_TECH_ARCHITECTURE.md`（**仅技术观测参数归属**）、`08_UI_SPEC.md`（**仅界面约束，未做 UI 设计**）、`09_TEST_PLAN.md`（已同步：`AC-10` 精度修正 + `AC-61`–`AC-100`）
- 关联文档（**均为非 canonical 分析来源**）：`docs/analysis/S00-02-T4A_对象生命周期.md`、`S00-02-T4B_检索与触发行为.md`、`S00-02-T4C_P0判定与Attempt治理.md`
- 前置口径校正：**第二批定向校正（2026-09-19，`BLOCKER`）已完成** —— 追问预算单位 = **`max-3-key-questions-total`（最多 3 个关键追问问题总量）**，**已全库解除、不再是关闭 blocker**（见本文件《🚩 第二批定向校正》与主分析文档 §24）

---

## Q16｜派生关闭登记（**不创建 `Decision ID`**）

- **正式登记**：**Q16 已确认关闭；不创建独立 `Decision ID`** —— **不得创建 `D-049 = Q16`**。
  - 🚩 **2026-09-19 就地补注（避免编号误解）**：**`D-049` 已用于 `S00-03` 的《`Hypothesis` V1 编辑边界与用户验证判据》（见本文件《S00-03 人工决策》）**，**该编号与 `Q16` 无关**。**本条禁止性表述继续有效**：**`Q16` 永久不占用任何 `Decision ID`**（无论 `D-049` 还是其它编号），其正式规则源**恒为 `D-019` Level C**。
- **正式规则源**：**`D-019`（Level C 行）** —— **Q16 的规则由 `D-019` Level C 承载**。
- **验收依据**：`09_TEST_PLAN.md` 的 **`AC-21`**（已存在）。
- **关闭后的四条结论 + 一条禁止性表述**：
  1. **不设「最近一次默认比较对象」** —— 既不是默认比较对象，也不是默认展开对象，也不是空态默认项；
  2. **默认比较集合仍由 Level A 相关性决定**；
  3. **时间不得改变"是否相关"**；**时间不得把不相关记录拉入比较集合**；
  4. **时间只在「已经相关、且 Level A 无法进一步区分」时作为辅助排序维度**；
  5. **不得以「最新」作为主排序键**。
- **不在 S00-02 固化的两项（→ `S00-03`）**：
  - **"并列判定"的技术判据** —— 原候选"两条命中的 Level A 维度集合相同 = 并列"**已删除**，**不属 `D-019` 直接推出**，归 **`S00-03` 的检索实现 / 排序规则设计**；
  - **`created_at` fallback** —— **只锁语义原则**（优先使用用户提供的实际发生时间；**若该维度缺失，不得把 `created_at` 冒充真实发生时间**）；**是否允许 `created_at` 作纯展示层 / 技术 fallback 留 `S00-03` 裁决**。
  - 🚩 **若未来把上述两项提升为正式产品机制，必须同时建立独立 `Decision ID`** —— **不得为维持"10 个编号"而隐藏新决策**。
- **本项性质**：**执行 `D-019` / 关闭一个 `DEFERRED` 议题**，**不是恢复该 `DEFERRED` 断言**，**也不是重开 `D-019`**。
- **状态**：`CONFIRMED`（**派生关闭，不占编号**）

---

## D-039｜`accepted` Insight 的撤销与"显式接受"语义

- **Decision ID**：D-039（来源：S00-02，对应 **Q12**）
- **决策主题**：用户能否手动晋升 / 撤销 `accepted` Insight；`Experience Asset` 准入是否可被用户操作绕过
- **最终结论**：**允许「撤销接受」（`accepted → candidate`）**；**晋升仍须 `E1–E5`**；**用户不能通过任何手动操作绕过 `E1–E4`**；**产品机制术语「手动晋升」正式废止** —— 正确语义为：**只有满足 `E1–E4` 的 `Candidate Insight`，在用户显式接受后才能满足 `E5`，并成为 `Experience Asset`**。**用户操作可以决定 `E5`，不能替代 `E1–E4`。**
- **核心约束**：
  - 用户对第 ⑧ 步 `Insight` 的**合法动作 = 四个**：**接受**（**仅当 `E1–E4` 已满足**；作用等价于 `E5`）、**修改**（见 D-040）、**拒绝**（`candidate → rejected`，**不要求 `E1–E4` 满足**）、**撤销接受**（`accepted → candidate`）。
  - **撤销 ≠ 拒绝**：撤销表示"我暂时不再把它当作可复用经验"，**不表示"该结论不成立"**；撤销后**立即从经验区移除**，**不得删除**该 Insight / 其引用 / **不得改内容** / **不得改来源类型（仍为 `Inference`）**。
  - 撤销后**必须**按 **`D-038`** 三段式出现在第 ⑧ 步位置（**不得静默消失、不得隐藏**）；**不得**为撤销引入理由必填 / 次数上限 / 冷却期 / 任何阈值；**允许反复接受 / 撤销**，每次迁移**留事件痕迹**。
  - **`E1–E4` 不得被任何用户动作替代**；用户**不能编辑** `E1–E4` 的判定结果；**`E2` / `E3` 不满足时，用户意愿不能改变"保持 `candidate`"这一结果**。**撤销后重新接受须重新检查 `E1–E4`**。
  - **`E2` / `E3` 的判定**：`E1` / `E4` 属**可机器核验的结构性检查**（直接呈现）；**`E2` / `E3` 属内容质量判断 → 必须标为 AI 判断（`Inference`）**、与判定理由同屏可见、用户可反馈"不同意"（留痕）但**不改变状态**；**不提供"推翻 `E2` / `E3` 判定"的按钮**；用户**唯一解法 = 修改内容 → 重新检查**；**不为 `E2` / `E3` 引入分数 / 等级 / 置信度**。
  - **术语替代**：`手动晋升 / 强制晋升 / 直接晋升为经验` → **显式接受（`E5`）**；`删除经验 / 取消经验资产` → **撤销接受**；`降级经验` → **回到候选（`candidate`）**。
- **主要放弃方案**：① **方案 A（可随时手动晋升 + 可撤销）** —— 用户可绕过 `E1–E4`，`D-021` 事实上失效，`Experience Asset` 与 `D-015` 定义脱节；② **方案 C（V1 不允许撤销）** —— 用户接受后改变主意时**没有可表达的状态**（改用 `rejected` 会把"我不再采用"表达成"这条结论不成立"，污染 `rejected` 语义），并造成"误点即不可修正"的主链体验断裂。
- **影响范围**：`04_USER_FLOW.md` §2.5、`05_DATA_MODEL.md`（`Insight` 状态迁移 + 事件留痕）、`06_AI_CAPABILITIES.md`（A4）、`08_UI_SPEC.md`（**仅界面约束**）、`09_TEST_PLAN.md`（`AC-61` / `AC-63`）
- **日期**：2026-09-19
- **状态**：`CONFIRMED`

## D-040｜`accepted` Insight 被修改后的状态机与留痕方式

- **Decision ID**：D-040（来源：S00-02，对应 **新-2**）
- **决策主题**：`accepted Insight` 的内容被修改后如何处理；版本留痕采用哪种形态
- **最终结论**：**`accepted Insight` 的「内容性字段」任一被修改 → 状态退回 `candidate` + 重新检查 `E1–E4` + 用户重新接受 → `accepted`**；**非语义展示性 / 元信息修改不触发状态退回**；**V1 只保留事件日志**，**不建立版本列表 / 版本对比 / 回滚系统**；**事件日志不得被用作价值评分或质量排名信号**。
- **核心约束**：
  - **内容性字段集合（可枚举，不判断"实质性"）**：① **经验命题内容（结论表述）**；② **适用范围 / 条件集合**；③ **引用清单**；④ **判断依据 / 可验证判据**。**角色不确定的字段一律按"内容性字段"从严处理**。
  - **退回后立即**：重检 `E1–E4`（同屏）；全部满足 → **保持 `candidate` + 显式提示"内容已修改，需要重新接受"**；任一不满足 → 按 **`D-038`** 三段式呈现；**何时重新接受由用户决定**，系统**不得自动接受 / 自动补字段 / 自动改写**。
  - **立即从经验区移除**（与 D-039 同一口径）；**不得删除该 Insight**；**修改 ≠ 拒绝**。
  - **延伸规则（状态机完整性）**：`candidate` 被修改 → **保持 `candidate` + 刷新 `E1–E4` 呈现**；`rejected` 被修改 → **回到 `candidate`**（**不得沿用旧拒绝、不得直接变 `accepted`**）。
  - **留痕方式**：**只留事件日志**，最小内容 = **状态迁移 + 时间 + 触发原因类别（用户接受 / 用户撤销 / 内容修改 / 重新接受）**；**事件日志属产品层行为留痕**（边界说明写入 **D-044**，规则需求属本条）；**不得扩展为排障日志**；**明确不做**：可见版本列表、版本对比、版本回滚、版本号选择。
  - **不得**引入"修改幅度 / 修改次数"的计数、评分或阈值；**不得**为判断修改幅度而新增字段（**尤其不得新增独立的"展示标题"字段**）。
- **主要放弃方案**：① **方案 A（修改后仍保持 `accepted`）** —— 会出现"内容已改到不满足 `E2` / `E3`，状态仍是 `accepted`"，直接违反 `D-021` 与 `D-038`；② **方案 C（只对"实质性修改"退回）** —— "实质性"**不可枚举 → 必然产生隐性判断**，同类编辑在不同位置得到不同结果且**无法写验收点**（**有意接受"拼写微调也需重新点一次接受"这一代价**，在 10 天窗口内一次多余点击远比一个无法验收的判据划算）；③ **保留历史版本** —— 属明确的范围扩展（版本号 / 对比 / 回滚），与 `D-015` / `[D4]` 取向相悖。
- **影响范围**：`04_USER_FLOW.md` §2.5、`05_DATA_MODEL.md`（状态迁移矩阵、内容性字段集合、事件日志）、`06_AI_CAPABILITIES.md`（A4）、`08_UI_SPEC.md`（**仅界面约束**）、`09_TEST_PLAN.md`（`AC-62` / `AC-63` / `AC-64` / `AC-65`）
- **日期**：2026-09-19
- **状态**：`CONFIRMED`

## D-041｜`Hypothesis` 与 `Model Suggestion` 永不直接成为 `Experience Asset`

- **Decision ID**：D-041（来源：S00-02，对应 **新-7**）
- **决策主题**：第 ⑨ 步两类输出（`History-grounded Hypothesis` / `Model Suggestion`）能否直接成为 `Experience Asset`
- **最终结论**：**两类输出本身永不直接成为 `Experience Asset`**。**正式闭环**：`Hypothesis → 用户实际执行 → 新 Formal Attempt → ⑥ 历史检索 → ⑦ 历史比较 → ⑧ Candidate Insight → E1–E5 → Experience Asset`。**禁止**：`Hypothesis → 用户接受 → Experience Asset`。**`Hypothesis` 表达未来待验证方向；`Experience Asset` 表达过去已发生尝试中提炼出的经验 —— 二者时间语义必须保持分离。**
- **核心约束**：
  - `History-grounded Hypothesis` 与 `Model Suggestion` **一律不得成为 `Experience Asset`**、**不得在经验区出现**、**不得被任何"经验"措辞指代**。
  - **用户对 Hypothesis 的「接受」** 表示"我认可这是一个**值得我下一步验证的方向**" —— **不表示**该假设已被支持、**不表示**已成为经验。
  - **接受 / 拒绝是决策型 `Inference` 的确认动作**（`D-014`），**来源类型恒为 `Inference`**；**不为 Hypothesis 建立与经验层相关的生命周期状态机**；**`candidate` / `accepted` / `rejected` 仅适用于第 ⑧ 步产物**。
  - **唯一转化路径**即上述闭环；`Hypothesis → 用户接受 → Experience Asset` **属必须显式排除的错误路径**。
  - **不得**以"用户接受 Hypothesis"替代上述任何一环；**不得**在界面或文案中把已接受假设呈现为"经验 / 结论 / 已确认"。
  - **`Hypothesis` 不承担 grounding、不计入 `N_检索` / `N_引用`**（与 `D-030` 同源延伸，非新增规则）。
  - **已接受假设的去处**：**V1 不建立跨记录的方向清单 / 待办视图**；已接受假设**仅作为本次主链记录的第 ⑨ 步输出被持久化并可回看**。
- **主要放弃方案**：① **方案 A（`accepted History-grounded Hypothesis` 直接成为 `Experience Asset`）** —— **架空 `E1` / `E4`**（无对应 `Formal Attempt`、无支持 / 反驳事实字段）、**破坏 `D-015`**（`Experience Asset` 会被实质扩展为第二类可晋升对象）、**重新制造第三批刚修复的"第 ⑨ 步产物被误当 `Candidate Insight`"混淆**；② **方案 C（用户可手动把 `accepted Hypothesis` 转成 `Candidate Insight`）** —— **违反 `D-022`**（`Candidate Insight` 只在第 ⑧ 步生成），且其 `E1` / `E4` **仍然无法成立**，本质是"手动晋升"的变体。
- **影响范围**：`03_V1_SCOPE.md`（明确不做项）、`04_USER_FLOW.md` §2.6 / §3、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`（A5）、`08_UI_SPEC.md`（**仅界面约束**）、`09_TEST_PLAN.md`（`AC-66`）
- **日期**：2026-09-19
- **状态**：`CONFIRMED`

## D-042｜`Model Suggestion` 的保存 / 持久化与「保存 ≠ 接受」

- **Decision ID**：D-042（来源：S00-02，对应 **新-10**）
- **决策主题**：`Model Suggestion` 保存后的性质与晋升资格
- **最终结论**：**允许保存 / 持久化 `Model Suggestion`**，但**必须区分两个动作**：**A. 保存** = 保留内容供后续回看；**B. 接受 / 拒绝** = 用户对第 ⑨ 步决策型 `Inference` 的裁决。**保存 ≠ 接受 ≠ 采纳 ≠ 确认**；**但「接受 / 拒绝」机制必须保留**。**已保存但尚未接受 / 拒绝：只能表示内容被保留，决策状态未完成，不得作为已接受方向复用。** 无论保存或接受，`Model Suggestion` **均**：**不改称 Insight**、**不成为 `Experience Asset`**、**不获得 grounding**、**不计入 `N_引用`**、**不变成 `History-grounded Hypothesis`**、**不作为用户历史经验依据**。**正确未来路径**：`Model Suggestion → 用户实施 → 新 Formal Attempt → 正常历史经验闭环`。
- **核心约束**：
  - 🔴 **前提（第三批已 `CONFIRMED`，不得重开）**：`D-027` 明确第 ⑨ 步两类输出**均为决策型 / 持久化 `Inference`，须用户显式接受 / 拒绝** —— 因此**原"保存 → 不需要接受 / 拒绝流程"的表述正式删除**（该表述曾与 `D-027` **直接冲突**，处置 = 按"默认优先修改第四批候选以兼容已确认规则"，**不改 `D-027` 一字**）。
  - **名称与性质都不因保存而改变**；**不得**改称"经验 / 候选经验 / Insight / Hypothesis"。
  - **「非你的历史经验依据」标记恒存** —— **整体显著标注（不是小标签）**，与是否保存 / 是否被接受无关。
  - **不得进入经验区 / 与经验资产混列**；**不计入 `N_检索` / `N_引用`**；**不承担 grounding**；**不得被 ⑩ 追溯为历史证据**；**不得因保存而取得 `History-grounded Hypothesis` 地位**。
  - **「保存」≠ 决策型 `Inference` 的接受动作**（`D-014`）：保存**不改变任何持久化的业务判断状态**；**不得**把"保存"渲染为"接受 / 确认 / 采纳"。
  - **范围约束（V1）**：保存后的 `Model Suggestion` **仅属于本次主链记录的第 ⑨ 步输出并被持久化、可在本次记录中回看**；**V1 不建立跨记录的建议库 / 建议列表 / 建议待办视图**。
  - **不得**在界面上使用"保存为经验 / 保存为资产 / 采纳为经验"等表达。
  - **延伸规则**：保存后的 `Model Suggestion` 若在后续第 ⑨ 步被引用，**只能作【模型先验】分区的推理输入**，须单独标注、**不计入 `N_引用`**、**不得成为唯一依据**。
- **主要放弃方案**：① **方案 B（保存后可 `accepted` 并成为 `Experience Asset`）** —— 无历史锚定内容取得资产地位，`E1` / `E4` / `D-030` 边界同时失效；② **方案 C（V1 不允许保存）** —— 不违反任何已确认决策，但代价是"看得到却留不下"的体验断裂与记录散落（用户会转而在产品之外保存内容）；其唯一规避的风险已由本项的"整体标注 + 不得用接受类措辞 + 独立区域"兜住；③ **v1 曾把"取消接受 / 拒绝流程"当作方案 A 的优点 —— 属判断错误**（违反 `D-027`），**已删除该表述**。
- **影响范围**：`03_V1_SCOPE.md`、`04_USER_FLOW.md` §2.6 / §3、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`（A5 与红线）、`08_UI_SPEC.md`（**仅界面约束**）、`09_TEST_PLAN.md`（`AC-67` / `AC-68` / `AC-69` / `AC-70`）
- **日期**：2026-09-19
- **状态**：`CONFIRMED`

## D-043｜`Attempt` 生命周期：只归档、不删除

- **Decision ID**：D-043（来源：S00-02，对应 **Q31**）
- **决策主题**：V1 `Attempt` 生命周期的移除操作 —— 删除还是归档
- **最终结论**：**V1 只采用归档，不提供永久删除**。归档 **用户可主动执行**、**可撤销**、**归档记录只读**、**不参与新的默认检索**、**不参与新的 grounding**、**不计入新的 `N_检索`**；但 **既有证据引用必须继续存在**，旧引用展示 **「来源已归档」**。**不得静默断裂、不得自动删除引用、不得自动撤销旧 Insight / 旧 Hypothesis、不得自动改写历史结论。** **归档 ≠ 引用失效。** **系统不得因低价值 / 普通错误 / 时间久远自动归档 `Attempt`。**
- **核心约束**：
  - **归档可撤销**（可取消归档，恢复为正常参与状态）；**归档后不可编辑**（可先取消归档再编辑）。
  - **F-1**：归档记录**不参与新的默认检索、不作为新的 grounding 来源、不计入新的 `N_检索`**。
  - **F-2**：**旧引用不静默消失** —— 既有 `Insight` / `Hypothesis` 的 ⑩ 证据链**继续显示该记录（只读可查看）**，并**显式标注「来源已归档」**。
  - **F-3**：**归档不追溯撤销既有证据链** —— 不得导致已成立的引用被判定失效、不得自动撤销 `accepted Insight` / 已接受 Hypothesis、不得自动改写既有结论。
  - **F-5**：**「已归档」与「引用失效」是两种状态、必须使用不同标注**；**「引用失效」仅在允许删除时适用（V1 不适用）**。
  - **F-6 / F-7 / F-8 / F-9**：归档状态**必须用户可见且可识别**；**不得作为价值判断或质量信号**；**不得由系统自动归档**；**归档数量不得影响任何门槛 / 等级 / 建议 / 进度表达**。
  - **A-1 / A-2 / A-3**：不得系统自动归档（`D6` 精神延伸到归档动作）；归档不得作为价值判断（`[R1]`）；归档记录**不因此被降级、不因此从经验层被撤销**。
  - **`E1` 与归档记录**：**既有引用保留（不追溯撤销）；新建立不成立** —— 归档记录**不得作为新的 `Insight` 的 `E1` 来源 / 新的 grounding 来源**。
  - **归档不触发第 ⑥ 步检索**；**归档不是"内容性字段修改"，不触发 `accepted → candidate`**。
  - **`N_引用` 口径**：归档**不计入新 `N_引用`**；**既有 `N_引用` 保持**（不因归档追溯减少）。
  - **若人工要求 V1 提供永久删除** → **必须**先确定引用处理方式（`T-1` tombstone / `T-2` 引用失效 / `T-3` 被引用则阻止），**且必须先裁决"失效记录能否继续承担 grounding"**；**不得在未定义引用处理的情况下提供删除**。
- **主要放弃方案**：① **方案 A（用户可物理删除）** —— 破坏 `[D9] ⑩`（引用证据消失 → 证据链断裂 → "结论仍在、依据已不存在"）、需额外引用处理、误删不可逆；② **方案 C（允许删除但被引用时阻止）** —— 需计算引用关系、用户遇到"为什么不能删"的困惑、仍会产生"未被引用但后续需要"的情况；③ **方案 D（归档默认 + 高级永久删除）** —— 功能最全但风险收益比最差（高级删除是误操作高发入口），且同样需要引用处理。
- **影响范围**：`03_V1_SCOPE.md`（"删除失败记录" → "归档失败记录"；新增包含项与不做项）、`04_USER_FLOW.md`、`05_DATA_MODEL.md`（`Formal → 已归档` 生命周期与能力矩阵）、`06_AI_CAPABILITIES.md`（A3 / A5）、`08_UI_SPEC.md`（**仅界面约束**）、`09_TEST_PLAN.md`（`AC-71`–`AC-76` / `AC-100`）
- **日期**：2026-09-19
- **状态**：`CONFIRMED`

## D-044｜产品层 L4 系统自动记录最小集

- **Decision ID**：D-044（来源：S00-02，对应 **Q04**）
- **决策主题**：产品层系统自动记录（元数据）的范围，以及技术观测参数的边界
- **最终结论**：**产品层 L4 系统自动记录最小集 = 4 项**：① **创建时间** ② **最近修改时间（正式保留）** ③ **数据来源性质** ④ **AI 内容来源标记**。**「发生时间」不计入 L4** —— 若由用户提供，属**用户 `Fact`** 或其 **`Extraction`** 表达，**不属于 L4 系统自动事实**。**S00-02 产品层不锁**：`model` / `model version` / `prompt version` / `prompt text` / `token` / `temperature` / `trace id` / `latency` / `retries` / 内部检索分数 —— **留后续技术 / observability 层**。**不得新增重复"数据来源"字段。**
- **核心约束**：
  - **② 最近修改时间正式保留**（不再写"建议保留"）—— 理由：`D-045`（Q29）的 `TR-7` **需要识别"`Formal Attempt` 是否被修改"**并提示先前比较可能不再适用；**成本低、有明确产品用途**。
  - **③ 数据来源性质**（现场记录 / 事后补录 / Demo 示例数据）—— **复用既有「数据来源」字段，不新增重复字段**。
  - **④ AI 内容来源标记**（逐条标 `Fact` / `Extraction` / `Inference`，含展示型 / 决策型）—— `D-013` 已确认的系统自动字段，**不得取消**。
  - **「发生时间」不计入 L4**：应作为**用户内容字段的来源说明**单独表述。
  - **强制**：上述技术信息**即使实现层存在**，也**不得**出现在用户可见界面、**不得**作为任何产品判定依据、**不得**作为 ⑩ 追溯清单的组成部分、**不得**改变任何用户可感知状态。
  - **原则**：E-1 最小化 / E-2 不锁技术参数 / E-3 技术日志不得成为产品事实 / E-4 不引入第二套来源字段 / E-5 用户提供的时间 ≠ 系统事实 / E-6 不得因元数据产生门槛。
  - **标注校正**：`§8.1` 的 `Attempt Draft{ raw_text, created_at }` **整体标 `Fact` 属误标** → 校正为 **`raw_text` = `Fact`；时间类字段 = 系统元数据**；**用户提供的发生时间仍是用户 `Fact`**。
  - **事件日志的层级**：`Insight` 状态迁移事件日志（状态迁移 + 时间 + 触发原因类别）属**产品层行为留痕**，**纳入本项的边界说明**，**不得扩展为技术日志**（其规则需求归 **D-040**）。
  - 🔴 **本项不承载 `AC-10` 精度修正** —— `AC-10` 与 L4 元数据**没有产品逻辑关系**；**`AC-10` 精度修正的唯一归属 = D-048（Q28）+ `09_TEST_PLAN`**。**Q04 只处理"系统自动记录范围 / 产品元数据与技术日志边界"**；**不得建立第二份 `AC-10` 规则**。
- **主要放弃方案**：① **方案 B（大量记录模型 / Prompt / 版本 / 运行参数）** —— 越出 S00-02 边界、引入未经确认的技术字段、时间与范围成本、误导风险；② **方案 C（完全不记录 AI 来源）** —— **直接违反 `[D7]`** 与 `D-013`，并使 `D-014` 无法执行、⑩ 与 `N_引用` 失去依据；③ **把「发生时间」计入 L4 最小集（v1 的"5 项"写法）** —— 它是**用户内容**而非**系统自动事实**，混入会使"系统元数据"与"用户提供事实"的边界失守。
- **影响范围**：`05_DATA_MODEL.md`（**L4 最小集 = 4 项**、`created_at` 标注校正、发生时间作为用户内容字段、事件日志层级）、`06_AI_CAPABILITIES.md`（元数据边界与技术日志禁入清单）、`07_TECH_ARCHITECTURE.md`（**技术观测参数归本文件，非产品层**）、`08_UI_SPEC.md`（**仅界面约束**）、`09_TEST_PLAN.md`（`AC-77` / `AC-78`）
- **日期**：2026-09-19
- **状态**：`CONFIRMED`

## D-045｜第 ⑥ 步检索的两层触发口径

- **Decision ID**：D-045（来源：S00-02，对应 **Q29**）
- **决策主题**：`Formal Attempt` 保存后是否自动触发第 ⑥ 步检索；记录被修改后如何处理
- **最终结论**：**检索触发分两层**。**① 首次自动检索**：**`Formal Attempt` 保存成功 = 第 ⑥ 步的唯一自动触发条件 = 主链首次自动触发条件**。**② 后续重新检索**：`Formal Attempt` 内容被修改后 —— **不自动重跑检索**、**必须提示"先前的历史比较结果可能不再适用"**、**用户可显式发起"重新检索"**（**属后续重跑动作，不是 `D9` ⑤→⑥ 之间新增的主链步骤**）。**归档 / 取消归档不自动触发重新检索。** **不得再写成"保存成功是唯一触发条件"** —— 正确表述是 **"唯一自动触发条件"**。
- **核心约束（TR-1 – TR-11 要点）**：
  - **TR-1 / TR-2**：**事件驱动**（非状态驱动）；**唯一自动触发条件** = 一次 `Formal Attempt` 的保存动作**成功完成**（主链第 ⑤ 步"通过"）；**不设"用户发起"前置**；**不得在 ⑤ 与 ⑥ 之间插入任何未在 `D9` 中列出的用户动作**；**"唯一"的范围只限"自动触发"**。
  - **TR-3 / TR-4 / TR-5**：`Draft` 保存 / 仅编辑 `Draft` / 解析 / 追问 / 中途离开 / 续写 —— **均不触发**；**保存失败不触发**；**重复保存幂等**（同一次保存流程内重复提交只产生一次检索）。
  - **TR-6 / TR-7**：**修改 `Formal Attempt` 不自动重跑检索**（含影响 Level A 的字段）；**归档 / 取消归档亦不触发**；**但必须显式提示** + **提供用户显式发起的"重新检索"**；**不得静默沿用旧结果、不得自动重生成 ⑧ / ⑨ 步产物、不得自动退回既有 `Insight` / Hypothesis 状态**。
  - **TR-8 / TR-9**：**不产生后台 / 异步 / 批量 / 定时任务**；**不改变第 ⑧ 步的生成时机**（`D-022`）；**触发与「数据来源」字段无关**（现场记录 / 事后补录 / Demo 示例数据**同等触发**；**不得以来源字段作为能力门控**）。
  - **TR-10**：**默认检索范围 = 全部历史**；`Project` **只作 Level B 解释维度**，**不作预筛选、不作准入判据**；范围调整**只能是用户显式选择**。
  - **TR-11**：**不引入「已检索过」产品层字段**；也**不得**把"检索新鲜度"做成门槛、评分或用户可见结论。
- **主要放弃方案**：① **方案 B（保存后用户手动点击「查找相关历史」）** —— 在 ⑤⑥ 之间插入未定义的主链动作、使 ⑥ 由"系统能力"退化为"用户动作的后果"（用户不点则 ⑥⑦⑧⑨⑩ 全部不发生）、与 `[D4]` / `[R6]` 冲突；② **方案 C（自动轻量检索，进入详细比较需用户点击）** —— 把点击门位移到 ⑥⑦ 之间，使主链环节 ⑦ 默认不发生；"轻量 vs 详细"的边界在**不得显示数字相似度**、**不得设内部隐藏式加权门槛**的前提下无法定义，且其动机已被 Q14 的首屏规则覆盖。
- **影响范围**：`04_USER_FLOW.md`（第 ⑥ 步触发时机 + 边界子规则 + 修改后提示与显式重跑入口）、`05_DATA_MODEL.md`（不新增"已检索过"字段；最近修改时间的用途限定）、`06_AI_CAPABILITIES.md`（A3）、`08_UI_SPEC.md`（**仅界面约束**）、`09_TEST_PLAN.md`（`AC-79` / `AC-80` / `AC-81`）
- **日期**：2026-09-19
- **状态**：`CONFIRMED`

## D-046｜相关历史的主对照展示数量

- **Decision ID**：D-046（来源：S00-02，对应 **Q14**）
- **决策主题**：相关历史的主对照返回 / 展示条数
- **最终结论**：**历史主对照默认展示 3 条**；**实际不足 3 条则如实展示实际数量**；**允许展开查看更多**；**S00-02 不锁定"展开上限 10"**；**`N_检索` 不因首屏显示数量而截断**。**正式护栏三条**：① **折叠 ≠ 排除**；② **`N_引用` 是用户看到的实际证据数量**；③ **展示数量不得被解释为证据质量 / 可信度**。**主对照 3 条只属于阅读负荷控制。**
- **核心约束**：
  - **三层口径必须分离**：① **检索层** = `N_检索`（集合大小，**不设上限**）；② **展示层** = 首屏条数（**阅读负荷控制**，属 `D-037` 第 ③ 类合法数字）；③ **引用层** = `N_引用`（**唯一被允许作为"证据条数"呈现的数字**）。
  - 🚩 **核心红线**：**② 不得反向约束 ①，也不得反向约束 ③** —— 否则"阅读负荷参数"变成"证据门槛"。
  - **V-1 / V-2 / V-3**：首屏默认 **3** 条；**不足则如实展示实际数量**（1 条就 1 条、0 条进合法空态）；**绝不补满、不凑数**（不得用 Level B 单独成立的记录补位，不得用"最近一次"补位）；**0 条 → 合法空态**（⑥ 即判定为完成；**两种空态必须区分**；**不得呈现为错误 / 功能缺失**）。
  - **V-4 / V-5**：**可就地展开查看更多且必须可达（不遗漏）**；**折叠 ≠ 排除** —— 首屏外记录**仍属"相关且可引用"、仍计入 `N_检索`、仍可被 ⑧⑨ 引用**；**凡被引用者必须在 ⑩ 可点开核对、并可在比较视图中展开查看**。
  - **V-6 / V-7**：**展示条数不得成为证据门槛**；**`N_引用` 是唯一"证据条数"**；**展开提示中的数字只表示"界面中可继续查看的记录条数"**，**不得**被表述为证据条数 / 证据强度 / 可信度 / 相关程度。
  - **V-8 / V-9**：**`N_检索` 不设条数上限、不得被展示条数截断**；**归档记录不计入 `N_检索`；`Draft` 不计入**；**V1 不锁"展开绝对上限 10"** —— 该数字**降级为 `08_UI_SPEC.md` / 实现层的呈现参数**（分页 / 继续加载 / 滚动均可），**不作为产品机制约束**。
  - **不得把 3 条解释为最低证据门槛 / 完整能力门槛 / 可信度门槛 / 检索算法上限。**
- **主要放弃方案**：① **方案 A（固定主 3 + 硬上限 10）** —— "固定 3"会制造"补满"压力（诱导纳入 Level B-only 记录，**违反 `D-019` / `AC-20`**）；"上限 10"缺产品依据且可能挡住被引用的证据，并把 UI 参数提升为产品机制；② **方案 C（按强度自适应 1–3）** —— "自适应"缺少可解释判据，必然落回内部打分 / 阈值（命中 `D-037` 明令禁止的隐性门槛），且用户会把它读成质量信号（**违背 `D-035`"档位不是可信度等级"**）；③ **方案 D（一次返回全部）** —— 首屏认知负荷不可控，与 `D-037` 第 ③ 类的存在理由冲突。
- **影响范围**：`04_USER_FLOW.md` §2.4、`05_DATA_MODEL.md`（`N_检索` 不设上限；展示层与引用层是两个量）、`06_AI_CAPABILITIES.md`（A3）、`08_UI_SPEC.md`（**仅界面约束**；**"展开绝对上限"的取值在本文件裁决**）、`09_TEST_PLAN.md`（`AC-82`–`AC-86`）
- **关联**：**本项属执行 `D-037` 附注自身标注的"待 Q14 确认"事项**（**非重开 `D-037`**）；同时收口第三批遗留的 `新-T4C-9`（`§8.6`"3–5 条主对照"与 `D-037` 不同形 → **统一为"默认 3 条 + 不足展示实际 + 不锁上限"**）。
- **日期**：2026-09-19
- **状态**：`CONFIRMED`

## D-047｜P0 主链 step-gate 与"不可恢复的业务终止"

- **Decision ID**：D-047（来源：S00-02，对应 **Q27**）
- **决策主题**：`D9` 十步"进入下一步"的判定标准；门槛 / 技术失败 / 验收三者的关系
- **最终结论**：**第 ① 步唯一门槛 = 存在非空、非纯空白的用户输入**；**正式废止「≥ 8 字符」等最小字符魔法阈值**；**建立统一 P0 step-gate 表**（每一步明确：正常通过 / 合法降级 / 合法为空 / 对象门槛未满足 / Runtime 技术失败 / 重试·恢复路径）；**V1 不设计「不可恢复的业务终止」**，并**正式区分三层**：**A 对象门槛未满足** / **B Runtime 技术失败** / **C P0 Acceptance**。
- **核心约束**：
  - **A｜对象门槛未满足**（例如 `Draft` 不升级 `Formal`、`Insight` 不晋升、`History-grounded Hypothesis` 不生成）—— **只影响升级 / 输出资格**；**不得删除已有产物、不得显示为系统错误、不得锁死用户继续操作**。
  - **B｜Runtime 技术失败**（AI 调用失败 / 保存失败 / 检索失败）—— **必须保留已有数据 + 明确提示 + 允许重试 + 提供恢复路径**；**不得设置产品层的重试次数上限 / 冷却门槛**。
  - **C｜P0 Acceptance** —— **Runtime 的"可恢复 / 可降级 / 可重试" ≠ 正式验收可以跳过步骤**；**Acceptance fixture 下 `D9` 十步 ①→②→③→④→⑤→⑥→⑦→⑧→⑨→⑩ 必须完整成功执行**；**不得依赖临时人工补录凑验收**。
  - **正式表述**：**「V1 不设计不可恢复的业务终止；未来若新增会阻止用户继续完成主链的业务条件，必须重新经过产品决策」** —— **不再使用"阻断栏全为无 → 将来不得新增阻断"这类过强治理表述**（避免把项目变更流程写成产品行为本身）。
  - **R1｜第 ① 步唯一门槛** = 非空、非纯空白输入 → 创建 `Draft`；**不设字符数阈值、不设语义判定、不设 AI 前置判断**（"语义是否可解析"**下沉到第 ② 步的解析质量判断输入**，**不得作为 ① 的阻断条件**）。
  - **R4｜超长输入不阻断**：只要求提供降级表达方式（分段 / 补充备注）；**产品层不锁具体字符上限**。
  - **R6｜禁止等级化措辞**：解析质量 / 完整度一律用**状态描述**（已抽取 / 未抽取 / 抽取失败 / 待用户确认）；**不得使用"高 / 低置信""完成度"等分级表述**；该状态**不得成为门槛、不得作为用户可见的可信度判断**。
  - **R7 / R8｜0 条出口的适用范围与路由**：**⑧ / ⑨ 共用同一套 A / B / C 命名**，**但适用范围必须明确** —— **第 ⑧ 步常见可用出口 = `A evidence-insufficient` / `C not-formable`**；**`B not-verifiable` 主要用于第 ⑨ 步的 Hypothesis 可验证性判定**，**不得因"统一命名"而强行制造一个不适用于 `Insight` 的出口**；**`E2` / `E3` 不满足继续按 `D-038` 保持 `candidate` + 三段式，不进入 0 条出口**；第 ⑨ 步的"否则"必须**按 A / B / C 分路由**，**禁止把三者统一写成"历史证据不足"**。
  - **R9｜重试不设产品门槛**：任何技术性失败的重试路径**不以次数 / 时间作门槛**，**不得因重试改变已保存数据**。
- **主要放弃方案**：① **方案 A（固定最小字符数）** —— 属魔法数字、会错误阻止 `"失败了"`（3 字）/ `"还是不行"`（4 字）这类**正是 `[D4]` 入口心智所期待的有效上下文**、与 `D-012`「只要存在原始输入即可暂存」直接冲突；② **方案 C（由 AI 判定"是否具有可解析语义"作为 ① 的门）** —— 会出现"系统判定你的话没有语义，因此不能记录"（**违反 `[D4]` / `[D7]`**），且"可解析语义"不可先验判定、AI 判定本身属 `Inference`，**用它阻止用户创建记录等于让 AI 推断改变"用户能否记录事实"**。
- **影响范围**：`04_USER_FLOW.md`（十步 step-gate；③-a / ③-b 仍为一步）、`05_DATA_MODEL.md`（`Draft` / `Formal` 两级门槛分栏）、`06_AI_CAPABILITIES.md`（A1：② 解析质量非等级化；不得以 AI 判定阻断 ①）、`08_UI_SPEC.md`（**仅界面约束**）、`09_TEST_PLAN.md`（`AC-87`–`AC-90` / `AC-97`–`AC-99`）
- **产出物（不单独建 Decision）**：**P0 十步 step-gate 表**（主分析文档 §21.4.1）
- **日期**：2026-09-19
- **状态**：`CONFIRMED`

## D-048｜第 ④ 步候选失败原因允许为 0 条；`AC-10` 精度修正唯一归属

- **Decision ID**：D-048（来源：S00-02，对应 **Q28**）
- **决策主题**：候选失败原因是否允许为空；是否必须逐条处理才能保存；`AC-10` 的适用时点
- **最终结论**：**候选失败原因允许输出 0 条**；**证据不足时必须明确表达「当前依据不足，暂不推断原因」或等价语义**；**不得为满足数量要求生成低质量 / 低置信候选原因**；**保存 `Formal Attempt` 不要求用户逐条处理全部候选原因**（未处理原因可以 `candidate` 状态保存）；**但未处理原因不得作为已接受依据进入后续复用链路** —— **只有 `accepted` 的决策型 `Inference` 才可以作为已确认判断复用**。
- **核心约束**：
  - **允许 0 条** + 显式说明 → **正常进入第 ⑤ 步（保存）**，**不阻断**。
  - **禁止凑数**：**不得**为凑满 1 条而生成低置信原因；**全流程不出现"低 / 中 / 高置信"类分级措辞**。
  - **保存不要求逐条处理**：允许 0 条 / 部分处理 / 全部未处理即保存。
  - **C-1｜禁止"默认已接受"**：未被用户显式操作的原因**永远处于 `candidate`**；**不得**因"保存了 / 离开了页面 / 超过了某时间"而变成 `accepted`。
  - **C-2｜未处理项不得作为已确认依据复用**：不得进入第 ⑧ 步的"已确认经验"、不得作为 grounding、**不计入 `N_引用`**。
  - **C-3｜未处理状态必须可见且持久**；**不得**把"未处理"渲染成"已记录 = 已确认"。
  - **C-4｜"0 条"与"全部未处理"必须区分**：前者是"没有候选（依据不足）"，后者是"有候选但尚未处理"，**不得共用同一文案**。
  - **C-8｜④ 步候选原因不设产品层数量上限**（由 AI 按实际依据给出）；**每条必须标 `Inference` 且可逐条接受 / 拒绝**；**不得为它引入任何新数字**。
  - 🔴 **`AC-10` 精度修正（唯一归属 = 本项 + `09_TEST_PLAN`）**：把 `09` 中 `AC-10` 的旧表述"未显式接受或拒绝**不得进入下一步**"精确化为 **"未经显式接受或拒绝的决策型 `Inference`，不得被作为『已确认依据』进入后续复用链路，包括：依据 / 门槛 / 版本来源 / 比较输入 / 后续决策依据"**。**特别保持**：**结果状态显式确认**仍是 `Formal Attempt` 成立的**必要条件**；**候选失败原因逐条处理不是保存前置条件**，但**被复用前必须完成处理**。**该修正不修改 `D-014` 本体**；**不得创建第二份 `AC-10` 规则**。
- **主要放弃方案**：① **方案 A（必须至少 1 条）** —— 与 `[D6]` / `§8.4` / `D-026` 冲突、会制造编造压力（用户只有"写一个自己也不同意的原因"或"放弃保存"两个选择）；② **方案 C（允许模型生成低置信原因凑 1 条）** —— 产生"把推断包装成已有解释（违反 `D7` / `D-030`）/ 制造未定义等级（违反 `D-036` / `D-037`）/ 污染后续链路 / 与空态三类出口双重标准 / 属 `D-028` 已禁止的凑数模式"五重风险；③ **P-1（保存前必须逐条处理）** —— 与 `§8.4` / `§8.5` 矛盾、把 ④ 步变成保存强制环节、**违反 `[D4]`**。
- **影响范围**：`04_USER_FLOW.md`（第 ④ 步允许 0 条；第 ⑤ 步可保存未处理 `Inference`）、`05_DATA_MODEL.md`（候选原因的来源属性与状态；"0 条"与"全部未处理"的区分）、`06_AI_CAPABILITIES.md`（A2 / A5）、`08_UI_SPEC.md`（**仅界面约束**）、`09_TEST_PLAN.md`（**`AC-10` 就地精度修正** + `AC-91`–`AC-96`）
- **日期**：2026-09-19
- **状态**：`CONFIRMED`

---

# S00-02 第三批人工决策

- 记录日期：2026-09-17
- 决策来源：项目负责人人工确认（非 AI 提议）
- 状态：全部 `CONFIRMED`
- 来源阶段：S00-02｜V1 核心产品机制收敛（第三批，共 **12 项**）
- **唯一依据**：`docs/analysis/S00-02_V1核心产品机制收敛.md` 的 **§17（统一口径基座）+ §18（第三批最终人工决策包 v2）+ §19（人工确认前最终一致性修正）**。**如历史候选与 §17 / §18 v2 / §19 不一致，以 §17 / §18 v2 / §19 为准。**
- **不得恢复**已标记为 `SUPERSEDED` / **已废止** / **历史方案** / **收敛前版本**的旧规则（废止与替代记账见该文档 **§17.6**）
- 约束：S00-02 **仍未关闭**；**第四批尚未开始**（Q04 / Q12 / Q14 / Q16 / Q27 / Q28 / Q29 / Q31 / 新-2 / **新-7** / **新-10** 仍未确认）
- 影响范围：`01_PRODUCT_DEFINITION.md`（仅必要）、`03_V1_SCOPE.md`、`04_USER_FLOW.md`、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`、`08_UI_SPEC.md`（**仅界面约束，未做 UI 设计**）、`09_TEST_PLAN.md`（已同步）
- 关联文档：`docs/analysis/S00-02-T3A_E4输出契约.md`、`S00-02-T3B_证据与可信度机制.md`、`S00-02-T3C_冷启动与证据量机制.md`

---

## D-027｜E4 输出信息结构

- **Decision ID**：D-027（来源：S00-02，对应 **Q17**）
- **决策主题**：E4 待验证假设的承载结构
- **最终结论**：采用**结构化 E4 输出信息结构**，严格 1:1 对齐 **[D5] 的 8 项**：① 待验证假设 ② 假设依据 ③ 引用的历史 Attempt ④ 下一轮建议改变什么 ⑤ 哪些条件保持不变 ⑥ 观察什么指标 ⑦ 什么结果支持假设 ⑧ 什么结果反驳假设。正式文档统一使用名称「**E4 输出信息结构**」，**不得使用 "Hypothesis Card"** 作为正式机制术语；**该结构仅为信息结构，不等于 UI 组件 / 卡片布局 / 视觉设计已经确定**。
- **核心约束**：
  - **每项标注来源类型**：命题 = `Inference`；②推理链 = `Inference`（其中引用的事实 = `Fact` 引用）；③ = `Fact` 引用；④ = `Inference`；**⑤ 必须拆为三类来源** —— 历史条件值 = `Fact` / `Extraction` 引用、**AI 建议"下一轮保持某条件" = `Inference`**、**用户本人明确指定"保持某条件" = 用户 `Fact`**；**AI 推荐不得写入 `Fact` 层**；⑥⑦⑧ = 用户提供为 `Fact`、AI 提出为 `Inference`（须接受）。
  - **⑥⑦⑧ 按 [D5]"尽可能"处理**：缺失时**显式标注**，不得留空、不得编造。
  - **系统附加语义三项**：**证据概况**（`N_引用` 实际数量 / 单来源提示 / 是否存在冲突 / 条件缺失说明）、**可验证性**、**证据限制提示**；**不得把三者设计成三个独立 UI 组件**；**正式废止"证据强度"作为等级型术语**。
  - **一致性校验**：依据中提及的每条历史事实必须在 ③ 引用清单中可找到；引用清单**不得出现 `Attempt Draft`**；值为「未知 / 未提供」的条件**不得写成"保持不变"**；历史值为未知时只能表述"设定为 Y"。
  - **`Model Suggestion` 复用同一 8 项骨架**，但项 ②③ **整体替换**为「非历史经验依据」标识；无历史时"哪些条件保持不变"须写"无历史条件可固定"，**不得编造条件**。
  - **不出现数字相似度**（D-020）；"历史中已尝试且未达预期"的清单只能作为 ③ 的内部引用细节，**不得成为第 9 个信息项**。
- **主要放弃方案**：①「一句话假设 + 展开详情」（证据链默认不可见，[D9] ⑩ 无法验收）；②「完整实验计划式结构」（引入 [D5] 未确认的"成本 / 作废条件"，属范围扩展）；③ 术语 "Hypothesis Card"（易被读成组件 / 布局决策）。
- **影响范围**：`04_USER_FLOW.md` §2.6、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`（A5）、`08_UI_SPEC.md`（仅界面约束）、`09_TEST_PLAN.md`（AC-31 / AC-32 / AC-53 / AC-60）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-028｜Hypothesis 生成数量

- **Decision ID**：D-028（来源：S00-02，对应 **Q18**）
- **决策主题**：一次生成几条假设
- **最终结论**：**正常可生成状态 = 1–2 条 `History-grounded Hypothesis`**；**不得设置"默认 2 条"**；**数量由"独立可验证方向数"决定**，**不得由 `N_检索` 决定**。**不可达状态允许输出 0 条**，且 **0 条必须按原因分类进入**：**A `evidence-insufficient`** / **B `not-verifiable`** / **C `not-formable`**（**不得把 B / C 误写成历史证据不足**）。
- **核心约束**：
  - **禁止**：凑数、近义改写凑第二条、固定输出两条、**输出 3 条及以上**（S00-01 的"1–3 张假设卡"仍为 `DEFERRED`）。
  - **每条必须**：① 可独立验证；② 有独立 grounding / 证据（各自 `N_引用 ≥ 1`）；③ **可独立接受 / 拒绝**（D-014 决策型）。
  - **始终显示实际数量**，并同时显示各条的**证据概况**。
  - **N = 1 场景**：仅当两个方向可由该 1 条记录独立支持时才输出 2 条，且两条均标 `N_引用 = 1`、均不得一般化。
  - **`Model Suggestion` 数量另计**：**不得用于凑满 `History-grounded Hypothesis` 的数量**，不得填充第 ⑨ 步位置。
- **主要放弃方案**：① 固定 1 条（浪费真实存在的第二个方向）；② 固定 2 条 / 原"默认 2 条"（结构性凑数诱因，已 `SUPERSEDED`）；③ 3 条及以上；④ 按 `N_检索` 决定数量。
- **影响范围**：`04_USER_FLOW.md` §2.6、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`（A5）、`09_TEST_PLAN.md`（AC-34 / AC-35）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-029｜证据不足与降级机制

- **Decision ID**：D-029（来源：S00-02，对应 **Q22**；**同时承载"修正 F"的阶段/表述规则**）
- **决策主题**：什么证据情况下允许生成 `History-grounded Hypothesis`，以及证据不足时如何处理
- **最终结论**：采用「**分级降级 + 显著标注**」，按 `N_检索` 三档规定可输出对象与表述约束；**不足时降级对象或收窄表述，绝不静默、绝不编造**。**冲突证据并置不择一**；**条件缺失收窄表述且不得编造条件**。
- **核心约束**：
  - **`N_检索 = 0`**：**不得生成 `History-grounded Hypothesis`**（对象资格问题）；允许：当前 Attempt 的**完整前半链能力（第 ①②③④⑤ 步）**、**可选** `Model Suggestion`、**仅保存当前 Attempt**、**可选**补录相关历史。**不得**虚构历史、不得暗示有历史依据、**不得把冷启动呈现为系统错误**。
  - **`N_检索 = 1`**：允许**单来源** `History-grounded Hypothesis`；**必须表达"单来源（`N_引用 = 1`），证据有限"**，且**限定当前具体条件**；**禁止一般化**（禁止"方法 X 无效"类结论）。
  - **`N_检索 ≥ 2`**：允许跨记录比较与冲突识别；**不得因数量增加自动提高可信度、不得自动升级为 `Fact`**。
  - **冲突证据**：**不得择一**、**必须并列**、**必须定位差异条件**、**可以转化为条件区分型验证方向**；若**冲突 + 条件缺失导致无法形成方向** → **允许输出为空，但必须显式说明原因，不得静默**。
  - **条件缺失**：允许生成但强制收窄表述（只覆盖已知维度；关键条件全缺时"仅描述已观察到的表现"），必须标注缺失维度（"该维度未比对"），**不得编造条件**；**证据条数与条件完整度是两个独立维度，不得相互替代**。
  - **任何情况下不得静默生成**；`N_检索 = 0` 的"**降级通过**"规则成立：该情形**不视为阻断**。
- **主要放弃方案**：① 硬门控（设 N ≥ 2 / N ≥ 3 门槛 —— 属固定数量阈值 + 把经验层完整性回推为生成层门槛）；② 同强度输出 + 通用免责（抹平"有依据 / 无依据"边界）；③ 用模型先验补足证据（伪造依据）。
- **影响范围**：`04_USER_FLOW.md` §2.6 / §3、`05_DATA_MODEL.md`（证据引用与 `N_引用` 计入规则）、`06_AI_CAPABILITIES.md`（A5）、`08_UI_SPEC.md`（仅界面约束）、`09_TEST_PLAN.md`（AC-36 / AC-41 / AC-42 / AC-43）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-030｜Grounding requirement 与 Reasoning input

- **Decision ID**：D-030（来源：S00-02，对应 **Q23**；**同时承载"修正 F"的来源分区规则**）
- **决策主题**：历史证据与模型通用知识如何共存而不混淆
- **最终结论**：正式区分 **`Grounding requirement`（历史锚定要求，硬条件）** 与 **`Reasoning input`（推理输入，允许）**。`History-grounded Hypothesis` **必须至少存在真实、可追溯的历史 grounding**；**模型先验允许参与推理，但必须独立分区标注**。
- **核心约束**：
  - **正式分区只有两个**：【**历史证据**】【**模型先验**】。**不得使用"混合"作为第三来源类型**；"混合"最多只能描述"两个分区同时存在（已分列）"。
  - **没有真实 grounding → 整个输出只能为 `Model Suggestion`**；**即使用户有历史记录，只要历史没有真正锚定当前 Hypothesis，也不得称为 `History-grounded`**（不构成 grounding 的六类反例：仅写"参考了历史"而无字段可指、引用无关记录、仅措辞相似、关键变量完全来自模型先验、引用 `Draft`、相关字段全为「未知」）。
  - **Grounding 不设"部分锚定"中间等级** —— **要么成立，要么不成立**。
  - **只有对 `Formal Attempt` / 事实字段的可追溯 `Fact` 引用可承担 grounding**；`accepted Insight`（Experience Asset）**即使已被接受也不能承担 grounding**；未接受的 `Candidate Insight` 只能作推理输入，须单独标注、**不计入 `N_引用`**。
  - **措辞**：使用**存在性表述**（"有你的历史记录作为依据"），**禁止排他性 / 全称表述**（"完全基于你的历史记录"）。
  - **属性归属**：两种输出均为 `Inference`（决策型 / 持久化，须显式接受 / 拒绝），**`accepted` 后来源仍为 `Inference`**；`Model Suggestion` **不得升级为 `History-grounded Hypothesis`**。
- **主要放弃方案**：① 只用历史证据（架空 [D5]、不可验证、反向不诚实）；② 混成一段解释（重点否决 —— 来源不可分辨，使 [D9] ⑩ 追溯、D-014 显式接受与对象分离同时失效）；③ 用了模型知识就改名（判据错误，会使 `History-grounded` 几乎不存在）。
- **影响范围**：`04_USER_FLOW.md` §2.6、`05_DATA_MODEL.md`（来源分区与标注义务）、`06_AI_CAPABILITIES.md`（A5）、`08_UI_SPEC.md`（仅界面约束）、`09_TEST_PLAN.md`（AC-36 / AC-37 / AC-40 / AC-46）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-031｜成本信息规则

- **Decision ID**：D-031（来源：S00-02，对应 **Q19**）
- **决策主题**：成本信息是否纳入 E4 输出及如何使用
- **最终结论**：**成本只作 optional context（可选上下文）**。来源**仅允许**：① 用户历史**明确记录**的成本（`Fact` 引用）；② 用户**当前明确提供**的成本（`Fact`）。**无数据时标记"未提供"**。
- **核心约束**：
  - **不得**：AI 凭空估算为事实、成为 Hypothesis 硬条件、成为 Experience Asset 晋升条件、参与相关性判断、自动作为支持 / 反驳判据。
  - **不得回推为记录层必填**（不得因 E4 可能需要成本就要求录入时填写成本）。
  - **AI 提出成本判断**时必须标 `Inference`；若该判断将被后续作为决策依据复用，属决策型 `Inference`，须显式接受 / 拒绝；**不得写成"成本约为 X"这类事实句式**。
  - 若用户明确希望成本作为判据 → **进入 D-032（Q20）机制处理**。
  - **成本不进入 [D5] 的 8 项**。
- **主要放弃方案**：① Hypothesis 固定成本字段（与 [D5] 冲突、迫使编造）；② V1 完全不显示成本（浪费已记录的信息，损失现实可行性判断）。
- **影响范围**：`04_USER_FLOW.md` §2.6、`05_DATA_MODEL.md`（成本字段来源属性）、`06_AI_CAPABILITIES.md`（A5）、`09_TEST_PLAN.md`（AC-52）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-032｜阈值与可验证判据

- **Decision ID**：D-032（来源：S00-02，对应 **Q20**）
- **决策主题**：是否强制数值阈值
- **最终结论**：**不强制数值阈值**。优先顺序：① 有用户已有阈值 → **引用**（`Fact` 引用）；② 无数字但可观察 → **使用可区分定性判据**；③ **AI 可提出候选阈值 / 判据**；④ AI 候选**必须标 `Inference`**；⑤ **用户显式接受后才能作为下一轮判断依据**。**接受后仍为 `Inference`**。
- **核心约束**：
  - **不得把"没有数字"等同于"不可验证"**：可验证性判断取决于**是否存在可观察、可区分的支持 / 反驳判据**。
  - **判据合格性**：第 ⑦ ⑧ 项必须**互斥且可观察**；「效果更好 / 性能提升 / 好像有改善」类**不合格判据等同缺判据**，须显式标注缺失。
  - **缺阈值不得反推为门槛**：不影响 `Formal Attempt` 保存，也不单独构成 E1–E5 不通过的理由。
  - **不得静默**：⑦⑧ 缺内容时必须显式标注"本次未给出可区分的支持 / 反驳判据"。
- **主要放弃方案**：① 每条必须有数值阈值（制造编造压力）；② AI 自动创造阈值并直接使用（把 AI 猜测读成用户事实）。
- **影响范围**：`04_USER_FLOW.md` §2.6、`06_AI_CAPABILITIES.md`（A5）、`09_TEST_PLAN.md`（AC-50）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-033｜候选指标 / 判据机制

- **Decision ID**：D-033（来源：S00-02，对应 **Q21**）
- **决策主题**：没有指标怎么办
- **最终结论**：采用「**候选指标 + 配对候选判据**机制」。AI **可以**提出候选指标、支持判据、反驳判据；**必须**标 `Inference`、**与用户提供的信息分列**、**经用户显式接受后才生效**。**用户接受不把内容变成 `Fact`**（接受动作本身是 `Fact`，候选内容不是用户事实）。
- **核心约束**：
  - **用户始终可以**自己定义 / 修改 / 拒绝 / 跳过；AI 建议**不得成为唯一入口**；拒绝 / 跳过**不阻断**保存与输出。
  - **未接受时不得显示为"已确定判据"**，且不得在后续流程被当作已确认依据复用。
  - **可达性护栏**：候选指标必须落在用户已有数据 / 能力可及范围内；若需用户不具备的测量条件，必须给出替代观察方式或标注"需确认是否可测量"。
  - **不得编造指标**；**AI 自动生成指标并直接使用禁止**。
  - **若完全无法形成可验证指标 → 进入 `not-verifiable`**，显式标注"当前无法形成可验证的观察方式"，该条**不计入 [D9] ⑨ 的"可验证假设"**。
- **主要放弃方案**：① 必须用户自己定义（把 AI 排除在最需要它的环节之外，旧"退回用户定义为主路径"已 `SUPERSEDED`）；② AI 自动生成并直接使用（违反 D-014 / [D7]）；③ 只给定性观察动作（保留为最低兜底，不作主路径）。
- **影响范围**：`04_USER_FLOW.md` §2.6、`05_DATA_MODEL.md`（候选指标 / 判据的来源属性与状态）、`06_AI_CAPABILITIES.md`（A5）、`09_TEST_PLAN.md`（AC-51）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-034｜冷启动总体机制

- **Decision ID**：D-034（来源：S00-02，对应 **Q24**；**同时承载"修正 G"的冷启动规则**）
- **决策主题**：零历史 / 少历史时的产品行为
- **最终结论**：冷启动采用「**能力门控 + 入口可见但明确标注状态（H-2） + 可选补录引导**」。**拒绝用弱版 `Model Suggestion` 填充 `History-grounded Hypothesis` 的位置。**
- **核心约束**：
  - **补录不得成为产品使用前置条件**；**不得存在**补录进度条、解锁式机制、固定数量门槛、"还差 N 条"、"补录 N 条即可"（**"补录 3 次"及一切等价变体正式废止**）。
  - **"≥1 条真正相关且可引用的 `Formal Attempt`"只表示最低来源存在条件** —— 属**必要条件**，**不是**生成 `History-grounded Hypothesis` 的**充分条件**。真正生成仍须满足：① **D-030 grounding 成立**；② **D-032 / D-033 可验证判据成立**；③ 不属于 `not-verifiable`；④ 不属于 `not-formable`；⑤ **N = 1 时遵守禁止一般化规则**。
  - **`N_检索 = 0` 时第 ①②③④⑤ 步必须完整可用**（解析 / **0–3 个关键追问问题** / 候选失败原因 / 明确"下一步观察什么"），**不得因未补录削弱当前可用能力**。
  - **入口可见但显式标注"当前缺少历史来源"及原因**，**不得作为可用动作呈现**，**不得渲染为可触发的空动作**（点了没反应 / 返回"系统错误"）。
  - **补录数据**：不得降低 `Formal Attempt` 门槛；须标注来源性质（**复用既有「数据来源」字段，不新增字段类别**）；"补录"**不得作为相关性维度**；补录产生的 `Formal Attempt` 同等计入 N。
  - **补录引导的唯一规则源 = 本条**（其他章节只能引用，不得创建第二套补录规则）。
- **主要放弃方案**：①「全部能力始终可见 + 证据不足时输出弱版本」（抹平有依据 / 无依据边界）；② 完全隐藏能力入口（长期价值不可见、补录引导无落点）；③ 补录作为前置任务或带阈值的补录。
- **影响范围**：`03_V1_SCOPE.md`、`04_USER_FLOW.md`、`06_AI_CAPABILITIES.md`、`08_UI_SPEC.md`（仅界面约束）、`09_TEST_PLAN.md`（AC-43 / AC-54 / AC-55 / AC-56 / AC-57 / AC-59）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-035｜来源结构档位与 N 两层口径

- **Decision ID**：D-035（来源：S00-02，对应 **Q25**；**同时承载"修正 G"的分档口径**）
- **决策主题**：`N = 0 / N = 1 / N ≥ 2` 的能力边界与 `N` 的口径
- **最终结论**：`N_检索` 三档（0 / 1 / ≥2）**只表示结构可及性 / 来源结构档位**，**不是**可信度等级、证据质量等级或经验等级。
- **核心约束**：
  - **R1｜档位 = 结构可及性**，不是可信度等级：只回答"结构上可不可能产出某类输出"。
  - **R2｜`N` 是必要条件，不是充分条件**：输出质量由**相关性（Level A 命中）× 条件完整度 × 证据一致性**决定；**禁止**把 N 值转述为星级 / 等级 / "证据充足 / 不足"结论。
  - **R3｜口径分层（唯一）**：**`N_检索` = 能力档位**（与当前 Attempt 相关、Level A 命中且可被引用的 `Formal Attempt` 条数）；**`N_引用` = 用户看到的实际证据数量与 [D9] ⑩ 追溯依据**。**历史库"空 / 非空"作为第三个独立状态**，只用于区分冷启动空态。**不得使用经验库总数量替代 `N_检索`。**
  - **R4｜"结构许可" ≠ "必然行为"**：`N ≥ 2` 只表示跨记录比较与冲突识别"可能出现"，**不得**据此自动声称"规律稳定"、不得自动升级为 `Fact`、不得自动提升可信度表述。
  - **三档的中文别名**可采用"来源结构档位"（`无来源 / 单来源 / 多来源`），但**保留 `N_检索 = 0/1/≥2` 记法**以避免版本分叉。
- **主要放弃方案**：① 把三档作为可信度等级；② "库总量"读法（有 20 条历史但无一条相关时会误判为可跨记录比较）；③ N = 5 档位（已取消）；④ 只保留一层 N（必然产生档位与显示不一致，或显示 N 与 ⑩ 追溯清单不一致）。
- **影响范围**：`04_USER_FLOW.md`、`05_DATA_MODEL.md`（`N_检索` / `N_引用` / 历史库空非空三个量的口径与 `N_引用` 角色计入规则）、`06_AI_CAPABILITIES.md`、`09_TEST_PLAN.md`（AC-38 / AC-39 / AC-40 / AC-53）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-036｜来源 / 空态语义标注规则

- **Decision ID**：D-036（来源：S00-02，对应 **Q26**）
- **决策主题**：模型知识与空态的标注规则
- **最终结论**：**当前阶段只锁"语义要求 + 禁止清单"，不锁 exact UI copy**（具体措辞留 `08_UI_SPEC.md`）。
- **核心约束**：
  - **`History-grounded Hypothesis` 必须明确**：使用了用户历史来源、`N_引用`、可追溯 Attempt；N = 1 时必须表达「单来源（`N_引用 = 1`），证据有限」。
  - **`Model Suggestion` 必须整体表达**「**非你的历史经验依据**」的语义（**整体标注，不是小标签**），且与历史依据型输出在**视觉与位置上可区分**；**不得占据历史依据型输出的位置**。
  - **`N_检索 = 0` 必须区分两种空态**：① 用户**整个历史库为空**；② 用户**有历史但本次没有相关历史**。**不得使用同一空态文案**（后者**不得说"你没有历史记录"**）。
  - **不得把冷启动显示为**系统错误 / 生成失败 / 功能缺失。
  - **禁止**用"较可信 / 证据充分"等词替代 `N_引用` 与相关性说明，**禁止使用"低 / 中 / 高证据强度"等措辞**。
- **主要放弃方案**：现在就固定全文案（把机制与界面文案绑死，越出 S00-02「不做 UI 设计」边界，并产生版本分叉）。
- **影响范围**：`08_UI_SPEC.md`（承接 exact wording；**本次仅界面约束**）、`06_AI_CAPABILITIES.md`、`09_TEST_PLAN.md`（AC-55 / AC-53）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-037｜禁止固定"历史够多"阈值

- **Decision ID**：D-037（来源：S00-02，对应 **Q30**；**同时承载"修正 G"的阈值禁止清单**）
- **决策主题**："较多历史"的阈值
- **最终结论**：**不设置"历史够多"的固定阈值**；**始终展示 `N_引用` 实际数量**。
- **核心约束**：
  - **禁止**：`N = 5` 才完整、补录 3 条后解锁、10 条才可信、数量进度条、"还差 N 条"、按数量自动提升可信度、按数量自动提升输出数量、**内部隐藏式加权门槛**。
  - **合法数字只包括三类**：① **存在性下界**（≥1 条，属必要条件）；② **结构档位**（`N_检索 = 0/1/≥2`）；③ **阅读负荷控制**（~~主对照 3 条 / 展开上限 10 条，属 Q14 第四批~~）。
    - 🚩 **本附注已就地更新为指针（`SUPERSEDED` 范围：仅"展开上限 10 条"这一部分；**2026-09-19，Q14 / `D-046` 确认**）**：原文"主对照 3 条 / 展开上限 10 条，属 Q14 第四批"**保留不改**（依「不改写历史」）。**当前有效口径 = `D-046`**：**主对照 3 条属于阅读负荷控制**；**具体"展开上限"不在 `S00-02` 锁定，留 `08_UI_SPEC.md` / 实现阶段处理**。**本项不是重开 `D-037`**，而是**执行该附注自身标注的"属 Q14 第四批待确认"事项**。
  - **不得把上述合法数字重新解释为可信度阈值。**
  - **三档与"不设固定阈值"不矛盾**：三档是**存在性 / 结构性边界**，不是**充分性门槛**；判定用「**三问检验**」（跨越该数字是否自动解锁更强结论类型 / 自动提升可信度表述 / 绑定输出内容量 —— 三问全"否"才合法）。
  - **不得**把 N 渲染为星级 / 等级 / 分数 / 百分比，不得出现经验库规模目标 / 成就 / 排行榜（[R1]）。
- **主要放弃方案**：原 `N = 5`（"≥5 条才算完整孵化"）、"补录 3 次即可 / 达到某数量即解锁"（含其语义模式）、"10 条才可信"、按条数排序 / 打分 / 星级。
- **影响范围**：`04_USER_FLOW.md`、`06_AI_CAPABILITIES.md`、`08_UI_SPEC.md`（仅界面约束）、`09_TEST_PLAN.md`（AC-54 / AC-53）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-038｜E2 / E3 不满足时的 candidate 呈现

- **Decision ID**：D-038（来源：S00-02，对应 **新-3**）
- **决策主题**：第 ⑧ 步 `Insight` 在 E2 / E3 不满足时如何呈现
- **最终结论**：**`Insight` 保持 `candidate`**；必须**显著说明**「**当前还不足以成为可复用经验**」；**同时说明**：① **缺什么**（E2 结论含混 / E3 适用范围不明确）② **为什么重要** ③ **如何补充**。
- **核心约束**：
  - **不得**：静默丢弃、隐藏、自动补字段、自动改写结论、**自动晋升**。
  - **"如何补充"属 AI 建议 / 展示型 `Inference`**（不改变持久化业务状态、不作为后续决策依据复用），必须标为 AI 建议，**不得伪装为用户结论**；**不得绕过 E5**（用户显式接受）。
  - **措辞红线**：不得出现"已证实 / 已验证 / 方法 X 无效"；来源类型恒为 `Inference`。
  - **补录规则统一引用 D-034**，**不得创建第二套补录规则**。
  - 本项**只覆盖"能形成 candidate 但 E2 / E3 不满足"**；"完全无法形成 candidate 命题"（`not-formable`）与"E1 不满足"不在本项（后者由 D-021 覆盖）。
- **主要放弃方案**：① 只写"缺字段"（用户不知道后果与补法）；② 直接不显示 candidate（**与 D-021 冲突**，属静默丢弃变体）。
- **影响范围**：`04_USER_FLOW.md`（第 ⑧ 步候选经验呈现）、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`（A4）、`08_UI_SPEC.md`（仅界面约束）、`09_TEST_PLAN.md`（AC-58）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

---

# S00-02 第二批人工决策

- 记录日期：2026-09-17
- 决策来源：项目负责人人工确认（非 AI 提议）
- 状态：全部 `CONFIRMED`
- 来源阶段：S00-02｜V1 核心产品机制收敛（第二批，共 **11 项**）
- **唯一依据**：`docs/analysis/S00-02_V1核心产品机制收敛.md` 的 **§14 / §15** 最终候选版本。**早期章节中标记为「历史方案 / 已废止 / 收敛前版本」的内容不得重新恢复。**
- 约束：S00-02 **仍未关闭**；**新-2 / 新-3 / Q31 仍未确认**；Q04、Q08 之外的主链细化项与第三批、第四批内容不得据此决策提前固化
- 影响范围：`03_V1_SCOPE.md`、`04_USER_FLOW.md`、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`、`09_TEST_PLAN.md`（已同步）
- 关联文档：`docs/analysis/S00-02_V1核心产品机制收敛.md`（§14、§15、§9.2）

---

## 🚩 第二批定向校正（2026-09-19，BLOCKER）—— 追问预算单位

- **性质**：**已确认决策的错误口径校正**（**不是新增产品决策**）。
- **被校正的范围**：**Q06 / `D-017`** 与 **新-1 / `D-023`** 的"**追问预算单位**"。
- **旧口径（`SUPERSEDED / 已校正`）**：**`max-3-rounds`** —— "最大 3 轮"／"实际允许 0 / 1 / 2 / 3 轮"／"只统计 AI 主动提出的追问回合"／"每轮原则上只处理一个高价值缺口"。
- **新口径（当前有效）**：**`max-3-key-questions-total`** —— **最多 3 个关键追问问题总量（TOTAL）**；**计数单位 = AI 实际提出的"关键追问问题数"，不是对话轮次**；问题**可以逐个对话呈现**；**每个关键追问问题原则上只针对一个主要高价值缺口**；**禁止在一个"问题"里打包多个字段以规避总问题预算**；**达到 3 后不得再提出第 4 个关键追问问题**；达到预算 → 进入结构化确认。
- **Decision ID 不变**：**仍为 `D-017` / `D-023`**；**不新建 `D-049` 或任何新的第二批 `Decision ID`**。
- **连带同步（同口径）**：`D-016`（Q05，0 轮 → **0 个追问问题**）、`D-018`（Q07，**每个关键追问问题只处理一个主要高价值缺口**）、`D-034`（冷启动"0–3 轮追问" → **0–3 个关键追问问题**）。
- **修订历史保留**：**旧口径不删除**（各条目以"口径校正"段落就地记账），**标记 `SUPERSEDED / 已校正`**；**不得静默覆盖**。
- **不重开第二批其它决策**；**P1 / P2 / P3 规则本身不变**（仅统一表述）。
- **背景**：该错误口径来自**早期人工确认提示词**，已随第二批落盘进入 `01` / `03` / `04` / `05` / `06` / `08` / `09` 与项目 Memory —— **本校正必须全库同步，否则任何当前有效位置仍会把"轮次"当作预算单位**。

---

## D-016｜动态追问机制（解析后是否追问）

- **Decision ID**：D-016（来源：S00-02，对应 **Q05**）
- **决策主题**：AI 解析后是否追问
- **最终结论**：采用「**少量、动态追问**」。机制为：`AI 解析 → 检查信息缺口 → 无关键缺口则 0 个追问问题、直接进入结构化确认；有关键缺口则仅追问真正影响后续机制的问题 → 信息达到要求立即停止 → 达到「关键追问问题总量上限 = 3」强制停止并进入结构化确认`。**不得**固定每次都追问、**不得**固定问三个问题、**不得**为追求"信息完整"无限追问。特别确认：**条件与判断依据属于后续比较、边界判断与证据追溯的「重要 / 高影响输入」，不是"唯一输入"**（Q13 已明确第 ⑦ 步使用 Level A 四项）。
  - 🚩 **口径校正（2026-09-19，见 D-017 / D-023 与本文件《第二批定向校正》）：追问的预算单位 = 「关键追问问题数（TOTAL）」，不是「对话轮次」。** 本条的"0 轮追问"**统一读作「0 个追问问题」**；"达到最大轮数强制停止"**统一读作「达到 3 个关键追问问题总量后停止」**。
- **决策理由**：真正会拖垮主链的是"条件"与"判断依据"的缺失，但成本必须按需发生 —— 信息本来就足够的用户不应被追问；固定追问清单在实现上等价于固定追问，与"动态"自相矛盾，且违反 [D4] 低成本复盘。表述上废止"唯一输入"是因为 Q13 已确认第 ⑦ 步使用目标 / 方案 / 条件 / 结果四项，条件只是其中之一。
- **影响范围**：`04_USER_FLOW.md` §2.2、`06_AI_CAPABILITIES.md`（A1 追问策略）、`09_TEST_PLAN.md`（AC-14 / AC-15）、`05_DATA_MODEL.md`
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-017｜关键追问问题总量上限（**原「追问轮数上限」口径已校正**）

- **Decision ID**：D-017（来源：S00-02，对应 **Q06**）
- **决策主题**：关键追问问题的**总量上限**（**预算单位 = 问题数，不是对话轮次**）
- **最终结论**：**关键追问问题总量上限 = 3**（口径名：**`max-3-key-questions-total`**），含义为"**最多 3 个关键追问问题，而不是必须问满 3 个问题**"。
  - **信息足够 → 0 个追问问题**（**合法且期望的结果**）；
  - **按实际缺口提出 1–3 个关键追问问题**；
  - **计数单位 = AI 实际提出的「关键追问问题数」**（**TOTAL**）；
  - **不是对话轮次** —— 问题**可以逐个对话呈现**（一个对话回合呈现一个或多个问题均可），**对话轮次不是预算单位**；
  - **每个关键追问问题原则上只针对一个主要高价值缺口**；
  - **禁止在一个"问题"里打包多个字段**（例如"请补充条件、判断依据和关键参数"）**以规避总问题预算**；
  - **总数达到 3 后，不得再提出第 4 个关键追问问题**；
  - **达到预算后进入结构化确认**。
  - 用户始终可以选择「**跳过 / 不知道 / 就这样继续**」，且**不得因此阻断流程**；**用户主动补充的信息不计入 AI 的问题预算**。
- **决策理由**：3 的本质是**防止追问退化为问卷的护栏**（控制用户成本），而不是任务量。**以"问题数"而非"轮次"计量，才能真实约束用户成本** —— 轮次可被"一个回合问三个问题"绕过，而**问题总数不可被绕过**；**"禁止在一个问题里打包多个字段"是维持该预算不被规避的必要配套**。若语义不修正，实现与验收会退化为"固定三轮问卷"，直接与 Q05 的动态机制和 [D4] 冲突。**3 这个数值本身无需重新论证，本次改动只在"预算单位"（轮次 → 问题数）。**
- **口径校正（2026-09-19，BLOCKER）**：本条**旧口径 `max-3-rounds`（"最大追问轮数 = 3"／"实际允许 0 / 1 / 2 / 3 轮"／"每轮原则上只处理一个高价值缺口"／"只统计 AI 主动提出的追问回合"）已标记 `SUPERSEDED / 已校正`**，**不再作为当前有效口径**；新口径 = **`max-3-key-questions-total`**。**Decision ID 不变（仍为 D-017）** —— 这是**同一已确认 Decision 的错误口径校正**，**不是新增产品决策**（**不新建 `D-049` 或任何新的第二批编号**）。
- **影响范围**：`01_PRODUCT_DEFINITION.md`（追问预算口径）、`03_V1_SCOPE.md`（不做项措辞）、`04_USER_FLOW.md` §2.2、`06_AI_CAPABILITIES.md`（A1 追问策略）、`08_UI_SPEC.md`（**仅界面约束**）、`09_TEST_PLAN.md`（AC-14 / AC-15 / AC-16 + 新增追问预算验收点）
- **日期**：2026-09-17（原确认）／**2026-09-19（口径校正）**
- **状态**：`CONFIRMED`（**口径已校正**：旧 `max-3-rounds` = **`SUPERSEDED`**）

## D-018｜追问的动态缺口优先级

- **Decision ID**：D-018（来源：S00-02，对应 **Q07**）
- **决策主题**：AI 应该追问什么
- **最终结论**：**不建立固定追问问题清单**，采用动态缺口优先级 ——
  - 🚩 **口径校正（2026-09-19，见 D-017 / D-023）：P1 / P2 / P3 规则本身不变**；仅统一表述 —— **每个关键追问问题原则上只处理一个主要高价值缺口**（**不再使用"每轮处理一个缺口"的说法**，因为**预算单位是问题数，不是轮次**）；**禁止把多个缺口打包进一个问题以规避 3 个问题的总预算**。
  - **P1｜`Formal Attempt` 必备事实缺口**：**目标 / 实际尝试 / 实际结果**；无法从用户原文获得时**优先追问**。**结果状态不属于 P1 事实追问**：由 AI 提出候选，属**决策型 `Inference`**，在结构化确认阶段由用户**显式接受 / 修改**。
  - **P2｜高影响但允许未知**：**条件 / 判断依据**；**应尽量补齐**，但用户可以「不知道 / 跳过」，**缺失不得阻断 `Formal Attempt` 保存**。
  - **P3｜必要时才追问**：**关键参数 / 用户主动提到但表达不清楚的关键变化**；**只有真正影响当前 Attempt 理解时**才追问。
  - **M2 阶段固定禁止追问**：与历史 Attempt 的差异、"上一次做了什么"、最近一次相似 Attempt、其他历史对照类问题 —— 统一留到 **M4 / [D9] 第 ⑥⑦ 步**。
- **决策理由**：追问必须与其后果对齐（P1 缺失阻断保存门槛、P2 缺失影响比较与晋升质量但不阻断保存、P3 通常只影响细节理解），这是"追问必须有理由"的最低要求（[D7][R6]）。原"三字段固定清单"会被实现为固定追问，与 Q05 直接冲突；历史对照类问题在 M2 阶段逻辑上不可能正确（第 ⑥ 步尚未发生）。
- **影响范围**：`04_USER_FLOW.md` §2.2、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`、`09_TEST_PLAN.md`（AC-18 / AC-19 / AC-20）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-019｜相关历史 Attempt 的三级相关性机制

- **Decision ID**：D-019（来源：S00-02，对应 **Q13**）
- **决策主题**：什么叫"相关历史 Attempt"
- **最终结论**：采用**三级结构** ——
  - **Level A｜核心相关性**：**目标 / 实际尝试·方案·技术对象 / 条件 / 结果·现象**。**只有 Level A 可以用于判断某条历史 Attempt 是否值得进入主要比较集合。**
  - **Level B｜辅助相关性**：**Project / 用户标签 / 版本·环境 / 语义相似**。**只能增强或解释**，**不得单独决定"这是一条相关经验"**。
  - **Level C｜排序辅助**：**时间**。**只能在相关性已经接近的情况下辅助排序**；**不得**默认选择"最近一次"，**不得**因时间近而把不相关 Attempt 排到前面。
  - 相关性判断属 **`展示型 Inference`**，必须继续遵守 D-014：标记为 AI 判断、不要求逐条确认、可反馈"不相关"、**未反馈不等于已确认**、**不得自动升级为 Experience Asset**。
- **决策理由**：平铺维度会必然导致"同 Project 即相关"（污染比较集合）与"最近一次即相关"（与 S00-01 的 `DEFERRED` 冲突）；差异点只有在 Level A 维度上才有解释力，与 [D9] 第 ⑦ 步"同时展示相似点与差异点"直接匹配。本分级属产品逻辑层，不绑定检索技术（[R3]）。
- **影响范围**：`04_USER_FLOW.md` §2.4、`05_DATA_MODEL.md`（相似关系判定依据，仅产品逻辑）、`06_AI_CAPABILITIES.md`（A3）、`09_TEST_PLAN.md`（AC-22 / AC-23）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-020｜不显示数字相似度

- **Decision ID**：D-020（来源：S00-02，对应 **Q15**）
- **决策主题**：是否向用户显示数字相似度
- **最终结论**：**V1 不向用户显示任何形式的数字相似度** —— 包括**百分比、0–1 分数、星级、综合相似分**。改为展示「**可解释的匹配理由**」（目标相近 / 方案相同 / 条件不同 / 结果表现相似 / 同属一个 Project（辅助））。**即使未来内部技术实现存在数值，也不得因此自动呈现给用户** —— **内部检索值 ≠ 用户界面事实**。
- **决策理由**：数字会让用户把包含 AI 语义判断的相关性误读为"客观、精确的统计事实"，直接违反 [D7]；且会让用户跳过相似点 / 差异点的阅读，削弱 [D9] 第 ⑦⑩ 步的价值。一个数值也无法表达 D-019 的 A / B / C 分级。
- **影响范围**：`04_USER_FLOW.md` §2.4、`06_AI_CAPABILITIES.md`（A3）、`08_UI_SPEC.md`（呈现要求）、`09_TEST_PLAN.md`（AC-24）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-021｜Experience Asset 晋升的 E1–E5 五项硬条件

- **Decision ID**：D-021（来源：S00-02，对应 **Q10**）
- **决策主题**：什么时候一个 Insight 能成为 Experience Asset
- **最终结论**：使用 **E1–E5 五项硬条件**替代原 C1 / C2 / C3 ——
  - **E1｜有效来源**：Insight 至少关联 **≥ 1 条 `Formal Attempt`**；**`Draft` 不得直接成为 Experience Asset 的来源**。
  - **E2｜结论明确**：必须能形成**明确、可理解的经验命题**；**不能**是"感觉有问题 / 可能不太好 / 好像失败了"等模糊表达。
  - **E3｜适用范围明确**：至少能说明"**在当前已知哪些条件下观察到了该经验**"；**关键条件完全缺失时，Insight 保持 `candidate`**，不得成为 Experience Asset。
  - **E4｜证据可追溯**：必须明确指向 **① 哪些 `Formal Attempt`；② 哪些事实字段；③ 若存在跨记录比较，则使用了哪些比较结果**。
  - **E5｜用户显式接受**：必须 `Insight.status = accepted`；未经用户显式接受不得成为 Experience Asset。
  - **C4′（跨记录对照）与 C5′（后续被检索 / 引用）仅作为增强信息**（C5′ 为事后增强信息）；**不作硬门槛、不打分、不设高 / 中 / 低经验等级**。
  - **E4 特别确认**：**跨记录比较不是硬门槛**；**N = 1 仍允许形成"当前具体条件下的局部经验"**，但必须继续遵守 D7：**不得产生一般性规律**。
  - **C6 保持**：单条普通操作错误**默认不得自动晋升**；但多条普通操作错误**可以参与跨 Attempt 分析并生成新的 `Candidate Insight`**。
- **决策理由**：记录层的完整性已由 D-012 的 `Formal Attempt` 解决；原 C1 的"至少 3 项有值"是计数式门槛，取向与 [D7] 相反（会放过"信息齐全但结论含混"，却拦下"条件不全但结论明确且已标注范围"的经验），并隐含"凑项数"导向，属 [R1] 所反对的价值量化。新增 E2 / E4 补上"含混结论"与"不可审计来源"两个漏洞；E4 改为条件式表述以避免把跨记录比较变成隐性硬门槛。
- **影响范围**：`04_USER_FLOW.md` §2.5、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`（A4）、`09_TEST_PLAN.md`（AC-25 / AC-26 / AC-29）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-022｜Candidate Insight 只在主链第 ⑧ 步生成

- **Decision ID**：D-022（来源：S00-02，对应 **Q11**）
- **决策主题**：什么时候生成 `Candidate Insight`
- **最终结论**：**V1 只在 [D9] 第 ⑧ 步正式生成 `Candidate Insight`**，并在同一步让用户 **接受 / 修改 / 拒绝** → `accepted` → Experience Asset。流程为：`Formal Attempt + 历史 Attempt 对照 → 第 ⑧ 步 AI 提炼 Candidate Insight → 检查 E1–E4 → 用户接受 / 修改 / 拒绝 → accepted → Experience Asset`。**V1 不做**：后台自动生成、保存后自动生成、异步批量生成、定期知识挖掘、Candidate 待办池。**这些留待未来版本。**
- **决策理由**：提前 / 自动生成会引入六项成本（后台生成机制、candidate 列表管理、待处理堆积、状态同步去重、用户理解成本、额外工程量），其中"待办堆积"与 [D4] 冲突；而 [D9] 第 ⑧ 步本来就是自然的生成时机 —— 用户此刻正在读对照结果、正关心"这几次尝试说明了什么"，接受 / 拒绝的判断成本最低，且生成与接受同屏完成、**不额外增加操作步骤**。
- **影响范围**：`04_USER_FLOW.md` §2.5、`05_DATA_MODEL.md`（`Insight` 生成来源）、`06_AI_CAPABILITIES.md`（A4）、`09_TEST_PLAN.md`（AC-30）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-023｜追问停止条件（废止计数式门槛；**停止条件 B 的口径已校正**）

- **Decision ID**：D-023（来源：S00-02，对应 **新-1**）
- **决策主题**：追问的停止条件
- **最终结论**：**废止**原"条件 / 方案 / 结果 / 判断依据**四项至少三项有值**"这一计数式规则。采用：**满足以下任一条件即停止追问（并进入结构化确认）**——
  - **条件 A**：当前**不存在仍值得继续追问的 `P1` / `P2` 关键缺口**；
  - **条件 B**：**已达到「3 个关键追问问题总量」**（口径名 **`max-3-key-questions-total`**，见 **D-017**；**预算单位 = 问题数，不是对话轮次**）；
  - **条件 C**：**用户选择「跳过 / 不知道 / 就这样继续」**。
- **特别规则**（本轮校正后为完整版）：
  1. **P2 允许未知** —— 对用户已明确选择「不知道 / 跳过」的 P2，**不得再次追问同一缺口**，**不得阻断 `Formal Attempt` 保存**；
  2. **P2 / P3 未解决** → 记为「**Unknown / 未提供**」，**不阻断 `Formal`**（依 D-012 的可缺省字段与 D-026 的保存门槛）；
  3. 🔴 **若 `P1`（目标 / 实际尝试 / 实际结果）仍未建立，即使追问问题预算已经用完，也只能进入确认 / 暂存，`Attempt` 保持 `Draft`，不得伪装成 `Formal`**（依 D-012 的四项门槛）；
  4. **结果状态仍由「AI 给候选 + 用户在结构化确认阶段显式接受 / 修改」确定**（决策型 `Inference`，D-014 / D-018）；**不得把结果状态算成"通过追问补齐 P1"**。
- **决策理由**：计数式阈值与 D-016 的动态缺口机制、D-021 弃用 C1 计数逻辑口径冲突；且它制造"凑项数"导向，属 [R1] 所反对的价值量化变体。是否继续追问应由"**缺口是否关键**"决定，而不是由"凑够几项"决定。**校正后的条件 B 把预算单位从"轮次"改为"问题数"，使"控制用户成本"这一目的真正可验收；同时第 3 条特别规则保证"预算用完"不会反向削弱 `Formal Attempt` 的门槛。**
- **口径校正（2026-09-19，BLOCKER）**：本条**旧口径（"条件 B：达到最多 3 轮"）已标记 `SUPERSEDED / 已校正`**，**不再作为当前有效口径**；**Decision ID 不变（仍为 D-023）**；**不是新增产品决策**。请与 **D-017** 的校正一并阅读（**两者必须同口径，不得各自保留一版**）。
- **影响范围**：`04_USER_FLOW.md` §2.2、`06_AI_CAPABILITIES.md`、`09_TEST_PLAN.md`（AC-17 / AC-19 + 新增追问预算验收点）
- **日期**：2026-09-17（原确认）／**2026-09-19（口径校正）**
- **状态**：`CONFIRMED`（**口径已校正**：旧 "达到最多 3 轮" = **`SUPERSEDED`**）

## D-024｜追问答案的来源分层

- **Decision ID**：D-024（来源：S00-02，对应 **新-4**）
- **决策主题**：追问答案的来源属性
- **最终结论**：用户在追问中的**原始回答 = `Fact`**；AI 对回答进行的**结构化归纳 = `Extraction`**。并且：**`Extraction` 用户可修改**；**不得把用户原话标成 `Inference`**；**不得把 AI 归纳标成 `Fact`**。
- **决策理由**：依 [D7]，三层内容必须严格分离。若不定义，追问环节会成为"AI 推断混入用户事实"的新入口，损害本产品的可信度根基。
- **影响范围**：`04_USER_FLOW.md` §2.2、`05_DATA_MODEL.md`（追问答案的来源属性）、`06_AI_CAPABILITIES.md`、`09_TEST_PLAN.md`（AC-21）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-025｜未知字段不参与相关性判断

- **Decision ID**：D-025（来源：S00-02，对应 **新-5**）
- **决策主题**：未知字段参与相关性判断的规则
- **最终结论**：当字段值为「**未知 / 未提供**」时 —— ① **不参与 Q13 的相关性判断**；② **双方都未知也不得判为相似**；③ **比较结果中必须明确标记"该维度未比对"**。**不得静默当作相同、不同或相似。**
- **决策理由**：两个"未知"相等并不构成相似，把它当作相似会凭空制造相关性（违反 [D7]）；反之若静默跳过，用户会误以为该维度已比较且相同。本规则与 D-012「缺省必须显式保存为「未知 / 未提供」」形成闭环 —— 正因为它被显式保存，才能被显式排除。
- **影响范围**：`04_USER_FLOW.md` §2.4、`05_DATA_MODEL.md`（未知状态与相似关系）、`06_AI_CAPABILITIES.md`（A3）、`09_TEST_PLAN.md`（AC-23）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-026｜保存门槛 ≠ 晋升门槛

- **Decision ID**：D-026（来源：S00-02，对应 **新-6**）
- **决策主题**：`Formal Attempt` 保存门槛与 Experience Asset 晋升门槛的区分
- **最终结论**：**正式区分两个层级的门槛** ——
  - **`Formal Attempt` 保存门槛**：解决"**这次尝试是否已经可以成为正式 Attempt**"；**条件字段可以缺省**（缺省时按 D-012 显式保存为「未知 / 未提供」）。
  - **Experience Asset 晋升门槛**：解决"**这条 Insight 是否已经具备可复用经验的条件**"；**若关键条件缺失导致适用范围无法明确，则 Insight 保持 `candidate`，不得成为 Experience Asset**（D-021 E3）。
  - 因此「条件允许缺省保存」与「条件不足可能阻止经验晋升」**不冲突** —— 这是两个不同层级的门槛。
- **决策理由**：两个门槛作用于不同层级、判定不同问题。**该结论明确排除"Q02 与 Q10 冲突"的解释**，同时防止把经验层的完整性要求反向施加到记录层（若反向施加，等于把"条件"变成 `Formal Attempt` 必填，违反 D-012 与 [D4]）。
- **影响范围**：`04_USER_FLOW.md` §2.2 / §2.5、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`、`09_TEST_PLAN.md`（AC-29）
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

---

# S00-02 第一批人工决策

- 记录日期：2026-09-17
- 决策来源：项目负责人人工确认（非 AI 提议）
- 状态：全部 `CONFIRMED`
- 来源阶段：S00-02｜V1 核心产品机制收敛（第一批，共 5 项）
- 约束：本组为**第一批**；Q04–Q07、Q10–Q31 尚未确认，仍为 `PROPOSED / 需人工确认`
- **状态更新（2026-09-17，第二批确认后）**：**Q05 / Q06 / Q07 / Q13 / Q15 / Q10 / Q11 + 新-1 / 新-4 / 新-5 / 新-6 已确认**，见上文《S00-02 第二批人工决策》D-016–D-026。**仍未确认**：Q04 / Q12 / Q14 / Q16–Q31、新-2、新-3
- 阶段状态：`S00-02 = IN PROGRESS / PARTIALLY CONFIRMED`（**未关闭**）
- 影响范围：产品定义、V1 范围、用户流程、数据模型、AI 能力、测试计划
- 关联文档：`docs/analysis/S00-02_V1核心产品机制收敛.md`（§9.0、§13.3）

---

## D-011｜录入范式：自然语言输入 + AI 结构化确认

- **Decision ID**：D-011（来源：S00-02，对应 Q01）
- **决策主题**：用户录入范式
- **最终结论**：采用**方案 C：自然语言输入 + AI 结构化确认**。用户首先用自然语言描述一次未达到预期的尝试，AI 再进行结构化解析，用户可以修改 / 确认解析结果。**不得把结构化表单作为第一入口。**
- **决策理由**：[D9] 第 ③ 步（用户可修改/确认解析结果）与第 ⑤ 步（确认后保存）已经要求"解析 + 确认"这一结构；[D4] 明确不以"填写档案"为用户心智。方案 C 是唯一同时满足 [D4] 与 [D9] 的形态。
- **影响范围**：`01_PRODUCT_DEFINITION.md`、`04_USER_FLOW.md`、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`、`08_UI_SPEC.md`
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-012｜Attempt Draft / Formal Attempt 两级机制

- **Decision ID**：D-012（来源：S00-02，对应 Q02）
- **决策主题**：保存门槛与两级状态
- **最终结论**：系统区分两级状态——
  1. **`Attempt Draft`**：只要用户产生了原始输入即可暂存；可以字段不完整；可以中断后继续；**不进入正式历史比较**；**不参与经验资产晋升**；**不参与正式 E4 历史孵化**。
  2. **`Formal Attempt`**：至少必须具备 **目标、实际尝试、实际结果、用户确认后的结果状态**。其中**结果状态属于 `Inference`，必须由用户显式确认**。允许缺省的字段为 **条件、判定依据、版本 / 环境**，缺省时必须显式保存为「**未知 / 未提供**」。**不得因为缺少可选字段自动删除 Draft。**
  特别确认：**「实际尝试」本身为 `Formal Attempt` 必备项**；**只有「关键参数」是可选项，不作为 `Formal Attempt` 保存门槛。**
- **决策理由**：原"原文 + 目标 + 实际结果"作为正式门槛过宽——缺少"用户确认后的结果状态"，[D10] 的四态无从确定，[D9] ⑥⑦ 的历史比较与 M5 的证据判定都会失去锚点。同时 [D4] 要求记录压力低，因此需要保留一个无需任何确认即可落地的 Draft 层；且不得以"信息不全"为由丢弃用户输入。
- **影响范围**：`03_V1_SCOPE.md`、`04_USER_FLOW.md`、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`、`09_TEST_PLAN.md`
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-013｜Attempt 字段框架

- **Decision ID**：D-013（来源：S00-02，对应 Q03）
- **决策主题**：V1 字段体系与"失败类型"的位置
- **最终结论**：V1 采用当前 M1 字段框架。P0 核心字段结构为——
  | 分组 | 字段 |
  |---|---|
  | 原始信息 | 用户原始描述 |
  | **Formal Attempt 必备** | 目标、实际尝试、实际结果、结果状态 |
  | 重要但允许未知 | 条件、预期结果、判断依据、关键参数 / 用户主动提及的关键变化 |
  | 系统自动 | 创建时间、数据来源、AI 内容来源标记 |
  | 可选 | Project、版本 / 环境、用户备注、成本、失败类型标签 |

  特别确认：V1 **不建立固定"失败类型分类体系"作为 P0 必填字段**。如保留失败类型，**只作为 optional tag / 可选标签**。**不得**建立失败价值排行榜；**不得**用失败类型决定是否保存 Attempt；**不得**将原 S00-01 的 10 类分类自动恢复为正式产品定义。
- **决策理由**：字段分层直接支撑 [D4]（低记录成本）与 [D12]（两级保存门槛）；[R1] 已否定价值排序，因此失败类型不得作为必填或分级依据；真正影响主链的是"条件"与"判定依据"，而非分类。
- **影响范围**：`05_DATA_MODEL.md`、`04_USER_FLOW.md`、`06_AI_CAPABILITIES.md`、`03_V1_SCOPE.md`
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-014｜Inference 确认边界（展示型 / 决策型二分）

- **Decision ID**：D-014（来源：S00-02，对应 Q08）
- **决策主题**：`Inference` 的确认要求边界
- **最终结论**：必须区分两类 `Inference`——
  - **A. 展示型 `Inference`**：相关性判断、相似点、差异点、检索排序理由、对照价值判断、置信提示、比较维度判断。规则：**必须明确标记为 AI 判断 / `Inference`**；**不得伪装为 `Fact`**；**不要求用户逐条显式确认**；用户可以反馈"不相关 / 不同意"；**用户没有反馈不得视为已确认**；**不得自动升级为 Experience Asset**。
  - **B. 决策型 / 持久化 `Inference`**：结果状态、候选失败原因、`Candidate Insight` 是否被接受、Experience Asset、`History-grounded Hypothesis`、其他会被系统后续作为正式决策依据复用的 AI 判断。规则：**必须由用户显式接受或拒绝**；接受后状态可为 `accepted`；**`accepted` 后来源仍为 `Inference`，不得升级为 `Fact`**；**不得使用"已证实"等措辞**。
  - **核心判断原则**：是否需要用户显式确认，**不只取决于"是不是 AI 推断"**，而取决于该推断 ① 是否改变持久化业务状态；② 是否会被后续作为决策依据复用。
- **决策理由**：修正前的表述"所有影响原因/经验/假设/跨记录结论的 `Inference` 都必须显式接受或拒绝"与 [D9] 第 ⑦ 步（相似点/差异点为 AI 判断、无需逐条确认）直接冲突；一刀切确认会把比较视图变成逐条点选，既违反 [D4] 的使用成本底线，也无法区分"仅供理解"与"会改变业务状态"的判断。
- **影响范围**：`04_USER_FLOW.md`、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`、`09_TEST_PLAN.md`、`08_UI_SPEC.md`
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

## D-015｜Attempt / Insight 产品概念与状态机

- **Decision ID**：D-015（来源：S00-02，对应 Q09）
- **决策主题**：产品概念层与 Experience Asset 的定义
- **最终结论**：V1 产品概念层采用两个核心概念：**`Attempt`** 与 **`Insight`**。其中 `Insight.status` 至少包括 **`candidate` / `accepted` / `rejected`**；未来可扩展 **`superseded` / `invalidated`**。**Experience Asset 不作为第三个独立事实对象**，其定义为：**`Experience Asset = accepted Insight 的产品视图 / 业务称呼`**。特别确认：**`accepted` 只表示"用户接受该 Insight 作为当前可复用经验"，不表示"该结论已经客观证实"**；Experience Asset 的来源类型**仍保持 `Inference`，不得转为 `Fact`**。
- **决策理由**：三个独立对象会抬高 V1 的界面与状态管理成本；完全去掉 `Insight` 承载又违反 [D7]（跨记录判断必须可作为对象存在并可追溯）。两概念 + 状态机兼顾可信度与 10 天可行性；且因"接受 ≠ 客观证实"，无需为"已证实"另建对象。
- **影响范围**：`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`、`04_USER_FLOW.md`、`03_V1_SCOPE.md`
- **日期**：2026-09-17
- **状态**：`CONFIRMED`

---

# S00-01 人工关键决策

- 记录日期：2026-09-17
- 决策来源：项目负责人人工确认（非 AI 提议）
- 状态：全部 `CONFIRMED`
- 约束：本节内容后续不得再作为待讨论议题重开；如需变更须新建决策条目并说明理由
- 影响范围：产品定义、用户与场景、V1 范围、用户流程、数据模型、AI 能力、测试计划
- 关联文档：`docs/analysis/S00-01_赛题语义拆解.md`、`docs/analysis/S00-01_状态校正表.md`

---

## D1｜V1 核心用户

- **决策主题**：V1 核心用户定义
- **最终结论**：V1 的核心用户为"高校科研与创新项目中的个人执行者"，以大学生为主要用户。典型用户包括：科研训练项目成员、大学生创新项目成员、科研/创新竞赛中的实际执行者、毕业设计或课题中的实验执行者，以及需要持续进行实验、调参、方案验证与迭代的个人。**核心判断标准不是其是否属于某个团队，而是其本人是否正在直接执行实验、方案、参数调整、技术尝试或验证任务。** V1 不以"整个团队"或"项目负责人"作为第一用户。
- **决策理由**：真实执行者是失败信息的第一现场持有者，也是记录成本的主要承担者；以个人执行者为第一用户可使记录动机与产品价值直接对齐，避免 V1 陷入团队协作的复杂度。
- **影响范围**：`01_PRODUCT_DEFINITION.md`（目标用户、一句话定位）、`02_USER_AND_SCENARIO.md`（用户画像、非目标用户）、`03_V1_SCOPE.md`、`04_USER_FLOW.md`、`08_UI_SPEC.md`
- **状态**：`CONFIRMED`
- **日期**：2026-09-17

## D2｜失败记录的最小单位

- **决策主题**：记录粒度与实体定义
- **最终结论**：系统最小记录单位统一定义为 `Attempt（尝试）`。Attempt 定义：**一次围绕明确目标，在特定条件下实施某个方案，并产生可观察结果的行动单元。** 项目与 Attempt 的关系为一个 Project 下含多条 Attempt。禁止把整个项目、整段科研经历、整个课题直接等同于一条失败记录。不同参数、不同方法、不同条件下重新执行一次，应视情况形成新的 Attempt。
- **决策理由**：只有到"一次尝试"这一粒度，目标、条件、方案、结果四要素才同时可描述；更粗的粒度会导致条件丢失、结论无法复用。
- **影响范围**：`05_DATA_MODEL.md`（核心实体名称由"失败记录 / FailureEntry"改为 `Attempt`）、`04_USER_FLOW.md`（录入单位）、`02_USER_AND_SCENARIO.md`、`06_AI_CAPABILITIES.md`（解析对象）
- **状态**：`CONFIRMED`
- **日期**：2026-09-17

## D3｜V1 使用模式

- **决策主题**：个人工作空间边界
- **最终结论**：V1 采用**个人工作空间优先模式**，层级为 `User → Personal Workspace → Project → Attempt`。Project 可以存在，用于组织上下文。以下内容全部不属于 V1：团队成员系统、成员邀请、角色管理、权限系统、管理员体系、协同编辑、团队工作区、复杂组织结构。未来可以扩展团队能力，但不得进入当前 V1。
- **决策理由**：团队能力对 10 天开发周期是不可控风险，且会稀释核心闭环；个人工作空间已足以承载"失败经验资产化"的完整价值。
- **影响范围**：`03_V1_SCOPE.md`（Out of Scope 明确清单）、`05_DATA_MODEL.md`（Workspace / Project 归属）、`08_UI_SPEC.md`、`07_TECH_ARCHITECTURE.md`
- **状态**：`CONFIRMED`
- **日期**：2026-09-17

## D4｜用户第一次使用产品的即时价值

- **决策主题**：入口心智与价值分层
- **最终结论**：用户不是为了"记录失败"而第一次使用产品，而是为了"**理解刚刚发生的失败，并找到下一步值得验证的方向**"。必须区分：即时价值 = 帮助用户快速复盘当前未达到预期的尝试，并判断下一步应该验证什么；长期价值 = 将一次次失败尝试逐渐沉淀为可检索、可比较、可复用的个人经验资产。产品不应把"填写档案"作为主要用户心智，入口心智应接近"**刚刚哪里没有达到你的预期？**"，随后由 AI 帮助用户完成结构化整理。
- **决策理由**：记录行为本身没有即时回报，若以"建档"为入口，用户会在第一步流失；以"刚发生的失败"为入口，记录成本与用户当下需求重合。
- **影响范围**：`01_PRODUCT_DEFINITION.md`（核心价值表述）、`04_USER_FLOW.md`（主流程入口）、`08_UI_SPEC.md`（首页/录入页）、`06_AI_CAPABILITIES.md`（A1 解析触发方式）
- **状态**：`CONFIRMED`
- **日期**：2026-09-17

## D5｜V1 核心孵化形式

- **决策主题**：孵化能力范围锁定
- **最终结论**：V1 唯一核心孵化能力采用 **`E4：待验证假设生成`**，不是简单生成"建议"。系统应尽可能输出：待验证假设、假设依据、引用了哪些历史 Attempt、下一轮建议改变什么、哪些条件应保持不变、应观察什么指标、什么结果支持假设、什么结果反驳假设。核心逻辑：历史失败 + 当前问题 → 相关历史检索 → 已尝试/已排除信息 → 形成候选假设 → 生成下一轮验证方向。E1、E2、E3、E5、E6、E7 等能力**暂不作为 V1 独立核心功能**。
- **决策理由**：只有"可验证的假设"同时具备可证伪性与可追溯性，才能把失败经验真正转化为下一步行动，而不是另一种建议流。
- **影响范围**：`03_V1_SCOPE.md`、`04_USER_FLOW.md`（2.6）、`06_AI_CAPABILITIES.md`（A5）、`08_UI_SPEC.md`（结果呈现）、`09_TEST_PLAN.md`（TC-01）
- **状态**：`CONFIRMED`
- **日期**：2026-09-17

## D6｜什么失败值得记录

- **决策主题**：失败纳入标准
- **最终结论**：一次 Attempt 是否值得进入经验资产层，不简单依赖"严重失败"或"普通错误"的标签。**核心 Attempt 至少应具备：明确目标、实际尝试、可观察结果、实际结果与预期之间存在可描述差异。** 普通操作错误可以保存为 Attempt，但默认不自动晋升为高价值经验资产。例如"路径写错"可以被记录，但单次路径错误通常不应直接被提炼为重要科研规律。如果相似问题多次发生，则可能暴露系统性流程问题，因此**不能在数据层直接删除**。
- **决策理由**：自动过滤普通错误会同时丢失"系统性流程问题"的证据；采用"记录但不自动晋升"的两级处理，既能保留证据又不会污染高价值经验层。
- **影响范围**：`05_DATA_MODEL.md`（Attempt 必备字段、经验资产晋升标记）、`06_AI_CAPABILITIES.md`（A2/A4）、`04_USER_FLOW.md`（录入引导）
- **状态**：`CONFIRMED`
- **日期**：2026-09-17

## D7｜AI 推断与人工确认边界

- **决策主题**：内容可信度分层与 AI 权限边界
- **最终结论**：系统必须严格区分三类内容——
  1. **`Fact｜用户事实`**：用户明确提供的信息（如"验证集准确率为 72%"）。AI 不得修改其事实含义。
  2. **`Extraction｜AI 结构化解析`**：AI 基于用户原始输入进行的整理、归纳、字段抽取（如"实际结果：模型未达到预设的 80% 准确率目标"）。允许 AI 自动生成，但应允许用户修改。
  3. **`Inference｜AI 推断`**：包括可能失败原因、跨记录规律、因果判断、经验结论、新假设、下一步方案。AI 可以生成，但**必须明确标记为 AI 推断 / 候选结论 / 待确认 / 待验证，不得伪装成用户事实**。

  同时确认：**所有跨记录产生的新判断统一属于 `Candidate Insight`，而不是 Fact**（多条 Attempt → AI 比较 → Candidate Insight → 用户确认 / 后续验证；禁止"多条记录 → AI 判断 → 直接变成事实"）。**N = 1 的单次失败不支持得出"一般性无效"结论**：单条 Attempt 最多支持"在当前记录的具体条件下，该方案没有达到预期"，不得自动扩大成"方法 X 无效"。
- **决策理由**：这是本产品可信度的根本约束；一旦 AI 推断被当作事实使用，系统带来的危害会大于价值。
- **影响范围**：`06_AI_CAPABILITIES.md`（全部能力）、`05_DATA_MODEL.md`（字段级来源标记）、`08_UI_SPEC.md`（展示区分）、`09_TEST_PLAN.md`（AI 输出质量评估）、`04_USER_FLOW.md`（确认环节）
- **状态**：`CONFIRMED`
- **日期**：2026-09-17

## D8｜Demo 数据方案

- **决策主题**：演示数据来源
- **最终结论**：V1 Demo 使用"**预置高质量示例数据 + 现场新增真实输入**"的混合方案。结构为：预置 5~10 条经过设计的 Attempt + 现场输入 1 条新 Attempt → AI 实时解析 → 检索预置历史 → 发现相似记录 → 展示证据 → 提炼经验 → 生成新假设。预置数据**必须明确标记为"Demo / 示例数据"，不得伪装成真实用户数据**。
- **决策理由**：核心价值依赖历史积累，冷启动状态下无法演示；预置数据可在不造假的前提下让主链完整可见。
- **影响范围**：`09_TEST_PLAN.md`（TC-02 空态与预置数据）、`08_UI_SPEC.md`（示例数据标识）、`03_V1_SCOPE.md`（是否内置示例数据）
- **状态**：`CONFIRMED`
- **日期**：2026-09-17

## D9｜V1 核心验收标准

- **决策主题**：V1 通过标准
- **最终结论**：V1 必须完整跑通以下 P0 主链：① 用户自然语言输入一次失败尝试 → ② AI 进行结构化解析 → ③ 用户可以修改 / 确认解析结果 → ④ AI 生成候选失败原因 → ⑤ 用户确认后保存 → ⑥ 系统能够检索相关历史 Attempt → ⑦ 展示相似点与差异点 → ⑧ AI 提炼可复用经验 → ⑨ AI 生成至少一个可验证的新假设 → ⑩ 新假设能够追溯到历史记录证据。只要其中任一 P0 环节无法正常完成，**V1 即视为尚未完成**。以下内容不能替代主链验收：页面视觉效果很好、Agent 数量很多、使用高级框架、技术架构复杂、动画丰富、功能数量很多。
- **决策理由**：在有限周期内，唯一可靠的验收依据是端到端主链是否闭环；以"技术堆叠"作为成果信号会导致范围失控且无法演示。
- **影响范围**：`09_TEST_PLAN.md`（P0 用例改写为主链逐步验证）、`03_V1_SCOPE.md`、`04_USER_FLOW.md`、`08_UI_SPEC.md`
- **状态**：`CONFIRMED`
- **日期**：2026-09-17

## D10｜成功 / 部分成功记录

- **决策主题**：结果状态建模与主入口范围
- **最终结论**：底层 Attempt 应支持结果状态：`Failed｜未达到预期`、`Partial｜部分达到预期`、`Success｜达到预期`、`Unknown｜尚未确定`。原因是成功/部分成功 Attempt 可以作为失败记录的重要对照证据，用于未来分析方案适用边界。但 **V1 产品主入口仍然围绕失败 / 未达到预期的尝试**。V1 不新增：成功经验管理中心、成功案例库、完整实验管理系统。
- **决策理由**：缺少成功对照会使"某方案无效"类结论缺乏可信度；但把成功经验做成独立模块会扩大 V1 范围，因此只做底层建模、不做产品主入口。
- **影响范围**：`05_DATA_MODEL.md`（结果状态字段）、`04_USER_FLOW.md`、`06_AI_CAPABILITIES.md`（A2/A4 对照证据）、`03_V1_SCOPE.md`
- **状态**：`CONFIRMED`
- **日期**：2026-09-17

---

## 附加校正规则 R1–R6

- 记录日期：2026-09-17
- 状态：全部 `CONFIRMED`
- 说明：以下规则用于校正 S00-01 分析中未经确认的表述，不单独扩展 V1 范围。

| ID | 决策主题 | 最终结论 | 影响范围 | 状态 |
|---|---|---|---|---|
| R1 | 失败类型价值排序 | 不得把"条件性失效 / 假设证伪"写成未经验证的"最高价值失败"。统一改为：条件性失效与假设证伪属于高价值失败类型，但 **V1 不建立固定的失败价值排行榜** | `S00-01_赛题语义拆解.md` A1、`05_DATA_MODEL.md` | `CONFIRMED` |
| R2 | 经验时效性 | 不得写"所有失败经验都会过期"。正式表达：失败经验具有时间、版本、环境与条件上下文，**部分经验**可能随着技术、环境或前置条件变化而失效。数据设计可预留 `created_at`、时间、版本、环境、技术上下文；**V1 不实现复杂自动过期算法** | `05_DATA_MODEL.md`、`S00-01_赛题语义拆解.md` B | `CONFIRMED` |
| R3 | 知识网络 | "知识网络"在当前项目中**只表示数据之间的逻辑关联，不代表必须采用知识图谱技术**。V1 不做图数据库、大型知识图谱、复杂图谱推理、图谱可视化系统。可以存在普通关系（`belongs_to`、`similar_to`、`derived_from`、`evidence_for`、`contradicts`、`generated_from`），但技术实现不因此被绑定到图数据库 | `07_TECH_ARCHITECTURE.md`、`05_DATA_MODEL.md`、`S00-01_赛题语义拆解.md` B/C/D | `CONFIRMED` |
| R4 | 竞品能力描述 | S00-01 中所有关于 ChatGPT、Notion、RAG 产品、普通 AI 助手"做不到什么 / 有什么缺陷"的内容，**不得由"人工确认"转化为客观事实**，统一保持"待竞品调研与证据验证"。未来对外材料如需使用，应进行实际调研并提供依据 | `01_PRODUCT_DEFINITION.md` §5、`S00-01_赛题语义拆解.md` F | `CONFIRMED` |
| R5 | 是否为"全新品类" | 不得把"这是一个全新的产品品类"作为当前正式结论。比赛与产品定位采用更严谨的表述：**产品创新点在于围绕失败尝试建立"结构化沉淀—跨记录复用—证据约束—下一轮假设孵化"的完整闭环** | `01_PRODUCT_DEFINITION.md`、对外材料 | `CONFIRMED` |
| R6 | 产品创新来源 | **V1 优先保证完整闭环成立**。创新性主要从以下方面体现：历史失败真实参与下一轮推理、跨 Attempt 比较、事实与 AI 推断分离、候选经验有证据来源、新假设可追溯、失败经验真正参与下一轮行动。不得通过单纯堆叠 Agent、模型数量、知识图谱、向量数据库、多模型架构、炫技技术来替代产品价值 | `01_PRODUCT_DEFINITION.md`、`03_V1_SCOPE.md`、`07_TECH_ARCHITECTURE.md` | `CONFIRMED` |

---

## 正式锁定的核心问题定义

- 记录日期：2026-09-17
- 状态：`CONFIRMED`

> 高校科研与创新项目执行者在一次尝试未达到预期后，缺少低成本的方法，把当时的目标、条件、方案、结果与判断依据转化为可复用经验；即使曾经记录过，后续面对新问题时也很难判断旧经验是否适用，最终导致重复试错，并且难以利用过去的失败决定下一步值得验证的方向。

## 正式锁定的产品回答

- 记录日期：2026-09-17
- 状态：`CONFIRMED`
- 备注：以下为**产品方向定义**，不是最终营销文案，不得擅自润色成夸张宣传语。

> 通过 AI 将失败尝试低成本地结构化沉淀，并利用历史尝试进行相似经验检索、证据化经验提炼和下一步可验证假设孵化。

---

## D-002：建立产出落盘规则与 docs/analysis/ 归档目录

- 日期：2026-09-16
- 背景：S00-01 的分析产出（赛题语义拆解、状态校正表）此前只存在于对话中，会话结束即无法被后续其他会话读取，等于丢失；同时缺少统一的"AI 产出如何落盘"的约定。
- 备选方案：
  1. 新建 `docs/analysis/` 子目录按阶段编号存放（已选）
  2. 并入 00–09 编号主文档
  3. 项目根目录单文件 SESSION_LOG.md
- 结论：采用方案 1。新增 `docs/analysis/` 目录，命名 `<阶段编号>_<主题>.md`；同时把「产出落盘规则」写入 `00_PROJECT_RULES.md` 第 5 节，并同步记入 `.learnbuddy/memory/MEMORY.md`。
- 理由：不污染 00–09 主文档编号体系；过程性分析独立成区，后续会话按目录即可定位；避免分析与最终结论混杂导致的频繁改动与冲突。
- 影响范围：全项目文档产出方式；`docs/00_PROJECT_RULES.md`、`docs/analysis/`、`.learnbuddy/memory/MEMORY.md`。

---

## D-001：建立 docs 文档结构

- 日期：2026-09-16
- 背景：项目启动，需要规范的产品设计文档体系支撑小步迭代开发。
- 备选方案：单一 README / 按主题拆分编号文档
- 结论：采用 00–09 编号主文档 + DECISIONS + CHANGELOG 的结构。
- 理由：编号文档职责清晰、互相引用不打架；决策与变更单独留痕，满足"保留完整开发过程和决策记录"的比赛要求。
- 影响范围：全项目文档。
