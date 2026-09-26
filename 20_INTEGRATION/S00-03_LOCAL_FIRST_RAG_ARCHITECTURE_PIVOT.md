# S00-03 LOCAL-FIRST + STRUCTURED EXPERIENCE RAG 架构转向（INTEGRATOR / GATE B 前技术重新基线）

```
文档 ID   : S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT
阶段      : S00-03｜技术架构与实现方案收敛
任务      : S00-03-PIVOT-LOCAL-FIRST-RAG
性质      : Integrator 产出 —— 架构基线收敛文档
            （20_INTEGRATION/）不是 canonical 产品文档、不是契约、不是实现依据
状态      : PROPOSED（本文件的架构收敛结论）+ DECISION REQUIRED（2 项，见 §U）
            🔴 其中 D-053 / D-054 = 项目负责人人工 CONFIRMED 的架构级决策
效力      : 仅供 Gate B 人工裁决与 SP-06 规划使用；不得作为实现依据；不得替代 DECISIONS.md
上游依据  : docs/DECISIONS.md D-053 / D-054（人工 CONFIRMED，2026-09-24）
          : docs/DECISIONS.md D1–D10 / D-011–D-052 / ADJ-01 / Q16（全部不变）
          : docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md v0.2.5 → v0.2.6 DRAFT
          : 20_INTEGRATION/S00-03_技术决策包.md（TQ01–TQ05 原候选，PRE-PIVOT 历史）
          : 20_INTEGRATION/SP-01a_*（SP-01a 历史，SUPERSEDED BY D-053）
          : 30_SPIKES/retrieval/SP-03（INCONCLUSIVE）、SP-03R（PASS，R-A 规则级正向证据）
日期      : 2026-09-24
```

> 🔴 **本文件不做什么（硬边界）**
> 不写正式业务代码 · 不创建 `src/` · 不部署 · 不创建 Vercel Project · 不运行任何 Spike · **不创建 / 不删除任何云资源** · **不创建 `Decision ID` 之外的新编号** · **不 `CONFIRM` `TQ01`–`TQ05` 的任何一项** · **不把 `TQ03` / `TQ04` 写成已裁决** · **不进入 Gate B 裁决 / Gate C** · 不实现 Literature RAG / embedding / vector DB · **不改写任何历史文件**（Worker 产出 `01`–`05`、`SP-03` / `SP-03R`、`SP-01a_*`、`SP-01a probe`）。

> 🟢 **本文件做什么**：把**已经由项目负责人人工 `CONFIRMED` 的 `D-053` / `D-054`** 落为**新的 V1 架构基线**，并据此**重新基线 `TQ01`–`TQ05` 的问题空间**、产出 **`SP-06` 测试计划**、**登记 `SP-01a` 被 supersede 的历史事实**、给出**未执行**的旧云资源清理计划。**一切未确认项继续标 `PROPOSED` / `DECISION REQUIRED`。**

---

## A. Current Repository State

> **核验时点**：2026-09-24（本会话）。**核验方式**：读取工作区真实文件（未登录任何控制台、未推断云端状态）。

### A.1 STATE CHECK 结果

```
Repository State Check        : PASS（无 STATE DRIFT）
```

本 Prompt 所列**全部预期状态逐项与仓库已落盘事实一致**，**无差异项**，因此**不存在 `STATE DRIFT` 段落**。

### A.2 逐项核验表

| # | 核验项 | Prompt 预期 | 仓库实际 | 结论 |
|---|---|---|---|---|
| 1 | `D-051` | `CONFIRMED` | `docs/DECISIONS.md`《`D-051`》状态 = `CONFIRMED`（2026-09-20） | ✅ 一致 |
| 2 | `D-052` | `CONFIRMED` | `docs/DECISIONS.md`《`D-052`》状态 = `CONFIRMED`（2026-09-20） | ✅ 一致 |
| 3 | Shared Contract | `v0.2.5 DRAFT` / `D-051`+`D-052` 对齐版 | `00_SHARED_TECHNICAL_CONTRACT.md` 文件头 = `v0.2.5 DRAFT / D-051+D-052 对齐版`；§14 第 4 条版本链同 | ✅ 一致 |
| 4 | Test Plan 最大既有编号 | `AC-126` | `09_TEST_PLAN.md` 末节结束于 **`AC-126`**（`D-051` → `AC-116`–`123`；`D-052` → `AC-124`–`126`） | ✅ 一致 |
| 5 | 旧 `SP-01a` 账本 | `PHASE 2 IN PROGRESS` / `NOT PASS`；`CREATE AUTHORIZATION = GIVEN` | `PACK §N.6` = `Current Phase : PHASE 2 IN PROGRESS` / `CREATE AUTHORIZATION : GIVEN` / `SP-01a : IN PROGRESS / NOT PASS` / `SP-01 : NOT COMPLETE` | ✅ 一致 |
| 6 | `R2` CloudBase Environment | `CREATED`、上海、免费体验版、静态托管未初始化 | `PACK §N.3` = `CREATED`（上海 / 免费体验版 0 元 / 不自动续费 / 有效期 2027-03-20）；`Static Hosting = NOT INITIALIZED` | ✅ 一致 |
| 7 | `R6-A` VPC | `CREATED` | `PACK §N.2 P2-E01` / `§N.3` = `CREATED`（`learn-sp01a-vpc` / `10.20.0.0/16` / 广州） | ✅ 一致 |
| 8 | `R6-B` Subnet | `CREATED` | `PACK §N.2 P2-E02` / `§N.3` = `CREATED`（`learn-sp01a-subnet-gz6` / `10.20.1.0/24` / 广州六区） | ✅ 一致 |
| 9 | `R6-C` Security Group | `AUTHORIZED` / `IN CONFIGURATION` / `NOT YET CONFIRMED CREATED`（按当前项目文件口径） | `PACK §N.2 P2-E05` / `§N.3` / `§N.6` = 同口径；`§N.2` 记账纪律明示"收到「安全组已创建」前不得写 `CREATED`" | ✅ 一致 |
| 10 | `R3` TencentDB PostgreSQL | `PRE-CREATE`、未提交创建、未起计费 | `PACK §N.3` = `PRE-CREATE`；`§N.5` 明示"🔴 未购买 / 未创建 / 未起计费" | ✅ 一致 |
| 11 | `R1` SCF | `NOT CREATED` | `PACK §N.3` = `NOT CREATED` | ✅ 一致 |
| 12 | Function URL | `NOT ENABLED` | `PACK §N.3` / `§N.6` = `NOT ENABLED` | ✅ 一致 |
| 13 | Probe 目录 | `30_SPIKES/sp01a_probe/` 存在、`DISPOSABLE / NON-PRODUCTION` | 目录存在（`README.md` / `function/scf_bootstrap` / `function/app.js` / `function/package.json` / `db/probe_schema.sql` / `web/index.html`，共 6 文件）；`README.md` 标 `DISPOSABLE / NON-PRODUCTION` | ✅ 一致 |
| 14 | `S-01`–`S-07` | `NOT EXECUTED` | `PACK §N.3` = 全部 `NOT EXECUTED` | ✅ 一致 |

### A.3 核验方法说明（🔴 事实等级）

- 上述结论**全部来自工作区已落盘文本的复读**，属 **🟠 `ACCOUNT-LEVEL / PROJECT-OWNER REPORTED FACT` 的二次引用** —— 原始事实由**项目负责人**在控制台观察后报告，**AI 未登录控制台、未独立复核**。
- 🔴 **本文件不把 `R6-C` 从"未确认创建"推断为 `CREATED`**；🔴 **不把 `R3` 推断为已创建**；🟠 复核方式与限制与 `PACK §N.3` 一致。

---

## B. D-053｜V1 改为 Local-first Harness-style Web App

- **Decision ID**：`D-053`
- **状态**：`CONFIRMED`（**项目负责人人工决策**，非 AI 提议）
- **日期**：2026-09-24
- **来源阶段**：`S00-03｜技术架构与实现方案收敛`
- **决策主题**：**V1 主架构的承载形态** —— 由 **Cloud-centric Web App** 转为 **Local-first Harness-style Web App**。
- **最终结论**：V1 采用 **Web UI + Local Workspace Folder + Configurable LLM +（必要时）Thin LLM Access Layer + Vercel Demo / Review Deployment** 的形态：

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
      │             LLM Provider
      ▼
Attempt · Insight · Hypothesis · EvidenceRef
Workspace Metadata · Markdown / JSON
```

- **核心原则（三条，均为 `CONFIRMED`）**：
  1. **Web 的主要目的 = 让比赛评委可以方便打开、查看和体验产品**；
  2. **本项目当前不以「长期运营 SaaS / 多人在线系统 / 云端科研数据平台」作为 V1 目标**；
  3. **科研主数据 Local-first；Workspace canonical 存在用户选择的本地目录**。
- **明确不改变（D-053 是技术承载方式改变，不是重新设计产品）**：`D1`–`D10` / `R1`–`R6` / `D-011`–`D-052` / `ADJ-01` / `Q16` / `D9` 十步闭环 / `Attempt` / `Insight` / `Hypothesis` / `EvidenceRef` / `Fact`·`Extraction`·`Inference` / `Draft`·`Formal` / `Candidate Insight`·`accepted Insight` / `Experience Asset` / `Hypothesis` 8 字段 / archive 语义 / `D-049` / `D-050` / `D-051` / `D-052` / Level A·B·C / `N_检索`·`N_引用` / History-grounded Hypothesis。**不得以「改 Local-first」为理由重新打开任何已确认产品语义。**
- **落盘**：`docs/DECISIONS.md`（`D-053`）、`docs/07_TECH_ARCHITECTURE.md`（架构基线重写）、`docs/03_V1_SCOPE.md`（In / Out 更新）、`docs/09_TEST_PLAN.md`（新增 `AC`）、本文件、`docs/CHANGELOG.md`、契约 `v0.2.6 DRAFT`。

---

## C. D-054｜V1 RAG 范围 = 仅 Structured Experience RAG

- **Decision ID**：`D-054`
- **状态**：`CONFIRMED`（**项目负责人人工选择「方案 C」**）
- **日期**：2026-09-24
- **来源阶段**：`S00-03｜技术架构与实现方案收敛`
- **决策主题**：**V1 的 RAG 边界** —— 是否引入「文献 / 论文 / PDF 知识库 RAG」。
- **最终结论**：**V1 只实现 `Structured Experience RAG`**：

```
Structured Experience RAG
  = 基于用户自身历史 Attempt 的结构化经验检索
  + 证据上下文组装
  + Grounded Generation
