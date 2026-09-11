---
title: "并发编程（七）：volatile——ready 与 counter 的可见性和有序性"
description: "沿用 counter + ready 的例子，理解 Java volatile 提供的可见性和有序性保证，并说明 Go 和 Python 没有对应的 volatile 关键字。"
publishedAt: "2026-09-08T23:41:00+08:00"
language: zh
tags:
  - 并发编程
  - volatile
  - Java
  - Go
  - Python
  - Memory Model
status: published
featured: false
series: concurrency-programming
---

## 目录

- [0. 从 Atomic 到 volatile](#0-从-atomic-到-volatile)
- [1. 这一次要保证什么？](#1-这一次要保证什么)
- [2. Java：volatile](#2-javavolatile)
  - [2.1 happens-before 是怎么建立的？](#21-happens-before-是怎么建立的)
  - [2.2 volatile 不保证原子性](#22-volatile-不保证原子性)
  - [2.3 synchronized、Atomic 与 volatile](#23-synchronizedatomic-与-volatile)
- [3. Go：没有 volatile 关键字](#3-go没有-volatile-关键字)
- [4. CPython：没有 volatile 关键字](#4-cpython没有-volatile-关键字)
- [5. 三种语言的情况](#5-三种语言的情况)
- [6. 什么时候可以使用这种方式？](#6-什么时候可以使用这种方式)
- [7. 下一篇：从 Mutex 到读写锁](#7-下一篇从-mutex-到读写锁)

---

## 0. 从 Atomic 到 volatile

前两篇围绕 `counter++` 展开：Atomic 让 Read-Modify-Write 不能被其他线程交错，Runtime 再把它落到 CPU 的原子指令和内存顺序上。

但并不是每个场景都需要原子更新。这一篇回到 `counter + ready` 的例子：

```text
counter = 0
ready = false
```

Thread A：

```text
counter = 1
ready = true
```

Thread B：

```text
if ready {
    print(counter)
}
```

这里没有多个线程共同更新 `counter`。我们只希望：

> 如果 Thread B 已经读到 `ready = true`，那么它随后读到的 `counter` 必须是 `1`，不能是旧值 `0`。


---

## 1. 这一次要保证什么？

先把两条线程中的顺序写出来：

```text
Thread A                         Thread B

counter = 1                     read ready
     │                               │
     ▼                               ▼
ready = true                    read counter
```

程序需要建立下面这条关系：

```text
A 写 counter
      ↓
A 写 ready
      ↓  同步关系
B 读 ready
      ↓
B 读 counter
```

如果中间没有同步关系，Thread B 读到 `ready = true`，并不能仅凭源代码顺序推导出它也能读到 `counter = 1`。

所以这一次主要解决两个问题：

| 问题 | 需要的保证 |
|---|---|
| B 能否看到 A 写入的 `counter = 1`？ | Visibility |
| `counter = 1` 能否在观察效果上跑到 `ready = true` 后面？ | Ordering |

这个场景不需要解决 `counter++` 这类原子更新问题，所以暂时不关心 Atomicity，只看 Visibility 和 Ordering。

---

## 2. Java：volatile

Java 可以把 `ready` 声明为 `volatile`：

```java
int counter = 0;
volatile boolean ready = false;

// Thread A
counter = 1;
ready = true;

// Thread B
if (ready) {
    System.out.println(counter);
}
```

注意，只有 `ready` 是 `volatile`，`counter` 仍然是普通变量。

这已经足够，因为线程 B 是通过 `ready` 判断线程 A 是否已经写完 `counter` 的。

### 2.1 happens-before 是怎么建立的？

[JLS 17.4.4](https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.4.4) 规定：对一个 `volatile` 变量的写，与其他线程随后对同一个变量的读之间建立 `synchronizes-with`。

放回这个例子：

```text
Thread A                         Thread B

counter = 1
    │
    │ program order
    ▼
volatile ready = true
    │
    └── synchronizes-with ─────────► read volatile ready == true
                                          │
                                          │ program order
                                          ▼
                                      read counter
```

再根据 happens-before 的传递性：

```text
A 写 counter
    happens-before
B 读 counter
```

因此，只要 B 读到的是 A 写入的 `ready = true`，B 随后读取 `counter` 时就必须看到 `1`。

这才是 `volatile` 在这里的作用。不是“每次都强制从主内存读取”，而是 JMM 对程序可观察结果作出了限制。

### 2.2 volatile 不保证原子性

我们举个例子，


```java
volatile int counter = 0;

counter++;
```

即使 `counter` 声明为 `volatile`，`counter++` 仍然包含：

```text
LOAD
ADD
STORE
```

`volatile` 不能把三步合成一个不可分割的 RMW。多个线程共同执行 `counter++` 时，仍然应该使用 `AtomicInteger` 或 Mutex。

### 2.3 synchronized、Atomic 与 volatile

Atomic 不是 Java 关键字，这里以 `AtomicInteger` 的常用方法为例：

| | `synchronized` | `AtomicInteger` | `volatile` |
|---|---|---|---|
| Atomicity | 临界区整体不能交错 | `incrementAndGet()` 等单变量 RMW 不能交错 | 不保证 |
| Visibility | 解锁前的写入对随后加锁的线程可见 | 常用的 `get()`、`set()` 和 RMW 方法提供可见性 | 对 `volatile` 变量的写入对随后的读取可见 |
| Ordering | 解锁与随后的加锁之间建立顺序 | 常用方法按各自定义建立内存顺序 | `volatile` 写与随后的读之间建立顺序 |



---

## 3. Go：没有 volatile 关键字

Go 没有与 Java `volatile` 对应的关键字。`sync/atomic` 提供的是 Atomic API，不是 Go 版的 `volatile`。

---

## 4. CPython：没有 volatile 关键字

Python 也没有与 Java `volatile` 对应的关键字。`threading.Event` 是线程通信 API，不是 `volatile`；GIL 也不能当作 `volatile` 使用。


---

## 5. 三种语言的情况

| | Java | Go | CPython |
|---|---|---|---|
| `volatile` 关键字 | 有 | 没有 | 没有 |

---

## 6. 什么时候可以使用这种方式？

适合的情况是：

```text
先写入一组状态
      ↓
最后发布一个标记
      ↓
另一个执行单元观察标记后读取状态
```

例如：

- 初始化完成标记；
- 配置已经加载；
- 后台任务请求停止；
- 一个不可变对象已经安全发布。

不适合的情况是：

- 多个线程同时执行 `counter++`；
- 多个字段必须作为一个整体更新；
- 先检查状态、再根据结果修改状态；
- 竞争失败后需要排队或阻塞等待一段临界区。

这些问题需要 Atomic RMW、CAS 或 Mutex，而不是只给一个字段加 `volatile`。

---

## 7. 下一篇：从 Mutex 到读写锁

Mutex 同一时刻只允许一个线程进入临界区。即使多个线程都只读取数据，它们之间也会互相等待。

下一篇继续讨论共享内存：读写锁如何让多个读者同时执行，以及 Java `ReentrantReadWriteLock`、Go `sync.RWMutex` 和 CPython 的对应情况。
