# BlogCTL

[简体中文](README_ZH.md) · [Documentation](docs/index.md) · [Releases](https://github.com/ThinkerQAQ/ThinkerQAQ.github.io/releases/latest)

BlogCTL is the Go application that assembles the blog, prepares articles for other publishing platforms, and runs a local Bridge for the browser Extension and Web Console.

## Quick Start

To inspect the CLI from a checkout of the [blog engine](../../README.md):

```bash
go run ./tools/blogctl/cmd help
go run ./tools/blogctl/cmd doctor
```

For Windows installations, download the current package, keep its `Data/` directory between upgrades and register the Native Messaging host:

```powershell
.\Install-Windows.ps1 -Executable C:\software\Coding\blogctl\blogctl-windows-amd64.exe
```

Load the unpacked Extension in Edge or Chrome. The **打开工作台** action opens the local Console. For installation details on each OS, follow the [Quick Start](docs/quick-start.md).

## For AI Agents

Follow the repository's [AGENTS.md](../../AGENTS.md) and [BlogCTL-specific contract](AGENTS.md). From the engine root:

```bash
devtool config validate
devtool project inspect --json
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

## Documentation

| Topic | English | 简体中文 |
| --- | --- | --- |
| First use | [Quick Start](docs/quick-start.md) | [快速开始](docs/zh-CN/quick-start.md) |
| Publishing workflow | [Tutorial](docs/tutorial/first-publish.md) | [教程](docs/zh-CN/tutorial/first-publish.md) |
| Models and interfaces | [Concepts and Reference](docs/index.md) | [中文文档目录](docs/zh-CN/index.md) |

Development commands and release packaging are owned by the engine's DevTool configuration.

[MIT License](../../LICENSE)
