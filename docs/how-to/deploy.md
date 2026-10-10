# How to deploy the public engine

**Task:** deploy an engine/content pair using the repository's existing CI.

## Preconditions

A GitHub fork with Actions and Pages enabled; an accessible canonical content repository; and the permissions/secrets described in [Deployment Reference](../reference/deployment.md).

## Steps

1. Clone the engine and a content repository as siblings; complete the [tutorial](../tutorial/first-site.md).
2. For a fork, set `CONTENT_REPOSITORY` and review the repository-name guards in `.github/workflows/deploy.yml`. The checked-in production defaults target the owner's private `ThinkerQAQ/blog-content`, which a fork cannot read automatically.
3. Grant a read-only deployment key as `BLOG_CONTENT_DEPLOY_KEY` when accessing private content.
4. Decide whether you need GitHub Pages only or the existing owner-specific EdgeOne Makers deployment. The latter requires `EDGEONE_API_TOKEN` and is guarded to the original repo.
5. Use the actual `Deploy Astro site to GitHub Pages` GitHub Actions workflow (`workflow_dispatch`) or the configured automatic triggers. Do not embed secrets in Markdown.

## Verify

Inspect the build, Pages and (if applicable) EdgeOne deployment jobs in GitHub Actions; open the generated site and verify a content page, RSS and search. For the owner's pipeline, AI Search sync and search-engine notification run separately and may fail independently.

## Common boundary

A content push does not directly execute Astro: the `content-watch.yml` workflow checks the content SHA and triggers the engine deployment. See [Deployment Reference](../reference/deployment.md) for the current trigger and variable names.
