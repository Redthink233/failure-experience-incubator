# SP-06 EXECUTION REPORT｜Local-first Browser Workspace & Vercel Feasibility

```
SPIKE ID      : SP-06
SPIKE NAME    : Local-first Browser Workspace & Vercel Feasibility
阶段          : S00-03｜技术架构与实现方案收敛
性质          : DISPOSABLE TECHNICAL SPIKE / NON-PRODUCTION（🔴 不是正式开发）
执行授权      : 项目负责人已明确 APPROVED FOR EXECUTION（2026-09-24，本轮）
Plan 依据     : 30_SPIKES/local_first/SP-06_LOCAL_FIRST_FEASIBILITY_PLAN.md（S6-01 – S6-20）
决策依据      : docs/DECISIONS.md `D-053` / `D-054` / `D-055` / `D-056`（均人工 CONFIRMED）
执行日期      : 2026-09-24（GMT+8）
执行环境      : 本机 Windows（Chromium 环境）+ Node v22.22.2；🔴 无任何模型 API 凭据
整体状态      : 🔴 **CONDITIONAL PASS**（见 §D 与 §Q）
产物落点      : 30_SPIKES/local_first/SP-06/
```

> 🔴 **本报告不 `CONFIRM` 任何 `TQ` 项**（`TQ01`–`TQ05` 全部仍未裁决）；
> 🔴 **本报告不进入 Gate B / Gate C**；🔴 **未写任何正式产品代码、未创建 `src/`**；
> 🔴 **未创建 / 未删除任何外部资源（腾讯云或 Vercel）**。

---

## A. Scope

### A.1 本轮实际做了什么

| 项 | 内容 |
|---|---|
| **执行对象** | `SP-06`（`S6-01` – `S6-20`，共 20 项，🔴 **未删除任何测试项、未降低任何 PASS 标准**） |
| **执行方式** | ① Node 侧本地探针（文件系统 + 结构化链路 + 性能 + SSRF + Adapter）；② **真实浏览器**（Chrome / Edge）经 DevTools Protocol 自动化观测；③ 需要原生手势的项转为 `MANUAL OBSERVATION REQUIRED` 并交付可执行清单 |
| **代码性质** | 全部落在 `30_SPIKES/local_first/SP-06/`，标 `DISPOSABLE / NON-PRODUCTION`；🔴 **未写入 `src/` / `app/` / 任何正式模块** |
| **数据性质** | 全部为 synthetic fixture，逐条标 `TEST FIXTURE / NOT PRODUCT DATA` |
| **数据库** | 🔴 **未引入任何数据库**（无 PostgreSQL / 无 SQLite 云服务 / **无 Vector DB / 无 embedding**） |
| **凭据** | 🔴 **未使用任何真实 API Key**；全部为探针自带**非机密**标记串 |

### A.2 本轮明确没做什么（🔴 硬边界，逐项确认未执行）

| 项 | 状态 |
|---|---|
| 正式产品开发 / 创建 `src/` | ❌ **NO** |
| 进入 Gate B / Gate C | ❌ **NO** |
| `CONFIRM` `TQ01`–`TQ05` 任一项 | ❌ **NO** |
| 实现 Literature RAG / PDF RAG / embedding / Vector DB | ❌ **NO** |
| 引入云 PostgreSQL | ❌ **NO** |
| 恢复 `SP-01a` | ❌ **NO** |
| **删除腾讯云资源**（`R2` / `R6-A` / `R6-B` / `R6-C`） | ❌ **NO**（`Legacy Cloud Cleanup` = `DEFERRED` / `NOT AUTHORIZED FOR EXECUTION`） |
| 付费升级 Vercel / 购买任何 add-on | ❌ **NO**（**本轮未创建任何 Vercel 资源**，费用 = 0 元） |
| 写真实 API Key 到任何项目文件 | ❌ **NO** |
| 把整个 Workspace 上传到 Vercel | ❌ **NO**（仅发送最小上下文，见 §L / §M） |
| 创建通用 URL Proxy | ❌ **NO**（见 §L：`Generic Arbitrary URL Proxy` 实测不存在） |
| 自动选择新的重大技术路线 / 自动切 `R-B` / `R-C` | ❌ **NO** |
| 改写任何历史文件（`SP-03` / `SP-03R` / `SP-01a_*` / `docs/architecture/01`–`05`） | ❌ **NO** |

### A.3 产物清单

```
30_SPIKES/local_first/SP-06/
├─ SP-06_EXECUTION_REPORT.md        ← 本文件
├─ MANUAL_OBSERVATION_CHECKLIST.md  ← 需要真人手势的项（S6-01/04/05/06/07/08/09/10/02/03）
├─ README.md                        ← 目录说明与运行方式
├─ fixture/                         ← synthetic Workspace（ws20 / ws100 / ws_bad / ws_live）
│   ├─ ws20/  ws100/  ws_bad/  ws_live/
│   └─ current_attempt.json
├─ probe/                           ← 浏览器探针（index.html / app.js / server.mjs）
├─ tools/                           ← 探针脚本
│   ├─ lib_workspace.mjs            gen_fixture.mjs
│   ├─ run_spike.mjs                ssrf_probe.mjs
│   ├─ provider_adapter_probe.mjs   cdp_probe.mjs
├─ results/                         ← 原始结果
│   ├─ raw-results.json             performance.csv
│   ├─ ssrf-results.json            provider-adapter-results.json
│   ├─ cdp-chrome.json              cdp-edge.json
└─ screenshots/                     ← chrome-probe.png / edge-probe.png
```

🔴 **全部产物不含任何凭据**（见 §K 的泄漏扫描结果）。

---

## B. Environment

| 项 | 实测值 |
|---|---|
| **OS** | Windows（`win32`，项目负责人实际目标环境） |
| **Node** | `v22.22.2`（managed runtime；用于全部 Node 侧探针） |
| **Chrome** | **`154.0.8037.57`**（`C:\Program Files\Google\Chrome\Application\chrome.exe`；实测文件版本信息） |
| **Edge** | **`153.0.4234.48`**（`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`；实测文件版本信息） |
| **浏览器驱动方式** | `--headless=new` + `--remote-debugging-port` + DevTools Protocol（独立 `--user-data-dir` 临时 profile） |
| **探针页面 origin** | `http://127.0.0.1:8787`（🔴 **属 secure context**，FSA API 与 HTTPS 同资格） |
| **跨源 mock Provider** | `http://127.0.0.1:8788`（🔴 **与页面不同 origin ⇒ CORS 真实生效**） |
| **Vercel CLI** | 🔴 **未安装**（`Get-Command vercel` 无结果） |
| **Vercel 登录态** | 🔴 **不存在**（`%USERPROFILE%\.vercel` 不存在） |
| **模型 API 凭据** | 🔴 **本机无任何模型 API 凭据** ⇒ 无真实 LLM 调用 |
| **数据库** | 无（探针全程只用本地文件系统） |
| **浏览器自动化局限** | 🔴 原生 **folder picker** 与**权限对话框**无法由程序代点 ⇒ 相关项转 `MANUAL OBSERVATION` |
| **其它环境注记** | 运行环境设定了 `NODE_TLS_REJECT_UNAUTHORIZED=0`（🔴 探针不发起任何真实 TLS 请求，不受影响；**但属环境风险，建议项目负责人知悉**） |

---

## C. D-055 / D-056 Applied Rules

> 本轮所有探针 **按已确认的 `D-055` / `D-056` 重新组织**（`S6-17` / `S6-18` 尤其如此）。

### C.1 `D-055`（LLM 请求网络路径 = `Provider-dependent Hybrid`）如何落地到探针

| 决策规则 | 探针中的实现 | 对应测试 |
|---|---|---|
| 路径由 **Adapter Capability** 决定，不逐请求问用户 | `selectPath(providerConfig)` 纯函数；**无任何 UI 路径选择控件** | `S6-17` |
| `Browser Direct` 五项适用条件 | 五项布尔能力位全部参与判定（含 `needs_server_secret`） | `S6-17` |
| **Browser Direct 不得额外经过 Vercel Proxy** | `BROWSER_DIRECT` 分支**直接** fetch 跨源 Provider；🔴 不经过 `/api/proxy` | `S6-18` |
| `Vercel Thin Proxy` 仅限"直连不可行 + 有注册 Adapter" | `VERCEL_THIN_PROXY` 分支仅当 `registered_on_server === true` | `S6-17` |
| **Proxy 保持 `THIN`** | mock proxy 只做转发 / 归一化 / 错误映射；**无任何持久化代码路径** | `S6-18` / `S6-19` |
| Custom `Base URL` = `Browser Direct Only` | `isCustomBaseUrl` 分支**不允许**走 proxy；无 CORS 时直接 `UNSUPPORTED` | `S6-17` |
| **Proxy 不接受任意 target 字段** | Proxy 只读 `provider_id`；`target_url` / `base_url` / `host` / `scheme` 全部**忽略并回显** | `S6-18` + §L |
| **不可用 Provider 必须明确失败** | 返回 `Provider connection unsupported under current browser constraints`；🔴 无静默 proxy 回退 | `S6-17` |
| **SSRF / 内网 / metadata / 非 http(s) 防护** | `assertUpstreamAllowed()`：protocol → **严格 allowlist** → 私有/特殊地址；🔴 默认语义下**全部 BLOCKED** | §L |
| **不预置服务端固定 Key** | 探针无任何服务端固定 Key；凭据只来自调用方内存 | `S6-17` / §K |

