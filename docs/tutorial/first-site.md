# Tutorial — run a site with a separate content repository

**Goal:** assemble a real, editable content checkout into the public engine, then preview it locally.

## 1. Clone both repositories

```bash
mkdir thinkerqaq-blog
cd thinkerqaq-blog
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
git clone https://github.com/ThinkerQAQ/blog-content-template.git blog-content
```

The resulting `ThinkerQAQ.github.io/` and `blog-content/` directories are siblings. The template is public sample content; it is not the private production repository.

## 2. Install engine dependencies

```bash
cd ThinkerQAQ.github.io
npm ci
```

Ensure Node.js 22+, Go 1.27.1 and Git are installed.

## 3. Assemble canonical content

```bash
go run ./tools/blogctl/cmd site assemble --content-root ../blog-content
```

BlogCTL reads the sibling source and assembles the engine's `src/content/` tree. Treat assembled content as generated output; edit `../blog-content/` instead.

## 4. Run and inspect

```bash
npm run dev:site
```

Open [http://localhost:4321](http://localhost:4321) and check the article, note and project routes. `dev:site` does not overwrite the previously assembled content.

## 5. Edit and verify

Edit a sample article under `../blog-content/src/content/articles/`. Re-run the assembly command, then:

```bash
npm run check
npm run build
```

The `build` script calls the Go CLI site-build path; check `dist/` for the static output.

## 6. Continue

For a fork's deployment, follow [Deploy a site](../how-to/deploy.md). For publishing, begin at [BlogCTL Quick Start](../../tools/blogctl/docs/quick-start.md). The exact content fields are defined by [the content schema](../reference/content-schema.md).
