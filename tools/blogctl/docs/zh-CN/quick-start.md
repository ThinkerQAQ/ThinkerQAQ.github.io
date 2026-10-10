# BlogCTL 快速开始

这份指南用于安装 BlogCTL、连接浏览器扩展，并打开本地工作台。

第一次安装建议阅读[从零上手教程](tutorial/first-run-on-new-machine.md)，可以对照真实英文界面截图操作。

## 1. 获取程序

从 [GitHub Releases](https://github.com/ThinkerQAQ/ThinkerQAQ.github.io/releases/latest) 下载匹配操作系统与架构的安装包。

如果从源码运行，进入博客引擎根目录：

```bash
go build -o blogctl ./tools/blogctl/cmd
./blogctl help
./blogctl doctor
```

Release 内的二进制不需要 Go 运行时。网站构建仍需要 Node/npm 和对应图表工具。

## 2. 安装 Bridge

Windows 安装目录建议将程序、扩展和安装脚本放在一起。执行：

```powershell
.\Install-Windows.ps1 -Executable C:\software\Coding\blogctl\blogctl-windows-amd64.exe
```

安装后的配置、日志和运行时数据默认在可执行文件旁的 `Data/`。升级时保留这个目录。

Linux/macOS 分别使用 Release 内的 `Install-Linux.sh` 和 `Install-macOS.command`。脚本的实际参数以发布包为准。

## 3. 加载扩展

在 Edge 的 `edge://extensions` 或 Chrome 的 `chrome://extensions`：

1. 打开开发者模式。
2. 选择「加载已解压的扩展程序」，指向解压后的 `extension`。
3. 打开 BlogCTL 扩展，确认 Bridge 已连接。
4. 点击「打开工作台」，进入 `http://127.0.0.1:32145/console/`。

更换扩展包后，应在扩展管理页面重新加载。

## 4. 验证

PowerShell 可直接检查本地服务：

```powershell
Invoke-RestMethod http://127.0.0.1:32145/v1/health
```

工作台中打开「检测」，检查已登录平台的远端文章；这一步不会创建草稿。

如果连接失败，按 [Bridge 排查指南](how-to/debug-bridge.md)检查。准备发布文章时，继续[第一次发布教程](tutorial/first-publish.md)。
