---
title: "4.1 Redis Cluster"
description: "Redis Cluster sharding with 16,384 hash slots, client redirection, hash tags, resharding, replica failover, and its consistency and multi-key constraints."
translationOf: "redis-cache/分布式/Redis Cluster"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. What Redis Cluster Solves

Redis Cluster shards a dataset across multiple primary nodes while providing replica-based failover.

This addresses two limits of a single-primary Sentinel topology:

- one node's memory capacity;
- one primary's write/CPU throughput.

## 2. Hash Slots

Redis Cluster divides the key space into **16,384 hash slots**.

Conceptually:

```text
slot = CRC16(key) mod 16384
```

Each primary owns a subset of slots. Cluster-aware clients map slots to nodes.

## 3. Routing

If a client sends a command to the wrong node, Redis can return a `MOVED` redirect identifying the node that owns the slot. During resharding, `ASK` redirects can be used for migrating slots.

Smart clients cache the slot map and update it as topology changes.

## 4. Hash Tags

For multi-key operations, all involved keys generally need to belong to the same slot.

A hash tag forces only the substring inside `{...}` to participate in slot hashing:

```text
{user:42}:profile
{user:42}:sessions
```

Both can land in the same slot.

## 5. Replication and Failover

Each primary can have replicas. Cluster nodes exchange failure information and can promote an eligible replica when a primary is considered failed and sufficient cluster authorization exists.

Redis Cluster's failover protocol is not Raft. It provides Redis-specific sharding/failover semantics and does not replicate a single consensus log across all masters.

## 6. Consistency Limits

Replication is normally asynchronous. Network partitions and failover can therefore lose writes that had been acknowledged by a primary but not replicated before promotion.

Redis Cluster prioritizes practical availability and sharding performance rather than strict linearizability.

## 7. Multi-Key Constraints

Operations involving multiple keys can execute atomically only when the keys are colocated appropriately. This affects transactions, Lua/functions, set operations, and rename-like commands.

## 8. Operations

Modern deployments use `redis-cli --cluster` and managed-service tooling for creation and resharding; older `redis-trib.rb` instructions are legacy.