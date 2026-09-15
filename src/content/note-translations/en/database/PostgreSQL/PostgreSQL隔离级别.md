---
title: "PostgreSQL Isolation Levels"
description: "Read Committed, Repeatable Read, Serializable, snapshots, and serialization failures."
translationOf: "database/PostgreSQL/PostgreSQL隔离级别"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

PostgreSQL supports Read Committed, Repeatable Read, and Serializable semantics; `READ UNCOMMITTED` is treated as Read Committed. Read Committed takes a new statement snapshot, while Repeatable Read keeps a stable transaction snapshot.

Serializable adds protection against serialization anomalies using PostgreSQL's serializable implementation and may abort transactions that must be retried. Isolation does not remove application-level uniqueness/invariant design; use constraints and retry-safe transaction logic.