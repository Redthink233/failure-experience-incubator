# SP-06｜MANUAL OBSERVATION CHECKLIST（需要真人手势的项目）

> ```
> 性质        : DISPOSABLE / NON-PRODUCTION
> 归属        : S6-01 / S6-02 / S6-03 / S6-04 / S6-05 / S6-06 / S6-07（浏览器侧）/ S6-08 / S6-09 / S6-10 / S6-12（浏览器侧）
> 状态        : MANUAL OBSERVATION REQUIRED —— 本轮**未执行**，等待项目负责人操作后回报
> ```
> 🔴 这些项目**无法由自动化完成**：File System Access API 的目录选择必须由**真实用户手势**触发，
> 并会弹出**系统原生目录选择框**与**浏览器权限对话框**。🔴 **不得伪造 PASS。**

---

## 0. 启动探针（一次性，约 30 秒）

在本机（Windows）打开 PowerShell，执行：

```powershell
cd "C:\Users\Red16\Desktop\失败经验孵化助手\30_SPIKES\local_first\SP-06"
& "C:\Users\Red16\.workbuddy\binaries\node\versions\22.22.2\node.exe" probe\server.mjs 8787
```

看到 `probe_url` 输出后，用 **Chrome** 或 **Edge** 打开：

```
http://127.0.0.1:8787/
```

> 🔴 `http://127.0.0.1` 属于 **secure context**，与 HTTPS 在 File System Access API 上具有同等资格；
> ⚠️ **但它不等于 Vercel 域名下的行为**：`S6-01`（Vercel HTTPS 域名）**仍需在真实 Vercel 部署上复测**。

---

## 1. 测试用目录

使用探针自带夹具：

```
C:\Users\Red16\Desktop\失败经验孵化助手\30_SPIKES\local_first\SP-06\fixture\ws20
```

> 🔴 该目录是 **TEST FIXTURE / NOT PRODUCT DATA**；测完可整目录删除（属本轮 disposable 产物）。

---

## 2. 逐项操作（请按顺序，边做边记录）

