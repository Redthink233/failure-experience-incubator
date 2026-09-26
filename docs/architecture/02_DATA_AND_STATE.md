# 02 数据与状态架构（DATA AND STATE）

```
文档 ID   : 02_DATA_AND_STATE
阶段      : S00-03｜技术架构与实现方案收敛
任务      : S03-B｜数据与状态架构
状态      : PROPOSED / S03-B
效力      : PROPOSED —— 未定稿、未 CONFIRMED、不可作为实现依据
独占方    : S03-B（Worker）
依据来源  : docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md（v0.2 DRAFT / Gate A 修订版）
          : docs/analysis/S00-03_技术架构阶段启动.md（§4 硬约束 TC-01–TC-84；§5 TQ01–TQ40；§6.4；§7.2 SP-01）
          : docs/05_DATA_MODEL.md（canonical，产品逻辑模型，未改一字）
          : docs/DECISIONS.md（D1–D10 / R1–R6 / D-011–D-048 / Q16 派生关闭）
          : docs/architecture/01_APP_ARCHITECTURE.md（PROPOSED 上游方案；§5 分层 / §6.1 职责 / §12 最小工作空间）
```

> 🚩 **本文件性质**
> 1. **数据持久化与托管方案的最终选择属人工决策项**（`TQ02` → **Gate B**）。本文件**只出候选对比、差异、成本、风险与 PROPOSED 建议**，**不构成最终结论**、**不 `CONFIRM` 数据库或技术栈**。
> 2. **`01_APP_ARCHITECTURE.md` 仅为 PROPOSED 上游方案**，本文件**不将其视为 Gate B 已确认技术栈**；只在 §K 做**兼容性检查**与**影响记录**。
> 3. 本文件**只写逻辑 schema**：**不含字段类型、不含索引、不含任何 SQL / DDL / 迁移脚本**；一切物理表示**由 Integrator / 实现阶段收敛**。
> 4. 本文件**未修改**任何 canonical（`DECISIONS.md` / `01`–`09` / `S00-02` 文档 / `CHANGELOG.md`）、**未修改** Shared Technical Contract、**未修改** `01_APP_ARCHITECTURE.md`、**未修改**其它 Worker 文件；**未编码 · 未部署 · 未执行 Spike**。
> 5. 全文状态词：除显式引用 canonical 的 `CONFIRMED` 内容外，**一切方案、建议、结论默认 `PROPOSED`**。

---

## §0 结论摘要（PROPOSED）

| # | 项 | PROPOSED 结论 | 归属 |
|---|---|---|---|
| 1 | **持久化与托管（`TQ02`）** | 推荐**托管 PostgreSQL**；**优先国内可达 / 现场网络稳定**的平台；**Serverless 或长驻实例随 S03-A 运行形态二选一**（形态差异不改数据模型）。**本机数据库不作为任何候选**（`TC-78`） | **Gate B** |
| 2 | **物理建模粒度（`TQ07`）** | **对象分为「独立对象 / 附属状态记录 / 纯派生（不落表） / 禁止实体」四类**；引用关系**独立成引用集合**（不内嵌）；内容条目**独立成条目集合**（不与字段裸值混存） | Integrator 收敛 |
| 3 | **「未知 / 未提供」（`TQ08`）** | 推荐 **`presence_state` 显式存在位 + 值域留空**（**不采用哨兵字符串**）；不变量：`unknown ⇔ 值域为空`；写入路径**强制显式** | Integrator 收敛 |
| 4 | **`Attempt` 状态** | **两个正交字段**：`attempt_status`（`Draft` / `Formal`）+ `archive_state`（状态位）。**无物理删除**；归档可撤销；归档后只读 | 契约 §2.1 / §7 |
| 5 | **`Insight` 状态** | `candidate` / `accepted` / `rejected` 三态 + **内容性字段修改触发的自动退回**；**只留事件日志**，**不建版本表 / 不做软删除历史** | 契约 §2.2 |
| 6 | **`Hypothesis`** | **独立输出对象**；`kind` = `grounded` / `model`；**裁决位** `undecided` / `accepted` / `rejected`；**`model` 额外有独立「保存位」**；**与 `Experience Asset` 无任何直接对象引用** | 契约 §2.3 / §8 |
| 7 | **`EvidenceRef`** | **唯一证据集合**；`target` **只允许指向 `Formal Attempt`（含已归档）**；`role` 逐条必填；**⑩ 清单与 `N_引用` 由同一集合派生**（两种视图，同源） | 契约 §5 / §6.3 |
| 8 | **`N_检索` / `N_引用`** | `N_检索` **存于「当前有效比较派生结果」**（检索时刻快照）；`N_引用` **不落库，实时由 `EvidenceRef` 集合派生**（**按被引记录去重**）；两者**都不被展示条数截断**；**无数值相似度字段** | 契约 §6 |
| 9 | **重新检索（`TQ11`）** | **单行替换**：每 `Formal Attempt` 至多 **1 条当前有效派生结果**，重新检索**覆盖替换**；**不保留被替换结果、不留历史表、无版本号 / 版本列表 / 回滚** | Integrator 收敛 |
| 10 | **Demo 数据** | **复用既有 `data_source_nature` 字段（不新增重复字段）**；seed **只预置 `Attempt` 层数据**（不预置 `Insight` / `Hypothesis` / `EvidenceRef` / 派生结果）；reset 属**运维动作**，**不得成为产品功能入口** | Integrator（`TQ10`） |
| 11 | **技术层隔离** | 产品面 / 技术面**两套独立存储面 + 独立访问通道**；技术面**不进产品判定、不进界面、不进 ⑩、不计入 `N_*`**；**内部检索分数建议不落库** | 契约 §11.2 |
| 12 | **对 S03-A 的兼容性** | 单体全栈候选 / TypeScript 候选 / 托管 PostgreSQL 候选 / 服务端作为规则强制点：**当前数据方案全部兼容**；**若上游 PROPOSED 假设不成立，只记录影响（§K.4），不自行确认技术栈** | — |
| 13 | **BLOCKER** | **无**（`TQ02` 未裁决**不属**阻塞项 —— 契约 §0.1 明确 Gate A 不要求先裁决技术栈；S03-B 完成判据 = 契约 §1–§7 每条硬约束有落点） | — |
| 14 | **CCR** | **2 项**（`CCR-S03B-01` / `CCR-S03B-02`，见 §M.2）：均为**契约条目与 canonical 不一致的边界确认**，**不改变任何产品机制** | Integrator |
| 15 | **PRODUCT SEMANTIC CONFLICT** | **无**；登记 **1 项语义边界**（§M.3），**不构成需人工裁决的产品冲突** | — |

---

## §A 数据架构总览

### A.1 四类划分（本文件的建模总纲）

> 一切建模争议的裁决依据：**先判断对象属于四类中的哪一类**；**不得把 A 类压成 D 类、也不得把 C 类提升为 A 类**。

| 类 | 含义 | 是否落存储 | 清单 |
|---|---|---|---|
| **① 独立对象** | 承载用户事实或 AI 判断的**一等对象**，有稳定 ID、可被按 ID 引用 | ✅ 落存储 | `Workspace` / `Project` / `Attempt` / `Content Item` / `Insight` / `Hypothesis` / `EvidenceRef` / `Insight State Event` / `Retrieval Derivation` |
| **② 附属状态记录** | 从属于某个一等对象、承载其**过程状态**，**不是事实 / 经验对象**，**不可被引用、不进 ⑩、不计入 `N`** | ✅ 落存储 | `Attempt Draft State`（追问预算计数器 / 已放弃缺口集合 / 解析状态） |
| **③ 纯派生（视图 / 计算）** | **不落独立存储**，由一等对象计算得出 | ❌ **不落存储**（或仅缓存于派生产物内） | `Experience Asset`（`accepted Insight` 视图）、可参与检索的 `Attempt` 视图、`N_引用`、`ai_source_marks` 投影、两种空态判定、档位（`0` / `1` / `≥2`）映射 |
| **④ 禁止实体** | **明确不得建立**（建表 / 建集合 / 建渠道均禁止） | ❌ 禁止 | 见 §A.3 |

### A.2 产品面 / 技术面（两个存储面）

```
┌─ 产品面（Product Plane）─────────────────────────────────────────────┐
│  Workspace · Project · Attempt · Attempt Draft State · Content Item   │
│  Insight · Insight State Event · Hypothesis · EvidenceRef             │
│  Retrieval Derivation（当前有效，唯一）                                │
│                                                                       │
│  ← 唯一可进入：用户界面 / 产品判定 / N_检索 · N_引用 / ⑩ 追溯          │
└───────────────────────────────────────────────────────────────────────┘
        ▲ 只允许「产品面读接口」        │ 只允许「技术面写通道」（单向、无回读）
        │                              ▼
┌─ 技术面（Observability Plane，独立命名空间 / 独立访问路径）──────────┐
│  model · model version · prompt version · prompt text · token · cost  │
│  temperature · 采样参数 · trace id · session id · 调用耗时 · 重试次数   │
│  排障运行参数 / 技术日志                                              │
│                                                                       │
│  ✗ 不进产品判定  ✗ 不进用户界面  ✗ 不进 ⑩ 追溯  ✗ 不计入 N_检索/N_引用 │
│  ✗ 不改变任何用户可感知状态                                            │
└───────────────────────────────────────────────────────────────────────┘
```

- **两面的边界是逻辑边界，也必须体现为访问边界**：`domain/` / `data/` **不得**读取技术面；技术面写入**只经单一技术通道**，**不得**与产品面字段混存于同一记录（契约 §11.3「不得与技术层字段混存」）。
- **`Insight` 状态迁移事件日志属产品面行为留痕**，**不是技术观测日志**（契约 §11.3）；两者**不得互表**、**不得合并查询**。

### A.3 明确不存在的对象（禁止在实现中新增）

| ❌ 禁止实体 / 字段 | 依据 |
|---|---|
| `Experience Asset` **独立实体 / 表 / 集合** —— 它是 `accepted Insight` 的**产品视图** | `D-015` / `TC-01` / `AC-13` |
| 「候选经验池」「待处理候选列表」「建议库」「方向待办视图」 | `D-022` / `D-041` / `D-042` |
| 「经验版本」「历史比较版本」「版本号 / 版本对比 / 版本回滚」相关表或字段 | `D-040` / 契约 §2.2 / `TQ11` 默认方向 |
| 「修改幅度 / 修改次数」计数或评分字段 | `D-040` |
| 「已检索过」产品层字段；「检索新鲜度」字段 | `D-045` TR-11 / `AC-80` / `AC-81` |
| 重复的「数据来源」字段（与 `data_source_nature` 语义重叠的任何第二字段） | `D-044` / `AC-77` / `TC-69` |
| 任何数值化「相似度 / 接近度 / 匹配度 / 分数 / 星级 / 百分比 / 置信度」字段（含内部列） | `D-020` / `D-037` / `TC-41` |
| 独立 Vector DB / embedding 表 / 图数据库 / 图关系表 / 队列或定时任务表 / 外部缓存（Redis 等） | `R3` / `R6` / `TC-21` / `TC-25` / `TC-26` / `BLK-01` |
| `Model Suggestion` 作为 `Insight` 的子类型 / 同表别名 | 契约 §1.2 / `D-042` |
| `Hypothesis` → `Experience Asset` 的直接引用关系字段 | `D-041` / `TC-08` / 契约 §3.2 第 4 条 |
| 团队成员 / 角色 / 权限 / 管理员 / 团队工作区相关表 | `D3` / `TC-02` |

---

## §B 核心对象关系

### B.1 层级（不变）

```
（隐式单用户 User —— V1 无独立实体，见 B.2）
  └── Personal Workspace（匿名工作空间标识）
        └── Project（可缺省；仅作组织上下文 + Level B 解释维度）
              └── Attempt（Draft | Formal；+ 归档位）
                    ├── Content Item × n        （逐条携带来来源属性三件套）
                    ├── Attempt Draft State     （Draft 期过程状态，附属记录）
                    └── Retrieval Derivation    （至多 1 条「当前有效」；替换语义）
```

> 🔴 `Project` **不得**作为检索准入过滤条件（`TC-84` / `AC-20`）；缺失 `Project` **不得**以"默认项目"兜底伪造归属。

### B.2 `User` 的最小落地（与 S03-A 一致）

- V1 **不建独立 `User` 实体**：`Workspace` 即"个人工作空间"，**1 个 Workspace ↔ 1 个隐式用户**；**不做登录 / 不做多用户切换 / 不做角色**。
- 判据：`D3` + `TC-02`；与 `01_APP_ARCHITECTURE.md` §12「`User` 可表现为一条隐式用户记录，或仅由 workspace 隐含」**一致**。
- 属 **`TQ06`** 的下游依赖：**最终形态由 Integrator 收敛**；若 Integrator 要求真实账号，**本文件的数据模型不需要结构性改动**（仅新增身份入口）。

### B.3 关系清单（普通关系，不绑图数据库）

| 关系语义 | 实现位置 | 说明 |
|---|---|---|
| `belongs_to` | 对象内所属键 | `Attempt` → `Project` → `Workspace` |
| `owned_by`（内容归属） | `Content Item.owner_id` + `owner_type` | 内容条目归属 `Attempt` / `Insight` / `Hypothesis` |
| `evidence_for` / `contradicts` | **`EvidenceRef` 集合**（唯一） | `role` 承载；**唯一证据来源** |
| `generated_from` | `Insight.source_attempt_id` / `Hypothesis.source_attempt_id` | 第 ⑧ / ⑨ 步生成出处（**仅为出处，不是证据**） |
| `similar_to` | **`Retrieval Derivation` 的候选条目 + 比较点** | ⚠️ **不是**独立关系表；**不得**成为证据；**不得**计入 `N_引用` |
| `derived_from` | `Retrieval Derivation.source_attempt_id` | 派生结果 ← 源 `Attempt` |
| 推理输入（非证据） | `Hypothesis` / `Insight` 的**推理输入清单字段**（见 C.8） | ⚠️ **不在 `EvidenceRef` 集合内**（见 §E.5 + `CCR-S03B-01` 邻接项） |

> **R3**：以上关系**不得**实现为图数据库 / 图推理 / 图谱可视化系统；`similar_to` **不得**成为独立实体。

---

## §C 逻辑 schema

> 说明：以下**只用逻辑字段名 + 语义 + 必填性 + 取值**描述；**不含字段类型、索引、SQL / DDL**。序列化形式与枚举命名统一归 **`TQ15` / `TQ16`（Integrator）**，本文件所给字段名 / 取值名均为 **PROPOSED**。

### C.1 `Workspace`

| 逻辑字段 | 必填 | 语义 |
|---|---|---|
| `workspace_id` | ✅ | 匿名工作空间标识（不可猜；长期持有） |
| `created_at` | ✅ | 系统元数据 |
| `display_label` | ❌ | 展示用名称（**可选**；缺失不影响任何判定） |

