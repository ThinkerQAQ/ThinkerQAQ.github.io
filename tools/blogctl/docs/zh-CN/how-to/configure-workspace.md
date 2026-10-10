# 配置 BlogCTL 工作区

目标是把当前博客引擎和内容仓库连接到本地 Bridge。

## 前提

已经安装并连接浏览器扩展与 Bridge，且本地存在引擎和内容仓库。

## 设置

1. 打开工作台「设置」。
2. 将 **Engine Root** 指向 `ThinkerQAQ.github.io/`。
3. 将 **Content Root** 指向相邻的 `blog-content/`。
4. 保存后关闭设置，再打开确认路径仍然存在。

这两个配置会保存在数据目录下唯一的 `blogctl.toml` 文件中。

需要自定义数据目录时，在启动 Bridge 前设置绝对路径的 `BLOGCTL_DATA_DIR`。迁移目录应自行备份并复制原有数据；工具不会自动搬迁。

## 验证与排查

在「检测」中检查本地文章和已登录平台。相对路径的 `BLOGCTL_DATA_DIR` 会被拒绝；Windows 下移动可执行文件也会改变默认 Data 目录。详见[配置参考](../reference/configuration.md)。
