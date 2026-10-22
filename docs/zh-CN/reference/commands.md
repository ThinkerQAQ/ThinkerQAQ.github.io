# 引擎命令

命令定义以 [`package.json`](../../../package.json)、[`tools/blogctl/cmd/main.go`](../../../tools/blogctl/cmd/main.go) 和 [原生 Go 维护命令](../../../tools/blogctl/cmd/maint/main.go) 为准。

| 命令 | 用途 |
| --- | --- |
| `npm ci` | 根据 lockfile 安装 Node 依赖 |
| `npm run dev:quick` | 装配独立的公开内容模板并启动 Astro，跳过图表预渲染 |
| `npm run dev` | 装配公开内容模板、渲染图表并启动 Astro |
| `npm run dev:site` | 渲染图表并启动 Astro，不重新装配内容 |
| `npm run assemble:template` | 从独立的 `inkerio-content-template` 装配示例内容 |
| `npm run check` | Astro 类型与诊断检查 |
| `npm run build` | 调用 BlogCTL 执行站点构建 |
| `npm run build:template` | 从公开模板装配并构建 |
| `npm run test` | 引擎测试、示例装配和完整构建 |
| `npm run test:docs` | 检查 Markdown 相对链接 |
| `npm run test:engine` | 引擎、扩展、Worker 和组件相关测试 |
| `npm run diagrams` | 运行静态图表渲染脚本 |
| `npm run preview` | 预览已完成的 Astro 构建产物 |
| `go run ./tools/blogctl/cmd help` | 查看当前 BlogCTL CLI |
| `go run ./tools/blogctl/cmd site assemble --content-root ../blog-content` | 从独立仓库装配内容 |
| `go run ./tools/blogctl/cmd site build --content-root ../blog-content` | 装配并构建静态站点 |
| `go run ./tools/blogctl/cmd/maint verify` | Go、Node、文档、扩展与边界检查 |
| `go run ./tools/blogctl/cmd/maint build` | 构建本地可执行文件，输出到 `.build/out/blogctl` |
| `go run ./tools/blogctl/cmd/maint package` | 打包六个平台二进制、扩展 ZIP 与 SHA256SUMS，输出到 `.build/artifacts/blogctl-release/` |

完整发布与搜索命令见 [BlogCTL CLI](../../../tools/blogctl/docs/zh-CN/reference/cli.md)。开发规范见 [AGENTS.md](../../../AGENTS.md)。
