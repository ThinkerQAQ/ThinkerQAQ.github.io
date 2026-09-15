---
title: "1.13 MySQL Binary Log"
description: "MySQL server-level change logging for replication and point-in-time recovery, including statement/row formats, durability policy, and its distinction from InnoDB redo."
translationOf: "database/MySQL/MySQL bin-log"
language: "en"
updatedAt: "2026-09-15T04:20:00Z"
---

## 1. What Is the Binary Log?

The MySQL binary log is a server-layer log of database-changing events. It is independent of InnoDB's storage-engine redo log.

Major uses:

- replication;
- point-in-time recovery after restoring a base backup;
- change-data capture and auditing pipelines when appropriate.

## 2. Binlog Formats

### 2.1 Statement

Records SQL statements. It can be compact, but nondeterministic statements or context-dependent behavior make safe replay harder.

### 2.2 Row

Records row-level change events. It is usually more deterministic for replication/change capture, but can generate much more log data for large modifications.

### 2.3 Mixed

Allows the server to choose between statement and row representation based on the operation.

## 3. Write and Flush

During a transaction, binlog events are buffered and become part of commit processing. `sync_binlog` controls how often MySQL asks the OS to flush binlog data to durable storage.

A durability configuration is meaningful only together with storage guarantees and InnoDB settings such as `innodb_flush_log_at_trx_commit`.

## 4. Binlog vs. Redo

[Redo log](/en/notes/database/MySQL/InnoDB/InnoDB%20redo%20log/) exists primarily so InnoDB can recover its physical state after a crash. Binlog represents the server's logical change history for replication/PITR.

MySQL coordinates the two histories during transaction commit so a crash does not leave replication history inconsistent with InnoDB's committed transaction state.