# Diagnose a build or preview failure

Run commands from the engine root. Keep the first failing command and its full error; a later successful command may test a different part of the system.

## Find the failing stage

| Stage / symptom | Check | Next action |
| --- | --- | --- |
| `npm ci` fails | Node/npm versions and lockfile error | Use Node 22.12+; retain the lockfile and fix the reported install/network problem |
| Template clone fails | Git access to the public template; `BLOG_TEMPLATE_ROOT` | Use a valid local checkout when remote cloning is unavailable |
| Assembly fails | Selected directory contains `src/content/` | Pass the content repository root, not its `src/content/` subdirectory |
| Page missing after editing | Source was reassembled; status/language/filename | Assemble the intended content again; see [content fields](../reference/content-schema.md) |
| `npm run check` fails | Reported file and schema field | Fix invalid frontmatter or TypeScript diagnostics |
| `Could not find Chrome` / missing browser | Puppeteer browser installation in the same OS/user environment | Install its browser, then rerun Mermaid rendering |
| Mermaid browser launch fails on Linux | Missing libraries, sandbox and `MERMAID_PUPPETEER_CONFIG_FILE` | Follow the CI example only for an isolated build environment |
| PlantUML fails | `java -version`, `dot -V`, JAR download access | Install Java 17+/Graphviz; inspect the reported diagram source and line |
| draw.io source cannot export | Desktop executable or matching exported SVG | Set `DRAWIO_EXECUTABLE` for the executable used to export changed sources |
| Port 4321 is occupied | Another Astro dev/preview process | Stop the previous server; the port is strict |
| Search is empty in dev | Search index comes from the completed build | Build, then run `npm run preview` |

## Isolate rendering

```bash
java -version
dot -V
npm run diagrams:plantuml
npm run diagrams:mermaid
npm run diagrams:drawio
```

Only run the renderer relevant to the failure. Mermaid uses the pinned CLI installed by `npm ci`. For a missing Puppeteer browser, run from the engine directory:

```bash
npx puppeteer browsers install chrome
```

If a working renderer cache already exists, not every build needs to launch every external tool. A new machine or changed diagram may still require them. A usable preview without diagram pre-rendering is:

```bash
npx --no-install astro dev --port 4321
```

This preserves your current assembled content. `npm run dev:quick` assembles the public template again.

## Choose the verification you need

| Command | Covers |
| --- | --- |
| `npm run check` | Astro/TypeScript and collection diagnostics |
| `npm run build` | Site rendering, diagrams, generated URL inventory and Pagefind |
| `npm run test:docs` | Local Markdown link targets |
| `go run ./tools/blogctl/cmd/maint verify` | BlogCTL Go tests, npm installation, docs, extension syntax and public boundaries |
| `npm test` | Broader engine tests, template assembly, check and full build |

`npm test` selects the public template. To verify personal content, assemble it explicitly, then run `check` and `build`. For deployment-specific errors see [Pages troubleshooting](deploy.md#failures).
