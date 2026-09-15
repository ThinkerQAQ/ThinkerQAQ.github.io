---
title: "Distributed Locks with ZooKeeper"
description: "Ephemeral sequential lock recipes, predecessor watches, session failure, herd avoidance, and fencing requirements."
translationOf: "zookeeper/使用/Zookeeper分布式锁"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

A scalable ZooKeeper lock recipe creates an ephemeral sequential node under a lock path. The client with the smallest sequence owns the lock; each waiter watches its immediate predecessor and retries ordering when that predecessor disappears.

This avoids the thundering-herd behavior of every waiter watching one lock node.

Session expiration releases ephemeral ownership, but distributed locks cannot stop a paused/partitioned former owner from issuing stale external writes. Use fencing/monotonic epochs where the protected resource can validate ownership, and design connection-loss/retry paths for unknown outcomes.