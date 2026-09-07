---
title: "并发编程（零）：当我们讨论并发编程时，我们究竟在讨论什么？"
description: "限定单机、单进程范围，从共享变量出发，建立共享内存、消息传递、语言并发语义与硬件实现之间的整体关系。"
publishedAt: "2026-09-06T17:58:00+08:00"
updatedAt: "2026-09-06T22:10:00+08:00"
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
Thread A -> count++
Thread B -> count++
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

Thread A 读取 count -> 0
Thread B 读取 count -> 0

Thread A 写入 1
Thread B 写入 1
```

最终：

```text
count = 1
```

问题的关键在于：

> **多个执行单元同时访问并修改了同一份状态。**

如果多个执行单元之间完全没有关系，并发本身并不会带来这个问题。真正需要解决的是：

> **当它们需要共享数据、交换信息或协调执行时，应该采用什么方式？**

在单机、单进程范围内，可以先从两种主要的协作模型理解这个问题：

- **Shared Memory / Shared State**：多个执行单元直接访问同一份状态；
- **Message Passing**：执行单元之间通过消息交换信息。

下面仍然以 `count++` 为例，看这两种模型分别如何处理前面的并发问题。

---

## 3. 两种主要的协作模型

### 3.1 Shared Memory：通过同步保护共享状态

Shared Memory 最直接的形式是：

> **多个执行单元直接访问同一份状态。**

仍然以 `count` 为例。

Java 中可以通过同步保护这段共享状态：

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
Thread A -> counter.increment()
Thread B -> counter.increment()
```

区别在于，两个线程不能同时进入 `increment()` 的临界区。

假设 Thread A 先获得锁，完整的执行过程会变成：

```text
初始：count = 0

Thread A 请求进入 increment()
Thread A 获得锁

Thread B 请求进入 increment()
Thread B 无法获得同一把锁，等待

Thread A 读取 count      -> 0
Thread A 计算 count + 1  -> 1
Thread A 写回 count      -> 1
Thread A 退出临界区并释放锁

Thread B 获得锁
Thread B 读取 count      -> 1
Thread B 计算 count + 1  -> 2
Thread B 写回 count      -> 2
Thread B 退出临界区并释放锁

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

go func() { // Counter Owner
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
                     ├──> Channel ──> Counter Owner ──> count
Goroutine B ── +1 ──┘
```

这里有两个发送消息的 Goroutine：

```text
Goroutine A
Goroutine B
```

它们都把消息发送到同一个 Channel，再由一个独立的 `Counter Owner` 接收消息并修改 `count`。

真正的 `count` 只由 `Counter Owner` 修改。

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

例如：

- 一个线程释放锁以后，另一个线程为什么能够看到它之前的写入？
- 为什么两个线程不会同时进入同一个受保护的临界区？
- 一次 Channel 发送和对应的接收之间，为什么能够建立确定的同步关系？
- 消息发送之前的状态，接收方为什么能够正确观察？

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

这些规则需要回答：

| 语言规则要回答的问题 | 回到 `count` 例子意味着什么 |
| --- | --- |
| 写入什么时候可见？ | A 写入 `count = 1` 并释放锁后，B 获得同一把锁时必须能够看到 `1`。 |
| 哪些操作之间具有顺序关系？ | A 在释放锁前的写入，不能在 B 获得锁后的读取之后才生效。 |
| 哪些操作具有原子性？ | `count++` 本身通常不具备原子性；使用同一把锁后，整个临界区相对于其他持锁线程不可交错。 |
| 哪些同步操作能够建立 happens-before / synchronizes-before？ | 同一把锁的释放与后续获取、Channel 的发送与对应接收，把两个执行单元的操作连接成可依赖的先后关系。 |

也就是说，这一层回答的是：

> **程序员可以依赖什么？**

---

## 6. 为什么还要继续下钻到硬件？

语言定义了规则，但这些规则不能凭空实现。

Java、Go 或 Python 最终都需要通过：

```text
Language Memory Model / Concurrency Semantics
                 ↓
          Compiler / Runtime
                 ↓
         Hardware Memory Model
                 ↓
CPU Cache / Memory Ordering / Atomic Instruction
```

把语言层的保证落实到真实机器上。

而现代 CPU 为了提高性能，会使用：

- CPU Cache；
- 写缓冲；
- 乱序执行；
- 原子指令；
- 不同的内存顺序规则。

因此，在深入 Java、Go 和 Python 的具体并发语义之前，我们需要先回答：

> **硬件到底提供了什么保证？**

---

## 7. 下一篇：先谈硬件

下一篇正式进入硬件：

> **《并发编程（一）：先谈硬件——从 CPU Cache 到内存模型》**

主要讨论：

- CPU 为什么需要缓存；
- 多核 CPU 如何协调缓存数据；
- 写缓冲和乱序执行为什么会影响内存访问顺序；
- 原子指令提供什么能力；
- Hardware Memory Model 解决什么问题。

理解这些以后，我们再回到：

```text
Java Memory Model
Go Memory Model
Python / CPython Concurrency Semantics
```

以及更具体的：

```text
Lock
CAS
volatile / atomic
Condition
Queue
Channel
Thread Pool
Future
```
