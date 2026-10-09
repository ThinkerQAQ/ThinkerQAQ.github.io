# BlogCTL v0.1.113

Add explicit published-article editing and republishing for Toutiao, using the captured creator-editor workflow.

## Changes

- Open an owned Toutiao article in its original editor using from=edit and pgc_id.
- Provide an explicit "Update Published" action distinct from saving or creating drafts.
- Submit the original published pgc_id to /mp/agw/article/publish using the captured save=1 contract and published editor metadata.
- Check the current creator account, published status, and remote modify_time against the manually verified binding before submission.
- Preserve the original published ID and URL, never create a duplicate draft as a side effect, and require re-verification after republish submission.
- Treat a successful response as submitted for publishing review, not proof the updated public page is live.
- Align Windows CLI, Native Host, Bridge, and browser extension to v0.1.113.

Authenticated live republishing is intentionally not performed automatically; verification used captured HAR contracts and a mocked creator endpoint.
