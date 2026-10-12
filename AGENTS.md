# Agent Contract — ThinkerQAQ Blog Engine

This repository builds the public blog and contains BlogCTL. Canonical articles live in the separate `ThinkerQAQ/blog-content` repository.

## First minute

Read [Quick Start](docs/quick-start.md), [commands](docs/reference/commands.md) and this contract. Check `git status` and the active worktree before editing: development may be underway in another worktree.

From the repository root:

```sh
go run ./tools/blogctl/cmd/maint verify
go run ./tools/blogctl/cmd/maint build
go run ./tools/blogctl/cmd/maint package
```

These commands are implemented in Go, independently of the product CLI. The existing `npm run` scripts remain authoritative for Astro, frontend, diagrams, and site previews. `package` generates cross-platform BlogCTL binaries, the browser extension ZIP, installer scripts, and SHA-256 checksums in `.build/artifacts/blogctl-release/`. Never publish a release just because packaging succeeded.

## Native code intelligence

Prefer existing LSP clients and upstream language servers, with explicit fallbacks:

| Files | Server | Use |
| --- | --- | --- |
| Go, under `tools/blogctl/` | `gopls serve` | Symbols, definitions, references, implementations, call hierarchy, diagnostics |
| Markdown, under `docs/` and `tools/blogctl/docs/` | `marksman server` | Headings, link definitions/references, diagnostics |
| TypeScript/JavaScript, Astro, CSS | Editor's installed language servers when available | Definitions, references and diagnostics scoped to the language actually supported |
| Mermaid diagrams | `merman-lsp` and `merman-cli` when available | Semantic navigation, parsing, linting, rendering |

LSP servers require a client to initialize them and send protocol requests. The executable alone is not an Agent tool. Use direct `gopls symbols`/`gopls references`/`gopls check`, `rg`, scoped file reads, `node --check`, and existing npm scripts when no suitable client is available. Read long documents section by section; an outline cannot substitute for complete review. Do not add an LSP gateway or duplicate code index just to expose these tools.

## Architecture and security

Minimal core, pluggable extensions, configuration-first. Reuse mature packages and platform SDKs before writing new infrastructure.

- `blog-content` owns canonical Markdown; this engine owns Astro/SEO/search/build/deploy; BlogCTL owns local orchestration; the browser Extension owns browser-controlled authentication.
- Go owns the BlogCTL backend. JavaScript owns browser UI and the site toolchain.
- Detection/listing is read-only. Creation, updates, publication, deletion and indexing require explicit side-effect authorization. Never blindly retry ambiguous remote writes.
- Session credentials and cookies stay in authorized browser flows, never static assets, Git, logs or documentation.
- Keep installed BlogCTL `Data/` and user configuration intact through deployment. Do not modify production credentials or site deployments without explicit approval.

## Change workflow

Inspect relevant code and docs, make the smallest coherent change, commit/push in small increments, and run native verification at milestones. Use isolated worktrees rather than modifying another Agent's active branch. Preserve existing release versioning and CI semantics. Confirm remote GitHub availability and job health before claiming CI passed. Do not merge unrelated work.

## Documentation

- [Quick Start](docs/quick-start.md), [Tutorial](docs/tutorial/first-site.md)
- [Commands](docs/reference/commands.md), [How-to](docs/how-to/index.md)
- [Architecture](docs/architecture/index.md)
- [BlogCTL](tools/blogctl/docs/index.md), [BlogCTL agent scope](tools/blogctl/AGENTS.md)

This is the repo-wide agent contract; nested contracts describe only subproject-specific rules.
