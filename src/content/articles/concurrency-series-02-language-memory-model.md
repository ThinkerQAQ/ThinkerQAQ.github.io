---
title: "并发编程（二）：语言内存模型——程序员可以依赖的规则"
description: "从硬件内存模型回到语言层，理解语言为什么需要定义内存模型，以及 Java、Go 与 CPython 分别为并发程序提供哪些基本保证。"
publishedAt: "2026-09-07T15:13:00+08:00"
updatedAt: "2026-09-10T15:06:13+08:00"
language: zh
tags:
  - 并发编程
  - 内存模型
  - Java
  - Go
  - Python
status: published
featured: false
series: concurrency-programming
---

## 目录

- [0. 从上一篇继续](#0-从上一篇继续)
- [1. 为什么有了 Hardware Memory Model 还不够？](#1-为什么有了-hardware-memory-model-还不够)
- [2. 语言内存模型需要回答什么？](#2-语言内存模型需要回答什么)
  - [2.1 Java Memory Model](#21-java-memory-model)
  - [2.2 Go Memory Model](#22-go-memory-model)
  - [2.3 CPython 的并发语义](#23-cpython-的并发语义)
    - [2.3.1 GIL 模式](#231-gil-模式)
    - [2.3.2 Free-threaded 模式](#232-free-threaded-模式)
    - [2.3.3 程序应该依赖什么？](#233-程序应该依赖什么)
- [3. 下一篇：互斥锁](#3-下一篇互斥锁)

---

## 0. 从上一篇继续

上一篇讲的是硬件层提供的能力，

但程序员写的是：

```text
Java    -> synchronized / volatile / AtomicInteger
Go      -> sync.Mutex / sync/atomic / channel
Python  -> threading.Lock / queue.Queue
```

而不是某一种 CPU 的机器指令。

所以这一篇只回答一个问题：

> **面对不同的底层硬件，编程语言向程序员提供哪些统一的并发规则？**

---

## 1. 为什么语言还需要自己的并发语义？

源代码需要经过编译器和 Runtime，最终才能在 CPU 上执行。编译器会优化代码，x86、ARM 等处理器允许的内存访问顺序也不完全相同。

如果程序员必须分别研究每一种编译器、Runtime 和 CPU，跨平台并发编程就很难成立。

因此还需要一层语言规则：

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

语言内存模型定义程序员可以依赖的行为，编译器和 Runtime 再针对具体硬件实现这些保证。

例如，程序员需要判断的是：

> **当 Thread B 看到 `ready = true` 时，语言是否保证它也能看到之前写入的 `count = 1`？**

至于在 x86 或 ARM 上需要生成哪些指令，不应该由业务代码逐一判断。

---

## 2. 语言内存模型需要回答什么？

继续使用前面的两个例子：

```text
counter++
```

以及：

```text
counter = 1
ready = true
```

语言层需要回答：

| 问题 | 回到例子意味着什么 |
|---|---|
| Atomicity | `counter++` 是否可以被视为不可分割？如果不可以，哪些工具能够提供原子性？ |
| Visibility | A 写入 `counter = 1` 后，B 在什么条件下能够可靠地看到它？ |
| Ordering | 当 B 看到 `ready = true` 时，是否也必须看到前面的 `counter = 1`？ |

语言内存模型不要求程序员直接分析 Cache、Store Buffer 或 Fence。它定义源代码层允许出现哪些结果；底层实现负责满足这些规则。

---

### 2.1 Java Memory Model

Java Memory Model（JMM）定义 Java 线程之间允许出现哪些内存访问结果，以及同步操作能够建立什么关系。

仍然看：

```java
int count = 0;

// Thread A
count = 1;

// Thread B
System.out.println(count);
```

Thread B 不保证看到 `1`，因为两个线程之间没有建立 JMM 规定的同步关系。

JMM 使用 `happens-before` 描述程序员可以依赖的顺序。[JLS §17.4.5](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.4.5) 规定：如果一个操作 happens-before 另一个操作，那么前者的结果对后者可见，而且前者在后者之前有序。

JMM 同时规定原子性的边界。`count++` 是复合操作，本身不具备临界区原子性；需要使用 `synchronized` 或 `Atomic` 类型。

因此，JMM 并不只包含 happens-before。它还需要定义读取允许观察到哪些写入、同步顺序、原子操作以及数据竞争程序的行为。

具体工具会建立不同的关系，例如：

```text
synchronized
volatile
Thread.start()
Thread.join()
Atomic
```

后面的文章再逐个展开。

---

### 2.2 Go Memory Model

[The Go Memory Model](https://go.dev/ref/mem) 也需要回答一个读取在什么条件下能够观察到另一个 Goroutine 的写入。

```go
var count int

go func() {
    count = 1
}()

go func() {
    fmt.Println(count)
}()
```

这里存在 Data Race，第二个 Goroutine 不能依赖第一个 Goroutine 的写入结果。

Go 使用三种关系描述顺序：

```text
sequenced-before
synchronized-before
happens-before
```

同一个 Goroutine 内部的操作形成 `sequenced-before`；Mutex、Channel、Atomic 等同步操作可以建立 `synchronized-before`；两者共同构成 `happens-before`。

Go 也区分普通操作和原子操作。`counter++` 不是一个原子更新，需要使用 `sync.Mutex` 或 `sync/atomic`。

Java 和 Go 都使用 happens-before，但具体规则不能直接互换。分析代码时仍要回到各自的 Memory Model。

---

### 2.3 CPython 的并发语义

Python 没有一套适用于所有解释器实现、与 JMM 或 Go Memory Model 同等级的统一并发内存模型。本系列讨论最常用的 CPython。

#### 2.3.1 GIL 模式

默认的 GIL-enabled CPython 中：

```text
同一时刻只有一个线程持有 GIL，并执行 Python 字节码
```

但有 GIL 不等于共享状态天然线程安全。

解释器仍会在线程之间切换；执行阻塞 I/O 时会释放 GIL，扩展模块也可以主动释放它。GIL 主要保护 CPython 解释器及其对象模型，不能代替应用程序自己的同步。

因此：

```python
counter += 1
```

在 GIL 模式下，也不是并发安全的

#### 2.3.2 Free-threaded 模式

从 Python 3.13 开始，CPython 提供可禁用 GIL 的 Free-threaded 构建。在这种模式下，多个线程可以同时在不同 CPU Core 上执行 Python 代码。

| | GIL-enabled CPython | Free-threaded CPython |
|---|---|---|
| Python 代码执行 | 同一时刻只有一个线程持有 GIL | 多个线程可以在不同 Core 上并行执行 |
| 解释器内部状态 | 主要由 GIL 保护 | 使用更细粒度的锁和原子操作保护 |
| 应用层共享状态 | 需要显式同步 | 同样需要显式同步 |

Free-threaded 模式加强的是解释器内部并行能力，不会自动把应用层的 `counter += 1` 变成线程安全操作。部分尚未适配的扩展模块还可能在导入时重新启用 GIL。

具体范围和限制可以参考 Python 官方的 [Free-threading 文档](https://docs.python.org/3/howto/free-threading-python.html) 和 [PEP 703](https://peps.python.org/pep-0703/)。

#### 2.3.3 程序应该依赖什么？

Python 程序应该依赖明确的同步 API：

```text
threading.Lock
queue.Queue
threading.Event
threading.Condition
```

曾经提出统一并发内存模型的 [PEP 583](https://peps.python.org/pep-0583/) 已经撤回。因此，不应该把 CPython Lock 的实现行为直接称为 Python 官方的 happens-before 规则。

在 Python 中讨论并发安全，需要先说明使用的是哪一种同步 API；继续下钻实现时，还要说明讨论的是 CPython、PyPy，还是其他解释器。

---

## 3. 下一篇：互斥锁

下一篇开始讨论第一个具体同步工具：Mutex。

先回答：

```text
一把锁如何提供 Atomicity？
为什么前一个临界区的写入能被后一个看到？
锁如何约束同步边界两侧的顺序？
Java、Go 和 CPython 的锁有什么区别？
```

再下一篇沿着三种语言的具体实现，从 Runtime 继续追到 CPU。
