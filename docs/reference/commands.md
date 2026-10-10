# Engine Command Reference

**Authoritative sources:** [`package.json`](../../package.json), [`tools/blogctl/cmd/main.go`](../../tools/blogctl/cmd/main.go), and [DevTool project descriptor](../../devcontrol/provider.go). Verify these sources before adding command entries.

| Command | Actual operation |
| --- | --- |
| `npm ci` | Install exact Node dependencies from lockfile |
| `npm run dev` | Assemble fixture content, then diagrams and Astro dev server |
| `npm run dev:site` | Render diagrams and start Astro at port 4321, without reassembling content |
| `npm run assemble:fixtures` | Go BlogCTL `site assemble --content-root fixtures` |
| `npm run check` | `astro check` |
| `npm run build` | Go BlogCTL `build` |
| `npm run build:fixtures` | Assemble fixtures then build |
| `npm run test` | Engine tests + fixture assembly + check + build |
| `npm run test:docs` | Validate internal Markdown links via the existing remark parser |
| `npm run test:engine` | Public boundary/content, diagrams, extension, Worker and UI checks |
| `npm run diagrams` | Execute `scripts/render-diagrams.mjs` |
| `npm run preview` | `astro preview --port 4321` (requires a build) |
| `go run ./tools/blogctl/cmd help` | Print actual BlogCTL CLI help |
| `go run ./tools/blogctl/cmd site assemble --content-root ../blog-content` | Assemble external content |
| `go run ./tools/blogctl/cmd site build --content-root ../blog-content` | Assemble and build site |
| `devtool config validate` | Validate `.devtool.toml` |
| `devtool project inspect --json` | Discover project command descriptor and services |
| `devtool code doctor` / `devtool code verify` | Check configured code tooling; **not** Markdown review |
| `devtool verify` / `devtool build` / `devtool package` | Project Extension actions; check availability with `project inspect` |

For publishing/search commands and flags see [BlogCTL CLI](../../tools/blogctl/docs/reference/cli.md). For document analysis, use the DevTool Agent Gateway `document_context` capability: [Agent Contract](../../AGENTS.md).
