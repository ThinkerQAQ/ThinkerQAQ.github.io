---
title: "2.1 Redis Bloom Filters"
description: "Bloom-filter semantics, false positives, Redis bitmap implementations, scaling, and RedisBloom/module alternatives."
translationOf: "redis-cache/使用/Redis BloomFilter"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. Bloom Filter Semantics

A Bloom filter is a probabilistic membership structure.

- "definitely not present" is reliable;
- "possibly present" can be a false positive;
- standard Bloom filters do not support arbitrary deletion safely.

Its value is memory efficiency when exact membership is unnecessary.

## 2. Building One with Redis Bitmaps

A client can hash each element with several hash functions and set corresponding bits in a Redis bitmap.

Lookup checks whether all required bits are set.

This design needs consistent hashing parameters and an expected capacity/false-positive target.

## 3. Growth

A fixed Bloom filter becomes less accurate as more elements are added. A scalable design can add additional filters as capacity is reached instead of simply growing one bitmap without recalculating parameters.

## 4. RedisBloom

Redis distributions/modules may provide native Bloom-filter commands that manage capacity, error rate, and scaling for you. Prefer a maintained implementation when available rather than reimplementing hashing/probability details in application code.

## 5. Common Uses

- cache-penetration protection;
- pre-checking whether IDs might exist;
- large-scale dedup hints.

Never treat a Bloom-filter positive as authoritative existence; confirm against the source of truth when correctness requires it.