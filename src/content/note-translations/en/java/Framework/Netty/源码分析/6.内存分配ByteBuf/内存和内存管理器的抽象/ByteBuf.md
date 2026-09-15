---
title: "Netty ByteBuf"
description: "Reader/writer indexes, heap/direct buffers, slicing, reference counting, and ownership rules."
translationOf: "java/Framework/Netty/源码分析/6.内存分配ByteBuf/内存和内存管理器的抽象/ByteBuf"
language: "en"
updatedAt: "2026-09-15T05:55:00Z"
---

`ByteBuf` is Netty's byte-storage abstraction. It maintains separate reader/writer indexes, supports relative/absolute operations, slicing/duplication, composite buffers, and heap/direct implementations.

Many Netty buffers are reference-counted. Derived views may share underlying storage, so ownership is not equivalent to Java object reachability. Code that takes ownership must eventually release according to the API contract; use retained variants when extending a shared buffer's lifetime.

Leaks are native/process-memory problems as well as correctness problems. Enable leak detection appropriately during development/testing.