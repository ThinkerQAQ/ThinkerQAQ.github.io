---
title: "2.2 sync.WaitGroup"
description: "Waiting for a group of goroutines to finish with Add, Done, and Wait, including the counter lifecycle and common Add/Wait misuse."
translationOf: "go/sync.WaitGroup"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. What Is `sync.WaitGroup`?

A `WaitGroup` lets one goroutine wait until a group of tasks has completed.

```go
var wg sync.WaitGroup

wg.Add(2)

go func() {
    defer wg.Done()
    work1()
}()

go func() {
    defer wg.Done()
    work2()
}()

wg.Wait()
```

## 2. Mental Model

A WaitGroup maintains a counter:

- `Add(n)` changes the counter by `n`;
- `Done()` is equivalent to `Add(-1)`;
- `Wait()` blocks until the counter reaches zero.

If the counter becomes negative, the program panics.

## 3. Correct Lifecycle

When starting a new group from a zero counter, positive `Add` calls should happen before the corresponding `Wait` can begin. The classic pattern is therefore:

```go
wg.Add(1)
go func() {
    defer wg.Done()
    // work
}()
```

Putting `Add(1)` inside the new goroutine creates a race with `Wait`: the waiter may observe zero before the goroutine increments the counter.

A WaitGroup may be reused after a previous `Wait` has returned, but a WaitGroup must not be copied after first use.

## 4. WaitGroup vs. Context

`WaitGroup` coordinates **completion**; it does not cancel work or propagate errors. Combine it with [context](/en/notes/go/context/) or a higher-level task-group abstraction when you also need cancellation/error propagation.
