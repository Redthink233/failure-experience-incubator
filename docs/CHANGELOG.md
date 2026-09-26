# 变更日志（CHANGELOG）

> 记录文档与项目的重要变更，按时间倒序。

## 2026-09-24 — S00-03 / **GATE C COMPLETE**｜实现基线冻结（`RL-01` + `RL-02` + `FINAL STATUS HYGIENE CHECK` + `FINAL FREEZE SANITY CHECK`）

本次为项目负责人 **2026-09-24 明确回复「A｜确认 Gate C，冻结当前实现基线并允许正式开发」**触发的 **Gate C Landing Phase**。🔴 **不写正式业务代码、不创建 `src/`、不部署、不创建或删除任何外部资源、不新增 `Decision`。**

- 🚩 **`Gate C` = `COMPLETE`**；**Shared Contract：`v0.3 DRAFT` → ✅ `v0.3 FROZEN / IMPLEMENTATION BASIS`**；🔴 **`IMPLEMENTATION BASIS = YES`**；🔴 **版本号 = `v0.3` 不变**（按契约 §14 第 4 条既有版本链，终端状态即「冻结态」，**未发明新版本号**）。
- **前置链**：`Gate C Readiness Review`（首轮 `NOT READY`，唯一原因 = `ISSUE-01` 文档传播缺口，🔴 不涉及产品语义）→ **`RL-01`** 文档传播补丁 → **`RL-02`** 实现计划依赖修正 → **有界 Recheck = `READY WITH NON-BLOCKING DEFERRED ITEMS`** → **`FINAL STATUS HYGIENE CHECK`（4 项）** → 本冻结 → **`FINAL FREEZE SANITY CHECK`（8 项，全部成立）**。
- **`FINAL STATUS HYGIENE CHECK`（4 项，🔴 非新 RL / 非新 Decision / 非新 `AC`）**：
  1. **Gate C Plan 文件头** —— `Gate C Verdict` 更新为 **`READY WITH NON-BLOCKING DEFERRED ITEMS` / `PENDING FINAL HUMAN LANDING`**；🔴 **历史首轮 `NOT READY` 保留于 §Q.1 / §Q.2，未删除未改写**；
  2. **§H 风险** —— `R-04`（`ISSUE-01` 已由 `RL-01` 关闭）与 `R-05`（`IMPLEMENTATION SCHEMA PLAN` 已在 §J 形成）**disposition 更新为 `RESOLVED FOR IMPLEMENTATION` / `NON-BLOCKING`**，🔴 **历史风险来源保留**；
  3. **§M.4 两天节奏** —— 起点更新为 **`Gate C Landing → P0-A → P0-B → P0-C / P0-D → P0-E → PRE-SUBMISSION PSA`**；🔴 **`RL-01` 不再写成未来待执行动作**；🔴 **`P0` 范围未改变**；
  4. **`CONTRACT CLARIFICATION CC-01`** —— 契约**新增 §9.4.1《Level A 四维度 → 主字段路径映射表》**（`goal → goal`／`approach·技术对象 → actual_attempt`／`condition → condition`／`result·现象 → actual_result`），登记为 **`CONTRACT CLARIFICATION`**，🔴 **不是 CCR、不是新 `Decision`、不新增 `AC`**，🔴 **不改变 `D-019` / `D-050` / `D-061` 语义**；**`CC-02`（`TQ02` 物理 schema）不升级为 Contract Decision**（落点 = 实现层 `IMPLEMENTATION SCHEMA PLAN`）。
- **冻结落盘**：
  - `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md` —— 文件头（状态 / 版本 / 效力）→ **`v0.3 FROZEN / IMPLEMENTATION BASIS`**；**新增《v0.3 FROZEN 说明》块**；**新增 §9.4.1**；**§12 第 6 项**补注（映射表已冻结）；**§13.2** 补 v0.3 说明（`TQ19` 已冻结 / `CC-02` 不升级）；**§14 第 4 条**补 v0.3 FROZEN 就地补注；**§14.1** 新增两条「无新增 CCR」；**§15** 新增 **`v0.3 FROZEN`** 变更行；
  - `docs/07_TECH_ARCHITECTURE.md` —— **新增 §5.16《GATE C｜实现基线冻结登记》**；§5.15 状态表就地补注（`Shared Contract` 行已由冻结态取代）；
  - `20_INTEGRATION/S00-03_技术决策包.md` —— **新增 §V.13**；
  - `20_INTEGRATION/S00-03_GATE_C_READINESS_AND_IMPLEMENTATION_PLAN.md` —— 文件头 / §H / §M.4 卫生更新 + **新增 §T**；
  - **`20_INTEGRATION/CODING_START_HANDOFF.md`（新增）** —— Frozen Decisions / Frozen Contract / P0 关键路径 / 模块清单 / 开发轨 / **第一个编码任务** / 可并行任务 / owned files / 禁止跨模块编辑 / 测试命令 / Done 判据 / 延后 `PSA` / 赛期风险；
  - `.learnbuddy/memory/`（`MEMORY.md` §5 + `DECISION_INDEX.md` §C-GATEC + 本日日志）。
- **🔴 冻结的射程（只冻结「实现依据」这一效力）**：**产品语义 / 技术架构 / 共享语义一字未改**（`D1`–`D10` / `R1`–`R6` / `D-011`–`D-062` / `ADJ-01` / `Q16`；`D9` 十步 / 对象 / 状态 / `source_type` / `EvidenceRef` / `N_检索`·`N_引用` / Level A·B·C / 生成批次）；**新增 `AC` = 0**（口径不变 = 连续 canonical **162** ＋ 独立 `AC-Q06` **6** ＝ **168**）。
- 🔴 **未因此成立的事项（不得写反）**：**`DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION` 不变**（`PSA-01`–`PSA-13` + `PSA-X1`–`X11` 仍全部 `PENDING`，🔴 不是产品 `AC`）｜🔴 **不得写**「Vercel 已验证 / 已部署 / HTTPS picker 已验证 / Production Ready」｜🔴 **不得写**「Local-first 已可行 / 已完成浏览器验收」｜**`SP-06` 历史状态不变**（`CONDITIONAL PASS` + 7 项 `PENDING MANUAL OBSERVATION`）｜**`SP-06 TEST SPEC GAP` = `HISTORICAL / NON-BLOCKING UNDER D-057`**（`PROCESS DISPOSITION RESOLVED` / `TEST HISTORY PRESERVED`，🔴 不写 `RESOLVED BY TEST`）｜**File System fallback 仍不触发**（`F1`–`F4`）｜**Research Document RAG 仍 `OUT OF V1` / `RESERVED ONLY`**（`D-054`）｜**`Legacy Cloud Cleanup` = `DEFERRED` / 未授权执行**。
- 🔴 **冻结后变更纪律**：契约修改**仍须走契约 §14 CCR 流程**；**契约 §12 Worker 禁改清单继续有效**；🔴 **`TECHNICAL DEFAULT` / 实现参数不得锁成不可变产品 Decision**。
- **FINAL FREEZE SANITY CHECK（8 项，全部成立）**：`Current Gate C Verdict` = `READY WITH NON-BLOCKING DEFERRED ITEMS`｜`Canonical Consistency` = `PASS`｜`Contract Consistency` = `PASS`｜`Module Dependency` = `DAG`｜`AC Coverage` = `PASS`｜`BLOCKER` = `NO`｜`CCR` = `NO`｜`PRODUCT SEMANTIC CONFLICT` = `NO`｜`Unresolved Important Decisions` = `0`。
- **阶段状态**：**`S00-03` = 已关闭（Gate C COMPLETE）**；**当前阶段 = `S01 / Implementation`**；**契约 = `v0.3 FROZEN`**；**`Formal Product Code` = `NOT WRITTEN`**（🔴 本轮仍未创建 `src/`）。
- **下一动作**：**`NEXT TASK` = `S01-01`｜Project Skeleton + Shared Domain Types + Workspace Repository Minimum Vertical Slice**（见 `20_INTEGRATION/CODING_START_HANDOFF.md`）。🔴 **本轮不自动开始 Coding。**

## 2026-09-24 — S00-03 / **GATE C READINESS REVIEW**｜`RL-01` 文档传播补丁 + `RL-02` 实现计划依赖修正 → Recheck

本次为**项目负责人 2026-09-24 回复「A｜批准执行 `RL-01` 文档传播补丁」**并**同时批准 `RL-02`（实现计划依赖关系修正）**触发的**有界补丁 + 有界 Recheck**。🔴 **不写正式业务代码、不创建 `src/`、不部署、不创建或删除任何外部资源、不新增 `Decision`、不新增 `AC`、**🔴 **未冻结契约。**

- **首轮 Gate C Verdict = `NOT READY`**（唯一原因 = `ISSUE-01` 文档传播缺口；🔴 **不涉及产品语义、不是 `BLOCKER`、不是 CCR、无 `PRODUCT SEMANTIC CONFLICT`**）。
- **`RL-01`｜Gate B Landing 文档传播补丁（🔴 全部为"追加就地补注 / 新增登记节"，未删除、未改写历史原文）**：

| # | 文件 | 动作 |
|---|---|---|
| `RL-01-1` | `docs/06_AI_CAPABILITIES.md` | **新增《S00-03 决策同步（2026-09-24，`CONFIRMED`：`D-058`–`D-062`）》节**（`D-061`→`A3` / `D-060`→`A1`–`A5` / `D-058`·`D-059`·`D-062` 边界 / 不改变清单）＋ **5 处就地补注** |
| `RL-01-2` | `docs/07_TECH_ARCHITECTURE.md` | **§5.6 就地补注**（`TQ04` = `R-A`）＋ **§5.12.4 状态汇总框就地补注**（指向 §5.15）＋ **§5.11 就地补注追加**（原文逐字恢复保留） |
| `RL-01-3` | `docs/03_V1_SCOPE.md` | 《`D-053`/`D-054` 范围边界同步》节末**追加就地补注**（逐条对应 §3 第 4/5 条、§4 第 7 条） |
| `RL-01-4` | `docs/05_DATA_MODEL.md` | 《`D-051` 生成批次》节**追加就地补注**（`TQ02` 已由 `D-059` 裁决；逻辑数据模型不变） |
| `RL-01-5` | `docs/09_TEST_PLAN.md` | **5 处就地补注**（`D-050` 节 回归禁止项 + 未确定项；`D-051`/`D-052` 节；`D-053`/`D-054` 节；`D-055`/`D-056` 节） |
| `RL-01-6` | `docs/04_USER_FLOW.md` / `docs/08_UI_SPEC.md` | **各新增《S00-03 Gate B 决策同步登记》节** —— 逐 Decision 登记"**无新增流程 / 无新增界面约束**" |
| `RL-01-7` | `docs/CHANGELOG.md` | **本条目** |

- **`RL-02`｜实现计划依赖关系修正（落点 = `20_INTEGRATION/S00-03_GATE_C_READINESS_AND_IMPLEMENTATION_PLAN.md`）**：

| 编号 | 原问题 | 修正 |
|---|---|---|
| `RC-01` | **`M6` ↔ `M7` 循环依赖** | **Level A projection 归 `M6` 内部纯函数 / 下沉 `Domain/shared projection helper`**；`M6` **不依赖 `M7`**；`M7` **单向**消费 `DerivedComparison`；**`M7` 不参与 retrieval projection / admission** ⇒ `Domain/Projection → M6 → M7` |
| `RC-02` | **`M10` ↔ `M11`/`M12` 潜在循环** | **`M10` 只定义 interface / capability / normalized request·result contract**；**`M11` / `M12` `implements`**；**adapter registry / composition 由 `M15`（composition root）注入**；🔴 **`M10` 不 `import` 具体实现** |
| `RC-03` | **`M3` → `M1` 反向依赖** | **`WorkspaceSession` / `WorkspaceHandle` Owner 恒为 `M2`**；`M3` **仅依赖 `M2` 的 workspace abstraction / type**；🔴 **`M3` 不依赖 `M1`** |

  同步修正：Module Boundary（新增 **§I.3 边界裁定清单**）｜Dependency Graph（§K 重绘 + 依赖方向表 + **无环校验**）｜Development Tracks（§L.1–§L.3）｜Fast-path（§M.2）｜Shared Types Boundary（§J.2 新增 `LevelAProjection` / `AdapterRegistry`；§J.3 目录结构）。
  🔴 **未改变**：`D-050` / `D-061` / Level A / 三态 / `related` / `N_检索` / `N_引用` 语义；`D-055` / `D-056` / `D-060` 的网络、安全、凭据语义。🔴 **`RL-02` 不是 `Decision`、不是 `AC`、不是 CCR。**

- **有界 Recheck（仅 5 项）**：`Canonical Consistency` = ✅ **PASS**（`ISSUE-01` 关闭）｜`Module dependency 无循环 / 无反向依赖` = ✅ **PASS**（全图 **DAG**）｜`Contract Consistency` = ✅ **PASS**（🔴 契约**仍为 `v0.3 DRAFT`**）｜`AC Coverage` = ✅ **PASS**（**新增 `AC` = 0**；162 ＋ 6 = 168）｜`BLOCKER` = **NO**｜`CCR` = **NO**｜`PRODUCT SEMANTIC CONFLICT` = **NO**。
- ✅ **Recheck 后 Gate C Verdict = `READY WITH NON-BLOCKING DEFERRED ITEMS`**（`NON-BLOCKING DEFERRED` = `PSA-01`–`PSA-13` + `PSA-X1`–`X11` 全 `PENDING`；`SP-06` `TEST SPEC GAP` = `HISTORICAL / NON-BLOCKING UNDER D-057`）。
- 🔴 **本轮边界（逐项确认未执行）**：**未进入 `Gate C Landing`**｜**未冻结契约**（仍 `v0.3 DRAFT`，未 `FROZEN` / 未 `CONFIRMED` / 未 `IMPLEMENTATION BASIS`）｜**未写正式产品代码 / 未创建 `src/`**｜**未部署 / 未创建 Vercel Project**｜**未创建或删除任何云资源**｜**未新增 `Decision`**｜**未新增 / 未重编号 `AC`**｜**未重开 `TQ01`–`TQ05`**｜**未改 `D-053`–`D-062`**｜**未运行 Spike**｜**未执行 `PSA`**｜**未重跑 `SP-06`**｜**未改写** Worker `01`–`05` 产出 / `SP-03`·`SP-03R`·`SP-06` raw evidence / `SP-01a_*`。
- **标志位**：`BLOCKER` = **NO**｜`CCR` = **NO**（未处理 = 0）｜`PRODUCT SEMANTIC CONFLICT` = **NO**｜`BILLING AUTH REQUIRED` = **NO**（费用 0 元）｜`Gate C` = **`READY WITH NON-BLOCKING DEFERRED ITEMS`（待人工冻结）**｜`Formal Product Code` = **`NOT WRITTEN`**。
- **下一人工动作（唯一）**：**【GATE C FINAL HUMAN CONFIRMATION】** → **`A`｜确认 Gate C，冻结当前实现基线并允许正式开发** ／ **`B`｜发现问题，暂不冻结**。🔴 **收到 `A` 之前不得冻结契约、不得生成 `CODING_START_HANDOFF.md`、不得写正式代码。**

## 2026-09-24 — S00-03 / **GATE B LANDING**｜`TQ01`–`TQ05` 最终技术决策落盘（`D-058`–`D-062`）+ 契约 `v0.2.7` → **`v0.3 DRAFT`**

本次为项目负责人 **2026-09-24 明确选择「A｜确认以上全部 Gate B 决策」** 触发的 **GATE B LANDING PHASE** 落盘。🔴 **不写正式业务代码、不创建 `src/`、不部署、不创建或删除任何外部资源、不进入 Gate C。**

- **人工确认**：**「A｜确认以上全部 Gate B 决策」** ⇒ **`Source = Gate B Final Human Confirmation`**；编号从 `D-057` 之后**连续顺延**（🔴 **未重用编号**）。
- **新增 5 个独立 Decision（🔴 独立追踪、不得合并）**：

| Decision | `TQ` | 最终结论（`CONFIRMED` 核心） |
|---|---|---|
| **`D-058`** | `TQ01` | **Browser-heavy Local-first Web App + Optional Thin Server Layer** |
| **`D-059`** | `TQ02` | **Local Workspace Files + No required cloud database** |
| **`D-060`** | `TQ03` | **Configurable LLM + Provider Abstraction + Provider-dependent Hybrid + Session-only Credential + Registered-provider Thin Proxy only** |
| **`D-061`** | `TQ04` | **`R-A`**（Structured Field Rules + 必要时 LLM 维度级三态判定） |
| **`D-062`** | `TQ05` | **Local Development + Vercel Demo / Review Deployment Target + Local Workspace + Optional Thin Provider Proxy** |

- 🔴 **`TECHNICAL DEFAULT` / 实现参数（🔴 不是人工 Decision、🔴 不生成 `Decision ID`）**：**`TypeScript end-to-end`**（`TQ01`）与 **`Markdown + JSON / sidecar metadata`**（`TQ02` 物理层）；**框架 / state library / router / component library = 实现参数**；🔴 **`TQ02` 物理文件 schema（front-matter / sidecar JSON / 目录名 / 文件名 / schema 细节）由实现层 / Integrator 收敛，🔴 不得锁成不可变产品 Decision**，但**必须继续满足** `human-readable` / `stable ID` / `EvidenceRef` / `archive_state` / `generation batch` / `source_type` / `decision_state` / `Git-friendly`·`portable`。
- 🔴 **`D-062`（`TQ05`）必须与 `DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION` 同读**：**`CONFIRMED` 只代表 Deployment Architecture / Target 冻结** —— 🔴 **不得写**「Vercel 已验证 / 已部署 / HTTPS picker 已验证 / Production Ready」，🔴 **不得写**「Local-first 已可行 / 已完成浏览器验收」。
- 🔴 **`SP-06` 历史状态不变**：`CONDITIONAL PASS`（PASS 7 / PARTIAL 6 / **PENDING MANUAL 7** / FAIL 0）；**7 项 `PENDING MANUAL OBSERVATION` 仍然 `PENDING`，未标 `PASS`、未删除、未伪造观测**。
- **契约推进**：`docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md` **`v0.2.7 DRAFT` → `v0.3 DRAFT / GATE B FINAL TECHNICAL DECISIONS INTEGRATED（`D-057` + `D-058`–`D-062`）`**：
  - 文件头（状态 / 版本 / 效力 / 依据来源）；**新增「v0.3 说明」块**；**§0.4 新增 E 节《Gate B 最终技术决策基线》**（E.1 流程处置 / E.2–E.6 五项决策 / **E.7 `TECHNICAL DEFAULT`** / **E.8 `TQ02` 必须继续满足的约束** / **E.9 部署验收状态** / **E.10 效力边界**）；**§13.1 补 v0.3 就地补注**（`TQ01`–`TQ05` 已全部裁决）；**§14 第 4 条**（版本链推进 + 就地补注：`v0.3` 的前置条件已满足并已推进）；**§14.1**（本版无新增 CCR）；**§15 新增 v0.3 变更行**；
  - 🔴 **契约整体仍为 `DRAFT`** —— **未 `FROZEN`、未 `CONFIRMED`**；🔴 **`v0.3 DRAFT` ≠ 冻结态**；**Gate C 前 NOT IMPLEMENTATION BASIS**；**冻结态仍保留给"Gate C 最终关闭审查通过"**。
- 🔴 **本组 Decision 不新增任何 `AC`**：`AC` 口径不变 = **连续 canonical 162 ＋ 独立 `AC-Q06` 6 ＝ 全部有效验收点 168**；🔴 **未重编号 / 未并入 / 未新增**；覆盖映射见 `docs/09_TEST_PLAN.md`「S00-03 Gate B 决策同步」节（🔴 **如判有覆盖缺口须另行提请人工裁决，不得在 Gate C 内自行新增**）。
- **落盘的其余文档**：`docs/DECISIONS.md`（**新增 `D-058`–`D-062`** + 编号空间登记 + S00-03 章节追加登记）；`docs/07_TECH_ARCHITECTURE.md`（**新增 §5.15 `GATE B LANDING`**）；`docs/09_TEST_PLAN.md`（**新增 Gate B 决策同步护栏节；🔴 新增 `AC` = 0**）；`20_INTEGRATION/S00-03_技术决策包.md`（**新增 §V.12**）；`20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md`（**新增 §Y.8**）；`30_SPIKES/local_first/SP-06/SP-06_EXECUTION_REPORT.md`（**新增 §S 落盘登记；A–R 原文一字未改**）；`.learnbuddy/memory/`。
- 🔴 **本轮边界（逐项确认未执行）**：**未进入 Gate C**｜**未写正式产品代码 / 未创建 `src/`**｜**未部署 / 未创建 Vercel Project**｜**未创建或删除任何云资源**（腾讯云与 Vercel 均无）｜**未创建 `R1` / `R3`、未删除 `R2` / `R6-A` / `R6-B` / `R6-C`、未恢复 `SP-01a`**｜**未实现 PDF RAG / Literature RAG / embedding / Vector DB / paper knowledge base**｜**未改写** `SP-03` / `SP-03R` / `SP-06` raw evidence / Worker `01`–`05` 产出 / `SP-01a_*` 文档｜**未把 `PSA-*` 写成产品 `AC`**。
- **标志位**：`BLOCKER` = **`NO`**｜`CCR` = **`NO`**（未处理 = 0）｜`PRODUCT SEMANTIC CONFLICT` = **`NO`**｜`BILLING AUTH REQUIRED` = **`NO`**（费用 0 元）｜`MANUAL AUTH REQUIRED` = **`YES`**（已后置至提交前）｜`MANUAL OBSERVATION PENDING` = **`YES`（7 项，已后置）**｜`PROCESS DEVIATION` = **`YES`（历史 `R2`，不得隐去）**｜`RESOURCE CHANGE REQUIRED` = **`RESOLVED`**｜`SP-06 TEMP RESOURCE CLEANUP` = **`NOT APPLICABLE`**。
- **阶段状态**：**`Gate B` = `COMPLETE`**（待项目负责人下一步指令）；**`S00-03` = 已启动 / 未关闭**；**编码未开始**；**契约 = `v0.3 DRAFT`（未冻结）**；**`TQ01`–`TQ05` = 全部 `CONFIRMED`**。
- **下一人工动作（唯一）**：**`S00-03 Gate C Readiness Review`**（🔴 **本任务不自动进入 Gate C**；须先由项目负责人启动 Gate C Readiness 检查）。

## 2026-09-24 — S00-03 / GATE-B PRE-CONFIRM CORRECTION（`B｜有修改后再确认`；3 项修正，不新建 Decision）

本次为**项目负责人在 Gate B 总确认前选择 `B｜有修改后再确认`** 触发的**定点修正**。🔴 **不重新分析架构、不创建新 `Decision ID`、不重开 `D-053`–`D-057`、不运行 Spike、不进入 Gate C、不写正式代码。**

### 修正 1｜`AC` 总数口径统一

- 🔴 **修正前（含算术矛盾）**：「`AC` 有效总数 = 162（`AC-01`–`AC-162` + `AC-Q06-1`–`6`）」—— 把 6 项描述为合计的一部分，却仍标 162。
- ✅ **修正后（正式统一口径）**：
  ```
  连续 canonical AC 数量 = 162   （AC-01 – AC-162，连续无缺号）
  独立 AC-Q06 数量       = 6     （AC-Q06-1 – AC-Q06-6，独立编号空间）
  全部有效验收点总数     = 168
  ```
- 🔴 **未重编号任何 `AC`**、🔴 **未把 `AC-Q06` 并入连续编号**、🔴 **未新增任何 `AC`** —— **只修正"统计总数 / 口径"的表述错误**。
- 🔴 **历史正确事实保留不改**：`S03-E` 当时「`AC-01`–`AC-115`（115）＋ `AC-Q06-1`–`6`（6）＝ **121**」**不得修改**（`docs/architecture/05_TEST_DEMO_DEPLOY.md` 等历史文件中的该表述与 `121` 口径**原样保留**）。
- **同步落点**：`docs/09_TEST_PLAN.md`（**`AC` 口径就地校正**，含 D-055/D-056 节与 D-057 护栏节）、`docs/DECISIONS.md`（`D-057` 条目）、`docs/CHANGELOG.md`（新增条目 + §下方 3 处就地补注）、`20_INTEGRATION/S00-03_技术决策包.md`（§V.9 / §U.4 / §T.3 就地补注）、`20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md`（§W.5 / §W.6 就地补注 + §Y.5）、`20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md`（§0 / §6）、`.learnbuddy/memory/`。

### 修正 2｜收紧 `TQ01` / `TQ02` 的人工 Decision 粒度

```
TQ01 人工 Decision 核心结论 = Browser-heavy Local-first Web App + Optional Thin Server Layer
      TypeScript end-to-end  ⇒ TECHNICAL DEFAULT / IMPLEMENTATION PARAMETER
                              ⇒ 🔴 不写入 TQ01 的 CONFIRMED Decision 核心结论、🔴 不为它创建 Decision ID

TQ02 人工 Decision 核心结论 = Local Workspace Files + No required cloud database
      Markdown + JSON / sidecar metadata ⇒ TECHNICAL DEFAULT，不是新的人工 Decision
      ⇒ 物理 schema（front-matter / sidecar JSON / 目录名 / 文件名 / schema 细节）由实现层 / Integrator 收敛
      ⇒ 🔴 Gate B Landing 时不得把某一种物理文件 schema 锁成不可变产品 Decision
      ⇒ ✅ 仍必须满足：human-readable / stable ID / EvidenceRef / archive_state / generation batch /
                       source_type / decision_state / Git-friendly · portable
```

- **同步落点**：`20_INTEGRATION/S00-03_技术决策包.md`（§V.2 总表 + §V.3 + §V.4 + 新增 §V.11 校正登记）、`20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md`（§Y.4 + 新增 §Y.7 校正登记）、`docs/CHANGELOG.md`（本条目）、`.learnbuddy/memory/`。
- 🔴 **`TQ03` / `TQ04` / `TQ05` 推荐保持不变**（Configurable LLM 组合 / `R-A` / Vercel Target + Deployment Acceptance Deferred）。

### 修正 3｜`docs/07_TECH_ARCHITECTURE.md` 的 `D-057` 当前有效口径

- `docs/07_TECH_ARCHITECTURE.md` 中 **`D-057` 之前**的历史判断（`SP-06` 浏览器 / Vercel 人工观测未完成 ⇒「不得据此冻结架构」）**原文一字未删、未改写**，**追加** `CURRENT EFFECTIVE PROCESS DISPOSITION`：
  - 🔴 **7 项 `PENDING MANUAL OBSERVATION` 仍然 `PENDING`，不得伪造 `PASS`**；
  - **`DEPLOYMENT / BROWSER MANUAL ACCEPTANCE = DEFERRED TO PRE-SUBMISSION`**；
  - ⇒ 这些未完成事实**不再作为 `Gate B` / `Gate C` / 正式 Coding 的硬阻塞项**；
  - 🔴 旧「不得据此冻结架构」的 **Gate 时序结论**标记为 **`SUPERSEDED FOR GATE TIMING BY D-057`**；
  - 🔴 **只 supersede「Gate timing / blocking」**；**不 supersede**「尚未验证」「不得宣称 Vercel 已验证」「不得宣称 Local-first 已完成浏览器验收」等事实。
- **落点**：`docs/07_TECH_ARCHITECTURE.md`（§5.3 就地补注 + §5.13 就地补注 + **新增 §5.14 `CURRENT EFFECTIVE PROCESS DISPOSITION（D-057）`**）。

### 本次修正的不变项（🔴 逐项）

`D-053`–`D-057` 不变｜`TQ01`–`TQ05` **仍全部未 `CONFIRM`**｜Shared Contract **仍 `v0.2.7 DRAFT`**（🔴 未推进至 `v0.3`）｜`SP-06` **历史状态不变**（`CONDITIONAL PASS` + 7 项 `PENDING MANUAL OBSERVATION`）｜`PSA-*` **全部仍 `PENDING`**｜🔴 **未进入 Gate C**｜🔴 **未写正式产品代码**。

## 2026-09-24 — S00-03 / `D-057` 落盘（`SP-06` 部署验证与浏览器人工验收延期至提交前）+ TQ01–TQ05 Gate B 最终裁决包

本次为**人工流程决策落盘（Process Decision Landing）+ Gate B 最终裁决包形成**。🔴 **不写正式业务代码、不部署、不创建或删除任何外部资源、不 `CONFIRM` 任何 `TQ`、不进入 Gate C。**

