---
title: "1.7 MySQL Locks"
description: "MySQL and InnoDB locking from global/metadata locks to record, gap, and next-key locks, plus how access paths determine lock scope."
translationOf: "database/MySQL/MySQL锁"
language: "en"
updatedAt: "2026-09-15T04:20:00Z"
---

## 1. Locking Layers

MySQL exposes locking at several scopes. The exact locks depend on the statement, storage engine, isolation level, indexes, and access path.

## 2. Global and Metadata Locks

### 2.1 Global Read Lock

`FLUSH TABLES WITH READ LOCK` can place the server in a broad read-only state and has historically been used for some backup workflows. Transactional consistent snapshots are usually preferable for InnoDB when they meet the backup requirement.

### 2.2 Metadata Locks (MDL)

DML and queries acquire metadata locks that protect a table's definition while it is in use. DDL requires incompatible metadata access, so a long transaction can make an `ALTER TABLE` wait and the resulting wait queue can become an operational incident.

Online-schema-change tools reduce long blocking phases but still need a safe cutover.

## 3. InnoDB Row-Level Locking

### 3.1 Record Lock

Locks an index record.

### 3.2 Gap Lock

Locks a gap between index records to constrain inserts into that range. Gap locks are used in InnoDB's locking behavior under Repeatable Read to prevent certain phantom-producing changes.

### 3.3 Next-Key Lock

Combines a record lock with an adjacent gap lock, protecting both an index record and a range around it.

## 4. Access Path Determines Lock Footprint

InnoDB row locks are fundamentally locks on index records/ranges. If a statement cannot use a selective index, it may scan and lock many records or ranges. This can appear operationally like “the whole table is locked,” but it is not a generic row-lock-to-table-lock escalation rule.

## 5. Practical Rules

- keep transactions short;
- use selective indexes for locking updates;
- acquire resources in a consistent order to reduce deadlocks;
- inspect deadlock reports rather than assuming which statement “won”;
- distinguish snapshot reads from locking/current reads when reasoning about isolation.