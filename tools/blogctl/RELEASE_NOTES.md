# BlogCTL v0.1.155

360 Search and Sogou now appear alongside IndexNow, Baidu and Google on the indexing page, using the same configured site and Sitemap resources.

- Added 360 and Sogou webmaster-console links and Baidu-style status, statistics, incremental submission and full submission controls. Removed repeated site and Sitemap instructions from their cards.
- Connected both controls through Extension messaging to authenticated Bridge JSON endpoints: `POST /v1/search/index/jobs/so360` and `POST /v1/search/index/jobs/sogou`.
- Remote submission remains deferred. Valid requests return `supported:false`, `submitted:false` and `submission_not_implemented`; the UI reports that the provider is not connected. No URLs are sent, no successful task is fabricated and no submission snapshot is advanced.
- Reject invalid modes, unknown request fields, multiple JSON documents and unauthenticated writes. Persist the last local attempt and log its provider, mode and outcome.
- Kept site identity and Sitemap settings in the existing shared configuration. Engine filtering includes the new cards, and operation messages remain visible for every engine.
- Added English translations and kept Extension, Bridge and executable versions aligned at 0.1.155.
- Previous GitHub Releases are retained when publishing a new version.

## Upgrade

Replace the executable and extension files together, preserve the existing `Data/` directory, restart the idle Bridge, then reload the unpacked Extension in Edge or Chrome.

## Validation

Windows native and site builds, extension JavaScript checks and documentation checks passed. Local HTTP smoke checks verified both submission modes for both providers, invalid request rejection, authentication enforcement and unchanged configuration, jobs and IndexNow snapshot files. Both revised cards were inspected in the local browser preview. The Windows installation was updated to 0.1.155 for user review.

Remote 360/Sogou Sitemap submission and indexing are not implemented or claimed by this release.
