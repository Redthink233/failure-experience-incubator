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

## 5. 当前状态（→ §C*）
- `S00-01`/`S00-02` = `CLOSED/CONFIRMED`（不得重开）｜`Gate B`/`Gate C` = `COMPLETE`｜契约 `v0.3`｜`FROZEN`｜`IMPLEMENTATION BASIS`｜`01`–`05` 仍 `PROPOSED`｜阶段 = `S01 / Implementation`。
- 已完成：`S01-01`…`S01-06B`｜`M7`（🔴 标识是 `M7`，不是 `S01-04`）｜`M8`｜`M9`｜`M15`｜`M16`｜`PRE-PSA-HARDENING-01`｜`GIT-RECOVERY-01`｜`REMOTE-BACKUP-01`｜🆕 `RECOVERY-POLISH-01` = `DONE`（HANDOFF §22）。
- 🆕 `RECOVERY-POLISH-01`（PRE-SUBMISSION｜Final Product Polish）：A `DEMO-08` 跨领域文案收口（`condition` 仍 `null`）；B `Fact` 来源标签三态 = Demo「示例记录」/ Live 默认「你提供的信息」/ **仅真实 edit evidence**（③ 会话内编辑缓冲）才「你修改过」——🔴 **未改 `source_type`**、未新增领域字段；C 注册**真 Level A 0-hit** `PSA` 输入 `TE-DEMO-ZERO-01`（**未进 seed**；静态 32 对无确定性 `matched`；🔴 **未声称** REAL 0-HIT VERIFIED）。基线 `a273135`。`Decision Added = 0`｜`AC Added = 0`｜`CCR = NO`｜`BLOCKER = NO`。
- 工程事实：tests **970/970**（任务前 947）｜`test:proxy` **15/15**｜typecheck ×5 + `build` + `build:web` PASS｜`demo:status` = identity proven / 8 条｜`demo-workspace/**` = 21 文件（本轮仅 DEMO-08 的 2 文件 digest 变化）。
- Git：原 `.git` 已确认丢失（原 DAG 不可恢复）；建 **recovery repository**，baseline `207902b326a43ad6cde7c20b8b722ffa957ad07c`（root-commit 无 parent）；`origin = Redthink233/failure-experience-incubator`（**PUBLIC**）；19 个 pre-loss hash 一律 `AUDIT REFERENCES ONLY`。
- `SAFE NEXT` = `PRE-SUBMISSION PSA（真实浏览器 + 真实 Provider）→ TE-DEMO-LIVE-01 彩排 → TE-DEMO-ZERO-01 零命中观察 → Vercel Preview → Submission Package`（🔴 **未授权自动启动**）。
- `AC` 口径 → §D（canonical 162 + `AC-Q06` 6 = **168**；`PSA-*` 全 `PENDING`，非产品 `AC`）。

## 6. 禁写清单（原文 → §C-* / §D / HANDOFF §22.7）
🔴 `Vercel 已验证/已部署/Production Ready`｜`Local-first 已可行/已完成浏览器验收`｜`Chrome/Edge/FSA verified`｜`real provider verified`｜把 `PSA-*` 当 `AC`｜把 `SP-06` 历史改 `PASS`｜未授权新增 `Decision`/`AC`/`CCR`｜把未确认项写成 `CONFIRMED`｜改写历史文本。
🔴 各阶段追加项 → `DECISION_INDEX` §C-M9 §M9-5、§C-M15 §M15-6、§C-S0106 §S0106-7、§C-S0106B §S0106B-6、§C-M16 §M16-6、§C-PREPSA §PREPSA-7；另有 `GIT-RECOVERY-01`（不得写「原 Git history 已恢复」/旧 hash 属当前 repo）、`REMOTE-BACKUP-01`（不得写「Open Source Submission Complete」/改写 HANDOFF §20）、`RECOVERY-POLISH-01`（不得把静态检查写成 REAL 0-HIT VERIFIED；不得把 providerless 冒烟写成「真实浏览器人工验收已通过」；不得写 `-03` 已恢复）。
