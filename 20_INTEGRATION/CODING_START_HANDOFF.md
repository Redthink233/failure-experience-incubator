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

