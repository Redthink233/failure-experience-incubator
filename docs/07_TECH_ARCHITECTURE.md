# 07 技术架构（TECH ARCHITECTURE）

> 技术选型须经方案对比、用户确认后锁定，重大选型记录到 DECISIONS.md。

---

> 🚩 **就地补注（2026-09-24，`D-053` / `D-054` 架构转向；按「不改写历史」保留 §1–§4 原文于下方）**
>
> **原 §1–§4 的全部内容是 S00-02 阶段（2026-09-17）的「待讨论占位」**，其中**多项候选已被 `D-053` / `D-054` 取代**：
>
> | 原占位（§1–§4） | 当前状态 |
> |---|---|
> | §1「待定：纯前端 / 前端 + 轻后端」 | 🔴 **已被 `D-053` 取代** —— 新基线 = **Local-first Harness-style Web App**；**是否需要 Thin Server Layer 属 `TQ01` 余项（未裁决）** |
> | §2.2「待比较：LocalStorage / IndexedDB vs SQLite / 文件型 DB」 | 🔴 **已被 `D-053` 取代** —— 新基线 = **Primary Persistence = Local Workspace Files**（Markdown + JSON / sidecar metadata；具体组织方式 = Integrator 收敛） |
> | §2.3「待比较：直接前端调用 LLM API / 经后端代理调用」 | 🔴 **仍未裁决** —— `D-053` 只确认「LLM 可配置 + Provider Abstraction」；**请求网络路径 = `DECISION REQUIRED`**（见新章节 §5.5） |
> | §2.4「待比较：标签匹配 / LLM 判断 / 向量 embedding」 | 🔴 **仍未裁决** —— `D-054` 确认「仅 Structured Experience RAG」；**`R-A` / `R-B` / `R-C` 仍属 `TQ04`（未裁决）** |
> | §2.1「待比较：React / Vue / 原生 HTML+JS」 | 🟡 **仍属实现参数**（不构成独立人工决策项；`TQ01` 余项） |
> | §3「项目结构（确定后填写）」「§4 部署与演示（待填写）」 | 🔵 **已由新章节填充**（Vercel = Review / Demo 部署目标；项目结构 = 技术收敛项） |
>
> 🔴 **以下 §1–§4 原文一字未改，保留为该阶段的历史占位记录**；**当前有效架构基线见本文件末节《S00-03 架构基线（`D-053` / `D-054` 后）》**。
>
> 🟢 **就地补注（2026-09-24，`GATE B LANDING`；🔴 **上表原文已按「不改写历史」逐字保留**）**：上表**第 1 行**（「是否需要 Thin Server Layer 属 `TQ01` 余项（未裁决）」）与**第 4 行**（「`R-A` / `R-B` / `R-C` 仍属 `TQ04`（未裁决）」）= **`D-053` / `D-054` 落盘时点的表述**。**当前有效口径**：`TQ01` 已由 **`D-058`** 裁决（Browser-heavy Local-first + **Optional** Thin Server Layer）、`TQ04` 已由 **`D-061`** 裁决（= **`R-A`**），**两项均 `CONFIRMED`**。🔴 **最新有效状态 = §5.15**（另有 §5.6 / §5.11 / §5.12.4 / §5.14 / §5.15 各就地补注）。

---

## 1. 总体形态

- 目标：可在浏览器访问和演示的 Web 应用
- 待定：纯前端 / 前端 + 轻后端，方案对比后确认

## 2. 候选方案对比（待讨论）

### 2.1 前端框架
- 待比较：React / Vue / 原生 HTML+JS 等

### 2.2 数据存储
- 待比较：LocalStorage / IndexedDB（纯前端） vs SQLite / 文件型 DB（有后端）
- 评估维度：演示便捷性、数据持久化、实现成本

### 2.3 AI 接入方式
- 待比较：直接前端调用 LLM API / 经后端代理调用
- 评估维度：API Key 安全、实现成本、演示环境网络条件

### 2.4 相似检索实现
- 待比较：标签匹配 / LLM 判断 / 向量 embedding

## 3. 项目结构（确定后填写）

```
待填写
```

## 4. 部署与演示

- 待填写：本地运行 / 静态托管 / 其他

---

## S00-01 决策同步（2026-09-17）

> 本节**只记录约束边界，不做任何技术选型**。选型对比与最终确认进入 S00-02。

### 1. 已锁定的技术排除项

| 来源 | 明确不做 |
|---|---|
| R3 | 图数据库、大型知识图谱、复杂图谱推理、图谱可视化系统 |
| D3 | 团队/成员/角色/权限/管理员体系、协同编辑相关技术方案 |
| R2 | 复杂自动过期算法 |
| R6 | 以堆叠 Agent 数量、模型数量、多模型架构、向量数据库等炫技技术替代产品价值 |

**R3 说明**：产品中"知识网络""关联"等表述仅表示数据之间的逻辑关联，**技术实现不因此被绑定到图数据库**；使用普通关系字段或其他常规方案均可，具体方案进入 S00-02 比较。

### 2. 已锁定的形态约束

- 交付形态：可在浏览器访问和演示的 Web 应用（不变）。
- 演示数据：需支持预置 5~10 条示例 Attempt 与现场新增 1 条真实输入，预置数据须可标注为 Demo / 示例数据（D8）。
- 数据需支持 `Fact` / `Extraction` / `Inference` 的来源分层，以及跨记录结论的 `Candidate Insight` 标记（D7）。

### 3. 仍待 S00-02 决定（本文件 §1–§4 全部待填写项）

- 纯前端 vs 前端 + 轻后端
- 前端框架、数据存储、AI 接入方式、相似检索实现
- 项目结构、部署与演示方式

---

## S00-02 第四批决策同步（2026-09-19，`CONFIRMED`，**仅边界归属，不做技术选型**）

> 本节只记录约束边界，**不做任何技术选型**。本批确认后 **`S00-02 = CLOSED / CONFIRMED`**；技术选型与架构收敛进入 **`S00-03｜技术架构与实现方案收敛`**（**技术栈的最终选择属人工决策项**）。

### 1. 技术观测参数归本文件（非产品层）（`D-044` / Q04）

- **产品层 L4 系统自动记录最小集 = 4 项**（创建时间 / 最近修改时间 / 数据来源性质 / AI 内容来源标记）；**「发生时间」不计入 L4**（属用户 `Fact` 或其 `Extraction`）。
- **以下参数归本文件（技术 / observability 层），不进产品层**：`model` / `model version` / `prompt version` / `prompt text` / `token` 数 / 成本核算值 / `temperature` / 采样参数 / 检索内部得分 / `trace id` / `session id` / 调用耗时 / 重试次数 / 任何排障运行参数。
- **强制**：上述技术信息**即使实现层存在**，也**不得**出现在用户可见界面、**不得**作为任何产品判定依据、**不得**作为 `D9` ⑩ 追溯清单的组成部分、**不得**改变任何用户可感知状态。
- **本文件后续（`S00-03`）如需引入该层，须保持**：① 与产品层字段**物理 / 逻辑隔离**；② 不参与任何产品判定；③ 不进入用户界面与 ⑩ 追溯。

