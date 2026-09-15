---
title: "4.1 Compare-and-Swap (CAS)"
description: "CAS atomic compare-and-swap semantics, common uses, the ABA problem, and memory-ordering boundaries."
translationOf: "algorithm-concurrent/cas"
language: "en"
updatedAt: "2026-09-15T03:30:00Z"
---

## 1. What CAS Is

CAS, or Compare-and-Swap (also commonly called Compare-and-Set), is an atomic read-compare-write operation:

1. read the current value at a target location;
2. compare it with an `expected` value;
3. write `desired` only when the comparison succeeds;
4. report whether the exchange succeeded.

The following is semantic pseudocode only. A real CAS must make the whole operation atomic:

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

A failed CAS only means that the current value does not equal the expected value. It should not be simplified to “another thread changed it exactly once,” because the value may have changed and then returned to the same representation.

## 2. Why CAS Is Useful

CAS is commonly used to build lock-free data structures and atomic state machines. A counter can, for example, use a retry loop:

```text
loop {
    old = load(counter)
    new = old + 1
    if CAS(counter, old, new) succeeds {
        break
    }
}
```

This avoids serializing the entire update with a mutex, but heavy contention can still cause repeated retries. CAS therefore does not automatically mean better performance.

## 3. The ABA Problem

Suppose thread A reads value `A` and pauses while another thread performs:

```text
A → B → A
```

When thread A resumes, a CAS that only compares the current representation can succeed even though the state changed in between.

Common techniques include:

- attaching a version or counter and comparing `(pointer, version)` together;
- combining pointer-based lock-free structures with safe memory reclamation so that released objects are not unsafely reused.

## 4. CAS and Memory Ordering

CAS guarantees an atomic read-modify-write operation on an atomic object. That alone does not define how all surrounding ordinary reads and writes become visible to other threads.

Modern atomic APIs therefore expose memory-ordering semantics such as acquire, release, acquire-release, and sequential consistency. Correct lock-free algorithms must reason about atomicity, visibility, and ordering together.

## 5. Implementation

At the hardware level, CAS-like semantics are implemented with atomic instructions or mechanisms such as LL/SC (Load-Linked / Store-Conditional). Application code should normally use the language's standard atomic API instead of old compiler-specific intrinsics.

## 6. Why It Lives Under Algorithms

CAS is closer to a concurrency primitive than a standalone algorithm, but it is a building block for many lock-free algorithms. It is therefore grouped here with [Lock-Free Queue](/en/notes/algorithm-concurrent/lock-free-queue/) under **Concurrent Algorithms**.

## 7. References

- [Compare-and-swap - Wikipedia](https://en.wikipedia.org/wiki/Compare-and-swap)
- [std::atomic::compare_exchange_weak / compare_exchange_strong - cppreference](https://en.cppreference.com/w/cpp/atomic/atomic/compare_exchange)
