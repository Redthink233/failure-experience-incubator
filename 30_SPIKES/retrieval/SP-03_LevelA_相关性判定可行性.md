# SP-03｜Level A 相关性判定可行性 Spike（结果报告）

```
Spike 编号   : SP-03（P0）
名称         : Level A 相关性判定（命中 / 未比对集合）可行性
阶段         : S00-03｜技术架构与实现方案收敛
执行方式     : 本地 LearnBuddy 独立 Spike 会话（一次性、可丢弃）
艺术品种类   : DISPOSABLE / NON-PRODUCTION —— 不是产品代码、不是 canonical、不是实现依据
授权         : 项目负责人人工批准「执行技术验证」
日期         : 2026-09-19
结果分级     : **INCONCLUSIVE**（详见 §K）

SP-03 RESULT              : INCONCLUSIVE
Hard Invariants           : 通过 10 / 10
重复运行                  : 主实验完成 24 次；随后新增 24 次，扩展至总计 48 次独立判定
                            （= 8 CASE × 6 RUN；新增的只有 RUN-4～RUN-6 共 24 次）
                            ⚠️ 口径：主实验的 24 次**已包含**在 48 次总计之内，不存在 24 + 48 = 72 的关系
related true/false 翻转   : 否（0 次）
unknown → matched         : 否（0 次）
Level B 参与准入          : 否（0 次）
数值相似度                : 否（0 次）
R-A                       : 框架层获得正向证据；判定规则层出现维度边界漂移 ⇒ 整体证据不足
TQ04                      : 仍留 Gate B = 是
TQ09                      : 需要 Integrator 关注 = 是
是否需要后续 Spike        : 是（建议 SP-03R 补测）
BLOCKER                   : 无（阶段流程不阻塞；但 TQ04 定稿前置的「可交付性」证据仍未满足）
CCR                       : 无
PRODUCT SEMANTIC CONFLICT : 无
DECISION REQUIRED         : 有（1 项；建议先由 Integrator 收敛）
```

> 🔴 **本报告不 CONFIRM 任何事项**：不 CONFIRM `TQ04`、不选择 `R-A`、不选择模型 / provider、不选择数据库、不选择技术栈、未进入产品编码、未进入 `S03-E`。
> 🔴 **本报告未修改**任何 canonical（`DECISIONS.md` / `docs/00`–`09` / `CHANGELOG.md`）、未修改 Shared Technical Contract、未修改 `01`–`04` Worker 产出、未修改 `S00-03` 启动文档。
> 🟢 **本报告含《POST-DECISION ADDENDUM》（见文末 §P）**：记录 `SP-03` 完成后由项目负责人作出的 **`D-050`** 人工决策。**该 Addendum 属事后记录，不改变本报告任何原始结果** —— `SP-03 RESULT` 仍为 `INCONCLUSIVE`，全部实验数据一字未改。

---

## 〇、执行摘要（先读这一段）

| 结论 | 内容 |
|---|---|
| **架构层** | ✅ **成立**。`R-A` 的两级结构（服务端结构性规则 + 受约束的布尔重叠判定）在本次实验中完整落地：`presence_state = unknown` 拦截、`source_type` 合法性检查、`related` 派生、Level B / `result_status` / 时间排除，**全部可机器核验**，H1–H10 **10/10 通过**，0 次数值 / 0 次等级 / 0 次 Level B 准入 / 0 次 unknown 误判命中。 |
| **决策层（最关键的一个量）** | ✅ **完全稳定且完全正确**。`related`（准入与否）与人工 Gold 一致：**主实验 24 次全部一致，扩展至总计 48 次亦全部一致**（8 CASE × 6 RUN；前 24 次已含于 48 次总计内），**没有任何一次 `related` 翻转**。`uncompared` 集合同样在 **主实验 24 次与扩展总计 48 次**上全部一致。 |
| **判定规则层** | ⚠️ **不稳定**。`matched_level_a_dimensions`（命中维度集合）在 **8 个 CASE 中有 5 个在 3 次运行间不一致**（`CASE-01` / `02` / `04` / `05` / `08`）⇒ 不满足任务书 §十 对结构性 fixture 的「3 次结果应保持一致」要求。 |
| **漂移方向** | **100% 为「过判」（false positive）**，**0 次「漏判」（false negative）**。漂移集中在两类语义边界：①「同一类条件、取值不同」（如 `55°C` vs `50°C`）；②「同一类现象 / 目标、但内容明显不同」。 |
| **漂移来源（已收窄口径）** | **已证明的事**：**`matched` 判据未被显式定义**（`04_RETRIEVAL_AND_COMPARISON.md` §D.2 第 2 步只规定输出形式、未规定判据），是维度漂移的**重要来源之一**，**并且足以触发产品语义人工裁决**。观测到两种读法：**读法 α「同一件事」（严格）** 与 **读法 β「同一类事」（宽松）**，6 个独立会话中 **4 个**至少在一处采用了 β。**未证明的事**：受 §C.1 测试环境限制（`temperature` / `seed` 不可固定、无 API 级同模型重复调用、无引擎级 Structured Output），**本实验不能完全排除模型随机性 / 会话环境差异对 `matched` 集合漂移的贡献**。⇒ **规则歧义已被验证为重要来源；不能完全分离规则歧义与模型随机性各自的贡献。** |
| **产品含义** | 读法 β 会让 ⑦ 生成**不实的「相似点」**（例：把「表面开裂 + 含水率仍偏高」与「无开裂 + 含水率达要求」称为同一类现象），触碰 `D7`（事实 / 推断分离）与 ⑦ 的可信性。**但不会漏掉真正相关的记录**。 |
| **结论** | **INCONCLUSIVE**：`PASS` 被「结构性 fixture 重复结果稳定」这一条件阻断；`FAIL` 又不成立（§十 明确：`related` 未翻转时**不得直接判整个 Spike 失败**）。**R-A 架构可交付，但其判定规则必须先被显式定义，然后补测。** |
| **对 TQ04** | 仍留 Gate B。**未选择 R-A**，也**未**出现必须改用 `R-B` / `R-C` 的反例。 |
| **对 TQ09** | **需要 Integrator 关注**：「相关性判定的可复现性」无法在判定规则未定义的前提下达成；且本次实验**实测表明技术层必须留痕原始判定返回**，否则该类漂移无法诊断（属本实验的直接经验，非一般性证明）。 |
| **后续** | 建议 **SP-03R**：由 Integrator 先补「构成可比对重叠」的判据定义 + 采用 JSON Schema 强约束的 Structured Output，再用同一套 fixture 重测。 |

---

## A. Spike 目标

验证 `S03-D` 推荐路线 `R-A`（结构化字段规则匹配 + 必要时 LLM 作判定 / 解释）的**核心可交付假设**——能否在 V1 中**稳定**实现：

| # | 要求 | 本次是否达成 |
|---|---|---|
| 1 | 只使用 Level A 四维度（`goal` / `actual_attempt` / `condition` / `actual_result`） | ✅ 达成（未引入第五维度） |
| 2 | 每维度只输出 `matched` / `compared_not_matched` / `uncompared` | ✅ 达成（0 次非法取值） |
| 3 | 每候选输出 `matched_level_a_dimensions` / `uncompared_dimensions` / `related`（`related ⇔ matched ≠ ∅`） | ⚠️ 达成语义，但 `matched` 集合 **8 个 CASE 中 5 个不稳定** |
| 4 | 不产生数值相似度 / 百分比 / `confidence` / `score` / `rank_score` / 星级 / 等级 / 加权结果 | ✅ 达成（违禁项 **0**） |
| 5 | Level B（`project` / `failure_tag` / `version_env` / 「语义相似」）不得参与准入 | ✅ 达成（结构化排除 + 0 次越权） |
| 6 | `presence_state = unknown` 必须结构性进入 `uncompared`，不得送 LLM 猜测，不得判 `matched` | ✅ 达成（**不是"靠模型自觉"，而是结构性不可能**） |

**SP-03 与 TQ04 的关系**：SP-03 **不阻塞 `TQ04` 的「可裁决性」**（三条路线差异已可在分析层比较）；它阻塞的是 **`TQ04` 选定路线（当前 `PROPOSED` = `R-A`）的「可交付性」**。

---

## B. 授权与边界

