---
title: "PostgreSQL EXPLAIN"
description: "Reading scan, join, sort, aggregate, estimate, and runtime information from PostgreSQL plans."
translationOf: "database/PostgreSQL/PostgreSQL explain"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

`EXPLAIN` shows the planner's chosen operator tree and cost/cardinality estimates. `EXPLAIN ANALYZE` executes the statement and adds actual timing/row/loop information, so use it carefully for writes or expensive production queries.

Focus on where estimated and actual rows diverge, repeated loops, scan type, join algorithm, sort/hash memory/spill behavior, and buffers/I/O where available. Cost numbers are planner units, not milliseconds.