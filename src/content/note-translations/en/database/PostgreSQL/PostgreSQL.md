---
title: "PostgreSQL Overview"
description: "PostgreSQL's relational engine, MVCC, WAL, extensibility, indexes, and operational model."
translationOf: "database/PostgreSQL/PostgreSQL"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

PostgreSQL is a transactional relational database with MVCC, write-ahead logging, multiple index types, rich SQL, and a highly extensible type/function/operator system.

Its concurrency/storage model differs from InnoDB in important details, especially row versions, vacuum, visibility, and index/table organization. Transfer relational concepts between databases, but verify engine-specific implementation assumptions before tuning.