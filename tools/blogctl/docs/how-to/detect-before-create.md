# How to avoid duplicate remote drafts

**Task:** create a new platform draft only when the account does not already have that article.

## Preconditions

A connected Extension/Bridge, a selected local article and a platform account.

## Steps

1. Open **检测** and inspect that platform's draft/published inventory.
2. Open **创建**, choose the article, and allow automatic association detection to finish.
3. If matching remote articles exist, use their view/edit links or switch to **更新** with the explicit remote target.
4. Only when detection succeeds and returns no match, use **创建草稿**.
5. Open **任务** and confirm the remote ID before attempting additional writes.

## Verify / errors

After an ambiguous timeout, re-check remote inventory first. A failed or truncated remote read is **not** evidence the article does not exist; do not force a blind Create.

For platform-by-platform details consult [Workflows](../guide/workflows.md).
