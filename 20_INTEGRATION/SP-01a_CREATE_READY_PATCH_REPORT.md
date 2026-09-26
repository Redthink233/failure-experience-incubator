# SP-01a CREATE READY PATCH REPORT

> **阶段**：`S00-03｜技术架构与实现方案收敛`　**类型**：P0 技术 Spike / Resource Creation 前 **Gate Patch**
> **执行方式**：本地 LearnBuddy **独立会话**（本机**无任何云凭据、未登录任何控制台、未创建任何资源**）
> **日期**：2026-09-20
> **本轮唯一实质产出**：`20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（就地 Patch，**不另起竞争版本**）
> **对 `TQ` 的影响**：**无** —— 不构成对 `TQ01`–`TQ05` 的任何 `CONFIRM`；**未修改 `TQ` 任何状态**
> **本轮终点**：`READY FOR ACCOUNT-LEVEL BACKFILL`（≠ `READY TO CREATE`）

---

## 1. 输入资产（已读）

| # | 资产 | 状态 |
|---|---|---|
| 1 | `docs/00_PROJECT_RULES.md` | ✅ 已注入（协作规则 / 状态语义 / 落盘规则） |
| 2 | `docs/DECISIONS.md`（`D-001`–`D-052`） | ✅ 已读（重点：`D-051` / `D-052`、S00-03 人工决策章） |
| 3 | `docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`（`v0.2.5 DRAFT`） | ✅ 已注入 |
| 4 | `docs/analysis/S00-03_技术架构阶段启动.md` | ✅ 已注入 |
| 5 | `20_INTEGRATION/S00-03_技术决策包.md`（A–S 19 节） | ✅ 已读（重点：§N.8–§N.12 + 顶部 STATUS） |
| 6 | `docs/CHANGELOG.md` | ✅ 已读（逐条比对 2026-09-20 各条目） |
| 7 | `20_INTEGRATION/SP-01a_RESOURCE_DISCLOSURE_PACK.md` | ✅ 已读（§4 / §6.3 / §6.6 为本次 Decision State 判定的关键依据） |
| 8 | `20_INTEGRATION/SP-01a_CREATE_READY_PACK.md` | ✅ 已读（本轮被 Patch 对象） |
| 9 | `项目会话压缩交接_2026-09-20.md` | 🔴 **未能在本工作区找到**（全库 `Glob **/*交接*` = 0 命中）⇒ **作为输入缺口登记**，见 §3.3 |
| 10 | `.learnbuddy/memory/2026-09-20.md` / `MEMORY.md` / `DECISION_INDEX.md` | ✅ 已读（仅作交叉核对，**不作为人工决策依据**） |

---

## 2. Decision State 检查

**检查对象**：`SP-01a_CREATE_READY_PACK.md` 原顶部与 §A.2 声称的"**人工已选执行配置（2026-09-20，项目负责人）**：**组合甲 + 路径 (a) Web 函数 + 标准型 API 网关**"。

**回查结果（逐文件）**

| 回查来源 | 是否记录"项目负责人本人明确选择 组合甲 + 路径 (a)" | 说明 |
|---|---|---|
| `docs/DECISIONS.md`（`D-001`–`D-052`） | ❌ **无** | 仅 `D-051` / `D-052`（重新生成产物语义 / `actual_attempt` 负例）。逐字检索"组合甲 / 组合乙 / 路径 (a) / 触发器路径"= **0 命中** |
| `docs/CHANGELOG.md` | ❌ **无** | 2026-09-20 各条目仅登记 `SP-01` 批准、§N.8 族级落名（`P-1`/`P-3`）、§N.9 成本纪律、§N.10 凭据、§N.11 时序 A、§N.12 报备清单；**未出现组合 / 触发器路径** |
| `20_INTEGRATION/S00-03_技术决策包.md` §N.8–§N.12 + 顶部 STATUS | ❌ **无** | §N.8 只落**族级**（Primary = `P-1` 腾讯云族 / Fallback = `P-3`，**注明"族级落名 ≠ 已选定具体平台"**）；§N.12 的 `R1`–`R3` 规格标"**待你核对回填**"；**全文无"组合甲 / 路径 (a)"** |
| `20_INTEGRATION/SP-01a_RESOURCE_DISCLOSURE_PACK.md` | ❌ **无（且相反）** | §6.6 明确登记 **`DECISION REQUIRED` = 2 项**（① 组合甲/乙 ② R1 触发器路径）；§6.3 写"**处置：不自行决定**。请在确认时指明走 (a) / (b) / 或接受默认 15 s" |
| `项目会话压缩交接_2026-09-20.md` | ⚠️ **文件不存在** | 无法作为依据（见 §3.3） |
| `.learnbuddy/memory/2026-09-20.md` | ⚠️ 记为"人工已选" | 属 **AI 侧自有工作日志**，**非 canonical 人工决策记录**；且其表述与该条目的上游报备包（明列为 `DECISION REQUIRED`）**相互矛盾** |

**判定**：全库**唯一**出现"组合甲 / 路径 (a)"的文本，就是**两份 SP-01a 文档自身 + AI 自有工作日志**。
**不存在**"项目负责人本人明确选择 组合甲 + 路径 (a)"的可追溯记录。
⇒ 该表述属 **AI 侧推断 / 上游推荐被自动升级为"人工已选"**，违反项目规则（**AI 结论默认 `PROPOSED`，仅人工明确确认后才 `CONFIRMED`**）。

---

## 3. 是否发生 DECISION STATE CORRECTION

### 3.1 结论：**YES —— 已发生 DECISION STATE CORRECTION**

| 项 | Patch 前（原文） | Patch 后（当前） |
|---|---|---|
| **组合甲** | ✅ **人工已选**（2026-09-20，项目负责人） | 🟡 **`PROPOSED` / 待项目负责人确认** |
| **路径 (a)** | ✅ **人工已选**（"不接受默认 15 s 作为本次最终验证条件"） | 🟡 **`PROPOSED` / 待项目负责人确认** |

### 3.2 处置与依据

- **未替项目负责人确认**：只下调状态，**不选择替代方案**（组合乙、路径 (b)、接受 15 s 均**保持候选、未采用亦未否决**）。
- **保留可追溯说明**：在 `SP-01a_CREATE_READY_PACK.md` §A.2 增加《DECISION STATE 说明》，逐条列出回查范围与结论。
- **性质**：**不是技术 `BLOCKER`**，**不阻断本轮 Patch**（本轮已完整完成）；但**阻断"进入创建"** —— 创建前须由项目负责人作出明确选择。
- **依据**：项目规则（状态语义 / 不得自动升级 / 事实与推断分离）+ 任务书 §三 / §四 / §十二。

### 3.3 输入缺口登记（非阻塞）

`项目会话压缩交接_2026-09-20.md` **在本工作区未找到**（`Glob **/*交接*` = 0 命中）。
⇒ 若该文件确实存在于其他位置且其中含"组合甲 + 路径 (a)"的人工确认记录，**请提供后我再复核并回改状态**。
**在此之前，按"无明确人工确认"处理**（保守方向）。

---

## 4. PATCH-01 执行结果（RF-01 免费额度口径）

- **原表述**：`RF-01` = "R1 是否有 SCF 免费额度（有无 + 有效期）"。
- **问题**：该表述**未区分**"**官方公开存在某种免费政策**"与"**当前账号实际拥有有效免费额度**" —— 二者不是一回事。
- **Patch 内容（已落盘）**：
  1. `RF-01` 扩写为 **"SCF 免费试用 / 免费额度账号级状态"**，含 6 项：① 本账号是否具备资格 ② 是否已领取 / 激活 / 获取对应免费资源包 ③ 当前是否仍有效 ④ 生效时间 ⑤ 失效时间 ⑥ 当前剩余额度；
  2. 明确**判定依据 = 当前账号的「资源包页 / 用量页 / 费用中心 / 创建页」**；
  3. 明确 **"不得仅根据公开文档推断'本账号当前免费'"**；
  4. 明确 **"若账号级页面尚未核验 ⇒ 保持 `🔴 待回填`"**；
  5. 在 §B.1 增加《免费额度的两种含义必须分开》说明块，并在 §C.1 第 1 条改写为账号级核验步骤。
- **结果**：**PASS**（已收紧为账号级口径；未做任何"本账号免费"的推断）。

---

## 5. PATCH-02 执行结果（R3 硬盘价格证据等级）

- **原表述**：§E.1（现 §E.4）注中 `≈0.001 元/GB/小时` 标为**"非官方保守示意值"**。
- **是否可提升为"官方公开计费示例参考值"**：🔴 **不可以** —— 本轮**注入资产未提供**该数值的官方出处（官方计费文档 / 官方计费示例均未核到）。按任务书 §七：**"如果当前注入资产不足以证明……则不要擅自提升证据等级"**。
- **Patch 内容（已落盘）**：
  1. §B.4 新增《磁盘单价的证据等级（PATCH-02）》说明块 —— 明确 **`≈0.001 元/GB/小时` = 「非官方保守示意值」，证据等级 = 🔴，仅用于给出费用上界**；
  2. 明确 **本轮不提升证据等级**，**不得改写为"腾讯云官方公开计费示例参考值"**；
  3. 明确 **"官方公开示例参考值" ≠ "本账号实际创建页报价"** ⇒ **`RF-10` 仍必须由项目负责人登录控制台回填**；
  4. 明确 **`S-05` 的最终费用依据仍然是「控制台实际报价 + 实际账单 / 额度页」**；
  5. 在 §E.4「预计费用」行内就地标注该值的证据等级与"非本账号报价"限定。
- **结果**：**PASS**（保持保守等级；**未提前把 `RF-10` 标记完成**）。

---

## 6. PATCH-03 执行结果（CloudBase 地域口径）

- **原表述**：§B.3 记"官方资源点文档只给出**上海 / 新加坡**两套计费表"；§C.3 警"**若 R2 只能选上海**，则 R2 与 R1/R3（广州）不同地域"。
- **问题**：存在把"**公开文档覆盖地域**"直接推出为"**本账号实际可选地域**"的风险。
- **Patch 内容（已落盘）**：
  1. §B.3 新增《地域口径（PATCH-03）》说明块 —— 统一为：**"公开文档覆盖地域" ≠ "当前账号创建页实际可选地域"**；
  2. 明确**禁止**推出：❌ "R2 必然只能创建于上海" / ❌ "R2 与 R1·R3 必然跨地域" / ❌ "因此必须更换产品"；
  3. 明确 **R2 实际可选地域必须由 `RF-08` 在控制台创建页地域下拉框读取**；
  4. §C.3 第 2 条改写为"**实际可选地域 + 默认域名能力 + 默认 HTTPS 是否存在**"，并注明**不得用官方文档覆盖地域代替**；
  5. §E.3 新增「地域」行：**不预断**；若 `RF-08` 回填显示 **R2 实际可选地域无法满足已报备结构 ⇒ 标 `RESOURCE CHANGE REQUIRED`，重新报备，不得自行切换产品**。
- **结果**：**PASS**。

---

## 7. RF-01～RF-12 最终表检查

**结论：`RF-01`–`RF-12` 已具备账号级回填条件 = YES（最小充分，未新增编号）**

| RF | 是否最小充分 | 本次调整 |
|---|---|---|
| `RF-01` | ✅ | **PATCH-01**：扩为账号级 6 项（资格 / 领取激活 / 有效 / 生效 / 失效 / 剩余额度） |
| `RF-02` | ✅ | 保持（512 MB 可选性 + Timeout 实际可选范围） |
| `RF-03` | ✅ | 保持（Node.js 当前实际可选版本列表） |
| `RF-04` | ✅ | 保持（CLS 是否存在"关闭 / 不投递"） |
| `RF-05` | ✅ | 补全为 **是否存在 + 是否有效 + 有效期** 三问 |
| `RF-06` | ✅ | 保持并强化（标准型 + 共享型 + 无实例固定费 + 后端 timeout 30 s） |
| `RF-07` | ✅ | 保持（免费体验版 / 已有免费套餐 / 是否必须购买付费套餐） |
| `RF-08` | ✅ | **PATCH-03**：明确"当前实际可选地域（控制台下拉）" + 默认域名 + 默认 HTTPS |
| `RF-09` | ✅ | 保持（广州 1C2G 实际按量单价 元/小时） |
| `RF-10` | ✅ | 补全为 **实际最小磁盘 + 磁盘类型 + 实际磁盘按量单价** |
| `RF-11` | ✅ | 补全为 **是否只能双机高可用 + 是否存在其它强制项目 + 销毁后是否立即停费** |
| `RF-12` | ✅ | 保持，并明确 **只记名称**、**不得记录密码 / 密钥 / 敏感凭据** |

> 🔴 **未因"想更完整"而无限增加 RF 编号** —— 仍为 **12 格**。

---

## 8. 费用模型检查

**结论：已严格分层（A / B / C / D），无 A→B 混用**

- 新增 **§E.0《费用数据的四类分层》** 表：**A 官方公开价格** ｜ **B 本账号控制台实际报价** ｜ **C 本次预计用量** ｜ **D 预计费用**。
- 各资源表（`R1` / `API Gateway` / `R2` / `R3`）已统一为 **【A 官方对照】+【B 账号级实际值 `🔴 待回填`】+【预计用量假设（C）】+【预计 6 小时最高费用（D）】** 四行结构。
- 🔴 明确 **"禁止把 A 直接写成 B"**；**B 未回填时 D 必须明示"基于 A 的上界估算，非本账号报价"**。
- 🔴 明确 **`S-05` 最终费用依据 = 控制台创建页实际报价 + 实际账单 / 资源包页**。
- **`R1` CLS 项专项修正（§十一要求）**：**若无法关闭 ⇒ 存在关联 CLS 计费可能**；**不估算成"绝对为 0"**；**属免费额度则记"免费"、无免费额度则记"实际费用"**，二者均由 `RF-04` + 账号 CLS 免费期状态确定。

---

## 9. RESOURCE CHANGE REQUIRED 状态

**当前 = NO（未创建任何资源；无已发生的变化）**

**预判触发清单（出现即停止 + 重新报备，不得自行吸收）**：

| # | 触发条件 | 处置 |
|---|---|---|
| 1 | 标准型网关**只能使用付费专享实例** / 必须购买实例 / 新增实例固定费用 | `RESOURCE CHANGE REQUIRED` → 停止 |
| 2 | `R2` **必须购买付费套餐**（含 19.9 元/月或任何付费套餐） | `RESOURCE CHANGE REQUIRED` + `BILLING CHANGE REQUIRED` → 停止并重新披露 |
| 3 | `R2` 实际可选地域**无法满足已报备结构** | `RESOURCE CHANGE REQUIRED` → 重新报备 |
| 4 | `R3` **最低规格提高** / 新增**强制付费能力** | `RESOURCE CHANGE REQUIRED` → 停止 |
| 5 | 需要 **NAT 网关 / 固定公网 IP / 公网带宽** | `RESOURCE CHANGE REQUIRED` → 停止 |
| 6 | 需要**数据库代理**或其它付费增值服务 | `RESOURCE CHANGE REQUIRED` → 停止 |

---

## 10. BLOCKER

**= NO**

- 本轮为**文档 Patch**，**未接触任何需要凭据 / 计费 / 部署的环节**。
- **无技术 `BLOCKER`**；**无 `CCR`**；**无 `PRODUCT SEMANTIC CONFLICT`**。
- 唯一的输入缺口 = `项目会话压缩交接_2026-09-20.md` **未找到**（§3.3）—— 属**信息性缺口**，**不构成阻塞**（已按保守方向处理）。

---

## 11. DECISION REQUIRED

**= YES（2 项，**均为**项目中已存在、需项目负责人裁决的项，本轮不代为裁决）**

| # | 事项 | 当前状态 | 说明 |
|---|---|---|---|
| 1 | **资源组合：组合甲 vs 组合乙**（含 `R2` 是否与 `R1` 共宿主） | 🟡 **待项目负责人裁决** | 来源 = `SP-01a_RESOURCE_DISCLOSURE_PACK.md` §4 / §6.6（原 `DECISION REQUIRED`）。本轮**修正状态语义**时确认其**从未被人工确认** |
| 2 | **`R1` 触发器路径：路径 (a) / 路径 (b) / 接受默认 15 s** | 🟡 **待项目负责人裁决** | 来源 = §6.3 / §6.6 同上 |

> 🔴 二者**不阻断**本轮 Patch 完成，**但阻断"进入创建"**（§H 状态机）。
> 🔴 **AI 不代为裁决**，也**不把任何一项写成"已选 / 已批准 / 最终方案"**。

---

## 12. 当前 Gate 状态

```
BLOCKED ON ACCOUNT-LEVEL BACKFILL
        ↓  本轮 Gate Patch（2026-09-20）