### 2. 需要在实现层落实的机制约束（本批）

| 约束 | 内容 | 依据 |
|---|---|---|
| **检索触发** | **事件驱动**（"保存动作成功"= 事件）；**不引入「已检索过」产品层字段**；**不产生后台 / 异步 / 批量 / 定时任务** | `D-045` |
| **默认范围** | **默认检索范围 = 全部历史**；`Project` **只作 Level B 解释维度，不作预筛选**（**实现侧不得以 `Project` 做准入过滤**） | `D-045` |
| **检索实现不绑定技术** | 标签匹配 / LLM 判断 / 向量 embedding 的取舍 → **`S00-03`**；**内部检索值不得直接呈现给用户**（`D-020`） | `R3` / `D-020` |
| **归档的实现** | 一个**状态位**（可撤销）+ **检索过滤** + **展示标注**；**既有引用保留**；**不得以物理删除实现"移除"** | `D-043` |
| **L4 的实现** | 4 项系统自动字段；**`created_at` 语义 = 系统元数据**（不得标为 `Fact`）；**不得以 `created_at` 冒充真实发生时间** | `D-044` / `Q16` |
| **无产物门槛** | **对象门槛未满足 / 合法为空 / Runtime 技术失败三者必须在实现层分开处理**；**Runtime 失败一律可恢复、可重试、不设次数门槛**；**但正式验收仍须完整跑通十步** | `D-047` |

### 3. 本阶段（`S00-02`）**未**做的技术决定（明确记账）

- **未选**前端框架、后端形态、数据库 / 存储实现、AI 接入方式、检索技术实现、部署方式；
- **未设计** SQL / 字段类型 / 索引 / API 路由 / Prompt 模板；
- **未编写**任何代码；**未做** UI 视觉设计。

---

## S00-03 架构基线（`D-053` / `D-054` 后，2026-09-24，**架构级人工决策已 `CONFIRMED`**）

> 本节 = **当前有效的 V1 架构基线**。
> 依据 = `docs/DECISIONS.md` **`D-053`**（V1 主架构改为 Local-first Harness-style Web App）+ **`D-054`**（V1 只实现 Structured Experience RAG）。
> 详细展开 = `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md`。
> 🔴 **本节不改变任何产品语义**；🔴 **未裁决项一律标 `PROPOSED` / `DECISION REQUIRED`，不得伪装已定稿**。

### 5.1 总体形态（`D-053`，`CONFIRMED`）

```
Web UI  +  Local Workspace Folder  +  Configurable LLM
        +（必要时）Thin LLM Access Layer
        +  Vercel Demo / Review Deployment
```

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

- **用户的科研主数据 = Local-first**；**Workspace canonical = 用户选择的本地目录**。
- **Vercel = Review / Demo Web Deployment Target**；🔴 **不是科研主数据库、不是 `Production SaaS Infrastructure`**。
- **浏览器只有在用户主动授权后才能访问指定 Workspace**。
- 🔴 **V1 不以长期运营 SaaS / 多人在线系统 / 云端科研数据平台为目标。**

### 5.2 数据持久化（`D-053`，`CONFIRMED`；细节 = Integrator 收敛）

| 项 | 结论 |
|---|---|
| **Primary persistence** | **Local Workspace Files**（🔴 **不是 PostgreSQL**） |
| **云 PostgreSQL** | 🔴 **不是 V1 required dependency** |
| **逻辑对象** | **不变**（`Workspace` / `Project` / `Attempt` / `Insight` / `Hypothesis` / `EvidenceRef`）；🔴 **不得因采用文件而扁平化对象模型** |
| **物理表示** | 🟡 **`PROPOSED`** —— Markdown + JSON / sidecar metadata 或其它合理本地文件表示；**具体 schema / 目录名 / 扩展名 = 实现参数（Integrator 收敛）** |
| **正面目标** | 人可读 / Git 友好 / Obsidian 友好 / 可迁移 / 可备份 / 可 diff |
| **🔴 不得引入** | 用户可见版本系统（版本号 / 版本列表 / 版本比较 / 版本回滚 / 修改次数） |

> **Persistence Mapping** 章节见 `docs/05_DATA_MODEL.md`。

### 5.3 浏览器访问本地目录（`D-053` 主方向；可行性待 `SP-06`）

| 项 | 结论 |
|---|---|
| **主方向** | 用户点击「**选择工作区**」主动授权一个本地目录 |
| **技术候选** | 🟡 **File System Access API 或浏览器等价能力**（`PROPOSED`） |
| **目标浏览器** | 🟡 **优先 `Chrome` / `Edge`**（`PROPOSED`）；🔴 **不得假设 Safari / Firefox 均完整支持** |
| **待验证** | 首次授权 / 读取 / 新建 / 更新 / 删除是否需要 / archive 如何表达 / 页面刷新 / 浏览器关闭后 / 权限失效 / 文件夹移动 / 目录不存在 / 只读权限 / parse error / 文件被外部修改 —— **全部由 `SP-06` 实测**（`30_SPIKES/local_first/SP-06_LOCAL_FIRST_FEASIBILITY_PLAN.md`） |
| **File System fallback** | 🔴 **本轮不自动决定**（Folder Import / ZIP Import·Export / File Upload / Local Companion Runtime 均为候选）；**只有 `SP-06` 证明主路径存在影响比赛演示的兼容性问题，才提交 `DECISION REQUIRED`** |

> 🟢 **就地补注（2026-09-24，`D-057`；按「不改写历史」保留上表原文）**：上表为 **`D-053` / `SP-06` 执行前**的口径。**当前有效流程处置**见 **§5.14 `CURRENT EFFECTIVE PROCESS DISPOSITION（D-057）`**：上表「**待验证**」行的**事实内容不变**（`SP-06` 的 7 项人工观测**仍未执行**），但其**作为 `Gate B` / `Gate C` / 正式 Coding 阻塞项**的**Gate 时序含义已被 `D-057` 取代** —— 🔴 标记为 **`SUPERSEDED FOR GATE TIMING BY D-057`**（🔴 **不 supersede"尚未验证"这一事实**）。
> 🟢 **`File System fallback` 行补充**：**当前仍为 `NO DECISION REQUIRED`（不触发）**；`D-057` 已把升级条件**可操作化**为 **F1–F4**（Vercel HTTPS + 目标浏览器无法打开 picker ／ 真实浏览器不能完成 read + create + update ／ 正常刷新后无法通过恢复或重新授权继续工作 ／ 比赛现场无法保证至少一个已验证浏览器）。

### 5.4 结构化经验检索（Structured Experience RAG，`D-054`，`CONFIRMED`）

