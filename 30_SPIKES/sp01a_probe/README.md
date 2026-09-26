# SP-01a MINIMAL ENVIRONMENT PROBE

> **标记：`DISPOSABLE` / `NON-PRODUCTION`**
> **用途**：只测【环境】，不测【业务】。服务于 `SP-01a`（编码前 / Gate B 前）的 `S-01` / `S-02` / `S-03`(探针级) / `S-04` / `S-05` / `S-06` / `S-07`。
> 🔴 **不含**：任何业务规则、不含 `D9` 十步逻辑、**不含 AI 调用**、不含 `Attempt` / `Insight` / `Hypothesis` / `EvidenceRef`。
> 🔴 **不得写入 `src/`**、不得成为产品模块；**`SP-01a` 结束后随未选中资源一并删除**。
> **落点报备**：本目录 = `30_SPIKES/sp01a_probe/`（与既有 `30_SPIKES/retrieval/` 同级，沿用"Spike / 探针产物按其自身目录、全标 DISPOSABLE"的既有约定）。🔴 **若与预期落点不同，请告知，我可整体移动 / 重命名**。

---

## 0. 目录结构

```
30_SPIKES/sp01a_probe/
├── README.md                     本文件
├── function/                     → 上传为 R1（SCF Web 函数 · 广州 · 512 MB · 30 s · Node.js 24.11）
│   ├── scf_bootstrap             启动文件（固定名；需可执行权限；LF 结尾）
│   ├── app.js                    探针服务端（原生 http + pg）
│   └── package.json              依赖：pg
├── db/
│   └── probe_schema.sql          → 在 R3 执行（唯一一张表 probe_persistence）
└── web/
    └── index.html                → 上传到 R2（CloudBase 静态网站托管）
```

---

## 1. 阶段 A｜由项目负责人在控制台创建（AI 不持有登录态，`§N.10` 第 6 条）

按 `SP-01a_CREATE_READY_PACK.md` **§L.10** 的顺序执行。精确参数（以 `§L.12` 最终确认为准）：

| 步骤 | 资源 | 关键参数 |
|---|---|---|
| 1 | `R6-A` | 广州 **VPC × 1**（0 元） |
| 2 | `R6-B` | 广州 **子网 × 1**（0 元） |
| 3 | `R3` | 广州 · TencentDB for PostgreSQL · **按量** · **高可用版** · **1 vCPU / 2 GiB** · **10 GB 本地 SSD** · 绑定上述 VPC / 子网；**不开**审计 / 代理 / 只读实例 / 包年包月 |
| 4 | `R1` | 广州 · **SCF Web 函数** · **Node.js 24.11** · **512 MB** · **30 s** · **日志投递：不启用** · 绑定同一 VPC / 子网 |
| 5 | `R1` HTTP Entry | 启用 **Function URL** · **公网访问 = 启用** · **授权 = `开放`**（射程仅本探针） |
| 6 | `R2` | 在**已存在**的 CloudBase 环境中 **初始化静态网站托管** |

**🔴 立即停止并重新报备的条件**（`§L.8` / `§L.11`）：
- 被强制要求 **NAT 网关 / 固定公网出口 IP / EIP / 付费带宽 / 其它强制网络产品** ⇒ `RESOURCE CHANGE REQUIRED`（涉付费另加 `BILLING CHANGE REQUIRED`）⇒ **停止**；
- `R3` **最低规格提高** / 新增**强制付费能力**（代理 / 审计 / 只读实例）⇒ 同上；
- `R1` 创建页**强制开启日志投递**或 **`Node.js 24.11` 不可选** ⇒ `RESOURCE CHANGE REQUIRED` ⇒ **停止**；
- 需要**自备域名 / 证书 / 备案**才能访问静态托管或 Function URL ⇒ **停止**（默认访问方式应免自备域名）。
- 🔴 **不得自行接受任何变化、不得先创建后补报、不得临时升级规格。**

---

## 2. 阶段 B｜部署探针（由项目负责人执行）

### 2.1 R3：建表

在 R3 实例的 SQL 窗口 / 客户端执行 `db/probe_schema.sql`。
🔴 **只为 `R3` 执行**；🔴 **绝对不要建到 CloudBase bundled PostgreSQL 上**（该库 = `UNUSED BUNDLED CAPABILITY`，已冻结不用）。

### 2.2 R1：代码 + 环境变量

1. **打包**：把 `function/` **目录内的内容**（不是 `function` 本身）打成 zip，使 zip 根目录直接含 `scf_bootstrap` / `app.js` / `package.json`。
   ⚠️ **Windows 打包的两个坑**（必须检查）：
   - `scf_bootstrap` 必须 **LF 行尾**（不得 CRLF）；
   - 需要**可执行权限**（777 / 755）—— Windows 打包通常丢失该位。
   ⇒ **变通（推荐之一，二选一）**：
   - **(a) 保留 `scf_bootstrap`**：若上传后启动失败（常见表现为 405），在云函数控制台的**代码编辑器**里重新保存该文件 / 或在"高级配置 → 启动命令"里确认；
   - **(b) 不打包 `scf_bootstrap`**，改为在创建函数的 **高级配置 → 启动命令** 中直接填写：
     ```
     export PORT=9000
     /var/lang/node24/bin/node app.js
     ```
     （🟢 官方口径：上传代码中**未**检测到 `scf_bootstrap` 时，控制台配置才生效；若 zip 内含该文件，系统会以该文件为准。）
