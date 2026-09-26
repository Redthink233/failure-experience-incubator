# 细则索引（`MEMORY.md` 附件）

> **拆分说明（2026-09-19）**：原 `MEMORY.md` 超出注入上限被截断，故把「细则层」原样移入本文件，`MEMORY.md` 只保留钩子与速查。**两文件同源**；权威仍以 `docs/DECISIONS.md` 与 `docs/00–09` 为准，本文件不得复述完整规则文本。

## A. 决策细则（按编号空间）

- **`D1`–`D10` / `R1`–`R6`（S00-01）**：D1 用户 = 高校科研 / 创新项目个人执行者｜D2 最小单位 `Attempt`｜D3 个人工作空间｜D4 入口心智「刚刚哪里没有达到你的预期？」｜D5 唯一孵化能力 `E4 待验证假设生成`（8 项）｜D6 核心 Attempt 四要素不得自动删除｜D7 `Fact`/`Extraction`/`Inference` 三层、跨记录新判断统一 `Candidate Insight`｜D8 Demo = 预置 5~10 条 + 现场新增 1 条须标「Demo」｜D9 十步唯一验收口径｜D10 结果状态 `Failed/Partial/Success/Unknown`｜R1 不做失败价值排行｜R2 经验可能失效｜R3 不绑图数据库｜R4 竞品 `TO_VALIDATE`｜R5 不用"全新品类"｜R6 闭环优先
- **`D-011`–`D-015`（S00-02 第一批）**：NL 录入 + AI 结构化确认（**表单不得作第一入口**）｜`Draft`/`Formal` 两级｜`Inference` 二分（展示型 / 决策型·持久化）｜`Insight`(candidate/accepted/rejected)；`Experience Asset` = accepted Insight 的**产品视图**，非独立对象
- **`D-016`–`D-026`（第二批）**：🚩 追问预算 = **`max-3-key-questions-total`（问题总数 ≤3，非轮次；禁在一问里打包多个缺口）**，旧 `max-3-rounds` = `SUPERSEDED`｜P1 = 目标 / 实际尝试 / 实际结果（P1 未建立 → 保持 `Draft`）｜**Level A（目标 / 方案·技术对象 / 条件 / 结果·现象）唯一判"是否相关"**，Level B 只解释，Level C 时间仅辅助排序｜**不显示任何数字相似度**｜「未知 / 未提供」不参与相关性且标"该维度未比对"｜晋升 `E1`–`E5`｜`Candidate Insight` 只在 ⑧ 生成｜保存门槛 ≠ 晋升门槛
- **`D-027`–`D-038`（第三批）**：⑧ 只生成 `Candidate Insight`；⑨ 生成 `History-grounded Hypothesis` / `Model Suggestion`，**一律不得称 Candidate Insight**，均为决策型 `Inference`｜8 项 1:1 对齐 D5；禁 "Hypothesis Card"｜数量 **1–2 条自适应**（禁 ≥3、禁凑数）｜`N_检索 = 0` 不得生成 grounded｜grounding 硬条件 G1–G4 / N1–N6，**仅 `Fact` 引用可承担 grounding**，不设"部分锚定"｜分区仅【历史证据】【模型先验】｜冷启动 = 能力门控 + 入口可见但标注 + 可选补录｜`N_检索` 三档 = 结构可及性、`N_引用` = 界面显示与 ⑩ 追溯｜**合法数字仅三类**｜`E2`/`E3` 不满足 → 保持 `candidate` + 三段式｜0 条出口 A/B/C 各须独立验收点
- **`D-039`–`D-048`（第四批）**（映射 Q12→039、新-2→040、新-7→041、新-10→042、Q31→043、Q04→044、Q29→045、Q14→046、Q27→047、Q28→048）｜**`Q16` 不占号**（规则源 `D-019` Level C，验收 `AC-21`）；**禁止 `D-049 = Q16`**｜039 允许撤销接受 `accepted→candidate`，用户只决定 `E5`｜040 内容性字段修改 → 退回 `candidate` + 重检 `E1`–`E4`，只留事件日志｜041 Hypothesis 永不直接成为 Experience Asset｜042 `Model Suggestion` **保存 ≠ 接受**，永不 grounding｜043 只归档不删除｜044 L4 = 恰 4 项｜045 首次自动检索 = `Formal Attempt` 保存成功（唯一自动触发），后续用户显式「重新检索」，默认范围 = 全部历史｜046 主对照默认 3 条 + 不足展示实际 + 展开可达 + 不截断 `N_检索`｜047 第 ① 步唯一门槛 = 非空非纯空白；`GATE`/`RUNTIME`/`ACCEPTANCE` 三层分离｜048 ④ 候选原因允许 0 条、不设上限
- **`D-049`（S00-03，`CONFIRMED`）｜`Hypothesis` V1 编辑边界**：①②③④⑤ **只读**（③ 引用关系由系统 / `EvidenceRef` 管理）｜⑥⑦⑧ 允许用户自行提供 / 替换 / 补充 → 分列为「用户 `Fact` 条目」与「AI `Inference` 条目」，**不得就地改写 AI 条目**｜不建内容修改状态机 / 不回退 `undecided` / 无版本历史 / 无修改事件日志 / 无新状态枚举｜裁决位仅 `undecided`/`accepted`/`rejected`｜改变 ①②④⑤ 唯一路径 = 改 `Formal Attempt` → 显式重新检索 / 重新生成｜验收 `AC-101`–`AC-106`
- **`D-050`（S00-03，`CONFIRMED`，2026-09-19，来源 `SP-03`）｜Level A 维度 `matched` 的严格语义重叠判据**：**仅当两侧表达「相同的实质内容」或「语义等价的改写」时才允许 `matched`**（允许形式 = 同义改写 / 表述顺序不同但实质相同 / 单位等价表达 / 不改变实质含义的语言改写）｜**"同类别 / 同主题 / 同参数类型 / 同指标名 / 同一种现象 / 同一种技术大类"本身不充分**｜反例：`50°C` vs `70°C`、开裂 vs 无开裂、降低颜色变化 vs 缩短干燥时间、含水率偏高 vs 达标 = `compared_not_matched`；正例：`50°C` vs `50 摄氏度`、"避免虚假引用" vs "不引用不存在的记录" = `matched`｜`unknown` 规则不变（任一侧 unknown → `uncompared`；双方 unknown 仍不得 `matched`）｜**主要放弃 = 宽松类别重叠（读法 β）**｜🚩 **射程：只定义"单个维度何时叫 `matched`"；`matched_level_a_dimensions` 非空 → `related` 仍属 `S03-D` / Integrator 收敛项**｜**不得新增** ≥2 维度门槛 / 「必须命中 `goal`」/ 权重 / `similarity score` / `confidence` / `rank score` / 百分比 / 等级｜验收 `AC-109`–`AC-115`
- **✅ `ADJ-01` = `CLOSED / DERIVED`（2026-09-19，`D-050` 之前的独立事项）**：`D-027` ⑤「用户本人指定保持某条件 = 用户 `Fact`」的 V1 落点**人工裁定读法 ③** —— **唯一输入落点 = `Formal Attempt` 层用户 `Fact`；`Hypothesis` ⑤ 只引用 / 展示该 `Fact`**；⑤ 仍只读、无编辑入口 / 输入框 / 并列用户条目｜依据 = `D-027` + `D-049`｜**它本身未创建任何 `Decision`**（历史文本中的「不创建 `D-050`」继续有效，仅指该事项）｜验收 `AC-107`/`AC-108`
- 🚩 **编号读法提醒**：项目里 20 处「不创建 `D-050`」均为 **`ADJ-01` 语境的历史表述**，`D-050` 编号其后已由 Level A `matched` 判据占用；权威澄清条目 = `DECISIONS.md` `D-050` 的《编号说明》
- **`D-051`（S00-03 / POST-INTEGRATOR / 来源 `DR-01`；2026-09-20；`CONFIRMED`，人工选 C 收窄版）｜显式重新生成后的产物语义与「生成批次」**：**最新一次显式生成 = 「当前生成结果」**，此前各批 = **「较早生成结果」**｜**旧 `Insight` / `Hypothesis` 一律保留**（不删除、不覆盖、不因重新生成自动迁移状态）｜旧 `Insight` 三态保持（`candidate`/`accepted`/`rejected`），🔴 不得 `accepted → candidate / rejected / hidden / revoked`｜**较早 `accepted Insight` 仍是 `accepted Insight`** ⇒ **继续遵循 `Experience Asset` = accepted Insight 视图**，**只有显式 `revoke` 才退出**｜旧 `Hypothesis` 的 `decision_state` 不变、**新 `Hypothesis` 不继承旧 `decision_state`**｜**「当前生成结果」无任何等级语义**（≠ 真值更高 / 证据更强 / 已确认 / 更可靠）｜**较早 `Hypothesis` 不因存在自动成为新一轮推理输入**｜**重新检索 ≠ 自动重新生成 ⑧ ≠ 自动重新生成 ⑨**（不级联）｜🔴 **统一称「当前生成结果」/「较早生成结果」**，**禁止「旧版本 / 历史版本 / 第 N 版 / 更早的候选经验」**｜🔴 **不建立版本系统**（禁 `version number` / `generation version number` / 版本列表 / 版本比较 / 版本回滚 / "第 N 次生成"计数 / 修改次数 / `diff` / `restore old version`）｜**与 `D-040` 的边界**：「用户直接修改同一 `Insight` 内容」≠「显式重新生成产生新结果」｜**不改变** `D-039`/`D-040`/`D-041`/`D-042`/`D-043`/`D-045`/`D-049`/`ADJ-01`/`D-050`｜契约落点 = **§2.4 / §8.6 第 9 条 / §9.5 / §12 第 20 项**｜验收 `AC-116`–`AC-123`
- **`D-052`（S00-03 / POST-INTEGRATOR / 来源 `DR-02`；2026-09-20；`CONFIRMED`，人工选 B）｜`actual_attempt` 的严格语义边界负例**：「**调整热风参数**」vs「**调整送风参数**」= **`compared_not_matched`**（**不得判 `matched`**）｜理由 = 二者属**可区分的具体技术对象 / 参数对象**；**仅"都属于干燥参数 / 都涉及送风·热风系统 / 都属于参数调整行为 / 属同一技术类别"不充分** ⇒ **同一参数族 / 技术类别 ≠ 语义等价**｜**是 `D-050` 的延伸（不改变其判据本体，只追加一条明确负例）**｜**`CASE-05` 的 `related` 仍 = `true`**（`actual_result` 已有独立 `matched`，`D-052` 不翻转 `related`）｜**用户可感知影响 = ⑦ 中不显示该 `actual_attempt` 相似点**｜`compared_not_matched` 仍为**纯内部量**（不显示数值 / 不形成负面等级 / 不计数 / 不参与相关性评分 / 不产生 `similarity score`）｜**不 `CONFIRM` `TQ04` / `R-A`**｜契约落点 = **§9.4 的 `actual_attempt` 行 + "明确不充分"清单**｜验收 `AC-124`–`AC-126`

- **`D-055`（S00-03 / 架构级；2026-09-24；`CONFIRMED`，人工选 **C**；关闭 `DR-03`）｜LLM 请求网络路径 = `Provider-dependent Hybrid`**：**允许 `Browser Direct` 与 `Vercel Thin Proxy` 并存**｜🔴 **路径由 `Provider Adapter Capability` 决定，不由用户每次手工选择 `direct`/`proxy`**、**不得随机切换**｜**Browser Direct 五项适用条件** = ① CORS 可用 ② Browser API 调用被官方支持 / 技术上稳定 ③ 用户自己的 Credential 可直接用于该 Provider ④ **不需要产品服务器隐藏固定 server secret** ⑤ 不引入不可接受安全问题；路径 = `Browser → LLM Provider`；🔴 **不得额外经过 Vercel Proxy**（除非 adapter 被显式配置为 Proxy path）｜**Vercel Thin Proxy** 仅当该内置 Provider 直连不可行 / CORS·API 形态要求服务端调用；路径 = `Browser → Vercel Thin Proxy → Known LLM Provider`；🔴 **Proxy 必须保持 `THIN`** —— ✅ 只允许 request normalization / provider adapter forwarding / response normalization / timeout·error mapping / 必要的 schema transport；🔴 **不得承担** Workspace / `Attempt` / `Insight` / `Hypothesis` 持久化，🔴 **不得存在** Experience database / Cloud user database｜🔴 **Custom / OpenAI-compatible / 用户自定义 `Base URL` = `Browser Direct Only`**；🔴 **禁止 `Generic Arbitrary URL Proxy`**；🔴 **不得设计成 `Browser → Vercel → 用户任意 URL`**｜🔴 **Proxy 不得接受 client 提交的任意 `target_url` / `base_url` / `host` / `scheme` 并据其代请求**；**唯一安全形态 = `provider_id → 服务器端已注册 Adapter → 固定 / 严格受控 Provider Host`**；🔴 **不允许用请求参数修改 Proxy 最终目标 host**（防 SSRF / Open Proxy / 云 metadata endpoint / 内网探测 / `localhost`·RFC1918 转发 / 协议滥用）｜🔴 **不可用 Provider 必须明确失败**（表达 `Provider connection unsupported under current browser constraints`），🔴 **不得偷偷走通用 Vercel Proxy**、**不得为"支持所有 Provider"降低 SSRF / Proxy 安全边界**｜🔴 **V1 不为任何 Provider 预置服务端固定 Key**（由适用条件 ④ + `D-056` 共同推出；**解释闭合**）｜🔴 **本 Decision 不 `CONFIRM` `TQ03`**（子项已裁决 ≠ `TQ03` 已裁决）｜契约落点 = **§0.4 D 节（网络路径部分）**｜验收 **`AC-144`–`AC-152`**
- **`D-056`（S00-03 / 架构级；2026-09-24；`CONFIRMED`，人工选 **A**；关闭 `DR-04`）｜LLM 凭据持久化 = `Session-only Credential`**：**V1 不长期保存 API Key**｜✅ **允许** session-scoped browser storage / **等价的当前浏览器会话级 `Credential Store`**（`sessionStorage` 或等价 session-scoped abstraction）｜**目标行为** = 输入 API Key → **当前会话可用** → **页面刷新后可继续当前会话** → **tab / browser session 结束后清除** → 重新进入须**重新输入**；🟢 **边界在"会话结束"，不在"页面刷新"**（**不是"刷新即失效"**）｜🔴 **禁止载体逐项**：`localStorage` / `IndexedDB` / Workspace file / Git / Vercel KV / Vercel DB / Cloud DB / server filesystem / **permanent cookie**｜🔴 **传输**：`Browser Direct` ⇒ Credential 只从 `Browser → User-selected Provider`、**不得额外发送给 Vercel**；`Proxy` ⇒ `Browser → Thin Proxy → Known Provider`、**仅当前请求生命周期**、🔴 **Proxy 不得持久化**（不写 DB / 文件 / KV / cache / durable log）｜🔴 **日志红线**：`Authorization` / API Key / 含 secret 的完整 request body **不得进入** Vercel logs / application logs / error logs / analytics / 浏览器 console；**必须脱敏**｜🔴 **不得增加**「记住我」/「`Remember Key`」/「永久保存 Credential」开关（**未来如需要必须另行 Decision**）｜🟠 **性质 = 有意的 V1 Security Trade-off**｜🔴 **不 `CONFIRM` `TQ03`**｜契约落点 = **§0.4 D 节（凭据部分）**｜验收 **`AC-153`–`AC-162`**
- 🚩 **`D-055` / `D-056` 与 Pivot `PROPOSED` 推荐的差异（🔴 必须记账）**：`DR-03` 与 §L / §U 推荐**方向一致**但人工裁决**显著加强**自定义 `base_url` 安全边界；`DR-04` **删除了原推荐的 `K-B`（"记住"）分支**、并**澄清 `K-A` 的边界在"会话"而非"刷新"**（⚠️ **有实质差异**）⇒ 🔴 **以 `D-055`/`D-056` 为准**；🔴 **§L/§U 原文保留不改写、不得再作实现依据**
- 🚩 **`D-057`（S00-03 / 架构执行级；2026-09-24；`CONFIRMED`；Source = 项目负责人本轮人工流程决策原话）｜`SP-06` 部署验证与真实浏览器人工验收**延期至提交前**（`Deployment Validation Deferral`）**：**`SP-06` 剩余「Vercel 部署验证」+「真实浏览器目录权限生命周期人工观测」不再作为 `Gate B` / `Gate C` / 正式开发启动的硬阻塞项**｜🔴 **但它们仍是 `PRE-SUBMISSION ACCEPTANCE` 的必做项**（清单 = `PSA-01`–`PSA-13`，`PLANNED` / `NOT EXECUTED`）｜允许序列 = **`Gate B` → `Gate C` → `Coding` →（开发后 / 提交前）`Vercel Preview Deployment` + `Chrome`/`Edge` 真实 `Workspace` 验收**｜🔴 **不得改写 `SP-06` 历史**：仍 = `CONDITIONAL PASS`、**7 项 `PENDING MANUAL OBSERVATION` 一条都不得标 `PASS`**、不得删除、不得伪造观测；**只允许追加 `CURRENT PROCESS DISPOSITION`**（`CORE ARCHITECTURE EVIDENCE = SUFFICIENT TO PROCEED TO GATE B` ／ `DEPLOYMENT / BROWSER MANUAL ACCEPTANCE = DEFERRED TO PRE-SUBMISSION`）｜**File System fallback = 本轮不触发（`NO DECISION REQUIRED`）**；升级条件 = **F1–F4**（Vercel HTTPS 无法开 picker / 真实浏览器不能 read+create+update / 正常刷新后无法恢复或重授权 / 现场无法保证至少一个已验证浏览器）｜🔴 **`PSA-*` 不是产品 `AC`**（**`AC` 统一口径 = 连续 canonical 162 ＋ 独立 `AC-Q06` 6 ＝ 全部有效验收点 168**）｜🔴 **不 `CONFIRM` 任何 `TQ`**、**不改 `D-053`–`D-056` 一字**｜落点 = `docs/DECISIONS.md` `D-057` + `20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md` + SP-06 报告 **§R** + 技术决策包 **§V** + Pivot **§Y** + `09_TEST_PLAN.md` 护栏节（**新增 `AC` = 0**）。（🔴 该条的**当前有效表述**另见下文本节 §C-GATEB。）
- 🚩 **`D-058`–`D-062`（S00-03 / Gate B 最终技术决策；2026-09-24；全部 `CONFIRMED`；Source = `Gate B Final Human Confirmation`，项目负责人原话「A｜确认以上全部 Gate B 决策」）**：**五项独立追踪、不得合并** —— `D-058` = `TQ01` **Browser-heavy Local-first Web App + Optional Thin Server Layer**｜`D-059` = `TQ02` **Local Workspace Files + No required cloud database**｜`D-060` = `TQ03` **Configurable LLM + Provider Abstraction + Provider-dependent Hybrid + Session-only Credential + Registered-provider Thin Proxy only**｜`D-061` = `TQ04` **`R-A`**｜`D-062` = `TQ05` **Local Development + Vercel Demo/Review Deployment Target + Local Workspace + Optional Thin Provider Proxy**（🔴 **附 `DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION`**）｜🔴 **`TypeScript end-to-end` 与 `Markdown + JSON / sidecar metadata` = `TECHNICAL DEFAULT` / 实现参数**（**不进 `CONFIRMED` 核心结论、不生成 `Decision ID`**；`TQ02` 物理 schema 由 Integrator 收敛，🔴 不得锁成不可变产品 Decision，但须满足 human-readable / stable ID / `EvidenceRef` / `archive_state` / generation batch / `source_type` / `decision_state` / Git-friendly·portable）｜🔴 **不新增 `AC`**（口径 = 连续 canonical 162 ＋ 独立 `AC-Q06` 6 ＝ **168**）｜落点 = 技术决策包 **§V.12** + Pivot **§Y.8** + `docs/07` **§5.15** + 契约 **`v0.3 DRAFT` §0.4 E 节** + SP-06 报告 **§S**（细则 → 本文件 **§C-GATEB-LANDING**）。

## B. 环境细节

- 🟠 **Bash 工具可用性（2026-09-24 实测修正，取代旧"基本不可用"结论）**：**纯 ASCII 且不含单引号 `'` 的命令可用**（实测 `printf` / `ls` / `cat` / `tail` / `sed` / `wc` / `head` 正常）；🔴 **只要命令里出现单引号（含 `<<'EOF'` 型 heredoc 定界符）或大量中文，就会报 ``unexpected EOF while looking for matching `'``**（工具似把整条命令包进单引号）⇒ **中文内容一律不要用 heredoc 写**，改为 **`Write` 工具写临时分片 → `cat "分片" >> "目标"` → 删除分片**；**仍优先 `Read`/`Write`/`Edit`/`Glob`/`Grep` 专用工具**。
  - 🚩 **[2026-09-25 `S01-W1-INTEGRATE` 就地补注｜🔴 取代上一行的"纯 ASCII 可用"结论]**：本轮实测 **`Bash` 工具完全不可用** —— 连 `ls /c/Users/Red16/Desktop`、`echo hello` 这种零引号纯 ASCII 命令也报 ``unexpected EOF while looking for matching `}'``（推测 = 会话 cwd 含中文即令包装脚本语法失效）。⇒ **一律改用 `PowerShell`**：命令能执行但**不回显 stdout**，故**输出重定向到文件后用 `Read` 取回**（`Set-Content -Encoding UTF8`；🔴 `Out-File` 默认 UTF-16 会被 Read 判为 binary）；日志/临时文件放 `$env:TEMP\<name>\`。🔴 `Remove-Item` 用**相对路径**可能被 safe-delete 静默拦下（`-ErrorAction SilentlyContinue` 会掩盖）⇒ 用 **`-LiteralPath` + 绝对路径**，并用 `Test-Path` 复核。
- 🔴 **Bash 安全删除限制**：`rm` 对含中文/特殊路径可能被 `safe-delete` 拦截（报 `relative path rejected`）⇒ 临时文件放**系统 `%TEMP%`**，删不掉也不影响项目；**不得对个人目录做批量删除**。
- PowerShell 在本机**不回显 stdout** → 需输出时**写文件再 Read**；`Out-File` 默认 **UTF-16**（Read 会判为 binary）⇒ 用 `Set-Content -Encoding UTF8`；跑 Python 加 `PYTHONIOENCODING=utf-8`
- 临时脚本原则上不留项目内；**例外**：Spike 任务若**明确指定**位置（如 `30_SPIKES/retrieval/`），按其指定执行，并**全标 `DISPOSABLE / NON-PRODUCTION`**、**不得写入 `src/`**
- 读 `.docx` 用 Python zipfile 解 `word/document.xml`；managed Python = `C:\Users\Red16\.workbuddy\binaries\python\versions\3.13.12\python.exe`
- 界面可能把 `docs/`、`.learnbuddy/` 显示为 `svgdocs/`、`svg.learnbuddy/`（磁盘上不存在）；canonical = `docs/` 与 `.learnbuddy/memory/`
- 本机**无任何模型 API 凭据**（无 `OPENAI`/`ANTHROPIC`/`DEEPSEEK` key）⇒ 脚本无法发起 API 级模型调用；需独立重复模型判定时只能起**全新上下文的独立会话**（会话级独立，非 API 级；`temperature`/`seed` 不可配置）
- 🔴 **`Write` 工具单次写入上限（2026-09-20 实测）**：一次写入约 1700 行（≈ 100KB 级）会被**静默截断**（本次停在 `M.3` 的 `H1`，文件其余部分丢失且**不报错**）⇒ **长文档必须分块写入**（单次控制在约 600 行以内），用 `Write` 建首块 + `Edit` 逐块续写；**写完必须核查尾部与章节完整性**（用 `Grep` 匹配 `^## ` 列全部章节标题）
- **`Glob` 对目录不可用**：`20_INTEGRATION*` 这类"目录模式"即使目录存在也返回 `No files found` ⇒ 目录存在性用 PowerShell `Test-Path`，或直接 `Write`（会**自动创建父目录**）
- **`Write` / `Edit` 会自动创建不存在的父目录** ⇒ 新建 `20_INTEGRATION/` 之类目录无需先跑 `New-Item`

## C. 当前状态细则

