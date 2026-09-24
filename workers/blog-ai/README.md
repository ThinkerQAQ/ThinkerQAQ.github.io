# Ask this blog Worker

Cloudflare Worker backend for the blog's **Ask / 问博客** feature.

## Architecture

The production path is:

1. The first question in a browser tab obtains a one-time Cloudflare Turnstile token.
2. After Turnstile succeeds, the Worker issues an origin-bound, signed Ask session token valid for 20 minutes.
3. Follow-up questions reuse that short-lived Ask session, so they do not run Turnstile again while the session is valid. Rate limiting still applies to every request.
4. The browser sends the current question plus a bounded recent conversation history to `POST /chat`.
5. The Worker validates origin, input size, history shape, rate limit and either the Ask session or Turnstile.
6. The Worker builds a contextual retrieval query from the current question plus the last one or two user questions, then queries Cloudflare AI Search with hybrid keyword + vector retrieval, RRF fusion, article-priority boosting and reranking.
7. The Worker sends the retrieved blog context plus recent conversational context to Workers AI. Conversation history is context only; factual claims must still be grounded in the current retrieval results.
8. The Worker returns the answer plus only the source links that the answer actually cites.

Conversation state and the short-lived Ask session token are kept in browser `sessionStorage`; the Worker does not persist chat sessions. Clearing the conversation also clears the Ask session. Pagefind remains dedicated to the site's normal interactive search, while the Worker is the sole trust boundary for retrieval and answer generation.

## AI Search setup

The Worker uses the `default` AI Search namespace and expects an instance named:

```text
thinkerqaq-blog
```

`wrangler.jsonc` declares the namespace binding as `AI_SEARCH`. The deployment sync script creates or upgrades the instance with:

- vector search enabled
- keyword/BM25 search enabled
- trigram keyword tokenizer for mixed Chinese + code identifiers
- keyword `or` matching for higher recall
- RRF fusion
- query rewriting disabled so technical identifiers stay intact
- numeric authority metadata (`articles=2`, `notes=1`) with descending relevance boosting
- `@cf/baai/bge-reranker-base` reranking
- 512-token chunks with a small overlap
- up to 20 retrieval candidates before Worker-side document deduplication and top-5 context selection

Only public Markdown under `src/content/{articles,notes}` is uploaded to AI Search built-in storage. Draft articles and notes with `indexable: false` are excluded. Deleted or newly private documents are removed from the AI Search instance.

The GitHub Pages deployment runs `scripts/sync-ai-search.mjs` after the site deploy and then runs `scripts/eval-ai-search.mjs` as a retrieval regression suite. Configure these repository values:

```text
Variable: CLOUDFLARE_ACCOUNT_ID
Variable: CLOUDFLARE_AI_SEARCH_INSTANCE=thinkerqaq-blog   # optional; this is the default
Secret:   CLOUDFLARE_AI_SEARCH_TOKEN
```

The same `CLOUDFLARE_AI_SEARCH_TOKEN` is also used by GitHub Actions to deploy this Worker automatically. Create it as a Cloudflare custom API token with:

```text
Account > AI Search:Edit
Account > AI Search:Run
Account > Workers Scripts:Edit
```

The sync job fails on missing credentials, unrecoverable Cloudflare API errors, indexing errors, or failed readiness/search checks. Cloudflare indexing may continue asynchronously after the instance becomes searchable; the regression step verifies representative queries against the live index.

## Turnstile and Ask session setup

Create a Turnstile widget in the Cloudflare dashboard and allow the production hostname:

```text
thinkerqaq.github.io
```

The widget gives you two values:

- **Site Key**: public; it is embedded in the Astro page.
- **Secret Key**: private; it is stored only as a Cloudflare Worker Secret.

Store the Turnstile Worker secret from `workers/blog-ai`:

```bash
npx wrangler@latest secret put TURNSTILE_SECRET_KEY
```

No additional secret is required for the 20-minute Ask session: the Worker derives a domain-separated signing key from the existing Turnstile secret. If you want independent key rotation, you may optionally configure a dedicated secret:

```bash
npx wrangler@latest secret put ASK_SESSION_SECRET
```

When present, `ASK_SESSION_SECRET` is preferred. Neither secret may be committed to Git or exposed to frontend JavaScript.

For local testing, Cloudflare provides dedicated test credentials. Use the always-pass test site key in the Astro build and put the always-pass test secret in `workers/blog-ai/.dev.vars`; never use those test credentials in production.

## Analytics snapshots

The same Worker also owns the lightweight Umami reporting path.