**不变量**：**不得**承载角色 / 权限 / 成员 / 配额类字段。

### C.2 `Project`

| 逻辑字段 | 必填 | 语义 |
|---|---|---|
| `project_id` | ✅ | 唯一标识 |
| `workspace_id` | ✅ | 所属工作空间 |
| `title` | ✅ | 用户填写的项目 / 场景名称 |
| `created_at` / `updated_at` | ✅ | 系统元数据 |

**不变量**：`Project` **不参与**准入过滤（`TC-84`）；**不得**成为检索 API 的必需参数。

### C.3 `Attempt`

| 分组 | 逻辑字段 | 必填 | 语义 / 取值 |
|---|---|---|---|
| 标识 | `attempt_id` | ✅ | 全局唯一、稳定、不可复用 |
| 归属 | `workspace_id` | ✅ | 所属工作空间 |
| 归属 | `project_id` | ❌ | 可缺省（**缺省 = 未归属，不是「未知 / 未提供」**） |
| **两级状态** | `attempt_status` | ✅ | `Draft` / `Formal`（**持久化状态位**，系统**不得**自动升级） |
| **归档位（正交）** | `archive_state` | ✅ | `active` / `archived`（**单一状态位**；见 §G.1 关于不引入归档时间戳的合规说明） |
| 原始信息 | `raw_text` | ✅（创建即有） | 用户原始描述 = **`Fact`**；第 ① 步**唯一门槛 = 非空、非纯空白** |
| L4 | `created_at` | ✅ | 创建时间（系统元数据） |
| L4 | `updated_at` | ✅ | **最近修改时间**（系统元数据；须支撑"该 `Formal Attempt` 是否被修改过"的判定） |
| L4 | `data_source_nature` | ✅ | **数据来源性质**：现场记录 / 事后补录 / **Demo 示例数据**（**复用此唯一字段，不新增重复字段**） |
| L4 | `ai_source_marks` | **派生** | **AI 内容来源标记** —— **不新增存储字段**，由该 `Attempt` 全部 `Content Item.source_type` **投影得出**（见 C.4） |

**P1 与结果状态（`Formal` 门槛）** —— **不作为 `Attempt` 裸字段存储**，而是 `Content Item` 中的 `goal` / `actual_attempt` / `actual_result` / `result_status` 四条**必填条目**（见 C.4.3）。

**不变量（`Attempt`）**

| # | 不变量 | 依据 |
|---|---|---|
| A-1 | `Formal` ⇔ `goal` ∧ `actual_attempt` ∧ `actual_result` ∧ `result_status` **四条条目均存在且为用户确认态**；缺任一 → **保持 `Draft`** | `TC-04` / `AC-03` / `AC-Q06-5` |
| A-2 | **系统不得自动**把 `Draft` 升级为 `Formal`（无"信息齐了就自动升"、无"预算用完就升"） | `D-012` / `TC-04` / `TC-35` |
| A-3 | **不存在** `deleted` 终态；**不提供物理删除入口或 API 语义** | `D-043` / `TC-56` |
| A-4 | `archive_state = archived` ⇒ **只读**（写入路径拒绝内容性修改）；取消归档后**完全恢复** | `TC-57` / `AC-71` / `AC-72` |
| A-5 | L4 **恰 4 项**，**不得**为第 5 项（例如"发生时间"、"归档时间"、"是否已检索"） | `TC-69` / `AC-77` / `D-045` TR-11 |
| A-6 | 「发生时间」若由用户提供 → 是**用户 `Fact` 内容条目**（`occurred_at` 条目），**不是**系统字段；`created_at` **不得**冒充发生时间 | `TC-17` / `AC-78` |

### C.4 `Content Item`（内容条目）

> 契约 §1.5：`Attempt` 的字段不是无来源的裸值集合，而是**逐条携带来源属性的内容条目**。

#### C.4.1 逻辑字段

| 逻辑字段 | 必填 | 语义 |
|---|---|---|
| `item_id` | ✅ | 条目唯一标识（**禁止用数组下标 / 排序位置代替**） |
| `owner_type` | ✅ | `attempt` / `insight` / `hypothesis` |
| `owner_id` | ✅ | 所属对象 ID |
| `field_key` | ✅ | 字段路径键（**映射表由 Integrator 冻结 → `TQ18` / `TQ19`**） |
| `source_type` | ✅ | **不可缺省**：`Fact` / `Extraction` / `Inference` |
| `confirmation_class` | 条件必填 | **仅 `Inference` 必需**：`display` / `decision` |
| `decision_state` | 条件必填 | **仅 `decision` 必需**：`unresolved` / `accepted` / `rejected` |
| `presence_state` | ✅ | **显式存在位**：`present` / `unknown`（见 §H.2 / `TQ08`） |
| `value_text` | 条件必填 | 条目取值；**`presence_state = unknown` ⇒ 必须为空** |
| `user_feedback` | ❌ | **仅展示型条目**：`none` / `disagree` / `not_relevant`（见 C.4.5） |
| `origin_hint` | ❌ | 值来源说明（例如"来自追问回答"/"来自用户补录"）；**不得**承载技术参数 |

#### C.4.2 硬不变量

| # | 不变量 | 依据 |
|---|---|---|
| C-1 | `source_type` **恒不变**：任何用户动作（接受 / 撤销 / 修改 / 归档 / 保存）**都不得**改变它 | `TC-12` |
| C-2 | `Inference ⇒ confirmation_class 必填`；`decision ⇒ decision_state 必填`；**`display` 条目不得出现"已确认"状态**（`user_feedback ≠ decision_state`） | `TC-11` / `TC-14` / `AC-09` |
| C-3 | `decision_state = unresolved` 的决策型条目**不得进入**：依据 / 门槛 / 版本来源 / 比较输入 / 后续决策依据 | `TC-13` / `AC-10`（校准口径） |
| C-4 | `presence_state = unknown` 的条目**不参与比对**；比较结果**必须**标"该维度未比对" | `TC-40` / `AC-22` |
| C-5 | **追问答案双层落库**：用户原话 → `Fact` 条目；AI 归纳 → `Extraction` 条目（可修改）；**禁止反向标注** | `TC-15` / `AC-30` |
| C-6 | 第 ⑤ 项「保持不变」三分：历史条件值 = `Fact` / `Extraction` 引用；**AI 建议「保持」= `Inference`**；**用户本人指定 = 用户 `Fact`**；**`Fact` 层不得出现 AI 推荐值** | `TC-16` / `AC-32` |
| C-7 | `attempt_status = Formal` 的必备条目（`goal` / `actual_attempt` / `actual_result` / `result_status`）**`presence_state` 必须为 `present`** | `TC-04` |
| C-8 | **条目不得携带任何数值化相似度 / 置信度 / 分数** | `TC-41` |

#### C.4.3 `field_key` 提案清单（PROPOSED → `TQ18` 由 Integrator 冻结）

| 分组 | `field_key`（提案） | 备注 |
|---|---|---|
| 原始信息 | `raw_text` | 创建 `Draft` 即有；`Fact` |
| **`Formal` 必备（P1 + 结果状态）** | `goal` / `actual_attempt` / `actual_result` | 缺任一 → 保持 `Draft` |
| **`Formal` 必备** | `result_status` | 决策型 `Inference`；**必须**有用户显式接受 / 修改动作（四态 `Failed` / `Partial` / `Success` / `Unknown`） |
| 允许缺省（可记「未知 / 未提供」） | `condition` / `expected_result` / `judgment_basis` / `key_parameter` / `version_env` | **`presence_state` 必须显式** |
| 用户内容字段 | `occurred_at`（发生时间，属用户 `Fact`）/ `note` / `cost` / `failure_tag`（仅 optional tag） | 「发生时间」**不计入 L4** |
| 第 ④ 步产物 | `candidate_cause` | 决策型 `Inference`；**允许 0 条、不设上限、不要求逐条处理** |
| 追问产物 | `followup_question` / `followup_user_answer` / `followup_ai_extraction` | `followup_question` 为**系统生成**的第 ② 步产物（`Inference｜display`） |
| `Insight` 内容性字段 | `insight_proposition` / `insight_scope` / `insight_basis` / `insight_verifiability` | 契约 §2.2 内容性字段 ① ② ④（③ 引用清单 = `EvidenceRef`，见 §E） |
| `Hypothesis` 8 项 | `hypothesis_statement` / `hypothesis_basis` / `hypothesis_history_refs` / `hypothesis_change` / `hypothesis_keep` / `hypothesis_metric` / `hypothesis_support_criterion` / `hypothesis_contradict_criterion` | 严格 1:1 对齐 `D-027` 8 项；**⑤ 拆三类来源** |

> ⚠️ `field_key` **不得**新增与 canonical 字段框架（`D-013` 五组）冲突的项；**不得**新增"失败类型分类体系"法定字段（仅 optional tag）。

#### C.4.4 「0 条」与「全部未处理」的表达（`D-048` / `AC-95`）

- **0 条** = 该 `Attempt` **不存在** `candidate_cause` 条目 → 界面呈现"当前依据不足，暂不推断原因"。
- **全部未处理** = 存在 `candidate_cause` 条目且**全部** `decision_state = unresolved` → 界面呈现"有候选但尚未处理"。
- 二者**由同一集合的可数状态区分，不需要任何额外字段**；**不得共用同一文案**。

#### C.4.5 展示型条目的用户反馈（PROPOSED，收紧型设计）

- `user_feedback` **不是** `decision_state`，**不得**复用它，**不得**被读作"已确认"。
- **硬规则**：`user_feedback` 的取值、是否设置，**一律不改变任何持久化业务状态**、**不参与任何判定**、**不进 `⑩`**、**不计入 `N_*`**、**不得升级为 `Fact`**（`TC-14`）。
- 若 Integrator 判定 V1 不落库该反馈，则**界面不得提供无效果的可点击入口**（"点了没反应"属 `D-034` 禁止的空动作）—— 二者必选其一，由 Integrator 收敛。

### C.5 `Attempt Draft State`（附属状态记录，1:1）

| 逻辑字段 | 必填 | 语义 |
|---|---|---|
| `attempt_id` | ✅ | 1:1 指向 `Attempt` |
| `parse_state` | ✅ | **非等级化状态**：`not_parsed` / `extracted` / `not_extracted` / `extract_failed` / `pending_user_confirm`（`TC-64` / `AC-88`） |
| `asked_key_question_count` | ✅ | **关键追问问题计数器（持久化）** —— 计数单位 = **问题数**，**不是对话轮次**；上限 3 |
| `abandoned_gap_set` | ✅ | 已被用户选择「不知道 / 跳过」的缺口集合（**不得再次追问同一缺口**） |
| `gap_priority_hint` | ❌ | 当前剩余缺口及其优先级（`P1` / `P2` / `P3`）提示，供第 ② 步续写 |

**硬规则**

1. **必须有持久化计数器**，**不得**用对话回合数替代（`TC-29` / `AC-Q06-1`）。
2. `Formal` 化后该记录**保留不删除**（只读留档），但**不再承载门槛作用**；**不得**据此产生任何"完成度"表达。
3. **属附属状态记录**：**不可被引用**、**不进 `⑩`**、**不计入 `N_*`**、**不构成事实 / 经验对象**。
4. **不得**承载"已检索过"语义；**不得**承载任何技术参数（`model` / `prompt` / `token` 等）。
5. `abandoned_gap_set` 的缺口粒度须与 `field_key` 对齐（**1 问题 ↔ 1 主要高价值缺口**，不得包裹多项）（`TC-30` / `AC-Q06-3`）。

### C.6 `Insight`

| 分组 | 逻辑字段 | 必填 | 语义 |
|---|---|---|---|
| 标识 | `insight_id` | ✅ | 全局唯一、稳定、不可复用 |
| 归属 | `workspace_id` | ✅ | 所属工作空间 |
| 状态 | `status` | ✅ | `candidate` / `accepted` / `rejected` |
| 生成出处 | `source_attempt_id` | ✅ | 第 ⑧ 步生成时所在 `Attempt`（**仅为出处，不是证据**） |
| 来源属性 | （由内容条目承载） | ✅ | **恒为 `Inference`** —— `accepted` 后**仍为 `Inference`** |
| 内容性字段 ① | `insight_proposition` | ✅ | 经验命题内容（结论表述）→ 内容条目 |
| 内容性字段 ② | `insight_scope` | ✅（可含 `unknown` 维度） | 适用范围 / 条件集合 → 内容条目组 |
| **内容性字段 ③** | **引用清单** | ✅ | = 该 `Insight` 的 `EvidenceRef` 集合（**不另存副本**） |
| 内容性字段 ④ | `insight_basis` / `insight_verifiability` | 条件必填 | 判断依据 / 可验证判据 → 内容条目 |
| E 检查呈现 | `e1_state` / `e4_state` | ✅（派生） | **结构性检查**（可机器核验），由引用集合派生 |
| E 检查呈现 | `e2_check` / `e3_check` | ✅（派生） | **内容质量判断** → **必须标 `Inference`**、与判定理由同屏；**不得**分数 / 等级 / 置信度 |
| E4 条件项 | `comparison_ref` | ❌ | 「使用了哪些比较结果」→ 指向 `Retrieval Derivation`；**条件项、非硬门槛、不计入 `N_引用`** |
| 缺口呈现 | `missing_items` | 条件必填 | `D-038` 三段式的**缺什么**（`E2` / `E3` / 二者） |
| 建议 | `how_to_supplement` | 条件必填 | 「如何补充」= **展示型 `Inference`**（不改变持久化业务状态） |

**硬不变量**

| # | 不变量 | 依据 |
|---|---|---|
| I-1 | `Insight` **不与生成它的 `Attempt` 级联删除**；**无物理删除** | 契约 §3.1 / `D-043` |
| I-2 | `accepted` 只表示"用户接受为当前可复用经验"，**不表示客观证实**；**存储与界面恒标 `Inference`** | `D-015` / `AC-11` / `AC-27` |
| I-3 | `E1`–`E4` 判定结果**用户不可编辑**；**不存在绕过 `E1`–`E4` 的晋升路径** | `TC-77` / `AC-61` |
| I-4 | 内容性字段（①②③④）**任一被修改 ⇒ `status → candidate` + 立即重检 `E1`–`E4`**；`rejected` 被修改 ⇒ 回 `candidate`（**不得**沿用旧拒绝、**不得**直接 `accepted`） | `TC-74` / `TC-75` / `AC-62` / `AC-64` |
| I-5 | 非语义 / 元信息修改 ⇒ 状态**不变** | `TC-75` |
| I-6 | **不建可见版本列表 / 版本对比 / 版本回滚 / 版本号选择 / 软删除历史** | `D-040` / 契约 §2.2 |
| I-7 | `E2` / `E3` 不满足 ⇒ **保持 `candidate`** + 三段式；**不进入任何 0 条出口** | `D-038` / `TC-65` / `AC-99` |
| I-8 | **`Experience Asset` 视图 = 任何时刻只呈现当前 `accepted` 的 `Insight`**（**视图，不落表**） | `D-039` / `AC-61` |