**已获授权**：执行技术验证。

**未获授权 / 本 Spike 未做**：

| ❌ 未做 | 状态 |
|---|---|
| CONFIRM `TQ04` / 选择 `R-A` | 未做 |
| 选择模型 / provider | 未做（不 CONFIRM provider、不 CONFIRM 模型） |
| 选择数据库 / 技术栈 / API 形状 | 未做 |
| 进入产品编码 / 进入 `S03-E` | 未做 |
| 修改 Shared Contract / canonical / `01`–`04` Worker 产出 / `S00-03` 启动文档 | 未做（只读） |
| 写正式数据库 / 建表 / SQL migration / Vector DB / Redis / Queue | 未做 |
| 形成生产 Prompt | 未做（判定提示词属一次性实验装置） |
| 创建 `Decision ID` | 未做 |
| 修改产品 L4 | 未做 |

**`PASS` / `FAIL` / `INCONCLUSIVE` 的效力**：只能作为 **Gate B 的技术证据**。

**临时代码位置**：仅 `30_SPIKES/retrieval/`，全部文件首行标注 `DISPOSABLE / NON-PRODUCTION`，未写入 `src/`。

---

## C. 临时实验环境

> 本节只记录完成 Spike 所必需的技术信息。**不因此 CONFIRM provider / 模型，不改变 `TQ03` / `TQ04`。**

| 项 | 记录 |
|---|---|
| 临时使用的模型 / 环境名称 | 本机 LearnBuddy 会话内新起的 **独立 AI 判定会话**（共 6 个） |
| 模型标识 | **未由环境暴露**（无 API 层模型标识可用） |
| 是否支持 Structured Output | ❌ **不支持（无 JSON Schema 强约束接口）**。改用「提示词约束 + 程序侧 schema 校验」替代 ⇒ **属提示词级约束，不是引擎级强制** |
| 是否能固定低随机性参数（`temperature` / `seed`） | ❌ **不可配置**（如实记录，未编造） |
| 是否能独立重复调用 | ⚠️ **会话级可独立重复**（每次 = 全新上下文、无共享历史、无结果复用）；**API 级独立调用不可用**（本机无任何模型 API 凭据，`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `DEEPSEEK_API_KEY` 等均不存在） |
| 单次大致调用时长 | **不可测得**（环境不暴露该指标，未编造数值） |
| 是否出现 schema failure | **0 次**（6/6 会话首次返回即为合法 JSON）。⚠️ 但这是**提示词约束**下的结果，不能等同于引擎级 Structured Output 的保证 |
| 其它可用运行时 | Python 3.13.12（本机托管）、Node 22.22.2（本机托管）；HTTP 代理存在但无模型凭据 |

### C.1 TEST ENV LIMITATION（明确记录）

1. **无 API 级独立重复调用能力**：无法用脚本按固定参数重复调用同一模型。本次「独立重复」由**独立会话**实现，属**会话级独立**，不等于 API 级可复现调用。
2. **`temperature` / `seed` 不可配置** ⇒ 无法把观测到的漂移**分解**为「模型随机性」与「判定规则歧义」两部分。这直接导致 §K 的分级只能给 `INCONCLUSIVE`，而不能给 `PASS`。
3. **缺少什么能力**：① 可编程的模型 API 凭据；② 可固定的采样参数；③ 引擎级 Structured Output（JSON Schema 强约束）。若补齐 ①②③，本 Spike 可在同一批 fixture 上做真正意义上的可复现重复实验。
4. ⚠️ **未伪造重复实验**：**主实验 24 次，随后追加 RUN-4～RUN-6 共 24 次，总计 48 次独立判定**，全部来自 **6 次各自独立的判定会话**，**不存在把一次生成结果复制多份**的情况。6 份原始返回已原文留痕于 `SP-03_raw_model_output.json`，可逐条核验。
5. ⚠️ **无法排除模型随机性 / 会话环境差异的贡献**：在 `temperature` / `seed` 不可固定、且无 API 级同模型重复调用的条件下，本次实验**只能证明「`matched` 判据未被显式定义」是维度漂移的重要来源之一**，**不能证明**模型随机性 / 会话环境差异**不是**漂移来源，也**不能量化**规则歧义与模型随机性**各自的贡献比例**。⇒ 本报告中一切涉及"来源 / 根因"的表述，一律按 §J.4 的收窄口径理解：**规则歧义已被验证为重要来源；受测试环境限制，不能完全分离规则歧义与模型随机性各自的贡献。**

---

## D. Gold Standard fixtures

**冻结时点**：在发起任何模型判定**之前**写入 `SP-03_cases.json`（`gold_standard_frozen: true`）。**测试后未作任何修改。**

### D.1 夹具来源与"Spike 构造"声明（不得混淆）

| CASE | Level A 文本来源 | Level B 赋值来源 |
|---|---|---|
| CASE-01 / 02 / 03 / 04 / 05 / 07 / 08 | **任务书 §七 原文照录** | Spike 赋值（用于验证 Level B 是否影响准入） |
| **CASE-06** | **由 Spike 构造**（任务书只规定「Level B 三项相同 + Level A 四维度全不同」，未给文本） | **两侧完全相同**（`P-DEMO-SHARED` / `工艺参数` / `设备X/v1`） |

### D.2 8 个 CASE 的 Gold Standard

| CASE | 标题 | Gold `matched` | Gold `uncompared` | Gold `related` | 严格度说明 |
|---|---|---|---|---|---|
| CASE-01 | 仅 goal 命中 | `[goal]` | `[]` | `true` | `matched` **完全固定** |
| CASE-02 | approach + condition 命中 | `[actual_attempt, condition]` | `[]` | `true` | `matched` **完全固定** |
| CASE-03 | Level A 全不重叠 | `[]` | `[]` | `false` | 完全固定（四维度不得命中） |
| CASE-04 | unknown 必须进入 uncompared | 含 `goal` | `[condition]` | 未固定 | `condition` = **硬预期 uncompared 且绝不 matched**；`goal` 软预期（"允许 matched"）；`related` 任务书未固定 |
| CASE-05 | `result_status = Unknown` 不得污染 | 含 `actual_result` | `[]` | `true` | `actual_result` **硬预期命中**；`goal` / `actual_attempt` / `condition` 任务书未固定（语义边界） |
| CASE-06 | Level B 陷阱 | `[]` | `[]` | `false` | 完全固定 |
| CASE-07 | 语义改写压力样本 | `[goal, actual_attempt, condition, actual_result]` | `[]` | `true` | 完全固定（四维度全命中） |
| CASE-08 | matched + uncompared 混合 | 含 `actual_attempt` | `[actual_result]` | `true` | `actual_attempt` 硬预期命中、`actual_result` 硬预期 uncompared；`condition` 任务书未固定 |

> 🔴 **两项「未固定」被如实登记，未被用于放水**：`CASE-04` 的 `related`、`CASE-05` 的 `goal`/`condition`、`CASE-08` 的 `condition`。这些维度属任务书**未给预期**的语义边界，本 Spike **不把它们计为 Gold 偏差**，但**单独统计其漂移**（§I.3）——因为它们同样会改变 ⑦ 的「相似点」内容。

### D.3 结构性探针（不占 8 CASE 名额，另有独立断言）

`PROBE-H2`（校验器正对照）/ `PROBE-H4`（`Inference` 排除）/ `PROBE-H9`（`result_status` 互换）/ `PROBE-H1-H8`（unknown 不进模型输入）/ `PROBE-H3`（Level B 不进模型输入）/ `PROBE-H10`（无 embedding）。

---

## E. 判定 Schema

与任务书 §五 完全一致，未增删字段。以下为**实际装配产物**（`RUN-1 / CASE-01`，取自 `SP-03_results_primary.json`）：

```json
{
  "related": true,
  "matched_level_a_dimensions": ["goal"],
  "uncompared_dimensions": [],
  "dimension_results": {
    "goal": {
      "state": "matched",
      "reason": "两侧都指向把药材干燥到目标含水率这一同一目标。"
    },
    "actual_attempt": {
      "state": "compared_not_matched",
      "reason": "一侧采用热风并提高风速，另一侧采用真空冷冻干燥，属于不同的干燥做法。"
    },
    "condition": {
      "state": "compared_not_matched",
      "reason": "一侧给出热风温度与风速条件，另一侧给出冻结后真空干燥条件，指向不同的工艺条件。"
    },
    "actual_result": {
      "state": "compared_not_matched",
      "reason": "一侧出现开裂且含水率偏高，另一侧无开裂且含水率达标，结果指向不同。"
    }
  }
}
```

### E.1 Schema 的三条硬性质（结构性保证，非"靠模型自觉"）

| # | 性质 | 实现方式 |
|---|---|---|
| E-1 | **`related` 由程序派生** | `related := len(matched_level_a_dimensions) > 0`。模型**从未被要求输出 `related`**，也**无法影响**它。校验器额外断言 `related` 与 `matched` 非空性一致。 |
| E-2 | **无任何数值 / 等级字段** | 校验器对**键名**（`similarity` / `score` / `confidence` / `probability` / `weight` / `rank` / `level` / …）与**值文本**（百分数、0-1 小数、`相似度` / `匹配度` / `置信度` / `得分` / `等级` /…）**双向扫描**。 |
| E-3 | **`uncompared` 由程序填充** | 模型**只**输出 `matched` / `compared_not_matched`。`uncompared` 只可能由 Step 0 规则产生 ⇒ **模型无法把 unknown 判成 matched**（不是约束，是结构上不可能）。 |

---

## F. 执行方法

### F.1 判定链（`R-A` 的两级结构）

```
输入：源 Attempt s、候选 c、Level A 四维度 d
  │
  ├─【服务端结构性规则层】—— 确定性、可机器核验、无随机（sp03_runner.py）
  │   Step 0｜可及性：s(d) 或 c(d) 的 presence_state = unknown
  │            ⇒ state = uncompared，写死理由，**结束该维度判定，不进入模型输入**
  │   Step 1｜来源合法性：参与条目 source_type ∉ {Fact, Extraction}
  │            ⇒ 该维度不得 matched，登记为「实现缺陷」，**不进入模型输入**
  │   Level B / result_status / 时间：**一律不进入模型输入**（结构性排除）
  │
  ├─【语义判定层】—— 仅对「双方 present 且来源合法」的维度
  │   Step 2｜受约束布尔重叠判定：state ∈ {matched, compared_not_matched} + 一句非数值理由
  │
  └─【装配层】
      相关集合 / 未比对集合 / related := matched ≠ ∅  / schema 校验 / Gold 比对
