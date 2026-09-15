---
title: "Elasticsearch Concurrency Control"
description: "Optimistic concurrency using sequence numbers and primary terms, plus idempotent update and retry design."
translationOf: "elasticsearch-search/Elasticsearch并发控制"
language: "en"
updatedAt: "2026-09-15T06:05:00Z"
---

Concurrent writers can overwrite each other's logical updates if application code performs a read-modify-write cycle without a concurrency condition.

Modern Elasticsearch exposes optimistic concurrency using operation sequence number and primary term. A write can require the document to still match the observed version state; otherwise it fails with a conflict and the application can recompute/retry deliberately.

Retries must re-read/recompute when business semantics require it. Blindly retrying a stale write can preserve the lost-update bug under a different name.