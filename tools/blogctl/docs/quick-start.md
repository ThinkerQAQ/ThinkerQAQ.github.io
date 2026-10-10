# Quick Start

## Windows 安装

BlogCTL 的 Bridge 可执行文件、Extension 文件夹和 Data 目录放在同一根目录。Data 存储 `blogctl.toml`、`jobs.json`、`publications.json` 等持久化数据：

```text
C:\software\Coding\blogctl\
├── blogctl-windows-amd64.exe
├── extension\
└── Data\
    ├── blogctl.toml
    ├── publications.json
    └── jobs.json
```

升级时保留 Data，使用 Windows PowerShell 重新注册 Native Messaging Host：

```powershell
.\Install-Windows.ps1 -Executable C:\software\Coding\blogctl\blogctl-windows-amd64.exe
```

在 `edge://extensions` 启用开发者模式，加载 `C:\software\Coding\blogctl\extension` 并确保 Bridge / Extension 同版；替换文件后使用「重新加载」。

## 两种界面，同一套功能

- 扩展侧边栏：在 Edge 工具栏打开 BlogCTL。
- Web Console：打开 `http://127.0.0.1:32145/console/`，或者在扩展中点击「打开工作台」。

**Web Console 当前需要安装并启用扩展**：扩展的本地 content script 帮助页面向现有受限 Bridge 调度操作，两种界面共用 Feature、导航、表单、状态与业务逻辑。页面不会持有任何 Bridge Token。

## 基本使用

1. 「检测」从各平台读取草稿与已发布文章。
2. 「创建」选择本地文章和平台，创建新草稿或创建并发布。
3. 「更新」选择本地文章、勾选远端目标，然后直接更新或更新并发布。
4. 「任务」查看远端 ID、结果及失败原因；「日志」定位错误。
5. 「索引」提交 IndexNow、Baidu、Google 的页面索引。
6. 「设置」搜索分类与已有字段后单独编辑 TOML 配置。

参见[详细工作流](guide/workflows.md)、[配置参考](reference/configuration.md)和[架构设计](architecture/unified-ui-and-console-20261010.md)。

## 诊断

```powershell
Invoke-RestMethod http://127.0.0.1:32145/v1/health
```

若版本不匹配，先重新加载扩展并核对 Bridge 可执行文件。需要源码审查时运行 `devtool code verify`。
