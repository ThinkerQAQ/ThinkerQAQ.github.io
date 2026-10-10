# BlogCTL v0.1.135 (local candidate)

- Extend direct target safety: authenticated CNBlogs/CSDN draft edits
  fetch and verify the remote post is still a draft before writing.
- Avoid blind retries of multiple targets or update-and-publish tasks;
  retry single-target draft updates or select failed remote targets again.
- The browser Side Panel and Go Web Console continue to share the same
  navigable UI, Settings category tree and explicit Create/Update contract.
- All prior Bridge/Extension integrations and Data are preserved.
- Medium/Toutiao remain unavailable in the UI.

Local candidate in PR #177. No third-party production article is altered
during browser smoke tests.

---

# BlogCTL v0.1.134 (local candidate)

- Complete Extension and Go Web Console shared navigation and Settings
  parity; both use the same Feature markup, styling and request contract.
- Permit successive explicit Create and Update tasks without stale terminal
  buttons, while retaining each task in the durable history.
- Hide the workspace-opening button when already inside Web Console and
  serve a real favicon to prevent an unrelated 401 from favicon discovery.
- Keep previous v0.1.133 direct-target publishing safeguards and Go security
  checks. Medium/Toutiao remain hidden and legacy Data preserved.

Local candidate under PR #177. Real authenticated third-party writes remain
subject to manual confirmation and account-level acceptance.

---

# BlogCTL v0.1.133 (candidate)

- Fix shared Go Web Console initialization when browser-only chrome.runtime
  push events are unavailable; Index UI retains its existing status polling.
- Both Extension and Go Web Console reuse the same Feature and Settings tree.
- Explicit Create/Update use selected remote targets; no persistent binding
  is required and no update silently creates a new draft.
- Medium/Toutiao remain hidden and prior Data intact.

Local candidate under PR #177, pending account-level acceptance.

---

# BlogCTL v0.1.132 (local candidate)

- Same HTML/JS/CSS Feature UI in Edge Extension and the Go Bridge
  Web Console at http://127.0.0.1:32145/console/. The Web Console
  authenticates business operations through a trusted local Extension
  content-script relay and never receives the native Bridge token.
- Aligned navigation: Detection / Creation / Update / Tasks / Logs /
  Index / Settings; removed standalone Publish feature, with Create &
  Publish and Update & Publish actions in the appropriate workflow.
- Explicit-target task contract: no persistent publication association
  lookup, no implicit update -> create, multi-target operations with
  isolated platform failures and durable target snapshots.
- Safe published edits currently limited to CNBlogs (remote revision
  verification) and DEV.to; unsupported targets fail closed.
- IDFlow-style categorized searchable settings and unified responsive
  design tokens, shared between Extension and Web.
- DevTool documentation structure: Quick Start, Guide, Architecture,
  Reference, with exact security and workflow contracts.
- Medium/Toutiao remain hidden in the UI but native implementations
  and legacy Data remain intact.

This branch candidate is not a public stable release. Validate real
logged-in accounts before using any new write flow on valuable posts.

---

# BlogCTL v0.1.131 (local experimental build)

- Merge the duplicated Update platform lists into one platform card per
  platform, with shared selection for association detection and updating.
- Toolbar: select all, invert, detect selected platforms. Candidate articles
  appear inline inside their platform cards, with direct verified bind/unbind
  actions and separate checkboxes for batch bind/unbind.
- Preserve single-platform update and bottom batch update. Distinguish a
  platform selected for detection from its ability to save drafts; a read-only
  platform remains detectable but is excluded from write operations.
- Keep platform-level failure independence. Block overlapping binding
  mutations and draft-update jobs on the same selected article.
- Preserve existing account-wide Detection inventory tab and Publish page,
  underlying adapters and all Data. Medium and Toutiao remain UI-hidden.
- DevTool code intelligence, Go and existing Extension regressions pass;
  no new test files were introduced.

Local branch build from PR #177, not a stable public release.

---

# BlogCTL v0.1.130 (local experimental build)

- Remove redundant per-platform draft/published counts and per-platform
  Refresh buttons from Detection remote inventory cards.
- Keep the platform heading and article rows; the common top-level summary,
  Platform/Status selectors and Refresh action remain unchanged.
- Preserve remote inventory requests and all Data.