- **正式命名**：V1 的 RAG 形态 = **Structured Experience RAG**（= **基于用户自身历史 `Attempt` 的结构化经验检索 + 证据上下文组装 + Grounded Generation**）。
- 🔴 **它不是新增产品流程** —— 它是现有 `D9` **⑥⑦⑧⑨⑩** 在技术架构中的正式描述。
- **数据流**：

```
Current Formal Attempt
   → Experience Retriever
   → Relevant Historical Formal Attempts
   → Evidence / Comparison Context Builder
   → Grounding Context Pack
   → LLM
   → Candidate Insight → Hypothesis → EvidenceRef
```

- **corpus（🔴 不扩大）**：主要检索 corpus = **符合既有规则的历史 `Formal Attempt`**；`Draft` 不进入 `N_检索`；archived 按已有规则排除新默认 retrieval / grounding / `N_检索`；🔴 **Research Documents / Web Search / 模型一般知识不计入 `N_检索`**。
- 🔴 **`RAG ≠ Vector RAG`**：V1 **不因使用 RAG 自动引入** Pinecone / Milvus / Weaviate / Chroma / pgvector / Elasticsearch / Redis Vector / embedding database；🔴 **不得用 `cosine similarity score` 替代 `D-050` 的严格 `matched` 语义**。
- **`Grounding Context Pack`**（`PROPOSED` 技术层）：至少区分 ① Current Attempt `Fact` / `Extraction` ② Historical Attempt Evidence ③ Comparison Result ④ `accepted Experience Asset`（**仅在既有规则允许时**）⑤ System instruction；🔴 **必须保留 `Fact` / `Extraction` / `Inference` 来源边界**，🔴 **不得因进入 prompt 改变 `source_type`**，🔴 **不得把 AI 先前生成内容伪装成用户事实**。

**§5.4.1 `ResearchContextProvider`（🔴 **仅预留，V1 不实现**）**

```
ResearchContextProvider
    getContext(query)
```

```
NOT V1 / NOT IMPLEMENTED / NO USER-VISIBLE BEHAVIOR
```

🔴 **V1 不建立**：`references/`、PDF import、PDF parser、chunk store、embedding store、research search、literature citation、paper viewer；🔴 **UI 不出现**「上传论文」「知识库」「文献库」「论文问答」；🔴 **不新增** `ResearchDocument` / `Chunk` / `Citation` 数据实体；🔴 **不增加对应 P0 `AC`**。
🔴 **未来分层（仅架构说明）**：Layer 1 `User Fact` / Layer 2 `Experience Evidence` / **Layer 3 `Research Evidence` = RESERVED ONLY** / Layer 4 `Model General Knowledge`；**当前 V1 实际启用 = Layer 1 / Layer 2 / Layer 4**。

### 5.5 LLM 接入（🔴 **部分未裁决**）

**已确认（`D-053`）**：

| 项 | 结论 |
|---|---|
| **LLM 可配置** | ✅ `CONFIRMED` |
| **逻辑配置项** | `provider` / `base_url` / `model` / `credential` |
| 🔴 **不得锁死单一厂商** | DeepSeek / OpenAI / Anthropic 等**均不得被锁死** |
| **Provider Abstraction** | ✅ **必须保留 Provider Adapter / Provider Abstraction** |

**🔴 未裁决（`DECISION REQUIRED` 2 项）—— 🟢 就地补注（2026-09-24）：以下两行为该时点状态，现均已由人工决策关闭**

| 编号 | 项 | 状态 |
|---|---|---|
| — | **LLM Request Path**：`Browser Direct` vs `Vercel Thin Proxy` vs `Provider-dependent Hybrid` | 🔴 **`DECISION REQUIRED`**（比较维度：API Key 暴露风险 / CORS / Provider compatibility / Vercel limitations / latency / privacy / user configuration UX / 自定义 `base_url` / SSRF·Open Proxy 风险 / Demo 可靠性） |
| — | **Credential Persistence**：`K-A` memory·session only vs `K-B` browser-local persistence vs `K-C` 其它 | 🔴 **`DECISION REQUIRED`** |

> 🟢 **就地补注（2026-09-24，按「不改写历史」保留上表原文）**：上表两行 = **该时点状态**。**当前有效口径**：
>
> | 原 `DECISION REQUIRED` | 人工裁决 | 落盘 Decision | 状态 |
> |---|---|---|---|
> | **LLM Request Path** | **C｜`Provider-dependent Hybrid`**（路径由 `Provider Adapter Capability` 决定） | **`D-055`** | ✅ **`CONFIRMED`** |
> | **Credential Persistence** | **A｜`Session-only Credential`**（会话级可用，会话结束后清除） | **`D-056`** | ✅ **`CONFIRMED`** |
>
> 🔴 **但 `TQ03` 整体仍未 `CONFIRM`** —— 子项已裁决 **≠** `TQ03` 已裁决；**仍须 `SP-06` 实测证据 + Gate B**。详见 **§5.12**。

🔴 **若采用 Vercel Thin Proxy + 用户任意 `base_url`**：**必须分析并防护** SSRF / Open Proxy / 内网地址访问 / metadata endpoint / 协议限制 / host allowlist / URL validation —— 🔴 **不得设计成"用户输入任意 URL，Vercel 无条件代请求"**。

### 5.6 检索技术路线（`TQ04`，🔴 **未裁决**）

| 编号 | 路线 | 状态 |
|---|---|---|
| **`R-A`** | Structured Field Rules（+ 必要时 LLM 维度判定） | 🟡 **`PROPOSED` 推荐** |
| **`R-B`** | Embedding-assisted | 🔴 候选 |
| **`R-C`** | Hybrid | 🔴 候选 |

**`PROPOSED` 推荐理由**：小规模 + 已结构化 + 准入语义明确（`D-019` / `D-050`）⇒ 结构化规则的可解释性与可追溯性最匹配；`SP-03R` 已提供 `R-A` 的规则级正向证据（⚠️ 射程受限）；embedding 的"模糊召回"在 `D-050` 的严格语义下难以转化为正确准入，且 Local-first 下引入 embedding 需额外的模型 / 存储 / 网络传输。
🔴 **不得 `CONFIRM` `TQ04`**；🔴 **`R-A` 仍只是 `PROPOSED`**。

> 🟢 **就地补注（2026-09-24，`GATE B LANDING`；按「不改写历史」保留本节标题与上文原文）**：本节标题的「🔴 **未裁决**」与上句「不得 `CONFIRM` `TQ04`／`R-A` 仍只是 `PROPOSED`」= **该时点状态**。**当前有效口径**：`TQ04` 已由 **`D-061`** 最终裁决 = **`R-A`**（Structured Field Rules + 必要时 LLM 维度级**离散三态**判定；`CONFIRMED`，`Source = Gate B Final Human Confirmation`）；**`R-A` 不再是 `PROPOSED`**。🔴 **`D-061` 不改变** `D-050` / Level A 四维度 / 三态 / `related` / `N_检索` / `N_引用` 语义；🔴 **`R-B` / `R-C` 被明确放弃**；🔴 **不得引入 Vector DB / embedding 准入 / 数值相似度**（见 §5.4 与 §5.15）。**当前有效状态见 §5.15。**