```

- **同时**：**在技术架构中预留 `ResearchContextProvider` 扩展接口**。
- **V1 明确不实现（🔴 OUT OF V1）**：
  - PDF 文献 RAG；论文知识库；文献上传；PDF parser；
  - document chunking；document embedding；文献向量索引；
  - 文献检索 UI；外部科研资料 citation UI；**Research Document RAG**。
- **门槛条款（🔴 硬约束）**：**未来如需要实现上述任一能力，必须重新进入 `Scope` / `Decision`**；**不得因为项目「偏科研」就偷偷把论文 RAG 加入当前 V1**。
- **落盘**：`docs/DECISIONS.md`（`D-054`）、`docs/06_AI_CAPABILITIES.md`、`docs/03_V1_SCOPE.md`、`docs/04_USER_FLOW.md`、`docs/05_DATA_MODEL.md`、`docs/08_UI_SPEC.md`、`docs/09_TEST_PLAN.md`、本文件、`docs/CHANGELOG.md`、契约 `v0.2.6 DRAFT`。

---

## D. Why Pivot（转向原因与影响面）

> 🟠 **本节为 Integrator 的 `PROPOSED` 分析**（说明性质的因果叙述），**不作为新的产品事实**。`D-053` / `D-054` 本身是人工决策，不依赖本节论证。

### D.1 触发背景

| 因素 | 事实 | 影响 |
|---|---|---|
| 赛事形态 | 初赛 V1 开发期 **2026-09-16 ~ 09-26**，交付物 = 可在浏览器访问和演示的 Web 应用 | 需要一个**评委能直接打开**的入口 |
| 演示成本 | 旧 Cloud-centric 方案要求在 Gate B 前完成**在线托管数据层 + 浏览器端到端连通性**实测（`SP-01`），且 `SP-01a` 已实际产生云资源 | 演示环境与成本纪律（免费额度优先）之间存在持续压力 |
| 数据形态 | V1 的 corpus = **用户本人的结构化 `Formal Attempt` 历史**；规模小、字段结构化、准入语义明确（`D-019` / `D-050`） | **不需要在线数据库**也能完成 ⑥⑦⑧⑨⑩ |
| 隐私/信任定位 | 科研主数据（失败记录）属用户私人资料 | Local-first 与产品「用户自己的经验资产」定位一致 |

### D.2 转向带来的直接收益（`PROPOSED`）

1. **消除在线数据层的必需性**：V1 不再要求云 PostgreSQL 作为主存储 ⇒ 移除 `SP-01` 中与「托管数据库连通性」绑定的阻塞性前置。
2. **演示可靠性提升**：Vercel 仅承载 Web UI；即便 LLM 或后端不可用，**Demo Workspace 仍可离线展示**（D9 的 ⑥⑦⑧ 至少可读到预置数据）。
3. **成本风险下降**：V1 不再需要持续计费的云数据库。
4. **与 `D-054` 协同**：corpus 只有结构化历史 `Attempt` ⇒ RAG 的技术形态可以是**结构化规则检索**，**不需要 vector DB**。

### D.3 转向的代价与新增风险（`PROPOSED`，🔴 必须一并登记）

| 新增风险 | 说明 | 归属 |
|---|---|---|
| **浏览器本地目录访问能力** | 依赖 **File System Access API** 或等价能力；**Chrome / Edge 支持不等于 Safari / Firefox 支持** —— 需 `SP-06` 实测 | `SP-06` |
| **授权 UX 首次成本** | 用户必须主动「选择工作区」并授权；一次性的权限授予 / 失效 / 撤销行为需设计 | `SP-06` / `08_UI_SPEC.md` |
| **页面刷新 / 重开浏览器后的 handle 与 permission** | 结构性行为差异（handle 需重新请求权限 / IndexedDB 持久化 handle 等） | `SP-06` |
| **LLM 请求网络路径未定** | 浏览器直连 vs Vercel Thin Proxy vs Hybrid 会产生**不同的 Key 暴露面与 CORS 约束** | **`TQ03` → `DECISION REQUIRED`** |
| **凭据持久化方式未定** | memory / session only vs browser-local persistence 影响安全与评委体验 | **`DECISION REQUIRED`** |
| **Vercel 配额 / 条款** | 免费计划与使用条款若后续不满足比赛场景 ⇒ 需报 `DEPLOYMENT TARGET ISSUE` | `SP-06`（🔴 **不得偷偷改收费方案**） |
| **本地文件被外部修改 / 损坏 / 移动** | 文件系统是用户可控环境，需明确容错与提示行为 | `SP-06` |

### D.4 与 `D-053` 的边界（🔴 防误读）

- `D-053` **不是**「把云都去掉」——它确认的是 **V1 主轴 = 本地**；**Vercel 仍是正式确认的 Review / Demo 部署目标**。
- `D-053` **不是**「不需要服务端」——**是否需要 Thin Server Layer 属 `TQ01` 的余项**（见 §R），**本轮不裁决**。

---

## E. Old vs New Architecture

> 🟠 **左列为 PRE-PIVOT 历史状态**（保留原貌，**不得改写**）；**右列为 `D-053` / `D-054` 后的当前基线**。

| 维度 | 旧（Cloud-centric，PRE-D-053） | 新（Local-first，D-053 / D-054 后） | 状态 |
|---|---|---|---|
| **承载形态** | 云端 Web App（Serverless 单体 / 长驻单体） | **Local-first Harness-style Web App** | ✅ 人工 `CONFIRMED` |
| **主数据位置** | 托管 PostgreSQL（`TQ02` 首选 `DP-A`） | **本地 Workspace 文件** | ✅ 人工 `CONFIRMED` |
| **主数据格式** | 待定（DB 表） | **Markdown + JSON / sidecar metadata**（具体 schema = 技术收敛项） | 🔵 `PROPOSED` |
| **Web 部署** | 云托管（平台待定） | **Vercel**（Demo / Review Target） | ✅ 人工 `CONFIRMED`（Vercel 定位） |
| **是否需要服务端** | **必须有服务端**（`TQ01` 硬结论） | **前端主导 +（是否需要 Thin Server Layer 待定）** | 🔴 **未裁决（`TQ01` 余项）** |
| **LLM 接入** | `LP-1` 服务端代理 + provider 抽象（`TQ03` 原推荐） | **Configurable LLM + Provider Abstraction（`CONFIRMED`）**；**请求网络路径待定** | 🔴 **未裁决（`TQ03`）** |
| **检索路线** | `R-A` 结构化字段规则（+ 必要时 LLM 判定） | **不变**（`R-A` 仍为 `PROPOSED` 推荐） | 🔴 **未裁决（`TQ04`）** |
| **RAG 范围** | 未明确（存在引入文献 RAG 的空间） | **仅 Structured Experience RAG**；`ResearchContextProvider` 仅预留 | ✅ 人工 `CONFIRMED` |
| **Demo 数据** | 云数据库 seed | **Local Demo Workspace**（`demo-workspace/`） | 🔵 `PROPOSED`（须继续满足 `D8` / `TQ10`） |
| **`SP-01` 前置** | Gate B 前 P0 证据（要求在线数据层连通性） | **旧 `SP-01a` 已 supersede**；新证据需求 = **`SP-06`** | ✅ 人工 `CONFIRMED`（supersede） |
| **云 PostgreSQL** | V1 必需依赖（`R3`） | **不是 V1 required dependency** | ✅ 人工 `CONFIRMED` |

### E.1 PRE-D-053 HISTORICAL ANALYSIS（🔴 历史保护声明）

以下文件为 **`S03-A` ~ `S03-E` Worker 历史产出**，均在 **`D-053` 之前**生成，**不可能考虑 `D-053` / `D-054`**：

```
docs/architecture/01_APP_ARCHITECTURE.md        （S03-A / PROPOSED）
docs/architecture/02_DATA_AND_STATE.md          （S03-B / PROPOSED）
docs/architecture/03_AI_PIPELINE.md             （S03-C / PROPOSED）
docs/architecture/04_RETRIEVAL_AND_COMPARISON.md（S03-D / PROPOSED）
docs/architecture/05_TEST_DEMO_DEPLOY.md        （S03-E / PROPOSED）
```

**处置（🔴 强制）**：

- ❌ **不得就地改写其历史结论**；
- ❌ **不得删除**；
- ❌ **不得假装它们当时已经考虑 `D-053`**；
- ✅ 其「Cloud-centric 前提」**一律视为 `PRE-D-053 HISTORICAL ANALYSIS`**；
- ✅ **当前有效架构基线 = 本文件 + `docs/07_TECH_ARCHITECTURE.md`（`D-053`/`D-054` 基线章节）**；
- ⚠️ 其中**仍然有效**的部分（`TC` 语义、`source_type`、`EvidenceRef`、Level A/B/C、`N` 口径、`TQ09`/`TQ10`/`TQ18`/`TQ19` 收敛结论等）**不因架构转向而失效** —— 它们描述的是**产品语义**，与承载方式无关。

> 🟢 **就地补注说明**：Worker 文件**本身未加任何补注**（保持交付原貌）；`PRE-D-053` 标注**只存在于本文件与 `CHANGELOG.md`**。

### E.2 仍然有效 / 已被 supersede 的清单

| 项 | 处置 |
|---|---|
| `TC-01`–`TC-84` 共享技术语义 | ✅ **仍然有效**（与承载方式无关） |
| `TQ09` / `TQ10` / `TQ18` / `TQ19` 收敛结论 | ✅ **仍然有效**（`TQ10` 的 seed 规则在 Local Demo Workspace 下继续适用） |
| `TQ06`–`TQ12` / `TQ15`–`TQ28`（Integrator 收敛） | 🟡 **逐项仍需复核**（其中与「云数据层 / 服务端 API」绑定的条目需在 `SP-06` 后重新表述；**不属本轮**） |
| `TQ13` / `TQ14`（默认不引入） | ✅ **不变** |
| `SP-01` 的 §N.1 Primary / §N.2 Fallback 平台候选 | 🔴 **`SUPERSEDED BY D-053`**（旧 Cloud-centric 候选空间） |
| `SP-01a` 全部资源与探针 | 🔴 **`SUPERSEDED BY D-053`**（见 §O） |
| 组合甲（`R1` SCF / `R2` CloudBase / `R3` TencentDB） | 🔴 **`SUPERSEDED BY D-053`**（历史 `CONFIRMED` 保留、不改写） |
| `SP-03` / `SP-03R` | ✅ **全部保留**；`SP-03R` 的 `R-A` 规则级正向证据**在 Local-first 下仍然有效**（见 §H.3） |

---

## F. Local Workspace Architecture

> 🟠 本节为 **Integrator `PROPOSED` 架构收敛**（`D-053` 已确认「Local Workspace = V1 Primary Persistence」，但**具体目录 / 文件 schema 属技术收敛项**，**无需升级项目负责人决策**）。

### F.1 逻辑层级（不变）

```
User → Personal Workspace → Project → Attempt        （D3，不变）
```

🔴 `D-053` **不改变**逻辑层级、不把 `Project` 去掉、不引入团队层。

### F.2 Workspace 的物理承载（`PROPOSED`）

**Workspace canonical = 用户选择的本地目录**。目录内建议结构（🔵 **仅为 `PROPOSED`，目录名属普通实现参数**）：

```
workspace/
├─ workspace.json          # workspace 元数据：id / 名称 / schema 版本 / 创建时间
├─ attempts/               # 每条 Formal Attempt / Draft 一个文件（Markdown + front-matter 或 .md + .json）
├─ insights/               # Insight（含生成批次关系、状态）
├─ hypotheses/             # Hypothesis 两类 kind + 裁决位
├─ evidence/               # EvidenceRef 集合（或随 owner 内联 + 索引）
└─ system/                 # 派生索引 / 排序键缓存 / 技术层留痕（🔴 与产品层隔离）
```

### F.3 必须满足的性质（🔴 硬约束，来自任务要求逐条落实）

| # | 必须满足 | 说明 / 落点 |
|---|---|---|
| 1 | **stable local ID** | 所有对象 ID 全局唯一、稳定、不复用（沿用契约 §3.1 / §3.2）；**不得用数组下标 / 排序位置** |
| 2 | **`EvidenceRef` 可稳定追踪** | 引用按 ID 指向；落点 = `Formal Attempt` 内可追溯内容条目（`Fact` / `Extraction`）；`role = grounding` 必须落 `Fact` |
| 3 | **文件改名不应轻易破坏逻辑引用** | 引用**不得**以文件名 / 路径 / 标题为唯一依据 ⇒ **ID 与文件名解耦**（文件名可读，ID 存于文件内容） |
| 4 | **archived 对象仍保留** | 归档 = 状态位 + 检索过滤 + 展示标注；**V1 无物理删除**（`D-043`）；归档文件**不得移动 / 删除**，仅改状态字段 |
| 5 | **generation batch 语义可表达** | 必须能判定"哪一批是最近一次显式生成的结果"（`D-051` / `05_DATA_MODEL.md` §5 的 5 条性质） |
| 6 | **Demo / Live 数据来源可区分** | `data_source_nature`（现场记录 / 事后补录 / Demo 示例数据）**逐条落文件**（`D8` / `D-044` / `TQ10`） |
| 7 | **不建立用户可见 version system** | ❌ 版本号 / 版本列表 / 版本比较 / 版本回滚 / 修改次数（`D-040` / `D-051` / `D-049`） |

### F.4 Local-first 的正面目标（`PROPOSED` 设计取向）

| 目标 | 说明 |
|---|---|
| **人可读** | 主数据以 **Markdown** 为主体，用户可用任意编辑器查看 |
| **Git 友好** | 纯文本 + 稳定 ID ⇒ 可纳入版本控制（🔴 **属用户自己的 Git 使用，不是产品功能**） |
| **Obsidian 友好** | 目录 + Markdown + front-matter 可被常见笔记工具读取（🔴 **不声称官方集成、不建立插件依赖**） |
| **可迁移 / 可备份** | 整个目录可复制 / 打包带走，无云端锁定 |
| **可 diff** | 文本文件天然可 diff（🔴 **不得因此引入产品级 diff 功能**，`D-051` 红线） |

### F.5 与「逻辑对象模型」的关系（🔴 防扁平化）

- 🔴 **不得因为采用文件存储就把对象模型扁平化**：`Workspace` / `Project` / `Attempt` / `Insight` / `Hypothesis` / `EvidenceRef` **仍是不同的逻辑对象**，各自有独立 ID 空间、状态模型与引用语义。
- 🔴 **物理存储形态变化不得改变任何逻辑字段语义**（`source_type` / `archive_state` / `decision_state` / `generation batch` / `data_source_nature` / 时间戳等，逐项见 §G）。

---

## G. Persistence Mapping

> **性质**：`D-053` 要求 **逻辑实体不变**，新增「**Persistence Mapping**」说明。**本节只描述"逻辑字段必须能在本地文件中表达"，不锁具体物理 schema**（🔴 不锁文件扩展名、不锁 front-matter 键名、不锁 JSON 结构 —— 均属实现参数）。

### G.1 Logical Entity → Local File Representation

| 逻辑实体 | 本地表示（`PROPOSED`，示例性） | 必须能表达 |
|---|---|---|
| `Workspace` | `workspace.json`（元数据）+ 目录本身 | 稳定 workspace id / 名称 / schema 版本 / 创建时间 / 数据来源总体说明 |
| `Project` | `workspace.json` 内的 project 列表（或 `projects/` 下条目） | project id / 名称；**可缺省**（仅 Level B 解释维度，**不作检索准入过滤**） |
| `Attempt` | `attempts/<attempt_id>.md`（front-matter + 正文） | `attempt_id` / `Draft`·`Formal` / 归档位 / 四组字段内容条目 / L4 四项 |
| `Insight` | `insights/<insight_id>.md` | `insight_id` / `candidate`·`accepted`·`rejected` / 内容性字段 / 引用清单 / **生成批次归属** / 状态迁移事件日志 |
| `Hypothesis` | `hypotheses/<hypothesis_id>.md` | `hypothesis_id` / `kind`（`grounded`·`model`）/ `undecided`·`accepted`·`rejected` / ①②③④⑤ 只读内容 / ⑥⑦⑧ 用户 `Fact` 条目与 AI `Inference` 条目**分列** / **生成批次归属** |
| `EvidenceRef` | 随 owner 内联 + `system/` 派生索引（或 `evidence/` 集合） | `evidence_ref_id` / `target_id` / `source_field_path` / `role` / `owner_id` |
| 派生结果（检索 / 比较 / 排序键） | `system/` 派生缓存（**非用户主数据**） | 命中维度集合 / 未比对集合 / `order_key`（🔴 **技术层，不进产品层**） |

### G.2 必须能在本地文件中表达的逻辑事实（逐条核对表）

| # | 逻辑事实 | 本地表示要点 | 依据 |
|---|---|---|---|
| 1 | **stable IDs** | 每个对象文件内容内含自身 ID；文件名**不作为**引用依据 | 契约 §3.1 / §3.2 |
| 2 | **`EvidenceRef`** | 最小字段集（`evidence_ref_id` / `target_id` / `source_field_path` / `role` / `owner_id`）全量可表达 | 契约 §5.1 |
| 3 | **`source_type`** | **逐条**携带 `Fact` / `Extraction` / `Inference`（+ `confirmation_class` / `decision_state`） | 契约 §1.5 / §4 |
| 4 | **`archive_state`** | `Attempt` 上的正交状态位；**唯一事实来源 = 被引用记录自身当前状态**（不存快照副本） | 契约 §7 / §7.4 |
| 5 | **generation batch** | 能给每个 `Insight` / `Hypothesis` 记录"所属生成批次"并识别最新批 | `D-051`；`05_DATA_MODEL.md` §5 |
| 6 | **`decision_state`** | `Hypothesis` 三态可表达；`Model Suggestion` 的**保存位与裁决位是两个独立字段** | `D-042` |
| 7 | **data source nature** | `data_source_nature` 逐条可表达（Demo / live 区分） | `D8` / `D-044` |
| 8 | **timestamps** | L4 的 `created_at` / `updated_at` 可表达；**「发生时间」为用户 `Fact`，与系统时间语义可区分** | `D-044` / `Q16` |

### G.3 🔴 不得因物理变化改变逻辑字段语义（明确记账）

- ❌ 不得把 `Draft` / `Formal` 合并为一个"是否完成"布尔；
- ❌ 不得把归档位与 `Draft`/`Formal` 合并成一个枚举；
- ❌ 不得把 `Fact` / `Extraction` / `Inference` 压扁为"AI 或用户"两值；
- ❌ 不得把 `Insight` 三态与 `Hypothesis` 三态合并；
- ❌ 不得把生成批次做成版本号；
- ❌ 不得把 `EvidenceRef` 降级为"文本块内的自然语言提及"。

> 🔴 **一句话**：**文件只是承载，语义一概照旧。**

---

## H. Structured Experience RAG

> **性质**：`D-054` 已确认 V1 的 RAG 形态命名为 **Structured Experience RAG**。
> 🔴 **它不是新增产品流程**，而是**现有 `D9` ⑥⑦⑧⑨⑩ 在技术架构中的正式描述**。

### H.1 正式定义与数据流

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

| 环节 | 对应 `D9` 步 | 落点依据 |
|---|---|---|
| `Experience Retriever` | ⑥ 检索相关历史 `Attempt` | `D-045` / `D-019` / **`D-050`** |
| `Evidence / Comparison Context Builder` | ⑦ 相似点 / 差异点 | `D-019` / `D-020` / `D-025` / `D-046` |
| `Grounding Context Pack` | ⑧⑨ 的输入组装 | 契约 §8.2；§I |
| `LLM` → `Candidate Insight` | ⑧ 提炼可复用经验 | `D-021` / `D-022` / `D-038` / **`D-051`** |
| `Hypothesis` | ⑨ 输出 | `D-027`–`D-033` / `D-049` / `D-051` |
| `EvidenceRef` | ⑩ 证据可追溯 | `D-035` / `D-043` |

### H.2 corpus 规则（🔴 严格沿用既有规则，不得因命名为 RAG 而扩大）

| 项 | 规则 |
|---|---|
| **主要检索 corpus** | **符合既有规则的历史 `Formal Attempt`**（`D-045`：默认范围 = 全部历史；`Project` 只作 Level B 解释维度，**不作准入过滤**） |
| **`Draft`** | ❌ **不进入 `N_检索`** |
| **archived** | ❌ 按已有规则**排除新默认 retrieval / grounding / `N_检索`**；既有引用保留并标「来源已归档」 |
| **Research Documents / Web Search / 模型一般知识** | 🔴 **不得计入 `N_检索`** |
| **`accepted Insight`** | **不因存在就自动改变当前 Retrieval admission**；其使用**继续遵循既有 `Experience Asset` 规则** |
| **`D-054` 是否新增语义** | 🔴 **未新增** |

### H.3 Retrieval 路线（`TQ04` 重新基线）

> 🔴 **`TQ04` 尚未正式 `CONFIRM`。不得因为使用「RAG」一词自动确认 embedding。**

**候选（保持不变）**：

| 编号 | 路线 | 内容 |
|---|---|---|
| **`R-A`** | Structured Field Rules（+ 必要时 LLM 维度判定） | Level A 四维度按结构化字段规则判定；`matched` 严格按 `D-050` |
| **`R-B`** | Embedding-assisted | 引入 embedding 辅助 |
| **`R-C`** | Hybrid | 规则 + embedding 混合 |

**必须纳入重新评估的既有证据**：

| 证据 | 内容 | 对本决策的作用 |
|---|---|---|
| **`SP-03`** | `RESULT = INCONCLUSIVE`（48 次判定；`matched` 集合 5/8 CASE 漂移、100% 过判；根因收窄为"判据未显式定义是重要来源之一"，无法完全分离规则歧义与模型随机性） | 说明**判据必须先显式化**（已由 `D-050` 完成） |
| **`D-050`** | Level A 维度 `matched` = **严格语义重叠** | 判据已锁定 ⇒ 结构化规则可承载该语义 |
| **`SP-03R`** | `PASS`（48/48；`matched` / `related` / `uncompared` 8/8 CASE 与 Gold 完全一致；32 个维度槽位零漂移） | **`R-A` 在规则层获得正向实验证据**；⚠️ 射程 = 仅"本次环境下判据显式化后未再观测到漂移" |

**Local-first 条件下的新增约束（重新评估输入）**：

1. **数据规模小**（个人历史 `Formal Attempt`，几十至几百条量级）；
2. **历史 `Attempt` 已结构化**（Level A 四维度有明确字段路径，`TQ19` 已冻结映射）；
3. **Level A admission 有明确语义**（`D-019` + `D-050`）；
4. 🔴 **禁止数字相似度作为产品结论**（`D-020` / `D-037`）；
5. 🔴 **不允许宽泛主题相似自动 related**（`D-050` 明确否定类别级匹配）。

**`PROPOSED` 推荐**：

```
PROPOSED TQ04 推荐 = R-A（结构化字段规则 + 必要时 LLM 维度判定）
```

**理由（`PROPOSED`）**：

- 在**小规模 + 已结构化 + 准入语义明确**的条件下，结构化字段规则的**可解释性与可追溯性**直接匹配 `D-050` / `D-035` 的要求；
- `SP-03R` 已提供 `R-A` 的**规则级正向证据**（⚠️ 射程受限，见上）；
- **embedding 对 V1 的边际收益被产品规则压缩**：`D-050` 明确否定"类别级相似"，即**语义相近但非等价**的候选**本就不应纳入 `matched`** ⇒ embedding 的"模糊召回"能力在此处**难以转化为正确的准入**；
- **Local-first 下引入 embedding 的代价上升**：需 embedding 模型 / 服务、向量存储、以及 embedding 的**网络传输**（与"最小必要上下文"原则和本地性冲突）。

🔴 **不得自动 `CONFIRM` `TQ04`**；🔴 **`R-A` 仍只是 `PROPOSED`**；🔴 **本推荐不作为实现依据**。

### H.4 🔴 RAG ≠ Vector RAG（明确写入架构）

> **RAG ≠ 必须使用 Vector DB。**

V1 **不因使用 RAG 自动引入**：❌ Pinecone ❌ Milvus ❌ Weaviate ❌ Chroma ❌ pgvector ❌ Elasticsearch ❌ Redis Vector ❌ embedding database。

🔴 **不得通过 `cosine similarity score` 替代 `D-050` 的严格 `matched` 语义。**

若未来 `TQ04` 选择 embedding：**也只能作为符合现有产品规则的技术辅助**；🔴 **不得改变** `Level A admission` / `D-050` / `N_检索` / ⑦ 呈现语义。

---

## I. Grounding Context Pack

> **性质**：技术层设计（`PROPOSED`）—— 用于把检索证据**安全、有限**地传给 LLM。

### I.1 至少区分的五部分

| 区 | 内容 | 允许进入 LLM | 约束 |
|---|---|---|---|
| **A** | **Current Attempt 的 `Fact` / `Extraction`** | ✅ | 🔴 **不得把 `Inference` 混入"用户事实"区** |
| **B** | **Historical Attempt Evidence**（历史 `Formal Attempt` 的可追溯内容条目） | ✅ | 必须可追溯（`target_id` + `source_field_path`）；**不得含 `Draft` / 默认不得含 archived** |
| **C** | **Comparison Result**（命中的 Level A 维度集合 / 未比对集合 / 相似点·差异点） | ✅ | 🔴 **不得携带任何数值化相似度**（`D-020`）；`compared_not_matched` 为纯内部量、**不发布** |
| **D** | **Accepted Experience Asset**（`accepted Insight`） | 🟡 **仅在既有规则允许时** | 🔴 **不得承担 grounding**（`D-030`）；作推理输入时须单独标注、**不计入 `N_引用`** |
| **E** | **System instruction / technical prompt context** | ✅ | 🔴 **技术层**，不进产品层 L4、不进界面 |

### I.2 硬约束

1. 🔴 **必须保留 `Fact` / `Extraction` / `Inference` 的来源边界** —— 每个进入 Pack 的条目**携带其 `source_type`**；
2. 🔴 **不得把 AI 先前生成的内容伪装成用户事实**；
3. 🔴 **不得因为进入 prompt 改变 `source_type`**（来源类型恒不变，契约 §4.2 第 1 条）；
4. 🔴 **`Model Suggestion` 若被引用，只能出现在【模型先验】分区**，须单独标注、**不计入 `N_引用`**、**不得成为唯一依据**（`D-042`）；
5. 🔴 **Pack 的组装必须保证：没有真实 grounding ⇒ 整体只能是 `Model Suggestion`**（`D-030`）；
6. 🟡 **最小必要原则**：**只发送完成当前 AI 操作所需的最小必要上下文**；🔴 **不得默认上传整个 Workspace**（见 §N.2）。

### I.3 技术层留痕（`TQ09` 既有口径，继续适用）

必须留痕：① 原始判定返回 ② 投影输入 ③ **维度级判定产物**（每候选 × 每 Level A 维度的三态 + 一句理由）④ 判定运行标识 ⑤ 模型 / prompt 标识。**全部属技术面、不得进入产品层 L4**。**验收粒度须到维度级**（源自 `SP-03R` 的 N-5）。

---

## J. ResearchContextProvider Reserved Boundary

> **性质**：`D-054` 已确认**架构层允许定义** `ResearchContextProvider`；🔴 **V1 不实现任何 provider**。

### J.1 只允许「概念接口」

```
ResearchContextProvider
    getContext(query)
