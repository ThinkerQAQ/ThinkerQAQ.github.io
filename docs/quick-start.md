# Quick Start — local public engine

**Outcome:** the repository's real Astro application is available at `http://localhost:4321` using built-in content fixtures. No secrets or private content repository are required.

## Prerequisites

Node.js 22+ with npm, Go 1.27.1, and Git. Those versions correspond to `.github/workflows/deploy.yml` and `go.work`.

## Bootstrap and run

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
cd ThinkerQAQ.github.io
npm ci
npm run dev
```

`npm run dev` first calls `assemble:fixtures` (the Go BlogCTL site-assembly command), then runs `dev:site` (diagrams and Astro dev server). Open [http://localhost:4321](http://localhost:4321) and open the sample article.

## Validate

In a second terminal, in the same repository:

```bash
npm run check
```

This runs `astro check`. To run all public-engine tests and a production-style fixture build:

```bash
npm run test
```

That path may require the extra diagram/browser tooling configured in CI; it is not required to see the first page.

## Success

The home page loads and links to fixture content, with no production credentials. Next: [first real content tutorial](tutorial/first-site.md) or [command reference](reference/commands.md). To run DevTool, use [the Agent Contract](../AGENTS.md).
