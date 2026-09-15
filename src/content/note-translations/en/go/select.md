---
title: "2.6 Select"
description: "How Go `select` waits on multiple channel operations, chooses among ready cases, uses `default`, handles nil channels, timeouts, and cancellation."
translationOf: "go/select"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. What Is `select`?

`select` lets one goroutine wait on multiple channel send/receive operations.

```go
select {
case v := <-c1:
    fmt.Println("c1", v)
case c2 <- value:
    fmt.Println("sent")
default:
    fmt.Println("nothing ready")
}
```

At a high level:

- if one communication can proceed, that case runs;
- if multiple cases can proceed, one ready case is selected using runtime pseudo-randomized selection rather than source-code priority;
- if none can proceed and `default` exists, `default` runs;
- if none can proceed and there is no `default`, the goroutine blocks.

## 2. Nil Channels

Sending to or receiving from a nil channel blocks forever. This property is useful inside `select`: setting a channel variable to `nil` dynamically disables that case.

## 3. Empty Select

```go
select {}
```

An empty `select` blocks forever. If every goroutine in a program becomes permanently blocked and the runtime detects that no progress is possible, the program can terminate with a deadlock error.

## 4. Timeouts

For one-off timeouts:

```go
select {
case result := <-resultCh:
    _ = result
case <-time.After(5 * time.Second):
    return
}
```

For repeated loops, prefer a reusable `time.Timer`/`time.Ticker` where appropriate instead of repeatedly allocating timers through `time.After`.

For request-scoped cancellation, [context.Context](/en/notes/go/context/) is usually the better abstraction.

## 5. Exiting a `for-select`

A plain `break` inside a `select` exits the `select`, not the surrounding `for`. Common choices are:

- `return`;
- a labeled `break`;
- cancellation that causes the surrounding function to return.

## 6. Runtime Internals

Compiler/runtime implementation differs by case shape. Complex selects ultimately use runtime selection machinery (historically `runtime.selectgo`). Treat those symbols as version-specific; the language semantics above are the stable part.
