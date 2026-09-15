---
title: "Garbage Collection"
description: "Tracing garbage collection, roots, reachability, copying/compaction, generations, concurrency, and runtime trade-offs."
translationOf: "garbage-collection/GC"
language: "en"
updatedAt: "2026-09-15T06:15:00Z"
---

Garbage collection automatically reclaims managed memory that is no longer reachable from the runtime's root set.

Tracing collectors typically identify live objects and reclaim, copy, or compact the rest. Generational designs exploit the fact that many objects die young, while concurrent collectors move more tracing/relocation work alongside application execution to reduce pause time.

There is no universally best GC design. Throughput, latency, memory overhead, fragmentation, allocation rate, and live-set size trade against each other.

GC manages memory, not arbitrary external resources. Files, sockets, locks, and transactions still need explicit lifecycle handling.