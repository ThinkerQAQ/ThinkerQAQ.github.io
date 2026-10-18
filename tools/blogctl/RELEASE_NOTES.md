# BlogCTL v0.1.174

BlogCTL 是 ThinkerQAQ 博客的本地发布控制面。本次版本新增 **Social Publishing / Buffer**，同时保留既有文章分发能力。

## 本版本更新

### Medium 创建草稿时的编辑页导航修复

- 经真实 Edge 验证，新建的标签页可能暂时报告 tab.url=about:blank，Medium 编辑器地址仅存在 tab.pendingUrl。修复误判跳转错误导致图片尚未上传即终止的故障。
- 仅当页面实际加载为目标 /p/{draftId}/edit 时才执行图片上传；目标重定向、错误页面或超时仍安全拒绝。
- 增加加载中、待导航、已加载、实际重定向和无效草稿 ID 的回归测试。
- 不改变创建/更新语义：创建始终新建草稿；更新必须选择目标草稿。
- 完整 Medium 登录态图片上传及远端正文保存仍需真实操作验收。


### Medium Extension 图片任务鉴权修复（本地测试版）

- 依据真实 Edge Extension 请求复现，修复 Bridge 对只读队列 GET 错误要求 Origin 必须存在的故障；该 GET 始终需要有效 Bridge Token，若携带不可信 Origin 继续拒绝。
- 写入图片上传结果的 POST 继续同时要求有效 Token 与浏览器 Extension Origin，不放松写入鉴权。
- 增加 GET 无 Origin 及 POST 无 Origin、错误 Token、非扩展来源的安全回归测试。
- 不修改业务操作语义：创建每次均新建草稿；更新必须明确选择远端草稿。
- 保留已有数据和草稿；Medium 图片上传需要继续通过用户登录态的 Edge 验证。


### Medium 浏览器图片上传任务唤醒与诊断（本地测试版）

- 修复仅在创建/更新任务启动瞬间触发 Medium 上传轮询的问题；任务页轮询、重试及恢复也可重新唤醒浏览器上传。
- 为 Go 图片任务交接增加排队、领取和结果日志，Extension 增加上传轮询启动、领取、完成及异常日志，用于区别浏览器未启动、任务未领取与真实 Medium 上传失败。
- 添加浏览器工作线程挂起后的 45 秒租约恢复机制，避免图片任务被领取后永久搁置。
- 通过隔离的真实 Edge 实例验证 Extension -> Native Host -> Go Bridge 消息通信；并验证真实 Edge 的 MAIN world 注入逻辑正确拒绝非目标 Medium 编辑页，不访问登录凭证。
- 保留原有数据和草稿，线上 Medium 登录态图片上传尚需再次验收。


### Medium 浏览器原生图片上传（本地测试版）

- Medium 显式草稿同步将图片上传委托给真实 Edge 的已登录 Medium 草稿页面，而非 Go tls-client 网络请求；Go 继续负责编译正文、生成图片 Delta 和保存文章。
- 新增受 Bridge Token 与 Extension Origin 限制的单次图片任务交接，浏览器仅返回 Medium 原生 fileId 和图片尺寸，不向 Go 返回 Cookie 或 XSRF。
- Extension 自动寻找或打开指定草稿编辑页，并在页面同源环境进行 multipart 上传；后台轮询和浏览器 alarm 协同处理服务工作线程休眠。
- 限制目标草稿、文件格式、大小及响应字段；若浏览器图片上传失败则保留草稿并明确报错，不把图片替换为普通链接。
- 加入 Go 任务交接/授权/超时与 Extension 页面上传的模拟测试；真实 Medium 线上成功率仍需人工验收。


### Medium HAR 格式对齐（本地测试版）

- 根据 2026-10-17 浏览器成功上传 HAR，对齐 Edge Client Hints、图片上传缓存控制头等非敏感字段。
- Medium 返回 HTTP 504 HTML 错误页时不再输出整段页面内容。
- 四级标题采用加粗普通段落，防止错误地显示成代码块，并保留不同标题级别的视觉差异。
- 新增脱敏 HAR 协议说明和回归测试；目前尚未完成真实 Edge 图片上传及 Delta 回读验收。


### Medium 原生图片上传请求与浏览器抓包对齐

