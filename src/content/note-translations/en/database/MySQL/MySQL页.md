---
title: "InnoDB Pages"
description: "Page-based B+tree storage, records, free space, page splits, and locality."
translationOf: "database/MySQL/MySQL页"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

InnoDB stores indexes and rows in fixed-size pages. B+tree pages hold records plus metadata and free-space structures; adjacent logical key ranges are connected through the tree/leaf-page organization.

Insert patterns influence locality and page splits. A monotonic primary key often produces predictable append-like behavior, while random keys can create more scattered page activity. The impact still depends on workload, cache, page fill, and storage.