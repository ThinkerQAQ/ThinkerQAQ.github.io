# Canonical content and schema

**Authority:** [`src/content.config.ts`](../../src/content.config.ts) defines the Astro collections; [`tools/blogctl/cmd/site.go`](../../tools/blogctl/cmd/site.go) defines the assembly route. This reference intentionally points to the schema instead of maintaining a second handwritten field inventory.

| Collection | Canonical input |
| --- | --- |
| Articles | `blog-content/src/content/articles/` |
| Notes | `blog-content/src/content/notes/` |
| Note translations | `blog-content/src/content/note-translations/` |
| Projects | `blog-content/src/content/projects/` |
| Series | `blog-content/src/content/series/` |
| Media | `blog-content/public/media/` |

The source repository is separate; `src/content/` inside the engine is the assembled build input. For a runnable example, use [the content template](https://github.com/ThinkerQAQ/blog-content-template) or [repository fixtures](../examples/fixtures.md).

Content schema changes require updating both the parser/collections and their verified examples; do not derive field definitions from an old article in isolation.
