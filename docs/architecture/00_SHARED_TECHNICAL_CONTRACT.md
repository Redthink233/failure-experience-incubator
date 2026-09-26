# 00 SHARED TECHNICAL CONTRACT（共享技术契约）

```
文档 ID   : 00_SHARED_TECHNICAL_CONTRACT
阶段      : S00-03｜技术架构与实现方案收敛
状态      : ✅ **v0.3 FROZEN / IMPLEMENTATION BASIS**（🔴 **GATE C FINAL FREEZE，2026-09-24**）
版本      : v0.3（🔴 **按契约既有版本链推进** —— §14 第 4 条的终端状态即"**冻结态**"，🔴 **未发明新版本号**）
效力      : ✅ **FROZEN** —— 🔴 **`IMPLEMENTATION BASIS = YES`**（`Gate C` = `COMPLETE`，2026-09-24）
Owner     : Integrator（唯一可修改方）
依据来源  : docs/01–09 + docs/DECISIONS.md `D-001`–`D-052` + `Q16` 派生关闭
          : docs/analysis/S00-02_V1核心产品机制收敛.md（§21 经 §23 修正 / §22 v2 / §23）
          : docs/analysis/S00-03_技术架构阶段启动.md（Gate A 修正版）
          : docs/architecture/02_DATA_AND_STATE.md（§M.2 `CCR-S03B-01` / `CCR-S03B-02`，Worker 提出，v0.2.1 已并入）
          : docs/DECISIONS.md《S00-03 人工决策》`D-049`（**人工 `CONFIRMED` 产品 Decision；本契约整体仍为 DRAFT**）
          : docs/DECISIONS.md《`D-049`》内《邻接语义（✅ 已关闭 / 派生）》`ADJ-01`（**人工裁定读法 ③；`CLOSED / DERIVED`；依据 = `D-027` + `D-049`；不创建 `D-050`**）
          : docs/DECISIONS.md《S00-03 人工决策》`D-050`（**人工 `CONFIRMED` 产品 Decision；本契约整体仍为 DRAFT**）
          : docs/architecture/04_RETRIEVAL_AND_COMPARISON.md §D.2（`S03-D` Worker 产出，`PROPOSED`，非 canonical）—— `matched` 判据空档
          : docs/DECISIONS.md《S00-03 人工决策》`D-051`（**人工 `CONFIRMED` 产品 Decision；POST-INTEGRATOR / 来源 = `DR-01`；本契约整体仍为 DRAFT**）
          : docs/DECISIONS.md《S00-03 人工决策》`D-052`（**人工 `CONFIRMED` 产品 Decision；POST-INTEGRATOR / 来源 = `DR-02`；本契约整体仍为 DRAFT**）
          : 20_INTEGRATION/S00-03_技术决策包.md §R（`DR-01` / `DR-02` 的原始选项与 Integrator `PROPOSED`；**过程分析文档，非 canonical**）
          : 30_SPIKES/retrieval/`SP-03`（**`RESULT = INCONCLUSIVE`**；`DISPOSABLE / NON-PRODUCTION`；触发 `D-050`；**本契约不引用其任何结论为产品规则**）
          : docs/DECISIONS.md《S00-03 人工决策》`D-053`（**人工 `CONFIRMED` 架构级决策；Source = 项目负责人本轮人工原话；本契约整体仍为 DRAFT**）
          : docs/DECISIONS.md《S00-03 人工决策》`D-054`（**人工 `CONFIRMED` 架构级决策；Source = 项目负责人本轮人工选择方案 C；本契约整体仍为 DRAFT**）
          : 20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md（**Integrator 架构基线收敛文档，`PROPOSED` + `DECISION REQUIRED` 2 项；非 canonical**）
          : 30_SPIKES/local_first/SP-06_LOCAL_FIRST_FEASIBILITY_PLAN.md（**`PLAN ONLY` / `NOT EXECUTED`；本契约不引用其任何结论**）
          : docs/DECISIONS.md《S00-03 人工决策》`D-055`（**人工 `CONFIRMED` 架构级决策；触发 = 项目负责人本轮人工裁决，关闭 `DR-03`；本契约整体仍为 DRAFT**）
          : docs/DECISIONS.md《S00-03 人工决策》`D-056`（**人工 `CONFIRMED` 架构级决策；触发 = 项目负责人本轮人工裁决，关闭 `DR-04`；本契约整体仍为 DRAFT**）
          : 30_SPIKES/local_first/SP-06_EXECUTION_REPORT.md（**`DISPOSABLE / NON-PRODUCTION` 探针执行报告；🔴 本契约只登记其存在与状态，不引用其结论为产品规则、不据此 `CONFIRM` 任何 `TQ`**）
          : 🔴 `20_INTEGRATION/SP-01a_*` 与 `30_SPIKES/sp01a_probe/`（**历史 Cloud-centric 产物；`SP-01a = SUPERSEDED BY D-053` / `INCOMPLETE HISTORICAL SPIKE`；一字未改**）
          : docs/DECISIONS.md《S00-03 人工决策》`D-057`（**人工 `CONFIRMED` 流程决策；`SP-06` 部署验证与浏览器人工验收延期至提交前；本契约整体仍为 DRAFT**）
          : docs/DECISIONS.md《S00-03 人工决策》`D-058` / `D-059` / `D-060` / `D-061` / `D-062`（**人工 `CONFIRMED` Gate B 最终技术决策；`Source = Gate B Final Human Confirmation`（2026-09-24「A｜确认以上全部 Gate B 决策」）；本契约整体仍为 DRAFT**）
          : 30_SPIKES/local_first/SP-06/SP-06_EXECUTION_REPORT.md §R（**`CURRENT PROCESS DISPOSITION`；`CONDITIONAL PASS` 历史状态不变、7 项仍 `PENDING MANUAL OBSERVATION`**）
          : 20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md（**`PSA-01`–`PSA-13` + `PSA-X1`–`X11`；`PLANNED` / `NOT EXECUTED`，全部 `PENDING`；🔴 **不是产品 `AC`**）
```

> 🚩 **v0.2 说明（Gate A 修订版）**：本版按 Gate A 审查意见完成定向修正（共 12 项），其中包括：
> ① 阶段流程统一为 `Gate A → S03-A～E 并行分析 → Integrator → Gate B → Local Landing → Gate C`（**取代原 Gate A–E 五门制**，且 **Gate A 不要求先裁决技术栈**）；
> ② 对象分层修正（见 §1.1）；
> ③ 「未知 / 未提供」的**物理表示不再由契约预锁**（见 §4.2 与 §12 第 8 项）；
> ④ 首次起草期的**命名 / 一致性修正已直接并入本契约**（见 §10.2，**不称 CCR**）。
> **本契约仍为 DRAFT，不得写 `FROZEN` / `CONFIRMED`。**

> 🚩 **v0.2.1 说明（Worker CCR 对齐版）**：本版**只做一件事** —— 并入 `S03-B` 提出的 **2 项已判定为 `ACCEPTED` 的 Worker CCR**，**仅修复本契约与已确认 canonical（`DECISIONS.md` / `docs/01–09`）的不一致**：
> ① **`CCR-S03B-01`** → §5.1 `source_field_path` 的合法落点由「仅 `Fact`」修正为「`Fact` **或** `Extraction` 内容条目」；`role = grounding` 仍**必须**落在 `Fact`（见 §5.1 / §5.2 第 8–12 条 / §6.3 第 7–8 条）；
> ② **`CCR-S03B-02`** → §5.1 删除 `archived_at_ref` 的必需语义；**「来源已归档」改由 `target` 当前 `archive_state` 动态派生**（见 §5.2 第 11 条 / §7.4）。
> 🔴 **本版不新增、不放宽、不收紧任何产品机制**；**不进入 Gate B**、**不产生新的人工决策**；**仍为 DRAFT，未 `FROZEN` / 未 `CONFIRMED`，不可作为实现依据**。CCR 处理留痕见 §14.1。

> 🚩 **v0.2.2 说明（`D-049` 对齐版）**：本版**只做一件事** —— 并入**已经项目负责人人工 `CONFIRMED` 的产品 Decision `D-049`**（来源：`S00-03` / `S03-C`；触发 = `03_AI_PIPELINE.md` §K `DECISION REQUIRED`）：
> ① **`Hypothesis`（两类 `kind`）核心内容 ①②③④⑤ 一律只读**；**③ 的引用关系由系统 / `EvidenceRef` 管理，用户不得直接修改**（见 §2.3 / §8.6 / §12 第 19 项）；
> ② **⑥⑦⑧ 允许用户自行提供 / 替换 / 补充**，**一律落为「用户 `Fact` 条目」并与「AI `Inference` 条目」分列**；**不得就地改写 AI 条目、不得改变其 `source_type`、不得混写**（见 §8.6）；
> ③ **不建立 `Hypothesis` 内容修改状态机**、**不做内容修改后回退 `undecided`**、**不引入版本历史 / 内容修改事件日志 / 新状态枚举**（见 §2.3）；
> ④ **改变 ①②④⑤ 的唯一路径 = 修改 `Formal Attempt` → 显式发起重新检索 / 重新生成**（属后续重跑动作，不是 `D9` 新增步骤；**不得自动重生成 ⑧ / ⑨ 产物**）（见 §9 / §8.6）；
> ⑤ 登记 §13.5（`S00-03` 已关闭项）与 §13.6（**邻接待确认项 `ADJ-01`** —— **该状态已由 v0.2.3 更新为 `CLOSED / DERIVED`**）。
> 🔴 **本版的效力边界**：**`D-049` 本身已是 `CONFIRMED` 产品 Decision**；但**本契约整体仍为 DRAFT —— 未 `FROZEN`、未 `CONFIRMED`、不可作为实现依据**。**本版不是 CCR**（属人工决策落盘，见 §14.1）。
> 🔴 **本版不进入 Gate B**、**不产生新的人工决策**、**不处理 `TQ01`–`TQ05`**、**不做技术选型**。

> 🚩 **v0.2.3 说明（`ADJ-01` 派生关闭版）**：本版**只做一件事** —— 接入 `v0.2.2` 登记的**邻接项 `ADJ-01`** 的人工裁决结果（**`ADJ-01 = CLOSED / DERIVED`**；依据 = **`D-027` + `D-049`**；**人工裁定读法 ③**）：
> ① **§13.6** 由「邻接待确认项」改为「**已关闭 / 派生项**」：**`ADJ-01 = CLOSED / DERIVED`**，**关闭依据 = `D-027` + `D-049`**；
> ② **§2.3** 第 ⑤ 项仍标 **只读**；**删除"邻接项待确认"标注**，改为 **"用户本人指定'保持条件'的唯一输入落点 = `Formal Attempt` 用户 `Fact`；⑤ 只引用 / 展示该 `Fact`"**；
> ③ **§8.6** 第 7 条（原"邻接待确认"）改写为**已关闭的派生规则**：`Hypothesis` 第 ⑤ 项**只允许引用 / 展示**既有 `Formal Attempt` 用户 `Fact`，**不得在 `Hypothesis` 内创建 / 就地修改该 `Fact`、不得把 AI `Inference` 改成 `Fact`、不得合并为混合来源**；
> ④ **§9** 增补跨步行说明（保持条件 `Fact` 的进入点与重跑路径）；**§12 第 19 项**同步（第 ⑤ 项口径为 Worker 禁改项）；
> ⑤ **§14 第 4 条 / §15** 推进版本；**§14.1** 注明"本版无新增 CCR"。
> 🔴 **本版效力边界**：**本版不创建 `D-050`**、**不改变 `D-027`**、**不改变 `D-049`**、**不新增任何产品机制** —— **属已有 `CONFIRMED` Decision（`D-027` + `D-049`）的组合解释闭合**。
> 🔴 **本契约整体仍为 DRAFT —— 未 `FROZEN`、未 `CONFIRMED`、不可作为最终实现依据。**
> 🔴 **本版不进入 Gate B**、**不产生新的人工决策**、**不处理 `TQ01`–`TQ05`**、**不做技术选型**。

> 🚩 **v0.2.4 说明（`D-050` 对齐版）**：本版**只做一件事** —— 接入**已经项目负责人人工 `CONFIRMED` 的产品 Decision `D-050`**（来源：`S00-03` / **`SP-03`**；触发 = **`SP-03 RESULT = INCONCLUSIVE`** 与 **`matched_level_a_dimensions` 判定漂移**）：
> ① **新增 §9.4《第 ⑥ 步 Level A 维度 `matched` 的严格语义重叠判据》** —— 补上 canonical 此前的**判据空档**："**单个 Level A 维度何时叫 `matched`**"；
> ② **§6.1 补一条指针**（`N_检索` 依赖 "Level A 命中" → 维度级判据见 §9.4）；**§9 第 ⑥ 步行依据**补 `D-050`；
> ③ **§12 第 6 项**同步（"Level A 四维度集合与字段路径映射"扩展为**同时锁定 `matched` / `compared_not_matched` 的判据**）；
> ④ **§13.5** 新增一行 `SP-03` `DECISION REQUIRED` → **`D-050`** 的关闭登记；**§13.6 就地补注**（其"不创建 `D-050`"属 `ADJ-01` 关闭当时的历史表述）；
> ⑤ **§14 第 4 条**（版本链推进）与 **§14.1**（注明"本版无新增 CCR"）；**§15** 新增 v0.2.4 变更行。
> 🔴 **本版效力边界**：**本版不 `CONFIRM` `TQ04`**、**不 `CONFIRM` `R-A`**、**不做技术选型**、**不做架构定稿**、**不改 `D-027` / `D-049`**、**不改 `ADJ-01` 的 `CLOSED / DERIVED` 状态**。
> 🔴 **`matched_level_a_dimensions` 非空 → `related`**（"准入 = 命中维度集合非空"）**仍属 `S03-D` / Integrator 的架构收敛项** —— **`D-050` 只定义"单个维度何时叫 `matched`"**。
> 🔴 **本契约整体仍为 DRAFT —— 未 `FROZEN`、未 `CONFIRMED`、不可作为最终实现依据。**（**`D-050` 本身已 `CONFIRMED`，契约整体状态不受影响**。）
> 🔴 **本版不进入 Gate B**、**不产生新的人工决策**、**不处理 `TQ01`–`TQ05`**、**不做技术选型**。

> 🚩 **v0.2.5 说明（`D-051` + `D-052` 对齐版）**：本版**只做一件事** —— 接入**已经项目负责人人工 `CONFIRMED` 的两项 POST-INTEGRATOR 产品 Decision**（来源 = `S00-03` / `20_INTEGRATION/S00-03_技术决策包.md` §R 的 `DR-01` / `DR-02`）：
> ① **`D-051`（`DR-01`，人工选择「方案 C 收窄版」）** —— **新增 §9.5《重新检索 / `Insight` 重新生成 / `Hypothesis` 重新生成 的三层区分与不级联》**、**新增 §2.4《显式重新生成后的产物语义与「生成批次」》**；**§8.6 补第 9 条**（旧 `Hypothesis` 的 `decision_state` 不因新一轮生成自动改变、新 `Hypothesis` 不继承旧 `decision_state`；较早 `Hypothesis` 不因存在而自动成为新一轮推理输入）；**§9 第 ⑧ / ⑨ 步行依据**补 `D-051`；**§12 新增第 20 项**（生成批次语义为 Worker 禁改项）。
> ② **`D-052`（`DR-02`，人工选择「方案 B」）** —— **§9.4 的 `actual_attempt` 行追加一条明确负例**：「**调整热风参数**」vs「**调整送风参数**」= **`compared_not_matched`**；**§12 第 6 项**依据补 `D-052`。
> ③ **§13.5** 新增两行（`DR-01` → `D-051` `CLOSED`；`DR-02` → `D-052` `CLOSED`）；**§14 第 4 条**（版本链推进）与 **§14.1**（注明"本版无新增 CCR"）；**§15** 新增 v0.2.5 变更行。
> 🔴 **本版效力边界**：**不 `CONFIRM` `TQ01`–`TQ05` 中的任何一项**、**不执行 `SP-01`**、**不选择托管平台**、**不选择最终 LLM provider**、**不做技术选型**、**不做架构定稿**、**不改 `D-027` / `D-040` / `D-043` / `D-045` / `D-049` / `D-050`**、**不改 `ADJ-01` 的 `CLOSED / DERIVED` 状态**、**不建立任何版本系统**。
> 🔴 **时序口径（本版统一）**：**`D-051` / `D-052` 落盘 → `SP-01` 实测候选环境 → `TQ01`–`TQ05` 最终 Gate B 人工裁决 → Local Landing → Gate C**。**`SP-01` 不是 BLOCKER**，但它是 **`TQ02` / `TQ05` 最终裁决前的 P0 证据**。
> 🔴 **本契约整体仍为 DRAFT —— 未 `FROZEN`、未 `CONFIRMED`、不可作为最终实现依据。**（**`D-049` / `D-050` / `D-051` / `D-052` 本身均已是 `CONFIRMED`，契约整体状态不受影响**。）
> 🔴 **本版不进入 Gate B**、**不处理 `TQ01`–`TQ05` 的裁决本身**、**不做技术选型**。

> 🚩 **v0.2.6 说明（`D-053` Local-first + `D-054` Structured Experience RAG 对齐版）**：本版**只做一件事** —— 接入**已经项目负责人人工 `CONFIRMED` 的两项 S00-03 架构级 Decision**（`docs/DECISIONS.md` **`D-053`** / **`D-054`**；来源 = 项目负责人本轮人工架构决策，**非 AI 提议、非 Worker 产出、非 `DR-*` 报告**）：
> ① **`D-053`（V1 主架构改为 Local-first Harness-style Web App）** —— **§0.1 补"当前架构形态"说明 + 时序校正（旧 `SP-01a` 链被 supersede）**；**§0.4（新增）《架构形态与持久化的当前基线》**（Local-first 形态 / Primary Persistence = 本地 Workspace 文件 / Vercel = Demo·Review 目标 / 浏览器须用户主动授权 / 逻辑对象不扁平化 / 不建立用户可见版本系统）；**§13 登记更新**（`TQ01`–`TQ05` 重新基线）；**§14 第 4 条**版本链推进；**§15** 新增 v0.2.6 变更行。
> ② **`D-054`（V1 只实现 Structured Experience RAG；`ResearchContextProvider` 仅预留）** —— **§0.4 补《RAG 的当前边界》**（Structured Experience RAG 的正式定义 / corpus 不扩大 / **`RAG ≠ Vector DB`** / `ResearchContextProvider` 仅 `RESERVED` / **未来分层 Layer 1–2–4 启用、Layer 3 `RESERVED ONLY`** / **不改变 `History-grounded` 定义**）。
> ③ 🔴 **本版不新增、不放宽、不收紧任何产品机制** —— **`D9` 十步 / 对象模型 / `source_type` / `EvidenceRef` / `N_检索`·`N_引用` / Level A·B·C / `D-049`–`D-052` / `ADJ-01` 全部不变**。
> ④ 🔴 **本版不 `CONFIRM` `TQ01`–`TQ05` 中的任何一项**、**不执行 `SP-06`**、**不做技术选型**、**不做架构定稿**、**不引入任何新对象 / 状态 / 字段 / 计数**。
> ⑤ 🔴 **本版仍为 DRAFT**：**`v0.3 DRAFT` 仍保留给"Gate B 关键技术决策并入"** —— 因 `TQ03` / `TQ04` 及若干 Gate B 技术项**仍未最终裁决**，故**不得直接进入 `v0.3`**。
> ⑥ **CCR 记账**：**本版无新增 CCR**（`D-053` / `D-054` 属**人工架构决策落盘**，不是 Worker 提出的 Contract Change Request）；**未处理 CCR 仍 = 0**。
> 🔴 **`D-053` / `D-054` 本身已是 `CONFIRMED` 架构级 Decision；但本契约整体仍为 DRAFT —— 未 `FROZEN`、未 `CONFIRMED`、不可作为实现依据。**

> 🚩 **v0.2.7 说明（`D-055` Hybrid LLM Path + `D-056` Session-only Credential 对齐版）**：本版**只做一件事** —— 接入**已经项目负责人人工 `CONFIRMED` 的两项 S00-03 架构级 Decision**（`docs/DECISIONS.md` **`D-055`** / **`D-056`**；来源 = 项目负责人本轮人工裁决，**关闭 `DR-03` / `DR-04`**；**非 AI 提议、非 Worker 产出**）：
> ① **`D-055`（LLM 请求网络路径 = `Provider-dependent Hybrid`）** —— **§0.4 新增 D 节《LLM 接入边界》**（路径由 **Adapter Capability** 决定、**不得逐请求让用户选择**；**Browser Direct** 的五项适用条件与"🔴 不得额外经过 Vercel"；**Vercel Thin Proxy** 的 `THIN` 允许项与六项禁止项；**Custom `Base URL` = `Browser Direct Only`**、**🔴 禁止 `Generic Arbitrary URL Proxy`**；**🔴 Proxy 不得接受 client 任意 `target_url` / `base_url` / `host` / `scheme`**；**安全 Proxy 的唯一形态 = `provider_id → 服务器注册 Adapter → 固定 / allowlist Host`**；**不可用 Provider 必须明确失败、不得偷偷走通用 Proxy**；**SSRF / Open Proxy / 内网 / metadata endpoint / 非 `https` 防护要求**；**🔴 V1 不预置服务端固定 Key**）；
> ② **`D-056`（LLM 凭据持久化 = `Session-only Credential`）** —— **§0.4 D 节 凭据部分**（**允许** session-scoped storage / 等价抽象；**目标行为 = 输入 → 当前会话可用 → 刷新后仍可用 → 会话结束清除**；**🔴 禁止载体逐项**：`localStorage` / `IndexedDB` / Workspace file / Git / Vercel KV / Vercel DB / Cloud DB / server filesystem / permanent cookie；**传输边界**：Browser Direct ⇒ 只发往用户配置的 Provider、**不得额外发给 Vercel**；Proxy ⇒ **仅当前请求生命周期**、**🔴 不得持久化**；**🔴 日志不得出现 `Authorization` / API Key / 含 secret 的 body**；**🔴 不得增加「记住我 / 永久保存」开关**）；
> ③ **§13.7 更新**（`DR-03` → `D-055`、`DR-04` → `D-056` 已关闭；🔴 **`DECISION REQUIRED` 计数 = 0**）；**§14 第 4 条**版本链推进；**§14.1** 注明"本版无新增 CCR"；**§15** 新增 v0.2.7 变更行。
> ④ 🔴 **本版不新增、不放宽、不收紧任何产品机制** —— **`D9` 十步 / 对象模型 / `source_type` / `EvidenceRef` / `N_检索`·`N_引用` / Level A·B·C / `D-020` / `D-044` / `D-049`–`D-054` / `ADJ-01` 全部不变**。
> ⑤ 🔴 **本版不 `CONFIRM` `TQ01`–`TQ05` 中的任何一项**（**`TQ03` 的两个子项已裁决 ≠ `TQ03` 已裁决**）、**不引用 `SP-06` 的任何结论**、**不做技术选型**、**不做架构定稿**。
> ⑥ 🔴 **本版仍为 DRAFT**：**`v0.3 DRAFT` 仍保留给"Gate B 关键技术决策并入"** —— 因 `TQ04` 及若干 Gate B 技术项**仍未最终裁决**，故**不得直接进入 `v0.3`**。
> 🔴 **`D-055` / `D-056` 本身已是 `CONFIRMED` 架构级 Decision；但本契约整体仍为 DRAFT —— 未 `FROZEN`、未 `CONFIRMED`、不可作为实现依据。**

