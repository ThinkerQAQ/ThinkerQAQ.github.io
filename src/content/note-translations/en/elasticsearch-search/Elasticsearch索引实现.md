---
title: "How Elasticsearch Indexing Works"
description: "Lucene inverted indexes, terms, postings, doc values, segments, and the distinction between search and aggregation data structures."
translationOf: "elasticsearch-search/Elasticsearch索引实现"
language: "en"
updatedAt: "2026-09-15T06:05:00Z"
---

Full-text search is powered primarily by Lucene's inverted-index structures: analyzed terms map to postings describing matching documents and related information needed for scoring/positions depending on field configuration.

Column-oriented `doc_values`-style storage supports sorting/aggregations for many field types. Stored source/fields serve different retrieval purposes.

Lucene segments are immutable, which enables efficient search snapshots but requires new segments plus merges for updates/deletes. Field mapping choices directly affect which structures are built and therefore index size/performance.