- **人工决策来源（项目负责人口径）**：「**部署问题后面再说，当前优先尽快完成 Gate B，进入开发阶段。**」⇒ 新增 **`D-057`｜`SP-06` 部署验证与真实浏览器人工验收延期至提交前（Deployment Validation Deferral）**，**状态 = `CONFIRMED`**（`docs/DECISIONS.md`，编号续接 `D-056` 之后）。🔴 **未重用任何编号**。
- **`D-057` 的核心结论（三项）**：① `SP-06` 剩余「Vercel 部署验证」+「真实浏览器目录权限生命周期人工观测」**不再作为 `Gate B` / `Gate C` / 正式开发启动的硬阻塞项**；② 它们**仍是 `PRE-SUBMISSION ACCEPTANCE` 的必做项**；③ 允许序列 = **`Gate B` → `Gate C` → `Coding` →（开发后 / 提交前）Vercel Preview Deployment + Chrome / Edge 真实 Workspace 验收**。
- 🔴 **不得改写 `SP-06` 历史事实（逐条登记）**：`SP-06` 历史执行状态**仍为 `CONDITIONAL PASS`**（描述性历史汇总，🔴 **未改为 `PASS`**）；**7 项 `PENDING MANUAL OBSERVATION`（`S6-01` / `04` / `05` / `06` / `08` / `09` / `10`）一条都未标 `PASS`**、**未删除**、**未伪造观测**；`S6-18` / `S6-19` 的 Vercel 侧未验证登记保留。**只追加** `CURRENT PROCESS DISPOSITION`：`CORE ARCHITECTURE EVIDENCE = SUFFICIENT TO PROCEED TO GATE B`／`DEPLOYMENT / BROWSER MANUAL ACCEPTANCE = DEFERRED TO PRE-SUBMISSION`。
- **File System fallback = 本轮不触发（`NO DECISION REQUIRED`）**：依据 = `SP-06` 已实测 Chrome `154.0.8037.57` / Edge `153.0.4234.48` 均 `isSecureContext = true` + `showDirectoryPicker` 存在，且 Node / 文件系统层 read / write / update / reopen 有正向证据。**仅在** F1（Vercel HTTPS + 目标浏览器无法打开 picker）/ F2（真实浏览器无法完成 read + create + update）/ F3（正常刷新后无法通过恢复 / 重新授权继续工作）/ F4（比赛现场无法保证至少一个已验证浏览器）之一出现时，才升级 **`DECISION REQUIRED｜File System Fallback`**。🔴 **当前不新建** `Folder Import` / `ZIP Import·Export` / `File Upload` / `Local Companion Runtime` 的任何 Decision。
- **`Decision` vs `Acceptance` 分离**：`Gate B` 的问题是「是否已有足够证据冻结 V1 技术架构、让开发开始」，不是「是否已完成全部最终部署验收」⇒ 🔴 **不得因为 Vercel 尚未部署就阻止 `TQ02` / `TQ03` / `TQ04` 进入最终 Gate B**；`TQ05` 允许「目标平台与部署形态确认，最终部署验收后置」。
- **新增 `20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md`**（**状态 = `PLANNED` / `NOT EXECUTED`**）：**`PSA-01`–`PSA-13`**（Vercel HTTPS 页面可打开 / HTTPS 下唤起 Workspace folder picker / Chrome 真实目录授权 / 真实读取 / 真实创建文件并磁盘可见 / 真实修改并落盘 / 刷新后 Workspace 恢复或重新授权 / 关闭浏览器再打开后的恢复 / 撤销权限后不得绕过 / 重新授权后可恢复工作 / Vercel 不保存整个 Workspace / Thin Proxy 仅用于 registered provider adapter / Vercel 免费或当前可接受方式满足演示）+ 最终 Demo URL / Chrome / Edge / LLM provider / Credential leak / Workspace upload / Vercel billing 核对位。🔴 **全部 `PENDING`，现在不执行**。
- 🔴 **`PSA-*` 不是产品 `AC`**：**不写入、不污染 `AC-01`–`AC-162`**；**`AC` 统一口径（2026-09-24 校正后）= 连续 canonical `AC` 162 项（`AC-01`–`AC-162`）＋ 独立 `AC-Q06` 6 项（`AC-Q06-1`–`AC-Q06-6`）＝ 全部有效验收点 168**；🔴 **不再使用旧写法「`AC` 有效总数 = 162（…+6）」**（算术矛盾）；🔴 **未重编号、未并入、未新增任何 `AC`**；`PSA-*` 属 **Release / Submission Acceptance Checklist**；`docs/09_TEST_PLAN.md` 新增 **D-057 护栏节**（**新增 `AC` = 0**）。
- **形成 Gate B 最终裁决包（🔴 全部仍为 `PROPOSED`，未 `CONFIRM`）**：落盘 = `20_INTEGRATION/S00-03_技术决策包.md` **新增 §V**、`20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md` **新增 §Y**。五项推荐：
  - **`TQ01-FINAL`** = **Browser-heavy Local-first Web App + Optional Thin Server Layer**（🔴 **这**才是 `TQ01` 的人工 Decision；**TypeScript end-to-end 仅为 TECHNICAL DEFAULT / 实现参数，不属于人工 Decision 核心结论、不生成 `Decision ID`**；框架 / 状态库 / 路由 / 组件库同为实现参数）；
  - **`TQ02-FINAL`** = **Local Workspace Files + No required cloud database**（🔴 **这**才是 `TQ02` 的人工 Decision 粒度；**Markdown + JSON / sidecar metadata 仅为 TECHNICAL DEFAULT / 实现参数，不是新的人工 Decision**；**物理文件 schema（front-matter / sidecar JSON / 目录名 / 文件名 / schema 细节）由实现层 / Integrator 收敛，🔴 不得在 Gate B Landing 时锁成不可变产品 Decision**，但**必须继续满足** human-readable / stable ID / `EvidenceRef` / `archive_state` / generation batch / `source_type` / `decision_state` / Git-friendly·portable 等已确认约束；**PostgreSQL 不作为 V1 required dependency**，口径 = `SUPERSEDED BY D-053 FOR V1 PRIMARY PERSISTENCE`，🔴 **不是技术失败**）；
  - **`TQ03-FINAL`** = Configurable LLM + Provider Abstraction + Provider-dependent Hybrid + Session-only Credential + **registered-provider Thin Proxy only**（Custom `Base URL` = `Browser Direct Only`；🔴 **无通用 URL Proxy、无 Remember Key、不持久化 Credential**）；
  - **`TQ04-FINAL`** = **`R-A`**（Structured Field Rules + 必要时 LLM 维度级离散三态判定；🔴 **无 Vector DB / 无 embedding 准入 / 无数值相似度**）；
  - **`TQ05-FINAL`** = Local Development + Vercel Demo / Review Deployment Target + Local Workspace 持久化 + **部署验收后置至提交前**。
- **证据就绪度（🔴 不隐藏）**：`TQ01` = `EVIDENCE PARTIAL`（**真实 browser FSA UX 仍待 pre-submission，但不再阻塞 coding**）｜`TQ02` = `EVIDENCE READY`｜`TQ03` = `EVIDENCE READY`｜`TQ04` = `EVIDENCE READY`｜`TQ05` = Target 决策可定 + Deployment Acceptance deferred。🔴 **`SP-06` 尚有 7 项人工观测未完成，此事实被显式登记，未被掩盖**。
- **Gate B 总确认请求 = 一次性**：输出 **【GATE B FINAL HUMAN CONFIRMATION】**，只请求项目负责人**一次总确认**（A｜确认以上全部 Gate B 决策／B｜有修改后再确认）；🔴 **不逐项重复询问 5 次**；🔴 **不提供"部分自动确认"的默认操作**。
- 🔴 **本轮边界（逐项确认未执行）**：**未把 `TQ01`–`TQ05` 写成 `CONFIRMED`**｜**未进入 Gate C**｜**未写正式产品代码 / 未创建 `src/`**｜**未部署 / 未创建 Vercel Project**｜**未创建或删除任何云资源**（腾讯云与 Vercel 均无）｜**未创建 `R1` / `R3`、未删除 `R2` / `R6-A` / `R6-B` / `R6-C`**｜**未恢复 `SP-01a`**｜**未实现 PDF RAG / Literature RAG / embedding / Vector DB / paper knowledge base**｜**未改写** `SP-03` / `SP-03R` / `SP-06` raw evidence / Worker `01`–`05` 产出 / `SP-01a_*` 文档｜**未直接推进契约至 `v0.3`**（契约仍 = **`v0.2.7 DRAFT`**，🔴 未冻结、不可作实现依据）。
- **标志位**：`BLOCKER` = **`NO`**｜`CCR` = **`NO`**（未处理 CCR = 0）｜`PRODUCT SEMANTIC CONFLICT` = **`NO`**｜`NEW DECISION REQUIRED` = **除 Gate B 一次总确认外 = 无**｜`BILLING AUTH REQUIRED` = **`NO`**（费用 0 元）｜`MANUAL AUTH REQUIRED` = **`YES`**（Vercel 部署，已后置至提交前）｜`MANUAL OBSERVATION PENDING` = **`YES`（7 项，已后置至提交前）**｜`PROCESS DEVIATION` = **`YES`（历史：`R2` 提前手工创建；🔴 不得隐去）**｜`RESOURCE CHANGE REQUIRED` = **`RESOLVED`**（🔴 历史两次 `YES` 保留）｜`DEPLOYMENT TARGET ISSUE` = **`NO`（保留）**｜**`SP-06 TEMP RESOURCE CLEANUP` = `NOT APPLICABLE`**（未创建任何外部资源）。
- **阶段状态**：**`S00-03` = 已启动 / 未关闭**；**编码未开始**；**契约 = `v0.2.7 DRAFT`（未冻结）**；**`TQ01`–`TQ05` = 全部 `PROPOSED`，等 Gate B 一次总确认**；**`SP-06` = `CONDITIONAL PASS`（历史）+ `DEFERRED ACCEPTANCE = PRE-SUBMISSION`（当前流程处置）**。
- **落盘文件**：`docs/DECISIONS.md`（**新增 `D-057`** + 编号空间登记 + S00-03 章节追加登记）；`docs/09_TEST_PLAN.md`（**新增 D-057 护栏节；🔴 新增 `AC` = 0**）；`20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md`（**新增**）；`20_INTEGRATION/S00-03_技术决策包.md`（**新增 §V**）；`20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md`（**新增 §Y**）；`30_SPIKES/local_first/SP-06/SP-06_EXECUTION_REPORT.md`（**仅追加 `CURRENT PROCESS DISPOSITION`，A–Q 原文一字未改**）；`docs/CHANGELOG.md`（本条目）；`.learnbuddy/memory/`。
- **下一人工动作（唯一）**：在 **【GATE B FINAL HUMAN CONFIRMATION】** 中选择 **A｜确认以上全部 Gate B 决策** 或 **B｜有修改后再确认**。🔴 **收到 A 之前不得把 `TQ01`–`TQ05` 写成 `CONFIRMED`、不得进入 Gate C、不得写正式产品代码。**

## 2026-09-24 — S00-03 / `SP-06` 执行（Local-first Browser Workspace & Vercel Feasibility）· `CONDITIONAL PASS`

本次为**已获人工批准的 P0 技术 Spike 执行（Phase B）**，**不写正式业务代码、不部署、不创建或删除任何外部资源**。

- **执行授权**：项目负责人已明确 `SP-06 APPROVED FOR EXECUTION`（本轮），🔴 **未再次申请批准**；🔴 **未删除任何测试项、未降低任何 PASS 标准**（严格执行 `S6-01` – `S6-20`）。
- **整体状态 = 🔴 `CONDITIONAL PASS`**（描述性汇总）：`PASS` **7 项**（`S6-11` / `13` / `14` / `15` / `16` / `17` / `20`）＋ `PARTIAL` **6 项**（`S6-02` / `03` / `07` / `12` ＋ 结果记录制 `S6-18` / `19`）＋ `PENDING MANUAL OBSERVATION` **7 项**（`S6-01` / `04` / `05` / `06` / `08` / `09` / `10`）＋ `FAIL` **0 项**。
- **环境（实测）**：Windows / Node `v22.22.2` / **Chrome `154.0.8037.57`** / **Edge `153.0.4234.48`**；🔴 **本机无任何模型 API 凭据**（⇒ 无真实 LLM 调用）；🔴 **无 Vercel CLI / 无 Vercel 登录态**。
- **已实测通过的关键结论（🔴 全部来自实际探针观测，非文档推断）**：
  - **浏览器能力**：Chrome 与 Edge **均**满足 `isSecureContext = true`、`showDirectoryPicker` 存在、FSA 相关接口齐备（🔴 但原生 picker 交互需人工）；
  - **本地文件持久化（Node / 文件系统层）**：read / write / update / reopen / parse 全部通过；**stable ID 存于文件内容**；🔴 **文件改名后 `EvidenceRef` 仍按 ID 解析成功**（改名实验：引用条数不变、全部 resolved、`content_item_id` 一致）；
  - **异常路径**：损坏文件（非法 JSON / 截断 Markdown）⇒ **不崩溃 + 精确定位到具体文件 + 其余文件全部保留**；目录不可访问 ⇒ `WORKSPACE_UNAVAILABLE` **不崩溃且可恢复**；
  - **Structured Experience RAG（无数据库）**：⑥⑦⑧⑨⑩ **五环全部产出**，`EvidenceRef` **全部按 ID 解析成功**；corpus 准入正确排除 **6 条 `Draft` + 5 条 `archived`**；🔴 **全程无数值相似度**（检索 / 比较 / Context Pack 三层断言）；
  - **20 / 100 条规模**：`n_retrieval = 16 / 57`；耗时（5 次中位数，local 阶段）：scan `0.38 / 0.44 ms`、parse `107.6 / 421.9 ms`、retrieval `0.65 / 1.56 ms`、context build `0.30 / 0.15 ms`；🔴 **`llm_network_ms = NOT_EXECUTED`（严格与 local 阶段分离）**；🔴 **只记录耗时，不构成性能结论**；
  - **`R-A` 可行性**：Level A 投影 + **三态可区分**（`matched` / `compared_not_matched` / `uncompared`）；`D-050` 用例（`缩短干燥时间`≡`缩短干燥时长` = `matched`；`50°C`≡`50 摄氏度` = `matched`；`出现明显开裂` vs `无明显开裂` = `compared_not_matched`；任一侧 `unknown` = `uncompared`）**全部符合预期**；**`D-052` 负例**（`提高热风温度` vs `提高送风温度`）= **`compared_not_matched`** ✅；🔴 **未引入 embedding、未切换 `R-B` / `R-C`**；
  - **Configurable Provider（`S6-17`）**：**5 个 provider 仅改配置**即正确分流（`BROWSER_DIRECT` ×2 / `VERCEL_THIN_PROXY` ×1 / `UNSUPPORTED` ×2），**切换 provider 不需改代码**；🔴 **unsupported 项全部明确失败**（`Provider connection unsupported under current browser constraints`），**无静默 proxy 回退**；
  - **CORS 真实观测（`S6-18`，跨源设置）**：页面 origin `127.0.0.1:8787` vs mock Provider origin `127.0.0.1:8788` ⇒ ① **有 CORS 的 Provider 直连成功（200）**；② 🔴 **无 CORS 的 Provider 直连被浏览器拦截（`TypeError: Failed to fetch`）** —— 这是"Browser Direct 不可行"的**实证**；③ **Thin Proxy 路径成功**且 `resolved_by = provider_id → registered adapter → fixed host`；
  - **SSRF / Open Proxy 边界（`S6-29`）**：**8/8 用例通过**；`target_url` 被**完全忽略**（`target_url_followed = false`）；**SSRF 哨兵命中总数 = 0**；未注册 `provider_id` ⇒ **400**；无 `provider_id` ⇒ **400**；通用代理端点 `/api/proxy-any` ⇒ **404**；guard 默认语义下 `localhost` / `127.0.0.1` / `::1` / RFC1918 / `169.254.169.254` / `file:` / `gopher:` / 未列入 allowlist 的 host **全部 `BLOCKED`**；
  - **凭据（`D-056`）**：`sessionStorage` 写入 → **刷新后仍可用**（`present_after_reload = true`，符合"会话级、非刷新即失效"）；**`localStorage` / `IndexedDB` / `document.cookie` / `caches` 全部未发现标记串**（`durable_leak_found = false`）；**服务端日志 `credential_plaintext_in_log = false`**（`entries_carrying_authorization_value = 0`）；清除后 `present_after = false`；
  - **无 PostgreSQL 跑通 `D9`（`S6-20`）**：①→⑩ **十步全部可执行**，⑤ 为**真实磁盘写入**（`ws_live/attempts/ATT-LIVE-0001.md`），`required_database = NONE`。
- 🔴 **未执行 / 未验证项（必须记账）**：
  - 🔴 **`S6-01`（Vercel HTTPS 域名下能否唤起 folder picker）= `PENDING MANUAL OBSERVATION`** —— **本轮未创建任何 Vercel 资源**（无 CLI / 无登录态）⇒ 已交付 `MANUAL AUTH REQUIRED` 最短步骤；
  - 🔴 **`S6-04` / `S6-05` / `S6-06`（真实浏览器读写本地目录）= `PENDING MANUAL OBSERVATION`** —— File System Access API 的目录选择必须由**真实用户手势**触发，会弹出系统原生 picker，🔴 **无法自动化、不得伪造 PASS**；
  - 🔴 **`S6-08` / `S6-09`（handle / permission 跨刷新、跨重启）= `PENDING MANUAL OBSERVATION`**；**`S6-10`（撤销权限）** 同；
  - 🔴 **Vercel 侧的 `S6-18` / `S6-19` 证据 = 无**（未部署）。
- ⚠️ **🔴 TEST SPEC GAP（必须记账，🔴 不得用临时发明的阈值掩盖）**：
  - **GAP-1**：`SP-06 Plan` **只定义逐项判定口径**，🔴 **未定义整体 `PASS` / `CONDITIONAL PASS` / `FAIL` / `INCONCLUSIVE` 的阈值或判定规则** ⇒ 本轮**不发明整体阈值**；`CONDITIONAL PASS` **仅作为描述性汇总**（= 已执行项全部 PASS + 明确列出未执行 / 未验证项），**并提请项目负责人裁定整体判据**；
  - **GAP-2**：`Plan` §Q.4 的 File System fallback **升级条件**（"影响比赛演示的兼容性问题"）**未定义为可操作判据**（无阈值、无场景清单）⇒ 本轮**不升级 fallback**，**不改 `D-053` 的"暂不自动决定"口径**；
  - **建议补齐项**：整体状态判据（哪些项属整体结论硬前置）／fallback 升级判据／性能记录口径。
- 🔴 **`SP-06` 不 `CONFIRM` 任何 `TQ`**：`TQ01` = `PROPOSED / EVIDENCE PARTIAL`；`TQ02` = `PROPOSED / EVIDENCE READY FOR GATE B`；`TQ03` = `PROPOSED / EVIDENCE READY FOR GATE B`（**两个子项已由 `D-055` / `D-056` 裁决 ≠ `TQ03` 已裁决**）；`TQ04` = `PROPOSED R-A / EVIDENCE READY FOR GATE B`；`TQ05` = `PROPOSED / EVIDENCE INSUFFICIENT`（Vercel 侧零证据）。
- **落盘文件**：
  - **新增** `30_SPIKES/local_first/SP-06/SP-06_EXECUTION_REPORT.md`（**A–Q 共 17 节**：Scope / Environment / `D-055`·`D-056` Applied Rules / S6-01–S6-20 Matrix / Raw Observations / Browser Compatibility / Local File Persistence / Structured Experience RAG / Performance / Hybrid LLM Path / Credential Security / SSRF·Proxy Boundary / Vercel Findings / `D9` Feasibility / Gate B Implications / Limitations / Exception Report）；
  - **新增** `30_SPIKES/local_first/SP-06/MANUAL_OBSERVATION_CHECKLIST.md`（7 项人工观测的逐步操作 + 回报模板 + Vercel `MANUAL AUTH REQUIRED` 最短路径）；
  - **新增** `30_SPIKES/local_first/SP-06/README.md`；
  - **新增探针产物**（全部 `DISPOSABLE / NON-PRODUCTION`）：`fixture/`（`ws20` / `ws100` / `ws_bad` / `ws_live`，逐条标 `TEST FIXTURE / NOT PRODUCT DATA`）、`probe/`（`index.html` / `app.js` / `server.mjs`）、`tools/`（`lib_workspace` / `gen_fixture` / `run_spike` / `ssrf_probe` / `provider_adapter_probe` / `cdp_probe`）、`results/`（`raw-results.json` / `performance.csv` / `ssrf-results.json` / `provider-adapter-results.json` / `cdp-chrome.json` / `cdp-edge.json`）、`screenshots/`（Chrome / Edge 探针页实拍）；
  - `docs/CHANGELOG.md`（本条目）；`20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md`（**新增 §X**，仅登记实测证据与状态，🔴 **不 `CONFIRM` `TQ`**）；`.learnbuddy/memory/`。
- 🔴 **未创建 `src/`、未写正式产品代码、未部署、未进入 Gate B / Gate C、未 `CONFIRM` `TQ01`–`TQ05`、未引入数据库 / embedding / Vector DB**。
- 🔴 **`SP-06 TEMP RESOURCE CLEANUP` = `NOT APPLICABLE`**（本轮**未创建任何 Vercel 或其它外部资源**）。
- 🔴 **`Legacy Cloud Cleanup` = `DEFERRED` / `NOT AUTHORIZED FOR EXECUTION`**（项目负责人明确推迟）：本轮 **`DELETED RESOURCES = NONE`**、**`CREATED CLOUD RESOURCES = NONE`**；🔴 `R2` / `R6-A` / `R6-B` / `R6-C` 的实际云状态**未修改**；🔴 **未创建 `R3` / `R1`**；🔴 **未重启 `SP-01a`**；🔴 **未把 `Legacy Cleanup Plan` 改标为"已批准"**。
- **费用**：**0 元**（未创建任何付费资源；🔴 **未触发 `BILLING AUTH REQUIRED`**）。
- **标志位**：`BLOCKER` = **`NO`**｜`CCR` = **`NO`**（未处理 CCR = 0）｜`PRODUCT SEMANTIC CONFLICT` = **`NO`**｜`DECISION REQUIRED` = **`0`（新增）**｜`BILLING AUTH REQUIRED` = **`NO`**｜`MANUAL AUTH REQUIRED` = **`YES`**（Vercel 部署）｜`MANUAL OBSERVATION PENDING` = **`YES`（7 项）**｜`DEPLOYMENT TARGET ISSUE` = **`NO`（保留）**｜`PROCESS DEVIATION` = **`YES`（历史：`R2` 提前手工创建；🔴 不得隐去）**｜`RESOURCE CHANGE REQUIRED` = **`RESOLVED`**（🔴 历史两次 `YES` 保留）。
- **阶段状态**：**`S00-03` = 已启动 / 未关闭**；**编码未开始**；**契约 = `v0.2.7 DRAFT`（未冻结、不可作实现依据）**；**`SP-06` = 已执行（`CONDITIONAL PASS`）/ 7 项待人工观测**。
- **下一人工动作**：① 完成 `MANUAL_OBSERVATION_CHECKLIST.md` 的 7 项观测并回报；② （可选）Vercel 免费 Preview 部署以补 `S6-01` / Vercel 侧证据；③ 裁定 `TEST SPEC GAP`（整体状态判据 / fallback 升级判据）。

## 2026-09-24 — S00-03 / `D-055` + `D-056` 落盘（LLM 请求路径 + 凭据持久化；契约 `v0.2.6` → `v0.2.7 DRAFT`）

本次为**人工架构决策落盘（Phase A）**，**不写正式业务代码、不部署、不创建或删除任何云资源**。

- **状态核验结果 = `PASS`（无 `STATE DRIFT`）**：Prompt 所列预期状态（`D-053` / `D-054` = `CONFIRMED`；Shared Contract = `v0.2.6 DRAFT`；Test Plan 当前最大编号 = `AC-143`；`SP-06` = `PLAN EXISTS` / `NOT EXECUTED`；`TQ03` = `DECISION REQUIRED`（`DR-03` / `DR-04`）；Legacy Cloud Cleanup = 未执行）**逐项与仓库已落盘事实一致**。
- 🚩 **新增人工架构决策 `D-055`（`CONFIRMED`）｜LLM 请求网络路径 = `Provider-dependent Hybrid`**（人工选择 **C**；关闭 **`DR-03`**）：
  - 🔴 **路径由 `Provider Adapter Capability` 决定，不由用户每次手工选择 `direct` / `proxy`**；
  - **`Browser Direct`**：适用条件 = ① Browser CORS 可用 ② Browser API 调用被官方支持 / 技术上稳定 ③ 用户自己的 Credential 可直接用于该 Provider ④ **不需要产品服务器隐藏固定 server secret** ⑤ 不引入不可接受安全问题；**路径 = `Browser → LLM Provider`**；🔴 **不得额外经过 Vercel Proxy**（除非 adapter 被显式配置为 Proxy path）；
  - **`Vercel Thin Proxy`**：仅当该内置 Provider 的 Browser Direct 不可行 / CORS·API 形态要求服务端调用；**路径 = `Browser → Vercel Thin Proxy → Known LLM Provider`**；🔴 **必须保持 `THIN`** —— ✅ **只允许** request normalization / provider adapter forwarding / response normalization / timeout·error mapping / 必要的 schema transport；🔴 **不得承担** Workspace / `Attempt` / `Insight` / `Hypothesis` 持久化，🔴 **不得存在** Experience database / Cloud user database；
  - 🔴 **Custom / OpenAI-compatible / 用户自定义 `Base URL` = `Browser Direct Only`**；🔴 **禁止 `Generic Arbitrary URL Proxy`**；🔴 **不得设计成 `Browser → Vercel → 用户任意 URL`**；🔴 **Proxy 不得接受 client 提交的任意 `target_url` / `base_url` / `host` / `scheme` 并据其代请求**（防 SSRF / Open Proxy / 云 metadata endpoint / 内网探测 / `localhost`·RFC1918 转发 / 协议滥用）；
  - 🔴 **安全 Proxy 的唯一形态** = `provider_id → 服务器端已注册 Adapter → 固定 / 严格受控 Provider Host`；**不得** `provider_id` + 任意 `target URL`；🔴 **不允许**用户通过请求参数修改 Proxy 最终目标 host；
  - 🔴 **不可用 Provider 必须明确失败**（表达 `Provider connection unsupported under current browser constraints` 之含义）；🔴 **不得偷偷走通用 Vercel Proxy**；🔴 **不得为"支持所有 Provider"降低 SSRF / Proxy 安全边界**；
  - 🔴 **V1 不为任何 Provider 预置服务端固定 Key**（由适用条件 + `D-056` 共同推出；**解释闭合，不新增机制**）；Proxy 只是传输通道，**不是 Key 持有方**。
- 🚩 **新增人工架构决策 `D-056`（`CONFIRMED`）｜LLM 凭据持久化 = `Session-only Credential`**（人工选择 **A**；关闭 **`DR-04`**）：
  - **V1 不长期保存 API Key**；✅ **允许** session-scoped browser storage 或**等价的当前浏览器会话级 `Credential Store`**；
  - **目标行为** = 用户输入 API Key → **当前会话可用** → **页面刷新后可继续当前会话** → **标签页 / 浏览器会话结束后清除**；**技术实现**可使用 `sessionStorage` 或等价 session-scoped abstraction；🟢 **口径澄清：边界在"会话结束"，不在"页面刷新"**（**不是"刷新即失效"**）；
  - 🔴 **禁止的存储位置（逐项）**：`localStorage` / `IndexedDB` / Workspace file / Git / Vercel KV / Vercel DB / Cloud DB / server filesystem / **permanent cookie**；
  - 🔴 **传输**：`Browser Direct` ⇒ Credential 只从 `Browser → User-selected Provider`，🔴 **不得额外发送给 Vercel**；`Proxy` ⇒ `Browser → Thin Proxy → Known Provider`，**仅允许当前请求生命周期内使用**；🔴 **Proxy 不得持久化 Credential**（不写 DB / 文件 / KV / cache / durable log）；
  - 🔴 **日志红线**：`Authorization` / API Key / 完整 request body 中的 secret **不得**进入 Vercel logs / application logs / error logs / analytics / 浏览器 console；**必须脱敏**（`REDACTED` / 掩码 / hash）；
  - 🔴 **不得自行增加**「记住我」/「`Remember Key`」/「永久保存 Credential」开关；**未来如需要必须另行 Decision**；🟠 **有意的 V1 Security Trade-off**。