> 🚩 **v0.3 说明（`GATE B FINAL TECHNICAL DECISIONS INTEGRATED` 版）**：本版接入 **`D-057` + `D-058`–`D-062`** —— **Gate B Landing Phase 的正式落盘**：
> ① **`D-057`（流程决策）** —— **§0.4 新增 E 节**的流程部分：`SP-06` 剩余「Vercel 部署验证」+「真实浏览器目录权限生命周期人工观测」**不再作为 `Gate B` / `Gate C` / 正式 Coding 的硬阻塞项**，但**仍是 `PRE-SUBMISSION ACCEPTANCE` 的必做项**；允许序列 = **`Gate B` → `Gate C` → `Coding` →（开发后 / 提交前）Vercel + Chrome / Edge 真实 `Workspace` 验收**；🔴 **`SP-06` 历史状态不变**（`CONDITIONAL PASS`；7 项仍 `PENDING MANUAL OBSERVATION`，**不得伪造 `PASS`**）。
> ② **`D-058`–`D-062`（Gate B 最终技术决策，🔴 五项独立追踪、不得合并）** —— **§0.4 新增 E 节**：《Gate B 最终技术决策基线》（`TQ01` 应用架构 / `TQ02` 主持久化 / `TQ03` LLM 接入 / `TQ04` 检索路线 = `R-A` / `TQ05` 部署形态）。
> ③ 🔴 **`TypeScript end-to-end` 与 `Markdown + JSON / sidecar metadata` 属 `TECHNICAL DEFAULT` / 实现参数** —— **不写入任何 `CONFIRMED` 核心结论**、**不生成 `Decision ID`**；**`TQ02` 的物理 schema（front-matter / sidecar JSON / 目录名 / 文件名 / schema 细节）由 Integrator 收敛，🔴 不得锁成不可变产品 Decision**。
> ④ 🔴 **`D-062`（`TQ05`）必须与 `DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION` 同读** —— 🔴 **不得写**「Vercel 已验证 / 已部署 / HTTPS picker 已验证 / Production Ready」；🔴 **不得写**「Local-first 已可行 / 已完成浏览器验收」。
> ⑤ **§13.1 / §13.7 补就地补注**（`TQ01`–`TQ05` 已由 `D-058`–`D-062` 最终裁决；`DECISION REQUIRED` 计数 = 0）；**§14 第 4 条**（版本链推进至 `v0.3`）；**§14.1** 注明"本版无新增 CCR"；**§15** 新增 v0.3 变更行。
> ⑥ 🔴 **本版不新增、不放宽、不收紧任何产品机制** —— **`D9` 十步 / 对象模型 / `source_type` / `EvidenceRef` / `N_检索`·`N_引用` / Level A·B·C / `D-020` / `D-044` / `D-049`–`D-056` / `ADJ-01` 全部不变**；🔴 **不新增任何 `AC`**（`AC` 口径不变 = 连续 canonical 162 ＋ 独立 `AC-Q06` 6 ＝ 全部有效验收点 **168**）。
> ⑦ 🔴 **本版仍为 `DRAFT`**：**`v0.3 DRAFT` ≠ 冻结态**；**Gate C 前 NOT IMPLEMENTATION BASIS**；🔴 **不得写 `FROZEN` / `CONFIRMED`**；**冻结态仍保留给"Gate C 最终关闭审查通过"**。
> 🔴 **`D-057` / `D-058`–`D-062` 本身已是 `CONFIRMED` Decision；但本契约整体仍为 DRAFT —— 未 `FROZEN`、未 `CONFIRMED`、不可作为实现依据。**
> 🟢 **（就地补注 2026-09-24，按「不改写历史」保留上句原文）**：上句「**本契约整体仍为 DRAFT**」= **`v0.3 DRAFT` 撰写时点（Gate B Landing）的状态**。**当前有效状态见下方《v0.3 FROZEN 说明》。**

> 🚩 **v0.3 FROZEN 说明（`GATE C FINAL FREEZE` 版，2026-09-24）**：本契约由 **`v0.3 DRAFT`** 推进为 **冻结态 —— `IMPLEMENTATION BASIS`**：
> ① **触发**：项目负责人 **2026-09-24 明确回复「A｜确认 Gate C，冻结当前实现基线并允许正式开发」**；
> ② **前置完成**：**`S00-03 Gate C Readiness Review`** → 首轮 `NOT READY`（唯一原因 = 文档传播缺口 `ISSUE-01`）→ **`RL-01`（文档传播补丁）** + **`RL-02`（实现计划依赖修正）** → **有界 Recheck = `READY WITH NON-BLOCKING DEFERRED ITEMS`** → **`FINAL STATUS HYGIENE CHECK`** → 本冻结；
> ③ **新增 `CONTRACT CLARIFICATION`（🔴 不是 CCR、不是新 `Decision`、不新增 `AC`）**：**§9.4.1《Level A 四维度 → 主字段路径映射表》**（落实 §12 第 6 项 / `TQ19`）；**`CC-02`（`TQ02` 物理 schema）不升级为 Contract Decision**，落点 = 实现层 `IMPLEMENTATION SCHEMA PLAN`（Gate C Plan §J）；
> ④ **版本号**：🔴 **不发明新版本号** —— 按 **§14 第 4 条**既有版本链，终端状态即"**冻结态**"，故 **`版本 = v0.3`**、**`状态 = v0.3 FROZEN / IMPLEMENTATION BASIS`**；
> ⑤ 🔴 **冻结的射程**：**只冻结"实现依据"这一效力** —— **产品语义 / 技术架构 / 共享语义 / `D-049`–`D-062` 一字未改**；🔴 **不新增、不放宽、不收紧任何产品机制**；🔴 **不新增任何 `AC`**（口径不变 = 连续 canonical **162** ＋ 独立 `AC-Q06` **6** ＝ **168**）；
> ⑥ 🔴 **仍不因此成立的事项**：🔴 **`DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION` 不变**（`PSA-01`–`PSA-13` + `PSA-X1`–`X11` 仍全部 `PENDING`）；🔴 **不得写**「Vercel 已验证 / 已部署 / Production Ready」「Local-first 已可行 / 已完成浏览器验收」；🔴 **`SP-06` 历史状态不变**（`CONDITIONAL PASS` + 7 项 `PENDING MANUAL OBSERVATION`）；🔴 **`SP-06 TEST SPEC GAP` = `HISTORICAL / NON-BLOCKING UNDER D-057`（`PROCESS DISPOSITION RESOLVED` / `TEST HISTORY PRESERVED`，🔴 不写 `RESOLVED BY TEST`）**；🔴 **`File System fallback` 仍不触发**（`F1`–`F4`）；
> ⑦ **后续变更纪律**：冻结后如需修改本契约，🔴 **仍须走 §14 CCR 流程**（`Worker` 只提 CCR、不得自行改）；**冻结不取消 §12 的 Worker 禁改清单**。

---

## §0 本契约的定位与边界

### 0.1 本契约做什么

把已在 `S00-01` / `S00-02` 冻结的**产品机制**，翻译为**多个并行工作单元（Worker）可以同时遵守的共享语义**。
本契约只解决一件事：**让 S03-A – S03-E 在不互相冲突的前提下并行工作**。

**阶段流程（唯一）**

```
Gate A ＝ Bootstrap + Shared Contract 审查
   ↓
S03-A ～ S03-E 并行分析
   ↓
Integrator（契约收敛 / 一致性 / 争议仲裁）
   ↓
Gate B ＝ 关键技术人工决策
   ↓
Local Landing
   ↓
Gate C ＝ 最终关闭审查
```

- 🔴 **Gate A 不要求先裁决技术栈**（技术栈属 **Gate B** 的关键人工决策）。
- ⚠️ 原 **Gate A–E 五门制已废止**；新旧 **Gate A / Gate B / Gate C** 含义不同，**禁止混用**。
- 🔴 **时序校正（v0.2.5 补注）**：**`SP-01`（在线托管数据层 × 浏览器端到端连通性实测）是 `TQ02` / `TQ05` 最终裁决前的 P0 证据** ⇒ 上图中 `Integrator` 与 `Gate B` 之间应插一层 **`SP-01` 实测候选环境**：
  ```
  Integrator
     ↓
  D-051 / D-052 落盘（人工 POST-INTEGRATOR 决策）
     ↓
  SP-01 实测候选环境（P0 证据；非 BLOCKER）
     ↓
  TQ01–TQ05 最终 Gate B 人工裁决
     ↓
  Local Landing → Gate C
  ```
  **`SP-01` 不是 BLOCKER**；**但未完成 `SP-01` 前不得对 `TQ02` / `TQ05` 做最终裁决**（详细时序以 `20_INTEGRATION/S00-03_技术决策包.md` 的 POST-INTEGRATOR 状态段与 §P.3 为准）。

- 🔴 **时序校正（v0.2.6 补注，`D-053` 对齐；按「不改写历史」保留上方 v0.2.5 原文）**：**上方 v0.2.5 的时序（含 `SP-01` 为 `TQ02` / `TQ05` 前置 P0 证据）已被 `D-053` supersede** —— 因 V1 主架构转为 **Local-first**，**旧 Cloud-centric 的 `SP-01` / `SP-01a` 链不再是当前 V1 的 Gate B 前置证据**。**当前有效时序**：

  ```
  D-053 / D-054 Landing（人工架构决策落盘）
     ↓
  Local-first Architecture Rebaseline（本契约 v0.2.6）
     ↓
  SP-06 Plan（PLAN ONLY，本轮）
     ↓
  项目负责人批准 SP-06（SP-06 EXECUTION APPROVAL REQUIRED）
     ↓
  SP-06（Local-first Browser Workspace & Vercel Feasibility）
     ↓
  TQ01–TQ05 余项 Gate B 人工裁决
     ↓
  v0.3 DRAFT（Gate B 关键技术决策并入）
     ↓
  Local Landing
     ↓
  Gate C（最终关闭审查）
     ↓
  Coding
  ```

  🔴 **`SP-01a` = `SUPERSEDED BY D-053` / `INCOMPLETE HISTORICAL SPIKE`**（🔴 **不是 `FAIL`**）；**其 Phase 2 历史事实全部保留**；**立即停止其后续创建链**。
  🔴 **上图中"`Local Landing → Gate C`"之间新增了 `v0.3 DRAFT` 与 `Coding` 两道** —— 🔴 **不得直接从本轮进入 Coding**。
  🔴 **原 `SP-01` / `SP-01b` 的两段式定义同时被取代**（`SP-01` 整体 = `NOT COMPLETE`）。

### 0.2 本契约不做什么（硬边界，与 S00-03 阶段禁止事项一致）

| ❌ 本契约不做 | 说明 |
|---|---|
| 不选最终技术栈 | 前端框架 / 后端形态 / 语言 → `TQ01`（**Gate B**） |
| 不定最终数据库 | 存储与托管方案 → `TQ02`（**Gate B**） |
| 不定最终 API | 路由、协议、请求响应体形状 → `S03-A` / `S03-B` |
| 不写 SQL / 字段类型 / 索引 | 本契约只用**逻辑名**描述对象与关系 |
| **不锁「未知 / 未提供」的物理表示** | 只要求**显式表达 + 不得误判为相似**；物理表示由 **Integrator 收敛**（`TQ08`） |
| 不写 Prompt 模板 | → `S03-C` |
| 不做 UI 视觉设计 | → `08_UI_SPEC.md` 后续裁决 |
| 不修改任何产品结论 | 本契约**不得**新增、放宽或收紧任何产品机制 |

### 0.3 冲突处理

若本契约与 `DECISIONS.md` / `docs/01–09` 的任一 `CONFIRMED` 内容冲突：
**以 canonical 文档为准，本契约条目作废，并立即提交 Contract Change Request（见 §14）。**
Worker 不得自行调和冲突。

### 0.4 架构形态与持久化的当前基线（🔴 **v0.2.6 新增，`D-053` + `D-054` 对齐**）

> **性质**：`D-053` / `D-054` 的契约层落点。
> **射程**：**只写"当前架构形态与持久化位置的共享前提"**，供 Worker 在并行工作时遵守；🔴 **不新增对象 / 状态 / 字段 / 计数**、🔴 **不改任何产品机制**、🔴 **不做技术选型**。

**A｜架构形态（`D-053`，人工 `CONFIRMED`）**

| 事项 | 契约口径 |
|---|---|
| **V1 主架构** | **Local-first Harness-style Web App** —— Web UI + Local Workspace Folder + Configurable LLM +（必要时）Thin LLM Access Layer + Vercel Demo / Review Deployment |
| **用户科研主数据** | **Local-first** |
| **Workspace canonical** | **存在用户选择的本地目录** |
| **Vercel** | **Review / Demo Web Deployment Target**；🔴 **不是科研主数据库**、🔴 **不是 `Production SaaS Infrastructure`** |
| **云 PostgreSQL** | 🔴 **不是 V1 required dependency** |
| **浏览器访问 Workspace** | 🔴 **只有在用户主动授权后才能访问指定 Workspace**；**未授权不得读取本地目录** |
| **逻辑对象** | 🔴 **不因物理存储改为文件而扁平化** —— `Workspace` / `Project` / `Attempt` / `Insight` / `Hypothesis` / `EvidenceRef` 仍是不同逻辑对象，各自独立 ID 空间与状态模型 |
| **物理表示** | **由 Integrator 收敛**（Markdown + JSON / sidecar metadata 或其它合理本地文件表示；**具体目录名 / 文件名 / schema 属实现参数**） |
| **🔴 不建立** | 用户可见版本系统（❌ 版本号 / 版本列表 / 版本比较 / 版本回滚 / 修改次数）—— 与 `D-040` / `D-049` / `D-051` 同口径 |
| **🔴 不得引入** | 云数据库 / 用户账号数据库 / 云端 Workspace / 服务端永久科研数据存储（**不得因部署平台可运行 Serverless Function 就自动引入**） |
| **安全与隐私表述红线** | 🔴 **不得宣称**「100% offline」/「zero data transmission」/「absolute privacy」（存在 LLM 传输）；**只发送完成当前 AI 操作所需的最小必要上下文**；🔴 **不得默认上传整个 Workspace**；🔴 **凭据不得落入任何 Workspace 文件 / 仓库 / 日志 / 报告 / 前端 Bundle** |

**B｜RAG 的当前边界（`D-054`，人工 `CONFIRMED`）**

| 事项 | 契约口径 |
|---|---|
| **V1 的 RAG 形态** | **Structured Experience RAG** = 基于用户自身历史 `Attempt` 的结构化经验检索 + 证据上下文组装 + Grounded Generation |
| **性质** | 🔴 **不是新增产品流程** —— 是 `D9` **⑥⑦⑧⑨⑩** 在技术架构中的正式描述（**§9 的十步 I/O 不变**） |
| **corpus** | **严格沿用既有规则** —— 主要检索 corpus = 符合既有规则的历史 `Formal Attempt`；🔴 **不得因为命名为 RAG 就扩大 corpus** |
| **🔴 `RAG ≠ Vector DB`** | **不因使用 RAG 自动引入** Pinecone / Milvus / Weaviate / Chroma / pgvector / Elasticsearch / Redis Vector / embedding database；🔴 **不得用 `cosine similarity score` 替代 §9.4 的严格 `matched` 语义** |
| **`ResearchContextProvider`** | 🔴 **仅允许作为概念接口预留**（`getContext(query)`）；**V1 不实现任何 provider**；🔴 **不建立** `references/` / PDF import / PDF parser / chunk store / embedding store / research search / literature citation / paper viewer；🔴 **不新增** `ResearchDocument` / `Chunk` / `Citation` 数据实体；🔴 **不增加 UI 入口与 P0 `AC`** |
| **科研上下文未来分层** | Layer 1 `User Fact` / Layer 2 `Experience Evidence`（= Historical Attempt）/ **Layer 3 `Research Evidence` = `RESERVED ONLY`** / Layer 4 `Model General Knowledge`；**当前 V1 实际启用 = Layer 1 / Layer 2 / Layer 4**。🔴 **即使未来实现 Layer 3，`Research Evidence` 也不得自动计入** `N_检索` / `History-grounded Hypothesis` / `Experience Asset`，**除非未来另行 `Decision`** |
| **`History-grounded` 定义** | 🔴 **不变** —— 仍要求**至少一个真实 historical `Formal Attempt` 作为 grounding anchor**；🔴 **未来 Research Document 即使存在，也不能单独让一个 `Hypothesis` 成为 `History-grounded Hypothesis`**；🔴 **不改变 §8.2 的 G1–G4 / N1–N6** |
| **§9 各步的落地影响** | 🔴 **无** —— §9 十步的输入 / 系统行为 / 输出 / 门槛 / 依据**全部不变**；Structured Experience RAG 只是**上述各步在技术层的组合描述** |

**C｜本小节明确不做**

- 🔴 **不 `CONFIRM` `TQ01`–`TQ05`**（五项仍全部未裁决 / 部分重新基线，见 §13.1）；
- 🔴 **不选前端框架 / 状态库 / 路由 / 本地文件 schema**（属实现参数）；
- 🔴 **不 `CONFIRM` `TQ03` 的 LLM 请求网络路径与凭据存储方式**（⇒ `DECISION REQUIRED` 2 项，见 §13.7）；
  - 🟢 **就地补注（v0.2.7）**：本行为 **v0.2.6 时点状态**。**该 2 项其后已由人工裁决关闭**（`DR-03` → **`D-055`**；`DR-04` → **`D-056`**；**契约 §13.7 已更新**）。🔴 **但 `TQ03` 整体仍未 `CONFIRM`** —— **子项已裁决 ≠ `TQ03` 已裁决**。
- 🔴 **不 `CONFIRM` `TQ04`**（`R-A` 仍只是 `PROPOSED`）；
- 🔴 **不执行 `SP-06`**。

**D｜LLM 接入边界（`D-055` / `D-056`，人工 `CONFIRMED`，v0.2.7 新增）**

| 事项 | 契约口径 |
|---|---|
| **LLM 请求网络路径** | **`Provider-dependent Hybrid`** —— 允许 `Browser Direct` 与 `Vercel Thin Proxy` 两种形态**并存** |
| **路径决定权** | 🔴 **由 `Provider Adapter Capability` 决定**；🔴 **不得**每次请求让用户手工选择 `direct` / `proxy`；🔴 **不得**随机 / 无依据切换 |
| **`Browser Direct` 适用条件** | ① Browser CORS 可用 ② Browser API 调用被官方支持 / 技术上稳定 ③ 用户自己的 Credential 可直接用于该 Provider ④ **不需要产品服务器隐藏固定 server secret** ⑤ 不引入不可接受安全问题；**路径 = `Browser → LLM Provider`**；🔴 **不得额外经过 Vercel Proxy**（除非该 adapter 被**显式配置**为 Proxy path） |
| **`Vercel Thin Proxy` 适用条件** | 该 Provider 的 Browser Direct **不可行**，或 CORS / API 形态**要求服务端调用**；**路径 = `Browser → Vercel Thin Proxy → Known LLM Provider`** |
| **🔴 Proxy 的 `THIN` 允许项** | **仅** request normalization / provider adapter forwarding / response normalization / timeout·error mapping / 必要的 schema transport |
| **🔴 Proxy 的禁止项（逐项）** | ❌ Workspace persistence ❌ `Attempt` persistence ❌ `Insight` persistence ❌ `Hypothesis` persistence ❌ Experience database ❌ Cloud user database |
| **Custom `Base URL`** | 🔴 **默认 = `Browser Direct Only`**（`Browser → 用户指定 Base URL`）；🔴 **禁止 `Generic Arbitrary URL Proxy`**；🔴 **不得设计成 `Browser → Vercel → 用户任意 URL`** |
| **🔴 Proxy 接口 `target` 约束** | **不得接受** client 提交的任意 `target_url` / `base_url` / `host` / `scheme` 并据其代请求；**必须通过 `provider_id` 选择服务器端已注册 Adapter**（`provider_id → 固定 Adapter → 固定 / 严格受控 Provider Host`）；🔴 **不得**用请求参数修改最终目标 host；**允许**受控配置中的固定 host / 严格 allowlist host / 明确 adapter endpoint |
| **🔴 SSRF / Open Proxy 防护（硬约束）** | **必须拒绝** `localhost` / `127.0.0.0/8` / `::1` / RFC1918（`10/8`、`172.16/12`、`192.168/16`）/ link-local（含 `169.254.169.254` 等 metadata endpoint 形态）/ 非 `http(s)` scheme；🔴 **不得跟随重定向至 allowlist 之外**；🔴 **不得"黑名单 + 默认放行"**；限制请求体大小 / 超时；不转发任意自定义请求头；不返回原始错误细节 |
| **不可用 Provider** | ✅ **必须明确失败**（表达 `Provider connection unsupported under current browser constraints` 之含义）；🔴 **不得偷偷走通用 Vercel Proxy**；🔴 **不得为"支持所有 Provider"降低安全边界** |
| **🔴 服务端 Key** | **V1 不为任何 Provider 预置固定 server secret**；Proxy **只是传输通道、不是 Key 持有方**；Credential **始终来自用户** |
| **凭据持久化** | **`Session-only Credential`** —— **V1 不长期保存 API Key** |
| **凭据允许载体** | ✅ **session-scoped browser storage**（`sessionStorage` 或等价 session-scoped abstraction） |
| **🔴 凭据禁止载体（逐项）** | ❌ `localStorage` ❌ `IndexedDB` ❌ Workspace file ❌ Git ❌ Vercel KV ❌ Vercel DB ❌ Cloud DB ❌ server filesystem ❌ **permanent cookie** |
| **凭据目标行为** | 输入 API Key → **当前会话可用** → **页面刷新后仍可继续当前会话** → **tab / browser session 结束 ⇒ 清除** → 重新进入产品须**重新输入**；🟠 **有意的 V1 Security Trade-off** |
| **🔴 凭据传输** | `Browser Direct` ⇒ **只发往用户配置的 Provider**，**不得额外发送给 Vercel**；`Proxy` ⇒ **仅当前请求生命周期**内使用，🔴 **Proxy 不得持久化**（不写 DB / 文件 / KV / cache / durable log） |
| **🔴 凭据日志红线** | `Authorization` / API Key / 完整 request body 中的 secret **不得**进入 Vercel logs / application logs / error logs / analytics / 浏览器 console；**必须脱敏**（`REDACTED` / 掩码 / hash） |
| **🔴 UI 红线** | **不得提供**「记住我」/「`Remember Key`」/「永久保存 Credential」开关；**未来如需要，必须另行 `Decision`** |
| **🔴 本小节不做** | **不 `CONFIRM` `TQ03`**（子项已裁决 ≠ `TQ03` 已裁决）；**不选具体 Provider 清单 / allowlist 内容 / 脱敏实现 / session 抽象选型**（属实现参数）；🔴 **不引用 `SP-06` 的任何结论** |

**E 节｜Gate B 最终技术决策基线（🔴 v0.3 新增；`D-057` + `D-058`–`D-062`，全部人工 `CONFIRMED`）**

> **性质**：Gate B Landing Phase 落盘的**正式技术基线**。🔴 **只冻结技术架构 / 部署目标**；🔴 **不新增、不放宽、不收紧任何产品机制**。

