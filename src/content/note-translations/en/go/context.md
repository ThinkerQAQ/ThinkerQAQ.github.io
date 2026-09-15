---
title: "2.1 Context"
description: "Go context trees for cancellation, deadlines, timeouts, and request-scoped values, with lifecycle rules for passing and canceling contexts."
translationOf: "go/context"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. What Is `context.Context`?

`context.Context` carries request-scoped control information across API boundaries and goroutines:

- cancellation;
- deadlines/timeouts;
- request-scoped values.

It is especially useful when one request fans out into multiple goroutines or downstream calls that should all stop when the parent request is canceled.

## 2. Cancellation

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

go worker(ctx)

// later
cancel()
```

A worker typically observes cancellation through:

```go
select {
case <-ctx.Done():
    return ctx.Err()
case work := <-jobs:
    _ = work
}
```

Cancellation propagates from parent to descendants. Calling the returned cancel function releases resources associated with that derived context, so call it even when a deadline will eventually expire on its own.

## 3. Deadlines and Timeouts

```go
ctx, cancel := context.WithTimeout(parent, 2*time.Second)
defer cancel()
```

Use deadlines/timeouts to bound request work. Downstream functions should receive the caller's context rather than silently replacing it with `context.Background()`.

## 4. Values

```go
ctx = context.WithValue(ctx, requestIDKey, requestID)
```

Context values are intended for request-scoped metadata that crosses API boundaries, such as trace/request identity. Do not use context as a generic parameter bag, configuration store, or substitute for explicit function arguments.

Use an unexported, comparable key type to avoid collisions.

## 5. API Conventions

Common Go conventions:

- pass `Context` explicitly, usually as the first parameter;
- do not store contexts in structs unless an API has a specific reason;
- do not pass `nil`; use `context.TODO()` when the correct parent is not yet known;
- propagate the caller's context to I/O and RPC boundaries;
- cancellation is cooperative: code must observe `Done()` or call APIs that do.

## 6. Context vs. WaitGroup

A [`sync.WaitGroup`](/en/notes/go/sync.WaitGroup/) answers **“when are these goroutines finished?”**

A context answers **“should this tree of work stop, and by when?”**

Many real programs use both.
