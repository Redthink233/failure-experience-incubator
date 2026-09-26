# PRE-SUBMISSION DEPLOYMENT ACCEPTANCE（提交前部署与浏览器验收清单）

```
文档 ID      : PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE
阶段         : S00-03｜技术架构与实现方案收敛
性质         : Release / Submission Acceptance Checklist（🔴 不是产品 AC、不是 Spike、不是实现依据）
状态         : 🔴 `IN PROGRESS`（首次登记 = `PLANNED` ｜ `NOT EXECUTED`；**2026-09-26 起 `PSA-A` 已在真实 Chrome 上执行**，逐项结果见 §7）
执行时点     : 开发完成后 / 提交前（Gate C 之后、提交之前）
依据         : docs/DECISIONS.md `D-057`（`CONFIRMED`，2026-09-24）
上游证据     : 30_SPIKES/local_first/SP-06/SP-06_EXECUTION_REPORT.md（`CONDITIONAL PASS` + 7 项 PENDING MANUAL OBSERVATION）
              + 30_SPIKES/local_first/SP-06/MANUAL_OBSERVATION_CHECKLIST.md
授权状态     : 🔴 首次登记时「本轮未执行任何一项；执行前须由项目负责人另行启动」（保留原口径）
              🔴 **2026-09-26 更新**：项目负责人已启动并完成 `PSA-A`（真实 Chrome ＋ 原生 FSA ＋ DeepSeek Browser Direct）；`PSA-B`（Vercel / Edge / Thin Proxy）**仍未启动**
费用边界     : 🔴 只允许 0 元 / free-tier / disposable；触发付费即 `BILLING AUTH REQUIRED` + 停止
```

> 🔴 **本文件是"清单 + 计划"，当前 `PLANNED` / `NOT EXECUTED`。**
> 🔴 **本轮没有执行其中任何一项，也没有创建任何 Vercel 资源、没有完成任何人工观测。**
> 🔴 **本文件不得被引用为实现依据**；**不是 Gate B / Gate C 的输入**（`D-057` 已把这两类验证从 Gate 前置位置移出）。
>
> 🔴 **2026-09-26 就地补注（不改写上文）**：上面三句描述的是**首次登记时**的状态。此后 `PSA-A` 已在真实 Chrome 上执行完毕，**逐项真实结果见 §7**（§2 / §3 表格的状态单元格已同步更新，**未改动任何一行验收项文字**）。`PSA-B`（Vercel / Edge / Thin Proxy）**仍未启动**，仍未创建任何 Vercel 资源。

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

## 2. `PSA-01` – `PSA-13`（逐项，🔴 **首次登记时 = 全部 `PENDING`**；2026-09-26 `PSA-A` 后的当前状态见下表与 §7）

> **状态取值**：`PENDING`（未执行）/ `IN PROGRESS` / `PASS` / `FAIL` / `BLOCKED`。
> 🔴 **当前全部 = `PENDING`**；🔴 **禁止预填结果、禁止据"应该可以"推断 `PASS`**。
>
> 🔴 **2026-09-26 就地补注**：下表**已按 `PSA-A` 的真实执行结果更新状态单元格**（每个结果都有证据，见 §7）；**任何验收项文字均未改动**；未执行项仍标 `PENDING`（绝不预填）。

| # | 验收项 | 对应 `SP-06` 项 | 判定口径（可操作） | 状态 |
|---|---|---|---|---|
| `PSA-01` | **Vercel HTTPS 页面可打开** | `S6-01`（前置） | 在真实部署 URL 上页面正常加载、无阻断性错误、`isSecureContext = true` | 🔴 `PENDING` |
| `PSA-02` | **Vercel HTTPS 下可唤起 Workspace folder picker** | `S6-01` | 在该 HTTPS 域名 + 目标浏览器下，用户手势能唤起系统目录选择器（不报 `SecurityError` / 不静默失败） | 🔴 `PENDING` |
| `PSA-03` | **Chrome 真实目录授权** | `S6-02` / `S6-04` | Chrome 中完成一次真实目录选择并授予读写权限 | ✅ `PASS`（§7.1） |
| `PSA-04` | **真实读取本地 Workspace** | `S6-04` | 从用户选定目录读取既有对象并正确解析（含至少 1 条 `Formal Attempt`） | ✅ `PASS`（§7.1） |
| `PSA-05` | **真实创建文件并磁盘可见** | `S6-05` | 通过产品写入 1 条对象；**在文件资源管理器中肉眼确认该文件存在** | ✅ `PASS`（🔴 口径注记见 §7.1） |
| `PSA-06` | **真实修改文件并磁盘落盘** | `S6-06` | 修改 1 条既有对象；磁盘上内容实际变化（非仅内存） | 🟡 `IN PROGRESS`（证据已具备，口径待人工裁量 · §7.1） |
| `PSA-07` | **刷新后的 Workspace 恢复 / 重新授权行为** | `S6-08` | 记录实际行为二选一：① 可直接继续使用；② 需用户重新授权（**两种都算通过，但必须如实记录是哪一种**） | ✅ `PASS`（记录 = **① 可直接继续使用** · §7.1） |
| `PSA-08` | **关闭浏览器再打开后的恢复行为** | `S6-09` | 完整关闭浏览器后重开：记录 handle 是否可恢复 / 是否需重新选择目录（**结果记录制**） | 🔴 `PENDING` |
| `PSA-09` | **撤销权限后不能继续绕过权限访问** | `S6-10` | 在浏览器站点设置中撤销权限后，应用**必须失败或要求重新授权**，🔴 不得继续读写 | 🔴 `PENDING` |
| `PSA-10` | **重新授权后可恢复工作** | `S6-10` | 重新授权后应用恢复正常读写（不卡死、不静默失败） | 🔴 `PENDING` |
| `PSA-11` | **Vercel 环境不保存整个 Workspace** | `S6-19` | 部署环境侧**无** Workspace 全量拷贝 / 无持久化副本；只发送最小必要上下文 | 🔴 `PENDING` |
| `PSA-12` | **Vercel Thin Proxy 只用于 registered provider adapter** | `S6-18` | 部署环境下代理只接受 `provider_id → 已注册 adapter → 固定 / allowlist host`；🔴 无通用 URL 代理、不接受任意 `target_url` / `base_url` / `host` / `scheme` | 🔴 `PENDING` |
| `PSA-13` | **Vercel 免费 / 当前可接受部署方式满足比赛演示** | `S6-01` / 部署 | 免费计划即可满足演示（访问、加载、picker、按需调用）；🔴 **若需付费计划 / 购买额度 / 付费 add-on ⇒ 立即停止并报 `BILLING AUTH REQUIRED`** | 🔴 `PENDING` |

