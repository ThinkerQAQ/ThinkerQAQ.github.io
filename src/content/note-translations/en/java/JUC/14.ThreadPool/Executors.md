---
title: "Executors Factory Methods"
description: "Convenience ExecutorService factories, their hidden queue/thread choices, and why explicit executor configuration or virtual-thread executors are often clearer."
translationOf: "java/JUC/14.ThreadPool/Executors"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

## 1. Convenience Factories

`Executors` provides factory methods such as fixed, single-thread, cached, scheduled, work-stealing, and in modern Java virtual-thread-per-task executors.

## 2. Hidden Policies Matter

Older advice says "never use Executors" because some factories choose effectively unbounded queues or thread counts. The deeper rule is:

> understand and intentionally choose the executor's concurrency and queueing policy.

A fixed thread pool with an unbounded queue can accumulate huge backlog. A cached pool can create many platform threads.

## 3. Prefer Explicitness for Servers

For latency-sensitive production services, explicit `ThreadPoolExecutor` configuration often makes capacity/rejection observable and reviewable.

## 4. Virtual Threads

For blocking task-per-request code, `Executors.newVirtualThreadPerTaskExecutor()` can simplify concurrency, but downstream limits still require semaphores/pools/rate limits.