```

🔴 **仅作为 architecture future-extension note**，并**必须同时标注**：

```
NOT V1
NOT IMPLEMENTED
NO USER-VISIBLE BEHAVIOR
```

### J.2 🔴 V1 明确不建立（逐条）

| 项 | 状态 |
|---|---|
| `references/` 目录（文献存放） | ❌ **不建立** |
| PDF import | ❌ **不实现** |
| PDF parser | ❌ **不实现** |
| chunk store | ❌ **不建立** |
| embedding store | ❌ **不建立** |
| research search | ❌ **不实现** |
| literature citation | ❌ **不实现** |
| paper viewer | ❌ **不实现** |
| 正式数据实体 `ResearchDocument` / `Chunk` / `Citation` | ❌ **不新增** |

### J.3 🔴 UI 层不得新增

❌ 「上传论文」 ❌ 「知识库」 ❌ 「文献库」 ❌ 「论文问答」 —— **不得在 UI 中出现**。
❌ **不得增加对应 P0 `AC`**。

---

## K. Configurable LLM

> **性质**：`D-053` 已确认 **LLM 可配置**；**Provider Adapter / Provider Abstraction 必须保留**。🔴 **`D-053` 没有确认 LLM 请求的最终网络路径** ⇒ `TQ03` 仍须重新收敛（见 §L）。

### K.1 逻辑配置项（至少）

| 配置 | 说明 |
|---|---|
| `provider` | 供应商标识（**不得锁死任何单一厂商**） |
| `base_url` | 可自定义的服务地址（🔴 自定义 `base_url` 直接触发 §L.3 的 SSRF / Open Proxy 分析） |
| `model` | 模型标识 |
| `credential` | 凭据（🔴 **存储方式 = `DECISION REQUIRED`**，见 §U） |

### K.2 🔴 不得锁死任何单一模型厂商

❌ 不得锁死 DeepSeek / OpenAI / Anthropic / 任何单一模型厂商。
✅ **必须保留 `Provider Adapter` / `Provider Abstraction`**。

### K.3 与既有 AI 能力的关系

- `A1` 结构化解析 → 需要 LLM；
- `A2` 失败原因分析 → 需要 LLM；
- `A3` 相关性判定 → **`TQ04` 未裁决**；若采用 `R-A` 的 LLM 辅助分支，才需要 LLM；
- `A4` 经验提炼 / `A5` 假设生成 → 需要 LLM（**Grounded Generation 层**，见 `docs/06`）。
- 🔴 **模型 / prompt / token / temperature / 内部检索分数等技术字段不得进入产品层 L4、不得进界面**（`D-044`）。

---

## L. Credential / Network Path Analysis

> **性质**：本节为 **Integrator `PROPOSED` 分析**（比较候选、给出推荐、**不代裁**）。🔴 **本节不 `CONFIRM` `TQ03`、不 `CONFIRM` 任何凭据存储方案。**

### L.1 `TQ03` 重新基线｜LLM Request Path

**新的候选空间（三项）**：

```
A. Browser Direct      —— 浏览器直接调用 LLM Provider
B. Vercel Thin Proxy   —— 请求经 Vercel Serverless Function 转发
C. Provider-dependent Hybrid —— 按 provider 能力混合（部分可直连、部分需代理）
```

**比较维度（逐项，`PROPOSED`）**：

| 维度 | A｜Browser Direct | B｜Vercel Thin Proxy | C｜Hybrid |
|---|---|---|---|
| **API Key 暴露风险** | 🔴 **高** —— Key 必须进入浏览器运行时；用户可在 DevTools / 扩展 / 本地存储中读取；**无法对用户保密** | 🟢 **低** —— Key 存在服务端环境变量；浏览器不接触 | 🟡 **依 provider 而异** —— 需逐 provider 判定 |
| **CORS** | 🔴 **必须由 provider 允许浏览器跨域** —— 不可控；多数 provider 允许但**不支持自定义 `base_url` 的第三方端点未必允许** | 🟢 **无 CORS 约束**（同源） | 🟡 混合 |
| **Provider compatibility** | 🟡 依赖 provider 的浏览器策略 | 🟢 通用 | 🟢 最广 |
| **Vercel limitations** | 🟢 不占 Vercel 配额 | 🟡 受 Serverless Function 执行时长 / 并发 / 配额限制 | 🟡 部分受限 |
| **Latency** | 🟢 最优（一跳） | 🟡 增加一跳（+ 冷启动可能） | 🟡 混合 |
| **Privacy（数据可见面）** | 🔴 用户上下文由浏览器直接发出；**但 Key 在客户端** ⇒ 若用户使用**他人 Key** 则有被窃风险 | 🟡 上下文经 Vercel 中转（**增加一个数据可见方**） | 🟡 混合 |
| **User configuration UX** | 🟢 最简单（填 Key 即用） | 🟡 需要 Vercel 端配置 Key（**评委无法自带 Key**） | 🟡 较复杂 |
| **自定义 `base_url`** | 🟡 浏览器直连自定义端点 ⇒ 受 CORS 限制 | 🔴 **直接触发 SSRF / Open Proxy 风险**（见 §L.3） | 🔴 同 B |
| **SSRF / Open Proxy 风险** | 🟢 **无**（浏览器直连，不经我们的服务端） | 🔴 **有**（必须设计防护，见 §L.3） | 🔴 有（同 B） |
| **Demo 可靠性** | 🟡 依赖用户自备 Key | 🟢 可预置服务端 Key ⇒ **评委零配置** | 🟡 混合 |

**关键约束（来自用户级硬规则与项目规则）**：
- 用户**以本人登录为主**，**不提供主账号长期密钥**；
- **凭据不得写入任何文件 / 日志 / 报告 / 前端产物**；
- **AI 不持有任何控制台登录态**。

**`PROPOSED` 推荐（非裁决）**：

```
PROPOSED TQ03 推荐 = C（Provider-dependent Hybrid）的收窄形态：
  · 默认路径 = Browser Direct（用户自带 Key，Key 只在浏览器端）
  · 仅当 provider 不支持浏览器跨域时，才启用 Vercel Thin Proxy（且必须实现 §L.3 的防护）
  · 不预置任何服务端 Key（Demo 由评委自带 Key 或使用 Demo Workspace 的只读展示路径）
