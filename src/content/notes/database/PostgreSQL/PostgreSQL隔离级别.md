---
title: "2.1 PostgreSQL隔离级别"
description: "1. 实现 PostgreSQL中根据获取快照时机的不同实现了不同的数据库隔离级别（对应代码中函数GetTransactionSnapshot）： - Read UnCommited/Read Commited：每个query都会获取最新的快照CurrentSnapshotData - Repeta"
sourcePath: "Database/PostgreSQL/PostgreSQL隔离级别.md"
category: "database"
categoryLabel: "Database"
topic: "PostgreSQL"
topicLabel: "2.PostgreSQL"
order: 40
tags: ["Database"]
createdAt: "2020-02-02T08:31:14Z"
updatedAt: "2021-05-09T03:42:16Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 实现

PostgreSQL中根据获取快照时机的不同实现了不同的数据库隔离级别（对应代码中函数GetTransactionSnapshot）：

- Read UnCommited/Read Commited：每个query都会获取最新的快照CurrentSnapshotData
- Repetable Read：所有的query 获取相同的快照都为第1个query获取的快照FirstXactSnapshot
- Serializable：使用锁系统来实现

> 2026 注：PostgreSQL 的 `READ UNCOMMITTED` 实际按 `READ COMMITTED` 处理；Serializable 也不只是普通锁，而是通过 Serializable Snapshot Isolation（SSI）并结合 predicate locking 检测可能破坏串行化的依赖。
