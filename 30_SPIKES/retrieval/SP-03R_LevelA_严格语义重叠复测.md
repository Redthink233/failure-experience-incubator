# SP-03R｜D-050 严格语义重叠复测（结果报告）

```
Spike 编号   : SP-03R（P0 技术验证复测）
名称         : Level A「严格语义重叠」(D-050) 复测
阶段         : S00-03｜技术架构与实现方案收敛
前提         : D-050 = CONFIRMED（严格语义重叠判据）—— 本复测不重新讨论 D-050
执行方式     : 本机 LearnBuddy 会话内新起的独立判定子会话（一次性、可丢弃）
艺术品种类   : DISPOSABLE / NON-PRODUCTION —— 不是产品代码、不是 canonical、不是实现依据
日期         : 2026-09-19
结果分级     : PASS（射程与环境限定见 §K / §C.1）

SP-03R RESULT             : PASS
主矩阵完成                 : 24 / 24（8 CASE × 3 RUN）
扩展后总计                 : 48 / 48（8 CASE × 6 RUN）
H1–H10                    : 通过 10 / 10
R1–R8                     : 通过 8 / 8
matched set 稳定性          : 稳定（8 / 8 CASE）
related 翻转               : 否（0 次）
uncompared 翻转            : 否（0 次）
R-A 证据                   : 可交付性获得正向实验证据
TQ04                      : 仍留 Gate B = 是
TQ09                      : 需要 Integrator 关注 = 是
是否需要新 Spike           : 是（属"实现期验收性复核"，非"补测稳定性"；见 §N）
BLOCKER                   : 无
CCR                       : 无
PRODUCT SEMANTIC CONFLICT  : 无
DECISION REQUIRED          : 无（新增人工裁决项 = 0；登记 1 项 Integrator 观察项，见 §I.4）
```

> 🔴 **本报告不 CONFIRM 任何事项**：不 CONFIRM `TQ04`、不选择 `R-A`、不选择模型 / provider、不选择数据库 / 技术栈、未进入产品编码、未进入 `S03-E`。
> 🔴 **本报告未修改任何 SP-03 原始结果**：`SP-03_cases.json`（Gold）、`SP-03_model_input.json`、`SP-03_raw_model_output.json`、`sp03_verdicts_run-1`–`run-6`、`SP-03_results_primary.json`、`SP-03_results_extended.json`、`SP-03_structural_probe.json`、`sp03_runner.py`、`SP-03_LevelA_相关性判定可行性.md` **全部逐字节未改动**（文件时间戳仍为 SP-03 执行时段，可核验）。
> 🔴 **本报告未修改**任何 canonical（`DECISIONS.md` / `docs/00`–`09` / `CHANGELOG.md`）、未修改 Shared Technical Contract、未修改 `01`–`04` Worker 产出、未修改 `S00-03` 启动文档、未修改 Gold Standard。

---

## 〇、执行摘要（先读这一段）

| 项 | 结果 |
|---|---|
| **判定规则层（SP-03 的失败点）** | ✅ **不再出现漂移**。`matched_level_a_dimensions` 在 **主矩阵 24 次**（8 CASE × 3 RUN）**与扩展总计 48 次**（8 CASE × 6 RUN）上**逐维度完全一致**：8/8 CASE 稳定，**32 个 Level A 维度槽位、96 / 192 条维度状态全部零漂移**。 |
| **SP-03 的关键失败点是否消失** | ✅ **消失**。SP-03 中 `CASE-01 / 02 / 04 / 05 / 08` 共 5 个 CASE 的 `matched` 集合在运行间不一致；本次 **0 个 CASE 不一致**（`unstable_matched_set = []`）。 |
| **准入决策层** | ✅ **继续完全稳定且与 Gold 一致**：`related` 8/8 CASE 与 Gold 一致，`related_flip_cases = []`；`uncompared` 集合 `unstable_uncompared_set = []`。 |
| **SP-03 的"过判"方向** | ✅ **消失**：SP-03 漂移方向 100% 为过判；本次相对 Gold 的偏差数为 **0**，相对 D-050 显式条款的反例数为 **0**（R1 / R2 / R3 全绿）。 |
| **SP-03 中"未固定"的边界维度** | ✅ **本次全部收敛且一致**（例：`CASE-05.condition` 由 SP-03 的 4/6 命中 → 本次 **0/6**；`CASE-08.condition` 由 4/6 → **0/6**）。 |
| **架构层（H1–H10）** | ✅ **继续 10/10 通过**。 |
| **新增断言（R1–R8）** | ✅ **8/8 通过**（主矩阵 24 次与扩展总计 48 次均通过）。 |
| **结论** | **PASS** —— 在 `D-050` 判据显式化之后，`R-A` 的维度级命中判定在本次可执行环境条件下达到任务书要求的稳定性。 |
| **必须同时成立的限定** | ⚠️ **§C.1 TEST ENV LIMITATION 依然存在**：`temperature` / `seed` 仍不可配置、无 API 级独立调用、无引擎级 Structured Output。⇒ 本报告只能主张"**在本次可执行的环境条件下、在判据显式化之后未再观测到 `matched` 集合漂移**"，**不得**主张"已证明模型随机性不再是漂移来源""在任何条件下都稳定""生产环境必然可复现"。 |
| **对 TQ04** | **仍留 Gate B**。本复测**未选择** `R-A`；只能写"**R-A 的可交付性获得正向实验证据**"。 |
| **对 TQ09** | **需要 Integrator 关注**：SP-03 的 M-1 开放问题（"规则显式化后是否即可复现"）**本次获得正向实验证据**；M-2（技术层必须留痕原始判定返回 + 投影输入）**继续成立**；M-3（判定计数 / 一致率不得产品化）**继续适用**。 |

---

## A. D-050 前提

