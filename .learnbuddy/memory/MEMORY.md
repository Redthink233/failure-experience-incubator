# 项目长期记忆：失败经验孵化助手（钩子层）

> 细则 = `.learnbuddy/memory/DECISION_INDEX.md`（§A 决策 / §B 环境 / §C* 各阶段现状 / **§C-PREPSA 最新** / §D 承重口径与模块语义钩子）。
> 权威序：`docs/DECISIONS.md` > `docs/00–09`；过程 → `docs/CHANGELOG.md` + 日期日志；阶段集成 → `20_INTEGRATION/`。
> 🚩 2026-09-25 第五次压缩：只留钩子；协作规则 / 口径 / 禁写 / 模块语义全部在 DECISION_INDEX 与日期日志。

## 1. 基本
粤港澳大湾区 AI Coding 创新大赛（LearnBuddy）｜AI + 学术科研｜赛题「失败经验累积及孵化助手」｜初赛 V1 2026-09-16 ~ **09-26 23:59**｜主链 `D9` 十步。

## 2. 协作规则
→ 权威 = `docs/00_PROJECT_RULES.md`；承重口径摘要（人工决策项 / 状态语义 / 事实-推断-建议分离 / 不改写历史 / 成本与凭据硬规则）已下沉 **`DECISION_INDEX §D` 末条**；跨项目硬规则另见 `~/.learnbuddy/MEMORY.md`。

## 3. 决策编号（→ §A）
`D1`–`D10` / `R1`–`R6`｜`D-011`–`D-048`｜`D-049`｜`D-050`（Level A `matched` = 严格语义重叠）｜`ADJ-01` = `CLOSED/DERIVED`｜`D-051`–`D-057`｜**`D-058`–`D-062` = `TQ01`–`TQ05` Gate B 最终裁决（全 `CONFIRMED`）**。

## 4. 环境（→ §B）
🔴 `Bash` 完全不可用 ⇒ 一切命令走 **`PowerShell`**；不回显 stdout ⇒ 重定向 `$env:TEMP\*.txt` 再 `Read`（只用 `| Out-File -LiteralPath $log -Encoding utf8`；禁 `*>>` / 默认 `Out-File`）。🔴 `Write` >600 行静默截断 ⇒ 分块写 + `Grep '^#{1,3} '`。🔴 **🆕 默认沙箱禁止写入工作区**（写 `dist/**` 报 `EPERM` + 路径 GBK 乱码）⇒ **`build` / `build:web` / `test` / `test:proxy` / `git add|commit` 必须提权执行**；只读 `typecheck` 与 `Write` / `Edit` 不受影响。🔴 命令里的 `%` 判为 cmd 变量语法 ⇒ 用 `git rev-parse HEAD`；`Remove-Item` 用 `-LiteralPath` + `Test-Path`。🔴 **🆕 `fs.cpSync` 在源路径含中文时会让 Node 进程崩溃（`0xC0000409`）⇒ 一律逐文件复制**。🔴 **🆕 PowerShell 里 `tsc` 裸命令静默不生效 ⇒ 用 `node node_modules/typescript/bin/tsc`**。🔴 **🆕 `typecheck` 与 `test` 都**不含** `src/ui/components/**`（DOM scope）⇒ 组件层 TS 错误只有 `typecheck:web` / `build:web` 能发现，回归必须跑满**。🔴 **🆕 CDP 截图 `clip` 是页坐标（对需滚动元素会截出空白条）⇒ `scrollIntoView({block:'start'})` + 截整视口**。🔴 **🆕 `selectAttempt` 的读取是异步的（左栏高亮先变）⇒ 自动化须等**工作台内容**变化**。🔴 **🆕 PowerShell `Get-Content`/`Select-String` 行号与真实行号不一致（中文差异）⇒ 行号一律以 `Read`/`Grep` 为准**。本机无模型 API 凭据；Spike 产物标 `DISPOSABLE/NON-PRODUCTION`，不入 `src/`。`Bash` 工具含中文路径必崩 ⇒ 文件列举用 `Glob` / `Grep`，其余走 `PowerShell`。

