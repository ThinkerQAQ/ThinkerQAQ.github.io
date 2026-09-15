---
title: "Collections.synchronizedMap"
description: "Synchronized Map wrappers, compound-operation atomicity, iteration locking, and concurrent alternatives."
translationOf: "java/JDK/Map/SynchronizedMap"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`Collections.synchronizedMap(map)` serializes individual map operations on a wrapper mutex.

Compound logic such as “if absent, then put” still needs one synchronized critical section unless an atomic map operation is used. Iteration over views such as `keySet()` also requires the documented external synchronization.

For scalable shared access, `ConcurrentHashMap` normally provides a better concurrency model and atomic operations such as `computeIfAbsent`.