---
title: "1.4 Redis Transactions"
description: "MULTI/EXEC queuing, isolated execution, WATCH optimistic concurrency, error behavior, and why Redis transactions are not rollback-based ACID database transactions."
translationOf: "redis-cache/Redis事务"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. What a Redis Transaction Provides

`MULTI`/`EXEC` lets a client queue a group of commands and execute them sequentially without other clients' commands being interleaved between those transaction commands.

```redis
MULTI
SET age 30
GET age
EXEC
```

Before `EXEC`, queued commands have not executed.

## 2. No Rollback of Runtime Errors

Redis transactions are not traditional rollback transactions.

If a command is invalid at queue time, the transaction can be rejected. But if a queued command is syntactically valid and fails at execution time—for example due to a wrong value type—other valid commands can still execute, and earlier effects are not rolled back.

Therefore, describing Redis transactions as "all commands either all execute or none execute" is misleading unless you distinguish queue-time errors from execution-time errors.

## 3. `DISCARD`

`DISCARD` cancels commands that are still queued before `EXEC`. It does not roll back commands that have already executed.

## 4. `WATCH` for Optimistic Concurrency

`WATCH` observes keys before `MULTI`/`EXEC`.

If a watched key changes before `EXEC`, the transaction aborts instead of applying the queued commands. The application can then retry from fresh state.

This is optimistic concurrency control, similar in spirit to version checks/CAS.

## 5. Transaction vs. Lua / Functions

For logic that requires read-modify-write atomicity inside Redis, Lua scripting or Redis Functions can often express the operation more directly than `WATCH` retry loops.

Keep scripts bounded because atomic execution also means a long script delays other commands.

## 6. ACID Comparison

Do not map Redis `MULTI/EXEC` mechanically onto relational ACID transactions.

- isolation/interleaving semantics are useful;
- rollback semantics differ;
- durability depends on persistence/fsync;
- cross-node atomicity in Redis Cluster is constrained by hash-slot placement.