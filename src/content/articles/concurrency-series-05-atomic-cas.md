---
title: "并发编程（五）：Atomic——语言层的原子性、可见性与有序性"
description: "继续使用 counter 与 ready，理解 Atomic 操作提供的原子性、可见性和有序性，并比较 Java、Go 与 CPython 的公开语义。"
publishedAt: "2026-09-08T23:30:00+08:00"
language: zh
tags:
  - 并发编程
  - Atomic
  - CAS
  - Java
  - Go
  - Python
status: published
featured: false
series: concurrency-programming
---

## 目录

- [0. 从 Mutex 继续](#0-从-mutex-继续)
- [1. Atomic 的语义边界](#1-atomic-的语义边界)
  - [1.1 Atomicity：单次原子操作不可交错](#11-atomicity单次原子操作不可交错)
  - [1.2 Visibility：Atomic 更新之前的写入何时可见](#12-visibilityatomic-更新之前的写入何时可见)
  - [1.3 Ordering：看到 counter 更新后，也要看到前面的 ready](#13-ordering看到-counter-更新后也要看到前面的-ready)
  - [1.4 Atomic RMW 与 CAS 的关系](#14-atomic-rmw-与-cas-的关系)
- [2. Java、Go 和 CPython 中的 Atomic](#2-javago-和-cpython-中的-atomic)
  - [2.1 Java：AtomicInteger](#21-javaatomicinteger)
  - [2.2 Go：sync/atomic](#22-gosyncatomic)
  - [2.3 CPython：应用层没有对称的 Atomic API](#23-cpython应用层没有对称的-atomic-api)
  - [2.4 三种语言放在一起看](#24-三种语言放在一起看)
- [3. Atomic 与 Mutex 的适用边界](#3-atomic-与-mutex-的适用边界)
- [4. 下一篇：Atomic 的实现](#4-下一篇atomic-的实现)

---

## 0. 从 Mutex 继续

前两篇使用同一个例子讨论了 Mutex：

```text
counter++
```

Mutex 使用底层原子操作控制临界区入口，使整个临界区不能与另一个临界区交错：

```text
lock
counter++
unlock
```

如果只需要更新一个计数器，语言通常还会提供更小的同步工具：

```text
counter 原子加 1
```

这一篇只讨论语言层语义：程序员使用 Atomic 时可以依赖什么。至于这些保证如何经过 Runtime 和编译器落到 CPU，放到下一篇。

---

## 1. Atomic 的语义边界

### 1.1 Atomicity：单次原子操作不可交错

前文已经看到，普通的 `counter++` 会先读取旧值、加一，再写回。这类“读取—修改—写回”的操作简称为 RMW（Read–Modify–Write）。

普通 RMW 的多个步骤可能与另一边交错：

```text
Thread A                    Thread B

read counter -> 0           read counter -> 0
add 1 -> 1                  add 1 -> 1
write counter = 1           write counter = 1
```

两边各执行一次 `counter++`，结果却可能是 `1`。

Atomic RMW 把这次更新作为一个不可分割的操作：

```text
Thread A                    Thread B

counter 原子加 1            counter 原子加 1
        │                           │
        ▼                           ▼
      0 -> 1                       1 -> 2
```

这里的 Atomicity 只覆盖这一次 Atomic 操作。它不会自动把前后所有普通代码合并成一个临界区。

### 1.2 Visibility：Atomic 更新之前的写入何时可见

继续使用 `counter + ready`：

```text
Thread A                    Thread B

ready = true
counter 原子加 1

                            原子读 counter = 1
                            if counter == 1 {
                                print(ready)
                            }
```

我们希望得到：

```text
B 读到 counter = 1
        ↓
B 随后读到 ready = true
```

能否得到这个结果，不能只看 `counter` 的加一是否不可分割，还要看语言是否规定 A 的 Atomic 更新和 B 的 Atomic 读取之间建立了同步关系。

如果 B 的 Atomic 读取观察到 A 的更新，那么 A 在更新 `counter` 之前写入的普通变量 `ready`，也需要对 B 可见。

### 1.3 Ordering：看到 counter 更新后，也要看到前面的 ready

Visibility 回答的是 B 能否看到 A 写入的 `ready = true`；Ordering 回答的是 B 能不能已经看到 `counter` 的更新，却仍然看不到 A 在此之前写入的 `ready`。

```text
执行单元 A                                  执行单元 B
   │                                           │
   ├─ 写入 ready = true                         │
   └─ counter 原子加 1 ─────────────────────>├─ 原子读 counter = 1
                                               └─ 读取 ready = true
```

如果 B 已经读到：

```text
counter = 1
```

那么它随后读取 `ready` 时，不能再得到：

```text
ready = false
```

Atomic 对 `counter` 的操作不仅要保证这次加一不可分割，还需要建立正确的内存顺序，使 B 观察到更新后的 `counter` 时，也能看到 A 在此之前写入的 `ready = true`。


### 1.4 Atomic RMW 与 CAS 的关系

Atomic RMW 是一类原子更新：

```text
Atomic RMW
    ├── Fetch-And-Add
    ├── Exchange
    ├── Compare-And-Swap
    └── Atomic Bitwise Operation
```

CAS（Compare-And-Swap）只是其中一种。它表示：只有当前值仍然等于预期值时，才写入新值。

```text
CAS(counter, expected, newValue)
```

```text
读取 counter 当前值
        ↓
是否等于 expected？
   /             \
 是               否
 │                 │
 ▼                 ▼
写入 newValue      不修改
返回成功            返回失败
```

需要根据旧值计算新值时，可以使用 CAS Loop：

```text
loop:
    old = 原子读取 counter
    new = old + 1

    if CAS(counter, old, new):
        break
```

但“把 `counter` 原子加一”不等于“必须使用 CAS Loop”。目标平台有直接的原子加法能力时，Runtime 可以使用它。

---

## 2. Java、Go 和 CPython 中的 Atomic

### 2.1 Java：AtomicInteger

Java 可以用 `AtomicInteger` 保存并原子更新一个 `int`。这里仍然只使用 `counter + ready` 这一个例子：`counter` 使用 `AtomicInteger`，`ready` 是普通的 `boolean`。

```java
private final AtomicInteger counter = new AtomicInteger(0);
private boolean ready = false;
```

先看 `counter` 的原子加一：

```java
counter.incrementAndGet();
```

[`AtomicInteger.incrementAndGet()`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html#incrementAndGet()) 原文：

> **“Atomically increments the current value, with memory effects as specified by `VarHandle.getAndAdd(Object...)`.”**

这条定义首先对应 Atomicity：`incrementAndGet()` 把 `counter` 的读取、加一和写回作为一次原子更新。两个线程同时执行时，单次更新不能交错：

```text
Thread A                    Thread B

incrementAndGet()           incrementAndGet()
        │                           │
        ▼                           ▼
      0 -> 1                       1 -> 2
```



这就是Atomicity。

接下来用同一个 `AtomicInteger counter` 看 Visibility 和 Ordering。`incrementAndGet()` 对 `counter` 的更新具有 `VarHandle.setVolatile` 的内存效果，`counter.get()` 具有 `VarHandle.getVolatile` 的内存效果。

这里先使用 volatile 的规则解释两次 Atomic 操作之间的同步关系，不展开它的完整语义；后续的 Volatile 专篇会单独解释。

[JLS §17.4.5 Happens-before Order](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.4.5) 原文：

> **“A write to a `volatile` field happens-before every subsequent read of that field.”**

这条规则同时对应 Visibility 和 Ordering。回到 `counter + ready`：

```java
// Thread A
ready = true;
counter.incrementAndGet();

// Thread B
if (counter.get() == 1) {
    System.out.println(ready);
}
```

对于 Visibility，A 先写普通变量 `ready = true`，再更新 `counter`。如果 B 的 `counter.get()` 观察到 A 更新后的 `1`，A 之前写入的 `ready` 也需要对 B 可见。

对于 Ordering，A 内部的操作顺序、`counter.incrementAndGet() → counter.get()` 的同步关系，以及 B 随后的普通读取被连成一条 happens-before 链。因此，B 不能看到：

```text
counter = 1
ready = false
```

对应到三项语义：

```text
Atomicity
incrementAndGet 的单次更新不可交错

Visibility
get 观察到 Atomic 更新后，可以看到更新前完成的普通写入

Ordering
counter 的 Atomic 更新和读取与两边的程序顺序形成 happens-before
```

需要注意的是，上面的例子，B使用的是 [`AtomicInteger.get()`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html#get())。如果换成 [`AtomicInteger.getPlain()`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html#getPlain())，就不能推出 `ready` 对 B 可见，因为 `getPlain()` 只具有普通读的内存语义，不能建立上面的同步关系。

### 2.2 Go：sync/atomic

Go 可以使用 [`sync/atomic`](https://pkg.go.dev/sync/atomic)：

```go
var counter atomic.Int64

counter.Add(1)
```

[`atomic.Int64.Add`](https://pkg.go.dev/sync/atomic#Int64.Add) 原文：

> **“Add atomically adds delta to x and returns the new value.”**

这条定义对应 Atomicity：`Add(1)` 把 `counter` 的读取、加一和写回作为一次原子更新。`CompareAndSwap` 则完成条件更新：

```go
counter.CompareAndSwap(oldValue, newValue)
```

[The Go Memory Model - Atomic Values](https://go.dev/ref/mem#atomic) 原文：

> **“If the effect of an atomic operation A is observed by atomic operation B, then A is synchronized before B.”**

这条规则同时对应 Visibility 和 Ordering。Go Memory Model 还规定，程序中的 Atomic Operation 需要能够解释为某个顺序一致的执行顺序。

继续使用 `counter + ready`：

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

对于 Visibility，如果 B 的 `counter.Load()` 观察到 A 的 `Add(1)`，A 的 Atomic 更新 synchronized-before B 的读取。A 在更新前写入的普通变量 `ready = true` 需要对 B 可见。

对于 Ordering，A 内部的写入顺序、`counter.Add(1) → counter.Load()` 和 B 随后的普通读取组成 happens-before。因此，B 不能看到 `counter = 1、ready = false`。

对应到三项语义：

```text
Atomicity
Add / CompareAndSwap 的单次更新不可交错

Visibility
观察到 Atomic 写入后，可以看到同步关系之前的写入

Ordering
Atomic 规则与两边的程序顺序形成 happens-before
```

### 2.3 CPython：应用层没有对称的 Atomic API

Python 标准库没有与 Java `AtomicInteger`、Go `atomic.Int64` 对称的通用整数 Atomic API。

普通 Python 代码中的 `counter += 1` 也不是一个公开的 Atomic API。不能因为某个 CPython 版本存在 GIL，或者 Runtime 内部使用了 Atomic，就把它当作 Python 应用层可以依赖的跨实现保证。

因此，这里不为 CPython 强行补一个替代示例。CPython Runtime 内部如何使用 Atomic，放到下一篇实现文章讨论。

### 2.4 三种语言放在一起看

| | Java | Go | CPython |
|---|---|---|---|
| 单变量 Atomic API | `AtomicInteger` 等 | `atomic.Int64` 等 | 没有对称的通用整数 API |
| 原子加法 | `incrementAndGet()` | `Add(1)` | 没有对应的公共 API |
| CAS | `compareAndSet()` | `CompareAndSwap()` | Runtime 内部使用，不是普通 Python API |
| 内存语义来源 | JMM、VarHandle 与 Atomic API | Go Memory Model | 没有对应的应用层 Atomic 语义 |
| `counter + ready` | Atomic/volatile 语义 | Atomic 同步规则 | 没有对应的 Atomic 示例 |

三种语言都需要明确的同步边界，但公开 API 和规范层次不同。

---

## 3. Atomic 与 Mutex 的适用边界

仍然使用 `counter`。

如果需求只是：

```text
counter++
```

并且语言提供对应的 Atomic Add，那么 Atomic 可以直接表达这次单变量更新：

```text
counter 原子加 1
```

如果需要保护的是一段包含多个步骤的临界区：

```text
lock
counter = counter + 1
ready = true
unlock
```

那么 Mutex 更直接。它保护的是整段操作，而不是分别保证两个变量的单次读写。

`counter + ready` 也可以用于发布：先写普通变量 `ready`，再通过具有正确内存语义的 Atomic `counter` 发布。这个方案成立的前提是读取方确实观察到了这次 Atomic 更新，而且需求是单向发布，而不是要求多个字段作为一个不可分割的整体更新。

| 问题 | Atomic | Mutex |
|---|---|---|
| `counter++` 的单变量更新 | 适合 | 可以，但范围更大 |
| 根据旧值进行单变量条件更新 | CAS 可以表达 | 可以表达 |
| `counter + ready` 的单向发布 | 具有正确内存语义时可以 | 可以 |
| 多个操作组成一个临界区 | 不自动提供 | 适合 |
| 多个变量需要作为整体保持不变量 | 容易遗漏边界 | 更直接 |

选择标准是需要保护的状态范围，而不是 API 是否包含 `Atomic` 或 `Mutex`。

---

## 4. 下一篇：Atomic 的实现

这一篇讨论的是语言层保证。下一篇 [《并发编程（六）：Atomic 的实现——从 Runtime 到 CPU》](/articles/concurrency-series-06-atomic-implementation/) 继续沿着实现路径向下：

```text
Java AtomicInteger / Go sync/atomic / CPython Runtime
        ↓
编译器与 Runtime
        ↓
CPU Atomic Instruction / Memory Ordering
```

重点区分原子加法与 CAS，并讨论 CAS 重试、Cache Line 竞争和 ABA。
