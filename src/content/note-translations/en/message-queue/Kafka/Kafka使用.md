---
title: "Kafka Usage Guide"
description: "A compact Kafka workflow for topics, producers, consumers, groups, offsets, and administration without freezing the note to one old CLI syntax."
translationOf: "message-queue/Kafka/Kafka使用"
language: "en"
updatedAt: "2026-09-15T06:55:00Z"
---

## 1. Basic Workflow

A minimal Kafka workflow is:

1. create/configure a topic;
2. produce keyed or unkeyed records;
3. consume through a consumer group;
4. inspect group lag and committed offsets;
5. adjust partitions/retention only with an understanding of the semantic impact.

## 2. Topic Operations

Administrative tools can create, describe, alter, and delete topics.

Important topic properties include:

- partition count;
- replication factor;
- retention;
- cleanup policy (`delete`, `compact`, or both);
- message-size limits.

Increasing partition count changes future key-to-partition mapping for common partitioners, so do not treat it as a purely operational change for keyed ordering.

## 3. Producers

Production code should configure serializers, acknowledgement/idempotence behavior, batching/compression, retries, and delivery/error callbacks explicitly.

## 4. Consumers

Consumers should use stable `group.id` values, understand auto-offset-reset behavior, and choose an offset commit strategy tied to actual processing semantics.

Monitor consumer lag as a first-class signal.

## 5. CLI Commands Are Version-Sensitive

Kafka CLI flags and script names have changed over releases. Use this note for the workflow model and consult the command help/documentation packaged with the deployed Kafka version for exact syntax.