# ThinkerQAQ Blog

[English](README.md) · [博客](https://thinkerqaq.com/) · [项目介绍](https://thinkerqaq.com/projects/personal-blog-system/)

基于 Astro 的双语技术博客。文章和笔记保存在独立的内容仓库；BlogCTL 负责内容装配、分发及搜索引擎提交。

## 快速开始

需要 Node.js 22+、Go 1.27.1 和 npm。

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
cd ThinkerQAQ.github.io
npm ci
npm run dev:quick
```

访问 [localhost:4321](http://localhost:4321)。这条命令使用仓库自带的示例内容，跳过图表预渲染。完整图表构建所需的 Java、Graphviz 等依赖见[快速开始](docs/zh-CN/quick-start.md)。

## AI Agent

先读 [AGENTS.md](AGENTS.md)，再通过 DevTool 发现项目能力：

```bash
devtool config validate
devtool project inspect --json
```

## 架构

```text
blog-content（Markdown 原文）
    │
    ▼
BlogCTL 装配 ──► Astro ──► dist/ ──► EdgeOne / GitHub Pages
    └─────────► 多平台文章分发
```

内容仓库是文章的权威来源；本仓库管理网站渲染和工具链。详见[系统架构](docs/zh-CN/concepts/system.md)。

## 文档

| 目的 | 中文 | English |
| --- | --- | --- |
| 本地运行 | [快速开始](docs/zh-CN/quick-start.md) | [Quick Start](docs/quick-start.md) |
| 从零操作一次 | [教程](docs/zh-CN/tutorial/first-site.md) | [Tutorial](docs/tutorial/first-site.md) |
| 理解设计 | [核心概念](docs/zh-CN/concepts/system.md) | [Concepts](docs/concepts/system.md) |
| 查命令、部署和操作步骤 | [中文文档目录](docs/zh-CN/index.md) | [Documentation](docs/index.md) |
| 使用 BlogCTL | [BlogCTL 中文](tools/blogctl/README_ZH.md) | [BlogCTL](tools/blogctl/README.md) |

开发与部署请查[命令参考](docs/zh-CN/reference/commands.md)和[部署指南](docs/zh-CN/how-to/deploy.md)。

[MIT License](LICENSE)
