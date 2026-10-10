# Deployment Reference

**Source of truth:** the checked-in files under [`.github/workflows/`](../../.github/workflows/).

| Workflow | Source | Responsibility |
| --- | --- | --- |
| Validate | `validate.yml` | DevTool config, verify, build and package |
| Deploy Astro site to GitHub Pages | `deploy.yml` | Checkout engine/content, build static dist, upload to Pages and EdgeOne Makers |
| Watch private blog content | `content-watch.yml` | Observe canonical content SHA and dispatch engine build |
| Release blogctl | `blogctl-release.yml` | Package and publish BlogCTL release from version |
| Release blog AI Worker | `worker-release.yml` | Worker tests and deployment |
| Reactions Worker release | `worker-reactions-release.yml` | Reactions Worker lifecycle |

The deployment build uses **Go 1.27.1** (via `go.work`), **Node.js 22** and **Java 17** plus font/diagram packages. It assembles `CONTENT_REPOSITORY` via BlogCTL and runs Astro, Pagefind and other build steps. GitHub Pages receives static `dist/`; EdgeOne Makers receives its own artifact extended with `edge-functions/`.

| Name | Meaning |
| --- | --- |
| `BLOG_CONTENT_DEPLOY_KEY` | Read-only Git key for the private content checkout |
| `CONTENT_REPOSITORY` | Repository selector; original repo currently defaults to `ThinkerQAQ/blog-content` |
| `EDGEONE_API_TOKEN` | EdgeOne Makers deploy credential |
| `PUBLIC_UMAMI_WEBSITE_ID` / `PUBLIC_UMAMI_PROXY_ORIGIN` | Site analytics build inputs |
| `PUBLIC_REACTION_WORKER_URL` | Helpful-reactions endpoint |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_SEARCH_INSTANCE`, `CLOUDFLARE_AI_SEARCH_TOKEN` | AI Search sync inputs |
| `GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SEARCH_CONSOLE_SITE_URL` | Search-engine notification inputs |

These are CI integration points, **not** a promise that a corresponding Worker/front-end feature is enabled in production. Verify deployment and traffic separately. See [deploy How-to](../how-to/deploy.md) and [EdgeOne proxy design](../architecture/index.md).
