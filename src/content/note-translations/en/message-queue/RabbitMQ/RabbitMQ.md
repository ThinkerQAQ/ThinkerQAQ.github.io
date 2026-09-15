---
title: "3. RabbitMQ"
description: "RabbitMQ fundamentals: exchanges, queues, bindings, routing, acknowledgements, publisher confirms, and modern quorum-queue high availability."
translationOf: "message-queue/RabbitMQ/RabbitMQ"
language: "en"
updatedAt: "2026-09-15T06:55:00Z"
---

## 1. What Is RabbitMQ?

RabbitMQ is a message broker centered on queues and flexible message routing, commonly through AMQP 0-9-1 exchanges and bindings.

A simplified path is:

```text
publisher → exchange → binding/routing → queue → consumer
```

## 2. Why Choose RabbitMQ?

RabbitMQ is strong when an application needs:

- work queues;
- flexible routing rules;
- per-message acknowledgement/redelivery;
- dead-lettering;
- request/reply or task distribution;
- relatively direct broker-managed delivery rather than retained event-log replay.

## 3. Reliability

Publisher confirms, durable/replicated queues, persistent messages, and manual consumer acknowledgements address different failure boundaries.

See [RabbitMQ Message Reliability](/en/notes/message-queue/RabbitMQ/RabbitMQ%E6%B6%88%E6%81%AF%E7%9A%84%E5%8F%AF%E9%9D%A0%E6%80%A7/).

## 4. High Availability

For modern RabbitMQ, quorum queues are the primary replicated durable queue model for many HA workloads. Historical mirrored classic queues should not be the default new recommendation.

See [RabbitMQ Clustering and Quorum Queues](/en/notes/message-queue/RabbitMQ/RabbitMQ%E9%9B%86%E7%BE%A4%E6%A8%A1%E5%BC%8F/).