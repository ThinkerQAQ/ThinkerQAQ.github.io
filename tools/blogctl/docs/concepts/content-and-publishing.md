# Content and publishing

**Definition:** BlogCTL compiles canonical Markdown into platform-specific payloads while preserving the original content repository as the sole source of truth.

## Problem and model

Different article platforms accept different HTML/Markdown, asset uploads, draft IDs and canonical URLs. BlogCTL separates:

```text
blog-content Markdown
   ↓ compiler
CompiledArticle / content policy
   ↓ asset pipeline
prepared images / diagrams
   ↓ platform adapter
remote draft (explicit action)
   ↓ publish adapter (only if supported and requested)
public article
```

The compiler and asset pipeline are reusable; adapters own platform-specific request constraints. [Source implementation](../../compiler/compile.go) and [publishing contract](../../publishing/config.go) define the boundaries.

## Example

For one article and DEV.to, a `--dry-run` creates a local preview without third-party changes. A live Create Draft requires an account session and explicit authorization. A later Update must select an actual remote target rather than guessing from the title.

## Trade-off

This design adds explicit steps in exchange for preventing duplicate articles and accidental publication. For exact operations see [Workflows](../guide/workflows.md) and [CLI](../reference/cli.md).
