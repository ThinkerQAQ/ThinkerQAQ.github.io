# Tutorial — first safe BlogCTL publishing workflow

**Goal:** discover local content, check an existing platform account, and preview an article before any remote write.

## 1. Prepare content

Follow the engine [first-site tutorial](../../../../../docs/tutorial/first-site.md) to obtain a `ThinkerQAQ.github.io/` engine checkout beside `blog-content/`. Start with a **sample article** in the content repository.

## 2. Connect the control plane

Follow [BlogCTL Quick Start](../quick-start.md). Use **设置** to select Engine Root and Content Root and configure your browser platform session. A Windows installation saves runtime files inside `Data/`.

## 3. Discover without changing anything

Open **检测**, select a platform and read the existing draft/published list. Open **创建**, choose a local article, and check the read-only association results. If a matching remote article exists, inspect its editor/view link rather than creating a duplicate.

## 4. Compile locally (optional CLI path)

From the **content repository** with a running Bridge and a configured platform:

```bash
blogctl sync --article sample-article --platforms devto --dry-run
```

Replace `sample-article` with an existing slug. `--dry-run` does not write to the remote platform. See [CLI Reference](../reference/cli.md) for prerequisites and flags.

## 5. Explicit publish decision

Only after verifying the account and payload, use **创建草稿** for a new article; existing articles belong to **更新** with an explicitly selected remote target. Treat remote writes as separate user-approved actions. If a request times out, inspect **检测** / **任务** before repeating it.

## 6. Verify and continue

Inspect **任务** for remote IDs and results and open the remote draft editor. For exact UI behavior read the [workflow guide](../guide/workflows.md); for side-effect boundaries see [Concepts](../concepts/operations.md).
