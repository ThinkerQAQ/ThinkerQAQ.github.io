---
title: "1.7 CAP"
description: "The CAP theorem: consistency, availability, partition tolerance, and the C/A trade-off a distributed system faces when a network partition occurs."
translationOf: "distributed-systems/CAP"
language: "en"
updatedAt: "2026-09-15T03:30:00Z"
---

## 1. Why CAP Matters

A distributed system stores or processes state on multiple networked nodes. Once communication between those nodes can fail, the system must define what clients observe while the nodes cannot coordinate.

## 2. What Is CAP?

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230170010.png)

CAP describes three properties:

### 2.1 C — Consistency

In the CAP sense, consistency means clients observe a single, up-to-date view of the data. A successful write should not be followed by a read that returns an older value simply because that read reached another replica.

#### Example

Suppose regions A and B both hold value `X = v0`. A client writes `X = v1` to region A. A consistency-preserving system must prevent a subsequent successful read from B from returning the stale `v0` as if it were current.

#### Cost

Maintaining this property requires coordination between replicas. Coordination can increase latency and, during failures, may require rejecting or delaying operations.

#### Related Model

[Distributed Consistency Models](/en/notes/distributed-systems/%E5%88%86%E5%B8%83%E5%BC%8F%E4%B8%80%E8%87%B4%E6%80%A7%E7%AE%97%E6%B3%95/%E5%88%86%E5%B8%83%E5%BC%8F%E4%B8%80%E8%87%B4%E6%80%A7%E6%A8%A1%E5%9E%8B/)

### 2.2 A — Availability

Availability means every request received by a non-failing node eventually gets a non-error response, even if that response may not contain the most recent data.

A system that prioritizes availability during a partition may continue serving requests from both sides and reconcile divergent state later.

[Distributed-System Replication](/en/notes/distributed-systems/%E5%88%86%E5%B8%83%E5%BC%8F%E7%B3%BB%E7%BB%9F%E5%A4%8D%E5%88%B6/%E5%88%86%E5%B8%83%E5%BC%8F%E7%B3%BB%E7%BB%9F%E5%A4%8D%E5%88%B6/)

### 2.3 P — Partition Tolerance

Partition tolerance means the system continues to have a defined behavior even when messages between parts of the network are lost or delayed enough that the nodes cannot communicate reliably.

For real distributed systems, network partitions cannot be ruled out. The practical CAP question is therefore what the system does **when a partition occurs**.

[Distributed-System Partitioning](/en/notes/distributed-systems/%E5%88%86%E5%B8%83%E5%BC%8F%E7%B3%BB%E7%BB%9F%E5%88%86%E5%8C%BA/%E5%88%86%E5%B8%83%E5%BC%8F%E7%B3%BB%E7%BB%9F%E5%88%86%E5%8C%BA/)

## 3. The Core Trade-off

When the network is healthy, a distributed system may provide both consistency and availability. During a partition, however, a node cannot always distinguish a slow peer from a failed or unreachable peer.

The system must then choose between:

- rejecting or delaying some operations to preserve consistency; or
- accepting operations to preserve availability, with the possibility of temporary divergence.

## 4. CP and AP

### 4.1 AP

An AP-oriented design keeps serving requests during a partition and accepts that replicas may temporarily diverge. Such systems commonly rely on eventual convergence and conflict handling.

[BASE](/en/notes/distributed-systems/BASE/) is often discussed alongside this style of design.

### 4.2 CP

A CP-oriented design preserves the consistency guarantee during a partition by refusing or delaying operations that cannot be coordinated safely.

### 4.3 What About CA?

A system can provide consistency and availability while there is no partition. But once a real distributed system experiences a partition, it cannot simultaneously guarantee both CAP consistency and CAP availability for every request.

## 5. Reference

- [CAP 定理的含义 — 阮一峰](http://www.ruanyifeng.com/blog/2018/07/cap.html)