| 节 | 内容 | Decision | 状态 |
|---|---|---|---|
| **E.1** | **流程处置**：`SP-06` 剩余「Vercel 部署验证」+「真实浏览器目录权限生命周期人工观测」**不再作为 `Gate B` / `Gate C` / 正式 Coding 的硬阻塞项**；**但仍是 `PRE-SUBMISSION ACCEPTANCE` 的必做项** | **`D-057`** | ✅ `CONFIRMED` |
| **E.2** | **应用架构 / 技术运行形态** = **Browser-heavy Local-first Web App + Optional Thin Server Layer**（Thin Server **只在某 `registered provider adapter` 无法 `Browser Direct` 时存在**；**不承担** Workspace persistence / user database / `Attempt`·`Insight`·`Hypothesis` storage / Experience DB；⇒ **不是 Backend-centric 架构**） | **`D-058`**（`TQ01`） | ✅ `CONFIRMED` |
| **E.3** | **V1 Primary Persistence** = **Local Workspace Files + No required cloud database**（🔴 **PostgreSQL 不是 V1 required dependency**；🔴 不得引入云 DB / SQLite server / remote persistence service 作为主存储） | **`D-059`**（`TQ02`） | ✅ `CONFIRMED` |
| **E.4** | **LLM 接入策略** = **Configurable LLM + Provider Abstraction + Provider-dependent Hybrid + Session-only Credential + Registered-provider Thin Proxy only**（路径由 Adapter 能力决定；Custom `Base URL` = `Browser Direct Only`；🔴 无通用 URL Proxy / 无 Remember Key / 不持久化 Credential / 不预置服务端固定 Key） | **`D-060`**（`TQ03`） | ✅ `CONFIRMED` |
| **E.5** | **检索实现路线** = **`R-A`**（Structured Field Rules + 必要时 LLM 维度级**离散三态**判定；`matched` 仍由 **`D-050` 严格语义重叠** 决定；🔴 **无 Vector DB / 无 embedding 准入 / 无数值相似度**） | **`D-061`**（`TQ04`） | ✅ `CONFIRMED` |
| **E.6** | **部署形态 / 环境** = **Local Development + Vercel Demo / Review Deployment Target + Local Workspace + Optional Thin Provider Proxy**（🔴 不得引入云数据库；🔴 不得依赖腾讯云旧 `SP-01a`） | **`D-062`**（`TQ05`） | ✅ `CONFIRMED` |

**🔴 E.7 `TECHNICAL DEFAULT` / 实现参数（🔴 不是人工 Decision、🔴 不生成 `Decision ID`）**

```
TypeScript end-to-end                              ← TQ01 的技术默认
Markdown + JSON / sidecar metadata                 ← TQ02 的物理层技术默认
框架 / state library / router / component library  ← 实现参数（Integrator 收敛）
TQ02 物理文件 schema（front-matter / sidecar JSON / 目录名 / 文件名 / schema 细节）
                                                   ← 实现层 / Integrator 收敛，🔴 不得锁成不可变产品 Decision
```

**🔴 E.8 `TQ02` 物理 schema 虽不锁定，但下列已确认约束必须继续满足（🔴 不得因"未锁 schema"而放弃）**

```
human-readable ／ stable ID ／ EvidenceRef ／ archive_state ／
generation batch ／ source_type ／ decision_state ／ Git-friendly · portable
```

**🔴 E.9 部署验收状态（🔴 必须与 E.6 同读，不得省略、不得写反）**

```
DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION
  · SP-06 历史状态不变：CONDITIONAL PASS（PASS 7 / PARTIAL 6 / PENDING MANUAL 7 / FAIL 0）
  · 🔴 7 项 PENDING MANUAL OBSERVATION（S6-01 / 04 / 05 / 06 / 08 / 09 / 10）仍然 PENDING，不得伪造 PASS
  · 提交前必做项 = 20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md
                  （PSA-01 – PSA-13 + PSA-X1 – X11，PLANNED / NOT EXECUTED，全部 PENDING）
  · 🔴 不得写「Vercel 已验证 / Vercel 已部署 / HTTPS picker 已验证 / Production Ready」
  · 🔴 不得写「Local-first 已可行」或「Local-first 已完成浏览器验收」
```

**🔴 E.10 本节的效力边界**

- `D-057` / `D-058`–`D-062` **本身均已是 `CONFIRMED` Decision**；**但本契约整体仍为 `DRAFT`**（**未 `FROZEN`、未 `CONFIRMED`、Gate C 前 NOT IMPLEMENTATION BASIS**）；
- 🔴 **`TQ05` 的 `CONFIRMED` 只代表 Deployment Architecture / Target 冻结**；`DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION` **不因本 Decision 而改变**；
- 🔴 **不得把本节的 `CONFIRMED` 表述为"契约已冻结"**；🔴 **不得据此进入 Coding**（须先完成 Gate C）；
- 🔴 **`Research Document RAG` 仍 = `OUT OF V1` / `RESERVED ONLY`**（`D-054` 不变）；🔴 **`File System fallback` 仍不触发**（升级条件 = `F1`–`F4`）；
- 🔴 **本节不新增 `AC`**；`AC` 口径不变 = **连续 canonical 162 ＋ 独立 `AC-Q06` 6 ＝ 全部有效验收点 168**。


---

## §1 核心对象（逻辑层，不含物理实现）

### 1.1 对象分层与清单

> 🔴 **对象分两层，不得压平为一类**（Gate A 修正）：
> **① 产品核心事实 / 经验对象 = `Attempt` / `Insight`**；**② 第 ⑨ 步独立输出对象 = `Hypothesis`**。
> `Experience Asset` **不属于以上任何一类** —— 它不是独立对象（见 §1.2）。

**① 产品核心事实 / 经验对象**

| 对象 | 性质 | 状态承载 | 依据 |
|---|---|---|---|
| `Attempt` | 行动单元记录（事实层） | `Draft` / `Formal`（+ 归档位） | `D2` / `D-012` / `D-043` |
| `Insight` | AI 判断的承载对象（经验层） | `candidate` / `accepted` / `rejected` | `D7` / `D-015` |

**② 第 ⑨ 步独立输出对象**

| 对象 | 性质 | 状态承载 | 依据 |
|---|---|---|---|
| `Hypothesis`（两类 `kind`：`grounded` / `model`） | 第 ⑨ 步输出的下一步方向，**有独立输出对象与独立裁决位** | **不继承 `Insight` 三状态机**；只有「未裁决 / 已接受 / 已拒绝」裁决位 | `D-027` / `D-041` / `D-042` |

> ⚠️ `Hypothesis` **是独立输出对象**，但**不得因此获得经验层身份**：它**永不直接成为 `Experience Asset`**、**不进经验区**、**不计入 `N`**、**不承担 grounding**（见 §8）。

### 1.2 明确不存在的对象（禁止在实现中新增）

- ❌ `Experience Asset` **不是独立对象** —— 它是 `accepted Insight` 的**产品视图 / 业务称呼**，**不得建表、不得建独立集合、不得成为第三个事实对象**（`D-015` / `AC-13`）。
- ❌ 不存在"候选经验池""待处理候选""建议库""方向待办视图""经验版本""历史比较版本"等实体（`D-022` / `D-040` / `D-041` / `D-042`）。
- ❌ `Model Suggestion` **不得**被实现为 `Insight` 的子类或同表别名（见 §8）。

### 1.3 层级

```
User → Personal Workspace → Project → Attempt
```

- V1 **不建模**：团队成员 / 角色 / 权限 / 管理员 / 团队工作区（`D3`）。
- `Project` 存在且**可缺省**；它在检索中**只作 Level B 解释维度**，**不得作为准入过滤条件**（`D-019` / `D-045`）。

### 1.4 引用关系（普通关系，不绑定图数据库）

允许的关系语义：`belongs_to` / `similar_to` / `derived_from` / `evidence_for` / `contradicts` / `generated_from`。
**R3**：以上关系**不得**被实现为图数据库、图推理或图谱可视化系统。

### 1.5 内容条目（Content Item）

`Attempt` 的字段不是无来源的裸值集合，而是**逐条携带来源属性的内容条目**。

每个内容条目**必须**携带：

| 属性 | 取值 | 可否缺省 |
|---|---|---|
| `source_type` | `Fact` / `Extraction` / `Inference` | ❌ 不可缺省 |
| `confirmation_class` | `display` / `decision`（仅 `Inference` 必需） | ❌（`Inference` 不可缺省） |
| `decision_state` | `unresolved` / `accepted` / `rejected`（仅 `decision` 必需） | ❌（`decision` 不可缺省） |

---

## §2 状态

### 2.1 `Attempt` 状态

| 状态 | 语义 | 进入条件 |
|---|---|---|
| `Draft` | 已产生原始输入即可暂存；可字段不完整、可中断续写 | 存在**非空、非纯空白**输入 |
| `Formal` | 已成为正式记录 | 目标 + 实际尝试 + 实际结果 + **用户显式确认后的结果状态** |
| 归档位（正交） | 只读、可撤销、不参与新检索 | 用户显式归档动作 |

**不变量**

- `Draft` **不参与**：⑥ 检索 / ⑧ 跨记录比较 / `E1` 来源 / grounding / `N_检索`。
- `Draft → Formal` **只能由用户显式确认触发**；系统不得自动升级。
- **V1 无物理删除**：不存在 `deleted` 终态；归档位**可撤销**。
- 归档位与 `Draft`/`Formal` **是正交的两个维度**，不得合并为一个枚举。

### 2.2 `Insight` 状态迁移矩阵（唯一）

| 起始 | 用户动作 | 迁移后 | 依据 |
|---|---|---|---|
| `candidate` | 接受（仅当 `E1`–`E4` 已满足；等价于 `E5`） | `accepted` | `D-039` |
| `candidate` | 拒绝（**不要求** `E1`–`E4` 满足） | `rejected` | `D-015` |
| `accepted` | 撤销接受 | `candidate`（**不是 `rejected`**） | `D-039` |
| `accepted` | 修改**内容性字段** | `candidate` + 立即重检 `E1`–`E4` | `D-040` |
| `candidate` | 修改内容性字段 | `candidate`（刷新 `E1`–`E4` 呈现） | `D-040` |
| `rejected` | 修改内容性字段 | `candidate`（**不得沿用旧拒绝、不得直接变 `accepted`**） | `D-040` |
| 任一 | 修改**非语义 / 元信息** | **不变** | `D-040` |
| `accepted` | 其引用证据被归档 | **不变**（归档**不是**内容性修改） | `D-043` |

**内容性字段集合（可枚举，不判断"实质性"）**
① 经验命题内容（结论表述）② 适用范围 / 条件集合 ③ 引用清单 ④ 判断依据 / 可验证判据。
**角色不确定的字段一律按内容性字段从严处理。**

**禁止**：可见版本列表 / 版本对比 / 版本回滚 / 版本号选择 / "修改幅度·修改次数"计数或评分。

### 2.3 `Hypothesis` 裁决位（与 `Insight` 状态机**不共用**）

- 两类 Hypothesis（`History-grounded` / `Model Suggestion`）**只有**：`undecided` / `accepted` / `rejected`。
- **`candidate` 一词不得用于任何 Hypothesis**（`D-027`）。
- `Model Suggestion` 的**保存位**与**裁决位是两个独立字段**（`D-042`）：保存 = 内容被保留；裁决 = 用户认可 / 不认可该方向。**保存位为真 ≠ 裁决位为 `accepted`**。

**`Hypothesis` 内容的编辑边界（🔴 v0.2.2 新增，`D-049` 对齐）**

| # | 内容项 | 生成方 | V1 可编辑性 |
|---|---|---|---|
| ① | 待验证假设 | AI | ❌ **只读** |
| ② | 假设依据 | AI | ❌ **只读** |
| ③ | 引用的历史 `Attempt` / `EvidenceRef` | AI 生成，**由系统 / `EvidenceRef` 管理** | ❌ **用户不得直接修改引用关系** |
| ④ | 下一轮建议改变什么 | AI | ❌ **只读** |
| ⑤ | 建议保持哪些条件 | AI | ❌ **只读**（🔴 **用户本人指定"保持某条件"的唯一输入落点 = `Formal Attempt` 层用户 `Fact`**；**本项只引用 / 展示该 `Fact`** —— §13.6 `ADJ-01` = **`CLOSED / DERIVED`**） |
| ⑥ | 观察 / 指标 | 用户 **或** AI | ✅ **允许用户自行提供 / 替换 / 补充**（落为**用户 `Fact` 条目**） |
| ⑦ | 什么结果支持该假设 | 用户 **或** AI | ✅ 同上 |
| ⑧ | 什么结果反驳该假设 | 用户 **或** AI | ✅ 同上 |

- **用户对 ⑥⑦⑧ 的合法实现 = 新增 / 更新自己的 `Fact` 条目**（与 **AI `Inference` 条目分列**）；**不得就地改写 AI 条目**、**不得改变 AI 条目的 `source_type`**、**不得 `Fact` / `Inference` 混写**（§4.2 第 1 条 / §8.2 第 2 条）。
- 🔴 **不建立 `Hypothesis` 内容修改状态机**；**内容修改不得自动回退 `undecided`**；**不存在 `Hypothesis` 版本历史 / 内容修改事件日志 / 新状态枚举**（`D-049`）。
- **修改 / 补充 ⑥⑦⑧ 不改变裁决位** —— `undecided` / `accepted` / `rejected` **均保持原值**。
- **改变 ①②④⑤ 的唯一路径** = 用户修改相关 `Formal Attempt` → **显式发起重新检索 / 重新生成**（§9.1；`D-045` `TR-7`）；**不得直接编辑 AI 生成的原核心内容**；**不得自动重生成 ⑧ / ⑨ 产物**。
- 🔴 **第 ⑤ 项"保持条件"用户 `Fact` 的唯一入口（v0.2.3 新增，`ADJ-01` 派生关闭）**：依据 **`D-027` 第 ⑤ 项的三类来源语义** + **`D-049` 的"⑤ 只读"边界**，**`ADJ-01` 人工裁定采用读法 ③** ——
  - **唯一输入落点 = `Formal Attempt` 层**：用户在 `Formal Attempt` 中明确写入 / 补充「下一轮保持 X 不变」或等价内容，**该内容保存为用户 `Fact`**；
  - **`Hypothesis` 第 ⑤ 项只允许**：**引用 / 展示**该既有 `Fact`（在符合既有规则时把它作为"保持条件"的事实来源）；
  - **`Hypothesis` 第 ⑤ 项不得**：**在 `Hypothesis` 内创建新的用户 `Fact`**；**就地修改原 `Fact`**；**把 AI `Inference` 改成 `Fact`**；**把 `Fact` 与 AI `Inference` 合并成混合来源**；
  - **用户在看到 `Hypothesis` 之后才决定"要保持某条件"时的合法流程**：**回到相关 `Formal Attempt` → 增加 / 修改对应用户 `Fact` → 显式发起重新检索 / 重新生成**（**属既有重跑路径，不是 `D9` 新增步骤**）；
  - **不新增**：`Decision ID` / `D-050` / `Hypothesis` 新状态 / 第 ⑤ 项编辑通道 / 新引用体系 / 新来源类型 / 新状态回退机制 / 新版本历史。
- **两类 `kind` 适用同一编辑边界**。

### 2.4 显式重新生成后的产物语义与「生成批次」（🔴 **v0.2.5 新增，`D-051`**）

> **性质**：canonical `D-051` 的契约落地（人工 `CONFIRMED`；来源 = `S00-03` / `20_INTEGRATION/S00-03_技术决策包.md` §R `DR-01`，人工选择「**方案 C 收窄版**」）。
> **射程**：**只定义"显式重新生成后，新旧 `Insight` / `Hypothesis` 的关系与展示"**；**不新增对象**、**不建立版本系统**、**不改变任何既有状态机**。

| 事项 | 契约口径 |
|---|---|
| **「生成批次」** | 由**用户显式发起的一次重新生成**所产生的结果组 = 一个**生成批次**。最新一次显式生成的结果组 = **「当前生成结果」**；此前各批 = **「较早生成结果」** |
| **「当前生成结果」的语义** | **仅表示"本次最新显式生成得到的结果组"**；**不得**被表述 / 实现为 **真值更高 / 证据更强 / `accepted` / `Experience Asset` / 已确认 / 更可靠**；**不得产生任何等级语义** |
| **旧产物一律保留** | 重新生成**不得删除**旧 `Insight` / `Hypothesis`；**不得覆盖**；**不得因重新生成自动发生状态迁移** |
| **旧 `Insight` 原状态保持** | `candidate` → **仍 `candidate`**；`accepted` → **仍 `accepted`**；`rejected` → **仍 `rejected`**；🔴 **不得**出现 `accepted → candidate` / `accepted → rejected` / `accepted → hidden` / `accepted → revoked` |
| **较早 `accepted Insight` 与 `Experience Asset`** | **较早 `accepted Insight` 仍然是 `accepted Insight`** ⇒ **继续遵循既有规则：`Experience Asset` = `accepted Insight` 的视图**；**只有用户依据既有 `revoke` 机制显式撤销后**才退出；**「较早生成」不得成为自动撤销 `accepted` 的理由** |
| **旧 `Hypothesis` 的 `decision_state`** | `undecided` / `accepted` / `rejected` **不因新一轮生成自动改变**；**新生成的 `Hypothesis` 使用自身新的 `decision_state`，不继承旧 `Hypothesis` 的 `accepted` / `rejected`** |
| **展示口径** | 最新生成批次**默认展开**；**较早生成结果默认折叠**，**用户仍可展开查看** |
| **统一称谓 / 🔴 禁止称谓** | 统一称 **「当前生成结果」/「较早生成结果」**；🔴 **禁止**「**旧版本**」/「**历史版本**」/「**第 N 版**」/「**更早的候选经验**」（较早 `Insight` 可能已是 `accepted`，**不得把 `accepted` 重新叫成 `candidate` / 候选**） |
| **不建立版本系统（明确记账）** | ❌ `version number`；❌ `generation version number`；❌ 版本列表；❌ 版本比较；❌ 版本回滚；❌「第 N 次生成」产品计数；❌ 修改次数；❌ `diff`；❌ `restore old version`。**「当前 / 较早」只是展示与生成批次关系，不是版本管理功能** |
| **与 `D-040` 的边界** | `D-040` 的「**用户直接修改同一 `Insight` 内容**」与 `D-051` 的「**显式重新生成产生新结果**」**是两个不同事件**；**不得混为「重新生成 = semantic edit」**；**不得用重新生成触发 `D-040` 的退回 `candidate` 机制** |
| **与 `D-045` 的边界** | **重新检索 ≠ 自动重新生成 `Insight` ≠ 自动重新生成 `Hypothesis`**；**不得建立"重新检索后自动级联重建 ⑧ / ⑨"**（详见 **§9.5**） |
| **与 `D-049` 的边界** | **不改变** `Hypothesis` 编辑边界（§2.3 / §8.6）；**不建立** `Hypothesis` 内容修改状态机 / 版本历史 / 内容修改事件日志 / 新状态枚举 |
| **推理输入** | **较早 `Hypothesis` 不得仅因仍然存在就自动作为新一轮 `Hypothesis` 的推理输入**；**较早 `accepted Insight`** 是否在其它流程中作为 `Experience Asset` 被正常使用，**继续遵循既有 `accepted Insight` 规则**（`D-051` 不作特殊禁止） |

---

## §3 Reference / ID

### 3.1 ID 规则（逻辑约定，不含具体格式实现）

| 对象 | 逻辑 ID | 说明 |
|---|---|---|
| `Attempt` | `attempt_id` | 全局唯一、稳定、不可复用 |
| `Insight` | `insight_id` | 与生成它的 Attempt 无级联删除关系 |
| `Hypothesis` | `hypothesis_id` | 两类 Hypothesis 共用一个 ID 空间，用 `kind` 区分 |
| `EvidenceRef` | `evidence_ref_id` | 引用记录（见 §5） |
| 状态迁移事件 | `event_id` | 见 §11.3 |

### 3.2 ID 的硬规则

1. **所有 ID 全局唯一**，不得用数组下标 / 排序位置代替。
2. **`Insight` / `Hypothesis` 的引用必须按 ID 指向**，**不得**用文本相似度、标题匹配或列表位置作为引用依据（`D-021 E4`）。
3. **归档不得导致 ID 失效**：归档记录的 ID 继续可解析、可展示、可追溯（`D-043` / `AC-100`）。
4. **`Hypothesis` 与 `Experience Asset` 之间不得存在直接对象引用**（`D-041` / `AC-66`）。

### 3.3 引用完整性

- 第 ⑩ 步的追溯清单与 `N_引用` 计数**必须由同一份 `EvidenceRef` 集合派生**，不得各自计算（见 §6.3 与 §12 第 11 项）。

---

## §4 `source_type`（来源属性）

### 4.1 三层 + 二分

| `source_type` | 产生方式 | 确认要求 | 可否升级为 `Fact` |
|---|---|---|---|
| `Fact` | 用户提供 | 无需 | —（本身即事实） |
| `Extraction` | AI 从原文 / 回答抽取归纳 | 用户可**一次整体校正 / 确认**（不逐字段点选） | ❌ |
| `Inference｜display` | AI 为理解 / 比较 / 导航而产生 | **不要求逐条确认**；可反馈"不同意 / 不相关"；**未反馈不得视为已确认** | ❌ |
| `Inference｜decision` | 会改变持久化业务状态、或会被后续作为决策依据复用 | **必须由用户显式接受或拒绝** | ❌；`accepted` 后来源**仍为** `Inference` |

### 4.2 硬规则

1. **来源类型恒不变**：任何用户动作（接受 / 撤销 / 修改 / 归档 / 保存）**都不得**改变 `source_type`。
2. **`accepted Insight` 在存储与界面中恒标注为 `Inference`**；**禁止出现"已证实""事实""已验证"等措辞**（`D-014` / `D-015` / `AC-11` / `AC-27`）。
3. **追问答案双层落库**：用户原话 → `Fact`；AI 对回答的归纳 → `Extraction`（可修改）。**禁止**把用户原话标为 `Inference`、把 AI 归纳标为 `Fact`（`D-024` / `AC-30`）。
4. **第 ⑤ 项"保持不变"三分**（`D-027` / `AC-32`）：历史条件值 = `Fact`/`Extraction` 引用；**AI 建议"保持" = `Inference`**；**用户本人指定 = 用户 `Fact`**。`Fact` 层**不得**出现 AI 推荐的"保持不变"。
5. **「发生时间」若由用户提供 → 属用户 `Fact`**（或 AI 对其输入的 `Extraction` 表达），**不得**实现为系统自动字段；`created_at` **不得**冒充发生时间（`D-044` / `AC-78`）。
6. **展示型 `Inference` 不得有"已确认"状态**；未反馈 ≠ 已确认（`D-014` / `AC-09`）。
7. **允许缺省的字段必须"显式表达为「未知 / 未提供」"**：
   - **硬要求只有两条**：① **必须显式表达**（不得以"留空 / 缺省即默认值"的方式隐式丢失）；② **不得被误判为相似**（不参与比对；比较结果须标"该维度未比对"；不得因双方都未知而判为相似）（`D-012` / `AC-04` / `D-025` / `AC-22`）。
   - 🔴 **物理表示不在本契约锁定**（**不锁哨兵值、不锁"禁止 NULL"**）—— 由 **Integrator 收敛**（`TQ08`）。任何物理方案只要满足上述两条硬要求即可。

### 4.3 决策型 `Inference` 的复用门禁（`AC-10` 校准后口径）

> **未经显式接受或拒绝的决策型 `Inference`，不得被作为『已确认依据』进入后续复用链路** —— 包括：依据 / 门槛 / 版本来源 / 比较输入 / 后续决策依据。

- 适用对象：结果状态、候选失败原因、`Insight` 是否接受、两类 Hypothesis、AI 候选指标 / 判据。
- **"逐条处理"不是保存前置；"被复用前必须已处理"是硬要求。**
- **结果状态的显式确认仍是 `Formal Attempt` 成立的必要条件**（不变）。
- 未处理的候选失败原因：**保持 `unresolved`（即候选）持久化、状态可见**、**不计入 `N_引用`**、**不得作为 grounding**（`D-048` / `AC-95`）。

---

## §5 Evidence Reference（引用记录）

### 5.1 最小字段集（逻辑）

| 字段 | 必填 | 语义 |
|---|---|---|
| `evidence_ref_id` | ✅ | 引用记录自身 ID |
| `target_id` | ✅ | 被引用的 `Attempt` ID（**禁止指向 `Draft`**） |
| `source_field_path` | ✅ | 指向被引用 `Formal Attempt` 内**可追溯的内容条目**落点；落点层级可为 **`Fact` 或 `Extraction`**（约束见 §5.2 第 8–10 条） |
| `role` | ✅ | `grounding` / `support` / `contradict` / `context` —— **逐条标出，不得省略** |
| `owner_id` | ✅ | 该引用所属的 `Insight` 或 `Hypothesis` |

