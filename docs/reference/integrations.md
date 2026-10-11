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
| EdgeOne static delivery | [Deployment workflow](../../.github/workflows/deploy.yml) | Makers deploys static output |
| External article publishing | [BlogCTL product documentation](../../tools/blogctl/docs/index.md) | Local Bridge, configured per-platform adapters |

The Umami browser bundle is vendored at `public/u.js` (served as `/u.js`). Source: `https://cloud.umami.is/script.js` (retrieved 2026-10-11, SHA-256: `91a876d767646fd5b7701b6fabf97f8a99ae53b94e7e5b58d465bad1e5d763e0`); see `public/u.js.LICENSE.txt`. The `PUBLIC_UMAMI_PROXY_ORIGIN` setting remains the collector host for `POST /api/send`; static hosting fixes script delivery only. When refreshing the bundle, recheck the source hash and run `npm run test:umami`.

Check the actual site build/environment before describing an integration as active. The environment names supplied by CI are documented in [Deployment Reference](deployment.md); secrets must never be committed.

RSS feeds are locale-specific: Chinese `/rss.xml` and English `/en/rss.xml`. Each contains only published articles in that language.
