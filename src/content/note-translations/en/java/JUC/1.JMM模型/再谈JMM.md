---
title: "6.23 The Java Memory Model (JMM)"
description: "Java's memory model, data races, happens-before, synchronization order, volatile, monitors, thread start/join, final fields, and sequential consistency for correctly synchronized programs."
translationOf: "java/JUC/1.JMM模型/再谈JMM"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

## 1. What the JMM Defines

The Java Memory Model defines which values threads may observe and which executions are legal when Java threads communicate through shared memory.

It abstracts over compiler optimizations, JIT code generation, CPU caches, store buffers, and hardware memory models.

The common "main memory + per-thread working memory" diagram is a conceptual model. Do not equate a Java thread's working memory directly with a particular CPU cache.

## 2. Three Questions

### Visibility

When one thread writes shared state, under what synchronization does another thread have to observe that write?

### Ordering

Which program-order operations can another thread observe as ordered, and which transformations are legal?

### Atomicity

Which operations occur indivisibly relative to other threads? A compound operation such as `count++` is read-modify-write and is not made atomic merely because each individual read/write is atomic.

## 3. Happens-Before

If action A **happens-before** action B, then A's effects are visible to B and A is ordered before B in the JMM relation.

Important rules include:

- program order within one thread;
- monitor unlock happens-before a later lock of the same monitor;
- a write to a `volatile` variable happens-before a subsequent read of that same variable;
- `Thread.start()` happens-before actions in the started thread;
- all actions in a thread happen-before another thread successfully returns from `join()` on it;
- happens-before is transitive.

Happens-before is a semantic ordering relation, not simply wall-clock timing.

## 4. Correctly Synchronized Programs

A key JMM result is that correctly synchronized, data-race-free Java programs can be reasoned about with sequential-consistency-style intuition for their synchronization actions.

When code contains data races, legal observations can be much less intuitive even though JVM implementations remain constrained by the JMM.

## 5. `final` Fields

The post-Java-5 memory model gives `final` fields special initialization-safety guarantees when objects are properly constructed and do not leak `this` during construction.

## 6. Practical Rule

Reason in terms of JMM synchronization primitives—locks, volatile, atomics, thread lifecycle, concurrent collections—not in terms of manually forcing values "from cache to RAM."