> 🔴 **v0.2.1 修订（`CCR-S03B-01` / `CCR-S03B-02` 已并入 —— 仅 canonical 对齐，未新增产品机制）**
> 1. **`source_field_path` 落点由「仅 `Fact`」修正为「`Fact` 或 `Extraction`」**：与 `D-027` ⑤（历史条件值 = `Fact` / `Extraction` 引用）、`D-024`（追问答案双层落库）、`AC-32` 一致。原表述「指向被引用的可追溯**事实字段**（`Fact` 引用的落点）」**字面过窄**。
> 2. **`archived_at_ref` 已移除**（**不再是 `EvidenceRef` 最小字段集的必需语义**）：原「**引用建立时**被引用记录是否已归档」的**快照语义取不到最常见路径的「已归档」**（先建引用、后归档 `target`），**不足以支撑** `D-043` `F-2` / `AC-100` 要求的**「来源已归档」**标注。
> 3. **「来源已归档」一律由 `target` 的「当前归档状态」动态派生**（§5.2 第 11 条 / §7.4）。若实现层需要该派生逻辑字段，其语义为 `source_archive_state` / `current_archive_state`（**表示被引用记录的当前状态，不是建立时快照**）；**具体序列化名称归 `TQ17` / Integrator 收敛**（§13.2）。

### 5.2 硬规则

1. **`role` 必须逐条标注**，界面与追溯清单均需可见（`D-035` / `08_UI_SPEC` §3）。
2. **可承担 grounding 的只有对 `Formal Attempt` 的、可追溯的 `Fact` 引用**；`accepted Insight`（Experience Asset）**即使已接受也不能承担 grounding**（`D-030` / `AC-36`）。
3. **未接受的 `Candidate Insight` 只能作推理输入**，须单独标注，**不计入 `N_引用`**（`D-030`）。
4. **`Model Suggestion` 不得出现在任何 `EvidenceRef` 的 `target` 位置**（`D-042` / `AC-70`）。
5. **纯上下文引用（`role = context`）可展示、必须标注「上下文」、不计入 `N_引用`**（`D-035` / `AC-39`）。
6. **结果状态为 `Unknown` 的 `Formal Attempt`**：可承担 `grounding` 或 `context`；**不得单独承担 `support` / `contradict`**（`D-035` / `AC-40`）。
7. **禁止**在引用中携带任何数值化相似度 / 接近度 / 分数（`D-020`）。

**v0.2.1 新增（`CCR-S03B-01` / `CCR-S03B-02` 已并入）**

8. **`source_field_path` 的合法落点 = `Fact` 或 `Extraction` 内容条目**（均须落在 `Formal Attempt` 内且可追溯）。**不得**因落点为 `Extraction` 而把该引用排除于 `EvidenceRef` 体系之外；**也不得**因此改写该条目的 `source_type`（§4.2 第 1 条「来源类型恒不变」不受影响）（`D-027` ⑤ / `D-024` / `AC-32`）。
9. **`role = grounding` 的落点硬约束**：`source_field_path` **必须落在 `Fact` 内容条目**；**`Extraction` 永远不得承担 `grounding`**（§5.2 第 2 条不变；`D-030` / `AC-36`）。
10. **`Extraction` 引用的角色范围**：可按既有语义承担 `support` / `contradict` / `context`。**是否计入 `N_引用` 完全由 `role` 决定**，**与落点层级（`Fact` / `Extraction`）无关**（§6.2 计入表、§6.3 第 7 条）。
11. **「来源已归档」的派生口径**：**必须由 `target` 的当前 `archive_state` 动态派生**；**不得**使用「引用建立时是否已归档」的快照作为**当前展示依据**。归档**不使既有 `EvidenceRef` 失效**、**不减少既有 `N_引用`**、**不撤销既有 `Insight` / `Hypothesis`**、**不自动改写历史结论**（§7.4；`D-043` `F-2` / `F-3` / `AC-74` / `AC-100`）。
12. **不建立第二套引用体系**：`Extraction` 落点**不新增引用对象 / 引用表 / 引用集合 / 第五个 `role`**；**第 ⑩ 步追溯清单与 `N_引用` 仍只由 `EvidenceRef` 单一集合派生**（§3.3 / §12 第 10–11 项不变）。

---

## §6 `N_检索` / `N_引用`

### 6.1 定义

| 记法 | 定义 | 唯一用途 |
|---|---|---|
| `N_检索` | 与当前 Attempt **相关（Level A 命中）且可被引用**的 `Formal Attempt` 条数 | **能力档位**：`0` / `1` / `≥2` —— 回答"结构上可不可能" |
| `N_引用` | **真正参与当前 Hypothesis**、承担 `grounding` / `support` / `contradict` 任一角色的记录条数 | **界面显示的实际证据条数** + 第 ⑩ 步追溯清单 |
| 历史库空 / 非空 | 用户是否存在任何 `Formal Attempt` | **仅用于区分两种空态文案** |

> 🔴 **`N_检索` 的 "Level A 命中" 是维度级判定**：**单个 Level A 维度何时才允许判 `matched`** 见 **§9.4**（**`D-050`：严格语义重叠**）。**本契约不引入**任何数值化命中度 / 权重 / 门槛 / 分数（§6.3 第 5 条）。

### 6.2 计入 / 不计入

| 记录角色 | 计入 `N_引用` |
|---|---|
| `grounding`（含 G4 历史排除项） | ✅ |
| `support` | ✅ |
| `contradict` | ✅ |
| `context`（纯背景说明） | ❌（可展示，须标「上下文」） |
| `Unknown` 结果状态，且仅提供纯上下文 | ❌ |

`Draft` **不计入任何一层**；归档记录**不计入新 `N_检索`**；`Model Suggestion` **没有 `N`**。

### 6.3 硬规则

1. **档位只由 `N_检索` 决定**；**界面显示与 ⑩ 追溯只由 `N_引用` 决定**；**两者不得混用**，不得用经验库总量替代 `N_检索`（`D-035` / `AC-38`）。
2. `N_检索 ≥ 2` 而 `N_引用 = 1` 时：**档位仍为 ≥2，界面如实显示"引用 1 条"**，**不得**声称"多源一致 / 规律稳定"。
3. **首屏展示 3 条属于阅读负荷控制**，**不得截断 `N_检索`**；**折叠 ≠ 排除**（`D-046` / `AC-82`–`AC-86`）。
4. **合法数字仅三类**：① 存在性下界 ② 结构档位 ③ 阅读负荷控制（`D-037`）。
5. **不得引入**任何数值化"接近度 / 相似度 / 匹配度 / 置信度 / 分数 / 星级 / 百分比"（`D-020` / `D-037`）。
6. **归档不追溯减少既有 `N_引用`**（`D-043` / `AC-74`）。
7. **引用落点层级不影响计入规则**（v0.2.1 / `CCR-S03B-01` 已并入）：`N_引用` 的计入与否**只由 `role` 决定**（`grounding` / `support` / `contradict` 计入；`context` 不计入）；**不得**因落点为 `Extraction` 而排除，**不得**因落点为 `Fact` 而自动计入，**不得**设置第三类"部分计入"状态。
8. **`N_引用` 的派生集合唯一**（v0.2.1 / `CCR-S03B-02` 已并入）：**落点层级、`target` 的当前归档状态、首屏折叠均不改变派生来源** —— 第 ⑩ 步追溯清单与 `N_引用` **始终由同一份 `EvidenceRef` 集合派生**（§3.3 / §12 第 10–11 项）；**「来源已归档」只是标注，不是计入 / 排除依据**（`D-043` / `AC-74` / `AC-100`）。

---

## §7 Archive

### 7.1 语义

归档 = **一个可撤销的状态位** + **检索过滤** + **展示标注**。

**不得以物理删除实现"移除"**（`D-043`）。

### 7.2 参与能力矩阵（契约级，必须逐格一致）

| 能力 | `Draft` | `Formal` | 已归档 `Formal` |
|---|---|---|---|
| 参与第 ⑥ 步检索 | ❌ | ✅ 默认 | ❌ 默认 |
| 可作**新** grounding 来源 | ❌ | ✅ | ❌ |
| 计入**新** `N_检索` | ❌ | ✅ | ❌ |
| 可作**既有** ⑩ 证据追溯 | ❌ | ✅ | ✅（标「来源已归档」） |
| 可作**新** `Insight` 的 `E1` 来源 | ❌ | ✅ | ❌（**新建立不成立**） |
| 参与第 ⑧ 步跨记录比较 | ❌ | ✅ | ❌ 默认 |
| 可编辑 | ✅ | ✅ | ❌（**可取消归档后再编辑**） |
| 可归档 / 可取消归档 | ✅ | ✅ | 可**取消归档** |

### 7.3 硬规则

1. **归档可撤销**；取消归档后**完全恢复**正常参与状态（`AC-71`）。
2. **归档后不可编辑**；**取消归档后可编辑**（`AC-72`）。
3. **归档 / 取消归档都不触发第 ⑥ 步检索**（`D-043` / `D-045` / `AC-73`）。
4. **既有引用必须继续存在**：既有 `N_引用` 不追溯减少；**不得自动撤销**既有 `accepted Insight` / 已接受 Hypothesis；**不得自动改写**历史结论（`AC-74` / `AC-100`）。
5. **三种标注不得共用**：① 「来源已归档」（记录状态）② 「引用失效」（**V1 不适用**）③ 「上下文」（证据角色）（`AC-75` / `D-043`）。
6. **系统不得自动归档 / 自动删除**；归档**不得**作为价值判断 / 质量信号 / 完成度信号 / 门槛（`AC-76`）。
7. **不提供物理删除的入口或 API 语义**（`AC-76`）。

### 7.4 归档状态的唯一事实来源与标注派生（**v0.2.1 新增，`CCR-S03B-02` 已并入**）

1. **唯一事实来源 = 被引用 `Attempt` 自身的「当前」`archive_state`**。**不存在第二个归档状态副本**。
2. **「来源已归档」标注必须动态派生**：任何展示位置（含第 ⑩ 步追溯清单）都**读取 `target` 的当前状态**，**不得**使用「引用建立时是否已归档」的快照。
3. **归档不使既有 `EvidenceRef` 失效**；**不减少既有 `N_引用`**；**不撤销既有 `Insight` / `Hypothesis`**；**不自动改写既有结论**（§7.3 第 4 条；`D-043` `F-2` / `F-3` / `AC-74` / `AC-100`）。
4. **取消归档后该标注自动消失**：因标注由状态派生，**无需任何额外写入 / 迁移 / 回填**。
5. **三种标注仍不得共用**（§7.3 第 5 条不变）：① 「来源已归档」（**记录当前状态**）② 「引用失效」（**V1 不适用**）③ 「上下文」（**证据角色**）。
6. **归档状态不得作为任何计数 / 档位 / 判定的输入**（§6.3 第 6 / 8 条；`AC-76`）。

---

## §8 History-grounded Hypothesis / Model Suggestion

### 8.1 对象边界

```
第 ⑧ 步  →  Candidate Insight            （唯一生成时机；candidate / accepted / rejected）
第 ⑨ 步  →  Hypothesis 输出
              ├─ History-grounded Hypothesis  （kind = grounded）
              └─ Model Suggestion             （kind = model）
```

- 第 ⑨ 步的两种输出**一律不得称为 `Candidate Insight`**（`D-027` / `AC-33`）。
- **两类输出永不直接成为 `Experience Asset`**；**不得在经验区出现**；**不得被任何"经验"措辞指代**（`D-041` / `AC-66`）。

### 8.2 Grounding 判据（硬条件）

**构成 grounding（满足 G1–G4 之一且引用可追溯）**
G1 问题对象 / 变量来自历史 · G2 条件来自历史 · G3 目标指标来自历史 · G4 排除项来自历史（已试过且未达预期）

**不构成 grounding（命中 N1–N6 任一 → 整体只能为 `Model Suggestion`）**
仅写"参考了历史"而无字段可指 · 引用无关记录 · 仅措辞相似 · 关键变量完全来自模型先验 · 引用 `Draft` · 相关字段全为「未知」

**硬规则**
1. **grounding 是硬条件**；**不设"部分锚定"中间等级**（要么成立，要么不成立）（`D-030` / `AC-36`）。
2. **来源分区只有两个**：【历史证据】【模型先验】；**"混合"不得作为第三来源标签**（至多描述"两分区同时存在"）（`AC-37`）。
3. **模型先验区必须整体标注「非你的历史经验依据」**（`D-036`），且**不得承载命题成立的唯一依据**。
4. **`Model Suggestion` 的整体标注与是否保存 / 是否被接受无关，恒存且是整体标注（不是小标签）**（`D-042` / `AC-69`）。

### 8.3 数量与出口

- `History-grounded Hypothesis` 数量 = **1–2 条**，由**独立可验证方向数**决定，**不由 `N_检索` 决定**；禁止凑数 / 近义改写 / 默认 2 条 / ≥3 条（`D-028` / `AC-34`）。
- 输出 0 条时**必须**给出原因类别，按出口路由（见 §9.2）。
- `Model Suggestion` **可选、数量另计、不计入 ⑨⑩ 验收**，且**不得占据历史依据型输出的位置**（`AC-46`）。

### 8.4 `Model Suggestion` 的两个动作（必须分开建模）

| 动作 | 含义 | 表示的 / 不表示的 |
|---|---|---|
| A. 保存 / 持久化 | 保留该建议供本次记录后续回看 | **内容被保留**；**≠ 接受 · ≠ 采纳 · ≠ 确认** |
| B. 接受 / 拒绝 | 对该第 ⑨ 步决策型 `Inference` 的裁决 | 认可 / 不认可这个方向；**不使其成为经验、不获得 grounding** |

**硬规则**：已保存但**未完成**裁决 → **只能表达为"内容被保留，决策状态仍未完成"**，**不得作为已接受方向复用**；`Model Suggestion` **不计入 `N_检索` / `N_引用`、不承担 grounding、不得被 ⑩ 追溯、不得升级为 `History-grounded`**（保存后亦然）（`D-042` / `AC-67`–`AC-70`）。

### 8.5 唯一转化路径（唯一合法闭环）

```
Hypothesis（任一 kind）
   → 用户实际执行
   → 新 Formal Attempt（结果可为 Failed / Partial / Success / Unknown）
   → ⑥ → ⑦ → ⑧ 生成新 Candidate Insight
   → E1–E5 → Experience Asset

❌ 禁止：Hypothesis → 用户接受 → Experience Asset
```

### 8.6 `Hypothesis` 编辑边界（🔴 **v0.2.2 新增 / v0.2.3 补第 7 条，`D-049` + `ADJ-01` 派生关闭对齐**）

1. **只读集 = ①②③④⑤**（AI 生成的核心内容）；**可输入集 = ⑥⑦⑧**（观察指标 / 支持判据 / 反驳判据）。
2. **⑥⑦⑧ 的用户内容落库为 `Fact`**；**AI 提出者仍为 `Inference`**；**二者必须分列** —— **不得合并成一段**、**不得以"混合"作为来源标签**（§8.2 第 2 条）。
3. **AI 生成核心 `Hypothesis` 后，AI 不得自动改写用户 `Fact` 条目**；用户 `Fact` 条目**不得被 AI 覆盖 / 归一化 / 重写 / 删除**。
4. **用户提交 / 替换 / 补充 ⑥⑦⑧ 不改变裁决位**；**不产生"内容已修改"状态**；**不新增事件日志类型**；**不触发任何回退**。
5. **`Model Suggestion` 适用同一编辑边界**（两类 `kind` 一致）。
6. **改变 ①②④⑤ 的路径** = 修改 `Formal Attempt` → **显式发起重新检索 / 重新生成**（§9.1）；**属后续重跑动作**，**不是 `D9` 新增步骤**；**不得自动重生成 ⑧ / ⑨ 产物**。
7. 🔴 **第 ⑤ 项"保持条件"用户 `Fact`（v0.2.3 改写，原"邻接待确认"已关闭；`ADJ-01` = `CLOSED / DERIVED`）**：`D-027` 第 ⑤ 项「**用户本人明确指定"保持某条件" = 用户 `Fact`**」在 V1 的落点**已裁决为读法 ③** ——
   - **唯一输入落点 = `Formal Attempt` 层用户 `Fact`**（用户在 `Formal Attempt` 中写入 / 补充「下一轮保持 X 不变」或等价内容）；**`Hypothesis` 第 ⑤ 项只允许引用 / 展示该既有 `Fact`**；
   - **`Hypothesis` 第 ⑤ 项不得**：创建新的用户 `Fact`；就地修改原 `Fact`；把 AI `Inference` 改成 `Fact`；把 `Fact` 与 AI `Inference` 合并成混合来源；
   - **⑤ 本身仍只读**，**不提供 ⑤ 的直接编辑入口 / 用户输入框 / 并列用户条目 / `Hypothesis` 内的"保持条件"编辑入口**（本条第 1 款口径不变）；
   - **依据 = `D-027` + `D-049`**；**不创建 `D-050`**、**不改 `D-027` / `D-049` 语义**、**不新增产品机制**（§13.6）。
8. **不建立第二套来源体系**：⑥⑦⑧ 的用户条目**不新增来源类型 / 不新增"部分锚定"等级 / 不新增第五个 `role`**。
9. 🔴 **显式重新生成不改变旧 `Hypothesis` 的 `decision_state`（v0.2.5 新增，`D-051`）**：
   - **旧 `Hypothesis` 的 `undecided` / `accepted` / `rejected` 不因新一轮显式生成而自动改变**；**新生成的 `Hypothesis` 使用自身新的 `decision_state`，不得继承旧 `Hypothesis` 的 `accepted` / `rejected`**；
   - **较早 `Hypothesis` 不得仅因仍然存在就自动作为新一轮 `Hypothesis` 的推理输入**；
   - **旧 `Hypothesis` 不得被删除 / 不得被覆盖**；**较早生成结果默认折叠**（§2.4 / §9.5）；
   - **本项不引入版本系统**（❌ 版本号 / 版本列表 / 版本比较 / 版本回滚 / 修改次数 / "第 N 版"）。

---

## §9 D9 十步主要 I/O（契约级）

> 本表只锁**语义与门槛**，不锁交互形态、不锁 API 边界、不锁 UI 组件。

| 步 | 输入 | 系统行为（契约） | 输出 / 落库 | 门槛 | 依据 |
|---|---|---|---|---|---|
| ① | 用户自然语言文本 | 创建记录 | `Attempt`（`Draft`）；`raw_text` = `Fact`；时间类字段 = **系统元数据** | **非空、非纯空白**；**不设字符数阈值、不设语义判定**；空 / 纯空白**只给入口提示，不得报错** | `D-047` / `AC-87` / `AC-88` |
| ② | `Draft.raw_text` | AI 结构化解析 + **缺口检测（P1 / P2 / P3）** + 追问决策 | `Extraction` 条目组 + 缺口报告；解析状态**只用非等级化状态描述**（已抽取 / 未抽取 / 抽取失败 / 待用户确认） | 无（AI 失败 → **Runtime 失败**，允许仅保存原文并标「尚未解析」） | `D-016`–`D-018` / `D-023` / `D-047` |
| ③ | ② 的输出 | 用户**一次整体校正 / 确认**；用户改动值 → 用户 `Fact`；AI 归纳保留 `Extraction` | 经确认的字段值集合 | 用户确认后方可进入 ④ | `D-011` / `D-014` / `AC-07` |
| ④ | ③ 的输出 | AI 生成候选失败原因 | 0..n 条 `Inference｜decision`，`decision_state = unresolved`；**允许 0 条**且须显式说明「当前依据不足，暂不推断原因」 | **无数量门槛**；**不要求逐条处理即可保存**；**禁止凑数** | `D-048` / `AC-91`–`AC-93` |
| ⑤ | ③④ 的输出 | 用户确认后保存；**保存成功 = 第 ⑥ 步唯一自动触发条件（事件）** | `Formal Attempt` 持久化 + `EvidenceRef` 基础数据 + L4 四项（§11） | **目标 + 实际尝试 + 实际结果 + 用户显式确认的结果状态**；`P1` 未建立 → **保持 `Draft`**（即使追问预算用尽） | `D-012` / `D-023` / `D-045` / `AC-79` / `AC-Q06-5` |
| ⑥ | `Formal Attempt` | **自动触发**检索（同步、幂等、范围 = 全部历史，排除 `Draft` 与归档）；**逐候选 × 逐 Level A 维度做三态判定（维度级判据见 §9.4）** | 相关候选集合 + `N_检索` + **命中的 Level A 维度集合** | 不设用户发起前置；**不得插入未在 `D9` 中列出的用户动作**；重复保存幂等 | `D-045` / `D-019` / **`D-050`** / `AC-79` |
| ⑦ | ⑥ 的输出 | 展示**相似点与差异点**（均为展示型 `Inference`） | 相似点 / 差异点 / "为什么相关"理由列表 / **未比对维度清单**；首屏主对照默认 3 条，可展开且必须可达 | **不显示任何数字相似度**；未知维度标「该维度未比对」；**不得补满 / 凑数** | `D-019` / `D-020` / `D-025` / `D-046` |
| ⑧ | ⑦ 的输出 + 已确认依据 | AI 提炼可复用经验（**唯一生成时机**），并检查 `E1`–`E4`；**用户显式重新生成时 = 新生成一个「生成批次」**（§2.4 / §9.5） | `Insight`（`candidate`）+ `E1`–`E4` 满足情况与缺失项 + 引用清单 | `E2`/`E3` 不满足 → **保持 `candidate` + 三段式（缺什么 / 为什么重要 / 如何补充）**，**不进入 0 条出口** | `D-021` / `D-022` / `D-038` / **`D-051`** / `AC-97` / `AC-99` |
| ⑨ | ⑦ 的输出 + 已接受 Insight（仅作推理输入） | 先生成 `History-grounded Hypothesis`，再考虑可选 `Model Suggestion`；**生成后 ①–⑤ 只读、⑥⑦⑧ 可接受用户 `Fact` 条目（§2.3 / §8.6）**；**第 ⑤ 项只引用 / 展示 `Formal Attempt` 中既有的"保持条件"用户 `Fact`（§9.3）**；**用户显式重新生成时 = 新生成一个「生成批次」，旧 `Hypothesis` 保留且 `decision_state` 不变**（§2.4 / §9.5） | 两类 Hypothesis 输出（8 项结构 + 【历史证据】/【模型先验】两分区 + 证据概况）；**用户提交 ⑥⑦⑧ 时与 AI `Inference` 条目分列持久化** | 先判 `N_检索` → 再判 grounding → 再判可验证判据；**1–2 条**；**用户编辑 ⑥⑦⑧ 不改裁决位、不触发回退** | `D-027`–`D-033` / **`D-049`** / **`ADJ-01`** / **`D-051`** / `AC-31`–`AC-37` / **`AC-101`–`AC-108`** / **`AC-116`–`AC-123`** |
| ⑩ | ⑨ 的输出 | 证据可点开核对；追溯清单与 `N_引用` 一致 | 可点开的 `EvidenceRef` 列表（含角色标注；已归档记录标「来源已归档」） | **`N_引用` 与清单必须一致**；旧引用不得静默消失 | `D9` / `D-035` / `D-043` / `AC-100` |

### 9.1 触发与幂等（跨步）

| 事件 | 是否触发 ⑥ |
|---|---|
| `Formal Attempt` 保存成功 | ✅ **唯一自动触发条件** |
| `Draft` 保存 / 仅编辑 `Draft` / 解析 / 追问 / 中途离开 / 续写 | ❌ |
| **保存失败** | ❌ |
| `Formal Attempt` 内容被修改 | ❌ **不自动重跑**；须**显式提示**「该记录已被修改，先前的历史比较结果可能不再适用」+ 提供**用户显式发起的「重新检索」** |
| 归档 / 取消归档 | ❌ |

