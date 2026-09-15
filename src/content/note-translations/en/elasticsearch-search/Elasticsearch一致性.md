---
title: "Elasticsearch Consistency Semantics"
description: "Primary-replica sequencing, acknowledgment, refresh visibility, optimistic concurrency, and limits of relational-style consistency assumptions."
translationOf: "elasticsearch-search/Elasticsearch一致性"
language: "en"
updatedAt: "2026-09-15T06:05:00Z"
---

Elasticsearch orders shard writes through the current primary and propagates operations to replicas using sequence/term-based machinery in modern versions.

Three questions must be separated:

- **acknowledgment/durability**: when a write response is returned and persisted;
- **replication/recovery**: which shard copies have applied the operation;
- **search visibility**: whether a refresh has made the change searchable.

Elasticsearch also supports optimistic concurrency controls for avoiding lost updates. It does not provide the same multi-row/multi-document transactional model as a relational database.