---
title: "并发编程（三）：互斥锁——语言层的原子性、可见性与有序性"
description: "继续使用 counter++，理解互斥锁如何提供原子性、可见性和有序性，并比较 Java synchronized、Go sync.Mutex 与 CPython threading.Lock 的语义差异。"
publishedAt: "2026-09-08T18:32:54+08:00"
updatedAt: "2026-09-10T19:26:42+08:00"
language: zh
tags:
  - 并发编程
  - Mutex
  - Java
  - Go
  - Python
status: published
featured: false
series: concurrency-programming
---

## 目录

- [0. 从上一篇继续](#0-从上一篇继续)
- [1. 一把互斥锁保证什么？](#1-一把互斥锁保证什么)
  - [1.1 Atomicity：临界区不能交错](#11-atomicity临界区不能交错)
  - [1.2 Visibility：前一个临界区的写入需要被后一个看到](#12-visibility前一个临界区的写入需要被后一个看到)
  - [1.3 Ordering：锁还是一个内存顺序边界](#13-ordering锁还是一个内存顺序边界)
- [2. 三种语言如何定义这条同步边界？](#2-三种语言如何定义这条同步边界)
  - [2.1 Java：synchronized 与 Monitor](#21-javasynchronized-与-monitor)
  - [2.2 Go：sync.Mutex](#22-gosyncmutex)
  - [2.3 CPython：threading.Lock](#23-cpythonthreadinglock)
- [3. 下一篇：互斥锁是怎么实现的？](#3-下一篇互斥锁是怎么实现的)

---

## 0. 从上一篇继续

上一篇讨论的是语言内存模型：Java、Go 和 CPython 分别允许程序员依赖什么。

接下来进入第一个具体的同步工具：

```text
Mutex
```

这一篇继续使用 `counter++`，只讨论语言层：

> **一把互斥锁到底向程序员保证了什么？**

至于这些保证如何经过 Runtime，最终落到 CPU，放到下一篇再讲。

---

## 1. 一把互斥锁保证什么？

仍然从：

```text
counter++
```

开始。它执行到 CPU 时，可以简化理解为：

```text
LOAD  counter
ADD   1
STORE counter
```

两个执行单元同时执行这三个步骤，可能得到：

```text
Thread A                    Thread B

LOAD counter -> 0
                            LOAD counter -> 0
ADD 1 -> 1
                            ADD 1 -> 1
STORE counter = 1
                            STORE counter = 1
```

最终 `counter = 1`。

在 `counter++` 外使用同一把锁以后：

```text
Thread A                    Thread B

lock
LOAD counter -> 0
ADD 1
STORE counter = 1
unlock

                            lock
                            LOAD counter -> 1
                            ADD 1
                            STORE counter = 2
                            unlock
```

最终 `counter = 2`。

但一把锁提供的不只是“两个执行单元不能同时进入”。

### 1.1 Atomicity：临界区不能交错

`lock` 和 `unlock` 之间是临界区。使用同一把锁时，一个执行单元完成整个临界区之前，另一个不能进入。

这里的 Atomicity 不是把 `counter++` 变成一条 CPU 指令，而是：

```text
LOAD counter
ADD 1
STORE counter
```

也就是说，在一个执行单元释放锁之前，另一个使用同一把锁的执行单元不能进入临界区，也就不能插进这三个步骤之间。

### 1.2 Visibility：前一个临界区的写入需要被后一个看到

假设 A 先执行：

```text
Thread A

lock
counter++       // counter = 1
unlock
```

B 随后获得同一把锁：

```text
Thread B

lock
print(counter)  // 必须看到 1
unlock
```

因此，前一个执行单元释放锁之前的内存效果，需要能够被随后获得同一把锁的执行单元观察。

### 1.3 Ordering：锁还是一个内存顺序边界


```text
counter = 0
ready = false
```

```text
Thread A                    Thread B

lock                        lock
counter++                   if ready {
ready = true                   print(counter)
unlock                      }
                            unlock
```

如果 B 获得同一把锁以后读到：

```text
ready = true
```

那么它随后读到的 `counter` 必须是 `1`，不能是旧值 `0`：

```text
Thread A                              Thread B
   │                                     │
   ├─ 写入 counter = 1                   │
   ├─ 写入 ready = true                  │
   └─ unlock ──── 同一把锁 ──────────>├─ lock
                                         ├─ 读取 ready = true
                                         └─ 读取 counter = 1
```


所以一把锁需要同时回答三个问题：

| 问题 | 程序员可以依赖什么 |
|---|---|
| Atomicity | 受同一把锁保护的临界区不能交错 |
| Visibility | 前一个临界区完成的写入可以被后一个临界区观察 |
| Ordering | 后一个执行单元获得同一把锁后，看到的结果必须符合前一个临界区中的执行顺序 |

---

## 2. 三种语言如何定义这条同步边界？

使用这三种锁时，程序员最终关心的都是 Atomicity、Visibility 和 Ordering。下面不再重复结论，而是看各自的规范或 API 提供了哪条规则，以及如何从这条规则推出前面的三项保证。

### 2.1 Java：synchronized 与 Monitor

Java 的 `synchronized` 锁定对象关联的 Monitor。[JLS §17.1](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.1) 规定：

> **“Only one thread at a time may hold a lock on a monitor.”**

这条规则对应 Atomicity。同一时刻只有一个线程能持有 Monitor，所以只有它能进入临界区，其他使用同一 Monitor 的线程只能等待。

[JLS §17.4.5](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.4.5) 还规定：

> **“An unlock on a monitor happens-before every subsequent lock on that monitor.”**

这条规则同时对应 Visibility 和 Ordering。

对于 Visibility，A 的写入发生在 `unlock` 之前，B 的读取发生在后续 `lock` 之后。通过 happens-before 的传递性，A 在临界区中的写入对 B 可见。

对于 Ordering，A 内部的写入顺序、`unlock → lock` 和 B 内部的读取顺序被连成一条 happens-before 链。因此，B 不能看到 `ready = true、counter = 0` 这种违反该顺序的结果。

### 2.2 Go：sync.Mutex

Go 的 `sync.Mutex` 不绑定某个 Goroutine，也不提供可重入语义。[`sync.Mutex.Lock`](https://pkg.go.dev/sync#Mutex.Lock) 规定：

> **“If the lock is already in use, the calling goroutine blocks until the mutex is available.”**

这条规则对应 Atomicity。一个 Goroutine 持有 Mutex 时，其他 Goroutine 会等待，不能进入受同一 Mutex 保护的临界区。

[The Go Memory Model - Locks](https://go.dev/ref/mem#Locks) 还规定：

> **“For any `sync.Mutex` or `sync.RWMutex` variable `l` and n < m, call n of `l.Unlock()` is synchronized before call m of `l.Lock()` returns.”**

这条规则同时对应 Visibility 和 Ordering。

对于 Visibility，A 的写入 sequenced-before `Unlock`，`Unlock` 又 synchronized-before B 的 `Lock` 返回，B 的读取发生在 `Lock` 返回之后。这些关系组成 happens-before，因此 A 的写入对 B 可见。

对于 Ordering，同一条 happens-before 链把 A 内部的写入顺序、`Unlock → Lock` 和 B 内部的读取顺序连起来。因此，B 同样不能看到 `ready = true、counter = 0`。

### 2.3 CPython：threading.Lock

Python 官方的 [`threading.Lock`](https://docs.python.org/3/library/threading.html#lock-objects) 文档规定：

> **“A primitive lock is a synchronization primitive that is not owned by a particular thread when locked.”**
>
> **“All methods are executed atomically.”**

第二条规则对应 Atomicity。Lock 已经被获得时，其他线程的 `acquire()` 会等待；因此同一时刻只有一个线程能进入受同一把 Lock 保护的临界区。

Visibility 和 Ordering 则不能像 Java、Go 那样从一条正式的 Memory Model 规则推出。Python 没有定义 `release → acquire` 的 happens-before 关系；官方文档只把 Lock 定义为 synchronization primitive。

因此，Python 程序应该使用同一把 Lock 同步共享状态，而不是依赖 GIL 或某条字节码当前是否可中断。在 CPython 中，Lock 如何落实跨临界区的可见性和顺序边界，需要到下一篇继续下钻实现。

---

## 3. 下一篇：互斥锁是怎么实现的？

这一篇停在语言层。下一篇 [《并发编程（四）：互斥锁的实现——从 Runtime 到 CPU》](/articles/concurrency-series-04-mutex-implementation/) 按同样的三个问题继续下钻实现层：

- Atomicity：Atomic RMW 如何决定谁能获得锁？
- Visibility：释放前的写入如何被后续获取者看到？
- Ordering：Compiler 和 CPU 如何维持同步边界？

竞争失败后的 Spin、Park 和 Wakeup 则作为独立的调度问题讨论。