[当前]  READY FOR ACCOUNT-LEVEL BACKFILL      ← 文档已具备账号核验条件
        ⚠️ ≠ READY TO CREATE
```

- **`S00-03` = 已启动 / 未关闭**（未变）。
- **`SP-01` = `APPROVED` / 未执行**（未变）；**`SP-01a` = 未执行**；**`SP-01b` = 未执行**。
- **`TQ01`–`TQ05` 全部仍为 `PROPOSED`、仍留 Gate B**（未变）。
- **流程（唯一口径）= `Gate A → S03-A~E → Integrator → D-051/D-052 落盘 → SP-01 实测 → Gate B → Local Landing → Gate C`**（未变）。

---

## 13. 下一人工动作

**下一人工动作（唯一）= 项目负责人登录腾讯云控制台，按 `RF-01 → RF-12` 逐项完成账号级回填**（可附控制台截图）。

**并请一并明确两处选择（当前 = `PROPOSED`）**：

1. **资源组合**：`组合甲` / `组合乙`；
2. **`R1` 触发器路径**：`(a) 标准型 API 网关` / `(b) 事件函数 + API 网关` / `接受默认 15 s`。

🔴 **在 `RF-01`–`RF-12` 完成 + `CREATE READY Gate Review` 通过 + 项目负责人再次明确"确认创建"之前，不得创建任何云资源。**

---

## 记账：本轮**没有**做什么（边界确认）

- 🔴 **未创建任何资源**（无 SCF / 无 API 网关 / 无 CloudBase 环境 / 无 PostgreSQL / 无 VPC / 无子网）；
- 🔴 **未登录 / 未操作腾讯云控制台**（本机无凭据）；
- 🔴 **未写探针代码 / 未写 HTML / 未部署 / 未建数据库表**；
- 🔴 **未执行 `S-01`–`S-07`、未执行 `SP-01a` / `SP-01b`**；
- 🔴 **未产生任何费用**；
- 🔴 **未修改 `TQ01`–`TQ05` 任何状态**；**未写"腾讯云已成为最终生产平台" / "组合甲已成为正式生产架构" / "路径 (a) 已成为正式生产触发器架构"**；
- 🔴 **未修改** `20_INTEGRATION/SP-01a_RESOURCE_DISCLOSURE_PACK.md`（**历史阶段产物，一字未动**）；
- 🔴 **未修改** `20_INTEGRATION/S00-03_技术决策包.md`、五份 Worker 产出（`01`–`05`）、`SP-03` / `SP-03R` 及任何 canonical Spike 文件；
- 🔴 **未进入** Phase 2 / Gate B / 正式编码。

**本轮修改的文件（3 个）**：`20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（就地 Patch）｜**新增** `20_INTEGRATION/SP-01a_CREATE_READY_PATCH_REPORT.md`｜`docs/CHANGELOG.md`（追加变更条目）。

---

## 【SP-01a CREATE READY PATCH RESULT】