- **`S00-01` = `S00-02` = `CLOSED / CONFIRMED`**（不得重开）；未裁决 Q = 0
- **`S00-03｜技术架构与实现方案收敛` = 已启动 / 未关闭**；**技术栈未选择 / DB 未确定 / API 未确定 / 编码未开始 / 未做 UI 视觉设计**
- **阶段流程（唯一，废止原 Gate A–E 五门制）**：`Gate A（Bootstrap + Shared Contract 审查）→ S03-A～E 并行分析 → Integrator → D-051/D-052 落盘（POST-INTEGRATOR 人工决策）→ SP-01 实测候选环境（P0 证据，非 BLOCKER；🟢 2026-09-20 已批准 `APPROVED`、未执行）→ Gate B（TQ01–TQ05 最终人工裁决）→ Local Landing（落盘，不编码）→ Gate C（最终关闭审查）→ CLOSED / CONFIRMED`｜**Gate A 不要求先裁决技术栈**｜⚠️ 新旧 Gate A/B/C **同名不同义，禁止混用**｜🔴 **时序校正（2026-09-20）**：**`SP-01` 必须排在 `TQ02`/`TQ05` 最终裁决之前**（原"Gate B → SP-01 → 必要时回开 Gate B"顺序作废）｜🔴 S00-03 内不做：正式业务编码、双人并行开发、正式产品模块
- **产出**：`docs/analysis/S00-03_技术架构阶段启动.md`（非 canonical）+ `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（**当前 `v0.2.5 DRAFT / D-051+D-052 对齐版`，未冻结、未 `CONFIRMED`，不可作实现依据**；🚩 **2026-09-24 已推进至 `v0.2.6 DRAFT / D-053 Local-first + D-054 Structured Experience RAG 对齐版` —— 见 §C-PIVOT**）+ Worker 产出 `01_APP_ARCHITECTURE.md`（`PROPOSED`/S03-A）、`02_DATA_AND_STATE.md`（`PROPOSED`/S03-B）、`03_AI_PIPELINE.md`（`PROPOSED`/S03-C）、`04_RETRIEVAL_AND_COMPARISON.md`（`PROPOSED`/S03-D）、**`05_TEST_DEMO_DEPLOY.md`（`PROPOSED`/S03-E，已产出，A–T 共 20 节）** —— **五份 Worker 产出与 `SP-03`/`SP-03R` 在 `D-051`/`D-052` 落盘时一字未改**
- **S03-E 关键口径（`PROPOSED`）**：**当前有效 `AC` = 121**（`AC-01`–`AC-115` 连续 + `AC-Q06-1`–`6`；**唯一动态来源 = `docs/09_TEST_PLAN.md`**；**旧快照 `AC-01`–`AC-100` 不再是完整范围**）｜覆盖 **covered 121 / outside 0 / unresolved 0**（含治理子项 3 = `AC-49`/`AC-90`/`AC-96` → Gate C 文档审查；条件（Gate B）若干 = `AC-48`/`AC-79`–`AC-86`/`AC-109`–`AC-115`）｜`TE-*` = S03-E 文档**内部编号**（非 canonical `AC`、非 `Decision ID`），`TE-001`–`TE-165` + 专用 5 条｜**`TE-E2E-P0`** = `D9` 十步 + X-1–X-10 横切断言｜Demo **seed 8 条**（`DEMO-01`–`08`；**Level B 陷阱 = `DEMO-06`**、**archived 夹具 = `DEMO-07`**、单位等价 = `DEMO-02`）+ 现场 1 条；现场脚本 `TE-DEMO-LIVE-01/-02/-03`；**同工作空间为硬要求**（否则 `TC-80` MUST 不成立）｜`reset_demo_baseline` = **运维动作、非产品功能**（禁止"只删 Demo 记录保留现场新增"）｜**部署候选 `D-A`/`D-B`/`D-C` ≈ `S03-A` `C-B`/`C-C`/`C-D`（未改写 `S03-A`）**，`PROPOSED` 推荐 **`D-A`**、等价备用 **`D-C`**（共享同一分层，切换不产生返工）；**第一风险 = 现场网络可达性**（若不可达**换平台**，不得退回本机服务）｜**`TQ05`/`TQ04` 仍留 Gate B，均未 `CONFIRM`**｜`SPIKE NEEDED = 有`（`SP-01` P0 + `SP-02`/`SP-04`/`SP-05` P1，**均未执行**；`SP-03R` 已 `PASS` **不重做稳定性 Spike**）｜`TE-POST-AI-REPRO` = **`DEFERRED UNTIL IMPLEMENTATION`**（非 `S03-E`/Integrator/Gate B 前置）｜**`CASE-05.actual_attempt` = 待 Integrator 冻结 expected 的边界 fixture（`TE-130`），S03-E 不裁决、不写 `CONFIRMED`**
- 🔴 **S03-E 登记的限制（非阻塞）**：**「曾被既有 `Insight`/`Hypothesis` 引用、后被归档」的夹具无法在 seed 阶段构造**（`Insight`/`Hypothesis`/`EvidenceRef`/派生结果**一律不许预置**，预置即等于伪造"系统曾经推理过"）⇒ `AC-74`/`AC-75`/`AC-100` 的完整验证**只能由现场 / 彩排流程"先建引用、再归档"产生**；`DEMO-07` 只承担"归档记录的排除性行为"（`AC-71`/`AC-73`）
- **`SP-01` 执行批准（2026-09-20）= `APPROVED`（项目负责人）；状态 = 已批准 / 未执行**：**批准 ≠ 执行 ≠ 已选定平台**（§N.7 第 5/6 条）；**有效测试对象 = §N.1 Primary（`TQ01` `A1` + `TQ02` `DP-A` 按量）/ §N.2 Fallback（`TQ01` `A2` + `TQ02` `DP-A` 长驻），须成对验证**；**🔴 执行前置 4 项未落实**：① 具体托管平台落名 ② 账号 / 凭据 + 允许创建真实云资源（可能计费）的授权 ③ 执行网络口径（§N.3 `S-01` 要求"从现场网络"；不可复现时只能给"非现场网络条件下部分结论"并标注射程）④ 执行窗口与资源保留时长；**`SP-01` 不得改判为 BLOCKER**、**PASS 不得写成对 `TQ02`/`TQ05` 的 `CONFIRM`**、**阈值不得进入产品层 / 不得写入 `AC` 断言**；**落盘位置 = `20_INTEGRATION/S00-03_技术决策包.md`（顶部 STATUS 段 / §M.1 / §N 头 / §N.8 / §S.4 第 9 项 / §S.6）+ `docs/CHANGELOG.md`**；**§N.1–§N.7 原文一字未改**；**未创建 `Decision ID`**
- **`SP-01` 平台落点候选（`20_INTEGRATION/S00-03_技术决策包.md` §N.8，`PROPOSED` / 待人工裁决，2026-09-20）**：3 组候选 —— **`P-1` 托管 Serverless 全栈（腾讯云族）**｜**`P-2` 托管 Serverless 全栈（阿里云族，等价族）**｜**`P-3` 轻量长驻单进程 + 托管数据库（= §N.2 Fallback）**；**`PROPOSED` 组合建议 = Primary 取 `P-1`/`P-2` 之一、Fallback 固定 `P-3`**（与 §N.4 降级路径对齐）｜🔴 **未选定平台 / 未执行 / 未创建资源**；🔴 **对免费额度、冷启动、执行时长、连接数不作任何数值断言**（均属 §N.3 `S-02`/`S-03`/`S-05`/`S-06` 实测项）｜**执行网络口径已确认 = 现场网络可复现 ⇒ `S-01`/`S-08`/`S-09` 可给完整结论，`SP-01` 可产出完整 P0 证据**｜**执行前置剩余：② 凭据 + 允许创建真实云资源（可能计费）授权；④ 执行窗口与资源保留时长**（① 待选定、③ 已确认）
- **`SP-01` 人工执行口径（2026-09-20，`20_INTEGRATION/S00-03_技术决策包.md` §N.8 落名 / §N.9 补充 / §N.10 / §N.11）**：① **Primary = `P-1`（腾讯云族）／Fallback = `P-3`**（`P-2` 阿里云族未采用，按 §N.6 保留为等价候补；**族级落名 ≠ 已选定具体平台**，具体产品名与规格须创建前按 §N.9 报备）② **凭据（§N.10）**：**本人云控制台登录为主；不提供主账号长期密钥；仅在自动化必须用密钥时才允许创建【临时最小权限子账号凭据】（须说明用途 / 权限最小集 / 有效期 / 销毁时点并经确认）；AI 不持有控制台登录态；凭据不得写入任何文件 / 日志 / 报告 / 前端产物**（对应 `S-10`）③ **资源生命周期（§N.9 补充）**：**允许创建临时按量测试资源；`SP-01` 结束后删除未选中资源；仅最终选中环境保留到彩排；删除前须列清单并经确认** ④ **网络口径 = 现场网络可复现** ⑤ ✅ **已澄清（2026-09-20）**：「允许创建按量资源」是**原则性许可**，**§N.9 第 2 条的"逐项报备 + 再次确认"继续适用**（详见下方 §N.12 条目）
- 🔴 **`SP-01` 时序结构性缺口（§N.11，待人工裁决）**：**§N.7 第 2 条**要求 `SP-01` 在 Gate B 裁决 `TQ02`/`TQ05` 前完成，但 **§N.3 的 10 项中 4 项依赖可运行业务应用**（`S-03` ⑧⑨ LLM 耗时 / `S-08` ①→⑩ 全链 / `S-09` 展示机 / `S-10` 密钥边界），而 **`S00-03` 不写业务代码、Local Landing 与开发实现阶段均未开始** ⇒ **编码前无法完成**；另 6 项（`S-01`/`S-02`/`S-04`/`S-05`/`S-06`/`S-07`）**只需最小探针（静态页 + 一个服务端函数 + 一张表）**。**候选 = A 两段式（`SP-01a` 编码前 6 项最小探针 / `SP-01b` 编码后 4 项；建议，需批准对 §N.3 分段）｜B 整体推到编码后（违背 §N.7 第 2 条，不推荐）｜C 强探针近似（占位链路，结论须标"近似"，**不能替代真实 ⑧⑨ 的 LLM 耗时**）**；🔴 **未擅自改 `§N.3`/`§N.7`（按"冲突 → 不改 + 报告中提示"）** → ✅ **已裁决（2026-09-20）：方案 A｜两段式** —— **`SP-01a`（编码前 / Gate B 前）= `S-01`/`S-02`/`S-04`/`S-05`/`S-06`/`S-07`（最小探针）；`SP-01b`（编码后 / 实现期）= `S-03`/`S-08`/`S-09`/`S-10`**；**已批准对 §N.3 作 a / b 分段**（**不改各项观测内容、PASS / FAIL 条件与失败归属**）；🔴 **`SP-01b` 未完成前不得声称 `SP-01` 整体已完成**；**`S-03` 真实 ⑧⑨ LLM 耗时在 Gate B 时仍未知，须如实标注"待 `SP-01b`"**
- **`SP-01a` 资源报备清单与执行骨架（§N.12，按 §N.9 第 2 条报备，2026-09-20）**：**`R1` Serverless 函数服务（承载服务端）｜`R2` 静态网站托管 / 对象存储（探针前端）｜`R3` 托管 PostgreSQL（连接数上限须核对）｜`R4` 域名 / DNS / 证书（条件项、默认不建，用平台默认访问方式）｜`R5` 临时最小权限子账号凭据（条件项、默认不建）**；🔴 **AI 不预填任何产品名 / 规格 / 费用数字**（规格与官方当前免费额度 / 计费口径须项目负责人在控制台核对回填）；**最小探针 = 静态页 + 一个服务端函数 + 一张表**（不含业务规则 / 不含 `D9` 逻辑 / **不含 AI 调用**；`DISPOSABLE / NON-PRODUCTION`；**不得写入 `src/`**）；**执行骨架 步骤 0–8**：0 回填规格与计费口径 → **1 【确认点】创建前再次确认** → 2 项目负责人在控制台创建 R1–R3 → 3 AI 给探针内容、项目负责人部署 → 4 AI 侧（现场可复现网络）跑 `S-01`/`S-02`/`S-04`/`S-06`/`S-07` + `S-03` 探针级 → 5 项目负责人核 `S-05` 额度余量 → 6 AI 汇总（逐项 PASS/FAIL + 原始观测值 + 网络口径 + 资源来源标注）→ 7 FAIL 按 `§N.5` 出回开映射建议（**由项目负责人裁决**）→ 8 **不据此 `CONFIRM` `TQ02`/`TQ05`**
- ✅ **`§N.9` 第 2 条继续适用（2026-09-20 已澄清）**：「允许创建临时按量测试资源」是**原则性许可（授权类别）**，**不免除逐项报备 + 再次确认** ⇒ 创建 `SP-01a` 资源前仍须先报「资源 + 规格 + 预计费用」
- **`SP-01a` CREATE READY PACK（`20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`，A–J 共 10 节）｜Gate Patch 2026-09-20 完成**：**状态 = `READY FOR ACCOUNT-LEVEL BACKFILL`（≠ `READY TO CREATE`）**｜Patch Report = `20_INTEGRATION/SP-01a_CREATE_READY_PATCH_REPORT.md`（13 节 + `【SP-01a CREATE READY PATCH RESULT】`）｜🚩 **DECISION STATE CORRECTION = YES**：`组合甲` / `路径 (a)` **全库无项目负责人明确选定记录**（仅存在于两份 SP-01a 文档自身 + AI 自有日志；`项目会话压缩交接_2026-09-20.md` 在本工作区**不存在**）⇒ 由"✅ 人工已选"**下调为 `PROPOSED` / 待确认**，**未代选替代方案**（组合乙 / 路径 (b) / 接受 15 s 均保持候选、未采用亦未否决）｜🔴 **`DECISION REQUIRED` = 2 项**（**资源组合：组合甲 / 组合乙（含 R2 是否与 R1 共宿主）**；**`R1` 触发器路径：(a) / (b) / 接受 15 s**）—— **阻断"进入创建"，不阻断文档 Patch**｜**PATCH-01**：`RF-01` = 账号级 6 项（资格 / 领取·激活 / 有效 / 生效 / 失效 / 剩余额度），依据只能是控制台资源包·用量·费用中心·创建页，**不得据公开文档推断"本账号当前免费"**，未核验 ⇒ `🔴 待回填`｜**PATCH-02**：`R3` 磁盘 `≈0.001 元/GB/小时` **保持"非官方保守示意值"（🔴）**，注入资产无官方出处 ⇒ **不提升证据等级**；"官方示例参考值 ≠ 本账号创建页报价" ⇒ `RF-10` 仍须回填、`S-05` 依据 = 创建页报价 + 账单页｜**PATCH-03**：**"公开文档覆盖地域 ≠ 当前账号创建页实际可选地域"**；禁推"R2 必然只能上海 / 必然跨地域 / 必须更换产品"；`R2` 实际地域由 `RF-08` 控制台下拉读取；不满足已报备结构 ⇒ `RESOURCE CHANGE REQUIRED` + 重新报备｜**费用四层分层（A 官方公开价 / B 本账号实际报价 / C 本次预计用量 / D 预计费用）**，B 未回填时 D 标"基于 A 的上界估算、非本账号报价"，**禁 A→B**｜`R1` CLS：**不可关闭 ⇒ 存在关联 CLS 计费可能，不写成"绝对为 0"**｜`RF-01`–`RF-12` = 12 格（最小充分，未新增编号；**只记数值 / 选项 / 名称，不记凭据**）｜标志位：`RESOURCE CHANGE REQUIRED` = NO（预判 6 条）｜`BILLING CHANGE REQUIRED` = NO｜`BLOCKER` = NO｜`DECISION REQUIRED` = YES（2 项）｜**下一人工动作 = 项目负责人登录控制台按 `RF-01`→`RF-12` 回填**｜🟢 **2026-09-20 同日补充：项目负责人明确指令「组合甲+路径(a)」⇒ `组合甲` + `路径 (a)` 恢复为 `CONFIRMED`（人工已选）；SP-01a 资源层 `DECISION REQUIRED` = 0**（**组合乙 / 路径 (b) / 接受默认 15 s 均不采用，保留候补记录**）｜落盘 = PACK §A.2 / `20_INTEGRATION/S00-03_技术决策包.md` §N.12《🟢 人工裁决结果（2026-09-20，补充）》/ Patch Report **§14** / `CHANGELOG.md`｜🔴 **边界：裁决 ≠ 创建授权；`§N.9` 第 2 条（逐项报备 + 再次确认）继续适用；`R1`/`R2`/`R3` 规格与单价仍 `PROPOSED`，须 `RF-01`–`RF-12` 回填；不 `CONFIRM` `TQ01`–`TQ05`；不占用 `Decision ID`；未创建任何资源**
- 🚩 **`SP-01a` `R1` HTTP Entry 重开改判（2026-09-20，Account-Level Verification 后）** —— 🚩 **本条目取代上一条中的 `路径 (a)` 部分（上条其余内容仍有效）**；落盘 = `SP-01a_CREATE_READY_PACK.md`（新增 **§A.3 / §B.5 / §C.2-FU / §E.2-FU / §K**，并同步 §A.2·§B.1·§B.2·§C.1·§C.2·§D·§E.2·§E.5·§F·§G·§H·§I·§J）｜Patch Report **新增 §15**｜决策包 **§N.12 追加《`N.12+` Account-Level Verification 补充》**｜`CHANGELOG.md`。
  - **账号级事实（🟠 项目负责人本人控制台核验；AI 未独立复核）**：腾讯云旧 API Gateway —— **2024-07-01 起不再支持新建 API Gateway 触发器**、**2025-06-30 API Gateway 产品停止服务 / 触发器下线** ⇒ **旧路径 (a)「SCF Web 函数 + 标准型 API 网关」在当前真实云环境不可执行**。
  - **四态轨迹（保留、不改写历史）**：① `PROPOSED` → ② `CONFIRMED`（人工「组合甲+路径(a)」）→ ③ **`RESOURCE CHANGE REQUIRED`（账号级否决）** → ④ **新路径 `CONFIRMED`**；🔴 **不是"从未确认"、不是"人工决策错误"**。
  - **人工重新裁决**：**`R1` HTTP Entry = `SCF Web 函数 + Function URL`（`CONFIRMED`）**｜**旧路径 (a) = `SUPERSEDED`**（历史 `CONFIRMED` 文本保留）｜**组合甲不变**｜**`RESOURCE CHANGE REQUIRED` = `RESOLVED`（🔴 禁写"从未发生"）**｜**旧 API Gateway 移出【拟创建资源 / 预计费用 / 免费额度核验 / 销毁清单】**（历史报备 `SP-01a_RESOURCE_DISCLOSURE_PACK.md` **一字未动**）。
  - **`RF-05` / `RF-06` 语义替换（🔴 编号不变，未新增 `RF-13`/`RF-14`）**：`RF-05` = **Function URL 可用性**（① 支持 = YES｜② 公网访问 = YES｜③ 内网访问 = YES｜④ 属 SCF 自身能力｜⑤ 不再依赖旧 API Gateway｜⑥ 平台 HTTPS Endpoint **能力层 PASS**、**URL 实值 `deferred to Phase 2`**、**禁为拿 URL 提前创建函数**；➕ CORS = **产品能力层 `SUPPORTED`**（🟢 官方《创建函数 URL》）/ **账号级未验证** / **真实行为 `DEFERRED TO Phase 2 Probe`**）⇒ 🟡 **PARTIAL PASS**；`RF-06` = **Function URL 调用与安全条件**（`CAM` / `开放` 存在；`开放` = **不自动**做 CAM 校验、**支持匿名访问**；`CAM` = 需 **CAM 鉴权**；🔴 **禁把 `开放` 写成正式生产安全策略**；**探针期临时授权模式 = Phase 2 创建前裁决 ⇒ `DECISION REQUIRED`（安全配置层，非 `TQ` 级）**）⇒ 🟡 **PARTIAL PASS**；🔴 **不再要求查询**旧网关免费额度 / 共享型·专享型 / 标准型网关 / 旧网关后端超时。
  - **账号级回填进度**：`RF-01` = 🟡 **PARTIAL**（已购 **SCF 0 元新客试用套餐**：广州 / 个人高级版 / 0 元 / 3 个月 / 预计到期 **2026-12-20 14:00:04**；🔴 **「当前剩余额度」待回填，不得自行填写**）｜`RF-02` / `RF-03` / `RF-04` = ✅ **PASS**｜`RF-05` / `RF-06` = 🟡 **PARTIAL PASS**｜`RF-07`–`RF-12` = 🔴 **未回填**。
  - **目标结构（`SP-01a` 冻结口径）**：`CloudBase 静态页 → HTTPS → SCF Function URL → SCF Web 函数 → VPC → TencentDB PostgreSQL`；🔴 **"网络语义三分"不得混**：**A `Function URL` 公网访问**（外部浏览器能否经公网 HTTPS 进入函数）≠ **B 函数网络配置 → 公网访问**（函数能否主动出网）≠ **C 函数网络配置 → 私有网络 `VPC`**（函数能否访问 VPC 内 DB）。
  - **账号 / 计费状态事件（已登记）**：购买 0 元套餐时控制台提示"**支付方式可能从【微信支付】切换为【腾讯云支付】且不可恢复原支付方式**"，项目负责人**已人工完成购买**；🔴 **禁把"0 元"写成"无任何账号副作用"**；**不因此回开技术架构**；**未记录任何凭据**。
  - **标志位**：`RESOURCE CHANGE REQUIRED` = **`RESOLVED`**（曾发生 YES）｜`BILLING CHANGE REQUIRED` = **NO**｜`BLOCKER` = **NO**｜**`DECISION REQUIRED` = 1（安全配置层：探针期 Function URL 授权模式 `开放`/`CAM`；Phase 2 创建前裁决）**｜**资源层 `DECISION REQUIRED` = 0（不变）**｜Current Gate = **`READY FOR ACCOUNT-LEVEL BACKFILL`**（≠ `READY TO CREATE`）｜**Next = 进入 `R2`｜CloudBase 核验 `RF-07` / `RF-08`**（若必须购买付费套餐 ⇒ `RESOURCE CHANGE REQUIRED` + `BILLING CHANGE REQUIRED` + 停止）。
  - 🔴 **边界**：**未创建任何资源**（无 SCF 函数 / **未启用 Function URL** / **未生成任何 Endpoint** / 无 CloudBase 环境 / 无 PostgreSQL / 无 VPC·子网）｜**未写探针 / 未部署 / 未建表 / 未执行 `S-01`–`S-07`**｜**未进入 Gate B / 未开始正式编码**｜**云资源费用 = 0**（`SCF Trial Package` = `PURCHASED / 0 CNY`）｜**`TQ01`–`TQ05` 未改变**（五项仍全部 `PROPOSED`、仍留 Gate B）｜**未占用 `Decision ID`**。
- 🚩 **`SP-01a` ACCOUNT-LEVEL BACKFILL CLOSURE + CREATE READY GATE REVIEW（2026-09-20 后段；`CREATE READY GATE = PASS`）** —— **Current State = `READY TO REQUEST CREATION CONFIRMATION`**（🔴 **≠ `READY TO AUTO-CREATE` ｜ ≠ 资源创建已授权 ｜ ≠ `SP-01a` PASS ｜ ≠ `SP-01` PASS**；**仍等「确认创建」**）。
  - **`RF-01`–`RF-12` 全部收口**（🟠 账号级，AI 未独立复核）：`RF-01` = **COMPLETE**（已购 SCF 0 元新客试用套餐：广州 / 个人高级版 / 3 个月 / 预计到期 **2026-12-20 14:00:04**；🚩 **当前剩余额度 = `0`** ⇒ 🔴 **不推测原因**；**费用模型改用保守口径 = 不再按免费额度抵扣**）｜`RF-02`/`RF-03`/`RF-04` = **PASS**｜`RF-05`/`RF-06` = **PRE-CREATE PASS**｜`RF-07`/`RF-08` = **PASS**（**R2 实际地域 = 上海**；静态托管尚未初始化）｜`RF-09`/`RF-10`/`RF-11` = **PASS**｜`RF-12` = **COMPLETE / NO EXISTING RESOURCE**（广州 VPC·子网 = `NONE`，**不是 FAIL**；仍 12 格未新增编号）。
  - 🚩 **`RF-10` 证据等级升级**：`0.001 元/GB/小时` 由「🔴 非官方保守示意值」→ **「B 类：本账号控制台实际报价推导值」**（**PATCH-02 旧保守结论在新证据下失效，原文本保留**）；**`R3` 总配置 = `0.57 元/小时`**；⚠️ **备份费 `0.0008 元/GB/小时` ≠ 数据磁盘价**，不得混淆。
  - 🚩 **`RF-06` 探针期授权裁决（`CONFIRMED`）**：**授权类型 = `开放`**，**射程仅 `SP-01a` disposable probe**（允许 `GET /health`、`GET /db-health`、最小持久化 Probe 接口；禁止正式用户认证 / 正式业务 API / 正式用户数据 / 暴露 Secret·连接串·密码·云凭据 / 作为正式生产匿名 API 策略；**测试结束必须关闭 Function URL 或删除 disposable SCF 函数**）；🔴 **仍属未确认** = 正式认证 / 登录 / CAM 策略 / CORS 白名单 / 防刷 / 限流 / WAF / API 网关治理 ⇒ **原 `DECISION REQUIRED`（安全配置层 1 项）= `CLOSED`** ⇒ **`DECISION REQUIRED` = `0`**。
  - 🚩 **`PROCESS DEVIATION` = `YES`（必须保留）**：项目负责人在 Backfill 未完成 + Gate Review 未执行 + 「确认创建」未给出时**提前手工创建 CloudBase 免费体验环境**（上海 / 0 元 / 不自动续费 / 有效期 2027-03-20 / 已消耗 0 点）；性质 = **人工操作偏离 Gate 顺序**（非 AI 动作）；🔴 **不得隐去、不得改写为"已获创建授权"**；处置 = 保留环境 + 冻结 bundled PostgreSQL + 继续遵守 Gate。
  - 🚩 **CloudBase bundled PostgreSQL = `UNUSED BUNDLED CAPABILITY`**：**已实际 PROVISIONED / AVAILABLE**（CU 0 / 容量 0 MB / 表 0 / 业务数据 0）⇒ 🔴 **不得作为 `R3`、不得建业务表 / migration、不得把 SCF 接上去**；**组合甲不变**；拟替代 `R3` 须**重新打开资源组合决策**。
  - 🚩 **新增报备项 `R6-A` 广州 VPC × 1 / `R6-B` 广州子网 × 1**（`R1`/`R3` 私网互通）⇒ 🟢 **官方免费**（《私有网络 购买指南》2025-09-26：「VPC 中免费使用的功能：基础功能 —— 私有网络、子网、路由表」）⇒ **0 元**；🔴 **不得因 0 元隐形创建**；🔴 **不需要** NAT 网关 / 固定公网出口 IP / EIP / 额外公网带宽；若被强制要求 ⇒ `RESOURCE CHANGE REQUIRED`（涉付费加 `BILLING CHANGE REQUIRED`）+ 停止。
  - **Function URL 独立计费核对 = 结论 A**：官方 SCF《按量计费（后付费）》（`583/12284`）+《Web 函数计费说明》（`583/66237`）**未见 Function URL 独立计费项** ⇒ **不单独收固定网关费用**、**不触发 `RESOURCE CHANGE REQUIRED`**；🟠 **保留不确定性** = 官方未明确「HTTP Entry = Function URL 时响应流量由哪一侧统计」⇒ **最保守口径 = 落在函数侧（推断 / `PROPOSED`）**，**待 Phase 2 账单复核**（🔴 禁写"官方已明确"）。
  - **`R1` Runtime = `Node.js 24.11`**（依据 = CloudBase 官方《运行环境支持》标注 **`24.11` = Active LTS（推荐）** + Node.js 官方 Release Schedule **`24.x` Active LTS / EOL 2028-04-30**；`22.x` Maintenance LTS / EOL 2027-04-30；`20.x` 已 2026-04-30 EOL；`26.x` = Current 非 LTS）⇒ **实现级配置参数**（不构成独立人工决策项），**已在创建确认中披露**；🔴 **不得凭模型记忆选择**；射程 = 不代表最终生产运行时 / 不代表框架形态已裁决。
  - **费用重算（🔴 保守口径）**：`R1` ≈ **0.06 元**（官方单价 × 用量假设：225 GBs + 0.15 万次 + 15 MB 出流量 + 15 MB 响应流量保守项；🔴 **不得因买过 0 元套餐就写 0 元**）｜`R2` = **0 元**（免费体验版 3000 点/月）｜`R3` = **3.42 元**（`0.57 × 6`）｜`R6` = **0 元** ⇒ **预计最高总费用 ≈ `3.48 元`（6h 上界 `≤ 3.5 元`）**；**持续计费风险 = 仅 `R3`**（`0.57 元/h ≈ 13.68 元/天`，**测试结束当天必须销毁**）；**自动续费 = NO**；🔴 **`S-05` 最终依据仍是 = 控制台创建页实际报价 + 实际账单 / 资源包·额度页**。
  - **Phase 2 创建顺序**（仅在收到「确认创建」后）= `R6-A` VPC → `R6-B` 子网 → `R3` PostgreSQL（绑 VPC/子网）→ `R1` SCF Web 函数（`Node.js 24.11` / 512 MB / 30 s / 日志投递不启用 / 绑同一 VPC·子网）→ 启用 Function URL（公网 = 启用 / 授权 = 开放 / 射程 = disposable probe only）→ 在**已存在** CloudBase 环境初始化静态托管 + 部署 1 个 disposable HTML probe → 执行 `S-01`/`S-02`/`S-04`/`S-05`/`S-06`/`S-07`（`S-03` = 探针级）→ 销毁。
  - **`R2` 上海 ↔ `R1`/`R3` 广州跨地域** = 🔴 **不判架构失败、不构成 `RESOURCE CHANGE REQUIRED`**；🚩 **Phase 2 必须实测「浏览器 → Function URL」跨域（CORS）**。
  - **标志位**：`RESOURCE CHANGE REQUIRED` = **本轮新增 `NO`**（🔴 历史曾发生 `YES`（旧 API Gateway）→ `RESOLVED`；**禁写"从未发生"**）｜`BILLING CHANGE REQUIRED` = **`NO`**（🟠 `BILLING DISCLOSURE` 继续维持：`R3` 按量 `0.57 元/小时`）｜`BLOCKER` = **`NO`**｜`DECISION REQUIRED` = **`0`**｜资源层 `DECISION REQUIRED` = **`0`**｜🆕 **`PROCESS DEVIATION` = `YES`**。
  - **落盘** = `20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（顶部状态补注 + §D 收口表 + **新增 §E.5-FU** + §H 状态机 / 标志位 + **新增 §L（L.1–L.15，含 `G-01`–`G-16` 与【SP-01a RESOURCE CREATION CONFIRMATION】）**）｜`20_INTEGRATION/SP-01a_CREATE_READY_PATCH_REPORT.md`（**新增 §16**）｜`20_INTEGRATION/S00-03_技术决策包.md`（§N.12 追加《`N.12++`》）｜`docs/CHANGELOG.md`。
  - 🔴 **边界**：**本 Gate Review 未创建任何资源**（无 VPC / 子网 / SCF 函数 / **未启用 Function URL** / **无实际 Endpoint** / 无 PostgreSQL；**例外如实登记 = `R2` 系项目负责人本轮之前手工提前创建**）｜**未写 Probe / 未部署 / 未建表 / 未执行 `S-01`–`S-07`**｜**未进入 Gate B / 未开始正式编码**｜**未修改** `SP-01a_RESOURCE_DISCLOSURE_PACK.md`、五份 Worker 产出、`SP-03`·`SP-03R`、任何 canonical｜**`TQ01`–`TQ05` 未改变**｜**未占用 `Decision ID`**。
  - **下一人工动作（唯一）** = 阅读**【SP-01a RESOURCE CREATION CONFIRMATION】**（PACK §L.12）→ 明确 **「确认创建」** / 「修改后再确认」 / 「不继续」；🔴 **没有「确认创建」不得进入 Phase 2**。
- 🟢 **`SP-01a` 创建授权已到 + 探针包已交付（2026-09-20 后段·续）** —— 项目负责人人工原话 **「A：确认创建」** ⇒ **`CREATE AUTHORIZATION` = `GIVEN`**（覆盖 §L.12 全部内容：`R6-A` / `R6-B` / `R1` / `R1` HTTP Entry＝Function URL / `R2` 静态托管初始化 / `R3`；`R4`·`R5` 不创建；**射程 = 仅 `SP-01a` disposable probe ≤6h**）⇒ **`Phase` = `Phase 2 STARTED`**｜**`Current Gate` = `PHASE 2 IN PROGRESS`**（创建 + 探针部署 + 执行 `S-01`–`S-07`）。
  - 🔴 **授权不是**：`SP-01a` 已完成 / PASS｜`SP-01` PASS｜对 `TQ01`–`TQ05` 的 `CONFIRM`｜对正式生产架构·平台·入口·**正式安全策略**的确认｜"`开放` 可作正式匿名 API 策略"｜对任何**新增**产品（网关 / WAF / 限流 / 缓存 / 中间件）的授权。
  - ✅ **探针包（新增目录 `30_SPIKES/sp01a_probe/`，6 文件，全标 `DISPOSABLE / NON-PRODUCTION`）**：`README.md`（边界 / 阶段 A–C / 销毁 / **5 项已知不确定性**）｜`function/scf_bootstrap`（固定名 / 777·755 / **LF** / 绝对路径 `/var/lang/node24/bin/node` / `PORT=9000`）｜`function/app.js`（原生 `http` + `pg`；`/health`、`/env-keys`、`/db-health`、`/persist`、`/persist-count`、`/conn?n=N`）｜`function/package.json`（`pg: ^8`，未锁次版本）｜`db/probe_schema.sql`（**唯一 1 张表** `probe_persistence`；🔴 **只为独立 `R3` 执行，绝不建到 CloudBase bundled PostgreSQL**）｜`web/index.html`（**运行时填 Function URL**，无硬编码 + 真实跨域调用）。✅ **本机 `node --check` exit 0 + package.json 合法**；🔴 **不含业务规则 / `D9` 逻辑 / AI 调用 / `Attempt`·`Insight`·`Hypothesis`·`EvidenceRef`**；**未写入 `src/`**。
  - 🔴 **语义澄清**：上一轮"未写 Probe"**指该轮时点**；本探针系**收到「确认创建」后按 §N.12 执行骨架步骤 3 的既定 AI 职责交付**，**不属范围扩展**（两条记账并存不矛盾）。**落点报备** = `30_SPIKES/sp01a_probe/`（沿用既有 Spike 产物约定；如与预期不同可整体移动 / 重命名）。
  - **责任划分（§N.10 第 1/2/6 条）**：**项目负责人** = 控制台创建 `R6-A`→`R6-B`→`R3`→`R1` → 启用 Function URL → 初始化 `R2` 静态托管 → 执行 DDL → 打包上传 → **填 DB 环境变量（不进代码 / 仓库 / 报告 / 聊天 / 截图）** → 回填运行观测值（Function URL 实值 / 默认域名 / 额度·账单数值；**不含凭据**）→ 销毁 + 账单复核停费；**AI（本机）** = 汇总 `S-01`/`S-02`/`S-03`(探针级)/`S-04`/`S-05`/`S-06`/`S-07` 判定（逐项 PASS/FAIL + 原始观测值 + 网络口径 + 资源来源标注）→ 若 FAIL 按 `§N.5` 出**回开映射【建议】**（**由项目负责人裁决**）。🔴 **AI 不登录控制台 / 不持有凭据 / 不代为创建或变更。**
  - 🔴 **停止条件（触发即停止 + 重新报备）**：① 强制 NAT 网关 / 固定公网出口 IP / EIP / 付费带宽 / 其它付费网络产品（⇒ `RESOURCE CHANGE REQUIRED`，涉付费加 `BILLING CHANGE REQUIRED`）② `R3` 最低规格提高或新增强制付费能力 ③ `R1` 强制开启日志投递，或 `Node.js 24.11` 不可选 ④ 访问静态托管 / Function URL 需自备域名·证书·备案 ⑤ 最终创建页价格高于 §L.12 账号级报价（`R3 > 0.57 元/小时` 或新计费项 ⇒ `BILLING CHANGE REQUIRED`）⑥ 出现任何 Function URL 独立计费项。**不得临时升级规格、不得先创建后补报。**
  - 🟢 **Web 函数部署硬要求（本轮新核官方口径，`583/40690` + CloudBase《启动文件说明》）**：文件名固定 `scf_bootstrap`；需 777/755；首行 `#!/bin/bash`；**绝对路径** `/var/lang/nodeXX/bin/node`；监听 **0.0.0.0:9000**（不可 127.0.0.1）；**结尾 LF（不得 CRLF）**；仅 `/tmp` 可读写；**控制台「高级配置 > 启动命令」仅在上传代码中未检测到 `scf_bootstrap` 时生效**；依赖安装 `InstallDependency` 仅支持 Node.js 函数。⚠️ **Windows 打包两坑** = CRLF + 可执行位丢失（常见表现 405）⇒ 变通 = 控制台重存 / 或改用控制台「启动命令」。
  - **落盘** = PACK **新增 §M**｜PATCH REPORT **新增 §17**｜决策包 §N.12 追加 **《`N.12+++`》**｜`CHANGELOG.md`｜**新增目录** `30_SPIKES/sp01a_probe/`。
  - 🔴 **边界**：**未创建任何云资源**（无 VPC / 子网 / SCF 函数 / **未启用 Function URL** / 无 PostgreSQL）｜**未登录控制台**｜**未产生人民币费用**｜**未执行 `S-01`–`S-07`**｜**未进入 Gate B**｜**未写正式业务代码**｜**未修改** `SP-01a_RESOURCE_DISCLOSURE_PACK.md`、五份 Worker 产出、`SP-03`·`SP-03R`、任何 canonical｜**`TQ01`–`TQ05` 未改变**｜**未占用 `Decision ID`**；**`SP-01a` / `SP-01` 均【未完成】**（🔴 不得声称 PASS）。
  - **下一动作** = 项目负责人按 §L.10 顺序在控制台创建（遵守停止条件）→ 部署探针 + 执行 DDL → 回填运行观测值 ⇒ **AI 随后汇总 `S-01`–`S-07`**（`S-03` 探针级）；🔴 **`SP-01b` 未完成前不得声称 `SP-01` 整体完成**。