```

**理由（`PROPOSED`）**：
- Local-first 的核心主张是"**数据在用户本地**"；若默认走服务端代理，则**每次 AI 调用都会把用户上下文送到第三方中转**，与该主张的张力较大；
- Bundle / 前端产物**绝不允许**携带 Key；Browser Direct 天然满足"Key 不进前端产物"（Key 由用户在运行时输入，**属运行时内存，不属构建产物**）；
- Demo 可靠性可通过 **Demo Workspace + 无 AI 的只读展示路径** 部分兜底（🔴 但 **`D9` ⑧⑨ 的完整演示仍需 LLM** ⇒ 这属 `SP-06` 需验证的**演示风险**，见 §Q / §U）。

**🔴 未决**：**不 `CONFIRM` `TQ03`**；**最终选择输出为 `DECISION REQUIRED`（见 §U）**。

### L.2 Credential Persistence｜候选

| 编号 | 方案 | 说明 |
|---|---|---|
| **`K-A`** | **memory / session only** | Key 只存在内存 / 会话存储；**页面刷新或关闭即失效** |
| **`K-B`** | **browser-local persistence** | Key 存于浏览器本地持久化存储（如 IndexedDB / `localStorage`）；**刷新后仍可用** |
| **`K-C`** | **其它 Web 可行安全方案** | 例如：用户自管凭据文件（用户选择本地文件读取 Key）／浏览器凭据管理器集成／临时短时令牌 —— **均需评估可行性与复杂度** |

**比较（`PROPOSED`）**：

| 维度 | `K-A` memory / session only | `K-B` browser-local persistence | `K-C` 其它 |
|---|---|---|---|
| **安全（本机被他人使用）** | 🟢 最安全（关页即失效） | 🔴 明文 / 半明文落盘，**本机其它进程可读** | 🟡 视方案 |
| **评委体验** | 🔴 每次刷新需重填 Key | 🟢 一次配置、多次使用 | 🟡 视方案 |
| **实现成本** | 🟢 最低 | 🟢 低 | 🔴 中～高 |
| **与"凭据不得落入文件"的关系** | 🟢 不落盘 | ⚠️ **落盘但属"用户自己的浏览器本地存储"，不是我们的文件 / 日志 / 前端产物** —— 🔴 **须明确区分：这条红线针对"我们产出的文件 / 仓库 / 报告 / 前端 Bundle"，不针对用户浏览器自身的本地存储选择** | 🟡 视方案 |
| **是否影响安全 / 隐私 / 评委体验** | ✅ 影响 | ✅ 影响 | ✅ 影响 |

**`PROPOSED` 推荐（非裁决）**：**`K-A` 为默认 + `K-B` 作为用户显式勾选的"记住"选项**（🔴 默认不记住；**不得默认持久化**）。

**🔴 未决**：**如该选择明显影响安全 / 隐私 / 评委体验 ⇒ 输出 `DECISION REQUIRED`**（见 §U），**不自动决定**。

### L.3 🔴 SSRF / Open Proxy 防护要求（仅当采用 Vercel Thin Proxy）

> 若采用 `Vercel Thin Proxy + 用户任意 `base_url``，**必须分析并防护以下全部项**。🔴 **不得设计成"用户输入任意 URL，Vercel 无条件代请求"。**

| 风险 | 必须的防护 |
|---|---|
| **SSRF** | 服务端**不得**按用户输入无条件发起请求；必须经 URL 解析 + 策略校验 |
| **Open Proxy** | 代理**不得**成为任何第三方可用的开放转发器（须限方法 / 限目标 / 限响应） |
| **内网地址访问** | **禁止**目标为私有网段（`10/8`、`172.16/12`、`192.168/16`、`127/8`、`169.254/16` 等） |
| **metadata endpoint** | **禁止**云厂商元数据地址（如 `169.254.169.254` 及其等价物） |
| **协议限制** | **仅允许 `https`**（🔴 **禁 `http`**、禁 `file:` / `gopher:` / `ftp:` 等） |
| **host allowlist** | **必须**采用**显式 host allowlist**（或等价的白名单策略）；**不得**采用"黑名单 + 默认放行" |
| **URL validation** | 必须做完整解析（scheme / host / port / path / 重定向链）并**禁止跟随到 allowlist 之外的重定向** |
| **其它** | 限制请求体大小 / 超时；不转发任意自定义请求头（🔴 防止头注入 / 凭据透传）；不返回原始错误细节 |

**降级路径（🔴 `PROPOSED`）**：若实现完整的 SSRF 防护成本过高 ⇒ **可放弃"用户任意 `base_url`"能力**，改为**预置 provider 列表 + 官方端点**，用户只填 Key。

---

## M. Vercel Demo Architecture

> **性质**：`D-053` 已确认 **Vercel 的定位**；本节给出**架构描述**（`PROPOSED`）。

### M.1 Vercel 的正式定位（`CONFIRMED`）

```
Vercel = 评委访问产品 Web UI 的 Demo / Review Deployment Target
```

| 🔴 不得写成 | 说明 |
|---|---|
| **Production SaaS Infrastructure** | ❌ |
| **产品主数据存储平台** | ❌ |

🔴 **不得因为 Vercel 可部署 Serverless Function 就自动引入**：云数据库 / 用户账号数据库 / 云端 Workspace / 服务端永久科研数据存储。

### M.2 目标体验（`PROPOSED`）

```
评委打开 URL
   → 进入产品
   → 打开 Demo Workspace  ［Option 1］
     或 选择自己的 Workspace  ［Option 2］
   → 配置 / 使用 LLM
   → 体验 D9
```

🔴 **浏览器能否直接打开预打包目录、首次授权 UX 需 `SP-06` 验证**（见 §Q `S6-01`）；🔴 **不得本轮写死具体交互**。

### M.3 部署目标问题（`DEPLOYMENT TARGET ISSUE` 预留）

- 若 Vercel 当前免费计划 / 使用条款 / 额度后续**不满足比赛场景** ⇒ **报告 `DEPLOYMENT TARGET ISSUE`**；
- 🔴 **不得偷偷改收费方案**；
- 🔴 任何付费变更**须按成本纪律先报「资源 + 规格 + 预计费用」并等【再次确认】。

### M.4 与 Demo 数据的关系

- Demo 数据**不再是云数据库 seed**，改为 **Local Demo Workspace**（见 `docs/05` / `docs/03`）；
- 🔴 仍必须满足 `D8` / `TQ10`：Demo 数据明确标 Demo、live input 明确标 live / user、reset 仍是**演示运维动作**、seed **不预置不该预置的对象**（🔴 **不得预置 `Insight` / `Hypothesis` / `EvidenceRef` / 派生结果** —— 预置即等于伪造"系统曾经推理过"）。

---

## N. Security / Privacy

### N.1 🔴 必须明确区分的两件事

| 层 | 内容 |
|---|---|
| **A. Local Persistence** | **科研主文件默认保存在用户本地**（Workspace 目录；由用户主动选择与授权） |
| **B. LLM Transmission** | 为完成 AI 步骤，**必要上下文可能发送到用户配置的 LLM Provider** |

### N.2 🔴 不得宣称（除非未来真正实现对应模式）

❌ 100% offline ❌ zero data transmission ❌ absolute privacy

🔴 **以上三项均为禁止表述**（当前架构下必然存在 LLM 传输）。

### N.3 设计原则（`PROPOSED`）

1. **只发送完成当前 AI 操作所需的最小必要上下文**；
2. 🔴 **不得默认上传整个 Workspace**；
3. **发送内容按 §I 的 Grounding Context Pack 分区组装**（保留来源边界、不含数值相似度、不含技术层字段）；
4. **传输面须可解释**：用户应能知道"本次 AI 操作会把哪些内容发出去"（🔴 **具体呈现形态留 `08_UI_SPEC.md`**）；
5. **凭据与数据分流**：凭据**绝不**出现在发送给 provider 的**业务上下文**中（除 provider 自身的鉴权头）；🔴 **不得把数据库连接串 / 云凭据 / 其它 Secret 混入 Pack**。

---

## O. Old SP-01a Supersession

> 🔴 **本节必须严格修正、不得简化。** 未执行任何资源删除动作；仅登记状态变更。

### O.1 🔴 明确禁止的错误表述

| ❌ 禁止写 | 原因 |
|---|---|
| 「`SP-01a` **从未开始**」 | 🔴 **与事实不符**：`Phase 2` 已启动、已实际创建资源 |
| 「**未创建任何云资源**」 | 🔴 **与事实不符**：`R2` / `R6-A` / `R6-B` 已 `CREATED` |

### O.2 历史事实（保留，不改写）

**旧 `SP-01a` 历史状态**：

```
SP-01a Phase 2 = 已启动
SP-01a        = 尚未完成 / 尚未 PASS
CREATE AUTHORIZATION = GIVEN（2026-09-20，人工原话「A：确认创建」）
```

**旧 `SP-01a` 已产生的全部历史事实（逐项）**：

| # | 事实 | 状态 |
|---|---|---|
| 1 | `R2` CloudBase Environment | `CREATED` |
| 2 | `R6-A` VPC | `CREATED` |
| 3 | `R6-B` Subnet | `CREATED` |
| 4 | `R6-C` Security Group | `AUTHORIZED` / `IN CONFIGURATION` / **`NOT YET CONFIRMED CREATED`**（按当前项目文件口径） |
| 5 | `R3` TencentDB PostgreSQL | `PRE-CREATE` = `NOT CREATED` = `NOT BILLING` |
| 6 | `R1` SCF | `NOT CREATED` |
| 7 | Function URL | `NOT ENABLED` |
| 8 | `R2` Static Hosting | `NOT INITIALIZED` |
| 9 | `30_SPIKES/sp01a_probe/` | 已生成 disposable probe（6 文件，`DISPOSABLE / NON-PRODUCTION`） |
| 10 | `S-01`–`S-07` | `NOT EXECUTED` |

### O.3 `D-053` 对 `SP-01a` 的影响（🔴 立即生效）

1. 旧 Cloud-centric `SP-01a` **不再是当前 V1 的 Gate B 前置证据**；
2. 🔴 **立即停止其后续创建链**；
3. 🔴 **不得继续**：
   - 创建 `R3` PostgreSQL；
   - 创建 `R1` SCF；
   - 启用 Function URL；
   - 初始化旧 `R2` 静态托管 Probe；
   - 部署旧 Probe；
   - 执行旧 `S-01`–`S-07`。

### O.4 `SP-01a` 的当前状态（🔴 两项合一，缺一不可）

```
SP-01a = SUPERSEDED BY D-053
       / INCOMPLETE HISTORICAL SPIKE
```

| 项 | 口径 |
|---|---|
| **历史 Phase 2 事实** | ✅ **全部保留**（见 §O.2） |
| **`SUPERSEDED`** | ✅ 已登记 |
| 🔴 **不得写成 `FAIL`** | **架构改变不是探针验证失败** —— `SP-01a` 从未执行到判定阶段，**不存在"验证失败"结论** |
| **`SP-01` 整体** | `NOT COMPLETE`（`SP-01b` 从未开始，且其定义已被 `D-053` 取代） |
| **对 `TQ01`–`TQ05`** | 未产生任何 `CONFIRM` |

### O.5 Probe 历史文件处置（`30_SPIKES/sp01a_probe/`）

| 动作 | 允否 |
|---|---|
| 保留 | ✅ **必须保留** |
| 删除 | ❌ **不得删除** |
| 迁入正式 `src/` | ❌ **不得迁入** |
| 标记 | ✅ **`HISTORICAL` / `DISPOSABLE` / `NON-PRODUCTION` / `SUPERSEDED BY D-053`** |
| 作为新 Local-first 正式代码 | ❌ **不得作为** |

> 🟢 **标注方式（🔴 本轮）**：标注**只落在本文件**（`README.md` 本体**未修改**）—— 以符合「不就地改写历史产物」的约束。**若项目负责人希望把该标注直接写入 `sp01a_probe/README.md`，可另行指示。**

---

## P. Legacy Cloud Cleanup Plan

> 🔴 **本轮禁止**：删除 `R2` / 删除 `R6-A` / 删除 `R6-B` / 删除 `R6-C`（若实际已存在） / 清空任何云环境。
> 🔴 **本计划 = 已生成 / 未执行**；**资源清理需要项目负责人另行明确批准**；**本任务不得自动清理**。

### P.1 遗留资源清单

| 资源 | 当前仓库状态 | 是否可能持续计费 | 是否仍有其它用途 | 删除前检查项 |
|---|---|---|---|---|
| **`R2`** CloudBase 静态托管独立环境（上海） | `CREATED`（静态托管 `NOT INITIALIZED`） | 🟢 **否**（免费体验版 0 元 / 不自动续费 / 有效期至 2027-03-20） | 🟡 **可能有** —— 若未来需要"云托管静态页"作为备选部署目标 | ① 确认无探针页已部署 ② 确认 bundled PostgreSQL **未**被使用（已冻结） ③ 记录环境到期时间 |
| **`R6-A`** 广州 VPC | `CREATED` | 🟢 **否**（VPC 基础功能免费） | 🟡 低（`SP-01a` 专用命名） | ① 确认无其它资源挂载 ② 名称含 `sp01a` ⇒ 属一次性探针资源 |
| **`R6-B`** 广州子网 | `CREATED` | 🟢 **否**（子网免费） | 🟡 低（同上） | ① 确认无 `R3` / `R1` 挂载（`R3` 未创建、`R1` 未创建） |
| **`R6-C`** 广州安全组 | 🔴 **`AUTHORIZED` / `IN CONFIGURATION` / `NOT YET CONFIRMED CREATED`** | 🟢 **否**（安全组免费） | 🟡 低 | 🔴 **第一步：先由项目负责人确认其"实际是否存在"** —— 仓库口径为"未确认创建成功"，**不得假设其存在，也不得假设其不存在**；若存在 ⇒ 检查入站规则是否仍仅 `10.20.1.0/24 → TCP 5432` |
| **`R3`** TencentDB PostgreSQL | `PRE-CREATE`（**未创建**） | 🟢 **否**（未创建 ⇒ 未起计费） | — | **无需删除**（不存在）；🔴 **确认未产生任何按量计费** |
| **`R1`** SCF + Function URL | `NOT CREATED` / `NOT ENABLED` | 🟢 **否** | — | **无需删除**（不存在） |
| **遗留费用项** | — | 🟡 **SCF 0 元新客试用套餐**（已购，0 元） | — | 确认 0 元套餐到期时间（2026-12-20 14:00:04）与**是否存在扣费风险** |

### P.2 建议删除顺序（🔴 **仅建议，未执行，须另行批准**）

```
0. 【前置】项目负责人确认 R6-C 实际是否存在
        ↓
