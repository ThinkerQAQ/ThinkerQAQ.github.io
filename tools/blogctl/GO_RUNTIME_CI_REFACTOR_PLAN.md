# BlogCTL Go Runtime & CI Refactor Plan

> Date: 2026-10-01
>
> Scope: BlogCTL runtime, directly related scripts, and GitHub Actions wiring.
>
> Principle: **Go is the default for backend/control-plane logic. JavaScript remains only where the code must run in the browser or where the underlying ecosystem is inherently JavaScript-based.**

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

Delete the Node transport after parity is confirmed.

The extension currently also contains Medium list/match logic. Move API/list/match/binding logic into Go. Extension JS should only acquire browser-owned session material and hand it to the Bridge.

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

The repository currently has these workflows:

```text
ai-search-health.yml
analytics-query.yml
blogctl-release.yml
content-watch.yml
deploy.yml
pr-validate.yml
search-submit.yml
worker-release.yml
```

The goal is **not** to remove Node from the repository. Astro, Cloudflare Workers, browser extension code, Pagefind and some renderers are legitimately JavaScript-based.

The goal is to remove **backend/control-plane JavaScript** from CI when Go owns that domain.

---

## 10. CI: what stays Node

### Site build

`deploy.yml` and the site-validation part of `pr-validate.yml` still require Node for:

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

### search-submit.yml — high priority

Current:

```text
Setup Node
→ search/node/cli.mjs
→ IndexNow
→ Google sitemap
→ Google URL inspection
```

Target:

```text
Setup Go
→ blogctl search submit
→ blogctl search inspect
```

Add Baidu to the same provider model.

After R1, this workflow should no longer require Node.

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

### ai-search-health.yml — can migrate to Go

Current scripts are plain HTTP/control logic:

```text
check-ai-search-health.mjs
eval-ai-search.mjs
```

They do not depend on Worker runtime APIs.

They can move to a small Go operations package/command.

This is lower priority than Search because it is not BlogCTL publishing logic.

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

## 12. PR validation should be split by runtime

Current `pr-validate.yml` runs Go and Node in one job.

Target:

```text
PR Validate
├── blogctl-go
│   ├── gofmt
│   ├── go test ./...
│   └── go build ./cmd
│
└── site-node
    ├── npm ci
    ├── Java / Graphviz
    ├── site JS tests
    ├── Astro check
    └── site build
```

Benefits:

- runtime ownership is explicit
- Go failures do not wait for npm install
- site failures do not obscure BlogCTL failures
- later removal of MJS tests becomes straightforward

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

# 15. Migration sequence

## R1 — Search Core + Baidu

- add Go Inventory / Diff / Snapshot
- add Go Baidu provider
- add Baidu TOML config / Bridge state / job / UI
- keep Google Request Indexing browser JS unchanged

## R2 — Search providers

- IndexNow → Go
- Google auth/sitemap/inspection → Go
- Go `blogctl search` CLI
- delete `tools/blogctl/search/node`
- convert `search-submit.yml`
- convert deploy search notification

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

- split PR validation into Go and site jobs
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
