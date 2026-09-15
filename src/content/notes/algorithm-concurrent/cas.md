---
title: "4.1 Compare-and-Swap（CAS）"
description: "CAS 的原子比较交换语义、典型用途、ABA 问题与内存序边界。"
sourcePath: "Concurrent/CAS.md"
category: "algorithm"
categoryLabel: "Data Structures & Algorithms"
topic: "concurrent-algorithms"
topicLabel: "4.Concurrent Algorithms"
order: 38
tags: ["Algorithm", "Concurrency", "CAS", "Lock-Free"]
updatedAt: "2026-09-15T03:30:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 什么是 CAS

CAS（Compare-and-Swap，也常写作 Compare-and-Set）是一种原子的“读-比较-写”操作：

1. 读取目标位置当前值；
2. 将它与期望值 `expected` 比较；
3. 只有相等时才把目标值更新为 `desired`；
4. 返回本次交换是否成功。

下面的代码只是语义上的伪代码。真正的 CAS 必须由语言运行时或硬件保证整个过程不可被拆开观察：

```text
bool cas(addr, expected, desired) {
    atomically {
        if (*addr != expected) {
            return false;
        }
        *addr = desired;
        return true;
    }
}
```

CAS 失败只表示“当前值不等于期望值”。通常这意味着状态已经发生变化，但不能简单等价为“另一个线程刚刚修改过一次”，因为还可能出现 ABA。

## 2. 为什么需要 CAS

CAS 常用来构建无锁数据结构和原子状态机。例如多个线程同时更新一个计数器时，可以采用“读取旧值 → 计算新值 → CAS 提交；失败则重新读取并重试”的循环。

```text
loop {
    old = load(counter)
    new = old + 1
    if CAS(counter, old, new) succeeds {
        break
    }
}
```

这种方式避免了用互斥锁把整个更新过程串行化，但竞争激烈时仍可能发生大量重试，因此 CAS 并不天然意味着更高性能。

## 3. ABA 问题

假设线程 A 读到值为 `A`，随后暂停：

```text
A → B → A
```

线程 B 在这期间把值从 A 改成 B，又改回 A。线程 A 恢复后执行 CAS 时，只看到“当前值仍然是 A”，因此 CAS 可能成功，却无法发现中间发生过变化。

常见处理方式包括：

- 给值附加版本号或计数器，例如比较 `(pointer, version)`；
- 在指针型无锁结构中配合合适的内存回收方案，避免对象被释放后地址重新利用造成更严重的问题。

## 4. CAS 与内存序

CAS 保证的是某个原子对象上的原子读-改-写语义。它并不自动说明周围所有普通读写应该以什么顺序对其他线程可见。

现代语言的原子 API 通常还会暴露 acquire、release、acq_rel、sequentially consistent 等内存序语义。设计无锁算法时，需要同时考虑：

- 原子性；
- 可见性；
- 内存排序。

## 5. 实现

底层通常依赖 CPU 提供的原子指令，或者使用 LL/SC（Load-Linked / Store-Conditional）一类机制实现同等语义。应用代码应优先使用语言提供的原子 API，而不是依赖编译器的旧式私有内建函数。

## 6. 与本分类的关系

CAS 本身更接近并发原语，但它是许多 lock-free 算法的基础，因此在这里和 [Lock-Free Queue](/notes/algorithm-concurrent/lock-free-queue/) 一起归到 **Concurrent Algorithms**。

## 7. 参考

- [Compare-and-swap - Wikipedia](https://en.wikipedia.org/wiki/Compare-and-swap)
- [std::atomic::compare_exchange_weak / compare_exchange_strong - cppreference](https://en.cppreference.com/w/cpp/atomic/atomic/compare_exchange)
