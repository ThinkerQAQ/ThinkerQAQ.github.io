---
title: "Concurrency Programming (3): Mutexes — Atomicity, Visibility, and Ordering at the Language Level"
description: "Continues with counter++ to explain how mutexes provide atomicity, visibility, and ordering, then compares Java synchronized, Go sync.Mutex, and CPython threading.Lock."
publishedAt: "2026-09-08T18:32:54+08:00"
updatedAt: "2026-09-10T19:26:42+08:00"
language: en
tags:
  - Concurrency
  - Mutex
  - Java
  - Go
  - Python
status: published
featured: false
series: concurrency-programming
translationOf: concurrency-series-03-mutex
---

## Table of Contents

- [0. Continue from the Previous Article](#0-continue-from-the-previous-article)
- [1. What Does a Mutex Guarantee?](#1-what-does-a-mutex-guarantee)
  - [1.1 Atomicity: Critical Sections Cannot Interleave](#11-atomicity-critical-sections-cannot-interleave)
  - [1.2 Visibility: A Later Critical Section Must Observe Earlier Writes](#12-visibility-a-later-critical-section-must-observe-earlier-writes)
  - [1.3 Ordering: A Lock Is Also a Memory-Ordering Boundary](#13-ordering-a-lock-is-also-a-memory-ordering-boundary)
- [2. How Do the Three Languages Define This Synchronization Boundary?](#2-how-do-the-three-languages-define-this-synchronization-boundary)
  - [2.1 Java: synchronized and Monitors](#21-java-synchronized-and-monitors)
  - [2.2 Go: sync.Mutex](#22-go-syncmutex)
  - [2.3 CPython: threading.Lock](#23-cpython-threadinglock)
- [3. Next: How Is a Mutex Implemented?](#3-next-how-is-a-mutex-implemented)

---

## 0. Continue from the Previous Article

The previous article discussed language memory models: what Java, Go, and CPython allow programmers to rely on.

Now we move to the first concrete synchronization tool:

```text
Mutex
```

This article continues to use `counter++` and stays at the language level:

> **What does a mutex actually guarantee to a programmer?**

How those guarantees are implemented by runtimes and eventually mapped onto CPU primitives is left for the next article.

---

## 1. What Does a Mutex Guarantee?

Start again with:

```text
counter++
```

At the CPU level we can simplify it as:

```text
LOAD  counter
ADD   1
STORE counter
```

If two execution units perform these steps concurrently, this interleaving is possible:

```text
Thread A                    Thread B

LOAD counter -> 0
                            LOAD counter -> 0
ADD 1 -> 1
                            ADD 1 -> 1
STORE counter = 1
                            STORE counter = 1
```

The final value is `counter = 1`.

Protect `counter++` with the same lock:

```text
Thread A                    Thread B

lock
LOAD counter -> 0
ADD 1
STORE counter = 1
unlock

                            lock
                            LOAD counter -> 1
                            ADD 1
                            STORE counter = 2
                            unlock
```

Now the final value is `counter = 2`.

But a lock provides more than “two execution units cannot enter at the same time.”

### 1.1 Atomicity: Critical Sections Cannot Interleave

The code between `lock` and `unlock` is the critical section. When the same lock protects a critical section, another execution unit using that lock cannot enter until the current one finishes.

Here, atomicity does not mean that `counter++` becomes one CPU instruction. It means that the sequence:

```text
LOAD counter
ADD 1
STORE counter
```

cannot be interleaved with the same protected critical section from another execution unit before the current holder releases the lock.

### 1.2 Visibility: A Later Critical Section Must Observe Earlier Writes

Suppose A executes first:

```text
Thread A

lock
counter++       // counter = 1
unlock
```

Then B acquires the same lock:

```text
Thread B

lock
print(counter)  // must observe 1
unlock
```

The memory effects completed before the previous holder releases the lock must therefore be observable by a later execution unit that acquires the same lock under the language's synchronization rules.

### 1.3 Ordering: A Lock Is Also a Memory-Ordering Boundary

Consider:

```text
counter = 0
ready = false
```

```text
Thread A                    Thread B

lock                        lock
counter++                   if ready {
ready = true                   print(counter)
unlock                      }
                            unlock
```

If B acquires the same lock and observes:

```text
ready = true
```

then the subsequent read of `counter` must observe `1`, not the stale `0`:

```text
Thread A                              Thread B
   │                                     │
   ├─ write counter = 1                  │
   ├─ write ready = true                 │
   └─ unlock ──── same lock ─────────>├─ lock
                                         ├─ read ready = true
                                         └─ read counter = 1
```

A lock therefore needs to answer all three questions:

| Question | What the programmer can rely on |
|---|---|
| Atomicity | Critical sections protected by the same lock cannot interleave |
| Visibility | Writes completed by an earlier critical section can be observed by a later critical section |
| Ordering | After acquiring the same lock, later execution must observe results consistent with the synchronization ordering established by the earlier critical section |

---

## 2. How Do the Three Languages Define This Synchronization Boundary?

With all three lock APIs, the programmer ultimately cares about atomicity, visibility, and ordering. Instead of repeating the conclusions, this section looks at the rule each specification or API provides and how the guarantees follow from it.

### 2.1 Java: synchronized and Monitors

Java's `synchronized` locks the monitor associated with an object. [JLS §17.1](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.1) states:

> **“Only one thread at a time may hold a lock on a monitor.”**

This rule provides the exclusion needed for atomicity. At most one thread can hold the monitor, so only that thread may execute the protected critical section while competitors wait.

[JLS §17.4.5](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.4.5) also states:

> **“An unlock on a monitor happens-before every subsequent lock on that monitor.”**

This rule provides both visibility and ordering.

For visibility, A's writes are before its `unlock`, while B's reads are after the subsequent `lock`. Through happens-before transitivity, the writes in A's critical section become visible to B.

For ordering, A's program order, the `unlock → lock` relationship, and B's program order form one happens-before chain. B therefore cannot observe a result such as `ready = true, counter = 0` when that would violate the established ordering.

### 2.2 Go: sync.Mutex

Go's `sync.Mutex` is not owned by a particular goroutine and is not reentrant. [`sync.Mutex.Lock`](https://pkg.go.dev/sync#Mutex.Lock) states:

> **“If the lock is already in use, the calling goroutine blocks until the mutex is available.”**

This gives the exclusion needed for atomicity. While one goroutine holds the mutex, other goroutines attempting to acquire the same mutex wait rather than entering the critical section.

[The Go Memory Model - Locks](https://go.dev/ref/mem#Locks) further states:

> **“For any `sync.Mutex` or `sync.RWMutex` variable `l` and n < m, call n of `l.Unlock()` is synchronized before call m of `l.Lock()` returns.”**

This rule provides visibility and ordering.

For visibility, A's writes are sequenced-before `Unlock`; `Unlock` is synchronized-before B's `Lock` returns; B's reads are sequenced after that return. Together these relationships form happens-before, so A's writes are visible to B.

For ordering, the same happens-before chain connects A's writes, `Unlock → Lock`, and B's reads. B likewise cannot observe `ready = true, counter = 0` when the synchronization relationship requires the earlier `counter` write to be visible.

### 2.3 CPython: threading.Lock

Python's official [`threading.Lock`](https://docs.python.org/3/library/threading.html#lock-objects) documentation states:

> **“A primitive lock is a synchronization primitive that is not owned by a particular thread when locked.”**
>
> **“All methods are executed atomically.”**

The locking semantics provide mutual exclusion: when the lock is already acquired, another thread's `acquire()` waits until the lock becomes available, so the same lock serializes entry into the protected critical section.

Visibility and ordering cannot be derived from a formal language-level memory-model rule in the same way as in Java or Go. Python does not define a general `release → acquire` happens-before relationship comparable to those specifications; the documentation defines Lock as a synchronization primitive.

Python programs should therefore use the same Lock to synchronize shared state rather than depending on the GIL or on whether a particular bytecode sequence happens to be interruptible in a particular implementation. How CPython implements the cross-critical-section synchronization boundary is an implementation question for the next article.

---

## 3. Next: How Is a Mutex Implemented?

This article stops at the language level. The next article, [“Concurrency Programming (4): Mutex Implementation — From Runtime to CPU”](/en/articles/concurrency-series-04-mutex-implementation/), follows the same three questions down into the implementation layer:

- Atomicity: how does an atomic RMW operation determine who acquires the lock?
- Visibility: how do writes before release become observable to a later acquirer?
- Ordering: how do the compiler and CPU preserve the synchronization boundary?

Spin, park, and wakeup after a failed acquisition are treated separately as scheduling concerns.
