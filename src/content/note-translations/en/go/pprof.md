---
title: "4.2 pprof"
description: "Profiling Go programs with CPU, heap, allocation, goroutine, mutex, and block profiles, plus a measurement-first workflow for finding performance bottlenecks."
translationOf: "go/pprof"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. What Is pprof?

`pprof` is Go's profiling ecosystem for collecting sampled runtime data and analyzing where a program spends CPU time or retains/allocates memory.

Two common entry points are:

- `runtime/pprof` for programmatic profile collection;
- `net/http/pprof` for exposing profiling endpoints in a running server.

## 2. CPU Profiling

A CPU profile samples executing stacks over a time window.

```go
f, _ := os.Create("cpu.pprof")
pprof.StartCPUProfile(f)
defer pprof.StopCPUProfile()
```

Analyze it with:

```bash
go tool pprof cpu.pprof
go tool pprof -http=:9090 cpu.pprof
```

Useful views include:

- `top` — highest flat/cumulative CPU consumers;
- `top -cum` — rank by cumulative cost;
- `list <func>` — map cost back to source lines;
- graph / flame-graph-style views for call paths.

**Flat** cost belongs directly to a function's sampled execution; **cumulative** cost includes descendants in its call tree.

## 3. Heap and Allocation Profiles

Heap profiles help answer two different questions:

- what memory is currently live (`inuse_*`);
- where allocations have accumulated over time (`alloc_*`).

A large allocation source is not automatically a leak. A leak is about retention or unbounded lifetime, so compare profiles over time and inspect what remains reachable.

See [Go Memory Leaks](/en/notes/go/Golang%E5%86%85%E5%AD%98%E6%B3%84%E9%9C%B2/).

## 4. HTTP Profiling

Import the handler package and expose it only on an appropriately protected diagnostic endpoint:

```go
import _ "net/http/pprof"
```

Profiles commonly include:

- `profile` — CPU;
- `heap` / `allocs` — memory;
- `goroutine` — goroutine stacks;
- `mutex` — mutex contention;
- `block` — blocking events;
- `threadcreate` — OS thread creation.

Do not expose pprof endpoints publicly without access control: profiles and stack traces can reveal sensitive implementation details.

## 5. A Practical Workflow

1. reproduce the problem with a representative workload;
2. capture the profile that matches the symptom;
3. identify the dominant stack/function;
4. inspect source and call paths;
5. change one bottleneck;
6. profile again and compare.

Benchmarking tells you **how much** performance changed; profiling helps explain **where the time or memory went**.
