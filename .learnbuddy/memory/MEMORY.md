# 项目长期记忆：失败经验孵化助手（钩子层）

> 细则 = `.learnbuddy/memory/DECISION_INDEX.md`（§A 决策｜§B 环境｜§C* 阶段现状｜§D 模块语义｜§E 工程硬约束｜§F 禁写清单）。
> 权威序：`docs/DECISIONS.md` > `docs/00–09`；过程 → `docs/CHANGELOG.md` + 日期日志；阶段集成 → `20_INTEGRATION/`。
> 🚩 2026-09-26 第七次压缩：只留钩子；原 §4 工程细则 → §E，原 §6 禁写全文 → §F。

## 1. 基本
粤港澳大湾区 AI Coding 创新大赛（LearnBuddy）｜赛题「失败经验累积及孵化助手」｜初赛 V1 截止 2026-09-26 23:59｜主链 `D9` 十步。

## 2. 协作规则
权威 = `docs/00_PROJECT_RULES.md`；人工决策项 / `CONFIRMED`·`PROPOSED`·`REJECTED`·`SUPERSEDED` / 事实-推断-建议分离 / 不改写历史只就地补注 / 成本与凭据硬规则 → §B、§E；跨项目规则 → `~/.learnbuddy/MEMORY.md`。

## 3. 决策编号（→ §A）
`D1`–`D10`｜`R1`–`R6`｜`D-011`–`D-048`｜`D-049`｜`D-050`（Level A `matched` = 严格语义重叠）｜`ADJ-01` = `CLOSED/DERIVED`｜`D-051`–`D-057`｜`D-058`–`D-062` = `TQ01`–`TQ05`（全 `CONFIRMED`）｜`PSA-D2` = 人工裁决（`PSA-*` 系列，**不在** `docs/DECISIONS.md` 的 `D-*` 编号内）：`B`｜无可用 Credential 时不得把模型服务保存为已配置。

## 4. 环境硬约束（🔴 细条 → §E）
- 🔴 `Bash` 含中文/引号必崩 ⇒ 命令走 **PowerShell**；stdout 不回显 ⇒ 重定向到 `$env:TEMP\<log>` 后 `Read`（多段写同一 log，**每行都要 `-Append`**）。
- 🔴 沙箱**禁止写工作区**（`dist/**` 报 `EPERM`）⇒ `build`/`test`/`demo:*` 先试、`EPERM` 再提权；`typecheck`、`Write`/`Edit`、`git add|commit|push` 未受限。PowerShell 里 `tsc` 裸命令静默失效 ⇒ `node node_modules/typescript/bin/tsc`。
- 🔴 `typecheck`/`test` **不含** `src/ui/components/**`（DOM scope）⇒ 回归跑满 5 个 typecheck；`tsconfig.test.json` 无 DOM lib ⇒ 测试**不得** import DOM-scope 文件，可测逻辑必须放框架中立模块。
- 🔴 `src/tests/domain/ac-reference-guard.test.ts` 硬门：**每个测试文件 + 每条 `it(...)` 标题**都必须含 `IMPLEMENTATION INVARIANT`（或 `AC-n` / `AC-Q06-n`）。
- 🔴 真实 DOM 交互走 **CDP `Input.dispatchMouseEvent` + `Input.dispatchKeyEvent`**；清空字段用 `Ctrl+A`(`modifiers:2`)+`Backspace`；断言「输入等于 X」前必须**先清空**。截图 `clip` 是页坐标 ⇒ `scrollIntoView` + 截整视口。喂 ES module 的静态服务器必须给 `.js` `Content-Type: text/javascript`。
- 🔴 冒烟顺序：无工作区时 `createGateway` 返回 `unsupported` ⇒「保存配置」必须排在「选择本地工作区」之后。
- 🚩 跨 `Page.reload` 统计出站请求用 CDP `Network.requestWillBeSent`（Node 侧累加 + `Page.frameNavigated` 分文档）；刷新 = 新 `Storage` + 同一 backing；新 session = 新 backing。
- 🔴 `sessionStorage` 的 `…/credential/index` 记账键**永远在**（`remove()` 后变 `"[]"`）⇒ 判「凭据已清除」看「**无 `…/provider` slot** + index == `"[]"`」。
- 🔴 零散：`fs.cpSync` 源路径含中文让 Node 崩 ⇒ 逐文件复制；命令里 `%` 判为 cmd 变量 ⇒ 用 `git rev-parse HEAD`；`Remove-Item` 用 `-LiteralPath`；`Write` >600 行静默截断 ⇒ 分块写；尾行不留空。
- 🔴 本地 `refs/remotes/origin/main` 无法落盘 ⇒ `[origin/main: gone]` **不代表**远端异常；同步只看 `git rev-parse HEAD` + `git ls-remote origin refs/heads/main`。
- 🔴 本机无模型 API 凭据；Secret Scan 命中全为凭据禁用口径文档文本 + 假值 fixture（`sk-fixture-*`）。Spike 产物不入 `src/`。