Local build from PR #177; not a public release.

---

# BlogCTL v0.1.129 (local experimental build)

- Align the Detection page with the Publish page's two-selector layout:
  platform (all or one) and publication state (all, draft, published).
- Remove the remote-content title/ID search box and nested content
  accordions. Directly list all posts returned by each selected account
  inventory with state, ID and safe edit/view link.
- Fix every platform incorrectly reporting `BlogCTL Extension request failed`
  because the new Bridge inventory response was missing the required
  `ok:true` extension message envelope. Authentication and list errors now
  remain visible per platform rather than being replaced with this generic
  false-negative.
- Preserve independent platform refreshes, existing catalog limits,
  Medium/Toutiao UI hiding, binding flow in Update, and saved Data.
- DevTool CodeGraph/Serena review and existing Go/Extension tests pass.

Local build from PR #177, not a public stable release.

---

# BlogCTL v0.1.128 (local experimental build)

- Rework the Detection tab into an **account-scoped remote inventory**,
  separating expandable remote drafts and published articles per platform.
  No local article must be selected to inspect a platform's inventory.
- Keep the existing article-association candidate matching, manual binding,
  and state-specific unbinding in the **Update** workflow. Unbound platform
  cards now expose a direct “检测关联” action, opening the association section.
- Remove redundant published-record platform/status selectors; Publish remains
  scoped to the selected local article and selectable platform cards.
- Add a bounded read-only Bridge inventory endpoint using established
  platform list APIs. Juejin currently enumerates published articles; drafts
  require known IDs and display this limitation instead of false results.
- For SegmentFault and 51CTO, fall back to the platform's own backend tag
  or secondary category ID when no input tag matches. Never invent platform
  tag/category IDs; unavailable fallback still reports a validation error.
- Preserve all existing bindings and data. Medium and Toutiao remain hidden
  at the UI layer, with their underlying adapters retained.
- DevTool CodeGraph/Serena and existing Go + 29 Extension tests pass.
  No new tests by user preference.

Local experimental branch build from PR #177; not a stable public release.

---

# BlogCTL v0.1.127 (local experimental build)

- In the Update panel, display the existing binding state and remote ID for
  each platform's draft and already-published article, with safe editor/public
  links consistent with the Detection panel.
- Restore **individual unbind** controls for each bound draft or published
  record. Unbinding deletes only the selected local association after an
  explicit confirmation; no remote article/draft is deleted.
- Refresh publication records and invalidate the Detection panel's cached
  binding status after a successful unbind.
- Preserve selected update platforms while mutation controls are temporarily
  disabled, and guard against concurrent writes or changed binding IDs.
- No new tests, per user request. Existing regression and DevTool code
  intelligence checks pass.

Local branch build from PR #177; not a published stable release.

---

# BlogCTL v0.1.126 (local experimental build)

- Unify **检测 → 远端关联 → 手动绑定** for CNBlogs and CSDN with
  other platforms: both accept article/draft ID or URL, offer a clear
  draft/published selector, and verify before writing a state-specific binding.
- CNBlogs Bridge rejects a requested state that differs from the verified
  remote post. CSDN already performed that check.
- Check the existing binding in the selected state only and require explicit
  replacement confirmation when the remote ID is different.
- Normalize recognized CNBlogs/CSDN editor/public links for the same-ID
  comparison to avoid spurious replacement dialogs.
- Keep automatic candidate detection and all other platform behavior unchanged.
- No tests added by user request; existing regression and DevTool review pass.

Local experimental branch build from PR #177, not a public release.

---

# BlogCTL v0.1.125 (local experimental build)

- Temporarily hide Medium and Toutiao from interactive BlogCTL detection,
  draft updates, published-update actions, publication records, platform
  selectors, and all/bulk operations.
- Maintain native publisher adapters, capability declarations, configuration,
  local article bindings, and stored jobs and logs. Restore later by changing
  only the shared extension visibility policy.
- Ignore stale browser selections for temporarily hidden platforms.
- Keep historical completed tasks visible in the Tasks/Logs tabs.
- Review via DevTool CodeGraph and Serena LSP; add UI and saved-state tests.

Local branch build on PR #177; not a public release.
Native Toutiao HTTP writes remain unverified and have not been changed.

---

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
