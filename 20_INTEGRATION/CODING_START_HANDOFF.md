# CODING START HANDOFF

```
文档 ID        : CODING_START_HANDOFF
产出阶段       : S00-03｜技术架构与实现方案收敛 → Gate C Landing（2026-09-24）
当前阶段       : ✅ S01｜Implementation（正式实现阶段）
生成依据       : 项目负责人 2026-09-24「A｜确认 Gate C，冻结当前实现基线并允许正式开发」
权威序         : docs/DECISIONS.md > docs/00–09 > docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md（FROZEN）
                 > 本文件（Handoff，不是 canonical、不是契约）
🔴 边界         : 本文件**不含业务代码**；🔴 **不授权自动开始 Coding**（须项目负责人启动 S01-01）
```

> **本文件的作用**：把已冻结的实现基线转成**可直接开工的交接说明**。
> **本文件不做**：重新设计 / 重开 `TQ` / 改产品语义 / 改契约 / 新增 `AC`。

---

## 0. IMPLEMENTATION PATH CLARIFICATION（🚩 `S01-W1-PREP`，2026-09-25）

> **性质**：`IMPLEMENTATION PATH CLARIFICATION`。🔴 **不是 Decision、不是 CCR、不新增 `AC`、不改 `M1`–`M16` 产品 / 架构语义、不动 Frozen Contract。**
> **原因**：`S01-02` / `S01-04` 并行启动前，必须把 Browser / Core / Server 的**编译边界与 owned-file 路径**彻底对齐，避免 framework-neutral 的 `src/workspace/**` 被浏览器实现污染。

### 0.1 运行时边界（🔴 目录即边界）

| Scope | 路径 | 编译作用域（root config） | 允许的运行时 |
|---|---|---|---|
| Framework-neutral | `src/domain/**`、`src/workspace/**`、`src/ai/**`（**🔴 仅 `M10` contract**） | `tsconfig.core.json`（`lib = ES2022`，**NO DOM**） | 纯 TS；🔴 不得出现 `window` / `document` / `FileSystemDirectoryHandle` / `showDirectoryPicker` / `sessionStorage` / 浏览器特有 `fetch` 假设 |
| Browser-specific | `src/browser/**`（含 `src/browser/workspace/**`、`src/browser/ai/**`） | `tsconfig.browser.json`（`DOM` + `DOM.Iterable`，`types: []`） | 真实 FSA / Web Crypto / 浏览器直连 `fetch` / 会话凭据 |
| Server-specific | `api/proxy/**` | `tsconfig.server.json`（`ES2022` + Node types，**NO DOM**） | Node 运行时（`M12` Thin Proxy） |

🔴 **`src/ai/**` 只放 `M10`（interface / capability / normalized request-result contract）**：framework-neutral、NO DOM、NO Node-specific runtime API。
🔴 **`M11`（Browser Direct）+ `M13`（会话凭据）的浏览器实现只能在 `src/browser/ai/**`；`M12`（Thin Proxy / registered-provider server implementation）只能在 `api/proxy/**`** —— **Browser Direct 与 Server Proxy 不得混在同一运行时作用域**。

### 0.2 路径修订（🔴 就地补注，不改写历史）

- `S01-02`（Workspace Adapter / FSA）owned files：~~`src/workspace/adapter/**`~~ → **`src/browser/workspace/**`**
  （🔴 `S01-01A` 原定路径 **SUPERSEDED BY `S01-W1-PREP`**；理由：`src/workspace/**` 必须保持 framework-neutral / NO DOM，浏览器 API 适配器不属于它。）
- `src/workspace/**` = **已有 framework-neutral Workspace abstraction（`M2` 抽象 + `M3` repository / schema）**：`S01-02` 对它是**只读消费**，**不是主修改区**。
- `S01-04` owned files：`src/ai/**`（`M10` contract）、`src/browser/ai/**`（`M11` / `M13` 浏览器运行时）、`api/proxy/**`（`M12` 服务端运行时）。
- **root config（`package.json` / `tsconfig*.json` / `.gitignore`）= `Integrator` owned**：🔴 Worker **不得自行修改**。
- 🚩 **已知遗留（🔴 非本任务范围，未修改）**：`src/workspace/storage.ts` / `memory-storage.ts` / `index.ts` 的注释仍写 `src/workspace/adapter/**`（历史文本）；属 `src/workspace/**` 业务代码，本任务按边界**不改**，留待 `Integrator` / Track A 收敛。

### 0.3 事实登记（🔴 就地补注，不改写历史；非 Decision）

> 下图仅登记 **仓库现实**，以便 Worker 不会按已完成任务开工；🔴 **不构成新的产品 / 架构语义，也不改 `M1`–`M16`。**

```
S01-01  = DONE（骨架 + Domain 类型 + Workspace repository 最小垂直切片）
S01-01A = DONE（Foundation Hardening + root config 分层 + tsconfig-layout invariant）
Gate C  = COMPLETE｜Contract = v0.3 FROZEN / IMPLEMENTATION BASIS
tests   = 109 pass / 0 fail（S01-W1-PREP 后；原 102）
Git     = 已初始化（无 remote / 无 commit；🔴 作者身份待配置）
⇒ NEXT = SAFE WAVE-1：S01-02（Workspace Adapter / FSA）+ S01-04（Provider Foundation）
```

🔴 因此 **§6「First Coding Task ｜ `NEXT TASK` = `S01-01`」与文末 `NEXT TASK` 行属历史文本**（`S01-01` 启动时的口径），**予以保留、不删除**；当前实际下一任务以上表为准。

---

## 1. Frozen Decisions（🔴 不可由 Worker 修改）

```
D1–D10 / R1–R6            S00-01 产品与场景基线
D-001 / D-002             ——
D-011–D-048               S00-02 四批产品机制（含 Q16 不占号）
D-049                     Hypothesis 编辑边界（①②③④⑤ 只读）
D-050                     Level A `matched` = 严格语义重叠
ADJ-01                    CLOSED / DERIVED（未创建 Decision）
D-051                     生成批次（不建版本系统）
D-052                     热风 vs 送风 = compared_not_matched
D-053                     V1 主架构 = Local-first Harness-style Web App
D-054                     V1 RAG = 仅 Structured Experience RAG
D-055                     LLM 路径 = Provider-dependent Hybrid
D-056                     凭据 = Session-only Credential
D-057                     部署 / 浏览器人工验收延期至提交前
D-058 (TQ01)              Browser-heavy Local-first Web App + Optional Thin Server Layer
D-059 (TQ02)              Local Workspace Files + No required cloud database
D-060 (TQ03)              Configurable LLM + Provider Abstraction + Provider-dependent Hybrid
                          + Session-only Credential + Registered-provider Thin Proxy only
D-061 (TQ04)              R-A（Structured Field Rules + 必要时 LLM 维度级离散三态判定）
D-062 (TQ05)              Local Dev + Vercel Demo/Review Target + Local Workspace
                          + Optional Thin Provider Proxy（附 DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION）
```

🔴 **`TECHNICAL DEFAULT` / 实现参数（不是 Decision、不得锁成不可变产品 Decision）**：
`TypeScript end-to-end`｜`Markdown + JSON / sidecar metadata`｜框架 / state library / router / component library｜目录名 / 文件名 / front-matter / sidecar schema 细节 / helper / parser / retry / timeout / UI 微观实现 / 具体 Provider 清单 / allowlist 内容 / 脱敏实现 / session 抽象选型。

---

## 2. Frozen Contract（🔴 实现依据 = 唯一）

```
文件    : docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md
状态    : ✅ v0.3 FROZEN / IMPLEMENTATION BASIS（2026-09-24，GATE C FINAL FREEZE）
版本    : v0.3（🔴 不发明新版本号）
效力    : FROZEN —— IMPLEMENTATION BASIS = YES
```

**开工必读小节（按顺序）**：

| 顺序 | 小节 | 为什么 |
|---|---|---|
| 1 | §1 核心对象 / §1.1 分层 | 对象边界，不得扁平化 |
| 2 | §2 状态（§2.1 `Attempt` / §2.2 `Insight` 迁移矩阵 / §2.3 `Hypothesis` 裁决位 / §2.4 生成批次） | 状态机是硬语义 |
| 3 | §3 ID / §4 `source_type` / §5 `EvidenceRef` / §6 `N_检索`·`N_引用` / §7 Archive | 跨模块共享语义 |
| 4 | §8 `Hypothesis` / `Model Suggestion`（含 §8.6 编辑边界） | ⑨ 的实现约束 |
| 5 | §9 `D9` 十步 I/O（§9.1 触发幂等 / §9.4 `matched` 判据 / **§9.4.1 四维度→字段路径映射（`CONTRACT CLARIFICATION`）** / §9.5 三层不级联） | 主链实现依据 |
| 6 | §10 Runtime 分类 / §11 L4 隔离 | 三层语义不得合并；技术字段不得出界面 |
| 7 | §0.4 A–E（Local-first / RAG 边界 / LLM 边界 / Gate B 基线） | 架构与安全边界 |
| 8 | **§12 Worker 禁改清单（20 项）** | 🔴 越界即违规 |
| 9 | §13 待裁决登记 / §14 CCR 流程 / §14.1 | 🔴 需变更时只提 CCR |

🔴 **契约 §12 第 18 项**：**版本号与生效状态只有 Integrator 可推进**。

---

## 3. P0 Critical Path（🔴 唯一必须打通的闭环）

```
Workspace → Attempt → Parse → Confirm → Cause → Save
        → Retrieve → Compare → Insight → Hypothesis → EvidenceRef
```

**P0 分批（🔴 范围已冻结，不得扩张）**：

| 批次 | 内容 | 模块 |
|---|---|---|
| `P0-A` | Domain + Workspace | `M1`、`M2`、`M3`、**`Domain/Projection`** |
| `P0-B` | `D9` Core Services | `M4`、`M5`、`M6`、`M7`、`M8`、`M9`、`M15` |
| `P0-C` | LLM Provider | `M10`、`M11`、`M12`、`M13` |
| `P0-D` | UI 主链 | `M14` |
| `P0-E` | Demo + Acceptance | `M16` + `ITC-01`–`ITC-08` |

🔴 **非关键（禁止占用 P0 时间）**：动画 · 高级视觉 · Research RAG · 复杂设置页 · 账号系统 · 云同步 · 多人在线协作 · 权限体系 · 知识图谱 · 向量检索 · 版本系统 · 国际化 · 主题切换。

---

## 4. Module List（`M1`–`M16`｜🔴 `M17` = later，不在 P0）

| 模块 | 责任摘要 | 依赖（🔴 修正后） |
|---|---|---|
| `M1` | App Shell / Workspace Entry | `M2`（**consumer**） |
| `M2` | Local Workspace Adapter（FSA API 封装） | 无（仅浏览器 API） |
| `M3` | Domain Model / Repository（对象 + 物理 schema + stable ID） | **Domain + `M2` abstraction**（🔴 不依赖 `M1`） |
| `M4` | Attempt Capture & Structured Parse（①②③） | `M3`、`M10` |
| `M5` | Cause Analysis（④⑤，含 `E1`–`E5`） | `M3`、`M10` |
| `M6` | Experience Retriever / Comparator（⑥⑦） | `M3`、**Domain/Projection**、`M10`（interface）—— 🔴 **不依赖 `M7`** |
| `M7` | Grounding Context Builder（`EvidenceRef` / `N_引用`） | `M3`、**`M6`（单向）** —— 🔴 **不参与 projection / admission** |
| `M8` | Insight Generation（⑧） | `M7`、`M10` |
| `M9` | Hypothesis Generation（⑨⑩ + `Model Suggestion`） | `M7`、`M8`、`M10` |
| `M10` | Provider Abstraction（**interface / capability / normalized contract only**） | Domain —— 🔴 **不 import `M11`/`M12`** |
| `M11` | Browser Direct Provider Adapter | **implements `M10`**、`M13` |
| `M12` | Thin Proxy / Registered Provider Adapter | **implements `M10`**（服务端薄层） |
| `M13` | Credential Store（**会话级**） | 无（session-scoped storage 或等价抽象） |
| `M14` | UI / `D9` Workflow 呈现层 | `M15` |
| `M15` | Application Services / `D9` 编排 + **composition root（adapter registry 装配）** | `M3`–`M9`、`M10`（interface）、`M11`/`M12`（**仅装配处实例化**） |
| `M16` | Demo Workspace / Local Seed | `M3` |

**六层分层纪律（🔴 强制）**：Domain/Projection → Workspace → Retrieval/Evidence → AI Adapter → Application → UI。
🔴 **UI 组件不得直接承担**：文件 schema / retrieval logic / provider network logic / `EvidenceRef` logic。

**依赖图 = DAG（🔴 无环，`RL-02` 已校验）**：

```
Domain/Projection → M6 → M7（单向）
M11 / M12 → M10（implements）；M15 负责装配
M1 → M2（consumer）；M3 → M2（abstraction）；🔴 无 M3 → M1
```

---

## 5. Development Track

| Track | 范围 | 独占 owner 路径 |
|---|---|---|
| **Track A** | Domain（含 `projection/`）+ Workspace（framework-neutral）+ Repository + 🚩 FSA 适配器 | `src/domain/**`、`src/workspace/**`（🔴 framework-neutral abstraction）、**`src/browser/workspace/**`**（🚩 `S01-02` FSA adapter，见 §0.2） |
| **Track B** | AI Provider interface + Browser Direct + Thin Proxy + Credential | `src/ai/**`（🔴 **仅 `M10` contract**）、**`src/browser/ai/**`**（`M11` / `M13`）、`api/proxy/**`（`M12`） |
| **Track C** | Retrieval + Comparison + Grounding | `src/retrieval/**` |
| **Track D** | UI Shell + `D9` Workflow | `src/ui/**`、`app/**` |

**Integrator 串行职责（🔴 不可下放）**：冻结共享类型 → merge → **composition root 装配** → build 校验 → 回归 → canonical check → **依赖方向校验**。

**🔴 本轮建议（2 天）**：`Track A 先行` + `Track B 并行` + `Track C/D 随后`（**不必四条全开**）。

---

## 6. First Coding Task ｜ `NEXT TASK`

```
S01-01｜Project Skeleton + Shared Domain Types + Workspace Repository Minimum Vertical Slice
```

**目标**：建立可编译、可测试的最小骨架，并把**最底层的共享语义**落地为契约一致的代码 —— 使 `Track B` / `Track C` / `Track D` 能安全并行。

**必须产出（Done 时必须全部存在）**：

| # | 产出 | 说明 |
|---|---|---|
| 1 | **项目骨架** | `TypeScript end-to-end`（`TECHNICAL DEFAULT`）；`typecheck` / `build` / `test` 三条脚本可运行；**不引入云 DB、不引入 Vector DB、不引入 embedding 依赖** |
| 2 | **共享 Domain 类型** | `Attempt` / `AttemptState`（`Draft`/`Formal`）/ `ContentItem<K>` / `SourceType`（`Fact`/`Extraction`/`Inference`）/ `FieldPresenceState`（含 `unknown`）/ `Insight` / `InsightState` / `InsightStateEvent` / `Hypothesis` / `HypothesisKind` / `DecisionState` / `EvidenceRef` / `RefRole` / `DerivedComparison` / `TriState` / `NRetrievalSnapshot` / `NCitationSnapshot` / `GateCheckResult`（`E1`–`E5`） |
| 3 | **`LevelAProjection` + `ProjectionFn`** | 按契约 **§9.4.1** 映射：`goal → goal`／`approach·技术对象 → actual_attempt`／`condition → condition`／`result·现象 → actual_result`（🔴 每维度**恰 1** 主字段路径） |
| 4 | **stable ID 生成与解析** | ID **内嵌于文件内容**（不靠文件名）；🔴 **改名 / 移动后仍按 ID 解析** |
| 5 | **Workspace 物理 schema（最小）** | 按 Gate C Plan **§J.1**：`workspace.json`（含 `schema_version`）+ `projects/<id>/` + `attempts/<id>.md` + `<id>.json`；落 `archive_state` / `source_type` / `decision_state` / `generation_batch` / `source_type` |
| 6 | **Repository 最小垂直切片** | 对 `Attempt` 的 **create / read / update / list**；**改名后按 ID 解析**；**无数据库即可完成**；**授权前不得读取任何本地目录** |
| 7 | **单元测试** | 至少覆盖：ID 稳定性 / 改名后解析 / `archive_state` 派生 / `LevelAProjection` 四维度映射 / **`ITC-02`（无 DB 可用性）** |

**🔴 明确不做（本任务范围外）**：UI、网络调用、LLM 调用、检索比较、grounding context、⑧⑨⑩、Demo seed、Vercel、`PSA`。

**Owned files（本任务独占）**：

```
package.json · tsconfig*.json · 构建/测试配置（🔴 仅本任务可改；其后由 Integrator 持有）
src/domain/**
src/domain/types/**
src/domain/projection/**
src/workspace/**
src/tests/domain/** · src/tests/workspace/**
```

**🔴 禁止跨模块编辑**：`src/ai/**`、`src/retrieval/**`、`src/ui/**`、`src/application/**`、`api/**`、`docs/**`、`docs/architecture/**`、`20_INTEGRATION/**`、`.learnbuddy/**`。

**Done 判据（🔴 全部满足才算完成）**：

