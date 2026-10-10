# Example — preview selected-platform syndication

**Goal:** compile one real local article without making a third-party write.

With the Extension/Bridge installed and content checkout selected, run from the **content repository**:

```bash
blogctl sync --article concurrency-series-00 --platforms devto,medium --dry-run
```

Replace the slug with an article actually present in that checkout. This is an example from real author workflows, not a guarantee the slug exists in a fresh content template.

**Capabilities:** CLI scope validation, Go compiler and platform-specific payload generation. [cmd/sync.go](../../cmd/sync.go) defines the flags. Remove `--dry-run` only for an explicit authorized remote write after confirming the actual platform account and payload.

**Why:** compilation preview and publishing are separate responsibilities. See [operation safety](../concepts/operations.md).
