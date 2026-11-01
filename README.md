# ThinkerQAQ website deployment

[简体中文](README_ZH.md) · [Website](https://thinkerqaq.com/) · [Inkerio](https://github.com/ThinkerQAQ/inkerio)

This repository is **the deployment and site-integration layer** for [ThinkerQAQ](https://thinkerqaq.com/), not a copy of the rendering engine or the author's writing.

| Repository | Responsibility |
| --- | --- |
| [Inkerio](https://github.com/ThinkerQAQ/inkerio) | Astro rendering, bilingual pages, static builds, sitemap, RSS and search |
| `ThinkerQAQ/blog-content` (private) | Original articles, projects, photography, site prose and copyright policy |
| `ThinkerQAQ/syndirelay` (private) | Cross-platform syndication, drafts, Bridge, MCP and browser extension; site search/AI Search CI integration |
| **This repository** | Site identity (`site.config.json`), public verification assets (`public/`), Worker integrations (`workers/`), GitHub Pages and EdgeOne deployment |

## Production deployment

`.github/workflows/deploy.yml` checks out **pinned commits** of Inkerio and private SyndiRelay, plus the private content through distinct read-only Deploy Keys. It overlays this site's public configuration and assets via `scripts/prepare-inkerio-deployment.mjs`, builds one static output, then deploys the same artifact to GitHub Pages and EdgeOne Makers. Private SyndiRelay is used only inside the GitHub Actions runner to prepare/synchronize Cloudflare AI Search input and notify search engines. `scripts/prepare-search-notify.mjs` creates ephemeral, domain-scoped search settings outside the public checkout; neither private source, credentials, nor local data enter the static output.

The reusable engine and content template maintain authoring and customization instructions:

- [Inkerio documentation](https://github.com/ThinkerQAQ/inkerio/tree/main/docs)
- [Public content template](https://github.com/ThinkerQAQ/inkerio-content-template)

**Never commit private content, service credentials or local data here.** Production credentials stay in GitHub Actions secrets. Changes to pinned dependencies must pass CI, site-overlay tests and a public-template engine build before deployment.

Cloudflare AI and reactions Workers are site-specific production integrations; they are not part of Inkerio's reusable engine.

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
