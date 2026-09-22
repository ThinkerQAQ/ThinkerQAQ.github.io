# Unified BlogCTL Publishing Control Plane

Status: implementation in progress  
Date: 2026-09-21  
Unified implementation branch: `feat/blogctl-native-juejin-20260918`  
Reviewed publishing-compiler branch: `feat/publishing-compiler@75a92c5dad2b1ee6b6ef5f2cd55e7d89e2f0021c`

## 1. Decision

BlogCTL should own the complete publishing control plane.

The publishing compiler is **not a second standalone tool** and is **not itself configuration**.

It should become an internal BlogCTL capability:

```text
BlogCTL
  |
  +-- config         policy and user settings
  +-- compiler       deterministic source -> publishable content
  +-- assets         generated/remote asset preparation
  +-- publisher      platform transport adapters
  +-- state          draft/published bindings and hashes
  +-- bridge         browser-session broker
  +-- extension      login/session UI
```

Configuration selects compiler and asset behavior; it does not contain implementation logic.

## 2. What the current branch already gets right

The latest BlogCTL branch has already moved most of the transport plane into Go:

- `tools/blogctl/app/sync.go` owns command orchestration.
- `tools/blogctl/publisher/service.go` owns draft/update/publish workflow.
- `tools/blogctl/publisher/registry.go` owns native Chinese adapter selection.
- eight Chinese platforms have native Go adapters.
- `publisher.Session` and the Extension/Bridge own browser-session handoff.
- `publisher/manifest.go` stores draft and published state.
- `publisher/aws4.go` already provides signing infrastructure used by platform upload flows.
- the Extension is already the single browser-side component.

That means the old design assumption that BlogCTL should only replace delivery is now outdated. BlogCTL has evolved into the real publication control plane.

## 3. Current architectural problems

### 3.1 Content preparation is still outside BlogCTL

`app/sync.go` still shells out to:

```text
scripts/blogctl-distribute.mjs
scripts/blogctl-syndicate.mjs
```

Those scripts then call the root publishing modules.

The user-facing command is BlogCTL, but a major publishing stage still lives as a parallel root-script subsystem.

### 3.2 Publishing configuration has two sources of truth

Go:

```text
tools/blogctl/bridge/config.go
```

Node:

```text
scripts/publishing-config.mjs
```

Both define defaults and normalization for:

- language
- changedOnly
- footer
- canonical
- tracking

This creates inevitable drift.

### 3.3 Distribution state has two writers

Node currently creates/migrates `.distribution/manifest.json` and writes content hashes.

Go later updates the same manifest with:

- remoteDraftId
- draftUrl
- draftHash
- publishedUrl
- publishedHash

A control-plane state file should have one owner.

### 3.4 #48 duplicates infrastructure that BlogCTL now already owns

PR #48 currently adds standalone Node modules for:

- publishing compiler
- Mermaid rendering
- R2 SigV4 upload
- publishing asset orchestration

The latest BlogCTL branch already has:

- Go orchestration
- native publisher image flows
- AWS4 signing primitives
- task/error/state handling

Merging #48 unchanged would create a second publishing subsystem.

### 3.5 Platform routing is split by historical implementation

`BuildSyncPlan` currently separates:

```text
Chinese -> Node distribution -> Go native publisher
DEV.to  -> Node syndication
Medium  -> Node syndication -> Go bridge
```

The distinction should be platform capability, not implementation history.

## 4. Target architecture

```text
Canonical article
      |
      v
BlogCTL app.Sync
      |
      v
Compiler
  - load frontmatter
  - select language
  - canonical/footer/tracking
  - normalize portable Markdown
  - render HTML when target needs HTML
  - discover generated assets
      |
      v
CompiledArticle
  - title
  - description
  - tags
  - markdown
  - html
  - canonical URL
  - content hash
  - assets[]
      |
      +--------------------+
      |                    |
      v                    v
Asset Manager          State Manager
  - Mermaid render       - current hash
  - R2 upload            - draft hash
  - stable URLs          - published hash
  - dedupe/cache         - remote refs
      |                    |
      +----------+---------+
                 |
                 v
        Platform Publisher
          - CNBlogs
          - Juejin
          - CSDN
          - SegmentFault
          - Zhihu
          - 51CTO
          - OSChina
          - Toutiao
          - DEV.to
          - Medium
                 |
                 v
         Remote draft/publish
```

