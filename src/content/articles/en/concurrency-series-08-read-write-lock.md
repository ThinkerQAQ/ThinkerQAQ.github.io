---
title: "Concurrency Programming (8): From Mutex to Read-Write Locks"
description: "Continues with counter and counter + ready to explain how read-write locks allow concurrent readers, comparing Java's Lock API, Go sync.RWMutex, and the situation in CPython."
publishedAt: "2026-09-11T15:30:00+08:00"
language: en
tags:
  - Concurrency
  - Read-Write Lock
  - RWMutex
  - Java
  - Go
  - Python
status: published
featured: false
series: concurrency-programming
translationOf: concurrency-series-08-read-write-lock
---

## Table of Contents

- [0. Return to Mutex](#0-return-to-mutex)
- [1. What Does a Read-Write Lock Guarantee?](#1-what-does-a-read-write-lock-guarantee)
  - [1.1 Atomicity: A Writer Cannot Interleave with Other Readers or Writers](#11-atomicity-a-writer-cannot-interleave-with-other-readers-or-writers)
  - [1.2 Visibility: A Reader Must See an Earlier Writer's Update](#12-visibility-a-reader-must-see-an-earlier-writers-update)
  - [1.3 Ordering: The Write-Lock-to-Read-Lock Boundary Still Orders Memory](#13-ordering-the-write-lock-to-read-lock-boundary-still-orders-memory)
- [2. Read-Write Locks in Java, Go, and CPython](#2-read-write-locks-in-java-go-and-cpython)
  - [2.1 Java: ReentrantReadWriteLock](#21-java-reentrantreadwritelock)
  - [2.2 Go: sync.RWMutex](#22-go-syncrwmutex)
  - [2.3 CPython: No Corresponding RWLock in the Standard Library](#23-cpython-no-corresponding-rwlock-in-the-standard-library)
  - [2.4 Comparing the Three Languages](#24-comparing-the-three-languages)
- [3. When Should You Use a Read-Write Lock?](#3-when-should-you-use-a-read-write-lock)
- [4. Next: AQS and Read-Write Lock Implementation](#4-next-aqs-and-read-write-lock-implementation)

---

## 0. Return to Mutex

Continue with the same `counter`.

Because several threads may read and write it, protecting `counter` with one mutex is correct.

But if Thread A and Thread B both only want to read `counter`, B still waits for A to release the mutex:

```text
Thread A                         Thread B

lock
  │
  ▼
read counter
  │
  ▼
unlock ────────────────────────► lock
                                   │
                                   ▼
                               read counter
                                   │
                                   ▼
                                 unlock
```

Reads do not modify `counter`, so when no writer exists, A and B could in principle run at the same time. A read-write lock exposes exactly that additional concurrency: readers take a read lock and may enter together, while a writer takes a write lock and remains exclusive.

```text
Thread A                         Thread B

readLock                        readLock
    │                               │
    ▼                               ▼
read counter                    read counter
    │                               │
    ▼                               ▼
readUnlock                      readUnlock
```

A read-write lock therefore preserves exclusion between reads and writes and between two writes. It only stops forcing two readers to wait for each other:

| Operations from two threads | Mutex | Read-write lock |
|---|---|---|
| Read–Read | Cannot run concurrently | Can run concurrently |
| Read–Write | Cannot run concurrently | Cannot run concurrently |
| Write–Write | Cannot run concurrently | Cannot run concurrently |

---

## 1. What Does a Read-Write Lock Guarantee?

A read-write lock exposes two entry modes:

```text
Read lock: protects read-only work and permits multiple readers
Write lock: protects modifications and permits only one writer
```

### 1.1 Atomicity: A Writer Cannot Interleave with Other Readers or Writers

If Thread A is modifying `counter`, Thread B must wait whether it wants to read or write:

```text
Thread A (writer)                 Thread B (reader)

writeLock                         wait
    │                               │
    ▼                               │
counter++                           │
    │                               │
    ▼                               ▼
writeUnlock ───────────────────► readLock
                                    │
                                    ▼
                                read counter
```

The `counter++` protected by the write lock therefore cannot interleave with another protected read or write. A read lock should be used for read-only work; modifying shared state while holding only a read lock violates the intended protection boundary.

### 1.2 Visibility: A Reader Must See an Earlier Writer's Update

A read-write lock controls not only who may enter, but also the synchronization relationship between a completed writer and a subsequent reader:

```text
Thread A (writer)                 Thread B (reader)

writeLock
    │
    ▼
counter = 1
    │
    ▼
writeUnlock ─── synchronization ─► readLock
                                       │
                                       ▼
                                   read counter = 1
```

If B acquires the read lock after A releases the write lock under the API's synchronization rules, B must be able to observe A's completed update `counter = 1`.

### 1.3 Ordering: The Write-Lock-to-Read-Lock Boundary Still Orders Memory

Return to `counter + ready`:

```text
Thread A (writer)                 Thread B (reader)

writeLock
    │
    ▼
counter = 1
    │
    ▼
ready = true
    │
    ▼
writeUnlock ─── synchronization ─► readLock
                                       │
                                       ▼
                                   read ready = true
                                       │
                                       ▼
                                   read counter = 1
```

The synchronization boundary connects A's writes, release of the write lock, B's acquisition of the read lock, and B's reads. B therefore must not observe `ready = true` while still observing the old `counter = 0` when the documented synchronization relationship applies.

---

## 2. Read-Write Locks in Java, Go, and CPython

Instead of repeating the conclusions, this section looks at the official Java and Go rules from which atomicity, visibility, and ordering follow.

### 2.1 Java: ReentrantReadWriteLock

Java's [`ReadWriteLock`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/ReadWriteLock.html) states about exclusion:

> **“The write lock is exclusive.”**

While one thread holds the write lock, other readers and writers cannot enter. When no writer holds the lock, several threads may hold the read lock concurrently.

For visibility and ordering, the same API documentation states:

> **“A thread successfully acquiring the read lock will see all updates made upon previous release of the write lock.”**

That directly matches the earlier `counter` example: after A releases the write lock, B subsequently acquiring the read lock can observe the updates A completed. This provides both the required visibility and ordering boundary.

Reads and writes should acquire their corresponding locks:

```java
int counter = 0;

ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();
Lock readLock = rwLock.readLock();
Lock writeLock = rwLock.writeLock();

int readCounter() {
    readLock.lock();
    try {
        return counter;
    } finally {
        readLock.unlock();
    }
}

void incrementCounter() {
    writeLock.lock();
    try {
        counter++;
    } finally {
        writeLock.unlock();
    }
}

// Thread A
int a = readCounter();

// Thread B
int b = readCounter();
```

Threads A and B acquire only the read lock, so the two `readCounter()` calls may execute concurrently. Once `incrementCounter()` acquires the write lock, other readers and writers wait.

### 2.2 Go: sync.RWMutex

Go's [`sync.RWMutex`](https://pkg.go.dev/sync#RWMutex) directly provides `RLock/RUnlock` and `Lock/Unlock`. Its exclusion rule is summarized as:

> **“The lock can be held by an arbitrary number of readers or a single writer.”**

So multiple readers may hold the read lock concurrently, while a writer must hold the lock exclusively.

The documentation also defines the synchronization relationship between a writer's `Unlock` and a later `RLock`, including the rule that the relevant `Unlock` synchronizes before the `RLock` returns.

Applied to `counter`, A completes its write before `Unlock`, and B later successfully returns from `RLock`; B can therefore observe A's write. This gives the visibility and ordering relationship required by the earlier example. The API also defines ordering involving `RUnlock` and later writers so that a writer waits behind existing readers.

```go
var counter int
var rw sync.RWMutex

func readCounter() int {
    rw.RLock()
    defer rw.RUnlock()
    return counter
}

func incrementCounter() {
    rw.Lock()
    defer rw.Unlock()
    counter++
}

// Goroutine A
a := readCounter()

// Goroutine B
b := readCounter()
```

Goroutines A and B may read `counter` concurrently. Once a goroutine acquires the write lock, other readers and writers wait.

### 2.3 CPython: No Corresponding RWLock in the Standard Library

Python's [`threading`](https://docs.python.org/3/library/threading.html) standard library provides `Lock` and `RLock`, but no public `ReadWriteLock` or `RWLock` type.

Here `RLock` means **Reentrant Lock**: the same thread may acquire the same lock repeatedly. It does not mean Read Lock and does not permit several readers merely because their work is read-only.

If a Python project genuinely needs a read-write lock, it has to choose a third-party implementation or provide an explicit abstraction with well-defined semantics. `RLock` should not be treated as a substitute.

### 2.4 Comparing the Three Languages

| | Java | Go | CPython |
|---|---|---|---|
| Read-write lock API | `ReentrantReadWriteLock` | `sync.RWMutex` | No corresponding standard-library type |
| Read lock | `readLock().lock()` | `RLock()` | — |
| Write lock | `writeLock().lock()` | `Lock()` | — |
| Concurrent readers | Yes | Yes | — |
| Writer | Exclusive | Exclusive | — |
| Rule source | `ReadWriteLock` memory-synchronization rules | Go Memory Model / `RWMutex` API | No corresponding API rule |

---

## 3. When Should You Use a Read-Write Lock?

A read-write lock is a candidate when:

- reads substantially outnumber writes;
- multiple threads actually contend for the same state;
- read-side critical sections are long enough that concurrent readers can repay the additional lock-management overhead.

It is not automatically faster than a mutex. If reads are very short, writes are frequent, or contention is negligible, a plain mutex is usually simpler. Whether a read-write lock improves performance should ultimately be decided by benchmarking and profiling.

Lock upgrading and downgrading also require care:

- Java `ReentrantReadWriteLock` does not support upgrading from the read lock to the write lock, but it does support downgrading from write to read;
- Go `sync.RWMutex` supports neither upgrading nor downgrading.

Do not simply wait for a write lock while still holding a read lock; that pattern can easily deadlock or otherwise block progress.

---

## 4. Next: AQS and Read-Write Lock Implementation

This article establishes what read-write locks guarantee and which APIs Java and Go expose. Their implementation paths are different.

The next article can begin with Java `ReentrantLock` to establish AQS: `ReentrantLock` uses AQS exclusive mode, while `ReentrantReadWriteLock` uses both shared and exclusive modes. After contention, AQS manages the wait queue and blocking/wakeup of threads.

Go has no AQS. `sync.RWMutex` combines atomic counters, a mutex, and runtime semaphores to track readers and waiting writers, parking or waking goroutines under contention.

From there, both paths can be followed further down to CAS, atomic increments/decrements, waiting, and wakeup to see how a read-write lock reaches the runtime and CPU.
