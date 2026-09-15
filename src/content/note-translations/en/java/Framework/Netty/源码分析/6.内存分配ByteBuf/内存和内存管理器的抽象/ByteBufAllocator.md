---
title: "Netty ByteBufAllocator"
description: "Allocator abstraction for heap/direct, pooled/unpooled buffers and why allocation strategy is configurable."
translationOf: "java/Framework/Netty/源码分析/6.内存分配ByteBuf/内存和内存管理器的抽象/ByteBufAllocator"
language: "en"
updatedAt: "2026-09-15T05:55:00Z"
---

`ByteBufAllocator` centralizes allocation of byte buffers so handlers do not hard-code one storage strategy. Allocators can return heap or direct buffers and can use pooling.

This abstraction allows transport/framework configuration to choose allocation behavior while application codecs request buffers by capacity/usage intent.

Direct and pooled buffers can improve high-throughput workloads but add native-memory/reference-counting complexity. Measure memory/CPU/latency and respect ownership rather than assuming one allocator is always best.