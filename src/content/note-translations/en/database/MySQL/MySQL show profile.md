---
title: "MySQL SHOW PROFILE"
description: "Historical per-query profiling and modern alternatives for diagnosing query execution."
translationOf: "database/MySQL/MySQL show profile"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

`SHOW PROFILE`/`SHOW PROFILES` were historical MySQL profiling commands and should not be the default basis for modern diagnosis. Use `EXPLAIN`/`EXPLAIN ANALYZE` where supported, the Performance Schema, statement summaries, slow-query logs, and system metrics.

The important workflow is to identify where time or rows are spent, verify the execution plan against real cardinalities, and correlate SQL behavior with CPU, I/O, locks, and downstream resource pressure.