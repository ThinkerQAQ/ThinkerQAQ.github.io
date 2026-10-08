# BlogCTL v0.1.108

BlogCTL now uses `https://thinkerqaq.com` consistently across the browser extension, website inventory, and search-indexing flows.

## Changes

- Switch the Google Search Console browser property and the indexing inventory source to the canonical domain.
- Show new-domain URLs in publishing preview and refresh repository documentation.
- Isolate persisted search inventories, IndexNow snapshots, and Google request queues by site origin, so records from the former `github.io` domain cannot be resumed or submitted as removals on the new site.
- Keep legacy DEV.to canonical matching and Reaction source-origin compatibility for previously published links.
- Keep CLI, extension, and release versions aligned.

The website's Search Console property still requires separate ownership verification and authorization before submission.