| # | 对应测试 | 操作 | 请记录 |
|---|---|---|---|
| 1 | **S6-04** | 点 `Select Workspace` → 选择 `...\fixture\ws20` → 授权框选「允许」 | 是否弹出**系统原生**目录选择框？授权框文案？选完页面是否显示目录名 `ws20`？ |
| 2 | **S6-04** | 点 `Read workspace.json` | 是否读到 `workspace_id = WS-SP06-WS20`？是否报错？ |
| 3 | **S6-04** | 点 `List attempts` | `count` 是否 = 20？ |
| 4 | **S6-05** | 点 `Create attempt file` | 打开**资源管理器**看 `fixture\ws20\attempts\`，是否真的多出一个 `ATT-PROBE-<时间戳>.md`？ |
| 5 | **S6-06** | 点 `Modify file` | 用**外部编辑器**（如记事本）打开 `ATT-0001.md`，确认磁盘内容确实变化（含 `已被 SP-06 探针修改` 字样）？ |
| 6 | **S6-07** | 点 `Rename for ref test` | 是否报 `move() 不可用`？若成功，资源管理器里 `ATT-0002.md` 是否变成 `zz-renamed-ATT-0002.md`？ |
| 7 | **S6-08** | 保持目录已选 → **按 F5 刷新页面** → 点 `Permission state` | 返回 `granted` / `prompt` / `denied`？刷新后是否需要**重新选择目录**（即 handle 是否丢失）？ |
| 8 | **S6-08** | 刷新后点 `Read workspace.json`（**不再点 Select Workspace**） | 能否直接读？（预期：**不能**，因为 handle 未跨刷新持久化 —— 请如实记录实际行为） |
| 9 | **S6-09** | **完全关闭浏览器**（确认后台进程也退出）→ 重新打开 → 打开探针页 → 点 `Read workspace.json` | 是否需要重新选择目录？ |
| 10 | **S6-10** | 浏览器地址栏左侧站点设置 → 把「文件编辑」权限改成**阻止 / 重置** → 回页面点 `Read workspace.json` | 页面是否**崩溃**？是否给出可理解的提示？是否有重新授权的路径（`Request permission again` 是否可用）？ |
| 11 | **S6-12** | 建立目录后，在资源管理器里把 `ws20` 目录**改名**（如 `ws20-moved`）→ 回页面点 `List attempts` | 是否崩溃？是否明确提示"工作区不可访问"？能否重新选择？ |
| 12 | **S6-11** | 在资源管理器里打开 `...\fixture\ws_bad\attempts\`，确认存在两个坏文件 | 本轮已在 Node 侧验证（见报告 §G）；此处只需确认文件存在即可 |
| 13 | **S6-02 / S6-03** | 用 Chrome 做一遍 1–7；再用 Edge 做一遍 1–7 | 两个浏览器的差异（若全部一致请写"无差异"） |
| 14 | **S6-18（补充）** | 点 `Direct → provider WITH CORS` / `Direct → provider WITHOUT CORS` / `Via Thin Proxy (provider_id)` / `Proxy: arbitrary target attempts` | 与自动化结果是否一致？（自动化已记录；人工复核一次即可） |
| 15 | **S6-30 / D-056** | 点 `Store marker in sessionStorage` → F5 刷新 → 点 `Read after reload` → 点 `Durable leak scan` | `present_after_reload` 是否 `true`？`durable_leak_found` 是否 `false`？ |
| 16 | **S6-30** | **完全关闭浏览器** → 重新打开探针页 → 点 `Read (masked)` | 是否 `present: false`（凭据已随会话结束清除）？ |

---

## 3. 回报格式

把下面这段填好后发回即可（🔴 **不要把任何真实 API Key 写进来**；🔴 **不要截图含 Key 的画面**）：

```json
{
  "operator": "<你的称呼>",
  "observed_at": "<ISO 时间，如 2026-09-24T16:30+08:00>",
  "env": { "os": "Windows ...", "chrome_version": "...", "edge_version": "..." },
  "S6-04": { "picker_shown": true, "ws_name": "ws20", "read_ok": true, "list_count": 20, "notes": "" },
  "S6-05": { "file_appeared_on_disk": true, "filename": "", "notes": "" },
  "S6-06": { "disk_content_changed": true, "notes": "" },
  "S6-07": { "rename_supported": true, "renamed": "", "notes": "" },
  "S6-08": { "permission_after_reload": "", "handle_survives_reload": false, "need_reselect": true, "notes": "" },
  "S6-09": { "need_reselect_after_browser_restart": true, "notes": "" },
  "S6-10": { "crashed": false, "message_shown": "", "recoverable": true, "notes": "" },
  "S6-12": { "crashed": false, "message_shown": "", "recoverable": true, "notes": "" },
  "S6-02": { "chrome_version": "", "result": "", "notes": "" },
  "S6-03": { "edge_version": "", "result": "", "notes": "" },
  "S6-30": { "present_after_reload": true, "durable_leak_found": false, "present_after_browser_restart": false, "notes": "" }
}
```

---

## 4. Vercel 相关（S6-01 / S6-19 / S6-21）—— `MANUAL AUTH REQUIRED`

```
本机现状（AI 已核实）：
  · Vercel CLI 未安装（Get-Command vercel → 无）
  · 无 Vercel 登录态（%USERPROFILE%\.vercel 不存在）
⇒ 本轮**未创建任何 Vercel 资源**（BILLING = 0 元）

最短路径（由项目负责人本人执行，🔴 AI 不持有登录态）：
  1. 项目负责人先在 https://vercel.com 用**免费计划**注册 / 登录（🔴 不得升级付费计划）
  2. 若愿意在本地执行：
       npm i -g vercel        # 或使用 npx vercel
       vercel login           # 浏览器授权，🔴 不要把 token 交给 AI、不要写入任何文件
       cd "...\30_SPIKES\local_first\SP-06\probe"
       vercel deploy          # 先部署 probe 目录做 HTTPS 可行性验证（免费 Preview）
  3. 部署完成后，把 URL 发回；由 AI 记录：
       Project Name / Deployment URL / Deployment ID / 是否持续计费
  4. 在**该 HTTPS 域名**上重做本清单第 1–7 项（即 S6-01 的真实条件）
  5. 测完由项目负责人决定是否删除该 Vercel Project
       🔴 在项目未给出"disposable spike 资源可自动清理"的明确规则前，**AI 不得自行删除外部资源**
```

> 🔴 **费用边界**：只允许 **0 元 / free-tier / disposable probe**。若出现"需要付费计划 / 购买额度 / 绑定付费 add-on / 预计产生实际费用" ⇒ **立即停止并报 `BILLING AUTH REQUIRED`**，🔴 **不得自动付费**。
