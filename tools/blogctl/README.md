# blogctl

`blogctl` is the cross-platform developer tool for the ThinkerQAQ blog. Its implementation remains in the public engine repository:

```text
tools/blogctl/
├── cmd/        # Go CLI and orchestration
├── app/        # control-plane workflows
├── compiler/   # deterministic publishing compiler (Node runtime is internal)
├── assets/     # generated publishing assets: Mermaid, R2
├── publisher/  # remote platform adapters and draft/publish transport
├── search/     # search discovery inventory, Google Search Console, IndexNow
├── bridge/     # loopback bridge between the CLI and browser
└── extension/  # BlogCTL Extension
```

The root `scripts/` directory also stays in the public engine for Astro and compatibility wrappers. Publishing-specific compiler and generated-asset capabilities belong under `tools/blogctl/`; `blogctl` is the single user-facing control plane and calls its internal Node runtime when Markdown/HTML transformation is required.

## Repository model

The blog is split into two repositories:

```text
ThinkerQAQ.github.io      Public engine and BlogCTL implementation
blog-content              Private canonical Articles / Notes / Series / Projects
```

Engine operations such as preview, build, check, diagrams, and tests still run from `ThinkerQAQ.github.io`.

Content syndication is different: run `blogctl sync` from `blog-content`. BlogCTL reads article source directly from that repository and uses the public engine checkout only for the syndication implementation and Node dependencies.

When the repositories are sibling directories named `ThinkerQAQ.github.io` and `blog-content`, BlogCTL discovers both automatically. Arbitrary layouts are also supported:

- `BLOG_CONTENT_ROOT` points to the canonical `blog-content` checkout.
- `BLOGCTL_ENGINE_ROOT` points to the `ThinkerQAQ.github.io` checkout.

The sibling layout is therefore a convenience, not a requirement.

## Install

Tagged releases are built by GitHub Actions from `tools/blogctl/VERSION`. Each release contains Windows, macOS, and Linux binaries for amd64/arm64, the matching browser extension, Native Messaging install/uninstall scripts, and `SHA256SUMS`.

Validated owner PRs that change `tools/blogctl/**` explicitly dispatch the BlogCTL release workflow after auto-merge. Release creation is idempotent for an existing version tag, so ordinary follow-up runs do not replace an already published release.

After downloading the binary for the current platform, put it on `PATH` or keep it in a fixed tools directory.

The BlogCTL Extension follows the same local-bridge lifecycle as DownKit: register the binary once as a Chromium Native Messaging Host, then the extension can start or reconnect to the Bridge on demand. The Bridge does not need to be kept open manually.

Windows example:

```powershell
.\Install-Windows.ps1 -Executable C:\software\Coding\blogctl\blogctl-windows-amd64.exe
```

Chrome and Edge should then load the matching `extension` directory. The extension has a stable manifest key, so its Native Messaging origin remains stable across reloads. Linux and macOS use the matching `Install-Linux.sh` and `Install-macOS.command` scripts.

Engine commands:

```bash
cd ThinkerQAQ.github.io
blogctl preview
blogctl build
blogctl check
blogctl notes sync
blogctl diagrams
blogctl doctor
```

Syndication commands:

```bash
cd blog-content
blogctl sync --article concurrency-series-00 --platforms devto,medium --dry-run
```

Building from source remains available for development:

```bash
cd ThinkerQAQ.github.io
go run ./tools/blogctl/cmd help
go build -o blogctl ./tools/blogctl/cmd
```

The released binary removes the need to install Go for normal use. Astro/site and syndication operations still require the public engine repository's Node.js dependencies, and PlantUML rendering still requires Java when a new diagram must be rendered.

## Publishing control plane

BlogCTL owns the publishing pipeline end to end:

```text
canonical article
  -> BlogCTL compiler
  -> generated asset preparation (for example Mermaid -> PNG -> R2)
  -> platform publisher
  -> draft / explicit publish state
```

The personal site is separate: Mermaid source is rendered by Mermaid.js in the browser and does not require publishing PNGs.

Compiler and asset policy is stored under `publishing.compiler` and `publishing.assets` in the BlogCTL config. R2 access credentials remain environment secrets; they are not written to content or distribution artifacts.

See [UNIFIED_PUBLISHING_PIPELINE.md](./UNIFIED_PUBLISHING_PIPELINE.md).

The target-aware workflow for searching and binding multiple remote articles, preparing content without changing public pages, and publishing only after review is specified in [MULTI_TARGET_PREPARE_PUBLISH_DESIGN.md](./MULTI_TARGET_PREPARE_PUBLISH_DESIGN.md).

## Search discovery control plane

BlogCTL also owns standards/API-based search discovery. The generated Astro sitemap chain remains the source of truth for indexable routes; BlogCTL derives a flat `/sitemap-all.txt` from that same inventory and never maintains a second Chinese/English URL list.

Useful commands:

```bash
blogctl search inventory
blogctl search build
blogctl search submit --providers indexnow --all
blogctl search submit --providers indexnow --urls-file changed-urls.txt
blogctl search submit --providers google
blogctl search audit --provider google --limit 500 --output .search/google-audit.json
```