---

## 3. 附加核对位（与 `PSA` 同批执行，🔴 **首次登记时同样全部 `PENDING`**；2026-09-26 `PSA-A` 后的当前状态见下表与 §7）

| # | 核对项 | 口径 | 状态 |
|---|---|---|---|
| `PSA-X1` | **最终 Demo URL** | 记录产品名称 / Deployment URL / Deployment ID / 是否持续计费 | 🔴 `PENDING` |
| `PSA-X2` | **Chrome** | 版本号 + 上表 `PSA-02`–`PSA-10` 的实际结果 | 🟡 `IN PROGRESS`（版本 = **154.0.8037.57**；`PSA-02`/`08`/`09`/`10` 未执行 · §7.1） |
| `PSA-X3` | **Edge** | 版本号 + 上表 `PSA-02`–`PSA-10` 的实际结果（🔴 Safari / Firefox **不声称**） | 🔴 `PENDING` |
| `PSA-X4` | **Workspace picker** | 是否可由用户手势正常唤起（含取消 / 重试路径） | ✅ `PASS`（由**真实用户手势**唤起成功；取消 / 重试路径未单独记录 · §7.1） |
| `PSA-X5` | **read / write / refresh / reopen** | 四条路径的实测记录（与 `PSA-04`–`PSA-08` 合并记录） | 🟡 `IN PROGRESS`（`read` ✅ ／ `write` ✅ ／ `refresh` ✅ ／ `reopen` ❌ · §7.1） |
| `PSA-X6` | **permission revoke** | 与 `PSA-09` / `PSA-10` 合并记录 | 🔴 `PENDING` |
| `PSA-X7` | **LLM provider** | 至少 1 个 `Browser Direct` provider 真实调用成功；unsupported provider **明确失败**（无静默 proxy 回退） | ✅ `PASS`（真实抓包直接观测 · §7.1） |
| `PSA-X8` | **Thin Proxy** | 与 `PSA-12` 合并记录；并确认 proxy **无持久化**（不写 DB / 文件 / KV / cache / durable log） | 🔴 `PENDING` |
| `PSA-X9` | **Credential leak** | 凭据未出现在 `localStorage` / `IndexedDB` / cookie / Workspace 文件 / 仓库 / 日志 / 前端 Bundle；会话结束后清除 | 🟡 `IN PROGRESS`（三处存储实测为空 ＋ 仓库/日志扫描无真实凭据；❌「会话结束后清除」未测 · §7.1） |
| `PSA-X10` | **Workspace upload** | 确认未把整个 Workspace 上传到服务端（最小上下文原则） | ✅ `PASS`（真实调用抓包 4 次成立 · §7.1） |
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
首次登记状态（原口径，保留）         : PLANNED / NOT EXECUTED
当前状态（2026-09-26 `PSA-A` 之后）  : `IN PROGRESS`
PSA-01 – PSA-13                      : ✅ PASS 4（`03`/`04`/`05`/`07`）／🟡 IN PROGRESS 1（`06`）／🔴 PENDING 8（`01`/`02`/`08`/`09`/`10`/`11`/`12`/`13`）
附加核对位 PSA-X1 – PSA-X11          : ✅ PASS 3（`X4`/`X7`/`X10`）／🟡 IN PROGRESS 3（`X2`/`X5`/`X9`）／🔴 PENDING 5（`X1`/`X3`/`X6`/`X8`/`X11`）
PSA-A baseline                       : `fc472b0` ＋ `bc2b13d`（HEAD `25ca05e`；`origin/main` 已同步）
TE-DEMO-LIVE-01 完整性               : 🔴 `BLOCKED`（⑥ 在 25 / ≈32 笔处被页面刷新打断 ⇒ ⑦ 从未产出；⑥ 空态无手动入口 ⇒ 刷新后本会话内无法重跑）
本轮未修缺陷（另行登记）             : 2 项（① ⑥ 空态缺失「发起检索」入口 ［初稿误写为「检索产物不落盘」，已于 §7.3 更正］；② ⑥ 的成本 / 交互与护栏冲突。见 §7.3）
执行时点                             : 开发完成后 / 提交前
新增产品 AC                          : 0（连续 canonical AC = 162 ／ 独立 AC-Q06 = 6 ／ 全部有效验收点 = 168，均不变）
File System fallback                 : NO DECISION REQUIRED（触发条件 = F1–F4）
BLOCKER                              : NO（本清单为"后置必做项"，非阻塞项；🔴 D-057 已明确）
                                       🔴 另有 1 项**待人工裁量**：`PSA-06` 的判定口径（见 §7.1）
