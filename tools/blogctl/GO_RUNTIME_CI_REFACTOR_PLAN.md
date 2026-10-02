# BlogCTL Go Runtime & CI Refactor Plan

> Date: 2026-10-01
>
> Scope: BlogCTL runtime, directly related scripts, and GitHub Actions wiring.
>
> Principle: **Go is the default for backend/control-plane logic. JavaScript remains only where the code must run in the browser or where the underlying ecosystem is inherently JavaScript-based.**

## 0. Execution status

Started on branch `docs/blogctl-go-runtime-ci-refactor-20261001`.

Completed:

- removed redundant `pr-validate.yml`, `search-submit.yml`, and `ai-search-health.yml`
- simplified `deploy.yml`; CI now builds BlogCTL from the current checkout
- added `blogctl site build`, `blogctl ai-search prepare|sync|verify`, and `blogctl search notify`
- moved Search inventory, fingerprinting, diff/snapshot logic, IndexNow, Baidu, Google OAuth, sitemap submission, and URL Inspection to Go
- added Baidu TOML config, durable task state, separate snapshot, Bridge route, and Extension UI
- removed the complete `tools/blogctl/search/node/` runtime and the legacy root IndexNow script
- kept Google **Request Indexing** in Extension JS because that path is browser/Search Console UI automation
- removed standalone AI Search health scheduling; health polling now runs through BlogCTL after sync
- deployment search notification is now a pure Go BlogCTL job; Node is no longer required in `notify-search`

Remaining compatibility boundary:

- AI Search document preparation/sync/retrieval evaluation still invokes existing Node scripts internally
- site assembly and Pagefind remain Node-based ecosystem tools behind `blogctl site build`
- compiler/assets/Medium cleanup is still pending

Next slice:

1. finish Search review/tests and remove stale documentation/references
2. migrate AI Search prepare/sync/evaluation backend logic to Go
3. unify R2/storage in Go
4. migrate asset orchestration and then compiler backend logic


---

## 1. Domain definition

BlogCTL is a local publishing and search control plane:

```text
content
  ↓
compile / assets / search inventory
  ↓
jobs + providers + publishers
  ↓
remote platforms / search engines / storage
```

The runtime boundary should be:

```text
BlogCTL
├── Go Core
│   ├── Config
│   ├── Jobs
│   ├── Search
│   ├── Compiler
│   ├── Assets
│   ├── Storage
│   ├── Publishers
│   └── Network / Proxy / Logging
│
├── External Renderers
│   ├── Mermaid CLI (Node tool)
│   └── PlantUML (Java)
│
└── Browser JS
    ├── Extension UI
    ├── chrome.cookies / tabs / scripting
    └── Google Search Console request-indexing automation
```

The important distinction is that **using a Node-based external tool does not require our orchestration code to be written in Node**.

---

## 2. Current JavaScript review

### 2.1 Search: migrate to Go

Current files:

```text
tools/blogctl/search/node/
├── inventory.mjs
├── indexnow.mjs
├── google-auth.mjs
├── google.mjs
├── bridge-cli.mjs
└── cli.mjs
```

All backend logic here can move to Go.

Target:

```text
tools/blogctl/search/
├── inventory.go
├── diff.go
├── snapshot.go
├── provider.go
├── indexnow.go
├── baidu.go
├── google_auth.go
├── google_sitemap.go
└── google_inspection.go
```

Responsibilities:

- inventory parsing
- URL normalization
- sitemap/fingerprint generation
- added/changed/deleted diff
- per-provider snapshot
- IndexNow submission
- Baidu ordinary inclusion submission
- Google service-account JWT/OAuth
- Google sitemap submission
- Google URL Inspection API

Google **Request Indexing** is excluded from this migration because ordinary blog pages do not have a general-purpose indexing submission API. That path stays in the browser extension:

```text
Go queue/state
    ↓
Extension JS
    ↓
Search Console UI
    ↓
Request indexing
```

