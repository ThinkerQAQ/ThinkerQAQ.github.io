# BlogCTL Native Chinese-Platform Publishing

Status: design proposal  
Date: 2026-09-18  
Reviewed BlogCTL base: d4d238c22e8251ab8353d92b070f23f784baabb0  
Reviewed Wechatsync base: a98e42865387285afcc027c61836488748f3b30f

## 1. Conclusion

The current @wechatsync/cli cannot perform a real platform sync without the Wechatsync Chrome extension.

For live work the CLI starts ExtensionBridge, waits for the extension on WebSocket port 9527, and forwards operations such as syncArticle, checkAuth, platform listing, and image upload to the extension. The extension owns browser login state, cookies, platform adapters, authenticated requests, browser header rewriting, and image-upload behavior.

The only meaningful extension-free CLI path is local preparation such as dry-run. Live publishing does not work without the extension.

Current runtime:

~~~text
BlogCTL
  -> Wechatsync CLI
  -> WebSocket :9527
  -> Wechatsync Extension
  -> platform adapter
  -> platform API
~~~

Target runtime:

~~~text
BlogCTL Extension
  -> automatic short-lived browser session handoff
  -> BlogCTL Go Bridge
       -> Juejin adapter
       -> CSDN adapter
       -> SegmentFault adapter
       -> Zhihu adapter
       -> 51CTO adapter
       -> OSChina adapter
       -> Cnblogs adapter
       -> Toutiao adapter
  -> platform API
~~~

The final architecture should have one browser extension, one BlogCTL Bridge, no WECHATSYNC_TOKEN, no SYNC_WS_PORT, no port-9527 bridge, and no Wechatsync CLI subprocess in the normal publishing path.

## 2. What the code review shows

### BlogCTL

The current BlogCTL already contains the correct building blocks:

- tools/blogctl/extension/manifest.json has cookies permission and target-platform host permissions.
- tools/blogctl/extension/background.js already detects platform login state.
- the extension already hands a Medium browser session to the Bridge automatically.
- tools/blogctl/bridge/server.go already has an in-memory platformSession concept.
- tools/blogctl/bridge/medium.go proves that the Go Bridge can call a platform directly using browser-derived cookies.
- tools/blogctl/app/sync.go owns task orchestration.
- scripts/blogctl-distribute.mjs and scripts/distribute.mjs already own platform language, canonical/footer rules, generated output, content hashes, and incremental state.

So this is a transport migration, not a redesign of the blog content pipeline.

### Wechatsync

The reviewed upstream call chain is:

~~~text
CLI
  -> ExtensionBridge
  -> waitForConnection()
  -> Chrome Extension MCP client
  -> performSync()
  -> platform adapter
  -> ExtensionRuntime
~~~

ExtensionRuntime provides:

- authenticated fetch with browser credentials;
- chrome.cookies;
- declarativeNetRequest header mutation;
- extension storage/session;
- tabs and scripting when needed.

The core runtime interface mentions a node runtime type, but the reviewed repository does not contain a concrete Node runtime for the public adapter set, and the CLI does not directly instantiate the adapters. Therefore the current client cannot simply run headlessly.

## 3. Alternatives

### A. Keep two extensions

Lowest implementation effort, but leaves duplicate bridges, token configuration, port contention, mismatched readiness, and poor UX. Keep only as temporary compatibility.

### B. Make BlogCTL Extension speak Wechatsync WebSocket

This removes only the second extension icon. It does not remove the architectural dependency because the Wechatsync extension currently hosts the adapters and runtime. BlogCTL would still have to absorb those responsibilities while keeping port 9527, a Node process, token configuration, and PRIMARY/SECONDARY coordination.

Not a good final design.

### C. Build a Node runtime for Wechatsync core

Technically possible, but BlogCTL would then maintain a compatibility layer for cookies, header rules, DOM support, browser APIs, and adapter runtime behavior. That is nearly as much work as native adapters while retaining the external publishing subsystem.

Not recommended.

### D. Native Go adapters in BlogCTL

Recommended.

The BlogCTL extension should be a session broker. The Go Bridge should be the publisher.

This is already the Medium pattern and fits the current product model.

## 4. Licensing boundary

The reviewed Wechatsync repository root contains GPL-3.0 text. Some package manifests contain MIT metadata, but the public adapter source is under packages/core and the reviewed tree does not establish a separate license for those files.