**不得**产生后台 / 异步 / 批量 / 定时检索；**不得**引入「已检索过」产品层字段；**不得**把"检索新鲜度"做成门槛 / 评分 / 用户可见结论（`D-045` / `AC-80` / `AC-81`）。

### 9.2 第 ⑨ 步出口路由

| 出口 | 触发条件 | 处置 |
|---|---|---|
| `EXIT-A` `evidence-insufficient` | `N_检索 = 0`（或虽有相关记录但不满足 grounding 判据） | 不产出 `History-grounded`；显式说明并**区分两种空态**；可选 `Model Suggestion`；提供"仅保存本次尝试"；**不阻断** |
| `EXIT-B` `not-verifiable` | **存在 grounding**，但当前无可区分、可观察的验证判据 | 显式说明"当前无法形成可验证的观察方式"；**不得编造**；该条**不计入 ⑨ 的"可验证假设"** |
| `EXIT-C` `not-formable` | 连明确的候选命题都无法形成 | 显式说明"当前不足以形成明确的可复用命题"；**允许为空并通过** |

**适用范围（不得混用）**：**第 ⑧ 步常用出口 = `EXIT-A` / `EXIT-C`**；**`EXIT-B` 主要属第 ⑨ 步**；**`E2`/`E3` 不满足不进入任何出口**（走 `D-038`）。
**禁止**把三者统一写成"历史证据不足"（`D-047` / `AC-97` / `AC-98`）。

### 9.3 第 ⑤ 项"保持条件"用户 `Fact` 的进入点与重跑路径（🔴 **v0.2.3 新增，`ADJ-01` 派生关闭**）

> **性质**：**跨步补充说明，不是 `D9` 新增步骤**；**不改变 ①–⑩ 的步数与顺序**（`D9`）。

| 事项 | 契约口径 |
|---|---|
| **唯一输入落点** | **`Formal Attempt` 层**（第 ③ / ⑤ 步所在记录）：用户在 `Formal Attempt` 中明确写入 / 补充「下一轮保持 X 不变」或等价内容 → **保存为用户 `Fact`** |
| **第 ⑨ 步可读** | `Hypothesis` 第 ⑤ 项**可以引用 / 展示**该既有用户 `Fact`，并可在符合既有规则时将其作为"保持条件"的事实来源 |
| **第 ⑨ 步不可做** | **不得**在 `Hypothesis` 内创建新的用户 `Fact`；**不得**就地修改原 `Fact`；**不得**把 AI `Inference` 改成 `Fact`；**不得**把 `Fact` 与 AI `Inference` 合并为混合来源 |
| **用户在看到 `Hypothesis` 之后才决定"要保持某条件"** | 合法流程 = **回到相关 `Formal Attempt` → 增加 / 修改对应用户 `Fact` → 显式发起重新检索 / 重新生成**（§9.1；`D-045` `TR-7`）→ 新的 `Hypothesis` 第 ⑤ 项可引用该 `Fact` |
| **是否属新步骤** | ❌ **否** —— 属**既有重跑路径**；**不得**自动重生成 ⑧ / ⑨ 产物；**不得**自动改写既有裁决位 |
| **不新增** | 新对象 / 新引用体系 / 新来源类型 / `Hypothesis` 第 ⑤ 项编辑通道 / `Hypothesis` 新状态 / 新状态回退机制 / 新版本历史（`D-049` / `ADJ-01`） |
| **依据** | **`D-027`（第 ⑤ 项三类来源语义）+ `D-049`（⑤ 只读）**；**不创建 `D-050`** |

> 🟢 **就地补注（v0.2.4，按「不改写历史」保留上行原文）**：上行「**不创建 `D-050`**」是 **`ADJ-01` 关闭当时的历史表述，且继续有效**（`ADJ-01` **本身未创建任何 `Decision`**）。**`D-050` 这一编号其后已由 `D-050`｜Level A 维度 `matched` 的严格语义重叠判据占用**（见 §9.4），**与 `ADJ-01` 无关**。

### 9.4 第 ⑥ 步 Level A 维度 `matched` 的严格语义重叠判据（🔴 **v0.2.4 新增，`D-050`**）

> **性质**：本小节是 **canonical `D-019` Level A 的维度级判据补全**（来源 = **`D-050`**，人工 `CONFIRMED`；触发 = **`SP-03 RESULT = INCONCLUSIVE`**）—— 补上此前 canonical 未定义的「**构成可比对重叠**」判据。
> **射程**：**只定义"单个 Level A 维度何时才允许判 `matched`"**；**不新增 Level A 维度**、**不改 Level B / Level C**、**不引入任何数值化门槛**。**`matched_level_a_dimensions` 非空 → `related` 仍属 `S03-D` / Integrator 的架构收敛项**。

| 事项 | 契约口径 |
|---|---|
| **`matched` 唯一准入语义** | 两侧在该维度上表达 **「相同的实质内容」** 或 **「语义等价的改写」** 时，**才允许**判 `matched` |
| **允许的等价形式（穷尽列举）** | ① **同义改写**；② **表述顺序不同但实质相同**；③ **单位等价表达**；④ **不改变实质含义的语言改写** |
| **明确不充分（不得据此判 `matched`）** | 属于**同一类别** / 属于**同一主题** / 使用**同一参数类型** / 使用**同一指标名称** / **都在讨论同一种现象** / **都属于同一种技术大类**；🔴 **同一参数族 / 技术类别下的不同具体技术对象或参数对象**（**`D-052`（v0.2.5 新增）**） |
| **其余情形** | 双方均 `present` 但**不满足上述严格语义条件** ⇒ **`compared_not_matched`**（**纯内部量**：不发布、不计入任何数字、不进入理由、不作为相关依据 —— `S03-D` 既有口径，本版不改变） |
| **`unknown` 拦截（规则不变）** | 任一侧 `presence_state = unknown` ⇒ **`uncompared`**，**不得进入** `matched` / `compared_not_matched` 的语义判定；**双方都 `unknown` 仍然不能 `matched`**（`TC-40` / `AC-22` / `D-025`） |
| **依据** | **`D-050`**（人工 `CONFIRMED`；来源 = `S00-03` / `SP-03`）+ **`D-052`**（人工 `CONFIRMED`；来源 = `S00-03` / POST-INTEGRATOR `DR-02`；**`actual_attempt` 维度的明确负例**）；**不改变** `D-019` / `D-020` / `D-025` / `D-037` |

**四维度逐维判据（严格语义重叠）**

| Level A 维度 | `matched` 的**必要语义条件** | `matched` 示例 | `compared_not_matched` 示例 |
|---|---|---|---|
| `goal`（目标） | 相同或语义等价的**具体目标 / 待解决问题**；**仅"都是优化目标"不充分** | — | 「**降低颜色变化**」vs「**缩短干燥时间**」 |
| `actual_attempt`（方案 / 行动 / 技术对象） | 相同或语义等价的**核心方案 / 行动 / 技术对象**；**仅"都是干燥方法""都是模型训练方法"不充分** | — | 同属干燥方法但**核心做法不同**；🔴 **（`D-052` v0.2.5 新增）**「**调整热风参数**」vs「**调整送风参数**」—— **`热风参数` 与 `送风参数` 属可区分的具体技术对象 / 参数对象；仅"都属于干燥参数 / 都涉及送风·热风系统 / 都属于参数调整行为 / 属同一技术类别"不充分 ⇒ `compared_not_matched`** |
| `condition`（条件） | 相同或语义等价的**具体条件内容**；**仅因二者同属"温度"不得 `matched`** | 「**50°C**」vs「**50 摄氏度**」 | 「**50°C**」vs「**70°C**」 |
| `actual_result`（结果 / 现象 / 结论方向） | 相同或语义等价的**实际观察结果 / 现象 / 结论方向**；**不得仅因双方都谈论「开裂」或「含水率」而 `matched`** | 「**幻觉引用减少**」vs「**无效引用明显下降**」 | 「**出现明显开裂**」vs「**无明显开裂**」；「**含水率仍偏高**」vs「**含水率达到要求**」 |

**本小节尤其不得新增（明确记账）**：❌ **≥2 个维度命中门槛**；❌ **"必须命中 `goal`"**；❌ **权重**；❌ **`similarity score`**；❌ **`confidence`**；❌ **`rank score`**；❌ **百分比**；❌ **等级**。

**🔴 `D-052` 的补充说明（v0.2.5 新增）**：`actual_attempt` 维度的负例「**调整热风参数**」vs「**调整送风参数**」= **`compared_not_matched`** —— **`D-052` 只追加这一条明确负例，不改变本小节的判据本体**；**用户可感知影响 = ⑦ 中不显示该 `actual_attempt` 相似点**（`compared_not_matched` 为**纯内部量**：不显示数值 / 不形成负面等级 / 不计数 / 不参与相关性评分 / 不产生 `similarity score`）。

**边界（本版不做）**：**不 `CONFIRM` `TQ04`**；**不 `CONFIRM` `R-A`**；**不做技术选型**；**不修改 `04_RETRIEVAL_AND_COMPARISON.md`**（该文件为 `S03-D` Worker 产出，**仍为 `PROPOSED`**）—— **判据的契约层落点 = 本小节**；**是否需要把该判据（含 `D-052` 负例）回写到 Worker 产出 `§D.2`，属后续 Integrator 收敛 / Local Landing 动作，不在本版范围**；**不修改 `05_TEST_DEMO_DEPLOY.md` 中 `TE-130` 的历史 Worker 文本**（**新的 canonical 验收由 `AC-124`–`AC-126` 覆盖**）。

#### 9.4.1 Level A 四维度 → 主字段路径映射表（🔴 **`CONTRACT CLARIFICATION`，不是 CCR**）

> **性质**：**`CONTRACT CLARIFICATION`** —— 属 **已有 `CONFIRMED` Decision（`D-019` / `D-050`）的技术展开与落点补齐**，落实本契约 **§12 第 6 项**（"**Level A 四维度集合与其字段路径映射**……**映射表由 Integrator 冻结**"）与 **§13.2 `TQ19`**（Integrator 收敛项）。
> 🔴 **不是 CCR**（不是 Worker 提出的 Contract Change Request）；🔴 **不是新 `Decision`、不生成 `Decision ID`、不新增 `AC`**；🔴 **不改变** `D-019` / `D-050` / `D-052` / `D-061` 的任何语义。
> 🔴 **射程**：**只把"每个 Level A 维度恰有 1 个主字段路径"这一既有约定显式成表**；🔴 **不新增维度、不新增字段、不改变三态判定、不改变 `related` / `N_检索` / `N_引用` 口径**。

| # | Level A 维度（`D-019`，四个且仅四个） | **主字段路径（冻结）** | 说明 |
|---|---|---|---|
| 1 | **`goal`**（目标） | **`goal`** | 目标 / 待解决问题 |
| 2 | **`approach` / 方案·技术对象** | **`actual_attempt`** | 方案 / 行动 / 技术对象（**用户实际尝试了什么**；🔴 `D-052` 负例落在此维度） |
| 3 | **`condition`**（条件） | **`condition`** | 进行该尝试时的具体条件 |
| 4 | **`result` / 现象·结论方向** | **`actual_result`** | 实际观察到的结果 / 现象 / 结论方向 |

**硬规则（🔴 与 §12 第 6 项一致）**：

- **每个维度恰 1 个主字段路径**；🔴 **不得**为同一维度引入多个并列主字段、🔴 **不得**引入加权 / 门槛 / 优先级；
- 映射关系 **只用于"把某个 Level A 维度定位到 `Attempt` 上的字段"**；🔴 **不改变** §9.4 正文的**维度级 `matched` 严格语义重叠判据**；
- 🔴 **`unknown` 拦截规则不变**（`presence_state = unknown` ⇒ `uncompared`，由**结构规则**产生，**不是 AI 输出**）；
- 🔴 **`matched_level_a_dimensions` 非空 → `related`** 仍是 **Integrator 架构收敛项**（本表**不改变**这一点）；
- 🔴 **不得**输出任何数值相似度 / 权重 / 门槛 / 等级（沿用 §9.4 记账）；
- **`presence_state` 的物理表示**仍由 Integrator 收敛（§4.2 第 7 条 / `TQ08`），**本表不涉及**。

> **登记**：本小节为 **Gate C `CONTRACT CLARIFICATION`**（2026-09-24），与 **`CC-02`（`TQ02` 物理 schema = 实现参数）** 一并处理：**`CC-02` 不升级为 Contract Decision**，其落点 = 实现层 `IMPLEMENTATION SCHEMA PLAN`。
> 🔴 **本小节不进入 §14.1 的 CCR 记账**（**本版无新增 CCR**）。

### 9.5 重新检索 / `Insight` 重新生成 / `Hypothesis` 重新生成 的三层区分与不级联（🔴 **v0.2.5 新增，`D-051`**）

> **性质**：**跨步补充说明，不是 `D9` 新增步骤**；**不改变 ①–⑩ 的步数与顺序**（`D9`）；**不新增触发条件**。
> **射程**：**只区分三个动作、并明确互不自动级联**；**不建立版本系统**；**不改变 `D-045` / `D-049` 的任何语义**。

| 动作 | 由谁发起 | 结果 | 是否自动触发其它动作 |
|---|---|---|---|
| **重新检索（`retrieval rerun`）** | **用户显式发起**（`D-045` `TR-7`；`Formal Attempt` 修改后须显式提示 + 显式入口） | 重跑第 ⑥ / ⑦ 步，产生新的比较结果 | 🔴 **否** —— **不自动重新生成 ⑧ / ⑨** |
| **`Insight` 重新生成** | **用户显式发起** | 新生成一批 `Insight` → 该批 = **「当前生成结果」**；此前各批 = **「较早生成结果」** | 🔴 **否** —— **不自动重新生成 ⑨** |
| **`Hypothesis` 重新生成** | **用户显式发起** | 新生成一批 `Hypothesis` → 该批 = **「当前生成结果」**；此前各批 = **「较早生成结果」** | 🔴 **否** —— **不自动改变任何既有裁决位** |

**硬规则**

1. **重新检索 ≠ 自动重新生成 `Insight` ≠ 自动重新生成 `Hypothesis`**；**不得建立"重新检索后自动级联重建 ⑧ / ⑨"的机制**（`D-045` + `D-051`）。
2. **任何一次重新生成都必须由用户显式发起**；**不得**产生后台 / 异步 / 批量 / 定时生成。
3. **每一批生成结果只保留其自身生成时刻的语义**：**旧产物不删除、不覆盖、不自动迁移状态**（§2.4）。
4. **展示层**：最新批次**默认展开**；**较早生成结果默认折叠且可展开**；统一称 **「当前生成结果」/「较早生成结果」**。
5. **🔴 不建立版本系统**：❌ 版本号 / `generation version number` / 版本列表 / 版本比较 / 版本回滚 / "第 N 次生成"产品计数 / 修改次数 / `diff` / `restore old version`。
6. **不改 `D9` 步数与编号**；**不新增 ⑤→⑥ 之间或 ⑦→⑧ / ⑧→⑨ 之间的用户动作**。
7. **依据**：**`D-051`**（人工 `CONFIRMED`）；**不改变** `D-022`（第 ⑧ 步唯一生成时机）/ `D-040` / `D-043` / `D-045` / `D-049`。

---

## §10 Runtime / fallback 分类

### 10.1 三层语义（**必须分开实现，不得合并**）

| 层 | 标识 | 语义 | 允许的处理 |
|---|---|---|---|
| **层 1** | `GATE`（对象门槛未满足） | `Draft` 不升级 `Formal` / `Insight` 不晋升 / `History-grounded` 不生成 | **只影响升级与输出资格**；**不得删除已有产物、不得显示为系统错误、不得锁死用户继续操作** |
| **层 2** | `RUNTIME`（技术失败） | AI 调用失败 / 超时 / 保存失败 / 检索失败 | **保留已有数据 + 明确提示 + 允许重试 + 提供恢复路径**；**不设重试次数上限 / 冷却门槛**；**重试不改变已保存数据、不覆盖用户已修改内容** |
| **层 3** | `ACCEPTANCE`（验收） | `D9` 十步在 Acceptance fixture 下**必须完整成功执行** | **Runtime 可恢复 / 可降级 / 可重试 ≠ 验收可以跳过步骤** |

> **正式表述**：「V1 不设计不可恢复的业务终止；未来若新增会阻止用户继续完成主链的业务条件，必须重新经过产品决策。」

### 10.2 命名消歧（本契约强制）

⚠️ 项目内存在**两组同名 A/B/C**，**极易混淆**，本契约强制使用不同前缀：

| 组 | 前缀 | 取值 | 出处 |
|---|---|---|---|
| 三层语义 | `GATE` / `RUNTIME` / `ACCEPTANCE` | 见 §10.1 | `D-047` / `AC-89` / `AC-90` |
| 输出出口 | `EXIT-A` / `EXIT-B` / `EXIT-C` | 见 §9.2 | `D-028` / `D-029` / `AC-97` / `AC-98` |

**Worker 不得**在代码、日志、接口或文案中使用裸 `A` / `B` / `C` 指代二者之一。

> 📌 **本项性质**：上述两项消歧命名属**首次 Shared Contract 起草期的一致性修正**，**已直接并入本契约本体**，**不称 CCR**、不作为待批准候选（见契约版本说明 §15）。

### 10.3 fallback 行为

| 情形 | fallback |
|---|---|
| AI 解析失败 / 超时 | 允许"仅保存原文"，标「尚未解析」；**不得伪造解析结果**；显式提供"重新解析" |
| 解析不可达语义 | **不得**阻断第 ① 步；"语义是否可解析"**只作第 ② 步的解析质量输入** |
| `N_检索 = 0` | **合法冷启动降级**（非错误、非生成失败、非功能缺失）；第 ①②③④⑤ 步**完整可用** |
| 两种空态 | 「历史库为空」与「有历史但本次无相关」**必须由不同状态区分，不得共用同一文案** |
| 补录 | **可选**；**不得**作为使用前置；**不得**有进度条 / 解锁机制 / 固定数量门槛 / "还差 N 条" |

---

## §11 L4 与产品层 / 技术层隔离

### 11.1 产品层 L4 系统自动记录 = **恰 4 项**

| # | 字段（逻辑） | 语义 |
|---|---|---|
| ① | `created_at` | 创建时间（系统元数据） |
| ② | `updated_at` | **最近修改时间**（**正式保留**；须能支撑"该 Formal Attempt 是否被修改过"的判定） |
| ③ | `data_source_nature` | 数据来源性质（现场记录 / 事后补录 / Demo 示例数据）—— **复用既有字段，不新增重复字段** |
| ④ | `ai_source_marks` | AI 内容来源标记（逐条标 `Fact` / `Extraction` / `Inference`，含 display / decision） |

**不得把 L4 记成 5 项**；**「发生时间」不计入 L4**（见 §4.2 第 5 条）。

### 11.2 技术 / observability 层（**可存在，但必须隔离**）

`model` / `model version` / `prompt version` / `prompt text` / `token` / `cost` 核算值 / `temperature` / 采样参数 / 检索内部得分 / `trace id` / `session id` / 调用耗时 / 重试次数 / 任何排障运行参数

**强制三条**：① 与产品层**物理或逻辑隔离**；② **不参与任何产品判定**；③ **不进入用户界面、不进入第 ⑩ 步追溯清单、不改变任何用户可感知状态**。

### 11.3 产品层行为留痕（`Insight` 状态迁移事件日志）

- **最小内容** = **状态迁移 + 时间 + 触发原因类别**（用户接受 / 用户撤销 / 内容修改 / 重新接受）（`D-040` / `AC-65`）。
- **属产品层行为留痕，不是技术观测日志**；**不得**扩展为排障日志界面；**不得**与技术层字段混存。
- **不得**被用作价值评分 / 质量排名 / 经验等级 / 修改次数评分（`D-040`）。
- **不得**据此自动生成可见版本列表 / 版本对比 / 版本回滚（`D-040`）。

---

## §12 Worker 禁止自行修改的共享语义（硬清单）

> 以下条目**只允许 Integrator 修改**；变更须向 Integrator 提交 **Contract Change Request**（§14），由 Integrator 判定归属（Integrator 可收敛 / 需升级 **Gate B**）。
> Worker 若发现需要变更，**只提 CCR，不得自行改**。

| # | 禁止自行修改项 | 理由 |
|---|---|---|
| 1 | **枚举值名与语义**：`Draft` / `Formal`、`candidate` / `accepted` / `rejected`、`undecided`、`Fact` / `Extraction` / `Inference`、`display` / `decision`、`grounding` / `support` / `contradict` / `context` | 跨 Worker 共享词汇，改名即破坏契约 |
| 2 | **`Insight` 状态迁移矩阵**（§2.2） | 产品机制已冻结 |
| 3 | **`Hypothesis` 的 `kind` 与裁决位模型**（§2.3） | `D-027` / `D-041` / `D-042` |
| 4 | **`N_检索` / `N_引用` 的定义与计入规则**（§6） | `D-035` / `D-037` |
| 5 | **grounding 判据 G1–G4 与 N1–N6**、**两分区名称**（§8.2） | `D-030` |
| 6 | **Level A 四维度集合**（目标 / 方案·技术对象 / 条件 / 结果·现象）与其字段路径映射，以及**维度级三态判据**（**`matched` 的严格语义重叠** / `compared_not_matched` / `uncompared`，见 **§9.4**，含 **`D-052` 的 `actual_attempt` 明确负例**） | `D-019`；**`D-050`（v0.2.4 新增）**；**`D-052`（v0.2.5 新增）**；映射表由 Integrator 冻结 —— 🟢 **已冻结（2026-09-24，Gate C `CONTRACT CLARIFICATION`）：见 §9.4.1** |
| 7 | **Level B 不得单独成立**、**Level C 只作辅助排序**的实现约束 | `D-019` / `Q16` |
| 8 | **「未知 / 未提供」的显式表达要求与语义**（**物理表示由 Integrator 收敛**，见 §4.2 第 7 条） | 全链路比较逻辑依赖它 |
| 9 | **归档过滤在各查询中的注入位置与语义**（§7） | 漏一处即产生越权参与 |
| 10 | **`EvidenceRef` 最小字段集、`source_field_path` 落点层级（`Fact` / `Extraction`）与角色语义**（§5），以及**「来源已归档」的派生口径**（§5.2 第 11 条 / §7.4） | ⑩ 追溯与 `N_引用` 的唯一来源；**v0.2.1 已按 canonical 对齐（`CCR-S03B-01` / `02`），Worker 不得再改** |
| 11 | **第 ⑩ 步与 `N_引用` 必须由同一集合派生** | 防止计数与清单不一致 |
| 12 | **`GATE` / `RUNTIME` / `ACCEPTANCE` 与 `EXIT-A/B/C` 的命名与编码**（§10.2） | 防止同名歧义 |
| 13 | **L4 四项字段集合**（§11.1） | `D-044` / `AC-77` |
| 14 | **技术层字段不得出界面 / 不得参与判定**的红线（§11.2） | `D-044` / `AC-78` |
| 15 | **检索触发条件与幂等语义**（§9.1） | `D-045` |
| 16 | **第 ④ 步候选原因可 0 条、可不逐条处理、未处理不得复用** | `D-048` / `AC-95` |
| 17 | **第 ⑨ 步出口路由与适用范围**（§9.2） | `AC-97` / `AC-98` |
| 18 | **本契约版本号与生效状态** | 只有 Integrator 可推进状态 |
| 19 | **`Hypothesis` 的编辑边界**（v0.2.2 / `D-049`；**v0.2.3 / `ADJ-01` 派生关闭补充第 ⑤ 项**）：**①②③④⑤ 只读**；**③ 引用关系由系统 / `EvidenceRef` 管理**；**第 ⑤ 项用户"保持条件" `Fact` 的唯一输入落点 = `Formal Attempt` 层，`Hypothesis` 只引用 / 展示该 `Fact`**（**不得在 `Hypothesis` 内创建 / 就地修改该 `Fact`、不得把 AI `Inference` 改成 `Fact`、不得合并为混合来源**）；**⑥⑦⑧ 由用户 `Fact` 条目与 AI `Inference` 条目分列承载**；**不建立回退状态机 / 版本历史 / 内容修改事件日志 / 新状态枚举** | `D-049` / **`D-027` + `D-049`（`ADJ-01 = CLOSED / DERIVED`）**；与第 3 项同源（裁决位模型不可被 Worker 扩展） |
| 20 | **⑧ / ⑨「显式重新生成」的产物语义与「生成批次」**（**v0.2.5 新增 / `D-051`**）：**最新一次显式生成 = 「当前生成结果」，此前各批 = 「较早生成结果」**；**旧 `Insight` / `Hypothesis` 一律保留、不删除、不覆盖、不因重新生成自动迁移状态**；**较早 `accepted Insight` 仍是 `accepted Insight`（继续遵循 `Experience Asset` = accepted Insight 视图）**；**旧 `Hypothesis` 的 `decision_state` 不变、新 `Hypothesis` 不继承旧 `decision_state`**；**较早 `Hypothesis` 不因存在而自动成为新一轮推理输入**；**重新检索 / `Insight` 重新生成 / `Hypothesis` 重新生成三层互不自动级联**（§9.5）；🔴 **不建立版本系统**（❌ 版本号 / 版本列表 / 版本比较 / 版本回滚 / 修改次数 / "第 N 版"）；**「当前 / 较早」只是展示与生成批次关系** | `D-051`；与第 2 项（`Insight` 状态迁移矩阵）、第 19 项（`Hypothesis` 编辑边界）同源 |