After migration, remove `tools/blogctl/search/node`.

---

## 3. R2 / storage: unify in Go

Current duplicate implementations:

```text
tools/blogctl/assets/node/r2.mjs
tools/blogctl/publisher/r2_fallback.go
```

Both implement S3/R2 SigV4, upload and public URL construction.

Target:

```text
tools/blogctl/storage/r2/
├── config.go
├── signer.go
├── client.go
└── url.go
```

Both asset delivery and publisher fallback use the same Go client.

Delete `assets/node/r2.mjs`.

Config source remains `blogctl.toml`. Do not create a second user-managed ENV configuration path.

---

## 4. Assets: Go orchestration, external renderers only

Current `assets/node/assets.mjs` mixes:

- dedupe
- cache
- renderer selection
- image constraints
- R2 upload
- lifecycle state

Move these responsibilities to Go.

Target:

```text
Go Asset Pipeline
├── collect
├── dedupe
├── cache
├── render dispatch
├── image constraints
└── storage upload
       │
       ├── Mermaid renderer → exec mmdc
       └── PlantUML renderer → exec java -jar plantuml.jar
```

### Mermaid

Keep Mermaid CLI itself. Replace our Node wrapper with a Go process adapter.

```text
Go → mmdc / npx → PNG
```

### PlantUML

Replace the Node wrapper with Go process execution.

```text
Go → java -jar plantuml.jar → PNG/SVG
```

Prefer direct PNG output for publishing when it avoids `SVG → sharp → PNG`.

### R3 completion status — 2026-10-02

Completed on `refactor/blogctl-r2-go-runtime-20261002`:

- R2 config, URL construction, SigV4 signing, and PUT transport live only in `tools/blogctl/storage/r2/`.
- `tools/blogctl/assets/node/r2.mjs` and the Node R2 tests are deleted.
- The compiler emits asset descriptors (`kind/id/renderer/definition/objectKey/publicUrl`) and no longer renders or uploads generated assets.
- Go `assets.Pipeline` owns dedupe, cache, render dispatch, image-size enforcement, and generated-asset delivery.
- Mermaid is executed by the Go process adapter through the pinned Mermaid CLI.
- PlantUML rendering no longer requires Java/JAR. Go owns PlantUML normalization, identity, cache/orchestration, and invokes the official `@plantuml/mcp-js` TeaVM engine as a thin renderer adapter; Graphviz layout is provided by `@viz-js/viz` WASM.
- Node under `tools/blogctl/assets/node/` now contains only the thin `sharp` image-processing adapter.
- Platforms with native image upload keep that path; R2 is used as Go fallback after platform upload failure.
- A future/non-native image platform is handled by the same Go asset pipeline and the same `storage/r2` client.
- Local R2 configuration remains TOML-owned; Node receives no R2 credentials, endpoint, account ID, or bucket.
- Real Mermaid and PlantUML render integration was validated in CI in addition to Go and compiler tests.

---

## 5. Compiler: migrate backend logic to Go in stages

Current compiler logic is mostly backend domain logic:

- frontmatter/article loading
- Markdown fence detection
- Mermaid/PlantUML detection
- canonical URL construction
- platform policy
- link normalization
- asset collection
- content hashing
- platform payload construction
- filesystem traversal

These should move to Go.

### Stage A

Move pure logic first:

```text
compiler/
├── article.go
├── frontmatter.go
├── markdown.go
├── diagrams.go
├── platform.go
├── hash.go
└── compile.go
```

Preserve the existing `CompiledArticle` protocol while migrating.

### Stage B

Remove the current dependency inversion:

```text
tools/blogctl/compiler → scripts/* → tools/blogctl/compiler
```

The correct direction is:

```text
legacy scripts → BlogCTL packages
```

BlogCTL packages must not import root-level compatibility scripts.

### Stage C

Evaluate replacing remaining Node-specific rendering:

- `micromark` → Go Markdown renderer only after golden-output comparison
- `sharp` → Go image pipeline where output parity is acceptable

