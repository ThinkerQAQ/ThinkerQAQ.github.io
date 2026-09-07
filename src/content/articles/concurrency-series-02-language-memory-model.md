---
title: "并发编程（二）：语言内存模型——程序员到底可以依赖什么？"
description: "从硬件内存模型回到语言层，理解语言为什么需要定义内存模型，以及 Java、Go 与 CPython 分别为并发程序提供哪些基本保证。"
publishedAt: "2026-09-07T15:13:00+08:00"
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
- [2. 语言层到底要解决什么问题？](#2-语言层到底要解决什么问题)
- [3. Java Memory Model](#3-java-memory-model)
- [4. Go Memory Model](#4-go-memory-model)
- [5. CPython 的并发语义](#5-cpython-的并发语义)
- [6. 下一篇：进入并发工具](#6-下一篇进入并发工具)

---

## 0. 从上一篇继续

上一篇讲到，硬件通过原子指令、缓存一致性协议、内存顺序和 Fence 提供底层能力，并用 Hardware Memory Model 描述软件可以依赖的硬件行为。

但程序员通常不会直接操作这些硬件机制，而是使用：

```text
Java    -> synchronized / volatile / AtomicInteger
Go      -> sync.Mutex / sync/atomic / channel
Python  -> threading.Lock / queue.Queue
```

所以这一篇向上回到语言层，只回答一个问题：

> **编程语言如何把不同硬件提供的能力，转换成程序员可以依赖的并发规则？**

---

## 1. 为什么有了 Hardware Memory Model 还不够？

源代码需要经过编译器和 Runtime，最终才能在 CPU 上执行。编译器会优化代码，而 x86、ARM 等处理器提供的内存顺序保证也不完全相同。

如果程序员必须分别研究 Java 或 Go 在每一种 CPU 上的行为，跨平台并发编程就会非常困难。因此，语言需要定义一套独立于具体硬件的规则。

把这几层的关系简化来看：

```text
Source Code
    │
    ▼
Language Memory Model
    │
    ▼
Compiler / Runtime
    │
    ▼
Hardware Memory Model
    │
    ▼
CPU / Cache / Memory
```

Language Memory Model 定义程序员可以依赖的规则，编译器和 Runtime 再根据具体硬件实现这些保证。

例如，程序员真正需要判断的是：当 Thread B 看到 `ready = true` 时，语言是否保证它也能看到之前写入的 `count = 1`。至于这个保证在 x86 或 ARM 上需要哪些指令，由编译器和 Runtime 负责实现。

所以语言内存模型最终要回答：

> **不管底层 CPU 是什么，程序可以依赖哪些并发保证？**

---

## 2. 语言层到底要解决什么问题？

继续沿用上一篇的三个问题。

### Atomicity

```text
count++

↓

LOAD
ADD
STORE
```

程序员需要知道：

> **哪些操作可以被视为不可分割？**

---

### Visibility

一个执行单元：

```text
count = 1
```

另一个执行单元：

```text
read count
```

程序员需要知道：

> **在什么条件下，后者能够可靠地观察到前面的写入？**

---

### Ordering

```text
count = 1
ready = true
```

程序员需要知道：

> **另一个执行单元能够按照什么顺序观察这些操作？**

---

所以语言层真正做的事情，是把底层复杂的：

```text
Cache Coherence
Memory Ordering
Fence
Atomic Instruction
```

转换成程序员可以直接依赖的：

```text
Synchronization Rules
```

也就是说，语言需要定义：

- 哪些操作具有原子性？
- 哪些操作之间建立同步关系？
- 一次读取允许观察到哪次写入？
- 什么情况构成 Data Race？

下面分别看 Java、Go 和 CPython 是怎么描述这些规则的。

---

# 3. Java Memory Model

Java 明确定义了：

```text
Java Memory Model
        ↓
JMM
```

JMM 不要求程序员去判断：

```text
变量在哪一级 Cache？
什么时候写回 DRAM？
CPU 使用什么缓存一致性协议？
```

它定义的是：

> **Java 程序中的线程操作之间，哪些结果允许出现，哪些同步关系能够提供确定的可见性和顺序保证。**

JMM 同时规定原子性的边界：哪些读写操作具有原子性，哪些复合操作不具有原子性。例如 `count++` 需要使用 `synchronized` 或 Atomic 类型才能作为一个整体完成。

其中最核心的可见性和有序性分析概念之一是：

```text
happens-before
```

先看最简单的例子：

```java
int count = 0;

// Thread A
count = 1;

// Thread B
System.out.println(count);
```

这里只看一个问题：

> **Thread B 是否保证看到 `1`？**

答案是：

> **不保证。**

因为 Thread A 和 Thread B 之间没有建立 JMM 规定的同步关系。

JMM 用 `happens-before` 描述这种可依赖的顺序关系。

可以先简单理解为：

```text
A happens-before B
        │
        ▼
A 产生的相关内存效果
可以被 B 可靠地观察
```

这里不展开完整的 happens-before 规则。

后面讲具体工具时，再分别讨论：

```text
synchronized
volatile
Thread.start()
Thread.join()
Atomic
...
```

它们各自建立什么 happens-before 关系，以及提供什么原子性保证。

这一节只需要先记住：

> **JMM 规定了 Java 操作的原子性边界，以及线程之间什么时候可以可靠地观察彼此的内存操作。**

---

# 4. Go Memory Model

Go 同样明确规定了：

```text
Go Memory Model
```

它关注的核心问题同样是：

> **一个 Goroutine 对内存的读取，在什么条件下能够可靠地观察到另一个 Goroutine 的写入？**

Go Memory Model 也区分普通操作和原子操作。`count++` 这样的普通复合操作不具有原子性，需要使用 `sync/atomic` 或 `sync.Mutex`。

继续看同一个例子：

```go
var count int

go func() {
    count = 1
}()

go func() {
    fmt.Println(count)
}()
```

问题仍然是：

> **第二个 Goroutine 是否保证打印 `1`？**

答案是：

> **不保证，而且这里存在 Data Race。**

两个 Goroutine 之间没有通过 Go 规定的同步操作建立关系。

Go Memory Model 使用类似下面的关系描述执行顺序：

```text
sequenced-before
synchronized-before
happens-before
```

这里同样不展开完整定义。

只需要先理解：

```text
没有同步关系
    ↓
不能依赖另一个 Goroutine 的写入结果

建立同步关系
    ↓
才能依赖 Memory Model 提供的保证
```

后面讲具体工具时，再分别讨论：

```text
sync.Mutex
channel
sync/atomic
WaitGroup
...
```

它们各自建立什么同步关系，以及提供什么原子性保证。

这一节只需要先记住：

> **Go Memory Model 规定了 Go 操作的原子性边界，以及 Goroutine 之间什么时候可以可靠地观察彼此的内存操作。**

---

# 5. CPython 的并发语义

Python 这里直接讨论：

> **CPython。**

先看同一个共享变量例子：

```python
count = 0

# Thread A
count = 1

# Thread B
print(count)
```

传统 CPython 中存在：

```text
GIL
↓
同一时刻通常只有一个线程执行 Python 字节码
```

这和上一篇讲过的“单核并发”很像：

```text
多个线程
    ↓
同一时刻只有一个执行单元真正运行
    ↓
线程之间仍然会发生切换
    ↓
依然存在并发问题
```

所以：

> **有 GIL，不等于没有并发问题，也不等于共享状态天然线程安全。**

例如：

```python
count += 1
```

仍然不应该被当成可靠的原子操作或跨线程同步方式。

真正需要共享可变状态时，仍然应该使用明确的同步原语，例如：

```text
threading.Lock
queue.Queue
...
```

Python 目前没有一套正式接受的、统一使用 `happens-before` 定义的语言内存模型；曾经提出这套模型的 [PEP 583](https://peps.python.org/pep-0583/) 已经撤回。

这不代表 Python 无法讨论并发安全。Python 程序应当依赖 `Lock`、`Queue`、`Event`、`Condition` 等同步 API 明确定义的行为来保护和传递共享状态，而不是依赖 GIL。其分析思路与 `happens-before` 类似，但不应把它称为 Python 官方的 `happens-before` 规则。

这一篇先不继续展开 GIL 的内部实现，也不展开 Free-threaded CPython。

这些内容可以放到后面的 CPython 专篇里讨论。

这一节只需要先记住：

> **CPython 中存在 GIL，但并发正确性仍然需要依赖明确的同步机制。**

---

# 6. 下一篇：进入并发工具

下一篇开始进入具体并发工具，首先讨论 Java、Go 和 Python 中的互斥锁，并持续回答三个问题：

```text
它解决什么并发问题？
它提供什么原子性保证？
它建立什么同步关系？
```
