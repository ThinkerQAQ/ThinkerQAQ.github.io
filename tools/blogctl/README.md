# blogctl

`blogctl` is the cross-platform developer tool for the ThinkerQAQ blog. Its implementation remains in the public engine repository:

```text
tools/blogctl/
├── cmd/        # Go CLI and orchestration
├── bridge/     # loopback bridge between the CLI and browser
└── extension/  # BlogCTL Extension
```

The root `scripts/` directory also stays in the public engine. Those scripts are Astro/Node implementation details; `blogctl` is the user-facing control plane and calls them when needed.

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

## Syndication

Article and platform scopes are always explicit:

```bash
blogctl sync --article concurrency-series-00 --platforms devto,medium --dry-run
```

The source article is loaded from `BLOG_CONTENT_ROOT/src/content/articles/**`; English syndication reads `BLOG_CONTENT_ROOT/src/content/articles/en/**`. Generated publishing artifacts are written to `BLOG_CONTENT_ROOT/.distribution/**`, so content-derived outputs stay with the content workspace instead of polluting the public engine checkout. `.distribution/` is local-only and should remain ignored by Git.

BlogCTL Extension independently reports browser login status for the publishing platforms it knows how to inspect: 博客园, 掘金, CSDN, 思否, 知乎, 51CTO, 开源中国, 今日头条, DEV.to, and Medium. A failed probe is isolated to that platform and does not make the other platform or Bridge states unknown.

The extension contacts the registered Native Messaging Host whenever Bridge access is required. The host reuses an existing healthy Bridge or starts `blogctl --bridge` in the background, then returns the current loopback endpoint. Live `blogctl sync --platforms medium` uses the same persistent Bridge state instead of creating a second per-command Bridge.

Medium needs a short-lived browser-session handoff for draft creation. The popup now keeps that state inside the **平台登录状态** list: the Medium row shows both login state and the remaining synchronized Session lifetime.

When Medium is logged in, BlogCTL refreshes the approved Medium Session automatically when the environment panel is opened and also immediately before a Medium sync if needed. There is no separate manual Session button. Only adapter-approved Medium browser session fields are sent; the Bridge keeps them in memory. Other platform login probes do not send their cookies to BlogCTL.

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

Current routing is intentionally incremental:

- DEV.to keeps the official API implementation.
- Medium uses `blogctl` + persistent Bridge + BlogCTL Extension and remains draft-only.
- Chinese destinations keep the existing Wechatsync subprocess while their platform adapters are migrated. This preserves working behavior without copying GPL-licensed Wechatsync implementation into the MIT blog repository. Live Chinese sync therefore still needs the existing Wechatsync environment during this migration stage.

This compatibility path is not a second `blogctl` architecture. The target remains one CLI, one bridge implementation, and one BlogCTL Extension.
