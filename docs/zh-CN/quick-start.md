# 运行示例站点

这份指南在本机启动 Inkerio，使用公开内容模板。它不会部署网站，也不会向第三方平台发布文章。

## 安装工具

| 工具 | 用途 |
| --- | --- |
| Git | 获取引擎和内容模板 |
| Node.js 22.12+、npm 9.6.5+ | 运行 Astro 和前端工具链 |
| Go 1.27.1 或兼容的更新工具链 | 运行 BlogCTL 内容装配；工作区版本见 `go.work` |

在准备使用的终端检查 `git --version`、`node --version`、`npm --version` 和 `go version`。Windows 可以选择 PowerShell 或 WSL，依赖应安装在所选环境中。

## 启动 Inkerio

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
cd ThinkerQAQ.github.io
npm ci
npm run dev:quick
```

打开 [http://localhost:4321](http://localhost:4321)，应能看到示例文章、笔记、项目和生活页面。切换语言可以查看英文站点。按 **Ctrl+C** 停止服务。

首次运行会在引擎旁克隆 `inkerio-content-template`；后续运行复用该目录，不会自动拉取模板的新提交。命令先将模板装配到引擎的生成目录，再启动 Astro。它跳过图表预渲染，未缓存的图表可能不显示。

Bash 中可指定其他模板目录：

```bash
BLOG_TEMPLATE_ROOT=/absolute/path/to/template npm run dev:quick
```

PowerShell 中先将 `$env:BLOG_TEMPLATE_ROOT` 设置为对应的绝对路径，再运行启动命令。

## 检查与构建

在另一个终端进入引擎目录：

```bash
npm run check
```

退出码为 0 表示 Astro 诊断检查通过；这一步不会生成 `dist/`。

完整构建需要按内容安装图表工具：PlantUML 使用 Java 17+ 和 Graphviz，Mermaid 使用 Puppeteer 浏览器，新增或修改 `.drawio` 图源需要 draw.io Desktop。具体排查见[构建指南](how-to/diagnose-build.md)。

```bash
npm run build:template
npm run preview
```

构建结果位于 `dist/`，预览使用 4321 端口。启动预览前先停止开发服务；项目不自动切换到其他端口。

## 下一步

- [创建并编辑自己的内容](tutorial/first-site.md)。
- [设置站点名称、域名与集成](how-to/customize-site.md)。
- [部署到 GitHub Pages](how-to/deploy.md)。

`dev:quick` 用于公开示例。接入自己的内容后，应显式装配并直接启动 Astro；再次运行示例命令会替换当前的内容预览。