- **`SP-01` 成本纪律（`20_INTEGRATION/S00-03_技术决策包.md` §N.9，🔴 人工约束，2026-09-20）**：**默认只用免费额度 / 免费试用**；🔴 **硬闸门** —— **任何预计产生实际付费的资源**（**超免费额度 / 按量计费 / 包周期 / 预留实例 / 独立 IP·带宽·额外存储·出网流量·备份·日志等附加项**）**创建前必须报告 ① 资源 ② 规格 ③ 预计费用**（**无核实依据须标「待核对官方当前口径」，不得估算填充**）**并等待项目负责人【再次确认】**；**未确认不得创建、不得先创建后补报**｜🔴 **不预填任何厂商免费额度数值 / 时长 / 计费口径**（属 §N.3 `S-05` 实测 / 核对项）｜`S-05` 判定口径不变（一般"只需换平台"、不回开 Gate B）｜**免费额度不足时不得自行降级 / 缩减测试项 / 采购** —— 须报缺口 + 给「付费方案 / 缩减范围（标注射程）/ 换平台族」三类选项由项目负责人裁决｜完成后**默认释放按量计费资源**｜**报告须逐项注明资源来源**｜❌ 以"免费试用"名义开通会自动转付费 / 续费 / 升级的资源｜**执行前置 ② 拆分 = 计费授权口径 ✅ 已定义 ／ 账号·凭据获取方式 🔴 未落实**
- **契约版本链**：`v0.1` → `v0.2 Gate A 修订版` → `v0.2.1 Worker CCR 对齐版` → `v0.2.2 D-049 对齐版` → `v0.2.3 ADJ-01 派生关闭版` → `v0.2.4 D-050 对齐版` → **`v0.2.5 D-051+D-052 对齐版`（当前，2026-09-20）** → `v0.3 DRAFT`（Gate B 并入）→ 冻结态（Gate C 通过）｜**`v0.2.5` 新增**：**§2.4**（生成批次）/ **§9.5**（rerun / `Insight` regen / `Hypothesis` regen 三层区分与不级联）/ **§8.6 第 9 条** / **§9.4 `D-052` 负例** / **§12 第 20 项** / **§13.5 两行关闭登记** / **§0.1 时序校正**
- 🔴 **`AC` 有效总数（2026-09-20 更新）= 132**（`AC-01`–`AC-126` 连续 + `AC-Q06-1`–`6`）—— **唯一动态来源 = `docs/09_TEST_PLAN.md`**；**旧快照 `AC-01`–`AC-100` 与 `AC-01`–`AC-115` 均不再完整**；本次新增 **`AC-116`–`AC-126`（11 项；`D-051` → 8 项 A–H，`D-052` → 3 项 I–K）**；**未重排任何旧编号，`AC-111` 未被修改**；**S03-E 的 121 项覆盖口径未按新 `AC` 重算**
  - 🚩 **2026-09-24 已更新为 143**（+ **`AC-127`–`AC-143`（17 项）**）—— **见 §C-PIVOT**；**上行为历史口径，保留不改写**
- **技术硬约束 = 84 条 `TC-01`–`TC-84`**（12 组）｜`TC-01` 对象两层（`Attempt`/`Insight` + ⑨ 步独立对象 `Hypothesis`；`Experience Asset` 非独立对象）｜`TC-06`「未知 / 未提供」只锁显式表达 + 不得误判为相似（物理表示 → `TQ08`）
- **技术问题 = 40 项**：A 关键人工决策 `TQ01`–`TQ05`（**Gate B，均未裁决**）｜B Integrator 收敛 `TQ06`–`TQ12` + `TQ15`–`TQ28`｜C 条件升级 `TQ13`/`TQ14`（**= 不引入，已证明**）｜D Worker 实现参数 `TQ29`–`TQ40`
- **Worker = 5**：`S03-A` 应用架构与技术栈 / `S03-B` 数据与状态 / `S03-C` AI Pipeline / `S03-D` 检索与比较 / `S03-E` 测试·Demo·部署；各独占 `docs/architecture/01`–`05_*.md`；**契约归 Integrator 独占，Worker 只可提 CCR**
- **`TC-34` 关键结构性硬禁**：**② 解析的输入不得含任何历史数据** ⇒ 历史对照类追问结构上不可能产生
- **S03-C 关键口径（`PROPOSED`）**：AI 参与 ②④⑦⑧⑨（⑥ 判定归 `S03-D`）｜**AI 永不产出 `Fact`**、永不产出计数 / 状态 / 数值相似度｜**`E1`/`E4` = 服务端结构性检查，`E2`/`E3` 才是 AI `Inference`**｜追问计数器 `Draft` 内累计不清零、计数时点 = 问题送达用户后｜HTTP 传输可拆，拆点固定 ⑦|⑧ 与 ⑧|⑨，**⑤⑥⑦ 必须同链**｜**⑨ 不等待 ⑧ 的 `E5`**
- **S03-D 关键口径（`PROPOSED`）**：**Level A 四维度各 1 主字段路径**（目标→`goal`｜方案·技术对象→`actual_attempt`｜条件→`condition`｜结果·现象→`actual_result`）｜**准入 = 命中维度集合非空**（禁 ≥2 维度 / 必须命中某维度 / 加权三类读法）｜维度三态 `matched`/`compared_not_matched`（**纯内部量**）/`uncompared`，**对外只发布命中集合 + 未比对集合**｜`uncompared` = 全局（源侧 unknown）+ 逐候选（源侧 ∪ 候选侧），**单一计算点 = ⑥**｜`version_env`/`failure_tag`/`project_id`/「语义相似」= **Level B 只解释**｜`result_status` **不参与 Level A 准入**｜排序 = `occurred_at` 辅助 + `attempt_id` 兜底，**唯一排序定义点 = 派生结果 `order_key`**（⑦ 与 UI 不得重排）｜**`N_引用` 与派生结果两条正交线**｜**三种"像 0 条"状态必须区分**（检索未完成 `RUNTIME` / `N_检索 = 0` / 历史库为空）｜**`TQ04` 候选 3 条**（`R-A` 结构化字段规则 + 必要时 LLM 判定 / 解释｜`R-B` embedding｜`R-C` 轻量 hybrid），**`PROPOSED` 推荐 = `R-A`**；embedding 对 V1 无足够收益（「语义相似」属 Level B ⇒ 收益被规则压缩为零）；**仍留 Gate B**
- **CCR**：已处理 2 项（`CCR-S03B-01`/`02` = `ACCEPTED`，并入 `v0.2.1`）；**未处理 CCR = 0**｜真 CCR 只用于 Gate A 之后 Worker 对既有契约提修改
- **剩余 BLOCKER = 0**；已关闭：`BLK-01` Cloud Worker = 开发期 LearnBuddy 并行任务、非运行时 Worker｜`BLK-02` Assets = 开发期共享资产总线｜`BLK-04` `TQ11` 只维护"当前有效比较结果"（重新检索**替换**）｜`BLK-05` `TQ10` 预演输入脚本属 Demo 操作方案｜`BLK-06` `TQ13`/`TQ14` 不引入
- **Spike = 5**：`SP-01` 在线托管数据层端到端连通性（P0）/ `SP-02` 解析 + 缺口 + 追问计数 / `SP-03` Level A 相关性判定（P0，**已执行**）/ `SP-04` grounding 与 ⑧⑨ 输出契约 / `SP-05` Demo Level A 命中可控性 —— 除 `SP-03` 外**均仅判断、未执行**
- **`SP-03` 结果 = `INCONCLUSIVE`**（`30_SPIKES/retrieval/`，全标 `DISPOSABLE / NON-PRODUCTION`，**未改任何 canonical**）：`H1`–`H10` **10/10 通过**｜**主实验完成 24 次；随后新增 24 次，扩展至总计 48 次独立判定**（= 8 CASE × 6 RUN；**48 已含前 24，不是 72**）｜`related` 翻转 0｜`unknown→matched` 0｜Level B 准入 0｜数值相似度 0。**关键发现**：`related` 与 `uncompared` **完全稳定**，但 **`matched` 集合 5/8 CASE 随运行变化**（漂移方向 100% 过判、漏判 0）⇒ 不能 `PASS`；门槛未达 `FAIL` ⇒ **唯一可给 = `INCONCLUSIVE`**。**漂移来源（已收窄口径）**：**已验证「`matched` 判据未被显式定义」是重要来源之一**（观测读法 α「同一件事」vs β「同一类事」，6 会话中 4 个用 β）；**受环境限制（`temperature`/`seed` 不可固定、无 API 级重复调用、无引擎级 Structured Output）不能完全分离规则歧义与模型随机性的贡献** ⇒ **不得写成"不是模型能力不足""根因就是 canonical 未定义""已证明不是模型随机性"**。→ 判据**已由 `D-050` 结清（采纳 α / 严格语义重叠）**，但**其是否解决稳定性须由 `SP-03R` 实测**。**架构性收获**：unknown / `Inference` / Level B / `result_status` 排除与 `related` 派生**全部由程序保证**（模型只看到不含上述字段的投影）。**报告项**：`BLOCKER` 无（`TQ04` 定稿前置"可交付性"证据仍未满足）｜`CCR` 无｜`PRODUCT SEMANTIC CONFLICT` 无｜**`DECISION REQUIRED` 1 项 → 已由 `D-050` 结清**｜**`TQ09` 需 Integrator 关注 = 是**（技术层必须留痕原始判定返回）｜建议 **`SP-03R` 补测**（前置 = `D-050` 判据 + 引擎级 Structured Output + 可固定采样参数；**复用同一 `SP-03_cases.json`，Gold 不得修改**；**需人工批准后执行，尚未执行**）
- **`SP-03` 报告修正（2026-09-19，`SP-03-REPORT-CORRECTION`）**：只改 `30_SPIKES/retrieval/SP-03_LevelA_相关性判定可行性.md` 一个文件；**未改任何 JSON / runner / Gold / canonical**。① 全文计数口径统一为「主实验 24 次 + 随后新增 24 次 = 总计 48 次」，**明令禁止 24 + 48 = 72 读法**；② 根因措辞收窄为「规则歧义已被验证为重要来源；受测试环境限制，不能完全分离规则歧义与模型随机性各自的贡献」，并在 §C.1 新增第 5 条环境限制；③ `SP-03 RESULT` 保持 `INCONCLUSIVE`（不得因 `D-050` 改 `PASS`）；④ 文末新增 **§P `POST-DECISION ADDENDUM`**（`D-050` 非当时输入 / 不得反向修改原始结果 / 成为 `SP-03R` 前提 / 稳定性须 `SP-03R` 实测 / `TQ04` 仍留 Gate B）。**遗留（按任务边界未改）**：§I.3 用「3/144 ≈ 2.1%」、§M-3 用「1.6%」，两处分母不同（144 vs 全体 180），如需统一须单独授权。
- **`SP-03R`（`D-050` 严格语义重叠复测）已执行 = `PASS`（2026-09-19）**：前提 = `D-050` 已 `CONFIRMED`（**不重新讨论 `D-050`**）；**未改任何 SP-03 产物（一字未改，时间戳可核验）、未改任何 canonical、未创建 `Decision ID`、未 `CONFIRM` `TQ04`、未进入 `S03-E`**。**主矩阵 24 / 24**（8 CASE × 3 RUN）｜**扩展后总计 48 / 48**（8 CASE × 6 RUN；**48 已含前 24**）｜**`H1`–`H10` = 10/10**｜**新增 `R1`–`R8` = 8/8**（主矩阵与扩展总计均通过）。**关键反转**：SP-03 的失败点（`matched` 集合 5/8 CASE 漂移，100% 过判）**本次消失 —— 0/8 CASE 漂移**；`matched` / `related` / `uncompared` 三项 **8/8 CASE 完全一致且与 Gold 完全一致**（`related_flip_cases = []`、`unstable_uncompared_set = []`、`schema_violations = 0`、Gold 偏差 0），**32 个 Level A 维度槽位零漂移**（判定会话实际产出 30 维度对 × 3 = 90 / × 6 = 180 条）。**SP-03「未固定」边界维度全部收敛**（SP-03 命中数 → 本次命中数）：`CASE-05.condition`(55 vs 50) 4/6→0/6｜`CASE-08.condition`(50 vs 70) 4/6→0/6｜`CASE-05.goal` 3/6→0/6｜`CASE-04.actual_result` 2/6→0/6｜`CASE-01.actual_result`(R1) 2/6→0/6｜`CASE-02.goal`(R2) 1/6→0/6。**判定机制**：6 个全新上下文的独立判定子会话，提示词**显式禁止读取 / 搜索本机文件与调用工具** ⇒ 结构上看不到 Gold；输入 = 与 SP-03 同一的 30 个可比对维度对。**⚠️ 射程限定（必须随结论引用）**：`temperature`/`seed` 仍不可配置、无 API 级调用、无引擎级 Structured Output ⇒ 只能主张"本次可执行环境条件下、判据显式化后未再观测到漂移"，**禁写**"已证明模型随机性不再是来源""任何条件下都稳定""生产必然可复现"；**SP-03 §N 三项前置仅第 1 项（判据显式化）落实**。**报告项**：`TQ04` **仍留 Gate B = 是**（只能写"`R-A` 可交付性获正向实验证据"，**禁写"`TQ04 = R-A 已确认"**；SP-03 登记的"可交付性前置"已正向回答、不再为待满足项；**未出现必须改用 `R-B`/`R-C` 的反例**）｜`TQ09` **需 Integrator 关注 = 是**（M-1 获正向证据；M-2 留痕要求继续成立并被再次验证；新增 N-5：**验收粒度须细化到"维度级判定产物"**，仅以 `related` 为口径无法发现该类风险；**不由本 Spike 关闭**）｜**`BLOCKER` 无**｜**`CCR` 无**（登记 1 项 Integrator 收敛项：`04_RETRIEVAL` §D.2 是否回写 `D-050`）｜**`PRODUCT SEMANTIC CONFLICT` 无**｜**`DECISION REQUIRED` 无（新增裁决项 = 0）**，另登记 **1 项 Integrator 观察项（非阻塞）**：`CASE-05.actual_attempt`（「调整热风参数」vs「调整送风参数」）在 SP-03 与 SP-03R 中均 **6/6 判 `matched`**、未造成漂移、不违反任何 R 项，但**不在 `D-050` 显式例枚举中** ⇒ 残余语义边界｜**是否需要新 Spike = 是，但性质 = "实现期验收性复核"**（引擎级 Structured Output + 可固定采样参数 + 选定模型/provider 后；**非"补测稳定性"**，该问题已正向回答），**未批准、未启动**。**产物（9 项，`30_SPIKES/retrieval/`，全标 `DISPOSABLE / NON-PRODUCTION`；未写入 `src/`）**：报告 `SP-03R_LevelA_严格语义重叠复测.md`（A–P）｜`SP-03R_results.json`｜`SP-03R_model_input.json`｜`SP-03R_raw_model_output.json`｜`sp03r_verdicts_run-1..6.json`｜`sp03r_runner.py`｜`sp03r_dim_stability.py`｜`SP-03R_dim_stability.txt`｜`SP-03R_run_log.txt`；**只读复用** `SP-03_cases.json`（Gold 未改）。**方法经验**：① 把"独立性"写成**结构性约束**（禁读文件）而非承诺，否则判定会话可能被 Gold 污染、证据作废；② `PASS` 后必须立即写"射程 + 不得主张清单"，因不可固定采样参数时"一致性成因"不可分离；③ 与前次失败报告做**逐点反转表**（不稳定 CASE / 未固定维度的命中数前后对照）最能自证，且天然暴露残余边界；④ **不改原产物要留可核验痕迹**（另存新命名 + 时间戳回证）；⑤ 稳定性统计**下钻到维度槽位层**，并区分"交给判定会话的可比对维度"与"规则写定的 uncompared 槽位"。
- **`20_INTEGRATION/S00-03_技术决策包.md`（2026-09-20，S00-03-INTEGRATOR，A–S 共 19 节）= Gate B 前唯一技术决策包**（**2026-09-20 已做 POST-INTEGRATOR HUMAN DECISION PATCH：顶部新增《POST-INTEGRATOR HUMAN DECISION STATUS》、§A.2/§A.3/§P.3/§Q/§R/§S 就地补注；原 Integrator 推理一字未改**）：**原 Integrator 状态 = `NEEDS DECISION`（保留为历史值，不得改写为当时即 `PASS`）；当前 = `DR-01` → `D-051` `CONFIRMED`（人工选 C 收窄版）、`DR-02` → `D-052` `CONFIRMED`（人工选 B）⇒ 当前 `DECISION REQUIRED` = 0**。**`TQ01`–`TQ05` 仍全部 `PROPOSED`、均未 `CONFIRM`（五项全留 Gate B）**。**`TQ01`** = 必须有服务端 + 单体（形态层：`A1` Serverless 单体全栈首选 / `A2` 长驻单进程轻量单体等价备用；`A3` 前后端分离仅在被明确要求时；**形态与具体框架名必须分层，框架不作独立人工决策项**）｜**`TQ02`** = 托管 PostgreSQL（`DP-A`；子形态随 `TQ01` 宿主；`DP-B` BaaS 不作首选；`DP-C` 轻量托管 SQL 第三候选；本机 DB 排除；**V1 不需要 Vector DB / Redis / Graph DB / 独立搜索引擎**，后者标 `PROPOSED`）｜**`TQ03`** = `LP-1` 服务端代理 + 保留 provider 抽象层 + `MP-1` 单模型起步 + 原生受约束解码 + 服务端 schema 硬闸门（**不需要流式 / 不需要 embedding**；浏览器直连、短时凭据直连均排除）｜**`TQ04`** = `R-A`（准入 = `matched_level_a_dimensions` 非空 ⇔ `related`；`R-B`/`R-C` 不推荐；**仍留 Gate B**）｜**`TQ05`** = `D-A` 首选 / `D-C` 等价备用（`D-B` 仅在被明确要求时；**`TQ02` 与 `TQ05` 严格分离、不得绑定**）。**普通 TQ 35 项**：`INTEGRATOR RESOLVED` 21（`TQ06`–`TQ12` + `TQ15`–`TQ28`）/ **维持不引入 2**（`TQ13`/`TQ14`，不升格、不建 ID）/ `DEFERRED IMPLEMENTATION` 12（`TQ29`–`TQ40`）。**`DECISION REQUIRED` = 2 项（§R）**：**`DR-01`** ⑧⑨「显式重新生成」产物语义（PROPOSED = 方案 C 分层并存：当前有效至多 1 条 + 不自动状态迁移 + 不引版本号）｜**`DR-02`** `CASE-05.actual_attempt`（「调整热风参数」vs「调整送风参数」）边界判据与 `TE-130` 期望值（PROPOSED = `compared_not_matched`；**不冻结期望值，`TE-130` 继续挂起**）。**`SP-01` TEST TARGET PACK 已形成（只设计不执行；Primary = `D-A` + 托管 PG 按量 / Fallback = `D-C` + 长驻；10 项验证 + PASS/FAIL + 回开 `TQ02`/`TQ05` 映射 + 「只换 provider/host」情形；平台级候选待启动时落名）**｜**`SP-02`/`SP-04` 建议推迟到「开发实现阶段」（最晚 = 对应步骤实现开工前）；`SP-05` 建议推迟到彩排阶段（Gate C 前）**｜**Contract Delta = 24 项（`CD-01`–`CD-24`，依赖 Gate B 1 项；未写回契约）**｜**Architecture Landing Plan = 11 份文件（`00_ARCHITECTURE_OVERVIEW` … `10_DEPLOYMENT`；未创建）**｜**Gate B Ready = `READY FOR SP-01`（POST-INTEGRATOR 改写；原值 = 是，属历史表述；`SP-01` 非 BLOCKER 但为 `TQ02`/`TQ05` 最终裁决前置）**｜**BLOCKER / CCR / PRODUCT SEMANTIC CONFLICT 均 = 无**。
- **Integrator 新增的「承重解释」5 项（已收敛但建议项目负责人复核）**：① **归档 × 已定稿 `n_retrieval` = 不追溯改变**（判为**可由 canonical 唯一推出**：`D-043` `F-1` 的"**新的** `N_检索`"限定词 + `D-045` `TR-6`/`TR-7` + `TC-58`；**并推出实现约束 = `N_检索` 必须是检索事件时刻的快照、不得读取时实时重算**）② `matched_level_a_dimensions` 非空 ⇔ `related` 冻结（契约 §9.4 已明示该准入规则属 `S03-D`/Integrator 收敛项）③ **⑨ 不等待 ⑧ 的 `E5`**（由 `D-030` + `D-022` + `D9` 推出；回应 `S03-C` §K.4 的"第二处潜在待裁决项"）④ `candidate → rejected` 的 `trigger_kind` 补齐 = 留痕完备性（触达 canonical 枚举文本，建议项目负责人过目后再写入 = `CD-07`）⑤「V1 不需要独立搜索引擎」= `PROPOSED`（canonical 未显式提及，属类推排除）。
- **Integrator 冻结的 `TQ09` / `TQ10` / `TQ18` / `TQ19`**：**`TQ09`** 技术层最小留痕集合 = ① 原始判定返回 ② 投影输入 ③ **维度级判定产物**（每候选 × 每 Level A 维度的三态 + 一句理由）④ 判定运行标识 ⑤ 模型 / prompt 标识；全部属技术面、**不得进入产品层 L4**；**验收粒度须到维度级**；内部检索分数建议**不落库**；其"引擎级 Structured Output + 可固定采样参数条件下的可复现性"= **`DEFERRED`（`TE-POST-AI-REPRO`）**｜**`TQ10`** 固定 Demo 工作空间 / `seed` 只预置 `Attempt` 层 / `reset_demo_baseline` 属运维动作非产品功能 / 现场脚本属 Demo 操作方案 / **seed 限制**（"曾被引用后被归档"夹具无法 seed ⇒ `AC-74`/`AC-75`/`AC-100` 须现场先建引用再归档）｜**`TQ18`** 采用 `S03-B` §C.4.3 的 `field_key` 清单为字段组映射 + **硬要求：追问后新增的 `condition` `Fact`/`Extraction` 必须归入 `level_a.condition` 同一比较输入，不得漏出**｜**`TQ19`** Level A 四维度 → `goal`/`actual_attempt`/`condition`/`actual_result`（每维度恰 1 主字段路径；允许 `Extraction`；判据引用契约 §9.4）。
- **Integrator 跨 Worker 一致性 §C = 18 项**，其中 **🔴 3 项须在 Local Landing 前处理**：① 契约 §9.4 判据**回写** `04_RETRIEVAL_AND_COMPARISON.md` §D.2（`CD-04`）② **措辞口径冲突**：`S03-A` §3.2 写"C-B / C-D 之间的选择**不产生返工**"与 `S03-E-CORRECTION-01` 第 3 项收窄后口径冲突 ⇒ **以 `S03-E` 为准，`S03-A` 该表述属历史表述、后续不得沿用**（`CD-08`）③ **命名空间冲突**：`docs/architecture/` 现有 Worker 文件名（`00`–`05`）与任务书 §十八 Landing 目标名（`00_ARCHITECTURE_OVERVIEW` … `10_DEPLOYMENT`）在 `04`/`05` 上含义不同 ⇒ Landing 前须确定映射（决策包给出 α/β/γ 三方案，未执行）。其余 15 项为信息性不一致（契约版本引用 `v0.2`/`v0.2.1`/`v0.2.3`/`v0.2.4` 各异；`S03-C` §K 的 `DECISION REQUIRED` 已由 `D-049` 关闭；`S03-D` 记"`SP-03` 未执行"属历史；`TE-*` 非 canonical `AC` 等）。
- **条件 `AC` 依赖枚举统一（Integrator）**：涉及 **`TQ01` / `TQ04` / `TQ05`**（必要时 `TQ03`，若具体 `TE` 真实需要 LLM 调用）；**不得**写成"仅 `TQ04` / `TQ05`"（该写法漏 `TQ01`）；数量口径保持 **16**。
- **非阻塞遗留**：① `[R4]` 竞品 `TO_VALIDATE`；② `08` 可验证性呈现方式 → UI；③ `D-034` 补录 exact wording → UI / 文案；④ `S03-D` 新登记：`TQ18` 条目归属必须保证"凡语义属某 Level A 维度的条目均归入该维度比较输入"；**归档是否追溯改变已定稿 `n_retrieval`** 口径待 Integrator 确认（`S03-D` 读法 = 不追溯改变）；**⑧/⑨「显式重新生成」的产物语义**未在 `S03-B`/`S03-C` 定义（属 Integrator，若判为不可唯一推出须升级人工）→ ✅ **已由 `D-051` 结清（2026-09-20，`CONFIRMED`）**；⑤ **`04_RETRIEVAL_AND_COMPARISON.md` §D.2 是否需要回写 `D-050` 判据 = 后续 Integrator 收敛动作**（本轮按任务边界未改该文件）；⑥ **S03-E 十项 Integrator Handoffs**：`TQ10`｜`TQ09`（验收粒度须到**维度级判定产物**）｜**`TQ18`/`TQ19`（高优先级：须保证"凡语义属某 Level A 维度的条目均归入该维度比较输入"，否则 `condition` 漏检追问补齐值 → 命中集合与 `N_检索` 失真）**｜归档 × 已定稿 `n_retrieval`｜⑧⑨「显式重新生成」产物语义（**若 Integrator 判为不可唯一推出 ⇒ 升级 `DECISION REQUIRED`，不由 Worker 处理**）→ ✅ **已升级并关闭 = `D-051`**｜`CASE-05.actual_attempt` 残余边界 → ✅ **已升级并关闭 = `D-052`**｜POST-GATE-B reproducibility｜`S03-A`~`E` 跨文件接口一致性｜**seed 无法构造 archived-with-reference 夹具**的限制｜**`AC` 范围口径（2026-09-20 更新）= 132**（`AC-01`–`AC-126` + `AC-Q06-1`–`6`）

## C-END. `SP-01a` / Phase 2 现状细则（2026-09-20 后段·续 2 追加）

> **本节为追加段**（原有 §A / §B / §C 未改）。上位权威 = `docs/CHANGELOG.md` + `20_INTEGRATION/`（`SP-01a_CREATE_READY_PACK.md` **§L–§N**｜`SP-01a_CREATE_READY_PATCH_REPORT.md` **§16–§18**｜`S00-03_技术决策包.md` **§N.12+ ~ §N.12++++**）。