1. 先删 R3 / R1 的"若存在"分支（本计划中二者未创建 ⇒ 跳过）
        ↓
2. 删除 R6-C 安全组（若存在）            ← 依赖关系：安全组
        ↓
3. 删除 R6-B 子网                        ← 依赖关系：子网依赖 VPC
        ↓
4. 删除 R6-A VPC                         ← 必须最后删（子网 / 安全组归属于它）
        ↓
5. 处理 R2 CloudBase 环境（可选保留）
        ↓
6. 费用中心 / 账单页复核：确认无持续计费项
```

🔴 **删除顺序原则**：**先上层依赖、后下层承载**（安全组 / 子网 → VPC）。🔴 **不得并行删除**。

### P.3 🔴 清理的硬约束

1. **必须由项目负责人另行明确批准**；
2. **批准前不得执行任何删除 / 清空动作**；
3. **删除前必须逐项列清单并经确认**；
4. **不得由 AI 代为在控制台执行**（AI 不持有登录态）；
5. 🟠 **删除后须在费用中心 / 账单页实测复核"已停止计费"**；
6. 🔴 **`R6-C` 若"实际不存在" ⇒ 该项在清单中标为 `NOT PRESENT`，不得写成"已删除"**。

---

## Q. SP-06 Test Plan

> 🔴 **本轮只写 Test Plan，不执行。**
> 🔴 **不创建 `SP-LF-01` 或任何第二套编号体系** —— `SP-01` 已占用 / `SP-02` 已预留 / `SP-03` 已使用 / `SP-04` 已预留 / `SP-05` 已预留 ⇒ **新编号 = `SP-06`**。
> **Plan 文件**：`30_SPIKES/local_first/SP-06_LOCAL_FIRST_FEASIBILITY_PLAN.md`（**本轮新建**）。

### Q.1 `SP-06` 定位

```
SP-06｜Local-first Browser Workspace & Vercel Feasibility
```

- 性质：**`DISPOSABLE TECHNICAL SPIKE`**（`DISPOSABLE / NON-PRODUCTION`）；
- 🔴 **`SP-06` 不测试**：正式 UI 完成度 / 正式业务代码 / 完整 production security；
- 🔴 **`SP-06` 本轮 = 未执行**。

### Q.2 测试目标（20 项，S6-01 – S6-20）

| 编号 | 测试目标 |
|---|---|
| `S6-01` | Vercel HTTPS 页面**是否可触发** Workspace folder picker |
| `S6-02` | **Chrome** 支持情况 |
| `S6-03` | **Edge** 支持情况 |
| `S6-04` | 用户授权后**读取本地文件** |
| `S6-05` | **创建 Attempt 文件** |
| `S6-06` | **修改文件并实际落盘** |
| `S6-07` | **`EvidenceRef` / stable local ID 可追踪性** |
| `S6-08` | **页面刷新后**的 handle / permission 行为 |
| `S6-09` | **关闭浏览器再打开后**的行为 |
| `S6-10` | 用户**撤销权限** |
| `S6-11` | Workspace 文件**损坏** |
| `S6-12` | Workspace 被**移动 / 删除** |
| `S6-13` | **20 条 Attempt** retrieval |
| `S6-14` | **100 条 Attempt** retrieval |
| `S6-15` | **Structured Experience RAG 在无数据库情况下**完成 `Retrieve → Context Pack → Candidate Insight → Hypothesis → EvidenceRef` |
| `S6-16` | **`R-A` 技术路线**在 Browser / application layer 是否可行 |
| `S6-17` | **Configurable Provider 最小 adapter** 验证 |
| `S6-18` | **Browser Direct vs Thin Proxy** 的 CORS / Key / privacy 验证 |
| `S6-19` | Vercel 环境**不保存整个 Workspace** |
| `S6-20` | **无 PostgreSQL 仍能跑通 `D9`** 的技术可行性 |

### Q.3 执行 Gate（🔴）

- 本轮**只形成** Plan 文件，**不得执行**；
- **Integrator 判断**：`SP-06` **是 Gate B 前 P0 必须证据**（理由：`TQ05` 的 Vercel 可行性与 `TQ01`/`TQ03` 的浏览器侧可行性**均无法在文档层收敛**，且 `SP-06` 直接决定"评委能否体验产品"这一 V1 首要目标）；
- ⇒ **报告中写 `SP-06 EXECUTION APPROVAL REQUIRED`**，**由项目负责人另行批准**；
- 🔴 **不得自动跑**。

### Q.4 `SP-06` 与 File System fallback 的关系（🔴 不自动决定）

若目标浏览器不支持主 Workspace API，可分析：

| 候选 | 说明 |
|---|---|
| **A** Folder Import | 一次性读取整个目录（可读、不可写回） |
| **B** ZIP Import / Export | 打包导入 / 导出 |
| **C** File Upload | 单文件上传 |
| **D** Local Companion Runtime | 本地伴随进程（🔴 成本最高，需单列评估） |

🔴 **本轮不得自动 `CONFIRM` 任何 fallback**；🔴 **只有当 `SP-06` 证明主方案存在影响比赛演示的兼容性问题**，才提交 `DECISION REQUIRED` 给项目负责人裁决。

---

## R. `TQ01`–`TQ05` Rebaseline

> 🔴 **五项均未 `CONFIRM`。** 本节只重新基线"问题空间"，**不代裁**。

### R.1 `TQ01`｜技术栈与运行形态（重新基线）

| 项 | 内容 |
|---|---|
| **原问题** | Cloud Serverless Monolith vs Long-running Monolith |
| **🔴 原候选空间状态** | **不再是主要候选空间** —— `D-053` 已人工确认 Local-first Web App |
| **新问题** | 前端主导 Local-first Web **+ 是否需要 Thin Server Layer** **+ 具体 Web stack** |

**可由技术层继续分析（🔴 不升级用户 Decision）**：

| 项 | 归属 | 说明 |
|---|---|---|
| React / Next.js / Vue 等框架选择 | Integrator / 实现层 | **属实现参数**（原 `TQ01` 已确立"形态与框架名分层，框架不作独立人工决策项"） |
| state management | Integrator / 实现层 | 同上 |
| routing | Integrator / 实现层 | 同上 |
| local service abstraction | Integrator / 实现层 | 同上 |

**🔴 升级条件（唯一）**：若某选择会改变 ① 产品行为 ② **安全边界** ③ **数据位置** ④ **LLM Key 边界** ⇒ **升级用户 Decision**。除此之外**由技术层收敛**。

**未决子问题（`PROPOSED`，待 `SP-06` 后收敛）**：是否需要 Thin Server Layer（若 `TQ03` 选择 Thin Proxy 则**隐含需要**；若选择 Browser Direct 则**可能不需要**）。

### R.2 `TQ02`｜数据持久化（重新基线）

| 项 | 内容 |
|---|---|
| **D-053 已确认** | **Primary Persistence = Local Workspace Files** |
| **原方案状态** | **Managed PostgreSQL 作为 V1 Primary = `SUPERSEDED BY D-053`** |

🔴 **正确表述（强制）**：

> 「**原方案在 Cloud-centric 架构中合理，但已因人工架构转向不再作为 V1 Primary。**」

🔴 **不得说 PostgreSQL 技术错误**；🔴 **不得删除历史分析**。

**仍需技术落地（Integrator 收敛）**：

| 候选 | 说明 |
|---|---|
| **Markdown only** | 全部内容用 Markdown（含 front-matter）表达 |
| **Markdown + JSON metadata** | 正文用 Markdown，结构化元数据用 sidecar JSON |
| **其它本地文件组织** | 例如统一 JSON / 单文件聚合 / 目录索引等 |

🔴 **若只是实现细节 ⇒ Integrator 收敛即可**（**不升级用户 Decision**）。

### R.3 `TQ03`｜LLM 接入（重新基线）

| 项 | 状态 |
|---|---|
| **Configurable LLM + Provider Abstraction** | ✅ **已由 `D-053` 确认** |
| **Browser Direct vs Vercel Thin Proxy vs Hybrid** | 🔴 **未确认** |
| **Credential persistence** | 🔴 **未确认** |

🔴 **这两项如果不能由既有约束唯一推出 ⇒ 输出 `DECISION REQUIRED`**（见 §U，**格式已按 §U 给出**）。🔴 **不得替项目负责人 `CONFIRM`。**

### R.4 `TQ04`｜检索路线（重新基线）

| 项 | 状态 |
|---|---|
| **产品架构采用 Structured Experience RAG** | ✅ **已由 `D-054` 确认** |
| **不等于确认 `R-A` / `R-B` / `R-C`** | 🔴 **正确** |
| **`R-A` / `R-B` / `R-C` 重新比较** | 见 **§H.3**（**必须显式引用 `D-050` / `SP-03` / `SP-03R` / Local-first 约束**） |

🔴 **重点分析 = 是否真的需要 embedding** ⇒ **结论（`PROPOSED`）= `R-A` 仍最好**（见 §H.3 理由）。

🔴 **写法要求**：**只能写「`PROPOSED R-A`」**，**不得写 `CONFIRMED`**；🔴 **不得因为产品叫 RAG 就认为 `R-B` 必须胜出**。

### R.5 `TQ05`｜部署与在线 Demo（重新基线）

| 项 | 状态 |
|---|---|
| **Review / Demo Web 优先部署到 Vercel** | ✅ **已由 `D-053` 确认** |
| 🔴 **但这里的 Vercel 只是评委 Web 入口** | **不得写 `Production SaaS Platform`** |
| **仍要验证** | HTTPS / File System API / Serverless proxy / CORS / quota / Demo availability ⇒ **`SP-06`** |
| 🔴 **不得继续把腾讯云 SCF / CloudBase / TencentDB 设为 V1 必须依赖** | —— |

**原 `TQ05` 候选状态**：`D-A`（首选）/ `D-C`（等价备用）/ `D-B`（仅在被明确要求时）= 🔴 **`SUPERSEDED BY D-053`**（云托管平台候选空间失效）；**历史分析保留不改写**。

### R.6 `TQ01`–`TQ05` 状态汇总

| 编号 | 主题 | 新状态 |
|---|---|---|
| `TQ01` | 技术栈与运行形态 | 🟡 **重新基线；主体（Local-first Web）已由 `D-053` 确认；余项 Integrator 收敛**；**框架 / 状态库 / 路由 = 实现参数** |
| `TQ02` | 数据持久化 | 🟡 **重新基线；Primary = Local Workspace Files（`D-053`）；Markdown / JSON 组织方式 = Integrator 收敛** |
| `TQ03` | LLM 接入路径 | 🔴 **`PROPOSED` / 未裁决** ⇒ **`DECISION REQUIRED`** |
| `TQ04` | 检索技术路线 | 🔴 **`PROPOSED` / 未裁决**；**`PROPOSED` 推荐 = `R-A`** |
| `TQ05` | 部署与 Demo | 🟡 **重新基线；Vercel = Demo 入口（`D-053`）；可行性待 `SP-06`** |

---

## S. Canonical Delta

> **本轮 canonical 侧的变更清单**（`PROPOSED` 除注明外；🔴 未确认项不得伪装已定稿）。

| # | 文件 | 变更 |
|---|---|---|
| 1 | `docs/DECISIONS.md` | ✅ **新增 `D-053`（`CONFIRMED`）+ `D-054`（`CONFIRMED`）**；更新编号空间列举 |
| 2 | `docs/07_TECH_ARCHITECTURE.md` | 🔵 **重写架构基线为 `D-053` / `D-054` 后状态**；未确认项标 `PROPOSED` / `DECISION REQUIRED` |
| 3 | `docs/03_V1_SCOPE.md` | 🔵 追加 S00-03 Pivot 范围章节（In / Out 更新） |
| 4 | `docs/04_USER_FLOW.md` | 🔵 追加 Workspace 选择与 LLM 配置在主链中的位置（**不新增 `D9` 步骤**） |
| 5 | `docs/05_DATA_MODEL.md` | 🔵 追加 **Persistence Mapping** 章节 |
| 6 | `docs/06_AI_CAPABILITIES.md` | 🔵 `A3` 补架构术语 **Structured Experience Retrieval**；`A4`/`A5` 补 **Grounded Generation**；**产品层用语不变** |
| 7 | `docs/08_UI_SPEC.md` | 🔵 新增 **Workspace Entry** 概念（4 项） |
| 8 | `docs/09_TEST_PLAN.md` | 🔵 **顺延新增 `AC-127`–`AC-143`（17 项）** |
| 9 | `docs/CHANGELOG.md` | 🔵 新增本轮条目 |
| 10 | `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md` | 🔵 **`v0.2.5` → `v0.2.6 DRAFT`**（`D-053` + `D-054` 对齐版） |
| 11 | `20_INTEGRATION/S00-03_技术决策包.md` | 🔵 追加 Pivot 章节（`TQ01`–`TQ05` 重新基线 + `SP-01a` supersede） |
| 12 | `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md` | ✅ **本文件（新增）** |
| 13 | `30_SPIKES/local_first/SP-06_LOCAL_FIRST_FEASIBILITY_PLAN.md` | ✅ **新增（Plan only）** |
| 14 | `.learnbuddy/memory/MEMORY.md` / `DECISION_INDEX.md` / `2026-09-24.md` | 🔵 同步 |

### S.1 🔴 明确未变（防误伤核对）

1. `D9` 十步结构与编号**不变**；
2. `Attempt` / `Insight` / `Hypothesis` / `EvidenceRef` 逻辑对象**不变**；
3. `Fact` / `Extraction` / `Inference` 来源边界**不变**；
4. `Draft` / `Formal`、archive 语义**不变**；
5. `Level A` / `Level B` / `Level C`**不变**；
6. `N_检索` / `N_引用` 定义与计入规则**不变**；
7. `History-grounded Hypothesis` 定义**不变**；
8. `D-039`–`D-052` / `ADJ-01` / `Q16` **全部不变**；
9. `Experience Asset` = `accepted Insight` 视图（**非独立对象**）**不变**；
10. `TQ01`–`TQ05` **均未 `CONFIRM`**。

---

## T. AC Delta

### T.1 编号空间

```
原最大 canonical AC = AC-126
新增范围            = AC-127 – AC-143（共 17 项，顺延）
新总数（AC 有效）   = 143
                      = AC-01–AC-126（连续 126 项）
                      + AC-Q06-1 – AC-Q06-6（6 项）
                      + AC-127 – AC-143（17 项新增）
