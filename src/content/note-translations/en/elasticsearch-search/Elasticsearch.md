---
title: "Elasticsearch Overview"
description: "Distributed search and analytics built on Lucene: documents, indices, shards, replicas, inverted indexes, and near-real-time behavior."
translationOf: "elasticsearch-search/Elasticsearch"
language: "en"
updatedAt: "2026-09-15T06:05:00Z"
---

Elasticsearch is a distributed search/analytics engine built on Apache Lucene. Data is modeled as JSON-like documents stored in indices and distributed across shards with optional replicas.

Its strengths are full-text search, filtering, aggregations, and horizontally distributed query/index execution. It is not a drop-in relational database replacement: joins, transactions, uniqueness constraints, and consistency semantics differ.

Understand mappings/analyzers, shard design, refresh/durability, query execution, and lifecycle/retention before tuning low-level settings.