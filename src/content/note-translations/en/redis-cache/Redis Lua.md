---
title: "1.7 Redis Lua Scripting"
description: "Atomic server-side Redis scripting with EVAL/EVALSHA, KEYS/ARGV, script-cache behavior, cluster constraints, bounded execution, and when to prefer Redis Functions."
translationOf: "redis-cache/Redis Lua"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. Why Run Lua in Redis?

A Redis Lua script executes server-side as one atomic operation relative to other commands on that Redis shard.

This is useful for read-modify-write logic that would otherwise require several client/server round trips and risk races between commands.

## 2. `KEYS` and `ARGV`

Pass key names separately from ordinary arguments:

```bash
redis-cli --eval script.lua key1 key2 , arg1 arg2
```

Inside the script:

```lua
local value = redis.call('GET', KEYS[1])
```

Use `KEYS` for actual Redis keys so cluster-aware validation/routing can reason about key access. Do not generate arbitrary undisclosed cross-slot keys inside a cluster script.

## 3. `redis.call` vs. `redis.pcall`

- `redis.call` propagates command errors out of the script;
- `redis.pcall` returns an error value that the script can inspect.

## 4. Atomic Does Not Mean Free

While a script runs, other commands that need the same execution path cannot interleave with it. Long scripts therefore create latency for unrelated clients.

Keep scripts short and computationally bounded. Do not perform large scans or unbounded loops simply because the work is server-side.

## 5. `EVAL` and `EVALSHA`

`EVALSHA` refers to a script already cached by digest. Clients must handle cache misses (`NOSCRIPT`) and reload/retry appropriately.

Script-cache residency is not a durability contract.

## 6. Redis Cluster

All keys accessed by an atomic script normally need compatible slot placement. Hash tags can deliberately colocate related keys.

## 7. Redis Functions

Modern Redis also supports server-side Functions, which provide a managed library model that can be preferable to repeatedly shipping ad-hoc scripts. Choose based on target Redis version and operational model.

## 8. Use Cases

Good scripting candidates include:

- compare-and-delete lock release;
- token-bucket/sliding-window rate limit updates;
- conditional counters;
- atomic multi-structure updates within one shard.