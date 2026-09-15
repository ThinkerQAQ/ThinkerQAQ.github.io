---
title: "4.2 Lock-Free Queue"
description: "无锁队列的进展保证、基于 CAS 的链式队列算法，以及 ABA 和安全内存回收问题。"
sourcePath: "Concurrent/LockFreeQueue.md"
category: "algorithm"
categoryLabel: "Data Structures & Algorithms"
topic: "concurrent-algorithms"
topicLabel: "4.Concurrent Algorithms"
order: 39
tags: ["Algorithm", "Concurrency", "Queue", "Lock-Free", "CAS"]
updatedAt: "2026-09-15T03:30:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 什么是 Lock-Free Queue

Lock-Free Queue 是不依赖互斥锁保护整个队列临界区的并发队列。典型实现使用原子变量和 [CAS](/notes/algorithm-concurrent/cas/) 来更新链表指针。

这里的 **lock-free** 是一种进展保证：即使某个线程暂停，系统整体仍然能够持续完成操作。它不等于 wait-free；单个线程仍可能因为竞争不断失败并重试。

## 2. 为什么使用无锁队列

互斥锁队列通常更容易写对，也往往已经足够快。无锁队列主要在下面这些场景才值得考虑：

- 高并发下锁竞争成为可测量的瓶颈；
- 需要避免持锁线程暂停时阻塞其他线程；
- 对尾延迟或系统级进展保证有明确要求。

无锁实现会增加算法复杂度，并带来 ABA、内存回收和内存序等问题，因此不能只因为“没有锁”就认为它一定更快。

## 3. 经典链式结构

经典的 Michael-Scott MPMC Queue 使用**单向链表**和一个 dummy 节点，而不是双向链表：

```text
head ──► dummy ──► node1 ──► node2 ──► null
                                  ▲
                                  tail
```

`head`、`tail` 以及节点的 `next` 都需要通过原子操作协调。

## 4. 入队思路

简化后的核心流程是：

```text
loop {
    t = load(tail)
    next = load(t.next)

    if t != load(tail) {
        continue
    }

    if next == null {
        if CAS(t.next, null, newNode) succeeds {
            CAS(tail, t, newNode)   // 帮助 tail 前移；失败也不影响已完成的入队
            return
        }
    } else {
        CAS(tail, t, next)          // 发现 tail 落后时帮助推进
    }
}
```

关键点不是“抢到一把锁”，而是谁先成功把新节点接到当前尾节点之后。

## 5. 出队思路

```text
loop {
    h = load(head)
    t = load(tail)
    next = load(h.next)

    if h != load(head) {
        continue
    }

    if h == t {
        if next == null {
            return EMPTY
        }
        CAS(tail, t, next)          // tail 落后，先帮助推进
        continue
    }

    value = next.value
    if CAS(head, h, next) succeeds {
        retire(h)                   // 延迟到安全时机再回收旧 dummy 节点
        return value
    }
}
```

## 6. 为什么不能直接 `delete oldHead`

历史版本的示例在 CAS 推进 `head` 成功后立即释放旧节点。对多生产者、多消费者的真实无锁队列来说，这通常是不安全的：其他线程可能仍然持有该节点指针，从而产生 use-after-free。

生产级实现需要安全内存回收策略，例如：

- hazard pointers；
- epoch-based reclamation / RCU 类方案；
- 由垃圾回收器管理节点生命周期的语言运行时。

内存回收问题和队列算法本身同样重要。

## 7. ABA 与内存序

链式无锁结构还需要处理两个问题：

1. **ABA**：指针值可能经历 A → B → A，使只比较当前值的 CAS 看不到中间变化；
2. **内存序**：发布新节点时，要保证节点内容在其他线程通过 `next` 看到节点之后已经正确可见。

因此实际实现应使用语言标准库提供的原子类型和成熟算法，而不是直接复制旧式 `__sync_bool_compare_and_swap` 示例。

## 8. 参考

- Maged M. Michael, Michael L. Scott, *Simple, Fast, and Practical Non-Blocking and Blocking Concurrent Queue Algorithms*, 1996.
- [1024cores - Lock-Free Algorithms](https://www.1024cores.net/home/lock-free-algorithms)
