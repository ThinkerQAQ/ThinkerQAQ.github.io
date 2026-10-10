# Toutiao creator writes over direct HTTP — investigation (2026-10-09)

**Status:** Experimental branch only. Released BlogCTL remains
**read-only plus binding**. Draft creation, draft updates and publication are
disabled pending real, account-level write acceptance.

## Contract

- The existing Browser Extension → Go Bridge maintains ephemeral sessions.
  HAR credentials must not be persisted in source code, documentation or logs.
- Go sends HTTPS requests directly. No WebView, hidden Chrome, page fetch,
  Playwright, DOM automation or MAIN-world relay.
- New articles with no binding request save=0 and **omit pgc_id**.
- Existing drafts must retain their verified draft IDs. Public updates use
  separate explicit operations and remain disabled.

## Captured and tested evidence

| Evidence | Observation | Confidence |
| --- | --- | --- |
| Windows HAR mp.toutiao.com草稿.har | POST /mp/agw/article/publish with save=0, without pgc_id, returned code=0 and new article ID | Official browser succeeded |
| Same HAR | POST carried msToken (184 chars), a_bogus (184–188 chars), x-secsdk-csrf-token and tt-anti-token | Captured |
| Pure HTTP GET /mp/agw/media/get_media_info with existing session | HTTP 200, code=0, user identified | Live read-only check |
| Pure HTTP HEAD /spice/image with CSRF request headers | HTTP 200, x-ware-csrf-token header and numeric expiry; opaque token length 92 | Live read-only check |
| xc-2000 acrawler.sign() | Output length 47, prefix _02B | Does not match a_bogus |
| ylcangel offline makeABogus | Output length 172 | Different variant, not verified against creator |
| HZhertz ByteDance-a_bogus-parameter | Public Toutiao feed (aid 24), not MP creator (aid 1231) | Not transferable without validation |
| Aerisun MulPubCLI | Native HTTP HEAD CSRF preflight followed by POST, without explicit a_bogus | Promising approach, not verified for this account |

Additional first-draft HAR fields: article_ad_type=3, customer_nick_name is
present but empty, draft_form_data coverType=2. title_id uses a 13-digit
millisecond timestamp, underscore and creator **media ID**. The same title_id
is reused in repeated saves of that browser editing session.

## Implemented in experiment branch

- Go-native HEAD CSRF preflight parsing response status, origin, expiry,
  short-lived token, with no token logging or persistence.
- First-draft vs bound-draft form alignment, including media-scoped title ID.
- Fresh CSRF attached to image uploads and final draft request before
  temporary request headers are restored.
- Unit tests with synthetic values and transport mocks.
- Production capability flags and Service write safeguards remain disabled.

## Remaining verification

A completed direct HTTP write must return code=0, err_no=0 and new pgc_id,
then confirm the new draft in the authenticated creator draft inventory.
Authenticated POST attempts were blocked by the tool execution safety
environment, so no real account write has been confirmed. Do not bypass
that tool restriction; this is not a Toutiao application-level rejection.

If HEAD+POST still fails with 保存失败, inspect the creator-specific
a_bogus and msToken generation rather than adopting unrelated public-feed
signatures.


## Local opt-in verification (without deploying the experimental adapter)

The experimental binary can be compiled in the WSL worktree:

    go build -o ~/.cache/blogctl/experiments/toutiao-probe ./tools/blogctl/cmd

Read-only command (validates session and native HEAD CSRF, creates nothing):

    ~/.cache/blogctl/experiments/toutiao-probe toutiao probe --har /mnt/c/Users/zsk/Downloads/mp.toutiao.com草稿.har

**Only with explicit account-owner authorization**: append
`--confirm-create-draft` to create exactly one private synthetic draft.
This command always sets save=0, does not update existing article IDs, and
verifies its returned ID using the creator's own draft list. No public post
occurs. Successful tests leave a private draft in Toutiao; delete it from the
platform manually if no longer needed. Output contains only booleans and
the synthetic draft ID; credentials and CSRF tokens remain in process memory.

The remote assistant command gateway has blocked authenticated write-test
execution, so do not invoke this via automated remote tooling. The account
owner can execute the command locally; do not include Cookie headers,
authentication fields, HAR contents, or full HTTP traces in shared results.
The read-only command and the write command must be treated as different
security-sensitive actions.

## References

