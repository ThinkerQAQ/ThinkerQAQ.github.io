---
title: "4.2 Lock-Free Queue"
description: "基于 CAS 的无锁队列历史实现记录，以及安全内存回收边界。"
sourcePath: "Concurrent/LockFreeQueue.md"
category: "algorithm"
categoryLabel: "Data Structures & Algorithms"
topic: "concurrent-algorithms"
topicLabel: "4.Concurrent Algorithms"
order: 39
tags: ["Algorithm", "Concurrency", "Queue", "Lock-Free", "CAS"]
updatedAt: "2026-09-15T11:40:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 什么是LockFreeQueue
基于无锁（lock-free）思路实现的线程安全队列，通常依赖 CAS 等原子操作协调并发更新。

“lock-free”描述的是系统整体的进展保证，不表示没有任何重试，也不表示在所有负载下都一定比互斥锁更快。

## 2. 为什么需要LockFreeQueue
原笔记从“悲观锁 vs 乐观并发”的角度理解它：当锁竞争和线程阻塞成本成为瓶颈时，可以考虑用原子操作和重试避免持有一把覆盖整个队列的互斥锁。

是否值得使用仍然要通过实际竞争程度、延迟和吞吐量验证。

## 3. 如何实现LockFreeQueue
原笔记记录的核心思路是：

死循环 + [CAS](/notes/algorithm-concurrent/cas/) + **单向链表**

下面保留原来的入队/出队代码形态，作为历史学习示意。它没有完整展示现代 C/C++ 原子类型、内存序和安全内存回收，因此**不能直接作为生产级 MPMC 队列实现**。

1. 入队

```cpp
bool LockFreeQueue::enqueue(int val)
{
    QueueNode* cur_node;
    QueueNode* add_node = new QueueNode(val);
    while (1) {
        cur_node = tail;
        if (__sync_bool_compare_and_swap(&(cur_node->next), NULL, add_node)) {
            break;
        }
        else {
            __sync_bool_compare_and_swap(&tail, cur_node, cur_node->next);
        }
    }
    __sync_bool_compare_and_swap(&tail, cur_node, add_node);
    return 1;
}
```

2. 出队

```cpp
int LockFreeQueue::dequeue()
{
    QueueNode* cur_node;
    int        val;
    while (1) {
        cur_node = head;
        if (cur_node->next == NULL) {
            return -1;
        }

        if (__sync_bool_compare_and_swap(&head, cur_node, cur_node->next)) {
            break;
        }
    }
    val = cur_node->next->val;

    // 历史示例原本在这里立即释放旧 head。
    // 多线程无锁结构中，其他线程仍可能持有该节点的引用，
    // 因此需要 hazard pointer、epoch 等安全内存回收方案。
    return val;
}
```

这段历史代码还有两个需要注意的边界：

- GCC 的 `__sync_*` 是较老的原子 builtin；现代 C/C++ 更常使用语言标准原子 API 或较新的 `__atomic_*`。
- 节点释放不能像普通单线程链表一样在出队成功后立即处理，必须保证没有其他并发线程仍在访问旧节点。

## 4. 参考
- [无锁队列讲解 - bilibili](https://www.bilibili.com/video/BV1q54y1Y71W?vd_source=79c9f80f56384444d88bfb3e4cf579df)
- [无锁队列的实现 | 酷壳 CoolShell](https://coolshell.cn/articles/8239.html)
- [Implementing-LockFree-Queues](https://github.com/zxwsbg/Implementing-LockFree-Queues)
