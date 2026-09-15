---
title: "PriorityQueue"
description: "Heap-based priority queues, ordering semantics, complexity, and concurrency limitations."
translationOf: "java/JDK/Queue/PriorityQueue"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`PriorityQueue` orders elements by natural ordering or a comparator and exposes the highest-priority element according to that ordering at the head.

It is typically heap-based: insertion/removal of the head are logarithmic, while peeking at the head is constant-time. Iteration is **not sorted traversal**; remove elements or copy/sort if ordered enumeration is required.

`PriorityQueue` is not thread-safe. Use `PriorityBlockingQueue` when its concurrent/unbounded semantics fit the problem.