---
title: "Concurrency Programming (5): Atomics — Atomicity, Visibility, and Ordering at the Language Level"
description: "Continues with counter and ready to explain the atomicity, visibility, and ordering guarantees of atomic operations, then compares the public semantics in Java, Go, and CPython."
publishedAt: "2026-09-08T23:30:00+08:00"
language: en
tags:
  - Concurrency
  - Atomic
  - CAS
  - Java
  - Go
  - Python
status: published
featured: false
series: concurrency-programming
translationOf: concurrency-series-05-atomic-cas
---

## Table of Contents

- [0. Continue from Mutexes](#0-continue-from-mutexes)
- [1. The Semantic Boundary of Atomics](#1-the-semantic-boundary-of-atomics)
  - [1.1 Atomicity: One Atomic Operation Cannot Interleave](#11-atomicity-one-atomic-operation-cannot-interleave)
  - [1.2 Visibility: When Do Writes Before an Atomic Update Become Visible?](#12-visibility-when-do-writes-before-an-atomic-update-become-visible)
  - [1.3 Ordering: After Seeing the counter Update, ready Must Also Be Visible](#13-ordering-after-seeing-the-counter-update-ready-must-also-be-visible)
  - [1.4 The Relationship Between Atomic RMW and CAS](#14-the-relationship-between-atomic-rmw-and-cas)
- [2. Atomics in Java, Go, and CPython](#2-atomics-in-java-go-and-cpython)
  - [2.1 Java: AtomicInteger](#21-java-atomicinteger)
  - [2.2 Go: sync/atomic](#22-go-syncatomic)
  - [2.3 CPython: No Symmetric Application-level Atomic API](#23-cpython-no-symmetric-application-level-atomic-api)
  - [2.4 Comparing the Three Languages](#24-comparing-the-three-languages)
- [3. Choosing Between Atomic and Mutex](#3-choosing-between-atomic-and-mutex)
- [4. Next: How Atomics Are Implemented](#4-next-how-atomics-are-implemented)

---

## 0. Continue from Mutexes

The previous two articles used the same example to discuss mutexes:

```text
counter++
```

A mutex uses a low-level atomic operation to control entry to a critical section, preventing the entire critical section from interleaving with another one:

```text
lock
counter++
unlock
```

If the requirement is only to update one counter, languages often provide a smaller synchronization primitive:

```text
atomically increment counter by 1
```

This article stays at the language-semantics level: what may a programmer rely on when using an Atomic API? The next article follows those guarantees through the compiler and runtime down to the CPU.

---

## 1. The Semantic Boundary of Atomics

### 1.1 Atomicity: One Atomic Operation Cannot Interleave

As we have already seen, an ordinary `counter++` first reads the old value, increments it, and writes the result back. This kind of operation is called Read-Modify-Write, or RMW.

The steps of an ordinary RMW can interleave with another execution unit:

```text
Thread A                    Thread B

read counter -> 0           read counter -> 0
add 1 -> 1                  add 1 -> 1
write counter = 1           write counter = 1
```

Both sides execute `counter++` once, yet the result can still be `1`.

An atomic RMW makes the update indivisible:

```text
Thread A                    Thread B

atomic counter + 1          atomic counter + 1
        │                           │
        ▼                           ▼
      0 -> 1                       1 -> 2
```

This atomicity applies to the single atomic operation. It does not automatically merge ordinary code before and after it into one critical section.

### 1.2 Visibility: When Do Writes Before an Atomic Update Become Visible?

Continue with `counter + ready`:

```text
Thread A                    Thread B

ready = true
atomic counter + 1

                            atomic read counter = 1
                            if counter == 1 {
                                print(ready)
                            }
```

We want:

```text
B reads counter = 1
        ↓
B then reads ready = true
```

Whether that result is guaranteed cannot be decided only by asking whether the increment of `counter` is indivisible. We also need the language to define a synchronization relationship between A's atomic update and B's atomic read.

If B's atomic read observes A's update, then the ordinary write `ready = true` performed before A's update must also become visible to B under the relevant memory semantics.

### 1.3 Ordering: After Seeing the counter Update, ready Must Also Be Visible

Visibility asks whether B can see A's write `ready = true`. Ordering asks whether B can already observe the new `counter` while still failing to observe the earlier write to `ready`.

```text
Execution Unit A                             Execution Unit B
   │                                            │
   ├─ write ready = true                        │
   └─ atomic counter + 1 ────────────────────>├─ atomic read counter = 1
                                                └─ read ready = true
```

If B has already read:

```text
counter = 1
```

then, under the synchronization relationship assumed by this example, a subsequent read of `ready` must not return:

```text
ready = false
```

The atomic operation on `counter` therefore needs more than indivisible arithmetic. It also needs the appropriate memory-order semantics so that observing the published `counter` value establishes the required relationship with the preceding `ready = true` write.

### 1.4 The Relationship Between Atomic RMW and CAS

Atomic RMW is a category of atomic update:

```text
Atomic RMW
    ├── Fetch-And-Add
    ├── Exchange
    ├── Compare-And-Swap
    └── Atomic Bitwise Operation
```

CAS, or Compare-And-Swap, is only one member of that category. It means: write a new value only if the current value still equals the expected value.

```text
CAS(counter, expected, newValue)
```

```text
read current counter
        ↓
does it equal expected?
   /             \
 yes              no
 │                 │
 ▼                 ▼
write newValue     do not modify
return success     return failure
```

When a new value has to be calculated from the old one, CAS can be used in a retry loop:

```text
loop:
    old = atomic read counter
    new = old + 1

    if CAS(counter, old, new):
        break
```

But “atomically increment `counter`” does not mean “must use a CAS loop.” If the target platform provides a direct atomic-add primitive, the runtime may use that instead.

---

## 2. Atomics in Java, Go, and CPython

### 2.1 Java: AtomicInteger

Java can use `AtomicInteger` to store and atomically update an `int`. Continue with the same `counter + ready` example: `counter` is an `AtomicInteger`, while `ready` is an ordinary `boolean`.

```java
private final AtomicInteger counter = new AtomicInteger(0);
private boolean ready = false;
```

First, atomically increment `counter`:

```java
counter.incrementAndGet();
```

[`AtomicInteger.incrementAndGet()`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html#incrementAndGet()) states:

> **“Atomically increments the current value, with memory effects as specified by `VarHandle.getAndAdd(Object...)`.”**

That first gives atomicity: `incrementAndGet()` performs the read, increment, and write-back of `counter` as one atomic update. Two concurrent invocations cannot interleave as an ordinary RMW could:

```text
Thread A                    Thread B

incrementAndGet()           incrementAndGet()
        │                           │
        ▼                           ▼
      0 -> 1                       1 -> 2
```

Now use the same `AtomicInteger counter` to discuss visibility and ordering. The update performed by `incrementAndGet()` has the memory effects of `VarHandle.getAndAdd`, including volatile-style access semantics relevant here, while `counter.get()` has the memory effects of a volatile read.

For this example, use the volatile synchronization rule without expanding the complete volatile model yet. The dedicated volatile article does that later.

[JLS §17.4.5 Happens-before Order](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.4.5) states:

> **“A write to a `volatile` field happens-before every subsequent read of that field.”**

That relationship provides the visibility and ordering needed by the example:

```java
// Thread A
ready = true;
counter.incrementAndGet();

// Thread B
if (counter.get() == 1) {
    System.out.println(ready);
}
```

For visibility, A writes the ordinary variable `ready = true` before updating `counter`. If B's `counter.get()` observes the value published by A, the preceding write to `ready` is also visible to B through the established happens-before chain.

For ordering, A's program order, the synchronization relationship through `counter`, and B's subsequent ordinary read are connected into one happens-before chain. B therefore cannot observe:

```text
counter = 1
ready = false
```

The three semantics can be summarized as:

```text
Atomicity
one incrementAndGet update cannot interleave

Visibility
when get observes the atomic update, earlier writes can become visible through the synchronization relationship

Ordering
the atomic update/read relationship combines with program order to form happens-before
```

One important detail: B uses [`AtomicInteger.get()`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html#get()) above. If it were replaced by [`AtomicInteger.getPlain()`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html#getPlain()), the same conclusion about `ready` would not follow, because `getPlain()` has plain-read memory semantics rather than the volatile-style synchronization used in this example.

### 2.2 Go: sync/atomic

Go provides [`sync/atomic`](https://pkg.go.dev/sync/atomic):

```go
var counter atomic.Int64

counter.Add(1)
```

[`atomic.Int64.Add`](https://pkg.go.dev/sync/atomic#Int64.Add) states:

> **“Add atomically adds delta to x and returns the new value.”**

That gives atomicity: `Add(1)` performs the read, increment, and write-back as one atomic update. `CompareAndSwap` performs a conditional update:

```go
counter.CompareAndSwap(oldValue, newValue)
```

[The Go Memory Model - Atomic Values](https://go.dev/ref/mem#atomic) states:

> **“If the effect of an atomic operation A is observed by atomic operation B, then A is synchronized before B.”**

This relationship supplies the visibility and ordering needed by the same publication example. The Go memory model also requires the atomic operations in a program to be explainable by a sequentially consistent ordering.

Continue with `counter + ready`:

```go
var counter atomic.Int64
var ready bool

// Goroutine A
ready = true
counter.Add(1)

// Goroutine B
if counter.Load() == 1 {
    fmt.Println(ready)
}
```

For visibility, if B's `counter.Load()` observes A's `Add(1)`, A's atomic update is synchronized-before B's atomic read. The ordinary write `ready = true` before A's update is therefore visible to B through happens-before.

For ordering, A's program order, `counter.Add(1) → counter.Load()`, and B's later ordinary read form the required happens-before chain. B cannot observe `counter = 1, ready = false` in this synchronized execution.

The three semantics are:

```text
Atomicity
one Add / CompareAndSwap update cannot interleave

Visibility
observing the atomic update also exposes writes ordered before that synchronization point

Ordering
the atomic rule and program order form happens-before
```

### 2.3 CPython: No Symmetric Application-level Atomic API

Python's standard library does not provide a general integer Atomic API symmetric with Java's `AtomicInteger` or Go's `atomic.Int64`.

An ordinary Python expression such as `counter += 1` is also not a public Atomic API. A particular CPython version having a GIL, or the runtime using atomic operations internally, does not turn that expression into a cross-implementation guarantee that application code should rely on.

So this article does not invent an artificial CPython equivalent. The next implementation article instead looks at where the CPython runtime itself uses atomic operations.

### 2.4 Comparing the Three Languages

| | Java | Go | CPython |
|---|---|---|---|
| Single-variable Atomic API | `AtomicInteger`, etc. | `atomic.Int64`, etc. | No symmetric general integer API |
| Atomic addition | `incrementAndGet()` | `Add(1)` | No corresponding public API |
| CAS | `compareAndSet()` | `CompareAndSwap()` | Used internally by the runtime, not an ordinary Python API |
| Memory-semantics source | JMM, VarHandle, and Atomic APIs | Go Memory Model | No corresponding application-level Atomic semantics |
| `counter + ready` example | Atomic/volatile semantics | Atomic synchronization rule | No directly corresponding Atomic example |

All three languages need explicit synchronization boundaries, but their public APIs and specification layers differ.

---

## 3. Choosing Between Atomic and Mutex

Continue with `counter`.

If the requirement is only:

```text
counter++
```

and the language provides an Atomic Add, an atomic operation directly expresses the single-variable update:

```text
atomically increment counter by 1
```

If the requirement is to protect a multi-step critical section:

```text
lock
counter = counter + 1
ready = true
unlock
```

a mutex is more direct. It protects the entire sequence instead of independently making individual accesses to two variables atomic.

`counter + ready` can also be used as a publication pattern: write the ordinary variable `ready` first, then publish through an Atomic `counter` operation with the required memory semantics. That works only when the reader actually observes the corresponding atomic update and the requirement is one-way publication, not an invariant requiring multiple fields to change as one indivisible transaction.

| Problem | Atomic | Mutex |
|---|---|---|
| Single-variable `counter++` | Good fit | Works, but protects a larger scope |
| Conditional single-variable update based on old value | CAS can express it | Can express it |
| One-way publication with `counter + ready` | Works with the required memory semantics | Works |
| Multiple operations forming one critical section | Does not provide this automatically | Good fit |
| Multiple variables that must preserve one invariant together | Easy to get the boundary wrong | More direct |

The selection criterion is the scope of state that must be protected, not whether an API happens to contain the word `Atomic` or `Mutex`.

---

## 4. Next: How Atomics Are Implemented

The next article follows Atomic operations in Java, Go, and CPython through their compiler/runtime implementations down to the CPU.
