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

Tagged releases are built by GitHub Actions from `tools/blogctl/VERSION`. Each release contains Windows, macOS, and Linux binaries for amd64/arm64, the matching browser extension, and `SHA256SUMS`.

Validated owner PRs that change `tools/blogctl/**` explicitly dispatch the BlogCTL release workflow after auto-merge. Release creation is idempotent for an existing version tag, so ordinary follow-up runs do not replace an already published release.

After downloading the binary for the current platform, put it on `PATH`.

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

The source article is loaded from `BLOG_CONTENT_ROOT/src/content/articles/**`; English syndication reads `BLOG_CONTENT_ROOT/src/content/articles/en/**`. Generated distribution artifacts remain engine-local and are not written back into the private content repository.

BlogCTL Extension independently reports browser login status for the publishing platforms it knows how to inspect: 博客园, 掘金, CSDN, 思否, 知乎, 51CTO, 开源中国, 今日头条, DEV.to, and Medium. A failed probe is isolated to that platform and does not make the other platform or Bridge states unknown.

Medium live mode starts the Go bridge on `127.0.0.1:32145` inside the same `blogctl` process. Medium has one additional state in the popup because its draft transport needs an explicit browser-session handoff:

- BlogCTL Bridge running / not running.
- Platform login states: logged in / not logged in / detection failed.
- Medium Session synced / not synced, including the remaining session lifetime.

The extension does not hand cookies to the bridge automatically. While a live Medium sync is waiting, open BlogCTL Extension, verify that Medium is logged in and the Bridge is running, then click **Sync Medium Session**. Only adapter-approved Medium browser session fields are sent; the bridge keeps them in memory and shuts down when the command exits. Other platform login probes do not send their cookies to BlogCTL.

### Network proxy

BlogCTL follows the same proxy model as DownKit: proxy configuration belongs to the local Bridge rather than to an individual `sync` invocation. The Extension exposes a persistent **Network Proxy** card with an explicit enable switch plus proxy host and port fields.

The configuration is stored under the operating system user-config directory in `BlogCTL/config.json`. When a new Bridge starts, it loads that file automatically. Changing the proxy while a Bridge is running rebuilds the Bridge HTTP client immediately, so the same waiting Medium sync can continue without restarting the command.

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
- Medium uses `blogctl` + `bridge` + BlogCTL Extension and remains draft-only.
- Chinese destinations keep the existing Wechatsync subprocess while their platform adapters are migrated. This preserves working behavior without copying GPL-licensed Wechatsync implementation into the MIT blog repository. Live Chinese sync therefore still needs the existing Wechatsync environment during this migration stage.

This compatibility path is not a second `blogctl` architecture. The target remains one CLI, one bridge implementation, and one BlogCTL Extension.
