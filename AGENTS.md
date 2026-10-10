# Agent Contract — ThinkerQAQ Blog Engine

This is the public site engine; canonical posts live in the separate `ThinkerQAQ/blog-content` repository.

## First minute

From the engine root:

```bash
devtool version
devtool config validate
devtool project inspect --json
devtool code doctor
```

Discover project commands from the Project Extension; never invent commands. The project's [documentation index](docs/index.md) is the human entry point.

## Canonical workflow

- Use DevTool `project inspect` before `devtool verify`, `devtool build`, or `devtool package`.
- For code understanding use DevTool's `code_context`; for Markdown use `document_context` through `devtool agent mcp --context agent`. Prefer deterministic outline and section-based review. Goldmark owns structure; Marksman optionally enriches links. Do not claim `devtool code verify` validates Markdown.
- Verify published CLI usage against [engine command reference](docs/reference/commands.md), [BlogCTL CLI reference](tools/blogctl/docs/reference/cli.md), `package.json`, and `tools/blogctl/cmd/main.go`.
- Inspect -> minimal change -> review -> commit -> push -> next block -> final verification. Use a new branch/worktree and avoid unrelated edits.

## Architecture invariants

Minimal core + replaceable extensions + configuration-first + self-hosting. Reuse mature standards, SDKs, open-source libraries and existing infrastructure before inventing a new implementation. Prefer provider/configuration changes before changing core. Keep site rendering, canonical content, browser session and publishing boundaries explicit.

- `blog-content` owns source Markdown; this engine owns Astro/SEO/search/build/deploy; BlogCTL owns local orchestration; Extension owns browser-controlled authentication.
- Go owns BlogCTL backend; JS is used for browser and site toolchains.
- Detection must be read-only; creation, updates, publication and indexing are explicit side-effecting operations. Never blindly retry ambiguous third-party writes.
- Never put secrets or session cookies in static assets, Git, logs or documentation.
- Preserve DevTool service contracts and existing provider boundaries; do not build a parallel toolchain.

## Before changing core

Can configuration/profile solve it? Can an existing mature SDK/provider implement it? Is it an extension-specific behavior? Touch core only for a shared invariant. Review current code and production workflows before editing deployments.

## Documentation map

- [Quick Start](docs/quick-start.md) / [Tutorial](docs/tutorial/first-site.md)
- [Concepts](docs/concepts/system.md) / [How-to](docs/how-to/index.md)
- [Reference](docs/reference/index.md) / [Examples](docs/examples/index.md)
- [Architecture decisions](docs/architecture/index.md)
- [BlogCTL documentation](tools/blogctl/docs/index.md) / [BlogCTL scope](tools/blogctl/AGENTS.md)

This file is the single source for repo-wide agent rules. Any other agent-specific manifest should link here, not duplicate the contract.
