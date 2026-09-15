---
title: "2.9 Kafka Topics, Partitions, Offsets, and Replicas"
description: "Kafka topic/partition semantics, per-partition ordering, offsets, replication, ISR, high watermark, retention, and reassignment."
translationOf: "message-queue/Kafka/Kafka Topic"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

## 1. Topic and Partition

A topic is a logical event stream divided into partitions.

A partition is an append-only ordered log. Every record in a partition has an offset that identifies its position.

Kafka does not provide a single global order across multiple partitions.

## 2. Why Partitions Exist

Partitions provide:

- storage distribution across brokers;
- parallel producer/consumer throughput;
- a unit for replication and leader failover.

More partitions increase parallelism but also increase metadata, open files, replication work, and rebalance complexity.

## 3. Routing and Keys

A producer may explicitly choose a partition. Otherwise, keyed records are normally assigned deterministically so the same key tends to remain in the same partition while partition count remains stable.

Do not hard-code `hash(key) % N` as Kafka's universal current partitioner; producer partitioning algorithms have evolved and configuration matters.

## 4. Offsets and Visibility

Useful concepts include:

- **LEO** — log end offset, the next append position for a replica;
- **high watermark** — boundary up to which records are considered replicated/available under Kafka's replication model;
- **LSO (last stable offset)** — relevant for transactional reads; `read_committed` consumers do not expose records from open/aborted transactions beyond the stable boundary.

## 5. Replicas and ISR

A partition's replica assignment includes a leader and followers. The **ISR** is the set of replicas sufficiently in sync to participate in normal reliable operation/leader selection.

`replica.lag.time.max.ms` and current Kafka replication logic determine whether followers remain in ISR; old AR=ISR+OSR diagrams are a useful model but not the complete modern implementation vocabulary.

## 6. Reassignment

Partitions/replicas can be reassigned between brokers to add capacity, remove nodes, or rebalance load. Movement copies data before old replicas are removed, so reassignment consumes network/disk resources and should be throttled/observed in production.