```
Status:
  READY FOR ACCOUNT-LEVEL BACKFILL

Files Updated:
  · 20_INTEGRATION/SP-01a_CREATE_READY_PACK.md（就地 Patch，未另起竞争版本）
  · 20_INTEGRATION/SP-01a_CREATE_READY_PATCH_REPORT.md（新增）
  · docs/CHANGELOG.md（追加变更条目）

Decision State:
  组合甲：  PROPOSED / 待项目负责人确认（非 CONFIRMED）
  路径 (a)：PROPOSED / 待项目负责人确认（非 CONFIRMED）

Decision State Correction:
  YES
  说明：全库（DECISIONS.md / CHANGELOG.md / 技术决策包 §N.8–§N.12 / RESOURCE_DISCLOSURE_PACK）
        均无"项目负责人本人明确选择 组合甲 + 路径 (a)"的记录；仅在 SP-01a 两份文档自身与
        AI 自有工作日志中出现，属"上游推荐被自动升级为人工已选"。已下调为 PROPOSED / 待确认，
        并在 CREATE READY PACK §A.2 记录《DECISION STATE 说明》，未代为选择替代方案。

PATCH-01｜RF-01：
  PASS
  说明：RF-01 由"有无 + 有效期"收紧为【账号级 6 项：资格 / 领取激活 / 有效 / 生效 / 失效 / 剩余额度】；
        判定依据 = 资源包页 / 用量页 / 费用中心 / 创建页；明确不得据公开文档推断"本账号当前免费"；
        账号级页面未核验则保持 🔴 待回填。

PATCH-02｜R3 硬盘价格：
  PASS
  说明：≈0.001 元/GB/小时 保持"非官方保守示意值"（证据等级 = 🔴）；本轮注入资产未提供官方出处
        ⇒ 不提升证据等级、不改写为"官方公开计费示例参考值"；RF-10 仍必须控制台回填；
        S-05 依据仍为控制台实际报价 + 实际账单 / 额度页；未提前把 RF-10 标记完成。

PATCH-03｜CloudBase 地域：
  PASS
  说明：统一为"公开文档覆盖地域 ≠ 当前账号创建页实际可选地域"；不得推出"R2 必然只能上海 /
        R2 与 R1·R3 必然跨地域 / 必须更换产品"；R2 实际地域须由 RF-08 在控制台下拉框读取；
        若 RF-08 显示不满足已报备结构 ⇒ RESOURCE CHANGE REQUIRED，重新报备、不得自行切换。

RF Table:
  RF-01～RF-12 是否已具备账号级回填条件：YES（仍 12 格，最小充分，未新增编号）

Resources Created:
  NONE

Deployments:
  NONE

Probe Code Written:
  NO

S-01～S-07 Executed:
  NO

Cost Incurred:
  0

RESOURCE CHANGE REQUIRED:
  NO（未创建资源；预判触发清单 6 条已登记，出现即停止并重新报备）

BILLING CHANGE REQUIRED:
  NO（未创建资源、未购买套餐；若 RF-07 = 必须付费套餐则触发）

BLOCKER:
  NO

DECISION REQUIRED:
  YES（2 项）
  问题：① 资源组合 = 组合甲 / 组合乙（含 R2 是否与 R1 共宿主）
        ② R1 触发器路径 = (a) 标准型 API 网关 / (b) 事件函数 + API 网关 / 接受默认 15 s

Current Gate:
  READY FOR ACCOUNT-LEVEL BACKFILL
  （§N.9 第 2 条"逐项报备 + 再次确认"继续适用；本状态 ≠ READY TO CREATE）

Next Human Action:
  项目负责人登录腾讯云控制台，按 RF-01 → RF-12 完成账号级回填，并一并明确上述 2 项选择。
  在 RF-01～RF-12 完成 + CREATE READY Gate Review 通过 + 再次明确"确认创建"之前，
  不得创建任何云资源。
```

> 🚩 **上方 `【PATCH RESULT】` 为**本轮 Patch 完成时点（2026-09-20）的快照**，其中 `DECISION REQUIRED: YES` 与 `Next Human Action` 的"2 项选择"部分，**已被 §14 补充覆盖** —— 保留原文不改写，另附 §14 说明。

---

## 14. 补充（2026-09-20 同日）｜人工裁决已到 → `DECISION STATE CORRECTION` 已解除

**触发**：项目负责人明确指令 **「组合甲+路径(a)」**。

### 14.1 裁决登记（`CONFIRMED`）

| 项 | 裁决 | 状态 |
|---|---|---|
| **资源组合** | **组合甲**（`R1` 独立腾讯云 SCF ＋ `R2` CloudBase 静态网站托管 ＋ `R3` 独立 TencentDB for PostgreSQL） | ✅ **`CONFIRMED`（人工已选，2026-09-20）** |
| **`R1` 触发器路径** | **路径 (a)**：Web 函数自定义创建 ＋ 标准型 API 网关（后端超时可配 30 s） | ✅ **`CONFIRMED`（人工已选，2026-09-20）** |
| 组合乙 / 路径 (b) / 接受 15 s | **不采用** | ❌ 保留为候补记录，不删除 |

### 14.2 状态轨迹（**保留、不改写历史**）

```
① 最初：本包误写"✅ 人工已选（项目负责人）"   ← 实为上游推荐，无人工确认记录（DECISION STATE CORRECTION）
② 本轮 Patch：下调为 🟡 PROPOSED / 待确认      ← 见本报告 §3
③ 现在：项目负责人明确指令「组合甲+路径(a)」  → 恢复登记为 ✅ CONFIRMED   ← 本节
```

### 14.3 落盘位置（3 处）

1. `20_INTEGRATION/SP-01a_CREATE_READY_PACK.md` —— 顶部状态行 + §A.2（表与《人工裁决与边界》块）+ §C.2 + §E.2 + §J 就地同步；
2. `20_INTEGRATION/S00-03_技术决策包.md` §N.12 尾部 —— 新增《🟢 人工裁决结果（2026-09-20，补充 · 项目负责人）》；
3. `docs/CHANGELOG.md` —— 追加《2026-09-20 — S00-03 / `SP-01a` 资源组合与触发器路径人工裁定》。

### 14.4 边界（**裁决 ≠ 授权**）

- 🔴 **本裁决不改变 `§N.9` 第 2 条** —— **逐项报备 + 再次确认继续适用**；`R1`/`R2`/`R3` 的**具体规格与单价仍为 `PROPOSED`**，**须经 `RF-01`–`RF-12` 回填**后才成为本账号创建规格。
- 🔴 **不构成创建授权**；**未创建任何资源 / 未登录控制台 / 未写探针 / 未部署 / 未建表 / 未执行 `S-01`–`S-07`**；**费用 = 0**。
- 🔴 **不 `CONFIRM` `TQ01`–`TQ05`**（五项仍 `PROPOSED`、仍留 Gate B）；**不得写"腾讯云已成为最终生产平台" / "组合甲已成为正式生产架构" / "路径 (a) 已成为正式生产触发器架构"**。
- 🔴 **不占用 `Decision ID` 空间**（`D-0xx` 为产品语义决策）；**未创建任何 `Decision`**。
- 🔴 **未修改** `SP-01a_RESOURCE_DISCLOSURE_PACK.md`（历史产物一字未动）、五份 Worker 产出、`SP-03` / `SP-03R` 及任何 canonical 契约。

### 14.5 更新后的标志位与下一动作

```
RESOURCE CHANGE REQUIRED : NO
BILLING CHANGE REQUIRED  : NO
BLOCKER                  : NO
DECISION REQUIRED        : NO（原 2 项已由人工裁决关闭：组合甲 + 路径 (a)）
Current Gate             : READY FOR ACCOUNT-LEVEL BACKFILL（≠ READY TO CREATE）
Next Human Action        : 项目负责人登录腾讯云控制台，按 RF-01 → RF-12 完成账号级回填（可附截图）
                           → CREATE READY GATE REVIEW → 明确“确认创建” → 方可进入 Phase 2
```

---

# 15. `R1` HTTP Entry Account-Level Reopen & Re-Decision（2026-09-20 同日）

> **本节性质**：**追加新状态** —— 🔴 **不改写上文（尤其 §14 的人工裁决历史）**；上文全部保留为**时间序列快照**，本节记录**其后的账号级发现与重新裁决**。
> **触发**：项目负责人**本人登录腾讯云控制台**完成账号级核验时发现：**旧 `R1` 触发器路径 (a) 在当前真实云环境不可执行**。
> **本轮唯一实质产出**：`20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（**就地 Patch**，**不另起竞争版本**）。
> **对 `TQ` 的影响**：**无** —— 不构成对 `TQ01`–`TQ05` 的任何 `CONFIRM`；**未修改 `TQ` 任何状态**。

---

## 15.1 原 `CONFIRMED` 路径（历史，保留）

| 项 | 内容 |
|---|---|
| 裁决时间 / 来源 | **2026-09-20**，项目负责人，人工原话 **「组合甲+路径(a)」** |
| 资源组合 | **组合甲**：`R1` 独立腾讯云 SCF Web 函数｜`R2` CloudBase 静态网站托管（独立环境）｜`R3` 独立 TencentDB for PostgreSQL |
| `R1` 触发器路径 | **路径 (a)**：**Web 函数自定义创建 + 标准型 API 网关**（后端超时可配 30 s） |
| 当时状态 | ✅ **`CONFIRMED`**（落盘见 PACK §A.2 / 决策包 §N.12 / CHANGELOG） |

## 15.2 账号级新事实（**项目负责人本人控制台核验**）

| # | 事实 | 证据等级 |
|---|---|---|
| 1 | 腾讯云旧 API Gateway 产品：**2024-07-01 起不再支持新建 API Gateway 触发器** | 🟠 账号级（项目负责人控制台核验 / 页面提示） |
| 2 | **2025-06-30 API Gateway 产品停止服务 / 触发器下线** | 🟠 同上 |
| 3 | ⇒ 旧路径 (a) 在**当前真实云环境不可执行** | 🟠 由 1 + 2 推出（**处置性结论**） |
| 4 | 同期账号级实测：`RF-02` 512 MB 存在 / 超时范围 1–900 s；`RF-03` Node.js `24.11`·`22.21`·`20.19`·`18.15`·`16.13`·`14.18`；`RF-04` 日志投递有「启用」开关、可保持未启用 | 🟠 账号级 |
| 5 | **Web 函数存在「函数 URL」配置**：公网访问可启用 / 内网访问可启用 / 授权类型 `CAM`·`开放` | 🟠 账号级 |
| 6 | 补充官方对照（本轮新核）：函数 URL **端点格式 = 公网 `https://<...>.tencentscf.com` / 内网 `https://<...>.in.<...>.tencentscf.com`**；**配置项含 CORS**；**默认关闭**、与版本·别名一对一绑定 | 🟢 官方《函数 URL 概述》（页面最近更新 2025-08-12）/《创建函数 URL》 |

