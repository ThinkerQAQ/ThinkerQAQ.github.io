# Blog Helpful Reactions Worker

This Worker backs the one-click `Helpful / 有帮助` reaction shown on article and note detail pages.

## Design

- Cloudflare Worker API: `GET`, `PUT`, `DELETE /v1/reactions`
- Cloudflare D1 stores one row per browser/content pair
- `PUT` and `DELETE` are idempotent
- The browser keeps a random UUID in `localStorage`
- The Worker stores only an HMAC-SHA256 hash of that UUID
- No GitHub login, email, raw visitor UUID, or IP is stored in D1
- Mutation requests are rate-limited to 30 per minute per Cloudflare client IP
- Allowed browser origins are restricted by `ALLOWED_ORIGINS`

## One-time Cloudflare setup

Run these commands from the repository root.

### 1. Create the D1 database

```bash
npx wrangler@latest d1 create thinkerqaq-blog-reactions --location apac
```

Cloudflare prints a database UUID. Replace `REPLACE_WITH_D1_DATABASE_ID` in `workers/blog-reactions/wrangler.jsonc` with that UUID.

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
https://thinkerqaq-blog-reactions.<your-subdomain>.workers.dev
```

### 5. Configure GitHub Pages

In GitHub, open:

`Settings -> Secrets and variables -> Actions -> Variables`

Create this repository variable:

```text
PUBLIC_REACTION_WORKER_URL=https://thinkerqaq-blog-reactions.<your-subdomain>.workers.dev
```

Then rerun the GitHub Pages deployment workflow.

The reaction component intentionally renders nothing while this variable is empty, so merging the code before Cloudflare setup does not break the blog.

## Local tests

```bash
npm run test:reactions
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

`contentType` accepts `article` or `note`. `contentId` is the Astro content collection ID, not the title.
