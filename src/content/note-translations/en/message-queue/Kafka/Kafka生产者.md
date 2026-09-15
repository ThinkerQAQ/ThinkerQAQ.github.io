---
title: "2.5 Kafka Producers"
description: "Kafka producer batching, serialization, partitioning, acknowledgements, retries, idempotent production, transactions, and their exact scope."
translationOf: "message-queue/Kafka/Kafka生产者"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

## 1. Producer Pipeline

A producer serializes records, chooses a partition, batches data in client memory, and asynchronously sends batches to partition leaders.

Batching/compression are central to Kafka throughput because they amortize request and storage overhead.

## 2. Partitioning

An explicit partition wins. A key normally provides deterministic affinity so records for the same key land together, supporting per-key ordering.

For unkeyed records, modern Kafka producer partitioning behavior is implementation/version-sensitive; old descriptions of permanent round-robin should not be treated as universal.

## 3. Retries Can Create Duplicates

If a broker writes a record but the acknowledgement is lost, the producer may retry because it cannot distinguish "write failed" from "reply failed."

That is the classic at-least-once uncertainty.

## 4. Idempotent Producer

Kafka idempotent production assigns producer identity/sequence metadata so broker-side logic can suppress duplicate retries within the supported producer/session/partition semantics.

Modern Kafka clients enable/configure idempotence defaults differently by version; verify the current client configuration rather than copying old required-option lists blindly.

Idempotence does not deduplicate two unrelated business requests that happen to contain the same payload.

## 5. Transactions

A transactional producer can atomically publish to multiple Kafka partitions and can combine consumed offsets with produced records in Kafka consume-transform-produce pipelines.

Consumers using `read_committed` hide aborted/uncommitted transaction records.

This **Kafka exactly-once scope does not automatically include an external MySQL/API side effect**. Cross-system exactly-once requires idempotency or a coordination pattern such as outbox/CDC.

## 6. Reliability

For strong Kafka-side durability, combine appropriate:

- `acks=all`;
- replication factor / ISR policy;
- retries;
- idempotence;
- error callbacks/monitoring.

A producer should treat an unrecoverable or timeout result as **unknown outcome** unless the API can prove otherwise.