# 新电脑上从零运行 BlogCTL

这篇教程从一个空目录开始，依次完成源码获取、依赖检查、启动博客、安装本地 Bridge、连接浏览器扩展、切换语言以及查看检测、创建、更新和任务流程。

**前半段无需发布平台账号或 API 密钥。** 三张英文截图来自独立数据目录中实际运行的 BlogCTL，展示真实的初始状态，没有伪造远端文章和任务。

## 1. 检查工具

安装 Git、Go 1.27.1+、Node.js 22+ 和 npm。打开终端执行：

```bash
git --version
go version
node --version
npm --version
```

只运行预编译 Release 时不需要安装 Go；开发或构建博客网站仍需要 Node/npm。

## 2. 从空目录下载项目

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
cd ThinkerQAQ.github.io
go run ./tools/blogctl/cmd help
go run ./tools/blogctl/cmd doctor
```

`doctor` 会检查 Node、npm、Git 及当前操作系统。出现缺失项时先补齐依赖。

**预览版本注意：** 英文界面功能正在 PR #185 中审查。功能合入并发布前，正式 Release `blogctl-v0.1.147` 尚无语言切换入口；提前体验需要切换到对应的功能分支。

## 3. 先把博客运行起来

```bash
npm ci
npm run dev:quick
```

打开 [http://localhost:4321](http://localhost:4321)，应看到示例文章。它读取仓库内的 `fixtures/`，无需私有内容仓库、云服务密钥，也不要求先安装 Java/Graphviz。

在第二个终端运行 `npm run check`；检查通过后可按 **Ctrl+C** 停止开发服务器。

## 4. 安装 Bridge 和浏览器扩展

**Windows — 从仓库根目录打开 PowerShell：**

```powershell
go build -o blogctl-windows-amd64.exe ./tools/blogctl/cmd
$exe = (Resolve-Path .\blogctl-windows-amd64.exe).Path
& .\tools\blogctl\Install-Windows.ps1 -Executable $exe
```

脚本会给 Chrome 和 Edge 注册 Native Messaging Host。Windows 下的运行时数据默认位于**可执行文件旁的 `Data/`**，升级时要保留。使用正式 Release 时，可直接运行解压包内的 `Install-Windows.ps1`。

**Linux/macOS — Release 安装包：** 在解压目录执行 `./Install-Linux.sh` 或 `./Install-macOS.command`。安装脚本要求对应架构的 `blogctl-linux-<architecture>` / `blogctl-darwin-<architecture>` 与脚本位于同一目录。

**浏览器操作：**

1. 打开 `edge://extensions` 或 `chrome://extensions`，启用**开发者模式**。
2. 点击「加载已解压的扩展程序」。源码安装时选择 `tools/blogctl/extension/`。
3. 打开 **BlogCTL** 扩展；Native Messaging 会按需启动本地 Bridge。
4. 确认扩展中的 Bridge 显示**已连接**，然后点击 **Open workspace（打开工作台）**。

工作台位于 `http://127.0.0.1:32145/console/`。Windows PowerShell 验证：

```powershell
Invoke-RestMethod http://127.0.0.1:32145/v1/health
```

Linux/macOS 可执行 `curl http://127.0.0.1:32145/v1/health`。返回 `"ok": true` 表示 HTTP 服务正常；**还必须检查浏览器扩展的连接指示器**，不能仅凭 HTTP 响应判断会话通道正常。

## 5. 切换中英文界面

右上角选择 **Auto / 中文 / EN**。Auto 跟随浏览器语言；手动选择后，Bridge 会将 `ui_locale` 保存至 `blogctl.toml`。这是界面语言，不会改变文章内容语言。

![真实运行的 BlogCTL 英文检测界面](../../assets/01-detect-en.webp)

*Detect 是第一个主导航。截图来自尚未登录任何发布平台的干净浏览器环境。*

## 6. 指定工作区并检测远端文章

打开 **Settings（设置）**，填写：

- **Engine Root**：`ThinkerQAQ.github.io/` 博客引擎仓库。
- **Content Root**：独立的 `blog-content/` 内容仓库。首次体验可以使用[公开模板](https://github.com/ThinkerQAQ/blog-content-template)。

进入 **Detect（检测）**，选择平台，查看 Draft / Published 内容。检测为只读操作。需要查询真实平台时，先在普通浏览器中登录该平台；**查询失败不能等同于远端文章不存在**。

## 7. 创建草稿或更新文章

在 **Create（创建）** 选择本地文章和平台，等待关联检测完成。只有明确确认远端没有对应文章，才能执行 **Create draft（创建草稿）**。

![真实运行的 BlogCTL 英文创建界面](../../assets/02-create-en.webp)

如果远端已存在目标，进入 **Update（更新）** 并明确选择文章 ID。更新失败时不能自动改为创建。

不希望向远端写入时，可在**内容仓库根目录**执行：

```bash
blogctl sync --article YOUR_SLUG --platforms devto --dry-run
```

替换 `YOUR_SLUG` 为真实文章 slug。实际创建、更新或发布需要有效浏览器会话和明确确认；**这次全新环境复现没有执行远端写入**。

## 8. 在 Tasks 查看执行结果

打开 **Tasks（任务）**，查看任务状态、平台结果、远端 ID 和编辑链接。

![真实运行的 BlogCTL 英文任务界面](../../assets/03-tasks-en.webp)

*刚安装的工作区没有已提交任务；执行真实发布操作后才会出现远端结果。*

发生超时时，先回到 Detect 和 Tasks 检查远端状态，再决定是否重试。更多说明见 [Bridge 排查](../how-to/debug-bridge.md)、[操作安全边界](../concepts/operations.md)及[完整发布流程](../guide/workflows.md)。

## 全新环境复现结果

2026-10-10 使用全新浅克隆验证，环境为 Linux/WSL、Go 1.27.1、Node 24.21.0、npm 11.19.0，并通过独立 `BLOGCTL_DATA_DIR` 隔离原有安装。`help`、`doctor`、Go 构建、`npm ci`、fixtures 装配、Astro 检查（**0 errors、0 warnings**）、Bridge 健康检查与英文界面截图均已通过。未连接真实发布平台账号，也未创建草稿。

这三张图来自**真实 Go Bridge 提供的工作台**，并非概念设计图或填充的假数据。