🔴 不得重排 AC-01 – AC-126；🔴 不得改写任何既有 AC 编号
```

### T.2 新增构成

| 分组 | 编号 | 数量 | 覆盖 |
|---|---|---|---|
| **Local-first** | `AC-127` – `AC-138` | 12 | 见 §T.3 |
| **Structured Experience RAG** | `AC-139` – `AC-143` | 5 | 见 §T.4 |

> 🔴 **不为了"凑数量"机械创建 `AC`** —— 每条均对应 `D-053` / `D-054` 已确认的**用户可感知行为或产品约束**。

### T.3 Local-first 组（`AC-127` – `AC-138`）

| 编号 | 验收点 |
|---|---|
| `AC-127` | Workspace **必须由用户主动选择 / 授权** |
| `AC-128` | **未授权时不得读取本地目录** |
| `AC-129` | **Primary data persistence = local workspace** |
| `AC-130` | **云 PostgreSQL 不是 V1 required dependency** |
| `AC-131` | **Vercel 不保存 Workspace canonical** |
| `AC-132` | **LLM 可配置**（provider / base_url / model / credential 可配置，不锁死单一厂商） |
| `AC-133` | **Key 不写入 Workspace** |
| `AC-134` | **Key 不进入 Git / public bundle** |
| `AC-135` | **Demo data source nature 不变**（Demo / live 标注与 `D8` 一致） |
| `AC-136` | **无云 DB 可完成 `D9`** |
| `AC-137` | **Workspace 文件承载 stable ID 与引用可追踪性**（文件改名不破坏逻辑引用） |
| `AC-138` | **归档对象仍保留**（Local-first 下仍无物理删除） |

### T.4 Structured Experience RAG 组（`AC-139` – `AC-143`）

| 编号 | 验收点 |
|---|---|
| `AC-139` | **Retrieval evidence 必须来自既有合法历史 `Formal Attempt`** |
| `AC-140` | **RAG 不改变 `N_检索` 与 `N_引用`** |
| `AC-141` | **RAG 不改变 `History-grounded` 定义**；**Research Document 不计入 `N_检索` / `N_引用` / `History-grounded`** |
| `AC-142` | **`ResearchContextProvider` 仅 RESERVED；V1 不出现论文知识库 / 文献库 / 文献检索等用户功能** |
| `AC-143` | **不因 RAG 引入 numeric similarity；`EvidenceRef` 仍承担可追溯** |

> 🔴 **`AC-127`–`AC-143` 的完整判定标准见 `docs/09_TEST_PLAN.md`**（唯一动态来源）。

---

## U. DECISION REQUIRED

> 🔴 **`D-053` / `D-054` 已经人工 `CONFIRMED`，不得再次询问。**
> 本节仅针对**尚未确认**事项输出。

### U.1 数量与标题

```
DECISION REQUIRED = 2
  ① 【DECISION REQUIRED｜LLM Request Path】
  ② 【DECISION REQUIRED｜Credential Persistence】
```

> 🟢 **就地补注（2026-09-24，`D-055` / `D-056` Landing；按「不改写历史」保留上框原文）**：上框为 **本文件撰写时点（`D-053` / `D-054` 落盘后）**的状态。**两项其后均已由项目负责人人工裁决关闭**：
>
> | 原 `DECISION REQUIRED` | 人工裁决 | 落盘 Decision | 状态 |
> |---|---|---|---|
> | ① LLM Request Path | **C｜`Provider-dependent Hybrid`** | **`D-055`** | ✅ **`CONFIRMED`** |
> | ② Credential Persistence | **A｜`Session-only Credential`** | **`D-056`** | ✅ **`CONFIRMED`** |
>
> **当前 `DECISION REQUIRED` = 0**（本节 U.2 / U.3 的两个候选框**保留为历史候选空间**，🔴 **不得作为实现依据**）；**其正式规则见 §W**。
> 🔴 **`TQ03` 整体仍未 `CONFIRM`** —— **子项已裁决 ≠ `TQ03` 已裁决**；仍须 **`SP-06` 实测证据 + Gate B**。

### U.2 【DECISION REQUIRED｜LLM Request Path】

```
问题  ：V1 中 LLM 请求的网络路径应选择哪一条？
        （D-053 只确认「LLM 可配置 + 保留 Provider Abstraction」，
          未确认请求路径 ⇒ 本项无法由既有约束唯一推出）

A     ：Browser Direct —— 浏览器直接调用 LLM Provider
B     ：Vercel Thin Proxy —— 请求经 Vercel Serverless Function 转发
C     ：Provider-dependent Hybrid —— 按 provider 能力混合

影响  ：① API Key 暴露风险面（A 高 / B 低 / C 依 provider）
        ② CORS 约束（A 受 provider 策略限制 / B 无 / C 混合）
        ③ 隐私：数据可见方数量（B 增加一个中转方）
        ④ 自定义 base_url 是否可行（B 直接触发 SSRF / Open Proxy 风险，须完整防护）
        ⑤ Demo 可靠性（B 可预置服务端 Key ⇒ 评委零配置；A 需评委自带 Key）
        ⑥ Vercel 额度 / 执行时长限制（B 受限）
        ⑦ 是否需要 Thin Server Layer（影响 TQ01 余项）

PROPOSED 推荐：C 的收窄形态
        · 默认路径 = A（Browser Direct，用户自带 Key，Key 只在浏览器端）
        · 仅当 provider 不支持浏览器跨域时，才启用 B（且必须实现完整 SSRF / Open Proxy 防护，见 §L.3）
        · 不预置任何服务端 Key
        · 若 B 的完整防护成本过高 ⇒ 退化为「预置 provider 列表 + 官方端点」，放弃"用户任意 base_url"

理由  ：① Local-first 的核心主张是"数据在用户本地"，默认走服务端代理张力较大
        ② 前端产物绝不允许携带 Key；A 天然满足（Key 为用户运行时输入，不属构建产物）
        ③ A 无 SSRF / Open Proxy 风险
        ④ Demo 可靠性可由「Demo Workspace + 无 AI 只读展示路径」部分兜底
            🔴 但 D9 ⑧⑨ 的完整演示仍需 LLM ⇒ 该风险须由 SP-06 实测（见 §Q S6-17 / S6-18）

🔴 本推荐为 PROPOSED，不构成裁决、不作为实现依据
```

### U.3 【DECISION REQUIRED｜Credential Persistence】

```
问题  ：用户配置的 LLM 凭据应以何种方式持久化？

K-A   ：memory / session only（关页即失效）
K-B   ：browser-local persistence（浏览器本地持久化）
K-C   ：其它 Web 可行安全方案（用户自管凭据文件 / 浏览器凭据管理器 / 临时短时令牌等）

影响  ：① 安全（本机被他人使用时的风险）
        ② 隐私（凭据是否落盘）
        ③ 评委体验（刷新后是否需重填 Key）
        ④ 实现成本
        ⑤ 与「凭据不得写入文件 / 日志 / 报告 / 前端产物」红线的关系：
            🔴 必须明确区分 —— 该红线针对「我们产出的文件 / 仓库 / 报告 / 前端 Bundle」，
            不针对「用户自己浏览器自身本地存储的选择」

PROPOSED 推荐：K-A 为默认 + K-B 作为用户显式勾选的"记住"选项
        · 🔴 默认不记住；不得默认持久化
        · 若提供 K-B，须在 UI 明示"凭据将保存在本机浏览器中"

理由  ：① 安全默认值应偏保守
        ② 评委体验可由"记住"选项按需满足
        ③ 实现成本低

🔴 本推荐为 PROPOSED；如该选择明显影响 安全 / 隐私 / 评委体验 ⇒ 由项目负责人裁决
```

### U.4 本轮**不**升级的事项（🔴 明确记账）

以下**属实现参数，不升级给项目负责人**：

框架 / 文件名 / 目录名 / helper / parser library / state library / routing / 本地文件 schema 细节 / 具体 Markdown 结构 / 组件拆分。
🔴 **File System fallback** 亦**不升级** —— **只有 `SP-06` 证明主路径存在关键问题**才升级。

---

## V. Exception Report

### V.1 标志位

| 标志位 | 值 |
|---|---|
| `BLOCKER` | **`NO`** |
| `CCR` | **`NO`**（**未处理 CCR = 0**） |
| `PRODUCT SEMANTIC CONFLICT` | **`NO`** |
| `RESOURCE CHANGE REQUIRED` | **`RESOLVED`**（🔴 历史两次 `YES` 保留：旧 API Gateway 不可执行 / `R6-C` 新依赖；**不得写"从未发生"**）；本轮**无新增未处理项** |
| `BILLING CHANGE REQUIRED` | **`NO`** |
| `PROCESS DEVIATION` | **`YES`**（`R2` 提前手工创建；**不得隐去、不得改写为"已获创建授权"**） |
| `DECISION REQUIRED` | **`2`**（见 §U） |
| `DEPLOYMENT TARGET ISSUE` | **`NO`**（Vercel 尚未部署、未测；若后续免费计划 / 条款不满足 ⇒ 报此项） |

### V.2 冲突检查（按项目规则第七条）

| 检查项 | 结果 |
|---|---|
| 与 `docs/00_PROJECT_RULES.md` 冲突 | ❌ 无 |
| 与 `docs/DECISIONS.md` 既有 `CONFIRMED` 冲突 | ❌ 无（`D-053` / `D-054` 为**人工新增**决策，非覆盖既有） |
| 与 `docs/01`–`09` 既有 `CONFIRMED` 冲突 | ❌ 无（**本轮只做追加章节，未改写任何既有结论**） |
| 与 `00_SHARED_TECHNICAL_CONTRACT.md` 冲突 | ❌ 无（**契约并进 `v0.2.6`，为增量对齐**） |
| 任务边界与文档内流程冲突 | ⚠️ **有 1 处，已按规则处理（不改文档 + 报告提示）** —— 见 V.3 |

### V.3 ⚠️ 任务边界与文档内流程冲突（🔴 不改文档，仅提示）

| 冲突点 | 文档内原流程 | 本任务边界 | 处置 |
|---|---|---|---|
| **Gate 时序** | 契约 `v0.2.5` §0.1 与决策包顶部《POST-INTEGRATOR HUMAN DECISION STATUS》确立的时序 = `D-051/D-052 落盘 → SP-01 实测候选环境 → TQ01–TQ05 最终 Gate B 裁决 → Local Landing → Gate C` | 本任务要求的新时序 = `D-053/D-054 Landing → Local-first Rebaseline → SP-06 Plan → 人工批准 → SP-06 → TQ01–TQ05 余项 Gate B → v0.3 DRAFT → Local Landing → Gate C → 编码` | 🔴 **未删除 / 未改写原时序文本**（保留为历史表述）；✅ **在新时序中显式说明"旧时序被 `D-053` supersede"**；✅ **契约与决策包中均以"就地补注"形式并列登记两套时序，并指明当前有效口径** |

> 🔴 **提示项目负责人**：上述为**唯一一处**任务边界与既有文档流程的冲突；按项目规则「**不改文档 + 在报告中提示**」处理，**未擅自改写历史流程文本**。

### V.4 本轮执行边界（🔴 逐项确认未执行）

| 项 | 状态 |
|---|---|
| 写正式业务代码 | ❌ **NO** |
| 创建 `src/` | ❌ **NO** |
| 部署 Vercel | ❌ **NO** |
| 创建 Vercel Project | ❌ **NO** |
| 运行 `SP-06` | ❌ **NO** |
| 删除腾讯云资源 | ❌ **NO** |
| 创建 `R3` / `R1` | ❌ **NO** |
| 启用 Function URL | ❌ **NO** |
| 初始化旧 `R2` probe hosting | ❌ **NO** |
| 运行 `S-01`–`S-07` | ❌ **NO** |
| 实现 PDF RAG / embedding / vector DB | ❌ **NO** |
| 进入 Gate C | ❌ **NO** |
| 改写 Worker 历史产出 `01`–`05` | ❌ **NO**（一字未改） |
| 改写 `SP-03` / `SP-03R` | ❌ **NO**（一字未改） |
| 删除 `SP-01a_*` 文档 / `sp01a_probe/` | ❌ **NO**（全部保留） |
| `CONFIRM` `TQ01`–`TQ05` 任一项 | ❌ **NO** |

### V.5 待人工动作（唯一）

```
1. 裁决 §U 的 2 项 DECISION REQUIRED（LLM Request Path / Credential Persistence）
2. 决定是否批准 SP-06 执行（SP-06 EXECUTION APPROVAL REQUIRED）
3. （可选）决定是否批准 Legacy Cloud Cleanup Plan 的执行
```

🔴 **三者相互独立，可分别裁决**；🔴 **未获批准前，本文件不产生任何执行动作**。

---

## W. `D-055` / `D-056` Landing（2026-09-24，人工 `CONFIRMED`）

> **性质**：本文件 §L（`PROPOSED` 分析）与 §U（`DECISION REQUIRED`）的**裁决结果落盘**。🔴 **§L / §U 的候选与推荐保留为历史过程文本，一字未改**；**本节为权威口径**。
> **上游依据**：`docs/DECISIONS.md` **`D-055`** / **`D-056`**（项目负责人人工裁决，非 AI 提议）。

### W.1 落盘结果

| 原 `DECISION REQUIRED` | 人工裁决 | 落盘 Decision | 状态 |
|---|---|---|---|
| **LLM Request Path** | **C｜`Provider-dependent Hybrid`** | **`D-055`** | ✅ **`CONFIRMED`** |
| **Credential Persistence** | **A｜`Session-only Credential`** | **`D-056`** | ✅ **`CONFIRMED`** |

```
当前 DECISION REQUIRED = 0
TQ03                   = 🟡 PROPOSED / EVIDENCE READY FOR GATE B（子项已裁决；整体仍未 CONFIRM）
```

### W.2 `D-055` 正式规则（🔴 逐条）

```
路径选择（🔴 由 Provider Adapter Capability 决定，不由用户逐请求选择）
   │
   ├─ 满足 Browser Direct 全部条件 ⇒ Browser → LLM Provider
   │    🔴 不得额外经过 Vercel；Credential 只发往用户配置的 Provider
   │
   ├─ 不满足且存在"服务器端已注册的安全 Adapter" ⇒ Browser → Vercel Thin Proxy → Known Provider
   │    🔴 目标由 provider_id → registered adapter → 固定 / allowlist Host 决定
   │    🔴 Proxy 保持 THIN：仅 normalization / forwarding / timeout·error mapping / schema transport
   │    🔴 不承担 Workspace / Attempt / Insight / Hypothesis 持久化；不建 Experience DB / Cloud user DB
   │
   └─ 不满足且无安全 Adapter ⇒ 明确失败
        "Provider connection unsupported under current browser constraints"
        🔴 不得偷偷走通用 Vercel Proxy；🔴 不得为"支持所有 Provider"降低安全边界
