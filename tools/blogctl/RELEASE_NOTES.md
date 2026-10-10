# BlogCTL v0.1.124 (local experimental build)

- Normalize article-association actions for every supported platform:
  drafts show **编辑草稿** and open the creator editor;
  published posts show **查看文章** and keep public links.
- Fix DEV.to draft preview URLs by using its dashboard editor and extend
  canonical editor links to CNBlogs, Juejin, CSDN, SegmentFault, Zhihu,
  51CTO, OSChina, Toutiao and Medium.
- Suppress unverified edit links when a safe editor URL cannot be derived,
  such as OSChina drafts without a numeric creator ID.
- Add data-driven regression checks for all 10 draft/public link pairs
  and unsafe/malformed input.
- DevTool CodeGraph and Serena code verification: pass.

Local build on PR #177. Toutiao native HTTP writing is still experimental.

---

# BlogCTL v0.1.123 (local experimental build)

- Fix the **检测 → 远端关联** CNBlogs draft row: “编辑草稿” now opens
  the authenticated creator editor at
  `https://i.cnblogs.com/posts/edit;postId=<post-id>` instead of the
  unavailable public permalink.
- Preserve the existing “查看文章” link for published CNBlogs posts and
  unchanged links for other platforms.
- Add a regression test specifically for the remote-association detection
  card, not the separate publications screen.

Local branch build on PR #177; not a public release.

---

# BlogCTL v0.1.122 (local experimental build)

- Normalize OSChina draft links to `https://my.oschina.net/u/<numeric-user-id>/blog/ai-write/draft/<draft-id>`.
- Obtain numeric account IDs from OSChina creator authentication / verified
  local metadata; never substitute the public username for the user ID.
- Correct old saved draft links on read without migrating Data and keep
  already-published public article links unchanged.
- Add regression tests for the requested draft ID 3328466.

Local branch build on PR #177; not a public release.

---

# BlogCTL v0.1.121 (local experimental build)

- Fix CNBlogs draft links to open the **creator editor** at
  `https://i.cnblogs.com/posts/edit;postId=<id>`, not an article preview.
- Apply to new/updated drafts, binding candidates, and locally recorded draft
  links at read time (without rewriting existing Data).
- Keep published CNBlogs article URLs unchanged.
- No other platform behavior changes.

Local branch build for PR #177; not a public release.

---

# BlogCTL v0.1.120 (local experimental build)

- Keep platform publishing concurrent and independently fail-safe.
- Deduplicate identical shared publishing-asset renders across simultaneous
  platform plans. Publish each generated PNG only after successful rendering.
- Prepare different diagrams concurrently, while limiting renderer /
  Chromium startup to two processes across the Bridge.
- Add non-sensitive per-platform Markdown compilation and asset preparation
  timings to Bridge structured logs.
- Add concurrent ten-platform shared-cache and independent platform failure
  regression tests (including race checks).

Toutiao native HTTP writes may still fail with code=7050. This experimental
build does not claim to solve its dynamic signing requirements and does not
enable normal first-time public publishing.

---

# BlogCTL v0.1.119 (local diagnostic build)

- Preserve non-secret Toutiao upstream business response codes when a draft
  update fails, so a generic save failure can be investigated more precisely.
- Keep session cookies, CSRF tokens and article content out of error messages.
- No new signing algorithm; real creator draft writes remain unverified.
- Initial and reopened editor draft forms are unchanged from v0.1.118.

Experimental diagnostic build on PR #177; not a public release.

---

# BlogCTL v0.1.118 (local experimental build)

- Match the actual Toutiao reopened-draft form in the latest editor HAR:
  article_type=0, blank title_id, and article_ad_type=3.
- Preserve new-draft vs existing-draft request distinctions and published
  update account/revision/ID guards.
- Continue testing native creator HTTP only; no browser editor relay.
- Real v0.1.117 draft update returned "保存失败"; the dynamic msToken
  and a_bogus parameters may still require implementation.

Experimental branch build, not a verified production Toutiao publisher.

---

# BlogCTL v0.1.117 (local experimental build)

- Restore Toutiao draft creation and update through native Go HTTP.
- Restore explicit verified published-article update with original article ID,
  bound creator account, remote revision check, and UI confirmation.
- NEW public publishing remains disabled.
- Repair the Toutiao flattened table-of-contents layout.
- Regression tests for draft and published update paths.

WARNING: Local experimental build from PR #177. Real direct Go HTTP
write acceptance is not yet verified; mock test success is not live success.

---

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
