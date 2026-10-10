# ThinkerQAQ Blog

[简体中文](README_ZH.md) · [Website](https://thinkerqaq.com/)

A bilingual technical blog built with Astro. Articles and notes live in a separate content repository; BlogCTL handles site assembly, publishing and search-engine submission.

## Quick Start

Requires Node.js 22+, Go 1.27.1 and npm.

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
cd ThinkerQAQ.github.io
npm ci
npm run dev:quick
```

Open [localhost:4321](http://localhost:4321). This uses the bundled sample content and skips diagram rendering. For full diagram support, see the [setup requirements](docs/quick-start.md).

## For AI Agents

Read [AGENTS.md](AGENTS.md), then inspect the configured DevTool project before changing code:

```bash
devtool config validate
devtool project inspect --json
```

## Architecture

```text
blog-content (Markdown)
    │
    ▼
BlogCTL assembly ──► Astro ──► dist/ ──► EdgeOne / GitHub Pages
    └──────────────► remote publishing adapters
```

The engine renders the site; `blog-content` owns the canonical writing. See [system architecture](docs/concepts/system.md).

## Documentation

| Start here | English | 简体中文 |
| --- | --- | --- |
| Run locally | [Quick Start](docs/quick-start.md) | [快速开始](docs/zh-CN/quick-start.md) |
| Follow a full workflow | [Tutorial](docs/tutorial/first-site.md) | [教程](docs/zh-CN/tutorial/first-site.md) |
| Understand the system | [Concepts](docs/concepts/system.md) | [核心概念](docs/zh-CN/concepts/system.md) |
| Find a task or command | [Documentation](docs/index.md) | [中文文档](docs/zh-CN/index.md) |
| Publish articles | [BlogCTL](tools/blogctl/README.md) | [BlogCTL 中文](tools/blogctl/README_ZH.md) |

For development and deployment, use the [command reference](docs/reference/commands.md) and [deployment guide](docs/how-to/deploy.md).

[MIT License](LICENSE)
