---
title: "ArrayBlockingQueue"
description: "A fixed-capacity array-backed blocking queue with explicit backpressure, FIFO element order, and optional fairness."
translationOf: "java/JUC/12.BlockingQueue/ArrayBlockingQueue"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

## 1. Characteristics

`ArrayBlockingQueue` is a bounded FIFO queue backed by a fixed-size array.

Capacity is chosen at construction and does not grow.

## 2. Synchronization

Its implementation coordinates producers and consumers with locking plus conditions for "not empty" and "not full" states.

This lets consumers sleep when empty and producers sleep when full instead of busy-spinning.

## 3. Fairness

An optional fairness flag influences lock/wait ordering. Fair mode can improve waiting predictability but reduce throughput.

## 4. When to Use

Use it when a fixed memory/backpressure boundary is desirable and FIFO work ordering is sufficient.

A bounded queue is often safer in server thread pools than an effectively unlimited work queue because overload becomes explicit.