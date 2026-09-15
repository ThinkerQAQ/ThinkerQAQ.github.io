---
title: "6.17 Fork/Join Framework"
description: "Java ForkJoinPool, recursive task decomposition, work stealing, common-pool behavior, and the limits of fork/join for blocking work."
translationOf: "java/JUC/17.fork_join/fork_join"
language: "en"
updatedAt: "2026-09-15T04:40:00Z"
---

## 1. What Fork/Join Solves

The fork/join framework is designed for recursively decomposable work: split a large task into smaller independent tasks, process them in parallel, and combine the results.

Core types include `ForkJoinPool`, `RecursiveTask<V>`, and `RecursiveAction`.

## 2. Work Stealing

Workers maintain task queues. An idle worker can steal work from another worker, which helps balance uneven recursive decomposition without one central task queue becoming the only scheduling point.

This is especially suitable for CPU-bound divide-and-conquer algorithms with reasonably sized tasks.

## 3. Typical Pattern

```java
class SumTask extends RecursiveTask<Long> {
    protected Long compute() {
        if (smallEnough()) {
            return computeDirectly();
        }
        SumTask left = splitLeft();
        SumTask right = splitRight();
        left.fork();
        long r = right.compute();
        return left.join() + r;
    }
}
```

The cutoff matters: tasks that are too small create scheduling overhead; tasks that are too large waste parallelism.

## 4. Blocking Work

A `ForkJoinPool` is primarily designed around active computational tasks. Long blocking I/O can occupy workers and reduce parallelism.

Use an execution model appropriate to blocking workloads. Modern Java virtual threads also change the cost model for many blocking tasks, but they do not make fork/join obsolete for recursive CPU parallelism.

## 5. Common Pool

Parallel streams and several asynchronous APIs may use the common fork/join pool. Sharing that pool means unrelated workloads can interfere with each other, so latency-sensitive or blocking work often deserves an explicit executor.