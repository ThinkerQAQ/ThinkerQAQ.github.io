---
title: "Elasticsearch Segment Merging"
description: "Why immutable Lucene segments are merged, how deletes are reclaimed, and the I/O/CPU trade-offs."
translationOf: "elasticsearch-search/Elasticsearch merge"
language: "en"
updatedAt: "2026-09-15T06:05:00Z"
---

Lucene writes immutable segments. Over time Elasticsearch/Lucene merges smaller segments into larger ones, reducing segment count and reclaiming space from deleted/updated documents whose old versions are no longer needed.

Merging consumes disk bandwidth, CPU, and temporary storage and can compete with indexing/search. The merge policy and scheduler manage that trade-off automatically.

Force-merge is mainly appropriate for read-only indices after writes have stopped; repeatedly forcing active indices can create unnecessary work and very large segments.