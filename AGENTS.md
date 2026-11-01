# Site deployment wrapper — agent contract

This repository owns only the production integration of https://thinkerqaq.com. Never add generic Astro components, authoring content, publishing adapters, browser sessions, or private data here.

- Reusable rendering, templates and static site tooling belong to `ThinkerQAQ/inkerio`.
- Articles, bilingual copyright and About prose belong to private `ThinkerQAQ/blog-content`.
- Multiplatform distribution, drafts, and deployment-time search notifications/AI Search preparation belong to private `ThinkerQAQ/syndirelay`.
- This repository owns `site.config.json`, public site verification assets, site-specific Workers, and deployment workflows.

## Working rules

Check branch and working tree before editing; fetch latest `main`; use isolated worktrees. Changes go through a PR, squash merge, and delete remote branch. Never modify local user data or production secrets as part of wrapper cleanup.

`deploy.yml` must use pinned commits and **distinct read-only SSH deploy keys** for private content and private SyndiRelay. Never embed credentials, checkout artifacts, or publishing history in publicly distributed static assets. Keep search settings in a transient directory outside the public checkout. The output of the same Inkerio build must deploy to both GitHub Pages and EdgeOne.

Test the site overlay with `node --test scripts/prepare-inkerio-deployment.test.mjs scripts/prepare-search-notify.test.mjs` and independently test pinned Inkerio with the public content template. Preserve the monthly deployment, content watcher, search notification, AI Search synchronization, and Worker deployments. Public PR CI must not need private repository secrets.

Confirm CI and production deployment status before describing a change as released. Private content, source, SSH keys and all secrets must stay outside the public repo and build artifacts.
