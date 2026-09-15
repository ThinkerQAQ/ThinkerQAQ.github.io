---
title: "ReentrantReadWriteLock"
description: "A reentrant read/write lock with shared readers, exclusive writers, optional fairness, lock downgrading, and workload trade-offs."
translationOf: "java/JUC/ReadWriteLock/ReentrantReadWriteLock"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

## 1. Model

`ReentrantReadWriteLock` exposes:

- a shared read lock;
- an exclusive write lock.

Multiple readers can hold the read lock together when no writer owns the write lock. A writer requires exclusive access.

## 2. Good Workloads

Read/write locks can help when:

- reads dominate;
- protected sections are long enough for read parallelism to matter;
- contention is meaningful.

For tiny critical sections, a plain mutex can be faster/simpler.

## 3. Reentrancy and Downgrading

The lock is reentrant. A writer can acquire the read lock before releasing the write lock to **downgrade** safely.

Upgrading from read to write lock is not a generally safe symmetric operation and can deadlock if attempted naively.

## 4. Fairness

Fair/nonfair policies trade wait ordering against throughput similarly to `ReentrantLock`.

## 5. Alternatives

For optimistic read-heavy structures, `StampedLock`, immutable snapshots, concurrent collections, or copy-on-write designs may fit better depending on consistency and update patterns.