---

## §13 待裁决 / 待收敛项登记（本契约**只登记，不决定**）

> ⚠️ **本表不是 Gate A 的阻塞项清单。** Gate A 只审查 Bootstrap 文档与 Shared Contract 本体。

### 13.1 Gate B 关键人工决策候选（3 类共 **5 项**）

| 编号 | 待裁决项 | 归属 | 若不裁决的后果 |
|---|---|---|---|
| `TQ01` | 技术栈与运行形态（前端框架 / 是否含后端 / 语言） | **Gate B** | `S03-A` 无法定稿 |
| `TQ02` | 数据持久化与托管方案 | **Gate B** | `S03-B` 无法定稿；在线 Demo 前提未落实 |
| `TQ03` | LLM 接入路径与模型选型策略 | **Gate B** | `S03-A` / `S03-C` 无法定稿 |
| `TQ04` | 检索技术路线（字段结构化匹配 + LLM 判定 / embedding / 混合） | **Gate B** | `S03-D` 无法定稿；`SP-03` 无法定义 |
| `TQ05` | 部署与在线 Demo 运行环境 | **Gate B** | `S03-E` 无法定稿 |

> 🔴 **v0.2.6 就地补注（`D-053` / `D-054` 对齐；上行表格保留为 v0.2 起草期原文）** —— **五项均仍未 `CONFIRM`，但问题空间已重新基线**：
>
> | 编号 | v0.2.6 后的状态 |
> |---|---|
> | `TQ01` | 🟡 **重新基线** —— 原「Cloud Serverless Monolith vs Long-running Monolith」**不再是主要候选空间**；`D-053` 已确认 **Local-first Web App**；**新问题 = 前端主导 Local-first Web + 是否需要 Thin Server Layer + 具体 Web stack**；**框架 / state management / routing / local service abstraction 属实现参数**（🔴 **若会改变产品行为 / 安全边界 / 数据位置 / LLM Key 边界，才升级用户 Decision**） |
> | `TQ02` | 🟡 **重新基线** —— `D-053` 已确认 **Primary Persistence = Local Workspace Files**；**原 Managed PostgreSQL 作为 V1 Primary = `SUPERSEDED BY D-053`**（🔴 **正确表述：「原方案在 Cloud-centric 架构中合理，但已因人工架构转向不再作为 V1 Primary」**；🔴 **不得说 PostgreSQL 技术错误、不得删除历史分析**）；**仍需技术落地 = Markdown only / Markdown + JSON metadata / 其它本地文件组织 ⇒ Integrator 收敛即可** |
> | `TQ03` | 🔴 **仍属 Gate B，未裁决** —— `D-053` 已确认 **Configurable LLM + Provider Abstraction**；🔴 **未确认 = `Browser Direct` vs `Vercel Thin Proxy` vs `Provider-dependent Hybrid`，以及 credential persistence** ⇒ **输出 `DECISION REQUIRED`（见 §13.7）** |
> | `TQ04` | 🔴 **仍属 Gate B，未裁决** —— `D-054` 已确认**产品架构采用 Structured Experience RAG**，🔴 **但不等于确认 `R-A` / `R-B` / `R-C`**；**必须显式引用 `D-050` / `SP-03` / `SP-03R` / Local-first 约束重新比较**；🔴 **`PROPOSED` 推荐仍为 `R-A`**（不得写 `CONFIRMED`；🔴 **不得因为产品叫 RAG 就认为 `R-B` 必须胜出**） |
> | `TQ05` | 🟡 **重新基线** —— `D-053` 已确认 **Review / Demo Web 优先部署到 Vercel**，🔴 **但 Vercel 只是评委 Web 入口**（🔴 **不得写 `Production SaaS Platform`**）；**仍要验证 = HTTPS / File System API / Serverless proxy / CORS / quota / Demo availability （⇒ `SP-06`）**；🔴 **不得继续把腾讯云 SCF / CloudBase / TencentDB 设为 V1 必须依赖** |


> 🔴 **v0.3 就地补注（GATE B LANDING；上行表格与 v0.2.6 补注均保留为历史原文）** —— **`TQ01`–`TQ05` 五项已全部由项目负责人人工最终裁决并落盘**（🔴 **本节不再存在"未裁决"项**）：
>
> | 编号 | **Gate B 最终裁决（`CONFIRMED`）** | 落盘 Decision | 状态 |
> |---|---|---|---|
> | `TQ01` | **Browser-heavy Local-first Web App + Optional Thin Server Layer**（`TypeScript end-to-end` = `TECHNICAL DEFAULT`，非人工 Decision） | **`D-058`** | ✅ `CONFIRMED` |
> | `TQ02` | **Local Workspace Files + No required cloud database**（`Markdown + JSON / sidecar metadata` = `TECHNICAL DEFAULT`，非人工 Decision；物理 schema 由 Integrator 收敛） | **`D-059`** | ✅ `CONFIRMED` |
> | `TQ03` | **Configurable LLM + Provider Abstraction + Provider-dependent Hybrid + Session-only Credential + Registered-provider Thin Proxy only** | **`D-060`** | ✅ `CONFIRMED` |
> | `TQ04` | **`R-A`**（Structured Field Rules + 必要时 LLM 维度级三态判定；🔴 无 embedding / Vector DB 作 V1 主检索） | **`D-061`** | ✅ `CONFIRMED` |
> | `TQ05` | **Local Development + Vercel Demo / Review Deployment Target + Local Workspace + Optional Thin Provider Proxy**（🔴 **附 `DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION`**） | **`D-062`** | ✅ `CONFIRMED` |
>
> 🔴 **Source 全部 = `Gate B Final Human Confirmation`**（2026-09-24：「A｜确认以上全部 Gate B 决策」）；**五项独立追踪、不得合并**。
> 🔴 **`TQ05` 的 `CONFIRMED` 只代表 Deployment Architecture / Target 冻结**；🔴 **不得据此写「Vercel 已验证 / 已部署 / Production Ready」**。
> 🔴 **本补注不改写 `TQ01`–`TQ05` 的任何历史候选空间**（原 v0.2 / v0.2.6 表述保留）；**当前有效基线见 §0.4 E 节**。

### 13.2 Integrator 收敛（不升级人工决策）

| 编号 | 项 | 归属 |
|---|---|---|
| `TQ06` | 个人工作空间的最小落地方式 | Integrator |
| `TQ07` | 共享数据契约的物理建模粒度 | Integrator |
| `TQ08` | 「未知 / 未提供」的**物理表示** | Integrator |
| `TQ09` | AI 判定的可复现性与技术层记录范围 | Integrator |
| `TQ10` | Demo 数据隔离与重置 + 现场输入方案（**预演输入脚本属 Demo 操作方案**） | Integrator |
| `TQ11` | 「重新检索」重跑语义 —— **默认方向已定**：只维护"当前有效比较结果"，重新检索后**替换**；**不建立用户可见版本列表 / 历史比较版本体系** | Integrator |
| `TQ12` | 双人并行协作与 Integrator 门禁的落地形式 | Integrator |
| `TQ15`–`TQ28` | 命名 / 枚举序列化 / 映射表 / 派生口径 / 编码等 14 项 | Integrator |
| `TQ29`–`TQ40` | Worker 实现参数 12 项 | 对应 Worker |

> 🔴 **v0.2.1 补充（只登记，不决定）**：`TQ17` 的范围明确包含 ——
> ① **`EvidenceRef` 派生逻辑字段的序列化名称**（语义为 `source_archive_state` / `current_archive_state`，即**被引用记录的当前归档状态**）；
> ② **`source_field_path` 落点（`Fact` / `Extraction` 内容条目）的序列化形式**。
> **语义已由 v0.2.1 锁定（§5.2 第 8–12 条），命名与序列化仍由 Integrator 收敛。**

> 🟢 **v0.3 补充（2026-09-24，Gate C `CONTRACT CLARIFICATION`；🔴 不是 CCR、不是新 `Decision`、不新增 `AC`）**：
> - **`TQ19`（Level A 四维度 → 主字段路径映射）** —— ✅ **已由 Integrator 冻结并成表**，落点 = **§9.4.1**；🔴 **只落实"每个维度恰 1 个主字段路径"这一既有约定**，**不改变** `D-019` / `D-050` / `D-052` / `D-061` 语义；
> - **`CC-02`（`TQ02` 物理 schema）** —— 🔴 **不升级为 Contract Decision**；其落点 = **实现层 `IMPLEMENTATION SCHEMA PLAN`**（`20_INTEGRATION/S00-03_GATE_C_READINESS_AND_IMPLEMENTATION_PLAN.md` §J），**仍属实现参数**；
> - 🔴 **本节其余项（`TQ06`–`TQ12` / `TQ15`–`TQ40`）归属不变**。

### 13.3 条件升级项（默认不引入）

| 编号 | 项 | 默认 | 升级条件 |
|---|---|---|---|
| `TQ13` | `created_at` 是否允许作纯展示层 fallback | **不引入** | 仅当 **`S03-D` 证明"必须引入"且会产生用户可感知行为**时，升级至 **Gate B**；升级前须先建立独立 `Decision ID` |
| `TQ14` | 是否引入「并列判定」技术判据 | **不引入** | 同上 |

> **完整清单（`TQ01`–`TQ40`）见** `docs/analysis/S00-03_技术架构阶段启动.md` **§5**。

### 13.4 已关闭（Gate A 定向修正）

| 原编号 | 原问题 | 关闭方式 |
|---|---|---|
| `BLK-01` | Cloud Worker 口径 | ✅ **Cloud Worker = 开发期 LearnBuddy 并行任务，不是运行时后台 Worker** |
| `BLK-02` | Assets 口径 | ✅ **Assets = 开发期共享资产总线；observability 数据与产品层隔离** |
| `BLK-04` | `TQ11` 重跑语义 | ✅ 默认方向见 §13.2 |
| `BLK-05` | `TQ10` 现场输入可控性 | ✅ 预演输入脚本属 Demo 操作方案；现场确实重新输入并生成新 `Attempt` 即可 |
| `BLK-06` | `TQ13` / `TQ14` | ✅ 默认不引入，条件升级（见 §13.3） |

**剩余 BLOCKER = 0。**

### 13.5 S00-03 阶段内已由人工裁决关闭项（🔴 **v0.2.2 新增**）

| 原报告 | 原问题 | 关闭方式 |
|---|---|---|
| `docs/architecture/03_AI_PIPELINE.md` **§K** `DECISION REQUIRED` | `Hypothesis` 内容在 V1 中是否可被用户直接编辑；若可编辑，内容被修改后 `decision_state` 是否回退 | ✅ **`D-049`（人工 `CONFIRMED`）**：**核心内容 ①②③④⑤ 只读；③ 引用关系由系统管理；⑥⑦⑧ 允许用户提供（`Fact` 与 `Inference` 分列）；不建立回退状态机 / 版本历史 / 内容修改事件日志 / 新状态枚举** |
| `30_SPIKES/retrieval/` **`SP-03`** `DECISION REQUIRED`（🔴 **v0.2.4 新增**） | Level A 维度「**构成可比对重叠**」的判据应采用**读法 α（同一件事，严格）** 还是 **读法 β（同一类事，宽松）** —— 两种读法会产生**不同的 ⑦「相似点」内容**，**属用户可感知行为**，且 canonical 无法唯一推出 | ✅ **`D-050`（人工 `CONFIRMED`）**：**采用方案 A｜严格语义重叠**（即**读法 α**）；**宽松类别重叠（读法 β）被放弃**；**维度级判据落点 = §9.4**；**`TQ04` 仍未裁决（仍属 `Gate B`）**、**`R-A` 仍只是 `PROPOSED`** |
| `20_INTEGRATION/S00-03_技术决策包.md` **§R `DR-01`**（🔴 **v0.2.5 新增**） | 显式「重新检索 / 重新生成」后，**旧 `Insight`（`candidate` / `accepted`）与旧 `Hypothesis` 如何处理** —— A 替换 / B 不加收窄的并存 / C 并存但分层；**三者在 ⑦⑧⑨ 的呈现与"旧经验是否还在"上产生用户可感知差异** | ✅ **`D-051`（人工 `CONFIRMED`）**：**人工选择「方案 C 收窄版」** —— **保留旧产物 + 按生成批次区分「当前生成结果」/「较早生成结果」**；旧状态一律保持；**不建立版本系统**；**重新检索 / 两级重新生成互不自动级联**；**落点 = §2.4 / §8.6 第 9 条 / §9.5** |
| `20_INTEGRATION/S00-03_技术决策包.md` **§R `DR-02`**（🔴 **v0.2.5 新增**） | `CASE-05.actual_attempt` 的一对取值「**调整热风参数**」vs「**调整送风参数**」在 `D-050` 下判 `matched` 还是 `compared_not_matched` —— **决定 ⑦「相似点」是否出现该条**（用户可感知），并决定 `TE-130` 的期望值 | ✅ **`D-052`（人工 `CONFIRMED`）**：**人工选择「方案 B」** —— **`compared_not_matched`**（**同一参数族 / 技术类别 ≠ 语义等价**）；**`CASE-05` 的 `related = true` 不变**（`actual_result` 独立 `matched`）；**落点 = §9.4 的 `actual_attempt` 行**；**`TE-130` 的历史 Worker 文本不修改，新的 canonical 验收由 `AC-124`–`AC-126` 覆盖** |

> 🔴 **`03_AI_PIPELINE.md` 是 `S03-C` Worker 产出（`PROPOSED`，非 canonical），本契约不修改该文件**；其 §K 保留为**历史报告**，其文件头「依据来源 = `v0.2.1`」是**该文件起草时所依据的契约版本**（**属历史引用，不代表当前版本**）—— **当前有效版本恒以本契约文件头与 §14 第 4 条 / §15 为准**；**当前有效口径以 `D-049` 与本契约 §2.3 / §8.6 为准**。
> **`D-049` 属人工产品决策落盘，不是 CCR**（§14.1）。
> 🔴 **v0.2.5 补充**：**`20_INTEGRATION/S00-03_技术决策包.md` 是过程分析 / 决策准备文档（`20_INTEGRATION/`，非 canonical、非契约、非实现依据）** —— 其 §R 的 `DR-01` / `DR-02` **保留为历史报告**（**其"Integrator RESULT = NEEDS DECISION"是生成当时的历史状态，不得伪装为当时即 `PASS`**）；**当前有效口径 = `D-051` / `D-052` 与本契约 §2.4 / §8.6 第 9 条 / §9.4 / §9.5**。**`D-051` / `D-052` 属 POST-INTEGRATOR 人工产品决策落盘，不是 CCR**（§14.1）。

### 13.6 邻接项派生关闭（🔴 **v0.2.3 改写；原 v0.2.2《邻接待确认项》状态已更新**）

| 编号 | 项 | 现状 | 归属 |
|---|---|---|---|
| `ADJ-01` | **`D-027` 第 ⑤ 项「用户本人明确指定"保持某条件" = 用户 `Fact`」在 V1 的落点** —— ① 该通道随 ⑤ 只读而**在 V1 不发生**；② 通过 ⑤ 的**并列用户条目**（与 ⑥⑦⑧ 同构）实现；③ **仅**在 `Formal Attempt` 层表达并由 ⑤ 作为 `Fact` **引用** | ✅ **`CLOSED / DERIVED`（2026-09-19 人工裁决，选择读法 ③）** —— **关闭依据 = `D-027` + `D-049`**；**关闭结论：用户本人指定的第 ⑤ 项"保持条件"只从 `Formal Attempt` 中已有的用户 `Fact` 获得；`Hypothesis` 第 ⑤ 项本身保持只读并引用该 `Fact`**（详见 §2.3 / §8.6 第 7 条 / §9.3） | **已关闭（人工 `CONFIRMED`）**；**不创建 `D-050`**、**不改 `D-027`**、**不改变 `D-049`**、**不新增产品机制** —— 属**已有 `CONFIRMED` Decision 的组合解释闭合** |

> **关闭依据说明**：`D-027` 要求第 ⑤ 项**保留三类来源语义**（故 `Fact` 通道**必须存在** → **读法 ① 被排除**）；`D-049` 要求 **⑤ 本身只读、不得提供 ⑤ 的编辑入口 / 用户输入框 / 并列用户条目**（→ **读法 ② 被排除**）；**唯一自洽读法 = 读法 ③**。
> ✅ **`ADJ-01` 不是、也不再是 `S00-03` 关闭阻塞项**；它**不改变 `D-027` 一字**，也**不影响 `D-049` 的 `CONFIRMED` 状态**。
> 🔴 **不新增**：`Decision ID` / `D-050` / `Hypothesis` 新状态 / 第 ⑤ 项编辑通道 / 新引用体系 / 新来源类型 / 新状态回退机制 / 新版本历史。

> 🟢 **就地补注（v0.2.4，按「不改写历史」保留上行原文）**：上行「**不创建 `D-050`**」是 **`ADJ-01` 关闭当时的历史表述，且继续有效**（**`ADJ-01` 本身未创建任何 `Decision`**）。**`D-050` 这一编号其后已由 `D-050`｜Level A 维度 `matched` 的严格语义重叠判据占用**（见 **§13.5 / §9.4**）—— **与 `ADJ-01` 无关**；**`ADJ-01 = CLOSED / DERIVED` 的状态不变**、**关闭依据仍为 `D-027` + `D-049`**。

### 13.7 `D-053` / `D-054` 后新增的未裁决项（🔴 **v0.2.6 新增 —— 本契约只登记，不决定**）

> **性质**：`D-053` / `D-054` 已人工 `CONFIRMED`，**不得再次询问**；下表只登记**由该两项决策暴露出来、且不能由既有约束唯一推出**的**新问题**。
> 详细比较与 `PROPOSED` 推荐见 `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md` **§U**。

| 编号 | 待裁决项 | 候选 | 归属 | 若不裁决的后果 |
|---|---|---|---|---|
| **`DR-03`** | **LLM Request Path** | **A** `Browser Direct` / **B** `Vercel Thin Proxy` / **C** `Provider-dependent Hybrid` | **`DECISION REQUIRED`（Gate B 级）** | `TQ03` 无法定稿；**API Key 暴露面 / CORS / privacy / Demo 可靠性 / 是否需要 Thin Server Layer 均无法确定** |
| **`DR-04`** | **Credential Persistence** | **`K-A`** memory / session only ｜ **`K-B`** browser-local persistence ｜ **`K-C`** 其它 Web 可行安全方案 | **`DECISION REQUIRED`（Gate B 级）** | 安全 / 隐私 / 评委体验三者取舍未定 ⇒ 无法设计 `Model Settings` 入口与凭据处理逻辑 |

**🔴 附加硬约束（若未来选择 `B` `Vercel Thin Proxy`）**：**必须分析并防护** SSRF / Open Proxy / 内网地址访问 / metadata endpoint / 协议限制（仅 `https`）/ **host allowlist** / URL validation —— 🔴 **不得设计成"用户输入任意 URL，Vercel 无条件代请求"**。

**🔴 明确不升级为 `DECISION REQUIRED` 的事项（属实现参数）**：

框架 / 文件名 / 目录名 / helper / parser library / state library / routing / 本地文件 schema 细节 / 组件拆分。
🔴 **File System fallback**（Folder Import / ZIP Import·Export / File Upload / Local Companion Runtime）**暂不自动决定** —— **只有 `SP-06` 证明主路径存在影响比赛演示的兼容性问题，才升级 `DECISION REQUIRED`**。

**🔴 本轮 `DECISION REQUIRED` 计数 = 2**（`DR-03` / `DR-04`）。

> 🟢 **就地补注（v0.2.7，2026-09-24，按「不改写历史」保留上表与上句原文）**：上表两行与"计数 = 2"均为 **v0.2.6 时点状态**。**该两项已由项目负责人本轮人工裁决关闭**：
>
> | 原 `DECISION REQUIRED` | 人工裁决 | 落盘 Decision | 状态 | 契约落点 |
> |---|---|---|---|---|
> | **`DR-03`**｜LLM Request Path | **C｜`Provider-dependent Hybrid`**（路径由 `Provider Adapter Capability` 决定） | **`D-055`** | ✅ **`CONFIRMED`** | **§0.4 D 节**（网络路径部分）；`docs/09_TEST_PLAN.md` **`AC-144`–`AC-152`** |
> | **`DR-04`**｜Credential Persistence | **A｜`Session-only Credential`** | **`D-056`** | ✅ **`CONFIRMED`** | **§0.4 D 节**（凭据部分）；`docs/09_TEST_PLAN.md` **`AC-153`–`AC-162`** |
>
> **当前 `DECISION REQUIRED` 计数 = 0**（本节的 2 项均已关闭）。
> 🔴 **但 `TQ03` 整体仍未 `CONFIRM`** —— **两个子项已裁决 ≠ `TQ03` 已裁决**；`TQ03` 仍须 **`SP-06` 实测证据 + Gate B 人工裁决**。
> 🔴 **本节不引用 `SP-06` 的任何结论**；`SP-06` 的执行结果见 `30_SPIKES/local_first/SP-06_EXECUTION_REPORT.md`（`DISPOSABLE / NON-PRODUCTION`），**本契约不据其 `CONFIRM` 任何 `TQ`**。

---

## §14 Contract Change Request（CCR）流程

> 📌 **CCR 的适用范围**：CCR **只用于 Gate A 之后，Worker 对既有契约提出修改**。
> **首次起草期的命名 / 一致性修正不属于 CCR** —— 它们已直接并入契约本体（见 §10.2 与 §15）。

1. Worker 发现需要变更本契约（含任何 §12 禁止项）→ **不得直接改**，向 Integrator 提交 CCR：
   `CCR-<序号> | 提出方 | 涉及契约条目 | 触发依据（Decision ID / AC 编号 / 事实）| 若不变的阻塞 | 建议变更 | 影响面`
