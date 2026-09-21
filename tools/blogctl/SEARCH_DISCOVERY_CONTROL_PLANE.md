# BlogCTL Search Discovery Control Plane

Status: implementation plan  
Date: 2026-09-21  
Target branch: `feat/blogctl-native-juejin-20260918` / PR #34

## 1. Decision

BlogCTL should own search-engine discovery as a first-class control-plane capability, alongside publishing.

The search subsystem is not a generic SEO framework and it must not invent unsupported "force indexing" behavior. Its responsibility is narrower:

- produce one authoritative inventory of indexable canonical URLs;
- publish standards-based discovery artifacts;
- notify search engines through supported APIs;
- audit search-engine state where a supported inspection API exists;
- keep provider-specific limitations explicit.

Target shape:

```text
BlogCTL
├── compiler
├── assets
├── publisher
├── state
├── bridge / extension
└── search
    ├── inventory
    ├── sitemap
    ├── google
    ├── indexnow
    └── audit
```

The personal site build remains the source of truth for whether a route is indexable. Search providers consume the build's canonical URL inventory rather than independently walking `src/content/**`.

## 2. Deep review of the current implementation

### 2.1 Astro sitemap filtering is already the correct source of truth

`astro.config.mjs` already centralizes route-indexability rules through `@astrojs/sitemap`:

- explicit route exclusions such as search, 404, and agent pages;
- `content-manifest.json` noindex rules;
- English Note inclusion only when a real translation exists;
- legacy redirect exclusion.

That is valuable because the generated sitemap represents the exact deployed routing model after content assembly.

The search subsystem should reuse that output instead of reimplementing those rules.

### 2.2 robots.txt currently exposes only the XML sitemap index

Current:

```text
Sitemap: https://thinkerqaq.github.io/sitemap-index.xml
```

This is valid, but it leaves no independent flat inventory path for debugging provider-specific sitemap-index processing.

A generated text sitemap is useful because both Google and Bing accept text sitemaps, and it can be produced from exactly the same URL inventory.

### 2.3 IndexNow works, but it is still a parallel root-script subsystem

Current ownership:

```text
scripts/indexnow.mjs
  ├── parses generated sitemaps
  ├── validates origin
  ├── builds IndexNow payload
  └── submits IndexNow request

blogctl indexnow
  └── shells out through npm to scripts/indexnow.mjs
```

This conflicts with the direction already established by the unified BlogCTL publishing branch: user-facing control-plane capabilities should live under `tools/blogctl/**`; root scripts should be compatibility/build wrappers only.

### 2.4 Current IndexNow preparation resubmits the complete URL inventory

The current workflow prepares every URL in the generated sitemaps and submits the resulting payload after every deployment.

That is safe for a small site, but it is not the intended steady-state IndexNow model. Bing's official guidance describes IndexNow as notification for URLs that are added, updated, or deleted, while sitemaps provide comprehensive inventory coverage.

The target API therefore needs both:

```text
--all               explicit bootstrap / migration / broad engine change
--urls-file <file>  incremental changed URL set
```

The deployment workflow can migrate to changed-only submission once a reliable route-change manifest is available. Until then, preserving the current full-site behavior avoids silently dropping discovery notifications.

### 2.5 Deployment ordering is already correct

The current workflow does not notify IndexNow until the GitHub Pages deployment succeeds.

That ordering must be preserved for every provider:

```text
build -> deploy -> notify search engines
```

Never notify a provider about a URL before the corresponding deployment is live.

### 2.6 Google has no supported bulk "request indexing" API for ordinary blog pages

The supported Search Console API operations relevant here are:

- sitemap submission;
- URL Inspection of the version known to Google's index.

There is no general Search Console API equivalent of clicking "Request indexing" for every ordinary blog URL.

Google's separate Indexing API must not be used as a workaround for normal blog pages.

Therefore the Google adapter should expose:

```text
submit sitemaps
audit indexed state
```

and deliberately not expose:

```text
force-index every page
```

### 2.7 URL Inspection is useful for audit, not live-indexability testing

Google documents the URL Inspection API as inspection of the version in Google's index; it does not run the live URL test available in the Search Console UI.

Current documented per-site URL Inspection quota is 2,000 requests/day and 600 requests/minute.

BlogCTL should therefore make auditing explicit and bounded instead of running it automatically on every deployment.

### 2.8 There is no current Google Search Console provider

The repository currently has:

- XML sitemap generation;
- IndexNow;
- Bing-compatible sitemap discovery through robots.txt.

It does not have:

- programmatic Search Console sitemap submission;
- machine-readable Google URL inspection reports;
- CI credentials support for Search Console.

That is the largest functional gap.

## 3. Provider capability model

Provider differences must remain explicit.

Conceptually:

```go
type Capabilities struct {
    SubmitSitemaps bool
    SubmitURLs     bool
    InspectURLs    bool
}
```

Current capabilities:

| Provider | Submit sitemap | Submit URL changes | Inspect indexed state |
| --- | --- | --- | --- |
| Google Search Console | yes | no general ordinary-page API | yes |
| IndexNow / Bing | sitemap handled separately | yes | Bing UI, not this API |