### C.7 `Insight State Event`（状态迁移事件日志 = 产品层行为留痕）

| 逻辑字段 | 必填 | 语义 |
|---|---|---|
| `event_id` | ✅ | 唯一标识 |
| `insight_id` | ✅ | 所属 `Insight` |
| `from_state` | ✅ | 迁移前状态 |
| `to_state` | ✅ | 迁移后状态 |
| `occurred_at` | ✅ | 时间 |
| `trigger_kind` | ✅ | 触发原因类别（见 C.7.1） |

#### C.7.1 `trigger_kind` 取值（PROPOSED）

| 取值 | 含义 | 是否在 canonical 枚举内 |
|---|---|---|
| `user_accept` | 用户接受（`E5`） | ✅ `D-040` |
| `user_revoke` | 用户撤销接受 | ✅ `D-040` |
| `content_modified` | 内容性字段被修改导致退回 | ✅ `D-040` |
| `re_accept` | 修改 / 撤销后重新接受 | ✅ `D-040` |

> 🔴 **`candidate → rejected`（用户拒绝）如何表达？**
> canonical 的 `trigger_kind` 枚举**只有四类**（`D-040` / 契约 §11.3），**未含"用户拒绝"**。
> **本文件的处置：不新增触发类别** —— 依赖 `from_state` / `to_state` 对表达：**`to_state = rejected` 的唯一可能来自 `candidate`**（契约 §2.2 中唯一进入 `rejected` 的迁移即"`candidate` + 用户拒绝"），因此该迁移**可由状态对唯一确定**，无需扩展 canonical 枚举。
> ⚠️ 若 Integrator 认为必须显式标注"用户拒绝"，则属**对 canonical 已枚举类别的扩展** → **不得由 Worker 自行决定**，须走 `DECISIONS.md` 变更流程（登记为 §L 待收敛项，**不是 CCR**）。

#### C.7.2 写入点清单（PROPOSED → `TQ25`）

| # | 写入点 | 事件 | 触发类别 |
|---|---|---|---|
| W-1 | 第 ⑧ 步 `Insight` 创建 | （创建，**不写迁移事件**；以 `created_at` 表达） | — |
| W-2 | 用户接受 | `candidate → accepted` | `user_accept` |
| W-3 | 用户撤销接受 | `accepted → candidate` | `user_revoke` |
| W-4 | 内容性字段修改 | `accepted → candidate` / `rejected → candidate` / `candidate → candidate`（**刷新**） | `content_modified` |
| W-5 | 修改后重新接受 | `candidate → accepted` | `re_accept` |
| W-6 | 用户拒绝 | `candidate → rejected` | （按 C.7.1，**由状态对表达**） |
| W-7 | 其引用证据被归档 | **不写事件**（归档**不是**内容性修改，状态不变） | — |

**硬规则**：事件日志**不得**被用作价值评分 / 质量排名 / 经验等级 / 修改次数评分（`TC-72`）；**不得**据此自动生成可见版本列表（`I-6`）；**不得**与技术层日志混存。

### C.8 `Hypothesis`（第 ⑨ 步独立输出对象）

| 分组 | 逻辑字段 | 必填 | 语义 |
|---|---|---|---|
| 标识 | `hypothesis_id` | ✅ | 两类共用同一 ID 空间 |
| 归属 | `workspace_id` | ✅ | 所属工作空间 |
| **类别** | `kind` | ✅ | `grounded`（History-grounded Hypothesis）/ `model`（Model Suggestion） |
| **裁决位** | `decision_state` | ✅ | `undecided` / `accepted` / `rejected` —— **不得使用 `candidate`** |
| **保存位（仅 `model`）** | `saved_by_user` | 条件必填 | **仅 `kind = model` 有意义**；**独立于裁决位** |
| 生成出处 | `source_attempt_id` | ✅ | 第 ⑨ 步所在 `Attempt` |
| 来源属性 | （由内容条目承载） | ✅ | **恒为 `Inference`（决策型）** |
| 8 项结构 | 8 条 `field_key = hypothesis_*` 内容条目 | ✅（①–④ 必填；⑤–⑧ 允许显式缺失） | 严格 1:1 对齐 `D-027` 8 项 |
| **分区** | `source_partition` | ✅ | `history_evidence` / `model_prior`（**仅两个分区；无"混合"第三值**） |
| 整体标注 | `model_prior_notice` | 条件必填 | `kind = model` ⇒ **恒存、整体显著标注**「非你的历史经验依据」 |
| 推理输入清单 | `reasoning_input_refs` | ❌ | **非证据**的推理输入引用清单（含未接受 `Insight`）；**不计入 `N_引用`、不进 `⑩`、不承担 grounding** |
| 证据概况 | `evidence_overview` | ✅（派生） | `N_引用` 实际数量 / 单来源提示 / 是否存在冲突 / 条件缺失说明（**派生，不落重复数字**） |

**硬不变量**

| # | 不变量 | 依据 |
|---|---|---|
| H-1 | **`candidate` 一词不得用于任何 `Hypothesis`**；`candidate` / `accepted` / `rejected` **仅适用于第 ⑧ 步产物** | `TC-07` / `AC-33` |
| H-2 | **`saved_by_user = true` ≠ `decision_state = accepted`**；已保存未裁决 **只能**表达为"内容被保留，决策状态仍未完成"；**不得作为已接受方向复用** | `TC-09` / `AC-67` / `AC-68` |
| H-3 | `kind = grounded` ⇒ **必须存在 grounding**（G1–G4 之一且引用可追溯）；**不设"部分锚定"中间等级** | `TC-50` / `AC-36` |
| H-4 | `kind = model` ⇒ **`EvidenceRef` 集合必须为空**；**不得**承担 grounding、**不得**被 `⑩` 追溯、**不得**计入 `N_*`、**不得**升级为 `grounded` | `TC-54` / `AC-70` |
| H-5 | **`Hypothesis` 与 `Experience Asset` 之间不得存在任何直接对象引用**；唯一合法路径 = 实际执行 → 新 `Formal Attempt` → ⑥⑦⑧ → `E1`–`E5` | `TC-08` / `AC-66` |
| H-6 | 两类输出**均不得**出现在经验区、**不得**被任何"经验"措辞指代、**不得**改称 `Insight` | `D-041` / `D-042` |
| H-7 | `kind = grounded` 数量 = **1–2 条**，由**独立可验证方向数**决定，**不由 `N_检索` 决定**；**禁止凑数 / 近义改写 / 默认 2 条 / ≥3 条** | `TC-28` 邻接 / `D-028` / `AC-34` |
| H-8 | 输出 0 条时**必须**记录原因类别（`EXIT-A evidence-insufficient` / `EXIT-B not-verifiable` / `EXIT-C not-formable`），**禁止裸用 `A`/`B`/`C`** | `TC-65` / 契约 §10.2 |
| H-9 | `Model Suggestion` **数量另计**，**不得**占据历史依据型输出的位置、**不得**用于凑满 `grounded` 数量 | `AC-46` |

### C.9 `EvidenceRef` 集合

见 **§E**（唯一证据集合；`target` 只允许 `Formal Attempt`；`role` 逐条必填）。

### C.10 `Retrieval Derivation`（当前有效比较派生结果 —— 每 `Formal Attempt` 至多 1 条）

| 逻辑字段 | 必填 | 语义 |
|---|---|---|
| `derivation_id` | ✅ | 派生记录标识 |
| `source_attempt_id` | ✅ | **唯一键**（一个 `Attempt` 至多一条"当前有效"派生结果） |
| `generated_at` | ✅ | 生成时间（技术元数据，用于替换时的覆盖序；**不出界面、不可选择**） |
| `n_retrieval` | ✅ | **`N_检索`**：命中 `Level A` 且可被引用的 `Formal Attempt` 条数（**排除 `Draft` / 排除已归档 / 排除源 `Attempt` 自身**） |
| `hit_level_a_dimensions` | ✅ | **命中的 Level A 维度集合**（目标 / 方案·技术对象 / 条件 / 结果·现象） |
| `uncompared_dimensions` | ✅ | **未比对维度集合**（用于"该维度未比对"） |
| `candidate_entries` | ✅ | 候选条目（每条 = 一条相关历史 `Attempt` 的引用 + 顺序键） |
| `fold_hint` | ✅ | 首屏 3 条 / 可继续查看条数（**阅读负荷控制，不得截断 `N_检索`**） |

**子结构（同属派生产物，落存储）**

| 子结构 | 逻辑字段 | 语义 |
|---|---|---|
| `candidate_entries` | `attempt_ref` / `order_key` | `order_key` = **Level C（时间）仅作辅助排序**；**不得**作主排序键、**不得**默认选中"最近一次" |
| `comparison_points` | `attempt_ref` / `point_kind`（`similar` / `different`）/ `dimension_key` / `text` | 相似点 / 差异点 —— **均为展示型 `Inference`**；`dimension_key` 必须落在 Level A 四维度内 |
| `relevance_reasons` | `attempt_ref` / `reason_text` | 「为什么相关」的可解释理由（**不得**出现数值） |
| `pair_feedback` | `attempt_ref` / `user_feedback` | **仅展示型反馈**（同 C.4.5 硬规则） |

**硬不变量**

| # | 不变量 | 依据 |
|---|---|---|
| R-1 | **每 `Formal Attempt` 至多 1 条**当前有效派生结果；**用户显式重新检索 ⇒ 覆盖替换**；**不保留被替换结果** | `TQ11` 默认方向 / `D-045` TR-7 |
| R-2 | **不建历史表 / 不建版本号 / 不做软删除 / 不提供回滚**；**无任何用户可见的版本列表或版本选择** | `D-040` / `D-046` |
| R-3 | 派生结果**不属于证据**：**不得**成为 `EvidenceRef.target`、**不进 `⑩`**、**不计入 `N_引用`**、**不得**作为 grounding | 契约 §5.1 / `TC-51` |
| R-4 | 派生结果**不得**承载任何数值化相似度 / 分数 / 星级 / 百分比（含内部列） | `TC-41` |
| R-5 | 派生结果的生成**必须**在触发事件（`Formal Attempt` 保存成功 / 用户显式重新检索）的**同一次调用链内同步完成**；**不得**排队 / 异步 / 批量 / 定时 | `TC-21` / `TC-25` / `BLK-01` |
| R-6 | 替换派生结果**不得**级联修改任何 `Insight` / `Hypothesis` 的持久化状态，**不得**改写既有 `EvidenceRef` 集合 | `D-045` TR-7 |
| R-7 | **归档 / 取消归档不触发检索**，因此**不产生影响派生结果的写入** | `TC-25` / `AC-73` |

#### C.10.1 `order_key` 与 `Level C` 的落地约束（`TC-39` / `Q16` 派生关闭）

- `order_key` **只允许**由"用户提供的实际发生时间"参与构造；
- **`created_at` 不得冒充发生时间**；**是否允许 `created_at` 作纯展示层 fallback 属 `TQ13`，默认不引入**；
- **"并列判定"技术判据属 `TQ14`，默认不引入**；`order_key` 的构造**不得**依赖任何"并列"判据；
- `order_key` **不出界面**（界面只呈现 Level A 理由与顺序本身）。

### C.11 纯派生（不落独立存储）清单

| # | 派生项 | 由何派生 | 硬规则 |
|---|---|---|---|
| V-1 | `Experience Asset` | 当前 `accepted` 的 `Insight` | **视图**，非实体；**任何时刻只呈现当前 `accepted`** |
| V-2 | 可参与检索的 `Attempt` 集合 | `attempt_status = Formal` ∧ `archive_state = active` ∧ `≠ 源 Attempt` | 单点过滤（§G.2）；**不得**由调用方拼装 |
| V-3 | `ai_source_marks`（L4 ④） | 该 `Attempt` 全部 `Content Item.source_type` | **投影**，**不新增存储字段**（`TC-69` / `AC-77`） |
| V-4 | `N_引用` | 该 owner 的 `EvidenceRef` 集合（`role ∈ {grounding, support, contradict}`）**按被引记录去重** | **不落库**；实时派生（§F.3） |
| V-5 | 档位（`0` / `1` / `≥2`） | `n_retrieval` 的纯函数映射 | **只由 `N_检索` 决定**（`TC-46`） |
| V-6 | 两种空态判定 | 「历史库是否为空」= 是否存在任何 `Formal Attempt` | **不需要新字段**（`TC-66` / `AC-55`） |
| V-7 | 「来源已归档」标注 | 被引记录的**当前** `archive_state` | 见 `CCR-S03B-02`（§M.2） |
| V-8 | 「0 条」vs「全部未处理」 | `candidate_cause` 条目集合的可数状态 | 不需要新字段（C.4.4） |
| V-9 | 内容性字段修改检测 | 修改动作本身（请求语义），**不依赖时间戳比较** | 见 §G.3（**不引入任何检测字段**） |

### C.12 技术面（Observability Plane）

| 项 | PROPOSED |
|---|---|
| **存储位置** | **独立命名空间 / 独立表集合**（**不得**与产品面记录同表混存） |
| **字段范围** | `model` / `model version` / `prompt version` / `prompt text` / `token` / `cost` 核算值 / `temperature` / 采样参数 / `trace id` / `session id` / 调用耗时 / 重试次数 / 排障运行参数 |
| **访问路径** | **单向写入**；**`domain/` 与 `data/`（产品面）不得读取** |
| **内部检索分数** | **建议不落库（进程内即弃）** —— 契约 §11.2 允许技术层存在；本建议为**收紧**（`E-1 最小化`），**不改变契约语义** |
| **强制三条** | ① 与产品层**逻辑隔离**；② **不参与任何产品判定**；③ **不进用户界面、不进 `⑩` 追溯、不改变任何用户可感知状态、不计入 `N_*`** |
| **禁止** | 技术字段出现在**任何接口响应体**中（含错误对象、含调试模式）；建议以**契约测试断言这些字段不存在** |

---

## §D 状态机

### D.1 `Attempt` 状态模型（两维正交）

