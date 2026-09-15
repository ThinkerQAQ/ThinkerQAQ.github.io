---
title: "InnoDB Overview"
description: "Transactional MySQL storage with clustered indexes, MVCC, redo/undo, locking, and buffer-pool caching."
translationOf: "database/MySQL/InnoDB/MySQL InnoDB"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

InnoDB is MySQL's primary transactional storage engine. Its major building blocks include clustered/secondary B+tree indexes, the buffer pool, redo and undo logs, MVCC, row/range locking, and crash recovery.

Transactions and concurrency behavior come from the interaction of isolation level, access path, MVCC snapshots, and locks—not from a single “row lock” rule. Performance is similarly shaped by working-set locality, index design, query plans, flushing, and storage latency.