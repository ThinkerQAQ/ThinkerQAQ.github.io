---
title: "Kafka Performance Tuning"
description: "Kafka tuning as a balance among throughput, latency, durability, batching, compression, partition count, storage, and consumer lag."
translationOf: "message-queue/Kafka/Kafka优化"
language: "en"
updatedAt: "2026-09-15T06:55:00Z"
---

## 1. Start with the Bottleneck

Kafka performance tuning should answer which resource is limiting the workload:

- producer/network RTT;
- broker CPU;
- disk throughput/latency;
- network bandwidth;
- partition leadership imbalance;
- consumer processing capacity.

Do not tune dozens of Kafka properties before measuring the limiting stage.

## 2. Producer Throughput

High-value knobs include:

- batch size and linger time;
- compression;
- producer buffer size;
- number of partitions used;
- acknowledgement/durability policy.

Larger batches improve efficiency but can increase queueing latency and memory usage.

## 3. Broker

Keep partition leaders balanced and storage healthy. Watch request queues, replication lag, ISR shrink/expand events, disk utilization, page-cache behavior, and network saturation.

Too many tiny partitions create metadata and file/replication overhead.

## 4. Consumers

Scale consumers up to useful partition parallelism, then optimize the consumer's own side effects. Adding consumers beyond partition count does not increase active partition parallelism in one group.

## 5. Durability Is a Performance Knob

Changing `acks`, ISR requirements, replication factor, fsync/storage assumptions, or unclean leader policy changes correctness—not just speed. Never call such a change an optimization without stating the failure trade-off.