---
title: "PriorityBlockingQueue"
description: "An unbounded priority heap for concurrent producers/consumers, with ordering, capacity, and starvation caveats."
translationOf: "java/JUC/12.BlockingQueue/PriorityBlockingQueue"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

## 1. Model

`PriorityBlockingQueue` orders elements by natural ordering or a supplied comparator rather than insertion order.

It is thread-safe and blocking on retrieval when empty.

## 2. Capacity

It grows dynamically and is effectively unbounded for normal overload reasoning. `put` therefore normally does not provide bounded producer backpressure.

## 3. Equal Priorities

Elements with equal priority are not guaranteed strict FIFO ordering unless the application adds a sequence/tie-breaker.

## 4. Starvation

A continuous stream of higher-priority tasks can indefinitely delay lower-priority work. If fairness matters, use aging, bounded classes, or another scheduler design.

## 5. Use Case

Useful for concurrent priority scheduling where memory growth and starvation are explicitly controlled elsewhere.