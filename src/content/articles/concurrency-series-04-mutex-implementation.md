---
title: "并发编程（四）：互斥锁的实现——从 Runtime 到 CPU"
description: "沿着 Java synchronized、Go sync.Mutex 和 CPython threading.Lock 的真实实现路径，理解互斥锁如何使用原子操作、内存顺序以及等待与唤醒。"
publishedAt: "2026-09-08T23:11:56+08:00"
language: zh
tags:
  - 并发编程
  - Mutex
  - JVM
  - Go Runtime
  - CPython
status: published
featured: false
series: concurrency-programming
---

## 目录

- [0. 这一篇继续回答什么？](#0-这一篇继续回答什么)
- [1. 一把锁需要哪些底层能力？](#1-一把锁需要哪些底层能力)
  - [1.1 获取锁：原子地修改锁状态](#11-获取锁原子地修改锁状态)
  - [1.2 竞争失败：Spin、Park 与 Wakeup](#12-竞争失败spinpark-与-wakeup)
  - [1.3 释放和获取：建立内存顺序边界](#13-释放和获取建立内存顺序边界)
- [2. HotSpot 如何实现 synchronized？](#2-hotspot-如何实现-synchronized)
  - [2.1 从 Java 源码到 Monitor](#21-从-java-源码到-monitor)
  - [2.2 无竞争时：Lightweight Locking](#22-无竞争时lightweight-locking)
  - [2.3 竞争时：ObjectMonitor](#23-竞争时objectmonitor)
  - [2.4 x86-64 上的原子操作和内存顺序](#24-x86-64-上的原子操作和内存顺序)
  - [2.5 从 Runtime 到 CPU：Java 实现总结](#25-从-runtime-到-cpujava-实现总结)
- [3. Go Runtime 如何实现 sync.Mutex？](#3-go-runtime-如何实现-syncmutex)
  - [3.1 Fast Path：直接修改 state](#31-fast-path直接修改-state)
  - [3.2 Slow Path：等待的是 Goroutine](#32-slow-path等待的是-goroutine)
  - [3.3 amd64 上的指令](#33-amd64-上的指令)
  - [3.4 从 Runtime 到 CPU：Go 实现总结](#34-从-runtime-到-cpugo-实现总结)
- [4. CPython 如何实现 threading.Lock？](#4-cpython-如何实现-threadinglock)
  - [4.1 从 threading.Lock 到 PyMutex](#41-从-threadinglock-到-pymutex)
  - [4.2 Fast Path：修改 _bits](#42-fast-path修改-_bits)
  - [4.3 竞争时：Parking Lot](#43-竞争时parking-lot)
  - [4.4 Linux x86-64 上的实现](#44-linux-x86-64-上的实现)
  - [4.5 从 Runtime 到 CPU：CPython 实现总结](#45-从-runtime-到-cpucpython-实现总结)
- [5. 三种实现放在一起看](#5-三种实现放在一起看)
- [6. 下一篇：Atomic](#6-下一篇atomic)

---

## 0. 这一篇继续回答什么？

上一篇讲了一把互斥锁向程序员保证什么。这一篇继续往下走：这些保证是怎么被 Runtime 和 CPU 做到的？

我们会沿着这条路径来看：

```text
语言规则：JMM / Go Memory Model / CPython 文档
        ↓
编译器和 Runtime：Monitor / Mutex / Lock
        ↓
CPU：Atomic RMW / Memory Ordering
```

语言规则告诉我们程序可以依赖什么结果，底层实现负责把这个结果做出来。同一条规则在不同 Runtime 和 CPU 上，不一定使用同一组指令。

---

# 1. 一把锁需要哪些底层能力？

先不区分语言，继续看两个执行单元竞争同一把锁：

```text
Thread A                    Thread B

lock                        lock
counter++                   counter++
unlock                      unlock
```

要让这段代码正确工作，实现至少需要解决三个问题。

## 1.1 获取锁：原子地修改锁状态

假设一把锁内部只有一个状态：

```text
0 = unlocked
1 = locked
```

A 和 B 不能先分别读取 `0`，再同时写入 `1`。否则两边都会认为自己获得了锁。

因此“检查锁状态并把它改成 locked”必须是一个原子操作，例如 Compare-And-Swap：

```text
Compare-And-Swap(lock_state, 0, 1)
```

两个执行单元同时竞争：

```text
CPU A                         CPU B

CAS 0 -> 1                   CAS 0 -> 1
    │                             │
    ▼                             ▼
  success                       failed
```

只有一个竞争者能够成功修改锁状态。Mutex 再用这个很小的硬件原子操作，保护 `counter++` 这样的任意临界区。

## 1.2 竞争失败：Spin、Park 与 Wakeup

CAS 失败以后，执行单元不能无休止地竞争锁状态。

常见路径是：

```text
尝试原子获取锁
        │
        ├── 成功 ──> 进入临界区
        │
        └── 失败
              │
              ├── 短暂 Spin
              │      │
              │      └── 再次尝试
              │
              └── Park / 等待
                         │
                         └── 锁释放后被唤醒
```

Spin 适合等待时间很短的情况，可以避免立即进入操作系统阻塞路径；竞争持续时则需要 Park，避免一直占用 CPU。

Java 线程、Goroutine 和 Python 线程在这里已经不同：Java 和 CPython 最终等待的是平台线程，Go 可以只 Park 当前 Goroutine，让对应的 OS Thread 继续运行其他 Goroutine。

## 1.3 释放和获取：建立内存顺序边界

获取锁时只做到“同一时刻只有一个执行单元进入”还不够。继续使用：

```text
Thread A                    Thread B

lock
counter++       // 1
ready = true
unlock

                            lock
                            if ready {
                                print(counter)
                            }
```

第三篇已经给出了语言层的结果：A 释放锁之前完成的写入，B 随后获得同一把锁时应该能够看到。底层实现要把下面这条顺序接起来：

```text
A 的临界区写入
        ↓
A 释放锁
        ↓
B 获得同一把锁
        ↓
B 的临界区读取
```

要做到这一点，编译器不能随意把临界区中的读写移到锁外，CPU 也要提供相应的原子操作和内存顺序。Cache Coherence 则负责协调不同 Core 上的 Cache Line 状态。

不过，不要把原子性、可见性和有序性理解成三条独立的 CPU 指令。同一个带顺序约束的原子 RMW，既可以用来竞争锁状态，也可以成为这条同步链的一部分。

---

# 2. HotSpot 如何实现 synchronized？

先看 Java。JMM 规定：对一个 Monitor 的解锁 happens-before 后续对同一个 Monitor 的加锁。换成前面的例子，就是 A 退出 `synchronized` 之前的写入，B 进入同一个 `synchronized` 之后能够看到。

接下来要看的，就是 HotSpot 如何把这条规则做出来：

```java
synchronized (lock) {
    counter++;
}
```

## 2.1 从 Java 源码到 Monitor

对于同步代码块，Java 编译器使用：

```text
monitorenter
monitorexit
```

[JVMS §6.5 monitorenter](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-6.html#jvms-6.5.monitorenter) 说明，`monitorenter` 可以和 `monitorexit` 一起实现 Java 的 `synchronized` 语句。

调用关系是：

```text
Java Source
synchronized (lock) { counter++; }
        ↓
JVM Bytecode
monitorenter / monitorexit
        ↓
HotSpot 解释器或 JIT
        ↓
对象关联的 Monitor
```

`monitorenter` 和 `monitorexit` 在字节码中标出了获取和释放 Monitor 的位置。JMM 已经规定了这两个位置前后可以观察到的结果，HotSpot 生成的代码必须守住这条规则。

不过，它们仍然是 JVM 字节码，不是 CPU 指令。真正如何加锁、如何限制重排，还要看 HotSpot 选择的执行路径。

## 2.2 无竞争时：Lightweight Locking

HotSpot 不会让每一次 `synchronized` 都直接进入重量级等待路径。

在无竞争情况下，可以通过 Lightweight Locking 在当前线程的 Lock Stack 中记录锁对象，并原子地修改对象头中的锁状态：

```text
对象未锁定
    │
    │ monitorenter
    ▼
原子修改对象头
    │
    ▼
当前线程的 Lock Stack 记录 lock
    │
    ▼
进入临界区
```

如果没有竞争，`monitorexit` 可以沿着对应的 Fast Path 释放锁。

这条 Fast Path 先解决原子性：只有成功修改锁状态的线程才能进入临界区。但 JMM 要求的可见性和有序性，不能只靠“谁抢到锁”来解释，获取和释放还必须带上正确的内存顺序。

## 2.3 竞争时：ObjectMonitor

竞争持续，或者代码需要 `wait()` 等完整 Monitor 能力时，锁可以进入 `ObjectMonitor` 路径。

这里关注两个信息：

```text
_owner       当前持有者
等待队列     没有获得锁的线程
```

获取锁时，[HotSpot `ObjectMonitor::try_lock()`](https://github.com/openjdk/jdk/blob/master/src/hotspot/share/runtime/objectMonitor.inline.hpp) 会原子地尝试把 `_owner` 从 `NO_OWNER` 改为当前 owner：

```cpp
AtomicAccess::cmpxchg(&_owner, NO_OWNER, owner_id)
```

竞争失败的线程可以先短暂 Spin；仍然失败则进入 Monitor 的等待路径并 Park。持有者退出后释放 `_owner`，再选择等待者继续竞争。

CAS 负责选出唯一的 owner，等待队列负责收纳暂时没抢到锁的线程。Spin、Park 和 Wakeup 处理的是“这些线程怎么等”，它们不能代替获取和释放时的内存顺序约束。

放回 `counter++`：

```text
Thread A                         Thread B

原子修改 _owner -> 成功          原子修改 _owner -> 失败
LOAD counter                     Spin / Park
ADD  1
STORE counter
释放 _owner                      被唤醒后重新竞争
```

## 2.4 x86-64 上的原子操作和内存顺序

先看 JIT 如何阻止编译期重排。HotSpot 的 C2 编译器会在锁的两边放入两个内存屏障节点：

```text
LockNode
        ↓
MemBarAcquireLock
        ↓
临界区读写
        ↓
MemBarReleaseLock
        ↓
UnlockNode
```

`MemBarAcquireLock` 拦住加锁后的读写，不让 C2 把它们移到加锁前；`MemBarReleaseLock` 拦住解锁前的读写，不让 C2 把它们移到解锁后。

到了 x86-64，这两个屏障节点通常不需要生成单独的 Fence 指令。获取侧的顺序约束已经由前面的 `lock cmpxchg` 提供；释放侧需要的 Store 顺序则由 x86 的 TSO 保证。所以屏障节点在 JIT 中确实存在，只是它们在 x86-64 上可以复用已有的指令和硬件顺序，不必再生成额外指令。

以 x86-64 为例，竞争 `_owner` 的操作可以简化理解为：

```asm
mov  rax, 0
mov  rbx, owner_id
lock cmpxchg qword ptr [monitor._owner], rbx
jne  contended
```

`lock cmpxchg` 原子地完成“读取、比较、必要时写入”。两个 Core 同时竞争时，只有一个能够成功修改 `_owner`，这是临界区原子性的底层基础。

释放 `ObjectMonitor` 时，当前 HotSpot 源码使用带 release 语义的 Store：

```cpp
AtomicAccess::release_store(&_owner, NO_OWNER)
```

在 x86-64 上，可以简化成：

```asm
; Thread A
mov  eax, dword ptr [counter]
add  eax, 1
mov  dword ptr [counter], eax
mov  qword ptr [monitor._owner], 0
```

x86-64 的内存顺序允许这里使用普通 Store 实现 release。它要保证 A 先完成 `counter` 的写入，再把 Monitor 变成可获取状态。HotSpot 同时还要约束 JIT，不让它把 `counter` 的写入移动到释放 Monitor 之后。

B 随后使用原子 RMW 重新竞争同一个 Monitor：

```asm
; Thread B
mov  rax, 0
mov  rbx, owner_id
lock cmpxchg qword ptr [monitor._owner], rbx
jne  contended
mov  ecx, dword ptr [counter]
```

把两边连起来就是：A 先写入 `counter`，再用 release Store 释放 Monitor；B 随后通过带顺序约束的原子 RMW 获得同一个 Monitor，然后读取 `counter`。

只有一个 owner，是原子性；A 的写入能被 B 看到，是可见性；JIT 和 CPU 不能把两边的读写移过获取和释放位置，是有序性。这些实现加在一起，才做出了 JMM 规定的 `unlock → lock` happens-before。

## 2.5 **从 Runtime 到 CPU：Java 实现总结**

```text
Java synchronized
        ↓ javac
monitorenter / monitorexit
        ↓ HotSpot C2
MemBarAcquireLock / MemBarReleaseLock
        ↓ Fast Path / Runtime
Lightweight Locking / ObjectMonitor / AtomicAccess
        ↓ x86-64
cmpxchg(_owner) / release_store(_owner)
        ↓ 机器指令
lock cmpxchg / mov
```

> **C2 用 `MemBarReleaseLock` 和 `MemBarAcquireLock` 阻止编译器把临界区读写移过锁边界。到 x86-64 上，获取 Monitor 的 `lock cmpxchg` 同时完成原子竞争并提供所需的顺序约束；释放 Monitor 的 `release_store` 可以生成普通 `mov`，因为 x86 TSO 保证临界区中先前的写入不会排到这次解锁 Store 之后。B 只有在看到 Monitor 已释放并成功执行 `lock cmpxchg` 后才能进入临界区，因此能看到 A 解锁前的写入。这就是 HotSpot 和 x86-64 共同实现 JMM `unlock → lock` happens-before 的具体过程。**

对应实现可以继续查看 OpenJDK 的 [`graphKit.cpp`](https://github.com/openjdk/jdk/blob/master/src/hotspot/share/opto/graphKit.cpp)、[`x86.ad`](https://github.com/openjdk/jdk/blob/master/src/hotspot/cpu/x86/x86.ad)、[`markWord.hpp`](https://github.com/openjdk/jdk/blob/master/src/hotspot/share/oops/markWord.hpp)、[`objectMonitor.inline.hpp`](https://github.com/openjdk/jdk/blob/master/src/hotspot/share/runtime/objectMonitor.inline.hpp)、[`objectMonitor.cpp`](https://github.com/openjdk/jdk/blob/master/src/hotspot/share/runtime/objectMonitor.cpp) 和 [`orderAccess_linux_x86.hpp`](https://github.com/openjdk/jdk/blob/master/src/hotspot/os_cpu/linux_x86/orderAccess_linux_x86.hpp)。

---

# 3. Go Runtime 如何实现 sync.Mutex？

Go 源码中的：

```go
var mu sync.Mutex

mu.Lock()
counter++
mu.Unlock()
```

会从公开的 `sync.Mutex` 进入 `internal/sync.Mutex`。核心状态可以简化成：

```text
state    锁状态和等待信息
sema     Runtime 等待与唤醒使用的信号量
```

## 3.1 Fast Path：直接修改 state

当前 `Lock()` 的 Fast Path 是：

```go
if atomic.CompareAndSwapInt32(&m.state, 0, mutexLocked) {
    return
}
```

`Unlock()` 的 Fast Path 是：

```go
new := atomic.AddInt32(&m.state, -mutexLocked)
```

没有竞争时，获取和释放主要围绕 `state` 完成，不需要进入等待路径。

## 3.2 Slow Path：等待的是 Goroutine

CAS 失败以后，Go 会进入 Slow Path：

```text
CAS state 失败
        ↓
根据状态决定是否短暂 Spin
        ↓
runtime_SemacquireMutex
        ↓
Park 当前 Goroutine
```

释放锁时，如果存在等待者，则通过：

```text
runtime_Semrelease
```

唤醒等待的 Goroutine。

这里 Park 的是 Goroutine。Go Runtime 可以让对应的 OS Thread 继续运行其他 Goroutine，这和 Java、CPython 直接管理平台线程的锁等待不同。

## 3.3 amd64 上的指令

`sync/atomic` 再向下连接到 `internal/runtime/atomic`。在 amd64 上，获取和释放所使用的核心原子指令分别可以看到：

```asm
LOCK CMPXCHGL
LOCK XADDL
```

完整路径是：

```text
sync.Mutex
        ↓
internal/sync.Mutex.state
        ↓
CompareAndSwapInt32 / AddInt32
        ↓
internal/runtime/atomic
        ↓
LOCK CMPXCHG / LOCK XADD
```

`LOCK CMPXCHG` 决定谁能把 `state` 从 unlocked 改成 locked；`LOCK XADD` 原子地更新释放路径中的状态。它们不仅修改锁状态，同时还提供很强的内存顺序约束。

Go Memory Model 规定，一次 `Unlock` 要 synchronized before 后面对同一把 Mutex 的 `Lock` 返回。对应到这里：原子修改 `state` 保证互斥；获取和释放中的顺序约束，让前一个 Goroutine 的写入能被后一个 Goroutine 看到，也不会让临界区中的读写跑到错误的一边。

当前 amd64 实现选择了上面这些指令来做到这一点。其他架构可以使用不同指令，但不能改变程序员可以观察到的结果。

## 3.4 **从 Runtime 到 CPU：Go 实现总结**

```text
sync.Mutex
        ↓ Go Runtime
internal/sync.Mutex
        ├── Fast Path：CAS / Add 修改 state
        └── Slow Path：Spin / sema / Park Goroutine
        ↓ internal/runtime/atomic
LOCK CMPXCHG / LOCK XADD
```

> **Go Runtime 先用 CAS 尝试把 `state` 从 unlocked 改成 locked，成功就直接进入临界区；失败则进入 Slow Path，先视情况 Spin，再通过 `sema` Park 当前 Goroutine。解锁时，Runtime 原子地更新 `state`，必要时唤醒等待者。到 amd64 上，这些原子操作分别落到 `LOCK CMPXCHG` 和 `LOCK XADD`：它们既保证只有一个 Goroutine 获得锁，也提供所需的内存顺序，从而实现 Go Memory Model 规定的 `Unlock → Lock` synchronized-before。**

当前实现可以参考：

- [`sync/mutex.go`](https://go.dev/src/sync/mutex.go)
- [`internal/sync/mutex.go`](https://go.dev/src/internal/sync/mutex.go)
- [`runtime/sema.go`](https://go.dev/src/runtime/sema.go)
- [`internal/runtime/atomic/atomic_amd64.s`](https://go.dev/src/internal/runtime/atomic/atomic_amd64.s)

---

# 4. CPython 如何实现 threading.Lock？

这一节只讨论当前 CPython，不把实现结论扩大成所有 Python 解释器的语言规则。

## 4.1 从 threading.Lock 到 PyMutex

Python 文档说明 Primitive Lock 由 `_thread` 扩展模块直接实现。继续向下，当前 CPython 的路径可以表示为：

```text
threading.Lock
        ↓
_thread
        ↓
PyThread lock API
        ↓
PyMutex
        ↓
CPython Runtime
```

例如：

```text
PyThread_acquire_lock()
        ↓
_PyMutex_LockTimed()

PyThread_release_lock()
        ↓
PyMutex_Unlock()
```

## 4.2 Fast Path：修改 _bits

`PyMutex` 使用 `_bits` 保存锁定状态以及是否存在等待者等信息。

当前 `_PyMutex_LockTimed()` 的 Fast Path 会先读取 `_bits`，再尝试：

```c
_Py_atomic_compare_exchange_uint8(
    &m->_bits,
    &v,
    v | _Py_LOCKED
)
```

这一步原子地设置 `_Py_LOCKED`。多个线程同时竞争时，只有一个线程能够成功修改 `_bits`。

## 4.3 竞争时：Parking Lot

Fast Path 失败后，路径与构建模式有关。

当前源码中：

```c
#if Py_GIL_DISABLED
static const int MAX_SPIN_COUNT = 40;
#else
static const int MAX_SPIN_COUNT = 0;
#endif
```

Free-threaded build 会先进行有限次数的 Spin；仍然失败后，再通过：

```text
_PyParkingLot_Park
```

进入等待。GIL-enabled build 的这条路径不进行前面的 Spin。

等待者最终通过 CPython 的 Semaphore 抽象睡眠。在支持 POSIX Semaphore 的 Linux 构建中，可以落到：

```text
sem_wait / sem_timedwait
```

唤醒则使用：

```text
sem_post
```

其他平台或构建配置可以使用不同的回退实现。

## 4.4 Linux x86-64 上的实现

在 GCC / Clang 下，当前 `_Py_atomic_compare_exchange_uint8()` 使用：

```c
__atomic_compare_exchange_n(
    obj,
    expected,
    desired,
    0,
    __ATOMIC_SEQ_CST,
    __ATOMIC_SEQ_CST
)
```

在 x86-64 上，8-bit Compare-And-Swap 可以生成：

```asm
lock cmpxchg byte ptr [m._bits], dl
jne  contended
```

`__ATOMIC_SEQ_CST` 同时限制编译器和目标机器对相关原子操作的排序。存在等待者时，解锁还需要更新 Mutex 状态并从 Parking Lot 中唤醒线程。

## 4.5 **从 Runtime 到 CPU：CPython 实现总结**

```text
threading.Lock
        ↓ _thread / PyThread lock API
PyMutex
        ├── Fast Path：CAS 修改 _bits
        └── Slow Path：Spin / Parking Lot / Semaphore
        ↓ GCC / Clang __atomic builtins
__ATOMIC_SEQ_CST
        ↓ x86-64
lock cmpxchg
```

> **CPython 先在 `PyMutex` 的 `_bits` 中记录锁状态。Fast Path 使用 CAS 设置 `_Py_LOCKED`，只让一个线程成功；竞争失败后，Free-threaded build 可以先 Spin，再通过 Parking Lot 和 Semaphore 让平台线程等待。在 GCC / Clang 下，修改 `_bits` 的 CAS 使用 `__ATOMIC_SEQ_CST`，到 x86-64 上可以生成 `lock cmpxchg`。这条路径同时做出了互斥、等待唤醒和内存顺序，但它是当前 CPython 的实现，不能反过来当成一条通用的 Python happens-before 规则。**

当前实现可以参考：

- [`Python/thread.c`](https://github.com/python/cpython/blob/main/Python/thread.c)
- [`Python/lock.c`](https://github.com/python/cpython/blob/main/Python/lock.c)
- [`Python/parking_lot.c`](https://github.com/python/cpython/blob/main/Python/parking_lot.c)
- [`Include/cpython/pyatomic_gcc.h`](https://github.com/python/cpython/blob/main/Include/cpython/pyatomic_gcc.h)

---

# 5. 三种实现放在一起看

先看 Runtime 如何组织一把锁：

| | HotSpot | Go Runtime | CPython |
|---|---|---|---|
| 锁状态 | 对象头；需要时进入 `ObjectMonitor` | `internal/sync.Mutex.state` | `PyMutex._bits` |
| Fast Path | Lightweight Locking；`ObjectMonitor` 使用 CAS `_owner` | CAS 修改 `state` | CAS 设置 `_Py_LOCKED` |
| 竞争失败 | Spin 或 Park 平台线程 | Park Goroutine | 通过 Parking Lot 等待平台线程 |
| 唤醒 | Monitor 等待队列与平台线程唤醒 | Runtime Semaphore | Parking Lot / Semaphore |

再看这些实现使用的底层能力：

| 底层能力 | x86-64 中的例子 | 负责什么 |
|---|---|---|
| Atomic RMW | `LOCK CMPXCHG`、`LOCK XADD` | 原子地读取并修改锁状态，只允许一个竞争者成功 |
| Memory Ordering | `LOCK` 指令的顺序约束；必要时使用 Fence；release store 在 x86-64 上可以是普通 Store | 限制临界区读写越过获取和释放边界 |
| Cache Coherence | CPU 内部协议，不是一条程序指令 | 协调不同 Core 对相关 Cache Line 的状态 |
| Spin / Wait / Wakeup | Spin 可使用 `PAUSE`；长期等待由 Runtime 和 OS 完成 | 竞争失败时控制 CPU 消耗，并在锁释放后恢复执行 |

三种语言使用的是同类底层能力，区别主要在 Runtime 如何保存锁状态，以及竞争失败后等待和唤醒哪一种执行单元。

---

# 6. 下一篇：Atomic

Mutex 使用小范围的原子操作，构造出能够保护任意代码范围的临界区。

如果只想完成 `counter++` 这样的单变量更新，还可以直接使用 Atomic：

```text
Java   -> AtomicInteger
Go     -> sync/atomic
Python -> 标准库没有与前两者完全对称的通用 AtomicInteger API
```