| 项 | 内容 |
|---|---|
| **前提 Decision** | **`D-050｜Level A 维度 `matched` 的严格语义重叠判据`**，来源阶段 `S00-03`，触发 = `SP-03`，**状态 = `CONFIRMED`**（`docs/DECISIONS.md` §《D-050》，日期 2026-09-19）。 |
| **本复测对 D-050 的态度** | **只作为既定前提使用，不重新讨论、不重新解释、不扩张其射程。** |
| **`matched` 判据（本复测判定会话收到的唯一判据）** | `matched` **仅当**两侧表达「**相同的实质内容**」或「**语义等价的改写**」；允许的等价形式（穷尽）：① 同义改写；② 表述顺序不同但实质相同；③ 单位等价表达；④ 不改变实质含义的语言改写。 |
| **显式不充分（不得 `matched`）** | 属于**同一类别** / 同一主题 / 使用**同一参数类型** / 同一指标名 / **都在讨论同一种现象** / 都属于同一种技术大类。 |
| **逐维度必要语义条件** | `goal` = 相同或等价的具体目标；`actual_attempt` = 相同或等价的核心方案 / 行动 / 技术对象；`condition` = 相同或等价的具体条件内容；`actual_result` = 相同或等价的观察结果 / 现象 / 结论方向。 |
| **本次随判据一并下发的显式例** | 「`50°C`」vs「`50 摄氏度`」= `matched`；「`50°C`」vs「`70°C`」= `compared_not_matched`；「出现明显开裂」vs「无明显开裂」= `compared_not_matched`；「含水率仍偏高」vs「含水率达到要求」= `compared_not_matched`；「降低颜色变化」vs「缩短干燥时间」= `compared_not_matched`；「幻觉引用减少」vs「无效引用明显下降」= `matched`。 |
| **`unknown` 规则** | **完全不变**：任一侧 `presence_state = unknown` ⇒ `uncompared`；双方都 `unknown` 仍不得 `matched`。 |
| **不得越界** | `D-050` 只定义「单个 Level A 维度何时叫 `matched`」。`matched_level_a_dimensions` 非空 → `related` **仍属 `S03-D` / Integrator 的架构收敛项**，**本复测不 `CONFIRM`、不升级**。 |

---

## B. 与原 SP-03 的差异

### B.1 变更项

| # | 维度 | SP-03 | SP-03R（本次） |
|---|---|---|---|
| 1 | **`matched` 判据** | **无**（`04_RETRIEVAL_AND_COMPARISON.md` §D.2 第 2 步只规定输出形式「布尔 + 一句理由」，未规定判据） | **有**：`D-050` 严格语义重叠（已作为判定提示词的显式条款下发） |
| 2 | **判定提示词中的负例约束** | 无（SP-03 §J.5 建议 3 未落实） | **有**：显式"不足以构成 `matched`"清单 + 6 条显式例（落实建议 3） |
| 3 | **判定会话的隔离要求** | 记录为"全新上下文、无共享历史、无结果复用"（未记录文件读取禁令） | 在提示词中**显式禁止**读取 / 搜索本机任何文件、禁止调用任何工具 ⇒ 判定会话**不可能看到 Gold Standard** |
| 4 | **断言集** | H1–H10 | **H1–H10（同一套，继续适用）+ 新增 R1–R8**（D-050 专用） |
| 5 | **产物命名** | `SP-03_*` / `sp03_*` | **全部新写入 `SP-03R_*` / `sp03r_*`**；SP-03 产物只读 |
| 6 | **runner** | `sp03_runner.py` | `sp03r_runner.py`（复用同一 Step 0 / Step 1 / 装配 / 校验逻辑；**未改动** `sp03_runner.py`） |

### B.2 保持不变项（复测可比性的基础）

| # | 项 | 说明 |
|---|---|---|
| 1 | **8 个 CASE 的 fixture** | **完全复用** `SP-03_cases.json`，文本一字未改 |
| 2 | **Gold Standard** | **同一份、未修改、未重算**（`gold_standard_frozen: true` 保持不变） |
| 3 | **判定输入投影结构** | `Step 0（unknown ⇒ uncompared）` + `Step 1（来源合法性）` + Level A 四维度封闭集合，与 SP-03 同一构造 ⇒ **可比对维度对同为 30 个** |
| 4 | **Level B / `result_status` / 时间的结构性排除** | 不变 |
| 5 | **`related` 派生** | `related := len(matched_level_a_dimensions) > 0`，装配层唯一派生语句，不变 |
| 6 | **Schema 校验器与结构性探针** | 同一套逻辑与同一批探针（含 `PROBE-H2` 正对照） |
| 7 | **计数口径** | **主矩阵 24 次 → 扩展后总计 48 次**；**48 已含前 24**，不存在 `24 + 48 = 72` |

### B.3 三项前置的落实状态（SP-03 §N 所列）

| # | `SP-03R` 的前置（SP-03 §N 定义） | 本次是否落实 |
|---|---|---|
| 1 | **判定判据显式化** | ✅ **已落实**（`D-050`，由项目负责人人工决策） |
| 2 | **引擎级 Structured Output（JSON Schema 强约束）** | ❌ **未落实**（本机环境不可用；仍以「提示词约束 + 程序侧 schema 校验」替代） |
| 3 | **可固定采样参数（`temperature` / `seed`）** | ❌ **未落实**（本机环境不可配置） |

> ⚠️ **这直接决定了 §K 的解释射程**：本次 PASS 是在「三项前置中仅落实第 1 项」的条件下取得的。**它足以回答"判据显式化能否消除 SP-03 观测到的漂移"，但不足以回答"在可固定采样参数 + 引擎级强约束下是否同样稳定"** —— 后者仍开放，见 §N。

---

## C. 临时实验环境

> 本节只记录完成本复测所必需的技术信息。**不因此 CONFIRM provider / 模型，不改变 `TQ03` / `TQ04`。**

| 项 | 记录 |
|---|---|
| 判定机制 | 本机 LearnBuddy 会话内新起的**独立 AI 判定子会话**（共 **6 个**：RUN-1…RUN-6） |
| 独立性口径 | 每次 = **全新上下文、无共享历史、无结果复用**；且提示词**显式禁止**判定会话读取 / 搜索本机文件或调用工具 ⇒ **看不到 Gold Standard、看不到其它会话结果** |
| 模型标识 | **未由环境暴露**（无 API 层模型标识可用） |
| 是否支持 Structured Output | ❌ **不支持（无 JSON Schema 强约束接口）**。改用「提示词约束 + 程序侧 schema 校验」⇒ **属提示词级约束，不是引擎级强制** |
| 是否能固定低随机性参数（`temperature` / `seed`） | ❌ **不可配置**（如实记录，未编造） |
| 是否能独立重复调用 | ⚠️ **会话级可独立重复**（6 次会话）；**API 级独立调用不可用**（本机无任何模型 API 凭据） |
| 单次调用时长 | **不可测得**（环境不暴露该指标，未编造数值） |
| 是否出现 schema failure | **0 次**（6/6 会话首次返回即为合法 JSON；装配层 `schema_violations = 0`） |
| 判定输入口径 | **仅 Level A 双方 `present` 且来源合法的维度**（30 个维度对）；投影中**不含** Level B / `result_status` / 时间 / unknown 维度 / `Inference` 条目 |
| 其它可用运行时 | Python 3.13.12（本机托管）、Node 22.22.2（本机托管） |

