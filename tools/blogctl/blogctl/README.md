# blogctl

`blogctl` is the cross-platform developer tool for the ThinkerQAQ blog. It keeps the repository architecture deliberately small:

```text
tools/blogctl/
├── cmd/        # Go CLI and orchestration
├── bridge/     # loopback bridge between the CLI and browser
└── extension/  # BlogCTL Extension
```

The root `scripts/` directory stays where it is. Those scripts are repository-level Astro/Node implementation details; `blogctl` is the user-facing control plane and calls them when needed.

## Install

Tagged releases are built by GitHub Actions from `tools/blogctl/VERSION`. Each release contains Windows, macOS, and Linux binaries for amd64/arm64, the matching browser extension, and `SHA256SUMS`.

Validated owner PRs that change `tools/blogctl/**` explicitly dispatch the BlogCTL release workflow after auto-merge. Release creation is idempotent for an existing version tag, so ordinary follow-up runs do not replace an already published release.

After downloading the binary for the current platform, put it on `PATH` and run it from anywhere inside this repository:

```bash
blogctl help
blogctl preview
blogctl build
blogctl check
blogctl notes sync
blogctl diagrams
blogctl doctor
```

Building from source remains available for development:

```bash
go run ./tools/blogctl/cmd help
go build -o blogctl ./tools/blogctl/cmd
```

The released binary removes the need to install Go for normal use. Astro/site operations still require the repository's Node.js dependencies, and PlantUML rendering still requires Java when a new diagram must be rendered.

## Syndication

Article and platform scopes are always explicit:

```bash
blogctl sync --article concurrency-series-00 --platforms devto,medium --dry-run
```

BlogCTL Extension independently reports browser login status for the publishing platforms it knows how to inspect: 博客园, 掘金, CSDN, 思否, 知乎, 51CTO, 开源中国, 今日头条, DEV.to, and Medium. A failed probe is isolated to that platform and does not make the other platform or Bridge states unknown.

Medium live mode starts the Go bridge on `127.0.0.1:32145` inside the same `blogctl` process. Medium has one additional state in the popup because its draft transport needs an explicit browser-session handoff:

- BlogCTL Bridge running / not running.
- Platform login states: logged in / not logged in / detection failed.
- Medium Session synced / not synced, including the remaining session lifetime.

The extension does not hand cookies to the bridge automatically. While a live Medium sync is waiting, open BlogCTL Extension, verify that Medium is logged in and the Bridge is running, then click **Sync Medium Session**. Only adapter-approved Medium browser session fields are sent; the bridge keeps them in memory and shuts down when the command exits. Other platform login probes do not send their cookies to BlogCTL.

Current routing is intentionally incremental:

- DEV.to keeps the official API implementation.
- Medium uses `blogctl` + `bridge` + BlogCTL Extension and remains draft-only.
- Chinese destinations keep the existing Wechatsync subprocess while their platform adapters are migrated. This preserves working behavior without copying GPL-licensed Wechatsync implementation into the MIT blog repository. Live Chinese sync therefore still needs the existing Wechatsync environment during this migration stage.

This compatibility path is not a second `blogctl` architecture. The target remains one CLI, one bridge implementation, and one BlogCTL Extension.
