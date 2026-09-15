---
title: "Elasticsearch CRUD Flow"
description: "How Elasticsearch routes document writes and reads through shards, replicas, refresh visibility, and durability mechanisms."
translationOf: "elasticsearch-search/Elasticsearch CRUD流程"
language: "en"
updatedAt: "2026-09-15T06:05:00Z"
---

A document operation is routed to a shard from the document routing value, commonly derived from `_id`. The coordinating node forwards a write to the current primary shard, which applies the operation and replicates it according to the index's replication/acknowledgment policy.

Search/get behavior differs: real-time GET can use shard-level recent state, while search visibility depends on refresh. A successful write response therefore does not mean the document is already visible to every search request.

Replication, primary terms, sequence numbers, and recovery details have evolved across Elasticsearch versions. The durable model is **route → primary sequencing → replica application → durability/refresh visibility**.