```

| # | 硬约束 | 内容 |
|---|---|---|
| 1 | **Custom `Base URL`** | **默认 `Browser Direct Only`**；🔴 **禁止 `Generic Arbitrary URL Proxy`**；🔴 **不得** `Browser → Vercel → 用户任意 URL` |
| 2 | **Proxy 接口** | 🔴 **不接受** client 的 `target_url` / `base_url` / `host` / `scheme` 并据其代请求；🔴 **唯一形态 = `provider_id → registered adapter → controlled endpoint`** |
| 3 | **SSRF / Open Proxy 防护** | 🔴 **拒绝** `localhost` / `127.0.0.1` / `::1` / RFC1918 / link-local·metadata-like / 非 `http(s)` scheme；🔴 不跟随越界重定向；🔴 不"黑名单 + 默认放行" |
| 4 | **服务端 Key** | 🔴 **V1 不预置任何服务端固定 Key**（由 `D-055` §二·三 适用条件 + `D-056` 共同推出；**解释闭合，不新增机制**） |

### W.3 `D-056` 正式规则（🔴 逐条）

| # | 项 | 内容 |
|---|---|---|
| 1 | **允许载体** | ✅ **session-scoped browser storage**（`sessionStorage` 或等价 session-scoped abstraction） |
| 2 | **目标行为** | 输入 → **当前会话可用** → **刷新后仍可用** → **tab / browser session 结束 ⇒ 清除** → 重新进入须**重新输入** |
| 3 | 🔴 **禁止载体** | ❌ `localStorage` ❌ `IndexedDB` ❌ Workspace file ❌ Git ❌ Vercel KV ❌ Vercel DB ❌ Cloud DB ❌ server filesystem ❌ **permanent cookie** |
| 4 | **传输（Direct）** | `Browser → 用户配置的 Provider`；🔴 **不得额外发给 Vercel** |
| 5 | **传输（Proxy）** | `Browser → Thin Proxy → Known Provider`，**仅当前请求生命周期**；🔴 **Proxy 不得持久化**（不写 DB / 文件 / KV / cache / durable log） |
| 6 | 🔴 **日志** | `Authorization` / API Key / 含 secret 的 body **不得**进入 Vercel logs / application logs / error logs / analytics / 浏览器 console；**必须脱敏** |
| 7 | 🔴 **UI** | **不得**提供「记住我 / `Remember Key` / 永久保存」；**未来需要须另行 Decision** |
| 8 | **性质** | 🟠 **有意的 V1 Security Trade-off** |

### W.4 与 §L / §U 的差异（🔴 必须记账）

| 项 | §L / §U 的 `PROPOSED` 推荐 | 人工裁决（`D-055` / `D-056`） | 差异性质 |
|---|---|---|---|
| LLM 路径 | `C` 的**收窄形态**（默认 `A`，必要时 `B`；**不预置服务端 Key**） | **`C`（`Provider-dependent Hybrid`）** —— 并**新增**：`Custom Base URL` = `Browser Direct Only`、**禁止 Generic Arbitrary URL Proxy**、**Proxy 不得接受任意 target URL**、**不可用 Provider 必须明确失败** | 🟢 **方向一致**；人工裁决**显著加强**了自定义 `base_url` 的安全边界（🔴 **原 §L.3 的"降级路径（放弃任意 base_url）"已由本 Decision 以更强形式固化**） |
| 凭据 | `K-A` 默认 + `K-B` **用户显式勾选**"记住" | **`A｜Session-only Credential`** —— 🔴 **不提供任何"记住"选项**；**并新增** session-scoped 语义（**刷新后仍可用**）与 **permanent cookie 禁止** | ⚠️ **有实质差异**：人工裁决**收紧了选择空间**（**删除 `K-B` 分支**），**同时澄清了 `K-A` 的边界在"会话"而非"刷新"** | 

🔴 **差异处置**：**以 `D-055` / `D-056` 为准**；🔴 **§L / §U 的原文保留不改写**（属历史过程分析）；🔴 **不得再以 §L / §U 的推荐作为实现依据**。

### W.5 `AC` 增量

```
原最大 canonical AC = AC-143
新增范围            = AC-144 – AC-162（共 19 项，顺延）
   · D-055 对应        = AC-144 – AC-152（9 项）
   · D-056 对应        = AC-153 – AC-162（10 项）
新 AC 有效总数       = 162（AC-01–AC-162 连续 162 项 + AC-Q06-1–AC-Q06-6）
🔴 不得重排 AC-01 – AC-143；🔴 不得改写任何既有 AC 编号
```

> 🔴 **就地补注（2026-09-24，GATE-B PRE-CONFIRM CORRECTION；按「不改写历史」保留上方原文）**：上方 `新 AC 有效总数 = 162（AC-01–AC-162 连续 162 项 + AC-Q06-1–AC-Q06-6）` 与 §W.6 的 `AC 有效总数 = 162` **均含算术矛盾**（把 `AC-Q06` 的 6 项列为合计的一部分却仍标 162）⇒ **当前统一口径 = 连续 canonical `AC` **162** 项（`AC-01`–`AC-162`）＋ 独立 `AC-Q06` **6** 项（`AC-Q06-1`–`AC-Q06-6`）＝ 全部有效验收点总数 **168****。🔴 **只修正统计口径表述；未重编号 / 未把 `AC-Q06` 并入连续编号 / 未新增任何 `AC`**。🔴 **历史正确事实不改**：`S03-E` 当时「`AC-01`–`AC-115`（115）＋ `AC-Q06-1`–`6`（6）＝ **121**」（见 §T / `docs/architecture/05_TEST_DEMO_DEPLOY.md`）。

### W.6 状态（🔴 本轮结束时的建议口径）

```
D-055 / D-056        ：CONFIRMED（人工，2026-09-24）且已 Landing
Shared Contract      ：v0.2.6 DRAFT → v0.2.7 DRAFT / D-055 + D-056 对齐版（仍 DRAFT，未冻结）
新增 AC（canonical）  ：AC-144–AC-162（19 项）；AC 有效总数 = 162
DECISION REQUIRED    ：0（DR-03 / DR-04 均已关闭）
TQ03                 ：🟡 PROPOSED / EVIDENCE READY FOR GATE B（🔴 仍不 CONFIRM）
TQ01 / TQ02 / TQ04 / TQ05 ：不受本 Decision 影响，状态不变
Legacy Cloud Cleanup ：DEFERRED（项目负责人明确推迟；NOT AUTHORIZED FOR EXECUTION）
SP-06                ：执行结果见 30_SPIKES/local_first/SP-06_EXECUTION_REPORT.md（🔴 独立于本节）
```

### W.7 本轮边界（🔴 记账）

- 🔴 **未修改** §A–§V 原文（**只对 §U.1 加就地补注**）；**本节为纯追加**；
- 🔴 **未删除任何云资源**；🔴 **未创建任何云资源**；🔴 **`Legacy Cloud Cleanup` 仍为 `DEFERRED` / `NOT AUTHORIZED FOR EXECUTION`**；
- 🔴 **未 `CONFIRM` `TQ01`–`TQ05`**；🔴 **未进入 Gate B / Gate C**；🔴 **未写正式业务代码 / 未创建 `src/`**；
- 🔴 **未修改** `SP-03` / `SP-03R` / `SP-01a_*` / `30_SPIKES/sp01a_probe/` / `docs/architecture/01`–`05`。

---

## X. `SP-06` 执行登记（2026-09-24，实测证据；🔴 不 `CONFIRM` 任何 `TQ`）

> **性质**：**`SP-06` 执行结果的登记位**。🔴 **本节只登记"实测到什么"与"状态如何"**；
> 🔴 **不引用 `SP-06` 的结论为产品规则**、🔴 **不据此 `CONFIRM` `TQ01`–`TQ05`**、🔴 **不进入 Gate B / Gate C**。
> **权威来源**：`30_SPIKES/local_first/SP-06/SP-06_EXECUTION_REPORT.md`（`DISPOSABLE / NON-PRODUCTION`）。

### X.1 执行与产物

```
执行授权    : 项目负责人 APPROVED FOR EXECUTION（2026-09-24）
执行日期    : 2026-09-24
测试项      : S6-01 – S6-20（20 项，🔴 未删除、未降低标准）
产物目录    : 30_SPIKES/local_first/SP-06/
性质        : DISPOSABLE / NON-PRODUCTION（🔴 未写正式代码、未创建 src/、未部署）
环境        : Windows / Node v22.22.2 / Chrome 154.0.8037.57 / Edge 153.0.4234.48
              🔴 本机无模型 API 凭据；🔴 无 Vercel CLI / 登录态
```

### X.2 整体状态（🔴 唯一口径）

```
SP-06 整体状态 = 🔴 CONDITIONAL PASS（描述性汇总，非"临时发明的阈值"判定）
  PASS（完整实质证据）        = 7 项（S6-11 / 13 / 14 / 15 / 16 / 17 / 20）
  PARTIAL（部分实质证据）      = 6 项（S6-02 / 03 / 07 / 12 + 结果记录制 S6-18 / 19）
  PENDING MANUAL OBSERVATION = 7 项（S6-01 / 04 / 05 / 06 / 08 / 09 / 10）
  FAIL                       = 0 项
🔴 TEST SPEC GAP：SP-06 Plan 未定义整体 PASS/FAIL 阈值 ⇒ 整体判据待项目负责人在 Gate B 裁定。
```

### X.3 实测证据摘要（🔴 全部来自实际观测）

| 维度 | 实测结果 |
|---|---|
| **浏览器能力** | Chrome / Edge 均 `isSecureContext = true`、`showDirectoryPicker` 存在（🔴 原生 picker 交互需人工） |
| **本地文件持久化** | read / write / update / reopen / parse 全通过；**改名后 `EvidenceRef` 仍按 ID 解析** |
| **异常路径** | 损坏文件 ⇒ 不崩溃 + 精确定位；目录不可访问 ⇒ `WORKSPACE_UNAVAILABLE` + 可恢复 |
| **Structured Experience RAG（无数据库）** | ⑥⑦⑧⑨⑩ 五环全产出；`EvidenceRef` 全解析成功；正确排除 6 条 `Draft` + 5 条 `archived`；🔴 **无数值相似度** |
| **规模** | 20 / 100 条：`n_retrieval = 16 / 57`；耗时仅记录（local 与 LLM 网络严格分离；`llm_network_ms = NOT_EXECUTED`） |
| **`R-A` 可行性** | 三态可区分；`D-050` 用例全部符合预期；**`D-052` 负例（热风 vs 送风）= `compared_not_matched`** |
| **Configurable Provider** | 5 个配置仅改配置即分流（2 direct / 1 proxy / 2 unsupported）；unsupported **明确失败、无静默 proxy** |
| **CORS（跨源实测）** | 有 CORS 直连成功；🔴 **无 CORS 直连被浏览器拦截**（`TypeError: Failed to fetch`）；Proxy 路径成功 |
| **SSRF / Open Proxy** | 8/8 用例通过；`target_url` 被忽略；**哨兵命中 0**；通用代理端点 **404**；guard 默认语义全 `BLOCKED` |
| **凭据（`D-056`）** | 刷新后仍可用；`localStorage` / `IndexedDB` / cookie / `caches` 无泄漏；日志 `credential_plaintext_in_log = false` |
| **无 PostgreSQL 跑通 `D9`** | ①→⑩ 十步全可执行；`required_database = NONE` |

### X.4 🔴 未验证项（必须与 X.3 同读）

```
S6-01   Vercel HTTPS 域名下唤起 folder picker        → PENDING MANUAL OBSERVATION（未创建 Vercel 资源）
S6-04/05/06  真实浏览器读写本地目录                   → PENDING MANUAL OBSERVATION（需真实用户手势）
S6-08/09/10  handle·permission 跨刷新/跨重启、撤销权限 → PENDING MANUAL OBSERVATION
S6-18/19 的 Vercel 侧证据                            → 无（未部署）
🔴 不得据此宣称 "Local-first 已可行" 或 "Vercel 部署可行"。
```

### X.5 `TQ` 状态（🔴 仅"证据就绪度"，🔴 不 `CONFIRM`）

| `TQ` | 本轮证据 | 建议状态 |
|---|---|---|
| `TQ01` | Local-first 在 Node 侧可承载 `D9`；浏览器 FSA 交互未验证 | 🟡 **PROPOSED / EVIDENCE PARTIAL** |
| `TQ02` | 本地文件承载 stable ID / `EvidenceRef` / archive / 生成批次 = PASS；无数据库全链可跑 | 🟡 **PROPOSED / EVIDENCE READY FOR GATE B** |
| `TQ03` | 子项已由 `D-055` / `D-056` 裁决；Adapter 分流 + SSRF 边界 + CORS 实证 | 🟡 **PROPOSED / EVIDENCE READY FOR GATE B**（🔴 整体仍未 `CONFIRM`） |
| `TQ04` | `R-A` 可行 + `D-050` / `D-052` 用例符合 + 无数值相似度 + 100 条无实质问题 | 🟡 **PROPOSED R-A / EVIDENCE READY FOR GATE B**（🔴 不得 `CONFIRM`） |
| `TQ05` | **Vercel 侧零证据** | 🔴 **PROPOSED / EVIDENCE INSUFFICIENT** |

🔴 **五项均未 `CONFIRM`**；🔴 **最终裁决仍在 Gate B**。

### X.6 本轮边界（🔴 记账）

- 🔴 **未修改** §A–§W 原文；**本节为纯追加**；
- 🔴 **未创建 / 未删除任何云资源**（腾讯云与 Vercel 均无）；🔴 **`Legacy Cloud Cleanup` 仍为 `DEFERRED` / `NOT AUTHORIZED FOR EXECUTION`**；🔴 **本轮 `DELETED RESOURCES = NONE`**；
- 🔴 **`SP-06 TEMP RESOURCE CLEANUP` = `NOT APPLICABLE`**（与 `Legacy Cloud Cleanup` **严格区分，不得混写**）；
- 🔴 **未写正式业务代码 / 未创建 `src/` / 未部署 / 未进入 Gate B / Gate C**；
- 🔴 **未 `CONFIRM` `TQ01`–`TQ05`**；🔴 **未引入数据库 / embedding / Vector DB**；🔴 **未实现 Literature RAG**。

---

## Y. `D-057` 流程处置 + Gate B 最终裁决包（2026-09-24；🔴 不 `CONFIRM` 任何 `TQ`）

> **性质**：**`D-057`（人工流程决策）的登记位 + Gate B 最终推荐入口**。
> 🔴 **本节为纯追加**；🔴 **§A–§X 原文一字未改**；🔴 **不引用 `SP-06` 的结论为产品规则**；
> 🔴 **不把 `TQ01`–`TQ05` 写成 `CONFIRMED`**；🔴 **不进入 Gate C**。
> **权威来源**：`docs/DECISIONS.md` `D-057`（`CONFIRMED`）；`20_INTEGRATION/S00-03_技术决策包.md` **§V**；`20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md`。

### Y.1 `D-057` 处置（流程级，不改架构）

```
人工决策（项目负责人口径）：
  「部署问题后面再说，当前优先尽快完成 Gate B，进入开发阶段。」

