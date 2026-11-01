# Blog AI and analytics Worker

This Worker serves Umami tracking and analytics reports, scheduled snapshots, and an optional Ask Blog API. The entry point is `src/policy-worker.js`, configured in [wrangler.jsonc](wrangler.jsonc).

**Public Ask Blog is currently disabled.** `ASK_BLOG_ENABLED: "false"` makes `/chat` return 404 before Turnstile, retrieval or model calls; a missing setting also disables it. The Astro layout does not mount the Ask UI. Tracking, reporting and the cron remain active.

## Configure your own deployment

The checked-in configuration belongs to the author's deployment. Before deploying a fork:

| Setting | Action |
| --- | --- |
| Worker `name` | Choose your own service name |
| `ANALYTICS_KV` | Create a KV namespace in your account and replace the existing namespace ID |
| `BLOG_ORIGIN`, `ALLOWED_ORIGINS` | Set your canonical site and allowed local/production origins |
| `UMAMI_SHARE_SLUG` | Use your own Umami shared report |
| `AI_SEARCH`, `AI_SEARCH_INSTANCE` | Bind your own AI Search namespace and instance if using retrieval |
| `AI_MODEL` | Select a model available to your account |
| Release workflow | Replace the hardcoded smoke-test base URL with your own Worker URL |

Leave the public Ask endpoint disabled until its configuration and frontend are ready. Do not remove the whole Worker to disable chat: the site may also use its `/u.js`, `/api/send` and analytics endpoints.

### Ownership and mainland collection reliability

`public/u.js` is a **site-owned pinned Umami browser bundle**. `scripts/prepare-inkerio-deployment.mjs` copies it to the built Inkerio site; the generic engine only conditionally emits a `<script src="/u.js">` tag. The bundle is served from the site domain, but it currently sends browser beacons to this Worker (`/api/send`) at `workers.dev`, which remains a separate origin. HTTP 200 from `/u.js` or `/analytics/health` does not prove that a particular mainland visitor successfully posted a beacon.

