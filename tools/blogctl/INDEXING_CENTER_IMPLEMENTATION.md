# BlogCTL 索引中心：实施方案与实现约束

> Branch: `feat/blogctl-indexing-center`  
> Status: implementation branch / do not merge before real-device validation  
> Scope: BlogCTL Extension + Bridge + `tools/blogctl/search`

## 1. 目标

BlogCTL 新增独立 **「索引」** Tab，以 `https://thinkerqaq.github.io/sitemap-all.txt` 为统一 URL inventory，同时管理 Bing 与 Google。

```text
BlogCTL / 索引
├── URL Inventory
│   └── sitemap-all.txt
├── Bing
│   └── IndexNow：全量 URL
└── Google
    ├── Sitemap
    │   ├── sitemap-index.xml
    │   └── sitemap-all.txt
    ├── URL Inspection API
    └── Request Indexing
        └── 真实 Search Console 页面自动化
```

Google 的三个动作互不替代：

1. Sitemap：保持标准发现通道；
2. URL Inspection：读取 Google 当前索引状态；
3. Request Indexing：只针对 Inspection 后仍未收录且允许索引的 URL。

## 2. 安全边界

Google Request Indexing **不得**通过 HAR 复刻私有 `batchexecute` RPC。

禁止持久化或主动读取：

- Google Cookie value；
- `f.sid`；
- `at`；
- reCAPTCHA token；
- Google 私有 RPC payload/token。

Browser automation 只允许：

```text
Chrome 已登录的 Search Console 页面
→ 注入 content script
→ 操作页面 DOM
→ Google 页面自行处理 Cookie / CSRF / reCAPTCHA / private RPC
```

正式日志只能保存 URL、公开索引状态、HTTP status、时间和结构化错误。

## 3. URL Inventory

默认 URL 来源：

```text
https://thinkerqaq.github.io/sitemap-all.txt
```

构建时同时生成：

```text
https://thinkerqaq.github.io/sitemap-inventory.json
```

其中保存每个索引 URL 对应静态 HTML 的 SHA-256 内容指纹，用于判断 URL 内容是否变化。

读取后执行：

1. trim 空白；
2. 过滤空行；
3. URL parse；
4. 限制 origin 为 `https://thinkerqaq.github.io`；
5. 去掉 hash；
6. 去重；
7. 稳定排序；
8. 校验 `sitemap-inventory.json` 的 URL 和 SHA-256。

Bridge UI 状态只保存 inventory 摘要；Bing 上一次成功提交的完整 URL + fingerprint baseline 单独持久化到：

```text
<BlogCTL config dir>/bing-indexnow-snapshot.json
```

如果 fingerprint manifest 暂时不存在，增量模式采用保守策略：已有 URL 视为可能变化，避免漏提；manifest 部署后才进入精确内容增量。

刷新失败时不得覆盖上一份成功 inventory。

## 4. Bing

默认行为改为 **增量提交**，同时保留手动 **全量重新提交**。

增量 diff：

```text
current sitemap-all.txt
+ current sitemap-inventory.json
+ previous successful Bing snapshot
        ↓
added   = current URL - previous URL
changed = URL 相同但 SHA-256 不同
deleted = previous URL - current URL
        ↓
IndexNow(added + changed + deleted)
```

删除 URL 也提交给 IndexNow，使 Bing 重新抓取并观察当前 404/410 状态。

如果没有历史 snapshot：

```text
第一次增量提交 = 当前全部 URL
```

如果 fingerprint manifest 缺失：

```text
已有 URL 保守视为 changed
```

这样不会因无法判断内容变化而漏掉更新。

全量模式：

```text
当前全部 URL
+ 自上次 snapshot 后删除的 URL
→ Bing IndexNow
```

只有 IndexNow 操作成功后才更新 baseline；失败时保持旧 snapshot，使下一次可以重试同一批变化。

Bridge endpoint：

```http
POST /v1/search/index/bing/submit

{
  "mode": "incremental"
}
```

或：

```json
{
  "mode": "full"
}
```

UI 显示：

- 实际提交 URL 数；
- added；
- changed；
- deleted；
- unchanged；
- submission mode；
- HTTP status。


## 5. Google Sitemap

始终同时提交：

```text
https://thinkerqaq.github.io/sitemap-index.xml
https://thinkerqaq.github.io/sitemap-all.txt
```

Bridge endpoint：

```http
POST /v1/search/index/google/sitemaps
```

不得因为 URL Inspection / Request Indexing 已实现而删除这一步。

## 6. Google URL Inspection

