---
title: "Kafka Benchmarking"
description: "How to benchmark Kafka producer, broker, and consumer capacity with realistic record sizes, partitions, replication, acknowledgements, compression, and end-to-end lag."
translationOf: "message-queue/Kafka/Kafka压测"
language: "en"
updatedAt: "2026-09-15T06:55:00Z"
---

## 1. Benchmark the Real Semantics

A Kafka throughput number is meaningless without:

- record size;
- partition count;
- producer count;
- compression;
- `acks` and ISR settings;
- replication factor;
- broker/storage hardware;
- network topology.

## 2. Producer Tests

Measure records/s and MB/s together with send latency/error rate. A benchmark using `acks=0` is not comparable to one requiring replicated acknowledgement.

## 3. Consumer Tests

Measure sustained consume throughput and group lag while performing realistic deserialization and downstream work.

A broker may deliver data faster than the actual application can commit to a database/API.

## 4. End-to-End Tests

The useful production metric is often:

```text
event created → durable broker append → consumer processing → side effect visible
```

Track p95/p99 delay and backlog recovery after a traffic burst or consumer outage.

## 5. Avoid Warm-Cache Illusions

Repeat tests long enough to exercise retention, page-cache turnover, replication, segment rolling, and normal background activity rather than only a short warm run.