Do not switch Markdown engines without corpus/golden tests because HTML differences can alter distributed content.

### R4 checkpoint — 2026-10-02

Completed on `refactor/blogctl-compiler-go-runtime-20261002`:

- Go owns article discovery, source-file resolution, Frontmatter parsing, published-state checks, and compiler orchestration.
- The legacy `tools/blogctl/compiler/node/index.mjs` compiler CLI is deleted.
- Go owns Mermaid/PlantUML fence detection, normalization, stable asset identity, object keys, public URLs, and generated-image Markdown replacement.
- `SyncService` calls the Go compiler service directly; Go ↔ Node compiler configuration is no longer passed through hidden environment variables.
- Node compiler code is reduced to a structured renderer boundary fed through JSON stdin.
- PlantUML no longer requires a local JRE, `plantuml.jar`, JDK updater, or `setup-java` in CI.
- The PlantUML rendering boundary uses the official `@plantuml/mcp-js` TeaVM engine plus `@viz-js/viz`; Go remains authoritative for PlantUML domain rules and orchestration.
- Site PlantUML generation and BlogCTL publishing both use the same Java-free renderer.
- Real integration validation covers:
  - Go `assets.Pipeline` → TeaVM PlantUML → PNG;
  - Go `compiler.Service` → Node renderer → `CompiledArticle`;
  - the complete site diagrams suite without Java;
  - all BlogCTL Go tests, renderer tests, extension tests, and BlogCTL build.

Still intentionally left in Node for the next R4 slice:

- Markdown/HTML rendering where output parity matters;
- Medium-specific delta/fallback rendering.

### R4 compiler-domain checkpoint — 2026-10-02

Completed on `refactor/blogctl-compiler-domain-go-20261002`:

- Go now owns canonical URL construction and native-canonical policy.
- Go owns platform description truncation and DEV.to/Medium tag normalization.
- Go owns native-image delivery policy and `blogctl-asset://` replacement.
- Go owns `contentHash` generation for generic, DEV.to, and Medium compiled articles.
- Node renderer consumes an explicit Go renderer policy and no longer manufactures those fields.
- Hash parity is locked with protocol-level golden tests.
- Full validation passed: Go tests, renderer tests, compiler/PlantUML integrations, site diagrams, extension tests, and BlogCTL build.

### R4 renderer-boundary checkpoint — 2026-10-02

Completed on `refactor/blogctl-renderer-boundary-20261002`:

- `tools/blogctl/compiler/node/*` has zero imports from root-level `scripts/*`.
- HTML rendering lives under BlogCTL and `scripts/distribute.mjs` reuses it.
- Publishing configuration lives under BlogCTL and `scripts/publishing-config.mjs` is only a compatibility re-export.
- Medium rendering lives under BlogCTL and `scripts/medium.mjs` is only a compatibility re-export.
- PlantUML JS domain helpers live under BlogCTL; the site PlantUML module depends on them rather than the compiler depending on site scripts.
- Legacy syndicate CLIs no longer import the deleted Node asset pipeline. Live generated-asset delivery explicitly requires `blogctl sync`, where Go owns render/cache/upload.
- Full compatibility validation passed: Go tests, renderer tests, syndicate/Medium/publishing wrapper tests, compiler integration, Java-free diagrams, extension tests, and BlogCTL build.

R4 Stage B is therefore closed. Remaining Node code under the compiler is intentionally renderer-specific; the next independent work item is Medium/publishing backend cleanup.

---

## 6. Medium / publishing: remove duplicate JS backend logic

There are currently overlapping implementations:

```text
tools/blogctl/transport/node/medium.mjs
scripts/medium.mjs
scripts/syndicate-medium.mjs
tools/blogctl/bridge/medium.go
tools/blogctl/bridge/medium_transport.go
```

Go already owns:

- browser-profile HTTP transport
- session-backed Medium requests
- create/update/publish
- post listing
- binding handling

