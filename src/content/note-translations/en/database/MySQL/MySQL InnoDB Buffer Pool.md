---
title: "MySQL InnoDB Buffer Pool"
description: "Caching InnoDB data and index pages, dirty-page management, eviction, and working-set behavior."
translationOf: "database/MySQL/MySQL InnoDB Buffer Pool"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

The InnoDB buffer pool caches data/index pages in memory so reads and writes do not require synchronous disk access for every operation. Modified pages become dirty and are flushed later according to checkpoint and background policies.

A high hit ratio is useful but not sufficient by itself: query plans, dirty-page pressure, eviction churn, redo pressure, and storage latency still matter. Size the buffer pool from the database working set and total host memory rather than a universal percentage.