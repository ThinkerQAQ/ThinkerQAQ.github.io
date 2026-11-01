# ThinkerQAQ website deployment

[简体中文](README_ZH.md) · [Website](https://thinkerqaq.com/) · [Inkerio](https://github.com/ThinkerQAQ/inkerio)

This repository is **the deployment and site-integration layer** for [ThinkerQAQ](https://thinkerqaq.com/), not a copy of the rendering engine or the author's writing.

| Repository | Responsibility |
| --- | --- |
| [Inkerio](https://github.com/ThinkerQAQ/inkerio) | Astro rendering, bilingual pages, static builds, sitemap, RSS and search |
| `ThinkerQAQ/blog-content` (private) | Original articles, projects, photography, site prose and copyright policy |
| [SyndiRelay](https://github.com/ThinkerQAQ/syndirelay) (public source) | Cross-platform syndication, drafts, Bridge, MCP and browser extension; site search/AI Search CI integration |
| **This repository** | Site identity (`site.config.json`), public verification assets (`public/`), Worker integrations (`workers/`), GitHub Pages and EdgeOne deployment |

## Releases and repository responsibility

**This is a website deployment repository, not a software download channel.**
It has no active release tags or binary releases. Reusable engine source
releases belong to [Inkerio](https://github.com/ThinkerQAQ/inkerio/releases);
the separate [SyndiRelay source](https://github.com/ThinkerQAQ/syndirelay)
is public under MIT, but standalone binary and browser Extension releases
require their own validation. The retired BlogCTL website downloads and tags
are not supported installation options.

## Site-owned integrations

`workers/blog-ai`, `workers/blog-reactions`, `public/u.js`, hosting configuration
and the production Umami/reactions endpoints remain owned by this website.
Inkerio provides optional integration protocols and example backends; no
production Worker, D1 database or Cloudflare credentials are transferred.
See [integration boundaries](docs/worker-integration-boundaries.md).

## Production deployment

`.github/workflows/deploy.yml` checks out **pinned commits** of public Inkerio and SyndiRelay, plus the private content repository using its own read-only Deploy Key. It overlays this site's public configuration and assets via `scripts/prepare-inkerio-deployment.mjs`, builds one static output, then deploys the same artifact to GitHub Pages and EdgeOne Makers. SyndiRelay is used only inside the GitHub Actions runner to prepare/synchronize Cloudflare AI Search input and notify search engines. `scripts/prepare-search-notify.mjs` creates ephemeral, domain-scoped search settings outside the public checkout; neither private content, credentials, nor local user data enter the static output.

The site's homepage knowledge sections, note taxonomy/translations, RSS inclusion cutoffs and legacy URL redirects are now configured **only** in `site.config.json`. `scripts/verify-site-features.mjs` verifies their output before publication, including legacy canonical links and sitemap exclusions. See the [engine configuration reference](https://github.com/ThinkerQAQ/inkerio/blob/main/docs/reference/site-features.md).

The reusable engine and content template maintain authoring and customization instructions:

- [Inkerio documentation](https://github.com/ThinkerQAQ/inkerio/tree/main/docs)
- [Public content template](https://github.com/ThinkerQAQ/inkerio-content-template)

**Never commit private content, service credentials or local data here.** Production credentials stay in GitHub Actions secrets. Changes to pinned dependencies must pass CI, site-overlay tests and a public-template engine build before deployment.

Cloudflare AI, analytics, and reactions Workers are **site-specific production integrations**, not part of Inkerio's reusable engine. The website provides its own Umami `public/u.js` bundle, which is copied into the static site by the overlay script; the browser collector still uses the separately configured Worker origin. See [integration ownership and mainland collection constraints](docs/worker-integration-boundaries.md).

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)

**Optional pluggable integrations:** `site.config.json` now selects the Umami analytics and HTTP reactions adapters, with deployment addresses and public IDs supplied by existing GitHub Actions variables. The reusable [Inkerio integration protocol](https://github.com/ThinkerQAQ/inkerio/blob/main/docs/reference/integrations.md) also supports disabled/custom analytics and other compatible reaction APIs. Self-hosted backend references live in Inkerio's `examples/cloudflare/`; this site **does not migrate** its production Workers or database.

## Live reference for Inkerio

This is the **live production implementation** behind [thinkerqaq.com](https://thinkerqaq.com/). Developers are welcome to inspect its pinned-engine builds, site-owned Workers and independent deployment configuration. **Do not copy this repository as a beginner template.** To create a single-repository `username.github.io` blog, start from [Inkerio](https://github.com/ThinkerQAQ/inkerio) and choose **Use this template** in [inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template). Advanced site-specific architecture is optional.
