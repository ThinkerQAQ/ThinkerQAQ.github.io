# Blog Helpful Reactions Worker

This Worker backs the one-click `Helpful / 有帮助` reactions on article and note pages, and `Like / 点赞` on each fitness month and photography record.

## Design

- Cloudflare Worker API: `GET`, `PUT`, `DELETE /v1/reactions`
- Cloudflare D1 stores one row per browser/content pair
- `PUT` and `DELETE` are idempotent
- The browser keeps a random UUID in `localStorage`
- The Worker stores only an HMAC-SHA256 hash of that UUID
- No GitHub login, email, raw visitor UUID, or IP is stored in D1
- Mutation requests are rate-limited to 30 per minute per Cloudflare client IP
- Allowed browser origins are restricted by `ALLOWED_ORIGINS`
- Photography record pages use `contentType=life` and the content entry ID for an independent like count per post
- Fitness pages use `contentType=fitness` and the `YYYY-MM` month as the stable content ID; the fitness index and both locales share that month's reaction count

## One-time Cloudflare setup

Run these commands from the repository root.

### 1. Create the D1 database

```bash
npx wrangler@latest d1 create my-blog-reactions --location apac
```

Cloudflare prints a database UUID. In `workers/blog-reactions/wrangler.jsonc`, replace the checked-in `database_id` with your UUID and `database_name` with your database name. Keep the binding `REACTIONS_DB`. The checked-in ID is an existing author-owned database, not a placeholder. Also set your own Worker name and `ALLOWED_ORIGINS` before deploying.

### 2. Apply the schema

```bash
npx wrangler@latest d1 migrations apply REACTIONS_DB --remote --config workers/blog-reactions/wrangler.jsonc
```

### 3. Create the HMAC secret

Generate a random secret locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save it as a Worker secret:

```bash
npx wrangler@latest secret put REACTION_HMAC_SECRET --config workers/blog-reactions/wrangler.jsonc
```

Paste the generated value when Wrangler prompts for it.

### 4. Deploy the Worker

```bash
npx wrangler@latest deploy --config workers/blog-reactions/wrangler.jsonc
```

Wrangler will print a `workers.dev` URL similar to:

```text
https://my-blog-reactions.<your-subdomain>.workers.dev
```

### 5. Configure GitHub Pages

In GitHub, open:

`Settings -> Secrets and variables -> Actions -> Variables`

Create this repository variable:

```text
PUBLIC_REACTION_WORKER_URL=https://my-blog-reactions.<your-subdomain>.workers.dev
```

Then rerun the GitHub Pages deployment workflow.

The reaction component intentionally renders nothing while this variable is empty, so merging the code before Cloudflare setup does not break the blog.

## Local tests

```bash
node --test workers/blog-reactions/src/index.test.js
```

The tests cover empty state, duplicate `PUT`, duplicate `DELETE`, multiple visitors, origin validation, and rate limiting.

## API

All browser requests include the site `Origin` and an `X-Reaction-Visitor` browser UUID.

Read current state:

```http
GET /v1/reactions?contentType=article&contentId=<id>
```

Ensure the visitor has reacted:

```http
PUT /v1/reactions?contentType=article&contentId=<id>
```

Ensure the visitor has not reacted:

```http
DELETE /v1/reactions?contentType=article&contentId=<id>
```

Response:

```json
{
  "count": 12,
  "reacted": true
}
```

`contentType` accepts `article`, `note`, `fitness` or `life`. Article, note and life IDs are the content collection entry IDs; fitness uses the `YYYY-MM` month. IDs are stable identifiers, not titles.

## Integration boundaries

The reusable **Inkerio** engine owns the optional [`ContentReaction` component](https://github.com/ThinkerQAQ/inkerio/blob/main/src/components/ContentReaction.astro). It is omitted when the site build variable `PUBLIC_REACTION_WORKER_URL` is unset. This Worker and its D1 data, deployment names, origin whitelist and secret belong to the **site wrapper** and must not be copied into the generic engine repository. A health check with an invalid or missing `X-Reaction-Visitor` header intentionally returns a client error; to verify availability without writing, send a valid random UUID in the read-only GET request. Never use PUT/DELETE for deployment smoke tests.