- **与 Pivot 文档 `PROPOSED` 推荐的差异（🔴 记账）**：`DR-03` 与 §L / §U 的推荐**方向一致**，但人工裁决**显著加强**了自定义 `base_url` 的安全边界（原 §L.3 的"降级路径（放弃任意 `base_url`）"**已以更强形式固化**）；`DR-04` **与原推荐 `K-A` 默认 + `K-B` 可选的形态有实质差异** —— 人工裁决**删除了 `K-B` 分支**，并**澄清 `K-A` 的边界在"会话"而非"刷新"**。🔴 **§L / §U 原文保留不改写**；🔴 **不得再以 §L / §U 的推荐作为实现依据**。
- **落盘文件（Phase A）**：
  - `docs/DECISIONS.md`（**新增 `D-055` / `D-056`**；编号空间列举 + S00-03 章节追加登记同步）；
  - `docs/09_TEST_PLAN.md`（**顺延新增 `AC-144`–`AC-162`，共 19 项**；未重排 `AC-01`–`AC-143`）；
  - `docs/06_AI_CAPABILITIES.md`（**新增《S00-03 决策同步（2026-09-24，`CONFIRMED`：`D-055` / `D-056`）》**；各能力调用路径边界 + 凭据边界；原「`DECISION REQUIRED` 2 项」行加就地补注）；
  - `docs/07_TECH_ARCHITECTURE.md`（**§5.5** 两处就地补注；**新增 §5.12**《LLM 接入边界》含 §5.12.1–§5.12.4）；
  - `docs/08_UI_SPEC.md`（**新增《S00-03 决策同步（2026-09-24，`CONFIRMED`：`D-055` / `D-056`，仅界面约束）》**：`Model Settings` 8 条约束 + `D9` 关系 + 表述红线；原 `Model Settings` 行加就地补注）；
  - `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（**`v0.2.6` → `v0.2.7 DRAFT / D-055 Hybrid LLM Path + D-056 Session-only Credential 对齐版`**：文件头 + 依据来源 + **v0.2.7 说明块** + **§0.4 新增 D 节** + §0.4 C 节就地补注 + **§13.7 更新** + §14 第 4 条 + §14.1 + §15 新增行）；
  - `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md`（**§U.1 就地补注 + 新增 §W《`D-055` / `D-056` Landing》**，含 W.4 与 §L / §U 的差异记账）；
  - `20_INTEGRATION/S00-03_技术决策包.md`（**新增 §U《POST-INTEGRATOR 人工决策落盘｜`DR-03` / `DR-04`》**）；
  - `.learnbuddy/memory/`（`MEMORY.md` 钩子层 + `DECISION_INDEX.md` + 当日日志）。
- **`AC` 口径**：**原最大 canonical `AC` = `AC-143`**；**顺延新增 `AC-144`–`AC-162`（19 项：`D-055` 9 项 + `D-056` 10 项）**；🔴 **未重排任何旧 `AC`**；**新 `AC` 有效总数 = 162**（`AC-01`–`AC-162` 连续 162 项 + `AC-Q06-1`–`AC-Q06-6` 6 项；唯一动态来源 = `docs/09_TEST_PLAN.md`）。
  - 🔴 **就地补注（2026-09-24，GATE-B PRE-CONFIRM CORRECTION；按「不改写历史」保留上方原文）**：上方「**新 `AC` 有效总数 = 162（`AC-01`–`AC-162` + `AC-Q06-1`–`6`）**」**含算术矛盾** ⇒ **当前统一口径 = 连续 canonical `AC` 162 项 ＋ 独立 `AC-Q06` 6 项 ＝ 全部有效验收点 168**；🔴 **本次只修正统计口径表述，未重编号 / 未并入 / 未新增任何 `AC`**；🔴 **历史正确事实「`S03-E` 当时 115 + 6 = 121」不改**。
- **标志位（Phase A）**：`BLOCKER` = **`NO`**｜`CCR` = **`NO`**（**未处理 CCR = 0**；`D-055` / `D-056` 属人工架构决策落盘，**不是 CCR**）｜`PRODUCT SEMANTIC CONFLICT` = **`NO`**｜`RESOURCE CHANGE REQUIRED` = **`RESOLVED`**（🔴 **历史两次 `YES` 保留**；本轮**无新增未处理项**）｜`BILLING CHANGE REQUIRED` = **`NO`**｜`DECISION REQUIRED` = **`0`**（原 2 项已关闭）｜`PROCESS DEVIATION` = **`YES`**（`R2` 提前手工创建；**不得隐去**）｜`DEPLOYMENT TARGET ISSUE` = **`NO`**。
- 🔴 **`Legacy Cloud Cleanup` = `DEFERRED` / `NOT AUTHORIZED FOR EXECUTION`**（项目负责人明确推迟）：**本轮未删除任何腾讯云资源**（`R2` / `R6-A` / `R6-B` / `R6-C`（若实际存在） 全部未动）；🔴 **未创建 `R3` / `R1`**；🔴 **未重启 `SP-01a`**；🔴 **未把 `Legacy Cleanup Plan` 改标为"已批准"**。
- **阶段状态**：**`S00-03` = 已启动 / 未关闭**；**编码未开始**；**契约 = `v0.2.7 DRAFT`（未冻结、不可作实现依据）**；**`D-055` / `D-056` = `CONFIRMED` 且已 Landing**。

## 2026-09-24 — S00-03 / LOCAL-FIRST PIVOT + STRUCTURED EXPERIENCE RAG 落盘（`D-053` / `D-054`；契约 `v0.2.5` → `v0.2.6 DRAFT`）

本次为**重大人工架构决策落盘 + Gate B 前技术重新基线**，**不写正式业务代码、不部署、不创建或删除任何云资源、不执行任何 Spike**。

- **状态核验结果 = `PASS`（无 `STATE DRIFT`）**：Prompt 所列 14 项预期状态（`D-051` / `D-052` = `CONFIRMED`；契约 `v0.2.5 DRAFT`；Test Plan 最大编号 `AC-126`；`SP-01a` = `PHASE 2 IN PROGRESS` / `NOT PASS`；`CREATE AUTHORIZATION` = `GIVEN`；`R2` = `CREATED`（上海 / 免费体验版 / 静态托管 `NOT INITIALIZED`）；`R6-A` / `R6-B` = `CREATED`；`R6-C` = `AUTHORIZED` / `IN CONFIGURATION` / `NOT YET CONFIRMED CREATED`；`R3` = `PRE-CREATE`（未创建 / 未计费）；`R1` = `NOT CREATED`；Function URL = `NOT ENABLED`；`30_SPIKES/sp01a_probe/` 存在且标 `DISPOSABLE / NON-PRODUCTION`；`S-01`–`S-07` = `NOT EXECUTED`）**逐项与仓库已落盘事实一致**。
- 🚩 **新增人工架构决策 `D-053`（`CONFIRMED`）｜V1 主架构改为 Local-first Harness-style Web App**：
  - **形态** = **Web UI + Local Workspace Folder + Configurable LLM +（必要时）Thin LLM Access Layer + Vercel Demo / Review Deployment**；
  - **核心原则**：① 用户科研主数据 **Local-first** ② **Workspace canonical = 用户选择的本地目录** ③ **Vercel = Review / Demo Web Deployment Target** ④ **Vercel 不是科研主数据库** ⑤ **V1 不要求云 PostgreSQL** ⑥ **LLM 用户可配置** ⑦ **浏览器只有在用户主动授权后才能访问指定 Workspace**；
  - **Web 的主要目的** = **让比赛评委可以方便打开、查看和体验产品**；**本项目当前不以长期运营 SaaS / 多人在线系统 / 云端科研数据平台作为 V1 目标**；
  - 🔴 **不得写成 `Production SaaS Infrastructure`**；**不得写成"产品主数据存储平台"**；**不得因 Vercel 可部署 Serverless Function 就自动引入云数据库 / 用户账号数据库 / 云端 Workspace / 服务端永久科研数据存储**；
  - 🔴 **是技术承载方式改变，不是重新设计产品** —— `D1`–`D10` / `R1`–`R6` / `D-011`–`D-052` / `ADJ-01` / `Q16` / `D9` 十步 / 对象模型 / `source_type` / `archive` / `Level A·B·C` / `N_检索`·`N_引用` / `History-grounded` **全部不变**。
- 🚩 **新增人工架构决策 `D-054`（`CONFIRMED`）｜V1 RAG 范围 = 仅 Structured Experience RAG**（人工选择**方案 C**）：
  - **V1 只实现** = **基于用户自身历史 `Attempt` 的结构化经验检索 + 证据上下文组装 + Grounded Generation**；**同时预留 `ResearchContextProvider` 扩展接口**；
  - 🔴 **`Structured Experience RAG` 不是新增产品流程**，而是现有 `D9` **⑥⑦⑧⑨⑩** 在技术架构中的正式描述；
  - 🔴 **V1 明确不实现**：PDF 文献 RAG / 论文知识库 / 文献上传 / PDF parser / document chunking / document embedding / 文献向量索引 / 文献检索 UI / 外部科研资料 citation UI / **Research Document RAG**；**未来如需要实现，必须重新进入 `Scope` / `Decision`**；
  - 🔴 **`RAG ≠ Vector RAG`** —— **不引入** Pinecone / Milvus / Weaviate / Chroma / pgvector / Elasticsearch / Redis Vector / embedding database；**不得用 `cosine similarity score` 替代 `D-050` 的严格 `matched` 语义**；
  - 🔴 **`ResearchContextProvider` 仅预留**（`getContext(query)`），**V1 不实现任何 provider**；**不建立** `references/` / PDF import / PDF parser / chunk store / embedding store / research search / literature citation / paper viewer；**UI 不得出现**「上传论文」「知识库」「文献库」「论文问答」；**不新增** `ResearchDocument` / `Chunk` / `Citation` 实体；**不增加对应 P0 `AC`**；
  - **科研上下文未来分层** = Layer 1 `User Fact` / Layer 2 `Experience Evidence` / **Layer 3 `Research Evidence` = `RESERVED ONLY`** / Layer 4 `Model General Knowledge`；**当前 V1 实际启用 = Layer 1 / 2 / 4**；🔴 即使未来实现 Layer 3，**`Research Evidence` 也不得自动计入 `N_检索` / `History-grounded Hypothesis` / `Experience Asset`**；
  - **`History-grounded Hypothesis` 定义不变**（仍要求**至少一个真实 historical `Formal Attempt` 作为 grounding anchor**）。
- **落盘文件（本轮）**：
  - **新增** `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md`（**A–V 共 22 节**：Current Repository State / D-053 / D-054 / Why Pivot / Old vs New Architecture / Local Workspace Architecture / Persistence Mapping / Structured Experience RAG / Grounding Context Pack / ResearchContextProvider Reserved Boundary / Configurable LLM / Credential·Network Path Analysis / Vercel Demo Architecture / Security·Privacy / Old SP-01a Supersession / Legacy Cloud Cleanup Plan / SP-06 Test Plan / TQ01–TQ05 Rebaseline / Canonical Delta / AC Delta / DECISION REQUIRED / Exception Report）；
  - **新增** `30_SPIKES/local_first/SP-06_LOCAL_FIRST_FEASIBILITY_PLAN.md`（**`PLAN ONLY` / `NOT EXECUTED`**；`S6-01`–`S6-20` 共 20 项测试目标；**`SP-06 EXECUTION APPROVAL REQUIRED`**；🔴 **未创建 `SP-LF-01` 或任何第二套编号**）；
  - `docs/DECISIONS.md`（**新增 `D-053` / `D-054`**；编号空间列举同步）；
  - `docs/07_TECH_ARCHITECTURE.md`（**§1–§4 原文一字未改**，加**就地补注**说明其为 `PRE-D-053` 占位；**新增《S00-03 架构基线（`D-053` / `D-054` 后）》§5.1–§5.11**）；
  - `docs/03_V1_SCOPE.md` / `docs/04_USER_FLOW.md` / `docs/05_DATA_MODEL.md`（**新增 Persistence Mapping**）/ `docs/06_AI_CAPABILITIES.md` / `docs/08_UI_SPEC.md`（**新增 `Workspace Entry` 概念**）—— **均只做追加章节，未改写既有结论**；
  - `docs/09_TEST_PLAN.md`（**顺延新增 `AC-127`–`AC-143`，共 17 项**；未重排 `AC-01`–`AC-126`）；
  - `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（**`v0.2.5` → `v0.2.6 DRAFT / D-053 Local-first + D-054 Structured Experience RAG 对齐版`**：文件头 + **新增 §0.4** + §0.1 时序校正 + §13.1 就地补注 + **新增 §13.7** + §14 第 4 条 + §14.1 + §15 新增行）；
  - `20_INTEGRATION/S00-03_技术决策包.md`（**追加 §T PIVOT 章节**）；
  - `.learnbuddy/memory/`（**`MEMORY.md` 合并去重后重写为钩子层** + `DECISION_INDEX.md` 新增 `C-PIVOT` 段 + `2026-09-24.md` 日志）。
- **`TQ01`–`TQ05` 重新基线（🔴 五项均未 `CONFIRM`）**：`TQ01` = 原 Cloud Serverless / 长驻单体候选空间**不再是主要候选空间**，新问题 = **前端主导 Local-first Web + 是否需要 Thin Server Layer + 具体 Web stack**（框架 / 状态库 / 路由 = **实现参数**）；`TQ02` = **Primary Persistence = Local Workspace Files（`D-053`）**，**原 Managed PostgreSQL 作为 V1 Primary = `SUPERSEDED BY D-053`**（🔴 **不得说 PostgreSQL 技术错误、不得删除历史分析**；正确表述 = 「原方案在 Cloud-centric 架构中合理，但已因人工架构转向不再作为 V1 Primary」）；`TQ03` = 🔴 **仍属 Gate B，未裁决**（见下）；`TQ04` = 🔴 **仍属 Gate B，未裁决**（**`PROPOSED` 推荐仍为 `R-A`**，理由 = 小规模 + 已结构化 + `D-050` 严格准入 + `SP-03R` 规则级正向证据 + embedding 边际收益被产品规则压缩 + Local-first 下 embedding 代价上升）；`TQ05` = Vercel = Demo / Review 入口（**已确认定位**），**可行性待 `SP-06`**。
- 🔴 **`DECISION REQUIRED` = 2 项（本轮新增）**：**【LLM Request Path】**（A `Browser Direct` / B `Vercel Thin Proxy` / C `Provider-dependent Hybrid`；比较 API Key 暴露风险 / CORS / Provider compatibility / Vercel limitations / latency / privacy / 用户配置 UX / 自定义 `base_url` / SSRF·Open Proxy 风险 / Demo 可靠性；**`PROPOSED` 推荐 = C 的收窄形态（默认 A，必要时 B，不预置服务端 Key）**）｜**【Credential Persistence】**（`K-A` memory·session only / `K-B` browser-local persistence / `K-C` 其它；**`PROPOSED` 推荐 = `K-A` 默认 + `K-B` 显式可选，🔴 默认不持久化**）。🔴 **若选 `Vercel Thin Proxy`：必须防护 SSRF / Open Proxy / 内网地址 / metadata endpoint / 协议限制（仅 `https`）/ **host allowlist** / URL validation —— 不得设计成"用户输入任意 URL，Vercel 无条件代请求"。** 🔴 **两项均不代裁**。
- 🚩 **`SP-01a` 的正确处理（🔴 本轮严格修正）**：**状态 = `SUPERSEDED BY D-053` / `INCOMPLETE HISTORICAL SPIKE`** —— 🔴 **不是 `FAIL`**（**架构改变不是探针验证失败**）；🔴 **不得写"`SP-01a` 从未开始"、不得写"未创建任何云资源"**；**历史 Phase 2 事实全部保留**（`R2` / `R6-A` / `R6-B` = `CREATED`；`R6-C` = `AUTHORIZED` / `IN CONFIGURATION` / `NOT YET CONFIRMED CREATED`；`R3` = `PRE-CREATE`；`R1` = `NOT CREATED`；Function URL = `NOT ENABLED`；`R2` Static Hosting = `NOT INITIALIZED`；probe 包已生成；`S-01`–`S-07` = `NOT EXECUTED`）。**立即停止其后续创建链**：🔴 **不得继续创建 `R3` / `R1`、不得启用 Function URL、不得初始化旧 `R2` 静态托管 Probe、不得部署旧 Probe、不得执行旧 `S-01`–`S-07`**。
- 🔴 **遗留云资源本轮**：**未删除任何资源**（`R2` / `R6-A` / `R6-B` / `R6-C`（若实际存在） / 清空任何云环境 —— 全部未动）；**仅生成 `LEGACY CLOUD CLEANUP PLAN`（未执行）**，含资源 / 当前仓库状态 / 是否可能持续计费 / 是否仍有其它用途 / 删除顺序 / 删除前检查项；🔴 **`R6-C` 的第一步 = 先由项目负责人确认其"实际是否存在"**（🔴 **不得假设存在的，也不得假设不存在**）；🔴 **资源清理需要项目负责人另行明确批准，本任务不得自动清理**。
- 🔴 **`SP-01a` probe 历史文件**：`30_SPIKES/sp01a_probe/` **保留，不得删除**；🔴 **不得迁入正式 `src/`**；标记（**只落在本轮新增文档中，`README.md` 本体未修改**）= `HISTORICAL` / `DISPOSABLE` / `NON-PRODUCTION` / `SUPERSEDED BY D-053`；🔴 **不得作为新 Local-first 正式代码**。
- 🔴 **Worker 历史文件保护**：`docs/architecture/01`–`05`（`S03-A`–`S03-E`）**一字未改**，标注为 **`PRE-D-053 HISTORICAL ANALYSIS`**（🔴 **不得删除、不得假装当时已考虑 `D-053`**）；`SP-03` / `SP-03R` **全部保留、一字未改**（**`SP-03R` 的 `R-A` 规则级正向证据在 Local-first 下仍然有效**，🔴 **不得改写为 "Vector RAG test"**）；`SP-01a_CREATE_READY_PACK.md` / `SP-01a_CREATE_READY_PATCH_REPORT.md` / `SP-01a_RESOURCE_DISCLOSURE_PACK.md` **均未删除**（🔴 **本 Pack 本轮一字未改**，其 supersede 只登记在本文件 / 新 Integrator 文档 / 技术决策包）。
- 🚩 **新 Spike 编号 = `SP-06`**（🔴 **未创建 `SP-LF-01`**；`SP-01` 已占用 / `SP-02` 已预留 / `SP-03` 已使用 / `SP-04` 已预留 / `SP-05` 已预留）；**`SP-06｜Local-first Browser Workspace & Vercel Feasibility`**；**本轮只写 Test Plan，未执行**；**Integrator 判断其为 Gate B 前 P0 必须证据 ⇒ 报告中写明 `SP-06 EXECUTION APPROVAL REQUIRED`**，**由项目负责人另行批准**，🔴 **不得自动跑**。
- **Gate B 新时序（旧时序被 `D-053` supersede）**：`D-053 / D-054 Landing → Local-first Architecture Rebaseline → SP-06 Plan → 项目负责人批准 SP-06 → SP-06 → TQ01–TQ05 余项 Gate B → v0.3 DRAFT → Local Landing → Gate C → Coding`；🔴 **不得直接从本轮进入 Coding**。
- **标志位**：`BLOCKER` = **`NO`**｜`CCR` = **`NO`**（**未处理 CCR = 0**；`D-053` / `D-054` 属人工架构决策落盘，**不是 CCR**）｜`PRODUCT SEMANTIC CONFLICT` = **`NO`**｜`RESOURCE CHANGE REQUIRED` = **`RESOLVED`**（🔴 **历史两次 `YES` 保留** = 旧 API Gateway 不可执行 + `R6-C` 新依赖；**本轮无新增未处理项**；🔴 **禁写"从未发生"**）｜`BILLING CHANGE REQUIRED` = **`NO`**｜`DECISION REQUIRED` = **`2`**（LLM Request Path / Credential Persistence）｜`PROCESS DEVIATION` = **`YES`**（`R2` 提前手工创建；**不得隐去、不得改写为"已获创建授权"**）｜`DEPLOYMENT TARGET ISSUE` = **`NO`**（Vercel 尚未部署 / 未测）。
- **`AC` 口径**：**原最大 canonical `AC` = `AC-126`**；**本轮顺延新增 `AC-127`–`AC-143`（17 项：Local-first 12 项 + Structured Experience RAG 5 项）**；🔴 **未重排 `AC-01`–`AC-126`**；**新 `AC` 有效总数 = 143**（`AC-01`–`AC-126` + `AC-Q06-1`–`6` + `AC-127`–`AC-143`；唯一动态来源 = `docs/09_TEST_PLAN.md`）。
  - 🔴 **就地补注（2026-09-24，GATE-B PRE-CONFIRM CORRECTION；按「不改写历史」保留上方原文）**：上方把「连续 canonical 计数」与「含 `AC-Q06` 的有效总数」混用（`126 + 17 = 143` 为**连续 canonical** 计数；若含 `AC-Q06-1`–`6` 则应为 **149**）⇒ **按当前统一口径重述此历史时点 = 连续 canonical `AC` 143 项 ＋ 独立 `AC-Q06` 6 项 ＝ 全部有效验收点 149**；🔴 **该时点的连续计数 `143` 本身是正确历史事实，不改**；🔴 **本次只修正"有效总数"口径表述，未重编号 / 未并入 / 未新增任何 `AC`**。
- ⚠️ **任务边界与文档内流程冲突（🔴 不改文档 + 报告中提示）**：**唯一一处** —— 契约 `v0.2.5` §0.1 与决策包顶部确立的时序（含 `SP-01` 为 `TQ02` / `TQ05` 前置 P0 证据）与本任务要求的新时序不一致 ⇒ **未删除 / 未改写原文本**（保留为历史表述），**以"就地补注"并列登记两套时序并指明当前有效口径**。
- **本轮边界（🔴 逐项确认未执行）**：**未写正式业务代码**（❌）｜**未创建 `src/`**（❌）｜**未部署 Vercel**（❌）｜**未创建 Vercel Project**（❌）｜**未运行 `SP-06`**（❌）｜**未删除腾讯云资源**（❌）｜**未创建 `R3` / `R1`**（❌）｜**未启用 Function URL**（❌）｜**未初始化旧 `R2` probe hosting**（❌）｜**未运行 `S-01`–`S-07`**（❌）｜**未实现 PDF RAG / embedding / vector DB**（❌）｜**未进入 Gate C**（❌）｜**未 `CONFIRM` `TQ01`–`TQ05` 任一项**（❌）｜**未改写 Worker 历史产出 `01`–`05` / `SP-03` / `SP-03R`**（❌）｜**未删除 `SP-01a_*` 文档与 `sp01a_probe/`**（❌）。
- **阶段状态**：**`S00-03` = 已启动 / 未关闭**；**编码未开始**；**`D-053` / `D-054` = `CONFIRMED` 且已 Landing**；**契约 = `v0.2.6 DRAFT`（未冻结、不可作实现依据）**；**`SP-06` = `PLAN ONLY` / `NOT EXECUTED`**。
- **下一人工动作（三项独立，可分别裁决）**：① 裁决 **`DECISION REQUIRED` 2 项**（LLM Request Path / Credential Persistence）② 决定是否**批准 `SP-06` 执行**（`SP-06 EXECUTION APPROVAL REQUIRED`）③ （可选）决定是否**批准 `Legacy Cloud Cleanup Plan` 执行**。

## 2026-09-20 — S00-03 / `SP-01a` Phase 2 Resource Creation Progress（REALITY SYNC + 双轨模式登记）

本次为 **Phase 2 云资源创建过程的现实同步（Reality Sync）**，**不涉及产品语义、不涉及代码、不由 AI 创建任何云资源、不修改任何 canonical 文档**。

- **双轨推进模式正式启用**（本轮起生效）：**`ChatGPT` 轨** = 实时下一步指引 / 指导腾讯云控制台人工操作 / 判断配置是否符合已批准规格 / 判定 `RESOURCE CHANGE REQUIRED`·`BILLING CHANGE REQUIRED`·`BLOCKER`·`DECISION REQUIRED` / 发现控制台现实与文档不一致时**先停止、判断、重新报备** / 🔴 **不修改本项目工作区**；**`LearnBuddy` 轨（本机）** = 读真实文件 / **把项目负责人已经实际完成**的控制台动作正式落盘 / 维护 CREATE READY PACK·PATCH REPORT·技术决策包·CHANGELOG·`.learnbuddy/memory` / 维护**资源状态机**与 **Phase 2 execution tracker** / 收到运行观测值后汇总 Spike 证据 / 🔴 **不登录云控制台、不伪造云端状态、不据"应该已经创建"推断 `CREATED`、不代替项目负责人作未授权决策**。🔴 **硬规则**：`ChatGPT` 轨中影响 `CREATE` / `ENABLE` / `DELETE` / `DESTROY` / `BILLING` / `RESOURCE CHANGE` / `Gate` / `Spike Result` 的状态变化**必须随后同步至 `LearnBuddy` 落盘**；反之 **`LearnBuddy` 不得仅凭本地代码或旧文档推断云端现实状态**。
- 🚩 **建立【PHASE 2 RESOURCE EVENT LEDGER】（唯一权威账本，`PACK §N.2`）**：格式 = `EVENT ID` / `TIME` / `RESOURCE` / `ACTION` / `BEFORE` / `AFTER` / `ACCOUNT-LEVEL FACT` / `COST IMPACT` / `RESOURCE CHANGE REQUIRED` / `BILLING CHANGE REQUIRED` / `BLOCKER` / `NEXT ALLOWED ACTION` / `EVIDENCE`；推进原则 = **`ONE EVENT → SYNC → NEXT EVENT`**（不一次性预判整个 Phase 2、不提前假定未来事件成功）；🔴 **禁止存入**密码 / `SecretId` / `SecretKey` / `PGPASSWORD` / 数据库连接串·Secret / `Token`。本轮登记 **`P2-E01`–`P2-E05`**。
- **现实同步结果（🟠 全部 = `ACCOUNT-LEVEL / PROJECT-OWNER REPORTED FACT`；🔴 AI 未登录控制台、未独立复核）**：
  - **`R6-A` 广州 VPC = `CREATED`**（`learn-sp01a-vpc` / `10.20.0.0/16` / 0 元）—— 由 `NOT CREATED` 变为已创建（**已报备项**，非新依赖）；
  - **`R6-B` 广州子网 = `CREATED`**（`learn-sp01a-subnet-gz6` / `10.20.1.0/24` / **广州六区** / 0 元）；
  - **`R3` TencentDB for PostgreSQL = `PRE-CREATE`** —— 创建页已配置完成，🔴 **未购买 / 未创建 / 未起计费**；🔴 **不得写 `R3 = CREATED`**；
  - 🚩 **新发现 `R6-C` 广州安全组（旧记录中不存在）** —— `R3` 创建页 **`Security Group` 属必填项**、本账号**广州无现成安全组** ⇒ `R3` 一度 **`PAUSED BEFORE CREATION`**、**`RESOURCE CHANGE REQUIRED` 曾 = `YES`**（🔴 **不得隐去、不得写成"从未发生"**）；项目负责人**明确人工确认**「确认新增并创建 `R6-C`｜广州安全组 `learn-sp01a-pg-sg`，费用 0 元，仅允许 `10.20.1.0/24 → TCP 5432`，用于 `SP-01a` PostgreSQL」⇒ **`RESOURCE CHANGE REQUIRED` = `YES → RESOLVED`**；**`BILLING CHANGE REQUIRED` = `NO`**（0 元）；
  - 🔴 **`R6-C` 当前状态 = `AUTHORIZED` / `IN CONFIGURATION` / `NOT YET CONFIRMED CREATED`** —— 项目负责人已进入「**添加入站规则**」页并填写 `10.20.1.0/24` / `TCP:5432` / 允许，但**尚未报告「安全组已创建」** ⇒ 🔴 **在收到该明确事实前，不得把 `R6-C` 写成 `CREATED`**、**不得把 `R3` 写成 `CREATED`**；
  - **`R2` / `R1` / Function URL / 静态托管 / Probe 部署 / `S-01`–`S-07`** = **全部不变**（`CREATED`（上海·免费体验版，静态托管 `NOT INITIALIZED`）/ `NOT CREATED` / `NOT ENABLED` / `NOT INITIALIZED` / `NOT DEPLOYED` / `NOT EXECUTED`）。
