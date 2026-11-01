# Site deployment wrapper — agent contract

This repository owns only the production integration of https://thinkerqaq.com. Never add generic Astro components, authoring content, publishing adapters, browser sessions, or private data here.

- Reusable rendering, templates, and static site tooling belong to `ThinkerQAQ/inkerio`.
- Source articles and bilingual copyright/About text belong to the private `ThinkerQAQ/blog-content` repository.
- Multiplatform distribution and draft management belong to `ThinkerQAQ/syndirelay`.
- This repository owns `site.config.json`, public site verification assets, site-specific Workers, and deployment workflows.

## Working rules

Check the branch and working tree first; fetch the latest `main`; use an isolated worktree. Changes go through a PR, use squash merge, and delete the merged branch. Never modify the content repository, local user data, or production secrets as part of site-wrapper cleanup.

`deploy.yml` must keep a pinned Inkerio SHA and produce the same static artifact for GitHub Pages and EdgeOne. Validate the site overlay with `node --test scripts/prepare-inkerio-deployment.test.mjs` and the engine with the public content template. Preserve the scheduled monthly deployment, content watcher, search notification, AI Search sync, and Worker deployments.

`tools/blogctl/` remains a temporary search CI dependency only; do not add features or make releases here. Replace this dependency in a separate verified migration before deleting it. The public checkout must not require access to private SyndiRelay in CI unless that access is explicitly configured and audited.

Confirm CI and production deployment status before describing a change as released. The private content checkout and all secrets must stay outside public build artifacts and Git history.
