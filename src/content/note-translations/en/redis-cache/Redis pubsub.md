---
title: "1.6 Redis Pub/Sub"
description: "Redis fire-and-forget publish/subscribe semantics, pattern subscriptions, delivery limitations, and when Streams or a dedicated message broker are more appropriate."
translationOf: "redis-cache/Redis pubsub"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. Model

Redis Pub/Sub decouples publishers from currently connected subscribers through named channels.

```redis
SUBSCRIBE orders
PUBLISH orders "created"
```

A message is delivered to subscribers that are connected and subscribed at publish time.

## 2. No Durable Backlog

Classic Pub/Sub does **not** persist a replayable message backlog for disconnected consumers. If a subscriber is offline, messages published during that period are normally missed.

This makes Pub/Sub suitable for ephemeral notifications, cache invalidation hints, and live fan-out where loss is acceptable.

It is not a replacement for Kafka/RabbitMQ/Redis Streams when you require durable retention, acknowledgements, replay, consumer groups, or controlled redelivery.

## 3. Pattern Subscriptions

`PSUBSCRIBE` can subscribe by glob-style channel pattern. A client subscribed both directly and by a matching pattern can receive multiple deliveries for one publish event.

## 4. Scaling Considerations

Fan-out cost grows with subscriber/channel activity, and cluster behavior differs between classic global Pub/Sub and newer sharded Pub/Sub features.

Treat Pub/Sub as a live signaling primitive, not as a durable queue.