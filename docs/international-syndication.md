# International syndication

The blog remains the source of truth. International copies should point their canonical URL back to the English article on `https://thinkerqaq.github.io`.

## Architecture

- `scripts/distribute.mjs`: Chinese-platform export/draft sync through Wechatsync.
- `scripts/syndicate-cli.mjs`: safety wrapper for international syndication commands.
- `scripts/syndicate.mjs`: DEV.to adapter logic.
- `scripts/syndicate-medium-cli.mjs`: explicit Medium draft entrypoint.
- `tools/medium-bridge/`: loopback-only local Medium session bridge plus a minimal Chrome/Edge extension.
- `.github/workflows/syndicate.yml`: manual-only DEV.to workflow. It requires an explicit English article slug.
- LinkedIn is intentionally separate from full-article syndication because its social-post workflow and permissions are different.

A syndication failure must not block the GitHub Pages deployment. Medium is intentionally kept out of the normal site build and deploy.

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

Medium uses a local, opt-in browser-session bridge. It is modeled after the existing PFlow/DownKit pattern: the browser extension reads the current site cookies only when the user clicks it, sends the minimum required session cookies to a loopback-only process, and the bridge keeps them in memory only for the lifetime of the CLI command.

### One-time browser setup

Load this directory as an unpacked Chrome/Edge extension:

```text
tools/medium-bridge/extension
```

The extension needs access only to `medium.com`, the loopback bridge at `127.0.0.1:32145`, and the browser cookie API.

### Prepare without contacting Medium

```bash
npm run syndicate -- --article concurrency-series-00 --platforms medium --dry-run
```

This validates the Medium delta payload and writes a copy/paste fallback:

```text
.distribution/medium/concurrency-series-00.html
```

Open the HTML and use **Copy for Medium** if the private Medium editor protocol changes.

### Create a real Medium draft

Stay signed in to `medium.com`, then run:

```bash
npm run syndicate -- --article concurrency-series-00 --platforms medium
```

The CLI starts a bridge bound to `127.0.0.1:32145` and waits for a browser session. While it is waiting, click the **ThinkerQAQ Medium Bridge** extension once. The extension sends only `sid`, `uid`, `xsrf`, and `cf_clearance` when present. The bridge never writes those cookies to disk or logs them.

The bridge then uses Medium's current web-editor draft flow:

```text
CreatePostMutation
  -> POST /p/{postId}/deltas
  -> Medium draft
```

The current implementation is deliberately **draft-only**. It does not publish and it does not run from CI or normal site deployment.

Before manually publishing the draft, verify code/text diagrams and set the Medium story's canonical/original URL to:

```text
https://thinkerqaq.github.io/en/articles/<slug>/
```

Tags and canonical metadata remain manual until their current Medium editor requests are captured and verified. The source footer is already added automatically and uses the same wording as DEV.to.

The Medium editor endpoints are undocumented and can change. If they fail, use the generated `.distribution/medium/<slug>.html` fallback rather than changing the normal blog build.

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
| Medium | Local browser-session bridge → draft, with HTML fallback | Experimental; explicit local command only |
| LinkedIn | Summary + canonical blog link | Planned separately |
| Hashnode | RSS/API evaluation | Not enabled |

When another international platform is added, keep publishing optional and platform-specific. Normal site builds should remain independent from third-party publishing.
