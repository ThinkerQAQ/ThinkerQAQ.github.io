# Create your first site

By the end of this tutorial, your own article will appear at `/articles/hello-inkerio/`. The engine and writing live in separate Git repositories.

## 1. Prepare the content repository

On [inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template), choose **Use this template → Create a new repository**. A fork also works. Choose a public or private content repository as appropriate for your writing.

For a local trial, clone the public template directly:

```bash
mkdir inkerio-workspace
cd inkerio-workspace
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
git clone https://github.com/ThinkerQAQ/inkerio-content-template.git blog-content
```

For ongoing writing, replace the second clone URL with your own repository URL, keeping the local directory name `blog-content`. Confirm its remote with `git -C blog-content remote -v` before pushing changes.

## 2. Install and assemble

Use the [Quick Start requirements](../quick-start.md), then run from the engine checkout:

```bash
cd ThinkerQAQ.github.io
npm ci
go run ./tools/blogctl/cmd site assemble --content-root ../blog-content
npx --no-install astro dev --port 4321
```

Open [localhost:4321](http://localhost:4321). The assembly message starts with `[site] assembled content=`. Astro should list the sample content.

Assembly replaces the engine's `src/content/` tree. It also replaces `public/media/` when the source has that directory, and copies the content manifest when present. Edit the source checkout, because another assembly discards edits made to generated content.

## 3. Add an article

Create `blog-content/src/content/articles/hello-inkerio.md` in your editor:

```markdown
---
title: "Hello Inkerio"
description: "My first article on this site."
publishedAt: "2026-10-22T10:00:00+08:00"
language: zh
status: published
tags: [Example]
coverImage: "/media/articles/sample-article/cover.svg"
coverImageAlt: "Sample cover from the content template"
---

This article is stored in the content repository.
```

The example uses the cover shipped with the template. For your own cover, put a file under `blog-content/public/media/` and use its site-root path, such as `/media/articles/hello-inkerio/cover.jpg`.

`publishedAt` is a quoted timestamp with a timezone. Published articles require a non-empty `coverImage` and `coverImageAlt`. A new article defaults to `draft` when `status` is omitted, and drafts are hidden unless `INCLUDE_DRAFTS=true` is explicitly set.

## 4. Refresh the preview

Keep the dev server running. In another terminal, from the engine root:

```bash
go run ./tools/blogctl/cmd site assemble --content-root ../blog-content
npm run check
```

Visit [the article](http://localhost:4321/articles/hello-inkerio/). Check the title, description, cover and body. Astro watches generated files, but it does not automatically assemble edits from the external content checkout; repeat assembly after source edits.

Use `npx --no-install astro dev --port 4321` to restart this preview. `npm run dev` and `dev:quick` select the public template again.

## 5. Add an English version

Create `blog-content/src/content/articles/en/hello-inkerio.md` with the same required fields, English text, `language: en` and `translationOf: hello-inkerio`. Assemble again. Its URL is `/en/articles/hello-inkerio/`; `translationOf` identifies the original file without `.md`.

Titles do not determine URLs. Renaming the file changes the content ID and can break links; keep IDs stable after publication. See [content fields and relationships](../reference/content-schema.md).

## 6. Build and save your work

After installing the [diagram dependencies](../how-to/diagnose-build.md), stop the dev server and run:

```bash
npm run build
npm run preview
```

The build uses the currently assembled content, writes static output to `dist/`, and generates the search index. Search is best checked in this built preview.

Review changes in the content repository with `git -C ../blog-content diff`. Commit and push writing there; commit engine configuration and code changes in the engine repository. Set your [site identity](../how-to/customize-site.md) before following the [deployment guide](../how-to/deploy.md).
