---
title: "4.1 Compare-and-Swap (CAS)"
description: "The basic CAS semantics, use cases, ABA problem, and CPU atomic-instruction implementation."
translationOf: "algorithm-concurrent/cas"
language: "en"
updatedAt: "2026-09-15T11:40:00Z"
---
## 1. What CAS Is
CAS (Compare-and-Swap) is an atomic operation: compare the current value in memory with an expected value, and replace it with a new value only when they match.

The original note used the following code to describe the semantics:

```c
int cas(long *addr, long old, long new)
{
    /* Executes atomically. */
    if(*addr != old)
        return 0;
    *addr = new;
    return 1;
}
```

This is **semantic pseudocode**. An ordinary C “compare + write” sequence is not automatically atomic; real CAS requires CPU atomic instructions and an atomic API supplied by the language or runtime.

## 2. Why CAS Is Needed
CAS is used in multithreaded programming for atomic compare-and-exchange operations and is a building block for atomic variables and lock-free algorithms.

Whether a failed CAS should be retried is determined by the surrounding algorithm; CAS by itself is not a complete lock-free algorithm.

## 3. CAS Problems
### 3.1. ABA
If a value changes through `A → B → A`, a CAS that only compares the final value may still conclude that the value is unchanged. This is the ABA problem.

Common approaches include adding a version counter or combining pointer-based lock-free structures with safe memory reclamation.

## 4. CAS Implementation
CAS is generally based on atomic read-modify-write instructions supplied by the CPU and exposed through language-level atomic APIs.

Some languages also require a memory-order choice. That is additional atomic-API semantics and does not change the core CAS idea recorded in the original note.

## 5. References
- [Compare-and-swap - Wikipedia](https://en.wikipedia.org/wiki/Compare-and-swap)