- A Cloudflare Cron Trigger runs at minute 7 of every hour.
- Complete UTC-hour buckets are persisted in the `ANALYTICS_KV` namespace.
- If a scheduled run was missed, the next run backfills up to four missing hours and keeps the remaining backlog visible through health metadata.
- `GET /analytics/hourly` returns the latest complete hour, the immediately preceding hour, and their delta.
- `GET /analytics/today` queries the exact current Beijing-calendar-day window, persists it briefly in KV, and caches the response for five minutes.
- `GET /analytics/health` exposes the last successful collection, pending-hour count, and last error.
- Cache API is only a read-through hot cache; KV remains the durable source for hourly snapshots.

The KV binding is declared without a hard-coded namespace ID so current Wrangler versions can auto-provision it on first deployment. If the deployment token is not allowed to create KV resources, create/bind the namespace once in Cloudflare and keep the binding name `ANALYTICS_KV`.

The legacy GitHub Actions hourly snapshot remains temporarily available as a fallback while the Worker path is being verified in production.

## Deploy the Worker

Worker deployment is handled by `.github/workflows/worker-release.yml`. A push to `main` that changes `workers/blog-ai/**` (or the release workflow itself) runs the Worker test suite and then deploys with:

```text
wrangler deploy --config workers/blog-ai/wrangler.jsonc
```

GitHub Actions authenticates non-interactively with the existing `CLOUDFLARE_ACCOUNT_ID` variable and `CLOUDFLARE_AI_SEARCH_TOKEN` secret. Worker release and GitHub Pages deployment are separate workflows; neither workflow waits for the other.

You do not need to run `wrangler login` or `wrangler deploy` locally for normal Worker releases.

After deployment, the existing `/chat` URL remains the frontend endpoint. For the GitHub Pages build, keep these public repository variables configured:

```text
PUBLIC_ASK_BLOG_WORKER_URL
PUBLIC_ASK_BLOG_TURNSTILE_SITE_KEY
```

Neither is a credential. Worker secrets stay only in Cloudflare.

## Multi-turn request contract

The first request can ask the Worker to mint a reusable security session:

```json
{
  "question": "Go CAS 为什么可以无锁？",
  "history": [],
  "turnstileToken": "...",
  "requestSession": true
}
```

A successful response may include:

```json
{
  "sessionToken": "...",
  "sessionExpiresAt": 1789350000000
}
```

Follow-up requests reuse that token:

```json
{
  "question": "那 ARM 呢？",
  "history": [
    { "role": "user", "content": "Go CAS 为什么可以无锁？" },
    { "role": "assistant", "content": "……[1]" }
  ],
  "sessionToken": "..."
}
```

History is bounded to six recent `user`/`assistant` messages and is used only to resolve follow-up context. Retrieval uses the current question plus up to the two most recent user questions; assistant answers are not inserted into the search query.

If the Ask session has expired or is invalid, the Worker returns `401` with `requiresTurnstile: true`; the browser performs Turnstile again and retries the question once. The response contains only sources actually cited by the generated answer. Each source includes its original `citationIndex`, so an answer that cites `[1]` and `[4]` can render source numbers 1 and 4 without implying that sources 2 and 3 were used.

## Security boundaries

- CORS only accepts origins in `ALLOWED_ORIGINS`. CORS is not treated as authentication.
- The first question requires Turnstile. A successful verification can mint an origin-bound HMAC-signed Ask session valid for 20 minutes.
- Follow-up requests may use the Ask session instead of a fresh Turnstile token. The session is stored only in browser `sessionStorage` and is cleared with the conversation or when the tab closes.
- The Worker validates the returned Turnstile hostname against the request origin and requires action `ask_blog`.
- Turnstile tokens are short-lived and single-use.
- Worker rate limiting applies to every question, including valid Ask sessions: 10 calls per 60 seconds per connecting IP.
- AI Search item keys are decoded only for known blog collections before being exposed as source URLs.
- Question length: max 1,000 characters.
- Conversation history: max 6 messages, max 3,000 characters per message, max 9,000 characters total.
- AI Search context: max 5 documents, max 5,000 characters each, max 20,000 characters total.
- Request body: max 24 KiB, enforced on the bytes actually read so requests without `Content-Length` cannot bypass the limit.
- Conversation history and retrieved blog text are treated as untrusted context in the prompt and cannot override system instructions.
- The prompt explicitly keeps primitive-level properties separate from algorithm-level guarantees; using a primitive such as CAS does not by itself prove a whole algorithm is lock-free.

Turnstile reduces automated abuse; it does not turn this anonymous public feature into user authentication. A human visitor who passes Turnstile is intentionally allowed to ask the blog.