### 5.7 部署与演示（`D-053`，`CONFIRMED`）

| 项 | 结论 |
|---|---|
| **部署目标** | **Vercel**（Review / Demo Web Deployment Target） |
| **目标体验** | 评委打开 URL → 进入产品 → 打开 Demo Workspace（Option 1）或选择自己的 Workspace（Option 2）→ 配置 / 使用 LLM → 体验 `D9` |
| **Demo 数据** | **Local Demo Workspace**（🔴 不再是云数据库 seed）；**必须继续满足 `D8` / `TQ10`**（Demo 明确标 Demo；live input 标 live / user；reset 仍是演示运维动作；**seed 不预置 `Insight` / `Hypothesis` / `EvidenceRef` / 派生结果**） |
| 🔴 **不得引入** | 云数据库 / 用户账号数据库 / 云端 Workspace / 服务端永久科研数据存储（**不得因 Vercel 可部署 Serverless Function 就自动引入**） |
| **风险预留** | 若 Vercel 免费计划 / 使用条款 / 额度不满足比赛场景 ⇒ 报告 **`DEPLOYMENT TARGET ISSUE`**；🔴 **不得偷偷改收费方案** |
| **待验证** | HTTPS / File System API / Serverless proxy / CORS / quota / Demo availability ⇒ **`SP-06`** |

### 5.8 安全与隐私（`D-053` 后，🔴 表述红线）

**必须明确区分两件事**：

| 层 | 内容 |
|---|---|
| **A. Local Persistence** | 科研主文件默认保存在用户本地 |
| **B. LLM Transmission** | 为完成 AI 步骤，必要上下文**可能**发送到用户配置的 LLM Provider |

🔴 **不得宣称**：❌ 100% offline ❌ zero data transmission ❌ absolute privacy（**除非未来真正实现对应模式**）。
✅ **设计原则**：只发送完成当前 AI 操作所需的**最小必要上下文**；🔴 **不得默认上传整个 Workspace**；🔴 **凭据不得落入任何文件 / 日志 / 报告 / 前端 Bundle**（`D-053` / 用户级硬规则）。

### 5.9 明确不做（本节新增，架构层）

- ❌ 云 PostgreSQL 作为 V1 required dependency；
- ❌ Cloud Workspace / Cross-device sync / Multi-user SaaS / Team collaboration / Account system；
- ❌ Server-side permanent research-data store；
- ❌ PDF RAG / Literature RAG / Paper Knowledge Base；
- ❌ Vector DB 作为 required V1 component；
- 🔴 **不得以"改 Local-first"为理由重新打开 `D1`–`D-052` 的任何已确认产品语义。**

### 5.10 历史与取代登记（🔴 不改写历史）

| 项 | 处置 |
|---|---|
| `docs/architecture/01`–`05`（`S03-A`–`S03-E` Worker 产出） | 🔴 **一字未改**；标注为 **`PRE-D-053 HISTORICAL ANALYSIS`**（标注只在本文件与 `CHANGELOG.md`） |
| `SP-03` / `SP-03R` | 🔴 **一字未改**；`SP-03R` 的 `R-A` 规则级正向证据**在 Local-first 下仍然有效** |
| `SP-01a`（Cloud-centric 探针） | 🔴 **状态 = `SUPERSEDED BY D-053` / `INCOMPLETE HISTORICAL SPIKE`**（🔴 **不是 `FAIL`**）；**历史 Phase 2 事实全部保留**；**立即停止后续创建链** |
| `SP-01a_*` 文档 / `30_SPIKES/sp01a_probe/` | 🔴 **全部保留，不得删除**；probe **不得迁入 `src/`** |
| 遗留云资源（`R2` / `R6-A` / `R6-B` / `R6-C`） | 🔴 **本轮未删除任何资源**；仅生成 **`LEGACY CLOUD CLEANUP PLAN`（未执行）**；清理须**项目负责人另行明确批准**；🔴 **`R6-C` 须先由项目负责人确认实际是否存在**（仓库口径 = `NOT YET CONFIRMED CREATED`） |
| 旧 `TQ01` / `TQ02` / `TQ05` 的云候选空间 | 🔴 **`SUPERSEDED BY D-053`**（历史分析保留不改写） |

### 5.11 状态汇总

```
Primary Architecture   : Local-first Harness-style Web App（D-053 / CONFIRMED）
Primary Persistence    : Local Workspace Files（D-053 / CONFIRMED）
RAG                    : Structured Experience RAG（D-054 / CONFIRMED）；
                         Research Document RAG = OUT OF V1 / RESERVED ONLY
TQ01                   : 重新基线（Local-first 已定；框架/状态库/路由 = 实现参数；Thin Server Layer 待收敛）
TQ02                   : 重新基线（Primary = 本地文件；Markdown / JSON 组织 = Integrator 收敛）
TQ03                   : 🔴 DECISION REQUIRED（2 项：LLM Request Path / Credential Persistence）
TQ04                   : 🔴 PROPOSED R-A（未裁决）
TQ05                   : Vercel = Demo / Review 入口（已确认定位）；可行性待 SP-06
SP-06                  : PLAN ONLY（NOT EXECUTED）
BLOCKER                : NO
```

> 🔴 **本契约性结论均不构成 `TQ01`–`TQ05` 的 `CONFIRM`**；**最终架构冻结仍在 Gate B / Gate C**。

> 🟢 **就地补注（2026-09-24，按「不改写历史」保留上框原文）**：上框为 **`D-053` / `D-054` 落盘时点**的状态。**当前有效状态**（`D-055` / `D-056` 落盘后）见 **§5.12 状态汇总（更新）**；其中 **`TQ03` 行的 "`DECISION REQUIRED`（2 项）" 已由 `D-055` / `D-056` 关闭**，🔴 **但 `TQ03` 本身仍未 `CONFIRM`**。
>
> 🟢 **就地补注（2026-09-24，`GATE B LANDING`；**追加**，🔴 **上一段原文已按「不改写历史」逐字恢复保留**）**：上一段的指向（§5.12 状态汇总）与末句（「`TQ03` 本身仍未 `CONFIRM`」）**均为 `D-055` / `D-056` 时点的表述**。**最新有效状态 = §5.15**：`TQ01`–`TQ05` **全部 `CONFIRMED`**（`D-058`–`D-062`）；契约 = **`v0.3 DRAFT`**。🔴 **「`TQ03` 本身仍未 `CONFIRM`」已被 `D-060` 取代。**

### 5.12 LLM 接入边界（🔴 **v0.2.7 新增，`D-055` + `D-056`，`CONFIRMED`**）

