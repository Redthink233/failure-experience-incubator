# S00-03 GATE C READINESS REVIEW + IMPLEMENTATION PLAN

```
文档 ID        : S00-03_GATE_C_READINESS_AND_IMPLEMENTATION_PLAN
阶段           : S00-03｜技术架构与实现方案收敛
类型           : Gate C Readiness Review + Implementation Freeze Preparation
执行方         : LearnBuddy 本地独立 Integrator / Gate 会话（🔴 非 Worker、非 ChatGPT 轨）
日期           : 2026-09-24
性质           : 评审记录 + 实现计划（🟡 Integrator 产出）
状态           : ✅ **Gate C Verdict = `READY WITH NON-BLOCKING DEFERRED ITEMS`**（2026-09-24，`RL-01` + `RL-02` 后）
                 ／ `PENDING FINAL HUMAN LANDING`（项目负责人已回复 `A｜确认 Gate C`）
                 🟢 **历史首轮判定 = `NOT READY`**（保留于 §Q.1 / §Q.2，🔴 不得删除或改写）
权威序         : docs/DECISIONS.md > docs/00–09 > 本文件；本文件不是 canonical、不是契约、不是实现依据
边界           : 🔴 未写正式代码 / 未创建 src/ / 未安装依赖 / 未部署 / 未创建或删除任何资源 /
                 未运行 Vercel / 未跑 Spike / 未执行 PSA / 未新增任何 Decision / 未新增任何 AC
                 （🔴 `Gate C Landing` 的落盘动作见 §T，仍不包含任何业务代码）
```

> **本文件回答的唯一问题**：*当前仓库是否已经足够一致、完整、可执行，可以把 `S00-03` 正式冻结为**实现依据**，并开始正式开发？*
> **本文件不做**：重新设计产品 / 重新比较架构 / 重开 `TQ01`–`TQ05` / 重跑 `SP-06` / 部署 / 写正式代码。

---

## A. Repository State

### A.1 本轮开始前状态核验（Expected vs Actual）

| # | 核验项 | Expected | Actual（实测） | 判定 |
|---|---|---|---|---|
| 1 | `D-053`–`D-057` | 全部 `CONFIRMED` | `DECISIONS.md` 逐条 `状态：CONFIRMED` | ✅ 一致 |
| 2 | `D-058` = `TQ01` | `CONFIRMED` | `DECISIONS.md` L609–628 `CONFIRMED` | ✅ 一致 |
| 3 | `D-059` = `TQ02` | `CONFIRMED` | `DECISIONS.md` L632–652 `CONFIRMED` | ✅ 一致 |
| 4 | `D-060` = `TQ03` | `CONFIRMED` | `DECISIONS.md` L656–677 `CONFIRMED` | ✅ 一致 |
| 5 | `D-061` = `TQ04` | `CONFIRMED` | `DECISIONS.md` L681–701 `CONFIRMED` | ✅ 一致 |
| 6 | `D-062` = `TQ05` | `CONFIRMED` | `DECISIONS.md` L705–732 `CONFIRMED` | ✅ 一致 |
| 7 | `Gate B` | `COMPLETE` | `DECISIONS`/`CHANGELOG`/契约 §0.4 E/`DECISION_INDEX` §C-GATEB-LANDING 四处一致 | ✅ 一致 |
| 8 | Shared Contract | `v0.3 DRAFT` / `GATE B FINAL TECHNICAL DECISIONS INTEGRATED` | 契约文件头 L6–L8 逐字一致 | ✅ 一致 |
| 9 | Shared Contract 效力 | **NOT FROZEN / NOT IMPLEMENTATION BASIS** | 契约 L8「`PROPOSED（DRAFT）` —— 未 `FROZEN`、未 `CONFIRMED`、Gate C 前 NOT IMPLEMENTATION BASIS」 | ✅ 一致 |
| 10 | 连续 canonical `AC` | `AC-01`–`AC-162` = 162 | `09_TEST_PLAN.md` L769 / L787 口径一致 | ✅ 一致 |
| 11 | 独立 `AC-Q06` | 6 项 | `09_TEST_PLAN.md` L157–172（`AC-Q06-1`–`6`） | ✅ 一致 |
| 12 | 全部有效验收点 | 168 | `DECISIONS` `D-057` / 契约 §0.4 E.10 / `09` L769 三处一致 | ✅ 一致 |
| 13 | `SP-06` 历史执行状态 | `CONDITIONAL PASS`（7 项 `PENDING MANUAL OBSERVATION`） | 报告 §R / §S + 契约 E.9 + `07` §5.13/§5.14 一致；**7 项未标 `PASS`、未删、未伪造** | ✅ 一致 |
| 14 | `D-057` 后置 | 部署 / 真实浏览器验收后置于 `PRE-SUBMISSION` | `D-057` + `PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md`（`PSA-01`–`13` + `X1`–`X11` 全 `PENDING`） | ✅ 一致 |
| 15 | 编码 / `src/` / 部署 | 均未开始 | 工作区 `docs/`、`20_INTEGRATION/`、`30_SPIKES/` —— **无 `src/`**；`SP-06` 报告 §Q.5 / `CHANGELOG` 逐项确认 | ✅ 一致 |

### A.2 STATE DRIFT

```
STATE DRIFT = NO
```

🔴 第 1–15 项 **全部与预期一致**，**未出现 Expected / Actual 偏离**，**不存在需要输出 STATE DRIFT 的情形**。⇒ 本评审**未在开始前被状态漂移阻断**。

### A.3 已注入资产核验（本轮实际读取）

| 资产 | 存在 | 说明 |
|---|---|---|
| `docs/00_PROJECT_RULES.md` | ✅ | —— |
| `docs/DECISIONS.md` | ✅ | 1313+ 行；`D-001`–`D-062` + `ADJ-01` + `Q16` 登记 |
| `docs/03_V1_SCOPE.md` | ✅ | —— |
| `docs/04_USER_FLOW.md` | ✅ | —— |
| `docs/05_DATA_MODEL.md` | ✅ | 含 D-053《Persistence Mapping》节 |
| `docs/06_AI_CAPABILITIES.md` | ✅ | —— |
| `docs/07_TECH_ARCHITECTURE.md` | ✅ | 含 §5.11–§5.15 |
| `docs/08_UI_SPEC.md` | ✅ | —— |
| `docs/09_TEST_PLAN.md` | ✅ | 含 `D-057` 护栏节 + Gate B 同步护栏节 |
| `docs/CHANGELOG.md` | ✅ | 顶部 = Gate B LANDING 条目 |
| `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md` | ✅ | `v0.3 DRAFT`；§0.1–§15 |
| `20_INTEGRATION/S00-03_技术决策包.md` | ✅ | 含 §V.11 / **§V.12** |
| `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md` | ✅ | 含 §Y.7 / **§Y.8** |
| `20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md` | ✅ | `PSA-01`–`13` + `X1`–`X11` |
| `30_SPIKES/retrieval/SP-03R_LevelA_严格语义重叠复测.md` | ✅ | `PASS`（射程受限） |
| `30_SPIKES/local_first/SP-06/SP-06_EXECUTION_REPORT.md` | ✅ | §A–§S（§R / §S 为追加） |

### A.4 本轮未执行事项（🔴 逐项确认）

未写正式代码｜未创建 `src/`｜未 `npm install`｜未部署｜未运行 Vercel｜未创建任何云资源｜未删除任何旧云资源｜未实现 Research RAG｜未引入 Vector DB｜未重开 `TQ01`–`TQ05`｜未重跑 `SP-06`｜未执行 `PSA`｜未新增任何产品 `AC`｜**未进入 Gate C Landing**｜**未自动宣布 Gate C COMPLETE**。

---

## B. Gate B Decision Snapshot

### B.1 流程决策

| Decision | 内容 | 状态 |
|---|---|---|
| **`D-057`** | `SP-06` 部署验证 + 真实浏览器目录权限生命周期人工观测**延期至提交前**；**不再是 `Gate B`/`Gate C`/正式开发启动的硬阻塞项**；**仍是 `PRE-SUBMISSION ACCEPTANCE` 必做项** | ✅ `CONFIRMED` |

### B.2 五项 Gate B 最终技术决策

| `TQ` | Decision | 冻结核心（人工 Decision） | 状态 |
|---|---|---|---|
| `TQ01` | **`D-058`** | **Browser-heavy Local-first Web App + Optional Thin Server Layer** | ✅ `CONFIRMED` |
| `TQ02` | **`D-059`** | **Local Workspace Files + No required cloud database** | ✅ `CONFIRMED` |
| `TQ03` | **`D-060`** | **Configurable LLM + Provider Abstraction + Provider-dependent Hybrid + Session-only Credential + Registered-provider Thin Proxy only** | ✅ `CONFIRMED` |
| `TQ04` | **`D-061`** | **`R-A`**（Structured Field Rules + 必要时 LLM 维度级离散三态判定） | ✅ `CONFIRMED` |
| `TQ05` | **`D-062`** | **Local Development + Vercel Demo / Review Deployment Target + Local Workspace + Optional Thin Provider Proxy**（🔴 附 `DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION`） | ✅ `CONFIRMED` |

🔴 **五项独立追踪、不得合并**；`Source` 全部 = `Gate B Final Human Confirmation`（2026-09-24「A｜确认以上全部 Gate B 决策」）。

### B.3 「人工 Decision」与「`TECHNICAL DEFAULT` / 实现参数」分层（🔴 本层不得混同）

```
人工 CONFIRMED Decision（不可由 AI 自行改变）
  TQ01 Browser-heavy Local-first + Optional Thin Server Layer
  TQ02 Local Workspace Files + No required cloud database
  TQ03 Configurable LLM + Provider Abstraction + Provider-dependent Hybrid
       + Session-only Credential + Registered-provider Thin Proxy only
  TQ04 R-A
  TQ05 Local Dev + Vercel Demo/Review Target + Local Workspace + Optional Thin Provider Proxy
  ─────────────────────────────────────────────────────────────────────
TECHNICAL DEFAULT（🔴 非人工 Decision、🔴 不生成 Decision ID、可由 Integrator 收敛）
  TypeScript end-to-end
  Markdown + JSON / sidecar metadata
  ─────────────────────────────────────────────────────────────────────
实现参数（🔴 可由 Integrator / Worker 收敛，但不得改变数据位置 / 安全边界 / LLM Key 边界 / 产品行为）
  框架（React / Next.js / Vue）· state library · router · component library
  目录名 · 文件名 · front-matter 细节 · sidecar JSON 结构 · helper · parser · retry 参数 · timeout
  UI 微观实现 · 具体 Provider 清单 · allowlist 内容 · 脱敏实现方式 · session 抽象选型
```

### B.4 落盘位置矩阵（🔴 用于交叉核对"是否只有一个当前有效答案"）

| 落点 | `D-057` | `D-058`–`D-062` | 契约版本 |
|---|---|---|---|
| `docs/DECISIONS.md` | ✅ L571–605 | ✅ L609–732 | — |
| `docs/07_TECH_ARCHITECTURE.md` | ✅ §5.14 | ✅ **§5.15** | §5.15 表 |
| 契约 `00_SHARED_TECHNICAL_CONTRACT.md` | ✅ §0.4 E.1 | ✅ §0.4 E.2–E.6 + §13.1 补注 | ✅ 文件头 / §14 第 4 条 / §15 |
| `docs/09_TEST_PLAN.md` | ✅ `D-057` 护栏节 | ✅ Gate B 同步护栏节（`AC` 新增 = 0） | — |
| `20_INTEGRATION/S00-03_技术决策包.md` | ✅ §V | ✅ **§V.12** | §V.12 |
| `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md` | ✅ §Y | ✅ **§Y.8** | §Y.8 |
| `30_SPIKES/.../SP-06_EXECUTION_REPORT.md` | ✅ §R | ✅ §S | — |
| `docs/CHANGELOG.md` | ✅ 顶部条目 | ✅ 顶部条目 | ✅ |
| `.learnbuddy/memory/` | ✅ | ✅ | ✅ |

**结论**：`D-057` + `D-058`–`D-062` 在**上述 9 个落点**均由同一当前有效答案表达；**不存在"A 文件 `PROPOSED`、B 文件 `CONFIRMED`"的直接冲突**。
🔴 **但 `docs/03` / `04` / `05` / `06` / `08` 未在本次 Landing 的声明影响范围内** —— 其中 `05` / `06` 残留与 `D-058`–`D-062` 相悖的**"未裁决 / `PROPOSED`"语句**（详见 §C.3）。

---

## C. Canonical Consistency

### C.1 逐文件核验

| 文件 | 是否含 `D-058`–`D-062` 同步 | 与本轮冻结结论是否冲突 | 判定 |
|---|---|---|---|
| `docs/DECISIONS.md` | ✅（权威） | 否 | ✅ PASS |
| `docs/03_V1_SCOPE.md` | ❌ 无 | ⚠️ 有残留语句（§C.3 ISSUE-01-a） | ⚠️ ISSUE |
| `docs/04_USER_FLOW.md` | ❌ 无（但无 `TQ` 状态断言） | 否 | ✅ PASS |
| `docs/05_DATA_MODEL.md` | ❌ 无 | ⚠️ 有残留语句（§C.3 ISSUE-01-b） | ⚠️ ISSUE |
| `docs/06_AI_CAPABILITIES.md` | ❌ 无 | 🔴 **有残留语句（最新一节内）**（§C.3 ISSUE-01-c） | ⚠️ ISSUE |
| `docs/07_TECH_ARCHITECTURE.md` | ✅ §5.15（当前有效） | ⚠️ §5.6 / §5.12.4 缺就地补注（§C.3 ISSUE-01-d） | ⚠️ ISSUE |
| `docs/08_UI_SPEC.md` | ❌ 无（`D-058`–`D-062` 无新增 UI 约束） | 否 | ✅ PASS |
| `docs/09_TEST_PLAN.md` | ✅ Gate B 同步护栏节（当前有效） | ⚠️ 早期节残留（§C.3 ISSUE-01-e） | ⚠️ ISSUE |

### C.2 六项硬检查（任务书 §12 A–F）

| # | 检查项 | 实测结论 | 判定 |
|---|---|---|---|
| **A** | 已 `OUT OF V1` 的功能是否仍出现在 P0 flow | `04_USER_FLOW.md` L757 明确「不实现 PDF RAG / 文献库 / 论文知识库 / `ResearchContextProvider`（`D-054`）」；`08` / `09` 无文献 UI；P0 十步未变 | ✅ **PASS** |
| **B** | Research RAG 是否偷偷进入 V1 | 全库一致 = `OUT OF V1` / `RESERVED ONLY`（契约 §0.4 B；`03` L368；`07` §5.4；`09` L660/L677；`DECISIONS` `D-054`/`D-061`） | ✅ **PASS** |
| **C** | Cloud DB 是否仍作为 Required | ❌ 不构成必需：`D-059` 明令「PostgreSQL 不是 V1 required dependency」；`03` L368 / `07` §5.2 / 契约 E.3 一致；`05` 已落《Persistence Mapping》 | ✅ **PASS** |
| **D** | 旧腾讯云 `SP-01a` 是否仍作为当前实现依赖 | 否：`07` §5.10 登记 `SUPERSEDED BY D-053`；`D-062` 明令「不得依赖腾讯云旧 `SP-01a`」；无实现依赖 | ✅ **PASS** |
| **E** | `TQ01`–`TQ05` 是否仍被标 `PROPOSED` | 🔴 **是 —— 在 `03` / `05` / `06` / `07`(§5.6,§5.12.4) / `09`(早期节) 存在残留**，且**多数未标 `HISTORICAL` / `SUPERSEDED`** | ⚠️ **ISSUE** |
| **F** | `D-057` 后置事项是否仍被写成 Coding blocker | 否：`07` §5.14 明确「不再作为 `Gate B`/`Gate C`/正式 Coding 硬阻塞项」；`09` 护栏节一致；`PSA-*` 明确「不是产品 `AC`」 | ✅ **PASS** |

