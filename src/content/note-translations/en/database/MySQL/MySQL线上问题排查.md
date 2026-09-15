---
title: "Diagnosing MySQL Production Problems"
description: "A symptom-first workflow for latency, CPU, I/O, locks, connections, replication, and query-plan regressions."
translationOf: "database/MySQL/MySQL线上问题排查"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

Start from the user-visible symptom and time window, then correlate database metrics with workload changes. Check active connections/threads, query latency and errors, CPU, disk latency/IOPS, buffer-pool pressure, locks/deadlocks, redo/checkpoint state, and replica lag.

Use slow-query/performance-schema evidence to identify statement patterns and compare execution plans/cardinality estimates. Avoid making several tuning changes before establishing the bottleneck.