- **`R6-C` 已批准规格（🔴 不得扩大）**：`Resource` = Security Group ｜ `Region` = 广州 ｜ `Name` = `learn-sp01a-pg-sg` ｜ `Cost` = 0 元 ｜ `Purpose` = `SP-01a` `R3` PostgreSQL 网络访问控制 ｜ `Inbound` = `10.20.1.0/24` → `TCP:5432` → `ALLOW`。🔴 **禁止** `0.0.0.0/0 → TCP 5432`｜公网 PostgreSQL 暴露｜无必要开放 `22` / `80` / `443` / `3389` / `ALL` ｜ 解释为**正式生产安全策略**（射程仅 `SP-01a`）。
- **`R3` 创建页实见配置（`PRE-CREATE`；🔴 仅实现级参数）**：按量计费 ｜ 广州 ｜ `learn-sp01a-vpc` / `learn-sp01a-subnet-gz6` ｜ 高可用版 ｜ 主可用区 广州六区 / 备用区 广州七区 ｜ 本地 SSD **10 GB** ｜ **1 vCPU / 2048 MB** ｜ **`0.57 元/小时`**（✅ 与 `RF-09` / `RF-10` 账号级 B 类报价一致）｜ UTF8 ｜ 异步 ｜ 页面大版本 **PostgreSQL 18**（🔴 **仅为本探针创建页实现级参数，不得自动升级为"最终生产 PostgreSQL 版本决策"**）。
- **成本影响**：**本轮新增付费项 = `0`**（`R6-A` / `R6-B` / `R6-C` 均 0 元，`R6-C` 为免费安全组）；🔴 **`R3` 仍未创建 ⇒ 持续计费尚未开始**；**预计最高总费用口径不变 ≈ `3.48 元`（6h 上界 ≤3.5 元）**；**唯一持续计费项仍为 `R3`（`0.57 元/h ≈ 13.68 元/天`，测试结束当天必须销毁）**；**自动续费 = NO**。
- **标志位**：`Current Phase` = **`PHASE 2 IN PROGRESS`**｜`CREATE AUTHORIZATION` = **`GIVEN`**（射程不变：仅 `SP-01a` disposable probe，≤6h）｜`Dual-Track Mode` = **`ACTIVE`**｜`RESOURCE CHANGE REQUIRED` = **`RESOLVED`**（🔴 历史两次 `YES` 均保留：旧 API Gateway 不可执行 + `R6-C` 新依赖）｜`BILLING CHANGE REQUIRED` = **`NO`**｜`BLOCKER` = **`NO`**｜`DECISION REQUIRED` = **`0`**｜`PROCESS DEVIATION` = **`YES`**（不变）｜`TQ01`–`TQ05 Changed` = **`NO`**（五项仍全部 `PROPOSED`、仍留 Gate B）｜**`SP-01a` = `IN PROGRESS` / `NOT PASS`**｜**`SP-01` = `NOT COMPLETE`**。
- **下一人工动作（唯一）**：完成 `R6-C`｜`learn-sp01a-pg-sg` 创建（入站**仅** `10.20.1.0/24 → TCP 5432 → ALLOW`）→ 向 `LearnBuddy` **明确报告「安全组已创建」**；🔴 **收到后下一轮仅同步** `R6-C = CREATED` ＋ `R3 = READY FOR FINAL CREATE`，然后**停止**（不连带创建 `R3`）。
- **本轮边界（🔴 记账）**：**未创建任何云资源**（无 VPC / 子网 / 安全组 / SCF 函数 / **未启用 Function URL** / 无 PostgreSQL；`R6-A` / `R6-B` / `R6-C` 均为**项目负责人本人控制台操作**）；**AI 未登录控制台**；**未产生人民币费用**；**未执行 `S-01`–`S-07`**；**未进入 Gate B**；**未写正式业务代码**、**未写 Probe / 未重新生成探针包**；🔴 **未修改** `docs/DECISIONS.md`、`docs/01`–`09` canonical、`docs/architecture/01`–`05`（Worker 历史产物）、`00_SHARED_TECHNICAL_CONTRACT.md`、`SP-01a_RESOURCE_DISCLOSURE_PACK.md`、`SP-03` / `SP-03R`；🔴 **未 `CONFIRM` `TQ01`–`TQ05`**；**未创建任何 `Decision` / 未占用 `Decision ID`**；🔴 **未重做** `S03-A`–`E` / Integrator / `D-051` / `D-052` / `SP-03R` / CREATE READY GATE REVIEW。
- ✅ **探针包实盘复核（未重新生成）**：`30_SPIKES/sp01a_probe/` 6 个文件**均在且与 §M.4 交付清单一致**（`scf_bootstrap` = `#!/bin/bash` + `export PORT=9000` + `/var/lang/node24/bin/node app.js`；`package.json` = 合法 JSON、`pg: ^8`；`probe_schema.sql` = 唯一 1 张表 `probe_persistence`；`app.js` 含 `MODULE_LOADED_AT` / `listen_ms`；`index.html` = 运行时填 Function URL + `fetch(..., { mode: 'cors' })`）。
- **落盘位置**：`20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（**新增 §N**：双轨模式登记 + **【PHASE 2 RESOURCE EVENT LEDGER】`P2-E01`–`P2-E05`** + 资源状态矩阵 + `R6-C` 批准规格 + `R3` PRE-CREATE 配置 + 标志位 + 下一动作 + 边界；§A–§M 原文一字未改）｜`20_INTEGRATION/SP-01a_CREATE_READY_PATCH_REPORT.md`（**新增 §18**；§1–§17 原文未改）｜`20_INTEGRATION/S00-03_技术决策包.md`（§N.12 追加 **《`N.12++++` Phase 2 Reality Sync》**；§N.1–§N.11 与 §N.12 / `N.12+` / `N.12++` / `N.12+++` 原文未改）｜本文件｜`.learnbuddy/memory/`（**`MEMORY.md` 合并去重后重写为钩子层** + `DECISION_INDEX.md` §C 现状钩子 + `2026-09-20.md` 日志）。
- **阶段状态**：**`S00-03` = 已启动 / 未关闭**；**`SP-01` = `APPROVED` / 未执行**；**`SP-01a` = `IN PROGRESS`（未 PASS）**；**`Current Gate` = `PHASE 2 IN PROGRESS`**。

## 2026-09-20 — S00-03 / `SP-01a` 创建授权（「A：确认创建」）+ 探针包交付 ⇒ `Phase 2 STARTED`

本次为**人工创建授权登记 + `SP-01a` 最小探针包交付**，**不涉及正式业务代码、不由 AI 创建任何云资源**。

- **人工授权（2026-09-20，项目负责人，人工原话「A：确认创建」）**：**`CREATE AUTHORIZATION` = `GIVEN`** —— 覆盖 `20_INTEGRATION/SP-01a_CREATE_READY_PACK.md` **§L.12**【SP-01a RESOURCE CREATION CONFIRMATION】所载**全部内容**（`ALREADY CREATED`：`R2` CloudBase 环境；`TO BE CREATED`：**`R6-A` 广州 VPC / `R6-B` 广州子网 / `R1` SCF Web 函数 / `R1` HTTP Entry＝Function URL / `R2` 静态托管初始化 / `R3` TencentDB for PostgreSQL**；**`R4` / `R5` 保持不创建**）；**授权射程 = 仅 `SP-01a` disposable probe（≤6 小时生命周期）**；**`Phase 2` = `STARTED`**。
- 🔴 **本授权不是**（不得扩大解释）：`SP-01a` 已完成 / `SP-01a` PASS / `SP-01` PASS｜对 `TQ01`–`TQ05` 的任何 `CONFIRM`｜对**正式生产架构 / 平台 / 入口 / 正式安全策略**的确认｜"`开放` 授权可作为正式匿名 API 策略"｜对任何**新增**产品（网关 / WAF / 限流 / 缓存 / 中间件）的授权。
- **探针包交付（新增目录 `30_SPIKES/sp01a_probe/`，共 6 个文件，全部标 `DISPOSABLE / NON-PRODUCTION`）**：
  - `README.md` —— 边界 / 阶段 A–C 执行与观测口径 / 销毁 / **5 项已知不确定性**；
  - `function/scf_bootstrap` —— 启动文件（**固定名**；需**可执行权限** 777·755；**LF 行尾**；**绝对路径** `/var/lang/node24/bin/node`；`export PORT=9000`）；
  - `function/app.js` —— 探针服务端（Node.js 原生 `http` + `pg`），端点 `/health`、`/env-keys`、`/db-health`、`/persist`、`/persist-count`、`/conn?n=N`；含 `module_load → listen → first_request` 冷启动锚点、池状态、CORS 响应头；
  - `function/package.json` —— 依赖 `pg: ^8`（**未锁定具体次版本，避免填写未经核实的版本号**）；
  - `db/probe_schema.sql` —— **唯一 1 张表** `probe_persistence`（`id` / `note` / `created_at`）；🔴 **只为独立 `R3` 执行，绝不建到 CloudBase bundled PostgreSQL 上**；
  - `web/index.html` —— disposable 探针页（**运行时填写 Function URL**，避免硬编码来回改）；含**真实跨域调用**按钮（`RF-05` ➕ 的实测观测点）。
  - ✅ **本机校验**：`app.js` 经 `node --check` **exit 0（解析通过、无报错）**；`package.json` 为**合法 JSON**；校验用临时文件已删除。
  - 🔴 **明确不含**：任何业务规则、`D9` 十步逻辑、**AI 调用**、`Attempt` / `Insight` / `Hypothesis` / `EvidenceRef`；**未写入 `src/`**。
  - 🔴 **语义澄清**：上一轮 CHANGELOG 条目中"**未写 Probe**"**指该轮时点**；本探针系**收到「确认创建」后按 `20_INTEGRATION/S00-03_技术决策包.md` §N.12 执行骨架**步骤 3** 的既定 AI 职责交付**，**不属范围扩展**。两条记账**并存不矛盾**。
  - 🔴 **落点报备**：`30_SPIKES/sp01a_probe/`（沿用既有"Spike / 探针产物按其自身目录、全标 DISPOSABLE"约定）；**如与预期落点不同，告知后可整体移动 / 重命名**。
- **责任划分（🔴 硬边界，依 `§N.10` 第 1 / 2 / 6 条）**：
  - **项目负责人**：在控制台创建 `R6-A` → `R6-B` → `R3` → `R1` → 启用 Function URL → 初始化 `R2` 静态托管 → 执行 `probe_schema.sql` → 打包上传 `function/` 与 `web/` → 填写 DB 环境变量（🔴 **不进代码 / 仓库 / 报告 / 聊天 / 截图**）→ 回填运行观测值（Function URL 实值 / 静态托管默认域名 / 额度·账单数值；🔴 **不含任何凭据**）→ 测试后销毁 + 账单页复核停费；
  - **AI（本机）**：汇总 `S-01` / `S-02` / `S-03`(探针级) / `S-04` / `S-05` / `S-06` / `S-07` 的逐项判定（`PASS` / `FAIL` + **原始观测值** + **网络口径标注** + **资源来源标注**）；若 `FAIL` ⇒ 按 `§N.5` 给出**回开映射【建议】**（🔴 **由项目负责人裁决，AI 不代裁**）；
  - 🔴 **AI 不登录控制台、不持有凭据、不代为执行任何创建 / 变更动作**。
- **🔴 停止条件（创建过程中一旦触发 ⇒ 停止 + 重新报备，不得自行接受）**：① 被强制要求 **NAT 网关 / 固定公网出口 IP / EIP / 付费带宽 / 其它付费网络产品**（⇒ `RESOURCE CHANGE REQUIRED`，涉付费另加 `BILLING CHANGE REQUIRED`）② `R3` **最低规格提高** 或新增**强制付费能力**（代理 / 审计 / 只读实例）③ `R1` **强制开启日志投递**，或 **`Node.js 24.11` 不可选** ④ 访问静态托管 / Function URL **需自备域名 · 证书 · 备案** ⑤ **最终创建页价格高于** §L.12 账号级报价（`R3 > 0.57 元/小时` 或出现新计费项 ⇒ `BILLING CHANGE REQUIRED`）⑥ 出现**任何** Function URL 独立计费项（与 §L.6 结论 A 冲突）。**不得临时升级规格、不得先创建后补报**；**费用纪律（`§N.9`）不设金额下限**。
- **标志位与状态**：`CREATE AUTHORIZATION` = **`GIVEN`**｜`Phase` = **`Phase 2 STARTED`**｜`Current Gate` = **`PHASE 2 IN PROGRESS`**（创建 + 探针部署 + 执行 `S-01`–`S-07`）｜`RESOURCE CHANGE REQUIRED` = **本轮新增 `NO`**（🔴 **历史曾发生 `YES`（旧 API Gateway）→ `RESOLVED`；禁写"从未发生"**）｜`BILLING CHANGE REQUIRED` = **`NO`**（🟠 `BILLING DISCLOSURE` 继续维持：`R3` 按量 **`0.57 元/小时`**）｜`BLOCKER` = **`NO`**｜`DECISION REQUIRED` = **`0`**｜`PROCESS DEVIATION` = **`YES`**（`R2` 提前创建；已登记，处置不变）｜**`SP-01a` / `SP-01` 均【未完成】**（🔴 **不得声称 PASS**）｜`TQ01`–`TQ05` = **未改变**（五项仍全部 `PROPOSED`、仍留 Gate B）。
- **本轮边界（🔴 记账）**：**未创建任何云资源**（无 VPC / 子网 / SCF 函数 / **未启用 Function URL** / 无 PostgreSQL）；**未登录控制台**；**未产生人民币费用**；**未执行 `S-01`–`S-07`**（需资源就绪后执行）；**未进入 Gate B**；**未写正式业务代码**；🔴 **未修改** `20_INTEGRATION/SP-01a_RESOURCE_DISCLOSURE_PACK.md`（历史阶段产物一字未动）、五份 Worker 产出（`01`–`05`）、`SP-03` / `SP-03R` 及任何 canonical 契约；🔴 **未 `CONFIRM` `TQ01`–`TQ05`**；**未创建任何 `Decision` / 未占用 `Decision ID`**。
- **落盘位置**：`20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（**新增 §M**：授权登记 / 射程 / 执行手册 / 探针清单 / 停止条件 / 状态 / 边界）｜`20_INTEGRATION/SP-01a_CREATE_READY_PATCH_REPORT.md`（**新增 §17**；§1–§16 原文未改）｜`20_INTEGRATION/S00-03_技术决策包.md`（§N.12 追加 **《`N.12+++` Phase 2 创建授权登记 + 探针包交付》**；§N.1–§N.11 与 §N.12 / §N.12+ / §N.12++ 原文未改）｜本文件｜**新增目录** `30_SPIKES/sp01a_probe/`｜`.learnbuddy/memory/`（工作日志与索引同步）。
- **下一步**：**项目负责人**按 §L.10 顺序在控制台创建资源（遵守 §M.5 停止条件）→ 部署探针并执行 `probe_schema.sql` → 回填运行观测值；**AI** 随后汇总 `S-01`–`S-07`（`S-03` 探针级）判定（🔴 `SP-01b` 未完成前**不得声称 `SP-01` 整体完成**）。

## 2026-09-20 — S00-03 / `SP-01a` ACCOUNT-LEVEL BACKFILL CLOSURE + CREATE READY GATE REVIEW（`CREATE READY GATE = PASS`）

本次为**账号级回填收口 + 创建前最终 Gate Review**，**不涉及代码变更、不创建任何云资源、不执行任何实测、不进入编码阶段**。

- **`RF-01`–`RF-12` 全部收口**（🟠 账号级，项目负责人本人控制台；AI 未独立复核）：
  - `RF-01` = ✅ **COMPLETE** —— 已购 **SCF 0 元新客试用套餐**（广州 / 个人高级版 / 3 个月 / 预计到期 **2026-12-20 14:00:04**）；🚩 **当前剩余额度 = `0`**（一直显示 0）。🔴 **不推测"为什么是 0"**（不得解释为已耗尽 / 未发放 / 页面 bug / 套餐无效）；**费用模型改用保守口径 ⇒ 不再按免费额度抵扣 SCF 资源使用量 / 调用次数**；若后续提供"该 `0` 实为已使用量"等新控制台证据 ⇒ 再修正。
  - `RF-02` / `RF-03` / `RF-04` = ✅ **PASS**（512 MB 可选 / 超时 1～900 s ⇒ 30 s 可配；Node.js 至少含 24.11·22.21·20.19·18.15·16.13·14.18；日志投递有「启用」开关、可保持不启用）。
  - `RF-05` / `RF-06` = ✅ **PRE-CREATE PASS**（由 `PARTIAL PASS` 升级：能力层 + 裁决层均已完成；Endpoint 实值 + CORS 实测仍合法 `DEFERRED TO Phase 2`）。
  - `RF-07` = ✅ **PASS**（CloudBase 免费体验版**可用且已实际创建**，0 元 ⇒ 不需购买 19.9 元/月个人版）。
  - `RF-08` = ✅ **PASS**（**实际地域 = 上海**；默认域名能力 = 产品能力层支持；**静态网站托管尚未初始化**）。
  - `RF-09` = ✅ **PASS**（广州 · 按量 · 1 vCPU / 2048 MB ⇒ **`0.56 元/小时`**，证据等级 = **B 类：本账号控制台实际报价**，🔴 **不得再写成"仅官方公开参考价"**）。
  - `RF-10` = ✅ **PASS**（存储 **本地 SSD**、**最小磁盘 10 GB**、步长 10 GB；**1C2G + 10 GB ⇒ 总配置 `0.57 元/小时`** ⇒ 磁盘 **`0.001 元/GB/小时`**）。🚩 **证据等级由「🔴 非官方保守示意值」升级为「B 类：本账号控制台实际报价推导值」**（**PATCH-02 的保守结论在新账号级证据下失效，就地更新；原文本保留不改写**）；⚠️ 另保留 **备份费用 `0.0008 元/GB/小时`** 属**备份计费**，**不是数据磁盘价格**，二者不得混淆。
  - `RF-11` = ✅ **PASS**（创建页架构 = **高可用版**，未见"单机版"；**未发现强制**数据库代理 / 审计 / 只读实例 / 其它付费增值能力；**按量计费（后付费）**；🟢 官方当前规则 **按量实例销毁后停止计费** ⇒ 🔴 **Phase 2 销毁后仍须在费用中心 / 账单页实测复核**）。
  - `RF-12` = ✅ **COMPLETE / NO EXISTING RESOURCE**（**不是 FAIL**）—— 广州现有 **VPC = `NONE`**、**子网 = `NONE`**；项目负责人当前未创建 VPC / 子网。
  - 🔴 **仍为 12 格、未新增编号（无 `RF-13` / `RF-14`）**；**只记数值 / 选项 / 名称，未记录任何凭据**。
- **`RF-06` Function URL 探针期授权模式 —— 人工裁决（`CONFIRMED`）**：**授权类型 = `开放`**；**射程严格限定 = 仅 `SP-01a` disposable probe**（允许 `GET /health`、`GET /db-health`、最小持久化 Probe 接口；**禁止**正式用户认证 / 正式业务 API / 正式用户数据 / 暴露 Secret·数据库连接串·数据库密码·云凭据 / 作为正式生产匿名 API 策略）；**测试结束必须关闭 Function URL 或删除 disposable SCF 函数**。🔴 **仍属未确认**：正式认证策略 / 用户登录 / CAM 策略 / CORS 白名单 / 防刷 / 限流 / WAF / API 网关治理。🚩 **原 `DECISION REQUIRED`（安全配置层 1 项）= `CLOSED`。**
- 🚩 **`PROCESS DEVIATION` = `YES`（必须保留、不得隐去）**：项目负责人在 **Account-Level Backfill 尚未完成 + Gate Review 尚未执行 + 最终「确认创建」尚未给出**时，**提前手工创建了 `R2` CloudBase 免费体验环境**（**上海 / 云开发免费体验版 / 0 元 / 不支持自动续费 / 套餐有效期 2027-03-20 / 当前已消耗 0 点**）。性质 = **人工操作偏离既定 Gate 顺序**（🔴 非 AI 动作；本 Gate Review 未创建任何资源）。已发生影响 = `R2` 环境已存在、bundled PostgreSQL 已可用；**未发生影响** = 未初始化静态托管 / 未写业务数据 / 未建业务表 / 未部署 Probe / 未接入 SCF / **未产生人民币套餐费用** ⇒ **不自动判项目失败**。处置 = **保留环境 ｜ 冻结 bundled PostgreSQL ｜ 继续遵守后续 Gate**。🔴 **不得把历史改写成"当时已获得资源创建授权"。**
- **CloudBase bundled PostgreSQL = 存在但冻结不用**：创建环境时数据库类型选择 **PostgreSQL**，控制台已出现 **PostgreSQL 管理 / `public` schema / SQL 编辑器 / 新建表入口 / CU 用量 / 容量使用量** ⇒ **已实际 `PROVISIONED` / `AVAILABLE`**（**不是"仅选择类型但资源尚未存在"**）；当前 **CU `0` / 容量 `0 MB` / 表 `0` / 业务数据 `0`** ⇒ 定性 = **`UNUSED BUNDLED CAPABILITY`**。🔴 **不作为 `R3`**、**不建业务表 / migration / 业务 schema**、**SCF 不接入该 PostgreSQL**；**组合甲不变**（`R3` 仍为独立 TencentDB for PostgreSQL）；**若拟改用它替代 `R3` ⇒ 必须重新打开资源组合决策，本轮不得自行切换**。
- **`R2`（上海）与 `R1` / `R3`（计划广州）跨地域**：🔴 **不直接判为架构失败**、**不构成 `RESOURCE CHANGE REQUIRED`**；当前调用结构 = 浏览器分别取上海静态资源 + 直接 HTTPS 调用广州 Function URL；🚩 **Phase 2 必须实测「浏览器 → Function URL」跨域访问（CORS）**。
- **新增附属网络资源（报备扩展）**：**`R6-A` 广州 VPC × 1** ｜ **`R6-B` 广州子网 × 1**（用途 = `R1` / `R3` 私网互通）。🟢 官方《私有网络 购买指南》（最近更新 **2025-09-26**）：**"VPC 中免费使用的功能：基础功能 —— 私有网络、子网、路由表"** ⇒ **预计费用 `0 元`**；🔴 **不得因"0 元"就隐形创建**（已写入最终创建确认）。🔴 **当前架构不需要** `NAT 网关` / `固定公网出口 IP` / `EIP` / 额外公网带宽产品；**若实际创建时被强制要求 ⇒ `RESOURCE CHANGE REQUIRED`（涉付费另加 `BILLING CHANGE REQUIRED`）+【停止】+ 重新报备**。
- **Function URL 独立计费核对（结论 A 成立）**：依据云函数《按量计费（后付费）》（`.../583/12284`，最近更新 2024-04-08）+《Web 函数计费说明》（`.../583/66237`）—— **Web 型函数账单 = 资源使用费用 ＋ Web 函数调用次数费用 ＋ 外网出流量费用 ＋ 预置并发闲置费用 ＋ Web 函数响应流量费用**，**未见任何 "Function URL" 独立计费项 / 固定网关费用** ⇒ **Function URL 不单独收取固定网关费用**、**不触发 `RESOURCE CHANGE REQUIRED`**。🟠 **保留不确定性**：官方文档未明确「HTTP Entry = Function URL 时 Web 函数响应流量由哪一侧统计」⇒ 取**最保守口径 = 落在函数侧**（推断 / `PROPOSED`），**须由 Phase 2 实际账单（`S-05`）复核**；🔴 **不得写成"官方已明确"**。
- **`R1` Runtime 具体版本 = `Node.js 24.11`**（依据 = 腾讯云 CloudBase 官方《运行环境支持》标注 **`24.11` = Active LTS（推荐）** + Node.js 官方 Release Schedule **`24.x` = Active LTS，EOL 2028-04-30**；`22.x` = Maintenance LTS（EOL 2027-04-30）；`20.x` 已于 2026-04-30 EOL；`26.x` = Current 非 LTS）⇒ 结论 = **无需作为独立人工决策项**（实现级配置参数：不改架构 / 不改产品行为 / 不显著改费用 / 不引入新平台依赖），**但已在最终创建确认中披露**。🔴 **不得仅凭模型记忆选择**；🔴 **射程 = 不代表 Node.js 24 成为最终生产运行时、不代表框架 / 运行时形态已裁决**。
- **费用重算（🔴 按账号级价格 + `RF-01` 剩余额度 = 0）**：`R1` ≈ **`0.06 元`**（官方单价 × 用量假设：225 GBs + 0.15 万次 + 15 MB 出流量 + 15 MB 响应流量保守项；🔴 **不得因买过 0 元套餐就写 0 元**）｜`R2` = **`0 元`**（免费体验版 3000 点/月）｜`R3` = **`3.42 元`**（`0.57 × 6`）｜`R6-A` / `R6-B` = **`0 元`** ⇒ **预计最高总费用 ≈ `3.48 元`（6h 上界 `≤ 3.5 元`）**（🔴 **已替换此前"≈3.4 元 / 基于 A 类公开值估算"的口径**）；**持续计费风险 = 仅 `R3`**（`0.57 元/h ≈ 13.68 元/天`，**测试结束当天必须销毁**）；**自动续费 = NO**。
- **`CREATE READY GATE = PASS`**（`G-01`–`G-16` 全部满足）⇒ **`Current State = READY TO REQUEST CREATION CONFIRMATION`**（🔴 **≠ `READY TO AUTO-CREATE` ｜ ≠ 资源创建已授权 ｜ ≠ `SP-01a` PASS ｜ ≠ `SP-01` PASS**）。已输出**【SP-01a RESOURCE CREATION CONFIRMATION】**（`ALREADY CREATED` / `UNUSED BUNDLED` / `TO BE CREATED` 三张清单 + 账号级价格 + 预计最高总费用 + 持续计费风险 + 销毁 8 步 + A/B/C 确认选项）。
- **标志位**：`RESOURCE CHANGE REQUIRED` = **本轮新增 `NO`（🔴 历史曾发生 `YES`（旧 API Gateway 不可执行）→ `RESOLVED`；禁写"从未发生"）**｜`BILLING CHANGE REQUIRED` = **`NO`**（🟠 `BILLING DISCLOSURE` 继续维持：`R3` 按量 `0.57 元/小时`）｜`BLOCKER` = **`NO`**｜`DECISION REQUIRED` = **`0`**（原安全配置层 1 项已关闭）｜`SP-01a` 资源层 `DECISION REQUIRED` = **`0`（不变）**｜🆕 **`PROCESS DEVIATION` = `YES`**｜`CCR` = 无｜`PRODUCT SEMANTIC CONFLICT` = 无。
- **本轮边界（🔴 记账）**：**本 Gate Review 未创建任何资源**（无 VPC / 子网 / SCF 函数 / **未启用 Function URL** / **无任何实际 Endpoint** / 无 PostgreSQL）；**未写 Probe / 未写 HTML / 未部署 / 未建表 / 未执行 `S-01`–`S-07` / 未执行 `SP-01a`·`SP-01b`**；**未进入 Gate B / 未开始正式编码**；**本 Gate Review 未产生人民币资源费用**；🔴 **未修改** `20_INTEGRATION/SP-01a_RESOURCE_DISCLOSURE_PACK.md`（**历史阶段产物一字未动**）、五份 Worker 产出（`01`–`05`）、`SP-03` / `SP-03R` 及任何 canonical 契约；🔴 **未改变 `TQ01`–`TQ05`**（五项仍全部 `PROPOSED`、仍留 Gate B）；🔴 **未创建任何 `Decision` / 未占用 `Decision ID`**。
- **落盘位置**：`20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（**就地更新**：顶部状态补注 + §D 账号级回填收口表 + **新增 §E.5-FU** + §H 状态机与标志位 + **新增 §L（L.1–L.15，含 `G-01`–`G-16` Gate Check 与【SP-01a RESOURCE CREATION CONFIRMATION】）**；**未另起竞争版本**）｜`20_INTEGRATION/SP-01a_CREATE_READY_PATCH_REPORT.md`（**新增 §16**；🔴 **未修改 §1–§15 任何原文**）｜`20_INTEGRATION/S00-03_技术决策包.md`（**§N.12 追加《`N.12++` Account-Level Backfill Closure / CREATE READY Gate Review》**；🔴 **未修改 §N.1–§N.11 与 §N.12 / §N.12+ 原文**）｜本文件｜`.learnbuddy/memory/`（工作日志与索引同步）。
- **阶段状态**：**`S00-03` = 已启动 / 未关闭**；**`SP-01` = `APPROVED` / 未执行**；**`SP-01a` = 未执行**；**当前 Gate = `READY TO REQUEST CREATION CONFIRMATION`**；**下一人工动作 = 阅读【SP-01a RESOURCE CREATION CONFIRMATION】并明确「确认创建」/「修改后再确认」/「不继续」**。

## 2026-09-20 — S00-03 / `SP-01a` Account-Level Verification：`R1` HTTP Entry 重开改判（旧路径 `SUPERSEDED` → Function URL `CONFIRMED`）

本次为**账号级发现触发的人工重开与重新裁决落盘 + `RF-05`/`RF-06` 语义替换**，**不涉及代码变更、不创建任何资源、不执行任何实测、不进入编码阶段**。

- **触发（账号级事实，🟠 项目负责人本人腾讯云控制台核验；AI 未独立复核）**：
  - 腾讯云旧 API Gateway 产品：**2024-07-01 起不再支持新建 API Gateway 触发器**；**2025-06-30 API Gateway 产品停止服务 / 触发器下线**；
  - ⇒ 旧路径 (a)「SCF Web 函数 + 标准型 API 网关」在**当前真实云环境不可执行** ⇒ **`RESOURCE CHANGE REQUIRED` = `YES`（曾发生）**。
- **四态轨迹（保留、不改写历史）**：① `PROPOSED` → ② 项目负责人明确确认 → **`CONFIRMED`** → ③ 账号级核验发现不可执行 → **`RESOURCE CHANGE REQUIRED`** → ④ 项目负责人**重新裁决** → **新路径 `CONFIRMED`**。🔴 **旧路径不是"从未确认"，也不是"人工决策错误"。**
- **人工重新裁决（2026-09-20，项目负责人）**：
  - **`R1` HTTP Entry = `SCF Web 函数 + Function URL`（`CONFIRMED`）**；依据 = 账号级实测（函数 URL 配置存在 / 公网访问可启用 / 内网访问可启用 / 授权类型 `CAM`·`开放`）+ 🟢 官方当前文档（函数 URL 端点格式 / CORS 配置项 / 授权类型定义）；
  - **旧路径 (a) = `SUPERSEDED`**（历史 `CONFIRMED` 文本保留、不删除、不改写；落盘采用"就地补注 + 保留旧文本"）；
  - **资源组合 = 组合甲（不变，`CONFIRMED`）**：`R1` 独立腾讯云 SCF Web 函数｜`R2` CloudBase 静态网站托管独立环境｜`R3` 独立 TencentDB for PostgreSQL。
- **`RESOURCE CHANGE REQUIRED`：曾发生 `YES` → 现 `RESOLVED`** —— 原因 = 旧 API Gateway 不可执行问题**已通过人工重新裁决替换为 Function URL** 处理完毕。🔴 **不得写"从未发生 `RESOURCE CHANGE REQUIRED`"。**
- **`RF-05` / `RF-06` Semantic Patch（🔴 编号不变，未新增 `RF-13` / `RF-14`）**：
  - `RF-05` 新定义 = **Function URL 可用性**（① 支持 = YES｜② 公网访问 = YES｜③ 内网访问 = YES｜④ 属 SCF 自身能力｜⑤ 不再依赖旧 API Gateway｜⑥ **平台 HTTPS Endpoint = 能力层 YES / URL 实值 `deferred to Phase 2`**；➕ **CORS = 产品能力层 `SUPPORTED`（🟢 官方《创建函数 URL》）/ 账号级未验证 / 真实行为 `DEFERRED TO Phase 2 Probe`**）⇒ 🟡 **PARTIAL PASS**；
  - `RF-06` 新定义 = **Function URL 调用与安全条件**（授权类型存在 **`CAM` / `开放`**；`开放` = **不自动**对请求身份做 CAM 校验、**支持匿名访问**；`CAM` = 需**腾讯云 CAM 鉴权**；🔴 **不得把 `开放` 写成正式生产安全策略**；**探针期临时授权模式 = Phase 2 创建前裁决 ⇒ `DECISION REQUIRED`（安全配置层，非 `TQ` 级）**）⇒ 🟡 **PARTIAL PASS**；
  - 🔴 **不再要求项目负责人查询**旧 API Gateway 免费额度 / 共享型·专享型 / 标准型网关 / 旧网关后端超时（**均已随路径 (a) `SUPERSEDED`**）。
- **账号级回填进度（2026-09-20）**：`RF-02` / `RF-03` / `RF-04` = **PASS**｜`RF-01` = **PARTIAL**（**已购 SCF 0 元新客试用套餐**：广州 / 个人高级版 / 0 元 / 3 个月 / 预计到期 **2026-12-20 14:00:04**；🔴 **「当前剩余额度」未读取 ⇒ 保持待回填，不得自行填写**）｜`RF-05` / `RF-06` = **PARTIAL PASS**｜`RF-07`–`RF-12` = **未回填**。
- **账号 / 计费状态事件登记（🔴 必须登记）**：购买 **SCF 0 元新客试用套餐**时控制台曾提示"**当前支付方式可能从【微信支付】切换为【腾讯云支付】，且切换后不可恢复原支付方式**"；**项目负责人已人工完成购买**。🔴 **不得把"0 元"解释为"无任何账号副作用"**；**不因此自动回开技术架构**（属账号 / 计费状态记录；**未记录任何凭据 / 密钥 / 登录信息**）。
- **费用影响**：**旧 `API Gateway` 移出当前 CREATE READY 费用模型** ⇒ **当前预计费用 = `REMOVED`**（原 6 小时上界 ≈0.03 元不再计入）；当前 PACK 内注明 **"旧 API Gateway = `SUPERSEDED` / NOT IN CURRENT CREATION SET"**；🔴 **历史报备 `20_INTEGRATION/SP-01a_RESOURCE_DISCLOSURE_PACK.md` 保持不改**（历史阶段产物）；🔴 **`R1` HTTP Entry 是否引入独立计费项 = 待核对**（**不凭模型知识给结论**）。
- **本轮边界（🔴 记账）**：**未创建任何资源**（无 SCF 函数 / **未启用 Function URL** / **未生成任何实际 Endpoint** / 无 CloudBase 环境 / 无 PostgreSQL / 无 VPC / 无子网）；**未写探针 / 未部署 / 未建表**；**未执行 `S-01`–`S-07` / `SP-01a` / `SP-01b`**；**未进入 Gate B / 未开始正式编码**；**云资源费用 = 0**（`SCF Trial Package` = `PURCHASED / 0 CNY`）；**未修改** 五份 Worker 产出（`01`–`05`）、`SP-03` / `SP-03R`、任何 canonical 契约；🔴 **未改变 `TQ01`–`TQ05`**（五项仍全部 `PROPOSED`、仍留 Gate B）；🔴 **未创建任何 `Decision` / 未占用 `Decision ID` 空间**。
- **标志位**：`RESOURCE CHANGE REQUIRED` = **`RESOLVED`**（曾发生 YES）｜`BILLING CHANGE REQUIRED` = **NO**｜`BLOCKER` = **NO**｜`CCR` = 无｜`PRODUCT SEMANTIC CONFLICT` = 无｜**`DECISION REQUIRED` = YES（1 项；安全配置层：探针期 Function URL 授权模式 `开放`/`CAM`；Phase 2 创建前裁决；非 `TQ` 级）**｜**`SP-01a` 资源层 `DECISION REQUIRED` = 0（不变）**。
- **落盘位置**：`20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（**就地 Patch；新增 §A.3 / §B.5 / §C.2-FU / §E.2-FU / §K，并同步 §A.2 / §B.1·§B.2 / §C.1·§C.2 / §D / §E.2 / §E.5 / §F / §G / §H / §I / §J；未另起竞争版本**）｜`20_INTEGRATION/SP-01a_CREATE_READY_PATCH_REPORT.md`（**新增 §15**；🔴 **未修改 §14 的人工裁决历史**）｜`20_INTEGRATION/S00-03_技术决策包.md`（**§N.12 追加《`N.12+` Account-Level Verification 补充》+ 就地补注**；🔴 **未修改 §N.1–§N.11 原文**）｜本文件（追加）｜`.learnbuddy/memory/`（工作日志与索引同步）。
- **阶段状态**：**`S00-03` = 已启动 / 未关闭**；**`SP-01` = `APPROVED` / 未执行**；**`SP-01a` = 未执行**；**当前 Gate = `READY FOR ACCOUNT-LEVEL BACKFILL`（≠ `READY TO CREATE`）**；**下一人工动作 = 进入 `R2`｜CloudBase，完成 `RF-07` / `RF-08` 账号级核验**。

