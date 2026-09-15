---
title: "1.1 Redis"
description: "Redis as an in-memory data-structure server: execution model, data types, memory management, persistence, replication, high availability, clustering, and common system-design uses."
translationOf: "redis-cache/Redis"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. What Is Redis?

Redis is an in-memory data-structure server commonly used for caching, coordination, counters, queues, rate limiting, session state, and other low-latency workloads.

It is often described as a key-value database, but the value side supports rich structures such as strings, hashes, lists, sets, sorted sets, streams, bitmaps, and probabilistic structures/modules depending on the Redis distribution.

## 2. Why Redis Is Fast

Performance comes from several properties working together:

- the active dataset is usually served from memory;
- commands use purpose-built data structures;
- command execution avoids broad shared-memory locking in the main execution path;
- event-driven network I/O handles many clients efficiently;
- pipelining and batching reduce network round trips.

"Redis is fast because it is single-threaded" is incomplete. Modern Redis also uses background threads and can use threaded network I/O; the durable property is that command execution for a given shard is largely serialized, which simplifies atomic command semantics.

## 3. Core Topics

- [Data Structures](/en/notes/redis-cache/%E4%BD%BF%E7%94%A8/Redis%E6%95%B0%E6%8D%AE%E7%BB%93%E6%9E%84/)
- [Memory Management](/en/notes/redis-cache/%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86/Redis%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86/)
- [Persistence](/en/notes/redis-cache/Redis%E6%8C%81%E4%B9%85%E5%8C%96/)
- [Transactions](/en/notes/redis-cache/Redis%E4%BA%8B%E5%8A%A1/)
- [Lua Scripting](/en/notes/redis-cache/Redis%20Lua/)
- [Pipelining](/en/notes/redis-cache/Redis%20pipeline/)

## 4. Distributed Redis

Redis replication provides copies of data; Sentinel adds automatic failover for a primary/replica deployment; Redis Cluster adds sharding across 16,384 hash slots plus replica-based failover.

These mechanisms improve availability and capacity, but they do not turn Redis into a linearizable, lossless distributed database under every failure mode. Replication is normally asynchronous, so failover can lose acknowledged writes that had not reached a replica.

## 5. System-Design Uses

Redis is especially useful when the workload tolerates the semantics of an in-memory system and benefits from very low latency.

Typical patterns include:

- cache-aside/read-through caching;
- counters and leaderboards;
- expiring session/token state;
- distributed rate limiting;
- short-lived coordination and locks;
- stream/queue-like workflows.

For critical source-of-truth data, decide explicitly what persistence, replication, and failure semantics are required rather than assuming "Redis + persistence" is equivalent to a transactional database.