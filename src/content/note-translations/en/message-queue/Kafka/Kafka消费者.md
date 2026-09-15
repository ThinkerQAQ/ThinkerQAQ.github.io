---
title: "2.7 Kafka Consumers and Consumer Groups"
description: "Kafka consumer groups, partition assignment, offsets, rebalancing, at-least-once processing, idempotency, and modern cooperative rebalancing considerations."
translationOf: "message-queue/Kafka/Kafka消费者"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

## 1. Consumer Groups

Each consumer group represents an independent logical subscription to a topic.

Within one group, a partition is actively assigned to at most one consumer member at a time. Therefore useful parallelism for one topic/group is bounded by partition count.

Different groups can independently consume the same records.

## 2. Offsets

A consumer's **position** is the next record it will fetch/process. A **committed offset** is the recovery checkpoint stored by the group, normally in Kafka's `__consumer_offsets` internal topic.

Committing an offset does not mean an external database side effect is atomically committed with it.

## 3. At-Least-Once Pattern

A common safe ordering is:

1. consume record;
2. perform idempotent side effect;
3. commit offset.

If the process crashes after step 2 but before step 3, the message is replayed. Therefore the consumer must tolerate duplicates.

Committing first can produce at-most-once behavior and lose work if processing fails afterward.

## 4. Rebalancing

Group membership, subscribed partitions/topics, session failures, or topology changes can trigger partition reassignment.

Modern Kafka supports assignment protocols/strategies that can reduce full stop-the-world movement, including cooperative approaches. Old "every rebalance stops all consumers and loses state" descriptions are too absolute.

Consumers should still handle partition revocation/assignment carefully and commit/checkpoint state consistently.

## 5. Assignment Strategies

Kafka supports multiple strategies (range, round-robin, sticky/cooperative variants depending on client/version). Choose based on balance, movement cost, and subscription shape rather than assuming one historical default forever.

## 6. Idempotency

Ways to make side effects idempotent include:

- database unique keys/message IDs;
- entity version/state transition checks;
- upserts;
- inbox/dedup tables.

A Redis dedup set can help for bounded/ephemeral cases but should not be the only correctness proof if its data can expire or be lost.