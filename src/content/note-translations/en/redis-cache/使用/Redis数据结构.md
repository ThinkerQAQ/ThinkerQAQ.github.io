---
title: "2.3 Redis Data Structures"
description: "Stable Redis data-type semantics and use cases, with version-sensitive internal encodings separated from the public model."
translationOf: "redis-cache/使用/Redis数据结构"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. Keys and Values

Redis keys are binary-safe strings. Values are typed data structures whose public semantics are more durable than their internal encoding.

Internal implementations such as SDS, dict tables, listpacks, quicklists, intsets, and skiplists evolve between Redis versions. Application design should depend on command semantics and documented complexity, not one historical struct layout or threshold.

## 2. Strings

Strings store binary-safe byte sequences and integer-like values.

Common uses:

- cached serialized objects;
- counters with `INCR`/`DECR`;
- tokens and sessions;
- lock ownership values;
- compact flags/bitmaps.

## 3. Hashes

Hashes map fields to values under one Redis key.

They work well for moderately sized object-like records where fields are accessed independently.

## 4. Lists

Lists are ordered sequences supporting efficient operations at their ends.

Typical uses include work lists, recent-item feeds, or simple queues, although Redis Streams are often a better fit when durable consumer-group semantics are needed.

## 5. Sets

Sets store unique unordered members and support membership and set algebra such as intersection and union.

Common uses:

- tags;
- unique-membership tracking;
- relationships;
- deduplication where exact membership is required.

## 6. Sorted Sets

Sorted sets map unique members to scores while maintaining score order.

Typical uses:

- leaderboards;
- time/rank indexes;
- delayed scheduling structures.

Their implementation supports efficient logarithmic insertion/removal and range queries.

## 7. Bitmaps and Probabilistic Structures

Bit operations on strings can efficiently represent dense boolean state. Bloom filters trade false positives for much lower memory usage when exact membership is not required.

## 8. Streams

Modern Redis Streams provide an append-only log abstraction with IDs, range reads, blocking reads, and consumer groups. They should be considered separately from classic lists/pub-sub because delivery and retention semantics differ.

## 9. Design Rule

Choose a Redis type by the operations you need, not by how its internals happen to be encoded in one release. Also consider element count and payload size: a logically correct structure can still become a big-key latency problem.