---
title: "Elasticsearch Performance Tuning"
description: "A workload-first approach to shard sizing, mappings, refresh, indexing, queries, caches, merges, and JVM/storage capacity."
translationOf: "elasticsearch-search/Elasticsearch优化"
language: "en"
updatedAt: "2026-09-15T06:05:00Z"
---

Start with workload evidence: indexing rate, query mix, latency percentiles, shard sizes/counts, heap pressure, disk I/O, merge time, cache behavior, and thread-pool rejections.

Common high-impact choices are appropriate shard count/size, correct field mappings, avoiding unnecessary analyzed/indexed fields, bulk indexing, sensible refresh frequency, query/filter design, and lifecycle rollover/retention.

More shards are not automatically faster; tiny shards add metadata/scheduling overhead, while very large shards can slow recovery. Tune JVM/storage only after fixing data-model/query/index architecture.