- **`CREATE AUTHORIZATION` = `GIVEN`**（2026-09-20，人工原话「A：确认创建」；覆盖 `PACK §L.12` 全部内容）⇒ **`Phase 2` = `STARTED` / `Current Gate` = `PHASE 2 IN PROGRESS`**；**射程 = 仅 `SP-01a` disposable probe ≤6h**（🔴 **≠ `SP-01a` PASS ≠ `SP-01 PASS` ≠ 生产架构 / 平台 / 入口 / 正式安全策略确认 ≠ 对 `TQ01`–`TQ05` 的 `CONFIRM`**）。
- **双轨模式（本轮启用）**：`ChatGPT` 轨（实时指引 / 控制台人工操作 / 规格合规 / 标志位判定 / **不改工作区**）+ `LearnBuddy` 轨（读真实文件 / 落盘已发生动作 / 维护 PACK·PATCH REPORT·决策包·CHANGELOG·memory / 状态机 / Phase 2 tracker / 🔴 **不登录控制台·不伪造云端状态**）。🔴 **影响 `CREATE`/`ENABLE`/`DELETE`/`DESTROY`/`BILLING`/`RESOURCE CHANGE`/`Gate`/`Spike Result` 的 ChatGPT 轨状态变化必须同步落盘**；反之 LearnBuddy 不得推断云端现实。
- 🚩 **【PHASE 2 RESOURCE EVENT LEDGER】唯一权威位置 = `PACK §N.2`**（`P2-E01`–`P2-E05`；格式 13 字段；推进 = **`ONE EVENT → SYNC → NEXT EVENT`**；🔴 禁存密码 / `SecretId` / `SecretKey` / `PGPASSWORD` / 连接串·Secret / `Token`）。
- **账号级现实快照（🟠 `ACCOUNT-LEVEL / PROJECT-OWNER REPORTED FACT`；🔴 AI 未复核）**：`R2` = **`CREATED`**（上海 / 免费体验版 / bundled PG = `UNUSED BUNDLED CAPABILITY` 冻结不用 / 静态托管 `NOT INITIALIZED`）｜`R6-A` VPC = **`CREATED`**（`learn-sp01a-vpc` / `10.20.0.0/16`）｜`R6-B` 子网 = **`CREATED`**（`learn-sp01a-subnet-gz6` / `10.20.1.0/24` / 广州六区）｜**`R6-C` 安全组 = `AUTHORIZED` / `IN CONFIGURATION` / 🔴 `NOT YET CONFIRMED CREATED`**（`learn-sp01a-pg-sg` / 入站仅 `10.20.1.0/24 → TCP:5432 → ALLOW`）｜`R3` = **`PRE-CREATE`**（🔴 **未创建 / 未起计费**）｜`R1` = `NOT CREATED`｜Function URL = `NOT ENABLED`｜Probe 本地包 = `READY（NOT DEPLOYED）`｜`S-01`–`S-07` = 全 **`NOT EXECUTED`**。
- 🚩 **`R6-C` 新依赖处置**：触发 = `R3` 创建页 **`Security Group` 必填** + 广州无现成安全组 ⇒ `R3` = `PAUSED BEFORE CREATION`、**`RESOURCE CHANGE REQUIRED` 曾 = `YES`**（🔴 **禁写"从未发生"**；历史两次 `YES` 均保留 = 旧 API Gateway + `R6-C`）⇒ 人工明确批准 ⇒ **`YES → RESOLVED`**；`BILLING CHANGE REQUIRED` = **`NO`**（0 元）。
- 🔴 **禁写清单（本轮新增）**：不得写 `R6-C = CREATED`、不得写 `R3 = CREATED`（未收到「安全组已创建」明确事实前）；不得把 **PostgreSQL 18**（`R3` 创建页实现级参数）升级为**最终生产 PostgreSQL 版本决策**；不得把 `R6-C` 射程（`SP-01a` `R3` 私有访问）扩大为正式生产安全策略。
- **其它标志位**：`RESOURCE CHANGE REQUIRED` = `RESOLVED`｜`BILLING CHANGE REQUIRED` = `NO`｜`BLOCKER` = `NO`｜`DECISION REQUIRED` = `0`｜`PROCESS DEVIATION` = `YES`（R2 提前创建，不变）｜`TQ01`–`TQ05` = **未改变**（全 `PROPOSED`、仍留 Gate B）｜**`SP-01a` = `IN PROGRESS` / `NOT PASS`**｜**`SP-01` = `NOT COMPLETE`**。
- **下一人工动作（唯一）**：完成 `R6-C` 创建（入站仅 `10.20.1.0/24 → TCP 5432 → ALLOW`）→ 明确报告「**安全组已创建**」⇒ **下一轮仅**同步 `R6-C = CREATED` ＋ `R3 = READY FOR FINAL CREATE` **然后停止**。
- **`R3` 创建页实见配置（`PRE-CREATE`，实现级）**：按量 ｜ 广州 ｜ `learn-sp01a-vpc`/`learn-sp01a-subnet-gz6` ｜ 高可用版 ｜ 广州六区 + 七区 ｜ 本地 SSD 10 GB ｜ 1 vCPU / 2048 MB ｜ **`0.57 元/小时`**（✅ 与 `RF-09`/`RF-10` B 类报价一致）｜ UTF8 ｜ 异步 ｜ 页面大版本 **PG 18**。
- **成本**：本轮**新增付费项 = 0**；`R3` 未创建 ⇒ 持续计费尚未开始；总费用口径不变 **≈3.48 元（6h 上界 ≤3.5 元）**；**唯一持续计费项 = `R3`**（`0.57 元/h ≈ 13.68 元/天`，测试结束当天必须销毁）；自动续费 = `NO`。
- 🚩 **记忆维护（本轮）**：`MEMORY.md` 因**超注入上限被截断** ⇒ **合并去重重写为钩子层**，细则下沉至本文件；历史过程完整保留于 `docs/CHANGELOG.md` + `.learnbuddy/memory/2026-09-20.md`（🔴 **未丢唯一来源信息**）。

---

## C-PIVOT. `D-053` / `D-054` 现状细则（2026-09-24 追加｜🔴 **本节取代 §C 中与云架构相关的表述**）

> 上位权威 = `docs/DECISIONS.md` `D-053` / `D-054` + `docs/07_TECH_ARCHITECTURE.md` §5 + `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md` + `docs/CHANGELOG.md`（2026-09-24 条目）。

- **`D-053` = `CONFIRMED`（人工，2026-09-24）｜V1 主架构 = Local-first Harness-style Web App**：形态 = **Web UI + Local Workspace Folder + Configurable LLM +（必要时）Thin LLM Access Layer + Vercel Demo / Review Deployment**；**Web 的主要目的 = 让评委方便打开、查看和体验产品**；**不以长期运营 SaaS / 多人在线系统 / 云端科研数据平台为 V1 目标**。
- **`D-054` = `CONFIRMED`（人工选择方案 C）｜V1 RAG 仅 = Structured Experience RAG**（= 用户自身历史 `Attempt` 的结构化经验检索 + 证据上下文组装 + Grounded Generation）；**`ResearchContextProvider` 仅预留接口、V1 不实现**；**未来如实现须重新进入 Scope / Decision**。
- 🔴 **`D-053` 不改变产品**：`D1`–`D-10` / `R1`–`R6` / `D-011`–`D-052` / `ADJ-01` / `Q16` / `D9` 十步 / `Attempt`·`Insight`·`Hypothesis`·`EvidenceRef` / `Fact`·`Extraction`·`Inference` / `Draft`·`Formal` / archive / `Level A`·`B`·`C` / `N_检索`·`N_引用` / `E1`–`E5` / `History-grounded` **全部不变**。
- **架构基线要点**：**Primary Persistence = Local Workspace Files（🔴 非 PostgreSQL）**；**云 PostgreSQL 不是 V1 required dependency**；**Vercel = Review / Demo 目标（🔴 不是科研主数据库、不是 Production SaaS）**；**浏览器只有用户主动授权后才能访问指定 Workspace，未授权不得读取本地目录**；**逻辑对象不得因改为文件而扁平化**；**物理 schema / 目录名 / 文件名 = 实现参数（Integrator 收敛）**；**不建立用户可见版本系统**。
- **RAG 边界要点**：**corpus 不扩大**（`Draft` 不进 `N_检索`；archived 按已有规则排除；**Research Document / Web Search / 模型一般知识不计入 `N_检索`**）；🔴 **`RAG ≠ Vector DB`**（禁 Pinecone / Milvus / Weaviate / Chroma / pgvector / Elasticsearch / Redis Vector / embedding database 作为必需组件）；🔴 **不得用 `cosine similarity score` 替代 `D-050` 严格 `matched`**；**未来分层 Layer 1 / 2 / 4 启用、Layer 3 `RESERVED ONLY`**；**`History-grounded` 定义不变**。
- **安全 / 隐私红线**：🔴 **不得宣称**「100% offline」「zero data transmission」「absolute privacy」；**只发送最小必要上下文**；🔴 **不得默认上传整个 Workspace**；🔴 **凭据不得落入 Workspace 文件 / 仓库 / 日志 / 报告 / 前端 Bundle**。
- **`TQ01`–`TQ05` 重新基线（🔴 五项均未 `CONFIRM`）**：`TQ01` = 原 Cloud Serverless / 长驻单体候选空间失效；新问题 = 前端主导 Local-first Web + 是否需要 Thin Server Layer + Web stack（**框架 / 状态库 / 路由 = 实现参数**）｜`TQ02` = **Primary = 本地文件**；**原 Managed PostgreSQL 作为 V1 Primary = `SUPERSEDED BY D-053`**（🔴 **不得说 PostgreSQL 技术错误**）｜`TQ03` = 🔴 **未裁决**（`DR-03`）｜`TQ04` = 🔴 **未裁决**（**`PROPOSED R-A`**；`SP-03R` 规则级正向证据在 Local-first 下仍有效）｜`TQ05` = **Vercel = Demo 入口（定位已确认）**；可行性待 `SP-06`。
- 🔴 **`DECISION REQUIRED` = 2**：**`DR-03`｜LLM Request Path**（A Browser Direct / B Vercel Thin Proxy / C Hybrid；**`PROPOSED` 推荐 = C 收窄形态：默认 A、必要时 B、不预置服务端 Key**）｜**`DR-04`｜Credential Persistence**（`K-A` memory·session only / `K-B` browser-local / `K-C` 其它；**`PROPOSED` 推荐 = `K-A` 默认 + `K-B` 显式可选，默认不持久化**）。🔴 若选 B ⇒ **必须** SSRF / Open Proxy / 内网 / metadata endpoint / 仅 `https` / **host allowlist** / URL validation 防护；🔴 **不得"用户输入任意 URL，Vercel 无条件代请求"**。
- 🔴 **`SP-01a` = `SUPERSEDED BY D-053` / `INCOMPLETE HISTORICAL SPIKE`**（🔴 **不是 `FAIL`**；**架构改变不是探针失败**）；🔴 **不得写"从未开始"、不得写"未创建任何云资源"**。
  - **历史 Phase 2 事实（全部保留）**：`R2` = `CREATED`（上海 / 免费体验版 / 静态托管 `NOT INITIALIZED`；bundled PostgreSQL = `UNUSED BUNDLED CAPABILITY`）｜`R6-A` VPC = `CREATED`（`learn-sp01a-vpc` / `10.20.0.0/16`）｜`R6-B` 子网 = `CREATED`（`learn-sp01a-subnet-gz6` / `10.20.1.0/24` / 广州六区）｜**`R6-C` 安全组 = `AUTHORIZED` / `IN CONFIGURATION` / 🔴 `NOT YET CONFIRMED CREATED`**（`learn-sp01a-pg-sg`；入站仅 `10.20.1.0/24 → TCP:5432 → ALLOW`）｜`R3` = `PRE-CREATE`（🔴 未创建 / 未计费）｜`R1` = `NOT CREATED`｜Function URL = `NOT ENABLED`｜probe 包 = `READY`（`NOT DEPLOYED`）｜`S-01`–`S-07` = `NOT EXECUTED`。
  - 🔴 **立即停止后续创建链**：不得创建 `R3` / `R1`、不得启用 Function URL、不得初始化旧 `R2` 静态托管 Probe、不得部署旧 Probe、不得执行旧 `S-01`–`S-07`。
  - 🔴 **禁写清单**：未收到「安全组已创建」前 ⇒ 不得写 `R6-C = CREATED` / `R3 = CREATED`；`PostgreSQL 18` 仅为 `R3` 创建页实现级参数，**不得升级为生产版本决策**；`R6-C` 射程不得扩大为正式生产安全策略。
- 🔴 **Legacy Cloud Cleanup Plan = 已生成 / 未执行**（在本轮 Pivot 文档 §P）；**本轮未删除任何资源**；清理须**项目负责人另行明确批准**；🔴 **`R6-C` 第一步 = 先确认其"实际是否存在"**（**不得假设存在，也不得假设不存在**）；删除顺序 = 安全组 / 子网 → VPC（**先上层依赖、后下层承载，不得并行**）。
- 🔴 **`SP-06` = Plan 已写 / `NOT EXECUTED`**：`30_SPIKES/local_first/SP-06_LOCAL_FIRST_FEASIBILITY_PLAN.md`（**`S6-01`–`S6-20` 共 20 项**；**`SP-06 EXECUTION APPROVAL REQUIRED`**）；🔴 **未创建 `SP-LF-01` 或第二套编号**；🔴 **`SP-06` 的 PASS 不得写成对 `TQ01`/`TQ03`/`TQ04`/`TQ05` 的 `CONFIRM`**；**File System fallback 暂不自动决定**（仅当 `SP-06` 证明主路径存在影响比赛演示的兼容性问题才升级）。
- **契约 = `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md` `v0.2.6 DRAFT / D-053 Local-first + D-054 Structured Experience RAG 对齐版`**（🔴 未冻结 / 未 `CONFIRMED` / 不可作实现依据）；**新增 §0.4 / §13.7**；🔴 **不得直接进入 `v0.3`**（`v0.3 DRAFT` 仍保留给 Gate B 并入）。
- 🚩 **`AC` 有效总数 = 143**（`AC-01`–`AC-126` + `AC-Q06-1`–`6` + **`AC-127`–`AC-143`（17 项：Local-first 12 + Structured Experience RAG 5）**）；🔴 **未重排任何旧编号**；**唯一动态来源 = `docs/09_TEST_PLAN.md`**。
- **标志位（2026-09-24）**：`BLOCKER` = `NO`｜`CCR` = `NO`（未处理 = 0；`D-053`/`D-054` **不是 CCR**）｜`PRODUCT SEMANTIC CONFLICT` = `NO`｜`RESOURCE CHANGE REQUIRED` = `RESOLVED`（🔴 历史两次 `YES` 保留，禁写"从未发生"）｜`BILLING CHANGE REQUIRED` = `NO`｜`DECISION REQUIRED` = `2`｜`PROCESS DEVIATION` = `YES`｜`DEPLOYMENT TARGET ISSUE` = `NO`。
- **当前流程（唯一有效）**：`D-053 / D-054 Landing → Local-first Architecture Rebaseline → SP-06 Plan → 项目负责人批准 SP-06 → SP-06 → TQ01–TQ05 余项 Gate B → v0.3 DRAFT → Local Landing → Gate C → Coding`；🔴 **不得直接从本轮进入 Coding**；🔴 **旧时序（含 `SP-01` 为 `TQ02`/`TQ05` 前置 P0 证据，以及 `SP-01a`/`SP-01b` 两段式）已被 `D-053` supersede**（历史文本保留不改写）。
- **本轮边界（🔴 未执行）**：未写正式代码 / 未创建 `src/` / 未部署 / 未创建 Vercel Project / 未运行 `SP-06` / 未创建或删除云资源 / 未启用 Function URL / 未运行 `S-01`–`S-07` / 未实现 PDF RAG·embedding·vector DB / 未进入 Gate C / 未 `CONFIRM` `TQ01`–`TQ05` / **未修改** `docs/architecture/01`–`05`（Worker 历史产出）与 `SP-03`·`SP-03R` / **未删除** `SP-01a_*` 文档与 `sp01a_probe/`（🔴 `SP-01a_CREATE_READY_PACK.md` 本轮**一字未改**）。
- ⚠️ **任务边界与文档内流程冲突（唯一一处）**：契约 `v0.2.5` §0.1 与决策包顶部时序 vs 本任务新时序不一致 ⇒ 按项目规则 **"不改文档 + 在报告中提示"**：**原文本保留**，**以"就地补注"并列登记两套时序并指明当前有效口径**。

---

## C-LLM. `D-055` / `D-056` 现状细则（2026-09-24 追加｜🔴 **本节取代 §C 与 §C-PIVOT 中与 LLM 路径 / 凭据相关的表述**）