#### 5.12.1 网络路径（`D-055`｜`Provider-dependent Hybrid`）

**唯一允许的两条形态**（**由 `Provider Adapter Capability` 选择，不由用户逐请求选择**）：

```
① Browser Direct（默认优先）
   Browser ──────────────▶ 用户配置的 LLM Provider
   🔴 不得额外经过 Vercel；🔴 Credential 只发往该 Provider

② Vercel Thin Proxy（仅当该内置 Provider 的 Browser Direct 不可行 / CORS·API 形态要求服务端调用）
   Browser ──▶ Vercel Thin Proxy ──▶ Known LLM Provider
   🔴 Proxy 目标由 provider_id → 服务器端已注册 Adapter → 固定 / allowlist Host 决定
```

| 项 | 结论 |
|---|---|
| **路径决定权** | 🔴 **Adapter Capability**；**不得**每次请求让用户手工选 `direct` / `proxy`；**不得**随机切换 |
| **Proxy 的 `THIN` 边界** | ✅ 只承担 request normalization / provider adapter forwarding / response normalization / timeout·error mapping / 必要的 schema transport；🔴 **不得承担** Workspace / `Attempt` / `Insight` / `Hypothesis` 持久化；🔴 **不得存在** Experience database / Cloud user database |
| **Custom `Base URL`** | 🔴 **默认 `Browser Direct Only`**；🔴 **禁止 `Generic Arbitrary URL Proxy`**；🔴 **不得设计成 `Browser → Vercel → 用户任意 URL`** |
| **Proxy 接口** | 🔴 **不得接受** client 提交的任意 `target_url` / `base_url` / `host` / `scheme` 并据其代请求；🔴 **不得**用请求参数修改最终目标 host |
| **SSRF / Open Proxy 防护** | 🔴 **必须拒绝** `localhost` / `127.0.0.0/8` / `::1` / RFC1918 / link-local（含 `169.254.169.254` 形态）/ 非 `http(s)` scheme；🔴 **不得跟随重定向至 allowlist 之外**；🔴 **不得"黑名单 + 默认放行"** |
| **不可用 Provider** | ✅ **必须明确失败**（表达 `Provider connection unsupported under current browser constraints` 之含义）；🔴 **不得偷偷走通用 Vercel Proxy**；🔴 **不得为"支持所有 Provider"降低安全边界** |
| **服务端 Key** | 🔴 **V1 不为任何 Provider 预置固定 server secret**；Proxy 只是传输通道、**不是 Key 持有方** |

#### 5.12.2 凭据（`D-056`｜`Session-only Credential`）

```
用户输入 API Key
  → 当前会话可用（refresh 后仍可用）
  → tab / browser session 结束 ⇒ 清除
  → 重新进入产品 ⇒ 重新输入
```

| 项 | 结论 |
|---|---|
| **允许的载体** | ✅ **session-scoped browser storage**（`sessionStorage` 或等价的 session-scoped abstraction） |
| 🔴 **禁止的载体** | ❌ `localStorage` ❌ `IndexedDB` ❌ Workspace file ❌ Git ❌ Vercel KV ❌ Vercel DB ❌ Cloud DB ❌ server filesystem ❌ **permanent cookie** |
| **传输** | `Browser Direct` ⇒ 只发往用户配置的 Provider（🔴 **不得额外发给 Vercel**）；`Proxy` ⇒ 仅**当前请求生命周期**内使用；🔴 **Proxy 不得持久化 Credential** |
| **日志** | 🔴 `Authorization` / API Key / 含 secret 的 request body **不得**进入 Vercel logs / application logs / error logs / analytics / 浏览器 console；**必须脱敏** |
| **UI** | 🔴 **不得**提供「记住我 / `Remember Key` / 永久保存」开关；**未来如需要必须另行 Decision** |
| **性质** | 🟠 **有意的 V1 Security Trade-off**（安全默认值优先，接受"进入产品需重新输入 Key"的体验代价） |

#### 5.12.3 与既有约束的关系（🔴 防误读）

- 🔴 **不改变** `docs/07` **§5.8** 的隐私表述红线：**仍不得宣称**「100% offline」「zero data transmission」「absolute privacy」；
- 🔴 **不改变**「只发送完成当前 AI 操作所需的**最小必要上下文**」「**不得默认上传整个 Workspace**」；
- 🔴 **不改变** `D-044`：`model` / `prompt` / `token` / `latency` 等技术字段**不进产品层 L4、不进界面**；
- 🔴 **不改变** `D-020` / `D-050` / `D-052`：**不得出现任何数值化相似度**；
- 🔴 **不改变** `D-054`：**`RAG ≠ Vector DB`**；`ResearchContextProvider` 仍仅 `RESERVED`；
- 🔴 **路径已裁决 ≠ `TQ03` 已 `CONFIRM`** —— **`TQ03` 仍须 `SP-06` 实测证据 + Gate B 裁决**；
- 🔴 **`SP-06` 的执行结果不得由本节预判**。

#### 5.12.4 状态汇总（更新，2026-09-24）

```
Primary Architecture   : Local-first Harness-style Web App（D-053 / CONFIRMED）
Primary Persistence    : Local Workspace Files（D-053 / CONFIRMED）
RAG                    : Structured Experience RAG（D-054 / CONFIRMED）；
                         Research Document RAG = OUT OF V1 / RESERVED ONLY
LLM Request Path       : Provider-dependent Hybrid（D-055 / CONFIRMED）
LLM Credential         : Session-only Credential（D-056 / CONFIRMED）
TQ01                   : 重新基线（Local-first 已定；框架/状态库/路由 = 实现参数；Thin Server Layer 待收敛）
TQ02                   : 重新基线（Primary = 本地文件；Markdown / JSON 组织 = Integrator 收敛）
TQ03                   : 🟡 PROPOSED / EVIDENCE READY FOR GATE B
                         （原 2 项 DECISION REQUIRED 已由 D-055 / D-056 关闭；整体仍未 CONFIRM）
TQ04                   : 🔴 PROPOSED R-A（未裁决；待 SP-06 后 Gate B）
TQ05                   : Vercel = Demo / Review 入口（已确认定位）；可行性待 SP-06
SP-06                  : 已执行（2026-09-24）= CONDITIONAL PASS
                         （PASS 7 / PARTIAL 6 / PENDING MANUAL 7 / FAIL 0）
Shared Contract        : v0.2.7 DRAFT（未冻结、不可作实现依据）
BLOCKER                : NO
```