```
① typecheck 通过；build 通过；test 通过
② 上述 7 项产出全部存在
③ 无数据库依赖即可完成 create / read / update / list
④ 改名后仍按 ID 解析成功（有测试断言）
⑤ LevelAProjection 四维度映射与契约 §9.4.1 完全一致
⑥ 未引入云 DB / Vector DB / embedding 依赖
⑦ 未创建任何 UI / 网络 / LLM 调用
⑧ 未修改任何 `docs/**` / `20_INTEGRATION/**` / `.learnbuddy/**`
⑨ 测试文件中每条断言均显式标注其所验证的既有 canonical `AC` 编号
   （🔴 不得出现 AC-163+；🔴 不得新增 AC）
```

---

## 7. Parallelizable Tasks（`S01-01` 完成后可并行）

| 任务 | Track | 前置 | owned files | 🔴 不得触碰 |
|---|---|---|---|---|
| `S01-02`｜Workspace Adapter（FSA API：授权 / 读 / 写 / 更新 / 权限撤销与重授权 / 不崩溃错误分类） | A | `S01-01` | **`src/browser/workspace/**`**（🚩 `S01-W1-PREP` 修订：~~`src/workspace/adapter/**`~~；`src/workspace/**` = framework-neutral abstraction，**只读消费 / 非主修改区**） | `M3` repository、`docs/**`、🔴 不得把浏览器 API 放进 `src/workspace/**` |
| `S01-03`｜Retriever / Comparator（Level A 三态 + `related` + 排序唯一点 + `uncompared` 单一计算点） | C | `S01-01` | `src/retrieval/compare/**` | `M7`、`Domain/Projection`（只消费） |
| `S01-04`｜Provider Abstraction interface + Browser Direct Adapter + SSRF guard | B | `S01-01` | **`src/ai/**`（`M10` contract）**、**`src/browser/ai/**`（`M11` / `M13`）**、**`api/proxy/**`（`M12`）** | `M10` interface 签名（先冻结再实现）、🔴 不得把 Browser Direct 与 Server Proxy 混在同一运行时作用域、🔴 不得 import `M11`/`M12` 进 `M10` |
| `S01-05`｜Attempt Capture + Structured Parse + Cause Analysis（①②③④⑤，含 `E1`–`E5`） | — | `S01-01` | `src/application/capture/**` | `M6`/`M7` |
| `S01-06`｜App Shell + Workspace Entry + `D9` 骨架 | D | `S01-01` | `src/ui/**`、`app/**` | `M3` 内部结构（只用视图模型） |

🔴 **编译作用域（`S01-W1-PREP`，见 §0.1）**：`src/domain`+`src/workspace`+`src/ai`(仅 `M10`) → `tsconfig.core.json`（NO DOM）｜`src/browser/**` → `tsconfig.browser.json`（DOM）｜`api/proxy/**` → `tsconfig.server.json`（Node，NO DOM）。
🔴 **root config（`package.json` / `tsconfig*.json` / `.gitignore`）= `Integrator` owned** —— **Worker 不得自行修改**；需要新作用域 / 新脚本时**向 Integrator 提请求**。

🔴 **并行纪律**：**同一时刻一个模块只有一个 owner**；🔴 **禁止多人同时改** shared types / shared contract / canonical docs / root config。

---

## 8. Test Commands（🟡 计划，`S01-01` 后确定具体脚本名）

```
typecheck    →  类型校验（全部模块）
build        →  构建
unit         →  domain / projection / workspace 单元测试
integration  →  文件层 + 无 LLM 链路集成测试
ac-map       →  校验每个 ITC 的 AC 标注完整、无新增 AC
```

🔴 **本机无任何模型 API 凭据** ⇒ ②④⑧⑨ 的端到端只能用 **deterministic stand-in**，且**必须显式标 `NOT_A_REAL_LLM_OUTPUT`**；🔴 **不得把 stand-in 通过写成"AI 能力已验证"**；🔴 **不得伪造任何实测结果**。

---

## 9. Deferred PSA（🔴 提交前必做，不是"可不做"）

```
PSA-01 – PSA-13 + PSA-X1 – PSA-X11     全部 PENDING
清单 = 20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md
🔴 不是产品 AC；不得写入 AC 序列；不得以其结果宣称任何 AC 通过
🔴 触发付费 ⇒ 立即停止 + 报 BILLING AUTH REQUIRED
🔴 F1–F4 任一出现 ⇒ 升级 DECISION REQUIRED｜File System Fallback（🔴 不得预防性实现 fallback）
```

---

## 10. Competition Deadline Risk

```
初赛 V1 截止：2026-09-26 23:59（当前 2026-09-24 ⇒ 剩约 2 天）
```

| 风险 | 缓解 |
|---|---|
| 时间不足 | 🔴 **优先保住 `P0-A`/`P0-B`/`P0-D` 的"可演示闭环"**；可缩减 `P0-C` 的 Provider 数量（🔴 **不得伪造能力**，须显式说明"未配置 Provider 时"的状态） |
| 真实浏览器 Workspace 未验证（`R-02`） | 后置 `PSA-03`–`PSA-06`；`F1`–`F4` 触发即升级 |
| Vercel 未验证（`R-03`） | 后置 `PSA-01`–`PSA-02` / `PSA-13` |
| 现场网络（`R-08`） | 备用网络 + 现场脚本；不可达时按既有口径换平台，🔴 **不得退回本机服务** |
| LLM 判定可复现性（`R-07`） | 保持 `DEFERRED UNTIL IMPLEMENTATION`；本机 `temperature`/`seed` 不可配置 ⇒ **不得据此做结论性断言** |
| 成本（`R-09`） | Vercel 必须走**免费**路径；任何付费须先报「资源 + 规格 + 预计费用」并等【再次确认】 |

---

## 11. 🔴 交接边界（逐项）

- 本文件**不含业务代码**；**未创建 `src/`**；**未安装任何依赖**；**未部署**；**未创建或删除任何资源**；**未执行 `PSA`**；**未重跑 `SP-06`**。
- 🔴 **本文件不授权自动开始 Coding** —— **须由项目负责人明确启动 `S01-01`**。
- 🔴 **持续禁写**：「Vercel 已验证 / 已部署 / HTTPS picker 已验证 / Production Ready」「Local-first 已可行 / 已完成浏览器验收」。
- 🔴 **契约变更**：仍须走契约 §14 CCR；**§12 Worker 禁改 20 项生效中**。
- 🔴 **`TECHNICAL DEFAULT` / 实现参数**（框架 / schema 细节 / helper / retry / timeout / 具体 Provider 清单 …）**不得锁成不可变产品 Decision**。

---

> **`NEXT TASK` = `S01-01`｜Project Skeleton + Shared Domain Types + Workspace Repository Minimum Vertical Slice**
> 🔴 **等待项目负责人启动。**

---

## 12. S01-W1-INTEGRATION STATUS（🚩 `S01-W1-INTEGRATE`，2026-09-25｜🔴 追加，不改写历史）

> **性质**：`INTEGRATION RECORD` + `IMPLEMENTATION PATH CLARIFICATION`（承接 §0）。
> 🔴 **不是 Decision、不是 CCR、不新增 `AC`、不改 `M1`–`M16` 产品 / 架构语义、不动 Frozen Contract。**
> 🔴 本节**只登记实现口径与路径归属**；不改 `docs/**` 的 `CONFIRMED` 结论，不改 §1 Frozen Decisions，不改 §3 P0 范围。

### 12.1 任务状态登记

```
S01-02  = DONE（Workspace Adapter / FSA；真实浏览器验收 = PENDING PSA）
S01-04  = DONE（Provider Abstraction + Browser Direct + Thin Proxy + Session Credential）
M10     = READY FOR CONSUMERS（framework-neutral provider contract；见 §12.3）
S01-03  = 未开始｜S01-05 = 未开始｜S01-06 = HOLD
```

### 12.2 `S01-02`｜`Move` / `Rename` = TECHNICAL LIMITATION（🔴 不是新 Product Decision）

- 在浏览器无 native move 的原语时，适配器保留 `MOVE_UNSUPPORTED_BY_BROWSER` 作为**稳定 API 的技术限制口径**。
- 🔴 **不得**为了「补齐 move」而实现 `copy old → write new`：会产生重复的内部对象 ID（ID 内嵌于文件内容，不靠文件名）。
- 🔴 **不得**为了「补齐 move」而实现 physical delete：与 `§7`「V1 无物理删除」的冻结约束直接冲突。
- ⇒ **V1 的 browser P0 critical path 不得依赖 `move()` 必然成功**（调用方必须能接受 `MOVE_UNSUPPORTED_BY_BROWSER` 并给出可恢复路径）。

### 12.3 `M10` / `M12` 路径归属（IMPLEMENTATION PATH CLARIFICATION）

```
src/ai/**              M10 framework-neutral provider contract（仅 provider interface / capability /
                       normalized request-result / registry CONTRACT / structured output /
                       normalized provider-response classification）
                       🔴 不 export：M12 target policy / proxy authorization / SSRF predicate /
                       ProxyRequest parser；🔴 不 export registry FACTORY
src/server/proxy/**    M12 pure server policy / security（target-policy / proxy-request / authorize /
                       registry factory）；framework-neutral 纯 TS，无 Node 运行时
api/proxy/**           M12 Node runtime transport shell（唯一允许使用 Node 运行时）
src/browser/ai/**      M11 / M13 browser runtime
src/browser/workspace/**  M2（S01-02 FSA 适配器；见 §0.2）
```

依赖方向（🔴 DAG，由 `src/tests/proxy/dependency-direction.test.ts` 断言）：

```
api/proxy/**  →  src/server/proxy/**  →  src/ai/**
src/browser/**  →  src/ai/**（+ framework-neutral `src/workspace` 抽象）
🔴 无反向边：src/ai 不 import src/server；src/browser 不 import src/server/proxy / api/proxy
```

🚩 **历史文本保留**：`src/ai/boundary/**` 为 `S01-04` 时期路径，**SUPERSEDED BY `S01-W1-INTEGRATE`**（当时把 M12 policy 放在 `src/ai/**` 纯属 `tsconfig.test.json` `rootDir` 限制的机械原因；该限制已由 `tsconfig.proxy-test.json` + `dist-proxy-test/` + `npm run test:proxy` 解除）。

### 12.4 🔴 `M1` / `M15` 未来实现约束（Error Boundary，本任务不实现）

- `M2`（`src/browser/workspace/**`）会抛出 **`BrowserWorkspaceAccessError`**（browser runtime technical error），它**不替换** framework-neutral 的 `WorkspaceStorageError`（后者的冻结词汇表不得修改）。
- ⇒ 未来 **`M1` / `M15` 必须同时处理** `WorkspaceStorageError` **+** `BrowserWorkspaceAccessError`，并保证：**`original_error` 仅作为内部诊断数据**。
- 🔴 **不得**把 `original_error` / `stack` / browser internal error **直接渲染给最终用户**（技术字段不出界面，见契约 §10 / §11）。
- 🔴 本任务**不实现** `M1` / `M15`，仅登记该约束。

### 12.5 测试口径（🔴 补充证据，不改 AC）

```
npm test        → dist-test/（233 pass / 0 fail；原 224 个用例全部保留）
npm run test:proxy → dist-proxy-test/（15 pass / 0 fail；直接 import api/proxy/** 的行为测试）
```

- `S01-04` 时期的 thin-proxy **结构扫描**保留，但降级为**补充证据**（`src/tests/proxy/thin-proxy-boundary.test.ts`）。
- 🔴 **不得再用「`rootDir` 限制」作为「Thin Proxy Handler 无行为测试」的理由** —— 该缺口已由独立 proxy test scope 关闭。

### 12.6 下一波

```
SAFE WAVE-2：S01-03（Retriever / Comparator）+ S01-05（Attempt Capture + Structured Parse + Cause Analysis）
S01-06      = HOLD（等待 S01-03 / S01-05 的 application-facing interfaces 明确）
```

🔴 **持续禁写**（不变）：「Vercel 已验证 / 已部署 / Production Ready」「Local-first 已可行 / 已完成浏览器验收」「Chrome / Edge / FSA verified」「real provider verified」。
🔴 **`PSA-01`–`PSA-13` / `PSA-X1`–`X11` 仍全部 `PENDING`**；真实浏览器验收 = `PENDING PSA`。

---

## 13. S01-05 INTEGRATION STATUS（🚩 `S01-05-INTEGRATE`，2026-09-25｜🔴 追加，不改写历史）

> **性质**：`INTEGRATION RECORD` + `IMPLEMENTATION PARAMETER` 收敛（承接 §8 / §12.6）。
> 🔴 **不是 `Decision`、不是 `CCR`、不新增 `AC`、不改 Frozen Contract 语义、不改 `DECISIONS`、不改任何产品 `AC`。**
> 🔴 本节**只登记实现口径与物理落点**；`docs/**` 的 `CONFIRMED` 结论一字未改。

### 13.1 任务状态登记（🚩 就地取代 §12.1 中 `S01-05 = 未开始` 的表述）

```
S01-05  = DONE → ACCEPTED FOR INTEGRATION → INTEGRATED
S01-05-INTEGRATE = DONE
S01-03  = 未开始（SAFE NEXT，🔴 未授权自动启动）
S01-06  = HOLD
```

### 13.2 编译 / 构建作用域（task §3｜🔴 修正既有缺口，不是新作用域）

- `tsconfig.core.json` 新增 `src/application/**/*.ts` —— application 层本即 **framework-neutral**
  （无 DOM 类型、无 Node 运行时 API、无网络客户端、无 ambient storage），因此与它所编排的 domain
  共用**同一个 NO-DOM** 配置；🔴 **未给 core 增加 DOM**。
- `tsconfig.build.json` 经 `extends` 继承该 include ⇒ **生产构建真实包含 `src/application/**`**。
  修正前该层**仅经 test import graph** 被编译，`dist/` 里**不存在任何 application 模块**。
- `tsconfig.json`（默认 typecheck）同步纳入；`tsconfig.test.json` 经继承自动覆盖。
- `tsconfig.browser.json` / `tsconfig.server.json` / `tsconfig.proxy-test.json` **未改**。
- 🔴 未新增 React / Next.js / 任何运行期依赖（`package.json` 脚本未改）。

### 13.3 追问答案双层落库（task §4 / §5｜🔴 落地既有 Frozen 语义）

- 依据：contract **§4.2 rule 3**（`D-024` / `AC-30`）、§9 ③、docs/02 **§C.4.2 C-5**。
- 物理落点 = `Attempt` sidecar 内新增 **`content_items`** 集合（docs/02 §C.4 的 `Content Item`），
  条目 = **既有 `ContentItem` 联合类型** + docs/02 §C.4.1 已列出的两个逻辑字段 `field_key` / `origin_hint`。
  🔴 **未新建第二套 provenance system / 第二套 reference system / 新 Product object type。**
- 双层条目：

```
field_key = followup_user_answer    source_type = Fact        用户原话（禁止标为 Inference）
field_key = followup_ai_extraction  source_type = Extraction  AI 归纳（禁止标为 Fact / 禁止升级为 Fact）
```

- 🔴 **两条条目永不合并**，条目 id 由 (`attempt_id`, 主字段) 决定，可追溯且非位置性。
- 🔴 **不伪造第二层**：若该主字段本就没有 AI 归纳（正是追问针对的缺口场景），只落用户原话那一层 ——
  不允许为了「凑成一对」而生成 `Extraction`。
- 🔴 **主字段槽位同时更新**：追问答案按**既有确认规则**落为「用户提供的取值 = 用户 `Fact`」，
  因此 `level_a.condition` 等可直接读出补齐后的条件，**追问答案不会成为孤岛内容条目**（§9 ③ / task §6）。
- 请求侧新增**可选**参数 `CaptureFieldCorrection.answer_to_gap`（application 入参，**不是**产品字段）。

### 13.4 `Attempt Draft State` 持久化（task §7 / §8 / §9｜docs/02 §C.5）

- 物理落点 = **同一 sidecar 内的 1:1 附属记录 `draft_state`**（task §8 推荐的最小实现）。
- 字段：`attempt_id` / `parse_state` / `asked_key_question_count` / `abandoned_gap_set` /
  `gap_priority_hint` + 🚩 `asked_gap_set`（**IMPLEMENTATION PARAMETER**，见下）。
- 🔴 **`asked_key_question_count` 恒由 `asked_gap_set.length` 派生后落盘**：计数器与已问集合
  **永不漂移**；且 `asked_gap_set` **不在** `AttemptDraftStatePatch` 内 ⇒ 追加已问缺口**只有一条合法路径**
  （`askFollowUpQuestion`，它把「问题内容条目 + 计数」写进**同一次** patch）。
- 🚩 `asked_gap_set` 说明：它**不新增任何产品机制**，就是既有
  `FollowUpQuestionBudget.asked`（`D-017`「同一缺口只问一次」）的持久化形式；docs/02 §C.5 的
  `asked_key_question_count` 仍是**唯一权威计数**，未被替代。
- `parse_state` 取值 = canonical 五值（`not_parsed` / `extracted` / `not_extracted` /
  `extract_failed` / `pending_user_confirm`）；🔴 **无任何分级 / 完成度表达**（AC-88 / AC-93）。
  实现口径（落在五值之内，IMPLEMENTATION PARAMETER）：`not_parsed` = 初建未解析；
  `extract_failed` = ② 运行时失败且 Draft 保留；`not_extracted` = ② 成功但无可抽取内容；
  `pending_user_confirm` = ② 产出了内容 / 已登记追问回答，等待 ③ 整体确认；
  `extracted` = 用户已完成显式整体确认，本条解析子流程定稿。
- 🔴 **`Formal` 后该记录保留不删除（只读留档）**，且**不再承载任何门槛作用**（docs/02 §C.5 硬规则 2）；
  对 `Formal` 记录写入附属状态一律拒绝（技术错误码 `FORMAL_DRAFT_STATE_READONLY`）。
- 🔴 **附属状态记录不进入** Level A / `EvidenceRef` / `N_检索` / `N_引用` / Experience Asset ——
  它**不是** `Attempt` 的成员（结构上不可能泄漏），只经 `readAttemptDraftState` / `updateAttemptDraftState` 存取。

### 13.5 `pending_proposals` 不再是唯一 Source of Truth（task §10 / §11 / §12）

- 第 ② 步的 AI 抽取结果**同时落为 `Extraction` 内容条目**（`field_key` = canonical 字段键，
  条目 id 由 (`attempt_id`, 字段) 决定 ⇒ 「重新解析」覆写同一条，**无需任何「提案版本」概念**）。
- ⇒ 浏览器刷新 / service 重建后，③ 可从**已持久化条目 + `parse_state`** 重建「当前待确认的解析结果」；
  内存 `Map` 降级为纯 cache。
- 追问问题本身落为 canonical `followup_question` 条目（docs/02 §C.4.3：`Inference｜display`）。
- 🔴 **未新增** `confirmed: boolean` / AI confidence / parse version / proposal version 等产品字段。
- 🔴 第 ② 步 provider 自报的 `parse_status` **不落库**：它是单次调用的报告，不是产品字段。

### 13.6 Repository 能力增补（task §9｜🔴 技术能力，非产品语义）

```
readAttemptDraftState(attempt_id)              → AttemptDraftState | null
updateAttemptDraftState(attempt_id, patch)     → AttemptDraftState
readAttemptContentItems(attempt_id)            → readonly PersistedContentItem[]
AttemptPatch 新增 content_items / draft_state  → 使「条目 + 计数」可原子写入
```

- 🔴 **无数据库**：全部落在既有 local workspace 文件（`<attempt_id>.json` + `.md`）。
- 🔴 附属记录**随内容补丁一起写回且永不被内容补丁删除**。
- 附带一致性守卫：sidecar 解析器拒绝
  「`asked_key_question_count` ≠ `asked_gap_set.length`」或
  「`followup_question` 条目数 ≠ `asked_gap_set.length`」的文档 —— **不修不猜，显式失败**。
- 🔴 **无物理删除**：`WorkspaceStorage` / repository 仍未新增任何 delete 成员（AC-76）。

### 13.7 Candidate Cause 裁定（task §14 / §15）

- `INTEGRATION REQUEST #3` = **CLOSED / NO SHARED-SCHEMA CHANGE REQUIRED**。
- `supporting_source_paths` **不**扩 Domain、**不**落库、**不**成为 `EvidenceRef` / `N_引用` 来源；
  仅作为 application-local proposal / diagnostic helper 暂时存在。
- 候选原因继续持久化为 `Inference｜decision`，`decision_state` 三态；**0 条合法**；
  🔴 **未新增** `score` / `confidence` / `support strength` / `probability`。

### 13.8 测试口径（🔴 补充证据 + IMPLEMENTATION INVARIANT，不改 AC）

```
npm run typecheck / typecheck:core / typecheck:browser / typecheck:server → 全部 PASS
npm run build                                                            → PASS（dist/application/capture/** 已产出）
npm test                                          → dist-test/（284 pass / 0 fail；原 271 个用例全部保留，+13）
npm run test:proxy                                → dist-proxy-test/（15 pass / 0 fail）
```

- 新增 `src/tests/application/capture/persistence-integration.test.ts`（I3–I15：双层落库 /
  Level A 集成 / draft state round-trip / 计数跨重建 / abandoned gap / `extract_failed` /
  `Formal` 只读留档 / 附属记录不外泄 / pending 重建 / candidate cause 语义）。
- 🔴 **每条断言均标注既有 Frozen 章节或 `AC` 编号；未新增任何 `AC`。**

### 13.9 下一波

```
SAFE WAVE-2 / SAFE NEXT TASK：S01-03（Retriever / Comparator）
🔴 未授权自动启动 —— 须由项目负责人明确启动
S01-06 = HOLD
```

🔴 **持续禁写**（不变）：「Vercel 已验证 / 已部署 / Production Ready」「Local-first 已可行 / 已完成浏览器验收」「Chrome / Edge / FSA verified」「real provider verified」。
🔴 **`PSA-01`–`PSA-13` / `PSA-X1`–`X11` 仍全部 `PENDING`**。

---

## 14. S01-03 INTEGRATION STATUS（🚩 `S01-03`，2026-09-25｜🔴 追加，不改写历史）

> **性质**：`INTEGRATION RECORD` + `IMPLEMENTATION PARAMETER` 收敛（承接 §5 Track C / §12.6 / §13.9）。
> 🔴 **不是 `Decision`、不是 `CCR`、不新增 `AC`、不改 Frozen Contract 语义、不改 `DECISIONS`、不改任何产品 `AC`。**
> 🔴 本节**只登记实现口径、物理落点与测试证据**；`docs/**` 的 `CONFIRMED` 结论一字未改。

### 14.1 任务状态登记（🚩 就地取代 §13.9 中 `S01-03` 待启动的表述）

```
S01-03  = DONE
S01-06  = HOLD（不变）
SAFE NEXT = M7｜Grounding Context Builder（🔴 未授权自动启动）
```

### 14.2 编译 / 构建作用域（task §2 ｜ 🔴 最小新增，不是新作用域）

- `tsconfig.core.json` 新增 `src/retrieval/**/*.ts` —— 第 3 层（Retrieval / Comparison）本即
  **framework-neutral**（无 DOM 类型、无 Node 运行时 API、无网络客户端、无 ambient storage），
  只消费 domain projection + `M2` storage 抽象 + `M10` provider **接口**，因此与它所依赖的层
  共用**同一个 NO-DOM** 配置；🔴 **未给 core 增加 DOM**。
- `tsconfig.json`（默认 typecheck，含 `src/tests/**`）同步纳入；`tsconfig.build.json` /
  `tsconfig.test.json` 经 `extends` 继承 ⇒ **生产构建真实包含 `src/retrieval/**`**
  （已验证 `dist/retrieval/compare/retrieval-service.js` 存在；`dist/retrieval` 共 60 个产物文件）。
- `tsconfig.browser.json` / `tsconfig.server.json` / `tsconfig.proxy-test.json` **未改**；
  `src/tests/config/tsconfig-layout.test.ts` 新增 4 条 `IMPLEMENTATION INVARIANT` 断言
  （core / 默认 typecheck / build 均含 retrieval 且 NO DOM；browser / server / proxy-test 均不含）。
- 🔴 **未新增任何运行期依赖**（`package.json` 未改；`dependencies` 仍为空）。

### 14.3 实现产物与唯一计算点（🔴 全部落在 `src/retrieval/compare/**`）

```
types.ts                          M6 公共词汇（三态 basis / ⑦ 材料 / 三种 0-like 状态 / fold hint）
normalization.ts                  安全确定性归一化（NFKC + 最小单位等价表）；只统一写法，不统一含义
field-rules.ts                    R-A stage 1–2：notation 等值 / 同单位不同值 / 相反极性同陈述
corpus.ts                         🚩 候选 corpus **唯一单点过滤**（Formal ∩ active ∩ 非源自身）
ordering.ts                       🚩 排序**唯一定义点**（comparisonOrderOf / displayOrderOf）
derivation-id.ts                  🚩 非位置型 derivation_id（复用 newIdBody()）
dimension-judge.ts                R-A stage 3：M10 注入式离散维度判定 + 白名单式答案读取
comparator.ts                     🚩 unknown 结构拦截 → 规则 → 判定；`related` 唯一定义
derivation.ts                     🚩 全局 hit / uncompared 单点；Level B 仅 explanation
persistence.ts                    Retrieval Derivation 物理 schema（序列化 + 严格解析）
retrieval-derivation-repository.ts readCurrent / replaceCurrent（无 DB、无版本历史、无物理删除）
retrieval-service.ts              runRetrievalForFormalAttempt + ⑦ 视图（首屏 / 展开同一 Derivation）
```

**🔴 关键口径（IMPLEMENTATION PARAMETER，非 Decision / 非 CCR）**

| 事项 | 口径 |
|---|---|
| 持久化物理落点 | 工作区独立文件 `retrievals/<source_attempt_id>.json`（每源记录**至多 1 条当前有效**；rerun 覆写同一路径 ⇒ 无需删除原语，也不可能残留旧版本） |
| 归属层级 | 该持久化模块**留在 `src/retrieval/compare/**`**（未改 `src/workspace/**`）：它只是 `M6` 自己的文档 schema，这样依赖方向恒为 `M6 → WorkspaceStorage`，结构上不可能出现 `workspace → retrieval` 反向边 |
| 排序固定方向 | 组 A（有「发生时间」）优先；组内 **降序**（较晚发生在前）；`occurred_at` 缺失组仅按 `attempt_id` 升序；🔴 `created_at` **永不**冒充 `occurred_at` |
| 首屏 | `first_screen_size = min(3, N_检索)`；**全量候选集合始终落库**；展开只是同一 Derivation 显示更多条目，不重跑检索 |
| 判定输出 | 结构化 schema **只允许** `verdict`（`matched` / `compared_not_matched`）+ `reason`；读取器用**白名单**拒绝任何额外字段（数值 / 等级 / 概率类一律拒绝）；`uncompared` **不可由判定返回** |
| 三种 0-like 状态 | `HISTORY_EMPTY`（排除源自身后无可用历史）/ `NO_RELATED_HISTORY`（有历史但 `N_检索 = 0`）/ `RETRIEVAL_RUNTIME_INCOMPLETE`（判定链路失败；**既不落库也不覆盖旧 Derivation**）——语义严格分离 |

### 14.4 测试口径（🔴 补充证据 + `IMPLEMENTATION INVARIANT`，不改 AC）

```
npm run typecheck / typecheck:core / typecheck:browser / typecheck:server → 全部 PASS
npm run build                                                            → PASS（dist/retrieval/** 已产出）
npm test                                          → dist-test/（400 pass / 0 fail；原 306 个用例全部保留，+94）
npm run test:proxy                                → dist-proxy-test/（15 pass / 0 fail）
```

- 新增 `src/tests/retrieval/compare/**`（10 个文件：harness + D-050/D-052 冻结用例 / 三态 /
  corpus-admission / 排序 / 持久化 / ⑦ 输出 / 运行时与判定契约 / SP-03R 回归 / 静态审计）。
- 🔴 **每条断言均标注既有 Frozen 章节或 `AC` 编号（含 `AC-109`–`AC-115` / `AC-124`–`AC-126`）；未新增任何 `AC`。**
- 🔴 **全部判定调用均为 `NOT_A_REAL_LLM_OUTPUT` 假适配器**；**Real Provider Calls = NOT EXECUTED**；费用 0 元。

### 14.5 边界登记（🔴 未做）

```
❌ EvidenceRef / N_引用 / grounding context（M7）        ❌ Insight（M8）      ❌ Hypothesis（M9）
❌ D9 orchestration / composition root（M15）           ❌ UI（S01-06）       ❌ Vercel / PSA
❌ 后台 / 异步 / 批量 / 定时检索；❌ 「已检索过」「检索新鲜度」等产品字段
❌ 向量 / embedding / 数值相似度 / 加权 / 等级 / 阈值
```

---

## 15. M15 LANDING + M9-HYGIENE-01（🚩 `M15-LAND`，2026-09-25｜🔴 追加，不改写历史）

> **性质**：`INTEGRATION RECORD` + `IMPLEMENTATION PARAMETER` 收敛（承接 §13.9 / §14.1 / §14.5）。
> 🔴 **不是 `Decision`、不是 `CCR`、不新增 `AC`、不改 Frozen Contract 语义、不改 `DECISIONS`、不改任何产品 `AC`。**
> 🔴 本节**只登记实现状态、测试证据与跨层命名映射**；`docs/**` 的 `CONFIRMED` 结论一字未改。
> 🔴 本任务**不得启动 UI / 不得启动 M16 / 不得部署 / 不得执行 `PSA`** —— 本节只做 Landing。

### 15.1 任务状态登记（🚩 就地取代 §13.9 / §14.1 / §14.5 中「`M15` 未开始」的表述）

```
M15                       = DONE / ACCEPTED
Git baseline              = 3696d7d1966edf1f2b5b1ca12b59abd4ba609c5a
D9 ①→⑩ E2E               = PASS（deterministic fake provider）
Real Provider Calls       = 0
M8-HARDENING-01           = CLOSED
Thin Proxy Client Adapter = ADDED
S01-06                    = NEXT AFTER THIS LANDING
M16                       = READY AFTER M15（🔴 排序仍排在 S01-06 之后，除之后被明确改变）
```

### 15.2 `M15` 实现产物与路径归属（🔴 承接 §4 Module List / §12.3）

```
src/application/workflow/**          M15 `D9` 编排（workflow-service / read-model / operation-ids /
                                     outcomes / acceptance / errors / types）；framework-neutral
src/browser/application/**           M15 composition root（workflow-composition / provider-composition）
src/browser/ai/thin-proxy-adapter.ts M12 **client** Thin Proxy Provider Adapter（见 §15.4）
src/tests/application/workflow/**    E2E ①→⑩ / `M8-HARDENING-01` recovery / read-model / static audit
src/tests/browser/application/**     composition
```

**🔴 `M15` 是 COMPOSER，不是新语义**：每一步都委派给拥有它的模块；`M15` **不新增**第二个检索 / 第二个
`EvidenceRef` 构造点 / 第二个状态机。**唯一的自动副作用** = ⑤ `Formal` 保存成功 ⇒ 立即执行一次 ⑥
（`D-045` / AC-79），且**同一次保存重放不会执行第二次**；**无级联**（显式 rerun ⑥ 不重跑 ⑧⑨；归档不重跑
任何步骤；`Formal` 编辑只产出 stale 警告）；**无后台工作**（无 timer / watcher / queue）。

### 15.3 `M8-HARDENING-01` = CLOSED（🔴 依据 = 已实现协议 + 通过用例，不是任务描述）

- **实现**：`M8` 的 ⑧ 生成以 **durable plan** 落盘 —— `anchor → records → batch → 标 complete`，
  由 `src/application/insight/insight-service.ts` + `insight-repository.ts` 的
  `createIfAbsent` / `recordBatchIfAbsent` 承载。
- **用例**：`src/tests/application/workflow/m8-recovery.test.ts`（MH1–MH12）—— partial-write 窗口 /
  replay recovery / blocked recovery 永不当作成功 / zero-output 亦可重放 / regeneration 与 runtime failure。
- ⇒ 该项随 M15 landing **关闭**；🔴 其**语义未变**：这是 **REPLAY RECOVERY，不是原子事务**
  （`WorkspaceStorage` 无事务原语，`M8` 不声称原子性）。

### 15.4 `M9-HYGIENE-01`｜operation id codec 修复（🔴 实测复现，不是推断）

**缺陷（实测）**：`decodeOperationIdToken` 原实现以**贪婪**方式把每一段连续 `~HH` 组先合并成一个字节串、
再要求该字节串长度与首字节的续字节数吻合 ⇒ **两个及以上「相邻」多字节字符被并成一个不可能的字节串**，
一个完全合法的 token 被拒。复现证据（修复前，单测实跑）：

```
not ok - C2: decode(encode('操作'))   →  null !== '操作'
not ok - C3: decode(encode('操作一'))  →  null !== '操作一'
not ok - C4: decode(encode('操作一#a')) →  null !== '操作一#a'
not ok - C8: decode(encode('操作一#a~b/c')) → null !== '操作一#a~b/c'
（C1 ASCII / C5 `~` / C6 `/` / C7 空格 同时 PASS ⇒ 缺陷精确落在「相邻多字节字符」上）
```

**修复口径**：`decode` 改为**一次只读一个 code point** —— 组首 `~HH` 决定后续续字节数，且**每个**续字节
必须是 `10xxxxxx`，否则 fail-closed 返回 `null`；语义与 `M8` **已通过 M8 回归**的解码器一致。

**🔴 未改动的部分（逐项）**：

| 项 | 状态 | 证据 |
|---|---|---|
| `encodeOperationIdToken` | 🔴 **逐字节相同**（942 bytes） | HEAD 与工作区同函数文本比对 = identical |
| `hypothesis_id` 生成 | 未改 | `newHypothesisId` 文本 identical |
| batch id 生成 | 未改 | `newHypothesisBatchId` 文本 identical |
| operation anchor path schema | 未改 | `hypothesisOperationKey` 文本 identical |
| 已有 encode token 格式 | 未改（golden 断言钉死） | C1–C8 golden token 用例 |

**🔴 无 `M9 → M8` 依赖**：本模块的 static audit 断言 `M9` 内**唯一的 `M8` 引用**是
`types.ts` 的 **type-only** `InsightView`⇒ 因此**不复用 `M8` 的模块**，而是**本地实现同一技术协议**
（纯 codec，无产品规则、无业务耦合）。

**覆盖**：`src/tests/application/hypothesis/identity-codec.test.ts`（12 例）—— C1–C8 roundtrip / encode
golden 格式 / collision guard / malformed 拒绝 / anchor key 绑定。🔴 全部标题为 `IMPLEMENTATION INVARIANT`；
**未引用也未新增任何产品 `AC`**。

**Dead-code 状态（全仓搜索）**：

```
M9 decodeOperationIdToken   生产调用点 = 0   测试调用点 = 1 文件（本次新增）
                          ⇒ DEAD / UTILITY-ONLY TODAY
```

🔴 处置 = **FIX, DO NOT DELETE**：函数已修复，避免将来启用时携带已知 defect；本任务不删除它。

### 15.5 Hypothesis 8-item Logical → Physical Mapping（🔴 命名映射，**不是**第二套产品语义）

| # | 文档逻辑 `field_key`（docs/03 §H.1｜docs/02 §…） | frozen TS 物理属性（`src/domain/types/hypothesis.ts`） | 语义 |
|---|---|---|---|
| ① | `hypothesis_statement` | `hypothesis_statement` | 待验证假设 |
| ② | `hypothesis_basis` | `rationale` | 假设依据 |
| ③ | `hypothesis_history_refs` | `referenced_attempt_ids` | 引用的历史 `Attempt` |
| ④ | `hypothesis_change` | `next_change` | 下一轮改变什么 |
| ⑤ | `hypothesis_keep` | `kept_conditions` | 哪些条件保持不变 |
| ⑥ | `hypothesis_metric` | `observation_metric` | 观察什么指标 |
| ⑦ | `hypothesis_support_criterion` | `support_criterion` | 什么结果支持 |
| ⑧ | `hypothesis_contradict_criterion` | `refutation_criterion` | 什么结果反驳 |

- 结论：**8 项顺序与语义 1:1 一致** ⇒ **不存在 `PRODUCT SEMANTIC CONFLICT`**。
- 🔴 这是**跨层命名映射**：**不是** alias schema、**不是** compatibility DTO、**不是**第二套字段词汇。
- 🔴 **代码以 frozen TS type 为物理真源**；文档 `field_key` **保留其逻辑标识用途**（不把逻辑名整体改成物理名）。
- 🚩 参照：`M9` 的 canonical key 集合见 `src/application/hypothesis/structure.ts` 的 `HYPOTHESIS_FIELD_KEYS`
  （③ 在该集合中作 `referenced_attempts`，与 `HypothesisCoreContent.referenced_attempt_ids` 同指 ③，非第二个语义）。
- 命名状态：原 **`DOCUMENTATION NAMING DEBT / NON-BLOCKING`**（登记于 `.learnbuddy/memory/2026-09-25.md` 的 `M15` 节 §6）
  ⇒ 本次**收窄为 `CROSS-LAYER NAMING MAPPING` / `NON-BLOCKING`**。
- 🔴 **收窄的含义**：把「文档与代码的字段名不一致」这一**债务式表述**，改为「两层各自按自己的真源命名、二者之间存在显式映射」的**映射式口径** —— 不新增规则、不改代码、不改冻结类型、不建 alias schema、不新增 `AC`。

### 15.6 测试口径（🔴 补充证据 + `IMPLEMENTATION INVARIANT`，不改 AC）

```
npm run typecheck / typecheck:core / typecheck:browser / typecheck:server → 全部 PASS
npm run build                                                             → PASS
npm test        → 795 pass / 0 fail（783 基线用例全部保留；+12 = M9 codec 用例）
npm run test:proxy → 15 pass / 0 fail
```

- 🔴 **全部模型应答均为手写 `NOT_A_REAL_LLM_OUTPUT` fixture**；**Real Provider Calls = 0**；费用 0 元。

### 15.7 边界登记（🔴 本节未做、本任务未做）

```
❌ UI / App Shell / Demo Seed（S01-06 / M16）   ❌ Vercel 部署   ❌ `PSA-*`
❌ Real Provider 调用（0）                     ❌ 真实浏览器人工验收
```

### 15.8 `PSA`（🔴 仍全部 `PENDING`）

```
PSA-01 – PSA-13 + PSA-X1 – X11         全部 PENDING
Browser real acceptance                = PENDING PSA
Real Provider compatibility            = PENDING PSA
Vercel deployment                      = NOT EXECUTED / PENDING PRE-SUBMISSION
```

### 15.9 下一波

```
SAFE NEXT = S01-06｜App Shell + D9 UI Integration
🔴 未授权自动启动 —— 须由项目负责人明确启动
M16 = READY AFTER M15，但排序仍排在 S01-06 之后（除之后被明确改变）
```

🔴 **持续禁写**（不变）：「Vercel 已验证 / 已部署 / Production Ready」「Local-first 已可行 / 已完成浏览器验收」「Chrome / Edge / FSA verified」「real provider verified」。

---

## 16. S01-06 ｜ APP SHELL + D9 UI INTEGRATION（🚩 `S01-06`，2026-09-25｜🔴 追加，不改写历史）

### 16.0 🔴 人工 UI 裁决记录（= S01-06 `UI IMPLEMENTATION BASIS`）

- 项目负责人已**人工裁决**：
  - **A 主体** = 单页三栏任务工作台（Top Bar + 左 Attempt Rail + 中 Main Workbench + 右 Evidence Rail）；
  - **C 交互语言** = 中央区域使用 **①→⑩ 纵向 AI 引导式流程语言**。
- 定性：这是 **S01-06 UI IMPLEMENTATION BASIS**，**不是新的产品机制**，**不新增 Product Decision ID**（本轮 `Decision Added = 0`）。
- 🔴 裁决已由人工做出，**不得重新询问 A / B / C**，**不得擅自改成**：多页面 SaaS 模块导航 / ChatGPT 式纯聊天界面 / 看板 / Dashboard 指标大屏。
- 三栏各自回答的问题（固定口径）：左 = 「过去有什么？」；中 = 「这次失败正在怎么被处理？」；右 = 「AI 为什么这么判断？」。

### 16.1 任务状态登记（🚩 就地取代 §15.9 中「`S01-06` 待启动」的表述）

```
S01-06                      = DONE / ACCEPTED
UI IA                       = A 主体 + C 交互语言
Web App                     = LOCAL BUILD VERIFIED（🔴 不是 REAL BROWSER VERIFIED）
M16                         = NEXT（🔴 未授权自动启动）
Git Baseline                = 9c41624fbd14416a427350371500e7bb729ca71a（本轮实际起点）
```

### 16.2 UI 实现产物与目录归属

```
src/ui/**                        App Shell（presenters / session / components / settings / styles）
app/index.html  app/main.ts      HTML 入口 + 模块入口（被复制 / 编译进 dist-web/）
scripts/build-web.mjs            静态资源拷贝（只拷贝，不打包，不转换）
scripts/serve-web.mjs            本地预览服务器（node:http，仅服务 dist-web/）
tsconfig.web.json                WEB scope（src/ui/** + src/browser/** + app/**；lib = ES2022 + DOM + DOM.Iterable）
dist-web/                        独立产出目录（🔴 与 dist/ / dist-test/ / dist-proxy-test/ 互不覆盖）
```

- 🔴 **未引入任何 UI 框架**（task §47 / §48 允许，非强制）：`src/ui/**` 是普通 TypeScript + 原生 DOM，`tsc -p tsconfig.web.json` 产出标准浏览器 ESM，浏览器用 `<script type="module">` 直接加载。⇒ **新增依赖 = 0**，`package-lock.json` 未变，浏览器运行时不可能被打入 Node builtin（已由审计用例扫描 `dist-web/**/*.js` 断言）。
- 新增脚本（task §52）：
  ```
  npm run typecheck:web    tsc -p tsconfig.web.json --noEmit
  npm run build:web        tsc -p tsconfig.web.json && node scripts/build-web.mjs
  npm run dev:web          npm run build:web && node scripts/serve-web.mjs     # http://127.0.0.1:5173/
  npm run preview:web      node scripts/serve-web.mjs
  ```
- 🔴 **`src/ui/**` 不拥有任何业务规则**（task §49 / §68）：UI 只 `render`、收集用户意图、调用 `M15`、渲染结果。审计用例断言：不 import `src/retrieval/compare`、不 import `src/retrieval/grounding`、不 import `src/workspace/schema`；不含 `eligibleHistoricalAttempts` / `retrievalViewOf` / `deriveCitationView` / `deriveNCitationSnapshot` / `deriveTraceabilityView` / `buildGroundingContext` 等第二套实现。
- 🔴 **core 仍无 DOM**：`tsconfig.core.json` / `tsconfig.json` / `tsconfig.build.json` / `tsconfig.test.json` 一行未改（Web scope 是**新增**配置，不是放宽既有配置）。

### 16.3 INTEGRATION EXTENSION（🔴 只读，不是新产品 Decision）

```
src/application/workflow/attempt-summaries.ts    WorkflowAttemptSummary + listWorkflowAttempts()
src/application/workflow/retrieval-expansion.ts  openedRetrievalView()（把已存 Derivation 的阅读折叠打开）
```

- 🔴 两者都是 **`INTEGRATION EXTENSION`（task §16 / §28）**：**只读**、只做 `Repository → View Model` 投影；**不新增业务状态**、**不改 `D9WorkflowService`**（`Frozen Contract Modified = NO`）、**不新增 `AC`**。
- 🔴 左栏列出的每一项只含记录自身的标题 / 摘要 / `Draft｜Formal` / 数据性质徽标 / 归档标识 —— **没有相似度、评分、强度、等级、价值**任何字段（字段不存在 ⇒ 渲染不出来）。
- 🔴 展开 ⑦ 的折叠**只重新投影同一条已存 Derivation**（`retrievalViewOf(record, { expanded: true })`），**不重跑检索**，`N_检索` 不受影响。UI 侧不 import `src/retrieval/**`，该投影点留在 `M15` 内。

### 16.4 关键实现口径（`IMPLEMENTATION PARAMETER`）

- **Framework**：无框架（见 §16.2）。**Workspace**：真实 `M2` FSA adapter，由**用户点击**触发 picker；**未授权前不读任何文件**（`AppSession` 只有一道 `requirePort()` 门）。**Provider**：真实 `composeBrowserProvider` + `composeBrowserWorkflow`；`unsupported` 作为一等结果显式展示，**无 silent fallback**。**凭据**：仅 `M13` session-only store；API Key 为 password 输入、文案「仅当前会话使用」，**无「记住我」/ 无 localStorage / 无 IndexedDB / 无工作区持久化**。
- **Provider 预设目录 = S01-06 WIRING 参数**：`src/ui/settings/provider-presets.ts` 提供 `provider_id / 默认 model / capability 形状`。🔴 它**不是**「某 provider 已验证」的声明：路径仍由 `resolveProviderPath` 裁决，thin-proxy 目标的权威来源是 `M12` 服务端注册表；**Custom Base URL 仅对 `browser_direct` 预设开放**，proxy 预设下填写会被拒绝。
- **步骤状态**：①–⑩ 的 完成/当前/未开始 **全部从 `D9WorkflowSnapshot` 派生**；**未新增** `current_step` / `progress_percent` / `workflow_stage` / `step_completed[]` / `completion_score`。刷新 = 重新从 read model 推导。
- **操作 id**：`op-<action>-<opaque token>`，**不含位置**（无序号 / 无数组下标 / 无 step number）；同一用户动作重试复用同一 id，成功后才失效（`AppSession` 内存 ledger，**不持久化**）。
- **生成时机**：⑧ `generateInsights` / ⑨ `generateHypotheses` **各只有一个入口**，仅由显式按钮触发；页面打开、步骤到达、其他动作完成都**不会**自动生成；重新检索**不级联**。

### 16.5 测试口径（🔴 补充证据 + `IMPLEMENTATION INVARIANT`，不改 AC）

```
npm run typecheck / typecheck:core / typecheck:browser / typecheck:server / typecheck:web → 全部 PASS
npm run build     → PASS
npm run build:web → PASS（产出 dist-web/index.html + 模块 + app.css）
npm test          → 846 pass / 0 fail（🔴 基线 795 全部保留；+51 = S01-06 新增）
npm run test:proxy → 15 pass / 0 fail
```

- 新增用例分布：`src/tests/ui/presentation.test.ts`（U5–U11 / U13 / U14 / 步骤派生 / ⑩ 追溯）、`src/tests/ui/wiring.test.ts`（U2 + W1–W7 + U12 + 操作 id + 归档）、`src/tests/ui/static-audit.test.ts`（U1 / U3 / U4 / 文案红线 / `dist-web` 无 Node builtin）。
- 🔴 全部模型应答仍为 `NOT_A_REAL_LLM_OUTPUT` fixture；**Real Provider Calls = 0**；费用 0 元。
- 🚩 **就地补注（不改写历史）**：`src/tests/application/workflow/static-audit.test.ts` 中原本断言「`src/ui` / `app` 不得存在（S01-06 未启动）」的用例，**旧断言在本轮已按事实失效**；已就地改为「二者必须存在，且不得出现第二套 UI 目录」，原断言文本保留在注释中。业务规则边界的证明改由 `src/tests/ui/static-audit.test.ts`（U1 / §49）承担。

### 16.6 边界登记（🔴 本轮未做）

```
❌ M16 Demo Seed（无任何假 Attempt / 假 Insight / 假 Hypothesis / 假 EvidenceRef）
❌ Vercel 部署        ❌ `PSA-01`–`13` / `X1`–`X11`        ❌ Real Provider 调用
❌ 真实浏览器人工验收  ❌ README 终版 / PPT / Demo 视频      ❌ GitHub push
❌ 账户系统 / 云同步 / 多人协作 / Graph DB / Vector DB / 主题切换
```

- 🔴 `PSA` 仍**全部 `PENDING`**；`Browser real acceptance` / `Real Provider compatibility` / `Vercel deployment` 仍为 `PENDING PRE-SUBMISSION`。
- 🚩 **已登记的集成约束（事实，非缺陷）**：`M15` 的 composition root 要求「已组合的 provider」，因此 **读取工作区需要先保存一次模型配置（Provider + Model 即可，API Key 可后填）**。UI 已就此给出明确文案，未绕过 composition root。

### 16.7 下一波

```
SAFE NEXT = M16｜Demo Workspace / Local Seed
            + S01-06 Local Visual Smoke Review
PRE-SUBMISSION PSA = 仍 PENDING
🔴 未授权自动启动 —— 完成后停止，不得部署 Vercel，不得执行真实 Provider PSA
```

🔴 **本轮新增禁写**：不得写「REAL BROWSER VERIFIED」「REAL PROVIDER VERIFIED」「VERCEL VERIFIED」「PRODUCTION READY」；不得把 `dist-web` 的本地构建/本地预览写成本地优先已验收；不得写 `S01-06` 引入了 UI 框架 / 新增依赖；不得把 provider 预设写成「某 provider 已验证 / 已兼容」。

---

## 17. S01-06B ｜ PROVIDERLESS WORKSPACE READ PATH（🚩 `S01-06B`，2026-09-26｜🔴 追加，不改写历史）

> **性质**：`INTEGRATION RECORD` + `IMPLEMENTATION PARAMETER` 收敛（承接 §16，并就地取代 §16.6 末条的「已登记集成约束」）。
> 🔴 **不是 `Decision`、不是 `CCR`、不新增 `AC`、不改 Frozen Contract 语义、不改 `DECISIONS`、不改任何产品 `AC`。**
> 🔴 本节**只登记人工裁决的实现化、物理落点与测试 / 浏览器证据**；`docs/**` 的 `CONFIRMED` 结论一字未改。

### 17.1 人工裁决登记

```
S01-06-D1 = CONFIRMED  →  IMPLEMENTED
内容      : 选择本地 Workspace 不得以「Provider / Model 已配置」为前置条件。
            Providerless mode = READ-ONLY persisted-data browsing；
            AI command        = 需要合法的 Provider composition。
Decision Added : 0
AC Added       : 0
```

🚩 **就地取代 §16.6 末条**：`S01-06` 登记的「读取工作区需要先保存一次模型配置」**已被 `S01-06-D1` 人工裁决取代**。
原文本按「不改写历史」保留于 §16.6，本条为当前有效口径。

### 17.2 实现产物与路径归属（🔴 承接 §0.1 / §15.2 / §16.2）

```
src/application/capture/capture-state-reader.ts     🚩 新增：M4 provider-independent READ port
src/application/workflow/workspace-read.ts          🚩 新增：M15 provider-independent READ 层
src/browser/application/workspace-reader-composition.ts  🚩 新增：READ composition（无 provider）
src/application/capture/capture-service.ts          🔧 read-port 拆分（读半边外移，AI 半边不动）
src/application/insight/insight-service.ts          🔧 抽出 createInsightReadService（读半边）
src/application/hypothesis/hypothesis-service.ts    🔧 抽出 createHypothesisReadService（读半边）
src/application/workflow/workflow-service.ts        🔧 readWorkflow / traceHypothesis 委派给共享读层
src/ui/session/ui-port.ts                           🔧 UiReadPort / UiCommandPort 拆分
src/ui/session/app-session.ts                       🔧 读门 / 命令门分离 + ai_requires_model（纯 UI 状态）
src/ui/session/browser-gateway.ts                   🔧 createBrowserUiReadGateway
src/ui/bootstrap.ts · src/ui/app-root.ts · src/ui/components/shell.ts · src/ui/copy.ts · styles/app.css
```

**🔴 关键口径（`IMPLEMENTATION PARAMETER`，非 Decision / 非 CCR）**

| 事项 | 口径 |
|---|---|
| 读层单点 | `buildSnapshot` 的纯读取组装**只存在于** `workspace-read.ts`；`D9WorkflowService` **委派**给它，`Providerless reader` 也**委派**给它 ⇒ 同一持久化 Workspace + 同一 `attempt_id` ⇒ 同一业务数据 |
| `M8` / `M9` 读半边 | `createInsightReadService` / `createHypothesisReadService` 承载 `viewOf` / list / ⑩ trace；两个 service **委派**给它们，**未复制** `N_引用` / Experience Asset / batch current / stale 任何规则 |
| `M4` 读半边 | `readCaptureState`（含 `missingFollowUpGaps` / `recoverParseProposal`）只存在于 `capture-state-reader.ts`；`capture-service` 把内存 proposal cache **作为可选优化注入**，因此「有无缓存」返回同一 snapshot |
| Read composition | `composeBrowserWorkspaceReader` **不接收 provider、不接收 credential、不构造任何 Fake / Null / Noop / placeholder adapter**；`M12` policy / `M11` / `M13` 均不在其 import 图上 |
| ⑩ trace | 属于 **READ**：`M9` 从**已存引用集**派生，无 provider 也必须可用；「不存在」与「没有引用」仍由两个不同语句表达 |
| 命令侧不变 | `composeBrowserWorkflow` / `composeBrowserProvider` / 路径裁决 / `CredentialRef` 边界**一行未改**；命令路径**仍要求**合法 provider |
| 共享 storage | 两条 composition 共享**同一个** `WorkspaceStorage`；升级模型配置**不需要**重新选择目录、不刷新页面、不重新导入 |
| `ai_requires_model` | **纯运行时 / UI 状态**，只存在内存；🔴 **未新增** `workspace_mode` / `read_only_mode` / `provider_ready` / `ai_enabled` / `browse_mode` 等**持久字段** |
| 无 provider 点击 AI 动作 | 显示「此操作需要模型服务，请先完成模型设置。」+「打开模型设置」；🔴 **不产生 `GATE` / `RUNTIME` notice**，不显示系统错误 |
| 错误分离 | Workspace 权限失效仍走 `BrowserWorkspaceAccessError` 安全映射并**清空读取**；Provider 不可用**只**清空命令路径，`workspace` / rail / 已打开记录**保持不变** |

### 17.3 🚩 就地补注：`src/browser/application/workspace-reader-composition.ts` 不参与 provider 装配

`src/browser/application/**` 从「唯一 knows-a-runtime 的层」收窄为「knows a runtime **但读组合不需要 runtime provider**」：
该文件只消费 `M2` 已授权的 `WorkspaceStorage` 与 `M3`–`M9` 的读端口。`composeBrowserProvider` 仍**只**在命令路径使用。

### 17.4 测试口径（🔴 补充证据 + `IMPLEMENTATION INVARIANT`，不改 AC）

```
npm run typecheck / typecheck:core / typecheck:browser / typecheck:server / typecheck:web → 全部 PASS
npm run build / npm run build:web                                                        → PASS
npm test        → 871 pass / 0 fail（🔴 基线 846 全部保留；+25 = S01-06B 新增）
npm run test:proxy → 15 pass / 0 fail（原 15 全部保留）
```

- 新增 `src/tests/browser/application/providerless-workspace-read.test.ts`（B1–B9 / B14 + 读边界 + 静态审计）。
- 新增 `src/tests/ui/providerless-browse.test.ts`（B1 / B10–B13：会话级读门与命令门分离、升级不重选目录、错误分离）。
- 🔴 **每条断言均标注既有 Frozen 章节或 `AC` 编号（或 `IMPLEMENTATION INVARIANT`）；未新增任何 `AC`。**
- 🔴 `ProviderAdapter call count = 0`、`Credential read count = 0` 为**实测计数**（fixture 计数器），非声明。

### 17.5 浏览器本地 Smoke（🔴 射程受限，逐项标注）

```
Browser Local Smoke = PASS（射程见下）
Browser            = Chrome 154.0.8037.57（headless=new，本机真实 Chromium）
Page               = dist-web/ 的本地静态服务（同源）
Workspace          = 临时 fixture（23 个真实工作区文件；🔴 NOT M16 seed）
Provider calls     = 0    凭证读取 = 0    未捕获异常 = 0
```

| # | 观测项 | 结果 |
|---|---|---|
| 1 | 页面初始：`未选择工作区` + `模型服务未配置`，无左栏，有「选择本地工作区」 | PASS |
| 2 | 点击选择工作区后：`已连接本地工作区｜smoke-workspace` + **仍为** `模型服务未配置`；左栏列出 5 条历史记录 | PASS |
| 3 | 打开已有记录：中央三栏工作台正常渲染，且**已存检索结果**（「找到 2 条相关历史记录」）可读 | PASS |
| 4 | 无 provider 点击 ⑧「提炼可复用经验」：显示「此操作需要模型服务，请先完成模型设置。」+「打开模型设置」，无「系统错误」字样，工作区仍连接 | PASS |

🔴 **射程声明（不得越读）**：
- **原生目录选择器无法由 CDP 代点**（skill `cdp-browser-evidence` 明文禁止把交互写成 PASS）⇒ smoke 在**选择器这一处**返回 Chromium 自身的 **OPFS** 目录句柄（真实 FSA 存储），其余 `M2` FSA 调用、读组合、渲染、事件链路**全部为生产代码**；
- 因此 **不得**把本项写成「REAL BROWSER VERIFIED」「FSA 人工验收通过」「Local-first 已验收」；
- 真实目录句柄 + 权限授予 / 撤销生命周期仍为 **`PENDING PSA`**（`PSA-03`–`PSA-06`）。
- 🚩 环境观察（非产品缺陷）：本机安全套件向页面注入了自身脚本请求（`*.kaspersky-labs.com`），已在证据中**单独归类**，不计入页面流量。

### 17.6 边界登记（🔴 本轮未做）

```
❌ M16 Demo Seed（无任何正式 seed 数据写入工作区）        ❌ Vercel 部署
❌ `PSA-01`–`13` / `X1`–`X11`                            ❌ Real Provider 调用（0）
❌ 真实目录句柄人工验收                                   ❌ `move()` 支持（仍为 MOVE_UNSUPPORTED_BY_BROWSER）
❌ 无 provider 下的本地 mutation（🔴 providerless = READ-ONLY，未开放写作）
❌ 新增任何持久化 mode / capability 字段
```

🔴 **持续禁写**（不变）：「Vercel 已验证 / 已部署 / Production Ready」「Local-first 已可行 / 已完成浏览器验收」「Chrome / Edge / FSA verified」「real provider verified」。
🔴 **`PSA-01`–`PSA-13` / `PSA-X1`–`X11` 仍全部 `PENDING`**；真实浏览器验收 = `PENDING PSA`。

### 17.7 下一波

```
SAFE NEXT = M16｜Demo Workspace / Local Seed
PRE-SUBMISSION PSA = 仍 PENDING
🔴 未授权自动启动 —— 完成后停止，不得部署 Vercel，不得执行真实 Provider PSA
```

---

## 18. PRE-PSA-HARDENING-01 ｜ HISTORICAL FORMAL VIEW + DEMO COPY CLOSURE（🚩 `PRE-PSA-HARDENING-01`，2026-09-26｜🔴 追加，不改写历史）

> **性质**：`INTEGRATION RECORD` + `IMPLEMENTATION PARAMETER` 收敛（承接 §16 / §17，并就地关闭 M16 登记于 `.learnbuddy/memory/2026-09-26.md` 的「`§K.5 -03` 需人工裁决」）。
> 🔴 **不是 `Decision`、不是 `CCR`、不新增 `AC`、不改 Frozen Contract 语义、不改 `DECISIONS.md`、不改任何产品 `AC`、不改 `D9` 产品机制。**
> 🔴 射程：**只关闭真实 Demo 页面已经暴露出的用户可见语义问题**。无新功能、无真实 Provider 调用、无 Vercel 部署、无彩排。

### 18.1 基线

```
Git HEAD（开工实跑）  d885ab49cd7ef283eb16882de08e193587195bb1「feat: add the eight-record demo workspace baseline」
Working Tree           LOG-ONLY-DIRTY（仅 .learnbuddy/memory/**）
基线 gate             typecheck ×5 / build / build:web PASS；npm test = 929 pass / 0 fail；test:proxy = 15 pass / 0 fail
```

### 18.2 四个修复（🔴 均为既有语义的实现修正，不是新机制）

| # | 缺陷（真实页面观测） | 修正 | 落点 |
|---|---|---|---|
| 1 | 打开 `Formal` 历史记录时 **② 仍被判为「当前」**（①完成 ②当前 ③完成 ④尚未开始 ⑤完成） | `Formal` = 采集生命周期**已结束**（`D-045`）；①–⑤ 由**这一条持久化事实**结算，焦点落到 ⑥–⑩。**未新增** `current_step` / 任何持久字段 | `src/ui/presenters/steps.ts` |
| 2 | ⑤ 显示「历史检索这次没有完成」而 ⑥ 同时显示「这条记录还没有做过历史检索」 | `saveAndRetrievalAreSplit` **只在 `runtime_incomplete` 为真**；`not_available`（从未检索）不再被写成运行期失败 | `src/ui/presenters/retrieval.ts` |
| 3 | providerless 浏览 `Formal` 记录仍出现 Draft 采集控件（「继续追问」等） | ①–⑤ 的每个控件改为**问 read model**（`available_actions`）；`Formal` / 归档记录按只读展示（② 关键追问区、③ 编辑与确认、④ 分析、⑤ 保存全部不再渲染） | `src/ui/presenters/steps.ts` · `src/ui/components/steps.ts` · `src/ui/copy.ts` |
| 4 | `DEMO-05` / `DEMO-06` 的 `raw_text` 含跨域突兀句「干燥温度不适用、没有记录」 | 只改**人类可读 `raw_text`**（「当时没有（额外）记录其它条件」）；`condition` **仍为 `null`（显式 unknown）**；Level A 语义 / `Project` / `result_status` / 对象 ID / 条数 / 检索预期**一律未改** | `src/demo/demo-baseline-definition.ts` + 重生成 `demo-workspace/**` |

**🔴 语义登记（`IMPLEMENTATION PARAMETER`，非新 `Decision`）**：对 `Formal` 记录而言，①–⑤ 的 `done` 是**阶段级**陈述（「这条记录的采集阶段已经结束，且 read model 不再提供任何采集命令」），**不是**「每一步都确实执行过」的声明；⑥–⑩ 仍保持**逐对象派生**。`Draft` 记录的派生**一字未改**。

### 18.3 `§K.5 -03` 冲突 = CLOSED / RETIRED（🔴 文档修正，非 Retrieval 产品 `Decision`）

`docs/architecture/05_TEST_DEMO_DEPLOY.md` §K.5 的备用脚本 `-03` 与 `DEMO-03` **确定性冲突**：
`goal`「缩短干燥周期」与 `actual_attempt`「热风干燥、提高风量」**均与 `DEMO-03` fixture 逐字相同** ⇒ 按 `D-050` 记号规则即判 `matched`，
原文「预期 **0 条 Level A 命中**」**不成立**。**处置**：`-03` 就地标注 **`RETIRED`**（原文保留 + 更正说明），
**不得再作为「0 hit / 合法空态」备用脚本**。🔴 `D-050` / `DEMO-01`–`08` / `TE-DEMO-LIVE-01` / 检索规则**均未改动**。

### 18.4 测试口径（🔴 补充证据 + `IMPLEMENTATION INVARIANT`，不改 `AC`）

```
npm run typecheck / typecheck:core / typecheck:browser / typecheck:server / typecheck:web → 全部 PASS
npm run build / npm run build:web                                                        → PASS
npm test        → 947 pass / 0 fail（🔴 基线 929 全部保留；+18 = 本任务新增）
npm run test:proxy → 15 pass / 0 fail（原 15 全部保留）
npm run demo:status → demo_identity_proven true｜demo_baseline_records 8｜total_attempts 8
```

- 新增 `src/tests/ui/historical-formal-view.test.ts`（P1–P12：`Formal` 历史焦点 / 三态文案分离 / 运行期失败与 `N_检索 = 0` 不被吞掉 / 只读 affordance / Demo 语义与 ID 不变 / `TE-DEMO-LIVE-01` 逐字不变 / `-03` retired）。
- 🚩 **就地补注（不改写历史）**：`src/tests/ui/presentation.test.ts` 原断言「`Formal` + 缺 ④ ⇒ 焦点 = ④」，在 §18.2 修复后**该断言按事实失效**；已就地改为「十步全部结算 ⇒ 无 `current` 步」，原结论以注释形式保留。
- 🔴 **证据射程声明**：P6 / P7 在**presenter 决策面**（`actionOffered`）+ **静态接线审计**（`components/steps.ts` 确实以 read model 为准）两级验证；**渲染出的 DOM 由 §18.5 的浏览器 smoke 验证**，Node 测试构建无 `document`，**未**声称单测驱动了浏览器。

### 18.5 浏览器本地 Smoke（V-A / V-B / V-C｜🔴 射程受限，逐项标注）

```
Browser Local Smoke = PASS（射程见下）
Browser    = Chrome 154.0.8037.57（headless=new，本机真实 Chromium）
Page       = dist-web/ 的本地静态服务（同源）
Workspace  = 仓库内 demo-workspace/** 的 21 个真实文件（经 OPFS 真实 FSA 句柄）
Real Provider Calls = 0    外部请求（非本机）= 5，全部为 *.kaspersky-labs.com 安全套件注入（单独归类）
应用自身 fetch/XHR = 1（同源 /fixture/manifest.json）    未捕获异常 = 0
```

| 观测项 | 结果 |
|---|---|
| **V-A** 打开 `DEMO-01`：步骤状态 = ①–⑤ `完成`、⑥ `当前`、⑦–⑩ `尚未开始` | PASS |
| **V-A** ② 徽标 = `完成`（**不再**「当前」）；② 卡无「继续追问」；③/④/⑤ 均无 Draft 控件 | PASS |
| **V-A** ⑤ 正文 = 「这条记录已经正式保存。」；⑥ 正文 = 「这条记录还没有做过历史检索。」；**两处不同时出现「检索这次没有完成」** | PASS |
| **V-B** 打开 `DEMO-05`：① 原文与左栏摘要均为新措辞，**不含「干燥温度」** | PASS |
| **V-C** 顶栏同时保持 `已连接本地工作区｜demo-workspace` + `模型服务未配置`；左栏 8 条 `Demo 示例数据` | PASS |

🔴 **射程声明（不得越读）**：原生目录选择器**无法由 CDP 代点** ⇒ **仅在选择器这一处**返回 Chromium 自身 **OPFS** 目录句柄（真实 FSA 存储，内容 = 仓库 `demo-workspace/**` 逐字节），其余 `M2` FSA 调用、读组合、渲染、事件链路**全部为生产代码**。
**不得**据此写「REAL BROWSER VERIFIED」「FSA 人工验收通过」「Local-first 已验收」；真实句柄 + 权限生命周期仍 `PENDING PSA`（`PSA-03`–`PSA-06`）。**`PSA` 全部仍 `PENDING`，本轮未声称 `PSA PASS`。**

### 18.6 边界登记与遗留（🔴 未做 / 需人工确认）

```
❌ 真实 Provider 调用（0）        ❌ `PSA-01`–`13` / `X1`–`X11`        ❌ Vercel 部署 / 彩排
❌ 新增功能 / 新 `Decision` / 新 `AC` / `CCR` / 改 Frozen Contract
❌ 重设计界面 / 加动画 / 换配色 / 重构三栏
```

| # | 遗留项 | 状态 | 性质 |
|---|---|---|---|
| 1 | `DEMO-08` 的 `raw_text` 仍含「干燥温度不适用、没有记录」（同为「论文写作」域） | **未改** | `PROPOSED` / **需人工确认**：与 `DEMO-05` 完全同类，但任务书只点名 `DEMO-05` / `DEMO-06` ⇒ Integrator **不擅自扩大范围** |
| 2 | ② / ③ 字段来源徽标对 `Fact` 显示「你修改过」（Demo seed 的字段从未经 UI 修改） | **未改** | 观测（**copy 精度**，非本轮射程）；影响面 = 文案口径，需人工裁决 |
| 3 | `§K.5` 因 `-03` 作废而**当前没有**「预期 0 命中」的备用输入 | **未补** | `PROPOSED` / **需人工确认**：替换输入的真实命中集合只能由彩排 / `PSA` 观测 |

### 18.7 Git（🔴 事实登记：本轮**未能提交**）

```
✅ 密钥扫描：改动文件（src/ui/** · src/demo/demo-baseline-definition.ts · src/tests/ui/** · docs/architecture/05_TEST_DEMO_DEPLOY.md）
            模式扫描（sk-* / SecretId / SecretKey / Bearer / AKIA / BEGIN PRIVATE KEY / password=）= 0 命中；
            唯一 http(s) 命中为 presentation.test.ts 既有的禁用词清单
🔴 `git` 在本轮中途已**看不到仓库**：`git rev-parse HEAD` / `git log` 返回
   `fatal: not a git repository (or any of the parent directories): .git`，
   且 `Test-Path <repo>\.git` = False、`.NET GetDirectories()` 亦无 `.git` 条目
   （会话开始时的 `git log -1` 仍返回 d885ab4 ⇒ 中途发生、原因未确认）
🔴 因此 **Commit 未执行**；`git` 版本 2.52.0 本身可用（缺的是仓库）
⇒ 处置：**不擅自 `git init` / 不重建历史**；由项目负责人确认 `.git` 状态后自行提交（建议提交信息见下）
```

建议提交信息：`fix: harden the historical demo view before PSA`

### 18.8 状态汇总

```
PRE-PSA-HARDENING-01        = DONE（实现 / 测试 / 文档 / smoke 全部完成；🔴 Git commit 除外）
Formal historical view      = CLOSED
Never-run vs runtime-incomplete = CLOSED
Demo cross-domain wording   = CLOSED（DEMO-05 / DEMO-06；DEMO-08 见 §18.6 遗留 1）
K.5 -03 conflict            = CLOSED / RETIRED
PSA                         = PENDING（未声称 PASS）
Decision Added = 0｜AC Added = 0｜Frozen Contract Modified = NO｜CCR = NO
```

🔴 **持续禁写**（不变）：「Vercel 已验证 / 已部署 / Production Ready」「Local-first 已可行 / 已完成浏览器验收」「Chrome / Edge / FSA verified」「real provider verified」；不得把 `PSA-*` 当产品 `AC`；不得把本次 smoke 写成「真实浏览器人工验收已通过」。

### 18.9 下一波

```
SAFE NEXT = PRE-SUBMISSION PSA
          ｜Real Browser + Real Provider
          ｜TE-DEMO-LIVE-01 Full Rehearsal
🔴 未授权自动启动 —— 完成后停止，不得部署 Vercel，不得执行真实 Provider PSA
```

---

## 19. GIT RECOVERY INCIDENT（🚩 `GIT-RECOVERY-01`，2026-09-26｜🔴 追加，不改写历史）

> **性质**：`REPOSITORY RECOVERY RECORD` + `INCIDENT REGISTRATION`（承接 §18.7 的「Commit 未执行」事实登记）。
> 🔴 **不是 `Decision`、不是 `CCR`、不新增 `AC`、不改 Frozen Contract 语义、不改 `DECISIONS.md`、不改任何产品 `AC`。**
> 🔴 本节**只做两件事**：① 登记 `.git` 元数据丢失这一事故；② 解释**为什么当前 repo 无法解析过去 hash**。
> 🔴 本节**不改写任何过去任务的 `DONE` / `ACCEPTED` 状态** —— 它们**全部照旧**（见 §19.2）。

### 19.1 事故登记（🔴 承接 §18.7）

原 `.git` metadata 在 `PRE-PSA-HARDENING-01` 开发过程中**不可见**（会话开始时 `git log -1` 仍返回 `d885ab4`，
中途 `git rev-parse HEAD` 开始返回 `fatal: not a git repository`），经人工检查**当前项目目录 / 父目录递归 /
`.git` 文件与目录 / 回收站 / Windows 以前版本 / 可用备份来源**后**确认丢失**。

完整事故记录与恢复策略见 `20_INTEGRATION/GIT_RECOVERY_MANIFEST.md`。

### 19.2 状态登记（🔴 本次追加口径）

```
ORIGINAL GIT METADATA LOST
SOURCE TREE PRESERVED
RECOVERY REPOSITORY CREATED
PRE-LOSS HASHES = AUDIT REFERENCES ONLY
NEW GIT HISTORY STARTS FROM RECOVERY BASELINE
```

| 项 | 状态 | 说明 |
|---|---|---|
| 原 Git object database / refs / index / reflog / commit graph | **LOST** | 不可恢复；原 Git DAG 已丢失 |
| 原 source tree | **PRESERVED** | 未因事故受损 |
| LearnBuddy execution history / handoff / memory logs | **PRESERVED** | 未删除 |
| Recovery repository | **CREATED** | 新建，**0 个对象**起步（实测：`.git/objects/` 仅 `info/` + `pack/`；无 index / 无 reflog / 无 packed-refs） |
| Pre-loss hashes | **AUDIT REFERENCES ONLY** | 见 `GIT_RECOVERY_MANIFEST.md` §4（19 项），🔴 **不是当前 repo 的 commits** |
| New Git history | **STARTS FROM RECOVERY BASELINE** | 首个 commit = `chore: establish recovered repository baseline` |

🔴 **过去任务的 `DONE` / `ACCEPTED` 一律照旧、逐条不变**：
`M15` = `DONE`｜`S01-06` = `DONE / ACCEPTED`｜`S01-06B` = `DONE`｜`M16` = `DONE / ACCEPTED`｜
`PRE-PSA-HARDENING-01` = `DONE`（其 Git commit 从未产生，见 §18.7 / §19.4）。

### 19.3 原开发过程的辅助审计依据

`.git` 丢失后，原开发过程的顺序与内容以以下材料为**辅助审计依据**（🔴 它们是**记录**，不是 Git 对象）：

```
.learnbuddy/memory/**（含 DECISION_INDEX.md · MEMORY.md · 各日期日志）
20_INTEGRATION/CODING_START_HANDOFF.md（§12 – §18 各 Integration Record）
30_SPIKES/**（SP-06 等 Spike 的执行报告与原始证据）
docs/CHANGELOG.md
```

### 19.4 🔴 为什么当前 repo 无法解析过去 hash（本节唯一需要解释的事）

```
原因 = .git metadata loss
（不是 rebase、不是 squash、不是 filter-branch、不是 shallow clone、
  不是 gc/prune、不是他人重写历史）
```

原 object database、refs、index、reflog、commit graph **整体丢失** ⇒ 新 repository 的
object database **从零开始** ⇒ 旧 hash 的**对象本身不存在**，无从解析。

🔴 实测证据（`git cat-file -t <hash>`）：

```
§4 全部 19 个缩写 hash（089913c … d885ab4）                → fatal: Not a valid object name <hash>
3 个已知完整 40 位 hash（3696d7d… / 9c41624… / d885ab4…）  → fatal: git cat-file: could not get object info
```

⇒ 因此：

- 🔴 **不得**把「`git show <旧 hash>` 失败」解释为**任何历史改写** —— 它是**对象缺失**，不是**历史被改**；
- 🔴 **不得**把旧 hash 写入 `.git/` 内部文件（`refs` / `packed-refs` / `replace` / `grafts`）来「让它能解析」；
- 🔴 **不得**用 `commit-tree` / `GIT_AUTHOR_DATE` / `GIT_COMMITTER_DATE` 人工制作旧提交；
- 🔴 **不得**声称原 Git history 已恢复、或声称旧 hash 存在于当前 repository。

### 19.5 Pre-loss hash 的用途边界

✅ 允许：作为**审计引用**（人类可读），说明原开发过程的时间线顺序；
✅ 允许：在报告中标注「该阶段的源码等同/接近当前工作树的哪一部分」；
❌ 禁止：作为当前 repo 的 parent / base / merge 目标 / 校验对象。

🔴 **列表完整性声明**：`GIT_RECOVERY_MANIFEST.md` §4 的 19 项**来源于 pre-loss 记录**
（本文件与 `.learnbuddy/memory/**`），🔴 **不得声称它必然包含历史中的所有 commit**；
其中 16 项在既有记录中**仅有缩写形式**，本任务**不补全、不推测**。

### 19.6 Recovery Baseline

```
commit message : chore: establish recovered repository baseline
parent         : 无（新 repository 的第一个 commit）
🔴 不使用 d885ab4（或任何 pre-loss hash）作为 parent 或 hash
```

- `PRE-PSA-HARDENING-01` 的全部产品修改**不再有自己的 commit**，而是随该 recovery baseline
  **首次**进入版本库（🔴 这不改变 `PRE-PSA-HARDENING-01` = `DONE`，只说明「哪一次 commit 承载了它」）。
- 🚩 **回填点**：recovery baseline 的实际 hash 为**提交后取证结果**，登记于
  `.learnbuddy/memory/2026-09-26.md`（`GIT-RECOVERY-01` 节）；🔴 本文件与
  `GIT_RECOVERY_MANIFEST.md` **均在提交前撰写**，故**不嵌入任何未经取证的 hash**。

### 19.7 边界登记（🔴 本轮未做）

```
❌ PSA（仍 PENDING）        ❌ Real Provider 调用（0）      ❌ Vercel 部署
❌ UI 功能开发              ❌ Demo 重写                     ❌ RECOVERY-POLISH-01（已登记，未修）
❌ push remote / 新建 remote  ❌ 新增 Decision / AC / CCR      ❌ 改写任何过去任务结论
```

🔴 **持续禁写**（不变）：「Vercel 已验证 / 已部署 / Production Ready」「Local-first 已可行 / 已完成浏览器验收」
「Chrome / Edge / FSA verified」「real provider verified」；🔴 `PSA-01`–`PSA-13` / `PSA-X1`–`X11` 仍**全部 `PENDING`**。

```
SAFE NEXT = PRE-SUBMISSION PSA｜Real Browser + Real Provider｜TE-DEMO-LIVE-01 Full Rehearsal
🔴 未授权自动启动 —— 完成后停止
```

---

## 20. REMOTE-BACKUP-01 ｜ GITHUB PRIMARY REPOSITORY ESTABLISHMENT（🚩 `REMOTE-BACKUP-01`，2026-09-26｜🔴 追加，不改写历史）

### 20.1 任务状态登记

```
task             : REMOTE-BACKUP-01
phase            : PRE-SUBMISSION
type             : Repository Remote / Backup Task
人工裁决（前置）  : Primary Remote = GitHub｜Visibility = PUBLIC
RESULT           : 🔴 BLOCKED —— GITHUB CLI MISSING
Task             : NOT DONE
BLOCKER          : YES
```

🔴 **本任务的唯一目标（把 recovery repository 建立为 GitHub 主仓库 + 完成第一次远程备份）未达成。**
原因是执行环境**未安装 `GitHub CLI`**，按任务 §8 ⇒ **停在 remote creation 之前**（不安装任何来源不明 binary）。
因此：`GitHub Repository = NOT CREATED`｜`origin = NONE`｜`push = 未执行`｜`Visibility = PUBLIC` 与 `Primary Remote = GitHub` 两项人工裁决**保留但未落地**。

🚩 **就地补注（不改写历史）**：§19.7 边界登记中的「❌ push remote / 新建 remote」在本轮**仍未完成**；本节为其后续状态登记。

### 20.2 已完成并取证的部分（本地侧｜只读检查 + 一次授权 commit）

```
Baseline Gate       : PASS   （inside work tree = true｜branch = main｜HEAD = 207902b｜git remote -v 空｜git 2.52.0.windows.1）
Recovery Root       : PRESERVED（git rev-list --parents 实测 root 无 parent；未 re-init / rebase root / amend / 伪造旧 parent）
Git Identity        : Red23 <229438394+Redthink233@users.noreply.github.com>（repo-local；.git/config 无 remote、无任何 token）
Secret Scan         : PASS   （高置信模式命中 16 行，逐行核验全部为显式假值 sk-fixture-* / hunter2 或审计清单引用）
Publication Privacy : PASS   （手机号 0｜身份证 0｜邮箱仅 4 条：123@qq.com 占位 / GitHub noreply / 测试 fixture）
LICENSE / README    : 均 ABSENT（🔴 未添加 —— 属 Submission Package 人工裁决项，本任务无权选择）
tracked files       : 561（未增未减）
禁止路径（本地侧）   : node_modules/｜dist/｜dist-web/｜dist-test/｜dist-proxy-test/｜.env｜.chrome-profile｜smoke-evidence 全部 0 命中
旧 pre-loss hash    : 3696d7d｜aa8e89f｜9e710d3｜a1ff737｜d885ab4 全部 `fatal: Not a valid object name`（⇒ 未进入新 DAG）
```

### 20.3 Git（🔴 事实登记）

```
207902b  chore: establish recovered repository baseline     ← root / 无 parent
12d0793  chore: finalize repository recovery audit trail    ← 本任务创建（仅 .learnbuddy/memory/**，54+/3-）
         🔴 未推送（无 remote）｜git rev-list --count HEAD = 2
```

### 20.4 阻断原因与解除方式（🔴 需人工动作）

```
Get-Command gh            : GITHUB CLI MISSING（不在 PATH）
7 处候选安装位（Program Files\GitHub CLI｜Program Files (x86)\GitHub CLI｜
  LocalAppData\Programs\GitHub CLI｜LocalAppData\GitHubCLI｜scoop\shims｜
  chocolatey\bin｜WinGet\Links）: 全部 False
winget                    : 存在，但未安装任何包
credential.helper         : manager（Windows 凭据管理器中无 github.com 条目）
```

**人工裁决的解除路径（2026-09-26 已选定）**：由**用户本人**于浏览器手工创建**空 PUBLIC** 仓库
（🔴 **不**勾选 README / .gitignore / License —— 避免制造与本地 recovery history 冲突的远端初始 commit），
再把 URL 交回；随后由 AI 执行 `git remote add origin <url>` + `git push -u origin main`。
🔴 凭据走本机已装的 Git Credential Manager 浏览器授权，**AI 全程不接触 token**，也不写入任何文件 / shell history。

### 20.5 边界登记（🔴 本轮未做）

```
❌ 创建 GitHub repository     ❌ git remote add / origin 配置      ❌ git push（含 --force / --force-with-lease）
❌ Remote Verification        ❌ 远端备份范围验证                   ❌ 安装任何 gh binary
❌ LICENSE 选择（MIT / Apache-2.0 / GPL 均未添加）                  ❌ submission README 定稿
❌ PSA（仍 PENDING）          ❌ Real Provider 调用（0）            ❌ Vercel 部署
❌ GitHub Actions / CI / branch protection / Release / Tag / Issue / PR / GitHub Pages
❌ RECOVERY-POLISH-01（已登记，未修）
```

🔴 **本节追加禁写项（持续）**：不得写「GitHub Primary Repository = ESTABLISHED」「Public Remote Backup = PASS」
「origin 已配置」「已 push」「local HEAD = remote main」「Remote History Conflict = NO」；
不得把 `12d0793` 说成已推送；不得把本任务写成 `DONE`（🔴 **未完成**）；不得把 `REMOTE-BACKUP-01` 写成已解除阻断。

```
SAFE NEXT = 解除阻断（用户浏览器建空 PUBLIC 仓库 → 交回 URL）→ 回到 §10 → §17
🔴 未授权自动启动 —— 本次完成后停止
```

---

## 21. REMOTE-BACKUP-01 ｜ ESTABLISHMENT AFTER BLOCKER RESOLUTION（🚩 `REMOTE-BACKUP-01` 续跑，2026-09-26｜🔴 追加，不改写历史）

> 本节是 **§20 的续跑登记**。§20 的 `BLOCKED` 记录**原样保留、未修改、未删除**（它是事实历史）。

### 21.1 状态表

```
task                   : REMOTE-BACKUP-01（BLOCKER 解除后续跑）
phase                  : PRE-SUBMISSION
type                   : Repository Remote / Backup Task
Primary Remote         : GitHub
Repository             : Redthink233/failure-experience-incubator
Visibility             : PUBLIC（用户本人于 GitHub 网页手工创建，非 AI 创建）
Origin                 : https://github.com/Redthink233/failure-experience-incubator.git
Remote Initially Empty : YES（push 前 `git ls-remote` = exit 0 / 0 refs）
Force Push             : NO（普通 new-branch push；未用 --force / --force-with-lease）
Recovery Root          : 207902b326a43ad6cde7c20b8b722ffa957ad07c（仍为 root，无 parent）
Pre-loss hashes        : AUDIT REFERENCES ONLY（仍未进入当前 DAG）
Local / Remote         : MATCH
LICENSE                : PENDING HUMAN DECISION
README Final           : PENDING SUBMISSION PACKAGE
PSA                    : PENDING
Real Provider          : NOT EXECUTED
Vercel                 : NOT DEPLOYED
REMOTE-BACKUP-01       : DONE
```

### 21.2 实测取证

```
push 前远端空态        : git ls-remote <url> → exit 0 / 0 refs（§2 硬门 PASS，未假设为空）
push                   : git push -u origin main → exit 0
GitHub 浏览器授权      : PASS（本机 Git Credential Manager 授权流程由用户本人完成；AI 未接触任何 token）
local HEAD             : 637cf4bd51126c3c09f05b0fdf4cbeacc312d952
remote refs/heads/main : 637cf4bd51126c3c09f05b0fdf4cbeacc312d952
远程存在性确认         : git ls-remote（匿名读，credential helper 关闭）→ refs/heads/main + HEAD 均指向 637cf4b
远端 main tree         : 561 files（= 本地 tracked 561，逐项一致）
20_INTEGRATION/GIT_RECOVERY_MANIFEST.md → 已在远端 main（PASS）
20_INTEGRATION/CODING_START_HANDOFF.md  → 已在远端 main（PASS）
远端禁止路径           : node_modules/｜dist/｜dist-web/｜dist-test/｜dist-proxy-test/｜.env｜
                         .chrome-profile｜smoke-evidence → 全部 0 命中
git rev-list --count main = 3 ｜ git log --reverse --oneline = 207902b → 12d0793 → 637cf4b
git rev-list --parents --max-parents=0 main = 207902b（root 保持不变）
旧 pre-loss hash       : 3696d7d｜aa8e89f｜9e710d3｜a1ff737｜d885ab4 仍全部 `fatal: Not a valid object name`
```

### 21.3 🔴 环境限制登记（如实登记，非 repo 缺陷）

```
现象 : 本地 remote-tracking ref `refs/remotes/origin/main` 无法落盘 ⇒ `git branch -vv` 显示 `[origin/main: gone]`
实测 : ① git push -u / git fetch 均 exit 0（fetch 打印 "* [new branch] main -> origin/main"）
       ② git update-ref refs/remotes/origin/main <hash> → exit 0，但 Test-Path 仍 False
       ③ 直写 .git/refs/remotes/origin/main → 报 ok，Test-Path 仍 False
       ⇒ 该路径上的写入被执行环境**静默丢弃**（`.git/refs/heads/**` 与 `.git/` 顶层文件正常）
影响 : 仅影响本地显示与 ahead/behind 便利信息。tracking 配置本身正确：
       branch.main.remote = origin｜branch.main.merge = refs/heads/main ⇒ push / pull 目标正确。
       **不影响**远端状态，也**不影响**「local HEAD = remote refs/heads/main」的判定（由 `git ls-remote` 权威确认）。
判定 : 按任务 §6，🔴 **不因此把本任务判为 BLOCKED**。
```

### 21.4 边界登记（🔴 本轮未做）

```
❌ LICENSE 选择（MIT / Apache-2.0 / GPL 均未添加）  ❌ submission README 定稿
❌ GitHub Actions / CI / branch protection / Release / Tag / Issue / PR / GitHub Pages
❌ PSA（仍 PENDING）  ❌ Real Provider 调用（0）  ❌ Vercel 部署  ❌ RECOVERY-POLISH-01（已登记，未修）
```

🔴 **本节追加禁写项（持续）**：不得写「Open Source Submission Complete」（LICENSE 尚未人工选择）；
不得写「Production Ready」「Vercel Deployed」「PSA Passed」「Real Provider Verified」；
不得因 §21.3 的本地 ref 限制而声称远端异常或任务未完成。

```
SAFE NEXT = RECOVERY-POLISH-01
🔴 未授权自动启动 —— 本次完成后停止
```

---

## 22. RECOVERY-POLISH-01 ｜ DEMO COPY + SOURCE LABEL + TRUE 0-HIT PSA FIXTURE（🚩 `RECOVERY-POLISH-01`，2026-09-26｜🔴 追加，不改写历史）

> 阶段 = `PRE-SUBMISSION`｜类型 = `Final Product Polish Before PSA`｜执行方式 = 单机串行。
> 🔴 **本节不改动 §20 / §21 的任何内容**（含 §20 的 `BLOCKED` 快照与 §21 的 `ESTABLISHED` 结论）。

### 22.1 状态

```
RECOVERY-POLISH-01 = DONE
Git Baseline          = a2731359064dff1c419dc826d6d764b12ee58b9e（开工 HEAD = remote refs/heads/main，实际核对一致）
DEMO-08 Cross-domain Copy      = CLOSED
Demo Fact Source Label         = CLOSED
Live Fact Source Label         = CLOSED
True Level A Zero-Hit PSA Fixture = REGISTERED
Real 0-Hit Execution           = PENDING PSA（本任务只做静态检查，未声称已观测）
PSA                            = PENDING
Real Provider                  = NOT EXECUTED（0 次调用）
Vercel                         = NOT DEPLOYED
Decision Added = 0   AC Added = 0   Frozen Contract Modified = NO   CCR = NO   BLOCKER = NO
```

### 22.2 三项交付（逐项）

**A｜`DEMO-08` 跨领域残留文案 = `CLOSED`**

```
原 : 这次的目标是避免虚假引用，用的是引用校验后处理加人工复核这条路线，干燥温度不适用、没有记录，处理之后幻觉引用明显下降。
新 : 这次的目标是避免虚假引用，用的是引用校验后处理加人工复核这条路线，当时没有额外记录其它条件，处理之后幻觉引用明显下降。
```

- 只改**人类可读** `raw_text`。`attempt_id` / `project_id` / `goal` / `actual_attempt` /
  `condition`（仍 `null` ⇒ 显式「未知 / 未提供」）/ `actual_result` / `result_status = 'Success'` /
  `archive_state` / 时间戳 **逐字段不变**；fixture 条数仍 8；**未**新增设备 / 版本 / 温度 / 成本 / 阈值 / 环境 / 失败原因。
- 🔴 `PRE-PSA-HARDENING-01` §7 只改了 `DEMO-05` / `DEMO-06`，**漏掉了同样跨域的 `DEMO-08`**（同为「论文写作」）—— 本次是该遗漏的收口，不是新问题。

**B｜字段来源标签用户可见语义 = `CLOSED`**

```
缺陷 : `sourceLabelOf(source_type)` 仅凭 `source_type === 'Fact'` 就输出「你修改过」——
       对 demo seed 的 Fact 而言这是**伪造编辑历史**（V1 无 edit / version history，AC-122）。
修复 : 三态派生（🔴 未改 `source_type` 定义、未新增任何领域字段、未改 schema、未加持久状态）
       ① `Attempt.data_source_nature === 'demo_sample'` → 「示例记录」
       ② 有**真实** edit evidence（③ 会话内 `confirmation_edits` 非空）→ 「你修改过」
       ③ 其余 → 「你提供的信息」（默认值，也是 fail-safe）
       🔴 AI 半边先判定且永不被覆盖：`Extraction` / `Inference` 恒为 AI 侧文案。
       🔴 判定顺序 = AI 侧 → demo → 真实编辑 → 默认；demo 优先于编辑，故 seed 记录永不声称编辑。
fail-safe : 无证据 → **绝不**输出「你修改过」（宁可显示「你提供的信息」）。
```

**C｜真 `Level A` 零命中 `PSA` 输入 = `REGISTERED`**

```
编号 : TE-DEMO-ZERO-01（登记于 src/demo/live-demo-script.ts 的 TE_DEMO_ZERO_01）
输入 : 「这次问卷回收效果没有达到预期。我的目标是提高问卷回收率，这次做法是在填写截止前 24 小时
        发送一次短信提醒。当时没有额外记录其它条件。截止以后问卷回收率仍没有明显提升。」
性质 : 文本登记，**不是 seed**；任何代码路径都不会把它写成第 9 条记录。
静态 : 四维对 DEMO-01…08 共 32 对，用**产品自身的** deterministicDimensionVerdict 检查，
       **无任何 `matched`**（P12）。condition 的两种读数（被抽成 / 未被抽成）都不改变结论。
正对照 : 已 RETIRED 的 -03 的 `goal` 在同一规则下**仍判 `matched`** ⇒ 证明该检查不是空转。
🔴 未做 : 未预存 `matched` / `N_检索` / `Retrieval Derivation`；**未声称** REAL 0-HIT VERIFIED。
```

### 22.3 Demo 基线再生成（`demo-workspace/**`）

```
操作 : npm run demo:reset（fail-closed 身份证明通过）→ 再 seed 一次（幂等验证）
规模 : 8 / 8 Attempts   全部 Formal   Attempt-only   文件 21 个（与 reset 前一致）
幂等 : 第二次 seed = created 0 / reused 8
digest : 21 个文件中**仅 2 个**发生变化 —— ATT_DEM0A080000000000000000000.json 与 .md
         （4AA1764C…→D52CF3AE…｜2FC71BEA…→FD175AB3…），其余 19 个**逐字节相同**
结论 : Only DEMO-08 human-readable raw_text changed.
```

### 22.4 变更文件

```
M src/demo/demo-baseline-definition.ts      DEMO-08 raw_text + 就地补注
M src/demo/live-demo-script.ts              TE_DEMO_ZERO_01 + 可选 expected_level_a_parse
M src/ui/copy.ts                            CONFIRM_SOURCE_DEMO / _USER_PROVIDED + 三态口径说明
M src/ui/presenters/capture.ts              sourceLabelOf / captureFieldsOf / keyParameterViewsOf 接受上下文
M src/ui/components/steps.ts                ③ 传入 editedFieldKeys(state.confirmation_edits)
M demo-workspace/**/ATT_DEM0A080*.{json,md}  再生成产物（仅 DEMO-08）
M docs/architecture/05_TEST_DEMO_DEPLOY.md   §K.5.1 登记零命中脚本（就地补注，未删改原「遗留」）
                                            + §K.5 更正表 actual_attempt 行精度就地补注
                                            + §P 现场脚本行 + §附录 TE 计数就地补注（171 → 172）
