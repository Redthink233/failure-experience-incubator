# PRE-SUBMISSION DEPLOYMENT ACCEPTANCE（提交前部署与浏览器验收清单）

```
文档 ID      : PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE
阶段         : S00-03｜技术架构与实现方案收敛
性质         : Release / Submission Acceptance Checklist（🔴 不是产品 AC、不是 Spike、不是实现依据）
状态         : PLANNED ｜ NOT EXECUTED
执行时点     : 开发完成后 / 提交前（Gate C 之后、提交之前）
依据         : docs/DECISIONS.md `D-057`（`CONFIRMED`，2026-09-24）
上游证据     : 30_SPIKES/local_first/SP-06/SP-06_EXECUTION_REPORT.md（`CONDITIONAL PASS` + 7 项 PENDING MANUAL OBSERVATION）
              + 30_SPIKES/local_first/SP-06/MANUAL_OBSERVATION_CHECKLIST.md
授权状态     : 🔴 本轮未执行任何一项；执行前须由项目负责人另行启动
费用边界     : 🔴 只允许 0 元 / free-tier / disposable；触发付费即 `BILLING AUTH REQUIRED` + 停止
```

> 🔴 **本文件是"清单 + 计划"，当前 `PLANNED` / `NOT EXECUTED`。**
> 🔴 **本轮没有执行其中任何一项，也没有创建任何 Vercel 资源、没有完成任何人工观测。**
> 🔴 **本文件不得被引用为实现依据**；**不是 Gate B / Gate C 的输入**（`D-057` 已把这两类验证从 Gate 前置位置移出）。

---

## 0. 本文件与 `AC` 的关系（🔴 防污染，必读）

```
产品 AC —— 连续 canonical     : AC-01 – AC-162（连续 162 项，连续无缺号）
                              唯一动态来源 = docs/09_TEST_PLAN.md
产品 AC —— 独立编号空间       : AC-Q06-1 – AC-Q06-6（6 项）
🔴 全部有效验收点总数          : 168（= 162 + 6）
本文件编号                  : PSA-01 – PSA-13
🔴 PSA-* 不是产品 AC        : 不得写入 AC 序列、不得重排任何 AC、不得以 PSA 替代任何 AC 断言
🔴 新增 AC 数量             : 0（`D-057` 与本节均不新增 AC）
🔴 不再使用的旧写法          : 「AC 有效总数 = 162（AC-01–AC-162 + AC-Q06-1–6）」（算术矛盾，已校正）
PSA-* 的性质                : Release / Submission Acceptance（发版 / 提交验收）
```

> 🔴 **`AC` 口径校正登记（2026-09-24，GATE-B PRE-CONFIRM CORRECTION）**：修正前写法把 `AC-Q06` 的 6 项描述为合计的一部分却仍标 162 ⇒ **统一口径 = 连续 canonical 162 ＋ 独立 `AC-Q06` 6 ＝ 全部有效验收点 168**；🔴 **未重编号 / 未把 `AC-Q06` 并入连续编号 / 未新增任何 `AC`**；🔴 **历史正确事实「`S03-E` 当时 115 + 6 = 121」保留不改**。

---

## 1. 为什么存在这份清单（背景）

```
SP-06 已实测（正向证据，历史状态 = CONDITIONAL PASS）：
  · Chrome 154.0.8037.57 / Edge 153.0.4234.48 均 isSecureContext = true + showDirectoryPicker 存在
  · Node / 文件系统层 read / write / update / reopen / parse 全通过；改名后 EvidenceRef 仍按 ID 解析
  · 无数据库跑通 D9 ①→⑩；⑥⑦⑧⑨⑩ 全产出；无数值相似度
  · R-A 三态可区分；D-050 / D-052 用例符合预期
  · 5 provider 仅改配置分流；跨源 CORS 有 / 无实测；SSRF 8/8 + 哨兵 0 命中 + 通用代理端点 404
  · 凭据刷新后可用、无持久化泄漏、日志无明文

SP-06 未完成（🔴 一条都未标记 PASS、未删除）：
  S6-01    Vercel HTTPS 域名下唤起 folder picker        → PENDING MANUAL OBSERVATION（本轮未创建 Vercel 资源）
  S6-04/05/06  真实浏览器读写本地目录                    → PENDING MANUAL OBSERVATION（需真实用户手势）
  S6-08/09/10  handle·permission 跨刷新 / 跨重启、撤销权限 → PENDING MANUAL OBSERVATION
  S6-18/19 的 Vercel 侧证据                             → 无（未部署）

D-057 的处置：
  上述未完成项 → 不再阻塞 Gate B / Gate C / 正式开发启动
               → 但仍是 PRE-SUBMISSION ACCEPTANCE 的必做项（= 本清单）
```

