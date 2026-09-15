---
title: "Leader Election with ZooKeeper"
description: "A ZooKeeper recipe for application leader election using ephemeral sequential nodes and predecessor watches."
translationOf: "zookeeper/使用/Zookeeper master选举"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

A common application leader-election recipe creates ephemeral sequential znodes under an election path. The participant owning the smallest sequence number becomes leader; others watch the immediately preceding node rather than all watching the leader.

When the predecessor disappears, a participant re-checks ordering and may become leader. Ephemeral nodes disappear when the ZooKeeper session expires, enabling failover.

Election alone does not prevent a previously isolated leader from continuing external side effects. Critical resources should use epochs/fencing tokens or another mechanism that rejects stale leaders.