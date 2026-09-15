---
title: "Nonfair ReentrantReadWriteLock"
description: "Default read/write-lock acquisition, reader/writer barging policy, writer-starvation avoidance heuristics, and throughput trade-offs."
translationOf: "java/JUC/ReadWriteLock/非公平ReadWriteLock"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

## 1. Nonfair Does Not Mean Readers Always Win

The default read/write lock allows more opportunistic acquisition than fair mode, but implementations still include policy to avoid pathological writer starvation.

## 2. Throughput

Allowing currently running threads to acquire when safe can reduce context switches and increase throughput.

## 3. Starvation/Fairness

Observed fairness is weaker than fair mode. If a workload has strict latency/fairness requirements, test fair mode or choose a different concurrency design.

## 4. Version-Sensitive Internals

Historical JDK 8 source explanations are useful for learning AQS shared/exclusive mechanics, but exact reader-blocking heuristics and fields should be checked against the actual JDK source in use.