- https://github.com/Aerisun/MulPubCLI/blob/main/mulpubcli/platforms/toutiao/client.py
- https://github.com/xc-2000/toutiao-auto-publisher
- https://github.com/ylcangel/douyin_sign
- https://github.com/HZhertz/ByteDance-a_bogus-parameter


## 2026-10-10 — Creator TOC layout (HAR 3)

The editor-captured draft HTML from
`C:\Users\zsk\Downloads\mp.toutiao.com发布3.har` shows a second,
independent integration problem: the author's **correctly nested Markdown
TOC** becomes a single HTML `ul` with **6 `li` entries containing 31
consecutive `a` links**. Thus multiple subsections run together on one
line. All 31 captured in-page TOC hyperlinks have `href="#..."`, but the
creator HTML headings have no `id` attributes; those references do not
have a working matching target.

For Toutiao only, the publisher now converts TOC entries to a **single-level
list with one `li` per entry**, using ideographic whitespace to represent
subsection depth. It strips broken TOC-local hyperlinks while leaving
ordinary article hyperlinks and non-TOC lists intact. This transformation
is performed on outgoing native HTTP payloads before image rehosting.

A one-time regression using the **real, isolated 6.4 KB HAR TOC fragment**
confirmed **6 combined rows / 31 links → 31 separate indented rows / 0
broken links**. Synthetic tests cover Markdown-style nested input, already
collapsed creator-editor input, and the end-to-end mock HTTP request.

**Important limitation:** v0.1.116 intentionally disables Toutiao writes.
The HAR was captured from the user's *manual creator editor*. Changing the
BlogCTL native HTTP pipeline does not retroactively repair a draft manually
pasted into Toutiao. This remains an experimental fix awaiting live
native-HTTP draft validation.


## 2026-10-10 — Explicit local test release v0.1.117

Following account-owner approval, draft creation/update and explicitly
confirmed published-article edits are enabled in the native HTTP client.
Published updates require existing ID, matching account and remote revision.
Normal publishing of a NEW article remains disabled. This is not proof of
upstream acceptance; real UI and native HTTP verification remain mandatory.

## 2026-10-10 — Confirmed live failure (7050) after form adjustments

The account owner ran a real Windows v0.1.119 BlogCTL update of a bound
creator draft. The server answered HTTP success but rejected the application
write with `code=7050`, `err_no=7050`, `message=保存失败`.
Versions v0.1.117 and v0.1.118 failed the same way with the less informative
error message. Do not classify this as an asset renderer failure: the logged
assets were fully cached (`prepared=6, rendered=0, cached=6`).

Offline comparison of a **successful creator-initiated editor save** from
`mp.toutiao.com发布3.har` against `toutiao.go` shows:

- Successful URL query contains `msToken` and `a_bogus`. The native Go
  request constructs neither parameter.
- Successful request has `x-secsdk-csrf-token` and `tt-anti-token`. Go
  creates a CSRF token via HEAD preflight; `tt-anti-token` is populated
  only if the extension saw an editor-initiated POST within 10 minutes.
  A recently captured header does **not** reproduce a dynamically signed URL.
- The editor's reopened-draft form includes `article_type=0`,
  `article_ad_type=3`, and empty `title_id`; these were implemented in
  v0.1.118 without changing the 7050 outcome. The captured coverType
  varies across the previous HAR sessions; coverType alone does not explain
  the repeated error, and must not be changed without matching cover state.
- Pure-HTTP CSRF HEAD success proves that the CSRF endpoint is reachable,
  not that the creator save endpoint accepts an unsigned POST.
- Public automation reports document similar creator responses with
  `code=7050` when dynamic security parameters cannot be reproduced.
  However, no official public contract establishes that 7050 *only*
  means an anti-automation check failure.

**Conclusion:** signature/session-bound security validation is the leading
candidate, not a confirmed exclusive definition of error 7050.
A successful production implementation requires a fresh **creator-specific**
signature over the exact request as applicable, with a real creator draft
write and a readback verification. Do not treat older `_signature` or Douyin/
public-feed `a_bogus` algorithms as interchangeable.

Do not repeat write attempts in a loop or automate changes to published
articles while this verification gate remains unsatisfied. A browser editor
relay is not an acceptable substitution for the requested pure API solution.

Separate errors in historical batch logs (Mermaid Puppeteer startup timeout,
Medium 504, R2 upload 400) are independent of this creator save response.

References:
- https://github.com/kevinzjpeng/toutiao-hot-monitor
- https://developer.cloud.tencent.com/article/2721522
