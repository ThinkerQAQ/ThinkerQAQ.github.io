---
title: "3.4 Redis Latency and Blocking"
description: "A production-oriented guide to Redis stalls caused by slow commands, big keys, CPU saturation, persistence/fork, memory pressure, swap, networking, and client backpressure."
translationOf: "redis-cache/线程模型/Redis阻塞"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. What Does Redis 'Blocking' Mean?

Operationally, Redis is blocking when client latency rises because the server cannot make timely progress on requests.

One important cause is serialized command execution: a long command can delay later commands on the same shard. But not every Redis stall is caused by command execution alone.

## 2. Internal Causes

### Slow / High-Complexity Commands

Large collection scans, big-key operations, long Lua scripts/functions, or huge multi-key commands can monopolize the command path.

Use slow logs and latency tooling to identify them.

### Hot Keys / CPU Saturation

A single shard/core can saturate even when the machine has unused cores. Shard the workload or redesign hot keys rather than merely increasing machine-wide CPU count.

### Persistence and Fork/COW

RDB snapshots and AOF rewrite can incur fork latency and copy-on-write memory pressure. Storage latency can also affect AOF fsync behavior.

### Memory Pressure

Allocator churn, page faults, transparent huge pages/configuration interactions, and especially swapping can create severe tail latency.

## 3. External Causes

- network packet loss or congestion;
- client connection-pool exhaustion;
- output-buffer growth from slow consumers;
- file-descriptor/backlog limits;
- noisy-neighbor CPU or storage contention.

## 4. Diagnosis

Correlate multiple signals:

- application timeout rate;
- Redis command latency/slow log;
- CPU per core;
- network throughput/retransmissions;
- disk/fsync latency;
- fork duration;
- memory/RSS/swap;
- connected clients and output-buffer usage.

Do not diagnose Redis from CPU alone.

## 5. Prevention

- keep commands bounded;
- split big keys;
- batch with sensible pipeline limits;
- isolate persistence/storage contention;
- maintain memory headroom;
- shard genuine single-instance bottlenecks;
- enforce client timeouts and backpressure.