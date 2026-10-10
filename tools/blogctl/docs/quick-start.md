# Quick Start

从 Windows 上现有的 BlogCTL Bridge + Extension 开始使用。新 Go Web Console 仍处于实施阶段，当前应使用已经验证的 Extension 功能。

## 1. 本机安装

安装目录：

```text
C:\software\Coding\blogctl\
├── blogctl-windows-amd64.exe
├── extension\
└── Data\
    ├── blogctl.toml
    ├── publications.json
    └── jobs.json
```

Bridge 与 Extension 的版本必须保持一致。安装 Windows Native Messaging Host 时运行：

```powershell
.\Install-Windows.ps1 -Executable C:\software\Coding\blogctl\blogctl-windows-amd64.exe
```

在 `edge://extensions` 使用开发者模式加载安装目录下的 `extension` 文件夹。升级 Extension 文件后需重新加载。

## 2. 使用同一套界面

扩展侧边栏展示完整操作台。开发分支增加了「打开工作台」入口，在浏览器新标签页打开同一套 Extension 界面；它仍依赖 Extension，不等同于后续独立的 Go Web Console。

- 检测：按远端平台及草稿/已发布状态查看文章。
- 更新：从本地文章选择、关联候选、草稿更新任务开始；目前仍使用旧绑定语义。
- 任务：查看各平台结果及失败详情。
- 日志：排查错误。
- 索引：提交搜索引擎 URL。
- 设置：分类查找现有工具、平台与运行配置。

「创建、更新、发布」新一代无绑定目标操作正在按[设计方案](architecture/unified-ui-and-console-20261010.md)实施，未完成前不要将现有按钮当作新契约。

## 3. 故障排查

- Bridge 未连接：在设置中查看 Bridge 状态，检查版本是否一致。
- 某平台读取失败：检查浏览器登录和原始错误；其他平台仍可工作。
- 旧数据：备份 `Data`，避免复制 Extension 时删除持久数据。
- 开发诊断：`blogctl doctor` 和 `devtool code verify`。
