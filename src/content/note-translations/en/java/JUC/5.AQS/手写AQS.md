---
title: "Building an AQS-Style Synchronizer"
description: "A teaching implementation of a synchronizer using atomic state, a FIFO wait queue, park/unpark, and release wakeups, emphasizing invariants rather than copying JDK internals."
translationOf: "java/JUC/5.AQS/手写AQS"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

## 1. Learning Goal

A small AQS-like implementation helps explain why a blocking lock needs more than a boolean.

Core pieces are:

- atomic ownership/state;
- a concurrent wait queue;
- a protocol for enqueue/cancel;
- `park` to suspend losers;
- `unpark` to wake a successor after release.

## 2. Fast Path

A thread first attempts an atomic state transition. If uncontended, no queue or park is required.

## 3. Slow Path

On failure:

1. create/enqueue a waiter node safely;
2. wait until it is eligible to retry;
3. park to avoid wasting CPU;
4. handle interrupts/timeouts/cancellation;
5. retry state acquisition after wakeup.

## 4. Release

The owner changes state atomically and wakes an appropriate successor when the synchronizer becomes available.

## 5. Hard Parts

A production-quality synchronizer must handle races among:

- enqueue and release;
- cancellation and successor discovery;
- interrupt/timeout;
- reentrancy;
- fairness;
- memory ordering.

That is why application code should normally use JUC synchronizers rather than implementing a queueing lock from scratch.

## 6. Do Not Copy Old AQS Source Blindly

This historical note's source walk-through is useful conceptually, but JDK AQS internals evolve. Treat exact `Node` layouts/status constants/Unsafe calls as version-specific.