---
title: "3.3 Raft"
description: "Raft's leader, follower, and candidate roles; leader election; replicated-log operation; quorum commitment; and recovery after leader failure."
translationOf: "distributed-systems/分布式一致性算法/分布式一致性算法之Raft"
language: "en"
updatedAt: "2026-09-15T03:30:00Z"
---

## 1. What Is Raft?

Raft is a consensus algorithm designed by Diego Ongaro and John Ousterhout for replicated state machines. One of its explicit goals is to make consensus easier to understand and implement than earlier presentations of Paxos-style protocols.

## 2. Roles

A Raft server is in one of three states:

- **Leader**
- **Follower**
- **Candidate**

Time is divided into monotonically increasing **terms**.

## 3. Main Workflow

### 3.1 Leader Election

1. Servers normally begin as followers.
2. If a follower does not receive valid leader communication before its randomized election timeout, it becomes a candidate, increments its term, votes for itself, and requests votes from peers.
3. A candidate that wins a majority becomes leader for that term.
4. A server that observes a valid request or response with a higher term updates its term and steps down to follower.

Voting also considers log freshness. A candidate must have a log at least as up-to-date as the voter's log according to Raft's last-log term/index rule.

### 3.2 Normal Log Replication

1. The leader receives a client command and appends it to its local log.
2. The leader sends `AppendEntries` RPCs to followers.
3. When the entry is safely replicated according to Raft's quorum and term rules, the leader advances its commit index.
4. Committed entries are applied to the state machine, and followers learn the updated commit index from the leader.

A majority quorum allows progress while preserving overlap between decisions.

### 3.3 Recovery After Failure

If the leader fails, followers stop receiving heartbeats, an election timeout expires, and a new election begins. The elected leader repairs conflicting follower logs using the log-matching rules before normal replication continues.

## 4. Key Ideas

- leader election is explicit;
- log replication normally flows from the leader to followers;
- terms identify leadership epochs;
- the replicated log uses indexes plus terms to detect and repair inconsistencies;
- majority quorums preserve safety across leader changes.

## 5. References

- [Raft Consensus Algorithm](https://raft.github.io/)
- [The Secret Lives of Data: Raft](http://thesecretlivesofdata.com/raft/)