Target:

```text
Compiler
   ↓
CompiledArticle
   ↓
Go Publisher
   ↓
Medium
```

### R5 Medium backend checkpoint — 2026-10-02

Completed on `refactor/blogctl-medium-go-backend-20261002`:

- The dead `tools/blogctl/transport/node/medium.mjs` backend is deleted.
- The legacy Medium syndication live backend is deleted; the legacy syndication CLI now supports DEV.to only and directs Medium work to `blogctl sync`.
- Extension-side Medium GraphQL/list/match/manual-verification backend code is deleted.
- The obsolete Bridge `/v1/medium/lookup-context` and generic `/v1/platforms/medium/drafts` endpoints are deleted.
- Go remains the only Medium backend owner for browser-profile HTTP transport, post listing, candidate matching, binding verification, create/update, image upload/fallback, and publish.
- The Extension retains only browser-owned Medium session acquisition and Bridge calls.
- Node retains only the Medium content renderer under the compiler boundary.
- Full validation passed: Go tests, Medium renderer tests, legacy syndication compatibility, Extension tests, Go compiler integration, and BlogCTL build.

Target backend flow is now:

```text
CompiledArticle
    ↓
Go NativePublisher
    ↓
Go mediumClient
    ↓
Medium
```

---

## 7. Browser JS: keep

The following logic should stay JavaScript because it directly uses browser APIs or DOM:

```text
tools/blogctl/extension/popup/*.js
tools/blogctl/extension/session.js
tools/blogctl/extension/google-indexing-content.js
```

Keep in the extension:

- UI rendering and event handling
- `chrome.cookies`
- `chrome.tabs`
- `chrome.scripting`
- native messaging
- browser session acquisition
- Google Search Console DOM automation

Thin `background.js` by moving non-browser business logic into Go.

---

## 8. Platform registry boundary

Current platform metadata exists in both:

```text
extension/platforms.js
platform/capabilities.go
```

Split ownership explicitly:

### Go

Own platform domain metadata:

- ID
- label
- default language
- publishing capabilities

### Browser JS

Own browser-session descriptors only:

- cookie domains
- cookie names
- probe URL
- partition key
- login probe

Do not maintain general platform capability data in two runtimes.

---

# 9. CI review

## 9.1 BlogCTL is the CI control plane

Repository-specific CI logic should be exposed as BlogCTL commands. Workflows may depend on BlogCTL, but they must build it from the **current checkout** rather than download the latest release:

```text
checkout
→ setup Go
→ go build -o $RUNNER_TEMP/blogctl ./tools/blogctl/cmd
→ $RUNNER_TEMP/blogctl <command>
```

This avoids version skew between the workflow commit and the CLI implementation.

GitHub-native orchestration stays in YAML: checkout, runtime setup, permissions/secrets, artifact upload/download, concurrency, and GitHub Pages deployment. Blog-specific logic moves behind commands such as:

```text
blogctl site build
blogctl search notify
blogctl ai-search sync --verify
blogctl content changed
blogctl analytics query
blogctl worker deploy
blogctl edgeone deploy
```

BlogCTL may internally call Astro, Mermaid CLI, Java, Wrangler, or EdgeOne CLI. Those remain implementation details.

One bootstrap exception remains: `blogctl-release.yml` builds BlogCTL itself, so its cross-platform build/package step can keep using `go build` directly.


The repository originally had eight workflows. The first simplification removes the two redundant ones:

```text
DELETE  pr-validate.yml
DELETE  search-submit.yml

KEEP    deploy.yml
KEEP    content-watch.yml
KEEP    blogctl-release.yml
KEEP    worker-release.yml
KEEP    analytics-query.yml

DELETE  ai-search-health.yml
```

The goal is **not** to remove Node from the repository. Astro, Cloudflare Workers, browser extension code, Pagefind and some renderers are legitimately JavaScript-based.

The goal is to remove **backend/control-plane JavaScript** from CI when Go owns that domain.

