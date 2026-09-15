---
title: "MySQL Optimizer Statistics"
description: "Cardinality and distribution statistics used for cost-based query-plan selection."
translationOf: "database/MySQL/MySQL统计数据"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

The optimizer relies on table/index statistics to estimate row counts and selectivities. Bad or stale estimates can lead to an inefficient join order or access path even when suitable indexes exist.

Analyze the plan and estimated versus actual rows before forcing hints. Refresh/update statistics where appropriate, and use histogram/statistics features when skewed distributions make simple cardinality estimates insufficient.