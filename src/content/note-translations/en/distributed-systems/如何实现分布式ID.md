---
title: "1.3 How to Generate Distributed IDs"
description: "Design goals and trade-offs for globally unique IDs using database sequences, UUIDs, Redis counters, and Snowflake-style timestamp/worker/sequence layouts."
translationOf: "distributed-systems/如何实现分布式ID"
language: "en"
updatedAt: "2026-09-15T03:50:00Z"
---

## 1. Requirements for Distributed IDs

A distributed ID generator usually cares about several properties:

- **global uniqueness** across nodes;
- **high throughput** and low latency;
- **high availability** so ID generation does not stop the business path;
- optionally, **rough time ordering** for index locality or operational debugging;
- enough key space for the system's expected lifetime.

Do not treat predictability as an authorization boundary. If IDs are externally visible and enumeration matters, enforce access control independently.

## 2. Common Approaches

### 2.1 Database Sequence / Auto-Increment

A database can provide a strongly coordinated monotonically increasing sequence. It is simple and easy to reason about, but a central sequence can become an availability or throughput dependency. Multi-writer allocation schemes also need careful coordination when nodes are added or removed.

### 2.2 UUID

UUIDs can be generated independently without a central service. Random UUIDs such as UUIDv4 are convenient and highly scalable, but they are wider than 64-bit integer IDs and are not naturally time ordered, which can reduce locality in some indexes.

Different UUID versions encode different inputs; choose a standard version through a mature library rather than implementing UUID generation manually.

### 2.3 Redis Counter

`INCR` can provide an atomic counter. This is easy to integrate, but the Redis deployment becomes part of the ID generator's availability and recovery model. Sharding independent counters requires a collision-free allocation scheme.

### 2.4 Snowflake-Style IDs

A typical 64-bit layout combines:

- a timestamp or timestamp delta;
- a worker/datacenter identifier;
- a per-time-unit sequence number.

This allows each worker to generate IDs locally while preserving rough time ordering.

The difficult parts are operational rather than bit shifting:

- allocating unique worker IDs;
- handling clock rollback;
- dealing with sequence exhaustion within one timestamp unit;
- defining what happens when a worker is replaced or duplicated.

## 3. Selection Rule

Use the simplest generator whose failure model meets the business requirement. Central sequences favor simplicity and ordering; UUIDs favor decentralization; Snowflake-style schemes favor compact, roughly ordered IDs at the cost of worker/clock management.