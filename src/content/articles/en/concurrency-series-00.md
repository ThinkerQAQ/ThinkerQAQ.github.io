---
title: "Concurrency Programming (0): The Problem Space and Scope"
description: "Defines the scope as concurrency within a single process on a single machine, then connects shared variables, shared memory, message passing, language concurrency semantics, and hardware implementation."
publishedAt: "2026-09-06T17:58:00+08:00"
updatedAt: "2026-09-15T10:12:00+08:00"
language: en
tags:
  - Concurrency
  - Java
  - Go
  - Python
status: published
featured: false
series: concurrency-programming
translationOf: concurrency-series-00
---

## Table of Contents

- [1. Define the Scope First](#1-define-the-scope-first)
- [2. Start with a Shared Variable](#2-start-with-a-shared-variable)
- [3. Two Main Coordination Models](#3-two-main-coordination-models)
  - [3.1 Shared Memory: Protect Shared State with Synchronization](#31-shared-memory-protect-shared-state-with-synchronization)
  - [3.2 Message Passing: Coordinate through Messages](#32-message-passing-coordinate-through-messages)
- [4. Why Does This Code Work Correctly?](#4-why-does-this-code-work-correctly)
- [5. Languages Need to Define Concurrency Semantics](#5-languages-need-to-define-concurrency-semantics)
- [6. Why Do We Still Need to Go Down to the Hardware?](#6-why-do-we-still-need-to-go-down-to-the-hardware)
- [7. Next: Start with the Hardware](#7-next-start-with-the-hardware)

---

## 1. Define the Scope First

This series discusses only:

> **Concurrency within a single process on a single machine.**

In other words, the focus is on multiple execution units inside the same process.

For example:

- Java Thread / Virtual Thread;
- Go Goroutine;
- Python Thread / asyncio Task.

Inter-process communication, distributed systems, and network communication are outside the scope.

---

## 2. Start with a Shared Variable

Suppose a process contains this variable:

```text
count = 0
```

Now there are two execution units:

```text
Thread A                    Thread B

count++                     count++
```

If A and B each execute once, is the final result guaranteed to be:

```text
count = 2
```

No.

`count++` can be logically broken down into three steps:

```text
read count
compute count + 1
write count back
```

So the following interleaving is possible:

```text
initial: count = 0

Thread A                    Thread B

read count -> 0
compute count + 1 -> 1
                            read count -> 0
                            compute count + 1 -> 1
write count -> 1
                            write count -> 1
```

The final value becomes:

```text
count = 1
```

Both threads complete a `+1`, but because they read the same old value `0`, both compute the result as `1`, and one update is overwritten.

The key problem is that two threads modify the same `count` state concurrently:

> **Multiple execution units access and modify the same state at the same time.**

Within one process on one machine, execution units mainly coordinate around shared data in two ways:

- **Shared Memory / Shared State**: multiple execution units directly access the same state;
- **Message Passing**: execution units exchange information through messages.

We can use the same `count++` example to see how each model handles the problem.

---

## 3. Two Main Coordination Models

### 3.1 Shared Memory: Protect Shared State with Synchronization

With shared memory, multiple execution units directly access the same state. Continue with `count`.

In Java, the shared state can be protected with synchronization, for example `synchronized`:

```java
class Counter {
    private int count = 0;

    public synchronized void increment() {
        count++;
    }
}
```

Both threads still access the same `Counter`:

```text
Thread A                    Thread B

counter.increment()         counter.increment()
```

But because of `synchronized`, the two threads cannot enter the critical section in `increment()` at the same time.

Suppose Thread A acquires the lock first. The execution becomes:

```text
initial: count = 0

Thread A                         Thread B

request to enter increment()
acquire lock
                                 request to enter increment()
                                 cannot acquire the same lock; wait
read count       -> 0
compute count+1  -> 1
write count      -> 1
leave critical section and release lock
                                 acquire lock
                                 read count       -> 1
                                 compute count+1  -> 2
                                 write count      -> 2
                                 leave critical section and release lock

final: count = 2
```

If Thread B acquires the lock first, the order is reversed but the result is still `2`. What matters is not which thread runs first. What matters is that another thread cannot enter the same critical section before one complete `read → compute → write` sequence finishes.

The interleaving in which both threads read `0` therefore no longer occurs.

Go and Python provide similar mechanisms:

```text
Go      -> Mutex
Python  -> Lock
```

The shared idea is:

> **The state is still shared, but access to that state is coordinated through synchronization.**

---

### 3.2 Message Passing: Coordinate through Messages

Another approach is:

> **Execution units exchange messages instead of having multiple execution units directly modify the same state.**

Continue with `count`.

For example, in Go:

```go
increments := make(chan int)

go func() { // Counter Owner Goroutine
    count := 0

    for delta := range increments {
        count += delta
    }
}()
```

The two producer goroutines do not modify `count` directly. They send increments to the same channel:

```go
go func() { // Goroutine A
    increments <- 1
}()

go func() { // Goroutine B
    increments <- 1
}()
```

We can abstract it as:

```text
Goroutine A ── +1 ──┐
                     ├──> Channel ──> Counter Owner Goroutine ──> count++
Goroutine B ── +1 ──┘
```

Both goroutines only send messages. The actual `count` is modified by a dedicated `Counter Owner Goroutine`.

Java and Python have similar message-passing tools:

- Java `BlockingQueue`;
- Python `queue.Queue` / `asyncio.Queue`.

The shared idea is:

> **Execution units coordinate through messages instead of directly modifying the same state concurrently.**

---

## 4. Why Does This Code Work Correctly?

So far, we have handled the original `count++` problem in two ways.

With shared memory, we used synchronization:

```text
Lock / synchronized / Mutex
```

With message passing, we used:

```text
Queue / Channel
```

But there is a more fundamental question:

> **Why does this code work correctly?**

To answer this question, we need to discuss concurrency from three fundamental perspectives:

- **Atomicity**
- **Visibility**
- **Ordering**

Return to the original `count++` example:

- **Atomicity — which operations are atomic?** `count++` includes a read, an increment, and a write. After A acquires the lock, why must B wait until A changes `count` from `0` to `1` and releases the lock before entering the same critical section?
- **Visibility — when does a write become visible?** After A writes `count = 1` and releases the lock, why must B read `1` after acquiring the same lock instead of continuing to see the old value `0`? With a channel, why can the Counter Owner receive the `+1` sent by a producer?
- **Ordering — which operations have an ordering relationship?** Why must A's `write count = 1 → release lock` happen before B's `acquire lock → read count = 1`? With a channel, why must a `send +1` happen before the corresponding `receive +1 → update count`?

These behaviors cannot depend on one particular CPU happening to execute the program in a convenient way.

Programmers need a defined set of rules they can rely on.

That leads to:

> **The concurrency semantics provided by the programming language.**

---

## 5. Languages Need to Define Concurrency Semantics

A programming language needs to define:

> **When multiple execution units access state concurrently, which behaviors are allowed and which synchronization and memory-access guarantees programmers may rely on.**

Java has the:

```text
Java Memory Model
```

Go has the:

```text
Go Memory Model
```

Python is not exactly the same. In this series, the discussion mainly uses:

```text
Python / CPython Concurrency Semantics
```

These rules need to answer three questions:

| Question | What it means for the `count` example |
| --- | --- |
| Atomicity — which operations are atomic? | `count++` contains `read → increment → write`. Without locking, A's and B's steps can interleave and produce only `1`. With the same lock, A must completely change `count` from `0` to `1` before B can enter the critical section and continue from `1` to `2`. |
| Visibility — when does a write become visible? | After A writes `count = 1` and releases the lock, B must see `1` after acquiring the same lock instead of using the old value `0`. With a channel, the Counter Owner must be able to receive the producer's `+1`. |
| Ordering — which operations are ordered? | For the same lock, the order is `A writes count = 1 → A releases lock → B acquires lock → B reads count = 1`. With a channel, it is `producer sends +1 → Counter Owner receives +1 → update count`. |

In other words, this layer answers:

> **What may the programmer rely on?**

---

## 6. Why Do We Still Need to Go Down to the Hardware?

Languages define rules, but those rules cannot implement themselves.

Java, Go, and Python ultimately rely on several layers to turn language guarantees into behavior on a real machine:

```text
Concurrency Tools / Synchronization Mechanisms
    └─ Mutex / Atomic / volatile / Channel / Queue
            ↓
Language Memory Model / Concurrency Semantics
    ├─ JMM / Go Memory Model / CPython Concurrency Semantics
    └─ implemented by HotSpot JIT / Go Compiler + Runtime / CPython Runtime
            ↓
Hardware
    ├─ Computer Architecture: Von Neumann Architecture / CPU / Memory
    ├─ Hardware Memory Model: x86-TSO / ARM Memory Model
    ├─ Instruction / CPU Primitive: LOAD / STORE / Atomic RMW / Fence
    └─ Microarchitecture: Cache / Store Buffer / Cache Coherence / Out-of-Order Execution
```

Modern CPUs use many techniques to improve performance:

- CPU caches;
- store buffers;
- out-of-order execution;
- atomic instructions;
- different memory-ordering rules.

Language-level concurrency semantics ultimately have to be implemented on top of these hardware capabilities. To understand why language rules and concurrency tools work, we therefore need to understand which behaviors the hardware permits and which constraints it provides.

Before going deeper into the concrete concurrency semantics of Java, Go, and Python, we need to answer:

> **What guarantees does the hardware actually provide?**

---

## 7. Next: Start with the Hardware

The next article moves down to the hardware layer.

It focuses on:

- why CPUs need caches;
- how multiple CPU cores coordinate cached data;
- why store buffers and out-of-order execution affect memory-access ordering;
- what atomic instructions provide.

Once we understand those pieces, we can return to:

```text
Java Memory Model
Go Memory Model
Python / CPython Concurrency Semantics
```

Using those rules as the foundation, we can then discuss what guarantees mutexes provide, how runtimes and CPUs implement those guarantees, and how concrete concurrency tools such as atomics and channels fit into the picture.