### C.1 TEST ENV LIMITATION（明确记录，不得省略）

1. **无 API 级独立重复调用能力**：无法用脚本按固定参数重复调用同一模型。本次「独立重复」由**独立会话**实现，属**会话级独立**，**不等于** API 级可复现调用。
2. **`temperature` / `seed` 不可配置** ⇒ 无法把"结果一致"分解为「判据显式化的贡献」与「采样参数恰好未引入变化的贡献」。
3. **本次观测到的强一致性的可能解释不止一种**：既可能来自"`D-050` 判据已足够明确"，也可能来自"本次环境下的判定会话方差本身较低"。**受 (1)(2) 限制，本报告无法分离这两种贡献，不做倾向性判断。**
4. **未伪造重复实验**：**主矩阵 24 次，随后追加 RUN-4～RUN-6 共 24 次，扩展至总计 48 次独立判定**，全部来自 **6 次各自独立的判定会话**，**不存在把一次生成结果复制多份**的情况。6 份原始返回已**原文留痕**于 `SP-03R_raw_model_output.json`，可逐条核验。
5. **因此本报告的结论口径被限定为**：**在本次可执行的环境条件下、在 `D-050` 判据显式化之后，未再观测到 `matched` 集合漂移。** 一切更强的主张（"已证明模型随机性不再是来源""生产条件必然稳定""可外推为一般结论"）**均超出本实验证据的射程，不得写入**。

---

## D. Fixtures

**复用声明**：8 个 CASE 的 Level A 文本、`presence_state`、`source_type`、Level B 属性、`result_status` 与 **运行前冻结的 Gold Standard**，**全部复用 `SP-03_cases.json` 原文件，一字未改、未重算**。

| CASE | 标题 | Gold `related` | Gold `matched` | SP-03R 新增硬约束（来自 D-050 / 任务书 R 项） |
|---|---|---|---|---|
| CASE-01 | 仅 goal 命中 | `true` | `[goal]`（完全固定） | **R1**：`actual_result` 不得 `matched` |
| CASE-02 | approach + condition 命中 | `true` | `[actual_attempt, condition]`（完全固定） | **R2**：`goal` 不得 `matched` |
| CASE-03 | Level A 全不重叠 | `false` | `[]`（完全固定） | — |
| CASE-04 | unknown 必须进入 uncompared | 未固定 | 含 `goal` | — |
| CASE-05 | `result_status = Unknown` 不得污染 | `true` | 含 `actual_result` | — |
| CASE-06 | Level B 陷阱 | `false` | `[]`（完全固定） | — |
| CASE-07 | 语义改写压力样本 | `true` | 四维度全命中（完全固定） | **R4**：四维仍应 `matched` |
| CASE-08 | matched + uncompared 混合 | `true` | 含 `actual_attempt` | **R3**：`condition`（`50°C` vs `70°C`）不得 `matched` |

**结构性探针**（不占 8 CASE 名额，另有独立断言）：`PROBE-H2`（校验器正对照）/ `PROBE-H4`（`Inference` 排除）/ `PROBE-H9`（`result_status` 互换）/ `PROBE-H1-H8`（unknown 不进模型输入）/ `PROBE-H3`（Level B 不进模型输入）/ `PROBE-H10`（无 embedding）。

**投影口径（可核验）**：8 CASE 共 **32 个 Level A 维度槽位**，其中 **2 个由 Step 0 规则写定为 `uncompared`**（`CASE-04.condition`、`CASE-08.actual_result`），**30 个维度对进入判定会话** —— 与 SP-03 完全同一集合。

---

## E. 24 次主矩阵（8 CASE × 3 RUN）

### E.1 `matched` 集合

| CASE | Gold `matched` | RUN-1 | RUN-2 | RUN-3 | 3 次一致 | Gold 偏差 |
|---|---|---|---|---|---|---|
| **CASE-01** | `[goal]` | `[goal]` ✅ | `[goal]` ✅ | `[goal]` ✅ | ✅ **是** | 无 |
| **CASE-02** | `[actual_attempt, condition]` | 同左 ✅ | 同左 ✅ | 同左 ✅ | ✅ **是** | 无 |
| **CASE-03** | `[]` | `[]` ✅ | `[]` ✅ | `[]` ✅ | ✅ **是** | 无 |
| **CASE-04** | 含 `goal` | `[goal]` | `[goal]` | `[goal]` | ✅ **是** | 无 |
| **CASE-05** | 含 `actual_result` | `[actual_attempt, actual_result]` | 同左 | 同左 | ✅ **是** | 无 |
| **CASE-06** | `[]` | `[]` ✅ | `[]` ✅ | `[]` ✅ | ✅ **是** | 无 |
| **CASE-07** | 四维度全命中 | 全 4 ✅ | 全 4 ✅ | 全 4 ✅ | ✅ **是** | 无 |
| **CASE-08** | 含 `actual_attempt` | `[actual_attempt]` | `[actual_attempt]` | `[actual_attempt]` | ✅ **是** | 无 |

### E.2 `related` / `uncompared` 逐次结果

| CASE | Gold `related` | RUN-1 | RUN-2 | RUN-3 | 一致 | Gold `uncompared` | RUN-1 | RUN-2 | RUN-3 | 一致 |
|---|---|---|---|---|---|---|---|---|---|---|
| CASE-01 | `true` | `true` | `true` | `true` | ✅ | `[]` | `[]` | `[]` | `[]` | ✅ |
| CASE-02 | `true` | `true` | `true` | `true` | ✅ | `[]` | `[]` | `[]` | `[]` | ✅ |
| CASE-03 | `false` | `false` | `false` | `false` | ✅ | `[]` | `[]` | `[]` | `[]` | ✅ |
| CASE-04 | 未固定 | `true` | `true` | `true` | ✅ | `[condition]` | `[condition]` | `[condition]` | `[condition]` | ✅ |
| CASE-05 | `true` | `true` | `true` | `true` | ✅ | `[]` | `[]` | `[]` | `[]` | ✅ |
| CASE-06 | `false` | `false` | `false` | `false` | ✅ | `[]` | `[]` | `[]` | `[]` | ✅ |
| CASE-07 | `true` | `true` | `true` | `true` | ✅ | `[]` | `[]` | `[]` | `[]` | ✅ |
| CASE-08 | `true` | `true` | `true` | `true` | ✅ | `[actual_result]` | `[actual_result]` | `[actual_result]` | `[actual_result]` | ✅ |

