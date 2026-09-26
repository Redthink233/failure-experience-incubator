# 项目长期记忆：失败经验孵化助手（钩子层）

> 细则 = `.learnbuddy/memory/DECISION_INDEX.md`（§A 决策｜§B 环境｜§C* 各阶段现状｜§D 承重口径与禁写）。
> 权威序：`docs/DECISIONS.md` > `docs/00–09`；过程 → `docs/CHANGELOG.md` + 日期日志；阶段集成 → `20_INTEGRATION/`。
> 🚩 2026-09-26 第六次压缩：只留钩子，细节下沉 §B。

## 1. 基本
粤港澳大湾区 AI Coding 创新大赛（LearnBuddy）｜赛题「失败经验累积及孵化助手」｜初赛 V1 截止 2026-09-26 23:59｜主链 `D9` 十步。

## 2. 协作规则
→ 权威 = `docs/00_PROJECT_RULES.md`；承重口径（人工决策项 / `CONFIRMED`·`PROPOSED`·`REJECTED`·`SUPERSEDED` / 事实-推断-建议分离 / 不改写历史、只就地补注 / 成本与凭据硬规则）→ §D；跨项目规则 → `~/.learnbuddy/MEMORY.md`。

## 3. 决策编号（→ §A）
`D1`–`D10`｜`R1`–`R6`｜`D-011`–`D-048`｜`D-049`｜`D-050`（Level A `matched` = 严格语义重叠）｜`ADJ-01` = `CLOSED/DERIVED`｜`D-051`–`D-057`｜`D-058`–`D-062` = `TQ01`–`TQ05`（全 `CONFIRMED`）。

## 4. 环境（🔴 硬约束｜细则 → §B）
- 🔴 `Bash` 含中文路径**必崩** ⇒ 命令走 **PowerShell**；文件列举用 `Glob`/`Grep`；行号只信 `Read`/`Grep`。
- 🔴 命令 **stdout 不回显**（`git` 同，其 stderr 被裹成 `NativeCommandError`）⇒ `& <cmd> 2>&1 | Out-File -LiteralPath $log -Encoding utf8` 落盘后 `Read`；stderr 的 `fatal:` 常是判定依据。多段写同一 log，**每行都要 `-Append`**，漏一处静默从头覆盖。
- 🔴 沙箱**禁止写工作区**（`dist/**` 报 `EPERM`）⇒ `build`/`build:web`/`test`/`test:proxy`/`demo:*` 先试、`EPERM` 再提权；`typecheck`、`Write`/`Edit`、`git add|commit|push` 未受限。
- 🔴 PowerShell 里 `tsc` 裸命令**静默不生效** ⇒ `node node_modules/typescript/bin/tsc`。
- 🔴 `typecheck`/`test` **不含** `src/ui/components/**`（DOM scope）⇒ 回归必须跑满 5 个 typecheck。
- 🔴 其它：`fs.cpSync` 源路径含中文让 Node 崩 ⇒ 逐文件复制；命令里的 `%` 判为 cmd 变量 ⇒ 用 `git rev-parse HEAD`；`Remove-Item` 用 `-LiteralPath`；`Write` >600 行静默截断 ⇒ 分块写；追加章节后 `git diff --check` 会报 `new blank line at EOF` ⇒ 尾行不留空。
- 🔴 本地 `refs/remotes/origin/main` **无法落盘** ⇒ `git branch -vv` 的 `[origin/main: gone]` **不代表**远端异常；同步只看 `git rev-parse HEAD` + `git ls-remote origin refs/heads/main`。
- 🔴 CDP 截图 `clip` 是**页坐标**（需滚动元素截出空白条）⇒ `scrollIntoView` + 截整视口；`selectAttempt` **异步** ⇒ 等**工作台内容**变化。
- 🔴 本机无模型 API 凭据；Secret Scan 命中全为凭据禁用口径文档文本 + 假值 fixture（`sk-fixture-*`）。Spike 产物不入 `src/`。
- 🔴 `tsconfig.test.json` **无 DOM lib** 且不含 `src/ui/**` ⇒ **测试不能 import DOM-scope 文件**（`components/**`、`dom.ts`、`app-root.ts`）；要可测的逻辑**必须**放**框架中立**模块（如 `src/ui/settings/control-identity.ts`）。
- 🔴 `src/tests/domain/ac-reference-guard.test.ts` 硬门：**每个测试文件 + 每条 `it(...)` 标题**都必须含 `IMPLEMENTATION INVARIANT`（或 `AC-n`/`AC-Q06-n`）。
- 🔴 真实 DOM 交互验证（点击 / Escape / 逐字符输入）走 **CDP `Input.dispatchMouseEvent` + `Input.dispatchKeyEvent`**（真实输入管线，含 focus/caret）；清空字段用 `Ctrl+A`（`modifiers:2`）+ `Backspace`。断言「输入等于 X」前**必须先清空**，否则拿到旧值拼接的假 FAIL。喂 ES module 的静态服务器**必须**给 `.js` `Content-Type: text/javascript`。
- 🔴 冒烟**顺序**：`bootstrap.createGateway` 在**无工作区**时返回 `unsupported` ⇒ 点「保存配置」**必须排在「选择本地工作区」之后**；把它当 FAIL 是探针缺陷。探针里写 `out.shot_x.png = …` 抛 `Cannot set properties of undefined (setting 'png')` 同理属**笔误**。
- 🚩 跨 `Page.reload` 统计出站请求**要用 CDP `Network.requestWillBeSent`**（Node 侧累加 + `Page.frameNavigated` 分文档）；页面内计数器会被 `addScriptToEvaluateOnNewDocument` 重新注入而清零。会话级存储模型：**刷新 = 新 `Storage` 对象 + 同一份 backing**；**新 session = 新 backing**。

