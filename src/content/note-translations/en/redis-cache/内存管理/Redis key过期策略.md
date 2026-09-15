---
title: "5.1 Redis Key Expiration"
description: "TTL semantics and Redis's combined passive and active expiration strategy, without depending on historical sampling constants."
translationOf: "redis-cache/内存管理/Redis key过期策略"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. TTL Semantics

Redis can attach an expiration time to a key. Commands such as `EXPIRE`, `PEXPIRE`, and absolute-expiry variants define when the key becomes logically expired; `PERSIST` removes the TTL.

Expiration metadata follows documented key operations—for example, many in-place value updates preserve the TTL while replacing/deleting/renaming keys can have different effects.

## 2. Passive Expiration

When Redis accesses a key that is already expired, it treats the key as absent and can delete it.

Passive deletion alone is insufficient because an expired key that is never read could occupy memory indefinitely.

## 3. Active Expiration

Redis also runs active expiration work that samples TTL-bearing keys and removes expired ones within a CPU-time budget.

Older explanations often quote exact constants such as "20 sampled keys, 10 times per second, repeat above 25%." Those details have changed across Redis versions and configurations. The stable idea is:

1. sample keys that have expirations;
2. delete expired keys;
3. spend more effort when the sample indicates many expired keys remain;
4. stop/budget work to avoid monopolizing the server.

## 4. Important Consequence

A TTL is a logical validity boundary, not a promise that physical memory is reclaimed at the exact millisecond. Expired keys are no longer valid for reads, while actual cleanup may be performed lazily or by active expiration work.

## 5. Cache Design

Add TTL jitter when many keys would otherwise expire at exactly the same time. This reduces synchronized cache misses and origin load spikes.