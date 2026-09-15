---
title: "MySQL Index Implementation"
description: "B+tree organization, clustered and secondary indexes, page locality, and lookup complexity."
translationOf: "database/MySQL/MySQL索引底层实现"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

InnoDB's common indexes are B+trees organized in pages. Internal nodes guide searches; leaf pages contain ordered entries and are linked for range traversal. High fan-out keeps tree height small for large datasets.

The clustered index stores rows at primary-key leaves, while secondary-index leaves reference primary-key values. Real lookup cost depends on cache locality, page reads, selectivity, covering behavior, and whether a secondary lookup must return to the clustered tree.