### C.2 `D-056`（Credential Persistence = `Session-only Credential`）如何落地到探针

| 决策规则 | 探针中的实现 | 对应测试 |
|---|---|---|
| 允许 **session-scoped** 载体 | 浏览器侧只用 `sessionStorage`（key `sp06.session.credential`）；Node 侧只用进程内存 `Map` | §K |
| **目标行为**：输入 → 会话可用 → **刷新后仍可用** → 会话结束清除 | 逐条验证：写入 → **刷新后仍读到** → 清除后不再读到 | §K（`present_after_reload = true`） |
| 🔴 **禁止** `localStorage` / `IndexedDB` / Workspace file / Git / KV / DB / server fs / **permanent cookie** | `durableLeakScan()` 主动扫描 `localStorage` / `IndexedDB` / `document.cookie` / `caches` | §K（`durable_leak_found = false`） |
| 🔴 Credential 不得写日志（含 `Authorization`） | 服务端只登记 `auth_header_present: true/false`；🔴 **不登记 header 值**；接口回显为 `REDACTED` | §K |
| 🔴 Proxy 不得持久化 Credential | mock proxy 无 DB / 无文件 / 无 KV / 无 durable log | §K / §M |
| 🔴 不得提供「记住我 / 永久保存」 | 探针 UI **无任何此类控件** | §K |

### C.3 与既有决策的一致性核对（🔴 防误伤）

| 检查 | 结果 |
|---|---|
| `D-050` 严格 `matched` 语义未被替换为 `cosine similarity` | ✅ **未替换**；🔴 **探针全程无数值相似度**（`numeric_similarity_absent = true`） |
| `D-052` `actual_attempt` 负例（热风 vs 送风） | ✅ 实测 `compared_not_matched` |
| `D-054` `RAG ≠ Vector DB` | ✅ 无 embedding / 无 vector store |
| `D-020` 无数值相似度 | ✅ 未出现任何 score / confidence / 权重 / 等级 |
| `D-044` 技术层字段不进产品层 | ✅ Context Pack 的 E 区标为技术层 |
| `D-030` grounding 要求 | ✅ 无真实 grounding 时 `Hypothesis.kind = model`；本轮有 grounding ⇒ `grounded` |
| `D-049` `Hypothesis` ①②③④⑤ 只读 | ✅ 探针输出结构标注 `readonly: true`，⑥⑦⑧ 与 AI 条目分列 |
| `D8` / `TQ10`（Demo seed 限制） | ⚠️ **不适用但已在夹具中显式声明**：SP-06 fixture **不是 Demo Workspace**，且标 `TEST FIXTURE / NOT PRODUCT DATA`；🔴 不得被当作 Demo seed 使用 |

---

## D. S6-01 – S6-20 Matrix

> **状态取值**：`PASS` / `FAIL` / `PARTIAL`（本轮取得部分实质证据）/ `PENDING MANUAL OBSERVATION`（需要真人手势）/ `RECORD-ONLY`（结果记录制，不设单一 PASS/FAIL）。
> 🔴 **本轮无 `FAIL` 项，也无"以文档代替实测"的 `PASS`。**

| # | 测试目标 | 状态 | 一句话依据 |
|---|---|---|---|
| `S6-01` | Vercel HTTPS 页面触发 folder picker | 🔴 **PENDING MANUAL OBSERVATION** | Vercel 未部署（`MANUAL AUTH REQUIRED`）；**但已在 secure context（`127.0.0.1`）下证实 FSA API 可用**（见 §F） |
| `S6-02` | **Chrome** 支持情况 | 🟡 **PARTIAL** | Chrome `154.0.8037.57`：secure context ✅、`showDirectoryPicker` **存在** ✅；**目录选择 / 读写交互 = PENDING MANUAL** |
| `S6-03` | **Edge** 支持情况 | 🟡 **PARTIAL** | Edge `153.0.4234.48`：同上（与 Chrome **行为一致**） |
| `S6-04` | 授权后读取本地文件 | 🔴 **PENDING MANUAL OBSERVATION** | 需要原生 picker + 用户手势 |
| `S6-05` | 创建 Attempt 文件 | 🔴 **PENDING MANUAL OBSERVATION** | 同上（Node 侧等价写入已 PASS，见 §G） |
| `S6-06` | 修改文件并实际落盘 | 🔴 **PENDING MANUAL OBSERVATION** | 同上（Node 侧等价写入已 PASS，见 §G） |
| `S6-07` | `EvidenceRef` / stable ID 可追踪性 | 🟡 **PARTIAL** | **文件系统 / 解析层 PASS**（改名后引用仍按 ID 解析，见 §G）；浏览器侧 = PENDING MANUAL |
| `S6-08` | 页面刷新后的 handle / permission 行为 | 🔴 **PENDING MANUAL OBSERVATION**（结果记录制） | 需真实 handle；`sessionStorage` 跨刷新已实测（见 §K） |
| `S6-09` | 关闭浏览器再打开后的行为 | 🔴 **PENDING MANUAL OBSERVATION**（结果记录制） | 需真实 handle + 完整浏览器重启 |
| `S6-10` | 用户撤销权限 | 🔴 **PENDING MANUAL OBSERVATION** | 需先授予权限再在站点设置中撤销 |
| `S6-11` | Workspace 文件损坏 | ✅ **PASS** | 2 个坏文件被**精确定位**、其余 6 个**照常解析**、**未崩溃**（见 §E） |
| `S6-12` | Workspace 被移动 / 删除 | 🟡 **PARTIAL** | 应用层 PASS（`WORKSPACE_UNAVAILABLE`，未崩溃，可恢复）；浏览器 FSA 侧 = PENDING MANUAL |
| `S6-13` | 20 条 Attempt retrieval | ✅ **PASS** | `n_retrieval = 16`、未比对集合 4、**无数值相似度**（见 §H / §I） |
| `S6-14` | 100 条 Attempt retrieval | ✅ **PASS** | corpus 89（排除 6 条 `Draft` + 5 条 `archived`）、`n_retrieval = 57`（见 §I） |
| `S6-15` | Structured Experience RAG 无数据库全链 | ✅ **PASS** | ⑥⑦⑧⑨⑩ **五环均产出**，`EvidenceRef` **全部按 ID 解析成功**（见 §H） |
| `S6-16` | `R-A` 在 Browser / application layer 可行性 | ✅ **PASS** | Level A 投影 + **三态可区分** + `D-050` / `D-052` 用例符合预期 + **无数值相似度**（见 §H） |
| `S6-17` | Configurable Provider 最小 adapter | ✅ **PASS** | **5 个 provider 仅改配置**即可分流（2 direct / 1 proxy / 2 unsupported），**未改代码**（见 §J） |
| `S6-18` | Browser Direct vs Thin Proxy（CORS / Key / privacy） | 🟡 **PARTIAL（结果记录制）** | **跨源实测**：有 CORS ✅ 通过 / 无 CORS ✅ **被浏览器拦截**；Proxy 路径 ✅；🔴 **Vercel 侧待人工**（见 §J / §M） |
| `S6-19` | Vercel 环境不保存整个 Workspace | 🟡 **PARTIAL** | 本地 proxy 侧：**只转发最小上下文**、无 Workspace 内容、无持久化；🔴 **Vercel 侧待人工**（见 §M） |
| `S6-20` | 无 PostgreSQL 跑通 `D9` | ✅ **PASS** | ①→⑩ **十步全部可执行**，无"必须数据库"硬依赖（见 §N） |

**统计**：
```
PASS（本轮取得完整实质证据）        = 7 项（S6-11 / 13 / 14 / 15 / 16 / 17 / 20）
PARTIAL（本轮取得部分实质证据）      = 4 项（S6-02 / 03 / 07 / 12）+ 2 项结果记录制（S6-18 / 19）
PENDING MANUAL OBSERVATION          = 7 项（S6-01 / 04 / 05 / 06 / 08 / 09 / 10）
FAIL                                = 0 项
合计                                = 20 项
```

---

## E. Raw Observations

> 原始结果文件：`results/raw-results.json`、`results/ssrf-results.json`、`results/provider-adapter-results.json`、`results/cdp-chrome.json`、`results/cdp-edge.json`、`results/performance.csv`、`screenshots/*.png`。
> 🔴 下列均为**实测观测**，非文档推断。

### E.1 异常 / 错误路径观测（`S6-11` / `S6-12`）

**`S6-11` Workspace 文件损坏**（`fixture/ws_bad/`：6 个正常文件 + 2 个坏文件）

