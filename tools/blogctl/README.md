# BlogCTL

[简体中文](README_ZH.md) · [Documentation](docs/index.md) · [Releases](https://github.com/ThinkerQAQ/ThinkerQAQ.github.io/releases/latest)

BlogCTL is the Go application that assembles the blog, prepares articles for other publishing platforms, and runs a local Bridge for the browser Extension and Web Console.

For a step-by-step first run with actual English UI screenshots, follow the [new-machine tutorial](docs/tutorial/first-run-on-new-machine.md).

## Quick Start

To inspect the CLI from a checkout of the [blog engine](../../README.md):

```bash
go run ./tools/blogctl/cmd help
go run ./tools/blogctl/cmd doctor
```

For Windows installations, download the current executable, keep its `Data/` directory between upgrades and register the Native Messaging host from the executable itself:

```powershell
& C:\software\Codinglogctllogctl-windows-amd64.exe install
```

Load the unpacked Extension in Edge or Chrome. The **打开工作台** action opens the local Console. For installation details on each OS, follow the [Quick Start](docs/quick-start.md).

## For AI Agents

Follow the repository's [AGENTS.md](../../AGENTS.md) and [BlogCTL-specific contract](AGENTS.md). From the engine root:

```bash
go run ./tools/blogctl/cmd/maint verify
go run ./tools/blogctl/cmd/maint build
```

## Architecture

```text
Markdown source
  └──► BlogCTL compiler / assets / site assembly
                ├──► Astro build
                └──► platform publishers
                         ▲
           Extension ↔ Go Bridge ↔ Web Console
```

Session access stays in the browser Extension; Go handles local jobs and publishing adapters. See [Concepts](docs/concepts/index.md).

## Social Publishing (Buffer)

AI-authored short-form posts are reviewed locally before staging to Buffer and
publishing to LinkedIn, X or Bluesky. The same BlogCTL Web Console previews the
draft; a matching, explicit content revision is required for publication. See
[Social Publishing](docs/guide/social-publishing.md), including the WSL/Windows
Data directory setup.

## Documentation

| Topic | English | 简体中文 |
| --- | --- | --- |
| First use | [Quick Start](docs/quick-start.md) | [快速开始](docs/zh-CN/quick-start.md) |
| Publishing workflow | [Tutorial](docs/tutorial/first-publish.md) | [教程](docs/zh-CN/tutorial/first-publish.md) |
| Models and interfaces | [Concepts and Reference](docs/index.md) | [中文文档目录](docs/zh-CN/index.md) |

Build, verification and release packaging use the engine's native Go maintainer at `tools/blogctl/cmd/maint/`.

[MIT License](../../LICENSE)