## 5. 当前状态（→ §C*）
- `S00-01`/`S00-02` = `CLOSED/CONFIRMED`（不得重开）；`Gate B`/`Gate C` = `COMPLETE`；契约 = `v0.3`｜`FROZEN`｜`IMPLEMENTATION BASIS`；`01`–`05` 仍 `PROPOSED`。阶段 = `S01 / Implementation`。
- 已完成：`S01-01`/`01A`/`02`/`04`/`05`（+`05B`/`05C`）｜`S01-03`｜`M7`（🔴 标识就是 `M7`，不得写成 `S01-04`）｜`M7-INTEGRATE`｜`M8`｜`M9`｜`M15`（baseline `3696d7d`）｜`M8-HARDENING-01` = `CLOSED`｜`S01-06` = `DONE/ACCEPTED`（baseline `aa8e89f`）｜`S01-06B` = `DONE`（baseline `9e710d3` → `a1ff737`）｜**`M16` = `DONE/ACCEPTED`（baseline `a1ff737` → `d885ab4`；8 条 Demo `Formal` Attempt 只到 Attempt 层 + 真实可选 `demo-workspace/` + fail-closed `reset`，Node-only 工具在 `src/demo/**`）**｜**`PRE-PSA-HARDENING-01` = `DONE`（baseline `d885ab4`，🔴 **Git commit 因 `.git` 中途不可见而未执行 → BLOCKER，需人工确认**；4 个修复 = Formal 历史焦点 / 三态文案分离 / providerless 只读 affordance / DEMO-05·06 raw_text；`§K.5 -03` = `CLOSED/RETIRED`；细节见 HANDOFF §18）**。
- `M15` = 编排 + composition root（COMPOSER，不新增语义）；`S01-06` = App Shell（`src/ui/**` + `app/**` + `tsconfig.web.json` + `dist-web/`，**无框架 / 无新依赖**）；`S01-06B` = 读/写路径解耦（三处「读半边」抽出 + UI 双门，**命令侧零改动**）；`M16` = Demo 基线（`data_source_nature = demo_sample` 是**唯一**标注，无第二套 flag）。P0 语义链 ①–⑩ 全有独立模块（见 §D）。
- 工程事实：tests **947/947** + **15/15**（`test:proxy`）；`typecheck` × 5 + `build` + `build:web` 全 PASS；`demo:status` = 8 条 / identity proven；Git 无 remote / 未 push（🔴 本轮 `.git` 中途不可见 ⇒ 提交阻塞）。
- `SAFE NEXT` = `PRE-SUBMISSION｜真实 Provider + Browser PSA → Demo Rehearsal → Vercel Preview → Submission Package`（🔴 **未授权自动启动**）。
- `AC` 口径 / `SP-06` / `PSA` 状态见 §D（canonical 162 + `AC-Q06` 6 = **168**；`PSA-*` 全 `PENDING`，非产品 `AC`）。

## 6. 禁写清单（原文 → §C-* / §D）
🔴 `Vercel 已验证 / 已部署 / Production Ready`｜`Local-first 已可行 / 已完成浏览器验收`｜`Chrome / Edge / FSA verified`｜`real provider verified`｜把 `PSA-*` 当 `AC`｜`R6-C` / `R3` = `CREATED`｜把 `SP-06` 历史改 `PASS`｜把 `TQ01`–`TQ05` 之外的项写成已裁决｜未授权新增 `Decision` / `AC` / `CCR`｜把未确认项写成 `CONFIRMED`｜改写历史文本（只允许就地补注）。
🔴 `M9` / `M15-LAND` / `S01-06` / `S01-06B` / `M16` / `PRE-PSA-HARDENING-01` 的追加禁写项见 §C-M9 §M9-5、§C-M15 §M15-6、§C-S0106 §S0106-7、§C-S0106B §S0106B-6、§C-M16 §M16-6、§C-PREPSA §PREPSA-7（🔴 含：不得把 providerless read 的本地 smoke 写成「真实浏览器人工验收已通过」；不得写「Demo 命中 DEMO-01/02 已实测」——真实命中只能由彩排 / `PSA` 观测；不得写「`DEMO-08` 文案已修正」——**未改**）。