### E.3 机器汇总（原文摘自 `SP-03R_results.json` → `primary_24.summary`）

```json
{
  "n_cases": 8, "n_runs_per_case": 3, "n_judgments": 24,
  "cases_all_runs_match_gold": ["CASE-01","CASE-02","CASE-03","CASE-04","CASE-05","CASE-06","CASE-07","CASE-08"],
  "cases_with_deviation":      [],
  "unstable_related":          [],
  "unstable_matched_set":      [],
  "unstable_uncompared_set":   [],
  "schema_violations":         0,
  "related_flip_cases":        []
}
```

⇒ **主矩阵 24 次：`matched` / `related` / `uncompared` 三项 8/8 CASE 全部一致，且与 Gold 全部一致，Gold 偏差 = 0。**

---

## F. 扩展后总计（8 CASE × 6 RUN = 48 次）

> 🚩 **计数口径（唯一，全文以此为准）**：**主矩阵 24 次（RUN-1～RUN-3）→ 随后追加 24 次（RUN-4～RUN-6）→ 扩展后总计 48 次独立判定**。**48 次是含前 24 次在内的总计，不是 `24 + 48 = 72` 次**。

| CASE | RUN-4 | RUN-5 | RUN-6 | 6 次是否一致 |
|---|---|---|---|---|
| CASE-01 | `[goal]` ✅ | `[goal]` ✅ | `[goal]` ✅ | ✅ 是 |
| CASE-02 | `[actual_attempt, condition]` ✅ | 同左 ✅ | 同左 ✅ | ✅ 是 |
| CASE-03 | `[]` ✅ | `[]` ✅ | `[]` ✅ | ✅ 是 |
| CASE-04 | `[goal]` | `[goal]` | `[goal]` | ✅ 是 |
| CASE-05 | `[actual_attempt, actual_result]` | 同左 | 同左 | ✅ 是 |
| CASE-06 | `[]` ✅ | `[]` ✅ | `[]` ✅ | ✅ 是 |
| CASE-07 | 全 4 ✅ | 全 4 ✅ | 全 4 ✅ | ✅ 是 |
| CASE-08 | `[actual_attempt]` | `[actual_attempt]` | `[actual_attempt]` | ✅ 是 |

**机器汇总（`extended_48.summary`）**：与 §E.3 同构，`n_runs_per_case = 6`、`n_judgments = 48`、`unstable_matched_set = []`、`unstable_related = []`、`unstable_uncompared_set = []`、`schema_violations = 0`、`related_flip_cases = []`、`cases_with_deviation = []`。

⇒ **扩展后总计 48 次：8/8 CASE 在 6 次运行间逐维度完全一致，且与 Gold 完全一致。**

---

## G. Hard Invariant 检查 H1–H10

| # | 不变量 | 结果 | 证据 |
|---|---|---|---|
| **H1** | `unknown → uncompared` 必须 100% 正确 | ✅ **PASS** | `PROBE-H1-H8` PASS（unknown 维度**不在** `SP-03R_model_input.json` 中）+ `unstable_uncompared_set = []`；`CASE-04.condition` 与 `CASE-08.actual_result` 在 **24/24 与 48/48** 中均为 `uncompared` |
| **H2** | 输出中不得出现任何数值相似度 / `score` / `confidence` / 百分比 / 等级 | ✅ **PASS** | `schema_violations = 0`（24 次与 48 次）；`PROBE-H2` 正对照 PASS，**违禁键命中数 = 3**（`similarity` / `confidence` / `score` 全部被检出）⇒ 校验器**有检出能力**，不是"永远返回通过" |
| **H3** | Level B 不得造成准入 | ✅ **PASS** | ① 结构性：`PROBE-H3(输入)` PASS，Level B 字段不出现在任何投影中；② 行为性：`CASE-06`（Level B 三项相同、Level A 全不重叠）**6/6 次 `related = false`**；③ 反向：`CASE-01`（Level B 全不同、Level A 命中 `goal`）**6/6 次 `related = true`** |
| **H4** | `Inference` 不得进入 Level A 比较输入 | ✅ **PASS** | `PROBE-H4` PASS：任一侧改为 `Inference` 后，该维度既不进入投影，也不被判 `matched`，且被登记为实现缺陷 |
| **H5** | `related` 必须严格由 `matched` 集合非空派生 | ✅ **PASS** | 装配层唯一派生语句；判定会话**从未被要求输出 `related`**；校验器断言 `related == (len(matched) > 0)`，24 次与 48 次全部通过（`schema_violations = 0`） |
| **H6** | `CASE-03` 必须 `related = false` | ✅ **PASS** | **6/6 次 `related = false`** |
| **H7** | `CASE-06` 必须 `related = false` | ✅ **PASS** | **6/6 次 `related = false`**（同 Project / 同标签 / 同环境均未造成准入） |
| **H8** | `CASE-04` 的 `condition` 所有运行都必须 `uncompared` | ✅ **PASS** | **6/6 次 `uncompared`**，**0 次 `matched`**，**0 次 `compared_not_matched`**（未进入语义判定） |
| **H9** | `CASE-05` 中 `result_status` 不得参与维度判定 | ✅ **PASS** | `PROBE-H9` PASS：源 / 候选 `result_status` 互换后，判定输入投影**逐字节相同**；`CASE-05.actual_result` 在 `result_status` 不同（`Unknown` vs `Failed`）的前提下 **6/6 被判 `matched`** |
| **H10** | 不得"必须依赖 embedding"才能形成 Level A 命中集合 | ✅ **PASS** | 判定链 = 结构性规则 + 受约束布尔判定；**无向量组件 / 无向量存储 / 无相似度计算** |