## 2026-09-20 — S00-03 / `SP-01a` 资源组合与触发器路径人工裁定（`DECISION STATE CORRECTION` 解除）

本次为**人工裁决的状态登记**，**不涉及代码变更、不创建任何资源、不执行任何实测、不进入编码阶段**。

- **人工裁决（2026-09-20，项目负责人）**：人工指令原文 **「组合甲+路径(a)」**。
  - **资源组合 = 组合甲（`CONFIRMED`）**：`R1` = **独立腾讯云 SCF（Web 函数）**｜`R2` = **CloudBase 静态网站托管（独立环境）**｜`R3` = **独立 TencentDB for PostgreSQL**。**组合乙不采用**（保留为等价候补记录，不删除）。
  - **`R1` 触发器路径 = 路径 (a)（`CONFIRMED`）**：**Web 函数自定义创建 + 标准型 API 网关**（后端超时可配 30 s）。**路径 (b)（事件函数 + API 网关）与「接受默认 15 s」不采用**（保留为候选记录）。
- **同时关闭** `SP-01a_RESOURCE_DISCLOSURE_PACK.md` §6.6 登记的 **`DECISION REQUIRED` 2 项**（① 组合甲/乙 ② `R1` 触发器路径）⇒ **SP-01a 资源层 `DECISION REQUIRED` = 0**。
- **状态轨迹（保留、不改写历史）**：① 原 `SP-01a_CREATE_READY_PACK.md` 曾**误写**为"✅ 人工已选（项目负责人）"—— 实为上游推荐、无人工确认记录 ⇒ 本日先经 **`DECISION STATE CORRECTION`** 下调为 `PROPOSED` / 待确认；② **其后项目负责人明确指令「组合甲+路径(a)」** ⇒ **恢复登记为 `CONFIRMED`**。**三态轨迹均留痕**（详见 `20_INTEGRATION/SP-01a_CREATE_READY_PATCH_REPORT.md` §3 / §14）。
- **边界（🔴 裁决 ≠ 授权）**：
  - **不改变 `§N.9` 第 2 条** —— **逐项报备 + 再次确认继续适用**；`R1`/`R2`/`R3` 的**具体规格与单价仍为 `PROPOSED`**（512 MB / 30 s / 广州 / 1 核 2 GiB / 最小磁盘），**须经 `RF-01`–`RF-12` 回填**后才成为本账号创建规格；
  - 🔴 **不构成创建授权**；**未创建任何资源 / 未登录控制台 / 未写探针 / 未部署 / 未建表 / 未执行 `S-01`–`S-07`**；**费用 = 0**；
  - 🔴 **不 `CONFIRM` `TQ01`–`TQ05`**（五项仍全部 `PROPOSED`、仍留 Gate B）；**不得写"腾讯云已成为最终生产平台" / "组合甲已成为正式生产架构" / "路径 (a) 已成为正式生产触发器架构"**；
  - 🔴 **不占用 `Decision ID` 空间**（`D-0xx` 为产品语义决策）；**未创建任何 `Decision`**；
  - 🔴 **未修改** `SP-01a_RESOURCE_DISCLOSURE_PACK.md`（历史产物一字未动）、五份 Worker 产出（`01`–`05`）、`SP-03` / `SP-03R` 及任何 canonical 契约。
- **标志位**：`RESOURCE CHANGE REQUIRED` = **NO**｜`BILLING CHANGE REQUIRED` = **NO**｜`BLOCKER` = **NO**｜`CCR` = **无**｜`PRODUCT SEMANTIC CONFLICT` = **无**｜**`DECISION REQUIRED` = 0（SP-01a 资源层）**。
- **落盘位置**：`20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（顶部状态行 + §A.2 + §C.2 + §E.2 + §J 就地同步）｜`20_INTEGRATION/S00-03_技术决策包.md` §N.12 尾部新增《🟢 人工裁决结果（2026-09-20，补充 · 项目负责人）》｜`20_INTEGRATION/SP-01a_CREATE_READY_PATCH_REPORT.md` 新增 **§14**｜本文件。
- **阶段状态**：**`S00-03` = 已启动 / 未关闭**；**`SP-01` = `APPROVED` / 未执行**；**`SP-01a` = 未执行**；**当前 Gate = `READY FOR ACCOUNT-LEVEL BACKFILL`（≠ `READY TO CREATE`）**；**下一人工动作 = 按 `RF-01`→`RF-12` 完成账号级回填 → `CREATE READY GATE REVIEW` → 明确"确认创建"**。

## 2026-09-20 — S00-03 / `SP-01a` CREATE READY PACK 修正与账号级回填准备（Gate Patch）

本次为**文档 Gate Patch（含 1 项状态语义修正）**，**不涉及代码变更、不创建任何资源、不执行任何实测、不进入编码阶段**。

- **性质**：`SP-01a` **Resource Creation 前 Gate Patch** —— 只修 `20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（**不另起竞争版本**）+ 新增 Patch Report；**不重开技术研究**。
- **🔴 `DECISION STATE CORRECTION`（本次唯一状态修正）**：
  - 原 `SP-01a_CREATE_READY_PACK.md` 顶部与 §A.2 声称 **"人工已选执行配置（2026-09-20，项目负责人）：组合甲 + 路径 (a)"** ⇒ 回查 **`docs/DECISIONS.md`（`D-001`–`D-052`）/ `docs/CHANGELOG.md` / `20_INTEGRATION/S00-03_技术决策包.md` §N.8–§N.12 / `SP-01a_RESOURCE_DISCLOSURE_PACK.md`** 后确认：**均无该项目负责人明确选定记录**；该表述仅出现在两份 SP-01a 文档自身与 AI 自有工作日志中。
  - 另：任务书提及的输入资产 **`项目会话压缩交接_2026-09-20.md` 在本工作区未找到**（已登记为信息性输入缺口，非阻塞）。
  - ⇒ **`组合甲` 与 `路径 (a)` 由"✅ 人工已选"下调为 `PROPOSED` / 待项目负责人确认**；二者**仍是 `SP-01a_RESOURCE_DISCLOSURE_PACK` §6.6 登记的 `DECISION REQUIRED` 项**。**不代为选择替代方案**（组合乙 / 路径 (b) / 接受 15 s 均保持候选，未采用亦未否决）。
  - **性质**：**非技术 BLOCKER、不阻断本轮 Patch**；但**阻断"进入创建"**。