Google Search Console authentication uses the `GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON` secret. The service-account identity must be granted access to the Search Console property. Override the property with `GOOGLE_SEARCH_CONSOLE_SITE_URL` when needed; the default is `https://thinkerqaq.github.io/`.

Google integration intentionally supports sitemap submission and URL Inspection audit only. It does not use Google's restricted Indexing API as a bulk-indexing workaround for ordinary blog pages. IndexNow supports both explicit full-site bootstrap (`--all`) and incremental URL-file submission. The legacy `blogctl indexnow` command remains a compatibility wrapper while CI and local usage migrate.

See [SEARCH_DISCOVERY_CONTROL_PLANE.md](./SEARCH_DISCOVERY_CONTROL_PLANE.md).

## Syndication

Article and platform scopes are always explicit:

```bash
blogctl sync --article concurrency-series-00 --platforms devto,medium --dry-run
```

The source article is loaded from `BLOG_CONTENT_ROOT/src/content/articles/**`; English syndication reads `BLOG_CONTENT_ROOT/src/content/articles/en/**`. Generated publishing artifacts are written to `BLOG_CONTENT_ROOT/.distribution/**`, so content-derived outputs stay with the content workspace instead of polluting the public engine checkout. `.distribution/` is local-only and should remain ignored by Git.

BlogCTL Extension independently reports browser login status for the publishing platforms it knows how to inspect: 博客园, 掘金, CSDN, 思否, 知乎, 51CTO, 开源中国, 今日头条, DEV.to, and Medium. A failed probe is isolated to that platform and does not make the other platform or Bridge states unknown.

The extension contacts the registered Native Messaging Host whenever Bridge access is required. The host reuses an existing healthy Bridge or starts `blogctl --bridge` in the background, then returns the current loopback endpoint. Live `blogctl sync --platforms medium` uses the same persistent Bridge state instead of creating a second per-command Bridge.

Platforms that publish through browser-authenticated native adapters use a short-lived browser-session handoff internally. This is an implementation detail and is not exposed as a separate Session control in the popup; users only see the normal platform login state.

Before creating a draft, retrying a failed job, or confirming publication, the BlogCTL Extension refreshes the approved session for the selected platform automatically. Only adapter-approved browser cookies plus the browser user agent are handed to the local Bridge, and the Bridge keeps them in memory with a short TTL rather than persisting them in BlogCTL configuration.

Publishing language is a persistent per-platform policy under **发布配置**. Chinese platforms default to `zh-CN`; DEV.to and Medium default to `en`. Either default can be changed. The selected language controls the complete source article (title, description, tags and body) plus the blog canonical/Footer URL. See [PUBLISHING_LANGUAGE.md](./PUBLISHING_LANGUAGE.md).

### Network proxy

BlogCTL follows the same proxy model as DownKit: proxy configuration belongs to the local Bridge rather than to an individual `sync` invocation. The Extension exposes a persistent **Network Proxy** card with an explicit enable switch plus proxy host and port fields.

The configuration is stored under the operating system user-config directory in `BlogCTL/config.json`. When a Bridge starts, it loads that file automatically. Changing the proxy while the Bridge is running rebuilds the Bridge HTTP client immediately.

- Enabled: Bridge-originated external HTTP/HTTPS traffic uses the configured HTTP proxy; HTTPS destinations use CONNECT through it.
- Disabled: the configured host and port are retained, while Bridge external traffic uses explicit direct mode.
- Loopback communication between the CLI, Extension, and Bridge never uses the configured external proxy.
- `HTTP_PROXY`, `HTTPS_PROXY`, and a per-command `--proxy` flag are not required for normal BlogCTL operation.

This keeps the command stable:

```bash
blogctl sync --article concurrency-series-01-hardware --platforms medium
```

Current routing uses one BlogCTL control plane:

- DEV.to keeps the official API implementation.
- Medium uses the persistent BlogCTL Bridge plus BlogCTL Extension and remains draft-oriented.
- 博客园、掘金、CSDN、思否、知乎、51CTO、开源中国、今日头条 use BlogCTL's native Go publisher adapters. They do not require the Wechatsync CLI or Wechatsync browser extension.
- Native Chinese publishing follows two explicit phases: first create or update the remote draft and return its preview URL; after preview, use **确定发布** from the task page. BlogCTL refuses confirmation when the source content hash no longer matches the reviewed draft.

The browser extension is therefore the only browser-side component required by BlogCTL publishing.

### CNBlogs existing article bindings

In **同步发布**, select a local article and use **博客园文章绑定** to search the signed-in CNBlogs editor's posts or enter a CNBlogs article URL/ID. Search results are candidates; selecting one does not bind it until **验证并绑定** reads its editor detail. Existing bindings can be reverified, and changing an ID requires an explicit confirmation. BlogCTL-created drafts and confirmed bindings are kept in the content repository's `.blogctl/publications.json`, outside the generated `.distribution/` directory. The first visit to this section migrates existing CNBlogs IDs from `.distribution/manifest.json` into the durable file. Commit that file with the content repository to retain bindings across machines.

A published binding cannot be sent through **创建/更新草稿**. Use **更新已发布文章** explicitly; BlogCTL checks the signed-in account, reads the remote post, compares its update time with the last verified baseline, and stops if the post changed remotely. Reverify the binding to accept a new remote baseline before retrying. These controls currently apply to CNBlogs only.