BILLING AUTH REQUIRED                : NO（本轮未创建任何 Vercel / 付费资源；费用 0 元）
```

---

## 7. `PSA-A` 执行结果登记（2026-09-26｜真实 Chrome ＋ 原生 FSA ＋ DeepSeek Browser Direct）

> 🔴 本节是 `PSA-*` 的**当前有效结论**；§2 / §3 的**状态单元格**已按本节更新（**未改动任何一行验收项文字**）。
> 🔴 **记账口径（不得简化为「一次跑通」）**：`PSA-A` = 原运行 → **`INTERRUPTED`**（观测窗口随会话重启丢失）→ **有界 correction**（`CORRECTION-01` ④裁决落盘 ／ `CORRECTION-01-D3` locked 步骤文案 ／ `CORRECTION-02` judge prompt 缺 `json`）→ **新 baseline** → **`RESUME`**。
> 🔴 **baseline**：`fc472b0` ＋ `bc2b13d`（HEAD `25ca05e`，已推送 `origin/main`）；构建产物 `dist-web`（15:02:42）**已实测包含**修复内容。
> 🔴 **环境**：Chrome **154.0.8037.57**｜disposable 工作区 `C:\Users\Red16\Desktop\fei-psa-a-workspace-2`（8/8 Demo ＋ 2 条 Live 对象；`DEMO-07` 已归档）｜provider = DeepSeek `deepseek-flash`｜连接方式 = **Browser Direct**。

### 7.1 已具备真实证据的项

| # | 状态 | 真实证据（可复核） |
|---|---|---|
| `PSA-03` | ✅ `PASS` | 用户**原生手势**完成一次真实目录授权（Chrome 154.0.8037.57）；未以任何自动化替代人机手势 |
| `PSA-04` | ✅ `PASS` | 真实读取该工作区，并在 UI 对 `DEMO-01` 逐项核对：①原文正确／②结构化字段正确／`result_status = Failed`／无预置原因／已 `Formal`／baseline 无 Retrieval |
| `PSA-05` | ✅ `PASS`（🔴 口径注记） | 产品写入的 2 条 Live 对象**磁盘实测存在**：`ATT_01M3E78D3H54V8NDMN3E44VEM0.{json,md}`（14:56:24）、`ATT_01M3E8KS1WZXDFSGKR7K82EDTR.{json,md}`（15:15:33）。🔴 口径偏差 = 以**目录枚举 ＋ mtime** 替代「文件资源管理器肉眼确认」；如需补足，为一步可选动作 |
| `PSA-06` | 🟡 `IN PROGRESS` | 既有对象**被真实修改**的证据已具备：`ATT_…EDTR` 内部 `created_at = 15:06:59` → `updated_at = 15:15:33`，且内容含 3 条 `accepted / rejected / accepted` 裁决。🔴 **是否据此判 `PASS` 需人工裁量**；更干净的口径（对既有记录做 归档 → 取消归档，**0 真实调用、可逆**）尚未执行 |
| `PSA-07` | ✅ `PASS`（记录 = **② 需重新选择目录** · 🔴 已更正，初稿曾记 ①） | **受控观测（2026-09-26 16:20）**：一次干净的 `Page.reload`（`settled=load`、`readyState=complete`）之后，页面显示 `未选择工作区`，全页只剩「设置」「选择本地工作区」两个按钮 ⇒ **刷新会丢失 Workspace 连接，必须由用户原生手势重新选择目录**。机制已核对：应用**没有**持久化目录 handle 的地方（`localStorage` 0 键 ／ `indexedDB.databases()` = `[]` ／ cookie 长度 0）⇒ 重载后无法自行恢复。🔴 **更正说明**：初稿记「① 可直接继续使用」的依据是 15:16:32 刷新后 15:24 的连通快照 —— 但那次之间**用户很可能已手工重选目录**（上一轮日志即写明「重载后需用户重新原生选择工作区」，且 15:03 的现场记录为「重载 + **重配** + 点开记录」）⇒ 该快照为**受混杂证据**，不足以支撑 ①。✅ **会话凭据**不受刷新影响（`sessionStorage` 的 `…/session-credential/index` ＋ `…/provider:deepseek` 仍在，D-056 成立）。 |
| `PSA-X2` | 🟡 `IN PROGRESS` | Chrome 版本已记录（154.0.8037.57）；`PSA-02`（Vercel）／`PSA-08`／`PSA-09`／`PSA-10` **尚未执行** |
| `PSA-X4` | ✅ `PASS` | picker 由**真实用户手势**唤起成功（与 `PSA-03` 同源）；取消 / 重试路径未单独记录 |
| `PSA-X5` | 🟡 `IN PROGRESS` | `read` ✅（`PSA-04`）／`write` ✅（`PSA-05`）／`refresh` ✅（`PSA-07`）／`reopen` ❌ 未执行（`PSA-08`） |
| `PSA-X7` | ✅ `PASS` | **Browser Direct 真实调用成功（直接观测）**：`POST https://api.deepseek.com/chat/completions` ＋ `OPTIONS` preflight，真实抓包（其中一轮 = **25 笔 POST ／ 8 笔 preflight**，响应 `200`）；`loadingFailed = 0`。🔴 **未发生任何静默 proxy 回退** |
| `PSA-X9` | 🟡 `IN PROGRESS` | 已测：`localStorage` ／ `IndexedDB` ／ cookie **全部为空**；仓库与日志扫描**未见真实凭据**（历史 Secret Scan 的 40 命中全为口径文档文本 ＋ `sk-fixture-*` 假值）。❌ 未测：「**会话结束后清除**」的真实浏览器观测 |
| `PSA-X10` | ✅ `PASS`（4 次成立） | 真实调用抓包中 `bodyMentionsDemoAttemptId = false`、`bodyMentionsWorkspaceId = false` ⇒ **未见整个 Workspace 被上传**；记录器按契约**不采集 header / body** |

