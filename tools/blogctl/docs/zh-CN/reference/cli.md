# CLI 命令

以 [main.go](../../../cmd/main.go)、[sync.go](../../../cmd/sync.go) 和 [site.go](../../../cmd/site.go) 为准。运行 `blogctl help` 查看当前安装版本。

| 命令 | 用途 |
| --- | --- |
| `blogctl doctor` | 检查依赖 |
| `blogctl site assemble --content-root PATH` | 装配内容 |
| `blogctl site build --content-root PATH` | 构建站点 |
| `blogctl sync --article SLUG --platforms devto --dry-run` | 不写入远端的编译预览 |
| `blogctl search submit` | 提交索引 |

`sync` 的 `--all` 与 `--article` 互斥；`--changed` 仅处理变更，`--draft` 使用草稿模式。远端操作必须先确认目标。

## 浏览器 Native Messaging 注册

安装位置确定后运行 `blogctl install` 注册浏览器 Native Messaging Host，运行 `blogctl uninstall` 解除注册。命令使用当前程序的绝对路径，不删除用户 `Data/` 或浏览器扩展；移动程序后需要重新注册。
