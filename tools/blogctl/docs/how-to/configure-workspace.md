# How to configure a BlogCTL workspace

**Task:** connect one engine checkout and one canonical content checkout to an installed Bridge.

## Prerequisites

Two valid repositories, installed Extension/Bridge, and a writable local data directory.

## Steps

1. Open **设置** in BlogCTL.
2. Set **Engine Root** to the `ThinkerQAQ.github.io` checkout and **Content Root** to the adjacent `blog-content` checkout.
3. Save the fields. These persist to the single `blogctl.toml` file in the selected Data directory.
4. To change the data location for a custom deployment, set `BLOGCTL_DATA_DIR` to an **absolute** filesystem path before starting the Bridge, then move or restore the expected files yourself.

## Verify

Reopen Settings and check both roots; use **检测** to confirm the local article list and authenticated platform state. `blogctl.toml` is a config file; `jobs.json` and `publications.json` are runtime state, not configuration.

## Common errors

A relative `BLOGCTL_DATA_DIR` is rejected. Moving the executable on Windows also changes its default Data directory. Keep credentials out of Git. Consult [Configuration Reference](../reference/configuration.md).
