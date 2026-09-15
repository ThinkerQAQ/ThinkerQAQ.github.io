---
title: "1.32 InnoDB Undo Log"
description: "How undo records support transaction rollback and MVCC version reconstruction, and why long transactions delay undo purge."
translationOf: "database/MySQL/InnoDB/InnoDB undo log"
language: "en"
updatedAt: "2026-09-15T04:20:00Z"
---

## 1. What Is the Undo Log?

Undo records contain enough information to reconstruct an earlier logical version of modified data.

They support two major functions:

- **transaction rollback**: reverse changes made by a transaction that aborts;
- **MVCC**: reconstruct an older row version visible to a consistent read.

The implementation is more nuanced than literally storing the opposite SQL statement, but “inverse logical information” is a useful first mental model.

## 2. Relationship to MVCC

When the current row version is not visible to a transaction's Read View, InnoDB can use undo history to find or reconstruct a prior visible version.

[InnoDB MVCC](/en/notes/database/MySQL/InnoDB/InnoDB%20MVCC/)

## 3. Purge

Undo cannot be discarded while an active transaction might still need an older version. Long-running transactions can therefore retain undo history for a long time, increasing storage pressure and making purge work harder.

This is one reason to avoid unnecessarily long transactions even when they are mostly reading.