### 7.2 未观测 / 被阻断的项（🔴 不得写成 `PASS`）

| # | 状态 | 说明 |
|---|---|---|
| `PSA-08` / `PSA-09` / `PSA-10` | 🔴 `PENDING` | 未执行（关闭浏览器重开 ／ 撤销权限 ／ 重新授权）。均为**人工操作项**、**0 真实调用**，可随时执行 |
| `PSA-01` / `PSA-02` / `PSA-11` / `PSA-12` / `PSA-13` / `PSA-X1` / `PSA-X3` / `PSA-X8` / `PSA-X11` | 🔴 `PENDING` | 全部属 **`PSA-B`**（Vercel ／ Edge ／ Thin Proxy）。🔴 本轮**未创建任何 Vercel 资源** |
| `⑦`–`⑩` ／ `TE-DEMO-LIVE-01` 完整性 | 🔴 `BLOCKED` | `⑥` 在 **25 / ≈32 笔**判定调用处**被页面刷新打断**（Level A = 4 维度 ⇒ 预期 = 4 × 候选数 ≥ 28 笔；实测 24 笔拿到 `200`，第 25 笔发出后无响应）⇒ `⑦` **从未产出**（🔴 更正：**不是**「产物丢失」，也**不是**「不落盘」——产物会写入 `retrievals/`，只是这次根本没跑完）；且 ⑥ 空态**没有可手动发起的入口** ⇒ 刷新后本会话内无法重跑 |

### 7.3 本轮登记的两个产品级缺陷（🔴 未修，另行登记；**不属产品 `AC`**）

1. 🔴 **⑥ 空态缺失「发起检索」的一致性入口**（🔴 **本节初稿曾写作「检索产物不落盘 / 根因 = 实现缺口」——该根因已被推翻，此处更正**）
   - 🔴 **状态（2026-09-26 16:20）：已实施**，见 `CORRECTION-04`（commit `24184e0`，已推送 `origin/main`）。改动 = 纯渲染层 + 一个 presenter 标志：`presenters/retrieval.ts` 新增 `start_offered`（**只问 `M15` 的 `available_actions`，不自行推断门槛**）＋ `steps.ts` 空态渲染「开始检索」按钮（走既有 `session.rerunRetrieval()`）。**不改 `stale` 语义、不改 `D-051`、不新增字段、不新增 `AC`**。闸门：`tsc` ×5 exit=0；`npm test` **1056/1056 PASS**（+2 = 本次新增用例）。🔴 **浏览器内验证待办**：需用户先原生重选工作区（刷新会掉线，见 `PSA-07`）。：
   - ✅ **更正后的代码事实**：检索产物**是会落盘的** —— `retrievals/<ATT_id>.json`（`object_type = 'RetrievalDerivation'`），由 `retrieval-service.ts:251` → `retrieval-derivation-repository.ts:147` 写入**与 `attempts` 同一个 FSA `WorkspaceStorage`**（`workflow-composition.ts:124,133`）；读回路径 = `workspace-read.ts:125`，并有重开后可读回的测试覆盖（`corpus-admission.test.ts:172`）。工作区里没有该文件，是因为**那一次 `⑥` 从未跑完**（24 笔 `200`、第 25 笔被刷新打断 ⇒ `replaceCurrent` 从未执行；运行期失败**什么都不写**，以保住上一份成功产物）。
   - 🔴 **仍然成立的真实缺口**：一条 `Formal` 记录若**从未成功完成 `⑥`**，则**刷新 / 重新选择记录之后在本会话内没有任何入口**能再触发 `⑥`（`steps.ts:658-670` 只在 `view.stale` 时渲染「重新检索」，而 `stale` 需要**已存比较**）。
   - **影响**：演示/评审现场一旦刷新，未检索的 `Formal` 记录即无法继续推进 `⑦–⑩`。
   - **候选修法（未实施，待人工裁决）**：在 `⑥` 空态按 `available_actions`（`M15` 权威）渲染一个「开始检索」按钮 → 走既有 `session.rerunRetrieval()`；**不改 `stale` 语义、不改 `D-051`、不新增字段**。
