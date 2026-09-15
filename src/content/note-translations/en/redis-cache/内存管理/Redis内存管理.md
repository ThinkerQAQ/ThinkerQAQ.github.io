---
title: "5.2 Redis Memory Management"
description: "How Redis memory is consumed, why RSS differs from logical dataset memory, fragmentation and allocator effects, maxmemory, expiry, eviction, and practical observability."
translationOf: "redis-cache/内存管理/Redis内存管理"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. Where Redis Memory Goes

Redis memory is not only `sizeof(key) + sizeof(value)`.

Important components include:

- dataset objects and metadata;
- allocator overhead and fragmentation;
- client input/output buffers;
- replication backlog and replica buffers;
- AOF/persistence buffers;
- module/runtime structures.

`INFO memory` exposes useful metrics such as logical memory usage, RSS, allocator statistics, and fragmentation indicators.

## 2. `used_memory` vs. RSS

`used_memory` represents memory Redis accounts for through its allocator and data structures.

RSS is the resident memory reported by the operating system. The two can differ because of:

- allocator fragmentation;
- copy-on-write pages during fork-based persistence;
- pages retained by the allocator;
- shared mappings;
- pages reclaimed or swapped by the OS.

Therefore, `RSS - used_memory` is not a precise universal definition of "fragmentation."

## 3. `maxmemory`

`maxmemory` limits the memory Redis intends to use for the configured policy domain. When a write would exceed the limit, Redis applies the configured eviction policy or rejects the command.

Leave operational headroom for memory not fully controlled by `maxmemory`, including replication/persistence overhead and process/allocator behavior.

## 4. Expiry and Eviction Are Different

- **expiry** removes keys whose TTL has elapsed;
- **eviction** removes keys under memory pressure according to `maxmemory-policy`.

A cache design often uses both.

## 5. Operational Guidance

Monitor:

- `used_memory` and RSS;
- fragmentation/allocator metrics;
- evictions;
- expired-key rate;
- client buffer growth;
- replication backlog;
- fork/COW impact;
- swap activity.

Avoid swap-heavy Redis instances: low-latency assumptions deteriorate rapidly when hot pages are repeatedly faulted from disk.