> 🔴 **性质判定（必须保留）**：旧路径 (a) **不是"从未确认"，也不是"人工决策错误"** —— 而是 **已 `CONFIRMED` → Account-Level Verification → 发现当前真实云环境不可执行 → 重开 → 重新裁决**。
> ⚠️ **差异登记（不改变本轮裁决）**：🟢 官方《函数 URL 概述》写"**可以在启用函数 URL 的同时配置 API 网关等触发器**"，与本账号级核验"旧 API Gateway 触发器不可新建"存在**表述差异** ⇒ 处置 = **本包既定口径"账号级优先"**，且当前路径**不使用任何 API Gateway 触发器** ⇒ **不影响结论**；**登记备后续复核**。

## 15.3 `RESOURCE CHANGE REQUIRED`

```
RESOURCE CHANGE REQUIRED = YES   ← 由旧 API Gateway 停服事实触发（曾发生）
```

## 15.4 项目负责人重新裁决（**`CONFIRMED`**）

| 项 | 裁决 | 状态 |
|---|---|---|
| **`R1` HTTP Entry** | **`SCF Web 函数 + Function URL`** | ✅ **`CONFIRMED`（人工已选，2026-09-20）** |
| **旧路径 (a)** | **`SUPERSEDED`**（**保留历史 `CONFIRMED` 文本，不删除、不改写**） | 🚩 `SUPERSEDED` |
| 资源组合 | **组合甲（不变）** | ✅ `CONFIRMED` |

## 15.5 `Function URL = CONFIRMED` 的射程（**不得扩大**）

- 🔴 **不代表** `TQ01` / `TQ03` / `TQ05` `CONFIRMED`；
- 🔴 **不代表**腾讯云成为**最终生产平台**；
- 🔴 **不代表** Function URL 成为**最终生产入口**；
- 🔴 **不代表**正式安全策略已确认（认证 / 用户登录 / API 安全模型 / 最终 CAM 策略 / CORS 白名单 / 正式防刷 / WAF **均未确认**）；
- 🔴 **不得**从 `Function URL = CONFIRMED` 推出"**正式系统应匿名开放**"；
- 🔴 **本次 `SP-01a` 不因此引入新网关**（未来若需鉴权 / 限流 / API 管理 / WAF / 高级路由 / 网关治理 ⇒ 在**正式实现 / Gate B 后续实现设计**中单独处理）。

## 15.6 `RF-05` / `RF-06` Semantic Patch（**编号不变，未新增 `RF-13`/`RF-14`**）

| 编号 | 旧定义（**已废止，保留不改写**） | **新定义（当前）** | 判定 |
|---|---|---|---|
| `RF-05` | API 网关"免费额度"资源包（存在 / 有效 / 有效期） | **Function URL 可用性** —— ① 支持 Function URL = YES ② 公网访问 = YES ③ 内网访问 = YES ④ 属 SCF 自身能力 ⑤ 不再依赖旧 API Gateway ⑥ **平台 HTTPS Endpoint = 能力层 YES / URL 实值 `deferred to Phase 2`**（🟢 官方端点格式）；➕ **CORS = 产品能力层 `SUPPORTED`（🟢 官方）/ 账号级未验证 / 真实行为 `DEFERRED TO Phase 2 Probe`** | 🟡 **PARTIAL PASS** |
| `RF-06` | 路径 (a) 自定义创建能否选「标准型 + 共享型实例」/ 无实例固定费 / 后端 timeout 30 s | **Function URL 调用与安全条件** —— 授权类型存在 `CAM` / `开放`；`开放` = **不自动**做 CAM 校验、支持匿名访问；`CAM` = 需 **腾讯云 CAM 鉴权**（基于 `InvokeFunctionUrl` 接口）；🔴 不得把 `开放` 写成正式生产安全策略；**探针期临时授权模式属 Phase 2 创建前的安全配置选择 ⇒ `DECISION REQUIRED`（安全配置层，非 `TQ` 级）** | 🟡 **PARTIAL PASS** |

> 🔴 **不再要求项目负责人查询**：旧 API Gateway 免费额度 / 共享型·专享型 / 标准型网关 / 旧网关后端超时（**这些均已随路径 (a) `SUPERSEDED`，不再属于当前 `SP-01a` 必要验证项**）。

## 15.7 费用影响

| 项 | 变化 |
|---|---|
| 旧 `API Gateway` | **移出**当前 CREATE READY 费用模型 ⇒ **当前预计费用 = `REMOVED`**（原 6 小时上界 ≈0.03 元不再计入） |
| `R1` 本体 | 单价口径不变（§E.1）；**已购 0 元新客试用套餐** ⇒ 6 小时预计 **≈ 0 元**（⚠️ **Web 函数响应流量不在免费额度内**，属额度外极小项） |
| `R1` HTTP Entry = Function URL | 🔴 **是否引入独立计费项 = 待核对**（**不凭模型知识给结论**；若引入新的独立付费项 ⇒ **`RESOURCE CHANGE REQUIRED`，先报备**） |
| 历史报备 | 🔴 `20_INTEGRATION/SP-01a_RESOURCE_DISCLOSURE_PACK.md` **保持不改**（历史阶段产物）；当前 PACK 内已注明 **"旧 API Gateway = `SUPERSEDED` / `NOT IN CURRENT CREATION SET`"** |
| 账号 / 计费事件 | 🚩 **已登记**：购买 0 元套餐时控制台提示"支付方式可能从微信支付切换为腾讯云支付且不可恢复"，项目负责人**已人工完成购买**；🔴 **不得把"0 元"解释为"无任何账号副作用"**（PACK §K.9） |

## 15.8 当前标志位

```
RESOURCE CHANGE REQUIRED : RESOLVED（曾发生 = YES；已由人工重新裁决处理）
BILLING CHANGE REQUIRED  : NO（0 元套餐购买事件已登记；R2 若必须付费套餐则届时触发）
BLOCKER                  : NO
DECISION REQUIRED        : YES = 1 项（安全配置层：探针期 Function URL 授权模式 开放 / CAM；
                                      Phase 2 创建前裁决；非 TQ 级；不扩大为技术架构决策）
SP-01a 资源层 DECISION REQUIRED : 0（不变：组合甲 + R1 HTTP Entry 均已人工裁定）
Current Gate             : READY FOR ACCOUNT-LEVEL BACKFILL（≠ READY TO CREATE）
TQ01–TQ05                : 未改变（五项仍全部 PROPOSED、仍留 Gate B）
```

## 15.9 下一人工动作（**唯一**）

```
进入「R2｜CloudBase」，完成账号级核验：

  RF-07｜当前账号能否创建【免费体验版】/ 是否已有免费套餐 / 是否必须购买付费套餐
  RF-08｜当前账号实际可选【地域】（控制台下拉框）+ 默认域名能力 + 默认 HTTPS 能力

🚩 若必须购买付费套餐 ⇒ 立即 RESOURCE CHANGE REQUIRED + BILLING CHANGE REQUIRED 并【停止】，
     先重新披露（产品 / 套餐 / 实际价格 / 计费周期 / 是否自动续费 / 销毁规则 / 实际需支付总额），
     未获【再次确认】不得购买。

🚩 在 RF-01–RF-12 全部完成 + CREATE READY GATE REVIEW 通过 + 项目负责人再次明确「确认创建」之前，
     不得创建任何云资源。
```

## 15.10 本轮边界（记账：**没有**做什么）

- 🔴 **未创建任何资源**（无 SCF 函数 / **未启用 Function URL** / **未生成任何实际 Endpoint** / 无 CloudBase 环境 / 无 PostgreSQL / 无 VPC / 无子网）；
- 🔴 **未写 Probe / 未部署 / 未建表 / 未执行 `S-01`–`S-07`**；**未执行 `SP-01a` / `SP-01b`**；
- 🔴 **未进入 Gate B / 未开始正式编码**；
- 🔴 **云资源费用 = 0**（**`SCF Trial Package` = `PURCHASED / 0 CNY`**）；
- 🔴 **未修改** `SP-01a_RESOURCE_DISCLOSURE_PACK.md`（历史产物一字未动）、五份 Worker 产出、`SP-03` / `SP-03R`、任何 canonical 契约；
- 🔴 **未修改 §14 的人工裁决历史**（本节只追加后续状态）；
- 🔴 **未 `CONFIRM` `TQ01`–`TQ05`**；**未创建任何 `Decision` / 未占用 `Decision ID` 空间**。

> 🚩 **§14.5 的 `RESOURCE CHANGE REQUIRED : NO` / `DECISION REQUIRED : NO` 系 §14 时点快照，已被本节更新** —— **§14 原文保留不改写**。

---

# 16. Account-Level Backfill Closure + CREATE READY GATE REVIEW（2026-09-20 后段）

> **本节性质**：**追加新状态** —— 🔴 **不改写 §1–§15 任何原文**；上文全部保留为**时间序列快照**。
> **本轮唯一实质产出**：`20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（**就地更新 + 新增 §L**，**不另起竞争版本**）。
> **对 `TQ` 的影响**：**无** —— **未修改 `TQ` 任何状态**，**不构成对 `TQ01`–`TQ05` 的任何 `CONFIRM`**。
> **本轮终点**：`CREATE READY GATE = PASS` ⇒ **`READY TO REQUEST CREATION CONFIRMATION`**（🔴 **≠ 创建授权**）。

## 16.1 触发与本轮范围

```
触发   = 项目负责人完成 RF-01–RF-12 账号级回填；并明确裁决探针期 Function URL 授权模式 = 开放；
         同时报告「CloudBase 环境已在 Gate 顺序之前被提前创建」这一真实事件。