---

## 2. `PSA-01` – `PSA-13`（逐项，🔴 当前全部 `PENDING`）

> **状态取值**：`PENDING`（未执行）/ `IN PROGRESS` / `PASS` / `FAIL` / `BLOCKED`。
> 🔴 **当前全部 = `PENDING`**；🔴 **禁止预填结果、禁止据"应该可以"推断 `PASS`**。

| # | 验收项 | 对应 `SP-06` 项 | 判定口径（可操作） | 状态 |
|---|---|---|---|---|
| `PSA-01` | **Vercel HTTPS 页面可打开** | `S6-01`（前置） | 在真实部署 URL 上页面正常加载、无阻断性错误、`isSecureContext = true` | 🔴 `PENDING` |
| `PSA-02` | **Vercel HTTPS 下可唤起 Workspace folder picker** | `S6-01` | 在该 HTTPS 域名 + 目标浏览器下，用户手势能唤起系统目录选择器（不报 `SecurityError` / 不静默失败） | 🔴 `PENDING` |
| `PSA-03` | **Chrome 真实目录授权** | `S6-02` / `S6-04` | Chrome 中完成一次真实目录选择并授予读写权限 | 🔴 `PENDING` |
| `PSA-04` | **真实读取本地 Workspace** | `S6-04` | 从用户选定目录读取既有对象并正确解析（含至少 1 条 `Formal Attempt`） | 🔴 `PENDING` |
| `PSA-05` | **真实创建文件并磁盘可见** | `S6-05` | 通过产品写入 1 条对象；**在文件资源管理器中肉眼确认该文件存在** | 🔴 `PENDING` |
| `PSA-06` | **真实修改文件并磁盘落盘** | `S6-06` | 修改 1 条既有对象；磁盘上内容实际变化（非仅内存） | 🔴 `PENDING` |
| `PSA-07` | **刷新后的 Workspace 恢复 / 重新授权行为** | `S6-08` | 记录实际行为二选一：① 可直接继续使用；② 需用户重新授权（**两种都算通过，但必须如实记录是哪一种**） | 🔴 `PENDING` |
| `PSA-08` | **关闭浏览器再打开后的恢复行为** | `S6-09` | 完整关闭浏览器后重开：记录 handle 是否可恢复 / 是否需重新选择目录（**结果记录制**） | 🔴 `PENDING` |
| `PSA-09` | **撤销权限后不能继续绕过权限访问** | `S6-10` | 在浏览器站点设置中撤销权限后，应用**必须失败或要求重新授权**，🔴 不得继续读写 | 🔴 `PENDING` |
| `PSA-10` | **重新授权后可恢复工作** | `S6-10` | 重新授权后应用恢复正常读写（不卡死、不静默失败） | 🔴 `PENDING` |
| `PSA-11` | **Vercel 环境不保存整个 Workspace** | `S6-19` | 部署环境侧**无** Workspace 全量拷贝 / 无持久化副本；只发送最小必要上下文 | 🔴 `PENDING` |
| `PSA-12` | **Vercel Thin Proxy 只用于 registered provider adapter** | `S6-18` | 部署环境下代理只接受 `provider_id → 已注册 adapter → 固定 / allowlist host`；🔴 无通用 URL 代理、不接受任意 `target_url` / `base_url` / `host` / `scheme` | 🔴 `PENDING` |
| `PSA-13` | **Vercel 免费 / 当前可接受部署方式满足比赛演示** | `S6-01` / 部署 | 免费计划即可满足演示（访问、加载、picker、按需调用）；🔴 **若需付费计划 / 购买额度 / 付费 add-on ⇒ 立即停止并报 `BILLING AUTH REQUIRED`** | 🔴 `PENDING` |

---

## 3. 附加核对位（与 `PSA` 同批执行，🔴 同样全部 `PENDING`）

