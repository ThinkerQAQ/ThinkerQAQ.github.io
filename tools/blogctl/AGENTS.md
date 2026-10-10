# BlogCTL Agent Scope

Read the [root Agent Contract](../../AGENTS.md) first. This file adds BlogCTL-specific constraints only.

- Enter through DevTool from the engine root: `devtool config validate` then `devtool project inspect --json`.
- CLI: [cmd/main.go](cmd/main.go); user config and Bridge: [bridge/config.go](bridge/config.go); publishing: [publishing/config.go](publishing/config.go) and [publisher](publisher/); browser: [extension](extension/).
- Consult [CLI Reference](docs/reference/cli.md), [Configuration Reference](docs/reference/configuration.md), and [Workflows](docs/guide/workflows.md) before changing user behavior.
- Read/detect/list cannot mutate remote content. Create/update/publish/index are distinct explicit operations; jobs persist remote target identities and ambiguous writes must never be blindly repeated.
- Keep browser credentials ephemeral. Backend remains Go; browser-only behavior stays in the Extension. Do not reintroduce separate Console business logic.
- Use DevTool `code_context` for code and `document_context` for docs; inspect configured providers and confirm their actual health.
- Favor maintained adapters, standards and SDKs. Commit and push coherent small changes.