```

**关键设计**：模型看到的**不是**原始 Attempt，而是一份**投影**（`SP-03_model_input.json`）——只含「双方都有值且来源合法」的维度对。因此 H1 / H3 / H4 / H8 / H9 **由构造保证**，与模型行为无关。

### F.2 送模型的投影（可核验的机器产物）

| CASE | 送模型的可比对维度 | 被结构性排除的维度 | 排除原因 |
|---|---|---|---|
| CASE-01 | `goal, actual_attempt, condition, actual_result` | — | — |
| CASE-02 | `goal, actual_attempt, condition, actual_result` | — | — |
| CASE-03 | `goal, actual_attempt, condition, actual_result` | — | — |
| CASE-04 | `goal, actual_attempt, actual_result` | **`condition`** | 双侧 `presence_state = unknown` |
| CASE-05 | `goal, actual_attempt, condition, actual_result` | — | — |
| CASE-06 | `goal, actual_attempt, condition, actual_result` | — | — |
| CASE-07 | `goal, actual_attempt, condition, actual_result` | — | — |
| CASE-08 | `goal, actual_attempt, condition` | **`actual_result`** | 候选侧 `presence_state = unknown` |

⇒ 模型侧共产生 **30 个维度对 × 6 次运行 = 180 条维度判定**；其余维度状态全部由规则写定。

### F.3 重复性实验的执行方式

- **6 个独立判定会话**（`RUN-1`…`RUN-6`），每次均为**全新上下文、无共享历史、无结果复用**，且**在发起时看不到 Gold Standard、看不到其它会话结果**。
- **主实验（主矩阵）= RUN-1 / RUN-2 / RUN-3**：8 CASE × 3 RUN = **完成 24 次独立判定**（满足任务书 §八 的"≥3 次"要求）。
- **扩展至总计 = RUN-1…RUN-6**：**随后新增 RUN-4 / RUN-5 / RUN-6 共 24 次**（8 CASE × 3 RUN），**扩展至总计 48 次独立判定**（8 CASE × 6 RUN）。用途 = 把"某一个会话偶发"与"跨会话倾向"区分开（结论见 §I.3）。
- 🚩 **计数口径（唯一，全文以此为准）**：**主实验 24 次 → 随后新增 24 次 → 扩展至总计 48 次独立判定**。**48 次是含前 24 次在内的总计，不是 24 + 48 = 72 次**；本次实验实际新执行的会话只有 RUN-4～RUN-6 这 3 个（24 次判定）。
- 6 份原始返回**原文留痕**于 `SP-03_raw_model_output.json`，**未经人工修正**。

---

## G. 8 CASE × 3 RUN 结果矩阵

### G.1 主实验矩阵（RUN-1 / RUN-2 / RUN-3）—— 完成 24 次判定（主实验阶段）

| CASE | Gold `matched` | Run 1 | Run 2 | Run 3 | 3 次一致 | Gold 偏差说明 |
|---|---|---|---|---|---|---|
| **CASE-01** | `[goal]` | `[goal]` ✓ | `[goal]` ✓ | `[actual_result, goal]` ✗ | ❌ **否** | Run 3 把「表面开裂 / 含水率仍偏高」与「无开裂 / 含水率达要求」判为同一类结果现象 ⇒ **过判 1 维** |
| **CASE-02** | `[actual_attempt, condition]` | `[actual_attempt, condition]` ✓ | `[actual_attempt, condition]` ✓ | `[actual_attempt, condition, goal]` ✗ | ❌ **否** | Run 3 把「降低药材颜色变化」与「缩短整体干燥时间」判为同一目标 ⇒ **过判 1 维** |
| **CASE-03** | `[]` | `[]` ✓ | `[]` ✓ | `[]` ✓ | ✅ 是 | 无 |
| **CASE-04** | 含 `goal` | `[goal]` | `[goal]` | `[actual_result, goal]` | ❌ 否 | 无 Gold 偏差（`goal` 为软预期）；Run 3 额外命中 `actual_result`（任务书未固定） |
| **CASE-05** | 含 `actual_result` | `[actual_attempt, actual_result]` | `[actual_attempt, actual_result, goal]` | `[actual_attempt, actual_result, condition]` | ❌ **否** | 无 Gold 偏差（`actual_result` 三次全命中 ✓，硬预期满足）；但另外 3 个维度的命中情况**三次全不同** |
| **CASE-06** | `[]` | `[]` ✓ | `[]` ✓ | `[]` ✓ | ✅ 是 | 无（同 Project / 同标签 / 同环境，**未**造成准入） |
| **CASE-07** | `[goal, actual_attempt, condition, actual_result]` | 全 4 ✓ | 全 4 ✓ | 全 4 ✓ | ✅ 是 | 无 —— **语义改写压力样本反而 100% 稳定** |
| **CASE-08** | 含 `actual_attempt` | `[actual_attempt]` | `[actual_attempt]` | `[actual_attempt, condition]` | ❌ 否 | 无 Gold 偏差；`condition`（`50°C` vs `70°C`）在 Run 3 被过判 |

### G.2 `related` / `uncompared` 逐次结果（主矩阵）

| CASE | Gold `related` | Run 1 | Run 2 | Run 3 | 一致 | Gold `uncompared` | Run 1 | Run 2 | Run 3 | 一致 |
|---|---|---|---|---|---|---|---|---|---|---|
| CASE-01 | `true` | `true` | `true` | `true` | ✅ | `[]` | `[]` | `[]` | `[]` | ✅ |
| CASE-02 | `true` | `true` | `true` | `true` | ✅ | `[]` | `[]` | `[]` | `[]` | ✅ |
| CASE-03 | `false` | `false` | `false` | `false` | ✅ | `[]` | `[]` | `[]` | `[]` | ✅ |
| CASE-04 | 未固定 | `true` | `true` | `true` | ✅ | `[condition]` | `[condition]` | `[condition]` | `[condition]` | ✅ |
| CASE-05 | `true` | `true` | `true` | `true` | ✅ | `[]` | `[]` | `[]` | `[]` | ✅ |
| CASE-06 | `false` | `false` | `false` | `false` | ✅ | `[]` | `[]` | `[]` | `[]` | ✅ |
| CASE-07 | `true` | `true` | `true` | `true` | ✅ | `[]` | `[]` | `[]` | `[]` | ✅ |
| CASE-08 | `true` | `true` | `true` | `true` | ✅ | `[actual_result]` | `[actual_result]` | `[actual_result]` | `[actual_result]` | ✅ |

⇒ **`related` 在主实验 24 次中与 Gold 全部一致；`uncompared` 集合同样 24 次全部一致；翻转 0 次**（扩展至总计 48 次后仍全部一致，见 §G.3 / §I.1）。

### G.3 扩展样本（RUN-4 / RUN-5 / RUN-6）—— 随后新增的 24 次判定（使总计达 48 次）

| CASE | Run 4 | Run 5 | Run 6 | 6 次是否一致 |
|---|---|---|---|---|
| CASE-01 | `[actual_result, goal]` ✗ | `[goal]` ✓ | `[goal]` ✓ | ❌ 否（5/6 与 Gold 一致） |
| CASE-02 | `[actual_attempt, condition]` ✓ | `[actual_attempt, condition]` ✓ | `[actual_attempt, condition]` ✓ | ❌ 否（5/6 与 Gold 一致） |
| CASE-03 | `[]` ✓ | `[]` ✓ | `[]` ✓ | ✅ 是 |
| CASE-04 | `[actual_result, goal]` | `[goal]` | `[goal]` | ❌ 否 |
| CASE-05 | `[actual_attempt, actual_result, condition, goal]` | `[actual_attempt, actual_result, condition]` | `[actual_attempt, actual_result, condition, goal]` | ❌ 否（三种不同集合） |
| CASE-06 | `[]` ✓ | `[]` ✓ | `[]` ✓ | ✅ 是 |
| CASE-07 | 全 4 ✓ | 全 4 ✓ | 全 4 ✓ | ✅ 是 |
| CASE-08 | `[actual_attempt, condition]` | `[actual_attempt, condition]` | `[actual_attempt, condition]` | ❌ 否 |

`related` 在 RUN-4/5/6 同样与 Gold **100% 一致**（`CASE-01/02/04/05/07/08 = true`，`CASE-03/06 = false`）。

### G.4 机器汇总（原文摘自装配产物）

```json
// SP-03_results_primary.json  (8 × 3 = 24 次判定)
{
  "n_cases": 8, "n_runs_per_case": 3, "n_judgments": 24,
  "cases_all_runs_match_gold": ["CASE-03","CASE-04","CASE-05","CASE-06","CASE-07","CASE-08"],
  "cases_with_deviation":      ["CASE-01","CASE-02"],
  "unstable_related":          [],
  "unstable_matched_set":      ["CASE-01","CASE-02","CASE-04","CASE-05","CASE-08"],
  "unstable_uncompared_set":   [],
  "schema_violations":         0,
  "related_flip_cases":        []
}

