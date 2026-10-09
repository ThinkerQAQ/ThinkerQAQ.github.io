# BlogCTL v0.1.112

Align Toutiao image uploads with authenticated creator-editor traffic captured in the browser HAR.

## Changes

- Upload local images to POST /spice/image with multipart field image and upload_source=20020002.
- Import remote images using multipart imageUrl with upload_source=20020003 and need_cover_url=1.
- Parse the creator API result using code=0 and data.image_url; reject failed or malformed responses.
- Recognize Toutiao-hosted images to prevent unnecessary duplicate uploads.
- Reuse observed Toutiao editor CSRF and anti-token request headers from the browser session. Capture is ephemeral, name-restricted, and expires after 10 minutes; credentials are not persisted.
- Align CLI, Bridge, Native Host, and browser-extension versions to v0.1.112.

The captured HAR confirms the upload protocol. Live account upload and formal publication remain separate acceptance tests.