## 5. Package boundary

Recommended layout:

```text
tools/blogctl/
├── app/
│   └── sync.go
├── compiler/
│   ├── protocol.go
│   └── node/
│       ├── index.mjs
│       ├── article.mjs
│       ├── markdown.mjs
│       ├── html.mjs
│       └── transforms/
│           ├── links.mjs
│           ├── footer.mjs
│           ├── tables.mjs
│           └── mermaid.mjs
├── assets/
│   ├── manager.go
│   ├── r2.go
│   └── mermaid.go
├── publisher/
│   ├── service.go
│   ├── registry.go
│   ├── ...
│   └── platform adapters
├── state/
│   ├── manifest.go
│   └── publications.go
├── bridge/
└── extension/
```

The deterministic Markdown/HTML transformation can remain Node because the engine already uses the JavaScript Markdown ecosystem and BlogCTL sync already requires Node.

What changes is ownership: the Node compiler becomes an **internal BlogCTL implementation module**, not a root-level publishing application.

## 6. Compiler contract

Go should invoke one stable compiler entry point instead of multiple publishing scripts.

Example conceptual request:

```json
{
  "slug": "concurrency-series-04-mutex-implementation",
  "platform": "juejin",
  "language": "zh-CN",
  "contentRoot": "...",
  "policy": {
    "footer": {},
    "canonical": {},
    "tracking": {}
  }
}
```

Compiler response:

```json
{
  "title": "...",
  "description": "...",
  "tags": ["..."],
  "markdown": "...",
  "html": "...",
  "canonicalUrl": "...",
  "contentHash": "...",
  "assets": [
    {
      "kind": "mermaid",
      "id": "...",
      "source": "...",
      "mediaType": "image/png",
      "objectKey": "generated/mermaid/<hash>.png",
      "publicUrl": "https://...r2.dev/generated/mermaid/<hash>.png"
    }
  ]
}
```

Use JSON over stdin/stdout or a temporary request/response file. Do not make `.distribution/*.md` the runtime API between Go and Node.

## 7. .distribution becomes cache/debug output

Today:

```text
Node writes .distribution
Go rereads .distribution
Go publishes it
```

Target:

```text
Go asks compiler for CompiledArticle
Go publishes CompiledArticle directly
          |
          +--> optionally persist .distribution for inspection/cache
```

This removes file-system handoff as a required runtime boundary.

## 8. Single configuration owner

Go BlogCTL config becomes authoritative.

Keep platform policy in:

```text
BlogCTL/config.json
publishing.platforms.<platform>
```

Add compiler/asset policy there:

```json
{
  "publishing": {
    "compiler": {
      "mermaid": {
        "enabled": true,
        "format": "png",
        "width": 1200,
        "scale": 2
      }
    },
    "assets": {
      "store": "r2",
      "r2": {
        "bucket": "blog-assets",
        "publicBaseUrl": "https://pub-366a15b6733345039775c083a1fffb3e.r2.dev/"
      }
    },
    "platforms": {}
  }
}
```

Node must receive already-resolved policy from Go.

Delete Node-side default-merging once migration is complete.

Secrets should not be duplicated in article content or generated artifacts. R2 access credentials should come from the BlogCTL secret environment/credential mechanism, while non-secret policy such as bucket/public URL can stay in config.

## 9. Single state owner

Move distribution-state ownership fully to Go.

The compiler returns deterministic content and a content hash.

Go alone writes:

- contentHash
- draftHash
- draft URL / remote ID
- publishedHash
- published URL
- timestamps
- durable bindings

Node should never migrate or mutate publication state.

`.distribution/manifest.json` may remain during migration, but all writes should pass through one Go state package.

Longer term separate:

```text
.blogctl/publications.json   durable remote bindings/state
.distribution/               generated cache and review artifacts
```

This matches the CNBlogs binding direction already present in the current branch.

## 10. Mermaid asset flow

Mermaid remains source of truth:

```text
Canonical Markdown Mermaid
      |
      +--> personal site -> Mermaid.js -> browser SVG
      |
      +--> BlogCTL compiler
              |
              v
          Mermaid asset descriptor
              |
              v
          Asset Manager
              |
              +--> local content-addressed PNG cache
              +--> Cloudflare R2
              |
              v
          stable R2 URL
              |
              v
        platform-ready content
```

Important boundary:

- compiler detects and describes generated assets;
- asset manager materializes and uploads them;
- platform adapters may then re-upload the R2 image to their own CDN when required.

Do not make Astro build generate syndication PNGs.

## 11. R2 belongs to BlogCTL assets, not a standalone script

PR #48's R2 logic should be reimplemented/moved under BlogCTL assets.

Do not keep a second Node-only R2 signer when Go is the control plane.

A dedicated R2 client should own:

- PutObject signing
- stable public URL generation
- immutable cache headers
- retries/timeouts
- idempotent content-addressed keys

It may reuse generalized AWS4 primitives where correct, but R2 S3 signing should have its own tests because its canonical request differs from the ImageX usage already present in `publisher/aws4.go`.

## 12. Unified platform registry

Replace historical China/international routing with one registry.

Conceptual capabilities:

```go
type PlatformCapabilities struct {
    NativeDraft   bool
    NativePublish bool
    NeedsSession  bool
    NeedsHTML     bool
    SupportsImages bool
}
```

The app asks the registry what a platform needs.

It should not decide based on:

```text
if Chinese -> script A
if international -> script B
```

### End state

- Chinese platforms: Go adapters.
- DEV.to: Go official API adapter.
- Medium: Go Bridge adapter using compiler-generated Medium payload/fallback.
- all targets receive the same `CompiledArticle` model.

## 13. DEV.to migration

DEV.to is simple enough to move into Go.

Current Node responsibilities:

- list current articles
- compare canonical/content
- create/update article through the official API

Move that into `publisher/devto.go`.

Then `scripts/syndicate.mjs` no longer needs to be a publishing application.

## 14. Medium migration

Medium is different because its browser/editor transport is special.

Keep the Bridge + Extension session flow, but preparation still comes from the unified compiler.

If native body-image insertion is not verified:

- compiler/asset manager still produce the R2 image;
- task reports a typed `body-image-unsupported` capability error;
- generated fallback remains available;
- never silently turn Mermaid source into code or a text link.

## 15. Task stages

The control plane should expose one coherent pipeline:

```text
queued
  -> compiling
  -> preparing-assets
  -> waiting-for-session      (only when needed)
  -> checking-auth
  -> uploading-platform-images
  -> creating/updating-draft
  -> draft-ready
  -> publishing               (explicit confirm)
  -> published
```

This gives the Extension one consistent state model regardless of platform.

## 16. Migration plan

### Phase A — architecture convergence

Create the internal compiler contract under `tools/blogctl/compiler`.

Move/copy only deterministic transformations from root scripts first.

Do not change platform behavior.

### Phase B — one config owner

Go resolves publishing config and passes it to the compiler.

Remove defaults/merging from `scripts/publishing-config.mjs`.

### Phase C — one state owner

Compiler returns content hash.

Go writes publication state.

Node stops mutating manifest.

### Phase D — generated assets

Bring the useful parts of #48 into:

```text
tools/blogctl/compiler/... mermaid detection
tools/blogctl/assets/...   render/cache/R2
```

Verify real Mermaid CLI rendering once in CI.

### Phase E — remove script routing split

Change `app/sync.go` from:

```text
BuildSyncPlan -> scripts/blogctl-distribute.mjs / scripts/blogctl-syndicate.mjs
```

to:

```text
Compile -> PrepareAssets -> Publisher registry
```

### Phase F — migrate DEV.to

Implement official API adapter in Go.

### Phase G — Medium convergence

Use unified compiled input through Bridge.

### Phase H — compatibility cleanup

Delete or reduce to thin developer wrappers:

- `scripts/blogctl-distribute.mjs`
- `scripts/blogctl-syndicate.mjs`
- publishing behavior duplicated in root scripts

