---
title: "1.31 InnoDB Redo Log"
description: "InnoDB write-ahead logging, redo buffering, fsync policy, group commit, crash recovery, and the relationship between redo log and binlog."
translationOf: "database/MySQL/InnoDB/InnoDB redo log"
language: "en"
updatedAt: "2026-09-15T04:20:00Z"
---

## 1. What Is the Redo Log?

InnoDB redo records physical/logical-physical changes needed to recover modified pages after a crash. It is central to durability and crash recovery.

## 2. Why WAL?

Flushing every dirty data page before acknowledging each commit would turn random page writes into the transaction's critical path. Write-Ahead Logging instead makes the durable log the commit prerequisite; dirty pages can be flushed later.

**WAL rule:** the redo required to recover a page change must reach durable storage before the corresponding dirty page is allowed to reach disk in a way that depends on that redo.

## 3. Redo Buffer and Disk Log

Transactions generate redo into memory. Redo is then written and, depending on policy, flushed (`fsync`) to the redo log files.

`innodb_flush_log_at_trx_commit` controls the commit-time durability trade-off:

- `1`: write and flush at commit for strongest single-server durability;
- `2`: write at commit, flushing by the OS/background cadence;
- `0`: defer both write/flush from the transaction's perspective.

Exact loss windows also depend on OS/storage behavior.

## 4. Group Commit

Multiple concurrent transactions can share expensive flush operations. Group commit amortizes `fsync` cost while preserving ordering constraints between redo and binlog.

## 5. Redo Log vs. Binlog

| | Redo | Binlog |
| --- | --- | --- |
| Layer | InnoDB | MySQL server |
| Primary role | crash recovery / durability | replication, PITR, change history |
| Storage model | bounded log space reused over time | files appended/rotated |

MySQL coordinates InnoDB redo and server binlog during commit so crash recovery does not leave a transaction committed in one history but absent from the other.