```
                     archive_state = active                archive_state = archived
                 ┌──────────────────────────────┬───────────────────────────────┐
 attempt_status  │  Draft（可编辑 / 可续写）      │  已归档 Draft                 │
      = Draft   │  · 不参与 ⑥ / ⑧ / E1 /        │  · 只读；可取消归档             │
                 │    grounding / N_检索          │  · 不触发检索                   │
                 ├──────────────────────────────┼───────────────────────────────┤
 attempt_status  │  Formal（默认参与）            │  已归档 Formal                │
      = Formal  │  · 参与 ⑥ / ⑧ / 新 E1 /        │  · 只读；可取消归档             │
                 │    新 grounding / N_检索        │  · 不参与新 ⑥ / 新 grounding /  │
                 │  · 可编辑（修改不自动重跑 ⑥）   │    新 N_检索 / 新 E1 来源 /     │
                 │                                │    默认跨记录比较               │
                 │                                │  · **既有 ⑩ 追溯保留**          │
                 │                                │    （标「来源已归档」）          │
                 └──────────────────────────────┴───────────────────────────────┘

❌ 不存在 deleted 终态；❌ 不提供物理删除入口 / API 语义
```

**`Draft → Formal` 门槛（唯一）**

```
门槛 = ① 目标（goal） + ② 实际尝试（actual_attempt） + ③ 实际结果（actual_result）
       + ④ 用户显式确认后的结果状态（result_status，决策型 Inference，须用户接受 / 修改）
触发 = 仅用户显式确认动作；系统不得自动升级
不满足 = 保持 Draft（即使追问问题预算 3 个已用尽）
```

**迁移表**

| 起始 | 动作 | 迁移后 | 是否触发 ⑥ 检索 | 依据 |
|---|---|---|---|---|
| （无） | 第 ① 步非空非纯空白输入 | 创建 `Draft` | ❌ | `D-047` / `TC-20` |
| `Draft` | 编辑 / 续写 / 解析 / 追问 / 中途离开 | 保持 `Draft` | ❌ | `TC-25` |
| `Draft` | 保存 `Draft` | 保持 `Draft`（**保存成功 ≠ 升级**） | ❌ | `TC-25` |
| `Draft` | 用户显式确认（P1 + 结果状态齐备） | `Formal` | ✅ **唯一自动触发** | `TC-21` / `AC-79` |
| `Draft` | 保存失败 | 保持原状态 | ❌ | `D-045` TR-4 |
| `Formal` | 修改内容 | 保持 `Formal` | ❌（**须显式提示 + 提供「重新检索」**） | `TC-24` / `AC-80` |
| 任一 | 用户显式归档 | `archive_state = archived` | ❌ | `TC-25` / `AC-73` |
| 已归档 | 取消归档 | `active`（**完全恢复**） | ❌ | `AC-71` / `AC-73` |
| 任一 | （尝试）物理删除 | **不存在** | — | `TC-56` / `AC-76` |

### D.2 `Insight` 状态迁移（唯一矩阵，与契约 §2.2 逐行一致）

| 起始 | 用户动作 | 迁移后 | 事件 `trigger_kind` | 依据 |
|---|---|---|---|---|
| `candidate` | 接受（**仅当 `E1`–`E4` 已满足**；等价于 `E5`） | `accepted` | `user_accept` | `D-039` / `AC-61` |
| `candidate` | 拒绝（**不要求** `E1`–`E4` 满足） | `rejected` | （由状态对表达，见 C.7.1） | `D-015` |
| `accepted` | 撤销接受 | `candidate`（**不是 `rejected`**） | `user_revoke` | `D-039` |
| `accepted` | 修改**内容性字段** | `candidate` + **立即重检 `E1`–`E4`** | `content_modified` | `D-040` / `AC-62` |
| `candidate` | 修改**内容性字段** | `candidate`（刷新 `E1`–`E4` 呈现） | `content_modified` | `D-040` |
| `rejected` | 修改**内容性字段** | `candidate`（**不得沿用旧拒绝、不得直接变 `accepted`**） | `content_modified` | `D-040` / `AC-64` |
| 任一 | 修改**非语义 / 元信息** | **不变** | —（不写事件） | `D-040` / `AC-64` |
| `accepted` | 其引用证据被归档 | **不变** | —（不写事件） | `D-043` / `AC-74` |

**内容性字段集合（可枚举，不判断"实质性"）** = ① `insight_proposition` ② `insight_scope`（适用范围 / 条件集合）③ **引用清单 = `EvidenceRef` 集合** ④ `insight_basis` / `insight_verifiability`。
**角色不确定的字段一律按内容性字段从严处理。**
**实现要点**：③ 是集合而非标量 ⇒ **写入 / 删除任何 `EvidenceRef`（owner 为该 `Insight`）即视为内容性修改**，必须走同一退回路径。

### D.3 `Hypothesis` 状态模型（**不继承 `Insight` 三状态机**）

```
kind = grounded                          kind = model
  ┌──────────────────────────┐             ┌────────────────────────────────────┐
  │ 输出即持久化（无"保存位"） │             │ 保存位 saved_by_user（独立）        │
  │ decision_state:          │             │   false ──(用户保存)──► true         │
  │   undecided              │             │   · true ≠ 接受 ≠ 采纳 ≠ 确认        │
  │      │ 接受 / 拒绝        │             │ decision_state:                     │
  │      ▼                   │             │   undecided ──接受/拒绝──► accepted  │
  │   accepted / rejected    │             │                            / rejected │
  └──────────────────────────┘             └────────────────────────────────────┘
        │                                                │
        └────────────┬───────────────────────────────────┘
                     ▼
   ❌ 不得成为 Experience Asset（无任何直接对象引用）
   ✅ 唯一合法路径：用户实际执行 → 新 Formal Attempt → ⑥⑦⑧ → E1–E5
```

| 规则 | 内容 |
|---|---|
| 允许值 | **只有** `undecided` / `accepted` / `rejected`；**`candidate` 不得用于任何 `Hypothesis`** |
| 保存位 | **仅 `kind = model`**；**与裁决位两个独立字段**；`saved_by_user = true` 不得被渲染为"接受 / 确认 / 采纳" |
| 状态回退 | **不设** `Hypothesis` 自身的状态回退链（如"接受后修改则退回"）—— canonical 未定义，**不得自行创造**；修改内容的处理属 §L 待 `S03-C` 确认项 |
| 与经验层 | **无生命周期关系**；**不进经验区**；**不计入 `N_*`** |

### D.4 三层语义与出口（数据层承载方式）

| 语义层 | 数据层承载 | 硬规则 |
|---|---|---|
| `GATE`（对象门槛未满足） | 状态位本身（`attempt_status = Draft` / `Insight.status = candidate` / 无 `grounded` 输出） | **只影响升级与输出资格**；**不删产物、不显示为系统错误、不锁死继续操作** |
| `RUNTIME`（技术失败） | **不落状态位**；由响应语义表达 | **保留已保存数据**；**不设次数上限 / 冷却门槛**；`重试不得回滚已保存数据、不得覆盖用户已修改内容` |
| `ACCEPTANCE`（验收） | 不建议任何字段 | **不得**用数据状态替代验收（`D9` 十步须完整成功执行） |

**合法为空与 0 条出口**

| 情形 | 数据层表达 |
|---|---|
| `N_检索 = 0` | `n_retrieval = 0` ⇒ **合法冷启动降级**（**不是错误**）；两种空态由 V-6 区分 |
| 第 ⑧ 步 0 条出口 | 常用 = `EXIT-A evidence-insufficient` / `EXIT-C not-formable` |
| 第 ⑨ 步 0 条出口 | `EXIT-A` / `EXIT-B not-verifiable` / `EXIT-C` **分别记录**，**禁止合并为"历史证据不足"** |
| `E2` / `E3` 不满足 | **不进入任何出口**；保持 `candidate` + 三段式（`missing_items` / 后果 / `how_to_supplement`） |

---

## §E `EvidenceRef` 设计

### E.1 最小逻辑字段集（PROPOSED → `TQ17`）

| 字段 | 必填 | 语义 | 备注 |
|---|---|---|---|
| `evidence_ref_id` | ✅ | 引用记录自身 ID | 全局唯一；**不得**用位置代替 |
| `target_id` | ✅ | **只允许指向 `Formal Attempt`**（含已归档） | **禁止指向 `Draft`**；**禁止指向 `Insight` / `Hypothesis` / 派生产物** |
| `source_field_path` | ✅ | 被引用的可追溯**内容条目**落点（条目 ID / `field_key`） | ⚠️ 是否允许落点为 `Extraction` 条目 → **`CCR-S03B-01`**（§M.2） |
| `role` | ✅ | `grounding` / `support` / `contradict` / `context` —— **逐条标出，不得省略** | 界面与 `⑩` 均可见 |
| `owner_type` | ✅ | `insight` / `hypothesis` | 契约 §5.1 的 `owner_id` 拆为类型 + ID |
| `owner_id` | ✅ | 所属 `Insight` 或 `Hypothesis` | 兼容 `grounded Hypothesis` 引用历史 |
| `archived_at_ref` | 派生 | 引用建立时被引用记录是否已归档 | ⚠️ 语义待澄清 → **`CCR-S03B-02`** |

> **不新增字段原则**：`EvidenceRef` **不得**复制 `target` 的 `result_status` / `data_source_nature` / 归档状态 / 条目文本 —— 全部经 `target_id` 关联**按需派生**（避免重复字段与快照失真）。

### E.2 写入校验（硬闸门，全部在服务端）

| # | 校验 | 依据 |
|---|---|---|
| E-1 | `target.attempt_status = Formal`（**`Draft` 拒绝** ⇒ 命中 N5"引用 `Draft`"） | `TC-51` / `TC-52` |
| E-2 | `target.archive_state = active`（**新引用不得指向已归档记录**） | `TC-57` / `AC-71` |
| E-3 | `role` ∈ 四值且**非空** | `TC-45` |
| E-4 | `role = grounding` ⇒ 落点条目 `source_type = Fact`；且若 owner 为 `Hypothesis` 且 `kind = model` ⇒ **拒绝**（`model` 恒无 EvidenceRef） | `TC-51` / `TC-54` |
| E-5 | `role ∈ {support, contradict}` ⇒ **不得**由 `target.result_status = Unknown` 的记录**单独**承担（判据见 E.4） | `TC-48` / `AC-40` |
| E-6 | **禁止**接受任何数值化相似度 / 分数 / 置信度入参 | `TC-41` |
| E-7 | `owner` 存在且 `owner_type` 合法 | 契约 §5.1 |

### E.3 「同源派生」（契约 §3.3 / §12 第 11 项）—— 两种视图，一个集合

```
                    ┌──────────────────────────────────────────────┐
                    │  EvidenceRef 集合（owner = Insight/Hypothesis）│   ← 唯一数据源
                    └──────────────────────────────────────────────┘
                          │                                 │
        ┌─────────────────▼──────────────┐   ┌──────────────▼────────────────────┐
        │ 视图 ①：逐条引用视图（⑩ 追溯）  │   │ 视图 ②：按被引记录分组的计数视图    │
        │  · 每条标 role                 │   │  · 计入角色 = grounding/support/   │
        │  · 标「上下文」（role=context）│   │    contradict（context 不计入）    │
        │  · 标「来源已归档」（按 target │   │  · **按 target_id 去重计数**        │
        │    当前归档状态，见 CCR-02）    │   │  · **= `N_引用`**                  │
        └────────────────────────────────┘   └───────────────────────────────────┘
              ⚠️ 两者必须由同一集合派生，禁止各自计算、禁止缓存为两份数字
```

**为什么必须按 `target_id` 去重**：同一 `Formal Attempt` 可能被多条引用记录指向（例如 `grounding` 指向"条件"条目 + `support` 指向"结果"条目）。`N_引用` 的定义是**记录条数**（`AC-38` / `AC-84`），**不是引用记录条数**。若不去重，会出现"界面显示 3 条证据、追溯清单只有 2 条记录"或用例 `AC-84` 失败。

### E.4 `Unknown` 结果记录的角色限制（可判定实现）

- 数据层**不复制** `target.result_status`；校验在 `domain` 层通过 `target_id` 关联读取；
- **PROPOSED 判据**：对某 `Hypothesis` 的 `support`（或 `contradict`）角色集合，**其全部成员均为 `result_status = Unknown` 时不成立** —— 单来源（`N_引用 = 1`）且该唯一来源为 `Unknown` ⇒ **不得标 `support` / `contradict`**（`TC-48` / `AC-40`）；
- 若生成层原计划使某 `Unknown` 记录承担 `support` 而触发不成立 ⇒ **必须显式标注**（不得静默丢弃、不得从证据清单删除）；精确降级措辞由 `S03-C` 给出（§L）；
- 该类记录的 `grounding` / `context` 角色**不受限制**，且 **`⑩` 追溯不得将其删除**。

### E.5 明确**不进入** `EvidenceRef` 集合的引用

| 对象 | 为什么不在集合内 | 表达位置 | 硬规则 |
|---|---|---|---|
| `accepted Insight`（Experience Asset） | **即使已接受也不能承担 grounding** | 可作**推理输入** → `reasoning_input_refs` | 单独标注；不计入 `N_引用`；不进 `⑩` |
| 未接受的 `Candidate Insight` | 只能作**推理输入** | `reasoning_input_refs` | **须单独标注**（承接 §2.3 遗留项 ⑥：`accepted` 退回后须如实标为「前序候选经验（未接受）」）；不计入 `N_引用` |
| `Model Suggestion`（含已保存 / 已接受） | **不得被 `⑩` 追溯为历史证据** | 仅作【模型先验】分区推理输入 | 不计入 `N_*`；不承担 grounding；不得成为唯一依据 |
| `Retrieval Derivation`（比较结果） | 不是历史记录，**不属于证据** | `Insight.comparison_ref`（`E4` 条件项） | 条件项、非硬门槛、不计入 `N_引用` |
| `Hypothesis`（任一 kind） | 表达未来方向，非历史证据 | —（不作引用目标） | `TC-08` / `AC-66` |

> ⚠️ `reasoning_input_refs` **必须是「内容条目上的 ID 清单 + 分区标签」，不是一类新的引用实体** —— 否则会与 §E.3「唯一证据来源」冲突并制造"第二套引用体系"。**该边界同样需要 Integrator 明确（§L / §M.2 邻接项）。**

---

## §F `N_检索` / `N_引用` 派生规则

### F.1 定义与用途（与契约 §6.1 一致）

| 记法 | 定义 | 唯一用途 | 落点 |
|---|---|---|---|
| `N_检索` | 与当前 `Attempt` **相关（Level A 命中）且可被引用**的 `Formal Attempt` 条数 | **能力档位**（`0` / `1` / `≥2`）：结构上可不可能 | **落存储**（`Retrieval Derivation.n_retrieval`） |
| `N_引用` | **真正参与当前 `Hypothesis`（或 `Insight`）**、承担 `grounding` / `support` / `contradict` 任一角色的记录条数（**按被引记录去重**） | **界面显示的实际证据条数 + `⑩` 追溯清单** | **不落存储**（实时由 `EvidenceRef` 集合派生） |
| 历史库空 / 非空 | 用户是否存在任何 `Formal Attempt` | **仅区分两种空态文案** | 派生（V-6） |