2. Integrator 判定归属：① 属实现参数 → 归 **C/D 类**，Integrator 或 Worker 自行收敛；② 属 Integrator 收敛项 → Integrator 在契约内收敛并冻结；③ **影响关键技术选择或产生用户可感知行为** → **升级至 Gate B**；④ 与 canonical 冲突 → **以 canonical 为准**，作废本契约条目。
3. **CCR 经 Integrator 判定（或 Gate B 裁决）前，Worker 按现契约版本继续工作**，不得先行实现新语义。
4. 契约版本推进：`v0.1 DRAFT` → `v0.2 DRAFT / Gate A 修订版` → `v0.2.1 DRAFT / Worker CCR 对齐版` → `v0.2.2 DRAFT / D-049 对齐版` → `v0.2.3 DRAFT / ADJ-01 派生关闭版` → `v0.2.4 DRAFT / D-050 对齐版` → `v0.2.5 DRAFT / D-051+D-052 对齐版` → `v0.2.6 DRAFT / D-053 Local-first + D-054 Structured Experience RAG 对齐版` → **`v0.2.7 DRAFT / D-055 Hybrid LLM Path + D-056 Session-only Credential 对齐版`（当前）** → `v0.3 DRAFT`（Gate B 关键技术决策并入）→ **冻结态**（Gate C 最终关闭审查通过）。
   **当前为 `v0.2.7 DRAFT`，不得写 `FROZEN` / `CONFIRMED`，不可作为实现依据。**