## 5. 当前状态（→ §C*）
- `S00-01`/`S00-02` = `CLOSED/CONFIRMED`（不得重开）｜`Gate B`/`Gate C` = `COMPLETE`｜契约 `v0.3`｜`FROZEN`｜`IMPLEMENTATION BASIS`｜`01`–`05` 仍 `PROPOSED`｜阶段 = `S01 / Implementation`。
- 已完成：`S01-01`…`S01-06B`｜`M7`（🔴 标识是 `M7`，不是 `S01-04`）｜`M8`｜`M9`｜`M15`｜`M16`｜`PRE-PSA-HARDENING-01`｜`GIT-RECOVERY-01`｜`REMOTE-BACKUP-01`｜`RECOVERY-POLISH-01`｜🆕 `PRE-PSA-BLOCKER-01` = `DONE`（HANDOFF §23）。
- 🆕 `PRE-PSA-BLOCKER-01`（PRE-SUBMISSION｜**PSA 阻断修复**）：设置可用性 —— ① 顶栏唯一入口「设置」（独立「模型设置」消失）② `modelSettings()` → `settingsCenter()`（「模型服务」section）③ 控件身份 = 显式常量 `SETTINGS_CONTROL_IDS`，**id 永不从 label 推导** ④ × / 取消 / `Escape` 只调 `closeSettings()` ⑤ 保存三结果**面板内**可见（新增瞬时 `settings_save_error`）⑥ DeepSeek = `deepseek-flash` + browser_direct + `thin_proxy:false` + 固定 `https://api.deepseek.com/chat/completions`。基线 `7011341`（= parent `d219601` 后仅删 1 个 `.docx`，**0 行源码**）。
  🔴 **根因**：`app-root.ts` **未授权分支 `return` 前从未 `restoreFocus`**（M1，用户实际遇到的「每敲一字就掉焦点」）；label 派生 id 是**潜在**重复 id 制造器（M2）——⚠️ 但实际发布的 label 是 ASCII，**当时并未相撞**，不得写「确实重复 id 导致掉焦点」。冒烟另发现并修掉一处**真实假文案**（`SETTINGS_BASE_URL_FORBIDDEN` 对浏览器直连的 DeepSeek 不成立）。
