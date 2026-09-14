# Private blog analytics

The site uses Umami Cloud for private traffic analytics. No article view count is rendered to readers.

## Production activation

1. Create a website in Umami Cloud for `thinkerqaq.github.io`.
2. Copy the Umami website ID.
3. In GitHub, open the repository settings and create an Actions variable:

   - Name: `PUBLIC_UMAMI_WEBSITE_ID`
   - Value: the Umami website ID

4. Re-run the Pages deployment or push a new commit to `master`.

The tracker is injected once by `src/layouts/BaseLayout.astro`. If the variable is absent, no analytics script is emitted. The tracker is restricted with `data-domains="thinkerqaq.github.io"`, so local development visits do not pollute production analytics.

The Umami website ID is public by design because it is embedded in the generated HTML. Do not store API tokens or account credentials in this variable.

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

## What to inspect in Umami

For routine review, use:

- Pages / URLs: views and visitors per article.
- Referrers: organic referring domains such as Google, Bing, GitHub, CSDN, or CNBlogs.
- UTM report: compare syndicated platforms by `utm_source`.
- Combine URL and UTM filters to answer which platform sent traffic to which article.

Google Search Console remains the source of truth for Google search queries, impressions, clicks, CTR, and ranking position. Umami is used for on-site traffic and referral attribution.
