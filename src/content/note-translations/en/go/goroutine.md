---
title: "2.14 Goroutines"
description: "What goroutines are, how `go f(...)` starts concurrent execution, how their stacks differ from OS-thread stacks, and how the runtime schedules them."
translationOf: "go/goroutine"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. What Is a Goroutine?

A goroutine is a lightweight execution unit managed by the Go runtime. It is not an operating-system thread, although goroutines ultimately execute on OS threads.

Compared with creating one OS thread per task, goroutines are cheaper to create and can start with small stacks that grow and shrink as needed. This makes it practical for Go programs to use large numbers of concurrent tasks.

## 2. Starting a Goroutine

```go
func work(x, y int) {
    fmt.Println(x + y)
}

func main() {
    go work(1, 2)
}
```

`go work(1, 2)` evaluates the function value and arguments in the calling goroutine, then schedules a new goroutine to execute the call.

A goroutine has its own stack and execution state, but it shares the process address space with other goroutines. Shared memory therefore still requires synchronization.

## 3. Lifetime

Starting a goroutine does not make its work durable. If `main` returns, the process exits even if other goroutines are still running.

Production code should normally have an explicit lifetime mechanism such as:

- `sync.WaitGroup` for completion;
- `context.Context` for cancellation;
- channel ownership/closure protocols;
- an application-level supervisor or worker lifecycle.

## 4. Runtime Implementation

Historically, compiler output for a `go` statement lowers into runtime machinery that allocates/initializes a goroutine and places it into scheduling queues. Exact runtime symbols and layouts are implementation details and can change between Go releases.

The stable mental model is:

1. create a runnable `G`;
2. enqueue it for execution;
3. the runtime scheduler assigns it to a `P` and an OS thread `M` when resources are available.

See [GMP](/en/notes/go/GMP/).

## 5. Goroutines Are Not Automatically Safe

Cheap concurrency does not remove correctness problems. Goroutines can still:

- race on shared state;
- deadlock;
- leak while blocked forever;
- overload downstream systems when created without bounds.

Use concurrency because the workload benefits from it, not because goroutines are inexpensive.
