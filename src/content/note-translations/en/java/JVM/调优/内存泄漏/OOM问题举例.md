---
title: "Java OOM Examples and Diagnosis"
description: "How to distinguish heap retention, allocation pressure, Metaspace, direct/native memory, and thread-related out-of-memory failures."
translationOf: "java/JVM/调优/内存泄漏/OOM问题举例"
language: "en"
updatedAt: "2026-09-15T04:50:00Z"
---

## 1. OOM Is a Symptom Class

`OutOfMemoryError` does not always mean the same resource is exhausted. Possible categories include Java heap, class metadata, direct/native allocation, native thread creation, or VM-specific resource limits.

## 2. Heap Retention vs Allocation Pressure

A **leak/retention problem** means live reachable data grows unexpectedly. An **allocation-pressure problem** can allocate enormous temporary volume even when most objects die correctly.

A heap dump and dominator/retained-size analysis are useful for retention. Allocation profiling/JFR is often better for excessive churn.

## 3. Common Retention Sources

- unbounded caches/maps/queues;
- listeners/callbacks never removed;
- `ThreadLocal` values on long-lived pool threads;
- class-loader leaks;
- request/session objects retained by static structures.

## 4. Native/Process Memory

If RSS grows while Java heap remains healthy, inspect direct buffers, thread stacks/count, native libraries, allocator behavior, Metaspace, and JVM native memory.

Do not increase `-Xmx` blindly: that can reduce native headroom and make a container OOM sooner.