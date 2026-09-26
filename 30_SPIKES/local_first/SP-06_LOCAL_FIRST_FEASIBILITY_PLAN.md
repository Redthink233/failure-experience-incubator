# SP-06｜Local-first Browser Workspace & Vercel Feasibility（测试计划 / TEST PLAN ONLY）

```
SPIKE ID     : SP-06（沿用既有编号体系；🔴 未创建 SP-LF-01 或任何第二套编号）
SPIKE NAME   : Local-first Browser Workspace & Vercel Feasibility
阶段         : S00-03｜技术架构与实现方案收敛
性质         : DISPOSABLE TECHNICAL SPIKE / NON-PRODUCTION
状态         : PLAN ONLY —— 🔴 本轮未执行、未批准执行
执行 Gate    : SP-06 EXECUTION APPROVAL REQUIRED（须项目负责人另行批准）
目录         : 30_SPIKES/local_first/
依据         : docs/DECISIONS.md D-053 / D-054（人工 CONFIRMED，2026-09-24）
             : 20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md §Q
日期         : 2026-09-24
```

> 🔴 **本文件只写计划，不执行任何测试。**
> 🔴 **本文件不 `CONFIRM` 任何 `TQ` 项**；`SP-06` 的 PASS 也不得被写成对 `TQ01` / `TQ03` / `TQ04` / `TQ05` 的 `CONFIRM`。
> 🔴 **产物一律 `DISPOSABLE / NON-PRODUCTION`，不得写入 `src/`。**

---

## 1. `SP-06` 要回答的问题

| # | 问题 | 归属 |
|---|---|---|
| 1 | **Vercel 上托管的 Web 页面能否在真实浏览器中访问用户本地 Workspace 目录？** | `TQ05` / `TQ01` |
| 2 | **Local Workspace 作为 V1 Primary Persistence 在技术上是否可行？** | `TQ02` / `TQ01` |
| 3 | **在不使用数据库（含向量库）的前提下，`D9` 的 ⑥⑦⑧⑨⑩ 能否跑通？** | `TQ04` / `TQ02` |
| 4 | **可配置 LLM 的最小 adapter 在浏览器 / 应用层是否可行？** | `TQ03` |
| 5 | **Browser Direct 与 Thin Proxy 各自的 CORS / Key / privacy 表现如何？** | `TQ03` |

---

## 2. `SP-06` 不测试什么（🔴 硬边界）

| ❌ 不测试 | 说明 |
|---|---|
| 正式 UI 完成度 | 不做视觉设计、不做组件库、不做响应式打磨 |
| 正式业务代码 | 不实现 `D9` 的正式产品逻辑；探针只做**最小可验证链路** |
| 完整 production security | 不做正式认证 / 登录 / CAM / WAF / 限流 / 白名单（🔴 这些仍属未确认项） |
| 性能压测 / 并发承载 | `S6-13` / `S6-14` 只验证**功能可用性**，不产出性能结论 |
| 多用户 / 多设备 / 同步 | `D-053` 已排除这些为 V1 目标 |
| 云数据库连通性 | 旧 `SP-01a` 的射程，**已 `SUPERSEDED BY D-053`** |

---

## 3. 测试目标清单（20 项，`S6-01` – `S6-20`）

### 3.1 组 A｜Workspace 访问能力（`S6-01` – `S6-07`）

| 编号 | 测试目标 | 观测点 | 判定口径（`PROPOSED`） |
|---|---|---|---|
| **`S6-01`** | **Vercel HTTPS 页面是否可触发 Workspace folder picker** | 在 Vercel 部署的 HTTPS 页面上点击「选择工作区」是否真的弹出系统目录选择框 | `PASS` = 能在 **Vercel 域名（HTTPS）** 下成功唤起 picker；`FAIL` = 抛错 / 静默无反应 / 需要非 HTTPS |
| **`S6-02`** | **Chrome 支持情况** | Chrome 版本 + 是否支持 File System Access API 的目录选择与读写 | `PASS` = 目录选择 + 读写均可用；🔴 **必须记录具体浏览器版本** |
| **`S6-03`** | **Edge 支持情况** | 同 `S6-02`，在 Edge 上 | 同上 |
| **`S6-04`** | **用户授权后读取本地文件** | 读取 `workspace.json` 与至少 1 个 attempt 文件 | `PASS` = 能读出并解析；`FAIL` = 读取被拒 / 解析失败 |
| **`S6-05`** | **创建 Attempt 文件** | 在 `attempts/` 下新建一个文件 | `PASS` = 文件真实出现在磁盘上（用外部文件管理器核对） |
| **`S6-06`** | **修改文件并实际落盘** | 修改已有文件内容 | `PASS` = 磁盘内容确实变化（🔴 不得仅凭界面状态判断） |
| **`S6-07`** | **`EvidenceRef` / stable local ID 可追踪性** | 建立一条引用（按 ID 指向内容条目）；**尝试改名文件后引用是否仍可解析** | `PASS` = 改名后引用仍按 ID 解析成功；`FAIL` = 引用依赖文件名 / 路径 |

