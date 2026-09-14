---
title: "Concurrency Programming (7): volatile — Visibility and Ordering for ready and counter"
description: "Uses the counter + ready example to explain the visibility and ordering guarantees of Java volatile, and why Go and Python do not have an equivalent volatile keyword."
publishedAt: "2026-09-08T23:41:00+08:00"
language: en
tags:
  - Concurrency
  - volatile
  - Java
  - Go
  - Python
  - Memory Model
status: published
featured: false
series: concurrency-programming
translationOf: concurrency-series-07-volatile
---

## Table of Contents

- [0. From Atomic to volatile](#0-from-atomic-to-volatile)
- [1. What Do We Need to Guarantee This Time?](#1-what-do-we-need-to-guarantee-this-time)
- [2. Java: volatile](#2-java-volatile)
  - [2.1 How Is happens-before Established?](#21-how-is-happens-before-established)
  - [2.2 volatile Does Not Guarantee Atomicity](#22-volatile-does-not-guarantee-atomicity)
  - [2.3 synchronized, Atomic, and volatile](#23-synchronized-atomic-and-volatile)
- [3. Go Has No volatile Keyword](#3-go-has-no-volatile-keyword)
- [4. CPython Has No volatile Keyword](#4-cpython-has-no-volatile-keyword)
- [5. Comparing the Three Languages](#5-comparing-the-three-languages)
- [6. When Is This Pattern Appropriate?](#6-when-is-this-pattern-appropriate)
- [7. Next: From Mutex to Read-Write Locks](#7-next-from-mutex-to-read-write-locks)

---

## 0. From Atomic to volatile

The previous two articles centered on `counter++`: Atomic operations make a Read-Modify-Write update indivisible, and the runtime maps those semantics onto CPU atomic instructions and memory ordering.

But not every scenario needs an atomic update. Return to the `counter + ready` example:

```text
counter = 0
ready = false
```

Thread A:

```text
counter = 1
ready = true
```

Thread B:

```text
if ready {
    print(counter)
}
```

There are not multiple threads jointly updating `counter`. We only want this guarantee:

> If Thread B has observed `ready = true`, then its subsequent read of `counter` must return `1`, not the stale value `0`.

---

## 1. What Do We Need to Guarantee This Time?

Write out the order within the two threads:

```text
Thread A                         Thread B

counter = 1                     read ready
     │                               │
     ▼                               ▼
ready = true                    read counter
```

The program needs to establish this relationship:

```text
A writes counter
      ↓
A writes ready
      ↓  synchronization relationship
B reads ready
      ↓
B reads counter
```

Without a synchronization relationship in the middle, observing `ready = true` is not enough by source-code order alone to conclude that Thread B must also observe `counter = 1`.

So this example mainly needs two guarantees:

| Problem | Required guarantee |
|---|---|
| Can B observe A's `counter = 1`? | Visibility |
| Can the observable effect of `counter = 1` appear after `ready = true`? | Ordering |

This scenario does not require an atomic RMW such as `counter++`, so for now the focus is visibility and ordering rather than atomicity.

---

## 2. Java: volatile

Java can declare `ready` as `volatile`:

```java
int counter = 0;
volatile boolean ready = false;

// Thread A
counter = 1;
ready = true;

// Thread B
if (ready) {
    System.out.println(counter);
}
```

Only `ready` is volatile. `counter` remains an ordinary variable.

That is enough because Thread B uses `ready` to determine whether Thread A has finished publishing the state of `counter`.

### 2.1 How Is happens-before Established?

[JLS §17.4.4](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.4.4) defines a synchronizes-with relationship from a write to a `volatile` variable to a subsequent read of that same variable by another thread.

Applied to this example:

```text
Thread A                         Thread B

counter = 1
    │
    │ program order
    ▼
volatile ready = true
    │
    └── synchronizes-with ─────────► read volatile ready == true
                                          │
                                          │ program order
                                          ▼
                                      read counter
```

Through happens-before transitivity:

```text
A writes counter
    happens-before
B reads counter
```

Therefore, once B reads the `ready = true` value written by A, B's following read of `counter` must observe `1`.

That is the useful way to understand `volatile` here. It is not best modeled as “always force a read from main memory.” The JMM constrains which program outcomes are observable.

### 2.2 volatile Does Not Guarantee Atomicity

Consider:

```java
volatile int counter = 0;

counter++;
```

Even though `counter` is volatile, `counter++` still contains a compound operation conceptually equivalent to:

```text
LOAD
ADD
STORE
```

`volatile` does not turn those steps into one indivisible RMW. If multiple threads concurrently execute `counter++`, use `AtomicInteger` or a mutex instead.

### 2.3 synchronized, Atomic, and volatile

Atomic is not a Java keyword; this table uses common `AtomicInteger` methods as the representative Atomic API:

| | `synchronized` | `AtomicInteger` | `volatile` |
|---|---|---|---|
| Atomicity | Entire protected critical section cannot interleave | Single-variable RMW methods such as `incrementAndGet()` are atomic | Does not provide compound-operation atomicity |
| Visibility | Writes before unlock are visible after a subsequent lock on the same monitor | Common `get()`, `set()`, and RMW methods provide their documented memory effects | A volatile write is visible to a subsequent read of that volatile variable under the JMM rule |
| Ordering | Unlock and subsequent lock establish ordering | Common methods establish ordering according to their specified memory effects | Volatile write and subsequent read establish the relevant ordering |

---

## 3. Go Has No volatile Keyword

Go has no keyword corresponding to Java `volatile`. `sync/atomic` provides Atomic APIs; it is not simply “Go's version of volatile.”

When synchronization is required in Go, use the synchronization operation whose semantics match the problem—such as atomics, mutexes, or channels—rather than looking for a volatile field modifier.

---

## 4. CPython Has No volatile Keyword

Python also has no keyword corresponding to Java `volatile`. `threading.Event` is a thread-communication API, not a volatile field, and the GIL is not a replacement for a volatile synchronization relationship.

Use explicit synchronization APIs whose behavior is documented for the communication pattern you need.

---

## 5. Comparing the Three Languages

| | Java | Go | CPython |
|---|---|---|---|
| `volatile` keyword | Yes | No | No |

The absence of a keyword does not mean Go or Python cannot synchronize publication. It means their public concurrency abstractions express the synchronization boundary differently.

---

## 6. When Is This Pattern Appropriate?

This pattern fits a one-way publication shape:

```text
write a group of state
      ↓
publish one flag last
      ↓
another execution unit observes the flag and then reads the state
```

Examples include:

- initialization-complete flags;
- configuration-loaded flags;
- background-task stop requests;
- safe publication of an immutable object.

It is not enough when:

- multiple threads concurrently execute `counter++`;
- several fields must change as one indivisible transaction;
- code checks state and then conditionally modifies it;
- contenders need queuing or blocking around a critical section.

Those problems call for Atomic RMW, CAS, or a mutex rather than merely applying `volatile` to one field.

---

## 7. Next: From Mutex to Read-Write Locks

A mutex permits only one thread in the critical section at a time. Even when several threads only read data, they still wait for each other.

The next article continues with shared memory and asks how a read-write lock allows multiple readers to proceed together, comparing Java `ReentrantReadWriteLock`, Go `sync.RWMutex`, and the corresponding situation in CPython.
