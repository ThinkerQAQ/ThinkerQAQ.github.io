---
title: "4.2 Lock-Free Queue"
description: "Lock-free queue progress guarantees, a CAS-based linked-queue algorithm, ABA, and safe memory reclamation."
translationOf: "algorithm-concurrent/lock-free-queue"
language: "en"
updatedAt: "2026-09-15T03:30:00Z"
---

## 1. What a Lock-Free Queue Is

A lock-free queue is a concurrent queue that does not protect the entire queue critical section with a mutex. Typical implementations use atomic variables and [CAS](/en/notes/algorithm-concurrent/cas/) to update linked-list pointers.

**Lock-free** is a progress guarantee: even if one thread pauses, the system as a whole can continue completing operations. It is not the same as wait-free; an individual thread may still lose races and retry indefinitely.

## 2. Why Use One

A mutex-protected queue is easier to implement correctly and is often fast enough. A lock-free queue becomes worth considering when:

- lock contention is a measured bottleneck under concurrency;
- pausing a lock holder must not block all other participants;
- tail latency or system-wide progress guarantees matter.

Lock-free implementations introduce additional complexity around ABA, reclamation, and memory ordering, so “no mutex” does not automatically mean “faster.”

## 3. Classic Linked Structure

The classic Michael-Scott MPMC queue uses a **singly linked list** with a dummy node, not a doubly linked list:

```text
head ──► dummy ──► node1 ──► node2 ──► null
                                  ▲
                                  tail
```

`head`, `tail`, and each node's `next` link must be coordinated through atomic operations.

## 4. Enqueue

A simplified enqueue loop looks like this:

```text
loop {
    t = load(tail)
    next = load(t.next)

    if t != load(tail) {
        continue
    }

    if next == null {
        if CAS(t.next, null, newNode) succeeds {
            CAS(tail, t, newNode)   // help tail advance; failure does not undo enqueue
            return
        }
    } else {
        CAS(tail, t, next)          // help advance a lagging tail
    }
}
```

The key operation is atomically linking the new node after the current tail, not acquiring ownership of a mutex.

## 5. Dequeue

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
        CAS(tail, t, next)
        continue
    }

    value = next.value
    if CAS(head, h, next) succeeds {
        retire(h)                   // reclaim the old dummy only when it is safe
        return value
    }
}
```

## 6. Why You Cannot Immediately `delete oldHead`

The historical example immediately freed the old head after advancing `head`. In a real multi-producer, multi-consumer lock-free queue this is generally unsafe because another thread may still hold that pointer, creating a use-after-free bug.

Production implementations need a safe reclamation strategy, such as:

- hazard pointers;
- epoch-based reclamation or RCU-style schemes;
- garbage collection when the language runtime manages node lifetimes.

Memory reclamation is part of the algorithm's correctness story, not an optional cleanup detail.

## 7. ABA and Memory Ordering

Linked lock-free structures must also account for:

1. **ABA**, where a pointer representation goes A → B → A and a value-only CAS misses the intermediate change;
2. **memory ordering**, so a newly published node is fully initialized before another thread observes it through `next`.

Real implementations should therefore use standard atomic types and well-reviewed algorithms rather than copying legacy `__sync_bool_compare_and_swap` examples.

## 8. Reference

- Maged M. Michael, Michael L. Scott, *Simple, Fast, and Practical Non-Blocking and Blocking Concurrent Queue Algorithms*, 1996.
- [1024cores - Lock-Free Algorithms](https://www.1024cores.net/home/lock-free-algorithms)
