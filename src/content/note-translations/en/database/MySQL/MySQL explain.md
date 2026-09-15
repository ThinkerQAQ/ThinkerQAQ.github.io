---
title: "1.1 MySQL EXPLAIN"
description: "A practical guide to reading MySQL execution plans: access type, chosen indexes, row estimates, join order, covering access, filesort, temporary work, and EXPLAIN ANALYZE."
translationOf: "database/MySQL/MySQL explain"
language: "en"
updatedAt: "2026-09-15T04:20:00Z"
---

## 1. What Is EXPLAIN?

`EXPLAIN` shows how MySQL plans to execute a statement. Use it to understand access paths and estimates before guessing at SQL optimizations.

For supported MySQL versions, `EXPLAIN ANALYZE` executes the query and reports actual timing/row information, making estimate errors easier to identify.

## 2. Fields to Read First

### `table`

The table or derived result being accessed at this plan step.

### `type`

The access method. Common values include `const`, `eq_ref`, `ref`, `range`, `index`, and `ALL`.

Do not optimize by ranking `type` values mechanically; interpret them together with estimated/actual row counts and total work.

### `possible_keys`

Indexes the optimizer considered potentially usable.

### `key`

The index actually selected.

### `key_len`

How much of the index key can participate in the access condition. It is not a generic “smaller is always better” metric.

### `rows`

Estimated rows examined at the step. Large estimate errors often point to statistics, skew, or predicate-correlation problems.

### `Extra`

Useful flags include:

- `Using index`: required columns can be served from the index in this context;
- `Using index condition`: index condition pushdown is being applied;
- `Using filesort`: MySQL needs an explicit sort rather than obtaining order directly from an index;
- `Using temporary`: an intermediate temporary table is required for the chosen plan.

“Filesort” does not necessarily mean disk I/O; it means the result needs an explicit sort operation.

## 3. Diagnostic Workflow

1. identify the largest/most expensive plan steps;
2. verify join order and access predicates;
3. check whether an index is both available and selective enough;
4. compare estimated rows with actual rows using `EXPLAIN ANALYZE` when safe;
5. change one thing—SQL shape, index, or statistics—and measure again.