---
title: "3.6 Redis Hot Keys"
description: "How one disproportionately popular key overloads a Redis shard, how to detect it, and strategies such as local caches, replica reads, key replication, request coalescing, and data-model changes."
translationOf: "redis-cache/线程模型/Redis hotkey"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. What Is a Hot Key?

A hot key receives a disproportionate share of reads or writes relative to the rest of the dataset.

There is no universal threshold such as "10,000 QPS." A key is hot when its traffic becomes a bottleneck for the owning shard, network path, client pool, or downstream dependency.

## 2. Why Sharding Does Not Automatically Fix It

A single key hashes to one slot/shard. Adding more cluster nodes distributes other keys but does not split operations on that one key.

## 3. Detecting Hot Keys

Useful signals include:

- application per-key metrics/sampling;
- proxy metrics;
- managed Redis hot-key analytics;
- CPU/network asymmetry between shards;
- command latency and access-frequency tooling.

Avoid full-keyspace instrumentation if its overhead exceeds the problem you are measuring.

## 4. Read-Hot Keys

Options include:

- local in-process cache with bounded TTL;
- CDN/edge cache for HTTP-visible data;
- duplicate/sharded cache keys when stale replication is acceptable;
- replica reads when the consistency model allows them;
- request coalescing/singleflight so many misses cause one backend fetch.

## 5. Write-Hot Keys

Write hotspots are harder because duplicating the key creates a consistency problem.

Possible redesigns:

- shard counters and aggregate later;
- append events rather than rewriting one aggregate;
- batch writes;
- partition by user/object/time bucket;
- move the invariant to a system designed for the required write concurrency.

## 6. Key Principle

A hot key is usually a **data-model hotspot**, not merely a Redis tuning issue. The strongest fix changes how traffic/state is partitioned.