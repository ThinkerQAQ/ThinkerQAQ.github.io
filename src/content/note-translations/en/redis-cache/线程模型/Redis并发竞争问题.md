---
title: "3.2 Redis Concurrency Races"
description: "Why individually atomic Redis commands do not make multi-command application workflows atomic, and how INCR, WATCH, Lua/Functions, locks, and database constraints solve different races."
translationOf: "redis-cache/线程模型/Redis并发竞争问题"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. The Lost-Update Problem

Suppose `price=10` and two clients both implement `+10` as `GET`, local addition, then `SET`.

Both can read 10 and both can write 20, losing one update.

Redis may serialize individual commands, but the **application workflow spans multiple commands**, so another client can interleave between them.

## 2. Use an Atomic Command When One Exists

For counters, `INCRBY` is better than `GET` + `SET`.

The first question should always be whether Redis already exposes the required operation atomically.

## 3. Optimistic Concurrency with `WATCH`

`WATCH` lets a client abort `EXEC` if observed keys changed before commit. The application retries from current state.

This is appropriate when contention is modest and the operation maps naturally to optimistic retry.

## 4. Lua / Functions

Server-side logic can combine reads and writes into one atomic operation on the owning shard.

Keep scripts bounded to avoid latency spikes.

## 5. Locks

A distributed lock can serialize a larger workflow but introduces leases, expiry, failure, and fencing concerns. Do not add a lock when one atomic command/CAS is sufficient.

## 6. Source-of-Truth Constraints

If the invariant ultimately belongs to a transactional database—for example account balance uniqueness or order state transitions—database constraints/version checks may be the correct authority. Redis should not silently become the consistency layer just because it is fast.