### C.3 ISSUE-01｜Gate B Landing 未覆盖 `docs/03`·`05`·`06`（+ `07`/`09` 残留）｜🔴 文档传播缺口

> **性质**：**文档一致性缺口（Documentation propagation gap）**。🔴 **不是产品语义冲突**、🔴 **不是 CCR**、🔴 **不是 BLOCKER**、🔴 **不涉及任何人工产品 Decision**。
> **成因**：Gate B Landing 的声明影响范围 = `DECISIONS` / `07` / 契约 / `09` / 技术决策包 §V / Pivot §Y / `CHANGELOG` / memory（见 `CHANGELOG` 顶部条目）；**`docs/03`・`05`・`06` 未在范围内**，但其内部含"`TQ` 未裁决 / `R-A` 仍为 `PROPOSED`"的**绝对语气语句**，在 `D-058`–`D-062` 落盘后即不再成立。

**ISSUE-01-a｜`docs/03_V1_SCOPE.md`**

| 行 | 现存语句（摘要） | 当前有效口径 |
|---|---|---|
| L375 | 「🔴 **`D-054` 不等于确认 `TQ04` / `R-A`**；**`R-A` 仍为 `PROPOSED`**」（位于《`D-053`/`D-054` 范围边界同步》节） | `TQ04` 已由 **`D-061`** 最终裁决 = **`R-A`**（`CONFIRMED`）；该句仅"当时"成立 |

**ISSUE-01-b｜`docs/05_DATA_MODEL.md`**

| 行 | 现存语句（摘要） | 当前有效口径 |
|---|---|---|
| L530 | 「**不 `CONFIRM` `TQ02`**（数据层选型仍属 `Gate B`）」（位于《`D-051` 生成批次》节） | `TQ02` 已由 **`D-059`** 裁决 = **Local Workspace Files + No required cloud database**（`CONFIRMED`） |

**ISSUE-01-c｜`docs/06_AI_CAPABILITIES.md`（🔴 最严重：残留位于该文件最新一节）**

| 行 | 现存语句（摘要） | 所在节 | 当前有效口径 |
|---|---|---|---|
| **L612** | 「`TQ03` / `TQ04` / `TQ05` 的最终裁决 ｜ 🔴 **仍属 Gate B，未裁决**」 | **《S00-03 决策同步（2026-09-24，`CONFIRMED`：`D-055`/`D-056`）》§4 本节未确定的能力细节 —— 该文件最新节** | 三项**均已**由 `D-060` / `D-061` / `D-062` 裁决（`CONFIRMED`） |
| L416 | 「Level A 维度判定的具体技术手段 ｜ `TQ04`，仍属 `Gate B`，未裁决；**`R-A` 仍只是 `PROPOSED`**」 | `D-050` 同步节 | `TQ04` = `R-A`（`D-061`，`CONFIRMED`） |
| L473 / L547 | 同 L416（`A3` / `A3` 检索技术实现手段行） | `D-053`/`D-054` 节 | 同上 |
| L539 | 「🔴 **不得引入 embedding / 向量检索作为 `A3` 的实现前提** —— `TQ04` **仍留 Gate B**，**`R-A` 仍为 `PROPOSED`**」 | `D-053`/`D-054` 节 | 上半句（禁令）**仍有效**；下半句（`TQ04` 未裁决）**已失效** |

> 🔴 **影响判定（实现层）**：`docs/06` 是 `A1`–`A5` 能力实现的 canonical 依据。实现者若只读 `06`，会得出「`TQ04` 尚无裁决 ⇒ `A3` 检索路线未定 ⇒ 不能开工」的结论，**与 `D-061` 直接相悖**，构成**实现方向性歧义**。**这是 ISSUE-01 中唯一具有实际工程影响的项。**

**ISSUE-01-d｜`docs/07_TECH_ARCHITECTURE.md`**

| 位置 | 现存语句（摘要） | 当前有效口径 | 缺口 |
|---|---|---|---|
| §5.6 标题 + 末行（L243 / L252） | 「检索技术路线（`TQ04`，🔴 **未裁决**）」／「🔴 **不得 `CONFIRM` `TQ04`**；🔴 **`R-A` 仍只是 `PROPOSED`**」 | `TQ04` = `R-A`（`D-061`） | **缺就地补注**（§5.3 / §5.5 / §5.11 / §5.13 均已有，§5.6 独缺） |
| §5.12.4 状态汇总框（L382–L385 / L388） | 「`TQ03` = 🟡 `PROPOSED` / `EVIDENCE READY FOR GATE B`」「`TQ04` = 🔴 `PROPOSED R-A`（未裁决；待 `SP-06` 后 Gate B）」「`TQ05` = 可行性待 `SP-06`」「Shared Contract = `v0.2.7 DRAFT`」 | 五项全部 `CONFIRMED`；契约 = `v0.3 DRAFT` | **缺就地补注**；且 §5.11 的补注指向 §5.12（其自身已过期）而非 §5.15 |

> 🟢 **减轻因素**：`07` 末尾 §5.15《GATE B LANDING》明确标题为「当前有效」，并声明「§5.1–§5.14 原文一字未删、未改写」+ 给出 `TQ01`–`TQ05` = 全部 `CONFIRMED` 表。⇒ **`07` 可由读者自行收敛到正确口径**，但按本项目《不改写历史 + 就地补注》的既有惯例，§5.6 与 §5.12.4 应各补一条就地补注。

**ISSUE-01-e｜`docs/09_TEST_PLAN.md`**

| 行 | 现存语句（摘要） | 所在节 | 说明 |
|---|---|---|---|
| L564 / L622 / L691 | 「`matched` / `actual_attempt` / `A3` 检索的技术实现手段 ｜ `TQ04`，仍属 `Gate B`，未裁决；**`R-A` 仍只是 `PROPOSED`**」 | `D-050` / `D-053`+`D-054` 节 | 早期节残留；**后文 L784 已有 Gate B 同步护栏节**可对照（减轻因素） |
| L757 | 「`TQ03` / `TQ04` / `TQ05` 的最终裁决 ｜ 🔴 **仍属 Gate B，未裁决**」 | `D-055`/`D-056` 节 §4 | 同上；`09` 文件内已有正确口径（L787–L799） |

**ISSUE-01-f｜`docs/04_USER_FLOW.md` / `docs/08_UI_SPEC.md`**

- 两文件**未发现**与 `D-058`–`D-062` 冲突的 `TQ` 状态断言 ⇒ **不构成 ISSUE**。
- 🟢 **建议（非必须）**：各加一行《Gate B 决策同步登记》注明「`D-058`–`D-062` 对本文件**无新增约束**（`D-058`/`D-059` 属架构层、`D-060` 已由 `D-055`/`D-056` 覆盖、`D-061` 不改 UI、`D-062` 属部署层）」，以闭合传播链、防止未来误判。

### C.4 修复清单 `RL-01`（🔴 有界文档补丁；**不改任何产品语义、不新建任何 Decision / `AC`**）

| # | 文件 | 动作 | 约束 |
|---|---|---|---|
| `RL-01-1` | `docs/06_AI_CAPABILITIES.md` | 新增《S00-03 决策同步（2026-09-24，`CONFIRMED`：`D-058`–`D-062`）》节；并对 L612 / L416 / L473 / L547 / L539 各加**就地补注**（保留原文） | 「不改写历史」：原文一字不删，只追加补注 |
| `RL-01-2` | `docs/07_TECH_ARCHITECTURE.md` | §5.6 与 §5.12.4 各追加**就地补注**，指向 §5.15；**修正 §5.11 补注的指向**（`§5.12` → `§5.12 + §5.15`） | 只加补注，不动原文 |
| `RL-01-3` | `docs/03_V1_SCOPE.md` | L375 追加**就地补注**（`TQ04` 已由 `D-061` 裁决 = `R-A`） | 同上 |
| `RL-01-4` | `docs/05_DATA_MODEL.md` | L530 追加**就地补注**（`TQ02` 已由 `D-059` 裁决） | 同上 |
| `RL-01-5` | `docs/09_TEST_PLAN.md` | L564 / L622 / L691 / L757 各追加**就地补注**，指向 L784 护栏节 | 同上 |
| `RL-01-6` | `docs/04` / `docs/08` | **可选**：各加一行《Gate B 决策同步登记》（无新增约束声明） | 非必须 |
| `RL-01-7` | `docs/CHANGELOG.md` | 新增一条《Gate C Readiness / `RL-01` 文档传播补丁》条目 | 记录过程 |

**成本**：约 8–9 处编辑 + 1 条 CHANGELOG 条目；**0 个新 Decision、0 条新 `AC`、0 行产品语义变更、0 次部署、0 元费用**。
**风险**：低 —— 全部为「追加补注 / 保留原文」，符合项目《不改写历史》硬规则。

### C.5 Canonical Consistency 判定

```
Canonical Consistency = ISSUE
  · A / B / C / D / F = PASS
  · E = ISSUE（ISSUE-01；文档传播缺口，🔴 不涉及产品语义）
  · 可修复：RL-01（有界文档补丁）
```

---

## D. Contract Consistency

### D.1 文件头与效力（🔴 逐项复述，防误读）

```
文件  : docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
版本  : v0.3
状态  : v0.3 DRAFT / GATE B FINAL TECHNICAL DECISIONS INTEGRATED（D-057 + D-058–D-062）
效力  : PROPOSED（DRAFT）—— 未 FROZEN、未 CONFIRMED、Gate C 前 NOT IMPLEMENTATION BASIS
Owner : Integrator（唯一可修改方）
```

🔴 **`v0.3` 是"Gate B 最终技术决策已并入"的版本，不是冻结态**；**冻结态仍保留给 "Gate C 最终关闭审查通过"**（§14 第 4 条 / §15）。
🔴 **本评审不写 `FROZEN`、不写 `CONFIRMED`、不改契约任何产品语义**。

### D.2 18 项跨模块共享语义完整性核验（任务书 §13）

| # | 共享语义 | 契约落点 | 判定 |
|---|---|---|---|
| 1 | object identity / ID 规则 | §1.1 对象分层 / §3.1 ID 规则 / §3.2 硬规则 / §3.3 引用完整性 | ✅ 完整 |
| 2 | `source_type` | §4.1 三层 + 二分 / §4.2 硬规则 / §4.3 决策型 `Inference` 复用门禁 | ✅ 完整 |
| 3 | `Attempt` 状态 | §2.1 | ✅ 完整 |
| 4 | `Insight` 状态 | §2.2 迁移矩阵（唯一） | ✅ 完整 |
| 5 | `Hypothesis` 状态 | §2.3 裁决位（与 `Insight` **不共用**） | ✅ 完整 |
| 6 | `EvidenceRef` | §5.1 最小字段集 / §5.2 硬规则（含 `source_field_path` 落点层级） | ✅ 完整 |
| 7 | archive | §7.1 语义 / §7.2 参与能力矩阵 / §7.3 硬规则 / §7.4 唯一事实来源与派生 | ✅ 完整 |
| 8 | generation batch | §2.4（`D-051`） | ✅ 完整 |
| 9 | retrieval semantics | §9 十步 I/O / §9.1 触发与幂等 / **§9.4 `matched` 严格语义重叠** / §9.5 三层不级联 | ✅ 完整 |
| 10 | `N_检索` | §6.1 定义 / §6.2 计入·不计入 / §6.3 硬规则 | ✅ 完整 |
| 11 | `N_引用` | §6 同上（与 ⑩ 追溯同集合派生，§12 第 11 项） | ✅ 完整 |
| 12 | `R-A` | §0.4 **E.5**（`D-061`）+ §0.4 B（`RAG ≠ Vector DB`）+ §9.4（判据本体） | ✅ 完整 |
| 13 | Local Workspace | §0.4 **A**（含"逻辑对象不得扁平化"/"用户主动授权"/"不建立版本系统"） | ✅ 完整 |
| 14 | LLM Provider abstraction | §0.4 **D**（`Provider-dependent Hybrid` / 路径决定权 / 两形态条件） | ✅ 完整 |
| 15 | Credential boundary | §0.4 **D**（凭据部分：允许载体 / 禁止载体 / 目标行为 / 传输 / 日志 / UI 红线） | ✅ 完整 |
| 16 | Proxy security boundary | §0.4 **D**（`THIN` 允许项 / 禁止项 / `target` 约束 / SSRF·Open Proxy 防护） | ✅ 完整 |
| 17 | Demo / Live source distinction | §11.1 L4 第 ③ 项 `data_source_nature`（现场记录 / 事后补录 / Demo 示例数据，**复用既有字段**）+ §12 第 13 项（L4 四项为 Worker 禁改项） | ✅ **已表达**（🔴 见 D.3 备注） |
| 18 | `D-057` deferred acceptance boundary | §0.4 **E.1** + **E.9** + **E.10** | ✅ 完整 |

**结论**：**18/18 项均可由契约定位到明确落点**；**不存在"实现时必须知道、但契约完全没写"的跨模块共享语义**。

### D.3 `CONTRACT CLARIFICATION` 候选（🔴 非 CCR）

| # | 事项 | 性质 | 建议 |
|---|---|---|---|
| `CC-01` | §9.4 的 Level A **四维度 → 字段路径映射表**（`goal` / `actual_attempt` / `condition` / `actual_result`，每维度恰 1 主字段路径）在契约中**由 §12 第 6 项声明"由 Integrator 冻结"**，但映射表本体未在契约正文成表 | **已有 Decision 的技术展开**（`D-019` / `D-050` / `TQ19`） | 可于 Gate C Landing 时补一张映射表 + 注明来源；🔴 **不改变任何产品语义 ⇒ 记为 `CONTRACT CLARIFICATION`，不是 CCR** |
| `CC-02` | §0.4 A 的「物理表示由 Integrator 收敛」与 §0.4 E.8「必须继续满足的 8 项约束」已齐备；但**"stable ID 的生成规则"（唯一性 / 稳定性 / 可读性）未在契约给出最小要求** | 实现参数层 | 建议写入**本文件 §I/§J**（`IMPLEMENTATION SCHEMA PLAN`），🔴 **不升级契约、不建 Decision** |

### D.4 CCR 判定

