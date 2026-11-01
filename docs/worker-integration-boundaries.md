# Site Worker integrations and ownership

The reusable [Inkerio engine](https://github.com/ThinkerQAQ/inkerio) renders optional browser clients for Umami analytics, helpful reactions, and Ask Blog, but it **does not own** the author's Cloudflare D1/KV databases, API credentials or deployment bindings. Those remain here in the ThinkerQAQ site wrapper, not in engine source or in the independent SyndiRelay publisher.

| Site resource | Owner | Engine/client behavior | Activation |
| --- | --- | --- | --- |
| [`public/u.js`](../public/u.js), license sidecar | Site wrapper | Inkerio `BaseLayout` emits `/u.js`, only when site Umami ID and collector Origin exist | `PUBLIC_UMAMI_WEBSITE_ID`, `PUBLIC_UMAMI_PROXY_ORIGIN` |
| [`workers/blog-ai/`](../workers/blog-ai/) — analytics | Site wrapper | `/u.js` alternative route, `POST /api/send` Umami relay, analytics reporting and scheduled snapshots | Cloudflare Worker/KV, site origin and separate smoke-tested URL |
| [`workers/blog-ai/`](../workers/blog-ai/) — Ask Blog | Site wrapper | Inkerio's `AskBlogSession` is **disabled by default** and mounted only with explicit build opt-in | Worker `ASK_BLOG_ENABLED=true`, `PUBLIC_ASK_BLOG_ENABLED=true`, `PUBLIC_ASK_BLOG_WORKER_URL`, `PUBLIC_ASK_BLOG_TURNSTILE_SITE_KEY` |
| [`workers/blog-reactions/`](../workers/blog-reactions/) | Site wrapper | `ContentReaction` is absent when the endpoint is not configured | D1, `REACTION_HMAC_SECRET`, `PUBLIC_REACTION_WORKER_URL` |
| [`scripts/prepare-inkerio-deployment.mjs`](../scripts/prepare-inkerio-deployment.mjs) | Site wrapper | Overlays public verification assets and this site's `site.config.json` before engine build | Site CI |
| [`scripts/prepare-search-notify.mjs`](../scripts/prepare-search-notify.mjs) | Site wrapper | Generates ephemeral domain-scoped search settings for the pinned SyndiRelay CLI | Site CI, private provider credentials |

## Chinese mainland availability

The website serves `/u.js` as a **same-origin static file**, so browser script loading does not depend on `workers.dev`. However `data-host-url` currently points to `https://thinkerqaq-blog-ai.blog-ai.workers.dev`; browsers still POST analytics beacons cross-origin to its `/api/send` endpoint. This is **not a fully same-origin analytics pipeline**. An HTTP 200 from `/u.js`, the Worker's `/u.js`, or `/analytics/health` proves those resources are reachable from the testing network only; it does not prove collection succeeds for mainland visitors.

Do not silently change `PUBLIC_UMAMI_PROXY_ORIGIN` to `https://thinkerqaq.com` — the site is static and has **no same-origin `/api/send` POST reverse proxy**. A possible future setup is a first-party Worker custom domain with valid Cloudflare ownership, DNS/TLS and origin allowlist, or a verified origin reverse proxy route. Such a network migration needs an explicit live-domain test: compare browser POST response codes, multiple mainland networks, Umami counts, and rollback to the previous Worker origin. It is independent of the Inkerio source split.

## Independent deployment and safety

- Static Pages: [deploy.yml](../.github/workflows/deploy.yml) overlays site resources then builds using the pinned Inkerio commit. The same output is deployed to GitHub Pages and EdgeOne.
- Worker test CI: [worker-validate.yml](../.github/workflows/worker-validate.yml) runs Node.js unit tests for both Workers on PRs, **without Cloudflare credentials or deployment**.
- AI Worker: [worker-release.yml](../.github/workflows/worker-release.yml) deploys only when `src/` or `wrangler.jsonc` changes (or manual dispatch). Documentation-only changes do not redeploy.
- Reactions Worker: [worker-reactions-release.yml](../.github/workflows/worker-reactions-release.yml) follows the same deployment rule.
- Never commit Worker API tokens, user cookies, analytics client identifiers or D1 data to public source. Generic Inkerio users configure their own optional backend, not the author's endpoint.

See each Worker's README for detailed operations and tests. See [Inkerio integration reference](https://github.com/ThinkerQAQ/inkerio/blob/main/docs/reference/integrations.md) for reusable client behavior.
