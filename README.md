# Inkerio

[简体中文](README_ZH.md) · [Live example](https://thinkerqaq.com/) · [Project overview](https://thinkerqaq.com/en/projects/personal-blog-system/)

Inkerio is a bilingual static blog engine built with Astro. Keep your writing in a separate content repository and use BlogCTL for site assembly, multi-platform publishing and search-engine submission.

| Component | Role |
| --- | --- |
| **Inkerio** | Site rendering, search, SEO and static deployment; hosted in this repository |
| **[BlogCTL](tools/blogctl/README.md)** | Companion Go application, browser Extension and local Web Console |
| **[inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template)** | Public sample content for a first run or your own content repository |
| **[ThinkerQAQ](https://thinkerqaq.com/)** | Author's personal site built with Inkerio |

The engine repository remains `ThinkerQAQ/ThinkerQAQ.github.io` to preserve its existing Pages hosting. Inkerio is the project name, not a replacement for your site's identity.

## Quick Start

Requires Node.js 22+, Go 1.27.1 and npm.

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
cd ThinkerQAQ.github.io
npm ci
npm run dev:quick
```

Open [localhost:4321](http://localhost:4321). This fetches the separate public content template when absent and skips diagram rendering. For full diagram support, see the [setup requirements](docs/quick-start.md).

## For AI Agents

Read [AGENTS.md](AGENTS.md) before changing code. The native Go maintainer handles BlogCTL engineering tasks:

```bash
go run ./tools/blogctl/cmd/maint verify
go run ./tools/blogctl/cmd/maint build
go run ./tools/blogctl/cmd/maint package
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
