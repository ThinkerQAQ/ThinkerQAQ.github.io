---
title: "2.5 Redis Distributed Locks"
description: "Lease-based locking with SET NX PX, ownership tokens, atomic release, renewal, failure windows, fencing tokens, and the limits of Redis replication/Redlock."
translationOf: "redis-cache/使用/Redis分布式锁"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. Basic Single-Instance Lock

A common Redis lease pattern is:

```redis
SET lock-key random-owner-token NX PX 10000
```

Properties:

- `NX` acquires only if the key does not exist;
- expiry prevents permanent lock leakage;
- a unique owner token prevents one client from deleting another client's lock.

## 2. Safe Release

Do not use separate `GET` then `DEL` operations because another client can acquire the lock between them.

Release atomically, traditionally with Lua:

```lua
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0
```

Modern Redis also provides richer conditional command/function options depending on version, but the invariant is the same: **only the owner may release its lease**.

## 3. A Lease Can Expire While Work Continues

Suppose client A pauses for GC, scheduling, network delay, or overload long enough for the lease to expire. Client B can then acquire the lock while A resumes and still believes its old work is valid.

Lease renewal reduces this probability but does not make stale actors impossible.

## 4. Fencing Tokens

When the protected resource can enforce ordering, issue a monotonically increasing fencing token with each successful lock acquisition.

The downstream resource rejects operations carrying older tokens. This converts "stale lock holder resumes later" from silent corruption into a rejected stale write.

For correctness-critical distributed locking, fencing is often more important than merely making the Redis lease algorithm more elaborate.

## 5. Failover Risk

With asynchronous primary-replica Redis, this can happen:

1. A acquires a lock on the primary;
2. the lock has not reached a replica;
3. the primary fails;
4. the replica is promoted;
5. B acquires what appears to be the same free lock.

Now A and B can both believe they own it.

## 6. Redlock

Redlock acquires leases from a majority of independent Redis masters within a bounded time window. It is intended to reduce dependence on one asynchronous replica set.

Its suitability depends on your failure assumptions, timing model, and protected resource. For strict correctness where split ownership is unacceptable, prefer a coordination system with stronger consensus/lease semantics and/or enforce fencing at the resource.

## 7. Practical Rule

Use Redis locks for workflows where leases and bounded duplicate execution are acceptable. For financial/state-machine invariants, first ask whether database constraints, optimistic concurrency, idempotency, a transactional outbox, or a consensus-backed coordinator provides a clearer correctness proof.