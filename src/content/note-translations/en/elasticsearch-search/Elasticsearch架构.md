---
title: "Elasticsearch Architecture"
description: "Cluster nodes, indices, primary/replica shards, coordination, routing, distributed search, and recovery."
translationOf: "elasticsearch-search/Elasticsearch架构"
language: "en"
updatedAt: "2026-09-15T06:05:00Z"
---

An Elasticsearch index is partitioned into primary shards; replica copies provide redundancy and additional read capacity. Shards are Lucene indexes distributed across cluster nodes.

Any suitable node can coordinate a client request. Document routing identifies the target shard for point writes/gets; searches fan out to relevant shard copies and combine partial results.

Cluster-manager/master-eligible coordination maintains cluster metadata/allocation decisions, while data nodes execute shard work. Node roles and coordination internals have changed across releases, so use role terminology/documentation matching the deployed version.