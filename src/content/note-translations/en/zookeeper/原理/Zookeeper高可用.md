---
title: "ZooKeeper High Availability"
description: "Majority-quorum availability, leader failover, ensemble sizing, and why more servers do not always increase fault tolerance."
translationOf: "zookeeper/原理/Zookeeper高可用"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

ZooKeeper needs a majority quorum to make progress. An ensemble of `2f + 1` voting members can tolerate up to `f` unavailable members while retaining a majority.

Adding an even-numbered voting server often increases quorum size without increasing the number of failures tolerated; odd-sized ensembles are therefore common.

High availability also depends on independent failure domains, stable low-latency storage/networking, correct timeouts, and operational recovery. Observers/non-voting roles can serve read scalability in suitable versions/designs without changing voting quorum in the same way.