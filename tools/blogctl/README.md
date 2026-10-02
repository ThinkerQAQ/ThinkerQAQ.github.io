# BlogCTL

BlogCTL is the local control plane for the ThinkerQAQ blog. It provides one command surface for site builds, article syndication, publishing assets, search-engine discovery, AI Search maintenance, and the browser Extension/Bridge workflow.

## Architecture

```text
blog-content
    │ canonical Articles / Notes / Series / Projects
    ▼
BlogCTL Go Core
    ├── compiler
    ├── assets
    ├── publishers
    ├── search
    ├── AI Search
    ├── durable jobs
    └── local configuration
         │
         ├── Browser Extension / Native Messaging
         │      └── browser-owned cookies, tabs and Search Console UI
         │
         └── External ecosystem tools
                ├── Astro / Pagefind
                ├── Mermaid CLI
                └── PlantUML / Java
```

Backend and control-plane logic belongs to Go. JavaScript remains only where the browser runtime or the underlying toolchain requires it.

The repositories are intentionally separate:

```text
ThinkerQAQ.github.io   public site engine + BlogCTL implementation
blog-content           canonical content repository
```

A sibling checkout is the simplest layout:

```text
blog/
├── ThinkerQAQ.github.io/
└── blog-content/
```

BlogCTL discovers this layout automatically. The Extension can also persist explicit Engine Root and Content Root values in `blogctl.toml`.

## Install

GitHub releases contain BlogCTL binaries, the browser extension, Native Messaging install scripts, and checksums.

Windows:

```powershell
.\Install-Windows.ps1 -Executable C:\software\Coding\blogctl\blogctl-windows-amd64.exe
```

Linux:

```bash
./Install-Linux.sh /path/to/blogctl
```

macOS:

```bash
./Install-macOS.command /path/to/blogctl
```

Load the packaged `extension` directory in Chrome or Edge after installing the Native Messaging host.

For development:

```bash
cd ThinkerQAQ.github.io
go build -o blogctl ./tools/blogctl/cmd
./blogctl help
```

## Runtime requirements

The released BlogCTL binary does not require Go.

Some operations still use ecosystem tools:

- Node.js 22+ and npm: Astro, Pagefind, Markdown HTML rendering, Mermaid CLI and browser-side tests.
- Java: PlantUML rendering when a publishing/site diagram is not already cached.
- Git: repository discovery and AI Search incremental-content calculations.

Run:

```bash
blogctl doctor
```

to verify the basic local toolchain.

## Configuration

User configuration is stored in `blogctl.toml`.

Default locations follow the operating-system user-config directory. On Windows:

```text
%APPDATA%\BlogCTL\blogctl.toml
```

For example:

```text
C:\Users\zsk\AppData\Roaming\BlogCTL\blogctl.toml
```

The Extension's **Environment & Configuration** page is the normal way to edit workspace paths, proxy settings, publishing policy, Search credentials and R2 configuration.

Example:

```toml
content_root = "C:\\Users\\zsk\\code\\blog\\blog-content"
engine_root = "C:\\Users\\zsk\\code\\blog\\ThinkerQAQ.github.io"
log_level = "info"

proxy_enabled = false
proxy_host = "127.0.0.1"
proxy_port = 7890

devto_api_key = ""

indexnow_endpoint = "https://www.bing.com/indexnow"
indexnow_key = ""
indexnow_key_location = ""


baidu_site = "https://thinkerqaq.github.io"
baidu_token = ""

google_search_console_service_json = ""

[publishing.compiler.mermaid]
format = "png"
width = 1200
scale = 2

[publishing.assets]
store = "r2"

[publishing.assets.r2]
bucket = "thinkerqaq-asset"
public_base_url = "https://pub-366a15b6733345039775c083a1fffb3e.r2.dev/"
access_key_id = ""
secret_access_key = ""
account_id = ""
endpoint = ""

[publishing.platforms.devto]
language = "en"
changed_only = false

[publishing.platforms.medium]
language = "en"
changed_only = false

[publishing.platforms.juejin]
language = "zh-CN"
changed_only = false
```

Platform configuration also supports footer, canonical and tracking policies. Defaults are generated automatically when those fields are absent.

BlogCTL reads user configuration only from `blogctl.toml`.

## Article publishing

Run syndication commands from `blog-content`.

Dry-run compiles locally and does not mutate a remote platform:

```bash
blogctl sync \
  --article concurrency-series-00 \
  --platforms devto,medium \
  --dry-run
```

Live draft creation/update:

```bash
blogctl sync \
  --article concurrency-series-00 \
  --platforms cnblogs,juejin,csdn,segmentfault,zhihu,51cto,oschina,toutiao,devto,medium
```

Only changed content:

```bash
blogctl sync \
  --article concurrency-series-00 \
  --platforms devto,medium \
  --changed
```

Intentional full syndication:

```bash
blogctl sync --all --platforms devto,medium
```

Article and platform scopes are deliberately explicit. `--all` cannot be combined with `--article`.

### Publishing pipeline

```text
canonical Markdown
      ↓
Go Compiler
      ↓
CompiledArticle
      ↓
Go Asset Pipeline
  ├── Mermaid → renderer → PNG
  └── PlantUML → renderer → PNG
      ↓
Go Publisher
  ├── native platform image upload
  └── shared Go R2 fallback
      ↓
remote draft
      ↓
explicit publish confirmation
```

