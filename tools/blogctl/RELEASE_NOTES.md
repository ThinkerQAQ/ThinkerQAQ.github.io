# BlogCTL v0.1.105

BlogCTL 是 ThinkerQAQ 博客的本地发布控制面。本次 Release 只保留当前版本；发布完成后旧 GitHub Releases 会自动清理。

## 本版本更新

### Google Search Console Request Indexing
- 修复 GSC SPA 中旧配额提示残留导致的误判：只有当前操作新出现的 quota / rate-limit 反馈才会阻断队列。
- 当当前 URL Inspection 页面处于 `quota_blocked`、`rate_limited` 或 `failed` 状态时，不再错误判定为“GSC 已就绪”。
- 修复 Request Indexing queue 与 Durable Task 状态分裂：Bridge 重启后，如果 queue 仍存在但 task 丢失，会自动重建任务。
- 修复“Indexing 页面显示可继续，但 Tasks 列表为空”的状态不一致。
- 保留真正的 Google 配额阻断逻辑；确认是真配额时仍会暂停队列，并允许后续继续。

### v0.1.104 内容保留
- BlogCTL 本地状态统一存放在用户配置目录。
- `publications.json` 与 `distribution` 使用新的集中式路径模型。
- 不再兼容旧 `.distribution` / `.blogctl/publications.json` fallback。

## Release 内容

- Windows amd64 / arm64 可执行文件
- macOS amd64 / arm64 可执行文件
- Linux amd64 / arm64 可执行文件
- `blogctl-extension.zip`
- Windows / macOS / Linux Native Messaging 安装脚本
- Windows / macOS / Linux 卸载脚本
- `SHA256SUMS`

版本：`0.1.105`
