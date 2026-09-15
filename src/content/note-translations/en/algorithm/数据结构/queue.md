---
title: "Queue"
description: "FIFO queues, dequeues, circular buffers, bounded queues, and priority-queue distinctions."
translationOf: "algorithm/数据结构/queue"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

A FIFO queue enqueues at one end and dequeues at the other. Array-based circular buffers avoid shifting elements by wrapping head/tail indexes.

Bounded queues also encode capacity/backpressure; unbounded queues can turn sustained producer-consumer imbalance into memory growth.

A deque supports both ends. A priority queue is not FIFO: it removes according to priority/order rather than insertion order.