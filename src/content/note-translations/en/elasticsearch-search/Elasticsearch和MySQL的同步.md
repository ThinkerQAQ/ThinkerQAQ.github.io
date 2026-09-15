---
title: "Synchronizing MySQL to Elasticsearch"
description: "Reliable change propagation from a relational source of truth into a search index using CDC/outbox/replayable pipelines."
translationOf: "elasticsearch-search/Elasticsearch和MySQL的同步"
language: "en"
updatedAt: "2026-09-15T06:05:00Z"
---

When MySQL is the source of truth and Elasticsearch is a derived search view, avoid application-level dual writes that assume both systems will succeed atomically.

Prefer a replayable change pipeline such as CDC/binlog consumption or a transactional outbox feeding an indexer. The indexer should be idempotent, retryable, observable, and capable of rebuilding/reindexing from the source of truth.

Plan for ordering, deletes, schema changes, backfill, lag, poison events, and reconciliation. “Eventually consistent” is an operating model that needs measurable lag and repair, not just a label.