# BlogCTL v0.1.102

BlogCTL 是 ThinkerQAQ 博客的本地发布控制面。本次 Release 只保留当前版本；发布完成后旧 GitHub Releases 会自动清理。

## 本版本更新

### Go Control Plane 收口
- Search / Indexing、AI Search、Compiler、Assets、R2、Publishing、Site Assembly 的后端领域逻辑统一收归 Go。
- 删除旧 Node Search、Node Compiler、syndication / distribute / publishing-config / Medium 后端兼容实现。
- `blogctl sync` 成为唯一发布入口；不再维护并行的 Node publishing backend。
- Content assembly 迁移到 Go，新增 `blogctl site assemble --content-root ...`。

### Search / Indexing
- IndexNow、Baidu、Google Search Console OAuth / Sitemap / URL Inspection 统一由 Go 实现。
- Google Request Indexing 继续保留真实浏览器 Search Console 自动化边界。
- 原先误称为 Bing 的 IndexNow 领域命名全部统一为 IndexNow。

### Compiler / Assets / Storage
- Article / Frontmatter、Markdown、Canonical / Footer / Tracking、Medium payload、content hash 全部由 Go Compiler 负责。
- 共享 R2 客户端、签名、上传统一由 Go 管理。
- Mermaid / PlantUML 只保留外部 renderer 边界；Java 仅在 PlantUML 渲染时作为可选依赖。

### 环境与配置
- 用户配置统一使用 `blogctl.toml`，Windows 默认位于 `%APPDATA%\BlogCTL\blogctl.toml`。
- 环境页恢复独立 Config 卡片，明确显示 `blogctl.toml` 文件名与当前完整路径。
- 删除冗余 Native Host 状态卡；保留 BlogCTL Extension，并校验 Extension 与 Bridge 版本一致性。
- Content Repository、Public Engine、Proxy、日志、Node.js、npm、Git、Java、共享图片资产和平台配置统一改为“默认只读 → ✎ 编辑 → 取消 / 保存”。
- Node.js / npm / Git 标记为必选并注明用途；Java 改名为 `Java (PlantUML)` 并标记为可选。

### CI / Runtime
- 增加长期 `Validate` required check。
- Analytics 查询改为读取 Blog AI Worker 的公开脱敏 API，不再直接读取 Cloudflare KV。
- AI Search regression 校验更新为接受直接相关的 CAS / Lock-Free Queue 内容，同时保留 Top-5 质量门。

## Release 内容

- Windows amd64 / arm64 可执行文件
- macOS amd64 / arm64 可执行文件
- Linux amd64 / arm64 可执行文件
- `blogctl-extension.zip`
- Windows / macOS / Linux Native Messaging 安装脚本
- Windows / macOS / Linux 卸载脚本
- `SHA256SUMS`

版本：`0.1.102`