Keep generic engine scripts only when they are independently useful outside BlogCTL.

## 17. What to do with PR #48

Do **not** merge PR #48 unchanged.

Its useful work is:

- semantic Mermaid fence compiler behavior;
- content-addressed Mermaid hash;
- real `mmdc` verification;
- R2 portability model;
- external-platform tests.

Port those concepts/tests into the unified BlogCTL pipeline.

Then close #48 as superseded by the BlogCTL integration PR.

## 18. What not to do

Do not:

- move files into `tools/blogctl` without fixing ownership;
- call the compiler "config";
- keep Go and Node publishing defaults independently;
- keep Node and Go as co-owners of manifest state;
- add a second R2/AWS signing subsystem without a clear shared boundary;
- make Astro site builds depend on syndication asset rendering;
- rewrite every Markdown transformation in Go just to make the tree look uniform.

## 19. Final responsibility model

```text
BlogCTL app
    owns orchestration

BlogCTL config
    owns policy

BlogCTL compiler
    owns deterministic content transformation

BlogCTL assets
    owns generated asset materialization and canonical hosting

BlogCTL publisher
    owns remote platform transport

BlogCTL state
    owns draft/published state

BlogCTL bridge + extension
    owns browser authentication/session handoff
```

That is the intended meaning of BlogCTL as the control plane.


## 20. Current convergence status

As of 2026-09-22, the publishing control plane is substantially converged:

- `tools/blogctl/compiler/node/` is the single deterministic publishing compiler.
- `tools/blogctl/assets/node/` owns Mermaid rendering, content-addressed asset caching, and R2 publication.
- BlogCTL Go config owns publishing policy and passes resolved runtime configuration to the compiler.
- Go is the only writer of remote publication state. The Node compiler and compatibility scripts do not mutate `.distribution/manifest.json`.
- `CompiledArticle v1` is the versioned compiler-to-publisher protocol.
- 博客园、掘金、CSDN、思否、知乎、51CTO、开源中国、今日头条 and DEV.to publish through the Go publisher/task flow.
- Medium now uses the same `CompiledArticle` compiler output and Bridge task flow instead of the historical `scripts/blogctl-syndicate.mjs` control-plane route.
- Medium draft results are recorded by the same Go publication-state writer and therefore appear in the publication inventory.
- Mermaid assets follow one path: compiler detection -> PNG render -> R2 -> platform adapter. Platform-specific adapters may re-upload the R2 image to their own CDN.
- BlogCTL Extension exposes sync, task, publishing configuration, tool configuration, and publication inventory from the same local Bridge.

The old root publishing scripts remain only as compatibility/development entry points. They are no longer the desired control-plane boundary.

### Medium boundary

Medium does not issue new integration tokens for new integrations, so BlogCTL should not design its current publishing path around obtaining a new official API token. The supported path remains the user-initiated browser-session Bridge.

The unified Medium flow remains draft-oriented:

1. compiler builds a Medium payload plus copy/paste fallback HTML;
2. Bridge validates a live browser session;
3. unchanged drafts can be skipped by content hash;
4. Bridge creates the Medium draft and records its post ID / draft URL in Go publication state;
5. canonical URL, tags, and cover-image fields are surfaced as pending editor work when the editor transport cannot safely set them;
6. body-image insertion fails closed and preserves a generated fallback rather than silently losing images.

Reference: https://help.medium.com/hc/en-us/articles/213480228-API-Importing

## 21. Re-audit findings and next development plan

The next work should follow control-plane value rather than add isolated UI features.

### P0 — unified live publishing path

**Status:** implemented.

Live publishing now has one execution path:

```text
Extension ----\
              -> Bridge job API -> SyncService -> CompiledArticle -> publisher
CLI ----------/
```

- Extension jobs already execute inside the persistent Bridge with browser sessions and native publishers.
- non-dry-run `blogctl sync` starts/reuses the Bridge, submits `/v1/sync/jobs`, waits for terminal job state, and prints the same per-platform result model used by the Extension.
- `--all` is expanded from the Bridge article inventory and still creates explicit per-article live jobs.
- dry-run remains local compiler execution because it needs neither browser session nor remote mutation.

