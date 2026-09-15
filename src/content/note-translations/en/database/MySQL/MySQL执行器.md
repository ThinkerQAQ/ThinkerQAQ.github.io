---
title: "MySQL Query Executor"
description: "Executing an optimizer-selected plan through iterators/operators and storage-engine row access."
translationOf: "database/MySQL/MySQL执行器"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

After optimization, the executor runs the chosen plan and requests rows through access methods exposed by the storage engine. Operators perform scans/lookups, joins, filtering, sorting, grouping, and projection as required by the plan.

Execution cost depends on actual cardinalities, cache state, I/O, CPU, locks, and data distribution. `EXPLAIN ANALYZE`-style runtime measurements are valuable when estimates and reality diverge.