- **PATCH-01｜`RF-01` 免费额度口径（PASS）**：`RF-01` 由"有无 + 有效期"收紧为**账号级 6 项**（是否具备资格 / 是否已领取·激活 / 当前是否仍有效 / 生效时间 / 失效时间 / 当前剩余额度）；**判定依据只能是控制台「资源包页 / 用量页 / 费用中心 / 创建页」**；明确 **"不得仅根据公开文档推断'本账号当前免费'"**；账号级页面未核验则**保持 `🔴 待回填`**。
- **PATCH-02｜`R3` 硬盘价格证据等级（PASS）**：`≈0.001 元/GB/小时` **保持"非官方保守示意值"（证据等级 = 🔴）**；本轮注入资产**未提供官方出处** ⇒ **不提升证据等级、不改写为"腾讯云官方公开计费示例参考值"**；明确 **"官方示例参考值 ≠ 本账号创建页报价"** ⇒ **`RF-10` 仍必须控制台回填**、**`S-05` 依据仍是创建页实际报价 + 实际账单 / 额度页**、**不得提前把 `RF-10` 标记完成**。
- **PATCH-03｜CloudBase 地域口径（PASS）**：统一为 **"公开文档覆盖地域（上海 / 新加坡）≠ 当前账号创建页实际可选地域"**；**禁止**推出"`R2` 必然只能上海 / `R2` 与 `R1`·`R3` 必然跨地域 / 必须更换产品"；`R2` 实际可选地域**必须由 `RF-08` 在控制台地域下拉框读取**；若 `RF-08` 显示无法满足已报备结构 ⇒ **`RESOURCE CHANGE REQUIRED`，重新报备、不得自行切换**。
- **`RF-01`–`RF-12` 最小充分性检查（PASS）**：仍为 **12 格**（**未因"想更完整"新增编号**）；补全 `RF-01` / `RF-05`（存在 + 有效 + 有效期）/ `RF-10`（最小磁盘 + 磁盘类型 + 单价）/ `RF-11`（是否只能双机 HA + 是否另有强制项 + 销毁是否立即停费）；`RF-12` 明确**只记名称、不得记录密码 / 密钥 / 敏感凭据**。
- **费用模型分层检查（PASS）**：新增 **§E.0 四类数据分层（A 官方公开价 / B 本账号实际报价 / C 本次预计用量 / D 预计费用）**；各资源表统一为四行结构；明确 **禁止把 A 直接写成 B**、**B 未回填时 D 须明示"基于 A 的上界估算、非本账号报价"**、**`S-05` 依据 = 创建页实际报价 + 账单 / 额度页**。
- **`R1` CLS 项就地修正**：明确 **"若无法关闭 ⇒ 存在关联 CLS 计费可能"**；**不估算成"绝对为 0"**；**属免费额度记"免费"、无免费额度记"实际费用"**（由 `RF-04` + 账号 CLS 免费期状态确定）。
- **CREATE READY PACK 状态机推进**：**`BLOCKED ON ACCOUNT-LEVEL BACKFILL` → `READY FOR ACCOUNT-LEVEL BACKFILL`**；🔴 **该状态 ≠ `READY TO CREATE`** —— 仅表示文档已具备账号核验条件。
- **未做（边界确认）**：**未创建任何资源**（无 SCF / API 网关 / CloudBase 环境 / PostgreSQL / VPC / 子网）；**未登录控制台**；**未写探针 / 未部署 / 未建表**；**未执行 `S-01`–`S-07`、未执行 `SP-01a` / `SP-01b`**；**未产生任何费用**；**未修改 `TQ01`–`TQ05` 任何状态**；**未写"腾讯云已成为最终生产平台" / "组合甲已成为正式生产架构" / "路径 (a) 已成为正式生产触发器架构"**；**未修改** `SP-01a_RESOURCE_DISCLOSURE_PACK.md`（历史产物一字未动）、`S00-03_技术决策包.md`、五份 Worker 产出（`01`–`05`）、`SP-03` / `SP-03R` 及任何 canonical；**未进入** Phase 2 / Gate B / 正式编码。
- **标志位**：`RESOURCE CHANGE REQUIRED` = **NO**（预判触发清单 6 条已登记）｜`BILLING CHANGE REQUIRED` = **NO**｜`BLOCKER` = **NO**｜`CCR` = **无**｜`PRODUCT SEMANTIC CONFLICT` = **无**｜**`DECISION REQUIRED` = YES（2 项：资源组合 / `R1` 触发器路径，均待项目负责人裁决）**。
- **落盘位置**：`20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（A–J 共 10 节，就地 Patch）｜**新增** `20_INTEGRATION/SP-01a_CREATE_READY_PATCH_REPORT.md`（含 13 节 + `【SP-01a CREATE READY PATCH RESULT】`）｜本文件。
- **阶段状态**：**`S00-03` = 已启动 / 未关闭**；**`SP-01` = `APPROVED` / 未执行**；**`SP-01a` = 未执行**；**`TQ01`–`TQ05` 全部仍 `PROPOSED`、仍留 Gate B**；**当前 Gate = `READY FOR ACCOUNT-LEVEL BACKFILL`**。

## 2026-09-20 — S00-03 / `SP-01` 执行批准（人工批准登记）

本次为**人工批准的状态登记**，**不涉及代码变更、不执行任何实测、不进入编码阶段**。

- **人工批准（2026-09-20，项目负责人）**：**`SP-01` 执行批准 = `APPROVED`**。
- **性质与边界（严格按 `20_INTEGRATION/S00-03_技术决策包.md` §N.7）**：
  - **批准 ≠ 执行**（§N.7 第 5 条）：执行须经人工批准，但**批准本身不等于已完成实测** ⇒ **`SP-01` 当前状态 = 已批准 / 未执行**；
  - **批准 ≠ 已选定平台**（§N.7 第 6 条）：**不得被解读为"已经选定某平台"**；**本次未落平台名、未编造平台名、未代选**；
  - **`SP-01` 不得被改判为 `BLOCKER`**（§N.7 第 4 条）；仍为 **`TQ02` / `TQ05` 最终裁决前的 P0 证据**；
  - **SP-01 结论不得改变任何产品语义**、**其阈值不得进入产品层 / 不得写入 `AC` 断言**（§N.7 第 7 / 8 条）；**`SP-01` 的 `PASS` 不得写成对 `TQ02` / `TQ05` 的 `CONFIRM`**（§N.7 第 6 条）。
- **有效测试对象**（§N.7 第 3 条）：`20_INTEGRATION/S00-03_技术决策包.md` **§N.1 Primary**（`TQ01` `A1` 宿主 + `TQ02` `DP-A` 按量子形态）/ **§N.2 Fallback**（`TQ01` `A2` 宿主 + `TQ02` `DP-A` 长驻子形态）；**须成对验证（宿主 + 数据层）**。
- **🔴 执行前置（尚未满足，须人工提供后方可启动实测）**：
  1. **具体托管平台落名**（Primary 宿主平台 + 托管 PostgreSQL 平台，成对）；
  2. **账号 / 凭据获取方式**，以及**"允许在真实云平台创建资源"的明确授权**（可能产生计费）；
  3. **执行网络口径**：§N.3 `S-01` 要求"**从现场网络**"实测 ⇒ 需说明现场网络是否可复现；**若不可复现，只能给出"非现场网络条件下的部分结论"并如实标注射程**；
  4. **执行窗口与资源保留时长**。
- **落盘位置**：`20_INTEGRATION/S00-03_技术决策包.md` —— 顶部《POST-INTEGRATOR HUMAN DECISION STATUS》新增《🟢 `SP-01` 执行批准（2026-09-20）》段；**§M.1** `SP-01` 行补注；**§N** 头部补注批准状态；**§S.4 第 9 项**更新为已批准；**§S.6** 状态补注同步。**原有 `SP-01` TEST TARGET PACK（§N.1–§N.7）内容一字未改。**
- **未做（边界确认）**：**未执行 `SP-01`**；**未创建任何云资源 / 未部署 / 未建数据库**；**未落具体平台名**；**未 `CONFIRM` `TQ01`–`TQ05`**；**未进入 Gate B / Gate C**；**未开始 Local Landing**；**未创建任何 `Decision ID`**；**未修改 Worker / Spike 历史文件**。
- **非阻塞遗留项变更**：`SP-01` 执行批准 —— 由「**待人工批准**」更新为「**已批准 / 未执行**」；该项**已不再是待批准项**，转为**执行前置待落实**。
- **追加（同日，执行前置推进）**：
  - **执行网络口径已确认**：**现场网络可复现 = 是** ⇒ §N.3 的 `S-01` / `S-08` / `S-09` 可**按原口径执行并给出完整结论**，**`SP-01` 可产出完整 P0 证据**（仍须提供现场网络环境说明与执行窗口）。
  - **新增 `20_INTEGRATION/S00-03_技术决策包.md` §N.8《`SP-01` 平台落点候选对比》（`PROPOSED` / 待人工裁决）**：按项目负责人要求给出 3 组候选 —— **`P-1` 托管 Serverless 全栈（腾讯云族）**｜**`P-2` 托管 Serverless 全栈（阿里云族，等价族）**｜**`P-3` 轻量长驻单进程 + 托管数据库（= §N.2 Fallback）**，各含形态对应（`TQ01` / `TQ02`）、结构性优势、结构性风险与 `PROPOSED` 组合建议（**Primary 取 `P-1`/`P-2` 之一；Fallback 固定 `P-3`**，与 §N.4 的降级路径对齐）。🔴 **未选定平台、未执行 `SP-01`、未创建任何资源**；🔴 **§N.8 对免费额度 / 冷启动 / 执行时长 / 连接数不作任何数值断言**（均属 §N.3 `S-02`/`S-03`/`S-05`/`S-06` 的实测项）；**平台族偏好属部署配置层，不得写入产品层 / 不得写入 `AC`**。**§N.1–§N.7 原文一字未改。**
  - **新增 §N.9《`SP-01` 成本纪律》（🔴 人工约束）**：依项目负责人 2026-09-20 指令 —— **默认只用免费额度 / 免费试用**；🔴 **任何预计产生实际付费的资源（超出免费额度 / 按量计费 / 包周期 / 独立 IP·带宽·存储·出网·备份·日志等附加计费项），创建前必须先说明「资源 + 规格 + 预计费用」并等待项目负责人【再次确认】**；**未获二次确认不得创建、不得先创建后补报**。并明确：**免费额度不足时不得自行降级 / 缩减测试项 / 采购**，须报缺口 + 给出「付费 / 缩减范围 / 换平台」三类选项由项目负责人裁决；`SP-01` 完成后**默认释放按量计费资源**；**报告须逐项注明资源来源**。⚠️ **§N.9 不预填任何厂商的免费额度数值或计费口径**（属 §N.3 `S-05` 实测 / 核对项）。**§N.1–§N.8 原文一字未改。**
  - **新增 §N.10《`SP-01` 凭据与安全口径》（🔴 人工决策）**：**以项目负责人本人登录云控制台为主**；🔴 **不提供主账号长期密钥**（`SecretId` / `SecretKey` 形式一律不提供）；**仅在"自动化必须使用密钥"时**允许创建**临时最小权限子账号凭据**（须逐项说明用途 / 权限最小集 / 有效期 / 销毁时点并经确认）；**凭据不得写入任何文件 / 日志 / 报告 / Prompt / 脚本参数、不得提交版本库、不得出现在前端产物与响应体**（对应 `S-10`）；**临时凭据用毕即销毁并登记**；**AI 不持有控制台登录态**，控制台内创建 / 变更由项目负责人执行。
  - **新增 §N.11《🔴 `SP-01` 执行时序的结构性缺口》（需人工裁决；只提示、不擅自改写）**：指出 **§N.7 第 2 条**（`SP-01` 须在 Gate B 裁决 `TQ02`/`TQ05` 前完成）与 **§N.3 中 4 项依赖可运行业务应用的实测**（`S-03` 的 ⑧⑨ LLM 耗时 / `S-08` ①→⑩ 全链 / `S-09` 展示机 / `S-10` 密钥边界）**在编码开始前无法真正完成**这一缺口；给出三方案 —— **A 两段式（`SP-01a` 编码前 6 项最小探针 / `SP-01b` 编码后 4 项；建议）**、**B 整体推到编码后（违背 §N.7 第 2 条，不推荐）**、**C 强探针近似（结论须标"近似"）**，**由项目负责人裁决**。🔴 **未擅自修改 §N.3 / §N.7**。
  - **`§N.8` 落名（人工裁决）**：**Primary = `P-1`（腾讯云族）；Fallback = `P-3`**；`P-2`（阿里云族）未采用、按 §N.6 保留为等价候补。🔴 **族级落名 ≠ 已选定具体平台**；具体产品名与实例规格须在创建前按 §N.9 逐项报备。
  - **`§N.9` 追加人工补充授权**：**允许创建临时按量测试资源；`SP-01` 结束后删除未选中资源；仅最终选中的环境保留到后续彩排**。🔴 **该授权是否免除 §N.9 第 2 条的"逐项报备 + 再次确认"，未作推定 —— 待项目负责人明示；在明示前按 §N.9 第 2 条执行。** 删除动作须先列资源清单并经确认（避免误删最终环境的共享依赖）。
  - **`§N.11` 裁决（人工选择 §N.11 方案 A｜两段式）**：**`SP-01a`（编码前 / Gate B 前）= `S-01` / `S-02` / `S-04` / `S-05` / `S-06` / `S-07`（最小探针）**；**`SP-01b`（编码后 / 实现期）= `S-03` / `S-08` / `S-09` / `S-10`**；**附带批准对 §N.3 作 a / b 分段**（**不改变各项的观测内容、PASS 条件、FAIL 条件与失败归属**）。🔴 **`SP-01b` 未完成前不得声称 `SP-01` 整体已完成**；**`S-03` 的真实 ⑧⑨ LLM 耗时在 Gate B 时仍未知，须如实标注"待 `SP-01b`"**。
  - **`§N.9` 补充授权的关系已澄清（人工确认）**：**"允许创建临时按量测试资源"是原则性许可（授权类别），不免除 §N.9 第 2 条的"逐项报备 + 再次确认"** ⇒ **创建 `SP-01a` 资源前仍须先报「资源 + 规格 + 预计费用」并等待再次确认**。
  - **新增 §N.12《`SP-01a` 资源报备清单与执行骨架》（按 §N.9 第 2 条报备）**：给出 **`R1` Serverless 函数服务 / `R2` 静态托管 / `R3` 托管 PostgreSQL / `R4` 域名（条件项，默认不建）/ `R5` 临时最小权限子账号凭据（条件项，默认不建）** 五项的资源报备表（**规格与预计费用口径留待项目负责人在控制台核对回填**）+ **最小探针性质**（静态页 + 一个服务端函数 + 一张表；不含业务规则 / 不含 `D9` 逻辑 / 不含 AI 调用；`DISPOSABLE / NON-PRODUCTION`；不得写入 `src/`）+ **步骤 0–8 执行骨架**（含步骤 1 的创建前确认点、步骤 4 的 6 项实测、步骤 7 的 FAIL 回开由项目负责人裁决）。🔴 **AI 未预填任何产品名 / 规格 / 费用数字**；**未创建任何资源**。
  - **执行前置当前状态**：① 平台落名 = ✅ **已落族级（`P-1` / `P-3`）**｜② 计费授权口径 = ✅ **已定义（§N.9）**／凭据口径 = ✅ **已定义（§N.10，控制台登录为主）**｜③ 执行网络口径 = ✅ **已确认（现场网络可复现）**｜④ 资源生命周期 = ✅ **已定义**／**执行窗口 = 🔴 未落实**｜⑤ 时序方案 = ✅ **已裁决（A 两段式）**｜⑥ 资源报备 = 🟡 **§N.12 清单已出，待你在控制台核对规格与计费口径后回填并【再次确认】创建**｜⑦ 现场网络环境说明 = 🔴 **未落实**。
- **阶段状态**：**`S00-03` = 已启动 / 未关闭**；`DECISION REQUIRED` = 0；`BLOCKER` = 无；`CCR` = 无；`PRODUCT SEMANTIC CONFLICT` = 无；**`Gate B` 未进入**；**流程仍为 `D-051`/`D-052` → `SP-01` → Gate B → Local Landing → Gate C**。

## 2026-09-20 — S00-03 / Post-Integrator Human Decisions（`D-051` / `D-052` 落盘 + Gate B / `SP-01` 时序校正）

本次为**人工决策落盘与文档同步 + Integrator 过程文档的就地补丁**，**不涉及任何代码变更，不进入编码阶段**。

- **性质**：**POST-INTEGRATOR HUMAN DECISION PATCH** —— 落盘项目负责人对 `20_INTEGRATION/S00-03_技术决策包.md` §R 两项 `DECISION REQUIRED` 的人工裁决结果；**不重写原 Integrator 推理**（其 `NEEDS DECISION` 保留为**生成当时的历史状态**，**未伪装成当时即 `PASS`**）。
- **`DR-01` → `D-051`（`CONFIRMED`）**：**人工选择 C，但采用「收窄版 C」** —— **显式重新生成时保留旧产物，并按生成批次区分「当前生成结果」与「较早生成结果」**：**旧 `Insight` / `Hypothesis` 不得被删除 / 覆盖 / 自动迁移状态**；**较早结果默认折叠、可展开查看**；**统一称谓「较早生成结果」**，🔴 **禁止「旧版本 / 历史版本 / 第 N 版 / 更早的候选经验」**（**较早 `Insight` 可能已是 `accepted`，不得把 `accepted` 重新叫成候选**）；**较早 `accepted Insight` 仍是 `accepted Insight`**，**继续遵循 `Experience Asset` = accepted Insight 视图**，**只有用户显式 `revoke` 才退出**；**旧 `Hypothesis` 的 `decision_state` 不变、新 `Hypothesis` 不继承旧 `decision_state`**；「当前生成结果」**不含任何等级语义**；**较早 `Hypothesis` 不因存在而自动成为新一轮推理输入**；**重新检索 ≠ 自动重新生成 ⑧ / ⑨**；🔴 **不建立版本系统**（禁止 `version number` / `generation version number` / 版本列表 / 版本比较 / 版本回滚 / "第 N 次生成"计数 / 修改次数 / `diff` / `restore old version`）。
- **`DR-02` → `D-052`（`CONFIRMED`）**：**人工选择 B** —— 「**调整热风参数**」vs「**调整送风参数**」= **`compared_not_matched`**（**不得判 `matched`**）；**理由 = 两者属可区分的具体技术对象 / 参数对象；同一参数族 / 技术类别 ≠ 语义等价**；**`CASE-05` 的 `related = true` 保持不变**（`actual_result` 已有独立 `matched`，**`D-052` 不翻转 `related`**）；**用户可感知影响 = ⑦ 中不显示该 `actual_attempt` 相似点**；`compared_not_matched` **继续为纯内部量**（不显示数值 / 不形成负面等级 / 不计数 / 不参与相关性评分 / 不产生 `similarity score`）。
- **决策落盘**：`docs/DECISIONS.md` 在 `D-050` 之后**续接新增 `D-051` / `D-052`**（含 `Decision ID` / 来源阶段 / 触发问题 = `DR-01`·`DR-02` / 候选 A·B·C / 人工选择 / 最终语义 / 核心约束 / 主要放弃方案 / 理由 / 影响范围 / 编号说明 / 日期 / `CONFIRMED`）；文件头**编号空间列举新增 `D-051`、`D-052`**；《S00-03 人工决策》章节头**新增 POST-INTEGRATOR 追加指针**；**`D1`–`D10` / `R1`–`R6` / `D-001`–`D-050` 一字未改**；**`ADJ-01` 的 `CLOSED / DERIVED` 状态未变**。
- **Shared Contract 版本推进**：`v0.2.4 DRAFT / D-050 对齐版` → **`v0.2.5 DRAFT / D-051+D-052 对齐版`**（**仍为 DRAFT —— 未 `FROZEN` / 未 `CONFIRMED`，不可作为实现依据**）。同步落点：
  - **新增 §2.4**《显式重新生成后的产物语义与「生成批次」》—— 含"生成批次 / 当前·较早 / 旧状态保持 / 较早 `accepted Insight` 仍遵循 `Experience Asset` / 旧 `Hypothesis` 的 `decision_state` 保持 / 展示口径 / 统一与禁止称谓 / 不建立版本系统 / 与 `D-040`·`D-045`·`D-049` 的边界 / 推理输入"；
  - **新增 §9.5**《重新检索 / `Insight` 重新生成 / `Hypothesis` 重新生成 的三层区分与不级联》—— **三者互不自动级联**；**均须用户显式发起**；**不得后台 / 异步 / 批量 / 定时**；
  - **§9.4 追加 `D-052` 负例**（`actual_attempt` 行 + "明确不充分"清单 + 用户可感知影响 + 依据行）；**§8.6 新增第 9 条**；**§9 第 ⑧ / ⑨ 步行**（系统行为 + 依据补 `D-051` / `AC-116`–`AC-123`）；**§12 第 6 项**依据补 `D-052`、**§12 新增第 20 项**；
  - **§13.5 新增两行**（`DR-01` → `D-051`；`DR-02` → `D-052`）+ 补注"`20_INTEGRATION/` 为非 canonical 过程文档；其 `NEEDS DECISION` 属生成当时历史状态"；
  - **§0.1 补时序校正**（`Integrator` → `D-051` / `D-052` 落盘 → **`SP-01` 实测候选环境** → `TQ01`–`TQ05` 最终 Gate B 裁决 → `Local Landing` → `Gate C`）；**§14 第 4 条 / §14.1 / §15** 推进版本。
  - **未新增 CCR，未处理 CCR 仍 = 0。**
- **🔴 流程时序统一（本次校正的唯一口径）**：**Decision Landing（`D-051` / `D-052` 落盘）→ `SP-01` → Gate B（`TQ01`–`TQ05` 最终裁决）→ Local Landing → Gate C**。**原因 = `SP-01` 是 `TQ02` / `TQ05` 最终裁决前的 P0 证据**。**`SP-01` 不得被写成 BLOCKER**（它只前置约束 `TQ02` / `TQ05` 的最终裁决时点）。
- **Integrator 过程文档就地补丁**：`20_INTEGRATION/S00-03_技术决策包.md` **只做 POST-INTEGRATOR HUMAN DECISION PATCH**（**未重写原 Integrator 推理**）—— 顶部新增《POST-INTEGRATOR HUMAN DECISION STATUS》（含 `DR-01` / `DR-02` 关闭表、边界清单、校正后时序）；**§A.2 / §A.3 就地补注**；**§P.3 改写为校正后顺序并留存原文**；**§Q 结论块改写为 `READY FOR SP-01` 并留存原文**；**§R 就地补注 + `DR-01` / `DR-02` 各追加人工裁决结果段**；**§S.1 / §S.4 / §S.6 / 文末**就地补注。
- **已同步的正式产品文档**（**只做最小必要同步**）：
  - `03_V1_SCOPE.md` —— 新增《S00-03 范围边界同步（`D-051`）》：**V1 不建立生成版本管理 / 生成结果版本号 / 生成版本对比 / 生成版本回滚 / "第 N 版" / 修改次数**；**允许显式重新生成后以「当前生成结果 / 较早生成结果」做非版本化折叠展示**；**必须注明这不等于 `Hypothesis` / `Insight` 变成可编辑版本系统**；含防误伤核对表
  - `04_USER_FLOW.md` —— 新增《S00-03 决策同步（`D-051`）》：**`Formal` 内容修改 → stale warning → 用户显式重新检索 →（若用户再显式发起）重新生成 → 新的当前生成结果；此前生成结果保留 + 默认折叠 + 状态不变**；**不得由重新检索自动触发 ⑧ / ⑨**；**不得增加 `D9` 新步骤编号**；含展示口径表、用户可执行动作表、明确不做清单、与 `D-040` 的边界
  - `05_DATA_MODEL.md` —— 新增《S00-03 决策同步（`D-051`）》：**只同步逻辑语义**（**同一 `Attempt` 允许存在不同生成批次的 `Insight` / `Hypothesis`**）；**列出必须满足的 5 条性质**（识别当前生成批次 / 保留较早结果 / 各 `Insight` 原状态保持 / 各 `Hypothesis` `decision_state` 保持 / 较早 `accepted Insight` 继续参与 `Experience Asset` 视图）；🔴 **不建 `version_number` / `revision_number` / version history 实体 / 不新建「Version」产品对象 / 不引入新的用户产品状态枚举**；**物理标记方式留 Local Landing / 实现层**；**未设计 SQL / 字段类型 / 索引**；**未 `CONFIRM` `TQ02`**
  - `06_AI_CAPABILITIES.md` —— 新增《S00-03 决策同步（`D-051` / `D-052`）》：**重新生成时 AI 只产生新输出**，**不得改写旧输出 / 自动改变旧 `decision_state` / 自动撤销旧 `accepted Insight` / 自动删除旧 `Hypothesis`**；**新 `Hypothesis` 不得继承旧 `decision_state`**；**不得因旧 `Hypothesis` 存在就自动将其作为推理依据**；**`actual_attempt` 判定加入 `D-052` 负例**；含 11 条 AI 行为红线与未确定细节
  - `08_UI_SPEC.md` —— 新增《S00-03 决策同步（`D-051` / `D-052`，仅界面约束）》：**最新生成批次默认展开 / 较早生成结果默认折叠**；**建议文案概念「当前生成结果」「较早生成结果」**；🔴 **禁止「第 1 版」「第 2 版」「历史版本」「版本对比」「恢复此版本」**；**旧结果如实显示真实状态（`accepted` / `candidate` / `rejected` / `undecided`），不得统一改写成「候选」**；**⑦ 不得把「调整热风参数」vs「调整送风参数」展示为相似点**；含 9 条界面红线与留待后续裁决项
- **`09_TEST_PLAN.md`** —— **先读取文件确认当前实际最大连续编号 = `AC-115`，再顺延新增** **`AC-116`–`AC-126`（共 11 项）** + **15 条回归检查项**：`D-051` 覆盖 8 项（**A 旧产物仍存在 / B 当前·较早展示 / C 旧 `accepted` 仍符合 `Experience Asset` 视图 / D 旧 `candidate`·`rejected` 不变 / E 旧 `Hypothesis` `decision_state` 不变且新者不继承 / F 重新检索不自动重生成 ⑧⑨ / G 不存在版本系统 / H 旧 `Hypothesis` 不自动成为新一轮推理输入**）；`D-052` 覆盖 3 项（**I `compared_not_matched` / J ⑦ 不显示该相似点 / K `CASE-05` 的 `related` 仍 = `true`**）。🔴 **`AC-01`–`AC-115` 一字未改、未重排任何旧编号**；🔴 **`AC-111` 未被修改**（`actual_attempt` 同口径追加**由新编号承接**）；**`TE-*` 仍为 `05_TEST_DEMO_DEPLOY.md` 内部编号，不是 canonical `AC`**。
- **未修改（明确记账）**：`docs/architecture/01_APP_ARCHITECTURE.md`（`S03-A`）、`02_DATA_AND_STATE.md`（`S03-B`）、`03_AI_PIPELINE.md`（`S03-C`）、`04_RETRIEVAL_AND_COMPARISON.md`（`S03-D`）、`05_TEST_DEMO_DEPLOY.md`（`S03-E`）—— **五份 Worker 历史产出一字未动（仍为 `PROPOSED`）**；`30_SPIKES/retrieval/SP-03_LevelA_相关性判定可行性.md`、`SP-03R_LevelA_严格语义重叠复测.md` —— **Spike 历史文件一字未动**；`D-050` / `D-049` / `ADJ-01` 的决策正文；`D-039`–`D-048` 及其它已 `CONFIRMED` Decision；`docs/01` / `02` / `07`（本次无需同步）。
- **未做（边界确认）**：**未 `CONFIRM` `TQ01` / `TQ02` / `TQ03` / `TQ04` / `TQ05`（五项仍全部 `PROPOSED`、仍留 Gate B）**；**未执行 `SP-01`**；**未选择具体托管平台**；**未选择最终 LLM provider**；**未写业务代码 / 未写 SQL / 未部署**；**未开始 Local Landing**；**未进入 Gate B / Gate C**；**未创建 `D-053`**；**未把 Shared Contract 整体写成 `CONFIRMED` / `FROZEN`**。
- **完成后自检（13 项，全部通过）**：① `D-051` = `CONFIRMED` ✅ ② `D-052` = `CONFIRMED` ✅ ③ `DR-01` = `CLOSED` ✅ ④ `DR-02` = `CLOSED` ✅ ⑤ Shared Contract = **`v0.2.5 DRAFT`** ✅ ⑥ 较早 `accepted Insight` 未被自动降级 ✅ ⑦ 未建立版本系统 ✅ ⑧ `D-052` = `compared_not_matched` ✅ ⑨ `CASE-05` 的 `related` 仍 = `true` ✅ ⑩ `TQ01`–`TQ05` 全部仍未 `CONFIRM` ✅ ⑪ `SP-01` 未执行 ✅ ⑫ Gate B / `SP-01` 顺序已修正 ✅ ⑬ Worker / Spike 历史文件均未改 ✅
- **阶段状态**：**`S00-03` = 已启动 / 未关闭**；`S03-A`–`S03-E` 已产出（均 `PROPOSED`）；**`SP-01` 未执行**；**`Gate B` 未进入**；**技术栈未选择 / DB 未确定 / API 未确定 / 编码未开始 / 未做 UI 视觉设计**。**`DECISION REQUIRED` 当前 = 0；`BLOCKER` = 无；`CCR` = 无；`PRODUCT SEMANTIC CONFLICT` = 无。**

## 2026-09-19 — S00-03 / `SP-03` 人工决策落盘（`D-050`）：Level A 维度 `matched` 的严格语义重叠判据

本次为**决策确认与文档同步**，不涉及任何代码变更，**不进入编码阶段**。

- **背景**：`SP-03`（`30_SPIKES/retrieval/`，`DISPOSABLE / NON-PRODUCTION`）**`RESULT = INCONCLUSIVE`** —— `related` 与 `uncompared` 完全稳定、`H1`–`H10` 全通过，但 **`matched` 集合在 5/8 `CASE` 上随运行变化**（漂移方向 100% 过判、漏判 0），故不能 `PASS`、也不构成 `FAIL`。**`SP-03` 暴露了 Level A「`matched`」的语义边界歧义**：**根因 = canonical 未定义「构成可比对重叠」的判据** —— 观测到**读法 α（同一件事，严格）** 与 **读法 β（同一类事，宽松）** 两种读法，6 个独立会话中 **4 个**至少在一处采用 β；两种读法会产生**不同的 ⑦「相似点」内容**，**属用户可感知行为**，canonical 无法唯一推出。
- **人工裁决（2026-09-19，项目负责人）**：**选择方案 A｜严格语义重叠**（即**读法 α**）。
- **`D-050` 正式结论**：**Level A 某一维度只有在两侧表达「相同的实质内容」或「语义等价的改写」时，才允许判 `matched`。**
  - **允许的等价形式**：**① 同义改写**；**② 表述顺序不同但实质相同**；**③ 单位等价表达**；**④ 不改变实质含义的语言改写**。
  - **本身不构成 `matched` 的宽松命中**：**属于同一类别 / 同一主题 / 使用同一参数类型 / 使用同一指标名称 / 都在讨论同一种现象 / 都属于同一种技术大类**。
  - **逐维度判据与反例**：`goal` —— 「降低颜色变化」vs「缩短干燥时间」= `compared_not_matched`；`actual_attempt` —— 仅"都是干燥方法 / 都是模型训练方法"不充分；`condition` —— 「`50°C`」vs「`50 摄氏度`」= `matched`，「`50°C`」vs「`70°C`」= `compared_not_matched`；`actual_result` —— 「幻觉引用减少」vs「无效引用明显下降」= `matched`，「出现明显开裂」vs「无明显开裂」= `compared_not_matched`，「含水率仍偏高」vs「含水率达到要求」= `compared_not_matched`。
  - **`unknown` 规则完全不变**：任一侧 `presence_state = unknown` ⇒ **`uncompared`**，**不得进入** `matched` / `compared_not_matched` 判定；**双方都 `unknown` 仍然不能 `matched`**。
  - **本 Decision 不改变**：Level A 仍只有四维度、Level B / Level C 定义、`D-019` / `D-020` / `D-025` / `D-037`、`TQ13` / `TQ14` 的"不引入"结论、数值相似度禁令、`Project` 不得作准入过滤、`unknown` 不参与比较、`Fact` / `Extraction` / `Inference` 边界、**`TQ04` 仍属 `Gate B`**、**`R-A` 仍只是 `PROPOSED`**。
  - **尤其不得新增**：`≥2` 个维度命中门槛 / "必须命中 `goal`" / 权重 / `similarity score` / `confidence` / `rank score` / 百分比 / 等级。
  - **射程边界**：**`D-050` 只定义"单个 Level A 维度何时叫 `matched`"**；**`S03-D` 的 `matched_level_a_dimensions` 非空 → `related` 仍属 `S03-D` / Integrator 的架构收敛项** —— **`D-050` 未将其 `CONFIRM`**。
- **主要放弃方案（宽松类别重叠 / 读法 β）**：**「只要属于相同目标类型 / 方法类型 / 条件类型 / 现象类型即可 `matched`」**。
  - **放弃理由**：① **不同具体条件误判相似**（`50°C` vs `70°C`）；② **相反结果误判相似**（"开裂" vs "无开裂"）；③ **Level A 相关集合膨胀**；④ **⑦ 出现不真实相似点**；⑤ **可解释性下降**。
- **决策落盘**：`docs/DECISIONS.md` 在 `D-049` 之后**续接新增 `D-050`**（含 `Decision ID` / 来源阶段 / 触发问题 / 决策主题 / 备选方案 / 最终结论 / 核心约束 / 主要放弃方案 / 理由 / 影响范围 / 日期 / `CONFIRMED`）；文件头**编号空间列举新增 `D-050`**；**`D1`–`D10` / `R1`–`R6` / `D-001`–`D-049` 一字未改**；**`D-050` 与 `ADJ-01` 无关**（**已在 `D-050` 条目内就地注明**：各文档中「`ADJ-01` 关闭不创建 `D-050`」的表述**继续有效**，属 `ADJ-01` 关闭当时的历史表述）。
- **Shared Contract 版本推进**：`v0.2.3 DRAFT / ADJ-01 派生关闭版` → **`v0.2.4 DRAFT / D-050 对齐版`**（**仍为 DRAFT —— 未 `FROZEN` / 未 `CONFIRMED`，不可作为实现依据**）。同步落点：**§9 新增 §9.4**《第 ⑥ 步 Level A 维度 `matched` 的严格语义重叠判据》（**判据契约层落点**）、**§9 第 ⑥ 步行**（系统行为补"逐候选 × 逐维度三态判定"；依据补 `D-050`）、**§9.3 就地补注**、**§6.1 指针**、**§12 第 6 项**、**§13.5 新增一行**（`SP-03` `DECISION REQUIRED` → `D-050`）、**§13.6 就地补注**、**§14 第 4 条**（版本链推进）、**§14.1**（注明"本版无新增 CCR"）、**§15**（新增 v0.2.4 变更行）。**未新增 CCR，未处理 CCR 仍 = 0。**
- **已同步的正式产品文档**（**只做最小必要同步**）：
  - `06_AI_CAPABILITIES.md` —— 新增《S00-03 决策同步（`D-050`）》：**A3 的 Level A 维度判定行为要求**（**AI 输出只能是 `matched` / `compared_not_matched`（双方均 `present` 前提）**；**`matched` 采用 `D-050` 严格语义**；**禁止类别级宽松匹配 / 数值分数 / `confidence` / 相似度 / 因主题相同直判 `matched`**；**`unknown` 仍由结构规则拦截、不得交给 AI 猜测**）+ **6 条 AI 行为红线** + **未确定细节**
  - `09_TEST_PLAN.md` —— **顺延新增 `AC-109`–`AC-115`（共 7 项）+ 8 条回归检查项**；**`AC-01`–`AC-108` 一字未改、未重排任何旧 `AC` 编号**（**沿用当前实际最大编号 `AC-108` 顺延**）
- **为何新增 `AC`**：覆盖任务要求的 7 个场景 —— **A `50°C` vs `70°C`**（`AC-109`）、**B 出现开裂 vs 无开裂**（`AC-110`）、**C 降低颜色变化 vs 缩短干燥时间**（`AC-111`）、**D "避免虚假引用" vs "不引用不存在的记录" = `matched`**（`AC-112`）、**E `50°C` vs `50 摄氏度` = `matched`**（`AC-113`）、**F 任一侧 `unknown` ⇒ `uncompared`**（`AC-114`）、**G 类别相同但实质不同不得进入 `matched`**（`AC-115`）。
- **未修改（明确记账）**：`docs/architecture/04_RETRIEVAL_AND_COMPARISON.md`（**`S03-D` Worker 原产物，一字未动**，仍为 `PROPOSED`）、`30_SPIKES/retrieval/SP-03_LevelA_相关性判定可行性.md`（**Spike 产物，一字未动**）、`docs/architecture/03_AI_PIPELINE.md`（`S03-C`）、`docs/architecture/01_APP_ARCHITECTURE.md`（`S03-A`）、`docs/architecture/02_DATA_AND_STATE.md`（`S03-B`）、`docs/architecture/05_*.md`（`S03-E` 未启动）、`D-027` / `D-049` 的决策正文、`D-039`–`D-048` 及其它已 `CONFIRMED` Decision。
- **未做（边界确认）**：**未写业务代码**；**未做技术选型**；**未 `CONFIRM` `TQ04`**；**未 `CONFIRM` `R-A`**；**未创建 `D-051`**；**未执行 `SP-03R`**；**未进入 `S03-E`**；**未处理 `TQ01`–`TQ05`**；**未把 Shared Contract 整体写成 `CONFIRMED` / `FROZEN`**。
- **阶段状态**：**`S00-03` = 已启动 / 未关闭**；`S03-A` / `S03-B` / `S03-C` / `S03-D` 已产出（均为 `PROPOSED`）；`S03-E` 未启动；**`SP-03` 已执行（`INCONCLUSIVE`）**；**技术栈未选择 / DB 未确定 / API 未确定 / 编码未开始 / 未做 UI 视觉设计**。**`SP-03R` 将依据 `D-050` 复测（前置仍需人工批准；本阶段不执行）。**

## 2026-09-19 — S00-03 / `ADJ-01` 派生关闭（`ADJ-01 = CLOSED / DERIVED`）

本次为**已确认 Decision 的组合解释闭合与文档同步**，不涉及任何代码变更，**不进入编码阶段**。

- **背景**：`D-049`（`CONFIRMED`）落盘时登记了 **1 项邻接语义待人工确认** —— **`ADJ-01`**：`D-027` 第 ⑤ 项「**用户本人明确指定"保持某条件" = 用户 `Fact`**」的 **V1 落点**（① 随 ⑤ 只读而**不发生**；② ⑤ 的**并列用户条目**；③ **仅**在 `Formal Attempt` 层表达并由 ⑤ 作为 `Fact` **引用**）。**该项不阻塞 `S00-03`，但阻断该语义的最终实现口径。**
- **人工裁决（2026-09-19，项目负责人）**：**选择方案 3（读法 ③）**。
- **`ADJ-01` 正式结论**：**`ADJ-01 = CLOSED / DERIVED`**。
  - **关闭依据 = `D-027` + `D-049`** —— `D-027` 要求第 ⑤ 项**保留三类来源语义**（历史条件值 = `Fact` / `Extraction` 引用；**AI 建议保持某条件 = `Inference`**；**用户本人明确指定保持某条件 = 用户 `Fact`**），故该 `Fact` 通道**必须存在** → **读法 ① 排除**；`D-049` 要求 **⑤ 本身只读**、**不得提供 ⑤ 的直接编辑入口 / 用户输入框 / 并列用户条目 / `Hypothesis` 内的"保持条件"编辑入口** → **读法 ② 排除**；**唯一自洽读法 = 读法 ③**。
  - **关闭结论**：**用户本人指定的第 ⑤ 项"保持条件"只从 `Formal Attempt` 中已有的用户 `Fact` 获得；`Hypothesis` 第 ⑤ 项本身保持只读并引用该 `Fact`。**
  - **唯一输入落点 = `Formal Attempt` 层**：用户在 `Formal Attempt` 中明确写入 / 补充「下一轮保持 X 不变」或等价内容，该内容**保存为用户 `Fact`**；`Hypothesis` 第 ⑤ 项**只允许引用 / 展示**该既有 `Fact`；**不得**在 `Hypothesis` 内新建用户 `Fact`、**不得**就地修改原 `Fact`、**不得**把 AI `Inference` 改成 `Fact`、**不得**把 `Fact` 与 AI `Inference` 合并为混合来源。
  - **用户在看到 `Hypothesis` 之后才决定"要保持某条件"时的合法流程**：**回到相关 `Formal Attempt` → 增加 / 修改对应用户 `Fact` → 显式发起重新检索 / 重新生成** —— **属既有重跑路径，不是 `D9` 新增步骤**。
  - 🚩 **本次关闭不创建 `D-050`**、**不改变 `D-027` 原决策语义**、**不改变 `D-049` 原决策语义**、**不新增任何产品机制** —— **属已有 `CONFIRMED` Decision（`D-027` + `D-049`）的组合解释闭合**。**也不新增**：`Hypothesis` 新状态 / 第 ⑤ 项编辑通道 / 新引用体系 / 新来源类型 / 新状态回退机制 / 新版本历史。
- **决策落盘**：`docs/DECISIONS.md` **只更新 `D-049` 的《邻接语义》段**（标题改为《邻接语义（✅ 已关闭 / 派生）》，状态由「**需人工确认**」更新为 **`CLOSED / DERIVED`**，并记录裁决、依据、结论、唯一输入落点、不新增清单）；`D-049` 头部**就地补注**该状态更新；**`D-027` 与 `D-049` 的决策正文语义一字未改**。
- **Shared Contract 版本推进**：`v0.2.2 DRAFT / D-049 对齐版` → **`v0.2.3 DRAFT / ADJ-01 派生关闭版`**（**仍为 DRAFT —— 未 `FROZEN` / 未 `CONFIRMED`，不可作为实现依据**）。同步落点：**§2.3**（第 ⑤ 项仍标**只读**，删除"邻接项待确认"标注，改为"**唯一输入落点 = `Formal Attempt` 层用户 `Fact`**"，并新增一条硬约束）、**§8 第 8.6 条第 7 条**（原"邻接待确认"**改写**为已关闭的派生规则；§8.6 标题同步）、**§9 新增 §9.3**（第 ⑤ 项"保持条件"用户 `Fact` 的进入点与重跑路径；**跨步补充说明，不是 `D9` 新增步骤**）与**第 ⑨ 步行**同步、**§12 第 19 项**同步、**§13.6** 由《邻接待确认项》改写为《邻接项派生关闭》（**`ADJ-01 = CLOSED / DERIVED`**）、**§14 第 4 条**（版本链推进）、**§14.1**（注明"本版无新增 CCR"）、**§15**（新增 v0.2.3 变更行）。**未新增 CCR，未处理 CCR 仍 = 0。**
- **已同步的正式产品文档**（**只做最小必要同步**）：
  - `04_USER_FLOW.md` —— 新增 **§3.1《用户想新增 / 修改「保持条件」时的合法流程》**（含流程图 + 口径表）；**§5** 由《邻接待确认》改写为《邻接项 `ADJ-01`（✅ 已关闭 / 派生）》；§1 流程图与 §4"明确不做"各补一条 ⑤ 口径
  - `05_DATA_MODEL.md` —— **§4** 改写为《第 ⑤ 项「保持条件」的存储口径》：**用户指定保持条件属于 `Attempt` 层 `Fact`**；**`Hypothesis` 第 ⑤ 项不新建用户编辑实体**；**只引用已有 `Fact`**；**不建立第二套存储**；§3 表新增一行（不新增 ⑤ 用户编辑实体），§2 补一条来源落点说明
  - `06_AI_CAPABILITIES.md` —— §1 表末新增行 + §2 新增红线 + §3 邻接项行更新：**AI 可以读取并引用已有用户 `Fact`**，但**不得自行创建"保持条件"用户 `Fact`**、**不得把 AI 建议改写为用户 `Fact`**、**不得覆盖用户 `Fact`**、**不得合并为混合来源**
  - `08_UI_SPEC.md` —— §1 第 ⑤ 项行更新（**无编辑控件 + 不得提供用户输入位 / 并列用户条目**）；§3 新增界面红线；**§5** 由《邻接待确认》改写为《邻接项 `ADJ-01`（✅ 已关闭 / 派生）》；**新增 §6《第 ⑤ 项「建议保持哪些条件」的界面约束》**（**若需改变，提供「返回修改 Attempt」类入口即可**；**不锁具体视觉形式**）
  - `09_TEST_PLAN.md` —— **§3** 由《本节未决与邻接项》改写为《邻接项 `ADJ-01`（✅ 已关闭 / 派生）》；**§4 顺延新增 `AC-107` / `AC-108`（共 2 项）** + 4 条新增回归检查项；**`AC-101`–`AC-106` 一字未改、未重排任何旧 `AC` 编号**
- **为何新增 `AC`（覆盖缺口核查结论）**：`AC-101` 覆盖"**⑤ 无编辑入口**"、`AC-106` 覆盖"**唯一路径 = 改 `Formal Attempt` → 显式重新检索**"；但 `ADJ-01` 关闭后新增两条**此前按读法 ① 无需验收的正向要求** —— ① **"保持条件"用户 `Fact` 能在 `Formal Attempt` 层被写入并落库为用户 `Fact`**（含落点层级）；② **重新生成后第 ⑤ 项能引用该既有 `Fact`，且不新建 / 不就地改写 / 不把 `Inference` 改成 `Fact` / 不混写** —— **均为不可验证缺口**，故**仅顺延新增 `AC-107` / `AC-108` 两项**。
- **未修改（明确记账）**：`docs/architecture/03_AI_PIPELINE.md`（**`S03-C` Worker 原产物，一字未动**）、`docs/architecture/01_APP_ARCHITECTURE.md`（`S03-A`）、`docs/architecture/02_DATA_AND_STATE.md`（`S03-B`）、`docs/architecture/05_*.md`（`S03-E` 未启动）、`D-027` 与 `D-049` 的决策正文、`D-039`–`D-048` 及其它已 `CONFIRMED` Decision。
- **未做（边界确认）**：**未写业务代码**；**未做技术选型**；**未处理 `TQ01`–`TQ05`**；**未把 Shared Contract 整体写成 `CONFIRMED` / `FROZEN`**；**未进入 `S03-D`**。
- **阶段状态**：**`S00-03` = 已启动 / 未关闭**；`S03-A` / `S03-B` / `S03-C` 已产出（均为 `PROPOSED`）；`S03-D` / `S03-E` 未启动；**技术栈未选择 / DB 未确定 / API 未确定 / 编码未开始 / 未做 UI 视觉设计**。**`ADJ-01` 已不再是遗留登记项；`S00-03` 剩余阻塞项 = 0。**

## 2026-09-19 — S00-03 人工决策落盘（`D-049`）：`Hypothesis` V1 编辑边界与用户验证判据

本次为**决策确认与文档同步**，不涉及任何代码变更。

- **背景**：`docs/architecture/03_AI_PIPELINE.md`（`S03-C` Worker 产出，`PROPOSED` / 非 canonical）**§K** 报告了 **1 项 `DECISION REQUIRED`** —— canonical 未定义 `Hypothesis` 内容被修改时裁决位是否回退；"允许编辑"与"只读"产生**不同用户可感知行为**，且现有规则（`D-040` 明文只覆盖 `Insight`、`D-033` 只覆盖 ⑥⑦⑧ 候选指标 / 判据）**无法唯一推出**。
- **人工裁决（2026-09-19，项目负责人）**：**采用 §K.3 `E` 的「方案 B 窄口径变体」**。
- **`D-049` 正式结论**：**AI 生成的 `Hypothesis` 核心内容 ①②③④⑤ 一律只读**（**③ 引用关系由系统 / `EvidenceRef` 管理，用户不得直接修改**）；**⑥⑦⑧ 允许用户自行提供 / 替换 / 补充，一律以「用户 `Fact` 条目」与「AI `Inference` 条目」分列实现**；**不建立 `Hypothesis` 内容修改状态机 / 不做内容修改后回退 `undecided` / 不引入版本历史 / 不引入内容修改事件日志 / 不引入新状态枚举**；**改变 ①②④⑤ 的唯一路径 = 修改 `Formal Attempt` → 显式发起重新检索 / 重新生成**（属后续重跑动作，**不是 `D9` 新增步骤**；**不得自动重生成 ⑧ / ⑨ 产物**）。裁决位**仍只有** `undecided` / `accepted` / `rejected`。
- **主要放弃方案**：**「允许直接编辑 `Hypothesis` 核心内容 + 内容修改后 `decision_state` 自动退回 `undecided`」**（§K.3 方案 A）。**放弃原因**：① 新增状态回退机制；② 新增内容性字段判定；③ 新增验收与事件留痕复杂度；④ V1 主链不依赖该能力；⑤ **10 天开发窗口下收益不足以覆盖复杂度**。
- **决策落盘**：`docs/DECISIONS.md` 新增 **《S00-03 人工决策》** 与 **`D-049`**（含 `Decision ID` / 来源阶段 / 触发问题 / 决策主题 / 最终结论 / 核心约束 / 邻接语义 / 主要放弃方案 / 影响范围 / 日期 / `CONFIRMED`）；文件头**编号空间列举新增 `D-049`**；**`D1`–`D10` / `R1`–`R6` / `D-001`–`D-048` 一字未改**；**`Q16` 派生关闭项保持"不占编号"**（**`D-049` ≠ `Q16`** —— 已在《`Q16`｜派生关闭登记》与《S00-03 人工决策》**两处就地注明**）；**阶段状态行同步为 `S00-03` = 已启动 / 未关闭**（原文"尚未进入 `S00-03`"为历史状态，已按当前事实更新）。
- **Shared Contract 版本推进**：`v0.2.1 DRAFT / Worker CCR 对齐版` → **`v0.2.2 DRAFT / D-049 对齐版`**（**仍为 DRAFT —— 未 `FROZEN` / 未 `CONFIRMED`，不可作为实现依据**）。同步落点：**§2.3**（新增《`Hypothesis` 内容的编辑边界》表 + 硬约束）、**§8 新增 §8.6**（编辑边界 8 条）、**§9**（第 ⑨ 步行同步）、**§12 新增第 19 项**（Worker 禁改项）、**§13 新增 §13.5**（`S00-03` 已关闭项：§K `DECISION REQUIRED` → `D-049`）**与 §13.6**（邻接待确认项 **`ADJ-01`**）、**§14.1**（注明"本版无新增 CCR —— `D-049` 属人工决策落盘，不是 CCR"）、**§14 第 4 条**（版本链推进）、**§15**（新增 v0.2.2 变更行）。**未新增 CCR，未处理 CCR 仍 = 0。**
- **已同步的正式产品文档**（**仅同步已确认内容，最小改动**）：
  - `04_USER_FLOW.md` —— 新增《S00-03 决策同步（`D-049`）》：**用户对 `Hypothesis` 可执行的全部动作**（接受 / 拒绝 / 保存 `Model Suggestion` / 提供 ⑥⑦⑧；**①②③④⑤ 无编辑入口**）、**改变核心内容的唯一路径流程图**、**明确不做清单**、**邻接项 `ADJ-01`**；§2.6 增加一条指针
  - `05_DATA_MODEL.md` —— 新增《S00-03 决策同步（`D-049`）》：**8 项内容项的来源属性与可写性表**、**`Fact` / `Inference` 分列规则**（**"替换"= 用户新增自己的 `Fact` 条目，不得就地改写 AI 条目**）、**"明确不新增的实体 / 状态 / 字段"表**（**`D-040` 内容性字段集合不得外推到 `Hypothesis`**）
  - `06_AI_CAPABILITIES.md` —— 新增《S00-03 决策同步（`D-049`）》：**A5 的编辑边界行为要求**（**AI 生成核心 Hypothesis 后不得自动改写用户 `Fact` 条目**、**不得反向标注**、**不得因内容变化回退裁决位**）、**7 条 AI 行为红线**、**未确定的实现细节**
  - `08_UI_SPEC.md` —— 新增《S00-03 决策同步（`D-049`）》：**①②③④⑤ 不提供直接编辑控件**、**⑥⑦⑧ 允许用户输入 / 替换**、**必须区分 AI 建议与用户提供内容**、**人工条目禁止合并呈现**；**编辑与回退的界面约束**；**8 条界面红线**；**留待后续裁决项**
  - `09_TEST_PLAN.md` —— 新增 **`AC-101`–`AC-106`（共 6 项）** + **11 条回归检查项** + 邻接项 `ADJ-01` 的验收处置；**未重排任何旧 `AC` 编号**（**沿用现有最大编号 `AC-100` 顺延**）
- **未修改（明确记账）**：`docs/architecture/03_AI_PIPELINE.md`（**`S03-C` Worker 原产物** —— 其 §K 保留为**历史报告**，当前有效口径以 `D-049` + 契约 §2.3 / §8.6 为准）、`docs/architecture/01_APP_ARCHITECTURE.md`（`S03-A`）、`docs/architecture/02_DATA_AND_STATE.md`（`S03-B`）、`D-039`–`D-048` 及其它已 `CONFIRMED` Decision。
- **未做（边界确认）**：**未写业务代码**；**未做技术选型**；**未提前处理 `TQ01`–`TQ05`**；**未把 Shared Contract 整体写成 `CONFIRMED` / `FROZEN`**；**未进入 `S03-D`**。
- **遗留登记（非阻塞）**：**邻接项 `ADJ-01`** —— `D-027` 第 ⑤ 项「**用户本人明确指定"保持某条件" = 用户 `Fact`**」的 **V1 落点未裁决** → **需人工确认**（契约 §13.6；**人工确认前按"⑤ 只读"执行**；**若判定为"⑤ 并列用户条目"，必须补独立 `Decision ID`**）。**该登记不改变 `D-027` 一字，不构成 `S00-03` 关闭阻塞项。**
  - ✅ **2026-09-19 就地补注（按「不改写历史」保留上述原文）**：**该遗留登记已解除** —— **`ADJ-01` 已由项目负责人人工裁决（选择方案 3 / 读法 ③）并正式关闭**，状态更新为 **`CLOSED / DERIVED`**，**依据 = `D-027` + `D-049`**；**不创建 `D-050`**、**不新增产品机制**。**本补注不改动本条目任何决策内容**；完整记录见本文件顶部 **《2026-09-19 — S00-03 / `ADJ-01` 派生关闭》**。
- **阶段状态**：**`S00-03` = 已启动 / 未关闭**；`Gate A` 定向修正已完成；`S03-A` / `S03-B` / `S03-C` 已产出（均为 `PROPOSED`）；`S03-D` / `S03-E` 未启动；**技术栈未选择 / DB 未确定 / API 未确定 / 编码未开始 / 未做 UI 视觉设计**。

## 2026-09-19 — S00-02 第四批人工确认与阶段关闭（`S00-02 = CLOSED / CONFIRMED`）

> 🚩 **就地补注（2026-09-19，按「不改写历史」保留原文）**：本条目内的「**尚未进入 `S00-03`**」「**未选技术栈、未定数据库、未设计 SQL / API / Prompt**」等**阶段状态表述为该批次关闭当时的历史状态**。**当前实际状态 = `S00-03｜技术架构与实现方案收敛` 已启动 / 未关闭**（`Gate A` 定向修正完成；`S03-A` / `S03-B` / `S03-C` 已产出且为 `PROPOSED`；`S03-D` / `S03-E` 未启动），见本文件顶部 **《2026-09-19 — S00-03 人工决策落盘（`D-049`）》** 与 `docs/DECISIONS.md`《S00-03 人工决策》。**本补注不改动本条目任何决策内容。**

本次为**决策确认、落盘与文档同步**，不涉及任何代码变更。

- **第四批 11 项人工决策正式确认**（由项目负责人确认，2026-09-19），状态由 `需人工确认` 更新为 **`CONFIRMED`**：
  - **Q12** **`accepted` Insight 的撤销与"显式接受"语义**（**允许撤销接受** `accepted → candidate`；**晋升仍须 `E1`–`E5`**；用户**不能以任何手动操作绕过 `E1`–`E4`**；**「手动晋升」术语正式废止**）
  - **新-2** **`accepted Insight` 修改后的状态机**（**内容性字段修改 → 退回 `candidate` + 重检 `E1`–`E4` + 用户重新接受**；**非语义展示性 / 元信息修改不退回**；**V1 只保留事件日志**，不做版本列表 / 对比 / 回滚）
  - **新-7** **`Hypothesis` 永不直接成为 `Experience Asset`**（正式闭环 = `Hypothesis → 用户实际执行 → 新 Formal Attempt → ⑥⑦ → ⑧ → `E1`–`E5` → `Experience Asset`；**禁止** `Hypothesis → 用户接受 → Experience Asset`）
  - **新-10** **`Model Suggestion` 的保存 / 持久化与「保存 ≠ 接受」**（**允许保存**；**保存 ≠ 接受 ≠ 采纳 ≠ 确认**；**但「接受 / 拒绝」机制必须保留**；**永不晋升 / 永不获得 grounding / 不计入 `N_引用` / 不改称 Insight / 不变成 History-grounded**）
  - **Q31** **`Attempt` 生命周期：只归档、不删除**（**V1 只采用归档，不提供永久删除**；归档**可撤销**、**归档后不可编辑**、**不参与新检索 / 不作新 grounding / 不计入新 `N_检索`**；**既有引用继续存在并标「来源已归档」**；**归档 ≠ 引用失效**；**系统不得自动归档**）
  - **Q04** **产品层 L4 系统自动记录最小集 = 4 项**（创建时间 / **最近修改时间（正式保留）** / 数据来源性质 / AI 内容来源标记；**「发生时间」不计入 L4**；**不锁 model / prompt / token / temperature / trace id / latency / retries / 内部检索分数**；**不新增重复「数据来源」字段**）
  - **Q29** **第 ⑥ 步检索的两层触发口径**（**① 首次自动检索 = `Formal Attempt` 保存成功 = 唯一自动触发条件（主链首次自动触发条件）**；**② 后续重新检索 = 修改后由用户显式发起**，**属后续重跑动作、不是 `D9` ⑤→⑥ 之间的新步骤**；**归档 / 取消归档不触发**；**默认检索范围 = 全部历史**）
  - **Q14** **相关历史的主对照展示数量**（**默认 3 条** + **不足展示实际** + **可展开且必须可达** + **不锁「展开上限 10」** + **`N_检索` 不被展示截断**；**三条护栏**：折叠 ≠ 排除 / `N_引用` 是实际证据数量 / 展示数量不等于证据质量与可信度）
  - **Q16** **"最近一次"默认比较对象 —— 派生关闭**（**不创建 `Decision ID`**；规则源 = **`D-019` Level C**，验收依据 = `09` 的 `AC-21`）
  - **Q27** **P0 主链 step-gate**（**第 ① 步唯一门槛 = 非空、非纯空白输入**；**「≥ 8 字符」正式废止**；**建立统一 step-gate 表**；**V1 不设计「不可恢复的业务终止」**；**A 对象门槛未满足 / B Runtime 技术失败 / C P0 Acceptance 三层必须分开**；**⑧ 常见出口 = `A` / `C`**）
  - **Q28** **第 ④ 步候选失败原因允许 0 条**（须显式表达「当前依据不足，暂不推断原因」；**禁止为凑数生成低质量 / 低置信原因**；**保存不要求逐条处理**；**未处理原因以 `candidate` 保存且不得作为已接受依据复用**）
