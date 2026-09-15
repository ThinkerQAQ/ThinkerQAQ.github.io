---
title: "MySQL Storage Engines"
description: "The storage-engine abstraction and why InnoDB is the normal transactional choice."
translationOf: "database/MySQL/MySQL存储引擎"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

MySQL separates the SQL/server layer from pluggable storage engines. The engine owns physical row/index storage and much of transaction, locking, and recovery behavior.

InnoDB is the standard choice for transactional applications because it provides MVCC, crash recovery, row/range locking, foreign keys, and durable transactions. Engine comparisons should be based on required semantics and supported versions rather than old feature matrices.