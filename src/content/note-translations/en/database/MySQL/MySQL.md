---
title: "1. MySQL"
description: "A map of the MySQL notes: architecture, storage engines, indexing, transactions, replication, diagnostics, and performance work."
translationOf: "database/MySQL/MySQL"
language: "en"
updatedAt: "2026-09-15T04:20:00Z"
---

## 1. MySQL Architecture

- [MySQL Architecture](/en/notes/database/MySQL/MySQL%E6%9E%B6%E6%9E%84/)
- Storage engines and InnoDB internals

## 2. Data Access and Performance

- [MySQL Indexes](/en/notes/database/MySQL/MySQL%E7%B4%A2%E5%BC%95/)
- [Query Optimizer](/en/notes/database/MySQL/MySQL%E6%9F%A5%E8%AF%A2%E4%BC%98%E5%8C%96%E5%99%A8/)
- [EXPLAIN](/en/notes/database/MySQL/MySQL%20explain/)
- [SQL Tuning](/en/notes/database/MySQL/MySQL%20SQL%E8%B0%83%E4%BC%98/)

## 3. Transactions and Concurrency

- [InnoDB Transactions](/en/notes/database/MySQL/InnoDB/InnoDB%E4%BA%8B%E5%8A%A1/)
- [MVCC](/en/notes/database/MySQL/InnoDB/InnoDB%20MVCC/)
- [MySQL Locks](/en/notes/database/MySQL/MySQL%E9%94%81/)
- [Redo Log](/en/notes/database/MySQL/InnoDB/InnoDB%20redo%20log/)
- [Undo Log](/en/notes/database/MySQL/InnoDB/InnoDB%20undo%20log/)

## 4. Replication and Recovery

- [Binary Log](/en/notes/database/MySQL/MySQL%20bin-log/)
- [Primary-Replica Replication](/en/notes/database/MySQL/MySQL%E4%B8%BB%E4%BB%8E%E5%A4%8D%E5%88%B6/)

These notes focus on the parts of MySQL that matter most for backend engineering: how a query becomes an execution plan, how InnoDB stores and coordinates data, and how durability and replication interact.