> 上位权威 = `docs/DECISIONS.md` `D-055` / `D-056` + `docs/07_TECH_ARCHITECTURE.md` **§5.12** + `docs/09_TEST_PLAN.md`（`AC-144`–`AC-162`）+ `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（`v0.2.7 DRAFT`）+ `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md` **§W** + `20_INTEGRATION/S00-03_技术决策包.md` **§U**。

- **`D-055` = `CONFIRMED`（人工选 C）｜LLM 请求网络路径 = `Provider-dependent Hybrid`**；**`D-056` = `CONFIRMED`（人工选 A）｜凭据 = `Session-only Credential`**；**`DECISION REQUIRED` 由 2 → `0`**。
- 🔴 **`TQ03` 整体仍未 `CONFIRM`** ⇒ 状态 = **`PROPOSED` / `EVIDENCE READY FOR GATE B`**（**子项已裁决 ≠ `TQ03` 已裁决**）。
- **契约 = `v0.2.7 DRAFT / D-055 Hybrid LLM Path + D-056 Session-only Credential 对齐版`**（🔴 未冻结 / 不可作实现依据）；**新增 §0.4 D 节**；**§13.7 已更新**（`DR-03` → `D-055`、`DR-04` → `D-056` 关闭）；§14 第 4 条版本链已推进；**§15 新增 v0.2.7 行**；🔴 **`v0.2.7` 不得直接跳 `v0.3`**（`TQ04` 等 Gate B 技术项仍未裁决）。
- 🚩 **`AC` 有效总数 = 162**（`AC-01`–`AC-162` 连续 162 项 + `AC-Q06-1`–`6`）；**本轮新增 `AC-144`–`AC-162`（19 项：`D-055` 9 项 + `D-056` 10 项）**；🔴 **未重排任何旧编号**；**唯一动态来源 = `docs/09_TEST_PLAN.md`**。
  - 🔴 **就地补注（2026-09-24 GATE-B PRE-CONFIRM CORRECTION）**：上方「`AC` 有效总数 = 162（…+ `AC-Q06-1`–`6`）」**含算术矛盾** ⇒ **当前统一口径 = 连续 canonical `AC` 162 项 ＋ 独立 `AC-Q06` 6 项 ＝ 全部有效验收点 168**；🔴 只修正统计口径表述，未重编号 / 未并入 / 未新增；🔴 历史正确事实「`S03-E` 当时 115 + 6 = 121」不改。
- **落盘文件（Phase A）**：`docs/DECISIONS.md`（新增两条 + 编号空间列举 + S00-03 追加登记）/ `docs/06_AI_CAPABILITIES.md`（新增同步节 + 原 `DECISION REQUIRED` 行就地补注）/ `docs/07_TECH_ARCHITECTURE.md`（§5.5 两处就地补注 + **新增 §5.12**）/ `docs/08_UI_SPEC.md`（新增界面约束节）/ `docs/09_TEST_PLAN.md`（新增 `AC-144`–`AC-162`）/ 契约（文件头 + v0.2.7 说明 + §0.4 D 节 + §13.7 + §14 第 4 条 + §14.1 + §15）/ Pivot 文档（§U.1 就地补注 + **新增 §W**）/ 技术决策包（**新增 §U**）/ `docs/CHANGELOG.md`。
- 🔴 **`Legacy Cloud Cleanup` = `DEFERRED` / `NOT AUTHORIZED FOR EXECUTION`**（项目负责人明确推迟）；**本轮 `DELETED RESOURCES = NONE`**；🔴 **未修改 `R2` / `R6-A` / `R6-B` / `R6-C` 的实际云状态**；🔴 **`Legacy Cleanup Plan` 未改标为"已批准"**。

## C-SP06. `SP-06` 执行现状细则（2026-09-24 追加）

> 上位权威 = `30_SPIKES/local_first/SP-06/SP-06_EXECUTION_REPORT.md`（A–Q 共 17 节）+ `30_SPIKES/local_first/SP-06/MANUAL_OBSERVATION_CHECKLIST.md` + `docs/CHANGELOG.md`（2026-09-24 `SP-06` 条目）+ Pivot 文档 **§X**。

- **`SP-06` = 已执行（`APPROVED FOR EXECUTION` 由项目负责人明确给出，未再次申请）**；🔴 **严格按既有 `S6-01`–`S6-20` 执行，未删测试项、未降标准**；🔴 **未写正式代码 / 未创建 `src/` / 未部署 / 未创建或删除任何外部资源**。
- **整体状态 = 🔴 `CONDITIONAL PASS`**：`PASS` **7**（`S6-11`/`13`/`14`/`15`/`16`/`17`/`20`）｜`PARTIAL` **6**（`S6-02`/`03`/`07`/`12` + 结果记录制 `S6-18`/`19`）｜`PENDING MANUAL OBSERVATION` **7**（`S6-01`/`04`/`05`/`06`/`08`/`09`/`10`）｜`FAIL` **0**。
- **实测通过要点**：Chrome **`154.0.8037.57`** / Edge **`153.0.4234.48`** 均 `isSecureContext` + `showDirectoryPicker` 存在｜**改名后 `EvidenceRef` 仍按 ID 解析**｜损坏文件 / 目录不可访问 ⇒ 不崩溃 + 精确定位 + 可恢复｜**无数据库跑通 ⑥⑦⑧⑨⑩ 且 `EvidenceRef` 全解析**、正确排除 6 `Draft` + 5 `archived`｜**全程无数值相似度**｜`R-A` 三态可区分 + `D-050`/`D-052` 用例全符合｜5 个 provider 仅改配置分流（2 direct / 1 proxy / 2 unsupported，**unsupported 明确失败无静默 proxy**）｜**跨源实测：有 CORS 直连成功、无 CORS 直连被浏览器拦截**｜**SSRF 8/8 + 哨兵命中 0 + 通用代理端点 404**｜**凭据刷新后可用、无持久化载体泄漏、日志无明文**｜**无 PostgreSQL 跑通 `D9` ①→⑩**。
- 🔴 **未执行 / 未验证（必须与上条同读）**：`S6-01`（Vercel HTTPS 域名下唤起 picker，**本轮未创建 Vercel 资源**）｜`S6-04`/`05`/`06`（真实浏览器读写本地目录，**需真实用户手势**）｜`S6-08`/`09`/`10`（handle·permission 跨刷新/跨重启、撤销权限）｜`S6-18`/`19` 的 **Vercel 侧证据**。
- 🔴 **`TEST SPEC GAP`（🔴 不得用临时发明的阈值掩盖）**：**GAP-1** = `SP-06 Plan` 未定义**整体** `PASS` / `CONDITIONAL PASS` / `FAIL` / `INCONCLUSIVE` 的阈值 ⇒ `CONDITIONAL PASS` **仅作描述性汇总**，整体判据**待项目负责人裁定**；**GAP-2** = File System fallback **升级条件**（"影响比赛演示的兼容性问题"）**未定义为可操作判据** ⇒ 本轮**不升级 fallback**、**不改 `D-053` 的"暂不自动决定"口径**。
- **`TQ` 证据就绪度（🔴 均非 `CONFIRM`）**：`TQ01` = `PROPOSED`/`EVIDENCE PARTIAL`｜`TQ02` = `PROPOSED`/`EVIDENCE READY FOR GATE B`｜`TQ03` = `PROPOSED`/`EVIDENCE READY FOR GATE B`｜`TQ04` = `PROPOSED R-A`/`EVIDENCE READY FOR GATE B`｜`TQ05` = `PROPOSED`/`EVIDENCE INSUFFICIENT`。
- **环境（实测）**：Windows / Node `v22.22.2` / Chrome `154.0.8037.57` / Edge `153.0.4234.48`；🔴 **无模型 API 凭据**（⇒ ②④⑧⑨ 为 deterministic stand-in，输出显式标 `NOT_A_REAL_LLM_OUTPUT`）｜🔴 **无 Vercel CLI / 无登录态**。
- **标志位（`SP-06` 轮）**：`BLOCKER` = `NO`｜`CCR` = `NO`｜`PRODUCT SEMANTIC CONFLICT` = `NO`｜`DECISION REQUIRED` = `0`（新增）｜`BILLING AUTH REQUIRED` = `NO`（**费用 0 元**）｜`MANUAL AUTH REQUIRED` = **`YES`**（Vercel 部署）｜`MANUAL OBSERVATION PENDING` = **`YES`（7 项）**｜`DEPLOYMENT TARGET ISSUE` = `NO`（保留）｜`PROCESS DEVIATION` = `YES`（历史 `R2`）｜`RESOURCE CHANGE REQUIRED` = `RESOLVED`（历史两次 `YES` 保留）｜**`SP-06 TEMP RESOURCE CLEANUP` = `NOT APPLICABLE`**（未创建任何外部资源；🔴 **与 `Legacy Cloud Cleanup` 严格区分**）。
- **下一人工动作**：① 按 `MANUAL_OBSERVATION_CHECKLIST.md` 完成 7 项人工观测并回报；② （可选）Vercel **免费** Preview 部署以补 `S6-01` / Vercel 侧证据（🔴 触发付费即 `BILLING AUTH REQUIRED` + 停止）；③ 裁定 `TEST SPEC GAP`；④ 之后由项目负责人与 ChatGPT 审查 `SP-06` 结果，再决定是否进入 Gate B。🔴 **`SP-06` 完成后停止，不进入 Gate B。**
- 🔴 **禁用表述**：不得写"`SP-06 PASS` 已确认 `TQ01`–`TQ05`"｜不得写"Local-first 已可行"｜不得写"Vercel 部署可行"｜不得写"已删除云资源"｜不得写"已创建 Vercel Project"。

---

## C-GATEB. `D-057` + Gate B 最终裁决包（2026-09-24 追加｜🔴 **本节取代 §C-SP06 中"下一人工动作"相关表述**）

> 上位权威 = `docs/DECISIONS.md` **`D-057`** + `20_INTEGRATION/S00-03_技术决策包.md` **§V** + `20_INTEGRATION/S00-03_LOCAL_FIRST_RAG_ARCHITECTURE_PIVOT.md` **§Y** + `20_INTEGRATION/PRE_SUBMISSION_DEPLOYMENT_ACCEPTANCE.md` + SP-06 报告 **§R** + `docs/CHANGELOG.md`（2026-09-24 新条目）。

- **`D-057` = `CONFIRMED`（人工流程决策）｜`SP-06` 部署验证与真实浏览器人工验收延期至提交前**：剩余「Vercel 部署验证」+「真实浏览器目录权限生命周期人工观测」**不再阻塞 `Gate B` / `Gate C` / 正式开发启动**；**但仍是 `PRE-SUBMISSION ACCEPTANCE` 必做项**；允许序列 = **`Gate B` → `Gate C` → `Coding` → 提交前 Vercel + Chrome/Edge 真实 `Workspace` 验收**。
- 🔴 **`SP-06` 双层口径（不得混写）**：`HISTORICAL EXECUTION STATUS = CONDITIONAL PASS`（PASS 7 / PARTIAL 6 / **PENDING MANUAL 7** / FAIL 0，🔴 **未改为 `PASS`**）＋ `CURRENT PROCESS DISPOSITION = CORE ARCHITECTURE EVIDENCE SUFFICIENT FOR GATE B` ／ `DEPLOYMENT / BROWSER MANUAL ACCEPTANCE = DEFERRED TO PRE-SUBMISSION`。🔴 **7 项（`S6-01`/`04`/`05`/`06`/`08`/`09`/`10`）一条都未标 `PASS`、未删除、未伪造**；**`S6-18`/`S6-19` 的 Vercel 侧未验证登记保留**。
- 🔴 **`SP-06` `TEST SPEC GAP`（整体状态判据 / fallback 升级判据）本轮仍未裁定** —— 保持"待项目负责人裁定"，🔴 **未用临时发明的阈值掩盖**。
- **`PRE-SUBMISSION ACCEPTANCE`（新增，`PLANNED` / `NOT EXECUTED`）**：`PSA-01` Vercel HTTPS 页面可打开｜`PSA-02` HTTPS 下唤起 folder picker｜`PSA-03` Chrome 真实目录授权｜`PSA-04` 真实读取｜`PSA-05` 真实创建并磁盘可见｜`PSA-06` 真实修改并落盘｜`PSA-07` 刷新后恢复/重授权｜`PSA-08` 关闭浏览器再开恢复｜`PSA-09` 撤销权限不得绕过｜`PSA-10` 重新授权可恢复｜`PSA-11` Vercel 不保存整个 Workspace｜`PSA-12` Thin Proxy 仅 registered provider adapter｜`PSA-13` Vercel 免费/可接受方式满足演示；附加核对位 `PSA-X1`–`X11`（最终 Demo URL / Chrome / Edge / picker / read·write·refresh·reopen / permission revoke / LLM provider / Thin Proxy / Credential leak / Workspace upload / Vercel billing）。🔴 **全部 `PENDING`，现在不执行**。
- 🔴 **`PSA-*` 不是产品 `AC`**：**不得污染 `AC-01`–`AC-162`**；**`AC` 统一口径（2026-09-24 校正后）= 连续 canonical `AC` 162 项（`AC-01`–`AC-162`）＋ 独立 `AC-Q06` 6 项（`AC-Q06-1`–`AC-Q06-6`）＝ 全部有效验收点 168**；🔴 **禁写旧写法「有效总数 = 162（…+6）」**（算术矛盾）；`docs/09_TEST_PLAN.md` 已加 **D-057 护栏节**（**新增 `AC` = 0**）。
- 🚩 **`GATE-B PRE-CONFIRM CORRECTION`（2026-09-24，项目负责人选 `B｜有修改后再确认`）**：**只做 3 项定点修正** —— ① `AC` 总数口径统一（162 ＋ 6 = 168；未重编号 / 未并入 / 未新增；历史「`S03-E` 115 + 6 = 121」不改）｜② **`TQ01` / `TQ02` 人工 Decision 粒度收紧**（`TQ01` = Browser-heavy Local-first + Optional Thin Server Layer；`TQ02` = Local Workspace Files + No required cloud database；**`TypeScript end-to-end` 与 `Markdown + JSON/sidecar` = `TECHNICAL DEFAULT` / 实现参数，🔴 不进 `CONFIRMED` 核心结论、不生成 `Decision ID`**；**`TQ02` 物理 schema 由实现层收敛，不得锁成不可变产品 Decision**，但须满足 human-readable / stable ID / `EvidenceRef` / `archive_state` / generation batch / `source_type` / `decision_state` / Git-friendly·portable）｜③ **`docs/07` 新增 §5.14 `CURRENT EFFECTIVE PROCESS DISPOSITION（D-057）`**，旧「不得据此冻结架构」的 **Gate 时序结论 = `SUPERSEDED FOR GATE TIMING BY D-057`**（🔴 **只 supersede Gate timing / blocking；不 supersede「尚未验证」类事实**）。🔴 **不新建 `Decision ID`、不重开 `D-053`–`D-057`、不运行 Spike、不进 Gate C**。登记位 = 技术决策包 **§V.11** + Pivot **§Y.7** + `docs/CHANGELOG.md` 新条目。
- **File System fallback = `NO DECISION REQUIRED`**；升级条件 = **F1**（Vercel HTTPS + 目标浏览器无法开 picker）｜**F2**（真实浏览器不能 read + create + update）｜**F3**（正常刷新后无法恢复 / 重授权继续）｜**F4**（现场无法保证至少一个已验证浏览器）。🔴 **本轮不新建** `Folder Import` / `ZIP` / `File Upload` / `Local Companion Runtime` Decision。
- **Gate B 最终推荐（🟡 全部 `PROPOSED`，🔴 未 `CONFIRM`；🔴 已按 PRE-CONFIRM CORRECTION 收紧 `TQ01`/`TQ02`）**：`TQ01` 人工 Decision = **Browser-heavy Local-first Web App + Optional Thin Server Layer**（`EVIDENCE PARTIAL`；🔴 **`TypeScript end-to-end` = `TECHNICAL DEFAULT` / 实现参数，不进核心结论、不生成 `Decision ID`**；框架/状态库/路由/组件库同）｜`TQ02` 人工 Decision = **Local Workspace Files + No required cloud database**（`EVIDENCE READY`；🔴 **`Markdown + JSON / sidecar metadata` = `TECHNICAL DEFAULT`，非人工 Decision**；**物理 schema 由实现层 / Integrator 收敛，不得锁成不可变产品 Decision**；须满足 human-readable / stable ID / `EvidenceRef` / `archive_state` / generation batch / `source_type` / `decision_state` / Git-friendly·portable；PostgreSQL 口径 = `SUPERSEDED BY D-053 FOR V1 PRIMARY PERSISTENCE`，🔴 **不是技术失败**）｜`TQ03` = **Configurable LLM + Provider Abstraction + Provider-dependent Hybrid + Session-only Credential + registered-provider Thin Proxy only**（`EVIDENCE READY`；Custom `Base URL` = `Browser Direct Only`；🔴 无通用 URL Proxy / 无 Remember Key）｜`TQ04` = **`R-A`**（Structured Field Rules + 必要时 LLM 维度级三态判定；🔴 无 Vector DB / embedding 准入 / 数值相似度；`EVIDENCE READY`）｜`TQ05` = **Local Development + Vercel Demo/Review Target + Local Workspace + 部署验收后置**（Target 可定；`DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION`）。
- **`Decision` vs `Acceptance` 分离（原则）**：Gate B 问的是「是否已有足够证据冻结 V1 技术架构、让开发开始」，🔴 **不是**「是否已完成全部最终部署验收」⇒ 不得因 Vercel 未部署阻止 `TQ02`/`TQ03`/`TQ04`；`TQ05` 允许「Target 确认 + 验收后置」。
- 🔴 **未改变**：`Research Document RAG` 仍 = `OUT OF V1` / `RESERVED ONLY`（`D-054` 不变）｜契约仍 = **`v0.2.7 DRAFT`**（🔴 **未直接跳 `v0.3`**；`v0.3 DRAFT` 保留给 Gate B Landing 之后）｜`Legacy Cloud Cleanup` = `DEFERRED`（`R2`/`R6-A`/`R6-B`/`R6-C` 未动；`R6-C` 仍 `NOT YET CONFIRMED CREATED`）｜**未创建 `R1`/`R3`**、**未恢复 `SP-01a`**。
- **标志位（本轮）**：`BLOCKER` = `NO`｜`CCR` = `NO`（未处理 = 0）｜`PRODUCT SEMANTIC CONFLICT` = `NO`｜`NEW DECISION REQUIRED` = **除 Gate B 一次总确认外 = 无**｜`BILLING AUTH REQUIRED` = `NO`（0 元）｜`MANUAL AUTH REQUIRED` = `YES`（Vercel，已后置）｜`MANUAL OBSERVATION PENDING` = `YES`（7 项，已后置）｜`PROCESS DEVIATION` = `YES`（历史 `R2`，不得隐去）｜`RESOURCE CHANGE REQUIRED` = `RESOLVED`。
- **当前唯一人工动作**：**【GATE B FINAL HUMAN CONFIRMATION】→ A｜确认以上全部 Gate B 决策 ／ B｜有修改后再确认**（🔴 **一次性，禁逐项 5 次询问、禁"部分自动确认"**）。🔴 **收到 A 之前：`TQ01`–`TQ05` 不得写 `CONFIRMED`、不得进入 Gate C、不得写正式产品代码。**
- **收到 A 后**（GATE B LANDING PHASE）：为 `TQ01`–`TQ05` **分别**创建 Decision（从 `D-057` 之后连续顺延，🔴 **不得预设死编号**；每个 `Status = CONFIRMED`、`Source = Gate B Final Human Confirmation`、Date = 当日），🔴 **不得合并为一个无法追踪的大 Decision**；`TQ05` **必须**附 `DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION`（🔴 不得写"Vercel 已验证 / 已部署 / Production Ready"）；契约 `v0.2.7 DRAFT → v0.3 DRAFT`（🔴 **仍为 DRAFT、Gate C 前 NOT IMPLEMENTATION BASIS**）；同步 `DECISIONS.md` / `07_TECH_ARCHITECTURE.md` / `09_TEST_PLAN.md` / `CHANGELOG.md` / 契约 / `20_INTEGRATION/` 两份文档 / Memory｜🔴 **即使五项全部 Landing，本任务仍不得自动进入 Gate C**：须先输出 **`GATE B COMPLETE`** + **Gate C Readiness Checklist**，等下一步指令。

---

## C-GATEB-LANDING. GATE B LANDING 已执行（2026-09-24｜🔴 **本节取代 §C-GATEB 中"下一人工动作 / 收到 A 后"相关表述**）

> 上位权威 = `docs/DECISIONS.md` **`D-058`–`D-062`** + 契约 **`v0.3 DRAFT / GATE B FINAL TECHNICAL DECISIONS INTEGRATED` §0.4 E 节** + `docs/07_TECH_ARCHITECTURE.md` **§5.15** + `docs/09_TEST_PLAN.md`「Gate B 决策同步」节 + 技术决策包 **§V.12** + Pivot **§Y.8** + SP-06 报告 **§S** + `docs/CHANGELOG.md`（2026-09-24 GATE B LANDING 条目）。

- **触发**：项目负责人 **2026-09-24 明确回复「A｜确认以上全部 Gate B 决策」**（承接前一轮 `B｜有修改后再确认` 的 PRE-CONFIRM CORRECTION）。
- **落盘 5 项独立 Decision（`D-058`–`D-062`，从 `D-057` 连续顺延；🔴 未重用编号、🔴 未合并）**：见 §A 的 `D-058`–`D-062` 钩子条目。
- **契约推进**：`v0.2.7 DRAFT` → **`v0.3 DRAFT / GATE B FINAL TECHNICAL DECISIONS INTEGRATED`**（🔴 **仍为 DRAFT**：未 `FROZEN` / 未 `CONFIRMED` / **Gate C 前 NOT IMPLEMENTATION BASIS**）；新增 **§0.4 E 节**（E.1 流程 / E.2–E.6 五项 / E.7 `TECHNICAL DEFAULT` / E.8 `TQ02` 必须满足的约束 / E.9 部署验收状态 / E.10 效力边界）；**§13.1 补 v0.3 就地补注**；**§14 第 4 条**（版本链 + 前置条件已满足）；**§15 新增 v0.3 行**。
- 🔴 **不新增 `AC`**：口径不变 = **连续 canonical 162 ＋ 独立 `AC-Q06` 6 ＝ 全部有效验收点 168**；`docs/09_TEST_PLAN.md` 的 Gate B 同步节给出 **`TQ` → 既有 `AC` 覆盖映射**（`D-058`/`D-062` → `AC-127`–`AC-138`；`D-059` → `AC-127`–`AC-143`；`D-060` → `AC-144`–`AC-162`；`D-061` → `AC-109`–`AC-115` + `AC-139`–`AC-143`）；🔴 **如判有覆盖缺口，须另行提请人工裁决，不得在 Gate C 内自行新增**。
- 🔴 **`SP-06` 历史状态不变**：`CONDITIONAL PASS` + **7 项 `PENDING MANUAL OBSERVATION` 仍未标 `PASS`**；`DEPLOYMENT / BROWSER MANUAL ACCEPTANCE = DEFERRED TO PRE-SUBMISSION`；追加位 = 报告 **§R**（`D-057`）与 **§S**（GATE B LANDING）。
- 🔴 **`PSA-01`–`PSA-13` + `PSA-X1`–`X11` 全部仍 `PENDING`**（`PLANNED` / `NOT EXECUTED`；🔴 **不是产品 `AC`**）。
- 🔴 **禁写（Landing 后仍有效）**：不得写「Vercel 已验证 / 已部署 / HTTPS picker 已验证 / Production Ready」｜不得写「Local-first 已可行 / 已完成浏览器验收」｜不得把 `PSA-*` 写成 `AC`｜不得因 `D-061`（`R-A`）引入 embedding / Vector DB / 数值相似度｜不得因契约 `v0.3` 就当作已冻结。
- **不变**：`D-053`–`D-057` 一字未改｜`Research Document RAG` 仍 `OUT OF V1` / `RESERVED ONLY`｜File System fallback 仍 `NO DECISION REQUIRED`（F1–F4）｜`Legacy Cloud Cleanup` = `DEFERRED`。
- **标志位**：`Gate B` = **`COMPLETE`**｜`BLOCKER` = `NO`｜`CCR` = `NO`（未处理 = 0）｜`PRODUCT SEMANTIC CONFLICT` = `NO`｜`BILLING AUTH REQUIRED` = `NO`（0 元）｜`MANUAL AUTH REQUIRED` = `YES`（后置）｜`MANUAL OBSERVATION PENDING` = `YES`（7 项，后置）｜`Gate C` = **`NOT ENTERED`**｜`Formal Product Code` = **`NOT WRITTEN`**。
- **当前唯一人工动作**：**`S00-03 Gate C Readiness Review`**；🔴 **本任务不自动进入 Gate C**。
- **Gate C Readiness 检查项（供下一步使用）**：canonical 一致性 / contract 一致性 / 架构文档 / `AC` 覆盖 / 未解决阻塞 / 未解决决策 / 实现计划 / 开发归属·模块边界。

---

## C-GATEC. `Gate C Readiness Review` 已执行（2026-09-24｜🔴 **本节取代 §C-GATEB-LANDING 末条"当前唯一人工动作"**）

> 上位权威 = `20_INTEGRATION/S00-03_GATE_C_READINESS_AND_IMPLEMENTATION_PLAN.md`（A–R 共 18 节）+ `docs/CHANGELOG.md`（若已登记）+ 本日志 `2026-09-24.md`。
> **性质**：评审记录 + 实现计划（🟡 Integrator 产出；**非 canonical、非契约、非实现依据**）。

- **`STATE DRIFT = NO`** —— 15 项状态核验（`D-053`–`D-062` / `Gate B` / 契约 `v0.3 DRAFT` 效力 / `AC` 168 / `SP-06` 双层口径 / `D-057` 后置 / 无 `src/`）**全部与预期一致**。
- **逐项判定**：`Decision Consistency = PASS`｜`Canonical Consistency = ISSUE`｜`Contract Consistency = PASS`（18/18；`CC-01`/`CC-02` = `CONTRACT CLARIFICATION` 候选）｜`Architecture Consistency = PASS`｜`AC Coverage = PASS`（无 GAP；新增 `AC` = 0）｜`BLOCKER = NO`｜`CCR = NO`｜`PRODUCT SEMANTIC CONFLICT = NO`｜`Unresolved Important Decisions = 0`。
- 🚩 **ISSUE-01（唯一发现｜🔴 文档传播缺口，零产品语义变更）**：Gate B Landing 的声明影响范围**未覆盖 `docs/03`・`05`・`06`（及 `04`・`08`）** ⇒ 残留**当前语气**断言 `TQ03`/`TQ04`/`TQ05` 未裁决 / `R-A` 仍为 `PROPOSED` 的语句，与 `D-060`/`D-061`/`D-062` 相悖：**`docs/06` L612（位于该文件最新一节）+ L416/L473/L539/L547**｜**`docs/07` §5.6（L243·L252）与 §5.12.4（L382–L385·L388）缺就地补注**（§5.3/§5.5/§5.11/§5.13 均有）｜`docs/03` L375｜`docs/05` L530｜`docs/09` L564·L622·L691·L757（`09` L784 护栏节已有正确口径）。🔴 **其余 A/B/C/D/F 六项硬检查全部 `PASS`**。
- **修复清单 `RL-01`（有界文档补丁；🔴 不改产品语义 / 不新建 `Decision` / 不新增 `AC` / 不部署）**：`RL-01-1` `docs/06` 新增 Gate B 同步节 + 5 处就地补注｜`RL-01-2` `docs/07` §5.6・§5.12.4 就地补注 + 修正 §5.11 补注指向｜`RL-01-3` `docs/03` L375｜`RL-01-4` `docs/05` L530｜`RL-01-5` `docs/09` 4 处｜`RL-01-6` `docs/04`・`08` 可选登记｜`RL-01-7` `CHANGELOG`。
- 🚩 **`SP-06` `TEST SPEC GAP` 的 Gate C 正式处置** = **`HISTORICAL / NON-BLOCKING UNDER D-057`** = **`PROCESS DISPOSITION RESOLVED` / `TEST HISTORY PRESERVED`**（🔴 **不得写 `RESOLVED BY TEST`**；🔴 **GAP-1/GAP-2 文本继续保留、不得删除**；🔴 **不重开 Gate B**）。
- 🚩 **`PSA-01`–`PSA-13` + `PSA-X1`–`X11` = `NON-BLOCKING DEFERRED`**（全 `PENDING`；🔴 不是产品 `AC`；🔴 不是"可不做"）。File System fallback = `NO DECISION REQUIRED`（F1–F4）。
- 🚩 **`Gate C Verdict`**：**首轮 `NOT READY`**（唯一原因 = ISSUE-01；依任务书 §22 定义"可修复文档 gap"）⇒ 项目负责人 **2026-09-24 回复「A｜批准执行 `RL-01`」并同时批准 `RL-02`** ⇒ **`RL-01` 文档传播补丁 + `RL-02` 依赖修正 + 有界 Recheck 完成** ⇒ 🚩 **Recheck 后 `Gate C Verdict = READY WITH NON-BLOCKING DEFERRED ITEMS`**（`NON-BLOCKING DEFERRED` = `PSA-*` 全 `PENDING` + `SP-06 TEST SPEC GAP`）。🔴 **但仍不得冻结、不得进入 Gate C Landing、不得生成 `CODING_START_HANDOFF.md`、不得写正式代码** —— 须等项目负责人对**【GATE C FINAL HUMAN CONFIRMATION】**回复 `A`。
- 🚩 **`RL-01`（文档传播补丁，🔴 全部为追加就地补注 / 新增登记节，未删除未改写历史原文）**：`docs/06`（**新增 `D-058`–`D-062` 同步节 + 5 处补注**）｜`docs/07`（§5.6 / §5.11 / §5.12.4 / 文首 §1–§4 补注块 / §5.13 `TQ` 证据就绪度）｜`docs/03`｜`docs/05`｜`docs/09`（6 处）｜`docs/04`·`docs/08`（各新增《Gate B 决策同步登记》节）｜`docs/DECISIONS.md`（**`D-050`·`D-054` 各追加一条 🟢 补注**）｜`docs/CHANGELOG.md`（新增条目）。
- 🚩 **`RL-02`（实现计划依赖修正，🔴 不是 `Decision` / `AC` / CCR）**：`RC-01` **`M6`↔`M7` 循环已消除**（投影归 `M6` 纯函数 / 下沉 `src/domain/projection/**`；`Domain/Projection → M6 → M7` 单向）｜`RC-02` **`M10`↔`M11`/`M12` 潜在循环已消除**（`M10` 只定义 interface / capability / normalized contract；`M11`/`M12` implements；**`M15` composition root 装配 registry**）｜`RC-03` **`M3`→`M1` 反向依赖已消除**（`WorkspaceSession`/`WorkspaceHandle` Owner 恒为 `M2`；`M3` 只依赖 `M2` abstraction）。落点 = 计划文档 **新增 §I.3** + §I.1/§I.2 + §J.2/§J.3 + **§K 重绘 + 无环校验** + §L.1–§L.3 + §M.2 ⇒ **全图 DAG**。
- 🚩 **有界 Recheck（仅 5 项，2026-09-24）**：`Canonical Consistency` = ✅ **PASS**｜`Module dependency 无循环·无反向依赖` = ✅ **PASS**（全图 **DAG**）｜`Contract Consistency` = ✅ **PASS**（🔴 契约**仍 `v0.3 DRAFT`**，未冻结；18/18；CCR = NO）｜`AC Coverage` = ✅ **PASS**（**新增 `AC` = 0**；162 + 6 = 168）｜`BLOCKER` / `CCR` / `PRODUCT SEMANTIC CONFLICT` = **NO / NO / NO**。
- **下一人工动作（唯一）**：**【GATE C FINAL HUMAN CONFIRMATION】** → **`A`｜确认 Gate C，冻结当前实现基线并允许正式开发** ／ **`B`｜发现问题，暂不冻结**。🔴 **收到 `A` 后方可**执行 `Gate C Landing`（契约 `v0.3 DRAFT` → 正式 `FROZEN` implementation basis + `IMPLEMENTATION BASIS = YES`；🔴 **不发明新版本号**）+ 生成 `20_INTEGRATION/CODING_START_HANDOFF.md`；🔴 **Landing 不写业务代码、不自动开始 Coding**。
- 🚩 **本轮同时补齐的实现计划（🔴 计划非代码）**：`IMPLEMENTATION SCHEMA PLAN`（回答 Review 4 的 11 问）｜**模块边界 `M1`–`M16`**（责任/输入/输出/依赖/禁止依赖/共享类型/可并行性；`M17` Deployment = later）｜共享类型清单与 Owner｜`IMPLEMENTATION DEFAULT` 目录结构｜**六层依赖图 + 反向依赖禁令**｜Track A–D + Integrator 串行五项职责 + 禁改清单｜P0-A–P0-E + 两天节奏建议｜三层测试策略（`ITC-01`–`ITC-08`，🔴 非产品 `AC`）｜Demo 策略（seed 只到 `Attempt` 层、同工作空间硬要求）｜`PSA` 清单。
- **下一人工动作（唯一）**：**【GATE C FINAL HUMAN CONFIRMATION】**（因 Verdict = `NOT READY`，请求**处置确认**而非冻结确认）：**`A`｜批准执行 `RL-01`（不改产品语义）→ 复述判定 → 若 `READY WITH NON-BLOCKING DEFERRED ITEMS` 再单独确认冻结** ／ **`B`｜发现问题，暂不冻结**。
- **本轮边界（🔴 未执行）**：未写正式代码 / 未创建 `src/` / 未安装依赖 / 未部署 / 未创建 Vercel Project / 未创建或删除任何云资源 / 未重开 `TQ01`–`TQ05` / 未重跑 `SP-06` / 未执行 `PSA` / 未新增 `Decision` / 未新增 `AC` / 未冻结契约 / 未进入 Gate C Landing / 未改写任何 canonical 与 Worker `01`–`05`、`SP-03`·`SP-03R`·`SP-06` raw evidence、`SP-01a_*`。

---

## C-GATEC-LANDING. `Gate C Landing` 已执行（2026-09-24｜🔴 **本节取代 §C-GATEC 中"下一人工动作 / 不得冻结"相关表述**）

> 上位权威 = `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（**`v0.3 FROZEN / IMPLEMENTATION BASIS`**）+ `docs/07_TECH_ARCHITECTURE.md` **§5.16** + `20_INTEGRATION/S00-03_技术决策包.md` **§V.13** + `20_INTEGRATION/S00-03_GATE_C_READINESS_AND_IMPLEMENTATION_PLAN.md`（§T）+ **`20_INTEGRATION/CODING_START_HANDOFF.md`** + `docs/CHANGELOG.md`。

- **触发**：项目负责人 **2026-09-24 明确回复「A｜确认 Gate C，冻结当前实现基线并允许正式开发」**。
- **`FINAL STATUS HYGIENE CHECK`（4 项｜🔴 不是新 `RL` / 不是新 `Decision` / 不是新 `AC`）**：① Gate C Plan 文件头 → `READY WITH NON-BLOCKING DEFERRED ITEMS`（🔴 历史首轮 `NOT READY` 保留于 §Q.1/§Q.2）｜② `R-04`/`R-05` → **`RESOLVED FOR IMPLEMENTATION` / `NON-BLOCKING`**（历史来源保留）｜③ §M.4 起点改为 **`Gate C Landing → P0-A → P0-B → P0-C/P0-D → P0-E → PRE-SUBMISSION PSA`**（🔴 `RL-01` 不再写成未来动作；🔴 `P0` 范围未变）｜④ **`CONTRACT CLARIFICATION CC-01`** = 契约**新增 §9.4.1《Level A 四维度 → 主字段路径映射表》**（`goal → goal`／`approach·技术对象 → actual_attempt`／`condition → condition`／`result·现象 → actual_result`）；**`CC-02` 不升级为 Contract Decision**。
- 🚩 **`Gate C` = `COMPLETE`**；**契约 `v0.3 DRAFT` → ✅ `v0.3 FROZEN / IMPLEMENTATION BASIS`**；🔴 **`IMPLEMENTATION BASIS = YES`**；🔴 **版本号 `v0.3` 不变**（按契约 §14 第 4 条既有版本链，终端状态即「冻结态」，🔴 **不发明新版本号**）。
- **落盘清单**：契约（文件头 + 《v0.3 FROZEN 说明》+ §9.4.1 + §12 第 6 项补注 + §13.2 + §14 第 4 条 + §14.1 ×2 + §15 `v0.3 FROZEN` 行）｜`docs/07` **§5.16**｜技术决策包 **§V.13**｜Gate C Plan **§T**｜**`CODING_START_HANDOFF.md`（新增）**｜`docs/CHANGELOG.md`｜memory。
- 🚩 **`FINAL FREEZE SANITY CHECK`（8 项，全部成立）**：`Verdict = READY WITH NON-BLOCKING DEFERRED ITEMS`｜`Canonical Consistency = PASS`｜`Contract Consistency = PASS`｜`Module Dependency = DAG`｜`AC Coverage = PASS`｜`BLOCKER = NO`｜`CCR = NO`｜`PRODUCT SEMANTIC CONFLICT = NO`｜`Unresolved Important Decisions = 0`。
- 🔴 **冻结的射程**：**只冻结"实现依据"这一效力** —— 产品语义 / 技术架构 / 共享语义**一字未改**（`D1`–`D10` / `R1`–`R6` / `D-011`–`D-062` / `ADJ-01` / `Q16`；`D9` 十步 / 对象 / 状态 / `source_type` / `EvidenceRef` / `N_检索`·`N_引用` / Level A·B·C / 生成批次）；**新增 `Decision` = 0**；**新增 `AC` = 0**（口径不变 = 连续 canonical **162** ＋ 独立 `AC-Q06` **6** ＝ **168**）；**新增 `CONTRACT CLARIFICATION` = 1（§9.4.1）**。
- 🔴 **冻结后仍不变（必须持续同读）**：`DEPLOYMENT ACCEPTANCE = PENDING PRE-SUBMISSION`（`PSA-01`–`13` + `PSA-X1`–`X11` 全 `PENDING`；🔴 不是产品 `AC`）｜🔴 **禁写**「Vercel 已验证 / 已部署 / HTTPS picker 已验证 / Production Ready」「Local-first 已可行 / 已完成浏览器验收」｜`SP-06` 历史状态不变（`CONDITIONAL PASS` + 7 项 `PENDING MANUAL OBSERVATION`）｜`SP-06 TEST SPEC GAP` = `HISTORICAL / NON-BLOCKING UNDER D-057`（`PROCESS DISPOSITION RESOLVED` / `TEST HISTORY PRESERVED`，🔴 不写 `RESOLVED BY TEST`）｜`File System fallback` 仍不触发（`F1`–`F4`）｜`Research Document RAG` 仍 `OUT OF V1 / RESERVED ONLY`（`D-054`）｜`Legacy Cloud Cleanup` = `DEFERRED`/未授权执行。
- 🔴 **冻结后变更纪律**：契约修改**仍须走契约 §14 CCR**；**契约 §12 Worker 禁改 20 项继续有效**；🔴 **`TECHNICAL DEFAULT` / 实现参数不得锁成不可变产品 Decision**。
- **阶段状态**：**`S00-03` = 已关闭（Gate C COMPLETE）**；**当前阶段 = `S01 / Implementation`**；**`Formal Product Code` = 仍 `NOT WRITTEN`（`src/` 未创建）**；🔴 **本会话不自动开始 Coding**。
- **`NEXT TASK`（🔴 等待项目负责人启动）**：**`S01-01`｜Project Skeleton + Shared Domain Types + Workspace Repository Minimum Vertical Slice**（详见 `20_INTEGRATION/CODING_START_HANDOFF.md`）。
- **本轮边界（🔴 未执行）**：未写正式代码 / 未创建 `src/` / 未安装依赖 / 未部署 / 未创建 Vercel Project / 未创建或删除任何云资源 / 未重开 `TQ01`–`TQ05` / 未改 `D-053`–`D-062` / 未运行 Spike / 未执行 `PSA` / 未重跑 `SP-06` / 未新增 `Decision` / 未新增或重编号 `AC` / 未改写任何 canonical 与 Worker `01`–`05`、`SP-03`·`SP-03R`·`SP-06` raw evidence、`SP-01a_*`。

---

## C-W1INTEGRATE. `S01-W1-INTEGRATE` 已执行（2026-09-25｜🔴 **本节取代 §C-GATEC-LANDING 中"未写正式代码 / 未创建 `src/` / `NEXT TASK = S01-01`"与 §C 中"S01 现状"的表述**）

> 性质 = **`INTEGRATION RECORD` + `IMPLEMENTATION PATH CLARIFICATION`**。🔴 **不是 Decision、不是 CCR、不新增 `AC`、不改产品语义、不动 Frozen Contract、不重开 Gate C。**
> 详细过程 → `.learnbuddy/memory/2026-09-25.md`「S01-W1-INTEGRATE」段；落地口径 → `20_INTEGRATION/CODING_START_HANDOFF.md` **§12**。

### W1-1. 任务状态

```
S01-01 = DONE｜S01-01A = DONE｜S01-02 = DONE｜S01-04 = DONE
S01-03 = 未开始｜S01-05 = 未开始｜S01-06 = HOLD
Gate C = COMPLETE（未重开）｜契约 = v0.3 FROZEN / IMPLEMENTATION BASIS（未改）
```

### W1-2. 🔴 模块归属（解决 `S01-04` 遗留的「待 Integrator 裁决项」）

```
src/ai/**              M10 framework-neutral contract only
                       （~~src/ai/boundary/**~~ = SUPERSEDED BY S01-W1-INTEGRATE）
src/server/proxy/**    M12 pure server policy/security：target-policy / proxy-request /
                       authorize / registry FACTORY
api/proxy/**           M12 Node runtime transport shell
src/browser/ai/**      M11 / M13｜src/browser/workspace/** = M2
```

- 🔴 **`src/ai/index.ts` 不得再导出**：M12 target policy / proxy authorization / SSRF policy（`classifyHostLiteral` / `allowlistEntryViolation`）/ `ProxyRequest` parser / `createProviderRegistry`。
- 🔴 **DAG**：`api/proxy → src/server/proxy → src/ai`｜`src/browser → src/ai`；**无反向边**（`src/tests/proxy/dependency-direction.test.ts` DAG 0–7 断言）。
- **三项强制拆分（因为原设计有 3 条边违反 §5/§6 禁向）**：① registry **工厂** → M12（构造即拒绝私网 endpoint）；② 响应**归一化** → M10（`src/ai/provider/response-normalization.ts`，`M11`/`M12` 共用，避免 `redirect`/`error body` 规则漂移），allowlist 相关 redirect 明细留 M12；③ barrel 只再导出 `./provider/**`。
- 🚩 **唯一可观测差异**：`M11`（browser direct）的 redirect 错误不再携带 `target_block_reason`（浏览器侧恒无可信 allowlist ⇒ 恒 `null`）；错误码 / `failure_kind` / 状态码 / 行为逐项保持。

### W1-3. 编译作用域（占位项已删除）

```
core   = src/domain + src/workspace + src/ai（NO DOM）
browser= src/browser/**（DOM + DOM.Iterable，types: []）
server = api/proxy + src/server + src/ai（ES2022 + node，NO DOM）
proxy-test = tsconfig.proxy-test.json → dist-proxy-test/（rootDir "."；`npm run test:proxy`）
🔴 src/domain/ids/object-id.ts 三处占位入口已全部删除
```

### W1-4. 实测（全部实跑）

```
typecheck / typecheck:core / typecheck:browser / typecheck:server = PASS
build = PASS｜npm test = 233 pass / 0 fail / 32 suites（原 224 全部保留）
npm run test:proxy = 15 pass / 0 fail（P1–P14 + 1 不变式；真 import api/proxy/**）
git diff --cached --check = 空｜Secret Scan = PASS（命中项全为 fixture / 占位符 / 政策散文）
```

### W1-5. Git

- **`089913c`（Gate C + S01 foundation baseline，本日 01:47，299 files）→ `ef696c9`（Wave-1 integration，57 files，message `feat: integrate Wave-1 workspace and provider foundations`）**。
- 🚩 **事实校正**：任务书假设「此前没有干净 baseline commit」**不成立** —— `089913c` 已存在（由「Git Baseline Finalize」建立）；本次为**叠加提交**，🔴 **未 amend 历史 / 未改写已有 commit**。
- `git author = v1 <123@qq.com>`（READY）｜🔴 无 remote｜未 push｜working tree `CLEAN`。

### W1-6. 未决（🔴 不变）

- 真实浏览器验收 = **`PENDING PSA`**（🔴 未写 `Chrome/Edge/FSA verified`）；`PSA-01`–`13` + `X1`–`X11` 全 `PENDING`。
- `Move`/`Rename` = **`TECHNICAL LIMITATION ACCEPTED`**（`MOVE_UNSUPPORTED_BY_BROWSER`；🔴 不得用 `copy→write` 或 physical delete 补齐；V1 browser P0 不得依赖 `move()` 成功）。
- 未来 **`M1` / `M15` 必须同时处理** `WorkspaceStorageError` + `BrowserWorkspaceAccessError`；**`original_error` 仅内部诊断**（🔴 不得渲染 `original_error` / `stack` / browser internal error 给最终用户）。
- 🔴 **`NEXT = SAFE WAVE-2`：`S01-03` + `S01-05`**（`S01-06` = `HOLD`）；**未授权自动启动**。

---

## C-S0105INTEGRATE. `S01-05-INTEGRATE` 已执行（2026-09-25｜🔴 **本节取代 §C-W1INTEGRATE §W1-1 中 `S01-05 = 未开始` 与 §W1-6 末条 `NEXT = SAFE WAVE-2：S01-03 + S01-05` 的表述**）

> 性质 = **`INTEGRATION RECORD` + `IMPLEMENTATION PARAMETER` 收敛**。🔴 **不是 Decision、不是 CCR、不新增 `AC`、不改产品语义、不动 Frozen Contract、不改 `DECISIONS`、不重开 Gate C。**
> 详细过程 → `.learnbuddy/memory/2026-09-25.md`；落地口径 → `20_INTEGRATION/CODING_START_HANDOFF.md` **§13**。

### S5-1. 任务状态

```
S01-05 = DONE → ACCEPTED FOR INTEGRATION → INTEGRATED
S01-05-INTEGRATE = DONE
S01-03 = 未开始（SAFE NEXT，🔴 未授权自动启动）｜S01-06 = HOLD
Gate C = COMPLETE（未重开）｜契约 = v0.3 FROZEN / IMPLEMENTATION BASIS（一字未改）
```

### S5-2. ① 编译 / 构建作用域（修正既有缺口）

```
tsconfig.core.json   新增 include: src/application/**/*.ts（🔴 仍 NO DOM，lib = ES2022 only）
tsconfig.build.json  经 extends 继承 ⇒ 生产构建真实包含 src/application/**
tsconfig.json        同步纳入（默认 typecheck）
browser / server / proxy-test 作用域未改｜package.json 未改｜未新增 React/Next/运行期依赖
```

- 🔴 **修正前的事实**：`src/application/**` **仅经 test import graph** 被编译 ⇒ `tsconfig.core.json` / `tsconfig.build.json` **完全不产出 application 模块**，`dist/` 里没有捕获层。修正后 `dist/application/capture/**` 真实产出（12 模块）。
- 🔴 结构不变式：application 与它所编排的 domain **共用同一个 NO-DOM 配置**（它本就不使用 `window` / `document` / `fetch` / `sessionStorage` / `showDirectoryPicker` / `process.env` / Node I/O）。

### S5-3. ② 追问答案双层落库（落地既有 Frozen 语义，非新机制）

- 依据 = contract **§4.2 rule 3**（`D-024` / `AC-30`）+ §9 ③ + docs/02 §C.4.2 **C-5**。
- 落点 = `Attempt` sidecar 内新增 **`content_items`** 集合（docs/02 §C.4 的 `Content Item`；条目 = 既有 `ContentItem` 联合类型 + §C.4.1 已列出的 `field_key` / `origin_hint`）。🔴 **未新建第二套 provenance/引用体系，未新建 Product object type。**
- 双层：`followup_user_answer` → `Fact`（用户原话）｜`followup_ai_extraction` → `Extraction`（AI 归纳）。🔴 **两条永不合并、永不互改标、AI 归纳永不升级为 `Fact`。**
- 🔴 **不伪造第二层**：缺口场景若本无 AI 归纳，只落用户原话那一层。
- 🔴 **主字段同 patch 更新**（既有确认规则：用户提供的取值 = 用户 `Fact`）⇒ 追问答案**不是孤岛**，`level_a.condition` 可直接读出补齐值（§6）。
- 请求侧新增**可选**入参 `CaptureFieldCorrection.answer_to_gap`（application 参数，**不是**产品字段）。
- 新增 `src/domain/types/content-item-record.ts`：冻结 `field_key` 集合（**`TQ18` 收敛口径 = 沿用既有 `Attempt` 字段名**，出处 docs/02 §C.4.3 的 `PROPOSED` 清单）+ `persistContentItem` / `mergeContentItems` / 四条构造器。

### S5-4. ③ `Attempt Draft State` 持久化（docs/02 §C.5）

- 落点 = **同一 sidecar 内 1:1 附属记录 `draft_state`**；`attempt_id` / `parse_state` / `asked_key_question_count` / `abandoned_gap_set` / `gap_priority_hint` + 🚩 `asked_gap_set`（实现参数）。
- 🔴 **计数恒由 `asked_gap_set.length` 派生**；`asked_gap_set` **不在 `AttemptDraftStatePatch` 内** ⇒ 追加已问缺口**只有一条合法路径**（`askFollowUpQuestion` 把「问题条目 + 计数」写进**同一次** patch）。
- `parse_state` = canonical 五值（`not_parsed` / `extracted` / `not_extracted` / `extract_failed` / `pending_user_confirm`）；实现口径见 HANDOFF §13.4。🔴 **无分级 / 无完成度表达**（AC-88 / AC-93）。
- 🔴 **`Formal` 后保留不删除（只读留档）**、不再承载门槛作用；写入被拒 ⇒ 技术错误码 **`FORMAL_DRAFT_STATE_READONLY`**（新增技术错误码，非产品状态）。
- 🔴 **不是 `Attempt` 成员** ⇒ 结构上不可能进入 Level A / `EvidenceRef` / `N_检索` / `N_引用` / Experience Asset。⚠️ **`Attempt` 领域类型本身未新增任何字段。**
- 新增 `src/domain/types/follow-up.ts`：缺口词汇（**从 `src/application/capture/types.ts` 下沉**，🔴 语义未变，该文件**原样再导出**以保兼容）+ `AttemptParseState` + `AttemptDraftState`。

### S5-5. `pending_proposals` 不再是唯一 Source of Truth（task §10）

- 第 ② 步 AI 抽取结果**同时落为 `Extraction` 条目**（`field_key` = canonical 字段键；条目 id = `(attempt_id, 字段)` ⇒ **重新解析覆写同一条，无需任何「提案版本」概念**）。
- ⇒ 刷新 / service 重建后 ③ 可由**已持久化条目 + `parse_state`** 重建提案；内存 `Map` 降级为 cache。
- 追问问题落为 canonical `followup_question` 条目（`Inference｜display`）。🔴 **未新增** `confirmed` / confidence / parse version / proposal version；第 ② 步 provider 自报的 `parse_status` **不落库**。

### S5-6. Repository 能力增补（技术能力）

```
readAttemptDraftState(attempt_id)｜updateAttemptDraftState(attempt_id, patch)｜readAttemptContentItems(attempt_id)
AttemptPatch 新增 content_items / draft_state（使「条目 + 计数」原子写入）
新增 AttemptRepositoryErrorCode.FORMAL_DRAFT_STATE_READONLY
sidecar 解析器一致性守卫：count ≠ asked_gap_set.length 或 followup_question 条目数 ≠ asked_gap_set.length ⇒ 显式失败，不修不猜
🔴 无数据库 / 无物理删除成员（AC-76 不变）
```

### S5-7. Candidate Cause 裁定（task §14 / §15）

- **`INTEGRATION REQUEST #3` = `CLOSED / NO SHARED-SCHEMA CHANGE REQUIRED`**；`supporting_source_paths` **不落库**、**不扩 Domain**、**不作 `EvidenceRef` / `N_引用` 来源**（仅 application-local proposal）。
- 候选原因仍 = `Inference｜decision`，三态；0 条合法；🔴 **未新增** `score` / `confidence` / `support strength` / `probability`。
- 🚩 关闭 `S01-05` 遗留的「`retained_ai_extractions` 刷新后丢失」：AI 归纳现随 sidecar 持久化（第 ② 步条目 + 追问双层条目）。

### S5-8. 实测（全部实跑）

```
typecheck / typecheck:core / typecheck:browser / typecheck:server = PASS
build = PASS（dist/application/capture/** 已产出）
npm test          = 284 pass / 0 fail / 45 suites（原 271 全部保留，+13）
npm run test:proxy = 15 pass / 0 fail
新增测试 = src/tests/application/capture/persistence-integration.test.ts（I3–I15）
        + application-boundaries.test.ts（生产构建包含 application 不变式）
        + tsconfig-layout.test.ts（core / build 作用域不变式）
🔴 未新增任何 AC；每条断言均标注既有 Frozen 章节或 AC 编号
```

### S5-9. Git

- **`d5da4d6`（S01-05 Worker baseline）→ `b1912430b9455fabd1f521e020eafd2c994fcc45`（`feat: integrate S01-05 capture persistence`，33 files，6939 insertions / 24 deletions）**。
- 暂存集逐项核对：**无** `node_modules` / `dist` / `dist-test` / `dist-proxy-test` / `.env` / credential；`git diff --cached --check` = 空｜**Secret Scan = PASS**（diff 与新增文件均无命中）。
- `git author = v1 <123@qq.com>`｜🔴 无 remote｜未 push｜提交后 working tree `CLEAN`。

### S5-10. 未决（🔴 不变）

- 真实浏览器验收 = **`PENDING PSA`**；`PSA-01`–`13` + `X1`–`X11` 全 `PENDING`。
- `Move` / `Rename` = **`TECHNICAL LIMITATION ACCEPTED`**（不变）。
- 🔴 **`NEXT = S01-03`（Retriever / Comparator）**；**未授权自动启动**；`S01-06` = `HOLD`。
- 🔴 **持续禁写**：`Vercel 已验证/已部署/Production Ready`｜`Local-first 已可行/已完成浏览器验收`｜把 `PSA-*` 当 `AC`｜把 `SP-06` 历史改 `PASS`。

---

## C-S0105B. `S01-05B` Canonical Field Vocabulary + Stable ContentItem ID Hotfix（2026-09-25｜🔴 **本节取代 §C-S0105INTEGRATE §S5-3 末条中「`TQ18` 收敛口径 = 沿用既有 `Attempt` 字段名」与 §S5-10 末条 `NEXT = S01-03` 的表述**）

> 性质 = **`IMPLEMENTATION CORRECTION`（Integrator Corrective Patch）**。🔴 **不是** Product Decision / CCR / 新 `AC` / Contract Clarification / 新机制 —— 只是把代码恢复到**已冻结**的 `TQ18`（`field_key` 清单）/ `P1`-`P3`（`D-018` / `D-023`）/ stable-ID（docs/02 §C.4.1）口径。
> 详细过程 → `.learnbuddy/memory/2026-09-25.md`「S01-05B」段。

### S5B-1. 任务状态

```
基线 = b191243（= 任务给定 b1912430b9455fabd1f521e020eafd2c994fcc45）｜git status = 仅 .learnbuddy/memory/**（LOG-ONLY-DIRTY）
基线门 = typecheck×4 / build = PASS｜npm test = 284/284｜npm run test:proxy = 15/15 ⇒ 无 STATE DRIFT ⇒ 允许修复
S01-05B = DONE｜S01-03 = 未开始（SAFE NEXT，🔴 未授权自动启动）｜S01-06 = HOLD
Gate C = COMPLETE（未重开）｜契约 = v0.3 FROZEN / IMPLEMENTATION BASIS（一字未改）
```

### S5B-2. 🚩 `field_key` canonical 口径（🔴 **本节口径取代 §S5-3 中「沿用既有 `Attempt` 字段名」**）

- `PersistedContentItem.field_key` **恒为 canonical 名称**（docs/02 §C.4.3 / `TQ18`）：`raw_text`｜`goal`/`actual_attempt`/`actual_result`/`result_status`｜`condition`/`expected_result`/`judgment_basis`/**`key_parameter`**/**`version_env`**｜`occurred_at`/**`note`**/`cost`/**`failure_tag`**｜`candidate_cause`｜`followup_question`/`followup_user_answer`/`followup_ai_extraction`。
- 🔴 **物理属性名与 canonical `field_key` 分离**：`key_parameters` / `environment` / `user_note` / `failure_tags` **仍是合法的 `Attempt` 物理属性名**（实现参数，`TQ02`/`CC-02`），🔴 **但不得直接当作 `field_key`**，也**不做全仓字符串禁止**。映射 = `ATTEMPT_PHYSICAL_FIELD_KEYS` + `CONTENT_ITEM_FIELD_KEY_BY_ATTEMPT_FIELD` + `canonicalFieldKeyForAttemptField()`（`src/domain/types/content-item-record.ts`）。🔴 **`Attempt` 领域类型未改任何属性名。**
- 🔴 **`Insight` / `Hypothesis` 的 `field_key` 仍未落地**（由其模块实现），**未预留别名**。
- 常量：`KEY_PARAMETER_FIELD_KEY` / `VERSION_ENV_FIELD_KEY` / `NOTE_FIELD_KEY` / `FAILURE_TAG_FIELD_KEY`（旧 `KEY_PARAMETERS_FIELD_KEY` 已删除）。

### S5B-3. 🚩 追问缺口 canonical 口径

- `FOLLOW_UP_GAP_KEYS` = `goal`/`actual_attempt`/`actual_result`/`condition`/`judgment_basis`/**`key_parameter`**（恰 6 项）；`GAP_PRIORITY.key_parameter = 'P3'`。🔴 `key_parameters` **不得**再作为缺口键；`result_status` / `expected_result` / `version_env` / `note` / `failure_tag` **均不在**追问预算内。
- 映射 = `FOLLOW_UP_GAP_ATTEMPT_FIELD`（canonical 缺口 → `Attempt` 物理属性；**只有 P3 两侧不同名**）。

### S5B-4. 🚩 追问问题 ContentItem 身份（去位置化）

- `followUpQuestionItemId(attempt_id, target_gap)` —— **身份 = (`attempt_id`, canonical `target_gap`)**；🔴 **不得**用数组下标 / 展示顺序 / `asked_key_question_count` / 排序位置。
- 合法性依据 = canonical `D-017`「同一缺口只正式提问一次」⇒ 同一 `Attempt` 内一个缺口至多一条问题条目。
- 幂等不变：首次 `asked`（计数 0→1）→ 重复 `GAP_ALREADY_ASKED`（计数仍 1）→ reload / service 重建后同结论；**不产生第二条 question item**。
- 🔴 **射程限定（重要）**：**位置型 `ContentItem` id 仍在三处**（`${attempt_id}:key_parameter:${index}` / `Attempt.key_parameters` 列表内 `${attempt_id}:key_parameters:${index}` / `${attempt_id}:candidate_cause:${index}`）—— 🔴 **均非本次点名对象、本轮未改、未扩 scope**，留待项目负责人裁决是否另开 hotfix。

### S5B-5. 实测 + 边界

```
typecheck / typecheck:core / typecheck:browser / typecheck:server = PASS｜build = PASS
npm test           = 294 pass / 0 fail（原 284 全部保留 + 10 新增不变式）
npm run test:proxy = 15 pass / 0 fail
新增测试 = src/tests/application/capture/canonical-vocabulary.test.ts
          （§6 词表 V1–V4｜§7 缺口 G1–G2｜§8 稳定身份 S-A/B、S-C、S-D/E、S-E2）
改动集 = src/domain/types/{content-item-record,follow-up}.ts｜src/application/capture/capture-service.ts｜
        src/tests/application/capture/{persistence-integration,follow-up-budget,canonical-vocabulary}.test.ts
🔴 未触碰 docs/** / Frozen Contract / DECISIONS / 产品 AC / package.json / tsconfig*.json / src/ai|browser|server/** / api/**
🔴 新增 Decision = 0｜新增 AC = 0｜契约修改 = NO｜CCR = NO｜BLOCKER = NO｜未部署 / 未执行 PSA / 费用 0 元
```

### S5B-6. Git / 下一步

- `b191243` → **`5aade91a2e9bb0e948f8aa5c7c20e136c23dc2aa`**（`fix: align capture persistence with frozen field vocabulary`｜9 files｜822 insertions / 45 deletions｜👍 提交后 tree `CLEAN`，随后仅回填本哈希 ⇒ `LOG-ONLY-DIRTY`｜无 remote / 未 push）。
- 🔴 **`NEXT = S01-03`（Retriever / Comparator）**；**未授权自动启动**；`S01-06` = `HOLD`。
- 🔴 **持续禁写**（不变）：`Vercel 已验证/已部署/Production Ready`｜`Local-first 已可行/已完成浏览器验收`｜把 `PSA-*` 当 `AC`｜把 `SP-06` 历史改 `PASS`。
- 🔴 **新增禁写**：不得写「`S01-05B` 新增了 `Decision` / `AC` / 修改了 Frozen Contract」｜不得把「追问问题身份去位置化」扩大表述为「仓库内已无位置型 `ContentItem` id」（**§S5B-4 三处仍在**）。

---

## C-S0105C. `S01-05C` Residual Position-based ContentItem ID Closure（2026-09-25｜🔴 **本节取代 §C-S0105B §S5B-4 末条「三处位置型 id 仍在」与 §S5B-6 末条禁写的表述**）

> 性质 = **`IMPLEMENTATION CORRECTION`（Integrator Corrective Patch）**。🔴 **不是** Decision / CCR / 新 `AC` / 契约修改 / 新机制 —— 只是把 `S01-05B` 登记的三处位置型身份关掉，回到 contract §3.1/§3.2（`TQ15`）「对象身份只能由 id 表达，不得由位置表达」的既有口径。
> 详细过程 → `.learnbuddy/memory/2026-09-25.md`「S01-05C」段。

### S5C-1. 任务状态

```
基线 = 5aade91（= 任务给定 5aade91a2e9bb0e948f8aa5c7c20e136c23dc2aa）｜git status = 仅 .learnbuddy/memory/**（LOG-ONLY-DIRTY）
基线门 = typecheck×4 / build = PASS｜npm test = 294/294｜npm run test:proxy = 15/15 ⇒ 无未知 drift ⇒ 允许修复
S01-05C = DONE｜S01-03 = 未开始（SAFE NEXT，🔴 未授权自动启动）｜S01-06 = HOLD
Gate C = COMPLETE（未重开）｜契约 = v0.3 FROZEN / IMPLEMENTATION BASIS（一字未改）
```

### S5C-2. 🚩 共享 ID 基础设施（新增，复用既有生成器）

- **`src/domain/ids/content-item-id.ts`**：`newContentItemId(attempt_id, deps?)` = **`<attempt_id>:<26 字符 ULID body>`**｜`createContentItemIdFactory(deps)`｜`isGeneratedContentItemId(value)`｜`attemptIdOfContentItemId(value)`｜`CONTENT_ITEM_ID_SEPARATOR = ':'`。
- 🔴 **复用 `ulid.ts` 的 `newIdBody()`**（与 `newObjectId` 同一生成器、同一形态）⇒ **无第二套随机算法 / 无计数器 / 无文本哈希**。
- 🔴 **`ID_PREFIXES` 未扩**（仍 `WS/PRJ/ATT/INS/HYP`）⇒ `src/tests/domain/stable-id.test.ts` **未改**；`src/domain/ids/index.ts` 仅加导出。
- 🔴 **文本不是身份**（§6）：两个 `ContentItem` 可文本相同而仍是两个对象（测试 ID-4 显式断言）。

### S5C-3. 🚩 三处位置型 ID 已关闭（取代 §S5B-4 的对照表）

| # | 原实现 | 现实现 |
|---|---|---|
| ① 第②步 key_parameter Extraction | `` `${attempt_id}:key_parameter:${index}` `` | proposal 的 `key_parameters` 改为 **`ParsedKeyParameter[]` = `{ content_item_id, value }`**，id 在 `structured-parse.ts` **生成时铸出**，`parseProposalContentItems` 原样使用 |
| ② `Attempt.key_parameters` 列表条目 | `` `${attempt_id}:key_parameters:${index}` ``（`keyParameterItemId` **已删除**） | `confirmation.ts` **复用** `proposal.key_parameters[].content_item_id` ⇒ sidecar 与主字段**同一身份**；重排数组**不交换**身份 |
| ③ 候选原因 | `` `${attempt_id}:candidate_cause:${index}` ``（`causeContentItemId` **已删除**） | `analyseCandidateCauses` 生成时逐条 `newContentItemId(attempt_id)`；用户决定**只按 `content_item_id` 绑定，绝不按列表位置** |

- 🔴 `recoverParseProposal` 改为**从已持久化条目读回身份**（不重新推导）⇒ 刷新后同一参数仍是同一对象。
- 🔴 **保留未改**：`extractionItemId` / `aiParseExtractionItemId` / `userFactItemId` / `followUpUserAnswerItemId` / `followUpAiExtractionItemId` / `followUpQuestionItemId`（判别式 = 字段名 / canonical gap，非位置型）。
- 🔴 **新增 `src/tests/application/capture/stable-content-item-id.test.ts`**（ID-1…ID-8，12 条不变式，🔴 未新增 `AC`）。

### S5C-4. 🚩 位置型 ID 守卫（可复用口径）

- **生产身份只能用 id 表达，不能用位置表达**（contract §3.1/§3.2 / `TQ15`）。
- 🔴 **守卫 1（结构）**：`src/domain/**` + `src/application/capture/**` + `src/workspace/**` 内所有「名字以 `Id`/`ItemId` 结尾、且不以 `is|assert|parse|to|require` 开头」的函数集合**必须恰等于显式登记的白名单**（`aiParseExtractionItemId` / `attemptIdOfContentItemId` / `extractionItemId` / `followUpAiExtractionItemId` / `followUpQuestionItemId` / `followUpUserAnswerItemId` / `newContentItemId` / `newObjectId` / `userFactItemId`），且**形参不得含** `index|idx|position|offset|ordinal|length|count|order` ⇒ **新增位置型 ID 生产者必然使测试失败**。
- 🔴 **守卫 2（调用点）**：生产者调用实参不得含上述位置型 token。
- 🔴 **守卫 3（字面量）**：不得存在**同时插值「读 id」与「读位置」**的模板字面量。
- 🔴 **守卫 4（反向对照，防空洞断言）**：同一判定函数对**已知缺陷样例** `` `${attempt_id}:candidate_cause:${index}` `` 判 `true`，对**保留样例** `` `${attempt_id}:${field}:user` `` / `` `${attempt_id}:followup_question:${target_gap}` `` 判 `false`。
- 🚩 **「位置型 Product ID」结论必须限定射程**：全 `src/**` + `api/**` 其余 `${index}` / `${...length}` 命中**全部是诊断路径与计数文案**（`${path}[${index}]` 等），**不是产品身份** ⇒ **不是未关闭项**。此结论**不**表示「仓库中不再出现数组下标」。
- 🔴 **不得**把「身份生成器」与「路径 / 错误消息里的下标」混为一谈；后者**允许**。

### S5C-5. 实测 + 边界

```
typecheck / typecheck:core / typecheck:browser / typecheck:server = PASS｜build = PASS
   （dist/domain/ids/content-item-id.{js,d.ts,map} 真实产出）
npm test           = 306 pass / 0 fail（原 294 全部保留 + 12 新增不变式）
npm run test:proxy = 15 pass / 0 fail
改动集 = src/domain/ids/{content-item-id,index}.ts｜
        src/application/capture/{types,capture-service,structured-parse,confirmation,cause-analysis}.ts｜
        src/tests/application/capture/stable-content-item-id.test.ts｜.learnbuddy/memory/**
🔴 未触碰 docs/** / Frozen Contract / DECISIONS / 产品 AC / root config / package.json / src/ai|browser|server/** / api/**
🔴 新增 Decision = 0｜新增 AC = 0｜契约修改 = NO｜CCR = NO｜BLOCKER = NO｜未部署 / 未执行 PSA / 无 DB·Vector DB·embedding / 费用 0 元
```

### S5C-6. Git / 下一步

- `5aade91` → **`786800f56d7565e03be459246d0a15747a9722a7`**（`fix: remove residual position-based content item ids`｜11 files｜972 insertions / 29 deletions｜👍 提交后 tree `CLEAN`，随后仅回填本哈希 ⇒ `LOG-ONLY-DIRTY`｜无 remote / 未 push）。
- 🔴 **`NEXT = S01-03`（Retriever / Comparator）**；**未授权自动启动**；`S01-06` = `HOLD`。
- 🔴 **持续禁写**（不变）：`Vercel 已验证/已部署/Production Ready`｜`Local-first 已可行/已完成浏览器验收`｜把 `PSA-*` 当 `AC`｜把 `SP-06` 历史改 `PASS`。
- 🔴 **新增禁写**：不得写「`S01-05C` 新增了 `Decision` / `AC` / 修改了 Frozen Contract」｜不得把「三处位置型 id 已关闭」表述为「仓库内不再出现任何数组下标」。

---

## C-M9. `M9` Hypothesis Generation + Evidence Traceability（⑨⑩）已执行（2026-09-25｜🔴 **本节取代 §C 中「`M9` 未开始 / `SAFE NEXT = M9`」相关表述**）

> 类型 = **`Serialized Integrator Implementation`**。基线 `b1a492d2e26ed795f2331e10b884bc5e1a0e78bc`（实测 ✅）｜`M8 = DONE`｜`M7 = DONE`｜`S01-03 = DONE`。
> 🔴 **未新增 `Decision`、未新增 `AC`、未改 `DECISIONS` / Frozen Contract / 产品 `AC`、未改 `src/domain/**` / `src/retrieval/**` / `src/application/insight/**` / `src/ai/**` / `api/**` / `docs/**` / `package.json` / `tsconfig*.json`、无 `CCR`、无 `INTEGRATION REQUEST`、无 `BLOCKER`、无 `PRODUCT SEMANTIC CONFLICT`。**

### M9-1. 任务状态

- `M9 = DONE`（2026-09-25）｜模块归属 = **`src/application/hypothesis/**`**（17 文件）+ **`src/tests/application/hypothesis/**`**（12 文件：harness + 11 套件）。
- 🔴 **`⑨` 不等待 `⑧` 的 `E5`**（`D-030` + `D-022`）：未接受 `Candidate Insight` 以 `reasoning_input_refs`（`kind = candidate_insight_not_accepted`，标签「前序候选经验（未接受）」）进入，**不是 `EvidenceRef`、不承担 grounding、不计 `N_引用`、不进 ⑩**。

### M9-2. 关键实现口径（`IMPLEMENTATION PARAMETER`）

- **二类输出**：`kind = grounded` / `kind = model`，共用一个 `HYP_` 身份空间（冻结前缀，**未扩 `ID_PREFIXES`**）；新生成恒 `decision_state = undecided`；`grounded` 的 `saved = null`（无保存位）；`model` 恒带 `saved: boolean`。
- **裁决位矩阵（v1，最小集）**：`undecided --accept--> accepted`（须 `user_explicitly_accepted = true`）／`undecided --reject--> rejected`；**其余一律拒绝**（含 `rejected → accepted`：回到被拒方向的合法路径 = 显式重新生成，`§34`）。**无 revoke**、**无内容修改状态机**。
- **保存位 ≠ 裁决位**：`saveModelSuggestion` 只改 `saved`、`acceptHypothesis` 只改 `decision_state`（互不隐式调用）。`saved=true + undecided` 的规范含义 = 「内容被保留，决策状态仍未完成」；`saved=false` 恒表述为「用户尚未保留」，**从不写成「用户已保存」**。
- **`N_检索` 是第一道门**：`N_检索 = 0` 或无可用内容候选 ⇒ **结构上禁止任何 `grounded`**（载荷声称 grounded 即整次拒绝 `GROUNDED_WITHOUT_GROUNDING_SOURCES`），路由 = `EXIT-A`；`Model Suggestion` 仍可另计产出。
- **grounding 二值 + 结构化**：`G1`–`G4` 由 **声明 → 落点载体字段映射**核对（`G1 goal|key_parameters`／`G2 condition|environment`／`G3 expected_result|judgment_basis`／`G4 actual_attempt|actual_result` + 目标结果状态已知且非成功）；`N1/N2/N5/N6` **结构性 fail-closed（不调 AI）**；`N3/N4` 由**独立的第二次离散 `M10` 调用**判定（`grounding_check` 只许 `grounded`/`not_grounded`，**无分数/等级/部分锚定**；附带可选枚举 `condition ∈ {N3, N4, null}` 仅作审计归属）。**索取 + 校验分离：绝不相信载荷自称 grounded。**
- **数量 1–2 自适应**：`grounded` 上限 2（3 条 = 载荷级拒绝，不裁剪）；近义改写（归一化后同命题）与「同一 `next_change` + 同一引用签名」均拒绝；数量**不由 `N_检索` 决定**；`N = 1` 仍允许 1 条；每条各自 `N_引用 ≥ 1`（引用全为 `context` 者按失败关闭剔除）。
- **出口三分（结构性派生）**：`!grounding_possible → EXIT-A`；grounding 成立但无可观察可区分判据 → `EXIT-B`；无明确命题且模型自报 `EXIT-C` → `EXIT-C`；其余 → `EXIT-A`。**零输出必带非空 `absence_statement`**，且 `B/C` 语句由本模块常量给出（**结构性禁止「历史证据不足」措辞**）。两种空态（`HISTORY_EMPTY` / `NO_RELATED_HISTORY`）分文案。
- **`M7` 是唯一 `EvidenceRef` 构造者**：`M9` 仅把 selections 交给 `buildGroundingContext`（`owner_id = HYP_`）；**任一选择被 `M7` 拒绝 ⇒ 整次生成拒绝、零落盘**；`N_引用` / ⑩ 一律读 `deriveCitationView` / `deriveTraceabilityView`（**无第二套计数**）。
- **`evidence_overview` 为读时派生**（`N_引用` 实际值 + 是否单来源 + 是否存在冲突 + 条件缺失说明），**从不落第二份数字**；冲突并置、不做任何数量比较或结论。
- **⑤ 来源三分**：历史条件 = `historical_ref`（须在 `M6` catalog 中可解析，否则按 `N2`/`N6` 结构拒绝）；AI 建议 = `kept_condition_recommendations`（**`M9` 局部字段，不改冻结 ⑤ 类型**，`Inference`）；用户本人指定 = 无 API 可写（只能先成为 `Formal Attempt` 的 `Fact` 再由 ⑤ 引用）。「保持不变」无历史记录 ⇒ 载荷级拒绝。
- **⑥⑦⑧ 两层**：AI 提案 = `Inference｜decision｜unresolved`；用户条目 = `Fact`；**合并不删除 AI 原件**、读模型用户项优先；接受 AI 判据只改 `decision_state`（**来源恒为 `Inference`**）。
- **物理落点**：`hypotheses/<hypothesis_id>.json` + `.md`｜`hypotheses/batches/<batch_id>.json`｜**`hypotheses/operations/<operation_key>.json` = 持久化恢复锚点**。`operation_key` 由 `source_attempt_id__` + **单射百分号编码的 `operation_id`** 决定（不用哈希，避免不同 operation 撞同一锚点）。
- **🔴 崩溃恢复（`§36`，不复制 `M8` 的残余窗口）**：写序 = **① 锚点（内含完整已物化计划：全部记录 + 批次）→ ② 各 hypothesis 文件（`createIfAbsent`，同内容幂等）→ ③ 批次 → ④ 锚点标 `complete`**。同 `operation_id` 重放 = **从计划重写同一批身份**（不再问模型、不铸第二套 id、不产生第二个 batch、不把部分写入当成功）。🔴 **本模块不声称原子性**（`WorkspaceStorage` 无事务原语），提供的是 **replay recovery**。

### M9-3. 命名口径（🔴 已登记，非 `INTEGRATION REQUEST`）

- 计划文档 `20_INTEGRATION/S00-03_技术决策包.md`（行 1124）把这 8 项拼作 `hypothesis_basis` / `hypothesis_history_refs` / `hypothesis_change` / `hypothesis_keep` / `hypothesis_metric` / `hypothesis_support_criterion` / `hypothesis_contradict_criterion`；**冻结类型** `src/domain/types/hypothesis.ts` 拼作 `rationale` / `referenced_attempts` / `next_change` / `kept_conditions` / `observation_metric` / `support_criterion` / **`refutation_criterion`**。
- 二者**指向同一 8 项、同一顺序、同一语义** ⇒ **以冻结类型为准**，`M9` **不另开拼写**、**不改 `src/domain/**`** ⇒ **不触发 `INTEGRATION REQUEST`**（冻结类型能表达全部 8 项）。已就地写入 `src/application/hypothesis/structure.ts` 头注。

### M9-4. 实测（全部实跑，输出重定向到 `%TEMP%\m9_*.txt`）

```
npm run typecheck / typecheck:core / typecheck:browser / typecheck:server = PASS (exit 0)
npm run build      = PASS (exit 0)｜dist/application/hypothesis/** 真实产出（17 模块）
npm test           = 712 pass / 0 fail / 98 suites / exit 0（原 565 全部保留 + 147 新增）
npm run test:proxy = 15 pass / 0 fail / 1 suite  / exit 0
```

- 覆盖 O1–O7 / G1–G4·N1–N6 / Q1–Q9 / H1–H7 / K1–K5 / C1–C8 / M1–M9 / T1–T6 / R1–R6 / P1–P11（含 `FaultInjectingStorage` 故障注入的 partial-write 恢复）+ `§50` 静态审计。
- 🔴 全部 AI 调用为 `NOT_A_REAL_LLM_OUTPUT` 假适配器；**Real Provider Calls = NOT EXECUTED；费用 0 元**。
- 🔴 **断言标注口径**：每条 `it` 标题按**逐条诚实映射**标注**既有** `AC-31`–`AC-70` / `AC-98` / `AC-100` / `AC-104` / `AC-106` / `AC-116` / `AC-120` / `AC-121` / `AC-123` / `AC-139` / `AC-133` 或 `IMPLEMENTATION INVARIANT`（既有 `ac-reference-guard` 规则 ③④）；**未新增 `AC`**。

### M9-5. Git / 边界 / 下一步

- `b1a492d` → **commit = `feat: implement traceable hypothesis generation`**（32 files：17 生产 + 14 测试 + 日志）｜`git diff --cached --check` = 空｜Secret Scan = 无凭据形态串｜无 remote / 未 push。
- 改动集 = `src/application/hypothesis/**`｜`src/tests/application/hypothesis/**`｜`.learnbuddy/memory/**`。🔴 **未触碰** `src/domain/**` / `src/retrieval/**` / `src/application/insight/**` / `src/ai/**` / `src/browser/**` / `src/server/**` / `api/**` / `docs/**` / `20_INTEGRATION/**` / `package.json` / `tsconfig*.json`。
- 🔴 **未实现**：`M15` 全链编排｜`S01-06` UI｜Demo｜`PSA`｜`Vercel`。**未新建 DB / Vector DB / embedding / 第二套引用或计数体系 / 版本系统**。
- 🔴 **`M8` 的残余窗口（先写 Insight 后写批次）未修**：按任务要求**登记为 `M15-HARDENING-01`**，**不在本任务顺手改 `M8`**。
- **`SAFE NEXT = M15｜D9 End-to-End Orchestration + M8-HARDENING-01`**；`S01-06` **继续 `HOLD`**。🔴 **未授权自动启动，本轮完成后停止。**
- 🔴 **新增禁写**：不得写「`M9` 新增了 `Decision` / `AC` / 修改了 Frozen Contract」｜不得写「`⑨` 等待 `E5`」｜不得把 `Model Suggestion` 计入 `1–2` 条或写进 ⑩ / `N_引用`｜不得写「`Hypothesis` 已成为经验 / 已被证据支持」｜不得把 `EXIT-B`/`EXIT-C` 写成「历史证据不足」｜不得声称本模块的持久化是「原子事务」。

---

## C-M15. `M15-LAND` + `M9-HYGIENE-01` 已执行（2026-09-25｜🔴 **本节取代 §C-M9 §M9-5 中「`M8` 的残余窗口未修 / `SAFE NEXT = M15` / `S01-06` 继续 `HOLD`」相关表述**）

> 类型 = **`Serialized Integrator / Hygiene`**。基线 = **`3696d7d1966edf1f2b5b1ca12b59abd4ba609c5a`**（实测 ✅，工作树 = `LOG-ONLY-DIRTY`，仅 `.learnbuddy/memory/**`）。
> 🔴 **未新增 `Decision`、未新增 `AC`、未改 `DECISIONS` / Frozen Contract / 产品 `AC`、未改 `src/domain/**` / `src/retrieval/**` / `docs/**`、无 `CCR`、无 `BLOCKER`、无 `PRODUCT SEMANTIC CONFLICT`。**
> 🔴 **未启动 UI / 未启动 `M16` / 未部署 / 未执行 `PSA`。**

### M15-1. 任务状态

```
M15                       = DONE / ACCEPTED
Git baseline              = 3696d7d1966edf1f2b5b1ca12b59abd4ba609c5a
D9 ①→⑩ E2E               = PASS（deterministic fake provider）
Real Provider Calls       = 0
M8-HARDENING-01           = CLOSED
Thin Proxy Client Adapter = ADDED
S01-06                    = NEXT AFTER THIS LANDING
M16                       = READY AFTER M15（🔴 排序仍排 S01-06 之后）
```

- **`M15` 实现产物**：`src/application/workflow/**`（编排：`workflow-service` / `read-model` / `operation-ids` / `outcomes` / `acceptance` / `errors` / `types`）＋ `src/browser/application/**`（composition root）＋ `src/browser/ai/thin-proxy-adapter.ts`（`M12` **client** Thin Proxy Adapter，"ADDED"，关闭 Wave-1 的实现缺口）。
- 🔴 **`M15` 是 COMPOSER**：不新增第二个检索 / 第二个 `EvidenceRef` 构造点 / 第二个状态机。**唯一自动副作用** = ⑤ `Formal` 保存成功 ⇒ 立即执行一次 ⑥（`D-045` / AC-79），同一保存重放不执行第二次；**无级联**；**无后台工作**（无 timer / watcher / queue）。

### M15-2. `M8-HARDENING-01` = `CLOSED`（🔴 别名 = §M9-5 登记的 `M15-HARDENING-01`）

- **依据（实测，非任务描述）**：`M15` 提交 `3696d7d` 的 `git show --name-only` **真实包含** `src/application/insight/{identity,insight-repository,insight-service,persistence,types}.ts` ⇒ ⑧ 生成改以 **durable plan** 落盘（`anchor → records → batch → 标 complete`），并新增 `src/tests/application/workflow/m8-recovery.test.ts`（`MH1`–`MH12`：partial-write 窗口 / replay recovery / blocked recovery 永不当作成功 / zero-output 可重放 / regeneration 与 runtime failure），全数通过。
- 🔴 **语义未变**：这是 **REPLAY RECOVERY，不是原子事务**（`WorkspaceStorage` 无事务原语，`M8` 不声称原子性）。
- 🔴 **命名别名（就地补注）**：`M8-HARDENING-01`（代码注释口径）≡ `M15-HARDENING-01`（§M9-5 登记口径），**同指 ⑧ 的「先写 Insight 后写批次」残余窗口**，不构成两个 hardening 项。

### M15-3. `M9-HYGIENE-01`｜operation id codec 修复

- **缺陷（实测复现，非推断）**：`decodeOperationIdToken` 原实现以**贪婪**方式把每一段连续 `~HH` 先合并成字节串再校验长度 ⇒ 两个及以上**相邻**多字节字符被并成不可能的字节串，**合法 token 被拒**。修复前单独实跑：C2 / C3 / C4 / C8 = `not ok`（`null !== '操作'` 等），C1 / C5 / C6 / C7 = `ok` ⇒ 缺陷精确落在「相邻多字节字符」。
- **修复口径**：decode 改为**一次只读一个 code point**（组首 `~HH` 决定续字节数，**每个**续字节须为 `10xxxxxx`，否则 fail-closed 返回 `null`），语义与 `M8` **已通过 M8 回归**的解码器一致。
- 🔴 **本地实现，不 import `M8`**：static audit 断言 `M9` 内**唯一** `M8` 引用 = `types.ts` 的 **type-only** `InsightView`；故不复用 `M8` 模块，而在 `M9` 内实现同一技术协议（纯 codec，无产品规则）。
- 🔴 **未变**（HEAD 与工作区同函数文本比对）：`encodeOperationIdToken` **逐字节相同**（942 bytes）｜`hypothesis_id` 生成｜batch id 生成｜operation anchor path schema｜已有 encode token 格式（golden 断言钉死）。
- **覆盖**：`src/tests/application/hypothesis/identity-codec.test.ts`（12 例 = C1–C8 roundtrip / encode golden 格式 / collision guard / malformed 拒绝 / anchor key 绑定）；全部标题 = `IMPLEMENTATION INVARIANT`，**未引用也未新增任何产品 `AC`**。
- **Dead-code（全仓搜索）**：`M9` `decodeOperationIdToken` **生产调用点 = 0**｜**测试调用点 = 1 文件**（本次新增） ⇒ **`DEAD / UTILITY-ONLY TODAY`**；处置 = **`FIX, DO NOT DELETE`**（已修复，避免将来启用时携带已知 defect）。

### M15-4. Hypothesis 8-item Logical → Physical Mapping（🔴 跨层命名映射，**不是**第二套产品语义）

| # | 文档逻辑 `field_key`（docs/03 §H.1｜docs/02｜`S00-03_技术决策包` 行 1124） | frozen TS 物理属性（`src/domain/types/hypothesis.ts`） |
|---|---|---|
| ① | `hypothesis_statement` | `hypothesis_statement` |
| ② | `hypothesis_basis` | `rationale` |
| ③ | `hypothesis_history_refs` | `referenced_attempt_ids`（`structure.ts` 的 `HYPOTHESIS_FIELD_KEYS` 作 `referenced_attempts`，同指 ③） |
| ④ | `hypothesis_change` | `next_change` |
| ⑤ | `hypothesis_keep` | `kept_conditions` |
| ⑥ | `hypothesis_metric` | `observation_metric` |
| ⑦ | `hypothesis_support_criterion` | `support_criterion` |
| ⑧ | `hypothesis_contradict_criterion` | `refutation_criterion` |

- 8 项**顺序与语义 1:1 一致** ⇒ **无 `PRODUCT SEMANTIC CONFLICT`**（与 §M9-3 口径一致）。
- 🔴 **不是** alias schema、**不是** compatibility DTO、**不是**第二套字段词汇；**代码以 frozen TS type 为物理真源**，文档 `field_key` 保留其**逻辑标识**用途。
- 命名状态：原 **`DOCUMENTATION NAMING DEBT / NON-BLOCKING`**（登记于 `.learnbuddy/memory/2026-09-25.md` 的 `M15` 节 §6）⇒ 本次**收窄为 `CROSS-LAYER NAMING MAPPING` / `NON-BLOCKING`**。🔴 收窄 = 从「债务式表述」改为「两层各自真源 + 显式映射」口径；**不新增规则、不改代码、不建 alias schema、不新增 `AC`**。
- 🔴 **不改** `src/domain/**`、不改 Frozen Contract `v0.3`。

### M15-5. 实测（全部实跑，输出重定向到 `%TEMP%\m15_*.txt`）

```
npm run typecheck / typecheck:core / typecheck:browser / typecheck:server = PASS (exit 0)
npm run build      = PASS (exit 0)
npm test           = 795 pass / 0 fail / 121 suites（基线 783 全部保留 + 12 新增）
npm run test:proxy = 15 pass / 0 fail / 1 suite
```

- 🔴 全部模型应答 = 手写 `NOT_A_REAL_LLM_OUTPUT` fixture；**Real Provider Calls = 0；费用 0 元**。

### M15-6. Git / 边界 / 下一步

- 改动集 = `src/application/hypothesis/identity.ts`｜`src/tests/application/hypothesis/identity-codec.test.ts`（新增）｜`20_INTEGRATION/CODING_START_HANDOFF.md`（§15 追加）｜`.learnbuddy/memory/**`。🔴 **未触碰** `src/domain/**` / `src/retrieval/**` / `src/application/insight/**` / `src/browser/**` / `src/server/**` / `api/**` / `docs/**` / `package.json` / `tsconfig*.json`。Secret Scan = 无凭据形态串。
- 🔴 **未更新 `docs/CHANGELOG.md`**：该文件当前**无任何 `S01` 条目**（最新为 2026-09-24 Gate C）。为避免出现「只有 `M15` 一条 `S01` 记录」的误导性口径，本次 Landing **只写 `20_INTEGRATION/CODING_START_HANDOFF.md §15`**（任务允许项为「若必须」，判定为不必须）。
- 🔴 **仍全部 `PENDING`**：`PSA-01`–`13` + `X1`–`X11`｜真实浏览器人工验收｜Real Provider 兼容性｜Vercel 部署（`NOT EXECUTED / PENDING PRE-SUBMISSION`）。
- **`SAFE NEXT = S01-06｜App Shell + D9 UI Integration`**；`M16 = READY AFTER M15`（🔴 排序仍排 `S01-06` 之后）。🔴 **未授权自动启动，本轮完成后停止。**
- 🔴 **新增禁写**：写「`M9` codec 修复改动了 `encode`」｜把 `M9` 的 `decodeOperationIdToken` 写成有生产调用点｜把 8 项 Logical→Physical 映射写成第二套产品语义 / alias schema / compatibility DTO｜写 `S01-06` 或 `M16` 已启动｜把 `M15-LAND` 表述为 `Production Ready` / 浏览器已验证 / provider 已验证 / Vercel 已验证 / `PSA` 通过。

## D. 模块语义钩子（原 `MEMORY.md` §5 长条细节，2026-09-25 第五次压缩后下沉到本节；`MEMORY.md` 只留指针）

- **编译作用域**：core（`src/domain` + `src/workspace` + `src/ai`（仅 `M10`）+ `src/application` + `src/retrieval`，**NO DOM**）/ browser（`src/browser/**`，DOM，`types: []`）/ server（`api/proxy/**` + `src/server/**`，Node，NO DOM）/ proxy-test（`tsconfig.proxy-test.json` → `dist-proxy-test/`）。`tsconfig.build.json` 生产构建真实包含 `src/application/**` 与 `src/retrieval/**`。
- **模块归属**：`src/ai/**` = `M10` 契约 only；`M12` 纯策略 = `src/server/proxy/**`、运行时壳 = `api/proxy/**`；`src/browser/ai/**` = `M11`/`M13`；`src/browser/workspace/**` = `M2`；`src/application/capture/**` = `M4`/`M5`（①–⑤）；`src/retrieval/compare/**` = `M6`（⑥⑦）；`src/retrieval/grounding/**` = `M7`；`src/application/insight/**` = `M8`（⑧）；`src/application/hypothesis/**` = `M9`（⑨⑩）。
- 🔴 **`M6` 唯一计算点**：corpus 过滤（`eligibleHistoricalAttempts` = Formal ∩ active ∩ 非源自身）/ 排序（`ordering.ts`）/ 全局 `uncompared`（源记录自身 unknown 维度）/ `related` ⇔ matched 非空（`D-061`）/ `N_检索`（复用 `NRetrievalSnapshot`）。判定链路 = unknown **结构拦截**（不调 AI）→ 安全确定性规则 → `M10` **离散**判定（答案白名单只允许 `verdict`/`reason`；`uncompared` 不可由 AI 返回）。**三种 0-like 状态严格分离**：`HISTORY_EMPTY` / `NO_RELATED_HISTORY` / `RETRIEVAL_RUNTIME_INCOMPLETE`。Derivation 持久化留在本模块（工作区 `retrievals/<source_attempt_id>.json`，每源至多 1 条当前有效，rerun 覆写；无版本历史 / 无 DB / 无物理删除）。
- 🔴 **`M7`** 只**构造 / 校验 / 派生**（`GroundingContextPack` / `EvidenceRef` / ⑩ 视图 / `N_引用`），**自身不持久化任何东西**；`N_引用` 唯一派生点 = `deriveCitationView`（按 distinct `target_id` 去重），⑩ 追溯与计数共用同一 `EvidenceRef[]`；`EREF_` 前缀为 `M7` 局部（未改全局 `ID_PREFIXES`）；`EvidenceRef` 只有 5 个冻结字段，`source_archived` 每次读取按 target 当前 `archive_state` 动态派生（**无快照字段**）。
- 🔴 **`M8`** 只生成 `candidate`；`E1`/`E4` 结构性机器派生（fresh 复核、**不看归档位**），`E2`/`E3` 为 AI **离散** `pass`/`fail` + 理由（接受时用已存判定，仅内容修改才重跑 AI —— `D-039`）；`M7` 为唯一引用校验点（任一选择被拒 ⇒ 整次生成 fail-closed、零落盘）；**不重算 `N_引用`**；事件恰四类（`candidate→rejected` **不写事件**）；物理落点 = `insights/<id>.{json,md}` + `insights/batches/<batch_id>.json`（`operation_id` = 幂等锚点）+ `events/insight-state-events.jsonl`。
- 🔴 **`M9`** 两类输出（`grounded` `saved=null` / `model` `saved:boolean`）共用 `HYP_` 空间、新生成恒 `undecided`；裁决位最小矩阵 `undecided→accepted/rejected`（无 revoke、无内容修改状态机）；**保存位 ≠ 裁决位**；`N_检索` = 第一道门（`=0` ⇒ 结构禁止 grounded、路由 `EXIT-A`）；grounding **二值 + 结构化**（`G1`–`G4` 由载体字段表核对，`N1/N2/N5/N6` 结构性 fail-closed，`N3/N4` 由独立第二次离散 `M10` 判定 —— 🔴 绝不相信载荷自称 grounded）；数量 1–2 自适应（禁 3 条 / 禁凑数 / 每条各自 `N_引用 ≥ 1`）；出口三分结构性派生（🔴 禁把 `B/C` 写成「历史证据不足」）；`evidence_overview` 读时派生；⑤ 三分（AI 建议存 `M9` 局部列 `kept_condition_recommendations`，**不改冻结 ⑤ 类型**）；⑥⑦⑧ 两层（AI `Inference` / 用户 `Fact`，合并不删除）；物理落点 = `hypotheses/<id>.{json,md}` + `hypotheses/batches/<batch_id>.json` + `hypotheses/operations/<operation_key>.json` 恢复锚点（写序 = 锚点→记录→批次→标 `complete`；**不声称原子性，提供 replay recovery**）。
- **`AC` 口径** = 连续 canonical 162 ＋ 独立 `AC-Q06` 6 ＝ **全部有效验收点 168**。`SP-06` = 已执行｜`HISTORICAL = CONDITIONAL PASS`（7/6/7/0）＋ `DEPLOYMENT / BROWSER MANUAL = DEFERRED TO PRE-SUBMISSION`；`TEST SPEC GAP` = `HISTORICAL / NON-BLOCKING UNDER D-057`（🔴 禁写 `RESOLVED BY TEST`）。`PSA-01`–`13` + `X1`–`X11` = 全 `PENDING`（🔴 非产品 `AC`）。File System fallback = `NO DECISION REQUIRED`（F1–F4）。`SP-01a` = `SUPERSEDED BY D-053`；`Legacy Cloud Cleanup` = `DEFERRED` / 未授权执行。
- 🔴 **仍生效的实现裁决**（→ §C-S0105INTEGRATE / §C-S0105B / §C-S0105C）：`Move`/`Rename` = `TECHNICAL LIMITATION ACCEPTED`（`MOVE_UNSUPPORTED_BY_BROWSER`；不得用 `copy→write` 或物理删除补齐；P0 不得依赖 `move()` 成功）；`M1`/`M15` 须**同时**处理 `WorkspaceStorageError` + `BrowserWorkspaceAccessError`（`original_error` 仅内部诊断，不得渲染给用户）；追问答案双层落库；`Formal` 后 `Attempt Draft State` 只读留档（写入拒 ⇒ `FORMAL_DRAFT_STATE_READONLY`）；内容条目 id 恒非位置型。
- 🔴 **三处已被就地取代的历史路径**：`src/ai/boundary/**`（`M12` 策略）→ `src/server/proxy/**` + `api/proxy/**`；`src/workspace/adapter/**` → `src/browser/workspace/**`；`src/ai/**` 只放 `M10`。

## C-S0106. `S01-06` App Shell + D9 UI Integration 已执行（2026-09-25｜🔴 **本节取代 §C-M15 §M15-6 中「`SAFE NEXT = S01-06` / `S01-06` 未启动」的表述**）

### S0106-1. 任务状态

```
S01-06                      = DONE / ACCEPTED
UI IA                       = A 主体（单页三栏工作台） + C 交互语言（中央 ①→⑩ 引导流程）= S01-06 UI IMPLEMENTATION BASIS
Web App                     = LOCAL BUILD VERIFIED（🔴 不是 REAL BROWSER VERIFIED）
M16                         = NEXT（🔴 未授权自动启动）
Git                          = 9c41624 → aa8e89f8a8e45bc65d41034c58c719b2e4efd41f（无 remote / 未 push）
```

- 🔴 `Decision Added = 0`｜`AC Added = 0`｜`Frozen Contract Modified = NO`｜`CCR = NO`｜`INTEGRATION REQUEST = NO`｜`BLOCKER = NO`｜`PRODUCT SEMANTIC CONFLICT = NO`。
- 🔴 人工 UI 裁决（A+C）为 **IMPLEMENTATION BASIS**，**不是新产品机制**、**不新增 Decision ID**；不得重新询问 A/B/C，不得改成多页面 SaaS / 纯聊天 / 看板 / Dashboard。

### S0106-2. 交付与目录归属

```
src/ui/**（24）   App Shell：presenters（steps/retrieval/insights/hypotheses/capture/notices/rail/fields）
                  session（ui-port / operation-ids / browser-gateway / app-session）
                  components（shell / left-rail / evidence-rail / steps）+ settings/provider-presets
                  copy / dom / app-root / bootstrap / styles/app.css
app/**（2）       index.html + main.ts（复制 / 编译进 dist-web/）
scripts/**（2）   build-web.mjs（只拷贝静态资源）/ serve-web.mjs（node:http 本地预览 + 路径逃逸 403）
tsconfig.web.json WEB scope（src/ui + src/browser + app；lib = ES2022 + DOM + DOM.Iterable；outDir = dist-web）
dist-web/         🔴 独立产出目录（与 dist / dist-test / dist-proxy-test 互不覆盖）；已 gitignore
```

- 🔴 **未引入 UI 框架、未新增依赖**（`package-lock.json` 零改动）：`tsc` 直接产浏览器 ESM ⇒ 无 bundler、结构上不可能打入 Node builtin。
- 🔴 **core 无 DOM 未变**：`tsconfig.core.json` / `tsconfig.json` / `tsconfig.build.json` / `tsconfig.test.json` 一行未改（Web 为**新增**配置）。
- 新增脚本：`typecheck:web` / `build:web` / `dev:web`（http://127.0.0.1:5173/）/ `preview:web`。

### S0106-3. `INTEGRATION EXTENSION`（只读，非新产品 Decision）

- `src/application/workflow/attempt-summaries.ts`：`WorkflowAttemptSummary` + `createWorkflowAttemptIndex().listWorkflowAttempts()`（左栏列表）。只含标题 / 摘要 / `Draft｜Formal` / L4 ③ 数据性质 / 归档位 / 时间 ⇒ **无相似度、评分、强度、等级、价值字段**。
- `src/application/workflow/retrieval-expansion.ts`：`openedRetrievalView(snapshot)` / `readOpenedRetrievalView(port, id)` ⇒ 把**同一条已存 Derivation** 的阅读折叠打开（`retrievalViewOf(record, { expanded: true })`），**不重跑检索、不改 `N_检索`**。
- 🔴 两者都**不改 `D9WorkflowService`**、不新增业务状态、不新增 `AC`；UI 侧**不 import `src/retrieval/**`**（投影点留在 `M15`）。

### S0106-4. 关键实现口径（`IMPLEMENTATION PARAMETER`）

1. **步骤状态全派生**：`stepFactsOf(snapshot)` → `stepViewsOf(facts)`；🔴 **无** `current_step` / `progress_percent` / `workflow_stage` / `step_completed[]` / `completion_score`，**不持久化**。
2. **未授权零读**：`AppSession.requirePort()` 是唯一门；`port === null` ⇒ 一切读写直接返回。picker 仅在用户点击 handler 内调用（全仓唯一调用点，已由静态审计断言）。
3. **Provider**：真实 `composeBrowserProvider` + `composeBrowserWorkflow`；`unsupported` 一等结果 + 冻结文案；**无 fallback / 无换路径 / 无随机 provider**；连接方式**只显示不可选**；Custom Base URL **仅 browser_direct 预设**开放。
4. **凭据**：仅 `M13` session-only store；password 输入 + 「仅当前会话使用」；**无「记住我」/ 无 localStorage / 无 IndexedDB / 无工作区持久化**；`ProviderConfig` 键集运行时钉死（无 `api_key`）。🔴 API Key 为**非阻塞校验**（缺失只 warning），否则未填 key 会让左栏读不出来。
5. **操作 id** = `op-<action>-<opaque token>`（🔴 **不含位置**：无序号 / 无数组下标 / 无 step number）；内存 ledger「重试复用、成功失效」。
6. **生成时机**：⑧/⑨ 各一个显式入口；到达 ⑦ 时二者调用数 = 0；`rerunRetrieval` **不级联** ⑧/⑨。
7. **⑤ ⇒ ⑥**：UI 不插第二个检索确认（U15）；保存成功 + 检索失败 ⇒ 同时显示「✓ 已保存」与「历史检索没有完成 + 重新检索」，**不回退 Draft**。
8. **三种 0-like + 未检索 = 4 句互异文案**；⑦ 无数值（用例扫描全部 `src/ui/**/*.ts` 断 `\d+%` / `x/10` 为 0）；⑧ 经验区**只**取 `experience_assets`；⑨ `Hypothesis` 恒非经验、Model Suggestion 恒带非历史依据声明；`EXIT-B/C` 不含「历史依据不足」；`N_引用` 只读 `CitationView`。
9. **`provider-presets.ts` = S01-06 WIRING 参数**（🔴 非「某 provider 已验证」声明）；路径仍由 `resolveProviderPath` 裁决。
10. 🚩 **集成约束（事实，非缺陷）**：`M15` composition root 要求已组合 provider ⇒ **读工作区前需先保存一次模型配置（Provider + Model 即可，API Key 可后填）**；UI 已明确文案，未绕过 composition root。

### S0106-5. 实测（全部实跑，输出重定向到 `%TEMP%\s0106_*.txt`）

```
typecheck / :core / :browser / :server / :web = PASS (exit 0)
npm run build = PASS｜npm run build:web = PASS（dist-web/index.html + 140 模块 + 1 CSS）
npm test           = 846 pass / 0 fail / 138 suites（🔴 基线 795 全部保留 + 51 新增）
npm run test:proxy = 15 pass / 0 fail
本地静态冒烟（127.0.0.1:5173）：/ 200 html｜/app/main.js 200 js｜/src/ui/styles/app.css 200 css
                                 /%2e%2e/package.json 403｜/..%2fpackage.json 403｜/nope.js 404
