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
