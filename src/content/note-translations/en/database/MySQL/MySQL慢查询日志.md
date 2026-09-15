---
title: "MySQL Slow Query Log"
description: "Capturing expensive statements for plan analysis and workload prioritization."
translationOf: "database/MySQL/MySQL慢查询日志"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

The slow query log records statements that meet configured timing/inspection criteria and is useful for finding expensive recurring queries. Aggregate by normalized query shape so one hot pattern is not hidden behind many literal variants.

Execution time alone is not enough: inspect rows examined/sent, lock time, frequency, and total resource contribution. Then validate candidates with execution plans and representative data before changing indexes or SQL.