# Ask this blog Worker

Minimal Cloudflare Worker backend for the blog's **Ask / 问博客** feature.

## Architecture

1. The browser searches the existing Pagefind index.
2. It sends at most five relevant blog excerpts to `POST /chat`.
3. This Worker validates origin, size and source URLs, applies a rate limit, then calls Workers AI through the `env.AI` binding.
4. The response contains the answer and the source links shown by the blog UI.

No Workers AI API key is stored in the browser or repository. `env.AI` is a Cloudflare binding.

## Deploy manually

```bash
cd workers/blog-ai
npx wrangler@latest login
npx wrangler@latest deploy
```

After deployment, copy the Worker `/chat` URL and provide it when building the Astro site:

```bash
PUBLIC_ASK_BLOG_WORKER_URL="https://<worker-host>/chat" npm run build
```

For GitHub Pages later, configure `PUBLIC_ASK_BLOG_WORKER_URL` as a non-secret build variable. The Worker URL is public; it is not a credential.

## Security boundaries

- CORS only accepts origins in `ALLOWED_ORIGINS`.
- Source URLs must belong to `BLOG_ORIGIN`, so the Worker cannot be used as a generic proxy for arbitrary context.
- Question length: max 1,000 characters.
- Sources: max 5, max 5,000 characters each, max 20,000 characters total.
- Worker rate limit: 10 calls per 60 seconds per connecting IP. This is quota protection for an anonymous public endpoint, not authentication.
- The prompt treats retrieved blog text as untrusted data and tells the model not to follow instructions embedded in it.
- No Turnstile in the MVP. Add it only if abuse becomes a real problem.

The rate-limit `namespace_id` must be unique within your Cloudflare account if you later add other rate-limit bindings.
