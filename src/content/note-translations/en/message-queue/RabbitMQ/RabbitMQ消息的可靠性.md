---
title: "3.2 RabbitMQ Message Reliability"
description: "Publisher confirms, durable queues, persistent messages, quorum queues, consumer acknowledgements, redelivery, and why end-to-end idempotency is still required."
translationOf: "message-queue/RabbitMQ/RabbitMQ消息的可靠性"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

## 1. Reliability Boundaries

A message can be lost or duplicated around:

1. publisher → broker;
2. broker persistence/replication;
3. broker → consumer;
4. consumer side effect → acknowledgement.

RabbitMQ features address these boundaries separately.

## 2. Publisher Confirms

Publisher confirms asynchronously tell the publisher whether RabbitMQ accepted responsibility for published messages under the configured routing/queue durability semantics.

They are generally preferable to AMQP transactions for high-throughput publishing.

A timeout/connection loss before confirmation creates an uncertain outcome; retry may duplicate a message, so message IDs/idempotency still matter.

## 3. Durable Queues and Persistent Messages

A durable queue survives broker restart as an entity. Persistent messages request durable storage behavior.

Both are needed for classic durable messaging, but strong availability also depends on replicated queue type and cluster setup.

## 4. Quorum Queues

Modern RabbitMQ commonly recommends **quorum queues** for replicated durable queues. They use a Raft-based replicated log and replace many historical mirrored-classic-queue HA use cases.

## 5. Consumer Acknowledgements

With manual acknowledgements, RabbitMQ can redeliver an unacked message after a consumer/channel/connection fails.

This gives at-least-once behavior: a consumer may process the message and crash before ACK, causing duplicate redelivery.

Therefore consumer side effects should be idempotent.

## 6. Poison Messages

Bound retries and route permanently failing messages to a dead-letter workflow. Infinite immediate requeue can create a hot failure loop.