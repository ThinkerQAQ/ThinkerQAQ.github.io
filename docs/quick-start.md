# Quick Start — local public engine

**Outcome:** the repository's real Astro application is available at `http://localhost:4321` using built-in content fixtures. No secrets or private content repository are required.

## Prerequisites

Fast preview requires Node.js 22+ with npm, Go 1.27.1 and Git. Full diagram rendering additionally requires Java 17+, Graphviz (`dot`) and a working headless Chromium/Mermaid CLI setup, as seen in `.github/workflows/deploy.yml`.

## Bootstrap and run

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
cd ThinkerQAQ.github.io
npm ci
npm run dev:quick
```

`npm run dev:quick` assembles the fixture content and launches the real Astro server **without static diagram pre-rendering**. Open [http://localhost:4321](http://localhost:4321) and inspect the sample article. Diagram previews may be absent in this minimal mode. For complete diagrams, install Java 17+, Graphviz and the Mermaid/Chromium runtime, then run `npm run dev`.

## Validate

In a second terminal, in the same repository:

```bash
npm run check
```

This runs `astro check`. To run all public-engine tests and a production-style fixture build:

```bash
npm run test
```

That path requires the extra diagram/browser tooling configured in CI; it is not required to see the first page. Check `java -version` and `dot -V` if full rendering fails.

## Success

The home page loads and links to fixture content, with no production credentials. Next: [first real content tutorial](tutorial/first-site.md) or [command reference](reference/commands.md). To run DevTool, use [the Agent Contract](../AGENTS.md).
