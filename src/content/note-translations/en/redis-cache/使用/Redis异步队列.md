---
title: "2.4 Redis as an Asynchronous Queue"
description: "Lists, blocking pops, Pub/Sub, sorted-set delayed queues, Redis Streams, and when a dedicated message broker is the better choice."
translationOf: "redis-cache/使用/Redis异步队列"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. List-Based Queue

A simple FIFO queue can use list push/pop operations.

Blocking variants such as `BLPOP`/`BRPOP` avoid client-side sleep polling when the queue is empty.

## 2. Reliability Limits

A naive pop removes the item before processing finishes. If the consumer crashes after popping, work can be lost.

More reliable designs need acknowledgement/reclaim semantics, a processing list pattern, or preferably a primitive designed for consumer groups.

## 3. Redis Streams

For modern Redis, Streams are usually a better queue/log primitive when you need:

- retained messages;
- consumer groups;
- pending-entry tracking;
- replay;
- explicit acknowledgement.

## 4. Pub/Sub Is Different

Pub/Sub provides live fan-out but no durable offline backlog. It is appropriate for ephemeral notifications, not durable job delivery.

## 5. Delayed Queue

A sorted set can store execution timestamps as scores. Consumers fetch/claim due items.

Correct concurrent claiming requires atomic logic so two workers do not execute the same item unintentionally.

## 6. When to Use a Broker

Use Kafka, RabbitMQ, Pulsar, cloud queues, or another dedicated broker when retention, replay, partitioned throughput, dead-letter handling, delivery guarantees, or long-lived event history are core requirements.