复用：

```text
tools/blogctl/search/node/google.mjs
```

调用官方：

```http
POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect
```

每个结果保存：

- `verdict`
- `coverageState`
- `robotsTxtState`
- `indexingState`
- `lastCrawlTime`
- `pageFetchState`
- `userCanonical`
- `googleCanonical`
- `crawledAs`
- `referringUrls`
- `sitemap`

Bridge endpoint：

```http
POST /v1/search/index/google/inspect
```

Body：

```json
{
  "offset": 0,
  "limit": 2000
}
```

结果跨批次合并，保存 cumulative progress。约 2750 URL 的正常流程：

```text
Day 1: offset=0    limit=2000
Day 2: offset=2000 limit=750
```

## 7. Google Request Indexing

### 7.1 候选过滤

只有同时满足以下条件才进入队列：

```text
verdict != PASS
indexingState == INDEXING_ALLOWED
robotsTxtState != DISALLOWED
```

已收录 URL 不进入队列。

被 robots / meta / header 禁止索引的 URL 不自动请求，应先人工处理根因。

### 7.2 Browser flow

```text
queue item
→ 打开/复用 search.google.com/search-console
→ 确保当前 property = https://thinkerqaq.github.io/
→ 注入 google-indexing-content.js
→ 输入 URL
→ 等待 Inspection UI
├── already indexed → indexed
└── not indexed
    → 点击 Request indexing / 请求编入索引
    → 等待页面结果
    ├── success
    ├── quota blocked
    ├── 429
    ├── timeout
    └── UI changed
```

Search Console 页面内部的 Cookie、CSRF、reCAPTCHA 和 RPC 全部由 Google 页面自身处理。

### 7.3 双语 DOM

至少支持：

```text
URL is on Google
网址在 Google 上

URL is not on Google
网址不在 Google 上

Request indexing
请求编入索引

Indexing requested
已请求编入索引

Quota exceeded
已超出配额
```

selector 优先级：

1. role / aria / input semantics；
2. visible button text；
3. CSS fallback；
4. 不使用 HAR 中固定私有 token。

### 7.4 Fail-safe

立即停止/暂停条件：

- quota exhausted；
- 429；
- GSC 未登录；
- 连续 3 个 DOM/UI 失败。

队列持久化在 Bridge 本地 `search-index.json`，Extension 关闭后状态仍保留。

## 8. Request Queue 状态

```text
idle
running
paused
quota_blocked
completed
```

单 URL：

```text
queued
failed
quota_blocked
requested
indexed
```

默认本地 Request Indexing cooldown：

```text
7 days
```

这是 BlogCTL 的去重策略，不表示 Google 官方配额。

## 9. Bridge API

读取：

```http
GET /v1/search/index
```

Inventory：

```http
POST /v1/search/index/inventory/refresh
```

异步索引任务：

```http
POST /v1/search/index/jobs/bing
POST /v1/search/index/jobs/google/sitemaps
POST /v1/search/index/jobs/google/inspect
```

统一任务：

```http
GET    /v1/jobs
GET    /v1/jobs/:id
DELETE /v1/jobs
DELETE /v1/jobs/:id
POST   /v1/jobs/:id/retry
POST   /v1/jobs/:id/pause
POST   /v1/jobs/:id/resume
```

Google Request Indexing 队列：

```http
POST /v1/search/index/google/request-queue
POST /v1/search/index/google/request-queue/result
POST /v1/search/index/google/request-queue/start
POST /v1/search/index/google/request-queue/pause
POST /v1/search/index/google/request-queue/resume
```

旧的同步 Bing / Sitemap / Inspection endpoint 暂时保留兼容，但 Extension UI 创建任务时统一走异步 Job endpoint。

所有 write endpoint 必须经过 Bridge token / Extension-origin authorization。

## 10. Extension message contract

```text
blogctl.index.get
blogctl.index.inventory.refresh
blogctl.index.bing.submit
blogctl.index.google.sitemaps
blogctl.index.google.inspect
blogctl.index.google.probe
blogctl.index.google.open
blogctl.index.google.request.start
blogctl.index.google.request.pause
blogctl.index.google.request.resume
```

live progress：

```text
blogctl.index.progress
```

## 11. 文件结构

新增：

```text
tools/blogctl/bridge/jobs.go
tools/blogctl/bridge/jobs_test.go
tools/blogctl/bridge/search_jobs.go
tools/blogctl/bridge/search_index.go
tools/blogctl/bridge/search_index_test.go

tools/blogctl/search/node/bridge-cli.mjs
tools/blogctl/search/node/bridge-cli.test.mjs

tools/blogctl/extension/google-indexing-content.js
tools/blogctl/extension/popup/indexing.js
```

