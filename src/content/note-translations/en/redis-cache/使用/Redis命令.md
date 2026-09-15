---
title: "Redis Command Guide"
description: "A compact guide to Redis command families and production-safe usage principles instead of a version-frozen command dump."
translationOf: "redis-cache/使用/Redis命令"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. Prefer the Official Command Reference

Redis commands evolve. Rather than copying a large static list, organize commands by data model and verify syntax/complexity against the documentation for your deployed version.

## 2. Core Families

### Strings

`GET`, `SET`, `MGET`, `MSET`, `INCRBY`, bit operations.

### Hashes

`HGET`, `HSET`, `HMGET`, `HSCAN`, field counters.

### Lists

`LPUSH`, `RPUSH`, `LPOP`, `RPOP`, blocking pop variants, bounded trimming.

### Sets

`SADD`, `SREM`, `SISMEMBER`, intersections/unions/differences.

### Sorted Sets

`ZADD`, `ZRANGE`, score/rank operations, removals.

### Streams

`XADD`, `XREAD`, `XREADGROUP`, `XACK`, pending/claim operations.

### Key Lifecycle

`EXPIRE`, `TTL`, `PERSIST`, `DEL`, `UNLINK`, `SCAN`.

## 3. Production Safety

Know command complexity before putting it on a request path.

Avoid unbounded operations over huge values/keyspaces. In particular:

- prefer `SCAN` over `KEYS` for background iteration;
- prefer `UNLINK` when asynchronous freeing is appropriate;
- avoid requesting an entire huge collection when a bounded range suffices;
- batch carefully rather than sending enormous multi-key commands.

## 4. Atomicity

Each individual Redis command is executed atomically relative to other commands on the same shard, but a sequence of commands is not automatically atomic. Use dedicated atomic commands, transactions, Lua/Functions, or optimistic concurrency where needed.