- 根据本机 Medium HAR 中成功的 HTTP 200 图片上传，将上传请求改为 /_/upload?source=6，并使用当前远端草稿 /p/{id}/edit 作为 Referer，设置 Accept: */*。
- 对齐上传请求的额外请求头；继续复用既有代理、登录会话和 multipart uploadedFile。
- 新建草稿需要先获取远端 ID 再上传；若图片准备失败，返回已有草稿 ID 供恢复，仍禁止把图片降级为文字超链接。
- 增加基于脱敏 HAR 协议形状的模拟请求测试，没有将 HAR、Cookie 或请求凭证加入仓库。
- 真实 Medium 图片上传仍需重新加载 Extension 后手动验收。


### Medium 格式保真修复（测试版）

- 对照实际 Medium 草稿渲染，修正代码块 PRE（type=8）及有序列表（type=10）映射，深层标题不再误显示为代码块。
- 图片原生上传失败时拒绝将图片块降级为文字链接；在首次创建远端草稿之前完成图片准备，避免网关故障生成新的空草稿。
- 保留原有浏览器会话、Compiler HTML 预览与数据；Medium 原生图片上传 HTTP 504 仍需独立验证，暂不自动修复已存在的远端草稿。


### Medium 代理链路与草稿 JSON 请求修复

- 代理开启时，Medium 浏览器指纹 HTTP Client 继续经 tlsclient.WithProxyUrl 访问配置的本机代理；新增离线 CONNECT 端到端测试证明实际经过代理。
- Medium new-story / deltas 等 JSON API 改用 Accept: application/json，修复非 JSON Accept 导致远端返回 HTTP 400 的问题。
- Medium 图片上传遭遇 HTTP 5xx/429 等网关异常不再转换 PNG 为 JPEG 重试；本次任务剩余图片直接复用已有 R2 兜底，避免对不可用上传接口逐张等待超时。
- 不修改代理系统设置、不将登录 Cookie 写入日志或仓库；保留已有草稿及数据。


### Medium 创建草稿后端链路恢复

- 修复恢复 Medium 界面后，后端仍返回 `medium is temporarily disabled` 的历史拦截。
- 将新版显式创建、更新与确认发布任务连接到已有的 Medium 浏览器会话、`new-story`、`deltas` 和发布方法；不另造适配器。
- 创建草稿默认不公开发布；已发布文章的危险覆盖仍然拒绝；今日头条继续禁用。
- 补充模拟 Medium 创建草稿与任务规范化测试。此次为本地试用版，尚未真实写入 Medium 验证。


### 恢复 Medium 分发平台

- 重新显示 Medium 平台入口，覆盖检测、创建、更新、任务与发布记录界面。
- 沿用原有的英文 Compiler、浏览器会话和 Medium Publisher，不改变已有的远程绑定及其他平台配置。
- 今日头条继续保持隐藏；本地安装版供手动验证 Medium 流程，不自动发布远端文章。


### Hashnode 编辑与文章链接修复

- 修复远端检测成功但 Hashnode 草稿显示「远端编辑链接暂不可用」的问题。
- 草稿通过 Hashnode 24 位 ID 打开编辑页；已发布文章支持对应的 `*.hashnode.dev` 链接。
- 保留 HTTPS 和可信域名校验，防止错误或恶意 URL 打开。


### Hashnode 远端检测与 Windows 图表验证

- 使用浏览器会话读取 Hashnode 草稿列表和已发布文章列表，按英文标题及已有远程绑定匹配，支持「检测」和「创建前防重复检查」。
- 远程查询分页尚未完整覆盖时主动报告不完整，不将未查到文章误判为可安全创建。
- 只有本地已绑定的 Hashnode 草稿才允许继续同步，防止覆盖手动创建的其他草稿。
- 增加 `tools/blogctl/scripts/verify-windows-mermaid.ps1`：实际启动 Windows Node、Mermaid CLI 和 Puppeteer 并校验 PNG，作为部署前专项端到端验证。

### Hashnode 英文草稿集成（浏览器会话）

- 从 BlogContent 英文文章编译 Markdown、Canonical URL 和 UTM 回链，可通过网页编辑器 REST 链路创建并更新 Hashnode 草稿。
- 正文及封面图片优先上传 Hashnode 自身存储，保留已有 R2 兜底处理。
- 创建空草稿后先保存远程 Draft ID，再写入内容；失败时复用该草稿。
- 这是仅创建草稿的试用能力，不会自动公开发布或修改已发布文章；使用已登录浏览器会话，不需要 Hashnode Pro API。
- Hashnode 网页内部接口不公开承诺兼容性，首次使用前请先在非正式文章验证。


### Social Publishing：AI 草稿 → 审核预览 → Buffer → 社交平台

- 在独立的「动态」页面查看、修改和预览 AI 生成的英文社交动态；通过本地 BlogCTL 接收结构化草稿，不绑定特定 AI 模型。
- 支持以 BlogContent 中的英文文章、系列及项目为来源，自动追加博客原文链接与 UTM 参数。
- 接入 Buffer 官方 GraphQL API，支持已连接的 LinkedIn、X（Twitter）和 Bluesky 渠道；可创建私有草稿，再明确确认公开发布。
- 只需点击「存入 Buffer 草稿」即可确认当前内容版本；「确认发布」始终是独立操作。
- 新增「设置 → 社交平台」，统一管理本地 Buffer API Key 与已连接渠道状态，API Key 不会回显到前端。
- 支持 `blogctl social` CLI 和本地 Bridge API，方便 ChatGPT 网页版通过 Desktop Commander / DV 调用本地 BlogCTL。

### Buffer 发布可靠性修复

- 修复发布时 `editPost` 未提交完整正文，导致 Buffer 返回 `Invalid post: Post must have either text or media` 的问题。
- 强制核对本地已审核内容与远端草稿，正式发布只更新现有 Buffer Post ID，不重复创建动态。
- 网络错误或远端状态不确定时保存错误信息并停止自动重试；新增「检查发布状态」及 `blogctl social reconcile`，只读取 Buffer 状态并安全恢复本地记录。
- 修复 Social API 成功响应协议不一致导致草稿列表为空的问题，并补齐独立社交配置入口。
- 继续复用 BlogCTL 现有网络代理配置、TOML 凭据管理与 Web Console。

## 安装及注意事项

- Windows 安装目录升级时保留 `Data/`、`blogctl.toml` 和既有社交草稿。
- Windows 与 WSL 混用时，应让 CLI 和 Web Console 指向同一份 BlogCTL Data 目录。
- 升级浏览器扩展文件后，请在 Edge/Chrome 扩展管理页重新加载扩展。
- 未连接的社交账号不能发布；正式公开发布仍需用户明确确认。

## Release 内容

- Windows amd64 / arm64 可执行文件
- macOS amd64 / arm64 可执行文件
- Linux amd64 / arm64 可执行文件
- `blogctl-extension.zip`
- Windows / macOS / Linux Native Messaging 安装及卸载脚本
- `SHA256SUMS`

版本：`0.1.174`
