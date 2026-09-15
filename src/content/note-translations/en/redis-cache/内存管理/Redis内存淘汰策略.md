---
title: "5.3 Redis Eviction Policies"
description: "Redis maxmemory eviction policies including noeviction, LRU, LFU, random, TTL-focused policies, and how to choose among allkeys and volatile variants."
translationOf: "redis-cache/内存管理/Redis内存淘汰策略"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. When Eviction Happens

If Redis is configured with `maxmemory` and a write would exceed the limit, Redis follows `maxmemory-policy` to free space or reject the operation.

Eviction is driven by memory pressure; it is different from TTL expiration.

## 2. Policy Families

### `noeviction`

Do not evict keys to make room. Writes that require additional memory fail once the limit cannot be satisfied. This is appropriate when silent cache-style data loss is unacceptable.

### `allkeys-lru` / `volatile-lru`

Approximate least-recently-used eviction across all keys or only keys with TTLs.

### `allkeys-lfu` / `volatile-lfu`

Approximate least-frequently-used eviction. Useful when a relatively stable hot set should survive short-term scans.

### `allkeys-random` / `volatile-random`

Evict randomly from the eligible set.

### `volatile-ttl`

Prefer keys with shorter remaining TTL among expiring keys.

## 3. Redis Uses Approximation

Redis does not maintain a perfect global LRU linked list. It uses compact metadata and sampling/approximation so eviction bookkeeping does not become more expensive than the cache itself.

Exact algorithms and sampling details are version/configuration sensitive.

## 4. Choosing a Policy

For a Redis instance used purely as a cache, `allkeys-lru` or `allkeys-lfu` are common starting points.

For a mixed instance where some keys must never be automatically evicted, volatile policies can make only TTL-bearing keys eligible—but separating workloads into different instances is often easier to reason about.

## 5. Measure the Result

Monitor eviction rate, hit ratio, latency, memory headroom, and origin load. A policy that maximizes cache hit ratio can still be operationally wrong if it causes stampedes or protects very large hot objects at excessive memory cost.