---
title: "3.1 RabbitMQ Routing and Usage"
description: "RabbitMQ exchanges, bindings, queues, direct/fanout/topic routing, work queues, acknowledgements, prefetch, and dead-letter patterns."
translationOf: "message-queue/RabbitMQ/RabbitMQ使用"
language: "en"
updatedAt: "2026-09-15T06:55:00Z"
---

## 1. Data Flow

Publishers normally send messages to an **exchange**. Bindings route matching messages from the exchange into queues. Consumers receive from queues.

The default exchange can route directly to a queue by queue name.

## 2. Exchange Types

### Direct

Route when the message routing key exactly matches a binding key.

### Fanout

Broadcast to every queue bound to the exchange, ignoring the routing key.

### Topic

Route using wildcard patterns in routing keys, useful for hierarchical event categories such as:

```text
order.created.eu
order.cancelled.us
```

### Headers

Routing can also be based on message headers rather than the routing key.

## 3. Work Queues

Multiple consumers can compete for messages from one queue. RabbitMQ distributes deliveries among active consumers subject to channel prefetch/credit and availability.

Configure prefetch so a slow worker does not accumulate an excessive number of unacked messages.

## 4. Acknowledgements

Use manual acknowledgements when work must not be considered complete until processing succeeds.

Failures can lead to redelivery, so consumers should be idempotent.

## 5. Dead Lettering

Rejected, expired, or otherwise dead-lettered messages can be routed to another exchange/queue for bounded retry, debugging, or manual remediation.

Avoid infinite immediate requeue loops.