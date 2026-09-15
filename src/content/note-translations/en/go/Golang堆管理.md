---
title: "Go Heap Management"
description: "Go runtime heap allocation, size classes, spans, per-P caches, sweeping, and GC interaction."
translationOf: "go/Golang堆管理"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

Go's runtime manages heap allocations with size classes, spans/pages, central structures, and per-P caches so many small allocations avoid a global lock. Exact allocator internals are runtime-version specific.

Allocation rate matters because it drives garbage-collection work and memory footprint. Reduce unnecessary allocations only after profiling; stack allocation, object reuse, batching, and representation changes can help, but manual pooling can also increase retention and complexity.