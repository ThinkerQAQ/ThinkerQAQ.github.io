# ThinkerQAQ website deployment

[简体中文](README_ZH.md) · [Website](https://thinkerqaq.com/) · [Inkerio](https://github.com/ThinkerQAQ/inkerio)

This repository is **the deployment and site-integration layer** for [ThinkerQAQ](https://thinkerqaq.com/), not a copy of the rendering engine or the author's writing.

| Repository | Responsibility |
| --- | --- |
| [Inkerio](https://github.com/ThinkerQAQ/inkerio) | Astro rendering, bilingual pages, static builds, sitemap, RSS and search |
| `ThinkerQAQ/blog-content` (private) | Original articles, projects, photography, site prose and copyright policy |
| `ThinkerQAQ/syndirelay` (private) | Cross-platform syndication, drafts, Bridge, MCP and browser extension; site search/AI Search CI integration |
| **This repository** | Site identity (`site.config.json`), public verification assets (`public/`), Worker integrations (`workers/`), GitHub Pages and EdgeOne deployment |

## Software release migration

**This website repository no longer publishes application Releases.** Inkerio has its own [source releases](https://github.com/ThinkerQAQ/inkerio/releases). The independent SyndiRelay publisher is private pending source/license/security review and does not have approved public binary/Extension packages. Do not install archived BlogCTL executable downloads as SyndiRelay.

The original website repo once held **24 Releases / 194 downloadable assets / 260 aggregate file downloads**. Their metadata is preserved in the [legacy release archive](docs/legacy-releases.md) before retirement; downloads are not a unique-user count. Existing git tags remain for source provenance, but historic release asset URLs may no longer work. The website build/deployment process does not depend on those releases.

## Production deployment

`.github/workflows/deploy.yml` checks out **pinned commits** of Inkerio and private SyndiRelay, plus the private content through distinct read-only Deploy Keys. It overlays this site's public configuration and assets via `scripts/prepare-inkerio-deployment.mjs`, builds one static output, then deploys the same artifact to GitHub Pages and EdgeOne Makers. Private SyndiRelay is used only inside the GitHub Actions runner to prepare/synchronize Cloudflare AI Search input and notify search engines. `scripts/prepare-search-notify.mjs` creates ephemeral, domain-scoped search settings outside the public checkout; neither private source, credentials, nor local data enter the static output.

The site's homepage knowledge sections, note taxonomy/translations, RSS inclusion cutoffs and legacy URL redirects are now configured **only** in `site.config.json`. `scripts/verify-site-features.mjs` verifies their output before publication, including legacy canonical links and sitemap exclusions. See the [engine configuration reference](https://github.com/ThinkerQAQ/inkerio/blob/main/docs/reference/site-features.md).

The reusable engine and content template maintain authoring and customization instructions:

- [Inkerio documentation](https://github.com/ThinkerQAQ/inkerio/tree/main/docs)
- [Public content template](https://github.com/ThinkerQAQ/inkerio-content-template)

**Never commit private content, service credentials or local data here.** Production credentials stay in GitHub Actions secrets. Changes to pinned dependencies must pass CI, site-overlay tests and a public-template engine build before deployment.

Cloudflare AI, analytics, and reactions Workers are **site-specific production integrations**, not part of Inkerio's reusable engine. The website provides its own Umami `public/u.js` bundle, which is copied into the static site by the overlay script; the browser collector still uses the separately configured Worker origin. See [integration ownership and mainland collection constraints](docs/worker-integration-boundaries.md).

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)

**Optional pluggable integrations:** `site.config.json` now selects the Umami analytics and HTTP reactions adapters, with deployment addresses and public IDs supplied by existing GitHub Actions variables. The reusable [Inkerio integration protocol](https://github.com/ThinkerQAQ/inkerio/blob/main/docs/reference/integrations.md) also supports disabled/custom analytics and other compatible reaction APIs. Self-hosted backend references live in Inkerio's `examples/cloudflare/`; this site **does not migrate** its production Workers or database.