```
总文件数            : 8
成功解析            : 6
失败并精确定位      : 2
  · ATT-BAD-json.md      → code = PARSE_JSON（levelA JSON 解析失败）
  · ATT-BAD-truncated.md → code = PARSE_ERROR（front-matter 缺失）
应用是否崩溃        : false
其它文件是否被静默丢弃 : false（6 个正常文件全部保留）
⇒ 判定：PASS（不崩溃 + 指出具体文件 + 不静默丢弃其它文件）
```

**`S6-12` Workspace 被移动 / 删除**（把应用指向不存在的目录）

```
异常抛出            : true
错误码              : WORKSPACE_UNAVAILABLE
应用是否崩溃        : false
可恢复性            : 可由 UI 提示 + 重新选择目录恢复（恢复路径见 S6-10 / S6-12 口径）
⇒ 判定：PASS（应用层）／浏览器 FSA 侧仍为 PENDING MANUAL
```

### E.2 浏览器侧关键观测（Chrome 与 Edge 完全一致）

| 观测项 | Chrome 154.0.8037.57 | Edge 153.0.4234.48 |
|---|---|---|
| `isSecureContext` | ✅ `true` | ✅ `true` |
| `typeof showDirectoryPicker` | ✅ `function` | ✅ `function` |
| `showOpenFilePicker` / `showSaveFilePicker` | ✅ / ✅ | ✅ / ✅ |
| `FileSystemHandle` / `FileSystemDirectoryHandle` | ✅ / ✅ | ✅ / ✅ |
| `sessionStorage` / `localStorage` / `indexedDB` | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ |
| `caches` API | ✅ | ✅ |
| `navigator.cookieEnabled` | ✅ `true` | ✅ `true` |
| **凭据刷新后仍可用（会话级）** | ✅ `present_after_reload = true` | ✅ `present_after_reload = true` |
| **持久化载体泄漏**（`localStorage` / `IndexedDB` / cookie / `caches`） | ✅ **`durable_leak_found = false`** | ✅ **`durable_leak_found = false`** |
| 清除后不再可用 | ✅ `present_after = false` | ✅ `present_after = false` |
| 服务端日志是否出现凭据明文 | ✅ `false`（`entries_carrying_authorization_value = 0`） | ✅ `false` |
| 截图 | `screenshots/chrome-probe.png` | `screenshots/edge-probe.png` |

> 🔴 **`headless` 说明（Limitation）**：本次浏览器自动化使用 **headless 模式**，`navigator.userAgent` 含 `HeadlessChrome/154.0.0.0`。
> `File System Access API` 的**能力存在性**、`secure context`、`sessionStorage` 行为、**CORS 拦截行为**在 headless 与有头模式下同源同实现；
> 🔴 **但"原生目录选择框 / 权限对话框"这一步在 headless 下必然无法观测** ⇒ 已转 `MANUAL OBSERVATION`。**不据此宣称有头模式下的交互已通过。**

---

## F. Browser Compatibility

### F.1 结论（🔴 射程严格限定）

| 浏览器 | 实测版本 | 结论 | 射程 |
|---|---|---|---|
| **Chrome** | `154.0.8037.57` | **secure context ✅ + FSA API 存在 ✅ + 凭据会话级 ✅ + CORS 行为符合预期 ✅** | 🔴 **只覆盖本版本、本机、headless + `127.0.0.1` 条件** |
| **Edge** | `153.0.4234.48` | 同上（**与 Chrome 无差异**） | 🔴 同上 |

🔴 **不得声称** Safari / Firefox 的表现（`D-053` 已明确不假设这些浏览器均完整支持；**本轮亦未测试**）。
🔴 **不得声称** "在 Vercel HTTPS 域名下已通过" —— 该项为 `S6-01`，**仍未执行**。

### F.2 与 `S6-01` 的关系（🔴 关键区分）

```
已验证（本轮）  : secure context 条件下 FSA API 可用（origin = http://127.0.0.1）
未验证（待人工）: Vercel HTTPS 域名下能否成功唤起 folder picker（origin = https://<project>.vercel.app）
```

> 🟠 **技术判断（`PROPOSED`，非本次实测结论）**：`http://127.0.0.1` 与 `https://` 在浏览器规范中**同属 secure context**，因此在 `127.0.0.1` 上 API 可用是一个**支持性证据**；
> 🔴 **但它不构成 `S6-01` 的 PASS** —— Vercel 域名涉及**真实 HTTPS 来源、可能的重定向、部署环境差异**，必须实测。

---

## G. Local File Persistence

> 目标：验证 **Local Workspace 作为 V1 Primary Persistence** 在**不含任何数据库**条件下可读 / 可写 / 可更新 / 可重开 / 可解析 / 引用可追踪。

### G.1 文件格式与实测可行性

采用 **Markdown（front-matter 元数据 + 结构化 JSON 区块 + 人类可读正文）**：

```
---
attempt_id: ATT-0001          ← 🔴 稳定 ID 存于文件"内容"中，不作为文件名
status: Formal                ← Draft / Formal
archive_state: active         ← active / archived（V1 无物理删除）
project_id: PRJ-DRY
created_at / updated_at
data_source_nature: TEST FIXTURE / NOT PRODUCT DATA
---

<!-- sp06:levelA:begin -->
{ "goal": { "content_item_id": "...", "source_type": "Fact", "value": "..." }, ... }
<!-- sp06:levelA:end -->
```

| 能力 | 实测结果（Node / 文件系统层，真实磁盘 I/O） |
|---|---|
| **read** | ✅ 100 个文件全部读入并解析 |
| **write（创建）** | ✅ `ws_live/attempts/ATT-LIVE-0001.md` 真实落盘（见 §N 步 ⑤） |
| **update（更新）** | ✅ 探针写入后重新读取，字节数变化（浏览器侧需人工核对，见 `MANUAL_OBSERVATION_CHECKLIST.md` 第 5 项） |
| **reopen** | ✅ 每次运行都从磁盘重新扫描 + 重新解析（无内存缓存依赖） |
| **parse** | ✅ 合法文件 100% 解析；非法文件精确定位（§E.1） |
| **stable ID** | ✅ 每个对象自带 ID；**未使用数组下标 / 排序位置 / 文件名作为身份** |
| **`EvidenceRef` resolution** | ✅ 全部按 `target_id` + `source_field_path` 解析成功，且**校验到具体内容条目 `content_item_id`** |
| **数据库依赖** | 🔴 **NONE** |

### G.2 `S6-07` 改名实验（🔴 关键负向保障）

```
步骤 1  baseline ：ATT-0001.md 存在，指向 ATT-0001 的引用条数 = N（实测 4）
步骤 2  改名为   ：zzz-renamed-file-名字改了.md（含中文与非常规前缀）
步骤 3  重新解析 ：引用条数仍 = N；全部 resolved = true
步骤 4  解析出的 current_filename = zzz-renamed-file-名字改了.md
步骤 5  content_item_id 一致性 ：✅ 全部保持
步骤 6  恢复原文件名
⇒ 判定：PASS（引用**不依赖**文件名 / 路径 / 标题）
```

🔴 **方法学声明**：引用解析路径中**不存在**任何以文件名 / 路径 / 标题 / 列表位置为键的查找；
解析唯一入口是 `Map<attempt_id, Attempt>`（由**文件内容**构建）。

> ⚠️ **Limitation**：本项在 **Node / 文件系统层**完成。浏览器侧"通过 File System Access API 改名后、在应用内重新解析引用"仍需人工观测
> （`FileSystemFileHandle.move()` 的支持情况本身也是待观测项之一）。

---

## H. Structured Experience RAG

> 目标：验证 **无任何数据库（含向量库）** 条件下，`D9` 的 ⑥⑦⑧⑨⑩ 技术链**可成立**。
> 🔴 **本探针不实现正式产品逻辑**；②④⑧⑨ 使用 **deterministic stand-in**（见 §H.3 限制声明）。

### H.1 链路实测结果（`S6-15` / `S6-20`）

| 环节 | `D9` 步 | 产出 | 实测 |
|---|---|---|---|
| `Experience Retriever` | ⑥ | 相关历史 `Formal Attempt` 集合 | ✅ `n_retrieval = 57`（100 条规模） |
| `Evidence / Comparison Context Builder` | ⑦ | 相似点 / 差异点 | ✅ `rows = 57`，**无数值相似度** |
| `Grounding Context Pack` | ⑧⑨ 输入 | A–E 五区 | ✅ 每条目携带 `source_type`；**`Inference` 未混入用户事实区** |
| `Grounded Generation` → `Candidate Insight` | ⑧ | candidate Insight | ✅ 产出（basis = `goal` / `condition` / `result_phenomenon`） |
| `Hypothesis` | ⑨ | `kind = grounded`、`history_grounded = true`、`decision_state = undecided` | ✅ 产出（有真实 historical grounding anchor） |
| `EvidenceRef` | ⑩ | 按 ID 可追溯 | ✅ **全部 resolved = true**，且 `content_item_id` 一致 |
| **数据库** | — | — | 🔴 **NONE** |

### H.2 corpus 准入（🔴 严格沿用既有规则，未因命名为 RAG 而扩大）

