# Life records

Life exposes two shared navigation tabs: **Photography** (the default view at `/life/` or `/en/life/`) and **Fitness** (public monthly aggregates at `/life/fitness/` or `/en/life/fitness/`). There is no combined All tab. Photography reads caption-and-album records from the separate `life` collection; Fitness reads strict `workoutSummaries` JSON.

Canonical personal entries belong in the private BlogContent repository at `src/content/life/`. Public fictional examples belong in the separate [inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template) repository, **not** in the engine. The engine only defines the schema and rendering; assembly copies a selected content repository into ignored build inputs.

## Import a Moments post

Create one Markdown file for one original post. Keep its original publication timestamp, text, image order, and timezone. The engine sorts by `publishedAt`, never by the migration time or file creation time.

```yaml
---
publishedAt: "2024-08-18T18:30:00+08:00"
status: published
language: zh
location: 杭州
tags: [摄影]
images:
  - src: /media/life/hangzhou/lake.jpg
    thumbnail: /media/life/hangzhou/lake-thumb.jpg
    alt: 傍晚的湖面
    width: 2400
    height: 1600
---

原朋友圈文案。
保留原来的换行。

2026 年补记：这里可以写后来补充的感想。
```

- `title` and `description` are optional. There is no cover-image requirement.
- Quote timestamps and include a timezone. Dates and year archives display in Asia/Shanghai, including posts published around midnight.
- Set `updatedAt` only for substantive additions or edits. Copying files and adjusting formatting need not change the visible date.
- `status` defaults to `draft`. Only `published` entries generate public pages, including in development.
- `language` defaults to `zh`. English records use `en`; untranslated Chinese records are not presented as English translations.
- `images` has no count limit and may be empty. `width` and `height` must be the full image's actual pixel dimensions; these let PhotoSwipe fit landscape, portrait, and panorama images correctly.
- Use a site-root path or an HTTP(S) image URL. Local assets belong in the content repository's `public/media/`, which the existing assembly step copies. `thumbnail` is optional; supplying a smaller image avoids downloading the full image in the timeline.
- Use image descriptions for `alt`. Remove private details from text and photos before marking an entry as published.

## Reading and albums

One image preserves its aspect ratio; two to four images use two columns; five or more use three columns. The timeline shows at most nine thumbnails. Opening any thumbnail gives access to the entire album in its original order through PhotoSwipe, with keyboard navigation, touch gestures, and zoom.

Record pages show the first nine thumbnails and load nine more per click. Without JavaScript, image links and a list of the remaining photos are available. The viewer code loads only when a photo is opened.

Long text is expandable on the timeline and complete on the record page. Markdown supports text interleaved with images for longer travel journals. Inline Markdown images retain the site's existing single-image viewer; the `images` frontmatter field supplies the navigable album.

Published life records tagged 摄影 (Chinese) or Photography (English) appear in the Photography timeline, ten per page, with year archives. Other life tags are not rendered as visible sections, tag routes, or homepage cards. A record's permanent URL is `/life/record/<file-id>/`; changing its date does not change its URL. The homepage shows the latest two published Photography records in the current language. Photography learning notes stay under Notes.

## Public fitness summary

Fitness belongs to the Life navigation but uses a separate, **public monthly aggregate** rather than a photo caption. The public Astro collection `workoutSummaries` reads JSON files from `src/content/workout-summaries/`. Each file contains only fields permitted by the strict schema:

```json
{
  "month": "2026-08",
  "trainingDays": 13,
  "durationMinutes": 916,
  "volumeKg": 59200,
  "demo": true
}
```

- `/life/fitness/` — latest month, three summary metrics, and one annual bar chart with selectable years (12 calendar months per year). The redundant year/month archive list is omitted.
- `/life/fitness/YYYY/MM/` — the same public summary with that month selected.
- Equivalent paths under `/en/life/fitness/` use the English interface.

These are synthetic fixture values, **not actual historical Xunji data**. Missing duration or volume is shown as `—`, not guessed. The public JSON must not contain per-day dates, exercises, sets, session IDs, training start times, or the source API token. Unexpected fields fail content validation (strict schema).

The old per-day workout pages and synthetic per-day fixtures were removed; only a month-level view is built. Publishing a public summary is a deliberate choice: month totals and trends remain publicly visible and indexable. Search engine `noindex` is not access control. **Do not copy raw private Xunji history into the public engine, the content repository, its build artifacts, or an exposed media path.** A later private import may use the existing authenticated Railway proxy to transform session records to **aggregates only** in a controlled, private job; review resulting JSON before publishing. No live sync is part of this demo.

## Preview

```bash
npm ci
npm run dev:quick
```

The public content template supplies one, four, nine and twelve-image photo albums, an untitled record, a long caption, an English record, a draft, and synthetic fitness monthly summaries. None of these files are stored in the engine repository.

For real content:

```bash
go run ./tools/blogctl/cmd site assemble --content-root ../BlogContent
npm run dev:site
```

Assembling real content replaces the assembled template contents. An empty collection displays an empty-state page; the homepage does not invent sample records.