---

## 10. CI: what stays Node

### Site build

`deploy.yml` still requires Node for:

- Astro
- npm dependency graph
- frontend code
- Pagefind
- JS/browser tests
- Mermaid CLI where used
- static-site build

Do not attempt to remove Node from the site build.

### Cloudflare Worker

`worker-release.yml` remains Node:

```text
Worker JS
→ node --test
→ wrangler
→ Cloudflare
```

Wrangler and Worker runtime are naturally JS/Node tooling.

### EdgeOne deployment

```text
npx edgeone makers deploy
```

Keep Node unless EdgeOne gains a better non-Node deployment interface.

### Browser extension tests

The extension runtime remains JavaScript. Node may remain as its test/check runner.

---

## 11. CI: migrate to Go

### Search submission

The standalone `search-submit.yml` workflow is removed. Search submission belongs to BlogCTL and the post-deploy notification path, not to a second CI pipeline.

After the Go Search migration:

```text
deploy success
  ↓
blogctl search notify
  ├── IndexNow
  ├── Baidu
  └── Google sitemap
```

Manual bulk/inspection operations should be BlogCTL commands instead of a permanent GitHub Actions workflow.

---

### deploy.yml / search notification — high priority

Current build step:

```text
node scripts/indexnow.mjs prepare
```

Current post-deploy notification:

```text
node scripts/indexnow.mjs submit
node tools/blogctl/search/node/cli.mjs submit --providers google
```

Target:

```text
Go search prepare
Go search submit indexnow
Go search submit google-sitemap
```

Preserve the current prepare-before-deploy / submit-after-deploy semantics until a deliberate search-notification redesign is made.

Do not silently change incremental/full submission behavior during the runtime migration.

---

### AI Search health

The standalone `ai-search-health.yml` workflow is removed.

Its checks are still useful: indexing state can fail asynchronously, and retrieval regressions are only visible after Cloudflare finishes indexing. Keep that behavior, but move it behind BlogCTL:

```text
blogctl ai-search sync
  ↓
blogctl ai-search verify --wait
```

`verify --wait` should poll indexing state with a bounded timeout and then run the retrieval regression cases. Once the Go command reaches parity, delete `check-ai-search-health.mjs` and `eval-ai-search.mjs`.

---

### analytics-query.yml — can migrate to Go

The inline Node block only performs:

- read wrangler config
- Cloudflare KV HTTP GET
- JSON validation
- report shaping

This can be Go.

Do not force this functionality into BlogCTL if it does not belong to BlogCTL's domain. Prefer a small repository-operations Go command if/when this migration starts.

---

### content preparation scripts — can migrate, but Node removal is not the benefit

These scripts are pure filesystem/frontmatter logic:

```text
validate-content-source.mjs
assemble-content.mjs
prepare-ai-search-input.mjs
```

They can be implemented in Go.

However the deploy build still needs Node for Astro, so migrating them does not remove Node from that job. The benefit is:

- one backend implementation language
- shared frontmatter/path rules
- typed tests
- less duplicated JS control logic

Treat this as a later cleanup, not a prerequisite for R1.

---

## 12. No standalone PR validation workflow

`pr-validate.yml` is removed.

For this personal repository, running the full Go + Node + Java + Astro stack before merge and then repeating most of it during deployment adds more pipeline complexity than value.

The deployment build itself is the final build gate. Local development / agents should run targeted tests before pushing changes.

The deploy build is intentionally reduced to the required path:

```text
Checkout engine
→ Checkout content
→ npm ci
→ Java / Graphviz
→ Assemble content
→ npm run build
→ Upload artifacts
→ Deploy
```

Do not separately run:

- content-source pre-validation
- `npm run test:engine`
- `astro check`
- a second PR build workflow

when the goal is simply to produce and deploy the site.

---

## 13. package.json cleanup

As Go migrations complete, remove BlogCTL backend suites from `npm run test:engine`.

