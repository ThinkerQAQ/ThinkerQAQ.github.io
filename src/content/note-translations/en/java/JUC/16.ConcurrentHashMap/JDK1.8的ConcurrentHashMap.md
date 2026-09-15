---
title: "6.16 ConcurrentHashMap in JDK 8"
description: "Historical JDK 8 ConcurrentHashMap design: CAS insertion, bin synchronization, tree bins, cooperative resizing, and stable public semantics."
translationOf: "java/JUC/16.ConcurrentHashMap/JDK1.8的ConcurrentHashMap"
language: "en"
updatedAt: "2026-09-15T04:40:00Z"
---

## 1. Historical Context

JDK 8 removed the JDK 7 `Segment` structure. The implementation moved toward a single table whose bins are updated with a mixture of CAS and synchronization.

These details explain an important implementation generation; they are not a contract that application code should rely on forever.

## 2. Reads

Ordinary `get` operations are designed to proceed without acquiring a global lock. Readers traverse safely published nodes in the selected bin.

The map does not lock the entire table for every operation.

## 3. Writes

At a high level in JDK 8:

- an empty bin may be initialized with CAS;
- updates to a populated bin synchronize on a bin-level node/structure;
- heavily collided bins may be transformed into tree bins once implementation thresholds and table-size conditions are met.

This narrows contention compared with a single map-wide lock.

## 4. Resizing

Resizing uses forwarding markers and allows threads encountering a resize to participate in transferring bins. The exact control fields and transfer algorithm are implementation details and have evolved across JDK releases.

## 5. Atomic Compound Operations

`ConcurrentHashMap` provides atomic map-level operations such as `putIfAbsent`, `compute`, `computeIfAbsent`, `merge`, and conditional `replace/remove`.

Prefer these operations over a check-then-act sequence such as:

```java
if (!map.containsKey(key)) {
    map.put(key, value);
}
```

because the two calls are not one atomic operation.

## 6. Stable Takeaway

Depend on the documented concurrent-map semantics. Use the JDK 8 CAS/bin-lock/tree-bin model to understand performance and evolution, not as a permanent API guarantee.