# BlogCTL v0.1.161

BlogCTL 是 ThinkerQAQ 博客的本地发布控制面。本次版本新增 **Social Publishing / Buffer**，同时保留既有文章分发能力。

## 本版本更新

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

版本：`0.1.161`
