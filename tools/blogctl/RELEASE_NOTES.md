# BlogCTL v0.1.116 (local experimental build)

Align the Windows Bridge, Native Host, and Edge/Chrome extension at v0.1.116.

- Add a **direct HTTP** Toutiao creator CSRF preflight and HAR-grounded draft
  request format. No creator-editor window, DOM automation, or browser relay.
- Add a standalone, explicit opt-in Toutiao HTTP diagnostic command. Its
  default is read-only; draft creation requires a separate confirmation flag.
- Shorten disabled-platform status labels and avoid repeating explanatory
  messages in the extension UI.
- Keep the Toutiao draft/publish UI **disabled** until a real private draft
  save and creator inventory readback succeed. Existing publication data
  and all other platforms remain unchanged.

This is a local test build from PR #177, not a published stable release.

---

# BlogCTL v0.1.115

Remove the Toutiao browser editor relay introduced in v0.1.114.

The previous implementation opened the Toutiao Creator editor to perform
signed requests. This does not meet the requirement that BlogCTL perform
publishing strictly via an HTTP API and caused unnecessary task timeouts.

## Changes

- Fully remove the creator editor browser relay, MAIN-world scripting,
  additional Bridge endpoints, queued requests and timeout/polling logic.
- Keep the existing Toutiao account, published/draft inventory lookup,
  detection and manually verified article binding operations.
- Mark Toutiao draft creation, draft update, publishing and published
  article updating unavailable until a reliable direct-HTTP signing
  implementation is verified.
- Hide/disable Toutiao writer actions in the extension and refuse write
  operations in the Bridge and publisher Service before any outbound
  request or article asset rendering.
- Preserve all existing Data/ files, configuration and publication bindings.
- Keep all other platforms' publishing operations unaffected.

## Verification

Go tests and focused extension tests cover the disabled writes. No Toutiao
article was created, edited or published during this change.
