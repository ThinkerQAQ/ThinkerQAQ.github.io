---
title: "LinkedHashMap"
description: "Insertion/access-order HashMap with a linked iteration order and the basis of simple LRU-style maps."
translationOf: "java/JDK/Map/LinkedHashMap"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`LinkedHashMap` combines hash-based lookup with a linked ordering of entries.

It can maintain insertion order or access order. Access-order mode plus `removeEldestEntry` can implement a small simple LRU-style map, but this is not automatically a production cache: it lacks built-in concurrency, expiration, size-by-weight, loading, and observability features.

Iteration follows the maintained linked order. The collection itself is not thread-safe without external coordination.