# Private blog analytics

The site uses Umami Cloud for private traffic analytics. No article view count is rendered to readers.

## Production activation

1. Create a website in Umami Cloud for `thinkerqaq.github.io`.
2. Copy the Umami website ID.
3. In GitHub, open the repository settings and create an Actions variable:

   - Name: `PUBLIC_UMAMI_WEBSITE_ID`
   - Value: the Umami website ID

4. Keep `PUBLIC_ASK_BLOG_WORKER_URL` configured. The analytics tracker reuses the origin of the existing blog Cloudflare Worker, so there is no second public proxy URL to maintain.
5. Deploy the Cloudflare Worker from `workers/blog-ai`, then re-run the Pages deployment or push a new commit to `master`.

The tracker is injected once by `src/layouts/BaseLayout.astro`. If the Umami website ID or Worker URL is absent, no analytics script is emitted. The tracker is restricted with `data-domains="thinkerqaq.github.io"`, so local development visits do not pollute production analytics.

The browser does not contact `cloud.umami.is` or `gateway.umami.is` directly. Instead:

- `GET <blog-worker-origin>/u.js` proxies the current Umami Cloud tracker from `https://cloud.umami.is/script.js`.
- `POST <blog-worker-origin>/api/send` proxies collection to `https://gateway.umami.is/api/send`.
- `data-host-url` points the tracker at the Worker origin so both the script and collection path avoid direct Umami hosts that are commonly blocked.
- The collection proxy only accepts requests whose `Origin` is `https://thinkerqaq.github.io`.

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

UTM parameters belong on the external landing URL only. Internal navigation does not copy them to article URLs. For example, a visitor may enter `/` with `?utm_source=...` and then navigate to a clean `/articles/.../` URL. That is expected: internal links stay canonical and shareable instead of accumulating campaign parameters.

## What to inspect in Umami

For routine review, use:

- Pages / URLs: views and visitors per article.
- Referrers: organic referring domains such as Google, Bing, GitHub, CSDN, or CNBlogs.
- UTM report: compare syndicated platforms by `utm_source`.
- Combine URL and UTM filters to answer which platform sent traffic to which article.

Google Search Console remains the source of truth for Google search queries, impressions, clicks, CTR, and ranking position. Umami is used for on-site traffic and referral attribution.