### G.1 汇总

```
Hard Invariants 通过 : 10 / 10
任何 H 失败          : 无
```

⚠️ **限定（与 SP-03 同口径）**：H1 / H3 / H5 / H8 / H9 / H10 的通过是**架构性**的（由构造与程序断言保证，与判定会话行为无关）；H2 是**校验器功能性**的（已用正对照证明有检出能力）。**H6 / H7 的通过才是对判定行为的真实检验**，本次 6/6 通过。

---

## H. 新增断言 R1–R8

| # | 断言 | 主矩阵（24 次） | 扩展总计（48 次） | 证据 |
|---|---|---|---|---|
| **R1** | `CASE-01.actual_result` 不得 `matched` | ✅ **PASS** | ✅ **PASS** | 3/3 与 6/6 均为 `compared_not_matched`（"开裂 + 含水率仍偏高" vs "无开裂 + 含水率达标"） |
| **R2** | `CASE-02.goal` 不得 `matched` | ✅ **PASS** | ✅ **PASS** | 3/3 与 6/6 均为 `compared_not_matched`（"降低颜色变化" vs "缩短干燥时间"） |
| **R3** | `CASE-08.condition` 不得 `matched` | ✅ **PASS** | ✅ **PASS** | 3/3 与 6/6 均为 `compared_not_matched`（`50°C` vs `70°C`） |
| **R4** | `CASE-07` 四维仍应 `matched` | ✅ **PASS** | ✅ **PASS** | 3/3 与 6/6 均为 `{goal, actual_attempt, condition, actual_result}` 全命中 |
| **R5** | 同一 CASE 各运行的 `matched_level_a_dimensions` 必须一致 | ✅ **PASS** | ✅ **PASS** | `unstable_matched_set = []`（8/8 CASE 一致；32 个维度槽位零漂移） |
| **R6** | `related` 不得 `true` / `false` 翻转 | ✅ **PASS** | ✅ **PASS** | `unstable_related = []`、`related_flip_cases = []`（0 次翻转） |
| **R7** | 不得依赖 Level B | ✅ **PASS** | ✅ **PASS** | `PROBE-H3(输入)` PASS + 装配产物中不存在 Level B 字段的参与；`CASE-06` / `CASE-03` **6/6 `related = false`** |
| **R8** | 不得产生数值相似度 | ✅ **PASS** | ✅ **PASS** | `schema_violations = 0` + `PROBE-H2` 正对照检出 3 个违禁键 |

### H.1 汇总

```
R1–R8 通过 : 8 / 8（主矩阵 24 次）
R1–R8 通过 : 8 / 8（扩展后总计 48 次）
```

---

## I. `matched` set 稳定性

### I.1 与 SP-03 的稳定性对照（同口径）

| 统计项 | SP-03（判据未定义） | **SP-03R（D-050 判据显式化后）** | 判定 |
|---|---|---|---|
| **`matched` 维度集合稳定性** | **3/8 CASE 稳定；5/8 不一致**（`CASE-01/02/04/05/08`） | **8/8 CASE 稳定；0/8 不一致** | ✅ **由不稳定转为完全稳定** |
| **`related` 稳定性** | 8/8 稳定 | **8/8 稳定** | ✅ 继续稳定 |
| **`uncompared` 集合稳定性** | 8/8 稳定 | **8/8 稳定** | ✅ 继续稳定 |
| **相对 Gold 的偏差** | 出现过（`CASE-01.actual_result` ×2、`CASE-02.goal` ×1） | **0**（24 次与 48 次） | ✅ **偏差归零** |
| **漂移方向** | 100% 过判（false positive），0 漏判 | **不适用（0 漂移）** | ✅ |

### I.2 结构性 fixture 的达标判定（任务书 §十口径）

结构性 fixture = `CASE-01 / 02 / 03 / 04 / 05 / 06 / 08`（7 个），要求「多次运行结果保持一致」。

| CASE | `related` 一致 | `matched` 集合一致 | `uncompared` 一致 | 是否达标（SP-03R） | SP-03 是否达标 |
|---|---|---|---|---|---|
| CASE-01 | ✅ | ✅ | ✅ | **达标** | ❌ 未达标 |
| CASE-02 | ✅ | ✅ | ✅ | **达标** | ❌ 未达标 |
| CASE-03 | ✅ | ✅ | ✅ | 达标 | 达标 |
| CASE-04 | ✅ | ✅ | ✅ | **达标** | ❌ 未达标 |
| CASE-05 | ✅ | ✅ | ✅ | **达标** | ❌ 未达标 |
| CASE-06 | ✅ | ✅ | ✅ | 达标 | 达标 |
| CASE-08 | ✅ | ✅ | ✅ | **达标** | ❌ 未达标 |

⇒ **7 个结构性 fixture 全部达标（SP-03R 为 7/7）**，SP-03 为 2/7。

### I.3 维度级稳定性（最细粒度，机器产出：`SP-03R_dim_stability.txt`）

| 统计项 | 主矩阵（24 次） | 扩展总计（48 次） |
|---|---|---|
| Level A 维度槽位 | **32**（8 CASE × 4） | **32** |
| 其中交给判定会话的可比对维度对 | **30** | **30** |
| 由 Step 0 规则写定的 `uncompared` | 2 | 2 |
| 维度判定条数（判定会话产出） | 30 × 3 = **90** | 30 × 6 = **180** |
| **维度级不稳定项** | **0** | **0** |

⇒ **32 个维度槽位在 3 次与 6 次运行间逐维度状态完全一致，零漂移。**

### I.4 SP-03「未固定」的边界维度：本次全部收敛（并登记 1 项观察）

SP-03 §I.4 曾单独统计这些"任务书未给预期、但会改变 ⑦ 相似点内容"的维度对。**本次在 `D-050` 下它们全部收敛为稳定结果**：

