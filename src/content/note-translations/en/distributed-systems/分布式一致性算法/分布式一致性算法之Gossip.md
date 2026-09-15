---
title: "3.4 Gossip"
description: "How gossip protocols spread information through randomized peer-to-peer exchanges, why they scale well, and the redundancy and convergence trade-offs they introduce."
translationOf: "distributed-systems/分布式一致性算法/分布式一致性算法之Gossip"
language: "en"
updatedAt: "2026-09-15T03:30:00Z"
---

## 1. What Is Gossip?

A gossip protocol spreads information through repeated peer-to-peer exchanges. Each node periodically communicates with one or more peers, and information propagates through the cluster in a way similar to an epidemic.

Gossip-style protocols are widely used for membership, failure detection, metadata propagation, and eventually disseminating state across large clusters.

## 2. Basic Workflow

1. Each node periodically selects one or more peers, often randomly.
2. The peers exchange state, summaries, or updates.
3. A node that learns new information can pass it to other peers in later rounds.
4. After enough rounds, the information is expected to reach most or all healthy nodes.

## 3. Advantages

- decentralized operation;
- no single coordinator for ordinary dissemination;
- good scalability for large clusters;
- natural tolerance of transient message loss because information is repeatedly retransmitted through different paths.

## 4. Trade-offs

### 4.1 Redundant Messages

Randomized spreading intentionally creates redundancy. A node may receive the same information multiple times, consuming extra network and processing resources.

### 4.2 Convergence Delay

Information does not arrive everywhere at once. During propagation, different nodes can temporarily hold different views of the system.

Gossip therefore should not be confused with a consensus protocol such as Raft or Paxos. Gossip is primarily a dissemination mechanism; additional rules are needed when the system requires a single authoritative decision.

## 5. Reference

- [Gossip 协议 — 凤凰架构](http://icyfenix.cn/distribution/consensus/gossip.html)
