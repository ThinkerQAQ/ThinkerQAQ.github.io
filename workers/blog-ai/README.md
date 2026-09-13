# Ask this blog Worker

Cloudflare Worker backend for the blog's **Ask / 问博客** feature.

## Architecture

The production path is:

1. Before sending the question, the browser obtains a one-time Cloudflare Turnstile token.
2. The browser sends only the question and Turnstile token to `POST /chat`.
3. The Worker validates origin, input size, rate limit and Turnstile.
4. The Worker queries Cloudflare AI Search with hybrid keyword + vector retrieval, RRF fusion, query rewriting and reranking.
5. The Worker sends the retrieved blog context to Workers AI and returns the answer plus source links.

The browser never supplies AI context. Pagefind remains dedicated to the site's normal interactive search, while the Worker is the sole trust boundary for retrieval and answer generation.

## AI Search setup

The Worker uses the `default` AI Search namespace and expects an instance named:

```text
thinkerqaq-blog
```

`wrangler.jsonc` declares the namespace binding as `AI_SEARCH`. The deployment sync script creates or upgrades the instance with:

- vector search enabled
- keyword/BM25 search enabled
- trigram keyword tokenizer for mixed Chinese + code identifiers
- RRF fusion
- query rewriting
- `@cf/baai/bge-reranker-base` reranking
- 512-token chunks with a small overlap

Public Markdown under `src/content/{articles,notes,projects,series}` is uploaded to AI Search built-in storage. Draft articles and notes with `indexable: false` are excluded. Deleted or newly private documents are removed from the AI Search instance.

The GitHub Pages deployment runs `scripts/sync-ai-search.mjs` after the site deploy. Configure these repository values:

```text
Variable: CLOUDFLARE_ACCOUNT_ID
Variable: CLOUDFLARE_AI_SEARCH_INSTANCE=thinkerqaq-blog   # optional; this is the default
Secret:   CLOUDFLARE_AI_SEARCH_TOKEN
```

Create `CLOUDFLARE_AI_SEARCH_TOKEN` as a Cloudflare custom API token with:

```text
Account > AI Search:Edit
Account > AI Search:Run
```

If the account ID or token is absent, the sync job exits successfully with `status=skipped`, so GitHub Pages deployment is not blocked.

## Turnstile setup

Create a Turnstile widget in the Cloudflare dashboard and allow the production hostname:

```text
thinkerqaq.github.io
```

The widget gives you two values:

- **Site Key**: public; it is embedded in the Astro page.
- **Secret Key**: private; it is stored only as a Cloudflare Worker Secret.

Store the Worker secret from `workers/blog-ai`:

```bash
npx wrangler@latest secret put TURNSTILE_SECRET_KEY
```

Do not put the secret key in Astro environment variables, source files, `wrangler.jsonc`, or GitHub Pages JavaScript.

For local testing, Cloudflare provides dedicated test credentials. Use the always-pass test site key in the Astro build and put the always-pass test secret in `workers/blog-ai/.dev.vars`; never use those test credentials in production.

## Deploy the Worker

The AI Search namespace binding is a Worker binding, so redeploy the Worker after changing `wrangler.jsonc` or Worker code:

```bash
cd workers/blog-ai
npx wrangler@latest login
npx wrangler@latest deploy
```

After deployment, the existing `/chat` URL remains the frontend endpoint. For the GitHub Pages build, keep these public repository variables configured:

```text
PUBLIC_ASK_BLOG_WORKER_URL
PUBLIC_ASK_BLOG_TURNSTILE_SITE_KEY
```

Neither is a credential. The Turnstile **secret** stays in Cloudflare Worker Secrets.

## Security boundaries

- CORS only accepts origins in `ALLOWED_ORIGINS`. CORS is not treated as authentication.
- Every `/chat` request must include a Turnstile token and the Worker validates it with Cloudflare Siteverify before calling retrieval or Workers AI.
- The Worker validates the returned Turnstile hostname against the request origin and requires action `ask_blog`.
- Turnstile tokens are short-lived and single-use.
- AI Search item keys are decoded only for known blog collections before being exposed as source URLs.
- Question length: max 1,000 characters.
- AI Search context: max 5 documents, max 5,000 characters each, max 20,000 characters total.
- Request body: max 16 KiB, enforced on the bytes actually read so requests without `Content-Length` cannot bypass the limit.
- Worker rate limit: 10 calls per 60 seconds per connecting IP.
- Retrieved blog text is treated as untrusted reference material in the prompt and cannot override system instructions.

Turnstile reduces automated abuse; it does not turn this anonymous public feature into user authentication. A human visitor who passes Turnstile is intentionally allowed to ask the blog.
