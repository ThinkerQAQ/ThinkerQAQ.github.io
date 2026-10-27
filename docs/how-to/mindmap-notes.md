# Add an interactive mind-map note

Inkerio renders **note Markdown** in two views: normal Markdown and an interactive Markmap mind map. Both views use the same source content; the mind map is not an uploaded image or an editable `.xmind` file.

## 1. Write a structured note

Create `blog-content/src/content/notes/system-design-map.md`:

```markdown
---
title: "System Design Map"
description: "An interactive overview of system design."
sourcePath: "src/content/notes/system-design-map.md"
category: example
categoryLabel: Example
order: 2
updatedAt: "2026-10-27T00:00:00Z"
language: zh
status: active
defaultView: mindmap
---

# System Design

## Requirements

### Features

- User journeys
- Inputs and outputs

## Architecture

### Components

- Gateway
- Application services
- Database
```

Use one top-level `#` heading as the root. Subsequent headings (`##`, `###`, etc.) and nested lists create the branches. Short node labels are easier to read. The sample uses English labels for brevity; the content language can be Chinese or English.

`defaultView: mindmap` opens the map automatically when JavaScript is enabled. Omit the field or set `defaultView: markdown` to open normal reading mode instead. With JavaScript unavailable, the Markdown content remains visible. This setting applies to **notes**, not article pages.

## 2. Add a translation (optional)

Create `blog-content/src/content/note-translations/en/system-design-map.md`:

```markdown
---
title: "System Design Map"
description: "The English mind-map version."
translationOf: system-design-map
language: en
updatedAt: "2026-10-27T00:00:00Z"
---

# System Design

## Requirements

- Functional requirements
- Non-functional requirements

## Architecture

- Gateway
- Services
- Data storage
```

The English URL is `/en/notes/system-design-map/`; the original is `/notes/system-design-map/`. The translation **inherits the original note's default view**, but its mind map is rendered from its own English Markdown. Keep the branch structure aligned across languages. Do not add `defaultView` to the translation frontmatter.

## 3. Assemble and preview

From the Inkerio engine directory:

```bash
go run ./tools/blogctl/cmd site assemble --content-root ../blog-content
npm run check
npx --no-install astro dev --port 4321
```

Open `/notes/system-design-map/` and `/en/notes/system-design-map/`. Use the single circular view-switch icon above the existing reading jump and Ask controls to change views from anywhere on the page; switching returns to the beginning of the note. The icon shows the destination: a mind-map symbol to open the map, or a document symbol to return to the Markdown body; the hover and screen-reader label identifies the action. It temporarily hides while the Ask panel or mobile reading navigation is open. In the map itself, drag to pan, use the mouse wheel to zoom, expand/collapse nodes, or use its separate top-right toolbar to zoom, fit visible branches, toggle recursive expansion and enter fullscreen. The canvas toolbar uses upstream `markmap-toolbar` controls plus a browser fullscreen button.

The browser loads the mind-map renderer on demand. A large map starts with deeper nodes folded; use the nodes to explore branches gradually. A "fit" operation frames **currently visible branches**, not every folded descendant. For very large maps, consider splitting topics into separate notes.

For the runnable Chinese/English example, see `sample-mindmap.md` in [inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template). No `.xmind` parser or automatic XMind import is provided: export or convert the structure to Markdown first, then review the result.

See also [content schema](../reference/content-schema.md), [public template example](../examples/content-template.md), and [add/update content](add-content.md).