### F.2 计算时机（事件驱动，同步；**无后台任务**）

| 量 | 计算时机 | 幂等 | 依据 |
|---|---|---|---|
| `N_检索` | ① **`Formal Attempt` 保存成功**（唯一自动触发）② **用户显式「重新检索」** —— 二者均在**同一次调用链内同步**完成 | 同一次保存流程重复提交只产生**一次**检索（请求级幂等键） | `TC-21` / `TC-23` / `TC-25` |
| `N_引用` | **读取时实时派生**（`⑩` 渲染 / `⑨` 输出组装） | 纯函数 | 契约 §3.3 |
| 两空态 | 读取时派生 | 纯函数 | `TC-66` |

**禁止**：后台 / 异步 / 批量 / 定时重算；**不得**把 `N_检索` 或 `N_引用` 缓存成**可被写入的第二份数字**（派生数字只允许存在于派生产物内，且以集合为源）。

### F.3 排除规则（必须逐条落到实现）

| 排除项 | 适用 | 依据 |
|---|---|---|
| `Draft` | **全部三层**（`N_检索` / `N_引用` 来源 / 档位） | `TC-03` / `TC-43` / 契约 §6.2 |
| 已归档（`archive_state = archived`） | **新** `N_检索` / **新** grounding / **新** `E1` 来源 / 默认跨记录比较 | `TC-57` / `AC-71` |
| **源 `Attempt` 自身** | `N_检索` 候选集合 | **由 `D9` 第 ⑥ 步"检索相关**历史** `Attempt`"直接推出**；非产品机制新增（登记为 §M.3 语义边界之一） |
| `role = context` 的引用 | `N_引用` | `TC-44` / `AC-39` |
| 仅提供纯上下文的 `Unknown` 结果记录 | `N_引用` | 契约 §6.2 |
| `Model Suggestion` | **全部**（`N_检索` / `N_引用`） | `TC-54` / `AC-70` |
| 未接受 `Candidate Insight` / 已接受 `Insight` | `N_引用` | `TC-55` / `TC-51` |
| 展示条数（首屏 3 条） | **不得**用于裁剪 `N_检索` | `TC-47` / `AC-82`–`AC-86` |

### F.4 两个量的使用边界（防混用）

| 硬规则 | 依据 |
|---|---|
| 档位**只由** `N_检索` 决定；界面显示与 `⑩` 追溯**只由** `N_引用` 决定 | `TC-46` / `AC-38` |
| `N_检索 ≥ 2` 而 `N_引用 = 1` ⇒ 档位仍为 `≥2`，界面**如实显示"引用 1 条"**，**不得**声称"多源一致 / 规律稳定" | 契约 §6.3 第 2 条 |
| **不得**用经验库总量替代 `N_检索` | `TC-46` |
| **合法数字仅三类**：存在性下界 / 结构档位 / 阅读负荷控制 | `TC-49` / `AC-54` |
| 归档**不追溯减少**既有 `N_引用`（集合不变 ⇒ 派生值不变，天然满足） | `TC-58` / `AC-74` |
| 界面**唯一**允许出现 `N_检索` 原值的位置 = 「可继续查看的记录条数」提示 | `D-046` V-7 |

### F.5 数据层禁止字段清单（断言级）

> 下列字段**在任何存储面都不允许存在**（含技术面建议同步收紧第 1 项）：`similarity` / `score` / `match_score` / `confidence` / `weight` / `rank_score` / `star` / `percent` / 任何等价命名与计算列。
> **建议以 schema 断言 + 响应体契约测试双向断言其不存在**（`TC-41` / `AC-23`）。

---

## §G Archive 过滤设计

### G.1 归档位（单状态位，无时间戳）

| 项 | PROPOSED | 理由 |
|---|---|---|
| 字段 | `archive_state`（`active` / `archived`）**唯一一个** | 见下 |
| **不引入 `archived_at`** | ✅ 不引入 | 🔴 若引入归档时间戳，即成为**第 5 项系统自动记录**，与 `TC-69`（L4 恰 4 项）/ `AC-77` 存在被读为"L4 = 5 项"的风险；而"归档状态必须用户可见且可识别"（`AC-76`）由布尔位**完全满足** |
| 若未来需要归档时间 | 属**新增系统自动记录** → **须先经产品决策** | 登记为非阻塞观察项（§L） |

### G.2 过滤单点（两类读取路径，不得混用）

```
① eligible_attempts(workspace, source_attempt)      ← 「可参与新链条」单点
     = attempt_status = Formal
       ∧ archive_state = active
       ∧ attempt_id ≠ source_attempt_id
     用于：⑥ 检索候选 / 新 grounding 来源 / 新 N_检索 / 新 E1 来源 / 默认跨记录比较

② traceable_attempt(attempt_id)                     ← 「可追溯展示」单点
     = 按 ID 解析（**允许 archived**，只读）
     用于：⑩ 追溯清单 / 既有引用展示 / 归档记录查看 / 记录详情只读视图
```

**硬规则**

1. **调用方不得自行拼装过滤条件**（含"顺手加一个 `status != 'Draft'`"这类局部条件）（契约 §12 第 9 项 / §G.2 与 `S03-A` §5 纪律 2 一致）。
2. **路径 ② 不得被用于路径 ① 的任何用途**；**路径 ① 不得被用于 ⑩ 追溯**（否则会使既有引用静默消失，违反 `AC-74` / `AC-100`）。
3. 归档过滤**必须**在**所有**读路径生效；漏一处即产生越权参与。

### G.3 「该记录已被修改」提示的实现（**不引入任何检测字段**）

| 项 | PROPOSED 设计 |
|---|---|
| **触发条件** | `Formal` 内容性修改请求**成功后**，且该 `Attempt` **存在当前有效派生结果** |
| **实现** | 在**同一次请求的响应**中携带提示 + 「重新检索」入口；**不比较任何时间戳、不存储任何"是否已检索 / 是否陈旧"标志** |
| **为什么不做时间戳比较** | ①"记录被创建即 `Formal`"与"后被修改"无法仅由 `created_at` / `updated_at` 区分（判据会误报/漏报）；② 任何"陈旧标志"都可能被读作"检索新鲜度"（`D-045` TR-11 禁止） |
| **`updated_at` 的作用** | **保留**（L4 ②）：作为**可核验的修改证据**（验收 / 排障 / 取证），**不作为运行时提示的判据** |
| **禁止** | 把该提示做成门槛 / 评分 / 用户可见结论；**不得**自动重跑检索、**不得**自动重生成 ⑧ / ⑨ 产物、**不得**自动退回既有 `Insight` / `Hypothesis` 状态 |

### G.4 归档的连带约束（数据层）

| # | 约束 | 依据 |
|---|---|---|
| G-1 | 归档**不触发**检索、**不改变**任何 `Insight` / `Hypothesis` 状态、**不修改**任何 `EvidenceRef` | `TC-25` / `AC-73` / `AC-74` |
| G-2 | 归档后**不可编辑**（写入路径拒绝）；取消归档后**完全恢复** | `AC-72` / `AC-71` |
| G-3 | **系统不得自动归档 / 自动删除**；归档**不得**作为价值判断 / 质量信号 / 完成度 / 门槛 | `AC-76` |
| G-4 | 三种标注**不得共用**：①「来源已归档」②「引用失效」（**V1 不适用**）③「上下文」（证据角色） | `TC-59` / `AC-75` |
| G-5 | 归档记录**可被 ⑩ 追溯**，必须标「来源已归档」 | `AC-100` / `F-2` |

---

## §H `TQ07` / `TQ08` / `TQ11` 的 PROPOSED 收敛建议

### H.1 `TQ07`｜物理建模粒度（PROPOSED → 由 Integrator 冻结）

| # | 决策问题 | **PROPOSED 建议** | 理由与代价 |
|---|---|---|---|
| 1 | **内容条目与 `Attempt`：同表 + 类型列 / 独立条目集合** | **独立条目集合**（`Content Item`，`owner_type` + `owner_id` 多态归属） | ① 契约 §1.5 要求**逐条**携带来源属性三件套，扁平列无法表达"同字段多条来源"（追问双层落库 `TC-15`、⑤ 三分 `TC-16` 都会退化为不可能）；② 多态归属使 `Insight` / `Hypothesis` 复用同一套来源属性，避免三套并行结构。<br>**代价**：读取需按 owner 聚合（属常规 join，非性能风险）。 |
| 2 | **引用关系：独立集合 / 内嵌** | **独立集合**（`EvidenceRef`） | ① `⑩` 追溯与 `N_引用` **必须**由同一集合派生（契约 §3.3 / §12 第 11 项），内嵌于 `Hypothesis` 会使其无法承载多 owner、也无法做统一写入校验；② `role` 逐条必填且界面可见 ⇒ 引用必须是**一等条目**。 |
| 3 | **「当前有效比较派生产物」：独立对象 / 内嵌** | **独立对象（每源 `Attempt` 至多 1 条）**，**子结构同表或子集合** | ① 需支持"覆盖替换"（`TQ11`），独立行最易实现且天然排斥版本堆积；② 子结构（候选条目 / 比较点）与主记录**生命周期完全一致**（一起替换），可同表或子集合，**二者皆可，由 Integrator 按实现成本裁决**。 |
| 4 | **`Project` / `Workspace`：独立对象** | **独立对象** | `D3` 层级固定；`Project` 需可缺省且**不得**作准入过滤（若压成字段，会诱导"按 project 过滤"的实现，触碰 `TC-84`）。 |
| 5 | **`User`：独立实体 / 由 Workspace 隐含** | **由 Workspace 隐含**（不建独立实体） | `TC-02` 只锁层级与禁止项，不要求独立实体；与 `S03-A` §12 两种表述均兼容；**最终由 Integrator 收敛**（`TQ06`）。 |
| 6 | **`Experience Asset`** | **不建表 / 不建集合**（纯视图） | `TC-01` / `AC-13`。 |
| 7 | **状态迁移事件日志** | **独立集合**（产品面行为留痕） | 只追加不更新；**不得**与技术面日志同表（契约 §11.3）。 |
| 8 | **`Attempt Draft State`** | **1:1 附属集合**（而非在 `Attempt` 上加字段） | 追问计数器 / 已放弃缺口集合**仅在 `Draft` 期有意义**；附属化可避免 `Formal` 记录携带无关字段，也便于在 `Formal` 化后显式降为只读留档。**替代方案（同表可空字段）亦可接受**，由 Integrator 按实现成本裁决。 |

> ⚠️ 以上**只给粒度与结构建议**，**不含字段类型 / 索引 / 迁移**；物理落定属实现阶段。

### H.2 `TQ08`｜「未知 / 未提供」的物理表示（PROPOSED → 由 Integrator 冻结）

**三个候选**

| 候选 | 形态 | 优 | 劣 |
|---|---|---|---|
| **W-1 哨兵值** | 值域写入固定字符串（如 `"__UNKNOWN__"`） | 实现最快；查询无需额外字段 | 🔴 用户真实输入可能与哨兵冲突；🔴 哨兵会进入比较文本（`TC-40` 有被绕过风险）；🔴 会被误读为"有值"；🔴 排序 / 检索易误命中 |
| **W-2 仅 `NULL`（无标记位）** | 值域留空 | 最简 | 🔴 **直接违反 `TC-06`**："留空 / 缺省即默认值"的隐式丢失被明令禁止；读者无法区分"未填 / 未知 / 待补" |
| **W-3 显式存在位 + 值域留空（推荐）** | 每条内容条目带 `presence_state ∈ {present, unknown}`，未知时值域留空 | ① **显式表达**由**写入约束**保证（而非靠字符串约定）；② 值域永不含伪值 ⇒ 比较逻辑**不可能**把未知当取值；③ 与契约 §1.5「条目携带属性」同构，零额外结构 | 需在写入路径强制校验；需在**所有**比较读取路径检查 `presence_state` |

**推荐 = W-3**，并配三条**可检查不变量**：

| # | 不变量 | 检查点 |
|---|---|---|
| W-3-a | `presence_state = unknown ⇔ 值域为空`（双向） | 写入 / 读取双向断言 |
| W-3-b | **允许缺省的 5 个字段**（`condition` / `expected_result` / `judgment_basis` / `key_parameter` / `version_env`）**写入时必须显式给出 `presence_state`**，缺失即拒绝写入 | 写入闸门（实现 `TC-06` 的"必须显式表达"） |
| W-3-c | `presence_state = unknown` 的条目**不参与** Level A 比对；比较结果**必须**输出到 `uncompared_dimensions`，界面标「该维度未比对」；**双方均 `unknown` 不得判为相似** | `TC-40` / `AC-22` |

**两个"Unknown"必须区分（实现防混淆红线）**

| 记法 | 含义 | 性质 | 是否参与角色判定 |
|---|---|---|---|
| `result_status = Unknown` | **结果尚未确定**（`D10` 四态之一） | **一个已由用户确认的取值**（决策型 `Inference`） | ✅ 参与（可 `grounding` / `context`；**不得单独**承担 `support` / `contradict`） |
| `presence_state = unknown` | **该维度未提供 / 未知** | **值的存在性状态** | ❌ 不参与任何比对 |

> 🔴 二者**命名相近、语义正交**；**不得**合并为一个字段、**不得**互相推导。

### H.3 `TQ11`｜「重新检索」重跑语义（PROPOSED → 由 Integrator 冻结）

**默认方向（已定）**：只维护"当前有效比较结果"；用户显式重新检索后**替换**；**不建立用户可见版本列表 / 历史比较版本体系**。

**PROPOSED 具体数据实现**

| # | 设计点 | 建议 |
|---|---|---|
| 1 | 主键 | `source_attempt_id` **唯一**（一个 `Formal Attempt` 至多一条当前有效派生结果） |
| 2 | 替换语义 | **同键覆盖写**（同一行 `derived_from` 同一 `Attempt`） |
| 3 | 子结构 | 与主记录**同事务整体替换**（先清理后写入），保证不出现"半新半旧" |
| 4 | **不保留历史** | **不得**保留被替换记录（**不建历史表、不软删除、不加 `is_current` 多行标记**） |
| 5 | **无版本号** | **不引入** `version` / `revision` / 序号列（即使不出界面，也会诱导"版本选择 / 回滚"实现） |
| 6 | 触发 | **只由用户显式动作**发起；**不得**由"记录被修改"自动触发 |
| 7 | 级联 | **不级联**重建 ⑧ / ⑨ 产物、**不改**既有 `Insight` / `Hypothesis` 状态、**不改**既有 `EvidenceRef` |
| 8 | 幂等 | 同一次"重新检索"动作重复提交只产生一次替换 |
| 9 | 与 `⑩` 的关系 | 替换**不改变**任何既有 `N_引用`（因其源为 `EvidenceRef` 集合，与派生结果无关） |

