---
title: "1.3 MySQL SQL Tuning"
description: "A measurement-first SQL tuning workflow covering slow-query identification, execution plans, indexing, query rewrites, pagination, and joins."
translationOf: "database/MySQL/MySQL SQL调优"
language: "en"
updatedAt: "2026-09-15T04:20:00Z"
---

## 1. Do Not Start from a Universal “Single-MySQL Limit”

A statement such as “3 million rows / 2,000 concurrent requests is the bottleneck” is not a meaningful MySQL capacity rule. Capacity depends on query shape, indexes, working-set size, hardware, storage latency, connection model, writes, locks, and durability settings.

Tune from measurements.

## 2. Workflow

### 2.1 Find Expensive Queries

Use the slow-query log, application traces, database metrics, and workload statistics to rank queries by total time, p95/p99 latency, rows examined, or resource cost.

### 2.2 Inspect the Plan

Use [EXPLAIN](/en/notes/database/MySQL/MySQL%20explain/) and, when safe, `EXPLAIN ANALYZE`.

Ask:

- how many rows are scanned?
- is the access path selective?
- are joins multiplying rows unexpectedly?
- is sorting/materialization expensive?
- are estimates wrong?

### 2.3 Fix Data Access

- add or reshape indexes that match important predicates and ordering;
- fetch only needed columns;
- reduce result-set size early;
- avoid N+1 request patterns at the application layer;
- split pathological queries only when that reduces real work.

## 3. Pagination

Large `OFFSET` pagination still makes the engine walk/discard earlier rows. For sequential navigation, **keyset/seek pagination** is usually better:

```sql
SELECT id, created_at, ...
FROM orders
WHERE (created_at, id) < (?, ?)
ORDER BY created_at DESC, id DESC
LIMIT 50;
```

It scales with page size instead of offset depth when supported by a matching index.

## 4. Joins

A join is not inherently slow. The key questions are whether the join predicates are indexed appropriately, whether the chosen order keeps intermediate cardinality small, and whether the algorithm/access path matches the data distribution.

Measure after every change; SQL tuning without workload evidence easily becomes cargo cult.