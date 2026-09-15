---
title: "3.2 ZAB"
description: "An entry point to ZooKeeper Atomic Broadcast (ZAB), ZooKeeper's leader-based protocol for ordered, reliable state updates."
translationOf: "distributed-systems/分布式一致性算法/分布式一致性算法之ZAB"
language: "en"
updatedAt: "2026-09-15T03:50:00Z"
---

ZAB (ZooKeeper Atomic Broadcast) is the leader-based atomic-broadcast protocol used by ZooKeeper to order and replicate state-changing transactions.

The detailed note lives in the ZooKeeper collection:

- [ZAB Protocol](/en/notes/zookeeper/%E5%8E%9F%E7%90%86/ZAB%E5%8D%8F%E8%AE%AE/)

At a high level, ZAB combines leader election/recovery with an ordered broadcast phase so a quorum agrees on the transaction history used by the ZooKeeper state machine.