# BlogCTL

[English](README.md) · [中文文档](docs/zh-CN/index.md) · [当前版本](https://github.com/ThinkerQAQ/ThinkerQAQ.github.io/releases/latest)

BlogCTL 是博客的 Go 控制工具，负责内容装配、多平台文章分发、搜索引擎提交，以及本地 Bridge、浏览器扩展和工作台。

## 快速开始

在博客引擎仓库根目录运行：

```bash
go run ./tools/blogctl/cmd help
go run ./tools/blogctl/cmd doctor
```

Windows 用户可以使用 Release 安装包，保留可执行文件旁的 `Data/` 目录，并通过安装脚本注册 Native Messaging：

```powershell
.\Install-Windows.ps1 -Executable C:\software\Coding\blogctl\blogctl-windows-amd64.exe
```

随后在 Edge 或 Chrome 加载解压后的扩展，点击「打开工作台」。安装及连接排查见[快速开始](docs/zh-CN/quick-start.md)。

## 开发入口

先看仓库的 [AGENTS.md](../../AGENTS.md) 和 [BlogCTL Agent Contract](AGENTS.md)。项目命令统一通过 DevTool 发现：

```bash
devtool config validate
devtool project inspect --json
```

## 架构

```text
Markdown 原文
  └──► BlogCTL 编译器 / 图片处理 / 站点装配
                  ├──► Astro 构建
                  └──► 发布平台 Adapter
                              ▲
                浏览器扩展 ↔ Go Bridge ↔ 工作台
```

浏览器负责登录会话，Go Bridge 负责本地任务和发布适配。详见[概念与架构](docs/zh-CN/concepts/index.md)。

## 文档

[快速开始](docs/zh-CN/quick-start.md) · [完整操作教程](docs/zh-CN/tutorial/first-publish.md) · [How-to](docs/zh-CN/how-to/index.md) · [命令与配置参考](docs/zh-CN/reference/index.md)

[MIT License](../../LICENSE)
