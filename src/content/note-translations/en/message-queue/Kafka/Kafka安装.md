---
title: "Kafka Installation and Local Setup"
description: "A version-neutral Kafka local setup guide that distinguishes modern KRaft deployments from historical ZooKeeper-based instructions."
translationOf: "message-queue/Kafka/Kafka安装"
language: "en"
updatedAt: "2026-09-15T06:55:00Z"
---

## 1. Use a Current Supported Kafka Release

Kafka installation procedures changed substantially with the move from ZooKeeper-based metadata to KRaft.

For a new local environment, follow the setup bundled with the exact Kafka release you are running and use KRaft unless you are intentionally studying a historical ZooKeeper deployment.

## 2. Local Development Options

Typical choices are:

- Kafka's distribution scripts;
- containers / Docker Compose;
- a managed Kafka-compatible development environment.

Pin explicit versions so client/broker behavior is reproducible.

## 3. Minimum Verification

After starting the broker/controller configuration:

1. create a test topic;
2. publish several records;
3. consume them from a new consumer group;
4. inspect topic/partition metadata;
5. restart a broker and verify expected persistence/recovery.

## 4. Production Concerns

A production cluster additionally needs deliberate choices for:

- replication factor and ISR policy;
- storage layout and disk capacity;
- authentication/authorization/TLS;
- listener/advertised-listener networking;
- retention/compaction;
- monitoring and alerting;
- controller quorum placement;
- rolling upgrades.

Historical shell commands tied to one Kafka/ZooKeeper version should not be treated as permanent architecture.