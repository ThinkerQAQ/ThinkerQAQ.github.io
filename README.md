# Inkerio

[简体中文](README_ZH.md) · [Live example](https://thinkerqaq.com/) · [Documentation](docs/index.md)

Inkerio is a bilingual static blog engine built with Astro. Articles, notes, projects, series, photography and workout records live in a separate content repository. The engine builds pages, search indexes, RSS and sitemaps from that content.

| Component | Purpose |
| --- | --- |
| **Inkerio** | Site rendering and static builds in this repository |
| **[BlogCTL](tools/blogctl/README.md)** | Go CLI, browser Extension and local Web Console for assembly and publishing |
| **[inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template)** | Public sample content and a starting point for your own content repository |

[ThinkerQAQ](https://thinkerqaq.com/) is the author's deployment. The repository keeps its existing name, `ThinkerQAQ/ThinkerQAQ.github.io`; your website can use its own name and domain.

## Run the sample

Requires Node.js 22.12+, npm and Go 1.27.1.

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
cd ThinkerQAQ.github.io
npm ci
npm run dev:quick
```

Open [localhost:4321](http://localhost:4321). The command fetches the public template if absent, assembles its content and starts Astro. It skips diagram pre-rendering. Stop the server with Ctrl+C.

Continue with the [first-site tutorial](docs/tutorial/first-site.md) to edit your own content checkout. Assembly replaces the engine's `src/content`; keep original writing in the content repository.

## Set up your site

| Task | English | 简体中文 |
| --- | --- | --- |
| Install dependencies and run locally | [Quick Start](docs/quick-start.md) | [快速开始](docs/zh-CN/quick-start.md) |
| Create content and translations | [First site](docs/tutorial/first-site.md) | [站点教程](docs/zh-CN/tutorial/first-site.md) |
| Write interactive mind-map notes | [Mind-map notes](docs/how-to/mindmap-notes.md) | [思维导图笔记](docs/zh-CN/how-to/mindmap-notes.md) |
| Replace the author's identity and integrations | [Customize your site](docs/how-to/customize-site.md) | [站点个性化](docs/zh-CN/how-to/customize-site.md) |
| Deploy a fork | [Deployment](docs/how-to/deploy.md) | [部署指南](docs/zh-CN/how-to/deploy.md) |
| Check fields and commands | [Reference](docs/reference/index.md) | [参考手册](docs/zh-CN/reference/index.md) |
| Publish to other platforms | [BlogCTL](tools/blogctl/README.md) | [BlogCTL 中文](tools/blogctl/README_ZH.md) |

Comments, analytics, reactions and Ask Blog use separate services. They need your own configuration; Ask Blog is currently disabled. See [integrations](docs/reference/integrations.md) before deploying.

## Development

See [commands](docs/reference/commands.md) for checks and builds, and [system architecture](docs/concepts/system.md) for ownership and data flow. Contributors and coding agents should read [AGENTS.md](AGENTS.md); BlogCTL also has a [local contract](tools/blogctl/AGENTS.md).

[MIT License](LICENSE)
