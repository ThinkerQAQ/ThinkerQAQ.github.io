# Diagnose search-index submissions

The indexing page exposes the shared TXT URL inventory and XML sitemap above the engine selector. Engine cards link directly to Bing Webmaster Tools, Baidu Search Resource and Google Search Console. A successful submission means the provider accepted the request; it does not guarantee indexing.

## Baidu: `HTTP 400: over quota`

Check the selected site's quota in [Baidu Search Resource](https://ziyuan.baidu.com/linksubmit/index?site=https%3A%2F%2Fthinkerqaq.com). The failed request exceeds the available submission quota; the error alone does not establish whether the quota is zero or simply smaller than the batch. BlogCTL does not automatically retry this rejection or mark the rejected URLs as submitted.

Incremental submission compares against the last successful **Baidu** snapshot, independently of IndexNow. If there is no successful Baidu snapshot, all current URLs are new, so incremental and full submission can select the same inventory. Repeatedly clicking full submission does not resolve insufficient quota. The failed task retains HTTP status and the number of URLs actually attempted, rather than the full planned inventory count.

## Google: property mismatch

The default property is `sc-domain:thinkerqaq.com`. The active property and site resources are configured in `[search]` in `blogctl.toml`. Sitemap submission, URL Inspection, credential checks, browser Request Indexing and the CLI default use this same configuration. Sitemap URLs remain ordinary HTTPS URLs under the configured site origin. See [configuration](../reference/configuration.md).

`https://thinkerqaq.com/` is a separate URL-prefix property. A service account with Full user permission on the domain property does not make this separate property available. Verify the exact property through the read-only Sites API. If the domain property still returns 403, grant the configured service account access to that exact property; do not replace valid credentials merely because another property fails.

Google has no IndexNow-style incremental/full URL-push API in this workflow: the Sitemap action submits both XML and TXT feeds; URL Inspection reads indexing state; browser Request Indexing acts on the inspection-derived queue.

## Domain migration

Current inventory URLs are validated against the selected origin. Previous snapshots from another origin are reset before computing deletions. Legacy snapshots without an origin cannot contribute foreign URLs. Inspection calls and the browser Request Indexing path reject foreign-origin URLs before reaching the provider. Google candidates outside the current origin are excluded from new request queues.

## Observed incident, 2026-10-12

- Installed inventory: 2760 URLs and fingerprints, all under `thinkerqaq.com`; IndexNow full submission completed with HTTP 200.
- Baidu incremental and full tasks returned `400 / over quota`. The active Baidu site was `https://thinkerqaq.com`.
- Google Sitemap tasks returned `403` for `https://thinkerqaq.com/`. A read-only permission comparison returned `404 / not a verified site` for this URL-prefix property and `200 / siteFullUser` for `sc-domain:thinkerqaq.com`.
- GitHub's deployment variable was also `sc-domain:thinkerqaq.com`.
- Verification used an isolated Bridge HTTP API with simulated providers for success, quota rejection, migration and foreign-URL rejection. No live submission was repeated. These observations do not establish the current Baidu remaining quota or a successful live Google Sitemap submission after deployment.

## Request sequence and dependencies

The following is the code-derived request path. Incident failures and read-only Google responses are observed. DNS resolution location and external gateway internals are unknown. Native Messaging bootstraps the connection; individual indexing requests use Bridge HTTP.

