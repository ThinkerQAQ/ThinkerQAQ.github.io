---
title: "Elasticsearch Flush"
description: "What a flush does to Lucene commits and the transaction log, and how it differs from refresh."
translationOf: "elasticsearch-search/Elasticsearch flush"
language: "en"
updatedAt: "2026-09-15T06:05:00Z"
---

A flush creates a durable Lucene commit point for shard index state and allows older transaction-log generations to be retired according to Elasticsearch recovery rules.

Flush is **not** the same as refresh. Refresh makes recently indexed data searchable by opening new search-visible segments/readers; flush is primarily a persistence/recovery boundary.

Elasticsearch normally manages flushing automatically. Manually forcing frequent flushes can add I/O and segment-management cost, so use it only for a concrete operational reason.