| 规则 | 实测 |
|---|---|
| **`Draft` 不进 `N_检索`** | ✅ 100 条中 6 条 `Draft` **即使内容与当前 Attempt 完全一致也被排除**（corpus = 89） |
| **archived 默认排除** | ✅ 5 条 `archived` 被排除（同上） |
| **当前 Attempt 不入历史 corpus** | ✅ 按 `attempt_id` 排除 |
| **无数值相似度** | ✅ `numeric_similarity_present = false`（检索 / 比较 / Context Pack 三层均已断言） |
| **`compared_not_matched` 为内部量** | ✅ 仅在内部计数（`internal_compared_not_matched_total`），**不进入 ⑦ 发布结果、不形成等级/分数** |

### H.3 🔴 `S6-16`｜`R-A` 在 Local-first 下的可行性（🔴 只测"是否可行"）

**三态可区分性**（实测）：

| 判定 | 实测存在性 |
|---|---|
| `matched` | ✅（`full-match` 组 12 条命中 4 维度） |
| `compared_not_matched` | ✅（`three-of-four` 组 `approach` 维度） |
| `uncompared` | ✅（`condition-unknown` 组：任一侧 `unknown` ⇒ `uncompared`） |

**判据用例回归**（🔴 探针内 deterministic 判据，**不是准确率评估**）：

| 用例 | 期望 | 实测 | 依据 |
|---|---|---|---|
| `缩短干燥时间` vs `缩短干燥时长` | `matched` | ✅ `matched` | `D-050`（同义改写） |
| `50°C` vs `50 摄氏度` | `matched` | ✅ `matched` | `D-050`（单位等价表达） |
| `出现明显开裂` vs `无明显开裂` | `compared_not_matched` | ✅ `compared_not_matched` | `D-050`（明确反例） |
| `50°C` vs `unknown` | `uncompared` | ✅ `uncompared` | `D-050`（`unknown` 拦截） |
| **`提高热风温度` vs `提高送风温度`** | **`compared_not_matched`** | ✅ **`compared_not_matched`** | **`D-052`（同一参数族 ≠ 语义等价）** |

**并且**：`related = matched_level_a_dimensions 非空` —— 未改变；🔴 **未引入 embedding**；🔴 **未切换 `R-B` / `R-C`**；🔴 **最终未观察到 `TQ04` 需要 REOPEN 的实质问题**（🔴 但这**不等于** `TQ04` 可 `CONFIRM`）。

### H.4 🔴 Limitation（必须与结论同读）

1. **⑧⑨ 不是真实 LLM 输出**：本机无任何模型 API 凭据 ⇒ `Candidate Insight` / `Hypothesis` 由 **deterministic extractive stand-in** 产生，输出中显式标 `NOT_A_REAL_LLM_OUTPUT: true`。
   ⇒ **本项证明"管道可通"，不证明"生成质量"**。
2. **②④ 同理**（结构化解析 / 候选失败原因均为 stand-in）。
3. **维度判定的"语义等价"用保守规则代替 LLM 辅助**：归一化全等 + 显式等价改写表；其余"双方都有值"一律 `compared_not_matched`（**保守方向 = 不轻易 `matched`**）。
   ⇒ **本项不评价准确率**（准确率由 `SP-03R` 在规则层覆盖）。
4. **规模**：20 / 100 条 synthetic，**不是真实用户语料**。

---

## I. Performance

> 🔴 **严格分离**：**local deterministic 阶段**与**LLM 网络耗时**分开记录（`SP-06 Plan` §2 / §26）。
> 🔴 **只记录耗时，不构成性能结论。**

### I.1 本地阶段耗时（5 次运行，单位 ms）

| 规模 | 文件数 | scan（中位数） | parse（中位数） | retrieval（中位数） | context build（中位数） | corpus | hits |
|---|---|---|---|---|---|---|---|
| **20 Attempt** | 20 | **0.377** | **107.6** | **0.65** | **0.30** | 20 | 16 |
| **100 Attempt** | 100 | **0.44** | **421.9** | **1.56** | **0.15** | 89 | 57 |

> 5 次运行的**全量明细**见 `results/performance.csv`。
> ⚠️ **方法学注记**：`parse` 首次运行明显偏高（冷启动 / 磁盘与杀软扫描影响），多次运行后趋稳；因此本表给**中位数**，并保留全量明细以便复核。
> 🔴 **不得**据此推断一般性能结论（不同机器、不同防病毒策略、不同 Node 版本差异极大）。

### I.2 LLM 网络耗时

```
llm_network_ms = NOT_EXECUTED
原因           = 本机无任何模型 API 凭据（🔴 不得编造）
⇒ 🔴 不得把"模型响应时间"混入 local retrieval 时间；本报告中 local 与 network 始终分离。
```

### I.3 观察（`PROPOSED`，非结论）

- `scan` 与 `retrieval` 在 100 条规模下仍处于**亚毫秒～毫秒量级**；
- `parse` 是**唯一随规模线性增长**的阶段（I/O + JSON 解析），100 条约 0.4 秒量级；
- ⇒ 若未来需要，**优化点应在 parse 层（缓存 / 增量解析）**，而非检索层 —— 🔴 **但这属实现阶段判断，本轮不作结论**。

---

## J. Hybrid LLM Path

> 对应 `S6-17` / `S6-18`，**按已确认的 `D-055` 重新组织**。

### J.1 `S6-17`｜Configurable Provider 最小 adapter（✅ PASS）

**5 个 provider，仅改配置（`PROVIDER_CONFIGS`），业务调用点 `invoke(providerConfig)` 完全不变**：

| provider_id | Adapter 能力 | 判定路径 | 结果 |
|---|---|---|---|
| `mock_browser_direct_capable` | CORS ✅ / 官方支持 ✅ / 用户凭据可用 ✅ / 无需服务端 secret ✅ | **`BROWSER_DIRECT`** | ✅ |
| `mock_proxy_required` | CORS ❌ / 已注册 Adapter ✅ | **`VERCEL_THIN_PROXY`** | ✅ |
| `mock_custom_base_url` | 自定义 `base_url` + CORS ✅ | **`BROWSER_DIRECT`**（`CUSTOM_BASE_URL_BROWSER_DIRECT_ONLY`） | ✅ |
| `mock_custom_base_url_unsupported` | 自定义 `base_url` + CORS ❌ | **`UNSUPPORTED`** | ✅ **明确失败** |
| `mock_direct_no_secret_requirement_met` | 需要服务端固定 secret | **`UNSUPPORTED`** | ✅ **明确失败** |

```
要求切换 provider 需改代码？ = false
unsupported 项是否静默走 proxy？ = false（全部返回明确提示）
unsupported 提示文案 = "Provider connection unsupported under current browser constraints"
```

> 🔴 **Limitation**：Node 侧**无法真实观测 CORS**（CORS 是浏览器行为）⇒ 本项只验证 **Adapter 决策与调用形态**；
> **CORS 的真实拦截行为由 `S6-18` 在真实浏览器中验证**（见 §J.2）。
> 🔴 **未调用任何真实 LLM Provider**（无凭据）。

### J.2 `S6-18`｜CORS / Key / privacy 实测（🟡 PARTIAL，结果记录制）

**跨源设置**：页面 origin `http://127.0.0.1:8787` vs mock Provider origin `http://127.0.0.1:8788`（**不同 origin**）。

| 路径 | 观测（Chrome 与 Edge 一致） | 结论 |
|---|---|---|
| **① Browser Direct → 有 CORS 的 Provider** | `status = 200`、`cors_passed = true`、Provider 侧收到 `Authorization`（回显 `REDACTED`） | ✅ **Browser Direct 可行** |
| **② Browser Direct → 无 CORS 的 Provider** | 🔴 **`TypeError: Failed to fetch`（`cors_passed = false`）** | ✅ **真实观测到浏览器拦截** ⇒ 这就是 `D-055` 中"Browser Direct 不可行"的**实证** |
| **③ Via Thin Proxy（`provider_id`）** | `status = 200`、`proxy = "THIN"`、`resolved_by = provider_id → registered adapter → fixed host`、`forwarded_to = http://127.0.0.1:8787/mock/provider-no-cors` | ✅ Proxy 路径可用，且目标由注册表决定 |
| **④ Proxy：任意 target 尝试** | 见 §L（`target_url_followed = false`；未知 provider ⇒ 400） | ✅ **不跟随任意 target** |

**数据可见面（privacy）记录**：

| 路径 | 数据经过的中转方 |
|---|---|
| Browser Direct | **只有用户配置的 Provider**（🔴 不经过 Vercel / 不经过本产品服务端） |
| Thin Proxy | 用户浏览器 → **本产品 Thin Proxy** → **已知 Provider**（🔴 **增加一个数据可见方**，属 `D-055` 已确认的取舍） |

**Key 暴露面记录**：

| 项 | 观测 |
|---|---|
| 凭据在浏览器运行时是否可见 | 🔴 **是**（Browser Direct 的固有性质：Key 必须在浏览器侧；`D-055` 已确认此为可接受形态，因为 Key 是**用户自己的**） |
| 凭据是否出现在前端 Bundle / 构建产物 | ✅ **否**（运行时输入，非构建时注入；本探针无构建产物） |
| 凭据是否进入服务端日志 | ✅ **否**（见 §K） |