| 维度对 | 语义 | SP-03 判 `matched` 的次数（6 次中） | **SP-03R（6 次中）** | 本次状态 |
|---|---|---|---|---|
| `CASE-05.condition`（`55°C` vs `50°C`） | 同类条件、取值不同 | 4 / 6 | **0 / 6** | `compared_not_matched`（D-050 显式条款） |
| `CASE-08.condition`（`50°C` vs `70°C`） | 同类条件、取值不同 | 4 / 6 | **0 / 6** | `compared_not_matched`（R3） |
| `CASE-05.goal` | 同一干燥过程的两个视角 | 3 / 6 | **0 / 6** | `compared_not_matched` |
| `CASE-04.actual_result` | 同类现象、结论方向不一致 | 2 / 6 | **0 / 6** | `compared_not_matched` |
| `CASE-01.actual_result` | 同类现象、结论相反 | 2 / 6 | **0 / 6** | `compared_not_matched`（R1） |
| `CASE-02.goal` | 不同具体目标 | 1 / 6 | **0 / 6** | `compared_not_matched`（R2） |

⇒ **SP-03 中最大的分裂点（"同类条件但取值不同" 4/6）在本次完全消失（0/6）。**

> ⚠️ **登记 1 项 Integrator 观察项（非阻塞、非裁决、不构成本次稳定性失败）**：
> `CASE-05.actual_attempt`（「调整热风参数」vs「调整送风参数」）在 **SP-03 与 SP-03R 中均 6/6 判 `matched`**，因此**不属漂移**，也**不违反任何 R 项**（任务书未固定该维度、Gold 亦未固定）；但它**不在 `D-050` 的显式例枚举中**，其"是否属于语义等价改写"由判定会话自行解释（理由均为"干燥送风参数这同一核心行动"）。⇒ 属**残余语义边界**，建议由 Integrator 在收敛 `§D.2` 回写 `D-050` 判据时一并明确，**本 Spike 不自行裁决**。

---

## J. `related` 稳定性

| 统计项 | 主矩阵（24 次） | 扩展总计（48 次） |
|---|---|---|
| `related` 与 Gold 一致的 CASE | **8 / 8** | **8 / 8** |
| `unstable_related` | `[]` | `[]` |
| `related_flip_cases`（同 CASE 内 `true`↔`false` 翻转） | `[]`（**0 次**） | `[]`（**0 次**） |
| `uncompared` 集合不一致的 CASE | `[]` | `[]` |

- `CASE-01 / 02 / 04 / 05 / 07 / 08` 恒为 `related = true`；
- `CASE-03 / 06` 恒为 `related = false`（**H6 / H7 的行为性证据**）；
- `uncompared` 恒定：`CASE-04 = [condition]`、`CASE-08 = [actual_result]`，其余为空。

⇒ **准入决策在 24 次与 48 次中零翻转，且与 Gold 完全一致。**

---

## K. 结果分级：PASS

```
SP-03R RESULT = PASS
```

### K.1 PASS 条件逐条核对（任务书口径）

| PASS 条件 | 结果 |
|---|---|
| **原 H1–H10 继续全部成立** | ✅ 满足（**10 / 10**） |
| **R1**：`CASE-01 actual_result` 不得 `matched` | ✅ 满足（6/6 `compared_not_matched`） |
| **R2**：`CASE-02 goal` 不得 `matched` | ✅ 满足（6/6 `compared_not_matched`） |
| **R3**：`CASE-08 condition` 不得 `matched` | ✅ 满足（6/6 `compared_not_matched`） |
| **R4**：`CASE-07` 四维仍应 `matched` | ✅ 满足（6/6 四维全命中） |
| **R5**：同一 CASE 各运行 `matched` 集合一致 | ✅ 满足（`unstable_matched_set = []`） |
| **R6**：`related` 不得翻转 | ✅ 满足（0 次） |
| **R7**：不得依赖 Level B | ✅ 满足（结构性排除 + 行为性 6/6） |
| **R8**：不得产生数值相似度 | ✅ 满足（`schema_violations = 0` + 正对照检出） |
| **24 次主矩阵稳定** | ✅ 满足（`matched` / `related` / `uncompared` 三项 8/8 CASE 一致） |

### K.2 为什么不是 `INCONCLUSIVE`

任务书的 `INCONCLUSIVE` 条件为「**环境无法独立复测**」。本次**环境可执行会话级独立复测**（6 个全新上下文、无共享历史、无结果复用的独立判定会话，且被显式禁止读取本机文件 ⇒ 不可能看到 Gold），并**实际完成 6 × 8 = 48 次独立判定**，因此该条件**不成立**。

### K.3 为什么不是 `FAIL`

无任何失败项：H1–H10 全通过、R1–R8 全通过、主矩阵与扩展总计均零漂移、零 `related` 翻转、零 Gold 偏差、零 `unknown → matched`、零数值相似度、零 Level B 准入。

### K.4 ⚠️ 本次 PASS 的射程（必须与结论同时引用）

**可以主张**：

> 在 `D-050`（严格语义重叠）判据显式化之后，在本次可执行的环境条件下，`R-A` 的维度级命中判定（`matched_level_a_dimensions`）在 **8 个 CASE × 6 次独立判定（主矩阵 24 次 + 扩展后总计 48 次）** 上**未再观测到漂移**：`matched` 集合、`related`、`uncompared` 三项 8/8 CASE 完全一致，且与 Gold Standard 完全一致。

**不得主张**（超出证据射程）：

- ❌ "已证明 `D-050` 是 SP-03 漂移的唯一来源 / 根因"；
- ❌ "已证明模型随机性不再是漂移来源"；
- ❌ "在任何模型 / 任何采样参数 / 生产环境下都必然稳定"；
- ❌ "已满足 `SP-03R` 的全部三项前置"（**仅落实第 1 项**，见 §B.3）；
- ❌ "`TQ04` 已选择 `R-A`"（见 §M）。

---

## L. 对 `R-A` 的证据

