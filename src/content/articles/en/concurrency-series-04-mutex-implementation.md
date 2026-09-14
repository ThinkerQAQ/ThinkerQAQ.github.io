---
title: "Concurrency Programming (4): Mutex Implementation — From Runtime to CPU"
description: "Follows the real implementation paths of Java synchronized, Go sync.Mutex, and CPython threading.Lock to see how mutexes use atomic operations, memory ordering, waiting, and wakeup."
publishedAt: "2026-09-08T23:11:56+08:00"
language: en
tags:
  - Concurrency
  - Mutex
  - JVM
  - Go Runtime
  - CPython
status: published
featured: false
series: concurrency-programming
translationOf: concurrency-series-04-mutex-implementation
---

## Table of Contents

- [0. What Does This Article Continue to Answer?](#0-what-does-this-article-continue-to-answer)
- [1. What Low-level Capabilities Does a Lock Need?](#1-what-low-level-capabilities-does-a-lock-need)
  - [1.1 Acquiring a Lock: Atomically Change Lock State](#11-acquiring-a-lock-atomically-change-lock-state)
  - [1.2 Failed Contention: Spin, Park, and Wakeup](#12-failed-contention-spin-park-and-wakeup)
  - [1.3 Release and Acquire: Establish a Memory-ordering Boundary](#13-release-and-acquire-establish-a-memory-ordering-boundary)
- [2. How Does HotSpot Implement synchronized?](#2-how-does-hotspot-implement-synchronized)
  - [2.1 From Java Source to a Monitor](#21-from-java-source-to-a-monitor)
  - [2.2 Uncontended: Lightweight Locking](#22-uncontended-lightweight-locking)
  - [2.3 Contended: ObjectMonitor](#23-contended-objectmonitor)
  - [2.4 Atomic Operations and Memory Ordering on x86-64](#24-atomic-operations-and-memory-ordering-on-x86-64)
  - [2.5 Java: From Runtime to CPU](#25-java-from-runtime-to-cpu)
- [3. How Does the Go Runtime Implement sync.Mutex?](#3-how-does-the-go-runtime-implement-syncmutex)
  - [3.1 Fast Path: Modify state Directly](#31-fast-path-modify-state-directly)
  - [3.2 Slow Path: Park the Goroutine](#32-slow-path-park-the-goroutine)
  - [3.3 Instructions on amd64](#33-instructions-on-amd64)
  - [3.4 Go: From Runtime to CPU](#34-go-from-runtime-to-cpu)
- [4. How Does CPython Implement threading.Lock?](#4-how-does-cpython-implement-threadinglock)
  - [4.1 From threading.Lock to PyMutex](#41-from-threadinglock-to-pymutex)
  - [4.2 Fast Path: Modify _bits](#42-fast-path-modify-_bits)
  - [4.3 Contention: Parking Lot](#43-contention-parking-lot)
  - [4.4 Implementation on Linux x86-64](#44-implementation-on-linux-x86-64)
  - [4.5 CPython: From Runtime to CPU](#45-cpython-from-runtime-to-cpu)
- [5. Comparing the Three Implementations](#5-comparing-the-three-implementations)
- [6. Next: Atomics](#6-next-atomics)

---

## 0. What Does This Article Continue to Answer?

The previous article described what a mutex guarantees to a programmer. This article goes one layer deeper: how do the runtime and CPU implement those guarantees?

We follow this path:

```text
Language rules: JMM / Go Memory Model / CPython documentation
        ↓
Compiler and Runtime: Monitor / Mutex / Lock
        ↓
CPU: Atomic RMW / Memory Ordering
```

The language rules define what results a program may rely on. The implementation is responsible for producing those results. The same language-level rule does not have to map to the same instruction sequence on every runtime or CPU architecture.

---

## 1. What Low-level Capabilities Does a Lock Need?

Ignore language differences for a moment and consider two execution units competing for the same lock:

```text
Thread A                    Thread B

lock                        lock
counter++                   counter++
unlock                      unlock
```

At minimum, the implementation must solve three problems.

### 1.1 Acquiring a Lock: Atomically Change Lock State

Suppose a lock has only one internal state:

```text
0 = unlocked
1 = locked
```

A and B must not both read `0` and then both write `1`, because each would believe it acquired the lock.

The operation “check the current state and change it to locked” therefore needs to be atomic, for example with Compare-And-Swap:

```text
Compare-And-Swap(lock_state, 0, 1)
```

With two competitors:

```text
CPU A                         CPU B

CAS 0 -> 1                   CAS 0 -> 1
    │                             │
    ▼                             ▼
  success                       failed
```

Only one competitor can successfully change the state. A mutex uses this small hardware-level atomic operation to protect an arbitrarily large critical section such as `counter++`.

### 1.2 Failed Contention: Spin, Park, and Wakeup

After CAS fails, an execution unit should not necessarily hammer the lock state forever.

A common strategy is:

```text
try atomic lock acquisition
        │
        ├── success ──> enter critical section
        │
        └── failure
              │
              ├── spin briefly
              │      │
              │      └── retry
              │
              └── park / wait
                         │
                         └── wake after lock release
```

Spinning is useful when the expected wait is very short because it avoids immediately entering an operating-system blocking path. If contention persists, parking avoids wasting CPU time.

The execution unit that waits differs across runtimes. Java and CPython ultimately block platform threads; Go can park only the current goroutine and let its OS thread run another goroutine.

### 1.3 Release and Acquire: Establish a Memory-ordering Boundary

Mutual exclusion alone is not enough. Continue with:

```text
Thread A                    Thread B

lock
counter++       // 1
ready = true
unlock

                            lock
                            if ready {
                                print(counter)
                            }
```

At the language level, the previous article established the required result: writes completed before A releases the lock must be observable after B subsequently acquires the same lock.

The implementation therefore has to connect this ordering:

```text
A's writes inside the critical section
        ↓
A releases the lock
        ↓
B acquires the same lock
        ↓
B reads inside the critical section
```

The compiler must not freely move critical-section memory accesses across the lock boundaries, and the CPU must provide suitable atomic and memory-ordering primitives. Cache coherence coordinates the relevant cache lines across cores.

Atomicity, visibility, and ordering should not be imagined as three unrelated CPU instructions. A single ordered atomic RMW operation can both compete for lock ownership and participate in establishing the synchronization boundary.

---

## 2. How Does HotSpot Implement synchronized?

Start with Java. The JMM specifies that an unlock on a monitor happens-before every subsequent lock on that monitor. In the running example, writes performed by A before leaving `synchronized` must be observable after B enters the same synchronized region.

The implementation question is how HotSpot realizes that rule:

```java
synchronized (lock) {
    counter++;
}
```

### 2.1 From Java Source to a Monitor

For a synchronized block, the Java compiler emits:

```text
monitorenter
monitorexit
```

[JVMS §6.5 monitorenter](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-6.html#jvms-6.5.monitorenter) explains that `monitorenter`, together with `monitorexit`, implements Java's `synchronized` statement.

The path is:

```text
Java Source
synchronized (lock) { counter++; }
        ↓
JVM Bytecode
monitorenter / monitorexit
        ↓
HotSpot interpreter or JIT
        ↓
Monitor associated with the object
```

These bytecodes mark where monitor acquisition and release occur. The JMM already defines what may be observed across those points; HotSpot-generated code must preserve that contract.

They are JVM bytecodes, however, not CPU instructions. The concrete locking path and ordering constraints still depend on the HotSpot implementation and target architecture.

### 2.2 Uncontended: Lightweight Locking

HotSpot does not send every `synchronized` operation directly through the heavyweight waiting path.

Without contention, Lightweight Locking can record the locked object in the current thread's lock stack and atomically update lock state in the object header:

```text
object is unlocked
    │
    │ monitorenter
    ▼
atomically update object header
    │
    ▼
record lock in current thread's Lock Stack
    │
    ▼
enter critical section
```

If contention does not occur, `monitorexit` can follow the corresponding fast path to release the lock.

This fast path first solves exclusivity: only the thread that successfully changes the lock state may enter. But JMM visibility and ordering cannot be explained only by who wins the lock. Acquire and release must also carry the required memory-ordering semantics.

### 2.3 Contended: ObjectMonitor

With sustained contention, or when the code needs full monitor functionality such as `wait()`, execution can enter the `ObjectMonitor` path.

Two important pieces of state are:

```text
_owner       current owner
wait queues  threads that failed to acquire the monitor
```

When acquiring, HotSpot [`ObjectMonitor::try_lock()`](https://github.com/openjdk/jdk/blob/master/src/hotspot/share/runtime/objectMonitor.inline.hpp) atomically attempts to change `_owner` from `NO_OWNER` to the current owner:

```cpp
AtomicAccess::cmpxchg(&_owner, NO_OWNER, owner_id)
```

A failed competitor may spin briefly and, if it still cannot acquire the monitor, enter the monitor waiting path and park. On exit, the current holder releases `_owner` and allows a waiter to compete again.

CAS selects a unique owner. The waiting queues organize threads that temporarily failed to acquire the monitor. Spin, park, and wakeup explain how contenders wait; they do not replace the memory-ordering semantics of acquire and release.

For `counter++`:

```text
Thread A                         Thread B

atomically update _owner -> OK   atomically update _owner -> fail
LOAD counter                     Spin / Park
ADD  1
STORE counter
release _owner                   wake and compete again
```

### 2.4 Atomic Operations and Memory Ordering on x86-64

First consider compile-time reordering. HotSpot's C2 compiler places memory-barrier nodes around locking:

```text
LockNode
        ↓
MemBarAcquireLock
        ↓
critical-section reads/writes
        ↓
MemBarReleaseLock
        ↓
UnlockNode
```

`MemBarAcquireLock` prevents C2 from moving post-acquire accesses before the lock. `MemBarReleaseLock` prevents pre-release accesses from being moved after the unlock.

On x86-64, these IR barrier nodes usually do not require separate fence instructions. The acquire-side constraint is already supplied by the preceding `lock cmpxchg`; the release-side store ordering required here is supplied by x86 TSO. The barriers still exist in the compiler IR, but the backend can reuse existing instruction semantics and architectural ordering instead of emitting an extra fence.

A simplified x86-64 monitor-owner competition looks like:

```asm
mov  rax, 0
mov  rbx, owner_id
lock cmpxchg qword ptr [monitor._owner], rbx
jne  contended
```

`lock cmpxchg` atomically performs the read, comparison, and conditional write. When two cores compete, only one can successfully modify `_owner`; that is the low-level basis of mutual exclusion.

When releasing an `ObjectMonitor`, current HotSpot source uses a release store:

```cpp
AtomicAccess::release_store(&_owner, NO_OWNER)
```

On x86-64, a simplified sequence can be:

```asm
; Thread A
mov  eax, dword ptr [counter]
add  eax, 1
mov  dword ptr [counter], eax
mov  qword ptr [monitor._owner], 0
```

x86-64 ordering allows the release store to be implemented as a normal store in this case. The important requirement is that A's prior write to `counter` cannot be ordered after making the monitor available. HotSpot must also prevent the JIT from moving that write past the unlock.

B later competes for the same monitor with an atomic RMW:

```asm
; Thread B
mov  rax, 0
mov  rbx, owner_id
lock cmpxchg qword ptr [monitor._owner], rbx
jne  contended
mov  ecx, dword ptr [counter]
```

Connecting both sides: A writes `counter`, performs a release store that makes the monitor available, B later acquires the same monitor through an ordered atomic RMW, and only then reads `counter`.

A unique owner gives atomicity. A's writes becoming observable to B gives visibility. Preventing compiler and CPU movement across acquire/release gives ordering. Together these mechanisms implement the JMM's `unlock → lock` happens-before rule.

### 2.5 Java: From Runtime to CPU

```text
Java synchronized
        ↓ javac
monitorenter / monitorexit
        ↓ HotSpot C2
MemBarAcquireLock / MemBarReleaseLock
        ↓ Fast Path / Runtime
Lightweight Locking / ObjectMonitor / AtomicAccess
        ↓ x86-64
cmpxchg(_owner) / release_store(_owner)
        ↓ machine instructions
lock cmpxchg / mov
```

> **C2 uses `MemBarReleaseLock` and `MemBarAcquireLock` to stop compiler motion across the lock boundary. On x86-64, monitor acquisition with `lock cmpxchg` both competes atomically and supplies the required ordering, while the release store can compile to an ordinary `mov` because x86 TSO preserves the relevant store ordering. B can enter only after observing the released monitor and successfully acquiring it, which allows it to observe A's writes before unlock. HotSpot and x86-64 together therefore implement the JMM `unlock → lock` happens-before contract.**

Relevant OpenJDK implementation files include [`graphKit.cpp`](https://github.com/openjdk/jdk/blob/master/src/hotspot/share/opto/graphKit.cpp), [`x86.ad`](https://github.com/openjdk/jdk/blob/master/src/hotspot/cpu/x86/x86.ad), [`markWord.hpp`](https://github.com/openjdk/jdk/blob/master/src/hotspot/share/oops/markWord.hpp), [`objectMonitor.inline.hpp`](https://github.com/openjdk/jdk/blob/master/src/hotspot/share/runtime/objectMonitor.inline.hpp), [`objectMonitor.cpp`](https://github.com/openjdk/jdk/blob/master/src/hotspot/share/runtime/objectMonitor.cpp), and [`orderAccess_linux_x86.hpp`](https://github.com/openjdk/jdk/blob/master/src/hotspot/os_cpu/linux_x86/orderAccess_linux_x86.hpp).

---

## 3. How Does the Go Runtime Implement sync.Mutex?

Go code such as:

```go
var mu sync.Mutex

mu.Lock()
counter++
mu.Unlock()
```

enters the internal mutex implementation. Its core state can be simplified to:

```text
state    lock state and waiter information
sema     runtime semaphore used for waiting and wakeup
```

### 3.1 Fast Path: Modify state Directly

The current `Lock()` fast path is:

```go
if atomic.CompareAndSwapInt32(&m.state, 0, mutexLocked) {
    return
}
```

The `Unlock()` fast path begins with:

```go
new := atomic.AddInt32(&m.state, -mutexLocked)
```

Without contention, acquisition and release mainly update `state` and avoid the waiting path.

### 3.2 Slow Path: Park the Goroutine

After CAS fails, Go enters the slow path:

```text
CAS state fails
        ↓
possibly spin briefly depending on state
        ↓
runtime_SemacquireMutex
        ↓
park the current goroutine
```

When the lock is released and waiters exist, the runtime uses:

```text
runtime_Semrelease
```

to wake a waiting goroutine.

The parked entity is a goroutine. The Go runtime can keep the underlying OS thread busy with another runnable goroutine, unlike a design in which lock waiting directly blocks the platform thread executing the language task.

### 3.3 Instructions on amd64

`sync/atomic` connects further down to `internal/runtime/atomic`. On amd64, representative core instructions used by these operations include:

```asm
LOCK CMPXCHGL
LOCK XADDL
```

The path is:

```text
sync.Mutex
        ↓
internal/sync.Mutex.state
        ↓
CompareAndSwapInt32 / AddInt32
        ↓
internal/runtime/atomic
        ↓
LOCK CMPXCHG / LOCK XADD
```

`LOCK CMPXCHG` determines who can change `state` from unlocked to locked; `LOCK XADD` atomically updates state on the release path. These operations not only modify lock state atomically but also carry strong ordering properties on amd64.

The Go Memory Model says an `Unlock` is synchronized before a later `Lock` on the same mutex returns. At this implementation level, atomic state modification gives exclusion, while the ordering semantics around acquire and release allow writes from the earlier goroutine to become observable by the later goroutine without critical-section accesses moving across the wrong side of the boundary.

Other architectures may use different instructions while preserving the same observable language-level result.

### 3.4 Go: From Runtime to CPU

```text
sync.Mutex
        ↓ Go Runtime
internal/sync.Mutex
        ├── Fast Path: CAS / Add update state
        └── Slow Path: Spin / sema / Park Goroutine
        ↓ internal/runtime/atomic
LOCK CMPXCHG / LOCK XADD
```

> **The Go runtime first uses CAS to change `state` from unlocked to locked. Success enters the critical section immediately; failure enters the slow path, which may spin and then park the goroutine through runtime semaphore machinery. Unlock atomically updates `state` and wakes a waiter when necessary. On amd64 these operations map to instructions such as `LOCK CMPXCHG` and `LOCK XADD`, providing both single-winner lock acquisition and the ordering needed to implement the Go Memory Model's `Unlock → Lock` synchronized-before relationship.**

Current implementation references include:

- [`sync/mutex.go`](https://go.dev/src/sync/mutex.go)
- [`internal/sync/mutex.go`](https://go.dev/src/internal/sync/mutex.go)
- [`runtime/sema.go`](https://go.dev/src/runtime/sema.go)
- [`internal/runtime/atomic/atomic_amd64.s`](https://go.dev/src/internal/runtime/atomic/atomic_amd64.s)

---

## 4. How Does CPython Implement threading.Lock?

This section discusses current CPython specifically; implementation details should not be generalized into language-wide rules for all Python interpreters.

### 4.1 From threading.Lock to PyMutex

Python documents the primitive Lock as being implemented directly by the `_thread` extension. Following the current CPython path downward gives:

```text
threading.Lock
        ↓
_thread
        ↓
PyThread lock API
        ↓
PyMutex
        ↓
CPython Runtime
```

For example:

```text
PyThread_acquire_lock()
        ↓
_PyMutex_LockTimed()

PyThread_release_lock()
        ↓
PyMutex_Unlock()
```

### 4.2 Fast Path: Modify _bits

`PyMutex` stores lock state and waiter information in `_bits`.

The current `_PyMutex_LockTimed()` fast path reads `_bits` and attempts an atomic update like:

```c
_Py_atomic_compare_exchange_uint8(
    &m->_bits,
    &v,
    v | _Py_LOCKED
)
```

This atomically sets `_Py_LOCKED`. When several threads compete, only one can successfully perform the state transition.

### 4.3 Contention: Parking Lot

After the fast path fails, behavior depends partly on the build mode.

Current source contains:

```c
#if Py_GIL_DISABLED
static const int MAX_SPIN_COUNT = 40;
#else
static const int MAX_SPIN_COUNT = 0;
#endif
```

A free-threaded build can spin for a limited number of iterations. If acquisition still fails, it waits through:

```text
_PyParkingLot_Park
```

A waiter eventually sleeps through CPython's semaphore abstraction. On Linux builds using POSIX semaphores, this can reach:

```text
sem_wait / sem_timedwait
```

Wakeup uses:

```text
sem_post
```

Other platforms and build configurations may use different fallback mechanisms.

### 4.4 Implementation on Linux x86-64

With GCC or Clang, current `_Py_atomic_compare_exchange_uint8()` uses:

```c
__atomic_compare_exchange_n(
    obj,
    expected,
    desired,
    0,
    __ATOMIC_SEQ_CST,
    __ATOMIC_SEQ_CST
)
```

On x86-64, an 8-bit Compare-And-Swap can compile to:

```asm
lock cmpxchg byte ptr [m._bits], dl
jne  contended
```

`__ATOMIC_SEQ_CST` constrains both compiler and target-machine ordering around the atomic operation. When waiters exist, unlock also updates mutex state and wakes a thread from the parking lot.

### 4.5 CPython: From Runtime to CPU

```text
threading.Lock
        ↓ _thread / PyThread lock API
PyMutex
        ├── Fast Path: CAS updates _bits
        └── Slow Path: Spin / Parking Lot / Semaphore
        ↓ GCC / Clang __atomic builtins
__ATOMIC_SEQ_CST
        ↓ x86-64
lock cmpxchg
```

> **CPython records lock state in `PyMutex._bits`. The fast path uses CAS to set `_Py_LOCKED`, so only one thread succeeds. Under contention, a free-threaded build may spin before using the parking lot and semaphore machinery to block a platform thread. With GCC/Clang, the `_bits` CAS uses `__ATOMIC_SEQ_CST` and can become `lock cmpxchg` on x86-64. This implementation provides exclusion, waiting/wakeup, and ordering, but it is a property of current CPython and should not be turned into a universal Python happens-before rule.**

Current implementation references include:

- [`Python/thread.c`](https://github.com/python/cpython/blob/main/Python/thread.c)
- [`Python/lock.c`](https://github.com/python/cpython/blob/main/Python/lock.c)
- [`Python/parking_lot.c`](https://github.com/python/cpython/blob/main/Python/parking_lot.c)
- [`Include/cpython/pyatomic_gcc.h`](https://github.com/python/cpython/blob/main/Include/cpython/pyatomic_gcc.h)

---

## 5. Comparing the Three Implementations

First, how each runtime represents and manages the lock:

| | HotSpot | Go Runtime | CPython |
|---|---|---|---|
| Lock state | Object header; inflates to `ObjectMonitor` when needed | `internal/sync.Mutex.state` | `PyMutex._bits` |
| Fast path | Lightweight Locking; `ObjectMonitor` uses CAS on `_owner` | CAS updates `state` | CAS sets `_Py_LOCKED` |
| Failed contention | Spin or park a platform thread | Park a goroutine | Wait for a platform thread through Parking Lot |
| Wakeup | Monitor queues and platform-thread wakeup | Runtime semaphore | Parking Lot / Semaphore |

Then, the low-level capabilities they rely on:

| Capability | x86-64 example | Responsibility |
|---|---|---|
| Atomic RMW | `LOCK CMPXCHG`, `LOCK XADD` | Atomically read and modify lock state so only one competitor wins |
| Memory Ordering | Ordering from `LOCK` instructions; fences where required; a release store may be a normal store on x86-64 | Prevent critical-section accesses from crossing acquire/release boundaries incorrectly |
| Cache Coherence | Hardware protocol, not a program instruction | Coordinate cache-line state across cores |
| Spin / Wait / Wakeup | Spin may use `PAUSE`; long waits are managed by runtime and OS | Control CPU cost after failed contention and resume execution after release |

All three implementations rely on the same broad categories of low-level capability. Their main differences are how the runtime represents lock state and which execution unit is parked and awakened when contention persists.

---

## 6. Next: Atomics

The next article moves to atomic operations: what guarantees a single-variable atomic update provides, and how the public semantics differ among Java, Go, and CPython.
