---
title: "ZooKeeper Atomic Broadcast (ZAB)"
description: "ZooKeeper's leader-based atomic broadcast protocol, proposal ordering, quorum acknowledgment, recovery, and its distinction from Paxos/Raft."
translationOf: "zookeeper/原理/ZAB协议"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

ZAB is ZooKeeper's leader-based atomic broadcast protocol for totally ordering state-changing transactions and recovering safely across leader changes.

A leader establishes an epoch/leadership context, proposes ordered updates, collects quorum acknowledgments, commits them, and followers apply the committed order. Recovery synchronizes histories before normal broadcast resumes.

ZAB is related to the consensus/replicated-state-machine problem family but should not be described simply as “Paxos” or “Raft”. Its terminology and recovery protocol are ZooKeeper-specific.