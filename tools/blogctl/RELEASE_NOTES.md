# BlogCTL v0.1.167

BlogCTL 是 ThinkerQAQ 博客的本地发布控制面。本次版本新增 **Social Publishing / Buffer**，同时保留既有文章分发能力。

## 本版本更新

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

版本：`0.1.167`