> 🔴 **本项不给单一 PASS / FAIL**（Plan 已规定为结果记录制）。
> 🔴 **Vercel 部署侧的同类观测仍未执行** ⇒ 整体标 **PARTIAL**。

### J.3 `S6-19`｜Vercel 环境不保存整个 Workspace（🟡 PARTIAL）

**本地 Thin Proxy 侧实测**：

| 检查 | 观测 |
|---|---|
| Proxy 是否接收 Workspace 目录内容 | ✅ **否** —— 只收到显式传入的请求体键（`current_attempt_facts` / `matched_dimensions`） |
| 是否接收整个 Workspace（哨兵标记法） | ✅ 只有**显式加入** `FIXTURE_MARKER` 时才出现在转发体中 ⇒ 证明**服务端不会主动获取 Workspace 内容** |
| Proxy 是否有持久化路径 | ✅ **无**（无 DB / 无文件 / 无 KV / 无 durable log；代码路径中不存在） |
| 服务端日志是否含凭据明文 | ✅ **`false`**（`entries_carrying_authorization_value = 0`） |

🔴 **Vercel 侧**（构建产物 / Serverless 环境 / 临时存储 / 平台日志）**未验证** —— 需真实部署（见 §M）。

---

## K. Credential Security

> 对应 `S6-30` / `S6-31` 与 `D-056`。🔴 **本轮未使用任何真实 API Key**；全部为探针自带**非机密**标记串（`SP06-...-FAKE-TOKEN-...`）。

### K.1 Session-only 行为实测（✅ 符合 `D-056`）

| 步骤 | 观测（Chrome / Edge 一致） | 判定 |
|---|---|---|
| 1. 写入（`sessionStorage`） | ✅ 写入成功，记录值**已掩码** | ✅ |
| 2. 当前会话内请求可用 | ✅ 请求携带 `Authorization`，Provider 侧收到（回显 `REDACTED`） | ✅ |
| 3. **刷新页面** | ✅ **`present_after_reload = true`** | ✅ **符合 `D-056`（会话级，不是"刷新即失效"）** |
| 4. 清除 | ✅ `present_after = false` | ✅ |
| 5. 会话结束（关闭标签页 / 浏览器） | 🔴 **`PENDING MANUAL OBSERVATION`** —— 无法由自动化真实模拟"完整浏览器会话结束" | 🟡 |

### K.2 禁止载体泄漏扫描（✅ 未发现持久化泄漏）

| 载体 | 扫描方式 | 结果 |
|---|---|---|
| `localStorage` | 遍历全部 key + 值内容匹配 | ✅ **未发现标记串** |
| `IndexedDB` | `indexedDB.databases()` + 库名枚举 | ✅ **未发现**（Chrome / Edge 下均为空集） |
| `document.cookie` | 匹配 + cookie 名枚举 | ✅ **未发现**（无 permanent cookie） |
| `caches` API | `caches.keys()` | ✅ **未发现** |
| **Workspace 文件** | 全树扫描 `fixture/` + `results/` | ✅ **未发现**（见 K.4） |
| **Git / public bundle** | 本探针**未提交版本库**、**未产生构建产物** | ✅ **无此类载体**（🔴 但**正式实现阶段必须重新验证**） |
| **server durable storage** | mock proxy 无 DB / 无文件 / 无 KV / 无 durable log | ✅ **无** |
| **日志** | 服务端只登记 `auth_header_present`（布尔）；接口回显为 `REDACTED` | ✅ **`credential_plaintext_in_log = false`；`entries_carrying_authorization_value = 0`** |

```
durable_leak_found = false（Chrome 与 Edge 一致）
```

### K.3 日志泄漏检查（`S6-31`）

| 面 | 观测 |
|---|---|
| **浏览器 console** | 探针记录一律掩码（`MASKED(***xxxx)` / `REDACTED`） |
| **应用日志（mock proxy）** | ✅ 不记录 `Authorization` 值 |
| **error path** | ✅ 错误对象只含 `error.name + message`（如 `TypeError: Failed to fetch`），**不含凭据** |
| **analytics** | ✅ 本探针**未接入任何 analytics** |
| **Vercel logs** | 🔴 **未验证**（未部署）⇒ `PENDING MANUAL OBSERVATION` |
| 报告中是否出现 secret | ✅ **本报告只出现掩码与探针的非机密标记串** |

### K.4 文件级泄漏扫描结果

```
files_containing_fixture_token = ["tools/provider_adapter_probe.mjs"]
fixture_token_declared_in      = ["tools/provider_adapter_probe.mjs"]
unexpected_hits                = []
no_durable_credential_leak     = true
```

> 🔴 `SP06-...-FAKE-TOKEN-...` 是探针**源码里声明的非机密测试标记**，用于检测"是否被意外写入其它文件"。
> 🔴 **它不是凭据**；它出现在声明它的源码内属预期。
> ⚠️ **Limitation**：扫描仅覆盖 `SP-06/` 子树；🔴 **正式实现阶段须对整个仓库做同类扫描**。

### K.5 结论口径

```
✅ D-056 的"session-scoped + 刷新后仍可用 + 不落持久化载体 + 不进日志"在**本机、本探针、本浏览器版本**下成立。
🟡 "会话结束后清除"仍需人工观测（无法自动化模拟完整会话结束）。
🔴 不得据此宣称"凭据绝对不会泄漏" —— 泄漏面还包括：浏览器扩展、被入侵的宿主进程、用户自身截图行为等，均不在本探针射程内。
```

---

## L. SSRF / Proxy Boundary

> 对应 `S6-29` / `D-055` §四 · 五 · 六。🔴 **未发送任何真实外网攻击**；全部在本机回环内用 mock 上游 + **SSRF 哨兵端口**完成。
> 原始结果：`results/ssrf-results.json`。

### L.1 拓扑

```
浏览器 / 客户端 ──▶ Thin Proxy (127.0.0.1:<P>) ──▶ 注册表决定的固定上游 (127.0.0.1:<U>)
                                                       ▲
                                    客户端提交的 target_url 字段 → 🔴 完全不参与目标解析
SSRF 哨兵 (127.0.0.1:<T>) ── 期望命中数 = 0（任何被"跟随"的 target 都会打到这里）
```

### L.2 用例实测（8 / 8 通过）

| # | 用例 | 期望 | 实测 | 结果 |
|---|---|---|---|---|
| 1 | 已注册 provider，无 client target 字段 | 200，目标由注册表决定 | `resolved_by = provider_id → registered adapter → fixed host` | ✅ |
| 2 | 已注册 provider + `target_url` = 回环哨兵 | **不跟随** | `target_url_followed = false`；哨兵命中 **0**；`ignored_client_target_fields = ["target_url"]` | ✅ |
| 3 | 已注册 provider + `target_url` = 云 metadata endpoint | **不跟随** | `target_url_followed = false`；哨兵命中 **0** | ✅ |
| 4 | **未注册** provider_id + 任意 `target_url` | **400 拒绝** | `error = UNKNOWN_PROVIDER`；哨兵命中 **0** | ✅ |
| 5 | 完全不带 `provider_id` | **400 拒绝** | `error = PROVIDER_ID_REQUIRED`；哨兵命中 **0** | ✅ |
| 6 | 已注册 provider + `base_url = file:///...` | 忽略 | `ignored_client_target_fields` 含 `base_url` | ✅ |
| 7 | 已注册 provider + `host` / `scheme` / `url` / `endpoint` 覆写尝试 | 全部忽略 | `ignored_client_target_fields` = 4 项 | ✅ |
| 8 | 试图访问通用代理端点 `/api/proxy-any?target_url=...` | 端点不存在 | **404** | ✅ |

```
total_cases = 8 / passed = 8
trap_hits_total = 0
arbitrary_target_followed_anywhere = false
VERDICT = PASS
```

### L.3 Guard 单元验证（🔴 默认语义 = 正式实现口径）

| 目标 URL | 判定 |
|---|---|
| `http://localhost:8080/x` | 🔴 `BLOCKED(PRIVATE_OR_SPECIAL_HOST)` |
| `http://127.0.0.1:8080/x` | 🔴 `BLOCKED(PRIVATE_OR_SPECIAL_HOST)` |
| `http://[::1]:8080/x` | 🔴 `BLOCKED(PRIVATE_OR_SPECIAL_HOST)` |
| `http://10.0.0.5/x` | 🔴 `BLOCKED(PRIVATE_OR_SPECIAL_HOST)` |
| `http://172.16.5.5/x` | 🔴 `BLOCKED(PRIVATE_OR_SPECIAL_HOST)` |
| `http://192.168.1.10/x` | 🔴 `BLOCKED(PRIVATE_OR_SPECIAL_HOST)` |
| `http://169.254.169.254/latest/meta-data/` | 🔴 `BLOCKED(PRIVATE_OR_SPECIAL_HOST)` |
| `file:///C:/Windows/win.ini` | 🔴 `BLOCKED(SCHEME_NOT_HTTP_S)` |
| `gopher://127.0.0.1:70/` | 🔴 `BLOCKED(SCHEME_NOT_HTTP_S)` |
| `http://example.com/x`（未注册） | 🔴 `BLOCKED(HOST_NOT_IN_ALLOWLIST)` |