范围   = ① RF 收口 ② 授权裁决登记并关闭 DECISION REQUIRED
         ③ 现实状态校正（CloudBase 已创建 / bundled PostgreSQL 存在 / R2 实际地域 = 上海）
         ④ 费用按账号级价格重算（RF-01 剩余额度 = 0 ⇒ 不再按免费额度抵扣）
         ⑤ 新增附属网络资源 R6-A / R6-B ⑥ Function URL 独立计费核对
         ⑦ 形成两张清单 ⑧ 执行 G-01–G-16 Gate Review
🔴 不做 = 不创建任何云资源；不启用 Function URL；不写 Probe；不部署；不建表；
         不执行 S-01–S-07；不进入 Gate B；不写正式业务代码。
```

## 16.2 `RF-01`–`RF-12` 收口结果

| RF | 最终状态 | 关键值 |
|---|---|---|
| `RF-01` | ✅ **COMPLETE** | 已购 SCF 0 元新客试用套餐；**当前剩余额度 = `0`**；🔴 **不推测"为什么是 0"**（不得解释为已耗尽 / 未发放 / 页面 bug / 套餐无效） |
| `RF-02` | ✅ **PASS** | `512 MB` 可选；超时 `1～900 s` ⇒ `30 s` 可配 |
| `RF-03` | ✅ **PASS** | 至少含 `24.11 / 22.21 / 20.19 / 18.15 / 16.13 / 14.18` |
| `RF-04` | ✅ **PASS** | 日志投递有「启用」开关、可保持不启用 |
| `RF-05` | ✅ **PRE-CREATE PASS** | Function URL 可用；Endpoint 实值 + CORS 实测 = `DEFERRED TO Phase 2` |
| `RF-06` | ✅ **PRE-CREATE PASS** | 授权类型 `CAM` / `开放`；**探针期裁决 = `开放`（`CONFIRMED`）** |
| `RF-07` | ✅ **PASS** | 免费体验版可用且**已实际创建**（0 元） |
| `RF-08` | ✅ **PASS** | **实际地域 = 上海**；静态托管尚未初始化 |
| `RF-09` | ✅ **PASS** | **0.56 元/小时**（B 类账号级实际报价） |
| `RF-10` | ✅ **PASS** | 本地 SSD / 最小 10 GB / **0.001 元/GB/小时（B 类推导值）** ⇒ 总配置 **0.57 元/小时** |
| `RF-11` | ✅ **PASS** | 高可用版；无其它强制付费项；按量销毁后停费 |
| `RF-12` | ✅ **COMPLETE / NO EXISTING RESOURCE** | 广州 VPC = `NONE`、子网 = `NONE` |

🔴 **仍为 12 格、未新增编号（无 `RF-13` / `RF-14`）**；**只记数值 / 选项 / 名称，未记录任何凭据**。

## 16.3 `RF-06` 探针期授权裁决 —— `DECISION REQUIRED` 关闭

| 项 | 内容 |
|---|---|
| 授权类型 | **`开放`** |
| 射程 | **仅 `SP-01a` disposable probe**（🔴 不得扩大为正式生产安全策略） |
| 允许 | `GET /health` / `GET /db-health` / 最小持久化 Probe 接口 |
| 禁止 | 正式用户认证 / 正式业务 API / 正式用户数据 / 暴露 Secret·数据库连接串·数据库密码·云凭据 / 作为正式生产匿名 API 策略 |
| 收尾 | **测试结束必须关闭 Function URL 或删除 disposable SCF 函数** |
| 仍属未确认 | 正式认证策略 / 用户登录 / CAM 策略 / CORS 白名单 / 防刷 / 限流 / WAF / API 网关治理 |
| 标志 | 🚩 **原 `DECISION REQUIRED`（安全配置层 1 项）= `CLOSED`** |

## 16.4 现实状态校正（🔴 已与现实不一致的旧表述已被覆盖）

| # | 原 PACK 表述 | 账号级现实 | 处置 |
|---|---|---|---|
| 1 | `RF-01` = 🟡 `PARTIAL`（剩余额度待回填） | **当前剩余额度 = `0`** | ⇒ `COMPLETE`；**费用模型改为保守口径**（不再按免费额度抵扣） |
| 2 | `R2` = 🔴 "待回填" / "待创建环境" | **环境已实际创建（上海 / 免费体验版 / 0 元）** | ⇒ `RF-07` / `RF-08` = `PASS`；🔴 **不得再把 `R2` 写成"待创建环境"**（`R2` 的动作改为"初始化静态托管 + 部署探针页"） |
| 3 | `R3` 磁盘 `≈0.001 元/GB/小时` = **"非官方保守示意值"（🔴）** | **账号级创建页可推导出同值** | 🚩 **证据等级升级为「B 类：本账号控制台实际报价推导值」**（🔴 **原 PATCH-02 的保守结论在新证据下失效，原文本保留不改写**） |
| 4 | `R3` "≈ 3.4 元 / 6h（基于 A 类公开值估算）" | **B 类：`0.57 元/h` ⇒ `3.42 元 / 6h`** | ⇒ **替换为上界 `3.42 元`** |
| 5 | `RF-05` / `RF-06` = 🟡 `PARTIAL PASS` | 能力层 + 裁决层均已完成 | ⇒ **`PRE-CREATE PASS`**（实值 + 实测仍合法 `DEFERRED`） |
| 6 | `RF-12` 未回填 | 广州无现成 VPC / 子网 | ⇒ **`COMPLETE / NO EXISTING RESOURCE`（不是 `FAIL`）** |
| 7 | 无 `R6` 概念 | **必须新增广州 VPC / 子网** | ⇒ **新增报备项 `R6-A` / `R6-B`**（§16.7） |

## 16.5 🚩 `PROCESS DEVIATION` = `YES`（CloudBase 提前创建事件登记）

```
PROCESS DEVIATION = YES
主体      = 项目负责人（人工操作）
动作      = 在 Account-Level Backfill 尚未完成 + 本 Gate Review 尚未执行
            + 最终「确认创建」尚未给出时，提前手工创建 CloudBase 免费体验环境
性质      = 人工操作偏离既定 Gate 顺序（🔴 非 AI 动作；本 Gate Review 未创建任何资源）
已发生影响 = R2 环境已存在；bundled PostgreSQL 已可用
未发生影响 = 未初始化静态托管 / 未写业务数据 / 未建业务表 / 未部署 Probe /
             未接入 SCF / 未产生人民币套餐费用
判定      = 不自动判项目失败
处置      = 保留环境 ｜ 冻结 bundled PostgreSQL ｜ 继续遵守后续 Gate
🔴 禁止    = 隐去该事件 ｜ 重写历史授权 ｜ 写成"当时已经得到资源创建授权"
```

**`R2` 已创建资源真实状态**：地域 **上海**｜套餐 **云开发免费体验版**｜人民币套餐价 **0 元**｜**不支持自动续费**｜套餐有效期 **2027-03-20**｜当前套餐使用 **已消耗 0 点 / 相关资源用量均为 0**（以控制台当前页面为准）。

## 16.6 CloudBase bundled PostgreSQL —— **存在但冻结不用**

- 创建环境时数据库类型选择 **PostgreSQL**，创建后控制台已出现 **PostgreSQL 管理 / `public` schema / SQL 编辑器 / 新建表入口 / PostgreSQL CU 用量 / PostgreSQL 容量使用量** ⇒ **已实际 `PROVISIONED` / `AVAILABLE`**（**不是"仅选择类型但资源尚未存在"**）。
- 当前：**CU 使用量 `0`｜数据库容量 `0 MB`｜表 `0`｜业务数据 `0`**。
- 定性 = **`UNUSED BUNDLED CAPABILITY`**：🔴 **不得作为 `R3`**｜**不得创建正式业务表 / migration / 业务 schema**｜**不得把 SCF 接到该 CloudBase PostgreSQL**。
- **组合甲保持不变**（`R3` 仍为独立 TencentDB for PostgreSQL）。🔴 **若未来拟改为 CloudBase PostgreSQL 替代 `R3` ⇒ 必须重新打开资源组合决策；本轮不得自行切换。**

## 16.7 新增附属网络资源 + Function URL 计费核对 + Runtime 版本

**（一）`R6-A` / `R6-B`**

| 资源 | 用途 | 官方价格 | 等级 |
|---|---|---|---|
| `R6-A` 广州 VPC × 1 | `R1` / `R3` 私网互通 | 🟢 **0 元** —— 官方《私有网络 购买指南》（最近更新 **2025-09-26**）：**"VPC 中免费使用的功能：基础功能 —— 私有网络、子网、路由表"** | 🟢 官方 |
| `R6-B` 广州子网 × 1 | 同上 | 🟢 **0 元**（同上） | 🟢 官方 |

🔴 **不得因"预计 0 元"就隐形创建** —— 已写入最终【RESOURCE CREATION CONFIRMATION】。
🔴 **当前架构不需要** `NAT 网关` / `固定公网出口 IP` / `EIP` / 额外公网带宽产品；**若实际创建时被强制要求 ⇒ `RESOURCE CHANGE REQUIRED`（涉付费另加 `BILLING CHANGE REQUIRED`）+【停止】+ 重新报备**。

**（二）Function URL 独立计费核对（使用官方 SCF 计费文档）**

```
来源 A：云函数《按量计费（后付费）》  cloud.tencent.com/document/product/583/12284
        （最近更新 2024-04-08）
        ⇒ Web 型函数账单 = 资源使用费用 ＋ Web 函数调用次数费用 ＋ 外网出流量费用
                           ＋ 预置并发闲置费用 ＋ Web 函数响应流量费用
        ⇒ 🔴 未列出任何 "Function URL" 独立计费项 / 固定网关费用
来源 B：《Web 函数计费说明》 cloud.tencent.com/document/product/583/66237
        （最近更新 2023-12-08）
        ⇒ 只区分「默认创建（基础型 API 网关）」与「自定义创建（标准型 API 网关）」

