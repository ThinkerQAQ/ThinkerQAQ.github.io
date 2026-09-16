# ThinkerQAQ Blog Infrastructure

Public infrastructure for the ThinkerQAQ blog.

This repository is intentionally separated from the private content repository. It contains the Astro blog engine, reusable build logic, public workers/tools, BlogCTL, and CI required to build and publish the site.

## Repository boundary

This repository must not contain:

- private source content or VNote history;
- drafts;
- content media copied from the private repository;
- generated content manifests derived from the private corpus;
- build output (`dist/`).

Production content is injected only at build time from the private content repository and is not committed here. Pull requests use synthetic content from `fixtures/` instead.

The boundary is enforced by both `.gitignore` and `scripts/assert-public-boundary.mjs`.

## Local engine validation

```bash
npm ci
npm run assemble:fixtures
npm run check
npm run build
```

The fixture corpus covers the same Astro content collections as production without including real blog content.

BlogCTL is maintained under `tools/blogctl/` and validated independently with Go tests.

## Migration status

This repository was created with a clean Git history. Infrastructure is being migrated from the legacy `ThinkerQAQ.github.io` repository by allowlist, without carrying over the old `.git` history.
