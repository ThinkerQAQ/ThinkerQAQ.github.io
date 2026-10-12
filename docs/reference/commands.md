# Engine Command Reference

**Authoritative sources:** [`package.json`](../../package.json), [`tools/blogctl/cmd/main.go`](../../tools/blogctl/cmd/main.go), and [native maintainer](../../tools/blogctl/cmd/maint/main.go). Verify these sources before adding command entries.

| Command | Actual operation |
| --- | --- |
| `npm ci` | Install exact Node dependencies from lockfile |
| `npm run dev:quick` | Assemble fixtures and launch Astro without diagram pre-rendering (minimal new-user path) |
| `npm run dev` | Assemble fixture content, then diagrams and Astro dev server (requires Java/Graphviz/Chromium) |
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
| `go run ./tools/blogctl/cmd/maint verify` | Go, Node, docs, extension, and boundary checks |
| `go run ./tools/blogctl/cmd/maint build` | Build local BlogCTL binary at `.build/out/blogctl` |
| `go run ./tools/blogctl/cmd/maint package` | Six cross-platform binaries, extension ZIP, installers, and SHA256SUMS under `.build/artifacts/blogctl-release/` |

For publishing/search commands and flags see [BlogCTL CLI](../../tools/blogctl/docs/reference/cli.md). For document navigation, use an LSP client with Marksman; for complete review, read every affected section: [Agent Contract](../../AGENTS.md).
