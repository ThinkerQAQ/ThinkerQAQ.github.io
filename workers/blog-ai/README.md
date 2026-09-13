# Ask this blog Worker

Minimal Cloudflare Worker backend for the blog's **Ask / 问博客** feature.

## Architecture

1. The browser searches the existing Pagefind index.
2. It takes at most five relevant blog excerpts.
3. Before sending the question, the browser obtains a one-time Cloudflare Turnstile token.
4. The browser sends the question, excerpts and Turnstile token to `POST /chat`.
5. The Worker validates origin, input size, source URLs, rate limit and Turnstile, then calls Workers AI through the `env.AI` binding.
6. The response contains the answer and source links shown by the blog UI.

No Workers AI API key is stored in the browser or repository. `env.AI` is a Cloudflare binding.

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

When building the Astro site, provide the public site key:

```bash
PUBLIC_ASK_BLOG_TURNSTILE_SITE_KEY="<public-site-key>" npm run build
```

For local testing, Cloudflare provides dedicated test credentials. Use the always-pass test site key in the Astro build and put the always-pass test secret in `workers/blog-ai/.dev.vars`; never use those test credentials in production.

## Deploy manually

```bash
cd workers/blog-ai
npx wrangler@latest login
npx wrangler@latest deploy
```

After deployment, copy the Worker `/chat` URL and provide it when building the Astro site together with the Turnstile site key:

```bash
PUBLIC_ASK_BLOG_WORKER_URL="https://<worker-host>/chat" \
PUBLIC_ASK_BLOG_TURNSTILE_SITE_KEY="<public-site-key>" \
npm run build
```

For GitHub Pages later, both `PUBLIC_ASK_BLOG_WORKER_URL` and `PUBLIC_ASK_BLOG_TURNSTILE_SITE_KEY` can be ordinary build variables. Neither is a credential. The Turnstile **secret** stays in Cloudflare Worker Secrets.

## Security boundaries

- CORS only accepts origins in `ALLOWED_ORIGINS`. CORS is not treated as authentication.
- Every `/chat` request must include a Turnstile token and the Worker validates it with Cloudflare Siteverify before calling Workers AI.
- The Worker also validates the returned Turnstile hostname against the request origin and requires action `ask_blog`.
- Turnstile tokens are short-lived and single-use, so a captured token cannot be replayed indefinitely.
- Source URLs must belong to `BLOG_ORIGIN`, so the Worker cannot be used as a generic proxy for arbitrary URLs.
- Question length: max 1,000 characters.
- Sources: max 5, max 5,000 characters each, max 20,000 characters total.
- Worker rate limit: 10 calls per 60 seconds per connecting IP. The rate limit runs before Turnstile Siteverify to limit verification abuse as well as AI quota abuse.
- The prompt treats retrieved blog text as untrusted data and tells the model not to follow instructions embedded in it.

Turnstile reduces automated abuse; it does not turn this anonymous public feature into user authentication. A human visitor who passes Turnstile is still intentionally allowed to ask the blog.

The rate-limit `namespace_id` must be unique within your Cloudflare account if you later add other rate-limit bindings.