The CLI and Extension therefore no longer maintain separate live publishing implementations.

### P1 — durable publication state

**Status:** implemented.

Remote platform state now lives in:

```text
.blogctl/publications.json   durable platform bindings + hashes + remote URLs
.distribution/               generated compiler/assets/debug cache only
```

The durable file keeps the existing CNBlogs verified bindings and adds generic cross-platform publication records. Reads prefer durable state; legacy `.distribution/manifest.json` records are migrated once and remain read-compatible during the transition. New draft/publish/update writes no longer mutate the generated manifest.

Regression coverage verifies that:

1. legacy state migrates without overwriting newer durable state;
2. deleting `.distribution/` does not lose remote draft/published identity;
3. generic publication writes preserve CNBlogs verified bindings;
4. inventory and article-link views continue to work after generated-output cleanup.

### P2 — platform capabilities and reconciliation

**Status:** capability model implemented; remote reconciliation implemented where a stable endpoint is verified.

All platform metadata now comes from one shared registry used by App, CLI, Bridge and Extension. The registry currently exposes:

```go
type Capabilities struct {
    BrowserSession  bool
    APIKey           bool
    DraftCreate      bool
    DraftUpdate      bool
    ExplicitPublish  bool
    PublishedUpdate  bool
    RemoteList       bool
    BodyImages       bool
    CoverImage       bool
    NativeCanonical  bool
    Tags              bool
}
```

The Extension no longer decides draft-update, explicit-publish, published-update or auth behavior from platform-name conditionals. Advanced capabilities stay fail-closed until the adapter actually implements them; for example DEV.to advertises native cover/canonical/tags, while Medium does not.

Remote reconciliation is currently enabled only for verified transports:

- CNBlogs: exact post lookup through the authenticated editor API; detects draft/published state, missing posts and remote changes against the stored verification baseline without accepting those changes automatically.
- DEV.to: exact article lookup through the official Forem API; detects draft/published state, state drift and missing remote articles.
- Other platforms: explicitly remain `local-only` until a stable list/get endpoint is proven from official API behavior or browser captures.

The **草稿与发布** tab exposes this as an explicit **远端核验** action only when `RemoteList=true`.

Do not guess undocumented list/update endpoints. Add them only from verified API/browser captures.

### P3 — Medium editor completeness

Keep the current fail-closed image behavior until a verified Medium browser request proves a safe image insertion transport.

Priorities:

1. body-image upload/insertion;
2. canonical URL;
3. tags;
4. cover image;
5. existing-draft update if the editor transport can be verified safely.

The copy/paste fallback remains mandatory until body images are verified.

### P4 — compatibility cleanup

**Status:** implemented for the obsolete control-plane compatibility layer.

- `scripts/blogctl-distribute.mjs` and `scripts/blogctl-syndicate.mjs` are now compatibility stubs that direct live work to `blogctl sync`;
- unreachable `distribution-sync`, `syndication-devto`, and `syndication-medium` event parsing has been removed from the Go control plane;
- supported-platform metadata, labels, default languages and capabilities now come from one shared platform registry;
- generic modules still used by the compiler, including `scripts/distribute.mjs`, `scripts/medium.mjs`, rendering helpers and their tests, remain intact.

### P5 — control-plane UX

**Status:** implemented for the current verified platform capabilities.

The **草稿与发布** tab now:

- reads durable publication state rather than task logs;
- shows draft and published links from `.blogctl/publications.json`;
- exposes capability-aware remote verification only for platforms with a verified remote lookup transport;
- distinguishes local-only records, verified remote drafts, verified remote publications, remote state changes and missing remote objects;
- shows Medium pending manual fields such as Canonical, Tags and cover image directly on the publication record, with a pending-only filter;
- lets the user mark manual fields as handled by clearing only the local durable todo marker; this never mutates or claims to verify the remote platform;
- keeps task logs as diagnostics rather than the authoritative publication state.

Medium editor completeness itself remains P3 and stays fail-closed until additional browser captures verify safe body-image insertion, canonical, tags, cover-image and existing-draft update transports.

This ordering keeps the architecture stable: one compiler, one state owner, one live execution path, one capability model, then richer UI.
