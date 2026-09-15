---
title: "2.2 Kafka Introduction"
description: "Kafka as a distributed durable event log for messaging, storage, replay, and stream processing."
translationOf: "message-queue/Kafka/Kafka介绍"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

## 1. What Is Kafka?

Apache Kafka is a distributed event-streaming platform built around durable partitioned logs.

It can serve as:

- a message/event backbone;
- a retained log that consumers can replay;
- an integration source/sink platform;
- infrastructure for stream processing.

## 2. Core Model

Producers append records to **topics**. A topic is split into **partitions**. Each partition is an ordered append-only log with offsets.

Consumers read partitions and track their positions. Consumer groups let multiple consumer instances divide partition ownership while independent groups consume the same topic history separately.

## 3. Why Kafka Scales

- partitioned parallelism;
- sequential log append;
- batching/compression;
- efficient page-cache/network transfer;
- replicated partitions for availability.

## 4. What Kafka Does Not Give Automatically

Kafka does not guarantee one global total order across all partitions.

"Exactly once" features have a defined Kafka transactional scope; they do not make arbitrary external database/API side effects exactly once without coordinating those systems.

## 5. Modern Architecture

Current Kafka uses the **KRaft** metadata quorum instead of requiring ZooKeeper. Older notes and deployments may describe ZooKeeper-based controller election; treat that as historical architecture.