- **`AC-10` 精度修正（唯一归属 = Q28 / `D-048` + `09_TEST_PLAN`）**：把"未显式接受或拒绝**不得进入下一步**"精确化为"**未经显式接受或拒绝的决策型 `Inference`，不得被作为『已确认依据』进入后续复用链路（依据 / 门槛 / 版本来源 / 比较输入 / 后续决策依据）**"；**结果状态显式确认仍是 `Formal Attempt` 成立的必要条件**；**候选失败原因"逐条处理"不是保存前置、"被复用前必须已处理"是硬要求**；**不修改 `D-014` 本体**，**不创建第二份 `AC-10` 规则**。
- **前置口径校正已完成**：**第二批定向校正（`BLOCKER`，追问预算单位 = `max-3-key-questions-total`）已完成并全库解除，不再是关闭前置**（见本文件顶部《2026-09-19 — S00-02 第二批定向校正（BLOCKER）》）。
- **决策落盘**：`docs/DECISIONS.md` 新增《S00-02 第四批人工决策》**`D-039`–`D-048`**（逐项独立记录：`Decision ID`、原 Q / 新编号、决策主题、最终结论、核心约束、主要放弃方案、影响范围、日期、`CONFIRMED`），并**明确登记 `Q16` 为 `D-019` 的派生关闭项、不占新编号**（**未创建 `D-049`**）。**`D1–D10` / `R1–R6` / `D-001`–`D-038` 未修改。**
  - **编号承载关系（避免重复 `Decision Source`）**：**`INT` 项 / step-gate 表 / §23 修正项 / `AC-10` 精度修正 / 修正 F / 修正 G / 子规则 / `T4-A`·`T4-B`·`T4-C` 新问题编号 均不单独创建 `Decision ID`**。**第四批主 Decision 数 = 10，派生关闭 = 1（`Q16`），新增独立 `Decision = 0`。**
  - **编号空间说明已复核**：文件头改用"**本文件当前包含以下编号空间：**"的列举式表述（**不再使用会随批次过时的硬计数**），并新增 `D-039`–`D-048` 分组与《第四批特别说明》。**该修正属编辑性文档修正，不是产品 `Decision`。**（**历史条目中"编号空间说明已更新为四组"等表述按「不改写历史」保留，不改动。**）
  - **`D-037` 附注"展开上限 10 条"已就地更新为指针**（`SUPERSEDED` 范围声明 + 原文保留）：当前有效口径 = **`D-046`（主对照 3 条属阅读负荷控制；具体展开上限不在 `S00-02` 锁定，留 `08_UI_SPEC.md` / 实现阶段）**。**非重开 `D-037`**，而是**执行该附注自身标注的"属 Q14 第四批待确认"事项**。
- **分析文档更新**：`docs/analysis/S00-02_V1核心产品机制收敛.md` —— 表头**状态由 `IN PROGRESS / PARTIALLY CONFIRMED` 更新为 `CLOSED / CONFIRMED`**；**新增 §25《S00-02 第四批人工确认记录与阶段关闭》**（11 项最终状态 / `D-039`–`D-048` 映射 / `Q16` 派生关闭 / 落盘轮六项必做动作对照 / 全库残留扫描 / `SUPERSEDED` 处置 / 归属检查 / 生命周期与 `D9` 闭合检查 / **20 项关闭前最终门禁** / 非阻塞遗留项 / 下一阶段入口条件）；`§22.4` / `§23.4` / `§24.7` 阶段状态行**就地补注关闭指针**；**`§2`–`§24` 正文一字未删、未改写**。
- **已同步的正式产品文档**（**仅同步已确认内容**）：
  - `01_PRODUCT_DEFINITION.md` —— **仅必要同步**（新增《第四批决策同步》）：经验成立口径补充、假设不是经验、可归档不删除、检索按需自动发生 / 时间不决定相关性；**定位 / 目标用户 / 价值分层未变**，§5 竞品仍为 `TO_VALIDATE`
  - `03_V1_SCOPE.md` —— **§1 包含项"In Scope"中"删除失败记录"校正为"归档失败记录"**（依 `D-043`）；新增《第四批决策同步》：包含项与 11 组明确不做项
  - `04_USER_FLOW.md` —— §2.2（`D-047` 解析与技术失败处理）、§2.3（`D-048` 候选原因）、§2.4（`D-045` / `D-046` / `Q16`）、§2.5（`D-039` / `D-040`）、§2.6（`D-041` / `D-042` / `D-047` 的 0 条出口适用范围）、§3（`D-047` 异常 + `D-043` 归档流程）；**原 4 处"待填写"全部关闭**；新增第四批同步章节（含检索触发与展示流程图、对象生命周期图、归档流程图、L4 与 step-gate 表、明确不做清单）
  - `05_DATA_MODEL.md` —— 新增第四批**产品逻辑模型**：**L4 最小集 = 4 项**与"发生时间不计入 L4"、`created_at` 标注校正、事件日志层级、`Insight` 状态迁移矩阵与内容性字段集合、`Hypothesis` / `Model Suggestion` 数据性质与"保存 / 接受"两动作、`Attempt` 生命周期与归档能力矩阵、第 ④ 步候选原因数据状态、排序与默认对象（`Q16`）；**未设计 SQL / 字段类型 / 索引**
  - `06_AI_CAPABILITIES.md` —— 新增第四批 **A1 / A2 / A3 / A4 / A5 行为要求**与 **11 条 AI 行为红线**
  - `07_TECH_ARCHITECTURE.md` —— 新增《第四批决策同步（**仅边界归属，不做技术选型**）》：**技术观测参数归本文件（非产品层）**、实现层需落实的机制约束（事件驱动触发 / 默认范围 / 归档状态位 / L4 实现 / 无产物门槛）；**明确未选技术栈**
  - `08_UI_SPEC.md` —— 新增《第四批决策同步（**仅界面约束，不做 UI 设计**）》：经验区 / 假设区与模型建议区 / 检索展示 / 归档与元数据 / step-gate 与候选原因的界面约束 + **11 条禁止出现的界面表达**
  - `09_TEST_PLAN.md` —— **`AC-10` 就地精度修正**；新增 **`AC-61`–`AC-100`（共 40 项）**第四批验收点 + **27 条回归检查项**；**`AC-01`–`AC-60` + `AC-Q06-1`–`AC-Q06-6` 保持不冲突**
- **全库残留扫描**（canonical `docs/` 全量）：已执行；**当前有效 Decision / 流程 / 能力定义 / 验收规则 / 正式范围中无旧口径残留（0 处）**；关键词覆盖 `≥ 8 字符` / `3–5 条主对照` / `展开上限 10` / `置信（高·低）` / `同 Project` / `引用失效` / `手动晋升` / `删除失败记录` / `证据强度` / `Candidate Insight` / `唯一触发条件` / `不需要接受`·`不需要拒绝` / `主链无业务阻断` / `阻断栏全为无` / `最多 3 轮` / `最大 3 轮` / `0–3 轮` / `1–3 轮` / `追问轮数` / `追问回合数` / `max-3-rounds`；旧口径**仅存在于** ① 修订记录 / `SUPERSEDED` 记账段 ② 主分析文档历史章节 ③ `docs/analysis/` 内的并行 / 历史分析产出；**三类合法数字（存在性下界 / 结构档位 / 阅读负荷控制）未被误删**；**未机械删除任何历史**。
- **`SUPERSEDED` / 历史指针处置**：按主分析文档 §21.5 的 **23 条**执行"就地指针 + 记账"；**`T4-A` / `T4-B` / `T4-C` 三份并行文件只在文件头新增一条指针**（"当前正式结论以 §21 / §22 v2 / §23 及第四批 `CONFIRMED` Decision 为准"），**明确登记为「非 canonical 分析来源」**，**内部结论正文一字未改**。
- **Demo 数据与验收可执行性复核**：**[D8] MUST 项仍成立**（5–10 条中至少 1 条与现场新增 `Attempt` **Level A 命中**）；第四批验收点覆盖**撤销 / 修改退回 / 归档保留 / 两层触发 / 三护栏 / `Model Suggestion` 的接受–拒绝机制仍存在 / 三层语义分离（对象门槛 vs Runtime 技术失败 vs P0 Acceptance）**。
- **关闭前最终门禁**：**20 项全部通过**，**未发现 `S00-02 CLOSE BLOCKER`**；**未发现重复 `Decision Source`**；**无 `PROPOSED` 项被误写为 `CONFIRMED`**。
- **非阻塞遗留项（显式登记，不阻止关闭）**：① `[R4]` 竞品论断 `TO_VALIDATE`；② `08` 的可验证性具体呈现方式（→ UI 阶段）；③ `D-034` 的补录 exact wording（→ UI / 文案阶段）；④ `Q16` 移出的"并列判定"技术判据 与 `created_at` fallback（→ `S00-03`；**若提升为正式产品机制必须补独立 `Decision ID`**）；⑤ 归档 × 新 `E1` 来源（**已裁决：新建立不成立**）；⑥ `accepted Insight` 退回后既有 `Hypothesis` 的推理输入标注（**已裁决：不得自动改写，须如实改为「前序候选经验（未接受）」**）。
- **阶段状态**：**`S00-01 = CLOSED / CONFIRMED`**；**`S00-02 = CLOSED / CONFIRMED`**（四批决策全部确认，`Q01`–`Q31` + `新-1`–`新-22` 全部有归属，**未裁决 Q = 0**）。**尚未进入 `S00-03`**；**未选技术栈、未定数据库、未设计 SQL / API / Prompt**；**未编码**；**未做 UI 视觉设计**。
- **下一阶段**：**`S00-03｜技术架构与实现方案收敛`**（**技术栈的最终选择属人工决策项**）。

## 2026-09-19 — S00-02 第二批定向校正（**BLOCKER**）：追问预算单位

本次为**已确认决策的错误口径校正与文档同步**，不涉及任何代码变更。

- **性质**：**同一已确认 `Decision ID` 的口径纠错**（**不是新增产品决策**）；来源 = **早期人工确认提示词带入了错误口径**（把"关键追问问题总量"写成"对话轮数上限"）。
- **优先级**：**BLOCKER** —— **在第四批正式落盘与 `S00-02` CLOSED 前必须完成**（**本次已完成**）。
- **被校正对象**：
  - **Q06 / `D-017`（主动校正）**：旧口径 **`max-3-rounds`** = "最大 3 轮" / 实际 0–3 轮 / 只统计 AI 主动提出的追问回合 / 每轮只处理一个高价值缺口 → **标记 `SUPERSEDED / 已校正`**。
  - **新-1 / `D-023`（停止条件 B）**：旧口径"达到最多 3 轮" → **标记 `SUPERSEDED / 已校正`**。
  - **连带同口径同步**：**Q05 / `D-016`**（0 轮 → **0 个追问问题**）、**Q07 / `D-018`**（"每轮处理一个缺口" → **"每个关键追问问题只处理一个主要高价值缺口"**；新增"**禁止把多个缺口打包进一个问题以规避总预算**"）、**`D-034`**（"0–3 轮追问" → **"0–3 个关键追问问题"**）。
- **新口径（当前有效）**：**`max-3-key-questions-total`** —— **最多 3 个关键追问问题总量（TOTAL）**；**计数单位 = AI 实际提出的"关键追问问题数"，不是对话轮次**；**问题可以逐个对话呈现**；**每个关键追问问题原则上只针对一个主要高价值缺口**；🚩 **禁止在一个"问题"里打包多个字段以规避总问题预算**；**总数达到 3 后不得再提出第 4 个关键追问问题**；**达到预算后进入结构化确认**；**用户主动补充的信息不计入问题预算**。
- **`D-023` 补充的特别规则**：① 已选「不知道 / 跳过」的 P2 **不得再次追问同一缺口**、不阻断保存；② **P2 / P3 未解决 → 记「Unknown / 未提供」，不阻断 `Formal`**；③ 🔴 **`P1` 仍未建立时，即使问题预算用完也只能进入确认 / 暂存，`Attempt` 保持 `Draft`，不得伪装成 `Formal`**；④ **结果状态仍由「AI 给候选 + 用户在结构化确认阶段显式接受 / 修改」确定**，**不得把结果状态算成"通过追问补齐 P1"**。
- **Decision ID 不变**：仍为 **`D-017` / `D-023`**；**未新建 `D-049` 或任何新的第二批编号**。
- **修订历史保留**：**旧口径不删除**（在 `DECISIONS.md` 各条目就地以"口径校正"段记账），**标记 `SUPERSEDED / 已校正`**；**不得静默覆盖**。
- **已同步的文档**：`docs/DECISIONS.md`（编号空间说明 + 第二批小节 + `D-016`/`D-017`/`D-018`/`D-023`/`D-034`）、`docs/analysis/S00-02_V1核心产品机制收敛.md`（**新增 §24**；就地校正 **§8.0 / §8.3 / §9.1**；**`§14` / `§15` 加 `SUPERSEDED` 指针**；§16 / §20.5 / §22.4 / §23.4 补注）、`01_PRODUCT_DEFINITION.md`、`03_V1_SCOPE.md`、`04_USER_FLOW.md`、`05_DATA_MODEL.md`、`06_AI_CAPABILITIES.md`、`08_UI_SPEC.md`、`09_TEST_PLAN.md`、`.learnbuddy/memory/MEMORY.md`。
- **`09_TEST_PLAN` 变更**：**修改 4 项** —— `AC-14`（**0 个追问问题**）/ `AC-15`（**不得强制问满 3 个问题**）/ `AC-16`（**3 个关键追问问题总量必须停止**）/ `AC-18`（**P2 / P3** 缺失不阻断 `Formal`，前提 = P1 + 结果状态齐备）；**新增 `§1-A` 的 `AC-Q06-1` – `AC-Q06-6`**（计数单位 = 问题数不是轮次 / 只缺 1 个则 1 问即停 / **一个问题不得打包多个独立缺口** / **用户主动补充不计入预算** / 🔴 **预算耗尽但 P1 缺失 → 保持 `Draft`** / **结果状态确认不被追问机制替代**）；**回归检查项新增 4 条**。
- **第四批状态**：**§21 / §22 / §23 保持 v2 内容不变**（**未改一字**）；仅在阶段状态注明 **"第四批已具备人工确认条件，但 `S00-02` CLOSED 需等待本次 Q06 / `D-017` 校正完成"**。
- **校正后阶段状态**：**`S00-02 = IN PROGRESS / PARTIALLY CONFIRMED`（未关闭）**；**本校正已完成、不再是 blocker**；**剩余关闭前置 = 第四批 11 项人工确认 + 落盘轮（分析文档 §21.10）**。
- **边界**：**未重开第二批其它决策**；**`P1` / `P2` / `P3` 规则本身不变**；**未开 `S00-03`**；**未选技术栈、未设计数据库 / API、未编码**。

## 2026-09-17 — S00-02 第三批人工决策确认与落盘

本次为**决策确认与文档同步**，不涉及任何代码变更。

- **第三批 12 项人工决策正式确认**（由项目负责人确认，2026-09-17），状态由 `需人工确认` 更新为 **`CONFIRMED`**：
  - **Q17** **E4 输出信息结构**（8 项 1:1 对齐 D5；禁用 "Hypothesis Card"；第 ⑤ 项来源**拆三类**；系统附加语义 = **证据概况** / 可验证性 / 证据限制提示；**废止「证据强度」等级型术语**）
  - **Q18** **Hypothesis 生成数量**（**1–2 条自适应**，取消"默认 2 条"；数量由**独立可验证方向数**决定，不由 `N_检索` 决定；禁止凑数 / 近义改写 / 固定两条 / 3 条及以上；**0 条必须按 A / B / C 分类**）
  - **Q22** **证据不足与降级机制**（**分级降级 + 显著标注**；`N_检索 = 0` 不得生成 `History-grounded`；N=1 单来源且禁止一般化；N≥2 不得自动提升可信度；冲突**不得择一**、必须并列并定位差异条件；冲突 + 条件缺失可允许为空但须显式说明）
  - **Q23** **`Grounding requirement` 与 `Reasoning input`**（grounding 为硬条件；模型先验可参与推理但**必须独立分区标注**；**不得使用"混合"作为第三来源类型**；无真实 grounding → 整体只能为 `Model Suggestion`；**不设"部分锚定"中间等级**）
  - **Q19** **成本信息规则**（只作 optional context；来源仅限用户历史已记录 / 用户当前提供；无数据标"未提供"、**不得估算**；不作硬条件 / 晋升条件 / 相关性维度 / 自动判据）
  - **Q20** **阈值与可验证判据**（**不强制数值阈值**；优先引用用户阈值 → 可区分定性判据 → AI 候选须标 `Inference` 并经接受；**"没有数字" ≠ "不可验证"**）
  - **Q21** **候选指标 / 判据机制**（AI 可提候选指标 + **配对**支持 / 反驳判据；须标 `Inference`、与用户来源分列、**经用户显式接受后生效**；接受不把内容变成 `Fact`；用户可自定 / 修改 / 拒绝 / 跳过）
  - **Q24** **冷启动总体机制**（**能力门控 + 入口可见但标注状态 + 可选补录引导**；拒绝弱版 `Model Suggestion` 填充；**"补录 3 次"及一切数量解锁语义正式废止**；**"≥1 条"是必要条件、不是充分条件**）
  - **Q25** **来源结构档位与 `N` 两层口径**（三档只表示**结构可及性**，不是可信度等级；**`N_检索` = 能力档位 / `N_引用` = 界面显示与 ⑩ 追溯**；历史库"空 / 非空"为第三个独立状态；`N ≥ 2` 只表示"可能出现"跨记录比较）
  - **Q26** **来源 / 空态语义标注规则**（**只锁语义要求 + 禁止清单，不锁 exact UI copy**；`Model Suggestion` 须**整体**标注「非你的历史经验依据」；**两种空态必须区分**；不得把冷启动呈现为系统错误）
  - **Q30** **禁止固定"历史够多"阈值**（不设固定阈值；**始终展示 `N_引用` 实际数量**；禁止 `N=5` 才完整 / 补录 3 条解锁 / 10 条才可信 / 进度条 / 还差 N 条 / 按数量自动提升 / **内部隐藏式加权门槛**；**合法数字仅三类**：存在性下界、结构档位、阅读负荷控制）
  - **新-3** **E2 / E3 不满足时的 `candidate` 呈现**（保持 `candidate` + 「当前还不足以成为可复用经验」+ **缺什么 / 为什么重要 / 如何补充**；不静默丢弃 / 不隐藏 / **不自动补字段、不自动改写结论、不自动晋升**；「如何补充」属展示型 `Inference`，不得绕过 E5；补录规则统一引用 Q24）
- **第 ⑧ / 第 ⑨ 步对象边界（重要口径修正）**：第 ⑧ 步唯一生成 **`Candidate Insight`**；第 ⑨ 步生成 **Hypothesis 输出**（`History-grounded Hypothesis` / `Model Suggestion`），**两者一律不得称为 `Candidate Insight`**；两类输出均为 `Inference`（**决策型 / 持久化**），**须用户显式接受 / 拒绝**；**本阶段不定义 `accepted Hypothesis` → Experience Asset，不建立 Hypothesis 生命周期状态机**（留第四批 **新-7**）。
- **`N_引用` 的正式定义**：= **真正参与当前 Hypothesis** 的 `Formal Attempt` 条数（承担 **grounding / 支持 / 反驳** 任一角色，须逐条标角色）；**纯上下文可展示、须标「上下文」、不计入**；**G4 历史排除项属 grounding、计入**；**`Unknown` 记录可提供 grounding / context，但不得单独承担"支持 / 反驳结果方向"**，只提供纯上下文则不计入。
- **Runtime / Acceptance 正式边界**：真实 `N_检索 = 0` 属**合法冷启动降级**（第 ①②③④⑤ 步完整可用、不报错、第 ⑨ 步"进入下一步条件"不满足 = 正常终态）；**正式验收使用 [D8] 预置 Demo 数据**完整走通 **⑥→⑦→⑧→⑨→⑩**；**Runtime 合法降级 ≠ P0 功能未实现**；**Demo 可走通 ≠ 真实用户任意 N 都必须产出 `History-grounded`**；**验收不得依赖临时人工补录**。
- **Demo 数据要求（分层）**：**MUST** = [D8] 的 5–10 条中**至少 1 条 `Formal Attempt` 与演示现场新增的 Attempt Level A 命中**；**SHOULD** = 建议 ≥2 条彼此相关；条件缺失 / 冲突 / `Unknown` 案例作为**可选回归夹具**（不必全进主演示路径）；全部须显式标示「Demo / 示例数据」；**不改变 [D8] 的 5–10 条区间**。
- **三种合法"0 条出口"**：**A `evidence-insufficient`** / **B `not-verifiable`** / **C `not-formable`** —— **原因不同、产品解释不同、不得互相混用**，且**必须分别进入 `09_TEST_PLAN` 的独立验收路径**；**合法 ≠ 免于测试**，也**不等于**系统错误。
- **确认依据**：`docs/analysis/S00-02_V1核心产品机制收敛.md` 的 **§17（统一口径基座）+ §18（第三批最终人工决策包 v2）+ §19（人工确认前最终一致性修正）**；**如历史候选与三者不一致，以三者为准**；**不得恢复**已标记为 `SUPERSEDED` / 已废止 / 历史方案 / 收敛前版本的旧规则（**废止与替代记账共 16 条，见 §17.6**）。
- **决策落盘**：`docs/DECISIONS.md` 新增《S00-02 第三批人工决策》**D-027 – D-038**（逐项独立记录：Decision ID、来源阶段、原问题编号、决策主题、最终结论、核心约束、主要放弃方案、影响范围、日期、状态）。**D1–D10 / R1–R6 / D-001–D-026 未修改**；编号空间说明已更新为**四组**。
  - **编号承载关系（避免重复事实源）**：**修正 F 不单独创建 Decision ID**（正式规则由 **D-029 / D-030** 承载）；**修正 G 不单独创建 Decision ID**（正式规则由 **D-034 / D-035 / D-037** 承载）；**新-8 – 新-22 中已吸收进主 Q 的子规则不创建独立 Decision ID**（映射见分析文档 **§17.8.1**）。**第三批主 Decision 数 = 12，新增独立 Decision 数 = 0。**
