# BlogCTL CLI Reference

**Authority:** [`cmd/main.go`](../../cmd/main.go), [`cmd/sync.go`](../../cmd/sync.go) and [`cmd/site.go`](../../cmd/site.go). Confirm the installed release version with its built-in `help`; branch source may be newer.

Run help without an engine checkout:

```bash
blogctl help
```

| Command | Behavior / scope |
| --- | --- |
| `blogctl help` | Print usage |
| `blogctl doctor` | Report Node, npm, Git and platform; missing tools are errors |
| `blogctl dev` / `preview` | Delegate to the corresponding site npm flow |
| `blogctl check` / `test` | Delegate to `npm run check` / `npm test` |
| `blogctl build` | Site build using current assembled content |
| `blogctl site assemble --content-root PATH` | Assemble external canonical content |
| `blogctl site build [--content-root PATH]` | Optionally assemble, then build Astro, inventory and Pagefind |
| `blogctl diagrams [plantuml\|drawio]` | Diagram pipeline (see `cmd/main.go`) |
| `blogctl ai-search prepare\|sync\|verify` | AI Search maintenance; see `cmd/ai_search.go` |
| `blogctl search build\|inventory\|submit\|audit\|notify` | Search index tasks; see `cmd/search.go` |
| `blogctl sync --article SLUG --platforms LIST [--dry-run] [--changed] [--draft]` | Article publishing / preview via Bridge |
| `blogctl sync --all --platforms LIST` | Explicit scope: all published local articles |
| `blogctl toutiao probe --har FILE` | Specialized experiment; see historical research and security boundary |

### `sync` flags

| Flag | Definition from `parseSyncArgs` |
| --- | --- |
| `--article SLUG` | Explicit selected article (repeatable) |
| `--all` | All published articles; cannot combine with `--article` |
| `--platforms p1,p2` | Explicit supported platform list (required) |
| `--dry-run` | Local compilation, no remote write |
| `--changed` | Process changed content only |
| `--draft` | Draft mode in the sync operation |

For real publication, execute `sync` from the canonical **content repository**, with a running authenticated Bridge and supported platform adapter. Read [operation safety](../concepts/operations.md) before a write. For site builds the working directory is the **engine repository**.