Do not mechanically translate TypeScript files line-by-line into Go.

Use a clean implementation process:

1. document observable HTTP behavior;
2. record endpoint, method, headers, request shape, response shape, and errors;
3. independently implement the contract in Go;
4. write fixture and contract tests;
5. do not preserve source comments, helper layout, or expression structure mechanically.

This is a conservative engineering rule, not legal advice.

## 5. Responsibility split

### Extension

Own only browser-specific concerns:

- platform login detection;
- automatic session snapshot;
- cookie metadata capture;
- user-agent capture;
- one bounded automatic refresh after auth expiry.

Do not put publishing logic in the extension.

### Go Bridge

Own:

- in-memory session cache;
- standard cookie jar;
- authenticated HTTP transport;
- platform adapters;
- signatures/CSRF;
- image upload;
- create/update draft;
- final publish;
- typed errors;
- task state.

### Node/content layer

Keep:

- article loading;
- language selection;
- canonical/footer/tracking rules;
- platform-ready content generation;
- content hashing;
- .distribution files.

Boundary:

~~~text
Node = deterministic content transformation
Go   = authenticated platform transport
~~~

## 6. Generic session handoff

The current Medium session model is too narrow because it reduces cookies to name/value. Generic platform publishing needs cookie domain and path semantics.

Use a richer model:

~~~go
type BrowserCookie struct {
    Name           string
    Value          string
    Domain         string
    Path           string
    Secure         bool
    HTTPOnly       bool
    SameSite       string
    ExpirationDate *float64
}
~~~

Implementation should use normal JSON tags and seed a net/http CookieJar.

Rules:

- session data stays in memory;
- never persist cookies to blogctl.json;
- never persist cookies to .distribution;
- never log cookie values;
- never expose cookie details in popup status.

Normal UX shows only platform login state.

Automatic flow:

~~~text
Create/update draft
  -> verify browser login
  -> snapshot selected platform cookies
  -> POST session to Bridge
  -> start task
~~~

On auth expiry:

~~~text
adapter returns auth-expired
  -> task enters waiting-for-session
  -> extension refreshes session automatically
  -> retry once
  -> terminal success/failure
~~~

No infinite retry.

## 7. Shared Go transport

Create one authenticated transport with:

- CookieJar;
- browser User-Agent;
- explicit Origin and Referer;
- JSON/form/multipart helpers;
- binary upload;
- bounded response reads;
- request timeouts;
- existing BlogCTL proxy support;
- safe retry policy;
- secret redaction.

CORS is not enforced on the native Go process, so browser declarativeNetRequest is not needed for normal native publishing. Headers that Wechatsync forces in-browser can be set directly by Go.

## 8. Adapter contract

Use a narrow BlogCTL interface:

~~~go
type Adapter interface {
    ID() string
    CheckAuth(ctx context.Context, session Session) (AuthResult, error)
    CreateDraft(ctx context.Context, session Session, article DraftInput) (DraftResult, error)
    UpdateDraft(ctx context.Context, session Session, ref DraftRef, article DraftInput) (DraftResult, error)
    PublishDraft(ctx context.Context, session Session, ref DraftRef) (PublishResult, error)
}
~~~

Optional capabilities should be separate interfaces, for example ImageUploader and DraftDeleter.

Suggested structure:

~~~text
tools/blogctl/publisher/
  adapter.go
  registry.go
  session.go
  transport.go
  errors.go
  images.go
  state.go
  juejin.go
  csdn.go
  segmentfault.go
  zhihu.go
  cto51.go
  oschina.go
  cnblogs.go
  toutiao.go
~~~

Platform API details should not spread through bridge/server.go or app/sync.go.

## 9. Keep the existing renderer

Do not rewrite scripts/distribute.mjs in Go.

Current:

~~~text
exportArticles
  -> .distribution/<platform>/<slug>.md
  -> syncExports
  -> spawn wechatsync
~~~

Target:

~~~text
exportArticles
  -> .distribution/<platform>/<slug>.md
  -> versioned handoff manifest
  -> Go native publisher
~~~

Only the final delivery stage changes.

## 10. Manifest v2

The existing manifest already stores contentHash, lastSyncedHash, and draftUrl. The two-step product workflow needs explicit draft versus published state.

Suggested per-platform state:

~~~json
{
  "contentHash": "...",
  "language": "zh-CN",
  "output": ".distribution/juejin/foo.md",
  "remoteDraftId": "123",
  "draftUrl": "https://...",
  "draftHash": "...",
  "draftSyncedAt": "...",
  "publishedUrl": "https://...",
  "publishedHash": "...",
  "publishedAt": "..."
}
~~~

The existing lastSyncedHash becomes ambiguous once draft creation and final publishing are separate operations.

## 11. Incremental synchronization semantics

For create/update draft:

~~~text
needsDraftSync = contentHash != draftHash
~~~

For final publish:

~~~text
publishAllowed =
    remoteDraftId exists
    AND draftHash == current contentHash
~~~

If the article changes after the user previews the remote draft, final publish must be blocked. The user must update the draft and preview again.

If a stored remote draft was deleted externally:

- update returns not-found;
- clear stale remoteDraftId;
- create one replacement draft;
- store the new reference;
- do not loop.

This makes incremental sync deterministic.

## 12. Product workflow

Normal publishing UI should expose only two actions.

### Create/update draft

- use language from publishing configuration;
- automatically hand browser session to Bridge;
- create draft if no remote draft exists;
- update known draft when supported;
- return clickable draft URL;
- save remoteDraftId, draftUrl, and draftHash.

### Confirm publish

Enable only when:

- draft operation succeeded;
- remote draft reference exists;
- current contentHash equals draftHash;
- login is valid.

Publish that exact remote draft.

Normal UI should not expose:

- Wechatsync;
- Wechatsync token;
- port 9527;
- dry-run;
- "prefer draft";
- manual session synchronization.

Draft-first is the workflow, not a preference.

## 13. Platform migration assessment

### Juejin

Observed public behavior:

- user API auth;
- CSRF acquired from a HEAD response header;
- article-draft create API;
- Markdown body;
- deterministic draft URL;
- image upload through temporary ImageX credentials, signed ImageX calls, TOS upload, commit, then final URL lookup.

Native units:

~~~text
auth
csrf
create draft
update draft      - independently verify current endpoint
publish draft     - independently verify current endpoint
image upload
AWS-v4 signing
CRC32
~~~

Juejin should be first because it is the currently failing real path and does not fundamentally require browser DOM automation.

### CSDN

Observed behavior:

- signed business API;
- editor base-info auth;
- HMAC-SHA256 request signing;
- Markdown + HTML draft payload;
- signed image-upload metadata and object storage.

Implement signer, auth, draft lifecycle, image flow, then independently verify final publish.

### SegmentFault

Observed behavior:

- login via HTML;
- editor token parsed from page;
- gateway draft API;
- multipart image upload.

Relatively small.

### CNBlogs

Observed behavior:

- current-user auth page;
- editor request establishes XSRF state;
- XSRF-TOKEN cookie copied to header;
- JSON draft API;
- multipart image upload.

This platform requires the generic cookie jar.

### OSChina

Observed behavior:

- JSON auth;
- JSON draft save;
- user id from auth;
- multipart image upload.

Relatively small.

### 51CTO

Observed behavior:

- editor-page auth;
- CSRF extraction;
- image upload sign/config;
- object-storage upload;
- form-encoded draft creation.

Moderate complexity.

### Zhihu

Observed behavior:

- /api/v4/me auth;
- create then PATCH draft;
- HTML body;
- platform-specific table/image/code requirements;
- temporary image credentials and OSS signing.

Keep content normalization in the renderer where possible. Go should own transport, not become a second HTML renderer.

### Toutiao

The reviewed public adapter directory does not contain a public Toutiao adapter. The repository contains a private git submodule for private adapters, and public exports do not expose a Toutiao adapter.

There is therefore no public implementation to translate.

Toutiao must be independently researched against the current creator/editor network contract. Until then, mark native Toutiao unavailable or leave it on the temporary legacy route.

## 14. Image pipeline

Shared shape:

~~~text
platform-ready content
  -> extract unique image refs
  -> keep images already hosted on accepted platform CDN
  -> upload remaining images through platform adapter
  -> rewrite references
  -> create/update draft
~~~

Tests must cover remote images, local/data images, duplicates, upload failure, unsupported MIME, and timeout.

## 15. Bridge API

Generalize the existing Medium-only primitives.

Suggested private API:

~~~text
POST /v1/sessions/:platform
GET  /v1/sessions/:platform/status

POST /v1/platforms/:platform/drafts
PUT  /v1/platforms/:platform/drafts/:draftId
POST /v1/platforms/:platform/drafts/:draftId/publish
~~~

