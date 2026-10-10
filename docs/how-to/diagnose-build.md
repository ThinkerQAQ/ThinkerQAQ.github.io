# How to diagnose local build failures

## Prerequisites

Run commands from the **engine root** with Node.js 22+, Go 1.27.1 and npm. The full diagram build also requires Java 17+, Graphviz and a usable headless Chromium runtime.

## Steps

```bash
devtool config validate
devtool project inspect --json
devtool code doctor
npm run assemble:fixtures
npm run check
```

For an Astro/diagram issue, check `java -version`, `dot -V`, `npm run diagrams` and the renderer scripts in [Command Reference](../reference/commands.md). For a basic site preview without diagram rendering, use `npm run dev:quick`. For a Go/BlogCTL issue, run the declared `devtool verify` when its configured environment is available; otherwise report that provider as unavailable rather than claiming verification.

For deploy failures, compare the failed Actions job to [the deployment contract](../reference/deployment.md). Check content checkout access before altering the engine, and check EdgeOne and GitHub Pages jobs independently.

## Verify

Confirm the originally failing command now exits successfully. If it uses a non-local service, validate the service independently and do not mask missing credentials with fake defaults.
