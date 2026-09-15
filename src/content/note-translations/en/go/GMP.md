---
title: "3.1 Go's G-M-P Scheduler"
description: "The Go scheduler's G, M, and P abstractions, local run queues, work stealing, blocking syscalls, GOMAXPROCS, and asynchronous preemption."
translationOf: "go/GMP"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. Why Go Needs a Scheduler

A Go program may have far more runnable goroutines than operating-system threads. The runtime scheduler decides which goroutine runs on which thread and when.

Earlier Go schedulers relied more heavily on a global runnable queue. The modern design adds per-processor local queues and work stealing to reduce contention and improve locality.

## 2. G, M, and P

![GMP](https://raw.githubusercontent.com/TDoct/images/master/1596870339_20200808144742151_25089.png)

### 2.1 G — Goroutine

`G` represents a goroutine: its stack, scheduling state, and execution metadata.

### 2.2 M — Machine

`M` represents an operating-system thread used by the runtime.

The runtime creates and parks OS threads as needed. `runtime/debug.SetMaxThreads` defines a safety limit; its default value must not be interpreted as “Go creates 10,000 threads by default.”

### 2.3 P — Processor

`P` represents the resources required to execute Go code. A runnable goroutine executes when an `M` owns a `P`.

`GOMAXPROCS` controls how many Ps can execute Go code simultaneously.

## 3. Run Queues and Work Stealing

Each P maintains a local runnable queue. This avoids making every scheduling operation contend on one global queue.

When a P has no local work, the scheduler can search other sources, including:

- the global runnable queue;
- network-poller results;
- another P's run queue through work stealing.

This design balances locality with utilization.

## 4. Blocking Operations

If an M blocks in a syscall, the runtime can detach its P and let another M continue running Go code on that P. Network I/O integrated with the runtime poller can park the goroutine rather than consuming one thread per blocked socket.

## 5. g0 and Runtime Work

Each M has a special scheduler goroutine often referred to as `g0`. Runtime operations such as scheduling and stack-management work execute on runtime-managed stacks rather than as ordinary user goroutines.

## 6. Preemption

Go originally depended more heavily on cooperative safe points. Modern Go also supports **asynchronous preemption** (introduced in Go 1.14), which helps prevent long-running goroutines from monopolizing a P even when they do not frequently call into the runtime.

Exact scheduler internals are version-sensitive. The durable model is: **G is work, M is an OS thread, P is the right to/resources needed to execute Go code, and the runtime continuously moves runnable Gs onto available P/M pairs.**
