# Documentation migration record — 2026-10-10

This page records the review and migration decisions; it is not part of the first-run tutorial.

| Original location | Action | Destination / authority |
| --- | --- | --- |
| Root `README.md` and `README_ZH.md` | Split tutorial and deployment; keep overview | Root README, [Quick Start](quick-start.md), [Tutorial](tutorial/first-site.md), [Deployment](reference/deployment.md) |
| Root README architecture table and diagram notes | Consolidate | [System concepts](concepts/system.md), [Architecture](architecture/index.md) |
| `tools/blogctl/README.md` | Reduce to home/quick path | [BlogCTL documentation](../tools/blogctl/docs/index.md) |
| BlogCTL `docs/quick-start.md` and workflow guide | Keep and verify against UI/CLI | Same files with narrower scope |
| BlogCTL configuration text in README | Move one field authority | [Configuration Reference](../tools/blogctl/docs/reference/configuration.md) |
| `docs/edgeone-r2-media.md`, `docs/edgeone-workers-proxy.md` | Preserve evidence; classify as deep design | [Architecture index](architecture/index.md) links to original files |
| BlogCTL UI/reuse design reviews | Preserve as historical design | [BlogCTL architecture](../tools/blogctl/docs/architecture/index.md) |
| BlogCTL Toutiao experimental notes | Reclassify; retain research | BlogCTL historical design; not Reference |
| Agent-specific unwritten conventions | Formalize | [Root Agent Contract](../AGENTS.md), [BlogCTL scope](../tools/blogctl/AGENTS.md) |
| Obsolete claims about single deployment target/production AI UI | Remove from first-run docs | Deployment/workflow sources and verified feature boundaries |

**Keep:** working examples, architecture evidence, safety boundaries, actual workflows. **Split:** project home vs tutorial/how-to/reference. **Merge:** duplicate commands/config into single authorities. **Delete:** historical claims falsely presented as current production features; preserve useful investigation evidence with dates.

Drift prevention: DevTool `document_context` for document structure, Marksman for optional links, source-backed command/config references, local link checks, and updates in the same PR as interface changes.