修改：

```text
tools/blogctl/bridge/server.go
tools/blogctl/extension/background.js
tools/blogctl/extension/manifest.json
tools/blogctl/extension/popup/popup.html
tools/blogctl/extension/popup/popup.css
tools/blogctl/extension/popup/popup.js
package.json
```

## 12. UI

Tab：

```text
检测 | 更新 | 发布 | 任务 | 索引 | 平台配置 | 环境与配置
```

索引页包括：

### URL 来源

- source；
- URL 总数；
- 最后刷新；
- 刷新按钮。

### Bing / IndexNow

- state；
- mode；
- 实际提交 count；
- added / changed / deleted / unchanged；
- HTTP；
- 上次提交；
- 默认「提交增量」；
- 手动「全量重新提交」。

### Google / Sitemap

- Service Account 是否配置；
- 两个 Sitemap 状态；
- 提交按钮。

### Google / URL Inspection

- 已检查；
- 已收录；
- 未收录/未知；
- never crawled；
- without sitemap；
- remaining；
- 下一批按钮。

### Google / Request Indexing

- GSC 登录/页面状态；
- candidate count；
- requested；
- indexed；
- queued；
- failed；
- queue position；
- start / pause / resume。

## 13. 凭据

Google 官方 API 继续由 Bridge 进程读取：

```text
GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON
```

Extension 永远不接收 Service Account JSON。

Google Web UI automation 不读取 Google Cookie。

## 13.1 环境与配置

保留现有环境页结构，在其中增加两个外部集成卡片。

### Bing / IndexNow

可配置：

- Endpoint；
- IndexNow Key；
- Key Location。

「检测配置」只执行安全探测：

```text
GET Key Location
→ HTTP 成功
→ 文件内容 == configured key
```

不会为了检测而提交测试 URL。

### Google Search Console API

配置完整 Service Account JSON。界面明确提示配置路径：

```text
Google Cloud
→ 启用 Search Console API
→ 创建 Service Account
→ 创建 JSON Key
→ 将 JSON 中 client_email
  添加到 Search Console Property
  Users and permissions
  Full user
→ 将完整 JSON 粘贴到 BlogCTL
```

「检测配置」执行：

```text
Service Account JWT
→ OAuth access token
→ GET Search Console property
→ 返回 permissionLevel
```

IndexNow Key 与 Google Service Account JSON 都不得返回给 Extension。

## 13.2 统一 Durable Task Queue

索引任务与原「任务」Tab 共用统一任务视图，持久化文件：

```text
<BlogCTL config dir>/jobs.json
```

任务类型包括：

```text
publishing
bing-indexnow
google-sitemaps
google-inspection
google-request-indexing
```

索引页负责创建和展示业务状态；任务页负责统一展示：

- queued / running / paused / completed / failed；
- progress；
- retry；
- pause / resume；
- detail / error。

发布任务也镜像进 durable task store，因此 Bridge 重启后任务历史和可安全重试的请求信息仍可恢复。

索引批量任务必须保持 **一个 Job + 多个内部 URL item**，不得把 2750 个 URL 展开成 2750 个任务。

### Bridge 重启

```text
Bing / Sitemap / Inspection 正在执行
→ 标记 failed
→ 可从任务页 retry

Google Request Indexing 正在执行
→ 标记 paused
→ 保留 currentIndex / URL item state
→ 浏览器恢复后手动 Resume
```

Request Indexing 的跨天执行仍以持久化 queue 为真源，Task Job 作为统一控制和展示层。

## 14. 测试

Node：

- remote inventory normalize；
- fingerprint manifest generation / validation；
- incremental added / changed / deleted diff；
- missing fingerprint conservative fallback；
- cross-origin reject；
- bridge inventory；
- credential-presence response 不泄漏 secret；
- existing Google / IndexNow tests。

Go：

- Request Queue candidate filter；
- requested state preservation；
- 7-day cooldown；
- inventory persistence；
- three-error pause；
- search state 不泄漏 Google credential。

Extension：

- `node --check` background；
- `node --check` Google content script；
- `node --check` indexing UI。

真机仍需要验证 Search Console DOM，因为 Google Web UI 可随时变化。

## 15. 真机验收顺序

不得第一次直接跑全站 Request Indexing。

### Case 1：已收录 URL

预期：