The task API remains the normal application entry point.

Keep extension-origin validation on session writes.

## 16. Task state machine

Internal stages:

~~~text
queued
rendering
waiting-for-session
checking-auth
uploading-images
creating-draft
updating-draft
draft-ready
publishing
published
failed
~~~

The popup can collapse these into simple labels.

Every network operation must have a context timeout. Every task must eventually reach a terminal state or a bounded recovery state. No permanent "running".

## 17. Typed errors

Do not parse CLI text after migration.

Use typed categories:

~~~text
auth-expired
csrf
rate-limited
remote-draft-not-found
permission
validation
upload
upstream
timeout
~~~

Attach only safe metadata such as platform, endpoint, HTTP status, a bounded response excerpt, and retryable flag.

Never include Cookie, Authorization, CSRF, temporary upload credentials, or browser-session values.

## 18. Compatibility strategy

During migration use an internal delivery mode:

~~~text
native
legacy-wechatsync
unsupported
~~~

Do not expose this in normal UI.

Sequence:

~~~text
Juejin native
others legacy
  -> CSDN native
  -> SegmentFault native
  -> ...
  -> all required native
  -> delete legacy path
~~~

After parity remove:

- WechatsyncToken;
- WechatsyncPort;
- Wechatsync tool registry item;
- preflight;
- wechatsyncMu;
- environment injection;
- failure-text parsing;
- readiness UI;
- port-9527 documentation;
- @wechatsync/cli dependency.

## 19. Implementation phases

### Phase 0: contracts and regression tests

- freeze platform IDs;
- freeze language behavior;
- define manifest v2;
- add manifest migration tests;
- add cookie serialization tests;
- add redaction tests.

### Phase 1: generic session broker

- preserve cookie domain/path metadata;
- automatic per-platform cookie snapshot;
- seed Go cookie jars;
- auth-refresh handshake;
- no delivery switch yet.

Success criterion: Go can perform an authenticated read-only Juejin request using only BlogCTL Extension + BlogCTL Bridge.

### Phase 2: native Juejin draft

Implement auth, CSRF, create/update draft, image flow, draft URL, and manifest draft state.

Route only Juejin to native.

Success criterion: with Wechatsync extension disabled or uninstalled, BlogCTL creates or updates a Juejin draft and returns the draft URL.

### Phase 3: Juejin confirm publish

Independently research and implement current Juejin publish transition.

Add contentHash/draftHash guard, publishedHash, published URL, and idempotent retry rules.

Success criterion: full create-preview-confirm-publish works with no Wechatsync process.

### Phase 4: simpler Chinese adapters

Recommended order:

1. SegmentFault
2. OSChina
3. CNBlogs
4. CSDN
5. 51CTO

For each platform: logic tests first, then one real smoke test.

### Phase 5: Zhihu

Do after shared session, image, and transport layers are stable.

### Phase 6: Toutiao

Research separately because its adapter is not public in the reviewed upstream source.

### Phase 7: remove Wechatsync

Only after required native parity.

## 20. Tests before manual validation

For every adapter prove:

- auth success/failure;
- exact method/path;
- Origin/Referer;
- cookie behavior;
- CSRF/signature generation;
- request shape;
- response parsing;
- draft id and URL;
- typed errors;
- redaction.

Use httptest.Server and injectable endpoint bases where practical.

Session tests:

- duplicate cookie names on different domains;
- expiry;
- replacement;
- no disk persistence;
- exactly one auth refresh;
- failed refresh terminates.

Task tests:

- timeout becomes failed;
- retry does not create duplicate logical tasks;
- no infinite running;
- polling does not collapse task UI state.

Incremental tests:

- contentHash equals draftHash skips update;
- changed hash updates;
- missing remote draft creates replacement;
- source change after preview blocks publish;
- successful publish records publishedHash.

## 21. First implementation PR

Do not migrate all platforms at once.

The first implementation PR should contain only:

1. generic browser-session model;
2. automatic Juejin session handoff;
3. native Go Juejin authenticated probe;
4. native Juejin draft create/update;
5. Juejin image upload;
6. manifest v2 draft state;
7. internal routing that sends Juejin to native and leaves other Chinese platforms on legacy;
8. automated tests.

Only after CI proves the logic should there be one end-to-end Juejin smoke test with the Wechatsync extension disabled. That test is the proof that the one-extension architecture is viable.