```
CCR = NO
  · 未处理 CCR = 0（契约 §14.1：CCR-S03B-01 / 02 已 ACCEPTED 并入 v0.2.1）
  · D-049–D-062 全部属"人工决策落盘"，不是 Worker 提出的 Contract Change Request
  · 本评审不提出任何 CCR（RL-01 为文档补注；CC-01 / CC-02 为技术展开 / 实现参数）
```

---

## E. Architecture Consistency

### E.1 五条架构结论一致性

| # | 冻结结论 | 契约 | `07` | 其它 canonical | 判定 |
|---|---|---|---|---|---|
| 1 | **Local-first / 浏览器主导 + 可选 Thin Server** | §0.4 A / E.2 | §5.1 / §5.15 | `03` / `04` / `08` 有 Workspace Entry 概念 | ✅ 一致 |
| 2 | **主持久化 = 本地 Workspace 文件；无必需云 DB** | §0.4 A / E.3 / E.8 | §5.2 | `05`《Persistence Mapping》 | ✅ 一致 |
| 3 | **LLM = Provider Abstraction + `Provider-dependent Hybrid` + `Session-only Credential` + 仅注册 provider 的 Thin Proxy** | §0.4 D / E.4 | §5.5 / §5.12 / §5.15 | `06` `D-055`/`D-056` 节 | ✅ 一致 |
| 4 | **检索 = `R-A`；无数值相似度 / 无 embedding 准入 / 无 Vector DB** | §0.4 B / E.5 / §9.4 | §5.4 / §5.6(残留) / §5.15 | `06`（🔴 ISSUE-01-c）/ `09` | ⚠️ 结论一致，**文档表述有残留** |
| 5 | **部署 = Local Dev + Vercel Demo/Review Target；部署验收 `PENDING PRE-SUBMISSION`** | §0.4 E.6 / E.9 | §5.7 / §5.14 / §5.15 | `09` 护栏节 / `PSA-*` | ✅ 一致 |

### E.2 架构红线核对（🔴 全库扫描结果）

| 红线 | 结论 | 证据 |
|---|---|---|
| 不得把 Vercel 写成 `Production SaaS` / 主数据库 | ✅ 未出现当前有效违规表述（出现的全部是**禁令句**） | `07` L150/L464/L519；`D-062` 附注；`09` L804 |
| 不得宣称「Vercel 已验证 / 已部署 / HTTPS picker 已验证 / Production Ready」 | ✅ 未出现（仅作为禁令出现） | `07` L464；`D-062`；`SP-06` §S |
| 不得宣称「Local-first 已可行 / 已完成浏览器验收」 | ✅ 未出现 | `07` L465；`D-062`；`SP-06` §R/§S |
| 不得引入 Vector DB / embedding 准入 / `cosine similarity` | ✅ 未引入 | 全库检索：仅出现于**禁令 / 排除项**语境（`01`/`02`/`03`/`06`/`07`/`09`/`DECISIONS`/契约） |
| 不得引入云数据库 / 服务端持久化科研数据 | ✅ 未引入 | 契约 §0.4 A；`07` §5.2；`D-059` |
| 不得把 `PSA-*` 当产品 `AC` | ✅ 未污染 | `09` L770–L773；`PSA` 文件 §0 |
| 不得写 `src/` / 不得部署 | ✅ 工作区无 `src/` | 目录实测 |
| `Legacy Cloud Cleanup` 不得由 AI 执行 | ✅ `DEFERRED` / `NOT AUTHORIZED` | `07` §5.10；`SP-06` §Q.4 |
| 凭据不得落入任何文件 / 日志 / 报告 / 前端产物 | ✅ 未发现凭据 | `SP-06` §K（泄漏扫描 0） |

### E.3 Architecture Consistency 判定

```
Architecture Consistency = PASS
  · 五条架构结论在 contract / 07 / canonical 三方一致
  · 全部架构红线未被违反（唯一例外 = ISSUE-01-c 的"表述残留"，属文档层，非架构层）
```

---

## F. AC Coverage

### F.1 口径（🔴 唯一有效写法）

```
连续 canonical AC        = AC-01 – AC-162        = 162
独立 AC-Q06              = AC-Q06-1 – AC-Q06-6   =   6
─────────────────────────────────────────────────────
全部有效验收点总数        = 168
🔴 唯一动态来源 = docs/09_TEST_PLAN.md
🔴 本轮新增 AC = 0
🔴 禁止旧写法「有效总数 = 162（… + AC-Q06-1–6）」
```

### F.2 `D-058`–`D-062` → 既有 `AC` 覆盖映射（复核 `09_TEST_PLAN.md` L789–L798）

| Decision | `TQ` | 既有覆盖 | 覆盖充分性复核 |
|---|---|---|---|
| `D-058` | `TQ01` | `AC-127`–`AC-138` | ✅ 覆盖 Workspace / 本地持久化 / 授权后才访问 / 不得引入云 DB / **不得服务端持久化科研数据**（含 Thin Server 禁持久化）/ 不得扁平化对象模型 |
| `D-059` | `TQ02` | `AC-127`–`AC-143` | ✅ 覆盖 Primary Persistence = 本地文件；无 required cloud DB；`EvidenceRef` / stable ID / archive / 生成批次语义 |
| `D-060` | `TQ03` | `AC-144`–`AC-152` ＋ `AC-153`–`AC-162` | ✅ 覆盖 路径由 Adapter 决定 / 无通用 URL Proxy / 不接受任意 `target` / SSRF 边界 / Custom `Base URL` 仅直连 / 不预置服务端 Key ＋ 凭据会话级 / 禁止载体 / 日志脱敏 / 无 Remember Key |
| `D-061` | `TQ04` | `AC-109`–`AC-115` ＋ `AC-139`–`AC-143` | ✅ 覆盖 `D-050` 严格语义重叠 / 三态 ＋ Structured Experience RAG / 无数值相似度 / `RAG ≠ Vector DB` |
| `D-062` | `TQ05` | `AC-127`–`AC-138`（架构定位）+ `PSA-*`（部署实际验收，🔴 不是 `AC`） | ✅ 覆盖充分；**部署验收合法后置于 `PSA`** |
| `D-057` | 流程 | 无（验收时序决策） | ✅ 正确：时序决策不产生产品可观察行为 |

### F.3 AC Coverage 判定

```
AC Coverage = PASS（无 GAP）
  · D-058–D-062 的"产品可观察行为"已被既有 canonical AC 覆盖
  · 未发现"人工 CONFIRMED Decision 存在真正未被 canonical AC 覆盖的产品可观察行为"
  · 本轮新增 AC = 0（🔴 未自行新增任何产品 AC）
```

### F.4 `Implementation Test Case`（🔴 不计入产品 `AC`；归 §N 测试策略）

以下为**实现层测试案例**，仅用于 Coding 阶段回归，**不得写入 `09_TEST_PLAN.md` 的 `AC` 表**：

| ITC | 覆盖 | 说明 |
|---|---|---|
| `ITC-01` | `AC-127`–`AC-138` | Workspace 授权前不得读取任何本地目录（负向断言） |
| `ITC-02` | `AC-127`–`AC-143` | repository 层"无数据库"可用性：纯文件读写即可完成 ①→⑩ |
| `ITC-03` | `AC-144`–`AC-152` | Proxy 端点**不接受** `target_url` / `base_url` / `host` / `scheme`（拒绝式断言） |
| `ITC-04` | `AC-151` | SSRF guard 单元测试：`localhost` / RFC1918 / link-local / 非 `http(s)` 全部 `BLOCKED` |
| `ITC-05` | `AC-153`–`AC-162` | 凭据禁止载体扫描（`localStorage` / `IndexedDB` / cookie / 文件 / bundle） |
| `ITC-06` | `AC-109`–`AC-115` | Level A 三态判定：`D-050` / `D-052` 正反例全集 |
| `ITC-07` | `AC-116`–`AC-123` | 生成批次：旧产物保留、状态不迁移、不级联 |
| `ITC-08` | `AC-71`–`AC-75` / `AC-100` | archived 排除 + "先建引用再归档"现场路径 |

🔴 上述 `ITC-*` 编号**不是** canonical `AC`、**不是** `Decision ID`、**不得**被引用为验收点。若后续发现**真正的产品可观察行为缺口**，须**另行提请项目负责人裁决**，**不得在 Gate C 内自行新增 `AC`**。

---

## G. `SP-06` / `D-057` Disposition

### G.1 双层口径（🔴 不得混写）

```
HISTORICAL EXECUTION STATUS（历史执行状态，🔴 保持不变、不得改写）
  SP-06 = CONDITIONAL PASS（描述性历史汇总）
    PASS = 7        S6-11 / S6-13 / S6-14 / S6-15 / S6-16 / S6-17 / S6-20
    PARTIAL = 6     S6-02 / S6-03 / S6-07 / S6-12 + 结果记录制 S6-18 / S6-19
    PENDING MANUAL OBSERVATION = 7
                    S6-01 / S6-04 / S6-05 / S6-06 / S6-08 / S6-09 / S6-10
                    🔴 不删除、不标 PASS、不伪造观测（本文件同样不伪造）
    FAIL = 0

CURRENT PROCESS DISPOSITION（当前流程处置，依据 D-057）
  CORE ARCHITECTURE EVIDENCE = SUFFICIENT TO PROCEED TO GATE B
  DEPLOYMENT / BROWSER MANUAL ACCEPTANCE = DEFERRED TO PRE-SUBMISSION
```

🔴 **`SP-06` 的 `PASS` / 实测结论仍不得写成对任何 `TQ` 的 `CONFIRM`**（`D-058`–`D-062` 的来源是 `Gate B Final Human Confirmation`，**不是 `SP-06` 结论**）。

### G.2 `TEST SPEC GAP` 的 Gate C 正式处置（🔴 本评审必须明确处理的点）

**历史事实（🔴 不得改写、不得删除）**：

```
GAP-1｜SP-06 整体状态判据缺失
  · SP-06 Plan 只定义逐项判定口径（且明确 S6-08 / S6-09 / S6-18 为"结果记录制"）
  · Plan 未定义整体 PASS / CONDITIONAL PASS / FAIL / INCONCLUSIVE 阈值
  ⇒ CONDITIONAL PASS 仅作描述性汇总；整体判据仍待项目负责人裁定
GAP-2｜File System fallback 升级条件（"影响比赛演示的兼容性问题"）未定义为可操作判据
```

**Gate C 处置（正式）**：

```
TEST SPEC GAP
  = HISTORICAL / NON-BLOCKING UNDER D-057
  = PROCESS DISPOSITION RESOLVED  /  TEST HISTORY PRESERVED
```

- 🔴 **该 Gap 不得消失**：**GAP-1 / GAP-2 的文本继续保留**在 `SP-06` 报告 §Q.2 与 §S，**不得删除、不得改写**；
- 🔴 **不得写 `RESOLVED BY TEST`** —— 没有任何新测试裁定过该 Gap；**它是被 `D-057` 这一"人工流程决策"解除其 `Gate C` 阻塞作用的**；
- 🔴 **不得事后伪造一个阈值并回写历史结果**；
- 🔴 **不得因此重新打开 `Gate B`** —— `Gate B` 已 `COMPLETE`，`D-058`–`D-062` 已落盘；
- 🔴 **`D-057` 只解除"阻塞作用"**：`SP-06` 剩余部署 / 浏览器验收**转为提交前必做项**（`PSA-01`–`13`），**不是"被取消"**。

**Gate C 处置的精确措辞（建议登记至 `docs/CHANGELOG.md` 与 `SP-06` 报告追加位）**：

> `SP-06` 的 `TEST SPEC GAP`（GAP-1 整体状态判据 / GAP-2 fallback 升级判据）**仍未被测试裁定**；其**对 `Gate C` 的阻塞作用已由人工流程决策 `D-057` 解除**。⇒ 处置记为 **`PROCESS DISPOSITION RESOLVED` / `TEST HISTORY PRESERVED`**，🔴 **不记为 `RESOLVED BY TEST`**。

### G.3 File System fallback（Review 9）

```
File System fallback = NO DECISION REQUIRED（不变）
升级条件（仅 F1–F4 之一出现才升级）
  F1  Vercel HTTPS + 目标 Chrome/Edge 无法打开 folder picker
  F2  真实浏览器不能完成 read + create + update
  F3  正常刷新后无法通过恢复 / 重新授权继续工作
  F4  比赛现场无法保证至少一个已验证浏览器
🔴 Gate C 不允许预防性实现：Folder Import / ZIP Import·Export / File Upload / Local Companion Runtime
🔴 不得偷偷扩大开发范围
```

### G.4 `SP-06` / `D-057` Disposition 判定

```
SP-06 / D-057 Disposition = PASS
  · 双层口径未被混写
  · 7 项 PENDING MANUAL OBSERVATION 全部保留、未标 PASS
  · TEST SPEC GAP = HISTORICAL / NON-BLOCKING UNDER D-057（PROCESS DISPOSITION RESOLVED / TEST HISTORY PRESERVED）
  · 未重开 Gate B
```

---

## H. Outstanding Risks

> 全部为 **PROPOSED / 待人工确认** 级别风险登记；🔴 不新增 Decision、不新增 `AC`。

