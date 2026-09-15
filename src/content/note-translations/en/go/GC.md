---
title: "3.7 Go Garbage Collection"
description: "Go's concurrent tracing garbage collector, mark/sweep phases, write barriers, GC pacing, GOGC, memory limits, observability, and tuning priorities."
translationOf: "go/GC"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. What Problem Does GC Solve?

Go automatically reclaims heap objects that are no longer reachable. This removes manual object deallocation from ordinary Go code, but allocation rate and live-heap size still affect CPU usage and latency.

Garbage collection does **not** prevent every form of memory growth. Reachable but no-longer-useful objects, leaked goroutines, and memory owned outside the Go heap can all keep process memory high.

See [Go Memory Leaks](/en/notes/go/Golang%E5%86%85%E5%AD%98%E6%B3%84%E9%9C%B2/).

## 2. High-Level Collector Model

Go uses a tracing mark-and-sweep collector with most marking and sweeping work performed concurrently with application goroutines.

A simplified cycle is:

1. short stop-the-world preparation;
2. concurrent marking, with application goroutines participating through write barriers and GC assist as needed;
3. short mark termination;
4. sweeping/reclamation work, much of it concurrent/lazy.

The collector still has stop-the-world phases, but Go's design aims to keep them short rather than pausing for the entire heap traversal.

## 3. Tri-Color Marking

The common explanatory model uses three colors:

- **white** — not yet proven reachable in the current mark cycle;
- **gray** — reachable but still needs pointer scanning;
- **black** — reachable and already scanned.

The collector must preserve a marking invariant while application code concurrently changes pointers. Write barriers record or shade relevant pointer updates so reachable objects are not mistakenly reclaimed.

The precise barrier algorithm is a runtime implementation detail and has evolved over time; application code should not depend on a particular pseudo-code description of the hybrid barrier.

## 4. When GC Runs

GC pacing is driven primarily by heap growth and runtime goals. Applications can also explicitly call `runtime.GC()`, which forces a collection and waits for it to complete, but routine production code rarely needs to do so.

Historically, an idle-time forced GC also exists as a safety mechanism when normal heap-growth triggers do not occur for a long period.

## 5. Tuning

### `GOGC`

`GOGC` controls the target heap growth relative to the live heap before the next collection. Higher values generally trade more memory for less GC CPU; lower values trade more GC work for lower heap targets.

### Memory Limit

Modern Go runtimes also support a soft memory limit through runtime/debug configuration / `GOMEMLIMIT`. This is different from `GOGC`: it constrains the runtime's memory target rather than simply specifying relative heap growth.

## 6. Practical Tuning Order

Before changing GC knobs:

1. measure allocation rate and live heap;
2. remove accidental allocations in hot paths;
3. reuse buffers only where profiling proves it helps;
4. fix goroutine/object retention leaks;
5. then tune `GOGC` or the memory limit against a defined CPU/memory SLO.

A `sync.Pool` can reduce temporary allocation pressure, but pooled objects may be dropped by the runtime and the pool is not a general cache.

## 7. Observability

Useful tools include:

- `GODEBUG=gctrace=1` for GC-cycle diagnostics;
- `runtime/metrics` and runtime memory metrics;
- [pprof](/en/notes/go/pprof/) heap/allocation profiles;
- `go tool trace` for runtime scheduling/GC timelines.

Tune from profiles and production-like workloads, not from a target pause number copied from another service.