⇒ 结论 A（成立）：Function URL 不单独收取固定网关费用；无独立固定计费项。
   实际费用仍落在 SCF 自身计费项。
⇒ 结论 B（不成立）：未发现 Function URL 新增独立收费项
   ⇒ 不触发 RESOURCE CHANGE REQUIRED。

🟠 必须保留的不确定性：官方当前文档未明确「HTTP Entry = Function URL 时，
   Web 函数响应流量由哪一侧统计」⇒ 取最保守口径 = 响应流量落在函数侧（推断，PROPOSED），
   须由 Phase 2 实际账单（S-05）复核；🔴 不得写成"官方已明确"。
```

**（三）`R1` Runtime 具体版本 = `Node.js 24.11`**

- 依据：腾讯云 CloudBase 官方《运行环境支持》（**云函数运行环境信息唯一参考来源**）标注 **`24.11` = Active LTS（推荐）**；Node.js 官方 Release Schedule 显示 **`24.x` = Active LTS，EOL 2028-04-30**（`22.x` = Maintenance LTS，EOL 2027-04-30；`20.x` 已于 2026-04-30 EOL；`26.x` = Current，非 LTS）。
- 🔴 **不得仅凭模型记忆选择**；本结论**附官方来源**。
- 性质 = **实现级配置参数**（不改架构 / 不改产品行为 / 不显著改费用 / 不引入新平台依赖）⇒ **不构成独立人工决策项**，但**已在最终「确认创建」中披露**。
- 🔴 **射程**：**不代表** Node.js 24 成为项目最终生产运行时；**不代表**框架 / 运行时形态已裁决（仍留 Local Landing / 实现期）。

## 16.8 费用重算（🔴 按账号级价格 + `RF-01` 剩余额度 = 0）

```
R6-A / R6-B   0 元（官方免费）
R1            官方单价 × 用量假设（1500 次 / 512 MB / 0.3 s = 225 GBs；0.15 万次；15 MB）
              资源 225×0.00011108 = 0.024993
              调用 0.15×0.0133    = 0.001995
              外网出流量 0.015×0.80 = 0.012
              Web 响应流量 0.015×0.80 = 0.012（保守口径）
              ⇒ 合计 ≈ 0.051 ⇒ 取上界 ≈ 0.06 元
              🔴 不得因购买过 0 元套餐而写 0 元
R2            0 元（免费体验版 3000 点/月；当前已消耗 0 点）
R3            0.57 元/h × 6h = 3.42 元
              ────────────────────────────
预计最高总费用  ≈ 3.48 元（6h 上界 ≤ 3.5 元）
持续计费风险    R3 = YES（唯一实质风险，0.57 元/h ≈ 13.68 元/天，测试结束当天必须销毁）
自动续费        NO
```

🔴 **`S-05` 的最终费用依据仍是：控制台创建页实际报价 + 实际账单 / 资源包·额度页** —— 本表**不替代账单实测**。

## 16.9 `G-01`–`G-16` Gate Check 结论

| # | 检查项 | 结论 |
|---|---|---|
| `G-01` | 资源组合 `CONFIRMED` | ✅ 是（组合甲） |
| `G-02` | `R1` HTTP Entry `CONFIRMED` | ✅ 是（SCF Web 函数 + Function URL） |
| `G-03` | 探针期授权模式 `CONFIRMED` | ✅ 是（开放） |
| `G-04` | `RF-01`–`RF-12` 全部 PASS / COMPLETE / PRE-CREATE PASS / 合法 DEFERRED | ✅ 是（无 `FAIL`） |
| `G-05` | 未处理 `BLOCKER` | ✅ 无 |
| `G-06` | 未处理 `RESOURCE CHANGE REQUIRED` | ✅ 无（本轮新增 = 无；历史曾发生 YES → `RESOLVED`） |
| `G-07` | 未处理 `BILLING CHANGE REQUIRED` | ✅ 无 |
| `G-08` | 待创建资源已具体披露 | ✅ 是 |
| `G-09` | 可能收费资源均有账号级 / 可靠官方价格 | ✅ 是 |
| `G-10` | 预计测试费用已重新计算 | ✅ 是（≈3.48 元） |
| `G-11` | 持续计费项已明确 | ✅ 是（`R3`） |
| `G-12` | 销毁方式已明确 | ✅ 是 |
| `G-13` | CloudBase 提前创建已如实登记 | ✅ 是（`PROCESS DEVIATION` = `YES`） |
| `G-14` | bundled PostgreSQL 明确"存在但冻结不用" | ✅ 是 |
| `G-15` | 新增 VPC / 子网已进入最终报备 | ✅ 是 |
| `G-16` | 仍未写 Probe / 未部署 / 未创建其它资源 | ✅ 是（**例外如实登记**：`R2` 系项目负责人提前手工创建） |

```
⇒ CREATE READY GATE = PASS
```

## 16.10 标志位（本轮更新）

```
RESOURCE CHANGE REQUIRED : 本轮新增 NO（历史曾发生 YES → RESOLVED；🔴 禁写"从未发生"）
BILLING CHANGE REQUIRED  : NO（🟠 BILLING DISCLOSURE 继续维持：R3 按量 0.57 元/小时）
BLOCKER                  : NO
DECISION REQUIRED        : 0（原安全配置层 1 项已由人工裁决关闭）
SP-01a 资源层 DECISION REQUIRED : 0（不变）
PROCESS DEVIATION        : YES（🆕 新登记）
Current Gate             : READY TO REQUEST CREATION CONFIRMATION
                           （= CREATE READY GATE PASS；≠ READY TO AUTO-CREATE；≠ 创建授权）
TQ01–TQ05                : 未改变（五项仍全部 PROPOSED、仍留 Gate B）
```

## 16.11 下一人工动作（**唯一**）

```
阅读【SP-01a RESOURCE CREATION CONFIRMATION】（PACK §L.12），
然后由项目负责人明确：「确认创建」。

没有收到「确认创建」，不得进入 Phase 2；
在收到之前，不得创建 VPC / 子网 / R3 / R1 / 启用 Function URL /
不得初始化 CloudBase 静态托管 / 不得部署 / 不得写 Probe / 不得建表。
```

## 16.12 本轮边界（记账：**没有**做什么）

- 🔴 **本 Gate Review 未创建任何资源**（无 VPC / 无子网 / 无 SCF 函数 / **未启用 Function URL** / **无任何实际 Endpoint** / 无 PostgreSQL）；🚩 **例外如实登记：`R2` CloudBase 环境系项目负责人于本轮之前手工提前创建**；
- 🔴 **未写 Probe / 未写 HTML / 未部署 / 未建表 / 未执行 `S-01`–`S-07` / 未执行 `SP-01a`·`SP-01b`**；
- 🔴 **未进入 Gate B / 未开始正式编码**；
- 🔴 **本 Gate Review 未产生人民币资源费用**（`R2` 已存在的免费体验版 = 0 元）；
- 🔴 **未修改** `20_INTEGRATION/SP-01a_RESOURCE_DISCLOSURE_PACK.md`（**历史阶段产物一字未动**）、五份 Worker 产出（`01`–`05`）、`SP-03` / `SP-03R`、任何 canonical 契约；
- 🔴 **未修改 §1–§15 任何原文**（本节只追加）；
- 🔴 **未 `CONFIRM` `TQ01`–`TQ05`**；**未创建任何 `Decision` / 未占用 `Decision ID` 空间**。

**本轮修改的文件（4 个）**：`20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（就地更新 + 新增 §L）｜本文件（新增 §16）｜`20_INTEGRATION/S00-03_技术决策包.md`（§N.12 追加《`N.12++`》）｜`docs/CHANGELOG.md`（追加条目）。

---

# 17. Phase 2 创建授权登记 + 探针包交付（2026-09-20 后段·续）

> **本节性质**：**追加新状态** —— 🔴 **不改写 §1–§16 任何原文**。
> **对 `TQ` 的影响**：**无** —— **未修改 `TQ` 任何状态**。
> **本轮新增产出**：`30_SPIKES/sp01a_probe/`（**6 个文件**，全标 `DISPOSABLE / NON-PRODUCTION`）+ `SP-01a_CREATE_READY_PACK.md` **§M**。

## 17.1 人工授权登记（`CONFIRMED`）

```
项目负责人指令（人工原话）= 「A：确认创建」
⇒ CREATE AUTHORIZATION = GIVEN（2026-09-20）
⇒ 覆盖 = §L.12【SP-01a RESOURCE CREATION CONFIRMATION】全部内容
         （ALREADY CREATED：R2 环境；TO BE CREATED：R6-A / R6-B / R1 / R1 HTTP Entry /
           R2 静态托管初始化 / R3；R4 / R5 不创建）
⇒ 射程 = 仅 SP-01a disposable probe（≤6 小时生命周期）
⇒ Phase = Phase 2 STARTED
```

🔴 **本授权不是**：`SP-01a` 已完成 / `SP-01a` PASS / `SP-01` PASS ｜ 对 `TQ01`–`TQ05` 的 `CONFIRM` ｜ 对正式生产架构 / 平台 / 入口 / 安全策略的确认 ｜ "`开放` 可作正式匿名 API 策略" ｜ 对新增产品（网关 / WAF / 限流 / 中间件）的授权。

## 17.2 探针包交付清单

| 文件 | 职责 | 目标资源 |
|---|---|---|
| `30_SPIKES/sp01a_probe/README.md` | 边界 / 阶段 A–C 执行与观测口径 / 销毁 / **5 项已知不确定性** | — |
| `function/scf_bootstrap` | 启动文件（固定名 / 可执行权限 / LF / 绝对路径 `/var/lang/node24/bin/node` / `export PORT=9000`） | `R1` |
| `function/app.js` | 探针服务端（原生 `http` + `pg`）：`/health`、`/env-keys`、`/db-health`、`/persist`、`/persist-count`、`/conn?n=N` | `R1` |
| `function/package.json` | 依赖 `pg: ^8`（**未锁定次版本**） | `R1` |
| `db/probe_schema.sql` | **唯一 1 张表** `probe_persistence` | `R3` |
| `web/index.html` | disposable 探针页（**运行时填 Function URL**，无硬编码）+ 真实跨域调用 | `R2` 静态托管 |

