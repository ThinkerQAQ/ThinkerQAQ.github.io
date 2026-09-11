---
title: "并发编程（八）：从 Mutex 到读写锁"
description: "沿用 counter 与 counter + ready 的例子，理解读写锁如何允许多个读者并发，以及 Java Lock API、Go sync.RWMutex 和 CPython 的对应情况。"
publishedAt: "2026-09-11T15:30:00+08:00"
language: zh
tags:
  - 并发编程
  - 读写锁
  - RWMutex
  - Java
  - Go
  - Python
status: published
featured: false
series: concurrency-programming
---

## 目录

- [0. 回到 Mutex](#0-回到-mutex)
- [1. 一把读写锁保证什么？](#1-一把读写锁保证什么)
  - [1.1 Atomicity：写入不能与其他读写交错](#11-atomicity写入不能与其他读写交错)
  - [1.2 Visibility：读者需要看到前一个写者的更新](#12-visibility读者需要看到前一个写者的更新)
  - [1.3 Ordering：写锁和读锁之间仍然有顺序边界](#13-ordering写锁和读锁之间仍然有顺序边界)
- [2. Java、Go 和 CPython 中的读写锁](#2-javago-和-cpython-中的读写锁)
  - [2.1 Java：ReentrantReadWriteLock](#21-javareentrantreadwritelock)
  - [2.2 Go：sync.RWMutex](#22-gosyncrwmutex)
  - [2.3 CPython：标准库没有对应的 RWLock](#23-cpython标准库没有对应的-rwlock)
  - [2.4 三种语言放在一起看](#24-三种语言放在一起看)
- [3. 什么时候使用读写锁？](#3-什么时候使用读写锁)
- [4. 下一篇：AQS 与读写锁的实现](#4-下一篇aqs-与读写锁的实现)

---

## 0. 回到 Mutex

还是用前面的 `counter`。

由于它会被多个线程读写，因此我们用同一把 Mutex 保护 `counter`，这种方式当然没问题。

但是，如果 Thread A 和 Thread B 都要读取 `counter`，B仍然得等待A释放锁，

```text
Thread A                         Thread B

lock
  │
  ▼
read counter
  │
  ▼
unlock ────────────────────────► lock
                                   │
                                   ▼
                               read counter
                                   │
                                   ▼
                                 unlock
```


读取不会修改 `counter`，所以只要没有写者，A 和 B 本来可以同时执行。读写锁正是放开了这一部分并发：读者使用读锁，可以同时进入；写者使用写锁，仍然需要独占。

```text
Thread A                         Thread B

readLock                        readLock
    │                               │
    ▼                               ▼
read counter                    read counter
    │                               │
    ▼                               ▼
readUnlock                      readUnlock
```

因此，读写锁没有改变读写和写写之间的互斥，只是不再让两个读者互相等待：

| 两个线程的操作 | Mutex | 读写锁 |
|---|---|---|
| 读–读 | 不能并发 | 可以并发 |
| 读–写 | 不能并发 | 不能并发 |
| 写–写 | 不能并发 | 不能并发 |

---

## 1. 一把读写锁保证什么？

读写锁有两个入口：

```text
读锁：保护只读操作，允许多个读者同时进入
写锁：保护修改操作，同一时刻只允许一个写者进入
```

### 1.1 Atomicity：写入不能与其他读写交错

如果线程 A 正在修改 `counter`，线程 B 无论想读还是想写，都需要等待 A 释放写锁：

```text
Thread A（写）                    Thread B（读）

writeLock                       等待
    │                               │
    ▼                               │
counter++                           │
    │                               │
    ▼                               ▼
writeUnlock ───────────────────► readLock
                                    │
                                    ▼
                                read counter
```

因此，写锁保护的 `counter++` 不会与其他读写交错。读锁只应该用于读取，不能在其中修改共享状态。

### 1.2 Visibility：读者需要看到前一个写者的更新

读写锁不只决定谁可以进入，还要让后续读者看到前一个写者的结果：

```text
Thread A（写）                    Thread B（读）

writeLock
    │
    ▼
counter = 1
    │
    ▼
writeUnlock ───── 同步关系 ───────► readLock
                                        │
                                        ▼
                                    read counter = 1
```

如果 B 在 A 释放写锁后获得读锁，B 就需要看到 A 在写锁内完成的 `counter = 1`。

### 1.3 Ordering：写锁和读锁之间仍然有顺序边界

再放回 `counter + ready` 的例子：

```text
Thread A（写）                    Thread B（读）

writeLock
    │
    ▼
counter = 1
    │
    ▼
ready = true
    │
    ▼
writeUnlock ───── 同步关系 ───────► readLock
                                        │
                                        ▼
                                    read ready = true
                                        │
                                        ▼
                                    read counter = 1
```

这条顺序把 A 的两次写入、写锁的释放、B 获得读锁以及 B 的两次读取连在一起。因此，B 不能在读到 `ready = true` 时，仍然把 `counter` 读成 `0`。

---

## 2. Java、Go 和 CPython 中的读写锁

下面不再重复前面的结论，而是看 Java 和 Go 的官方规则如何推出 Atomicity、Visibility 和 Ordering。

### 2.1 Java：ReentrantReadWriteLock

先看 Java [`ReadWriteLock`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/ReadWriteLock.html) 对 Atomicity 的规则：

> **“The write lock is exclusive.”**

写锁被某个线程持有时，其他读者和写者都不能进入。没有写者时，多个线程可以同时持有读锁。

再看 Visibility 和 Ordering：

> **“A thread successfully acquiring the read lock will see all updates made upon previous release of the write lock.”**

这条规则直接说明：A 释放写锁以后，后续获得读锁的 B 能看到 A 完成的更新。因此，它同时对应 Visibility 和 Ordering。

使用时，读取和写入必须分别获得对应的锁：

```java
int counter = 0;

ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();
Lock readLock = rwLock.readLock();
Lock writeLock = rwLock.writeLock();

int readCounter() {
    readLock.lock();
    try {
        return counter;
    } finally {
        readLock.unlock();
    }
}

void incrementCounter() {
    writeLock.lock();
    try {
        counter++;
    } finally {
        writeLock.unlock();
    }
}

// Thread A
int a = readCounter();

// Thread B
int b = readCounter();
```

Thread A 和 Thread B 都只获得读锁，所以两次 `readCounter()` 可以同时执行。`incrementCounter()` 获得写锁时，其他读者和写者都需要等待。

### 2.2 Go：sync.RWMutex

Go 的 [`sync.RWMutex`](https://pkg.go.dev/sync#RWMutex) 直接提供 `RLock/RUnlock` 和 `Lock/Unlock`。官方文档对 Atomicity 边界的定义是：

> **“The lock can be held by an arbitrary number of readers or a single writer.”**

所以，多个 Reader 可以同时持有读锁，Writer 则必须独占这把锁。

再看 Visibility 和 Ordering 对应的原文：

> **“the n'th call to Unlock ‘synchronizes before’ that call to RLock”**

这条规则对应前面的 `counter` 示例：A 在 `Unlock` 前完成写入，B 随后成功执行 `RLock`，因此 B 能看到 A 的写入。这解决了 Visibility，同时也用 `Unlock → RLock` 建立了 Ordering。官方文档还规定了 `RUnlock → Lock` 的 synchronized-before 关系，使后续写者也排在已有读者之后。

```go
var counter int
var rw sync.RWMutex

func readCounter() int {
	rw.RLock()
	defer rw.RUnlock()
	return counter
}

func incrementCounter() {
	rw.Lock()
	defer rw.Unlock()
	counter++
}

// Goroutine A
a := readCounter()

// Goroutine B
b := readCounter()
```

Goroutine A 和 Goroutine B 可以同时读取 `counter`。只要有一个 Goroutine 获得写锁，其他读者和写者就需要等待。

### 2.3 CPython：标准库没有对应的 RWLock

Python 的 [`threading`](https://docs.python.org/3/library/threading.html) 标准库提供 `Lock` 和 `RLock`，但没有公开的 `ReadWriteLock` 或 `RWLock` 类型。

这里的 `RLock` 是 Reentrant Lock，表示同一个线程可以重复获得同一把锁；它不是 Read Lock，也不会让多个读者同时进入。

因此，这里不为 CPython 强行补一个读写锁示例。如果项目确实需要读写锁，需要明确选择第三方实现或自行封装，不能把 `RLock` 当作替代品。

### 2.4 三种语言放在一起看

| | Java | Go | CPython |
|---|---|---|---|
| 读写锁 API | `ReentrantReadWriteLock` | `sync.RWMutex` | 标准库没有对应类型 |
| 读锁 | `readLock().lock()` | `RLock()` | - |
| 写锁 | `writeLock().lock()` | `Lock()` | - |
| 读–读并发 | 可以 | 可以 | - |
| 写入 | 独占 | 独占 | - |
| 规则来源 | `ReadWriteLock` API 的内存同步规则 | Go Memory Model | 没有对应 API 规则 |

---

## 3. 什么时候使用读写锁？

读写锁适合下面的场景：

- 读操作明显多于写操作；
- 同一时间确实有多个线程竞争这份数据；
- 读临界区足够长，并发读带来的收益能覆盖读写锁本身的开销。

它不一定比 Mutex 快。如果读操作很短、写入频繁，或者几乎没有竞争，直接使用 Mutex 通常更简单。是否需要读写锁，最后应该通过压测和 Profiling 判断。

还要注意锁的升级与降级：

- Java `ReentrantReadWriteLock` 不支持从读锁升级为写锁，但支持从写锁降级为读锁；
- Go `sync.RWMutex` 既不支持升级，也不支持降级。

不要在持有读锁时直接等待写锁，否则很容易把自己卡住。

---

## 4. 下一篇：AQS 与读写锁的实现

这一篇先说明读写锁保证什么，以及 Java 和 Go 分别提供了什么 API。它们的实现路径并不相同。

下一篇先从 Java `ReentrantLock` 开始建立 AQS：`ReentrantLock` 使用 AQS 的独占模式，`ReentrantReadWriteLock` 同时使用共享模式和独占模式。竞争失败后，AQS 负责把线程加入等待队列并进行阻塞和唤醒。

Go 没有 AQS。`sync.RWMutex` 直接组合原子计数、Mutex 和 Runtime Semaphore，记录读者、等待中的写者，并在发生竞争时挂起或唤醒 Goroutine。

最后再把两条路径向下连接到 CAS、原子加减、等待与唤醒，看看读写锁如何从语言 API 一直落到 Runtime 和 CPU。
