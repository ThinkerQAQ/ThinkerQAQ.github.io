---
title: "并发编程（六）：Atomic 的实现——从 Runtime 到 CPU"
description: "沿着 Java AtomicInteger、Go sync/atomic 和 CPython 内部原子操作的实现路径，理解 Atomic RMW 如何落到编译器、Runtime 与 CPU。"
publishedAt: "2026-09-08T23:36:00+08:00"
language: zh
tags:
  - 并发编程
  - Atomic
  - CAS
  - Java
  - Go
  - CPython
status: published
featured: false
series: concurrency-programming
---

## 目录

- [0. 这一篇继续回答什么？](#0-这一篇继续回答什么)
- [1. Atomic 需要哪些底层能力？](#1-atomic-需要哪些底层能力)
  - [1.1 Atomic RMW：直接完成一次更新](#11-atomic-rmw直接完成一次更新)
  - [1.2 CAS：当前值符合预期时才更新](#12-cas当前值符合预期时才更新)
  - [1.3 Memory Ordering：限制编译器和 CPU 重排](#13-memory-ordering限制编译器和-cpu-重排)
- [2. Java：从 AtomicInteger 到 CPU](#2-java从-atomicinteger-到-cpu)
  - [2.1 AtomicInteger 与 HotSpot Intrinsic](#21-atomicinteger-与-hotspot-intrinsic)
  - [2.2 x86-64 上的原子加法和 CAS](#22-x86-64-上的原子加法和-cas)
  - [2.3 从 Runtime 到 CPU：Java 实现总结](#23-从-runtime-到-cpujava-实现总结)
- [3. Go：从 sync/atomic 到 CPU](#3-go从-syncatomic-到-cpu)
  - [3.1 atomic.Int64 与 internal/runtime/atomic](#31-atomicint64-与-internalruntimeatomic)
  - [3.2 amd64 上的原子加法和 CAS](#32-amd64-上的原子加法和-cas)
  - [3.3 从 Runtime 到 CPU：Go 实现总结](#33-从-runtime-到-cpugo-实现总结)
- [4. CPython：Runtime 内部的 Atomic](#4-cpythonruntime-内部的-atomic)
  - [4.1 _Py_atomic 与编译器 Builtin](#41-_py_atomic-与编译器-builtin)
  - [4.2 Linux x86-64 上的实现](#42-linux-x86-64-上的实现)
  - [4.3 从 Runtime 到 CPU：CPython 实现总结](#43-从-runtime-到-cpucpython-实现总结)
- [5. Atomic 与 CAS 的代价](#5-atomic-与-cas-的代价)
  - [5.1 CAS 失败需要重试](#51-cas-失败需要重试)
  - [5.2 Cache Line 竞争仍然存在](#52-cache-line-竞争仍然存在)
  - [5.3 ABA：值相同不代表没有变化](#53-aba值相同不代表没有变化)
- [6. 三种实现放在一起看](#6-三种实现放在一起看)
- [7. 下一篇：volatile](#7-下一篇volatile)

---

## 0. 这一篇继续回答什么？

上一篇讨论了 Atomic 在语言层提供的原子性、可见性和有序性。这一篇继续向下看：这些保证如何经过编译器和 Runtime，最终落到 CPU。

仍然只使用前面的两个例子：

```text
counter++
```

以及：

```text
counter = 1
ready = true
```

实现路径可以概括为：

```text
语言 API 与内存模型
        ↓
编译器 / Runtime
        ↓
CPU Atomic Instruction / Memory Ordering
```

---

## 1. Atomic 需要哪些底层能力？

### 1.1 Atomic RMW：直接完成一次更新

前面已经把“读取—修改—写回”简称为 RMW。普通的 `counter++` 包含多个步骤，执行过程可能与另一边交错。

Atomic RMW 把一次更新作为不可分割的操作完成：

```text
CPU A                       CPU B

Atomic Add counter, 1       Atomic Add counter, 1
        │                           │
        ▼                           ▼
      0 -> 1                       1 -> 2
```

注意Atomic RMW 是一类操作，包括：

```text
Fetch-And-Add
Exchange
Compare-And-Swap
Atomic Bitwise Operation
```

CAS 只是其中一种。

### 1.2 CAS：当前值符合预期时才更新

CAS 接收内存地址、期望值和新值：

```text
CAS(address, expected, newValue)
```

它原子地完成比较和条件更新：

```text
读取当前值
    ↓
是否等于 expected？
   /             \
 是               否
 │                 │
 ▼                 ▼
写入 newValue      保持不变
返回成功            返回失败
```

CAS 可以构造需要根据旧值计算新值的更新：

```text
loop:
    old = atomic_load(counter)
    new = old + 1

    if CAS(counter, old, new):
        break
```

但这不是 Atomic Add 的唯一实现方式。具体使用原子加法还是 CAS，由语言 API、编译器和目标架构决定。

### 1.3 Memory Ordering：限制编译器和 CPU 重排

原子地修改 `ready` 只解决了这一次读写本身不能交错。要让它发布前面的 `counter`，还需要相应的内存顺序：

```text
执行单元 A                  执行单元 B

counter = 1
AtomicStore(ready, true)

                            if AtomicLoad(ready) {
                                print(counter)
                            }
```

实现需要同时处理两层约束：

```text
编译器
不能生成破坏语言内存模型的重排

        +

CPU
使用目标架构的原子指令和内存顺序机制
```

不同语言对 Atomic 操作规定的内存顺序不同，底层生成的指令也不必完全相同。

---

## 2. Java：从 AtomicInteger 到 CPU

### 2.1 AtomicInteger 与 HotSpot Intrinsic

Java 的原子加法从：

```java
AtomicInteger counter = new AtomicInteger();
counter.incrementAndGet();
```

开始。当前实现可以沿着下面的路径理解：

```text
AtomicInteger.incrementAndGet()
        ↓
Unsafe / VarHandle Atomic Operation
        ↓
HotSpot Intrinsic
        ↓
目标 CPU 的 Atomic RMW
```

HotSpot 可以把这些操作识别为 Intrinsic，直接生成目标架构支持的原子更新，而不是一定在 Java 层执行 CAS Loop。

`compareAndSet()` 则沿着对应的 CAS Intrinsic 落到目标 CPU：

```text
AtomicInteger.compareAndSet()
        ↓
HotSpot CAS Intrinsic
        ↓
CPU Compare-And-Swap
```

### 2.2 x86-64 上的原子加法和 CAS

固定到 x86-64，原子加法可以简化理解为：

```asm
mov  eax, 1
lock xadd dword ptr [counter], eax
```

`XADD` 读取旧值并写入 `old + 1`；`LOCK` 前缀让整个 RMW 对其他 Core 表现为不可分割。

CAS 可以简化理解为：

```asm
; EAX 保存 expected
; ECX 保存 newValue
lock cmpxchg dword ptr [counter], ecx
sete al
```

这些是等价的简化形式，不代表某个具体 JVM 版本生成的完整指令序列。

对于 `counter + ready`，HotSpot 还要按照 JMM 和具体 Atomic 方法的内存效果限制编译期重排，并把这些约束映射到 x86-64 的内存顺序能力。不能只看到 `LOCK` 指令，就忽略编译器这一层。

### 2.3 **从 Runtime 到 CPU：Java 实现总结**

```text
AtomicInteger.incrementAndGet / compareAndSet / get
        ↓ AtomicInteger / Unsafe / VarHandle
HotSpot C2 Intrinsic 与内存顺序约束
        ↓ x86-64
LOCK XADD / LOCK CMPXCHG / MOV
```

> **`incrementAndGet()` 经过 `Unsafe.getAndAddInt()` 被 HotSpot 识别为 Intrinsic，在 x86-64 上可以生成 `lock xadd`；`compareAndSet()` 可以生成 `lock cmpxchg`，`get()` 则按 volatile 读处理。带 `LOCK` 的 RMW 指令保证单次更新不可分割，HotSpot 按照这些方法的内存效果限制编译器重排，再结合 x86-64 的内存顺序保证跨线程的可见性和顺序。因此，当 B 的 `get()` 观察到 A 对 `counter` 的更新时，也能看到 A 在更新前写入的 `ready`。**

---

## 3. Go：从 sync/atomic 到 CPU

### 3.1 atomic.Int64 与 internal/runtime/atomic

Go 的原子加法从：

```go
var counter atomic.Int64
counter.Add(1)
```

开始。实现路径可以概括为：

```text
atomic.Int64.Add
        ↓
sync/atomic
        ↓
internal/runtime/atomic
        ↓
目标架构的 Atomic RMW
```

CAS 的路径类似：

```text
atomic.Int64.CompareAndSwap
        ↓
internal/runtime/atomic
        ↓
CPU Compare-And-Swap
```

Go Memory Model 规定 Atomic 操作的可观察结果，编译器和架构实现不能生成违反这些规则的代码。

### 3.2 amd64 上的原子加法和 CAS

在 amd64 上，原子加法可以落到带 `LOCK` 前缀的 `XADD`：

```asm
LOCK
XADDQ AX, 0(BX)
```

CAS 可以落到：

```asm
LOCK
CMPXCHGQ CX, 0(BX)
```

因此 `counter.Add(1)` 可以直接使用硬件原子加法，不需要先写成 CAS Loop。

对于 `counter + ready`，编译器还要保留 Go Memory Model 对 Atomic 操作规定的顺序关系。amd64 的实现选择了强内存顺序的原子指令；其他架构可以使用不同的指令和屏障组合。

### 3.3 **从 Runtime 到 CPU：Go 实现总结**

```text
atomic.Int64.Add / CompareAndSwap / Load
        ↓ sync/atomic
internal/runtime/atomic / 编译器 Atomic 操作
        ↓ amd64 汇编
LOCK XADD / LOCK CMPXCHG / MOV
```

> **`atomic.Int64.Add()` 经过 `sync/atomic` 和编译器、Runtime 的 Atomic 操作，在 amd64 上可以生成 `LOCK XADD`；`CompareAndSwap()` 可以生成 `LOCK CMPXCHG`，`Load()` 则使用原子 Load。带 `LOCK` 的指令完成不可分割的 RMW，编译器同时保留 Go Memory Model 规定的顺序关系。因此，如果 B 的 `Load()` 观察到 A 的 `Add()`，两者之间就建立 synchronized-before，A 在更新前写入的 `ready` 也必须对 B 可见。**

---

## 4. CPython：Runtime 内部的 Atomic

Python 标准库没有与 Java `AtomicInteger`、Go `atomic.Int64` 对称的通用整数 Atomic API。本节讨论的是 CPython Runtime 内部实现，不把它写成普通 Python 程序可以直接依赖的接口。

### 4.1 _Py_atomic 与编译器 Builtin

CPython 内部使用：

```text
_Py_atomic_add_*
_Py_atomic_compare_exchange_*
_Py_atomic_exchange_*
_Py_atomic_load_*
_Py_atomic_store_*
```

在 GCC / Clang 环境下，这些封装会继续使用编译器 Atomic Builtin：

```text
__atomic_fetch_add
__atomic_compare_exchange_n
__atomic_load_n
__atomic_store_n
```

实现路径是：

```text
CPython Runtime
        ↓
_Py_atomic_*
        ↓
GCC / Clang Atomic Builtin
        ↓
目标 CPU 的原子指令和内存顺序机制
```

### 4.2 Linux x86-64 上的实现

在 Linux x86-64 + GCC / Clang 下，原子加法通常可以生成 `LOCK XADD`，CAS 通常可以生成 `LOCK CMPXCHG`。

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

具体指令取决于编译器版本、目标架构、操作宽度和内存顺序参数，所以这里只说明典型路径。

### 4.3 **从 Runtime 到 CPU：CPython 实现总结**

```text
CPython Runtime 内部状态
        ↓ _Py_atomic_*
GCC / Clang __atomic Builtin
        ↓ Linux x86-64
LOCK XADD / LOCK CMPXCHG / MOV 与必要的顺序约束
```

> **CPython Runtime 先通过 `_Py_atomic_add_*`、`_Py_atomic_compare_exchange_*`、`_Py_atomic_load_*` 等内部接口表达原子操作和所需的内存顺序，再由 GCC / Clang 的 `__atomic` Builtin 生成目标代码。在 Linux x86-64 上，原子加法通常落到 `LOCK XADD`，CAS 通常落到 `LOCK CMPXCHG`，Load / Store 和必要的顺序约束则按具体内存顺序参数生成。原子指令保证 Runtime 状态更新不可分割，编译器和 CPU 按参数维持可见性与顺序；但整条路径只服务于 CPython 内部，不是普通 Python 代码可以调用的 Atomic API。**

---

## 5. Atomic 与 CAS 的代价

前面已经把 Atomic 一路追到 CPU。接下来再看它的代价：竞争变多以后，CAS 可能反复重试，同一条 Cache Line 会在多个 Core 之间来回转移，还可能遇到 ABA。

### 5.1 CAS 失败需要重试

低竞争时，一个 CAS Loop 可能一次成功：

```text
read old
CAS success
```

高竞争时，多个执行单元可能同时读取同一个旧值：

```text
Thread A        Thread B        Thread C

read 10         read 10         read 10
CAS success     CAS failed      CAS failed
                retry           retry
```

失败者需要重新读取、计算和尝试。Atomic 避免进入 Mutex 的 Park / Wakeup 路径，不代表竞争没有成本。

### 5.2 Cache Line 竞争仍然存在

多个 Core 反复修改同一个 `counter` 时，相关 Cache Line 的修改权仍然要在 Core 之间转移：

```text
Core A 修改 counter
        ↓
取得 Cache Line 修改权
        ↓
Core B 修改 counter
        ↓
修改权再次转移
```

Atomic 去掉了应用层临界区，但没有去掉共享内存竞争。高竞争计数场景可能需要分散热点的设计，不能只比较 Atomic 和 Mutex 的 API 长短。

### 5.3 ABA：值相同不代表没有变化

CAS 只比较当前值是否仍等于 expected。

假设执行单元 A 读到：

```text
counter = 1
```

随后执行单元 B 完成：

```text
1 -> 2 -> 1
```

A 恢复后执行：

```text
CAS(counter, 1, 3)
```

CAS 会成功，因为当前值又变回了 `1`，但中间确实发生过变化。这就是 ABA：

```text
值仍然相同
    ≠
期间没有变化
```

一种处理方式是把值和版本一起比较：

```text
(1, version=1)
        ↓
(2, version=2)
        ↓
(1, version=3)
```

Java 已经把这种做法封装成 [`AtomicStampedReference`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/AtomicStampedReference.html)：CAS 会同时比较引用和版本号。即使引用从 A 变成 B 后又变回 A，版本号也已经改变，因此不会被误认为“期间没有变化”。

Go 的 `sync/atomic` 没有直接对应的 Stamped Reference。如果值和版本号可以放进同一个 `uint64`，可以把两者编码在一起，再用 `CompareAndSwap` 整体更新；无法放进一个原子变量时，就需要用 Mutex 保护这两个值。

Python 应用层没有公共 CAS API，也没有与 `AtomicStampedReference` 对称的类型。CPython Runtime 如果使用 CAS 实现具体算法，需要在自己的数据结构中处理 ABA，不能给普通 Python 代码提供一套通用写法。

---

## 6. 三种实现放在一起看

| | Java | Go | CPython |
|---|---|---|---|
| 上层入口 | `AtomicInteger` 等 | `sync/atomic` | Runtime 内部 `_Py_atomic_*` |
| 中间层 | Unsafe / VarHandle、HotSpot Intrinsic | `internal/runtime/atomic` | GCC / Clang Atomic Builtin |
| x86-64 原子加法 | 典型为 `LOCK XADD` | `LOCK XADD` | 典型为 `LOCK XADD` |
| x86-64 CAS | 典型为 `LOCK CMPXCHG` | `LOCK CMPXCHG` | 典型为 `LOCK CMPXCHG` |
| 应用层公共 API | 有 | 有 | 没有对称的通用整数 Atomic API |

三种实现最终使用的是同类硬件能力，但语言 API、规范来源和 Runtime 路径并不相同。

---

## 7. 下一篇：volatile

Atomic 解决的是 `counter++` 这类复合更新。如果只是让一个线程发布状态，并让另一个线程看到这个状态以及此前的写入，就不一定需要 Atomic RMW。在 Java 中，这类场景可以使用 `volatile`。下一篇继续讨论这一点，并比较 Go 和 CPython 的做法。
