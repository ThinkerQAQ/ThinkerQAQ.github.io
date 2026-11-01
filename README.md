# ThinkerQAQ website deployment

[简体中文](README_ZH.md) · [Website](https://thinkerqaq.com/) · [Inkerio](https://github.com/ThinkerQAQ/inkerio)

This repository is **only the deployment and site-integration layer** for [ThinkerQAQ](https://thinkerqaq.com/). It is not the reusable blog engine or the canonical content store.

| Repository | Responsibility |
| --- | --- |
| [Inkerio](https://github.com/ThinkerQAQ/inkerio) | Astro rendering, bilingual pages, static builds, sitemap, RSS and search |
| `ThinkerQAQ/blog-content` (private) | Original articles, projects, photography, site prose and copyright policy |
| `ThinkerQAQ/syndirelay` (private) | Cross-platform syndication, drafts, Bridge, MCP and browser extension |
| **This repository** | Site identity (`site.config.json`), public verification assets (`public/`), Worker integrations (`workers/`), GitHub Pages and EdgeOne deployment |

## Production deployment

`.github/workflows/deploy.yml` checks out a **pinned commit of Inkerio**, overlays this site's public configuration and assets via `scripts/prepare-inkerio-deployment.mjs`, checks out the private content via a read-only deploy key, and builds a single static output. The same artifact is deployed to GitHub Pages and EdgeOne Makers. It also prepares AI Search input and performs search-engine notifications.

The reusable engine and the content template maintain the local development, customization and authoring instructions:

- [Inkerio documentation](https://github.com/ThinkerQAQ/inkerio/tree/main/docs)
- [Public content template](https://github.com/ThinkerQAQ/inkerio-content-template)

**Do not put private content, service credentials or local data in this repository.** Production credentials remain in GitHub Actions secrets. Changes to the pinned engine must be verified against the public content template before deployment.

## Remaining transition dependency

`tools/blogctl/` is a **temporary legacy CLI checkout** used only by the deployment workflow's AI Search preparation/synchronization and search notifications. It is not the canonical publishing project, and releases are no longer made from this repository. Remove it only after those CI tasks use an independently validated replacement. The source remains here temporarily to avoid requiring private SyndiRelay credentials in a public repository's Actions workflow.

The Cloudflare AI and reactions Workers are site-specific production integrations; they are not part of Inkerio's reusable engine.

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