2. **依赖 `pg`**（二选一）：
   - 在创建 / 更新函数时开启 **在线依赖安装**（🟢 官方：`InstallDependency` **仅支持 Node.js 函数**）；
   - 或本地 `npm install pg` 后连同 `node_modules` 一起打包（体积更大）。
3. **环境变量**（🔴 **由项目负责人本人在控制台填写**）：
   ```
   PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD      ← R3 连接信息
   PG_SSL=true                                         ← 如 R3 要求 TLS
   PG_POOL_MAX=2                                       ← 可选
   PG_CONNECT_TIMEOUT_MS=5000                           ← 可选
   ```
   🔴 **任何一项都不得写入代码 / 仓库 / 本目录文件 / 报告 / 聊天 / 截图**（`§N.10` 第 4 条）；
   🔴 部署后可用 `GET /env-keys` 只核对**键名是否存在**（**不返回值**）。
4. **启用 Function URL**：公网访问 = 启用；授权 = `开放`（`SP-01a` disposable probe 射程）；记录 **实际 Endpoint 字符串**（仅回填到 `RF` 观测表，不含凭据）。

### 2.3 R2：静态探针页

在已存在的 CloudBase 环境中，把 `web/index.html`（可改名，如 `probe.html`）上传到静态网站托管根目录，记录**默认域名**。

---

## 3. 阶段 C｜执行探测（AI 侧汇总；观测值由现场回填）

| 观测 | 端点 / 动作 | 对应 | 判定口径（依 `§N.3`） |
|---|---|---|---|
| 可达性 | 浏览器反复打开 `GET /health`；连续 20 次 | `S-01` | DNS 解析 + HTTPS 握手 + 成功率 / 延迟分布 |
| 冷启动 | 静置至实例回收后首次请求；读 `/health` 的 `listen_ms` / `first_request_gap_ms` + 客户端墙钟 | `S-02` | 冷启动到可交互时间 |
| 单次执行上限 | 观察 `handler_ms` 相对宿主上限的占比 | `S-03`(**探针级**) | 是否触及 70% / 90% 参考线；🔴 **真实 ⑧⑨ LLM 耗时不在本范围** |
| DB 连接 | `GET /db-health` | `S-04` | 连通性 / TLS / 建连时间（`connect_and_query_ms`） |
| 连接能力 | `GET /conn?n=8`（可递增 16 / 32） | `S-06` | 是否连接耗尽；🔴 **不得用外部缓存补救** |
| 持久化 | `GET /persist?note=...` → 重启 / 重新部署 → `GET /persist-count` | `S-07` | 数据是否仍在 |
| CORS 真实行为 | 在 `web/index.html` 页面（CloudBase 域）调用 Function URL 并观察 | `RF-05` ➕ | 🔴 **只有实际跨域调用成功才算实测证据**；失败也如实记录，**禁止写"CORS 已实测通过"** |
| 免费额度 / 账单 | 控制台额度页 / 账单页 | `S-05` | 逐项注明资源来源（免费额度 / 免费试用 / 已二次确认的付费项） |

🔴 **报告纪律**：逐项 `PASS` / `FAIL` + **原始观测值** + **网络口径标注**；`PASS` **不得**写成对 `TQ02` / `TQ05` 的 `CONFIRM`；探针值**不得**进入产品层 / 不得写入 `AC`。

---

## 4. 销毁（测试结束当天执行）

```
1. 记录全部观测值
2. R3 销毁 / 退还 → 账单页确认停费        ← 唯一持续计费风险项，最先处理
3. 删除 R1（Function URL 随函数删除 / 或先在函数配置中关闭）
4. 删除静态托管中的探针文件（整环境是否保留由项目负责人另行决定）
5. 删除本目录（30_SPIKES/sp01a_probe/）
6. VPC / 子网：默认可保留，但须明确是否继续用于 SP-01b；不得自动删除 / 不得自动长期保留而不登记
7. 费用中心最终核验（账单 + 资源包 / 额度页）逐项注明资源来源
```

---

## 5. 本探针的已知不确定性（🔴 部署时需实盘确认）

1. **监听端口**：官方口径为 **9000**（`scf_bootstrap` 亦可经环境变量配置）⇒ 本包用 `export PORT=9000` + `app.js` 回退读 `PORT` / `SCF_FUNCTION_PORT` / 9000；若实盘报端口类错误，按控制台提示调整**仅此一处**。
2. **`/var/lang/node24/bin/node`**：取自 CloudBase 官方《运行环境支持》的 Node.js 24.11 绝对路径；若实盘路径不同 ⇒ 按控制台提示更正 `scf_bootstrap`。
3. **`scf_bootstrap` 可执行位**（Windows 打包易丢失）⇒ 见 §2.2 的 (a)/(b) 两种变通。
4. **`pg` 版本**：`package.json` 使用 `"pg": "^8"` 区间（**未锁定具体次版本，避免填写未经核实的版本号**）。
5. **响应流量计费归属**：官方文档未明确「HTTP Entry = Function URL 时 Web 函数响应流量由哪一侧统计」⇒ 探针费用按**最保守口径（落在函数侧）**计入 `R1` 上界；**实际归属以 Phase 2 账单为准**。
