# Git Repository Recovery Manifest

```
文档 ID        : GIT_RECOVERY_MANIFEST
产出任务        : GIT-RECOVERY-01｜Repository Metadata Loss Recovery
阶段            : PRE-SUBMISSION
撰写时点        : 2026-09-26（RECOVERY BASELINE 提交前）
性质            : REPOSITORY RECOVERY RECORD
                  🔴 不是 Decision、不是 CCR、不新增 AC、CCR = NO、
                     不改 Frozen Contract 语义、不改 docs/DECISIONS.md、不改任何产品语义、
                     不改任何过去任务已产生的 DONE / ACCEPTED 结论。
权威序          : docs/DECISIONS.md > docs/00–09
                  > docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md（FROZEN）
                  > 20_INTEGRATION/CODING_START_HANDOFF.md > 本文件
```

> **本文件的作用**：在新 repository 中**如实登记**原 `.git` 元数据丢失这一事实，
> 冻结 recovery policy，并把**原历史 hash 降级为审计引用**，使新旧来源可区分、可追溯。
> **本文件不做**：不重建历史、不伪造 hash、不声称原 Git 历史已恢复、不改写任何过去结论。

---

## 1. Incident

```
日期 : 2026-09-26
```

**事件**：

原 `.git` metadata 在 `PRE-PSA-HARDENING-01` 开发过程中**不可见**，并**最终确认丢失**。

- `PRE-PSA-HARDENING-01` 会话开始时 `git log -1` 仍返回 `d885ab4`；会话中途 `git rev-parse HEAD` /
  `git log` 开始返回 `fatal: not a git repository (or any of the parent directories): .git`，
  `Test-Path <repo>\.git` = `False`（见 `CODING_START_HANDOFF.md` §18.7）。
- 已**人工检查**以下来源，均**无**任何可恢复的原 `.git`：

```
1. 当前项目目录
2. 父目录递归搜索
3. `.git` 文件与目录
4. 回收站
5. Windows 以前版本
6. 可用备份来源
```

- 原 source tree 与 LearnBuddy project records **仍保留**（未因本次事故受损）。

**无法恢复**：

```
原 Git object database
refs
index
reflog
commit graph
```

**因此**：

🔴 **原 Git DAG 已丢失。**
🔴 **原 commit hashes 不能存在于新的 repository history 中。**

---

## 2. Recovery Policy

🔴 **不伪造历史。**
🔴 **不伪造 commit hash。**
🔴 **不伪造时间**（不使用 `commit-tree`/`GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE` 人工制作旧提交）。
🔴 **不声称原 Git history 已恢复。**
🔴 **不声称旧 hash 存在于当前 repository。**

**以当前经过完整测试的源码建立新的 recovery baseline。**

以以下材料作为原开发过程的**辅助审计依据**（🔴 它们是**记录**，不是 Git 对象）：

```
LearnBuddy execution history（.learnbuddy/memory/**）
+ CODING_START_HANDOFF（20_INTEGRATION/CODING_START_HANDOFF.md）
+ Memory logs
```

---

## 3. New Repository State（🔴 实测，非声明）

```
git version                : 2.52.0.windows.1
git rev-parse --is-inside-work-tree : true
branch                     : main（.git/HEAD = ref: refs/heads/main）
commit 数                  : 0（git log → fatal: your current branch 'main' does not have any commits yet）
.git/index                 : ABSENT（从未 add 过）
.git/logs（reflog）        : ABSENT
.git/packed-refs           : ABSENT
.git/refs/heads · refs/tags: 空
.git/objects/              : 仅 info/ 与 pack/，**0 个对象**
remote                     : 无（git remote -v 为空）
提交身份（仓库本地配置）    : Red23 <229438394+Redthink233@users.noreply.github.com>（无 global 身份）
```

🔴 结论：当前 `.git` 是一个**不含任何对象的全新 repository**。
**不得**把它描述成原 repo；它**不是**原 repo 的续写，而是**新建立的 recovery repository**。

### 3.1 旧 hash 在当前仓库中不可解析（🔴 实测）

对 §4 全部 19 个缩写 hash 执行 `git cat-file -t <hash>`：

