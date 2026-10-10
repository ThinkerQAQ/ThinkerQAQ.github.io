# System model and boundaries

**Definition:** this repository is a static-blog *engine* that turns separately versioned canonical content into a searchable, deployable bilingual site.

## Problem and core model

Writers need a single content source, while website presentation, third-party distribution, search and infrastructure have different lifecycles.

```text
Canonical Markdown repository (blog-content)
   │
   ▼
BlogCTL Site Assembly ──► src/content + public/media (generated in engine)
   │                                   │
   │                                   ▼
   │                           Astro content collections
   │                                   │
   ▼                                   ▼
BlogCTL Publisher                    dist/ + Pagefind
   │                                   ├──► GitHub Pages
   ▼                                   └──► EdgeOne Makers
External article platforms                      │
                                 Optional Edge Functions / Workers
```

## Boundaries

| Model | Owner | Source of truth |
| --- | --- | --- |
| Articles / notes / projects / series | `blog-content` | Content Markdown and media |
| Routes, layouts, metadata, RSS, SEO | Engine | `src/`, `astro.config.mjs` |
| Assembly, publishing, browser Bridge | BlogCTL | `tools/blogctl/` |
| Static diagram generation | Engine build scripts | `scripts/`, `src/markdown/` |
| Static deploy | GitHub Actions | `.github/workflows/deploy.yml` |
| Browser analytics/reactions/AI Search | Configured Workers or site integration | `workers/`, `edge-functions/` and site code |

Site search uses Pagefind in the static site. AI Search is an independent optional Worker pipeline and should not be confused with Pagefind.

For search, comments, analytics and Workers, see [Search and integrations](search-and-integrations.md).

## Implementation boundaries

A normal engine build does not write canonical articles back to `blog-content`. A BlogCTL remote publish is a separate, explicitly authorized workflow. GitHub Pages gets the static artifact; the EdgeOne job augments its own artifact with `edge-functions/`. Generated diagrams belong to build output rather than the content repository.

## Example and design decision

The [tutorial](../tutorial/first-site.md) assembles editable template content without touching the production content repository. This validates the architecture's key rule: **content lifecycle and engine lifecycle are independent**. See [architecture principles](../architecture/principles.md) for extension decisions and [deployment reference](../reference/deployment.md) for actual CI implementation.
