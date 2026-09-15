---
title: "Elasticsearch Transaction Log"
description: "The translog's role in write durability and shard recovery before Lucene changes are safely committed."
translationOf: "elasticsearch-search/Elasticsearch translog"
language: "en"
updatedAt: "2026-09-15T06:05:00Z"
---

The transaction log records shard operations so acknowledged writes can be recovered even when the corresponding Lucene index changes have not yet been included in a durable commit.

After a crash/restart or during recovery, Elasticsearch can replay required operations in addition to using Lucene segment state.

Durability/fsync behavior is configurable and version-specific. Do not confuse translog durability with search visibility: refresh and translog/flush solve different problems.