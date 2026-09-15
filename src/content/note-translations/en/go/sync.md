---
title: "2.3 The sync Package"
description: "A map of Go's shared-memory synchronization primitives: Mutex, RWMutex, Once, Cond, Map, Pool, WaitGroup, and atomic operations."
translationOf: "go/sync"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. What Is `sync`?

The `sync` package provides shared-memory synchronization primitives.

Choose the primitive that expresses the invariant clearly:

- [Mutex](/en/notes/go/sync.Mutex/) — exclusive access;
- [RWMutex](/en/notes/go/sync.RWMutex/) — multiple readers or one writer;
- `Once` — run initialization exactly once;
- `Cond` — wait for changes to a condition while holding an associated lock;
- [Map](/en/notes/go/sync.map/) — specialized concurrent map;
- `Pool` — temporary object reuse to reduce allocation pressure;
- [WaitGroup](/en/notes/go/sync.WaitGroup/) — wait for a group of tasks to finish.

[`sync/atomic`](/en/notes/go/atomic/) provides atomic operations for specific lock-free state transitions.

## 2. Channels vs. `sync`

The standard-library guidance that higher-level synchronization is often better expressed through channels is useful, but not absolute.

Use channels when the problem is communication/ownership. Use `sync` when the problem is protecting or coordinating shared state. The clearer correctness model is usually the better choice.

## 3. Memory Ordering

These primitives do more than prevent simultaneous execution: their documented operations establish happens-before relationships in the Go memory model. Correct concurrent code must reason about both exclusion and visibility.