Candidates to remove from Node test aggregation after Go parity:

```text
test:search-discovery
test:distribute
test:syndicate
BlogCTL compiler/assets Node tests
```

Keep site/browser suites:

```text
Astro / site checks
extension JS tests
reading experience
AI/search frontend tests
worker tests
diagram tests where the implementation still uses JS tooling
```

Go tests become the authoritative tests for migrated backend logic.

---

## 14. Build/search artifact boundary

Current site build runs:

```text
astro build
→ node search build
→ sitemap-all.txt
→ sitemap-inventory.json
```

The search-build logic is pure backend logic and should become Go.

During migration, keep output files and schemas unchanged:

```text
sitemap-all.txt
sitemap-inventory.json
```

Do not combine this change with a sitemap format change.

The CI wiring can temporarily install Go in the build job to run the postprocessor. A later workflow split may move the Go postprocessing into its own job if that improves build time or ownership.

---

## 14.1 Workflow boundary: keep Content Watch separate

`content-watch.yml` and `deploy.yml` can technically be merged, but should remain separate.

Reason:

```text
content-watch = cheap scheduler / change detector
deploy        = expensive build / release pipeline
```

Merging them would require schedule-specific conditions, extra job outputs, broader permissions and more concurrency branches inside `deploy.yml`. That reduces file count but increases logic.

The simpler boundary is:

```text
content-watch
   ↓ only when private content changed
deploy
```

Likewise, BlogCTL release, Worker release and analytics remain separate because they deploy or operate independent systems.

# 15. Migration sequence

## R1 — Search Core + Baidu — completed

- Go Inventory / Diff / provider snapshots
- Go Baidu provider
- Baidu TOML config / Bridge state / durable job / UI
- Google Request Indexing remains Browser JS

## R2 — Search providers — completed

- IndexNow → Go
- Google auth/sitemap/inspection → Go
- Go `blogctl search` CLI
- deleted `tools/blogctl/search/node`
- deleted standalone `search-submit.yml`
- deploy search notification → current-checkout BlogCTL Go binary

## R3 — Shared R2 + assets

- create shared Go R2 package
- migrate asset orchestration
- Go Mermaid process adapter
- Go PlantUML process adapter
- remove Node R2 implementation

## R4 — Compiler

- article/frontmatter/platform/hash/diagram logic → Go
- remove BlogCTL → root scripts dependency
- golden tests on real representative Markdown
- only then evaluate replacing micromark/sharp

## R5 — Publishing cleanup

- remove Node Medium transport
- move Medium lookup/match from extension background into Go
- delete obsolete syndication compatibility paths

## R6 — CI cleanup

- keep the workflow count small
- keep `content-watch.yml` separate from `deploy.yml`
- migrate pure HTTP/operations CI scripts where useful
- remove migrated MJS tests from package.json

---

# 16. Constraints

1. CI behavior must remain functionally equivalent during runtime migration.
2. Do not change public output formats together with language migration.
3. Do not migrate Google Request Indexing away from browser automation.
4. Do not make user configuration depend on ENV; `blogctl.toml` remains the source of truth.
5. External Node/Java renderers may remain external tools; our orchestration should still be Go.
6. Every JS → Go migration requires parity tests before deleting the old path.
7. Browser JS stays browser JS; no attempt to push DOM/cookie APIs into Go.

---

# 17. Target end state

```text
                       BlogCTL
                          │
             ┌────────────┼────────────┐
             │            │            │
             ▼            ▼            ▼
          Go Core      Browser JS   External tools
             │            │            │
      Search/Jobs      Extension      Mermaid CLI
      Compiler         Session        PlantUML
      Assets           GSC DOM
      Publishers
      R2
      Config
      Network
```

Backend/control-plane code defaults to Go. JavaScript remains only where the runtime or ecosystem makes it the correct boundary.

For CI, BlogCTL is the single repository-specific command surface; YAML only coordinates GitHub-native primitives.