| # | 风险 | 等级 | 影响 | 处置 / 触发条件 |
|---|---|---|---|---|
| `R-01` | 🚩 **时间风险**：距初赛提交（09-26 23:59）**仅约 2 天**，`src/` 未创建 | 🔴 高 | 直接决定提交物完整性 | ✅ **当前 fast-path 起点 = `Gate C Landing` → `P0-A`**（`RL-01` / `RL-02` 已执行完毕）；非关键项一律冻结不做（见 §M） |
| `R-02` | **真实浏览器 Workspace 读写未验证**（`S6-04`/`05`/`06`） | 🟠 中 | 若现场 picker 不可用 ⇒ 演示失败 | 合法后置于 `PSA-03`–`PSA-06`；`F1`–`F4` 任一出现即升级 `DECISION REQUIRED` |
| `R-03` | **Vercel 部署未验证**（`S6-01` / Vercel 侧证据 = 无） | 🟠 中 | 评委入口不可用 | 后置于 `PSA-01`–`PSA-02` / `PSA-13`；🔴 触发付费即 `BILLING AUTH REQUIRED` + 停止 |
| `R-04` | **ISSUE-01 文档传播缺口** | 🟢 **已关闭** | ~~实现者读 `docs/06` 会误判 `TQ04` 未裁决~~ | ✅ **`RESOLVED FOR IMPLEMENTATION` / `NON-BLOCKING`** —— 已由 **`RL-01`（2026-09-24）** 关闭（8 个文件补注完毕）。🔴 **历史来源保留**：首轮该缺口为 `ISSUE-01`，处置依据 = §C.4 `RL-01`。**当前无残留** |
| `R-05` | **`TQ02` 物理 schema 缺实现方案** | 🟢 **已关闭** | ~~无法开工 `M3` repository~~ | ✅ **`RESOLVED FOR IMPLEMENTATION` / `NON-BLOCKING`** —— **`IMPLEMENTATION SCHEMA PLAN` 已在 §J 形成**（§J.1 回答 Review 4 的 11 问；§J.2 共享类型与 Owner；§J.3 目录结构）。🔴 **仍属实现参数**，不得锁成不可变产品 Decision |
| `R-06` | 🔴 **本机无任何模型 API 凭据** | 🟠 中 | 无法在本机做真实 LLM 端到端；`②④⑧⑨` 只能用确定性替身 | 开发期用 **deterministic stand-in + 显式标 `NOT_A_REAL_LLM_OUTPUT`**；真实调用由项目负责人用**自有 Key** 在浏览器（`Session-only`）验证；🔴 不得伪造实测 |
| `R-07` | **Level A LLM 判定可复现性**（`TE-POST-AI-REPRO`） | 🟡 低 | 判定稳定性 | 保持 `DEFERRED UNTIL IMPLEMENTATION`；本机 `temperature`/`seed` 不可配置 ⇒ **不得据此做结论性断言** |
| `R-08` | **Demo 现场网络可达性**（`S03-E` 认定第一风险） | 🟠 中 | 现场打不开 | 现场脚本 + 备用网络；**若不可达按既有口径换平台，不得退回本机服务** |
| `R-09` | **成本纪律** | 🟢 低 | 费用 | Vercel 必须走**免费**路径；任何付费即报「资源 + 规格 + 预计费用」并等【再次确认】；本机云资源历史遗留 `R2`/`R6-A`/`R6-B`/`R6-C` **不得由 AI 删除** |
| `R-10` | **契约仍为 `DRAFT`** | 🟢 低 | 误当作已冻结 | Gate C Landing 前**一律不作为实现依据**；`TECHNICAL DEFAULT` 可先用于骨架搭建，但**不得据其改变数据位置 / 安全边界 / LLM Key 边界 / 产品行为** |
| `R-11` | **Demo seed 限制**：`Insight`/`Hypothesis`/`EvidenceRef`/派生结果**一律不许预置** | 🟡 低 | `AC-74`/`AC-75`/`AC-100` 只能现场"先建引用、再归档"产生 | 保持既有口径；**不得为凑验收预置派生结果** |
| `R-12` | **跨源 CORS 依赖 Provider**：实测「有 CORS 可直连、无 CORS 被拦截」 | 🟡 低 | 部分 provider 只能走 Thin Proxy | 路径由 **Adapter Capability** 决定（`D-055`）；**不预置服务端固定 Key** |

---

## I. Module Boundary（正式开发模块边界）

### I.1 分层纪律（🔴 强制，任何模块不得越层）

```
第 1 层  Domain Core            ← 纯语义：对象 / 状态 / 枚举 / 判据，无 I/O、无 UI、无网络
第 2 层  Workspace Persistence  ← 文件读写、schema 序列化、stable ID
第 3 层  Retrieval / Evidence   ← Level A 判定 / 候选排除 / `EvidenceRef` / `N_检索`·`N_引用`
第 4 层  AI Adapter             ← Provider 抽象 / Browser Direct / Thin Proxy / Structured Output 校验
第 5 层  Application Services   ← `D9` 十步编排、事务边界、门禁（`E1`–`E5`、G1–G4）
第 6 层  UI                     ← 呈现 / 交互 / 文案红线
```

🔴 **禁止**：UI 组件**直接**承担 **文件 schema** / **retrieval logic** / **provider network logic** / **`EvidenceRef` logic**。
🔴 **必须**形成清晰的 **service / adapter boundary**：UI 只调用 Application Service；Application Service 只调用 Domain / Retrieval / AI Adapter / Workspace Adapter。

> 🚩 **`RL-02` 依赖纪律（2026-09-24，本计划修订）**：
> 1. **Level A projection** 属 **`M6` 内部纯函数**或**下沉至 Domain / shared projection helper**（`src/domain/projection/**`）—— 🔴 **`M6` 不得依赖 `M7`**；`M7` **单向**依赖 `M6` 的 `DerivedComparison`；🔴 **Grounding Context Builder 不参与 retrieval projection / admission**；
> 2. **`M10` 只定义 Provider interface / capability / normalized request-result contract**；🔴 **不得 `import` `M11` / `M12` 具体实现**；`M11` / `M12` **`implements`** 该 interface；**adapter registry / composition 由 `M15`（composition root）注入**；
> 3. **`M3` 仅依赖 `M2` 暴露的 workspace abstraction / `WorkspaceSession` type**，🔴 **不得依赖 `M1` App Shell**（`M1` 是 `M2` 的 consumer）。

### I.2 模块清单（M1–M16）｜逐模块：责任 / 输入 / 输出 / 依赖 / 禁止依赖 / 共享类型 / 可并行性

---

**`M1`｜App Shell / Workspace Entry**

| 项 | 内容 |
|---|---|
| 责任 | 应用外壳、路由、`Workspace Entry`（选择目录 / Demo Workspace）、未授权态呈现、全局错误边界 |
| 输入 | 用户手势（picker）、`WorkspaceHandle`（不透明句柄）、路由参数 |
| 输出 | 已挂载的 `WorkspaceSession`、可达路径（Option 1 / Option 2）、`WORKSPACE_UNAVAILABLE` 状态 |
| 依赖 | `M2`（Workspace Adapter）、`M14`（UI 层共享件） |
| 🔴 禁止依赖 | 🔴 **不得直接读写文件**（必须经 `M2`）；🔴 不得持有 Credential；🔴 不得调用 LLM |
| 共享类型 | `WorkspaceSession` / `WorkspaceEntryState`（🔴 无持久化语义） |
| 可并行性 | ✅ 独立轨（Track D） |

---

**`M2`｜Local Workspace Adapter（文件系统边界）**

| 项 | 内容 |
|---|---|
| 责任 | 封装 **File System Access API**（或浏览器等价能力）：目录授权 / 列目录 / 读 / 写 / 更新 / 重命名 / 删除句柄；权限撤销与重授权；不崩溃错误分类 |
| 输入 | `WorkspaceHandle`、相对路径、内容字节 / 文本 |
| 输出 | 文件内容 / 写入结果 / 结构化错误（`WORKSPACE_UNAVAILABLE` / `FILE_CORRUPT` / `PERMISSION_DENIED`） |
| 依赖 | 无（最底层；仅浏览器 API） |
| 🔴 禁止依赖 | 🔴 不得依赖 `M3` 以上任何模块；🔴 不得做 schema 解释；🔴 不得缓存到 `localStorage` / `IndexedDB` |
| 共享类型 | `WorkspaceHandle` / `FileRef` / `FsError` 联合类型 |
| 可并行性 | ✅ 独立轨（Track A） |

---

**`M3`｜Domain Model / Repository（逻辑对象 + 物理 schema）**

| 项 | 内容 |
|---|---|
| 责任 | 逻辑对象定义与序列化；`Attempt` / `Insight` / `Hypothesis` / `EvidenceRef` / Workspace metadata 的文件表示；**stable ID 生成与解析**；`archive_state` / `source_type` / `decision_state` / **generation batch** 落盘；schema 版本；引用完整性校验（按 ID 解析，容忍改名） |
| 输入 | Domain 对象；由 `M2` 读出的文件内容 |
| 输出 | 落盘文件；已解析的 Domain 对象；`SchemaError` |
| 依赖 | `M2`（**仅依赖 M2 暴露的 workspace abstraction / `WorkspaceSession` type**）；`src/domain/**`（自身所属层） |
| 🔴 禁止依赖 | 🔴 **不得依赖 `M1` App Shell**（`M1` 是 `M2` 的 **consumer**，不得成为 Repository 的底层依赖）；🔴 不得含检索判定逻辑；🔴 不得调用 LLM；🔴 不得自行改变状态语义（状态机归 `M6`/`M8`/`M9` 的服务层，`M3` 只做持久化与读写） |
| 共享类型 | **全部 Domain 类型（见 §J）** |
| 可并行性 | ✅ 独立轨（Track A）—— 🔴 **但共享类型冻结前不得并行**（见 §L.3） |

---

**`M4`｜Attempt Capture & Structured Parse**

| 项 | 内容 |
|---|---|
| 责任 | `D9` ①②③：NL 输入 → AI 结构化解析 → 用户确认；`Fact` / `Extraction` / `Inference` 分层落位；`Draft` / `Formal` 两级；追问计数（`max-3-key-questions-total`，`Draft` 内累计不清零） |
| 输入 | 用户 NL 原文；AI Adapter 输出 |
| 输出 | `Draft Attempt`（含待确认字段）/ `Formal Attempt` 候选；追问问题（≤3 总数） |
| 依赖 | `M3`、`M5`（仅 `E1`/`E4` 结构性检查）、`M10`–`M12` |
| 🔴 禁止依赖 | 🔴 **② 的输入不得含任何历史数据**（`TC-34` 结构性硬禁）；🔴 AI 永不产出 `Fact` |
| 共享类型 | `Attempt` / `ContentItem<K>` / `SourceType` / `AttemptState` / `FieldPresenceState` |
| 可并行性 | 🟡 依赖 `M10`（可先做 deterministic stand-in 并行） |

---

**`M5`｜Cause Analysis（失败原因分析）**

| 项 | 内容 |
|---|---|
| 责任 | `D9` ④⑤：候选失败原因（**允许 0 条、不设上限**）、未处理状态可见且持久、保存门槛（`E1`/`E4` 结构性 + `E2`/`E3` AI `Inference`） |
| 输入 | `Draft Attempt` 字段；AI Adapter 输出 |
| 输出 | 候选原因列表（含来源属性与处理状态）、门禁结果 |
| 依赖 | `M3`、`M10`–`M12` |
| 🔴 禁止依赖 | 🔴 不得把"未处理"渲染/持久化为"已确认"；🔴 `E2`/`E3` 不得引入分数 / 等级 / 置信度 |
| 共享类型 | `CauseCandidate` / `GateCheckResult`（`E1`–`E5`） |
| 可并行性 | 🟡 同 `M4` |

---

**`M6`｜Experience Retriever / Comparator**

| 项 | 内容 |
|---|---|
| 责任 | `D9` ⑥⑦：**唯一自动触发 = `Formal Attempt` 保存成功**；候选集 = 符合既有规则的历史 `Formal Attempt`（**显式排除 `Draft` 与 `archived`**）；Level A 四维度逐维三态判定（`matched` / `compared_not_matched` / `uncompared`）；`related ⇔ matched_level_a_dimensions 非空`；排序（`occurred_at` 辅助 + `attempt_id` 兜底，**唯一排序定义点**）；`uncompared` 全局 + 逐候选，**单一计算点 = ⑥** |
| 输入 | 当前 `Formal Attempt` 的 Level A 投影；历史 `Formal Attempt` 集合 |
| 输出 | 派生比较结果（**含 `N_检索` 快照**）、命中维度集合、未比对集合、主对照 3 条 + 展开可达 |
| 依赖 | `M3`、**`Level A Projection Helper`（Domain / shared projection，见 §I.3）**、`M10`（**仅 interface / capability**，用于"结构规则无法可靠判定"时的 LLM 维度级判定） |
| 🔴 禁止依赖 | 🔴 **不得依赖 `M7`**（Grounding Context Builder）—— **投影属 `M6` 侧或 Domain helper**；🔴 **不得输出任何数值相似度 / `similarity score` / 权重 / 等级**；🔴 不得用 `cosine similarity`；🔴 不得引入 embedding 准入；🔴 不得依赖 `result_status` 做 Level A 准入；🔴 不得重排（UI 不得重排） |
| 共享类型 | `DerivedComparison` / `LevelACandidate` / `TriState` / `NRetrievalSnapshot` |
| 可并行性 | ✅ 独立轨（Track C） |

---

**`M7`｜Grounding Context Builder**

| 项 | 内容 |
|---|---|
| 责任 | 组装 Grounding Context Pack：`EvidenceRef` 构造（最小字段集 + `source_field_path` 落点层级）、角色（`grounding` / `support` / `contradict` / `context`）、**仅 `Fact` 可承担 `grounding`**、`N_引用` 与 ⑩ 追溯**由同一集合派生**；归档状态**动态派生**（不存快照） |
| 输入 | 派生比较结果、历史对象 |
| 输出 | `GroundingContextPack`（含 `EvidenceRef[]`、`N_引用`） |
| 依赖 | `M3`、**`M6`（单向：只消费 `DerivedComparison`）** |
| 🔴 禁止依赖 | 🔴 **不得反向被 `M6` 依赖**；🔴 **不参与 retrieval projection / admission**（投影与准入判定**不属本模块**）；🔴 不得引入第二套引用体系；🔴 不得把 `Extraction` 用作 `grounding`；🔴 不得把整个 Workspace 上传（最小必要上下文） |
| 共享类型 | `EvidenceRef` / `RefRole` / `NCitationSnapshot` / `GroundingContextPack` |
| 可并行性 | ✅ 独立轨（Track C） |

---

**`M8`｜Insight Generation（⑧）**

| 项 | 内容 |
|---|---|
| 责任 | `D9` ⑧：**只生成 `Candidate Insight`**（`candidate`/`accepted`/`rejected` 状态机）；`E2`/`E3` 不满足 ⇒ 保持 `candidate` + 三段式（缺什么 / 为什么重要 / 如何补充，后者标 AI 建议）；accepted → 修改 → 退回 `candidate` + 重检；事件日志（状态迁移 + 时间 + 触发原因类别） |
| 输入 | `GroundingContextPack`、AI Adapter 输出 |
| 输出 | `CandidateInsight[]`、状态迁移事件 |
| 依赖 | `M7`、`M10`–`M12` |
| 🔴 禁止依赖 | 🔴 不得自动生成（只在 ⑧ 生成）；🔴 不得建立版本列表 / 对比 / 回滚；🔴 不得用 `N_检索` 决定数量语义 |
| 共享类型 | `Insight` / `InsightState` / `InsightStateEvent` / `GateCheckResult` |
| 可并行性 | 🟡 依赖 `M7` |

---

**`M9`｜Hypothesis Generation（⑨/⑩）**

| 项 | 内容 |
|---|---|
| 责任 | `D9` ⑨⑩：`History-grounded Hypothesis`（**1–2 条自适应，禁 ≥3、禁凑数**；`N_检索 = 0` 不得生成 grounded；grounding 硬条件 G1–G4 / N1–N6）／`Model Suggestion`（**保存 ≠ 接受**、永不 grounding）；0 条出口 A/B/C 三分；分区【历史证据】【模型先验】；①②③④⑤ 只读 + ⑥⑦⑧ 用户 `Fact` 与 AI `Inference` 分列；裁决位 `undecided`/`accepted`/`rejected`（**与 `Insight` 不共用**）；⑩ 追溯由 `M7` 的同一集合派生 |
| 输入 | `GroundingContextPack`、`CandidateInsight[]`、AI Adapter 输出 |
| 输出 | `Hypothesis[]` / `ModelSuggestion[]` / 追溯清单 |
| 依赖 | `M7`、`M8`、`M10`–`M12` |
| 🔴 禁止依赖 | 🔴 **⑨ 不等待 ⑧ 的 `E5`**（`D-030` + `D-022`）；🔴 不得称 `Candidate Insight`；🔴 `Hypothesis` 永不成为 `Experience Asset`；🔴 **⑨ 不得直接成为 Experience Asset**；🔴 不得把 `Model Suggestion` 填充历史依据位置 |
| 共享类型 | `Hypothesis` / `HypothesisKind` / `DecisionState` / `ModelSuggestion` |
| 可并行性 | 🟡 依赖 `M8` |