```
089913c / d5da4d6 / b191243 / 5aade91 / 786800f / 34e9185 / 84098d3 / 6c9442f /
1c554fb / 602120a / d000a66 / b1a492d / 896ebbb / 3696d7d / 9c41624 / aa8e89f /
9e710d3 / a1ff737 / d885ab4
⇒ 全部返回  fatal: Not a valid object name <hash>
```

对 3 个已知完整 40 位 hash 执行同一命令：

```
3696d7d1966edf1f2b5b1ca12b59abd4ba609c5a ⇒ fatal: git cat-file: could not get object info
9c41624fbd14416a427350371500e7bb729ca71a ⇒ fatal: git cat-file: could not get object info
d885ab49cd7ef283eb16882de08e193587195bb1 ⇒ fatal: git cat-file: could not get object info
```

⇒ 旧 hash 在新 repository 中**不存在**，**无法**用作 parent / 引用 / 校验目标。

---

## 4. Pre-loss Historical References

> 🔴 **以下 hash 不是当前 repo 的 commits，也不存在于当前 repo 的 object database。**
> 🔴 **来源 = pre-loss project reports / handoff records**（`20_INTEGRATION/CODING_START_HANDOFF.md`
> 及 `.learnbuddy/memory/**` 的既有记录），**不是**从任何 Git 对象读出。
> 🔴 **不得声称本列表必然包含历史中的所有 commit** —— 它只是既有记录中出现过的 hash 集合。

```
PRE-LOSS HISTORICAL REFERENCES
（= AUDIT REFERENCES ONLY / 🔴 NOT PRESENT IN THE CURRENT REPOSITORY）
```

| # | Hash（记录形式） | 记录中的描述 | 来源 |
|---|---|---|---|
| 1 | `089913c` | Gate C / S01 foundation baseline | pre-loss 记录 |
| 2 | `d5da4d6` | feat: integrate Wave-1 workspace and provider foundations | pre-loss 记录 |
| 3 | `b191243` | S01-05 integration | pre-loss 记录 |
| 4 | `5aade91` | S01-05B | pre-loss 记录 |
| 5 | `786800f` | fix: remove residual position-based content item ids | pre-loss 记录 |
| 6 | `34e9185` | S01-03 retrieval/comparator | pre-loss 记录 |
| 7 | `84098d3` | feat: build traceable grounding context | pre-loss 记录 |
| 8 | `6c9442f` | fix: label the work as M7, not S01-04 | pre-loss 记录 |
| 9 | `1c554fb` | test: name the grounding-criteria AC | pre-loss 记录 |
| 10 | `602120a` | M7 landing state | pre-loss 记录 |
| 11 | `d000a66` | fix: align shared citation count with distinct evidence targets | pre-loss 记录 |
| 12 | `b1a492d` | feat: implement candidate insight generation | pre-loss 记录 |
| 13 | `896ebbb` | feat: implement traceable hypothesis generation | pre-loss 记录 |
| 14 | `3696d7d` | feat: orchestrate the D9 workflow end to end | pre-loss 记录（完整形见下） |
| 15 | `9c41624` | chore: land M15 and harden hypothesis operation id codec | pre-loss 记录（完整形见下） |
| 16 | `aa8e89f` | feat: integrate the D9 browser workbench | pre-loss 记录 |
| 17 | `9e710d3` | fix: let the workspace entry span the shell before authorization | pre-loss 记录 |
| 18 | `a1ff737` | fix: decouple workspace browsing from model configuration | pre-loss 记录 |
| 19 | `d885ab4` | feat: add the eight-record demo workspace baseline | pre-loss 记录（完整形见下） |

**在 handoff 记录中留有完整 40 位形式的（§15.1 / §16.1 / §18.1 逐字引用）**：

```
3696d7d1966edf1f2b5b1ca12b59abd4ba609c5a   ← §15.1「Git baseline」
9c41624fbd14416a427350371500e7bb729ca71a   ← §16.1「Git Baseline（本轮实际起点）」
d885ab49cd7ef283eb16882de08e193587195bb1   ← §18.1「Git HEAD（开工实跑）」
```

🔴 其余 16 项在既有记录中仅为**缩写形式**；本文件**不补全、不推测**其完整 hash。

### 4.1 用途边界（🔴 逐项）

