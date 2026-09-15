---
title: "Elasticsearch Refresh"
description: "Near-real-time search visibility, refresh intervals, and why refresh is not a durability guarantee."
translationOf: "elasticsearch-search/Elasticsearch refresh"
language: "en"
updatedAt: "2026-09-15T06:05:00Z"
---

A refresh makes recent index changes available to search by opening a new search-visible Lucene view/segment state. This is why Elasticsearch is described as near-real-time rather than instantly search-consistent after every write.

Refresh does not by itself guarantee durable persistence to disk; durability is handled through transaction-log/Lucene commit mechanisms.

Lowering the refresh interval increases search freshness but can increase segment creation/merge overhead. Tune freshness against indexing throughput and query requirements.