- **已同步的正式产品文档**（**仅同步已确认内容**）：
  - `01_PRODUCT_DEFINITION.md` —— **仅必要同步**：孵化输出口径（有依据 / 可核对 / 可拒绝、不凑数）、不设"证据等级"的展示口径、承诺边界口径（"存下历史才有输出"不是产品承诺）；**定位 / 目标用户 / 价值分层未变**，§5 竞品仍为 `TO_VALIDATE`
  - `03_V1_SCOPE.md` —— 新增《第三批决策同步》：包含项（E4 输出信息结构、候选指标 / 判据机制、冷启动门控、`N` 两层口径、Demo 数据分层）与**明确不做项**（默认 2 条、固定阈值、数量解锁 / 进度式、证据等级 / 证据强度、"混合"标签、弱版填充等）
  - `04_USER_FLOW.md` —— §2.5 同步 **E2 / E3 缺失时 `candidate` 三段式呈现**；§2.6 全面同步**第 ⑨ 步输出结构、第 ⑧ / ⑨ 步对象边界、数量与 0 条分类、分级降级、来源分区、判据与成本、`N` 口径、冷启动与标注、Runtime / Acceptance 分层**；§3 同步**三类不可达出口、空态区分、Demo 数据要求**；新增第三批同步章节（含输出流程图、来源对象图、`N` 三量表、不做项清单）
  - `05_DATA_MODEL.md` —— 新增第三批**产品逻辑模型**：第 ⑧ / ⑨ 步对象边界、`N_检索` / `N_引用` / 历史库空非空三个量、`N_引用` 计入规则、grounding 判据与来源分区、第 ⑨ 步 8 项信息项与来源属性、`candidate` 的 E2 / E3 数据状态；**未设计 SQL / 字段类型 / 索引**
  - `06_AI_CAPABILITIES.md` —— 新增第三批 **A4 / A5 / A6 行为要求**（输出对象与结构、来源分区、grounding、数量与 0 条分类、判据与指标、成本、冷启动、空态、档位语义）与 **15 条 AI 行为红线**
  - `08_UI_SPEC.md` —— 新增《第三批决策同步（**仅界面约束，不做 UI 设计**）》：假设区 / 空态与冷启动 / 经验区 + 判据 + 成本的界面约束、**禁止出现的界面表达 10 条**；**可验证性的呈现方式（独立标签 or 仅不可验证时显示文字）留本文件后续裁决**，**本次未做任何视觉设计**
  - `09_TEST_PLAN.md` —— 新增 **AC-31 – AC-60（共 30 项）**第三批验收点（覆盖 E4 八项完整性、第 ⑤ 项来源三分、第 ⑨ 步不得称 `Candidate Insight`、1–2 条自适应、0 条 A / B / C 三类出口、grounding 判据、历史 / 模型分区、`N_检索` / `N_引用`、纯上下文不计入、`Unknown` 不单独作支持 / 反驳、N=1 禁止一般化、冲突并置、`Model Suggestion` 不顶替 ⑨⑩、Runtime 合法降级、Demo MUST、不依赖人工补录、无数字 ≠ 不可验证、AI 候选的 `Inference` + 接受机制、无成本数据不得估算、不出现证据等级、不出现数量解锁机制）与 **23 条回归检查项**；**A / B / C 三类出口各至少一个独立验收点**
- **全库残留扫描**（canonical `docs/` 全量）：已执行；**正式产品文档（`01`–`09`）中无旧有效口径残留**；旧表达仅存在于**历史方案 / `SUPERSEDED` / 已废止**语境，且**均有明确指针**说明当前正式结论；**三类合法数字（存在性下界 / 结构档位 / 阅读负荷控制）未被误删**。
- **本批未处理**（**不得提前确认**）：**第四批** —— Q04 / Q12 / Q14 / Q16 / Q27 / Q28 / Q29 / Q31、**新-2**、**新-7**（`accepted Hypothesis` 是否 / 何时成为 Experience Asset）、**新-10**（`Model Suggestion` 保存后的性质与晋升资格）。
- **阶段状态**：`S00-02 = IN PROGRESS / PARTIALLY CONFIRMED`（**仍未关闭**）。**未进入技术架构**（**未选技术栈、未定数据库、未设计 SQL / API / Prompt**）；**未编码**；**未做 UI 视觉设计**；**未进入 S00-03**。

## 2026-09-17 — S00-02 第二批人工决策确认

> 🚩 **本条目中的追问口径已校正（2026-09-19，BLOCKER）**：**Q05 / Q06 / Q07 / 新-1 的"轮次"口径已由「关键追问问题总量（最多 3 个）」取代** —— 见本文件顶部 **《2026-09-19 — S00-02 第二批定向校正（BLOCKER）》**。**下列原文按「不改写历史」保留**，其中相关行已就地加"**已校正**"指针。

本次为**决策确认与文档同步**，不涉及任何代码变更。

- **第二批 11 项人工决策正式确认**（由项目负责人确认，2026-09-17），状态由 `需人工确认` 更新为 **`CONFIRMED`**：
  - **Q05** 动态追问机制（少量、动态追问；无关键缺口则 **0 轮**直接进入结构化确认；**"唯一输入"表述废止**）→ 🚩 **已校正（2026-09-19）**：「**0 轮**」读作「**0 个追问问题**」
  - **Q06** 追问轮数 **最大 3 轮**（**上限语义**，非固定 3 轮；实际 0–3 轮；只统计 AI 主动提出的追问回合）→ 🚩 **此口径已 `SUPERSEDED`（2026-09-19）**：改为「**最多 3 个关键追问问题总量（TOTAL）；计数单位 = 问题数，不是对话轮次**」；**`Decision ID` 仍为 `D-017`**
  - **Q07** **动态缺口优先级**（P1 必备事实缺口 / P2 条件·判断依据（允许未知）/ P3 必要时才问）；**不设固定问题清单**；M2 禁止追问历史对照类问题
  - **Q13** 相关性**三级机制**（Level A 核心=唯一判定依据 / Level B 辅助不得单独成立 / Level C 时间仅同序排序）；相关性判断属 `展示型 Inference`
  - **Q15** **不显示任何形式的数字相似度**，只展示可解释的匹配理由；内部检索值 ≠ 用户界面事实
  - **Q10** **E1–E5 五项硬条件**替代 C1 / C2 / C3（E1 有效来源 / E2 结论明确 / E3 适用范围明确 / E4 证据可追溯（条件式）/ E5 用户显式接受）；C4′ / C5′ 仅作增强信息；**不打分、不设等级**；C6 不变
  - **Q11** **V1 只在 [D9] 第 ⑧ 步生成 `Candidate Insight`** 并即时让用户接受 / 修改 / 拒绝；**不做后台生成 / 保存后自动生成 / 异步批量生成 / 定期挖掘 / Candidate 待办池**
  - **新-1** **废止**计数式追问停止条件（"四项至少三项有值"）；替代为**条件 A / B / C**（无仍值得追问的 P1·P2 缺口 / 达到最多 3 轮 / 用户选择跳过·不知道·就这样继续）；**P2 允许未知，已选「不知道 / 跳过」不得重复追问、不得阻断保存** → 🚩 **条件 B 已校正（2026-09-19）**：「达到最多 3 轮」→「**已达到 3 个关键追问问题总量**」；并补充特别规则 ②③④（**P1 未建立时保持 `Draft`** / 结果状态不得被追问替代 等）
  - **新-4** 追问答案**来源分层**：用户原始回答 = `Fact`；AI 结构化归纳 = `Extraction`（可修改）；不得反向标注
  - **新-5** 「**未知 / 未提供**」字段**不参与相关性判断**、**双方都未知不得判为相似**、必须标记"该维度未比对"
  - **新-6** 正式区分 **`Formal Attempt` 保存门槛 ≠ Experience Asset 晋升门槛**（条件可缺省保存；关键条件缺失致适用范围不明则 `Insight` 保持 `candidate`）
- **确认依据**：`docs/analysis/S00-02_V1核心产品机制收敛.md` 的 **§14 / §15** 最终候选版本；**早期章节中标记为「历史方案 / 已废止 / 收敛前版本」的内容不得重新恢复**。
- **决策落盘**：`docs/DECISIONS.md` 新增《S00-02 第二批人工决策》**D-016 – D-026**（逐项独立记录：Decision ID、来源阶段、原问题编号、决策主题、最终结论、核心理由、影响范围、日期、状态）。**D-011–D-015、D1–D10、R1–R6 未修改**；编号空间说明已更新为四组。
- **已同步的正式产品文档**（仅同步已确认内容）：
  - `01_PRODUCT_DEFINITION.md` —— 新增《第二批决策同步（仅必要同步）》：交互成本口径、可信度口径、经验成立口径；**定位 / 目标用户 / 价值分层未变更**，§5 竞品仍为 `TO_VALIDATE`
  - `03_V1_SCOPE.md` —— 新增《第二批决策同步》：新增包含项与 10 项明确不做项（固定追问清单、计数式停止条件、数字相似度、后台候选生成、经验打分等）
  - `04_USER_FLOW.md` —— §2.2 / §2.4 / §2.5 同步**0–3 轮动态追问、P1/P2/P3、停止条件三条、追问回答 `Fact`/`Extraction` 分层、第 ⑥⑦ 步三级相关性、不显示数字相似度、第 ⑧ 步 `Candidate Insight` 生成与 E1–E5 检查**；新增第二批同步章节与流程图 → 🚩 **其中"0–3 轮"已校正（2026-09-19）为「0–3 个关键追问问题」**
  - `05_DATA_MODEL.md` —— 新增第二批产品逻辑模型（追问答案来源属性、`Insight` 与 `Formal Attempt` 关联、E1–E5 晋升约束、未知字段状态、两个门槛分层、`Candidate Insight` 单一生成来源）；**未设计 SQL / 字段类型 / 索引**
  - `06_AI_CAPABILITIES.md` —— 新增第二批能力边界（A1 动态缺口检测与追问选择、A3 相关性三级逻辑与呈现红线、A4 第 ⑧ 步生成与证据可追溯）及 AI 行为红线清单
  - `09_TEST_PLAN.md` —— 新增 **AC-14 – AC-30**（17 项第二批验收点）与 14 项回归检查项
  - `08_UI_SPEC.md` —— 新增《第二批决策同步（**仅界面约束，不做 UI 设计**）》：追问区支持 0 轮与「跳过 / 不知道 / 就这样继续」入口、追问结果 `Fact` / `Extraction` 同屏分层、相似对比区**禁止数字相似度**与「该维度未比对」标记、经验区显示 E1–E4 满足情况与缺失项、界面文案区分"已保存"与"已成为可复用经验" → 🚩 **其中"支持 0 轮"已校正（2026-09-19）为「支持 0 个追问问题 / 关键追问问题总量最多 3 个」**
- **分析文档更新**：`docs/analysis/S00-02_V1核心产品机制收敛.md` 新增 **§16（第二批人工决策确认记录，含 D-016–D-026 映射与同步清单）**；§9.1 决策汇总表 11 行状态更新为 `CONFIRMED` 并补入 新-1 / 新-4 / 新-5 / 新-6 四行；§14 / §15 加状态收口说明；§11 / §12 / 文档表头同步。**§14 / §15 的候选原文、被放弃方案与收敛过程全部保留，未改写。**
- **本批未处理**（**不得提前确认**）：**新-2**（`accepted` Insight 修改后的状态机，第四批与 Q12）、**新-3**（E2 / E3 不满足时 `candidate` 的呈现，第三批）、**Q31**（用户主动删除 / 归档 Attempt，第四批）；以及 Q04 / Q12 / Q14 / Q16 / Q17–Q30。
- **阶段状态**：`S00-02 = IN PROGRESS / PARTIALLY CONFIRMED`（**仍未关闭**）。**未进入技术架构**（未选技术栈、未定数据库、未设计 SQL / API / Prompt）；**未编码**；**未进入 S00-03**。

## 2026-09-17 — S00-02 第一批人工决策确认

本次为**决策确认与文档同步**，不涉及任何代码变更。

- **第一批人工决策正式确认**（由项目负责人确认，2026-09-17）：
  - **Q01 `CONFIRMED`** —— 录入范式采用**方案 C：自然语言输入 + AI 结构化确认**；不得把结构化表单作为第一入口
  - **Q02 `CONFIRMED`** —— `Attempt Draft` / `Formal Attempt` 两级机制；Formal 必备 目标 + 实际尝试 + 实际结果 + 用户确认后的结果状态；条件 / 判定依据 / 版本·环境允许缺省但须显式保存为「未知 / 未提供」；不得因缺可选字段删除 Draft；「实际尝试」为必备、「关键参数」为可选
  - **Q03 `CONFIRMED`** —— Attempt 字段框架（原始信息 / Formal 必备 / 重要但允许未知 / 系统自动 / 可选）；**"失败类型分类体系"不作为 P0 必填字段**，仅为 optional tag，不得建立价值排行榜、不得用于判断是否保存、不得恢复 S00-01 的 10 类分类为正式产品定义
  - **Q08 `CONFIRMED`** —— `Inference` 确认边界：区分 `展示型 Inference`（不要求逐条确认、可反馈不同意、未反馈不视为已确认、不得自动升级为资产）与 `决策型 / 持久化 Inference`（必须显式接受或拒绝、`accepted` 后来源仍为 `Inference`、不得升级为 `Fact`、不得用"已证实"）
  - **Q09 `CONFIRMED`** —— 产品概念层为 `Attempt` + `Insight`；`Insight.status` 至少含 `candidate` / `accepted` / `rejected`；Experience Asset = accepted Insight 的产品视图，**不是第三个独立事实对象**；`accepted` 不等于客观证实
- **决策落盘**：`docs/DECISIONS.md` 新增《S00-02 第一批人工决策》**D-011 – D-015**（编号续接现有最大编号继续递增），并更新编号空间说明为三组。D1–D10 / R1–R6 **未修改**。
- **已同步的正式产品文档**（仅同步已确认内容）：
  - `01_PRODUCT_DEFINITION.md` —— 新增《S00-02 第一批决策同步》
  - `03_V1_SCOPE.md` —— 新增第一批决策同步与不做项补强
  - `04_USER_FLOW.md` —— §2.1 / §2.2 同步自然语言入口、Draft → Formal、AI 结构化确认；新增同步章节
  - `05_DATA_MODEL.md` —— 新增产品逻辑模型（Attempt 两级状态、Insight 与状态机、来源属性与确认规则）；**未设计 SQL / 字段类型 / 索引**
  - `06_AI_CAPABILITIES.md` —— 正式记录 `展示型 Inference` 与 `决策型 / 持久化 Inference` 的确认边界
  - `09_TEST_PLAN.md` —— 新增 **AC-01 – AC-13** 第一批机制验收点与回归检查项
- **分析文档更新**：`docs/analysis/S00-02_V1核心产品机制收敛.md` 新增 §9.0（第一批最终结论）、§9.1 增加"状态"列（5 项 `CONFIRMED`）、§13.3（第一批确认记录）、§13.4（影响提示）；文档状态更新为 **`IN PROGRESS / PARTIALLY CONFIRMED`**。
- **S00-02 尚未关闭**：第二批、第三批、第四批决策未完成（Q04–Q07、Q10–Q31 仍为 `PROPOSED / 需人工确认`）。
- **未开始编码**，未选技术栈、未定数据库、未设计 API、未写 Prompt、未做 UI；**未进入 S00-03**。

## 2026-09-17 — S00-01 阶段关闭（人工决策收口）

本次为**文档与决策状态变更**，不涉及任何代码变更。

- **S00-01 完成人工决策收口**：由项目负责人正式确认 S00-01 全部关键决策，阶段由"分析完成但决策未闭合"转为"决策已落盘"。
- **核心用户已锁定**：V1 核心用户 = 高校科研与创新项目中的个人执行者（D1）；不以整个团队或项目负责人为第一用户。
- **Attempt 定义已锁定**：最小记录单位 = `Attempt（尝试）`（D2）；项目/课题不得直接等同于一条失败记录。
- **个人 Workspace 边界已锁定**：`User → Personal Workspace → Project → Attempt`；团队成员系统、邀请、角色、权限、管理员、协同编辑、团队工作区、复杂组织结构全部不在 V1（D3）。
- **首次使用动机已锁定**：入口心智为"刚刚哪里没有达到你的预期？"，先交付即时价值再沉淀长期价值（D4）。
- **V1 孵化形式已锁定**：唯一核心孵化能力 = `E4 待验证假设生成`；E1/E2/E3/E5/E6/E7 暂不作为 V1 独立核心功能（D5）。
- **失败纳入标准已锁定**：核心 Attempt 具备明确目标、实际尝试、可观察结果、结果与预期的可描述差异；普通错误可记录但不自动晋升，且不在数据层删除（D6）。
- **AI Fact / Extraction / Inference 边界已锁定**：跨记录新判断统一属 `Candidate Insight`；N=1 不支持"一般性无效"结论（D7）。
- **Demo 数据方案已锁定**：预置 5~10 条示例数据 + 现场新增 1 条真实输入，预置数据须标注 Demo / 示例数据（D8）。
- **V1 P0 验收主链已锁定**：十步主链，任一环节不通过即视为 V1 未完成；视觉效果、Agent 数量、技术复杂度不能替代主链验收（D9）。
- **成功/部分成功记录状态已锁定**：底层支持 Failed / Partial / Success / Unknown，主入口仍围绕未达预期；不新增成功经验管理中心、成功案例库、完整实验管理系统（D10）。
- **附加校正规则生效**：R1 失败类型价值排序、R2 经验时效性、R3 知识网络不绑定图技术、R4 竞品论断转待验证、R5 不以"全新品类"为结论、R6 创新来源与闭环优先（R1–R6）。
- **正式锁定核心问题定义与产品回答**（见 `DECISIONS.md`）。
- **文档状态同步**：
  - `docs/DECISIONS.md` 新增《S00-01 人工关键决策》D1–D10、R1–R6、正式锁定的核心问题定义与产品回答；并说明 `D-001/D-002` 与 `D1–D10` 为两套编号空间。
  - `docs/analysis/S00-01_赛题语义拆解.md` 新增《S00-01 最终状态标注》，原始 A–I 正文一字未改；新增"与原文冲突的处理说明"共 8 条。
  - `docs/analysis/S00-01_状态校正表.md` 每条新增「2026-09-17 最终状态」列，区分 `CONFIRMED` / `REJECTED` / `DEFERRED` / `TO_VALIDATE`；原三列保留不改。
  - `docs/01_PRODUCT_DEFINITION.md` 修正与 D1 冲突的目标用户与定位表述，标注 R4/R5 待验证与表述要求。
  - `docs/02_USER_AND_SCENARIO.md` 标注"项目团队负责人"为 V1 排除画像，引用 D1/D3。
  - `docs/03_V1_SCOPE.md` 追加 S00-01 决策同步：D3 排除清单、R3 图谱类排除、D10 不做清单。
  - `docs/04_USER_FLOW.md` 标注入口心智（D4）、孵化环节锁定为 E4（D5）、主体为 Attempt（D2）。
  - `docs/05_DATA_MODEL.md` 核心实体名称由"失败记录 / FailureEntry"更正为 `Attempt`，标注 D2/D6/D10/R2 的字段要求。
  - `docs/06_AI_CAPABILITIES.md` 标注 D7 三层内容边界、D5 对 A5 的锁定。
  - `docs/07_TECH_ARCHITECTURE.md` 标注 R3 约束（V1 不做图数据库/知识图谱/图谱推理/图谱可视化）。
  - `docs/08_UI_SPEC.md` 标注 D4 入口心智与 D9 主链对应关系。
  - `docs/09_TEST_PLAN.md` 标注 P0 验收以 D9 十步主链为准。
- **冲突处理说明**：与人工决策直接冲突的旧文字一律以人工决策为最高优先级校正，**原文均未删除**，变更记录于本节与《S00-01 最终状态标注》。
- **阶段状态**：`S00-01 = CLOSED / CONFIRMED`。项目可以进入 S00-02。

### 2026-09-17（补充）— S00-01 最终状态精修（小型状态精修）

> **本次仅收窄部分历史分析的 CONFIRMED 范围，不改变任何已确认人工产品决策，S00-01 阶段状态仍为 `CLOSED / CONFIRMED`。**
>
> 本次不涉及代码变更，不进入 S00-02。

- 发现 3 处"状态标注范围过宽"问题（把 D5/D9 未确认的内容一并标为 `CONFIRMED`），逐条收窄：
  1. **相似点与差异点**：`CONFIRMED` 收窄为"V1 必须展示相关历史 Attempt 与当前 Attempt 的相似点和差异点"；「"最近一次"作为默认比较对象」「"差异点最关键"这一优先级判断」两项改为 `DEFERRED`（D9 未确认）。
  2. **资产化强表述**：`CONFIRMED` 收窄为"经验需支持跨 Attempt 比较，并保存必要的条件 / 上下文 / 适用范围信息"；「"可比较是资产化的核心"这一强优先级判断」「"适用范围是经验与偏见的分界线"这一强定义性判断」两项改为 `DEFERRED`。D5、D6、D7、R2 的已确认内容未作任何改动。
  3. **E4 确认范围**：E4 作为 V1 方向、以及 D5 已明确列出的 8 项输出要求保持 `CONFIRMED`；E4 原始提案中未被 D5 确认的实现细节（固定输出 1–3 张假设卡、固定卡片 UI、成本估计字段、强制判定阈值、具体作废条件字段结构、具体 Prompt 模板、具体展示方式）统一改为 `DEFERRED — 进入 S00-02 进行方案设计`。**该标记为"尚未经过人工方案决策"，不是否定这些设计。**
- 修改文件：`docs/analysis/S00-01_状态校正表.md`（3 处条目收窄 + 新增 1 条 E4 实现细节条目）、`docs/analysis/S00-01_赛题语义拆解.md`（分节状态总览同步收窄 + 新增 2 条总览行）、本文件。
- **未修改** `docs/DECISIONS.md` 中 D1–D10 / R1–R6 的决策正文——经核对，其本身不存在上述范围过宽问题。

### 2026-09-17（补充）— S00-02 首轮：V1 核心产品机制收敛（PROPOSED）

> 本次仅**新增一份分析文档**，未修改任何 01–09 正式产品文档，未选技术栈、未定数据库、未设计 API、未写 Prompt、未做 UI、未编码。

- 阶段进入：`S00-02｜V1 核心产品机制收敛`（S00-01 保持 `CLOSED / CONFIRMED`，D1–D10 / R1–R6 未重开）。
- 新增 `docs/analysis/S00-02_V1核心产品机制收敛.md`，状态 **PROPOSED / 需人工确认**。内容包含：M1 Attempt 最小信息结构、M2 失败复盘录入机制、M3 Attempt → Experience Asset 晋升机制、M4 相关历史 Attempt 检索与比较机制、M5 E4 待验证假设的产品结构、M6 冷启动机制、`P0 Product Mechanism Flow`（D9 十步展开）、Q01–Q30 待确认清单、与 D1–D10 / R1–R6 的一致性核对、建议确认顺序。
- 六个机制均按"候选方案 → 多维度比较 → AI 推荐 → 需人工确认"格式给出；**本文档未产生任何已生效结论**。
- 一致性核对结论：未发现与 D1–D10 / R1–R6 的冲突；另记录两处需保留区别的表述（S00-01 `DEFERRED` 的「零历史时无法孵化」、`1–3 张假设卡`）。
- 未进入 S00-03。正式产品文档的同步修改留待人工确认后执行。

### 2026-09-17（补充）— S00-02 人工审查校正 A–H

> 依项目规则 §4 记录本次文档变更。**未修改 `01–09` 正式产品文档，未修改 `DECISIONS.md` 的 D1–D10 / R1–R6，未进入 S00-03，未编码。**

- 依项目负责人人工审查，对 `docs/analysis/S00-02_V1核心产品机制收敛.md` 做 7 项逻辑修正（状态仍为 `PROPOSED / 需人工确认`，S00-02 **未关闭**）：
  - **A** 引入 `Attempt Draft` / `Formal Attempt` 两级状态：Draft 只需原始输入即可暂存、不进入正式历史比较与经验孵化；Formal 至少需 目标 + 实际尝试 + 实际结果 + 用户确认后的结果状态。
  - **B** M2 录入阶段**不做历史比较**：从固定追问项中删除"与上次相似尝试的差异"，改为 条件 / 判定依据 / 关键参数或用户主动提及的关键变化；相似点与差异点统一在 M4 / D9 ⑥⑦ 处理。
  - **C** 明确**用户确认不等于 Fact**：`Insight.status` 改为 `candidate` / `accepted` / `rejected`（未来可扩展 `superseded` / `invalidated`）；`accepted` 仅表示"用户接受为当前可复用经验"，不等于客观证实；Experience Asset 重定义为 accepted Insight 的产品视图，来源仍为 `Inference`；弃用 `confirmed` 状态名。
  - **D** 删除对 D6 的越权解释：统一为"系统不得依据低价值/普通错误自动删除 Attempt"；"用户主动删除/归档"不由 D6 推导，改列候选议题 Q31。
  - **E** 单条普通操作错误改为"默认不得自动晋升"，但多条仍可参与跨 Attempt 比较并形成 `Candidate Insight`。
  - **F** 正式分离两类输出：`History-grounded Hypothesis`（D5 核心 E4，须引用 ≥1 条真实历史 Attempt，唯一计入 D9 ⑨⑩ 验收）与 `Model Suggestion`（须整体标记「模型通用建议 / 非你的历史经验依据」，不得计入验收）。
  - **G** 取消"≥5 条才算完整孵化"的硬阈值；冷启动证据等级改为 N = 0 / N = 1 / N ≥ 2；Q30 改为"不设固定阈值，始终展示实际证据数量 N"。
  - **H（随后单独修正，针对 Q08 一致性）** 正式区分两类 `Inference`，消除"所有 `Inference` 都必须确认"与"相似/差异 AI 判断无需确认"之间的冲突：
    - **A｜展示型 `Inference`**（相关性判断、相似点、差异点、检索排序理由、对照价值判断、置信提示、比较维度判断）：必须标注为 AI 判断、不得伪装成 `Fact`、用户可反馈"不同意 / 不相关"、**不要求逐条显式接受或拒绝**、未经接受不得自动升级为 Experience Asset、**未反馈不视为已确认**。
    - **B｜决策型 / 持久化 `Inference`**（结果状态、候选失败原因、`Candidate Insight` 是否被接受、Experience Asset、`History-grounded Hypothesis`、用户选择保存的模型推断）：**必须由用户显式接受或拒绝**，`accepted` 后来源仍为 `Inference`，**不等于 `Fact`**，不得使用"已证实"等措辞。
    - **核心判断原则**：是否要求显式确认，不只取决于"是否为 AI 推断"，而取决于该推断是否会改变持久化业务状态、或是否会被后续作为决策依据复用。
    - 同步位置：M1（§2.1 L3 层）、M2（§3.6 标题/表格/规则、§3.7 Q08）、M4（§5.3 确认要求）、P0 Flow（§8.7、§8.8、§8.9）、§9.1 Q08、§11 第 1 批说明、§13 校正记录。
- 文档末尾新增《13. S00-02 人工审查校正记录》（含 A–H 对照表、新增议题 Q31、未改变内容清单、影响提示）。本文档内《S00-02 人工审查校正记录》即为各轮完整变更留痕。

## 2026-09-16

- 初始建立 docs 文档结构：00_PROJECT_RULES ~ 09_TEST_PLAN、DECISIONS.md、CHANGELOG.md
- 00_PROJECT_RULES 中固化项目协作规则（核心流程优先、方案先行、小步迭代等）
- 其余文档均为骨架 + 待填写项，等待逐个讨论确认
- 新增 `00_PROJECT_RULES.md` 第 5 节「产出落盘规则」：有价值的产出必须落盘为本地 Markdown，明确落盘位置、状态标注（PROPOSED / 需人工确认 / CONFIRMED）与不改写历史原则
- 新增目录 `docs/analysis/`，归档过程性与阶段性分析
- 新增 `docs/analysis/S00-01_赛题语义拆解.md`（回填 S00-01 原始分析全文，未修改）
- 新增 `docs/analysis/S00-01_状态校正表.md`（对原分析附加 PROPOSED / 需人工确认 状态标记）
- DECISIONS.md 新增 D-002（产出落盘规则与 docs/analysis/ 归档目录）