> 🟢 **就地补注（2026-09-24，`GATE B LANDING`；按「不改写历史」保留上框原文）**：上框 = **`D-055` / `D-056` 落盘时点**（`v0.2.7`）的状态。**当前有效状态**（`D-057` + `D-058`–`D-062` 落盘后）见 **§5.15**：
> - **`TQ01`–`TQ05` = 全部 `CONFIRMED`**（`D-058`–`D-062`）；上框 `TQ03` / `TQ04` / `TQ05` 三行**均已被裁决取代**；
> - `Shared Contract` = **`v0.3 DRAFT / GATE B FINAL TECHNICAL DECISIONS INTEGRATED`**（🔴 **仍为 `DRAFT`**：未 `FROZEN` / 未 `CONFIRMED` / **Gate C 前 NOT IMPLEMENTATION BASIS**）；
> - `SP-06` = **已执行**（2026-09-24）`= CONDITIONAL PASS` + 7 项仍 `PENDING MANUAL OBSERVATION`；`DEPLOYMENT / BROWSER MANUAL ACCEPTANCE = DEFERRED TO PRE-SUBMISSION`（`D-057`）；
> - 🔴 `BLOCKER = NO` **不变**。

### 5.13 `SP-06` 实测证据（🔴 仅实测证据；**不 `CONFIRM` 任何 `TQ`**）

> **性质**：本节**只登记 `SP-06` 的实测结果**（`DISPOSABLE / NON-PRODUCTION`）。
> **权威来源**：`30_SPIKES/local_first/SP-06/SP-06_EXECUTION_REPORT.md`。
> 🔴 **本节不 `CONFIRM` `TQ01`–`TQ05`**；🔴 **不进入 Gate B / Gate C**；🔴 **不据此改写任何架构结论**。

| 维度 | 实测结果 | 对应测试 |
|---|---|---|
| **浏览器能力（本地 secure context）** | Chrome `154.0.8037.57` / Edge `153.0.4234.48` **均** `isSecureContext = true`、`showDirectoryPicker` 存在 | `S6-02` / `S6-03`（PARTIAL） |
| **本地文件持久化（文件系统层）** | read / write / update / reopen / parse 全通过；**stable ID 存于文件内容**；**改名后 `EvidenceRef` 仍按 ID 解析成功** | `S6-07`（PARTIAL） |
| **异常路径** | 损坏文件 ⇒ 不崩溃 + 精确定位；目录不可访问 ⇒ `WORKSPACE_UNAVAILABLE` + 可恢复 | `S6-11` / `S6-12` |
| **Structured Experience RAG（无数据库）** | ⑥⑦⑧⑨⑩ 五环全部产出；`EvidenceRef` 全部按 ID 解析成功；正确排除 `Draft` / `archived`；🔴 **无数值相似度** | `S6-15` |
| **规模** | 20 / 100 条：`n_retrieval = 16 / 57`；耗时仅记录（local 与 LLM 网络**严格分离**，`llm_network_ms = NOT_EXECUTED`） | `S6-13` / `S6-14` |
| **`R-A` 在 Local-first 可行性** | 三态可区分；`D-050` 用例全部符合预期；**`D-052` 负例 = `compared_not_matched`** | `S6-16` |
| **Configurable Provider** | 5 个配置仅改配置即分流；`UNSUPPORTED` **明确失败、无静默 proxy** | `S6-17` |
| **CORS（跨源实测）** | 有 CORS 直连成功；🔴 **无 CORS 直连被浏览器拦截**；Thin Proxy 路径成功 | `S6-18`（结果记录制） |
| **SSRF / Open Proxy 边界** | 8/8 用例通过；`target_url` 被忽略；**哨兵命中 0**；通用代理端点 **404**；guard 默认语义全 `BLOCKED` | `S6-29` |
| **凭据（`D-056`）** | 刷新后仍可用；无持久化载体泄漏；**日志无凭据明文** | `S6-30` / `S6-31` |
| **无 PostgreSQL 跑通 `D9`** | ①→⑩ 十步全可执行；`required_database = NONE` | `S6-20` |

**🔴 未验证项（必须与上表同读）**：

```
S6-01  Vercel HTTPS 域名下唤起 folder picker  → PENDING MANUAL OBSERVATION（本轮未创建 Vercel 资源）
S6-04/05/06  真实浏览器读写本地目录            → PENDING MANUAL OBSERVATION（需真实用户手势）
S6-08/09/10  handle·permission 跨刷新/跨重启、撤销权限 → PENDING MANUAL OBSERVATION
S6-18/19 的 Vercel 侧证据                     → 无（未部署）
⇒ 🔴 不得宣称 "Local-first 已可行" 或 "Vercel 部署可行"；🔴 不得据此冻结架构。
```

> 🟢 **就地补注（2026-09-24，`D-057`；按「不改写历史」保留上框原文）**：
> - 🔴 **上框的"事实"部分全部继续有效、不得删除、不得改写**：`S6-01` / `S6-04` / `S6-05` / `S6-06` / `S6-08` / `S6-09` / `S6-10` **仍为 `PENDING MANUAL OBSERVATION`（仍未执行、无观测，🔴 不得伪造 `PASS`）**；`S6-18` / `S6-19` 的 Vercel 侧证据**仍为"无"**；🔴 **不得宣称"Local-first 已可行"**、🔴 **不得宣称"Vercel 部署可行"**、🔴 **不得宣称"Vercel 已验证 / 已部署 / HTTPS picker 已验证 / Production Ready"**、🔴 **不得宣称"Local-first 已完成浏览器验收"** —— **这些约束不因 `D-057` 而放松**。
> - 🟠 **上框末句的「🔴 不得据此冻结架构」属"Gate 时序 / 阻塞"结论** ⇒ 🔴 **标记为 `SUPERSEDED FOR GATE TIMING BY D-057`**：**该未完成事实不再作为 `Gate B` / `Gate C` / 正式 Coding 的硬阻塞项**；允许序列 = **`Gate B` → `Gate C` → `Coding` →（开发后 / 提交前）Vercel Preview Deployment + Chrome / Edge 真实 Workspace 验收**。
> - 🔴 **只 supersede「Gate timing / blocking」**；**不 supersede 上框任何"尚未验证"类事实**。详见 **§5.14**。

**`TQ` 证据就绪度（🔴 不等于 `CONFIRM`）**：`TQ01` = `EVIDENCE PARTIAL`｜`TQ02` = `EVIDENCE READY FOR GATE B`｜`TQ03` = `EVIDENCE READY FOR GATE B`（🔴 整体仍未 `CONFIRM`）｜`TQ04` = `PROPOSED R-A / EVIDENCE READY FOR GATE B`｜`TQ05` = `EVIDENCE INSUFFICIENT`。

> 🟢 **就地补注（2026-09-24，`GATE B LANDING`；按「不改写历史」保留上行原文）**：上行 = **`SP-06` 执行时点（2026-09-24 早）**的证据就绪度登记。**当前有效口径**：`TQ01`–`TQ05` **已由 `D-058`–`D-062` 全部最终裁决并 `CONFIRMED`** —— 上行「不等于 `CONFIRM`」「整体仍未 `CONFIRM`」「`PROPOSED R-A`」「`EVIDENCE INSUFFICIENT`」均**不再是对当前状态的描述**（🔴 作为**该时点的证据就绪度历史记录**继续保留）。🔴 **`SP-06` 的实测结论仍不得写成对任何 `TQ` 的 `CONFIRM`**（`D-058`–`D-062` 的依据是人工裁决）。**当前有效状态见 §5.15。**