| 项 | 结论 |
|---|---|
| **本次为 `R-A` 提供了什么** | ✅ **判定规则层的正向实验证据**：`D-050` 判据显式化后，`R-A` 的两级结构（服务端结构性规则 + 受约束布尔判定）在**同一套 fixture** 上产出了**跨 6 次独立会话完全一致**的 `matched_level_a_dimensions` / `uncompared_dimensions` / `related`，且与 Gold 完全一致。SP-03 中"判定规则未定义导致维度边界漂移"这一**已被验证的重要来源**，在本次条件下**未再产生可观测影响**。 |
| **架构层证据（承袭 SP-03 并再次确认）** | ✅ H1–H10 **10/10**：unknown 结构性拦截、`Inference` 排除、Level B / `result_status` 结构性排除、`related` 单点派生、零数值 / 零等级、无 embedding 依赖。 |
| **仍未获得的证据** | ⚠️ **可固定采样参数 + 引擎级 Structured Output 条件下的一致性**（本机不可用）；以及 **`TQ04` 定稿后的实现期验收证据**。 |
| **是否出现了必须改用 `R-B` / `R-C` 的反例** | ❌ **没有**。未发现任何"必须依赖 embedding 才能形成命中集合"或"Level A 规则不可实现"的情形。**因此本复测不构成重开 `R-B` / `R-C` 比较的理由。** |
| **对 `R-A` 的保留（与 SP-03 一致的残留项）** | ⚠️ `R-A` **依赖判定会话正确应用判据**。本次判据应用在 6/6 会话间一致，但 §C.1 的限制意味着**判据应用的一致性在"不可固定采样参数"的前提下并未被证明为结构性保证**；此外 §I.4 登记了 1 处 `D-050` 未显式覆盖的残余边界。 |

**推荐的精确表述（可直接引用）**：

> 「**SP-03R 为 `R-A` 的可交付性提供了正向实验证据**：在 `D-050` 严格语义重叠判据显式化之后，8 个 CASE × 6 次独立判定的 `matched` / `related` / `uncompared` 三项全部一致且与 Gold 一致（主矩阵 24 次，扩展后总计 48 次），H1–H10 与 R1–R8 全部通过。**该结论受本机环境限制（不可固定采样参数、无引擎级 Structured Output）**，不得外推为生产条件下的保证。**`TQ04` 仍待 Gate B 人工决策；本 Spike 未选择 `R-A`。**」

---

## M. 对 `TQ04` 的影响

| 项 | 结论 |
|---|---|
| **`TQ04` 状态** | **仍留 Gate B = 是**（未裁决、未选择、未 `CONFIRM`） |
| **即使 PASS，只能写** | 「**`R-A` 的可交付性获得正向实验证据。**」 |
| **明确不得写** | ❌ 「`TQ04 = R-A 已确认`」。 |
| **`TQ04` 定稿前置依赖的变化** | SP-03 登记的前置「SP-03 可交付性证据仍未满足」**已由本复测正向回答**（在 §C.1 限定内）。**该前置不再是待满足项**，但**不构成对 `TQ04` 的预判**。 |
| **是否应写"`TQ04` 已选择 `R-A`"** | ❌ **不得**。 |
| **建议的 Gate B 问法补充（`PROPOSED` 建议，不构成决策）** | ① 是否以「H1–H10 + R1–R8 全通过 + 主矩阵 24 次零漂移」作为 `R-A` 的**验收基线**写入 `09_TEST_PLAN.md`？② 是否要求「在实现期补做引擎级 Structured Output + 可固定采样参数的复核」作为 `TQ04` 定稿后的**验收条件**（而非定稿前置）？③ 是否接受 §I.4 的残余边界（`CASE-05.actual_attempt` 型情形）作为 `D-050` 的补注项由 Integrator 收敛？ |

---

## N. 对 `TQ09` 的影响

`TQ09` = 「AI 判定（`E2`/`E3`、相关性、grounding）的**可复现性**与技术层记录范围」。

| # | 本复测对 `TQ09` 的输入 | 性质 |
|---|---|---|
| N-1 | **SP-03 的 M-1 开放问题获得正向回答**：SP-03 曾记录「"相关性判定的可复现性"不能在判定规则未定义时达成；"规则显式化后是否即可复现"仍开放，须由 `SP-03R` 实测」。⇒ **本次实测显示：规则显式化后，在同一 fixtures 上 6 次独立会话结果完全一致。** ⚠️ 但该正向结果**受 §C.1 限制**（不可固定采样参数、无引擎级强约束），**不得升级为"可复现性已在一般意义上达成"**。 | **需 Integrator 关注** |
| N-2 | **SP-03 的 M-2 继续成立且被再次验证**：本次能够逐维度核验一致性、能够判定"零漂移"，完全依赖 **6 份原始判定返回 + 投影输入的原文留痕**。⇒ 「技术层必须留痕"原始判定返回 + 投影输入"」应继续作为 `TQ09` 的**技术层记录范围最低要求**；**该留痕属技术面（Observability Plane），不得进入产品面**（`TC-71`）。 | **需 Integrator 关注** |
| N-3 | **SP-03 的 M-3 继续适用**：本报告中出现的比例（8/8、6/6、0/6、30 维度对等）**只是 Spike 内部技术证据**，不构成 `TC-49`「合法数字仅三类」之外的任何产品数字，**不得出现在界面 / 派生结果 / 响应体**。 | 合规边界 |
| N-4 | **`TQ09` 仍未关闭**：本次未在「引擎级 Structured Output + 可固定采样参数」条件下复测，因此**未产生足以支撑 `TQ09` 定稿的最终结论**；`TQ09` 仍需 Integrator 收敛，**不由本 Spike 关闭**。 | 归属 |
| N-5 | **本复测新增的事实（对 `TQ09` 有价值）**：`matched` 集合的稳定性**取决于"判据是否显式 + 判定输入是否受结构性约束"**，而不取决于 `related` 派生方式；`uncompared` 与 `related` 在判据缺失时也能保持稳定（SP-03 观测）。⇒ `TQ09` 的验收粒度**必须细化到"维度级判定产物"**，仅以 `related` 为口径无法发现该类风险。 | **需 Integrator 关注** |

---

## O. 是否需要后续 Spike

**需要 —— 但性质与 SP-03 建议的不同。**

| 项 | 内容 |
|---|---|
| **是否仍需"补测稳定性"** | ❌ **不再需要单独补测**：该问题已由本复测正向回答（§I / §J / §K）。 |
| **仍开放、需要实验的问题** | ①（`TQ09`）**引擎级 Structured Output + 可固定采样参数**条件下的一致性：本机**仍不具备**该能力（无 API 凭据、`temperature`/`seed` 不可配置、无 JSON Schema 强约束接口）⇒ 该问题**不能在本机回答**。②（`TQ04`）选定具体模型 / provider 后的**实现期验收性复核**。 |
| **建议** | 若后续在 Gate B 选定模型 / provider 后具备可编程调用能力，应以**同一套 `SP-03_cases.json`（Gold 不得修改）** + 本报告的 **H1–H10 / R1–R8** 作为验收断言做一次**实现期复核**；**该动作属人工批准事项，本 Spike 不自行启动**。 |
| **编号建议** | 若需新建，建议区分于 SP-03R（属"实现期验收性复核"，非"规则层复测"）。 |
| **不得为了"让结果看起来稳定"而放宽 Gold** | 本复测未修改 Gold；后续复核亦不得修改。 |

