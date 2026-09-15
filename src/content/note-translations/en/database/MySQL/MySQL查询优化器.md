---
title: "1.5 MySQL Query Optimizer"
description: "Logical rewrites, cost-based physical planning, access paths, join ordering, statistics, optimizer trace, and execution-plan selection."
translationOf: "database/MySQL/MySQL查询优化器"
language: "en"
updatedAt: "2026-09-15T04:20:00Z"
---

## 1. What Does the Optimizer Do?

Many execution strategies can produce the same SQL result. The optimizer transforms and compares candidate plans, then chooses a plan estimated to have low execution cost.

## 2. Logical Optimization

Logical rewrites preserve query semantics while producing a form that can be planned more efficiently. Examples include:

- predicate simplification and propagation;
- outer-join simplification when semantics allow it;
- transforming some subqueries into semi-joins or materialized forms;
- removing redundant operations.

## 3. Physical / Cost-Based Optimization

The optimizer must choose:

- table access method: full scan, index lookup, range scan, etc.;
- which candidate index to use;
- join algorithm and join order;
- whether to materialize or merge intermediate results;
- whether ordering/grouping can be satisfied by an index.

Cost estimates depend heavily on **cardinality/statistics**. A logically good index may be ignored if the optimizer estimates that too many rows would be fetched through it.

## 4. Join Ordering

With many joined tables the theoretical number of orders grows rapidly, so optimizers use pruning and search heuristics rather than exhaustively running every plan.

## 5. Observing Decisions

[EXPLAIN](/en/notes/database/MySQL/MySQL%20explain/) shows the chosen plan. Optimizer trace can expose more of the candidate-plan reasoning and estimates used during optimization.

When a plan is unexpectedly poor, ask whether the issue is the SQL shape, missing index, stale/misleading statistics, data skew, or an optimizer limitation before forcing a plan.