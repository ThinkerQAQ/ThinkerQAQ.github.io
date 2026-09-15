---
title: "LinkedBlockingQueue"
description: "A linked-node blocking queue with optional capacity, separate producer/consumer coordination, and the risk of its very large default bound."
translationOf: "java/JUC/12.BlockingQueue/LinkedBlockingQueue"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

## 1. Characteristics

`LinkedBlockingQueue` stores elements in linked nodes and can be constructed with a capacity.

If capacity is omitted, the practical bound is extremely large, so treating it as 'unbounded' for overload reasoning is usually appropriate.

## 2. Concurrency

The implementation can coordinate put and take paths with separate synchronization, allowing some producer/consumer overlap compared with a single-lock queue design.

## 3. Risk

A huge queue does not increase real processing capacity. During overload it converts excess traffic into growing memory usage and enormous latency.

For service executors, prefer an explicit capacity derived from acceptable queueing delay/backpressure.