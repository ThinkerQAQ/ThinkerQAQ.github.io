---
title: "Using Elasticsearch"
description: "Core index, mapping, document, search, filter, aggregation, bulk, pagination, and alias practices."
translationOf: "elasticsearch-search/Elasticsearch使用"
language: "en"
updatedAt: "2026-09-15T06:05:00Z"
---

A practical Elasticsearch workflow is: define mappings intentionally, index documents, query with full-text or term/range filters, aggregate for analytics, and operate indices through aliases/lifecycle policies.

Use `text` for analyzed full-text fields and `keyword`-style exact values where appropriate. Prefer bulk APIs for high-volume ingestion and bounded batch sizes.

Deep offset pagination can become expensive; use search-after/PIT-style patterns when sequential deep pagination is required. Avoid dynamic-field explosions and unbounded cardinality in mappings/aggregations.

API syntax changes across major versions, so examples should be checked against the deployed cluster version.