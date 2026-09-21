# Unified BlogCTL Publishing Control Plane

Status: architecture proposal  
Date: 2026-09-21  
Reviewed BlogCTL branch: `feat/blogctl-native-juejin-20260918@3634c2024e54b1cba49756b859fafa78bf9ac7a4`  
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
