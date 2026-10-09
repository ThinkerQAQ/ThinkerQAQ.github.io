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
