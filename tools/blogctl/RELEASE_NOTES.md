# BlogCTL v0.1.114

Fix Toutiao draft creation by executing signed creator-editor saves in the
already logged-in Chromium page, instead of making unsigned Bridge HTTP writes.

## Changes

- Correct initial draft form fields to match the recorded Toutiao creator
  editor request (save=0, absent pgc_id, initial ad type and nickname).
- Route the restricted Toutiao publish/save endpoint through a browser-main-world
  fetch. The Go Bridge still owns compilation, image handling, task state and
  publication bindings.
- Reuse the logged-in editor's page runtime for dynamically generated request
  security parameters; never hard-code HAR signatures or persist browser cookies.
- Keep the browser request relay strictly limited to the known creator-editor
  POST endpoint and authorized Bridge token. Expire unfulfilled requests and
  report meaningful browser-runtime and upstream errors.
- Keep published edits explicit and protect existing published article IDs.
- Add tests for zero-binding draft creation, relay authentication, forbidden
  endpoints, browser execution, cancellation and response handling.
- Align CLI, Native Host, Bridge and Extension versions at v0.1.114.

## Integration note

Reload the BlogCTL browser extension after upgrading. Keep Toutiao Creator
Center logged in. The first draft creation may open an inactive creator
editor tab to perform the signed save request. Real-account verification is
required; HAR and mocked tests alone cannot guarantee site compatibility.