```

- 🔴 全部模型应答 = `NOT_A_REAL_LLM_OUTPUT`；**Real Provider Calls = 0；费用 0 元**。
- 🚩 **环境新事实**：本机 `PowerShell` 默认沙箱**禁止写入工作区**（`tsc` 写 `dist/**` 报 `EPERM`，路径按 GBK 乱码）⇒ **产生写入的命令须提权**；只读 `typecheck` 不受影响。

### S0106-6. 🚩 就地修订（不改写历史）

`src/tests/application/workflow/static-audit.test.ts` 原有断言「`src/ui` / `app` 不得存在（S01-06 未启动）」在本轮**按事实失效**；**未删断言**：改为「二者必须存在，且不得出现第二套 UI 目录」，**原断言文本保留在注释中**，业务规则边界证明改由 `src/tests/ui/static-audit.test.ts`（U1 / §49）承担。

### S0106-7. 边界 / 下一波

- 🔴 **未做**：`M16` Demo Seed（**零假 Attempt / Insight / Hypothesis / EvidenceRef**）｜Vercel 部署｜`PSA-01`–`13` + `X1`–`X11`｜Real Provider 调用｜真实浏览器人工验收｜README 终版 / PPT / Demo 视频｜GitHub push｜账户系统 / 云同步 / 多人协作 / Graph DB / Vector DB / 主题切换。
- 🔴 **新增禁写**：不得写「REAL BROWSER VERIFIED」「REAL PROVIDER VERIFIED」「VERCEL VERIFIED」「PRODUCTION READY」；不得把 `dist-web` 本地构建 / 本地预览写成本地优先已验收；不得写 `S01-06` 引入了 UI 框架或新增依赖；不得把 provider 预设写成「某 provider 已验证 / 已兼容」。
- **`SAFE NEXT = M16｜Demo Workspace / Local Seed` + `S01-06 Local Visual Smoke Review`**；`PRE-SUBMISSION PSA` = **仍 `PENDING`**。🔴 **未授权自动启动，本轮完成后停止。**

### D-END. 协作规则承重口径（原 `MEMORY.md` §2 全文，2026-09-25 第五次压缩后下沉）

- 权威 = `docs/00_PROJECT_RULES.md`。方案先行 / 小步迭代；先定位原因，不用大重构绕过。
- 🔴 **人工决策项**：目标用户·核心问题·产品边界·V1 范围·「孵化」定义·AI 推断深度·技术架构·UI·验收标准·冻结发布。
- **状态语义**：`PROPOSED`（默认）/ `CONFIRMED`（仅用户明确确认）/ `REJECTED` / `SUPERSEDED`；**不得因表达完整自动升级**。
- **事实 / 推断 / 建议分离**；**相关 ≠ 因果**；**N=1 不推一般**。
- **不改写历史**（留旧文本 + 就地补注）。
- 🔴 **不得伪造实测 / 云端状态**。
- 🔴 **成本纪律**：默认免费额度；付费资源创建前须报「资源 + 规格 + 预计费用」并等二次确认；不得先建后报。
- 🔴 **凭据**：本人登录；AI 不持有登录态；凭据不入任何文件 / 日志 / 报告 / 前端产物。

---

## C-S0106B. `S01-06B` Providerless Workspace Read Path 已执行（2026-09-26｜🔴 **本节取代 §C-S0106 §S0106-7 中「`SAFE NEXT = M16` + `S01-06 Local Visual Smoke Review`」的表述，并取代 §S0106-4 中「读取需先配模型」的口径**）

### S0106B-1. 任务状态

```
S01-06-D1 = CONFIRMED → IMPLEMENTED（人工裁决：本地 Workspace 的选择不得以 Provider / Model 已配置为前置）
Decision Added = 0        AC Added = 0        Frozen Contract Modified = NO        CCR = NO
Git = a1ff7371dbcb1fa622a6f1a4abae3e7996fb117f（19 files changed, +2211 / -444）
Working Tree = CLEAN
```

### S0106B-2. 核心结构（三处新增 = 三个「读半边」）

```
src/application/capture/capture-state-reader.ts      M4 读端口（missingFollowUpGaps / recoverParseProposal / readCaptureState）
src/application/workflow/workspace-read.ts           M15 读层（buildSnapshot 唯一组装点 + traceHypothesis 信封）
src/browser/application/workspace-reader-composition.ts   READ composition（composeBrowserWorkspaceReader，无 provider）
```

🔴 **单点不复制**：`workflow-service` 委派 `reads.readWorkflow` / `reads.traceHypothesis`；`insight-service` / `hypothesis-service` 抽出 `createInsightReadService` / `createHypothesisReadService` 并委派；`capture-service` 委派 `createCaptureStateReader`。⇒ 同一持久化 Workspace + 同一 `attempt_id`，两条读取路径业务数据**深度相等**（有 B14 断言钉死）。

### S0106B-3. 关键实现口径（`IMPLEMENTATION PARAMETER`，非 Decision）

- **禁止 Fake Provider**：读组合**不接收** provider / credential，不构造 `FakeProvider` / `NullProvider` / `NoopProvider` / placeholder adapter（静态审计断言其**无法被命名**）。
- **⑩ trace 属 READ**：`M9` 从已存引用集派生；无 provider 也必须可用（`traceHypothesis` 从 command port 移到 read port）。
- **命令侧零改动**：`composeBrowserWorkflow` / `composeBrowserProvider` / 路径裁决 / `CredentialRef` 边界**一行未改**。
- **UI 双门**：`requirePort()` = 读门（workspace 授权即可）；`requireCommandPort()` = 命令门（需 provider composition）。无 provider 时点击 AI 动作 ⇒ `ai_requires_model`（🔴 **纯内存 / UI 状态**）+ 文案「此操作需要模型服务，请先完成模型设置。」+「打开模型设置」；🔴 **不产生 `GATE`/`RUNTIME` notice**。
- 🔴 **未新增持久字段**：无 `workspace_mode` / `read_only_mode` / `provider_ready` / `ai_enabled` / `browse_mode`。
- **错误分离**：Workspace 权限失效清空读取并走 `BrowserWorkspaceAccessError` 安全映射；Provider 不可用**只**清空命令路径，workspace / rail / 已打开记录不变。
- **共享 storage**：两条 composition 同一 `WorkspaceStorage`；配好模型后**不重选目录 / 不刷新 / 不重导入**，选中项保持。

### S0106B-4. 实测（全部实跑，输出重定向到 `%TEMP%\s0106b_*.txt`）

```
npm run typecheck / :core / :browser / :server / :web   → 全部 PASS
npm run build / build:web                               → PASS
npm test        → 871 pass / 0 fail（基线 846 全保留；+25 = B1–B14）
npm run test:proxy → 15 pass / 0 fail
ProviderAdapter call count（browse 期间）= 0      Credential read count = 0      Real Provider Calls = 0
```

- 新增 `src/tests/browser/application/providerless-workspace-read.test.ts`（B1–B9 / B14 / 读边界 / 静态审计）；
- 新增 `src/tests/ui/providerless-browse.test.ts`（B1 / B10–B13）；
- 🔴 每条断言标注既有 `AC` 或 `IMPLEMENTATION INVARIANT`；**未新增 `AC`**。

### S0106B-5. 浏览器本地 Smoke（🔴 射程受限）

```
Browser Local Smoke = PASS      Chrome 154.0.8037.57（headless=new，本机真实 Chromium）
Workspace = 临时 fixture（23 个真实工作区文件，🔴 NOT M16 seed）      Provider calls = 0      exceptions = 0
① 初始：未选择工作区 + 模型服务未配置，无左栏       ② 选目录后：已连接本地工作区 + 仍「模型服务未配置」，左栏 5 条
③ 打开记录：三栏工作台渲染，已存检索结果可读        ④ 无 provider 点 ⑧：显示引导文案 + 打开模型设置，无系统错误
```

🔴 **射程**：原生目录选择器**无法由 CDP 代点**（`cdp-browser-evidence` skill 明文禁止写成 PASS）⇒ smoke 在**选择器这一处**返回 Chromium 自身 **OPFS** 目录句柄（真实 FSA 存储），其余 FSA 调用 / 读组合 / 渲染 / 事件链路全为生产代码。**不得**据此写「REAL BROWSER VERIFIED」「FSA 人工验收通过」。真实句柄 + 权限生命周期仍 `PENDING PSA`（`PSA-03`–`PSA-06`）。

### S0106B-6. 边界 / 下一波

- 🔴 **未做**：`M16` Demo Seed（工作区**零 seed 写入**）｜Vercel｜`PSA-*`｜Real Provider 调用｜真实目录句柄人工验收｜无 provider 下的本地 mutation（providerless = **READ-ONLY**）｜`move()`（仍 `MOVE_UNSUPPORTED_BY_BROWSER`）。
- **`SAFE NEXT = M16｜Demo Workspace / Local Seed`**；`PRE-SUBMISSION PSA` = **仍 `PENDING`**。🔴 **未授权自动启动，本轮完成后停止。**
- 🔴 **禁写（不变 + 新增）**：不得写「Vercel 已验证 / 已部署 / Production Ready」「Local-first 已可行 / 已完成浏览器验收」「Chrome / Edge / FSA verified」「real provider verified」；🔴 新增：不得把 providerless read 的本地 smoke 写成「真实浏览器人工验收已通过」。

---

## C-M16. `M16`｜Demo Workspace / Local Seed 已执行（2026-09-26｜🔴 **本节取代 §C-S0106B §S0106B-6 中「`SAFE NEXT = M16`」的表述**）

### M16-1. 任务状态

```
M16 = DONE / ACCEPTED          Demo Seed = 8 Formal Attempts（attempt-only）
Demo Workspace = LOCAL READY   Providerless Browse = VERIFIED LOCALLY（仅限本地 smoke 射程）
Real D9 Demo with Provider = PENDING PSA / REHEARSAL
AC-74/75/100 archived reference scenario = REHEARSAL REQUIRED（静态 seed 不覆盖，未声称覆盖）
Decision Added = 0   AC Added = 0   Frozen Contract Modified = NO   CCR = NO   BLOCKER = NO
Git = d885ab49cd7ef283eb16882de08e193587195bb1（baseline a1ff737 → d885ab4；39 files changed, +4510 / -10）
```

### M16-2. 交付物（`src/demo/**` = Node-only 运维工具，**不进** core / build / browser / web）

```
src/demo/demo-baseline-definition.ts   8 条冻结 fixture + 3 个 PRJ_ + 冻结 WS_ + 运维 marker 常量
src/demo/demo-workspace-marker.ts      身份证明（marker + workspace.json 两重独立证据）
src/demo/demo-workspace-storage.ts     Node fs 可写 WorkspaceStorage + clearContents()（结构守卫）
src/demo/seed-demo-baseline.ts         seed_demo_baseline（静态定义 + 固定 ObjectId + 复用/创建）
src/demo/reset-demo-baseline.ts        reset_demo_baseline（fail-closed，先证明再清空再重建）
src/demo/live-demo-script.ts           TE-DEMO-LIVE-01 登记（**只是文本，不是第 9 条记录**）
src/demo/cli.ts                        seed / reset / status / where；src/demo/index.ts barrel
demo-workspace/**                      21 个文件，真实可选目录（1 workspace.json + 1 marker + 3 project.json + 8×2）
```

`package.json`：`demo:seed` / `demo:reset` / `demo:status` / `demo:where`（先 `tsc -p tsconfig.test.json` 再跑 `dist-test/demo/cli.js`，与 `dev:web` 同构）。`tsconfig.json` include 增 `src/demo/**/*.ts`（Node 侧作用域）。

### M16-3. 关键口径（`IMPLEMENTATION PARAMETER`，非 Decision）

- **只到 `Attempt` 层**：不预置 `Retrieval Derivation` / `Insight` / `Hypothesis` / `EvidenceRef` / `N_检索` / `N_引用` / `matched` / `comparison`。
- **唯一 Demo 标注 = 既有 L4 字段 `data_source_nature = 'demo_sample'`**；🔴 **未新增** `is_demo` / `is_seed` / `demo_flag` / `source_flag`。UI badge 由该字段投影（未硬编码任何 fixture key / 对象 ID）。
- **不走后门**：记录经**真实 `AttemptRepository`**（`createAttempt` → `updateAttempt`）建立，`Formal` 门槛 / `Draft→Formal` 合法性 / sidecar 一致性全部由生产代码保证。
- **Level A 值登记为 `Fact`**（fixture 自己声明的历史），**不冒充 LLM 输出**；`result_status` = 用户 `accepted` 的决策型 `Inference`。
- **未知一律显式**：`expected_result` / `judgment_basis` / `key_parameters` / `environment` / `cost` / `occurred_at` / `user_note` / `failure_tags` 在 8 条上全为 unknown/空 —— **未编造**批次 / 设备 / 成本 / 阈值 / 失败原因。
- **时间戳是展示参数**：让 `DEMO-01` 最新（左栏按 `updated_at` 新→旧），便于演示主命中目标置顶。
- **`DEMO-06` Level B 陷阱由 `Project` 唯一承担**（同 `PRJ_`，标签与环境在 8 条上同为「未提供」）；🔴 **未为陷阱编造标签**。
- **reset 是运维动作**：产品 UI **无** Reset 按钮；`src/ui` / `src/browser` / `app` / core / application / retrieval **零 import** demo 工具（静态审计断言）。
- **reset fail-closed**：先 `resolveDemoWorkspaceRoot` 结构守卫（拒文件系统根 / 无父目录 / 不存在），再 `proveDemoWorkspaceIdentity` 两重证据（marker + `workspace.json.workspace_id` 均 = 冻结 Demo ID）；不通过 ⇒ **REFUSE 且一字节不动**；清空只删**根目录子项**。
- **seed fail-closed**：目标 `workspace_id` 非冻结 Demo ID ⇒ `DEMO_SEED_FOREIGN_WORKSPACE`；fixture 位被**语义不同**的记录占用 ⇒ `DEMO_SEED_CONFLICT`（**绝不改写历史**，改用 reset）。
- 🚩 **环境坑（可复用）**：`fs.cpSync` 在**源路径含中文**时会让 Node 进程崩溃（`0xC0000409`）⇒ 一律改**逐文件复制**。

### M16-4. 实测（全部实跑，输出重定向到 `%TEMP%\m16_*.txt`）

```
基线 HEAD = a1ff7371dbcb1fa622a6f1a4abae3e7996fb117f（上一任务 S01-06B 提交）
typecheck / :core / :browser / :server / :web  → 全部 PASS
build / build:web                              → PASS
npm test        → 929 pass / 0 fail（基线 871 全保留；+58 = D1–D20 / §31 / 资产与静态审计）
npm run test:proxy → 15 pass / 0 fail
seed 幂等  → 第 2 次 seed：created 0 / reused 8；工作区 21 文件 SHA256 逐字节不变
reset      → 对 demo 副本：created 8 / reused 0 / 21 文件，且与仓库基线**逐字节相同**
            拒绝：无 marker 的普通目录（MARKER_MISSING，用户文件保留）｜marker 在但 workspace_id 不符（WORKSPACE_ID_MISMATCH）
                  ｜文件系统根（FILESYSTEM_ROOT）｜不存在的路径（NOT_A_DIRECTORY）