2. 🔴 **`⑥` 的成本 / 交互与护栏冲突**：一次 `⑥` = **4 × 候选数** 笔真实调用（本轮实测发出 25 笔、耗时 ≈ 58 s），**在一个用户动作内连发、中途无法拦截**，且**界面无进度反馈** ⇒ 越过当轮「上限 25 笔」，用户侧看起来像「卡住」。

### 7.4 本节的证据索引（工作区内 + 临时取证产物）

```
workspace  : C:\Users\Red16\Desktop\fei-psa-a-workspace-2（25 文件：8/8 Demo ＋ 2 条 Live × {json, md} ＋ project / workspace / marker）
观测产物   : %TEMP%\psa-a-watch4.json（900 s 窗口，25 POST / 8 preflight / 32 × 200）
             %TEMP%\psa-a-watch5.json、%TEMP%\psa-a-watch6.json（增量落盘版记录器）
过程记账   : .learnbuddy/memory/2026-09-26.md（PSA-A 全过程的逐步取证与就地补注）
commit     : fc472b0 → bc2b13d → f1a493c → 2b447bf → 8b43a9a → 25ca05e（origin/main 同步）
```


---

## 8. `PSA-A FINAL RUN` 执行结果登记（2026-09-26 18:20–18:54｜真实 Chrome ＋ 原生 FSA ＋ DeepSeek Browser Direct）

> 🔴 本节**只追加**。§7（`ORIGINAL / INTERRUPTED`）**未改动一字**，其 baseline 作为历史保留。
> 🔴 **不得**把 §7 的 `INTERRUPTED` 改写为 `PASS`；本次是**另一次**运行，结论另记。

```
ORIGINAL INTERRUPTED BASELINE = fc472b0 + bc2b13d（HEAD 25ca05e）        ← 历史记录，保留不改
FINAL RESUME BASELINE         = 374f3f497aaad14fa4732860a478a03e6b1db678
PRODUCT FIX COMMIT            = ceb993b0cb987e826ecfb821576f8737a6980fa8
本轮结论                       = 🔴 PSA-A FINAL RUN = INTERRUPTED ｜ CORRECTION REQUIRED ｜ BLOCKER = YES
环境                          = Chrome 154.0.8037.57（CDP :9333，全新 profile）｜原生 FSA（真实用户手势）
disposable workspace          = C:\Users\Red16\Desktop\fei-psa-final-workspace（repo 外；起始 21 文件）
provider / 连接                = DeepSeek `deepseek-flash` ｜ **浏览器直连**（https://api.deepseek.com/chat/completions）
真实 Provider 请求             = **4** 笔（②④⑥⑧ 各 1 笔 POST，各带 1 笔 preflight；全部 200 ｜ loadingFailed = 0）
费用护栏                       = 上限 25 笔 ／ SOFT STOP ≥ RMB 0.80 ／ HARD CAP RMB 1.00 ⇒ **未触发**（实际 4 笔）
产品源码改动                    = **0**（本轮为纯验收：未改任何源码 ／ copy ／ prompt ／ retrieval ／ UI ／ fixture ／ test）
```

### 8.1 主链推进到哪一步（真实结果优先）

