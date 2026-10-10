# Website integrations reference

This is an index into **actual implementation ownership**, not a second hand-maintained API schema.

| Capability | Authoritative sources | Configuration / lifecycle |
| --- | --- | --- |
| Site routes and SEO | [`src/pages/`](../../src/pages/), [structured data](../../src/lib/structured-data.ts), [Astro config](../../astro.config.mjs) | Engine build, canonical metadata, RSS/sitemap |
| Pagefind full-text search | [index builder](../../scripts/build-pagefind.mjs), [search page](../../src/pages/search.astro) | Generated after Astro static build |
| Search engine submission | [BlogCTL search](../../tools/blogctl/cmd/search.go), [deployment workflow](../../.github/workflows/deploy.yml) | IndexNow, Google Search Console, configured providers |
| AI Search | [Worker README](../../workers/blog-ai/README.md), [AI Search CLI](../../tools/blogctl/cmd/ai_search.go) | `CLOUDFLARE_AI_SEARCH_*` variables and Worker release |
| Umami | [BaseLayout](../../src/layouts/BaseLayout.astro), [content analytics](../../src/components/ContentAnalyticsRuntime.astro) | `PUBLIC_UMAMI_WEBSITE_ID`, `PUBLIC_UMAMI_PROXY_ORIGIN` |
| Comments | [ContentComments](../../src/components/ContentComments.astro) | utterances integration |
| Reactions | [ContentReaction](../../src/components/ContentReaction.astro), [Worker README](../../workers/blog-reactions/README.md) | `PUBLIC_REACTION_WORKER_URL`, D1/Worker setup |
| Edge routing | [`edge-functions/`](../../edge-functions/), [proxy design](../edgeone-workers-proxy.md) | EdgeOne Makers artifact; cutover requires verification |
| External article publishing | [BlogCTL product documentation](../../tools/blogctl/docs/index.md) | Local Bridge, configured per-platform adapters |

Check the actual site build/environment before describing an integration as active. The environment names supplied by CI are documented in [Deployment Reference](deployment.md); secrets must never be committed.
