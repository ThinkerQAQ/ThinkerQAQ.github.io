# Operation safety model

**Definition:** BlogCTL distinguishes read-only discovery from explicit remote writes with side effects.

| Operation | Effect | Required decision |
| --- | --- | --- |
| Detect / list | Read remote state | Selected platform and authenticated session |
| Create Draft | New remote article | User explicitly requests creation, no known matching remote target |
| Update | Changes chosen remote article | Explicit remote ID and supported update capability |
| Publish Draft | May make an article public | Explicit supported publish action and known draft target |
| Search submission | Notifies index provider | Explicit index task and configured provider |

## Why this matters

Third-party timeouts are ambiguous: a request might have succeeded on the server. Automatically repeating writes can duplicate or overwrite remote content. The [workflow guide](../guide/workflows.md) specifies retry and update boundaries; [contracts](../reference/contracts.md) link the concrete code.

## Example

If a Create Draft call times out, open **检测** and **任务**. Confirm the remote state before any retry. A disabled Update action must not silently fall back to Create.
