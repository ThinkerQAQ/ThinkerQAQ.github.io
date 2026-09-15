---
title: "MySQL Table Access Methods"
description: "Full scans, index scans, range access, point lookup, ref access, and plan-dependent row retrieval."
translationOf: "database/MySQL/MySQL表访问方法"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

A query plan can retrieve rows through a full table/index scan, point lookup, range scan, ref-style indexed lookup, or other optimizer-selected access methods. The `type`/access information in `EXPLAIN` is a clue, not a complete performance verdict.

Judge an access path together with estimated/actual rows, predicates, ordering, covering behavior, joins, and data distribution. A full scan can be correct for a small table or low-selectivity query.