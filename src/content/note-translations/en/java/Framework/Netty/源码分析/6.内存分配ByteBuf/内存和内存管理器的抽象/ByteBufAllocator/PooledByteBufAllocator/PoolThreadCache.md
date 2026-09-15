---
title: "Netty PoolThreadCache"
description: "Per-thread pooled buffer caching as an allocation optimization, with retention and event-loop affinity trade-offs."
translationOf: "java/Framework/Netty/源码分析/6.内存分配ByteBuf/内存和内存管理器的抽象/ByteBufAllocator/PooledByteBufAllocator/PoolThreadCache"
language: "en"
updatedAt: "2026-09-15T05:55:00Z"
---

Pool thread caches reduce synchronization/allocator work by keeping reusable memory entries close to allocation threads, especially long-lived event-loop threads.

Caching trades lower allocation latency for additional retained memory. Thread lifetime and allocation patterns therefore affect native-memory footprint.

Cache structure/size policies are version-specific. Diagnose with the allocator/JVM/process metrics for the exact deployment before tuning internal cache parameters.