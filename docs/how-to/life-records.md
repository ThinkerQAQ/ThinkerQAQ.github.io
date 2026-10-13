# Life records

Life is a separate collection for short captions with an album, travel journals, and everyday records. Its Chinese and English indexes are `/life/` and `/en/life/`.

Put canonical entries in the content repository at `src/content/life/`. The engine's existing assembly command copies this collection together with the rest of the content. Do not commit personal entries to the engine.

## Import a Moments post

Create one Markdown file for one original post. Keep its original publication timestamp, text, image order, and timezone. The engine sorts by `publishedAt`, never by the migration time or file creation time.

```yaml
---
publishedAt: "2024-08-18T18:30:00+08:00"
status: published
language: zh
location: 杭州
tags: [旅行, 摄影]
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

Tag and year links filter across the entire collection, with ten records per page. A record's permanent URL is `/life/record/<file-id>/`; changing its date does not change its URL. The homepage shows the latest two published records in the current language. Photography learning notes stay under Notes.

## Training calendar demo

Fitness is a dedicated structured-data view under Life, not a photo caption or a new article category. It uses the `workouts` collection of JSON files under `src/content/workouts/`. Life records still use `src/content/life/` and their own tags. The routes are:

- `/life/fitness/` — latest recorded month, or an empty calendar if none exists.
- `/life/fitness/YYYY/MM/` — a specific recorded month.
- `/life/fitness/YYYY/MM/DD/` — exercises and sets on a training day.

The same routes also work under `/en/`. Clicking a recorded day in the calendar opens the corresponding detail page; exercise sets can be expanded. The Life index links to the calendar with a monthly preview card.

A minimal imported JSON record:

```json
{
  "date": "2026-08-06",
  "title": "Back day",
  "durationMinutes": 65,
  "volumeKg": 4200,
  "caloriesKcal": 250,
  "exercises": [
    {
      "name": "Lat pulldown",
      "restSeconds": 90,
      "sets": [{ "weightKg": 60, "reps": 10, "completed": true }]
    }
  ]
}
```

The JSON schema allows missing duration, volume, calories, and set weight because an upstream export may not provide them. Missing data renders as a dash; the site does not invent it. More than one session per date is supported. Date keys use local calendar dates (no UTC conversion).

The `fixtures/src/content/workouts/` directory contains **synthetic demo data** with `"demo": true`, which is clearly marked in the UI. The real Xunji import is intentionally not wired into the browser: use the existing authenticated Railway proxy to export sanitized data to JSON in the separate content repository, then assemble/build. Do not commit upstream tokens, unreviewed raw exports, or personal history to this engine.

## Preview

```bash
npm ci
npm run dev:quick
```

Fixtures include one, four, nine and twelve images, an untitled record, a long caption, an English record, and a draft excluded from public output. These are explicitly labelled demo content, not personal history.

For real content:

```bash
go run ./tools/blogctl/cmd site assemble --content-root ../BlogContent
npm run dev:site
```

Assembling real content replaces fixtures. An empty collection displays an empty-state page; the homepage does not invent sample records.