> ⚠️ 第 9 条是关键交叉验证点：它同时满足 `TQ11`（替换）与 `AC-74`（归档 / 变动不追溯减少既有引用），说明**"派生结果替换"与"引用集合稳定"必须被设计成两条正交线** —— 若把 `N_引用` 也从派生结果派生，就会在替换瞬间丢证据。

---

## §I `TQ02`｜Gate B 候选对比（在线 Demo 的托管数据层）

> 🔴 **本节只出候选、差异、成本、风险与 PROPOSED 建议**；**技术选型属人工决策项**（`TQ02` → **Gate B**）。
> 🔴 **全部候选均为托管 / 云端**；**不得依赖本机数据库**（`TC-78`）。开发期本机实例**仅可作开发便利**，**不作为任何候选**、**不构成 Demo 依赖**。

### I.1 候选集合

| 候选 | 形态 | 说明 |
|---|---|---|
| **DP-1** | **托管 PostgreSQL —— Serverless / 按量** | 托管 PG（国内可达平台优先；国际平台**仅在实测可达且稳定时**采用）；实例可休眠 / 唤醒 |
| **DP-2** | **托管 PostgreSQL —— 长驻小规格实例** | 托管 PG 常开实例（无休眠）；按最低规格计费 |
| **DP-3** | **BaaS 一体化（托管 DB + 平台 SDK / 行级策略）** | 平台内建 DB；**仅使用其存储与连接能力**，**业务规则不下沉到平台策略** |
| **DP-4** | **托管 MySQL 兼容服务** | 托管关系库；生态成熟，但与 `S03-A` 的 ORM 假设需重新评估 |
| **DP-5** | **轻量托管 SQL（serverless SQLite / libSQL 类）** | 边缘友好、极低运维；一般**与特定托管平台绑定** |
| **DP-6** | ❌ **本机数据库 / 容器内文件型 DB / 浏览器本地存储** | **直接排除**：违反 `TC-78`（不依赖本机数据库）与 `TC-79`（持久化） |

### I.2 八维度对比（优 / 中 / 差 + 判据）

| 维度 | DP-1 托管 PG（Serverless） | DP-2 托管 PG（长驻） | DP-3 BaaS 一体化 | DP-4 托管 MySQL | DP-5 轻量托管 SQL |
|---|---|---|---|---|---|
| **① 在线 Demo 稳定性** | 优（平台托管、无本地依赖）；⚠️ 冷启动时延 | **优**（常开、无休眠；故障域最可预期） | 中（平台侧限流 / 额度为**不可控变量**） | 优（成熟托管） | 中（边缘副本一致性 / 平台绑定） |
| **② 免费 / 低成本** | **优**（多为免费额度 / 按量，演示期成本近零） | 中（常开最低规格即持续计费） | 优（免费层通常最宽） | 中 | 优 |
| **③ 数据持久化** | 优（托管持久卷 + 自动备份） | 优（同上，且无休眠导致的连接重建） | 优 | 优 | 中（需确认副本与备份策略） |
| **④ 与应用服务端连接难度** | **优**（标准连接串）；⚠️ Serverless 运行时的**连接数**须依赖平台池化 | **优**（长驻进程连接池最省心） | 中（平台 SDK 与查询模型非标准 SQL） | 优（换驱动即可） | 中（HTTP/SDK 风格，非标准连接） |
| **⑤ 双人开发体验** | 优（共享开发实例；两人独立实例亦可） | 优（同 DP-1） | 中（依赖平台 CLI / 远程环境，调试链路长） | 优 | 中（同上） |
| **⑥ seed / reset** | **优**（标准 SQL 语义；`seed` 幂等 + `reset` 重建均可干净实现） | **优**（同上） | 中（平台 SDK 约束下的批量写 / 清库路径较长） | 优 | 中（受限的 DDL / 批量语义） |
| **⑦ 迁移与备份** | 优（版本化迁移 + 平台自动备份 + 手动快照导出） | 优（同上） | 中（迁移须经平台工具） | 优 | 中 |
| **⑧ 现场网络风险** | 🔴 **第一风险**：国际平台的**可达性 / 延迟 / 抖动**在比赛现场不可控 | 🔴 同 DP-1（同一风险维度，与休眠无关） | 中—高（平台域名可达性同为不可控变量） | 中（国内云厂商通常更可控） | 中 |

**判定**

- **DP-6 直接排除**（硬约束，非偏好）：`TC-78` / `TC-79`。
- **DP-3（BaaS）不作为首选**：与 `S03-A` §3.4 一致 —— 风险不在"能不能存"，而在**业务规则双写**：`E1`–`E4`、决策型复用门禁（`TC-13`）、归档过滤（`TC-57`）若部分由平台策略表达，则"规则唯一强制点"被破坏且难以版本化测试。**若采用，业务规则必须全部收敛在自有服务端代码中，平台只承担存储与托管**（本文件的 schema 与过滤单点设计**不需要改动**）。
- **DP-5 只在部署形态本身选择边缘平台时才进入比较**；否则其"平台绑定"会与 `TQ05` 耦合。

### I.3 PROPOSED 建议（Gate B 输入）

```
推荐   ：托管 PostgreSQL（DP-1 / DP-2 二选一）
         形态由 S03-A 的运行形态决定：
           · C-B 单体全栈（Serverless 宿主）→ DP-1；须接受冷启动与连接数约束（依赖平台池化）
           · C-D 轻量单体（长驻宿主）      → DP-2；连接与启动行为最可预期
平台优先：国内可达 / 现场网络稳定优先；国际平台仅在实测可达且稳定时采用
已排除：DP-6 本机数据库 / 浏览器本地存储（TC-78 / TC-79）
不作首选：DP-3 BaaS 一体化（规则双写破坏唯一强制点）
约束  ：不得引入 Redis（连接池不得依赖外部缓存服务）；不得引入 Vector DB / Graph DB
🔴 P0 前置实测：SP-01 —— 托管数据层 × 浏览器端到端连通性（现场网络条件下的可达性 / 延迟 /
   冷启动 / 连接数 / 免费额度），须经人工批准后单独执行（本文件不执行）
```

**为什么 PostgreSQL 是低风险项（与本阶段约束的契合点）**

| 契合点 | 说明 |
|---|---|
| 与应用形态解耦 | `DP-1` 与 `DP-2` **共用同一逻辑 schema 与同一 `data/` 接口** ⇒ Gate B 在两形态间选择**不改数据模型**（同 `S03-A` C-B/C-D 的"不返工"性质） |
| 与 `S03-A` 假设一致 | TypeScript 侧 ORM / 驱动生态成熟，属常规装配 |
| 迁移可退出 | 迁移到另一托管 PG 只需改连接与驱动配置；**数据层通过 `data/` 抽象** |
| 无额外中间件 | 不需要向量库 / 缓存服务 / 队列（`R3` / `R6` / `TC-21`） |

**风险与设防**

| 风险 | 设防 |
|---|---|
| 🔴 **现场网络可达性（第一风险）** | ① 优先国内可达平台；② **演示前预热**（运维动作）；③ 演示前导出**数据快照** + 「重置到 Demo 基线」路径（属 `TQ10` Demo 操作方案）；④ 形态等价性使平台切换只需改配置 —— **若平台不可达则换平台，不得退回本机服务** |
| 🟡 Serverless 冷启动 | 演示前预热一次；提示文案属 `08_UI_SPEC.md` |
| 🟡 Serverless × 连接数 | 依赖平台 / 驱动侧连接池；**不得**用 Redis 做会话或缓存 |
| 🟡 免费额度 / 限流 | 演示期数据量小（5–10 条 + 现场 1 条），额度风险低；仍须在 `SP-01` 实测中确认 |

### I.4 `TQ02` 的 Gate B 决策问法（建议）

1. 「在线 Demo 的数据层采用**托管 PostgreSQL**（国内可达平台优先）是否接受？」
2. 「形态取 **DP-1（Serverless / 按需）** 还是 **DP-2（长驻小规格实例）**？」（取决于 `TQ01` 的运行形态）
3. 「是否接受**开发期**使用本机实例作为开发便利，而**演示期强制使用云端托管**？」（`TC-78` / `TC-79` 不变）

---

## §J Demo seed / reset 方案（`TQ10` 输入）

### J.1 数据来源标识（**不新增字段**）

| 项 | 设计 |
|---|---|
| 字段 | **复用 `Attempt.data_source_nature`** —— 取值：现场记录 / 事后补录 / **Demo 示例数据** |
| **禁止** | **新增任何与之语义重复的第二字段**（如 `is_demo` / `is_seed` / `source_flag`）（`D-044` / `AC-77` / `TC-69`） |
| 硬规则 | ① **不得作为能力门控**：三类来源**同等**参与检索、**同等**计入 `N_检索`（`TC-83` / `D-045` TR-9）；② `⑨` 依据引用 Demo 记录时**标注随之保留** —— 因标注源 = `target` 的字段，**天然随引用保留，无需在 `EvidenceRef` 上复制字段**（复制即为重复字段） |
| 缺省 | `data_source_nature` **为必填且无"未知"取值**（它描述数据是怎么产生的，不属"允许缺省并记未知"的字段组） |

### J.2 Demo 数据规模与内容（`TC-80` / `AC-48`）

| 要求 | 内容 |
|---|---|
| MUST | **5–10 条预置 `Formal Attempt`** + **现场新增 1 条**；**至少 1 条预置 `Formal Attempt` 与现场新增 `Attempt` 发生 Level A 命中**，保证 ⑥→⑦→⑧→⑨→⑩ 可完整走通 |
| SHOULD | **≥2 条预置记录彼此相关**（便于演示跨记录比较与冲突并置） |
| 覆盖（建议） | 预置数据应覆盖**多种 Level A 维度组合**：至少含「条件缺失（`unknown`）」与「结果状态 = `Unknown`」两类样本，用于演示"该维度未比对"与"不得单独承担支持 / 反驳" |
| **seed 层位** | **只预置 `Attempt` 层数据**（`Attempt` + 其 `Content Item` + L4 字段值）。<br>🔴 **不预置** `Insight` / `Hypothesis` / `EvidenceRef` / `Retrieval Derivation` —— 这些是 **AI 产物与证据链**，预置即等于伪造"系统曾经推理过"，违反 `D7` 与 `TC-81` 精神 |
| **不得** | 由"Demo 走通 ⑨⑩"反推"真实用户在任意 `N` 下都能走通"（`TC-82`）；**不得**依赖临时人工补录凑验收 |

### J.3 seed 策略

| 项 | 设计（不含 SQL） |
|---|---|
| 幂等 | seed **可重复执行**且结果稳定：以**固定业务键集合**（稳定的预置标识 + 固定标题）做 `存在则更新 / 不存在则插入`；**不得**每次执行都产生新记录 |
| 归属 | 写入**固定的 Demo 工作空间**（打开即用，不依赖 Cookie 重建，见 `S03-A` §12） |
| 与现场数据同域 | 🔴 **Demo 数据与现场新增必须落在同一工作空间** —— 因为检索范围 = 该工作空间全部历史（`TC-84`）；**若 Demo 与现场分属不同工作空间，现场新增将无法命中预置数据，`TC-80` 的 MUST 即不成立** |
| 环境隔离 | "开发 / 测试" 与 "演示" 的隔离靠**工作空间或托管实例级**区分，**不靠** `data_source_nature` |
| 不含 | **不含** 任何 `Insight` / `Hypothesis` / 引用 / 派生结果（见 J.2） |

### J.4 reset 方案（**必须是运维动作，不是产品功能**）

| 方案 | 语义 | 适用 | 硬规则 |
|---|---|---|---|
| **R-1 `reset_demo_baseline`** | **清空 Demo 工作空间全部数据 → 重新 seed** | **仅用于演示开始前**（含清除此前演练残留的现场数据 —— 因为那是演练数据） | ① **不是产品功能**；**不得**出现在产品界面、**不得**提供产品侧删除入口或 API 语义（`TC-56` / `AC-76`）；② 执行前须确认**不存在需要保留的现场数据** |
| **R-2 只删 Demo 记录、保留现场新增** | ❌ **明令禁止** | — | 🔴 现场新增 `Attempt` 生成的 `Hypothesis` / `Insight` 会持有指向 Demo 记录的 `EvidenceRef`；删除 Demo 记录将造成**既有引用断裂**，直接违反 `AC-74` / `AC-100`（"旧引用不静默消失"）。**若确需保留现场数据，只能整体重建（R-1 的变体），不得局部删 Demo 记录** |
| **R-3 演示中 reset** | ❌ **禁止** | — | 演示中重置会破坏"现场新增 1 条"的演示链路与其产物 |

**前置校验（reset 执行前必查）**

1. 是否已导出/确认当前数据快照（备份先行）；
2. 是否存在**由现场数据产生的、指向 Demo 记录的引用**（若存在 → 只能整体重建，**不得**局部删除）；
3. 目标工作空间是否为**演示工作空间**（**防止误伤其它工作空间**）。

**故障恢复路径（与 `S03-A` §8.3 一致）**

```
演示前：预热一次 + 导出数据快照（离线文件）
演示中异常：优先①重试（Runtime 可恢复，不设次数门槛）→ ②换用快照恢复到 Demo 基线
演示后：不做清理（V1 无产品侧删除）
```

### J.5 迁移与备份策略（描述级，**不含具体 SQL 方言选型**）

| 项 | 策略 |
|---|---|
| 迁移 | **版本化、单向向前**的迁移序列（**实现阶段**编写，本文件不写）；迁移**只描述结构演进**，**不得**承载业务规则 |
| 迁移禁止项 | **不得**借迁移引入任何 §A.3 禁止实体 / 字段；**不得**借迁移一次性写入"AI 产物"伪造历史 |
| 备份 | 平台自动备份 + **演示前手动导出数据快照**（离线文件）；**备份能力不进产品界面**、**不得成为产品功能** |
| 恢复 | 恢复 = **运维动作**；恢复语义须与 §G（引用完整性）一致：**不得**出现"引用指向已不存在记录"的状态 |

---

## §K 与 `S03-A` 的接口边界

> ⚠️ `01_APP_ARCHITECTURE.md` 为 **PROPOSED 上游方案**，**不是 Gate B 已确认技术栈**。本节只做**兼容性检查**与**影响记录**。

### K.1 兼容性检查（逐项）