| # | 核对项 | 口径 | 状态 |
|---|---|---|---|
| `PSA-X1` | **最终 Demo URL** | 记录产品名称 / Deployment URL / Deployment ID / 是否持续计费 | 🔴 `PENDING` |
| `PSA-X2` | **Chrome** | 版本号 + 上表 `PSA-02`–`PSA-10` 的实际结果 | 🔴 `PENDING` |
| `PSA-X3` | **Edge** | 版本号 + 上表 `PSA-02`–`PSA-10` 的实际结果（🔴 Safari / Firefox **不声称**） | 🔴 `PENDING` |
| `PSA-X4` | **Workspace picker** | 是否可由用户手势正常唤起（含取消 / 重试路径） | 🔴 `PENDING` |
| `PSA-X5` | **read / write / refresh / reopen** | 四条路径的实测记录（与 `PSA-04`–`PSA-08` 合并记录） | 🔴 `PENDING` |
| `PSA-X6` | **permission revoke** | 与 `PSA-09` / `PSA-10` 合并记录 | 🔴 `PENDING` |
| `PSA-X7` | **LLM provider** | 至少 1 个 `Browser Direct` provider 真实调用成功；unsupported provider **明确失败**（无静默 proxy 回退） | 🔴 `PENDING` |
| `PSA-X8` | **Thin Proxy** | 与 `PSA-12` 合并记录；并确认 proxy **无持久化**（不写 DB / 文件 / KV / cache / durable log） | 🔴 `PENDING` |
| `PSA-X9` | **Credential leak** | 凭据未出现在 `localStorage` / `IndexedDB` / cookie / Workspace 文件 / 仓库 / 日志 / 前端 Bundle；会话结束后清除 | 🔴 `PENDING` |
| `PSA-X10` | **Workspace upload** | 确认未把整个 Workspace 上传到服务端（最小上下文原则） | 🔴 `PENDING` |
| `PSA-X11` | **Vercel billing** | 确认费用 = 0 元 / 免费计划；记录是否存在任何持续计费项 | 🔴 `PENDING` |

---

## 4. File System fallback 升级条件（仅当出现下列之一）

> 依据 `D-057`。**当前 = `NO DECISION REQUIRED`**；🔴 **不得预防性升级 fallback**。

| # | 触发条件 | 含义 |
|---|---|---|
| `F1` | `Vercel HTTPS` + 目标 Chrome/Edge **无法打开 picker** | 主路径入口不可用 |
| `F2` | 真实浏览器**不能完成 read + create + update** | 主路径核心能力不可用 |
| `F3` | 正常刷新后**无法通过恢复 / 重新授权继续工作** | 会话连续性不可用 |
| `F4` | 比赛现场**无法保证至少一个已验证浏览器** | 演示环境不可控 |

出现 `F1`–`F4` 任一 ⇒ 升级 **`DECISION REQUIRED｜File System Fallback`**（候选：`Folder Import` / `ZIP Import·Export` / `File Upload` / `Local Companion Runtime`），**由项目负责人裁决**；🔴 **AI 不自行选择、不自行实现**。

---

## 5. 执行边界（🔴 硬约束）

- 🔴 **本轮未执行任何一项**；本文件状态 = `PLANNED` / `NOT EXECUTED`；
- 🔴 **AI 不登录 Vercel / 腾讯云控制台**、**不持有任何登录态或凭据**；部署与授权由**项目负责人本人**完成；
- 🔴 **只允许免费计划 / free-tier**；出现付费条件 ⇒ **停止 + 报 `BILLING AUTH REQUIRED`**；
- 🔴 **AI 不得自行删除任何外部资源**（含 Vercel Project）；清理须项目负责人明确批准；
- 🔴 **不得把 `PSA-*` 写进 `AC` 序列**、**不得以 `PSA-*` 替代任何 `AC`**；
- 🔴 **不得因本清单存在而宣称"部署已验证 / Vercel 已部署 / Local-first 已可行"**；
- 🔴 **`Legacy Cloud Cleanup` 仍为 `DEFERRED` / `NOT AUTHORIZED FOR EXECUTION`**；本文件与本轮**均不涉及** `R2` / `R6-A` / `R6-B` / `R6-C` 的实际云状态变更。

---

## 6. 状态

```
PRE-SUBMISSION DEPLOYMENT ACCEPTANCE : PLANNED / NOT EXECUTED
PSA-01 – PSA-13                      : 全部 PENDING
附加核对位 PSA-X1 – PSA-X11          : 全部 PENDING
执行时点                             : 开发完成后 / 提交前
新增产品 AC                          : 0（连续 canonical AC = 162 ／ 独立 AC-Q06 = 6 ／ 全部有效验收点 = 168，均不变）
File System fallback                 : NO DECISION REQUIRED（触发条件 = F1–F4）
BLOCKER                              : NO（本清单为"后置必做项"，非阻塞项；🔴 D-057 已明确）
BILLING AUTH REQUIRED                : NO（当前未执行，费用 0 元）
```
