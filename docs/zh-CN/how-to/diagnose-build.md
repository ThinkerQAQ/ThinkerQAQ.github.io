# 排查构建或预览失败

在引擎根目录执行命令，保留第一条失败命令及完整报错。后面的命令成功，可能只是检查了不同环节。

## 先定位环节

| 环节或现象 | 检查内容 | 处理方式 |
| --- | --- | --- |
| `npm ci` 失败 | Node/npm 版本和 lockfile 报错 | 使用 Node 22.12+，保留 lockfile，处理具体安装或网络问题 |
| 模板克隆失败 | Git 能否读取公开模板、`BLOG_TEMPLATE_ROOT` | 网络不可用时指定有效的本地模板 |
| 装配失败 | 目标是否包含 `src/content/` | 参数应指向内容仓库根目录，不是其中的 `src/content/` |
| 改文章后页面不出现 | 是否重新装配、状态、语言和文件名 | 重新装配正确内容，参照[内容字段](../reference/content-schema.md) |
| `npm run check` 失败 | 报错文件和字段 | 修正 Frontmatter 或 TypeScript 错误 |
| 找不到 Chrome / 浏览器文件 | 同一系统和用户环境中的 Puppeteer 浏览器 | 安装浏览器后重新执行 Mermaid 渲染 |
| Linux 浏览器启动失败 | 系统库、sandbox、`MERMAID_PUPPETEER_CONFIG_FILE` | 仅在隔离构建环境中参考 CI 配置 |
| PlantUML 失败 | `java -version`、`dot -V`、JAR 下载网络 | 安装 Java 17+/Graphviz，再定位报错图源和行号 |
| draw.io 无法导出 | Desktop 程序或匹配图源的 SVG | 用 `DRAWIO_EXECUTABLE` 指定导出程序 |
| 4321 端口被占用 | 是否有其他 Astro 开发或预览进程 | 先停止原服务，项目使用固定端口 |
| 开发模式搜索为空 | 搜索索引在构建后生成 | 完整构建，再运行 `npm run preview` |

## 单独检查图表

```bash
java -version
dot -V
npm run diagrams:plantuml
npm run diagrams:mermaid
npm run diagrams:drawio
```

只需运行与报错相关的渲染器。Mermaid 使用 `npm ci` 安装的固定版本 CLI。缺少 Puppeteer 浏览器时，在引擎目录执行：

```bash
npx puppeteer browsers install chrome
```

已有可用缓存时，构建不一定启动所有外部工具；新机器或修改图表后仍可能需要。暂时跳过图表预渲染，可以运行：

```bash
npx --no-install astro dev --port 4321
```

这会保留当前装配内容。`npm run dev:quick` 则会重新装配公开模板。

## 按修改范围选择验证

| 命令 | 检查范围 |
| --- | --- |
| `npm run check` | Astro、TypeScript 和内容集合诊断 |
| `npm run build` | 页面、图表、URL 清单与 Pagefind |
| `npm run test:docs` | Markdown 本地链接目标 |
| `go run ./tools/blogctl/cmd/maint verify` | BlogCTL Go 测试、npm 安装、文档、扩展语法和公开边界 |
| `npm test` | 更完整的引擎测试、模板装配、检查与构建 |

`npm test` 会选择公开模板。验证个人内容时，应显式装配，再运行 `check` 和 `build`。部署错误见 [Pages 排查表](deploy.md#常见失败)。