**本机校验结果**：`app.js` = `node --check` **exit 0（解析通过，无报错）**；`package.json` = **合法 JSON**；校验临时文件**已删除**（`30_SPIKES/sp01a_probe/` 下现仅 6 个文件）。

🔴 **探针明确不含**：业务规则 / `D9` 十步逻辑 / **AI 调用** / `Attempt`·`Insight`·`Hypothesis`·`EvidenceRef`；**未写入 `src/`**。
🔴 **探针语义澄清**：§16.12 的"未写 Probe" **指 §16 时点**（Gate Review 轮）；**本节探针系收到「确认创建」后按 `§N.12` 执行骨架步骤 3 的既定 AI 职责交付**，**不属范围扩展**。两条记账**并存不矛盾**。
🔴 **落点报备**：`30_SPIKES/sp01a_probe/`（沿用既有"Spike / 探针产物按其自身目录、全标 DISPOSABLE"约定）；**如与预期不同，告知后可整体移动 / 重命名**。

## 17.3 责任划分（🔴 AI 不创建资源）

```
项目负责人：创建 R6-A → R6-B → R3 → R1 → 启用 Function URL → 初始化 R2 静态托管
            → 执行 probe_schema.sql → 上传 function/ 与 web/ → 填 DB 环境变量（不进代码 / 报告 / 聊天）
            → 回填运行观测值（Function URL 实值 / 静态托管默认域名 / 额度·账单数值；🔴 不含凭据）
            → 测试后销毁 + 账单页复核停费
AI（本机） ：汇总 S-01 / S-02 / S-03(探针级) / S-04 / S-05 / S-06 / S-07 判定
            （逐项 PASS / FAIL + 原始观测值 + 网络口径标注 + 资源来源标注）
            → 若 FAIL，按 §N.5 出回开映射【建议】（🔴 由项目负责人裁决）
🔴 AI = 不登录控制台 / 不持有凭据 / 不代为执行任何创建或变更（§N.10 第 1 / 2 / 6 条）
```

## 17.4 🔴 停止条件（创建过程中触发即停止 + 重新报备）

1. 被强制要求 **NAT 网关 / 固定公网出口 IP / EIP / 付费带宽 / 其它付费网络产品** ⇒ `RESOURCE CHANGE REQUIRED`（涉付费另加 `BILLING CHANGE REQUIRED`）；
2. `R3` **最低规格提高** 或新增**强制付费能力**（代理 / 审计 / 只读实例）；
3. `R1` **强制开启日志投递**，或 **`Node.js 24.11` 不可选**；
4. 访问静态托管 / Function URL **需自备域名 / 证书 / 备案**；
5. **最终创建页价格高于** §L.12 账号级报价（`R3 > 0.57 元/小时` 或出现新计费项）⇒ `BILLING CHANGE REQUIRED`；
6. 出现**任何** Function URL 独立计费项 ⇒ 与 §L.6 结论 A 冲突 ⇒ `RESOURCE CHANGE REQUIRED`。

🔴 **不得临时升级规格、不得先创建后补报**；**费用纪律（§N.9）不设金额下限**。

## 17.5 标志位与状态

```
CREATE AUTHORIZATION      : GIVEN（2026-09-20，人工原话「A：确认创建」）
Phase                     : Phase 2 STARTED（资源创建由项目负责人执行）
探针包                    : DELIVERED（30_SPIKES/sp01a_probe/；本机语法校验通过）
Current Gate              : PHASE 2 IN PROGRESS（创建 + 探针部署 + 执行 S-01–S-07）
RESOURCE CHANGE REQUIRED  : 本轮新增 NO（🔴 历史曾发生 YES → RESOLVED；禁写"从未发生"）
BILLING CHANGE REQUIRED   : NO（🟠 BILLING DISCLOSURE 维持：R3 按量 0.57 元/小时）
BLOCKER                   : NO ｜ DECISION REQUIRED : 0
PROCESS DEVIATION         : YES（R2 提前创建；已登记，处置不变）
SP-01a / SP-01            : 均【未完成】（🔴 不得声称 PASS）
TQ01–TQ05                 : 未改变（五项仍全部 PROPOSED、仍留 Gate B）
```

## 17.6 本轮边界（记账）

- 🔴 **未创建任何云资源**（无 VPC / 子网 / SCF 函数 / **未启用 Function URL** / 无 PostgreSQL）；**未登录控制台**；**未产生人民币费用**；
- 🔴 **未执行 `S-01`–`S-07`**；**未进入 Gate B**；**未写正式业务代码**；
- ✅ **新增文件仅限** `30_SPIKES/sp01a_probe/` 下 **6 个探针文件**（全标 `DISPOSABLE / NON-PRODUCTION`）；
- 🔴 **未修改** `SP-01a_RESOURCE_DISCLOSURE_PACK.md`、五份 Worker 产出（`01`–`05`）、`SP-03` / `SP-03R`、任何 canonical 契约；
- 🔴 **未 `CONFIRM` `TQ01`–`TQ05`**；**未创建任何 `Decision` / 未占用 `Decision ID`**。

**本节修改的文件（3 个）**：`20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（新增 §M）｜本文件（新增 §17）｜`docs/CHANGELOG.md`（追加条目）。**新增目录** = `30_SPIKES/sp01a_probe/`。

---

# 18. Phase 2 Resource Creation Progress Sync（2026-09-20 后段·续 2）

> **性质**：**只追加** —— 🔴 **未修改 §1–§17 任何原文**；🔴 **本轮未创建任何云资源**（`§N.10` 第 6 条：AI 不持有控制台登录态）；🔴 **未执行 `S-01`–`S-07`**；🔴 **未 `CONFIRM` `TQ01`–`TQ05`**；🔴 **未进入 Gate B**。
> **账本唯一权威位置** = `20_INTEGRATION/SP-01a_CREATE_READY_PACK.md` **§N.2【PHASE 2 RESOURCE EVENT LEDGER】**（本节不另起平行账本，只做同步报告）。

## 18.1 触发与本轮范围

| 项 | 内容 |
|---|---|
| **触发** | 本地文档最后一次落盘时（§M / §17），`R6-A` / `R6-B` 仍记为**未创建**；项目负责人此后**已在腾讯云控制台继续实际操作** ⇒ 本地记录与云端现实出现**时间差** |
| **本轮任务** | **REALITY SYNC（现实同步）** —— 把**已经实际发生**的控制台动作正式落盘；**不是重新规划、不是重做设计** |
| **模式** | 正式采用 **`ChatGPT` 轨 ＋ `LearnBuddy` 轨** 双轨推进（职责划分与硬规则登记于 PACK **§N.1**） |
| **推进原则** | **`ONE EVENT → SYNC → NEXT EVENT`**（不一次性预判整个 Phase 2；🔴 **不提前假定未来事件成功**） |

## 18.2 输入资产（已读；**真实文件优先于旧摘要**）

| 来源 | 读取结论 |
|---|---|
| `docs/00_PROJECT_RULES.md` / `docs/DECISIONS.md` / `docs/CHANGELOG.md` | 已读；🔴 本轮**未修改**（无新产品语义 Decision） |
| `.learnbuddy/memory/MEMORY.md` | 🔴 **已超注入上限被截断** ⇒ 本轮**就地合并去重、重写为钩子层**（细则下沉至 `DECISION_INDEX.md`；历史过程仍完整保留于 `docs/CHANGELOG.md` + `.learnbuddy/memory/2026-09-20.md`，**未丢失**） |
| `.learnbuddy/memory/DECISION_INDEX.md` | 已读（A 决策细则 / B 环境细节 / C 当前状态细则）；§C 追加 **Phase 2 现状钩子** |
| `.learnbuddy/memory/2026-09-20.md` | 已读（本日 8 个批次记录）；追加本轮日志 |
| `20_INTEGRATION/S00-03_技术决策包.md` | 已读（A–S 19 节；§N.12 / `N.12+` / `N.12++` / `N.12+++`）；追加 **`N.12++++`** |
| `20_INTEGRATION/SP-01a_CREATE_READY_PACK.md` | 已读（A–M）；**追加 §N** |
| `20_INTEGRATION/SP-01a_CREATE_READY_PATCH_REPORT.md` | 已读（§1–§17）；**追加 §18（本节）** |
| `30_SPIKES/sp01a_probe/` | ✅ **实盘复读 6 个文件，内容与 §M.4 交付清单一致**（详见 §18.8） |

🔴 **未重做**：`S03-A`–`E` / Integrator / `D-051` / `D-052` / `SP-03` / `SP-03R` / CREATE READY GATE REVIEW —— **新事实未触发任何回开条件**。

## 18.3 Reality Sync 结果（逐项对照）

| # | 资源 | 本地旧记录（BEFORE） | 云端现实（AFTER，🟠 项目负责人报告） | 变化性质 |
|---|---|---|---|---|
| 1 | **`R6-A`** 广州 VPC | `NOT CREATED`（§L.9 清单 2；`RF-12` = `NONE`） | **`CREATED`** —— `learn-sp01a-vpc` / `10.20.0.0/16` / 0 元 | 🟩 **现实领先于记录**（已报备项，非新依赖） |
| 2 | **`R6-B`** 广州子网 | `NOT CREATED`（同上） | **`CREATED`** —— `learn-sp01a-subnet-gz6` / `10.20.1.0/24` / 广州六区 / 0 元 | 🟩 同上（已报备项） |
| 3 | **`R3`** TencentDB for PostgreSQL | `待创建` | **`PRE-CREATE`** —— 创建页已配置、🔴 **未提交创建**、**未起计费** | 🟨 停滞（等 `R6-C`） |
| 4 | **`R6-C`** 广州安全组 | 🔴 **记录中不存在**（未报备） | **`AUTHORIZED` / `IN CONFIGURATION` / 🔴 未确认创建** | 🚩 **新依赖**（详见 §18.4） |
| 5 | **`R2`** CloudBase Environment | `CREATED`（提前创建，`PROCESS DEVIATION` = `YES`） | **不变**（上海 / 免费体验版 / 静态托管 `NOT INITIALIZED`） | ⬜ 无变化 |
| 6 | **`R1`** / Function URL / 静态托管 / Probe 部署 / `S-01`–`S-07` | 全部未开始 | **全部不变**（`NOT CREATED` / `NOT ENABLED` / `NOT INITIALIZED` / `NOT DEPLOYED` / `NOT EXECUTED`） | ⬜ 无变化 |

🔴 **事实等级**：上表云端事实**全部**为 **`ACCOUNT-LEVEL / PROJECT-OWNER REPORTED FACT`** ⇒ 🔴 **AI 未登录控制台、未独立复核**；🔴 **不得据"应该已经创建"推断 `CREATED`**。

**不写成 `CREATED` 的两项（🔴 硬约束）**：
1. `R6-C` —— 项目负责人**尚未报告**「安全组已创建」⇒ 当前**只能**写 `AUTHORIZED / IN CONFIGURATION / NOT YET CONFIRMED CREATED`；
2. `R3` —— **未购买 / 未创建** ⇒ 🔴 **不得写 `R3 = CREATED`**。

## 18.4 `R6-C` 新依赖的 `RESOURCE CHANGE REQUIRED` 处置

| 阶段 | 事实 | 标志位 |
|---|---|---|
| ① 触发 | `R3` 创建页 **`Security Group` 属必填项**；本账号**广州无现成安全组** ⇒ **`R3` = `PAUSED BEFORE CREATION`** | `RESOURCE CHANGE REQUIRED` = **🟩 曾 `YES`**（🔴 **不得隐去、不得写成"从未发生"**） |
| ② 授权 | 项目负责人**明确人工确认**：「确认新增并创建 `R6-C`｜广州安全组 `learn-sp01a-pg-sg`，费用 0 元，仅允许 `10.20.1.0/24 → TCP 5432`，用于 `SP-01a` PostgreSQL。」 | **`YES → RESOLVED`** |
| ③ 执行中 | 已进入「添加入站规则」页并填写 `10.20.1.0/24` / `TCP:5432` / 允许；🔴 **尚未报告创建成功** | `RESOLVED`（不变）；`BILLING CHANGE REQUIRED` = **`NO`**（0 元） |

**已批准规格（🔴 不得扩大）**：`Resource` = Security Group ｜ `Region` = 广州 ｜ `Name` = `learn-sp01a-pg-sg` ｜ `Cost` = 0 元 ｜ `Purpose` = `SP-01a` `R3` PostgreSQL 网络访问控制 ｜ `Inbound` = `10.20.1.0/24` → `TCP:5432` → `ALLOW`。
🔴 **禁止**：`0.0.0.0/0 → TCP 5432` ｜ 公网 PostgreSQL 暴露 ｜ 无必要开放 `22` / `80` / `443` / `3389` / `ALL` ｜ 解释为**正式生产安全策略**（射程仅 `SP-01a`）。

## 18.5 当前资源状态矩阵（Reality Sync 快照）

```
R2 CloudBase Environment  : CREATED（上海 / 免费体验版 / 0 元 / 不自动续费 / 有效期 2027-03-20）
   ├ bundled PostgreSQL   : AVAILABLE 但 UNUSED BUNDLED CAPABILITY（🔴 冻结不用：不作 R3 / 不建表 / 不接 SCF）
   └ Static Hosting       : NOT INITIALIZED
