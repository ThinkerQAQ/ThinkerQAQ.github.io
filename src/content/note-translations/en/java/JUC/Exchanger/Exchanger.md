---
title: "6.18 Exchanger"
description: "How Java Exchanger pairs two threads at a rendezvous point and atomically swaps one value from each participant."
translationOf: "java/JUC/Exchanger/Exchanger"
language: "en"
updatedAt: "2026-09-15T04:40:00Z"
---

## 1. What It Is

`Exchanger<V>` is a synchronization point for **two threads**. Each thread calls `exchange(value)` and waits until another thread arrives; the two values are then swapped.

```java
Exchanger<String> exchanger = new Exchanger<>();
String received = exchanger.exchange("my value");
```

The operation is a rendezvous: neither participant completes the exchange until it has a partner, unless interruption or a timeout ends the wait.

## 2. Compared with `SynchronousQueue`

Both can coordinate direct handoff without ordinary queue storage, but their abstraction is different:

- `Exchanger` pairs two participants and swaps values **bidirectionally**;
- `SynchronousQueue` models a producer-to-consumer handoff through queue operations.

Use the abstraction that matches the protocol rather than treating one as a drop-in implementation of the other.

## 3. Use Cases

Examples include double-buffer handoff, two-party pipeline stages, or tests that need a precise rendezvous.

For general producer/consumer systems with many participants, a `BlockingQueue` is usually easier to scale and reason about.