---
title: "Concurrency Programming (1): Start with the Hardware — From count++ to Atomicity, Visibility, and Ordering"
description: "Starting from the von Neumann architecture and instruction execution, this article follows count++ down to the hardware-level problems of atomicity, visibility, and ordering."
publishedAt: "2026-09-07T11:08:48+08:00"
updatedAt: "2026-09-10T10:46:49+08:00"
language: en
tags:
  - Concurrency
  - CPU
  - Memory Model
  - Java
  - Go
  - Python
status: published
featured: false
series: concurrency-programming
translationOf: concurrency-series-01-hardware
---

## Table of Contents

- [1. Start with the von Neumann Architecture](#1-start-with-the-von-neumann-architecture)
- [2. What Does `count++` Become?](#2-what-does-count-become)
- [3. Why Do We Need Caches?](#3-why-do-we-need-caches)
- [4. Concurrency on One Core: Why Can `count++` Lose an Update?](#4-concurrency-on-one-core-why-can-count-lose-an-update)
- [5. From One Core to Multiple Cores: Visibility](#5-from-one-core-to-multiple-cores-visibility)
- [6. What About the Order of Multiple Memory Operations?](#6-what-about-the-order-of-multiple-memory-operations)
  - [6.1 Store Buffer](#61-store-buffer)
  - [6.2 Out-of-Order Execution](#62-out-of-order-execution)
- [7. We Have Actually Encountered Three Problems](#7-we-have-actually-encountered-three-problems)
- [8. How Does Hardware Address Them?](#8-how-does-hardware-address-them)
  - [8.1 Atomicity: Atomic Instructions](#81-atomicity-atomic-instructions)
  - [8.2 Visibility: Cache Coherence](#82-visibility-cache-coherence)
  - [8.3 Ordering: Memory Ordering / Fences](#83-ordering-memory-ordering--fences)
- [9. Summary](#9-summary)

---

This article continues to use `count`, but focuses only on the hardware layer:

> **What concurrency problems do the CPU and memory system introduce, and what capabilities does the hardware provide to address them?**

---

## 1. Start with the von Neumann Architecture

The von Neumann model treats programs as data: instructions and data are stored in the same general way. At a high level, a computer can be divided into a control unit, arithmetic unit, memory, input devices, and output devices.

The arithmetic and control units form the CPU, which also contains registers. The **Program Counter (PC) stores the address of the next instruction**; the Instruction Register (IR) stores the instruction currently being processed; general-purpose registers such as `R1` hold data and intermediate results.

```text
┌──────────────────┐                    ┌──────────────────┐
│   Input Device   │                    │  Output Device   │
└─────────┬────────┘                    └─────────▲────────┘
          │                                       │
          └───────────────────┬───────────────────┘
                              │
                          System Bus
                              │
             ┌────────────────┴─────────────────┐
             │                                  │
             ▼                                  ▼
┌────────────────────────┐         ┌────────────────────────┐
│          CPU           │         │         Memory         │
│                        │         │                        │
│      Control Unit      │         │  Instructions + Data   │
│     Arithmetic Unit    │         │                        │
│       Registers        │         │                        │
│       PC / IR / R1     │         │                        │
└────────────────────────┘         └────────────────────────┘
```

The CPU execution loop can be simplified to:

```text
PC provides instruction address
        ↓
Fetch → Decode → Execute
        ↓
PC advances to the next instruction and repeats
```

The CPU repeatedly performs `Fetch → Decode → Execute`. A source-level expression such as `count++` must eventually be converted into machine instructions that follow this process.

---

## 2. What Does `count++` Become?

For discussion, we can simplify `count++` into three machine-level operations:

```text
LOAD  R1, [count]    // load count into R1
ADD   R1, 1          // increment R1 inside the CPU
STORE [count], R1    // write the result back to count
```

Both `LOAD` and `STORE` access data. That leads naturally to the next question:

> **What would happen if every LOAD and STORE had to wait directly for main memory?**

---

## 3. Why Do We Need Caches?

A CPU executes far faster than main memory can be accessed. If every `LOAD` had to wait for main memory to return data and every `STORE` had to wait until memory completed the write, the CPU would spend a large amount of time idle.

Modern processors therefore place smaller, faster cache levels between a CPU core and main memory. A simplified hierarchy looks like this; exact levels and which caches are shared depend on the processor design:

```text
CPU
 │
 ▼
L1 Cache
 │
 ▼
L2 Cache
 │
 ▼
L3 Cache
 │
 ▼
Memory
```

When the CPU accesses `count`, it normally loads the cache line containing it into a cache. Simplifying again:

```text
CPU
 │
 ▼
Cache: count = 0
 │
 ▼
Memory: count = 0
```

Later accesses to `count` may hit in the cache instead of going to main memory every time.

So:

> **Caches address the speed gap between the CPU and main memory.**

That is a performance optimization. It does not make:

```text
count++
```

a safe concurrent operation automatically.

Start with a single core.

---

## 4. Concurrency on One Core: Why Can `count++` Lose an Update?

Suppose the machine has only one CPU core:

```text
Thread A ──┐
           │
           ├──> Core 0 ──> Cache ──> Memory
           │
Thread B ──┘
```

The two threads cannot literally execute at the same instant on that core, but the scheduler can interleave them.

Start with:

```text
count = 0
```

Then the following schedule is possible:

```text
Thread A                              Thread B
   │                                    │
   ├─ LOAD count -> 0                   │
   │                                    │
   ├─────── context switch ────────────>│
   │                                    ├─ LOAD  count -> 0
   │                                    ├─ ADD   1
   │                                    ├─ STORE count -> 1
   │                                    │
   │<────── context switch ─────────────┤
   ├─ ADD   1                           │
   ├─ STORE count -> 1                  │
```

During a context switch, the operating system preserves Thread A's execution context, including intermediate state. When A resumes, it can continue computing from the `0` it read earlier.

The final result is:

```text
count = 1
```

The reason is that:

```text
LOAD
ADD
STORE
```

are not one indivisible operation.

If another execution unit can run between those steps, a lost update becomes possible.

This gives us the first problem:

> **Problem 1: How can a compound operation execute indivisibly?**

That is the problem of:

```text
Atomicity
```

We will not answer it yet. First, move from one core to multiple cores.

---

## 5. From One Core to Multiple Cores: Visibility

With multiple CPU cores, two threads may truly execute in parallel:

```text
Thread A                       Thread B
   │                              │
   ▼                              ▼
Core A                         Core B
   │                              │
   ▼                              ▼
Cache A                        Cache B
   │                              │
   └──────────────┬───────────────┘
                  ▼
                Memory
```

The original `count++` race still exists, but multiple cores introduce another issue.

Suppose:

```text
count = 0
```

Both Core A and Core B have read `count`. The same data may now exist in separate caches:

```text
Core A Cache                    Core B Cache

count = 0                       count = 0

               Memory
              count = 0
```

Now Core A changes `count`:

```text
Core A Cache                    Core B Cache

count = 1                       count = 0
```

The question becomes:

> **May Core B keep using its old copy?**

Or more generally:

> **Problem 2: After one core writes data, when can other cores observe the new value?**

That is:

```text
Visibility
```

Again, hold the answer for a moment and move to the third class of problem.

---

## 6. What About the Order of Multiple Memory Operations?

Continue with a publication-style example:

```text
count = 0
ready = false
```

```text
Thread A                         Thread B
   │                                │
   ├─ count = 1                     ├─ read ready
   └─ ready = true                  └─ if true, read count
```

A programmer naturally wants the following guarantee:

> **If Thread B has already observed `ready = true`, it should also observe the earlier write `count = 1`.**

Ideally, B should only see one of these outcomes:

```text
Outcome 1:

Thread A                         Thread B

                                 read ready -> false
                                 do not enter if

Outcome 2:

Thread A                         Thread B

count = 1
ready = true                     read ready -> true
                                 enter if
                                 read count -> 1
                                 print 1
```

We do not want:

```text
Thread A                         Thread B

count = 1
(write not yet observed by B)
ready = true                     read ready -> true
                                 enter if
                                 read count -> 0
                                 print 0
```

So the question is:

> **Once B has read `ready = true`, how do we prevent it from still reading the old `count = 0`?**

This is no longer merely a question about multiple cached copies of the same location. We now have two different memory locations:

```text
count
ready
```

and a relationship between two writes:

```text
count = 1
ready = true
```

This gives us the third problem:

> **Problem 3: In what order may memory operations become observable to other cores?**

That is:

```text
Memory Ordering
```

Why does hardware make this complicated? Primarily because modern CPUs introduce aggressive performance optimizations.

---

### 6.1 Store Buffer

Continue with `count++`. Suppose `count = 0` and Core A executes:

```text
LOAD  count -> 0
ADD   1     -> 1
STORE [count], 1
```

The `STORE` of `count = 1` may first enter a store buffer:

```text
CPU (Core A)
executes STORE [count], 1
        │
        ▼
Store Buffer
holds count = 1 temporarily
        │
        ▼
Memory
```

Core A can continue executing before the buffered write becomes visible to other cores:

```text
initial: count = 0

Core A                               Core B
   │                                    │
   ├─ LOAD  count -> 0                  │
   ├─ ADD   1     -> 1                  │
   ├─ STORE count -> 1                  │
   │  enters Store Buffer               │
   ├─ continue with later instructions  │
   │                                    ├─ LOAD count -> 0
   │                                    │  still sees old value
   └─ count = 1 becomes visible         │
```

---

### 6.2 Out-of-Order Execution

Modern CPUs also rearrange internal execution, where dependencies allow it, to keep execution units busy.

As long as this does not change the result observed by the current thread, such optimization is valid from that thread's perspective. The difficulty appears when multiple cores interact.

Return to the publication example:

```text
Thread A / Core A                 Thread B / Core B

count = 1                        if ready {
ready = true                         print(count)
                                 }
```

The source code writes `count` before `ready`. But without additional ordering constraints, on hardware whose memory model permits it, another core may observe:

```text
initial: count = 0, ready = false

Thread A / Core A                 Thread B / Core B
   │                                  │
   ├─ STORE count = 1                 │
   │  not yet observed by Core B      │
   ├─ STORE ready = true              │
   │                                  ├─ LOAD ready -> true
   │                                  └─ LOAD count -> 0
```

In other words, A issued the `count` write first in source order, yet B observed `ready = true` first and then still read the old `count = 0`.

The underlying question is:

> **In what order is another core allowed to observe these memory operations?**

---

## 7. We Have Actually Encountered Three Problems

The earlier examples can be summarized as three categories:

| Problem | Symptom | What hardware must define |
|---|---|---|
| Atomicity | A and B both execute `count++`, both can read `0`, and both finally write `1` | Which operations are atomic? |
| Visibility | Core A has changed `count` to `1`, while Core B may still read a cached `0` | When does a write by one core become observable to another? |
| Ordering | Core A writes `count = 1` and then `ready = true`, while Core B may observe `ready = true` and still read `count = 0` | Which ordering relationships are guaranteed between memory operations? |

The first problem can occur both with single-core context switches and with true multicore parallelism. The key issue is not the number of CPU cores, but whether the steps of a Read-Modify-Write sequence can be interleaved with another execution unit.

Now we can ask what primitives the hardware provides:

> **What mechanisms does modern hardware provide for these three problems?**

---

## 8. How Does Hardware Address Them?

### 8.1 Atomicity: Atomic Instructions

A normal `LOAD + ADD + STORE` consists of several operations. To make a Read-Modify-Write operation appear indivisible to other execution units, hardware provides atomic operations such as:

```text
Compare-And-Swap
Exchange
Fetch-And-Add
```

Internally, these operations are not necessarily a single microscopic step. “Atomic” describes what competing execution units are allowed to observe:

```text
read old value
    │
modify
    │
write new value
    │
    └── appears as one indivisible atomic operation to competitors
```

Return to `count++`. If a language implements the increment with a hardware-supported atomic Read-Modify-Write, we can reason about the result as:

```text
initial: count = 0

Thread A                         Thread B

atomically change count 0 -> 1
                                 atomically change count 1 -> 2

final: count = 2
```

It does not matter whether A or B wins first. Each atomic update must operate on a definite previous value, so both threads cannot independently read `0` and then both write `1`.

---

### 8.2 Visibility: Cache Coherence

Multicore processors use cache-coherence protocols to coordinate cached copies of the same memory location across cores.

MESI is one of the classic coherence protocols:

```text
M - Modified
E - Exclusive
S - Shared
I - Invalid
```

Real processors may use MESI or extensions and variants such as:

```text
MESI
MOESI
MESIF
...
```

We do not need every state transition here; focus on the problem coherence solves.

Suppose both cores cache the line containing `count`:

```text
Core A Cache              Core B Cache

count = 0                 count = 0
Shared                    Shared
```

If Core A wants to modify it to:

```text
count = 1
```

the hardware must coordinate ownership of that cache line and the state of other copies.

At a very high level:

```text
Core A wants to modify count
        │
        ▼
obtain write permission for the cache line
        │
        ▼
invalidate copies that may no longer be used
        │
        ▼
Core A performs the modification
```

After Core A obtains write permission, Core B's old `count = 0` copy is invalidated. The next time B reads `count`, it cannot continue using that stale copy.

---

### 8.3 Ordering: Memory Ordering / Fences

Consider again:

```text
count = 1
ready = true
```

Modern CPUs use store buffers, out-of-order execution, and other mechanisms to improve performance. A hardware memory model must define:

```text
Which memory-operation orderings are guaranteed?
Which reorderings are permitted?
Which outcomes may different cores observe?
```

That is memory ordering.

Return to the publication example. If `count = 1` has not yet become observable to B, hardware that permits the outcome might allow:

```text
Thread A / Core A                       Thread B / Core B
|                                       |
+-- STORE count = 1                     |
+-- STORE ready = true                  |
|                                       +-- LOAD ready -> true
|                                       +-- LOAD count -> 0
```

To forbid that result, fences can constrain the order of memory operations on each side:

```text
Thread A / Core A                       Thread B / Core B
|                                       |
+-- STORE count = 1                     |
+-- FENCE                               |
+-- STORE ready = true                  |
|                                       +-- LOAD ready -> true
|                                       +-- FENCE
|                                       +-- LOAD count -> 1
```

The writer-side fence prevents `count = 1` from being ordered after `ready = true`. The reader-side fence prevents the read of `count` from being ordered before the read of `ready`.

A fence does not guarantee that B will read `ready = true`. But once B has observed `ready = true` under the required synchronization pattern, the later read of `count` cannot still return the stale `0`.

---

## 9. Summary

Hardware provides different foundations for the three concurrency problems:

| Problem | Hardware capability |
|---|---|
| Atomicity | Atomic instructions can perform a Read-Modify-Write update such as an increment as an indivisible operation from the perspective of competing execution units. |
| Visibility | Cache coherence prevents Core B from indefinitely continuing to use a stale cached copy after Core A obtains ownership and modifies the corresponding cache line. |
| Ordering | Memory-ordering rules and fences constrain which operations may be observed before or after others. In the publication example, proper ordering makes `ready = true` establish the required relationship with the earlier `count = 1`. |

The next article returns to the language layer and looks at how Java, Go, and CPython turn these hardware capabilities into rules that programmers can rely on.