### 3.2 组 B｜生命周期与异常（`S6-08` – `S6-12`）

| 编号 | 测试目标 | 观测点 | 判定口径（`PROPOSED`） |
|---|---|---|---|
| **`S6-08`** | **页面刷新后的 handle / permission 行为** | 刷新页面后：handle 是否仍可用？permission 是否需重新请求？ | **结果记录制**（不设 PASS / FAIL）：必须分别记录"需重新授权"与"可直接使用"两种实际行为 |
| **`S6-09`** | **关闭浏览器再打开后的行为** | 完全关闭浏览器（含后台进程）后重开 | **结果记录制**：记录 handle 是否可从持久化存储恢复、是否需重新选择目录 |
| **`S6-10`** | **用户撤销权限** | 用户在浏览器设置 / 提示中撤销权限后应用的行为 | `PASS` = 应用**不崩溃**、给出明确可理解的提示、并提供重新授权的可达路径 |
| **`S6-11`** | **Workspace 文件损坏** | 人为写入非法 JSON / 截断 Markdown | `PASS` = 应用不崩溃、指出具体文件、不静默丢弃其它文件 |
| **`S6-12`** | **Workspace 被移动 / 删除** | 在应用运行期间把 Workspace 目录移走 / 删除 | `PASS` = 应用不崩溃、明确提示"工作区不可访问"、可重新选择 |

### 3.3 组 C｜规模与链路可行性（`S6-13` – `S6-16`）

| 编号 | 测试目标 | 观测点 | 判定口径（`PROPOSED`） |
|---|---|---|---|
| **`S6-13`** | **20 条 Attempt retrieval** | 预置 20 条 `Formal Attempt`，跑一次 ⑥ 检索 | `PASS` = 能返回命中集合 + 未比对集合，且**不出现数值相似度** |
| **`S6-14`** | **100 条 Attempt retrieval** | 同上，规模提升到 100 条 | `PASS` = 功能仍可用；🔴 **记录耗时但不得写成性能结论** |
| **`S6-15`** | **Structured Experience RAG 在无数据库情况下完成全链** | `Retrieve → Context Pack → Candidate Insight → Hypothesis → EvidenceRef` | `PASS` = 五个环节**均在无数据库条件下**产出结果；🔴 必须保证 `EvidenceRef` 可追溯到具体 `Formal Attempt` 与内容条目 |
| **`S6-16`** | **`R-A` 技术路线在 Browser / application layer 是否可行** | 按结构化字段规则做 Level A 四维度判定（必要时 LLM 辅助）；`matched` 按 `D-050` 严格语义 | `PASS` = 判定可执行且**能区分 `matched` / `compared_not_matched` / `uncompared`**；🔴 **不评价准确率**（`SP-03R` 已覆盖规则层，`SP-06` 只测"浏览器侧是否可行"） |

### 3.4 组 D｜LLM 接入与部署边界（`S6-17` – `S6-20`）

| 编号 | 测试目标 | 观测点 | 判定口径（`PROPOSED`） |
|---|---|---|---|
| **`S6-17`** | **Configurable Provider 最小 adapter 验证** | 用至少 2 个不同 provider 配置（`provider` / `base_url` / `model` / `credential`）跑一次最小调用 | `PASS` = 切换 provider **不需改代码**（只改配置）；🔴 **不得记录任何凭据内容** |
| **`S6-18`** | **Browser Direct vs Thin Proxy 的 CORS / Key / privacy 验证** | 分别实测两条路径：① 浏览器直连 provider ② 经 Vercel Function 转发 | **结果记录制**：逐项记录 CORS 是否通过 / Key 是否出现在浏览器可读位置 / 数据经过哪些中转方；🔴 **不给单一 PASS / FAIL**（这是 `DECISION REQUIRED` 的证据输入） |
| **`S6-19`** | **Vercel 环境不保存整个 Workspace** | 检查 Vercel 侧（Function 日志 / 临时存储 / 构建产物）是否出现 Workspace 内容 | `PASS` = **Vercel 侧不存在 Workspace canonical 副本**、不存在服务端永久科研数据存储；🔴 请求上下文可出现在运行日志属正常，但**必须证明其非持久化 / 非 canonical** |
| **`S6-20`** | **无 PostgreSQL 仍能跑通 `D9` 的技术可行性** | 在**完全不引入任何数据库**（含向量库）的条件下，从 ① 到 ⑩ 走一遍最小链路 | `PASS` = 十步均可执行、无"必须数据库"的硬依赖 |