## 5. 当前状态（→ §C*）
- `S00-01`/`S00-02` = `CLOSED/CONFIRMED`（不得重开）｜`Gate B`/`Gate C` = `COMPLETE`｜契约 `v0.3`｜`FROZEN`｜`IMPLEMENTATION BASIS`｜`01`–`05` 仍 `PROPOSED`｜阶段 = `S01 / Implementation`。
- 已完成：`S01-01`…`S01-06B`｜`M7`（🔴 标识是 `M7`，不是 `S01-04`）｜`M8`｜`M9`｜`M15`｜`M16`｜`PRE-PSA-HARDENING-01`｜`GIT-RECOVERY-01`｜`REMOTE-BACKUP-01`｜`RECOVERY-POLISH-01`｜`PRE-PSA-BLOCKER-01` = **`CLOSED`**（含 `CORRECTION-01/02/03`；细则 → §C-PREPSA + HANDOFF §23）。
- 🚩 `PRE-PSA-BLOCKER-01` 要点（细则 → §C-PREPSA、HANDOFF §23.7–§23.10）：顶栏唯一入口「设置」→ `settingsCenter()`；控件身份 = 常量 `SETTINGS_CONTROL_IDS`（**id 永不从 label 推导**）；`PSA-D2 = B` **保存门**：无可用 Credential 拒绝保存；`clearCredential()` 真删除；刷新后已有 Key 显示 `SETTINGS_KEY_PRESENT_IN_SESSION`（**不回填明文**）。🔴 已观测根因**只有 M1**（early-return 跳过 `restoreFocus`）；M2 = preventive hardening，**不得**写成「当时确实重复 id 导致掉焦点」。`ADJACENT-04` 留待人工裁决（**未修**）。
- 工程事实：tests **1053/1053**｜`test:proxy` **15/15**｜typecheck ×5 + `build` + `build:web`（144 modules）PASS｜Secret Scan 556 文件 / 40 命中 ⇒ 真实凭据 0｜真实浏览器冒烟（Chrome CDP，真实键鼠 + 真实 `Page.reload`）全 PASS，**LLM endpoint 请求 = 0**。
- Git：原 `.git` 已确认丢失、原 DAG 不可恢复 ⇒ recovery repository，baseline `207902b326a43ad6cde7c20b8b722ffa957ad07c`（root-commit 无 parent）；`origin = Redthink233/failure-experience-incubator`（PUBLIC）；19 个 pre-loss hash = `AUDIT REFERENCES ONLY`。最新产品 commit = `7ce1b852a61b26f4dd5bc630f605a486a4dc8353`（= remote main，`ls-remote` 实核）。
- `AC` 口径 → §D（canonical 162 + `AC-Q06` 6 = **168**；`PSA-*` 全 `PENDING`，**非产品 `AC`**）。

## 6. 禁写清单（全文 → §F）
🔴 `Vercel 已验证/已部署/Production Ready`｜`Local-first 已可行/已完成浏览器验收`｜`Chrome/Edge/FSA verified`｜`real provider verified`｜把 `PSA-*` 当 `AC`｜把 `SP-06` 历史改 `PASS`｜未授权新增 `Decision`/`AC`/`CCR`｜把未确认项写成 `CONFIRMED`｜改写历史文本｜各阶段追加项与 `GIT-RECOVERY-01`/`REMOTE-BACKUP-01`/`RECOVERY-POLISH-01`/`PRE-PSA-BLOCKER-01` 系列禁写 → **§F**。