> 🔴 **v0.3 就地补注（2026-09-24，GATE B LANDING；按「不改写历史」保留上行原文）**：版本链已推进 —— `v0.2.7 DRAFT` → **`v0.3 DRAFT / GATE B FINAL TECHNICAL DECISIONS INTEGRATED（`D-057` + `D-058`–`D-062`）（当前）** ⇒ 上行「（当前）」标记与下行"当前为 `v0.2.7`"均按此更新理解。
   **当前为 `v0.3 DRAFT`**（🔴 **仍为 DRAFT：不得写 `FROZEN` / `CONFIRMED`**；🔴 **Gate C 前 NOT IMPLEMENTATION BASIS**；**冻结态仍保留给"Gate C 最终关闭审查通过"**）。
   🔴 **`v0.2.7` 不得直接跳到 `v0.3`** —— 因 `TQ04` 及若干 Gate B 技术项**仍未最终裁决**（见 §13.1 / §13.7），**`v0.3 DRAFT` 仍保留给"Gate B 关键技术决策并入"**。
   🟢 **补充（2026-09-24，GATE B LANDING）**：上句的**前置条件已满足** —— `TQ01`–`TQ05` 已由 **`D-058`–`D-062`** 全部最终裁决（见 §13.1 v0.3 就地补注）⇒ **`v0.3 DRAFT` 已正式解锁并完成推进**；🔴 **但 `v0.3 DRAFT` 仍不是冻结态**（不 `FROZEN` / 不 `CONFIRMED` / Gate C 前不可作实现依据）。
   🔴 **`D-049` / `D-050` / `D-051` / `D-052` 是人工 `CONFIRMED` 的产品 Decision；`D-053` / `D-054` / `D-055` / `D-056` 是人工 `CONFIRMED` 的架构级 Decision；`ADJ-01` 已 `CLOSED / DERIVED`，而本契约整体仍是 DRAFT** —— **各状态不得混同**。
   🟢 **追加（2026-09-24）**：**`D-057` = 人工 `CONFIRMED` 流程决策**；**`D-058`–`D-062` = 人工 `CONFIRMED` 的 Gate B 最终技术决策**（`Source = Gate B Final Human Confirmation`）。🔴 **它们本身 `CONFIRMED` ≠ 本契约 `CONFIRMED`** —— **本契约整体仍为 `v0.3 DRAFT`**。
>
> 🟢 **v0.3 FROZEN 就地补注（2026-09-24，`GATE C FINAL FREEZE`；按「不改写历史」保留上行原文）**：版本链**已走完全程** —— `v0.3 DRAFT` → **冻结态 = `v0.3 FROZEN / IMPLEMENTATION BASIS`（当前）**。
> - 🔴 **不发明新版本号**：**`版本 = v0.3`** 不变（上行版本链的终端状态即"**冻结态**"，**不是 `v0.4` / `v1.0`**）；
> - 🔴 **上行的「（当前）」「当前为 `v0.2.7` / `v0.3 DRAFT`」「不得写 `FROZEN`」等句 = 其撰写时点状态**，**按本条更新理解**；
> - ✅ **`IMPLEMENTATION BASIS = YES`**（触发 = 项目负责人 2026-09-24「A｜确认 Gate C，冻结当前实现基线并允许正式开发」）；
> - 🔴 **冻结不改变任何产品语义 / 技术架构语义**（`D-049`–`D-062` 一字未改、`AC` 新增 = 0）；🔴 **冻结后修改本契约仍须走 §14 CCR**；🔴 **§12 Worker 禁改清单继续有效**。

### 14.1 CCR 处理留痕（Integrator 判定）

| CCR | 提出方 | 涉及契约条目 | 判定归属 | 状态 |
|---|---|---|---|---|
| `CCR-S03B-01` | `S03-B` | §5.1 `source_field_path` 落点；关联 §12 第 10 项 | **属 canonical 对齐**（`D-027` ⑤ / `D-024` / `AC-32`）→ 按 §14 第 2 条 ④「以 canonical 为准」，由 Integrator 修订本契约条目 | ✅ **ACCEPTED / 已并入 v0.2.1** |
| `CCR-S03B-02` | `S03-B` | §5.1 `archived_at_ref` 语义；关联 §7 | **属 canonical 对齐**（`D-043` `F-2` / `AC-100` / `AC-74`）→ 处置同上 | ✅ **ACCEPTED / 已并入 v0.2.1** |

> 🔴 **两项均为 canonical 对齐**：**不进入 Gate B**、**不产生新的人工决策**、**未新增 / 未放宽 / 未收紧任何产品机制**。
> **未处理 CCR = 0。** 本契约当前**无待判定 CCR**；`S03-B` 登记的邻接项（`reasoning_input_refs` 物理表达、`trigger_kind` 扩展、`archived_at` 不引入等）**已按 §13.2 归 Integrator 收敛 / `TQ07` / `TQ17`**，**不是 CCR**。

> 🔴 **v0.2.2 无新增 CCR**：**`D-049` 属人工产品决策落盘（`S00-03` / `S03-C` §K `DECISION REQUIRED` 的裁决结果），不是 Worker 提出的 Contract Change Request** —— **不进入 §14.1 的 CCR 记账**。**未处理 CCR 仍 = 0**。

> 🔴 **v0.2.3 无新增 CCR**：**`ADJ-01` 的关闭属人工裁决（读法 ③）与 `D-027` + `D-049` 的组合解释闭合，不是 Worker 提出的 Contract Change Request** —— **不进入 §14.1 的 CCR 记账**。**未处理 CCR 仍 = 0。**

> 🔴 **v0.2.4 无新增 CCR**：**`D-050` 属人工产品决策落盘（`SP-03` `DECISION REQUIRED` 的裁决结果），不是 Worker 提出的 Contract Change Request** —— **不进入 §14.1 的 CCR 记账**。**未处理 CCR 仍 = 0。**

> 🔴 **v0.2.5 无新增 CCR**：**`D-051` / `D-052` 属 POST-INTEGRATOR 人工产品决策落盘（`20_INTEGRATION/S00-03_技术决策包.md` §R 的 `DR-01` / `DR-02` 的裁决结果），不是 Worker 提出的 Contract Change Request** —— **不进入 §14.1 的 CCR 记账**。**未处理 CCR 仍 = 0。**

> 🔴 **v0.2.6 无新增 CCR**：**`D-053` / `D-054` 属人工架构决策落盘（项目负责人本轮直接决策，非 Worker 提出的 Contract Change Request）** —— **不进入 §14.1 的 CCR 记账**。**未处理 CCR 仍 = 0。**

> 🔴 **v0.2.7 无新增 CCR**：**`D-055` / `D-056` 属人工架构决策落盘（项目负责人本轮直接裁决，关闭 `DR-03` / `DR-04`，非 Worker 提出的 Contract Change Request）** —— **不进入 §14.1 的 CCR 记账**。**未处理 CCR 仍 = 0。**

> 🔴 **v0.3（GATE B LANDING）无新增 CCR**：**`D-057`（流程决策）与 `D-058`–`D-062`（Gate B 最终技术决策）属人工决策落盘**（`Source = Gate B Final Human Confirmation`，非 Worker 提出的 Contract Change Request）—— **不进入 §14.1 的 CCR 记账**。**未处理 CCR 仍 = 0。**

> 🔴 **v0.3 FROZEN（GATE C FINAL FREEZE）无新增 CCR**：本次冻结**只推进效力**（`DRAFT` → 冻结态 / `IMPLEMENTATION BASIS`），并新增 **1 项 `CONTRACT CLARIFICATION`（§9.4.1 Level A 四维度 → 主字段路径映射表）** —— 🔴 **`CONTRACT CLARIFICATION` 不是 CCR**（属已有 `CONFIRMED` Decision `D-019` / `D-050` 的技术展开与落点补齐）。**未处理 CCR 仍 = 0。**
> 🔴 **同时确认**：**`CC-02`（`TQ02` 物理 schema）不升级为 Contract Decision**（落点 = 实现层 `IMPLEMENTATION SCHEMA PLAN`）。

---

## §15 变更记录

| 版本 | 日期 | 状态 | 变更 |
|---|---|---|---|
| v0.1 | 2026-09-19 | DRAFT / 待 Gate A 审查 | 首次建立（S00-03-BOOTSTRAP）；仅定义共享语义，未做任何技术选型 |
| **v0.2** | 2026-09-19 | **DRAFT / Gate A 修订版** | **按 Gate A 审查完成 12 项定向修正**：① 阶段流程统一为 `Gate A → S03-A～E 并行分析 → Integrator → Gate B → Local Landing → Gate C`（**废止原 Gate A–E 五门制**；**Gate A 不要求先裁决技术栈**）；② §1.1 对象分层（产品核心事实 / 经验对象 = `Attempt` / `Insight`；第 ⑨ 步独立输出对象 = `Hypothesis`；`Experience Asset` 仍非独立对象）；③ §4.2 第 7 条 —— 「未知 / 未提供」只锁**显式表达 + 不得误判为相似**，**物理表示不再预锁**；④ §12 第 8 项同步软化；⑤ §13 重构为「待裁决 / 待收敛项登记」（Gate B 5 项 / Integrator 收敛 / 条件升级项 / 已关闭），**剩余 BLOCKER = 0**；⑥ §11.3 新增产品层行为留痕；⑦ §10.2 明确消歧命名属**起草期修正、不称 CCR**；⑧ §14 明确 **CCR 只用于 Gate A 之后**；⑨ 交叉引用修正（`TQ01`–`TQ40` 位于启动文档 **§5**）；⑩ 元信息状态推进为 `v0.2 DRAFT / Gate A 修订版` |
| **v0.2.1** | 2026-09-19 | **DRAFT / Worker CCR 对齐版** | **并入 `S03-B` 提出的 2 项 Worker CCR —— 仅 canonical 对齐，不新增产品机制**：<br>① **`CCR-S03B-01`**（§5.1 / §5.2 第 8–12 条 / §6.3 第 7–8 条）：`source_field_path` 合法落点由「仅 `Fact`」修正为「**`Fact` 或 `Extraction`** 内容条目」；**`role = grounding` 时落点必须为 `Fact`**，**`Extraction` 永不承担 grounding**；`Extraction` 引用可按既有语义承担 `support` / `contradict` / `context`，**是否计入 `N_引用` 仍完全由 `role` 决定**；**不建立第二套引用体系**，第 ⑩ 步追溯清单与 `N_引用` **仍只由 `EvidenceRef` 单一集合派生**。<br>② **`CCR-S03B-02`**（§5.1 / §5.2 第 11 条 / §7.4）：**`archived_at_ref` 移出 `EvidenceRef` 最小字段集**（原「建立时快照」语义不足以支撑 `D-043` `F-2`）；**「来源已归档」一律由 `target` 当前 `archive_state` 动态派生**；归档**不使既有引用失效 / 不减少既有 `N_引用` / 不撤销既有 `Insight`、`Hypothesis`**；派生逻辑字段序列化名留 `TQ17`。<br>③ **§12 第 10 项**同步扩展；**§13.2** 登记 `TQ17` 范围；**§14 新增 14.1 CCR 处理留痕表**（2 项 `ACCEPTED`，**未处理 CCR = 0**）；④ 元信息状态推进为 **`v0.2.1 DRAFT / Worker CCR 对齐版`**。<br>**仍为 DRAFT —— 未 `FROZEN`、未 `CONFIRMED`、不可作为实现依据。** |
| **v0.2.2** | 2026-09-19 | **DRAFT / `D-049` 对齐版** | **并入已由项目负责人人工 `CONFIRMED` 的产品 Decision `D-049`（`S00-03` / 触发 = `03_AI_PIPELINE.md` §K `DECISION REQUIRED`；采用 §K.3 `E` 的「方案 B 窄口径变体」）—— 只做 canonical 落盘，不新增 / 不放宽 / 不收紧任何产品机制**：<br>① **§2.3** 新增《`Hypothesis` 内容的编辑边界》表 + 硬约束（**①②③④⑤ 只读；③ 引用关系由系统 / `EvidenceRef` 管理；⑥⑦⑧ 允许用户提供，落为 `Fact` 条目并与 AI `Inference` 条目分列；不建立回退状态机 / 版本历史 / 内容修改事件日志 / 新状态枚举**）；<br>② **§8 新增 §8.6**`Hypothesis` 编辑边界（8 条，含"AI 不得自动改写用户 `Fact`"「⑥⑦⑧ 提交不改裁决位」「改变 ①②④⑤ 的唯一路径 = 改 `Formal Attempt` → 显式重新检索 / 重新生成」）；<br>③ **§9 第 ⑨ 步行**同步（输出 / 门槛 / 依据列）；<br>④ **§12 新增第 19 项**（`Hypothesis` 编辑边界为 Worker 禁改项）；<br>⑤ **§13 新增 §13.5**（`S00-03` 已关闭项：§K `DECISION REQUIRED` → `D-049`）**与 §13.6**（**邻接待确认项 `ADJ-01`**：`D-027` 第 ⑤ 项「用户本人明确指定"保持某条件" = 用户 `Fact`」的 V1 落点）；<br>⑥ **§14 第 4 条**（版本链推进）；**§14.1** 注明"本版无新增 CCR"；⑦ 元信息状态推进为 **`v0.2.2 DRAFT / D-049 对齐版`**。<br>**仍为 DRAFT —— 未 `FROZEN`、未 `CONFIRMED`、不可作为实现依据**（**`D-049` 本身已 `CONFIRMED`，契约整体状态不受影响**）。 |
| **v0.2.3** | 2026-09-19 | **DRAFT / `ADJ-01` 派生关闭版** | **接入 `v0.2.2` 登记的邻接项 `ADJ-01` 的人工裁决结果（人工裁定读法 ③；`ADJ-01 = CLOSED / DERIVED`；依据 = `D-027` + `D-049`）—— 只做派生解释闭合，不新增任何产品机制**：<br>① **§13.6** 由《邻接待确认项》改写为《邻接项派生关闭》：**`ADJ-01 = CLOSED / DERIVED`**，**关闭依据 = `D-027` + `D-049`**，**关闭结论 = 用户本人指定的第 ⑤ 项"保持条件"只从 `Formal Attempt` 中已有的用户 `Fact` 获得；`Hypothesis` 第 ⑤ 项本身保持只读并引用该 `Fact`**（并记录读法推导：读法 ① 因 `D-027` 要求保留三类来源而排除；读法 ② 因 `D-049` 的"⑤ 只读"而排除）；<br>② **§2.3** 第 ⑤ 项仍标 **只读**，表格内"⚠️ 邻接项待确认"标注**删除**，改为"**用户本人指定'保持条件'的唯一输入落点 = `Formal Attempt` 层用户 `Fact`**"；§2.3 **新增一条硬约束**（唯一入口 / `Hypothesis` 只引用 / 不得创建或就地修改 / 不得把 `Inference` 改成 `Fact` / 不得混合来源 / 看到 `Hypothesis` 后追加的合法重跑流程 / 不新增清单）；<br>③ **§8.6 第 7 条**由"邻接待确认"**改写**为已关闭的派生规则；**§8.6 标题**同步为「v0.2.2 新增 / v0.2.3 补第 7 条」；<br>④ **§9 新增 §9.3**《第 ⑤ 项"保持条件"用户 `Fact` 的进入点与重跑路径》（**跨步补充说明，不是 `D9` 新增步骤**）；**§9 第 ⑨ 步行**同步；<br>⑤ **§12 第 19 项**同步（第 ⑤ 项口径为 Worker 禁改项）；<br>⑥ **§14 第 4 条**（版本链推进）；**§14.1** 注明"本版无新增 CCR"；⑦ 元信息状态推进为 **`v0.2.3 DRAFT / ADJ-01 派生关闭版`**。<br>🔴 **本版不创建 `D-050`**、**不改变 `D-027`**、**不改变 `D-049`**、**不新增产品机制** —— **属已有 `CONFIRMED` Decision 的组合解释闭合**。<br>**仍为 DRAFT —— 未 `FROZEN`、未 `CONFIRMED`、不可作为实现依据。** |
| **v0.2.4** | 2026-09-19 | **DRAFT / `D-050` 对齐版** | **接入已由项目负责人人工 `CONFIRMED` 的产品 Decision `D-050`（来源 = `S00-03` / **`SP-03`**；触发 = **`SP-03 RESULT = INCONCLUSIVE`** 与 **`matched_level_a_dimensions` 判定漂移**）—— 只做 canonical 落盘，不新增 / 不放宽 / 不收紧任何其它产品机制**：<br>① **§9 新增 §9.4**《第 ⑥ 步 Level A 维度 `matched` 的严格语义重叠判据》—— **补上 canonical 此前未定义的「构成可比对重叠」判据**：**两侧表达「相同的实质内容」或「语义等价的改写」时才允许 `matched`**；**允许的等价形式 = 同义改写 / 表述顺序不同但实质相同 / 单位等价表达 / 不改变实质含义的语言改写**；**"属于同一类别 / 同一主题 / 同一参数类型 / 同一指标名称 / 同一种现象 / 同一种技术大类"本身不充分**；**逐维度给判据与反例**（`50°C` vs `50 摄氏度` = `matched`；`50°C` vs `70°C` = `compared_not_matched`；「出现明显开裂」vs「无明显开裂」= `compared_not_matched`；「降低颜色变化」vs「缩短干燥时间」= `compared_not_matched`）；**`unknown` 拦截规则不变**（任一侧 `unknown` ⇒ `uncompared`；双方都 `unknown` 仍不能 `matched`）；<br>② **§9 第 ⑥ 步行**同步（系统行为补"逐候选 × 逐维度三态判定，判据见 §9.4"；依据补 **`D-050`**）；**§9.3 补就地补注**（其"不创建 `D-050`"属 `ADJ-01` 关闭当时的历史表述）；<br>③ **§6.1** 补一条指针（`N_检索` 依赖 "Level A 命中" ⇒ 维度级判据见 §9.4）；**§12 第 6 项**同步（由"四维度集合 + 字段路径映射"扩展为**同时锁定维度级三态判据**）；<br>④ **§13.5 新增一行**（`SP-03` `DECISION REQUIRED` → **`D-050`**）；**§13.6 补就地补注**（其"不创建 `D-050`"属历史表述；`ADJ-01 = CLOSED / DERIVED` 状态不变）；<br>⑤ **§14 第 4 条**（版本链推进）；**§14.1** 注明"本版无新增 CCR"；⑥ 元信息状态推进为 **`v0.2.4 DRAFT / D-050 对齐版`**。<br>🔴 **本版不 `CONFIRM` `TQ04`**、**不 `CONFIRM` `R-A`**、**不做技术选型**、**不改 `D-027` / `D-049`**、**不改 `ADJ-01` 状态**、**不修改 `04_RETRIEVAL_AND_COMPARISON.md`**（`S03-D` Worker 产出，仍为 `PROPOSED`）、**不新增** ≥2 维度门槛 / 权重 / `similarity score` / `confidence` / `rank score` / 百分比 / 等级。<br>**仍为 DRAFT —— 未 `FROZEN`、未 `CONFIRMED`、不可作为实现依据**（**`D-050` 本身已 `CONFIRMED`，契约整体状态不受影响**）。 |
| **v0.2.5** | 2026-09-20 | **DRAFT / `D-051`+`D-052` 对齐版** | **接入已由项目负责人人工 `CONFIRMED` 的两项 POST-INTEGRATOR 产品 Decision（来源 = `S00-03` / `20_INTEGRATION/S00-03_技术决策包.md` §R；`DR-01` 人工选择「方案 C 收窄版」、`DR-02` 人工选择「方案 B」）—— 只做 canonical 落盘，不新增 / 不放宽 / 不收紧任何其它产品机制**：<br>① **§9 新增 §9.5**《重新检索 / `Insight` 重新生成 / `Hypothesis` 重新生成 的三层区分与不级联》—— **重新检索 ≠ 自动重新生成 `Insight` ≠ 自动重新生成 `Hypothesis`**；**不得建立"重新检索后自动级联重建 ⑧ / ⑨"**；三层动作**均须用户显式发起**；**不建立版本系统**；<br>② **§2 新增 §2.4**《显式重新生成后的产物语义与「生成批次」》—— 最新一次显式生成 = **「当前生成结果」**、此前各批 = **「较早生成结果」**；**旧 `Insight` / `Hypothesis` 一律保留、不删除、不覆盖、不自动迁移状态**；**较早 `accepted Insight` 仍是 `accepted Insight`（继续遵循 `Experience Asset` = accepted Insight 视图）**；**旧 `Hypothesis` 的 `decision_state` 不变、新 `Hypothesis` 不继承旧 `decision_state`**；**较早 `Hypothesis` 不因存在而自动成为新一轮推理输入**；**较早批次默认折叠且可展开**；🔴 **禁止称谓「旧版本 / 历史版本 / 第 N 版 / 更早的候选经验」**；🔴 **明确禁止版本号 / `generation version number` / 版本列表 / 版本比较 / 版本回滚 / "第 N 次生成"计数 / 修改次数 / `diff` / `restore old version`**；明确与 `D-040`（semantic edit ≠ 重新生成）、`D-045`、`D-049` 的边界；<br>③ **§8.6 新增第 9 条**（显式重新生成不改变旧 `Hypothesis` 的 `decision_state`；新 `Hypothesis` 不继承旧 `decision_state`；较早 `Hypothesis` 不自动成为新一轮推理输入；旧 `Hypothesis` 不删除 / 不覆盖、较早批次默认折叠）；<br>④ **§9.4 追加 `D-052` 负例** —— `actual_attempt` 维度「**调整热风参数**」vs「**调整送风参数**」= **`compared_not_matched`**（**同一参数族 / 技术类别 ≠ 语义等价**）；**"明确不充分"清单同步追加**"同一参数族 / 技术类别下的不同具体技术对象或参数对象"；**并注明用户可感知影响 = ⑦ 中不显示该 `actual_attempt` 相似点**；<br>⑤ **§9 第 ⑧ / ⑨ 步行**同步（第 ⑧ 步行系统行为补"用户显式重新生成 = 新生成一个生成批次"；第 ⑨ 步行同；二者依据补 **`D-051`**，第 ⑨ 步依据补 **`AC-116`–`AC-123`**）；**§12 第 6 项**依据补 **`D-052`**；<br>⑥ **§12 新增第 20 项**（⑧ / ⑨ 显式重新生成的产物语义与生成批次为 Worker 禁改项）；<br>⑦ **§13.5 新增两行**（`DR-01` → **`D-051`**；`DR-02` → **`D-052`**）并补注"`20_INTEGRATION/` 文件为非 canonical 过程文档；其 `NEEDS DECISION` 属生成当时的历史状态"；**§0.1 补时序校正**（`Integrator` → `D-051` / `D-052` 落盘 → **`SP-01` 实测候选环境** → `TQ01`–`TQ05` 最终 Gate B 裁决 → `Local Landing` → `Gate C`；**`SP-01` 非 BLOCKER，但 `TQ02` / `TQ05` 最终裁决前必须完成**）；<br>⑧ **§14 第 4 条**（版本链推进）；**§14.1** 注明"本版无新增 CCR"；⑨ 元信息状态推进为 **`v0.2.5 DRAFT / D-051+D-052 对齐版`**。<br>🔴 **本版不 `CONFIRM` `TQ01`–`TQ05` 任何一项**、**不执行 `SP-01`**、**不选择托管平台 / 最终 LLM provider**、**不写业务代码 / 不写 SQL / 不部署**、**不进入 Local Landing**、**不改 `D-027` / `D-040` / `D-043` / `D-045` / `D-049` / `D-050`**、**不改 `ADJ-01` 状态**、**不修改 `04_RETRIEVAL_AND_COMPARISON.md` / `05_TEST_DEMO_DEPLOY.md` / `03_AI_PIPELINE.md`**（均为 Worker 历史产出）。<br>**仍为 DRAFT —— 未 `FROZEN`、未 `CONFIRMED`、不可作为实现依据**（**`D-051` / `D-052` 本身已 `CONFIRMED`，契约整体状态不受影响**）。 |
| **v0.2.6** | 2026-09-24 | **DRAFT / `D-053` Local-first + `D-054` Structured Experience RAG 对齐版** | **接入已由项目负责人人工 `CONFIRMED` 的两项 S00-03 架构级 Decision（`docs/DECISIONS.md` `D-053` / `D-054`；来源 = 项目负责人本轮人工架构决策，非 AI 提议 / 非 Worker 产出 / 非 `DR-*` 报告）—— 只做 canonical 落盘，不新增 / 不放宽 / 不收紧任何产品机制**：<br>① **`D-053`（V1 主架构改为 Local-first Harness-style Web App）** —— **§0 新增 §0.4《架构形态与持久化的当前基线》A 节**（主架构 = Local-first Harness-style Web App；用户科研主数据 Local-first；Workspace canonical = 用户选择的本地目录；Vercel = Review / Demo 目标、**不是科研主数据库、不是 Production SaaS Infrastructure**；**云 PostgreSQL 不是 V1 required dependency**；浏览器须**用户主动授权**后才能访问 Workspace、**未授权不得读取本地目录**；**逻辑对象不得因改为文件而扁平化**；物理表示由 Integrator 收敛；**不建立用户可见版本系统**；**不得引入云数据库 / 用户账号数据库 / 云端 Workspace / 服务端永久科研数据存储**；**安全与隐私表述红线**）；**§0.1 补 v0.2.6 时序校正**（旧 `SP-01` / `SP-01a` 链被 supersede；新时序 = `D-053/D-054 Landing → Local-first Rebaseline → SP-06 Plan → 人工批准 → SP-06 → TQ01–TQ05 余项 Gate B → v0.3 DRAFT → Local Landing → Gate C → Coding`；**不得直接从本轮进入 Coding**；`SP-01a = SUPERSEDED BY D-053 / INCOMPLETE HISTORICAL SPIKE`，**不是 FAIL**，历史 Phase 2 事实全部保留，**立即停止后续创建链**）；**§13.1 补就地补注**（`TQ01` / `TQ02` 重新基线；`TQ05` 重新基线）；<br>② **`D-054`（V1 只实现 Structured Experience RAG；`ResearchContextProvider` 仅预留）** —— **§0.4 B 节**（`Structured Experience RAG` 正式定义 = 基于用户自身历史 `Attempt` 的结构化经验检索 + 证据上下文组装 + Grounded Generation；**不是新增产品流程**，是 `D9` ⑥⑦⑧⑨⑩ 的技术描述，**§9 十步 I/O 全部不变**；**corpus 不扩大**；🔴 **`RAG ≠ Vector DB`**，**不得用 `cosine similarity score` 替代 §9.4 的严格 `matched` 语义**；`ResearchContextProvider` **仅概念接口预留**，**V1 不实现任何 provider**，**不建立** PDF import / PDF parser / chunk store / embedding store / research search / literature citation / paper viewer，**不新增** `ResearchDocument` / `Chunk` / `Citation` 实体，**不增加 UI 入口与 P0 `AC`**；**未来分层 Layer 1 / 2 / 4 启用、Layer 3 `RESERVED ONLY`**；**`History-grounded` 定义不变**（仍要求至少一个真实 historical `Formal Attempt` 作为 grounding anchor）；**§13.1 `TQ04` 就地补注**）；<br>③ **§0.4 C 节明确不做**（不 `CONFIRM` `TQ01`–`TQ05` / 不选框架与本地文件 schema / 不 `CONFIRM` `TQ03` 的网络路径与凭据存储 / 不 `CONFIRM` `TQ04` / 不执行 `SP-06`）；<br>④ **§13 新增 §13.7**《`D-053` / `D-054` 后新增的未裁决项》—— 登记 **`DR-03`｜LLM Request Path** 与 **`DR-04`｜Credential Persistence**（**`DECISION REQUIRED` 2 项**），并附 **SSRF / Open Proxy 防护硬约束**（若选 `Vercel Thin Proxy`：**必须** host allowlist + URL validation + 禁内网与 metadata endpoint + 仅 `https`；**不得设计成"用户输入任意 URL，Vercel 无条件代请求"**）；明确**不升级为 `DECISION REQUIRED`** 的事项（框架 / 文件名 / 目录名 / helper / parser library / state library / routing / schema 细节 / 组件拆分；**File System fallback 亦暂不自动决定**，仅当 `SP-06` 证明主路径存在影响比赛演示的兼容性问题才升级）；<br>⑤ **§14 第 4 条**（版本链推进至 **`v0.2.6 DRAFT`**；🔴 **不得直接进入 `v0.3`** —— `v0.3 DRAFT` 仍保留给"Gate B 关键技术决策并入"）；**§14.1** 注明"本版无新增 CCR"（**未处理 CCR 仍 = 0**）；<br>⑥ 元信息推进为 **`v0.2.6 DRAFT / D-053 Local-first + D-054 Structured Experience RAG 对齐版`**；**依据来源**补 `D-053` / `D-054` / `S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md` / `SP-06_LOCAL_FIRST_FEASIBILITY_PLAN.md` / `SP-01a_*` 与 `sp01a_probe/`（历史，一字未改）。<br>🔴 **本版不新增对象 / 状态 / 字段 / 计数**；**不改 `D9` 十步 / 对象模型 / `source_type` / `EvidenceRef` / `N_检索`·`N_引用` / Level A·B·C / `D-049`–`D-052` / `ADJ-01`**；**不 `CONFIRM` `TQ01`–`TQ05`**；**不执行 `SP-06`**；**不做技术选型**；**不做架构定稿**。<br>🔴 **本契约整体仍为 DRAFT —— 未 `FROZEN`、未 `CONFIRMED`、不可作为实现依据**（**`D-053` / `D-054` 本身已 `CONFIRMED`，契约整体状态不受影响**）。 |
| **v0.2.7** | 2026-09-24 | **DRAFT / `D-055` Hybrid LLM Path + `D-056` Session-only Credential 对齐版** | **接入已由项目负责人人工 `CONFIRMED` 的两项 S00-03 架构级 Decision（`docs/DECISIONS.md` `D-055` / `D-056`；来源 = 项目负责人本轮人工裁决，关闭 `DR-03` / `DR-04`，非 AI 提议 / 非 Worker 产出）—— 只做 canonical 落盘，不新增 / 不放宽 / 不收紧任何产品机制**：<br>① **`D-055`（LLM 请求网络路径 = `Provider-dependent Hybrid`）** —— **§0.4 新增 D 节《LLM 接入边界》网络路径部分**（路径由 **`Provider Adapter Capability`** 决定、**不得逐请求让用户手工选择 `direct` / `proxy`**、**不得随机切换**；**`Browser Direct` 五项适用条件 + 路径 `Browser → LLM Provider` + 🔴 不得额外经过 Vercel Proxy**；**`Vercel Thin Proxy` 适用条件 + 路径 `Browser → Vercel Thin Proxy → Known LLM Provider`**；**🔴 Proxy `THIN` 允许 5 项 / 禁止 6 项（Workspace / `Attempt` / `Insight` / `Hypothesis` 持久化、Experience database、Cloud user database）**；**Custom `Base URL` = `Browser Direct Only`，🔴 禁止 `Generic Arbitrary URL Proxy`**；**🔴 Proxy 不得接受 client 任意 `target_url` / `base_url` / `host` / `scheme`，唯一形态 = `provider_id → 服务器注册 Adapter → 固定 / allowlist Host`**；**SSRF / Open Proxy / 内网 / link-local·metadata endpoint / 非 `http(s)` scheme / 重定向防护**；**不可用 Provider 必须明确失败、不得偷偷走通用 Proxy**；**🔴 V1 不预置服务端固定 Key**）；<br>② **`D-056`（LLM 凭据持久化 = `Session-only Credential`）** —— **§0.4 D 节 凭据部分**（**允许** session-scoped storage / 等价抽象；**目标行为 = 输入 → 当前会话可用 → 刷新后仍可用 → 会话结束清除 → 重新进入须重新输入**；**🔴 禁止载体 9 项**：`localStorage` / `IndexedDB` / Workspace file / Git / Vercel KV / Vercel DB / Cloud DB / server filesystem / permanent cookie；**传输边界**：Browser Direct ⇒ 只发往用户配置的 Provider、🔴 **不得额外发给 Vercel**；Proxy ⇒ **仅当前请求生命周期**、🔴 **不得持久化**；**🔴 日志不得出现 `Authorization` / API Key / 含 secret 的 body，须脱敏**；**🔴 不得增加「记住我 / 永久保存 Credential」开关**）；<br>③ **§13.7 更新**（`DR-03` → **`D-055`** `CONFIRMED`；`DR-04` → **`D-056`** `CONFIRMED`；🔴 **当前 `DECISION REQUIRED` 计数 = 0**；🔴 **但 `TQ03` 整体仍未 `CONFIRM`**）；**§0.4 C 节就地补注**；**§14 第 4 条**（版本链推进至 `v0.2.7`）；**§14.1** 注明"本版无新增 CCR"；**§15** 新增本行；<br>④ 🔴 **本版不 `CONFIRM` `TQ01`–`TQ05` 中的任何一项**、**不引用 `SP-06` 的任何结论**、**不做技术选型**、**不做架构定稿**、**不建立任何版本系统**、**不改 `D-020` / `D-044` / `D-049`–`D-054` / `ADJ-01`**。<br>🔴 **`D-055` / `D-056` 本身已是 `CONFIRMED` 架构级 Decision；但本契约整体仍为 DRAFT —— 未 `FROZEN`、未 `CONFIRMED`、不可作为实现依据。** || **v0.3** | 2026-09-24 | **DRAFT / GATE B FINAL TECHNICAL DECISIONS INTEGRATED（`D-057` + `D-058`–`D-062`）** | **接入 GATE B LANDING PHASE 的正式落盘结果（`docs/DECISIONS.md` `D-057` 流程决策 + `D-058`–`D-062` Gate B 最终技术决策；`Source = Gate B Final Human Confirmation`，项目负责人原话「A｜确认以上全部 Gate B 决策」；非 AI 提议 / 非 Worker 产出）—— 只冻结技术架构与部署目标，不新增 / 不放宽 / 不收紧任何产品机制**：<br>① **`D-057`（流程决策）** —— **§0.4 新增 E 节 E.1**：`SP-06` 剩余「Vercel 部署验证」+「真实浏览器目录权限生命周期人工观测」**不再作为 `Gate B` / `Gate C` / 正式 Coding 的硬阻塞项**，**但仍是 `PRE-SUBMISSION ACCEPTANCE` 的必做项**；允许序列 = **`Gate B` → `Gate C` → `Coding` →（开发后 / 提交前）Vercel Preview Deployment + Chrome / Edge 真实 `Workspace` 验收**；🔴 **`SP-06` 历史状态不变**（`CONDITIONAL PASS`；7 项 `PENDING MANUAL OBSERVATION` 仍然 `PENDING`，不得伪造 `PASS`）；🔴 **File System fallback 仍不触发**（升级条件 = `F1`–`F4`）。<br>② **`D-058`（`TQ01`）** —— **§0.4 E.2**：**Browser-heavy Local-first Web App + Optional Thin Server Layer**（Thin Server **只在某 `registered provider adapter` 无法 `Browser Direct` 时存在**；**不承担** Workspace persistence / user database / `Attempt`·`Insight`·`Hypothesis` storage / Experience DB；⇒ **不是 Backend-centric 架构**）。<br>③ **`D-059`（`TQ02`）** —— **§0.4 E.3 + E.8**：**Local Workspace Files + No required cloud database**（🔴 **PostgreSQL 不是 V1 required dependency**；🔴 不得引入云 DB / SQLite server / remote persistence service 作为主存储；🔴 **物理文件 schema 由实现层 / Integrator 收敛，不得锁成不可变产品 Decision**，但**必须继续满足** `human-readable` / `stable ID` / `EvidenceRef` / `archive_state` / `generation batch` / `source_type` / `decision_state` / `Git-friendly`·`portable`）。<br>④ **`D-060`（`TQ03`）** —— **§0.4 E.4**：**Configurable LLM + Provider Abstraction + Provider-dependent Hybrid + Session-only Credential + Registered-provider Thin Proxy only**（路径由 Adapter 能力决定；Custom `Base URL` = `Browser Direct Only`；🔴 无通用 URL Proxy / 无 Remember Key / 不持久化 Credential / 不预置服务端固定 Key；Structured Output 优先 Provider-native + schema validation，🔴 属实现层）。<br>⑤ **`D-061`（`TQ04`）** —— **§0.4 E.5**：**`R-A`**（Structured Field Rules + 必要时 LLM 维度级**离散三态**判定；`matched` 仍由 **`D-050` 严格语义重叠**决定；🔴 **无 Vector DB / 无 embedding 准入 / 无数值相似度**）；🔴 **`Research Document RAG` 仍 = `OUT OF V1` / `RESERVED ONLY`**（`D-054` 不变）。<br>⑥ **`D-062`（`TQ05`）** —— **§0.4 E.6 + E.9**：**Local Development + Vercel Demo / Review Deployment Target + Local Workspace + Optional Thin Provider Proxy**（🔴 不得引入云数据库；🔴 不得依赖腾讯云旧 `SP-01a`）；🔴 **必须附 `DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION`** —— 🔴 **不得写「Vercel 已验证 / 已部署 / HTTPS picker 已验证 / Production Ready」**，🔴 **不得写「Local-first 已可行 / 已完成浏览器验收」**。<br>⑦ **§13.1 / §13.7 补就地补注**（`TQ01`–`TQ05` 已全部最终裁决；`DECISION REQUIRED` 计数 = 0）；**§14 第 4 条**（版本链推进至 `v0.3`）；**§14.1** 注明"本版无新增 CCR"；**§15** 新增本行。<br>⑧ 🔴 **`TypeScript end-to-end` 与 `Markdown + JSON / sidecar metadata` 属 `TECHNICAL DEFAULT` / 实现参数** —— **不写入任何 `CONFIRMED` 核心结论**、**不生成 `Decision ID`**；🔴 **框架 / state library / router / component library 同属实现参数**。<br>⑨ 🔴 **本版不新增任何 `AC`**（`AC` 口径不变 = 连续 canonical **162** ＋ 独立 `AC-Q06` **6** ＝ 全部有效验收点 **168**）；**不新增、不放宽、不收紧任何产品机制** —— `D9` 十步 / 对象模型 / `source_type` / `EvidenceRef` / `N_检索`·`N_引用` / Level A·B·C / `D-020` / `D-044` / `D-049`–`D-056` / `ADJ-01` **全部不变**。<br>⑩ 🔴 **本版仍为 `DRAFT`**（`v0.3 DRAFT` ≠ 冻结态）—— **未 `FROZEN`、未 `CONFIRMED`、Gate C 前 NOT IMPLEMENTATION BASIS**；🔴 **不进入 Gate C**；🔴 **未写正式产品代码 / 未创建 `src/` / 未部署**；🔴 **冻结态仍保留给"Gate C 最终关闭审查通过"**。 |
| **v0.3** | 2026-09-24 | **DRAFT / GATE B FINAL TECHNICAL DECISIONS INTEGRATED（`D-057` + `D-058`–`D-062`）** | **接入 GATE B LANDING PHASE 的正式落盘结果（`docs/DECISIONS.md` `D-057` 流程决策 + `D-058`–`D-062` Gate B 最终技术决策；`Source = Gate B Final Human Confirmation`，项目负责人原话「A｜确认以上全部 Gate B 决策」；非 AI 提议 / 非 Worker 产出）—— 只冻结技术架构与部署目标，不新增 / 不放宽 / 不收紧任何产品机制**：<br>① **`D-057`（流程决策）** —— **§0.4 新增 E 节 E.1**：`SP-06` 剩余「Vercel 部署验证」+「真实浏览器目录权限生命周期人工观测」**不再作为 `Gate B` / `Gate C` / 正式 Coding 的硬阻塞项**，**但仍是 `PRE-SUBMISSION ACCEPTANCE` 的必做项**；允许序列 = **`Gate B` → `Gate C` → `Coding` →（开发后 / 提交前）Vercel Preview Deployment + Chrome / Edge 真实 `Workspace` 验收**；🔴 **`SP-06` 历史状态不变**（`CONDITIONAL PASS`；7 项 `PENDING MANUAL OBSERVATION` 仍然 `PENDING`，不得伪造 `PASS`）；🔴 **File System fallback 仍不触发**（升级条件 = `F1`–`F4`）。<br>② **`D-058`（`TQ01`）** —— **§0.4 E.2**：**Browser-heavy Local-first Web App + Optional Thin Server Layer**（Thin Server **只在某 `registered provider adapter` 无法 `Browser Direct` 时存在**；**不承担** Workspace persistence / user database / `Attempt`·`Insight`·`Hypothesis` storage / Experience DB；⇒ **不是 Backend-centric 架构**）。<br>③ **`D-059`（`TQ02`）** —— **§0.4 E.3 + E.8**：**Local Workspace Files + No required cloud database**（🔴 **PostgreSQL 不是 V1 required dependency**；🔴 不得引入云 DB / SQLite server / remote persistence service 作为主存储；🔴 **物理文件 schema 由实现层 / Integrator 收敛，不得锁成不可变产品 Decision**，但**必须继续满足** `human-readable` / `stable ID` / `EvidenceRef` / `archive_state` / `generation batch` / `source_type` / `decision_state` / `Git-friendly`·`portable`）。<br>④ **`D-060`（`TQ03`）** —— **§0.4 E.4**：**Configurable LLM + Provider Abstraction + Provider-dependent Hybrid + Session-only Credential + Registered-provider Thin Proxy only**（路径由 Adapter 能力决定；Custom `Base URL` = `Browser Direct Only`；🔴 无通用 URL Proxy / 无 Remember Key / 不持久化 Credential / 不预置服务端固定 Key；Structured Output 优先 Provider-native + schema validation，🔴 属实现层）。<br>⑤ **`D-061`（`TQ04`）** —— **§0.4 E.5**：**`R-A`**（Structured Field Rules + 必要时 LLM 维度级**离散三态**判定；`matched` 仍由 **`D-050` 严格语义重叠**决定；🔴 **无 Vector DB / 无 embedding 准入 / 无数值相似度**）；🔴 **`Research Document RAG` 仍 = `OUT OF V1` / `RESERVED ONLY`**（`D-054` 不变）。<br>⑥ **`D-062`（`TQ05`）** —— **§0.4 E.6 + E.9**：**Local Development + Vercel Demo / Review Deployment Target + Local Workspace + Optional Thin Provider Proxy**（🔴 不得引入云数据库；🔴 不得依赖腾讯云旧 `SP-01a`）；🔴 **必须附 `DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION`** —— 🔴 **不得写「Vercel 已验证 / 已部署 / HTTPS picker 已验证 / Production Ready」**，🔴 **不得写「Local-first 已可行 / 已完成浏览器验收」**。<br>⑦ **§13.1 / §13.7 补就地补注**（`TQ01`–`TQ05` 已全部最终裁决；`DECISION REQUIRED` 计数 = 0）；**§14 第 4 条**（版本链推进至 `v0.3`）；**§14.1** 注明"本版无新增 CCR"；**§15** 新增本行。<br>⑧ 🔴 **`TypeScript end-to-end` 与 `Markdown + JSON / sidecar metadata` 属 `TECHNICAL DEFAULT` / 实现参数** —— **不写入任何 `CONFIRMED` 核心结论**、**不生成 `Decision ID`**；🔴 **框架 / state library / router / component library 同属实现参数**。<br>⑨ 🔴 **本版不新增任何 `AC`**（`AC` 口径不变 = 连续 canonical **162** ＋ 独立 `AC-Q06` **6** ＝ 全部有效验收点 **168**）；**不新增、不放宽、不收紧任何产品机制** —— `D9` 十步 / 对象模型 / `source_type` / `EvidenceRef` / `N_检索`·`N_引用` / Level A·B·C / `D-020` / `D-044` / `D-049`–`D-056` / `ADJ-01` **全部不变**。<br>⑩ 🔴 **本版仍为 `DRAFT`**（`v0.3 DRAFT` ≠ 冻结态）—— **未 `FROZEN`、未 `CONFIRMED`、Gate C 前 NOT IMPLEMENTATION BASIS**；🔴 **不进入 Gate C**；🔴 **未写正式产品代码 / 未创建 `src/` / 未部署**；🔴 **冻结态仍保留给"Gate C 最终关闭审查通过"**。 |
| **v0.3 FROZEN** | 2026-09-24 | ✅ **FROZEN / IMPLEMENTATION BASIS（GATE C FINAL FREEZE）** | **由 `v0.3 DRAFT` 推进为冻结态 —— `IMPLEMENTATION BASIS = YES`**（触发 = 项目负责人 2026-09-24「A｜确认 Gate C，冻结当前实现基线并允许正式开发」）：<br>① **版本号不变**（🔴 **不发明新版本号**：按 §14 第 4 条既有版本链，终端状态即「冻结态」，故 `版本 = v0.3`）；<br>② **新增 1 项 `CONTRACT CLARIFICATION`（🔴 不是 CCR、不是新 `Decision`、不新增 `AC`）** = **§9.4.1《Level A 四维度 → 主字段路径映射表》**（`goal → goal` / `approach·技术对象 → actual_attempt` / `condition → condition` / `result·现象 → actual_result`；落实 §12 第 6 项 / `TQ19`）；<br>③ **`CC-02`（`TQ02` 物理 schema）不升级为 Contract Decision**（落点 = 实现层 `IMPLEMENTATION SCHEMA PLAN`，Gate C Plan §J）；<br>④ **前置链**：`S00-03 Gate C Readiness Review` → 首轮 `NOT READY`（`ISSUE-01` 文档传播缺口）→ `RL-01` + `RL-02` → **有界 Recheck = `READY WITH NON-BLOCKING DEFERRED ITEMS`** → `FINAL STATUS HYGIENE CHECK`；<br>⑤ 🔴 **冻结不改变任何产品语义 / 技术架构语义**（`D-049`–`D-062` 一字未改；`AC` 口径不变 = 连续 canonical **162** ＋ 独立 `AC-Q06` **6** ＝ **168**；**新增 `AC` = 0**）；<br>⑥ 🔴 **冻结后修改本契约仍须走 §14 CCR**；🔴 **§12 Worker 禁改清单继续有效**；🔴 **`DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION` 不变**（不得写「Vercel 已验证 / 已部署 / Production Ready」「Local-first 已可行 / 已完成浏览器验收」）；🔴 **`SP-06` 历史状态不变**（`CONDITIONAL PASS` + 7 项 `PENDING MANUAL OBSERVATION`）；🔴 **File System fallback 仍不触发**（`F1`–`F4`）。 |
