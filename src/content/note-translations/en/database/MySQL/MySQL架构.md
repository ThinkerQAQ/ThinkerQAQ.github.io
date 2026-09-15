---
title: "1.14 MySQL Architecture"
description: "The path from a client connection through parsing, optimization, execution, and the storage-engine interface."
translationOf: "database/MySQL/MySQL架构"
language: "en"
updatedAt: "2026-09-15T04:20:00Z"
---

## 1. Logical Architecture

![MySQL logical architecture](https://raw.githubusercontent.com/TDoct/images/master/1626576661_20210717234718525_26845.png)

A simplified query path is:

1. a client establishes a connection and sends SQL;
2. the server parses and validates the statement;
3. the optimizer explores candidate access paths and join orders and chooses an execution plan;
4. the executor runs that plan through storage-engine APIs;
5. rows are returned to the client.

## 2. Server Layer

The MySQL server layer owns concerns shared across storage engines, including connection/session handling, SQL parsing, optimization, execution orchestration, privilege checks, and the binary log.

### 2.1 Parser

Builds and validates the SQL representation used by later stages.

### 2.2 Query Optimizer

Chooses access methods, indexes, join order, and physical operators using rules, statistics, and cost estimates.

[Query Optimizer](/en/notes/database/MySQL/MySQL%E6%9F%A5%E8%AF%A2%E4%BC%98%E5%8C%96%E5%99%A8/)

### 2.3 Executor

Drives the chosen plan and asks the storage engine to read or modify rows.

## 3. Storage-Engine Layer

Storage engines implement physical data/index storage, locking and transaction behavior specific to the engine. InnoDB is the default general-purpose transactional engine in modern MySQL.

The server/storage-engine boundary is why MySQL has both server-level facilities such as binlog and InnoDB-specific facilities such as redo log, undo log, MVCC, and the buffer pool.