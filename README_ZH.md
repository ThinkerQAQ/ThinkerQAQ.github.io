# ThinkerQAQ Blog

[English](README.md) · [在线博客](https://thinkerqaq.com/)

基于 Astro 的中英双语技术博客引擎。正文存于独立的 Content Repository，BlogCTL（Go）负责构建、分发和本地控制流程。

原则：极简核心、可插拔、配置化、自举，优先复用成熟组件。

## Quick Start

快速预览需要 Node.js 22+、npm、Go 1.27.1。完整图表渲染还需要 Java、Graphviz 和 Chromium，见 [Quick Start](docs/quick-start.md)。

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
cd ThinkerQAQ.github.io
npm ci
npm run dev:quick
```

访问 [http://localhost:4321](http://localhost:4321)。使用仓库自带的 fixtures，无需图表预渲染和生产内容仓库。完整图表渲染使用 `npm run dev`。详细步骤见 [Quick Start](docs/quick-start.md)。

## For AI Agents

先读 [AGENTS.md](AGENTS.md)，再从仓库根目录执行：

```bash
devtool config validate
devtool project inspect --json
```

## Architecture

```text
blog-content（内容源）
        ↓ BlogCTL assemble
Astro / Content Collections
        ↓
静态站点 + Pagefind
        ├── GitHub Pages
        └── EdgeOne Makers
```

BlogCTL 同时负责多平台分发。详见 [系统概念与边界](docs/concepts/system.md)。

## Documentation

[Quick Start](docs/quick-start.md) · [Tutorial](docs/tutorial/first-site.md) · [Concepts](docs/concepts/system.md) · [How-to](docs/how-to/index.md) · [Reference](docs/reference/index.md) · [Examples](docs/examples/index.md) · [Deep Design](docs/architecture/index.md) · [BlogCTL](tools/blogctl/README.md)

## Development / Self-hosting

参见 [命令参考](docs/reference/commands.md) 和 [部署指南](docs/how-to/deploy.md)。本仓库负责引擎，正文由独立内容仓库管理。

[MIT License](LICENSE)