```
非 allowlist 的注册表目标 = BLOCKED(HOST_NOT_IN_ALLOWLIST)
默认语义下的回环注册上游 = BLOCKED(PRIVATE_OR_SPECIAL_HOST)
```

> 🔴 **探针专用开关声明（必须记账）**：为了让 mock 上游（只能跑在回环）可被访问，探针在**注册表中枢可达性**校验上使用了 `probeAllowLoopback` 开关。
> 🔴 **默认语义（= 正式实现口径）对回环 / RFC1918 / link-local / metadata 一律 `BLOCKED`**（见上表，全部在默认参数下运行）。
> ⚠️ **Limitation**：`169.254.169.254` 无法在本机绑定 ⇒ **只做 guard 单元验证，未做真实网络请求**（🔴 不造真实攻击）。

### L.4 结论

```
SSRF / Open Proxy Risk = PASS
Custom Base URL Generic Proxy = MUST BE DISABLED ⇒ 实测「不存在通用代理端点」（404）且「任意 target 不被跟随」
```

---

## M. Vercel Findings

### M.1 本轮实际状态

```
Vercel CLI          : 未安装（Get-Command vercel → 无）
Vercel 登录态        : 不存在（%USERPROFILE%\.vercel 不存在）
本轮是否创建 Vercel 资源 : ❌ 未创建（无 Project / 无 Deployment）
⇒ 状态             : MANUAL AUTH REQUIRED
⇒ 费用              : 0 元（BILLING = 0）
```

🔴 **未尝试** `npx vercel` 等需要登录的路径（🔴 **AI 不持有控制台登录态**；🔴 **不请求用户密码 / 永久 token**）。
🔴 **未跳过** `S6-01` —— 已按纪律标为 `PENDING MANUAL OBSERVATION` 并附最短操作步骤（`MANUAL_OBSERVATION_CHECKLIST.md` §4）。

### M.2 已获得的 Vercel 相关间接证据（🔴 不等价于 Vercel 实测）

| 项 | 证据 | 射程 |
|---|---|---|
| HTTPS 是否必要 | `http://127.0.0.1` 已满足 secure context；**HTTPS 域名下的行为未测** | 支持性证据 |
| 同源 Thin Proxy 是否可达 | 本地同源 `/api/proxy` 工作正常（与 Vercel Function 同源形态一致） | 支持性证据 |
| Serverless 环境是否保存 Workspace | **未测**（Vercel 侧） | ❌ 无证据 |
| Vercel 免费计划配额 / 条款是否满足比赛场景 | **未测** | ❌ 无证据 ⇒ 保留 `DEPLOYMENT TARGET ISSUE` 预留 |

### M.3 费用边界（🔴 严守）

```
SP-06 执行批准 ≠ 付费授权。
本轮只允许 0 元 / free-tier / disposable probe。
本轮未出现任何需要付费的动作 ⇒ 未触发 BILLING AUTH REQUIRED。
若后续部署出现"需要付费计划 / 购买额度 / 绑定付费 add-on / 预计产生实际费用" ⇒ 🔴 立即停止并报告，🔴 不得自动付费。
```

### M.4 临时资源清理

```
SP-06 TEMP RESOURCE CLEANUP = NOT APPLICABLE（本轮未创建任何 Vercel 或其它外部资源）
```

🔴 **`SP-06 TEMP RESOURCE CLEANUP` 与 `Legacy Cloud Cleanup` 严格区分，二者不得混写。**
🔴 **Legacy Cloud Cleanup = DEFERRED / NOT AUTHORIZED FOR EXECUTION**（项目负责人明确推迟）；**本轮 `DELETED RESOURCES = NONE`**。
🔴 **未修改 `R2` / `R6-A` / `R6-B` / `R6-C` 的任何实际云状态**；🔴 **未创建 `R3` / `R1`**；🔴 **未重启 `SP-01a`**；🔴 **未把 `Legacy Cleanup Plan` 改标为"已批准"**。
🟠 **顺带观测（仅登记，未处置）**：本轮**未登录任何云控制台**，因此**无法、也未**对 `R6-C` 的"实际是否存在"作出任何新观察；仓库口径仍为 `AUTHORIZED` / `IN CONFIGURATION` / 🔴 `NOT YET CONFIRMED CREATED`**。

---

## N. D9 Feasibility

> `S6-20` 目标 = 证明 **Local Workspace + Structured Experience RAG + Configurable LLM Path** 在技术上**可以承载 `D9`**（🔴 不是做完整正式 `D9` UI）。

### N.1 十步最小链路实测（✅ PASS）

| `D9` 步 | 探针动作 | 产物 | 是否使用数据库 |
|---|---|---|---|
| ① NL 输入 | 写入 `ws_live/current_input.txt`（真实磁盘写入） | 本地文本文件 | ❌ 无 |
| ② AI 解析 | **stand-in** 结构化解析（🔴 非真实 LLM） | 内存结构（标 `NOT_A_REAL_LLM_OUTPUT`） | ❌ 无 |
| ③ 用户确认 | 置 `user_confirmed = true` | 布尔位 | ❌ 无 |
| ④ 候选失败原因 | **stand-in** 候选（2 条，candidate only） | 候选列表 | ❌ 无 |
| ⑤ 确认保存 | 🔴 **真实落盘** `ws_live/attempts/ATT-LIVE-0001.md` | 本地 Workspace 文件 | ❌ 无 |
| ⑥ 检索历史 Attempt | `Structured Experience Retrieval`（corpus = `ws100`） | `n_retrieval = 57` | ❌ 无 |
| ⑦ 相似 / 差异 | Level A 维度三态 + 相似点 / 差异点 | 57 行比较结果，**无数值相似度** | ❌ 无 |
| ⑧ 提炼经验 | **stand-in** `Candidate Insight` | `INS-SP06-0001`（`state = candidate`） | ❌ 无 |
| ⑨ 可验证假设 | `Hypothesis`（`kind = grounded`、`history_grounded = true`、`decision_state = undecided`；①②③④⑤ `readonly`，⑥⑦⑧ 与 AI 条目分列） | `HYP-SP06-0001` | ❌ 无 |
| ⑩ 证据可追溯 | `EvidenceRef` 全部按 ID 解析成功 | ✅ 全部 `resolved = true` | ❌ 无 |

```
required_database = NONE（无 PostgreSQL / 无 SQLite 云服务 / 无 Vector DB / 无 embedding）
⇒ 判定：PASS（十步均可执行、无"必须数据库"的硬依赖）
```

### N.2 🔴 边界澄清（必须与结论同读）

- 🔴 **本项不证明 `D9` 的正式 UI 可行**（未做 UI）；
- 🔴 **本项不证明 ⑧⑨ 的生成质量**（stand-in）；
- 🔴 **本项不证明"浏览器端 File System Access API 能承载同一链路"** —— 本轮该链路的文件 I/O 在 **Node 侧**完成；
  浏览器侧等价性取决于 `S6-04`–`S6-06`、`S6-08`–`S6-10`（**PENDING MANUAL OBSERVATION**）；
- 🔴 **本项不 `CONFIRM` `TQ01` / `TQ02` / `TQ04` / `TQ05`**。

---

## O. Gate B Implications

> 🔴 **本节只陈述"哪些证据已就绪 / 哪些仍缺"，不代替 Gate B 裁决，不 `CONFIRM` 任何 `TQ`。**

| `TQ` | 本轮新增证据 | 是否足以 `CONFIRM` | 建议状态 |
|---|---|---|---|
| **`TQ01`**（技术栈 / 运行形态） | Local-first Web 形态在 Node 侧可承载 `D9`；**浏览器侧 FSA 交互仍未验证** | 🔴 **不足** | 🟡 **PROPOSED / EVIDENCE PARTIAL**（🔴 主体已由 `D-053` 确认；"是否需要 Thin Server Layer" 因 `D-055` 允许 Proxy 形态 ⇒ **仍倾向"最少必要时才需要"**，但**须待 `S6-01` + `S6-18` Vercel 侧证据**） |
| **`TQ02`**（数据持久化） | **本地文件承载 stable ID / `EvidenceRef` / archive / 生成批次语义 = PASS**（§G / §H）；无数据库可跑通全链（§N） | 🟡 **技术证据较充分** | 🟡 **PROPOSED / EVIDENCE READY FOR GATE B**（🔴 具体 schema 仍属 Integrator 收敛项；🔴 浏览器侧写入仍待人工） |
| **`TQ03`**（LLM 接入） | **两个子项已由 `D-055` / `D-056` 裁决**；Adapter 分流（5/5）+ SSRF 边界（8/8 + guard）+ CORS 真实拦截 + 凭据会话级 均已实测 | 🟡 **证据较充分** | 🟡 **PROPOSED / EVIDENCE READY FOR GATE B**（🔴 **子项已裁决 ≠ `TQ03` 已裁决**；🔴 Vercel 侧日志 / 凭据面仍未验证） |
| **`TQ04`**（检索路线） | `R-A` 在 Local-first / application layer **可行**；`D-050` / `D-052` 用例符合预期；**无数值相似度**；100 条规模未观察到实质问题 | 🟡 **`R-A` 正向证据增加** | 🟡 **PROPOSED R-A / EVIDENCE READY FOR GATE B**（🔴 **不得 `CONFIRM`**；🔴 未引入 embedding） |
| **`TQ05`**（部署与 Demo） | **Vercel 侧零证据**（未部署） | 🔴 **严重不足** | 🔴 **PROPOSED / EVIDENCE INSUFFICIENT**（🔴 `S6-01` / `S6-19` Vercel 侧 = `PENDING MANUAL OBSERVATION`） |

