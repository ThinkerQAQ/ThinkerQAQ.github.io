---
title: "2.8 sync.Mutex"
description: "Exclusive access to shared state with Go's Mutex, including zero-value usage, memory-ordering guarantees, critical-section design, and common mistakes."
translationOf: "go/sync.Mutex"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. What Is `sync.Mutex`?

`sync.Mutex` is Go's basic mutual-exclusion lock. Its zero value is ready to use.

```go
var mu sync.Mutex

mu.Lock()
shared++
mu.Unlock()
```

Only one goroutine can hold the lock at a time.

## 2. Why It Matters

Without synchronization, a compound operation such as `count++` can race because it involves reading state, computing a new value, and writing it back.

A mutex turns the protected sequence into a critical section and also establishes the memory-ordering relationship required for later lock holders to observe prior protected writes.

## 3. Important Properties

- a `Mutex` must not be copied after first use;
- Go mutexes are not goroutine-owned: one goroutine may lock and another may unlock, although designs are usually clearer when ownership is obvious;
- locking an already-held non-reentrant mutex from the same goroutine can deadlock;
- unlocking an unlocked mutex is a runtime error;
- keep critical sections as small as correctness permits, but do not split one invariant across multiple lock/unlock pairs merely to shorten lock time.

## 4. Lock the Invariant, Not Individual Lines

The right lock scope is the set of state transitions that must be observed atomically by other goroutines. Protecting only individual reads/writes can still leave a higher-level check-then-act race.

## 5. Performance

Do not replace a mutex with atomics just because atomics look cheaper. Under low/moderate contention, a mutex is often both fast and much easier to prove correct. Optimize only after measurement.
