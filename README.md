# ThinkerQAQ Blog

[中文](README_ZH.md) · [Live site](https://thinkerqaq.com/)

An Astro-based bilingual technical blog engine with a separate canonical content repository and a Go-powered publishing control plane (BlogCTL).

**Principles:** minimal core, replaceable integrations, configuration-first, self-hosting, and reuse of mature components before writing custom infrastructure.

## Quick Start

Requirements for fast preview: Node.js 22+, npm, and Go 1.27.1. Full diagram builds also require Java, Graphviz and a headless Chromium runtime; see [Quick Start](docs/quick-start.md).

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
cd ThinkerQAQ.github.io
npm ci
npm run dev:quick
```

Open [http://localhost:4321](http://localhost:4321). This runs with checked-in fixtures without the diagram pre-rendering step; production content is **not** required. For full rendering use `npm run dev` after installing diagram tool dependencies. Continue with the [complete Quick Start](docs/quick-start.md).

## For AI Agents

Read [AGENTS.md](AGENTS.md) first. The configured DevTool project is the canonical development entry point:

```bash
devtool config validate
devtool project inspect --json
```

## Architecture

```text
blog-content (canonical Markdown)
        │  assemble
        ▼
BlogCTL (Go) ──► Astro + content collections ──► dist/
        │                                       ├─► GitHub Pages
        └─► platform syndication                └─► EdgeOne Makers
                  Search / SEO / Pagefind / optional Workers
```

See [System Concepts](docs/concepts/system.md) for boundaries and implementation details.

## Documentation

- [Quick Start](docs/quick-start.md) — run the engine locally
- [Tutorial](docs/tutorial/first-site.md) — use real sample content end to end
- [Concepts / Architecture](docs/concepts/system.md) — understand boundaries
- [How-to](docs/how-to/index.md) — solve specific problems
- [Reference](docs/reference/index.md) — commands, content schema, deployment
- [Examples](docs/examples/index.md) — working repository scenarios
- [Deep Design](docs/architecture/index.md) — decisions and historical investigations
- [BlogCTL](tools/blogctl/README.md) — publishing and local control plane

## Development / Self-hosting

Use [the engine command reference](docs/reference/commands.md) and [deployment guide](docs/how-to/deploy.md). Public site implementation and canonical content are intentionally separate repositories.

Licensed under [MIT](LICENSE).
