---
title: "Java Atomic Variables"
description: "AtomicInteger/Long/Reference, CAS-based read-modify-write, accumulators/adders, atomic references, memory semantics, and contention trade-offs."
translationOf: "java/JUC/4.CAS/Atomic/Atomic"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

## 1. Purpose

`java.util.concurrent.atomic` provides lock-free-style atomic operations for common primitive/reference state.

Examples:

- `AtomicInteger`, `AtomicLong`, `AtomicBoolean`;
- `AtomicReference`;
- stamped/markable references;
- `LongAdder` / `LongAccumulator` for highly contended aggregation.

## 2. Compound Atomic Operations

```java
count.incrementAndGet();
```

performs an atomic read-modify-write unlike `volatile int` followed by `count++`.

Methods such as `updateAndGet`/`accumulateAndGet` may retry the supplied function, so the function should be side-effect-free.

## 3. Atomics vs. Locks

Atomics are excellent for one/few independent state variables and lock-free data structures.

A lock is usually clearer when one invariant spans multiple fields, I/O, or complex conditional updates.

## 4. Contention

`AtomicLong` can become a single cache-line hotspot. `LongAdder` spreads updates across cells and aggregates them for reads, trading exact instantaneous read semantics for better update scalability.

## 5. Memory Semantics

Atomic APIs define synchronization/memory effects; modern Java also exposes VarHandle access modes ranging from plain/opaque through acquire/release to volatile semantics.

Prefer the highest-level operation whose semantics match the algorithm.