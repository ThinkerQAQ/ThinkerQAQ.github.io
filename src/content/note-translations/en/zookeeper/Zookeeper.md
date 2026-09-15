---
title: "ZooKeeper Overview"
description: "A replicated coordination service for small metadata, naming, membership, watches, locks, and leader-election recipes."
translationOf: "zookeeper/Zookeeper"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

Apache ZooKeeper is a replicated coordination service built around a hierarchical namespace of small znodes. Clients use it for metadata, membership, configuration coordination, leader-election recipes, and lock-like protocols.

ZooKeeper provides strong ordering/consistency properties for its coordination state, but it is not a general database for large payloads or high-volume application data.

Sessions, ephemeral nodes, watches, quorum operation, and leader/follower roles are central to its model. Recipes must still handle session expiration, connection loss, retries, duplicate outcomes, and stale clients.