---
title: "1.30 InnoDB MVCC"
description: "How InnoDB uses transaction IDs, undo-based row versions, and Read Views so readers can observe consistent historical versions without blocking writers."
translationOf: "database/MySQL/InnoDB/InnoDB MVCC"
language: "en"
updatedAt: "2026-09-15T04:20:00Z"
---

## 1. What Is MVCC?

Multi-Version Concurrency Control lets a transaction read an appropriate historical version of a row rather than forcing every read to wait for concurrent writers.

InnoDB combines row metadata, undo records, and a **Read View** to decide which version is visible.

## 2. Version Chain

InnoDB records include transaction/version metadata such as the transaction ID that last changed the row and a pointer into undo information. Older row images can be reconstructed through undo records, forming a logical version history.

![](https://raw.githubusercontent.com/TDoct/images/master/1620304385_20210506195135483_24414.png)

[Undo Log](/en/notes/database/MySQL/InnoDB/InnoDB%20undo%20log/)

## 3. Read View

A Read View captures information about transactions that were active when the view was created. When InnoDB encounters a row version, it compares that version's transaction ID with the view to decide whether the creating transaction is visible.

Conceptually:

- versions created by the current transaction are visible to itself;
- versions committed before the snapshot boundary are visible;
- versions from transactions still active at snapshot creation are not visible;
- versions created by transactions that started after the snapshot are not visible.

If the newest version is not visible, InnoDB follows undo history to find an older visible version.

## 4. Read Committed vs. Repeatable Read

- Under **Read Committed**, consistent reads create a fresh read view per statement.
- Under **Repeatable Read**, consistent reads in a transaction normally share the same snapshot after it is established.

MVCC mainly improves read/write concurrency. It does not eliminate the need for locks when transactions modify rows or explicitly request locking reads.