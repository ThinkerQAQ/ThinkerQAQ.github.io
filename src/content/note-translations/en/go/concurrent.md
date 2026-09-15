---
title: "2.13 Go Concurrency"
description: "A map of Go concurrency: goroutines, channels, synchronization primitives, the memory model, happens-before relationships, and common concurrency patterns."
translationOf: "go/concurrent"
language: "en"
updatedAt: "2026-09-15T04:35:00Z"
---

## 1. Two Main Coordination Styles

Go supports both major ways of coordinating concurrent work:

- **message passing** with goroutines and [channels](/en/notes/go/channel/);
- **shared-memory synchronization** with the [`sync`](/en/notes/go/sync/) and [`sync/atomic`](/en/notes/go/atomic/) packages.

Neither style eliminates the other. Channels are useful when ownership or events naturally flow between goroutines; mutexes and atomics are often clearer for protecting shared state.

## 2. Goroutines

A [goroutine](/en/notes/go/goroutine/) is a lightweight concurrent execution unit managed by the Go runtime. The runtime multiplexes many goroutines over operating-system threads through the [G-M-P scheduler](/en/notes/go/GMP/).

## 3. The Go Memory Model

Within one goroutine, operations follow the language's sequencing rules. Across goroutines, source-code order alone does not make a write performed by one goroutine visible to another.

Cross-goroutine reasoning requires a **synchronizing event** that establishes a happens-before relationship—for example:

- mutex unlock/lock;
- channel send/receive or channel close/receive;
- atomic operations;
- synchronization primitives such as `Once` and `WaitGroup` where their documented semantics apply.

If two goroutines access the same variable concurrently, at least one access is a write, and no synchronization establishes the required ordering, the program has a data race.

## 4. Channel Ordering

Useful channel rules include:

- a send on a channel is synchronized before the completion of its corresponding receive;
- closing a channel is synchronized before a receive that returns the zero value because the channel is closed;
- for an unbuffered channel, the receive is synchronized before the corresponding send completes;
- buffered channels add capacity-dependent ordering rules, so they should not be treated exactly like unbuffered rendezvous channels.

Use the official Go memory model when correctness depends on an exact ordering rule.

## 5. Concurrency Patterns

Common patterns include:

- pipelines;
- fan-out / fan-in;
- worker pools;
- cancellation with `context.Context`;
- bounded concurrency with channels or semaphores;
- ownership transfer through channels;
- shared-state protection through mutexes or atomics.

The important design question is not “channel or mutex?” in isolation. It is **who owns the state, how work is canceled, and which ordering guarantee the program requires**.

## 6. References

- [The Go Memory Model](https://go.dev/ref/mem)
- [Effective Go: Concurrency](https://go.dev/doc/effective_go#concurrency)