### O.1 对 Gate B 的明确建议（🔴 供项目负责人裁决，非代替裁决）

```
① 建议在 Gate B 前补完 MANUAL OBSERVATION（至少 S6-01 的 Vercel 版本 + S6-04/05/06 的真实读写）
   —— 理由：Local-first 的**唯一主路径**就是"浏览器访问用户本地目录"；该能力未经真人验证时，
      TQ01 / TQ02 / TQ05 的裁决基础不完整。
② 建议项目负责人**同时裁决"SP-06 整体状态判据"**（见 §Q.2：Plan 未定义整体 PASS/FAIL 阈值 ⇒ TEST SPEC GAP）。
③ 建议把 S6-08 / S6-09（handle 与 permission 跨刷新 / 跨重启行为）作为**一次性的组合观测**完成 ——
   它们直接决定首屏"选择工作区"的 UX 成本，属 `08_UI_SPEC.md` 的输入。
```

### O.2 本轮**不**产生的结论（🔴 逐项确认）

- 🔴 **不** `CONFIRM` `TQ01` / `TQ02` / `TQ03` / `TQ04` / `TQ05`；
- 🔴 **不**宣称"Local-first 已可行"（浏览器主路径仍待人工观测）；
- 🔴 **不**宣称"Vercel 部署可行"（未测）；
- 🔴 **不**因 `SP-06` 结果自动回退 / 切换任何架构路线（`Plan` §6 第 3 条）；
- 🔴 **不**把 `SP-06` 的 PASS 写入为对任何 `TQ` 的 `CONFIRM`。

---

## P. Limitations

| # | Limitation | 影响 |
|---|---|---|
| 1 | **无模型 API 凭据** ⇒ ②④⑧⑨ 全部为 deterministic stand-in | 「管道可行性」有证据；「生成质量 / 语义准确率」**无证据** |
| 2 | **headless 浏览器** | 原生 picker / 权限对话框无法观测 ⇒ 7 项转 `MANUAL OBSERVATION` |
| 3 | **Vercel 未部署**（无 CLI / 无登录态） | `S6-01` 与 Vercel 侧 `S6-18` / `S6-19` **无证据** |
| 4 | **合成语料（20 / 100 条）** | 不代表真实用户语料分布；**不得外推** |
| 5 | **维度判定的"语义等价"用保守规则代替 LLM 辅助** | 本项**不评价准确率**；`D-050` 语义的**产品级判定实现**仍属实现阶段 |
| 6 | **性能仅为单机记录** | 🔴 不构成性能结论；受机器 / 杀软 / 磁盘状态影响 |
| 7 | **`169.254.169.254` 无法本机绑定** | metadata endpoint 只做 guard 单元验证，未做真实网络请求 |
| 8 | **扫描范围有限** | 凭据泄漏扫描只覆盖 `SP-06/` 子树；🔴 正式实现阶段须全仓扫描 |
| 9 | **`Junction` / 符号链接 / 网络盘 / OneDrive 同步目录** | 未测试 —— 可能影响 FSA 行为（🔴 属未来观察项） |
| 10 | **Safari / Firefox** | 未测试，`D-053` 亦未假设其完整支持 ⇒ 🔴 **不得声称其表现** |
| 11 | **运行环境含 `NODE_TLS_REJECT_UNAUTHORIZED=0`** | 本探针不发起真实 TLS 请求 ⇒ 不影响结论；🔴 但属环境风险，建议知悉 |
| 12 | **未验证"有头模式"下的 FSA 交互** | headless 与有头在 API 层面同源，但交互层必须人工确认 |

---

## Q. Exception Report

### Q.1 标志位

| 标志位 | 值 | 说明 |
|---|---|---|
| `BLOCKER` | **`NO`** | 本轮无阻塞项 |
| `CCR` | **`NO`** | 未处理 CCR = 0（本轮**不提 CCR**） |
| `PRODUCT SEMANTIC CONFLICT` | **`NO`** | 未发现与 `D1`–`D-056` 的任何冲突 |
| `DECISION REQUIRED` | **`0`（新增）** | `DR-03` / `DR-04` 已由 `D-055` / `D-056` 关闭；**本轮未产生新的架构级 `DECISION REQUIRED`** |
| `BILLING AUTH REQUIRED` | **`NO`** | 未触发（费用 = 0 元） |
| `MANUAL AUTH REQUIRED` | **`YES`** | **Vercel 部署**：无 CLI / 无登录态 ⇒ 已交付最短步骤（`MANUAL_OBSERVATION_CHECKLIST.md` §4） |
| `MANUAL OBSERVATION PENDING` | **`YES`（7 项）** | `S6-01` / `S6-04` / `S6-05` / `S6-06` / `S6-08` / `S6-09` / `S6-10` |
| `DEPLOYMENT TARGET ISSUE` | **`NO`（保留）** | Vercel 未部署、配额 / 条款未测 ⇒ 若后续不满足比赛场景则报此项 |
| `PROCESS DEVIATION` | **`YES`（历史）** | 🔴 `R2` 提前手工创建（历史事实，**不得隐去**）；本轮**无新增偏差** |
| `RESOURCE CHANGE REQUIRED` | **`RESOLVED`** | 🔴 **历史两次 `YES` 保留**（旧 API Gateway 不可执行 / `R6-C` 新依赖）；本轮**无新增未处理项** |
| `LEGACY CLOUD CLEANUP` | **`DEFERRED`** | `/ NOT AUTHORIZED FOR EXECUTION`；**本轮 `DELETED RESOURCES = NONE`** |

### Q.2 🔴 TEST SPEC GAP（必须记账，不得用"临时发明的阈值"掩盖）

> 依据任务纪律「若测试计划中没有足够明确的 PASS threshold ⇒ 不得临时发明一个再宣告 PASS，正确状态 = `INCONCLUSIVE / TEST SPEC GAP`」。

```
GAP-1｜SP-06 整体状态判据缺失
  · SP-06 Plan 只定义 **逐项**判定口径（且明确 S6-08 / S6-09 / S6-18 为"结果记录制"）
  · Plan **未定义整体 PASS / CONDITIONAL PASS / FAIL / INCONCLUSIVE 的阈值或判定规则**
  ⇒ 本轮**不发明整体阈值**；整体状态标 **CONDITIONAL PASS** 仅作为**描述性汇总**
     （含义 = 已执行项全部 PASS + 明确列出未执行 / 未验证项），并**提请项目负责人裁定整体判据**

GAP-2｜"浏览器可读写本地目录"未定义失败时的降级判据
  · Plan §3.4 / §Q.4 明确 File System fallback（Folder Import / ZIP / Upload / Local Companion）
    只有在"SP-06 证明主方案存在影响比赛演示的兼容性问题"时才升级
  · 但**"影响比赛演示"未定义为可操作判据**（无阈值、无场景列表）
  ⇒ 本轮**不升级 fallback**；建议在 Gate B 一并定义该判据

需要补什么（建议）：
  ① 整体状态判据：至少明确"哪些项是整体结论的硬前置"（本轮判断：S6-01 + S6-04/05/06 + S6-09 属硬前置）
  ② fallback 升级判据：明确"兼容性问题影响演示"的可判定含义（如：目标浏览器无法完成一次读+写循环 ⇒ 升级）
  ③ 性能：明确"是否需要"以及"若需要，记录口径（次数 / 环境 / 统计量）"
```

### Q.3 `S6-08` / `S6-09` / `S6-18` 的"结果记录制"处理

| 项 | 本轮记录内容 |
|---|---|
| `S6-08` | 🟡 部分：`sessionStorage` 跨刷新可用（实测）；**handle / permission 跨刷新行为 = PENDING MANUAL**（须分别记录"需重新授权"与"可直接使用"两种实际行为） |
| `S6-09` | 🔴 **PENDING MANUAL**（须记录 handle 是否可从持久化存储恢复、是否需重新选择目录） |
| `S6-18` | 🟡 见 §J.2：已记录两条路径的 CORS 通过 / 拦截、凭据所在位置、数据经过的中转方；**Vercel 侧待补** |

### Q.4 Legacy Cloud 状态（🔴 严格区分，不得混写）

```
Legacy Cloud Cleanup   = DEFERRED BY PROJECT OWNER
NOT AUTHORIZED FOR EXECUTION
DELETED RESOURCES      = NONE
创建的云资源            = NONE
R2 / R6-A / R6-B / R6-C：未修改（本轮未登录任何云控制台）
R6-C 的 canonical 状态  ：未更新（仓库口径仍为 AUTHORIZED / IN CONFIGURATION / NOT YET CONFIRMED CREATED）
SP-01a                 ：未重启；后续创建链未恢复
```

