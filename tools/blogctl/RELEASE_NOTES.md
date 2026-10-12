# BlogCTL v0.1.153

Search indexing now uses one saved site configuration across the Extension, Bridge and CLI.

- Added Settings → Search engines → Indexing site and URLs for the site origin, TXT URL list, XML Sitemap, optional content fingerprint inventory and Google Search Console property. These values persist in the `[search]` section of `blogctl.toml`.
- The index page displays shared TXT/XML links above the engine selector and provides direct Bing, Baidu and Google console links derived from the configured site.
- IndexNow, Baidu and Google operations consume the same configuration. Foreign-domain resources, incompatible Google properties and retries of tasks created with an older site configuration are rejected before submission.
- Improved Baidu quota error reporting without advancing the successful submission snapshot on failure.
- Added Settings → About with the actual Extension and running Bridge versions.
- Deferred index page rendering while the engine selector has focus, preserving the native dropdown during polling; the latest state appears when focus leaves the control.

## Upgrade

Replace the executable and extension files together, preserve the existing `Data/` directory, then reload the unpacked Extension. Existing installations automatically gain the `[search]` section; other settings and credentials remain intact. Review the configured Google property and grant the service account access to that property if required.

Changing the indexing site configuration does not change DNS, deploy the website or migrate its canonical URLs. Baidu submissions remain subject to the provider's available quota.

## Validation

Native BlogCTL build, extension JavaScript checks and the fixture site build passed. Isolated API integration probes verified configuration persistence across restart, migration, provider request targets, foreign-domain rejection, stale-task rejection and configuration changes blocked during active indexing jobs. Browser preview checks verified dropdown stability across polling and filtering after selection. Real Baidu submissions were not retried as part of verification.
