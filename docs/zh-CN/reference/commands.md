# 引擎命令

命令定义以 [`package.json`](../../../package.json)、[`tools/blogctl/cmd/main.go`](../../../tools/blogctl/cmd/main.go) 和 [DevTool Project Extension](../../../devcontrol/provider.go) 为准。

| 命令 | 用途 |
| --- | --- |
| `npm ci` | 根据 lockfile 安装 Node 依赖 |
| `npm run dev:quick` | 装配 fixtures 并启动 Astro，跳过图表预渲染 |
| `npm run dev` | 装配 fixtures、渲染图表并启动 Astro |
| `npm run dev:site` | 渲染图表并启动 Astro，不重新装配内容 |
| `npm run assemble:fixtures` | 用 BlogCTL 装配 `fixtures/` |
| `npm run check` | Astro 类型与诊断检查 |
| `npm run build` | 调用 BlogCTL 执行站点构建 |
| `npm run build:fixtures` | 装配示例内容并执行构建 |
| `npm run test` | 引擎测试、示例装配和完整构建 |
| `npm run test:docs` | 检查 Markdown 相对链接 |
| `npm run test:engine` | 引擎、扩展、Worker 和组件相关测试 |
| `npm run diagrams` | 运行静态图表渲染脚本 |
| `npm run preview` | 预览已完成的 Astro 构建产物 |
| `go run ./tools/blogctl/cmd help` | 查看当前 BlogCTL CLI |
| `go run ./tools/blogctl/cmd site assemble --content-root ../blog-content` | 从独立仓库装配内容 |
| `go run ./tools/blogctl/cmd site build --content-root ../blog-content` | 装配并构建静态站点 |
| `devtool config validate` | 验证 DevTool 配置 |
| `devtool project inspect --json` | 查询项目扩展及声明的命令 |
| `devtool code doctor` / `devtool code verify` | 检查代码分析工具，不能代替 Markdown Review |
| `devtool verify` / `devtool build` / `devtool package` | 经项目扩展运行的验证、构建和打包 |

完整发布与搜索命令见 [BlogCTL CLI](../../../tools/blogctl/docs/zh-CN/reference/cli.md)。Markdown 结构分析通过 DevTool Agent Gateway 的 `document_context` 进行。
