# Private blog analytics

The site uses Umami Cloud for private traffic analytics. No article view count is rendered to readers.

## Production activation

1. Create a website in Umami Cloud for `thinkerqaq.github.io`.
2. Copy the Umami website ID.
3. In GitHub, open the repository settings and create an Actions variable:

   - Name: `PUBLIC_UMAMI_WEBSITE_ID`
   - Value: the Umami website ID

4. Keep `PUBLIC_ASK_BLOG_WORKER_URL` configured. The analytics tracker reuses the origin of the existing blog Cloudflare Worker, so there is no second public proxy URL to maintain.
5. The normal `master` deployment automatically deploys `workers/blog-ai` before GitHub Pages. No local `wrangler deploy` step is required.

The tracker is injected once by `src/layouts/BaseLayout.astro`. If the Umami website ID or Worker URL is absent, no analytics script is emitted. The tracker is restricted with `data-domains="thinkerqaq.github.io"`, so local development visits do not pollute production analytics.

The browser does not contact `cloud.umami.is` or `gateway.umami.is` directly. Instead:

- `GET <blog-worker-origin>/u.js` proxies the current Umami Cloud tracker from `https://cloud.umami.is/script.js`.
- `POST <blog-worker-origin>/api/send` proxies collection to `https://gateway.umami.is/api/send`.
- `data-host-url` points the tracker at the Worker origin so both the script and collection path avoid direct Umami hosts that are commonly blocked.
- The collection proxy only accepts requests whose `Origin` is `https://thinkerqaq.github.io`.

The Umami website ID is public by design because it is embedded in the generated HTML. Do not store API tokens or account credentials in this variable.

The GitHub Actions Worker deployment uses the existing `CLOUDFLARE_ACCOUNT_ID` variable and `CLOUDFLARE_AI_SEARCH_TOKEN` secret. That token needs these Cloudflare account permissions:

```text
AI Search:Edit
AI Search:Run
Workers Scripts:Edit
```

## Attribution model

Traffic attribution uses two layers:

- Referrer: discovers organic traffic from search engines, websites, apps, and other sources when the browser sends a referrer.
- UTM: provides deterministic attribution for articles syndicated by this repository.

`scripts/distribute.mjs` automatically appends these values to the clickable original-article link in each generated platform copy:

- `utm_source=<platform>`
- `utm_medium=referral`
- `utm_campaign=article_syndication`

Supported source values:

| Platform | `utm_source` |
| --- | --- |
| CNBlogs | `cnblogs` |
| Juejin | `juejin` |
| CSDN | `csdn` |
| SegmentFault | `segmentfault` |
| Zhihu | `zhihu` |
| 51CTO | `51cto` |
| OSChina | `oschina` |
| Toutiao | `toutiao` |

The generated `canonicalUrl` remains clean and never contains UTM parameters. This preserves SEO canonicalization while the reader-facing original link carries attribution.

UTM parameters belong on the external landing URL only. Internal navigation does not copy them to article URLs. For example, a visitor may enter `/` with `?utm_source=...` and then navigate to a clean `/articles/.../` URL. That is expected: internal links stay canonical and shareable instead of accumulating campaign parameters.

For a syndicated link that lands directly on an article, the article pageview itself carries the UTM parameters and can be analyzed with the UTM report. For a campaign that lands on the homepage and later reaches an article through clean internal navigation, use Umami's Attribution report with the article's Viewed page as the target and First-Click or Last-Click attribution; do not propagate UTM parameters through internal links.

## What to inspect in Umami

For routine review, use:

- Pages / URLs: views and visitors per article.
- Referrers: organic referring domains such as Google, Bing, GitHub, CSDN, or CNBlogs.
- UTM report: compare syndicated platforms by `utm_source` for landing pages carrying those parameters.
- Attribution report: connect an earlier campaign/referrer touchpoint to a later article pageview when the reader navigates internally.

Google Search Console remains the source of truth for Google search queries, impressions, clicks, CTR, and ranking position. Umami is used for on-site traffic and referral attribution.