// SP-03_results_extended.json  (8 × 6 = 48 次判定)
{
  "n_cases": 8, "n_runs_per_case": 6, "n_judgments": 48,
  "cases_all_runs_match_gold": ["CASE-03","CASE-04","CASE-05","CASE-06","CASE-07","CASE-08"],
  "cases_with_deviation":      ["CASE-01","CASE-02"],
  "unstable_related":          [],
  "unstable_matched_set":      ["CASE-01","CASE-02","CASE-04","CASE-05","CASE-08"],
  "unstable_uncompared_set":   [],
  "schema_violations":         0,
  "related_flip_cases":        []
}
```

> 🚩 **计数口径（勿误读）**：上面 `primary` 的 24 次属 **主实验阶段**；`extended` 的 48 次（8 × 6）是 **扩展至总计**，**已包含 `primary` 的 24 次**。本次实验**实际执行的独立判定总数 = 48 次**（其中首次 24 次、随后新增 24 次），**不存在 24 + 48 = 72 的关系**。

---

## H. Hard Invariant 检查 H1–H10

| # | 不变量 | 结果 | 证据 |
|---|---|---|---|
| **H1** | `unknown → uncompared` 必须 100% 正确 | ✅ **PASS** | `PROBE-H1-H8` + `unstable_uncompared_set = []`。`CASE-04.condition`、`CASE-08.candidate.actual_result` 在 **48/48** 次判定中均为 `uncompared`。且 unknown 维度**根本不进入模型输入投影**（`SP-03_model_input.json` 中不存在）⇒ 结构性不可能被误判。 |
| **H2** | 输出中不得出现任何数值相似度 / `score` / `confidence` / 百分比 / 等级 | ✅ **PASS** | `schema_violations = 0`（48 次判定）。`PROBE-H2` 正对照：向校验器注入含 `similarity: 0.87` / `confidence: 0.9` / `score: 3` 的伪造输出，校验器**逐条命中**并判定 INVALID ⇒ 校验器**有检出能力**，不是"永远返回通过"。 |
| **H3** | Level B 不得造成准入 | ✅ **PASS** | ① 结构性：`project_id` / `failure_tag` / `version_env` **不出现在任何模型输入投影中**（`PROBE-H3`）。② 行为性：`CASE-06`（三项 Level B 完全相同、Level A 全不重叠）**6/6 次 `related = false`**；`CASE-03`（Level B 全不同、Level A 全不重叠）**6/6 次 `related = false`**。③ 反向：`CASE-01`（Level B 全不同、Level A 命中 `goal`）**6/6 次 `related = true`** ⇒ Level B **既不能造成、也不是准入门槛**。 |
| **H4** | `Inference` 不得进入 Level A 比较输入 | ✅ **PASS** | `PROBE-H4`：把 `CASE-01` 的 `condition` 任一侧改为 `source_type = Inference`，该维度**既不进入模型输入投影**，也**不被判为 `matched`**，且被登记为「实现缺陷」。 |
| **H5** | `related` 必须严格由 `matched` 集合非空派生 | ✅ **PASS** | `related` 由装配层唯一语句派生；模型**从未被要求**输出 `related`；校验器断言 `related == (len(matched) > 0)`，48 次全部通过。 |
| **H6** | `CASE-03` 必须 `related = false` | ✅ **PASS** | **6/6 次 `related = false`**。 |
| **H7** | `CASE-06` 必须 `related = false` | ✅ **PASS** | **6/6 次 `related = false`**（同 Project / 同标签 / 同环境均未造成准入）。 |
| **H8** | `CASE-04` 的 `condition` 所有运行都必须 `uncompared` | ✅ **PASS** | **6/6 次 `uncompared`**，**0 次 `matched`**。 |
| **H9** | `CASE-05` 中 `result_status` 不得参与维度判定 | ✅ **PASS** | ① `PROBE-H9`：把源 / 候选的 `result_status` 互换（`Unknown ↔ Failed`），判定输入投影**逐字节相同**。② 行为性：`actual_result`（两侧文本相同、`result_status` 不同：`Unknown` vs `Failed`）**6/6 次被判 `matched`** ⇒ `result_status` 未阻碍也不可能影响判定。 |
| **H10** | 不得"必须依赖 embedding"才能形成 Level A 命中集合 | ✅ **PASS** | 判定链为「结构性规则 + 受约束布尔判定」两级，**无向量组件、无向量存储、无相似度计算**。全部 8 个 CASE 的命中集合均在无 embedding 条件下形成。 |

### H.1 汇总

```
Hard Invariants 通过 : 10 / 10
任何 H 失败         : 无
```

⚠️ **重要限定**：H1 / H3 / H5 / H8 / H9 / H10 的通过是**架构性**的（由构造与程序断言保证，与模型行为无关）；H2 的通过是**校验器功能性**的（已用正对照证明其有检出能力）。**H6 / H7 的通过才是对模型行为的真实检验**（`CASE-03` / `CASE-06` 需要模型真的把"不重叠"判成不重叠），本次 6/6 通过。

---

## I. 稳定性分析

### I.1 A / B / C 三项稳定性统计

| 统计项 | 主实验阶段（24 次 · **已含于总计内**） | 扩展至总计（48 次 = 8 × 6） | 判定 |
|---|---|---|---|
| **A. `related` 结论稳定性** | **8/8 CASE 完全一致**（`unstable_related = []`，`related_flip_cases = []`） | **8/8 CASE 完全一致** | ✅ **完全稳定** |
| **B. `matched` 维度集合稳定性** | **3/8 CASE 稳定**（`CASE-03` / `06` / `07`）；**5/8 不一致**（`CASE-01` / `02` / `04` / `05` / `08`） | 同上（同样的 5 个 CASE 不一致） | ❌ **不稳定** |
| **C. `uncompared` 集合稳定性** | **8/8 CASE 完全一致**（`unstable_uncompared_set = []`） | **8/8 CASE 完全一致** | ✅ **完全稳定** |

> 🚩 **计数口径**：右列的 48 次 = 8 CASE × 6 RUN，**已包含**左列的 24 次。本次实验**实际执行的独立判定总数 = 48 次**（主实验完成 24 次；随后新增 24 次，扩展至总计 48 次独立判定）。**不存在 24 + 48 = 72 的关系。**

### I.2 结构性 fixture 的达标判定（任务书 §十）

结构性 fixture = `CASE-01` / `02` / `03` / `04` / `05` / `06` / `08`（7 个），要求「3 次结果应保持一致」。

| CASE | `related` 一致 | `matched` 集合一致 | `uncompared` 一致 | 是否达标 |
|---|---|---|---|---|
| CASE-01 | ✅ | ❌ | ✅ | **未达标** |
| CASE-02 | ✅ | ❌ | ✅ | **未达标** |
| CASE-03 | ✅ | ✅ | ✅ | 达标 |
| CASE-04 | ✅ | ❌ | ✅ | **未达标** |
| CASE-05 | ✅ | ❌ | ✅ | **未达标** |
| CASE-06 | ✅ | ✅ | ✅ | 达标 |
| CASE-08 | ✅ | ❌ | ✅ | **未达标** |

⇒ **7 个结构性 fixture 中 5 个未达标**（全部因 `matched` 集合不一致）。

**语义改写压力样本 `CASE-07`**：6/6 次四维度全命中，**0 漂移**，**不出现 `related` 翻转**。⇒ 任务书 §十 的"重要稳定性失败"条件（`related` 反复翻转）**未触发**。

### I.3 漂移是否跨会话反复出现？（扩展样本带来的关键区分；**N 有限，不下一般结论**）

| 观测 | 数值 |
|---|---|
| 完全与 Gold 一致的会话 | **RUN-1 / RUN-2 / RUN-5 / RUN-6（4/6）** |
| 出现至少 1 处 Gold 严格项偏差的会话 | **RUN-3（2 处）/ RUN-4（1 处）（2/6）** |
| Gold **完全固定**的 6 个 CASE（`01`/`02`/`03`/`06`/`07`/`08`）上的维度判定总数 | 6 CASE × 4 维度 × 6 次 = **144 条** ⇒ 其中偏差 **3 条**（`CASE-01.actual_result` × 2、`CASE-02.goal` × 1）＝ **约 2.1%** |
| 漂移方向 | **100% 过判（false positive）；漏判（false negative）= 0** |
| 采用宽松读法（β）的会话数 | **4 / 6**（RUN-3 / 4 / 5 / 6 至少在一处把"同一类事"当作"同一件事"） |

⇒ **在本次 6 个会话样本内**：漂移不是单点偶发，而是"多数会话会在一部分维度边界上滑向宽松读法"的**跨会话反复出现的倾向**（6 个会话中 4 个出现 β；偏差集中在少数维度对）；但**其影响被限制在 `matched` 集合的构成上，从未改变 `related`**。
⚠️ **限定（不得越读）**：① 样本仅 **N = 6 个会话**；② 受 §C.1 环境限制，**"该倾向源于规则歧义还是模型随机性"无法分离**；⇒ **不得据此推断一般性结论、不得外推为"必然复现"，更不得量化未来复现概率。**

### I.4 「未固定」维度的漂移（虽不计 Gold 偏差，但影响 ⑦ 内容）

| 维度对 | 语义 | 6 次中判 `matched` 的次数 |
|---|---|---|
| `CASE-05.condition`（`55°C` vs `50°C`） | 同类条件、取值不同 | **4 / 6** |
| `CASE-08.condition`（`50°C` vs `70°C`） | 同类条件、取值不同 | **4 / 6** |
| `CASE-05.goal` | 同一干燥过程的两个视角 | 3 / 6 |
| `CASE-04.actual_result` | 同类现象、结论相反 | 2 / 6 |
| `CASE-01.actual_result` | 同类现象、结论相反 | 2 / 6 |

⇒ **"同类条件但取值不同"是最大的分裂点（4/6 vs 2/6）**。

---

## J. 错误 / 漂移案例

### J.1 案例 1｜`CASE-01.actual_result` 过判（RUN-3 / RUN-4）

| 侧 | 值 |
|---|---|
| 源 | 表面出现开裂，最终含水率仍偏高 |
| 候选 | 无明显开裂，含水率达到要求 |
| **Gold** | `compared_not_matched`（`CASE-01` 的 `matched` 完全固定为 `[goal]`） |
| RUN-3 | `matched`，理由：「两侧都在描述干燥后开裂与含水率的结果现象」 |
| RUN-4 | `matched`，理由：「两侧都在描述药材干燥后的开裂与含水率结果，属于同一类现象」 |

**错误性质**：两侧结果**结论相反**（开裂 vs 无开裂、含水率偏高 vs 达标），却被判为命中。若采纳，⑦ 将向用户展示「结果表现相似」这类**与事实相反**的理由。

### J.2 案例 2｜`CASE-02.goal` 过判（RUN-3）

| 侧 | 值 |
|---|---|
| 源 | 降低药材颜色变化 |
| 候选 | 缩短整体干燥时间 |
| **Gold** | `compared_not_matched` |
| RUN-3 | `matched`，理由：「两侧都指向缩短干燥时间这一目标」 |

**错误性质**：不仅过判，且**理由与源侧文本不符**（源侧目标明确是"降低颜色变化"，不是"缩短干燥时间"）⇒ 会生成**指错内容**的相似点。

### J.3 案例 3｜`CASE-05` 的命中集合三次全不同（结构性 fixture 未达标的最强证据）

| 运行 | `matched` 集合 |
|---|---|
| RUN-1 | `[actual_attempt, actual_result]` |
| RUN-2 | `[actual_attempt, actual_result, goal]` |
| RUN-3 | `[actual_attempt, actual_result, condition]` |
| RUN-4 | `[actual_attempt, actual_result, condition, goal]` |
| RUN-5 | `[actual_attempt, actual_result, condition]` |
| RUN-6 | `[actual_attempt, actual_result, condition, goal]` |

`actual_result` **6/6 命中**（硬预期满足），但 `goal` 与 `condition` 的命中与否在会话间漂移。⇒ 单篇「为什么相关」理由在重跑后可能变化。

### J.4 漂移来源分析（本 Spike 最重要的发现；**受环境限制，来源无法完全分离**）

> **已明确证明的事**：**「`matched` 判据未被显式定义」是维度漂移的重要来源之一**，**并且足以触发产品语义人工裁决**。
> **未证明 / 不能排除的事**：受 §C.1 测试环境限制（`temperature` 不可固定、`seed` 不可固定、无 API 级同模型重复调用、无引擎级 JSON Schema Structured Output），**本实验不能完全排除模型随机性 / 会话环境差异对 `matched` 集合漂移的贡献**。
> ⇒ **统一口径**：**规则歧义已被验证为重要来源；受测试环境限制，不能完全分离规则歧义与模型随机性各自的贡献。** 因此本节标题为"来源分析"而非"根因判定"，**不得**据此写成"不是模型能力不足""根因就是 canonical 未定义""已经证明不是模型随机性"。

`04_RETRIEVAL_AND_COMPARISON.md` §D.2 第 2 步写的是「判定"是否构成可比对重叠"（布尔结果 + 一句可解释理由）」——**只规定了输出形式，未规定判据**。`D-019` 规定了 Level A 的**四个维度名**（目标 / 实际尝试·方案·技术对象 / 条件 / 结果·现象）与"只有 Level A 可用于判断是否值得进入主要比较集合"，但**同样未定义同一维度上"什么算重叠"**。

观测到的两种读法：

| 读法 | 判据 | 后果 |
|---|---|---|
| **α｜严格（同一件事）** | 两侧值必须指向**同一具体事项**（同一目标 / 同一做法 / 同一条件取值 / 同一结果结论） | `matched` 集合小、与"差异点"分工清晰；`CASE-01` / `02` 的 Gold 即为 α |
| **β｜宽松（同一类事）** | 两侧值只需**属于同一类方面**，能够形成一句"相似 / 不同"的比较说明即可 | `matched` 集合膨胀；会把"同类但结论相反 / 取值不同"的情形也计入命中 ⇒ 生成不实相似点 |

**4/6 会话至少在一处采用 β**。注意 `D-020` 把「条件不同」列为**可解释匹配理由**之一（"目标相近 / 方案相同 / 条件不同 / 结果表现相似"），这为 β 提供了**看似合理的依据** ⇒ **可确证的部分**：**规则文本中确实存在可被 β 读法使用的空档**（这是从文本本身即可核验的事实）。⚠️ **不可确证的部分**：该空档在多大程度上解释了本次漂移、以及模型随机性 / 会话环境差异占多大比重，**受 §C.1 限制无法分离**；**不得**由此写成"已经证明不是模型随机性"或"根因就是规则未定义"。

⇒ **一种候选解释（未被独立验证）**：`related` 在全部 48 次中保持稳定，可能是因为观测到的漂移**只做加法**（多加维度）、从不做减法，而 `related` 只关心"是否非空"。该解释与现有数据结构一致，但**未经验证**，**且同样无法排除模型随机性的叠加贡献** ⇒ 记为 `PROPOSED` 级解释，不作为结论。

### J.5 建议的收敛方向（**仅为 PROPOSED 建议，本 Spike 不裁决、不落盘产品规则**）

| # | 建议 | 说明 |
|---|---|---|
| 1 | **由 Integrator 在 `§D.2` 第 2 步补一条「构成可比对重叠」的判据定义** | 建议以**读法 α** 为准，并**显式排除**两种情形：① 同一维度上**取值不同**（如 `50°C` vs `70°C`）；② 同一维度上**结论相反 / 语义相斥**（如"开裂"vs"无开裂"）。若采纳 β，必须同时定义"哪些同类情形**只允许**出现在 `compared_not_matched` 即差异点，不得进入命中集合"。 🟢 **事后补注**：本建议其后由项目负责人的 **`D-050`** 人工决策落实（采纳**严格语义重叠 = 读法 α**）—— 属**事后**决策，**不是 `SP-03` 当时的实验输入**，详见文末 §P。本行原始表述保留不动。 |
| 2 | **Structured Output 改为引擎级强约束** | 本次只有提示词约束。若 Gate B 选定模型能力允许，应采用 JSON Schema 强约束 + 枚举校验 + 失败重试，而非仅靠提示词。 |
| 3 | **在判定输入中显式给出负例约束** | 把"同维度同类 ≠ 命中"写成判定指令的显式条款，并附 1–2 个反例。 |
| 4 | **判定产物纳入技术层留痕**（→ `TQ09`） | 保存原始判定返回与投影输入，否则该类漂移不可诊断、不可复核（本次即依靠 6 份未修正的原始返回才定位到 α / β 分歧）。 |
| 5 | **不得为了"让结果看起来稳定"而放宽 Gold** | 本 Spike 未修改 Gold；后续补测亦不得修改。 |

---

## K. 结果分级

```
SP-03 RESULT = INCONCLUSIVE
```

### K.1 为什么不是 `PASS`

任务书 §十三 的 PASS 条件逐条核对：

| PASS 条件 | 结果 |
|---|---|
| H1–H10 全部通过 | ✅ 满足（10/10） |
| **结构性 CASE 重复结果稳定** | ❌ **不满足**（7 个结构性 fixture 中 5 个的 `matched` 集合在 3 次运行间不一致） |
| CASE-07 不出现 `related` 反复翻转 | ✅ 满足 |
| 不需要 Level B 准入 | ✅ 满足 |
| 不需要 embedding 才能工作 | ✅ 满足 |

⇒ **存在一条明确的未满足条件，故不得给 `PASS`。**

### K.2 为什么不是 `FAIL`

任务书 §十三 的 FAIL 定义 =「出现明确的技术反例，**足以说明当前 `R-A` 核心假设不可用**」。

| 检查 | 结果 |
|---|---|
| 是否出现 `related` 反复翻转？ | ❌ 未出现（主实验 24 次一致；扩展至总计 48 次亦一致） |
| 是否出现 unknown → matched？ | ❌ 未出现（0 次） |
| 是否出现数值相似度？ | ❌ 未出现（0 次） |
| 是否必须依赖 Level B 才能形成集合？ | ❌ 否 |
| 是否必须依赖 embedding 才能形成集合？ | ❌ 否（H10 通过） |
| 是否出现"全命中 / 全不命中"的系统性失效？ | ❌ 否（`CASE-03` / `06` 恒 false，`CASE-07` 恒全命中，均正确） |
| 漂移是否改变了准入决策？ | ❌ 否 |

**且任务书 §十 已就本类情形给出明确处置**：

> "如果 CASE-07 出现变化：**不得直接判整个 Spike 失败**；需要判断：- `related` 是否变化 - **只有某个维度边界变化** - 是否说明 `R-A` 需要更严格的判定规则 / Structured Output / Prompt 约束"

本次观测到的漂移正是「**只有某个维度边界变化**」且「**`related` 未变化**」，并明确指向「需要更严格的判定规则」⇒ **不满足 FAIL 的门槛。**

### K.3 为什么是 `INCONCLUSIVE`

`INCONCLUSIVE` 的成立理由（两条，均须成立）：

1. **`PASS` 条件已被明确违反**（结构性 fixture 的 `matched` 集合不稳定）⇒ 不能给 `PASS`，也不能"为了推进项目"把它写成 `PASS`。
2. **不满足 `FAIL` 的门槛**（无任何"`R-A` 核心假设被推翻"的反例）⇒ 不能给 `FAIL`。
3. **且存在 §C.1 已记录的 `TEST ENV LIMITATION`**：`temperature` / `seed` 不可配置、无 API 级独立调用 ⇒ **无法把观测到的漂移分解为「模型随机性」与「判定规则歧义」**。这一不确定性本身即构成 "证据不足以给出确定分级"。

**结论性表述**：

> **`R-A` 的架构可交付性获得正向证据（H1–H10 全部通过、`related` 与 `uncompared` 完全稳定、零数值、零 Level B 准入、零 embedding 依赖）；但其「维度级命中判定」在 canonical 未定义判据的前提下**未通过重复一致性检验** —— `matched` 集合在 5/8 CASE 上随运行变化。**且受 §C.1 测试环境限制，本次实验无法分离"规则歧义"与"模型随机性"各自的贡献**，故只能确认"`matched` 判据未被显式定义"是**重要来源之一**，不能宣称它是唯一来源。因此 SP-03 不能判 `PASS`；也不构成 `FAIL`（准入决策未受污染）。结论为 `INCONCLUSIVE`，且**明确要求先补定判据、并在可固定参数的条件下补测**。**

**不得据此写**：`TQ04` 已选择 `R-A`。

---

## L. 对 TQ04 的影响

| 项 | 结论 |
|---|---|
| `TQ04` 状态 | **仍留 Gate B = 是**（未裁决、未选择、未 CONFIRM） |
| SP-03 为 `R-A` 提供了什么 | ✅ **正向证据（架构层）**：`R-A` 的两级结构可完整落地；Level A 四维度封闭集合可实现；两份集合可同时输出；`related` 可派生；零数值 / 零等级可实现并可**机器断言**；无需 Level B、无需 embedding 即可形成命中集合。 |
| SP-03 对 `R-A` 提出了什么保留 | ⚠️ **判定规则层证据不足**：`R-A` 依赖的「是否构成可比对重叠」在 canonical 中**未被定义**，而 `matched` 集合本身在 5/8 CASE 上随运行变化（方向 100% 过判）。⇒ **可确证**：规则未被定义，且漂移确实发生；**不可确证**：受 §C.1 环境限制，**不能把该漂移完全归因于规则未定义，也不能排除模型随机性 / 会话环境差异的贡献**。 |
| 是否应写"`TQ04` 已选择 `R-A`"？ | ❌ **不得**。 |
| 是否出现了必须改用 `R-B` / `R-C` 的反例？ | ❌ **没有**。本次未发现任何"必须依赖 embedding 才能形成命中集合"的情形（H10 通过），也未发现 Level A 规则不可实现的证据。**因此没有理由因本 Spike 而重开 `R-B` / `R-C` 的比较。** |
| 建议的 Gate B 决策问法补充（`PROPOSED` 建议，不构成决策） | ① 是否接受「**先由 Integrator 补定「构成可比对重叠」判据 + 引擎级 Structured Output，再执行 SP-03R 补测**」作为 `TQ04` 定稿前的唯一前置？② 若 SP-03R 仍出现 `matched` 集合漂移但 `related` 稳定，是否接受"以 `related` 与 `uncompared` 为验收口径、`matched` 集合作为 ⑦ 理由的**待核对项**"？ |

**推荐的精确表述（可直接引用）**：

> 「SP-03 为 `R-A` 的**架构可交付性**提供了正向证据（H1–H10 全部通过）；但其**判定规则层**在 canonical 未定义「构成可比对重叠」判据的前提下表现出维度级过判漂移。`TQ04` **仍待 Gate B 人工决策**；本 Spike **未选择** `R-A`，也**未**推翻 `R-A`。」

---

## M. 对 TQ09 的影响

`TQ09` = 「AI 判定（`E2`/`E3`、相关性、grounding）的**可复现性**与技术层记录范围」（原 A 类 → Integrator；满足 `TC-71` / `TC-76`）。

| # | 本 Spike 对 `TQ09` 的输入 | 性质 |
|---|---|---|
| M-1 | **"相关性判定的可复现性"不能在判定规则未定义时达成**：同一输入 3 次运行即可产生不同的 `matched` 集合（5/7 结构性 fixture）。⇒ `TQ09` 必须**先**要求"判定规则显式化"，**后**才能谈可复现性；否则可复现性不可验收。⚠️ **本次未能在"可固定参数 + 引擎级 Structured Output"条件下复测**（§C.1）⇒ **"规则显式化后是否即可复现"仍开放，须由 `SP-03R` 实测**。 | **需 Integrator 关注** |
| M-2 | **技术层必须留痕"原始判定返回 + 投影输入"**：本次漂移之所以能被定位（区分 α / β 读法、算出 4/6 分裂），完全依赖 6 份原始返回的原文留痕。若技术层只留最终集合，则该类漂移**永远不可诊断**。⇒ 建议作为 `TQ09` 的技术层记录范围的最低要求。**这些留痕必须在技术面（Observability Plane），不得进入产品面**（`TC-71`）。 | **需 Integrator 关注** |
| M-3 | **不得把"判定结果计数 / 漂移率 / 一致率"产品化**：本次报告中的比例（4/6、1.6% 等）**只是 Spike 内部技术证据**，不构成 `TC-49`「合法数字仅三类」之外的任何产品数字，不得出现在界面 / 派生结果 / 响应体。 | 合规边界 |
| M-4 | 本次实验**未产生**任何可用作 `TQ09` 定稿的最终结论（环境限制见 §C.1）⇒ `TQ09` 仍需 Integrator 收敛，**不由本 Spike 关闭**。 | 归属 |

---

## N. 是否需要后续 Spike

**需要 —— 建议 `SP-03R`（`R` = Re-test）。**

| 项 | 内容 |
|---|---|
| **编号** | 建议 `SP-03R`（**新增项，需人工批准后执行；本 Spike 不自行启动**） |
| **唯一前置** | Integrator 先完成 **§J.5 建议 1**（补定「构成可比对重叠」判据）与**建议 2**（引擎级 Structured Output，若环境能力允许）。 🟢 **事后补注（见文末 §P）**：**建议 1 已由项目负责人以 `D-050` 人工决策落实**（判据 = 严格语义重叠）；**建议 2 仍未落实**，且新增一项前置 = **可固定采样参数（`temperature` / `seed`）**，否则无法分离规则歧义与模型随机性（§C.1）。上述三项合起来才构成 `SP-03R` 的完整前提。 |
| **要回答的问题** | 在判据显式化之后，`matched` 集合能否在 **3 次运行间完全一致**？过判漂移是否消失？ |
| **复用资产** | **完全复用**本次的 `SP-03_cases.json`（**Gold Standard 不得修改**）、结构性探针、装配与校验器 |
| **成功条件** | 8 个 CASE 的 `related` / `matched` / `uncompared` **三项在 3 次运行间全部一致，且与 Gold 一致** |
| **失败条件** | 判据显式化后仍出现 `matched` 集合漂移 ⇒ `R-A` 的判定规则层不可交付，须回 **Gate B** 重议 `TQ04` |
| **预计影响的 `TQ`** | `TQ04`（主）、`TQ09`（技术层留痕范围） |

**是否值得补测**：**值得**。理由：① 漂移的**一个已验证来源**是"`matched` 判据未定义"（而非"`R-A` 架构不可用"），**修复成本低、可验证性强**；但**"是否还存在模型随机性 / 会话环境差异的贡献"必须由 `SP-03R` 在可固定参数条件下实测**，不能由本报告推断；② 补测可完全复用既有 fixture 与 harness，边际成本极低；③ 若跳过补测直接选定 `R-A`，则 ⑦ 的「相似点」在重跑 / 重新检索后可能与首次不一致（用户可感知），这是 `D-045 TR-7` / `AC-74` 之外**尚未被登记**的风险。

---

## O. 文件与临时代码清单

> 全部位于 `30_SPIKES/retrieval/`，全部标注 `DISPOSABLE / NON-PRODUCTION`。**未写入 `src/`；未修改任何 canonical / 契约 / Worker 产出。**

| # | 文件 | 类型 | 说明 |
|---|---|---|---|
| 1 | `SP-03_LevelA_相关性判定可行性.md` | **报告（本文件）** | 任务书 §四 要求的最终产出；含 A–O 全部章节 |
| 2 | `SP-03_cases.json` | 固定测试数据 | 8 CASE 的源 / 候选四维度内容、`presence_state`、`source_type`、Level B 属性、`result_status` + **运行前冻结的 Gold Standard** + 结构性探针定义 |
| 3 | `SP-03_model_input.json` | **机器证据** | 送模型的判定输入投影（8 CASE 的可比对维度）。可核验：unknown 维度、Level B、`result_status` **均不在其中** |
| 4 | `SP-03_raw_model_output.json` | **机器证据** | 6 个独立判定会话的原始返回，**原文照录、未经修正**；含环境限制记录 |
| 5 | `sp03_runner.py` | 临时 runner（DISPOSABLE） | 三级子命令：`project`（生成投影）/ `probe`（结构性探针）/ `ingest`+`assemble`（装配、schema 校验、Gold 比对、矩阵与稳定性统计） |
| 6 | `sp03_verdicts_run-1.json` … `sp03_verdicts_run-6.json` | 派生中间产物（6 份） | 由 `SP-03_raw_model_output.json` 经 `ingest` 机械转换，无人工干预 |
| 7 | `SP-03_structural_probe.json` | **机器证据** | 结构性探针的逐项结论与明细（H1/H3/H4/H8/H9/H10 + H2 正对照） |
| 8 | `SP-03_results_primary.json` | **机器证据** | 主矩阵（8 × 3 = 24 次判定）的完整装配结果、schema 校验、Gold 比对、稳定性统计 |
| 9 | `SP-03_results_extended.json` | **机器证据** | 扩展样本（8 × 6 = 48 次判定）的同结构产物 |

**未产生**：任何 `CONFIRMED` 声明 · 任何 `Decision ID` · 任何产品代码 · 任何 SQL / DDL / migration · 任何生产 Prompt · 任何数据库 / 向量库 / 队列。
**未修改**：`00_SHARED_TECHNICAL_CONTRACT.md` · `DECISIONS.md` · `05_DATA_MODEL.md` · `09_TEST_PLAN.md` · `03_AI_PIPELINE.md` · `04_RETRIEVAL_AND_COMPARISON.md` · `S00-03_技术架构阶段启动.md` · 任何 canonical。
**未进入**：`S03-E`。

---

## 附：完成后只报告（任务书 §十七 原样清单）

```
SP-03 RESULT：
INCONCLUSIVE

