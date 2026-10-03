# BlogCTL v0.1.104

BlogCTL 是 ThinkerQAQ 博客的本地发布控制面。本次 Release 只保留当前版本；发布完成后旧 GitHub Releases 会自动清理。

## 本版本更新

### 本地状态与生成目录
- 新增必选的 `Distribution` 配置，Windows 默认目录为 `C:\\Users\\zsk\\AppData\\Roaming\\BlogCTL\\distribution`。
- 新增必选的 `Publication Bindings` 配置，Windows 默认文件为 `C:\\Users\\zsk\\AppData\\Roaming\\BlogCTL\\publications.json`。
- BlogCTL 生成的发布资产、图片缓存和 Medium fallback 输出统一写入配置的 `Distribution` 目录。
- 文章与各平台的草稿 / 已发布文章关联统一写入 `publications.json`。
- Content Repository 不再承担 BlogCTL 的运行状态和生成产物存储。
- 删除旧 `.distribution`、`.blogctl/publications.json` 的迁移与 fallback 兼容逻辑；新目录结构作为唯一运行模型。

### Environment
- Distribution 与 Publication Bindings 均可在 Environment 中直接配置路径。
- 已经由配置字段展示的路径不再重复显示一遍。

## Release 内容

- Windows amd64 / arm64 可执行文件
- macOS amd64 / arm64 可执行文件
- Linux amd64 / arm64 可执行文件
- `blogctl-extension.zip`
- Windows / macOS / Linux Native Messaging 安装脚本
- Windows / macOS / Linux 卸载脚本
- `SHA256SUMS`

版本：`0.1.104`