```mermaid
sequenceDiagram
    actor U as User
    participant UI as Popup / Console
    participant R as Console Relay
    participant BG as Extension Background
    participant NH as Native Host
    participant B as Go Bridge :32145
    participant J as Durable task goroutine
    participant S as Go search service
    participant F as Local inventory / snapshots / jobs
    participant PX as HTTP proxy 127.0.0.1:11111
    participant O as Google OAuth
    participant BA as Baidu API
    participant BI as Bing IndexNow
    participant GS as Google Search Console API
    participant GI as Google URL Inspection API
    participant W as thinkerqaq.com
    BG->>NH: Native Messaging bootstrap
    NH-->>BG: Bridge endpoint and token
    U->>UI: Submit / inspect
    opt Web Console
        UI->>R: postMessage
        R->>BG: runtime.sendMessage
    end
    opt Extension Popup
        UI->>BG: runtime.sendMessage
    end
    BG->>B: HTTP POST /v1/search/index/jobs/{provider}
    B->>F: Persist task
    B-->>BG: 202 accepted
    B-)J: Execute task asynchronously
    J->>S: Fetch inventory and submit / inspect
    S->>PX: HTTP client (configured proxy)
    PX->>W: HTTPS GET /sitemap-all.txt and /sitemap-inventory.json
    W-->>PX: Current-domain URLs and fingerprints
    PX-->>S: Inventory
    S->>F: Read provider snapshot
    F-->>S: Last successful snapshot
    Note over S,F: Origin migration resets foreign snapshot; never submit old-domain deletions
    alt Baidu incremental / full
        S->>PX: POST http://data.zz.baidu.com/urls, site=thinkerqaq.com
        PX->>BA: Text URL batch
        BA-->>PX: Observed 400 over quota
        PX-->>S: Quota rejection
        S->>F: Preserve snapshot; record failure HTTP/count
    else IndexNow incremental / full
        S->>PX: HTTPS POST www.bing.com/indexnow
        PX->>BI: Current-origin host, keyLocation, URLs
        BI-->>PX: Observed installed full task: 200
        PX-->>S: Acceptance
    else Google Sitemap / Inspection
        S->>PX: HTTPS OAuth token exchange
        PX->>O: Service account assertion
        O-->>PX: Access token
        PX-->>S: Access token
        S->>PX: PUT /webmasters/v3/sites/{property}/sitemaps/{feed}
        PX->>GS: Before: URL-prefix property; after: domain property
        GS-->>PX: Observed incident: 403; domain Sites read: 200/siteFullUser
        PX-->>S: Response
        opt Inspection action
            S->>PX: POST /v1/urlInspection/index:inspect
            PX->>GI: siteUrl=sc-domain:thinkerqaq.com and current URL
            GI-->>PX: Inspection result (simulated in verification)
            PX-->>S: Result
        end
    end
    S-->>J: Result / error
    J->>F: Persist task outcome
    BG->>B: Poll task / indexing state
    B-->>BG: Status, HTTP, counts, error
    BG-->>UI: Display outcome and console link
    Note over PX,W: DNS / internet gateway placement unknown; not instrumented
```

| Component | Depends on | Interface | Evidence / status | Failure impact |
| --- | --- | --- | --- | --- |
| User / UI | Background or relay | Runtime message / postMessage | Browser preview verified shared links and engine filtering | Cannot submit or display result |
| Console relay | Background | Runtime message | console-relay.js; Popup uses Background directly | Console forwarding fails |
| Background | Native Host, Bridge | Native Messaging; authenticated HTTP | background.js | Connection/authentication failure |
| Native Host | Bridge process | Connection bootstrap | Existing native-host contract; not changed | Bridge connection unavailable |
| Bridge | Task executor, local files | HTTP :32145; Go calls | Isolated API scenarios passed | Cannot accept or recover tasks |
| Task executor | Search service, task file | Goroutine; callbacks; file I/O | search_jobs.go | Task becomes failed / incomplete |
| Search service | Proxy, provider snapshot | net/http; file I/O | Domain guards and API smoke passed | Wrong selection or provider request failure |
| Local files | Filesystem | JSON inventory, snapshots and jobs | Installed records read; production data preserved | Delta baseline / recovery lost |
| HTTP proxy | External services | 127.0.0.1:11111 | Enabled in installed config; read-only Google requests succeeded | All proxied requests can fail |
| thinkerqaq.com | External serving stack unknown | HTTPS inventory | Live read: 2760 current-domain URLs and fingerprints | No inventory to submit |
| Google OAuth | Account credentials, Google | HTTPS token exchange | Read-only exchange succeeded | Google APIs unavailable |
| Baidu API | Site token and quota | HTTP text URL submission | Observed 400 over quota | No accepted baseline |
| Bing IndexNow | Current-origin key and inventory | HTTPS JSON | Installed full task 200; simulated modes passed | Notification fails |
| Google Search Console API | Exact property permission | HTTPS Sites / Sitemaps | Domain property read 200; old prefix read 404 | Sitemap submission rejected |
| Google Inspection API | Exact property, OAuth, quota | HTTPS JSON | Domain property verified in simulated Bridge flow | Inspection unavailable; queue cannot be populated |

References: [Google Sitemap API](https://developers.google.com/webmaster-tools/v1/sitemaps/submit), [Baidu ordinary submission](https://ziyuan.baidu.com/linksubmit/index), [Bing IndexNow](https://www.bing.com/webmasters/help/indexnow-0z209wby).
