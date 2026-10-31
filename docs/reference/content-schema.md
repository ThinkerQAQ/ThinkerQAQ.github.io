# Content fields and relationships

All paths below are relative to the **content repository**. Assembly copies them into the engine. Collection validation is implemented in [`src/content.config.ts`](../../src/content.config.ts); route and translation behavior is in [`src/lib/content.ts`](../../src/lib/content.ts).

## Collections

| Directory under `src/content/` | Purpose | Identifier |
| --- | --- | --- |
| `articles/` | Articles, including `en/` translations | Relative filename without `.md` |
| `notes/` | Notes and their category/topic navigation | Relative filename without `.md` |
| `note-translations/` | Translated note bodies | `translationOf` points to the original note ID |
| `projects/` | Project summaries, links and body | Relative filename without `.md` |
| `project-translations/` | Translated project bodies | `translationOf` points to the original project ID |
| `series/` | Reading order and related notes | Relative filename without `.md` |
| `pages/` | Static pages such as `about.md` and `en/about.md` | Relative filename without `.md` |
| `life/` | Photography and caption records | Relative filename without `.md` |
| `workout-summaries/` | Monthly public fitness totals | JSON files containing a `YYYY-MM` month |

Images belong in `public/media/`; content uses `/media/...` URLs. `src/data/content-manifest.json` holds imported-note provenance and indexability metadata. Start from the [template](https://github.com/ThinkerQAQ/inkerio-content-template) if you need a working manifest.

## Static pages and site copyright

`pages/about.md` and `pages/en/about.md` provide `/about/` and `/en/about/`. Their frontmatter requires `title`, `description`, `seoDescription`, and `language` (`zh` or `en`). The body is standard Markdown. The engine renders it and supplies the layout and SEO; a missing locale is a build error.

`site/copyright.json` is a regular JSON configuration file, **not** an Astro collection. The content assembler copies it into the engine's generated `src/content/`. It requires `zh` and `en` objects with `title`, `notice` (article/note/Life detail), `photo` (Life indexes), `syndication` (BlogCTL), and `source` (original-link label). The About copyright paragraph is a human-readable summary of this policy, not a separate license.

## Articles

Articles also accept `defaultView: markdown | mindmap` (default `markdown`). All article and note detail pages offer reading/mind-map switching; this field only chooses the initial view. Article translations configure it independently and render their own body.

| Field | Required / default | Meaning |
| --- | --- | --- |
| `title`, `description` | Required strings | Page title and summary |
| `publishedAt` | Required | Quoted ISO timestamp with timezone, e.g. `"2026-10-22T10:00:00+08:00"` |
| `updatedAt` | Optional | Timestamp for a substantive revision |
| `language` | `zh` | `zh` or `en` |
| `status` | `draft` | `draft` or `published` |
| `coverImage`, `coverImageAlt` | Required when published | Cover URL and readable alternative text |
| `tags` | `[]` | YAML list of strings |
| `featured` | `false` | Featured-content selection |
| `translationOf` | Optional | Original article ID; translations point directly to the root article |
| `series`, `project` | Optional | Series/project IDs |
| `sourceNote` | Optional | Source note ID |
| `relatedNotes` | `[]` | Note IDs validated as collection references |

`articles/hello.md` with `language: zh` appears at `/articles/hello/`. `articles/en/hello.md` with `language: en` appears at `/en/articles/hello/`. File IDs retain nested directories; changing a title does not rename a route.

Drafts are excluded by default, including local preview. `INCLUDE_DRAFTS=true` enables article draft preview; RSS still includes published articles only. The [first-site tutorial](../tutorial/first-site.md) contains a complete article example.

## Notes and translations

Notes require `title`, `description`, `sourcePath`, `category`, `categoryLabel`, positive integer `order`, and `updatedAt`. `sourcePath` records provenance; `category` is a route identifier and `categoryLabel` its display text. `topic`, `topicLabel`, and `topicPath` optionally organize topics; each `topicPath` item has an `id` and optional `label`.

`status` is `active` or `historical` (default `active`), not the article draft/published status. `tags`, `featured`, `indexable`, `language`, optional `createdAt`, and optional `canonicalPath` control presentation and indexing. `indexable` defaults to `true`. `defaultView` accepts `markdown` or `mindmap` and defaults to `markdown`; set `defaultView: mindmap` to prefer the generated mind map when JavaScript is available. A translated page inherits this preference from its original note but builds the map from its own translated Markdown body.

The mind-map renderer is based on Markdown headings and nested lists, with zoom, pan, fit, collapse, and fullscreen controls. It does not parse `.xmind` files directly; see [mind-map authoring](../how-to/mindmap-notes.md) and the bilingual public template example.

A note translation requires `title`, `description`, `translationOf`, `language`, and `updatedAt`; its body is translated Markdown. For an original `notes/go/memory.md`, use `translationOf: go/memory` to keep the English route `/en/notes/go/memory/` attached to that original.

## Projects and series

| Collection | Required fields | Optional relationships |
| --- | --- | --- |
| Project | `title`, `description`, `status`, `startedAt`, `updatedAt` | `github`, `tutorials`, `documentation`, `translations`, `tags`, `featured` |
| Series | `title`, `description`, `status`, `updatedAt` | `project`, `relatedArticles`, `relatedNotes`, `relatedNoteCategories`, `relatedNoteScopes`, `translations`, `featured` |

Project status: `exploring`, `building`, `maintained`, `completed`. Series status: `planned`, `active`, `complete`. These dates use date coercion and accept values such as `2026-10-22`.

`relatedArticles` lists **root article IDs in reading order**. Add an article's `series` field as well so its page can find that series. English navigation uses translations of the listed originals.

Project `translations.en` provides translated title, description and optional tags. A separate file under `project-translations/` supplies a translated body with required `translationOf`, `language`, and `updatedAt`.

**Homepage project pinning:** The homepage shows up to 3 projects, prioritizing `featured: true` and then sorting by `updatedAt` descending; pinned projects are also ordered by update date. `featured` defaults to `false` when omitted. The full `/projects/` listing remains ordered only by update date. The English homepage includes only projects with `translations.en` metadata.

Project `tutorials` and `documentation` accept either an associated root article ID or an external resource:

```yaml
documentation:
  - title: "使用说明"
    url: "https://example.com/docs/"
    description: "安装与配置"
    translations:
      en:
        title: "User guide"
        url: "https://example.com/en/docs/"
        description: "Installation and configuration"
```

## Photography and fitness

Life records require a timezone-bearing `publishedAt`. `status` defaults to `draft`, `language` to `zh`, and `images` to `[]`; title and description are optional. Each image needs `src`, positive integer `width` and `height`, with optional `thumbnail` and `alt`. Life drafts stay hidden even when article draft preview is enabled.

Workout JSON requires `month` (`YYYY-MM`) and `trainingDays` (integer 0–31); optional fields are `durationMinutes`, `volumeKg`, and `demo` (default `false`). Extra fields are rejected. See [Life records](../how-to/life-records.md) for complete examples and routes.

## Diagnose validation failures

| Symptom | Check |
| --- | --- |
| Published article rejected | Both cover fields and timezone in `publishedAt` |
| Page missing | `status`, language, selected content checkout, then rerun assembly |
| Translation missing or build fails | Exact root ID; original exists; translation points directly to it |
| Missing related note | ID relative to `notes/`, without extension |
| Series order wrong | `relatedArticles` order and article `series` field |
| Workout JSON rejected | Extra fields, malformed month, or invalid numeric values |

Run `npm run check` after assembly, then `npm run build` to validate route generation and cross-entry relationships.
