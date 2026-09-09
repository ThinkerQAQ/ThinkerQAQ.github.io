---
title: "并发编程（一）：先谈硬件——从 count++ 到 Hardware Memory Model"
description: "从冯·诺依曼体系结构和指令执行过程出发，沿着 count++ 分析原子性、缓存一致性、内存顺序与硬件内存模型。"
publishedAt: "2026-09-07T11:08:48+08:00"
language: zh
tags:
  - 并发编程
  - CPU
  - 内存模型
  - Java
  - Go
  - Python
status: published
featured: false
series: concurrency-programming
---

## 目录

- [0. 这一篇要解决什么问题？](#0-这一篇要解决什么问题)
- [1. 继续从 `count++` 开始](#1-继续从-count-开始)
- [2. CPU 到底怎样执行 `count++`？](#2-cpu-到底怎样执行-count)
  - [2.1 从冯诺依曼体系结构开始](#21-从冯诺依曼体系结构开始)
  - [2.2 `count++` 最终会变成什么？](#22-count-最终会变成什么)
- [3. 为什么需要 Cache？](#3-为什么需要-cache)
- [4. 单核下的并发问题：为什么 `count++` 会丢失更新？](#4-单核下的并发问题为什么-count-会丢失更新)
- [5. 从单核走向多核：多个缓存副本怎么办？](#5-从单核走向多核多个缓存副本怎么办)
- [6. 多个内存操作之间的顺序又怎么办？](#6-多个内存操作之间的顺序又怎么办)
  - [6.1 Store Buffer](#61-store-buffer)
  - [6.2 Out-of-Order Execution](#62-out-of-order-execution)
- [7. 到这里，我们实际上遇到了三个问题](#7-到这里我们实际上遇到了三个问题)
- [8. 硬件如何回答这三个问题？](#8-硬件如何回答这三个问题)
  - [8.1 Atomicity：Atomic Instruction](#81-atomicityatomic-instruction)
  - [8.2 多个缓存副本：Cache Coherence](#82-多个缓存副本cache-coherence)
  - [8.3 Ordering：Memory Ordering / Fence](#83-orderingmemory-ordering--fence)
- [9. Hardware Memory Model](#9-hardware-memory-model)
- [10. 从硬件重新回到语言](#10-从硬件重新回到语言)

---

## 0. 这一篇要解决什么问题？

上一篇我们从一个非常简单的例子开始：

```text
count = 0

Thread A -> count++
Thread B -> count++
```

并讨论了两种主要的并发协作方式：

```text
Shared Memory
Message Passing
```

上一篇最后把视角引向了硬件，并留下一个问题：

> **硬件到底提供了什么保证？**

为了回答它，这一篇需要进一步弄清楚：Lock、Mutex、Atomic、Channel 等并发工具依赖了哪些硬件能力。

语言会通过自己的 Memory Model 或并发语义告诉程序员：

```text
哪些操作是原子的？
一个执行单元的写入什么时候能被其他执行单元观察到？
多个操作之间具有什么顺序关系？
同步操作之间建立了什么关系？
```

但这些保证最终都必须落实到真实机器。

所以这一篇继续沿用同一个 `count` 例子，向下一层追问：

> **CPU 和内存系统到底会带来哪些并发问题，硬件又提供了什么能力？**

---

## 1. 继续从 `count++` 开始

假设：

```text
count = 0
```

两个执行单元都执行：

```text
count++
```

从程序语义上，可以把它理解成：

```text
读取 count
计算 count + 1
写回 count
```

因此可能出现：

```text
初始：

count = 0


A 读取 count -> 0
B 读取 count -> 0

A 计算 0 + 1
B 计算 0 + 1

A 写回 1
B 写回 1


最终：

count = 1
```

上一篇关注的是：

> **程序员应该怎样组织多个执行单元之间的协作？**

这一篇换一个角度：

> **这些“读取、计算、写入”，最终到底是怎样在 CPU 上发生的？**

---

## 2. CPU 到底怎样执行 `count++`？

### 2.1 从冯诺依曼体系结构开始

冯诺依曼提出将程序当作数据对待，把程序（指令）和数据用同样的方式存储。根据这个理论，计算机可以分成控制器、运算器、存储器、输入设备和输出设备。

运算器和控制器组成 CPU，CPU 内部还有寄存器。其中，**Program Counter（PC，程序计数器）保存下一条指令的地址**；Instruction Register（IR，指令寄存器）保存当前正在处理的指令；`R1` 这样的通用寄存器用于保存数据和中间结果。

```text
┌────────────┐                         ┌────────────┐
│  输入设备   │                         │  输出设备   │
└─────┬──────┘                         └─────▲──────┘
      │                                      │
      └──────────┬───────────────────────────┘
                 │ 系统总线
                 │
       ┌─────────┴─────────┐
       │                   │
       ▼                   ▼
┌─────────────────┐   ┌─────────────────┐
│       CPU       │   │     存储器       │
│                 │   │                 │
│  控制器          │   │  程序指令 + 数据 │
│  运算器          │   │                 │
│  寄存器          │   └─────────────────┘
│  PC / IR / R1…  │
└─────────────────┘
```

CPU 执行程序的过程可以简化为：

```text
PC 给出指令地址
        ↓
Fetch 取指 → Decode 译码 → Execute 执行
        ↓
PC 指向下一条指令，继续循环
```

后面提到 PC 时，只需要知道它决定 CPU 下一步从哪里取指令。

---

### 2.2 `count++` 最终会变成什么？

继续看：

```text
count++
```

为了便于讨论，可以把它简化理解成几步机器操作：

```text
LOAD  R1, [count]
ADD   R1, 1
STORE [count], R1
```

它们分别表示：

```text
LOAD
↓
读取 count 到寄存器 R1

ADD
↓
在 CPU 内部计算 R1 + 1

STORE
↓
把 R1 写回 count
```

所以：

```text
count++

        ↓

LOAD R1, [count]
        │
        └── 读取 count

        ↓

ADD R1, 1
        │
        └── CPU 内部计算

        ↓

STORE [count], R1
        │
        └── 写回 count
```

每条机器指令本身仍然会经历类似：

```text
Fetch -> Decode -> Execute
```

但这里真正值得关注的是：

> **LOAD 和 STORE 都需要访问数据。**

于是下一个问题自然出现：

> **如果每一次 LOAD / STORE 都要直接等待主存，会发生什么？**

---

## 3. 为什么需要 Cache？

CPU 的执行速度远高于主存访问速度。

如果：

```text
LOAD R1, [count]
```

每次都要等待主存返回数据，

或者：

```text
STORE [count], R1
```

每次都要等待主存完成数据访问，

CPU 会浪费大量时间等待 Memory。

于是 CPU 和主存之间加入了更快、容量更小的 Cache：

```text
CPU
 │
 ▼
L1 Cache
 │
 ▼
L2 Cache
 │
 ▼
L3 Cache
 │
 ▼
Memory
```

`count` 可能先被加载到 Cache：

```text
Memory
count = 0

   ↓

Cache
count = 0
```

之后 CPU 再访问 `count` 时，就可能直接命中 Cache，而不必每次都访问主存。

所以：

> **Cache 首先解决的是 CPU 与主存之间的速度差距。**

但 Cache 解决的是性能问题。

它并不会让：

```text
count++
```

自动变成安全的并发操作。

先从单核开始看。

---

## 4. 单核下的并发问题：为什么 `count++` 会丢失更新？

假设机器只有一个 CPU Core：

```text
Thread A ──┐
           │
           ├──> Core 0 ──> Cache ──> Memory
           │
Thread B ──┘
```

两个线程不能在这个 Core 上真正同时执行，但它们可以交替执行。

仍然从：

```text
count = 0
```

开始。

Thread A 先执行：

```text
LOAD count -> 0
```

随后发生线程切换：

```text
Thread A

LOAD count -> 0

     │
     │ context switch
     ▼

Thread B

LOAD  count -> 0
ADD   1
STORE count -> 1

     │
     │ context switch
     ▼

Thread A

ADD   1
STORE count -> 1
```

最终：

```text
count = 1
```

所以：

> **单核并不意味着没有并发问题。**

问题来自：

```text
LOAD
ADD
STORE
```

不是一个不可分割的整体。

只要一个执行单元进行到一半时，另一个执行单元插进来，就可能出现 Lost Update。

于是得到第一个问题：

> **问题一：一个复合操作如何不可分割地完成？**

也就是：

```text
Atomicity
```

这里先不回答。

继续往下看多核又会新增什么问题。

---

## 5. 从单核走向多核：多个缓存副本怎么办？

如果处理器拥有多个 CPU Core，那么两个线程可能真正同时执行：

```text
Thread A                     Thread B
   │                             │
   ▼                             ▼
Core A                        Core B
   │                             │
Cache A                       Cache B
   │                             │
   └────────── Memory ───────────┘
```

单核下的 `count++` 竞态仍然存在。

但多核还会带来一个新的问题。

假设：

```text
count = 0
```

Core A 和 Core B 都读取过 `count`。

那么同一份数据可能同时存在于不同 Cache 中：

```text
Core A Cache

count = 0


Core B Cache

count = 0


Memory

count = 0
```

现在 Core A 修改 `count`：

```text
Core A Cache

count = 1


Core B Cache

count = 0
```

于是问题来了：

> **Core B 手里的旧副本还能不能继续使用？**

也就是说：

> **问题二：同一个内存位置存在于多个 Core 的 Cache 中，一个 Core 修改以后，其他 Core 的副本怎么办？**

这里仍然先不回答。

继续看第三类问题。

---

## 6. 多个内存操作之间的顺序又怎么办？

为了继续沿用同一个 Counter，我们给它增加一个发布状态：

```text
count = 0
ready = false
```

Thread A 更新 Counter：

```text
count = 1
ready = true
```

Thread B：

```text
if ready {
    print(count)
}
```

程序员自然会希望：

> **如果 Thread B 已经看到 `ready = true`，那么它也应该看到前面写入的 `count = 1`。**

也就是说，我们希望 B 只出现下面两种结果：

```text
结果一：
B 读取 ready -> false
B 不进入 if

结果二：
B 读取 ready -> true
B 进入 if
B 读取 count -> 1
B 打印 1
```

真正需要防止的是第三种结果：

```text
A 执行 count = 1
但这个写入还没有被 B 观察到

A 执行 ready = true
B 读取 ready -> true

B 进入 if
B 读取 count -> 0
B 打印 0
```

问题不是 B 能不能读到 `ready = true`，而是：

> **当 B 已经读到 `ready = true` 时，如何保证它不能再读到旧的 `count = 0`？**

但这里已经不是：

```text
同一个 count 的多个缓存副本
```

而是两个不同的内存位置：

```text
count
ready
```

以及两个内存操作：

```text
count = 1
ready = true
```

之间的关系。

于是出现第三个问题：

> **问题三：多个内存操作允许按照什么顺序被其他 Core 观察？**

也就是：

```text
Memory Ordering
```

为什么硬件会让这个问题变复杂？

主要是因为现代 CPU 为了性能，会引入各种优化机制。

---

### 6.1 Store Buffer

假设 Core A 执行：

```text
STORE [count], 1
```

写入可能先进入 Store Buffer：

```text
Core A
  │
  ▼
Store Buffer
  │
  ▼
Cache / Memory System
```

CPU 不需要等待这个写入已经被其他 Core 观察到，才继续执行后面的工作。

因此：

```text
Core A 已经继续执行
```

并不意味着：

```text
Core B 已经观察到 count = 1
```

---

### 6.2 Out-of-Order Execution

现代 CPU 还会为了充分利用执行单元，在不破坏必要依赖关系的前提下调整内部执行顺序。

所以需要区分：

```text
源码中的顺序

        ≠

CPU 内部执行的顺序

        ≠

其他 Core 观察到内存效果的顺序
```

回到：

```text
count = 1
ready = true
```

真正需要回答的不是：

```text
源码里谁写在前面？
```

而是：

> **其他 Core 被允许以什么顺序观察这些内存操作？**

到这里，第三个问题也完整出现了。

---

## 7. 到这里，我们实际上遇到了三个问题

现在先不要急着讲解决方案。

把前面的问题放在一起看。

### 问题一：Atomicity

来自单核线程交错：

```text
count++

↓

LOAD
ADD
STORE
```

如果中间可以插入另一个执行单元：

```text
A LOAD 0

B LOAD 0
B ADD
B STORE 1

A ADD
A STORE 1
```

最终：

```text
count = 1
```

问题是：

> **一个复合操作如何不可分割地完成？**

---

### 问题二：多个缓存副本

来自多核：

```text
Core A Cache      Core B Cache

 count = 1         count = 0
```

问题是：

> **同一个内存位置被多个 Core 缓存，一个 Core 修改以后，其他 Core 的副本怎么办？**

---

### 问题三：Memory Ordering

来自多个不同的内存操作：

```text
count = 1
ready = true
```

问题是：

> **其他 Core 可以按照什么顺序观察这些内存操作？**

所以到这里，硬件层真正暴露出来的是三类问题：

```text
单核线程交错
    ↓
Atomicity


多核缓存副本
    ↓
副本协调


多个内存操作
    ↓
Memory Ordering
```

接下来再统一回答：

> **现代硬件分别提供了什么机制来处理这三个问题？**

---

## 8. 硬件如何回答这三个问题？

### 8.1 Atomicity：Atomic Instruction

先回答第一个问题：

```text
count++

↓

LOAD
ADD
STORE
```

普通的 `LOAD + ADD + STORE` 是多个步骤。

如果希望某个 Read-Modify-Write 操作不可分割，就需要硬件提供更底层的原子能力。

例如：

```text
Atomic Read-Modify-Write
Compare-And-Swap
```

可以抽象成：

```text
读取旧值
    │
修改
    │
写入新值
    │
    └── 对竞争者表现为一个不可分割的原子操作
```

语言层的很多并发工具最终都会建立在这些硬件能力之上，例如：

```text
Atomic
CAS
Lock
```

回到 `count++`。如果语言把自增实现为硬件支持的原子 Read-Modify-Write，那么执行过程可以理解为：

```text
初始：count = 0

Thread A：原子地把 count 从 0 改为 1
Thread B：原子地把 count 从 1 改为 2

最终：count = 2
```

A 和 B 谁先执行并不重要。重要的是，每次“读取旧值并写入新值”对另一个线程表现为一个不可分割的整体，因此不会再出现两边都读取 `0`、最后都写入 `1` 的情况。

所以第一个问题：

```text
一个复合操作如何不可分割地完成？
```

硬件提供的基础答案是：

> **Atomic Instruction。**

---

### 8.2 多个缓存副本：Cache Coherence

再回答第二个问题：

```text
Core A Cache      Core B Cache

 count = 1         count = 0
```

多核处理器必须协调多个 Core 对同一个内存位置的缓存副本。

这就是：

> **Cache Coherence。**

MESI 是最经典的缓存一致性协议之一：

```text
M - Modified
E - Exclusive
S - Shared
I - Invalid
```

真实处理器中也会使用 MESI 或它的扩展、变体，例如：

```text
MESI
MOESI
MESIF
...
```

本文不展开状态机的所有转换，只看它解决的问题。

假设两个 Core 都缓存了包含 `count` 的 Cache Line：

```text
Core A Cache              Core B Cache

count = 0                 count = 0
Shared                    Shared
```

如果 Core A 需要修改它：

```text
count = 1
```

硬件需要先协调这个 Cache Line 的所有权和其他副本状态。

可以高度简化理解为：

```text
Core A 要修改 count
        │
        ▼
取得对应 Cache Line 的写权限
        │
        ▼
其他不能继续使用的副本失效
        │
        ▼
Core A 完成修改
```

于是 Core B 原来的旧副本不能无限期继续被当成有效数据使用。

这里需要注意：

```text
Cache Coherence
      ≠
每次修改都必须立即写回 DRAM
```

修改后的 Cache Line 可以继续留在 Cache 中。

一致性协议负责的是：

> **同一个内存位置在不同 Core 的 Cache 中如何保持协调。**

回到 `count`。假设两个 Core 原来都缓存了 `count = 0`：

```text
Core A 要写入 count = 1
        ↓
Core A 取得对应 Cache Line 的写权限
        ↓
Core B 中 count = 0 的旧副本失效
        ↓
Core B 再次读取 count 时，不能继续使用旧副本
```

这样，Core B 后续访问 `count` 时必须取得有效副本，而不能无限期把旧的 `0` 当作当前值。需要注意，Cache Coherence 只协调同一内存位置的缓存副本，**它本身不会把 `LOAD + ADD + STORE` 变成原子操作**，所以不能单独解决 `count++` 的 Lost Update。

所以第二个问题：

```text
一个 Core 修改以后，
其他 Core 的缓存副本怎么办？
```

硬件提供的基础答案是：

> **Cache Coherence Protocol。**

---

### 8.3 Ordering：Memory Ordering / Fence

最后回答第三个问题：

```text
count = 1
ready = true
```

现代 CPU 为了性能会使用：

```text
Store Buffer
Out-of-Order Execution
```

因此硬件必须明确：

```text
哪些内存操作顺序是保证的？
哪些重排是允许的？
不同 Core 允许观察到哪些结果？
```

这就是：

> **Memory Ordering。**

不同处理器架构允许的 Memory Ordering 并不完全相同。

在需要更强顺序保证的时候，硬件还会提供：

```text
Memory Barrier / Fence
```

以及与之相关的：

```text
Acquire
Release
```

等顺序约束语义。

可以先高度理解成：

```text
普通执行
↓
CPU 可以进行某些优化和重排

需要额外顺序保证
↓
Fence / Barrier
↓
限制某些内存操作跨越这个边界
```

回到前面的 Counter 发布例子：

```text
Thread A / Core A                 Thread B / Core B

STORE count = 1                  value = LOAD-ACQUIRE ready
STORE-RELEASE ready = true       if value == true:
                                     LOAD count -> 1
                                 else:
                                     跳过本次读取
```

这里的 `ready` 必须是具有同步语义的原子变量。

`LOAD-ACQUIRE` **不保证 B 这一次就能读到 `true`**。如果 B 执行得更早，它完全可能读到 `false`，然后直接跳过 `if` 中的代码。这个例子没有等待，也不保证 B 以后一定会再次检查。

真正的保证是有条件的：**如果** B 的 `LOAD-ACQUIRE` 确实读到了 A 通过 `STORE-RELEASE` 写入的 `true`，这次发布和接收之间才建立同步关系。A 对 `count = 1` 的写入位于 Release 之前，B 对 `count` 的读取位于 Acquire 之后，因此 B 不能再把这次读取提前到 `ready` 检查之前，也不能在进入 `if` 后仍把旧的 `count = 0` 当作结果。

所以 Release / Acquire 解决的不是“让 B 立刻看到 `ready`”，而是：

> **当 B 已经看到 `ready = true` 时，让它也能正确看到 A 在发布之前完成的写入。**

具体由哪条原子指令或 Fence 实现这些约束，取决于处理器架构和上层语言。

所以第三个问题：

```text
多个内存操作允许按照什么顺序被其他 Core 观察？
```

硬件给出的基础答案是：

> **Memory Ordering Rules + Fence / Barrier。**

---

## 9. Hardware Memory Model

现在可以把这三个问题和硬件能力重新放在一起：

```text
问题一：
复合操作可能被打断
        ↓
Atomicity
        ↓
Atomic Instruction


问题二：
多个 Core 持有同一个数据的缓存副本
        ↓
Cache Coherence
        ↓
MESI / MOESI / MESIF ...


问题三：
多个内存操作的观察顺序可能不同
        ↓
Memory Ordering
        ↓
Fence / Barrier
```

但不同 CPU 架构不会提供完全相同的顺序保证。

例如：

```text
x86
ARM
```

它们对内存操作允许的顺序和可观察行为存在差异。

因此，硬件需要定义一套规则：

```text
哪些内存访问结果允许出现？
哪些顺序得到保证？
哪些原子操作可以依赖？
Fence / Barrier 能建立什么约束？
```

这些规则共同构成：

> **Hardware Memory Model。**

它描述的是：

> **在某种处理器架构上，不同执行单元被允许如何观察内存操作，以及软件可以依赖哪些硬件级保证。**

---

## 10. 从硬件重新回到语言

现在再回到本篇要解释的问题：

```text
为什么 synchronized 能工作？

为什么 Mutex 能工作？

为什么 Atomic / CAS 能工作？

为什么 Channel 能建立同步关系？
```

我们已经知道，最底层的机器提供了：

```text
Atomic Instruction
Cache Coherence
Memory Ordering
Fence / Barrier
```

但是程序员显然不希望直接面对：

```text
这台机器是 x86 还是 ARM？
这个 CPU 使用哪种 Cache Coherence 实现？
这里到底应该插入哪条 Fence？
当前编译器允许怎样优化？
```

所以在 Hardware Memory Model 之上，还需要：

```text
Compiler / Runtime
```

以及更上层的：

```text
Language Memory Model
/ Concurrency Semantics
```

整个链路可以表示为：

```text
Lock / Mutex / Atomic / Channel / Queue ...
        ▲
        │
Language Memory Model
/ Concurrency Semantics
        ▲
        │
Compiler / Runtime
        ▲
        │
Hardware Memory Model
        ▲
        │
Hardware mechanisms
        │
        ├── Atomic Instruction
        ├── Cache Coherence
        ├── Memory Ordering
        └── Fence / Barrier
        ▲
        │
CPU / Cache / Memory
```

硬件告诉上层：

> **机器能够提供什么。**

语言内存模型告诉程序员：

> **程序可以依赖什么。**

下一篇就从这里重新向上走：

继续沿用同一个 Counter：

```text
count++
```

看 Java、Go 和 Python 如何把底层硬件能力进一步抽象成程序员真正面对的：

```text
Atomicity
Visibility
Ordering
Synchronization
```