Hard Invariants：
通过 10 / 10

重复运行：
实际完成 24 / 24（主矩阵 8 × 3 = 24 次）
随后新增 24 次（RUN-4～RUN-6），扩展至总计 48 次独立判定（8 × 6）
⚠️ 口径：48 次为含前 24 次在内的总计，不是 24 + 48 = 72 次

是否出现 related true/false 翻转：
否（0 次：主实验 24 次与扩展总计 48 次均与 Gold 一致；扩展总计已含主实验 24 次）

是否出现 unknown → matched：
否（0 次：CASE-04 condition 与 CASE-08 candidate.actual_result 在 48/48 次中均为 uncompared）

是否出现 Level B 参与准入：
否（0 次：Level B 字段不存在于判定输入；CASE-06 同 Project / 同标签 / 同环境仍为 related=false）

是否出现数值相似度：
否（0 次：schema 违禁项 = 0；校验器正对照已证明其具备检出能力）

R-A：
架构层获得正向证据（H1–H10 全部通过、related 与 uncompared 完全稳定、零数值、零 Level B 准入、零 embedding 依赖）；
判定规则层出现维度边界过判漂移（matched 集合 5/8 CASE 不稳定，方向 100% 为过判、0 漏判）；
⇒ 未构成"核心假设不可用"的反例，但也未满足 PASS 条件。整体记为：证据不足（需补测）。

