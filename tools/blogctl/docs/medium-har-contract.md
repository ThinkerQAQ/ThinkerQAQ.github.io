# Medium editor capture: verified request structure

Scope: user-authorized 2026-10-17 Medium browser HAR, analyzed locally on
2026-10-18. This document intentionally contains NO cookies, tokens,
authorization headers, signed URLs, full request bodies, or captured IDs.

## Confirmed from the browser capture

| Request | Editor-observed facts |
| --- | --- |
| Upload | POST https://medium.com/_/upload?source=6; HTTP/2; 200; ~3.6s |
| Upload body | multipart/form-data with field uploadedFile; request Content-Length ~2.08 MB. HAR does not contain the actual binary payload or a reliable filename declaration. |
| Upload context | Origin https://medium.com, Referer https://medium.com/p/{draftId}/edit, Accept */*, Sec-Fetch-Site same-origin, Sec-Fetch-Mode cors, Sec-Fetch-Dest empty |
| Cache headers | Cache-Control no-cache, Pragma no-cache, DNT 1 |
| Client hints | Edge 155 (Microsoft Edge brand, not Google Chrome). |
| Upload response | JSON success, value has fileId, md5, mimeType, fileSize, fileName, imgWidth, imgHeight. |
| Editor save | Three successful POST /p/{draftId}/deltas?logLockId=... requests; baseRev advances between requests; editor used type=3 paragraph changes. |

## Crucial limitations

- The captured deltas represent an ALREADY MALFORMED BlogCTL-created
  article, so paragraph types therein are NOT a trustworthy template
  for good heading/list/code formatting.
- The returned image fileId DOES NOT APPEAR in any of the three
  captured deltas. The HAR proves image upload, not image insertion.
- The logLockId is a per-editor mutation parameter; the HAR does not
  provide evidence for a safe acquisition mechanism. Do not copy a
  captured value into a generic publishing request.
- The Go tls-client browser-profile transport supports HTTPS CONNECT
  through the configured proxy but is not the user's actual Edge network
  stack. The current proxy/path/header alignment does NOT prove
  that HTTP 504 is fixed.
- The browser-exported HAR omits the binary contents of uploaded files.
  Do not infer multipart boundary framing beyond the observed form field,
  content type and Content-Length.
- Do not reinterpret editor-created type=3 changes as equivalent to
  BlogCTL type=1 inserts without a verified revision/read-back test.

## Safety and next validation

Keep Medium as a draft-only test until both steps pass:

1. Upload a prepared PNG in the ACTUAL logged-in Edge page and verify
   the returned Medium native fileId without copying credentials.
2. Save a native Medium image paragraph in an EXISTING draft and
   read back the resulting paragraph metadata to prove the image renders
   as an image, not a hyperlink. Also verify H4/code/list rendering.

The browser upload route (via a tightly scoped BlogCTL Extension action)
is preferable to endlessly modifying tls-client fingerprint headers.
Do not create a new story for each image retry.