---

## 4. 执行前置（🔴 全部落实后方可启动）

| # | 前置 | 状态 |
|---|---|---|
| 1 | **项目负责人批准 `SP-06` 执行**（`SP-06 EXECUTION APPROVAL REQUIRED`） | 🔴 **未获得** |
| 2 | 明确 **Vercel 项目归属**（谁的账号 / 是否新建 / 免费计划） | 🔴 **未落实** |
| 3 | 明确 **测试用 Workspace 目录**（建议一次性 disposable 目录，测完删除） | 🔴 **未落实** |
| 4 | 明确 **LLM 凭据来源**（🔴 按 §L.2 的方案；**凭据不得落入任何文件 / 日志 / 报告 / 前端产物**） | 🔴 **未落实** |
| 5 | 明确 **目标浏览器版本**（Chrome / Edge） | 🔴 **未落实** |
| 6 | 若涉及任何**实际付费**（如 Vercel 付费计划、LLM 调用费用）⇒ 🔴 **先报「资源 + 规格 + 预计费用」并等【再次确认】** | 🔴 **未评估** |

> 🔴 **`SP-06` 不创建任何腾讯云资源**（旧 `SP-01a` 射程已 `SUPERSEDED BY D-053`）。

---

## 5. 产物与落点（🔴 执行时适用）

| 产物 | 落点 |
|---|---|
| 执行报告 | `30_SPIKES/local_first/SP-06_LOCAL_FIRST_FEASIBILITY_REPORT.md`（**本轮未创建**） |
| 原始观测记录 | `30_SPIKES/local_first/`（JSON / TXT / 截图说明） |
| 探针代码（若需要） | `30_SPIKES/local_first/`（🔴 **`DISPOSABLE / NON-PRODUCTION`；不得写入 `src/`**） |

🔴 **全部产物必须标注 `DISPOSABLE / NON-PRODUCTION`**；🔴 **不得包含任何凭据**。

---

## 6. 判据口径与射程声明（🔴 强制）

1. **`SP-06` 的结论只能写"在本次可执行环境条件下"的观察**；🔴 **不得外推为一般结论**；
2. 🔴 **`SP-06` 的 PASS 不得写成对 `TQ01` / `TQ03` / `TQ04` / `TQ05` 的 `CONFIRM`**；
3. 🔴 **`SP-06` 的 FAIL 不得自行改写为架构回退**；须按 `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md` 的流程**回到 Gate B 由项目负责人裁决**；
4. **`S6-08` / `S6-09` / `S6-18` 为"结果记录制"**（不设单一 PASS / FAIL），其作用是**为 `DECISION REQUIRED` 提供证据**；
5. **浏览器兼容性结论只覆盖实测过的具体版本**；🔴 **不得声称 Safari / Firefox 的表现**（`D-053` 已明确不假设这些浏览器均完整支持）。

---

## 7. 与 `SP-01a` 的关系（🔴 防混淆）

| 项 | 说明 |
|---|---|
| `SP-01a` | **历史 Cloud-centric 探针**，状态 = `SUPERSEDED BY D-053` / `INCOMPLETE HISTORICAL SPIKE`（**不是 `FAIL`**） |
| `SP-06` | **新的 Local-first 可行性探针**，**不是 `SP-01a` 的重做、也不是 `SP-01` 的替代编号** |
| 旧探针产物 | `30_SPIKES/sp01a_probe/` **保留不动**，🔴 **不得作为 `SP-06` 的基础代码**（不同架构前提） |
| `SP-01` 整体 | `NOT COMPLETE`；其两段式定义（`SP-01a` / `SP-01b`）**已被 `D-053` 取代** |

---

## 8. 状态

```
SP-06                : PLAN ONLY（未执行、未批准执行）
SP-06 Execution Gate : SP-06 EXECUTION APPROVAL REQUIRED
TQ01 / TQ03 / TQ04 / TQ05 : 均未 CONFIRM（本 Spike 不做 CONFIRM）
BLOCKER              : NO
资源创建             : 无（不创建任何腾讯云资源）
正式业务代码         : 未编写
src/                 : 未创建
```
