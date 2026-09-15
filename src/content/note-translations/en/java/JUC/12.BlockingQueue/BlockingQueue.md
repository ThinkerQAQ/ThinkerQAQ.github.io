---
title: "BlockingQueue"
description: "Producer-consumer queues with bounded capacity, blocking/timed operations, backpressure, and the semantics of major Java BlockingQueue implementations."
translationOf: "java/JUC/12.BlockingQueue/BlockingQueue"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

## 1. Purpose

`BlockingQueue` combines a queue with waiting semantics for producers/consumers.

Typical method families:

| Action | exception | special value | block | timed |
| --- | --- | --- | --- | --- |
| insert | `add` | `offer` | `put` | `offer(timeout)` |
| remove | `remove` | `poll` | `take` | `poll(timeout)` |
| examine | `element` | `peek` | — | — |

## 2. Backpressure

A **bounded** queue is an important overload-control mechanism. When full, producers either wait, time out, reject, or apply another policy.

An effectively unbounded queue can hide overload until latency/memory becomes unacceptable.

## 3. Implementations

- `ArrayBlockingQueue` — bounded array, one fixed capacity;
- `LinkedBlockingQueue` — linked nodes, optionally bounded, default capacity is very large;
- `PriorityBlockingQueue` — priority heap, logically unbounded, no FIFO guarantee across priorities;
- `SynchronousQueue` — zero-capacity handoff: producer and consumer rendezvous.

## 4. Memory Semantics

Actions before putting an element into a concurrent queue happen-before actions after another thread removes/accesses that element through the documented queue handoff.