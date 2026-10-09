# ThinkerQAQ Blog

[中文](./README_ZH.md)

Live site: <https://thinkerqaq.com/>

## Introduction

This is a bilingual personal technical blog and digital garden built with [Astro](https://astro.build/).

The blog is split into two parts:

```text
blog-content
Articles / Notes / Series / Projects / Media
        │
        ▼
ThinkerQAQ.github.io
Astro / Search / SEO / BlogCTL / CI
        │
        ▼
GitHub Pages
```

This repository contains the public site engine. The real content lives in a separate Content Repository and is injected at build time.

Main capabilities:

- Articles / Notes / Series / Projects
- Chinese site and English site under `/en/`
- Pagefind full-text search
- Cloudflare AI Search / Workers
- utterances comments
- Umami analytics
- canonical URLs, Open Graph, JSON-LD, `hreflang`, RSS, sitemap, and IndexNow
- BlogCTL and multi-platform article distribution
- GitHub Actions + GitHub Pages deployment

## Tutorial

### 1. Clone

To work on the Public Engine only:

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
```

To run it with a complete sample Content Repository:

```bash
mkdir thinkerqaq-blog
cd thinkerqaq-blog

git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
git clone https://github.com/ThinkerQAQ/blog-content-template.git blog-content
```

Keep the repositories as siblings:

```text
thinkerqaq-blog/
├── ThinkerQAQ.github.io/
└── blog-content/
```

`blog-content-template` is sample content only. It is not part of the production deployment of this site.

### 2. Run locally

Enter the Public Engine:

```bash
cd ThinkerQAQ.github.io
npm ci
go run ./tools/blogctl/cmd site assemble --content-root ../blog-content
npm run dev:site
```

Open:

```text
http://localhost:4321
```

To validate the Public Engine without a Content Repository:

```bash
npm run assemble:fixtures
npm run check
npm run build
```

### 3. Add content

Content belongs in `blog-content`:

```text
src/content/
├── articles/
│   └── en/
├── notes/
├── note-translations/
│   └── en/
├── projects/
└── series/

public/media/
```

You can copy and edit the examples from [blog-content-template](https://github.com/ThinkerQAQ/blog-content-template).

See [`src/content.config.ts`](src/content.config.ts) for the complete schema.

### 4. Deploy

The production pipeline for this site is:

```text
ThinkerQAQ/blog-content
        │
        │ push master
        ▼
trigger-public-engine.yml
        │
        ▼
ThinkerQAQ.github.io / deploy.yml
        │
        ├── checkout the selected content commit
        ├── validate + assemble
        ├── test + build
        └── deploy to GitHub Pages
```

The Public Engine uses `CONTENT_REPOSITORY` to select the content repository. A private Content Repository is read through `BLOG_CONTENT_DEPLOY_KEY`.

To deploy your own fork, also update the repository guards in `.github/workflows/deploy.yml` that currently target `ThinkerQAQ/ThinkerQAQ.github.io`, then configure your own `CONTENT_REPOSITORY`, GitHub Pages, and required Secrets.

The Content Template intentionally does not include an automatic deployment trigger workflow, so it is not tied to a specific account, token, or repository name.

## Documentation

### Main components

| Capability | Implementation |
| --- | --- |
| Site | Astro + Markdown + Content Collections |
| Content | Separate Content Repository |
| Search | Pagefind |
| AI Search | Cloudflare Workers + AI Search |
| Comments | utterances |
| Analytics | Umami |
| SEO | canonical / Open Graph / JSON-LD / hreflang / RSS / sitemap / IndexNow |
| Diagrams | Mermaid / PlantUML / Graphviz / draw.io |
| Tooling | BlogCTL |
| CI/CD | GitHub Actions |
| Deployment | GitHub Pages |

### Static diagrams and media

The site build pre-renders Mermaid and PlantUML as SVGs inside the ignored `public/diagrams/` directory, which becomes part of the deployment-only `dist/` artifact. Astro dev renders cached Mermaid diagrams and re-renders changed diagrams automatically. No generated SVGs are committed to Git or uploaded to R2. Multi-platform BlogCTL publishing continues to render diagrams as PNG and upload them to target platforms or the R2 fallback.

Original article images still live in R2. The optional EdgeOne S3-compatible accelerated image origin is documented in [`docs/edgeone-r2-media.md`](docs/edgeone-r2-media.md); no production image URL migration should occur until that origin has been validated.

### Repository layout

```text
src/                  Astro pages, components, content schema, and Markdown processing
scripts/              Repository-level build, validation, Pagefind, and diagram entrypoints
workers/              Cloudflare Workers
tools/blogctl/         BlogCTL
fixtures/              Public Engine test content
.github/workflows/     CI / CD
```

### Detailed documentation

- [BlogCTL](tools/blogctl/README.md)

## License

This repository is licensed under the [MIT License](LICENSE).