| 步 | 结果 | 真实证据（可复核） |
|---|---|---|
| ① | ✅ | `raw_text` 与用户输入**逐字一致** |
| ② | ✅（含 1 处字段归属偏差） | 1 笔 POST 200；`goal` ／ `actual_attempt` ／ `actual_result` ／ `version_env` 忠实于原文；原文未提供项 = `未知 ／ 未提供`。🔴 偏差：`50 摄氏度` 被归入 `key_parameter` 而**非 `condition`**（§9 的字面期望未满足）——**事实未丢失**，且 ③ 完成后 ② 面板已渲染「关键参数 1」。人工裁定 = **保持原样** |
| ③ | ✅ | `result_status.decision_state`：`unresolved → **accepted**`；`draft_state.parse_state`：`pending_user_confirm → extracted` ⇒ **人工确认成立（HUMAN CONFIRMATION = YES）** |
| ④ | ✅ | 1 笔 POST 200；**4 条**候选原因，全部标注 `AI 推断 · 候选原因` ／ `source_type = Inference`，措辞均为「可能…有关」；**无杜撰因果**；**无自动接受** |
| ⑤ | ✅ | `state`：`Draft → **Formal**`；`{json, md}` 磁盘真实变化（见 §8.5 哈希）⇒ **`PSA-05` 成立**；`candidate_causes` 落盘 = `accepted ／ accepted ／ rejected ／ unresolved` ⇒ **④ 裁决已真实持久化（§12）**，三种状态齐备 |
| ⑥ | ✅ 🔴 **关键回归** | **`RETRIEVAL_PROVIDER_REQUEST_COUNT = 1`**（`postDataLength 4475`）——**不是 32 笔** ⇒ 「单次 batch 判定」在**真实浏览器 ＋ 真实 Provider** 上实测成立；`retrievals/<live_attempt>.json` 真实落盘；`eligible_history_count = **7**` ⇒ **`DEMO-07` 被排除于 default Retrieval**；`uncompared_dimensions = []` |
| ⑦ | ✅ | Evidence Rail 类别映射**正确、无串类**：点「差异点」→ `ATT_DEM0A04…｜条件`「条件不同（该维度已比对，但不构成严格语义重叠）…」；点「相同点」→ `ATT_DEM0A01…｜结果 ／ 现象 ／ 结论方向`「相同或语义等价…」 |
| ⑧（生成 + 裁决） | ✅ | 1 笔 POST 200；**3 条**候选经验，全部 `state = "candidate"`（**未自动升级为 Experience Asset**），`evidence_refs` 指向真实历史记录、`comparison_ref` 指回 ⑥；人工裁决 = **2 接受 ／ 1 拒绝** ⇒ **`HUMAN INSIGHT ACCEPTANCE = YES`**；UI「可复用经验」区出现 2 条 `is-asset` |
| ⑧（收口） | 🔴 **未完成** | 见 §8.2 —— ⑧ 恒为 `current`，永不 `done` |
| ⑨ ⑩ | 🔴 **不可达** | 均为 `todo`（锁定，显示「完成前一步后可继续」）⇒ **`D9 ①→⑩` 未完成** |

### 8.2 🔴 阻塞缺陷（真实、稳定复现；**修复前现场已冻结，未行使产品自带重试**）

**现场（只读观测；18:43:31 与 18:50:48 两次一致）**

```
① insights/batches/                          目录已创建但【为空】（0 条）
② insights/operations/ATT_…__op-insight-generation-…~23insight-generation.json
                                             "status": "in_progress"（mtime 冻结在 18:43:31）
                                             锚内【已带完整 planned_batch】，但该 batch 从未落盘
③ ⇒ 写入序列停在 M8 `applyPlan` 的【步骤③（batch 记录）】；步骤④（`status: complete`）从未执行
```

**机制（读码核实，不是推测）**：`discoverBatches()` 只枚举 `insights/batches/*.json` ⇒ `[]` ⇒ `read-model` 的 `batches = []` ⇒ `presenters/steps.ts` 的 `insights_generated = batches.length > 0` = `false` ⇒ ⑧ 恒为 `current`；而 `locked: status === 'todo'` ⇒ ⑨⑩ 锁定。

**候选根因（`PROPOSED`／推断，已被实测支持）**

`batch_id = ATT_…:insight-batch:01M3EN…` **含 2 个冒号**；`persistence.ts#insightBatchPath()` **原样插值、未做路径安全编码**；而 **Windows 文件名不允许 `:`**。
实测（`%TEMP%` 探针，**未触碰产品与工作区**）：含冒号文件名 **create 失败**；其 `~3A` 编码等价名**创建成功**（`:` = 0x3A）。
旁证：operation anchor 的 key 里 `#` 已被编码为 `~23`（既有 reversible path-safe codec，见 HANDOFF §15.4）——**同一套约定存在，但 batch 路径未走它**。
⚠️ 仍标**候选**：**未**直接捕获浏览器侧抛出的异常对象。

**✅ 一条正面的产品行为（不改变阻塞结论）**：产品**未静默卡死** —— DOM 中存在 `notice-card notice-runtime`：「**系统本次没有完成**｜写入没有完成，已经写入的部分被保留；用同一次操作重试即可补齐剩余部分。｜已有内容保持不变，可以重试。」并提供按钮「**重新提炼经验**」。与 `M8-HARDENING-01` 的设计一致（披露部分写入 ＋ 幂等重试）。
⚠️ 但「重试即可补齐」在**本环境可能永远补不齐**（同名非法文件名会再次失败）。

> 🔴 **人工裁决（2026-09-26 18:54）= 选择 (a)：不点击「重新提炼经验」；保持失败 Workspace 与现场不动，作为修复前证据保留。**

### 8.3 本节未执行的项（🔴 一律**不得**记为 `PASS`）

