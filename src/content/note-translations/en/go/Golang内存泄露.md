---
title: "4.4 Memory Leaks in Go"
description: "How Go programs retain memory through reachable objects, goroutine leaks, timers/channels, and non-Go memory, with a pprof-based diagnostic workflow."
translationOf: "go/Golang内存泄露"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. What Does “Memory Leak” Mean in Go?

Garbage collection reclaims **unreachable** Go heap objects. A Go service can still grow indefinitely when objects remain reachable even though the application no longer needs them.

Examples include:

- global maps/caches without eviction;
- goroutines blocked forever while retaining stack/heap references;
- queues whose producers permanently outrun consumers;
- timers or callbacks retaining state longer than intended;
- memory allocated by C/cgo or native libraries outside the Go heap.

## 2. Reachable-Object Retention

```go
var cache = map[int][]byte{}

func keep() {
    for i := 0; i < 10000; i++ {
        cache[i] = make([]byte, 1<<10)
    }
}
```

The GC is working correctly here: the global map still references every byte slice. The fix is an ownership/lifecycle policy such as eviction, bounds, or deletion.

## 3. Goroutine Leaks

A goroutine that can never make progress remains live and may retain everything reachable from its stack.

Typical causes:

- sending to a channel after all receivers have exited;
- receiving from a channel that will never be written/closed;
- forgotten cancellation;
- network calls without appropriate deadlines;
- background loops with no shutdown path.

A classic timeout leak is:

1. worker waits, then tries to send completion on an unbuffered channel;
2. caller times out and returns;
3. nobody remains to receive;
4. worker blocks forever on the send.

Solutions include cancellation, a correctly sized buffered result channel for one-shot completion, or redesigning ownership so the sender can terminate when the request is abandoned.

## 4. RSS Is Not the Same as Live Go Heap

High process RSS does not automatically mean a Go heap leak. Compare:

- Go heap/live-object profiles;
- runtime memory metrics;
- goroutine count;
- OS RSS;
- native/cgo allocations and thread counts.

The runtime may retain address space or physical pages for reuse, and allocator/scavenger behavior changes across Go versions. Diagnose with current runtime metrics rather than assuming one historical `madvise` mode explains every RSS plateau.

## 5. Diagnostic Workflow

### 5.1 Check the Trend

Confirm whether memory grows without returning under a stable workload. A one-time heap expansion is different from an unbounded leak.

### 5.2 Compare Heap Profiles

Use [pprof](/en/notes/go/pprof/) and compare snapshots over time:

```bash
go tool pprof http://host/debug/pprof/heap
```

Look at both retained (`inuse`) and cumulative allocation (`alloc`) views.

### 5.3 Inspect Goroutines

```bash
curl http://host/debug/pprof/goroutine?debug=2
```

Group repeated stacks and look for growing populations blocked on the same channel, lock, syscall, or request path.

### 5.4 Investigate Native Memory

If RSS grows while Go-managed memory does not, inspect cgo/native libraries, thread stacks, memory mappings, and native allocators with OS-level tooling.

## 6. Prevention

- every goroutine should have a defined exit path;
- propagate cancellation and deadlines;
- bound caches, queues, and concurrency;
- avoid unbounded retries/background work;
- expose runtime/pprof diagnostics safely;
- alert on goroutine count and memory trends, not only absolute RSS.
