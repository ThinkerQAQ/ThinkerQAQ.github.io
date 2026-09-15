---
title: "Fair ReentrantReadWriteLock"
description: "Fair read/write-lock scheduling, queued predecessors, reader grouping, writer progress, and fairness costs."
translationOf: "java/JUC/ReadWriteLock/公平ReadWriteLock"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

## 1. Fair Mode

Fair `ReentrantReadWriteLock` uses queue order to reduce barging by later readers or writers.

A group of readers can still proceed together when their acquisition is eligible and no earlier writer should take precedence.

## 2. Goal

The policy reduces starvation risk and makes acquisition order more predictable under contention.

## 3. Cost

Strictly honoring queued predecessors can reduce throughput compared with nonfair mode because newly running threads lose opportunistic acquisitions.

## 4. Implementation

The lock uses AQS shared/exclusive state to account for readers and the write owner. Exact bit layouts and queue methods are implementation details of a particular JDK; rely on documented semantics.