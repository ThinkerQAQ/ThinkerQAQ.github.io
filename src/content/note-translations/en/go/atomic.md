---
title: "2.11 Atomic Operations"
description: "Go atomic operations, compare-and-swap, typed atomic values, atomic.Value, memory ordering, and when atomics are appropriate instead of locks."
translationOf: "go/atomic"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. What Is an Atomic Operation?

An atomic operation appears indivisible with respect to competing atomic accesses to the same synchronization state. Go exposes hardware/runtime-supported atomic operations through `sync/atomic`.

Typical operations include:

- load/store;
- add;
- swap;
- compare-and-swap (CAS).

Modern Go also provides typed atomic wrappers such as `atomic.Int64`, `atomic.Bool`, and `atomic.Pointer[T]`.

## 2. Compare-and-Swap

Conceptually:

```text
if value == old:
    value = new
    return true
return false
```

The comparison and write occur atomically. CAS is a building block for lock-free state machines, but retry loops can still suffer contention, starvation, ABA-style design problems, or overly complicated invariants.

## 3. `atomic.Value`

`atomic.Value` supports atomic publication and loading of a whole value, which is useful for immutable snapshots such as configuration:

```go
var cfg atomic.Value
cfg.Store(&Config{...})

current := cfg.Load().(*Config)
```

After the first store, values stored into the same `atomic.Value` must have a consistent concrete type. Store immutable snapshots rather than mutating an object after publishing its pointer.

## 4. Memory Ordering

Go atomic operations provide synchronization semantics defined by the Go memory model; atomic operations can be reasoned about in a single sequentially consistent order.

Atomicity is therefore not merely “one CPU instruction.” The language-level guarantee includes the ordering needed for correctly synchronized communication between goroutines.

## 5. Atomics vs. Mutexes

Use atomics for a small, clearly defined state transition such as:

- counters;
- flags;
- immutable-pointer publication;
- carefully designed lock-free algorithms.

Use a [`Mutex`](/en/notes/go/sync.Mutex/) when several fields or operations form one invariant. A mutex is often easier to review and maintain than a web of independent atomic variables.

## 6. Implementation Notes

The original note inspected an older `atomic.Value` implementation using interface-word manipulation and CAS during the first store. Those exact internals are version-specific. The public atomicity, type-consistency, and memory-ordering contract is what application code should depend on.
