# Search, analytics, and external services

**Definition:** the public engine renders a static site; optional services enhance discovery, analytics, comments and reactions without owning the canonical Markdown.

## Layers and responsibilities

```text
Content collections ──► Astro build ──► static pages
                              │
                  ┌───────────┼───────────────────┐
                  ▼           ▼                   ▼
           Pagefind index   SEO/RSS          Browser integrations
                               │              ├── Umami analytics
                         IndexNow/GSC         ├── utterances comments
                         (BlogCTL)            └── Reactions Worker
                  Optional AI Search Worker (separate retrieval pipeline)
```

## Core distinction

- **Pagefind** is generated from built HTML as part of the site build. The [site search UI](../../src/pages/search.astro) and [index builder](../../scripts/build-pagefind.mjs) are its entry points.
- **Search-engine discovery** uses sitemaps, canonical metadata and BlogCTL search submission/notification, with [Go search commands](../../tools/blogctl/cmd/search.go) and [CI notification](../../.github/workflows/deploy.yml).
- **AI Search** uses a separate content preparation/sync process and Cloudflare Worker. The backend and release workflow can exist without an exposed Ask Blog UI; do not infer public feature status from backend source alone.
- **Umami** is injected conditionally by [BaseLayout](../../src/layouts/BaseLayout.astro) through `PUBLIC_UMAMI_WEBSITE_ID` and `PUBLIC_UMAMI_PROXY_ORIGIN`. The [browser analytics-control page](../../src/pages/disable-analytics.astro) is a separate user-facing route.
- **Comments** use [utterances integration](../../src/components/ContentComments.astro); **helpful reactions** use [ContentReaction](../../src/components/ContentReaction.astro) with the separately configured [Reactions Worker](../../workers/blog-reactions/README.md).

## Implementation boundary

`workers/` implements independent service backends; `edge-functions/` contains EdgeOne-specific routing. [EdgeOne proxy research](../edgeone-workers-proxy.md) is a dated cutover investigation and cannot be taken as proof that all browsers currently use those paths. No runtime credential belongs in static build artifacts.

For source paths and configuration keys use [Integrations Reference](../reference/integrations.md). For deployment details use [Deployment Reference](../reference/deployment.md).
