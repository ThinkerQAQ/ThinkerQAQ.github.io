# Example — public content template

**Goal:** preview the public blog without production content, private repositories or third-party credentials. All demo Markdown, JSON and media belong in [inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template), not in the engine.

From the engine checkout:

```bash
npm ci
npm run dev:quick
```

The first run reuses a sibling `../inkerio-content-template` checkout if present; otherwise it clones the public template there. The Go `site assemble` command copies the template's `src/content/` and `public/media/` into the engine's **ignored build inputs**, then Astro serves those assets. It never modifies the user's private BlogContent repository.

For a full build (requires Java/Graphviz and Chromium only if the example content uses those renderers):

```bash
npm run build:template
```

To use a custom local template checkout, set `BLOG_TEMPLATE_ROOT=/path/to/inkerio-content-template` before assembly. For a **real** content repository, explicitly run `go run ./tools/blogctl/cmd site assemble --content-root /path/to/BlogContent`; `npm run dev:site` starts Astro without replacing the selected assembled content.

The template includes a bilingual **Software System Design Mind Map** example: `/notes/sample-mindmap/` (Chinese) and `/en/notes/sample-mindmap/` (English). The note is Markdown with `defaultView: mindmap`; both URLs display their own localized Markdown or generated Markmap view. See the [mind-map how-to](../how-to/mindmap-notes.md) for controls and authoring guidelines.

The engine retains only programmatic test fixtures tied to component tests (e.g. Draw.io rendering); published sample content lives exclusively in the template repository.
