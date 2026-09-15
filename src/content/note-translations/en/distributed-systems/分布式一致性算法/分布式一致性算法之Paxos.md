---
title: "3.1 Paxos"
description: "Basic Paxos roles and two-phase decision flow, why contention is expensive, and how Multi-Paxos uses a stable leader to make repeated consensus practical."
translationOf: "distributed-systems/分布式一致性算法/分布式一致性算法之Paxos"
language: "en"
updatedAt: "2026-09-15T03:30:00Z"
---

## 1. Basic Paxos

### 1.1 What Is Paxos?

Paxos is a family of consensus protocols introduced by Leslie Lamport. It provides a way for distributed participants to agree on a value even when messages are delayed and some nodes fail.

### 1.2 Roles

- **Client**: requests an operation.
- **Proposer**: proposes a value.
- **Acceptor**: votes on proposals and preserves the protocol's safety state.
- **Learner**: learns the value that has been chosen.

### 1.3 Two Main Phases

#### Phase 1: Prepare / Promise

1. A proposer chooses a proposal number `N` and sends a prepare request to acceptors.
2. An acceptor that has not already promised a higher proposal number promises not to accept lower-numbered proposals.
3. The acceptor also reports any value it has already accepted with the highest accepted proposal number.

#### Phase 2: Accept / Accepted

1. After receiving promises from a quorum, the proposer chooses the value required by the Paxos safety rule and sends an accept request.
2. Acceptors accept the proposal if doing so does not violate a higher promise.
3. Once a quorum accepts the value, the value is chosen and can be learned by the system.

A quorum is normally a majority, which ensures that any two quorums intersect.

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200203143857.png)

### 1.4 Practical Problems with Basic Paxos

#### Competing Proposers

Multiple proposers can repeatedly pre-empt one another with higher proposal numbers. Safety is preserved, but progress can suffer without an effective leader or backoff strategy.

#### Latency

A fresh Basic Paxos decision requires multiple message exchanges and durable state transitions. Repeating the full preparation phase for every log entry is expensive.

## 2. Multi-Paxos

Multi-Paxos commonly establishes a stable leader for a sequence of log entries. Once leadership is stable, repeated proposals can usually skip the full prepare phase, reducing coordination overhead.

The leader approach also reduces contention because clients do not continuously compete as independent proposers for each entry.

## 3. Fast Paxos

Fast Paxos is a further variant designed to reduce message-delay paths in favorable cases at the cost of more complex quorum and conflict handling.

## 4. References

- [Paxos — 凤凰架构](http://icyfenix.cn/distribution/consensus/paxos.html)
- [Raft and Multi-Paxos — 凤凰架构](http://icyfenix.cn/distribution/consensus/raft.html)