---

**`M10`｜Provider Abstraction（AI 适配抽象）**

| 项 | 内容 |
|---|---|
| 责任 | 统一 AI 调用接口；**由 Adapter Capability 决定路径**（`Browser Direct` 优先，必要时 `Thin Proxy`）；Structured Output 优先 Provider-native / constrained JSON；schema 校验 + repair / retry；**不可用 Provider 明确失败** |
| 输入 | 结构化任务描述（②④⑧⑨ + ⑥ 维度级判定）、投影后的最小上下文 |
| 输出 | 结构化结果 / `ProviderUnsupportedError` / `SchemaValidationError` |
| 依赖 | **无具体 adapter 依赖** —— **只定义 interface / capability / normalized request·result contract**；`M11` / `M12` **implement** 本接口；**adapter registry / composition 由 `M15`（application bootstrap / composition root）注入** |
| 🔴 禁止依赖 | 🔴 **不得 `import` `M11` / `M12` 的具体实现**（否则产生循环依赖）；🔴 **不得逐请求让用户手工选择 `direct`/`proxy`**；🔴 不得随机切换路径；🔴 不得预置服务端固定 Key；🔴 不得把普通 retry 升级为人工 Decision |
| 共享类型 | `ProviderConfig` / `ProviderCapability` / `AiRequest` / `AiResult` / `AiError` |
| 可并行性 | ✅ 独立轨（Track B） |

---

**`M11`｜Browser Direct Provider Adapter**

| 项 | 内容 |
|---|---|
| 责任 | 浏览器直连 Provider；五项适用条件判定；Custom `Base URL` = **仅直连**；Credential 只发往用户所选 Provider（🔴 不得额外发给 Vercel） |
| 输入 | `ProviderConfig`（含 `base_url`）、Credential（**会话级**） |
| 输出 | Provider 响应 / CORS 失败 / `ProviderUnsupportedError` |
| 依赖 | **`implements` `M10` 的 interface / capability contract**；`M13`（凭据会话存储，**仅取不透明引用**） |
| 🔴 禁止依赖 | 🔴 **不得被 `M10` `import`**（依赖方向恒为 `M11 → M10`）；🔴 不得经过 Vercel；🔴 不得持久化 Credential；🔴 不得把 Credential 写入日志 / console |
| 共享类型 | `ProviderConfig` / `CredentialRef` |
| 可并行性 | ✅ Track B |

---

**`M12`｜Thin Proxy / Registered Provider Adapter**

| 项 | 内容 |
|---|---|
| 责任 | Thin Proxy：**仅** `provider_id → 服务器端已注册 Adapter → 固定 / allowlist host`；只做 request·response normalization / forwarding / timeout·error mapping / 必要 schema transport；SSRF / Open Proxy 防护（拒绝 `localhost` / `127.0.0.0/8` / `::1` / RFC1918 / link-local·metadata / 非 `http(s)`；不跟随重定向至 allowlist 外；不"黑名单 + 默认放行"） |
| 输入 | `provider_id` + 归一化请求 + 会话内 Credential（**仅当前请求生命周期**） |
| 输出 | 归一化响应 / 拒绝（`BLOCKED`）/ 明确错误 |
| 依赖 | **`implements` `M10` 的 interface / capability contract**（客户端侧 adapter）；服务端薄层本身**无内部模块依赖** |
| 🔴 禁止依赖 | 🔴 **不得被 `M10` `import`**（依赖方向恒为 `M12 → M10`）；🔴 **不得接受 client 任意 `target_url` / `base_url` / `host` / `scheme`**；🔴 **不得**用请求参数改最终 host；🔴 不得持久化 Credential（不写 DB / 文件 / KV / cache / durable log）；🔴 不得承担 Workspace / `Attempt` / `Insight` / `Hypothesis` 持久化；🔴 不得存在 Experience database / Cloud user database |
| 共享类型 | `ProxyRequest`（**只有 `provider_id`，无 target**）/ `ProxyResponse` |
| 可并行性 | ✅ Track B |

---

**`M13`｜Credential Store（会话级）**

| 项 | 内容 |
|---|---|
| 责任 | `Session-only Credential`：输入 → 当前会话可用 → **刷新后仍可用** → 会话结束清除 → 重新进入须重输；**无「记住我 / 永久保存」入口** |
| 输入 | 用户输入的 API Key |
| 输出 | 会话内可取的 Credential（供 `M11` / `M12`） |
| 依赖 | 无（session-scoped storage 或等价抽象） |
| 🔴 禁止依赖 | 🔴 **禁 `localStorage` / `IndexedDB` / Workspace file / Git / Vercel KV / Vercel DB / Cloud DB / server fs / permanent cookie**；🔴 不得落日志 / bundle |
| 共享类型 | `CredentialRef`（**仅不透明引用，不含明文**） |
| 可并行性 | ✅ Track B |

---

**`M14`｜UI / `D9` Workflow 呈现层**

| 项 | 内容 |
|---|---|
| 责任 | 十步主链界面；七/八/九步呈现（相似点 + 差异点 + 理由列表、两分区、单来源提示、三类不可达出口、冲突并列）；`Model Settings`；文案红线（禁百分比 / 分数 / 星级 / 综合相似分 / 等级 / 版本列表 / 版本回滚 / 「记住我」） |
| 输入 | Application Service 的视图模型 |
| 输出 | 用户可感知界面与操作 |
| 依赖 | `M15`（Application Services） |
| 🔴 禁止依赖 | 🔴 **不得直接承担文件 schema / retrieval logic / provider network logic / `EvidenceRef` logic**；🔴 不得把技术层字段（`model`/`prompt`/`token`/`latency`）呈现到界面 |
| 共享类型 | 仅视图模型（View Model），**不得直接暴露 Domain 内部结构** |
| 可并行性 | ✅ 独立轨（Track D，依赖服务层接口签名冻结） |

---

**`M15`｜Application Services / `D9` 编排**

| 项 | 内容 |
|---|---|
| 责任 | `D9` 十步编排与事务边界；⑤→⑥ 自动触发（唯一自动触发）；修改 `Formal Attempt` / 归档**不自动重跑**但须显式提示 + 提供"重新检索"；三层重跑互不级联；`E1`–`E5` 门禁；`GATE`/`RUNTIME`/`ACCEPTANCE` 三层语义分离 |
| 输入 | UI 意图、Domain 对象 |
| 输出 | 视图模型、状态迁移 |
| 🚩 附加责任（composition root） | **application bootstrap / adapter registry**：`M10` 只持 interface；**`M11` / `M12` 由本模块实例化并注册**（🔴 唯一允许 `import` 具体 adapter 的位置） |
| 依赖 | `M3`–`M9`、`M10`（**interface**）、**`M11` / `M12`（仅在 composition root 中实例化与注册）** |
| 🔴 禁止依赖 | 🔴 不得在 ⑤ 与 ⑥ 之间插入任何 `D9` 未列出的用户动作；🔴 不得自动重生成 ⑧/⑨；🔴 不得静默沿用旧结果 |
| 共享类型 | `WorkflowState` / `StepResult` |
| 可并行性 | ❌ 串行集成（Integrator 收敛） |

---

**`M16`｜Demo Workspace / Local Seed**

| 项 | 内容 |
|---|---|
| 责任 | 预置 Demo Workspace（seed **只到 `Attempt` 层**）；Demo 数据**显式标「Demo / 示例数据」**；`reset_demo_baseline`（**运维动作、非产品功能**）；现场 live input 标 live / user |
| 输入 | seed 定义、用户现场输入 |
| 输出 | 可直接演示的本地 Workspace |
| 依赖 | `M3` |
| 🔴 禁止依赖 | 🔴 **`seed` 不得预置 `Insight` / `Hypothesis` / `EvidenceRef` / 派生结果**；🔴 不得"只删 Demo 记录保留现场新增" |
| 共享类型 | `DemoSeedDefinition` |
| 可并行性 | 🟡 依赖 `M3` |

> **`M17`｜Submission / Deployment（later，本阶段不实现）**：Vercel Preview 部署 + `PSA` 执行 —— 归 `PRE-SUBMISSION`，**不属于 P0 关键路径**（🔴 D-057 已合法后置）。

---

### I.3 🔴 边界裁定清单（`RL-02`｜消除循环依赖与反向依赖）

| # | 议题 | 原计划（有缺陷） | 裁定（本计划修订后） |
|---|---|---|---|
| `RC-01` | **`M6` ↔ `M7` 循环依赖** | `M6` 依赖 `M7`（投影）；`M7` 又依赖 `M6` | 🔴 **投影 = `M6` 内部纯函数** 或 **下沉 `src/domain/projection/**`**；**`M6` 不依赖 `M7`**；`M7` **单向**依赖 `M6` 的 `DerivedComparison`；🔴 **Grounding Context Builder 不参与 retrieval projection / admission** |
| `RC-02` | **`M10` ↔ `M11`/`M12` 方向** | 计划表述为"`M10` 依赖 `M11`/`M12`"，同时 `M11` 依赖 `M10` interface ⇒ 潜在循环 | 🔴 **`M10` 只定义 interface / capability / normalized contract**；**`M11` / `M12` `implements`**；**registry / composition 由 `M15` composition root 注入**；🔴 **`M10` 不 `import` 具体实现** |
| `RC-03` | **`M3` → `M1` 反向依赖** | `M3` 依赖 `M2` + `M1` 提供的 `WorkspaceSession` | 🔴 **`WorkspaceSession` / `WorkspaceHandle` Owner 恒为 `M2`**；**`M3` 仅依赖 `M2` 暴露的 workspace abstraction / `WorkspaceSession` type**；🔴 **`M3` 不依赖 `M1`**；`M1` 是 `M2` 的 **consumer** |

**修订后的依赖链（🔴 本计划当前有效口径）**：

```
Domain / Projection Helper
        ↓
M6 Experience Retriever / Comparator
        ↓ （单向）
M7 Grounding Context Builder

M10 Provider Interface / Capability / Contract      ← 只定义，不 import 具体实现
        ↑ implements
M11 Browser Direct Adapter      M12 Thin Proxy Adapter
        ↑ registry / composition 注入
M15 Application Services（composition root）

M1 App Shell / Workspace Entry  →  M2 Local Workspace Adapter  →  M3 Domain Model / Repository
                                                                    （🔴 不含 M3 → M1）
```

🔴 **不改变**：`D-050` / `D-061` / Level A 四维度 / 三态 / `related` / `N_检索` / `N_引用` 语义；`D-055` / `D-056` / `D-060` 的网络、安全、凭据语义。
🔴 **本裁定只修正实现计划的依赖方向**，🔴 **不是 `Decision`、不是 `AC`、不是 CCR**。

---

## J. Shared Types Boundary（共享类型边界）

### J.1 `IMPLEMENTATION SCHEMA PLAN`（🔴 由 Integrator 在 Gate C 补齐；**不得改变逻辑数据模型**）

> **性质**：**实现参数层**。🔴 不生成 `Decision ID`、🔴 不写 `CONFIRMED`、🔴 不改变任何逻辑语义；后续可继续收敛（🔴 不得锁成不可变产品 Decision）。
> **必须继续满足（`D-059` E.8 / 契约 §0.4 E.8）**：`human-readable` ／ `stable ID` ／ `EvidenceRef` ／ `archive_state` ／ `generation batch` ／ `source_type` ／ `decision_state` ／ `Git-friendly`·`portable`。

**J.1.1 物理承载（`TECHNICAL DEFAULT`，可收敛）**

```
Workspace Root/
  workspace.json                 ← Workspace metadata（schema_version / workspace_id / project list / settings 索引）
  projects/
    <project_id>/
      project.json               ← Project metadata
      attempts/
        <attempt_id>.md          ← Attempt 正文（Markdown body，人可读）+ YAML front-matter（稳定元信息）
        <attempt_id>.json        ← sidecar metadata（状态 / 来源属性 / 字段存在性 / 归档 / 生成批次索引）
      insights/
        <insight_id>.md / .json
      hypotheses/
        <hypothesis_id>.md / .json
      events/
        insight-state-events.jsonl  ← 产品层行为留痕（状态迁移 + 时间 + 触发原因类别）
  demo/                          ← Demo Workspace（同构；数据显式标 Demo）
```

**J.1.2 逐项落点（对应任务书 Review 4 的 11 问）**

| # | 问题 | 落点方案（🔴 实现参数，可收敛） |
|---|---|---|
| 1 | Workspace metadata 放哪里 | 根 `workspace.json`（含 `schema_version`） |
| 2 | `Attempt` 文件如何表示 | `attempts/<attempt_id>.md`（front-matter + 正文）+ `<attempt_id>.json` sidecar |
| 3 | `Insight` 如何表示 | `insights/<insight_id>.md` + `.json`（含 `state`、`generation_batch`、`E1`–`E4` 呈现所需字段） |
| 4 | `Hypothesis` 如何表示 | `hypotheses/<hypothesis_id>.md` + `.json`（含 `kind`、`decision_state`、`generation_batch`、`evidence_refs[]`） |
| 5 | `EvidenceRef` 如何表示 | 内嵌于 `Insight`/`Hypothesis` 的 `evidence_refs[]`（最小字段集按契约 §5.1；🔴 `archived_at_ref` **不入字段**，归档由 `target` 当前 `archive_state` **动态派生**）；🔴 **不建立第二套引用体系** |
| 6 | stable ID 怎么生成 | **实现参数**：形如 `<prefix>_<ULID 或 时间序 + 随机>`（`WS_` / `PRJ_` / `ATT_` / `INS_` / `HYP_`）；🔴 **ID 内嵌于文件内容**（不靠文件名）；🔴 改名/移动后仍按 ID 解析 |
| 7 | `archive_state` 如何落盘 | front-matter / sidecar 的 `archive_state: active \| archived`（**唯一事实来源**；标注位派生，不落盘重复字段） |
| 8 | `source_type` 如何落盘 | 逐内容条目落 `source_type: Fact \| Extraction \| Inference`（+ `display`/`decision` 二分） |
| 9 | generation batch 如何表示 | `generation_batch: <batch_id>`（🔴 **批次关系，不是版本号**；🔴 **不得**出现 `version` / `第 N 版` / `修改次数`）；最新批次 = 「当前生成结果」 |
| 10 | `decision_state` 如何表示 | `decision_state: undecided \| accepted \| rejected`（仅 `Hypothesis`；🔴 与 `Insight` 状态机**不共用**） |
| 11 | schema version 如何表示 | 根 `workspace.json` 的 `schema_version`（+ 每个对象文件 front-matter 可选引用）；🔴 只做兼容性判断，**不构成用户可见版本系统** |