- 🆕 `PRE-PSA-BLOCKER-01 / CORRECTION-01`（PRE-SUBMISSION｜**文案与 `D-056` 对齐**｜HANDOFF §23.8）= `DONE`：核验实现 = **A（session-scoped `sessionStorage`，不是纯内存）** ⇒ 合法 correction，非 BLOCKER。唯一产品改动 = `SETTINGS_API_KEY_NOTE` → 「**仅当前浏览器会话使用；刷新后仍可用，关闭标签页或浏览器后需要重新填写。**」。新增 `src/tests/ui/session-credential-refresh.test.ts`（R1–R10）。
  🔴 **留待人工裁决（未修）**：`ADJACENT-01` 「清除本次会话的 API Key」只清表单字段、**不**调 `store.remove()`；`ADJACENT-02` 刷新后 Key 字段为空时仍显示「请填写 API Key」；`ADJACENT-03` `shell.ts` 顶部注释把 `M2` 写成症状原因（与已确认口径 + §23.7 禁写项冲突）。
- 工程事实：tests **1025/1025**（`PRE-PSA-BLOCKER-01` 后 1015，本轮 +10）｜`test:proxy` **15/15**｜typecheck ×5 + `build` + `build:web`（**144** modules）PASS｜Secret Scan 27 命中**全为假值** ⇒ 真实凭据 0｜真实浏览器冒烟（Chrome CDP，真实键鼠 + **真实 `Page.reload`**）全 PASS，**LLM endpoint 请求 = 0**。
- Git：原 `.git` 已确认丢失（原 DAG 不可恢复）；建 **recovery repository**，baseline `207902b326a43ad6cde7c20b8b722ffa957ad07c`（root-commit 无 parent）；`origin = Redthink233/failure-experience-incubator`（**PUBLIC**）；19 个 pre-loss hash 一律 `AUDIT REFERENCES ONLY`。最新产品 commit = `8c7cd2fa0ee3b339dd43a2c965ba0374e88e6c0d`（= remote `refs/heads/main`，`ls-remote` 实核）。
- `SAFE NEXT` = `PRE-SUBMISSION PSA-A｜Real Chrome + Real Workspace FSA + DeepSeek Browser Direct｜TE-DEMO-LIVE-01 Full Rehearsal｜Billing Cap ≤ RMB 1 → TE-DEMO-ZERO-01 零命中观察 → Vercel Preview → Submission Package`（🔴 **未授权自动启动**）。
- `AC` 口径 → §D（canonical 162 + `AC-Q06` 6 = **168**；`PSA-*` 全 `PENDING`，非产品 `AC`）。

## 6. 禁写清单（原文 → §C-* / §D / HANDOFF §23.7、§23.8）
🔴 `Vercel 已验证/已部署/Production Ready`｜`Local-first 已可行/已完成浏览器验收`｜`Chrome/Edge/FSA verified`｜`real provider verified`｜把 `PSA-*` 当 `AC`｜把 `SP-06` 历史改 `PASS`｜未授权新增 `Decision`/`AC`/`CCR`｜把未确认项写成 `CONFIRMED`｜改写历史文本。
🔴 各阶段追加项 → `DECISION_INDEX` §C-M9 §M9-5、§C-M15 §M15-6、§C-S0106 §S0106-7、§C-S0106B §S0106B-6、§C-M16 §M16-6、§C-PREPSA §PREPSA-7；另有 `GIT-RECOVERY-01`（不得写「原 Git history 已恢复」/旧 hash 属当前 repo）、`REMOTE-BACKUP-01`（不得写「Open Source Submission Complete」/改写 HANDOFF §20）、`RECOVERY-POLISH-01`（不得把静态检查写成 REAL 0-HIT VERIFIED；不得把 providerless 冒烟写成「真实浏览器人工验收已通过」；不得写 `-03` 已恢复）、`PRE-PSA-BLOCKER-01`（不得把 DeepSeek 候选配置写成「已验证/可用/CORS 已支持/Browser Direct 已通过」；不得把 `settings_save_error` 说成持久状态；🔴 **不得把 M2 写成「当时确实产生重复 id 并因此掉焦点」**——那是推断，已观测到的机制只有 M1）、`PRE-PSA-BLOCKER-01 / CORRECTION-01`（🔴 不得把本 correction 写成「实现与 `D-056` 冲突」——实测为 A；不得写「刷新后需要重新填写仍成立」；不得把 `ADJACENT-01/02/03` 写成已修）→ HANDOFF §23.8。
