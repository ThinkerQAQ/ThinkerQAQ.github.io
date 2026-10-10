# BlogCTL

[BlogCTL documentation](docs/index.md) · [Blog engine](../../README.md) · [Latest release](https://github.com/ThinkerQAQ/ThinkerQAQ.github.io/releases/latest)

BlogCTL is the Go-based local control plane for the ThinkerQAQ blog: site assembly, article syndication, publishing assets, search-engine indexing, and a browser Extension/Bridge with a shared Web Console.

**Principles:** explicit operations, safe remote writes, minimal Go core, configurable providers, mature components before custom implementations.

## Quick Start

From an engine checkout, validate the CLI:

```bash
go run ./tools/blogctl/cmd help
go run ./tools/blogctl/cmd doctor
```

For the installed Windows release, put the executable and unpacked Extension in one folder, keep the persistent `Data/` directory, and register the Native Messaging host:

```powershell
.\Install-Windows.ps1 -Executable C:\software\Coding\blogctl\blogctl-windows-amd64.exe
```

Load the unpacked Extension through `edge://extensions` or `chrome://extensions`; use the Extension and its **打开工作台** control to reach the local Console. See the [platform-specific Quick Start](docs/quick-start.md) for install, validation and troubleshooting.

## For AI Agents

Read [the root Agent Contract](../../AGENTS.md), then [BlogCTL Agent Scope](AGENTS.md). Discover project commands through DevTool:

```bash
devtool config validate
devtool project inspect --json
```

## Architecture

```text
blog-content (canonical Markdown)
          │
          ▼
      BlogCTL Go Core ──► Site assembly / asset compiler
          │
          ├──► Browser Extension ↔ Native Messaging ↔ Bridge
          │                                  │
          │                                  └──► Publish / detect / jobs
          └──► Search index / distribution integrations
```

See [Concepts](docs/concepts/index.md) for the data model and operation boundaries; see [historical designs](docs/architecture/index.md) for decisions.

## Documentation

- [Quick Start](docs/quick-start.md)
- [Tutorial](docs/tutorial/first-publish.md)
- [Concepts](docs/concepts/index.md)
- [How-to](docs/how-to/index.md)
- [Reference: CLI](docs/reference/cli.md) / [Configuration](docs/reference/configuration.md) / [Contracts](docs/reference/contracts.md)
- [Examples](docs/examples/index.md)
- [Deep Design](docs/architecture/index.md)

## Development / Self-hosting

Use the root [DevTool project](../../.devtool.toml) for build, verification and packages. BlogCTL releases include prebuilt binaries; a released binary does not require Go. Local content, platform credentials and runtime state must remain outside source control.

[MIT License](../../LICENSE)
