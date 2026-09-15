---
title: "LSM Tree"
description: "Log-structured merge-tree write path, sorted runs, compaction, read/write amplification, and storage-engine trade-offs."
translationOf: "algorithm/数据结构/LSM"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

An LSM-tree buffers writes in memory and flushes immutable sorted runs/files to storage, then compacts/merges runs over time. This turns many random updates into sequential/batched writes.

Reads may consult several levels/files, usually accelerated by indexes and Bloom filters. Compaction reduces overlap/dead data but consumes I/O/CPU and creates write amplification.

LSM designs trade write throughput against read amplification, compaction cost, space amplification, and latency variance. Leveling/tiering policies choose different points in that trade-off.