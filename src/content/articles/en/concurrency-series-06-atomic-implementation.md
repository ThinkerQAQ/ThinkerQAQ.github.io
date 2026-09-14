---
title: "Concurrency Programming (6): Atomic Implementation — From Runtime to CPU"
description: "Follows Java AtomicInteger, Go sync/atomic, and CPython's internal atomic operations to see how Atomic RMW reaches the compiler, runtime, and CPU."
publishedAt: "2026-09-08T23:36:00+08:00"
language: en
tags:
  - Concurrency
  - Atomic
  - CAS
  - Java
  - Go
  - CPython
status: published
featured: false
series: concurrency-programming
translationOf: concurrency-series-06-atomic-implementation
---

## Table of Contents

- [0. What Does This Article Continue to Answer?](#0-what-does-this-article-continue-to-answer)
- [1. What Low-level Capabilities Do Atomics Need?](#1-what-low-level-capabilities-do-atomics-need)
  - [1.1 Atomic RMW: Perform an Update Directly](#11-atomic-rmw-perform-an-update-directly)
  - [1.2 CAS: Update Only If the Current Value Matches](#12-cas-update-only-if-the-current-value-matches)
  - [1.3 CAS and Lock-Free Are Not the Same Thing](#13-cas-and-lock-free-are-not-the-same-thing)
  - [1.4 Memory Ordering: Constrain Compiler and CPU Reordering](#14-memory-ordering-constrain-compiler-and-cpu-reordering)
- [2. Java: From AtomicInteger to the CPU](#2-java-from-atomicinteger-to-the-cpu)
  - [2.1 AtomicInteger and HotSpot Intrinsics](#21-atomicinteger-and-hotspot-intrinsics)
  - [2.2 Atomic Add and CAS on x86-64](#22-atomic-add-and-cas-on-x86-64)
  - [2.3 Java: From Runtime to CPU](#23-java-from-runtime-to-cpu)
- [3. Go: From sync/atomic to the CPU](#3-go-from-syncatomic-to-the-cpu)
  - [3.1 atomic.Int64 and internal/runtime/atomic](#31-atomicint64-and-internalruntimeatomic)
  - [3.2 Atomic Add and CAS on amd64](#32-atomic-add-and-cas-on-amd64)
  - [3.3 Go: From Runtime to CPU](#33-go-from-runtime-to-cpu)
- [4. CPython: Atomics inside the Runtime](#4-cpython-atomics-inside-the-runtime)
  - [4.1 _Py_atomic and Compiler Builtins](#41-_py_atomic-and-compiler-builtins)
  - [4.2 Implementation on Linux x86-64](#42-implementation-on-linux-x86-64)
  - [4.3 CPython: From Runtime to CPU](#43-cpython-from-runtime-to-cpu)
- [5. The Cost of Atomics and CAS](#5-the-cost-of-atomics-and-cas)
  - [5.1 Failed CAS Requires Retry](#51-failed-cas-requires-retry)
  - [5.2 Cache-line Contention Still Exists](#52-cache-line-contention-still-exists)
  - [5.3 ABA: The Same Value Does Not Mean Nothing Changed](#53-aba-the-same-value-does-not-mean-nothing-changed)
- [6. Comparing the Three Implementations](#6-comparing-the-three-implementations)
- [7. Next: volatile](#7-next-volatile)

---

## 0. What Does This Article Continue to Answer?

The previous article described the atomicity, visibility, and ordering guarantees exposed by Atomic APIs at the language level. This article follows those guarantees down through the compiler and runtime to the CPU.

We continue to use the same two examples:

```text
counter++
```

and:

```text
counter = 1
ready = true
```

The implementation path can be summarized as:

```text
Language API and memory model
        ↓
Compiler / Runtime
        ↓
CPU Atomic Instruction / Memory Ordering
```

---

## 1. What Low-level Capabilities Do Atomics Need?

### 1.1 Atomic RMW: Perform an Update Directly

Earlier articles abbreviated “read-modify-write” as RMW. An ordinary `counter++` contains several steps that may interleave with another execution unit.

Atomic RMW performs one update indivisibly:

```text
CPU A                       CPU B

Atomic Add counter, 1       Atomic Add counter, 1
        │                           │
        ▼                           ▼
      0 -> 1                       1 -> 2
```

Atomic RMW is a family of operations:

```text
Fetch-And-Add
Exchange
Compare-And-Swap
Atomic Bitwise Operation
```

CAS is only one member of that family.

### 1.2 CAS: Update Only If the Current Value Matches

CAS takes a memory location, an expected value, and a new value:

```text
CAS(address, expected, newValue)
```

It atomically compares and conditionally updates:

```text
read current value
    ↓
does it equal expected?
   /             \
 yes              no
 │                 │
 ▼                 ▼
write newValue     keep old value
return success     return failure
```

CAS can be used to build an update whose new value depends on the old value:

```text
loop:
    old = atomic_load(counter)
    new = old + 1

    if CAS(counter, old, new):
        break
```

But Atomic Add does not have to be implemented as a CAS loop. The actual choice depends on the language API, compiler, runtime, and target architecture.

### 1.3 CAS and Lock-Free Are Not the Same Thing

CAS is an atomic conditional-update primitive; it is not itself a lock. An algorithm can use CAS to update shared state without first acquiring a mutex, and a failed CAS can cause the caller to reload state and retry.

But “uses CAS” and “is lock-free” are not equivalent statements. Lock-free describes a progress guarantee for the algorithm as a whole: even under contention, the system as a whole continues to make progress and some operation completes. Seeing CAS—or even a machine instruction such as `LOCK CMPXCHG`—does not by itself prove the entire algorithm is lock-free. Higher layers may still block or wait, and retry behavior is part of the algorithm's design.

### 1.4 Memory Ordering: Constrain Compiler and CPU Reordering

Making an update to `ready` atomic only prevents that individual access from being torn or interleaved. If it is also used to publish the earlier write to `counter`, the required memory ordering must be preserved:

```text
Execution Unit A              Execution Unit B

counter = 1
AtomicStore(ready, true)

                              if AtomicLoad(ready) {
                                  print(counter)
                              }
```

The implementation has to satisfy two layers of constraints:

```text
Compiler
must not introduce reorderings that violate the language memory model

        +

CPU
must use the target architecture's atomic and memory-ordering mechanisms
```

Different languages assign different memory semantics to their Atomic operations, so the generated instructions do not have to be identical.

---

## 2. Java: From AtomicInteger to the CPU

### 2.1 AtomicInteger and HotSpot Intrinsics

Java atomic addition starts with:

```java
AtomicInteger counter = new AtomicInteger();
counter.incrementAndGet();
```

A useful implementation path is:

```text
AtomicInteger.incrementAndGet()
        ↓
Unsafe / VarHandle Atomic Operation
        ↓
HotSpot Intrinsic
        ↓
Atomic RMW on the target CPU
```

HotSpot can recognize these operations as intrinsics and generate an atomic update supported directly by the target architecture instead of necessarily executing a CAS loop written at the Java level.

`compareAndSet()` follows the corresponding CAS intrinsic:

```text
AtomicInteger.compareAndSet()
        ↓
HotSpot CAS Intrinsic
        ↓
CPU Compare-And-Swap
```

### 2.2 Atomic Add and CAS on x86-64

On x86-64, an atomic addition can be simplified as:

```asm
mov  eax, 1
lock xadd dword ptr [counter], eax
```

`XADD` reads the old value and writes `old + 1`; the `LOCK` prefix makes the whole RMW indivisible with respect to competing cores.

CAS can be simplified as:

```asm
; EAX contains expected
; ECX contains newValue
lock cmpxchg dword ptr [counter], ecx
sete al
```

These snippets illustrate equivalent machine-level operations; they are not a claim about the exact full instruction sequence emitted by every JVM version.

For `counter + ready`, HotSpot must also constrain compile-time reordering according to the JMM and the memory effects of the specific Atomic method, then map those constraints onto x86-64 memory ordering. Looking only at a `LOCK` instruction and ignoring the compiler layer would miss part of the implementation.

### 2.3 Java: From Runtime to CPU

```text
AtomicInteger.incrementAndGet / compareAndSet / get
        ↓ AtomicInteger / Unsafe / VarHandle
HotSpot C2 intrinsics and memory-order constraints
        ↓ x86-64
LOCK XADD / LOCK CMPXCHG / MOV
```

> **`incrementAndGet()` reaches an atomic get-and-add operation that HotSpot can recognize as an intrinsic and map to an instruction such as `lock xadd` on x86-64. `compareAndSet()` can map to `lock cmpxchg`, while `get()` is handled with its volatile-read semantics. Ordered atomic RMW instructions make the individual update indivisible, while HotSpot constrains compiler motion according to the methods' memory effects and relies on the target architecture's ordering rules. Together these layers implement the language-level visibility and ordering guarantees.**

---

## 3. Go: From sync/atomic to the CPU

### 3.1 atomic.Int64 and internal/runtime/atomic

Go atomic addition starts with:

```go
var counter atomic.Int64
counter.Add(1)
```

The implementation path can be summarized as:

```text
atomic.Int64.Add
        ↓
sync/atomic
        ↓
internal/runtime/atomic
        ↓
Atomic RMW on the target architecture
```

CAS follows a similar path:

```text
atomic.Int64.CompareAndSwap
        ↓
internal/runtime/atomic
        ↓
CPU Compare-And-Swap
```

The Go Memory Model defines the observable semantics of Atomic operations. The compiler and architecture-specific implementation must not generate code that violates them.

### 3.2 Atomic Add and CAS on amd64

On amd64, atomic addition can reach an `XADD` with the `LOCK` prefix:

```asm
LOCK
XADDQ AX, 0(BX)
```

CAS can reach:

```asm
LOCK
CMPXCHGQ CX, 0(BX)
```

So `counter.Add(1)` can use a hardware atomic-add operation directly rather than first being rewritten as a CAS loop.

For `counter + ready`, the compiler must also preserve the ordering required by the Go Memory Model. The amd64 implementation uses strongly ordered atomic instructions; other architectures can use different instruction and barrier combinations while preserving the same observable semantics.

### 3.3 Go: From Runtime to CPU

```text
atomic.Int64.Add / CompareAndSwap / Load
        ↓ sync/atomic
internal/runtime/atomic / compiler Atomic operations
        ↓ amd64 assembly
LOCK XADD / LOCK CMPXCHG / MOV
```

> **`atomic.Int64.Add()` passes through `sync/atomic` and compiler/runtime Atomic operations and can become `LOCK XADD` on amd64; `CompareAndSwap()` can become `LOCK CMPXCHG`, while `Load()` uses an atomic load. The locked RMW instruction provides an indivisible update, while the compiler preserves the ordering relationships required by the Go Memory Model. When B's load observes A's atomic update, the model provides the synchronization relationship on which the higher-level visibility guarantee is based.**

---

## 4. CPython: Atomics inside the Runtime

Python's standard library does not expose a general integer Atomic API corresponding to Java's `AtomicInteger` or Go's `atomic.Int64`. This section concerns CPython runtime implementation details rather than an API ordinary Python programs can depend on.

### 4.1 _Py_atomic and Compiler Builtins

CPython internally uses operations such as:

```text
_Py_atomic_add_*
_Py_atomic_compare_exchange_*
_Py_atomic_exchange_*
_Py_atomic_load_*
_Py_atomic_store_*
```

In GCC/Clang builds these wrappers can continue into compiler atomic builtins:

```text
__atomic_fetch_add
__atomic_compare_exchange_n
__atomic_load_n
__atomic_store_n
```

The path is:

```text
CPython Runtime
        ↓
_Py_atomic_*
        ↓
GCC / Clang Atomic Builtin
        ↓
Target CPU atomic instructions and memory ordering
```

### 4.2 Implementation on Linux x86-64

On Linux x86-64 with GCC or Clang, an atomic addition can typically compile to `LOCK XADD`, while CAS can typically compile to `LOCK CMPXCHG`:

```text
_Py_atomic_add_*
        ↓
__atomic_fetch_add
        ↓
LOCK XADD
```

```text
_Py_atomic_compare_exchange_*
        ↓
__atomic_compare_exchange_n
        ↓
LOCK CMPXCHG
```

The exact instruction depends on compiler version, target architecture, operand width, and requested memory order, so these are representative paths rather than universal instruction listings.

### 4.3 CPython: From Runtime to CPU

```text
CPython internal runtime state
        ↓ _Py_atomic_*
GCC / Clang __atomic builtins
        ↓ Linux x86-64
LOCK XADD / LOCK CMPXCHG / MOV plus required ordering
```

> **CPython expresses atomic operations and their required memory order through internal `_Py_atomic_add_*`, `_Py_atomic_compare_exchange_*`, `_Py_atomic_load_*`, and related APIs. GCC/Clang `__atomic` builtins then generate target code. On Linux x86-64, addition commonly reaches `LOCK XADD`, CAS commonly reaches `LOCK CMPXCHG`, while loads, stores, and any required ordering are generated according to the requested memory order. This path serves CPython internals; it is not a public Atomic API for normal Python code.**

---

## 5. The Cost of Atomics and CAS

Following Atomics all the way down to the CPU also makes their costs clearer. Under contention, CAS may repeatedly fail and retry, ownership of the same cache line may bounce between cores, and algorithms may have to handle ABA.

### 5.1 Failed CAS Requires Retry

With low contention, a CAS loop may succeed immediately:

```text
read old
CAS success
```

Under high contention, multiple execution units may read the same old value:

```text
Thread A        Thread B        Thread C

read 10         read 10         read 10
CAS success     CAS failed      CAS failed
                retry           retry
```

The losers must reload, recompute, and retry. Avoiding a mutex park/wakeup path does not make contention free.

### 5.2 Cache-line Contention Still Exists

When multiple cores repeatedly modify the same `counter`, ownership of the relevant cache line still moves among cores:

```text
Core A modifies counter
        ↓
obtains permission to modify the cache line
        ↓
Core B modifies counter
        ↓
ownership moves again
```

Atomics remove an application-level critical section; they do not remove shared-memory contention. Highly contended counters may need designs that distribute the hotspot rather than simply comparing the surface syntax of Atomic and Mutex APIs.

### 5.3 ABA: The Same Value Does Not Mean Nothing Changed

CAS checks only whether the current value still equals `expected`.

Suppose execution unit A reads:

```text
counter = 1
```

Then execution unit B performs:

```text
1 -> 2 -> 1
```

When A resumes and executes:

```text
CAS(counter, 1, 3)
```

CAS succeeds because the value is `1` again, even though the state changed in between. This is the ABA problem:

```text
value is still the same
    ≠
nothing changed in between
```

One solution is to compare a value together with a version:

```text
(1, version=1)
        ↓
(2, version=2)
        ↓
(1, version=3)
```

Java packages this idea in [`AtomicStampedReference`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/AtomicStampedReference.html): CAS compares both the reference and the stamp. Even if the reference changes from A to B and back to A, the version has changed, so the state is not mistaken for “unchanged.”

Go's `sync/atomic` has no direct Stamped Reference equivalent. If the value and version fit into one `uint64`, they can be encoded together and updated by a single `CompareAndSwap`; otherwise a mutex may be needed to protect the combined state.

Python application code has no public CAS API or type symmetric with `AtomicStampedReference`. If the CPython runtime uses CAS in a particular algorithm, that data structure must handle ABA itself.

---

## 6. Comparing the Three Implementations

| | Java | Go | CPython |
|---|---|---|---|
| Upper-level entry | `AtomicInteger`, etc. | `sync/atomic` | Internal `_Py_atomic_*` |
| Intermediate layer | Unsafe / VarHandle, HotSpot intrinsics | `internal/runtime/atomic` | GCC / Clang Atomic Builtins |
| x86-64 atomic add | Typically `LOCK XADD` | `LOCK XADD` | Typically `LOCK XADD` |
| x86-64 CAS | Typically `LOCK CMPXCHG` | `LOCK CMPXCHG` | Typically `LOCK CMPXCHG` |
| Public application API | Yes | Yes | No symmetric general integer Atomic API |

All three implementations ultimately rely on the same broad categories of hardware capability, but their language APIs, specification sources, and runtime paths are different.

---

## 7. Next: volatile

Atomic operations address the atomicity of RMW updates such as `counter++`. If no atomic update is needed and the goal is only to use `ready` to publish an already-written `counter`, Java provides `volatile`. The next article explains how it provides visibility and ordering, while also explaining why Go and Python do not have a corresponding `volatile` keyword.