R6-A VPC                  : CREATED（learn-sp01a-vpc / 10.20.0.0/16 / 广州）
R6-B Subnet               : CREATED（learn-sp01a-subnet-gz6 / 10.20.1.0/24 / 广州六区）
R6-C Security Group       : AUTHORIZED / IN CONFIGURATION / NOT YET CONFIRMED CREATED
R3 PostgreSQL             : PRE-CREATE（等待 R6-C CREATED；🔴 未创建 / 未起计费）
R1 SCF                    : NOT CREATED
Function URL              : NOT ENABLED
R2 Static Hosting         : NOT INITIALIZED
Probe Local Package       : READY（NOT DEPLOYED）
Probe Deployment          : NOT STARTED
S-01 / S-02 / S-03(探针级) / S-04 / S-05 / S-06 / S-07 : NOT EXECUTED
```

**`R3` 创建页实见配置（`PRE-CREATE`；🔴 仅实现级参数）**：按量计费 ｜ 广州 ｜ `learn-sp01a-vpc` / `learn-sp01a-subnet-gz6` ｜ 高可用版 ｜ 主可用区 广州六区 / 备用区 广州七区 ｜ 本地 SSD / **10 GB** ｜ **1 vCPU / 2048 MB** ｜ **`0.57 元/小时`**（✅ 与 `RF-09` / `RF-10` 账号级 B 类报价一致）｜ UTF8 ｜ 异步 ｜ 页面大版本 **PostgreSQL 18**。
🔴 **射程**：**PostgreSQL 18 仅为本探针创建页的实现级参数** ⇒ **不得自动升级为"最终生产 PostgreSQL 版本决策"**。

## 18.6 标志位（本轮）

```
Current Phase             : PHASE 2 IN PROGRESS
CREATE AUTHORIZATION      : GIVEN（射程不变：仅 SP-01a disposable probe，≤6h）
Dual-Track Mode           : ACTIVE（ChatGPT 轨 + LearnBuddy 轨）
RESOURCE CHANGE REQUIRED  : RESOLVED（R6-C 新依赖曾 YES → 人工明确批准 ⇒ RESOLVED）
BILLING CHANGE REQUIRED   : NO
BLOCKER                   : NO
DECISION REQUIRED         : 0
PROCESS DEVIATION         : YES（R2 提前创建；不变）
TQ01–TQ05 Changed         : NO（五项仍全部 PROPOSED、仍留 Gate B）
SP-01a                    : IN PROGRESS / NOT PASS
SP-01                     : NOT COMPLETE
```

## 18.7 下一人工动作（**唯一**）

1. 完成 **`R6-C`｜`learn-sp01a-pg-sg`** 创建；
2. 入站规则**仅**配置 **`10.20.1.0/24 → TCP 5432 → ALLOW`**；
3. 向 `LearnBuddy` **明确报告**：**「安全组已创建」**。

🔴 **在该事实到达之前**：**不得把 `R6-C` 写成 `CREATED`**、**不得把 `R3` 写成 `CREATED`**、**不得开始 `R3` 最终创建**。
🔴 **收到后下一轮仅做**：同步 `R6-C = CREATED` ＋ `R3 = READY FOR FINAL CREATE`，然后**停止**（不连带创建 `R3`）。

## 18.8 本轮边界（记账：**没有**做什么）

- 🔴 **未创建任何云资源**：无 VPC / 子网 / **安全组** / SCF 函数 / **未启用 Function URL** / 无 PostgreSQL（`R6-A` / `R6-B` / `R6-C` 均为**项目负责人本人控制台操作**）；**AI 未登录控制台**；**未产生人民币费用**；
- ✅ **探针包实盘复核（未重新生成）**：`30_SPIKES/sp01a_probe/` 6 个文件**均在且与 §M.4 清单一致** ——
  - `README.md`（边界 / 阶段 A–C / 销毁 / 5 项已知不确定性）；
  - `function/scf_bootstrap`（`#!/bin/bash` + `export PORT=9000` + **绝对路径** `/var/lang/node24/bin/node app.js` + LF）；
  - `function/app.js`（含 `MODULE_LOADED_AT` / `listen_ms` / `PORT = process.env.PORT || process.env.SCF_FUNCTION_PORT || 9000` / `new URL(req.url, 'http://0.0.0.0')`）；
  - `function/package.json`（**合法 JSON**；`engines.node >= 24`；依赖 `pg: ^8`）；
  - `db/probe_schema.sql`（**唯一 1 张表** `probe_persistence`；明写"**绝不要建到 CloudBase bundled PostgreSQL 上**"）；
  - `web/index.html`（**运行时填 Function URL**；`fetch(..., { mode: 'cors' })`）；
  ⇒ 🔴 **未重新生成、未迁移到 `src/`、未加入任何业务规则 / `D9` 十步逻辑 / AI 调用 / `Attempt`·`Insight`·`Hypothesis`·`EvidenceRef`**；
- 🔴 **未执行** `S-01`–`S-07`；**未进入 Gate B**；**未写正式业务代码**；**未写任何 Probe 代码 / 未建表 / 未部署**；
- 🔴 **未修改**：`docs/DECISIONS.md`、`docs/01`–`09` canonical、`docs/architecture/01`–`05`（Worker 历史产物）、`docs/architecture/00_SHARED_TECHNICAL_CONTRACT.md`、`20_INTEGRATION/SP-01a_RESOURCE_DISCLOSURE_PACK.md`、`SP-03` / `SP-03R`；
- 🔴 **未 `CONFIRM` `TQ01`–`TQ05`**；**未创建任何 `Decision` / 未占用 `Decision ID`**；
- 🔴 **未做**：`S03-A`–`E` / Integrator / `D-051` / `D-052` / `SP-03` / `SP-03R` / CREATE READY GATE REVIEW。

**本节修改的文件（5 个）**：`20_INTEGRATION/SP-01a_CREATE_READY_PACK.md`（**新增 §N**：双轨模式登记 + **PHASE 2 RESOURCE EVENT LEDGER（`P2-E01`–`P2-E05`）** + 资源状态矩阵 + `R6-C` 批准规格 + `R3` PRE-CREATE 配置 + 标志位 + 下一动作 + 边界）｜本文件（**新增 §18**）｜`20_INTEGRATION/S00-03_技术决策包.md`（§N.12 追加 **`N.12++++`**）｜`docs/CHANGELOG.md`（顶部追加条目）｜`.learnbuddy/memory/`（`MEMORY.md` **合并去重重写** + `DECISION_INDEX.md` §C 现状钩子 + `2026-09-20.md` 日志）。🔴 **canonical 文档一个未动。**

