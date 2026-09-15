---
title: "Redis Benchmarking"
description: "How to benchmark Redis without confusing synthetic command throughput with application capacity, including concurrency, payloads, pipelines, latency percentiles, and hot-key effects."
translationOf: "redis-cache/Redis压测"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. `redis-benchmark`

Redis ships a benchmark utility useful for quick synthetic tests.

But a headline requests/second number is meaningful only with its configuration:

- command mix;
- key distribution;
- payload size;
- client concurrency;
- pipeline depth;
- network placement;
- TLS;
- persistence;
- cluster topology.

## 2. Measure Latency, Not Only Throughput

Track p50/p95/p99/p999 latency while increasing offered load. The sustainable capacity point is before tail latency and timeout/error rate become unacceptable.

## 3. Match Production

A real cache workload may contain:

- high hit-rate GETs;
- large values;
- hot keys;
- expirations/evictions;
- Lua scripts;
- replication and persistence.

Benchmark those patterns rather than only tiny `SET`/`GET` commands on localhost.

## 4. Avoid Benchmark Artifacts

Pipelining can produce spectacular throughput while changing request concurrency and batching semantics. Report whether pipelines were used.

Also monitor server CPU per core, memory, network, fork/fsync behavior, and client bottlenecks so you know what resource actually saturated.