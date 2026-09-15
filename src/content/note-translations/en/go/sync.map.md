---
title: "2.4 sync.Map"
description: "Go's specialized concurrent map, its intended workloads, read-optimized internal design, atomic map operations, and when a normal map plus mutex is clearer."
translationOf: "go/sync.map"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. What Is `sync.Map`?

`sync.Map` is a concurrent map provided by the standard library. It is specialized rather than a universal replacement for `map[K]V` plus a mutex.

The standard library specifically targets workloads such as:

- an entry is written once and read many times, as in some caches;
- goroutines mostly access disjoint sets of keys.

For ordinary application state with known key/value types, a normal map protected by [`Mutex`](/en/notes/go/sync.Mutex/) or [`RWMutex`](/en/notes/go/sync.RWMutex/) is often clearer and preserves static typing.

## 2. Core Operations

```go
var m sync.Map

m.Store("name", 18)
v, ok := m.Load("name")
actual, loaded := m.LoadOrStore("name", 20)
m.Delete("name")

m.Range(func(key, value any) bool {
    return true
})
```

The API also includes atomic compound operations in modern Go versions, avoiding manual load-then-store races for supported use cases.

## 3. Internal Design

The historical implementation described in the source note separates a read-mostly representation from a locked dirty map, promotes data based on misses, and stores entries through atomic pointers. This lets many reads avoid taking the main mutex.

The exact internal fields have evolved across Go releases. The stable idea is that `sync.Map` spends implementation complexity to optimize particular concurrent-access patterns.

## 4. What It Does Not Mean

`sync.Map` is not simply “an optimistic lock map,” and “read-heavy” alone is not enough to prove it will outperform a typed map plus `RWMutex`.

Benchmark with your real key distribution, write rate, and contention pattern.
