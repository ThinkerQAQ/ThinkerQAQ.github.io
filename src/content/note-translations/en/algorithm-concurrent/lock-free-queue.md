---
title: "4.2 Lock-Free Queue"
description: "A historical CAS-based lock-free queue implementation note and its safe-memory-reclamation boundary."
translationOf: "algorithm-concurrent/lock-free-queue"
language: "en"
updatedAt: "2026-09-15T11:40:00Z"
---
## 1. What LockFreeQueue Is
A Lock-Free Queue is a thread-safe queue implemented with lock-free techniques, usually coordinating concurrent updates with CAS and other atomic operations.

“Lock-free” describes a system-wide progress guarantee. It does not mean there are no retries, and it does not mean the implementation is faster than a mutex under every workload.

## 2. Why LockFreeQueue Is Needed
The original note framed the problem as pessimistic locking versus optimistic concurrency: when lock contention and thread blocking become measurable bottlenecks, atomic operations and retries can avoid one mutex protecting the entire queue.

## 3. How to Implement LockFreeQueue
The original note recorded this core idea:

retry loop + [CAS](/en/notes/algorithm-concurrent/cas/) + **singly linked list**

The enqueue/dequeue code shape is preserved below as a historical learning example. It does not fully model modern C/C++ atomic types, memory ordering, or safe memory reclamation, so it **must not be used directly as a production MPMC queue**.

1. Enqueue

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

2. Dequeue

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

    // The historical example immediately reclaimed the old head here.
    // Another thread may still hold a reference to that node, so a
    // hazard-pointer, epoch, or other safe-reclamation scheme is required.
    return val;
}
```

Two boundaries of this historical code are important:

- GCC `__sync_*` builtins are older atomics; modern C/C++ code normally uses standard atomics or newer `__atomic_*` builtins.
- Nodes cannot be reclaimed like a normal single-threaded list immediately after dequeue; reclamation must wait until no concurrent reader can still access the old node.

## 4. References
- [Lock-free queue explanation - bilibili](https://www.bilibili.com/video/BV1q54y1Y71W?vd_source=79c9f80f56384444d88bfb3e4cf579df)
- [Lock-Free Queue - CoolShell](https://coolshell.cn/articles/8239.html)
- [Implementing-LockFree-Queues](https://github.com/zxwsbg/Implementing-LockFree-Queues)