`⑨` 假设 ／ `⑩` Traceability ／ `PSA-06` ／ `PSA-07` ／ `PSA-08` ／ `PSA-09` ／ `PSA-10` ／ `PSA-X9` 的「会话结束后清除」终局。
`PSA-01` ／ `02` ／ `11` ／ `12` ／ `13` ／ `X1` ／ `X3` ／ `X8` ／ `X11` 仍属 `PSA-B`（**未启动**）。

### 8.4 两个既有口径的更正登记（🔴 不改写历史，仅就地补注）

1. **`PSA-X10`（Workspace upload）本轮只能记 `PARTIAL`**：`POST` #1（②）／#2（④）两个 containment boolean 全 `false`；但 **`POST` #3（⑥）`bodyMentionsDemoAttemptId = true`**、**#4（⑧）亦为 `true`**（二者都携带候选历史记录 —— retrieval grounding 的设计语义），`bodyMentionsWorkspaceId` **恒为 `false`**。⇒ 上一轮基于 ①②④ 类调用得出的 `PASS` **不覆盖 ⑥⑧**，🔴 不得过度声称。
2. **`PSA-X9`**：`localStorage` = `[]`、`indexedDB.databases()` = `[]`、cookie 长度 0、`sessionStorage` 仅 `fei.ai.session-credential/{index, provider%3Adeepseek}`（**只读键名，未读任何值**）—— 与上一轮一致；「会话结束后清除」**仍未测**。

### 8.5 证据索引（工作区内 ＋ 临时观测产物）

```
frozen workspace : C:\Users\Red16\Desktop\fei-psa-final-workspace（32 文件；🔴 保持现场不动）
  attempts  projects\_unassigned\attempts\ATT_01M3EM88546T5WADTX4N1AT0M8.json
            7109 B  2829E271395B242B6DA7FF168667A75E1804D3AD9CD326541F5CA195646771BC
            ATT_01M3EM88546T5WADTX4N1AT0M8.md   3016 B  2DA32A8AE6DB1D4DC2857A2EA818AFD4E5B51FB37F9858FDA607F0923B8BF0DE
  retrieval retrievals\ATT_01M3EM88546T5WADTX4N1AT0M8.json
            10967 B  60BF28FA5E63FBED5831CA66C5D8D6B3F64F12445FCE179C5AE33635D8DE90BD
  insights  insights\INS_01M3EN08DK0XYQRGGPY0TQQJZK.json  2761 B  72CD5D4243509D9BC89873EB1F6FD39C0F7881A54541BC214FE299C27B80EEA5  → accepted
            insights\INS_01M3EN08DM2A01S60GHYW27HQH.json  3342 B  6C68462C028C5A21416C856A806866F2B17B7F80F1396FEE723C70A58776F2E5  → rejected
            insights\INS_01M3EN08DM2A01S60GHYW27HQQ.json  2940 B  6ABD9B7F9EE1EC6C36C551B6627F716E3B674DF003334796FFFFF57044EF54ED  → accepted
  anchor    insights\operations\ATT_…~23insight-generation.json
            11024 B  D3E6EA021B37A3ACCDD6CC7C82FC624B01A4AB2F751535901CDF0C5E11076207
            "status": "in_progress"   ← 缺陷现场
  events    events\insight-state-events.jsonl  476 B  6A56F0F4B0C34FA1EFB7D035BA5EB39795A5A28F0F6D75851E38BC77F5A48BF4
  🔴 insights\batches\  = 空（0 条）   ← 缺陷现场
观测产物 : %TEMP%\pfa-call1.json（逐调用记录器：4 POST ／ 4 preflight ／ 8 × 200 ／ loadingFailed 0）
           %TEMP%\pfa-{step2,step3,step5,step7,step8,step9,blocked}.png（逐步界面取证）
           %TEMP%\pfa-colon-probe-out.json（Windows 文件名含冒号的实测探针结果）
过程记账 : .learnbuddy/memory/2026-09-26.md（节 1–12）
```

### 8.6 后续（🔴 尚未执行）

`CORRECTION REQUIRED` —— 有界 Correction：修复 `M8` insight batch 的**文件路径安全编码**。范围与 8 项验收口径见 `CODING_START_HANDOFF.md §25`。
🔴 **本轮到此停止**：未进入 correction，未开始 `PSA-B`，`PSA-*` 其余项保持原状态。

## 9. `PSA-A CORRECTION AFTER FINAL INTERRUPTION`（2026-09-26｜🔴 追加，不改写历史）

> 🔴 **本节只做追加。§0–§8 及之前任何一字未被修改；`PSA-A FINAL RUN` 仍为 `INTERRUPTED`，未改为 `PASS`。**
> 🔴 本节不新增 `AC`，不把任何 `PSA-*` 项升级为 `PASS`。

### 9.1 执行了什么

