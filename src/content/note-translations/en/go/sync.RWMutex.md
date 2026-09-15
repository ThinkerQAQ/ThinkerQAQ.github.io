---
title: "2.9 sync.RWMutex"
description: "Go's reader/writer mutex: concurrent readers, exclusive writers, writer preference, non-upgradable locking, and when RWMutex is actually useful."
translationOf: "go/sync.RWMutex"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. What Is `sync.RWMutex`?

`RWMutex` allows either:

- multiple concurrent readers holding `RLock`; or
- one exclusive writer holding `Lock`.

```go
mu.RLock()
v := shared[key]
mu.RUnlock()

mu.Lock()
shared[key] = value
mu.Unlock()
```

Its zero value is ready to use, and it must not be copied after first use.

## 2. Writer Progress

When a writer is waiting, new readers are not allowed to indefinitely keep extending the reader set. This prevents continuous readers from starving a writer.

For this reason an `RLock` should not be held while waiting to acquire another `RLock` through a path that depends on a blocked writer progressing.

## 3. No Upgrade or Downgrade Primitive

`RWMutex` does not provide an atomic upgrade from `RLock` to `Lock`, nor an atomic downgrade from `Lock` to `RLock`. Releasing one mode and acquiring the other creates an interval in which another goroutine can modify the state.

## 4. When to Use It

`RWMutex` helps when:

- reads dominate;
- read critical sections are significant enough for concurrent reads to matter;
- write contention is relatively low.

For tiny critical sections, a plain [`Mutex`](/en/notes/go/sync.Mutex/) may be simpler and equally fast or faster. Measure before introducing reader/writer complexity.
