# BlogCTL v0.1.111

Repair Today Headline (Toutiao) article detection and draft updates using the captured creator-center request contracts.

## Changes

- Detect matching drafts and published articles from the authenticated creator inventory, with pagination and separate binding states.
- Fix draft create/update to use the captured save=0 mode, correct creator form fields and preserve the existing remote draft ID.
- Refuse stale or unknown draft IDs and preserve existing cover metadata when editing a draft.
- Keep draft saving separate from explicit publication; publishing itself requires a real-account acceptance test.
- Align the CLI, Native Host, Bridge, and browser extension to v0.1.111.