For a site-specific alternative, provide a custom-domain Worker origin (after configuring Cloudflare ownership, TLS, DNS and the Worker's origin allowlist), and set the build variable `PUBLIC_UMAMI_PROXY_ORIGIN` to that origin. **Do not set the static site's origin unless a real POST-capable reverse proxy exists for `/api/send`**; GitHub Pages/EdgeOne static output cannot act as such a proxy by itself. Before switching, compare actual browser POST response rates and Umami counts across both paths and preserve the prior Worker origin as rollback. Keep the proxy and Cloudflare credentials in this site deployment layer, not Inkerio source.


## Analytics

A cron at minute 7 of every hour collects complete UTC-hour snapshots and the previous two complete calendar weeks from Umami. A run backfills up to four missing hours; health reports the remaining backlog.

| Route | Parameters / default |
| --- | --- |
| `/analytics/hour-range` | Inclusive ISO hour labels with timezone; previous complete hour; max 48 hours |
| `/analytics/day-range` | Inclusive `YYYY-MM-DD` dates in Asia/Shanghai; today to now; max 31 days |
| `/analytics/weekly-range` | Inclusive Monday dates in Asia/Shanghai; previous complete week; max 12 weeks |
| `/analytics/health` | Collection health, last successful collection and pending hours |

Supply `start` and `end` together or omit both. The old `/analytics/hourly`, `/analytics/today` and `/analytics/weekly` routes return 404.

```text
/analytics/hour-range?start=2026-10-10T00:00:00Z&end=2026-10-10T03:00:00Z
/analytics/day-range?start=2026-10-08&end=2026-10-10
/analytics/weekly-range?start=2026-09-28&end=2026-10-05
```

Visitors are deduplicated over the entire requested window, not summed across buckets. Matching complete buckets reuse scheduled KV snapshots; other complete ranges can be cached for seven days. Recent or unfinished ranges use a 60-second response cache. Public responses omit website IDs, region/city breakdowns and raw internal errors. See the site analytics boundary described in this worker's configuration.

## Optional AI Search pipeline

The separately maintained **SyndiRelay** CLI (`ai-search prepare|sync|verify`) owns the indexing pipeline. Its repository is currently private; the public website wrapper checks out a fixed audited commit in GitHub Actions. The former `scripts/sync-ai-search.mjs` and `scripts/eval-ai-search.mjs` are no longer entry points.

From this **site wrapper repository**, review [the deployment workflow](../../.github/workflows/deploy.yml) and the private SyndiRelay `cmd/ai_search.go` implementation (requires access). Do not try to run deleted `tools/blogctl` source or checkout a site engine to invoke AI Search. Synchronization writes to Cloudflare; verification queries the live index.

The pipeline uploads eligible public Markdown from assembled articles and notes; draft articles and notes with `indexable: false` are excluded. It removes stale items. The instance uses vector and keyword retrieval, trigram tokenization, RRF fusion, article-priority metadata and reranking. The Worker deduplicates results and selects up to five context documents. Pagefind remains the independent static-site search.

Actions configuration:

```text
Variable: CLOUDFLARE_ACCOUNT_ID
Variable: CLOUDFLARE_AI_SEARCH_INSTANCE (optional; default thinkerqaq-blog)
Secret:   CLOUDFLARE_AI_SEARCH_TOKEN
```

The current workflows use the token for AI Search and Worker deployment. Configure account permissions for AI Search Edit/Run and Workers Scripts Edit as required by the operations you enable. Provision the KV binding separately.

## Enable Ask Blog

1. Configure the AI Search binding and a populated instance.
2. Create a Turnstile widget allowing **your actual website hostname**.
3. Store `TURNSTILE_SECRET_KEY` as a Worker secret.
4. Optionally store `ASK_SESSION_SECRET` for independent session-key rotation. Otherwise session signing derives a separate key from the Turnstile secret.
5. Set `ASK_BLOG_ENABLED` to `"true"` and deploy the Worker.
6. On the **Inkerio build**, explicitly set `PUBLIC_ASK_BLOG_ENABLED=true`, `PUBLIC_ASK_BLOG_WORKER_URL` and `PUBLIC_ASK_BLOG_TURNSTILE_SITE_KEY`, then rebuild the static site. Inkerio mounts `AskBlogSession` only with all three settings; no engine source edit is needed. Keep this switch unset/false until a live Worker and Turnstile test pass.

From the site wrapper repository root:

```bash
npx wrangler@latest secret put TURNSTILE_SECRET_KEY --config workers/blog-ai/wrangler.jsonc
```

The site key and Worker URL are public build settings; secret keys stay in Cloudflare. Local Turnstile test credentials belong only in local environment files and must not be deployed.

## Chat request contract

The first request to `POST /chat` includes a one-time Turnstile token:

```json
{
  "question": "How does the blog build its search index?",
  "history": [],
  "turnstileToken": "...",
  "requestSession": true
}
```

A successful response may include `sessionToken` and `sessionExpiresAt`. Subsequent requests use `sessionToken` instead of another Turnstile token and may include recent `user`/`assistant` messages.

The browser keeps conversation and session state in `sessionStorage`. The Worker does not persist chat sessions. Clearing the conversation clears the token. An invalid or expired session returns 401 with `requiresTurnstile: true`; the client obtains Turnstile again and retries once.

Retrieval uses the question and up to two recent user questions. Assistant responses are not search queries. Generated factual answers use the retrieved documents; responses include only cited sources and retain their original `citationIndex`.

## Limits and security

| Input / resource | Limit |
| --- | --- |
| Question | 1,000 characters |
| History | 6 messages; 3,000 characters each; 9,000 total |
| Request body | 24 KiB, checked on bytes read |
| Retrieved context | 5 documents; 5,000 characters each; 20,000 total |
| Ask session | 20 minutes, signed and bound to the requesting origin |
| Rate limit | 10 requests per 60 seconds per connecting IP, including valid sessions |

Origins must be in `ALLOWED_ORIGINS`. Turnstile verifies the hostname against the origin and requires action `ask_blog`. CORS does not authenticate callers; Turnstile permits human visitors rather than identifying an account. Conversation and retrieved text remain untrusted prompt context. Source keys are decoded only for known collections.

## Tests and releases

```bash
node --test workers/blog-ai/src/*.test.js
```

[worker-release.yml](../../.github/workflows/worker-release.yml) tests, deploys and smoke-tests the range endpoints on matching pushes to `main` or manual dispatch. It is separate from the site deployment. The checked-in smoke-test URL targets the author's Worker; update it for a fork.

For an intentional manual deployment:

```bash
npx wrangler@latest deploy --config workers/blog-ai/wrangler.jsonc
```

Deploy only after replacing the account-specific settings and provisioning resources.