🔴 **禁止**：任何"版本号 / 版本列表 / 版本比较 / 版本回滚 / `diff` / `restore old version` / `generation version number` / 修改次数"字段或 UI。

### J.2 共享类型清单与 Owner（🔴 冻结后 Worker 不得自行修改）

| 类型 | Owner | 使用者 | 契约来源 |
|---|---|---|---|
| `WorkspaceSession` / `WorkspaceHandle` | `M2` | `M1`/`M3` | 契约 §0.4 A |
| `Attempt` / `AttemptState`（`Draft`/`Formal`） | `M3` | `M4`/`M5`/`M6` | 契约 §2.1 |
| `ContentItem<K>` / `SourceType`（`Fact`/`Extraction`/`Inference`） | `M3` | 全部 | 契约 §4 |
| `FieldPresenceState`（含 `unknown`） | `M3` | `M5`/`M6` | 契约 §4.2 |
| `Insight` / `InsightState` / `InsightStateEvent` | `M3` | `M8`/`M9` | 契约 §2.2 / §11.3 |
| `Hypothesis` / `HypothesisKind` / `DecisionState` | `M3` | `M9` | 契约 §2.3 |
| `EvidenceRef` / `RefRole` / `GroundingContextPack` | `M7` | `M8`/`M9` | 契约 §5 |
| 🚩 `LevelAProjection`（当前 `Attempt` 与历史 `Attempt` 的 Level A 逐维投影）+ `ProjectionFn` | **Domain / shared projection helper**（`src/domain/projection/**`）（`RL-02`） | `M6`（🔴 **`M7` 不消费**） | 契约 §9.4 |
| `DerivedComparison` / `TriState` / `LevelACandidate` | `M6` | 🔴 仅 `M7`（单向）/`M14` | 契约 §9.4 |
| `NRetrievalSnapshot` / `NCitationSnapshot` | `M6` / `M7` | `M9`/`M14` | 契约 §6 |
| `GateCheckResult`（`E1`–`E5`） | `M5`/`M8` | `M8`/`M9` | `D-021`/`D-039` |
| `ProviderConfig` / `ProviderCapability` / `AiRequest`（🚩 **interface / capability / normalized contract 层**） | `M10` | `M4`/`M5`/`M6`/`M8`/`M9` | 契约 §0.4 D |
| 🚩 `AdapterRegistry`（`provider_id → adapter` 装配表） | **`M15`（composition root）**（`RL-02`） | `M10`（只读消费） | 契约 §0.4 D |
| `CredentialRef` | `M13` | `M11`/`M12` | 契约 §0.4 D |
| `ProxyRequest`（🔴 只有 `provider_id`） | `M12` | `M10` | 契约 §0.4 D |

🔴 **共享类型 = 第 1/2 层独占**；UI（`M14`）**只消费视图模型**，不得直接依赖 Domain 内部结构。
🚩 **`RL-02` 补充（🔴 冻结后 Worker 不得自行修改）**：`WorkspaceSession` / `WorkspaceHandle` **Owner 恒为 `M2`**（`M1` 与 `M3` 均为 **consumer**）；🔴 **`M3` 不得依赖 `M1`**。

### J.3 `IMPLEMENTATION DEFAULT`｜建议目录结构（🔴 非人工 Decision）

```
app/                      ← 路由 / 入口（若采用 Next.js）
src/
  domain/                 ← 第 1 层：对象 / 状态 / 枚举 / 判据（纯函数）
    projection/           ← 🚩 Level A 逐维投影纯函数（`RL-02`；`M6` 消费，🔴 `M7` 不消费）
  workspace/              ← 第 2 层：M2 文件系统适配 + M3 repository + schema
  retrieval/              ← 第 3 层：M6 检索比较 + M7 grounding context（🔴 M7 单向依赖 M6）
  ai/                     ← 第 4 层：M10 interface / capability / contract + M11 Browser Direct + M12 Thin Proxy + M13 credential
  application/            ← 第 5 层：M15 D9 编排 / 门禁 / 🚩 composition root（adapter registry 装配）
  ui/                     ← 第 6 层：M14 组件与页面
  demo/                   ← M16 seed 与 Demo Workspace
  tests/                  ← 单元 + 集成 + AC 映射
api/proxy/                ← M12 的 Thin Proxy（仅在需要时存在）
```

🔴 **目录结构不是人工 Decision**；🔴 **本轮只写计划，不创建源码**。

---

## K. Dependency Graph

> 🚩 **`RL-02` 修订（2026-09-24）**：本节已消除 `M6`↔`M7` 循环、`M10`↔`M11`/`M12` 潜在循环、`M3`→`M1` 反向依赖。详见 **§I.3**。🔴 **依赖图无环（DAG）**。

```
第 1 层  Domain / Projection Helper（src/domain/**  ·  src/domain/projection/**）
                     │  纯语义：对象 / 状态 / 枚举 / Level A 逐维投影纯函数
                     │  🔴 不依赖任何上层
                     ▼
第 2 层  ┌──────────────────────────┐
        │ M2 Local Workspace Adapter│  ← 🔴 无内部模块依赖（仅浏览器 API）
        └────────────┬──────────────┘
                     │ workspace abstraction / WorkspaceSession（Owner = M2）
        ┌────────────▼──────────────┐
        │ M1 App Shell /            │  (consumer)          ┌─────────────────────────┐
        │    Workspace Entry        │                      │ M3 Domain Model /        │
        └───────────────────────────┘                      │    Repository            │
                                                           │  🔴 只依赖 Domain + M2   │
                                                           │  🔴 不依赖 M1            │
                                                           └───┬─────────────────┬────┘
                                                               │                 │
第 3 层  ┌────────────────────────────────────────────┐        │                 │
        │ M6 Experience Retriever / Comparator        │◀───────┘                 │
        │   （消费 Domain projection helper）          │                          │
        └────────────┬───────────────────────────────┘                          │
                     │ DerivedComparison（🔴 单向）                              │
        ┌────────────▼───────────────────────────────┐                          │
        │ M7 Grounding Context Builder                │                          │
        │   🔴 不参与 retrieval projection / admission │                          │
        └────────────┬───────────────────────────────┘                          │
                     │                                                          │
第 4 层  ┌────────────▼──────────────────────┐                                    │
        │ M10 Provider Interface /          │  ← 🔴 只定义 interface / capability │
        │     Capability / Normalized       │     / normalized request·result    │
        │     Request-Result Contract       │     🔴 不 import M11 / M12         │
        └────────────▲──────────────▲───────┘                                    │
                     │ implements   │ implements                                 │
        ┌────────────┴───────┐  ┌───┴──────────────┐                             │
        │ M11 Browser Direct │  │ M12 Thin Proxy   │  （M13 Credential Store → M11/M12）│
        └────────────────────┘  └──────────────────┘                             │
                     ▲                                                            │
                     │ registry / composition（仅此一处 import 具体 adapter）    │
第 5 层  ┌───────────┴──────────────────────────────────────────────────────────┴───┐
        │ M15 Application Services（含 composition root）                            │
        │   D9 编排 / E1–E5 门禁 / 三层重跑不级联                                    │
        │   内含 M4 Attempt Capture / M5 Cause Analysis / M8 Insight / M9 Hypothesis │
        └────────────────────────────────┬──────────────────────────────────────────┘
                                         │
第 6 层                        ┌────────▼─────────┐
                              │ M14 UI / D9 Flow │
                              └──────────────────┘
                              M16 Demo（旁挂 M3）
                              M17 Deployment（later / 不在 P0）
```

**依赖方向图（禁用反向依赖）**：

| 图层 | 可依赖 | 🔴 禁止依赖 |
|---|---|---|
| 1 Domain / Projection | 无 | 任何其它层 |
| 2 Workspace（`M2`） | Domain | Retrieval / AI / Application / UI |
| 2 Workspace（`M1` App Shell） | `M2`（**consumer**） | 🔴 **`M1` 不得被 `M3` 依赖** |
| 2 Workspace（`M3` Repository） | Domain + **`M2` abstraction / `WorkspaceSession` type** | 🔴 **`M1` App Shell**；Retrieval / AI / Application / UI |
| 3 Retrieval（`M6`） | Domain / Projection / Workspace / **`M10` interface** | 🔴 **`M7`**；UI |
| 3 Retrieval（`M7`） | Domain / Workspace / **`M6`（单向）** | UI；🔴 **不得被 `M6` 依赖**；🔴 **不参与 projection / admission** |
| 4 AI Adapter（`M10`） | Domain | 🔴 **`M11` / `M12` 具体实现**；Workspace（🔴 不得读 Workspace 文件）/ UI / Application |
| 4 AI Adapter（`M11` / `M12`） | **`implements` `M10` interface** / Domain / `M13` | 🔴 **不得被 `M10` import**；Workspace / UI |
| 5 Application（`M15`） | 1–4 + **composition root 中实例化 `M11` / `M12`** | UI |
| 6 UI（`M14`） | 5 | **不得直接依赖 1–4**（🔴 除只读类型引用） |

**🔴 无环校验（`RL-02`）**：

```
RC-01  M6 → M7  ✗ 已消除  ⇒  现为  Domain/Projection → M6 → M7（单向）
RC-02  M10 ⇄ M11/M12  ✗ 已消除  ⇒  现为  M11/M12 → M10（implements）；M15 负责装配
RC-03  M3 → M1  ✗ 已消除  ⇒  现为  M3 → M2（abstraction）；M1 → M2（consumer）
⇒ 全图 DAG，无循环、无反向依赖
```

---

## L. Development Tracks

### L.1 四条并行轨（🔴 仅在 exclusive files / modules 下并行）

| Track | 范围 | 独占 owner 文件 | 可并行前提 |
|---|---|---|---|
| **Track A** | Domain（**含 `domain/projection/**`**）+ Workspace + Repository | `src/domain/**`、`src/workspace/**` | ✅ **供全队消费 ⇒ 必须最先冻结**（🚩 **`RL-02`：投影纯函数属本轨，不属 Track C**） |
| **Track B** | AI Provider **interface / capability / contract** + Browser Direct + Thin Proxy + Credential + Structured Output | `src/ai/**`、`api/proxy/**` | 可**立即**并行（🚩 **`RL-02`：先冻结 `M10` interface，`M11`/`M12` 再并行 implements；🔴 全轨不 import 反向依赖**） |
| **Track C** | Retrieval + Comparison + Grounding | `src/retrieval/**` | 需 `M3` **与 `Domain/Projection`** 冻结后并行；可先用内存夹具（🚩 **`RL-02`：`M6` 先行 → `M7` 消费 `DerivedComparison`；🔴 两者不得同时改共享类型**） |
| **Track D** | UI Shell + `D9` Workflow | `src/ui/**`、`app/**` | 需 §J 视图模型接口签名冻结后并行；可先用 mock service |

> 🚩 **`RL-02` 归属说明**：**`M15`（composition root / adapter registry 装配）不属任何并行轨** —— 由 **Integrator 串行完成**（见 §L.2），🔴 **它是唯一允许 `import` `M11` / `M12` 具体实现的位置**。

### L.2 Integrator 串行职责（🔴 不可下放）