| `S03-A` 的 PROPOSED 假设 | 本数据方案是否兼容 | 落点 / 说明 |
|---|---|---|
| **单体全栈候选**（C-B / C-D，两者共享同一分层） | ✅ **兼容** | 数据模型**与运行时宿主无关**；`DP-1` / `DP-2` 两形态共用同一 schema 与 `data/` 接口 |
| **TypeScript 贯穿候选** | ✅ **兼容** | 字段 / 枚举均为**逻辑名**；**序列化形式与枚举命名归 `TQ16`（Integrator）**，本文件**不预设**字面量写法；`TS` 类型可作契约载体（`contract/` 单一来源） |
| **托管 PostgreSQL 候选** | ✅ **兼容** | §I 全部候选为托管关系库；本文件 schema 不含任何依赖特定非关系模型的构造（**无向量 / 无图 / 无文档型嵌套查询依赖**） |
| **服务端作为业务规则强制点** | ✅ **兼容且必需** | 本方案把一切"必须不可绕过"的约束实现为**服务端写入校验 + 单点过滤**（§E.2 / §G.2）；**门槛判定不在数据层、也不在客户端**（与 `S03-A` §5 四条纪律一致） |
| `S03-A` §5 纪律 2：`Draft` / 归档过滤**只在 `data/filters` 注入一次** | ✅ **一致** | 本文件 §G.2 的两个单点即该纪律的数据侧落点 |
| `S03-A` §4.3：⑥⑦⑧ 允许拆为多个 HTTP 往返 | ✅ **兼容** | 本方案不依赖"请求粒度"：`N_检索` 与派生结果在**触发事件的调用链内**定稿，跨多往返时由**同一逻辑触发**保证一致（具体编排属 `S03-C` / `S03-D`） |
| `S03-A` §6.1：数值相似度**不得存储** | ✅ **一致** | §F.5 给出禁止字段清单 + 断言要求 |
| `S03-A` §11：`TC-71` 技术层隔离 | ✅ **一致** | §A.2 / §C.12 给出两个存储面与单向写入 |
| `S03-A` §12：隐名单用户 + 匿名 Workspace | ✅ **兼容** | §B.2（不建 `User` 实体，`Workspace` 隐含） |
| `S03-A` §10：开发期可用本地 PG 作开发便利 | ✅ **兼容** | 本文件**不将其列为候选**，且明确**不构成 Demo 依赖** |

### K.2 本文件向 `S03-A` / `S03-C` / `S03-D` / `S03-E` 提供的接口面（PROPOSED）

**读到（产品面读接口，调用方不得自行拼装过滤）**

| 接口（语义） | 用途 | 强制过滤 |
|---|---|---|
| `eligible_attempts(workspace, source_attempt)` | ⑥ 候选 / 新 grounding 来源 / 新 `E1` 来源 / 默认跨记录比较 | Formal ∧ active ∧ ≠ 源 |
| `traceable_attempt(attempt_id)` | ⑩ 追溯 / 既有引用展示 / 归档只读查看 | 无（允许 archived） |
| `content_items(owner)` | 条目聚合（含来源属性三件套 + `presence_state`） | 按 owner |
| `evidence_refs(owner)` | 证据集合（两种视图的唯一源） | 按 owner |
| `derived(attempt_id)` | 当前有效比较派生结果 | 单条 |
| `current_accepted_insights(workspace)` | `Experience Asset` 视图 | `status = accepted` |
| `history_empty_or_not(workspace)` | 两空态判别 | 是否存在任何 `Formal Attempt` |

**写到（产品面写接口，均带硬校验）**

| 接口（语义） | 必须校验 |
|---|---|
| 创建 / 编辑 `Draft` | 第 ① 步门槛 = 非空非纯空白（**不得**有字符数阈值 / 语义判定） |
| 保存 `Formal` | P1 四项齐备 + 结果状态已由用户确认；成功 ⇒ **同步触发 ⑥**（唯一自动触发） |
| 修改 `Formal` | 归档态拒绝；成功 ⇒ 返回"先前比较可能不再适用"提示 + 「重新检索」入口 |
| 归档 / 取消归档 | 不触发检索；不改任何引用与状态 |
| 用户显式「重新检索」 | 单行替换派生结果；不级联 |
| `Insight` 接受 / 撤销 / 拒绝 / 内容性修改 | 状态迁移矩阵 + 事件写入（§C.7.2） |
| `Hypothesis` 裁决 / 保存 | `saved_by_user` 与 `decision_state` 分离；`model` 拒绝任何 `EvidenceRef` |
| `EvidenceRef` 增删 | §E.2 全部校验；**owner 为 `Insight` 时视为内容性修改**（触发退回） |
| 技术面写入（独立通道） | 单向；**不回读**；不入产品响应体 |

**运维侧（不属于产品功能）**

| 动作 | 说明 |
|---|---|
| `seed` / `reset_demo_baseline` | 仅开发 / 演示期；**不得**暴露为产品入口 |
| 备份 / 快照导出 / 恢复 | 运维动作；**不得**成为产品功能 |
| 预热 / 保活 | 运维动作；**不是产品运行时后台任务**（与 `S03-A` §6.4 一致） |

### K.3 传输层边界要点（形状**不定稿**）

- 内容条目与引用**为一等传输对象**：`source_type` / `confirmation_class` / `decision_state` / `presence_state` / `role` **逐条随对象传输**；
- 响应体**不得**含任何 §F.5 禁止字段、**不得**含 `model` / `prompt` / `token` / `trace id` / `latency` / `retries` / 内部检索分数；
- 三层语义（`GATE` / `RUNTIME` / `ACCEPTANCE`）与出口（`EXIT-A` / `EXIT-B` / `EXIT-C`）**必须可区分**，**不得裸用 `A` / `B` / `C`**；
- `N_检索 = 0` **返回成功**，且两空态可区分；
- **路由命名 / 请求响应体形状不在本文件定稿**（契约 §0.2：最终 API 归 `S03-A` / `S03-B` 后续 + Integrator）。

### K.4 若 `S03-A` 的 PROPOSED 假设不成立 —— **只记录影响**

| 假设变化 | 对本数据方案的影响 | 处置 |
|---|---|---|
| 改选 **C-C 前后端分离 + 异构后端**（非 TS） | 影响：**类型共享失效**，`contract/` 需以语言无关形式（生成 / 双写 + 契约测试）承载枚举与字段名。**数据模型本身不变** | **记录影响，不自行确认技术栈** |
| 改选 **纯前端 / 浏览器本地存储** | 影响：与本方案**根本不相容**（`TC-78` / `TC-79` 无法满足；且规则强制点消失）。**属产品约束层面的不可接受项**，非"数据层可调" | **记录为阻断性影响**；**不自行确认**；若真发生，须回到 `DECISIONS.md` 变更流程 |
| 改选 **BaaS 一体化（规则部分下沉平台）** | 影响：`E1`–`E4` / 复用门禁 / 归档过滤若落在平台策略，则 §E.2 / §G.2 的"服务端唯一强制点"不成立 | 记录影响；**建议仍将规则全部收敛于自有服务端**（§I.2） |
| 改选 **DP-4 / DP-5 等非 PG 托管** | 影响：schema 逻辑不变；**迁移策略与备份策略的落地形式变化** | 记录影响；逻辑模型无需改动 |

---

## §L 仍需 `S03-C` / `S03-D` / `S03-E` / Integrator 验证的问题

### L.1 需 `S03-C`（AI Pipeline）确认

| # | 问题 | 为什么需要确认 |
|---|---|---|
| L-1 | **同一 `Attempt` 多次执行第 ⑧ 步是否允许生成多条 `Insight`？** | 数据层**不设**唯一约束（允许多条），但**不得**因此产生"candidate 待办池"（`D-022`）。若 `S03-C` 判定必须唯一 / 必须覆盖，需明确**替换语义**（且不得引入版本） |
| L-2 | **`Unknown` 记录"不得单独承担 `support` / `contradict`"的降级措辞与落点** | 数据层只保证可判定（§E.4）；**降级后的呈现文案属 `S03-C` / `08`** |
| L-3 | **第 ④ 步「0 条」与「全部未处理」的文案** | 数据层只提供可数的区分（§C.4.4）；**文案不得共用**（`AC-95`） |
| L-4 | **`Hypothesis` 内容被修改后如何处理** | canonical **未定义** `Hypothesis` 的状态回退链（`D-039`/`D-040` 只覆盖 `Insight`）。数据层**不自行创造**回退规则；若确需，须先经产品决策 |
| L-5 | **`reasoning_input_refs` 的具体形状**（ID 清单 + 分区标签的字段粒度） | 需与 `S03-C` 的 ⑨ 步输出契约对齐；**不得**自建第二套引用体系（§E.5） |
| L-6 | **追问计数器的续写语义**（同一 `Draft` 多次进入 / 跨会话续写时计数是否继续） | `TC-29` 要求持久化计数器；数据层已提供字段，**累加规则属 `S03-C`** |
| L-7 | **`display` 条目的用户反馈是否落库** | 二者必选其一（§C.4.5）：落库则须遵守"不改变任何业务状态"；不落库则**界面不得提供空动作** |

### L.2 需 `S03-D`（检索与比较）确认

| # | 问题 | 说明 |
|---|---|---|
| L-8 | **Level A 四维度 → `field_key` 映射表** | 本文件 §C.4.3 只给提案；**映射表由 Integrator 冻结**（`TQ19`）；`S03-D` 的命中 / 未比对集合输出依赖它 |
| L-9 | **`uncompared_dimensions` 的粒度与呈现来源** | 由派生结果承载；`S03-D` 负责确保"未知维度不得判为相似"（`TC-40`） |
| L-10 | **`order_key` 的构造输入** | 只允许用户提供的实际发生时间参与；**`created_at` fallback 属 `TQ13`，默认不引入**；须显式确认"零依赖" |
| L-11 | **`TQ13` / `TQ14` 默认不引入对数据模型的确认** | 本方案**不依赖**二者（无并列判据字段、无 `created_at` fallback 字段）；`S03-D` 若证明必须引入 ⇒ **须先补独立 `Decision ID`** 并升级 Gate B |
| L-12 | **`N_检索` "不被展示条数截断"的读路径** | 派生结果必须能返回**全量**候选计数与"可继续查看条数"（`TC-47` / `AC-82`） |
| L-13 | **源 `Attempt` 自身排除**的确认 | 本文件按 `D9` 语义推出（§F.3）；请 `S03-D` 显式确认不会把自身计入 |

### L.3 需 `S03-E`（测试 / Demo / 部署）确认

| # | 问题 | 说明 |
|---|---|---|
| L-14 | **夹具与 seed 的关系** | `S03-E` 的验收夹具是否**复用** seed（J.3）还是独立数据集；若独立，须同样满足 `TC-80` |
| L-15 | **字段面断言**（`AC-77` / `AC-78`） | 建议以"L4 恰 4 项 + 技术字段不存在"的**双向断言**落地（§C.12 / §F.5） |
| L-16 | **引用完整性用例**（`AC-74` / `AC-100`） | 归档后既有引用的展示、`N_引用` 不追溯减少、`⑩` 仍可点开 —— 需覆盖 `traceable_attempt` 路径 |
| L-17 | **持久化用例**（`TC-79`） | 刷新 / 重启不丢；**且必须针对云端托管实例**，**不得**以本机实例替代 |
| L-18 | **reset 的可执行性** | J.4 的 R-1 必须可在**演示现场按分钟级**执行，且**不暴露为产品入口** |
| L-19 | **两空态用例** | 「历史库为空」与「有历史但本次无相关」必须由不同状态区分（`TC-66` / `AC-55`） |

### L.4 需 Integrator 收敛（本文件提出的建议项）

| # | 项 | 归属 |
|---|---|---|
| L-20 | §H.1 物理建模粒度 8 项 | `TQ07` |
| L-21 | §H.2 「未知 / 未提供」= W-3（`presence_state` + 值域留空） | `TQ08` |
| L-22 | §H.3 重新检索 = 单行覆盖替换（无版本号 / 无历史表） | `TQ11` |
| L-23 | `EvidenceRef` 最小字段集（§E.1）与 `owner_type` 的引入 | `TQ17` |
| L-24 | 枚举命名与序列化形式（含 `archive_state` / `presence_state` / `trigger_kind` / `field_key` / `point_kind`） | `TQ16` / `TQ15` |
| L-25 | Level A 字段路径映射表冻结 | `TQ19` |
| L-26 | §C.7.1 —— **是否**需要为"用户拒绝"新增 `trigger_kind` 类别（属对 canonical 枚举的扩展，**非 CCR**） | Integrator / 可能上升决策 |
| L-27 | §C.4.5 / L-7 —— 展示型反馈是否落库 | `TQ09` 邻接 |
| L-28 | §G.1 —— **不引入** `archived_at` 的取舍确认 | Integrator |
| L-29 | §C.12 —— 内部检索分数"不落库"的收紧建议是否接受 | `TQ28` |
| L-30 | §G.2 两个过滤单点的最终接口契约 | `TQ23` |
| L-31 | §D.4 三层语义与出口的编码取值 | `TQ24` |
| L-32 | §F.2 两个量的**计算时机**的最终确认 | `TQ22` |
| L-33 | §C.7.2 事件写入点清单 | `TQ25` |
| L-34 | §B.2 `User` 最小落地 | `TQ06` |
| L-35 | §J Demo 隔离 / 重置 / 现场输入 | `TQ10` |

### L.5 非阻塞观察项（登记，不阻塞）

| # | 观察项 |
|---|---|
| O-1 | 若未来需要**归档时间**展示 ⇒ 属新增系统自动记录（与 L4 = 4 项冲突）⇒ 须先经产品决策（§G.1） |
| O-2 | `[R4]` 竞品论断 `TO_VALIDATE`（不属 S00-03，保持原状） |
| O-3 | `S03-A` §9.3 的传输粒度语义边界（→ `S03-C`） |

---

## §M `BLOCKER` / `CCR` / `PRODUCT SEMANTIC CONFLICT`

### M.1 BLOCKER

```
BLOCKER = 无
```

| 说明 | 内容 |
|---|---|
| `TQ02` 未裁决 | **不属阻塞项** —— 契约 §0.1 明确「Gate A 不要求先裁决技术栈」；S03-B 完成判据 = **契约 §1–§7 每条硬约束都能找到落点**（见 §N），**本文件已完成** |
| P0 前置实测 | 登记 **1 项 P0 实测**（`SP-01`，§I.3）—— 属**风险与验证计划**，**不阻止本文件成立**，且已有明确缓解（换平台，而非退回本机服务） |

### M.2 CCR（**2 项**）

> 依据契约 §14：Worker **不得直接修改契约**，只提 CCR。以下两项均为**契约条目与 canonical 不一致**的边界确认，**未改动契约一字**，**不改变任何产品机制**。