| 允许 | 禁止 |
|---|---|
| 作为**人类可读的审计引用**，说明原开发过程的时间线顺序 | 作为当前 repo 的 parent / base / merge 目标 |
| 在报告中标注「该状态的源码等同/接近哪个阶段」 | 声称 `git show <hash>` / `git log <hash>` 在当前 repo 中可用 |
| 与 `.learnbuddy/memory/**` 的日期日志互相印证 | 写入任何 `.git/` 内部文件（refs / packed-refs / replace / grafts） |

---

## 5. PRE-PSA-HARDENING-01

该任务在 `.git` 丢失前后**已经完成产品修改和完整回归**：

```
Formal Historical Step Focus      PASS
Formal Step-2 Current             NO
Formal Follow-up CTA              ABSENT
Never-run Retrieval               PASS
Runtime Failure State Preserved   PASS
N=0 State Preserved               PASS
Providerless Formal Browse        PASS
DEMO-05 Cross-domain Copy         PASS
DEMO-06 Cross-domain Copy         PASS
K.5 -03 Conflict                  CLOSED / RETIRED
Visual Smoke                      PASS
Real Provider Calls               0
```

**回归（该任务报告口径）**：

```
Main Tests : 947 / 0
Proxy      : 15 / 0
```

**但是**：

🔴 原计划 commit：

```
fix: harden the historical demo view before PSA
```

**没有产生**。原因：**`.git` metadata loss**（`HANDOFF §18.7`：`Commit 未执行`）。

**这些修改现在包含于：**

```
RECOVERY BASELINE
```

即：`PRE-PSA-HARDENING-01` 的全部产品修改（`src/ui/**` · `src/demo/demo-baseline-definition.ts` ·
`demo-workspace/**` 重生成 · `src/tests/ui/**` 新增用例 · `docs/architecture/05_TEST_DEMO_DEPLOY.md` §K.5 `-03` RETIRED 更正）
**不再有自己的 commit**，而是随本次 recovery baseline 一并**首次**进入版本库。

🔴 **这不改变 `PRE-PSA-HARDENING-01` 的 `DONE` 状态**，也**不改变**其报告中的任何测试结论 ——
只说明「哪一次 commit 承载了它」。

---

## 6. 本次 Recovery Baseline 的验收口径（🔴 实测，非声明）

在创建 recovery baseline 之前，对**当前工作树**执行完整回归（结果见 §9 / `CODING_START_HANDOFF.md` §19）：

```
npm run typecheck / typecheck:core / typecheck:browser / typecheck:server / typecheck:web
npm run build
npm run build:web
npm test
npm run test:proxy
```

`npm test` 的 947 与 `test:proxy` 的 15 **与 `PRE-PSA-HARDENING-01` 报告的数字一致**
⇒ 工作树内容与该任务完成时**自洽**（🔴 这是**一致性证据**，**不是**「源码逐字节等同某个旧 commit」的证明 ——
旧 commit 的树对象已不可读取，无法做该比对）。

---

## 7. RECOVERY-POLISH-01（🔴 已知剩余小项 / 非阻塞）

> 状态：`REGISTERED / NOT STARTED`。🔴 本任务**不修**（见 §10 不执行清单）。

| # | 项 | 现状 | 目标 | 边界 |
|---|---|---|---|---|
| **A** | `DEMO-08` 仍存在跨领域文案：「干燥温度不适用、没有记录」 | **未改** | PSA 前改为中性表述：「当时没有额外记录其它条件」 | 结构化 `condition` **仍为 unknown** |
| **B** | Demo seed 的 `Fact` 当前 UI 来源 copy 可能显示「你修改过」 | **未改** | 收敛为三种口径：Demo data →「示例记录」；Live user Fact →「你提供的信息」；真正当前用户修改 →「你修改过」 | 🔴 **不得修改 `source_type`** |
| **C** | `K.5 -03` 已 `RETIRED`，可用的「预期 0 hit」输入缺失 | **未补** | 新增一个**真正 Level A 0-hit** 的 PSA 测试输入 | 🔴 **不得修改 `DEMO-01..08` Retrieval rules** |

