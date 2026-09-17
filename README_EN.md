# ThinkerQAQ Blog

[中文](./README.md)

Live site: <https://thinkerqaq.github.io/>

A bilingual personal technical blog and digital garden built with [Astro](https://astro.build/), organized around **Articles / Notes / Series / Projects**.

This repository is the blog's **Public Engine**. It contains the website implementation, content schema, validation logic, build and deployment pipeline, and public tooling. The real blog content lives in a separate private content repository and is injected only at build time; it is not committed here.

## Architecture

```text
Private Content Repository
Articles / Notes / Series / Projects / Media
                 │
                 │ build-time checkout
                 ▼
ThinkerQAQ.github.io
Astro / Schema / Validation / Search / Tooling / CI
                 │
                 ▼
           GitHub Pages
                 │
                 ▼
      https://thinkerqaq.github.io/
```

The repository boundary follows one simple rule:

```text
Private Content = DATA
Public Engine   = CODE + SCHEMA + VALIDATION + BUILD + DEPLOY
```

Production content is never committed to this public repository. Pull requests and local infrastructure validation use synthetic content from `fixtures/`.

## Content model

| Type | Purpose |
| --- | --- |
| Articles | Long-form published articles |
| Notes | Learning notes and historical knowledge records |
| Series | Continuous reading paths across related content |
| Projects | Projects and their related articles, series, and knowledge content |

## Main capabilities

- **Astro** for static site generation and content rendering
- **Bilingual site** with Chinese as the default language and English under `/en/`
- **Pagefind** for static full-text search
- **Cloudflare** for AI Search, Workers, and related online capabilities
- **Umami** for privacy-friendly analytics
- **utterances** for GitHub Issues-based comments
- **SEO** with canonical URLs, Open Graph, JSON-LD, `hreflang`, RSS, sitemap, robots.txt, and IndexNow
- **GitHub Actions + GitHub Pages** for automated builds and publishing
- **BlogCTL** under `tools/blogctl/` for cross-platform blog maintenance tooling

## Local Public Engine validation

The public repository does not contain real production content, so engine validation uses fixtures by default:

```bash
npm ci
npm run assemble:fixtures
npm run check
npm run build
```

This validates the public engine without copying private content into Git history.

## Production build

For a production deployment, GitHub Actions:

1. checks out the Public Engine;
2. checks out a specific private content commit;
3. validates the content-source contract;
4. assembles content into the build workspace;
5. runs tests, Astro check, and the static build;
6. deploys the site to GitHub Pages;
7. runs post-deployment search and search-engine notification tasks.

The Public Engine accepts a `content_sha`, allowing a deployment to be pinned to an exact content version for traceability.

## Repository boundary

This repository should contain:

- the Astro website implementation;
- content schemas and relationship models;
- content-source validation and assembly logic;
- public infrastructure for search, SEO, Workers, and related services;
- BlogCTL and public development tools;
- CI/CD and GitHub Pages deployment logic;
- test fixtures that contain no real private content.

This repository should not contain:

- the private VNote source knowledge base;
- drafts or unpublished private content;
- production content or media copied from the private repository;
- generated build output such as `dist/`.

The boundary is enforced by `.gitignore` and repository validation scripts.
