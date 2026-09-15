---
title: "2.4 Kafka Architecture"
description: "Kafka producers, partition leaders/followers, brokers, consumers, KRaft metadata quorum, replication, failover, and partitioned scaling."
translationOf: "message-queue/Kafka/Kafka架构"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

## 1. Data Plane

A Kafka data path is:

```text
Producer → partition leader on a broker → replicas
                                      ↓
                                  Consumers
```

Records are organized into topics and partitions. Producers select partitions; consumer groups divide partitions among members.

## 2. Metadata / Control Plane

Modern Kafka uses **KRaft**: a quorum of controller nodes maintains cluster metadata through a replicated metadata log.

Older Kafka releases used ZooKeeper and elected one broker as the active controller. That architecture remains relevant when reading historical notes but is no longer the baseline for new Kafka deployments.

## 3. Partition Replication

Each partition has one leader and zero or more follower replicas.

Producers normally write to the leader. Followers fetch the leader's log and remain eligible for leader election while sufficiently caught up according to Kafka's replication rules.

## 4. Failure

If a broker/partition leader fails, the controller coordinates a new eligible leader and publishes updated metadata to brokers/clients.

Availability depends on replication factor, in-sync replicas, `min.insync.replicas`, producer `acks`, and whether unclean leader election is permitted.

## 5. Partitioning

Partitioning is Kafka's main unit of parallelism:

- producer writes can scale across partition leaders;
- brokers distribute partition storage/traffic;
- a consumer group can process partitions in parallel up to its useful partition count.

The trade-off is that order is naturally defined **within a partition**, not across the whole topic.