```
CCR-S03B-01
─────────────────────────────────────────────────────────────────────
提出方     : S03-B
涉及条目   : 契约 §5.1（`source_field_path` 定义）；关联 §12 第 10 项（Worker 禁改项）
触发依据   : `D-027`（第 ⑤ 项「哪些条件保持不变」的正式来源规则）：**历史条件值 = `Fact` / `Extraction` 引用**；
             `D-024`：追问答案**双层落库**（用户原话 → `Fact`；AI 归纳 → `Extraction`，用户可修改）；
             `TC-16` / `AC-32` 同口径。
             而契约 §5.1 把 `source_field_path` 定义为「指向被引用的**可追溯事实字段**（`Fact` 引用的落点）」——
             **字面上排除了 `Extraction` 落点**。
若不修改的阻塞 : 第 ⑨ 步「⑤ 哪些条件保持不变」在**历史条件值为 `Extraction`**（AI 归纳、用户可修改）时，
             **无法构造合法 `EvidenceRef`**：① 若强行落 `Fact` 条目 → 违反 `TC-15` 的禁止反向标注；
             ② 若不允许引用 → 与 `D-027` ⑤「`Fact` / `Extraction` 引用」不一致，
             且 `S03-C` 的 ⑨ 步输出契约与 `S03-E` 的 `AC-32` 覆盖用例无法定义。
建议变更   : 由 Integrator 明确以下三点（**推荐口径 A**）：
             A. `source_field_path` **允许落点为 `Extraction` 内容条目**；该引用的 `role` **不得为 `grounding`**
                （`grounding` 仍严格限定为对 `Formal Attempt` 的可追溯 **`Fact`** 引用，`TC-51` 不变）；
                其 `support` / `contradict` / `context` 归属与计入规则与既有一致（按 `role` 判定）。
             B. 若判定**不允许**，请明确 `D-027` ⑤ 的「`Extraction` 引用」应以何种形式表达（且不得引入第二套引用体系）。
             C. 无论 A / B，均请确认：**⑩ 追溯清单与 `N_引用` 仍只由 `EvidenceRef` 单一集合派生**（契约 §3.3）不变。
影响面     : `S03-C`（⑨ 步输出契约：⑤ 项来源标注）· `S03-D`（引用计数口径）· `S03-E`（`AC-32` / `AC-36` 用例）· 本文件 §E.1 / §E.2
─────────────────────────────────────────────────────────────────────

CCR-S03B-02
─────────────────────────────────────────────────────────────────────
提出方     : S03-B
涉及条目   : 契约 §5.1（`archived_at_ref` 语义）；关联 §12 第 10 项（Worker 禁改项）
触发依据   : `D-043`（`F-2`）：**旧引用不静默消失** —— 既有 `Insight` / `Hypothesis` 的 ⑩ 证据链**继续显示该记录**
             （只读可查看），并**显式标注「来源已归档」**；`AC-100` 同口径；`TC-59` 要求该标注与
             「引用失效」（V1 不适用）、「上下文」**三者不得共用**。
             而契约 §5.1 把 `archived_at_ref` 定义为「**引用建立时**被引用记录是否已归档」——
             **快照语义**。最常见路径（先建引用、后归档该记录）在此语义下**取不到"已归档"**。
若不修改的阻塞 : 归档后既有引用**无法显式标注「来源已归档」** ⇒ 直接无法满足 `F-2` / `AC-100`；
             `S03-E` 的引用完整性用例（§L.3 L-16）无法定义预期结果。
建议变更   : 请明确 / 收敛为（**推荐口径 A**）：
             A. **「来源已归档」标注由被引用记录的「当前」归档状态派生**（展示层读取 `archive_state`）；
                `archived_at_ref` 可保留为"建立时快照"的**附加信息**，但**不得**作为该标注的唯一依据；
             B. 或由 Integrator 决定是否将该字段语义改为"当前归档状态"（属契约条目修订，由 Integrator 执行）。
             附：本项**不涉及**引用有效性的判定 —— `TC-58`「归档不追溯撤销引用」不变；
             本项只影响**标注**的来源。
影响面     : `S03-C`（⑩ 步标注语义）· `S03-D`（追溯读路径）· `S03-E`（`AC-74` / `AC-100`）· 本文件 §E.1 / §G.2 / §C.11 V-7
─────────────────────────────────────────────────────────────────────
```

**邻接项（**未**列为 CCR，理由如下）**

| 邻接项 | 为何不是 CCR | 处置 |
|---|---|---|
| 「`reasoning_input_refs`（推理输入引用）不得实现为 `EvidenceRef` 的第五个 `role`，且必须排除于 `⑩` / `N_引用` 之外」 | 契约 §5.2 第 3 / 4 条**已定义其语义**（不计入 `N_引用`、须单独标注、不得被 `⑩` 追溯）；**不缺失**，只是**物理表达未定** ⇒ 属 `TQ07` / `TQ17` | §E.5 + §L-5，**由 Integrator 收敛** |
| 「`candidate → rejected` 是否需要新增 `trigger_kind` 类别」 | 契约 §11.3 的"最小内容"**已可表达**该迁移（`from_state` / `to_state` 唯一确定，§C.7.1）；若 Integrator 选择扩展，属**对 canonical 枚举的扩展** ⇒ 须走 `DECISIONS.md` 变更流程，**不是契约 CCR** | §L-26 |
| 「源 `Attempt` 自身须从候选集合排除」 | D9 第 ⑥ 步"检索相关**历史** `Attempt`"**直接推出** | §F.3 + §M.3 |
| 「不引入 `archived_at`」 | 属**收紧型**设计选择（避免触碰 L4 = 4 项），**不改契约语义** | §G.1 + §L-28 |

### M.3 PRODUCT SEMANTIC CONFLICT

```
PRODUCT SEMANTIC CONFLICT = 无
```

| 说明 | 内容 |
|---|---|
| 检查对象 | 本数据方案 × `S00-01`（`D1`–`D10` / `R1`–`R6`）与 `S00-02`（`D-011`–`D-048` / `Q16` 派生关闭）全部 `CONFIRMED` 产品机制 |
| 结果 | **无直接冲突**；未发现任何"必须回改产品机制"的情形。`CCR-S03B-01` / `CCR-S03B-02` 属**契约条目与 canonical 的对齐问题**，按契约 §0.3「以 canonical 为准」处理，**不构成需要人工裁决的产品冲突** |
| **登记的语义边界（非冲突）1** | **源 `Attempt` 自身从候选集合排除** —— 由 `D9` 第 ⑥ 步"检索相关**历史** `Attempt`"直接推出，**属实现必然**，**不构成产品机制新增**。若 Integrator 认为需要写成正式判据，请登记（**不建议**，因其无自由度） |
| **登记的语义边界（非冲突）2** | **`Hypothesis` 内容被修改后的处理** —— canonical **未定义** `Hypothesis` 的状态回退链（`D-039` / `D-040` 只覆盖 `Insight`）。本文件**不自行创造规则**（§D.3）；若 `S03-C` 判定必须有，**属新增产品机制 ⇒ 须先建独立 `Decision ID`**（§L-4） |
| **登记的语义边界（非冲突）3** | **`candidate → rejected` 的触发类别命名** —— 见 §C.7.1；本文件**未扩展** canonical 枚举 |
| 触碰风险复核 | `R-01`（重跑 vs 不做版本）→ §H.3 已按默认方向给实现；`R-02`（embedding vs `R3`/`R6`）→ §I.3 已排除独立 Vector DB；`R-04`（最小身份 vs `D3`）→ §B.2；`R-05`（并行 vs 契约漂移）→ 本文件字段 / 枚举一律标 PROPOSED 并注明归属，`TQ15`–`TQ28` 留 Integrator |

---

## §N 完成前自检（对既有硬约束的逐条落点）

### N.1 任务指定自检项

| # | 自检项 | 结论 | 落点 |
|---|---|---|---|
| 1 | **`Experience Asset` 未被建模为独立实体** | ✅ | §A.3 第 1 行 / §C.11 V-1 / §H.1 第 6 条（不建表、不建集合，纯视图） |
| 2 | **`Draft` / `Archived` 不参与新检索** | ✅ | §C.3 A-4 / §G.2 单点 ① / §F.3 排除规则（含 `Draft` 不计入任何一层） |
| 3 | **`Unknown` 不等于相似** | ✅ | §H.2 W-3-c（双方均 `unknown` 不得判为相似）+ `uncompared_dimensions` 输出 + §H.2 的"两个 Unknown 必须区分"表 |
| 4 | **无数值相似度字段** | ✅ | §A.3 / §F.5（禁止字段清单 + 建议 schema 断言）/ §C.10 R-4 |
| 5 | **`N_引用` 与证据清单同源** | ✅ | §E.3（同一 `EvidenceRef` 集合的两种视图）+ §F.1（`N_引用` 不落库、实时派生） |
| 6 | **无用户可见版本体系** | ✅ | §C.6 I-6 / §C.10 R-2 / §H.3 第 4–5 条（无历史表、无 `version` 列、无回滚） |
| 7 | **Demo 数据来源不重复建字段** | ✅ | §J.1（复用 `data_source_nature`，明确禁止 `is_demo` / `is_seed` 类字段） |

### N.2 契约与硬约束落点（抽样核对）

| 约束 | 落点 |
|---|---|
| `TC-01` 对象分层（`Attempt` / `Insight` / `Hypothesis` / `Experience Asset` 非独立） | §A.1 四类划分 + §A.3 |
| `TC-03` / `TC-04` `Draft` 排除 + `Formal` 门槛 + 不得自动升级 | §C.3 A-1 / A-2 + §D.1 |
| `TC-05` 结果状态四态 + 用户显式确认 | §C.4.3（`result_status` 条目）+ §D.1 门槛 |
| `TC-06` / `TC-40` 未知显式表达 + 不参与比对 | §H.2 全节 |
| `TC-07` / `TC-09` `Hypothesis` 裁决位 / 保存位分离 | §C.8 H-1 / H-2 + §D.3 |
| `TC-08` / `TC-41` / `AC-66` `Hypothesis` ↔ `Experience Asset` 无直接引用 | §C.8 H-5 + §A.3 |
| `TC-10` – `TC-18` 来源分层与复用门禁 | §C.4.2 C-1 – C-6 + §C.4.3 |
| `TC-13` 决策型复用门禁 | §C.4.2 C-3 |
| `TC-19`–`TC-28` `D9` 十步与无后台 | §D.4 + §F.2 + §C.10 R-5 |
| `TC-20` 第 ① 步唯一门槛 | §C.3 原始信息 + §K.2 写接口 |
| `TC-21` / `TC-23` 同步幂等触发 | §F.2 + §C.10 R-5 + §D.1 迁移表 |
| `TC-24` / `TC-70` 修改后提示；`updated_at` 用途 | §G.3（**不引入检测字段**） |
| `TC-25` 不触发检索集合 | §D.1 + §G.4 G-1 |
| `TC-26` ⑧ 唯一生成时机 | §C.6 `source_attempt_id` + §A.3（无 candidate 待办池） |
| `TC-29` – `TC-36` 追问预算（**问题数**）与停止条件 | §C.5（持久化计数器 + 已放弃缺口集合） |
| `TC-37` – `TC-42` Level A/B/C | §C.10 + §C.10.1 + §F.3 + §H.2 W-3-c |
| `TC-43` – `TC-49` `N_检索` / `N_引用` | §F 全节（含去重口径与三类合法数字） |
| `TC-50` – `TC-55` grounding 与分区 | §E.2 / §E.4 / §E.5 / §C.8 H-3 / H-4 |
| `TC-56` – `TC-60` Archive | §C.3 A-4 + §G.3 + §G.4 G-4 |
| `TC-61` – `TC-68` Runtime / Acceptance / 出口 | §D.4 |
| `TC-69` – `TC-72` L4 与技术层隔离 | §C.3 L4 行 + §A.2 + §C.12 + §C.7.2 |
| `TC-73` – `TC-77` `Insight` 生命周期 | §C.6 I-3 – I-8 + §D.2 |
| `TC-78` – `TC-84` Demo / 部署 / 持久化 | §I（全程托管）· §J · §C.3 L4 ③ |
| 契约 §3.2 ID 硬规则 | §C.4.1 `item_id` + §C.10 `candidate_entries`（**不得用位置代替 ID**） |
| 契约 §3.3 同源派生 | §E.3 |
| 契约 §12 第 9 / 10 / 11 项（Worker 禁改项） | 本文件**一字未改契约**；§G.2 / §E.1 仅为落点建议；不一致处已提 `CCR-S03B-01` / `02` |

### N.3 本文件**未**做的事

| ❌ 未做 | 状态 |
|---|---|
| 修改 Shared Technical Contract | ❌ 未做（**只提 2 项 CCR**） |
| 修改 `DECISIONS.md` / `docs/01`–`09` / `S00-02` 文档 / `CHANGELOG.md` | ❌ 未做 |
| 修改 `01_APP_ARCHITECTURE.md` / 其它 Worker 文件 | ❌ 未做（只读取 + 兼容性检查） |
| 写正式业务代码 | ❌ 未做 |
| 写正式数据库迁移 SQL / DDL / 字段类型 / 索引 | ❌ 未做（**全文仅逻辑字段名 + 语义**） |
| `CONFIRM` 数据库或技术栈 | ❌ 未做（`TQ02` 属 **Gate B**） |
| 引入 Vector DB / Redis / Graph DB | ❌ 未做（§A.3 / §I.3 明确排除） |
| 新增产品机制 | ❌ 未做（三处语义边界均声明"由既有 Decision 推出"或"须先建 `Decision ID`"，见 §M.3） |
| 启动 Spike / 部署 / 定稿 API 形状 | ❌ 未做 |

---

## §O 本文件产出与状态

```
产出文件      : docs/architecture/02_DATA_AND_STATE.md（唯一）
状态          : PROPOSED / S03-B
未修改        : 00_SHARED_TECHNICAL_CONTRACT.md · DECISIONS.md · docs/01–09 · S00-02 文档 ·
                S00-03 启动文档 · CHANGELOG.md · 01_APP_ARCHITECTURE.md · 其它 Worker 文件
未执行        : 未编码 · 未部署 · 未启动 Spike · 未执行任何实测 · 未写任何 SQL / 迁移
未产生        : 未产生任何 CONFIRMED 声明
数据库 / 技术栈: 未确定（TQ02 属 Gate B 人工决策项）
```

**下一步（需人工授权）**

1. 与 `S03-A` / `S03-C` / `S03-D` / `S03-E` 并行产出一并提交 **Integrator**（契约收敛 + 跨 Worker 一致性）。
2. **Integrator 收敛**：`TQ07` / `TQ08` / `TQ11` / `TQ15`–`TQ28`（含本文件 §L.4 的 16 项建议）+ **`CCR-S03B-01` / `CCR-S03B-02` 判定**。
3. **Gate B**：裁决 `TQ02`（数据持久化与托管方案）等 `TQ01`–`TQ05`（契约推进至 `v0.3 DRAFT`）。
4. **Local Landing**：落盘（**不编码**）。
5. `SP-01`（P0）执行批准（可选但建议优先）。

**🛑 本任务到此结束，不继续 `S03-C`。**
