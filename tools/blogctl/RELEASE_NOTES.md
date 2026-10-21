# BlogCTL v0.1.176

本版修复 **Medium「远端文章清单」显示“不支持的平台”** 的问题，沿用已有的 Medium 查询与登录态能力，不引入新的文章操作接口。

## 修复内容

- 将 `medium` 纳入 Extension 和 Bridge 的远端文章清单支持平台，两端能力保持一致。
- 清单复用 Medium 已验证的 `listPosts`（GraphQL），读取当前账号的**草稿**和**已发布文章**，保留标题、ID、状态和正确的编辑/查看链接。
- 清单仅作账号级别的只读查询，文章关联与变更仍在「更新」中显式执行；不创建草稿、不改动现有文章、不自动发布。
- 需要有效 Medium 登录态；若会话失效，显示错误而不是伪装成空列表。
- 添加真实 Bridge 路由的双状态模拟回归、Session/Extension 认证测试，以及 Extension 平台入口契约测试。

## 兼容性

- 保留 v0.1.175 的 Medium 创建、更新、图片插入与格式保真功能，以及其他平台的发布能力。
- Windows 更新时保留 `Data/`、平台凭据和历史任务；CLI、Bridge、Native Host、浏览器扩展统一为 `0.1.176`。
- Edge/Chrome 解压扩展更新文件后需要重新加载扩展，扩展 ID 不变。

## Release 构件

- Windows amd64 / arm64、macOS amd64 / arm64、Linux amd64 / arm64
- `blogctl-extension.zip`、`SHA256SUMS`

版本：`0.1.176`
