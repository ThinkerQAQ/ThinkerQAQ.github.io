---
title: "1.33 InnoDB Transactions"
description: "InnoDB transaction boundaries, ACID mechanisms, isolation levels, consistent reads, locking reads, MVCC, redo, and undo."
translationOf: "database/MySQL/InnoDB/InnoDB事务"
language: "en"
updatedAt: "2026-09-15T04:20:00Z"
---

## 1. Transaction Boundaries

```sql
START TRANSACTION;
-- statements
COMMIT;
```

Use `ROLLBACK` to abort the active transaction. With autocommit enabled, each standalone statement is normally its own transaction unless an explicit transaction is started.

## 2. ACID in InnoDB

### Atomicity

[Undo log](/en/notes/database/MySQL/InnoDB/InnoDB%20undo%20log/) provides information needed to roll back changes and also supports older row versions used by MVCC.

### Durability

[Redo log](/en/notes/database/MySQL/InnoDB/InnoDB%20redo%20log/) implements write-ahead logging so committed changes can be recovered without flushing every modified data page at commit time.

### Isolation

Isolation is implemented by a combination of [MVCC](/en/notes/database/MySQL/InnoDB/InnoDB%20MVCC/) and locking.

## 3. Isolation Levels

- **Read Uncommitted**: ordinary reads may see uncommitted changes.
- **Read Committed**: each consistent read gets a view that can include transactions committed since the previous statement, so repeated reads may differ.
- **Repeatable Read**: InnoDB's default; consistent reads in one transaction normally reuse a stable read view, while locking/current reads use locks to protect the accessed ranges.
- **Serializable**: adds stronger locking semantics and reduces concurrency.

## 4. Phantom Reads in InnoDB

It is incomplete to say Repeatable Read “solves phantoms with gap locks” in every situation.

- non-locking **consistent reads** use MVCC and a stable snapshot;
- **locking reads and writes** use record/gap/next-key locking to constrain concurrent changes to searched ranges.

Always distinguish snapshot reads (`SELECT`) from current/locking reads (`SELECT ... FOR UPDATE`, updates, deletes) when analyzing anomalies.