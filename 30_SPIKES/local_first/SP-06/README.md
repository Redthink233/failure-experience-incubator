# SP-06｜Local-first Browser Workspace & Vercel Feasibility

```
SPIKE ID   : SP-06
性质        : DISPOSABLE TECHNICAL SPIKE / NON-PRODUCTION
阶段        : S00-03｜技术架构与实现方案收敛
Plan 依据   : 30_SPIKES/local_first/SP-06_LOCAL_FIRST_FEASIBILITY_PLAN.md
执行报告    : ./SP-06_EXECUTION_REPORT.md
执行日期    : 2026-09-24
整体状态    : 🔴 CONDITIONAL PASS（7 项 PASS + 6 项 PARTIAL + 7 项待人工观测；0 项 FAIL）
```

> 🔴 **本目录全部产物为一次性探针**：不得迁入 `src/` / `app/`，不得作为正式实现依据。
> 🔴 **所有数据均为 `TEST FIXTURE / NOT PRODUCT DATA`**，**不是** Demo Workspace（不适用也不代表 `D8` / `TQ10` 的 seed 规则）。
> 🔴 **不含任何凭据**（仅含探针自带的**非机密**标记串，用于泄漏检测）。

---

## 目录结构

```
SP-06/
├─ SP-06_EXECUTION_REPORT.md        执行报告（A–Q 共 17 节）
├─ MANUAL_OBSERVATION_CHECKLIST.md  需要真人手势的 7 项的逐步操作清单
├─ README.md                        本文件
├─ fixture/                         synthetic Workspace（全部 TEST FIXTURE）
│   ├─ ws20/attempts/*.md           20 条 Formal Attempt（含 4 条不相关负例）
│   ├─ ws100/attempts/*.md          100 条（含 6 条 Draft + 5 条 archived 负例）
│   ├─ ws_bad/                      损坏文件样本（S6-11）
│   ├─ ws_live/                     D9 走查落盘样本（S6-20）
│   └─ current_attempt.json         "当前 Attempt"（不入历史 corpus）
├─ probe/                           浏览器探针
│   ├─ index.html                   探针页面
│   ├─ app.js                       能力检测 / 凭据 / 网络路径 / 最小上下文
│   └─ server.mjs                   静态服务 + 跨源 mock Provider + Thin Proxy（含 SSRF guard）
├─ tools/                           Node 侧探针
│   ├─ lib_workspace.mjs            解析 / Level A 三态 / 检索 / Context Pack / EvidenceRef / 生成 stand-in
│   ├─ gen_fixture.mjs              生成 synthetic fixture
│   ├─ run_spike.mjs                S6-07 / 11 / 12 / 13 / 14 / 15 / 16 / 20 + 性能
│   ├─ ssrf_probe.mjs               S6-29 SSRF / Open Proxy 边界（含哨兵端口）
│   ├─ provider_adapter_probe.mjs   S6-17 Configurable Provider（5 个配置，仅改配置不改代码）
│   └─ cdp_probe.mjs                真实浏览器（Chrome / Edge）经 CDP 观测 + 截图
├─ results/                         原始结果（JSON / CSV）
└─ screenshots/                     chrome-probe.png / edge-probe.png
```

---

## 一键复现（PowerShell）

```powershell
cd "C:\Users\Red16\Desktop\失败经验孵化助手\30_SPIKES\local_first\SP-06"
$node = "C:\Users\Red16\.workbuddy\binaries\node\versions\22.22.2\node.exe"

& $node tools\gen_fixture.mjs                 # 重建 fixture
& $node tools\run_spike.mjs                   # 本地链路 + 性能
& $node tools\ssrf_probe.mjs                  # SSRF / Open Proxy
& $node tools\provider_adapter_probe.mjs      # Provider adapter 分流
& $node tools\cdp_probe.mjs chrome 8791 9331  # Chrome
& $node tools\cdp_probe.mjs edge   8793 9332  # Edge
```

需要真人手势的观测（S6-01 / 04 / 05 / 06 / 07 / 08 / 09 / 10）：

```powershell
& $node probe\server.mjs 8787
# 然后用 Chrome 或 Edge 打开 http://127.0.0.1:8787/
# 逐步操作见 MANUAL_OBSERVATION_CHECKLIST.md
```

---

## 关键结论速查

| 项 | 结果 |
|---|---|
| 浏览器（Chrome `154.0.8037.57` / Edge `153.0.4234.48`）secure context + FSA API 能力 | ✅ 均支持且无差异 |
| 20 / 100 条 Attempt retrieval | ✅ PASS（无数据库、无数值相似度） |
| Structured Experience RAG 无数据库全链（⑥⑦⑧⑨⑩） | ✅ PASS（`EvidenceRef` 全解析成功） |
| `R-A` 在 Local-first / application layer 可行性 | ✅ PASS（`D-050` / `D-052` 用例符合预期） |
| 文件改名后引用仍按 ID 解析 | ✅ PASS |
| 损坏文件 / 目录不可访问 | ✅ PASS（不崩溃 + 精确定位 + 可恢复） |
| Configurable Provider（仅改配置分流） | ✅ PASS（5/5） |
| Thin Proxy 不接受任意 target / 无通用代理端点 | ✅ PASS（8/8，哨兵命中 0） |
| 凭据 session-scoped（刷新后可用、无持久化泄漏、不进日志） | ✅ PASS（会话结束清除待人工） |
| 无 PostgreSQL 跑通 `D9` ①→⑩ | ✅ PASS |
| Vercel HTTPS 下 folder picker（`S6-01`） | 🔴 **待人工观测**（`MANUAL AUTH REQUIRED`） |
| 真实浏览器读写本地目录（`S6-04` / 05 / 06） | 🔴 **待人工观测** |
| handle / permission 跨刷新、跨重启（`S6-08` / `S6-09`） | 🔴 **待人工观测** |
| 权限撤销（`S6-10`） | 🔴 **待人工观测** |
| 费用 | **0 元**（未创建任何 Vercel 或腾讯云资源） |
| Legacy Cloud Cleanup | **DEFERRED / NOT AUTHORIZED FOR EXECUTION**（本轮未删除任何资源） |