**🔴 环境与费用**：本轮**未创建任何 Vercel 或腾讯云资源**（费用 **0 元**）；**`Legacy Cloud Cleanup` = `DEFERRED` / `NOT AUTHORIZED FOR EXECUTION`**（**本轮 `DELETED RESOURCES = NONE`**）。

### 5.14 `CURRENT EFFECTIVE PROCESS DISPOSITION（D-057）`（🔴 新增；不改写历史）

> **依据**：`docs/DECISIONS.md` **`D-057`（`CONFIRMED`，2026-09-24）**。
> **性质**：**当前有效流程处置**；🔴 **§5.1–§5.13 原文一字未删、未改写**（仅在 §5.3 / §5.13 各追加一条就地补注）。

```
D-057 │ SP-06 部署验证与真实浏览器人工验收延期至提交前（Deployment Validation Deferral）

CURRENT EFFECTIVE PROCESS DISPOSITION
  · SP-06 剩余「Vercel 部署验证」+「真实浏览器目录权限生命周期人工观测」
      ⇒ 🔴 不再作为 Gate B / Gate C / 正式 Coding 的硬阻塞项
      ⇒ ✅ 但仍是 PRE-SUBMISSION ACCEPTANCE 的必做项
         （清单 = 20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md，
          PSA-01 – PSA-13 + PSA-X1 – X11，状态 PLANNED / NOT EXECUTED，全部 PENDING）
  · 允许序列 = Gate B → Gate C → Coding →（开发后 / 提交前）Vercel Preview Deployment
               + Chrome / Edge 真实 Workspace 验收

HISTORICAL EXECUTION STATUS（🔴 未变）
  · SP-06 = CONDITIONAL PASS（PASS 7 / PARTIAL 6 / PENDING MANUAL 7 / FAIL 0）
  · 🔴 7 项 PENDING MANUAL OBSERVATION 仍然 PENDING，不得伪造 PASS
```

**被 supersede 的旧结论（🔴 仅限 Gate 时序 / 阻塞）**：

| # | 旧结论 | 位置 | 处置 |
|---|---|---|---|
| 1 | `SP-06` 浏览器 / Vercel 人工观测未完成 ⇒ **「不得据此冻结架构」**（作为 Gate 时序 / 阻塞结论） | **§5.13** 末句 | 🔴 **`SUPERSEDED FOR GATE TIMING BY D-057`** |
| 2 | §5.3「**待验证**」行作为 **`Gate B` 前置阻塞** 的含义 | **§5.3** | 🔴 **`SUPERSEDED FOR GATE TIMING BY D-057`**（事实内容不变） |
| 3 | §5.11 状态汇总中 **`TQ05`「可行性待 `SP-06`」作为 `Gate B` 阻塞** 的含义 | **§5.11** | 🔴 **`SUPERSEDED FOR GATE TIMING BY D-057`**（`TQ05` 当前口径 = **Target 可定 / `DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION`**） |

**🔴 未被 supersede 的事项（继续有效，逐条）**：

- 「**尚未验证**」类事实：7 项 `PENDING MANUAL OBSERVATION` **仍未执行**；Vercel 侧证据**仍为"无"**；
- 🔴 **不得宣称**「Vercel 已验证 / Vercel 已部署 / HTTPS picker 已验证 / Production Ready」；
- 🔴 **不得宣称**「Local-first 已可行」或「Local-first 已完成浏览器验收」；
- 🔴 **File System fallback 仍不触发**（`NO DECISION REQUIRED`）；升级条件 = **F1–F4**（见 §5.3 就地补注）；
- 🔴 **`SP-06` 的 PASS / 实测结论仍不得写成对任何 `TQ` 的 `CONFIRM`**；`TQ01`–`TQ05` **仍全部未 `CONFIRM`**；
- 🔴 **契约仍为 `v0.2.7 DRAFT`**（未冻结、不可作实现依据；🔴 未推进至 `v0.3`）；
- 🔴 **`PSA-*` 不是产品 `AC`**；**`AC` 统一口径（2026-09-24 校正后）= 连续 canonical `AC` 162 项 ＋ 独立 `AC-Q06` 6 项 ＝ 全部有效验收点 168**（🔴 不再使用旧写法「有效总数 = 162（…+6）」；🔴 历史正确事实「`S03-E` 当时 115 + 6 = 121」不改）；
- 🔴 **`SP-06` `TEST SPEC GAP`（整体状态判据 / fallback 升级判据）仍未被正式裁定**；
- 🔴 **`Legacy Cloud Cleanup` = `DEFERRED` / `NOT AUTHORIZED FOR EXECUTION`**（`R2` / `R6-A` / `R6-B` / `R6-C` 未动；`R6-C` 仍 `NOT YET CONFIRMED CREATED`）。

> 🔴 **本节不 `CONFIRM` `TQ01`–`TQ05`**；🔴 **不进入 Gate C**；🔴 **不代表已写正式产品代码**。
> 🔴 **`D-057` 只调整验收时序，不改变任何架构结论**（`D-053` / `D-054` / `D-055` / `D-056` 一字未改）。

### 5.15 GATE B LANDING｜`TQ01`–`TQ05` 最终技术决策落盘（🔴 v0.3 新增，2026-09-24）

> **性质**：Gate B 最终裁决的**落盘登记**（`Source = Gate B Final Human Confirmation`，项目负责人原话「A｜确认以上全部 Gate B 决策」）。
> 🔴 **§5.1–§5.14 原文一字未删、未改写**（仅在 §5.3 / §5.11 / §5.13 追加就地补注）。

```
TQ01 → D-058 ✅ CONFIRMED   Browser-heavy Local-first Web App + Optional Thin Server Layer
TQ02 → D-059 ✅ CONFIRMED   Local Workspace Files + No required cloud database
TQ03 → D-060 ✅ CONFIRMED   Configurable LLM + Provider Abstraction + Provider-dependent Hybrid
                            + Session-only Credential + Registered-provider Thin Proxy only
TQ04 → D-061 ✅ CONFIRMED   R-A（Structured Field Rules + 必要时 LLM 维度级三态判定）
TQ05 → D-062 ✅ CONFIRMED   Local Development + Vercel Demo / Review Deployment Target
                            + Local Workspace + Optional Thin Provider Proxy
                            🔴 附：DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION
流程 → D-057 ✅ CONFIRMED   SP-06 部署验证 / 浏览器人工验收延期至提交前
```

**🔴 `TECHNICAL DEFAULT` / 实现参数（不是人工 Decision、不生成 `Decision ID`）**：