A src/tests/ui/source-label.test.ts          P5–P10
A src/tests/demo/recovery-polish-01.test.ts  P1–P4 / P11–P15
```

### 22.5 验证（🔴 全部实测）

```
typecheck ×5（tsconfig / core / browser / server / web）  = PASS
build（tsconfig.build）                                  = PASS
build:web（143 modules + 1 stylesheet）                  = PASS
npm test                                                = 970 passed / 0 failed（任务前 947）
npm run test:proxy                                      = 15 passed / 0 failed
demo:status                                             = identity proven / 8 records / 8 fixtures
Secret Scan（553 个非产物文件）                          = 命中项**全部**为凭据禁用口径文档文本与
                                                          既有显式假值 fixture；**无真实凭据**
Visual Smoke（本机真实 Chrome 154.0.8037.57，headless=new）= PASS
  · fixture = 仓库 demo-workspace/** 的 %TEMP% **副本**（21 文件）
    🔴 **未写入** 提交基线；其中 **1 条**记录的 L4 ③ 被翻转为 `field_record` 以构造「非 Demo」夹具
  · R1 打开 DEMO-01：目标/实际尝试/条件/实际结果 四格全部 =「示例记录」；全页**无**「你修改过」
  · R2 打开 DEMO-08：渲染出的 raw_text **不含**「干燥温度」；Demo 示例数据仍在
       （🔴 全页文本仍出现「干燥温度」**仅**因左栏 DEMO-03 的摘要——那是同域记录，理应保留；已定位到具体行）
  · R3 打开非 Demo 夹具：普通用户 Fact =「你提供的信息」，**未**被误标「示例记录」，**无**「你修改过」
  · Provider calls = **0**（唯一 5–6 条出站请求全部指向本机杀毒套件 `gc.kis.v2.scr.kaspersky-labs.com`，
    非产品、非模型服务）；未捕获异常 = 0
  · 证据：%TEMP%\recovery-polish-01-smoke\out\（5 张截图 + smoke-report.json）
```

### 22.6 静态检查额外发现（🔴 如实登记，就地补注、未据此改 seed）

```
发现 : docs/architecture/05_TEST_DEMO_DEPLOY.md §K.5「更正说明」表中，`actual_attempt` 一行
       两侧都写作「热风干燥、提高风量」，但 DEMO-03 的 fixture 实为「热风干燥 + 提高风量」
       （分隔符 `+`）⇒ 该行**并非逐字相同**，按既有规则为 `undecided`。
影响 : 无。`goal` 一行才是确定性冲突（逐字相同 ⇒ matched ⇒ related = true，D-061），
       `-03` 的 RETIRED 结论完全不变；**未**据此改动任何 seed、任何 Retrieval 规则。
处置 : 就地补注（保留原表，不改写），并在 P12 正对照中固化为断言。
```

### 22.7 边界登记（🔴 本轮未做）

```
❌ 未改：Retrieval 规则 / comparator / strict semantic overlap / synonym / normalization / DEMO-01..08 的
        检索语义 / D9 / EvidenceRef / N_检索 / N_引用 / source_type 定义 / schema / 持久状态
❌ 未恢复已 RETIRED 的 TE-DEMO-LIVE-03（原文与状态**原样保留**）
❌ 未改 TE-DEMO-LIVE-01（逐字冻结，由测试断言）
❌ 未做 UI / CSS 大布局改动（三栏比例 / Topbar / 左栏 / Step 状态 / Evidence rail / 颜色 / 布局全部 ACCEPT）
❌ 未新增 Decision / AC / CCR；未改冻结合同
❌ PSA（仍 PENDING）  ❌ Real Provider 调用（0）  ❌ Vercel 部署  ❌ LICENSE / README
❌ 真实浏览器**人工**验收（PSA-03–PSA-06：真实句柄 + 权限生命周期）—— 仍 PENDING PSA
```

🔴 **本节追加禁写项**：不得把 `TE-DEMO-ZERO-01` 的静态检查写成「真实 0 命中已验证 / REAL 0-HIT
VERIFIED」；不得写「PSA 已通过」「Real Provider Verified」「Vercel 已部署」；不得把本次本地
providerless 视觉冒烟写成「真实浏览器人工验收已通过」「Chrome / FSA verified」；不得写
「`TE-DEMO-LIVE-03` 已恢复 / 已替代为同一编号」；不得写「原 Git history 已恢复」；
不得把 `-03` 更正表的补注写成「改写历史」。

```
SAFE NEXT = PRE-SUBMISSION PSA
            ｜ Real Browser + Real Provider
            ｜ TE-DEMO-LIVE-01 Full Rehearsal
🔴 未授权自动启动 —— 本次完成后停止（不得自动开始 PSA）
```

---

## 23. PRE-PSA-BLOCKER-01 ｜ SETTINGS CENTER + MODEL CONFIGURATION USABILITY FIX（🚩 `PRE-PSA-BLOCKER-01`，2026-09-26｜🔴 追加，不改写历史）

> 阶段 = `PRE-SUBMISSION`｜类型 = `Blocking Bug Fix / UI Integration Fix`｜执行方式 = 单机串行。
> 🔴 **本节不改动 §22 及之前任何内容**。

### 23.1 状态

```
PRE-PSA-BLOCKER-01 = DONE
Git Baseline（开工 HEAD） = 701134183842ae2f1ab182263985ea658c610815
   └ parent = d2196019f4371a875db62e14b450f954bd75d0f1（预期上一正式产品 commit）
   └ 7011341 的**唯一**改动 = 删除 1 个 .docx 二进制（赛事手册(4).docx），**0 行产品源码**
   └ 判定 = 其后无未解释的产品源码 drift ⇒ **未触发 STATE DRIFT**
Settings Input Focus Bug   = CLOSED
Settings Exit              = CLOSED
Settings Consolidation     = CLOSED
Save Feedback              = CLOSED
DeepSeek PSA Candidate     = CONFIGURED / **NOT VERIFIED**
DeepSeek Browser Direct    = PENDING REAL PSA
DeepSeek CORS              = PENDING REAL PSA
Real Provider Calls        = 0
PSA                        = PENDING
Vercel                     = NOT DEPLOYED
Decision Added = 0   AC Added = 0   Frozen Contract Modified = NO   CCR = NO   BLOCKER = NO
```

### 23.2 根因（🔴 两个机制；**事实 / 推断分离**）

```
【M1｜已观测到的缺陷（真实浏览器已复现修复效果）】
  app-root.ts 有**两条** render path；`if (!authorized)` 那条在 `root.replaceChildren(shell)` 之后
  直接 `return`，**从未调用 restoreFocus**。而该分支同样渲染 Settings Center ⇒
  首次运行（先开设置、尚未选工作区）时：每敲一个字符 → session state 变 → 整树重建 → 焦点无处可还。
  这正是用户报告的「输入一个字符就掉焦点」。
  修复：两条 render path **都必须**恢复捕获到的焦点（已固化为断言：split('root.replaceChildren(shell);')
        后 2 段各自 160 字符内必须出现 restoreFocus( ）。

【M2｜潜在机制（同一轮一并消除）】
  控件 id 由**用户可见 label 推导**：`field-${label.replace(/[^A-Za-z0-9]/gu,'')}-${type}`。该方案是重复 id 的
  制造器：纯中文 label（如「模型」「结果」）一律塌缩为 `field--text`；ASCII 骨架相同的两个 label 同样相撞。
  ⚠️ **事实性澄清**：**实际发布**的 label 是 ASCII（Model / Custom Base URL / API Key），三者 id 分别为
  `field-Model-text` / `field-CustomBaseURL-text` / `field-APIKey-password`，**当前并未相撞**。
  因此 M2 是「方案本身的缺陷 + 任何未来非 ASCII label 的隐患」，**未**被确立为本次症状的原因；M1 是。
  修复：id 改为显式产品常量（`SETTINGS_CONTROL_IDS`），label 与身份彻底解耦。
```

### 23.3 六项交付（逐项）

```
A｜设置入口归并（§4）     顶栏唯一入口 = 「设置」（`SETTINGS_OPEN`）。独立「模型设置」入口**已消失**；
                          Workspace 状态 badge 与 模型状态 badge **保留**。
B｜Settings Center（§5）   `modelSettings()` → `settingsCenter()`：标题 + × 关闭 + 「模型服务」section
                          （Provider / 连接方式 / Model / API Key / Base URL）+ 预设说明 + footer。
                          只留 section 容器形态，**未**新增 账户/主题/语言/云同步/遥测。
C｜稳定控件身份（§3）       `SETTINGS_CONTROL_IDS` = settings-provider / -model / -api-key / -base-url /
                          -save / -cancel / -close；`labelInput({ id, label, type, value, onChange })`
                          **id 为必填**，不再由 label 推导。
D｜退出（§6）              ×（右上）/ 取消（底部）/ Escape 三者都调用 `session.closeSettings()`；
                          Escape 监听器在 mount 期绑定一次、卸载时移除，且**不**清 Key / **不**保存 /
                          **不**触工作区。关闭**不**新增任何持久 draft（draft 语义不变）。
E｜保存反馈（§7/§8）       三种结果严格区分且**全部渲染在面板内**：
                          A 输入不合法 ⇒ `settings_errors` inline（面板保持打开，不调用 gateway）
                          B 组合成功   ⇒ provider ready + 面板自动关闭 + 顶栏 badge
                          C 组合不受支持 ⇒ `settings_save_error` inline（面板保持打开，新增**瞬时**状态）
                          （C 的原因不再只出现在被 overlay 遮住的页面外部 notice）
F｜DeepSeek 预设（§9/§10）  default_model `deepseek-chat` → **`deepseek-flash`**；capability → browser_direct
                          （thin_proxy = false，json_object）；fixed_base_url =
                          `https://api.deepseek.com/chat/completions`（BrowserDirectAdapter verbatim POST，
                          故值必须已是终点 route）；allows_custom_base_url = false；
                          note =「浏览器直连，实际可用性待 PSA 验证。」（**未**写已验证 / CORS 已支持）
                          自定义（浏览器直连）预设**保留**，仍 Browser-Direct-Only。
```

### 23.4 真实浏览器冒烟**发现的一处真实文案缺陷**（🔴 v1 → v2 修正）

```
缺陷 : `SETTINGS_BASE_URL_FORBIDDEN` 原文「这个 Provider **只能通过受支持的代理连接访问**，不能填写
       Custom Base URL。」——对 thin_proxy 预设成立，但对**浏览器直连**的 DeepSeek **为假**。
       两个预设渲染同一句 ⇒ 必然有一边被写成假话。
修复 : →「这个 Provider 的访问地址由产品提供，不能填写 Custom Base URL。」（对两类预设同时成立）
性质 : 产品文案缺陷，本轮修复；断言已固化（D4 §10）。
```

### 23.5 变更文件

```
M src/ui/copy.ts                              SETTINGS_OPEN/TITLE = 「设置」；新增 SETTINGS_SECTION_MODEL /
                                              _CLOSE / _CANCEL / _CONNECTION_ROW / _ERRORS_HEADING /
                                              _UNSUPPORTED_HEADING / _UNSUPPORTED_HINT；SETTINGS_SAVE →
                                              「保存配置」；SETTINGS_BASE_URL_FORBIDDEN 改为不写假的连接路径
A src/ui/settings/control-identity.ts         SETTINGS_CONTROL_IDS + captureFocus / restoreFocus（框架中立，
                                              含 M1/M2 根因与「事实性澄清」的完整登记）
M src/ui/settings/provider-presets.ts         DeepSeek 预设收敛为 PSA 候选；allows_custom_base_url 语义说明更正
M src/ui/components/shell.ts                  modelSettings→settingsCenter（header/section/footer + inline 反馈）；
                                              labelInput 改 spec 对象且 id 必填；noticeLine→feedbackBlock
M src/ui/app-root.ts                          焦点规则改为调用 control-identity；**补齐未授权分支的
                                              restoreFocus**；新增 Escape → closeSettings（含卸载）
M src/ui/session/app-session.ts               新增瞬时字段 settings_save_error；三种保存结果分别落位
M src/ui/styles/app.css                       仅 Settings 头部/关闭钮/section/footer 布局（未重做整体 UI）
M src/tests/ui/static-audit.test.ts           API Key password 断言适配新调用形态 + 新增「id 不得由 label 推导」
A src/tests/ui/settings-usability.test.ts     F1–F8 / C1–C6 / S1–S6 / D1–D7 + §4/§5/§19-V1（44 例）
```

### 23.6 验证（🔴 全部实测）

```
typecheck ×5（tsconfig / core / browser / server / web）  = PASS
build（tsconfig.build）                                  = PASS
build:web（144 modules + 1 stylesheet）                  = PASS
npm test                                                = 1015 passed / 0 failed（基线 970；本轮 +45）
npm run test:proxy                                      = 15 passed / 0 failed
Secret Scan（553 个非产物文件）                          = PASS
  命中 27 项**全部**为显式假值 fixture（`sk-fixture-NOT-A-REAL-KEY-0000000000` /
  `sk-fixture-OTHER-*` / `sk-fixture-A|B-*` / `sk-fixture-NOT-A-REAL-KEY-PSA`）与
  `control-identity.ts` 的 `api_key: 'settings-api-key'`（DOM id，非凭据）⇒ **真实 credential = 0**
Visual Smoke（本机真实 Chrome 154.0.8037.57，headless=new，DevTools Protocol）
  · fixture = 仓库 demo-workspace/** 的 %TEMP% **副本**（21 文件）；**未写入**提交基线
  · 🔴 **仅替换 `showDirectoryPicker` 一个函数**（原生选择器无法自动化，句柄为 Chromium 真实 OPFS
    目录句柄）；其余 FSA 读写 / 应用逻辑 / 渲染 / 事件 / **真实键鼠输入**全部为生产代码
  · V1  顶栏 button 集合 = `["设置"]`，hasModelSettingsEntry = **false** ⇒ PASS
  · V2  设置面板打开 ⇒ PASS
  · V3  `#settings-close` = 「×」(aria-label 关闭) + `#settings-cancel` = 「取消」；× 点击后面板关闭 ⇒ PASS
  · A（**根因路径**：尚未选工作区时）逐字符输入 Model 14 字符，**逐字符** `activeElement.id === "settings-model"`，
       值完整 ⇒ PASS（M1 修复的真实浏览器证据）
  · V4/V5/V6 先清空再逐字符输入：Model 14 / Base URL 41 / API Key 29 字符，**逐字符**焦点与 caret 均在本字段，
       末尾 `selectionStart === selectionEnd === value.length` ⇒ PASS
  · DeepSeek 预设：model = `deepseek-flash`；Custom Base URL 字段**消失**；note 含「实际可用性待 PSA 验证」；
       **不含**「已验证 / CORS 已支持」；**不含**「只能通过受支持的代理连接访问」⇒ PASS
  · V7  点击「保存配置」⇒ 面板关闭，顶栏 badge = `DeepSeek｜deepseek-flash｜连接方式：浏览器直连` ⇒ PASS
  · V8  重新打开 →「取消」关闭 → 再打开 → Escape 关闭，均正常 ⇒ PASS
  · V9  Workspace 保持连接（`已连接本地工作区｜smoke-ws`，左栏 8 条不变）；provider badge 保持 DeepSeek ⇒ PASS
  · V10 **LLM endpoint 请求 = 0**（全量 0；保存窗口内增量 0 条 app 请求；增量仅为杀毒套件自身轮询）
        `console` 未捕获异常 = 0 ⇒ PASS
        （唯一出站来自本机安全套件 `gc.kis.v2.scr.kaspersky-labs.com`，**单独归类**，不计为 Provider Calls）
  · 证据：%TEMP%\psa-blocker01-smoke\out\（smoke-report.json + 7 张截图 + secret-scan.json）
        🔴 探针 v1 的 4 个 FAIL **全部**是探针自身断言错误（值未先清空 / 徽章含工作区名 / 未记录增量 URL），
        不是产品缺陷；v2 已逐项修正并如实登记。
```

### 23.7 边界登记（🔴 本轮未做）

```
❌ 未改：D9 产品机制 / Retrieval / EvidenceRef / Attempt schema / Workspace schema / source_type / 冻结合同
❌ 未新增 Decision / AC / CCR；未改 `AC` 口径
❌ **未**开始真实 Provider 调用（0 次）；**未**开始 PSA；**未**部署 Vercel
❌ 未实现 §14 的 API Key「显示 / 隐藏」toggle（任务标注为非强制，且会引入新的会话状态，故不做）
❌ 未实现 Generic Arbitrary URL Proxy；自定义 Base URL 仍为 Browser-Direct-Only
❌ 未做整体 UI redesign（仅 Settings 必要的 header/section/footer 布局）
❌ DeepSeek 的 CORS / 真实响应 / JSON 输出 —— 全部 **PENDING REAL PSA**（本任务只落地配置候选）
❌ 真实浏览器**人工**验收（真实目录句柄 + 权限生命周期）—— 仍 PENDING PSA
```

🔴 **本节追加禁写项**：不得把 `deepseek-flash` / 固定 endpoint 写成「已验证 / 可用 / CORS 已支持 /
Browser Direct 已通过」；不得把本轮 providerless 视觉冒烟写成「真实浏览器人工验收已通过」/「Chrome / FSA
verified」；不得写「PSA 已通过」「Real Provider Verified」「Vercel 已部署」；不得把 `setting_save_error`
说成新的持久状态；不得把 M2（label 派生 id）写成「当时确实产生了重复 id 并因此掉焦点」——那是**推断**，
已观测到的机制是 M1。

```
SAFE NEXT = PRE-SUBMISSION PSA-A
            ｜ Real Chrome + Real Workspace FSA + DeepSeek Browser Direct
            ｜ TE-DEMO-LIVE-01 Full Rehearsal
            ｜ Billing Cap ≤ RMB 1
🔴 未授权自动启动 —— 本次完成后停止（不得自动使用真实 API Key / 不得自动开始 PSA）
```

### 23.8 CORRECTION-01 ｜ SESSION CREDENTIAL REFRESH COPY ALIGNMENT（🚩 `PRE-PSA-BLOCKER-01 / CORRECTION-01`，2026-09-26｜🔴 追加，不改写历史）

> 触发 = 人工截图发现 API Key 下方文案与已 `CONFIRMED` 的 `D-056` 正式语义冲突。
> 🔴 **本节只做追加，不改动 §23.1–§23.7 及之前任何一字。**

```
CORRECTION-01                     = DONE
Session Credential Implementation = PASS（= A：session-scoped storage；实现与 D-056 一致）
Refresh Credential Retention      = PASS
Settings Copy                     = ALIGNED WITH D-056
Old Wrong Copy                    = ABSENT
Real Provider Calls               = 0
PSA                               = PENDING
BLOCKER                           = NO
Decision Added = 0   AC Added = 0   CCR = NO   Frozen Contract Modified = NO
```

**① 先核验实现，再改文案（🔴 事实登记：结论 = A，不是 B）**

```
实际载体 = 运行时 sessionStorage（不是纯内存）⇒ 合法 correction，未触发 BLOCKER。
  · src/browser/ai/session-storage.ts —— `createBrowserSessionStorage()` 只读 `globalThis.sessionStorage`，
    实测 write/read/remove round-trip 通过才信任；缺 sessionStorage ⇒ **抛错**，**不**回退
    localStorage / IndexedDB / cookie / 文件。
  · src/browser/ai/session-credential-store.ts —— 值落在注入的 session-scoped carrier 上，**不是模块变量**；
    `endSession()` 是显式清空路径（本任务未改）。
  · src/ui/bootstrap.ts:38 —— `createSessionCredentialStore(createBrowserSessionStorage())`：真实接线即浏览器
    sessionStorage。bootstrap 仅在表单确实带 Key 时 `put`，随后把 **store 本身** 作为 `CredentialResolver`
    交给 gateway ⇒ 刷新后表单为空也**不影响** Key 的可用性。
  · src/ui/session/browser-gateway.ts —— 组合 provider 传的是 resolver，请求期由 store 解析 Key。
⇒ 「刷新即丢失」为**假**；旧文案描述的行为与实现相反。
```

**② 文案修正（🔴 本任务唯一被授权的产品改动）**

```
旧 : 「仅当前会话使用。刷新页面后需要重新填写。」      ← 把刷新描述成凭据丢失，与 D-056 相反
新 : 「仅当前浏览器会话使用；刷新后仍可用，关闭标签页或浏览器后需要重新填写。」
性质 : 产品文案缺陷（与 §23.4 同类）；断言已固化（R9 / R10），不得再漂移。
留存 : 旧句在 **recovery baseline（root commit `207902b`）即已存在**，其后无 commit 改动过它；
       原 DAG 已丢失 ⇒ **无法**追溯更早引入点，本节不作推断。
```

**③ 测试（新增 10 例，全部 `IMPLEMENTATION INVARIANT`；🔴 `AC Added = 0`）**

```
A src/tests/ui/session-credential-refresh.test.ts   R1–R10
  R1  保存 session Credential（走**真实** settings 保存路径 + 真实 bootstrap 式接线）
  R2  模拟同一 session 的页面刷新 / 重新构造应用实例（新 Storage 对象 + 新 store + 新 AppSession）
  R3  刷新后凭据仍可读取，值不变
  R4  刷新后 **Key 字段留空** 仍能重新 compose（provider = ready）；且真实组合出的 adapter 用
      **会话里的** Key 组 Authorization 头（mock transport ⇒ 0 真实请求）
  R5  新 browser session（新 backing）读不到，且新 session 无任何 ref
  R6 / R7  localStorage / IndexedDB：工厂被喂 spy 时**一次都不碰**；源码层亦无成员访问
  R8  工作区：保存前后文件集不变，且非空工作区中无一文件含假 Key
  R9  文案含「刷新后仍可用」且该常量**确实由面板无条件渲染**在 API Key 下方（避免"正确但没人渲染"）
  R10 全 `src/ui/**` + `src/browser/**` 的渲染字符串中不含已废弃句
```

**④ 验证（🔴 全部实测）**

```
npm run typecheck / typecheck:core / typecheck:browser / typecheck:server / typecheck:web  = PASS
npm run build / npm run build:web（144 modules + 1 stylesheet）                            = PASS
npm test                                   = 1025 passed / 0 failed（基线 1015；本轮 +10 = R1–R10）
npm run test:proxy                         = 15 passed / 0 failed
Visual Smoke（本机真实 Chrome 154.0.8037.57，headless=new，DevTools Protocol）= PASS（30/30 判据为 true）
  · fixture = `demo-workspace/**` 的 %TEMP% 副本（21 文件）；**未写入**提交基线
  · 🔴 **仅替换 `showDirectoryPicker` 一个函数**；FSA 读写 / 应用逻辑 / 渲染 / 事件 / **真实键鼠输入** /
    **真实 `Page.reload`** 全部为生产代码
  · C1 打开设置 → DeepSeek → 逐字符输入假 Key（29 字符）；面板 note **实测** =
       「仅当前浏览器会话使用；刷新后仍可用，关闭标签页或浏览器后需要重新填写。」
  · C2 保存 ⇒ 面板关闭，顶栏 badge = `DeepSeek｜deepseek-flash｜连接方式：浏览器直连`
  · C3 sessionStorage = `fei.ai.session-credential/provider%3Adeepseek` → 假 Key + `…/index`
  · C4/C5 **`Page.reload` 之后**同一组 key、同一值仍在 ⇒ **刷新保留 = 真实浏览器实测**（R3 的运行时对应项）
  · C6 刷新后重新授权工作区（真实 FSA / OPFS，8 条记录）→ 打开设置 → **Key 字段为空** → 保存成功，
       badge 恢复 `DeepSeek｜deepseek-flash｜连接方式：浏览器直连`
       ⇒ **无需重新填写 Key 即可重新 compose**（R4 的运行时对应项）
  · C7 面板与整页**均不含**已废弃句；面板 body 实测含新句
  · C8 localStorage = `{}`、IndexedDB `databases()` = `[]`、cookie = `""`、caches = `[]`，
       且**均不含**假 Key；工作区扫描 **21 个文件 / 0 命中**（扫描非空）⇒ R6 / R7 / R8 的运行时对应项
  · C9 同浏览器**新开 tab**（= 新 browser session）sessionStorage **完全为空** ⇒ R5 的运行时对应项
  · C10 出站请求合计 309：`llm_endpoint = 0`、`other_external = 0`、页面脚本错误 = 0；
        28 条属装机安全套件 `gc.kis.v2.scr.kaspersky-labs.com`，**单独归类，不计为 Provider Call**
  · 证据：%TEMP%\psa-correction01-smoke\out\（smoke-report.json + 7 张截图，均 > 44KB）
  · ⚠️ 探针 v1 的三次中断**全部是探针自身缺陷**（① 保存早于工作区授权，把产品的合法 unsupported 当成失败；
        ② 三处 `out.shot_x.png = …` 赋值笔误）。**产品缺陷 = 0**；修正后逐项复跑，如实登记。
```

**⑤ 本轮观测到、🔴 未修、待人工裁决的三项（§4 边界之外）**

- ⭐ `ADJACENT-01`｜「清除本次会话的 API Key」按钮**只清空表单字段**，未调用 `store.remove()`。
  事实：`app-session.clearCredential()` 仅 `set({ settings_draft: {…, api_key: ''} })`；bootstrap 在表单为空时**不** `put`，
  于是 gateway 组合后仍由 sessionStorage 解析出**旧 Key** ⇒ 按钮文案与效果不一致。
  性质：属 `D-056` **之外**的另一个保证（显式移除），故**不并入**本 correction；**未修**。
- ⭐ `ADJACENT-02`｜刷新后 Key 字段为空时，面板同时显示「请填写 API Key（仅当前会话使用）。」
  事实：`settingsWarnings()` 只看**表单字段**是否为空（真实浏览器已实测到该行与空字段共存）。
  性质：不构成假话，但易被读成「必须重填」；**未修**。
- ⭐ `ADJACENT-03`｜`src/ui/components/shell.ts` 顶部注释把 `M2` 写成了本次症状的原因。
  事实：该注释称 label 派生 id「produced duplicate ids … and made the whole-tree rebuild lose the user's focus
  on every keystroke」；而 `control-identity.ts` 与 §23.2 的**已确认口径**是「实际发布的 label 为 ASCII、
  **当时并未相撞**、M2 未被确立为原因，只有 M1 是」。
  性质：与 §23.7 的**已登记禁写项**直接冲突；属 §23 既有产物的改写 ⇒ **未修**，仅登记，等人工授权。

**⑥ Git（🔴 事实登记）**

```
fix commit = 8c7cd2fa0ee3b339dd43a2c965ba0374e88e6c0d
  message  = 「fix: align session credential refresh behavior with D-056」
  files    = 3（A src/tests/ui/session-credential-refresh.test.ts +498 /
              M src/ui/copy.ts ±23 / M src/ui/components/shell.ts ±5）
  force    = **未使用**（🔴 禁止 force）
  push     = PASS —— 首次尝试报 `schannel: failed to receive handshake, SSL/TLS connection failed`
             （**环境侧 TLS 瞬时失败，非 repo 缺陷**）；**原样重试**后成功，未改动任何历史
  remote   = refs/heads/main = 8c7cd2fa0ee3b339dd43a2c965ba0374e88e6c0d（`git ls-remote origin` 实核）
  local/remote = MATCH
本节的 handoff 记录与 session memory 由紧随其后的 `chore:` commit 记录（不改动上述 fix commit）。
```

🔴 **本节追加禁写项**：不得把本 correction 写成「实现与 `D-056` 冲突」（实测为 A）或「刷新后需要重新填写仍成立」；
不得把 `ADJACENT-01` / `-02` / `-03` 写成已修；不得把本轮的 providerless 视觉冒烟写成「真实浏览器人工验收已通过」；
不得把 DeepSeek 候选配置写成「已验证 / 可用 / CORS 已支持 / Browser Direct 已通过」；不得改写 §23.1–§23.7 任何一字。

```
SAFE NEXT = PRE-SUBMISSION PSA-A
            ｜ Real Chrome + Real Workspace FSA + DeepSeek Browser Direct
            ｜ TE-DEMO-LIVE-01 Full Rehearsal
            ｜ Billing Cap ≤ RMB 1
🔴 未授权自动启动 —— 本次完成后停止（不得自动使用真实 API Key / 不得自动开始 PSA）
```

### 23.9 CORRECTION-02 ｜ CREDENTIAL CLEAR SEMANTICS + REFRESH UX + COMMENT ALIGNMENT（🚩 `PRE-PSA-BLOCKER-01 / CORRECTION-02`，2026-09-26｜🔴 追加，不改写历史）

> 🔴 **本节只做追加，不改动 §23.1–§23.8 及之前任何一字**（§23.8 登记的 `ADJACENT-03` 在本节记录为**已修**，§23.8 原文保持原样）。
> 性质 = same-session blocker correction：**未新增任何产品机制**，只把两个**已命名**的行为变真，并修正注释口径。

```
PRE-PSA-BLOCKER-01 / CORRECTION-02 = DONE
Credential Clear Semantics         = CLOSED
Clear Removes Stored Credential    = PASS
Refresh Existing-Key UX            = CLOSED
Key Plaintext Rehydration          = ABSENT
Focus Root Cause Comment Alignment = CLOSED
Real Provider Calls                = 0
PSA                                = PENDING
Decision Added = 0   AC Added = 0   CCR = NO   Frozen Contract Modified = NO   BLOCKER = NO
```

**① ADJACENT-01｜清除按钮真的清除（§1 / §2）**

```
缺陷（§23.8 已登记）：`clearCredential()` 只 `set({ settings_draft: {…, api_key: ''} })` ⇒ 只清表单；
  bootstrap 在表单为空时不 `put`，gateway 仍由 sessionStorage 解析出**旧 Key** ⇒ 按钮文案 ≠ 行为。
修复：把 credential store 的**非机密**两面交给 AppSession（`AppSessionDeps.credentials`，`CORRECTION-02`）：
  · `has(provider_id): boolean`   —— 面板据此停止索要「其实已经有的 Key」；
  · `clear(provider_id): void`    —— 按下按钮时**移除该 provider 的凭据**。
  🔴 **无 `resolve`、无 `put`**：secret 不进 UI 层，明文无从回填（§4）。
  🔴 ref 一律由 `credentialRefForProvider(provider_id)` 推导（`bootstrap.ts` 内），**不遍历、无「清空全部」**⇒ 碰不到别的 provider。
连带（§2）：清除后 **`port = null` + `provider.status = 'unconfigured'`**（复用既有 canonical 状态与
  `SETTINGS_STATUS_UNCONFIGURED`「模型服务未配置」，**未新造状态**）；命令路径随之走既有 `ai_requires_model`；
  `read_port` 与 `workspace` **不动**（浏览历史记录不受影响）。
```

**② ADJACENT-02｜刷新后「已有 Key」的呈现（§3）**

```
新增 **一条** 文案 `SETTINGS_KEY_PRESENT_IN_SESSION` =
  「当前浏览器会话已有 API Key，可直接保存配置；如需替换，请重新输入。」
规则（`settingsWarnings(draft, { session_credential_present })`，纯函数，仍**非阻断**）：
  表单有 Key            ⇒ 无提示
  表单为空 + 会话有 Key  ⇒ 「当前浏览器会话已有 API Key…」（**替代**原文案）
  表单为空 + 会话无 Key  ⇒ 原「请填写 API Key（仅当前会话使用）。」
事实来源 = 新增**布尔**状态 `settings_key_in_session`（开面板 / 切 provider / 保存 / 清除 四处刷新）——
  🔴 只存**布尔**，不存 Key；`api_key` 输入在刷新后**保持为空**（§4，明文回填 = ABSENT）。
```

**③ ADJACENT-03｜注释口径对齐（§7，🔴 只改注释，不改行为）**

```
口径（= §23.2 已确认结论）：
  Observed root cause      = 未授权 render path `replaceChildren` 后 **early return → restoreFocus 未执行**（M1）
  Control identity         = **preventive hardening**（label 派生 id 是潜在重复 id 制造器；实际发布的 label 为 ASCII，**当时并未相撞**）
修正 3 处把「重复 control id」写成本次症状根因的源码注释：
  M src/ui/app-root.ts         头注释改为**两条事实分开陈述**（observed cause / preventive hardening）
  M src/ui/components/shell.ts 头注释 + `LabelInputSpec` 注释同样改为分开陈述
  （`src/ui/settings/control-identity.ts` 原文已含 FACTUAL PRECISION 段，**未改**）
🔴 `D-056` / `Decision` / `AC` / 冻结合同**均未改动**；Handoff **只追加本节**。
```

**④ 测试（新增 16 例，全部 `IMPLEMENTATION INVARIANT`；🔴 `AC Added = 0`）**

```
A src/tests/ui/session-credential-clear.test.ts（K1–K10 + U1–U10 + N1–N3）
  K1 保存 DeepSeek 假 Key｜K2 `has` = true｜K3 clear 后 `has` = false｜K4 `resolve` = null｜K5 input = ''｜
  K6 provider 不再 ready（= `unconfigured`，且命令路径回到 `ai_requires_model`）｜K7 Workspace 仍 connected 且
  **授权次数恒为 1**（未重选目录）｜K8 预存的**其它 provider** 凭据不被删除｜K9 clear 后同一 adapter
  **拒绝发送**（`PROVIDER_CREDENTIAL_MISSING`，transport 调用数不增 ⇒ 不可能带旧 Authorization）｜
  K10 clear → 输入新 Key → 恢复 ready，且仍是**单个** credential slot
  U1–U5 保存 / 同 tab 刷新 / 凭据存活 / 字段为空 / 会话有凭据｜U6 **不**出现「请填写 API Key」｜U7 出现「已有 Key」句｜
  U8 明文回填 ABSENT（运行期 state 无 Key + `src/ui/**` **无** `.resolve(` / `revealCredentialSecret` / `credentialSecret`）｜
  U9 空字段直接保存成功｜U10 新 Key **精确覆盖**（整值比较，非 substrings）
  N1–N3 新 tab：凭据不存在、要求填写 Key、且**不**声称已有 Key
M src/tests/ui/session-credential-refresh.test.ts  harness 补上同一个 two-method port（保持与 bootstrap 一致）
```

**⑤ 验证（🔴 全部实测）**

```
npm run typecheck / typecheck:core / typecheck:browser / typecheck:server / typecheck:web  = PASS
npm run build / npm run build:web（144 modules + 1 stylesheet）                            = PASS
npm test                     = **1041 passed / 0 failed**（基线 1025；本轮 +16 = K/U/N）
npm run test:proxy           = 15 passed / 0 failed
Secret Scan（555 个非产物文件）= PASS —— 34 命中：32 条为显式假值 `sk-fixture-*`；
  另 2 条为 `api_key: 'settings-api-key'`（**DOM 控件 id**，非凭据）⇒ **真实 credential = 0**（如实登记分类口径）
Visual Smoke（本机真实 Chrome 154.0.8037.57，headless=new + CDP）**A–L 全 PASS（36/36 判据 true）**
  · fixture = `demo-workspace/**` 的 %TEMP% 副本（21 文件）；**未写入**提交基线
  · 🔴 **仅替换 `showDirectoryPicker` 一个函数**；FSA 读写 / 应用逻辑 / 渲染 / 事件 / **真实键鼠输入** /
    **真实 `Page.reload`** 全部为生产代码
  · A 配置 DeepSeek + 逐字符输入假 Key（29 字符）→ 保存 ⇒ 面板关闭，badge = `DeepSeek｜deepseek-flash｜连接方式：浏览器直连`
  · B 刷新 ⇒ `#settings-api-key` 值 **= ""**（input 为空）；sessionStorage 仍有该凭据
  · C 设置面板**实测**出现「当前浏览器会话已有 API Key，可直接保存配置；如需替换，请重新输入。」，
        且**不含**「请填写 API Key」⇒ 刷新后的假提示 = ABSENT
  · D **不重新输入 Key** 直接保存 ⇒ 面板关闭、badge 恢复 ⇒ 会话里的 Key 被真正使用
  · E 点击「清除本次会话的 API Key」⇒ sessionStorage **只剩** `…/index = "[]"`（`…/provider%3Adeepseek` **已消失**）
  · F 顶栏模型状态 = 「模型服务未配置」（**不再**出现 DeepSeek / 浏览器直连）；Workspace 仍 `已连接本地工作区｜smoke-ws`
  · G 重新打开设置 ⇒ **无**「已有 Key」提示；面板改为「请填写 API Key（仅当前会话使用）。」⇒ H 的提示成立
  · I 输入新假 Key `sk-fixture-NOT-A-REAL-KEY-PSA-2` → 保存 ⇒ badge 恢复，且该 provider **只有一个** slot（整值 = 新 Key）
  · J Workspace **8 条记录全程保留**（A/B/D/F/I 各检查点均为 8）
  · K 出站请求合计 317：**`llm_endpoint = 0`**、`other_external = 0`、页面脚本错误 0；
        36 条属装机安全套件 `gc.kis.v2.scr.kaspersky-labs.com`，**单独归类，不计为 Provider Call**
  · L `localStorage = {}`、IndexedDB `databases() = []`、`caches = []`、cookie `""`；工作区扫描 **21 文件 / 0 命中**；
        sessionStorage 内**唯一**的 provider slot 值 = 当前 Key（整值比较）⇒ fake Key 未进入任何持久载体
  · 证据：%TEMP%\psa-correction02-smoke\out\（smoke-report.json + 8 张截图，均 > 147KB）
  · ⚠️ 探针 v1 的 2 个 FAIL **全部是探针自身断言错误**（① 把 `…/index` 记账键当成凭据残留；
        ② `…-PSA` 是 `…-PSA-2` 的**前缀**，误用 substring 比较）⇒ **产品缺陷 = 0**；修正后复跑得 36/36。
```

**⑥ Git（🔴 事实登记）**

```
fix commit = 8c146f2c2ceb0254a986df5482007ca43a80d129
  message  = 「fix: make session credential clearing truthful before PSA」
  files    = 8（A src/tests/ui/session-credential-clear.test.ts +562 /
              M src/ui/session/app-session.ts +126 / M src/ui/components/shell.ts ±30 /
              M src/ui/settings/provider-presets.ts ±27 / M src/ui/copy.ts +26 /
              M src/ui/bootstrap.ts ±23 / M src/tests/ui/session-credential-refresh.test.ts +10 /
              M src/ui/app-root.ts ±9）
  force    = **未使用**（🔴 禁止 force / force-with-lease）
  push     = PASS（首次即成功）
  remote   = refs/heads/main = 8c146f2c2ceb0254a986df5482007ca43a80d129（`git ls-remote origin` 实核）
  local/remote = MATCH
本节的 handoff 记录与 session memory 由紧随其后的 `chore:` commit 记录（不改动上述 fix commit）。
```

**⑦ 本轮新观测、🔴 未修、待人工裁决（§4 之外）**

- ⭐ `ADJACENT-04`｜**清除后再次「保存配置」可把 badge 重新变回 ready**（即使没有 Key）。
  事实（真实浏览器实测 + `O1` 记录）：清除后 provider = `unconfigured`（符合 §2）；但若用户再次点「保存配置」且
  **不填 Key**，`validateSettingsDraft` 按**既有刻意规则**不把缺 Key 视为阻断 ⇒ 组合成功、badge 回到
  `DeepSeek｜deepseek-flash｜浏览器直连`，而会话中**没有**该凭据（真发请求会以 `PROVIDER_CREDENTIAL_MISSING` 失败，K9 已证）。
  冲突点：这与 §2「不得继续伪装 ready」的**意图**存在张力，但**改掉它等于修改产品语义**——
  `provider-presets.ts` 明确写着「A missing API KEY IS NOT A BLOCKING ERROR」（缺 Key 也要能读工作区）。
  ⇒ 🔴 **未修，等人工裁决**。候选：(a) 保持现状（badge 只表示「有受支持的组合」）；(b) 缺 Key 时把保存判为阻断；
  (c) 缺 Key 时允许保存但 badge 改为「已配置（未提供 API Key）」之类的**新状态**（= 新产品机制，需 Decision）。

🔴 **本节追加禁写项**：不得写「清除按钮本来就调用 store.remove」；不得把 `ADJACENT-04` 写成已修或不存在；
不得把本轮 providerless 视觉冒烟写成「真实浏览器人工验收已通过」/「Chrome / FSA verified」；
不得把 DeepSeek 候选配置写成「已验证 / 可用 / CORS 已支持」；不得把「明文 Key 未回填」写成「已加密存储」；
不得改写 §23.1–§23.8 任何一字（`ADJACENT-03` 的修复只在本节记录）。

```
SAFE NEXT = PRE-SUBMISSION PSA-A
            ｜ Real Chrome + Real Workspace FSA + DeepSeek Browser Direct
            ｜ TE-DEMO-LIVE-01 Full Rehearsal
            ｜ Billing Cap ≤ RMB 1
🔴 未授权自动启动 —— 本次完成后停止（不得自动使用真实 API Key / 不得自动开始 PSA）
```

### 23.10 CORRECTION-03 ｜ CREDENTIAL-REQUIRED MODEL CONFIGURATION SAVE GATE（🚩 `PRE-PSA-BLOCKER-01 / CORRECTION-03`，2026-09-26｜🔴 追加，不改写历史）

> 人工决策 = **`PSA-D2 = B`（CONFIRMED）**：没有可用 Credential 时，不得把模型服务保存为已配置。
> 🔴 **本节只做追加，不改动 §23.1–§23.9 及之前任何一字**（§23.9 登记的 `ADJACENT-04` 在本节记录为 **CLOSED**，§23.9 原文保持原样）。
> 🔴 这是 **PSA 前最后一个 Settings 语义修复**；`PRE-PSA-BLOCKER-01` 至此 **CLOSED**，不再衍生普通产品修复。

```
PSA-D2 = CONFIRMED（B）                     Missing Credential Save Gate = CLOSED
No Credential → Ready            = FORBIDDEN
Session Credential + Empty Input = SAVE ALLOWED
Typed Credential                 = SAVE ALLOWED
Providerless Workspace Browse    = UNCHANGED
ADJACENT-04                      = CLOSED
Real Provider Calls = 0   PSA = PENDING   BLOCKER = NO
Decision Added = 0   AC Added = 0   CCR = NO   Frozen Contract Modified = NO
State Drift = NONE（开工 HEAD = remote main = 53f82d66e60adebdee38cc2388a588c695e3a186；工作树 CLEAN）
```

**① 被收敛的规则（🔴 明确 SUPERSEDE，不改写历史）**

```
旧实现假设（见 §23.9 及 `provider-presets.ts` 原文）：
  「A missing API KEY IS NOT A BLOCKING ERROR」——缺 Key 不阻断**保存模型配置**。
新规则（`PSA-D2 = B`，人工正式裁决）：
  credential_available = typed_api_key_present OR session_credential_present
  两者皆无 ⇒ **拒绝保存**：不 compose、不关面板、provider 保持 unconfigured、顶栏保持「模型服务未配置」。
🔴 `PSA-D2` **supersedes** 前者**仅限「保存模型配置」**这一动作；
   🔴 **「缺 Key 不阻断 Workspace 浏览」仍然成立**（`S01-06-D1` 未变，见 ④）。
```

**② 实现位置（§10：在保存阶段拦住，不塞进 Adapter）**

```
M src/ui/settings/provider-presets.ts
   · 新增 `CredentialPresence { session_credential_present?: boolean }`（校验器保持**纯函数**，自己不读 store）；
   · `validateSettingsDraft(draft, options)` 新增 `draft.api_key 空 && session_credential_present !== true`
     ⇒ 追加 `SETTINGS_KEY_REQUIRED`（**阻断理由**）；
   · `providerConfigOf(draft, options)` 透传同一事实；
   · `settingsWarnings(draft, options)` **收窄为只剩正向**：仅「会话已有 Key」时给 `SETTINGS_KEY_PRESENT_IN_SESSION`，
     否则返回 `[]`（缺 Key 已升级为阻断，不再重复出现在 advice 块）。
M src/ui/session/app-session.ts   `composeGateway()` 在建 config / 调用 gateway **之前**应用同一校验 ⇒ 自然落入既有
                                  outcome A（`settings_errors` + 面板保持打开）。**未新增任何状态**。
M src/ui/components/shell.ts      面板把同一 credential 事实同时交给 blocking 与 advice 两个块。
M src/ui/copy.ts                  `SETTINGS_KEY_REQUIRED` 注释改为「阻断理由」；`SETTINGS_KEY_PRESENT_IN_SESSION`
                                  注释改为「唯一仍属 advice 的凭据文案」。
🔴 **未改**：`ProviderAdapter` / `BrowserDirectAdapter` / Credential Store schema / Workspace schema / Attempt schema /
   冻结合同。Adapter 层的 `PROVIDER_CREDENTIAL_MISSING` 作为**最后一道 runtime defense 保留**（G13 断言）。
```

**③ 新增测试（12 例，全 `IMPLEMENTATION INVARIANT`；🔴 `AC Added = 0`）**

```
A src/tests/ui/session-credential-save-gate.test.ts
  G1 无 typed Key + 无 session credential ⇒ 保存被拒、`settings_open = true`
  G2 provider.status = `unconfigured`（**未新增状态**）
  G3 缺 Key 理由出现在**面板内**（并静态断言面板确实渲染 blocking 块）
  G4 未 compose gateway（计数不变）｜G5 Provider call = 0
  G6 **清除后直接保存仍被拒**（本任务核心回归）｜G7 顶栏仍「模型服务未配置」
  G8 刷新后字段为空 + 会话有 Key ⇒ **允许保存并通过**
  G9 本次输入新 Key（会话无凭据）⇒ 允许保存并通过
  G10 新 Key **精确覆盖**旧 Key（整值比较；单 slot）
  G11 无 Provider / 无 Key 时 Workspace 仍可列出记录（真实 read composition + 已 seed 语料）
  G12 被拒保存与成功保存**都不会重选目录**（授权计数恒为 1）
  G13 Adapter 运行时 `PROVIDER_CREDENTIAL_MISSING` 防线**仍在**
  G14 未新增 Provider 状态（status 联合仍是三值；四个被禁名全树 0 命中）
M src/tests/ui/settings-usability.test.ts  S1 / S2 的 `settings_errors` 期望加入 `SETTINGS_KEY_REQUIRED`（§13 语义收敛，非回归破坏）
M src/tests/ui/wiring.test.ts              §14 改为**按顺序展示两种拒绝**：先凭证门（unconfigured），给 Key 后才是 unsupported
M src/tests/ui/session-credential-clear.test.ts   N2 改为断言「阻断理由含请填写 API Key」；U6 追加「此状态下 blocking 必须为空」
M src/tests/ui/session-credential-refresh.test.ts / `session-credential-clear.test.ts` 的 `providerConfigOf(空字段)`
                                            显式传入 `{ session_credential_present: true }`（该事实在当时为真）
```

**④ 验证（🔴 全部实测）**

```
npm run typecheck / typecheck:core / typecheck:browser / typecheck:server / typecheck:web  = PASS
npm run build / npm run build:web（144 modules + 1 stylesheet）                            = PASS
npm test                     = **1053 passed / 0 failed**（基线 1041；本轮 +12 = G）
npm run test:proxy           = 15 passed / 0 failed
Secret Scan（556 个非产物文件）= PASS —— 40 命中：37 条为显式假值 `sk-fixture-*`；另 3 条为
  `api_key: 'settings-api-key'`（**DOM 控件 id**，其中 2 条是 handoff 自身引用）⇒ **真实 credential = 0**
Visual Smoke（本机真实 Chrome 154.0.8037.57，headless=new + CDP）**A–M 全 PASS（43/43 判据 true）**
  · fixture = `demo-workspace/**` 的 %TEMP% 副本（21 文件）；**未写入**提交基线
  · 🔴 **仅替换 `showDirectoryPicker` 一个函数**；FSA 读写 / 应用逻辑 / 渲染 / 事件 / **真实键鼠输入** /
    **真实 `Page.reload`** 全部为生产代码
  · A 选择 Workspace ⇒ 8 条 Demo 可见｜B 选 DeepSeek｜C Key 保持空
  · D **不填 Key 点保存** ⇒ 面板**不关闭**、「还不能保存 / 请填写 API Key（仅当前会话使用）。」**面板内**可见、
       badge = 「模型服务未配置」、sessionStorage 无凭据 ⇒ **核心要求达成**
  · E 输入假 Key → 保存 ⇒ 面板关闭、badge = `DeepSeek｜deepseek-flash｜连接方式：浏览器直连`、凭据落 sessionStorage
  · F 点「清除本次会话的 API Key」⇒ badge = 「模型服务未配置」、凭据 slot 消失（index = `[]`）
  · G **清除后不填 Key 再次保存** ⇒ 面板保持打开、缺 Key 提示仍在、badge 仍「模型服务未配置」、
       **未再出现假 ready** ⇒ `ADJACENT-04` 的真实浏览器关闭证据
  · H 输入 `sk-fixture-NOT-A-REAL-KEY-PSA-2` → 保存 ⇒ badge 恢复，且该 provider **只有一个** slot（整值 = 新 Key）
  · I 刷新 ⇒ 凭据仍在｜J 重开面板：Key 字段为空 + 显示「当前浏览器会话已有 API Key…」且**不再**索要 Key
  · K **不重新输入 Key 直接保存** ⇒ 成功 ⇒ 刷新路径未被误伤
  · L Workspace **8 条记录全程保留**（A/E/G/末次各检查点均为 8）
  · M 出站请求合计 312：**`llm_endpoint = 0`**、`other_external = 0`、页面脚本错误 0；
       31 条属装机安全套件 `gc.kis.v2.scr.kaspersky-labs.com`，**按 host 单独归类，不计为 Provider Call**
  · L（载体）`localStorage = {}`、IndexedDB `databases() = []`、`caches = []`、cookie `""`；工作区扫描
       **21 文件 / 0 命中**；sessionStorage 内**唯一** provider slot 值 = 当前 Key（整值比较）
  · 证据：%TEMP%\psa-correction03-smoke\out\（smoke-report.json + 8 张截图，均 > 147KB）
  · ⚠️ 探针 v1 的 1 个 FAIL **是探针自身断言错误**（把 `…/index` 记账键当成凭据残留）⇒ **产品缺陷 = 0**；修正后复跑 43/43。
```

**⑤ Git（🔴 事实登记）**

```
fix commit = 7ce1b852a61b26f4dd5bc630f605a486a4dc8353
  message  = 「fix: require a usable credential before model configuration is ready」
  files    = 9（A src/tests/ui/session-credential-save-gate.test.ts +485 /
              M src/ui/settings/provider-presets.ts +80 / M src/ui/session/app-session.ts ±21 /
              M src/tests/ui/settings-usability.test.ts ±24 / M src/ui/copy.ts ±22 /
              M src/ui/components/shell.ts ±14 / M src/tests/ui/wiring.test.ts +12 /
              M src/tests/ui/session-credential-clear.test.ts ±46 /
              M src/tests/ui/session-credential-refresh.test.ts ±3）
  force    = **未使用**（🔴 禁止 force / force-with-lease）
  push     = PASS（首次即成功）
  remote   = refs/heads/main = 7ce1b852a61b26f4dd5bc630f605a486a4dc8353（`git ls-remote origin` 实核）
  local/remote = MATCH
本节的 handoff 记录与 session memory 由紧随其后的 `chore:` commit 记录（不改动上述 fix commit）。
```

**⑥ 边界登记（🔴 本轮未做 / 不越界）**

```
❌ 未新增 Provider 状态（无 `configured_missing_key` / `credential_required` / `partial_ready` / `auth_pending`）
❌ 未改 `ProviderAdapter` / `BrowserDirectAdapter` / Credential Store schema / Workspace schema / Attempt schema / 冻结合同
❌ 未把规则塞进 `BrowserDirectAdapter.execute()`（§10）—— 保存阶段即拦住，adapter 只留最后一道 runtime defense
❌ 未新增 Decision / `AC` / `CCR`；`PSA-D2` 是**人工已决**事项，本节只**登记**其落地，不自行升级
❌ 未开始真实 Provider 调用（0 次）；未开始 PSA；未部署 Vercel；未使用真实 API Key
❌ 未改动 §23.1–§23.9 任何一字
```

🔴 **本节追加禁写项**：不得把本轮写成「新增了 Credential 校验机制」（只是把**已决**规则落到保存门槛）；
不得写「缺 Key 现在也阻止 Workspace 浏览」；不得把 `ADJACENT-04` 写成 OPEN；不得把 `PSA-D2` 写成 AI 自行决定；
不得把本轮 providerless 视觉冒烟写成「真实浏览器人工验收已通过」/「Chrome / FSA verified」；
不得把 DeepSeek 候选配置写成「已验证 / 可用 / CORS 已支持 / Browser Direct 已通过」；
不得写「PRE-PSA-BLOCKER-01 之后仍可继续追加普通产品修复」——该任务已 CLOSED。

```
PRE-PSA-BLOCKER-01 = CLOSED
SAFE NEXT = PRE-SUBMISSION PSA-A
            ｜ Real Chrome
            ｜ Real Workspace FSA
            ｜ DeepSeek Browser Direct
            ｜ TE-DEMO-LIVE-01 Full Rehearsal
            ｜ Billing Cap ≤ RMB 1
🔴 未授权自动启动 —— 本次完成后停止（不得自动输入真实 Key / 不得自动启动真实 Provider / 不得自动开始 PSA）
```

---

## 24. FINAL-RAPID-INTEGRATION-01 ｜ MERGE PARALLEL CRITICAL FIXES（🚩 `FINAL-RAPID-INTEGRATION-01`，2026-09-26｜🔴 追加，不改写历史）

> 阶段 = `PRE-SUBMISSION`｜类型 = `Single-owner Integration`（仓库协调 + 跨边界收口）。
> 🔴 **本节只做追加，不改动 §23.10 及之前任何一字**。🔴 `Decision Added = 0`｜`AC Added = 0`｜`CCR = NO`｜
> `Frozen Contract Modified = NO`：本节登记的全部是**实现修复**，不新增产品 `Decision`、不新增 `AC` 编号。
> 🔴 权威序不变：`docs/DECISIONS.md` > `docs/00–09`。

### 24.1 合并登记（🔴 事实登记）

```
BASE (开工 HEAD)      = d3f51e15fb77fb439832a8683e0a09e1ce769aa4（= 开工时远端 refs/heads/main，`git ls-remote` 实核）
预合并工作树          = ` M .gitignore`（唯一改动；见 24.2）
`PRE_PARALLEL_UI_RECOVERY_WIP` stash / patch = **不存在**
     依据：`lb-parallel/PARALLEL_BRIEF.md` §5 `WIP_PATCH = NONE`（`copy.ts` / `presenters/retrieval.ts` 当时 `git diff` 为空，
     **未对任何 worktree 执行过 `git apply`**），且 `git stash list` = 空。
     ⇒ 「先 diff 验证、不得重复 apply」这一条**无可操作对象**；也不存在「C 获得额外 WIP」的差异。
4 路 worker commit（均以 d3f51e1 为唯一 parent）：
  A retrieval        = 11a72f2b0e60e9ec9bfde142ac67ec6194085ad2  fix: batch retrieval dimension judgments        (12 files, +1738/−116)
  B ui-session       = bf996c57aca867c32c0c7a59588044eca07f31be  fix: isolate frontend async state and record operations (8 files, +2180/−172)
  C ui-components    = f3720e5536827f07f51879a46fb5fca02e2a7dc4  fix: align UI buttons with real workflow state  (8 files, +1493/−77)
  D runtime-hardening= 7d7910973d8466770fb70a22e1b88c828350dc91  fix: harden workspace persistence and local build runtime (6 files, +1276/−74)
cherry-pick 顺序      = A → B → C → D（按任务书）
冲突                  = **0**（四棵树职责不重叠：A `src/retrieval/**`｜B `src/ui/session/**` + `app-root` + `presenters/notices`｜
                        C `src/ui/components/**` + `copy` + `presenters/{retrieval,busy}` + `settings/provider-presets`｜D `scripts/**` +
                        `src/workspace/repository/**`）⇒ 无任何文件需要人工取舍，**未删除任何一侧测试**。
```

### 24.2 预合并的 `.gitignore` 收口（🔴 人工裁决 ④ 的落地，不是新决定）

```
事实 : `lb-parallel/PARALLEL_BRIEF.md` §4.3 —— 主工作树的 ` M .gitignore` 是**按人工裁决修复编码损坏**的结果，
       **故意留白未提交**，并**明确留给最终 Integrator**（「worker 不要在主工作树里 `git add .gitignore`」）。
本次 : 作为预合并提交落地 ⇒ `1b00022  chore: repair .gitignore encoding and stop tracking .learnbuddy working memory`（1 file, +14）。
内容 : ① `.learnbuddy/` 由「有意不忽略」改为**有意移出版本库**（依据：`d3f51e1`「Remove something」已删除
         `.learnbuddy/memory/**`，9 文件 / 5136 行）；② 修掉被本地追加的 **UTF-16LE（含 NUL）** 行 —— 该行**不是有效
         ignore 规则**，`.learnbuddy/` 实际仍以 `??` 出现，且把 `.gitignore` 变成 Git 眼中的 binary。
🔴 磁盘上的 `.learnbuddy/**` **未被删除**，仅脱离版本追踪。
🚩 由此产生的**测试冲突**（🔴 跨边界项，见 24.5 第 14 项）：`src/tests/config/tsconfig-layout.test.ts` 原断言
   `.gitignore` **must NOT ignore `.learnbuddy/`** ⇒ 与人工裁决 ④ 直接冲突。处置 = **就地补注 + 改为断言新规则**，
   **保留原断言原文与理由**，未删除该用例。
```

### 24.3 跨边界集成 A｜⑥⑦⑧ 草稿态（`FINAL-RAPID-C` §10 的 `INTEGRATION REQUIRED` = CLOSED）

```
缺陷（C 侧已自陈，C 无权修）: `components/steps.ts` 的 ⑥⑦⑧ 补充输入框是**非受控** input，值只在 DOM 里；
   而 `app-root.ts` **每次状态变化都整树重建** ⇒ 任何无关更新（决定另一条 criterion、notice 到达、pending 翻转）
   都会把节点换成空的，**用户未保存的文本无声消失**。
处置（Integrator 侧，两处）:
  A｜`src/ui/session/app-session.ts`
     + `AppSessionState.hypothesis_criterion_edits: Readonly<Record<string,string>>`（`initialState` 初始化 `{}`）
     + `hypothesisCriterionEditKey(hypothesis_id, slot)` —— **导出**的键构造器（渲染侧与 session 共用**同一条**定义）
     + `AppSession.setHypothesisCriterionEdit(hypothesis_id, slot, value)`（一行 `set`，`setInsightEdit` 的类比）
     + `recordScopedResetPatch` 增加 `hypothesis_criterion_edits: {}` ⇒ 切记录 / 开 ① / 新 capture / 切工作区 /
       工作区丢失 **一律清除**（与 `insight_edits` 同一处、同一次）
     + `addHypothesisCriterion` 在**写入成功**时才 `scope.apply` 删除该键（失败保留，供重试）
  B｜`src/ui/components/steps.ts#userCriterionInput`
     `props: { value: state.hypothesis_criterion_edits[key] ?? '' }` + `on.input → setHypothesisCriterionEdit`；
     **删除** `const value = input.value` 与 `input.value = ''`；把原 `⚠️ INTEGRATION REQUIRED` 注释改写为 `✅ RESOLVED`。
🔴 载体：**仅 session 内存**，`sessionStorage` / `localStorage` / `IndexedDB` 一律未使用（用例 DRAFT-06 断言）。
```

### 24.4 跨边界集成 B｜`sessionStorage` 不可用（D 侧 `INTEGRATION REQUIRED` = CLOSED）

```
缺陷: `src/ui/bootstrap.ts:43` 无 `try/catch` 调用 `createBrowserSessionStorage()`；缺 `sessionStorage`（或存在但
   拒绝写入：隐私模式 / 存储被禁用 / getter 抛错）时该函数**抛错**，`startAppShell` 在 `mountAppShell` **之前**终止
   ⇒ **白屏**：工作区入口、错误说明全部不出现。`bootstrap.ts` 不在 4 路 ownership 任何一位名下 ⇒ 本任务收口。
处置:
  新增 `src/ui/settings/credential-capability.ts`（**框架中立**，故 `tsconfig.test.json` 可编译、可被测试真正执行 ——
     DOM 作用域的 `try/catch` 只能被 grep，无法被运行）：
      + `resolveCredentialCapability(probe) → { kind:'available', store } | { kind:'unavailable', message }`
      + `sessionStorageFor(capability)` / `credentialUnavailableMessage(capability)`
      + `NO_CREDENTIAL_PORT`（`has → false`、`clear → noop`，**什么都不保存**）
  新增文案 `copy.ts#SETTINGS_SESSION_STORAGE_UNAVAILABLE = '当前浏览器会话存储不可用，模型凭据无法安全保存。'`
  改 `src/ui/bootstrap.ts`：① 先探测成**值**；② 端口为 `credentials_wiring?.port ?? NO_CREDENTIAL_PORT`；
    ③ `createGateway` 里 `credentials_wiring === null` ⇒ 早于唯一的 `put` **返回 `unsupported`**
      ⇒ 面板保持打开、`settings_save_error` 承载该句、顶栏留「模型服务未配置」、**永不 `ready`**。
🔴 不变项（`D-056` / 合同 §0.4 D）：**不回退** `localStorage` / `IndexedDB` / cookie / 文件 / 内存当持久 secret；
   探针路径里可触及的载体集合为**空**。🔴 工作区**浏览**不需要凭据（`S01-06-D1`），故仍**可用**。
```

### 24.5 十三项 CLOSED（+ 两项跨边界）｜🔴 全部为**实现修复**，不是新 `Decision` / 新 `AC`

```
 1 Retrieval Worst-case Provider Calls  8 × 4 = 32 → **1**（`FINAL-RAPID-A`：两段式管线 + 单次 batch 判定）
 2 Retrieval Recovery                   CLOSED —— 空 ⑥ 状态提供**开始检索**入口（`CORRECTION-04`），不重跑 ⑤
 3 Async Stale Write                    CLOSED —— 迟到读被 `workspace_epoch` / `selection_epoch` / `read_token` / id 四重门丢弃
 4 Workspace State Isolation            CLOSED —— 记录级状态**一次清除**（`recordScopedResetPatch`），会话级状态不动
 5 Cause Decision Race                  CLOSED —— 每记录一条队列 + 合并脏标记，**最后一个意图获胜**，不丢点击
 6 Attempt-scoped Operation ID          CLOSED —— id 与 ledger key **都带 `attempt_id`**，A 的成功操作无法被当作 B 重放
 7 Cross-provider Secret Carry          CLOSED —— `draftForPreset` 换 provider ⇒ 目标 `default_model` + **空 key**；无明文回填
 8 Fake Retry                           CLOSED —— `retryable` 仅当**真有命令**可跑；否则一律「关闭」（`dismiss` 是真动作）
 9 Notice Wrong-target                 CLOSED —— 恢复动作**作用于 notice 自带的 target**；打不开即 `refused`，不替换成屏上记录
10 Locked CTA                           CLOSED —— ②③④⑤⑧⑨ 一律 `actionOffered(...) && !step.locked`；⑧⑨ 生成控件在 `!step.locked` 内
11 Evidence Mapping                     CLOSED —— 点击项**自己**决定载荷（同/异/未比对），容器级处理器已删除
12 Proxy False-ready                    CLOSED —— `deployment_enabled:false` 的预设**保存阶段即拒绝**，不能 `ready`
13 P2 Hardening Status                  = `FINAL-RAPID-D` 落地：`dist-web/` **整目录清除后重建**（消灭 ghost 产物）；
                                          Attempt 双文件写入改为 best-effort 原子（sidecar 先行、镜像失败回滚 sidecar，
                                          **技术失败码** `PERSISTENCE_ROLLED_BACK` / `PERSISTENCE_CONSISTENCY_ERROR`，
                                          **非产品状态 / 非新 Decision / 非新 AC**，`AC-76` 未动）
14 ⑥⑦⑧ 草稿态（跨边界）                 CLOSED —— 见 24.3
15 `sessionStorage` 不可用（跨边界）      CLOSED —— 见 24.4
```

### 24.6 变更文件（本次 Integration 自身，不含 4 路 worker 的既有产物）

```
M  .gitignore                                 人工裁决 ④：`.learnbuddy/` 移出版本追踪 + 编码修复（= 1b00022）
M  src/tests/config/tsconfig-layout.test.ts   `.gitignore` 不变式改为断言 `.learnbuddy/` **必须**被忽略（就地补注，保留原文）
M  src/ui/session/app-session.ts              + `hypothesis_criterion_edits` / `hypothesisCriterionEditKey` /
                                              `setHypothesisCriterionEdit`；`addHypothesisCriterion` 成功即删键
M  src/ui/components/steps.ts                 受控 ⑥⑦⑧ 输入；`INTEGRATION REQUIRED` → `RESOLVED`
M  src/ui/copy.ts                             + `SETTINGS_SESSION_STORAGE_UNAVAILABLE`
M  src/ui/bootstrap.ts                        凭据能力探测成值 + 不可用时受控 `unsupported`（早于唯一 `put`）
A  src/ui/settings/credential-capability.ts   框架中立的凭据能力模块（可被 Node 测试真正执行）
A  src/tests/ui/hypothesis-draft-state.test.ts        DRAFT-01…DRAFT-06
A  src/tests/ui/session-storage-unavailable.test.ts   CAP-01…CAP-04
A  src/tests/ui/final-integration-scenarios.test.ts   SCN-A-01 … SCN-G-01
```

### 24.7 验证（🔴 全部实测）

```
typecheck  (tsconfig / core / browser / server)      = PASS（4/4，`tsc -p …` exit 0）
typecheck:web (tsconfig.web.json --noEmit)           = PASS
build      (tsconfig.build.json)                     = PASS
build:web  （tsc web emit + scripts/build-web.mjs）    = PASS（147 modules + 1 stylesheet；`dist-web/` 先整目录清除再重建）
npm test                                             = **1144 passed / 0 failed**
    基线 = 1054（main）⇒ 本轮 **> 1054**；合并前四树基线为 1055/1056（唯一失败 = `M16｜D16` CRLF，见 24.8）
npm run test:proxy                                   = 15 passed / 0 failed
git diff --check / diff --cached --check             = 空（无空白 / 无 EOL 大规模 churn）
tracked files                                        = 568｜禁止路径（node_modules/ dist* / .env）命中 = **0**
Secret Scan（tracked 源文件 + 文档，排除二进制）
   · `sk-[A-Za-z0-9_-]{4,}` 命中 54 处 / **19 个不同令牌**，**全部**为显式假值（`sk-fixture-*` / `sk-fixture-OTHER-*` /
     `sk-fixture-UI-*` / `sk-fixture-NOT-A-REAL-KEY-*`）或**非凭据**字符串（`sk-follow-up-question` / `sk-nope`）
   · `Authorization` 出现在 200 个文件，逐类核验为：注释 / 类型名（`ProxyAuthorization*`）/ 工作区状态名
     （`needs_authorization`）/ **唯一**的 `authorization: \`Bearer ${secret}\``（`src/ai/provider/transport.ts:77`，插值）
   ⇒ **真实凭据 = 0**；**硬编码 Authorization 头 = 0**
Real Provider Calls                                  = **0**（无任何真实 Key；fake/mock provider only）
```

### 24.8 🚩 环境限制登记（如实登记，**非产品缺陷**）

```
现象 1｜`M16｜D16`（`demo-baseline-reset`「reset reproduces the committed baseline byte-for-byte」）
  本 worktree 全树 **CRLF**（`core.autocrlf` 未设置 + 仓库无 `.gitattributes`）⇒ 逐文件 `size − LF 行数` 恒等于
  报出的 `actual` 尺寸（seeder 写 LF，检出为 CRLF）。**4 棵并行 worktree 与主仓库皆然，非本轮引入**；
  主仓库 `npm test` 下该用例 **PASS**（主仓库工作树为 LF），故 1144/1144。
  ⚠️ 同一根因的**更危险**后果已由 C/D 侧登记：按 `\n` 切行会保留 `\r`，`indexOf('\n}\n')` **永不命中** ⇒ 负向断言
  退化为空断言。本轮两个新测试文件的源码切片**一律先归一化行尾**并 `assert.ok(end >= 0)` 硬失败。
现象 2｜`npm run build:web` **在后台任务中挂起**（同一条命令在**前台** 7.1s 通过；其两步单独前台运行亦通过）。
  判定 = 执行环境 / 管道问题（该脚本以 `stdio:'inherit'` 派生 `tsc`），**非产品缺陷**。
  处置 = 本轮以**等价的两条命令**分别前台执行并取 EXIT=0 作为证据（未改 `package.json` / 未改脚本）。
```

### 24.9 PSA｜🔴 仍 `INTERRUPTED`，且 **`READY TO RESUME`**

```
PSA-A                      = **INTERRUPTED**（原样保留：步骤 5 已保存、步骤 6 未完成/未观测）
READY TO RESUME            = **YES**（就绪，但**未**重跑）
    依据：本轮把步骤 6 的**实测根因**（调用粒度 32 次串行）收敛为**1 次批量调用**，并给出可复跑的恢复入口；
          `sessionStorage` 不可用不再白屏；⑥⑦⑧ 草稿态不再丢失。
🔴 `PSA-A = PASS` **必须**由**真实 PSA 重新执行**后取得，本轮**不得**代为置为 `PASS`。
🔴 本轮**未**执行任何真实 Provider 调用、**未**使用任何真实 Key、**未**部署 Vercel、**未**自动恢复 PSA。
🚩 就地补注（不改写 `PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md`）｜该登记表 §6 记的 `PSA-A baseline = fc472b0 ＋ bc2b13d
   （HEAD 25ca05e）` 是**本轮合并之前**的基线；本轮 main 已推进到 `ceb993b`。🔴 登记表本身**未被改动**
   （任务只授权 Integrator 更新本文件），**恢复 PSA-A 时应使用哪个 baseline 需人工确认**。
```

### 24.10 边界登记（🔴 本轮未做）

```
❌ 未新增产品 Decision / AC / CCR；未改冻结合同；未改 `docs/DECISIONS.md` 与 `docs/00–09`
❌ 未改 4 路 worker 已提交的**产品语义**（只做了 24.3 / 24.4 两处**跨边界**收口与 24.2 的 prep 落地）
❌ 未使用真实 API Key（0）；未执行真实 Provider 调用（0）；未开始/恢复 PSA；未部署 Vercel
❌ 未新增 `package.json` / 依赖（`node_modules` 未动）
❌ 未为「少冲突」删除任何一侧测试（cherry-pick 冲突为 0；唯一被改的既有用例是 24.2 的 `.gitignore` 不变式，
   且为**就地补注 + 改断言**，不是删除）
```

🔴 **本节追加禁写项**：不得写「PSA-A = PASS」或「PSA 已恢复/已重跑」；不得把 `PSA-A` 从 `INTERRUPTED` 改写为其他状态；
不得把本轮写成「新增了检索机制 / 新增了凭据校验 / 新增了产品状态」（全部是**实现修复**与**已决规则的落地**）；
不得写「真实浏览器人工验收已通过」「Chrome / FSA verified」「Vercel 已部署」「Real Provider Verified」；
不得把 `M16｜D16` 的 CRLF 失败写成产品缺陷或写成已修；不得把 24.8 的 `npm run build:web` 环境现象写成产品缺陷；
不得改写 §24.1–§23.10 任何既有结论一字。

```
FINAL-RAPID-INTEGRATION-01 = DONE（合并 + 跨边界收口 + 落盘 + 推送；push 取证见 §24.11，由紧随其后的 `chore:` commit 记录）
SAFE NEXT = PRE-SUBMISSION PSA-A（**READY TO RESUME**）
            ｜ Real Chrome + Real Workspace FSA + DeepSeek Browser Direct
            ｜ TE-DEMO-LIVE-01 Full Rehearsal
            ｜ Billing Cap ≤ RMB 1
🔴 未授权自动启动 —— 本次完成后停止（不得自动输入真实 Key / 不得自动启动真实 Provider / 不得自动开始 PSA）
```

### 24.11 Git（🔴 事实登记｜本节由紧随其后的 `chore:` commit 记录，不改动 24.1–24.10 任何一字）

```
main 提交序列（自 BASE 起）:
  d3f51e1  Remove something                                            ← BASE（= 开工时 remote main）
  1b00022  chore: repair .gitignore encoding and stop tracking .learnbuddy working memory   ← 预合并 prep（人工裁决 ④）
  c70e6ab  fix: batch retrieval dimension judgments                    ← cherry-pick A（11a72f2）
  1cbd7e2  fix: isolate frontend async state and record operations      ← cherry-pick B（bf996c5）
  9226917  fix: align UI buttons with real workflow state               ← cherry-pick C（f3720e5）
  a45c390  fix: harden workspace persistence and local build runtime    ← cherry-pick D（7d79109）
  ceb993b  fix: integrate final pre-submission correctness fixes        ← 本次 Integration（10 files, +1711/−38）
  <本 chore: commit>  docs: record FINAL-RAPID-INTEGRATION-01 handoff git facts
fix commit  = ceb993b0cb987e826ecfb821576f8737a6980fa8
  message   = 「fix: integrate final pre-submission correctness fixes」
  files     = 10（M 20_INTEGRATION/CODING_START_HANDOFF.md / M src/tests/config/tsconfig-layout.test.ts /
                 A src/tests/ui/final-integration-scenarios.test.ts / A src/tests/ui/hypothesis-draft-state.test.ts /
                 A src/tests/ui/session-storage-unavailable.test.ts / M src/ui/bootstrap.ts /
                 M src/ui/components/steps.ts / M src/ui/copy.ts / M src/ui/session/app-session.ts /
                 A src/ui/settings/credential-capability.ts）
  force     = **未使用**（🔴 禁止 force / --force-with-lease）
  push      = PASS（`git push origin main` exit 0）
remote      = refs/heads/main = ceb993b0cb987e826ecfb821576f8737a6980fa8（`git ls-remote origin refs/heads/main` **实核**）
local HEAD  = ceb993b0cb987e826ecfb821576f8737a6980fa8
local/remote= **MATCH**
🔴 判定同步只看 `git rev-parse HEAD` + `git ls-remote origin refs/heads/main`；
   **不依赖** `origin/main` tracking 状态（本机 remote-tracking ref 无法落盘，见 §21.3 与 §24.8 同类环境限制）。
🚩 push 时 Git 打印若干 `LF will be replaced by CRLF` warning —— 属 `core.autocrlf` 正常工作提示
   （仓库无 `.gitattributes`），**非错误**；blob 内容未受影响（`git diff --check` 为空）。
```



---

## 25. `PSA-A FINAL RUN` ｜ 真实 Chrome ＋ 原生 FSA ＋ DeepSeek Browser Direct（🚩 `PRE-SUBMISSION-PSA-A-FINAL`，2026-09-26｜🔴 追加，不改写历史）

### 25.1 任务性质与边界

纯验收（`Final Real Acceptance Run`）。🔴 **不是开发任务**：本轮**未改**任何源码 ／ copy ／ prompt ／ retrieval ／ UI ／ fixture ／ test；**产品源码改动 = 0**。

### 25.2 baseline 裁决（人工 `CONFIRMED`）

```
PSA-A FINAL RESUME BASELINE = 374f3f497aaad14fa4732860a478a03e6b1db678
PRODUCT FIX COMMIT          = ceb993b0cb987e826ecfb821576f8737a6980fa8
旧 fc472b0 + bc2b13d（HEAD 25ca05e）→ 仅作 PSA-A ORIGINAL / INTERRUPTED BASELINE（保留历史，不得改 PASS）

Baseline Gate（只读）：local HEAD == remote main == 374f3f4…；working tree CLEAN；tracked = 572；禁止路径命中 = 0
🔴 同步判定只看 `git rev-parse HEAD` + `git ls-remote origin refs/heads/main`，**不依赖** `origin/main`
   （本机 `refs/remotes/**` 无法落盘 ⇒ §21.3 ／ §24.8 同类环境限制）。
🔴 计数校正（就地补注）：`MEMORY.md §7` 旧记「tracked = 568」是 `374f3f4` **之前**的测量；在 `374f3f4` 处实测 = **572**。
```

### 25.3 执行结果（一句话）

**`PSA-A FINAL RUN = INTERRUPTED` ｜ `CORRECTION REQUIRED` ｜ `BLOCKER = YES`。**

①→⑦ **全部真跑通**（含 🔴 **⑥ = 1 笔 batch 调用，`32 → 1` 实测成立**；`DEMO-07` 被排除：`eligible_history_count = 7`）；⑧ 的**生成与人工裁决成功**；**⑧ 收口失败 ⇒ ⑨⑩ 不可达 ⇒ `D9 ①→⑩` 未完成**。
逐项证据与哈希 → `PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md §8`；过程记账 → `.learnbuddy/memory/2026-09-26.md` 节 1–12。

### 25.4 🔴 新登记缺陷（🔴 本节**未修**；**未新增任何 `Decision` ／ `AC` ／ `CCR` 编号**）

**缺陷**：`⑧` 的 insight batch 记录**无法在 Windows 上落盘** ⇒ `insights/batches/` 恒为空 ⇒ `insights_generated = false` ⇒ ⑧ 永不 `done` ⇒ ⑨⑩ 锁定。

**现场（真实、稳定复现；18:43:31 与 18:50:48 两次一致）**

```
insights/batches/                                = 空（目录已建、0 条）
insights/operations/…~23insight-generation.json   "status": "in_progress"（mtime 冻结在 18:43:31）
                                                  锚内【已带完整 planned_batch】，但 batch 从未落盘
⇒ 写入序列停在 M8 `applyPlan` 的步骤③（batch 记录）；步骤④（`status: complete`）从未执行
```

**候选根因（`PROPOSED`，推断；已被实测支持）**

`batch_id` 含 `:`（`ATT_…:insight-batch:01M3EN…`）；`persistence.ts#insightBatchPath()` **原样插值、未过路径安全 codec**；而 **Windows 文件名不允许 `:`**。
实测（`%TEMP%` 探针，未触碰产品与工作区）：含冒号名 **create 失败**；`~3A` 编码等价名 **创建成功**。
旁证：operation anchor key 里 `#` 已被编码为 `~23`（§15.4 的既有 reversible codec）⇒ **同一约定已存在于 `M8` ／ `M9`，但 batch 路径未走它**。
⚠️ **未**直接捕获浏览器侧抛出的异常对象 ⇒ 保持 **候选**，🔴 **不得写成已确认根因**。

**✅ 正面行为（保留在结论里，不改变阻塞判定）**：产品**未静默卡死** —— 主动披露 `notice-card notice-runtime`「系统本次没有完成｜写入没有完成，已经写入的部分被保留；用同一次操作重试即可补齐剩余部分」并给出「**重新提炼经验**」按钮（`M8-HARDENING-01` 的「披露部分写入 ＋ 幂等重试」设计在起作用）。⚠️ 但该重试承诺在本环境**可能永不成立**（同名非法文件名会再次失败）。

**🔴 人工裁决（2026-09-26 18:54）= 选择 (a)**：**不**点击「重新提炼经验」；**保持失败 Workspace 与现场不动**，作为**修复前证据**保留。

### 25.5 下一任务（🔴 尚未启动；本轮**不得**自行进入）

**有界 Correction：修复 `M8` insight batch 的**文件路径安全编码**。**

已定位的修复面（🔴 **仅定位，未改**）：

```
persistence.ts#insightBatchPath(batch_id)  →  `${INSIGHT_BATCHES_DIRECTORY}/${batch_id}.json`
                                               ↑ 未编码；应对 batch_id 施加既有 reversible path-safe codec
（对照：operation anchor key 已把 '#' 编成 '~23' ⇒ 同一约定已在 M8 / M9 存在，见 §15.4）
```

**8 项验收口径（人工给定，原文保留）**

1. 含 `:` 的 `batch_id` 可以安全持久化；
2. **不改变逻辑 `batch_id`**；
3. batch 文件名使用**既有 reversible path-safe codec 或等价实现**；
4. operation anchor 中 `planned_batch` **保持逻辑 ID**；
5. retry 使用**同一 operation** 可以从 `in_progress` **补齐 batch 并标 `complete`**；
6. **不重新调用模型**；
7. 修复后用**当前失败 Workspace** 做一次 recovery 验证；
8. 再建立**新的 `PSA-A RESUME` baseline**。

🔴 本轮**未执行**上述任何一项；`PSA-B` 亦**未启动**。

### 25.6 新增环境事实（🔴 影响证据可靠性）

1. **Bash 工具的后台启动不可信**：同一轮内返回 `Running in background with task_id: …`，但 `TaskOutput` 显示
   `Status: failed ／ Duration 728ms`，stderr = ``unexpected EOF while looking for matching `}'``，**且无进程、无产物**
   （`Get-CimInstance` 查不到、输出文件不存在）。若据此假设「观测窗口已打开」，会**安静丢掉整段证据**
   —— 与上一轮 ⑥ 被刷新打断后「观测窗口随进程消失」属同一类故障。
   ✅ 可用替代：`Start-Process -FilePath <node> -ArgumentList … -WindowStyle Hidden`，实测进程真实存活且 5–12 s 内增量落盘。
   🔴 推论：**任何「后台观测器已启动」的断言必须同时有「进程 ＋ 产物」双重实证**，不能只信工具回执。
2. **`ConvertFrom-Json` 在本机对这些证据 JSON 反复静默失败**（`$j.value` 恒为空 ⇒ 解析结果为 `$null`）
   ⇒ 解析证据 JSON 一律走 `Read` 工具或 node，**不用** PowerShell 的 `ConvertFrom-Json`。

## 26. `PSA-A-CORRECTION-M8-PATH-01` ｜ INSIGHT BATCH PATH-SAFE PERSISTENCE + INTERRUPTED RECOVERY（🚩 `PRE-SUBMISSION` 有界 Correction，2026-09-26｜🔴 追加，不改写历史）

> 🔴 **本节只做追加。§1–§25 及之前任何一字**未被修改**；`PSA-A FINAL RUN` 仍为 `INTERRUPTED`。**
> 🔴 本轮**未新增任何 `Decision` ／ `AC` ／ `CCR` 编号**；未改 `Frozen Contract` ／ `Retrieval` ／ `Provider` ／ `UI 架构` ／ `AC` ／ `Demo`。

### 26.1 任务性质与基线

```
任务      = 有界 Correction（单机串行）：修复 M8 insight batch persistence 的 Windows 路径可移植性
Baseline  = d3f1133f11b03bebaa3515451328f36f598657d5
Baseline Gate（只读）：local HEAD == remote main == d3f1133f…；working tree CLEAN ⇒ PASS，无 BASELINE DRIFT
🔴 同步判定只看 `git rev-parse HEAD` + `git ls-remote origin refs/heads/main`，**不依赖** `origin/main`
```

### 26.2 根因（🔴 `CONFIRMED`，**替代 §25.4 的 `PROPOSED`**；证据 = 代码 + 可判别用例 + 现场数据）

```
logical batch_id = `ATT_…:insight-batch:<ULID body>`（`newInsightBatchId`）
physical path 原实现 = `${INSIGHT_BATCHES_DIRECTORY}/${batch_id}.json`  ← **原样插值，未过 codec**
⇒ `:` 是合法逻辑字符、**非法 Windows 文件名**字符
```

**现场数据（冻结工作区 `fei-psa-final-workspace`，只读）**：`insights/batches/` = 0 条；anchor `status = "in_progress"`；anchor 内 `planned_batch.batch_id` 含 `:`；**同一 anchor 的 `operation_key` 把 `#` 编成了 `~23`** ⇒ 同一约定早已存在于 `M8`，唯独 batch 路径没走它。

**§25.4 的保留条件已解除**：本轮**直接捕获了失败面**——修复前构建上真实执行写入路径得到 `received "ATT_…:insight-batch:….json"`，编码期望值为 `ATT_…~3Ainsight-batch~3A….json`。

### 26.3 逻辑 / 物理边界（🔴 本 Correction 的唯一口径）

```
逻辑 batch_id ——【不变】—— domain 对象 ／ batch JSON 内 batch_id ／ operation anchor ／ planned_batch ／ 引用
物理文件名   ——【唯一被改】—— insights/batches/<reversible path-safe encode(batch_id)>.json
读取         ——【不变】—— 只读文件内容里的 batch_id；文件名永不成为业务 ID 真源（§3.2 rule 3 / AC-137）
```

codec：**复用** `src/application/insight/identity.ts` 既有的 reversible `~HH` 编码，并以中性名 `encodePathSafeToken` / `decodePathSafeToken` 绑定**同一函数对象**（不是第二套实现）。`encodeOperationIdToken` 字节级未变 ⇒ 已落盘的 `insights/operations/*.json` **无需迁移**。
🔴 `insightOperationAnchorPath` **故意不加编码**：其入参 `operation_key` 已由 `insightOperationKey` 编好，重复编码会移动既有 anchor 并让待恢复操作失锚。

### 26.4 变更文件

```
M src/application/insight/identity.ts                +28  encodePathSafeToken / decodePathSafeToken（同一函数对象）
M src/application/insight/persistence.ts             +54/-5  insightBatchPath 走 codec；物理布局与边界写入文件头注释
M src/tests/application/workflow/m8-recovery.test.ts  +11  「anchor 命名的 batch 真的存在」改为**按内容**判定（原为硬编码 `…${batch_id}.json`）
A src/tests/application/insight/batch-path-safety.test.ts        PATH-01…PATH-09
A src/tests/application/workflow/m8-batch-path-recovery.test.ts  RECOVERY-01…RECOVERY-06
```

### 26.5 验证（🔴 全部实测）

```
Main Tests   = 1159 passed / 0 failed（基线 1144；本轮 +15）  ← 0 FAIL
Proxy Tests  =   15 passed / 0 failed（基线 15）
typecheck ×5 = PASS（tsconfig / core / browser / server / web --noEmit）
build        = PASS（tsconfig.build.json）
build:web    = PASS（147 modules + 1 stylesheet + index.html；`scripts/build-web.mjs` 在本机沙箱内递归删除 `dist-web` 会**无声终止**，
               故按其自身步骤等价执行：wipe → `tsc -p tsconfig.web.json` → 复制 2 个静态资源）
Secret Scan  = PASS（变更集 5 个文件：`sk-*` ／ `AKIA*` ／ `Authorization` ／ `Bearer` 命中 = 0）
禁止路径     = 0（dist* ／ node_modules ／ .learnbuddy ／ failed workspace ／ recovery-copy 均不在变更集内）
Real Provider Calls = 0（全部用例为 fake/mock provider）
```

**可判别性（🔴 关键证据）**：临时把 `insightBatchPath` 还原为原实现后重建，`batch-path-safety.test.ts` **4/9 失败**、`m8-batch-path-recovery.test.ts` **5/6 失败**（`expected a generated step ⑧ outcome, received "refused"` ／ `batches.length = 0` ／ ⑧ 仍 `current`）——与现场症状逐项一致；恢复修复后全绿。⇒ 用例**不是**因断言宽松而通过。

### 26.6 🔴 浏览器 recovery-copy 验证 = **FAILED**（本节最重要结论）

`§13`／`§14` 要求的真实浏览器 recovery **未通过**。**当前冻结工作区已整目录复制**为 `C:\Users\Red16\Desktop\fei-psa-final-workspace-recovery-copy`（32 文件，逐字节同构；**原始现场未被触碰**）。

**环境**：本机真实 Chrome `154.0.8037.57`（CDP，全新 profile，`--headless=new`）＋ 生产 `dist-web/` 构建 由仓库自身 `scripts/serve-web.mjs` 于 `http://127.0.0.1:5173/` 提供（`.js` = `text/javascript`）。
**替换范围（如实声明）**：**仅替换 `showDirectoryPicker` 一个函数**，返回 Chromium 真实 OPFS 目录句柄（工作区内容按其**原文件名逐字**写入，**未做任何 `:` 替换**——做了就会掩盖被测缺陷）；其余 FSA 读写 ／ 应用逻辑 ／ 渲染 ／ 事件均为生产代码。
**模型服务**：以**配置桩**（`自定义（浏览器直连）` ＋ `http://127.0.0.1:59999/v1/chat/completions` ＋ 显式假值 Key）通过**真实设置面板**保存，使读端口得以装配；该地址为**本机死端口**，任何真实模型调用都不可能到达真实服务商。**真实 Provider 请求 = 0**（CDP `Network.requestWillBeSent` 全量计数，出站 origin 仅 `127.0.0.1:5173` 与装机安全套件 `gc.kis.v2.scr.kaspersky-labs.com`，后者单独归类）。

**结果（逐项）**

```
batches_before            = []                                        ← 复现现场
anchor_before             = in_progress
read_before               = snapshot：insight_batches = 0，insights = 3，actions 含 regenerate_insights
provider / workflow       = composed（应用自身组合根）
regenerateInsights(同一个原始 operation_id)
                          → kind = runtime；value.kind = refused；idempotent_replay = false
                          → notice.code = PERSISTENCE_RECOVERY_BLOCKED（retryable）
batches_after             = []            ← 未落盘
anchor_after              = in_progress   ← 未变 complete
⑧ = current（未 done）；⑨ = locked        ← 与修复前现场一致
```

**逐步骤定位（在真实 FSA 上按 `applyPlan` 的顺序复跑）**

```
① writeOperationAnchor            → ok
② createIfAbsent × 3（planned_records） → **InsightRepositoryError / PLAN_MISMATCH × 3**
   「The same Insight identity already exists with DIFFERENT content.」
③ recordBatchIfAbsent             → **ok**：replayed = false，batch_id = 原始逻辑 ID
   ⇒ insights/batches/ATT_…~3Ainsight-batch~3A01M3EN08DJ6PZQXBMNQEP3BV64.json 真实落盘（**路径修复生效**）
```

**⇒ 两个缺陷，不是一个**：路径缺陷已修好且已在真实 FSA 上证明（③ 写入成功、文件名合法、逻辑 ID 未变）；但 `applyPlan` 在第 ② 步即抛错，**③ 在生产命令路径里根本到不了**，操作永远停在 `in_progress`。

**缺陷 ② 的根因（🔴 与路径**完全无关**，属既有 `M8-HARDENING-01` 恢复协议）**

```
现场磁盘与 anchor 计划的**唯一差异**（逐字段比对，键序相同）：
  INS_01M3EN08DK0XYQRGGPY0TQQJZK  state: anchor=candidate | disk=**accepted**   updated_at: 10:43:31.378Z | 10:47:26.196Z
  INS_01M3EN08DM2A01S60GHYW27HQH  state: anchor=candidate | disk=**rejected**   updated_at: 10:43:31.378Z | 10:47:28.225Z
  INS_01M3EN08DM2A01S60GHYW27HQQ  state: anchor=candidate | disk=**accepted**   updated_at: 10:43:31.378Z | 10:47:31.645Z
events/insight-state-events.jsonl（2 条，10:47:26 / 10:47:32，trigger = user_accept）与上表一致
⇒ 用户在 ⑧ 被中断**之后**、操作完成**之前**合法地审阅了三条 Candidate Insight（接受／拒绝）。
  `createIfAbsent` 要求重放内容与已存记录**完全一致**，而状态迁移**按设计**改动 state ／ updated_at
  ⇒ 一旦用户动过 ⑧ 的产物，该 operation 就**永久不可恢复**（「写入没有完成…用同一次操作重试即可补齐」在本窗口**不成立**）。
```

**🔴 后果（影响恢复决策，必须上报）**：`PSA-A` 现场**无法通过重试收口**。`§20` 的「从 ⑧ recovery 局部 resume」在冻结工作区上**不可行**。可选路径需要人工裁决：① 从**干净工作区**重跑 ①→⑧（放弃该现场）；② 授权**第二个有界 Correction** 修恢复协议；③ 其他。

**判定**：`M8 PATH CORRECTION FAILED`（按任务 §15）—— 路径修复本身**已完成并验证**，但**恢复收口未达成**，故**未**自行进入第二个猜测的修复。

### 26.7 边界登记（🔴 本轮未做）

```
❌ 未修 缺陷②（PLAN_MISMATCH 恢复协议）；未改 `createIfAbsent` ／ `applyPlan` ／ anchor 格式
❌ 未改 Retrieval ／ Provider ／ UI 架构 ／ Product Decision ／ AC ／ Frozen Contract ／ Demo
❌ 未新增 Decision / AC / CCR；未改 `AC` 口径；未改 §1–§25 任何一字；`PSA-A FINAL RUN` 仍 `INTERRUPTED`
❌ 未启动 PSA-B；未部署 Vercel；未使用真实 API Key；未产生真实 Provider 调用
❌ 冻结失败工作区 `fei-psa-final-workspace` **未修改**（仅读取与整目录复制）
```

### 26.8 🚩 本节新增的两项相邻发现（🔴 如实登记，本轮**未**处理）

1. **`M9` hypothesis batch path 存在**同一形态**缺陷**：`src/application/hypothesis/persistence.ts#hypothesisBatchPath` 同样原样插值 `batch_id`，而 `newHypothesisBatchId` 同样用 `:` 分隔 ⇒ Windows 上 ⑨ 的 batch 记录预计同样无法落盘。**本轮按范围约束未修**，需人工裁决是否另开有界 Correction。
2. **本轮证据方法的两处限制**（影响射程，逐项声明）：
   - 以 DOM 指针点击左侧记录时 `session.selectAttempt` **确实执行**（行会变成 `is-selected`），但**中栏始终不渲染记录**（无 snapshot ／ 无 notice ／ 无 console 错误 ／ 无 unhandled rejection）。**原因未定论**，故**不得**记为产品缺陷；本轮改以**应用自身的读取组合与命令组合**（同一 `dist-web/` 构建）取得结果并驱动恢复。
   - `scripts/build-web.mjs` 在本机沙箱内**无声终止**（其递归删除 `dist-web` 触发沙箱限制），属**环境事实**，非产品缺陷 ⇒ 按其自身步骤等价执行。

### 26.9 Git（🔴 事实登记）

```
HEAD = d3f1133f11b03bebaa3515451328f36f598657d5（= 本轮 baseline，**未提交**）
working tree = 5 项未提交变更（3 M + 2 A，见 §26.4）
🔴 按任务 §15（recovery-copy 失败 ⇒ STOP ＋ 重新上报），本轮**未** commit ／ **未** push；
   `NEW PSA-A RESUME BASELINE` **未建立** —— 不得把任何新 hash 写成新 baseline。
🔴 旧 `PSA-A FINAL INTERRUPTED BASELINE = 374f3f4…` 与其登记**保留不动**。
```

### 26.10 状态汇总与下一波

```
PSA-A              = INTERRUPTED（🔴 不得改 PASS）
BLOCKER            = YES（缺陷②：⑧ 的重试无法收口；缺陷① 已修）
M8 batch path fix  = DONE / VERIFIED（Node 用例 + 真实 FSA 上 ③ 写入成功）
Recovery closure   = NOT ACHIEVED  ⇒  M8 PATH CORRECTION FAILED
SAFE NEXT（🔴 需人工裁决，未授权自动启动）
  (a) 就缺陷②另开有界 Correction；或
  (b) 以干净工作区重跑 ①→⑧ 后继续 PSA；或
  (c) 先提交本轮路径修复（其自身已完成且验证），再决定 (a)/(b)
🔴 本轮完成后停止；不得自动继续 PSA。
```

---

## 27. `FINAL-M8-M9-INTEGRATION-DEPLOY-GATE` ｜ 合并最后两处 Correction 并 push（🚩 `PRE-SUBMISSION` Final Integration Gate，2026-09-26｜🔴 追加，不改写历史）

> 🔴 **本节只做追加。§1–§26 及之前任何一字未被修改。**
> 🔴 本轮**未新增任何 `Decision` ／ `AC` ／ `CCR` 编号**；未改 `Frozen Contract` ／ `Retrieval` ／ `Provider` ／ `UI` ／ `Demo` ／ `AC`。
> 🔴 本轮只做**合并 ／ 验证 ／ push**：未重审全库、未继续 `PSA`、未改 UI、未真实调用 Provider。**禁止 force**。

### 27.1 任务性质与基线

```
任务      = Final Integration Gate（单机串行）：把最后两处有界 Correction 合入 main 并 push
主仓库    = C:\Users\Red16\Desktop\失败经验孵化助手_RECOVERED_REPO
Baseline  = 54f9bbd03d37bac6af8c9ef627375dd1273d4b77
Baseline Gate（只读）：working tree CLEAN ✅；local HEAD == remote main == 54f9bbd… ✅ ⇒ 无 BASELINE DRIFT
🔴 同步判定只看 `git rev-parse HEAD` + `git ls-remote origin refs/heads/main`（不依赖 `origin/main` 引用缓存）
```

### 27.2 合并（cherry-pick｜🔴 逐项实测，无 conflict）

```
① 4bd852715b6e61fe8d1f5f7161a8c0a0af37a748  fix: allow m8 replay after insight decisions
   ⇒ b06f4d298129eac0610c7200b1f32f388b2771b8   clean（4 files changed, 771 insertions(+), 9 deletions(-)）
② d95166afcfb9692a581bdf951f2aa94bb511cee8  fix: encode hypothesis batch persistence paths
   ⇒ 8da80fe57ef84b4731ff627b45062f290e349d00   clean（2 files changed, 558 insertions(+), 5 deletions(-)）
```

两个提交均为 `54f9bbd` 的**直接子提交**，且改动文件集**不重叠**（① 只改 `src/application/insight/**`，② 只改 `src/application/hypothesis/**`）⇒ 结构上不可能冲突，实测亦**无**冲突标记。
🔴 cherry-pick 全程以 `-c core.autocrlf=false` 执行 ⇒ 落盘仍为 **LF**，与主工作树既有行尾一致（**未**引入 CRLF）。
🔴 合并后**无 integration-only 代码变更** ⇒ 按任务 §6，**未**产生 `fix: integrate final m8 and m9 corrections` 提交（无内容可提交，不是跳过）。

### 27.3 `M8 recovery` = **CLOSED**（`PSA-A-CORRECTION-M8-RECOVERY-02`）

**唯一根因（承接 §26.10「缺陷②」）**：`createIfAbsent` 以**整个文档**做等价比较，因此用户合法裁决（`E5` accept ／ `candidate → rejected`）造成的 `state` + `updated_at` 变化被误判为 `PLAN_MISMATCH` ⇒ `PERSISTENCE_RECOVERY_BLOCKED` ⇒ **该 operation 永久不可恢复**。

**修法（单点，🔴 未放宽到「同 `insight_id` 即兼容」）**：新增单点 helper `sameInsightGenesis`（`src/application/insight/persistence.ts`，配套 `INSIGHT_REPLAY_MUTABLE_FIELDS = ['state','updated_at']` 显式闭集声明），**只比较不可变 genesis**（identity ／ `attempt_id` ／ `created_at` ／ `generation_batch` ／ ①②④ 生成期内容 ／ `evidence_refs` ／ `gate_checks` ／ `comparison_ref` ／ display-only meta）；genesis 相同 ⇒ 返回**磁盘记录**（**绝不回写 `candidate`**），genesis 不同 ⇒ 仍 **FAIL CLOSED**。首次创建语义、`recordBatchIfAbsent`、`M8-PATH-01` 的路径格式均**未动**。

### 27.4 `M9 Windows batch path` = **CLOSED**（`PSA-A-CORRECTION-M9-PATH-01`）

即 §26.8 ① 登记的**相邻未处理缺陷**：`hypothesisBatchPath` 同样原样插值含 `:` 的 `batch_id`（`newHypothesisBatchId` 用 `:` 分隔），Windows 上 ⑨ 的 batch 记录同样无法落盘。

**修法**：物理文件名改走 `M9` **已有的、可逆的** `~HH` codec（`encodeOperationIdToken`，**不是第二套 sanitize 规则**）；**逻辑 `batch_id` 处处不变**（domain 对象 ／ batch JSON ／ operation anchor ／ `planned_batch` ／ 引用）；发现永远**按内容**读取，文件名从不作为业务 ID 真源（§3.2 rule 3 / AC-137）。
🔴 `hypothesisOperationAnchorPath` **故意不加编码**（其入参已由 `hypothesisOperationKey` 编好），否则会移动既有 anchor 并让待恢复操作失锚。

### 27.5 验证（🔴 全部实测）

```
Main Tests   = 1181 passed / 0 failed   ← 0 FAIL（基线 1159 ＋ M8 +11 ＋ M9 +11 = 1181，逐项对齐）
Proxy Tests  =   15 passed / 0 failed   ← 0 FAIL（基线 15）
typecheck ×5 = PASS（tsconfig / core / browser / server / web --noEmit）
build        = PASS（tsconfig.build.json，exit 0）
build:web    = PASS（147 modules ＋ 1 stylesheet ＋ index.html；`dist-web/app/main.js` ／ `dist-web/index.html` ／ `dist-web/src/ui/styles/app.css` 均就位）
Secret Scan  = PASS（变更集 6 个文件：`sk-*` ／ `AKIA*` ／ `Authorization` ／ `Bearer` ／ `api_key` ／ `secret` ／ `password` ／ `PRIVATE KEY` 等 12 类模式命中 = 0）
禁止路径     = 0（dist* ／ node_modules ／ .learnbuddy ／ demo-workspace ／ recovery-copy 均不在变更集内）
Real Provider Calls = 0（全部用例与 smoke 均为 fake／mock provider）
```

**定向证据（M8／M9 关键不变量，37/37 PASS 单独先行复跑）**

```
M8-R2-04 / AC-130  accepted 仍 accepted、rejected 仍 rejected（replay 不覆盖人工裁决）      PASS
M8-R2-08 / AC-130  同 operation 重试 ⇒ 缺失 batch 落盘 ⇒ anchor 收口 `complete`            PASS
M8-R2-09           recovery **ZERO** additional provider calls（`insight_calls` 仍为 1）    PASS
M8-R2-10           第二次重试无新记录 ／ 无新 batch ／ 无新事件 ／ 无 provider 调用        PASS
M9-PATH-01/02      含两个 `:` 的逻辑 id 永不到达物理名；物理名满足完整 Windows 文件名契约   PASS
M9-PATH-06 / AC-137 持久化文档保留**原始**逻辑 `batch_id`                                   PASS
M9-PATH-10 / AC-137 重载后仍可从编码文件名按内容发现                                        PASS
M9-PATH-11         codec golden 值与 anchor 路径格式未变（无二次编码）                       PASS
```

**极短 fake smoke（🔴 真实服务链 ＋ 真实本地工作区，provider = 手写 fixture，`Real Provider Calls = 0`）**

```
① Formal Attempt → ⑧ generation 中断（anchor=in_progress / batch 缺失 / 2 条 insight 已落盘）
→ ⑨ 此时 locked=true → 人工裁决 accepted + rejected（均 applied）
→ 同 operation 重试 ⇒ anchor=complete、batch=1、**provider 调用增量 = 0**
→ 两条裁决仍为 accepted／rejected（未被回写 candidate）
→ ⑨ unlocked（step8=done, step9.locked=false）
→ ⑨ generation ⇒ batch 落盘，物理名 ATT_…~3Ahypothesis-batch~3A….json（Windows 合法、可逆）
→ reload discover ⇒ 按逻辑 id ＋ operation id 双路径解析成功
SMOKE_RESULT = PASS（9/9 检查点；FAKE_PROVIDER_CALLS = 4，REAL_PROVIDER_CALLS = 0）
```

### 27.6 Git（🔴 事实登记）

```
push 前：HEAD = 8da80fe…（工作树 CLEAN，无 integration-only 代码变更 ⇒ 无需 fix commit）
git push origin main  ⇒ exit 0（**未** force，**未** force-with-lease）
push 后：git rev-parse HEAD              = 8da80fe57ef84b4731ff627b45062f290e349d00
         git ls-remote origin refs/heads/main = 8da80fe57ef84b4731ff627b45062f290e349d00  ⇒ 一致 ✅
```

### 27.7 `PSA-A` 状态（🔴 未变）

```
PSA-A = INTERRUPTED
🔴 保持 INTERRUPTED；**不得**记为 PASS，也**不**登记为 READY TO RESUME。
🔴 本轮未执行任何 PSA 步骤；`PASS` 只能由真实 PSA 重跑取得。
```

### 27.8 `DEPLOYMENT CODE BASELINE`

```
DEPLOYMENT CODE BASELINE = 8da80fe57ef84b4731ff627b45062f290e349d00
                           （= 纯代码集成 HEAD ＝ 远端 main；Handoff 本节由其后的 `chore:` 提交记录，不改动代码基线）
```

### 27.9 🚩 环境事实补注（🔴 就地补注 §26.8 ②，不改写其原文；非产品缺陷）

§26.8 ② 曾记 `scripts/build-web.mjs`「在本机沙箱内无声终止（递归删除 `dist-web` 触发沙箱限制）」。本轮**实测修正该归因**：

```
事实：在**前台**直接运行 `node scripts/build-web.mjs` ⇒ **成功**（147 modules ＋ 1 stylesheet，exit 0）。
事实：把该脚本的 stdout 接入 PowerShell **输出捕获管道**（如 `& node scripts/build-web.mjs 2>&1` 赋值给变量）
      ⇒ 该步骤**挂起**（12 秒内 dist-web 文件数零变化、CPU 不再增长，本次已观测）。
推断（低置信度，未定论）：脚本以 `stdio: 'inherit'` spawn 子 `tsc`，子进程继承 PowerShell 管道后被父进程等待，
      可能在管道语义下死锁；**与中文路径无关**，也**不是**产品缺陷。
⇒ 操作规程（本机）：`build-web.mjs` 一律**前台直跑**，或按其自身步骤等价执行（wipe → `tsc -p tsconfig.web.json`
  → 复制 `app/index.html` 与 `src/ui/styles/app.css`）。`node --test` 的输出捕获不受影响，可正常重定向。
```

### 27.10 边界登记（🔴 本轮未做）

```
- 未重审全库；未新增 ／ 修改任何 `Decision` ／ `AC` ／ `CCR`
- 未继续 `PSA`（`PSA-A` 仍 INTERRUPTED）；未对真实 Provider 发起任何调用
- 未改 UI ／ Retrieval ／ Provider ／ Demo ／ Frozen Contract
- 未处理 §26.8 ① 之外的其它相邻项；未做浏览器 recovery-copy 复验（属 PSA 重跑范畴）
```

### 27.11 状态汇总与下一波

```
M8 recovery              = CLOSED
M9 Windows batch path    = CLOSED
Main / Proxy             = 1181 / 0 ｜ 15 / 0
typecheck ×5 / build     = PASS ｜ PASS
build:web                = PASS（147 ＋ 1）
Secret Scan              = PASS
Final HEAD = Remote main = 8da80fe57ef84b4731ff627b45062f290e349d00
PSA-A                    = INTERRUPTED（🔴 不得改 PASS）
DEPLOYMENT GATE          = OPEN
下一任务（🔴 已由人工在本轮指令中授权）：直接进入 Vercel 部署；**不得**再启动代码审查。
```

