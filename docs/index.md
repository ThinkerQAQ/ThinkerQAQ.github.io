# Inkerio documentation

[简体中文](zh-CN/index.md)

Inkerio builds an Astro site from Markdown kept in a separate repository. [inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template) provides public examples; BlogCTL assembles content and distributes articles to external platforms. The author's ThinkerQAQ site is one deployment of the engine.

| What you're doing | Read |
| --- | --- |
| Running the engine locally | [Quick Start](quick-start.md) |
| Setting up a content checkout | [Tutorial](tutorial/first-site.md) |
| Understanding content assembly and deployment | [System architecture](concepts/system.md) |
| Working with search, analytics or Workers | [Integrations](concepts/search-and-integrations.md) |
| Solving an operational issue | [How-to](how-to/index.md) |
| Checking exact commands and settings | [Reference](reference/index.md) |
| Reviewing public template examples | [Examples](examples/index.md) |
| Extending the system | [Architecture principles](architecture/principles.md) |
| Using the publishing application | [BlogCTL documentation](../tools/blogctl/docs/index.md) |

Commands are documented under [Reference](reference/commands.md). The Go and TypeScript definitions linked there are the final source for configuration and interfaces.

## Documentation structure

| Section | Purpose |
| --- | --- |
| Quick Start | The shortest path to a working sample site |
| Tutorial | A complete learning workflow using an editable content checkout |
| Concepts | System models, responsibilities and relationships |
| How-to | Steps for one specific task or problem |
| Reference | Exact commands, configuration and schemas |
| Examples | Runnable sample content and configurations |
| Architecture | Design principles, constraints and extension decisions |

Keep site documentation here and publishing-tool documentation under `tools/blogctl/docs/`. Link between them instead of copying instructions. English pages live directly under `docs/`; Chinese counterparts use the same paths under `docs/zh-CN/`. Preserve these paths when changing branding.