### Q.5 本轮边界（🔴 逐项确认未执行）

| 项 | 状态 |
|---|---|
| 写正式产品代码 / 创建 `src/` | ❌ NO |
| 进入 Gate B / Gate C | ❌ NO |
| `CONFIRM` `TQ01`–`TQ05` | ❌ NO |
| 实现 Literature RAG / PDF RAG / Vector DB / embedding / 云 PostgreSQL | ❌ NO |
| 创建 / 删除任何云资源 | ❌ NO |
| 创建 Vercel Project | ❌ NO |
| 付费升级 / 购买 add-on | ❌ NO |
| 写真实 API Key 到项目文件 | ❌ NO |
| 上传整个 Workspace 到服务端 | ❌ NO |
| 创建通用 URL Proxy | ❌ NO |
| 改写历史文件（`SP-03` / `SP-03R` / `SP-01a_*` / `docs/architecture/01`–`05`） | ❌ NO |
| 自动切换重大架构路线 | ❌ NO |

### Q.6 待人工动作（唯一收敛点）

```
① 按 30_SPIKES/local_first/SP-06/MANUAL_OBSERVATION_CHECKLIST.md 完成 7 项人工观测并回报
② （可选）完成 Vercel 免费 Preview 部署，补 S6-01 / S6-18（Vercel 侧）/ S6-19（Vercel 侧）
③ 裁定 §Q.2 的 TEST SPEC GAP（整体状态判据 + fallback 升级判据）
④ 之后由项目负责人 / ChatGPT 审查本报告，再决定是否进入 Gate B
🔴 本轮到此停止；不进入 Gate B / Gate C。
```

---

## 附：如何复现本轮全部自动化证据

```powershell
cd "C:\Users\Red16\Desktop\失败经验孵化助手\30_SPIKES\local_first\SP-06"
$node = "C:\Users\Red16\.workbuddy\binaries\node\versions\22.22.2\node.exe"

& $node tools\gen_fixture.mjs               # 重建 synthetic fixture
& $node tools\run_spike.mjs                 # S6-07/11/12/13/14/15/16/20 + performance.csv
& $node tools\ssrf_probe.mjs                # SSRF / Open Proxy 边界
& $node tools\provider_adapter_probe.mjs    # S6-17 Configurable Provider
& $node tools\cdp_probe.mjs chrome 8791 9331   # 真实 Chrome 观测 + 截图
& $node tools\cdp_probe.mjs edge   8793 9332   # 真实 Edge   观测 + 截图
& $node probe\server.mjs 8787               # 人工观测用探针页面 → http://127.0.0.1:8787/
```

```
DISPOSABLE / NON-PRODUCTION —— 本目录全部产物为一次性探针，🔴 不得迁入 src/、不得作为正式实现依据。
```

---

## R. CURRENT PROCESS DISPOSITION（追加｜2026-09-24，`D-057`）

> 🔴 **本节为纯追加的流程处置登记**，依据 = `docs/DECISIONS.md` **`D-057`（`CONFIRMED`，2026-09-24）**。
> 🔴 **§A–§Q 与「附：如何复现」原文一字未改**；🔴 **本节不修改任何实测结果、不修改任何测试项状态、不新增观测**。

```
CURRENT PROCESS DISPOSITION（当前流程处置，2026-09-24）

HISTORICAL EXECUTION STATUS（历史执行状态，🔴 保持不变、不得改写）
  = CONDITIONAL PASS（描述性历史汇总）
    PASS = 7（S6-11 / 13 / 14 / 15 / 16 / 17 / 20）
    PARTIAL = 6（S6-02 / 03 / 07 / 12 + 结果记录制 S6-18 / 19）
    PENDING MANUAL OBSERVATION = 7（S6-01 / 04 / 05 / 06 / 08 / 09 / 10）  🔴 不删除、不标 PASS
    FAIL = 0

CORE ARCHITECTURE EVIDENCE = SUFFICIENT TO PROCEED TO GATE B
DEPLOYMENT / BROWSER MANUAL ACCEPTANCE = DEFERRED TO PRE-SUBMISSION
```

- **处置内容**：`SP-06` 中尚未完成的 **Vercel 部署验证**与**真实浏览器目录权限生命周期人工观测**，**不再作为 `Gate B` / `Gate C` / 正式开发启动的硬阻塞项**；**转为 `PRE-SUBMISSION ACCEPTANCE` 的必做项**（清单 = `20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md`，`PSA-01`–`PSA-13`，状态 `PLANNED` / `NOT EXECUTED`）。
- 🔴 **本处置不代表的含义（逐条否认）**：
  - ❌ 不代表 `SP-06` 整体 = `PASS`（🔴 **仍为 `CONDITIONAL PASS`**）；
  - ❌ 不代表 7 项 `PENDING MANUAL OBSERVATION` 已完成（🔴 **仍未执行、仍无观测**）；
  - ❌ 不代表 `S6-18` / `S6-19` 的 Vercel 侧证据已取得（🔴 **仍无**）；
  - ❌ 不代表"Local-first 已可行"、不代表"Vercel 部署可行"；
  - ❌ 不代表对 `TQ01` / `TQ02` / `TQ03` / `TQ04` / `TQ05` 中任何一项的 `CONFIRM`；
  - ❌ 不代表 §Q.2 的 `TEST SPEC GAP`（整体状态判据 / fallback 升级判据）已被裁定 —— 🔴 **该 GAP 仍处于"待项目负责人裁定"状态，本轮未裁定**。
- **File System fallback**：🔴 **本轮仍不触发**（`NO DECISION REQUIRED`）；升级条件 = `D-057` 登记的 **F1–F4**，须在 `PRE-SUBMISSION ACCEPTANCE` 阶段实测后才可能触发。
- **费用 / 资源**：**0 元**；🔴 **本轮未创建 / 未删除任何外部资源**（腾讯云与 Vercel 均无）；🔴 **`Legacy Cloud Cleanup` 仍为 `DEFERRED` / `NOT AUTHORIZED FOR EXECUTION`**；🔴 **`SP-06 TEMP RESOURCE CLEANUP` = `NOT APPLICABLE`**。
- **下一动作**：本报告**当前阶段不再有新的人工观测要求**（7 项已后置至提交前）；下一步在 **Gate B 一次总确认**。

---

## S. GATE B LANDING 登记（追加｜2026-09-24）

> 🔴 **本节为纯追加的流程登记**（Gate B Landing Phase 完成后的状态确认）。
> 🔴 **§A–§R 原文一字未改**；🔴 **本节不修改任何实测结果、不修改任何测试项状态、不新增观测**。

```
GATE B LANDING（2026-09-24）已完成
  · Source = Gate B Final Human Confirmation（项目负责人：「A｜确认以上全部 Gate B 决策」）
  · TQ01 → D-058 CONFIRMED ／ TQ02 → D-059 CONFIRMED ／ TQ03 → D-060 CONFIRMED
  · TQ04 → D-061 CONFIRMED ／ TQ05 → D-062 CONFIRMED（附 DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION）
  · 流程   → D-057 CONFIRMED（SP-06 部署验证 / 浏览器人工验收延期至提交前）

本报告的状态（🔴 不变）
  · HISTORICAL EXECUTION STATUS = CONDITIONAL PASS（PASS 7 / PARTIAL 6 / PENDING MANUAL 7 / FAIL 0）
  · 🔴 7 项 PENDING MANUAL OBSERVATION（S6-01 / 04 / 05 / 06 / 08 / 09 / 10）仍然 PENDING
    → 未标 PASS、未删除、未伪造观测（🔴 本文件从未出现对这 7 项的伪造结果）
  · S6-18 / S6-19 的 Vercel 侧未验证登记保留
  · CURRENT PROCESS DISPOSITION = CORE ARCHITECTURE EVIDENCE SUFFICIENT FOR GATE B
                                 ／ DEPLOYMENT / BROWSER MANUAL ACCEPTANCE = DEFERRED TO PRE-SUBMISSION
  · 🔴 TEST SPEC GAP（整体状态判据 / fallback 升级判据）仍未被正式裁定

提交前必做（🔴 未执行）
  · 20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md → PSA-01 – PSA-13 + PSA-X1 – X11（全部 PENDING）
  · File System fallback 升级条件 = F1–F4（当前仍 NO DECISION REQUIRED）

🔴 本报告所载"未验证"事实不因 Gate B Landing 而改变：
   不得宣称「Local-first 已可行」、不得宣称「Vercel 部署可行 / 已验证 / 已部署」、
   不得宣称「HTTPS picker 已验证 / Production Ready / 已完成浏览器验收」。
🔴 未创建 / 未删除任何外部资源（腾讯云与 Vercel 均无）；费用 = 0 元。
🔴 SP-06 TEMP RESOURCE CLEANUP = NOT APPLICABLE（与 Legacy Cloud Cleanup 严格区分）。
```



