---
title: "Concurrency Programming (2): Language Memory Models — Rules Programmers Can Rely On"
description: "Moves from hardware memory models back to the language layer: why languages need their own concurrency semantics, and what Java, Go, and CPython guarantee to concurrent programs."
publishedAt: "2026-09-07T15:13:00+08:00"
updatedAt: "2026-09-10T15:06:13+08:00"
language: en
tags:
  - Concurrency
  - Memory Model
  - Java
  - Go
  - Python
status: published
featured: false
series: concurrency-programming
translationOf: concurrency-series-02-language-memory-model
---

## Table of Contents

- [0. Continue from the Previous Article](#0-continue-from-the-previous-article)
- [1. Why Do Languages Need Their Own Concurrency Semantics?](#1-why-do-languages-need-their-own-concurrency-semantics)
- [2. What Must a Language Memory Model Answer?](#2-what-must-a-language-memory-model-answer)
  - [2.1 Java Memory Model](#21-java-memory-model)
  - [2.2 Go Memory Model](#22-go-memory-model)
  - [2.3 CPython Concurrency Semantics](#23-cpython-concurrency-semantics)
    - [2.3.1 GIL Mode](#231-gil-mode)
    - [2.3.2 Free-threaded Mode](#232-free-threaded-mode)
    - [2.3.3 What Should Programs Rely On?](#233-what-should-programs-rely-on)
- [3. Next: Mutexes](#3-next-mutexes)

---

## 0. Continue from the Previous Article

The previous article described the capabilities provided by the hardware layer.

But programmers write code such as:

```text
Java    -> synchronized / volatile / AtomicInteger
Go      -> sync.Mutex / sync/atomic / channel
Python  -> threading.Lock / queue.Queue
```

They do not write machine instructions for one specific CPU.

So this article answers one question:

> **Across different underlying hardware platforms, which uniform concurrency rules does a programming language expose to programmers?**

---

## 1. Why Do Languages Need Their Own Concurrency Semantics?

Source code passes through a compiler and runtime before it executes on a CPU. Compilers optimize programs, and processors such as x86 and ARM do not permit exactly the same memory-access orderings.

If every programmer had to reason separately about every compiler, runtime, and CPU, portable concurrent programming would be impractical.

That is why we need a language-level layer of rules:

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

A language memory model defines behavior that programmers may rely on. The compiler and runtime then implement those guarantees for each target platform.

For example, the programmer should be able to ask:

> **When Thread B observes `ready = true`, does the language guarantee that it also observes the earlier `count = 1`?**

Business code should not have to decide which exact instructions must be emitted on x86 versus ARM.

---

## 2. What Must a Language Memory Model Answer?

Continue with the two earlier examples:

```text
counter++
```

and:

```text
counter = 1
ready = true
```

At the language level we need answers to:

| Question | What it means in the examples |
|---|---|
| Atomicity | Can `counter++` be treated as indivisible? If not, which tools provide atomicity? |
| Visibility | After A writes `counter = 1`, under what conditions can B reliably observe it? |
| Ordering | If B observes `ready = true`, must it also observe the earlier `counter = 1`? |

A language memory model does not require application programmers to reason directly about caches, store buffers, or fences. It defines which results are permitted at the source-code level; the implementation is responsible for satisfying those rules.

---

### 2.1 Java Memory Model

The Java Memory Model (JMM) defines which memory-access outcomes Java threads are allowed to observe and what relationships synchronization operations establish.

Consider:

```java
int count = 0;

// Thread A
count = 1;

// Thread B
System.out.println(count);
```

Thread B is not guaranteed to observe `1`, because no synchronization relationship defined by the JMM exists between the two threads.

The JMM uses `happens-before` to describe ordering that programmers can rely on. [JLS §17.4.5](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.4.5) states that when one action happens-before another, the result of the first action is visible to the second and the first is ordered before the second.

The JMM also defines atomicity boundaries. `count++` is a compound operation and is not inherently atomic as a critical-section update; synchronization such as `synchronized` or an `Atomic` type is required.

So the JMM is not merely a list of happens-before rules. It also defines which writes a read may observe, synchronization order, atomic operations, and the behavior of programs containing data races.

Concrete tools establish different relationships, for example:

```text
synchronized
volatile
Thread.start()
Thread.join()
Atomic
```

Later articles examine these mechanisms separately.

---

### 2.2 Go Memory Model

[The Go Memory Model](https://go.dev/ref/mem) similarly defines when a read may reliably observe a write performed by another goroutine.

```go
var count int

go func() {
    count = 1
}()

go func() {
    fmt.Println(count)
}()
```

This program contains a data race. The second goroutine cannot rely on observing the write performed by the first.

Go describes ordering with three relationships:

```text
sequenced-before
synchronized-before
happens-before
```

Operations within one goroutine form `sequenced-before`; synchronization operations such as Mutex, Channel, and Atomic operations can establish `synchronized-before`; together they form `happens-before`.

Go also distinguishes ordinary operations from atomic operations. `counter++` is not an atomic update and requires `sync.Mutex` or `sync/atomic` when shared concurrently.

Both Java and Go use the term happens-before, but their concrete rules are not interchangeable. Code must still be analyzed according to the memory model of the language in which it is written.

---

### 2.3 CPython Concurrency Semantics

Python does not define one universal concurrency memory model for all interpreter implementations at the same level as the JMM or Go Memory Model. This series focuses on the most widely used implementation, CPython.

#### 2.3.1 GIL Mode

In the default GIL-enabled CPython build:

```text
Only one thread holds the GIL and executes Python bytecode at a time.
```

But having a GIL does not make application-level shared state automatically thread-safe.

The interpreter still switches between threads; it releases the GIL around blocking I/O, and extension modules may explicitly release it. The GIL primarily protects the CPython interpreter and object model. It is not a replacement for synchronization in application code.

Therefore:

```python
counter += 1
```

is not something concurrent application code should treat as a general thread-safety guarantee merely because the GIL exists.

#### 2.3.2 Free-threaded Mode

Starting with Python 3.13, CPython provides free-threaded builds in which the GIL can be disabled. In that mode, multiple threads can execute Python code concurrently on different CPU cores.

| | GIL-enabled CPython | Free-threaded CPython |
|---|---|---|
| Python execution | Only one thread holds the GIL at a time | Multiple threads may run on different cores in parallel |
| Interpreter internals | Primarily protected by the GIL | Protected with finer-grained locks and atomic operations |
| Application shared state | Explicit synchronization is still required | Explicit synchronization is still required |

Free-threaded mode increases the interpreter's ability to execute Python in parallel. It does not automatically make an application-level `counter += 1` thread-safe. Some extension modules that have not been adapted for free-threading may also cause the GIL to be re-enabled when imported.

For details, see Python's official [free-threading documentation](https://docs.python.org/3/howto/free-threading-python.html) and [PEP 703](https://peps.python.org/pep-0703/).

#### 2.3.3 What Should Programs Rely On?

Python programs should rely on explicit synchronization APIs such as:

```text
threading.Lock
queue.Queue
threading.Event
threading.Condition
```

[PEP 583](https://peps.python.org/pep-0583/), which proposed a unified concurrency memory model, was withdrawn. It is therefore misleading to describe an implementation property of a CPython lock as an official Python-wide happens-before rule.

When discussing concurrency safety in Python, first identify the synchronization API being used. When going deeper into implementation details, also specify whether the discussion concerns CPython, PyPy, or another interpreter.

---

## 3. Next: Mutexes

The next article moves to the first concrete synchronization tool: the mutex.

It asks:

```text
How does a lock provide atomicity?
Why can a later critical section observe writes from an earlier one?
How does locking constrain ordering across synchronization boundaries?
How do Java, Go, and CPython locks differ?
```

The article after that follows the concrete implementations in all three languages from their runtimes down toward the CPU.