---

## P. 文件与临时代码清单

> 全部位于 `30_SPIKES/retrieval/`，全部标注 `DISPOSABLE / NON-PRODUCTION`。**未写入 `src/`；未修改任何 canonical / 契约 / Worker 产出 / SP-03 产物。**

| # | 文件 | 类型 | 说明 |
|---|---|---|---|
| 1 | `SP-03R_LevelA_严格语义重叠复测.md` | **报告（本文件）** | 含 A–P 全部章节 |
| 2 | `SP-03R_results.json` | **机器证据（主产物）** | 含 `h_invariants` / `r_checks_primary_24` / `r_checks_extended_48` / `primary_24` / `extended_48` / `SP-03R_RESULT` |
| 3 | `SP-03R_model_input.json` | **机器证据** | 送判定会话的输入投影（可核验：unknown / Level B / `result_status` / `Inference` **均不在其中**） |
| 4 | `SP-03R_raw_model_output.json` | **机器证据** | 6 个独立判定会话的原始返回，**原文照录、未经修正**；含环境限制记录 |
| 5 | `sp03r_verdicts_run-1.json` … `sp03r_verdicts_run-6.json` | 派生中间产物（6 份） | 由 `SP-03R_raw_model_output.json` 经机械转换，无人工干预 |
| 6 | `sp03r_runner.py` | 临时 runner（DISPOSABLE） | 投影生成 / 结构性探针 / 装配 / H 与 R 断言 / 稳定性统计 |
| 7 | `sp03r_dim_stability.py` | 临时脚本（DISPOSABLE） | 维度级稳定性统计，产出 `SP-03R_dim_stability.txt` |
| 8 | `SP-03R_dim_stability.txt` | 机器产物 | 32 个维度槽位的逐维度状态一致性（主矩阵与扩展总计） |
| 9 | `SP-03R_run_log.txt` | 机器产物 | 装配日志（探针结果 + 主矩阵 + H / R 汇总） |

**只读复用（未修改）**：`SP-03_cases.json`（含冻结 Gold Standard）。
**未产生**：任何 `CONFIRMED` 声明 · 任何 `Decision ID` · 任何产品代码 · 任何 SQL / DDL / migration · 任何生产 Prompt · 任何数据库 / 向量库 / 队列。
**未修改**：`DECISIONS.md` · `00_SHARED_TECHNICAL_CONTRACT.md` · `04_RETRIEVAL_AND_COMPARISON.md` · `09_TEST_PLAN.md` · `05_DATA_MODEL.md` · `03_AI_PIPELINE.md` · `06_AI_CAPABILITIES.md` · `S00-03_技术架构阶段启动.md` · 任何 canonical · **任何 SP-03 产物**。
**未进入**：`S03-E`。

---

## 附：完成后只报告（任务书原样清单）

```
SP-03R RESULT：
PASS

主矩阵完成：
24 / 24（8 CASE × 3 RUN）

扩展后总计：
48 / 48（8 CASE × 6 RUN）
⚠️ 口径：48 次为含前 24 次在内的总计，不是 24 + 48 = 72 次

H1–H10：
通过 10 / 10（主矩阵 24 次与扩展总计 48 次均通过）

R1–R8：
通过 8 / 8（主矩阵 24 次与扩展总计 48 次均通过）

matched set 是否稳定：
稳定（8 / 8 CASE；主矩阵 3 次一致，扩展后 6 次一致；32 个 Level A 维度槽位零漂移）
与 SP-03 对照：SP-03 为 3/8 CASE 稳定、5/8 不一致 ⇒ 本次由不稳定转为完全稳定

related 是否翻转：
否（0 次：`unstable_related = []`、`related_flip_cases = []`；`uncompared` 集合同样零漂移）

R-A 证据：
判定规则层获得正向实验证据（D-050 判据显式化后，同一套 fixture 上 6 次独立判定结果完全一致且与 Gold 一致）；
架构层证据承袭 SP-03 并再次确认（H1–H10 通过）；
⇒ 只写「R-A 的可交付性获得正向实验证据」，不得写「TQ04 = R-A 已确认」。
⚠️ 限定：仅 Sp-03R 三项前置中的第 1 项（判据显式化）已落实；引擎级 Structured Output 与可固定采样参数仍未具备。

TQ04 是否仍留 Gate B：
是（未裁决、未选择、未 CONFIRM；未发现必须改用 R-B / R-C 的反例）

是否需要新 Spike：
是 —— 但性质为「实现期验收性复核（引擎级 Structured Output + 可固定采样参数 + 选定模型/provider 后）」，不是"补测稳定性"（该问题已由本复测正向回答）。
本 Spike 不自行启动，需人工批准。

BLOCKER：
无（不阻塞 S00-03 阶段流程）
⚠️ SP-03 登记的「TQ04 定稿前置：SP-03 可交付性证据未满足」已由本复测正向回答（在 §C.1 环境限定内）；该前置不再为待满足项。

CCR：
无（未对任何契约条目提出变更）
⚠️ 登记 1 项 Integrator 收敛项（非阻塞）：`04_RETRIEVAL_AND_COMPARISON.md` §D.2 第 2 步是否回写 `D-050` 判据（SP-03 已登记，本次维持）。

PRODUCT SEMANTIC CONFLICT：
无（未发现"技术上必须回改产品机制"的情形）

DECISION REQUIRED：
无（本复测新增人工裁决项 = 0）
⚠️ 登记 1 项 Integrator 观察项（非阻塞、非裁决）：CASE-05.actual_attempt（「调整热风参数」vs「调整送风参数」）在 SP-03 与 SP-03R 中均 6/6 判 matched，未造成漂移，但不在 D-050 显式例枚举中，属残余语义边界，建议随 §D.2 回写时一并明确。
```

> 🔴 **本 Spike 不 CONFIRM `TQ04`、不选择 `R-A`、不创建 `Decision ID`、不修改任何 canonical 或 SP-03 产物。**

**然后停止。本 Spike 不进入 `S03-E`。**