```text
inspect
→ already_indexed
→ 不点击 Request Indexing
```

### Case 2：未收录 URL

预期：

```text
inspect
→ not_indexed
→ Request indexing
→ requested_indexing
```

### Case 3：5 URL

验证：

- queue；
- pause；
- resume；
- Extension reopen 后状态仍在。

### Case 4：quota

预期：

```text
quota_blocked
→ 立即暂停
→ current URL 不丢失
```

### Case 5：GSC 未登录

预期：

```text
not_logged_in
→ pause
→ 不前移 currentIndex
```

### Case 6：UI selector 失效

连续 3 个：

```text
ui_changed
→ paused
```

## 15.1 Network Proxy 全局策略

`环境与配置 → Network Proxy` 是 BlogCTL 的统一外网策略。

启用后必须覆盖：

```text
Bridge Go HTTP
├── 平台 API
├── R2
└── Browser-profile transport

Search Node child runtime
├── sitemap inventory
├── Bing / IndexNow
├── Google OAuth
├── Google Sitemap
└── Google URL Inspection

Extension / Browser
├── 登录态探测
├── browser HTTP relay
├── Medium GraphQL
├── 平台浏览器发布页面
└── Google Search Console / Request Indexing
```

本机通信保持直连：

```text
localhost
127.0.0.1
::1
```

Search Node 通过 `HTTP_PROXY` / `HTTPS_PROXY` / `NODE_USE_ENV_PROXY=1` 使用同一代理；为防止静默直连，开启代理时要求 Node.js >= 22.21（或 >= 24）。

Extension 通过 Chrome `proxy` API 安装 PAC 策略。Chrome 的设置仍然是 regular profile 级别，但 PAC 只把 BlogCTL 平台域名和 Google Search Console 依赖域名送入代理；其它普通浏览域名显式返回 `DIRECT`，本机地址也保持直连。这样 BlogCTL 可以控制浏览器侧 GSC / 发布流程，而不会把整个浏览器的日常流量都切到 BlogCTL proxy。

如果 Browser proxy 无法被 Extension 控制，环境页必须显示「代理未覆盖全部组件」，并且远端 browser flow 不应静默直连。

## 15.2 Dependency 一键更新

环境页的依赖组件统一展示当前版本，并提供「更新」操作：

```text
Node.js
npm
Git
Java
```

Windows 更新策略：

- Node.js：通过 WinGet 安装/升级 `OpenJS.NodeJS.LTS`，用于把非兼容的 Node 23 等版本切换到当前 LTS；
- npm：执行 `npm install --global npm@latest`；
- Git：通过 WinGet 安装/升级 `Git.Git`；
- Java：先识别当前 `java.vendor` 和 major，只更新同一发行版/major；无法安全识别时停止，不擅自替换 JDK。

如果启用了 BlogCTL Network Proxy：

- npm 子进程继承统一 `HTTP_PROXY / HTTPS_PROXY`；
- WinGet 命令显式传入 `--proxy`；
- 不允许组件更新动作绕过 BlogCTL 网络策略。

Node.js 健康检查不再只判断 executable 是否存在。启用 Network Proxy 时，Node 版本不支持 fetch proxy 会显示「版本不兼容」，并提示直接点击更新。

## 16. Merge Gate

合入 `main` 前至少满足：

- [ ] PR validate 全绿；
- [ ] Inventory URL 数与线上 `sitemap-all.txt` 一致；
- [ ] Bing 环境检测通过；
- [ ] Bing 增量与全量任务进入统一任务页并成功；
- [ ] Google Search Console API 环境检测通过；
- [ ] Google 两个 Sitemap 都成功；
- [ ] URL Inspection 第一批真实运行成功；
- [ ] 中文 GSC 已收录页面通过；
- [ ] 中文 GSC 未收录页面通过；
- [ ] Request Indexing 单 URL 成功；
- [ ] quota/429/not-logged-in fail-safe 验证；
- [ ] Bridge 重启后 Request Indexing 任务恢复为 paused 且进度不丢；
- [ ] 发布任务与索引任务在统一 Task Tab 中无重复显示；
- [ ] 未读取/保存 Google Cookie value；
- [ ] 用户确认后再 merge。

## 17. 不做的事情

本实现明确不做：

- 使用 Google Indexing API 给普通博客文章批量提交；
- 复刻 HAR 中 `Fj3Owf` / `batchexecute`；
- 持久化 Google 登录 Cookie；
- 删除 Sitemap 流程；
- 自动无限重试 Request Indexing；
- 在未经真机验证前合并到 `main`。