Real Provider Calls = 0        Decision Added = 0        AC Added = 0
```

### M16-5. 浏览器本地视觉 Smoke（🔴 射程受限，与 S01-06B 同口径）

```
Local Visual Smoke = PASS     Chrome 154.0.8037.57（headless=new，本机真实 Chromium）
Workspace = 仓库内 demo-workspace/**（21 个真实文件）     Provider calls = 0     未捕获异常 = 0
V1 左栏 8 条 ｜ V2 Demo badge 清晰（badge-demo）｜ V3 打开 DEMO-01 中栏内容合理
V4 打开 DEMO-07：Demo 示例数据 + 已归档 双 badge + 「已归档的记录只读。」（🔴 该行排序在最后，需滚动才可见，已如实登记）
V5 顶栏「已连接本地工作区｜m16-demo-ws」+「模型服务未配置」   V6 全程未出现「请先完成模型设置」
V7 布局仍为 A Workbench + C Guided Flow（left rail / workbench / rail-right 三区俱在）
证据：%TEMP%\m16-smoke\out\（8 张截图 + smoke-report.json）
```

- **视觉修复**（本任务内小 polish，未改结构 / 未改语义）：左栏 `264px → 320px`（右侧 `336px → 312px`）缓解中文标题与摘要挤压与左右栏失衡；`.attempt-excerpt` 加 3 行 clamp（视图模型本就以 `ATTEMPT_SUMMARY_EXCERPT_MAX` 截断，clamp 是其视觉对应物，正文完整内容在中央面板）。
- 🔴 **射程**：原生目录选择器**无法由 CDP 代点** ⇒ 仅在**选择器这一处**返回 Chromium 自身 **OPFS** 目录句柄（真实 FSA 存储），其余 FSA 调用 / 读组合 / 渲染 / 事件全为生产代码。**不得**写「REAL BROWSER VERIFIED」「FSA 人工验收通过」；真实句柄 + 权限生命周期仍 `PENDING PSA`。
- 🚩 本机安全套件（`*.kaspersky-labs.com`）向页面注入自身请求，已在证据中**单独归类**（未计入被测应用流量）。

### M16-6. 边界 / 下一波

- 🔴 **未做**：真实 Provider 调用｜`PSA-*`｜Vercel｜部署｜彩排。
- 🔴 **未声称**：`AC-74` / `AC-75` / `AC-100` 的**完整 archive-traceability**（「先被引用 → 再归档」）静态 seed **无法覆盖** ⇒ 状态 = `REHEARSAL REQUIRED`；`DEMO-07` 只承担「归档记录不参与新检索」。
- 🚩 **发现（属 `docs/**`，本任务不改文档，只登记）**：`docs/architecture/05_TEST_DEMO_DEPLOY.md` §K.5 的备用脚本 **`-03`**（goal = 「缩短干燥周期」，condition = unknown）标注「预期 0 条 Level A 命中」，但 §J.2 的 **`DEMO-03` goal 恰为「缩短干燥周期」**：二者 `goal` 记号相同，确定性规则即会判 `matched`。⇒ **`-03` 的「合法空态」预期与 `DEMO-03` 冲突**，彩排前需人工裁决（改脚本文字 / 改预期 / 确认是否为有意设计）。本任务因此**只登记 `TE-DEMO-LIVE-01`**，未重述 `-02` / `-03`。
- **`SAFE NEXT`**：`PRE-SUBMISSION｜真实 Provider + Browser PSA → 完整 Demo Rehearsal → Vercel Preview → Submission Package`。🔴 **未授权自动启动，本轮完成后停止**；不得自动执行真实 Provider / Vercel deployment / PSA。
- 🔴 **禁写（不变 + 新增）**：上述全部禁写项继续有效；🔴 新增：不得把 M16 的本地 smoke 写成「已完成浏览器验收 / FSA verified / Demo 已通过彩排」；不得写「Demo 命中 DEMO-01/02 已实测」（真实命中只能由彩排 / `PSA` 观测）；不得写「Vercel 已验证 / Production Ready」。

---

## C-PREPSA. `PRE-PSA-HARDENING-01`｜Historical Formal View + Demo Copy Closure 已执行（2026-09-26｜🔴 **本节取代 §C-M16 §M16-6 中「`-03` 彩排前需人工裁决」的表述**）

### PREPSA-1. 任务状态

```
PRE-PSA-HARDENING-01              = DONE（🔴 Git commit 除外 —— 见 §PREPSA-5）
Formal historical view            = CLOSED
Never-run vs runtime-incomplete   = CLOSED
Demo cross-domain wording         = CLOSED（DEMO-05 / 06）
§K.5 -03 conflict                 = CLOSED / RETIRED
PSA                               = PENDING（未声称 PASS）
Decision Added = 0｜AC Added = 0｜Frozen Contract Modified = NO｜CCR = NO
```

### PREPSA-2. 四个修复（🔴 既有语义的实现修正，无新机制、无新持久字段）

| # | 缺陷（真实页面观测） | 修正 | 落点 |
|---|---|---|---|
| 1 | `Formal` 历史记录打开时 ② 仍判「当前」 | `Formal` = 采集生命周期**已结束**（`D-045`）⇒ ①–⑤ 由**这一条持久化事实**结算，焦点落 ⑥–⑩；**未新增** `current_step` | `src/ui/presenters/steps.ts` |
| 2 | ⑤「历史检索这次没有完成」与 ⑥「这条记录还没有做过历史检索」同屏矛盾 | `saveAndRetrievalAreSplit` **仅在 `runtime_incomplete` 为真** | `src/ui/presenters/retrieval.ts` |
| 3 | providerless 浏览 `Formal` 记录仍出现 Draft 采集控件 | ①–⑤ 每个控件改为**问 read model**（`available_actions`，新增 `actionOffered()`）；②/③/④/⑤ 只读展示 | `src/ui/presenters/steps.ts` · `components/steps.ts` · `copy.ts` · `presenters/capture.ts` |
| 4 | `DEMO-05` / `DEMO-06` `raw_text` 跨域突兀句 | 只改**人类可读 `raw_text`**；`condition` 仍 `null`；Level A / `Project` / `result_status` / 对象 ID / 条数 / 检索预期**未改** | `src/demo/demo-baseline-definition.ts` + 重生成 `demo-workspace/**` |

- 🔴 **语义登记（`IMPLEMENTATION PARAMETER`）**：`Formal` 记录 ①–⑤ 的 `done` 是**阶段级**陈述（「采集阶段已结束且 read model 不再提供采集命令」），**不是**「每步都确实执行过」；⑥–⑩ 仍**逐对象派生**；`Draft` 派生一字未改（`Draft` + 未解析 ⇒ ② 仍是 `current`）。
- 🔴 **新增文案**（`copy.ts`）：`FORMAL_ALREADY_SAVED`（⑤ 替代保存按钮）、`CAPTURE_HISTORY_READONLY`（② 说明为何无控件）、`CAUSES_NONE_RECORDED`（④ 只读为空时，**明示不与 `CAUSES_EMPTY`＝「依据不足」混用**）。

### PREPSA-3. 测试口径（🔴 补充证据 + `IMPLEMENTATION INVARIANT`，不改 `AC`）

```
typecheck / :core / :browser / :server / :web  → 全部 PASS
build / build:web                              → PASS
npm test    → 947 pass / 0 fail（🔴 基线 929 全保留；+18 = src/tests/ui/historical-formal-view.test.ts，P1–P12）
test:proxy  → 15 pass / 0 fail
demo:reset → created 8；demo:seed（第 2 次）→ created 0 / reused 8；demo:status → 8 条 / identity proven
Real Provider Calls = 0
```

- 🚩 **就地补注（不改写历史）**：`src/tests/ui/presentation.test.ts` 原「`Formal` + 缺 ④ ⇒ 焦点 = ④」的断言**按事实失效**，已就地改为「十步全部结算 ⇒ 无 `current` 步」（原结论以注释保留）。
- 🔴 **证据射程**：P6 / P7 由 **presenter 决策面（`actionOffered`）+ 静态接线审计**验证；**渲染 DOM 由 §PREPSA-4 的浏览器 smoke 验证**（Node 测试构建无 `document`）——**未**声称单测驱动了浏览器。

### PREPSA-4. 浏览器本地视觉 Smoke（V-A / V-B / V-C｜🔴 射程受限）

```
Browser = Chrome 154.0.8037.57（headless=new）｜Page = dist-web/ 同源静态服务
Workspace = 仓库 demo-workspace/** 21 真实文件（经 OPFS 真实 FSA 句柄）
Real Provider Calls = 0｜外部请求 5 条**全部**为 *.kaspersky-labs.com（单独归类）｜应用自身 fetch = 1（同源 manifest）｜未捕获异常 0
```

| 观测项 | 结果 |
|---|---|
| **V-A** `DEMO-01`：①–⑤ `完成` / ⑥ `当前` / ⑦–⑩ `尚未开始`；② 徽标 = `完成`；② 无「继续追问」；③④⑤ 无 Draft 控件 | PASS |
| **V-A** ⑤ = 「这条记录已经正式保存。」+ ⑥ = 「这条记录还没有做过历史检索。」（**不同时出现运行期失败句**） | PASS |
| **V-B** `DEMO-05`：① 原文与左栏摘要均新措辞、**不含「干燥温度」** | PASS |
| **V-C** 顶栏 = `已连接本地工作区｜demo-workspace` + `模型服务未配置`；左栏 8 条 `Demo 示例数据` | PASS |

- 🔴 射程：**仅选择器这一处**被替换（原生对话框 CDP 不可代点），其余全为生产代码；**不得**写「REAL BROWSER VERIFIED」「FSA 人工验收通过」；真实句柄 + 权限生命周期仍 `PENDING PSA`（`PSA-03`–`PSA-06`）。证据 = `%TEMP%\pre-psa-harden-01\evidence\`（`evidence.json` + 8 张截图）。

### PREPSA-5. Git（🔴 BLOCKER：本轮**未能提交**）

```
✅ 密钥扫描（改动文件，模式：sk-* / SecretId / SecretKey / Bearer / AKIA / BEGIN PRIVATE KEY / password=）= 0 命中
🔴 `git` 中途已看不到仓库：`git rev-parse HEAD` → fatal: not a git repository；`Test-Path <repo>\.git` = False
   （会话开始时 `git log -1` 仍返回 d885ab4 ⇒ 中途发生，原因未确认；git 2.52.0 本身可用）
🔴 处置：**未** `git init` / **未**重建历史 / **未**从 zip 还原 ⇒ Commit 未执行，由项目负责人确认后自行提交
建议提交信息：fix: harden the historical demo view before PSA
```

### PREPSA-6. 遗留（`PROPOSED` / 需人工确认，🔴 未擅自扩大范围）

| # | 遗留项 | 说明 |
|---|---|---|
| 1 | `DEMO-08` `raw_text` 仍含「干燥温度不适用、没有记录」（同为「论文写作」域） | 与 `DEMO-05` **完全同类**，但任务书只点名 `DEMO-05` / `DEMO-06` ⇒ **未改**，等人工裁决 |
| 2 | ②/③ 字段来源徽标对 `Fact` 显示「你修改过」（Demo seed 从未经 UI 修改） | **copy 精度**观测，**非本轮射程**（`sourceLabelOf` 的既有映射） |
| 3 | `-03` 作废后 §K.5 **没有**「预期 0 命中」备用输入 | 替换输入的真实命中集合只能由彩排 / `PSA` 观测，**未**自行编写预期 |

### PREPSA-7. 下一波

```
SAFE NEXT = PRE-SUBMISSION PSA｜Real Browser + Real Provider｜TE-DEMO-LIVE-01 Full Rehearsal
🔴 未授权自动启动 —— 完成后停止，不得部署 Vercel，不得执行真实 Provider PSA
```

- 🔴 **禁写（不变 + 新增）**：上述全部禁写项继续有效；🔴 新增：不得把本轮 smoke 写成「真实浏览器人工验收已通过」「PSA PASS」；不得写「`Formal` 历史视图已通过真实浏览器验收」；不得写「`DEMO-08` 文案已修正」（**未改**）。

## E. 工程硬约束细则（第七次压缩：2026-09-26 由 `MEMORY.md` §4 原样下沉）

> 本节与 §B 同源互补；§B 偏工具可用性，本节偏实现/验证口径。

- 🔴 **`Bash` 含中文路径必崩** ⇒ 命令走 **PowerShell**；文件列举用 `Glob`/`Grep`；行号只信 `Read`/`Grep`。
- 🔴 命令 **stdout 不回显**（`git` 同，其 stderr 被裹成 `NativeCommandError`）⇒ `& <cmd> 2>&1 | Out-File -LiteralPath $log -Encoding utf8` 落盘后 `Read`；stderr 的 `fatal:` 常是判定依据。**多段写同一 log，每行都要 `-Append`**，漏一处静默从头覆盖。
- 🔴 沙箱**禁止写工作区**（`dist/**` 报 `EPERM`）⇒ `build`/`build:web`/`test`/`test:proxy`/`demo:*` 先试、`EPERM` 再提权；`typecheck`、`Write`/`Edit`、`git add|commit|push` 未受限。
- 🔴 PowerShell 里 `tsc` 裸命令**静默不生效** ⇒ `node node_modules/typescript/bin/tsc`。
- 🔴 `typecheck`/`test` **不含** `src/ui/components/**`（DOM scope）⇒ 回归必须跑满 5 个 typecheck。
- 🔴 `tsconfig.test.json` **无 DOM lib** 且不含 `src/ui/**` ⇒ **测试不能 import DOM-scope 文件**（`components/**`、`dom.ts`、`app-root.ts`）；要可测的逻辑**必须**放**框架中立**模块（如 `src/ui/settings/control-identity.ts`）。
- 🔴 `src/tests/domain/ac-reference-guard.test.ts` 硬门：**每个测试文件 + 每条 `it(...)` 标题**都必须含 `IMPLEMENTATION INVARIANT`（或 `AC-n` / `AC-Q06-n`）。
- 🔴 真实 DOM 交互验证（点击 / Escape / 逐字符输入）走 **CDP `Input.dispatchMouseEvent` + `Input.dispatchKeyEvent`**（真实输入管线，含 focus/caret）；清空字段用 `Ctrl+A`（`modifiers:2`）+ `Backspace`。断言「输入等于 X」前**必须先清空**，否则拿到旧值拼接的假 FAIL。喂 ES module 的静态服务器**必须**给 `.js` `Content-Type: text/javascript`。
- 🔴 CDP 截图 `clip` 是**页坐标**（需滚动元素会截出空白条）⇒ `scrollIntoView` + 截整视口；`selectAttempt` **异步** ⇒ 等**工作台内容**变化。
- 🔴 冒烟**顺序**：`bootstrap.createGateway` 在**无工作区**时返回 `unsupported` ⇒ 点「保存配置」**必须排在「选择本地工作区」之后**；把它当 FAIL 是探针缺陷。探针里写 `out.shot_x.png = …` 抛 `Cannot set properties of undefined (setting 'png')` 同理属**笔误**。
- 🚩 跨 `Page.reload` 统计出站请求**要用 CDP `Network.requestWillBeSent`**（Node 侧累加 + `Page.frameNavigated` 分文档）；页面内计数器会被 `addScriptToEvaluateOnNewDocument` 重新注入而清零。会话级存储模型：**刷新 = 新 `Storage` 对象 + 同一份 backing**；**新 session = 新 backing**。
- 🔴 `sessionStorage` 的 `…/credential/index` 记账键**永远在**（`remove()` 后变 `"[]"` 而不删）⇒ 判「凭据已清除」要看「**无 `…/provider` slot** + index == `"[]"`」，**不能**看「credential 键数为 0」。
- 🔴 假值 Key **不要构造前缀关系**（`sk-fixture-…-PSA` ⊂ `sk-fixture-…-PSA-2`）⇒ `includes()` 断言会把两者混为一谈，**必须整值比较**。清除按钮无 `id`，冒烟按**可见文案**定位后发真实鼠标事件。
- 🔴 其它零散：`fs.cpSync` 源路径含中文让 Node 崩 ⇒ 逐文件复制；命令里的 `%` 判为 cmd 变量 ⇒ 用 `git rev-parse HEAD`；`Remove-Item` 用 `-LiteralPath`；`Write` >600 行静默截断 ⇒ 分块写；追加章节后 `git diff --check` 会报 `new blank line at EOF` ⇒ 尾行不留空。
- 🔴 本地 `refs/remotes/origin/main` **无法落盘** ⇒ `git branch -vv` 的 `[origin/main: gone]` **不代表**远端异常；同步只看 `git rev-parse HEAD` + `git ls-remote origin refs/heads/main`。
- 🔴 本机无模型 API 凭据；Secret Scan 命中全为凭据禁用口径文档文本 + 假值 fixture（`sk-fixture-*`）。Spike 产物不入 `src/`。

## F. 禁写清单全文（第七次压缩：2026-09-26 由 `MEMORY.md` §6 原样下沉）

- 🔴 通用：`Vercel 已验证/已部署/Production Ready`｜`Local-first 已可行/已完成浏览器验收`｜`Chrome/Edge/FSA verified`｜`real provider verified`｜把 `PSA-*` 当 `AC`｜把 `SP-06` 历史改 `PASS`｜未授权新增 `Decision`/`AC`/`CCR`｜把未确认项写成 `CONFIRMED`｜改写历史文本。
- 🔴 各阶段追加项 → §C-M9 §M9-5、§C-M15 §M15-6、§C-S0106 §S0106-7、§C-S0106B §S0106B-6、§C-M16 §M16-6、§C-PREPSA §PREPSA-7。
- 🔴 `GIT-RECOVERY-01`：不得写「原 Git history 已恢复」／旧 hash 属当前 repo。
- 🔴 `REMOTE-BACKUP-01`：不得写「Open Source Submission Complete」／改写 HANDOFF §20。
- 🔴 `RECOVERY-POLISH-01`：不得把静态检查写成 REAL 0-HIT VERIFIED；不得把 providerless 冒烟写成「真实浏览器人工验收已通过」；不得写 `-03` 已恢复。
- 🔴 `PRE-PSA-BLOCKER-01`：不得把 DeepSeek 候选配置写成「已验证/可用/CORS 已支持/Browser Direct 已通过」；不得把 `settings_save_error` 说成持久状态；🔴 **不得把 M2 写成「当时确实产生重复 id 并因此掉焦点」**（那是推断；已观测机制只有 M1）→ HANDOFF §23.7。
- 🔴 `PRE-PSA-BLOCKER-01 / CORRECTION-01`：不得写成「实现与 `D-056` 冲突」（实测为 A）；不得写「刷新后需要重新填写仍成立」；不得把 `ADJACENT-01/02/03` 写成已修 → HANDOFF §23.8。
- 🔴 `PRE-PSA-BLOCKER-01 / CORRECTION-02`：不得写「清除按钮本来就调 `store.remove()`」；不得把 `ADJACENT-04` 写成已修或不存在；不得把「明文未回填」写成「已加密存储」→ HANDOFF §23.9。
- 🔴 `PRE-PSA-BLOCKER-01 / CORRECTION-03`：不得写成「新增了 Credential 校验机制」（只是把**已决** `PSA-D2` 落到保存门槛）；不得写「缺 Key 现在也阻止 Workspace 浏览」；不得把 `ADJACENT-04` 写成 OPEN；不得把 `PSA-D2` 写成 AI 自行决定；🔴 不得写「`PRE-PSA-BLOCKER-01` 之后仍可继续追加普通产品修复」（该任务已 **CLOSED**）→ HANDOFF §23.10。
- 🔴 `PRE-SUBMISSION PSA-A`（2026-09-26）：不得把本地 Chrome PASS 写成 Vercel/Edge PASS；不得把 `X7` 外部 curl/Node 成功替代浏览器成功；不得把静态检查写成 REAL 0-HIT VERIFIED；不得为让 PSA PASS 临场改产品代码。


