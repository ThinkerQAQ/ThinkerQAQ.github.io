# ThinkerQAQ website · Inkerio live example

[简体中文](README_ZH.md) · [Live website](https://thinkerqaq.com/) · [Inkerio](https://github.com/ThinkerQAQ/inkerio) · [Create your own site](https://github.com/ThinkerQAQ/inkerio-content-template)

This is the **actual production deployment repository** behind [thinkerqaq.com](https://thinkerqaq.com/). It is a reference implementation, **not** the starter template. The Inkerio engine and the author's private content live elsewhere; this repository owns the deployment wrapper, public site configuration and optional Workers.

## Quick Start — build your own blog

To create a GitHub Pages blog, open [inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template), click **Use this template**, and name the repository `YOUR_USERNAME.github.io`. Configure the five fields in `site.config.json`, replace demonstration materials, and deploy with its included GitHub Pages Actions workflow. The bilingual [Inkerio README](https://github.com/ThinkerQAQ/inkerio) provides the complete first-site walkthrough.

**Do not fork this site wrapper for ordinary blogging.** It includes private-content checkout paths, custom search integration and additional Workers that new users do not need.

## What belongs where?

| Repository | Responsibility |
| --- | --- |
| [Inkerio](https://github.com/ThinkerQAQ/inkerio) | Reusable Astro renderer, article and note schema, bilingual routes, RSS, sitemap and static search |
| `ThinkerQAQ/blog-content` (private) | Personal writing, photography, About page, real copyright policy |
| [SyndiRelay](https://github.com/ThinkerQAQ/syndirelay) (public source) | Independently maintained CLI, Bridge, MCP and optional publishing/search automation |
| **This repository** | Site identity, public assets, build overlay, GitHub Pages and EdgeOne deployments, Workers |

## Production deployment

The `.github/workflows/deploy.yml` workflow checks out **pinned Inkerio and SyndiRelay commits** and the private content repository using a separate read-only Deploy Key. `scripts/prepare-inkerio-deployment.mjs` overlays the public site configuration and assets before rendering. The same static build is then deployed to GitHub Pages and EdgeOne.

The website-specific `site.config.json` controls home sections, note categories, translated routes, RSS filters and legacy redirects. `scripts/verify-site-features.mjs` checks generated canonical URLs, sitemaps, redirects and RSS before deployment. The site-owned search CI prepares temporary, domain-scoped inputs for optional SyndiRelay search notifications.

**Security boundary:** secrets remain in GitHub Actions, not in code or the generated static website. The engine and the public template do not receive the private content repository, production Worker keys or databases.

## Workers and optional integrations

- `public/u.js` is hosted under the website's own origin; the browser's analytics POST still goes to the configured Worker endpoint. A same-origin script **does not imply a same-origin collector**, and no `/api/send` reverse proxy exists on the static site.
- `workers/blog-ai` runs optional AI Search / Ask Blog and analytics services. It retains its own Worker/KV configuration.
- `workers/blog-reactions` implements site-owned HTTP reactions with its own D1 storage and secrets.
- The engine only renders optional Umami / HTTP reactions clients when site configuration enables them; it does not own production Cloudflare resources. Generic self-hosted examples are under Inkerio's `examples/cloudflare/`.

Changing a production Worker endpoint, collector origin, D1/KV binding or domain requires separate tests and an authorized deployment. Do not treat a successful static-site build as a backend-migration test.

## Maintenance and license

Validate changes with the site overlay tests and its GitHub Actions checks. Production content, credentials and local user data must **never** be committed here. This deployment repository does not distribute software binaries or retain historical BlogCTL/Inkerio Release tags.

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