The compiler owns article/frontmatter parsing, language selection, canonical/footer/tracking policy, Markdown normalization, diagram extraction, platform payload generation and content hashes.

Generated publishing artifacts are stored under:

```text
blog-content/.distribution/
```

Durable remote bindings and publication state are stored under:

```text
blog-content/.blogctl/publications.json
```

Keep `.blogctl/publications.json`; `.distribution/` is generated local state.

### Language policy

Each platform has one persistent publishing language:

- Chinese platforms default to `zh-CN`.
- DEV.to and Medium default to `en`.

The selected language controls the complete source article and its canonical/footer URL.

### Browser session and Bridge

Live publishing uses the persistent local Bridge:

```text
CLI / Extension
      ↓
Native Messaging
      ↓
BlogCTL Bridge
      ↓
Go publisher adapters
```

The Extension acquires only platform-approved browser cookies and the browser user agent. The Bridge keeps session material in memory for a short time; it is not written into `blogctl.toml`.

The browser Extension is required for browser-authenticated platforms and Google Search Console Request Indexing.

## Site build

Build the current engine checkout:

```bash
cd ThinkerQAQ.github.io
blogctl build
```

Assemble canonical content without building the site:

```bash
blogctl site assemble --content-root ../blog-content
```

Build with canonical content assembled from `blog-content`:

```bash
blogctl site build --content-root ../blog-content
```

The site build remains an Astro/Node ecosystem operation. After Astro finishes, BlogCTL generates the canonical Search inventory and then runs Pagefind.

Useful development commands:

```bash
blogctl dev
blogctl check
blogctl diagrams
blogctl diagrams plantuml
blogctl diagrams drawio
blogctl test
```

## Search discovery

BlogCTL Search uses the built site as the source of truth.

Build/search inventory:

```bash
blogctl search build
blogctl search inventory
blogctl search inventory --json
```

Submit a full inventory:

```bash
blogctl search submit --providers indexnow --all
```

Submit an explicit URL set:

```bash
blogctl search submit \
  --providers indexnow,baidu,google \
  --urls-file changed-urls.txt
```

Google URL Inspection audit:

```bash
blogctl search audit \
  --provider google \
  --limit 500 \
  --output .search/google-audit.json
```

Post-deployment discovery notification:

```bash
blogctl search notify
```

Provider ownership:

- IndexNow: Go.
- Baidu ordinary URL submission: Go.
- Google service-account OAuth, sitemap submission and URL Inspection: Go.
- Google **Request Indexing**: Extension browser automation against the real Search Console UI.

Request Indexing intentionally does not replay private Google RPCs or persist Google cookies/tokens.

## AI Search

Prepare content:

```bash
blogctl ai-search prepare \
  --output .tmp/ai-search \
  --content-root ../blog-content
```

Sync Cloudflare AI Search:

```bash
blogctl ai-search sync
```

Sync and wait for indexing/retrieval verification:

```bash
blogctl ai-search sync --verify
```

Run verification separately:

```bash
blogctl ai-search verify
```

CI supplies Cloudflare credentials at the CI boundary. Local user configuration remains in `blogctl.toml`; CI-only secrets are not a second interactive configuration model.

## Network proxy

Proxy settings belong to the Bridge and are persisted in `blogctl.toml`.

When enabled:

- Bridge-originated external Go HTTP traffic uses the configured HTTP proxy.
- HTTPS uses CONNECT through that proxy.
- Search providers use the same proxy policy.
- Loopback CLI/Extension/Bridge communication never uses the external proxy.
- Browser tabs and unrelated applications are not modified.

When disabled, BlogCTL uses explicit direct mode while retaining the saved host/port values.

## State and ownership

```text
User config directory/
├── blogctl.toml        durable user configuration
├── bridge.json         local Bridge discovery
├── jobs.json           durable job state
└── provider snapshots  Search incremental baselines

blog-content/
├── src/content/        canonical content
├── .blogctl/           durable publication bindings/state
└── .distribution/      generated publishing artifacts

ThinkerQAQ.github.io/
├── tools/blogctl/      BlogCTL implementation
├── scripts/            site/ecosystem tooling only
└── dist/               built site + Search inventory
```

## Source layout

```text
tools/blogctl/
├── cmd/          CLI entry points
├── app/          workflows and orchestration
├── compiler/     Go publishing compiler
├── assets/       Go publishing asset pipeline
├── publisher/    platform adapters
├── storage/r2/   shared R2 client/signing
├── search/       Search discovery providers
├── aisearch/     Cloudflare AI Search
├── bridge/       durable local control plane
├── extension/    Chromium Extension
└── renderers/    thin ecosystem adapters
```

Root `scripts/` is reserved for site/toolchain concerns such as site diagrams, Pagefind, public-content safety and frontend tests. Publishing backend logic must not be reintroduced there.

## Development rule

The architectural boundary is:

```text
Go owns domain logic and orchestration.
Browser JavaScript owns browser APIs and DOM automation.
External Node/Java tools are invoked as renderers/toolchain dependencies.
```

Do not add a second publishing/search backend in `scripts/` or the Extension.

Historical release details remain in [RELEASE_NOTES.md](./RELEASE_NOTES.md).