🔴 `A` 与 `PRE-PSA-HARDENING-01` §18.2 的 `DEMO-05` / `DEMO-06` 修复**同类**，但该任务书只点名 `DEMO-05` / `DEMO-06`
⇒ 当时**不擅自扩大范围**；现以 `RECOVERY-POLISH-01` 单独登记。

---

## 8. 显式禁止（🔴 本 Manifest 与本次恢复的硬边界）

禁止：

```
伪造原 commit objects
使用 commit-tree 人工制作旧提交
伪造作者日期
伪造提交日期
声称原 Git history 已恢复
声称旧 hash 存在于当前 repository
删除 LearnBuddy logs
删除 handoff
覆盖当前源码
```

🔴 **必须明确**：**原 Git DAG 已丢失。**

🔴 **本任务不执行**：开始 PSA ｜ 输入 API Key ｜ 调用真实 Provider ｜ 部署 Vercel ｜
UI 功能开发 ｜ 重写 Demo ｜ 修 `RECOVERY-POLISH-01` ｜ push remote。

---

## 9. .gitignore 审计 + Secret Scan

### 9.1 .gitignore Audit（🔴 首次 add 前执行）

审计后确认**至少**不会提交：

| 类别 | 规则 | 命中证据（`git check-ignore -v`） |
|---|---|---|
| 依赖 | `node_modules/` | `.gitignore:6` |
| 构建产物 | `dist/` | `.gitignore:9` |
| 构建产物 | `dist-test/` | `.gitignore:10` |
| 构建产物 | `dist-proxy-test/` | `.gitignore:11` |
| Web 构建产物 | `dist-web/` | `.gitignore:17` |
| 环境文件 | `.env` / `.env.*`（保留 `!.env.example`） | — |
| **凭据 / 密钥** | `*.pem` `*.key` `*.pfx` `*.p12` `*.jks` `*.keystore` `id_rsa` `id_ed25519` `credentials.json` `secrets.json` `.npmrc` | 🚩 本次**新增** |
| **临时浏览器 profile** | `.chrome-profile/` `.chromium-profile/` `.browser-profile/` `.cdp-profile/` `chrome-profile/` `chromium-profile/` `browser-profile/` `user-data-dir/` | 🚩 本次**新增** |
| **临时 smoke 证据** | `/smoke-evidence/` `/tmp-smoke/` `/smoke-results/` | 🚩 本次**新增** |
| 日志 / 系统垃圾 | `*.log` `.DS_Store` `Thumbs.db` · `desktop.ini` `ehthumbs.db` `$RECYCLE.BIN/` `*.tmp` `*.bak` `*.swp` `*~` `~$*` | 🚩 后 8 项本次**新增** |

**负向对照（🔴 必须保持不被忽略）**——实测结果：

```
demo-workspace/workspace.json                                → not ignored ✅
30_SPIKES/local_first/SP-06/results/raw-results.json         → not ignored ✅
30_SPIKES/local_first/SP-06/screenshots/chrome-probe.png     → not ignored ✅
docs/DECISIONS.md                                            → not ignored ✅
.learnbuddy/memory/2026-09-26.md                             → not ignored ✅
20_INTEGRATION/CODING_START_HANDOFF.md                       → not ignored ✅
```

🔴 **`30_SPIKES/**` 下的 `results/` · `screenshots/` 是 SP-06 等 Spike 的审计产物**
（被 `SP-06_EXECUTION_REPORT.md` 引用）⇒ **必须提交**，因此 `.gitignore` **不得**加入全局
`results/` 或 `screenshots/` 规则（已在 `.gitignore` 内就地注明）。

`git status --ignored --short` 实测：被忽略的条目**仅**为
`dist/` · `dist-test/` · `dist-proxy-test/` · `dist-web/` · `node_modules/` ⇒ 与上表一致。

### 9.2 Secret Scan（仓库源码扫描）

