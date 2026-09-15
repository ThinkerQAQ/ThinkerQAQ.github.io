# International syndication

The blog remains the source of truth. International copies should point their canonical URL back to the English article on `https://thinkerqaq.github.io`.

## Architecture

- `scripts/distribute.mjs`: Chinese-platform export/draft sync through Wechatsync.
- `scripts/syndicate-cli.mjs`: safety wrapper for international syndication commands.
- `scripts/syndicate.mjs`: platform adapter logic; DEV.to is the first supported adapter.
- `.github/workflows/syndicate.yml`: manual-only DEV.to workflow. It requires an explicit English article slug.
- Medium is intentionally kept out of the normal site build. Use an external Markdown-to-Medium tool and review the draft before publishing.
- LinkedIn is intentionally separate from full-article syndication because its social-post workflow and permissions are different.

A syndication failure must not block the GitHub Pages deployment.

## DEV.to setup

1. Create or sign in to a DEV Community account.
2. Open **Settings → Extensions → DEV Community API Keys** and generate an API key for this blog.
3. In this GitHub repository, open **Settings → Secrets and variables → Actions** and create a repository secret named `DEVTO_API_KEY`.
4. Open **Actions → Syndicate international content → Run workflow** and explicitly enter one English article slug.

Normal site deployments do **not** publish or update DEV.to articles.

Do not commit the API key to the repository.

## DEV.to local commands

Validate one English article without making network calls:

```bash
npm run syndicate -- --article concurrency-series-00 --dry-run
```

Synchronize one article to DEV.to:

```bash
DEVTO_API_KEY=... npm run syndicate -- --article concurrency-series-00
```

Create or update that article as a draft instead of publishing it:

```bash
DEVTO_API_KEY=... npm run syndicate -- --article concurrency-series-00 --draft
```

Run the unit tests:

```bash
npm run test:syndicate
```

Implicit all-article syndication is disabled. Full syndication requires an explicit `--all` acknowledgement.

## Medium workflow

Do not generate `/medium-import/` pages in this repository and do not couple Medium formatting to `npm run build`.

The preferred workflow is:

1. Start from the English Markdown source under `src/content/articles/en/`.
2. Use an external Markdown-to-Medium formatter/publisher such as M2M or md2rich.
3. Review code blocks, text diagrams, links, and images in the Medium draft.
4. Before publishing, set the Medium story's canonical/original URL to the normal blog article:

```text
https://thinkerqaq.github.io/en/articles/<slug>/
```

If full Medium automation is needed later, evaluate a browser-automation/MCP tool separately. It should remain opt-in and must not run as part of the normal blog deploy.

## DEV.to upsert rules

For each explicitly selected published English article, the CLI derives its canonical URL as:

```text
https://thinkerqaq.github.io/en/articles/<slug>/
```

The DEV.to adapter:

1. lists the authenticated user's DEV.to articles;
2. matches an existing article by canonical URL;
3. creates it when no match exists;
4. fetches the full remote article when needed;
5. skips the write when title, description, body, tags, publication state, and canonical URL already match;
6. updates the existing article when the local source changed.

## Current platform policy

| Platform | Mode | Status |
| --- | --- | --- |
| DEV.to | Explicit single-article API upsert | Enabled; manual trigger only |
| Medium | External Markdown-to-Medium tool + manual review | Enabled as an external workflow; no custom repo integration |
| LinkedIn | Summary + canonical blog link | Planned separately |
| Hashnode | RSS/API evaluation | Not enabled |

When another international platform is added, keep publishing optional and platform-specific. Normal site builds should remain independent from third-party publishing.
