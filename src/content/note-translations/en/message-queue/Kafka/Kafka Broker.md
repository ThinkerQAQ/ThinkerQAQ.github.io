---
title: "2.6 Kafka Brokers and Replication"
description: "Kafka broker responsibilities, modern controllers, ISR/min.insync.replicas, producer acknowledgements, leader election, and durability trade-offs."
translationOf: "message-queue/Kafka/Kafka Broker"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

## 1. Broker

A Kafka broker stores partition logs, serves produce/fetch requests, and participates in replication.

A cluster distributes partition leaders/followers across brokers.

## 2. Controller

In modern KRaft Kafka, controller nodes form a metadata quorum and one active controller coordinates metadata changes such as partition leadership and assignments.

ZooKeeper `/controller` election is historical for older Kafka architectures.

## 3. Producer `acks`

The durable meaning of a successful producer send depends on acknowledgement configuration.

### `acks=0`

Producer does not wait for broker acknowledgement. Highest uncertainty/loss risk.

### `acks=1`

Partition leader acknowledges after accepting/appending locally under Kafka's log semantics. A leader failure before replication can lose the record.

### `acks=all` (`-1`)

Leader waits for acknowledgement conditions involving the current in-sync replica set and `min.insync.replicas`.

It is inaccurate to define `acks=all` as "every configured replica has physically fsynced the record." Kafka durability involves page cache, replication, ISR, broker/storage failure assumptions, and configuration.

## 4. `min.insync.replicas`

With `acks=all`, this setting requires a minimum number of in-sync replicas for writes to succeed.

A common production pattern is replication factor 3 with `min.insync.replicas=2`, but requirements vary.

## 5. Unclean Leader Election

Allowing an out-of-sync replica to become leader can improve availability when ISR is lost but risks truncating committed-looking history/data loss.

For correctness-sensitive workloads, disabling unclean leader election is generally safer.

## 6. Reliability Is End-to-End

Broker replication is only one layer. Producer retry/idempotence and consumer offset/side-effect handling are also required for a reliable pipeline.