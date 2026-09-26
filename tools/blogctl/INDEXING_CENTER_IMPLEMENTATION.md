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

唯一默认来源：

```text
https://thinkerqaq.github.io/sitemap-all.txt
```

读取后执行：

1. trim 空白；
2. 过滤空行；
3. URL parse；
4. 限制 origin 为 `https://thinkerqaq.github.io`；
5. 去掉 hash；
6. 去重；
7. 稳定排序。

Bridge 持久化：

```json
{
  "source": "https://thinkerqaq.github.io/sitemap-all.txt",
  "origin": "https://thinkerqaq.github.io",
  "fetchedAt": "...",
  "total": 2750,
  "urls": []
}
```

刷新失败时不得覆盖上一份成功 inventory。

## 4. Bing

复用已有 IndexNow 实现：

```text
inventory.urls
→ prepareIndexNowPayload
→ https://www.bing.com/indexnow
→ 200 / 202
```

当前 IndexNow 单请求上限允许覆盖当前约 2750 URL；实现仍保留 batch 能力。

Bridge endpoint：

```http
POST /v1/search/index/bing/submit
```

持久化：

- state；
- startedAt；
- finishedAt；
- URL count；
- HTTP status；
- error。

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

Bing：

```http
POST /v1/search/index/bing/submit
```

Google：

```http
POST /v1/search/index/google/sitemaps
POST /v1/search/index/google/inspect
POST /v1/search/index/google/request-queue
POST /v1/search/index/google/request-queue/result
POST /v1/search/index/google/request-queue/start
POST /v1/search/index/google/request-queue/pause
POST /v1/search/index/google/request-queue/resume
```

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
- count；
- HTTP；
- 上次提交；
- 全量提交按钮。

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

## 14. 测试

Node：

- remote inventory normalize；
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

## 16. Merge Gate

合入 `main` 前至少满足：

- [ ] PR validate 全绿；
- [ ] Inventory URL 数与线上 `sitemap-all.txt` 一致；
- [ ] Bing 全量提交成功；
- [ ] Google 两个 Sitemap 都成功；
- [ ] URL Inspection 第一批真实运行成功；
- [ ] 中文 GSC 已收录页面通过；
- [ ] 中文 GSC 未收录页面通过；
- [ ] Request Indexing 单 URL 成功；
- [ ] quota/429/not-logged-in fail-safe 验证；
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