TQ04：
仍留 Gate B = 是（本 Spike 未选择 R-A，未 CONFIRM，未推翻；未发现必须改用 R-B / R-C 的反例）

TQ09：
需要 Integrator 关注 = 是

是否需要后续 Spike：
是（建议 SP-03R：先由 Integrator 补定「构成可比对重叠」判据 + 引擎级 Structured Output，再复用同一套 fixture 补测）

BLOCKER：
无（不阻塞 S00-03 阶段流程）
⚠️ 但须登记：TQ04 定稿的前置依赖「SP-03 可交付性证据」仍未满足。

CCR：
无（未对任何契约条目提出变更）
⚠️ 但须登记 1 项 Integrator 收敛项：`04_RETRIEVAL_AND_COMPARISON.md` §D.2 第 2 步的「构成可比对重叠」判据未定义。

PRODUCT SEMANTIC CONFLICT：
无（未发现"技术上必须回改产品机制"的情形；本 Spike 指出的属规则欠定义，不属产品机制冲突）

DECISION REQUIRED：
有（1 项）
内容：「构成可比对重叠」应采用读法 α（同一件事，严格）还是读法 β（同一类事，宽松）——两种读法会产生不同的 ⑦「相似点」内容，属用户可感知行为。
处置建议：**先由 Integrator 依 `04_RETRIEVAL_AND_COMPARISON.md` §O 收敛**；若 Integrator 判定 canonical 无法唯一推出，则须升级为人工裁决。
本 Spike **不自行裁决、不创建 Decision ID、不修改任何规则文本**。
```

> 🟢 **事后补注（指向文末 §P）**：上述 `DECISION REQUIRED` 记录的 1 项（读法 α / 读法 β 之择）已由**项目负责人**以 **`D-050`** 作出**人工决策** —— **采纳严格语义重叠（读法 α）**。该决策属**事后**决策，**不是 `SP-03` 当时的实验输入**，**不改变本报告任何原始结果**；详见文末 **§P. POST-DECISION ADDENDUM**。

**然后停止。本 Spike 不进入 `S03-E`。**

---

## P. POST-DECISION ADDENDUM

> 🟢 **本节为事后追加记录（Addendum），写于 `SP-03` 执行完成之后、并按原样保留其全部原始结果。**
> **本节不修改本报告任何原始结果 / 不修改任何实验数据 / 不修改 Gold Standard / 不改变 `SP-03 RESULT`。**

### P.1 事件：`SP-03` 后的人工决策 `D-050`

`SP-03` 完成后，**项目负责人**针对本 Spike 暴露的 **`matched` 语义歧义**（§J.4 观测到的读法 α「同一件事」/ 读法 β「同一类事」）作出**人工决策**：

| 项 | 内容 |
|---|---|
| 决策编号 | **`D-050`**（来源阶段 = `S00-03`；**触发 = `SP-03`**） |
| 决策主题 | **Level A 单个维度在什么条件下才允许判定为 `matched`**（即"严格语义重叠"判据的正式定义） |
| 最终结论 | **采用「严格语义重叠」**：**仅当两侧表达「相同的实质内容」或「语义等价的改写」时才允许 `matched`**（允许形式 = 同义改写 / 表述顺序不同但实质相同 / 单位等价表达 / 不改变实质含义的语言改写） |
| 主要放弃 | **「宽松类别重叠」（= 读法 β）** |
| 日期 / 状态 | **2026-09-19** / **`CONFIRMED`**（见 `docs/DECISIONS.md` §《D-050》） |

⇒ 即：**`D-050` 采纳的是本报告 §J.4 的读法 α，明确放弃读法 β。**（本条仅为事实记录，**不构成本报告对 `D-050` 的再解释或扩张**。）

### P.2 四条必须遵守的口径

| # | 口径 |
|---|---|
| **1** | **`D-050` 不是 `SP-03` 当时的实验输入。** `SP-03` 的全部 48 次独立判定、全部环境记录、全部结论，均产生于 `matched` 判据**尚未被定义、尚未被裁决**的状态；`D-050` 是**事后**决策，**不得被倒读为 `SP-03` 的实验前提**。 |
| **2** | **不得以 `D-050` 反向修改 `SP-03` 的任何原始结果。** 不得据此把 `INCONCLUSIVE` 改为 `PASS`；不得修改 / 删除任何不利实验结果；不得修改 Gold Standard；**不得伪造新的运行次数**；不得改动 `results_primary` / `results_extended` / `raw_model_output` / `run-1`～`run-6` verdict / `cases` / runner。 |
| **3** | **`D-050` 将成为 `SP-03R` 的新前提。** 若执行 `SP-03R`，其判定输入必须**内建 `D-050` 的严格语义重叠判据**（并宜配合 §J.5 建议 2 / 3：引擎级 Structured Output、显式负例约束），且**复用同一套 `SP-03_cases.json`（Gold 不得修改）**。 |
| **4** | **`D-050` 是否解决稳定性问题，必须由 `SP-03R` 实测判定，不得由本报告推断。** 本报告**不主张** `D-050` 已消除 `matched` 集合漂移；**该问题仍然开放**。 |

### P.3 仍开放的事项（不因 `D-050` 而关闭）

| # | 事项 | 状态 |
|---|---|---|
| 1 | `matched` 集合在 `D-050` 判据下能否在多次运行间一致 | **未验证** ⇒ 需 `SP-03R` 实测 |
| 2 | 规则显式化后，**模型随机性 / 会话环境差异**是否仍造成漂移（无法在本次环境分离） | **未验证** ⇒ 需在可固定采样参数 + 引擎级 Structured Output 条件下复测 |
| 3 | **`TQ04`**（`R-A` / `R-B` / `R-C` 路线选择） | **仍留 Gate B**，未裁决；**本报告与 `D-050` 均未选择 `R-A`**（`R-A` 仍只是 `PROPOSED`） |
| 4 | **`TQ09`**（AI 判定可复现性与技术层留痕范围） | 仍需 Integrator 收敛（见 §M） |
| 5 | `04_RETRIEVAL_AND_COMPARISON.md` §D.2 是否回写 `D-050` 判据 | Integrator 收敛动作（本 Spike **不改该文件**） |

### P.4 与 `D-050` 自身射程保持一致（不扩大）

`D-050` **只定义「单个 Level A 维度何时叫 `matched`」**；`matched_level_a_dimensions` 非空 → `related` **仍属 `S03-D` / Integrator 的架构收敛项**，本 Addendum **不改变、不升级、不 `CONFIRM`**。同时，**本 Addendum 不把 `SP-03` 的任何 `PROPOSED` 内容升级为 `CONFIRMED`**。

---

**POST-DECISION ADDENDUM 结束。`SP-03 RESULT` 保持 `INCONCLUSIVE`，全部原始实验数据一字未改。**
