---
title: "1.3 Redis Persistence"
description: "Redis RDB snapshots and AOF persistence, fsync trade-offs, background rewrite/snapshot costs, recovery behavior, and what persistence does not guarantee."
translationOf: "redis-cache/Redis持久化"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. Why Persist Redis Data?

Redis primarily serves data from memory. Persistence allows a process to reconstruct state after restart and can reduce data loss after crashes.

Persistence should not be confused with replication: they protect against different failure modes.

## 2. RDB Snapshots

RDB captures a point-in-time dataset snapshot in a compact binary format.

Background snapshot creation traditionally uses a child process and copy-on-write semantics so the parent can continue serving commands. Fork and COW can still create latency/memory pressure on large instances.

RDB advantages:

- compact backup artifact;
- fast bulk restart/restore in many cases;
- useful for periodic backups.

Trade-off: changes after the latest completed snapshot may be lost.

## 3. AOF

Append Only File persistence records write operations in a log-like representation.

Fsync policy trades throughput/latency for durability:

- fsync very frequently → lower loss window, more I/O cost;
- `everysec`-style policy → common balance;
- OS-managed flushing → higher possible loss window.

Exact defaults and implementation details vary by Redis version.

## 4. AOF Rewrite

As an AOF grows, Redis can rewrite it into a smaller representation of current state rather than retaining every historical mutation.

Modern Redis releases have evolved AOF layout and rewrite internals, including multi-part AOF designs. Treat older single-file rewrite diagrams as historical implementation detail.

## 5. RDB + AOF

Redis can use both persistence mechanisms. Recovery preference and file layout depend on configuration/version.

A sensible durability plan also includes:

- replication;
- backups outside the instance;
- restore testing;
- filesystem/storage durability assumptions.

## 6. What Persistence Does Not Guarantee

Redis persistence does not automatically provide the same guarantees as a transactional database with synchronous replicated commit.

Depending on fsync and replication configuration, a client can receive success and still lose the write after a crash/failover. Design critical workflows with this failure window in mind.