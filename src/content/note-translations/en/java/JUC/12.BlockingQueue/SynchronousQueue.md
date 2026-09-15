---
title: "SynchronousQueue"
description: "A zero-capacity rendezvous queue that directly hands an element from producer to consumer, with fair/nonfair transfer modes and thread-pool implications."
translationOf: "java/JUC/12.BlockingQueue/SynchronousQueue"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

## 1. Zero Capacity

`SynchronousQueue` stores no buffered elements.

A successful put must rendezvous with a take, and vice versa.

## 2. Why It Is Called a Queue

It implements the `BlockingQueue` interface but acts as a transfer point rather than storage.

## 3. Thread Pools

`Executors.newCachedThreadPool()` historically uses a `SynchronousQueue`: if no idle worker is ready to take a task, the executor can create another thread up to its maximum policy.

This design can create very many threads under sustained load, so it requires careful workload/overload control.

## 4. Fairness

Implementations support fair and nonfair transfer policies. Nonfair mode may use stack-like transfer behavior for throughput/locality; fair mode favors queue order.

Exact internal transfer algorithms are JDK-version-specific.