D-057 = SP-06 部署验证与真实浏览器人工验收延期至提交前（Deployment Validation Deferral）
状态  = CONFIRMED（2026-09-24）

结论（三项）：
  ① SP-06 剩余「Vercel 部署验证」+「真实浏览器目录权限生命周期人工观测」
     → 不再作为 Gate B / Gate C / 正式开发启动的硬阻塞项
  ② 但它们仍是 PRE-SUBMISSION ACCEPTANCE 的必做项
  ③ 允许序列：Gate B → Gate C → Coding →（开发后 / 提交前）Vercel Preview Deployment
                + Chrome / Edge 真实 Workspace 验收
```

### Y.2 `SP-06` 状态（🔴 双层口径，不得混写）

```
HISTORICAL EXECUTION STATUS = CONDITIONAL PASS（描述性历史汇总，🔴 未改为 PASS）
  PASS = 7 / PARTIAL = 6 / PENDING MANUAL OBSERVATION = 7 / FAIL = 0
  🔴 7 项（S6-01 / 04 / 05 / 06 / 08 / 09 / 10）一条都未标 PASS、未删除、未伪造观测
  🔴 S6-18 / S6-19 的 Vercel 侧未验证登记保留

CURRENT PROCESS DISPOSITION = CORE ARCHITECTURE EVIDENCE SUFFICIENT FOR GATE B / DEVELOPMENT
                              DEPLOYMENT / BROWSER MANUAL ACCEPTANCE = DEFERRED TO PRE-SUBMISSION
```

🔴 **追加位置** = `30_SPIKES/local_first/SP-06/SP-06_EXECUTION_REPORT.md` **§R（新增，纯追加）**。

### Y.3 File System fallback（🔴 本轮仍不触发）

```
当前 = NO DECISION REQUIRED
依据 = SP-06 已实测 Chrome 154.0.8037.57 / Edge 153.0.4234.48 均 isSecureContext = true
       + showDirectoryPicker 存在；Node / 文件系统层 read / write / update / reopen 有正向证据

升级条件（F1–F4，🔴 出现任一才升级 DECISION REQUIRED｜File System Fallback）：
  F1  Vercel HTTPS + 目标 Chrome/Edge 无法打开 picker
  F2  真实浏览器不能完成 read + create + update
  F3  正常刷新后无法通过恢复 / 重新授权继续工作
  F4  比赛现场无法保证至少一个已验证浏览器

🔴 本轮不新建 Folder Import / ZIP Import·Export / File Upload / Local Companion Runtime 的 Decision
```

### Y.4 Gate B 最终推荐（🟡 全部 `PROPOSED`，详见技术决策包 §V）

| `TQ` | FINAL 推荐 | 状态 |
|---|---|---|
| `TQ01` | **Browser-heavy Local-first Web App + Optional Thin Server Layer**（技术默认、非人工 Decision：**TypeScript end-to-end**） | 🟡 `PROPOSED` / `EVIDENCE PARTIAL` |
| `TQ02` | **Local Workspace Files + No required cloud database**（技术默认、非人工 Decision：**Markdown + JSON / sidecar metadata**） | 🟡 `PROPOSED` / `EVIDENCE READY FOR GATE B` |
| `TQ03` | Configurable LLM + Provider Abstraction + Provider-dependent Hybrid + Session-only Credential + Registered-provider Thin Proxy only | 🟡 `PROPOSED` / `EVIDENCE READY FOR GATE B` |
| `TQ04` | **`R-A`**（Structured Field Rules + 必要时 LLM 维度级判定；🔴 无 embedding / Vector DB 作 V1 主检索） | 🟡 `PROPOSED R-A` / `EVIDENCE READY FOR GATE B` |
| `TQ05` | Local Development + Vercel Demo/Review Deployment Target + Local Workspace + 部署验收后置至提交前 | 🟡 `PROPOSED`｜Target 可定 / Acceptance deferred |

🔴 **框架层（React / Next.js / Vue / 状态库 / 路由 / 组件库）与 `TypeScript` = 实现参数（TECHNICAL DEFAULT），不生成新的 `Decision ID`。**

> 🔴 **人工 Decision 粒度收紧（2026-09-24，GATE-B PRE-CONFIRM CORRECTION）**：项目负责人**只裁决高影响架构** ⇒ **`TQ01` 的人工 Decision = `Browser-heavy Local-first Web App + Optional Thin Server Layer`**（**`TypeScript end-to-end` = TECHNICAL DEFAULT / 实现参数，不写入 `TQ01` 的 `CONFIRMED` 核心结论**）；**`TQ02` 的人工 Decision = `Local Workspace Files + No required cloud database`**（**`Markdown + JSON / sidecar metadata` = TECHNICAL DEFAULT，不是新的人工 Decision**）。🔴 **`TQ02` 的物理文件 schema（front-matter / sidecar JSON / 目录名 / 文件名 / schema 细节）由实现层 / Integrator 收敛，不得锁成不可变产品 Decision**，但**必须继续满足** human-readable / stable ID / `EvidenceRef` / `archive_state` / generation batch / `source_type` / `decision_state` / Git-friendly · portable。🔴 **§Y.4 上表已按此口径更新**；🔴 **`TQ03` / `TQ04` / `TQ05` 推荐不变**。

### Y.5 边界（🔴 逐项确认）

- 🔴 **未把 `TQ01`–`TQ05` 写成 `CONFIRMED`**；🔴 **未进入 Gate C**；🔴 **未写正式产品代码 / 未创建 `src/`**；
- 🔴 **未部署 / 未创建 Vercel Project**；🔴 **未创建或删除任何云资源**（腾讯云与 Vercel 均无）；
- 🔴 **`Legacy Cloud Cleanup` 仍为 `DEFERRED` / `NOT AUTHORIZED FOR EXECUTION`**；🔴 **`SP-06 TEMP RESOURCE CLEANUP` = `NOT APPLICABLE`**；
- 🔴 **`Research Document RAG` 仍为 `OUT OF V1` / `RESERVED ONLY`**（`D-054` 不变）；
- 🔴 **未直接推进契约至 `v0.3`**（契约仍 = **`v0.2.7 DRAFT`**，🔴 未冻结、不可作实现依据）；
- 🔴 **`PSA-*` 不是产品 `AC`**，**`AC` 统一口径（2026-09-24 校正后）= 连续 canonical `AC` 162 项（`AC-01`–`AC-162`）＋ 独立 `AC-Q06` 6 项（`AC-Q06-1`–`AC-Q06-6`）＝ 全部有效验收点总数 168**（🔴 不再使用旧写法「有效总数 = 162（…+6）」；🔴 未重编号 / 未并入 / 未新增）；
- 🔴 **未改写** `SP-03` / `SP-03R` / `SP-06` raw evidence / `SP-01a_*` / Worker `01`–`05`。

### Y.6 下一人工动作（唯一）

```
【GATE B FINAL HUMAN CONFIRMATION】 → A｜确认以上全部 Gate B 决策 ／ B｜有修改后再确认
🔴 收到 A 之前：不得把 TQ01–TQ05 写成 CONFIRMED、不得进入 Gate C、不得写正式产品代码。
```

### Y.7 GATE-B PRE-CONFIRM CORRECTION 登记（2026-09-24）

> **触发** = 项目负责人在 Gate B 总确认前选择 **`B｜有修改后再确认`**。
> 🔴 **不重新分析架构、不创建新 `Decision ID`、不重开 `D-053`–`D-057`、不运行 Spike、不进入 Gate C、不写正式代码。**

| # | 修正项 | 处理 |
|---|---|---|
| **1** | **`AC` 总数口径** | 统一为 **连续 canonical `AC` = 162 ＋ 独立 `AC-Q06` = 6 ⇒ 全部有效验收点 = 168**；🔴 **§W.5 / §W.6 就地补注**（保留原文）；🔴 **§Y.5 已改写**；🔴 **未重编号 / 未并入 / 未新增 `AC`**；🔴 **历史正确事实「`S03-E` 当时 115 + 6 = 121」不改** |
| **2** | **`TQ01` / `TQ02` 人工 Decision 粒度收紧** | **§Y.4 上表 + 粒度说明已更新**：人工 Decision 核心 = `TQ01`（Browser-heavy Local-first + Optional Thin Server Layer）／`TQ02`（Local Workspace Files + No required cloud database）；`TypeScript end-to-end` 与 `Markdown + JSON/sidecar metadata` = **TECHNICAL DEFAULT / 实现参数**，🔴 **不写入 CONFIRMED 核心结论、不生成 `Decision ID`** |
| **3** | **`docs/07_TECH_ARCHITECTURE.md` 的 `D-057` 当前有效口径** | 落点 = **`docs/07` §5.3 / §5.13 就地补注 + 新增 §5.14 `CURRENT EFFECTIVE PROCESS DISPOSITION（D-057）`**；旧「不得据此冻结架构」的 **Gate 时序结论**标记 **`SUPERSEDED FOR GATE TIMING BY D-057`**；🔴 **只 supersede Gate timing / blocking，不 supersede「尚未验证」等事实**（本节不重复该内容，见 `docs/07`） |

🔴 **本次修正的不变项**：`D-053`–`D-057` 不变｜`TQ01`–`TQ05` **仍全部未 `CONFIRM`**｜契约 **仍 `v0.2.7 DRAFT`**（🔴 未推进至 `v0.3`）｜`SP-06` **历史状态不变**｜`PSA-*` **全部仍 `PENDING`**｜🔴 **未进入 Gate C**。

> 🔴 **上句为 §Y.7 撰写当时（PRE-CONFIRM）的状态** —— **其后已发生 GATE B LANDING**，最新状态见 **§Y.8**。🔴 **依「不改写历史」保留 §Y.7 原文。**

### Y.8 GATE B LANDING 落盘登记（2026-09-24；`D-058`–`D-062`）

> **性质**：项目负责人 **明确选择「A｜确认以上全部 Gate B 决策」** ⇒ **GATE B LANDING PHASE** 的落盘登记。
> 🔴 **本节为纯追加**；§A–§Y.7 原文一字未改。

```
Gate B Final Human Confirmation（2026-09-24）
  TQ01 → D-058 ✅ CONFIRMED   Browser-heavy Local-first Web App + Optional Thin Server Layer
                              （技术默认：TypeScript end-to-end ⇒ 非人工 Decision）
  TQ02 → D-059 ✅ CONFIRMED   Local Workspace Files + No required cloud database
                              （技术默认：Markdown + JSON / sidecar metadata ⇒ 非人工 Decision；
                               物理 schema 由实现层 / Integrator 收敛）
  TQ03 → D-060 ✅ CONFIRMED   Configurable LLM + Provider Abstraction + Provider-dependent Hybrid
                              + Session-only Credential + Registered-provider Thin Proxy only
  TQ04 → D-061 ✅ CONFIRMED   R-A（Structured Field Rules + 必要时 LLM 维度级三态判定）
  TQ05 → D-062 ✅ CONFIRMED   Local Development + Vercel Demo / Review Deployment Target
                              + Local Workspace + Optional Thin Provider Proxy
                              🔴 附：DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION
  流程  → D-057 ✅ CONFIRMED   SP-06 部署验证 / 浏览器人工验收延期至提交前

Shared Contract : v0.2.7 DRAFT → v0.3 DRAFT / GATE B FINAL TECHNICAL DECISIONS INTEGRATED
                  （🔴 仍为 DRAFT：未 FROZEN / 未 CONFIRMED / Gate C 前 NOT IMPLEMENTATION BASIS）
新增 AC          : 0（口径不变 = 连续 canonical 162 ＋ 独立 AC-Q06 6 ＝ 全部有效验收点 168）
SP-06           : 历史状态不变（CONDITIONAL PASS；7 项仍 PENDING MANUAL OBSERVATION）
PSA-*           : 全部仍 PENDING
Gate C          : 🔴 NOT ENTERED（下一步 = S00-03 Gate C Readiness Review）
```

**🔴 `Local-first` 与 `Structured Experience RAG` 的架构方向不变**：`D-053` / `D-054` **一字未改**；`Research Document RAG` 仍 = **`OUT OF V1` / `RESERVED ONLY`**；`ResearchContextProvider` 仍**仅预留**。
**🔴 File System fallback 仍不触发**（`NO DECISION REQUIRED`；升级条件 = `F1`–`F4`）。
**🔴 `TQ05` 的 `CONFIRMED` 只代表 Deployment Architecture / Target 冻结** —— 🔴 **不得写**「Vercel 已验证 / 已部署 / HTTPS picker 已验证 / Production Ready」，🔴 **不得写**「Local-first 已可行 / 已完成浏览器验收」。
🔴 **`Legacy Cloud Cleanup` 仍为 `DEFERRED` / `NOT AUTHORIZED FOR EXECUTION`**；🔴 **本轮未创建 / 未删除任何资源**。
🔴 **下一人工动作**：**`S00-03 Gate C Readiness Review`**（🔴 **不自动进入 Gate C**）。