| 模式 | 结果 |
|---|---|
| `sk-*` / `AKIA*` / `AIza*` / `ghp_*` / `github_pat_*` / `xox[bpoas]-*` / `hvs.*` | 命中项**全部**为显式假值 fixture：`sk-fixture-NOT-A-REAL-KEY-0000000000` · `sk-fixture-OTHER-0000000000` · `sk-fixture-A-0000000000` · `sk-fixture-B-0000000000` · `sk-fixture-000000000000000000` ⇒ **非真实凭据** |
| `SecretId` / `SecretKey` / `secret_id` / `secret_key` / `access_key_id` / `private_key` | 命中项全部为**禁用口径文档文本**（如「不索取主账号密码 / 长期 `SecretId` / `SecretKey`」「🔴 **禁止存入本账本**」）+ `node_modules/@types/node/crypto.d.ts` 的类型声明 ⇒ **无任何真实值** |
| `Bearer <token>`（≥20 字符） | **0 命中** |
| `-----BEGIN ... PRIVATE KEY` | **0 命中** |
| 私钥 / 凭据文件名（`*.pem` `*.key` `*.pfx` `*.p12` `id_rsa` `id_ed25519` `credentials.json` `secrets.json` `.env*`） | **0 个文件** |

⇒ **Secret Scan = PASS**（无 BLOCKER）。

### 9.3 `git diff --cached --check`（staged 审计）

```
Conflict markers（<<<<<<< / ======= / >>>>>>>）  : 0 命中
空白类告警                                        : 19 条
  - 「new blank line at EOF」                     : 18 条
  - 「trailing whitespace」                       : 1 条
    （20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md:1270）
```

🔴 **判定 = `NON-BLOCKING / PRE-EXISTING`**：19 条**全部**位于**既有历史记录文件**
（`.learnbuddy/memory/**` · `20_INTEGRATION/**` · `docs/**` · `30_SPIKES/**`），
**不是本次新增文件引入**，也**不含任何冲突标记**。

🔴 **处置 = 不改动**：这些是**历史文本**（含一处 2026-09-24 的人工裁决原文）。
按项目硬规则「**不得改写历史文本（只允许就地补注）**」，🔴 **不为其做空白规范化**
—— 空白清理会改写既有记录文件的字节内容。仅**登记**，留待人工决定。

---

## 10. 当前产品状态（🔴 本 Manifest 的权威口径）

```
M15                       = DONE
S01-06                    = DONE
S01-06B                   = DONE
M16                       = DONE
PRE-PSA-HARDENING-01      = DONE
PSA                       = PENDING
Real Provider             = NOT EXECUTED
Vercel                    = NOT DEPLOYED
Production Ready          = NOT CLAIMED
```

🔴 **持续禁写**（不变）：「Vercel 已验证 / 已部署 / Production Ready」｜「Local-first 已可行 / 已完成浏览器验收」｜
「Chrome / Edge / FSA verified」｜「real provider verified」；🔴 不得把 `PSA-*` 当产品 `AC`；
🔴 不得把本地 smoke 写成「真实浏览器人工验收已通过」。

---

## 11. Recovery Baseline Commit

```
message : chore: establish recovered repository baseline
parent  : 无（新 repository 的第一个 commit）
```

- 🔴 **不使用** `d885ab4`（或任何 pre-loss hash）作为 parent 或 hash。
- 🔴 该 commit 是**新 repository 的第一个真实 baseline**，也是 `PRE-PSA-HARDENING-01`
  全部未提交修改的**首次入库**点。
- 提交 hash 为**提交后取证结果**，登记于 `.learnbuddy/memory/2026-09-26.md`（`GIT-RECOVERY-01` 节）——
  该节为 `LOG-ONLY` 追加记录，也是 `CODING_START_HANDOFF.md` §19.6 指定的回填点。
  🔴 **本文件在提交前撰写**，故**不嵌入任何未经取证推算出的 hash**（避免写入错误值）。

---

## 12. 引用

```
20_INTEGRATION/CODING_START_HANDOFF.md      §18.7（原事件登记）· §19（Git Recovery Incident）
20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md   PSA 全清单（仍 PENDING）
docs/DECISIONS.md                          产品决策权威序首位
.learnbuddy/memory/2026-09-26.md           GIT-RECOVERY-01 执行日志
```

> 🔴 **一句话结论**：**原 Git DAG 已丢失，原 commit hashes 不可恢复；**
> **本仓库是新建的 recovery repository，历史从 `chore: establish recovered repository baseline` 开始；**
> **§4 的 19 个 hash 仅为审计引用，不是当前 repo 的 commits。**
