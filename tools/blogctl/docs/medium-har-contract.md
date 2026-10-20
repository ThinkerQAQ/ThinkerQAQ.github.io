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

## Second capture: 2026-10-18 medium.com3.har

174 browser events, including one successful native image upload and the
following editor saves on an EXISTING draft:

- POST /_/upload?source=6, HTTP/2 200 in ~2.86 seconds; multipart request
  content length ~1.87 MB. The HAR omits the actual multipart binary body.
- Two image insertion-related editor saves follow the upload:
  1. Delta type=1 inserts paragraph type=4, layout=1 and initially empty
     metadata; delta type=3 updates originalWidth/originalHeight.
  2. A subsequent delta type=3 sets metadata exactly to id,
     originalWidth, originalHeight, with layout=1. This id matches the
     uploaded fileId, and the dimensions match the upload response.
- Editor saves include logLockId and incrementing baseRev. The HAR does not
  show how the editor acquired the logLockId; do not replay captured values.
- The captured image metadata does NOT contain an alt attribute.
- The browser upload has the cf_clearance cookie; the Go upload also has
  cf_clearance. The browser additionally includes the _dd_s telemetry
  cookie, which the Go session does not forward. Cookie names were compared,
  but NO cookie VALUES were read or saved.
- The Go version 0.1.170 upload to the same endpoint still returned 504
  in ~13.87 seconds. The Medium GraphQL and new-story requests both
  succeeded. This is consistent with a transport-level difference, but
  does not identify whether a TLS/HTTP2 fingerprint, multipart encoding,
  Medium anti-abuse rule or intermediary is responsible.

## Crucial limitations

- Image insertion is now confirmed as an editor update sequence, not just an
  upload. BlogCTL currently prepares a fully populated native image
  paragraph as one insert. Whether that single-insert variant is accepted
  by Medium has NOT been verified.
- The browser-exported HAR omits uploaded binary body bytes, so multipart
  framing cannot be compared byte-for-byte with Go.
- The Go tls-client uses its available Chrome 152 profile for the user's Edge
  155 browser, and it is not the actual Edge network stack. Header tweaks
  cannot guarantee a matching TLS/HTTP2 fingerprint.
- The editor's image insertion sequence was captured. The rest of the
  document's old code/heading/list paragraphs are still malformed; DO NOT
  copy those paragraph types back into the Compiler.
- The logLockId and per-revision save logic are not yet fully understood.
  Do not create a new story or replay a captured editor revision to test
  these unknowns.

## Safety and next validation

Keep Medium as a draft-only test until both steps pass:

1. Upload a prepared PNG in the ACTUAL logged-in Edge page and verify
   the returned Medium native fileId without copying credentials.
2. Apply the verified editor image insertion/update sequence to an
   EXISTING draft with the correct revision handling, then read back the
   resulting paragraph metadata and rendered image. Also verify
   H4/code/list formatting.

The browser upload route (via a tightly scoped BlogCTL Extension action)
is preferable to endlessly modifying tls-client fingerprint headers.
Do not create a new story for each image retry.


## 2026-10-20: draft creation readback guard (offline-verified)

The explicit draft-create path now records the returned Medium draft ID in a
durable task event immediately after new-story succeeds. The saved body must
then pass a GraphQL readback integrity check (paragraph count and order,
paragraph type, exact text including code formatting, native image file IDs
and dimensions). The check fails closed and leaves the incomplete draft
reference available for inspection.

This does **not** validate the unconfirmed GraphQL schema or the editor's
multi-step image Delta save semantics: both still require a real logged-in
Medium draft. Do not claim complete Medium integration based only on mock
tests. A failed explicit create is not automatically retried because that
could allocate duplicate remote stories; users must inspect the recorded
draft link before a new attempt. The draft-create flow does not publish.


## 2026-10-20: compiler contract for browser-driven images

Native Medium paragraph compilation (including PRE code blocks, headings,
lists and inline markups) **must remain unchanged**. Image insertion is a
distinct browser-editor responsibility. The compiler now also emits a
browserPlan with the same native text paragraph sequence, but image paragraphs
replaced by unique plain-text marker paragraphs. An ordered image list carries
the matching source URL and alt text. The cover is included as the first image.

This is an output contract only. The existing explicit Medium Create transport
still writes its legacy image Delta representation. Do NOT claim browser image
insertion works, or advertise this as a complete integration, until the Bridge
consumes browserPlan and the logged-in Medium editor has actually inserted and
verified each image (and removed its corresponding marker). Do not replace the
native PRE formatting with a full HTML clipboard re-paste.
\n\n## BlogCTL browser-first smoke test (2026-10-20)\n\nUsing installed BlogCTL Extension command blogctl.job.start, the new draft ID\n89da2be2e4d5 was allocated. A text-only Delta save was acknowledged, then\nBridge dispatched the first PNG to the real Edge editor. Medium presented a\nCloudflare human-verification challenge at the exact editing URL, without\nmounting any contenteditable blocks. Insertion returned an error and the\nBlogCTL job was correctly marked failed with the allocated draft ID retained.\n\nThe browser insertion handler now waits for actual editor readiness and\nrecognizes the challenge. Automated challenge bypass is explicitly out of\nscope; a user must satisfy it before safe image insertion resumes. A failed\ncreate must never be retried as a fresh story by default.\n\n## Resume of partial create\n\nOnly a failed single-platform Medium create job that previously emitted a\nvalid draft-allocated event can be retried. The retried task retains the same\nBlogCTL job ID and stores its resume draft ID internally; externally provided\nresume IDs are rejected. Resume never calls new-story or replays text Deltas.\nIt requires all expected image markers to still exist; partially completed\ninsertion sequences must be assessed individually rather than replayed blindly.\n