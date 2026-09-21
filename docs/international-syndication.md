# Blog syndication

The personal blog remains the source of truth. Distributed copies must point back to the canonical article on `https://thinkerqaq.github.io`.

## Tool architecture

Local developer tooling is centered on one cross-platform Go tool:

```text
tools/blogctl/
├── cmd/        # CLI and orchestration
├── bridge/     # loopback CLI ↔ browser communication
└── extension/  # BlogCTL Extension
```

The bridge is not a second application. `blogctl sync` starts it only when a browser-session platform needs it and shuts it down when the command exits. The root `scripts/` directory remains the Astro/Node implementation layer and is not moved into `tools/`.

Run from the repository root:

```bash
go run ./tools/blogctl/cmd sync --article concurrency-series-00 --platforms devto,medium --dry-run
```

Both article scope and platform scope are explicit. Full distribution still requires explicit `--all`; normal build/deploy never triggers syndication.

## BlogCTL Extension

Load this directory as the project extension:

```text
tools/blogctl/extension
```

The BlogCTL Extension sends only adapter-approved browser session fields to `127.0.0.1:32145`. The Go bridge keeps session material in memory with a short TTL and never persists or logs cookie values.

The popup exposes the state that matters for browser-session platforms:

- **BlogCTL Bridge**: whether the local bridge is currently running.
- **Medium Login**: whether the browser currently has the required Medium login cookie.
- **Medium Session**: whether the browser session has already been handed to the running bridge, including its remaining lifetime.

The popup does not send cookies automatically. The user must explicitly click **Sync Medium Session** while a live `blogctl sync` command is waiting. This keeps the browser-to-local handoff visible and deliberate.

Medium is the first native browser-session adapter. Chinese destinations (CNBlogs, Juejin, CSDN, SegmentFault, Zhihu, 51CTO, OSChina and Toutiao) now also publish through native Go adapter implementations over the same BlogCTL bridge, without the legacy Wechatsync compatibility adapter.

## Platform routing

| Platform | Current route | Publish behavior |
| --- | --- | --- |
| CNBlogs / Juejin / CSDN / SegmentFault / Zhihu / 51CTO / OSChina / Toutiao | `blogctl` → Go bridge → native publisher adapters | draft + explicit confirm-publish |
| DEV.to | `blogctl` → official DEV API implementation | explicit command/workflow only |
| Medium | `blogctl` → Go bridge → BlogCTL Extension → Medium draft API | draft only |

The compatibility route does not change the target architecture: one CLI, one bridge implementation, and one BlogCTL Extension.

## Medium

Prepare without contacting Medium:

```bash
go run ./tools/blogctl/cmd sync --article concurrency-series-00 --platforms medium --dry-run
```

This also writes `.distribution/medium/concurrency-series-00.html` as the copy/paste fallback.

Live draft creation is explicit:

```bash
go run ./tools/blogctl/cmd sync --article concurrency-series-00 --platforms medium
```

When the command reports that it is waiting for a browser session:

1. Stay signed in to `medium.com` in the same browser profile that has BlogCTL Extension installed.
2. Open **BlogCTL Extension**.
3. Verify that **BlogCTL Bridge** is `Running` and **Medium Login** is `Logged in`.
4. Click **Sync Medium Session**.
5. Verify that **Medium Session** changes to `Synced`; the terminal then continues and creates the Medium draft.

The live command waits up to five minutes for this handoff. If Bridge or Medium Login is red in the popup, fix that state directly instead of waiting for a terminal timeout.

The bridge then uses the existing verified draft flow:

```text
CreatePostMutation
  -> POST /p/{postId}/deltas
  -> Medium draft
```

The Medium adapter remains draft-only. Canonical and tags remain manual until their current editor requests are captured and verified.

## DEV.to workflow

The GitHub Actions DEV.to workflow remains independent of `blogctl` and keeps its explicit article requirement. This avoids making browser-dependent local tooling part of production deployment.