This prevents a leaky abstraction where the system pretends every provider supports `submitURL()`.

## 4. One canonical URL inventory

The generated Astro sitemap chain becomes the canonical discovery inventory:

```text
Astro indexability rules
        |
        v
sitemap-index.xml
        |
        v
child sitemap(s)
        |
        v
BlogCTL search inventory
        |
        +--> sitemap-all.txt
        +--> IndexNow
        +--> Google audit scope
        +--> diagnostics
```

Requirements:

1. every discovered URL must use the same origin;
2. duplicate URLs are removed;
3. output is deterministic and sorted;
4. child sitemap paths may not escape the build directory;
5. an empty inventory is an error;
6. text sitemap generation must use the same inventory, never a second content walker.

## 5. Public discovery artifacts

Production should expose:

```text
/sitemap-index.xml   Astro-generated index
/sitemap-*.xml       Astro-generated child sitemap(s)
/sitemap-all.txt     BlogCTL-generated flat canonical URL inventory
/rss.xml             recent article feed
/robots.txt          advertises XML + text sitemap
```

`robots.txt`:

```text
User-agent: *
Allow: /

Sitemap: https://thinkerqaq.github.io/sitemap-index.xml
Sitemap: https://thinkerqaq.github.io/sitemap-all.txt
```

The text sitemap is a redundant discovery route, not a second source of truth.

## 6. BlogCTL package boundary

Implementation layout:

```text
tools/blogctl/search/
└── node/
    ├── inventory.mjs
    ├── inventory.test.mjs
    ├── indexnow.mjs
    ├── indexnow.test.mjs
    ├── google-auth.mjs
    ├── google.mjs
    ├── google.test.mjs
    └── cli.mjs
```

Node is appropriate for the first implementation because:

- the build and sitemap artifacts already live in the Node/Astro pipeline;
- the project already requires Node for site operations;
- provider calls need only built-in `fetch` and `node:crypto`;
- no new runtime dependency is required.

This is still BlogCTL-owned code because the module lives under `tools/blogctl/search` and is invoked through `blogctl search`.

A later Go rewrite is unnecessary unless it delivers a concrete operational benefit.

## 7. CLI contract

Primary interface:

```bash
blogctl search inventory
blogctl search build

blogctl search submit --providers google
blogctl search submit --providers indexnow --all
blogctl search submit --providers indexnow --urls-file changed-urls.txt
blogctl search submit --providers google,indexnow --all

blogctl search audit --provider google
blogctl search audit --provider google --limit 500
blogctl search audit --provider google --output .search/google-audit.json
```

Compatibility:

```bash
blogctl indexnow ...
```

may remain temporarily as a wrapper while CI and local usage migrate.

### Safety rules

- IndexNow full-site submission requires explicit `--all`.
- Incremental IndexNow submission requires `--urls-file`.
- Google audit defaults to at most the official daily per-site inspection quota.
- Google sitemap submission never sends page URLs through the restricted Google Indexing API.

## 8. Google authentication

Search Console requires OAuth 2.0.

For non-interactive CI, BlogCTL supports a Google service-account credential JSON supplied through:

```text
GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON
```

The implementation:

1. signs an OAuth JWT assertion with the service-account RSA private key;
2. exchanges it at Google's OAuth token endpoint;
3. requests the `https://www.googleapis.com/auth/webmasters` scope;
4. uses the returned bearer token for sitemap submission and URL Inspection.

The service-account identity must have access to the Search Console property.

Optional override:

```text
GOOGLE_SEARCH_CONSOLE_SITE_URL
```

Default for this site:

```text
https://thinkerqaq.github.io/
```

The credential JSON is a secret and must never be written into generated artifacts or repository configuration.

## 9. Google operations

### 9.1 Sitemap submission

After a successful deployment submit:

```text
https://thinkerqaq.github.io/sitemap-index.xml
https://thinkerqaq.github.io/sitemap-all.txt
```

Search Console sitemap submission is idempotent from BlogCTL's perspective.

If Google credentials are not configured in CI, the Google notification step should log a structured `skipped` result rather than fail the site deployment.

### 9.2 URL audit

Audit reads the canonical inventory and calls URL Inspection for a bounded number of URLs.

Persisted report fields should include at least:

- URL;
- verdict;
- coverage state;
- robots.txt state;
- indexing state;
- last crawl time;
- user-declared canonical;
- Google-selected canonical;
- referring URLs when present.

The report is diagnostic output, not durable publication state.

## 10. IndexNow operations

IndexNow continues to use the hosted key file.

Provider behavior:

- validate every submitted URL belongs to the configured origin;
- deduplicate and sort;
- split submissions into protocol-safe batches;
- accept HTTP 200 and 202;
- retry 429 and 5xx failures with bounded backoff;
- fail immediately for permanent 4xx errors;
- support explicit full-site and incremental URL-file modes.

The current hosted key remains compatible; moving implementation ownership does not require rotating it.

## 11. Build integration

Production build order:

```text
clean
 -> diagrams
 -> social covers
 -> astro build
 -> BlogCTL search build
      -> read generated sitemap chain
      -> write sitemap-all.txt
 -> Pagefind/search build
```

The generated text sitemap is therefore guaranteed to represent the exact Astro output from the same build.

## 12. Deployment integration

Target deployment:

```text
build
  |
  +--> search inventory + sitemap-all.txt
  |
  +--> prepare IndexNow payload
  |
deploy GitHub Pages
  |
  +--> submit IndexNow payload
  |
  +--> submit Google sitemap-index.xml
  |
  +--> submit Google sitemap-all.txt
```

Search notifications remain non-blocking relative to the website deployment.

Google URL Inspection is intentionally not part of every deploy.

## 13. Testing strategy

### Inventory tests

- XML entity decoding;
- sitemap index -> child sitemap resolution;
- deduplication and deterministic sort;
- wrong-origin rejection;
- path traversal rejection;
- text sitemap output.

### IndexNow tests

- payload generation from canonical inventory;
- explicit URL subset filtering;
- 200 / 202 success;
- 429 / 5xx retry;
- permanent 4xx failure;
- batching.

### Google tests

- service-account JWT structure and signing path;
- OAuth token exchange request;
- Search Console sitemap PUT request;
- URL Inspection request/response normalization;
- missing credentials -> structured skip at CLI layer.

### CLI tests

Keep provider logic testable independently so CLI parsing remains thin.

## 14. Migration and compatibility

### Phase A — canonical inventory and text sitemap

Implement now.

### Phase B — move provider core under BlogCTL

Implement now.

`scripts/indexnow.mjs` becomes a compatibility wrapper around BlogCTL-owned provider code.

### Phase C — Google sitemap submission

Implement now.

CI runs it after deploy when credentials exist.

### Phase D — Google URL audit

Implement now as an explicit command.

Do not schedule a full-site audit automatically.

### Phase E — changed-only IndexNow deployment

Provider support for `--urls-file` is implemented now.

The current deployment may continue using the full inventory until the content/build pipeline emits a reliable route-level change manifest. Once that manifest exists, CI should switch normal content deployments to changed-only mode and reserve `--all` for migrations or broad engine changes.

### Phase F — compatibility cleanup

After the new command is stable:

- migrate docs and CI to `blogctl search`;
- retain or remove `blogctl indexnow` based on compatibility need;
- keep root scripts only when they are thin wrappers.

## 15. Explicit non-goals

Do not:

- use Google's restricted Indexing API for ordinary Articles or Notes;
- scrape or automate the Search Console UI's manual "Request indexing" button;
- create separate Chinese and English URL truth sources;
- maintain provider-specific hand-written URL lists;
- run 2,000 Google inspections after every deploy;
- put OAuth/service-account secrets in public config or build artifacts;
- notify providers before deployment succeeds;
- make search notification failure fail the website deployment.

## 16. Official constraints reviewed

Google Search Console sitemap submission:

https://developers.google.com/webmaster-tools/v1/sitemaps/submit

Google URL Inspection API:

https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect

Google Search Console API quotas:

https://developers.google.com/webmaster-tools/limits

Google Search Console OAuth:

https://developers.google.com/webmaster-tools/v1/how-tos/authorizing

Bing / IndexNow guidance:

https://www.bing.com/indexnow/getstarted

Bing sitemap guidance:

https://www2.bing.com/webmasters/help/sitemaps-3b5cf6ed

## 17. Acceptance criteria

The implementation is complete for this phase when:

1. `npm run build` creates `dist/sitemap-all.txt` from the Astro sitemap inventory.
2. `robots.txt` advertises both XML and text sitemaps.
3. reusable inventory and provider code lives under `tools/blogctl/search/**`.
4. `blogctl search` exists.
5. IndexNow can submit either explicit full inventory or a URL file.
6. Google can submit both sitemap URLs when OAuth credentials are configured.
7. Google audit can inspect a bounded URL set and emit JSON.
8. search/provider failures are covered by tests.
9. PR validation remains green.
10. site deployment remains independent of provider notification success.

## 18. Implementation status

Implemented on PR #34 on 2026-09-21:

- canonical search inventory is derived from Astro's generated sitemap chain;
- `sitemap-all.txt` is generated during the normal production build;
- `robots.txt` advertises both XML and text sitemaps;
- IndexNow provider code lives under BlogCTL and supports full or URL-file scopes;
- the old root IndexNow script is reduced to a compatibility wrapper;
- Google service-account OAuth, sitemap submission, and bounded URL Inspection audit are implemented;
- `blogctl search build|inventory|submit|audit` is available;
- post-deploy notification remains non-blocking and Google submission skips cleanly until credentials are configured.

Operational setup still required for Google: grant the service-account email access to the Search Console property and add its credential JSON as the `GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON` GitHub Actions secret.

Future optimization: once the content/deployment pipeline emits a reliable route-level change manifest, switch normal IndexNow deployment from full-site payload preparation to `--urls-file`; keep `--all` for bootstrap/migrations and broad routing changes.