```
TypeScript end-to-end                              ← TQ01 技术默认
Markdown + JSON / sidecar metadata                 ← TQ02 物理层技术默认
框架 / state library / router / component library  ← 实现参数
TQ02 物理文件 schema（front-matter / sidecar JSON / 目录名 / 文件名 / schema 细节）
                                                   ← Integrator 收敛，🔴 不得锁成不可变产品 Decision
🔴 但仍须满足：human-readable / stable ID / EvidenceRef / archive_state /
              generation batch / source_type / decision_state / Git-friendly · portable
```

**🔴 状态（当前有效）**：

| 项 | 状态 |
|---|---|
| `TQ01`–`TQ05` | ✅ **全部 `CONFIRMED`**（`D-058`–`D-062`） |
| Shared Contract | **`v0.3 DRAFT / GATE B FINAL TECHNICAL DECISIONS INTEGRATED`** —— 🔴 **仍为 DRAFT：未 `FROZEN` / 未 `CONFIRMED` / **Gate C 前 NOT IMPLEMENTATION BASIS** |
| `SP-06` | **历史状态不变**：`CONDITIONAL PASS` + **7 项仍 `PENDING MANUAL OBSERVATION`**；`DEPLOYMENT / BROWSER MANUAL ACCEPTANCE = DEFERRED TO PRE-SUBMISSION` |
| `PSA-01`–`PSA-13` + `PSA-X1`–`X11` | **全部仍 `PENDING`**（`PLANNED` / `NOT EXECUTED`） |
| `AC` 口径 | **不变**：连续 canonical **162** ＋ 独立 `AC-Q06` **6** ＝ 全部有效验收点 **168**（🔴 本轮**未新增 `AC`**） |
| `Research Document RAG` | 🔴 仍 **`OUT OF V1` / `RESERVED ONLY`**（`D-054` 不变） |
| File System fallback | 🔴 **仍不触发**（`NO DECISION REQUIRED`；升级条件 = `F1`–`F4`） |
| 编码 / `src/` / 部署 | 🔴 **仍未开始 / 未创建 / 未部署** |

> 🔴 **本节的 `CONFIRMED` 只覆盖决策本身（`docs/DECISIONS.md`）；🔴 不代表架构文档或契约已冻结** —— **契约仍为 `v0.3 DRAFT`**，**Gate C 前不得作为实现依据**。
> 🔴 **`TQ05` 的 `CONFIRMED` 只代表 Deployment Architecture / Target 冻结** —— 🔴 **不得写**「Vercel 已验证 / 已部署 / HTTPS picker 已验证 / Production Ready」，🔴 **不得写**「Local-first 已可行 / 已完成浏览器验收」。
> 🔴 **本节不进入 Gate C**；**Gate C Readiness Review 为下一步、须由项目负责人单独启动**。
>
> 🟢 **就地补注（2026-09-24，`GATE C FINAL FREEZE`；按「不改写历史」保留本节全部原文）**：本节 = **Gate B Landing 时点**的状态。**当前有效状态见 §5.16**（🔴 其中 **`Shared Contract` 一行已由 `v0.3 FROZEN / IMPLEMENTATION BASIS` 取代**；`TQ01`–`TQ05` / `SP-06` / `PSA` / `AC` 口径 / Research RAG / File System fallback 各行**继续有效**）。

### 5.16 GATE C｜实现基线冻结登记（🔴 2026-09-24 新增）

> **性质**：`Gate C` 关闭与**实现基线冻结**的落盘登记（`Source = 项目负责人 2026-09-24「A｜确认 Gate C，冻结当前实现基线并允许正式开发」`）。
> 🔴 **§5.1–§5.15 原文一字未删、未改写**（仅在 §5.11 / §5.12.4 / §5.13 / §5.15 各追加就地补注）。

```
GATE C = COMPLETE（2026-09-24）

Shared Contract        : v0.3 DRAFT → ✅ v0.3 FROZEN / IMPLEMENTATION BASIS
IMPLEMENTATION BASIS   : ✅ YES
版本号                  : 🔴 v0.3 不变（按契约 §14 第 4 条既有版本链，终端状态即「冻结态」；不发明新版本号）

Gate C 前置链
  · Gate C Readiness Review（首轮）= NOT READY
      唯一原因 = ISSUE-01 文档传播缺口（🔴 不涉及产品语义）
  · RL-01 文档传播补丁（docs/03・04・05・06・07・08・09 + DECISIONS ×2 + CHANGELOG）
  · RL-02 实现计划依赖修正（RC-01 M6↔M7 / RC-02 M10↔M11·M12 / RC-03 M3→M1）
  · 有界 Recheck = ✅ READY WITH NON-BLOCKING DEFERRED ITEMS
  · FINAL STATUS HYGIENE CHECK（4 项）
  · FINAL FREEZE SANITY CHECK（8 项，全部成立）

冻结的射程（🔴 只冻结「实现依据」这一效力）
  · 产品语义 = 一字未改（D1–D10 / R1–R6 / D-011–D-062 / ADJ-01 / Q16）
  · 技术架构 = 一字未改（D-053 / D-058–D-062）
  · 共享语义 = 一字未改（D9 十步 / 对象 / 状态 / source_type / EvidenceRef /
                N_检索·N_引用 / Level A·B·C / 生成批次）
  · 新增 = 1 项 CONTRACT CLARIFICATION（契约 §9.4.1 Level A 四维度 → 主字段路径映射表）
  · 新增 AC = 0（口径不变 = 连续 canonical 162 ＋ 独立 AC-Q06 6 ＝ 168）

🔴 未因此成立的事项（不得写反）
  · DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION（PSA-01–13 + PSA-X1–X11 全部仍 PENDING）
  · 🔴 不得写「Vercel 已验证 / 已部署 / HTTPS picker 已验证 / Production Ready」
  · 🔴 不得写「Local-first 已可行 / 已完成浏览器验收」
  · SP-06 历史状态不变 = CONDITIONAL PASS + 7 项 PENDING MANUAL OBSERVATION
  · SP-06 TEST SPEC GAP = HISTORICAL / NON-BLOCKING UNDER D-057
                         （PROCESS DISPOSITION RESOLVED / TEST HISTORY PRESERVED；
                          🔴 不写 RESOLVED BY TEST）
  · File System fallback = 仍不触发（NO DECISION REQUIRED；升级条件 = F1–F4）
  · Research Document RAG = 仍 OUT OF V1 / RESERVED ONLY（D-054 不变）
```

**🔴 冻结后的变更纪律**：契约修改**仍须走契约 §14 CCR 流程**；**契约 §12 Worker 禁改清单继续有效**；🔴 **`TECHNICAL DEFAULT` / 实现参数不得锁成不可变产品 Decision**。

**🔴 当前阶段**：**`S01 / Implementation`（正式实现阶段）**；🔴 **`CODING_START_HANDOFF.md` 已生成**；🔴 **本轮仍未写任何业务代码、未创建 `src/`**；**首个编码任务见该 Handoff 文件的 `NEXT TASK`**。


