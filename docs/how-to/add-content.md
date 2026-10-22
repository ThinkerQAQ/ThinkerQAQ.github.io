# Add or update an article

Edit the content repository, then reassemble it into the engine. The [first-site tutorial](../tutorial/first-site.md) includes a complete minimal article.

1. Create or edit `blog-content/src/content/articles/YOUR_ID.md`.
2. Set title, description, timestamp, language and status. Published articles need cover URL and cover alt text. See [all fields](../reference/content-schema.md).
3. Put local images under `blog-content/public/media/` and reference them as `/media/...`.
4. From the engine root:

```bash
go run ./tools/blogctl/cmd site assemble --content-root ../blog-content
npm run check
npx --no-install astro dev --port 4321
```

If a dev server is already running, only reassemble and run `check`. Inspect `/articles/YOUR_ID/` (or `/en/articles/YOUR_ID/`) for title, body, images and language links. Stop the server before a full build/preview.

For a new draft, omit `status` or use `draft`. To preview article drafts in Bash, start Astro with `INCLUDE_DRAFTS=true`; set the equivalent environment variable in PowerShell. Keep that flag out of production builds unless draft publication is intentional.

When updating a published article, retain its ID and `publishedAt`; set `updatedAt` for a substantive revision. Formatting changes do not require changing dates. Commit source Markdown and media to the content repository. Run `npm run build` after assembly when checking final rendering and references.

Publishing the website and updating copies on external platforms are separate operations: follow [deployment](deploy.md) and [BlogCTL publishing](../../tools/blogctl/docs/tutorial/first-publish.md) as needed.
