---
title: "4.3 Redis Replication"
description: "Redis primary-replica replication, full and partial synchronization, replication backlog, stale replica reads, and asynchronous failure semantics."
translationOf: "redis-cache/分布式/Redis Replication"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. Purpose

Redis replication keeps replicas of a primary dataset on other Redis instances.

It supports:

- failover foundations;
- read scaling for workloads that tolerate stale reads;
- additional copies for operational recovery.

## 2. Asynchronous Replication

Normal Redis replication is asynchronous: a primary can acknowledge a write before every replica has processed it.

Consequences:

- replica reads may lag;
- failover may lose acknowledged writes that had not reached the promoted replica;
- replication alone does not provide linearizable or synchronously durable writes.

Commands such as `WAIT` can improve acknowledgement properties for specific workflows but do not transform Redis into a consensus-replicated database.

## 3. Initial / Full Synchronization

When a replica cannot continue from an existing replication history, the primary provides a full dataset transfer, traditionally based on an RDB snapshot plus buffered incremental changes.

## 4. Partial Resynchronization

Redis maintains replication IDs/offsets and a replication backlog. If a disconnected replica reconnects soon enough and the needed history remains available, it can receive only missing changes rather than a full copy.

## 5. Read Scaling

Replicas can serve reads, but an application must decide whether stale data is acceptable.

Do not route read-after-write or correctness-critical reads to arbitrary replicas unless the consistency model explicitly allows it.

## 6. Failover

Plain replication does not itself coordinate automatic primary selection. Sentinel or Redis Cluster adds failure detection and promotion logic.