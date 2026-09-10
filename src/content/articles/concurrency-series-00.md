---
title: "并发编程（零）：并发问题与讨论范围"
description: "限定单机、单进程范围，从共享变量出发，建立共享内存、消息传递、语言并发语义与硬件实现之间的整体关系。"
publishedAt: "2026-09-06T17:58:00+08:00"
updatedAt: "2026-09-10T10:16:34+08:00"
language: zh
tags:
  - 并发编程
  - Java
  - Go
  - Python
status: published
featured: false
series: concurrency-programming
---

## 目录

- [1. 先明确讨论范围](#1-先明确讨论范围)
- [2. 从一个共享变量开始](#2-从一个共享变量开始)
- [3. 两种主要的协作模型](#3-两种主要的协作模型)
  - [3.1 Shared Memory：通过同步保护共享状态](#31-shared-memory通过同步保护共享状态)
  - [3.2 Message Passing：通过消息进行协作](#32-message-passing通过消息进行协作)
- [4. 为什么这些代码能够正确工作？](#4-为什么这些代码能够正确工作)
- [5. 语言需要定义并发语义](#5-语言需要定义并发语义)
- [6. 为什么还要继续下钻到硬件？](#6-为什么还要继续下钻到硬件)
- [7. 下一篇：先谈硬件](#7-下一篇先谈硬件)

---

## 1. 先明确讨论范围

这个系列只讨论：

> **单机、单进程内部的并发。**

也就是说，我们关注的是同一个进程中的多个执行单元。

例如：

- Java Thread / Virtual Thread；
- Go Goroutine；
- Python Thread / asyncio Task。

不讨论跨进程通信、分布式系统和网络通信。

---

## 2. 从一个共享变量开始

假设进程中有一个变量：

```text
count = 0
```

现在有两个执行单元：

```text
Thread A                    Thread B

count++                     count++
```

如果 A 和 B 各执行一次，最终结果是否一定是：

```text
count = 2
```

答案是不一定。

因为 `count++` 通常包含：

```text
读取 count
计算 count + 1
写回 count
```

于是可能出现：

```text
初始：count = 0

Thread A                    Thread B

读取 count -> 0
                            读取 count -> 0
写入 count -> 1
                            写入 count -> 1
```

最终：

```text
count = 1
```

问题的关键在于两个Thread同时修改了`counter`，也就是

> **多个执行单元同时访问并修改了同一份状态。**

在单机、单进程范围内，当多个执行单元需要共享数据时，主要通过两种模型协作：

- **Shared Memory / Shared State**：多个执行单元直接访问同一份状态；
- **Message Passing**：执行单元之间通过消息交换信息。

下面仍然以 `count++` 为例，看这两种模型分别如何处理前面的并发问题。

---

## 3. 两种主要的协作模型

### 3.1 Shared Memory：通过同步保护共享状态

Shared Memory 中，多个执行单元直接访问同一份状态。仍然以 `count` 为例。

Java 中可以通过同步保护这段共享状态，例如`sychronized`

```java
class Counter {
    private int count = 0;

    public synchronized void increment() {
        count++;
    }
}
```

两个线程仍然访问同一个 `Counter`：

```text
Thread A                    Thread B

counter.increment()         counter.increment()
```

但是，由于`sychronized`的作用两个线程不能同时进入 `increment()` 的临界区，也就是 `counter++`。

假设 Thread A 先获得锁，完整的执行过程会变成：

```text
初始：count = 0

Thread A                         Thread B

请求进入 increment()
获得锁
                                 请求进入 increment()
                                 无法获得同一把锁，等待
读取 count      -> 0
计算 count + 1  -> 1
写回 count      -> 1
退出临界区并释放锁
                                 获得锁
                                 读取 count      -> 1
                                 计算 count + 1  -> 2
                                 写回 count      -> 2
                                 退出临界区并释放锁

最终：count = 2
```

如果 Thread B 先获得锁，A 和 B 的顺序会互换，但结果仍然是 `2`。关键不在于谁先执行，而在于一次 `读取 → 计算 → 写回` 完成之前，另一个线程不能进入同一个临界区。因此，原来两个线程都读取到 `0` 的交错不会再出现。

Go 和 Python 中也有类似的方式，例如：

```text
Go      -> Mutex
Python  -> Lock
```

它们的共同思路都是：

> **状态仍然共享，但对共享状态的访问需要通过同步机制进行协调。**

---

### 3.2 Message Passing：通过消息进行协作

另一种方式是：

> **执行单元之间通过消息交换信息，而不是让多个执行单元直接修改同一份状态。**

仍然以 `count` 为例。

例如 Go：

```go
increments := make(chan int)

go func() { // Counter Owner Goroutine
    count := 0

    for delta := range increments {
        count += delta
    }
}()
```

两个生产者 Goroutine 都不直接修改 `count`，而是把增量发送到同一个 Channel：

```go
go func() { // Goroutine A
    increments <- 1
}()

go func() { // Goroutine B
    increments <- 1
}()
```

可以抽象成：

```text
Goroutine A ── +1 ──┐
                     ├──> Channel ──> Counter Owner Goroutine ──> count++
Goroutine B ── +1 ──┘
```

两个 Goroutine 都只发送消息，真正的 `count` 由独立的 `Counter Owner Goroutine` 修改。

Java 和 Python 中也有类似的消息传递工具：

- Java `BlockingQueue`
- Python `queue.Queue` / `asyncio.Queue`

它们的共同思路是：

> **执行单元通过消息协作，而不是同时直接修改同一份状态。**

---

## 4. 为什么这些代码能够正确工作？

到这里，我们已经用两种方式处理了最开始的 `count++` 问题。

Shared Memory 中，我们使用了同步机制：

```text
Lock / synchronized / Mutex
```

Message Passing 中，我们使用了：

```text
Queue / Channel
```

但还有一个更基础的问题：

> **为什么这些代码能够正确工作？**

回到最开始的 `count++`：

- **Atomicity（哪些操作具有原子性？）**：`count++` 包含读取、加一和写回。A 获得锁以后，为什么 B 必须等到 A 把 `count` 从 `0` 写成 `1` 并释放锁，才能进入同一个临界区？
- **Visibility（写入什么时候可见？）**：A 把 `count` 写成 `1` 并释放锁以后，B 获得同一把锁时，为什么必须读到 `1`，而不能继续读到旧值 `0`？使用 Channel 时，Counter Owner 为什么能够收到生产者发送的 `+1`？
- **Ordering（哪些操作之间具有顺序关系？）**：为什么 A 的“写回 `count = 1` → 释放锁”必须先于 B 的“获得锁 → 读取 `count = 1`”？使用 Channel 时，为什么一次“发送 `+1`”必须先于对应的“接收 `+1` → 更新 `count`”？

这些行为不能依赖某一种 CPU “刚好这样执行”。

程序员必须能够依赖一套明确的规则。

这就需要继续引出：

> **语言提供的并发语义。**

---

## 5. 语言需要定义并发语义

编程语言需要定义：

> **多个执行单元并发访问状态时，程序允许出现哪些行为，以及程序员可以依赖哪些同步和内存访问保证。**

Java 有：

```text
Java Memory Model
```

Go 有：

```text
Go Memory Model
```

Python 的情况不完全相同，本系列主要结合：

```text
Python / CPython Concurrency Semantics
```

来讨论。

这些规则需要回答三个问题：

| 问题 | 回到 `count` 例子意味着什么 |
| --- | --- |
| Atomicity（哪些操作具有原子性？） | `count++` 包含“读取 → 加一 → 写回”。不加锁时，A 和 B 的三个步骤可能交错，最终只得到 `1`；使用同一把锁后，A 必须完整地把 `count` 从 `0` 改成 `1`，B 才能进入临界区并继续从 `1` 改成 `2`。 |
| Visibility（写入什么时候可见？） | A 写回 `count = 1` 并释放锁后，B 获得同一把锁时必须读到 `1`，不能继续使用旧值 `0`。使用 Channel 时，Counter Owner 必须能够接收到生产者发送的 `+1`。 |
| Ordering（哪些操作之间具有顺序关系？） | 对同一把锁，顺序是“A 写回 `count = 1` → A 释放锁 → B 获得锁 → B 读取 `count = 1`”。使用 Channel 时，顺序是“生产者发送 `+1` → Counter Owner 接收 `+1` → 更新 `count`”。 |

也就是说，这一层回答的是：

> **程序员可以依赖什么？**

---

## 6. 为什么还要继续下钻到硬件？

语言定义了规则，但这些规则不能凭空实现。

Java、Go 或 Python 最终都需要通过下面三层，把语言提供的保证落实到真实机器上：

```text
Concurrency Tools / Synchronization Mechanisms
    └─ Mutex / Atomic / volatile / Channel / Queue
            ↓
Language Memory Model / Concurrency Semantics
    ├─ JMM / Go Memory Model / CPython Concurrency Semantics
    └─ 由 HotSpot JIT / Go Compiler + Runtime / CPython Runtime 落实
            ↓
Hardware
    ├─ Computer Architecture：Von Neumann Architecture / CPU / Memory
    ├─ Hardware Memory Model：x86-TSO / ARM Memory Model
    ├─ Instruction / CPU Primitive：LOAD / STORE / Atomic RMW / Fence
    └─ Microarchitecture：Cache / Store Buffer / Cache Coherence / Out-of-Order Execution
```

而现代 CPU 为了提高性能，会使用：

- CPU Cache；
- 写缓冲；
- 乱序执行；
- 原子指令；
- 不同的内存顺序规则。

语言的并发语义最终都要建立在这些硬件能力之上。只有理解硬件允许哪些行为、提供哪些约束，才能继续理解语言规则和并发工具为什么能够正确工作。

因此，在深入 Java、Go 和 Python 的具体并发语义之前，我们需要先回答：

> **硬件到底提供了什么保证？**

---

## 7. 下一篇：先谈硬件

下一篇正式进入硬件：

主要讨论：

- CPU 为什么需要缓存；
- 多核 CPU 如何协调缓存数据；
- 写缓冲和乱序执行为什么会影响内存访问顺序；
- 原子指令提供什么能力；

理解这些以后，我们再回到：

```text
Java Memory Model
Go Memory Model
Python / CPython Concurrency Semantics
```

再以这些规则为基础，讨论互斥锁提供什么保证、这些保证如何落到 Runtime 和 CPU，以及 Atomic、Channel 等具体并发工具。
