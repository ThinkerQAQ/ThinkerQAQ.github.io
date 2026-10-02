# BlogCTL Search Discovery Control Plane

Status: Go migration implemented on `docs/blogctl-go-runtime-ci-refactor-20261001`  
Updated: 2026-10-02

## 1. Definition

Search discovery is:

> **one canonical deployed URL inventory, consumed by provider-specific Go adapters; browser automation exists only for capabilities that have no ordinary-page API.**

```text
Astro indexability rules
        ↓
generated sitemap chain
        ↓
BlogCTL Go Search Core
├── sitemap-all.txt
├── sitemap-inventory.json
├── diff / provider snapshots
├── IndexNow
├── Baidu
└── Google Search Console API

Google Request Indexing
        ↓
Extension JS
        ↓
Search Console browser UI
```

The site build remains the source of truth for whether a route is indexable. Providers do not walk content independently.

## 2. Ownership

### Go owns

```text
tools/blogctl/search/
├── inventory.go
├── diff.go
├── indexnow.go
├── baidu.go
└── google.go
```

Responsibilities:

- parse the generated sitemap chain;
- normalize/deduplicate/sort canonical URLs;
- generate `sitemap-all.txt`;
- generate per-URL SHA-256 fingerprints in `sitemap-inventory.json`;
- fetch the deployed inventory;
- compute full/incremental provider diffs;
- keep provider snapshots separate;
- call IndexNow;
- call Baidu ordinary URL submission;
- create Google service-account JWT/OAuth tokens;
- submit Google sitemaps;
- call Google URL Inspection.

The old `tools/blogctl/search/node/` runtime and root `scripts/indexnow.mjs` are removed.

### Browser JS owns

Only browser-native behavior:

- Google Search Console **Request Indexing** UI automation;
- extension UI;
- Chrome session/DOM capabilities.

Do not move Request Indexing into Go unless Google exposes a supported ordinary-page API.

## 3. Canonical inventory

Build order:

```text
BlogCTL site build
  ↓
Astro build
  ↓
read sitemap-index.xml + child sitemaps
  ↓
write sitemap-all.txt
  ↓
hash generated pages
  ↓
write sitemap-inventory.json
  ↓
Pagefind
```

Rules:

1. all URLs must belong to the same origin;
2. duplicates are removed;
3. output is deterministic;
4. sitemap/page paths may not escape `dist`;
5. empty inventory is an error;
6. fingerprints hash the generated page bytes, not the Markdown source.

The deployed pair:

```text
/sitemap-all.txt
/sitemap-inventory.json
```

lets the Bridge calculate incremental changes from the exact deployed output.

## 4. Provider model

| Provider | Sitemap API | URL submit | Indexed-state inspection | Baseline |
| --- | --- | --- | --- | --- |
| IndexNow/Bing | separate sitemap discovery | yes | no | own snapshot |
| Baidu | sitemap registration is not automated | ordinary URL push | no | own snapshot |
| Google Search Console | yes | no ordinary-page submit API | URL Inspection API | inspection state |

Provider semantics are deliberately not forced behind one fake `SubmitURL()` abstraction.

## 5. IndexNow

IndexNow behavior:

- validates origin;
- deduplicates and sorts;
- batches at the protocol limit used by BlogCTL;
- accepts HTTP 200/202;
- retries bounded transient failures;
- supports full and incremental modes.

For incremental Bridge jobs, added/changed/deleted URLs may be selected so Bing can re-crawl deleted URLs and observe the resulting 404/410.

Snapshot file:

```text
bing-indexnow-snapshot.json
```

The snapshot advances only after successful submission.

## 6. Baidu

Baidu ordinary resource submission is implemented in Go using its URL push endpoint.

Behavior:

```text
previous Baidu snapshot
        +
current deployed inventory
        ↓
diff
├── added    ─┐
├── changed  ─┼── submit
├── deleted   └── record only; do not submit through ordinary push
└── unchanged
```

Properties:

- request body is newline-separated URLs with `Content-Type: text/plain`;
- max 2,000 URLs per batch;
- Token is never returned to the Extension and is redacted from request failures;
- Baidu has an independent snapshot: `baidu-snapshot.json`;
- partial aggregate success is fail-closed.

The last point matters because Baidu may report only an aggregate success count. If a submitted batch is only partially accepted, BlogCTL cannot safely identify which URLs succeeded. Therefore it **does not advance that batch's baseline** and lets a later run retry.

Local config belongs in:

```text
BlogCTL/blogctl.toml

baidu_site = "https://thinkerqaq.github.io"
baidu_token = "..."
```

The Extension exposes these through the search configuration card without returning the secret value.

CI may inject `BAIDU_PUSH_TOKEN` / `BAIDU_SITE` into the current-checkout BlogCTL process. These are CI transport inputs, not a second local configuration system.

## 7. Google

### 7.1 API path — Go

BlogCTL Go implements:

```text
Service Account JSON
→ RS256 JWT assertion
→ OAuth token
→ Search Console API
   ├── submit sitemap-index.xml
   ├── submit sitemap-all.txt
   └── URL Inspection
```

CLI:

```bash
blogctl search submit --providers google
blogctl search audit --provider google --limit 500 --output .search/google-audit.json
```

Bridge operations use durable tasks so inspection progress survives UI navigation and can be retried.

### 7.2 Request Indexing path — Browser JS

Ordinary-page Request Indexing remains:

```text
Go queue/state
   ↓
Extension JS
   ↓
Search Console page
   ↓
Request indexing
```

This is intentionally separate from the Google API provider.

## 8. CLI

Primary interface:

```bash
blogctl search build
blogctl search inventory

blogctl search submit --providers indexnow --all
blogctl search submit --providers indexnow --urls-file changed-urls.txt

blogctl search submit --providers baidu --all
blogctl search submit --providers baidu --urls-file changed-urls.txt

blogctl search submit --providers google

blogctl search audit --provider google --limit 500 --output .search/google-audit.json

blogctl search notify
```

`blogctl search notify` reads the **live deployed** inventory after Pages deployment, then notifies configured providers.

The legacy `blogctl indexnow` wrapper is removed.

## 9. Bridge / durable state

Persistent files under the BlogCTL user config directory:

```text
search-index.json
bing-indexnow-snapshot.json
baidu-snapshot.json
blogctl.toml
```

Bridge task types:

```text
bing-indexnow
baidu-submit
google-sitemaps
google-inspection
google-request-indexing   # browser path
```

Search state exposed to the Extension contains readiness/status only; provider secrets are never returned.

## 10. CI

There is no standalone search workflow.

```text
deploy success
   ↓
build BlogCTL from current checkout
   ↓
blogctl search notify
```

The workflow does not download a released BlogCTL binary because CI must execute the implementation from the same commit it is deploying.

Search notification remains non-blocking relative to website deployment.

## 11. Safety invariants

- Never notify providers before the site is live.
- Never use Google's restricted Indexing API for normal Articles/Notes.
- Never expose Google/Baidu credentials through Bridge API responses.
- Never share a snapshot between providers.
- Never guess which Baidu URLs succeeded after partial aggregate acceptance.
- Never create a second hand-written Chinese/English URL inventory.
- Never make Google Request Indexing part of the Go HTTP provider.

## 12. Current implementation boundary

Search discovery is now Go-owned.

Remaining Node dependencies around site/search are ecosystem tools rather than Search business logic:

```text
Astro
Pagefind
browser extension
```

AI Search (Cloudflare retrieval/indexing) is a separate subsystem. Its sync/evaluation implementation is the next backend migration target and is not part of this Search Discovery provider layer.