`M8` insight batch persistence 的**有界 Correction**（`PSA-A-CORRECTION-M8-PATH-01`）：把 batch 的**物理文件名**改为经既有 reversible `~HH` codec 编码，**逻辑 `batch_id` 不变**。
基线 `d3f1133f11b03bebaa3515451328f36f598657d5`（local HEAD == remote main；working tree CLEAN）。全过程细节 → `CODING_START_HANDOFF.md §26`。

### 9.2 结果（🔴 两句话，不修饰）

**① 路径缺陷 = 已修复并验证（`CONFIRMED`）**：`batch_id` 里的 `:` 不再进入文件名；Node 层 1144 → **1159 passed / 0 failed**（`test:proxy` 15/15、typecheck ×5、`build`、`build:web` 全 PASS），并在**真实浏览器 FSA**上实测 `insights/batches/ATT_…~3Ainsight-batch~3A….json` **成功落盘**，文件内 `batch_id` 为**原始逻辑值**。

**② 恢复收口 = 未达成（`M8 PATH CORRECTION FAILED`）**：真实浏览器上以**同一个原始 operation** 重放仍返回 `PERSISTENCE_RECOVERY_BLOCKED`，`insights/batches/` 仍为空、anchor 仍 `in_progress`、⑧ 仍非 `done`、⑨ 仍锁定。**但根因已不是路径**，而是**第二个、独立的既有缺陷**（详见 9.3）。

### 9.3 🔴 新登记的第二个阻塞缺陷（与路径无关；本轮**未修**）

| 项 | 内容 |
|---|---|
| 现象 | `applyPlan` 第 ② 步 `createIfAbsent` 对三条 planned record **全部**抛 `InsightRepositoryError / PLAN_MISMATCH` |
| 触发条件 | 用户在 ⑧ 被中断**之后**、操作完成**之前**审阅了 ⑧ 的产物（现场 `events/insight-state-events.jsonl` 记录 2 次 `user_accept`，10:47:26 / 10:47:32） |
| 磁盘 vs anchor 的唯一差异 | `state`（candidate → accepted／accepted／rejected）与 `updated_at` |
| 影响 | 状态迁移**按设计**改动这两个字段，而重放要求内容**完全一致** ⇒ **一旦用户动过 ⑧ 的产物，该 operation 永久不可恢复**；「用同一次操作重试即可补齐」在本窗口**不成立** |
| 性质 | 既有 `M8-HARDENING-01` 恢复协议的缺陷，**非**本轮引入，**非**路径问题，**非**产品 `AC` |
| 后果 | `PSA-A` 现场**不能**通过重试收口 ⇒ §8.6 / `HANDOFF §20`「从 ⑧ recovery 局部 resume」在冻结工作区上**不可行** |

🔴 同时登记：**`M9` hypothesis batch path 存在同一形态的路径缺陷**（`hypothesisBatchPath` 同样原样插值含 `:` 的 `batch_id`），本轮按范围约束**未修**。

### 9.4 本轮**未**观测 / **未**执行的项（🔴 一律不得记为 `PASS`）

```
⑧ = done ／ ⑨ unlocked ／ ⑨ ／ ⑩            → ❌ 未达成（⑧ 仍 current，⑨⑩ 仍 locked）
PSA-06 / 07 / 08 / 09 / 10 / X9 终局         → ❌ 未执行
PSA-B（Vercel ／ Edge ／ Thin Proxy）         → ❌ 未启动
真实 Provider 调用                            → 0（本轮**不允许**产生；浏览器观测实测出站 origin 仅本机静态服务器与装机安全套件）
`PSA-A` 总判定                                 → 仍 `INTERRUPTED`（🔴 **不得**改 `PASS`）
```

### 9.5 证据索引（本轮）

```
冻结失败工作区（🔴 只读，未修改）: C:\Users\Red16\Desktop\fei-psa-final-workspace
recovery-copy（本轮新建，供验证）  : C:\Users\Red16\Desktop\fei-psa-final-workspace-recovery-copy
浏览器环境                        : 真实 Chrome 154.0.8037.57（CDP，全新 profile）｜🔴 仅替换 showDirectoryPicker 一个函数
观测产物                          : %TEMP%\psa-path01-evidence\（report-{discover,diag,probe,recover}.json ／ screenshots\ ／ *.log）
过程记账                          : .learnbuddy/memory/2026-09-26.md（本轮追加节）
🔴 射程限制（如实声明，非产品缺陷） : ① DOM 指针点击记录时中栏不渲染（原因未定论，故不得记为缺陷）；
                                     ② `scripts/build-web.mjs` 在本机沙箱内无声终止，已按其自身步骤等价执行
```

### 9.6 后续（🔴 需人工裁决，本轮**未**授权自动执行）

```
(a) 就 9.3 的缺陷另开**有界 Correction**（修 `M8` 恢复协议；非路径、非 Retrieval ／ Provider ／ UI）；
(b) 放弃该现场，从**干净工作区**重跑 ①→⑧ 后再继续 PSA；
(c) 先行提交本轮**已验证**的路径修复，再决定 (a) 或 (b)。
🔴 三条路径均**未**执行；`PSA-A` 保持 `INTERRUPTED`，`BLOCKER = YES`，本轮**到此停止**。
```

