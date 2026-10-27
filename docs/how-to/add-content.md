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

## Notes on the home page

The homepage places **Projects → Recent Notes → Engineering Knowledge → Beyond Engineering** as separate peer sections after its article/series highlights. **Recent Notes** is a cross-category feed of individual notes; **Engineering Knowledge** and **Beyond Engineering** are curated category indexes using the same two-column layout.

- Recent Notes selects up to **3** indexable notes with `status: active` from **any category**, ordered by `updatedAt` descending. No more than **2 notes per category** appear at once. A tied date prefers `featured: true`, then the note's `order` and ID for stable results.
- Imported notes with `status: historical` remain accessible through the category indexes, but are not promoted into the recent list simply to fill empty slots.
- Only categories configured in the engine's `src/components/HomeKnowledgeHub.astro` appear in the two curated category sections. Add a category to the appropriate list to expose an archive entry; this does **not** affect Recent Notes eligibility.
- The English homepage only links to notes with a matching English `noteTranslations` entry; the displayed title, description and update date are localized from that translation.

See the [note schema](../reference/content-schema.md) and the [interactive mind-map guide](mindmap-notes.md).
