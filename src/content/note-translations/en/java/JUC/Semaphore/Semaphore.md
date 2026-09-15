---
title: "Semaphore"
description: "Permit-based concurrency control with acquire/release, bounded resource access, optional fairness, and the distinction from rate limiting."
translationOf: "java/JUC/Semaphore/Semaphore"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

## 1. Purpose

A `Semaphore` maintains a number of permits.

`acquire()` consumes a permit or waits; `release()` returns one.

## 2. Use Cases

Semaphores are useful for limiting simultaneous use of a scarce resource:

- at most N concurrent downstream calls;
- bounded access to an expensive service;
- fixed concurrency around a critical resource pool.

## 3. Rate vs. Concurrency

A semaphore controls **in-flight concurrency**, not requests per second. A rate limiter controls work over time.

## 4. Fairness

Java semaphores can be fair or nonfair. Fair mode generally honors queued predecessors more strongly but can reduce throughput.

## 5. Ownership

Unlike a mutex, a semaphore permit is not intrinsically tied to the thread that acquired it. Correct code must preserve acquire/release accounting.