```
① 冻结 shared types（`src/domain/types/**` + 🚩 `LevelAProjection` / `ProjectionFn` / `ProviderConfig` / `AdapterRegistry` 接口签名）—— Track A/B/C/D 共同依赖
② merge 集成
③ 🚩 **composition root 装配**（`M15` 实例化并注册 `M11` / `M12`；`M10` 只持 interface）
④ build 校验（类型 / 构建 / lint）
⑤ 回归（`ITC-01`–`ITC-08` + 既有 `AC` 映射子集）
⑥ canonical check（`AC` 口径 162 + 6 = 168；无新增 `AC`；无 PROPOSED→CONFIRMED 误升级）
⑦ 🚩 **依赖方向校验**（`RL-02`）：确认 `M6` 无 `M7` 依赖、`M10` 无 `M11`/`M12` import、`M3` 无 `M1` 依赖 —— 🔴 **全图 DAG、无环**
```

### L.3 并行纪律（🔴 硬禁止）

🔴 **禁止多个 Worker 同时修改**：

```
shared contract          docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
shared types             src/domain/types/**
canonical docs           docs/00–09 · docs/DECISIONS.md · docs/CHANGELOG.md
root config              package.json · tsconfig*.json · 构建配置 · 环境变量文件
same module              M1–M16 中任一模块（同一时刻仅一个 owner）
```

🔴 **若当前环境不适合并行** ⇒ **采用纯串行顺序**（🚩 **`RL-02` 修订后**）：

```
M2 → M3 → Domain/Projection（§I.3 RC-01）→ M6 → M7 → （M4 → M5）→ M8 → M9
  → M10（interface 先行）→ M11 → M12 → M13 → M15（composition root 装配）→ M14 → M16
（M1 App Shell 与 M2 同批交付，🔴 不进入 M3 的上游依赖）
```

> **本轮建议**：考虑到仅剩约 2 天（`R-01`），**建议采用"Track A 先行 + B 并行 + C/D 随后"的轻并行**，而不是四条全开 —— 以减少 merge 冲突成本。
> 🚩 **`RL-02` 补充**：Track C 内部**不得两人同时改 `M6` 与 `M7` 的共享类型**（`DerivedComparison` Owner = `M6`）；Track B 内部 **`M10` 的 interface 必须先冻结**，`M11` / `M12` 才能并行实现。

---

## M. Fast-path Order（P0 关键路径排程）

### M.1 关键路径定义（🔴 唯一必须打通的闭环）

```
Workspace → Attempt → Parse → Confirm → Cause → Save → Retrieve → Compare
        → Insight → Hypothesis → EvidenceRef
```

### M.2 优先级分批

| 批次 | 内容 | 模块 | 目标 |
|---|---|---|---|
| **P0-A** | Domain + Workspace | `M1`、`M2`、`M3`、🚩 **`Domain/Projection`** | 能授权目录、能读写稳定 ID 对象、能解析引用；🚩 **投影纯函数可用** |
| **P0-B** | `D9` Core Services | `M4`、`M5`、`M6`、`M7`、`M8`、`M9`、`M15` | 无 LLM 也能跑通 ①→⑦ 与（用确定性替身）⑧⑨⑩ |
| **P0-C** | LLM Provider | `M10`、`M11`、`M12`、`M13` | 🚩 **先冻结 `M10` interface**，再并行 implements；可配置 Provider；路径由 Adapter 能力决定；无法直连时明确失败 |
| **P0-D** | UI 主链 | `M14` | 十步可点、文案红线不破 |
| **P0-E** | Demo + Acceptance | `M16` + `ITC-*` | Demo Workspace 可演示；回归通过 |

### M.3 非关键（🔴 禁止占用 P0 时间）

```
动画 · 高级视觉设计 · Research RAG · 复杂设置页 · 账号系统 · 云同步
多人在线协作 · 权限体系 · 知识图谱 · 向量检索 · 版本系统 · 国际化 · 主题切换
```

### M.4 两天节奏（✅ `RL-01` / `RL-02` 已执行；🔴 当前 fast-path 起点 = `Gate C Landing`）

**当前 fast-path 起点（🔴 更新后）**：

```
Gate C Landing
  → P0-A
  → P0-B
  → P0-C / P0-D
  → P0-E
  → PRE-SUBMISSION PSA
```

🔴 **`RL-01` / `RL-02` 已于 2026-09-24 执行完毕，不再是待执行动作**；🔴 **`P0` 范围未改变**。

| 时间窗 | 目标 | 出口判据 |
|---|---|---|
| **D1 上午** | **`Gate C Landing` → `P0-A`** | 契约 = `FROZEN` / `IMPLEMENTATION BASIS = YES`；`CODING_START_HANDOFF.md` 已生成；`M1`–`M3` 可读写 1 条对象 |
| **D1 下午** | `P0-B` | 无 LLM 跑通 ①→⑦；三态判定符合 `D-050`/`D-052` |
| **D1 晚** | `P0-B` 收尾 + `P0-C` | ⑧⑨⑩ 用替身跑通；`EvidenceRef` 全解析 |
| **D2 上午** | `P0-D` | UI 十步可点；红线回归通过 |
| **D2 下午** | `P0-E` + `PSA` 准备 | Demo 可演示；构建成功 |
| **D2 晚（提交前）** | `PRE-SUBMISSION PSA`：Vercel Preview + Chrome/Edge 真实 Workspace 验收 | `PSA-01`–`PSA-13` + `PSA-X1`–`X11` 逐项记录；**23:59 前提交** |

> 🔴 若时间不足：**优先保住 `P0-A`/`P0-B`/`P0-D` 的"可演示闭环"**，宁可缩减 `P0-C` 的 Provider 数量（**不得伪造能力**，须显式说明"未配置 Provider 时"的状态）。

---

## N. Test Strategy

### N.1 三层测试

| 层 | 内容 | 运行条件 |
|---|---|---|
| **单元** | Domain 纯函数（状态机 / 判据 / 三态 / `N_检索`·`N_引用` 派生 / ID 解析 / SSRF guard / 凭据载体扫描） | ✅ **本机可跑，无需凭据** |
| **集成** | `M2`↔`M3`（文件读写 / 改名后按 ID 解析）· `M6`↔`M7`↔`M9`（无 LLM 的确定性替身链路）· `M10`↔`M11`/`M12`（mock provider） | ✅ **本机可跑，无需凭据** |
| **端到端** | 真实浏览器 + 真实 LLM Provider | ⚠️ **需项目负责人自有 Key（会话级）+ 真实浏览器** ⇒ 归 `PSA`（提交前） |

### N.2 与 canonical `AC` 的映射（🔴 不新增 `AC`）

- 每个 `ITC-*`（§F.4）**必须**在测试文件中显式标注它所验证的 **既有 canonical `AC` 编号**；
- **`AC` 口径回归断言**：测试套件**不得**出现 `AC-163+`；**不得**出现 `AC` 总数 ≠ 162 + 6 的统计写法；
- **红线负向断言**（必须写成"断言不存在"）：
  - 无 `similarity score` / 百分比 / 星级 / 综合相似分 / 等级；
  - 无版本号 / 版本列表 / 版本比较 / 版本回滚 / 修改次数；
  - 无通用 URL Proxy 端点（不接受 `target_url` / `base_url` / `host` / `scheme`）；
  - 凭据不出现在 `localStorage` / `IndexedDB` / cookie / Workspace 文件 / 日志 / bundle；
  - 授权前不读取任何本地目录。

### N.3 无凭据条件下的诚实口径（🔴 硬规则）

```
本机无任何模型 API 凭据 ⇒
  · ②④⑧⑨ 的端到端只能使用 deterministic stand-in
  · 所有 stand-in 输出必须显式标记 NOT_A_REAL_LLM_OUTPUT
  · 🔴 不得把 stand-in 通过写成"AI 能力已验证"
  · 🔴 不得伪造任何实测结果
```

### N.4 测试命令（计划，🟡 待 `P0-A` 后确定具体脚本）

```
typecheck   →  构建前类型校验（全部模块）
unit        →  domain / retrieval / ai / workspace 单元测试
integration →  文件层 + 无 LLM 链路集成测试
ac-map      →  校验每个 ITC 的 AC 标注完整、无新增 AC
```

---

## O. Demo Strategy

| 项 | 方案（🔴 不新增产品机制） |
|---|---|
| Demo 入口 | Vercel URL → 产品首页 → **Option 1：打开 Demo Workspace** / **Option 2：选择自己的 Workspace** |
| Demo 数据 | **Local Demo Workspace**（🔴 不再是云数据库 seed）；**同工作空间为硬要求**（否则 `TC-80` MUST 不成立） |
| seed 范围 | 🔴 **只到 `Attempt` 层**；seed 数量与结构按 `S03-E` 既有设计（`TQ10`）**不变**；🔴 **不预置 `Insight` / `Hypothesis` / `EvidenceRef` / 派生结果** |
| Demo 标注 | 预置数据**必须显式标「Demo / 示例数据」**，且 ⑨ 引用到历史时**保持该标注**（`D8`） |
| 现场输入 | 现场**新增 1 条**并标 live / user（🔴 不得伪装成 Demo） |
| `reset_demo_baseline` | **运维动作、非产品功能**；🔴 **禁止"只删 Demo 记录保留现场新增"** |
| 现场脚本 | 按 `S03-E` 既有 `TE-DEMO-LIVE-01/-02/-03`（🔴 属 Demo 操作方案，不是产品功能） |
| seed 限制 | 🔴 「曾被引用后被归档」夹具**无法 seed** ⇒ `AC-74`/`AC-75`/`AC-100` **只能现场"先建引用、再归档"产生** |
| 第一风险 | **现场网络可达性**（`R-08`）；不可达时按既有口径**换平台**，🔴 **不得退回本机服务** |

---

## P. Pre-submission Deferred Work（🔴 合法后置，不是"可不做"）

### P.1 清单（来源 = `20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md`，全部 `PENDING`）

```
PSA-01  Vercel HTTPS 页面可打开
PSA-02  HTTPS 下唤起 Workspace folder picker
PSA-03  Chrome 真实目录授权
PSA-04  真实读取本地 Workspace
PSA-05  真实创建文件并磁盘可见
PSA-06  真实修改文件并磁盘落盘
PSA-07  刷新后的 Workspace 恢复 / 重新授权行为（结果记录制）
PSA-08  关闭浏览器再打开后的恢复行为（结果记录制）
PSA-09  撤销权限后不能继续绕过权限访问
PSA-10  重新授权后可恢复工作
PSA-11  Vercel 环境不保存整个 Workspace
PSA-12  Vercel Thin Proxy 只用于 registered provider adapter
PSA-13  Vercel 免费 / 当前可接受部署方式满足比赛演示
附加核对位  PSA-X1 – PSA-X11（Demo URL / Chrome / Edge / picker / read·write·refresh·reopen /
            permission revoke / LLM provider / Thin Proxy / Credential leak / Workspace upload / Vercel billing）
```

### P.2 硬规则（🔴 逐条）

- 🔴 **`PSA-*` 不是产品 `AC`** —— 不得写入 `AC` 序列、不得替代任何 `AC` 断言、不得以其结果宣称任何 `AC` 通过；
- 🔴 **它们不是"可以不做"** —— 提交前**必须完成并记录**，否则视为提交物不完整；
- 🔴 **`PSA` 的 `PENDING` 不构成 `Gate C` blocker**（`D-057` 已合法后置）；
- 🔴 **`PSA-13` 触发付费** ⇒ 立即停止 + 报 `BILLING AUTH REQUIRED`；
- 🔴 **`F1`–`F4` 任一出现** ⇒ 升级 `DECISION REQUIRED｜File System Fallback`（🔴 不得预防性实现 fallback）。

---

## Q. Gate C Verdict

### Q.1 逐项判定（首轮，`RL-01` / `RL-02` 之前 —— 🔴 历史记录，保留不改；当前有效判定见 §Q.3 与 §S）

```
Repository State Check
  · STATE DRIFT = NO（A.1 的 15 项全部与预期一致）

Decision Consistency                 : PASS
Canonical Consistency                : ISSUE（ISSUE-01：文档传播缺口，🔴 不涉及产品语义）
Contract Consistency                 : PASS（18/18 项齐备；CONTRACT CLARIFICATION 候选 2 项；CCR = NO）
Architecture Consistency             : PASS
AC Coverage                          : PASS（无 GAP）
SP-06 TEST SPEC GAP（当前正式处置）  : HISTORICAL / NON-BLOCKING UNDER D-057
                                       = PROCESS DISPOSITION RESOLVED / TEST HISTORY PRESERVED
                                       （🔴 不记为 RESOLVED BY TEST；🔴 不重开 Gate B）
PSA                                  : NON-BLOCKING DEFERRED / 全部 PENDING（合法后置）

Unresolved Important Decisions       : 0
BLOCKER                              : NO
CCR                                  : NO
PRODUCT SEMANTIC CONFLICT            : NO
Implementation Plan                  : READY（本文件 §I–§O 已形成完整模块边界 / 共享类型 / 依赖图 / 排程 / 测试 / Demo 策略）
Module Boundary                      : READY（M1–M16 责任·输入·输出·依赖·禁止依赖·共享类型·并行性 全部给出）
Parallel Development                 : READY（Track A–D + Integrator 串行职责 + 禁改清单）
```

### Q.2 首轮 Gate C Verdict（`RL-01` / `RL-02` 之前 —— 🔴 历史记录，保留不改）

```
🔴 GATE C VERDICT（首轮）= NOT READY
```

**理由（唯一）**：

- `Canonical Consistency = ISSUE`：`docs/06_AI_CAPABILITIES.md`（**最新一节内**，L612）与 `docs/05`（L530）、`docs/03`（L375）、`docs/07`（§5.6 / §5.12.4）、`docs/09`（早期节 4 处）**仍以当前语气断言 `TQ03`/`TQ04`/`TQ05` 未裁决 / `R-A` 仍为 `PROPOSED`**，而 `D-060`/`D-061`/`D-062` 已将其裁决为 `CONFIRMED`；**且多数缺 `HISTORICAL` / `SUPERSEDED` 标注**。
- 依任务书 §22：**「NOT READY = 存在可修复文档 / contract / implementation plan gap，但不是重大产品 Decision」** ⇒ **本情形完全落入该定义**。
- 🔴 **这不是"重大产品 Decision 缺失"** ⇒ **不是 `BLOCKED`**；**四项 blocking-class 标志全部为 NO**。

**性质与严重度**：

| 维度 | 判定 |
|---|---|
| 是否涉及产品语义 | ❌ 否 —— **零产品语义变更** |
| 是否需要人工重新裁决 | ❌ 否 —— **零新 Decision** |
| 是否需要新增 / 重排 `AC` | ❌ 否 —— **`AC` 新增 = 0** |
| 是否阻塞模块边界 / 实现计划 | ❌ 否 —— §I–§O 已完整 |
| 是否需要重跑 Spike / 部署 | ❌ 否 |
| **可修复性** | ✅ **完全可修复**：`RL-01`（§C.4）**追加补注 + 1 条 CHANGELOG**，**符合项目《不改写历史》硬规则**，**约 0 元、0 依赖、0 风险** |

### Q.3 ✅ Recheck 后 Gate C Verdict（🔴 **当前有效**）

> **触发**：项目负责人 **2026-09-24 回复「A｜批准执行 `RL-01` 文档传播补丁」**，并同时批准执行 **`RL-02`（实现计划依赖关系修正）**。
> **执行记录 + 有界 Recheck 明细 = §S**。

```
✅ GATE C VERDICT（当前有效）= READY WITH NON-BLOCKING DEFERRED ITEMS
```

| 检查项（有界 Recheck，仅 5 项） | 首轮 | **Recheck（当前）** |
|---|---|---|
| 1｜Canonical Consistency | ISSUE | ✅ **PASS**（`ISSUE-01` 已由 `RL-01` 关闭） |
| 2｜Module dependency 无循环 / 无反向依赖 | READY（未专项校验） | ✅ **PASS**（`RC-01` / `RC-02` / `RC-03` 全部消除；全图 **DAG**） |
| 3｜Contract Consistency | PASS | ✅ **PASS**（🔴 契约**当时仍为 `v0.3 DRAFT`**，未冻结；18/18 项齐备）｜🟢 **其后已由 Gate C Landing 推进为 `v0.3 FROZEN / IMPLEMENTATION BASIS`（见 §T）** |
| 4｜AC Coverage | PASS | ✅ **PASS**（无 GAP；**新增 `AC` = 0**；口径 162 ＋ 6 = 168 不变） |
| 5｜BLOCKER / CCR / PRODUCT SEMANTIC CONFLICT | NO / NO / NO | ✅ **NO / NO / NO** |

**`READY` 部分**：无 unresolved important decision｜无 blocker｜无 CCR｜无 product semantic conflict｜无 AC coverage gap｜模块边界清楚｜实现计划完整。
**`NON-BLOCKING DEFERRED ITEMS` 部分**：
- `PSA-01`–`PSA-13` + `PSA-X1`–`X11`（**提交前必做**，全部仍 `PENDING`；🔴 不是产品 `AC`）；
- `SP-06` `TEST SPEC GAP`（`HISTORICAL / NON-BLOCKING UNDER D-057`；`PROCESS DISPOSITION RESOLVED` / `TEST HISTORY PRESERVED`）；
- `SP-06` 7 项 `PENDING MANUAL OBSERVATION` 与 Vercel 部署验证（后置至提交前）。

### Q.4 ✅ 冻结状态（`Gate C Landing` 已执行）

> 🟢 **就地补注（2026-09-24，按「不改写历史」保留本节原判定为历史）**：本节原记录 = **`Gate C Landing` 执行前**的状态（契约仍 `v0.3 DRAFT` / 未 `FROZEN` / 未生成 `CODING_START_HANDOFF.md`）。**项目负责人其后回复 `A｜确认 Gate C，冻结当前实现基线并允许正式开发`** ⇒ **`Gate C Landing` 已执行**：

```
Gate C Landing                 : ✅ EXECUTED（2026-09-24）
Shared Contract                : v0.3 DRAFT → ✅ v0.3 FROZEN / IMPLEMENTATION BASIS
IMPLEMENTATION BASIS           : ✅ YES
版本号                          : 🔴 v0.3 不变（不发明新版本号）
CODING_START_HANDOFF.md        : ✅ 已生成
FINAL FREEZE SANITY CHECK      : ✅ 8 项全部成立
Gate C                         : ✅ COMPLETE
```

🔴 **仍未写正式产品代码 / 未创建 `src/` / 未部署**；🔴 **本轮结束时点止于 `NEXT TASK`，不自动开始 Coding**（见 §T）。

---

## S. `RL-01` / `RL-02` 执行记录 + Gate C Readiness Recheck（有界）

### S.1 `RL-01`｜Gate B Landing 文档传播补丁（🔴 仅追加就地补注 / 保留原文）

| # | 文件 | 实际动作 |
|---|---|---|
| `RL-01-1` | `docs/06_AI_CAPABILITIES.md` | **新增《S00-03 决策同步（2026-09-24，`CONFIRMED`：`D-058`–`D-062`）》节**（4 小节：`D-061`→`A3`／`D-060`→`A1`–`A5`／`D-058`/`D-059`/`D-062` 边界／不改变清单）；**5 处就地补注**（`D-050` 节未确定项、`D-051`/`D-052` 节未确定项、`D-053`/`D-054` 节 §5 禁令行、`D-053`/`D-054` 节 §6 未确定项、`D-055`/`D-056` 节 §4 未确定项） |
| `RL-01-2` | `docs/07_TECH_ARCHITECTURE.md` | **§5.6 就地补注**（`TQ04` = `R-A`，`R-B`/`R-C` 明确放弃）；**§5.12.4 状态汇总框就地补注**（指向 §5.15）；**§5.11 就地补注追加**（🔴 上一段原文已逐字恢复保留，只做追加） |
| `RL-01-3` | `docs/03_V1_SCOPE.md` | **《`D-053`/`D-054` 范围边界同步》节末追加就地补注**（逐条对应 §3 第 4/5 条与 §4 第 7 条） |
| `RL-01-4` | `docs/05_DATA_MODEL.md` | **《`D-051` 生成批次》节追加就地补注**（`TQ02` 已由 `D-059` 裁决；逻辑数据模型不变） |
| `RL-01-5` | `docs/09_TEST_PLAN.md` | **5 处就地补注**（`D-050` 节 回归禁止项 + 未确定项；`D-051`/`D-052` 节未确定项；`D-053`/`D-054` 节未确定项；`D-055`/`D-056` 节未确定项） |
| `RL-01-6` | `docs/04_USER_FLOW.md` / `docs/08_UI_SPEC.md` | **各新增《S00-03 Gate B 决策同步登记》节** —— 逐 Decision 登记"**无新增流程 / 无新增界面约束**"，🔴 **不改动两文件既有内容** |
| `RL-01-7` | `docs/CHANGELOG.md` | **新增一条 `Gate C Readiness / RL-01 + RL-02` 条目**（见 S.4） |

🔴 **全部为"追加就地补注 / 新增登记节"，未删除、未改写任何历史原文**；🔴 **零产品语义变更、零新 `Decision`、零新 `AC`、零 CCR**。

### S.2 `RL-02`｜实现计划依赖关系修正（本文件内修订）

| # | 议题 | 修正结果 | 落点 |
|---|---|---|---|
| `RC-01` | `M6` ↔ `M7` 循环依赖 | **Level A projection 归 `M6` 内部纯函数 / 下沉 `Domain/shared projection helper`**；`M6` **不依赖 `M7`**；`M7` **单向**消费 `M6` 的 `DerivedComparison`；**`M7` 不参与 retrieval projection / admission** | §I.1 / §I.2(`M6`,`M7`) / **§I.3** / §J.2 / §J.3 / §K |
| `RC-02` | `M10` ↔ `M11`/`M12` 方向 | **`M10` 只定义 interface / capability / normalized request·result contract**；**`M11` / `M12` `implements`**；**adapter registry / composition 由 `M15`（composition root）注入**；🔴 **`M10` 不 `import` 具体实现** | §I.2(`M10`,`M11`,`M12`,`M15`) / **§I.3** / §J.2(`AdapterRegistry`) / §K / §L.1 / §L.2 |
| `RC-03` | `M3` → `M1` 反向依赖 | **`WorkspaceSession` / `WorkspaceHandle` Owner 恒为 `M2`**；`M3` **仅依赖 `M2` 暴露的 abstraction / type**；🔴 **`M3` 不依赖 `M1`**；`M1` 是 `M2` 的 consumer | §I.2(`M3`) / **§I.3** / §J.2 / §K |

**同步修正的文件内容**：Module Boundary（§I.1 / §I.2 / **新增 §I.3**）、Dependency Graph（§K，重绘 + 依赖方向表 + 无环校验）、Development Tracks（§L.1 / §L.2 / §L.3 串行顺序）、Fast-path（§M.2）、Shared Types Boundary（§J.2 / §J.3）。
🔴 **未改变**：`D-050` / `D-061` / Level A / 三态 / `related` / `N_检索` / `N_引用` 语义；`D-055` / `D-056` / `D-060` 的网络、安全、凭据语义。🔴 **`RL-02` 不是 `Decision`、不是 `AC`、不是 CCR**。

### S.3 Gate C Readiness Recheck（有界，仅 5 项）

```
1｜Canonical Consistency            : ✅ PASS
     · ISSUE-01 已由 RL-01 关闭（docs/03・04・05・06・07・08・09 全部补注完毕）
     · docs/06 最新节已不再断言 TQ 未裁决；新增 D-058–D-062 同步节

2｜Module dependency 无循环/反向依赖 : ✅ PASS
     · RC-01 M6→M7      : 已消除 ⇒ Domain/Projection → M6 → M7（单向）
     · RC-02 M10⇄M11/M12: 已消除 ⇒ M11/M12 implements M10；M15 装配
     · RC-03 M3→M1      : 已消除 ⇒ M3 → M2（abstraction）；M1 → M2（consumer）
     · 全图 = DAG（§K 无环校验）

3｜Contract Consistency             : ✅ PASS
     · 契约仍为 v0.3 DRAFT / GATE B FINAL TECHNICAL DECISIONS INTEGRATED
     · 未 FROZEN / 未 CONFIRMED / 未 IMPLEMENTATION BASIS（🔴 冻结仍待 Gate C Landing）
     · 18/18 跨模块共享语义齐备；CCR = NO

4｜AC Coverage                      : ✅ PASS
     · 连续 canonical 162 ＋ 独立 AC-Q06 6 ＝ 全部有效验收点 168
     · 新增 AC = 0；未重编号；未并入
     · D-058–D-062 的产品可观察行为已被既有 AC 覆盖（映射不变）

5｜BLOCKER / CCR / PRODUCT SEMANTIC CONFLICT
     · BLOCKER                    : NO
     · CCR                        : NO（未处理 = 0）
     · PRODUCT SEMANTIC CONFLICT  : NO
     · Unresolved Important Decisions : 0
```

### S.4 `docs/CHANGELOG.md` 登记内容（`RL-01-7`）

新增条目《2026-09-24 — S00-03 / GATE C READINESS REVIEW（`RL-01` + `RL-02`）》：`Gate C Verdict` 首轮 `NOT READY` → `RL-01` 文档传播补丁 → `RL-02` 依赖关系修正 → Recheck = **`READY WITH NON-BLOCKING DEFERRED ITEMS`**；🔴 **未冻结契约**、**未新增 `Decision` / `AC`**、**未写代码 / 未部署**。

---

## R. Human Confirmation

> 🔴 **`RL-01` / `RL-02` 的执行记录与有界 Recheck 明细见上方 §S**；本节为**最终人工确认**（文档顺序：§S 为执行记录附录，置于 §R 之前）。

### R.1 本轮未执行（🔴 逐项确认）

🔴 **未写正式代码 / 未创建 `src/` / 未安装依赖 / 未部署 / 未创建或删除任何资源 / 未跑 `PSA` / 未重跑 `SP-06` / 未新增任何 `Decision` / 未新增任何 `AC`**
✅ **已执行（本阶段新增）**：`FINAL STATUS HYGIENE CHECK`（4 项）｜**`Gate C Landing`**（契约冻结 + `IMPLEMENTATION BASIS = YES` + 文档/记忆落盘 + `CODING_START_HANDOFF.md`）｜`FINAL FREEZE SANITY CHECK`（8 项）—— 🔴 **均不包含任何业务代码**

### R.2 【GATE C FINAL HUMAN CONFIRMATION】— ✅ 已确认

```
项目负责人回复（2026-09-24）：A｜确认 Gate C，冻结当前实现基线并允许正式开发
```

**已冻结者（✅ 已落盘）**：

```
Product Semantics        （D1–D10 / R1–R6 / D-011–D-062 / ADJ-01 / Q16 —— 全部不变；一字未改）
Technical Architecture   （D-053 Local-first / D-058–D-062 —— 一字未改）
Shared Contract          （v0.3 DRAFT → ✅ v0.3 FROZEN / IMPLEMENTATION BASIS；🔴 版本号 v0.3 不变）
Module Boundaries        （M1–M16 + §I.1 分层纪律 + §I.3 边界裁定 + §K 依赖图（DAG））
Implementation Plan      （§I–§O；含 IMPLEMENTATION SCHEMA PLAN §J.1）
```

**不会被冻结成产品 Decision 的实现参数（🔴 明确列出）**：

```
TypeScript 具体 library · 框架内部组件 · 文件名 / 目录名 · helper / parser
retry 参数 · timeout · UI 微观实现 · Markdown / JSON schema 细节
具体 Provider 清单 / allowlist 内容 / 脱敏实现方式 / session 抽象选型
```

### R.3 🔴 本轮结束状态

```
FORMAL PRODUCT CODE : STILL NOT WRITTEN
src/                : NOT CREATED
DEPLOYMENT          : NOT PERFORMED
GATE C LANDING      : ✅ EXECUTED
GATE C              : ✅ COMPLETE
CODING_START_HANDOFF: ✅ GENERATED（20_INTEGRATION/CODING_START_HANDOFF.md）
```

🔴 **本会话止于 `NEXT TASK`，不自动开始 Coding。**

---

## T. `Gate C Landing` 执行记录 + `FINAL FREEZE SANITY CHECK`

### T.1 `FINAL STATUS HYGIENE CHECK`（4 项｜🔴 不是新 `RL`、不是新 `Decision`、不是新 `AC`）

| # | 项 | 处置 |
|---|---|---|
| 1 | **本文件文件头** | `Gate C Verdict` 由 `NOT READY` 更新为 **`READY WITH NON-BLOCKING DEFERRED ITEMS` / `PENDING FINAL HUMAN LANDING`**；🔴 **历史首轮 `NOT READY` 保留于 §Q.1 / §Q.2，未删除未改写** |
| 2 | **§H Outstanding Risks** | `R-04`（`ISSUE-01` 已由 `RL-01` 关闭）与 `R-05`（`IMPLEMENTATION SCHEMA PLAN` 已在 §J 形成）⇒ **disposition 更新为 `RESOLVED FOR IMPLEMENTATION` / `NON-BLOCKING`**；🔴 **历史风险来源保留**（不再写"未修" / "尚无实现方案"） |
| 3 | **§M.4 两天节奏** | 起点更新为 **`Gate C Landing → P0-A → P0-B → P0-C / P0-D → P0-E → PRE-SUBMISSION PSA`**；🔴 **`RL-01` 不再写成未来待执行动作**；🔴 **`P0` 范围未改变** |
| 4 | **`CONTRACT CLARIFICATION CC-01`** | 契约**新增 §9.4.1《Level A 四维度 → 主字段路径映射表》**（`goal → goal`／`approach·技术对象 → actual_attempt`／`condition → condition`／`result·现象 → actual_result`），登记为 **`CONTRACT CLARIFICATION`**（🔴 **不是 CCR、不是新 `Decision`、不新增 `AC`**；🔴 **不改变 `D-019` / `D-050` / `D-061` 语义**）；**`CC-02`（`TQ02` 物理 schema）不升级为 Contract Decision**（落点 = 实现层 §J） |

### T.2 `Gate C Landing` 落盘清单

| # | 落点 | 动作 |
|---|---|---|
| 1 | `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md` | 文件头 → **`v0.3 FROZEN / IMPLEMENTATION BASIS`**；新增《v0.3 FROZEN 说明》；**新增 §9.4.1**；§12 第 6 项补注；§13.2 v0.3 补充；§14 第 4 条 v0.3 FROZEN 补注；§14.1 两条「无新增 CCR」；§15 新增 **`v0.3 FROZEN`** 行 |
| 2 | `docs/07_TECH_ARCHITECTURE.md` | **新增 §5.16《GATE C｜实现基线冻结登记》**；§5.15 状态表就地补注（`Shared Contract` 行已由冻结态取代） |
| 3 | `20_INTEGRATION/S00-03_技术决策包.md` | **新增 §V.13** |
| 4 | 本文件 | §Q.1–§Q.4 卫生更新 + **新增 §T** |
| 5 | `20_INTEGRATION/CODING_START_HANDOFF.md` | **新增**（Frozen Decisions / Frozen Contract / P0 关键路径 / 模块清单 / 开发轨 / 第一个编码任务 / 可并行任务 / owned files / 禁止跨模块编辑 / 测试命令 / Done 判据 / 延后 `PSA` / 赛期风险） |
| 6 | `docs/CHANGELOG.md` | **新增《GATE C COMPLETE｜实现基线冻结》条目** |
| 7 | `.learnbuddy/memory/` | `MEMORY.md` §5 + `DECISION_INDEX.md` §C-GATEC + 本日日志 |

🔴 **全部为"追加 / 状态推进"，未删除、未改写任何历史原文**；🔴 **零产品语义变更、零新 `Decision`、零新 `AC`、零 CCR**。

### T.3 `FINAL FREEZE SANITY CHECK`（仅 8 项）

```
Current Gate C Verdict      : ✅ READY WITH NON-BLOCKING DEFERRED ITEMS
Canonical Consistency       : ✅ PASS
Contract Consistency        : ✅ PASS
Module Dependency           : ✅ DAG
AC Coverage                 : ✅ PASS
BLOCKER                     : ✅ NO
CCR                         : ✅ NO
PRODUCT SEMANTIC CONFLICT   : ✅ NO
Unresolved Important Decisions : ✅ 0

⇒ 8 项全部成立 ⇒ ✅ GATE C = COMPLETE
```

### T.4 🔴 冻结后的不变项（必须持续同读）

```
DEPLOYMENT ACCEPTANCE                 = PENDING PRE-SUBMISSION（PSA-* 全部 PENDING；不是产品 AC）
SP-06 历史状态                         = CONDITIONAL PASS + 7 项 PENDING MANUAL OBSERVATION
SP-06 TEST SPEC GAP                   = HISTORICAL / NON-BLOCKING UNDER D-057
                                        （PROCESS DISPOSITION RESOLVED / TEST HISTORY PRESERVED；不写 RESOLVED BY TEST）
File System fallback                  = 仍不触发（NO DECISION REQUIRED；升级条件 = F1–F4）
Research Document RAG                 = 仍 OUT OF V1 / RESERVED ONLY（D-054）
Legacy Cloud Cleanup                  = DEFERRED / NOT AUTHORIZED FOR EXECUTION
🔴 禁写                                = 「Vercel 已验证 / 已部署 / HTTPS picker 已验证 / Production Ready」
                                        「Local-first 已可行 / 已完成浏览器验收」
🔴 契约变更                            = 仍须走契约 §14 CCR；§12 Worker 禁改清单继续有效
🔴 TECHNICAL DEFAULT / 实现参数         = 不得锁成不可变产品 Decision
```

### T.5 `NEXT TASK`

```
S01-01｜Project Skeleton + Shared Domain Types + Workspace Repository Minimum Vertical Slice
```

🔴 **详见 `20_INTEGRATION/CODING_START_HANDOFF.md`**；🔴 **本会话不自动开始 Coding**。

