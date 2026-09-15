# International syndication

The blog remains the source of truth. International copies must point their canonical URL back to the English article on `https://thinkerqaq.github.io`.

## Architecture

- `scripts/distribute.mjs`: Chinese-platform export/draft sync through Wechatsync.
- `scripts/syndicate.mjs`: international syndication CLI. The first adapter is DEV.to.
- `scripts/medium-export.mjs`: generates minimal HTML pages specifically for Medium's URL importer, avoiding Astro/Shiki code-block DOM.
- `.github/workflows/syndicate.yml`: runs only after the production Pages deployment succeeds, so the canonical URL already exists before a remote copy is created.
- Medium stays manual at the final publish/import step because Medium does not issue new integration tokens, but the content transformation is generated automatically during every site build.
- LinkedIn is intentionally not part of the first adapter. Its social-post workflow and OAuth permissions should be handled separately from full-article syndication.

A syndication failure does not block the GitHub Pages deployment because syndication is a separate workflow.

## DEV.to setup

1. Create or sign in to a DEV Community account.
2. Open **Settings → Extensions → DEV Community API Keys** and generate an API key for this blog.
3. In this GitHub repository, open **Settings → Secrets and variables → Actions** and create a repository secret named `DEVTO_API_KEY`.
4. Merge the syndication workflow to `master`. After a successful production deployment, the workflow will synchronize all published files under `src/content/articles/en/`.

Do not commit the API key to the repository.

## DEV.to local commands

Validate generated metadata without making network calls:

```bash
npm run syndicate -- --dry-run
```

Validate one English article:

```bash
npm run syndicate -- --article concurrency-series-00 --dry-run
```

Synchronize one article to DEV.to:

```bash
DEVTO_API_KEY=... npm run syndicate -- --article concurrency-series-00
```

Create/update remote articles as drafts instead of publishing:

```bash
DEVTO_API_KEY=... npm run syndicate -- --draft
```

Run the unit tests:

```bash
npm run test:syndicate
```

## Medium-safe import pages

Medium's URL importer can misinterpret the production site's syntax-highlighted/custom code-block DOM. The build therefore creates a second, noindex representation strictly for Medium importing.

For a source article:

```text
https://thinkerqaq.github.io/en/articles/<slug>/
```

the generated import page is:

```text
https://thinkerqaq.github.io/medium-import/en/<slug>/
```

The import page:

- is generated from the same English Markdown source;
- contains no Shiki token spans, code toolbar markup, or site-only wrappers;
- renders every fenced code block as one plain `<pre><code>...</code></pre>` block;
- turns root-relative links and images into absolute URLs;
- removes the article's Table of Contents because imported heading anchors are platform-specific;
- adds `noindex,nofollow`;
- declares the normal English article as its canonical URL;
- appends the same author-syndication notice used for international distribution.

Generate all Medium import pages locally:

```bash
npm run medium:export
```

Generate only one:

```bash
npm run medium:export -- --article concurrency-series-00
```

The normal `npm run build` generates all published Medium-safe pages automatically before Astro builds the site.

For Medium, use **Import a story** with the generated `/medium-import/en/<slug>/` URL. After importing, verify Medium's advanced settings still point the story canonical to the normal `/en/articles/<slug>/` URL before publishing.

## DEV.to upsert rules

For each published English article, the CLI derives its canonical URL as:

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

This makes the workflow safe to run after every deployment without rewriting unchanged DEV.to posts.

## Current platform policy

| Platform | Mode | Status |
| --- | --- | --- |
| DEV.to | API upsert after deploy | Automated |
| Medium | Generated Medium-safe page + official URL import | Content transform automated; final import manual |
| LinkedIn | Summary + canonical blog link | Planned separately |
| Hashnode | RSS/API evaluation | Not enabled |

When another international platform is added, keep platform-specific transformation/API code behind dedicated scripts rather than putting publishing logic directly into the site deployment workflow.
